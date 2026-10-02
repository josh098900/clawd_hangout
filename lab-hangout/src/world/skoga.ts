// SKÓGAFOSS (step 19, push 2): the second stop. Outdoors on Iceland's clock. Left to right:
//   THE CAR PARK: the bus, the sight sign, the turf-roofed museum far off (SKOGAR MUSEUM 1 KM), the camping field (tents, even in snow)
//   THE FALLS: a great curtain of white water, wider than it is tall, thundering off the cliff into its pool; the mist billowing out (SOAKED),
//     a DOUBLE RAINBOW on sunny days (it faces south); fulmars on the ledges; THRASI'S RING glinting in the pool now and then (the legend's
//     treasure: E at the pool's edge while it glints); a bench whose `watch` frames the whole fall
//   THE 527 STEPS zigzagging up the slope on the right (CLIMB: up to the top), sheep on the grass
// And THE TOP (makeSkogaTop): the river running along the cliff top from the highlands (little cascades, the FIMMVÖRÐUHÁLS trail to
// ÞÓRSMÖRK) and pouring over the edge under the steel platform, the whole plain far below: the car park, the tiny bus, the river
// winding to the black sand and the sea.

import { K, IS, type RGB } from '../engine/palette';
import { mk, r, line, disc, oval, txt, tw, lit, alpha, Gd, M } from '../engine/pixel';
import { clamp, h1 } from '../engine/math';
import { iceDay, iceWeather, mountains } from './iceland';
import { busAt, busPose } from '../game/tour';
import { COAST, seen, paintSky, skyLive, weatherFront, landLayer, nightNow, nite, busAtStop, sightSign, sheep, tufts, fallTex, drawFallLit, mist, rainbow, sunny, pixels, cliffPx, grassPx, sandPx, vnoise } from './coast';
import type { Prop, Rect, Room, Spot, Talker } from './room';

const W = 1700, H = 614, WALL = 470, FL0 = 484, FL1 = 570, HZ = 430;
export const SKR = { bus: 20, door: 208, sign: 286, museum: 470, camp: 560, fall: 830, fallW: 124, steps: 1130, bench: 650 };
export const SKO_ARRIVE = { x: SKR.door, y: 500 };
/** The pool at the falls' foot: where the ring glints. */
export const SPOOL = { cx: SKR.fall, cy: 492, rx: 116, ry: 14 };
/** What the features tell the set (features/coast.ts): THRASI'S RING glinting at x since t (performance clock), -99 = not now. */
export const SKOW = { glint: -99, glintX: SKR.fall };
const LIP = 182;
/** The cliff's top edge at x: high either side of the falls, the slope with the steps on the right, down to the plain on the left. */
function ctop(x: number): number {
  const top = 178 + 10 * Math.sin(x / 70) + 5 * Math.sin(x / 23 + 2);
  if (x < 420) { const t = clamp((x - 330) / 90, 0, 1); return 450 + (top - 450) * t * t * (3 - 2 * t); }
  if (Math.abs(x - SKR.fall) < SKR.fallW / 2 + 4) return LIP;
  return top;
}

// ---------------------------------------------------------------- the land ----------------------------------------------------------------
function paintLand(day: boolean, dk: (c: RGB) => RGB): void {
  // far left: the plain running to the sea, the turf-roofed museum houses, the hills behind
  mountains(0, 440, HZ, 18, 4.2, dk(M(IS.MOUNTAIN, IS.SKY_LO, 0.4)), dk(IS.SNOW), true);
  r(0, HZ, 440, WALL - HZ, dk([110, 124, 82]));
  for (let k = 0; k < 4; k++) { const x = 70 + k * 26, y = HZ + 16; r(x, y, 20, 10, dk([210, 206, 196])); for (let q = 0; q < 6; q++) r(x - 2 + q, y - 6 + q, 24 - q * 2, 1, dk(q < 2 ? [120, 150, 80] : [96, 128, 64])); r(x + 8, y + 4, 4, 6, dk([90, 60, 40])); } // (the museum's turf houses)
  // THE CLIFF: dark basalt in layers, the grassy slopes, the steps' slope on the right
  pixels(330, 150, W - 330, WALL - 150, (x, y) => {
    const top = Math.round(ctop(x)); if (y < top) return null;
    if (Math.abs(x - SKR.fall) < SKR.fallW / 2 - 2 && y > LIP + 4) return dk([40, 40, 42]); // (behind the water: deep shadow)
    if (y < top + 2) return dk([220, 226, 232]);
    const steep = x >= 420 && x <= 1030;
    if (!steep || y < top + 7 + Math.round(vnoise(x, 0, 9) * 5)) return dk(grassPx(x, y, 0.12)); // (grass: the slopes, the top)
    return dk(cliffPx(x, y, 0.4, 2));
  });
  // the gorge either side of the falls: the cliff's darker faces stepping back
  for (const side of [-1, 1]) pixels(side < 0 ? SKR.fall - SKR.fallW / 2 - 40 : SKR.fall + SKR.fallW / 2, LIP, 40, WALL - LIP, (x, y) => { const k = Math.abs(x - SKR.fall) - SKR.fallW / 2; return y < LIP + (40 - k) * 2 ? null : dk(M(cliffPx(x, y, 0.3, 2), [24, 24, 26], 0.5 - k / 100)); }); // (the gorge's walls either side, stepping back in shadow)
  // the fulmars' ledges: white streaks of guano
  for (let k = 0; k < 30; k++) { const x = 560 + Math.floor(h1(k * 3.7) * 440), y = 230 + Math.floor(h1(k * 1.9) * 180); if (Math.abs(x - SKR.fall) > 80) r(x, y, 6 + (k % 4), 1, dk([220, 220, 210])); }
  // THE 527 STEPS: wooden flights zigzagging up the slope, a rail beside them, the platform at the top
  for (let k = 0; k < 9; k++) { const y0 = WALL - 8 - k * 30, xa = k % 2 ? 1250 : 1090, xb = k % 2 ? 1090 : 1250; for (let q = 0; q < 30; q += 3) { const u = q / 30, x = Math.round(xa + (xb - xa) * u), y = Math.round(y0 - u * 30); r(x - 6, y, 12, 2, dk([150, 112, 76])); } line(xa, y0 - 8, xb, y0 - 38, dk([110, 80, 54])); }
  r(1060, ctop(1060) - 6, 40, 4, dk([120, 124, 130])); r(1062, ctop(1060) - 14, 2, 10, dk([120, 124, 130])); r(1096, ctop(1060) - 14, 2, 10, dk([120, 124, 130]));
  // ---- the ground: the car park, the black shingle and the grass, the pool's rim, the river running out along the back ----
  pixels(0, WALL, W, H - WALL, (x, y) => dk(grassPx(x, y)));
  r(0, WALL, 300, H - WALL, dk([70, 72, 76])); for (let x = 30; x < 290; x += 52) r(x, 540, 2, 40, dk([220, 220, 210])); r(0, WALL, 300, 3, dk([110, 112, 116]));
  pixels(560, WALL, 560, H - WALL, (x, y) => { const edge = 40 * vnoise(0, y, 30, 3); return x < 560 + edge || x > 1120 - edge ? null : dk(M(sandPx(x, y), [80, 80, 84], vnoise(x * 2, y * 2, 2) > 0.7 ? 0.4 : 0)); }); // (black shingle by the falls)
  for (let y = WALL; y < FL0 - 2; y++) { const x0 = 330, x1 = SPOOL.cx - SPOOL.rx + 10; r(x0, y, x1 - x0, 1, dk([82, 118, 136])); if (h1(y * 2.1) > 0.5) r(x0 + Math.floor(h1(y) * (x1 - x0)), y, 8, 1, dk([200, 220, 228])); } // (the river Skógá, running out along the back)
  oval(SPOOL.cx, SPOOL.cy, SPOOL.rx + 8, SPOOL.ry + 6, dk([56, 56, 58])); for (let k = 0; k < 30; k++) { const an = (k / 30) * Math.PI * 2; oval(Math.round(SPOOL.cx + Math.cos(an) * (SPOOL.rx + 4)), Math.round(SPOOL.cy + Math.sin(an) * (SPOOL.ry + 3)), 5, 3, dk(h1(k) > 0.5 ? [80, 78, 76] : [60, 58, 58])); }
  tufts(300, 560, WALL + 1, 7.7, dk, 0.4); tufts(1120, W, WALL + 1, 2.2, dk, 0.5);
  // ---- the car park's things: the sight sign, the museum sign, the camping field's tents and its little toilet block ----
  sightSign(SKR.sign, WALL, 'SKOGAFOSS', dk);
  { const x = SKR.museum; r(x, WALL - 40, 2, 40, dk([90, 94, 100])); r(x - 30, WALL - 54, 62, 14, dk([126, 84, 52])); txt('MUSEUM 1 KM', x + 1 - tw('MUSEUM 1 KM') / 2, WALL - 50, dk(K.WHITE)); }
  for (const [tx, c] of [[510, [230, 120, 40]], [548, [60, 130, 90]], [596, [200, 60, 60]]] as [number, RGB][]) { for (let q = 0; q < 10; q++) r(tx - q, WALL - 12 + q, q * 2 + 1, 1, dk(c)); r(tx - 1, WALL - 6, 3, 4, dk([40, 40, 44])); r(tx - 4, WALL - 12, 8, 1, dk(IS.SNOW)); } // (tents, a dusting of snow on them)
  r(380, WALL - 26, 34, 26, dk([200, 196, 186])); r(378, WALL - 30, 38, 4, dk([90, 96, 104])); r(392, WALL - 16, 6, 16, dk([60, 90, 120])); txt('WC', 384, WALL - 24, dk([40, 60, 90]));
}
const land = landLayer(W, H, paintLand);
const TEX: { day: HTMLCanvasElement | null; night: HTMLCanvasElement | null } = { day: null, night: null };
const tex = (): [HTMLCanvasElement, HTMLCanvasElement] => { if (!TEX.day) { TEX.day = fallTex(SKR.fallW, true, 7.9); TEX.night = fallTex(SKR.fallW, false, 7.9); } return [TEX.day, TEX.night!]; };

// ---------------------------------------------------------------- live ----------------------------------------------------------------
function drawBack(a: number): void {
  skyLive(a, W, HZ, 1500);
  land();
  const night = nightNow(), day = iceDay(), [d, n] = tex(), x0 = SKR.fall - SKR.fallW / 2;
  if (seen(x0 - 200, x0 + SKR.fallW + 200)) {
    // the water: over the lip (bulging), the curtain, the foot boiling white
    drawFallLit(d, n, x0, LIP, SPOOL.cy - 2, SKR.fallW, a, 190);
    for (let x = x0; x < x0 + SKR.fallW; x += 3) { const b = Math.round(Math.sin(a * 3 + x * 0.3) * 1); r(x, LIP - 2 + b, 3, 2, nite([236, 244, 248], night)); }
    oval(SPOOL.cx, SPOOL.cy, SPOOL.rx, SPOOL.ry, nite([76, 110, 126], night));
    for (let q = 0; q < 5; q++) { const u = ((a * 0.4) + q / 5) % 1; alpha(0.45 * (1 - u), () => { for (let t = 0; t < 40; t++) { const an = (t / 40) * Math.PI * 2, rx = 30 + u * (SPOOL.rx - 30), ry = 3 + u * (SPOOL.ry - 4); r(Math.round(SPOOL.cx + Math.cos(an) * rx), Math.round(SPOOL.cy + 2 + Math.sin(an) * ry), 2, 1, nite([220, 236, 242], night)); } }); }
    // THRASI'S RING: a glint in the pool, now and then, on a sunny day
    const gt = performance.now() / 1000 - SKOW.glint;
    if (gt >= 0 && gt < 5) { const k = Math.sin((gt / 5) * Math.PI), gx = SKOW.glintX, gy = SPOOL.cy + 4; lit(() => { r(gx - 1, gy, 3, 1, [255, 220, 90]); if ((a * 6) % 1 < 0.6) { r(gx, gy - 3, 1, 7, [255, 240, 170]); r(gx - 3, gy, 7, 1, [255, 240, 170]); } }); Gd(gx, gy, 10, [255, 210, 90], 0.6 * k); }
    // the double rainbow in the spray (it faces south: the sun's behind you)
    if (sunny()) { rainbow(SKR.fall, 560, 150, day, 500); rainbow(SKR.fall, 560, 178, day * 0.5, 500); }
    if (night > 0.3) Gd(SKR.fall, 470, 90, [220, 236, 255], 0.12 * night);
  }
  // fulmars gliding along the cliff, riding the updraft
  if (seen(500, 1100)) for (let q = 0; q < 4; q++) { const t = a * (0.05 + q * 0.01) + q * 0.3, gx = 520 + ((t * 300) % 520), gy = 250 + Math.round(Math.sin(t * 5 + q) * 30 + q * 30), c = nite([240, 242, 246], night); r(Math.round(gx) - 3, gy, 7, 1, c); r(Math.round(gx), gy - 1, 1, 1, c); }
  // sheep on the slope by the steps; walkers on the steps, tiny
  if (seen(1050, W)) { for (const [sx, sy, col, ph] of [[1330, 440, [236, 232, 220], 0.2], [1420, 452, [236, 232, 220], 0.7], [1530, 446, [110, 84, 60], 0.45]] as [number, number, RGB, number][]) { const t = (a * 0.1 + ph) % 1; sheep(sx + Math.round(Math.sin(t * 6.28) * 5), sy, t < 0.5 ? 1 : -1, col, (a * 0.35 + ph * 9) % 3 > 1, night); }
    for (let q = 0; q < 3; q++) { const u = ((a * 0.01) + q / 3) % 1, k = Math.floor(u * 9), f = (u * 9) % 1, xa = k % 2 ? 1250 : 1090, xb = k % 2 ? 1090 : 1250, x = xa + (xb - xa) * f, y = WALL - 8 - k * 30 - f * 30; r(Math.round(x) - 1, Math.round(y) - 6, 3, 5, nite(([[220, 60, 60], [60, 120, 200], [240, 200, 60]] as RGB[])[q], night)); } }
  if (seen(SKR.bus - 20, SKR.bus + 280)) busAtStop(2, SKR.bus, FL0 - 2, a);
}
/** The mist billowing out of the falls' foot, in front of everyone near it (SOAKED). */
const spray: Prop = { y: 520, draw(a: number) { if (seen(SKR.fall - 200, SKR.fall + 200)) mist(SKR.fall, 506, 220, 26, a, 5.5); } };
function drawFront(a: number): void {
  weatherFront(a, H);
  if (seen(SKR.fall - 260, SKR.fall + 260)) { const night = nightNow(); for (let q = 0; q < 50; q++) { const u = ((a * 0.45) + q / 50) % 1, x = SKR.fall - 250 + h1(q * 1.9) * 500 + u * 30, y = 340 + h1(q * 2.7) * 260; alpha(0.4 * (1 - Math.abs(u - 0.5) * 2), () => r(Math.round(x), Math.round(y), 1, 1, nite(K.WHITE, night))); } }
}
function stillProp(y: number, box: Rect, still: () => void): Prop { return { y, draw() { if (seen(box.x0, box.x1)) still(); } }; }
const bench = stillProp(562, { x0: SKR.bench - 34, y0: 530, x1: SKR.bench + 34, y1: 564 }, () => { const n = nightNow(), x = SKR.bench, y = 562; r(x - 30, y - 12, 60, 4, nite([120, 84, 56], n)); r(x - 30, y - 22, 60, 4, nite([120, 84, 56], n)); for (const lx of [x - 26, x + 24]) r(lx, y - 22, 3, 22, nite([60, 62, 66], n)); });
export const SKSPOT = { RING: 0, BENCH0: 1 };
export const SKO_SPOTS: Spot[] = [
  { kind: 'ring', x: SKR.fall, y: 512, sx: SKR.fall, sy: 512, lift: 0, label: 'LOOK IN THE POOL', area: { x0: SPOOL.cx - SPOOL.rx, y0: SPOOL.cy - SPOOL.ry - 6, x1: SPOOL.cx + SPOOL.rx, y1: SPOOL.cy + SPOOL.ry + 4 } },
  ...[SKR.bench - 13, SKR.bench + 13].map((x): Spot => ({ kind: 'sit', x, y: 556, sx: x, sy: 570, lift: 8, label: 'SIT', area: { x0: x - 14, y0: 534, x1: x + 14, y1: 558 }, watch: { x: SKR.fall, top: 150 } })),
];
const TALK: Talker[] = [
  { id: 'sko-falls', name: 'SKOGAFOSS', x: SKR.fall, y: 300, sx: SKR.fall + 160, sy: 548, lines: ['Twenty-five metres wide, sixty high. You feel it in your chest.', 'The legend: a Viking called Thrasi hid his gold behind the falls. Boys found the chest and grabbed its ring... the ring came off, the chest sank back. Keep an eye on the pool.', 'On a sunny day there\'s a double rainbow. It faces south, so there usually is.'], verb: 'LOOK' },
  { id: 'sko-camp', name: 'THE CAMPSITE', x: SKR.camp, y: 452, sx: SKR.camp, sy: 500, lines: ['Three tents. In the snow. Someone\'s having the trip of their life.', 'The waterfall\'s right there. It\'s loud all night. They chose this.'], verb: 'LOOK' },
];
export function makeSkoga(): Room {
  const room: Room = {
    id: 'skoga', title: 'SKOGAFOSS', sub: 'ICELAND · THE SOUTH COAST',
    w: W, h: H,
    lookAt: (x0, x1) => { const keep = COAST.view; COAST.view = { x0, x1 }; return () => { COAST.view = keep; }; },
    floor: { x0: 14, y0: FL0, x1: W - 14, y1: FL1 },
    blockers: [{ x0: SPOOL.cx - SPOOL.rx, y0: FL0, x1: SPOOL.cx + SPOOL.rx, y1: 506 }, { x0: SKR.bench - 30, y0: 552, x1: SKR.bench + 30, y1: 562 }],
    doors: [
      { trigger: { x0: SKR.door - 16, y0: FL0, x1: SKR.door + 16, y1: FL0 + 10 }, to: 'tourbus', arrive: { x: 1080, y: 512 }, label: 'THE BUS', area: { x0: SKR.bus, y0: 410, x1: SKR.bus + 214, y1: 482 },
        route: () => (busAt(2) ? { to: 'tourbus', arrive: { x: 1080, y: 512 }, label: 'BOARD THE BUS' } : null) },
      { trigger: { x0: SKR.steps - 18, y0: FL0, x1: SKR.steps + 18, y1: FL0 + 10 }, to: 'skogatop', arrive: { x: TOP.steps, y: 500 }, label: 'CLIMB THE 527 STEPS', area: { x0: 1080, y0: 200, x1: 1260, y1: 470 } },
    ],
    spots: SKO_SPOTS, inUse: new Map(),
    spawn: { ...SKO_ARRIVE },
    dim: 0.1,
    dimNow: () => 0.06 + 0.5 * (1 - iceDay()),
    glowMul: () => 0.4 + 0.6 * (1 - iceDay()),
    fillTop: 'rgb(17,33,58)', fillLow: 'rgb(70,96,52)',
    bg: mk(W, H), bgAlt: mk(W, H), altAlpha: () => iceDay(),
    build: () => { paintSky(room.bg.getContext('2d')!, false, W, H, HZ); paintSky(room.bgAlt!.getContext('2d')!, true, W, H, HZ); },
    drawBack, drawFront,
    props: [spray, bench],
    talkers: TALK,
  };
  return room;
}

// ================================================================ THE TOP ================================================================
// Looking out over the edge: the plain far below runs away to the black sand and the sea; the falls drop away from the lip at the back
// (from up here the curtain stretches from the lip *up* the picture to its pool far below, the mist boiling up there); the river comes
// along the back of the cliff top from the highlands on the right. The steel platform sticks out over the drop on the left.
const TW = 1200, THZ = 300, EDGE = 330;
export const TOP = { platform0: 150, platform1: EDGE, lip0: 360, lip1: 452, pool: 424, steps: 640, trail: 1010 };
function paintTop(day: boolean, dk: (c: RGB) => RGB): void {
  // ---- far below and away: the sea, the black sand, the plain with the river Skógá winding through it, the Westman Islands ----
  r(0, THZ, TW, 5, dk(IS.SEA)); for (let x = 0; x < 600; x += 2) { const isl = Math.max(0, 6 - Math.abs(x - 300) / 6) + Math.max(0, 3 - Math.abs(x - 340) / 4); if (isl > 0) r(x, THZ - Math.round(isl), 2, Math.round(isl), dk([70, 76, 86])); }
  pixels(0, THZ + 5, TW, 8, (x, y) => dk(y < THZ + 7 && h1(Math.floor(x / 7)) > 0.6 ? [220, 230, 236] : sandPx(x, y)));
  const riverX = (y: number): number => TOP.lip0 + 46 - (TOP.pool - y) * 1.1 + Math.sin((TOP.pool - y) / 14) * 26;
  pixels(0, THZ + 13, TW, H - THZ - 13, (x, y) => {
    const u = clamp((y - THZ - 13) / 160, 0, 1);
    if (y < TOP.pool && Math.abs(x - riverX(y)) < 1 + (y - THZ) * 0.03) return dk(M([110, 150, 170], [150, 186, 204], vnoise(x, y, 4)));
    const row = Math.floor((y - THZ) / (2 + u * 6)), cell = Math.floor((x + h1(row) * 60) / (24 + u * 40)), n = h1(row * 7.1 + cell * 3.3), field: RGB = n > 0.75 ? [146, 148, 100] : n > 0.45 ? [112, 132, 78] : n > 0.2 ? [96, 120, 70] : [124, 120, 90], edge = ((x + h1(row) * 60) % (24 + u * 40)) < 1;
    return dk(M(M(edge ? M(field, [70, 80, 54], 0.4) : field, IS.SKY_LO, (1 - u) * 0.4), [80, 104, 62], vnoise(x, y, 4) * 0.15)); // (a patchwork of fields, smaller further off)
  });
  // the car park far below by the pool, its cars like beads, the tiny campsite
  r(TOP.lip0 - 150, TOP.pool + 2, 80, 10, dk([90, 92, 96])); for (let k = 0; k < 6; k++) r(TOP.lip0 - 144 + k * 12, TOP.pool + 5, 7, 3, dk(([[200, 60, 50], [240, 240, 240], [40, 90, 160], [60, 60, 64], [230, 200, 60], [240, 240, 240]] as RGB[])[k]));
  for (let k = 0; k < 3; k++) r(TOP.lip0 - 40 + k * 8, TOP.pool + 8, 4, 3, dk(([[230, 120, 40], [60, 130, 90], [200, 60, 60]] as RGB[])[k]));
  // ---- on the right: the cliff top rising to the highlands, Eyjafjallajökull's flank, the little falls up-river ----
  mountains(560, TW, 360, 80, 6.3, dk(M(IS.MOUNTAIN, IS.SKY_LO, 0.2)), dk(IS.SNOW), true);
  pixels(TOP.lip1, 330, TW - TOP.lip1, WALL - 330, (x, y) => { const hill = 452 - (x - TOP.lip1) * 0.14 + Math.sin(x / 40) * 6; return y < hill ? null : dk(grassPx(x, y, 0.2)); });
  for (let k = 0; k < 5; k++) { const cx = 720 + k * 90, cy = 438 - k * 13; r(cx - 3, cy - 12, 6, 14, dk([220, 234, 240])); oval(cx, cy + 3, 9, 3, dk([110, 150, 170])); }
  // the lip: the cliff top's near edge on the left, falling away (dark rock under the grass)
  pixels(0, WALL - 12, TW, 12, (x, y) => (x < TOP.lip1 + 4 ? (y > WALL - 4 ? dk(cliffPx(x, y, 0.3, 4)) : null) : null));
  // ---- the cliff top where you walk: the river running along the back to the lip, the grass, the path ----
  pixels(TOP.lip0, WALL - 12, TW - TOP.lip0, 14, (x, y) => dk(M([96, 140, 162], [190, 214, 226], vnoise(x * 0.6 - y, y, 3) > 0.72 ? 1 : vnoise(x, y, 5) * 0.3)));
  pixels(EDGE, WALL + 2, TW - EDGE, H - WALL - 2, (x, y) => dk(y > 500 && y < 540 && x > 420 ? M([128, 120, 106], [148, 140, 126], vnoise(x, y, 3)) : grassPx(x, y)));
  // the steel platform out over the drop: its grating (you stand on it), the cliff face dropping away under its front edge
  pixels(TOP.platform0, WALL - 2, EDGE - TOP.platform0, 566 - WALL + 2, (x, y) => dk(((x - TOP.platform0) % 4 === 0 && (y % 3) === 0) ? [96, 102, 110] : (y % 12) === 0 ? [104, 110, 118] : M([126, 132, 140], [146, 152, 160], vnoise(x, y, 20))));
  pixels(0, 566, EDGE, H - 566, (x, y) => dk(cliffPx(x, y, 0.2, 4)));
  r(TOP.platform0, 566, EDGE - TOP.platform0, 3, dk([70, 76, 84]));
  tufts(EDGE, TW, WALL + 6, 9.9, dk, 0.5);
  // the trail's sign, the steps' gate
  { const x = TOP.trail; r(x, WALL + 4, 2, 40, dk([110, 80, 54])); r(x - 40, WALL - 4, 82, 24, dk([230, 200, 60])); txt('FIMMVORDUHALS', x + 1 - tw('FIMMVORDUHALS') / 2, WALL, dk([40, 40, 44])); txt('THORSMORK 25 KM', x + 1 - tw('THORSMORK 25 KM') / 2, WALL + 9, dk([40, 40, 44])); }
  { const x = TOP.steps; r(x - 24, WALL - 2, 2, 32, dk([120, 124, 130])); r(x + 22, WALL - 2, 2, 32, dk([120, 124, 130])); r(x - 24, WALL - 2, 48, 2, dk([120, 124, 130])); r(x - 22, WALL + 4, 44, 26, dk([150, 112, 76])); for (let k = 0; k < 5; k++) r(x - 22, WALL + 6 + k * 5, 44, 1, dk([110, 80, 54])); txt('527 STEPS', x - tw('527 STEPS') / 2, WALL - 12, dk(K.WHITE)); }
}
const topLand = landLayer(TW, H, paintTop);
function topBack(a: number): void {
  skyLive(a, TW, THZ, 200);
  topLand();
  const night = nightNow();
  // the falls from above: the water rolling over the lip, the curtain stretching away to its pool far below, the mist boiling up there
  { const cx = (TOP.lip0 + TOP.lip1) / 2, c = nite([240, 246, 250], night); for (let k = 0; k < 6; k++) alpha(0.12, () => oval(Math.round(cx + Math.sin(a * 0.4 + k) * 6), Math.round(WALL - 22 - k * 8 + Math.sin(a * 0.7 + k * 2) * 3), 56 - k * 5, 10, c)); } // (the spray boiling up out of the drop, beyond the lip)
  for (let x = TOP.lip0; x < TOP.lip1; x += 3) r(x, WALL - 12 + Math.round(Math.sin(a * 4 + x) * 1), 3, 2, nite([240, 246, 250], night));
  mist((TOP.lip0 + TOP.lip1) / 2, WALL - 14, 90, 18, a, 6.6);
  // the tiny bus in the car park far below (when it's at Skógafoss)
  { const p = busPose(2); if (p !== null && Math.abs(p) < 0.6) { const bx = TOP.lip0 - 120 - Math.round(p * 80); r(bx, TOP.pool + 3, 14, 5, nite([236, 238, 240], night)); r(bx, TOP.pool + 5, 14, 1, nite([36, 132, 140], night)); } }
  // sheep on the cliff top
  for (const [sx, sy, ph] of [[820, 470, 0.1], [940, 462, 0.5]] as [number, number, number][]) { const t = (a * 0.1 + ph) % 1; sheep(sx + Math.round(Math.sin(t * 6.28) * 6), sy, t < 0.5 ? 1 : -1, [236, 232, 220], (a * 0.3 + ph * 5) % 3 > 1, night); }
}
/** The platform's rail: along its far end and its left end (people on the platform stand in front of it). */
const rail: Prop = { y: 480, draw() { const n = nightNow(), x0 = TOP.platform0, x1 = TOP.platform1; r(x0, WALL - 28, x1 - x0, 2, nite([170, 176, 184], n)); for (let x = x0; x <= x1; x += 18) r(x, WALL - 28, 2, 28, nite([150, 156, 164], n)); r(x0, WALL - 14, x1 - x0, 1, nite([150, 156, 164], n)); } };
const railFront: Prop = { y: 600, draw() { const n = nightNow(), x0 = TOP.platform0; r(x0, WALL - 28, 2, 96, nite([150, 156, 164], n)); for (let y = WALL - 14; y < 566; y += 14) r(x0, y, 2, 1, nite([170, 176, 184], n)); r(x0, 560, EDGE - x0, 2, nite([170, 176, 184], n)); for (let x = x0; x < EDGE; x += 18) r(x, 546, 2, 16, nite([150, 156, 164], n)); } };
export function makeSkogaTop(): Room {
  const room: Room = {
    id: 'skogatop', title: 'THE TOP OF SKOGAFOSS', sub: '527 STEPS UP',
    w: TW, h: H,
    lookAt: (x0, x1) => { const keep = COAST.view; COAST.view = { x0, x1 }; return () => { COAST.view = keep; }; },
    floor: { x0: TOP.platform0 + 12, y0: FL0, x1: TW - 14, y1: 560 },
    blockers: [],
    doors: [{ trigger: { x0: TOP.steps - 18, y0: FL0, x1: TOP.steps + 18, y1: FL0 + 10 }, to: 'skoga', arrive: { x: SKR.steps, y: 500 }, label: 'BACK DOWN THE STEPS', area: { x0: TOP.steps - 26, y0: WALL - 20, x1: TOP.steps + 26, y1: WALL + 30 } }],
    spots: [], inUse: new Map(),
    spawn: { x: TOP.steps, y: 500 },
    dim: 0.1,
    dimNow: () => 0.06 + 0.5 * (1 - iceDay()),
    glowMul: () => 0.4 + 0.6 * (1 - iceDay()),
    fillTop: 'rgb(17,33,58)', fillLow: 'rgb(70,96,52)',
    bg: mk(TW, H), bgAlt: mk(TW, H), altAlpha: () => iceDay(),
    build: () => { paintSky(room.bg.getContext('2d')!, false, TW, H, THZ); paintSky(room.bgAlt!.getContext('2d')!, true, TW, H, THZ); },
    drawBack: topBack, drawFront: (a) => weatherFront(a, H),
    props: [rail, railFront],
    talkers: [
      { id: 'top-view', name: 'THE VIEW', x: 230, y: 420, sx: 240, sy: 520, lines: ['Straight down: the curtain pouring away beneath you, the mist boiling up to meet it.', 'The river winds off to the black sand and the sea. The tiny cars in the car park. Your bus, if it\'s in.', 'Out on the horizon: the Westman Islands.'], verb: 'LOOK' },
      { id: 'top-trail', name: 'THE TRAIL SIGN', x: TOP.trail, y: 470, sx: TOP.trail, sy: 508, lines: ['FIMMVORDUHALS: the trail up past twenty more waterfalls, over the pass between two glaciers, down into THORSMORK. 25 km.', 'Maybe not today.'], verb: 'READ' },
    ],
  };
  return room;
}
void iceWeather; void disc; void line;
