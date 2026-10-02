// SELJALANDSFOSS (step 19, push 2): the first stop on the tour bus. Outdoors on Iceland's clock. Left to right:
//   THE CAR PARK: the bus (it waits 20 s), the pay machine (PARKING 1000 KR), the brown sight sign, the seasonal coffee hut (KLEINUR)
//   THE FALLS: one long thin ribbon of water off the old sea cliff into its pool, the path looping BEHIND it (anyone on that path is
//     drawn behind the falling water), the spray (SOAKED), a rainbow on a sunny afternoon, floodlit after dark; a bench whose `watch`
//     frames the whole fall; the path shuts with a chain in a gale
//   ALONG THE CLIFF: moss and grass, sheep, the stream running out of a crack: GLJÚFRABÚI, the hidden waterfall (SQUEEZE IN)
// And GLJÚFRABÚI itself (makeGorge): a mossy chamber open to the sky, the fall dropping in through a slot, the big rock to stand on.

import { K, IS, type RGB } from '../engine/palette';
import { mk, r, line, disc, oval, txt, tw, lit, alpha, G, Gd, M } from '../engine/pixel';
import { clamp, h1 } from '../engine/math';
import { iceDay, iceWeather, mountains } from './iceland';
import { busAt } from '../game/tour';
import { COAST, seen, paintSky, skyLive, weatherFront, landLayer, nightNow, nite, busAtStop, sightSign, sheep, tufts, fallTex, drawFallLit, mist, rainbow, sunny, pixels, cliffPx, grassPx, vnoise, fbm } from './coast';
import type { Prop, Rect, Room, Spot, Talker } from './room';

const W = 1700, H = 614, WALL = 470, FL0 = 484, FL1 = 570, HZ = 430;
export const SLR = { bus: 20, door: 208, pay: 262, sign: 292, hut: 420, bench: 560, fall: 700, crack: 1560 };
/** Where you step off the bus (and where the map's hop puts you). */
export const SEL_ARRIVE = { x: SLR.door, y: 500 };
/** The pool at the foot of the falls (an oval), and the path behind it. */
export const POOL = { cx: 702, cy: 516, rx: 72, ry: 18 };
export const BEHIND = { x0: POOL.cx - 66, x1: POOL.cx + 66, y0: FL0, y1: 497 };
/** The chains across the path in a gale (features/coast.ts puts them up and takes them down). */
export const CHAINS: Rect[] = [{ x0: -99, y0: FL0, x1: -98, y1: 498 }, { x0: -99, y0: FL0, x1: -98, y1: 498 }];
export const chainsUp = (up: boolean): void => {
  CHAINS[0].x0 = up ? BEHIND.x0 - 10 : -99; CHAINS[0].x1 = up ? BEHIND.x0 - 4 : -98;
  CHAINS[1].x0 = up ? BEHIND.x1 + 4 : -99; CHAINS[1].x1 = up ? BEHIND.x1 + 10 : -98;
};
/** What the features tell the set (features/coast.ts). */
export const SELW = { chain: false };

/** The cliff's top edge at x (it slopes down to the plain on the left; a notch where the river goes over). */
function ctop(x: number): number {
  const top = 176 + 16 * Math.sin(x / 83) + 8 * Math.sin(x / 29 + 1) + 4 * Math.sin(x / 11) + (Math.abs(x - SLR.fall) < 14 ? 6 : 0);
  if (x >= 400) return top;
  const t = clamp((x - 250) / 150, 0, 1), s = t * t * (3 - 2 * t);
  return 446 + (top - 446) * s;
}
/** The falling water's width at height y (thin at the lip, wider as it spreads). */
const fallW = (y: number): number => Math.round(12 + clamp((y - 180) / 300, 0, 1) * 14);
const LIP = Math.round(ctop(SLR.fall)) + 2;

// ---------------------------------------------------------------- the land (baked, night and day) ----------------------------------------------------------------
function paintLand(day: boolean, dk: (c: RGB) => RGB): void {
  // ---- far left: the farmland plain running away west, the cliffs going on low and hazy, a farm ----
  mountains(0, 420, HZ, 22, 2.1, dk(M(IS.MOUNTAIN, IS.SKY_LO, 0.45)), dk(IS.SNOW), true);
  r(0, HZ, 420, WALL - HZ, dk([108, 124, 84])); for (let y = HZ + 2; y < WALL; y += 4) r(0, y, 420, 1, dk(M([108, 124, 84], [140, 150, 100], h1(y) * 0.5)));
  { const fx = 120, fy = HZ + 14; r(fx, fy, 22, 9, dk(IS.WHITE)); for (let k = 0; k < 6; k++) r(fx - 2 + k, fy - 6 + k, 26 - k * 2, 1, dk(IS.ROOF_RED)); r(fx + 26, fy + 2, 10, 7, dk([170, 60, 50])); r(fx + 4, fy + 3, 3, 3, dk([90, 110, 130])); } // (the farm and its red barn)
  // ---- THE CLIFF: layers of old lava, moss on every ledge, grass and snow along the top; the hollow behind the falls ----
  pixels(250, 150, W - 250, WALL - 150, (x, y) => {
    const top = Math.round(ctop(x)); if (y < top) return null;
    if (y < top + 2) return dk([220, 226, 232]); // (snow along the edge)
    if (y < top + 8 + Math.round(vnoise(x, 0, 9) * 5)) return dk(grassPx(x, y, 0.15)); // (the grass along the top)
    const slope = WALL - 38 - Math.round(vnoise(x, 0, 40, 2) * 22); // (the grassy slope at the cliff's foot)
    if (y > slope && Math.abs(x - SLR.fall) > 112) return dk(grassPx(x, y));
    return dk(cliffPx(x, y, 0.55, 1));
  });
  // the hollow behind the falls: dark, wet, an arch of rock overhead
  pixels(SLR.fall - 120, 320, 240, WALL - 320, (x, y) => { // the hollow behind the falls: an overhang worn into the cliff, dark and wet, its edge ragged
    const u = (y - 320) / (WALL - 320), hw = 112 * Math.pow(u, 0.42) + (vnoise(x, y, 7, 4) - 0.5) * 18, d = Math.abs(x - SLR.fall) / Math.max(1, hw);
    if (d >= 1 || u <= 0) return null;
    const wet = vnoise(x, y, 4, 9) > 0.7 ? 0.15 : 0, rim = d > 0.82;
    return dk(rim ? M(cliffPx(x, y, 0.8, 1), [20, 22, 24], 0.4) : M(M([22, 24, 26], [48, 48, 48], d * d + vnoise(x, y, 6) * 0.2), [70, 100, 60], wet));
  });
  for (let k = 0; k < 40; k++) { const x = SLR.fall - 90 + Math.floor(h1(k * 2.3) * 180), y = 400 + Math.floor(h1(k * 1.7) * 66); r(x, y, 2, 1, dk([90, 120, 80])); } // (moss in the hollow, and its drips)
  // the notch where the river goes over the edge, and the stream's dark line on the cliff top behind it
  r(SLR.fall - 8, LIP - 6, 16, 6, dk([60, 58, 56])); r(SLR.fall - 6, LIP - 3, 12, 3, dk([150, 176, 190]));
  // GLJÚFRABÚI's crack: a black slit in the cliff, moss round its lips
  for (let y = 330; y < WALL; y++) { const hw = Math.round(3 + ((y - 330) / (WALL - 330)) * 11); r(SLR.crack - hw, y, hw * 2, 1, dk([14, 16, 18])); r(SLR.crack - hw - 2, y, 2, 1, dk(IS.MOSS)); r(SLR.crack + hw, y, 2, 1, dk(IS.MOSS_DK)); }
  // ---- the ground: the car park's tarmac on the left, then grass with the gravel path, the pool's rocky rim, the stream ----
  pixels(0, WALL, W, H - WALL, (x, y) => dk(grassPx(x, y)));
  r(0, WALL, 300, H - WALL, dk([70, 72, 76])); for (let i = 0; i < 160; i++) r(Math.floor(h1(i * 5.1) * 300), WALL + Math.floor(h1(i * 2.9) * (H - WALL)), 1, 1, dk([90, 92, 96])); for (let x = 30; x < 290; x += 52) r(x, 540, 2, 40, dk([220, 220, 210])); // (the car park, its bay lines)
  r(0, WALL, 300, 3, dk([110, 112, 116]));
  pixels(300, WALL + 2, 420, H - WALL - 2, (x, y) => { const half = 26 + (y - WALL) * 0.22, cx = 330 + (y - WALL) * 0.9; return Math.abs(x - cx) < half ? dk(M([118, 112, 102], [140, 134, 122], vnoise(x, y, 3))) : null; }); // (the gravel path in from the car park)
  pixels(300, FL0 - 2, W - 300, 16, (x, y) => dk(M([116, 110, 100], [142, 136, 124], vnoise(x, y, 3) * 0.7 + vnoise(x, y, 1.3) * 0.3))); // (the path along the cliff's foot)
  oval(POOL.cx, POOL.cy + 2, POOL.rx + 8, POOL.ry + 6, dk([58, 56, 54])); for (let k = 0; k < 26; k++) { const an = (k / 26) * Math.PI * 2, x = POOL.cx + Math.cos(an) * (POOL.rx + 4), y = POOL.cy + Math.sin(an) * (POOL.ry + 3); oval(Math.round(x), Math.round(y), 5, 3, dk(h1(k) > 0.5 ? [84, 80, 76] : [64, 62, 60])); }
  for (let y = WALL; y < H; y++) { const cx = SLR.crack + Math.round(Math.sin((y - WALL) / 22) * 18 + (y - WALL) * 0.25), hw = 6 + Math.round((y - WALL) * 0.06); r(cx - hw, y, hw * 2, 1, dk([86, 116, 130])); if (h1(y * 3.1) > 0.7) r(cx - hw + Math.floor(h1(y) * hw * 2), y, 3, 1, dk([200, 220, 228])); } // (the stream out of the crack)
  for (const [sx, sy] of [[1578, 500], [1590, 528], [1606, 556]]) { oval(sx, sy, 7, 3, dk([110, 106, 100])); oval(sx, sy - 1, 6, 2, dk([140, 136, 128])); } // (stepping stones)
  tufts(300, W, WALL + 1, 3.3, dk, 0.4); tufts(300, W, FL1 + 20, 5.1, dk, 0.3);
  // ---- the car park's things: the pay machine, the sight sign, the coffee hut (its hand-written menu) ----
  { const x = SLR.pay; r(x - 6, 438, 12, 32, dk([150, 156, 164])); r(x - 6, 438, 12, 2, dk([190, 196, 204])); r(x - 4, 444, 8, 6, dk([40, 60, 80])); r(x - 2, 454, 4, 2, dk([30, 30, 34])); r(x - 7, 424, 14, 12, dk([40, 90, 170])); txt('P', x - 2, 427, dk(K.WHITE)); }
  sightSign(SLR.sign, WALL, 'SELJALANDSFOSS', dk);
  { const x0 = SLR.hut - 36, x1 = SLR.hut + 36; r(x0, 420, x1 - x0, WALL - 420, dk([122, 84, 58])); for (let x = x0; x < x1; x += 4) r(x, 420, 1, WALL - 420, dk([100, 68, 46])); for (let k = 0; k < 8; k++) r(x0 - 4 + k, 412 - k, x1 - x0 + 8 - k * 2, 1, dk([46, 48, 52])); r(x0 - 6, 412, x1 - x0 + 12, 2, dk(IS.SNOW));
    r(SLR.hut - 22, 432, 44, 18, dk([40, 34, 30])); r(SLR.hut - 24, 450, 48, 4, dk([150, 110, 76])); txt('KAFFI', SLR.hut - tw('KAFFI') / 2, 423, dk(K.WHITE));
    r(x1 + 4, 440, 22, 28, dk([30, 34, 32])); r(x1 + 6, 442, 18, 24, dk([46, 52, 48])); for (let q = 0; q < 4; q++) r(x1 + 8, 445 + q * 5, 6 + (q * 5) % 9, 1, dk([230, 226, 210])); line(x1 + 6, WALL, x1 + 14, 466, dk([90, 70, 50])); line(x1 + 24, WALL, x1 + 16, 466, dk([90, 70, 50])); } // (its chalkboard)
  // the slippery sign by the path
  { const x = 590; r(x, 440, 2, 30, dk([90, 94, 100])); for (let k = 0; k < 14; k++) { r(x + 1 - k, 420 + k, k * 2 + 1, 1, dk(k > 11 || k * 2 + 1 < 6 ? [200, 50, 40] : K.WHITE)); r(x + 1 - k, 420 + k, 1, 1, dk([200, 50, 40])); r(x + 1 + k, 420 + k, 1, 1, dk([200, 50, 40])); } r(x, 426, 2, 5, dk([30, 30, 34])); r(x, 433, 2, 2, dk([30, 30, 34])); r(x - 14, 436, 30, 6, dk(K.WHITE)); txt('SLIPPERY', x + 1 - tw('SLIPPERY') / 2, 436, dk([40, 40, 44])); }
}
const land = landLayer(W, H, paintLand);
const TEX = { day: null as HTMLCanvasElement | null, night: null as HTMLCanvasElement | null };
const tex = (): [HTMLCanvasElement, HTMLCanvasElement] => { if (!TEX.day) { TEX.day = fallTex(30, true, 1.7); TEX.night = fallTex(30, false, 1.7); } return [TEX.day, TEX.night!]; };
/** The falling water from y0 to y1, in strips (it widens as it falls), swaying a little in the wind. */
function water(y0: number, y1: number, a: number): void {
  const [d, n] = tex(), sway = iceWeather().kind === 'gale' ? 3 : 1;
  for (let y = y0; y < y1; y += 16) { const w = fallW(y), x = SLR.fall - Math.floor(w / 2) + Math.round(Math.sin(a * 0.9 + y / 60) * sway * (y - LIP) / 300); drawFallLit(d, n, x, y, Math.min(y + 16, y1), w, a, 150); }
}

// ---------------------------------------------------------------- live ----------------------------------------------------------------
function drawBack(a: number): void {
  skyLive(a, W, HZ, 300);
  land();
  const night = nightNow(), day = iceDay();
  // ---- THE FALLS: the water from the lip down to the hollow (the rest, in front of the path, is the curtain), the floodlights at night ----
  if (seen(SLR.fall - 120, SLR.fall + 120)) {
    water(LIP, 360, a);
    for (let q = 0; q < 6; q++) { const u = ((a * 0.9) + q / 6) % 1; alpha(0.5 * (1 - u), () => r(SLR.fall - 4 + Math.round(Math.sin(q * 2.1) * 4), LIP - 2 + Math.round(u * 4), 2, 1, nite(K.WHITE, night))); } // (the water bulging over the edge)
    if (night > 0.3) { Gd(SLR.fall, 470, 34, [255, 236, 200], 0.16 * night); Gd(SLR.fall, 400, 22, [230, 240, 255], 0.1 * night); lit(() => { r(SLR.fall - 70, 468, 4, 3, [255, 240, 200]); r(SLR.fall + 66, 468, 4, 3, [255, 240, 200]); }); } // (floodlit)
    // the pool: dark water churning, rings spreading from where the fall lands
    oval(POOL.cx, POOL.cy, POOL.rx, POOL.ry, nite([70, 104, 120], night)); oval(POOL.cx, POOL.cy + 3, POOL.rx - 8, POOL.ry - 6, nite([84, 120, 136], night));
    for (let q = 0; q < 4; q++) { const u = ((a * 0.5) + q / 4) % 1; alpha(0.5 * (1 - u), () => { const rx = 10 + u * (POOL.rx - 14), ry = 3 + u * (POOL.ry - 5); for (let t = 0; t < 24; t++) { const an = (t / 24) * Math.PI * 2; r(Math.round(POOL.cx + Math.cos(an) * rx), Math.round(POOL.cy - 10 + 10 * u + Math.sin(an) * ry), 2, 1, nite([220, 236, 242], night)); } }); }
    if (night > 0.3) alpha(0.18 * night, () => oval(POOL.cx, POOL.cy, POOL.rx - 10, POOL.ry - 6, [255, 230, 190]));
    // a rainbow in the spray on a sunny afternoon (the low sun's behind you)
    if (sunny()) rainbow(SLR.fall + 16, 506, 78, Math.min(1, day) * 0.9, 498);
  }
  // ---- GLJÚFRABÚI's crack: the roar's mist puffing out of it ----
  if (seen(SLR.crack - 40, SLR.crack + 40)) mist(SLR.crack, 440, 30, 6, a, 9.1);
  // ---- sheep on the slope, grazing; tourists in rain ponchos going along the path, far off ----
  if (seen(880, 1460)) for (const [sx, sy, col, ph] of [[930, 448, [236, 232, 220], 0.1], [1012, 438, [120, 90, 66], 0.6], [1180, 452, [236, 232, 220], 0.3], [1360, 444, [40, 38, 40], 0.8]] as [number, number, RGB, number][]) { const t = (a * 0.13 + ph) % 1; sheep(sx + Math.round(Math.sin(t * 6.28) * 6), sy, t < 0.5 ? 1 : -1, col, (a * 0.4 + ph * 7) % 3 > 1, night); }
  if (seen(800, 1500)) for (const [ph, col] of [[0, [230, 60, 70]], [0.4, [60, 150, 230]], [0.72, [250, 210, 60]]] as [number, RGB][]) { const t = (a * 0.012 + ph) % 1, x = 820 + t * 640, y = 466, c = nite(col, night), step = Math.floor(a * 4 + ph * 9) % 2; r(Math.round(x) - 3, y - 11, 7, 9, c); r(Math.round(x) - 2, y - 13, 5, 2, c); r(Math.round(x) - 1, y - 14, 3, 1, nite([236, 200, 170], night)); r(Math.round(x) - 2 + step, y - 2, 1, 2, nite([40, 40, 46], night)); r(Math.round(x) + 1 - step, y - 2, 1, 2, nite([40, 40, 46], night)); }
  // ---- the coffee hut's window, lit after dark; its steam ----
  if (seen(SLR.hut - 40, SLR.hut + 40)) { if (night > 0.2) { lit(() => alpha(night, () => r(SLR.hut - 20, 434, 40, 14, [255, 206, 130]))); Gd(SLR.hut, 442, 24, [255, 200, 130], 0.3 * night); } for (let q = 0; q < 3; q++) { const u = ((a * 0.3) + q / 3) % 1; alpha(0.4 * (1 - u), () => disc(SLR.hut + 14 + Math.round(Math.sin(u * 5 + q) * 2), Math.round(404 - u * 20), 2 + Math.round(u * 3), [236, 238, 240])); } }
  // ---- the bus, and its stop ----
  if (seen(SLR.bus - 20, SLR.bus + 280)) busAtStop(1, SLR.bus, FL0 - 2, a);
  // ---- the chain across the path in a gale ----
  if (SELW.chain && seen(BEHIND.x0 - 20, BEHIND.x1 + 20)) for (const cx of [BEHIND.x0 - 7, BEHIND.x1 + 7]) { r(cx - 1, 470, 2, 26, nite([60, 60, 66], night)); r(cx - 1, 470, 2, 2, nite([220, 60, 50], night)); }
  if (SELW.chain && seen(BEHIND.x0 - 20, BEHIND.x0 + 20)) { const cx = BEHIND.x0 - 26; r(cx - 14, 456, 30, 12, nite(K.WHITE, night)); r(cx - 14, 456, 30, 1, nite([200, 50, 40], night)); txt('CLOSED', cx + 1 - tw('CLOSED') / 2, 459, nite([200, 50, 40], night)); }
}
/** The falling water in front of the path behind the falls, and the spray boiling up at its foot: anyone on that path is behind it. */
const curtain: Prop = { y: 498, draw(a: number) {
  if (!seen(SLR.fall - 80, SLR.fall + 80)) return;
  const night = nightNow();
  alpha(0.86, () => water(360, 500, a));
  for (let q = 0; q < 14; q++) { const u = ((a * 1.1) + q / 14) % 1, x = SLR.fall + (h1(q * 3.7) - 0.5) * 34 * (0.4 + u), y = 500 - u * 22; alpha(0.5 * (1 - u), () => disc(Math.round(x), Math.round(y), 2 + Math.round(u * 3), nite([240, 246, 250], night))); } // (the foam)
  mist(SLR.fall, 494, 90, 14, a, 3.3);
} };
/** Where the chains hang, and the gale's closed sign: features/coast.ts sets SELW.chain. */
function drawFront(a: number): void {
  weatherFront(a, H);
  // the spray drifting across the whole scene near the falls, a fine drizzle of droplets catching the light
  if (seen(SLR.fall - 160, SLR.fall + 160)) { const night = nightNow(); for (let q = 0; q < 30; q++) { const u = ((a * 0.4) + q / 30) % 1, x = SLR.fall - 150 + h1(q * 1.9) * 300 + u * 20, y = 380 + h1(q * 2.7) * 180; alpha(0.35 * (1 - Math.abs(u - 0.5) * 2), () => r(Math.round(x), Math.round(y), 1, 1, nite(K.WHITE, night))); } }
}

// ---------------------------------------------------------------- props, spots, talkers ----------------------------------------------------------------
function stillProp(y: number, box: Rect, still: () => void): Prop {
  return { y, draw() { if (seen(box.x0, box.x1)) still(); } };
}
const bench = stillProp(560, { x0: SLR.bench - 34, y0: 530, x1: SLR.bench + 34, y1: 562 }, () => { const n = nightNow(), x = SLR.bench, y = 560; r(x - 30, y - 12, 60, 4, nite([120, 84, 56], n)); r(x - 30, y - 22, 60, 4, nite([120, 84, 56], n)); r(x - 30, y - 8, 60, 2, nite([90, 62, 42], n)); for (const lx of [x - 26, x + 24]) r(lx, y - 22, 3, 22, nite([60, 62, 66], n)); });
export const SLSPOT = { KAFFI: 0, BENCH0: 1 };
export const SEL_SPOTS: Spot[] = [
  { kind: 'kaffi', x: SLR.hut, y: 492, sx: SLR.hut, sy: 492, lift: 0, label: 'KAFFI', area: { x0: SLR.hut - 36, y0: 412, x1: SLR.hut + 36, y1: 470 } },
  ...[SLR.bench - 13, SLR.bench + 13].map((x): Spot => ({ kind: 'sit', x, y: 554, sx: x, sy: 570, lift: 8, label: 'SIT', area: { x0: x - 14, y0: 532, x1: x + 14, y1: 556 }, watch: { x: SLR.fall, top: 150 } })),
];
const TALK: Talker[] = [
  { id: 'sel-pay', name: 'THE PAY MACHINE', x: SLR.pay, y: 436, sx: SLR.pay, sy: 500, lines: ['PARKING 1000 KR. Card only. It beeps at you, judgingly.', 'A sticker on it: "IT WAS FREE IN MY DAY". Someone local, probably.'], verb: 'READ' },
  { id: 'sel-slippery', name: 'THE SIGN', x: 590, y: 432, sx: 590, sy: 500, lines: ['SLIPPERY! WATERPROOFS RECOMMENDED. The path goes right round behind the falls.', 'In a gale they put a chain across. Iceland means it.'], verb: 'READ' },
  { id: 'sel-falls', name: 'SELJALANDSFOSS', x: SLR.fall, y: 300, sx: SLR.fall - 90, sy: 548, lines: ['Sixty metres of water off the old sea cliff. The sea was here once.', 'The path goes behind it. You will get wet. That\'s the point.', 'After dark they light it up. It glows.'], verb: 'LOOK' },
];
export function makeSeljaland(): Room {
  const room: Room = {
    id: 'seljaland', title: 'SELJALANDSFOSS', sub: 'ICELAND · THE SOUTH COAST',
    w: W, h: H,
    lookAt: (x0, x1) => { const keep = COAST.view; COAST.view = { x0, x1 }; return () => { COAST.view = keep; }; },
    floor: { x0: 14, y0: FL0, x1: W - 14, y1: FL1 },
    blockers: [
      { x0: POOL.cx - POOL.rx + 6, y0: 500, x1: POOL.cx + POOL.rx - 6, y1: 534 }, // the pool
      { x0: SLR.bench - 30, y0: 548, x1: SLR.bench + 30, y1: 560 }, // the bench
      CHAINS[0], CHAINS[1],
    ],
    doors: [
      { trigger: { x0: SLR.door - 16, y0: FL0, x1: SLR.door + 16, y1: FL0 + 10 }, to: 'tourbus', arrive: { x: 1080, y: 512 }, label: 'THE BUS', area: { x0: SLR.bus, y0: 410, x1: SLR.bus + 214, y1: 482 },
        route: () => (busAt(1) ? { to: 'tourbus', arrive: { x: 1080, y: 512 }, label: 'BOARD THE BUS' } : null) },
      { trigger: { x0: SLR.crack - 14, y0: FL0, x1: SLR.crack + 14, y1: FL0 + 10 }, to: 'gorge', arrive: { x: 150, y: 520 }, label: 'SQUEEZE IN', area: { x0: SLR.crack - 18, y0: 330, x1: SLR.crack + 18, y1: 470 } },
    ],
    spots: SEL_SPOTS, inUse: new Map(),
    spawn: { ...SEL_ARRIVE },
    dim: 0.1,
    dimNow: () => 0.06 + 0.5 * (1 - iceDay()),
    glowMul: () => 0.4 + 0.6 * (1 - iceDay()),
    fillTop: 'rgb(17,33,58)', fillLow: 'rgb(70,96,52)',
    bg: mk(W, H), bgAlt: mk(W, H), altAlpha: () => iceDay(),
    build: () => { paintSky(room.bg.getContext('2d')!, false, W, H, HZ); paintSky(room.bgAlt!.getContext('2d')!, true, W, H, HZ); },
    drawBack, drawFront,
    props: [curtain, bench],
    talkers: TALK,
  };
  return room;
}

// ================================================================ GLJÚFRABÚI ================================================================
const GW = 760, GL = { fall: 400, rock: 400, out: 70 };
/** The big rock in the middle: stand on it, face to face with the water. */
export const GORGE_ROCK = { x: GL.rock, y: 530, lift: 22 };
function paintGorge(day: boolean, dk: (c: RGB) => RGB): void {
  // the chamber: dark mossy rock all round, opening to a slot of sky high above where the water comes in
  pixels(0, 0, GW, WALL, (x, y) => {
    const d = Math.abs(x - GL.fall) / (GW / 2), open = Math.round(30 + 40 * Math.max(0, 1 - d * 5));
    if (y < open && d < 0.18) return null; // (the slot: the sky shows through)
    const lightK = clamp(1 - d * 1.5, 0, 1) * clamp(1 - y / 520, 0, 1), mk2 = clamp((0.66 - fbm(x, y, 16, 11)) * 5, 0, 1), rock = M([28, 32, 30], [62, 66, 60], fbm(x, y, 7, 13) * 0.8 + vnoise(x, y, 2) * 0.2), c = M(rock, M([50, 74, 40], [104, 140, 72], fbm(x, y, 5, 12)), mk2);
    return dk(M(M(c, [20, 26, 22], 0.35 + d * 0.3), [170, 200, 140], lightK * 0.5));
  });
  // the pool behind the rock, and the stream running out to the left
  pixels(0, WALL, GW, H - WALL, (x, y) => dk(M(M([44, 52, 42], [62, 72, 56], vnoise(x, y, 5, 2)), [80, 106, 60], clamp((fbm(x, y, 12, 5) - 0.5) * 3, 0, 0.5))));
  oval(GL.fall, WALL + 14, 150, 26, dk([40, 66, 78])); oval(GL.fall, WALL + 14, 140, 22, dk([60, 92, 106]));
  for (let y = WALL + 20; y < H; y++) { const cx = GL.fall - 60 - (y - WALL - 20) * 2.2, hw = 14; r(Math.round(cx - hw), y, hw * 2, 1, dk([62, 94, 108])); if (h1(y * 2.3) > 0.6) r(Math.round(cx - hw + h1(y) * hw * 2), y, 3, 1, dk([190, 214, 222])); }
  for (const [sx, sy] of [[150, 548], [206, 536], [262, 526], [318, 520]]) { oval(sx, sy, 9, 4, dk([96, 100, 92])); oval(sx, sy - 1, 8, 3, dk([126, 130, 120])); oval(sx - 2, sy - 2, 3, 1, dk([96, 140, 70])); } // (stepping stones in)
  // the way out: the crack's bright sliver of daylight, on the left
  for (let y = 330; y < WALL + 10; y++) { const hw = Math.round(4 + ((y - 330) / 150) * 12); r(GL.out - hw, y, hw * 2, 1, day ? dk([190, 210, 200]) : dk([40, 50, 70])); }
}
const gorgeLand = landLayer(GW, H, paintGorge);
const GTEX = { day: null as HTMLCanvasElement | null, night: null as HTMLCanvasElement | null };
function gorgeBack(a: number): void {
  const night = nightNow();
  skyLive(a, GW, 140, 400);
  gorgeLand();
  if (!GTEX.day) { GTEX.day = fallTex(26, true, 4.4); GTEX.night = fallTex(26, false, 4.4); }
  // the shaft of light down through the slot (golden in the low sun, the aurora's green at night when it's out), the falling water in it
  alpha(0.16 * (1 - night) + 0.05, () => { for (let y = 40; y < WALL; y += 4) { const hw = 16 + (y - 40) * 0.18; r(Math.round(GL.fall - hw), y, Math.round(hw * 2), 4, [255, 236, 190]); } });
  drawFallLit(GTEX.day, GTEX.night!, GL.fall - 13, 40, WALL + 10, 26, a, 170);
  mist(GL.fall, WALL + 10, 120, 18, a, 1.3);
  // drips off the walls, catching the light
  for (let q = 0; q < 12; q++) { const u = ((a * 0.7) + q / 12) % 1, x = 120 + h1(q * 3.1) * 520, y = 120 + u * 340; if (Math.abs(x - GL.fall) > 30) alpha(0.6 * (1 - u), () => r(Math.round(x), Math.round(y), 1, 2, nite([210, 236, 246], night))); }
}
/** The big rock: a mossy boulder in the pool's edge, its top flat enough to stand on. */
const rockProp: Prop = { y: GORGE_ROCK.y + 2, draw() { const n = nightNow(), x = GORGE_ROCK.x, y = GORGE_ROCK.y; oval(x, y - 6, 26, 10, nite([70, 72, 66], n)); oval(x, y - 12, 24, 10, nite([92, 94, 86], n)); oval(x - 6, y - 18, 14, 4, nite([96, 140, 70], n)); oval(x + 10, y - 14, 8, 3, nite([78, 112, 58], n)); } };
const gorgeFront = (a: number): void => {
  // the roar fills the air: the spray drifting through the whole chamber
  const night = nightNow(); for (let q = 0; q < 40; q++) { const u = ((a * 0.5) + q / 40) % 1, x = 100 + h1(q * 1.3) * 560 + Math.sin(a + q) * 6, y = 160 + h1(q * 2.9) * 380 - u * 30; alpha(0.4 * (1 - Math.abs(u - 0.5) * 2), () => r(Math.round(x), Math.round(y), 1, 1, nite(K.WHITE, night))); }
  void a;
};
export const GORGE_SPOTS: Spot[] = [
  { kind: 'perch', x: GORGE_ROCK.x, y: GORGE_ROCK.y, sx: GORGE_ROCK.x, sy: GORGE_ROCK.y + 24, lift: GORGE_ROCK.lift, label: 'CLIMB THE ROCK', area: { x0: GORGE_ROCK.x - 26, y0: GORGE_ROCK.y - 24, x1: GORGE_ROCK.x + 26, y1: GORGE_ROCK.y + 2 } },
];
export function makeGorge(): Room {
  const room: Room = {
    id: 'gorge', title: 'GLJUFRABUI', sub: '"THE ONE WHO LIVES IN THE GORGE"',
    w: GW, h: H,
    lookAt: (x0, x1) => { const keep = COAST.view; COAST.view = { x0, x1 }; return () => { COAST.view = keep; }; },
    floor: { x0: 110, y0: 496, x1: GW - 110, y1: FL1 },
    blockers: [{ x0: GORGE_ROCK.x - 22, y0: GORGE_ROCK.y - 8, x1: GORGE_ROCK.x + 22, y1: GORGE_ROCK.y + 2 }],
    doors: [{ trigger: { x0: 110, y0: 496, x1: 124, y1: FL1 }, to: 'seljaland', arrive: { x: SLR.crack, y: 504 }, label: 'OUT THROUGH THE CRACK', area: { x0: 40, y0: 330, x1: 100, y1: 480 }, edge: true }],
    spots: GORGE_SPOTS, inUse: new Map(),
    spawn: { x: 150, y: 520 },
    dim: 0.3,
    dimNow: () => 0.24 + 0.4 * (1 - iceDay()),
    glowMul: () => 0.5 + 0.5 * (1 - iceDay()),
    fillTop: 'rgb(20,26,22)', fillLow: 'rgb(40,48,40)',
    bg: mk(GW, H), bgAlt: mk(GW, H), altAlpha: () => iceDay(),
    build: () => { paintSky(room.bg.getContext('2d')!, false, GW, H, 140); paintSky(room.bgAlt!.getContext('2d')!, true, GW, H, 140); },
    drawBack: gorgeBack, drawFront: gorgeFront,
    props: [rockProp],
    talkers: [{ id: 'gorge-fall', name: 'GLJUFRABUI', x: GL.fall, y: 300, sx: GL.fall + 60, sy: 556, lines: ['A whole waterfall, hiding in a crack in the cliff. It roars in here.', 'Locals call it "the one who lives in the gorge". It doesn\'t get many visitors. It likes it that way.'], verb: 'LOOK' }],
  };
  return room;
}
void G; void line; void disc;
