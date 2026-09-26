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
import type { RoomId } from '../world/room';
import { cleanName, PROVIDERS, MESSAGES, MSG_TYPES, readMsg, parseLayout, parseDoor, parsePeer, parseLobby, type DoorMode, type FlatDoor, type FlatInfo, type FlatLayout, type MyFlat, type LobbyPerson, type MoveMsg, type NetEvent, type Outgoing, type PeerState, type Transport, type Account, type ClawResult, type ContestBoard, type Plot, type Tray, type Photo, type MyPhoto, type Ornament, type TreeGift, type Provider, type ServerInfo } from './transport';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Reading what the database sent back (it's ours, but a field can still be missing or null):
/** A number, 0 if it isn't one. */
const n0 = (v: unknown): number => Number(v) || 0;
/** A number, or null. */
const numOr = (v: unknown): number | null => (typeof v === 'number' ? v : null);
/** A string, or null. */
const strOr = (v: unknown): string | null => (typeof v === 'string' ? v : null);
/** Someone's name as the database sent it, cleaned (SOMEONE if it's blank). */
const who = (v: unknown): string => cleanName(v) || 'SOMEONE';
/** The rows of a table read; a failed read becomes a thrown Error. */
async function rows<T>(q: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await q; if (error) throw new Error(error.message); return data ?? [];
}

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
  /** Call a database function; its error becomes a thrown Error. */
  private async rpc(fn: string, args?: Record<string, unknown>): Promise<unknown> { const { data, error } = await this.sb.rpc(fn, args); if (error) throw new Error(error.message); return data; }
  /** Call a database function that answers with a JSON object. */
  private async rpcJson(fn: string, args: Record<string, unknown>): Promise<Record<string, unknown>> { return ((await this.rpc(fn, args)) ?? {}) as Record<string, unknown>; }
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
  async startMerge(): Promise<string> { return String(await this.rpc('start_merge')); }
  async finishMerge(ticket: string): Promise<{ tokens: number; save: unknown }> {
    const o = await this.rpcJson('finish_merge', { ticket });
    return { tokens: numOr(o.tokens) ?? 0, save: o.save ?? null };
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
    return (await rows(this.sb.from('inventory').select('item').eq('user_id', this.selfId))).map((r) => String(r.item));
  }
  async season(): Promise<string | null> { return strOr(await this.rpc('current_season')); }
  async trickOrTreat(door: number): Promise<{ tokens: number; trick: boolean; visited: number; prize: string | null }> {
    const o = await this.rpcJson('trick_or_treat', { door });
    return { tokens: n0(o.tokens), trick: o.trick === true, visited: n0(o.visited), prize: strOr(o.prize) };
  }
  // ---- the Rooftop garden (supabase/migrations/0008_gardens.sql) ----
  async plots(): Promise<Plot[]> {
    if (!this.server) return [];
    return (await rows(this.sb.from('plots').select('bed, owner, owner_name, seed, planted_at, last_water, grown, calc_at').eq('server', this.server)))
      .map((p) => ({ bed: Number(p.bed), owner: String(p.owner), ownerName: who(p.owner_name), seed: Number(p.seed), plantedAt: Date.parse(p.planted_at), lastWater: Date.parse(p.last_water), grown: Number(p.grown), calcAt: Date.parse(p.calc_at) }));
  }
  async plant(bed: number, seed: number): Promise<number> { return n0(await this.rpc('plant', { bed, seed })); }
  async water(bed: number): Promise<{ tokens: number; thanked: boolean }> { const o = await this.rpcJson('water', { bed }); return { tokens: n0(o.tokens), thanked: o.thanked === true }; }
  async rainWater(): Promise<number> { return n0(await this.rpc('rain_water')); }
  async harvest(bed: number): Promise<{ tokens: number; seed: number; bonus: string | null }> { const o = await this.rpcJson('harvest', { bed }); return { tokens: n0(o.tokens), seed: n0(o.seed), bonus: strOr(o.bonus) }; }
  async digUp(bed: number): Promise<void> { await this.rpc('dig_up', { bed }); }
  // ---- the fishing contest (0010_fishing.sql) ----
  async catchFish(): Promise<{ fish: string; rarity: string; cm: number; contest: boolean; rank: number | null }> {
    const o = await this.rpcJson('catch_fish', {});
    return { fish: String(o.fish ?? ''), rarity: String(o.rarity ?? 'COMMON'), cm: n0(o.cm), contest: o.contest === true, rank: numOr(o.rank) };
  }
  async myFlat(): Promise<MyFlat> {
    const o = await this.rpcJson('my_flat', {}), owned: Record<string, number> = {};
    if (o.owned && typeof o.owned === 'object') for (const [k, v] of Object.entries(o.owned as Record<string, unknown>)) if (typeof v === 'number' && v > 0) owned[k] = v;
    return { name: '', layout: parseLayout(o.layout), door: parseDoor(o.door), party: numOr(o.party), owned, tokens: n0(o.tokens) };
  }
  async getFlat(owner: string): Promise<FlatInfo> { const o = await this.rpcJson('get_flat', { owner }); return { name: cleanName(o.name) || '?', layout: parseLayout(o.layout), door: parseDoor(o.door), party: numOr(o.party) }; }
  async flatDoors(ids: string[]): Promise<FlatDoor[]> {
    if (!ids.length) return [];
    const data = await this.rpc('flat_doors', { ids });
    return (Array.isArray(data) ? data : []).map((d: Record<string, unknown>) => ({ owner: String(d.owner), name: cleanName(d.name) || '?', door: parseDoor(d.door), party: numOr(d.party), can: d.can === true }));
  }
  async buyFurniture(what: string): Promise<{ tokens: number; n: number }> { const o = await this.rpcJson('buy_furniture', { what }); return { tokens: n0(o.tokens), n: n0(o.n) }; }
  async saveFlat(layout: FlatLayout): Promise<void> { await this.rpc('save_flat', { layout }); }
  async setDoor(door: DoorMode): Promise<void> { await this.rpc('set_door', { door }); }
  async flatParty(on: boolean): Promise<number | null> { return numOr(await this.rpc('flat_party', { on_: on })); }
  async letIn(id: string): Promise<void> { await this.rpc('let_in', { who: id }); }
  async trays(): Promise<Tray[]> {
    if (!this.server) return [];
    return (await rows(this.sb.from('space_trays').select('tray, owner, owner_name, planted_at').eq('server', this.server)))
      .map((p) => ({ tray: Number(p.tray), owner: String(p.owner), ownerName: who(p.owner_name), plantedAt: Date.parse(p.planted_at) }));
  }
  async spacePlant(tray: number): Promise<number> { return n0(await this.rpc('space_plant', { tray })); }
  async spaceHarvest(tray: number): Promise<{ tokens: number; bonus: string | null; rotten: boolean }> { const o = await this.rpcJson('space_harvest', { tray }); return { tokens: n0(o.tokens), bonus: strOr(o.bonus), rotten: o.rotten === true }; }
  async spaceDigUp(tray: number): Promise<void> { await this.rpc('space_dig_up', { tray }); }
  async spacewalkPay(pts: number): Promise<{ tokens: number; paid: number }> { const o = await this.rpcJson('spacewalk_pay', { pts: Math.max(0, Math.round(pts)) }); return { tokens: Number(o.tokens) || 0, paid: Number(o.paid) || 0 }; }
  // ---- winter ----
  async findPresent(n: number): Promise<{ tokens: number; found: number; prize: string | null }> { const o = await this.rpcJson('find_present', { n }); return { tokens: n0(o.tokens), found: n0(o.found), prize: strOr(o.prize) }; }
  async presentsToday(): Promise<number[]> { const data = await this.rpc('presents_today'); return Array.isArray(data) ? (data as unknown[]).map(Number).filter((n) => n >= 0 && n < 12) : []; }
  async openAdvent(door: number): Promise<{ tokens: number; prize: string }> { const o = await this.rpcJson('open_advent', { door }); return { tokens: n0(o.tokens), prize: String(o.prize ?? '') }; }
  async adventDoors(): Promise<{ opened: number[]; upto: number }> { const o = await this.rpcJson('advent_doors', {}); return { opened: Array.isArray(o.opened) ? (o.opened as unknown[]).map(Number) : [], upto: n0(o.upto) }; }
  async ornaments(): Promise<Ornament[]> {
    if (!this.server) return [];
    return (await rows(this.sb.from('ornaments').select('id, kind, x, y, owner_name').eq('server', this.server).gte('placed_at', new Date(Date.now() - 45 * 86400000).toISOString()).order('id', { ascending: true }).limit(240)))
      .map((o) => ({ id: Number(o.id), kind: Number(o.kind), x: Number(o.x), y: Number(o.y), ownerName: who(o.owner_name) }));
  }
  async hangOrnament(kind: number, x: number, y: number): Promise<number> { return n0(await this.rpc('hang_ornament', { kind, x: Math.round(x), y: Math.round(y) })); }
  async catchSleigh(pass: number, n: number): Promise<number> { return n0(await this.rpc('catch_sleigh', { pass, n })); }
  async sendGift(to: string, tokens: number, wrap: number, note: number): Promise<number> { return n0(await this.rpc('send_gift', { recipient: to, tokens, wrap, note })); }
  async treeGifts(): Promise<TreeGift[]> { return (((await this.rpc('tree_gifts')) ?? []) as Record<string, unknown>[]).map((g) => ({ id: Number(g.id), to: String(g.to ?? ''), toName: who(g.to_name), wrap: n0(g.wrap), mine: g.mine === true })); }
  async openGift(id: number): Promise<{ tokens: number; got: number; from: string; note: number }> { const o = await this.rpcJson('open_gift', { gift: id }); return { tokens: n0(o.tokens), got: n0(o.got), from: who(o.from), note: n0(o.note) }; }
  // ---- the photo wall ----
  private photoOf(o: Record<string, unknown>): Photo { return { id: Number(o.id), owner: String(o.owner ?? ''), ownerName: who(o.owner_name), png: typeof o.png === 'string' && o.png.startsWith('data:image/png;base64,') ? o.png : '', at: n0(o.at), hearts: n0(o.hearts), mine: o.mine === true }; }
  async isAdmin(): Promise<boolean> { const { data, error } = await this.sb.rpc('is_admin'); if (error) return false; return data === true; }
  async pinPhoto(png: string): Promise<number> { return n0(await this.rpc('pin_photo', { png })); }
  async wallPhotos(n: number, before: number | null): Promise<{ week: number | null; photos: Photo[] }> {
    const o = await this.rpcJson('wall_photos', { n, before }); const ps = Array.isArray(o.photos) ? o.photos as Record<string, unknown>[] : [];
    return { week: o.week == null ? null : Number(o.week), photos: ps.map((p) => this.photoOf(p)).filter((p) => p.png) };
  }
  async photoById(id: number): Promise<Photo | null> { const data = await this.rpc('photo_by_id', { photo: id }); return data ? this.photoOf(data as Record<string, unknown>) : null; }
  async heartPhoto(id: number): Promise<{ hearts: number; mine: boolean }> { const o = await this.rpcJson('heart_photo', { photo: id }); return { hearts: n0(o.hearts), mine: o.mine === true }; }
  async myPhotos(): Promise<MyPhoto[]> { return (((await this.rpc('my_photos')) ?? []) as Record<string, unknown>[]).map((p) => ({ id: Number(p.id), status: (['pending', 'approved', 'rejected'].includes(String(p.status)) ? p.status : 'pending') as MyPhoto['status'], featured: p.featured === true, at: n0(p.at) })); }
  async featurePhoto(id: number): Promise<void> { await this.rpc('feature_photo', { photo: id }); }
  async deletePhoto(id: number): Promise<void> { await this.rpc('delete_photo', { photo: id }); }
  async flatPhoto(owner: string): Promise<string | null> { const data = await this.rpc('flat_photo', { owner }); return typeof data === 'string' && data.startsWith('data:image/png;base64,') ? data : null; }
  async pendingPhotos(): Promise<Photo[]> { return (((await this.rpc('pending_photos')) ?? []) as Record<string, unknown>[]).map((p) => this.photoOf(p)).filter((p) => p.png); }
  async reviewPhoto(id: number, ok: boolean): Promise<void> { await this.rpc('review_photo', { photo: id, ok }); }
  async karaokeTip(score: number): Promise<{ tokens: number; paid: number }> { const o = await this.rpcJson('karaoke_tip', { score: Math.max(0, Math.round(score)) }); return { tokens: n0(o.tokens), paid: n0(o.paid) }; }
  async dinerTip(score: number): Promise<{ tokens: number; paid: number }> { const o = await this.rpcJson('diner_tip', { score: Math.max(0, Math.round(score)) }); return { tokens: n0(o.tokens), paid: n0(o.paid) }; }
  async contestBoard(): Promise<ContestBoard> {
    const o = await this.rpcJson('contest_board', {});
    const top = Array.isArray(o.top) ? (o.top as Record<string, unknown>[]).map((e) => ({ name: who(e.name), fish: String(e.fish ?? '').slice(0, 16), cm: n0(e.cm) })) : [];
    const l = o.last as Record<string, unknown> | null;
    return { live: o.live === true, top, won: o.won === true, last: l ? { name: who(l.name), fish: String(l.fish ?? '').slice(0, 16), cm: n0(l.cm), prize: n0(l.prize), anglers: n0(l.anglers), at: n0(l.at) } : null };
  }
  // ---- daily quests and badges (0009_quests.sql) ----
  async todaysQuests(): Promise<{ day: string; quests: string[]; done: string[] }> {
    const o = await this.rpcJson('todays_quests', {});
    const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    return { day: String(o.day ?? ''), quests: arr(o.quests), done: arr(o.done) };
  }
  async completeQuest(q: string): Promise<{ tokens: number; bonus: boolean }> { const o = await this.rpcJson('complete_quest', { q }); return { tokens: n0(o.tokens), bonus: o.bonus === true }; }
  async claimBadge(b: string): Promise<boolean> { return (await this.rpc('claim_badge', { b })) === true; }
  async badgesOf(id: string): Promise<string[]> {
    if (!UUID.test(id)) return [];
    return (await rows(this.sb.from('badges').select('badge').eq('user_id', id))).map((r) => String(r.badge));
  }
  async playClaw(): Promise<ClawResult> {
    const o = await this.rpcJson('play_claw', {});
    return { item: String(o.item ?? ''), dupe: o.dupe === true, tokens: numOr(o.tokens) ?? 0 };
  }

  // ---- servers ----
  async servers(friendIds: string[]): Promise<ServerInfo[]> {
    const data = await this.rpc('list_servers', { friends: friendIds.filter((id) => UUID.test(id)).slice(0, 50) });
    return ((data ?? []) as { id: string; name: string; players: number; cap: number; here: string[] | null }[])
      .map((v) => ({ id: String(v.id), name: String(v.name).slice(0, 16), players: Number(v.players) || 0, cap: Number(v.cap) || 0, friends: v.here ?? [] }));
  }
  async claimSeat(id: string): Promise<void> {
    await this.rpc('claim_seat', { server: id });
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
    this.listen(ch, 'room');

    this.ch = ch;
    // the server channel: only the database sends here, so the sender id on chat is real
    const srv = this.sb.channel(this.topic('hangout-srv', key), { config: { private: true } });
    this.listen(srv, 'srv');
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
      this.listen(ch, 'lobby');
      ch.subscribe(async (status) => { if (status === 'SUBSCRIBED' && this.lobbyMe) await ch.track(this.lobbyMe); });
      this.lobbyCh = ch;
    } else void this.lobbyCh?.track(this.lobbyMe);
  }
  watchLobby(on: (people: LobbyPerson[]) => void): void { this.lobbyOn = on; }
  leaveLobby(): void { this.lobbyMe = null; if (this.lobbyCh) { const ch = this.lobbyCh; this.lobbyCh = null; void ch.untrack().finally(() => this.sb.removeChannel(ch)); } this.lobbyOn([]); }
  private worldOn: (e: NetEvent) => void = () => {};
  watchWorld(on: (e: NetEvent) => void): void { this.worldOn = on; }
  /** Hear every message in MESSAGES that travels on this kind of channel (checked, and never our own). */
  private listen(ch: RealtimeChannel, on: 'room' | 'srv' | 'lobby'): void {
    for (const type of MSG_TYPES) if (MESSAGES[type].on === on) ch.on('broadcast', { event: type }, ({ payload }) => {
      const e = readMsg(type, payload); if (!e || e.id === this.selfId) return;
      if (on === 'lobby') this.worldOn(e); else this.on(e);
    });
  }
  send<K extends keyof Outgoing>(type: K, data: Outgoing[K]): void {
    void (MESSAGES[type].on === 'lobby' ? this.lobbyCh : this.ch)?.send({ type: 'broadcast', event: type, payload: { id: this.selfId, ...data } });
  }

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
    return ((await this.rpc('send_chat', { room: this.room, body: text })) as string | null) ?? null;
  }
  async needsInvite(): Promise<boolean> { return (await this.rpc('is_member')) !== true; }
  async joinWorld(code: string): Promise<boolean> { return (await this.rpc('join_world', { code })) === true; }
  async report(id: string, reason: string): Promise<void> { await this.rpc('report_player', { who: id, reason }); }
  async tokens(): Promise<number> { return numOr(await this.rpc('my_tokens')) ?? 0; }
  async claimCoin(i: number): Promise<number | null> { return numOr(await this.rpc('claim_coin', { coin: i })); }
  async claimDaily(): Promise<number | null> { return numOr(await this.rpc('claim_daily')); }
}
