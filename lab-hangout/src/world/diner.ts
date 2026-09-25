// THE GREASY BYTE — the Diner, up the stairs from the Subway's DINER stop. A retro diner: red
// vinyl booths under the windows, a lunch counter with stools and a soda fountain, a jukebox,
// and behind the pass window the KITCHEN, where the co-op cooking game runs (game/diner.ts).
//
// Kitchen stations along the back wall, left to right, follow the food: PASS <- BUNS <- GRILL,
// FRYER, SHAKES, FRIDGE, FREEZER; the BIN stands out front. Everything cooking is drawn from
// the shift's shared state (DINER.g) and the clock. The camera shows ~210 px above your feet,
// so the ticket rail and the station tops sit between y 290 and the floor (FL).

import { CONFETTI, type RGB } from '../engine/palette';
import { PX, mk, r, line, txt, tw, lit, alpha, G, Gd, withCtx, M, shade } from '../engine/pixel';
import { h1 } from '../engine/math';
import { DINER_TRACKS } from '../audio/music';
import { SHIFT_S, ST, fryAt, score, shiftEnd, grillAt, live, openTickets, shakeAt, type DinerState, type Dish } from '../game/diner';
import type { StateMsg } from '../net/transport';
import type { Prop, Room, Spot } from './room';

const W = 1400, H = 700, FL = 470;
/** Where the kitchen starts (the pillar). */
export const KITCHEN_X = 770;
/** The live shift (room state 'diner'), the best shift so far, and the jukebox. */
export const DINER = { g: null as DinerState | null, /** COOKIE's practice kitchen while you're on the tour (drawn instead of g) */ tour: null as DinerState | null, best: null as { name: string; score: number } | null, juke: 0, jukeT0: 0 };

/** Station x centres (index = ST): fridge, freezer, grill, fryer, buns, shakes, bin, pass. */
const SX = [1296, 1362, 1020, 1130, 912, 1222, 1100, 822];
const BOOTHS = [170, 360, 550];
const COUNTER = { x0: 200, x1: 540, y: 604 };
const STOOLS = [230, 290, 350, 410, 470];
const JUKE_X = 640, CLOCK_X = 732;

// ---------- the set ----------
const RED: RGB = [196, 44, 58], RED_HI: RGB = [232, 84, 96], RED_DK: RGB = [140, 28, 40];
const CHROME: RGB = [206, 214, 224], CHROME_DK: RGB = [140, 150, 164], STEEL: RGB = [176, 184, 196], STEEL_DK: RGB = [120, 128, 142];
const CREAM: RGB = [244, 232, 204], TEAL: RGB = [70, 170, 170];

function build(this: Room): void {
  withCtx(this.bg.getContext('2d')!, () => {
    PX.dim = 0; PX.fl = 0; PX.emit = false;
    r(0, 0, W, 150, [34, 28, 38]); for (let x = 20; x < W; x += 120) r(x, 140, 70, 4, [70, 60, 70]);
    r(0, 146, W, 4, CHROME_DK);
    // ---- dining room wall: cream above, a red stripe, teal wainscot with a chrome rail ----
    r(0, 150, KITCHEN_X, FL - 150, CREAM); r(0, 262, KITCHEN_X, 8, RED); r(0, 270, KITCHEN_X, 2, RED_DK);
    r(0, 400, KITCHEN_X, FL - 400, TEAL); for (let x = 6; x < KITCHEN_X; x += 14) r(x, 404, 2, FL - 408, shade(TEAL, 0.85));
    r(0, 398, KITCHEN_X, 3, CHROME); r(0, 401, KITCHEN_X, 1, CHROME_DK);
    // the big windows over the booths: the street at night (the lights move in drawBack)
    for (const [x0, x1] of [[96, 424], [476, 604]]) {
      r(x0 - 5, 296, x1 - x0 + 10, 108, CHROME_DK); r(x0 - 3, 298, x1 - x0 + 6, 104, CHROME);
      for (let y = 300; y < 400; y += 4) r(x0, y, x1 - x0, 4, M([18, 20, 48], [52, 40, 80], (y - 300) / 100));
      for (let x = x0; x < x1; x += 22) { const hh = 20 + Math.floor(h1(x * 0.37) * 40); r(x, 372 - hh, Math.min(20, x1 - x), hh, [26, 26, 56]); for (let wy = 372 - hh + 4; wy < 368; wy += 7) { const lx = x + 4 + (wy % 2) * 8; if (h1(x + wy) > 0.6 && lx + 2 <= x1) r(lx, wy, 2, 3, [255, 206, 120]); } }
      r(x0, 372, x1 - x0, 28, [36, 36, 46]); r(x0, 384, x1 - x0, 1, [200, 180, 80]); // the street
      for (let x = x0 + 60; x < x1; x += 160) r(x, 340, 3, 32, [60, 60, 70]);
    }
    // the chalkboard: today's special (the best shift is written on it live)
    r(12, 296, 72, 70, [96, 64, 40]); r(16, 300, 64, 62, [34, 44, 40]);
    txt('TODAY', 48 - tw('TODAY') / 2, 304, [240, 240, 230]); txt('SPECIAL', 48 - tw('SPECIAL') / 2, 312, [240, 240, 230]);
    r(24, 320, 48, 1, [150, 160, 150]);
    // ---- the kitchen wall: white tiles, a steel hood over the grill and fryer ----
    r(KITCHEN_X, 150, W - KITCHEN_X, FL - 150, [236, 236, 232]);
    for (let y = 150; y < FL; y += 8) r(KITCHEN_X, y, W - KITCHEN_X, 1, [206, 206, 204]);
    for (let y = 150, j = 0; y < FL; y += 8, j++) for (let x = KITCHEN_X + (j % 2) * 8; x < W; x += 16) r(x, y, 1, 8, [206, 206, 204]);
    r(KITCHEN_X, 262, W - KITCHEN_X, 8, [50, 50, 60]); r(KITCHEN_X, 270, W - KITCHEN_X, 2, [30, 30, 36]);
    r(960, 300, 230, 40, STEEL); r(960, 300, 230, 3, CHROME); r(966, 340, 218, 6, STEEL_DK); for (let x = 980; x < 1180; x += 30) r(x, 310, 18, 2, STEEL_DK);
    // the pass: a window through to the dining room, heat lamps over a steel shelf
    r(780, 350, 88, 72, CHROME_DK); r(784, 354, 80, 64, CREAM); r(784, 380, 80, 6, RED); r(784, 404, 80, 14, TEAL); r(784, 354, 80, 4, [210, 196, 170]); r(780, 418, 88, 6, CHROME); r(780, 424, 88, 2, CHROME_DK);
    // the pillar between the dining room and the kitchen
    r(KITCHEN_X - 8, 150, 12, FL - 150, CHROME_DK); r(KITCHEN_X - 6, 150, 3, FL - 150, CHROME);
    // ---- floors: black and white checks in the dining room, red quarry tiles in the kitchen ----
    for (let y = FL, j = 0; y < H; y += 16, j++) for (let x = 0, i = 0; x < KITCHEN_X; x += 16, i++) r(x, y, 16, 16, (i + j) % 2 ? [40, 40, 50] : [232, 228, 220]);
    for (let y = FL, j = 0; y < H; y += 14, j++) for (let x = KITCHEN_X; x < W; x += 20) { r(x, y, 20, 14, [170, 70, 56]); r(x, y, 20, 1, [140, 54, 44]); r(x + (j % 2) * 10, y, 1, 14, [140, 54, 44]); }
    alpha(0.3, () => r(0, FL, W, 4, [20, 12, 10]));
    // the stairs down to the Subway (front left)
    r(14, 636, 70, 64, [60, 62, 70]); for (let k = 0; k < 6; k++) r(18, 640 + k * 10, 62, 4, [130, 132, 140]);
    r(12, 628, 4, 72, [40, 120, 90]); r(82, 628, 4, 72, [40, 120, 90]); r(12, 628, 74, 4, [40, 120, 90]);
    // ---- kitchen station bodies (what's cooking on them is drawn live) ----
    const cab = (x0: number, x1: number, top: number, c: RGB, lt: RGB) => { r(x0, top, x1 - x0, FL + 10 - top, c); r(x0, top, x1 - x0, 3, lt); r(x0 + 3, top + 10, x1 - x0 - 6, 1, shade(c, 0.8)); r(x0, FL + 6, x1 - x0, 4, shade(c, 0.6)); };
    cab(876, 948, 432, STEEL, CHROME); // buns
    for (let k = 0; k < 3; k++) { r(888 + k * 16, 424, 12, 6, [224, 160, 80]); r(889 + k * 16, 423, 10, 1, [246, 196, 120]); } r(882, 430, 60, 2, [160, 110, 70]);
    cab(970, 1070, 432, [70, 70, 80], [110, 110, 120]); r(972, 428, 96, 4, [40, 40, 44]); // the grill: a black flat-top
    for (const kx of [985, 1025]) r(kx, 446, 30, 14, [50, 50, 58]);
    cab(1086, 1174, 432, STEEL, CHROME); r(1092, 428, 36, 6, [200, 160, 60]); r(1132, 428, 36, 6, [200, 160, 60]); // the fryer: two vats of oil
    cab(1190, 1254, 440, [240, 180, 200], [255, 220, 230]); // the shake machine counter
    // fridge + freezer: tall steel doors with handles
    r(1270, 340, 54, FL + 10 - 340, STEEL); r(1270, 340, 54, 3, CHROME); r(1316, 380, 3, 40, CHROME_DK); r(1274, 346, 46, 14, [220, 230, 240]); txt('FRIDGE', 1297 - tw('FRIDGE') / 2, 350, [60, 70, 90]);
    r(1336, 360, 54, FL + 10 - 360, [150, 180, 214]); r(1336, 360, 54, 3, [200, 220, 240]); r(1382, 396, 3, 40, [110, 140, 170]); r(1340, 366, 46, 14, [220, 234, 250]); txt('FREEZE', 1363 - tw('FREEZE') / 2, 370, [50, 70, 110]);
    // the time clock by the kitchen door
    r(CLOCK_X - 14, 372, 28, 40, [110, 90, 70]); r(CLOCK_X - 11, 376, 22, 14, [240, 236, 220]); r(CLOCK_X - 6, 396, 12, 10, [60, 50, 40]); r(CLOCK_X - 4, 405, 8, 2, [200, 190, 170]);
  });
}

// ---------- live bits ----------
/** Draw a dish as a tiny icon (tickets). */
function dishIcon(d: Dish, x: number, y: number, dim: boolean): void {
  const m = (c: RGB): RGB => (dim ? M(c, [200, 200, 190], 0.7) : c);
  if (d === 'B') { r(x, y + 3, 7, 2, m([224, 160, 80])); r(x, y + 2, 7, 1, m([120, 70, 44])); r(x + 1, y, 5, 2, m([224, 160, 80])); }
  else if (d === 'F') { r(x + 1, y + 2, 5, 4, m([220, 50, 50])); for (let k = 0; k < 3; k++) r(x + 1 + k * 2, y, 1, 3, m([255, 210, 80])); }
  else { r(x + 1, y + 1, 5, 5, m([250, 170, 200])); r(x + 1, y, 5, 1, m([255, 250, 250])); r(x + 4, y - 2, 1, 3, m([255, 90, 120])); }
}
/** One order ticket on the rail. */
function ticketCard(x: number, y: number, n: number, dishes: Dish[], served: number, left: number, total: number, a: number): void {
  const hot = left < 10 && Math.floor(a * 4) % 2;
  r(x, y, 44, 40, hot ? [255, 226, 210] : [252, 250, 236]); r(x, y, 44, 2, [210, 206, 190]); r(x + 20, y - 4, 4, 5, CHROME_DK); // the clip
  txt('#' + n, x + 3, y + 4, [60, 60, 70]);
  dishes.forEach((d, k) => dishIcon(d, x + 3 + k * 13, y + 16, !!(served & (1 << k))));
  dishes.forEach((d, k) => { if (served & (1 << k)) line(x + 2 + k * 13, y + 22, x + 10 + k * 13, y + 16, [60, 150, 80]); });
  const u = Math.max(0, Math.min(1, left / total)); r(x + 3, y + 33, 38, 3, [220, 220, 210]); r(x + 3, y + 33, Math.round(38 * u), 3, u > 0.5 ? [80, 190, 110] : u > 0.25 ? [240, 190, 60] : [230, 70, 60]);
}

function drawBack(a: number): void {
  const g = DINER.tour ?? DINER.g, now = Date.now(), on = live(g, now);
  // cars going by outside at night
  lit(() => { for (let k = 0; k < 3; k++) { const x = ((a * (60 + k * 25) + k * 400) % 900) - 150; for (const [x0, x1] of [[96, 424], [476, 604]]) if (x > x0 && x + 16 < x1) { r(x, 386, 16, 4, CONFETTI[k]); r(x + 14, 387, 3, 2, [255, 240, 200]); } } });
  // the neon sign over the windows (one letter flickers)
  const name = 'THE GREASY BYTE', sx = 260 - tw(name, 2) / 2, flick = (a * 2.3) % 7 < 0.15;
  lit(() => { txt(name, sx, 308, [255, 90, 170], 2); if (!flick) r(sx - 4, 320, tw(name, 2) + 8, 1, [120, 220, 255]); });
  G(sx - 6, 302, tw(name, 2) + 12, 24, [255, 90, 170], 0.16);
  // the chalkboard: the best shift
  const b = DINER.best;
  lit(() => { txt('BEST SHIFT', 48 - tw('BEST SHIFT') / 2, 326, [255, 214, 90]); txt(b ? String(b.score) : '---', 48 - tw(b ? String(b.score) : '---', 2) / 2, 336, [240, 240, 230], 2); if (b) txt(b.name.slice(0, 14), 48 - tw(b.name.slice(0, 14)) / 2, 352, [200, 220, 210]); });
  // heat lamps over the pass
  lit(() => { for (const x of [800, 846]) r(x - 8, 356, 16, 3, [255, 150, 70]); });
  for (const x of [800, 846]) Gd(x, 368, 14, [255, 140, 60], 0.18);
  // the ticket rail over the pass and the buns
  r(784, 294, 250, 3, CHROME_DK);
  if (on) {
    const open = openTickets(g, now).slice(0, 5);
    open.forEach((t, k) => ticketCard(790 + k * 48, 300, t.i + 1, t.dishes, g.served[t.i] ?? 0, (t.due - now) / 1000, (t.due - t.at) / 1000, a));
    if (!open.length) lit(() => txt('NO ORDERS... YET', 850, 312, [150, 150, 160]));
  } else lit(() => { const d = DINER.g, m = d && Date.now() - shiftEnd(d) < 60000 ? 'SHIFT OVER: ' + score(d) + ' POINTS' : 'CLOCK IN TO START A SHIFT'; txt(m, 908 - tw(m) / 2, 312, [150, 150, 160]); });
  // the time clock's face: time left in the shift, or the hour
  lit(() => { const s = on ? Math.max(0, Math.ceil((g.t0 + SHIFT_S * 1000 - now) / 1000)) : -1, m = s >= 0 ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : 'IN'; txt(m, CLOCK_X - tw(m) / 2, 380, s >= 0 && s < 20 ? [230, 60, 60] : [60, 60, 70]); });
  // ---- what's cooking ----
  // the grill: two patties (raw pink -> brown -> charcoal) with sizzle and smoke
  if (g) for (let k = 0; k < 2; k++) {
    const st = on ? grillAt(g, k, now) : 'empty'; if (st === 'empty') continue;
    const x = 988 + k * 40, c: RGB = st === 'cooking' ? M([226, 120, 120], [130, 80, 50], Math.min(1, (now - g.grill[k]) / 6000)) : st === 'done' ? [120, 70, 44] : [40, 32, 28];
    r(x, 424, 24, 5, c); r(x + 1, 424, 22, 1, M(c, [255, 255, 255], 0.2));
    if (st !== 'burnt') lit(() => { for (let j = 0; j < 3; j++) { const ph = (a * 2 + j * 0.33 + k * 0.5) % 1; r(x + 4 + j * 7, 420 - Math.round(ph * 8), 1, 1, [255, 230, 160]); } });
    const smoke = st === 'burnt' ? 0.5 : 0.18;
    for (let j = 0; j < 3; j++) { const ph = (a * 0.8 + j / 3) % 1; alpha(smoke * (1 - ph), () => r(x + 8 + Math.round(Math.sin(a * 2 + j) * 3), 416 - Math.round(ph * 30), 6, 4, st === 'burnt' ? [70, 70, 80] : [220, 220, 230])); }
    if (st === 'done') lit(() => txt('!', x + 10, 408 - Math.round(Math.abs(Math.sin(a * 6)) * 2), [124, 242, 156]));
    if (st === 'burnt') lit(() => txt('!!', x + 8, 408, [255, 90, 70]));
  }
  // the fryer: baskets down in the oil (bubbling) or up with golden fries
  for (let k = 0; k < 2; k++) {
    const st = g && on ? fryAt(g, k, now) : 'empty', x = 1098 + k * 40;
    r(x + 8, 404, 2, 22, [60, 60, 70]); // basket handle
    if (st === 'empty') { r(x, 412, 20, 6, [90, 90, 100]); continue; }
    if (st === 'cooking') { lit(() => { for (let j = 0; j < 4; j++) { const ph = (a * 3 + j * 0.25) % 1; r(x + 2 + j * 5, 428 - Math.round(ph * 4), 2, 2, [255, 230, 140]); } }); continue; }
    r(x, 412, 20, 6, [90, 90, 100]); for (let j = 0; j < 6; j++) r(x + 2 + j * 3, 408 + (j % 2), 1, 5, st === 'done' ? [255, 210, 80] : [70, 50, 30]);
    lit(() => txt(st === 'done' ? '!' : '!!', x + 8, 396, st === 'done' ? [124, 242, 156] : [255, 90, 70]));
  }
  // the shake machine: a spinning blender, then a full cup
  { const st = g && on ? shakeAt(g, now) : 'empty', x = 1222;
    r(x - 12, 392, 24, 48, [240, 240, 244]); r(x - 12, 392, 24, 3, CHROME); r(x - 10, 400, 20, 4, [220, 220, 230]);
    r(x - 4, 412, 9, 20, [200, 220, 240]); r(x - 3, 430, 7, 2, CHROME_DK);
    if (st === 'cooking') { r(x - 3, 418, 7, 12, [250, 170, 200]); const sp = Math.floor(a * 20) % 2; r(x - 3 + sp * 3, 422, 3, 1, [255, 230, 240]); }
    if (st === 'done') { r(x - 3, 414, 7, 16, [250, 170, 200]); lit(() => txt('!', x - 1, 382, [124, 242, 156])); }
    lit(() => r(x + 6, 396, 3, 2, st === 'cooking' ? [255, 90, 90] : [90, 200, 110])); }
  // the jukebox: bubbling tubes of light
  lit(() => { for (let k = 0; k < 6; k++) { const ph = (a * 0.7 + k / 6) % 1; r(JUKE_X - 20 + (k % 2) * 36, 420 + Math.round(ph * 36), 2, 2, CONFETTI[k % CONFETTI.length]); } r(JUKE_X - 12, 408, 24, 6, DINER.juke >= 0 ? [255, 214, 90] : [120, 110, 90]); });
  Gd(JUKE_X, 430, 30, [255, 150, 200], 0.14);
  G(KITCHEN_X, 150, W - KITCHEN_X, 40, [255, 250, 240], 0.05);
}

// ---------- props (depth sorted) ----------
const booth = (cx: number): Prop => ({
  y: 488,
  draw() {
    for (const s of [-1, 1]) { // a high-backed red bench each side, facing in
      const bx = cx + s * 42;
      r(bx - 4, 412, 8, 76, RED); r(bx - 4, 412, 8, 3, RED_HI); for (let y = 422; y < 468; y += 12) r(bx - 3, y, 6, 1, RED_DK);
      r(cx + s * 22 - (s > 0 ? 0 : 16), 468, 16, 8, RED); r(cx + s * 22 - (s > 0 ? 0 : 16), 468, 16, 2, RED_HI); r(cx + s * 22 - (s > 0 ? 0 : 16), 476, 16, 12, RED_DK);
    }
    r(cx - 20, 448, 40, 4, [232, 228, 236]); r(cx - 20, 452, 40, 2, CHROME_DK); r(cx - 2, 454, 4, 34, CHROME_DK); r(cx - 10, 486, 20, 2, CHROME_DK);
    r(cx - 12, 442, 4, 6, [250, 250, 250]); r(cx + 6, 440, 5, 8, [200, 40, 50]); r(cx + 6, 440, 5, 2, [250, 250, 250]); // napkins + ketchup
  },
});
const counter: Prop = {
  y: COUNTER.y,
  draw() {
    const { x0, x1, y } = COUNTER;
    r(x0, y - 30, x1 - x0, 28, RED); for (let x = x0 + 6; x < x1; x += 10) r(x, y - 28, 2, 24, RED_DK);
    r(x0 - 4, y - 36, x1 - x0 + 8, 6, [232, 228, 236]); r(x0 - 4, y - 30, x1 - x0 + 8, 2, CHROME); r(x0, y - 2, x1 - x0, 2, CHROME_DK);
    // a cake stand and a pie case on the counter, and the soda fountain at the end
    r(x0 + 40, y - 46, 30, 10, [250, 240, 230]); r(x0 + 40, y - 46, 30, 3, [255, 150, 180]); r(x0 + 54, y - 36, 2, 2, CHROME_DK); r(x0 + 38, y - 36, 34, 1, CHROME);
    r(x0 + 150, y - 54, 40, 18, [200, 230, 240]); r(x0 + 150, y - 54, 40, 1, CHROME); for (let k = 0; k < 3; k++) { r(x0 + 154 + k * 12, y - 44, 10, 5, [224, 170, 90]); r(x0 + 154 + k * 12, y - 44, 10, 1, [150, 60, 80]); }
    const fx = x1 - 20; r(fx - 10, y - 64, 20, 28, CHROME); r(fx - 10, y - 64, 20, 3, [240, 244, 250]); for (const k of [-5, 0, 5]) { r(fx + k - 1, y - 40, 2, 4, CHROME_DK); lit(() => r(fx + k - 1, y - 58, 3, 3, CONFETTI[(k + 5) / 5])); }
    lit(() => txt('SODA', fx - tw('SODA') / 2, y - 52, [60, 60, 70]));
  },
};
const stool = (x: number): Prop => ({ y: COUNTER.y + 22, draw() { r(x - 8, COUNTER.y + 6, 16, 4, RED); r(x - 8, COUNTER.y + 6, 16, 1, RED_HI); r(x - 1, COUNTER.y + 10, 2, 12, CHROME_DK); r(x - 5, COUNTER.y + 21, 10, 1, CHROME_DK); } });
const jukebox: Prop = {
  y: 482,
  draw() {
    const x = JUKE_X;
    r(x - 24, 404, 48, 78, [110, 50, 40]); for (let y = 404; y < 420; y++) { const w = Math.round(24 * Math.sqrt(Math.max(0, 1 - ((420 - y) / 18) ** 2))); r(x - w, y - 12, w * 2, 1, [150, 70, 50]); }
    r(x - 16, 418, 32, 20, [40, 30, 40]); r(x - 14, 440, 28, 30, [220, 200, 160]); for (let k = 0; k < 4; k++) r(x - 12, 444 + k * 6, 24, 2, [150, 120, 80]);
    r(x - 22, 476, 44, 6, [80, 36, 30]);
  },
};
const bin: Prop = { y: 612, draw() { const x = SX[ST.BIN]; r(x - 12, 580, 24, 32, [80, 90, 100]); r(x - 14, 578, 28, 4, [110, 120, 130]); r(x - 3, 574, 6, 4, [110, 120, 130]); lit(() => txt('BIN', x - tw('BIN') / 2, 592, [220, 226, 236])); } };
const signs: Prop = { y: FL + 1, draw() { for (const [i, lab] of [[ST.PASS, 'PASS'], [ST.BUNS, 'BUNS'], [ST.GRILL, 'GRILL'], [ST.FRYER, 'FRYER'], [ST.SHAKE, 'SHAKES']] as [number, string][]) txt(lab, SX[i] - tw(lab) / 2, lab === 'PASS' ? 342 : lab === 'SHAKES' ? 382 : 396, [70, 76, 90]); } };

// ---------- spots (append only!) ----------
const cookSpot = (n: number, label: string, x0: number, x1: number, y0: number): Spot => ({ kind: 'cook', n, x: SX[n], y: FL + 20, sx: SX[n], sy: FL + 20, lift: 0, label, area: { x0, y0, x1, y1: FL + 10 } });
export const DINER_SPOTS: Spot[] = [
  cookSpot(ST.FRIDGE, 'FRIDGE', 1270, 1324, 340), cookSpot(ST.FREEZER, 'FREEZER', 1336, 1390, 360), cookSpot(ST.GRILL, 'GRILL', 970, 1070, 400),
  cookSpot(ST.FRYER, 'FRYER', 1086, 1174, 400), cookSpot(ST.BUNS, 'BUNS', 876, 948, 416), cookSpot(ST.SHAKE, 'SHAKES', 1190, 1254, 380),
  { kind: 'cook', n: ST.BIN, x: SX[ST.BIN], y: 626, sx: SX[ST.BIN], sy: 626, lift: 0, label: 'BIN', area: { x0: 1086, y0: 572, x1: 1114, y1: 612 } },
  cookSpot(ST.PASS, 'THE PASS', 780, 868, 350),
  { kind: 'shift', x: CLOCK_X, y: FL + 20, sx: CLOCK_X, sy: FL + 20, lift: 0, label: 'CLOCK IN', area: { x0: CLOCK_X - 16, y0: 368, x1: CLOCK_X + 16, y1: 414 } },
  { kind: 'juke', x: JUKE_X, y: FL + 20, sx: JUKE_X, sy: FL + 20, lift: 0, label: 'JUKEBOX', area: { x0: JUKE_X - 24, y0: 392, x1: JUKE_X + 24, y1: 482 } },
  { kind: 'soda', x: COUNTER.x1 - 20, y: COUNTER.y + 14, sx: COUNTER.x1 - 20, sy: COUNTER.y + 14, lift: 0, label: 'SODA', area: { x0: COUNTER.x1 - 34, y0: COUNTER.y - 66, x1: COUNTER.x1 - 4, y1: COUNTER.y - 30 } },
  ...BOOTHS.flatMap((cx): Spot[] => [-1, 1].map((s) => ({ kind: 'sit', x: cx + s * 30, y: 489, sx: cx + s * 30, sy: 502, lift: 14, label: 'SIT', area: { x0: cx + s * 30 - 14, y0: 440, x1: cx + s * 30 + 14, y1: 488 } }))),
  ...STOOLS.map((x): Spot => ({ kind: 'sit', x, y: COUNTER.y + 23, sx: x, sy: COUNTER.y + 36, lift: 16, label: 'SIT', area: { x0: x - 10, y0: COUNTER.y + 2, x1: x + 10, y1: COUNTER.y + 22 } })),
];

export function makeDiner(): Room {
  const room: Room = {
    id: 'diner', title: 'THE GREASY BYTE', sub: 'DINER',
    w: W, h: H,
    floor: { x0: 14, y0: FL + 12, x1: W - 14, y1: H - 20 },
    blockers: [
      ...BOOTHS.map((cx) => ({ x0: cx - 48, y0: FL, x1: cx + 48, y1: 494 })),
      { x0: COUNTER.x0 - 4, y0: COUNTER.y - 12, x1: COUNTER.x1 + 4, y1: COUNTER.y + 2 },
      { x0: SX[ST.BIN] - 13, y0: 600, x1: SX[ST.BIN] + 13, y1: 614 },
      { x0: JUKE_X - 24, y0: FL, x1: JUKE_X + 24, y1: 484 },
      { x0: 94, y0: 636, x1: 100, y1: 700 }, // stair railing
    ],
    doors: [{ trigger: { x0: 20, y0: 672, x1: 78, y1: 684 }, edge: true, to: 'dinerstn', arrive: { x: 60, y: 646 }, label: 'SUBWAY', area: { x0: 10, y0: 624, x1: 88, y1: 700 } }],
    spots: DINER_SPOTS, inUse: new Map(),
    music: { x: JUKE_X, tracks: DINER_TRACKS, current: () => ({ n: DINER.juke, t0: DINER.jukeT0 }) },
    onState(s: StateMsg) {
      if (s.k === 'juke') { DINER.juke = s.v.n; DINER.jukeT0 = s.v.t0; }
      else if (s.k === 'diner') DINER.g = s.v;
      else if (s.k === 'dinerbest') DINER.best = s.v;
    },
    spawn: { x: 110, y: 640 },
    dim: 0.03,
    fillTop: 'rgb(34,28,38)', fillLow: 'rgb(40,40,50)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [...BOOTHS.map(booth), counter, ...STOOLS.map(stool), jukebox, bin, signs],
  };
  return room;
}
