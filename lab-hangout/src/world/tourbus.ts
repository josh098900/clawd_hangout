// THE ICELAND EXPLORER (step 19, push 2): the tour bus's cabin. Seats in pairs down the aisle (a window seat, an aisle seat), white
// headrest covers, coats on the racks, the heater's warm glow by the floor, the route strip over the windscreen. STEFÁN drives; KATLA
// talks on the mic (features/coast.ts). The door at the front opens at each stop (game/tour.ts runs the bus on the clock).
//
// The big windows show the Ring Road going by, from the bus's place on the road (km from Reykjavík): heading out, the north side (Esja,
// the moss-covered lava of Hellisheiði and its power station's steam, Hveragerði's greenhouses, the bridges, farms and hay bales, horses
// and sheep, Hekla, the cliffs under Eyjafjallajökull with waterfalls down them, Mýrdalsjökull); heading home, the south side (the sea,
// the Westman Islands, Dyrhólaey's arch). Layers at three speeds: the far mountains, the fields, the verge with its snow poles.

import { K, IS, type RGB } from '../engine/palette';
import { PX, mk, r, line, disc, oval, txt, tw, lit, alpha, G, Gd, M, bake } from '../engine/pixel';
import { clamp, h1 } from '../engine/math';
import { iceDay, iceGold, iceSun, iceWeather, auroraNow, drawAurora } from './iceland';
import { tour, busAt, STOPS, STOP_NAMES, STOP_KM, type Tour } from '../game/tour';
import { basePose, stampCritter } from '../entities/critter';
import { SEL_ARRIVE } from './seljaland';
import { SKO_ARRIVE } from './skoga';
import { WRK_ARRIVE } from './wreck';
import { BCH_ARRIVE } from './beach';
import type { Prop, Room, RoomId, Spot } from './room';

const W = 1200, H = 614, WALL = 470, FL0 = 484, FL1 = 570;
export const TBR = { door: 1086, driver: 1150, katla: 1030, heater0: 120, heater1: 1000 };
/** Where you appear getting on (inside the door). */
export const TB_ARRIVE = { x: 1070, y: 512 };
/** Where you step off at each stop (Reykjavík's is its tour bus stop). */
export const STOP_ARRIVE: Record<string, { x: number; y: number }> = { reykjavik: { x: 192, y: 500 }, seljaland: SEL_ARRIVE, skoga: SKO_ARRIVE, wreck: WRK_ARRIVE, beach: BCH_ARRIVE };
/** The windows: the panorama shows through them. */
const WIN_Y0 = 362, WIN_Y1 = 452, HOR = 408;
const WINS: [number, number][] = [[110, 196], [206, 292], [302, 388], [398, 484], [494, 580], [590, 676], [686, 772], [782, 868], [878, 964]];
/** The rows of seats (the x of each pair's backs). */
export const ROWS = [150, 246, 342, 438, 534, 630, 726, 822, 918];
export const SEAT_Y = { win: 494, aisle: 516 };
/** What the features tell the set. */
export const TBW = { view: { x0: 0, x1: W }, wave: -99 };
const seen = (x0: number, x1: number): boolean => x1 >= TBW.view.x0 - 20 && x0 <= TBW.view.x1 + 20;

// ---------------------------------------------------------------- the cabin (baked) ----------------------------------------------------------------
const C = { WALL: [214, 216, 220] as RGB, WALL2: [196, 200, 206] as RGB, CEIL: [226, 228, 230] as RGB, RACK: [150, 156, 166] as RGB, FRAME: [70, 76, 86] as RGB, FLOOR: [60, 64, 72] as RGB, FLOOR2: [72, 76, 86] as RGB, SEAT: [70, 92, 124] as RGB, SEAT_DK: [50, 66, 92] as RGB, SEAT_HI: [96, 120, 152] as RGB, COVER: [240, 240, 236] as RGB };
function build(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    // ---- the ceiling and the luggage racks (coats, a backpack, a rolled-up map), reading lights ----
    r(0, 0, W, 340, C.CEIL); for (let y = 280; y < 340; y += 3) r(0, y, W, 3, M(C.CEIL, C.WALL2, (y - 280) / 60));
    r(100, 330, 880, 20, C.RACK); r(100, 330, 880, 2, [190, 196, 204]); r(100, 348, 880, 2, C.FRAME); for (let x = 104; x < 976; x += 8) r(x, 340, 1, 8, [120, 126, 136]);
    for (let k = 0; k < 9; k++) { const x = 130 + k * 96 + Math.floor(h1(k * 3.1) * 30), c = ([[200, 60, 50], [40, 110, 170], [230, 190, 60], [60, 130, 80], [120, 70, 150]] as RGB[])[k % 5]; if (h1(k) > 0.3) { r(x, 318, 30, 12, c); r(x, 318, 30, 2, M(c, K.WHITE, 0.3)); r(x + 26, 322, 6, 14, M(c, [0, 0, 0], 0.2)); } else { r(x, 314, 20, 16, [90, 110, 70]); r(x + 4, 310, 12, 4, [70, 90, 56]); } } // (coats over the rack, a backpack)
    for (const rx of ROWS) { r(rx - 6, 352, 14, 5, C.FRAME); r(rx - 4, 354, 3, 2, [240, 236, 220]); r(rx + 2, 354, 3, 2, [240, 236, 220]); }
    // ---- the wall: the window frames (the view's drawn live behind them), the curtains tied back, the heater's grille along the floor ----
    r(0, 350, W, WALL - 350, C.WALL); r(0, 350, W, 1, C.FRAME);
    for (const [x0, x1] of WINS) { r(x0 - 4, WIN_Y0 - 4, x1 - x0 + 8, WIN_Y1 - WIN_Y0 + 8, C.FRAME); r(x0 - 2, WIN_Y0 - 2, x1 - x0 + 4, 1, [110, 116, 126]); }
    for (const [x0] of WINS) { for (let y = WIN_Y0 - 2; y < WIN_Y1 - 10; y++) { const w = 6 + Math.round(Math.sin(((y - WIN_Y0) / 90) * Math.PI) * 4); r(x0 - 6, y, w, 1, (y % 4) < 2 ? [120, 46, 52] : [140, 56, 62]); } r(x0 - 6, WIN_Y0 + 40, 10, 3, [230, 190, 80]); } // (the curtains, tied back)
    r(0, WALL - 16, W, 16, C.WALL2); for (let x = TBR.heater0; x < TBR.heater1; x += 4) r(x, WALL - 12, 2, 8, [150, 156, 164]); r(0, WALL - 16, W, 1, C.FRAME);
    // ---- the front: the bulkhead, the route strip, the windscreen (the road ahead goes in live), the dashboard, the door's steps ----
    r(1000, 300, 200, WALL - 300, C.WALL2); r(1000, 300, 2, WALL - 300, C.FRAME);
    r(1104, 356, 92, 96, C.FRAME); // (the windscreen's frame: the road's drawn live inside it)
    r(1110, 452, 86, 18, [40, 44, 50]); r(1120, 454, 30, 8, [20, 24, 30]); r(1160, 456, 20, 6, [70, 110, 160]); // (the dashboard)
    r(TBR.door - 22, 360, 44, WALL - 360, [70, 78, 90]); r(TBR.door - 20, 362, 40, 88, [50, 58, 70]); r(TBR.door - 1, 362, 2, 88, [110, 116, 126]); // (the door's two glass leaves: open at stops, drawn live)
    r(10, 300, 980, 10, [24, 28, 34]); // (the route strip's panel: lit live)
    // ---- the floor: the aisle's ribbed rubber, a strip of lights along it ----
    r(0, WALL, W, H - WALL, C.FLOOR); for (let y = WALL + 4; y < H; y += 6) r(0, y, W, 1, C.FLOOR2); r(80, 532, 940, 2, [90, 96, 108]);
  });
}

// ---------------------------------------------------------------- the view out ----------------------------------------------------------------
type Bump = { km: number; w: number; h: number; snow: number; flat?: boolean };
/** The mountains along the north side (heading out) and the south (heading home), by km along the road. */
const NORTH: Bump[] = [
  { km: -2, w: 16, h: 30, snow: 0.3, flat: true }, // Esja
  { km: 25, w: 12, h: 18, snow: 0.2 }, { km: 36, w: 10, h: 14, snow: 0.1 }, // Hengill, the hills above Hveragerði
  { km: 70, w: 30, h: 8, snow: 0.6 }, { km: 92, w: 18, h: 10, snow: 0.5 },
  { km: 108, w: 9, h: 32, snow: 0.55 }, // Hekla
  { km: 140, w: 24, h: 46, snow: 0.5, flat: true }, // Eyjafjallajökull
  { km: 178, w: 26, h: 42, snow: 0.62, flat: true }, // Mýrdalsjökull
];
const SOUTH: Bump[] = [
  { km: 10, w: 14, h: 10, snow: 0.1 }, // the Reykjanes hills
  { km: 128, w: 3, h: 9, snow: 0 }, { km: 134, w: 2, h: 6, snow: 0 }, { km: 138, w: 1.5, h: 5, snow: 0 }, // the Westman Islands
  { km: 176, w: 2, h: 7, snow: 0 }, // Dyrhólaey
];
const bumpH = (list: Bump[], k: number): { h: number; snow: number } => {
  let best = { h: 0, snow: 0 };
  for (const b of list) { const d = (k - b.km) / b.w; if (Math.abs(d) > 1.6) continue; const f = b.flat ? Math.max(0, 1 - Math.pow(Math.abs(d) / 1.4, 4)) : Math.max(0, 1 - Math.abs(d) * 0.75) ** 1.6; const h = b.h * f; if (h > best.h) best = { h, snow: b.snow }; }
  return best;
};
/** The rivers the road crosses (km), the stops' sight signs. */
const RIVERS = [57, 82, 94, 122, 150];
const FAR = 6, MID = 40, NEAR = 120;
function roadView(a: number, T: Tour): void {
  const g = PX.ctx, day = iceDay(), night = 1 - day, gold = iceGold(), w = iceWeather(), dir = T.dir, north = dir > 0, cx = W / 2;
  const kmAt = (x: number, scale: number): number => T.km + (dir * (x - cx)) / scale;
  const nt = (c: RGB): RGB => M(c, [10, 14, 26], 0.62 * night);
  g.save(); g.beginPath(); for (const [x0, x1] of WINS) if (seen(x0, x1)) g.rect(x0, WIN_Y0, x1 - x0, WIN_Y1 - WIN_Y0); g.clip();
  // ---- the sky: its gradient, the low sun's warmth, the sun, clouds, the northern lights ----
  const top: RGB = M([6, 12, 28], [110, 168, 220], day), low: RGB = M([18, 32, 58], [206, 228, 240], day);
  for (let y = WIN_Y0; y < HOR; y += 2) r(100, y, 880, 2, M(top, low, (y - WIN_Y0) / (HOR - WIN_Y0)));
  if (gold > 0.01) alpha(gold * 0.4, () => r(100, HOR - 20, 880, 20, [255, 180, 120]));
  if (night > 0.5) for (let k = 0; k < 40; k++) r(100 + Math.floor(h1(k * 3.3) * 880), WIN_Y0 + Math.floor(h1(k * 1.7) * 30), 1, 1, [220, 225, 250]);
  { const s = iceSun(); if (s > 0 && w.kind !== 'cloudy' && w.kind !== 'snow' && !north) { const sx = 300 + Math.round(T.km * 2) % 600; disc(sx, HOR - 12 - Math.round(s * 30), 4, M([255, 250, 220], [255, 170, 90], gold)); } }
  const au = auroraNow(); if (au.vis > 0.05 && north) drawAurora(100, 980, WIN_Y0 - 6, HOR - 4, au.kp, au.vis, a, 0.45);
  if (w.kind === 'cloudy' || w.kind === 'snow' || w.kind === 'drizzle') alpha(0.6 * w.k, () => r(100, WIN_Y0, 880, HOR - WIN_Y0, M([50, 56, 70], [176, 184, 194], day)));
  // ---- far: the mountains (north) or the sea and its islands (south), barely moving ----
  if (!north) { const sea = T.km > 40 && T.km < 190; if (sea) { r(100, HOR - 2, 880, 6, nt(IS.SEA)); for (let x = 100; x < 980; x += 9) r(x + ((Math.floor(a * 3) * 3) % 9), HOR, 4, 1, nt([200, 220, 232])); } }
  for (let x = 100; x < 980; x += 2) {
    const k = kmAt(x, FAR), b = bumpH(north ? NORTH : SOUTH, k); if (b.h < 0.5) continue;
    const hh = Math.round(b.h), y0 = HOR - hh, snowH = Math.round(hh * b.snow);
    r(x, y0, 2, hh + 2, nt(north ? M(IS.MOUNTAIN, IS.SKY_LO, 0.25) : [60, 66, 74])); if (snowH > 0) r(x, y0, 2, snowH, nt(IS.SNOW));
    // the cliffs under Eyjafjallajökull: dark, with waterfalls threading down them
    if (north && k > 118 && k < 165 && hh > 20) { r(x, HOR - 14, 2, 14, nt([66, 70, 66])); if (h1(Math.floor(k * 3)) > 0.86) lit(() => r(x, HOR - 13, 1, 13, nt([230, 240, 246]))); }
  }
  // ---- mid: the land going by: moss on lava, farmland and hay bales, greenhouses, the power station's steam, rivers, horses, sheep, farms ----
  { const ground = (k: number): RGB => (k > 9 && k < 38 ? [96, 116, 80] : k > 158 && !north ? [44, 44, 48] : w.kind === 'snow' ? [214, 222, 228] : [118, 132, 84]);
    for (let x = 100; x < 980; x += 4) { const k = kmAt(x, MID); r(x, HOR + 2, 4, WIN_Y1 - HOR - 2, nt(ground(k))); if (k > 9 && k < 38 && h1(Math.floor(k * 30)) > 0.5) r(x, HOR + 3 + Math.floor(h1(k * 7) * 8), 4, 2, nt([126, 150, 96])); }
    const s0 = Math.floor(kmAt(100, MID) * 4 * dir), s1 = Math.floor(kmAt(980, MID) * 4 * dir);
    for (let s = Math.min(s0, s1) - 1; s <= Math.max(s0, s1) + 1; s++) {
      const k = (s * dir) / 4 + 0.125, x = Math.round(cx + ((k - T.km) * MID) * dir), n = h1(s * 7.31 + (north ? 0 : 50)), y = HOR + 10 + Math.floor(h1(s * 3.7) * 18);
      if (x < 90 || x > 990) continue;
      if (k > 25 && k < 28 && north) { for (let q = 0; q < 3; q++) { r(x + q * 10, HOR - 4, 4, 14, nt([200, 204, 210])); const u = (a * 0.3 + q / 3) % 1; alpha(0.6 * (1 - u), () => disc(x + q * 10 + 2 + Math.round(u * 6), Math.round(HOR - 8 - u * 26), 3 + Math.round(u * 6), nt(K.WHITE))); } r(x - 20, HOR + 6, 60, 2, nt([160, 164, 170])); continue; } // (Hellisheiði's power station: pipes and steam)
      if (k > 38 && k < 46 && n > 0.3) { r(x, y - 8, 22, 8, nt([210, 226, 220])); for (let q = 0; q < 4; q++) r(x + 1 + q * 6, y - 10 + (q % 2), 4, 2, nt([230, 240, 236])); if (night > 0.3) { lit(() => alpha(night, () => r(x + 1, y - 7, 20, 6, [255, 210, 140]))); Gd(x + 11, y - 4, 12, [255, 200, 130], 0.4 * night); } continue; } // (Hveragerði's greenhouses: lit warm at night)
      if (RIVERS.some((rk) => Math.abs(k - rk) < 0.3)) { r(x - 10, HOR + 2, 20, WIN_Y1 - HOR, nt([70, 110, 140])); r(x - 10, HOR + 2, 20, 1, nt([180, 210, 226])); continue; }
      if (k > 158 && !north) { if (n > 0.85) r(x, y - 1, 6, 2, nt([30, 30, 34])); continue; } // (the black sand flats)
      if (k < 9 || (k > 9 && k < 38)) continue;
      if (n > 0.9) { r(x, y - 9, 14, 8, nt(IS.WHITE)); for (let q = 0; q < 5; q++) r(x - 1 + q, y - 13 + q, 16 - q * 2, 1, nt(IS.ROOF_RED)); r(x + 18, y - 7, 10, 6, nt([170, 60, 50])); if (night > 0.3) lit(() => alpha(night, () => r(x + 3, y - 6, 3, 3, [255, 210, 140]))); } // (a farm)
      else if (n > 0.72) { for (let q = 0; q < 3 + (s % 3); q++) { oval(x + q * 6, y - 2, 3, 2, nt([236, 238, 240])); r(x + q * 6 - 1, y - 3, 2, 1, nt(K.WHITE)); } } // (hay bales in white plastic: tractor eggs)
      else if (n > 0.6) { for (let q = 0; q < 3; q++) { const hx = x + q * 9, hc = nt(([[120, 74, 46], [40, 34, 32], [214, 200, 170]] as RGB[])[(((s + q) % 3) + 3) % 3]); r(hx, y - 5, 6, 3, hc); r(hx + (dir > 0 ? 5 : -1), y - 7, 2, 3, hc); r(hx, y - 2, 1, 2, hc); r(hx + 5, y - 2, 1, 2, hc); r(hx + (dir > 0 ? 4 : 0), y - 7, 2, 1, nt([30, 26, 24])); } } // (Icelandic horses, their manes)
      else if (n > 0.48) { for (let q = 0; q < 4; q++) r(x + q * 5 + (q % 2), y - 2 - (q % 2), 3, 2, nt(q === 2 ? [50, 44, 40] : [236, 232, 222])); } // (sheep)
    }
  }
  // ---- near: the verge flicking past, its yellow snow poles, the fence, a one-lane bridge sign, the ⌘ sign before a stop ----
  r(100, WIN_Y1 - 8, 880, 8, nt(w.kind === 'snow' ? [220, 226, 232] : [100, 112, 76]));
  { const step = 30, off = ((T.km * NEAR * dir) % step + step) % step; for (let x = 100 - off; x < 980; x += step) { r(Math.round(x), WIN_Y1 - 22, 2, 18, nt([236, 196, 40])); r(Math.round(x), WIN_Y1 - 22, 2, 3, nt([30, 30, 34])); } }
  { const step = 11, off = ((T.km * NEAR * dir) % step + step) % step; for (let x = 100 - off; x < 980; x += step) r(Math.round(x), WIN_Y1 - 14, 1, 8, nt([110, 96, 80])); r(100, WIN_Y1 - 12, 880, 1, nt([150, 150, 150])); }
  for (const rk of RIVERS) { const x = Math.round(cx + (rk - 0.4 - T.km) * NEAR * dir); if (x > 80 && x < 1000) { r(x, WIN_Y1 - 30, 2, 24, nt([90, 94, 100])); r(x - 9, WIN_Y1 - 42, 20, 14, nt([250, 210, 60])); txt('1', x - 1, WIN_Y1 - 38, nt([30, 30, 34])); } } // (EINBREIÐ BRÚ: a one-lane bridge ahead)
  for (let s = 1; s < STOP_KM.length; s++) { const x = Math.round(cx + (STOP_KM[s] - 0.5 - T.km) * NEAR * dir); if (x > 60 && x < 1040) { r(x, WIN_Y1 - 30, 2, 24, nt([90, 94, 100])); r(x - 12, WIN_Y1 - 42, 26, 14, nt([126, 84, 52])); r(x - 9, WIN_Y1 - 39, 8, 8, nt(K.WHITE)); r(x - 7, WIN_Y1 - 37, 4, 4, nt([126, 84, 52])); } }
  // the weather on the glass: snow streaking past, rain running down
  if (w.kind === 'snow' || w.kind === 'gale') for (let q = 0; q < 60; q++) { const x = 100 + ((h1(q) * 880 - a * (T.phase === 'drive' ? 300 : 30) * dir) % 880 + 880) % 880, y = WIN_Y0 + (h1(q * 3) * 90 + a * 30) % 90; r(Math.round(x), Math.round(y), 2, 1, [240, 244, 250]); }
  if (w.kind === 'drizzle') for (let q = 0; q < 30; q++) { const x = 100 + h1(q * 2.1) * 880, y = WIN_Y0 + ((h1(q * 5.3) * 90 + a * 12) % 90); alpha(0.5, () => r(Math.round(x), Math.round(y), 1, 4, [200, 214, 230])); }
  g.restore();
  // ---- the windscreen: the road ahead, its yellow edge lines running away, the snow poles coming at you ----
  if (seen(1100, 1200)) {
    g.save(); g.beginPath(); g.rect(1108, 360, 84, 88); g.clip();
    for (let y = 360; y < HOR + 2; y += 2) r(1108, y, 84, 2, M(top, low, (y - 360) / (HOR - 360)));
    r(1108, HOR + 2, 84, 448 - HOR, nt(w.kind === 'snow' ? [210, 216, 224] : [100, 112, 76]));
    for (let y = HOR + 2; y < 448; y++) { const u = (y - HOR) / (448 - HOR), hw = 4 + u * 40; r(Math.round(1150 - hw), y, Math.round(hw * 2), 1, nt([64, 66, 72])); r(Math.round(1150 - hw), y, 1, 1, nt([230, 200, 60])); r(Math.round(1150 + hw - 1), y, 1, 1, nt([230, 200, 60])); }
    const go = T.phase === 'drive' ? a * 1.4 : 0; for (let q = 0; q < 3; q++) { const u = (go + q / 3) % 1, y = HOR + 2 + u * u * (448 - HOR), hw = 4 + u * u * 40 + 6 * u; r(Math.round(1150 - hw - 2), Math.round(y - 6 * u * u), 1, Math.max(1, Math.round(8 * u * u)), nt([236, 196, 40])); r(Math.round(1150 + hw + 2), Math.round(y - 6 * u * u), 1, Math.max(1, Math.round(8 * u * u)), nt([236, 196, 40])); }
    if (night > 0.3) alpha(0.25 * night, () => { for (let y = HOR + 6; y < 448; y++) { const u = (y - HOR) / (448 - HOR), hw = 10 + u * 30; r(Math.round(1150 - hw), y, Math.round(hw * 2), 1, [255, 240, 200]); } }); // (the headlights on the road)
    g.restore();
  }
}

// ---------------------------------------------------------------- live ----------------------------------------------------------------
const STEFAN = { c: 7, hat: 18, face: 0, fit: 13, sp: 0 };
function drawBack(a: number): void {
  const T = tour(), night = 1 - iceDay(), open = T.phase === 'stop';
  roadView(a, T);
  // the route strip over the windows: the stops as dots, the bus's place between them, the next stop's name
  if (seen(10, 990)) lit(() => {
    const x0 = 40, x1 = 940, X = (km: number) => x0 + (km / 182) * (x1 - x0);
    r(x0, 304, x1 - x0, 1, [90, 110, 140]);
    STOPS.forEach((_, s) => { const x = Math.round(X(STOP_KM[s])); r(x - 2, 302, 5, 5, s === T.to && !open ? [255, 210, 80] : [140, 160, 190]); });
    const bx = Math.round(X(T.km)); r(bx - 3, 301, 7, 7, [124, 242, 156]); if ((a * 2) % 1 < 0.5) r(bx - 1, 303, 3, 3, K.WHITE);
    const msg = open ? 'AT ' + STOP_NAMES[T.from] + ' · DOORS OPEN' : 'NEXT STOP: ' + STOP_NAMES[T.to]; txt(msg, 960 - tw(msg), 302, open ? [124, 242, 156] : [255, 210, 80]);
  });
  // the door: its glass leaves fold open at a stop
  if (seen(TBR.door - 30, TBR.door + 30)) {
    if (open) { r(TBR.door - 20, 362, 40, 88, [30, 34, 40]); r(TBR.door - 20, 362, 6, 88, [90, 110, 130]); r(TBR.door + 14, 362, 6, 88, [90, 110, 130]); alpha(0.6, () => r(TBR.door - 14, 380, 28, 70, M([200, 210, 220], [30, 40, 60], night))); lit(() => r(TBR.door - 4, 354, 8, 3, [124, 242, 156])); }
    else alpha(0.35, () => r(TBR.door - 20, 362, 40, 88, M([150, 180, 200], [20, 30, 50], night)));
  }
  // the heater's warm glow along the floor, the aisle's lights at night
  if (seen(0, W)) { G(TBR.heater0, WALL - 20, TBR.heater1 - TBR.heater0, 24, [255, 150, 80], 0.06 + 0.06 * night); if (night > 0.3) lit(() => { for (let x = 100; x < 1000; x += 40) r(x, 534, 3, 1, [120, 170, 255]); }); }
  // STEFÁN at the wheel (he waves when someone says hello), the steering wheel
  if (seen(TBR.driver - 40, TBR.driver + 40)) {
    const P = basePose(1); P.sy = 0.96; if (PX.ctx && performance.now() / 1000 - TBW.wave < 2) { P.arm = 'wave'; P.wave = Math.sin(a * 12) * 2; }
    oval(TBR.driver, 506, 22, 6, [40, 44, 52]); r(TBR.driver - 18, 470, 8, 34, [50, 60, 80]); // (his seat)
    stampCritter(STEFAN, P, TBR.driver, 500, night * 0.3);
    r(TBR.driver + 14, 470, 3, 22, [40, 40, 44]); oval(TBR.driver + 16, 468, 3, 9, [30, 30, 34]); // (the wheel)
  }
}
/** Each row: the window seat (further back) and the aisle seat, in profile facing the front; white headrest covers. */
const seatRow = (rx: number): Prop[] => (['win', 'aisle'] as const).map((L) => { const y = SEAT_Y[L]; return { y: y + 2, draw() {
  if (!seen(rx - 40, rx + 50)) return;
  const x = rx + (L === 'aisle' ? 6 : 0), night = 1 - iceDay(), dim = (c: RGB): RGB => M(c, [10, 14, 26], 0.3 * night), sd = dim(L === 'aisle' ? C.SEAT : M(C.SEAT, C.SEAT_DK, 0.35)), sh = dim(L === 'aisle' ? C.SEAT_HI : C.SEAT);
  for (let k = 0; k < 50; k += 2) r(x - 24 + Math.round(k * 0.1), y - 54 + k, 12, 2, k < 14 ? dim(C.COVER) : sd); // (the back and its headrest cover)
  for (let k = 0; k < 4; k++) r(x - 24 + Math.floor(h1(rx + k) * 10), y - 52 + k * 3, 1, 1, dim([150, 160, 176])); // (the moquette's flecks)
  r(x - 14, y - 14, 36, 10, sd); r(x - 14, y - 14, 36, 2, sh); r(x + 20, y - 24, 4, 12, dim(C.SEAT_DK)); r(x + 16, y - 24, 12, 3, dim([60, 64, 72]));
  r(x - 10, y - 4, 3, 4, dim([90, 96, 108])); r(x + 14, y - 4, 3, 4, dim([90, 96, 108]));
} }; });
const katlaMic: Prop = { y: 498, draw() { if (!seen(TBR.katla - 20, TBR.katla + 20)) return; r(TBR.katla + 10, 440, 2, 50, [60, 64, 72]); disc(TBR.katla + 11, 438, 3, [30, 30, 34]); } };
export const TBSPOT = { SEAT0: 0 };
export const TOURBUS_SPOTS: Spot[] = ROWS.flatMap((rx) => (['win', 'aisle'] as const).map((L): Spot => {
  const x = rx + (L === 'aisle' ? 6 : 0) + 10, y = SEAT_Y[L] + 1;
  return { kind: 'sit', x, y, sx: x, sy: L === 'win' ? 528 : 540, lift: 10, label: L === 'win' ? 'WINDOW SEAT' : 'SIT', area: { x0: x - 22, y0: y - 52, x1: x + 18, y1: y + 2 } };
}));
/** Where the door at the front takes you: off at the stop the bus is at (and nowhere while it's driving). */
function doorRoute(): { to: RoomId; arrive: { x: number; y: number }; label: string } | null {
  const T = tour(); if (T.phase !== 'stop') return null;
  const id = STOPS[T.from]; return { to: id, arrive: STOP_ARRIVE[id], label: 'GET OFF: ' + STOP_NAMES[T.from] };
}
export function makeTourbus(): Room {
  const room: Room = {
    id: 'tourbus', title: 'THE ICELAND EXPLORER', sub: 'THE TOUR BUS',
    w: W, h: H,
    lookAt: (x0, x1) => { const keep = TBW.view; TBW.view = { x0, x1 }; return () => { TBW.view = keep; }; },
    floor: { x0: 60, y0: FL0, x1: 1110, y1: FL1 },
    blockers: [
      ...ROWS.map((rx) => ({ x0: rx - 26, y0: SEAT_Y.win - 8, x1: rx + 28, y1: SEAT_Y.aisle + 2 })),
      { x0: TBR.driver - 26, y0: FL0, x1: W, y1: 530 }, // the driver's cab
    ],
    doors: [{ trigger: { x0: TBR.door - 16, y0: FL0, x1: TBR.door + 16, y1: FL0 + 10 }, to: 'reykjavik', arrive: STOP_ARRIVE.reykjavik, label: 'THE DOOR', area: { x0: TBR.door - 22, y0: 360, x1: TBR.door + 22, y1: WALL }, route: doorRoute }],
    spots: TOURBUS_SPOTS, inUse: new Map(),
    spawn: { ...TB_ARRIVE },
    dim: 0.04,
    dimNow: () => 0.04 + 0.25 * (1 - iceDay()),
    fillTop: 'rgb(226,228,230)', fillLow: 'rgb(60,64,72)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [...ROWS.flatMap(seatRow), katlaMic],
  };
  return room;
}
/** At a stop (for the features): is the bus's door open right now? */
export const doorsOpen = (): boolean => busAt(tour().from) && tour().phase === 'stop';
void line; void clamp;
