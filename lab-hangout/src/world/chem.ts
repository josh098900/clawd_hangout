// THE CHEM LAB, off the Science Wing's corridor. White tiles with a row of mint, two FUME HOODS with glowing sashes
// (flasks bubbling on a hot plate in one, a distillation rig dripping in the other), THE REAGENT SHELVES (8 flasks
// numbered 1-8, the keys that add them), a confetti cannon on the wall (DUO USE ONLY), the GOGGLES dispenser, the
// SAFETY SHOWER, the EXPERIMENTS board, the PERIODIC TABLE OF CRITTERS, SIR BUBBLES in his flask on the sink, and
// BONEY the skeleton, who watches you go by. On the floor: BENCH A and BENCH B, islands you stand behind like a science
// demo, and the lectern with THE RECIPE BOOK. Reactions go off at the benches. CHEM is what this draws from (the mixes
// going off, the two-chemist one, your picks); game/chem.ts says what each mix does, features/chem.ts plays them.

import { CH, CONFETTI, K, NK, RX, type RGB } from '../engine/palette';
import { mk, r, line, disc, oval, ring, txt, tw, txtOutlined, lit, alpha, G, Gd, Gline, Gsoft, M, shade, bake, star4 } from '../engine/pixel';
import { FONT } from '../engine/font';
import { h1, clamp, eOut, eOB, seg } from '../engine/math';
import { REAGENTS, rxById, type Outcome } from '../game/chem';
import { hazard } from './wing';
import type { StateMsg } from '../net/transport';
import type { Prop, Room, Spot, Talker } from './room';

const W = 1100, H = 660, CEIL = 330, FL = 460;
/** Where things are: the door, the benches (and the hood behind each), their base and top, the shelves, the shower, the goggles, the lectern, BONEY, the cannon. */
export const CHL = { door: 70, doorTop: 356, bench: [475, 797], benchY: 566, top: 532, shelf: 636, shower: 322, goggles: 268, lectern: 636, boney: 1052, cannon: { x: 636, y: 344 } };
/** Each bench's beaker: its mouth is BEAKER_DX right of the bench's middle, at BEAKER_Y (you stand just left of it). */
export const BEAKER_DX = 10, BEAKER_Y = 517;
const TUBES = [150, 420, 690, 960];
/** The reagent shelves: four flasks a shelf, standing on these two. */
const SLOT_X = [578, 614, 650, 686], SHELF_Y = [398, 436];

/** A mix going off at a bench. `at` is its wall-clock start (ms): every browser draws the same moment. */
export interface Live { b: number; mix: number; out: Outcome; at: number; by: string; seed: number }
export const CHEM = {
  /** Mixes going off, oldest first (features/chem.ts adds them and clears them out). */
  live: [] as Live[],
  /** The two-chemist reaction going off, if any. */
  duo: null as { id: string; at: number } | null,
  /** The bench you're at (-1 = none), and the reagents you've put in its beaker so far, in the order you poured them. */
  at: -1, picks: [] as number[],
  /** The EXPERIMENTS board (room state 'chemlog'). */
  log: { n: 0, rx: '', by: '' },
  /** When someone last walked past BONEY (page seconds), and from which side. */
  boney: -9, boneyDir: 1 as 1 | -1,
  /** The part of the room the camera shows (features/chem.ts keeps it up to date): the foam flood only draws what's seen. */
  view: { x0: 0, x1: 1100, y0: 0, y1: 660 },
};
let RM: Room;
const inUse = (i: number): boolean => !!RM?.inUse.has(i);
/** The spots' order (append only): the benches, the book, the goggles, the shower. */
export const SPOT = { BENCH_A: 0, BENCH_B: 1, BOOK: 2, GOGGLES: 3, SHOWER: 4 };

/** Pixel text as it reads from behind glass: backwards, every letter flipped. */
function txtBack(s: string, x: number, y: number, c: RGB): void {
  let cx = x;
  for (const ch of [...s.toUpperCase()].reverse()) { const g = FONT[ch]; if (g) for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j][2 - i] === '#') r(cx + i, y + j, 1, 1, c); cx += 4; }
}
/** A pair of LAB GOGGLES (for the dispenser and BONEY): lime frame, clear lenses, the strap. */
function goggles(cx: number, cy: number): void {
  r(cx - 12, cy + 2, 24, 1, [40, 44, 50]); r(cx - 9, cy, 18, 5, CH.SLIME); r(cx - 9, cy, 18, 1, M(CH.SLIME, K.WHITE, 0.4)); r(cx - 9, cy + 4, 18, 1, shade(CH.SLIME, 0.7));
  r(cx - 8, cy + 1, 7, 3, CH.GLASS); r(cx + 1, cy + 1, 7, 3, CH.GLASS); r(cx - 7, cy + 1, 2, 1, K.WHITE); r(cx + 2, cy + 1, 1, 1, K.WHITE);
}
/** Reagent i's flask on its shelf, standing on y at x: each is its own shape. */
function flask(i: number, x: number, y: number): void {
  const c = REAGENTS[i].c, gl = CH.GLASS, gd = CH.GLASS_DK, hi = M(c, K.WHITE, 0.4), lo = shade(c, 0.72);
  switch (i) {
    case 0: // FIZZ SALT: a wide jar of pink-white crystals, a blue lid
      r(x - 7, y - 16, 14, 16, gl); r(x - 7, y - 16, 1, 16, gd); r(x + 6, y - 16, 1, 16, gd); r(x - 6, y - 11, 12, 10, c); for (let k = 0; k < 7; k++) r(x - 5 + Math.floor(h1(k * 3.1) * 10), y - 10 + Math.floor(h1(k * 7.3) * 8), 1, 1, k % 2 ? K.WHITE : [230, 150, 190]);
      r(x - 8, y - 19, 16, 4, [80, 120, 210]); r(x - 8, y - 19, 16, 1, [140, 170, 240]); break;
    case 1: // BLUE GOO: an Erlenmeyer flask
      for (let j = 0; j < 18; j++) { const hw = j < 6 ? 2 : Math.min(7, 2 + Math.floor((j - 5) / 2)); r(x - hw, y - 18 + j, hw * 2, 1, j > 8 ? c : gl); r(x - hw, y - 18 + j, 1, 1, gd); r(x + hw - 1, y - 18 + j, 1, 1, gd); }
      r(x - 5, y - 9, 3, 1, hi); r(x - 3, y - 20, 6, 2, [220, 220, 210]); break;
    case 2: // SPARK DUST: a jar of gold dust, corked
      r(x - 6, y - 15, 12, 15, gl); r(x - 6, y - 15, 1, 15, gd); r(x + 5, y - 15, 1, 15, gd); r(x - 5, y - 9, 10, 8, c); r(x - 5, y - 9, 10, 1, hi); r(x - 4, y - 19, 8, 4, [176, 132, 84]); r(x - 4, y - 19, 8, 1, [210, 170, 120]); break;
    case 3: // SLIME BASE: a round-bottom flask, a drip running down it
      disc(x, y - 7, 7, gl); disc(x, y - 6, 6, c); r(x - 4, y - 9, 3, 2, hi); r(x - 2, y - 21, 4, 8, gl); r(x - 2, y - 21, 1, 8, gd); r(x - 3, y - 22, 6, 2, [220, 220, 210]); r(x + 6, y - 9, 1, 5, c); r(x + 6, y - 4, 2, 2, lo); break;
    case 4: // RAINBOW OIL: a tall thin bottle with a stopper (it shimmers, live)
      r(x - 4, y - 20, 8, 20, gl); r(x - 4, y - 20, 1, 20, gd); r(x + 3, y - 20, 1, 20, gd); r(x - 3, y - 16, 6, 15, c); r(x - 2, y - 25, 4, 5, gl); r(x - 3, y - 27, 6, 3, [150, 90, 200]); break;
    case 5: // BUBBLE JUICE: a squat bottle, a bubble wand in its cap
      r(x - 6, y - 14, 12, 14, gl); r(x - 6, y - 14, 1, 14, gd); r(x + 5, y - 14, 1, 14, gd); r(x - 5, y - 10, 10, 9, c); r(x - 4, y - 10, 2, 5, hi); r(x - 3, y - 17, 6, 3, [240, 120, 170]); r(x, y - 23, 1, 6, [240, 120, 170]); ring(x, y - 25, 2, 2, [240, 120, 170]); break;
    case 6: // GLOW POWDER: a jar with a black lid (the powder glows, live)
      r(x - 6, y - 15, 12, 15, gl); r(x - 6, y - 15, 1, 15, gd); r(x + 5, y - 15, 1, 15, gd); r(x - 5, y - 10, 10, 9, c); r(x - 7, y - 18, 14, 3, [40, 44, 50]); r(x - 7, y - 18, 14, 1, [80, 86, 94]); break;
    case 7: // CRITTER TONIC: a round potion bottle, corked, a critter's face on its label
      disc(x, y - 7, 7, gl); disc(x, y - 7, 6, c); r(x - 4, y - 10, 2, 3, hi); r(x - 2, y - 20, 4, 7, gl); r(x - 2, y - 23, 4, 3, [176, 132, 84]);
      r(x - 4, y - 8, 8, 6, K.PAPER); r(x - 2, y - 7, 1, 2, K.EYE); r(x + 1, y - 7, 1, 2, K.EYE); r(x - 1, y - 4, 2, 1, K.EYE); break;
  }
}
/** A fume hood behind bench n: its duct into the ceiling, the steel body, the lit inside, the sash, the cabinet under it. */
function hood(n: number): void {
  const cx = CHL.bench[n], x0 = cx - 71, x1 = cx + 71, y0 = 358, ix0 = x0 + 8, ix1 = x1 - 8, iy0 = y0 + 16, iy1 = 430;
  r(cx - 12, CEIL - 26, 24, y0 - CEIL + 26, CH.DUCT); r(cx - 12, CEIL - 26, 4, y0 - CEIL + 26, M(CH.DUCT, K.WHITE, 0.35)); r(cx + 8, CEIL - 26, 4, y0 - CEIL + 26, CH.DUCT_DK);
  for (let y = CEIL - 18; y < y0; y += 10) { r(cx - 13, y, 26, 2, CH.DUCT_DK); r(cx - 13, y, 26, 1, M(CH.DUCT, K.WHITE, 0.2)); }
  r(x0, y0, x1 - x0, FL - y0, CH.HOOD); r(x0, y0, x1 - x0, 2, CH.HOOD_HI); r(x0, y0, 2, FL - y0, CH.HOOD_HI); r(x1 - 2, y0, 2, FL - y0, CH.HOOD_DK);
  r(x0 + 6, y0 + 3, x1 - x0 - 12, 10, [40, 50, 56]); txt('FUME HOOD ' + (n + 1), x0 + 10, y0 + 5, [200, 220, 220]); txt('AIR', x1 - 28, y0 + 5, [150, 170, 170]);
  r(ix0 - 2, iy0 - 2, ix1 - ix0 + 4, iy1 - iy0 + 4, CH.HOOD_DK);
  r(ix0, iy0, ix1 - ix0, iy1 - iy0, [214, 230, 228]);
  for (let y = iy0 + 8; y < iy1 - 16; y += 7) r(ix0 + 6, y, ix1 - ix0 - 12, 2, [186, 202, 202]); // baffle slots at the back
  r(ix0, iy1 - 8, ix1 - ix0, 8, [150, 164, 168]); r(ix0, iy1 - 8, ix1 - ix0, 1, [204, 216, 218]); // the work surface
  disc(ix1 - 16, iy0 + 12, 8, [120, 132, 138]); disc(ix1 - 16, iy0 + 12, 6, [70, 80, 86]); // the fan's housing (the blades turn, live)
  if (n === 0) { // a hot plate with two flasks going, a thermometer, a wash bottle, a box of pipette tips
    r(cx - 50, 414, 42, 8, [60, 64, 70]); r(cx - 50, 414, 42, 1, [104, 108, 116]); r(cx - 46, 417, 3, 3, [30, 34, 38]); disc(cx - 14, 418, 2, [150, 156, 164]);
    for (let j = 0; j < 16; j++) { const hw = j < 5 ? 2 : Math.min(7, 2 + Math.floor((j - 4) / 2)), y = 398 + j; r(cx - 36 - hw, y, hw * 2, 1, j > 7 ? CH.TONIC : CH.GLASS); r(cx - 36 - hw, y, 1, 1, CH.GLASS_DK); }
    disc(cx - 20, 406, 6, CH.GLASS); disc(cx - 20, 407, 5, [150, 90, 220]); r(cx - 22, 392, 4, 9, CH.GLASS); r(cx - 22, 392, 1, 9, CH.GLASS_DK);
    line(cx - 17, 386, cx - 19, 404, [236, 236, 240]); r(cx - 19, 404, 2, 2, [220, 50, 50]); // the thermometer
    r(cx + 16, 402, 9, 20, K.WHITE); r(cx + 16, 402, 1, 20, [220, 224, 228]); r(cx + 18, 398, 5, 4, [236, 236, 240]); line(cx + 20, 398, cx + 26, 392, [236, 236, 240]); // a wash bottle
    r(cx + 34, 414, 18, 8, [40, 120, 200]); for (let k = 0; k < 5; k++) r(cx + 36 + k * 3, 411, 1, 3, [240, 230, 150]); // pipette tips
    alpha(0.2, () => line(cx - 60, 390, cx - 54, 384, [255, 150, 60])); // a scorch on the back wall
  } else { // a distillation rig: a flask boiling over a heater, a glass coil condenser, the collecting flask
    r(cx - 56, 416, 26, 6, [60, 64, 70]); r(cx - 56, 416, 26, 1, [104, 108, 116]); disc(cx - 43, 408, 7, CH.GLASS); disc(cx - 43, 409, 6, [80, 200, 110]); r(cx - 45, 390, 4, 12, CH.GLASS); r(cx - 45, 390, 1, 12, CH.GLASS_DK);
    for (let k = 0; k <= 60; k++) { const x = cx - 41 + k, y = 390 + Math.round(k * 0.36); r(x, y - 2, 1, 5, M(CH.GLASS, [150, 210, 240], 0.4)); r(x, y, 1, 1, CH.GLASS_DK); } // the condenser's water jacket, and the tube inside it
    for (let k = 0; k < 4; k++) { const x = cx - 26 + k * 12, y = 390 + Math.round((15 + k * 12) * 0.36); disc(x, y, 2, [90, 170, 220]); } // the coil's turns showing through
    line(cx - 22, 400, cx - 30, 426, [150, 40, 40]); line(cx + 4, 410, cx + 12, 426, [150, 40, 40]); // rubber tubes: water in, water out
    for (let j = 0; j < 12; j++) { const hw = j < 3 ? 2 : Math.min(6, 2 + Math.floor((j - 2) / 2)), y = 410 + j; r(cx + 26 - hw, y, hw * 2, 1, j > 8 ? [80, 200, 110] : CH.GLASS); r(cx + 26 - hw, y, 1, 1, CH.GLASS_DK); }
  }
  // the sash: glass down to its handle bar (the bottom of the opening stays open to work in)
  alpha(0.22, () => r(ix0, iy0, ix1 - ix0, 38, CH.SASH)); r(ix0, iy0 + 38, ix1 - ix0, 4, RX.STEEL); r(ix0, iy0 + 38, ix1 - ix0, 1, RX.STEEL_HI); r(cx - 12, iy0 + 42, 24, 2, RX.STEEL_DK);
  alpha(0.4, () => { line(ix0 + 10, iy0 + 2, ix0 + 26, iy0 + 34, K.WHITE); line(ix0 + 16, iy0 + 2, ix0 + 30, iy0 + 28, K.WHITE); line(ix1 - 40, iy0 + 4, ix1 - 30, iy0 + 22, K.WHITE); });
  // the sill, and the cabinet underneath
  r(x0 + 4, iy1 + 2, x1 - x0 - 8, 3, RX.STEEL); r(x0 + 4, iy1 + 2, x1 - x0 - 8, 1, RX.STEEL_HI);
  const dw = (x1 - x0 - 12) / 2;
  for (const k of [0, 1]) { const dx = x0 + 6 + k * dw; r(dx, iy1 + 7, dw - 2, FL - iy1 - 9, CH.CAB); r(dx, iy1 + 7, dw - 2, 1, CH.CAB_HI); r(dx + dw - 3, iy1 + 7, 1, FL - iy1 - 9, CH.CAB_DK); r(dx + dw / 2 - 5, iy1 + 10, 8, 2, RX.STEEL_DK); }
  if (n === 0) { r(x0 + 10, iy1 + 14, 16, 8, [255, 214, 90]); txt('ACID', x0 + 11, iy1 + 16, [60, 50, 20]); }
  else { r(x0 + 10, iy1 + 12, 30, 16, [255, 240, 150]); txt('HOOD 2', x0 + 12, iy1 + 13, [60, 50, 30]); txt('SMELLS', x0 + 12, iy1 + 19, [60, 50, 30]); r(x1 - 36, iy1 + 14, 26, 8, [220, 60, 60]); txt('SOLV', x1 - 31, iy1 + 16, K.WHITE); }
}

function build(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    // ---- the ceiling: tiles, a cable tray, the tubes' fittings (lit live), sprinklers ----
    r(0, 0, W, CEIL, RX.CEIL);
    for (let x = 0; x < W; x += 60) r(x, 0, 1, CEIL - 20, RX.CEIL2);
    for (let y = 40; y < CEIL - 20; y += 60) r(0, y, W, 1, RX.CEIL2);
    r(0, CEIL - 22, W, 4, RX.STEEL_DK2); for (let x = 8; x < W; x += 14) r(x, CEIL - 22, 2, 4, RX.STEEL_DK);
    for (const tx of TUBES) { r(tx - 2, CEIL - 4, 124, 6, RX.STEEL_DK2); r(tx, CEIL + 2, 120, 3, RX.TUBE_OFF); }
    r(0, CEIL, W, 4, RX.STEEL_DK2);
    for (const sx of [250, 1010]) { r(sx - 1, CEIL + 4, 3, 3, RX.STEEL); r(sx - 3, CEIL + 7, 7, 1, RX.STEEL_HI); r(sx, CEIL + 8, 1, 1, [200, 60, 60]); }
    alpha(0.45, () => { oval(CHL.bench[1] + 40, CEIL + 8, 16, 3, [40, 40, 44]); oval(CHL.bench[1] + 34, CEIL + 7, 8, 2, [20, 20, 24]); }); // a scorch mark over bench B
    // ---- the wall: white tiles, a row of mint at hand height, the skirting ----
    for (let y = CEIL + 4, j = 0; y < 452; y += 12, j++) for (let x = 0; x < W; x += 12) {
      const mint = y === CEIL + 4 + 7 * 12, c = mint ? ((x / 12 + j) % 2 ? CH.MINT : shade(CH.MINT, 0.93)) : (x / 12 + j) % 2 ? CH.TILE : CH.TILE2;
      r(x, y, 12, 12, c); r(x, y, 12, 1, mint ? CH.MINT_HI : CH.TILE_HI); r(x, y, 1, 12, mint ? CH.MINT_DK : CH.GROUT); r(x, y + 11, 12, 1, mint ? CH.MINT_DK : CH.GROUT);
    }
    r(0, 452, W, 8, CH.SKIRT); r(0, 452, W, 1, M(CH.SKIRT, K.WHITE, 0.2));
    // ---- the floor: pale sage vinyl, a shadow along the wall ----
    for (let y = FL, j = 0; y < H; y += 20, j++) for (let x = 0; x < W; x += 20) { r(x, y, 20, 20, (x / 20 + j) % 2 ? CH.FLOOR : CH.FLOOR2); r(x, y, 20, 1, CH.FLOOR_LN); r(x, y, 1, 20, shade(CH.FLOOR_LN, 1.04)); }
    alpha(0.3, () => r(0, FL, W, 5, [60, 80, 72]));
    for (let k = 0; k < 14; k++) r(80 + Math.floor(h1(k * 5.3) * 940), 490 + Math.floor(h1(k * 2.9) * 130), 3 + Math.floor(h1(k) * 5), 1, shade(CH.FLOOR_LN, 0.9)); // scuffs
    alpha(0.32, () => { oval(574, 606, 16, 4, CH.STAIN); oval(592, 609, 9, 3, CH.STAIN); oval(561, 603, 5, 2, CH.STAIN); }); // an old purple stain
    // KEEP CLEAR round the shower's drain
    { const x0 = CHL.shower - 28, y0 = FL + 10; hazard(x0, y0, 56, 32, 4); r(x0 + 3, y0 + 3, 50, 26, CH.FLOOR); txt('KEEP CLEAR', x0 + 28 - tw('KEEP CLEAR') / 2, y0 + 5, [150, 120, 20]); disc(CHL.shower, y0 + 20, 5, [90, 100, 104]); disc(CHL.shower, y0 + 20, 4, [60, 68, 72]); for (let k = -3; k <= 3; k += 2) r(CHL.shower + k, y0 + 17, 1, 7, [30, 36, 40]); }
    // ---- the door out: frosted glass (its sign reads backwards from in here), push bars, the EXIT sign (lit live) ----
    { const cx = CHL.door, t = CHL.doorTop;
      r(cx - 32, t - 6, 64, FL - t + 6, RX.STEEL_DK); r(cx - 32, t - 6, 64, 2, RX.STEEL); r(cx - 28, t, 56, FL - t, [212, 232, 236]);
      for (let k = 0; k < 9; k++) line(cx - 26 + k * 6, t + 3, cx - 26 + k * 6 + 10, t + 23, [228, 244, 248]);
      r(cx - 1, t, 2, FL - t, RX.STEEL_DK); r(cx - 22, 400, 3, 18, RX.STEEL_HI); r(cx + 19, 400, 3, 18, RX.STEEL_HI);
      r(cx - 26, t + 26, 52, 12, [30, 60, 70]); txtBack('CHEM LAB', cx - tw('CHEM LAB') / 2 + 2, t + 30, [200, 236, 230]);
      r(cx - 28, FL - 10, 56, 10, RX.STEEL); r(cx - 28, FL - 10, 56, 1, RX.STEEL_HI); r(cx - 20, t - 20, 40, 12, RX.STEEL_DK2); }
    // ---- the fire blanket ----
    { const x = 104, y = 374; r(x, y, 32, 30, [200, 40, 50]); r(x, y, 32, 2, [236, 90, 90]); r(x + 31, y, 1, 30, [150, 24, 34]); txt('FIRE', x + 16 - tw('FIRE') / 2, y + 6, K.WHITE); txt('BLANKET', x + 16 - tw('BLANKET') / 2, y + 13, K.WHITE); for (const tx of [x + 6, x + 20]) { r(tx, y + 26, 6, 8, [236, 236, 240]); r(tx, y + 32, 6, 2, [200, 200, 206]); } }
    // ---- the EXPERIMENTS board (its count and the latest are written live) ----
    { const x0 = 142, y0 = 358; r(x0 - 2, y0 - 2, 94, 50, RX.STEEL); r(x0 - 2, y0 - 2, 94, 1, RX.STEEL_HI); r(x0, y0, 90, 46, K.PAPER);
      txt('EXPERIMENTS', x0 + 4, y0 + 3, [40, 90, 200]); r(x0 + 4, y0 + 9, 43, 1, [40, 90, 200]); txt('LATEST:', x0 + 4, y0 + 30, [120, 120, 130]);
      for (let k = 0; k < 5; k++) r(x0 + 62 + k * 4, y0 + 14 + (k % 2), 1, 7, [60, 60, 70]); line(x0 + 60, y0 + 19, x0 + 81, y0 + 16, [60, 60, 70]); // tally marks
      r(x0 + 58, y0 + 24, 10, 4, [200, 60, 60]); line(x0 + 62, y0 + 24, x0 + 66, y0 + 20, [60, 60, 70]); // a doodle of a mushroom cloud
      r(x0 + 30, y0 + 48, 30, 3, RX.STEEL_DK); r(x0 + 33, y0 + 47, 9, 2, [200, 40, 60]); r(x0 + 45, y0 + 47, 9, 2, [40, 90, 200]); } // the marker tray
    // ---- the GOGGLES dispenser ----
    { const x0 = CHL.goggles - 20, y0 = 372;
      r(x0 - 6, y0 - 16, 52, 12, [40, 100, 200]); r(x0 - 6, y0 - 16, 52, 1, [110, 160, 240]); txt('GOGGLES ON!', x0 + 20 - tw('GOGGLES ON!') / 2, y0 - 13, K.WHITE);
      r(x0, y0, 40, 48, RX.STEEL_DK); r(x0, y0, 40, 2, RX.STEEL_HI); r(x0 + 3, y0 + 3, 34, 34, [200, 228, 232]);
      for (let k = 0; k < 3; k++) goggles(x0 + 20, y0 + 7 + k * 9);
      alpha(0.4, () => { r(x0 + 5, y0 + 5, 2, 28, K.WHITE); r(x0 + 9, y0 + 5, 1, 14, K.WHITE); });
      r(x0 + 3, y0 + 40, 34, 6, [30, 36, 40]); goggles(x0 + 20, y0 + 41);
      r(x0 + 40, y0 + 16, 5, 3, RX.STEEL); r(x0 + 44, y0 + 8, 3, 16, [200, 40, 50]); r(x0 + 44, y0 + 8, 1, 16, [236, 90, 90]); }
    // ---- the SAFETY SHOWER: the pipe down from the ceiling, its head, the pull chain, the sign ----
    { const x = CHL.shower;
      r(x - 2, CEIL + 4, 4, 364 - CEIL, RX.STEEL); r(x - 2, CEIL + 4, 1, 364 - CEIL, RX.STEEL_HI); r(x - 3, 346, 6, 3, RX.STEEL_DK);
      r(x - 14, 368, 28, 5, RX.STEEL); r(x - 14, 368, 28, 1, RX.STEEL_HI); r(x - 12, 373, 24, 1, RX.STEEL_DK); for (let k = -10; k <= 10; k += 4) r(x + k, 373, 1, 1, [40, 46, 50]);
      r(x + 13, 373, 3, 3, RX.STEEL_DK); for (let y = 377; y < 428; y += 3) r(x + 14, y, 1, 2, RX.STEEL_DK);
      for (let j = 0; j < 7; j++) r(x + 14 - j, 428 + j, 1 + j * 2, 1, j === 6 ? [30, 110, 70] : [40, 150, 90]);
      r(x + 24, 346, 40, 20, [40, 150, 90]); r(x + 24, 346, 40, 1, [90, 200, 140]); txt('SAFETY', x + 44 - tw('SAFETY') / 2, 349, K.WHITE); txt('SHOWER', x + 44 - tw('SHOWER') / 2, 357, K.WHITE); }
    // ---- the fume hoods ----
    hood(0); hood(1);
    // ---- THE REAGENT SHELVES: two steel shelves, four flasks each, labelled with the key that adds them ----
    { const x0 = 560, x1 = 712;
      r(x0, 370, x1 - x0, 4, RX.STEEL); r(x0, 370, x1 - x0, 1, RX.STEEL_HI); r(x0, 374, 4, FL - 374, RX.STEEL_DK); r(x1 - 4, 374, 4, FL - 374, RX.STEEL_DK);
      for (const sy of SHELF_Y) { r(x0, sy, x1 - x0, 3, RX.STEEL); r(x0, sy, x1 - x0, 1, RX.STEEL_HI); r(x0 + 4, sy + 3, x1 - x0 - 8, 8, K.PAPER); r(x0 + 4, sy + 10, x1 - x0 - 8, 1, [210, 210, 204]); }
      REAGENTS.forEach((rg, i) => { const x = SLOT_X[i % 4], y = SHELF_Y[i < 4 ? 0 : 1], lab = (i + 1) + ' ' + rg.short; flask(i, x, y); txt(lab, x - tw(lab) / 2, y + 4, [50, 56, 66]); r(x - tw(lab) / 2 - 1, y + 4, 1, 5, rg.c); });
      r(x0 + 8, 450, 30, 10, [140, 100, 60]); r(x0 + 8, 450, 30, 2, [176, 132, 84]); txt('SPARE', x0 + 13, 453, [60, 40, 20]); } // a crate of spares under the shelves
    // ---- the confetti cannon's wall bracket (the barrel is drawn live: it kicks when it fires) ----
    { const { x, y } = CHL.cannon; r(x - 9, y - 7, 14, 12, RX.STEEL_DK); r(x - 9, y - 7, 14, 1, RX.STEEL); r(x - 7, y - 5, 2, 2, RX.STEEL_HI); r(x - 7, y + 1, 2, 2, RX.STEEL_HI); }
    // ---- THE PERIODIC TABLE OF CRITTERS (and DUCKIUM, added in pen) ----
    { const x0 = 884, y0 = 354, w = 88, h = 66; r(x0 + 1, y0 + 1, w, h, [190, 200, 196]); r(x0, y0, w, h, K.PAPER); r(x0, y0, w, 1, K.WHITE);
      txt('PERIODIC TABLE', x0 + w / 2 - tw('PERIODIC TABLE') / 2, y0 + 3, [60, 60, 80]); txt('OF CRITTERS', x0 + w / 2 - tw('OF CRITTERS') / 2, y0 + 9, [200, 60, 90]);
      const cols: RGB[] = [[255, 140, 168], [255, 180, 110], [255, 224, 120], [150, 220, 130], [110, 210, 200], [120, 170, 255], [190, 150, 255]];
      const cell = (cx: number, cy: number, g: number) => { r(x0 + 2 + cx * 6, y0 + 17 + Math.round(cy * 6), 5, 5, cols[g]); r(x0 + 2 + cx * 6, y0 + 17 + Math.round(cy * 6), 5, 1, M(cols[g], K.WHITE, 0.4)); };
      cell(0, 0, 0); cell(13, 0, 6);
      for (const row of [1, 2]) { cell(0, row, 0); cell(1, row, 1); for (let c = 8; c < 14; c++) cell(c, row, c < 10 ? 3 : c < 12 ? 4 : 5); }
      for (const row of [3, 4]) for (let c = 0; c < 14; c++) cell(c, row, c < 2 ? c : c < 8 ? 2 : c < 10 ? 3 : c < 12 ? 4 : 5);
      for (const row of [5.4, 6.4]) for (let c = 2; c < 13; c++) cell(c, row, 6);
      const dx = x0 + 22, dy = y0 + 19; r(dx, dy + 3, 6, 3, NK.DUCK); r(dx + 4, dy, 3, 3, NK.DUCK); r(dx + 7, dy + 1, 2, 1, NK.BEAK); r(dx + 5, dy + 1, 1, 1, K.EYE); txt('DK', dx + 12, dy + 1, [40, 90, 200]); line(dx - 2, dy + 8, dx + 20, dy + 8, [40, 90, 200]); }
    // ---- the sink: a pegboard of glassware drying above it, the counter, the gooseneck tap, SIR BUBBLES' flask, a mug ----
    { const x0 = 984, x1 = 1084;
      r(x0 + 6, 364, x1 - x0 - 12, 40, CH.WOOD_HI); r(x0 + 6, 364, x1 - x0 - 12, 1, M(CH.WOOD_HI, K.WHITE, 0.3)); r(x0 + 6, 403, x1 - x0 - 12, 1, CH.WOOD_DK);
      for (let y = 368; y < 402; y += 6) for (let x = x0 + 10; x < x1 - 8; x += 6) r(x, y, 1, 1, CH.WOOD_DK);
      for (let k = 0; k < 6; k++) { const px = x0 + 16 + k * 14, py = 372 + (k % 2) * 8; r(px, py - 2, 1, 4, [80, 86, 94]); if (k % 3 === 0) { r(px - 3, py + 2, 7, 10, CH.GLASS); r(px - 3, py + 2, 1, 10, CH.GLASS_DK); r(px - 1, py, 3, 2, CH.GLASS); } else { r(px - 1, py + 2, 3, 12, CH.GLASS); r(px - 1, py + 2, 1, 12, CH.GLASS_DK); } } // flasks and tubes, upside down
      r(x0, 424, x1 - x0, 5, CH.EPOXY); r(x0, 424, x1 - x0, 1, CH.EPOXY_HI); r(x0 + 2, 429, x1 - x0 - 4, FL - 429, CH.CAB);
      for (const k of [0, 1]) { const dx = x0 + 4 + k * 48; r(dx, 432, 44, FL - 434, CH.CAB); r(dx, 432, 44, 1, CH.CAB_HI); r(dx + 43, 432, 1, FL - 434, CH.CAB_DK); r(dx + 18, 436, 8, 2, RX.STEEL_DK); }
      r(1014, 424, 34, 2, [40, 46, 50]); r(1040, 404, 2, 20, RX.STEEL); r(1032, 402, 10, 2, RX.STEEL); r(1032, 402, 10, 1, RX.STEEL_HI); r(1032, 404, 2, 4, RX.STEEL); r(1044, 418, 4, 3, [200, 60, 60]);
      disc(1000, 414, 8, CH.GLASS); disc(1000, 415, 7, [150, 210, 236]); r(997, 400, 6, 8, CH.GLASS); r(997, 400, 1, 8, CH.GLASS_DK); r(993, 419, 14, 2, [150, 130, 110]); r(996, 421, 8, 3, CH.GLASS_DK); // SIR BUBBLES' flask and its pebbles
      r(1066, 415, 7, 9, K.WHITE); r(1072, 417, 2, 4, K.WHITE); r(1068, 417, 1, 1, [220, 50, 70]); r(1070, 417, 1, 1, [220, 50, 70]); r(1068, 418, 3, 1, [220, 50, 70]); r(1069, 419, 1, 1, [220, 50, 70]); } // I <3 H2O
  });
}

/** The live layer: the lights, the hoods at work, the glowing reagents, the board, SIR BUBBLES, the drips, the cannon. */
function drawBack(a: number): void {
  const T = Date.now();
  TUBES.forEach((tx, i) => {
    const f = i === 1 && ((a * 2.3) % 1 < 0.05 || (a * 0.17) % 1 < 0.04) ? 0.3 : 1;
    lit(() => r(tx, CEIL + 2, 120, 3, M(RX.TUBE_OFF, RX.TUBE, f))); G(tx - 10, CEIL + 4, 140, 60, [220, 240, 255], 0.07 * f); G(tx + 10, FL, 100, 60, [220, 240, 255], 0.04 * f);
  });
  { const cx = CHL.door; lit(() => { r(cx - 18, CHL.doorTop - 18, 36, 8, [30, 110, 60]); txt('EXIT', cx - tw('EXIT') / 2 + 1, CHL.doorTop - 17, [124, 242, 156]); }); Gd(cx, CHL.doorTop - 14, 14, [124, 242, 156], 0.3); }
  // the fume hoods: their lights inside, the fan, the airflow light; hood 1's flasks bubble, hood 2's still drips
  for (const n of [0, 1]) {
    const cx = CHL.bench[n], ix0 = cx - 63, ix1 = cx + 63;
    lit(() => r(ix0 + 2, 375, ix1 - ix0 - 4, 1, [246, 255, 252])); G(ix0, 374, ix1 - ix0, 56, CH.SASH, 0.14);
    lit(() => r(cx + 60, 363, 4, 4, (a * 0.8 + n * 0.4) % 1 < 0.85 ? RX.LED_G : shade(RX.LED_G, 0.4)));
    const fx = ix1 - 16, fy = 386, an = a * 9 + n; for (let k = 0; k < 3; k++) { const q = an + k * 2.094; line(fx, fy, Math.round(fx + Math.cos(q) * 5), Math.round(fy + Math.sin(q) * 5), [150, 160, 166]); } r(fx - 1, fy - 1, 2, 2, [40, 44, 50]);
  }
  { const cx = CHL.bench[0]; lit(() => { r(cx - 46, 417, 3, 3, (a % 1) < 0.5 ? RX.LED_R : shade(RX.LED_R, 0.5)); for (let k = 0; k < 6; k++) { const u = ((a * 0.9) + k / 6) % 1, fl = k % 2 ? [cx - 36, 412, CH.TONIC] as const : [cx - 20, 410, [150, 90, 220] as RGB] as const; if (u < 0.8) r(fl[0] - 2 + (k % 3), Math.round(fl[1] - u * 8), 1, 1, M(fl[2], K.WHITE, 0.5)); } }); }
  { const cx = CHL.bench[1], u = (a * 0.4) % 1; lit(() => { for (let k = 0; k < 3; k++) { const q = ((a * 1.1) + k / 3) % 1; r(cx - 45 + k * 2, Math.round(412 - q * 6), 1, 1, M([80, 200, 110], K.WHITE, 0.5)); } if (u < 0.3) r(cx + 20, Math.round(412 + u * 12), 1, 2, [120, 230, 140]); }); Gd(cx - 43, 409, 8, [255, 140, 60], 0.12); }
  // the reagents: GLOW POWDER glows, RAINBOW OIL shimmers, BUBBLE JUICE bubbles, the salt and the dust glint
  { const gx = SLOT_X[2], gy = SHELF_Y[1], p = 0.6 + 0.4 * Math.sin(a * 2); lit(() => r(gx - 5, gy - 10, 10, 9, M(CH.GLOW, K.WHITE, 0.25 * p))); Gd(gx, gy - 6, 12, CH.GLOW, 0.3 * p); }
  { const ox = SLOT_X[0], oy = SHELF_Y[1]; lit(() => { for (let j = 0; j < 15; j++) r(ox - 3, oy - 16 + j, 6, 1, CONFETTI[Math.floor(j / 3 + a * 3) % CONFETTI.length]); }); Gd(ox, oy - 10, 7, CH.OIL, 0.2); }
  { const bx = SLOT_X[1], by = SHELF_Y[1], u = (a * 0.5) % 1; lit(() => r(bx - 1 + Math.round(Math.sin(a * 5)), Math.round(by - 3 - u * 7), 2, 2, M(CH.BUBBLE, K.WHITE, 0.6))); }
  lit(() => { for (const [i, k] of [[0, 0], [2, 1]] as [number, number][]) if ((a * 0.7 + k * 0.5) % 1 < 0.15) star4(SLOT_X[i] - 2 + k * 4, SHELF_Y[0] - 8, 1, K.WHITE); });
  // the EXPERIMENTS board: the count, and the latest discovery
  { const x0 = 142, y0 = 358, n = String(CHEM.log.n); txt(n.length > 5 ? '99999+' : n, x0 + 4, y0 + 14, [200, 40, 60], 2); const lr = CHEM.log.rx ? rxById(CHEM.log.rx)?.name ?? '' : '---'; txt(lr.slice(0, 21), x0 + 4, y0 + 37, [40, 90, 200]); if (CHEM.log.by) txt(CHEM.log.by.slice(0, 14), x0 + 32, y0 + 30, [120, 120, 130]); }
  // SIR BUBBLES swims round his flask; a bubble goes up now and then
  { const u = a * 0.6, fx = 1000 + Math.round(Math.sin(u) * 4), fy = 414 + Math.round(Math.sin(u * 1.7) * 2), d = Math.cos(u) > 0 ? 1 : -1; r(fx - 2, fy, 5, 3, [255, 140, 40]); r(fx - 2 - d * 2, fy + 1, 2, 1, [255, 170, 80]); r(fx + d * 2, fy, 1, 1, K.EYE); if ((a * 0.5) % 1 < 0.4) { const q = ((a * 0.5) % 1) / 0.4; lit(() => r(fx + d * 3, Math.round(fy - q * 12), 1, 1, K.WHITE)); } }
  // the tap drips
  { const u = (a * 0.43) % 1; if (u < 0.25) lit(() => r(1033, Math.round(408 + u * 64), 1, 2, [170, 220, 255])); }
  // the confetti cannon: its barrel (it kicks back when it fires)
  const duo = CHEM.duo, fired = duo && duo.id === 'confetti' ? (T - duo.at) / 1000 : -1, kick = fired >= 0 && fired < 0.5 ? Math.round(4 * (1 - fired / 0.5)) : 0;
  cannon(CHL.cannon.x - kick, CHL.cannon.y, a);
  if (fired >= 0 && fired < 2) for (let k = 0; k < 5; k++) { const u = fired / 2; alpha(0.6 * (1 - u), () => disc(Math.round(CHL.cannon.x + 30 + k * 5 + u * 20), Math.round(CHL.cannon.y + 10 - u * 14 - k * 2), Math.round(2 + u * 6), [230, 230, 236])); }
  // the confetti lying on the floor afterwards
  if (fired >= 0 && fired < 40) confettiFloor(fired);
  // the whole room: the KA-BOOM's flash, the DISCO's lights
  for (const L of CHEM.live) {
    const u = (T - L.at) / 1000;
    if (L.out.kind === 'boom' && u >= 0 && u < 0.25) G(0, CEIL, W, H - CEIL, [255, 250, 230], 0.5 * (1 - u / 0.25));
    if (L.out.kind === 'disco' && u >= 0 && u < L.out.dur) discoLights(L, u, a);
  }
}
/** The confetti cannon's brass barrel, on its bracket, aimed down at the room. */
function cannon(x: number, y: number, a: number): void {
  for (let j = 0; j < 26; j++) { const cx = x - 4 + j, cy = y - 3 + Math.round(j * 0.3), th = j > 22 ? 9 : 7, top = cy - Math.floor(th / 2); r(cx, top, 1, th, j === 5 || j === 16 || j > 22 ? CH.BRASS_DK : CH.BRASS); r(cx, top, 1, 1, M(CH.BRASS, K.WHITE, 0.45)); r(cx, top + th - 1, 1, 1, shade(CH.BRASS_DK, 0.8)); }
  r(x + 22, y + 2, 2, 5, [40, 30, 20]); // the dark of the muzzle
  lit(() => { for (let k = 0; k < 3; k++) r(x + 22, y + 2 + k * 2, 1, 1, CONFETTI[(k + Math.floor(a)) % CONFETTI.length]); }); // confetti poking out
  r(x + 2, y - 7, 3, 3, [220, 40, 60]); r(x + 5, y - 6, 3, 2, [220, 40, 60]); r(x + 4, y - 6, 1, 1, [255, 120, 140]); // a red bow
  line(x - 6, y + 5, x - 5, y + 9, [120, 120, 130]); r(x - 12, y + 9, 14, 7, K.PAPER); r(x - 12, y + 9, 14, 1, [230, 226, 214]); txt('DUO', x - 11, y + 10, [200, 40, 60]); // its tag, hanging off the bracket
}

// ---------------------------------------------------------------- the benches ----------------------------------------------------------------
/** The mix colours in the beaker you're filling. */
function beaker(b: number, cx: number, T: number, a: number): void {
  const bx = cx + BEAKER_DX, top = BEAKER_Y, bot = CHL.top + 2;
  // what's in it: a reaction's liquid, else what you've poured in so far
  const live = CHEM.live.filter((L) => L.b === b && (T - L.at) / 1000 < Math.max(2.5, L.out.dur * 0.6)).pop(), mine = CHEM.at === b ? CHEM.picks : [];
  alpha(0.35, () => r(bx - 6, top + 1, 12, bot - top - 1, CH.GLASS));
  if (live) { const c = live.out.c, lvl = 10; lit(() => { r(bx - 6, bot - lvl, 12, lvl, c); r(bx - 6, bot - lvl, 12, 1, M(c, K.WHITE, 0.45)); for (let k = 0; k < 3; k++) { const u = ((a * 1.6) + k / 3) % 1; r(bx - 4 + k * 3, Math.round(bot - 2 - u * (lvl - 2)), 1, 1, M(c, K.WHITE, 0.6)); } }); Gd(bx, bot - 5, 9, c, 0.3); }
  else mine.forEach((i, k) => { const c = REAGENTS[i].c; r(bx - 6, bot - 4 - k * 4, 12, 4, c); r(bx - 6, bot - 4 - k * 4, 12, 1, M(c, K.WHITE, 0.4)); if (i === 6) lit(() => r(bx - 6, bot - 4 - k * 4, 12, 4, c)); });
  r(bx - 7, top + 1, 1, bot - top - 1, CH.GLASS_DK); r(bx + 6, top + 1, 1, bot - top - 1, CH.GLASS_DK); r(bx - 7, bot, 14, 1, CH.GLASS_DK); r(bx - 8, top, 16, 1, K.WHITE); r(bx - 9, top, 2, 1, K.WHITE); // the glass, its lip and spout
  for (let y = top + 4; y < bot - 1; y += 3) r(bx + 3, y, 2, 1, CH.GLASS_DK); alpha(0.5, () => r(bx - 5, top + 2, 1, bot - top - 4, K.WHITE));
}
function bench(b: number): Prop {
  const cx = CHL.bench[b], x0 = cx - 75, x1 = cx + 75, B = CHL.benchY, T0 = CHL.top;
  return {
    y: B,
    draw(a: number) {
      const T = Date.now(), on = inUse(b);
      alpha(0.22, () => r(x0 - 2, B, x1 - x0 + 4, 4, [20, 34, 30]));
      // things standing on the top (behind its front edge): the burner, test tubes, the ring stand and its flask
      { const x = cx - 54; r(x - 5, T0 - 2, 11, 3, [60, 64, 70]); r(x - 5, T0 - 2, 11, 1, [100, 104, 110]); r(x - 1, T0 - 16, 3, 14, RX.STEEL); r(x - 1, T0 - 16, 1, 14, RX.STEEL_HI); r(x - 2, T0 - 8, 5, 2, RX.STEEL_DK); line(x + 5, T0, x + 12, T0 - 1, [60, 90, 70]);
        if (on) { const f = Math.floor(a * 14) % 3; lit(() => { r(x - 1, T0 - 23 + f, 3, 7 - f, CH.FLAME); r(x, T0 - 21 + f, 1, 4 - f, CH.FLAME_HI); }); Gd(x, T0 - 20, 7, CH.FLAME, 0.35); } }
      { const x = cx - 46; r(x, T0 - 6, 16, 5, CH.WOOD); r(x, T0 - 6, 16, 1, CH.WOOD_HI); const tc: RGB[] = [CH.TONIC, CH.GOO, CH.SLIME, CH.OIL]; for (let k = 0; k < 4; k++) { r(x + 1 + k * 4, T0 - 18, 2, 14, CH.GLASS); r(x + 1 + k * 4, T0 - 10, 2, 6, tc[(k + b) % 4]); r(x + 1 + k * 4, T0 - 18, 2, 1, K.WHITE); } }
      { const x = cx + 52, c = b ? CH.GOO : CH.TONIC; r(x - 12, T0 - 2, 24, 3, RX.STEEL_DK); r(x + 8, T0 - 44, 2, 42, RX.STEEL); r(x + 8, T0 - 44, 1, 42, RX.STEEL_HI); r(x - 4, T0 - 32, 14, 2, RX.STEEL_DK); disc(x - 2, T0 - 22, 6, CH.GLASS); disc(x - 2, T0 - 21, 5, c); r(x - 4, T0 - 38, 4, 10, CH.GLASS); r(x - 4, T0 - 38, 1, 10, CH.GLASS_DK); r(x - 5, T0 - 24, 2, 2, M(c, K.WHITE, 0.5)); }
      beaker(b, cx, T, a);
      // the scorch a KA-BOOM leaves (it fades over half a minute)
      for (const L of CHEM.live) if (L.b === b && L.out.kind === 'boom') { const u = (T - L.at) / 1000; if (u > 0.1 && u < 30) alpha(0.55 * (1 - u / 30), () => { oval(cx + BEAKER_DX, T0 + 1, 18, 2, [30, 26, 24]); r(cx + BEAKER_DX - 7, BEAKER_Y + 2, 14, 16, [40, 34, 30]); }); }
      // the top: black epoxy, a lit front edge; three white cabinets with steel handles; the kick plate
      r(x0 - 2, T0, x1 - x0 + 4, 4, CH.EPOXY_HI); r(x0 - 2, T0, x1 - x0 + 4, 1, M(CH.EPOXY_HI, K.WHITE, 0.25)); r(x0 - 2, T0 + 4, x1 - x0 + 4, 4, CH.EPOXY); r(x0 - 2, T0 + 7, x1 - x0 + 4, 1, CH.EPOXY_DK);
      r(x0, T0 + 8, x1 - x0, B - T0 - 8, CH.CAB_DK); // the carcass behind the doors
      for (let k = 0; k < 3; k++) { const dx = x0 + 3 + k * 49; r(dx, T0 + 9, 46, B - T0 - 12, CH.CAB); r(dx, T0 + 9, 46, 1, CH.CAB_HI); r(dx, T0 + 9, 1, B - T0 - 12, CH.CAB_HI); r(dx + 45, T0 + 9, 1, B - T0 - 12, CH.CAB_DK); r(dx + 19, T0 + 12, 8, 2, RX.STEEL_DK); r(dx + 19, T0 + 12, 8, 1, RX.STEEL_HI); }
      r(x0, B - 3, x1 - x0, 3, CH.EPOXY_DK);
      r(cx - 6, T0 + 16, 12, 9, [40, 50, 56]); r(cx - 6, T0 + 16, 12, 1, [70, 80, 88]); txt(b ? 'B' : 'A', cx - 1, T0 + 18, [255, 214, 90]);
      r(x0 + 6, T0 + 4, 4, 3, [255, 214, 90]); r(x0 + 7, T0 + 2, 2, 2, [200, 160, 60]); // the gas tap
      // the reactions going off here (and the two-chemist one, at both benches)
      const here = CHEM.live.filter((L) => L.b === b);
      here.forEach((L, i) => { const next = here[i + 1]; if (!next || T < next.at || ROAM.has(L.out.kind)) drawRx(L, T, a); });
      if (CHEM.duo?.id === 'toothpaste') column(b, (T - CHEM.duo.at) / 1000, a);
    },
  };
}

// ---------------------------------------------------------------- the reactions ----------------------------------------------------------------
const RAINBOW: RGB[] = [[255, 90, 90], [255, 170, 60], [255, 230, 90], [110, 220, 110], [90, 180, 255], [180, 120, 255]];
/** Reactions that wander off round the room: they keep going when the next mix at their bench takes over the beaker. */
const ROAM = new Set(['fireflies', 'worm', 'disco', 'boom']);
/** A small hash for particle k of a reaction (0..1). */
const hs = (L: Live, k: number): number => h1(L.seed * 0.001 + k * 7.13);
/** Everything a mix does, over its life: `u` = seconds since it went off. */
function drawRx(L: Live, T: number, a: number): void {
  const u = (T - L.at) / 1000, D = L.out.dur; if (u < 0 || u > D) return;
  const cx = CHL.bench[L.b], bx = cx + BEAKER_DX, by = BEAKER_Y, top = CHL.top, c = L.out.c, fade = clamp((D - u) / 0.8, 0, 1);
  switch (L.out.kind) {
    case 'foam': { // green foam: a column shoots up, slumps, and oozes over the bench and down its front
      const hi = M(c, CH.FOAM, 0.55), mid = M(c, CH.FOAM, 0.25), sh = shade(c, 0.78);
      const up = seg(u, 0.3, 1.3), slump = seg(u, 1.6, 3.4), h = Math.round(36 * eOut(up) * (1 - 0.7 * slump)), spread = Math.round(34 * eOut(seg(u, 1.0, 3.0)));
      alpha(fade, () => {
        for (let y = 0; y <= h; y += 3) { const w = 5 + Math.round(Math.sin(y * 0.5 + a * 6) * 1.2) + (y > h - 5 ? -1 : 0); oval(bx + Math.round(Math.sin(y * 0.3 + a * 3) * 1.5), by - y, w, 3, y % 6 ? mid : hi); r(bx + w - 2, by - y, 2, 2, sh); }
        if (h > 3) { disc(bx, by - h - 2, 6, hi); disc(bx + 2, by - h - 1, 3, M(hi, K.WHITE, 0.5)); }
        if (spread > 0) { for (let x = -spread; x <= spread; x += 4) { const hh = 3 + Math.round((1 - Math.abs(x) / (spread + 1)) * 4); oval(bx + x, top - 1, 3, hh / 2, x % 8 ? mid : hi); } for (const [dx, k] of [[-spread + 4, 0], [spread - 6, 1], [-8, 2]] as [number, number][]) { const len = Math.round(seg(u, 1.8 + k * 0.3, 3.8) * (12 + k * 5)); if (len > 0) { r(bx + dx, top + 3, 3, len, mid); disc(bx + dx + 1, top + 3 + len, 2, hi); } } }
        for (let k = 0; k < 8; k++) { const q = ((u * 1.3) + hs(L, k)) % 1, x = bx + Math.round((hs(L, k + 9) - 0.5) * 12), y = by - Math.round(q * Math.max(4, h)); r(x, y, 1, 1, K.WHITE); }
      });
      Gd(bx, by - h / 2, 10 + h / 3, c, 0.25 * fade); break;
    }
    case 'sparkler': { // gold sparks spraying out of the beaker, a white-hot core
      const on = u < 4.3;
      lit(() => {
        for (let k = 0; k < 110; k++) { const t0 = k * 0.039, t = u - t0; if (t < 0 || t > 0.65) continue; const an = -Math.PI / 2 + (hs(L, k) - 0.5) * 2.8, v = 44 + hs(L, k + 120) * 64, x = Math.round(bx + Math.cos(an) * v * t), y = Math.round(by - 2 + Math.sin(an) * v * t + 110 * t * t), q = t / 0.65, col = q < 0.3 ? K.WHITE : q < 0.7 ? CH.SPARK : [255, 140, 50] as RGB, big = k % 4 === 0 && q < 0.5; r(x, y, big ? 2 : 1, big ? 2 : 1, col); if (q < 0.55) { r(Math.round(x - Math.cos(an) * 2), Math.round(y - Math.sin(an) * 2), 1, 1, M(col, [255, 120, 40], 0.5)); r(Math.round(x - Math.cos(an) * 4), Math.round(y - Math.sin(an) * 4), 1, 1, M(col, [120, 50, 20], 0.6)); } }
        if (on) star4(bx, by - 2, (Math.floor(a * 20) % 2) + 1, K.WHITE);
      });
      if (on) { Gd(bx, by - 4, 14 + Math.sin(a * 30) * 3, CH.SPARK, 0.45); Gsoft(bx, by - 10, 6, 40, [255, 200, 120], 0.3); }
      for (let k = 0; k < 4; k++) { const q = ((u * 0.5) + k / 4) % 1; if (u < 4.6) alpha(0.3 * (1 - q), () => disc(Math.round(bx + Math.sin(k * 2 + u) * 3), Math.round(by - 6 - q * 30), Math.round(1 + q * 4), [210, 210, 216])); }
      break;
    }
    case 'fountain': { // bubbles stream up out of the beaker to the ceiling, popping on the way
      for (let k = 0; k < 36; k++) {
        const t0 = k * 0.14, life = 1.4 + hs(L, k) * 1.4, t = u - t0; if (t < 0 || t > life + 0.12) continue;
        const x = bx + Math.sin(t * 3 + k) * 4 * Math.min(1, t) + (hs(L, k + 40) - 0.5) * 30 * t, y = by - 2 - (32 + hs(L, k + 80) * 24) * t, rad = 1 + Math.floor(hs(L, k + 120) * 3);
        if (t > life) { lit(() => star4(Math.round(x), Math.round(y), 1, K.WHITE)); continue; }
        ring(Math.round(x), Math.round(y), rad, rad, M(CH.BUBBLE, K.WHITE, 0.3)); lit(() => r(Math.round(x) - Math.max(0, rad - 1), Math.round(y) - Math.max(0, rad - 1), 1, 1, K.WHITE));
      }
      Gd(bx, by - 20, 18, CH.BUBBLE, 0.15 * fade); break;
    }
    case 'smoke': { // rings of rainbow smoke drifting up and widening
      for (let k = 0; k < 8; k++) { const t = u - k * 0.5, life = 2.6; if (t < 0 || t > life) continue; const q = t / life, x = bx + Math.round(Math.sin(t * 2 + k) * 3), y = Math.round(by - 4 - t * 24), rx = Math.round(3 + t * 5), ry = Math.round(1 + t * 1.6), col = RAINBOW[k % RAINBOW.length]; alpha(1 - q * q, () => lit(() => { ring(x, y, rx, ry, col); ring(x, y + 1, rx, ry, col); ring(x, y - 1, rx + 1, ry, M(col, K.WHITE, 0.45)); })); Gd(x, y, rx + 4, col, 0.2 * (1 - q)); }
      break;
    }
    case 'ice': { // frost creeps over the bench, ice shards grow out of the beaker, snowflakes puff out
      const R = Math.round(62 * eOut(seg(u, 0, 1.3)));
      alpha(fade, () => {
        for (let x = -R; x <= R; x++) { const hh = Math.floor(h1(x * 3.7 + L.seed) * 4); r(bx + x, top - hh, 1, hh + 2, x % 5 ? [226, 244, 255] : K.WHITE); if ((x + 60) % 9 === 0) r(bx + x, top + 4, 1, 3 + (x % 2), [200, 232, 255]); }
        for (const [dx, hgt, lean] of [[-4, 14, -3], [0, 18, 0], [4, 12, 3], [-1, 9, -6]] as [number, number, number][]) { const g = Math.round(hgt * eOut(seg(u, 0.2, 1.1))); for (let j = 0; j < g; j++) { const w = Math.max(1, Math.round(3 * (1 - j / (hgt + 1)))); r(bx + dx + Math.round(lean * j / hgt) - Math.floor(w / 2), by - j, w, 1, j % 3 ? [200, 236, 255] : K.WHITE); } }
      });
      lit(() => { for (let k = 0; k < 16; k++) { const t = u - 0.4 - k * 0.14; if (t < 0 || t > 2.6) continue; const x = bx + (hs(L, k) - 0.5) * 90 * Math.min(t, 1.4), y = by - 34 * t + 22 * t * t; alpha(1 - t / 2.6, () => star4(Math.round(x), Math.round(y), 1, K.WHITE)); } });
      Gsoft(bx, top - 4, 6, 50, [200, 236, 255], 0.35 * fade); break;
    }
    case 'storm': { // a tiny rain cloud over the beaker, rain, and a tiny lightning bolt (twice)
      const grow = eOB(seg(u, 0, 1)), gone = seg(u, 6, 7), cy = by - 44, sc = grow * (1 - gone);
      if (sc > 0.05) { for (const [dx, dy, rx, ry] of [[-10, 2, 8, 5], [0, -2, 10, 7], [10, 1, 8, 5], [-4, 4, 12, 4], [6, 4, 10, 4]] as [number, number, number, number][]) oval(bx + Math.round(dx * sc), cy + Math.round(dy * sc), Math.max(1, Math.round(rx * sc)), Math.max(1, Math.round(ry * sc)), dy > 2 ? shade(c, 0.75) : c); oval(bx - Math.round(2 * sc), cy - Math.round(5 * sc), Math.max(1, Math.round(7 * sc)), Math.max(1, Math.round(3 * sc)), M(c, K.WHITE, 0.35)); }
      if (u > 1 && u < 6) lit(() => { for (let k = 0; k < 10; k++) { const q = ((u * 2.2) + hs(L, k)) % 1, x = bx - 12 + Math.round(hs(L, k + 20) * 24); r(x, Math.round(cy + 5 + q * (by - cy - 6)), 1, 3, [150, 200, 255]); } });
      for (const t0 of [3, 4.9]) if (u >= t0 && u < t0 + 0.22) { lit(() => { let x = bx + 3, y = cy + 5; for (let k = 0; k < 5; k++) { const nx = x + (k % 2 ? 3 : -3), ny = y + 6; line(x, y, nx, ny, K.WHITE); x = nx; y = ny; } }); G(bx - 60, by - 70, 120, 90, [220, 230, 255], 0.3); }
      break;
    }
    case 'lava': { // the beaker glows, and slow blobs rise and sink in it
      const bot = top + 2;
      lit(() => { r(bx - 6, bot - 14, 12, 14, M(CH.GOO, CH.OIL, 0.25)); for (let k = 0; k < 3; k++) { const q = Math.sin(u * 0.8 + k * 2.1) * 0.5 + 0.5, y = Math.round(bot - 3 - q * 10), x = bx - 3 + k * 3; disc(x, y, k === 1 ? 2 : 1, M(CH.OIL, [255, 200, 120], 0.3)); r(x - 1, y - 1, 1, 1, K.WHITE); } });
      Gsoft(bx, bot - 8, 5, 34, CH.OIL, (0.35 + 0.1 * Math.sin(u * 2)) * fade); break;
    }
    case 'geyser': { // a column of goo shoots up, wobbles, and splats back down on the bench
      const up = eOut(seg(u, 0, 0.35)), down = seg(u, 0.9, 1.3), h = Math.round(70 * up * (1 - down)), hi = M(c, K.WHITE, 0.35), dk = shade(c, 0.7);
      if (h > 0) {
        for (let y = 0; y < h; y += 2) { const w = 3 + Math.round((1 - y / Math.max(h, 1)) * 2 + Math.sin(y * 0.4 + u * 18) * 1), x = bx + Math.round(Math.sin(y * 0.15 + u * 9) * 1.5); r(x - w, by - y - 2, w * 2, 2, c); r(x - w, by - y - 2, 1, 2, hi); r(x + w - 1, by - y - 2, 1, 2, dk); }
        const bl = u > 0.35 && u < 0.9 ? Math.round(Math.sin(u * 20) * 2) : 0; disc(bx, by - h - 2, 5 + bl, c); disc(bx - 1, by - h - 3, 2, hi); r(bx + 3, by - h, 2, 2, dk);
        for (let k = 0; k < 5; k++) { const y = by - Math.round(h * (0.15 + hs(L, k) * 0.8)), dx = k % 2 ? 4 : -6, len = 2 + Math.round(hs(L, k + 9) * 4); r(bx + dx, y, 2, len, c); r(bx + dx, y + len, 2, 1, dk); }
      }
      if (u > 0.9 && u < 1.35) { const q = seg(u, 0.9, 1.35), y = Math.round(by - 70 + q * q * 70 + 14); disc(bx + 16, Math.min(top - 3, y), 4, c); }
      if (u > 1.3) alpha(fade, () => { for (const [dx, w] of [[16, 9], [-12, 6], [30, 4], [4, 5]] as [number, number][]) oval(bx + dx, top + 1, w, 1, c); for (const [dx, k] of [[18, 0], [-10, 1]] as [number, number][]) { const len = Math.round(seg(u, 1.4 + k * 0.3, 3) * (10 + k * 6)); r(bx + dx, top + 4, 2, len, c); } });
      break;
    }
    case 'worm': { // a glowing worm wriggles out, down the bench's end and away across the floor
      const x1 = cx + 72, path = (t: number): [number, number] => {
        if (t < 1.2) { const q = seg(t, 0, 1.2); return q < 0.5 ? [bx, by + 8 - q * 20] : [bx + (q - 0.5) * 16, by - 2 + (q - 0.5) * 30]; }
        if (t < 3.2) { const q = seg(t, 1.2, 3.2); return [bx + 8 + q * (x1 - bx - 8), top - 2]; }
        if (t < 4.2) { const q = seg(t, 3.2, 4.2); return [x1 + 2, top - 2 + q * (CHL.benchY - top + 4)]; }
        const q = seg(t, 4.2, D); return [x1 + 2 + q * 110, CHL.benchY + 2 + Math.sin(q * 4) * 5 + q * 26];
      };
      alpha(fade, () => lit(() => { for (let k = 6; k >= 0; k--) { const [x, y] = path(Math.max(0, u - k * 0.1)), wy = Math.round(Math.sin(u * 10 - k) * 1); r(Math.round(x) - 1, Math.round(y) - 2 + wy, 3, 3, k === 0 ? M(CH.GLOW, K.WHITE, 0.3) : k % 2 ? CH.GLOW : shade(CH.GLOW, 0.85)); if (k === 0) { r(Math.round(x), Math.round(y) - 2 + wy, 1, 1, K.EYE); r(Math.round(x) + 2, Math.round(y) - 2 + wy, 1, 1, K.EYE); } } }));
      const [hx, hy] = path(u); Gd(hx, hy - 1, 7, CH.GLOW, 0.4 * fade); break;
    }
    case 'fireflies': { // a dozen blinking lights drift out of the beaker and wander the room
      const out = eOut(seg(u, 0, 1.5));
      for (let k = 0; k < 12; k++) {
        const ax = 70 + hs(L, k) * 160, ph = hs(L, k + 20) * 6.3, fx = bx + (Math.sin(u * 0.45 * (0.7 + hs(L, k + 40)) + ph) * ax + Math.cos(u * 0.21 + ph) * ax * 0.35) * out, fy = by - 4 - (30 + (Math.sin(u * 0.37 + ph * 2) * 0.5 + 0.5) * 110) * out;
        const bright = Math.sin(u * (2.2 + hs(L, k + 60) * 1.6) + ph); if (bright > -0.35) { const x = Math.round(fx), y = Math.round(fy); lit(() => { r(x, y, 2, 2, c); r(x, y, 1, 1, K.WHITE); if (bright > 0.4) { r(x - 1, y, 1, 1, M(c, K.WHITE, 0.3)); r(x + 2, y + 1, 1, 1, M(c, K.WHITE, 0.3)); } }); Gd(fx + 1, fy + 1, 7, c, (0.35 + 0.35 * Math.max(0, bright)) * fade); }
      }
      break;
    }
    case 'boom': { // a white flash, a shockwave, a soot cloud, sparks flying
      if (u < 0.2) lit(() => disc(bx, by - 2, Math.round(4 + u * 30), K.WHITE));
      if (u < 0.4) lit(() => alpha(1 - u / 0.4, () => ring(bx, by - 4, Math.round(6 + u * 130), Math.round((6 + u * 130) * 0.35), K.WHITE)));
      for (let k = 0; k < 8; k++) { const t = u - 0.04 * k; if (t < 0) continue; const x = bx + Math.round((hs(L, k) - 0.5) * 34), y = Math.round(by - 6 - t * 9 - hs(L, k + 9) * 12), rad = Math.round(3 + t * 5 + hs(L, k + 20) * 3); alpha(0.85 * clamp(1 - t / 2.8, 0, 1), () => { disc(x, y, rad, [44, 40, 42]); disc(x - 1, y - 1, Math.max(1, rad - 2), [70, 66, 68]); }); }
      lit(() => { for (let k = 0; k < 14; k++) { const t = u; if (t > 0.8) break; const an = -Math.PI * hs(L, k + 30), v = 60 + hs(L, k + 50) * 70, x = bx + Math.cos(an) * v * t, y = by - 4 + Math.sin(an) * v * t + 140 * t * t; r(Math.round(x), Math.round(y), 1, 1, t < 0.3 ? K.WHITE : CH.SPARK); } });
      if (u < 0.5) Gsoft(bx, by, 10, 90, [255, 240, 200], 0.6 * (1 - u / 0.5));
      break;
    }
    case 'disco': { // a disco ball comes down on a string, spinning and glinting (the lights are the room's, in drawBack)
      const down = eOut(seg(u, 0, 1)) * (1 - seg(u, D - 1, D)), y = Math.round(CEIL + 4 + down * (by - 70 - CEIL)), x = bx;
      line(x, CEIL + 4, x, y - 7, [60, 64, 70]);
      r(x - 2, y - 11, 5, 3, [80, 86, 96]);
      lit(() => { disc(x, y, 9, [140, 146, 162]); const sp = Math.floor(u * 8); for (let j = -8; j <= 8; j += 2) for (let i = -8; i <= 8; i += 2) if (i * i + j * j <= 70) r(x + i, y + j, 2, 2, ((i + j) / 2 + sp) % 2 ? [226, 232, 242] : RAINBOW[Math.abs(i * 3 + j + sp) % RAINBOW.length]); for (let k = 0; k < 4; k++) if ((a * 5 + k * 0.37) % 1 < 0.35) star4(x - 6 + k * 4, y - 5 + (k % 2) * 7, 1 + (k % 2), K.WHITE); });
      Gd(x, y, 16, K.WHITE, 0.4); break;
    }
    case 'potion': { // the beaker fizzes in the potion's colour, then a corked flask pops up out of it and away into the mixer's hand
      lit(() => { for (let k = 0; k < 10; k++) { const q = ((u * 2.4) + hs(L, k)) % 1; if (u < 1.3) r(bx - 5 + Math.round(hs(L, k + 10) * 10), Math.round(by - q * 10), 1, 1, M(c, K.WHITE, 0.6)); } });
      if (u > 0.9 && u < 1.9) { const q = seg(u, 0.9, 1.9), y = Math.round(by - 4 - eOut(q) * 20), s = q > 0.8 ? 1 - (q - 0.8) / 0.2 : 1; if (s > 0.1) { potionSprite(bx, y, c, Math.floor(u * 8) % 2); } }
      if (u > 1.1 && u < 1.5) lit(() => { for (let k = 0; k < 8; k++) { const an = k * 0.785 + u, d = 6 + (u - 1.1) * 40; star4(Math.round(bx + Math.cos(an) * d), Math.round(by - 20 + Math.sin(an) * d * 0.7), 1, k % 2 ? K.WHITE : c); } });
      Gd(bx, by - 8, 12, c, 0.35 * fade); break;
    }
    case 'puff': { // puffs of smoke in the mix's colour
      for (let k = 0; k < 6; k++) { const t = u - k * 0.26, life = 1.6; if (t < 0 || t > life) continue; const q = t / life; alpha(0.7 * (1 - q), () => disc(Math.round(bx + Math.sin(k * 1.7) * 4), Math.round(by - 4 - t * 20), Math.round(2 + t * 5), c)); }
      break;
    }
    case 'fizz': { // it bubbles over the top and spatters the bench
      const lt = M(c, K.WHITE, 0.35), dk = shade(c, 0.75);
      alpha(fade, () => {
        for (let k = 0; k < 14; k++) { const q = ((u * 1.4) + hs(L, k)) % 1, side = k % 2 ? 1 : -1, x = bx + side * (5 + Math.round(q * 4)), y = Math.round(by + q * 15); disc(x, y, 1 + (k % 3 ? 1 : 0), k % 3 ? c : lt); r(x - 1, y - 1, 1, 1, K.WHITE); }
        for (let k = 0; k < 5; k++) { const bob = Math.round(Math.sin(u * 9 + k) * 1.5); disc(bx - 8 + k * 4, by - 2 + bob, 3, k % 2 ? c : lt); r(bx - 9 + k * 4, by - 3 + bob, 1, 1, K.WHITE); } r(bx - 9, by + 1, 18, 1, dk); for (let k = 0; k < 4; k++) { const t = u - 0.2 - k * 0.35; if (t < 0 || t > 0.7) continue; const vx = (hs(L, k) - 0.5) * 60, x = bx + vx * t, y = by - 2 - 50 * t + 120 * t * t; r(Math.round(x), Math.round(Math.min(top - 1, y)), 2, 1, c); }
        for (const [dx, w] of [[-18, 3], [20, 2], [28, 3]] as [number, number][]) if (u > 0.8) oval(bx + dx, top + 1, w, 1, c);
      });
      break;
    }
    case 'sludge': { // it goes brown, blorps twice, and a stink line wafts up
      const bot = top + 2;
      r(bx - 6, bot - 9, 12, 9, c); r(bx - 6, bot - 9, 12, 1, M(c, K.WHITE, 0.2));
      for (const t0 of [0.4, 1.4]) { const t = u - t0; if (t >= 0 && t < 0.6) { const rad = Math.round(1 + t * 8); if (t < 0.45) disc(bx, bot - 9 - rad, rad, M(c, K.WHITE, 0.15)); else ring(bx, bot - 12, rad, Math.max(1, Math.round(rad / 2)), M(c, K.WHITE, 0.3)); } }
      if (u > 1.6) for (let k = 0; k < 2; k++) { const q = ((u - 1.6) * 0.6 + k * 0.4) % 1; alpha(0.7 * (1 - q) * fade, () => { for (let j = 0; j < 12; j++) r(bx - 3 + k * 6 + Math.round(Math.sin(j * 0.8 + u * 4) * 2), Math.round(by - 6 - q * 20 - j), 1, 1, [150, 170, 70]); }); }
      break;
    }
  }
  // its name pops up over the beaker: gold for a discovery, grey for the everyday ones
  if (u < 2.4) { const s = L.out.name + (L.out.rx ? '!' : ''), k = eOB(seg(u, 0, 0.35)), y = Math.round(by - 30 - k * 10); alpha(clamp((2.4 - u) / 0.5, 0, 1), () => txtOutlined(s, Math.round(bx - tw(s) / 2), y, L.out.rx ? [255, 214, 90] : [226, 230, 236])); }
}
/** A little corked potion flask (from a reaction, and in your hand: entities/avatar.ts has its own). */
export function potionSprite(x: number, y: number, c: RGB, tilt: number): void {
  r(x - 3, y - 5, 7, 7, CH.GLASS); r(x - 2, y - 4, 5, 5, c); r(x - 2, y - 4, 1, 1, K.WHITE); r(x - 1 + tilt, y - 9, 3, 4, CH.GLASS); r(x - 1 + tilt, y - 10, 3, 2, [176, 132, 84]); Gd(x, y - 2, 6, c, 0.4);
}
/** The DISCO's lights: beams sweeping from the ball, coloured spots chasing round the floor, the room pulsing. */
function discoLights(L: Live, u: number, a: number): void {
  const k = seg(u, 0.8, 1.4) * (1 - seg(u, L.out.dur - 1, L.out.dur)), bx = CHL.bench[L.b] + BEAKER_DX, by = BEAKER_Y - 70;
  if (k <= 0) return;
  for (let j = 0; j < 8; j++) { const an = u * 1.4 + j * 0.785, col = RAINBOW[j % RAINBOW.length]; Gline(bx, by, bx + Math.cos(an) * 340, by + 60 + Math.abs(Math.sin(an)) * 160, col, 0.24 * k, 7); }
  for (let j = 0; j < 10; j++) { const x = bx + Math.sin(u * 1.1 + j * 1.9) * 320, y = 540 + Math.sin(u * 0.8 + j) * 60; Gd(x, y, 18, RAINBOW[(j + Math.floor(u * 2)) % RAINBOW.length], 0.5 * k); Gd(x, y, 8, K.WHITE, 0.2 * k); }
  G(0, CEIL, W, H - CEIL, RAINBOW[Math.floor(u * 2) % RAINBOW.length], (Math.floor(u * 4) % 2 ? 0.08 : 0.03) * k);
  void a;
}

// ---------------------------------------------------------------- the two-chemist reactions ----------------------------------------------------------------
/** ELEPHANT TOOTHPASTE's foam column at bench b: striped foam bursts up out of the beaker, flops over and keeps coming. */
function column(b: number, u: number, a: number): void {
  if (u < 0 || u > 26) return;
  const bx = CHL.bench[b] + BEAKER_DX, by = BEAKER_Y, up = eOut(seg(u, 0, 1.8)), sink = seg(u, 6, 22), h = Math.round(110 * up * (1 - sink)), fade = clamp((26 - u) / 2, 0, 1);
  const cols: RGB[] = [[255, 170, 200], CH.FOAM, [255, 230, 140], CH.FOAM];
  alpha(fade, () => {
    for (let y = 0; y <= h; y += 2) { const band = Math.floor((y + u * 30) / 6) % cols.length, w = 7 + Math.round(Math.sin(y * 0.2 + a * 3) * 1.5) + (y < 10 ? 2 : 0), lean = Math.round(Math.sin(y * 0.03 + u) * (y / 20)); r(bx - w + lean, by - y, w * 2, 2, cols[band]); r(bx - w + lean, by - y, 2, 2, K.WHITE); r(bx + w - 2 + lean, by - y, 2, 2, CH.FOAM_SH); }
    if (h > 8) { const lean = Math.round(Math.sin(h * 0.03 + u) * (h / 20)); for (let k = 0; k < 5; k++) disc(bx + lean - 8 + k * 4, by - h - 2 + (k % 2), 4, k % 2 ? cols[0] : CH.FOAM); }
    const spill = Math.round(70 * eOut(seg(u, 1.4, 4))); for (let x = -spill; x <= spill; x += 5) { oval(bx + x, CHL.top - 2, 4, 3, Math.abs(x) % 25 ? CH.FOAM : cols[0]); r(bx + x - 2, CHL.top - 4, 3, 1, K.WHITE); }
    for (const dx of [-spill + 4, spill - 4, -20, 26]) { const len = Math.round(seg(u, 2, 5) * 30); if (len > 0) { r(bx + dx - 2, CHL.top + 2, 5, len, CH.FOAM); r(bx + dx - 2, CHL.top + 2, 1, len, K.WHITE); } }
  });
}
/** The toothpaste's foam over the floor, a strip for each band of depth, so it comes up to everyone's knees (not over their heads). */
const STRIP_Y0 = 472, STRIP_H = 10, STRIPS = Math.ceil((H - STRIP_Y0) / STRIP_H);
function flood(a: number): Prop[] {
  const d = CHEM.duo; if (!d || d.id !== 'toothpaste') return [];
  const u = (Date.now() - d.at) / 1000; if (u < 2.5 || u > 26) return [];
  const lv = Math.round(8 * eOut(seg(u, 2.5, 8)) * (1 - seg(u, 18, 26)));
  if (lv < 1) return [];
  const vx0 = Math.max(0, Math.floor((CHEM.view.x0 - 16) / 8) * 8), vx1 = Math.min(W, CHEM.view.x1 + 16), sh = M(CH.FOAM, CH.FOAM_SH, 0.5);
  const out: Prop[] = [];
  for (let s = 0; s < STRIPS; s++) {
    const y = STRIP_Y0 + s * STRIP_H;
    if (y - lv - 4 > CHEM.view.y1 || y + STRIP_H < CHEM.view.y0) continue; // (out of view)
    out.push({ y: y + STRIP_H - 1, draw() {
      r(vx0, y - lv, vx1 - vx0, lv + STRIP_H - 2, CH.FOAM); r(vx0, y + STRIP_H - 2, vx1 - vx0, 2, sh); // the foam itself, then its lumpy top a column at a time
      for (let x = vx0; x < vx1; x += 8) { const bump = Math.max(0, Math.round(1 + Math.sin(x * 0.1 + s * 1.7 + a * 1.2) + Math.sin(x * 0.04 + s * 0.6))), top = y - lv - bump; if (bump) r(x, top + 1, 8, bump, CH.FOAM); r(x, top, 8, 1, K.WHITE); }
      for (let k = 0; k < 7; k++) { const x = Math.floor(h1(s * 13 + k) * W), yy = y - Math.round(h1(s * 7 + k) * lv); if (x > vx0 && x < vx1) { r(x, yy, 2, 1, CH.FOAM_SH); r(x - 1, yy - 1, 1, 1, K.WHITE); } } // bubbles in it
      for (let k = 0; k < 3; k++) { const x = Math.floor(h1(s * 29 + k * 3) * W); if (x > vx0 && x < vx1) oval(x, y - Math.round(lv * 0.5), 4, 1, k % 2 ? [255, 214, 226] : [255, 240, 176]); }
    } });
  }
  return out;
}
/** CONFETTI CANNON: every piece's flight: a blast out of the muzzle, then fluttering down to land somewhere on the floor. */
const CONF_N = 260;
function confettiPiece(k: number, t: number): { x: number; y: number; land: number } {
  const vx = (h1(k * 3.3) - 0.42) * 560, vy = -50 - h1(k * 5.1) * 170, land = 480 + h1(k * 9.7) * 146, x0 = CHL.cannon.x + 26, y0 = CHL.cannon.y + 6;
  if (t < 0.7) return { x: x0 + vx * t, y: y0 + vy * t + 170 * t * t, land };
  const x7 = x0 + vx * 0.7, y7 = y0 + vy * 0.7 + 170 * 0.49, tt = t - 0.7;
  return { x: x7 + vx * 0.12 * tt + Math.sin(t * 4 + k) * 8, y: y7 + (30 + h1(k * 1.9) * 16) * tt, land };
}
/** A piece of confetti, tumbling (it flips between its face and its edge). */
function confettiBit(x: number, y: number, k: number, t: number): void {
  const c = CONFETTI[k % CONFETTI.length], f = Math.floor(t * 9 + k) % 3;
  if (f === 0) r(x, y, 3, 2, c); else if (f === 1) r(x, y, 1, 3, shade(c, 0.75)); else { r(x, y, 2, 2, c); r(x, y, 1, 1, M(c, K.WHITE, 0.5)); }
}
function confettiAir(u: number): void {
  if (u < 0 || u > 14) return;
  lit(() => { for (let k = 0; k < CONF_N; k++) { const p = confettiPiece(k, u); if (p.y < p.land) confettiBit(Math.round(p.x), Math.round(p.y), k, u); } });
  if (u < 0.35) { lit(() => disc(CHL.cannon.x + 28, CHL.cannon.y + 6, Math.round(3 + u * 20), K.WHITE)); Gsoft(CHL.cannon.x + 28, CHL.cannon.y + 6, 6, 60, [255, 240, 200], 0.6 * (1 - u / 0.35)); }
}
function confettiFloor(u: number): void {
  const k0 = clamp(1 - (u - 30) / 10, 0, 1);
  alpha(k0, () => { for (let k = 0; k < CONF_N; k++) { const p = confettiPiece(k, u); if (p.y < p.land) continue; r(Math.round(p.x), Math.round(p.land), 2 + (k % 2), 1, CONFETTI[k % CONFETTI.length]); } });
}

/** Over everything: the confetti in the air, and the two-chemist reaction's name. */
function drawFront(a: number): void {
  const d = CHEM.duo; if (!d) return;
  const u = (Date.now() - d.at) / 1000;
  if (d.id === 'confetti') confettiAir(u);
  if (u >= 0 && u < 3.5) { const s = (rxById(d.id)?.name ?? '') + '!!', k = eOB(seg(u, 0, 0.4)), y = Math.round(430 - k * 16); alpha(clamp((3.5 - u) / 0.6, 0, 1), () => txtOutlined(s, Math.round(CHL.lectern - tw(s, 2) / 2), y, [255, 214, 90], 2)); Gd(CHL.lectern, y + 5, 40, [255, 214, 90], 0.2); }
  void a;
}

// ---------------------------------------------------------------- the lectern, BONEY, the shower's water ----------------------------------------------------------------
const lectern: Prop = {
  y: 552,
  draw(a: number) {
    const x = CHL.lectern;
    alpha(0.2, () => r(x - 16, 551, 32, 3, [20, 34, 30]));
    r(x - 14, 548, 28, 4, CH.WOOD_DK); r(x - 5, 532, 10, 16, CH.WOOD); r(x - 5, 532, 2, 16, CH.WOOD_HI); r(x + 3, 532, 2, 16, CH.WOOD_DK);
    r(x - 20, 526, 40, 7, CH.WOOD); r(x - 20, 526, 40, 1, CH.WOOD_HI); r(x - 20, 532, 40, 1, CH.WOOD_DK);
    // THE RECIPE BOOK, open: two pages of scribbles, a ribbon, and now and then a page turns
    r(x - 18, 521, 36, 6, K.PAPER); r(x - 1, 521, 2, 6, [210, 204, 190]); r(x - 18, 526, 36, 1, [200, 190, 170]);
    for (let k = 0; k < 3; k++) { r(x - 16, 522 + k * 2 - (k === 2 ? 0 : 0), 12 - (k % 2) * 4, 1, [120, 120, 140]); r(x + 3, 522 + k * 2, 12 - ((k + 1) % 2) * 5, 1, [120, 120, 140]); }
    r(x - 12, 522, 3, 3, CH.SLIME); r(x + 9, 523, 3, 2, CH.OIL); // little doodles of flasks
    r(x + 6, 527, 2, 8, [200, 40, 60]);
    const p = (a / 9) % 1; if (p < 0.12) { const q = p / 0.12, px = Math.round(x + 16 - q * 32), w = Math.round(Math.abs(Math.cos(q * Math.PI)) * 14); r(Math.min(x, px), 519 - Math.round(Math.sin(q * Math.PI) * 4), Math.max(1, w), 6, K.WHITE); }
    r(x - 16, 527, 32, 6, CH.BRASS_DK); r(x - 16, 527, 32, 1, CH.BRASS); txt('RECIPES', x - tw('RECIPES') / 2, 528, [255, 230, 160]);
  },
};
/** BONEY: a skeleton model on a wheeled stand, in a lab coat and goggles. He clacks and turns to watch anyone going past. */
const boney: Prop = {
  y: 540,
  draw(a: number) {
    const x = CHL.boney, T = performance.now() / 1000, since = T - CHEM.boney, clack = since >= 0 && since < 1.2, look = clack ? CHEM.boneyDir : 0, jaw = clack && Math.floor(since * 8) % 2 ? 2 : 0, sway = Math.round(Math.sin(a * 0.9) * 0.6);
    alpha(0.25, () => oval(x, 540, 16, 2, [20, 34, 30]));
    for (const wx of [-12, 0, 12]) { disc(x + wx, 538, 2, [40, 44, 50]); r(x + wx - 1, 537, 1, 1, [90, 96, 104]); }
    r(x - 14, 532, 28, 3, RX.STEEL_DK); r(x - 1, 468, 3, 64, RX.STEEL); r(x - 1, 468, 1, 64, RX.STEEL_HI);
    const B = CH.BONE, BD = CH.BONE_DK, hx = x + sway + look;
    for (const lx of [-5, 4]) { r(x + lx, 510, 2, 20, B); r(x + lx + 1, 510, 1, 20, BD); r(x + lx - 1, 519, 4, 2, B); r(x + lx - 1, 529, 4, 2, B); } // legs, knees, feet
    r(x - 7, 504, 14, 6, B); r(x - 7, 509, 14, 1, BD); r(x - 3, 505, 6, 3, BD); // pelvis
    r(x, 486, 2, 20, BD); for (let k = 0; k < 5; k++) { r(x - 8 + (k > 3 ? 1 : 0), 487 + k * 3, 17 - (k > 3 ? 2 : 0), 2, B); r(x - 8, 488 + k * 3, 17, 1, BD); } // spine and ribs
    // the lab coat, open over the ribs
    for (let y = 484; y < 514; y++) { const w = 6 + Math.floor((y - 484) / 6); r(x - 10 - Math.floor(w / 3), y, w - 1, 1, y > 510 ? K.COAT_SH : K.COAT); r(x + 11 - w + Math.floor(w / 3), y, w - 1, 1, y > 510 ? K.COAT_SH : K.COAT); }
    r(x - 11, 484, 22, 2, K.COAT); r(x - 8, 486, 2, 26, K.COAT_LN); r(x + 7, 486, 2, 26, K.COAT_LN);
    for (const s of [-1, 1]) { r(x + s * 13 - (s < 0 ? 1 : 0), 486, 2, 12, B); r(x + s * 13 - (s < 0 ? 1 : 0), 498, 2, 12, B); r(x + s * 13 - 1 - (s < 0 ? 1 : 0), 509, 4, 3, B); } // arms hanging, hands
    // the skull: goggles pushed up on it, the jaw clacking when he's watching someone
    r(hx - 6, 468, 12, 11, B); r(hx - 5, 467, 10, 1, B); r(hx + 4, 469, 2, 9, BD); r(hx - 4 + look, 473, 3, 3, [40, 36, 40]); r(hx + 1 + look, 473, 3, 3, [40, 36, 40]); r(hx, 477, 1, 1, [40, 36, 40]);
    r(hx - 4, 479 + jaw, 8, 3, B); for (let k = 0; k < 4; k++) r(hx - 3 + k * 2, 479 + jaw, 1, 1, BD); if (jaw) r(hx - 4, 479, 8, 2, [40, 36, 40]);
    goggles(hx, 465);
  },
};
/** The safety shower's water, over whoever's under it (it's drawn just in front of them). */
const showerWater: Prop = {
  y: 489,
  draw(a: number) {
    if (!inUse(SPOT.SHOWER)) return;
    const x = CHL.shower;
    lit(() => { for (let k = 0; k < 12; k++) { const q = ((a * 2.6) + k / 12) % 1, sx = x - 11 + (k * 2) % 22 + Math.round(Math.sin(k) * 1), y0 = 375 + Math.round(q * 100); r(sx, y0, 1, 7, [180, 225, 255]); } for (let k = 0; k < 6; k++) { const q = ((a * 3) + k / 6) % 1; r(x - 14 + k * 5 + Math.round(q * 3), 486 - Math.round(Math.sin(q * Math.PI) * 5), 1, 1, K.WHITE); } });
    alpha(0.25, () => r(x - 13, 375, 26, 110, [170, 220, 255])); Gd(x, 430, 16, [170, 220, 255], 0.12);
  },
};

// ---------------------------------------------------------------- spots (append only!) and talkers ----------------------------------------------------------------
const benchSpot = (b: number): Spot => { const cx = CHL.bench[b]; return { kind: 'chem', n: b, x: cx - 16, y: 546, sx: cx - 16, sy: 546, lift: 0, label: 'MIX', area: { x0: cx - 75, y0: 500, x1: cx + 75, y1: CHL.benchY } }; };
export const CHEM_SPOTS: Spot[] = [
  benchSpot(0), benchSpot(1), // 0-1
  { kind: 'recipes', x: CHL.lectern, y: 540, sx: CHL.lectern, sy: 540, lift: 0, label: 'READ', area: { x0: CHL.lectern - 20, y0: 512, x1: CHL.lectern + 20, y1: 552 } }, // 2
  { kind: 'goggles', x: CHL.goggles, y: 482, sx: CHL.goggles, sy: 482, lift: 0, label: 'GOGGLES', area: { x0: CHL.goggles - 24, y0: 354, x1: CHL.goggles + 26, y1: 422 } }, // 3
  { kind: 'shower', x: CHL.shower, y: 488, sx: CHL.shower, sy: 488, lift: 0, label: 'PULL CHAIN', area: { x0: CHL.shower - 16, y0: 362, x1: CHL.shower + 22, y1: 440 } }, // 4
];
const T_ = (id: string, name: string, verb: string, x: number, y: number, sx: number, lines: string[], poke?: () => void): Talker => ({ id: 'chem-' + id, name, verb, x, y, sx, sy: 482, lines, poke });
const TALK: Talker[] = [
  T_('blanket', 'FIRE BLANKET', 'READ', 120, 372, 120, ['FIRE BLANKET: pull both tabs, smother the fire. or have a nap', 'nobody has ever needed it. touch wood. (the benches are epoxy)']),
  T_('board', 'EXPERIMENTS', 'READ', 187, 356, 187, ['every mix on this server gets a tally mark up here', 'somebody has drawn a tiny mushroom cloud in the corner']),
  T_('hood1', 'FUME HOOD 1', 'LOOK', CHL.bench[0], 372, CHL.bench[0], ['something orange is bubbling on the hot plate. do not sniff it', 'the fan pulls the fumes away from your face. mostly', 'the flask is labelled SOUP?. the question mark is worrying']),
  T_('cannon', 'CONFETTI CANNON', 'LOOK', CHL.cannon.x + 10, CHL.cannon.y, 602, ['a confetti cannon, aimed at the room. its tag says DUO USE ONLY', 'it only fires when two chemists make the same thing at the same moment']),
  T_('shelf', 'REAGENTS', 'READ', 668, 366, 668, ['eight reagents, numbered 1 to 8. mix two or three at a bench', 'CRITTER TONIC: "works on critters". the label is very sure of itself', 'BUBBLE JUICE: "NOT for drinking". someone has crossed out NOT', 'GLOW POWDER: store in the dark. it will not stay dark']),
  T_('hood2', 'FUME HOOD 2', 'LOOK', CHL.bench[1], 372, CHL.bench[1], ['a distillation rig: boil, cool, drip. repeat forever', 'HOOD 2 SMELLS OF SOUP, says the note. it does', 'drip... drip... drip...']),
  T_('table', 'PERIODIC TABLE', 'READ', 928, 352, 928, ['THE PERIODIC TABLE OF CRITTERS. Fz: FIZZIUM. Cr: CRITTERIUM', 'Gl: GLOWIUM. it glows. that is the whole element', 'someone has added Dk: DUCKIUM. in pen. with a drawing']),
  T_('fish', 'SIR BUBBLES', 'LOOK', 1000, 398, 1000, ['SIR BUBBLES, the lab goldfish. he lives in a round-bottom flask', 'blub.', 'he has seen every experiment in here. nothing surprises him']),
  { id: 'chem-boney', name: 'BONEY', verb: 'TALK', x: CHL.boney, y: 462, sx: CHL.boney - 22, sy: 522, lines: ['this is BONEY. he wears the lab coat better than any of us', '*clack clack*', 'BONEY is only a model. the goggles were his idea'], poke: () => { CHEM.boney = performance.now() / 1000; CHEM.boneyDir = -1; } },
];

export function makeChem(): Room {
  const room: Room = {
    id: 'chem', title: 'THE CHEM LAB', sub: 'SCIENCE WING',
    w: W, h: H,
    floor: { x0: 14, y0: 472, x1: W - 14, y1: 628 },
    blockers: [
      ...CHL.bench.map((cx) => ({ x0: cx - 77, y0: 551, x1: cx + 77, y1: CHL.benchY + 2 })),
      { x0: CHL.lectern - 14, y0: 546, x1: CHL.lectern + 14, y1: 554 },
      { x0: CHL.boney - 14, y0: 534, x1: CHL.boney + 14, y1: 542 },
    ],
    doors: [{ trigger: { x0: CHL.door - 18, y0: 472, x1: CHL.door + 18, y1: 480 }, to: 'wing', arrive: { x: 770, y: 500 }, label: 'THE WING', area: { x0: CHL.door - 32, y0: CHL.doorTop - 20, x1: CHL.door + 32, y1: 472 } }],
    spots: CHEM_SPOTS, inUse: new Map(),
    onState(s: StateMsg) { if (s.k === 'chemlog') CHEM.log = s.v; },
    spawn: { x: CHL.door, y: 500 },
    dim: 0.02,
    fillTop: 'rgb(39,51,58)', fillLow: 'rgb(186,199,193)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack, drawFront,
    props: [bench(0), bench(1), lectern, boney, showerWater],
    talkers: TALK,
    extras: flood,
  };
  RM = room;
  return room;
}
