// LOCAL mode: no server. Tabs in the same browser find each other over BroadcastChannel,
// so you can build and test multiplayer before Supabase is set up. Presence is emulated
// with a hello/heartbeat/bye protocol.

import type { Look } from '../entities/critter';
import { sanitizeLook } from '../entities/critter';
import type { RoomId } from '../world/room';
import { cleanChat, cleanName, MESSAGES, isMsgType, readMsg, parsePeer, parseLobby, type MsgType, type LobbyPerson, type MoveMsg, type NetEvent, type Outgoing, type PeerState, type Transport, type Account, type Provider, type ServerInfo } from './transport';
import { LocalApi } from './localapi';

/** One BroadcastChannel post: presence (hello / reply / beat / bye), the lobby and head counts, or a message from MESSAGES. */
type Wire = { srv: string; room: string; kind: 'hello' | 'reply' | 'beat' | 'bye' | 'lobby' | 'census' | 'who' | MsgType; p: Record<string, unknown> };
/** Messages taken even from a tab that hasn't said hello yet (the rest must come from someone we've seen arrive). */
const FROM_ANYONE: MsgType[] = ['chat', 'emote', 'state'];
/** LOCAL mode's pretend servers (online, they come from the database). `?cap=N` shrinks them to test FULL. */
const SERVERS = [{ id: 'one', name: 'LAB 1' }, { id: 'two', name: 'LAB 2' }, { id: 'three', name: 'LAB 3' }];

const PROFILE_KEY = 'hangout.localProfile';

export class LocalTransport implements Transport {
  readonly mode = 'local' as const;
  readonly selfId: string;
  private bc: BroadcastChannel | null = null;
  /** The room we're in (a flat carries its owner: flat.<id>). */
  private room: string | null = null;
  private on: (e: NetEvent) => void = () => {};
  private me: PeerState | null = null;
  private seen = new Map<string, { t: number; sig: string }>();
  private timer = 0;
  private lobbyMe: { name: string; room: RoomId } | null = null;
  private lobbySeen = new Map<string, { t: number; p: LobbyPerson }>();
  private lobbyOn: (people: LobbyPerson[]) => void = () => {};
  private lobbyTimer = 0;
  /** The game's server requests, against a pretend database in this browser (localapi.ts). */
  readonly api = new LocalApi(this);
  /** Someone's name, if they're online on this server (the pretend server's Secret Santa labels). */
  nameOf(id: string): string | undefined { return this.lobbySeen.get(id)?.p.name; }

  constructor() {
    let id = '';
    try { id = sessionStorage.getItem('hangout.tabId') || ''; } catch { /* private mode */ }
    if (!id) { id = 'tab-' + Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('hangout.tabId', id); } catch { /* ignore */ } }
    this.selfId = id;
  }

  // ---- pretend accounts (per tab), so the sign-in screens can be tried without a server ----
  // ?signin starts signed out; ?autherr=<code> pretends a login provider sent back an error.
  private acct: Account = { kind: 'none' };
  private get stored(): Account | null { try { return JSON.parse(sessionStorage.getItem('hangout.localAcct') || 'null'); } catch { return null; } }
  private setAcct(a: Account): void { this.acct = a; try { sessionStorage.setItem('hangout.localAcct', JSON.stringify(a)); } catch { /* ignore */ } }
  async connect(): Promise<Account> {
    this.bc = new BroadcastChannel('lab-hangout-local');
    this.bc.onmessage = (e) => this.recv(e.data as Wire);
    addEventListener('pagehide', () => { this.post('bye', { id: this.selfId }); this.leaveSeat(); });
    const count = () => { if (this.server) this.bc?.postMessage({ srv: this.server, room: 'lobby', kind: 'census', p: { id: this.selfId } } satisfies Wire); };
    window.setInterval(count, 1500);
    this.countMe = count;
    this.bc.postMessage({ srv: '', room: 'lobby', kind: 'who', p: {} } satisfies Wire); // a new tab: everyone say where you are
    this.acct = this.stored ?? (new URLSearchParams(location.search).has('signin') ? { kind: 'none' } : { kind: 'guest' });
    return this.acct;
  }
  account(): Account { return this.acct; }
  takeAuthError(): { code: string; message: string } | null {
    const u = new URL(location.href), code = u.searchParams.get('autherr'); if (!code) return null;
    u.searchParams.delete('autherr'); history.replaceState(null, '', u.pathname + u.search);
    return { code, message: 'Identity is already linked to another user' };
  }
  async signInGuest(captcha?: () => Promise<string | undefined>): Promise<void> { await captcha?.(); this.setAcct({ kind: 'guest' }); }
  async loginWith(p: Provider): Promise<void> { this.setAcct({ kind: 'account', provider: p }); }
  async linkWith(p: Provider): Promise<void> { this.setAcct({ kind: 'account', provider: p }); }
  async logout(): Promise<void> { this.leaveSeat(); try { sessionStorage.removeItem('hangout.localAcct'); } catch { /* ignore */ } this.acct = { kind: 'none' }; }
  async startMerge(): Promise<string> { return 'local-ticket'; }
  async finishMerge(): Promise<{ tokens: number; save: unknown }> { return { tokens: this.api.wallet(), save: null }; }
  // the save lives in the browser cache (game/save.ts) in LOCAL mode, nothing more to store
  async loadSave(): Promise<unknown> { return null; }
  async storeSave(): Promise<void> {}
  async inventory(): Promise<string[]> { return this.api.inv(); }

  // ---- pretend servers: every tab says which server it's on; a server is full at ?cap=N (default 12) ----
  server: string | null = null;
  private headcount = new Map<string, { srv: string; t: number }>();
  private countMe: () => void = () => {};
  private seatLost: (() => void)[] = [];
  async servers(friendIds: string[]): Promise<ServerInfo[]> {
    const cap = Math.max(1, Number(new URLSearchParams(location.search).get('cap')) || 12), now = performance.now();
    for (const [id, h] of this.headcount) if (now - h.t > 5000) this.headcount.delete(id);
    return SERVERS.map((v) => {
      const ids = [...this.headcount].filter(([id, h]) => h.srv === v.id && id !== this.selfId).map(([id]) => id);
      return { ...v, cap, players: ids.length + (this.server === v.id ? 1 : 0), friends: ids.filter((id) => friendIds.includes(id)) };
    });
  }
  async claimSeat(id: string): Promise<void> {
    const v = (await this.servers([])).find((x) => x.id === id);
    if (!v) throw new Error('no such server');
    if (this.server !== id && v.players >= v.cap) throw new Error('that server is full');
    if (this.server !== id) { this.lobbySeen.clear(); this.lobbyOn([]); }
    this.server = id;
  }
  onSeatLost(fn: () => void): void { this.seatLost.push(fn); }
  leaveSeat(): void { this.server = null; }

  async loadProfile(): Promise<{ name: string; look: Look } | null> {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      return { name: cleanName(o.name), look: sanitizeLook(o.look) };
    } catch { return null; }
  }
  async saveProfile(name: string, look: Look): Promise<void> {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, look })); } catch { /* ignore */ }
  }

  async joinRoom(room: RoomId, me: PeerState, on: (e: NetEvent) => void, inst?: string): Promise<void> {
    await this.leaveRoom();
    this.room = inst ? room + '.' + inst : room; this.on = on; this.me = me; this.seen.clear();
    this.post('hello', this.state());
    clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      this.post('beat', this.state());
      const now = performance.now();
      for (const [id, s] of this.seen) if (now - s.t > 6000) { this.seen.delete(id); this.on({ type: 'leave', id }); }
    }, 2000);
  }

  async leaveRoom(): Promise<void> {
    if (!this.room) return;
    this.post('bye', { id: this.selfId });
    clearInterval(this.timer);
    for (const id of this.seen.keys()) this.on({ type: 'leave', id });
    this.seen.clear();
    this.room = null;
  }

  updateMe(me: PeerState): void { this.me = me; this.post('beat', this.state()); }
  sendMove(m: MoveMsg): void {
    if (this.me) { this.me.x = m.x; this.me.y = m.y; this.me.dir = m.dir; }
    this.post('move', { id: this.selfId, ...m });
  }
  async sendChat(text: string): Promise<string | null> { const t = cleanChat(text); if (t) this.post('chat', { id: this.selfId, text: t }); return t || null; }
  // LOCAL mode has no server: nobody needs an invite, reports go to the console, and tokens
  // are kept in this browser so the coins still work while developing.
  async needsInvite(): Promise<boolean> { return false; }
  async joinWorld(): Promise<boolean> { return true; }
  async report(id: string, reason: string): Promise<void> { console.info('[report] (LOCAL mode, not sent anywhere)', id, reason); }
  send<K extends keyof Outgoing>(type: K, data: Outgoing[K]): void {
    const p = { id: this.selfId, ...data } as Record<string, unknown>;
    if (MESSAGES[type].on !== 'lobby') this.post(type, p);
    else if (this.bc && this.server) this.bc.postMessage({ srv: this.server, room: 'lobby', kind: type, p } satisfies Wire);
  }

  private state(): Record<string, unknown> {
    const m = this.me!;
    return { id: this.selfId, name: m.name, look: m.look, x: m.x, y: m.y, dir: m.dir };
  }
  private post(kind: Wire['kind'], p: Record<string, unknown>): void {
    if (!this.bc || !this.room || !this.server) return;
    this.bc.postMessage({ srv: this.server, room: this.room, kind, p } satisfies Wire);
  }
  // ---- the lobby: every tab announces itself every 2 s, whatever room it's in ----
  setLobby(name: string, room: RoomId): void {
    this.lobbyMe = { name, room };
    const beat = () => { if (this.bc && this.lobbyMe && this.server) this.bc.postMessage({ srv: this.server, room: 'lobby', kind: 'lobby', p: { id: this.selfId, ...this.lobbyMe } } satisfies Wire); this.expireLobby(); };
    beat();
    if (!this.lobbyTimer) this.lobbyTimer = window.setInterval(beat, 2000);
  }
  watchLobby(on: (people: LobbyPerson[]) => void): void { this.lobbyOn = on; }
  leaveLobby(): void { this.lobbyMe = null; clearInterval(this.lobbyTimer); this.lobbyTimer = 0; this.lobbySeen.clear(); this.lobbyOn([]); }
  private worldOn: (e: NetEvent) => void = () => {};
  watchWorld(on: (e: NetEvent) => void): void { this.worldOn = on; }
  private expireLobby(): void {
    const now = performance.now(); let changed = false;
    for (const [id, s] of this.lobbySeen) if (now - s.t > 6000) { this.lobbySeen.delete(id); changed = true; }
    if (changed) this.lobbyOn([...this.lobbySeen.values()].map((s) => s.p));
  }
  private recv(w: Wire): void {
    if (w && w.kind === 'who') { this.countMe(); return; }
    if (w && w.kind === 'census' && typeof w.p?.id === 'string' && typeof w.srv === 'string') { this.headcount.set(w.p.id, { srv: w.srv, t: performance.now() }); return; }
    if (!w || w.srv !== this.server) return;
    if (w.room === 'lobby' && isMsgType(w.kind) && MESSAGES[w.kind].on === 'lobby') { const e = readMsg(w.kind, w.p); if (e && e.id !== this.selfId) this.worldOn(e); return; }
    if (w.room === 'lobby' && w.kind === 'lobby') {
      const p = parseLobby(w.p); if (!p || p.id === this.selfId) return;
      const prev = this.lobbySeen.get(p.id); this.lobbySeen.set(p.id, { t: performance.now(), p });
      if (!prev || prev.p.room !== p.room || prev.p.name !== p.name) this.lobbyOn([...this.lobbySeen.values()].map((s) => s.p));
      return;
    }
    if (!w || w.room !== this.room || !w.p) return;
    const id = w.p.id;
    if (id === this.selfId) return;
    switch (w.kind) {
      case 'hello': case 'reply': case 'beat': {
        const peer = parsePeer(w.p); if (!peer) return;
        const sig = peer.name + JSON.stringify(peer.look), prev = this.seen.get(peer.id);
        this.seen.set(peer.id, { t: performance.now(), sig });
        if (!prev) { this.on({ type: 'join', peer }); this.on({ type: 'move', id: peer.id, m: { x: peer.x, y: peer.y, dir: peer.dir, moving: false, use: -1, hold: 0, pose: 0 } }); }
        else if (prev.sig !== sig) this.on({ type: 'update', peer });
        if (w.kind === 'hello') this.post('reply', this.state());
        break;
      }
      case 'bye': if (typeof id === 'string' && this.seen.delete(id)) this.on({ type: 'leave', id }); break;
      default: {
        if (!isMsgType(w.kind) || MESSAGES[w.kind].on === 'lobby') return;
        const e = readMsg(w.kind, w.p);
        if (e && (FROM_ANYONE.includes(w.kind) || this.seen.has(e.id))) this.on(e);
      }
    }
  }
}
