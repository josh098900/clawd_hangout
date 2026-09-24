// THE PARK — the first new stop on the Subway (PARK STATION, then up the stairs). A wide green
// with the Square's day/night: a pond with a fountain, ducks and a boat dock (row a boat by
// walking on the water), a kite stand (kites fly on the shared wind, see world/weather.ts),
// a bandstand playing park music, a hot-dog cart, picnic blankets, and a shared sandbox anyone
// can pile, dig and build towers in (room state 'sand'). Leaves fall in autumn, fireflies come
// out at night, and OAK the park keeper looks after it all.

import { K, CONFETTI, type RGB } from '../engine/palette';
import { PX, mk, r, line, disc, oval, txt, tw, lit, alpha, G, Gd, withCtx, M, shade } from '../engine/pixel';
import { h1 } from '../engine/math';
import { PARK_TRACKS } from '../audio/music';
import { dayness } from './plaza';
import type { StateMsg } from '../net/transport';
import type { Room, Prop, Spot } from './room';

const W = 1600, H = 760, HORIZON = 440;
/** The pond: an ellipse, with the fountain in the middle. */
export const POND = { x: 1020, y: 610, rx: 220, ry: 64 };
export const DOCK = { x: 776, y: 612, launch: { x: 834, y: 612 } };
const SANDBOX = { x0: 1390, y0: 648, cols: 32, rows: 10, cell: 5 };
export const SAND_CELLS = SANDBOX.cols * SANDBOX.rows;
/** Room state: the band's track, the sandbox, and where the ducks were last fed. */
export const PARK_INFO = { juke: 0, jukeT0: 0, sand: '0'.repeat(SAND_CELLS), feed: null as { x: number; y: number; t: number } | null };
const autumn = (): boolean => { const m = new Date().getUTCMonth(); return m >= 8 && m <= 10; };

/** Can a boat be here? (on the pond, not on the fountain) */
export function onWater(x: number, y: number): boolean {
  const e = ((x - POND.x) / POND.rx) ** 2 + ((y - POND.y) / POND.ry) ** 2;
  return e < 0.9 && Math.hypot(x - POND.x, (y - POND.y) * 2.2) > 30;
}
/** How far (roughly, px) (x, y) is from the pond's edge; negative = in the water. */
export function pondEdge(x: number, y: number): number {
  const e = Math.sqrt(((x - POND.x) / POND.rx) ** 2 + ((y - POND.y) / POND.ry) ** 2);
  return (e - 1) * Math.min(POND.rx, POND.ry * 2);
}

// ---------- the set (night + day) ----------
function paint(ctx: CanvasRenderingContext2D, day: boolean): void {
  withCtx(ctx, () => {
    PX.dim = 0; PX.fl = 0; PX.emit = false;
    const s0: RGB = day ? [120, 180, 236] : [10, 14, 40], s1: RGB = day ? [196, 226, 246] : [40, 40, 84];
    for (let y = 0; y < HORIZON; y += 4) r(0, y, W, 4, M(s0, s1, y / HORIZON));
    if (!day) { for (let i = 0; i < 180; i++) r(Math.floor(h1(i * 4.1) * W), Math.floor(h1(i * 7.7) * 360), 1, 1, h1(i) > 0.8 ? [220, 226, 255] : [120, 130, 180]); for (let dy = -11; dy <= 11; dy++) { const w = Math.floor(Math.sqrt(121 - dy * dy)); r(1300 - w, 250 + dy, 2 * w + 1, 1, [236, 236, 214]); } }
    else { for (let dy = -14; dy <= 14; dy++) { const w = Math.floor(Math.sqrt(196 - dy * dy)); r(300 - w, 250 + dy, 2 * w + 1, 1, [255, 236, 150]); } for (let i = 0; i < 7; i++) { const x = Math.floor(h1(i * 5.2) * W), y = 290 + Math.floor(h1(i * 2.2) * 60); r(x, y, 34, 6, [250, 252, 255]); r(x + 6, y - 4, 18, 4, [250, 252, 255]); } }
    // the city beyond the trees, then a low hill of hedges
    for (let x = 0; x < W;) { const w = 28 + Math.floor(h1(x * 0.3) * 40), top = 360 + Math.floor(h1(x * 0.8) * 50); r(x, top, w, HORIZON - top, day ? [150, 170, 196] : [30, 34, 70]); if (!day) for (let wy = top + 5; wy < HORIZON - 6; wy += 8) for (let wx = x + 4; wx < x + w - 4; wx += 7) if (h1(wx + wy * 3) > 0.7) r(wx, wy, 2, 3, [200, 170, 110]); x += w + 3; }
    for (let x = 0; x < W; x += 6) { const hh = 14 + Math.round(Math.sin(x * 0.02) * 6 + h1(x) * 5); r(x, HORIZON - hh, 6, hh, day ? [70, 140, 80] : [24, 50, 40]); }
    // the lawn, a winding gravel path, flowers
    const g0: RGB = day ? [96, 170, 90] : [34, 70, 50], g1: RGB = day ? [110, 186, 100] : [40, 80, 58];
    for (let y = HORIZON; y < H; y += 4) r(0, y, W, 4, M(g0, g1, (y - HORIZON) / (H - HORIZON)));
    for (let i = 0; i < 1400; i++) { const x = Math.floor(h1(i * 1.9) * W), y = HORIZON + 6 + Math.floor(h1(i * 3.7) * (H - HORIZON - 6)); r(x, y, 1, 2, day ? [80, 150, 76] : [28, 60, 42]); }
    for (let x = 0; x < W; x += 2) { const y = 572 + Math.round(Math.sin(x * 0.006) * 26); r(x, y, 2, 16, day ? [214, 196, 160] : [80, 74, 66]); if (h1(x) > 0.7) r(x, y + Math.floor(h1(x * 3) * 14), 1, 1, day ? [190, 170, 136] : [66, 60, 54]); }
    for (let i = 0; i < 80; i++) { const x = Math.floor(h1(i * 6.1) * W), y = HORIZON + 10 + Math.floor(h1(i * 2.9) * 300); if (pondEdge(x, y) < 10) continue; r(x, y, 2, 2, CONFETTI[i % CONFETTI.length]); r(x, y + 2, 1, 2, day ? [60, 130, 60] : [24, 50, 36]); }
    // the pond: stone rim, water, lily pads
    for (let j = -POND.ry - 4; j <= POND.ry + 4; j++) { const w = Math.round((POND.rx + 6) * Math.sqrt(Math.max(0, 1 - (j / (POND.ry + 4)) ** 2))); r(POND.x - w, POND.y + j, w * 2, 1, day ? [150, 146, 136] : [70, 70, 74]); }
    for (let j = -POND.ry; j <= POND.ry; j++) { const w = Math.round(POND.rx * Math.sqrt(Math.max(0, 1 - (j / POND.ry) ** 2))); r(POND.x - w, POND.y + j, w * 2, 1, M(day ? [70, 150, 200] : [20, 40, 80], day ? [40, 110, 170] : [14, 28, 60], (j + POND.ry) / (POND.ry * 2))); }
    for (const [lx, ly] of [[860, 580], [900, 650], [1160, 570], [1190, 640], [1110, 660]] as [number, number][]) { oval(lx, ly, 7, 3, day ? [70, 150, 80] : [30, 70, 44]); r(lx - 1, ly - 3, 2, 3, day ? [70, 150, 80] : [30, 70, 44]); r(lx + 3, ly - 1, 2, 2, [255, 170, 200]); }
    // the dock
    r(DOCK.x - 16, DOCK.y - 10, 80, 14, day ? [150, 110, 70] : [70, 52, 36]); for (let x = DOCK.x - 16; x < DOCK.x + 64; x += 8) r(x, DOCK.y - 10, 1, 14, day ? [120, 84, 52] : [52, 38, 26]);
    for (const px of [DOCK.x + 20, DOCK.x + 60]) r(px, DOCK.y - 16, 3, 22, day ? [110, 80, 50] : [50, 36, 24]);
    r(DOCK.x - 20, DOCK.y - 40, 40, 12, [40, 44, 36]); txt('BOATS', DOCK.x - tw('BOATS') / 2, DOCK.y - 37, [230, 240, 200]); r(DOCK.x - 1, DOCK.y - 28, 2, 18, [60, 50, 40]);
    // the subway stairs down (front left) and a CITY PARK sign
    const sx = 120, sy = 690, G_: RGB = [40, 120, 90];
    r(sx - 26, sy, 52, 26, [14, 16, 20]); for (let k = 0; k < 5; k++) r(sx - 22 + k, sy + 3 + k * 5, 44 - k * 2, 2, [110, 112, 120]);
    for (const x of [sx - 28, sx + 26]) r(x, sy - 14, 2, 40, G_); r(sx - 28, sy - 14, 56, 2, G_);
    r(sx + 40, sy - 50, 2, 76, G_); r(sx + 14, sy - 64, 56, 14, G_); txt('SUBWAY', sx + 42 - tw('SUBWAY') / 2, sy - 60, [240, 250, 240]);
    r(40, 470, 140, 20, day ? [120, 80, 50] : [60, 40, 26]); r(42, 472, 136, 16, day ? [60, 110, 60] : [30, 60, 36]); txt('CITY PARK', 110 - tw('CITY PARK', 2) / 2, 476, [240, 236, 200], 2);
    r(52, 490, 4, 40, day ? [120, 80, 50] : [60, 40, 26]); r(164, 490, 4, 40, day ? [120, 80, 50] : [60, 40, 26]);
    // the sandbox frame and sand
    const S = SANDBOX, sw = S.cols * S.cell, sh = S.rows * S.cell;
    r(S.x0 - 6, S.y0 - 6, sw + 12, sh + 12, day ? [150, 100, 60] : [70, 48, 30]); r(S.x0 - 6, S.y0 - 6, sw + 12, 2, day ? [180, 130, 80] : [90, 64, 40]);
    r(S.x0, S.y0, sw, sh, day ? [232, 206, 150] : [110, 96, 74]);
  });
}
function build(this: Room): void { paint(this.bg.getContext('2d')!, false); if (this.bgAlt) paint(this.bgAlt.getContext('2d')!, true); }

// ---------- ducks: they paddle round the pond, and come for crumbs ----------
const DUCKS = Array.from({ length: 6 }, (_, i) => ({ x: POND.x + Math.cos(i) * 120, y: POND.y + Math.sin(i) * 30, dir: 1 as 1 | -1, k: i }));
function stepDucks(a: number): void {
  const f = PARK_INFO.feed, fed = f && performance.now() / 1000 - f.t < 10;
  for (const d of DUCKS) {
    let tx: number, ty: number;
    if (fed && Math.hypot(d.x - f!.x, d.y - f!.y) < 260) { tx = f!.x + Math.sin(d.k * 2.1) * 14; ty = f!.y + Math.cos(d.k * 1.7) * 6; }
    else { const an = a * (0.05 + d.k * 0.01) + d.k * 1.05, rr = 0.45 + (d.k % 3) * 0.14; tx = POND.x + Math.cos(an) * POND.rx * rr; ty = POND.y + Math.sin(an) * POND.ry * rr; }
    if (!onWater(tx, ty)) { tx = POND.x + (tx - POND.x) * 0.7; ty = POND.y + (ty - POND.y) * 0.7; }
    const nx = d.x + (tx - d.x) * 0.012, ny = d.y + (ty - d.y) * 0.012;
    if (onWater(nx, ny)) { if (Math.abs(nx - d.x) > 0.02) d.dir = nx > d.x ? 1 : -1; d.x = nx; d.y = ny; }
  }
}
function drawDuck(d: { x: number; y: number; dir: 1 | -1; k: number }, a: number): void {
  const x = Math.round(d.x), y = Math.round(d.y + Math.sin(a * 2 + d.k) * 0.6), s = d.dir, R = (dx: number, dy: number, w: number, h: number, c: RGB) => r(s > 0 ? x + dx : x - dx - w + 1, y + dy, w, h, c);
  const white = d.k % 3 === 0, body: RGB = white ? [240, 240, 236] : [150, 110, 70], head: RGB = white ? [240, 240, 236] : [40, 110, 70];
  alpha(0.3, () => r(x - 6, y + 1, 12, 1, [220, 240, 255]));
  R(-5, -3, 9, 4, body); R(-6, -4, 3, 2, body); R(2, -7, 4, 4, head); R(6, -6, 2, 1, [255, 170, 40]); R(4, -6, 1, 1, K.EYE);
}

// ---------- animated set pieces ----------
function drawBack(a: number): void {
  const day = dayness(), night = 1 - day;
  if (day > 0.01 && day < 0.99) alpha(0.25 * Math.sin(Math.PI * day), () => r(0, 0, W, HORIZON, [255, 150, 100]));
  // ripples, the fountain's jets and splashes
  lit(() => { for (let i = 0; i < 14; i++) { const u = (a * 0.3 + h1(i)) % 1, x = POND.x + (h1(i * 3) - 0.5) * POND.rx * 1.4, y = POND.y + (h1(i * 5) - 0.5) * POND.ry * 1.2; if (onWater(x, y)) alpha(0.4 * (1 - u), () => r(Math.round(x - 3 - u * 6), Math.round(y), Math.round(6 + u * 12), 1, [200, 230, 255])); } });
  const fx = POND.x, fy = POND.y;
  oval(fx, fy, 22, 7, [150, 146, 136]); oval(fx, fy - 1, 18, 5, [90, 150, 200]); r(fx - 3, fy - 16, 6, 16, [170, 166, 156]); oval(fx, fy - 16, 9, 3, [170, 166, 156]);
  lit(() => { for (let k = 0; k < 14; k++) { const ph = (a * 1.4 + k / 14) % 1, side = k % 2 ? 1 : -1, px = fx + side * ph * 16, py = fy - 18 - Math.sin(ph * Math.PI) * 26 + ph * 14; r(Math.round(px), Math.round(py), 1, 2, [200, 230, 255]); } r(fx - 1, fy - 44 + Math.round(Math.sin(a * 6)), 2, 26, [210, 236, 255]); });
  Gd(fx, fy - 30, 18, [180, 220, 255], 0.14 + 0.2 * night);
  stepDucks(a); for (const d of DUCKS) drawDuck(d, a);
  // the sandbox: heights and towers (room state)
  drawSand(a);
  // fireflies at night; leaves (autumn) or butterflies (the rest of the year) by day
  if (night > 0.4) lit(() => { for (let i = 0; i < 26; i++) { const x = (h1(i) * W + Math.sin(a * 0.3 + i) * 40), y = 470 + h1(i * 3) * 240 + Math.sin(a * 0.7 + i * 2) * 12; if ((a * 0.8 + h1(i + 9)) % 1 < 0.6) { r(Math.round(x), Math.round(y), 1, 1, [220, 255, 140]); } } });
  if (autumn()) for (let i = 0; i < 18; i++) { const t = (a * 0.06 + h1(i * 7)) % 1, x = (h1(i) * W + t * 260 + Math.sin(a + i) * 20) % W, y = 380 + t * 360, c: RGB = ([[214, 120, 40], [190, 70, 40], [230, 170, 60]] as RGB[])[i % 3]; r(Math.round(x), Math.round(y), 2, 1, c); r(Math.round(x) + (Math.floor(a * 3 + i) % 2), Math.round(y) + 1, 1, 1, c); }
  else if (day > 0.5) for (let i = 0; i < 6; i++) { const x = (h1(i) * W + Math.sin(a * 0.4 + i) * 80), y = 480 + h1(i * 3) * 160 + Math.sin(a * 1.3 + i) * 10, up = Math.floor(a * 10 + i) % 2; const c = CONFETTI[i % CONFETTI.length]; r(Math.round(x) - 2, Math.round(y) - (up ? 2 : 0), 2, 2, c); r(Math.round(x) + 1, Math.round(y) - (up ? 2 : 0), 2, 2, c); }
}

/** The shared sandbox: '0' flat .. '3' a big heap, '4' a castle tower. */
function drawSand(a: number): void {
  const S = SANDBOX, v = PARK_INFO.sand, day = dayness() > 0.5, sand: RGB = day ? [232, 206, 150] : [110, 96, 74];
  for (let j = 0; j < S.rows; j++) for (let i = 0; i < S.cols; i++) {
    const h = Number(v[j * S.cols + i]) || 0; if (!h) continue;
    const x = S.x0 + i * S.cell, y = S.y0 + j * S.cell;
    if (h === 4) { // a tower with little battlements (and a flag on some)
      const wall = shade(sand, 0.78);
      r(x, y - 9, S.cell, S.cell + 9, wall); r(x, y - 9, 1, S.cell + 9, M(sand, [255, 255, 255], 0.15)); r(x + S.cell - 1, y - 9, 1, S.cell + 9, shade(sand, 0.62));
      r(x, y - 11, 1, 2, wall); r(x + 2, y - 11, 1, 2, wall); r(x + 4, y - 11, 1, 2, wall); r(x + 2, y - 5, 1, 2, shade(sand, 0.5));
      if ((i + j) % 3 === 0) { r(x + 2, y - 17, 1, 6, [90, 70, 50]); r(x + 3, y - 17 + (Math.floor(a * 3 + i) % 2), 3, 2, CONFETTI[(i + j) % CONFETTI.length]); }
    } else { // a heap: light top, shaded front, a dark foot
      r(x, y - h * 2, S.cell, h * 2, M(sand, [255, 255, 255], 0.12 + 0.05 * h)); r(x, y, S.cell, S.cell, shade(sand, 0.86 - 0.04 * h)); r(x, y + S.cell - 1, S.cell, 1, shade(sand, 0.66));
    }
  }
}

// ---------- props ----------
const tree = (x: number, y: number, big: number): Prop => ({
  y,
  draw(a: number) {
    const fall = autumn(), day = dayness() > 0.5;
    const cols: RGB[] = fall ? [[200, 110, 40], [220, 150, 50], [170, 70, 40]] : [[60, 140, 70], [80, 160, 84], [44, 110, 60]];
    r(x - 4, y - 46 - big * 10, 9, 46 + big * 10, day ? [110, 80, 54] : [60, 44, 30]); r(x - 4, y - 46 - big * 10, 2, 46 + big * 10, day ? [140, 104, 70] : [74, 54, 38]);
    const cy = y - 70 - big * 16, rr = 26 + big * 8, sway = Math.round(Math.sin(a * 0.8 + x) * 1.5);
    for (let k = 0; k < 7; k++) { const ox = Math.round(Math.cos(k * 0.9 + x) * rr * 0.55) + sway, oy = Math.round(Math.sin(k * 1.3 + x) * rr * 0.35); disc(x + ox, cy + oy, Math.round(rr * 0.62), day ? cols[k % 3] : shade(cols[k % 3], 0.45)); }
    disc(x - rr * 0.3 + sway, cy - rr * 0.3, Math.round(rr * 0.35), day ? M(cols[1], [255, 255, 255], 0.15) : shade(cols[1], 0.5));
  },
});
const lamp = (x: number, y: number): Prop => ({
  y,
  draw() {
    const night = 1 - dayness();
    r(x - 1, y - 60, 3, 60, [40, 44, 52]); r(x - 4, y - 2, 9, 2, [40, 44, 52]); r(x - 5, y - 66, 11, 7, [40, 44, 52]);
    lit(() => r(x - 3, y - 64, 7, 4, M([80, 80, 70], [255, 230, 160], night))); if (night > 0.2) { Gd(x, y - 62, 12, [255, 220, 150], 0.5 * night); G(x - 30, y - 6, 60, 10, [255, 220, 150], 0.12 * night); }
  },
});
const benchP = (x: number, y: number): Prop => ({ y, draw() { const w = 60; r(x - w / 2, y - 22, w, 3, [140, 100, 60]); r(x - w / 2, y - 17, w, 3, [140, 100, 60]); r(x - w / 2, y - 10, w, 4, [170, 124, 80]); for (const lx of [x - w / 2 + 4, x + w / 2 - 7]) r(lx, y - 22, 3, 22, [40, 44, 52]); } });
const blanket = (x: number, y: number, c: RGB): Prop => ({
  y: y - 6,
  draw() {
    for (let j = 0; j < 16; j++) for (let i = 0; i < 14; i++) if ((i + j) % 2 === 0) r(x - 35 + i * 5, y - 16 + j, 5, 1, c); else r(x - 35 + i * 5, y - 16 + j, 5, 1, [240, 236, 226]);
    r(x + 20, y - 26, 16, 10, [170, 120, 60]); r(x + 20, y - 26, 16, 2, [200, 150, 90]); line(x + 22, y - 26, x + 28, y - 32, [120, 84, 50]); line(x + 34, y - 26, x + 28, y - 32, [120, 84, 50]);
    oval(x - 16, y - 8, 5, 2, K.WHITE); r(x - 18, y - 10, 4, 2, [230, 50, 60]);
  },
});
const bandstand: Prop = {
  y: 504,
  draw(a: number) {
    const x = 340, y = 504, night = 1 - dayness();
    r(x - 60, y - 8, 120, 8, [200, 196, 186]); r(x - 60, y - 8, 120, 2, [230, 226, 216]);
    for (const px of [-52, -18, 18, 52]) r(x + px - 2, y - 58, 4, 50, [240, 236, 226]);
    for (let j = 0; j < 20; j++) { const hw = 20 + j * 2.4; r(Math.round(x - hw), y - 78 + j, Math.round(hw * 2), 1, j % 5 === 4 ? [150, 40, 50] : [200, 60, 70]); }
    r(x - 2, y - 88, 4, 10, [240, 214, 90]);
    lit(() => { for (let k = 0; k < 12; k++) r(x - 64 + k * 11, y - 58 + (k % 2), 2, 2, (Math.floor(a * 2) + k) % 3 ? [255, 214, 120] : CONFETTI[k % CONFETTI.length]); });
    if (night > 0.3) G(x - 60, y - 60, 120, 52, [255, 214, 150], 0.1 * night);
    txt('BAND', x - tw('BAND') / 2, y - 6, [120, 40, 50]);
  },
};
const cart: Prop = {
  y: 530,
  draw(a: number) {
    const x = 660, y = 530;
    r(x - 26, y - 30, 52, 22, [220, 60, 50]); r(x - 26, y - 30, 52, 3, [250, 110, 90]); r(x - 24, y - 20, 48, 3, [255, 214, 90]);
    txt('HOT DOGS', x - tw('HOT DOGS') / 2, y - 16, [255, 244, 220]);
    for (const wx of [-16, 16]) { disc(x + wx, y - 4, 5, [40, 40, 46]); disc(x + wx, y - 4, 2, [140, 140, 150]); }
    r(x - 1, y - 70, 2, 40, [200, 200, 210]);
    for (let j = 0; j < 12; j++) { const hw = 6 + j * 2.6; r(Math.round(x - hw), y - 76 + j, Math.round(hw * 2), 1, j % 2 ? [255, 255, 250] : [230, 60, 60]); }
    if ((a * 0.7) % 1 < 0.5) alpha(0.4, () => r(x - 6 + Math.round(Math.sin(a * 2) * 2), y - 38 - Math.round((a * 12) % 10), 2, 3, [230, 230, 236]));
  },
};
const kiteStand: Prop = {
  y: 512,
  draw(a: number) {
    const x = 1330, y = 512;
    r(x - 30, y - 12, 60, 12, [110, 80, 54]); r(x - 30, y - 12, 60, 2, [150, 110, 74]);
    for (const px of [-26, 24]) r(x + px, y - 52, 3, 40, [110, 80, 54]); r(x - 28, y - 52, 58, 3, [110, 80, 54]);
    for (let k = 0; k < 4; k++) { const kx = x - 18 + k * 12, ky = y - 40 + Math.round(Math.sin(a * 2 + k) * 1), c = CONFETTI[k % CONFETTI.length]; for (let j = -5; j <= 6; j++) { const hw = j < 0 ? 5 + j : Math.round((6 - j) * 0.8); if (hw > 0) r(kx - hw, ky + j, hw * 2, 1, c); } r(kx, ky + 6, 1, 6, [240, 236, 220]); }
    r(x - 20, y - 70, 40, 12, [40, 44, 36]); txt('KITES', x - tw('KITES') / 2, y - 67, [230, 240, 200]);
  },
};

// ---------- spots (index = network id: append only) ----------
export const PARK_SPOTS: Spot[] = [
  { kind: 'boat', x: DOCK.x, y: DOCK.y, sx: DOCK.x, sy: DOCK.y, lift: 0, label: 'ROW A BOAT', area: { x0: DOCK.x - 24, y0: DOCK.y - 44, x1: DOCK.x + 24, y1: DOCK.y + 4 } },
  { kind: 'kite', x: 1330, y: 524, sx: 1330, sy: 524, lift: 0, label: 'FLY A KITE', area: { x0: 1298, y0: 450, x1: 1362, y1: 512 } },
  { kind: 'hotdog', x: 660, y: 542, sx: 660, sy: 542, lift: 0, label: 'HOT DOG', area: { x0: 632, y0: 454, x1: 688, y1: 530 } },
  { kind: 'juke', x: 340, y: 516, sx: 340, sy: 516, lift: 0, label: 'BAND', area: { x0: 280, y0: 420, x1: 400, y1: 504 } },
  { kind: 'sand', x: 1470, y: 712, sx: 1470, sy: 712, lift: 0, label: 'SANDBOX', area: { x0: SANDBOX.x0 - 6, y0: SANDBOX.y0 - 20, x1: SANDBOX.x0 + 166, y1: SANDBOX.y0 + 56 } },
  ...[-14, 14].map((dx): Spot => ({ kind: 'sit', x: 470 + dx, y: 651, sx: 470 + dx, sy: 662, lift: 2, label: 'PICNIC', area: { x0: 435, y0: 632, x1: 505, y1: 654 } })),
  ...[-14, 14].map((dx): Spot => ({ kind: 'sit', x: 640 + dx, y: 703, sx: 640 + dx, sy: 714, lift: 2, label: 'PICNIC', area: { x0: 605, y0: 684, x1: 675, y1: 706 } })),
  ...[-14, 14].map((dx): Spot => ({ kind: 'sit', x: 230 + dx, y: 621, sx: 230 + dx, sy: 632, lift: 6, label: 'SIT', area: { x0: 200, y0: 598, x1: 260, y1: 620 } })),
  ...[-14, 14].map((dx): Spot => ({ kind: 'sit', x: 1240 + dx, y: 701, sx: 1240 + dx, sy: 712, lift: 6, label: 'SIT', area: { x0: 1210, y0: 678, x1: 1270, y1: 700 } })),
];

/** Rectangles covering the pond, so walkers (and bots, and the path finder) go round it. */
function pondBlockers(): { x0: number; y0: number; x1: number; y1: number }[] {
  const out = [], n = 8, h = (POND.ry * 2) / n;
  for (let k = 0; k < n; k++) { const y0 = POND.y - POND.ry + k * h, y1 = y0 + h, near = Math.min(Math.abs(y0 - POND.y), Math.abs(y1 - POND.y)), dy = y0 <= POND.y && y1 >= POND.y ? 0 : near; const hw = POND.rx * Math.sqrt(Math.max(0, 1 - (dy / POND.ry) ** 2)); out.push({ x0: POND.x - hw, y0, x1: POND.x + hw, y1 }); }
  return out;
}

export function makePark(): Room {
  const room: Room = {
    id: 'park', title: 'CITY PARK', sub: 'OUTSIDE',
    w: W, h: H,
    floor: { x0: 14, y0: HORIZON + 12, x1: W - 14, y1: H - 20 },
    blockers: [
      ...pondBlockers(),
      { x0: 280, y0: 496, x1: 400, y1: 506 }, { x0: 630, y0: 520, x1: 690, y1: 532 }, { x0: 1300, y0: 500, x1: 1360, y1: 514 },
      { x0: SANDBOX.x0 - 6, y0: SANDBOX.y0 - 4, x1: SANDBOX.x0 + 166, y1: SANDBOX.y0 + 56 },
      { x0: 94, y0: 676, x1: 100, y1: 716 }, { x0: 146, y0: 676, x1: 152, y1: 716 }, // subway railings
      { x0: 200, y0: 612, x1: 260, y1: 622 }, { x0: 1210, y0: 692, x1: 1270, y1: 702 }, // benches
    ],
    doors: [{ trigger: { x0: 102, y0: 692, x1: 138, y1: 708 }, edge: true, to: 'parkstn', arrive: { x: 60, y: 646 }, label: 'SUBWAY', area: { x0: 90, y0: 620, x1: 170, y1: 716 } }],
    spots: PARK_SPOTS, inUse: new Map(),
    music: { x: 340, tracks: PARK_TRACKS, current: () => ({ n: PARK_INFO.juke, t0: PARK_INFO.jukeT0 }) },
    onState(s: StateMsg) {
      if (s.k === 'juke') { PARK_INFO.juke = s.v.n; PARK_INFO.jukeT0 = s.v.t0; }
      else if (s.k === 'sand') PARK_INFO.sand = s.v;
    },
    water: onWater,
    spawn: { x: 170, y: 660 },
    dim: 0.1,
    dimNow: () => 0.1 * (1 - dayness()),
    altAlpha: dayness,
    glowMul: () => 1 - 0.6 * dayness(),
    fillTop: 'rgb(10,14,40)', fillLow: 'rgb(40,80,58)',
    bg: mk(W, H), bgAlt: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [tree(60, 452, 1), tree(230, 456, 0), tree(520, 454, 1), tree(800, 456, 0), tree(1240, 452, 1), tree(1470, 456, 0), tree(1570, 460, 1), lamp(270, 546), lamp(900, 704), lamp(1180, 530), lamp(1540, 600), benchP(230, 620), benchP(1240, 700), blanket(470, 650, [220, 60, 70]), blanket(640, 702, [70, 110, 200]), bandstand, cart, kiteStand],
  };
  return room;
}
