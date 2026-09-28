// THE MAP's ICELAND page (step 19): the whole island in pixels, north up, drawn from real latitudes and longitudes: the coast
// (fjords and all), moss and farmland by the sea, grey-brown highlands inland, the glaciers, the lakes and rivers, the Ring Road
// (the tour bus's road, from push 2), a few towns; KEFLAVÍK and REYKJAVÍK, the places push 1 opened; and the sights the tour bus
// will go to, each with a grey COMING SOON sticker until its push switches it on (game/passport.ts STAMPS says which push).
//
// Like the city's page: baked once by night and once by day (cross-faded by Iceland's own clock, world/iceland.ts), then live:
// the towns' lights, the northern lights over the north when they're out, Iceland's weather, LAB AIR coming in from the south
// (the city's that way) and going back, a geyser, the lagoon's steam, the people, and the panel with tonight's forecast.

import { K, IS, AP, type RGB } from '../engine/palette';
import { r, line, disc, oval, txt, tw, lit, alpha, G, Gd, M, shade, bake } from '../engine/pixel';
import { h1, clamp } from '../engine/math';
import { mmss } from '../engine/format';
import type { RoomId } from './room';
import { MAP_W, MAP_H, R_, inR, drawMarks, type MapLive, type MapPlace } from './mapmarks';
import { iceDay, iceP, auroraNow, forecast, iceWeather, drawAurora, untilDark } from './iceland';
import { air, flying, PUSH_S, ROLL_S, CLIMB_S, TOUCH_S, LEG_S } from '../game/air';
import { STAMPS, PUSH_NOW } from '../game/passport';

/** The projection: map pixels from degrees (west is negative), a touch stretched east-west so the island fills the page. */
const PJ = { x0: 55, y0: 18, sx: 37, sy: 80, lon0: -24.6, lat0: 66.6 };
const fx = (lat: number, lon: number): [number, number] => [PJ.x0 + (lon - PJ.lon0) * PJ.sx, PJ.y0 + (PJ.lat0 - lat) * PJ.sy];
export const iceXY = (lat: number, lon: number): [number, number] => { const [x, y] = fx(lat, lon); return [Math.round(x), Math.round(y)]; };

/** The coast, clockwise from the Reykjanes peninsula's tip ([lat, lon]). */
const COAST: [number, number][] = [
  [63.81, -22.70], [63.90, -22.72], [64.00, -22.70], [64.08, -22.69], [64.05, -22.55], [64.00, -22.45], [63.98, -22.30], [64.06, -22.05], [64.10, -22.02], [64.15, -22.05],
  [64.16, -21.90], [64.18, -21.75], [64.24, -21.72], [64.28, -21.85], [64.33, -21.80], [64.38, -21.40], [64.35, -21.70], [64.33, -22.05], [64.42, -22.05], [64.55, -21.90],
  [64.62, -22.20], [64.70, -22.60], [64.75, -23.10], [64.78, -23.60], [64.86, -24.05], [64.93, -23.80], [64.97, -23.30], [65.05, -22.90], [65.10, -22.50], [65.20, -22.00],
  [65.38, -22.10], [65.45, -22.60], [65.48, -23.30], [65.50, -24.00], [65.50, -24.53], [65.62, -24.20], [65.70, -23.80], [65.85, -23.90], [65.95, -23.70], [66.05, -23.60],
  [66.10, -23.30], [66.00, -22.90], [66.05, -22.60], [66.20, -22.80], [66.35, -22.90], [66.45, -22.45], [66.40, -22.00], [66.25, -21.70], [66.05, -21.50], [65.85, -21.35],
  [65.70, -21.05], [65.60, -21.20], [65.45, -20.95], [65.55, -20.40], [65.70, -20.30], [65.95, -20.20], [66.10, -19.95], [65.95, -19.70], [65.75, -19.60], [65.90, -19.30],
  [66.10, -19.05], [66.17, -18.85], [66.10, -18.50], [65.90, -18.30], [65.70, -18.10], [65.85, -18.05], [66.05, -18.10], [66.12, -17.85], [66.05, -17.40], [66.15, -17.10],
  [66.25, -16.80], [66.45, -16.35], [66.54, -16.05], [66.45, -15.80], [66.30, -15.60], [66.15, -15.30], [66.25, -15.00], [66.38, -14.55], [66.25, -14.90], [66.05, -14.95],
  [65.85, -14.85], [65.75, -14.70], [65.60, -14.25], [65.50, -13.80], [65.30, -13.60], [65.08, -13.50], [64.95, -13.70], [64.85, -13.95], [64.70, -14.10], [64.60, -14.35],
  [64.45, -14.60], [64.33, -14.95], [64.25, -15.25], [64.15, -15.70], [64.05, -16.20], [63.95, -16.50], [63.80, -16.65], [63.75, -17.10], [63.70, -17.60], [63.60, -18.00],
  [63.50, -18.40], [63.42, -18.80], [63.40, -19.13], [63.47, -19.45], [63.52, -19.80], [63.58, -20.20], [63.68, -20.60], [63.78, -20.95], [63.83, -21.20], [63.86, -21.45],
  [63.84, -21.80], [63.83, -22.10], [63.83, -22.43], [63.80, -22.60],
];
/** The glaciers: [lat, lon, rx, ry] (px) and their tongues (the big one's outlet glaciers creep down towards the south coast). */
const ICECAPS: [number, number, number, number][] = [
  [64.42, -16.75, 50, 26], [64.12, -16.95, 8, 7], [64.10, -16.35, 8, 7], [64.20, -17.60, 9, 7], [64.18, -15.80, 7, 6], // VATNAJÖKULL and its tongues
  [64.66, -20.20, 9, 12], [64.81, -18.85, 11, 8], [63.65, -19.10, 12, 6], [63.63, -19.62, 5, 3], [66.15, -22.25, 7, 5], [64.80, -23.78, 3, 2],
];
/** The lakes: [lat, lon, rx, ry]. */
const LAKES: [number, number, number, number][] = [[64.18, -21.15, 3, 5], [65.60, -17.00, 3, 2], [64.05, -16.20, 2, 1]];
/** The lowlands, where the farms are (wider than the strip by the sea): the south, Borgarfjörður, the northern valleys, the east's. */
const LOWLANDS: [number, number, number, number][] = [[63.95, -20.60, 44, 17], [64.62, -21.70, 15, 9], [65.55, -19.40, 6, 12], [65.55, -18.10, 4, 10], [65.20, -14.60, 8, 10], [64.00, -21.60, 12, 6]];
/** Islands too small for the coast line: Grímsey on the Arctic Circle, the Westman Islands (the puffins!) off the south coast. */
const ISLES: [number, number, number][] = [[66.54, -18.00, 1], [63.43, -20.27, 2], [63.41, -20.35, 1], [63.30, -20.60, 1]];
/** Rivers (a few of the big ones), from the ice to the sea. */
const RIVERS: [number, number][][] = [
  [[64.55, -18.95], [64.30, -19.35], [64.05, -19.95], [63.85, -20.50], [63.77, -20.85]],
  [[64.52, -20.05], [64.33, -20.12], [64.10, -20.55], [63.93, -21.00], [63.86, -21.18]],
  [[64.72, -16.55], [65.30, -16.40], [65.81, -16.38], [66.08, -16.50]],
  [[64.82, -17.60], [65.40, -17.50], [65.95, -17.48]],
  [[64.75, -15.40], [65.25, -14.55], [65.58, -14.38]],
];
/** Route 1, the Ring Road, round the island through the towns. */
const RING: [number, number][] = [
  [64.13, -21.85], [64.00, -21.19], [63.93, -21.00], [63.83, -20.40], [63.75, -20.23], [63.53, -19.50], [63.43, -19.00], [63.79, -18.05], [63.98, -16.90], [64.06, -16.18],
  [64.28, -15.25], [64.65, -14.28], [64.80, -14.02], [65.26, -14.40], [65.60, -17.00], [65.68, -18.09], [65.55, -19.45], [65.66, -20.28], [65.40, -20.90], [64.54, -21.92],
  [64.35, -21.80], [64.13, -21.85],
];
const TOWNS: [string, number, number, -1 | 1][] = [['AKUREYRI', 65.68, -18.09, 1], ['ISAFJORDUR', 66.07, -23.13, 1], ['EGILSSTADIR', 65.26, -14.41, -1], ['HOFN', 64.25, -15.21, 1], ['VIK', 63.42, -19.01, 1]];

/** KEFLAVÍK airport and REYKJAVÍK on the page. */
const KEF = iceXY(63.99, -22.62), RVK = iceXY(64.146, -21.94);
export const ICE_PLACES: MapPlace[] = [
  { id: 'kef', name: 'KEFLAVIK AIRPORT', hits: [R_(KEF[0] - 10, KEF[1] - 7, KEF[0] + 8, KEF[1] + 6)], at: [KEF[0] + 1, KEF[1] + 5], zone: 'iceland', pick: true, tag: [KEF[0] - 16, KEF[1] - 12], page: 'iceland' },
  { id: 'reykjavik', name: 'REYKJAVIK', hits: [R_(RVK[0] - 8, RVK[1] - 10, RVK[0] + 11, RVK[1] + 6)], at: [RVK[0] + 1, RVK[1] + 5], zone: 'iceland', pick: true, tag: [RVK[0] + 12, RVK[1] - 14], page: 'iceland' },
];
/** Where Iceland's map boards stand: KEF's arrivals hall map, Reykjavík's INFO kiosk (the YOU ARE HERE star). */
export const ICE_BOARDS: Partial<Record<RoomId, [number, number]>> = { kef: [KEF[0] + 3, KEF[1] - 3], reykjavik: [RVK[0] - 4, RVK[1] + 1] };

type SightKind = 'fall' | 'beach' | 'wreck' | 'rift' | 'geyser' | 'lagoon' | 'glacier' | 'cave' | 'bergs' | 'diamond';
/**
 * The tour bus's sights (pushes 2-4): where, what to draw, and where their sticker goes (t: from the sight; they're close together in
 * the south, so some go below). The stamp list (game/passport.ts) says which push opens each one.
 */
const SIGHTS: { id: string; at: [number, number]; kind: SightKind; t: [number, number] }[] = [
  { id: 'seljaland', at: iceXY(63.62, -19.99), kind: 'fall', t: [3, -9] }, { id: 'skoga', at: iceXY(63.53, -19.51), kind: 'fall', t: [3, -9] },
  { id: 'wreck', at: iceXY(63.46, -19.36), kind: 'wreck', t: [-2, 3] }, { id: 'beach', at: iceXY(63.40, -19.04), kind: 'beach', t: [4, 0] },
  { id: 'thingvellir', at: iceXY(64.26, -21.13), kind: 'rift', t: [3, -9] }, { id: 'geysir', at: iceXY(64.30, -20.32), kind: 'geyser', t: [3, -9] },
  { id: 'gullfoss', at: iceXY(64.34, -20.06), kind: 'fall', t: [3, -9] }, { id: 'lagoon', at: iceXY(63.88, -22.45), kind: 'lagoon', t: [3, 2] },
  { id: 'glacier', at: iceXY(64.02, -16.97), kind: 'glacier', t: [3, -9] }, { id: 'icecave', at: iceXY(64.25, -16.40), kind: 'cave', t: [3, -9] },
  { id: 'jokulsarlon', at: iceXY(64.09, -16.25), kind: 'bergs', t: [3, -9] }, { id: 'diamond', at: iceXY(64.06, -16.08), kind: 'diamond', t: [4, 2] },
];
const soon = (id: string): boolean => (STAMPS.find((s) => s.id === id)?.push ?? 9) > PUSH_NOW;
const sightBox = (s: { at: [number, number] }) => R_(s.at[0] - 4, s.at[1] - 5, s.at[0] + 5, s.at[1] + 3);
/** The sight under map pixel (x, y) (its stamp id), for the hover's label. */
export function sightAt(x: number, y: number): string | null { return SIGHTS.find((s) => inR(sightBox(s), x, y))?.id ?? null; }

// =====================================================================================
// THE LAND AND THE SEA (worked out once)
// =====================================================================================
let MASK: Uint8Array | null = null, DL: Uint8Array | null = null, DS: Uint8Array | null = null;
/** Steps from every pixel matching `from` (0 there), out to 40. */
function spread(from: (i: number) => boolean): Uint8Array {
  const d = new Uint8Array(MAP_W * MAP_H).fill(255), q: number[] = [];
  for (let i = 0; i < d.length; i++) if (from(i)) { d[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % MAP_W, nd = d[i] + 1; if (nd > 40) continue;
    if (x > 0 && d[i - 1] > nd) { d[i - 1] = nd; q.push(i - 1); } if (x < MAP_W - 1 && d[i + 1] > nd) { d[i + 1] = nd; q.push(i + 1); }
    if (i >= MAP_W && d[i - MAP_W] > nd) { d[i - MAP_W] = nd; q.push(i - MAP_W); } if (i + MAP_W < d.length && d[i + MAP_W] > nd) { d[i + MAP_W] = nd; q.push(i + MAP_W); }
  }
  return d;
}
/** Land (1) or sea (0), filled from the coast line (scanlines, even-odd), and how far each pixel is from the other. */
function land(): Uint8Array {
  if (MASK) return MASK;
  const m = new Uint8Array(MAP_W * MAP_H), pts = COAST.map(([la, lo]) => fx(la, lo));
  for (let y = 0; y < MAP_H; y++) {
    const yc = y + 0.5, xs: number[] = [];
    for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; if ((y0 <= yc) !== (y1 <= yc)) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.round(xs[k])); x < Math.min(MAP_W, Math.round(xs[k + 1])); x++) m[y * MAP_W + x] = 1;
  }
  MASK = m; DL = spread((i) => !m[i]); DS = spread((i) => m[i] === 1);
  return m;
}
/** Smooth noise (0..1): the hash on a grid of `cell` px, blended between the corners. */
function sn(x: number, y: number, cell: number, seed: number): number {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell), u = x / cell - gx, v = y / cell - gy, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const c = (i: number, j: number) => h1((gx + i) * 12.9898 + (gy + j) * 78.233 + seed);
  return (c(0, 0) * (1 - su) + c(1, 0) * su) * (1 - sv) + (c(0, 1) * (1 - su) + c(1, 1) * su) * sv;
}
/** How iced a pixel is (below 0 none; a little: the ice's blue edge; more: white). */
function ice(x: number, y: number): number {
  let g = -1;
  for (const [la, lo, rx, ry] of ICECAPS) { const [cx, cy] = fx(la, lo), dx = (x - cx) / rx, dy = (y - cy) / ry, k = 1 - (dx * dx + dy * dy); if (k > -0.4) g = Math.max(g, k + (sn(x, y, 5, 3) - 0.5) * 0.4); }
  return g;
}
/** How lowland a pixel is (0..1). */
function low(x: number, y: number): number {
  let g = 0;
  for (const [la, lo, rx, ry] of LOWLANDS) { const [cx, cy] = fx(la, lo), dx = (x - cx) / rx, dy = (y - cy) / ry; g = Math.max(g, 1 - (dx * dx + dy * dy)); }
  return clamp(g * 1.6 + (sn(x, y, 7, 11) - 0.5) * 0.5, 0, 1);
}
/** The land's height for the hill shading (0..1): up from the coast, lumpy, flatter in the lowlands. */
const height = (x: number, y: number, d: number): number => (Math.min(d, 26) / 26) * (1 - 0.7 * low(x, y)) + (sn(x, y, 6, 5) - 0.5) * 0.35 + (sn(x, y, 3, 9) - 0.5) * 0.12;

// =====================================================================================
// THE BAKED PAGE (night and day)
// =====================================================================================
export function paintIceland(ctx: CanvasRenderingContext2D, day: boolean): void {
  const m = land(), dl = DL!, ds = DS!, img = ctx.createImageData(MAP_W, MAP_H), D = img.data;
  const put = (i: number, c: RGB) => { D[i * 4] = c[0]; D[i * 4 + 1] = c[1]; D[i * 4 + 2] = c[2]; D[i * 4 + 3] = 255; };
  const dn = (n: RGB, d: RGB): RGB => (day ? d : n);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const i = y * MAP_W + x, n = h1(x * 0.37 + y * 1.91) * 0.5 + h1(Math.floor(x / 5) * 3.1 + Math.floor(y / 5) * 7.7) * 0.5;
    if (!m[i]) { // the sea: shallows by the coast, a dark line of surf, the open sea darker to the north
      const d = ds[i], deep = dn(M(IS.SEA_NIGHT, [8, 22, 40], y / MAP_H), M(IS.SEA, IS.SEA_DK, 0.7 - (y / MAP_H) * 0.5)), sh = dn([24, 50, 70], [80, 150, 180]);
      put(i, d <= 1 ? dn([60, 90, 110], IS.FOAM) : d <= 4 ? M(sh, deep, (d - 1) / 4) : ((x * 7 + y * 13) % 97 === 0 ? shade(deep, 1.25) : deep));
      continue;
    }
    const d = Math.min(dl[i], 40), g = ice(x, y), sl = clamp((height(x - 1, y - 1, d) - height(x + 1, y + 1, d)) * 7, -1, 1); // (lit from the north-west)
    if (g > 0.1) { // the ice: a blue rim, then white, shaded like the ground under it
      const c = g < 0.17 ? dn([80, 100, 136], IS.ICE_DK) : g < 0.26 ? dn([140, 160, 190], IS.ICE) : dn(M([190, 200, 222], [150, 164, 196], clamp(0.5 - sl, 0, 1)), M(K.WHITE, IS.SNOW_DK, clamp(0.45 - sl * 0.8 + (n - 0.5) * 0.3, 0, 1)));
      put(i, c); continue;
    }
    // by the sea (and in the valleys): moss and farms; inland: the highlands' grey-brown sand and dark lava; hills lit from the north-west
    const lw = low(x, y), hi = clamp((d - 4 + (n - 0.5) * 6) / 10, 0, 1) * (1 - lw), lava = sn(x, y, 8, 21) > 0.72;
    const lowC = dn(M([34, 52, 38], [28, 44, 32], n), M(IS.MOSS, IS.GREEN, n * 0.8)), highC = lava ? dn([38, 38, 46], M([112, 106, 100], [120, 114, 106], n)) : dn(M([46, 46, 54], [40, 40, 48], n), M([156, 142, 116], [134, 126, 110], n));
    let c = shade(M(lowC, highC, hi), 1 + sl * 0.16);
    if (g > 0.02) c = M(c, dn([66, 70, 84], [150, 146, 138]), 0.6); // the gravel the ice has left
    if (y > 222 && x > 180 && x < 390 && d <= 3) c = dn([22, 22, 28], IS.BLACKSAND);
    if (x < 150 && y > 218 && h1(Math.floor(x / 3) * 5.3 + Math.floor(y / 3) * 2.9) > 0.45) c = dn([30, 30, 36], M(IS.LAVA, IS.BASALT_HI, n * 0.5));
    if (d === 1) c = shade(c, 0.85); // the shore's edge
    put(i, c);
  }
  ctx.putImageData(img, 0, 0);
  bake(ctx, () => {
    // the grid of latitudes and longitudes (faint), and the Arctic Circle, which just clips the island's top
    for (const la of [64, 65, 66]) { const y = iceXY(la, 0)[1]; for (let x = 0; x < MAP_W; x += 4) if (!m[y * MAP_W + x]) r(x, y, 2, 1, dn([30, 50, 74], [110, 160, 196])); }
    for (let lo = -24; lo <= -14; lo += 2) { const x = iceXY(0, lo)[0]; for (let y = 0; y < MAP_H; y += 4) if (!m[y * MAP_W + x]) r(x, y, 1, 2, dn([30, 50, 74], [110, 160, 196])); }
    { const y = iceXY(66.56, 0)[1]; for (let x = 0; x < MAP_W; x += 6) r(x, y, 3, 1, dn([150, 150, 190], [230, 240, 250])); txt('ARCTIC CIRCLE', 8, y - 6, dn([150, 150, 190], [230, 240, 250])); }
    // mountains in the highlands: little peaks, snow on their tops
    for (let k = 0; k < 150; k++) { const x = 60 + Math.floor(h1(k * 3.3 + 1) * 410), y = 30 + Math.floor(h1(k * 7.9 + 2) * 240), i = y * MAP_W + x; if (!m[i] || dl[i] < 7) continue;
      if (ice(x, y) > -0.1 || low(x, y) > 0.3) continue;
      const hgt = 2 + Math.floor(h1(k * 1.7) * 2); for (let j = 0; j < hgt; j++) r(x - j, y - hgt + 1 + j, j * 2 + 1, 1, dn([56, 56, 66], [96, 90, 84])); r(x, y - hgt + 1, 1, 1, dn([150, 160, 186], IS.SNOW)); r(x + 1, y - hgt + 2, hgt - 1, hgt - 1, dn([34, 34, 42], [80, 76, 72])); }
    for (const [la, lo, rr] of ISLES) { const [x, y] = iceXY(la, lo); r(x - 1, y - 1, rr + 2, rr + 2, dn([60, 90, 110], IS.FOAM)); r(x, y, rr, rr, dn([34, 52, 38], IS.MOSS)); }
    // HEKLA: the volcano, a snowy cone
    { const [x, y] = iceXY(63.99, -19.67); for (let j = 0; j < 4; j++) r(x - j, y - 3 + j, j * 2 + 1, 1, dn([60, 58, 66], [84, 78, 74])); r(x - 1, y - 3, 3, 2, dn([170, 180, 200], IS.SNOW)); r(x, y - 4, 1, 1, dn([80, 60, 60], [120, 80, 70])); }
    // lakes and rivers
    for (const [la, lo, rx, ry] of LAKES) { const [x, y] = iceXY(la, lo); oval(x, y, rx, ry, dn([30, 60, 90], [70, 140, 200])); }
    for (const rv of RIVERS) for (let i = 0; i < rv.length - 1; i++) { const [x0, y0] = iceXY(...rv[i]), [x1, y1] = iceXY(...rv[i + 1]); line(x0, y0, x1, y1, dn([40, 70, 100], [90, 160, 210])); }
    // the Ring Road: a dotted line round the island (the tour bus's road)
    for (let i = 0; i < RING.length - 1; i++) { const [x0, y0] = fx(...RING[i]), [x1, y1] = fx(...RING[i + 1]), n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let k = 0; k < n; k++) if (k % 3 < 2) r(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), 1, 1, dn([150, 130, 90], [240, 214, 150])); }
    // the towns
    for (const [name, la, lo, side] of TOWNS) { const [x, y] = iceXY(la, lo); r(x - 1, y - 1, 3, 3, dn([30, 30, 40], [60, 50, 50])); r(x, y, 1, 1, dn([255, 220, 150], K.WHITE)); const w = tw(name); txt(name, side > 0 ? x + 4 : x - 3 - w, y - 2, dn([150, 156, 176], [50, 56, 70])); }
    // the sights (the tour bus's, from push 2)
    for (const s of SIGHTS) sight(s.kind, s.at[0], s.at[1], day);
    // KEFLAVÍK: two runways crossing, the terminal, the tower
    { const [x, y] = KEF; line(x - 8, y + 3, x + 6, y - 1, dn([34, 36, 44], [70, 72, 80])); line(x - 8, y + 4, x + 6, y, dn([34, 36, 44], [70, 72, 80])); line(x - 5, y - 4, x - 1, y + 5, dn([34, 36, 44], [70, 72, 80]));
      r(x + 1, y + 2, 6, 3, dn([150, 150, 160], AP.WALL)); r(x + 1, y + 2, 6, 1, dn(AP.TEAL_DK, AP.TEAL)); r(x + 7, y, 1, 4, dn([150, 150, 160], K.WHITE)); }
    // REYKJAVÍK: the rainbow of roofs, HARPA by the harbour, the church's tower over it all
    { const [x, y] = RVK, roofs: RGB[] = [IS.ROOF_RED, IS.MUSTARD, IS.TEAL, IS.ROOF_GREEN, IS.BLUE, IS.RED];
      for (let k = 0; k < 14; k++) { const hx = x - 6 + (k % 7) * 2, hy = y + 1 + Math.floor(k / 7) * 2 - (k % 7 === 3 ? 1 : 0); r(hx, hy, 2, 1, day ? roofs[k % roofs.length] : shade(roofs[k % roofs.length], 0.45)); r(hx, hy + 1, 2, 1, dn([60, 56, 60], IS.WHITE)); }
      r(x + 3, y + 4, 4, 2, dn(IS.HARPA_DK, IS.HARPA)); r(x + 3, y + 4, 4, 1, dn(IS.HARPA, IS.HARPA_HI));
      r(x - 1, y - 7, 1, 8, dn([150, 150, 150], IS.CHURCH_HI)); r(x - 2, y - 3, 3, 4, dn([130, 128, 124], IS.CHURCH)); r(x - 3, y - 1, 5, 2, dn([110, 108, 104], IS.CHURCH_DK)); }
    // the names of the two places push 1 opened, on little labels in the sea
    label('KEFLAVIK', KEF[0] - 42, KEF[1] + 6, day); label('REYKJAVIK', RVK[0] - 46, RVK[1] - 9, day);
    // the compass rose, the scale bar, the panel for tonight's forecast (its words are live)
    { const cx = 526, cy = 262, c = dn([150, 160, 190], [240, 244, 250]), c2 = dn([70, 80, 110], [120, 150, 180]);
      for (const [dx, dy, col] of [[0, 1, c2], [1, 0, c2], [-1, 0, c2], [0, -1, c]] as [number, number, RGB][]) for (let k = 1; k <= 10; k++) { const hw = Math.max(0, Math.floor((10 - k) / 4)); r(cx + dx * k - (dy ? hw : 0), cy + dy * k - (dx ? hw : 0), dy ? hw * 2 + 1 : 1, dx ? hw * 2 + 1 : 1, col); }
      disc(cx, cy, 2, c2); r(cx, cy, 1, 1, c); txt('N', cx - 1, cy - 18, c); }
    { const x0 = 452, y0 = 288, km = 37 * 100 / 47 / 2; r(x0, y0, Math.round(km * 2), 1, dn([150, 160, 190], [240, 244, 250])); for (const k of [0, 1, 2]) r(x0 + Math.round(km * k), y0 - 2, 1, 3, dn([150, 160, 190], [240, 244, 250])); r(x0, y0 - 1, Math.round(km), 1, dn([150, 160, 190], [240, 244, 250])); txt('100 KM', x0 + Math.round(km * 2) + 4, y0 - 2, dn([150, 160, 190], [240, 244, 250])); }
    { const [x0, y0, w, h] = PANEL; r(x0 - 1, y0 - 1, w + 2, h + 2, [12, 14, 26]); r(x0, y0, w, h, [20, 24, 42]); r(x0, y0, w, 1, [58, 66, 102]); txt('ICELAND', x0 + 4, y0 + 3, [255, 214, 90]); }
  });
}
/** Tonight's forecast panel: [x, y, w, h]. */
const PANEL: [number, number, number, number] = [474, 10, 80, 50];
function label(s: string, x: number, y: number, day: boolean): void {
  const w = tw(s) + 4; r(x, y, w, 7, day ? [255, 250, 240] : [16, 18, 30]); r(x, y + 7, w, 1, day ? [120, 140, 160] : [6, 8, 16]); txt(s, x + 2, y + 1, day ? [30, 40, 56] : [236, 232, 214]);
}
/** A sight's little picture. */
function sight(kind: SightKind, x: number, y: number, day: boolean): void {
  const dn = (n: RGB, d: RGB): RGB => (day ? d : n), rock = dn([40, 40, 48], [80, 76, 72]), water = dn([120, 170, 220], [200, 236, 255]);
  switch (kind) {
    case 'fall': r(x - 2, y - 3, 5, 1, rock); r(x - 2, y - 2, 1, 4, rock); r(x + 2, y - 2, 1, 4, rock); r(x - 1, y - 2, 3, 4, water); r(x - 2, y + 2, 5, 1, dn([60, 100, 140], [120, 190, 230])); break;
    case 'beach': r(x - 3, y, 7, 1, dn([20, 20, 26], IS.BLACKSAND)); r(x + 2, y - 3, 1, 3, rock); r(x + 4, y - 2, 1, 2, rock); break;
    case 'wreck': r(x - 3, y - 1, 7, 1, dn([90, 90, 100], [170, 170, 176])); r(x - 1, y - 2, 1, 3, dn([90, 90, 100], [150, 150, 156])); r(x + 3, y - 2, 1, 1, dn([90, 90, 100], [150, 150, 156])); break;
    case 'rift': line(x - 3, y - 3, x + 2, y + 2, dn([20, 20, 26], [40, 40, 44])); line(x - 2, y - 3, x + 3, y + 2, dn([20, 20, 26], [40, 40, 44])); break;
    case 'geyser': r(x, y - 1, 1, 2, water); disc(x, y + 1, 1, dn([60, 90, 110], [140, 190, 210])); break;
    case 'lagoon': oval(x, y, 2, 1, dn([60, 150, 160], [110, 210, 220])); break;
    case 'glacier': r(x, y - 4, 1, 4, K.RED); r(x + 1, y - 4, 2, 2, K.RED); break;
    case 'cave': r(x - 2, y - 2, 5, 3, dn([80, 120, 170], IS.ICE_DK)); r(x - 1, y - 1, 3, 2, dn([20, 40, 80], [40, 80, 150])); break;
    case 'bergs': r(x - 2, y, 2, 1, K.WHITE); r(x + 1, y - 1, 2, 1, K.WHITE); r(x + 1, y + 1, 1, 1, IS.ICE); break;
    case 'diamond': r(x - 3, y, 7, 1, dn([20, 20, 26], IS.BLACKSAND)); r(x - 2, y - 1, 1, 1, IS.ICE); r(x + 1, y - 1, 1, 1, K.WHITE); r(x + 3, y - 1, 1, 1, IS.ICE); break;
  }
}

// =====================================================================================
// THE LIVE LAYER
// =====================================================================================
/** LAB AIR's way in from the south (the city's that way) to KEF's runway, and where it parks. */
const ROUTE: [[number, number], [number, number], [number, number]] = [[214, 308], [176, 262], [KEF[0] - 3, KEF[1] + 2]];
const GATE: [number, number] = [KEF[0] + 3, KEF[1] + 1];
const qb = (p0: [number, number], c: [number, number], p1: [number, number], u: number): [number, number] => [(1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p1[0], (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p1[1]];
/** The part of the flight that's over Iceland's waters (the rest is the open sea). */
const NEAR = 0.45;
/** Where LAB AIR is on Iceland's page (null: at the city, or out over the open sea), and which way it's heading (radians). */
function iceJet(): { x: number; y: number; ang: number; up: boolean } | null {
  const A = air(), k = A.k, sm = (u: number) => u * u * (3 - 2 * u), toKef = Math.atan2(ROUTE[2][1] - ROUTE[1][1], ROUTE[2][0] - ROUTE[1][0]);
  const along = (v: number, back: boolean) => { const [x, y] = qb(ROUTE[0], ROUTE[1], ROUTE[2], v), [x2, y2] = qb(ROUTE[0], ROUTE[1], ROUTE[2], Math.min(1, v + 0.02)); const ang = Math.atan2(y2 - y, x2 - x) + (back ? Math.PI : 0); return { x, y, ang, up: true }; };
  if (A.to === 'kef') {
    if (k >= TOUCH_S) { const u = sm((k - TOUCH_S) / (LEG_S - TOUCH_S)); return { x: ROUTE[2][0] + (GATE[0] - ROUTE[2][0]) * u, y: ROUTE[2][1] + (GATE[1] - ROUTE[2][1]) * u, ang: toKef, up: false }; }
    return flying(A) && A.u > 1 - NEAR ? along((A.u - (1 - NEAR)) / NEAR, false) : null;
  }
  if (k < PUSH_S) return { x: GATE[0], y: GATE[1], ang: toKef + Math.PI, up: false };
  if (k < ROLL_S) { const u = sm((k - PUSH_S) / (ROLL_S - PUSH_S)); return { x: GATE[0] + (ROUTE[2][0] - GATE[0]) * u, y: GATE[1] + (ROUTE[2][1] - GATE[1]) * u, ang: toKef + Math.PI, up: false }; }
  return A.u < NEAR ? { ...along(1 - A.u / NEAR, true), up: k >= CLIMB_S } : null;
}
/** Where someone in room `id` is drawn on this page (null: not in Iceland). */
export function iceSpotOf(id: RoomId): [number, number] | null {
  if (id === 'plane') { const j = iceJet(); return j ? [Math.round(j.x), Math.round(j.y)] : flying(air()) ? [206, 294] : null; }
  const p = ICE_PLACES.find((q) => q.id === id); return p ? p.at : null;
}
/** A little plane seen from above, nose along `ang`. */
function topJet(x: number, y: number, ang: number, c: RGB): void {
  const ca = Math.cos(ang), sa = Math.sin(ang), P = (f: number, s: number): [number, number] => [Math.round(x + ca * f - sa * s), Math.round(y + sa * f + ca * s)];
  const seg = (a: [number, number], b: [number, number]) => line(a[0], a[1], b[0], b[1], c);
  seg(P(-3, 0), P(3, 0)); seg(P(0.5, -3), P(0.5, 3)); seg(P(-3, -1.5), P(-3, 1.5));
}

export function drawIcelandLive(L: MapLive, hoverSight: string | null): void {
  const a = L.a, day = iceDay(), night = 1 - day, w = iceWeather(), au = auroraNow(), fc = forecast();
  // ---- the northern lights, rippling over the north of the island when they're out ----
  if (au.vis > 0.01) drawAurora(20, 470, -10, 96, au.kp, au.vis, a, 0.35);
  // ---- the lights at night: the towns, Reykjavík and its church, KEF's runways ----
  if (night > 0.1) {
    for (const [, la, lo] of TOWNS) { const [x, y] = iceXY(la, lo); lit(() => r(x, y, 1, 1, [255, 220, 150])); Gd(x, y, 4, [255, 210, 140], 0.35 * night); }
    { const [x, y] = RVK; G(x - 7, y - 1, 16, 6, [255, 200, 130], 0.25 * night); lit(() => { for (let k = 0; k < 7; k++) if ((a * 0.7 + h1(k)) % 1 < 0.8) r(x - 6 + Math.floor(h1(k * 3.1) * 13), y + 1 + Math.floor(h1(k * 7.3) * 4), 1, 1, [255, 226, 160]); r(x - 1, y - 7, 1, 3, [255, 244, 220]); }); Gd(x - 1, y - 5, 5, [255, 240, 210], 0.4 * night);
      const hue = (a * 0.2) % 1, hc: RGB = hue < 0.5 ? M([60, 200, 255], [255, 90, 180], hue * 2) : M([255, 90, 180], [60, 200, 255], (hue - 0.5) * 2); lit(() => r(x + 3, y + 4, 4, 2, hc)); Gd(x + 5, y + 5, 4, hc, 0.4 * night); }
    { const [x, y] = KEF, run = Math.floor(a * 5) % 4; lit(() => { for (let k = 0; k < 8; k += 2) r(x - 8 + k * 2, y + 3 - Math.round(k * 0.55), 1, 1, [180, 210, 255]); r(x - 11 + run, y + 4, 1, 1, K.WHITE); }); Gd(x - 2, y + 2, 6, [170, 200, 255], 0.3 * night); }
  }
  // ---- steam from the lagoon, a geyser going off every so often, the waterfalls' spray ----
  { const s = SIGHTS.find((q) => q.id === 'lagoon')!; for (let k = 0; k < 3; k++) { const u = (a * 0.25 + k / 3) % 1; alpha(0.5 * (1 - u), () => r(s.at[0] - 1 + Math.round(Math.sin(a + k) * 1.5), s.at[1] - 1 - Math.round(u * 6), 2, 1, [236, 244, 250])); } }
  { const s = SIGHTS.find((q) => q.id === 'geysir')!, t = a % 9; if (t < 1.6) { const hgt = Math.round(Math.sin((t / 1.6) * Math.PI) * 9); lit(() => { r(s.at[0], s.at[1] - hgt, 1, hgt, [230, 244, 255]); r(s.at[0] - 1, s.at[1] - hgt, 3, 1, K.WHITE); }); alpha(0.4, () => disc(s.at[0], s.at[1] - hgt, 2, [240, 248, 255])); } }
  for (const s of SIGHTS) if (s.kind === 'fall' && (a * 3 + s.at[0]) % 1 < 0.5) lit(() => r(s.at[0], s.at[1] - 1 + Math.floor((a * 6) % 3), 1, 1, K.WHITE));
  // ---- a whale's tail in the bay now and then (the whale-watching boats go out of Reykjavík) ----
  { const t = a % 17; if (t < 3) { const [x, y] = iceXY(64.40, -23.05), k = Math.sin((t / 3) * Math.PI), hgt = Math.round(k * 3), c: RGB = day > 0.5 ? [40, 50, 62] : [20, 26, 38]; alpha(Math.min(1, k * 2), () => { r(x - 3, y - hgt, 2, 1, c); r(x + 2, y - hgt, 2, 1, c); r(x - 1, y - hgt + 1, 3, hgt, c); r(x, y - hgt + 1, 1, 1, shade(c, 1.4)); }); } }
  // ---- the weather: clouds drifting east on the wind, snow, drizzle, a gale's streaks ----
  if (w.kind !== 'clear' && w.k > 0.02) {
    const cover = w.kind === 'gale' ? 0.35 : w.kind === 'cloudy' ? 0.8 : 0.9, sp = w.kind === 'gale' ? 14 : 4;
    alpha(0.45 * w.k * cover, () => { for (let k = 0; k < 9; k++) { const x = ((h1(k * 2.3) * (MAP_W + 120) + a * sp * (0.6 + h1(k) * 0.6)) % (MAP_W + 120)) - 60, y = 20 + Math.floor(h1(k * 5.1) * 240); oval(Math.round(x), y, 22 + Math.floor(h1(k * 3.7) * 18), 7, day > 0.5 ? [236, 240, 246] : [70, 76, 96]); oval(Math.round(x) + 9, y - 4, 12, 5, day > 0.5 ? K.WHITE : [84, 90, 110]); } });
    if (w.kind === 'snow') lit(() => { for (let i = 0; i < 90; i++) { const x = (h1(i * 1.7) * MAP_W + a * 5 + Math.sin(a + i) * 3) % MAP_W, y = (h1(i * 3.1) * MAP_H + a * 14) % MAP_H; alpha(w.k, () => r(Math.round(x), Math.round(y), 1, 1, K.WHITE)); } });
    if (w.kind === 'drizzle') alpha(w.k * 0.4, () => { for (let i = 0; i < 70; i++) { const x = (h1(i * 1.3) * (MAP_W + 40) + a * 20) % (MAP_W + 40) - 20, y = (h1(i * 2.9) * MAP_H + a * 120) % MAP_H; line(Math.round(x), Math.round(y), Math.round(x) - 1, Math.round(y) + 3, [170, 190, 220]); } });
    if (w.kind === 'gale') alpha(w.k * 0.5, () => { for (let i = 0; i < 26; i++) { const x = (h1(i * 4.3) * (MAP_W + 80) + a * 90) % (MAP_W + 80) - 40, y = Math.floor(h1(i * 6.1) * MAP_H); r(Math.round(x), y, 8, 1, [220, 230, 240]); } });
  }
  // ---- LAB AIR: its route in (faint), then the jet, with its shadow on the sea while it's up ----
  for (let k = 0; k < 14; k++) { const u = (k + (a * 0.6) % 1) / 14, [x, y] = qb(ROUTE[0], ROUTE[1], ROUTE[2], u); alpha(0.35, () => r(Math.round(x), Math.round(y), 1, 1, [230, 236, 250])); }
  { const j = iceJet(); if (j) { if (j.up) alpha(0.3, () => topJet(j.x + 2, j.y + 3, j.ang, [0, 0, 0])); topJet(j.x, j.y, j.ang, M(K.WHITE, [170, 180, 210], night * 0.4)); if ((a * 1.4) % 1 < 0.3) { lit(() => r(Math.round(j.x), Math.round(j.y), 1, 1, [255, 70, 60])); Gd(j.x, j.y, 3, [255, 70, 60], 0.4); } } }
  // ---- the forecast panel: day or night (and how long till it changes), tonight's aurora ----
  { const [x0, y0] = PANEL, p = iceP(), dark = untilDark(), c1: RGB = [232, 216, 192], c2: RGB = [159, 239, 255];
    lit(() => {
      const time = day <= 0.01 ? 'NIGHT' : day >= 0.99 ? 'DAY' : p < 0.6 ? 'DAWN' : 'DUSK';
      const next = dark > 0 ? 'DARK IN ' + mmss(dark) : 'DAWN IN ' + mmss(Math.max(0, 0.45 - p) * 1200);
      txt(time, x0 + 4, y0 + 11, c1); txt(next, x0 + 76 - tw(next), y0 + 11, [150, 156, 176]);
      txt('AURORA KP ' + fc.kp, x0 + 4, y0 + 21, c2);
      for (let k = 0; k < 9; k++) r(x0 + 4 + k * 8, y0 + 29, 6, 4, k < fc.kp ? (k >= 6 ? [255, 110, 200] : [80, 255, 150]) : [44, 50, 74]);
      const say = au.vis > 0.3 ? 'OUT NOW!' : fc.verdict + (fc.cloud >= 80 && fc.kp > 0 ? ' CLOUD' : '');
      txt(say, x0 + 4, y0 + 39, au.vis > 0.3 ? [120, 255, 170] : fc.verdict === 'NONE' ? [150, 156, 176] : [255, 214, 90]);
    });
    if (au.vis > 0.3) G(x0, y0 + 36, 80, 9, [80, 255, 150], 0.25);
  }
  // ---- the people, you, the YOU ARE HERE star, the places' ? stickers, the hover, the pin ----
  drawMarks(L, { places: ICE_PLACES, spot: iceSpotOf, boards: ICE_BOARDS, sticker: (p) => !L.seen.has(p.id) });
  // ---- the sights still to come: grey stickers, and the name of the one under the pointer ----
  for (const s of SIGHTS) if (soon(s.id)) { const x = s.at[0] + s.t[0], y = s.at[1] + s.t[1], wob = Math.round(Math.sin(a * 2 + s.at[0]) * 0.5); r(x - 1, y + wob, 7, 7, [70, 74, 86]); lit(() => { r(x, y + wob, 5, 6, [178, 182, 194]); r(x, y + wob, 5, 1, [214, 218, 228]); txt('?', x + 1, y + wob, [70, 74, 86]); }); }
  if (hoverSight) { const s = SIGHTS.find((q) => q.id === hoverSight), st = STAMPS.find((q) => q.id === hoverSight); if (s && st) {
    const l1 = st.name, l2 = soon(s.id) ? 'COMING SOON' : 'BY TOUR BUS', w2 = Math.max(tw(l1), tw(l2)) + 6, bx = clamp(s.at[0] - Math.floor(w2 / 2), 2, MAP_W - w2 - 2), by = s.at[1] + 6 + 16 > MAP_H ? s.at[1] - 26 : s.at[1] + 6;
    lit(() => { r(bx, by, w2, 16, K.OUTLINE); r(bx, by, w2, 1, [120, 130, 160]); txt(l1, bx + 3, by + 3, K.WHITE); txt(l2, bx + 3, by + 9, [170, 176, 196]); }); } }
}
