// HALLOWEEN (October, see season.ts): the dressing that goes over every room, the trick-or-treat
// doors and the haunted Crypt's candle puzzle. Rooms don't know about any of this; main.ts
// calls installHalloween() once the season is known, then drawBack/props/drawFront each frame.
//
// Trick-or-treat: a jack-o'-lantern by 8 doors around the world (index = the server's door id,
// see supabase/migrations/0007_halloween.sql). Knock once per door per day: 1 token, or a
// trick. Pumpkins you've knocked at today go dark (per player).
// The haunted Crypt: 4 candles marked MOON, BAT, EYE and FLAME; an old scroll on the wall says
// today's order (it changes every day). Light them in that order for the PUMPKIN HEAD.

import { K, type RGB } from '../engine/palette';
import { r, lit, alpha, Gd, line } from '../engine/pixel';
import { h1 } from '../engine/math';
import { dayness } from './plaza';
import type { Prop, Room, RoomId, Spot, Talker } from './room';

/** The 8 doors: which room, the pumpkin (x, base y) and where you stand to knock. */
export const TREAT_DOORS: { room: RoomId; x: number; y: number; sx: number; sy: number; name: string }[] = [
  { room: 'plaza', x: 142, y: 572, sx: 142, sy: 586, name: 'THE LAB' },
  { room: 'plaza', x: 476, y: 572, sx: 476, sy: 586, name: 'THE CINEMA' },
  { room: 'lab', x: 804, y: 446, sx: 804, sy: 458, name: 'THE LAB STAIRS' },
  { room: 'den', x: 306, y: 446, sx: 306, sy: 458, name: 'THE DEV DEN' },
  { room: 'roof', x: 90, y: 468, sx: 92, sy: 480, name: 'THE ROOF' },
  { room: 'cinema', x: 70, y: 458, sx: 72, sy: 470, name: 'THE CINEMA EXIT' },
  { room: 'stage', x: 68, y: 482, sx: 72, sy: 494, name: 'THE STAGE' },
  { room: 'arcade', x: 86, y: 482, sx: 90, sy: 494, name: 'THE ARCADE' },
];
/** Just for show. */
const PUMPKINS: Partial<Record<RoomId, [number, number, number][]>> = {
  plaza: [[300, 574, 1], [314, 577, 0], [706, 576, 1], [860, 576, 0], [1040, 578, 1]],
  lab: [[140, 446, 1], [520, 447, 0]], den: [[700, 446, 1]], cinema: [[300, 458, 1], [940, 458, 0]],
  stage: [[180, 480, 1], [930, 480, 1]], pier: [[470, 600, 1], [488, 604, 0], [300, 660, 1]], roof: [[400, 468, 1], [700, 468, 0]],
  arcade: [[1060, 482, 1]],
};
/** Cobwebs in the top corners of doorways: [x, y, which way it hangs]. */
const WEBS: Partial<Record<RoomId, [number, number, 1 | -1][]>> = {
  lab: [[52, 306, -1], [816, 306, 1]], den: [[52, 306, -1]], cinema: [[52, 316, -1]],
  stage: [[52, 342, -1]], arcade: [[70, 350, -1]], crypt: [[56, 322, -1], [898, 318, -1]],
};
/** Strings of orange and purple lights: [x0, y0, x1, y1] (they sag between the ends). */
const LIGHTS: Partial<Record<RoomId, [number, number, number, number][]>> = {
  plaza: [[161, 492, 521, 492], [701, 492, 1061, 492]],
  stage: [[140, 126, 540, 126], [540, 126, 940, 126]],
};
/** Where bats fly: the band of sky the camera actually shows in each outdoor room. */
const BATS: Partial<Record<RoomId, [number, number]>> = { plaza: [370, 470], roof: [120, 300], pier: [300, 370] };
const FOG: RoomId[] = ['plaza', 'pier', 'roof'];
const WIDTH: Partial<Record<RoomId, number>> = { plaza: 1200, pier: 1300, roof: 1100 };
const FLOOR_Y: Partial<Record<RoomId, [number, number]>> = { plaza: [560, 712], pier: [424, 690], roof: [462, 650] };

// ---------- trick-or-treat: which pumpkins you've knocked at today (this browser) ----------
const KEY = 'labhangout.treats';
const today = () => new Date().toISOString().slice(0, 10);
function knocked(): number[] { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v?.day === today() && Array.isArray(v.doors) ? v.doors : []; } catch { return []; } }
export function markKnocked(i: number): void { const d = knocked(); if (!d.includes(i)) d.push(i); try { localStorage.setItem(KEY, JSON.stringify({ day: today(), doors: d })); } catch { /* private mode */ } }
export const knockedCount = (): number => knocked().length;

// ---------- the haunted Crypt ----------
export const CANDLES: { x: number; sym: string }[] = [{ x: 160, sym: 'MOON' }, { x: 300, sym: 'BAT' }, { x: 440, sym: 'EYE' }, { x: 660, sym: 'FLAME' }];
const CANDLE_Y = 452;
/** Today's order (a shuffle seeded by the UTC date, so it's the same for everyone). */
export function candleOrder(): number[] {
  const d = Math.floor(Date.now() / 86400000), o = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) { const j = Math.floor(h1(d * 7.1 + i * 3.3) * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  return o;
}
const scrollLine = () => { const o = candleOrder().map((i) => CANDLES[i].sym); return 'The old scroll reads: first the ' + o[0] + ', then the ' + o[1] + ', then the ' + o[2] + ', last of all the ' + o[3] + '.'; };
/** Candles you've lit, in order (yours only), and when the last attempt ended. */
export const CRYPT_CANDLES = { lit: [] as number[], outT: -9, doneT: -9 };
/** Light candle i: 'more' (right so far), 'wrong' (they all go out) or 'solved'. */
export function lightCandle(i: number): 'more' | 'wrong' | 'solved' | 'lit' {
  const c = CRYPT_CANDLES, want = candleOrder();
  if (c.lit.includes(i)) return 'lit';
  if (want[c.lit.length] !== i) { c.lit = []; c.outT = performance.now() / 1000; return 'wrong'; }
  c.lit.push(i);
  if (c.lit.length === 4) { c.doneT = performance.now() / 1000; return 'solved'; }
  return 'more';
}

// ---------- installing it into the rooms ----------
let installed = false;
/** Add the doors, candles and the scroll to the rooms (once). Spots are appended, so indexes stay stable. */
export function installHalloween(rooms: Record<RoomId, Room>): void {
  if (installed) return; installed = true;
  TREAT_DOORS.forEach((d, n) => rooms[d.room].spots.push({ kind: 'treat', n, x: d.sx, y: d.sy, sx: d.sx, sy: d.sy, lift: 0, label: 'TRICK OR TREAT', area: { x0: d.x - 12, y0: d.y - 22, x1: d.x + 12, y1: d.y + 2 } } satisfies Spot));
  CANDLES.forEach((c, n) => rooms.crypt.spots.push({ kind: 'candle', n, x: c.x, y: CANDLE_Y + 14, sx: c.x, sy: CANDLE_Y + 14, lift: 0, label: 'LIGHT', area: { x0: c.x - 12, y0: CANDLE_Y - 50, x1: c.x + 12, y1: CANDLE_Y + 2 } } satisfies Spot));
  const scroll: Talker = { id: 'crypt-scroll', name: 'SCROLL', x: 560, y: 360, sx: 560, sy: 452, get lines() { return [scrollLine()]; } };
  (rooms.crypt.talkers ??= []).push(scroll);
  const crypt = rooms.crypt, baseDim = crypt.dim; crypt.dimNow = () => Math.max(baseDim, 0.62); // darker: bring your lantern
}

// ---------- drawing ----------
/** A jack-o'-lantern standing on the floor at (x, y). `on` = candle lit. */
function pumpkin(x: number, y: number, a: number, on: boolean, big: number): void {
  const w = 7 + big * 2, h = 6 + big, o: RGB = [232, 120, 36], od: RGB = [180, 84, 24];
  for (let j = 0; j < h * 2; j++) { const u = (j - h) / h, hw = Math.round(w * Math.sqrt(Math.max(0, 1 - u * u))); if (hw > 0) r(x - hw, y - h * 2 + j, hw * 2, 1, j > h * 1.5 ? od : o); }
  r(x - Math.round(w / 3), y - h * 2 + 1, 1, h * 2 - 2, od); r(x + Math.round(w / 3), y - h * 2 + 1, 1, h * 2 - 2, od);
  r(x - 1, y - h * 2 - 3, 2, 3, [80, 130, 60]);
  const f = 0.75 + 0.25 * Math.sin(a * 11 + x) * Math.sin(a * 7.3 + y), c: RGB = on ? [255, Math.round(170 + 60 * f), 70] : [60, 30, 16];
  const face = () => { r(x - 4, y - h - 3, 2, 2, c); r(x + 2, y - h - 3, 2, 2, c); r(x - 4, y - h + 1, 8, 1, c); r(x - 3, y - h + 2, 2, 1, c); r(x + 1, y - h + 2, 2, 1, c); };
  if (on) { lit(face); Gd(x, y - h, 9 + big * 3, [255, 150, 50], 0.28 * f); } else face();
}

/** Pumpkins as depth-sorted props for this room. */
export function halloweenProps(room: RoomId): Prop[] {
  const out: Prop[] = [];
  const done = knocked();
  TREAT_DOORS.forEach((d, i) => { if (d.room === room) out.push({ y: d.y, draw: (a) => { pumpkin(d.x, d.y, a, !done.includes(i), 1); if (!done.includes(i)) lit(() => r(d.x - 1, d.y - 26 - Math.round(Math.abs(Math.sin(a * 3))) * 2, 2, 2, [255, 214, 90])); } }); });
  for (const [x, y, big] of PUMPKINS[room] ?? []) out.push({ y, draw: (a) => pumpkin(x, y, a, true, big) });
  if (room === 'crypt') for (const [i, c] of CANDLES.entries()) out.push({ y: CANDLE_Y, draw: (a) => candle(i, c.x, a) });
  return out;
}

const SYM: Record<string, string[]> = {
  MOON: ['.##.', '##..', '##..', '.##.'], BAT: ['#..#', '####', '.##.', '....'], EYE: ['.##.', '#..#', '#.##', '.##.'], FLAME: ['..#.', '.##.', '####', '.##.'],
};
function candle(i: number, x: number, a: number): void {
  const C = CRYPT_CANDLES, now = performance.now() / 1000, on = C.lit.includes(i) || now - C.doneT < 6, gutter = now - C.outT < 0.6;
  r(x - 1, CANDLE_Y - 20, 3, 20, [70, 64, 60]); r(x - 5, CANDLE_Y - 2, 11, 2, [70, 64, 60]); r(x - 4, CANDLE_Y - 22, 9, 2, [90, 84, 78]);
  r(x - 2, CANDLE_Y - 30, 5, 8, [230, 224, 206]); r(x - 2, CANDLE_Y - 30, 1, 8, K.WHITE);
  if (on) { const fl = Math.sin(a * 13 + i) > 0 ? 1 : 0; lit(() => { r(x - 1, CANDLE_Y - 35 - fl, 3, 4, [255, 200, 80]); r(x, CANDLE_Y - 36 - fl, 1, 2, [255, 250, 220]); }); Gd(x, CANDLE_Y - 34, 16, [255, 170, 80], 0.4); }
  else if (gutter) lit(() => r(x, CANDLE_Y - 34 - Math.round((now - C.outT) * 10), 1, 2, [150, 150, 160]));
  const g = SYM[CANDLES[i].sym], col: RGB = on ? [255, 214, 120] : [140, 170, 200];
  lit(() => { g.forEach((row, y) => [...row].forEach((ch, xx) => { if (ch === '#') r(x - 4 + xx * 2, CANDLE_Y - 52 + y * 2, 2, 2, col); })); });
}

/** Behind the players: cobwebs, strings of lights, bats in the sky. */
export function halloweenBack(room: RoomId, a: number): void {
  for (const [x, y, s] of WEBS[room] ?? []) {
    const c: RGB = [200, 204, 214];
    alpha(0.55, () => { for (let k = 0; k < 5; k++) line(x, y, x + s * (4 + k * 5), y + 22 - k * 5, c); for (let rr = 6; rr <= 18; rr += 6) for (let k = 0; k < 4; k++) line(x + s * Math.round(rr * Math.cos(k * 0.39)), y + Math.round(rr * Math.sin(k * 0.39 + 0.2)), x + s * Math.round(rr * Math.cos((k + 1) * 0.39)), y + Math.round(rr * Math.sin((k + 1) * 0.39 + 0.2)), c); });
    r(x + s * 10, y + 10 + Math.round(Math.sin(a * 1.3) * 2), 2, 2, [30, 24, 40]);
  }
  for (const [x0, y0, x1, y1] of LIGHTS[room] ?? []) {
    const n = Math.floor((x1 - x0) / 14);
    for (let k = 0; k <= n; k++) { const u = k / n, x = Math.round(x0 + (x1 - x0) * u), y = Math.round(y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * 14); r(x, y - 1, 1, 1, [40, 40, 50]); const on = (k + Math.floor(a * 2)) % 5 !== 0; const c: RGB = k % 2 ? [255, 140, 40] : [150, 90, 255]; if (on) { lit(() => r(x - 1, y, 3, 3, c)); Gd(x, y + 1, 5, c, 0.3); } else r(x - 1, y, 3, 3, [60, 50, 60]); }
  }
  if (room === 'crypt') { // the old scroll on the wall (walk up to it and press E to read)
    const x = 560, y = 330, fl = 0.7 + 0.3 * Math.sin(a * 2);
    r(x - 16, y, 32, 3, [150, 110, 60]); r(x - 14, y + 3, 28, 30, [214, 196, 150]); r(x - 16, y + 33, 32, 3, [150, 110, 60]);
    for (let k = 0; k < 6; k++) r(x - 10, y + 8 + k * 4, 14 + Math.round(h1(k) * 6), 1, [120, 100, 70]);
    Gd(x, y + 18, 26, [160, 220, 200], 0.12 * fl);
  }
  const band = BATS[room];
  if (band && dayness() < 0.6) {
    const W = WIDTH[room] ?? 1200;
    for (let k = 0; k < 7; k++) {
      const sp = 26 + h1(k) * 22, x = ((a * sp + h1(k + 3) * W * 2) % (W + 200)) - 100, y = band[0] + h1(k + 9) * (band[1] - band[0]) + Math.sin(a * 1.7 + k) * 8, up = Math.floor(a * 9 + k) % 2, c: RGB = [4, 2, 8];
      const X = Math.round(x), Y = Math.round(y);
      r(X - 1, Y, 3, 3, c); lit(() => r(X, Y + 1, 1, 1, [255, 70, 70])); if (up) { r(X - 6, Y - 2, 5, 1, c); r(X + 2, Y - 2, 5, 1, c); r(X - 4, Y - 1, 3, 1, c); r(X + 2, Y - 1, 3, 1, c); } else { r(X - 6, Y + 2, 5, 1, c); r(X + 2, Y + 2, 5, 1, c); r(X - 4, Y + 1, 3, 1, c); r(X + 2, Y + 1, 3, 1, c); }
    }
  }
}

/** Over everything: low fog over the outdoor floors at night. */
export function halloweenFront(room: RoomId, a: number): void {
  if (!FOG.includes(room)) return;
  const night = 1 - dayness(); if (night < 0.1) return;
  const W = WIDTH[room] ?? 1200, [f0, f1] = FLOOR_Y[room] ?? [560, 712];
  for (let k = 0; k < 7; k++) {
    const x = ((a * (6 + k * 1.3) + h1(k) * W) % (W + 400)) - 200, y = f0 + h1(k + 5) * (f1 - f0), w = 150 + h1(k + 2) * 120;
    alpha(0.07 * night, () => { for (let j = -6; j <= 6; j++) { const hw = Math.round(w / 2 * Math.sqrt(1 - (j * j) / 49)); r(Math.round(x - hw), Math.round(y + j * 2), hw * 2, 2, [200, 210, 230]); } });
  }
}
