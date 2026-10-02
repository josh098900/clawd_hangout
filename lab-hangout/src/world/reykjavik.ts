// REYKJAVÍK (step 19): Iceland's capital, off the bus from Keflavík. Outdoors, on Iceland's own clock (world/iceland.ts), with the
// northern lights over the bay at night. Left to right along the street:
//   THE BUS STOP: the shelter (the bus back to the airport), HEKLA's tourist INFO kiosk and its Iceland map board
//   THE RAINBOW STREET: the painted lanes leading up the hill to HALLGRÍMSKIRKJA (UP THE TOWER: the view from the top)
//   THE SHOPS: THE PUFFIN SHOP (souvenirs), the BAKERY (cinnamon swirls), the café (a cat asleep in the window), the elf house
//   THE HOT DOG STAND: SIGGA serves ONE WITH EVERYTHING
//   THE SEAFRONT: HARPA (its glass lights up at night), the SUN VOYAGER, the aurora bench and camera, the harbour, ÓLI
// Layers, so the lights can hang behind the mountains: the sky is the backdrop (bg = night, bgAlt = day, by Iceland's clock), then the
// aurora, then the whole town as a baked layer (night and day, cross-faded the same way), then everything alive.

import { K, IS, AP, type RGB } from '../engine/palette';
import { PX, mk, r, line, disc, oval, txt, tw, lit, alpha, G, Gd, M, shade, bake } from '../engine/pixel';
import { clamp, h1 } from '../engine/math';
import { AIR_ARRIVE } from '../game/air';
import { ICE, iceDay, iceGold, iceSun, iceWeather, auroraNow, drawAurora, mountains, forecast } from './iceland';
import type { Prop, Rect, Room, Spot, Talker } from './room';
import { isWinter } from './season';
import { busAt, busPose } from '../game/tour';
import { COAST, busAtStop } from './coast';
import { TB_ARRIVE } from './tourbus';

const W = 1900, H = 614, WALL = 470, FL0 = 484, FL1 = 570, HORIZON = 424;
export const RKR = { bus: 70, info: 170, road0: 400, road1: 600, church: 500, puffin: 845, bakery: 955, cafe: 1055, elf: 1132, stand: 1320, harpa0: 1478, harpa1: 1680, bench: 1592, churchBench: 446, cam: 1650, voyager: 1810, harbour: 1880 };
/** What the features tell the set to show (features/air.ts). */
export const REYKW = { view: { x0: 0, x1: W }, knock: -99, elfOpen: -99, pet: -99 };
const seen = (x0: number, x1: number): boolean => x1 >= REYKW.view.x0 - 30 && x0 <= REYKW.view.x1 + 30;
const now = (): number => performance.now() / 1000;
/**
 * HARPA, from the photo: the tall block whose roof climbs to the right and whose left side leans out over the lobby, and the long low wing
 * beside it, both clad in honeycomb cells of glass (taller than wide) catching the sky, floating over a dark glass lobby; a
 * reflecting pool in front. HARPA_CELLS lists every cell wholly inside a volume (its corner x, y), for the baked glass and the
 * night's colour wave alike.
 */
const HARPA_MAIN: [number, number][] = [[1562, 392], [1680, 374], [1676, 456], [1580, 456]];
const HARPA_WING: [number, number][] = [[1484, 421], [1574, 413], [1574, 447], [1494, 448]];
const inPoly = (pts: [number, number][], x: number, y: number): boolean => { let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside; };
const HARPA_CELLS: [number, number][] = [];
for (let col = 0; col < 34; col++) for (let row = 0; row < 9; row++) { const x = 1480 + col * 6, y = 370 + row * 10 + (col % 2 ? 5 : 0); for (const v of [HARPA_MAIN, HARPA_WING]) if (inPoly(v, x + 1, y + 1) && inPoly(v, x + 5, y + 1) && inPoly(v, x + 1, y + 9) && inPoly(v, x + 5, y + 9)) { HARPA_CELLS.push([x, y]); break; } }
/** A glass cell: a hexagon 5 wide, 10 tall (pointed top and bottom). */
const HEX: [number, number][] = [[2, 1], [1, 3], [0, 5], [0, 5], [0, 5], [0, 5], [0, 5], [0, 5], [1, 3], [2, 1]];
const hexCell = (x: number, y: number, c: RGB, hi?: RGB): void => { HEX.forEach(([dx, w], k) => r(x + dx, y + k, w, 1, c)); if (hi) { r(x + 1, y + 2, 1, 4, hi); r(x + 2, y + 1, 1, 1, hi); } };
const RAINBOW: RGB[] = [[228, 60, 60], [240, 140, 50], [246, 214, 60], [80, 180, 90], [60, 120, 210], [140, 80, 190]];

// ---------------------------------------------------------------- the sky (the backdrop) ----------------------------------------------------------------
function paintSky(g: CanvasRenderingContext2D, day: boolean): void {
  bake(g, () => {
    const top: RGB = day ? IS.SKY : IS.SKY_NIGHT, low: RGB = day ? IS.SKY_LO : IS.SKY_NIGHT_LO;
    for (let y = 0; y < H; y += 2) r(0, y, W, 2, M(top, low, clamp(y / HORIZON, 0, 1) ** 1.3));
    if (!day) for (let k = 0; k < 160; k++) { const x = Math.floor(h1(k * 3.1) * W), y = Math.floor(h1(k * 1.7) * 380); r(x, y, 1, 1, h1(k * 5) > 0.8 ? [255, 250, 230] : [200, 210, 240]); }
  });
}

// ---------------------------------------------------------------- THE VIEW UP SKÓLAVÖRÐUSTÍGUR ----------------------------------------------------------------
/**
 * The rainbow street climbing between its shops to HALLGRÍMSKIRKJA, painted in one-point perspective into the gap between the
 * houses (x 402-598). Depth z runs from 0 at the street's mouth (the pavement you walk on) to 0.75 at the church's plaza; a thing at
 * depth z is drawn vs(z) times its size at the mouth, and the ground there is at screen row vgy(z).
 */
const VST = { x0: 402, x1: 598, cx: 500, vy: 401, road: 84, walk: 98 };
const vs = (z: number): number => 1 / (1 + 3 * z);
const vgy = (z: number): number => VST.vy + (WALL - VST.vy) * vs(z);
/** The depth whose ground is at screen row y. */
const vzAt = (y: number): number => ((WALL - VST.vy) / Math.max(0.5, y - VST.vy) - 1) / 3;
/** Where the street meets the church's plaza, and where the church stands. */
const PLAZA_Z = 0.75, CH = { cx: 500, base: 412 };
type Facade = { z0: number; z1: number; h: number; c: RGB; roof: RGB; shop?: boolean; sign?: RGB; mural?: boolean; wood?: boolean; gable?: boolean };
/** The street's buildings, each side from the mouth up to the plaza: height (at the mouth's scale), walls, roof, a shop at street level, a hanging sign. */
const STREET: Record<-1 | 1, Facade[]> = {
  [-1]: [
    { z0: 0, z1: 0.1, h: 88, c: [234, 228, 214], roof: IS.ROOF_GREY, shop: true, sign: [40, 120, 80], gable: true },
    { z0: 0.1, z1: 0.22, h: 78, c: [196, 58, 52], roof: IS.ROOF_BLACK, shop: true, sign: [240, 200, 60], wood: true },
    { z0: 0.22, z1: 0.36, h: 98, c: [176, 196, 210], roof: IS.ROOF_GREY, mural: true },
    { z0: 0.36, z1: 0.49, h: 74, c: IS.MUSTARD, roof: IS.ROOF_RED, shop: true, sign: [180, 50, 50], wood: true, gable: true },
    { z0: 0.49, z1: 0.62, h: 86, c: [56, 60, 68], roof: IS.ROOF_GREY, shop: true, wood: true },
    { z0: 0.62, z1: PLAZA_Z, h: 70, c: [226, 150, 128], roof: IS.ROOF_RED, shop: true, gable: true },
  ],
  [1]: [
    { z0: 0, z1: 0.12, h: 84, c: [48, 92, 128], roof: IS.ROOF_BLACK, shop: true, sign: [230, 230, 236], wood: true, gable: true },
    { z0: 0.12, z1: 0.24, h: 96, c: [236, 234, 226], roof: IS.ROOF_GREY, shop: true, sign: [40, 70, 140], mural: true },
    { z0: 0.24, z1: 0.37, h: 80, c: IS.TEAL, roof: IS.ROOF_BLACK, shop: true, sign: [250, 160, 60], wood: true, gable: true },
    { z0: 0.37, z1: 0.5, h: 90, c: [176, 52, 48], roof: IS.ROOF_GREY, shop: true, wood: true },
    { z0: 0.5, z1: 0.63, h: 72, c: IS.WHITE, roof: IS.ROOF_GREEN, shop: true, sign: [60, 140, 90], wood: true, gable: true },
    { z0: 0.63, z1: PLAZA_Z, h: 82, c: [214, 170, 60], roof: IS.ROOF_GREY, wood: true },
  ],
};
/** The street's lamps (green, as in the photo), its bare birches, benches and planters: [z, side]. */
const V_LAMPS: [number, -1 | 1][] = [[0.08, 1], [0.3, -1], [0.34, 1], [0.6, -1], [0.62, 1]];
const V_TREES: [number, -1 | 1][] = [[0.16, -1], [0.44, -1], [0.18, 1], [0.48, 1]];
/** Fill a convex polygon with crisp pixels (row by row). */
function fillPoly(pts: [number, number][], c: RGB): void {
  const ys = pts.map((q) => q[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  for (let y = y0; y <= y1; y++) { const yc = y + 0.5, xs: number[] = []; for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc) !== (by <= yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); } if (xs.length < 2) continue; const a = Math.round(Math.min(...xs)), b = Math.round(Math.max(...xs)); if (b > a) r(a, y, b - a, 1, c); }
}
function vista(day: boolean, dk: (c: RGB) => RGB): void {
  const sky: RGB = day ? IS.SKY_LO : IS.SKY_NIGHT_LO, haze = (c: RGB, s: number): RGB => dk(M(c, sky, (1 - s) * 0.42));
  // ---- HALLGRÍMSKIRKJA at the top of the hill: the tall central tower, the wings of basalt columns stepping down either side ----
  { const { cx, base } = CH, lc = (c: RGB): RGB => (day ? M(c, sky, 0.12) : M(M(c, [26, 30, 46], 0.42), [255, 220, 170], 0.06)), C = lc(IS.CHURCH), HI = lc(IS.CHURCH_HI), SH = lc(IS.CHURCH_DK), D = lc([150, 146, 140]);
    const column = (x: number, top: number, w: number) => { r(x, top + 1, w, base - top - 1, C); r(x + 1, top, w - 2, 1, C); r(x, top + 1, 1, base - top - 1, HI); r(x + w - 2, top + 1, 2, base - top - 1, SH); r(x + w - 1, top + 1, 1, base - top - 1, D); };
    for (let i = 8; i >= 0; i--) { const hgt = Math.round(11 + 74 * Math.pow(1 - i / 9, 1.5)); column(cx + 12 + i * 7, base - hgt, 7); column(cx - 19 - i * 7, base - hgt, 7); }
    // the tower: its shaft (the tallest columns at its edges), the slit windows up its middle, the clock, the belfry, the pointed crown, the cross
    column(cx - 12, base - 100, 6); column(cx + 6, base - 100, 6); r(cx - 6, base - 104, 12, 104, C); r(cx - 6, base - 104, 2, 104, HI); r(cx + 4, base - 104, 2, 104, SH);
    for (let y = base - 76; y < base - 30; y += 6) r(cx - 1, y, 2, 3, lc([70, 72, 80]));
    r(cx - 10, base - 112, 20, 9, C); r(cx - 10, base - 112, 20, 1, HI); r(cx + 8, base - 112, 2, 9, SH); for (let b = 0; b < 3; b++) { r(cx - 6 + b * 5, base - 110, 2, 6, lc([40, 44, 56])); r(cx - 6 + b * 5, base - 111, 2, 1, lc([60, 64, 76])); } // (the belfry)
    for (let y = base - 132; y < base - 112; y++) { const u = (y - (base - 132)) / 20, hw = Math.max(1, Math.round(u * 10)); r(cx - hw, y, hw * 2, 1, C); r(cx - hw, y, 1, 1, HI); r(cx + hw - 1, y, 1, 1, SH); if (hw > 3) r(cx - 1, y, 1, 1, SH); } // (the crown, ribbed)
    r(cx, base - 140, 1, 8, lc([96, 96, 100])); r(cx - 2, base - 137, 5, 1, lc([96, 96, 100]));
    disc(cx, base - 94, 4, lc(K.WHITE)); disc(cx, base - 94, 4, lc([220, 216, 206])); r(cx - 4, base - 94, 1, 1, lc([90, 90, 96])); r(cx + 3, base - 94, 1, 1, lc([90, 90, 96])); // (the clock: its hands are live)
    // the tall arched doorway, the stained glass above it
    r(cx - 4, base - 30, 8, 18, lc([40, 44, 56])); r(cx - 3, base - 31, 6, 1, lc([40, 44, 56])); for (let k = 0; k < 6; k++) r(cx - 3 + k, base - 29, 1, 16, day ? ([[60, 90, 170], [200, 60, 70], [230, 190, 70], [70, 150, 110], [120, 80, 170], [60, 120, 200]][k] as RGB) : M([[60, 90, 170], [200, 60, 70], [230, 190, 70], [70, 150, 110], [120, 80, 170], [60, 120, 200]][k] as RGB, [255, 210, 150], 0.35));
    r(cx - 4, base - 12, 8, 12, lc([84, 60, 46])); r(cx, base - 12, 1, 12, lc([54, 38, 30]));
    // the plaza in front: black, with its white maze pattern, running down to the top of the street
    for (let y = base; y <= Math.ceil(vgy(PLAZA_Z)); y++) { const z = vzAt(y), sc = vs(z), half = Math.round((VST.walk + 30) * sc);
      for (let x = cx - half; x < cx + half; x++) { const u = (x - cx) / (16 * sc), row = Math.floor(z * 5), cell = Math.floor(u), along = (z * 5) % 1 < 0.16 && h1(cell * 3.1 + row * 7.7) > 0.35, down = u - cell < 0.07 && h1(cell * 5.3 + row * 1.9) > 0.45; r(x, y, 1, 1, along || down ? dk([176, 176, 172]) : dk([96, 98, 104])); } }
    for (let k = 0; k < 3; k++) { const y = Math.ceil(vgy(PLAZA_Z)) - k * 2, half = Math.round((VST.walk + 30) * vs(PLAZA_Z)); r(CH.cx - half, y, half * 2, 1, dk([150, 150, 148])); } // (the steps up from the street)
    // the explorer on his plinth, before the door
    r(cx + 22, base - 4, 4, 5, haze([120, 116, 110], 0.25)); r(cx + 23, base - 9, 2, 5, haze([90, 110, 100], 0.25)); r(cx + 23, base - 10, 2, 1, haze([90, 110, 100], 0.25));
  }
  // ---- the street: its pavements and kerbs, the six rainbow lanes, from the mouth up to the plaza ----
  for (let y = Math.floor(vgy(PLAZA_Z)); y < WALL; y++) {
    const z = vzAt(y + 0.5), sc = vs(z), road = VST.road * sc, walk = VST.walk * sc;
    r(Math.round(VST.cx - walk), y, Math.round(walk - road), 1, haze(IS.PAVE, sc)); r(Math.round(VST.cx + road), y, Math.round(walk - road) + 1, 1, haze(IS.PAVE, sc));
    for (let b = 0; b < 6; b++) { const xa = Math.round(VST.cx - road + (b * 2 * road) / 6), xb = Math.round(VST.cx - road + ((b + 1) * 2 * road) / 6); r(xa, y, xb - xa, 1, haze(RAINBOW[b], sc)); }
    r(Math.round(VST.cx - road) - 1, y, 1, 1, haze(IS.KERB, sc)); r(Math.round(VST.cx + road), y, 1, 1, haze(IS.KERB, sc));
  }
  // ---- the buildings either side, far ones first (so nearer ones stand in front): each a pitched roof in perspective (its ridge runs
  // up the street, seams, snow on the ridge, a chimney on some), the gable end where it stands taller than the one in front, and its
  // front: painted iron or concrete, floor trims, white-framed windows (lit at night), a shop at street level, a footing ----
  const g = PX.ctx; g.save(); g.beginPath(); g.rect(VST.x0, 0, VST.x1 - VST.x0, WALL + 1); g.clip();
  const P = (side: number, off: number, z: number, up: number): [number, number] => [VST.cx + side * off * vs(z), vgy(z) - up * vs(z)];
  for (const side of [-1, 1] as const) for (const f of [...STREET[side]].reverse()) {
    const wall = (sc: number) => haze(f.c, sc), endWall = (sc: number) => haze(M(f.c, [0, 0, 0], 0.22), sc), roofC = (sc: number) => haze(M(f.roof, [255, 255, 255], 0.06), sc), ridge = f.h + 24, back = VST.walk + 34, far = VST.walk + 68;
    const GH = 24, gableUp = (u: number): number => (f.gable ? GH * (1 - Math.abs(2 * u - 1)) : 0);
    if (f.gable) {
      // a gable facing the street: its near roof slope runs back from the gable's edge (the far slope's hidden), snow along both
      const zm = (f.z0 + f.z1) / 2, sm = vs(zm), [a0x, a0y] = P(side, VST.walk, f.z0, f.h), [mx, my] = P(side, VST.walk, zm, f.h + GH), [m2x, m2y] = P(side, far, zm, f.h + GH), [b0x, b0y] = P(side, far, f.z0, f.h);
      fillPoly([[a0x, a0y], [mx, my], [m2x, m2y], [b0x, b0y]], roofC(sm));
      for (let q = 1; q < 5; q++) { const zq = f.z0 + ((zm - f.z0) * q) / 5, [ax, ay] = P(side, VST.walk, zq, f.h + (GH * q) / 5), [bx2, by2] = P(side, far, zq, f.h + (GH * q) / 5); line(Math.round(ax), Math.round(ay), Math.round(bx2), Math.round(by2), haze(M(f.roof, [0, 0, 0], 0.25), vs(zq))); }
      line(Math.round(mx), Math.round(my), Math.round(m2x), Math.round(m2y), dk(IS.SNOW));
      const [e1x, e1y] = P(side, VST.walk, f.z1, f.h); line(Math.round(a0x), Math.round(a0y) - 1, Math.round(mx), Math.round(my) - 1, dk(IS.SNOW)); line(Math.round(mx), Math.round(my) - 1, Math.round(e1x), Math.round(e1y) - 1, dk(IS.SNOW));
      if (h1(f.z0 * 13 + side) > 0.3) { const zc = f.z0 + (f.z1 - f.z0) * 0.3, sc = vs(zc), [cx2, cy2] = P(side, VST.walk + 20, zc, f.h + GH * 0.6); r(Math.round(cx2 - 2 * sc), Math.round(cy2 - 10 * sc), Math.max(2, Math.round(4 * sc)), Math.max(3, Math.round(12 * sc)), haze([150, 70, 60], sc)); r(Math.round(cx2 - 2 * sc), Math.round(cy2 - 10 * sc), Math.max(2, Math.round(4 * sc)), 1, dk(IS.SNOW)); }
    } else {
    // the gable end facing us at the building's near end, and its end wall
      { const s0 = vs(f.z0), [ex, ey] = P(side, VST.walk, f.z0, f.h), [rx, ry] = P(side, back, f.z0, ridge), [gx, gy] = P(side, far, f.z0, f.h), [bx, by] = P(side, far, f.z0, 0);
      fillPoly([[ex, ey], [gx, gy], [bx, by], [ex, vgy(f.z0)]], endWall(s0)); fillPoly([[ex, ey], [rx, ry], [gx, gy]], endWall(s0)); fillPoly([[ex, ey - 1], [rx, ry - 1], [rx, ry + 1], [ex, ey + 1]], dk(IS.SNOW)); fillPoly([[rx, ry - 1], [gx, gy - 1], [gx, gy + 1], [rx, ry + 1]], dk(IS.SNOW));
      if (s0 > 0.4 && Math.abs(gx - ex) > 8) { const wx = (ex + rx) / 2 + side * 3 * s0, wy = ry + (ey - ry) * 0.75; r(Math.round(wx - 2 * s0), Math.round(wy), Math.max(2, Math.round(4 * s0)), Math.max(2, Math.round(4 * s0)), day ? haze([110, 146, 176], s0) : [255, 206, 130]); } }
    // the roof slope facing the street: from the eave up to the ridge, seams running up it, snow along the ridge and the eave
      { const [e0x, e0y] = P(side, VST.walk, f.z0, f.h), [e1x, e1y] = P(side, VST.walk, f.z1, f.h), [r0x, r0y] = P(side, back, f.z0, ridge), [r1x, r1y] = P(side, back, f.z1, ridge), sm = vs((f.z0 + f.z1) / 2);
      fillPoly([[e0x, e0y], [e1x, e1y], [r1x, r1y], [r0x, r0y]], roofC(sm));
      for (let q = 1; q < 6; q++) { const zq = f.z0 + ((f.z1 - f.z0) * q) / 6, [ax, ay] = P(side, VST.walk, zq, f.h), [bx2, by2] = P(side, back, zq, ridge); line(Math.round(ax), Math.round(ay), Math.round(bx2), Math.round(by2), haze(M(f.roof, [0, 0, 0], 0.25), vs(zq))); }
      line(Math.round(r0x), Math.round(r0y), Math.round(r1x), Math.round(r1y), dk(IS.SNOW)); line(Math.round(e0x), Math.round(e0y) - 1, Math.round(e1x), Math.round(e1y) - 1, dk(IS.SNOW));
      if (h1(f.z0 * 13 + side) > 0.4) { const zc = f.z0 + (f.z1 - f.z0) * 0.6, sc = vs(zc), [cx2, cy2] = P(side, (VST.walk + back) / 2 + 4, zc, (f.h + ridge) / 2 + 4); r(Math.round(cx2 - 2 * sc), Math.round(cy2 - 10 * sc), Math.max(2, Math.round(4 * sc)), Math.max(3, Math.round(12 * sc)), haze([150, 70, 60], sc)); r(Math.round(cx2 - 2 * sc), Math.round(cy2 - 10 * sc), Math.max(2, Math.round(4 * sc)), 1, dk(IS.SNOW)); } }
    }
    // the front, column by column
    const xa = VST.cx + side * VST.walk * vs(f.z0), xb = VST.cx + side * VST.walk * vs(f.z1);
    for (let x = Math.round(Math.min(xa, xb)); x <= Math.round(Math.max(xa, xb)); x++) {
      const sc = Math.abs(x - VST.cx) / VST.walk; if (sc <= 0.05) continue;
      const z = clamp((1 / sc - 1) / 3, f.z0, f.z1), u = (z - f.z0) / (f.z1 - f.z0), bot = vgy(z), top = Math.round(bot - (f.h + gableUp(u)) * sc), hh = bot - top, yAt = (k: number) => Math.round(bot - f.h * sc * k);
      r(x, top, 1, Math.ceil(hh), wall(sc)); if (f.wood) { const rib = Math.floor(z * 400) % 3; if (rib === 0) r(x, top, 1, Math.ceil(hh), haze(M(f.c, [0, 0, 0], 0.18), sc)); else if (rib === 1 && sc > 0.4) r(x, top, 1, Math.ceil(hh), haze(M(f.c, K.WHITE, 0.12), sc)); } // (corrugated iron's ribs)
      if (f.gable && Math.abs(u - 0.5) < 0.07) { const ay = Math.round(bot - (f.h + GH * 0.45) * sc); r(x, ay, 1, Math.max(2, Math.round(7 * sc)), Math.abs(u - 0.5) > 0.05 && sc > 0.35 ? haze(K.WHITE, sc) : day ? haze([110, 146, 176], sc) : h1(f.z0 * 9 + side) > 0.4 ? [255, 206, 130] : [40, 40, 54]); } // (the attic window in the gable)
      r(x, top, 1, Math.max(1, Math.round(2 * sc)), haze(K.WHITE, sc)); // (the white trim under the eave)
      r(x, yAt(0.07), 1, Math.max(1, Math.round(f.h * sc * 0.07)), haze(M(f.c, [60, 60, 66], 0.5), sc)); // (the footing)
      for (const k of [0.48, 0.76]) r(x, yAt(k), 1, 1, haze(M(f.c, [0, 0, 0], 0.2), sc)); // (the floors' trims)
      if (u < 0.02 || u > 0.98) { r(x, top, 1, Math.ceil(hh), haze(M(f.c, [0, 0, 0], 0.3), sc)); continue; } // (the corner)
      // three windows a floor, white-framed, lit at night; the shop at street level
      const wu = (u * 3) % 1, wi = Math.floor(u * 3);
      for (const [a, b] of [[0.55, 0.7], [0.8, 0.93]] as [number, number][]) {
        if (wu < 0.2 || wu > 0.8) continue; const y0 = yAt(b), y1 = yAt(a), edge = wu < 0.26 || wu > 0.74;
        const lit2 = h1(wi * 7.7 + a * 3 + f.z0 * 13 + side) > 0.35, glass: RGB = day ? haze([110, 146, 176], sc) : lit2 ? [255, 206, 130] : [40, 40, 54];
        r(x, y0, 1, Math.max(1, y1 - y0), edge && sc > 0.35 ? haze(K.WHITE, sc) : glass); if (sc > 0.35) { r(x, y0, 1, 1, haze(K.WHITE, sc)); r(x, y1, 1, 1, haze(K.WHITE, sc)); }
      }
      if (f.shop && u > 0.08 && u < 0.92) { // the shop: a dark frame, glass split by mullions (goods on shelves behind, a sky reflection by day, warm light at night), its door, the fascia in the sign's colour
        const y0 = yAt(0.42), y1 = yAt(0.06), frame = haze([44, 40, 40], sc), door = u > 0.72 && u < 0.84, mull = (u * 5) % 1 < 0.08 || u < 0.11 || u > 0.89;
        if (door) { r(x, y0, 1, Math.max(1, y1 - y0), haze([70, 48, 36], sc)); if (u > 0.75 && u < 0.81) r(x, y0 + Math.round((y1 - y0) * 0.15), 1, Math.max(1, Math.round((y1 - y0) * 0.4)), day ? haze([150, 180, 196], sc) : [255, 214, 150]); }
        else if (mull) r(x, y0, 1, Math.max(1, y1 - y0), frame);
        else { const n = h1(Math.floor(u * 24) * 1.3 + f.z0 * 17 + side), goods: RGB = ([[200, 60, 60], [240, 200, 80], [70, 120, 190], [236, 232, 220], [90, 150, 100]] as RGB[])[Math.floor(n * 5)];
          for (let y = y0; y < y1; y++) { const t = (y - y0) / Math.max(1, y1 - y0), shelf = t > 0.55 && n > 0.25 && (t < 0.7 || t > 0.82); r(x, y, 1, 1, shelf ? (day ? haze(goods, sc) : M(goods, [255, 214, 150], 0.35)) : day ? haze(M([150, 182, 204], [222, 236, 244], ((x * 0.5 + y) % 9) < 2 ? 0.7 : t * 0.3), sc) : M([255, 214, 150], [40, 40, 50], (1 - sc) * 0.5 + t * 0.2)); } }
        r(x, y0 - Math.max(2, Math.round(4 * sc)), 1, Math.max(2, Math.round(4 * sc)), haze(f.sign ?? M(f.c, [0, 0, 0], 0.5), sc)); r(x, y1, 1, Math.max(1, Math.round(2 * sc)), frame); }
      if (f.mural && u > 0.1 && u < 0.9) { const k = Math.floor(u * 7), mc = ([[230, 80, 120], [60, 170, 220], [250, 200, 60], [120, 200, 120], [160, 90, 200]] as RGB[])[(k + side + 5) % 5]; r(x, Math.round(bot - f.h * sc * (0.5 + 0.2 * Math.sin(u * 9))), 1, Math.max(1, Math.round(f.h * sc * 0.16)), haze(mc, sc)); } // (graffiti)
    }
    // a hanging sign on its iron bracket, sticking out over the pavement
    if (f.sign) { const zm = (f.z0 + f.z1) / 2, sc = vs(zm), x = VST.cx + side * (VST.walk - 6) * sc, y = vgy(zm) - f.h * sc * 0.46; r(Math.round(x - (side > 0 ? 6 * sc : 0)), Math.round(y - 2), Math.max(1, Math.round(6 * sc)), 1, dk([40, 40, 46])); r(Math.round(x - (side > 0 ? 5 * sc : 1 * sc)), Math.round(y), Math.max(2, Math.round(5 * sc)), Math.max(2, Math.round(5 * sc)), haze(f.sign, sc)); }
  }
  g.restore();
  // ---- the street's furniture: green lamps, bare birches, benches with orange slats, round planters ----
  for (const [z, side] of V_TREES) { const sc = vs(z), x = Math.round(VST.cx + side * (VST.walk - 6) * sc), y = vgy(z), hgt = 56 * sc, c = haze([70, 62, 56], sc);
    r(x, Math.round(y - hgt * 0.5), Math.max(1, Math.round(1.5 * sc)), Math.round(hgt * 0.5), c);
    for (let k = 0; k < 7; k++) { const an = -Math.PI / 2 + (h1(k * 3.1 + z * 9) - 0.5) * 2.2, len = hgt * (0.3 + h1(k * 1.7 + z) * 0.35); line(x, Math.round(y - hgt * (0.4 + k * 0.05)), Math.round(x + Math.cos(an) * len * 0.6), Math.round(y - hgt * (0.4 + k * 0.05) + Math.sin(an) * len), c); } }
  for (const [z, side] of V_LAMPS) { const sc = vs(z), x = Math.round(VST.cx + side * (VST.road + 6) * sc), y = vgy(z), hgt = Math.round(66 * sc), c = haze([46, 92, 66], sc); r(x, y - hgt, Math.max(1, Math.round(1.6 * sc)), hgt, c); r(x - Math.round(2 * sc), y - hgt - Math.round(4 * sc), Math.max(2, Math.round(5 * sc)), Math.max(2, Math.round(4 * sc)), c); r(x - Math.round(1 * sc), y - hgt - Math.round(3 * sc), Math.max(1, Math.round(3 * sc)), Math.max(1, Math.round(2 * sc)), day ? haze([200, 196, 180], sc) : [255, 220, 150]); }
  for (const z of [0.1, 0.42]) { const sc = vs(z), x = Math.round(VST.cx + (VST.road + 8) * sc), y = vgy(z); r(x - Math.round(8 * sc), Math.round(y - 6 * sc), Math.round(16 * sc), Math.max(1, Math.round(2 * sc)), haze([230, 120, 50], sc)); r(x - Math.round(8 * sc), Math.round(y - 10 * sc), Math.round(16 * sc), Math.max(1, Math.round(2 * sc)), haze([230, 120, 50], sc)); r(x - Math.round(7 * sc), Math.round(y - 4 * sc), 1, Math.round(4 * sc), haze([40, 40, 46], sc)); r(x + Math.round(6 * sc), Math.round(y - 4 * sc), 1, Math.round(4 * sc), haze([40, 40, 46], sc)); }
  for (const z of [0.05, 0.27]) { const sc = vs(z), x = Math.round(VST.cx - (VST.road + 7) * sc), y = vgy(z); oval(x, Math.round(y - 4 * sc), Math.max(2, Math.round(5 * sc)), Math.max(2, Math.round(4 * sc)), haze([150, 150, 146], sc)); for (let k = 0; k < 5; k++) line(x, Math.round(y - 7 * sc), x + Math.round((k - 2) * 2 * sc), Math.round(y - 14 * sc), haze([110, 140, 80], sc)); }
}

// ---------------------------------------------------------------- the town (a baked layer, by night and by day) ----------------------------------------------------------------
/** A corrugated-iron house: walls in its colour with the iron's ribs, a steep roof (dusted with snow), white-framed windows (lit at night: live), a door, a window box. */
function house(x0: number, x1: number, col: RGB, roof: RGB, eave: number, peak: number, day: boolean, opts: { door?: number; shop?: boolean; chimney?: boolean } = {}): void {
  const k = day ? 0 : 0.55, c = M(col, [10, 14, 26], k), rc = M(roof, [8, 10, 18], k), mid = (x0 + x1) / 2;
  r(x0, eave, x1 - x0, WALL - eave, c); for (let x = x0 + 1; x < x1 - 1; x += 3) { r(x, eave, 1, WALL - eave, M(c, [255, 255, 255], 0.1)); r(x + 1, eave, 1, WALL - eave, M(c, [0, 0, 0], 0.16)); } // (the iron's ribs, lit on one side)
  for (let y = eave + 2; y < eave + 9; y++) alpha(0.28 * (1 - (y - eave - 2) / 7), () => r(x0, y, x1 - x0, 1, [0, 0, 0])); // (shade under the eaves)
  r(x0, WALL - 6, x1 - x0, 6, M([150, 148, 142], [20, 22, 30], k)); r(x0, WALL - 6, x1 - x0, 1, M([186, 184, 178], [30, 32, 40], k)); // (the concrete footing)
  for (let y = peak; y < eave; y++) { const u = (y - peak) / (eave - peak), hw = Math.round(((x1 - x0) / 2 + 4) * u); r(Math.round(mid - hw), y, hw * 2, 1, rc); }
  for (let q = -4; q <= 4; q++) if (q) line(Math.round(mid), peak + 2, Math.round(mid + (q * ((x1 - x0) / 2 + 4)) / 4.5), eave - 1, M(rc, [0, 0, 0], 0.22)); // (the tin roof's seams)
  for (let y = eave - 3; y < eave; y++) { const u = (y - peak) / (eave - peak), hw = Math.round(((x1 - x0) / 2 + 4) * u); r(Math.round(mid - hw), y, hw * 2, 1, M(IS.SNOW, rc, (eave - 1 - y) * 0.25)); } // (snow lying along the bottom of the roof)
  if (eave - peak >= 30 && !opts.chimney) { const dx = Math.round(mid - (x1 - x0) * 0.18), dy = peak + Math.round((eave - peak) * 0.5); r(dx - 7, dy, 14, 11, c); r(dx - 5, dy + 3, 10, 7, M(K.WHITE, [60, 64, 76], k)); r(dx - 4, dy + 4, 8, 5, day ? [110, 150, 180] : [255, 206, 130]); for (let y = dy - 6; y < dy; y++) { const hw = 8 - (dy - y); r(dx - hw, y, hw * 2, 1, rc); } r(dx - 3, dy - 7, 6, 1, IS.SNOW); } // (a dormer window)
  for (let y = peak; y < eave; y += 3) { const u = (y - peak) / (eave - peak), hw = Math.round(((x1 - x0) / 2 + 4) * u); r(Math.round(mid - hw), y, 2, 1, IS.SNOW); r(Math.round(mid + hw - 2), y, 2, 1, IS.SNOW); } // (snow along the roof's edges)
  r(Math.round(mid - 3), peak - 1, 6, 2, IS.SNOW);
  if (opts.chimney) { r(Math.round(mid + (x1 - x0) * 0.2), peak + 6, 6, 12, M([150, 70, 60], [20, 14, 20], k)); r(Math.round(mid + (x1 - x0) * 0.2), peak + 5, 6, 2, IS.SNOW); }
  r(x0 - 1, eave, x1 - x0 + 2, 2, M(K.WHITE, [40, 44, 56], k)); // (the white trim under the eaves)
}
/** THE MURAL on the gable end: a humpback rising through the deep blue, its long white flippers out, light from above, bubbles. */
function mural(dk: (c: RGB) => RGB): void {
  const x0 = 1104, x1 = 1144, y0 = 408, y1 = WALL - 2;
  for (let y = y0; y < y1; y++) r(x0, y, x1 - x0, 1, dk(M([60, 150, 180], [16, 40, 86], (y - y0) / (y1 - y0))));
  for (let k = 0; k < 4; k++) for (let y = y0; y < y1; y++) { const x = x0 + 4 + k * 10 + Math.round((y - y0) * 0.25); if (x < x1) alpha(0.18 * (1 - (y - y0) / (y1 - y0)), () => r(x, y, 3, 1, [210, 240, 250])); } // (light from the surface)
  const back = dk([38, 50, 74]), backHi = dk([70, 88, 116]), belly = dk([226, 232, 236]), groove = dk([160, 172, 186]);
  // the body: head up, tapering to the tail, dark on top with a pale mottle, the white grooved throat down the right
  const outl = dk([18, 26, 44]);
  for (let y = 410; y < 446; y++) { const t = (y - 410) / 36, c = 1125 - Math.round(t * 4), hw = Math.max(2, Math.round(t < 0.2 ? 4 + t * 30 : 10 - (t - 0.2) * 11)), tw2 = t < 0.55 ? Math.round(hw * (0.85 - t)) : 0;
    r(c - hw - 1, y, hw * 2 + 2, 1, outl); r(c - hw, y, hw * 2, 1, back); r(c - hw + 1, y, 2, 1, backHi);
    if (tw2 > 0) r(c + hw - tw2, y, tw2, 1, y % 2 ? belly : groove); if (t > 0.5 && y % 5 === 0) r(c - 2 + (y % 3), y, 2, 1, backHi); }
  for (let k = 0; k < 9; k++) r(1119 + (k % 3) * 3, 412 + Math.floor(k / 3) * 3, 1, 1, dk([90, 106, 130])); // (the knobbly head)
  r(1115, 421, 2, 2, dk(K.WHITE)); r(1115, 422, 1, 1, dk([10, 14, 24])); // (the eye)
  // the long white flippers, swept back, outlined so they read against the sea
  for (let k = 0; k < 15; k++) { const w = k < 9 ? 3 : k < 13 ? 2 : 1, ox = Math.round(k * 0.5);
    r(1133 + ox - 1, 423 + k, w + 2, 1, outl); r(1133 + ox, 423 + k, w, 1, k % 3 ? belly : groove);
    r(1116 - ox - w - 1, 425 + k, w + 2, 1, outl); r(1116 - ox - w, 425 + k, w, 1, k % 3 ? belly : groove); if (k % 4 === 1) { r(1133 + ox + w, 423 + k, 1, 1, belly); r(1116 - ox - w - 1, 425 + k, 1, 1, belly); } }
  // the tail flukes, a wide notched wedge, white underneath
  for (let k = 0; k < 7; k++) { const half = 3 + Math.round(k * 1.7), cx = 1121; r(cx - half - 1, 445 + k, half * 2 + 2, 1, outl); r(cx - half, 445 + k, half, 1, k < 2 ? back : belly); r(cx + 1, 445 + k, half, 1, k < 2 ? back : belly); }
  r(1121, 446, 1, 6, outl); r(1110, 450, 2, 1, back); r(1131, 451, 2, 1, back);
  for (let k = 0; k < 9; k++) { const bx = x0 + 3 + Math.floor(h1(k * 3.7) * (x1 - x0 - 6)), by = y0 + 4 + Math.floor(h1(k * 1.3) * (y1 - y0 - 10)); if (Math.abs(bx - 1124) > 10) { r(bx, by, 2, 2, dk([180, 230, 245])); r(bx, by, 1, 1, dk(K.WHITE)); } } // (bubbles)
}
function windowsOf(x0: number, x1: number, eave: number, day: boolean, skip: (x: number) => boolean = () => false): void {
  const k = day ? 0 : 0.5, fr = M(K.WHITE, [60, 64, 76], k), gl = day ? [110, 150, 180] as RGB : [30, 34, 50] as RGB;
  for (const y of [eave + 10, eave + 34]) { if (y + 14 > WALL - 4) continue; for (let x = x0 + 8; x + 12 < x1 - 4; x += 20) { if (skip(x)) continue; r(x - 2, y - 3, 14, 2, fr); r(x - 1, y - 1, 12, 16, fr); r(x, y, 10, 14, gl); r(x + 4, y, 2, 14, fr); if (day) { r(x + 1, y + 1, 2, 5, [200, 226, 240]); r(x, y, 1, 14, M(([[220, 200, 170], [200, 80, 80], [250, 240, 220]] as RGB[])[Math.floor(h1(x * 1.3 + y) * 3)], [0, 0, 0], 0.1)); r(x + 9, y, 1, 14, M(([[220, 200, 170], [200, 80, 80], [250, 240, 220]] as RGB[])[Math.floor(h1(x * 1.3 + y) * 3)], [0, 0, 0], 0.1)); } r(x - 2, y + 14, 14, 1, IS.SNOW); r(x - 2, y + 15, 14, 3, M([120, 90, 60], [20, 16, 18], k)); if (h1(x + y) > 0.5) for (let f = 0; f < 4; f++) r(x - 1 + f * 3, y + 13, 2, 2, [[230, 80, 90], [250, 200, 60], [240, 240, 250], [90, 160, 90]][f] as RGB); } }
}
function paintTown(g: CanvasRenderingContext2D, day: boolean): void {
  const k = day ? 0 : 0.55, dk = (c: RGB): RGB => M(c, [8, 12, 24], k);
  bake(g, () => {
    // ---- the bay and Mount Esja across it (seen past the seafront, and between the houses) ----
    mountains(0, W, HORIZON, 48, 0.3, dk(IS.MOUNTAIN), dk(IS.SNOW), true);
    r(1380, HORIZON, W - 1380, WALL - HORIZON, dk(IS.SEA)); for (let y = HORIZON + 2; y < WALL; y += 5) for (let x = 1380 + ((y * 7) % 23); x < W; x += 40) r(x, y, 12, 1, dk(M(IS.SEA, K.WHITE, 0.25)));
    r(1380, HORIZON, W - 1380, 1, dk(M(IS.SEA, K.WHITE, 0.4)));
    for (let x = 1380; x < W; x += 2) { // Esja's gullies: snow running down from its cap, dark rock between (the ridge's shape is mountains()'s, seed 0.3)
      const u = x / 240 + 0.3, top = HORIZON - 48 * (0.55 + 0.25 * Math.sin(u * 1.7) + 0.12 * Math.sin(u * 4.3 + 1) + 0.08 * Math.sin(u * 0.6)), cap = Math.max(1, Math.round((HORIZON - top) * (0.18 + 0.1 * Math.sin(u * 5.1)))), y0 = Math.round(top) + cap, g = h1(Math.floor(x / 6) * 3.7);
      if (g > 0.55) { const len = Math.min(HORIZON - y0 - 2, 5 + Math.floor(h1(x * 1.3) * 14)); for (let k = 0; k < len; k++) if (h1(x * 7 + k) > 0.2) r(x, y0 + k, 1, 1, dk(M(IS.SNOW, IS.MOUNTAIN, (k / len) * 0.7))); }
      else if (g < 0.2) r(x + 1, y0, 1, Math.max(0, HORIZON - y0 - 2), dk(M(IS.MOUNTAIN_DK, IS.MOUNTAIN, 0.3)));
    }
    // the breakwater and its little lighthouse, out in the bay; the fishing boats
    r(1660, 452, 90, 5, dk(IS.BASALT)); r(1700, 432, 6, 20, dk(K.WHITE)); r(1700, 438, 6, 3, dk([210, 60, 60])); r(1699, 429, 8, 3, dk([60, 60, 70]));
    // ---- THE VIEW UP SKÓLAVÖRÐUSTÍGUR: the rainbow street climbing between its shops to HALLGRÍMSKIRKJA ----
    vista(day, dk);
    // ---- the houses: up the hill on either side of the rainbow street, then along the street ----
    house(230, 312, IS.RED, IS.ROOF_GREY, 404, 372, day, { chimney: true }); house(316, 398, IS.WHITE, IS.ROOF_RED, 410, 384, day);
    house(604, 686, IS.MUSTARD, IS.ROOF_GREEN, 406, 378, day, { chimney: true }); house(690, 780, IS.BLUE, IS.ROOF_GREY, 402, 370, day);
    for (const [x0, x1, e] of [[230, 312, 404], [316, 398, 410], [604, 686, 406], [690, 780, 402]] as [number, number, number][]) { windowsOf(x0, x1, e, day); const dx = Math.round((x0 + x1) / 2); r(dx - 8, WALL - 30, 16, 30, dk(K.WHITE)); r(dx - 6, WALL - 28, 12, 28, dk([70, 54, 44])); r(dx - 4, WALL - 25, 8, 6, day ? [130, 160, 180] : [255, 200, 120]); r(dx - 5, WALL - 16, 10, 1, dk([50, 38, 30])); r(dx + 3, WALL - 12, 2, 2, dk([230, 190, 90])); r(dx - 9, WALL - 2, 18, 2, dk([170, 168, 162])); r(dx + 10, WALL - 26, 3, 4, dk([40, 42, 48])); }
    // THE PUFFIN SHOP (red), its big window full of puffins, jumpers and a horned helmet
    house(790, 900, IS.RED, IS.ROOF_BLACK, 398, 364, day, { shop: true });
    { const x0 = 800, y0 = 430; r(x0 - 2, y0 - 2, 70, 36, dk(K.WHITE)); r(x0, y0, 66, 32, day ? [236, 226, 206] : [255, 214, 150]);
      for (let p = 0; p < 4; p++) { const px = x0 + 8 + p * 15, py = y0 + 22; oval(px, py, 5, 7, dk([30, 30, 34])); oval(px, py + 2, 3, 4, dk(K.WHITE)); r(px - 2, py - 5, 5, 3, dk([240, 110, 40])); disc(px, py - 7, 3, dk([30, 30, 34])); r(px + 1, py - 8, 1, 1, dk(K.WHITE)); } // (puffin plushies)
      for (let j = 0; j < 2; j++) { r(x0 + 6 + j * 30, y0 + 3, 20, 12, dk([230, 220, 200])); for (let q = 0; q < 5; q++) r(x0 + 7 + j * 30 + q * 4, y0 + 6, 2, 2, dk([120, 60, 40])); } // (lopapeysa jumpers)
      disc(x0 + 58, y0 + 12, 5, dk([160, 160, 170])); r(x0 + 51, y0 + 7, 3, 4, dk([240, 232, 210])); r(x0 + 63, y0 + 7, 3, 4, dk([240, 232, 210])); // (a horned helmet)
      txt('PUFFIN SHOP', 845 - tw('PUFFIN SHOP') / 2, 404, dk(K.WHITE)); r(876, WALL - 30, 16, 30, dk([60, 40, 36])); }
    // THE BAKERY (mustard): BAKARI, a steamy window with trays of cinnamon swirls
    house(910, 1000, IS.MUSTARD, IS.ROOF_RED, 404, 372, day, { chimney: true });
    { const x0 = 918, y0 = 432; r(x0 - 2, y0 - 2, 52, 30, dk(K.WHITE)); r(x0, y0, 48, 26, day ? [250, 236, 210] : [255, 220, 160]); for (let q = 0; q < 6; q++) { disc(x0 + 7 + (q % 3) * 16, y0 + 8 + Math.floor(q / 3) * 11, 4, dk([200, 140, 70])); disc(x0 + 7 + (q % 3) * 16, y0 + 8 + Math.floor(q / 3) * 11, 2, dk([150, 90, 40])); } txt('BAKARI', 955 - tw('BAKARI') / 2, 410, dk([120, 60, 30])); r(978, WALL - 30, 16, 30, dk([90, 60, 40])); }
    // THE CAFÉ (teal): KAFFI, the window where the cat sleeps (the cat's live)
    house(1010, 1100, IS.TEAL, IS.ROOF_GREY, 402, 368, day);
    { r(1024, 430, 46, 30, dk(K.WHITE)); r(1026, 432, 42, 26, day ? [200, 214, 216] : [255, 210, 150]); r(1028, 452, 38, 3, dk([150, 110, 80])); txt('KAFFI', 1055 - tw('KAFFI') / 2, 410, dk(K.WHITE)); r(1076, WALL - 30, 16, 30, dk([60, 50, 44])); }
    // striped awnings over the three shop windows (scalloped edges), the bakery's golden pretzel on its bracket, the café's chalkboard
    for (const [x0, x1, c] of [[796, 872, [200, 50, 50]], [914, 970, [50, 120, 70]], [1020, 1074, [30, 110, 110]]] as [number, number, RGB][]) { for (let x = x0; x < x1; x++) { const st = Math.floor((x - x0) / 5) % 2 ? dk(K.WHITE) : dk(c); r(x, 421, 1, 6, st); if ((x - x0) % 5 < 3) r(x, 427, 1, 1, st); } r(x0, 420, x1 - x0, 1, dk(M(c, [0, 0, 0], 0.3))); }
    { const bx = 936, by = 414, gold = dk([226, 170, 60]), gd = dk([170, 110, 30]); line(bx + 6, by - 8, bx - 10, by - 8, dk([40, 40, 46])); r(bx - 10, by - 8, 1, 3, dk([40, 40, 46]));
      for (const [ox, oy] of [[-5, 0], [3, 0]] as [number, number][]) for (let k = 0; k < 16; k++) { const an = (k / 16) * Math.PI * 2; r(Math.round(bx - 10 + ox + Math.cos(an) * 4), Math.round(by + oy + Math.sin(an) * 4), 2, 2, k % 4 ? gold : gd); }
      line(bx - 16, by + 4, bx - 4, by - 2, gold); line(bx - 4, by + 4, bx - 16, by - 2, gold); r(bx - 11, by - 5, 2, 2, gd); } // (a kringla)
    { const ax = 1086; line(ax - 5, WALL + 13, ax, WALL - 1, dk([90, 60, 40])); line(ax + 5, WALL + 13, ax, WALL - 1, dk([90, 60, 40])); r(ax - 4, WALL + 1, 8, 9, dk([40, 44, 40])); r(ax - 3, WALL + 3, 6, 1, dk(K.WHITE)); r(ax - 3, WALL + 6, 4, 1, dk([240, 200, 120])); }
    // a gable end with a humpback mural, the LAUGAVEGUR sign
    { r(1102, 396, 44, WALL - 396, dk([220, 222, 226])); for (let y = 396; y < 406; y++) r(1102 + (y - 396), y, 44 - (y - 396) * 2, 1, dk(IS.ROOF_GREY)); mural(dk); r(1100, 384, 50, 8, dk([30, 70, 140])); txt('LAUGAVEGUR', 1125 - tw('LAUGAVEGUR') / 2, 386, dk(K.WHITE)); }
    // the black house with white trim
    house(1150, 1240, IS.BLACK, IS.ROOF_BLACK, 400, 366, day, { chimney: true }); windowsOf(1150, 1240, 400, day); r(1188, WALL - 28, 14, 28, dk([200, 60, 50]));
    // the elf house: a tiny painted house with a red door, on its mossy rock by the gable
    { const ex = RKR.elf, ey = WALL + 2; oval(ex, ey, 14, 6, dk(IS.BASALT)); oval(ex, ey - 2, 12, 5, dk(IS.MOSS)); r(ex - 6, ey - 16, 12, 10, dk(K.WHITE)); for (let y = ey - 22; y < ey - 16; y++) r(ex - 7 + (y - ey + 22), y, 14 - (y - ey + 22) * 2, 1, dk([200, 50, 50])); r(ex - 2, ey - 12, 4, 6, dk([200, 50, 50])); r(ex + 3, ey - 14, 2, 2, dk([80, 110, 150])); }
    // ---- the old harbour's warehouse (behind the hot dog stand): grey iron, and the HALL OF FAME board ----
    house(1244, 1440, [150, 156, 164], IS.ROOF_GREY, 408, 382, day);
    { r(1262, 422, 44, 34, dk([60, 40, 30])); r(1264, 424, 40, 30, dk([240, 230, 200])); txt('HALL OF FAME', 1284 - tw('HALL OF FAME') / 2, 426, dk([160, 40, 40])); for (let q = 0; q < 6; q++) { r(1267 + (q % 3) * 12, 434 + Math.floor(q / 3) * 10, 10, 8, dk([200, 206, 214])); disc(1272 + (q % 3) * 12, 438 + Math.floor(q / 3) * 10, 2, dk([[80, 200, 180], [240, 180, 60], [200, 110, 200]][q % 3] as RGB)); } }
    { for (let x = 1320; x < 1436; x += 20) { r(x, 420, 12, 16, dk([90, 96, 104])); r(x + 1, 421, 10, 14, day ? [110, 140, 160] : [30, 34, 50]); } }
    // ---- HARPA (see HARPA_CELLS): the frames' dark steel, every glass cell catching the sky (brighter in a diagonal band of
    // reflection), the dark lobby glass beneath, and the reflecting pool in front with the building upside down in it ----
    { for (const v of [HARPA_WING, HARPA_MAIN]) fillPoly(v, dk([44, 58, 70]));
      for (const [x, y] of HARPA_CELLS) { const band = ((x - y * 0.7) % 70 + 70) % 70 < 16, n = h1(x * 0.37 + y * 1.13), glass: RGB = band ? M([170, 204, 220], [214, 236, 244], n) : n > 0.86 ? [200, 226, 236] : M([84, 118, 140], [110, 146, 160], n);
        hexCell(x, y, dk(glass), dk(M(glass, K.WHITE, 0.35))); }
      for (const v of [HARPA_WING, HARPA_MAIN]) for (let i = 0; i < v.length; i++) { const [ax, ay] = v[i], [bx, by] = v[(i + 1) % v.length]; line(Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), dk([30, 40, 50])); }
      r(1494, 448, 82, WALL - 448, dk([24, 34, 44])); r(1578, 456, 98, WALL - 456, dk([24, 34, 44])); for (let x = 1496; x < 1676; x += 9) r(x, 448, 1, WALL - 448, dk([60, 74, 86])); r(1494, 448, 182, 1, dk([90, 104, 116])); // (the lobby)
      r(1490, WALL + 1, 180, 10, dk([30, 52, 70])); for (const [x, y] of HARPA_CELLS) { const ry = WALL + 1 + Math.round((456 - y) * 0.12); if (ry < WALL + 10 && ry >= WALL + 1) r(x, ry, 5, 1, dk([70, 104, 126])); } r(1490, WALL + 1, 180, 1, dk([90, 120, 140])); // (the pool, and Harpa in it)
      txt('HARPA', 1660 - tw('HARPA'), 449, dk([210, 220, 228])); }
    // ---- the sea wall along the seafront: grey boulders at the water's edge ----
    for (let x = 1440; x < W; x += 14) { const hh = 8 + Math.floor(h1(x) * 6); oval(x + 6, WALL - hh / 2 + 2, 8, hh / 2 + 2, dk(M(IS.BASALT, IS.BASALT_HI, h1(x * 3)))); }
    // ---- THE SUN VOYAGER: the steel ship's skeleton on its granite base, pointing out to sea ----
    { const vx = RKR.voyager, vy = WALL - 6; r(vx - 36, vy, 72, 8, dk([120, 120, 126])); r(vx - 36, vy, 72, 2, dk([160, 160, 166]));
      for (let x = -32; x <= 32; x += 2) { const t = Math.round(4 + Math.abs(x) * 0.1 + (x > 20 ? (x - 20) * 0.8 : 0) + (x < -22 ? (-22 - x) * 0.9 : 0)); r(vx + x, vy - t, 2, 2, dk(IS.STEEL)); } // (the keel, sweeping up at bow and stern)
      for (let q = -24; q <= 20; q += 8) { const hgt = 22 - Math.abs(q) * 0.3; line(vx + q, vy - 4, vx + q + 4, Math.round(vy - 4 - hgt), dk(IS.STEEL)); } // (the ribs)
      line(vx + 30, vy - 8, vx + 44, vy - 34, dk(IS.STEEL), 2); line(vx - 30, vy - 8, vx - 40, vy - 28, dk(IS.STEEL), 2); } // (the prow and the stern)
    // ---- the bus stop, the INFO kiosk ----
    { r(28, 404, 84, 4, dk([90, 96, 104])); alpha(day ? 0.35 : 0.2, () => r(30, 408, 80, 60, AP.GLASS)); r(28, 404, 3, 66, dk([90, 96, 104])); r(109, 404, 3, 66, dk([90, 96, 104])); r(40, 420, 22, 28, dk([240, 238, 228])); for (let q = 0; q < 6; q++) r(43, 424 + q * 4, 16, 1, dk([60, 64, 72])); r(70, 412, 30, 10, dk([40, 110, 180])); txt('BUS', 77, 414, dk(K.WHITE)); }
    { const x0 = 132, x1 = 208; r(x0, 414, x1 - x0, WALL - 414, dk(IS.BIRCH_DK)); for (let x = x0; x < x1; x += 6) r(x, 414, 1, WALL - 414, dk(M(IS.BIRCH_DK, [0, 0, 0], 0.2))); for (let y = 398; y < 414; y++) r(x0 - 4 + (y - 398) * 0, y, x1 - x0 + 8, 1, dk(IS.ROOF_RED)); r(x0 - 4, 397, x1 - x0 + 8, 2, IS.SNOW);
      r(x0 + 8, 420, 60, 22, dk([240, 236, 226])); r(x0 + 30, 422, 16, 16, dk([60, 150, 220])); txt('I', x0 + 37, 427, dk(K.WHITE)); for (let q = 0; q < 4; q++) r(x0 + 10 + q * 5, 446, 4, 10, dk([[120, 180, 220], [220, 120, 90], [120, 190, 120], [230, 200, 90]][q] as RGB)); txt('INFO', x0 + 38 - tw('INFO') / 2, 405, dk(K.WHITE)); }
    // ---- the pavement along the house fronts, the street, the promenade; the rainbow lanes crossing the street ----
    r(0, WALL, W, H - WALL, dk(IS.PAVE)); for (let y = WALL; y < H; y += 12) { r(0, y, W, 1, dk(IS.PAVE2)); for (let x = ((y / 12) % 2) * 18; x < W; x += 36) r(x, y, 1, 12, dk(IS.PAVE2)); }
    r(0, WALL, W, 3, dk(IS.KERB));
      for (let y = WALL; y < H; y++) { const half = VST.road + (y - WALL) * 0.45, x0 = VST.cx - half; for (let b = 0; b < 6; b++) r(Math.round(x0 + (b * half) / 3), y, Math.ceil(half / 3), 1, dk(RAINBOW[b])); }
    r(1440, WALL, W - 1440, H - WALL, dk(M(IS.PAVE, K.WHITE, 0.15))); for (let x = 1440; x < W; x += 30) r(x, WALL, 1, H - WALL, dk(IS.PAVE2));
    for (let i = 0; i < 40; i++) { const x = Math.floor(h1(i * 2.3) * W), y = WALL + 3 + Math.floor(h1(i * 4.1) * 4); r(x, y, 6 + (i % 5), 2, IS.SNOW); } // (snow along the kerb)
    // a steam grate in the pavement (the city's geothermal heating)
    r(716, 520, 20, 8, dk([60, 64, 72])); for (let q = 0; q < 4; q++) r(718 + q * 5, 521, 2, 6, dk([30, 32, 38]));
  });
}
let townNight: HTMLCanvasElement | null = null, townDay: HTMLCanvasElement | null = null;
function towns(): void { if (townNight) return; townNight = mk(W, H); townDay = mk(W, H); paintTown(townNight.getContext('2d')!, false); paintTown(townDay.getContext('2d')!, true); }

// ---------------------------------------------------------------- live ----------------------------------------------------------------
function drawBack(a: number): void {
  towns();
  const day = iceDay(), night = 1 - day, gold = iceGold(), w = iceWeather(), au = auroraNow(), vx0 = Math.max(0, REYKW.view.x0 - 10), vx1 = Math.min(W, REYKW.view.x1 + 10), g = PX.ctx;
  // the low sun (and its glow on the sky) at dawn and dusk: the sky warms towards the horizon, violet-pink up high and gold
  // down low, fading in smoothly (no edge where it starts)
  if (gold > 0.01) for (let y = 150; y < HORIZON; y += 2) { const u = (y - 150) / (HORIZON - 150), k = gold * 0.62 * u * u * (3 - 2 * u); if (k > 0.01) alpha(k, () => r(vx0, y, vx1 - vx0, 2, u < 0.55 ? M([186, 128, 196], [240, 150, 150], u / 0.55) : M([240, 150, 150], [255, 200, 120], (u - 0.55) / 0.45))); }
  { const s = iceSun(); if (s > -0.08 && w.kind !== 'cloudy' && w.kind !== 'snow' && w.kind !== 'drizzle') { const sx = 1700 - Math.round((s + 0.05) * 400), sy = Math.round(HORIZON - 6 - s * 160); if (seen(sx - 20, sx + 20)) { alpha(0.3, () => disc(sx, sy, 12, [255, 220, 150])); disc(sx, sy, 6, M([255, 250, 220], [255, 160, 80], gold)); } } }
  // clouds: a lid of them when it's grey, a few drifting by when it's fine
  { const lid = w.kind === 'cloudy' || w.kind === 'snow' || w.kind === 'drizzle', n = lid ? 22 : 7, cc = M(M([40, 46, 66], [236, 240, 246], day), [150, 156, 166], lid ? 0.4 : 0);
    if (lid) alpha(0.55 * w.k, () => r(vx0, 0, vx1 - vx0, HORIZON, M([60, 66, 80], [170, 178, 190], day)));
    for (let q = 0; q < n; q++) { const cx = ((h1(q * 5.3) * (W + 400) + a * (2 + (q % 3))) % (W + 400)) - 200, cy = 40 + Math.floor(h1(q * 2.1) * 250), cw = 30 + Math.floor(h1(q * 7) * 50); if (!seen(cx - cw, cx + cw)) continue; alpha(lid ? 0.9 : 0.7, () => { oval(Math.round(cx), cy, cw, 8, cc); oval(Math.round(cx - cw / 2), cy - 5, cw / 2, 7, cc); oval(Math.round(cx + cw / 3), cy - 4, cw / 3, 6, cc); }); } }
  // THE NORTHERN LIGHTS
  drawAurora(vx0, vx1, 0, HORIZON - 8, au.kp, au.vis, a, 1.6);
  // the town over it, by night and by day
  g.drawImage(townNight!, 0, 0); if (day > 0.01) { g.globalAlpha = day; g.drawImage(townDay!, 0, 0); g.globalAlpha = 1; }
  // the low sun warms the buildings at dawn and dusk
  if (gold > 0.01) alpha(gold * 0.14, () => r(vx0, 300, vx1 - vx0, WALL - 300, [255, 170, 100]));
  // people walking up and down the rainbow street (smaller as they climb), and winter's giant bells on wires across it
  if (seen(VST.x0, VST.x1)) { streetLife(a, night); if (isWinter()) streetBells(a, night); }
  // the aurora's glow on the bay, the snow, the wet street
  if (au.vis > 0.05 && au.kp >= 3) { const k = au.vis * Math.min(1, au.kp / 7); alpha(0.18 * k, () => r(Math.max(1380, vx0), HORIZON, vx1 - Math.max(1380, vx0), WALL - HORIZON, [80, 255, 160])); alpha(0.06 * k, () => r(vx0, WALL, vx1 - vx0, 40, [80, 255, 160])); }
  // ---- the lit windows at night, and the street lamps' glow ----
  if (night > 0.2) {
    const lamp = (x0: number, x1: number, e: number) => { for (const y of [e + 10, e + 34]) { if (y + 14 > WALL - 4) continue; for (let x = x0 + 8; x + 12 < x1 - 4; x += 20) if (h1(x * 3 + y) > 0.35) lit(() => alpha(night, () => r(x, y, 10, 14, [255, 206, 130]))); } };
    for (const [x0, x1, e] of [[230, 312, 404], [316, 398, 410], [604, 686, 406], [690, 780, 402], [1150, 1240, 400]] as [number, number, number][]) if (seen(x0, x1)) lamp(x0, x1, e);
    if (seen(800, 1100)) { G(800, 428, 70, 36, [255, 200, 130], 0.2 * night); G(918, 430, 50, 30, [255, 200, 130], 0.2 * night); G(1024, 430, 46, 30, [255, 200, 130], 0.2 * night); }
  }
  // ---- the church: warm uplights between its columns at night (as in the photo), the belfry and the stained glass glowing, the clock's hands ----
  if (seen(CH.cx - 90, CH.cx + 90)) {
    const { cx, base } = CH;
    if (night > 0.2) {
      for (let i = -9; i <= 9; i++) { const x = cx + i * 7 + (i < 0 ? -4 : 4); Gd(x, base - 6, 7, [255, 170, 90], 0.3 * night); }
      Gd(cx, base - 50, 30, [255, 210, 160], 0.1 * night);
      lit(() => alpha(night, () => { for (let b = 0; b < 3; b++) r(cx - 6 + b * 5, base - 110, 2, 6, [255, 214, 140]); })); Gd(cx, base - 107, 8, [255, 210, 140], 0.4 * night);
      Gd(cx, base - 21, 6, [180, 160, 255], 0.35 * night);
    }
    const d = new Date(), hr = (d.getHours() % 12) + d.getMinutes() / 60, mn = d.getMinutes(), cy = base - 94, ink: RGB = [50, 50, 56];
    line(cx, cy, cx + Math.round(Math.sin((hr / 12) * Math.PI * 2) * 2), cy - Math.round(Math.cos((hr / 12) * Math.PI * 2) * 2), ink); line(cx, cy, cx + Math.round(Math.sin((mn / 60) * Math.PI * 2) * 3), cy - Math.round(Math.cos((mn / 60) * Math.PI * 2) * 3), ink);
  }
  // ---- HARPA's glass: by night every cell lights up, a slow wave of colour rolling across it (and its reflection in the pool) ----
  if (seen(1480, 1684) && night > 0.15) {
    for (const [x, y] of HARPA_CELLS) { const hue = (x * 0.012 + y * 0.02 - a * 0.25) % 1, c: RGB = hue < 0.33 ? M([60, 200, 255], [120, 90, 255], hue * 3) : hue < 0.66 ? M([120, 90, 255], [255, 90, 180], (hue - 0.33) * 3) : M([255, 90, 180], [60, 200, 255], (hue - 0.66) * 3); lit(() => alpha(night * (0.55 + 0.45 * h1(x + y)), () => hexCell(x, y + 1, c))); }
    alpha(0.4 * night, () => r(1490, WALL + 2, 180, 8, [120, 110, 220]));
  }
  // ---- the harbour: the boats bobbing, the lighthouse's blink, the flag snapping in the wind ----
  if (seen(1440, W)) {
    for (const [bx, c] of [[1600, [200, 60, 50]], [1760, [40, 110, 170]], [1860, [240, 240, 244]]] as [number, RGB][]) { const bob = Math.round(Math.sin(a * 1.2 + bx) * 1.5), by = HORIZON + 22 + bob; r(bx - 12, by, 24, 5, M(c, [10, 14, 26], night * 0.6)); r(bx - 8, by - 5, 10, 5, M(K.WHITE, [30, 34, 46], night * 0.6)); r(bx + 4, by - 16, 1, 16, M([80, 80, 90], [20, 20, 26], night)); if (night > 0.5) lit(() => r(bx + 3, by - 17, 3, 2, [255, 220, 120])); }
    if (night > 0.3 && (a * 0.7) % 1 < 0.2) { lit(() => r(1701, 429, 4, 3, [255, 240, 180])); Gd(1703, 430, 16, [255, 240, 180], 0.5); }
    const fx = 1452, gust = w.kind === 'gale' ? 1.8 : 1; r(fx, 380, 2, 90, [180, 184, 190]); for (let q = 0; q < 16; q++) { const wave = Math.round(Math.sin(a * 6 * gust - q * 0.6) * (1 + q * 0.12)); const cx = fx + 2 + q, c: RGB = q >= 4 && q <= 6 ? [240, 240, 250] : [30, 70, 160]; r(cx, 382 + wave, 1, 12, M(c, [10, 14, 26], night * 0.5)); if (q >= 3 && q <= 7) r(cx, 382 + wave + 5, 1, 2, [240, 240, 250]); if (q === 5) r(cx, 382 + wave, 1, 12, [220, 30, 40]); } for (let q = 0; q < 16; q++) { const wave = Math.round(Math.sin(a * 6 * gust - q * 0.6) * (1 + q * 0.12)); if (q > 3) r(fx + 2 + q, 382 + wave + 5, 1, 2, [240, 240, 250]); r(fx + 2 + q, 382 + wave + 6, 1, 1, [220, 30, 40]); }
  }
  // ---- gulls wheeling over the harbour ----
  if (seen(1380, W)) for (let q = 0; q < 3; q++) { const t = a * (0.05 + q * 0.012) + q * 0.37, gx = 1420 + ((t * 600) % 520), gy = 340 + Math.round(Math.sin(t * 7 + q) * 18 + q * 14), flap = Math.floor(a * 5 + q) % 3 === 0 ? 2 : 0, gc = M([240, 242, 246], [90, 96, 110], night * 0.6); r(Math.round(gx) - 3, gy - flap, 3, 1, gc); r(Math.round(gx) + 1, gy - flap, 3, 1, gc); r(Math.round(gx), gy + 1 - flap, 1, 1, gc); }
  // ---- tourists photographing the church from the foot of the street (a flash now and then after dark), and a dog walker going by ----
  if (seen(360, 640)) for (const [tx, c, ph] of [[384, [200, 60, 70], 0.2], [618, [60, 100, 160], 0.7]] as [number, RGB, number][]) { const tc = M(c, [14, 18, 30], night * 0.55); r(tx - 4, 462, 8, 14, tc); r(tx - 3, 476, 2, 6, [40, 40, 46]); r(tx + 1, 476, 2, 6, [40, 40, 46]); disc(tx, 458, 3, M([236, 200, 170], [40, 36, 40], night * 0.6)); r(tx + (tx < 500 ? 3 : -5), 460, 3, 2, [40, 42, 48]); if (night > 0.3 && (a * 0.3 + ph) % 1 < 0.04) { lit(() => r(tx + (tx < 500 ? 4 : -5), 460, 2, 2, K.WHITE)); Gd(tx + (tx < 500 ? 5 : -4), 461, 10, [255, 255, 240], 0.7); } }
  { const span = 1400, t = (a * 10) % (span * 2), x = t < span ? 20 + t : 20 + span * 2 - t, dir = t < span ? 1 : -1, dc = M([90, 70, 60], [20, 18, 24], night * 0.5);
    if (seen(x - 30, x + 30) && !(x > VST.x0 - 10 && x < VST.x1 + 10)) { const step = Math.floor(a * 5) % 2; r(Math.round(x) - 4, 462, 8, 14, M([70, 80, 60], [14, 18, 24], night * 0.55)); r(Math.round(x) - 3 + step, 476, 2, 6, [40, 40, 46]); r(Math.round(x) + 1 - step, 476, 2, 6, [40, 40, 46]); disc(Math.round(x), 458, 3, M([236, 200, 170], [40, 36, 40], night * 0.6)); r(Math.round(x) - 3, 454, 6, 2, M([180, 40, 40], [40, 14, 18], night * 0.5));
      const dx = Math.round(x + dir * 18); line(Math.round(x) + dir * 4, 468, dx, 476, [60, 60, 66]); r(dx - 4, 476, 8, 4, dc); r(dx + dir * 4 - (dir < 0 ? 2 : 0), 473, 3, 4, dc); r(dx - dir * 5, 475, 2, 1, dc); r(dx - 3 + step, 480, 1, 2, dc); r(dx + 2 - step, 480, 1, 2, dc); } }
  // ---- the bakery's chimney and the steam grate: puffs rising ----
  for (const [sx, sy, sp] of [[994, 380, 0.3], [726, 518, 0.5]] as [number, number, number][]) if (seen(sx - 20, sx + 20)) for (let q = 0; q < 4; q++) { const u = ((a * sp) + q / 4) % 1; alpha(0.45 * (1 - u), () => disc(sx + Math.round(Math.sin(u * 5 + q) * 3 + u * 6), Math.round(sy - u * 26), 2 + Math.round(u * 4), [236, 238, 244])); }
  // ---- the café window's cat, asleep (its tail flicks; it wakes up when someone's just petted it) ----
  if (seen(1020, 1080)) { const cx = 1046, cy = 452, awake = now() - REYKW.pet < 3; oval(cx, cy - 3, 8, 4, [240, 150, 60]); disc(cx + 7, cy - 6, 3, [240, 150, 60]); r(cx + 5, cy - 10, 2, 2, [240, 150, 60]); r(cx + 8, cy - 10, 2, 2, [240, 150, 60]); if (awake) { r(cx + 7, cy - 7, 1, 1, [40, 40, 40]); r(cx + 9, cy - 7, 1, 1, [40, 40, 40]); } else { r(cx + 6, cy - 6, 2, 1, [150, 90, 40]); r(cx + 9, cy - 6, 2, 1, [150, 90, 40]); } const flick = Math.round(Math.sin(a * (awake ? 6 : 1.5)) * 2); r(cx - 9, cy - 3 + flick, 5, 2, [240, 150, 60]); }
  // ---- THE ICELAND EXPLORER: the tour bus pulls in along the kerb by the shelter (and its stop's sign, by the INFO kiosk) ----
  if (seen(0, 260)) { const keep = COAST.view; COAST.view = REYKW.view; busAtStop(0, 4, FL0 - 2, a, 222); COAST.view = keep; }
  // ---- the elf house: a tiny light in its window at night; its door creaks open a crack now and then (and when you knock) ----
  if (seen(RKR.elf - 20, RKR.elf + 20)) { const ex = RKR.elf, ey = WALL + 2, knocked = now() - REYKW.knock < 2.5, open = now() - REYKW.elfOpen < 3;
    if (night > 0.4 || knocked) { lit(() => r(ex + 3, ey - 14, 2, 2, [255, 214, 120])); Gd(ex + 4, ey - 13, 6, [255, 200, 110], 0.5); }
    if (open) { r(ex - 2, ey - 12, 2, 6, [30, 20, 20]); lit(() => r(ex - 1, ey - 10, 1, 1, [255, 230, 150])); } }
}
/** The street's walkers: coats in Iceland's colours, a few going up, a few coming down, on the pavements and down the middle. */
const WALKERS: { off: number; sp: number; ph: number; up: boolean; coat: RGB }[] = [
  { off: -90, sp: 0.018, ph: 0.1, up: true, coat: [200, 196, 190] }, { off: -40, sp: 0.014, ph: 0.55, up: false, coat: [110, 40, 60] },
  { off: 26, sp: 0.016, ph: 0.3, up: true, coat: [40, 46, 60] }, { off: 90, sp: 0.02, ph: 0.8, up: false, coat: [200, 120, 50] },
  { off: 88, sp: 0.012, ph: 0.05, up: true, coat: [60, 90, 140] }, { off: -88, sp: 0.017, ph: 0.65, up: false, coat: [70, 110, 80] },
];
function streetLife(a: number, night: number): void {
  for (const w of WALKERS) {
    const t = (a * w.sp + w.ph) % 1, z = (w.up ? t : 1 - t) * (PLAZA_Z - 0.04), sc = vs(z), x = Math.round(VST.cx + w.off * sc), y = Math.round(vgy(z)), hh = Math.max(4, Math.round(24 * sc)), wd = Math.max(2, Math.round(8 * sc));
    const coat = M(w.coat, [14, 18, 30], night * 0.55), step = Math.floor(a * 6 + w.ph * 10) % 2;
    r(x - Math.round(wd / 2), y - Math.round(hh * 0.85), wd, Math.round(hh * 0.6), coat); // (the coat)
    r(x - Math.round(wd / 2) + (step ? 0 : 1), y - Math.round(hh * 0.25), Math.max(1, Math.round(wd / 3)), Math.round(hh * 0.25), M([40, 40, 46], [10, 10, 16], night)); r(x + Math.round(wd / 2) - Math.max(1, Math.round(wd / 3)) - (step ? 1 : 0), y - Math.round(hh * 0.25), Math.max(1, Math.round(wd / 3)), Math.round(hh * 0.25), M([40, 40, 46], [10, 10, 16], night)); // (legs)
    disc(x, y - Math.round(hh * 0.92), Math.max(1, Math.round(wd * 0.36)), M([236, 200, 170], [40, 36, 40], night * 0.6)); r(x - Math.round(wd * 0.36), y - Math.round(hh * 1.02), Math.max(2, Math.round(wd * 0.72)), Math.max(1, Math.round(hh * 0.1)), coat); // (a head in a hood)
  }
}
/** Winter: the giant green bells hanging over the rainbow street (as in the photo), a string of lights along each wire. */
function streetBells(a: number, night: number): void {
  // fairy lights in the street's bare birches
  lit(() => { for (const [z, side] of V_TREES) { const sc = vs(z), x = Math.round(VST.cx + side * (VST.walk - 6) * sc), y = vgy(z), hgt = 56 * sc; for (let k = 0; k < 9; k++) if ((a * 1.3 + k * 0.37 + z * 5) % 1 < 0.7) r(Math.round(x + (h1(k * 3.3 + z * 7) - 0.5) * hgt * 0.7), Math.round(y - hgt * (0.35 + h1(k * 1.9 + z) * 0.6)), 1, 1, (k + Math.floor(z * 10)) % 3 ? [255, 214, 120] : [255, 240, 200]); } });
  for (const [z, off, hgtW] of [[0.1, 0, 92], [0.38, -34, 70]] as [number, number, number][]) {
    const sc = vs(z), xl = VST.cx - VST.walk * sc, xr = VST.cx + VST.walk * sc, yw = vgy(z) - hgtW * sc, sag = 7 * sc, bw = Math.round(34 * sc), bh = Math.round(30 * sc);
    for (let x = Math.round(xl); x <= Math.round(xr); x++) { const u = (x - xl) / (xr - xl), y = Math.round(yw + Math.sin(u * Math.PI) * sag); r(x, y, 1, 1, M([40, 40, 46], [10, 10, 16], night)); if (Math.round(x - xl) % Math.max(3, Math.round(6 * sc)) === 0) lit(() => r(x, y + 1, 1, 1, (a * 2 + x * 0.3) % 2 < 1.4 ? [255, 214, 120] : [120, 90, 40])); }
    const bx = Math.round(VST.cx + off * sc), by = Math.round(yw + sag * (1 - Math.pow((off * sc) / (xr - VST.cx), 2)) + 1); r(bx, by - Math.round(4 * sc), 1, Math.round(4 * sc), M([40, 40, 46], [10, 10, 16], night));
    for (let j = 0; j < bh; j++) { const hw = Math.round((bw / 2) * (0.35 + 0.65 * Math.pow(j / bh, 0.7))); r(bx - hw, by + j, hw * 2, 1, M([40, 110, 70], [12, 40, 26], night * 0.6)); }
    r(bx - Math.round(bw / 2), by + bh, bw, Math.max(1, Math.round(2 * sc)), M([30, 90, 56], [10, 30, 20], night * 0.6));
    lit(() => { for (let q = 0; q < 6; q++) { const qx = bx - Math.round(bw / 2) + Math.round((q * bw) / 5); if ((a * 1.6 + q * 0.4) % 1 < 0.75) r(qx, by + bh, 1, 1, [255, 220, 130]); } r(bx, by + bh + Math.round(2 * sc), 1, Math.max(1, Math.round(2 * sc)), [255, 214, 120]); });
    if (night > 0.3) Gd(bx, by + bh, Math.round(10 * sc) + 3, [255, 210, 120], 0.35 * night);
  }
}
/** Iceland's weather over everything: snow, sideways snow in a gale, drizzle, a fog wash. */
function drawFront(a: number): void {
  const w = iceWeather(), vx0 = REYKW.view.x0, vx1 = REYKW.view.x1, n = w.kind === 'snow' ? 140 : w.kind === 'gale' ? 110 : w.kind === 'drizzle' ? 90 : 0;
  for (let q = 0; q < n; q++) {
    const span = vx1 - vx0 + 40, x = vx0 - 20 + ((h1(q) * span + (w.kind === 'gale' ? a * 120 : Math.sin(a * 0.8 + q) * 6)) % span + span) % span, y = (h1(q * 3) * H + a * (w.kind === 'drizzle' ? 140 : w.kind === 'gale' ? 40 : 18)) % H;
    if (w.kind === 'drizzle') alpha(0.35 * w.k, () => r(Math.round(x), Math.round(y), 1, 4, [200, 214, 230])); else alpha(w.k, () => r(Math.round(x), Math.round(y), w.kind === 'gale' ? 2 : 1, 1, K.WHITE));
  }
  if (ICE.forced === 'cloudy' || w.kind === 'cloudy') alpha(0.06 * w.k, () => r(vx0, 0, vx1 - vx0, H, [200, 206, 214]));
}

// ---------------------------------------------------------------- props ----------------------------------------------------------------
function stillProp(y: number, box: Rect, still: () => void, live?: (a: number) => void): Prop {
  let c: HTMLCanvasElement | null = null;
  return { y, draw(a: number) {
    if (!seen(box.x0, box.x1)) return;
    if (!c) { const cv = mk(box.x1 - box.x0, box.y1 - box.y0), g = cv.getContext('2d')!; g.translate(-box.x0, -box.y0); const d = PX.dim, e = PX.emit, f = PX.fl, ctx = PX.ctx; PX.dim = 0; PX.emit = false; PX.fl = 0; try { PX.ctx = g; still(); } finally { PX.ctx = ctx; PX.dim = d; PX.emit = e; PX.fl = f; } c = cv; }
    PX.ctx.drawImage(c, box.x0, box.y0); live?.(a);
  } };
}
/** THE HOT DOG STAND: a little red-and-white kiosk with a string of bulbs, its hatch and counter, a queue sign; steam off the grill. */
const stand = stillProp(504, { x0: RKR.stand - 56, y0: 420, x1: RKR.stand + 56, y1: 506 }, () => {
  const x0 = RKR.stand - 50, x1 = RKR.stand + 50;
  r(x0, 446, x1 - x0, 56, [200, 50, 50]); for (let x = x0; x < x1; x += 10) r(x, 446, 5, 56, [236, 236, 240]); // (the red-and-white stripes)
  r(x0 - 4, 432, x1 - x0 + 8, 14, [180, 36, 40]); r(x0 - 4, 432, x1 - x0 + 8, 2, [230, 90, 90]); txt('BEST HOT DOGS', RKR.stand - tw('BEST HOT DOGS') / 2, 435, K.WHITE);
  r(x0 + 16, 452, x1 - x0 - 32, 22, [40, 30, 28]); r(x0 + 12, 474, x1 - x0 - 24, 4, [150, 110, 80]); // (the hatch, the counter)
  for (let q = 0; q < 3; q++) { r(x0 + 22 + q * 20, 468, 14, 4, [230, 170, 100]); r(x0 + 22 + q * 20, 467, 14, 2, [200, 90, 70]); } // (hot dogs waiting)
  r(x0 + 4, 490, x1 - x0 - 8, 12, [150, 40, 44]); txt('IN TOWN', RKR.stand - tw('IN TOWN') / 2, 493, K.WHITE);
}, (a) => {
  const x0 = RKR.stand - 50, x1 = RKR.stand + 50, night = 1 - iceDay();
  for (let x = x0; x <= x1; x += 10) { const on = night > 0.3 || Math.sin(a * 2 + x) > 0; lit(() => r(x, 428, 2, 2, on ? [255, 220, 130] : [120, 100, 60])); if (on && night > 0.3) Gd(x, 429, 6, [255, 210, 120], 0.3); }
  for (let q = 0; q < 3; q++) { const u = ((a * 0.4) + q / 3) % 1; alpha(0.4 * (1 - u), () => disc(RKR.stand - 10 + q * 10 + Math.round(Math.sin(u * 6) * 2), Math.round(456 - u * 16), 2 + Math.round(u * 3), K.WHITE)); }
});
/** A street lamp: black iron, a warm lantern (lit at night, with its glow). */
const streetLamp = (x: number): Prop => ({ y: 494, draw() { if (!seen(x - 20, x + 20)) return; const night = 1 - iceDay(); r(x - 1, 424, 3, 70, [40, 42, 48]); r(x - 3, 492, 7, 3, [40, 42, 48]); r(x - 5, 416, 11, 9, [40, 42, 48]); lit(() => r(x - 3, 418, 7, 5, night > 0.3 ? [255, 220, 140] : [200, 196, 180])); if (night > 0.3) { Gd(x, 420, 14, [255, 210, 130], 0.45 * night); Gd(x, 494, 18, [255, 210, 130], 0.1 * night); } } });
const bench = (x: number, y: number): Prop => stillProp(y, { x0: x - 34, y0: y - 26, x1: x + 34, y1: y + 2 }, () => { r(x - 30, y - 12, 60, 4, [120, 84, 56]); r(x - 30, y - 12, 60, 1, [160, 118, 80]); r(x - 30, y - 22, 60, 3, [120, 84, 56]); for (const lx of [x - 26, x + 23]) r(lx, y - 22, 3, 22, [40, 42, 48]); });
/** The aurora camera: a tripod facing out over the bay. */
const tripod: Prop = stillProp(532, { x0: RKR.cam - 14, y0: 496, x1: RKR.cam + 14, y1: 534 }, () => { const x = RKR.cam; line(x, 512, x - 8, 532, [40, 42, 48]); line(x, 512, x + 8, 532, [40, 42, 48]); line(x, 512, x, 532, [40, 42, 48]); r(x - 7, 502, 14, 10, [30, 30, 34]); r(x + 5, 504, 5, 6, [60, 64, 72]); r(x - 5, 504, 4, 4, [80, 120, 180]); });
const bin = (x: number, y: number): Prop => stillProp(y, { x0: x - 8, y0: y - 20, x1: x + 8, y1: y + 2 }, () => { r(x - 6, y - 18, 12, 18, [60, 90, 80]); r(x - 7, y - 20, 14, 3, [80, 110, 100]); });
const bike: Prop = stillProp(498, { x0: 1154, y0: 476, x1: 1186, y1: 500 }, () => { const x = 1170, y = 496; for (const dx of [-10, 10]) { for (let q = 0; q < 12; q++) { const an = q / 12 * Math.PI * 2; r(x + dx + Math.round(Math.cos(an) * 6), y - 6 + Math.round(Math.sin(an) * 6), 1, 1, [40, 42, 48]); } } line(x - 10, y - 6, x, y - 12, [200, 60, 60]); line(x, y - 12, x + 10, y - 6, [200, 60, 60]); line(x - 2, y - 12, x + 4, y - 18, [200, 60, 60]); r(x + 2, y - 19, 6, 2, [40, 42, 48]); });

export const RKSPOT = { TOWER: 0, SHOP: 1, BAKERY: 2, PYLSA: 3, VOYAGER: 4, CAM: 5, ELF: 6, CAT: 7, MAP: 8, BENCH0: 9, FORECAST: 13 };
export const REYKJAVIK_SPOTS: Spot[] = [
  { kind: 'tower', x: RKR.church, y: 492, sx: RKR.church, sy: 492, lift: 0, label: 'UP THE TOWER', area: { x0: RKR.church - 34, y0: 270, x1: RKR.church + 34, y1: 470 } },
  { kind: 'giftshop', n: 2, x: RKR.puffin, y: 492, sx: RKR.puffin, sy: 492, lift: 0, label: 'PUFFIN SHOP', area: { x0: 790, y0: 396, x1: 900, y1: 470 } },
  { kind: 'bakery', x: RKR.bakery, y: 492, sx: RKR.bakery, sy: 492, lift: 0, label: 'BAKERY', area: { x0: 910, y0: 400, x1: 1000, y1: 470 } },
  { kind: 'pylsa', x: RKR.stand, y: 524, sx: RKR.stand, sy: 524, lift: 0, label: 'ONE WITH EVERYTHING', area: { x0: RKR.stand - 50, y0: 428, x1: RKR.stand + 50, y1: 504 } },
  { kind: 'voyager', x: RKR.voyager, y: 492, sx: RKR.voyager, sy: 492, lift: 0, label: 'SUN VOYAGER', area: { x0: RKR.voyager - 44, y0: 420, x1: RKR.voyager + 44, y1: 472 } },
  { kind: 'auroracam', x: RKR.cam, y: 544, sx: RKR.cam, sy: 544, lift: 0, label: 'PHOTO OF THE SKY', area: { x0: RKR.cam - 14, y0: 496, x1: RKR.cam + 14, y1: 534 } },
  { kind: 'elf', x: RKR.elf, y: 492, sx: RKR.elf, sy: 492, lift: 0, label: 'KNOCK', area: { x0: RKR.elf - 14, y0: 452, x1: RKR.elf + 14, y1: 476 } },
  { kind: 'cat', x: RKR.cafe - 9, y: 492, sx: RKR.cafe - 9, sy: 492, lift: 0, label: 'PET THE CAT', area: { x0: 1024, y0: 428, x1: 1070, y1: 460 } },
  { kind: 'map', x: 150, y: 492, sx: 150, sy: 492, lift: 0, label: 'MAP', area: { x0: 132, y0: 414, x1: 170, y1: 470 } },
  ...[RKR.bench - 13, RKR.bench + 13].map((x): Spot => ({ kind: 'sit', x, y: 534, sx: x, sy: 552, lift: 8, label: 'SIT', area: { x0: x - 14, y0: 512, x1: x + 14, y1: 536 }, watch: { x: 1650, top: 190 } })),
  ...[1190, 1216].map((x): Spot => ({ kind: 'sit', x, y: 534, sx: x, sy: 552, lift: 8, label: 'SIT', area: { x0: x - 14, y0: 512, x1: x + 14, y1: 536 } })),
  { kind: 'forecast', x: 198, y: 492, sx: 198, sy: 492, lift: 0, label: 'AURORA FORECAST', area: { x0: 176, y0: 414, x1: 208, y1: 470 } },
  // the bench at the foot of the rainbow street: sit, and the camera looks up at the whole church
  ...[RKR.churchBench - 13, RKR.churchBench + 13].map((x): Spot => ({ kind: 'sit', x, y: 540, sx: x, sy: 558, lift: 8, label: 'SIT', area: { x0: x - 14, y0: 518, x1: x + 14, y1: 542 }, watch: { x: CH.cx, top: 252 } })),
];
const TALK: Talker[] = [
  { id: 'statue', name: 'THE EXPLORER', x: CH.cx + 23, y: 398, sx: RKR.church + 40, sy: 520, lines: ['A statue of an explorer who sailed on to find a whole new land. He looks like he\'s still deciding where next.', 'He\'s been pointing that way for years.'], verb: 'LOOK' },
  { id: 'mural', name: 'THE MURAL', x: 1108, y: 436, sx: 1100, sy: 506, lines: ['A humpback whale, painted three storeys tall. It looks happy about it.'], verb: 'LOOK' },
  { id: 'hall-of-fame', name: 'THE HALL OF FAME', x: 1284, y: 440, sx: 1284, sy: 520, lines: ['Photos of happy customers holding hot dogs. Every single one looks delighted.', 'A signed photo: "BEST HOT DOG OF MY LIFE." Someone\'s drawn a crown on it.'], verb: 'LOOK' },
  { id: 'harpa', name: 'HARPA', x: 1580, y: 430, sx: 1580, sy: 500, lines: ['HARPA, the concert hall: hundreds of glass panes, like a honeycomb. At night they light up.', 'Music drifts out when the doors open. Something with a lot of cellos.'], verb: 'LOOK' },
  { id: 'whale-boat', name: 'THE WHALE BOAT', x: 1860, y: 440, sx: 1860, sy: 500, lines: ['WHALE WATCHING: COMING SOON. The boat bobs, ready. The whales are ready too, probably.'], verb: 'READ' },
  { id: 'flag', name: 'THE FLAG', x: 1462, y: 390, sx: 1462, sy: 500, lines: ['Iceland\'s flag: a red cross on white, on blue. Fire, ice and sea.', 'It snaps in the wind. There is always wind.'], verb: 'LOOK' },
];
export function makeReykjavik(): Room {
  const room: Room = {
    id: 'reykjavik', title: 'REYKJAVIK', sub: 'ICELAND',
    w: W, h: H,
    lookAt: (x0, x1) => { const keep = REYKW.view; REYKW.view = { x0, x1 }; return () => { REYKW.view = keep; }; },
    floor: { x0: 14, y0: FL0, x1: W - 14, y1: FL1 },
    blockers: [
      { x0: RKR.stand - 50, y0: 490, x1: RKR.stand + 50, y1: 506 }, // the hot dog stand
      { x0: RKR.bench - 30, y0: 522, x1: RKR.bench + 30, y1: 536 }, { x0: 1173, y0: 522, x1: 1233, y1: 536 }, { x0: RKR.churchBench - 30, y0: 528, x1: RKR.churchBench + 30, y1: 542 }, // the benches
      { x0: RKR.cam - 8, y0: 526, x1: RKR.cam + 8, y1: 534 }, { x0: 1156, y0: 490, x1: 1186, y1: 500 }, // the tripod, the bike
    ],
    doors: [
      { trigger: { x0: 44, y0: FL0, x1: 96, y1: FL0 + 10 }, to: 'kef', arrive: AIR_ARRIVE.kefExit, label: 'BUS TO THE AIRPORT', area: { x0: 28, y0: 404, x1: 112, y1: 470 },
        route: () => (busPose(0) === null ? { to: 'kef', arrive: AIR_ARRIVE.kefExit } : null) }, // (behind the tour bus while it's in)
      { trigger: { x0: 176, y0: FL0, x1: 208, y1: FL0 + 10 }, to: 'tourbus', arrive: TB_ARRIVE, label: 'THE TOUR BUS', area: { x0: 4, y0: 410, x1: 216, y1: 482 },
        route: () => (busAt(0) ? { to: 'tourbus', arrive: TB_ARRIVE, label: 'THE TOUR BUS: SOUTH COAST' } : null) },
    ],
    spots: REYKJAVIK_SPOTS, inUse: new Map(),
    spawn: { ...AIR_ARRIVE.reykjavik },
    dim: 0.1,
    dimNow: () => 0.06 + 0.5 * (1 - iceDay()),
    glowMul: () => 0.4 + 0.6 * (1 - iceDay()),
    fillTop: 'rgb(17,33,58)', fillLow: 'rgb(154,157,162)',
    bg: mk(W, H), bgAlt: mk(W, H), altAlpha: () => iceDay(),
    build: () => { paintSky(room.bg.getContext('2d')!, false); paintSky(room.bgAlt!.getContext('2d')!, true); },
    drawBack, drawFront,
    props: [stand, streetLamp(260), streetLamp(620), streetLamp(900), streetLamp(1160), streetLamp(1470), streetLamp(1760), bench(RKR.bench, 534), bench(1203, 534), bench(RKR.churchBench, 540), tripod, bin(1398, 510), bin(740, 500), bike],
    talkers: TALK,
  };
  return room;
}
void forecast; void shade; void AP; void clamp;
