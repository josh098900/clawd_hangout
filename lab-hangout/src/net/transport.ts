// The network contract. Both transports (Supabase Realtime, and a same-browser
// BroadcastChannel for offline dev) speak exactly these shapes.
//
// Every inbound payload is UNTRUSTED: it came from another person's browser. Always run it
// through the validators below before it touches game state, and only ever render text with
// textContent / the pixel font (never innerHTML).

import { sanitizeLook, type Look } from '../entities/critter';
import { isEmote, type EmoteKind } from '../entities/avatar';
import { ROOM_IDS, type RoomId } from '../world/room';
import { scrub } from './filter';

export interface PeerState { id: string; name: string; look: Look; x: number; y: number; dir: 1 | -1; moving: boolean }
/**
 * `use` = index into room.spots you're using (-1 = none). `hold` = what's in your hand
 * (0 nothing, 1 mug, 2 popcorn, 3 soda, 4-6 marshmallow raw/toasted/burnt). `pose` = 0 normal, 1 dancing, 2 sitting on the floor.
 */
export interface MoveMsg { x: number; y: number; dir: 1 | -1; moving: boolean; use: number; hold: number; pose: number }
export const SPOTS_MAX = 40, HOLD_MAX = 6, POSE_MAX = 3;

/**
 * Room state: small shared values that someone arriving later must also get. Each has a
 * timestamp; the newest wins. When a peer joins, the "host" (lowest id in the room) re-sends
 * everything it has, so the newcomer catches up.
 *   juke  = { n: track (-1 off), t0: wall-clock start (s) }   (the Lab's jukebox)
 *   hi    = { name, score }                                  (the arcade's high score)
 *   board = base64 of the Lab whiteboard's pixels            (see game/board.ts)
 *   build / deploy / notes = the Dev Den's build light, last deploy, and kanban board
 */
export type StateKey = StateVal['k'];
/** The Dev Den's build: passing?, commit + deploy counts, and the last commit (who + message). */
export interface BuildState { ok: boolean; n: number; dep: number; by: string; id: string; msg: string }
export interface KanbanNote { t: string; c: number }
/**
 * A party game, run by its `host` (whoever started it); everyone else just follows the state.
 * One flat shape for every game so validation stays simple. Indexes point into ids/names.
 *   chairs: phase ready → music → grab → out → … → over. `alive`, the `seats` open this round, who went `out`.
 *   tag:    phase play → over. `it` is chasing; `last` was just tagged (no tag-backs); `times` = seconds spent as it.
 */
export interface GameState {
  kind: 'chairs' | 'tag' | 'off'; host: string; phase: 'ready' | 'music' | 'grab' | 'out' | 'play' | 'over';
  t0: number; dur: number; round: number; ids: string[]; names: string[];
  alive: number[]; seats: number[]; out: number[]; it: number; last: number; since: number; times: number[];
}
export const GAME_MAX = 24;
export type StateVal =
  | { k: 'juke'; v: { n: number; t0: number } } | { k: 'hi'; v: { name: string; score: number } } | { k: 'board'; v: string }
  | { k: 'build'; v: BuildState } | { k: 'deploy'; v: { t0: number; ok: boolean; by: string } } | { k: 'notes'; v: KanbanNote[] }
  | { k: 'game'; v: GameState } | { k: 'slop'; v: { w: number; dead: number[] } } | { k: 'fw'; v: { t0: number; seed: number } }
  | { k: 'crypt'; v: { b: number[]; open: number } }
  | { k: 'claw'; v: { name: string; item: string } } | { k: 'champ'; v: { name: string; wins: number } }
  | { k: 'garden'; v: { n: number } };
export type StateMsg = StateVal & { ts: number };
/** One whiteboard stroke chunk: colour index (0 = erase) and a polyline as flat [x0,y0,x1,y1,…], or a wipe. */
export interface DrawMsg { c: number; p: number[]; clear: boolean; ts: number }
export const BOARD_W = 188, BOARD_H = 70, BOARD_COLS = 5;
export const NOTES_MAX = 12, NOTE_LEN = 24;

export type NetEvent =
  | { type: 'join'; peer: PeerState }
  | { type: 'update'; peer: PeerState }
  | { type: 'leave'; id: string }
  | { type: 'move'; id: string; m: MoveMsg }
  | { type: 'chat'; id: string; text: string }
  | { type: 'emote'; id: string; kind: EmoteKind }
  | { type: 'state'; id: string; s: StateMsg }
  | { type: 'draw'; id: string; d: DrawMsg }
  | { type: 'note'; id: string; i: number; n: number }
  | { type: 'pong'; id: string; p: PongMsg }
  | { type: 'world'; id: string; w: HideSeek }
  | { type: 'status'; text: string };

/**
 * Pong at the Arcade, sent only during a match. Each side sends its paddle (0..1); the left
 * player runs the ball and also sends it (x, y, vx, vy in court units 0..1 per second), the
 * score and the phase (0 waiting, 1 countdown, 2 play, 3 over).
 */
export interface PongMsg { s: 0 | 1; p: number; b?: [number, number, number, number]; sc?: [number, number]; ph?: number }
/**
 * Hide-and-seek across every room of a server, on the server's lobby channel. The seeker's
 * browser runs the round: hide (30 s, seeker counts in the Lab) -> seek (3 min) -> over.
 * `found` = indexes into ids/names. Newest `ts` wins; the seeker re-sends every few seconds.
 */
export interface HideSeek { seeker: string; phase: 'hide' | 'seek' | 'over'; t0: number; ids: string[]; names: string[]; found: number[]; ts: number }
export const HS_MAX = 24;

/** Someone online anywhere, and which room they're in (the lobby channel, separate from rooms). */
export interface LobbyPerson { id: string; name: string; room: RoomId }

export type Provider = 'discord' | 'google';
export const PROVIDERS: Provider[] = ['discord', 'google'];
/** Who you are: nobody yet (pick guest or log in), a guest (this browser only), or an account. */
export interface Account { kind: 'none' | 'guest' | 'account'; provider?: string }
/** A world server and how full it is. `friends` = which of the ids you asked about are on it. */
export interface ServerInfo { id: string; name: string; players: number; cap: number; friends: string[] }
/** A garden bed on the Rooftop with something growing in it. Times are ms since 1970, `grown` is seconds of growth credited up to `calcAt` (see world/garden.ts growth()). */
export interface Plot { bed: number; owner: string; ownerName: string; seed: number; plantedAt: number; lastWater: number; grown: number; calcAt: number }
/** What the claw machine gave you: the prize, whether you had it already (1 token back), your balance. */
export interface ClawResult { item: string; dupe: boolean; tokens: number }

export interface Transport {
  readonly mode: 'supabase' | 'local';
  readonly selfId: string;
  /** Resume an existing session (after a login redirect too). 'none' = nobody signed in yet. */
  connect(): Promise<Account>;
  account(): Account;
  /** An error the login provider sent back in the URL (e.g. identity_already_exists), once. */
  takeAuthError(): { code: string; message: string } | null;
  /** Play as a guest. `captcha` is asked for a token (Turnstile) first when it's set up. */
  signInGuest(captcha?: () => Promise<string | undefined>): Promise<void>;
  /** Log in with Discord/Google. Online this leaves the page and comes back signed in. */
  loginWith(p: Provider): Promise<void>;
  /** Guest -> account, keeping everything (same player id). Also leaves the page. */
  linkWith(p: Provider): Promise<void>;
  logout(): Promise<void>;
  /** Guest progress into an existing account: a ticket as the guest, redeemed as the account. */
  startMerge(): Promise<string>;
  finishMerge(ticket: string): Promise<{ tokens: number; save: unknown }>;
  loadSave(): Promise<unknown>;
  storeSave(d: object): Promise<void>;
  /** Prizes you own (server-owned; see game/save.ts). */
  inventory(): Promise<string[]>;
  /** The season the server says it is ('halloween', 'winter' or null). */
  season(): Promise<string | null>;
  /** Knock on trick-or-treat door 0..7 (once each per day; the server pays). prize = costume for all 8 today. */
  trickOrTreat(door: number): Promise<{ tokens: number; trick: boolean; visited: number; prize: string | null }>;
  /** The Rooftop garden beds on your server (only the ones with something in them). */
  plots(): Promise<Plot[]>;
  /** Plant seed `seed` in bed `bed` (tokens, or a found moonflower seed). Resolves with your balance. */
  plant(bed: number, seed: number): Promise<number>;
  /** Water a plant (anyone's). thanked = +1 token for watering someone else's. */
  water(bed: number): Promise<{ tokens: number; thanked: boolean }>;
  /** Harvest your ripe plant. bonus = 'seed:4' when you found a moonflower seed. */
  harvest(bed: number): Promise<{ tokens: number; seed: number; bonus: string | null }>;
  digUp(bed: number): Promise<void>;
  /** Spend tokens on the claw machine; the server picks the prize. */
  playClaw(): Promise<ClawResult>;
  /** The world servers. `friendIds` = starred players to look for. */
  servers(friendIds: string[]): Promise<ServerInfo[]>;
  /** Take a seat on a server (rejects with 'that server is full'). Rooms and the lobby are per server. */
  claimSeat(id: string): Promise<void>;
  readonly server: string | null;
  /** Called if our seat lapsed (e.g. the laptop slept) and the server filled up meanwhile. */
  onSeatLost(fn: () => void): void;
  leaveSeat(): void;
  /** Invite-only world: true if this player still has to enter the invite code. */
  needsInvite(): Promise<boolean>;
  /** Try an invite code. Resolves true if you're in; rejects with a readable message on errors. */
  joinWorld(code: string): Promise<boolean>;
  /** Report a player to the moderators. */
  report(id: string, reason: string): Promise<void>;
  /** Server-owned tokens: your balance, picking up a Square coin, the daily bonus (null = nothing new). */
  tokens(): Promise<number>;
  claimCoin(i: number): Promise<number | null>;
  claimDaily(): Promise<number | null>;
  loadProfile(): Promise<{ name: string; look: Look } | null>;
  saveProfile(name: string, look: Look): Promise<void>;
  joinRoom(room: RoomId, me: PeerState, on: (e: NetEvent) => void): Promise<void>;
  leaveRoom(): Promise<void>;
  /** Re-announce name/look (after editing your look). */
  updateMe(me: PeerState): void;
  sendMove(m: MoveMsg): void;
  /** Say something. Resolves with the text as the server cleaned it (null if nothing was sent); rejects with a message (e.g. 'slow down a little'). */
  sendChat(text: string): Promise<string | null>;
  sendEmote(kind: EmoteKind): void;
  sendState(s: StateMsg): void;
  sendDraw(d: DrawMsg): void;
  /** One note on a Stage instrument (i = instrument 0..3, n = pad 0..7). */
  sendNote(i: number, n: number): void;
  sendPong(p: PongMsg): void;
  /** Hide-and-seek state to everyone on this server (whatever room they're in). */
  sendWorld(w: HideSeek): void;
  /** Where server-wide messages (hide-and-seek) arrive. */
  watchWorld(on: (e: NetEvent) => void): void;
  /** Announce yourself (name + current room) to everyone online, in any room. */
  setLobby(name: string, room: RoomId): void;
  /** Drop off the who's-online list (going idle). setLobby() puts you back. */
  leaveLobby(): void;
  /** Called with the full list of people online elsewhere whenever it changes. */
  watchLobby(on: (people: LobbyPerson[]) => void): void;
}

// ---------- validation ----------
export const NAME_MAX = 16, CHAT_MAX = 80;
// eslint-disable-next-line no-control-regex
const CTRL = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g;

export function cleanName(v: unknown): string {
  if (typeof v !== 'string') return '';
  return scrub(v.replace(CTRL, '').replace(/\s+/g, ' ').trim()).slice(0, NAME_MAX);
}
export function cleanChat(v: unknown): string {
  if (typeof v !== 'string') return '';
  return scrub(v.replace(CTRL, '').replace(/\s+/g, ' ').trim()).slice(0, CHAT_MAX);
}
const num = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64 && /^[\w-]+$/.test(v);

export function parseMove(p: unknown): { id: string; m: MoveMsg } | null {
  const o = p as Record<string, unknown> | null;
  if (!o || !isId(o.id)) return null;
  const x = num(o.x, 0, 4000), y = num(o.y, 0, 4000);
  if (x === null || y === null) return null;
  const use = typeof o.use === 'number' && Number.isInteger(o.use) && o.use >= 0 && o.use < SPOTS_MAX ? o.use : -1;
  const int = (v: unknown, max: number) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : 0);
  return { id: o.id, m: { x, y, dir: o.dir === -1 ? -1 : 1, moving: o.moving === true, use, hold: int(o.hold, HOLD_MAX), pose: int(o.pose, POSE_MAX) } };
}
export function parsePeer(p: unknown): PeerState | null {
  const o = p as Record<string, unknown> | null;
  if (!o || !isId(o.id)) return null;
  const mv = parseMove(o);
  const name = cleanName(o.name) || 'GUEST';
  return { id: o.id, name, look: sanitizeLook(o.look), x: mv?.m.x ?? 0, y: mv?.m.y ?? 0, dir: mv?.m.dir ?? 1, moving: false };
}
export function parseChat(p: unknown): { id: string; text: string } | null {
  const o = p as Record<string, unknown> | null;
  if (!o || !isId(o.id)) return null;
  const text = cleanChat(o.text);
  return text ? { id: o.id, text } : null;
}
export function parseEmote(p: unknown): { id: string; kind: EmoteKind } | null {
  const o = p as Record<string, unknown> | null;
  if (!o || !isId(o.id) || !isEmote(o.kind)) return null;
  return { id: o.id, kind: o.kind };
}
export function parseState(p: unknown): { id: string; s: StateMsg } | null {
  const o = p as Record<string, unknown> | null;
  if (!o || !isId(o.id) || typeof o.ts !== 'number' || !Number.isFinite(o.ts)) return null;
  const v = o.v as Record<string, unknown> | null, ts = o.ts;
  if (o.k === 'juke' && v && typeof v === 'object') {
    const n = v.n, t0 = num(v.t0, 0, 1e11);
    if (typeof n !== 'number' || !Number.isInteger(n) || n < -1 || n > 15 || t0 === null) return null;
    return { id: o.id, s: { k: 'juke', v: { n, t0 }, ts } };
  }
  if (o.k === 'hi' && v && typeof v === 'object') {
    const score = v.score, name = cleanName(v.name);
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 999999 || !name) return null;
    return { id: o.id, s: { k: 'hi', v: { name, score }, ts } };
  }
  if (o.k === 'build' && v && typeof v === 'object') {
    const int = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 1e6 ? x : null);
    const n = int(v.n), dep = int(v.dep);
    if (typeof v.ok !== 'boolean' || n === null || dep === null) return null;
    return { id: o.id, s: { k: 'build', v: { ok: v.ok, n, dep, by: cleanName(v.by), id: isId(v.id) ? v.id : '', msg: cleanChat(v.msg).slice(0, 40) }, ts } };
  }
  if (o.k === 'deploy' && v && typeof v === 'object') {
    const t0 = num(v.t0, 0, 1e11);
    if (t0 === null || typeof v.ok !== 'boolean') return null;
    return { id: o.id, s: { k: 'deploy', v: { t0, ok: v.ok, by: cleanName(v.by) }, ts } };
  }
  if (o.k === 'notes' && Array.isArray(o.v) && o.v.length <= NOTES_MAX) {
    const notes: KanbanNote[] = [];
    for (const x of o.v as unknown[]) {
      const q = x as Record<string, unknown> | null, t = cleanChat(q?.t).slice(0, NOTE_LEN), c = q?.c;
      if (!t || typeof c !== 'number' || !Number.isInteger(c) || c < 0 || c > 2) return null;
      notes.push({ t, c });
    }
    return { id: o.id, s: { k: 'notes', v: notes, ts } };
  }
  if (o.k === 'game' && v && typeof v === 'object') { const g = parseGame(v); return g ? { id: o.id, s: { k: 'game', v: g, ts } } : null; }
  if (o.k === 'slop' && v && typeof v === 'object') {
    const w = v.w, dead = v.dead;
    if (typeof w !== 'number' || !Number.isInteger(w) || w < 0 || !Array.isArray(dead) || dead.length > 64 || !dead.every((i) => Number.isInteger(i) && i >= 0 && i < 64)) return null;
    return { id: o.id, s: { k: 'slop', v: { w, dead: dead as number[] }, ts } };
  }
  if (o.k === 'fw' && v && typeof v === 'object') {
    const t0 = num(v.t0, 0, 1e11), seed = num(v.seed, 0, 1e6);
    return t0 === null || seed === null ? null : { id: o.id, s: { k: 'fw', v: { t0, seed }, ts } };
  }
  if (o.k === 'crypt' && v && typeof v === 'object') {
    const b = v.b, open = num(v.open, 0, 1e11);
    if (!Array.isArray(b) || b.length !== 4 || !b.every((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 4000) || open === null) return null;
    return { id: o.id, s: { k: 'crypt', v: { b: b as number[], open }, ts } };
  }
  if (o.k === 'garden' && v && typeof v === 'object') { const n = num(v.n, 0, 1e13); return n === null ? null : { id: o.id, s: { k: 'garden', v: { n }, ts } }; }
  if (o.k === 'claw' && v && typeof v === 'object') {
    const name = cleanName(v.name), item = typeof v.item === 'string' && /^[a-z]{2,8}:[0-9]{1,3}$/.test(v.item) ? v.item : '';
    return name && item ? { id: o.id, s: { k: 'claw', v: { name, item }, ts } } : null;
  }
  if (o.k === 'champ' && v && typeof v === 'object') {
    const name = cleanName(v.name), wins = v.wins;
    return name && typeof wins === 'number' && Number.isInteger(wins) && wins >= 1 && wins <= 9999 ? { id: o.id, s: { k: 'champ', v: { name, wins }, ts } } : null;
  }
  if (o.k === 'board' && typeof o.v === 'string' && o.v.length <= 20000 && /^[A-Za-z0-9+/=]*$/.test(o.v)) return { id: o.id, s: { k: 'board', v: o.v, ts } };
  return null;
}
export function parseDraw(p: unknown): { id: string; d: DrawMsg } | null {
  const o = p as Record<string, unknown> | null;
  if (!o || !isId(o.id) || typeof o.ts !== 'number' || !Number.isFinite(o.ts)) return null;
  if (o.clear === true) return { id: o.id, d: { c: 0, p: [], clear: true, ts: o.ts } };
  const c = o.c, pts = o.p;
  if (typeof c !== 'number' || !Number.isInteger(c) || c < 0 || c >= BOARD_COLS || !Array.isArray(pts) || pts.length < 2 || pts.length > 256 || pts.length % 2) return null;
  for (let i = 0; i < pts.length; i++) { const v = pts[i]; if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v >= (i % 2 ? BOARD_H : BOARD_W)) return null; }
  return { id: o.id, d: { c, p: pts as number[], clear: false, ts: o.ts } };
}
function parseGame(v: Record<string, unknown>): GameState | null {
  const kinds = ['chairs', 'tag', 'off'], phases = ['ready', 'music', 'grab', 'out', 'play', 'over'];
  if (!kinds.includes(v.kind as string) || !phases.includes(v.phase as string) || !isId(v.host)) return null;
  const ids = v.ids, names = v.names;
  if (!Array.isArray(ids) || !Array.isArray(names) || ids.length > GAME_MAX || ids.length !== names.length || !ids.every(isId)) return null;
  const n = ids.length, idx = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= -1 && x < n ? x : null);
  const list = (x: unknown, max: number, lim: number) => (Array.isArray(x) && x.length <= max && x.every((i) => Number.isInteger(i) && i >= 0 && i < lim) ? (x as number[]) : null);
  const t0 = num(v.t0, 0, 1e11), dur = num(v.dur, 0, 600), since = num(v.since, 0, 1e11), round = typeof v.round === 'number' && Number.isInteger(v.round) && v.round >= 0 && v.round <= 100 ? v.round : null;
  const alive = list(v.alive, n, n), seats = list(v.seats, 32, 32), out = list(v.out, n, n), it = idx(v.it), last = idx(v.last);
  const times = Array.isArray(v.times) && v.times.length <= n && v.times.every((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x < 1e4) ? (v.times as number[]) : null;
  if (t0 === null || dur === null || since === null || round === null || !alive || !seats || !out || it === null || last === null || !times) return null;
  return { kind: v.kind as GameState['kind'], host: v.host as string, phase: v.phase as GameState['phase'], t0, dur, round, ids: ids as string[], names: names.map((x) => cleanName(x) || '?'), alive, seats, out, it, last, since, times };
}
export function parseNote(p: unknown): { id: string; i: number; n: number } | null {
  const o = p as Record<string, unknown> | null;
  if (!o || !isId(o.id)) return null;
  const i = o.i, n = o.n;
  if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i > 3 || typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 7) return null;
  return { id: o.id, i, n };
}
const unit = (v: unknown, lo = -0.2, hi = 1.2): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
export function parsePong(p: unknown): { id: string; p: PongMsg } | null {
  const o = p as Record<string, unknown> | null;
  if (!o || !isId(o.id) || (o.s !== 0 && o.s !== 1) || !unit(o.p, 0, 1)) return null;
  const m: PongMsg = { s: o.s, p: o.p };
  if (o.b !== undefined) { const b = o.b; if (!Array.isArray(b) || b.length !== 4 || !unit(b[0]) || !unit(b[1]) || !unit(b[2], -5, 5) || !unit(b[3], -5, 5)) return null; m.b = [b[0], b[1], b[2], b[3]]; }
  if (o.sc !== undefined) { const c = o.sc; if (!Array.isArray(c) || c.length !== 2 || !c.every((x) => Number.isInteger(x) && x >= 0 && x <= 9)) return null; m.sc = [c[0], c[1]]; }
  if (o.ph !== undefined) { if (!Number.isInteger(o.ph) || (o.ph as number) < 0 || (o.ph as number) > 3) return null; m.ph = o.ph as number; }
  return { id: o.id, p: m };
}
export function parseWorld(p: unknown): { id: string; w: HideSeek } | null {
  const o = p as Record<string, unknown> | null;
  if (!o || !isId(o.id) || !isId(o.seeker) || !['hide', 'seek', 'over'].includes(o.phase as string)) return null;
  const t0 = num(o.t0, 0, 1e11), ts = num(o.ts, 0, 1e13);
  if (t0 === null || ts === null || !Array.isArray(o.ids) || !Array.isArray(o.names) || !Array.isArray(o.found)) return null;
  if (o.ids.length > HS_MAX || o.ids.length !== o.names.length || !o.ids.every(isId)) return null;
  const n = o.ids.length;
  if (!o.found.every((i) => Number.isInteger(i) && i >= 0 && i < n)) return null;
  return { id: o.id, w: { seeker: o.seeker, phase: o.phase as HideSeek['phase'], t0, ts, ids: o.ids as string[], names: (o.names as unknown[]).map((x) => cleanName(x) || 'GUEST'), found: [...new Set(o.found as number[])] } };
}
export function parseLobby(p: unknown): LobbyPerson | null {
  const o = p as Record<string, unknown> | null;
  if (!o || !isId(o.id) || typeof o.room !== 'string' || !(ROOM_IDS as string[]).includes(o.room)) return null;
  return { id: o.id, name: cleanName(o.name) || 'GUEST', room: o.room as RoomId };
}
