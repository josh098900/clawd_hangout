// Your save: cosmetic unlocks you earned by playing, friends, collections and high score. Cached in this browser per player id, and (online) kept in the `saves` table so
// a logged-in account gets it on any device. Prizes won with tokens are NOT here: they live in
// the server-owned inventory, which this module reads alongside.
//
// Everything that arrives (the cache, the server, a merged guest) goes through clean(); merging
// is a union (sets) / max (counts), so nothing earned anywhere is ever lost.

export interface SaveData {
  /** Earned cosmetics as 'hat:5', 'pet:1', ... */
  unlocks: string[];
  /** Starred players: [id, name]. */
  friends: [string, string][];
  feeds: number; hi: number;
  fish: string[]; stars: string[];
  /** What you've spotted through the Space Station's telescope (planets, comets, the Square). */
  sky: string[];
  /** Crops you've harvested on the Rooftop (seed names). */
  crops: string[];
  /** Places you've been (room ids, see game/places.ts): the map's ? stickers and the EXPLORER badge. */
  places: string[];
  /** Today's quest progress (see game/quests.ts): the day, and a count per quest. */
  q: { day: string; c: Record<string, number> };
  /** Lifetime counts for badges: commits, pongWins, rides, helped, harvests, quests, tricks. */
  stats: Record<string, number>;
}
export interface SaveStore { loadSave(): Promise<unknown>; storeSave(d: SaveData): Promise<void>; inventory(): Promise<string[]> }

const ITEM = /^[a-z]{2,8}:[0-9]{1,3}$/;
const strs = (v: unknown, max: number, len: number, re?: RegExp): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((s): s is string => typeof s === 'string' && s.length <= len && (!re || re.test(s))))].slice(0, max) : [];
const n = (v: unknown, hi: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(hi, Math.floor(v))) : 0);

/** A small { name: count } map, cleaned (at most 64 keys). */
function tally(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v as Record<string, unknown>).slice(0, 64)) if (/^[a-zA-Z0-9]{1,16}$/.test(k)) out[k] = n(x, 1e7);
  return out;
}
function counts(v: unknown): { day: string; c: Record<string, number> } {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { day: typeof o.day === 'string' && /^\d{4}-\d\d-\d\d$/.test(o.day) ? o.day : '', c: tally(o.c) };
}
export function clean(v: unknown): SaveData {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const friends = Array.isArray(o.friends) ? o.friends.filter((f): f is [string, string] => Array.isArray(f) && typeof f[0] === 'string' && f[0].length <= 64 && typeof f[1] === 'string').slice(0, 100).map(([id, nm]) => [id, nm.slice(0, 16)] as [string, string]) : [];
  return { unlocks: strs(o.unlocks, 200, 12, ITEM), friends, feeds: n(o.feeds, 1e6), hi: n(o.hi, 1e7), fish: strs(o.fish, 64, 24), stars: strs(o.stars, 64, 24), sky: strs(o.sky, 64, 24), crops: strs(o.crops, 16, 16), places: strs(o.places, 48, 12, /^[a-z]{2,12}$/), q: counts(o.q), stats: tally(o.stats) };
}
const maxOf = (a: Record<string, number>, b: Record<string, number>): Record<string, number> => { const o = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = Math.max(o[k] ?? 0, v); return o; };
export function merge(a: SaveData, b: SaveData): SaveData {
  const fr = new Map(a.friends); for (const [id, nm] of b.friends) fr.set(id, nm);
  return {
    unlocks: [...new Set([...a.unlocks, ...b.unlocks])], friends: [...fr].slice(0, 100),
    feeds: Math.max(a.feeds, b.feeds), hi: Math.max(a.hi, b.hi),
    fish: [...new Set([...a.fish, ...b.fish])], stars: [...new Set([...a.stars, ...b.stars])], sky: [...new Set([...a.sky, ...b.sky])], crops: [...new Set([...a.crops, ...b.crops])], places: [...new Set([...a.places, ...b.places])],
    q: a.q.day === b.q.day ? { day: a.q.day, c: maxOf(a.q.c, b.q.c) } : a.q.day > b.q.day ? a.q : b.q,
    stats: maxOf(a.stats, b.stats),
  };
}

const KEY = 'labhangout.save.', MIGRATED = 'labhangout.migrated';
const ls = { get: (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };

const json = (v: string | null): unknown => { try { return JSON.parse(v || 'null'); } catch { return null; } };

/** Progress from before saves existed (plain localStorage keys), picked up once per browser. */
function legacy(): SaveData {
  const j = (k: string): unknown => json(ls.get(k));
  const unlocks: string[] = [];
  if (ls.get('labhangout.hat.5') === '1') unlocks.push('hat:5');
  if (ls.get('labhangout.pet.1') === '1') unlocks.push('pet:1');
  return clean({ unlocks, friends: j('labhangout.friends'), feeds: Number(ls.get('labhangout.feeds')) || 0, hi: Number(ls.get('labhangout.hiscore')) || 0, fish: j('labhangout.fish'), stars: j('labhangout.stars') });
}

class Save {
  data: SaveData = clean({});
  /** Prizes (server-owned). */
  inv = new Set<string>();
  private uid = '';
  private store: SaveStore | null = null;
  private timer = 0;
  private subs: (() => void)[] = [];

  /** Load this player's save: the browser cache, old-style keys (once), then the server; merge them all. */
  async attach(uid: string, store: SaveStore | null): Promise<void> {
    this.uid = uid; this.store = store;
    let d = clean(json(ls.get(KEY + uid))); // (a corrupted cache must never stop the game from starting)
    if (!ls.get(MIGRATED)) { d = merge(d, legacy()); ls.set(MIGRATED, '1'); }
    if (store) {
      try { const remote = await store.loadSave(); if (remote) d = merge(d, clean(remote)); } catch (e) { console.warn('[save] load failed', e); }
      try { this.inv = new Set((await store.inventory()).filter((s) => ITEM.test(s))); } catch (e) { console.warn('[save] inventory failed', e); }
    }
    this.data = d; this.cache(); this.flush(); this.emit();
  }
  /** Fold in someone else's save (a guest being merged into this account). */
  mergeIn(v: unknown): void { this.data = merge(this.data, clean(v)); this.changed(); }
  has(item: string): boolean { return this.data.unlocks.includes(item) || this.inv.has(item); }
  /** Earn an unlock; true if it's new. */
  unlock(item: string): boolean { if (this.has(item)) return false; this.data.unlocks.push(item); this.changed(); return true; }
  addPrize(item: string): void { this.inv.add(item); this.emit(); }
  update(fn: (d: SaveData) => void): void { fn(this.data); this.changed(); }
  onChange(fn: () => void): void { this.subs.push(fn); }

  private changed(): void { this.cache(); clearTimeout(this.timer); this.timer = window.setTimeout(() => this.flush(), 2000); this.emit(); }
  private cache(): void { if (this.uid) ls.set(KEY + this.uid, JSON.stringify(this.data)); }
  private flush(): void { if (this.store) this.store.storeSave(this.data).catch((e) => console.warn('[save] store failed', e)); }
  private emit(): void { for (const f of this.subs) f(); }
}
export const save = new Save();
