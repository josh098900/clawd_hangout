// Supabase Realtime transport.
//   - Auth: anonymous sign-in (enable it in Dashboard -> Authentication -> Sign In / Providers).
//   - One Realtime channel per room: "hangout:<room>".
//   - Presence = who is in the room (name + look + where they were when they joined).
//   - Broadcast = the fast stuff: "move", "chat", "emote". Nothing is stored except your profile.
//   - Profiles table (supabase/migrations/0001_profiles.sql) remembers your name + look.

import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { Look } from '../entities/critter';
import { sanitizeLook } from '../entities/critter';
import type { EmoteKind } from '../entities/avatar';
import type { RoomId } from '../world/room';
import { cleanName, parseChat, parseDraw, parseEmote, parseMove, parsePeer, parseState, parseNote, parseLobby, type LobbyPerson, type DrawMsg, type MoveMsg, type NetEvent, type PeerState, type StateMsg, type Transport } from './transport';

export class SupabaseTransport implements Transport {
  readonly mode = 'supabase' as const;
  selfId = '';
  private sb: SupabaseClient;
  private ch: RealtimeChannel | null = null;
  private on: (e: NetEvent) => void = () => {};
  private known = new Map<string, string>();
  private me: PeerState | null = null;
  private srv: RealtimeChannel | null = null;
  private room: RoomId | null = null;
  private lobbyCh: RealtimeChannel | null = null;
  private lobbyMe: { name: string; room: RoomId } | null = null;
  private lobbyOn: (people: LobbyPerson[]) => void = () => {};

  constructor(url: string, key: string) {
    this.sb = createClient(url, key, { realtime: { params: { eventsPerSecond: 20 } } });
  }

  async connect(captcha?: () => Promise<string | undefined>): Promise<void> {
    const { data } = await this.sb.auth.getSession();
    let session = data.session;
    if (!session) {
      const captchaToken = await captcha?.();
      const res = await this.sb.auth.signInAnonymously(captchaToken ? { options: { captchaToken } } : undefined);
      if (res.error) {
        const hint = /fetch|network/i.test(res.error.message) ? ' (check VITE_SUPABASE_URL and your connection)' : ' (is Anonymous Sign-Ins enabled in your Supabase project?)';
        throw new Error('Anonymous sign-in failed: ' + res.error.message + hint);
      }
      session = res.data.session;
    }
    if (!session) throw new Error('No Supabase session');
    this.selfId = session.user.id;
  }

  async loadProfile(): Promise<{ name: string; look: Look } | null> {
    const { data, error } = await this.sb.from('profiles').select('name, look').eq('id', this.selfId).maybeSingle();
    if (error) { console.warn('[profiles] load failed', error.message); return null; }
    if (!data) return null;
    return { name: cleanName(data.name), look: sanitizeLook(data.look) };
  }

  async saveProfile(name: string, look: Look): Promise<void> {
    const { error } = await this.sb.from('profiles').upsert({ id: this.selfId, name, look });
    if (error) console.warn('[profiles] save failed', error.message);
  }

  async joinRoom(room: RoomId, me: PeerState, on: (e: NetEvent) => void): Promise<void> {
    await this.leaveRoom();
    this.on = on;
    this.me = me;
    this.known.clear();
    // private channels: only members get in (RLS on realtime.messages, see supabase/migrations/0002_security.sql)
    this.room = room;
    const ch = this.sb.channel('hangout:' + room, { config: { private: true, presence: { key: this.selfId }, broadcast: { self: false } } });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as Record<string, unknown[]>;
      const seen = new Set<string>();
      for (const [key, metas] of Object.entries(state)) {
        if (key === this.selfId || !metas.length) continue;
        const peer = parsePeer({ ...(metas[0] as object), id: key });
        if (!peer) continue;
        seen.add(key);
        const sig = peer.name + JSON.stringify(peer.look);
        const prev = this.known.get(key);
        if (prev === undefined) { this.known.set(key, sig); this.on({ type: 'join', peer }); }
        else if (prev !== sig) { this.known.set(key, sig); this.on({ type: 'update', peer }); }
      }
      for (const key of [...this.known.keys()]) if (!seen.has(key)) { this.known.delete(key); this.on({ type: 'leave', id: key }); }
    });
    ch.on('broadcast', { event: 'move' }, ({ payload }) => { const v = parseMove(payload); if (v && v.id !== this.selfId) this.on({ type: 'move', id: v.id, m: v.m }); });
    ch.on('broadcast', { event: 'emote' }, ({ payload }) => { const v = parseEmote(payload); if (v && v.id !== this.selfId) this.on({ type: 'emote', id: v.id, kind: v.kind }); });
    ch.on('broadcast', { event: 'state' }, ({ payload }) => { const v = parseState(payload); if (v && v.id !== this.selfId) this.on({ type: 'state', id: v.id, s: v.s }); });
    ch.on('broadcast', { event: 'note' }, ({ payload }) => { const v = parseNote(payload); if (v && v.id !== this.selfId) this.on({ type: 'note', id: v.id, i: v.i, n: v.n }); });
    ch.on('broadcast', { event: 'draw' }, ({ payload }) => { const v = parseDraw(payload); if (v && v.id !== this.selfId) this.on({ type: 'draw', id: v.id, d: v.d }); });

    this.ch = ch;
    // the server channel: only the database sends here, so the sender id on chat is real
    const srv = this.sb.channel('hangout-srv:' + room, { config: { private: true } });
    srv.on('broadcast', { event: 'chat' }, ({ payload }) => { const v = parseChat(payload); if (v && v.id !== this.selfId) this.on({ type: 'chat', id: v.id, text: v.text }); });
    srv.subscribe();
    this.srv = srv;
    await new Promise<void>((resolve, reject) => {
      let done = false;
      ch.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          // (re)announce ourselves; this also runs again after an automatic reconnect
          if (this.me) await ch.track(this.presencePayload(this.me));
          if (!done) { done = true; resolve(); }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.on({ type: 'status', text: 'Connection trouble: ' + status });
          if (!done) { done = true; reject(err ?? new Error(status === 'CHANNEL_ERROR' ? 'the room refused us (not a member yet? private channels need 0002_security.sql)' : status)); }
        }
      });
    });
  }

  // ---- the lobby: one presence channel for everyone online, whatever room they're in ----
  setLobby(name: string, room: RoomId): void {
    this.lobbyMe = { name, room };
    if (!this.lobbyCh) {
      const ch = this.sb.channel('hangout:lobby', { config: { private: true, presence: { key: this.selfId } } });
      ch.on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState() as Record<string, unknown[]>, out: LobbyPerson[] = [];
        for (const [key, metas] of Object.entries(state)) { if (key === this.selfId || !metas.length) continue; const p = parseLobby({ ...(metas[0] as object), id: key }); if (p) out.push(p); }
        this.lobbyOn(out);
      });
      ch.subscribe(async (status) => { if (status === 'SUBSCRIBED' && this.lobbyMe) await ch.track(this.lobbyMe); });
      this.lobbyCh = ch;
    } else void this.lobbyCh.track(this.lobbyMe);
  }
  watchLobby(on: (people: LobbyPerson[]) => void): void { this.lobbyOn = on; }

  async leaveRoom(): Promise<void> {
    if (this.srv) { const srv = this.srv; this.srv = null; void this.sb.removeChannel(srv); }
    if (!this.ch) return;
    const ch = this.ch;
    this.ch = null;
    try { await ch.untrack(); } catch { /* ignore */ }
    await this.sb.removeChannel(ch);
  }

  updateMe(me: PeerState): void {
    this.me = me;
    void this.ch?.track(this.presencePayload(me));
  }

  private presencePayload(me: PeerState) {
    return { name: me.name, look: me.look, x: Math.round(me.x), y: Math.round(me.y), dir: me.dir };
  }

  sendMove(m: MoveMsg): void {
    if (this.me) { this.me.x = m.x; this.me.y = m.y; this.me.dir = m.dir; }
    void this.ch?.send({ type: 'broadcast', event: 'move', payload: { id: this.selfId, x: Math.round(m.x * 10) / 10, y: Math.round(m.y * 10) / 10, dir: m.dir, moving: m.moving, use: m.use, hold: m.hold, pose: m.pose } });
  }
  /** Chat goes through the database: it filters, rate-limits, logs and then broadcasts it with our real id. */
  async sendChat(text: string): Promise<string | null> {
    if (!this.room) return null;
    const { data, error } = await this.sb.rpc('send_chat', { room: this.room, body: text });
    if (error) throw new Error(error.message);
    return (data as string | null) ?? null;
  }
  async needsInvite(): Promise<boolean> {
    const { data, error } = await this.sb.rpc('is_member');
    if (error) throw new Error(error.message);
    return data !== true;
  }
  async joinWorld(code: string): Promise<boolean> {
    const { data, error } = await this.sb.rpc('join_world', { code });
    if (error) throw new Error(error.message);
    return data === true;
  }
  async report(id: string, reason: string): Promise<void> {
    const { error } = await this.sb.rpc('report_player', { who: id, reason });
    if (error) throw new Error(error.message);
  }
  async tokens(): Promise<number> { const { data } = await this.sb.rpc('my_tokens'); return typeof data === 'number' ? data : 0; }
  async claimCoin(i: number): Promise<number | null> { const { data, error } = await this.sb.rpc('claim_coin', { coin: i }); if (error) throw new Error(error.message); return typeof data === 'number' ? data : null; }
  async claimDaily(): Promise<number | null> { const { data, error } = await this.sb.rpc('claim_daily'); if (error) throw new Error(error.message); return typeof data === 'number' ? data : null; }
  sendEmote(kind: EmoteKind): void { void this.ch?.send({ type: 'broadcast', event: 'emote', payload: { id: this.selfId, kind } }); }
  sendState(s: StateMsg): void { void this.ch?.send({ type: 'broadcast', event: 'state', payload: { id: this.selfId, ...s } }); }
  sendNote(i: number, n: number): void { void this.ch?.send({ type: 'broadcast', event: 'note', payload: { id: this.selfId, i, n } }); }
  sendDraw(d: DrawMsg): void { void this.ch?.send({ type: 'broadcast', event: 'draw', payload: { id: this.selfId, ...d } }); }
}
