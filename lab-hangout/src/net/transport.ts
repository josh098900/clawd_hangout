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
import { COOKS_MAX, type DinerState } from '../game/diner';
import { SONGS, type KaraokeState } from '../game/karaoke';

export interface PeerState { id: string; name: string; look: Look; x: number; y: number; dir: 1 | -1; moving: boolean }
/**
 * `use` = index into room.spots you're using (-1 = none). `hold` = what's in your hand
 * (0 nothing, 1 mug, 2 popcorn, 3 soda, 4-6 marshmallow raw/toasted/burnt, 7 kite, 8 hot dog, 9-15 the Diner's kitchen:
 * patty raw/cooked/burnt, burger, frozen fries, fries, shake, 16 snowball, 17 hot cocoa). `pose` = 0 normal, 1 dancing, 2 sitting on the floor,
 * 3 ghost, 4 rowing, 5 floating up high (weightless, pushed off the floor).
 */
export interface MoveMsg { x: number; y: number; dir: 1 | -1; moving: boolean; use: number; hold: number; pose: number }
export const SPOTS_MAX = 40, HOLD_MAX = 17, POSE_MAX = 5;

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
/**
 * Room state: small shared values that someone arriving later must also get (the jukebox, high scores, the
 * whiteboard, a party game, the Diner's shift, a kart race, the snowman...). Each has a timestamp and the
 * newest wins; when someone joins, the "host" (lowest id in the room) re-sends everything so they catch up.
 * Each room keeps its own display copy in its onState (LAB_INFO, DEN_INFO, ...). parseState() checks them all.
 */
export type StateVal =
  | { k: 'juke'; v: { n: number; t0: number } } | { k: 'hi'; v: { name: string; score: number } } | { k: 'board'; v: string }
  | { k: 'build'; v: BuildState } | { k: 'deploy'; v: { t0: number; ok: boolean; by: string } } | { k: 'notes'; v: KanbanNote[] }
  | { k: 'game'; v: GameState } | { k: 'slop'; v: { w: number; dead: number[] } } | { k: 'fw'; v: { t0: number; seed: number } }
  | { k: 'crypt'; v: { b: number[]; open: number } }
  | { k: 'claw'; v: { name: string; item: string } } | { k: 'champ'; v: { name: string; wins: number } }
  | { k: 'garden'; v: { n: number } } | { k: 'sand'; v: string }
  | { k: 'diner'; v: DinerState } | { k: 'dinerbest'; v: { name: string; score: number } }
  | { k: 'race'; v: RaceState } | { k: 'kartbest'; v: KartRecord[] }
  | { k: 'flat'; v: { n: number; party: number | null } }
  | { k: 'scope'; v: ScopeState } | { k: 'trays'; v: { n: number } }
  | { k: 'karaoke'; v: KaraokeState }
  | { k: 'snowman'; v: { day: number; rolls: number; deco: number } } | { k: 'snowfight'; v: { t0: number; by: string } };
/**
 * Mission Control's telescope (the Space Station's big screen shows it): where it's pointed on the
 * sky panorama (world/sky.ts), who's at it, and the last thing someone spotted + when (epoch s).
 */
export interface ScopeState { x: number; y: number; by: string; saw: string; at: number }
/** The fastest lap on each circuit (index = track, see game/kart.ts TRACKS), or null. */
export type KartRecord = { name: string; ms: number } | null;
export type StateMsg = StateVal & { ts: number };
/** One whiteboard stroke chunk: colour index (0 = erase) and a polyline as flat [x0,y0,x1,y1,…], or a wipe. */
export interface DrawMsg { c: number; p: number[]; clear: boolean; ts: number }
export const BOARD_W = 188, BOARD_H = 70, BOARD_COLS = 5;
export const NOTES_MAX = 12, NOTE_LEN = 24;

/**
 * What the game hears: people arriving / changing / leaving, connection trouble, and every message in MESSAGES
 * (its type, the sender's id, and the fields its validator returns, e.g. { type: 'move', id, m }).
 */
export type NetEvent =
  | { type: 'join'; peer: PeerState }
  | { type: 'update'; peer: PeerState }
  | { type: 'leave'; id: string }
  | { type: 'status'; text: string }
  | MsgEvent;
/** A message from MESSAGES as the game gets it: e.g. { type: 'move', id, m }. */
export type MsgEvent = { [K in MsgType]: { type: K } & NonNullable<ReturnType<(typeof MESSAGES)[K]['parse']>> }[MsgType];
/** What the game sends with `net.send(type, data)` (the transport adds your id). Moves and chat have their own calls. */
export interface Outgoing {
  emote: { kind: EmoteKind }; state: StateMsg; draw: DrawMsg; note: { i: number; n: number }; pong: PongMsg; cook: { st: number };
  kart: KartMsg; tank: TankMsg; junk: { n: number }; kscore: KScore; snowball: SnowballMsg; flat: FlatMsg; world: HideSeek;
}

/** Flats: whose door is how open, and the layout (all from the database). */
export type DoorMode = 'locked' | 'friends' | 'open';
export type FlatRoomKey = 'liv' | 'bed' | 'kit';
/** A placed piece: [furniture id, centre x, row (-1 wall, 0 back, 1 middle, 2 front), flipped 0/1]. */
export type FlatItem = [string, number, number, number];
export interface FlatRoomLayout { w: string; f: string; items: FlatItem[] }
/** The owner's things on show (the fish tank, the trophy cabinet). */
export interface FlatShow { fish: string[]; badges: string[]; best: Record<string, number> }
export interface FlatLayout { rooms: Partial<Record<FlatRoomKey, FlatRoomLayout>>; show: FlatShow }
export interface FlatInfo { name: string; layout: FlatLayout; door: DoorMode; party: number | null }
export interface MyFlat extends FlatInfo { owned: Record<string, number>; tokens: number }
export interface FlatDoor { owner: string; name: string; door: DoorMode; party: number | null; can: boolean }
/** On the lobby channel: knock on `to`'s door; 'in' / 'no' = their answer; 'party' = a HOUSE PARTY until `until` (epoch s). */
export interface FlatMsg { k: 'knock' | 'in' | 'no' | 'party'; to?: string; nm: string; until?: number }
/** Layouts come from other players' saves: check everything. */
export function parseLayout(v: unknown): FlatLayout {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>, rooms: FlatLayout['rooms'] = {};
  const ro = (o.rooms && typeof o.rooms === 'object' ? o.rooms : {}) as Record<string, unknown>;
  for (const k of ['liv', 'bed', 'kit'] as FlatRoomKey[]) {
    const x = ro[k] as Record<string, unknown> | undefined; if (!x || typeof x !== 'object') continue;
    const w = typeof x.w === 'string' && /^wall[0-9]$/.test(x.w) ? x.w : 'wall0', f = typeof x.f === 'string' && /^floor[0-9]$/.test(x.f) ? x.f : 'floor0';
    const items: FlatItem[] = [];
    if (Array.isArray(x.items)) for (const it of x.items.slice(0, 40)) {
      if (!Array.isArray(it) || typeof it[0] !== 'string' || !/^[a-z0-9]{1,10}$/.test(it[0]) || typeof it[1] !== 'number' || !Number.isFinite(it[1]) || typeof it[2] !== 'number') continue;
      items.push([it[0], Math.max(0, Math.min(1400, Math.round(it[1]))), Math.max(-1, Math.min(2, Math.round(it[2]))), it[3] === 1 ? 1 : 0]);
    }
    rooms[k] = { w, f, items };
  }
  const sh = (o.show && typeof o.show === 'object' ? o.show : {}) as Record<string, unknown>;
  const strs = (a: unknown, n: number, len: number) => (Array.isArray(a) ? a.filter((s): s is string => typeof s === 'string' && s.length <= len).slice(0, n) : []);
  const best: Record<string, number> = {};
  if (sh.best && typeof sh.best === 'object') for (const [k2, v2] of Object.entries(sh.best as Record<string, unknown>).slice(0, 12)) if (/^[a-z0-9]{1,12}$/.test(k2) && typeof v2 === 'number' && Number.isFinite(v2)) best[k2] = v2;
  return { rooms, show: { fish: strs(sh.fish, 30, 24), badges: strs(sh.badges, 40, 12), best } };
}
export const DOORS: DoorMode[] = ['locked', 'friends', 'open'];
export const parseDoor = (v: unknown): DoorMode => (DOORS.includes(v as DoorMode) ? v as DoorMode : 'locked');
export function parseFlatMsg(p: unknown): { id: string; f: FlatMsg } | null {
  const o = obj(p), k = oneOf(o?.k, ['knock', 'in', 'no', 'party'] as const);
  if (!o || !isId(o.id) || !k) return null;
  const f: FlatMsg = { k, nm: cleanName(o.nm) || '?' };
  if (o.to !== undefined) { if (!isId(o.to)) return null; f.to = o.to; }
  if (o.until !== undefined) { const u = num(o.until, 0, 1e11); if (u === null) return null; f.until = u; }
  return { id: o.id, f };
}

/**
 * A kart race at the Kart Track (room state 'race', written by whoever started it): when it goes
 * (t0, wall ms), the seed for the CPU karts, and the racers in grid order with their colours.
 */
export interface RaceState { host: string; t0: number; seed: number; ids: string[]; names: string[]; cols: number[] }
/**
 * Your kart during a race `r` (= that race's t0): position, heading, speed, progress round the
 * track (lap, centreline index, crossed the start yet), finish time (ms after GO, 0 = racing),
 * best lap (ms), boosting / drifting. `j` = 1 asks the race's host to put you on the grid.
 */
export interface KartMsg { r: number; x: number; y: number; a: number; v: number; lap: number; g: number; c: 0 | 1; fin: number; best: number; b: 0 | 1; d: 0 | 1; j?: 1 }
/**
 * TANK DUEL at the Arcade: side s's tank (x, y, heading a), its shells in flight as flat
 * [x, y, vx, vy]..., its score, how many hits it has landed (the other side blows up when this
 * goes up), whether it can't be hit right now (inv), P1's match phase, and (vs the CPU) the CPU's
 * tank and score so the cabinet can show it.
 */
export interface TankMsg { s: 0 | 1; x: number; y: number; a: number; sh: number[]; sc: number; hit: number; inv: 0 | 1; ph?: number; o?: [number, number, number]; osc?: number }
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
/**
 * Who you are: nobody yet (pick guest or log in), a guest (this browser only), or an account. `provider` = the login
 * used this time; `linked` = every login attached to this player (Supabase links logins that share an email).
 */
export interface Account { kind: 'none' | 'guest' | 'account'; provider?: string; linked?: string[] }
/** A world server and how full it is. `friends` = which of the ids you asked about are on it. */
export interface ServerInfo { id: string; name: string; players: number; cap: number; friends: string[] }
/** A garden bed on the Rooftop with something growing in it. Times are ms since 1970, `grown` is seconds of growth credited up to `calcAt` (see world/garden.ts growth()). */
export interface Plot { bed: number; owner: string; ownerName: string; seed: number; plantedAt: number; lastWater: number; grown: number; calcAt: number }
/**
 * Karaoke: a performer's running score for the song that started at `r` (wall ms), on instrument
 * `i` (0 keys, 1 drums, 2 bass, 3 mic): score so far 0..100, current combo, `f` = 1 when it's final.
 */
export interface KScore { r: number; i: number; s: number; c: number; f: 0 | 1 }
/** WINTER: a snowball thrown from (x0, y0) to (x1, y1); `hit` = who it hit ('' = nobody; the thrower decides). */
export interface SnowballMsg { x0: number; y0: number; x1: number; y1: number; hit: string }
/** An ornament on the Square's tree: kind 0..7 at (x across from the trunk, y down from the star). */
export interface Ornament { id: number; kind: number; x: number; y: number; ownerName: string }
/** A Secret Santa present waiting under the tree (who it's for, not who from). */
export interface TreeGift { id: number; to: string; toName: string; wrap: number; mine: boolean }
/** A photo-booth strip on the Lab's photo wall (0017_photos.sql). `png` is a data URL; `at` = epoch s. */
export interface Photo { id: number; owner: string; ownerName: string; png: string; at: number; hearts: number; mine: boolean }
/** Your own pinned photos and how they're getting on. */
export interface MyPhoto { id: number; status: 'pending' | 'approved' | 'rejected'; featured: boolean; at: number }
/** A hydroponic tray on the Space Station with a STAR MELON in it (0015_space.sql). `plantedAt` = ms since 1970. */
export interface Tray { tray: number; owner: string; ownerName: string; plantedAt: number }
/** The Pier's contest scoreboard (see 0010_fishing.sql). */
export interface ContestBoard { live: boolean; top: { name: string; fish: string; cm: number }[]; last: { name: string; fish: string; cm: number; prize: number; anglers: number; at: number } | null; won: boolean }
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
  /** It's raining (world/weather.ts): water every dry plant on every server. Returns how many (0 if the server says it isn't raining). */
  rainWater(): Promise<number>;
  /** Harvest your ripe plant. bonus = 'seed:4' when you found a moonflower seed. */
  harvest(bed: number): Promise<{ tokens: number; seed: number; bonus: string | null }>;
  digUp(bed: number): Promise<void>;
  /** Reel one in: the server picks the fish and its size (and enters it in a live contest). */
  catchFish(): Promise<{ fish: string; rarity: string; cm: number; contest: boolean; rank: number | null }>;
  contestBoard(): Promise<ContestBoard>;
  /** The Space Station's hydroponic trays on your server (only the ones with a melon in). */
  trays(): Promise<Tray[]>;
  /** Plant a STAR MELON (3 tokens). Resolves with your balance. */
  spacePlant(tray: number): Promise<number>;
  /** Harvest your ripe melon: +5 and (unless you have one) a comet bloom seed; rotten = it went off. */
  spaceHarvest(tray: number): Promise<{ tokens: number; bonus: string | null; rotten: boolean }>;
  spaceDigUp(tray: number): Promise<void>;
  /** Stardust brought in from a spacewalk: 1 token per 8 points (the server caps it). */
  spacewalkPay(pts: number): Promise<{ tokens: number; paid: number }>;
  /** WINTER (0018_winter.sql). The present hunt: open present n (0..11) once a day. */
  findPresent(n: number): Promise<{ tokens: number; found: number; prize: string | null }>;
  presentsToday(): Promise<number[]>;
  /** The advent calendar: open door 1..24 (from its date). prize = 'tokens:N' or an item. */
  openAdvent(door: number): Promise<{ tokens: number; prize: string }>;
  adventDoors(): Promise<{ opened: number[]; upto: number }>;
  /** The Square's tree on your server this winter, and hanging an ornament on it. */
  ornaments(): Promise<Ornament[]>;
  hangOrnament(kind: number, x: number, y: number): Promise<number>;
  /** Catch present n from Santa's sleigh pass `pass`. Resolves with your balance. */
  catchSleigh(pass: number, n: number): Promise<number>;
  /** Secret Santa: wrap tokens (3/5/10) for someone; what's under the tree; open one of yours. */
  sendGift(to: string, tokens: number, wrap: number, note: number): Promise<number>;
  treeGifts(): Promise<TreeGift[]>;
  openGift(id: number): Promise<{ tokens: number; got: number; from: string; note: number }>;
  /** THE PHOTO WALL. Is this player an owner (can moderate)? */
  isAdmin(): Promise<boolean>;
  /** Pin a strip (a PNG data URL) for review; resolves with its id. */
  pinPhoto(png: string): Promise<number>;
  /** Approved photos, newest first (older than `before`), and which is the photo of the week. */
  wallPhotos(n: number, before: number | null): Promise<{ week: number | null; photos: Photo[] }>;
  photoById(id: number): Promise<Photo | null>;
  heartPhoto(id: number): Promise<{ hearts: number; mine: boolean }>;
  myPhotos(): Promise<MyPhoto[]>;
  featurePhoto(id: number): Promise<void>;
  deletePhoto(id: number): Promise<void>;
  /** The photo in someone's flat PHOTO FRAME (a data URL), or null. */
  flatPhoto(owner: string): Promise<string | null>;
  /** Owner only: the queue, and approving / rejecting (also takes approved ones down). */
  pendingPhotos(): Promise<Photo[]>;
  reviewPhoto(id: number, ok: boolean): Promise<void>;
  /** Karaoke: tips for a song you performed (score 0..100 incl. the hype bonus; capped by the server). */
  karaokeTip(score: number): Promise<{ tokens: number; paid: number }>;
  /** The Diner: tips for a finished shift (the server caps them). Returns { tokens: balance, paid }. */
  dinerTip(score: number): Promise<{ tokens: number; paid: number }>;
  /** Today's 3 quests (the same for everyone) and which you've handed in. */
  todaysQuests(): Promise<{ day: string; quests: string[]; done: string[] }>;
  /** Hand in a quest (5 tokens; +10 with the third). */
  completeQuest(q: string): Promise<{ tokens: number; bonus: boolean }>;
  /** Claim a badge you've earned (true = new). */
  claimBadge(b: string): Promise<boolean>;
  /** Someone's badges (anyone's, for their player card). */
  badgesOf(id: string): Promise<string[]>;
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
  /** `inst` = whose flat, for the flat rooms (their channels are per owner: hangout:<server>:flat.<owner>). */
  joinRoom(room: RoomId, me: PeerState, on: (e: NetEvent) => void, inst?: string): Promise<void>;
  leaveRoom(): Promise<void>;
  /** Re-announce name/look (after editing your look). */
  updateMe(me: PeerState): void;
  sendMove(m: MoveMsg): void;
  /** Say something. Resolves with the text as the server cleaned it (null if nothing was sent); rejects with a message (e.g. 'slow down a little'). */
  sendChat(text: string): Promise<string | null>;
  /** Broadcast a message: to this room, or (the lobby ones in MESSAGES) to everyone on this server. */
  send<K extends keyof Outgoing>(type: K, data: Outgoing[K]): void;
  // ---- flats (supabase/migrations/0014_apartments.sql) ----
  /** Your flat (made with a starter kit the first time) and the furniture you own. */
  myFlat(): Promise<MyFlat>;
  /** Someone's flat, if you may go in (throws "the door is locked" if not). */
  getFlat(owner: string): Promise<FlatInfo>;
  /** Door status for these players (the lobby directory). */
  flatDoors(ids: string[]): Promise<FlatDoor[]>;
  buyFurniture(what: string): Promise<{ tokens: number; n: number }>;
  saveFlat(layout: FlatLayout): Promise<void>;
  setDoor(door: DoorMode): Promise<void>;
  /** Start (true) or stop a HOUSE PARTY; returns when it ends (epoch s) or null. */
  flatParty(on: boolean): Promise<number | null>;
  /** Let someone who knocked in (30 minutes). */
  letIn(who: string): Promise<void>;
  /** Where server-wide messages (the lobby ones in MESSAGES: hide and seek, flat knocks) arrive. */
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
// The kit every validator below is built from. Anything that isn't exactly right is dropped (null).
/** The payload as an object to read fields from (null if it isn't one). */
const obj = (p: unknown): Record<string, unknown> | null => (p && typeof p === 'object' ? (p as Record<string, unknown>) : null);
/** A finite number, clamped into lo..hi (null if it isn't a number). */
const num = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);
/** A whole number in lo..hi (null if not). */
const int = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null);
/** A list of at most `max` whole numbers, each in lo..hi (null if not). */
const ints = (v: unknown, max: number, lo: number, hi: number): number[] | null => (Array.isArray(v) && v.length <= max && v.every((x) => Number.isInteger(x) && x >= lo && x <= hi) ? (v as number[]) : null);
/** v, if it's one of `opts`. */
const oneOf = <T extends string>(v: unknown, opts: readonly T[]): T | null => (opts.includes(v as T) ? (v as T) : null);
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64 && /^[\w-]+$/.test(v);
/** Players' names from a payload, cleaned (an empty one becomes `blank`). */
const names = (v: unknown[], blank = '?'): string[] => v.map((x) => cleanName(x) || blank);

export function parseMove(p: unknown): { id: string; m: MoveMsg } | null {
  const o = obj(p);
  if (!o || !isId(o.id)) return null;
  const x = num(o.x, 0, 4000), y = num(o.y, 0, 4000);
  if (x === null || y === null) return null;
  return { id: o.id, m: { x, y, dir: o.dir === -1 ? -1 : 1, moving: o.moving === true, use: int(o.use, 0, SPOTS_MAX - 1) ?? -1, hold: int(o.hold, 0, HOLD_MAX) ?? 0, pose: int(o.pose, 0, POSE_MAX) ?? 0 } };
}
export function parsePeer(p: unknown): PeerState | null {
  const o = obj(p);
  if (!o || !isId(o.id)) return null;
  const mv = parseMove(o);
  const name = cleanName(o.name) || 'GUEST';
  return { id: o.id, name, look: sanitizeLook(o.look), x: mv?.m.x ?? 0, y: mv?.m.y ?? 0, dir: mv?.m.dir ?? 1, moving: false };
}
export function parseChat(p: unknown): { id: string; text: string } | null {
  const o = obj(p);
  if (!o || !isId(o.id)) return null;
  const text = cleanChat(o.text);
  return text ? { id: o.id, text } : null;
}
export function parseEmote(p: unknown): { id: string; kind: EmoteKind } | null {
  const o = obj(p);
  if (!o || !isId(o.id) || !isEmote(o.kind)) return null;
  return { id: o.id, kind: o.kind };
}
/** Each kind of room state's own check (the compiler makes sure every kind in StateVal has one). */
const STATE: { [K in StateVal['k']]: (v: unknown) => Extract<StateVal, { k: K }>['v'] | null } = {
  juke: (x) => { const v = obj(x); if (!v) return null; const n = int(v.n, -1, 15), t0 = num(v.t0, 0, 1e11); return n === null || t0 === null ? null : { n, t0 }; },
  hi: (x) => { const v = obj(x); if (!v) return null; const score = int(v.score, 0, 999999), name = cleanName(v.name); return score === null || !name ? null : { name, score }; },
  build: (x) => {
    const v = obj(x); if (!v) return null;
    const n = int(v.n, 0, 1e6), dep = int(v.dep, 0, 1e6);
    return typeof v.ok !== 'boolean' || n === null || dep === null ? null : { ok: v.ok, n, dep, by: cleanName(v.by), id: isId(v.id) ? v.id : '', msg: cleanChat(v.msg).slice(0, 40) };
  },
  deploy: (x) => { const v = obj(x); if (!v) return null; const t0 = num(v.t0, 0, 1e11); return t0 === null || typeof v.ok !== 'boolean' ? null : { t0, ok: v.ok, by: cleanName(v.by) }; },
  notes: (x) => {
    if (!Array.isArray(x) || x.length > NOTES_MAX) return null;
    const notes: KanbanNote[] = [];
    for (const q of x) { const o = obj(q), t = cleanChat(o?.t).slice(0, NOTE_LEN), c = int(o?.c, 0, 2); if (!t || c === null) return null; notes.push({ t, c }); }
    return notes;
  },
  game: (x) => { const v = obj(x); return v && parseGame(v); },
  slop: (x) => { const v = obj(x); if (!v) return null; const w = int(v.w, 0, Infinity), dead = ints(v.dead, 64, 0, 63); return w === null || !dead ? null : { w, dead }; },
  fw: (x) => { const v = obj(x); if (!v) return null; const t0 = num(v.t0, 0, 1e11), seed = num(v.seed, 0, 1e6); return t0 === null || seed === null ? null : { t0, seed }; },
  crypt: (x) => {
    const v = obj(x); if (!v) return null;
    const b = v.b, open = num(v.open, 0, 1e11);
    return !Array.isArray(b) || b.length !== 4 || !b.every((q) => typeof q === 'number' && Number.isFinite(q) && q >= 0 && q <= 4000) || open === null ? null : { b: b as number[], open };
  },
  sand: (x) => (typeof x === 'string' && /^[0-4]{320}$/.test(x) ? x : null),
  garden: (x) => { const v = obj(x); if (!v) return null; const n = num(v.n, 0, 1e13); return n === null ? null : { n }; },
  claw: (x) => {
    const v = obj(x); if (!v) return null;
    const name = cleanName(v.name), item = typeof v.item === 'string' && /^[a-z]{2,8}:[0-9]{1,3}$/.test(v.item) ? v.item : '';
    return name && item ? { name, item } : null;
  },
  champ: (x) => { const v = obj(x); if (!v) return null; const name = cleanName(v.name), wins = int(v.wins, 1, 9999); return name && wins !== null ? { name, wins } : null; },
  diner: (x) => { const v = obj(x); return v && parseDiner(v); },
  flat: (x) => {
    const v = obj(x); if (!v) return null;
    const n = num(v.n, 0, 1e13), party = v.party === null ? null : num(v.party, 0, 1e11);
    return n === null || (v.party !== null && party === null) ? null : { n, party };
  },
  scope: (x) => {
    const v = obj(x); if (!v) return null;
    const px = num(v.x, 0, 1e4), py = num(v.y, 0, 1e4), at = num(v.at, 0, 1e11), saw = typeof v.saw === 'string' && /^[A-Z0-9 ?!]{0,24}$/.test(v.saw) ? v.saw : null;
    return px === null || py === null || at === null || saw === null ? null : { x: px, y: py, by: cleanName(v.by), saw, at };
  },
  karaoke: (x) => { const v = obj(x); if (!v) return null; const song = int(v.song, -1, SONGS.length - 1), t0 = num(v.t0, 0, 1e14); return song === null || t0 === null ? null : { song, t0, by: cleanName(v.by) }; },
  snowman: (x) => {
    const v = obj(x); if (!v) return null;
    const day = num(v.day, 0, 1e6), rolls = num(v.rolls, 0, 30), deco = num(v.deco, 0, 31);
    return day === null || rolls === null || deco === null ? null : { day: Math.floor(day), rolls: Math.floor(rolls), deco: Math.floor(deco) };
  },
  snowfight: (x) => { const v = obj(x); if (!v) return null; const t0 = num(v.t0, 0, 1e14); return t0 === null ? null : { t0, by: cleanName(v.by) }; },
  trays: (x) => { const v = obj(x); if (!v) return null; const n = num(v.n, 0, 1e13); return n === null ? null : { n }; },
  race: (x) => { const v = obj(x); return v && parseRace(v); },
  kartbest: (x) => {
    if (!Array.isArray(x) || x.length > 8) return null;
    const recs: KartRecord[] = [];
    for (const q of x) { if (q === null) { recs.push(null); continue; } const o = obj(q), name = cleanName(o?.name), ms = num(o?.ms, 1000, 1e6); if (!name || ms === null) return null; recs.push({ name, ms }); }
    return recs;
  },
  dinerbest: (x) => { const v = obj(x); if (!v) return null; const name = cleanName(v.name), score = int(v.score, 0, 99999); return name && score !== null ? { name, score } : null; },
  board: (x) => (typeof x === 'string' && x.length <= 20000 && /^[A-Za-z0-9+/=]*$/.test(x) ? x : null),
};
export function parseState(p: unknown): { id: string; s: StateMsg } | null {
  const o = obj(p);
  if (!o || !isId(o.id) || typeof o.ts !== 'number' || !Number.isFinite(o.ts) || typeof o.k !== 'string' || !Object.hasOwn(STATE, o.k)) return null;
  const k = o.k as StateVal['k'], v = STATE[k](o.v);
  return v === null ? null : { id: o.id, s: { k, v, ts: o.ts } as StateMsg };
}
export function parseDraw(p: unknown): { id: string; d: DrawMsg } | null {
  const o = obj(p);
  if (!o || !isId(o.id) || typeof o.ts !== 'number' || !Number.isFinite(o.ts)) return null;
  if (o.clear === true) return { id: o.id, d: { c: 0, p: [], clear: true, ts: o.ts } };
  const c = int(o.c, 0, BOARD_COLS - 1), pts = o.p;
  if (c === null || !Array.isArray(pts) || pts.length < 2 || pts.length > 256 || pts.length % 2) return null;
  for (let i = 0; i < pts.length; i++) if (int(pts[i], 0, (i % 2 ? BOARD_H : BOARD_W) - 1) === null) return null;
  return { id: o.id, d: { c, p: pts as number[], clear: false, ts: o.ts } };
}
function parseGame(v: Record<string, unknown>): GameState | null {
  const kind = oneOf(v.kind, ['chairs', 'tag', 'off'] as const), phase = oneOf(v.phase, ['ready', 'music', 'grab', 'out', 'play', 'over'] as const);
  if (!kind || !phase || !isId(v.host)) return null;
  const ids = v.ids, nm = v.names;
  if (!Array.isArray(ids) || !Array.isArray(nm) || ids.length > GAME_MAX || ids.length !== nm.length || !ids.every(isId)) return null;
  const n = ids.length;
  const t0 = num(v.t0, 0, 1e11), dur = num(v.dur, 0, 600), since = num(v.since, 0, 1e11), round = int(v.round, 0, 100);
  const alive = ints(v.alive, n, 0, n - 1), seats = ints(v.seats, 32, 0, 31), out = ints(v.out, n, 0, n - 1), it = int(v.it, -1, n - 1), last = int(v.last, -1, n - 1);
  const times = Array.isArray(v.times) && v.times.length <= n && v.times.every((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x < 1e4) ? (v.times as number[]) : null;
  if (t0 === null || dur === null || since === null || round === null || !alive || !seats || !out || it === null || last === null || !times) return null;
  return { kind, host: v.host, phase, t0, dur, round, ids, names: names(nm), alive, seats, out, it, last, since, times };
}
function parseDiner(v: Record<string, unknown>): DinerState | null {
  if (!isId(v.host)) return null;
  const ids = v.ids, nm = v.names, n = Array.isArray(ids) ? ids.length : -1;
  if (!Array.isArray(ids) || n < 1 || n > COOKS_MAX || !ids.every(isId) || !Array.isArray(nm) || nm.length !== n || !Array.isArray(v.hands) || v.hands.length !== n) return null;
  const hands = ints(v.hands, n, 0, HOLD_MAX); if (!hands) return null;
  const times = (x: unknown, len: number) => (Array.isArray(x) && x.length === len && x.every((t) => typeof t === 'number' && Number.isFinite(t) && t >= 0 && t < 1e13) ? (x as number[]) : null);
  const t0 = num(v.t0, 0, 1e13), shake = num(v.shake, 0, 1e13), seed = int(v.seed, 0, 1e6), lvl = int(v.lvl, 1, 4), pts = int(v.pts, 0, 99999), done = int(v.done, 0, 99);
  const grill = times(v.grill, 2), fry = times(v.fry, 2), served = ints(v.served, 32, 0, 7);
  if (t0 === null || shake === null || seed === null || lvl === null || pts === null || done === null || !grill || !fry || !served) return null;
  return { host: v.host, t0, seed, lvl, ids, names: names(nm), hands, grill, fry, shake, served, pts, done };
}
export function parseKart(p: unknown): { id: string; k: KartMsg } | null {
  const o = obj(p);
  if (!o || !isId(o.id)) return null;
  const r = num(o.r, 0, 1e13), x = num(o.x, -50, 1200), y = num(o.y, -50, 900), a = num(o.a, -100, 100), v = num(o.v, -100, 400), fin = num(o.fin, 0, 1e6), best = num(o.best, 0, 1e6);
  const lap = int(o.lap, 0, 9), g = int(o.g, 0, 4999);
  if (r === null || x === null || y === null || a === null || v === null || fin === null || best === null || lap === null || g === null) return null;
  return { id: o.id, k: { r, x, y, a, v, lap, g, c: o.c === 1 ? 1 : 0, fin, best, b: o.b === 1 ? 1 : 0, d: o.d === 1 ? 1 : 0, ...(o.j === 1 ? { j: 1 as const } : {}) } };
}
function parseRace(v: Record<string, unknown>): RaceState | null {
  const ids = v.ids, nm = v.names, cols = v.cols, t0 = num(v.t0, 0, 1e13), seed = int(v.seed, 0, 1e6);
  if (!isId(v.host) || t0 === null || seed === null) return null;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 4 || !ids.every(isId) || !Array.isArray(nm) || nm.length !== ids.length || !Array.isArray(cols) || cols.length !== ids.length || !ints(cols, 4, 0, 63)) return null;
  return { host: v.host, t0, seed, ids, names: names(nm), cols: cols as number[] };
}
export function parseKScore(p: unknown): { id: string; k: KScore } | null {
  const o = obj(p);
  if (!o || !isId(o.id)) return null;
  const r = num(o.r, 0, 1e14), i = int(o.i, 0, 3), s = num(o.s, 0, 110), c = num(o.c, 0, 9999);
  if (r === null || s === null || c === null || i === null) return null;
  return { id: o.id, k: { r, i, s: Math.round(s), c: Math.round(c), f: o.f === 1 ? 1 : 0 } };
}
export function parseSnowball(p: unknown): { id: string; b: SnowballMsg } | null {
  const o = obj(p);
  if (!o || !isId(o.id)) return null;
  const x0 = num(o.x0, 0, 4000), y0 = num(o.y0, 0, 4000), x1 = num(o.x1, 0, 4000), y1 = num(o.y1, 0, 4000);
  if (x0 === null || y0 === null || x1 === null || y1 === null || Math.hypot(x1 - x0, y1 - y0) > 320) return null;
  return { id: o.id, b: { x0, y0, x1, y1, hit: isId(o.hit) ? o.hit : '' } };
}
export function parseJunk(p: unknown): { id: string; n: number } | null {
  const o = obj(p), n = int(o?.n, 0, 1e10 - 1);
  return o && isId(o.id) && n !== null ? { id: o.id, n } : null;
}
export function parseTank(p: unknown): { id: string; t: TankMsg } | null {
  const o = obj(p);
  if (!o || !isId(o.id) || (o.s !== 0 && o.s !== 1)) return null;
  const x = num(o.x, 0, 160), y = num(o.y, 0, 100), a = num(o.a, -1000, 1000), fin = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1000;
  const sc = int(o.sc, 0, 99), hit = int(o.hit, 0, 999);
  if (x === null || y === null || a === null || sc === null || hit === null || !Array.isArray(o.sh) || o.sh.length > 8 || o.sh.length % 4 || !o.sh.every(fin)) return null;
  const t: TankMsg = { s: o.s, x, y, a, sh: o.sh as number[], sc, hit, inv: o.inv === 1 ? 1 : 0 };
  if (o.ph !== undefined) { const ph = int(o.ph, 0, 3); if (ph === null) return null; t.ph = ph; }
  if (o.o !== undefined) { if (!Array.isArray(o.o) || o.o.length !== 3 || !o.o.every(fin)) return null; t.o = [o.o[0], o.o[1], o.o[2]]; const osc = int(o.osc, 0, 99); if (osc !== null) t.osc = osc; }
  return { id: o.id, t };
}
export function parseCook(p: unknown): { id: string; st: number } | null {
  const o = obj(p), st = int(o?.st, 0, 7);
  return o && isId(o.id) && st !== null ? { id: o.id, st } : null;
}
export function parseNote(p: unknown): { id: string; i: number; n: number } | null {
  const o = obj(p);
  if (!o || !isId(o.id)) return null;
  const i = int(o.i, 0, 3), n = int(o.n, 0, 7);
  return i === null || n === null ? null : { id: o.id, i, n };
}
const unit = (v: unknown, lo = -0.2, hi = 1.2): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
export function parsePong(p: unknown): { id: string; p: PongMsg } | null {
  const o = obj(p);
  if (!o || !isId(o.id) || (o.s !== 0 && o.s !== 1) || !unit(o.p, 0, 1)) return null;
  const m: PongMsg = { s: o.s, p: o.p };
  if (o.b !== undefined) { const b = o.b; if (!Array.isArray(b) || b.length !== 4 || !unit(b[0]) || !unit(b[1]) || !unit(b[2], -5, 5) || !unit(b[3], -5, 5)) return null; m.b = [b[0], b[1], b[2], b[3]]; }
  if (o.sc !== undefined) { const c = ints(o.sc, 2, 0, 9); if (!c || c.length !== 2) return null; m.sc = [c[0], c[1]]; }
  if (o.ph !== undefined) { const ph = int(o.ph, 0, 3); if (ph === null) return null; m.ph = ph; }
  return { id: o.id, p: m };
}
export function parseWorld(p: unknown): { id: string; w: HideSeek } | null {
  const o = obj(p), phase = oneOf(o?.phase, ['hide', 'seek', 'over'] as const);
  if (!o || !isId(o.id) || !isId(o.seeker) || !phase) return null;
  const t0 = num(o.t0, 0, 1e11), ts = num(o.ts, 0, 1e13);
  if (t0 === null || ts === null || !Array.isArray(o.ids) || !Array.isArray(o.names) || !Array.isArray(o.found)) return null;
  if (o.ids.length > HS_MAX || o.ids.length !== o.names.length || !o.ids.every(isId)) return null;
  const found = ints(o.found, Infinity, 0, o.ids.length - 1);
  if (!found) return null;
  return { id: o.id, w: { seeker: o.seeker, phase, t0, ts, ids: o.ids, names: names(o.names, 'GUEST'), found: [...new Set(found)] } };
}
export function parseLobby(p: unknown): LobbyPerson | null {
  const o = obj(p), room = oneOf(o?.room, ROOM_IDS);
  if (!o || !isId(o.id) || !room) return null;
  return { id: o.id, name: cleanName(o.name) || 'GUEST', room };
}

// ---------- messages ----------
/**
 * Every broadcast message, in one table: its validator, and the channel it travels on.
 *   room:  the room's channel (players send and receive)
 *   srv:   the room's server channel (only the database sends there, so the sender id is real: chat)
 *   lobby: the server's lobby channel (everyone online on this server, whatever room)
 * Both transports subscribe, check and deliver from this table. Adding a message: a validator that returns
 * { id, ...fields } (those fields are what the game gets in its NetEvent), a line here, and what the game
 * sends in Outgoing. The wire format of each message is `{ id, ...data }` under its type's name.
 *   emote   { kind }                     a wave, a hop... (EmoteKind)
 *   state   StateMsg                     a room value (newest ts wins; see StateVal)
 *   draw    DrawMsg                      a whiteboard stroke, ~12/s while drawing
 *   note    { i, n }                     a note on a Stage instrument (i 0..3, pad n 0..7)
 *   pong    PongMsg                      Pong at the Arcade, only during a match
 *   cook    { st }                       the Diner: "I pressed E at kitchen station st" (the shift's host applies it)
 *   kart    KartMsg                      your kart, ~12/s while racing (see ui/race.ts)
 *   tank    TankMsg                      TANK DUEL, ~15/s per side during a match (see ui/tanks.ts)
 *   junk    { n }                        the spacewalk: you grabbed floating thing n, so it goes for everyone
 *   kscore  KScore                       karaoke: your running score, ~1/s while you perform and once at the end
 *   snowball SnowballMsg                 winter: a snowball you threw (you decide what it hit)
 *   world   HideSeek                     hide and seek, to the whole server
 *   flat    FlatMsg                      a knock, an answer, a HOUSE PARTY, to the whole server
 */
export const MESSAGES = {
  move: { parse: parseMove, on: 'room' },
  chat: { parse: parseChat, on: 'srv' },
  emote: { parse: parseEmote, on: 'room' },
  state: { parse: parseState, on: 'room' },
  draw: { parse: parseDraw, on: 'room' },
  note: { parse: parseNote, on: 'room' },
  pong: { parse: parsePong, on: 'room' },
  cook: { parse: parseCook, on: 'room' },
  kart: { parse: parseKart, on: 'room' },
  tank: { parse: parseTank, on: 'room' },
  junk: { parse: parseJunk, on: 'room' },
  kscore: { parse: parseKScore, on: 'room' },
  snowball: { parse: parseSnowball, on: 'room' },
  world: { parse: parseWorld, on: 'lobby' },
  flat: { parse: parseFlatMsg, on: 'lobby' },
} as const satisfies Record<string, { parse: (p: unknown) => { id: string } | null; on: 'room' | 'srv' | 'lobby' }>;
export type MsgType = keyof typeof MESSAGES;
export const MSG_TYPES = Object.keys(MESSAGES) as MsgType[];
/** A message type named by someone else's payload (checked, since it could say anything, even 'toString'). */
export const isMsgType = (v: unknown): v is MsgType => typeof v === 'string' && Object.hasOwn(MESSAGES, v);
/** Check a message of this type from the wire; the NetEvent to deliver, or null. */
export const readMsg = (type: MsgType, payload: unknown): MsgEvent | null => { const v = MESSAGES[type].parse(payload); return v ? ({ type, ...v } as MsgEvent) : null; };
