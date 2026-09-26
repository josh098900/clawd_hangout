// LOCAL mode's pretend server for the game's server requests (net.api, see Api in transport.ts): no database, so the
// rules of each SQL function are copied here and everything is kept in this browser's localStorage (every tab shares it).

import { type Api, type MyPhoto, type Ornament, type Photo, type Plot, type Tray, type TreeGift, parseDoor, parseLayout } from './transport';
import { CLAW, rollClaw } from '../entities/critter';
import { GARDEN, growth, plantState, SEEDS } from '../world/garden';
import { TRAY_SPEED } from '../world/station';
import { PRICE, STARTER } from '../world/furniture';
import { raining } from '../world/weather';
import { QUESTS } from '../game/quests';
import { rollFish } from '../game/fish';
import { contestClock } from '../world/contest';
import { h1 } from '../engine/math';

interface LocalFlat { name: string; layout: unknown; door: string; party: number | null; inv?: Record<string, number> }
/** LOCAL's pretend database: JSON in localStorage (every tab shares it), quietly ignoring a full or blocked storage. */
const db = {
  get<T>(key: string, fallback: T): T { try { const v = localStorage.getItem(key); return v === null ? fallback : ((JSON.parse(v) as T) ?? fallback); } catch { return fallback; } },
  set<T>(key: string, v: T): T { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* full, or private mode */ } return v; },
};
/** What the pretend server needs to know about the player (the LocalTransport). */
export interface LocalCtx { readonly selfId: string; readonly server: string | null; loadProfile(): Promise<{ name: string } | null>; nameOf(id: string): string | undefined }

export class LocalApi implements Api {
  constructor(private ctx: LocalCtx) {}
  private get selfId(): string { return this.ctx.selfId; }
  private get server(): string | null { return this.ctx.server; }
  /** Your prizes (the pretend inventory table); `add` puts one in. The transport reads it too. */
  inv(add?: string): string[] {
    const v = db.get<string[]>('labhangout.localInv', []);
    if (add && !v.includes(add)) { v.push(add); db.set('labhangout.localInv', v); }
    return v;
  }
  /** A season's all-of-them prize: one of its claw prizes you don't have yet (now yours), or 5 tokens if you have them all. */
  private seasonPrize(season: string): string {
    const left = CLAW.filter(([k, , s]) => s === season && !this.inv().includes(k)), prize = left.length ? left[Math.floor(Math.random() * left.length)][0] : 'tokens:5';
    if (prize === 'tokens:5') this.wallet(this.wallet() + 5); else this.inv(prize);
    return prize;
  }
  /** A payout with the SQL function's caps: at most `want`, `perDay` a day in all, and one every `gapMs` (else `tooSoon`). */
  private lastPay: Record<string, number> = {};
  private payCapped(kind: string, want: number, perDay: number, gapMs: number, tooSoon: string): { tokens: number; paid: number } {
    if (Date.now() - (this.lastPay[kind] ?? 0) < gapMs) throw new Error(tooSoon);
    const k = 'labhangout.local' + kind + '.' + this.day(), today = Number(db.get(k, 0)) || 0, paid = Math.max(0, Math.min(want, perDay - today));
    this.lastPay[kind] = Date.now(); db.set(k, today + paid);
    this.wallet(this.wallet() + paid); return { tokens: this.wallet(), paid };
  }
  // ---- the Rooftop garden, kept in this browser per server (same rules as 0008_gardens.sql) ----
  private beds(v?: Plot[]): Plot[] {
    const k = 'labhangout.localPlots.' + (this.server ?? 'none');
    return v ? db.set(k, v) : db.get<Plot[]>(k, []).filter((p) => !plantState(p).dead);
  }
  private thanked = new Set<string>();
  // ---- the fishing contest, kept in this browser (other tabs share it) ----
  private contests(v?: Record<string, { id: string; name: string; fish: string; cm: number }[]>): Record<string, { id: string; name: string; fish: string; cm: number }[]> {
    return v ? db.set('labhangout.localContests', v) : db.get('labhangout.localContests', {});
  }
  // ---- the Space Station's trays + spacewalk pay, kept in this browser per server (same rules as 0015_space.sql) ----
  private trayList(v?: Tray[]): Tray[] {
    const k = 'labhangout.localTrays.' + (this.server ?? 'none');
    return v ? db.set(k, v) : db.get<Tray[]>(k, []).filter((p) => (Date.now() - p.plantedAt) / 1000 * TRAY_SPEED.k < 88200);
  }
  // ---- winter, kept in this browser (same rules as 0018_winter.sql, minus the ones only a server can keep) ----
  private wj<T>(k: string, v?: T): T { const key = 'labhangout.local.' + k; return v !== undefined ? db.set(key, v) : db.get(key, null as T); }
  private day(): string { return new Date().toISOString().slice(0, 10); }
  private adventUpto(): number { const d = new Date(); return d.getUTCMonth() === 11 ? Math.min(24, d.getUTCDate()) : d.getUTCMonth() === 0 ? 24 : 1; }
  private caught = new Map<number, number[]>();
  // ---- the photo wall, kept in this browser (every tab shares it); ?admin makes you the owner. Same rules as 0017_photos.sql ----
  private photoRows(v?: (Photo & { status: MyPhoto['status']; featured: boolean; created: number; hearters: string[] })[]) {
    return v ? db.set('labhangout.localPhotos', v) : db.get<(Photo & { status: MyPhoto['status']; featured: boolean; created: number; hearters: string[] })[]>('labhangout.localPhotos', []);
  }
  private pub(p: Photo & { hearters: string[] }): Photo { return { id: p.id, owner: p.owner, ownerName: p.ownerName, png: p.png, at: p.at, hearts: p.hearters.length, mine: p.hearters.includes(this.selfId) }; }
  private pinsToday: number[] = [];
  private localBadges(add?: string): Record<string, string[]> {
    const v = db.get<Record<string, string[]>>('labhangout.localBadges', {});
    if (add) { const mine = v[this.selfId] ?? []; if (!mine.includes(add)) { v[this.selfId] = [...mine, add]; db.set('labhangout.localBadges', v); } }
    return v;
  }
  /** Your token balance, kept in this browser (pass n to set it). The transport reads it too. */
  wallet(n?: number): number { try { if (n !== undefined) localStorage.setItem('labhangout.localTokens', String(n)); return Number(localStorage.getItem('labhangout.localTokens')) || 0; } catch { return 0; } }
  private claimed = new Set<string>();
  // ---- LOCAL flats: a pretend database in localStorage (shared by every tab), with 0014's rules ----
  private flatRows(v?: Record<string, LocalFlat>): Record<string, LocalFlat> {
    return v ? db.set('labhangout.localFlats', v) : db.get('labhangout.localFlats', {});
  }
  private furn(v?: Record<string, number>): Record<string, number> {
    const k = 'labhangout.localFurn.' + this.selfId;
    return v ? db.set(k, v) : db.get(k, {});
  }
  private canEnter(owner: string): boolean {
    if (owner === this.selfId) return true;
    const f = this.flatRows()[owner]; if (!f) return false;
    if (f.door === 'open' || (f.party ?? 0) > Date.now() / 1000 || (f.inv?.[this.selfId] ?? 0) > Date.now()) return true;
    if (f.door === 'friends') { try { const sv = JSON.parse(localStorage.getItem('labhangout.save.' + owner) || '{}'); return Array.isArray(sv.friends) && sv.friends.some((x: unknown) => Array.isArray(x) && x[0] === this.selfId); } catch { return false; } }
    return false;
  }

  /** Your token balance, and picking tokens up. */
  readonly tokens: Api['tokens'] = {
    balance: async () => this.wallet(),
    claimCoin: async (i) => { const k = Math.floor(Date.now() / 300000) + ':' + i; if (this.claimed.has(k)) return null; this.claimed.add(k); return this.wallet(this.wallet() + 1); },
    claimDaily: async () => {
      const day = new Date().toISOString().slice(0, 10);
      try { if (localStorage.getItem('labhangout.localDaily') === day) return null; localStorage.setItem('labhangout.localDaily', day); } catch { return null; }
      return this.wallet(this.wallet() + 5);
    },
  };

  /** Daily quests and badges (0009_quests.sql). */
  readonly quests: Api['quests'] = {
    today: async () => {
      const day = new Date().toISOString().slice(0, 10), seed = Number(day.replace(/-/g, '')), pool = Object.keys(QUESTS);
      const quests: string[] = []; for (let k = 0; quests.length < 3; k++) { const id = pool[Math.floor(h1(seed * 0.001 + k * 7.3) * pool.length)]; if (!quests.includes(id)) quests.push(id); }
      const forced = new URLSearchParams(location.search).get('quests'); // tests: ?quests=kite,boat,feed
      const saved = db.get<{ day: string; done: string[] } | null>('labhangout.localQuests', null), done = saved?.day === day ? saved.done : [];
      return { day, quests: forced ? forced.split(',').filter((q) => QUESTS[q]).slice(0, 3) : quests, done };
    },
    complete: async (q) => {
      const t = await this.quests.today();
      if (!t.quests.includes(q)) throw new Error("that is not one of today's quests");
      if (t.done.includes(q)) throw new Error('already done today');
      const done = [...t.done, q]; db.set('labhangout.localQuests', { day: t.day, done });
      return { tokens: this.wallet(this.wallet() + (done.length >= 3 ? 15 : 5)), bonus: done.length >= 3 };
    },
    claimBadge: async (b) => { const had = (this.localBadges()[this.selfId] ?? []).includes(b); this.localBadges(b); return !had; },
    badgesOf: async (id) => this.localBadges()[id] ?? [],
  };

  /** The seasons (0007_halloween.sql). */
  readonly season: Api['season'] = {
    /** LOCAL: October (or ?season=halloween) is Halloween. */
    current: async () => { const q = new URLSearchParams(location.search).get('season'); const d = new Date(); return q || (d.getUTCMonth() === 9 ? 'halloween' : d.getUTCMonth() === 11 || (d.getUTCMonth() === 0 && d.getUTCDate() <= 6) ? 'winter' : null); },
    trickOrTreat: async (door) => {
      if ((await this.season.current()) !== 'halloween') throw new Error('trick-or-treating starts on 1 October');
      const day = new Date().toISOString().slice(0, 10), key = 'labhangout.localTreats';
      const saved = db.get<{ day: string; doors: number[] } | null>(key, null), st = saved?.day === day ? saved : { day, doors: [] as number[] };
      if (st.doors.includes(door)) throw new Error('you already knocked here today');
      st.doors.push(door); db.set(key, st);
      const trick = Math.random() < 0.2; if (!trick) this.wallet(this.wallet() + 1);
      let prize: string | null = null;
      if (st.doors.length === 8) prize = this.seasonPrize('halloween');
      return { tokens: this.wallet(), trick, visited: st.doors.length, prize };
    },
  };

  /** The Rooftop's community garden (0008_gardens.sql). */
  readonly garden: Api['garden'] = {
    plots: async () => this.beds(),
    plant: async (bed, seed) => {
      const all = this.beds(), s = SEEDS[seed];
      if (!s) throw new Error('no such seed');
      if (all.some((p) => p.owner === this.selfId)) throw new Error('you already have a plant growing');
      if (all.some((p) => p.bed === bed)) throw new Error('that bed is taken');
      if (s.find) { const k = 'seed:' + seed; if (!this.inv().includes(k)) throw new Error('you have no ' + s.name.toLowerCase() + ' seed'); try { localStorage.setItem('labhangout.localInv', JSON.stringify(this.inv().filter((i) => i !== k))); } catch { /* ignore */ } }
      else { if (this.wallet() < s.cost) throw new Error('a ' + s.name + ' seed costs ' + s.cost + ' tokens'); this.wallet(this.wallet() - s.cost); }
      const now = Date.now(), name = (await this.ctx.loadProfile())?.name ?? 'YOU';
      this.beds([...all, { bed, owner: this.selfId, ownerName: name, seed, plantedAt: now, lastWater: now, grown: 0, calcAt: now }]);
      return this.wallet();
    },
    water: async (bed) => {
      const all = this.beds(), p = all.find((q) => q.bed === bed);
      if (!p) throw new Error('nothing growing there');
      if (plantState(p).wet) throw new Error('it is still wet: water it again in a bit');
      const now = Date.now(); p.grown = growth(p, now); p.calcAt = now; p.lastWater = now; this.beds(all);
      const key = bed + ':' + p.plantedAt, thanked = p.owner !== this.selfId && !this.thanked.has(key) && this.thanked.size < 5;
      if (thanked) { this.thanked.add(key); this.wallet(this.wallet() + 1); }
      return { tokens: this.wallet(), thanked };
    },
    rainWater: async () => {
      if (!raining()) return 0;
      const all = this.beds(), now = Date.now(); let n = 0;
      for (const p of all) if ((now - p.lastWater) / 1000 * GARDEN.speed >= 1800) { p.grown = growth(p, now); p.calcAt = now; p.lastWater = now; n++; }
      this.beds(all); return n;
    },
    harvest: async (bed) => {
      const all = this.beds(), p = all.find((q) => q.bed === bed);
      if (!p) throw new Error('nothing growing there');
      if (p.owner !== this.selfId) throw new Error('that is not your plant');
      if (plantState(p).stage < 4) throw new Error('not ripe yet');
      this.beds(all.filter((q) => q !== p)); this.wallet(this.wallet() + SEEDS[p.seed].pays);
      const bonus = Math.random() < 0.1 && !this.inv().includes('seed:4') ? (this.inv('seed:4'), 'seed:4') : null;
      return { tokens: this.wallet(), seed: p.seed, bonus };
    },
    digUp: async (bed) => { const all = this.beds(); if (!all.some((p) => p.bed === bed && p.owner === this.selfId)) throw new Error('that is not your plant'); this.beds(all.filter((p) => p.bed !== bed)); },
  };

  /** The Pier: fishing and the hourly contest (0010_fishing.sql). */
  readonly fishing: Api['fishing'] = {
    catchFish: async () => {
      const { fish, cm } = rollFish(), cl = contestClock(), hour = String(Math.floor(Date.now() / 3600000));
      let rank: number | null = null;
      if (cl.live && fish.rarity !== 'JUNK') {
        const all = this.contests(), list = all[hour] ?? [], name = (await this.ctx.loadProfile())?.name ?? 'YOU';
        list.push({ id: this.selfId, name, fish: fish.name, cm }); all[hour] = list; this.contests(all);
        const mine = Math.max(...list.filter((e) => e.id === this.selfId).map((e) => e.cm));
        rank = 1 + new Set(list.filter((e) => e.id !== this.selfId && e.cm > mine).map((e) => e.id)).size;
      }
      return { fish: fish.name, rarity: fish.rarity, cm, contest: cl.live, rank };
    },
    contestBoard: async () => {
      const all = this.contests(), cl = contestClock(), hour = Math.floor(Date.now() / 3600000);
      const best = (list: { id: string; name: string; fish: string; cm: number }[]) => { const m = new Map<string, { id: string; name: string; fish: string; cm: number }>(); for (const e of list) if (!m.has(e.id) || m.get(e.id)!.cm < e.cm) m.set(e.id, e); return [...m.values()].sort((p, q) => q.cm - p.cm); };
      const top = cl.live ? best(all[hour] ?? []).slice(0, 5).map(({ name, fish, cm }) => ({ name, fish, cm })) : [];
      const past = Object.keys(all).map(Number).filter((h) => h < hour || !cl.live).sort((p, q) => q - p)[0];
      const lb = past !== undefined ? best(all[past] ?? []) : [], w = lb[0];
      const prize = Math.min(25, 5 + 5 * (lb.length - 1));
      return { live: cl.live, top, won: !!w && w.id === this.selfId, last: w ? { name: w.name, fish: w.fish, cm: w.cm, prize, anglers: lb.length, at: past * 3600 } : null };
    },
  };

  /** The Space Station's STAR MELON trays and spacewalk pay (0015_space.sql). */
  readonly space: Api['space'] = {
    trays: async () => this.trayList(),
    plant: async (tray) => {
      const all = this.trayList();
      if (tray < 0 || tray > 5) throw new Error('no such tray');
      const mine = all.find((p) => p.owner === this.selfId); if (mine) throw new Error('you already have a star melon growing (tray ' + (mine.tray + 1) + ')');
      if (all.some((p) => p.tray === tray)) throw new Error('that tray is taken');
      if (this.wallet() < 3) throw new Error('a star melon seed costs 3 tokens');
      this.wallet(this.wallet() - 3);
      this.trayList([...all, { tray, owner: this.selfId, ownerName: (await this.ctx.loadProfile())?.name ?? 'YOU', plantedAt: Date.now() }]);
      return this.wallet();
    },
    harvest: async (tray) => {
      const all = this.trayList(), p = all.find((q) => q.tray === tray);
      if (!p) throw new Error('nothing growing there');
      if (p.owner !== this.selfId) throw new Error('that is not your melon');
      if ((Date.now() - p.plantedAt) / 1000 * TRAY_SPEED.k < 1800) throw new Error('not ripe yet');
      this.trayList(all.filter((q) => q !== p)); this.wallet(this.wallet() + 5);
      const bonus = this.inv().includes('seed:5') ? null : (this.inv('seed:5'), 'seed:5');
      return { tokens: this.wallet(), bonus, rotten: false };
    },
    digUp: async (tray) => { const all = this.trayList(); if (!all.some((p) => p.tray === tray && p.owner === this.selfId)) throw new Error('that is not your melon'); this.trayList(all.filter((p) => p.tray !== tray)); },
    /** Same rules as spacewalk_pay() in 0015_space.sql: 1 per 8 points (max 4), 12 a day, one a minute. */
    spacewalkPay: async (pts) => {
      if (pts <= 0) return { tokens: this.wallet(), paid: 0 };
      return this.payCapped('Walks', Math.min(4, Math.floor(pts / 8)), 12, 60000, 'one spacewalk a minute');
    },
  };

  /** Winter (0018_winter.sql): the present hunt, the advent calendar, the tree, the sleigh, Secret Santa. */
  readonly winter: Api['winter'] = {
    findPresent: async (n) => {
      if ((await this.season.current()) !== 'winter') throw new Error('the presents come out on 1 December');
      if (n < 0 || n > 11) throw new Error('no such present');
      const st = this.wj<{ day: string; n: number[]; prized: boolean }>('presents' + this.selfId) ?? { day: '', n: [], prized: false }, cur = st.day === this.day() ? st : { day: this.day(), n: [], prized: false };
      if (cur.n.includes(n)) throw new Error('you already opened this one today');
      cur.n.push(n); this.wallet(this.wallet() + 1); let prize: string | null = null;
      if (cur.n.length >= 12 && !cur.prized) { cur.prized = true; prize = this.seasonPrize('winter'); }
      this.wj('presents' + this.selfId, cur); return { tokens: this.wallet(), found: cur.n.length, prize };
    },
    presentsToday: async () => { const st = this.wj<{ day: string; n: number[] }>('presents' + this.selfId); return st && st.day === this.day() ? st.n : []; },
    openAdvent: async (door) => {
      if ((await this.season.current()) !== 'winter') throw new Error('the advent calendar opens on 1 December');
      if (door < 1 || door > 24) throw new Error('no such door'); if (door > this.adventUpto()) throw new Error('no peeking! door ' + door + ' opens on ' + door + ' December');
      const opened = this.wj<number[]>('advent' + this.selfId) ?? []; if (opened.includes(door)) throw new Error('you already opened door ' + door);
      this.wj('advent' + this.selfId, [...opened, door]);
      const item = ({ 6: 'hat:17', 12: 'face:8', 18: 'fit:9', 24: 'hat:15' } as Record<number, string>)[door];
      if (item) { if (this.inv().includes(item)) { this.wallet(this.wallet() + 5); return { tokens: this.wallet(), prize: 'tokens:5' }; } this.inv(item); return { tokens: this.wallet(), prize: item }; }
      const pays = 2 + (door % 3); this.wallet(this.wallet() + pays); return { tokens: this.wallet(), prize: 'tokens:' + pays };
    },
    adventDoors: async () => ({ opened: this.wj<number[]>('advent' + this.selfId) ?? [], upto: this.adventUpto() }),
    ornaments: async () => this.wj<Ornament[]>('ornaments.' + (this.server ?? 'none')) ?? [],
    hangOrnament: async (kind, x, y) => {
      if ((await this.season.current()) !== 'winter') throw new Error('the tree goes up on 1 December');
      if (kind < 0 || kind > 7 || y < 12 || y > 160 || Math.abs(x) > 8 + (y * 60) / 160) throw new Error('that is not on the tree');
      const k = 'ornaments.' + (this.server ?? 'none'), all = this.wj<Ornament[]>(k) ?? [], id = Math.max(0, ...all.map((o) => o.id)) + 1;
      this.wj(k, [...all, { id, kind, x: Math.round(x), y: Math.round(y), ownerName: (await this.ctx.loadProfile())?.name ?? 'YOU' }].slice(-240)); return id;
    },
    catchSleigh: async (pass, n) => {
      const t = Date.now() / 1000, cur = Math.floor((t - 900) / 1800);
      if (pass !== cur || t - (cur * 1800 + 900) > 330) throw new Error('too late, it melted');
      const c = this.caught.get(pass) ?? []; if (c.length >= 3) throw new Error('save some for everyone else!'); if (c.includes(n)) throw new Error('you already caught that one');
      this.caught.set(pass, [...c, n]); this.wallet(this.wallet() + 1); return this.wallet();
    },
    sendGift: async (to, tokens, wrap, note) => {
      if (to === this.selfId) throw new Error('you can\'t give yourself a present');
      if (![3, 5, 10].includes(tokens)) throw new Error('that is not a present'); if (this.wallet() < tokens) throw new Error('you need ' + tokens + ' tokens to wrap that');
      const all = this.wj<(TreeGift & { from: string; tokens: number; note: number; opened: boolean })[]>('gifts') ?? [], id = Math.max(0, ...all.map((g) => g.id)) + 1;
      const toName = this.ctx.nameOf(to) ?? 'SOMEONE';
      this.wallet(this.wallet() - tokens); this.wj('gifts', [...all, { id, to, toName, wrap, mine: false, from: (await this.ctx.loadProfile())?.name ?? 'SOMEONE', tokens, note, opened: false }]);
      return this.wallet();
    },
    treeGifts: async () => (this.wj<(TreeGift & { opened: boolean })[]>('gifts') ?? []).filter((g) => !g.opened).map((g) => ({ id: g.id, to: g.to, toName: g.toName, wrap: g.wrap, mine: g.to === this.selfId })),
    openGift: async (id) => {
      const all = this.wj<(TreeGift & { from: string; tokens: number; note: number; opened: boolean })[]>('gifts') ?? [], g = all.find((x) => x.id === id && x.to === this.selfId && !x.opened);
      if (!g) throw new Error('that present is not for you (or it is already open)');
      g.opened = true; this.wj('gifts', all); this.wallet(this.wallet() + g.tokens); return { tokens: this.wallet(), got: g.tokens, from: g.from, note: g.note };
    },
  };

  /** The Lab's PHOTO WALL (0017_photos.sql). */
  readonly photos: Api['photos'] = {
    isAdmin: async () => /[?&]admin\b/.test(location.search),
    pin: async (png) => {
      if (!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(png) || png.length > 90000) throw new Error('that is not a photo strip');
      const all = this.photoRows(), day = 86400000; this.pinsToday = this.pinsToday.filter((t) => Date.now() - t < day);
      if (this.pinsToday.length >= 3) throw new Error('you can pin 3 photos a day. more tomorrow!');
      if (all.filter((p) => p.owner === this.selfId && p.status === 'pending').length >= 3) throw new Error('you have 3 photos waiting to be checked already');
      const id = Math.max(0, ...all.map((p) => p.id)) + 1; this.pinsToday.push(Date.now());
      this.photoRows([...all, { id, owner: this.selfId, ownerName: (await this.ctx.loadProfile())?.name ?? 'YOU', png, at: Date.now() / 1000, hearts: 0, mine: false, status: 'pending', featured: false, created: Date.now(), hearters: [] }]);
      return id;
    },
    wall: async (n, before) => {
      const ok = this.photoRows().filter((p) => p.status === 'approved').sort((a, b) => b.id - a.id), wk = ok.filter((p) => p.hearters.length && Date.now() / 1000 - p.at < 7 * 86400).sort((a, b) => b.hearters.length - a.hearters.length || b.id - a.id)[0];
      return { week: wk ? wk.id : null, photos: ok.filter((p) => before === null || p.id < before).slice(0, Math.min(30, n)).map((p) => this.pub(p)) };
    },
    byId: async (id) => { const p = this.photoRows().find((q) => q.id === id && q.status === 'approved'); return p ? this.pub(p) : null; },
    heart: async (id) => {
      const all = this.photoRows(), p = all.find((q) => q.id === id && q.status === 'approved'); if (!p) throw new Error('no such photo');
      const mine = !p.hearters.includes(this.selfId); p.hearters = mine ? [...p.hearters, this.selfId] : p.hearters.filter((x) => x !== this.selfId); this.photoRows(all);
      return { hearts: p.hearters.length, mine };
    },
    mine: async () => this.photoRows().filter((p) => p.owner === this.selfId).sort((a, b) => b.id - a.id).slice(0, 20).map((p) => ({ id: p.id, status: p.status, featured: p.featured, at: p.at })),
    feature: async (id) => { const all = this.photoRows(); if (!all.some((p) => p.id === id && p.owner === this.selfId && p.status === 'approved')) throw new Error('only your own photos on the wall'); for (const p of all) if (p.owner === this.selfId) p.featured = p.id === id; this.photoRows(all); },
    remove: async (id) => { const all = this.photoRows(), admin = await this.photos.isAdmin(); if (!all.some((p) => p.id === id && (p.owner === this.selfId || admin))) throw new Error('that is not your photo'); this.photoRows(all.filter((p) => p.id !== id)); },
    inFlat: async (owner) => { const p = this.photoRows().filter((q) => q.owner === owner && q.status === 'approved').sort((a, b) => Number(b.featured) - Number(a.featured) || b.id - a.id)[0]; return p ? p.png : null; },
    pending: async () => { if (!(await this.photos.isAdmin())) throw new Error('only the owner can do that'); return this.photoRows().filter((p) => p.status === 'pending').sort((a, b) => a.id - b.id).map((p) => ({ ...this.pub(p), at: p.created / 1000 })); },
    review: async (id, ok) => {
      if (!(await this.photos.isAdmin())) throw new Error('only the owner can do that');
      const all = this.photoRows(), p = all.find((q) => q.id === id); if (!p) throw new Error('no such photo');
      p.status = ok ? 'approved' : 'rejected'; p.at = Date.now() / 1000; if (!ok) p.featured = false; this.photoRows(all);
    },
  };

  /** THE LOFTS: flats, furniture, doors and parties (0014_apartments.sql). */
  readonly flats: Api['flats'] = {
    mine: async () => {
      const all = this.flatRows(); let f = all[this.selfId];
      if (!f) { f = { name: (await this.ctx.loadProfile())?.name ?? 'YOU', layout: {}, door: 'locked', party: null }; all[this.selfId] = f; this.flatRows(all); if (!Object.keys(this.furn()).length) this.furn({ ...STARTER }); }
      return { name: f.name, layout: parseLayout(f.layout), door: parseDoor(f.door), party: f.party ?? null, owned: this.furn(), tokens: this.wallet() };
    },
    get: async (owner) => {
      const f = this.flatRows()[owner]; if (!f) throw new Error('they have not moved in yet');
      if (!this.canEnter(owner)) throw new Error('the door is locked');
      return { name: f.name, layout: parseLayout(f.layout), door: parseDoor(f.door), party: f.party ?? null };
    },
    doors: async (ids) => { const all = this.flatRows(); return ids.filter((id) => all[id]).map((id) => ({ owner: id, name: all[id].name, door: parseDoor(all[id].door), party: all[id].party ?? null, can: this.canEnter(id) })); },
    buy: async (what) => {
      const price = PRICE(what), own = this.furn();
      if (!price) throw new Error('that one is free'); if ((/^(wall|floor)/.test(what)) && own[what]) throw new Error('you already have that');
      if (this.wallet() < price) throw new Error('that costs ' + price + ' tokens');
      this.wallet(this.wallet() - price); own[what] = (own[what] ?? 0) + 1; this.furn(own);
      return { tokens: this.wallet(), n: own[what] };
    },
    save: async (layout) => {
      const own = this.furn(), used: Record<string, number> = {};
      for (const rm of Object.values(layout.rooms)) { if (!rm) continue; for (const k of [rm.w, rm.f]) if (PRICE(k) > 0 && !own[k]) throw new Error('you need to buy ' + k + ' first'); for (const it of rm.items) used[it[0]] = (used[it[0]] ?? 0) + 1; }
      for (const [k, n] of Object.entries(used)) if ((own[k] ?? 0) < n) throw new Error('you only own ' + (own[k] ?? 0) + ' of ' + k);
      const all = this.flatRows(); all[this.selfId] = { ...(all[this.selfId] ?? { name: 'YOU', door: 'locked', party: null }), layout }; this.flatRows(all);
    },
    setDoor: async (door) => { const all = this.flatRows(); if (!all[this.selfId]) throw new Error('move in first'); all[this.selfId].door = door; this.flatRows(all); },
    party: async (on) => { const all = this.flatRows(); if (!all[this.selfId]) throw new Error('move in first'); all[this.selfId].party = on ? Date.now() / 1000 + 1800 : null; this.flatRows(all); return all[this.selfId].party ?? null; },
    letIn: async (who) => { const all = this.flatRows(), f = all[this.selfId]; if (!f) throw new Error('move in first'); f.inv = { ...(f.inv ?? {}), [who]: Date.now() + 1800e3 }; this.flatRows(all); },
  };

  /** The Arcade (0006_arcade.sql). */
  readonly arcade: Api['arcade'] = {
    playClaw: async () => {
      const bal = this.wallet(); if (bal < 3) throw new Error('you need 3 tokens');
      const item = rollClaw(Math.random, await this.season.current()), dupe = this.inv().includes(item);
      this.inv(item);
      return { item, dupe, tokens: this.wallet(bal - 3 + (dupe ? 1 : 0)) };
    },
  };

  /** The Moon, kept in this browser (same rules as moon_assay() in 0019_moon.sql). */
  readonly moon: Api['moon'] = {
    assay: async () => {
      if (Date.now() - (this.lastPay.Moon ?? 0) < 20000) throw new Error('the machine is still warm: one rock every 20 seconds');
      const crystal = Math.random() < 1 / 6, k = 'labhangout.localMoon.' + this.day(), today = Number(db.get(k, 0)) || 0, paid = Math.max(0, Math.min(crystal ? 3 : 1, 15 - today));
      this.lastPay.Moon = Date.now(); db.set(k, today + paid); this.wallet(this.wallet() + paid);
      const n = db.get('labhangout.localCrystals', 0) + (crystal ? 1 : 0); db.set('labhangout.localCrystals', n);
      const prize = crystal && n >= 5 && !this.inv().includes('pet:8') ? (this.inv('pet:8'), 'pet:8') : null;
      return { tokens: this.wallet(), paid, crystal, crystals: n, prize };
    },
    crystals: async () => db.get('labhangout.localCrystals', 0),
  };

  /** Tips paid for a performance (the server caps them). */
  readonly tips: Api['tips'] = {
    /** Same rules as karaoke_tip() in 0016_karaoke.sql: nothing under 40, 1 + score/30 (max 4), 12 a day, one per 30 s. */
    karaoke: async (score) => {
      if (score <= 0) return { tokens: this.wallet(), paid: 0 };
      const sc = Math.min(100, Math.round(score));
      return this.payCapped('Songs', sc < 40 ? 0 : Math.min(4, 1 + Math.floor(sc / 30)), 12, 30000, 'tips come once a song');
    },
    /** Same rules as diner_tip() in 0012_diner.sql: 1 + 1 per 40 points (max 5), 15 a day, one per 150 s. */
    diner: async (score) => {
      if (score <= 0) return { tokens: this.wallet(), paid: 0 };
      return this.payCapped('Tips', Math.min(5, 1 + Math.floor(score / 40)), 15, 150000, 'tips come once a shift');
    },
  };
}
