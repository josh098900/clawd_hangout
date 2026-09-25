// THE PIER — walk off the right edge of the Square and you're on the beach. A pier runs out
// into the sea (fish off the end of it), a bonfire burns on the sand with logs to sit on and
// marshmallows to roast, a lighthouse sweeps the water, and crabs scuttle about. The sky and
// sea follow the Square's day/night loop.

import { K, DK, PK } from '../engine/palette';
import { PX, mk, r, line, disc, oval, txt, tw, alpha, lit, G, Gd, Gline, withCtx, M, shade } from '../engine/pixel';
import { h1 } from '../engine/math';
import { dayness } from './plaza';
import type { Room, Prop, Spot } from './room';
import { scoreboard } from './contest';

const W = 1300, H = 720, HORIZON = 380, SHORE = 548;
const PIER = { x0: 700, x1: 760, y0: 420 };
export const PIER_FIRE = { x: 380, y: 630 };
const MOON_X = 980;

// ---------- the set ----------
function paint(ctx: CanvasRenderingContext2D, day: boolean): void {
  withCtx(ctx, () => {
    PX.dim = 0; PX.fl = 0; PX.emit = false;
    const S0 = day ? DK.SKY0 : K.SKY0, S1 = day ? DK.SKY1 : K.SKY1, S2 = day ? DK.SKY2 : K.SKY2;
    for (let y = 0; y < HORIZON; y += 4) { const u = y / HORIZON; r(0, y, W, 4, u < 0.6 ? M(S0, S1, u / 0.6) : M(S1, S2, (u - 0.6) / 0.4)); }
    if (!day) { for (let i = 0; i < 200; i++) r(Math.floor(h1(i * 6.1) * W), Math.floor(h1(i * 3.3) * (HORIZON - 40)), 1, 1, h1(i) > 0.8 ? [220, 225, 255] : [120, 130, 180]); for (let dy = -14; dy <= 14; dy++) { const w = Math.floor(Math.sqrt(196 - dy * dy)); r(MOON_X - w, 120 + dy, 2 * w + 1, 1, [240, 240, 220]); } }
    else { for (let dy = -16; dy <= 16; dy++) { const w = Math.floor(Math.sqrt(256 - dy * dy)); r(MOON_X - w, 140 + dy, 2 * w + 1, 1, DK.SUN); } for (let i = 0; i < 7; i++) { const x = 40 + Math.floor(h1(i * 2.2 + 7) * 1200), y = 60 + Math.floor(h1(i * 4.1 + 2) * 180); r(x, y, 34, 6, DK.CLOUD); r(x + 8, y - 4, 18, 4, DK.CLOUD); } }
    // sea: deeper toward the horizon
    for (let y = HORIZON; y < SHORE; y += 4) { const u = (y - HORIZON) / (SHORE - HORIZON); r(0, y, W, 4, day ? M([70, 140, 200], [110, 180, 220], u) : M(PK.SEA0, PK.SEA2, u)); }
    r(0, HORIZON, W, 1, day ? [200, 230, 250] : [60, 80, 130]);
    // the lighthouse on its rocks, far right
    for (let k = 0; k < 7; k++) oval(1180 + k * 14 - 40, 404 + (k % 2) * 4, 22, 10, k % 2 ? PK.ROCK : PK.ROCK_HI);
    for (let y = 250; y < 400; y++) { const w = 12 + Math.floor((y - 250) / 12); r(1180 - w, y, w * 2, 1, Math.floor((y - 250) / 30) % 2 ? PK.LIGHT_RED : PK.LIGHT); }
    r(1164, 232, 32, 18, [40, 44, 52]); r(1160, 228, 40, 5, [60, 64, 72]); r(1170, 222, 20, 7, [40, 44, 52]);
    // the pier: posts in the water, then planks all the way to the sand
    for (let y = PIER.y0; y < SHORE + 8; y += 26) for (const px of [PIER.x0 + 2, PIER.x1 - 6]) { r(px, y + 4, 4, 22, PK.WOOD_DK); }
    for (let y = PIER.y0; y < SHORE + 10; y += 5) { r(PIER.x0, y, PIER.x1 - PIER.x0, 4, PK.WOOD); r(PIER.x0, y, PIER.x1 - PIER.x0, 1, PK.WOOD_HI); r(PIER.x0, y + 4, PIER.x1 - PIER.x0, 1, PK.WOOD_DK); }
    for (const px of [PIER.x0 - 2, PIER.x1]) { r(px, PIER.y0 - 14, 2, SHORE - PIER.y0 + 10, PK.WOOD_DK); for (let y = PIER.y0 - 14; y < SHORE; y += 26) r(px - 1, y, 4, 4, PK.WOOD_HI); }
    // sand
    r(0, SHORE, W, H - SHORE, PK.SAND); r(0, SHORE, W, 10, PK.WET);
    for (let i = 0; i < 1400; i++) r(Math.floor(h1(i * 1.7) * W), SHORE + 10 + Math.floor(h1(i * 2.9) * (H - SHORE - 10)), 1, 1, h1(i) > 0.5 ? PK.SAND2 : PK.SAND_DK);
    for (let i = 0; i < 12; i++) { const x = Math.floor(h1(i * 9.1) * W), y = SHORE + 20 + Math.floor(h1(i * 4.4) * 140); r(x, y, 3, 2, h1(i) > 0.5 ? [240, 220, 230] : [230, 200, 160]); } // shells
    txt('<- SQUARE', 20, SHORE + 12, PK.SAND_DK);
  });
}
function build(this: Room): void { paint(this.bg.getContext('2d')!, false); if (this.bgAlt) paint(this.bgAlt.getContext('2d')!, true); }

// ---------- animated set pieces ----------
function drawBack(a: number): void {
  const day = dayness(), night = 1 - day;
  if (day > 0.01 && day < 0.99) alpha(0.25 * Math.sin(Math.PI * day), () => r(0, 0, W, SHORE, [255, 140, 90]));
  // waves: light streaks drifting on the water, and the moon's shimmering path
  for (let k = 0; k < 60; k++) { const y = HORIZON + 6 + Math.floor(h1(k) * (SHORE - HORIZON - 12)), x = (h1(k + 1) * W + a * (8 + (y - HORIZON) * 0.15)) % (W + 40) - 20, w = 6 + Math.floor((y - HORIZON) / 12); r(Math.round(x), y, w, 1, day ? [200, 230, 250] : [60, 90, 150]); }
  if (night > 0.3) lit(() => { for (let y = HORIZON + 4; y < SHORE - 4; y += 3) { const w = 4 + Math.floor((y - HORIZON) / 8) + Math.round(Math.sin(a * 3 + y) * 3); if ((y + Math.floor(a * 8)) % 2) r(MOON_X - w, y, w * 2, 1, M([60, 80, 130], [230, 230, 210], 0.6 * night)); } });
  // foam lapping the shore
  const lap = Math.sin(a * 0.9) * 5;
  lit(() => { for (let x = 0; x < W; x += 3) r(x, Math.round(SHORE - 2 + lap + Math.sin(x * 0.05 + a * 2) * 2), 3, 1, day ? K.WHITE : PK.FOAM); });
  // lighthouse: the lamp and its sweeping beam
  const an = a * 0.7, on = (Math.cos(an) + 1) / 2;
  lit(() => r(1170, 234, 20, 12, M([255, 220, 150], [255, 255, 230], on)));
  Gd(1180, 240, 24, [255, 240, 180], 0.4 + 0.3 * on);
  const bx = 1180 + Math.cos(an) * 700, by = 240 + Math.sin(an) * 60;
  Gline(1180, 240, bx, by, [255, 245, 200], 0.08 * (0.4 + night), 40); Gline(1180, 240, bx, by, [255, 250, 220], 0.1 * (0.4 + night), 10);
}

// ---------- props ----------
const bonfire: Prop = {
  y: PIER_FIRE.y + 4,
  draw(a: number) {
    const { x, y } = PIER_FIRE;
    for (let k = 0; k < 9; k++) { const an = (k / 9) * 6.283; oval(Math.round(x + Math.cos(an) * 16), Math.round(y + Math.sin(an) * 5), 4, 3, k % 2 ? PK.ROCK : PK.ROCK_HI); }
    line(x - 10, y + 2, x + 10, y - 6, PK.LOG, 3); line(x - 10, y - 6, x + 10, y + 2, PK.LOG, 3);
    lit(() => { for (let k = 0; k < 7; k++) { const h = 10 + Math.round(Math.sin(a * 9 + k * 1.7) * 4 + h1(k) * 8), fx = x - 9 + k * 3; r(fx, y - 4 - h, 3, h, k % 2 ? PK.FIRE : PK.FIRE_HI); } for (let k = 0; k < 5; k++) { const ph = (a * 0.8 + k / 5) % 1; alpha(1 - ph, () => r(Math.round(x - 4 + Math.sin(a * 3 + k) * 6), Math.round(y - 20 - ph * 40), 1, 1, PK.FIRE_HI)); } });
    Gd(x, y - 12, 60, [255, 150, 60], 0.28); Gd(x, y - 12, 26, [255, 200, 110], 0.4); G(x - 90, y - 20, 180, 60, [255, 150, 70], 0.06);
  },
};
const log = (x: number, y: number): Prop => ({ y, draw() { r(x - 24, y - 8, 48, 8, PK.LOG); r(x - 24, y - 8, 48, 2, M(PK.LOG, K.WHITE, 0.25)); oval(x - 24, y - 4, 3, 4, PK.TRUNK); oval(x + 24, y - 4, 3, 4, PK.TRUNK); } });
const palm = (x: number, y: number): Prop => ({
  y,
  draw(a: number) {
    for (let k = 0; k < 60; k++) { const u = k / 60; r(Math.round(x + Math.sin(u * 1.4) * 14), y - k * 2, 6, 3, k % 4 ? PK.TRUNK : shade(PK.TRUNK, 0.8)); }
    const tx = Math.round(x + Math.sin(1.4) * 14) + 3, ty = y - 120;
    for (let f = 0; f < 6; f++) { const an = -Math.PI / 2 + (f / 5 - 0.5) * 3 + Math.sin(a * 0.8 + f) * 0.05; for (let j = 0; j < 30; j++) r(Math.round(tx + Math.cos(an) * j), Math.round(ty + Math.sin(an) * j + (j * j) / 30), 3, 2, j > 18 ? PK.PALM : PK.PALM_DK); }
    disc(tx - 3, ty + 4, 3, [110, 80, 40]); disc(tx + 3, ty + 5, 3, [100, 72, 36]);
  },
});
const cooler: Prop = { y: 640, draw() { const x = 470, y = 640; r(x - 14, y - 16, 28, 16, [70, 130, 200]); r(x - 14, y - 16, 28, 4, K.WHITE); r(x - 8, y - 26, 16, 10, PK.MARSH); r(x - 8, y - 26, 16, 1, [220, 216, 200]); txt('MARSH', x - tw('MARSH') / 2, y - 10, K.WHITE); } };

// ---------- spots (index = network id: append only) ----------
export const PIER_SPOTS: Spot[] = [
  { kind: 'fish', x: 712, y: 434, sx: 712, sy: 434, lift: 0, label: 'FISH', area: { x0: 700, y0: 400, x1: 730, y1: 440 } },
  { kind: 'fish', x: 748, y: 434, sx: 748, sy: 434, lift: 0, label: 'FISH', area: { x0: 730, y0: 400, x1: 760, y1: 440 } },
  ...([[340, 609], [420, 609], [340, 661], [420, 661]] as [number, number][]).map(([x, y]): Spot => ({ kind: 'sit', x, y, sx: x, sy: y < 630 ? y - 14 : y + 10, lift: 6, label: 'SIT', area: { x0: x - 24, y0: y - 16, x1: x + 24, y1: y } })),
  { kind: 'marsh', x: 470, y: 652, sx: 470, sy: 652, lift: 0, label: 'MARSHMALLOW', area: { x0: 454, y0: 610, x1: 486, y1: 640 } },
];

export function makePier(): Room {
  const room: Room = {
    id: 'pier', title: 'THE PIER', sub: 'BEACH',
    w: W, h: H,
    floor: { x0: 14, y0: 424, x1: W - 14, y1: 690 },
    blockers: [
      { x0: 0, y0: 400, x1: PIER.x0 + 4, y1: SHORE + 4 }, { x0: PIER.x1 - 4, y0: 400, x1: W, y1: SHORE + 4 }, // the sea either side of the pier
      { x0: 366, y0: 624, x1: 394, y1: 636 }, // fire
      { x0: 316, y0: 600, x1: 364, y1: 610 }, { x0: 396, y0: 600, x1: 444, y1: 610 }, { x0: 316, y0: 652, x1: 364, y1: 662 }, { x0: 396, y0: 652, x1: 444, y1: 662 }, // logs
      { x0: 456, y0: 632, x1: 484, y1: 642 }, // cooler
      { x0: 116, y0: 572, x1: 132, y1: 580 }, { x0: 1016, y0: 612, x1: 1032, y1: 620 }, // palms
    ],
    doors: [{ trigger: { x0: 6, y0: 556, x1: 16, y1: 690 }, edge: true, to: 'plaza', arrive: { x: 1168, y: 640 }, label: 'SQUARE', area: { x0: 0, y0: 548, x1: 30, y1: 700 } }],
    spots: PIER_SPOTS, inUse: new Map(),
    spawn: { x: 60, y: 620 },
    dim: 0.12,
    dimNow: () => 0.12 * (1 - dayness()),
    altAlpha: dayness,
    glowMul: () => 1 - 0.6 * dayness(),
    fillTop: 'rgb(6,10,28)', fillLow: 'rgb(200,168,120)',
    bg: mk(W, H), bgAlt: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [bonfire, log(340, 608), log(420, 608), log(340, 660), log(420, 660), palm(124, 580), palm(1024, 620), cooler, scoreboard],
  };
  return room;
}
