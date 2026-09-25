// Avatar = one player in the room (you or a remote). Holds network-facing state plus the
// animation state that turns it into a Pose each frame (walk cycle, settle, emotes).

import { basePose, stampCritter, type Look, type Pose } from './critter';
import type { SpotKind } from '../world/room';
import { BODY, CONFETTI, K, type RGB } from '../engine/palette';

const OUTLINE = K.OUTLINE;
import { alpha, oval, lit, r, line, txt, txtOutlined, tw, twinkle, Gd, G, puff, star4, M, PX } from '../engine/pixel';
import { bump, eOB, h1, seg, lerp } from '../engine/math';
import { drawUmbrella, wind } from '../world/weather';
import { crewPose } from '../game/dance';

export type EmoteKind = 'wave' | 'hop' | 'joy' | 'huh' | 'idea' | 'sip' | 'eat' | 'feed' | 'laugh' | 'cry' | 'love' | 'angry' | 'sleep' | 'cool' | 'clap' | 'wow';
/** Every emote that can go over the network. Ones with a `key` also get a button in the emote bar. */
export const ALL_EMOTES: { kind: EmoteKind; key: string; label: string; dur: number }[] = [
  { kind: 'wave', key: '1', label: 'WAVE', dur: 1.8 },
  { kind: 'hop', key: '2', label: 'HOP', dur: 0.85 },
  { kind: 'joy', key: '3', label: 'YAY', dur: 1.6 },
  { kind: 'huh', key: '4', label: 'HUH?', dur: 1.8 },
  { kind: 'idea', key: '5', label: 'IDEA', dur: 1.6 },
  { kind: 'sip', key: '', label: 'SIP', dur: 1.3 }, // mug or soda in hand (Q / the SIP button)
  { kind: 'eat', key: '', label: 'EAT', dur: 1.1 }, // popcorn in hand
  { kind: 'feed', key: '', label: 'FEED', dur: 1.2 }, // throw crumbs to the pigeons
  // the emote wheel (R)
  { kind: 'laugh', key: '', label: 'LAUGH', dur: 2 }, { kind: 'cry', key: '', label: 'CRY', dur: 2.4 }, { kind: 'love', key: '', label: 'LOVE', dur: 2.2 }, { kind: 'angry', key: '', label: 'ANGRY', dur: 2 },
  { kind: 'sleep', key: '', label: 'SLEEP', dur: 3 }, { kind: 'cool', key: '', label: 'COOL', dur: 2.2 }, { kind: 'clap', key: '', label: 'CLAP', dur: 1.8 }, { kind: 'wow', key: '', label: 'WOW', dur: 1.8 },
];
export const WHEEL: EmoteKind[] = ['laugh', 'love', 'clap', 'wow', 'cool', 'sleep', 'cry', 'angry'];
export const EMOTES = ALL_EMOTES.filter((e) => e.key);
export const emoteDur = (k: EmoteKind): number => ALL_EMOTES.find((e) => e.kind === k)?.dur ?? 2;
export const isEmote = (k: unknown): k is EmoteKind => typeof k === 'string' && ALL_EMOTES.some((e) => e.kind === k);
/** Held items (MoveMsg.hold). How many sips/bites each lasts, and the emote that uses it. */
export const HOLD_NONE = 0, HOLD_MUG = 1, HOLD_POPCORN = 2, HOLD_SODA = 3, HOLD_MARSH = 4, HOLD_TOAST = 5, HOLD_BURNT = 6, HOLD_KITE = 7, HOLD_HOTDOG = 8;
/** The Diner's kitchen (game/diner.ts): what a cook carries between stations. */
export const HOLD_PATTY = 9, HOLD_COOKED = 10, HOLD_CHAR = 11, HOLD_BURGER = 12, HOLD_FROZEN = 13, HOLD_FRIES = 14, HOLD_SHAKE = 15;
export const isKitchen = (hold: number): boolean => hold >= HOLD_PATTY && hold <= HOLD_SHAKE;
export const USES: Record<number, number> = { 1: 5, 2: 8, 3: 6, 4: 1, 5: 1, 6: 1, 8: 4 };
export const useEmote = (hold: number): EmoteKind => (hold === HOLD_SODA || hold === HOLD_MUG ? 'sip' : 'eat');
/** Floor poses (MoveMsg.pose). They last until you move. */
export const POSE_NONE = 0, POSE_DANCE = 1, POSE_FLOOR = 2, /** tricked on Halloween: a sheet ghost for a minute (walking doesn't clear it) */ POSE_GHOST = 3, /** rowing a boat on the Park pond (walking = rowing) */ POSE_BOAT = 4;
const MUG_COLS: RGB[] = [[232, 106, 146], [90, 209, 255], [242, 194, 48], [34, 197, 160], [123, 97, 255], [247, 247, 243]];

interface Snap { t: number; x: number; y: number; dir: 1 | -1; moving: boolean; use: number; hold: number; pose: number }

export interface Avatar {
  id: string;
  name: string;
  look: Look;
  self: boolean;
  x: number; y: number; dir: 1 | -1;
  moving: boolean;
  walkDist: number;
  stopT: number;
  emote: { kind: EmoteKind; t0: number } | null;
  chat: { text: string; t0: number } | null;
  seed: number;
  buf: Snap[];
  lastStepPh: number;
  /** Seconds since this avatar appeared (for the pop-in). */
  born: number;
  /** Spot index being used (-1 = none), when that started, and what's in hand (0 none, 1 mug). */
  use: number;
  useT0: number;
  hold: number;
  /** Sips taken from the current mug (local player only). */
  sips: number;
  /** Hide this one's name tag (the seeker in hide-and-seek has to recognise people by their look). */
  hideName?: boolean;
  /** Non-player character (cyan name tag). */
  npc: boolean;
  /** POSE_NONE / POSE_DANCE / POSE_FLOOR, and when it started. */
  pose: number;
  poseT0: number;
  /** When this avatar last played a note on a Stage instrument (for the hit pose). */
  noteT: number;
  /** The pet's own position (it trails behind), and when it was last moved. */
  pet: { x: number; y: number; z: number; t: number; dir: 1 | -1 };
  /** In a group dance (game/dance.ts): place in the line and crew size, set every frame. */
  crew?: { rank: number; n: number } | null;
  /** The pet's own errand (roaming its owner's flat) instead of trailing behind. */
  petGoal?: { x: number; y: number } | null;
}

export function makeAvatar(id: string, name: string, look: Look, x: number, y: number, self: boolean, now: number): Avatar {
  let s = 0; for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) % 9973;
  return { id, name, look, self, x, y, dir: 1, moving: false, walkDist: 0, stopT: -9, emote: null, chat: null, seed: h1(s), buf: [], lastStepPh: 0, born: now, use: -1, useT0: -9, hold: 0, sips: 0, npc: false, pose: 0, poseT0: -9, noteT: -9, pet: { x: x - 18, y: y + 2, z: 0, t: now, dir: 1 } };
}

// ---------- remote smoothing ----------
const DELAY = 0.14;
export function pushSnap(av: Avatar, m: { x: number; y: number; dir: 1 | -1; moving: boolean; use: number; hold: number; pose: number }, now: number): void {
  const last = av.buf[av.buf.length - 1];
  if (last && Math.hypot(last.x - m.x, last.y - m.y) > 160) av.buf.length = 0; // teleport (door) -> no slide
  av.buf.push({ t: now, x: m.x, y: m.y, dir: m.dir, moving: m.moving, use: m.use, hold: m.hold, pose: m.pose });
  if (av.buf.length > 20) av.buf.splice(0, av.buf.length - 20);
}
export function stepRemote(av: Avatar, now: number): void {
  const b = av.buf; if (!b.length) return;
  const rt = now - DELAY;
  const L = b[b.length - 1];
  let nx = L.x, ny = L.y, dir = L.dir, mv = L.moving, use = L.use, hold = L.hold, pose = L.pose;
  for (let i = b.length - 1; i > 0; i--) {
    if (b[i - 1].t <= rt) {
      const A = b[i - 1], B = b[i], u = B.t > A.t ? Math.min(1, (rt - A.t) / (B.t - A.t)) : 1;
      nx = lerp(A.x, B.x, u); ny = lerp(A.y, B.y, u); dir = u < 0.5 ? A.dir : B.dir; mv = A.moving || B.moving;
      const S = u < 0.5 ? A : B; use = S.use; hold = S.hold; pose = S.pose;
      break;
    }
    if (i === 1) { nx = b[0].x; ny = b[0].y; use = b[0].use; hold = b[0].hold; pose = b[0].pose; }
  }
  if (use !== av.use) { av.use = use; av.useT0 = now; }
  av.hold = hold;
  if (pose !== av.pose) { av.pose = pose; av.poseT0 = now; }
  const d = Math.hypot(nx - av.x, ny - av.y);
  const wasMoving = av.moving;
  av.moving = d > 0.05 || (mv && now - b[b.length - 1].t < 0.3);
  if (wasMoving && !av.moving) av.stopT = now;
  av.walkDist += d; av.x = nx; av.y = ny; av.dir = dir;
}

// ---------- posing ----------
/** What the avatar is doing with the spot it's using (from room.spots[av.use].kind), for posing. */
export type Using = SpotKind | null;

export function poseFor(av: Avatar, a: number, now: number, using: Using = null): { P: Pose; hopY: number } {
  const P = basePose(av.dir);
  let hopY = 0;
  P.sy = 1 + 0.02 * Math.sin(a * 2.6 + av.seed * 6);
  P.ant = Math.sin(a * 1.9 + av.seed * 5) * 0.7;
  if ((a * 0.37 + av.seed) % 1 < 0.035) P.eyes = 'b';
  if (av.moving) {
    const ph = av.walkDist / 8;
    P.lift = Math.floor(ph) % 2 ? 1 : 2;
    hopY = Math.abs(Math.sin(ph * Math.PI)) * 1.5;
    P.lean = av.dir * 2;
    P.sy = 1 + 0.035 * Math.abs(Math.sin(ph * Math.PI));
    P.ant = -av.dir * 2 + Math.sin(ph * Math.PI * 2) * 0.6;
  } else {
    const u = now - av.stopT;
    if (u >= 0 && u < 0.45) { P.sy += -0.09 * Math.exp(-u * 9) * Math.cos(u * 22); P.ant += av.dir * Math.sin(u * 20) * Math.exp(-u * 6) * 2.4; }
  }
  const us = now - av.useT0, ps = now - av.poseT0;
  if (av.pose === POSE_DANCE && !av.moving && av.crew) {
    hopY += crewPose(P, av.crew.rank); // in a group dance: the crew's routine, on the wall clock
  } else if (av.pose === POSE_DANCE && !av.moving) {
    // 120 bpm: bounce on every beat, lean side to side, arms pump, antenna whips
    const beat = a * 2, k = Math.floor(beat), f = beat - k;
    hopY += Math.sin(f * Math.PI) * 3;
    P.sy = 1 - 0.07 * Math.exp(-f * 9) + 0.03 * Math.sin(f * Math.PI);
    P.lean = (k % 2 ? 1 : -1) * 2.5; P.dir = k % 4 < 2 ? 1 : -1;
    P.arm = k % 4 === 3 ? 'up' : 'wave'; P.wave = Math.sin(a * 12) * 1.5;
    P.eyes = 'h'; P.mouth = k % 8 === 7 ? 'O' : 's'; P.lift = k % 2 ? 1 : 2; P.ant = -P.lean * 1.2;
  } else if (av.pose === POSE_FLOOR && !av.moving) {
    // plonk down: squash hard, settle, then slow breathing with both feet out
    P.sy = 0.86 + 0.012 * Math.sin(a * 1.8 + av.seed * 6); P.lean = 0;
    if (ps < 0.5) P.sy -= 0.14 * Math.exp(-ps * 8) * Math.cos(ps * 20);
    if ((a * 0.21 + av.seed) % 1 < 0.05) P.eyes = 'b';
  }
  if (using === 'sit' || using === 'kart') {
    // settle into the seat, then idly swing both feet
    P.sy = 0.96 + 0.015 * Math.sin(a * 2.2 + av.seed * 6); P.lean = 0;
    if (us < 0.5) P.sy -= 0.12 * Math.exp(-us * 8) * Math.cos(us * 20);
    const sw = Math.sin(a * 2.8 + av.seed * 9); P.lift = sw > 0.55 ? 1 : sw < -0.55 ? 2 : 0;
  } else if (using === 'desk') {
    // hunched over the laptop, typing in bursts
    P.sy = 0.94 + 0.01 * Math.sin(a * 2); P.lean = 0.8; P.arm = 'wave'; P.wave = Math.sin(a * 22) * (Math.sin(a * 0.9 + av.seed * 7) > -0.2 ? 1 : 0);
    P.eyes = (a * 0.31 + av.seed) % 1 < 0.04 ? 'b' : 'n'; if ((a * 0.13 + av.seed) % 1 < 0.05) { P.eyes = 'w'; P.mouth = 'o'; }
  } else if (using === 'instrument') {
    // jamming: bob to the music, and hit on every note
    const hit = now - av.noteT < 0.18;
    P.sy = 1 + 0.03 * Math.sin(a * 6) - (hit ? 0.06 : 0); P.lean = Math.sin(a * 3) * 1.2; P.eyes = hit ? 'h' : 'n';
    P.arm = hit ? 'up' : 'wave'; P.wave = Math.sin(a * 10) * 0.8; if (hit) P.mouth = 'O';
  } else if (using === 'hammock') {
    // flopped back, swaying, dozing
    P.sy = 0.86 + 0.02 * Math.sin(a * 1.2); P.lean = Math.sin(a * 1.2 + av.seed) * 2.5; P.eyes = (a * 0.2 + av.seed) % 1 < 0.7 ? 'b' : 'n'; P.lift = 0;
  } else if (using === 'scope') {
    P.eyes = 'w'; P.lean = 2; P.ant = Math.sin(a * 2) * 0.6;
  } else if (using === 'rack' || using === 'kanban') {
    P.arm = 'wave'; P.wave = Math.sin(a * 11) * 1.5; P.eyes = using === 'rack' ? 'w' : 'n'; P.lean = Math.sin(a * 4);
  } else if (using === 'board') {
    P.arm = 'wave'; P.wave = Math.sin(a * 9) * 1.5; P.eyes = Math.sin(a * 2) > 0.8 ? 'b' : 'n'; P.lean = Math.sin(a * 3) * 1;
  } else if (using === 'coffee' || using === 'popcorn' || using === 'soda') {
    P.eyes = us < 1.6 ? (Math.sin(a * 5) > 0.6 ? 'b' : 'n') : 'h'; P.sy += 0.02 * Math.sin(a * 12);
  } else if (using === 'arcade' || using === 'claw' || using === 'pong') {
    P.eyes = 'w'; P.lean = Math.round(Math.sin(a * 3.1)) * 1.5; P.ant = Math.sin(a * 9) * 1.5;
    if ((a * 1.3 + av.seed) % 1 < 0.08) P.mouth = 'O';
  }
  // pop-in when someone arrives
  const bu = now - av.born;
  if (bu < 0.4) { const e = eOB(seg(bu, 0, 0.4)); P.sy *= Math.max(0.2, e); }
  const em = av.emote;
  if (em) {
    const u = now - em.t0;
    switch (em.kind) {
      case 'wave': P.arm = 'wave'; P.wave = Math.sin(u * 14) * 1.2; P.eyes = 'h'; P.lean = av.dir * -1; P.ant += Math.sin(u * 7); break;
      case 'hop':
        if (u < 0.1) P.sy -= 0.14 * bump(u, 0, 0.2);
        hopY += bump(u, 0.1, 0.5) * 18; if (u > 0.1 && u < 0.6) { P.sy += 0.08; P.arm = 'up'; P.ant = Math.sin(u * 16) * 2; }
        if (u >= 0.6) P.sy -= 0.16 * Math.exp(-(u - 0.6) * 10) * Math.cos((u - 0.6) * 24);
        P.eyes = u > 0.1 && u < 0.6 ? 'w' : P.eyes; P.mouth = 'O'; break;
      case 'joy': P.arm = 'up'; P.eyes = 's'; P.mouth = 'O'; P.blush = 1; hopY += Math.abs(Math.sin(u * 9)) * 5; P.ant = Math.sin(u * 18) * 2; break;
      case 'huh': P.eyes = 'w'; P.mouth = 'o'; P.lean = -av.dir * 2; P.ant = -av.dir * 2.5; break;
      case 'laugh': P.eyes = 'h'; P.mouth = Math.floor(u * 8) % 2 ? 'O' : 'o'; P.sy += Math.abs(Math.sin(u * 16)) * 0.06; P.lean = Math.sin(u * 20) * 1.2; P.blush = 0.6; break;
      case 'cry': P.eyes = 'b'; P.mouth = 'o'; P.sy -= 0.03 + 0.01 * Math.sin(u * 30); P.ant = -1.5; break;
      case 'love': P.eyes = 'h'; P.blush = 1; P.sy += 0.03 * Math.sin(u * 6); P.lean = Math.sin(u * 3) * 1.5; break;
      case 'angry': P.eyes = 'w'; P.mouth = 'f'; P.lean = av.dir * 2.5 + Math.sin(u * 40) * 0.8; P.sy -= 0.05; P.ant = Math.sin(u * 30) * 1.5; break;
      case 'sleep': P.eyes = 'b'; P.mouth = 'o'; P.sy = 0.92 + 0.03 * Math.sin(u * 2.5); P.lean = -av.dir; P.ant = -2; break;
      case 'cool': P.eyes = u > 0.4 ? 'n' : 'w'; P.mouth = 's'; P.lean = av.dir * -1.5; P.arm = u > 0.2 && u < 1.2 ? 'wave' : 'rest'; P.wave = 2; break;
      case 'clap': P.arm = Math.floor(u * 10) % 2 ? 'up' : 'rest'; P.eyes = 'h'; P.mouth = 'O'; P.sy += Math.floor(u * 10) % 2 ? 0.03 : 0; break;
      case 'wow': P.eyes = 'w'; P.mouth = 'O'; P.sy += 0.08 * Math.exp(-u * 5); hopY += Math.max(0, Math.sin(u * 6)) * 3 * Math.exp(-u); break;
      case 'eat': P.eyes = u > 0.25 && u < 0.8 ? 'h' : 'n'; P.mouth = u > 0.3 && u < 0.9 ? (Math.floor(u * 10) % 2 ? 'o' : 'f') : 's'; break;
      case 'feed': P.arm = 'wave'; P.wave = u < 0.35 ? -1 : 2; P.eyes = u > 0.4 ? 'h' : 'n'; P.lean = av.dir * (u < 0.35 ? -1.5 : 2); break;
      case 'sip': P.eyes = u > 0.3 && u < 1 ? 'b' : 'h'; P.mouth = 'f'; if (u > 0.95) { P.sy += 0.05 * Math.exp(-(u - 0.95) * 8); P.blush = 0.6; } break;
      case 'idea': P.eyes = u < 0.25 ? 'w' : 'h'; P.mouth = u < 0.25 ? 'o' : 's'; P.flare = Math.max(0, 1 - Math.max(0, u - 0.3) / 1.3); P.sy += 0.1 * Math.exp(-u * 7) * Math.cos(u * 18); P.ant = 0; break;
    }
  }
  return { P, hopY };
}

// ---------- drawing ----------
const NAME_SELF: RGB = [255, 214, 120], NAME_OTHER: RGB = [240, 244, 246];

const NAME_NPC: RGB = [160, 240, 255];

/** A striped popcorn bucket, heaped with kernels. */
function drawPopcorn(cx: number, cy: number, a: number, seed: number): void {
  const x = Math.round(cx) - 3, y = Math.round(cy) - 2;
  r(x - 1, y - 1, 8, 8, OUTLINE); r(x, y - 3, 6, 3, OUTLINE);
  for (let i = 0; i < 6; i++) r(x + i, y, 1, 6, i % 2 ? K.WHITE : K.RED);
  r(x, y, 6, 1, M(K.RED, [255, 255, 255], 0.3)); r(x + 5, y + 1, 1, 5, M(K.RED, [0, 0, 0], 0.25));
  for (let i = 0; i < 5; i++) r(x + i + (h1(i + seed * 9) > 0.5 ? 1 : 0), y - 2 + (i % 2), 1, 1, i % 3 ? K.POPCORN : K.POPCORN_HI);
  r(x + 1, y - 2, 4, 1, K.POPCORN); if ((a + seed) % 2.2 < 0.12) r(x + 2, y - 4, 1, 1, K.POPCORN_HI);
}
/** A marshmallow on a stick, pointing forward: raw, toasted golden, or burnt. */
function drawMarsh(cx: number, cy: number, hold: number, d: 1 | -1): void {
  const x = Math.round(cx), y = Math.round(cy), c = hold === HOLD_TOAST ? [224, 168, 80] as RGB : hold === HOLD_BURNT ? [58, 42, 32] as RGB : [250, 246, 238] as RGB;
  for (let k = 0; k < 12; k++) r(x + d * k, y - Math.floor(k / 3), 1, 1, [120, 90, 60]);
  const mx = x + d * 12 - (d < 0 ? 4 : 0), my = y - 7;
  r(mx - 1, my - 1, 6, 6, OUTLINE); r(mx, my, 4, 4, c); r(mx, my, 4, 1, M(c, [255, 255, 255], 0.4));
  if (hold === HOLD_BURNT) { const ph = (performance.now() / 700) % 1; alpha(0.5 * (1 - ph), () => r(mx + 1, my - 2 - Math.round(ph * 8), 1, 2, [90, 90, 100])); }
}
/** A soda cup with a lid and a bendy straw. */
function drawSoda(cx: number, cy: number): void {
  const x = Math.round(cx) - 2, y = Math.round(cy) - 3;
  r(x - 1, y - 1, 7, 9, OUTLINE); r(x + 3, y - 5, 3, 5, OUTLINE);
  r(x, y + 1, 5, 6, K.SODA); r(x, y + 3, 5, 2, K.WHITE); r(x + 4, y + 1, 1, 6, M(K.SODA, [0, 0, 0], 0.25));
  r(x - 1, y, 7, 1, K.WHITE); r(x + 4, y - 4, 1, 4, K.STRAW); r(x + 3, y - 4, 1, 1, K.STRAW);
}
/** Little effects for the emote wheel, around the head. */
function wheelFx(kind: EmoteKind, u: number, av: Avatar, TX: (x: number, y: number) => [number, number], hx: number, hy: number, a: number): void {
  const heart = (x: number, y: number, c: RGB) => { r(x, y, 2, 1, c); r(x + 3, y, 2, 1, c); r(x, y + 1, 5, 1, c); r(x + 1, y + 2, 3, 1, c); r(x + 2, y + 3, 1, 1, c); };
  switch (kind) {
    case 'laugh': lit(() => { for (let k = 0; k < 2; k++) { const q = (u * 1.4 + k * 0.5) % 1; alpha(1 - q, () => txtOutlined('HA', Math.round(hx + (k ? 12 : -22)), Math.round(hy - 16 - q * 16), [255, 236, 170], 2)); } }); break;
    case 'cry': for (const ex of [-6, 6]) { const [x, y] = TX(ex, -17); for (let k = 0; k < 4; k++) { const q = (u * 1.8 + k / 4) % 1; lit(() => r(Math.round(x + (ex < 0 ? -1 : 1) * (2 + q * 6)), Math.round(y + q * 16), 2, 3, [120, 200, 255])); } } break;
    case 'love': lit(() => { for (let k = 0; k < 4; k++) { const q = (u * 0.8 + k / 4) % 1; alpha(1 - q, () => heart(Math.round(hx - 12 + k * 7 + Math.sin(u * 5 + k) * 3), Math.round(hy - 2 - q * 22), [255, 95, 150])); } }); break;
    case 'angry': lit(() => { txtOutlined('#@!', Math.round(hx - 6), Math.round(hy - 8 - Math.abs(Math.sin(u * 12)) * 2), [255, 90, 70]); }); for (let k = 0; k < 2; k++) puff(hx + (k ? 8 : -8), hy + 4, (u * 1.5 + k * 0.4) % 1, 1, 3, [220, 220, 230], 0.6); break;
    case 'sleep': lit(() => { for (let k = 0; k < 3; k++) { const q = (u * 0.6 + k / 3) % 1; alpha(1 - q, () => txt('Z', Math.round(hx + 6 + q * 10), Math.round(hy - q * 20), [200, 220, 255], k === 0 ? 2 : 1)); } }); break;
    case 'cool': { const drop = Math.min(1, u / 0.35); for (const ex of [-5, 5]) { const [x, y] = TX(ex + av.dir, -20 - (1 - drop) * 14); r(Math.round(x) - 3, Math.round(y) - 1, 6, 3, [20, 20, 26]); } if (u > 0.35 && u < 0.7) { const [x, y] = TX(10, -22); lit(() => star4(Math.round(x), Math.round(y), 2, K.WHITE)); } break; }
    case 'clap': if (Math.floor(u * 10) % 2) { const [x, y] = TX(0, -32); lit(() => { star4(Math.round(x) - 6, Math.round(y), 1, [255, 236, 170]); star4(Math.round(x) + 6, Math.round(y), 1, [255, 236, 170]); }); } break;
    case 'wow': lit(() => { for (let k = 0; k < 6; k++) { const an = (k / 6) * 6.283 + u * 3, d = 10 + u * 8; if (u < 1.4) star4(Math.round(hx + Math.cos(an) * d), Math.round(hy + 6 + Math.sin(an) * d * 0.6), (k + Math.floor(a * 6)) % 2, [255, 214, 90]); } }); break;
  }
}
/** A mug held at (cx, cy), with the film's dark outline and a wisp of steam. */
function drawMug(cx: number, cy: number, col: RGB, handle: 1 | -1, a: number, seed: number): void {
  const x = Math.round(cx) - 2, y = Math.round(cy) - 2, hx = handle > 0 ? x + 5 : x - 2;
  r(x - 1, y - 1, 7, 7, OUTLINE); r(hx - (handle > 0 ? 0 : 1), y, 3, 4, OUTLINE);
  r(x, y, 5, 5, col); r(x, y, 1, 4, M(col, [255, 255, 255], 0.35)); r(x + 4, y + 1, 1, 4, M(col, [0, 0, 0], 0.25));
  r(hx + (handle > 0 ? 0 : 1), y + 1, 1, 2, col); r(x + 1, y, 3, 1, [90, 55, 35]);
  for (let k = 0; k < 2; k++) { const ph = (a * 0.8 + k * 0.5 + seed) % 1; alpha(0.5 * (1 - ph), () => r(x + 2 + Math.round(Math.sin(a * 3 + k * 2) * 1.2), y - 2 - Math.round(ph * 9), 1, 2, [240, 244, 246])); }
}

/**
 * A pet trailing its owner. The pigeon hops to keep up and flutters when it falls behind; the
 * cat, crab and duck scurry; the ghost just floats. They all catch up through doors and
 * pipe up now and then when you stand still.
 */
const PET_SAY = ['', 'COO', 'MEOW', 'SNIP', 'QUACK', 'BOO', 'SQUEAK'];
function drawPet(av: Avatar, a: number, now: number, kind: number): void {
  const p = av.pet, dt = Math.min(0.1, Math.max(0, now - p.t)); p.t = now;
  const tx = av.petGoal ? av.petGoal.x : av.x - av.dir * 20, ty = av.petGoal ? av.petGoal.y : av.y + 3, d = Math.hypot(tx - p.x, ty - p.y);
  if (d > 300) { p.x = tx; p.y = ty; } // it teleported (a door): so does the pet
  const k = Math.min(1, dt * (d > 60 ? 5 : 3)); p.x += (tx - p.x) * k; p.y += (ty - p.y) * k;
  const flies = kind === 1, ghost = kind === 5 || kind === 6;
  const zT = ghost ? 9 + Math.sin(a * 2.2 + av.seed * 7) * 2 : d > 60 ? (flies ? 18 : Math.abs(Math.sin(a * 18)) * 4) : d > 4 ? Math.abs(Math.sin(a * 14)) * 2 : 0;
  p.z += (zT - p.z) * Math.min(1, dt * 8);
  if (Math.abs(tx - p.x) > 1) p.dir = tx > p.x ? 1 : -1;
  const x = Math.round(p.x), y = Math.round(p.y - p.z), d2 = p.dir, fly = flies && p.z > 6, still = !fly && d < 4;
  const peck = still && Math.sin(a * 7 + av.seed * 9) > 0.5 ? 2 : 0, step = d > 4 ? Math.floor(a * 12) % 2 : 0;
  const R = (dx: number, dy: number, w: number, h: number, c: RGB) => r(d2 > 0 ? x + dx : x - dx - w + 1, y + dy, w, h, c);
  if (p.z > 1) alpha(ghost ? 0.15 : 0.25, () => oval(Math.round(p.x), Math.round(p.y), 3, 1, [10, 10, 24]));
  else alpha(0.25, () => oval(Math.round(p.x), Math.round(p.y), 4, 1, [10, 10, 24]));
  if (kind === 1) {
    R(-5, -5, 2, 2, K.PIGEON_DK); R(-3, -6, 6, 4, K.PIGEON); R(-3, -6, 5, 1, K.PIGEON_LT); R(1, -8 + peck, 3, 3, K.PIGEON_DK); R(1, -6 + peck, 2, 1, K.PIGEON_NECK); R(3, -8 + peck, 1, 1, K.FEET); R(4, -7 + peck, 1, 1, K.BEAK);
    if (fly) { if (Math.floor(a * 20) % 2) R(-2, -9, 4, 3, K.PIGEON_DK); else R(-2, -3, 4, 2, K.PIGEON_DK); } else { R(-2, -5, 4, 2, K.PIGEON_DK); R(-1, -2, 1, 2, K.FEET); R(1, -2, 1, 2, K.FEET); }
  } else if (kind === 2) { // cat: tabby, tail swishing
    const c: RGB = [240, 150, 70], dk: RGB = [186, 100, 44], sw = Math.round(Math.sin(a * 3 + av.seed * 5) * 1.5);
    R(-5, -6, 9, 4, c); R(-5, -6, 9, 1, [255, 190, 120]); R(-3, -6, 1, 2, dk); R(0, -6, 1, 2, dk);
    R(3, -9, 5, 4, c); R(3, -10, 1, 1, dk); R(6, -10, 1, 1, dk); R(6, -8, 1, 1, K.EYE); R(7, -7, 1, 1, [255, 150, 170]);
    R(-7, -10 + sw, 1, 5 - sw, c); R(-8, -11 + sw, 2, 1, dk);
    R(-4 + step, -2, 1, 2, dk); R(2 - step, -2, 1, 2, dk);
  } else if (kind === 3) { // crab: sideways scuttle, claws snapping
    const c: RGB = [230, 80, 60], dk: RGB = [168, 48, 40], sn = Math.floor(a * 3 + av.seed * 4) % 2;
    R(-4, -5, 8, 3, c); R(-3, -6, 6, 1, [255, 130, 100]); R(-2, -8, 1, 2, dk); R(1, -8, 1, 2, dk); R(-2, -9, 1, 1, K.WHITE); R(1, -9, 1, 1, K.WHITE);
    R(-7, -7, 2, 2 + sn, c); R(5, -7, 2, 2 + sn, c);
    for (const lx of [-5, -3, 2, 4]) R(lx, -2 + (step && lx % 2 ? -1 : 0), 1, 2, dk);
  } else if (kind === 4) { // duck: waddles
    const c: RGB = [255, 214, 90], dk: RGB = [220, 170, 50], or: RGB = [255, 140, 40], wd = step ? 1 : 0;
    R(-4, -5 - wd, 7, 4, c); R(-4, -5 - wd, 6, 1, [255, 240, 170]); R(-2, -4 - wd, 3, 2, dk); R(-5, -4 - wd, 1, 1, c);
    R(1, -9 - wd + peck, 4, 4, c); R(3, -8 - wd + peck, 1, 1, K.EYE); R(5, -7 - wd + peck, 2, 1, or);
    R(-2, -1, 2, 1, or); R(1, -1, 2, 1, or);
  } else if (kind === 6) { // bat: always flapping, red eyes
    const c: RGB = [62, 44, 84], up = Math.floor(a * 14 + av.seed * 5) % 2;
    R(-2, -8, 5, 4, c); R(-1, -9, 1, 1, c); R(2, -9, 1, 1, c);
    if (up) { R(-7, -11, 5, 2, c); R(3, -11, 5, 2, c); R(-8, -12, 2, 1, c); R(7, -12, 2, 1, c); } else { R(-7, -7, 5, 2, c); R(3, -7, 5, 2, c); R(-8, -5, 2, 1, c); R(7, -5, 2, 1, c); }
    lit(() => { R(-1, -7, 1, 1, [255, 60, 70]); R(1, -7, 1, 1, [255, 60, 70]); });
  } else { // ghost: floats, see-through, faint glow
    const c: RGB = [232, 238, 255], sh: RGB = [170, 180, 222], wv = Math.floor(a * 6) % 2;
    Gd(x, y - 6, 9, [160, 190, 255], 0.3);
    alpha(0.82, () => {
      R(-3, -11, 6, 1, c); R(-4, -10, 8, 8, c); R(-4, -10, 1, 7, sh);
      for (let j = 0; j < 4; j++) R(-4 + j * 2, -2, 1, 1 + ((j + wv) % 2), c);
      R(-2, -8, 1, 2, K.EYE); R(1, -8, 1, 2, K.EYE); R(-1, -5, 2, 1, sh);
    });
  }
  if (still && (a * 0.13 + av.seed) % 1 < 0.04) lit(() => txt(PET_SAY[kind] ?? '', x - 5, y - 16 - (ghost ? 6 : 0), [230, 230, 240]));
}

/** A hot dog: bun, sausage, a squiggle of mustard. */
/** Kitchen things, held up on a little plate or in hand (the Diner). */
function drawKitchen(x: number, y: number, hold: number, a: number): void {
  const X = Math.round(x), Y = Math.round(y);
  const plate = () => { r(X - 6, Y + 1, 13, 2, [236, 240, 244]); r(X - 5, Y + 3, 11, 1, [180, 186, 196]); };
  if (hold === HOLD_PATTY || hold === HOLD_COOKED || hold === HOLD_CHAR) {
    const c: RGB = hold === HOLD_PATTY ? [226, 120, 120] : hold === HOLD_COOKED ? [120, 70, 44] : [40, 32, 28];
    plate(); r(X - 4, Y - 2, 9, 3, c); r(X - 3, Y - 2, 7, 1, M(c, [255, 255, 255], 0.25));
    if (hold === HOLD_CHAR) { const ph = (a * 1.4) % 1; alpha(0.5 * (1 - ph), () => r(X, Y - 5 - Math.round(ph * 8), 1, 2, [90, 90, 100])); }
  } else if (hold === HOLD_BURGER) {
    plate(); r(X - 5, Y - 1, 11, 2, [224, 170, 90]); r(X - 5, Y - 2, 11, 1, [90, 170, 70]); r(X - 5, Y - 3, 11, 1, [255, 200, 60]); r(X - 5, Y - 5, 11, 2, [120, 70, 44]);
    r(X - 5, Y - 9, 11, 4, [224, 160, 80]); r(X - 4, Y - 10, 9, 1, [224, 160, 80]); r(X - 3, Y - 9, 7, 1, [246, 196, 120]); r(X - 2, Y - 8, 1, 1, [255, 246, 220]); r(X + 2, Y - 8, 1, 1, [255, 246, 220]);
  } else if (hold === HOLD_FROZEN || hold === HOLD_FRIES) {
    const c: RGB = hold === HOLD_FRIES ? [255, 210, 80] : [236, 230, 200];
    for (let k = 0; k < 5; k++) r(X - 3 + k * 1.5, Y - 7 + (k % 2), 1, 4, c);
    r(X - 4, Y - 4, 9, 7, hold === HOLD_FRIES ? [220, 50, 50] : [150, 190, 230]); r(X - 4, Y - 4, 9, 1, M(hold === HOLD_FRIES ? [220, 50, 50] : [150, 190, 230], [255, 255, 255], 0.3));
    if (hold === HOLD_FRIES) r(X - 1, Y - 2, 3, 3, [255, 255, 255]); else r(X - 3, Y - 2, 7, 1, [255, 255, 255]);
  } else if (hold === HOLD_SHAKE) {
    r(X - 3, Y - 6, 7, 9, [236, 240, 244]); r(X - 2, Y - 5, 5, 7, [250, 170, 200]); r(X - 2, Y - 5, 5, 1, [255, 220, 236]);
    r(X - 3, Y - 8, 7, 2, [255, 250, 250]); r(X - 1, Y - 10, 3, 2, [255, 250, 250]); r(X, Y - 12, 2, 2, [220, 30, 50]); r(X + 2, Y - 13, 1, 6, [255, 90, 120]);
  }
}
function drawHotdog(x: number, y: number, d: number): void {
  const X = Math.round(x) - (d > 0 ? 1 : 8), Y = Math.round(y) - 3;
  r(X, Y + 1, 10, 4, [226, 170, 100]); r(X, Y + 1, 10, 1, [246, 200, 130]); r(X - 1, Y, 12, 2, [196, 90, 70]); r(X - 1, Y, 12, 1, [226, 120, 90]);
  for (let k = 0; k < 5; k++) r(X + k * 2, Y + (k % 2), 1, 1, [255, 214, 60]);
}
/**
 * A kite on a long string from the hand, flying on the shared wind (world/weather.ts) so every
 * browser draws it in the same place without any messages. Colour = the flyer's body colour.
 */
function drawKite(hx: number, hy: number, av: Avatar, a: number): void {
  const w = wind(), len = 96 + w.gust * 20, lean = w.dx * 0.8 + Math.sin(a * 0.9 + av.seed * 9) * 0.12;
  const kx = Math.round(hx + lean * len), ky = Math.round(hy - Math.sqrt(Math.max(0, 1 - lean * lean)) * len + Math.sin(a * 1.7 + av.seed * 5) * 4);
  // the string sags a little
  for (let k = 0; k <= 16; k++) { const u = k / 16; r(Math.round(hx + (kx - hx) * u), Math.round(hy + (ky - hy) * u + Math.sin(u * Math.PI) * 8), 1, 1, [230, 230, 236]); }
  const c = BODY[av.look.c]?.c ?? BODY[0].c, hi = M(c, [255, 255, 255], 0.35), lo = M(c, [0, 0, 0], 0.25);
  for (let j = -7; j <= 9; j++) { const hw = j < 0 ? Math.round((7 + j) * 0.9) : Math.round((9 - j) * 0.7); if (hw > 0) { r(kx - hw, ky + j, hw, 1, j < 0 ? hi : c); r(kx, ky + j, hw, 1, j < 0 ? c : lo); } }
  r(kx, ky - 7, 1, 17, [240, 236, 220]); r(kx - 6, ky - 1, 13, 1, [240, 236, 220]);
  // the tail streams away from the wind, with bows
  for (let k = 1; k <= 10; k++) { const tx = kx - Math.round(w.dx * k * 2.2) + Math.round(Math.sin(a * 5 + k * 0.8) * 2), ty = ky + 9 + k * 2; r(tx, ty, 1, 2, [240, 236, 220]); if (k % 3 === 0) { r(tx - 2, ty, 2, 1, CONFETTI[k % CONFETTI.length]); r(tx + 1, ty, 2, 1, CONFETTI[k % CONFETTI.length]); } }
}
/** Rowing on the pond: the boat under the rower (back half first, front half after). */
function drawBoat(x: number, y: number, a: number, front: boolean, moving: boolean, seed: number): void {
  const X = Math.round(x), bob = Math.round(Math.sin(a * 2 + seed * 7)), Y = Math.round(y) + bob, hull: RGB = [180, 70, 60], rim: RGB = [230, 200, 150];
  if (!front) { r(X - 20, Y - 12, 40, 4, M(hull, [0, 0, 0], 0.3)); r(X - 18, Y - 14, 36, 2, rim); return; }
  const row = moving ? Math.sin(a * 6) : 0;
  for (const s of [-1, 1]) { const ox = X + s * 16, oy = Y - 10; line(ox, oy, Math.round(ox + s * 8), Math.round(oy + 6 + row * 3), [120, 84, 50]); r(Math.round(ox + s * 8) - 1, Math.round(oy + 6 + row * 3), 3, 2, [120, 84, 50]); }
  for (let j = 0; j < 8; j++) { const hw = 20 - Math.round(j * j / 6); r(X - hw, Y - 8 + j, hw * 2, 1, j < 2 ? rim : j > 5 ? M(hull, [0, 0, 0], 0.25) : hull); }
  alpha(0.35, () => { r(X - 24, Y + 1, 48, 1, [220, 240, 255]); if (moving) { r(X - 30 - Math.round((a * 20) % 8), Y + 2, 6, 1, [220, 240, 255]); r(X + 26 + Math.round((a * 20) % 8), Y + 2, 6, 1, [220, 240, 255]); } });
}

/** Halloween's "trick": a bedsheet ghost over the character, bobbing, hem waving. */
function drawSheet(x: number, y: number, a: number, seed: number): void {
  const bob = Math.round(Math.sin(a * 3 + seed * 7) * 1.5), X = Math.round(x), Y = Math.round(y) - 2 + bob, c: RGB = [238, 240, 252], sh: RGB = [190, 196, 226], wv = Math.floor(a * 5 + seed * 3) % 2;
  alpha(0.94, () => {
    for (let j = 0; j < 34; j++) { const yy = Y - 36 + j, hw = j < 10 ? Math.round(Math.sqrt(Math.max(0, 100 - (10 - j) * (10 - j))) * 1.25) : 13 + Math.floor((j - 10) / 8); r(X - hw, yy, hw * 2, 1, c); r(X - hw, yy, 1, 1, sh); r(X + hw - 2, yy, 2, 1, sh); }
    for (let k = -14; k < 14; k += 4) r(X + k, Y - 2, 3, 1 + ((k / 4 + wv) & 1) * 2, c);
  });
  r(X - 6, Y - 26, 3, 4, [30, 24, 40]); r(X + 3, Y - 26, 3, 4, [30, 24, 40]); r(X - 2, Y - 19, 4, 3, [30, 24, 40]);
}

/** `brolly`: out in the rain, so hold an umbrella (world/weather.ts). */
export function drawAvatar(av: Avatar, a: number, now: number, dim: number, using: Using = null, lift = 0, brolly = false): { headX: number; headY: number } {
  if (av.look.pet) drawPet(av, a, now, av.look.pet);
  const { P, hopY } = poseFor(av, a, now, using);
  // contact shadow shrinks while airborne (none when seated: the seat is the ground)
  const sk = Math.max(0.4, 1 - hopY / 30);
  if (!lift) alpha(0.3 * sk * (av.pose === POSE_FLOOR ? 1.3 : 1), () => oval(Math.round(av.x), Math.round(av.y), Math.round(11 * sk), 2, [10, 10, 24]));
  const boat = av.pose === POSE_BOAT;
  if (boat) drawBoat(av.x, av.y, a, false, av.moving, av.seed);
  const { TX, c } = stampCritter(av.look, P, av.x, av.y - lift - hopY + (boat ? 4 : 0), dim);
  if (boat) drawBoat(av.x, av.y, a, true, av.moving, av.seed);
  if (av.pose === POSE_GHOST) drawSheet(av.x, av.y - lift - hopY, a, av.seed);
  if (av.hold) {
    let [lx, ly] = c.hand;
    const em = av.emote;
    if (em && (em.kind === 'sip' || em.kind === 'eat')) { const d = emoteDur(em.kind), k = Math.min(1, bump(now - em.t0, 0, d) * 1.6); lx = lerp(lx, c.mouth[0], k); ly = lerp(ly, c.mouth[1], k); }
    const [mx, my] = TX(lx, ly);
    PX.dim = dim;
    if (av.hold === HOLD_MUG) drawMug(mx, my, MUG_COLS[Math.floor(av.seed * MUG_COLS.length)], P.dir > 0 ? 1 : -1, a, av.seed);
    else if (av.hold === HOLD_POPCORN) drawPopcorn(mx, my, a, av.seed);
    else if (av.hold === HOLD_SODA) drawSoda(mx, my);
    else if (av.hold === HOLD_HOTDOG) drawHotdog(mx, my, P.dir > 0 ? 1 : -1);
    else if (av.hold === HOLD_KITE) drawKite(mx, my, av, a);
    else if (isKitchen(av.hold)) drawKitchen(mx, my, av.hold, a);
    else if (av.hold >= HOLD_MARSH) drawMarsh(mx, my, av.hold, P.dir > 0 ? 1 : -1);
    if (em?.kind === 'eat') { const u = now - em.t0; for (let k = 0; k < 3; k++) { const q = u - 0.45 - k * 0.12; if (q > 0 && q < 0.5) r(Math.round(mx + (k - 1) * 3 + q * 8 * (k - 1)), Math.round(my - 2 + q * 30 * q * 4), 1, 1, K.POPCORN_HI); } }
  }
  // dancing: little notes float up; feeding: crumbs arc out in front
  if (av.pose === POSE_DANCE && !av.moving) lit(() => { for (let k = 0; k < 2; k++) { const ph = (a * 0.7 + k * 0.5 + av.seed) % 1, nx = av.x + (k ? 10 : -12) + Math.sin(a * 3 + k) * 3, ny = av.y - lift - 36 - ph * 18; if (ph < 0.85) { const col: RGB = k ? K.CYAN : K.MAG; r(Math.round(nx), Math.round(ny), 2, 2, col); r(Math.round(nx) + 1, Math.round(ny) - 5, 1, 5, col); r(Math.round(nx) + 2, Math.round(ny) - 5, 2, 1, col); } } });
  if (av.emote?.kind === 'feed') { const u = now - av.emote.t0 - 0.3; if (u > 0 && u < 0.7) for (let k = 0; k < 6; k++) { const vx = av.dir * (18 + h1(k + av.seed * 30) * 26), x = av.x + av.dir * 10 + vx * u, y = av.y - 22 + (-40 + h1(k * 3 + av.seed) * 20) * u + 90 * u * u; if (y < av.y + 4) r(Math.round(x), Math.round(y), 1, 1, K.CRUMB); } }
  // antenna bulb glow
  if (c.bulb) { const [bx, by] = TX(c.bulb[0], c.bulb[1]); Gd(bx, by, 5 + P.flare * 11, c.bulbCol, 0.55 + P.flare * 0.2); }
  const [hx, hy] = TX(0, c.top);
  // emote FX
  const em = av.emote;
  if (em) {
    const u = now - em.t0;
    if (em.kind === 'huh') {
      const sc = u < 0.08 ? 4 : 3, bob = Math.round(Math.abs(Math.sin(a * 4)) * 2);
      alpha(1 - seg(u, 1.4, 1.8), () => txtOutlined('?', Math.round(hx - (3 * sc) / 2), Math.round(hy - 8 - sc * 5 - bob), [255, 236, 170], sc));
    }
    if (em.kind === 'idea' && c.bulb) {
      const [bx, by] = TX(c.bulb[0], c.bulb[1]);
      lit(() => { for (let k = 0; k < 6; k++) { const an = (k / 6) * 6.283 + u * 2, d = 5 + u * 14; if (u < 1.2) twinkle(Math.round(bx + Math.cos(an) * d), Math.round(by + Math.sin(an) * d * 0.8), k % 2 ? [255, 236, 170] : [255, 255, 255], u < 0.3 ? 1 : 0); } });
      if (u > 0.2 && u < 1.4) alpha(1 - seg(u, 1.1, 1.4), () => txtOutlined('!', Math.round(bx + 6), Math.round(by - 14 - u * 4), [255, 214, 90], 2));
    }
    if (em.kind === 'joy') {
      lit(() => { for (let k = 0; k < 26; k++) { const vx = (h1(k + av.seed * 50) - 0.5) * 90, vy = -70 - h1(k + 1 + av.seed * 50) * 60, x = av.x + vx * u, y = av.y - 26 + vy * u + 140 * u * u; if (u < 1.5) r(Math.round(x), Math.round(y), 2, k % 3 ? 1 : 2, CONFETTI[k % CONFETTI.length]); } });
    }
    if (em.kind === 'hop' && u > 0.58 && u < 1) { puff(av.x - 10, av.y, u - 0.6, 0.4, 3, [222, 230, 228], 0.6); puff(av.x + 10, av.y, u - 0.62, 0.4, 3, [222, 230, 228], 0.6); }
    if (em.kind === 'wave' && u < 0.3) { const [wx, wy] = TX(16, -30); lit(() => star4(Math.round(wx), Math.round(wy), 1, [255, 255, 255])); }
    wheelFx(em.kind, u, av, TX, hx, hy, a);
  }
  if (brolly) { PX.dim = dim; drawUmbrella(hx, hy, av.seed, a); }
  // name tag (3x5 pixel font, outlined)
  const label = av.hideName ? '?' : av.name.toUpperCase().slice(0, 16);
  const nx = Math.round(hx - tw(label) / 2), ny = Math.round(hy - 9);
  txtOutlined(label, nx, ny, av.self ? NAME_SELF : av.npc ? NAME_NPC : NAME_OTHER);
  if (av.self) G(nx - 2, ny - 2, tw(label) + 4, 9, [255, 214, 120], 0.12);
  return { headX: hx, headY: ny - 2 };
}
