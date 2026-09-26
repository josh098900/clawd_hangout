// The Supabase side of the game's server requests (net.api, see Api in transport.ts): each one is a database
// function (supabase/migrations) or a table read. The database checks every rule; this only asks and reads the answer.

import type { SupabaseClient } from '@supabase/supabase-js';
import { cleanName, parseDoor, parseLayout, type Api, type Photo, type MyPhoto } from './transport';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Call a database function; its error becomes a thrown Error. */
export async function rpc(sb: SupabaseClient, fn: string, args?: Record<string, unknown>): Promise<unknown> { const { data, error } = await sb.rpc(fn, args); if (error) throw new Error(error.message); return data; }
/** Call a database function that answers with a JSON object. */
export async function rpcJson(sb: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<Record<string, unknown>> { return ((await rpc(sb, fn, args)) ?? {}) as Record<string, unknown>; }
// Reading what the database sent back (it's ours, but a field can still be missing or null):
/** A number, 0 if it isn't one. */
const n0 = (v: unknown): number => Number(v) || 0;
/** A number, or null. */
export const numOr = (v: unknown): number | null => (typeof v === 'number' ? v : null);
/** A string, or null. */
export const strOr = (v: unknown): string | null => (typeof v === 'string' ? v : null);
/** Someone's name as the database sent it, cleaned (SOMEONE if it's blank). */
const who = (v: unknown): string => cleanName(v) || 'SOMEONE';
/** The rows of a table read; a failed read becomes a thrown Error. */
export async function rows<T>(q: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await q; if (error) throw new Error(error.message); return data ?? [];
}

export class SupabaseApi implements Api {
  constructor(private sb: SupabaseClient, private ctx: { readonly server: string | null }) {}
  private get server(): string | null { return this.ctx.server; }
  /** A photo from the database, checked (a strip that isn't a PNG data URL comes back with png ''). */
  private photoOf(o: Record<string, unknown>): Photo { return { id: Number(o.id), owner: String(o.owner ?? ''), ownerName: who(o.owner_name), png: typeof o.png === 'string' && o.png.startsWith('data:image/png;base64,') ? o.png : '', at: n0(o.at), hearts: n0(o.hearts), mine: o.mine === true }; }

  /** Your token balance, and picking tokens up. */
  readonly tokens: Api['tokens'] = {
    balance: async () => numOr(await rpc(this.sb, 'my_tokens')) ?? 0,
    claimCoin: async (i) => numOr(await rpc(this.sb, 'claim_coin', { coin: i })),
    claimDaily: async () => numOr(await rpc(this.sb, 'claim_daily')),
  };

  /** Daily quests and badges (0009_quests.sql). */
  readonly quests: Api['quests'] = {
    today: async () => {
      const o = await rpcJson(this.sb, 'todays_quests', {});
      const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
      return { day: String(o.day ?? ''), quests: arr(o.quests), done: arr(o.done) };
    },
    complete: async (q) => { const o = await rpcJson(this.sb, 'complete_quest', { q }); return { tokens: n0(o.tokens), bonus: o.bonus === true }; },
    claimBadge: async (b) => (await rpc(this.sb, 'claim_badge', { b })) === true,
    badgesOf: async (id) => {
      if (!UUID.test(id)) return [];
      return (await rows(this.sb.from('badges').select('badge').eq('user_id', id))).map((r) => String(r.badge));
    },
  };

  /** The seasons (0007_halloween.sql). */
  readonly season: Api['season'] = {
    current: async () => strOr(await rpc(this.sb, 'current_season')),
    trickOrTreat: async (door) => {
      const o = await rpcJson(this.sb, 'trick_or_treat', { door });
      return { tokens: n0(o.tokens), trick: o.trick === true, visited: n0(o.visited), prize: strOr(o.prize) };
    },
  };

  /** The Rooftop's community garden (0008_gardens.sql). */
  readonly garden: Api['garden'] = {
    plots: async () => {
      if (!this.server) return [];
      return (await rows(this.sb.from('plots').select('bed, owner, owner_name, seed, planted_at, last_water, grown, calc_at').eq('server', this.server)))
        .map((p) => ({ bed: Number(p.bed), owner: String(p.owner), ownerName: who(p.owner_name), seed: Number(p.seed), plantedAt: Date.parse(p.planted_at), lastWater: Date.parse(p.last_water), grown: Number(p.grown), calcAt: Date.parse(p.calc_at) }));
    },
    plant: async (bed, seed) => n0(await rpc(this.sb, 'plant', { bed, seed })),
    water: async (bed) => { const o = await rpcJson(this.sb, 'water', { bed }); return { tokens: n0(o.tokens), thanked: o.thanked === true }; },
    rainWater: async () => n0(await rpc(this.sb, 'rain_water')),
    harvest: async (bed) => { const o = await rpcJson(this.sb, 'harvest', { bed }); return { tokens: n0(o.tokens), seed: n0(o.seed), bonus: strOr(o.bonus) }; },
    digUp: async (bed) => { await rpc(this.sb, 'dig_up', { bed }); },
  };

  /** The Pier: fishing and the hourly contest (0010_fishing.sql). */
  readonly fishing: Api['fishing'] = {
    catchFish: async () => {
      const o = await rpcJson(this.sb, 'catch_fish', {});
      return { fish: String(o.fish ?? ''), rarity: String(o.rarity ?? 'COMMON'), cm: n0(o.cm), contest: o.contest === true, rank: numOr(o.rank) };
    },
    contestBoard: async () => {
      const o = await rpcJson(this.sb, 'contest_board', {});
      const top = Array.isArray(o.top) ? (o.top as Record<string, unknown>[]).map((e) => ({ name: who(e.name), fish: String(e.fish ?? '').slice(0, 16), cm: n0(e.cm) })) : [];
      const l = o.last as Record<string, unknown> | null;
      return { live: o.live === true, top, won: o.won === true, last: l ? { name: who(l.name), fish: String(l.fish ?? '').slice(0, 16), cm: n0(l.cm), prize: n0(l.prize), anglers: n0(l.anglers), at: n0(l.at) } : null };
    },
  };

  /** The Space Station's STAR MELON trays and spacewalk pay (0015_space.sql). */
  readonly space: Api['space'] = {
    trays: async () => {
      if (!this.server) return [];
      return (await rows(this.sb.from('space_trays').select('tray, owner, owner_name, planted_at').eq('server', this.server)))
        .map((p) => ({ tray: Number(p.tray), owner: String(p.owner), ownerName: who(p.owner_name), plantedAt: Date.parse(p.planted_at) }));
    },
    plant: async (tray) => n0(await rpc(this.sb, 'space_plant', { tray })),
    harvest: async (tray) => { const o = await rpcJson(this.sb, 'space_harvest', { tray }); return { tokens: n0(o.tokens), bonus: strOr(o.bonus), rotten: o.rotten === true }; },
    digUp: async (tray) => { await rpc(this.sb, 'space_dig_up', { tray }); },
    spacewalkPay: async (pts) => { const o = await rpcJson(this.sb, 'spacewalk_pay', { pts: Math.max(0, Math.round(pts)) }); return { tokens: Number(o.tokens) || 0, paid: Number(o.paid) || 0 }; },
  };

  /** Winter (0018_winter.sql): the present hunt, the advent calendar, the tree, the sleigh, Secret Santa. */
  readonly winter: Api['winter'] = {
    findPresent: async (n) => { const o = await rpcJson(this.sb, 'find_present', { n }); return { tokens: n0(o.tokens), found: n0(o.found), prize: strOr(o.prize) }; },
    presentsToday: async () => { const data = await rpc(this.sb, 'presents_today'); return Array.isArray(data) ? (data as unknown[]).map(Number).filter((n) => n >= 0 && n < 12) : []; },
    openAdvent: async (door) => { const o = await rpcJson(this.sb, 'open_advent', { door }); return { tokens: n0(o.tokens), prize: String(o.prize ?? '') }; },
    adventDoors: async () => { const o = await rpcJson(this.sb, 'advent_doors', {}); return { opened: Array.isArray(o.opened) ? (o.opened as unknown[]).map(Number) : [], upto: n0(o.upto) }; },
    ornaments: async () => {
      if (!this.server) return [];
      return (await rows(this.sb.from('ornaments').select('id, kind, x, y, owner_name').eq('server', this.server).gte('placed_at', new Date(Date.now() - 45 * 86400000).toISOString()).order('id', { ascending: true }).limit(240)))
        .map((o) => ({ id: Number(o.id), kind: Number(o.kind), x: Number(o.x), y: Number(o.y), ownerName: who(o.owner_name) }));
    },
    hangOrnament: async (kind, x, y) => n0(await rpc(this.sb, 'hang_ornament', { kind, x: Math.round(x), y: Math.round(y) })),
    catchSleigh: async (pass, n) => n0(await rpc(this.sb, 'catch_sleigh', { pass, n })),
    sendGift: async (to, tokens, wrap, note) => n0(await rpc(this.sb, 'send_gift', { recipient: to, tokens, wrap, note })),
    treeGifts: async () => (((await rpc(this.sb, 'tree_gifts')) ?? []) as Record<string, unknown>[]).map((g) => ({ id: Number(g.id), to: String(g.to ?? ''), toName: who(g.to_name), wrap: n0(g.wrap), mine: g.mine === true })),
    openGift: async (id) => { const o = await rpcJson(this.sb, 'open_gift', { gift: id }); return { tokens: n0(o.tokens), got: n0(o.got), from: who(o.from), note: n0(o.note) }; },
  };

  /** The Lab's PHOTO WALL (0017_photos.sql). */
  readonly photos: Api['photos'] = {
    isAdmin: async () => { const { data, error } = await this.sb.rpc('is_admin'); if (error) return false; return data === true; },
    pin: async (png) => n0(await rpc(this.sb, 'pin_photo', { png })),
    wall: async (n, before) => {
      const o = await rpcJson(this.sb, 'wall_photos', { n, before }); const ps = Array.isArray(o.photos) ? o.photos as Record<string, unknown>[] : [];
      return { week: o.week == null ? null : Number(o.week), photos: ps.map((p) => this.photoOf(p)).filter((p) => p.png) };
    },
    byId: async (id) => { const data = await rpc(this.sb, 'photo_by_id', { photo: id }); return data ? this.photoOf(data as Record<string, unknown>) : null; },
    heart: async (id) => { const o = await rpcJson(this.sb, 'heart_photo', { photo: id }); return { hearts: n0(o.hearts), mine: o.mine === true }; },
    mine: async () => (((await rpc(this.sb, 'my_photos')) ?? []) as Record<string, unknown>[]).map((p) => ({ id: Number(p.id), status: (['pending', 'approved', 'rejected'].includes(String(p.status)) ? p.status : 'pending') as MyPhoto['status'], featured: p.featured === true, at: n0(p.at) })),
    feature: async (id) => { await rpc(this.sb, 'feature_photo', { photo: id }); },
    remove: async (id) => { await rpc(this.sb, 'delete_photo', { photo: id }); },
    inFlat: async (owner) => { const data = await rpc(this.sb, 'flat_photo', { owner }); return typeof data === 'string' && data.startsWith('data:image/png;base64,') ? data : null; },
    pending: async () => (((await rpc(this.sb, 'pending_photos')) ?? []) as Record<string, unknown>[]).map((p) => this.photoOf(p)).filter((p) => p.png),
    review: async (id, ok) => { await rpc(this.sb, 'review_photo', { photo: id, ok }); },
  };

  /** THE LOFTS: flats, furniture, doors and parties (0014_apartments.sql). */
  readonly flats: Api['flats'] = {
    mine: async () => {
      const o = await rpcJson(this.sb, 'my_flat', {}), owned: Record<string, number> = {};
      if (o.owned && typeof o.owned === 'object') for (const [k, v] of Object.entries(o.owned as Record<string, unknown>)) if (typeof v === 'number' && v > 0) owned[k] = v;
      return { name: '', layout: parseLayout(o.layout), door: parseDoor(o.door), party: numOr(o.party), owned, tokens: n0(o.tokens) };
    },
    get: async (owner) => { const o = await rpcJson(this.sb, 'get_flat', { owner }); return { name: cleanName(o.name) || '?', layout: parseLayout(o.layout), door: parseDoor(o.door), party: numOr(o.party) }; },
    doors: async (ids) => {
      if (!ids.length) return [];
      const data = await rpc(this.sb, 'flat_doors', { ids });
      return (Array.isArray(data) ? data : []).map((d: Record<string, unknown>) => ({ owner: String(d.owner), name: cleanName(d.name) || '?', door: parseDoor(d.door), party: numOr(d.party), can: d.can === true }));
    },
    buy: async (what) => { const o = await rpcJson(this.sb, 'buy_furniture', { what }); return { tokens: n0(o.tokens), n: n0(o.n) }; },
    save: async (layout) => { await rpc(this.sb, 'save_flat', { layout }); },
    setDoor: async (door) => { await rpc(this.sb, 'set_door', { door }); },
    party: async (on) => numOr(await rpc(this.sb, 'flat_party', { on_: on })),
    letIn: async (id) => { await rpc(this.sb, 'let_in', { who: id }); },
  };

  /** The Arcade (0006_arcade.sql). */
  readonly arcade: Api['arcade'] = {
    playClaw: async () => {
      const o = await rpcJson(this.sb, 'play_claw', {});
      return { item: String(o.item ?? ''), dupe: o.dupe === true, tokens: numOr(o.tokens) ?? 0 };
    },
  };

  /** The Moon (0019_moon.sql). */
  readonly moon: Api['moon'] = {
    assay: async () => { const o = await rpcJson(this.sb, 'moon_assay', {}); return { tokens: n0(o.tokens), paid: n0(o.paid), crystal: o.crystal === true, crystals: n0(o.crystals), prize: strOr(o.prize) }; },
    crystals: async () => n0(await rpc(this.sb, 'moon_crystals')),
  };

  /** Tips paid for a performance (the server caps them). */
  readonly tips: Api['tips'] = {
    karaoke: async (score) => { const o = await rpcJson(this.sb, 'karaoke_tip', { score: Math.max(0, Math.round(score)) }); return { tokens: n0(o.tokens), paid: n0(o.paid) }; },
    diner: async (score) => { const o = await rpcJson(this.sb, 'diner_tip', { score: Math.max(0, Math.round(score)) }); return { tokens: n0(o.tokens), paid: n0(o.paid) }; },
  };
}
