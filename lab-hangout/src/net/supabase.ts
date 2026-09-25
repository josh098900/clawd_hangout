// Supabase Realtime transport.
//   - Auth: guests are anonymous users (enable Anonymous Sign-Ins); accounts log in with
//     Discord/Google (OAuth, PKCE). A guest links an account with linkIdentity, same user id.
//   - Servers: you take a seat on one (claim_seat, capped), and all your channels are that
//     server's: "hangout:<server>:<room>", "hangout-srv:<server>:<room>", "hangout:<server>:lobby".
//   - Presence = who is in the room (name + look + where they were when they joined).
//   - Broadcast = the fast stuff: "move", "chat", "emote". Nothing is stored except your profile.
//   - Profiles table (supabase/migrations/0001_profiles.sql) remembers your name + look.

import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { Look } from '../entities/critter';
import { sanitizeLook } from '../entities/critter';
import type { EmoteKind } from '../entities/avatar';
import type { RoomId } from '../world/room';
import { cleanName, PROVIDERS, parseCook, parseKart, parseTank, parseJunk, parseKScore, parseFlatMsg, parseLayout, parseDoor, type DoorMode, type FlatDoor, type FlatInfo, type FlatLayout, type FlatMsg, type MyFlat, parsePong, parseWorld, parseChat, parseDraw, parseEmote, parseMove, parsePeer, parseState, parseNote, parseLobby, type LobbyPerson, type DrawMsg, type MoveMsg, type NetEvent, type PeerState, type StateMsg, type Transport, type Account, type ClawResult, type ContestBoard, type HideSeek, type KartMsg, type TankMsg, type PongMsg, type Plot, type Tray, type KScore, type Provider, type ServerInfo } from './transport';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SupabaseTransport implements Transport {
  readonly mode = 'supabase' as const;
  selfId = '';
  private sb: SupabaseClient;
  private ch: RealtimeChannel | null = null;
  private on: (e: NetEvent) => void = () => {};
  private known = new Map<string, string>();
  private me: PeerState | null = null;
  private srv: RealtimeChannel | null = null;
  /** The room we are in (a flat carries its owner: flat.<id>). */
  private room: string | null = null;
  private lobbyCh: RealtimeChannel | null = null;
  private lobbyMe: { name: string; room: RoomId } | null = null;
  private lobbyOn: (people: LobbyPerson[]) => void = () => {};

  private acct: Account = { kind: 'none' };
  private authErr: { code: string; message: string } | null = null;
  server: string | null = null;
  private pingTimer = 0;
  private seatLost: (() => void)[] = [];

  constructor(private url: string, private key: string) {
    // a login provider that refused (e.g. that Discord is already someone else's account) says so in the URL
    const q = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.slice(1));
    const code = q.get('error_code') || h.get('error_code'), msg = q.get('error_description') || h.get('error_description');
    if (code || msg) this.authErr = { code: code || 'error', message: (msg || code || '').replace(/\+/g, ' ') };
    this.sb = createClient(url, key, { auth: { flowType: 'pkce' }, realtime: { params: { eventsPerSecond: 20 } } });
  }

  async connect(): Promise<Account> {
    const { data } = await this.sb.auth.getSession();
    if (this.authErr) {
      const u = new URL(location.href);
      for (const k of ['error', 'error_code', 'error_description']) u.searchParams.delete(k);
      history.replaceState(history.state, '', u.pathname + u.search);
    }
    if (!data.session) return this.acct = { kind: 'none' };
    this.selfId = data.session.user.id;
    const user = data.session.user;
    // every login attached to this player (Supabase links logins with the same email automatically),
    // and which one was used this time (remembered when the button was pressed; else the first)
    const linked = [...new Set([...(user.identities ?? []).map((i) => i.provider), ...((user.app_metadata?.providers as string[] | undefined) ?? [])])].filter((p) => p !== 'anonymous' && p !== 'email');
    let last: string | null = null; try { last = localStorage.getItem('labhangout.lastLogin'); } catch { /* private mode */ }
    const provider = last && linked.includes(last) ? last : linked[0];
    return this.acct = user.is_anonymous && !provider ? { kind: 'guest' } : { kind: 'account', provider, linked };
  }
  account(): Account { return this.acct; }
  takeAuthError(): { code: string; message: string } | null { const e = this.authErr; this.authErr = null; return e; }

  async signInGuest(captcha?: () => Promise<string | undefined>): Promise<void> {
    const captchaToken = await captcha?.();
    const res = await this.sb.auth.signInAnonymously(captchaToken ? { options: { captchaToken } } : undefined);
    if (res.error || !res.data.session) {
      const m = res.error?.message ?? 'no session';
      const hint = /fetch|network/i.test(m) ? ' (check VITE_SUPABASE_URL and your connection)' : /captcha/i.test(m) ? ' (the human check did not pass, try again)' : ' (is Anonymous Sign-Ins enabled in your Supabase project?)';
      throw new Error('Guest sign-in failed: ' + m + hint);
    }
    this.selfId = res.data.session.user.id;
    this.acct = { kind: 'guest' };
  }
  private back(): string { return location.origin + location.pathname; }
  async loginWith(p: Provider): Promise<void> {
    if (!PROVIDERS.includes(p)) return;
    try { localStorage.setItem('labhangout.lastLogin', p); } catch { /* private mode */ }
    const { error } = await this.sb.auth.signInWithOAuth({ provider: p, options: { redirectTo: this.back() } });
    if (error) throw new Error(error.message);
    await new Promise(() => {}); // the page is leaving for the provider
  }
  async linkWith(p: Provider): Promise<void> {
    if (!PROVIDERS.includes(p)) return;
    try { localStorage.setItem('labhangout.lastLogin', p); } catch { /* private mode */ }
    const { error } = await this.sb.auth.linkIdentity({ provider: p, options: { redirectTo: this.back() } });
    if (error) throw new Error(/manual linking/i.test(error.message) ? error.message + ' (turn on "Allow manual linking" in Supabase Auth settings)' : error.message);
    await new Promise(() => {});
  }
  async logout(): Promise<void> { this.leaveSeat(); await this.sb.auth.signOut(); }
  async startMerge(): Promise<string> { const { data, error } = await this.sb.rpc('start_merge'); if (error) throw new Error(error.message); return String(data); }
  async finishMerge(ticket: string): Promise<{ tokens: number; save: unknown }> {
    const { data, error } = await this.sb.rpc('finish_merge', { ticket });
    if (error) throw new Error(error.message);
    const o = (data ?? {}) as { tokens?: unknown; save?: unknown };
    return { tokens: typeof o.tokens === 'number' ? o.tokens : 0, save: o.save ?? null };
  }
  async loadSave(): Promise<unknown> {
    const { data, error } = await this.sb.from('saves').select('data').eq('user_id', this.selfId).maybeSingle();
    if (error) throw new Error(error.message);
    return data?.data ?? null;
  }
  async storeSave(d: object): Promise<void> {
    const { error } = await this.sb.from('saves').upsert({ user_id: this.selfId, data: d, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }
  async inventory(): Promise<string[]> {
    const { data, error } = await this.sb.from('inventory').select('item').eq('user_id', this.selfId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => String(r.item));
  }
  async season(): Promise<string | null> { const { data, error } = await this.sb.rpc('current_season'); if (error) throw new Error(error.message); return typeof data === 'string' ? data : null; }
  async trickOrTreat(door: number): Promise<{ tokens: number; trick: boolean; visited: number; prize: string | null }> {
    const { data, error } = await this.sb.rpc('trick_or_treat', { door });
    if (error) throw new Error(error.message);
    const o = (data ?? {}) as Record<string, unknown>;
    return { tokens: Number(o.tokens) || 0, trick: o.trick === true, visited: Number(o.visited) || 0, prize: typeof o.prize === 'string' ? o.prize : null };
  }
  // ---- the Rooftop garden (supabase/migrations/0008_gardens.sql) ----
  async plots(): Promise<Plot[]> {
    if (!this.server) return [];
    const { data, error } = await this.sb.from('plots').select('bed, owner, owner_name, seed, planted_at, last_water, grown, calc_at').eq('server', this.server);
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({ bed: Number(p.bed), owner: String(p.owner), ownerName: cleanName(p.owner_name) || 'SOMEONE', seed: Number(p.seed), plantedAt: Date.parse(p.planted_at), lastWater: Date.parse(p.last_water), grown: Number(p.grown), calcAt: Date.parse(p.calc_at) }));
  }
  private async rpcJson(fn: string, args: Record<string, unknown>): Promise<Record<string, unknown>> { const { data, error } = await this.sb.rpc(fn, args); if (error) throw new Error(error.message); return (data ?? {}) as Record<string, unknown>; }
  async plant(bed: number, seed: number): Promise<number> { const { data, error } = await this.sb.rpc('plant', { bed, seed }); if (error) throw new Error(error.message); return Number(data) || 0; }
  async water(bed: number): Promise<{ tokens: number; thanked: boolean }> { const o = await this.rpcJson('water', { bed }); return { tokens: Number(o.tokens) || 0, thanked: o.thanked === true }; }
  async rainWater(): Promise<number> { const { data, error } = await this.sb.rpc('rain_water'); if (error) throw new Error(error.message); return Number(data) || 0; }
  async harvest(bed: number): Promise<{ tokens: number; seed: number; bonus: string | null }> { const o = await this.rpcJson('harvest', { bed }); return { tokens: Number(o.tokens) || 0, seed: Number(o.seed) || 0, bonus: typeof o.bonus === 'string' ? o.bonus : null }; }
  async digUp(bed: number): Promise<void> { const { error } = await this.sb.rpc('dig_up', { bed }); if (error) throw new Error(error.message); }
  // ---- the fishing contest (0010_fishing.sql) ----
  async catchFish(): Promise<{ fish: string; rarity: string; cm: number; contest: boolean; rank: number | null }> {
    const o = await this.rpcJson('catch_fish', {});
    return { fish: String(o.fish ?? ''), rarity: String(o.rarity ?? 'COMMON'), cm: Number(o.cm) || 0, contest: o.contest === true, rank: typeof o.rank === 'number' ? o.rank : null };
  }
  async myFlat(): Promise<MyFlat> {
    const o = await this.rpcJson('my_flat', {}), owned: Record<string, number> = {};
    if (o.owned && typeof o.owned === 'object') for (const [k, v] of Object.entries(o.owned as Record<string, unknown>)) if (typeof v === 'number' && v > 0) owned[k] = v;
    return { name: '', layout: parseLayout(o.layout), door: parseDoor(o.door), party: typeof o.party === 'number' ? o.party : null, owned, tokens: Number(o.tokens) || 0 };
  }
  async getFlat(owner: string): Promise<FlatInfo> { const o = await this.rpcJson('get_flat', { owner }); return { name: cleanName(o.name) || '?', layout: parseLayout(o.layout), door: parseDoor(o.door), party: typeof o.party === 'number' ? o.party : null }; }
  async flatDoors(ids: string[]): Promise<FlatDoor[]> {
    if (!ids.length) return [];
    const { data, error } = await this.sb.rpc('flat_doors', { ids }); if (error) throw new Error(error.message);
    return (Array.isArray(data) ? data : []).map((d: Record<string, unknown>) => ({ owner: String(d.owner), name: cleanName(d.name) || '?', door: parseDoor(d.door), party: typeof d.party === 'number' ? d.party : null, can: d.can === true }));
  }
  async buyFurniture(what: string): Promise<{ tokens: number; n: number }> { const o = await this.rpcJson('buy_furniture', { what }); return { tokens: Number(o.tokens) || 0, n: Number(o.n) || 0 }; }
  async saveFlat(layout: FlatLayout): Promise<void> { const { error } = await this.sb.rpc('save_flat', { layout }); if (error) throw new Error(error.message); }
  async setDoor(door: DoorMode): Promise<void> { const { error } = await this.sb.rpc('set_door', { door }); if (error) throw new Error(error.message); }
  async flatParty(on: boolean): Promise<number | null> { const { data, error } = await this.sb.rpc('flat_party', { on_: on }); if (error) throw new Error(error.message); return typeof data === 'number' ? data : null; }
  async letIn(who: string): Promise<void> { const { error } = await this.sb.rpc('let_in', { who }); if (error) throw new Error(error.message); }
  async trays(): Promise<Tray[]> {
    if (!this.server) return [];
    const { data, error } = await this.sb.from('space_trays').select('tray, owner, owner_name, planted_at').eq('server', this.server);
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({ tray: Number(p.tray), owner: String(p.owner), ownerName: cleanName(p.owner_name) || 'SOMEONE', plantedAt: Date.parse(p.planted_at) }));
  }
  async spacePlant(tray: number): Promise<number> { const { data, error } = await this.sb.rpc('space_plant', { tray }); if (error) throw new Error(error.message); return Number(data) || 0; }
  async spaceHarvest(tray: number): Promise<{ tokens: number; bonus: string | null; rotten: boolean }> { const o = await this.rpcJson('space_harvest', { tray }); return { tokens: Number(o.tokens) || 0, bonus: typeof o.bonus === 'string' ? o.bonus : null, rotten: o.rotten === true }; }
  async spaceDigUp(tray: number): Promise<void> { const { error } = await this.sb.rpc('space_dig_up', { tray }); if (error) throw new Error(error.message); }
  async spacewalkPay(pts: number): Promise<{ tokens: number; paid: number }> { const o = await this.rpcJson('spacewalk_pay', { pts: Math.max(0, Math.round(pts)) }); return { tokens: Number(o.tokens) || 0, paid: Number(o.paid) || 0 }; }
  async karaokeTip(score: number): Promise<{ tokens: number; paid: number }> { const o = await this.rpcJson('karaoke_tip', { score: Math.max(0, Math.round(score)) }); return { tokens: Number(o.tokens) || 0, paid: Number(o.paid) || 0 }; }
  async dinerTip(score: number): Promise<{ tokens: number; paid: number }> { const o = await this.rpcJson('diner_tip', { score: Math.max(0, Math.round(score)) }); return { tokens: Number(o.tokens) || 0, paid: Number(o.paid) || 0 }; }
  async contestBoard(): Promise<ContestBoard> {
    const o = await this.rpcJson('contest_board', {});
    const top = Array.isArray(o.top) ? (o.top as Record<string, unknown>[]).map((e) => ({ name: cleanName(e.name) || 'SOMEONE', fish: String(e.fish ?? '').slice(0, 16), cm: Number(e.cm) || 0 })) : [];
    const l = o.last as Record<string, unknown> | null;
    return { live: o.live === true, top, won: o.won === true, last: l ? { name: cleanName(l.name) || 'SOMEONE', fish: String(l.fish ?? '').slice(0, 16), cm: Number(l.cm) || 0, prize: Number(l.prize) || 0, anglers: Number(l.anglers) || 0, at: Number(l.at) || 0 } : null };
  }
  // ---- daily quests and badges (0009_quests.sql) ----
  async todaysQuests(): Promise<{ day: string; quests: string[]; done: string[] }> {
    const o = await this.rpcJson('todays_quests', {});
    const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    return { day: String(o.day ?? ''), quests: arr(o.quests), done: arr(o.done) };
  }
  async completeQuest(q: string): Promise<{ tokens: number; bonus: boolean }> { const o = await this.rpcJson('complete_quest', { q }); return { tokens: Number(o.tokens) || 0, bonus: o.bonus === true }; }
  async claimBadge(b: string): Promise<boolean> { const { data, error } = await this.sb.rpc('claim_badge', { b }); if (error) throw new Error(error.message); return data === true; }
  async badgesOf(id: string): Promise<string[]> {
    if (!UUID.test(id)) return [];
    const { data, error } = await this.sb.from('badges').select('badge').eq('user_id', id);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => String(r.badge));
  }
  async playClaw(): Promise<ClawResult> {
    const { data, error } = await this.sb.rpc('play_claw');
    if (error) throw new Error(error.message);
    const o = (data ?? {}) as { item?: unknown; dupe?: unknown; tokens?: unknown };
    return { item: String(o.item ?? ''), dupe: o.dupe === true, tokens: typeof o.tokens === 'number' ? o.tokens : 0 };
  }

  // ---- servers ----
  async servers(friendIds: string[]): Promise<ServerInfo[]> {
    const { data, error } = await this.sb.rpc('list_servers', { friends: friendIds.filter((id) => UUID.test(id)).slice(0, 50) });
    if (error) throw new Error(error.message);
    return ((data ?? []) as { id: string; name: string; players: number; cap: number; here: string[] | null }[])
      .map((v) => ({ id: String(v.id), name: String(v.name).slice(0, 16), players: Number(v.players) || 0, cap: Number(v.cap) || 0, friends: v.here ?? [] }));
  }
  async claimSeat(id: string): Promise<void> {
    const { error } = await this.sb.rpc('claim_seat', { server: id });
    if (error) throw new Error(error.message);
    if (this.server !== id && this.lobbyCh) { const ch = this.lobbyCh; this.lobbyCh = null; void this.sb.removeChannel(ch); }
    this.server = id;
    clearInterval(this.pingTimer);
    this.pingTimer = window.setInterval(() => void this.ping(), 30000);
  }
  /** Keep the seat alive; if it lapsed (sleep, lost wifi), take it again or tell the game. */
  private async ping(): Promise<void> {
    if (!this.server) return;
    const { data, error } = await this.sb.rpc('seat_ping');
    if (error || data === true) return;
    try { await this.claimSeat(this.server); } catch { clearInterval(this.pingTimer); this.server = null; for (const f of this.seatLost) f(); }
  }
  onSeatLost(fn: () => void): void { this.seatLost.push(fn); }
  /** Give the seat back straight away (keepalive, so it still goes out while the page closes). */
  leaveSeat(): void {
    clearInterval(this.pingTimer);
    if (!this.server) return;
    this.server = null;
    void this.sb.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token; if (!token) return;
      void fetch(this.url + '/rest/v1/rpc/leave_seat', { method: 'POST', keepalive: true, headers: { apikey: this.key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
    });
  }
  private topic(prefix: string, room: string): string { if (!this.server) throw new Error('pick a server first'); return prefix + ':' + this.server + ':' + room; }

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

  async joinRoom(room: RoomId, me: PeerState, on: (e: NetEvent) => void, inst?: string): Promise<void> {
    await this.leaveRoom();
    this.on = on;
    this.me = me;
    this.known.clear();
    // private channels: only members get in (RLS on realtime.messages, see supabase/migrations/0002_security.sql)
    const key = inst ? room + '.' + inst : room; // a flat's channels belong to its owner
    this.room = key;
    const ch = this.sb.channel(this.topic('hangout', key), { config: { private: true, presence: { key: this.selfId }, broadcast: { self: false } } });

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
    ch.on('broadcast', { event: 'tank' }, ({ payload }) => { const v = parseTank(payload); if (v && v.id !== this.selfId) this.on({ type: 'tank', id: v.id, t: v.t }); });
    ch.on('broadcast', { event: 'kscore' }, ({ payload }) => { const v = parseKScore(payload); if (v && v.id !== this.selfId) this.on({ type: 'kscore', id: v.id, k: v.k }); });
    ch.on('broadcast', { event: 'junk' }, ({ payload }) => { const v = parseJunk(payload); if (v && v.id !== this.selfId) this.on({ type: 'junk', id: v.id, n: v.n }); });
    ch.on('broadcast', { event: 'kart' }, ({ payload }) => { const v = parseKart(payload); if (v && v.id !== this.selfId) this.on({ type: 'kart', id: v.id, k: v.k }); });
    ch.on('broadcast', { event: 'cook' }, ({ payload }) => { const v = parseCook(payload); if (v && v.id !== this.selfId) this.on({ type: 'cook', id: v.id, st: v.st }); });
    ch.on('broadcast', { event: 'pong' }, ({ payload }) => { const v = parsePong(payload); if (v && v.id !== this.selfId) this.on({ type: 'pong', id: v.id, p: v.p }); });
    ch.on('broadcast', { event: 'draw' }, ({ payload }) => { const v = parseDraw(payload); if (v && v.id !== this.selfId) this.on({ type: 'draw', id: v.id, d: v.d }); });

    this.ch = ch;
    // the server channel: only the database sends here, so the sender id on chat is real
    const srv = this.sb.channel(this.topic('hangout-srv', key), { config: { private: true } });
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
    if (!this.lobbyCh && this.server) {
      const ch = this.sb.channel(this.topic('hangout', 'lobby'), { config: { private: true, presence: { key: this.selfId } } });
      ch.on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState() as Record<string, unknown[]>, out: LobbyPerson[] = [];
        for (const [key, metas] of Object.entries(state)) { if (key === this.selfId || !metas.length) continue; const p = parseLobby({ ...(metas[0] as object), id: key }); if (p) out.push(p); }
        this.lobbyOn(out);
      });
      ch.on('broadcast', { event: 'world' }, ({ payload }) => { const v = parseWorld(payload); if (v && v.id !== this.selfId) this.worldOn({ type: 'world', id: v.id, w: v.w }); });
      ch.on('broadcast', { event: 'flat' }, ({ payload }) => { const v = parseFlatMsg(payload); if (v && v.id !== this.selfId) this.worldOn({ type: 'flat', id: v.id, f: v.f }); });
      ch.subscribe(async (status) => { if (status === 'SUBSCRIBED' && this.lobbyMe) await ch.track(this.lobbyMe); });
      this.lobbyCh = ch;
    } else void this.lobbyCh?.track(this.lobbyMe);
  }
  watchLobby(on: (people: LobbyPerson[]) => void): void { this.lobbyOn = on; }
  leaveLobby(): void { this.lobbyMe = null; if (this.lobbyCh) { const ch = this.lobbyCh; this.lobbyCh = null; void ch.untrack().finally(() => this.sb.removeChannel(ch)); } this.lobbyOn([]); }
  private worldOn: (e: NetEvent) => void = () => {};
  watchWorld(on: (e: NetEvent) => void): void { this.worldOn = on; }
  sendWorld(w: HideSeek): void { void this.lobbyCh?.send({ type: 'broadcast', event: 'world', payload: { id: this.selfId, ...w } }); }
  sendFlat(f: FlatMsg): void { void this.lobbyCh?.send({ type: 'broadcast', event: 'flat', payload: { id: this.selfId, ...f } }); }
  sendTank(t: TankMsg): void { void this.ch?.send({ type: 'broadcast', event: 'tank', payload: { id: this.selfId, ...t } }); }
  sendKScore(k: KScore): void { void this.ch?.send({ type: 'broadcast', event: 'kscore', payload: { id: this.selfId, ...k } }); }
  sendJunk(n: number): void { void this.ch?.send({ type: 'broadcast', event: 'junk', payload: { id: this.selfId, n } }); }
  sendKart(k: KartMsg): void { void this.ch?.send({ type: 'broadcast', event: 'kart', payload: { id: this.selfId, ...k } }); }
  sendCook(st: number): void { void this.ch?.send({ type: 'broadcast', event: 'cook', payload: { id: this.selfId, st } }); }
  sendPong(p: PongMsg): void { void this.ch?.send({ type: 'broadcast', event: 'pong', payload: { id: this.selfId, ...p } }); }

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
