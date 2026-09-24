// THE SQUARE — the film's night city square, widened to 1200px. The giant robot and the
// stage are gone; the three voxel creations she built now stand as permanent installations.

import { K, DK, CK, CONFETTI, type RGB } from '../engine/palette';
import { PX, mk, r, txt, alpha, lit, G, Gd, Gline, withCtx, M, shade, tw } from '../engine/pixel';
import { h1, clamp } from '../engine/math';
import type { Room, Prop, Spot } from './room';
import { FILMS, currentFilm } from './cinema';
import { CASTLE, COASTER, DRAGON, dragonState, placeCreation, VS } from './voxels';

const W = 1200, H = 780, GROUND = 560;
const CWIN: [number, number, number, number, RGB][] = [];
const CASTLE_AT: [number, number] = [214, GROUND];
const COASTER_AT: [number, number] = [760, GROUND];
const DRAGON_AT: [number, number] = [990, GROUND - 14];
const LABDOOR = { x: 40, y: 488, w: 44, h: 72 };
const CINE = { x0: 380, x1: 508, top: 432, door: { x: 426, y: 506, w: 36, h: 54 } };
/** The Arcade stairwell (top edge centre), down in the front-left of the Square. */
const ARC = { x: 186, y: 680 };
/** The Subway entrance (top edge centre), front middle-right of the Square. */
const SUB = { x: 760, y: 682 };

/**
 * Day/night on a 20-minute loop of the WALL clock, so every player sees the same sky.
 * 0 = night (the film's look), 1 = full day. Night and day each hold for ~8 min, with
 * ~1.6 min of dawn and dusk between.
 */
export function dayness(): number {
  const p = (Date.now() / 1000 / 1200) % 1, ss = (u: number) => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };
  if (p < 0.42) return 0;
  if (p < 0.5) return ss((p - 0.42) / 0.08);
  if (p < 0.92) return 1;
  return 1 - ss((p - 0.92) / 0.08);
}

function build(this: Room): void {
  paint(this.bg.getContext('2d')!, false);
  if (this.bgAlt) paint(this.bgAlt.getContext('2d')!, true);
}

/** Bake the set. `day` swaps the sky, skyline and pavement for their daylight tokens. */
function paint(ctx: CanvasRenderingContext2D, day: boolean): void {
  const SKY0 = day ? DK.SKY0 : K.SKY0, SKY1 = day ? DK.SKY1 : K.SKY1, SKY2 = day ? DK.SKY2 : K.SKY2;
  const CITY0 = day ? DK.CITY0 : K.CITY0, CITY1 = day ? DK.CITY1 : K.CITY1, CITY2 = day ? DK.CITY2 : K.CITY2, TOWER = day ? DK.TOWER : K.TOWER;
  const winA = (c: RGB, k: number): RGB => (day ? (k > 0.85 ? DK.WIN2 : DK.WIN) : shade(c, k > 0.85 ? 0.8 : 0.55));
  withCtx(ctx, () => {
    PX.dim = 0; PX.fl = 0; PX.emit = false;
    for (let y = 0; y < GROUND; y += 4) { const u = y / GROUND; r(0, y, W, 4, u < 0.6 ? M(SKY0, SKY1, u / 0.6) : M(SKY1, SKY2, (u - 0.6) / 0.4)); }
    if (!day) for (let i = 0; i < 190; i++) { const x = Math.floor(h1(i * 3.3) * W), y = Math.floor(h1(i * 7.1) * 330); r(x, y, 1, 1, h1(i) > 0.8 ? [200, 210, 255] : [120, 130, 180]); }
    if (!day) { // moon
      for (let dy = -12; dy <= 12; dy++) { const w = Math.floor(Math.sqrt(144 - dy * dy)); r(980 - w, 90 + dy, 2 * w + 1, 1, [236, 236, 214]); }
      for (let dy = -12; dy <= 12; dy++) { const w = Math.floor(Math.sqrt(144 - dy * dy)); r(986 - w, 86 + dy, 2 * w + 1, 1, K.SKY0); }
    } else { // sun
      for (let dy = -14; dy <= 14; dy++) { const w = Math.floor(Math.sqrt(196 - dy * dy)); r(300 - w, 110 + dy, 2 * w + 1, 1, DK.SUN); }
      for (let dy = -9; dy <= 9; dy++) { const w = Math.floor(Math.sqrt(81 - dy * dy)); r(297 - w, 107 + dy, 2 * w + 1, 1, DK.SUN_HI); }
    }
    // far skyline
    let x = 0;
    while (x < W) {
      const w = 24 + Math.floor(h1(x * 0.37) * 40), top = 300 + Math.floor(h1(x * 0.91) * 110); r(x, top, w, GROUND - top, CITY0);
      for (let wy = top + 6; wy < GROUND - 10; wy += 9) for (let wx = x + 4; wx < x + w - 4; wx += 7) if (h1(wx * 1.7 + wy * 2.3) > 0.72) { r(wx, wy, 2, 3, day ? winA(K.WIN_Y, h1(wx + wy)) : h1(wx + wy) > 0.8 ? shade(K.WIN_B, 0.55) : shade(K.WIN_Y, 0.55)); if (!day) CWIN.push([wx, wy, 2, 3, K.CITY0]); }
      x += w + 2;
    }
    // the tower
    r(566, 70, 54, GROUND - 70, TOWER); r(566, 70, 2, GROUND - 70, day ? DK.TOWER2 : [26, 32, 64]); r(574, 40, 38, 32, TOWER); r(588, 12, 10, 30, TOWER); r(592, 0, 2, 14, [40, 46, 80]);
    for (let y = 130; y < GROUND; y += 14) r(572, y, 42, 1, [20, 26, 56]); r(578, 120, 2, GROUND - 140, [22, 30, 66]); r(606, 120, 2, GROUND - 140, [22, 30, 66]);
    r(576, 82, 28, 24, [18, 20, 36]); r(575, 104, 30, 3, [60, 66, 90]); r(575, 104, 30, 1, [90, 96, 120]);
    // near skyline (leaves a gap around the tower)
    x = -10;
    while (x < W) {
      const w = 34 + Math.floor(h1(x * 0.53 + 9) * 46), top = 390 + Math.floor(h1(x * 0.29 + 4) * 90);
      if ((x + w < 540 || x > 640) && x + w > 150) {
        r(x, top, w, GROUND - top, CITY1); r(x, top, w, 2, CITY2);
        for (let wy = top + 8; wy < GROUND - 8; wy += 10) for (let wx = x + 5; wx < x + w - 5; wx += 8) if (h1(wx * 2.1 + wy * 1.3 + 5) > 0.62) { r(wx, wy, 3, 4, day ? winA(K.WIN_Y, h1(wx * 3 + wy)) : h1(wx * 3 + wy) > 0.85 ? shade(K.WIN_B, 0.8) : shade(K.WIN_Y, 0.8)); if (!day) CWIN.push([wx, wy, 3, 4, K.CITY1]); }
      }
      x += w + 3;
    }
    // the cinema: velvet-red front, marquee board, poster cases, double glass doors
    const Cx = CINE;
    r(Cx.x0, Cx.top, Cx.x1 - Cx.x0, GROUND - Cx.top, CK.WALL_DK); r(Cx.x0 + 2, Cx.top + 2, Cx.x1 - Cx.x0 - 4, GROUND - Cx.top - 2, CK.WALL);
    for (let x = Cx.x0 + 8; x < Cx.x1 - 4; x += 12) r(x, Cx.top + 34, 2, GROUND - Cx.top - 34, CK.WALL_HI);
    r(Cx.x0 - 4, Cx.top - 4, Cx.x1 - Cx.x0 + 8, 6, CK.GOLD_DK); r(Cx.x0 - 4, Cx.top - 4, Cx.x1 - Cx.x0 + 8, 1, CK.GOLD_HI);
    r(Cx.x0 + 8, Cx.top + 8, Cx.x1 - Cx.x0 - 16, 22, CK.GOLD_DK); r(Cx.x0 + 10, Cx.top + 10, Cx.x1 - Cx.x0 - 20, 18, CK.BOARD);
    r(Cx.x0 - 2, Cx.top + 58, Cx.x1 - Cx.x0 + 4, 5, CK.GOLD_DK); r(Cx.x0 - 2, Cx.top + 58, Cx.x1 - Cx.x0 + 4, 1, CK.GOLD_HI);
    for (const px of [Cx.x0 + 8, Cx.x1 - 34]) { r(px, 500, 26, 36, CK.GOLD_DK); r(px + 2, 502, 22, 32, [24, 20, 40]); }
    // tiny posters: a rocket, and a dragon under the moon
    r(Cx.x0 + 10, 504, 22, 28, [18, 22, 60]); r(Cx.x0 + 19, 512, 4, 10, [240, 240, 240]); r(Cx.x0 + 19, 511, 4, 1, K.RED); r(Cx.x0 + 20, 522, 2, 3, K.GOLD); for (let i = 0; i < 5; i++) r(Cx.x0 + 11 + Math.floor(h1(i + 60) * 20), 505 + Math.floor(h1(i + 61) * 26), 1, 1, K.WHITE);
    r(Cx.x1 - 32, 504, 22, 28, [40, 20, 60]); r(Cx.x1 - 20, 507, 6, 6, [236, 236, 214]); r(Cx.x1 - 30, 518, 14, 4, [52, 195, 143]); r(Cx.x1 - 18, 516, 4, 3, [52, 195, 143]); r(Cx.x1 - 28, 522, 2, 3, [52, 195, 143]); r(Cx.x1 - 22, 522, 2, 3, [52, 195, 143]);
    const D2 = Cx.door; r(D2.x - 3, D2.y - 3, D2.w + 6, D2.h + 3, CK.GOLD_DK); r(D2.x, D2.y, D2.w, D2.h, [30, 22, 34]);
    for (const dx of [D2.x + 2, D2.x + D2.w / 2 + 1]) { r(dx, D2.y + 2, D2.w / 2 - 3, D2.h - 4, [60, 44, 70]); r(dx + 1, D2.y + 3, 4, D2.h - 10, [90, 76, 110]); }
    r(D2.x + D2.w / 2 - 3, D2.y + 26, 2, 8, CK.GOLD_HI); r(D2.x + D2.w / 2 + 1, D2.y + 26, 2, 8, CK.GOLD_HI);
    r(D2.x - 10, GROUND - 2, D2.w + 20, 2, CK.CARPET);

    // the lab building on the left edge: brick, basement window, door, sign board
    r(0, 380, 144, GROUND - 380, K.MORTAR);
    for (let y = 380, row = 0; y < GROUND; y += 6, row++) { const off = row % 2 ? 7 : 0; for (let bx = -off; bx < 144; bx += 14) { const c = [K.BRICK, K.BRICK2, K.BRICK3][Math.floor(h1(bx * 0.7 + y * 1.3) * 3)]; r(bx, y, 13, 5, c); r(bx, y, 13, 1, shade(c, 1.12)); } }
    r(0, 374, 150, 8, [30, 20, 20]); r(0, 374, 150, 1, [70, 50, 44]);
    const D = LABDOOR; r(D.x - 5, D.y - 5, D.w + 10, D.h + 5, [22, 24, 30]); r(D.x - 3, D.y - 3, D.w + 6, D.h + 3, [42, 46, 54]); r(D.x, D.y, D.w, D.h, [96, 110, 118]); r(D.x, D.y, D.w, 2, [130, 144, 150]); r(D.x + D.w - 2, D.y, 2, D.h, [70, 82, 90]);
    r(D.x + 9, D.y + 12, 26, 18, [20, 34, 60]); r(D.x + 34, D.y + 38, 3, 6, [210, 200, 120]);
    r(34, 452, 56, 22, [20, 14, 14]); r(35, 453, 54, 20, [32, 22, 20]);
    r(96, 520, 40, 22, [22, 24, 30]); r(98, 522, 36, 18, [24, 30, 44]); r(96, 540, 40, 3, [150, 150, 158]);
    r(146, 380, 6, GROUND - 380, [44, 48, 56]); r(146, 380, 1, GROUND - 380, [70, 74, 84]);
    // pavement
    r(0, GROUND, W, H - GROUND, day ? DK.PAVE : K.PAVE);
    for (let yy = GROUND; yy < H; yy += 10) { r(0, yy, W, 1, day ? DK.PAVE2 : K.PAVE2); const off = ((yy - GROUND) / 10) % 2 ? 15 : 0; for (let xx = off; xx < W; xx += 30) r(xx, yy, 1, 10, day ? DK.PAVE2 : K.PAVE2); }
    alpha(0.5, () => r(0, GROUND, W, 3, [60, 70, 120]));
    // plinths for the installations
    const plinth = (x0: number, w: number, h: number) => { r(x0, GROUND - h, w, h, [70, 74, 92]); r(x0, GROUND - h, w, 2, [128, 134, 160]); r(x0 + w - 6, GROUND - h + 2, 6, h - 2, [54, 58, 74]); };
    plinth(DRAGON_AT[0] - 16, 200, 14);
    const plaque = (cx: number, y: number, s: string) => { const w = tw(s) + 8; r(cx - w / 2, y, w, 9, [150, 118, 62]); r(cx - w / 2, y, w, 1, [196, 160, 90]); txt(s, cx - tw(s) / 2, y + 2, [60, 44, 20]); };
    plaque(DRAGON_AT[0] + 84, GROUND - 11, 'THE DRAGON');
    if (day) for (let i = 0; i < 8; i++) { const x = 60 + Math.floor(h1(i * 5.5 + 3) * 1080), y = 60 + Math.floor(h1(i * 2.7 + 1) * 180); r(x, y, 26, 5, DK.CLOUD); r(x + 5, y - 3, 14, 3, DK.CLOUD); r(x + 2, y + 5, 22, 1, DK.SKY1); }
    // the stage door in the base of the tower
    r(574, 506, 38, 54, [20, 16, 30]); r(577, 509, 32, 51, [60, 40, 90]); r(577, 509, 32, 2, [90, 64, 130]); r(592, 509, 2, 51, [40, 28, 60]); r(588, 532, 2, 6, K.GOLD); r(596, 532, 2, 6, K.GOLD);
    // signpost at the open right edge: the beach is that way
    r(1176, 596, 2, 26, K.STEEL_POST); r(1156, 588, 34, 10, [30, 34, 56]); txt('PIER>', 1173 - tw('PIER>') / 2, 590, [255, 214, 90]);
    // the grate down to the Crypt
    r(1100, 684, 40, 14, [20, 22, 30]); for (let x = 1102; x < 1140; x += 5) r(x, 684, 2, 14, [70, 74, 88]); r(1100, 684, 40, 2, [90, 94, 110]); r(1100, 696, 40, 2, [50, 54, 66]);
    r(1146, 660, 2, 38, K.STEEL_POST); r(1140, 652, 30, 10, [30, 34, 56]); txt('CRYPT', 1155 - tw('CRYPT') / 2, 654, [124, 242, 208]);
    // the stairs down to the Arcade: a lit stairwell with railings, like a subway entrance
    r(ARC.x - 26, ARC.y, 52, 26, [14, 10, 24]); for (let k = 0; k < 5; k++) r(ARC.x - 22 + k, ARC.y + 3 + k * 5, 44 - k * 2, 2, [70, 56, 100]);
    r(ARC.x - 28, ARC.y - 2, 56, 2, [90, 94, 110]); for (const sx of [ARC.x - 28, ARC.x + 26]) { r(sx, ARC.y - 12, 2, 38, K.STEEL_POST); r(sx, ARC.y - 12, 2, 1, [140, 150, 180]); }
    r(ARC.x - 28, ARC.y - 12, 56, 2, K.STEEL_POST);
    r(ARC.x + 40, ARC.y - 42, 2, 70, K.STEEL_POST); r(ARC.x + 14, ARC.y - 60, 56, 18, [30, 20, 50]); r(ARC.x + 14, ARC.y - 60, 56, 1, [90, 60, 140]);
    // the Subway: green railings round a stairwell, and a lamp-topped SUBWAY sign
    const G_: RGB = [40, 120, 90];
    r(SUB.x - 26, SUB.y, 52, 26, [14, 16, 20]); for (let k = 0; k < 5; k++) r(SUB.x - 22 + k, SUB.y + 3 + k * 5, 44 - k * 2, 2, [110, 112, 120]);
    r(SUB.x - 28, SUB.y - 2, 56, 2, [90, 94, 110]); for (const sx of [SUB.x - 28, SUB.x + 26]) { r(sx, SUB.y - 14, 2, 40, G_); r(sx, SUB.y - 14, 2, 1, [110, 190, 150]); }
    r(SUB.x - 28, SUB.y - 14, 56, 2, G_);
    r(SUB.x + 40, SUB.y - 50, 2, 76, G_); r(SUB.x + 16, SUB.y - 64, 50, 14, G_); r(SUB.x + 16, SUB.y - 64, 50, 1, [110, 190, 150]); txt('SUBWAY', SUB.x + 41 - tw('SUBWAY') / 2, SUB.y - 60, [240, 250, 240]);
  });
}

function drawBack(a: number): void {
  const day = dayness();
  // dawn and dusk: a warm wash over the sky and skyline
  if (day > 0.01 && day < 0.99) alpha(0.28 * Math.sin(Math.PI * day), () => r(0, 0, W, GROUND, [255, 140, 90]));
  // the stage sign over the tower door
  lit(() => txt('STAGE', 593 - tw('STAGE') / 2, 498, (a % 1.4) < 1.1 ? K.MAG : [120, 40, 100])); G(574, 494, 38, 12, K.MAG, 0.25);
  // the ARCADE sign blinks through the colours, and the stairwell glows
  lit(() => { const s = 'ARCADE'; let x = ARC.x + 42 - tw(s) / 2; for (let i = 0; i < s.length; i++) { txt(s[i], x, ARC.y - 56, CONFETTI[(i + Math.floor(a * 3)) % CONFETTI.length]); x += tw(s[i]) + 1; } const ac: RGB = (a % 1) < 0.5 ? K.GOLD : [120, 90, 40]; for (let k = 0; k < 3; k++) r(ARC.x + 40 - 2 + k, ARC.y - 50 + k, 5 - k * 2, 1, ac); });
  G(ARC.x + 14, ARC.y - 60, 56, 18, [255, 120, 220], 0.22); G(ARC.x - 26, ARC.y, 52, 26, [200, 120, 255], 0.14 + 0.06 * Math.sin(a * 3));
  // the Subway sign's lamp, and a draught of warm light up the stairs when a train is in
  lit(() => r(SUB.x + 38, SUB.y - 70, 6, 5, [255, 240, 200])); Gd(SUB.x + 41, SUB.y - 68, 10, [255, 240, 200], 0.4); G(SUB.x - 26, SUB.y, 52, 26, [255, 230, 180], 0.08);
  // something glows green down the Crypt grate
  G(1098, 682, 44, 18, [124, 242, 208], 0.12 + 0.08 * Math.sin(a * 2)); lit(() => { for (let x = 1104; x < 1138; x += 5) if ((a * 2 + x * 0.3) % 3 < 0.6) r(x + 1, 690, 1, 2, [124, 242, 208]); });
  // cinema marquee: chasing bulbs around the board, and tonight's film
  const Cx = CINE, bw = Cx.x1 - Cx.x0 - 16;
  lit(() => {
    const step = Math.floor(a * 8);
    for (let i = 0; i < 40; i++) {
      const u = i / 40, per = 2 * (bw + 22), d = u * per;
      const [bx, by] = d < bw ? [Cx.x0 + 8 + d, Cx.top + 6] : d < bw + 22 ? [Cx.x1 - 8, Cx.top + 6 + (d - bw)] : d < 2 * bw + 22 ? [Cx.x1 - 8 - (d - bw - 22), Cx.top + 30] : [Cx.x0 + 8, Cx.top + 30 - (d - 2 * bw - 22)];
      r(Math.round(bx), Math.round(by), 2, 2, (i + step) % 3 === 0 ? K.GOLD : [120, 80, 40]);
    }
    txt('CINEMA', Cx.x0 + (Cx.x1 - Cx.x0) / 2 - tw('CINEMA', 2) / 2, Cx.top + 12, [255, 214, 120], 2);
    const s = 'NOW: ' + FILMS[currentFilm()].title; txt(s, Cx.x0 + (Cx.x1 - Cx.x0) / 2 - tw(s) / 2, Cx.top + 44, (a % 2) < 1.6 ? [255, 236, 170] : [200, 150, 90]);
  });
  G(Cx.x0, Cx.top - 4, Cx.x1 - Cx.x0, 40, [255, 200, 110], 0.22); G(Cx.door.x - 6, Cx.door.y - 4, Cx.door.w + 12, Cx.door.h, [255, 180, 120], 0.1);
  // twinkles + blinking city windows
  if (day < 0.5) lit(() => { for (let i = 0; i < 30; i++) if ((a * 0.7 + h1(i + 40)) % 1 < 0.2) r(Math.floor(h1(i * 9.3) * W), Math.floor(h1(i * 4.7) * 300), 1, 1, [230, 235, 255]); });
  if (day < 0.5) for (let i = 0; i < CWIN.length; i += 7) { const [x, y, w, h, c] = CWIN[i]; if ((a * 0.05 + h1(i * 0.37)) % 1 < 0.06) r(x, y, w, h, shade(c, 1.04)); }
  // searchlights
  for (const [bx, ph] of [[180, 0], [1100, 2]] as [number, number][]) { const an = -Math.PI / 2 + 0.42 * Math.sin(a * 0.45 + ph); Gline(bx, 500, bx + Math.cos(an) * 620, 500 + Math.sin(an) * 620, [150, 190, 255], 0.07, 34); Gline(bx, 500, bx + Math.cos(an) * 620, 500 + Math.sin(an) * 620, [200, 225, 255], 0.06, 10); }
  // tower beacon + warm window
  lit(() => { r(592, 0, 2, 2, a % 1.2 < 0.5 ? [255, 70, 80] : [90, 20, 30]); for (let y = 85; y < 103; y++) r(579, y, 22, 1, M([255, 214, 140], [255, 160, 90], (y - 85) / 18)); });
  G(574, 80, 32, 28, [255, 200, 120], 0.28);
  // LAB neon over the door (it flickers, like the original sign)
  const fl = (a * 7) % 1 < 0.06 || ((a * 0.37) % 1 < 0.03);
  lit(() => { txt('THE LAB', 62 - tw('THE LAB', 2) / 2, 458, fl ? [120, 70, 50] : [255, 158, 100], 2); });
  if (!fl) G(34, 452, 56, 22, [255, 140, 80], 0.3);
  lit(() => { r(98, 522, 36, 18, [40, 44, 70]); if ((a * 0.3) % 1 < 0.7) r(100, 524, 8, 6, [255, 210, 120]); });
  // installations
  const sh = (period: number, off: number) => { const u = ((a + off) % period) / 0.6; return u < 1 ? u : -1; };
  placeCreation(CASTLE, CASTLE_AT[0], CASTLE_AT[1], sh(7, 0));
  placeCreation(COASTER, COASTER_AT[0], COASTER_AT[1], sh(9, 3));
  { // the coaster car loops forever
    const P = COASTER.path, len = P.length, pos = a * 20, i0 = Math.floor(pos) % len;
    lit(() => {
      for (let j = 3; j < 9; j += 2) { const q = P[(i0 - j + len) % len]; if ((a * 8 + j) % 1 < 0.6) r(COASTER_AT[0] + q.x * VS + 2, COASTER_AT[1] - (q.y + 2) * VS + 2, 1, 1, j < 5 ? K.WHITE : K.GOLD); }
      for (let j = 0; j < 2; j++) { const q = P[(i0 - j + len) % len], X = COASTER_AT[0] + q.x * VS, Y = COASTER_AT[1] - (q.y + 2) * VS; r(X, Y, VS, VS, [255, 214, 90]); r(X, Y, VS, 1, [255, 240, 170]); r(X + 1, Y - 3, 3, 3, [90, 209, 255]); }
    });
    const q = P[i0]; Gd(COASTER_AT[0] + q.x * VS + 3, COASTER_AT[1] - (q.y + 2) * VS + 3, 8, [255, 214, 90], 0.35);
  }
  const ds = dragonState(a);
  placeCreation(DRAGON[ds], DRAGON_AT[0], DRAGON_AT[1], ds === 'up' ? sh(11, 6) : -1);
  Gd(DRAGON_AT[0] + 24 * VS, DRAGON_AT[1] - 9 * VS, 8, [255, 236, 120], 0.6);
  // soft coloured floodlights on each installation
  G(CASTLE_AT[0] - 10, GROUND - 100, 150, 100, [95, 231, 255], 0.06);
  G(COASTER_AT[0] - 10, GROUND - 110, 200, 110, [255, 95, 210], 0.06);
  G(DRAGON_AT[0] - 16, GROUND - 90, 200, 90, [255, 214, 90], 0.06);
}

// ---- things you can use (index = network id: append only) ----
const benchSeats = (x: number, y: number): Spot[] => [-14, 14].map((dx) => ({ kind: 'sit', x: x + dx, y: y + 1, sx: x + dx, sy: y + 10, lift: 6, label: 'SIT', area: { x0: x - 32, y0: y - 24, x1: x + 32, y1: y } }));
/** Coins you can pick up (server-owned tokens: see supabase/migrations/0003_tokens.sql). Index = coin id 0..5. */
export const COINS: [number, number][] = [[330, 640], [512, 700], [1110, 610], [690, 668], [250, 600], [880, 700]];
export const PLAZA_SPOTS: Spot[] = [...benchSeats(422, 642), ...benchSeats(902, 654),
  { kind: 'party', game: 'tag', x: 660, y: 600, sx: 660, sy: 600, lift: 0, label: 'PLAY TAG', area: { x0: 646, y0: 548, x1: 674, y1: 590 } }, // 4
  { kind: 'party', game: 'hide', x: 112, y: 624, sx: 112, sy: 624, lift: 0, label: 'HIDE & SEEK', area: { x0: 90, y0: 572, x1: 134, y1: 612 } }]; // 5

// ---- standing props ----
const lampPost = (x: number, y: number): Prop => ({
  y,
  draw(a: number) {
    r(x - 4, y - 4, 9, 4, K.STEEL_POST); r(x - 1, y - 78, 3, 74, K.STEEL_POST); r(x - 1, y - 78, 1, 74, [80, 90, 130]);
    r(x - 6, y - 84, 13, 6, [30, 34, 56]); r(x - 5, y - 86, 11, 2, [50, 56, 90]);
    const f = (a * 0.13 + h1(x)) % 1 < 0.01 ? 0.3 : 1;
    lit(() => r(x - 4, y - 78, 9, 3, M([60, 50, 30], [255, 230, 170], f)));
    Gd(x, y - 76, 14, [255, 220, 150], 0.5 * f);
    for (let k = 0; k < 8; k++) G(x - 3 - k * 4, y - 74 + k * 9, 7 + k * 8, 9, [255, 220, 160], 0.035 * f);
    G(x - 36, y - 6, 72, 12, [255, 220, 150], 0.12 * f);
  },
});
const bench = (x: number, y: number): Prop => ({
  y,
  draw() {
    const w = 64;
    r(x - w / 2, y - 22, w, 3, K.WOOD); r(x - w / 2, y - 22, w, 1, K.WOOD_HI); r(x - w / 2, y - 17, w, 3, K.WOOD); r(x - w / 2, y - 17, w, 1, K.WOOD_HI);
    r(x - w / 2, y - 10, w, 4, K.WOOD_HI); r(x - w / 2, y - 7, w, 2, K.WOOD);
    for (const lx of [x - w / 2 + 4, x + w / 2 - 7]) { r(lx, y - 22, 3, 22, [30, 34, 56]); r(lx - 1, y - 1, 5, 1, [30, 34, 56]); }
  },
});
const tagSign: Prop = {
  y: 588,
  draw(a: number) {
    const x = 660, y = 588;
    r(x - 1, y - 30, 3, 30, K.STEEL_POST); r(x - 12, y - 40, 24, 14, [30, 34, 56]); r(x - 11, y - 39, 22, 12, [240, 236, 220]);
    lit(() => txt('TAG!', x - tw('TAG!') / 2, y - 36, (a % 1.2) < 0.7 ? K.RED : [255, 140, 90]));
  },
};
/** HIDE & SEEK: a signboard by the Lab door (starts a round across every room). */
const hideSign: Prop = {
  y: 612,
  draw(a: number) {
    const x = 112, y = 612;
    r(x - 1, y - 26, 3, 26, K.STEEL_POST); r(x - 20, y - 42, 40, 18, [30, 34, 56]); r(x - 19, y - 41, 38, 16, [240, 236, 220]);
    lit(() => { txt('HIDE &', x - tw('HIDE &') / 2, y - 39, (a % 2) < 1.4 ? [123, 97, 255] : [180, 160, 255]); txt('SEEK', x - tw('SEEK') / 2, y - 32, [123, 97, 255]); });
    if ((a * 0.5) % 1 < 0.5) r(x + 14, y - 38, 2, 2, [255, 214, 90]);
  },
};
const bin = (x: number, y: number): Prop => ({
  y,
  draw() { r(x - 6, y - 16, 12, 16, [46, 90, 70]); r(x - 7, y - 18, 14, 3, [60, 110, 86]); for (let k = 0; k < 3; k++) r(x - 4 + k * 4, y - 13, 1, 11, [36, 70, 56]); },
});

export function makePlaza(): Room {
  const room: Room = {
    id: 'plaza', title: 'THE SQUARE', sub: 'OUTSIDE',
    w: W, h: H,
    floor: { x0: 10, y0: 570, x1: W - 10, y1: 712 },
    blockers: [
      { x0: 156, y0: 568, x1: 166, y1: 578 }, { x0: 516, y0: 568, x1: 526, y1: 578 }, { x0: 696, y0: 568, x1: 706, y1: 578 }, { x0: 1056, y0: 568, x1: 1066, y1: 578 },
      { x0: 392, y0: 636, x1: 452, y1: 646 }, { x0: 872, y0: 648, x1: 932, y1: 658 },
      { x0: 604, y0: 598, x1: 616, y1: 606 },
      { x0: 654, y0: 582, x1: 666, y1: 590 }, // tag sign
      { x0: 106, y0: 606, x1: 118, y1: 614 }, // hide & seek sign
      { x0: 730, y0: 668, x1: 736, y1: 712 }, { x0: 784, y0: 668, x1: 790, y1: 712 }, { x0: 798, y0: 666, x1: 804, y1: 674 }, // subway railings + sign post
      { x0: 156, y0: 668, x1: 162, y1: 712 }, { x0: 210, y0: 668, x1: 216, y1: 712 }, { x0: 224, y0: 668, x1: 230, y1: 676 }, // stairwell railings + sign post
    ],
    doors: [
      { trigger: { x0: 42, y0: 570, x1: 82, y1: 578 }, to: 'lab', arrive: { x: 30, y: 456 }, label: 'THE LAB', area: { x0: 34, y0: 448, x1: 90, y1: 576 } },
      { trigger: { x0: 1184, y0: 600, x1: 1194, y1: 712 }, edge: true, to: 'pier', arrive: { x: 40, y: 620 }, label: 'PIER', area: { x0: 1168, y0: 580, x1: 1200, y1: 712 } },
      { trigger: { x0: 578, y0: 570, x1: 608, y1: 578 }, to: 'stage', arrive: { x: 40, y: 500 }, label: 'STAGE', area: { x0: 572, y0: 494, x1: 614, y1: 576 } },
      { trigger: { x0: 1102, y0: 684, x1: 1138, y1: 694 }, to: 'crypt', arrive: { x: 40, y: 470 }, label: 'CRYPT', area: { x0: 1096, y0: 648, x1: 1172, y1: 698 } },
      { trigger: { x0: 742, y0: 686, x1: 778, y1: 702 }, edge: true, to: 'subway', arrive: { x: 60, y: 640 }, label: 'SUBWAY', area: { x0: 730, y0: 612, x1: 810, y1: 708 } },
      { trigger: { x0: 168, y0: 684, x1: 204, y1: 700 }, edge: true, to: 'arcade', arrive: { x: 90, y: 500 }, label: 'ARCADE', area: { x0: 158, y0: 618, x1: 256, y1: 706 } },
      { trigger: { x0: 426, y0: 570, x1: 462, y1: 578 }, to: 'cinema', arrive: { x: 62, y: 462 }, label: 'CINEMA', area: { x0: 420, y0: 500, x1: 468, y1: 576 } },
    ],
    spots: PLAZA_SPOTS, inUse: new Map(),
    spawn: { x: 300, y: 620 },
    dim: 0.1,
    fillTop: 'rgb(6,10,28)', fillLow: 'rgb(38,43,74)',
    bg: mk(W, H), bgAlt: mk(W, H),
    build: () => build.call(room),
    dimNow: () => 0.1 * (1 - dayness()),
    altAlpha: dayness,
    glowMul: () => 1 - 0.75 * dayness(),
    drawBack,
    props: [lampPost(161, 574), lampPost(521, 574), lampPost(701, 574), lampPost(1061, 574), bench(422, 642), bench(902, 654), bin(610, 604), tagSign, hideSign],
  };
  return room;
}
