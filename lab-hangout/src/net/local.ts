// LOCAL mode: no server. Tabs in the same browser find each other over BroadcastChannel,
// so you can build and test multiplayer before Supabase is set up. Presence is emulated
// with a hello/heartbeat/bye protocol.

import type { Look } from '../entities/critter';
import { sanitizeLook } from '../entities/critter';
import type { EmoteKind } from '../entities/avatar';
import type { RoomId } from '../world/room';
import { cleanChat, cleanName, parsePong, parseWorld, parseChat, parseDraw, parseEmote, parseMove, parsePeer, parseState, parseNote, parseLobby, type LobbyPerson, type DrawMsg, type MoveMsg, type NetEvent, type PeerState, type StateMsg, type Transport, type Account, type ClawResult, type HideSeek, type PongMsg, type Provider, type ServerInfo } from './transport';
import { rollClaw } from '../entities/critter';

type Wire = { srv: string; room: RoomId | 'lobby'; kind: 'hello' | 'reply' | 'beat' | 'bye' | 'move' | 'chat' | 'emote' | 'state' | 'draw' | 'note' | 'lobby' | 'census' | 'who' | 'pong' | 'world'; p: Record<string, unknown> };
/** LOCAL mode's pretend servers (online, they come from the database). `?cap=N` shrinks them to test FULL. */
const SERVERS = [{ id: 'one', name: 'LAB 1' }, { id: 'two', name: 'LAB 2' }, { id: 'three', name: 'LAB 3' }];

const PROFILE_KEY = 'hangout.localProfile';

export class LocalTransport implements Transport {
  readonly mode = 'local' as const;
  readonly selfId: string;
  private bc: BroadcastChannel | null = null;
  private room: RoomId | null = null;
  private on: (e: NetEvent) => void = () => {};
  private me: PeerState | null = null;
  private seen = new Map<string, { t: number; sig: string }>();
  private timer = 0;
  private lobbyMe: { name: string; room: RoomId } | null = null;
  private lobbySeen = new Map<string, { t: number; p: LobbyPerson }>();
  private lobbyOn: (people: LobbyPerson[]) => void = () => {};
  private lobbyTimer = 0;

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
  async finishMerge(): Promise<{ tokens: number; save: unknown }> { return { tokens: this.wallet(), save: null }; }
  // the save lives in the browser cache (game/save.ts) in LOCAL mode, nothing more to store
  async loadSave(): Promise<unknown> { return null; }
  async storeSave(): Promise<void> {}
  private inv(add?: string): string[] {
    let v: string[] = []; try { v = JSON.parse(localStorage.getItem('labhangout.localInv') || '[]'); } catch { /* ignore */ }
    if (add && !v.includes(add)) { v.push(add); try { localStorage.setItem('labhangout.localInv', JSON.stringify(v)); } catch { /* ignore */ } }
    return v;
  }
  async inventory(): Promise<string[]> { return this.inv(); }
  async playClaw(): Promise<ClawResult> {
    const bal = this.wallet(); if (bal < 3) throw new Error('you need 3 tokens');
    const item = rollClaw(Math.random), dupe = this.inv().includes(item);
    this.inv(item);
    return { item, dupe, tokens: this.wallet(bal - 3 + (dupe ? 1 : 0)) };
  }

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

  async joinRoom(room: RoomId, me: PeerState, on: (e: NetEvent) => void): Promise<void> {
    await this.leaveRoom();
    this.room = room; this.on = on; this.me = me; this.seen.clear();
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
  private wallet(n?: number): number { try { if (n !== undefined) localStorage.setItem('labhangout.localTokens', String(n)); return Number(localStorage.getItem('labhangout.localTokens')) || 0; } catch { return 0; } }
  private claimed = new Set<string>();
  async tokens(): Promise<number> { return this.wallet(); }
  async claimCoin(i: number): Promise<number | null> { const k = Math.floor(Date.now() / 300000) + ':' + i; if (this.claimed.has(k)) return null; this.claimed.add(k); return this.wallet(this.wallet() + 1); }
  async claimDaily(): Promise<number | null> {
    const day = new Date().toISOString().slice(0, 10);
    try { if (localStorage.getItem('labhangout.localDaily') === day) return null; localStorage.setItem('labhangout.localDaily', day); } catch { return null; }
    return this.wallet(this.wallet() + 5);
  }
  sendEmote(kind: EmoteKind): void { this.post('emote', { id: this.selfId, kind }); }
  sendState(s: StateMsg): void { this.post('state', { id: this.selfId, ...s }); }
  sendNote(i: number, n: number): void { this.post('note', { id: this.selfId, i, n }); }
  sendDraw(d: DrawMsg): void { this.post('draw', { id: this.selfId, ...d }); }

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
  sendWorld(w: HideSeek): void { if (this.bc && this.server) this.bc.postMessage({ srv: this.server, room: 'lobby', kind: 'world', p: { id: this.selfId, ...w } } satisfies Wire); }
  sendPong(p: PongMsg): void { this.post('pong', { id: this.selfId, ...p }); }
  private expireLobby(): void {
    const now = performance.now(); let changed = false;
    for (const [id, s] of this.lobbySeen) if (now - s.t > 6000) { this.lobbySeen.delete(id); changed = true; }
    if (changed) this.lobbyOn([...this.lobbySeen.values()].map((s) => s.p));
  }
  private recv(w: Wire): void {
    if (w && w.kind === 'who') { this.countMe(); return; }
    if (w && w.kind === 'census' && typeof w.p?.id === 'string' && typeof w.srv === 'string') { this.headcount.set(w.p.id, { srv: w.srv, t: performance.now() }); return; }
    if (!w || w.srv !== this.server) return;
    if (w.room === 'lobby' && w.kind === 'world') { const v = parseWorld(w.p); if (v && v.id !== this.selfId) this.worldOn({ type: 'world', id: v.id, w: v.w }); return; }
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
      case 'move': { const v = parseMove(w.p); if (v && this.seen.has(v.id)) this.on({ type: 'move', id: v.id, m: v.m }); break; }
      case 'chat': { const v = parseChat(w.p); if (v) this.on({ type: 'chat', id: v.id, text: v.text }); break; }
      case 'emote': { const v = parseEmote(w.p); if (v) this.on({ type: 'emote', id: v.id, kind: v.kind }); break; }
      case 'state': { const v = parseState(w.p); if (v) this.on({ type: 'state', id: v.id, s: v.s }); break; }
      case 'note': { const v = parseNote(w.p); if (v && this.seen.has(v.id)) this.on({ type: 'note', id: v.id, i: v.i, n: v.n }); break; }
      case 'pong': { const v = parsePong(w.p); if (v && this.seen.has(v.id)) this.on({ type: 'pong', id: v.id, p: v.p }); break; }
      case 'draw': { const v = parseDraw(w.p); if (v && this.seen.has(v.id)) this.on({ type: 'draw', id: v.id, d: v.d }); break; }
    }
  }
}
