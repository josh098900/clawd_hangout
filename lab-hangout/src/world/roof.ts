// THE ROOFTOP GARDEN — up the ladder from the Dev Den. The film's garden of topiaries,
// replanted in planters on a roof deck: a hedge bunny, a swan and a little dragon. String
// lights, hammocks, a telescope (a constellation game) and a fireworks crate anyone can light.
// The sky shares the Square's day/night loop; fireworks go off by themselves on the hour.

import { K, DK, RK, CONFETTI } from '../engine/palette';
import { PX, mk, r, line, disc, txt, tw, alpha, lit, Gd, withCtx, M, shade } from '../engine/pixel';
import { h1 } from '../engine/math';
import { dayness } from './plaza';
import type { StateMsg } from '../net/transport';
import type { Room, Prop, Spot } from './room';

const W = 1100, H = 700, SKYLINE = 400, LEDGE = 440;
const HUT = { x: 12, y: 332, w: 84, h: LEDGE + 10 - 332 };
const HUT_DOOR = { x: 34, y: 366, w: 36, h: 84 };
const POLES = [150, 470, 790, 1050];
export const ROOF_INFO = { fw: null as { t0: number; seed: number } | null };

/** Fireworks: the latest one someone lit, or the automatic show for the first minute of every hour. */
export function showStart(): { t0: number; seed: number } | null {
  const now = Date.now() / 1000, hour = Math.floor(now / 3600) * 3600;
  if (now - hour < 60) return { t0: hour, seed: hour % 997 };
  const f = ROOF_INFO.fw;
  return f && now - f.t0 < 9 ? f : null;
}
// bursts sit just above the skyline: that's the band of sky you can see from the deck
const burstAt = (seed: number, k: number) => ({ x: 140 + h1(seed + k * 7.1) * 820, y: 332 + h1(seed * 3 + k) * 60, c: CONFETTI[Math.floor(h1(seed + k * 2.3) * CONFETTI.length)], t: k * 0.7 + h1(seed + k) * 0.4 });

// ---------- the set (two backdrops: night and day) ----------
function paint(ctx: CanvasRenderingContext2D, day: boolean): void {
  withCtx(ctx, () => {
    PX.dim = 0; PX.fl = 0; PX.emit = false;
    const S0 = day ? DK.SKY0 : K.SKY0, S1 = day ? DK.SKY1 : K.SKY1, S2 = day ? DK.SKY2 : K.SKY2;
    for (let y = 0; y < LEDGE; y += 4) { const u = y / LEDGE; r(0, y, W, 4, u < 0.6 ? M(S0, S1, u / 0.6) : M(S1, S2, (u - 0.6) / 0.4)); }
    if (!day) { for (let i = 0; i < 160; i++) r(Math.floor(h1(i * 5.3) * W), Math.floor(h1(i * 2.9) * 300), 1, 1, h1(i) > 0.8 ? [210, 220, 255] : [120, 130, 180]); for (let dy = -10; dy <= 10; dy++) { const w = Math.floor(Math.sqrt(100 - dy * dy)); r(880 - w, 70 + dy, 2 * w + 1, 1, [236, 236, 214]); } }
    else { for (let dy = -12; dy <= 12; dy++) { const w = Math.floor(Math.sqrt(144 - dy * dy)); r(880 - w, 80 + dy, 2 * w + 1, 1, DK.SUN); } for (let i = 0; i < 6; i++) { const x = 60 + Math.floor(h1(i * 4.4 + 1) * 980), y = 50 + Math.floor(h1(i * 3.7) * 150); r(x, y, 30, 5, DK.CLOUD); r(x + 6, y - 3, 16, 3, DK.CLOUD); } }
    // the city from up here: a low skyline behind the ledge
    for (let x = 0; x < W;) {
      const w = 26 + Math.floor(h1(x * 0.41) * 40), top = SKYLINE - 10 - Math.floor(h1(x * 0.77) * 70);
      r(x, top, w, LEDGE - top, day ? DK.CITY1 : K.CITY1); r(x, top, w, 2, day ? DK.CITY2 : K.CITY2);
      for (let wy = top + 6; wy < LEDGE - 4; wy += 8) for (let wx = x + 4; wx < x + w - 4; wx += 7) if (h1(wx * 1.9 + wy) > 0.6) r(wx, wy, 2, 3, day ? DK.WIN : h1(wx + wy * 2) > 0.8 ? shade(K.WIN_B, 0.8) : shade(K.WIN_Y, 0.8));
      x += w + 2;
    }
    // the ledge (parapet) and the deck
    r(0, LEDGE, W, 14, RK.PARAPET); r(0, LEDGE, W, 2, RK.PARAPET_HI); r(0, LEDGE + 12, W, 2, RK.PARAPET_DK); for (let x = 0; x < W; x += 24) r(x, LEDGE + 2, 1, 10, RK.PARAPET_DK);
    r(0, LEDGE + 14, W, H - LEDGE - 14, RK.GRAVEL); for (let i = 0; i < 900; i++) r(Math.floor(h1(i * 1.3) * W), LEDGE + 14 + Math.floor(h1(i * 2.1) * (H - LEDGE - 14)), 1, 1, RK.GRAVEL2);
    r(120, LEDGE + 30, 900, 190, RK.DECK); for (let y = LEDGE + 30; y < LEDGE + 220; y += 6) r(120, y, 900, 1, RK.DECK_LN); for (let y = LEDGE + 30, j = 0; y < LEDGE + 220; y += 6, j++) for (let x = 120 + (j % 3) * 40; x < 1020; x += 120) r(x, y, 1, 6, RK.DECK_LN);
    alpha(0.4, () => r(0, LEDGE + 14, W, 3, [20, 16, 12]));
    // the access hut + door down to the Den
    const Hh = HUT; r(Hh.x, Hh.y, Hh.w, Hh.h, RK.HUT); r(Hh.x, Hh.y, Hh.w, 3, RK.HUT_HI); r(Hh.x - 4, Hh.y - 6, Hh.w + 8, 7, RK.HUT_DK); r(Hh.x + Hh.w - 4, Hh.y + 3, 4, Hh.h - 3, RK.HUT_DK);
    const D = HUT_DOOR; r(D.x - 2, D.y - 2, D.w + 4, D.h + 2, RK.HUT_DK); r(D.x, D.y, D.w, D.h, [110, 84, 60]); r(D.x, D.y, D.w, 2, [140, 108, 78]); r(D.x + 28, D.y + 40, 3, 6, K.GOLD);
    r(D.x - 2, D.y - 16, D.w + 4, 10, [30, 34, 44]); txt('DEN', D.x + D.w / 2 - tw('DEN') / 2 + 3, D.y - 14, [200, 225, 255]); r(D.x + 4, D.y - 13, 3, 5, [200, 225, 255]);
    // flower planters along the ledge
    for (let x = 140; x < 1040; x += 110) { r(x, LEDGE + 16, 60, 14, RK.PLANTER); r(x, LEDGE + 16, 60, 2, RK.PLANTER_HI); for (let k = 0; k < 9; k++) { const fx = x + 3 + k * 6 + Math.floor(h1(x + k) * 3); r(fx, LEDGE + 8 + Math.floor(h1(x * k + 1) * 4), 2, 9, RK.HEDGE); r(fx - 1, LEDGE + 6 + Math.floor(h1(x * k + 1) * 4), 4, 3, CONFETTI[Math.floor(h1(x * 3 + k) * CONFETTI.length)]); } }
  });
}
function build(this: Room): void { paint(this.bg.getContext('2d')!, false); if (this.bgAlt) paint(this.bgAlt.getContext('2d')!, true); }

// ---------- animated set pieces ----------
function drawBack(a: number): void {
  const day = dayness(), night = 1 - day;
  if (day > 0.01 && day < 0.99) alpha(0.25 * Math.sin(Math.PI * day), () => r(0, 0, W, LEDGE, [255, 140, 90]));
  if (day < 0.5) lit(() => { for (let i = 0; i < 24; i++) if ((a * 0.6 + h1(i + 70)) % 1 < 0.25) r(Math.floor(h1(i * 5.3) * W), Math.floor(h1(i * 2.9) * 300), 1, 1, K.WHITE); });
  // string lights sagging between the poles
  for (let p = 0; p < POLES.length - 1; p++) {
    const x0 = POLES[p], x1 = POLES[p + 1];
    for (let k = 0; k <= 30; k++) { const u = k / 30, x = x0 + (x1 - x0) * u, y = 330 + Math.sin(u * Math.PI) * 26; r(Math.round(x), Math.round(y), 1, 1, [40, 36, 30]);
      if (k % 3 === 1) { const c = CONFETTI[(k + p * 5) % CONFETTI.length], on = (a * 1.5 + k * 0.13) % 3 > 0.2; lit(() => r(Math.round(x) - 1, Math.round(y) + 1, 3, 3, on ? M(c, [255, 255, 255], 0.4) : shade(c, 0.5))); if (on) Gd(x, y + 2, 5, c, 0.18 + 0.2 * night); } }
  }
  // fireflies at night, butterflies by day
  for (let i = 0; i < 10; i++) {
    const x = 160 + ((h1(i) * 840 + Math.sin(a * 0.4 + i) * 60) % 840), y = LEDGE + 20 + Math.sin(a * 0.7 + i * 2) * 20 + h1(i + 3) * 120;
    if (night > 0.3) { if ((a * 0.8 + h1(i + 9)) % 2 < 1.2) { lit(() => r(Math.round(x), Math.round(y), 1, 1, [220, 255, 140])); Gd(x, y, 4, [200, 255, 120], 0.4 * night); } }
    else if (i < 5) { const f = Math.floor(a * 10 + i) % 2, c = CONFETTI[i % CONFETTI.length]; r(Math.round(x) - 2, Math.round(y) - f, 2, 2 - f, c); r(Math.round(x) + 1, Math.round(y) - f, 2, 2 - f, c); r(Math.round(x), Math.round(y), 1, 2, [40, 30, 30]); }
  }
  // fireworks
  const show = showStart();
  if (show) {
    const u = Date.now() / 1000 - show.t0, n = u > 9 ? 90 : 8;
    lit(() => {
      for (let k = 0; k < n; k++) {
        const b = burstAt(show.seed + Math.floor(k / 8) * 13, k % 8), t = u - Math.floor(k / 8) * 7 - b.t;
        if (t < 0 || t > 2.6) continue;
        if (t < 0.9) { const q = t / 0.9, x = 540 + (b.x - 540) * q, y = 470 + (b.y - 470) * (1 - (1 - q) * (1 - q)); r(Math.round(x), Math.round(y), 1, 3, [255, 230, 170]); r(Math.round(x), Math.round(y) + 3, 1, 2, [255, 150, 80]); continue; }
        const s = t - 0.9, d = s * 75 * Math.exp(-s * 0.7), fade = 1 - s / 1.7, hot = M(b.c, [255, 255, 255], 0.45);
        if (s < 0.12) disc(Math.round(b.x), Math.round(b.y), 5, K.WHITE); // the pop
        alpha(fade, () => { for (let j = 0; j < 20; j++) { const an = (j / 20) * 6.283 + k, x = b.x + Math.cos(an) * d, y = b.y + Math.sin(an) * d + s * s * 14; r(Math.round(x) - 1, Math.round(y) - 1, 3, 3, j % 4 ? hot : K.WHITE); if (s < 0.9) r(Math.round(b.x + Math.cos(an) * d * 0.55), Math.round(b.y + Math.sin(an) * d * 0.55 + s * s * 8), 2, 2, b.c); } });
        if (s < 0.5) Gd(b.x, b.y, 55, b.c, 0.28 * (1 - s / 0.5)); Gd(b.x, b.y, 36, b.c, 0.22 * fade);
      }
    });
  }
  // hut lamp
  lit(() => r(HUT_DOOR.x + HUT_DOOR.w / 2 - 2, HUT_DOOR.y - 22, 4, 3, [255, 230, 170])); Gd(HUT_DOOR.x + HUT_DOOR.w / 2, HUT_DOOR.y - 20, 12, [255, 214, 150], 0.35 * (0.3 + night));
}

// ---------- props ----------
const pole = (x: number): Prop => ({ y: 470, draw() { r(x - 1, 326, 3, 144, RK.POLE); r(x - 4, 466, 9, 4, RK.POLE); r(x - 2, 324, 5, 3, [80, 70, 60]); } });
/** Topiaries: hedges clipped into shapes, in square planters. `shape` rows are hedge pixels at 2x. */
const topiary = (x: number, y: number, name: string, shape: string[]): Prop => ({
  y,
  draw(a: number) {
    r(x - 18, y - 16, 36, 16, RK.PLANTER); r(x - 18, y - 16, 36, 2, RK.PLANTER_HI); r(x + 14, y - 14, 4, 14, shade(RK.PLANTER, 0.8));
    const sw = Math.round(Math.sin(a * 0.9 + x) * 0.6), top = y - 16 - shape.length * 3;
    shape.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') r(x - row.length * 1.5 + i * 3 + (j < 4 ? sw : 0), top + j * 3, 3, 3, row[i] === 'h' ? RK.HEDGE_HI : row[i] === 'd' ? RK.HEDGE_DK : row[i] === 'e' ? K.EYE : row[i] === 'b' ? [230, 150, 60] : RK.HEDGE); });
    txt(name, x - tw(name) / 2, y - 11, [240, 220, 180]);
  },
});
const BUNNY = ['.hh..hh.', '.hg..gg.', '.gg..gd.', '.hggggg.', 'hggeggeg', 'gggggggd', '.gggggg.', 'hgggggggd', 'ggggggggd', '.ggggggd.', '..gg.gg..'];
const SWAN = ['..hh......', '.hge......', '.ggb......', '..gg......', '..gg......', '..gg...hhg', '..gghhhggg', '.hgggggggd', 'ggggggggd.', '.gggggggd.'];
const DRAGON = ['......hh.', '.....hgge', '.....ggggb', 'h...ggg...', 'gg.gggg...', '.gggggggd.', 'hggggggggd', '.gggggggd.', '..gg..gg..'];
const hammock = (x0: number, x1: number, y: number): Prop => ({
  y,
  draw(a: number) {
    for (const px of [x0, x1]) { r(px - 1, y - 40, 3, 40, RK.POLE); r(px - 3, y - 2, 7, 2, RK.POLE); }
    const sw = Math.sin(a * 1.2 + x0) * 1.5;
    for (let k = 0; k <= 20; k++) { const u = k / 20, x = x0 + (x1 - x0) * u, yy = y - 30 + Math.sin(u * Math.PI) * 18 + sw * Math.sin(u * Math.PI); r(Math.round(x), Math.round(yy), 1, 3, k % 2 ? RK.NET : RK.NET_DK); }
  },
});
const telescope: Prop = {
  y: 482,
  draw() { const x = 930, y = 482; line(x, y - 20, x - 8, y, RK.SCOPE_DK); line(x, y - 20, x + 8, y, RK.SCOPE_DK); line(x, y - 20, x, y, RK.SCOPE_DK); r(x - 12, y - 32, 22, 6, RK.SCOPE); r(x - 12, y - 32, 22, 1, K.WHITE); r(x + 8, y - 34, 6, 9, RK.SCOPE_DK); r(x - 14, y - 31, 3, 4, [40, 44, 52]); },
};
const crate: Prop = {
  y: 478,
  draw(a: number) {
    const x = 540, y = 478;
    r(x - 14, y - 16, 28, 16, RK.CRATE); r(x - 14, y - 16, 28, 2, [170, 110, 70]); r(x - 14, y - 9, 28, 1, RK.CRATE_DK); r(x - 1, y - 16, 2, 16, RK.CRATE_DK);
    for (let k = 0; k < 4; k++) { r(x - 10 + k * 6, y - 26, 3, 10, CONFETTI[k]); r(x - 10 + k * 6, y - 28, 3, 2, K.WHITE); }
    txt('BOOM', x - tw('BOOM') / 2, y - 7, [255, 214, 90]);
    lit(() => { if ((a % 1) < 0.5) r(x - 1, y - 31, 2, 2, [255, 140, 60]); });
  },
};
const bench: Prop = { y: 612, draw() { const x = 300, y = 612, w = 64; r(x - w / 2, y - 20, w, 3, K.WOOD); r(x - w / 2, y - 20, w, 1, K.WOOD_HI); r(x - w / 2, y - 10, w, 4, K.WOOD_HI); r(x - w / 2, y - 7, w, 2, K.WOOD); for (const lx of [x - 28, x + 25]) r(lx, y - 20, 3, 20, [60, 50, 40]); } };

// ---------- spots (index = network id: append only) ----------
export const ROOF_SPOTS: Spot[] = [
  { kind: 'hammock', x: 400, y: 521, sx: 400, sy: 532, lift: 16, label: 'HAMMOCK', area: { x0: 360, y0: 480, x1: 440, y1: 520 } },
  { kind: 'hammock', x: 660, y: 601, sx: 660, sy: 612, lift: 16, label: 'HAMMOCK', area: { x0: 620, y0: 560, x1: 700, y1: 600 } },
  { kind: 'scope', x: 930, y: 494, sx: 930, sy: 494, lift: 0, label: 'STARGAZE', area: { x0: 914, y0: 446, x1: 946, y1: 484 } },
  { kind: 'fireworks', x: 540, y: 490, sx: 540, sy: 490, lift: 0, label: 'FIREWORKS', area: { x0: 524, y0: 446, x1: 556, y1: 480 } },
  ...[-14, 14].map((dx): Spot => ({ kind: 'sit', x: 300 + dx, y: 613, sx: 300 + dx, sy: 622, lift: 6, label: 'SIT', area: { x0: 268, y0: 590, x1: 332, y1: 612 } })),
];

export function makeRoof(): Room {
  const room: Room = {
    id: 'roof', title: 'THE ROOFTOP', sub: 'GARDEN',
    w: W, h: H,
    floor: { x0: 14, y0: 462, x1: W - 14, y1: 650 },
    blockers: [
      { x0: 190, y0: 496, x1: 230, y1: 506 }, { x0: 800, y0: 476, x1: 840, y1: 486 }, { x0: 990, y0: 566, x1: 1030, y1: 576 }, // topiaries
      { x0: 522, y0: 470, x1: 558, y1: 480 }, { x0: 920, y0: 476, x1: 940, y1: 484 }, // crate, telescope
      { x0: 268, y0: 604, x1: 332, y1: 614 }, // bench
      ...[400, 660].flatMap((cx, i) => { const y = i ? 600 : 520; return [{ x0: cx - 42, y0: y - 4, x1: cx - 38, y1: y + 2 }, { x0: cx + 38, y0: y - 4, x1: cx + 42, y1: y + 2 }]; }),
      ...POLES.map((x) => ({ x0: x - 3, y0: 464, x1: x + 3, y1: 472 })),
    ],
    doors: [{ trigger: { x0: 34, y0: 462, x1: 70, y1: 470 }, to: 'den', arrive: { x: 270, y: 458 }, label: 'DEV DEN', area: { x0: 30, y0: 348, x1: 74, y1: 462 } }],
    spots: ROOF_SPOTS, inUse: new Map(),
    onState(s: StateMsg) { if (s.k === 'fw') ROOF_INFO.fw = s.v; },
    spawn: { x: 60, y: 480 },
    dim: 0.1,
    dimNow: () => 0.1 * (1 - dayness()),
    altAlpha: dayness,
    glowMul: () => 1 - 0.6 * dayness(),
    fillTop: 'rgb(6,10,28)', fillLow: 'rgb(90,94,106)',
    bg: mk(W, H), bgAlt: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [...POLES.map(pole), topiary(210, 506, 'BUN', BUNNY), topiary(820, 486, 'SWAN', SWAN), topiary(1010, 576, 'DRAGON', DRAGON), hammock(360, 440, 520), hammock(620, 700, 600), telescope, crate, bench],
  };
  return room;
}

