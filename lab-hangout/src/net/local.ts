// LOCAL mode: no server. Tabs in the same browser find each other over BroadcastChannel,
// so you can build and test multiplayer before Supabase is set up. Presence is emulated
// with a hello/heartbeat/bye protocol.

import type { Look } from '../entities/critter';
import { sanitizeLook } from '../entities/critter';
import type { EmoteKind } from '../entities/avatar';
import type { RoomId } from '../world/room';
import { cleanChat, cleanName, parseCook, parseKart, parseTank, parseJunk, parseKScore, parseSnowball, parseFlatMsg, parseLayout, parseDoor, type DoorMode, type FlatDoor, type FlatInfo, type FlatLayout, type FlatMsg, type MyFlat, parsePong, parseWorld, parseChat, parseDraw, parseEmote, parseMove, parsePeer, parseState, parseNote, parseLobby, type LobbyPerson, type DrawMsg, type MoveMsg, type NetEvent, type PeerState, type StateMsg, type Transport, type Account, type ClawResult, type ContestBoard, type HideSeek, type KartMsg, type TankMsg, type PongMsg, type Plot, type Tray, type KScore, type Photo, type MyPhoto, type SnowballMsg, type Ornament, type TreeGift, type Provider, type ServerInfo } from './transport';
import { CLAW, rollClaw } from '../entities/critter';
import { GARDEN, growth, plantState, SEEDS } from '../world/garden';
import { TRAY_SPEED } from '../world/station';
import { PRICE, STARTER } from '../world/furniture';
import { raining } from '../world/weather';
import { QUESTS } from '../game/quests';
import { rollFish } from '../game/fish';
import { contestClock } from '../world/contest';
import { h1 } from '../engine/math';

type Wire = { srv: string; room: string; kind: 'hello' | 'reply' | 'beat' | 'bye' | 'move' | 'chat' | 'emote' | 'state' | 'draw' | 'note' | 'lobby' | 'census' | 'who' | 'pong' | 'world' | 'cook' | 'kart' | 'tank' | 'flat' | 'junk' | 'kscore' | 'snowball'; p: Record<string, unknown> };
/** LOCAL mode's pretend servers (online, they come from the database). `?cap=N` shrinks them to test FULL. */
const SERVERS = [{ id: 'one', name: 'LAB 1' }, { id: 'two', name: 'LAB 2' }, { id: 'three', name: 'LAB 3' }];

interface LocalFlat { name: string; layout: unknown; door: string; party: number | null; inv?: Record<string, number> }
const PROFILE_KEY = 'hangout.localProfile';
/** LOCAL's pretend database: JSON in localStorage (every tab shares it), quietly ignoring a full or blocked storage. */
const db = {
  get<T>(key: string, fallback: T): T { try { const v = localStorage.getItem(key); return v === null ? fallback : ((JSON.parse(v) as T) ?? fallback); } catch { return fallback; } },
  set<T>(key: string, v: T): T { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* full, or private mode */ } return v; },
};

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
  async inventory(): Promise<string[]> { return this.inv(); }
  /** LOCAL: October (or ?season=halloween) is Halloween. */
  async season(): Promise<string | null> { const q = new URLSearchParams(location.search).get('season'); const d = new Date(); return q || (d.getUTCMonth() === 9 ? 'halloween' : d.getUTCMonth() === 11 || (d.getUTCMonth() === 0 && d.getUTCDate() <= 6) ? 'winter' : null); }
  async trickOrTreat(door: number): Promise<{ tokens: number; trick: boolean; visited: number; prize: string | null }> {
    if ((await this.season()) !== 'halloween') throw new Error('trick-or-treating starts on 1 October');
    const day = new Date().toISOString().slice(0, 10), key = 'labhangout.localTreats';
    const saved = db.get<{ day: string; doors: number[] } | null>(key, null), st = saved?.day === day ? saved : { day, doors: [] as number[] };
    if (st.doors.includes(door)) throw new Error('you already knocked here today');
    st.doors.push(door); db.set(key, st);
    const trick = Math.random() < 0.2; if (!trick) this.wallet(this.wallet() + 1);
    let prize: string | null = null;
    if (st.doors.length === 8) prize = this.seasonPrize('halloween');
    return { tokens: this.wallet(), trick, visited: st.doors.length, prize };
  }
  // ---- the Rooftop garden, kept in this browser per server (same rules as 0008_gardens.sql) ----
  private beds(v?: Plot[]): Plot[] {
    const k = 'labhangout.localPlots.' + (this.server ?? 'none');
    return v ? db.set(k, v) : db.get<Plot[]>(k, []).filter((p) => !plantState(p).dead);
  }
  async plots(): Promise<Plot[]> { return this.beds(); }
  async plant(bed: number, seed: number): Promise<number> {
    const all = this.beds(), s = SEEDS[seed];
    if (!s) throw new Error('no such seed');
    if (all.some((p) => p.owner === this.selfId)) throw new Error('you already have a plant growing');
    if (all.some((p) => p.bed === bed)) throw new Error('that bed is taken');
    if (s.find) { const k = 'seed:' + seed; if (!this.inv().includes(k)) throw new Error('you have no ' + s.name.toLowerCase() + ' seed'); try { localStorage.setItem('labhangout.localInv', JSON.stringify(this.inv().filter((i) => i !== k))); } catch { /* ignore */ } }
    else { if (this.wallet() < s.cost) throw new Error('a ' + s.name + ' seed costs ' + s.cost + ' tokens'); this.wallet(this.wallet() - s.cost); }
    const now = Date.now(), name = (await this.loadProfile())?.name ?? 'YOU';
    this.beds([...all, { bed, owner: this.selfId, ownerName: name, seed, plantedAt: now, lastWater: now, grown: 0, calcAt: now }]);
    return this.wallet();
  }
  private thanked = new Set<string>();
  async water(bed: number): Promise<{ tokens: number; thanked: boolean }> {
    const all = this.beds(), p = all.find((q) => q.bed === bed);
    if (!p) throw new Error('nothing growing there');
    if (plantState(p).wet) throw new Error('it is still wet: water it again in a bit');
    const now = Date.now(); p.grown = growth(p, now); p.calcAt = now; p.lastWater = now; this.beds(all);
    const key = bed + ':' + p.plantedAt, thanked = p.owner !== this.selfId && !this.thanked.has(key) && this.thanked.size < 5;
    if (thanked) { this.thanked.add(key); this.wallet(this.wallet() + 1); }
    return { tokens: this.wallet(), thanked };
  }
  async rainWater(): Promise<number> {
    if (!raining()) return 0;
    const all = this.beds(), now = Date.now(); let n = 0;
    for (const p of all) if ((now - p.lastWater) / 1000 * GARDEN.speed >= 1800) { p.grown = growth(p, now); p.calcAt = now; p.lastWater = now; n++; }
    this.beds(all); return n;
  }
  async harvest(bed: number): Promise<{ tokens: number; seed: number; bonus: string | null }> {
    const all = this.beds(), p = all.find((q) => q.bed === bed);
    if (!p) throw new Error('nothing growing there');
    if (p.owner !== this.selfId) throw new Error('that is not your plant');
    if (plantState(p).stage < 4) throw new Error('not ripe yet');
    this.beds(all.filter((q) => q !== p)); this.wallet(this.wallet() + SEEDS[p.seed].pays);
    const bonus = Math.random() < 0.1 && !this.inv().includes('seed:4') ? (this.inv('seed:4'), 'seed:4') : null;
    return { tokens: this.wallet(), seed: p.seed, bonus };
  }
  async digUp(bed: number): Promise<void> { const all = this.beds(); if (!all.some((p) => p.bed === bed && p.owner === this.selfId)) throw new Error('that is not your plant'); this.beds(all.filter((p) => p.bed !== bed)); }
  // ---- the fishing contest, kept in this browser (other tabs share it) ----
  private contests(v?: Record<string, { id: string; name: string; fish: string; cm: number }[]>): Record<string, { id: string; name: string; fish: string; cm: number }[]> {
    return v ? db.set('labhangout.localContests', v) : db.get('labhangout.localContests', {});
  }
  async catchFish(): Promise<{ fish: string; rarity: string; cm: number; contest: boolean; rank: number | null }> {
    const { fish, cm } = rollFish(), cl = contestClock(), hour = String(Math.floor(Date.now() / 3600000));
    let rank: number | null = null;
    if (cl.live && fish.rarity !== 'JUNK') {
      const all = this.contests(), list = all[hour] ?? [], name = (await this.loadProfile())?.name ?? 'YOU';
      list.push({ id: this.selfId, name, fish: fish.name, cm }); all[hour] = list; this.contests(all);
      const mine = Math.max(...list.filter((e) => e.id === this.selfId).map((e) => e.cm));
      rank = 1 + new Set(list.filter((e) => e.id !== this.selfId && e.cm > mine).map((e) => e.id)).size;
    }
    return { fish: fish.name, rarity: fish.rarity, cm, contest: cl.live, rank };
  }
  // ---- the Space Station's trays + spacewalk pay, kept in this browser per server (same rules as 0015_space.sql) ----
  private trayList(v?: Tray[]): Tray[] {
    const k = 'labhangout.localTrays.' + (this.server ?? 'none');
    return v ? db.set(k, v) : db.get<Tray[]>(k, []).filter((p) => (Date.now() - p.plantedAt) / 1000 * TRAY_SPEED.k < 88200);
  }
  async trays(): Promise<Tray[]> { return this.trayList(); }
  async spacePlant(tray: number): Promise<number> {
    const all = this.trayList();
    if (tray < 0 || tray > 5) throw new Error('no such tray');
    const mine = all.find((p) => p.owner === this.selfId); if (mine) throw new Error('you already have a star melon growing (tray ' + (mine.tray + 1) + ')');
    if (all.some((p) => p.tray === tray)) throw new Error('that tray is taken');
    if (this.wallet() < 3) throw new Error('a star melon seed costs 3 tokens');
    this.wallet(this.wallet() - 3);
    this.trayList([...all, { tray, owner: this.selfId, ownerName: (await this.loadProfile())?.name ?? 'YOU', plantedAt: Date.now() }]);
    return this.wallet();
  }
  async spaceHarvest(tray: number): Promise<{ tokens: number; bonus: string | null; rotten: boolean }> {
    const all = this.trayList(), p = all.find((q) => q.tray === tray);
    if (!p) throw new Error('nothing growing there');
    if (p.owner !== this.selfId) throw new Error('that is not your melon');
    if ((Date.now() - p.plantedAt) / 1000 * TRAY_SPEED.k < 1800) throw new Error('not ripe yet');
    this.trayList(all.filter((q) => q !== p)); this.wallet(this.wallet() + 5);
    const bonus = this.inv().includes('seed:5') ? null : (this.inv('seed:5'), 'seed:5');
    return { tokens: this.wallet(), bonus, rotten: false };
  }
  async spaceDigUp(tray: number): Promise<void> { const all = this.trayList(); if (!all.some((p) => p.tray === tray && p.owner === this.selfId)) throw new Error('that is not your melon'); this.trayList(all.filter((p) => p.tray !== tray)); }
  /** Same rules as spacewalk_pay() in 0015_space.sql: 1 per 8 points (max 4), 12 a day, one a minute. */
  async spacewalkPay(pts: number): Promise<{ tokens: number; paid: number }> {
    if (pts <= 0) return { tokens: this.wallet(), paid: 0 };
    return this.payCapped('Walks', Math.min(4, Math.floor(pts / 8)), 12, 60000, 'one spacewalk a minute');
  }
  // ---- winter, kept in this browser (same rules as 0018_winter.sql, minus the ones only a server can keep) ----
  private wj<T>(k: string, v?: T): T { const key = 'labhangout.local.' + k; return v !== undefined ? db.set(key, v) : db.get(key, null as T); }
  private day(): string { return new Date().toISOString().slice(0, 10); }
  async findPresent(n: number): Promise<{ tokens: number; found: number; prize: string | null }> {
    if ((await this.season()) !== 'winter') throw new Error('the presents come out on 1 December');
    if (n < 0 || n > 11) throw new Error('no such present');
    const st = this.wj<{ day: string; n: number[]; prized: boolean }>('presents' + this.selfId) ?? { day: '', n: [], prized: false }, cur = st.day === this.day() ? st : { day: this.day(), n: [], prized: false };
    if (cur.n.includes(n)) throw new Error('you already opened this one today');
    cur.n.push(n); this.wallet(this.wallet() + 1); let prize: string | null = null;
    if (cur.n.length >= 12 && !cur.prized) { cur.prized = true; prize = this.seasonPrize('winter'); }
    this.wj('presents' + this.selfId, cur); return { tokens: this.wallet(), found: cur.n.length, prize };
  }
  async presentsToday(): Promise<number[]> { const st = this.wj<{ day: string; n: number[] }>('presents' + this.selfId); return st && st.day === this.day() ? st.n : []; }
  private adventUpto(): number { const d = new Date(); return d.getUTCMonth() === 11 ? Math.min(24, d.getUTCDate()) : d.getUTCMonth() === 0 ? 24 : 1; }
  async openAdvent(door: number): Promise<{ tokens: number; prize: string }> {
    if ((await this.season()) !== 'winter') throw new Error('the advent calendar opens on 1 December');
    if (door < 1 || door > 24) throw new Error('no such door'); if (door > this.adventUpto()) throw new Error('no peeking! door ' + door + ' opens on ' + door + ' December');
    const opened = this.wj<number[]>('advent' + this.selfId) ?? []; if (opened.includes(door)) throw new Error('you already opened door ' + door);
    this.wj('advent' + this.selfId, [...opened, door]);
    const item = ({ 6: 'hat:17', 12: 'face:8', 18: 'fit:9', 24: 'hat:15' } as Record<number, string>)[door];
    if (item) { if (this.inv().includes(item)) { this.wallet(this.wallet() + 5); return { tokens: this.wallet(), prize: 'tokens:5' }; } this.inv(item); return { tokens: this.wallet(), prize: item }; }
    const pays = 2 + (door % 3); this.wallet(this.wallet() + pays); return { tokens: this.wallet(), prize: 'tokens:' + pays };
  }
  async adventDoors(): Promise<{ opened: number[]; upto: number }> { return { opened: this.wj<number[]>('advent' + this.selfId) ?? [], upto: this.adventUpto() }; }
  async ornaments(): Promise<Ornament[]> { return this.wj<Ornament[]>('ornaments.' + (this.server ?? 'none')) ?? []; }
  async hangOrnament(kind: number, x: number, y: number): Promise<number> {
    if ((await this.season()) !== 'winter') throw new Error('the tree goes up on 1 December');
    if (kind < 0 || kind > 7 || y < 12 || y > 160 || Math.abs(x) > 8 + (y * 60) / 160) throw new Error('that is not on the tree');
    const k = 'ornaments.' + (this.server ?? 'none'), all = this.wj<Ornament[]>(k) ?? [], id = Math.max(0, ...all.map((o) => o.id)) + 1;
    this.wj(k, [...all, { id, kind, x: Math.round(x), y: Math.round(y), ownerName: (await this.loadProfile())?.name ?? 'YOU' }].slice(-240)); return id;
  }
  private caught = new Map<number, number[]>();
  async catchSleigh(pass: number, n: number): Promise<number> {
    const t = Date.now() / 1000, cur = Math.floor((t - 900) / 1800);
    if (pass !== cur || t - (cur * 1800 + 900) > 330) throw new Error('too late, it melted');
    const c = this.caught.get(pass) ?? []; if (c.length >= 3) throw new Error('save some for everyone else!'); if (c.includes(n)) throw new Error('you already caught that one');
    this.caught.set(pass, [...c, n]); this.wallet(this.wallet() + 1); return this.wallet();
  }
  async sendGift(to: string, tokens: number, wrap: number, note: number): Promise<number> {
    if (to === this.selfId) throw new Error('you can\'t give yourself a present');
    if (![3, 5, 10].includes(tokens)) throw new Error('that is not a present'); if (this.wallet() < tokens) throw new Error('you need ' + tokens + ' tokens to wrap that');
    const all = this.wj<(TreeGift & { from: string; tokens: number; note: number; opened: boolean })[]>('gifts') ?? [], id = Math.max(0, ...all.map((g) => g.id)) + 1;
    const toName = this.lobbySeen.get(to)?.p.name ?? 'SOMEONE';
    this.wallet(this.wallet() - tokens); this.wj('gifts', [...all, { id, to, toName, wrap, mine: false, from: (await this.loadProfile())?.name ?? 'SOMEONE', tokens, note, opened: false }]);
    return this.wallet();
  }
  async treeGifts(): Promise<TreeGift[]> { return (this.wj<(TreeGift & { opened: boolean })[]>('gifts') ?? []).filter((g) => !g.opened).map((g) => ({ id: g.id, to: g.to, toName: g.toName, wrap: g.wrap, mine: g.to === this.selfId })); }
  async openGift(id: number): Promise<{ tokens: number; got: number; from: string; note: number }> {
    const all = this.wj<(TreeGift & { from: string; tokens: number; note: number; opened: boolean })[]>('gifts') ?? [], g = all.find((x) => x.id === id && x.to === this.selfId && !x.opened);
    if (!g) throw new Error('that present is not for you (or it is already open)');
    g.opened = true; this.wj('gifts', all); this.wallet(this.wallet() + g.tokens); return { tokens: this.wallet(), got: g.tokens, from: g.from, note: g.note };
  }
  // ---- the photo wall, kept in this browser (every tab shares it); ?admin makes you the owner. Same rules as 0017_photos.sql ----
  private photoRows(v?: (Photo & { status: MyPhoto['status']; featured: boolean; created: number; hearters: string[] })[]) {
    return v ? db.set('labhangout.localPhotos', v) : db.get<(Photo & { status: MyPhoto['status']; featured: boolean; created: number; hearters: string[] })[]>('labhangout.localPhotos', []);
  }
  private pub(p: Photo & { hearters: string[] }): Photo { return { id: p.id, owner: p.owner, ownerName: p.ownerName, png: p.png, at: p.at, hearts: p.hearters.length, mine: p.hearters.includes(this.selfId) }; }
  async isAdmin(): Promise<boolean> { return /[?&]admin\b/.test(location.search); }
  private pinsToday: number[] = [];
  async pinPhoto(png: string): Promise<number> {
    if (!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(png) || png.length > 90000) throw new Error('that is not a photo strip');
    const all = this.photoRows(), day = 86400000; this.pinsToday = this.pinsToday.filter((t) => Date.now() - t < day);
    if (this.pinsToday.length >= 3) throw new Error('you can pin 3 photos a day. more tomorrow!');
    if (all.filter((p) => p.owner === this.selfId && p.status === 'pending').length >= 3) throw new Error('you have 3 photos waiting to be checked already');
    const id = Math.max(0, ...all.map((p) => p.id)) + 1; this.pinsToday.push(Date.now());
    this.photoRows([...all, { id, owner: this.selfId, ownerName: (await this.loadProfile())?.name ?? 'YOU', png, at: Date.now() / 1000, hearts: 0, mine: false, status: 'pending', featured: false, created: Date.now(), hearters: [] }]);
    return id;
  }
  async wallPhotos(n: number, before: number | null): Promise<{ week: number | null; photos: Photo[] }> {
    const ok = this.photoRows().filter((p) => p.status === 'approved').sort((a, b) => b.id - a.id), wk = ok.filter((p) => p.hearters.length && Date.now() / 1000 - p.at < 7 * 86400).sort((a, b) => b.hearters.length - a.hearters.length || b.id - a.id)[0];
    return { week: wk ? wk.id : null, photos: ok.filter((p) => before === null || p.id < before).slice(0, Math.min(30, n)).map((p) => this.pub(p)) };
  }
  async photoById(id: number): Promise<Photo | null> { const p = this.photoRows().find((q) => q.id === id && q.status === 'approved'); return p ? this.pub(p) : null; }
  async heartPhoto(id: number): Promise<{ hearts: number; mine: boolean }> {
    const all = this.photoRows(), p = all.find((q) => q.id === id && q.status === 'approved'); if (!p) throw new Error('no such photo');
    const mine = !p.hearters.includes(this.selfId); p.hearters = mine ? [...p.hearters, this.selfId] : p.hearters.filter((x) => x !== this.selfId); this.photoRows(all);
    return { hearts: p.hearters.length, mine };
  }
  async myPhotos(): Promise<MyPhoto[]> { return this.photoRows().filter((p) => p.owner === this.selfId).sort((a, b) => b.id - a.id).slice(0, 20).map((p) => ({ id: p.id, status: p.status, featured: p.featured, at: p.at })); }
  async featurePhoto(id: number): Promise<void> { const all = this.photoRows(); if (!all.some((p) => p.id === id && p.owner === this.selfId && p.status === 'approved')) throw new Error('only your own photos on the wall'); for (const p of all) if (p.owner === this.selfId) p.featured = p.id === id; this.photoRows(all); }
  async deletePhoto(id: number): Promise<void> { const all = this.photoRows(), admin = await this.isAdmin(); if (!all.some((p) => p.id === id && (p.owner === this.selfId || admin))) throw new Error('that is not your photo'); this.photoRows(all.filter((p) => p.id !== id)); }
  async flatPhoto(owner: string): Promise<string | null> { const p = this.photoRows().filter((q) => q.owner === owner && q.status === 'approved').sort((a, b) => Number(b.featured) - Number(a.featured) || b.id - a.id)[0]; return p ? p.png : null; }
  async pendingPhotos(): Promise<Photo[]> { if (!(await this.isAdmin())) throw new Error('only the owner can do that'); return this.photoRows().filter((p) => p.status === 'pending').sort((a, b) => a.id - b.id).map((p) => ({ ...this.pub(p), at: p.created / 1000 })); }
  async reviewPhoto(id: number, ok: boolean): Promise<void> {
    if (!(await this.isAdmin())) throw new Error('only the owner can do that');
    const all = this.photoRows(), p = all.find((q) => q.id === id); if (!p) throw new Error('no such photo');
    p.status = ok ? 'approved' : 'rejected'; p.at = Date.now() / 1000; if (!ok) p.featured = false; this.photoRows(all);
  }
  /** Same rules as karaoke_tip() in 0016_karaoke.sql: nothing under 40, 1 + score/30 (max 4), 12 a day, one per 30 s. */
  async karaokeTip(score: number): Promise<{ tokens: number; paid: number }> {
    if (score <= 0) return { tokens: this.wallet(), paid: 0 };
    const sc = Math.min(100, Math.round(score));
    return this.payCapped('Songs', sc < 40 ? 0 : Math.min(4, 1 + Math.floor(sc / 30)), 12, 30000, 'tips come once a song');
  }
  /** Same rules as diner_tip() in 0012_diner.sql: 1 + 1 per 40 points (max 5), 15 a day, one per 150 s. */
  async dinerTip(score: number): Promise<{ tokens: number; paid: number }> {
    if (score <= 0) return { tokens: this.wallet(), paid: 0 };
    return this.payCapped('Tips', Math.min(5, 1 + Math.floor(score / 40)), 15, 150000, 'tips come once a shift');
  }
  async contestBoard(): Promise<ContestBoard> {
    const all = this.contests(), cl = contestClock(), hour = Math.floor(Date.now() / 3600000);
    const best = (list: { id: string; name: string; fish: string; cm: number }[]) => { const m = new Map<string, { id: string; name: string; fish: string; cm: number }>(); for (const e of list) if (!m.has(e.id) || m.get(e.id)!.cm < e.cm) m.set(e.id, e); return [...m.values()].sort((p, q) => q.cm - p.cm); };
    const top = cl.live ? best(all[hour] ?? []).slice(0, 5).map(({ name, fish, cm }) => ({ name, fish, cm })) : [];
    const past = Object.keys(all).map(Number).filter((h) => h < hour || !cl.live).sort((p, q) => q - p)[0];
    const lb = past !== undefined ? best(all[past] ?? []) : [], w = lb[0];
    const prize = Math.min(25, 5 + 5 * (lb.length - 1));
    return { live: cl.live, top, won: !!w && w.id === this.selfId, last: w ? { name: w.name, fish: w.fish, cm: w.cm, prize, anglers: lb.length, at: past * 3600 } : null };
  }
  // ---- daily quests and badges, kept in this browser ----
  async todaysQuests(): Promise<{ day: string; quests: string[]; done: string[] }> {
    const day = new Date().toISOString().slice(0, 10), seed = Number(day.replace(/-/g, '')), pool = Object.keys(QUESTS);
    const quests: string[] = []; for (let k = 0; quests.length < 3; k++) { const id = pool[Math.floor(h1(seed * 0.001 + k * 7.3) * pool.length)]; if (!quests.includes(id)) quests.push(id); }
    const forced = new URLSearchParams(location.search).get('quests'); // tests: ?quests=kite,boat,feed
    const saved = db.get<{ day: string; done: string[] } | null>('labhangout.localQuests', null), done = saved?.day === day ? saved.done : [];
    return { day, quests: forced ? forced.split(',').filter((q) => QUESTS[q]).slice(0, 3) : quests, done };
  }
  async completeQuest(q: string): Promise<{ tokens: number; bonus: boolean }> {
    const t = await this.todaysQuests();
    if (!t.quests.includes(q)) throw new Error("that is not one of today's quests");
    if (t.done.includes(q)) throw new Error('already done today');
    const done = [...t.done, q]; db.set('labhangout.localQuests', { day: t.day, done });
    return { tokens: this.wallet(this.wallet() + (done.length >= 3 ? 15 : 5)), bonus: done.length >= 3 };
  }
  private localBadges(add?: string): Record<string, string[]> {
    const v = db.get<Record<string, string[]>>('labhangout.localBadges', {});
    if (add) { const mine = v[this.selfId] ?? []; if (!mine.includes(add)) { v[this.selfId] = [...mine, add]; db.set('labhangout.localBadges', v); } }
    return v;
  }
  async claimBadge(b: string): Promise<boolean> { const had = (this.localBadges()[this.selfId] ?? []).includes(b); this.localBadges(b); return !had; }
  async badgesOf(id: string): Promise<string[]> { return this.localBadges()[id] ?? []; }
  async playClaw(): Promise<ClawResult> {
    const bal = this.wallet(); if (bal < 3) throw new Error('you need 3 tokens');
    const item = rollClaw(Math.random, await this.season()), dupe = this.inv().includes(item);
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
  sendFlat(f: FlatMsg): void { if (this.bc && this.server) this.bc.postMessage({ srv: this.server, room: 'lobby', kind: 'flat', p: { id: this.selfId, ...f } } satisfies Wire); }
  // ---- LOCAL flats: a pretend database in localStorage (shared by every tab), with 0014's rules ----
  private flats(v?: Record<string, LocalFlat>): Record<string, LocalFlat> {
    return v ? db.set('labhangout.localFlats', v) : db.get('labhangout.localFlats', {});
  }
  private furn(v?: Record<string, number>): Record<string, number> {
    const k = 'labhangout.localFurn.' + this.selfId;
    return v ? db.set(k, v) : db.get(k, {});
  }
  private canEnter(owner: string): boolean {
    if (owner === this.selfId) return true;
    const f = this.flats()[owner]; if (!f) return false;
    if (f.door === 'open' || (f.party ?? 0) > Date.now() / 1000 || (f.inv?.[this.selfId] ?? 0) > Date.now()) return true;
    if (f.door === 'friends') { try { const sv = JSON.parse(localStorage.getItem('labhangout.save.' + owner) || '{}'); return Array.isArray(sv.friends) && sv.friends.some((x: unknown) => Array.isArray(x) && x[0] === this.selfId); } catch { return false; } }
    return false;
  }
  async myFlat(): Promise<MyFlat> {
    const all = this.flats(); let f = all[this.selfId];
    if (!f) { f = { name: (await this.loadProfile())?.name ?? 'YOU', layout: {}, door: 'locked', party: null }; all[this.selfId] = f; this.flats(all); if (!Object.keys(this.furn()).length) this.furn({ ...STARTER }); }
    return { name: f.name, layout: parseLayout(f.layout), door: parseDoor(f.door), party: f.party ?? null, owned: this.furn(), tokens: this.wallet() };
  }
  async getFlat(owner: string): Promise<FlatInfo> {
    const f = this.flats()[owner]; if (!f) throw new Error('they have not moved in yet');
    if (!this.canEnter(owner)) throw new Error('the door is locked');
    return { name: f.name, layout: parseLayout(f.layout), door: parseDoor(f.door), party: f.party ?? null };
  }
  async flatDoors(ids: string[]): Promise<FlatDoor[]> { const all = this.flats(); return ids.filter((id) => all[id]).map((id) => ({ owner: id, name: all[id].name, door: parseDoor(all[id].door), party: all[id].party ?? null, can: this.canEnter(id) })); }
  async buyFurniture(what: string): Promise<{ tokens: number; n: number }> {
    const price = PRICE(what), own = this.furn();
    if (!price) throw new Error('that one is free'); if ((/^(wall|floor)/.test(what)) && own[what]) throw new Error('you already have that');
    if (this.wallet() < price) throw new Error('that costs ' + price + ' tokens');
    this.wallet(this.wallet() - price); own[what] = (own[what] ?? 0) + 1; this.furn(own);
    return { tokens: this.wallet(), n: own[what] };
  }
  async saveFlat(layout: FlatLayout): Promise<void> {
    const own = this.furn(), used: Record<string, number> = {};
    for (const rm of Object.values(layout.rooms)) { if (!rm) continue; for (const k of [rm.w, rm.f]) if (PRICE(k) > 0 && !own[k]) throw new Error('you need to buy ' + k + ' first'); for (const it of rm.items) used[it[0]] = (used[it[0]] ?? 0) + 1; }
    for (const [k, n] of Object.entries(used)) if ((own[k] ?? 0) < n) throw new Error('you only own ' + (own[k] ?? 0) + ' of ' + k);
    const all = this.flats(); all[this.selfId] = { ...(all[this.selfId] ?? { name: 'YOU', door: 'locked', party: null }), layout }; this.flats(all);
  }
  async setDoor(door: DoorMode): Promise<void> { const all = this.flats(); if (!all[this.selfId]) throw new Error('move in first'); all[this.selfId].door = door; this.flats(all); }
  async flatParty(on: boolean): Promise<number | null> { const all = this.flats(); if (!all[this.selfId]) throw new Error('move in first'); all[this.selfId].party = on ? Date.now() / 1000 + 1800 : null; this.flats(all); return all[this.selfId].party ?? null; }
  async letIn(who: string): Promise<void> { const all = this.flats(), f = all[this.selfId]; if (!f) throw new Error('move in first'); f.inv = { ...(f.inv ?? {}), [who]: Date.now() + 1800e3 }; this.flats(all); }
  sendTank(t: TankMsg): void { this.post('tank', { id: this.selfId, ...t }); }
  sendSnowball(b: SnowballMsg): void { this.post('snowball', { id: this.selfId, ...b }); }
  sendKScore(k: KScore): void { this.post('kscore', { id: this.selfId, ...k }); }
  sendJunk(n: number): void { this.post('junk', { id: this.selfId, n }); }
  sendKart(k: KartMsg): void { this.post('kart', { id: this.selfId, ...k }); }
  sendCook(st: number): void { this.post('cook', { id: this.selfId, st }); }
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
    if (w.room === 'lobby' && w.kind === 'flat') { const v = parseFlatMsg(w.p); if (v && v.id !== this.selfId && w.srv === this.server) this.worldOn({ type: 'flat', id: v.id, f: v.f }); return; }
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
      case 'tank': { const v = parseTank(w.p); if (v && this.seen.has(v.id)) this.on({ type: 'tank', id: v.id, t: v.t }); break; }
      case 'snowball': { const v = parseSnowball(w.p); if (v && this.seen.has(v.id)) this.on({ type: 'snowball', id: v.id, b: v.b }); break; }
      case 'kscore': { const v = parseKScore(w.p); if (v && this.seen.has(v.id)) this.on({ type: 'kscore', id: v.id, k: v.k }); break; }
      case 'junk': { const v = parseJunk(w.p); if (v && this.seen.has(v.id)) this.on({ type: 'junk', id: v.id, n: v.n }); break; }
      case 'kart': { const v = parseKart(w.p); if (v && this.seen.has(v.id)) this.on({ type: 'kart', id: v.id, k: v.k }); break; }
      case 'cook': { const v = parseCook(w.p); if (v && this.seen.has(v.id)) this.on({ type: 'cook', id: v.id, st: v.st }); break; }
      case 'pong': { const v = parsePong(w.p); if (v && this.seen.has(v.id)) this.on({ type: 'pong', id: v.id, p: v.p }); break; }
      case 'draw': { const v = parseDraw(w.p); if (v && this.seen.has(v.id)) this.on({ type: 'draw', id: v.id, d: v.d }); break; }
    }
  }
}
