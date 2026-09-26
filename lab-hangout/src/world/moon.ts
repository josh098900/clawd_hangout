// THE MOON: the lunar lander's timetable (from the wall clock, like the rocket's: everyone sees the same
// landing without a message), the lander itself, and the Moon's surface. Low gravity out here (you bound
// about, SPACE is a big slow jump), and no air (helmets on; pets wait inside, except the MOON ROVER).
// Left to right across the surface:
//   the LANDING PAD (the lander parks here; its hatch is the way home),
//   COSMO's FLAG (the critter from the Cinema's film planted it: see the telescope's Moon, and sky.ts),
//   the MOON BASE (the habitat dome, the airlock in, the greenhouse dome, solar panels, the radio dish),
//   the BUGGY GARAGE (E = drive a moon buggy; the lap course is marked out with GATES),
//   the CRYSTAL FIELD (moon rocks glowing in the dust: mine one, carry it to the base's ASSAY machine).
// The lander's loop (L_CYCLE s):
//   k = 0    DOCKED at the Space Station   'docked'  boarding there (its hatch opens onto the station's LANDER BAY)
//   k = 150  UNDOCK, down to the Moon      'down'    coast (weightless), then the braking burn and touchdown
//   k = 210  ON THE PAD                    'landed'  its hatch opens onto the Moon
//   k = 540  LIFTOFF, back up              'up'      the burn, the coast, docking at k = 600 (= 0)

import { K, MN, SK, type RGB } from '../engine/palette';
import { r, disc, oval, line, txt, tw, lit, Gd, Gsoft, M, shade, puff, mk, bake, arrowDown } from '../engine/pixel';
import { clamp, eIO, eOut, h1 } from '../engine/math';
import { drawEarth, starfield, twinkles, vnoise } from './space';
import type { Door, Prop, Room, Spot } from './room';
import type { StateMsg } from '../net/transport';
import { drawBuggy } from '../entities/avatar';

// ---------- the lander's timetable ----------
export const L_CYCLE = 600, L_UNDOCK = 150, L_TOUCH = 210, L_LIFT = 540, L_TRIP = 60;
/** Dev/tests: shift this browser's lander clock (s). */
export const LANDER = { skew: 0 };
export type LanderPhase = 'docked' | 'down' | 'landed' | 'up';
/** Where the lander is: `k` = seconds into the loop, `d` = seconds into this phase, `left` = seconds left in it, `n` = which trip. */
export interface LFlight { phase: LanderPhase; k: number; d: number; left: number; n: number }
export function lander(nowMs = Date.now()): LFlight {
  const s = nowMs / 1000 + LANDER.skew, n = Math.floor(s / L_CYCLE), k = s - n * L_CYCLE;
  if (k < L_UNDOCK) return { phase: 'docked', k, d: k, left: L_UNDOCK - k, n };
  if (k < L_TOUCH) return { phase: 'down', k, d: k - L_UNDOCK, left: L_TOUCH - k, n };
  if (k < L_LIFT) return { phase: 'landed', k, d: k - L_TOUCH, left: L_LIFT - k, n };
  return { phase: 'up', k, d: k - L_LIFT, left: L_CYCLE - k, n };
}
/** Weightless in the lander: the coast between the burns. */
export const landerFloats = (f = lander()): boolean => (f.phase === 'down' && f.d > 5 && f.d < 36) || (f.phase === 'up' && f.d > 22 && f.d < 56);
/** G-force (0..1) in the lander: the braking burn on the way down, the burn off the Moon on the way up. */
export function landerG(f = lander()): number {
  if (f.phase === 'down' && f.d >= 36) return f.d < 58 ? 0.35 : 0;
  if (f.phase === 'up' && f.d < 22) return f.d < 2 ? f.d / 2 * 0.5 : 0.5;
  return 0;
}
/** How hard the lander shakes (0..1). */
export function landerShake(f = lander()): number {
  if (f.phase === 'down') { if (f.d < 0.6) return 0.4; if (f.d > 36 && f.d < 38) return 0.5; if (f.d > 52) return f.d > 59 ? 1 : 0.35; return 0; }
  if (f.phase === 'up') { if (f.d < 3) return 0.9; if (f.d < 22) return 0.3; if (f.d > 59 && f.d < 59.6) return 0.7; return 0; }
  if (f.phase === 'docked' && f.left < 2.5) return 0.3;
  return 0;
}

// ---------- the lander (LUNA 1): a gold-foil descent stage on four legs, a white cabin on top ----------
/**
 * The lander with its footpads on y `base`, centred on x. `flame` 0..1 = the descent engine,
 * `hatch` = its front hatch lit (open). About 104 px tall, 96 across the footpads.
 */
export function drawLander(cx: number, base: number, a: number, flame: number, hatch: boolean): void {
  cx = Math.round(cx); base = Math.round(base);
  if (flame > 0) {
    lit(() => { const f = Math.floor(a * 24) % 3, L = Math.round(10 + flame * 22 + f * 2); for (let j = 0; j < L; j++) { const w = Math.max(1, Math.round((6 - j * 0.14) * (0.7 + flame * 0.4))) + (j % 3 === f ? 1 : 0); r(cx - w, base - 20 + j, w * 2, 1, j < 4 ? SK.FLAME_HI : M(SK.FLAME, [180, 200, 255], j / L)); } });
    Gsoft(cx, base - 6, 8, 34 + flame * 20, [255, 210, 160], 0.25 + flame * 0.2);
  }
  // the legs: the two at the sides splay out, the front and back ones are foreshortened
  const leg: RGB = SK.HULL_DK, legHi: RGB = SK.HULL_SH;
  for (const s of [-1, 1]) {
    line(cx + s * 30, base - 42, cx + s * 46, base - 3, leg, 2); line(cx + s * 30, base - 42, cx + s * 45, base - 4, legHi);
    line(cx + s * 22, base - 30, cx + s * 42, base - 12, leg); // the strut
    oval(cx + s * 46, base - 1, 5, 2, SK.HULL_SH); r(cx + s * 46 - 5, base - 1, 10, 1, SK.HULL_DK);
  }
  r(cx - 13, base - 30, 2, 26, leg); r(cx + 11, base - 30, 2, 26, leg); oval(cx - 12, base - 3, 3, 1, SK.HULL_SH); oval(cx + 12, base - 3, 3, 1, SK.HULL_SH);
  // the engine bell
  for (let j = 0; j < 9; j++) { const w = 5 + Math.round(j * 0.6); r(cx - w, base - 30 + j, w * 2, 1, j > 6 ? SK.TRIM : SK.HULL_DK); }
  // the descent stage: an octagonal box wrapped in crinkly gold foil
  const x0 = cx - 34, y0 = base - 60, w = 68, h = 30;
  r(x0 + 3, y0, w - 6, h, SK.GOLD_FOIL); r(x0, y0 + 3, w, h - 6, SK.GOLD_FOIL);
  for (let k = 0; k < 26; k++) r(x0 + 2 + Math.floor(h1(k * 3.1) * (w - 6)), y0 + 2 + Math.floor(h1(k * 7.7) * (h - 5)), 2 + Math.floor(h1(k) * 4), 1, h1(k * 1.3) > 0.5 ? SK.GOLD_FOIL_HI : shade(SK.GOLD_FOIL, 0.8));
  r(x0 + 3, y0, w - 6, 2, SK.GOLD_FOIL_HI); r(x0 + w - 5, y0 + 3, 5, h - 6, shade(SK.GOLD_FOIL, 0.72)); r(x0 + 3, y0 + h - 2, w - 6, 2, shade(SK.GOLD_FOIL, 0.6));
  r(cx - 1, y0, 2, h, shade(SK.GOLD_FOIL, 0.75)); // the seam down the middle
  // the ladder down the front leg, to the pad
  for (let y = y0 + h; y < base - 4; y += 4) r(cx - 5, y, 10, 1, SK.HULL_SH); r(cx - 6, y0 + h, 1, base - y0 - h - 4, SK.HULL_DK); r(cx + 5, y0 + h, 1, base - y0 - h - 4, SK.HULL_DK);
  // the cabin: faceted, white, lit from the top-left
  const cy0 = base - 100, ch = 40;
  for (let j = 0; j < ch; j++) { const hw = j < 8 ? 18 + j : j > ch - 6 ? 26 - (j - (ch - 6)) : 26; r(cx - hw, cy0 + j, hw * 2, 1, SK.HULL); r(cx - hw, cy0 + j, 2, 1, SK.HULL_HI); r(cx + hw - 6, cy0 + j, 6, 1, SK.HULL_SH); }
  r(cx - 18, cy0, 36, 2, SK.HULL_HI); r(cx - 26, cy0 + 22, 52, 1, SK.SEAM); r(cx - 26, cy0 + 8, 1, 30, SK.SEAM);
  // the triangular windows (someone's looking out) and the hatch
  for (const s of [-1, 1]) { const wx = cx + s * 12; for (let j = 0; j < 7; j++) { const ww = 7 - j; r(s < 0 ? wx - 4 : wx - 3 + j, cy0 + 9 + j, ww, 1, SK.WINDOW); } }
  lit(() => { r(cx - 15, cy0 + 10, 2, 1, SK.GLASS_HI); r(cx + 9, cy0 + 10, 2, 1, SK.GLASS); });
  const hx = cx - 8, hy = cy0 + 24;
  r(hx - 1, hy - 1, 18, 15, SK.TRIM);
  if (hatch) { lit(() => { r(hx, hy, 16, 13, [255, 226, 170]); r(hx, hy + 10, 16, 3, [230, 196, 140]); }); Gd(cx, hy + 6, 12, [255, 214, 150], 0.3); }
  else { r(hx, hy, 16, 13, SK.PANEL); r(hx, hy, 16, 1, SK.HULL_HI); r(hx + 14, hy, 2, 13, SK.HULL_SH); r(hx + 11, hy + 6, 2, 2, SK.TRIM); }
  // thruster quads on the shoulders, the dish and the antenna
  for (const s of [-1, 1]) { r(cx + s * 28 - 3, cy0 + 12, 6, 6, SK.HULL_DK); r(cx + s * 32 - 1, cy0 + 13, 3, 2, SK.TRIM); r(cx + s * 28 - 1, cy0 + 8, 2, 3, SK.TRIM); }
  line(cx + 14, cy0, cx + 18, cy0 - 10, SK.HULL_DK); r(cx + 14, cy0 - 14, 10, 4, SK.HULL_SH); r(cx + 14, cy0 - 14, 10, 1, SK.HULL_HI);
  r(cx - 14, cy0 - 12, 1, 12, SK.HULL_DK); lit(() => r(cx - 15, cy0 - 13, 3, 2, (a % 1.2) < 0.4 ? SK.LED_RED : shade(SK.LED_RED, 0.4)));
  txt('LUNA 1', cx - tw('LUNA 1') / 2, y0 + 12, SK.TRIM);
}

// ---------- the surface ----------
const W = 1800, H = 760, HOR = 404;
export const PAD_X = 190, PAD_Y = 462;
/** Where you step out of the lander, and out of the base's airlock. */
export const MOON_PAD_ARRIVE = { x: PAD_X, y: 500 }, MOON_AIRLOCK_ARRIVE = { x: 792, y: 500 };
const HAB_X = 792, HAB_R = 112, GREEN_X = 1004, GREEN_R = 78, GARAGE_X = 1194, FLAG_X = 452, SUN = { x: 96, y: 300 }, EARTH = { x: 1004, y: 318, r: 36 }; // (Earth hangs over the greenhouse)
/** Craters (centre x, y, radius across): the buggy bounces over their rims. */
const CRATERS: [number, number, number][] = [[560, 640, 70], [1110, 690, 48], [1480, 560, 90], [330, 560, 36], [900, 610, 30], [1690, 700, 56], [700, 520, 24], [1300, 640, 28]];
/** Boulders (x, y, size): they block walking and driving. */
const BOULDERS: [number, number, number][] = [[1380, 690, 16], [1620, 590, 20], [620, 540, 11], [1040, 560, 9], [260, 700, 13], [1760, 500, 12]];
/** The glowing moon rocks you can mine (they grow back: see rockThere). */
export const ROCKS: [number, number][] = [[1360, 520], [1440, 640], [1560, 500], [1540, 700], [1690, 580], [1760, 660], [980, 660]];
export const ROCK_S = 150;
/** The buggy course: START/FINISH, then gates 1..4 in order, then back to the start. */
export const GATES: [number, number][] = [[1194, 540], [1620, 690], [1740, 530], [600, 700], [300, 620]];
/** Shared: the rocks mined (key -> when, s) and the fastest buggy lap. main.ts / features/moon.ts fill it in. */
export const MOON = { mined: new Map<number, number>(), best: null as { name: string; ms: number } | null, /** the gate you're driving to next (-1: not racing) */ next: -1 };
/** Rock i's current growth slot (each rock has its own offset, so they don't all come back at once). */
export const rockKey = (i: number, T = Date.now() / 1000): number => Math.floor((T + i * 41) / ROCK_S) * 16 + i;
export const rockThere = (i: number, T = Date.now() / 1000): boolean => !MOON.mined.has(rockKey(i, T));
/** Seconds until rock i grows back. */
export const rockBack = (i: number, T = Date.now() / 1000): number => ROCK_S - ((T + i * 41) % ROCK_S);
/** How high the buggy bounces at (x, y): the crater rims are bumps (the same in every browser). */
export function bumpAt(x: number, y: number): number {
  let b = 0;
  for (const [cx, cy, rad] of CRATERS) { const u = (x - cx) / rad, v = (y - cy) / (rad * 0.36), d = Math.sqrt(u * u + v * v); if (Math.abs(d - 1) < 0.22) b = Math.max(b, (1 - Math.abs(d - 1) / 0.22) * 7); }
  return b;
}

function crater(cx: number, cy: number, rad: number): void {
  const ry = rad * 0.36;
  for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) for (let x = Math.floor(cx - rad - 3); x <= cx + rad + 3; x++) {
    const u = (x - cx) / rad, v = (y - cy) / ry, d = u * u + v * v;
    if (d <= 1) { const lx = u + 0.34, ly = v + 0.42, lit2 = lx * lx + ly * ly > 1; r(x, y, 1, 1, lit2 ? MN.REG : h1(x * 3.1 + y) > 0.9 ? MN.REG_DK2 : MN.REG_DK); }
    else if (d <= 1.16) r(x, y, 1, 1, u + v < 0 ? MN.REG_HI : MN.REG_DK); // the rim: lit on its top-left
  }
}
function boulder(x: number, y: number, s: number): void {
  for (let j = 0; j < 14; j++) r(x + s - 2 + j * 2, y - 2, 6, 3, MN.REG_SH); // its long shadow, away from the sun
  for (let j = -s; j <= 0; j++) { const w = Math.round(Math.sqrt(s * s - j * j) * 1.2); r(x - w, y + j - 1, w * 2, 1, j < -s * 0.5 ? MN.REG_HI : MN.REG); r(x + w - Math.max(2, Math.round(w * 0.4)), y + j - 1, Math.max(2, Math.round(w * 0.4)), 1, MN.REG_DK); }
  r(x - Math.round(s * 0.6), y - s, Math.max(2, Math.round(s * 0.5)), 2, K.WHITE);
}
/** A dome: a half-disc of glass (or panels) sitting on y `base`. */
function dome(cx: number, base: number, rad: number, glass: boolean): void {
  for (let j = 0; j <= rad; j++) {
    const hw = Math.round(Math.sqrt(rad * rad - j * j) * 1.15), y = base - j;
    const c = glass ? M(MN.DOME_DK, MN.DOME, 0.35 + 0.4 * (j / rad)) : j % 12 === 0 ? MN.BASE_SH : MN.BASE;
    r(cx - hw, y, hw * 2, 1, c); r(cx - hw, y, 2, 1, glass ? MN.DOME_HI : MN.BASE_HI); r(cx + hw - Math.max(3, Math.round(hw * 0.28)), y, Math.max(3, Math.round(hw * 0.28)), 1, glass ? MN.DOME_DK : MN.BASE_SH);
  }
  // the ribs
  for (let k = 1; k < 6; k++) { const an = (k / 6) * Math.PI; for (let t = 0; t < rad; t += 1) { const x = Math.round(cx - Math.cos(an) * t * 1.15), y = Math.round(base - Math.sin(an) * t); r(x, y, 1, 1, glass ? MN.DOME_DK : MN.BASE_SH); } }
}
function build(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    // the black sky, the sun low on the left, and a lot of stars (no air to hide them)
    r(0, 0, W, HOR + 20, SK.VOID); starfield(0, 0, W, HOR, 520, 23);
    disc(SUN.x, SUN.y, 16, [255, 250, 232]); disc(SUN.x, SUN.y, 12, K.WHITE);
    // the far hills (the near ones in front), each ridge lit on its sunward slopes
    for (const [base, amp, sc, c, seed] of [[HOR - 6, 46, 240, MN.HILL3, 5], [HOR + 6, 30, 130, MN.HILL2, 9], [HOR + 18, 16, 70, MN.HILL, 13]] as [number, number, number, RGB, number][]) {
      let prev = 0;
      for (let x = 0; x < W; x += 2) {
        const h = Math.round(base - vnoise(x / sc, seed, 1e6, seed) * amp - vnoise(x / (sc / 3), seed * 2, 1e6, seed + 1) * amp * 0.3);
        r(x, h, 2, H - h, c); r(x, h, 2, 1, h < prev ? M(c, K.WHITE, 0.25) : shade(c, 0.8)); prev = h;
      }
    }
    // the ground: regolith, speckled, a little darker far away
    for (let y = HOR + 30; y < H; y += 2) r(0, y, W, 2, M(MN.REG2, MN.REG, clamp((y - HOR) / 260, 0, 1)));
    for (let k = 0; k < 9000; k++) { const x = Math.floor(h1(k * 1.37) * W), y = HOR + 30 + Math.floor(h1(k * 2.71) * (H - HOR - 30)), c = h1(k * 5.3); r(x, y, h1(k) > 0.8 ? 2 : 1, 1, c > 0.7 ? MN.REG_HI : c > 0.35 ? MN.REG_DK : MN.REG2); }
    for (const [cx, cy, rad] of CRATERS) crater(cx, cy, rad);
    // the crystal field: darker, glassy ground
    for (let k = 0; k < 400; k++) { const x = 1310 + Math.floor(h1(k * 3.9) * 480), y = 480 + Math.floor(h1(k * 1.9) * 250); r(x, y, 2, 1, h1(k * 7) > 0.8 ? MN.CRYSTAL_DK : MN.REG_DK2); }
    // tyre tracks round the buggy course (faint)
    for (let g = 0; g < GATES.length; g++) { const [x0, y0] = GATES[g], [x1, y1] = GATES[(g + 1) % GATES.length], n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 6); for (let k = 0; k < n; k++) { const u = k / n, x = Math.round(x0 + (x1 - x0) * u), y = Math.round(y0 + (y1 - y0) * u + Math.sin(u * 9 + g) * 10); r(x, y - 4, 3, 1, MN.REG_DK); r(x, y + 4, 3, 1, MN.REG_DK); } }
    // ---- the LANDING PAD ----
    oval(PAD_X, PAD_Y + 4, 110, 18, SK.CONCRETE_DK); oval(PAD_X, PAD_Y + 2, 106, 16, SK.CONCRETE); oval(PAD_X, PAD_Y + 2, 70, 10, SK.CONCRETE2);
    for (let x = PAD_X - 60; x < PAD_X + 60; x += 12) r(x, PAD_Y + 2, 6, 1, SK.HAZ);
    txt('LANDER PAD', PAD_X - tw('LANDER PAD') / 2, PAD_Y + 12, SK.CONCRETE_DK);
    // ---- COSMO's FLAG, and its plaque; a trail of little footprints ----
    for (let k = 0; k < 22; k++) { const x = FLAG_X - 150 + k * 9, y = 470 + Math.round(Math.sin(k * 0.5) * 6) + (k % 2) * 3; r(x, y, 3, 2, MN.REG_DK2); }
    r(FLAG_X, 408, 2, 64, K.WHITE); r(FLAG_X + 1, 408, 1, 64, SK.HULL_SH); r(FLAG_X, 408, 30, 2, K.WHITE); // the pole, and the bar that holds it out (no wind)
    r(FLAG_X + 2, 410, 28, 18, K.MAG); r(FLAG_X + 2, 410, 28, 2, M(K.MAG, K.WHITE, 0.3)); r(FLAG_X + 26, 410, 4, 18, shade(K.MAG, 0.75));
    txt('C', FLAG_X + 13, 416, K.WHITE);
    r(FLAG_X + 34, 458, 34, 14, SK.TRIM); r(FLAG_X + 35, 459, 32, 12, SK.GOLD_FOIL); txt('COSMO', FLAG_X + 51 - tw('COSMO') / 2, 460, SK.TRIM); txt('WAS HERE', FLAG_X + 51 - tw('WAS HERE') / 2, 466, shade(SK.TRIM, 1.3));
    // ---- the MOON BASE: solar panels, the habitat and greenhouse domes, the tube between them, the airlock ----
    for (let k = 0; k < 4; k++) { const x = 560 + k * 26; r(x, 404, 22, 30, SK.SOLAR); for (let j = 0; j < 30; j += 6) r(x, 404 + j, 22, 1, SK.SOLAR_LN); r(x, 404, 22, 1, SK.SOLAR_HI); r(x + 10, 434, 2, 34, SK.HULL_DK); }
    r(HAB_X + 60, 430, GREEN_X - HAB_X - 80, 26, MN.BASE2); r(HAB_X + 60, 430, GREEN_X - HAB_X - 80, 2, MN.BASE_HI); r(HAB_X + 60, 452, GREEN_X - HAB_X - 80, 4, MN.BASE_SH);
    dome(GREEN_X, 468, GREEN_R, true); dome(HAB_X, 468, HAB_R, false);
    r(HAB_X - HAB_R - 16, 460, (HAB_R + 16) * 2, 10, MN.BASE_DK); r(GREEN_X - GREEN_R - 10, 462, (GREEN_R + 10) * 2, 8, MN.BASE_DK);
    r(HAB_X - 70, 396, 140, 6, MN.ORANGE); r(HAB_X - 70, 402, 140, 1, MN.ORANGE_DK); txt('MOON BASE', HAB_X - tw('MOON BASE', 2) / 2, 380, MN.ORANGE, 2);
    // the airlock (the lit door itself is drawn live)
    r(HAB_X - 26, 416, 52, 54, MN.BASE_DK); r(HAB_X - 22, 420, 44, 50, MN.BASE_SH);
    for (let x = HAB_X - 26; x < HAB_X + 26; x += 8) r(x, 410, 4, 6, SK.HAZ); r(HAB_X - 26, 410, 52, 1, SK.HAZ_DK);
    txt('AIRLOCK', HAB_X - tw('AIRLOCK') / 2, 404, MN.BASE_DK);
    // the radio mast (its dish turns: drawn live)
    r(1082, 300, 3, 168, SK.HULL_DK); for (let y = 310; y < 468; y += 14) line(1076, y, 1090, y + 12, SK.HULL_SH); r(1070, 464, 28, 4, SK.HULL_DK);
    // ---- the BUGGY GARAGE ----
    r(GARAGE_X - 70, 392, 140, 10, MN.ORANGE); r(GARAGE_X - 70, 392, 140, 2, M(MN.ORANGE, K.WHITE, 0.3)); r(GARAGE_X - 70, 402, 140, 3, MN.ORANGE_DK);
    for (const x of [GARAGE_X - 66, GARAGE_X + 62]) { r(x, 402, 4, 66, SK.HULL_SH); r(x, 402, 1, 66, SK.HULL_HI); }
    r(GARAGE_X - 60, 405, 120, 60, shade(MN.REG_DK2, 0.8)); txt('MOON BUGGY', GARAGE_X - tw('MOON BUGGY') / 2, 395, K.WHITE);
  });
}
/** A moon rock: a knot of glowing crystals half-buried in the dust (it pulses; purple ones are rarer-looking). */
export function drawCrystal(x: number, y: number, a: number, purple: boolean, sc = 1): void {
  const c = purple ? MN.CRYSTAL2 : MN.CRYSTAL, dk = purple ? shade(MN.CRYSTAL2, 0.6) : MN.CRYSTAL_DK, p = 0.5 + 0.5 * Math.sin(a * 2.4 + x);
  const S = (n: number) => Math.max(1, Math.round(n * sc));
  r(x - S(10), y - S(2), S(20), S(3), MN.REG_DK); // the rock it grows out of
  lit(() => {
    for (const [dx, h, w] of [[-6, 10, 3], [-2, 16, 4], [3, 12, 3], [7, 7, 2]] as [number, number, number][]) {
      const X = x + S(dx), T = y - S(h);
      for (let j = 0; j < S(h); j++) { const ww = Math.max(1, Math.round(S(w) * Math.min(1, (j + 1) / 3))); r(X - Math.floor(ww / 2), T + j, ww, 1, j < 2 ? MN.CRYSTAL_HI : j > S(h) * 0.7 ? dk : c); }
    }
    if ((a * 0.8 + x * 0.01) % 1 < 0.12) { r(x + S(1), y - S(15), 1, 1, K.WHITE); r(x, y - S(15), 3, 1, MN.CRYSTAL_HI); }
  });
  Gd(x, y - S(8), S(14), c, 0.18 + 0.12 * p);
}
function rockProp(i: number): Prop {
  const [x, y] = ROCKS[i];
  return { y, draw: (a: number) => { const T = Date.now() / 1000; if (rockThere(i, T)) drawCrystal(x, y, a, h1(rockKey(i, T) * 0.37) > 0.75); else { r(x - 10, y - 2, 20, 3, MN.REG_DK); r(x - 4, y - 3, 8, 1, MN.REG_DK2); } } };
}
function gateProp(g: number): Prop {
  const [x, y] = GATES[g];
  return {
    y: y - 16,
    draw: (a: number) => {
      for (const s of [-1, 1]) { const px = x + s * 30; r(px - 1, y - 58, 3, 42, K.WHITE); r(px + 1, y - 58, 1, 42, SK.HULL_SH); lit(() => r(px - 2, y - 62, 5, 4, g === 0 ? ((a * 2) % 1 < 0.5 ? K.WHITE : SK.LED) : (a * 1.5 + g * 0.3) % 1 < 0.5 ? MN.ORANGE : shade(MN.ORANGE, 0.5))); Gd(px, y - 60, 7, g === 0 ? SK.LED : MN.ORANGE, 0.25); }
      if (MOON.next === g) { const bob = Math.round(Math.abs(Math.sin(a * 5)) * 4); arrowDown(x, y - 76 - bob, K.GOLD, 5, 6); Gd(x, y - 74, 10, K.GOLD, 0.25); }
      const label = g === 0 ? 'START' : 'GATE ' + g;
      r(x - 30, y - 58, 60, 9, g === 0 ? SK.TRIM : MN.ORANGE_DK); if (g === 0) for (let k = 0; k < 15; k++) r(x - 30 + k * 4, y - 58 + (k % 2) * 7, 4, 2, K.WHITE);
      txt(label, x - tw(label) / 2, y - 56, K.WHITE);
    },
  };
}
function boulderProp([x, y, s]: [number, number, number]): Prop { return { y, draw: () => boulder(x, y, s) }; }

// ---------- live bits ----------
function landerOnPad(a: number): void {
  const f = lander();
  let y = PAD_Y, flame = 0;
  if (f.phase === 'down') { if (f.d < 28) return; const u = (f.d - 28) / (L_TRIP - 28); y = PAD_Y - (1 - eOut(u)) * 460; flame = 0.6 + 0.4 * (1 - u); }
  else if (f.phase === 'up') { if (f.d > 26) return; const u = f.d / 26; y = PAD_Y - eIO(u) * u * 520; flame = f.d < 1 ? f.d : 1; }
  else if (f.phase === 'docked') return;
  const dust = (f.phase === 'down' && f.d > 50) || (f.phase === 'up' && f.d < 6);
  if (dust) for (let k = 0; k < 14; k++) { const s = k % 2 ? 1 : -1, age = ((a * 1.4 + k * 0.137) % 1); puff(PAD_X + s * (20 + age * 120 + (k % 5) * 6), PAD_Y + 2 - (k % 3) * 3, age, 1, 9, MN.REG_HI, 0.55); }
  drawLander(PAD_X, y, a, flame, f.phase === 'landed' && f.left > 4);
  if (f.phase === 'landed') lit(() => txt('HOME IN ' + Math.floor(f.left / 60) + ':' + String(Math.floor(f.left % 60)).padStart(2, '0'), PAD_X - 30, PAD_Y - 118, f.left < 30 && (a % 1) < 0.5 ? SK.LED_RED : SK.LED));
}
function padLights(a: number): void {
  const f = lander(), coming = f.phase === 'down' || (f.phase === 'docked' && f.left < 30);
  lit(() => { for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2, x = Math.round(PAD_X + Math.cos(an) * 100), y = Math.round(PAD_Y + 3 + Math.sin(an) * 14), on = coming ? (a * 3 + k / 8) % 1 < 0.5 : (a * 0.5 + k / 8) % 1 < 0.15; r(x - 1, y - 1, 3, 2, on ? SK.LED_RED : shade(SK.LED_RED, 0.35)); } });
  if (f.phase !== 'landed') {
    const m = f.phase === 'docked' ? 'NEXT LANDER ' + Math.floor((f.left + L_TRIP) / 60) + ':' + String(Math.floor((f.left + L_TRIP) % 60)).padStart(2, '0') : f.phase === 'down' ? 'LANDER INBOUND!' : 'LANDER HEADING UP';
    const next = f.phase === 'up' ? L_CYCLE - f.k + L_UNDOCK + L_TRIP : 0, m2 = f.phase === 'up' ? 'NEXT LANDER ' + Math.floor(next / 60) + ':' + String(Math.floor(next % 60)).padStart(2, '0') : m;
    const bx = PAD_X + 150; r(bx - 50, PAD_Y - 64, 100, 14, SK.TRIM); r(bx - 48, PAD_Y - 62, 96, 10, SK.SCREEN); r(bx - 1, PAD_Y - 50, 2, 50, SK.HULL_DK);
    lit(() => txt(m2, bx - tw(m2) / 2, PAD_Y - 60, f.phase === 'down' ? K.GOLD : SK.LED));
  }
}
function baseLights(a: number): void {
  // the airlock door (always open: lit), the habitat's portholes, the greenhouse's pink grow light
  lit(() => { r(HAB_X - 20, 422, 40, 48, [255, 230, 190]); r(HAB_X - 20, 460, 40, 10, [230, 206, 160]); for (const x of [HAB_X - 70, HAB_X + 56]) { disc(x, 430, 6, [255, 220, 150]); r(x - 2, 426, 2, 2, K.WHITE); } });
  Gd(HAB_X, 446, 26, [255, 214, 150], 0.3);
  const p = 0.5 + 0.5 * Math.sin(a * 1.1);
  lit(() => { for (let k = 0; k < 7; k++) { const x = GREEN_X - 50 + k * 16, y = 452 - Math.round(Math.abs(Math.sin(k * 1.7)) * 10); r(x - 2, y - 6, 5, 7, MN.LEAF); r(x - 1, y - 8, 3, 2, MN.LEAF_DK); } r(GREEN_X - 40, 400, 80, 2, SK.GROW); });
  Gsoft(GREEN_X, 430, 20, 70, SK.GROW, 0.12 + 0.05 * p); Gd(GREEN_X, 400, 20, SK.GROW2, 0.14);
}
function dish(a: number): void {
  const an = Math.sin(a * 0.25) * 0.6, cx = 1083, cy = 296, w = Math.round(Math.cos(an) * 22);
  for (let j = -6; j <= 6; j++) { const hw = Math.max(1, Math.round(Math.abs(w) * Math.sqrt(1 - (j * j) / 49))); r(cx - hw, cy + j, hw * 2, 1, j < -2 ? SK.HULL_HI : j > 3 ? SK.HULL_SH : SK.HULL); }
  line(cx, cy, cx + Math.round(Math.sin(an) * 10), cy - 12, SK.HULL_DK); lit(() => r(cx + Math.round(Math.sin(an) * 10) - 1, cy - 14, 3, 3, (a % 2) < 0.3 ? SK.LED : shade(SK.LED, 0.5)));
}
function drawBack(a: number): void {
  twinkles(0, 0, W, HOR - 20, 50, 23, a);
  Gsoft(SUN.x, SUN.y, 18, 110, [255, 244, 220], 0.25);
  drawEarth(EARTH.x, EARTH.y, EARTH.r);
  padLights(a); landerOnPad(a); baseLights(a); dish(a);
  drawBuggy(GARAGE_X, 466, a, 1, false, false, 0); drawBuggy(GARAGE_X, 466, a, 1, true, false, 0); // the spare buggy in the garage
}

// ---------- doors, spots ----------
export const LANDER_CABIN_ARRIVE = { x: 76, y: 506 };
const landerDoor: Door = { trigger: { x0: PAD_X - 22, y0: 478, x1: PAD_X + 22, y1: 486 }, to: 'lander', arrive: LANDER_CABIN_ARRIVE, label: 'LANDER', area: { x0: PAD_X - 50, y0: 360, x1: PAD_X + 50, y1: 470 }, route: () => { const f = lander(); return f.phase === 'landed' && f.left > 4 ? { to: 'lander', arrive: LANDER_CABIN_ARRIVE, label: 'LANDER HOME' } : null; } };
export const MOONBASE_ARRIVE = { x: 110, y: 500 };
const airlock: Door = { trigger: { x0: HAB_X - 20, y0: 478, x1: HAB_X + 20, y1: 486 }, to: 'moonbase', arrive: MOONBASE_ARRIVE, label: 'MOON BASE', area: { x0: HAB_X - 30, y0: 410, x1: HAB_X + 30, y1: 470 } };
export const MOON_SPOTS: Spot[] = [
  { kind: 'buggy', x: GARAGE_X, y: 500, sx: GARAGE_X, sy: 500, lift: 0, label: 'DRIVE', area: { x0: GARAGE_X - 60, y0: 420, x1: GARAGE_X + 60, y1: 480 } }, // 0
  ...ROCKS.map(([x, y], n): Spot => ({ kind: 'rock', n, x: x - 20, y: y + 2, sx: x - 20, sy: y + 2, lift: 0, label: 'MINE', area: { x0: x - 14, y0: y - 22, x1: x + 14, y1: y + 4 } })), // 1..7
];

export function makeMoon(): Room {
  const room: Room = {
    id: 'moon', title: 'THE MOON', sub: 'SEA OF CRITTERS',
    w: W, h: H,
    floor: { x0: 20, y0: 478, x1: W - 20, y1: 730 },
    blockers: BOULDERS.map(([x, y, s]) => ({ x0: x - s * 1.2, y0: y - 6, x1: x + s * 1.2, y1: y + 2 })),
    doors: [landerDoor, airlock],
    spots: MOON_SPOTS, inUse: new Map(),
    onState(s: StateMsg) { if (s.k === 'moonbest') MOON.best = s.v; },
    spawn: { ...MOON_PAD_ARRIVE },
    dim: 0,
    fillTop: 'rgb(3,4,12)', fillLow: 'rgb(90,90,104)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [...ROCKS.map((_, i) => rockProp(i)), ...GATES.map((_, g) => gateProp(g)), ...BOULDERS.map(boulderProp)],
    lowG: () => true,
    airless: true,
  };
  return room;
}
