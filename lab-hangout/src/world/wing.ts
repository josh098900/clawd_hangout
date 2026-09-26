// THE SCIENCE WING: the corridor off the right side of the Lab. Bright and clean, the calm before the reactor: white
// panels with the Lab's teal band, lockers (one hangs open: a lab coat and a rubber duck), the REACTOR's blast door
// with its porthole glowing blue and a RADIATION display (UH OH after a meltdown), safety posters, the notice board,
// the EXPERIMENT OF THE MONTH case, the CHEM LAB's glass door (glowing green from inside), the eyewash station, a water
// cooler that glugs, and two doors taped OPENING SOON (the Tesla lab, the wind tunnel). A little floor robot does laps.
// Everything that looks usable says something (talkers).

import { K, LK, NK, RX, type RGB } from '../engine/palette';
import { mk, r, line, disc, txt, tw, lit, alpha, G, Gd, M, shade, bake } from '../engine/pixel';
import { h1 } from '../engine/math';
import { dayness } from './plaza';
import { meltAgo } from './grid';
import type { Prop, Room, Spot, Talker } from './room';

const W = 1200, H = 640, FL = 460, CEIL = 334;
/** The doors along the corridor (centre x). */
export const WING = { reactor: 345, chem: 770, tesla: 990, wind: 1110 };
const TUBES = [70, 310, 550, 790, 1030];
const LOCK_X = 60, LOCK_W = 28, LOCK_N = 6, LOCK_OPEN = 3, LOCK_Y = 366;
/** Everything on the wall sits between the ceiling (CEIL) and the floor (FL): the camera shows about 150 px above your feet. */
const DOOR_TOP = 356, SIGN_Y = 338;

/** The radiation trefoil: a hub and three blades (black on yellow, or whatever you pass). */
export function trefoil(cx: number, cy: number, rad: number, c: RGB): void {
  for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
    const d = Math.hypot(x, y), an = Math.atan2(y, x) + Math.PI / 2, blade = ((an % (Math.PI * 2 / 3)) + Math.PI * 2) % (Math.PI * 2 / 3) < Math.PI / 3;
    if (d <= rad * 0.28 || (d >= rad * 0.42 && d <= rad && blade)) r(cx + x, cy + y, 1, 1, c);
  }
}
/** Yellow and black stripes filling a rect (going down to the right). */
export function hazard(x: number, y: number, w: number, h: number, step = 6): void {
  r(x, y, w, h, RX.HAZ_DK);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (((xx + yy) % (step * 2)) < step) r(x + xx, y + yy, 1, 1, RX.HAZ);
}

function build(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    // ---- the ceiling: tiles, a cable tray, air vents, the tube fittings (lit live) ----
    r(0, 0, W, CEIL, RX.CEIL);
    for (let x = 0; x < W; x += 60) r(x, 0, 1, CEIL - 20, RX.CEIL2);
    for (let y = 40; y < CEIL - 20; y += 60) r(0, y, W, 1, RX.CEIL2);
    r(0, CEIL - 22, W, 4, RX.STEEL_DK2); for (let x = 8; x < W; x += 14) r(x, CEIL - 22, 2, 4, RX.STEEL_DK); // the cable tray
    for (let x = 30; x < W; x += 110) line(x, CEIL - 18, x + 40, CEIL - 20, [30, 36, 40]); // cables sagging out of it
    for (const vx of [200, 680, 930]) { r(vx, CEIL - 14, 44, 10, RX.VENT); for (let k = 0; k < 6; k++) r(vx + 3 + k * 7, CEIL - 12, 4, 6, RX.CEIL2); }
    for (const tx of TUBES) { r(tx - 2, CEIL - 4, 124, 6, RX.STEEL_DK2); r(tx, CEIL + 2, 120, 3, RX.TUBE_OFF); }
    r(0, CEIL, W, 4, RX.STEEL_DK2);
    // ---- the wall: white panels with seams and screws, the teal band, the skirting ----
    for (let x = 0; x < W; x += 80) {
      r(x, CEIL + 4, 80, FL - CEIL - 4, (x / 80) % 2 ? RX.WALL2 : RX.WALL); r(x, CEIL + 4, 80, 1, RX.WALL_HI); r(x + 79, CEIL + 4, 1, FL - CEIL - 4, RX.SEAM);
      for (const [sx, sy] of [[4, 8], [74, 8], [4, FL - CEIL - 14], [74, FL - CEIL - 14]]) r(x + sx, CEIL + sy, 2, 2, RX.SCREW);
    }
    r(0, 426, W, 10, RX.BAND); r(0, 426, W, 2, RX.BAND_HI); r(0, 435, W, 1, shade(RX.BAND, 0.7));
    r(0, 452, W, 8, RX.SKIRT); r(0, 452, W, 1, M(RX.SKIRT, K.WHITE, 0.2));
    // ---- the floor: pale tiles, a yellow walking line, hazard stripes before the reactor's door ----
    for (let y = FL, j = 0; y < H; y += 16, j++) for (let x = (j % 2) * 20; x < W; x += 40) { r(x, y, 40, 16, (Math.floor(x / 40) + j) % 2 ? RX.TILE : RX.TILE2); r(x, y, 40, 1, RX.GROUT); r(x, y, 1, 16, RX.GROUT); }
    r(0, FL, W, 3, shade(RX.TILE, 0.8));
    for (let x = 0; x < W; x += 1) if (x % 24 < 18) r(x, 486, 1, 3, RX.LINE);
    hazard(WING.reactor - 44, FL + 3, 88, 8, 4);
    for (let k = 0; k < 3; k++) r(WING.reactor - 6 + k * 2, 508 + k * 3, 12 - k * 4, 2, RX.LINE_DK); // a painted arrow to the door
    txt('REACTOR', WING.reactor - tw('REACTOR') / 2, 498, RX.LINE_DK);
    // ---- the way back to the Lab: an open doorway at the left end, the Lab's tiles through it ----
    r(0, DOOR_TOP - 8, 30, FL - DOOR_TOP + 8, LK.WALL); for (let y = DOOR_TOP - 2; y < FL; y += 10) r(0, y, 30, 1, LK.GROUT); r(0, 420, 30, 16, LK.WAIN); r(0, 420, 30, 2, LK.WAIN_HI);
    r(30, DOOR_TOP - 14, 8, FL - DOOR_TOP + 14, RX.STEEL_DK); r(30, DOOR_TOP - 14, 2, FL - DOOR_TOP + 14, RX.STEEL_HI); r(0, DOOR_TOP - 14, 38, 6, RX.STEEL_DK);
    r(3, DOOR_TOP - 4, 26, 10, [30, 40, 46]); txt('LAB', 6, DOOR_TOP - 1, [255, 214, 150]); r(21, DOOR_TOP + 1, 2, 2, [255, 214, 150]); r(24, DOOR_TOP, 1, 4, [255, 214, 150]); // a little arrow sign
    // ---- the lockers: six, one hanging open with a lab coat and a rubber duck inside; a cactus in a hard hat on top ----
    for (let i = 0; i < LOCK_N; i++) {
      const x = LOCK_X + i * (LOCK_W + 2), y0 = LOCK_Y, h = FL - 2 - y0;
      if (i === LOCK_OPEN) { // open: the dark inside, a shelf with the duck on it, a coat on a hook
        r(x, y0, LOCK_W, h, [28, 34, 40]); r(x, y0 + 16, LOCK_W, 2, RX.LOCKER_DK); r(x + 16, y0 + 10, 6, 4, NK.DUCK); r(x + 20, y0 + 7, 4, 4, NK.DUCK); r(x + 24, y0 + 8, 2, 1, NK.BEAK); r(x + 22, y0 + 8, 1, 1, K.EYE);
        for (let y = y0 + 24; y < y0 + 74; y++) { const w = 6 + Math.floor((y - y0 - 24) / 8); r(x + 11 - w, y, w * 2, 1, y > y0 + 70 ? K.COAT_SH : K.COAT); } r(x + 10, y0 + 20, 2, 5, RX.STEEL_DK); r(x + 10, y0 + 28, 1, 36, K.COAT_LN);
        for (let k = 0; k < 5; k++) r(x + LOCK_W + k * 2, y0 + 2 + k, 2, h - 4 - k * 2, k % 2 ? RX.LOCKER_HI : RX.LOCKER); // the door, swung open towards you
        continue;
      }
      r(x, y0, LOCK_W, h, RX.LOCKER); r(x, y0, LOCK_W, 1, RX.LOCKER_HI); r(x, y0, 1, h, RX.LOCKER_HI); r(x + LOCK_W - 1, y0, 1, h, RX.LOCKER_DK);
      for (let k = 0; k < 4; k++) r(x + 6, y0 + 6 + k * 4, LOCK_W - 12, 2, RX.LOCKER_DK); // vent slits
      r(x + 9, y0 + 26, 10, 7, [220, 226, 230]); txt(String(i + 1), x + 12, y0 + 27, [60, 70, 80]); // number plate
      r(x + LOCK_W - 7, y0 + 44, 3, 10, RX.STEEL_HI); r(x + LOCK_W - 7, y0 + 44, 1, 10, K.WHITE);
      if (i === 1) { r(x + 5, y0 + 60, 14, 8, [255, 140, 170]); txt('HI', x + 8, y0 + 62, [120, 20, 60]); } // a sticker
      if (i === 5) r(x + 5, y0 + 58, 8, 10, [250, 240, 190]); // a note taped on
    }
    r(LOCK_X - 2, LOCK_Y - 2, LOCK_N * (LOCK_W + 2) + 2, 3, RX.LOCKER_DK);
    { const px = LOCK_X + 8; r(px, LOCK_Y - 12, 10, 10, [184, 102, 74]); r(px, LOCK_Y - 12, 10, 2, [214, 130, 96]); r(px + 3, LOCK_Y - 24, 4, 12, [60, 150, 80]); r(px + 1, LOCK_Y - 20, 2, 5, [60, 150, 80]); r(px + 7, LOCK_Y - 22, 2, 6, [60, 150, 80]); r(px + 2, LOCK_Y - 27, 6, 3, RX.CRANE); r(px + 1, LOCK_Y - 25, 8, 1, RX.CRANE_DK); } // the cactus, hard hat on
    // ---- the REACTOR's blast door: hazard frame, ribbed steel, a porthole (the pool's glow shows through), the sign ----
    { const cx = WING.reactor;
      hazard(cx - 56, DOOR_TOP - 8, 112, FL - DOOR_TOP + 8, 7); r(cx - 48, DOOR_TOP, 96, FL - DOOR_TOP, RX.STEEL_DK2);
      r(cx - 46, DOOR_TOP + 2, 92, FL - DOOR_TOP - 2, RX.STEEL); r(cx - 46, DOOR_TOP + 2, 92, 2, RX.STEEL_HI); r(cx - 46, DOOR_TOP + 2, 2, FL - DOOR_TOP - 2, RX.STEEL_HI); r(cx + 44, DOOR_TOP + 2, 2, FL - DOOR_TOP - 2, RX.STEEL_DK);
      for (let y = DOOR_TOP + 36; y < FL - 6; y += 14) { r(cx - 42, y, 84, 2, RX.STEEL_DK); r(cx - 42, y + 2, 84, 1, RX.STEEL_HI); }
      for (const [dx, dy] of [[-40, DOOR_TOP + 6], [38, DOOR_TOP + 6], [-40, FL - 12], [38, FL - 12]]) { r(cx + dx, dy, 3, 3, RX.STEEL_DK2); r(cx + dx, dy, 1, 1, RX.STEEL_HI); }
      r(cx - 1, DOOR_TOP + 2, 2, FL - DOOR_TOP - 2, RX.STEEL_DK2); // the seam where it parts
      disc(cx, PORT_Y, 13, RX.STEEL_DK2); disc(cx, PORT_Y, 11, RX.STEEL_HI); disc(cx, PORT_Y, 9, RX.POOL0);
      r(cx - 56, SIGN_Y, 112, 16, RX.HAZ_DK); r(cx - 54, SIGN_Y + 2, 108, 12, RX.HAZ); trefoil(cx - 40, SIGN_Y + 8, 5, RX.HAZ_DK); txt('REACTOR', cx - 29, SIGN_Y + 3, RX.HAZ_DK, 2);
      r(cx + 62, 396, 12, 18, RX.CONSOLE_DK); r(cx + 63, 397, 10, 8, RX.SCREEN); r(cx + 65, 408, 6, 2, RX.STEEL); // the badge reader
    }
    // ---- the RADIATION display ----
    r(420, 346, 72, 22, RX.CONSOLE_DK); r(422, 348, 68, 18, RX.SCREEN); txt('RADIATION', 426, 350, [80, 110, 110]);
    // ---- posters: GOGGLES ON!, a critter in a hard hat giving a thumbs up, NO RUNNING NEAR THE CORE ----
    { const x = 436, y = 374; r(x, y, 40, 46, K.PAPER); r(x, y, 40, 8, [40, 120, 200]); txt('GOGGLES', x + 6, y + 2, K.WHITE); r(x + 7, y + 16, 26, 9, [40, 40, 50]); r(x + 9, y + 18, 9, 5, [140, 220, 255]); r(x + 22, y + 18, 9, 5, [140, 220, 255]); r(x + 19, y + 19, 2, 2, [40, 40, 50]); txt('ON!', x + 14, y + 33, [200, 40, 60]); r(x + 1, y + 1, 3, 1, [240, 240, 240]); }
    { const x = 486, y = 374; r(x, y, 38, 46, [255, 246, 214]); r(x + 11, y + 14, 16, 16, [34, 197, 160]); r(x + 9, y + 10, 20, 6, RX.CRANE); r(x + 8, y + 15, 22, 1, RX.CRANE_DK); r(x + 14, y + 19, 2, 3, K.EYE); r(x + 22, y + 19, 2, 3, K.EYE); r(x + 16, y + 25, 6, 1, K.EYE); r(x + 27, y + 17, 3, 6, [34, 197, 160]); r(x + 28, y + 14, 2, 3, [34, 197, 160]); txt('SAFE!', x + 9, y + 35, [40, 120, 90]); }
    { const x = 536, y = 380; r(x, y, 26, 34, K.PAPER); r(x, y, 26, 5, [200, 40, 60]); txt('NO', x + 8, y + 8, [200, 40, 60]); r(x + 8, y + 16, 3, 8, [60, 60, 70]); r(x + 13, y + 16, 3, 8, [60, 60, 70]); line(x + 3, y + 30, x + 23, y + 14, [200, 40, 60], 2); } // no running
    // ---- the notice board: a rota, a lost glove, a grumpy note, a doodle of the pool ----
    { const x = 574, y = 364; r(x - 3, y - 3, 76, 60, [120, 84, 50]); r(x, y, 70, 54, [196, 150, 100]); for (let k = 0; k < 30; k++) r(x + Math.floor(h1(k * 3.1) * 68), y + Math.floor(h1(k * 5.7) * 52), 1, 1, [170, 126, 84]);
      r(x + 3, y + 3, 26, 22, K.PAPER); for (let j = 0; j < 4; j++) { r(x + 5, y + 7 + j * 4, 22, 1, [180, 180, 190]); r(x + 5 + (j * 7) % 18, y + 5 + j * 4, 4, 2, [40, 120, 200]); } txt('ROTA', x + 8, y + 4, [40, 40, 60]);
      r(x + 33, y + 4, 32, 14, [255, 240, 150]); txt('LOST', x + 35, y + 5, [60, 50, 30]); txt('GLOVE', x + 35, y + 11, [60, 50, 30]);
      r(x + 32, y + 22, 34, 26, [200, 230, 255]); txt('WHO', x + 35, y + 24, [200, 40, 60]); txt('MIXES', x + 35, y + 30, [200, 40, 60]); txt('BLUES', x + 35, y + 36, [40, 90, 200]); txt('??', x + 35, y + 42, [200, 40, 60]);
      r(x + 4, y + 30, 24, 20, K.PAPER); r(x + 7, y + 36, 18, 10, [90, 170, 230]); r(x + 13, y + 40, 6, 6, [40, 60, 90]); r(x + 7, y + 33, 18, 2, RX.CRANE);
      for (const [px, py] of [[x + 15, y + 3], [x + 48, y + 4], [x + 49, y + 22], [x + 15, y + 30]]) r(px, py, 2, 2, [220, 40, 60]); }
    // ---- EXPERIMENT OF THE MONTH: a glass case with the golden beaker ----
    { const x = 662, y = 370; r(x - 2, y - 2, 56, 74, [110, 74, 44]); r(x, y, 52, 70, [60, 80, 90]); r(x + 1, y + 1, 50, 68, [80, 110, 120]);
      r(x + 2, y + 38, 48, 3, [150, 110, 70]); r(x + 20, y + 20, 12, 14, [255, 214, 90]); r(x + 22, y + 16, 8, 4, [255, 214, 90]); r(x + 21, y + 15, 10, 1, [255, 236, 150]); r(x + 22, y + 22, 3, 10, [255, 240, 180]); r(x + 18, y + 34, 16, 4, [120, 90, 50]);
      r(x + 8, y + 50, 14, 10, [230, 230, 240]); r(x + 12, y + 46, 6, 4, [230, 230, 240]); r(x + 30, y + 52, 12, 8, [60, 150, 80]); // a flask and a medal ribbon on the shelf below
      alpha(0.35, () => { r(x + 4, y + 4, 3, 60, K.WHITE); r(x + 10, y + 4, 1, 34, K.WHITE); });
      r(x - 2, y + 72, 56, 10, [110, 74, 44]); r(x + 2, y + 74, 48, 6, [196, 160, 90]); txt('EXPT OF', x + 5, y + 73, [60, 40, 20]); }
    // ---- the CHEM LAB's door: frosted glass in a steel frame (the lab's green glows through it, live), its sign, a GOGGLES sticker ----
    { const cx = WING.chem;
      r(cx - 34, DOOR_TOP - 2, 68, FL - DOOR_TOP + 2, RX.STEEL_DK); r(cx - 30, DOOR_TOP + 2, 60, FL - DOOR_TOP - 2, [196, 230, 220]);
      for (let k = 0; k < 10; k++) line(cx - 28 + k * 6, DOOR_TOP + 4, cx - 28 + k * 6 + 10, DOOR_TOP + 24, [220, 240, 246]); r(cx - 1, DOOR_TOP + 2, 2, FL - DOOR_TOP - 2, RX.STEEL_DK); r(cx + 6, 404, 3, 14, RX.STEEL_HI);
      r(cx - 40, SIGN_Y, 80, 16, [30, 60, 70]); r(cx - 38, SIGN_Y + 2, 76, 12, [40, 120, 110]); txt('CHEM LAB', cx - tw('CHEM LAB') / 2 + 6, SIGN_Y + 5, K.WHITE);
      r(cx - 32, SIGN_Y + 5, 6, 7, [200, 240, 255]); r(cx - 31, SIGN_Y + 3, 4, 2, [200, 240, 255]); r(cx - 32, SIGN_Y + 9, 6, 3, [124, 242, 156]); // a flask icon
      for (let j = 0; j < 9; j++) r(cx - 22 + j, 436 - j, 17 - j * 2 > 0 ? 17 - j * 2 : 1, 1, RX.HAZ); txt('!', cx - 15, 430, RX.HAZ_DK); r(cx - 22, 437, 17, 1, RX.HAZ_DK); // a warning sticker: EXPERIMENTS
      r(cx - 10, FL - 8, 20, 8, RX.STEEL); r(cx - 10, FL - 8, 20, 1, RX.STEEL_HI); // the kick plate
    }
    // ---- the eyewash station, the fire extinguisher ----
    { const x = 850; r(x - 16, 364, 32, 16, [40, 150, 90]); r(x - 5, 367, 10, 6, K.WHITE); disc(x, 370, 2, [40, 150, 90]); txt('EYES', x - 7, 374, K.WHITE);
      r(x - 14, 404, 28, 6, RX.STEEL); r(x - 12, 410, 24, 3, RX.STEEL_DK); r(x - 10, 400, 3, 4, RX.STEEL_HI); r(x + 7, 400, 3, 4, RX.STEEL_HI); r(x + 12, 410, 2, 14, RX.STEEL_DK); r(x + 10, 424, 6, 3, [40, 150, 90]); }
    { const x = 936; r(x - 5, 404, 10, 30, [200, 40, 50]); r(x - 5, 404, 3, 30, [236, 90, 90]); r(x - 3, 398, 6, 6, [40, 40, 50]); r(x + 3, 400, 5, 2, [40, 40, 50]); r(x - 6, 414, 12, 3, [220, 220, 230]); r(x - 12, 382, 24, 10, [200, 40, 50]); txt('FIRE', x - 7, 384, K.WHITE); }
    // ---- the water cooler (its bottle bubbles on the live layer) ----
    { const x = 900; r(x - 10, 420, 20, 40, [220, 226, 230]); r(x - 10, 420, 20, 2, K.WHITE); r(x + 8, 420, 2, 40, [190, 196, 200]); r(x - 3, 430, 6, 3, [40, 120, 200]); r(x - 6, 440, 12, 8, [120, 130, 140]); r(x - 14, 424, 4, 16, [236, 236, 240]); for (let k = 0; k < 3; k++) r(x - 14, 424 + k * 5, 4, 1, [200, 200, 210]);
      r(x - 8, 396, 16, 24, [120, 190, 240]); r(x - 6, 392, 12, 4, [120, 190, 240]); r(x - 7, 398, 3, 18, [180, 226, 255]); r(x - 3, 388, 6, 4, [60, 120, 200]); }
    // ---- the doors to come: the TESLA LAB and the WIND TUNNEL, taped OPENING SOON ----
    for (const [cx, name, icon] of [[WING.tesla, 'TESLA LAB', 0], [WING.wind, 'WIND TUNNEL', 1]] as [number, string, number][]) {
      r(cx - 32, DOOR_TOP - 4, 64, FL - DOOR_TOP + 4, RX.STEEL_DK2); r(cx - 28, DOOR_TOP, 56, FL - DOOR_TOP, [70, 78, 90]); r(cx - 28, DOOR_TOP, 56, 2, [100, 108, 120]); r(cx + 18, 406, 4, 12, RX.STEEL_HI);
      r(cx - 46, SIGN_Y, 92, 16, [30, 34, 44]); txt(name, cx - tw(name) / 2 + 5, SIGN_Y + 5, [200, 206, 220]);
      if (icon === 0) { for (const [dx, dy] of [[0, 0], [-2, 3], [1, 3], [-1, 6]]) r(cx - tw(name) / 2 - 8 + dx, SIGN_Y + 2 + dy, 3, 3, RX.LINE); }
      else { disc(cx - tw(name) / 2 - 6, SIGN_Y + 8, 4, [160, 170, 190]); for (let k = 0; k < 3; k++) { const an = k * 2.1; line(cx - tw(name) / 2 - 6, SIGN_Y + 8, Math.round(cx - tw(name) / 2 - 6 + Math.cos(an) * 5), Math.round(SIGN_Y + 8 + Math.sin(an) * 5), [230, 236, 244]); } }
      for (let k = 0; k < 64; k++) { r(cx - 30 + k, DOOR_TOP + 4 + Math.round(k * 1.4), 4, 4, (k % 8) < 4 ? RX.HAZ : RX.HAZ_DK); r(cx + 30 - k, DOOR_TOP + 4 + Math.round(k * 1.4), 4, 4, (k % 8) < 4 ? RX.HAZ : RX.HAZ_DK); } // tape, crossed
      r(cx - 28, 402, 56, 14, K.PAPER); txt('OPENING', cx - 14, 404, [200, 40, 60]); txt('SOON', cx - 7, 410, [60, 60, 70]);
    }
    // ---- the end of the corridor: a tall window out over the city (the view is live) ----
    r(1150, WIN_Y - 4, 44, 96, RX.STEEL_DK); r(1154, WIN_Y, 36, 88, [20, 30, 60]);
  });
}
const PORT_Y = 382, WIN_Y = 348;

/** The live layer. */
function drawBack(a: number): void {
  const T = Date.now(), melt = meltAgo(T) < 60;
  // the tubes (one flickers), and their light on the wall and floor
  TUBES.forEach((tx, i) => {
    const f = i === 2 && ((a * 3.1) % 1 < 0.07 || (a * 0.23) % 1 < 0.05) ? 0.25 : 1;
    lit(() => r(tx, CEIL + 2, 120, 3, M(RX.TUBE_OFF, melt ? [255, 120, 120] : RX.TUBE, f)));
    G(tx - 10, CEIL + 4, 140, 60, melt ? [255, 90, 90] : [220, 240, 255], 0.07 * f); G(tx + 10, FL, 100, 60, [220, 240, 255], 0.04 * f);
  });
  if (melt && (a % 0.8) < 0.4) G(0, CEIL, W, FL - CEIL, [255, 40, 40], 0.08); // the alarm, washing over the corridor
  // the porthole: the pool's blue (green after a meltdown), shimmering
  { const c: RGB = melt ? RX.MELT2 : RX.POOL2; lit(() => { disc(WING.reactor, PORT_Y, 9, shade(c, 0.45 + 0.1 * Math.sin(a * 2))); r(WING.reactor - 5, PORT_Y - 6, 3, 2, M(c, K.WHITE, 0.5)); }); Gd(WING.reactor, PORT_Y, 14, c, 0.35 + 0.1 * Math.sin(a * 3)); }
  // the badge reader's LED, and the RADIATION display
  lit(() => r(WING.reactor + 66, 400, 4, 2, (a % 1.6) < 0.2 ? RX.LED_G : shade(RX.LED_G, 0.35)));
  lit(() => { const bad = melt, s = bad ? ((a % 0.5) < 0.3 ? 'UH OH!' : '') : 'NORMAL'; txt(s, 456 - tw(s) / 2, 358, bad ? RX.LED_R : RX.LED_G); });
  G(420, 346, 72, 22, melt ? RX.LED_R : RX.LED_G, melt ? 0.25 : 0.08);
  // the CHEM LAB: its green through the frosted glass (a shadow drifting past it now and then), and the flask on its sign bubbling
  { const cx = WING.chem; G(cx - 30, DOOR_TOP + 2, 60, FL - DOOR_TOP - 2, [124, 242, 180], 0.1 + 0.03 * Math.sin(a * 1.3)); const sh = (a * 0.07) % 1; if (sh < 0.3) alpha(0.12, () => r(Math.round(cx - 30 + sh / 0.3 * 44), DOOR_TOP + 30, 16, 50, [60, 90, 80]));
    lit(() => { r(cx - 32, SIGN_Y + 9, 6, 3, M([124, 242, 156], K.WHITE, 0.15 + 0.15 * Math.sin(a * 3))); const q = (a * 0.8) % 1; if (q < 0.7) r(cx - 30 + Math.round(Math.sin(a * 4)), Math.round(SIGN_Y + 9 - q * 7), 1, 1, K.WHITE); }); Gd(cx - 29, SIGN_Y + 8, 5, [124, 242, 156], 0.3); }
  // the water cooler: a bubble glugs up every so often
  { const u = (a * 0.11) % 1; if (u < 0.12) { const k = u / 0.12; lit(() => { r(898, Math.round(416 - k * 20), 3, 3, [210, 240, 255]); r(903, Math.round(418 - k * 16), 2, 2, [210, 240, 255]); }); } }
  // the trophy: a glint that runs over the beaker
  if ((a * 0.4) % 1 < 0.12) { const k = ((a * 0.4) % 1) / 0.12; lit(() => r(682 + Math.round(k * 12), 390, 1, 12, [255, 250, 220])); }
  // the window at the end: the sky over the city (the Square's day and night)
  { const d = dayness(), top = M([6, 10, 28], [94, 155, 214], d), bot = M([42, 42, 99], [240, 221, 191], d);
    for (let y = WIN_Y; y < WIN_Y + 88; y += 2) r(1154, y, 36, 2, M(top, bot, (y - WIN_Y) / 88));
    for (let k = 0; k < 6; k++) { const bx = 1154 + k * 6, bh = 12 + Math.floor(h1(k * 3.3) * 26); r(bx, WIN_Y + 88 - bh, 6, bh, M([17, 22, 58], [110, 122, 160], d)); if (d < 0.5) for (let wy = WIN_Y + 88 - bh + 3; wy < WIN_Y + 86; wy += 5) if (h1(bx + wy) > 0.55) lit(() => r(bx + 2, wy, 1, 2, K.WIN_Y)); }
    r(1171, WIN_Y, 2, 88, RX.STEEL_DK); r(1154, WIN_Y + 40, 36, 2, RX.STEEL_DK); }
}

/** The little floor robot doing laps (it stops and turns at each end, with a bump). */
const ROBOT_Y = 596;
export function robotAt(T = Date.now() / 1000): { x: number; dir: 1 | -1; bump: number } {
  const span = 900, speed = 34, lap = (span / speed) * 2 + 4, u = T % lap, half = span / speed + 2;
  if (u < span / speed) return { x: 150 + u * speed, dir: 1, bump: 0 };
  if (u < half) return { x: 150 + span, dir: 1, bump: u - span / speed };
  if (u < half + span / speed) return { x: 150 + span - (u - half) * speed, dir: -1, bump: 0 };
  return { x: 150, dir: -1, bump: u - half - span / speed };
}
const robot: Prop = {
  y: ROBOT_Y,
  draw(a: number) {
    const { x: rx, dir, bump } = robotAt(), x = Math.round(rx), y = ROBOT_Y, shake = bump > 0 && bump < 0.3 ? (Math.floor(bump * 30) % 2 ? 1 : -1) : 0;
    alpha(0.3, () => r(x - 11, y - 1, 22, 2, [10, 10, 24]));
    r(x - 10 + shake, y - 7, 20, 6, [70, 80, 92]); r(x - 9 + shake, y - 9, 18, 2, [120, 130, 142]); r(x - 9 + shake, y - 9, 18, 1, [170, 180, 190]);
    r(x + (dir > 0 ? 8 : -10) + shake, y - 6, 2, 4, [40, 44, 50]); // the bumper
    lit(() => r(x - 1 + shake, y - 9, 2, 1, (a % 1) < 0.5 ? [90, 209, 255] : [40, 90, 130]));
    for (const wx of [-6, 5]) r(x + wx + shake, y - 2, 3, 2, [30, 32, 38]);
    if (bump > 0 && bump < 0.6) lit(() => { r(x + (dir > 0 ? 12 : -14), y - 12, 1, 3, K.WHITE); r(x + (dir > 0 ? 14 : -16), y - 10, 2, 1, K.WHITE); }); // bonk
    if (!bump) for (let k = 1; k < 4; k++) if ((a * 3 + k) % 1 < 0.5) r(x - dir * (10 + k * 4), y - 2, 1, 1, [220, 226, 232]); // a trail of just-cleaned shine
  },
};
/** The bench in front of the lockers. */
const bench: Prop = { y: 500, draw() { r(LOCK_X + 10, 488, 150, 5, [150, 110, 70]); r(LOCK_X + 10, 488, 150, 1, [190, 150, 100]); r(LOCK_X + 10, 493, 150, 2, [110, 80, 50]); for (const lx of [LOCK_X + 16, LOCK_X + 150]) r(lx, 495, 4, 6, RX.STEEL_DK); } };

export const WING_SPOTS: Spot[] = [-40, 40].map((dx): Spot => ({ kind: 'sit', x: LOCK_X + 85 + dx, y: 492, sx: LOCK_X + 85 + dx, sy: 506, lift: 10, label: 'SIT', area: { x0: LOCK_X + 55 + dx, y0: 470, x1: LOCK_X + 115 + dx, y1: 492 } })); // 0, 1

const T_ = (id: string, name: string, verb: string, x: number, y: number, lines: string[]): Talker => ({ id: 'wing-' + id, name, verb, x, y, sx: x, sy: 480, lines });
const TALKERS: Talker[] = [
  T_('duck', 'LOCKER', 'LOOK', LOCK_X + LOCK_OPEN * (LOCK_W + 2) + 14, LOCK_Y, ['someone\'s lab coat. and a rubber duck, of course', 'the duck\'s name tag says COOLANT', 'a sock in there too. just the one']),
  T_('cactus', 'CACTUS', 'LOOK', LOCK_X + 13, LOCK_Y - 28, ['a cactus in a hard hat. safety first', 'someone waters it with a pipette']),
  T_('badge', 'BADGE READER', 'TAP', WING.reactor + 68, 394, ['*beep* ACCESS GRANTED. (it grants everyone. it is very friendly)', '*beep* hello, engineer!']),
  T_('rad', 'RADIATION', 'READ', 456, 344, ['RADIATION: NORMAL. (it\'s mostly the bananas)', 'if it says UH OH, the pool has gone green again']),
  T_('notice', 'NOTICE BOARD', 'READ', 609, 360, ['ROTA: whoever broke the kettle is on mop duty', 'LOST: ONE GLOVE (LEFT). IF FOUND, IT\'S MINE. - ROD', 'WHO KEEPS MIXING THE BLUE ONES?? - FIZZ', 'REMINDER: SUITS ON PAST THE GLASS']),
  T_('trophy', 'TROPHY CASE', 'LOOK', 688, 366, ['EXPERIMENT OF THE MONTH: DOES COFFEE WORK ON ROBOTS? (it does)', 'a tiny golden beaker. somebody polishes it every day']),
  T_('eyes', 'EYEWASH', 'USE', 850, 362, ['*splash* ...refreshing!', 'rinse for 15 minutes. or until bored']),
  T_('cooler', 'WATER COOLER', 'SIP', 900, 388, ['*glug glug* ahh', 'reactor-grade refreshment']),
  T_('tesla', 'TESLA LAB', 'LOOK', WING.tesla, DOOR_TOP, ['OPENING SOON: THE TESLA LAB. it crackles in there', 'the door handle is... slightly buzzy']),
  T_('wind', 'WIND TUNNEL', 'LOOK', WING.wind, DOOR_TOP, ['OPENING SOON: THE WIND TUNNEL. hold on to your hat', 'something is whooshing behind this door']),
];

export function makeWing(): Room {
  const room: Room = {
    id: 'wing', title: 'THE SCIENCE WING', sub: 'LABS',
    w: W, h: H,
    floor: { x0: 14, y0: 470, x1: W - 14, y1: 612 },
    blockers: [{ x0: LOCK_X + 10, y0: 490, x1: LOCK_X + 160, y1: 498 }],
    doors: [
      { trigger: { x0: 14, y0: 470, x1: 22, y1: 612 }, edge: true, to: 'lab', arrive: { x: 910, y: 520 }, label: 'THE LAB', area: { x0: 0, y0: DOOR_TOP - 14, x1: 38, y1: 612 } },
      { trigger: { x0: WING.reactor - 18, y0: 470, x1: WING.reactor + 18, y1: 478 }, to: 'reactor', arrive: { x: 96, y: 540 }, label: 'REACTOR', area: { x0: WING.reactor - 56, y0: SIGN_Y, x1: WING.reactor + 56, y1: 470 } },
      { trigger: { x0: WING.chem - 18, y0: 470, x1: WING.chem + 18, y1: 478 }, to: 'chem', arrive: { x: 70, y: 500 }, label: 'CHEM LAB', area: { x0: WING.chem - 34, y0: SIGN_Y, x1: WING.chem + 34, y1: 470 } },
    ],
    spots: WING_SPOTS, inUse: new Map(),
    spawn: { x: 60, y: 540 },
    dim: 0.02,
    fillTop: 'rgb(39,51,58)', fillLow: 'rgb(178,187,191)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [bench, robot],
    talkers: TALKERS,
  };
  return room;
}
