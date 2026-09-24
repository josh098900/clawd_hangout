// LOCAL mode: no server. Tabs in the same browser find each other over BroadcastChannel,
// so you can build and test multiplayer before Supabase is set up. Presence is emulated
// with a hello/heartbeat/bye protocol.

import type { Look } from '../entities/critter';
import { sanitizeLook } from '../entities/critter';
import type { EmoteKind } from '../entities/avatar';
import type { RoomId } from '../world/room';
import { cleanChat, cleanName, parseChat, parseDraw, parseEmote, parseMove, parsePeer, parseState, parseNote, parseLobby, type LobbyPerson, type DrawMsg, type MoveMsg, type NetEvent, type PeerState, type StateMsg, type Transport } from './transport';

type Wire = { room: RoomId | 'lobby'; kind: 'hello' | 'reply' | 'beat' | 'bye' | 'move' | 'chat' | 'emote' | 'state' | 'draw' | 'note' | 'lobby'; p: Record<string, unknown> };

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

  async connect(): Promise<void> {
    this.bc = new BroadcastChannel('lab-hangout-local');
    this.bc.onmessage = (e) => this.recv(e.data as Wire);
    addEventListener('pagehide', () => this.post('bye', { id: this.selfId }));
  }

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
    if (!this.bc || !this.room) return;
    this.bc.postMessage({ room: this.room, kind, p } satisfies Wire);
  }
  // ---- the lobby: every tab announces itself every 2 s, whatever room it's in ----
  setLobby(name: string, room: RoomId): void {
    this.lobbyMe = { name, room };
    const beat = () => { if (this.bc && this.lobbyMe) this.bc.postMessage({ room: 'lobby', kind: 'lobby', p: { id: this.selfId, ...this.lobbyMe } } satisfies Wire); this.expireLobby(); };
    beat();
    if (!this.lobbyTimer) this.lobbyTimer = window.setInterval(beat, 2000);
  }
  watchLobby(on: (people: LobbyPerson[]) => void): void { this.lobbyOn = on; }
  private expireLobby(): void {
    const now = performance.now(); let changed = false;
    for (const [id, s] of this.lobbySeen) if (now - s.t > 6000) { this.lobbySeen.delete(id); changed = true; }
    if (changed) this.lobbyOn([...this.lobbySeen.values()].map((s) => s.p));
  }
  private recv(w: Wire): void {
    if (w && w.room === 'lobby' && w.kind === 'lobby') {
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
      case 'draw': { const v = parseDraw(w.p); if (v && this.seen.has(v.id)) this.on({ type: 'draw', id: v.id, d: v.d }); break; }
    }
  }
}
