// THE CITY MAP: the whole world as one little pixel diorama, seen from above at an angle, the way a tourist
// map draws a town. The Square is the spine, its buildings in the same order as their doors (the Lab tower
// with the Dev Den and the Rooftop's spaceport on top, the Cinema, the Stage tower, the Lofts, then the
// beach and the Pier); the Subway loops underground out to the Park, the Diner and the Kart Track; ORBIT and
// THE MOON sit in two "not to scale" boxes up in the sky.
//
// Two layers, like every room: the city baked once by night and once by day (cross-faded by the Square's
// clock), then everything alive drawn over it each frame (signs, the train, the rocket and the lander on
// their real timetables, the weather, the people). ui/map.ts puts it on the screen; features/map.ts
// decides where a click takes you.

import { K, DK, CK, NK, RK, PK, SK, MN, MP, RX, CONFETTI, type RGB } from '../engine/palette';
import { PX, r, line, disc, oval, txt, tw, lit, alpha, G, Gd, Gline, M, shade, bake, star4 } from '../engine/pixel';
import { h1, clamp } from '../engine/math';
import type { Rect, RoomId } from './room';
import { dayness } from './plaza';
import { FILMS, currentFilm } from './cinema';
import { STATIONS, train } from './subway';
import { flight, UP_S, DEPART, LAND } from './space';
import { lander, L_UNDOCK, L_TOUCH, L_LIFT, L_CYCLE } from './moon';
import { weather, wind, lightning } from './weather';
import { isHalloween, isWinter } from './season';
import { EXPLORE } from '../game/places';
import { gridOn, meltAgo } from './grid';

export const MAP_W = 480, MAP_H = 300;
/** The horizon, where the Square's buildings stand, and the edges of the Square and the road. */
const HOR = 100, BASE = 150, PLZ = 190, ROAD = 202;

export type Zone = 'earth' | 'orbit' | 'moon';
export interface MapPlace {
  id: RoomId;
  /** Its name on the card (the room's own title, mostly). */
  name: string;
  /** Where on the map it is (the first one is where its ? sticker and the people go). */
  hits: Rect[];
  /** Where people standing here are drawn. */
  at: [number, number];
  zone: Zone;
  /** You can pick it to go there (the spacewalk is only reached through the station's airlock). */
  pick: boolean;
  /** Where its ? sticker goes (clear of its signs), if it's one the EXPLORER badge counts. */
  tag?: [number, number];
}
const R_ = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x0, y0, x1, y1 });
/** The ORBIT and THE MOON boxes. */
export const ORBIT = R_(104, 6, 194, 56), MOONBOX = R_(204, 6, 294, 56);
/** The Subway's stations (in STATIONS order: SQUARE, PARK, DINER, KARTS) and the loop the line runs round. */
const STN: [number, number][] = [[206, 212], [150, 226], [226, 240], [300, 226]];
const LOOP: [number, number][] = [[206, 212], [150, 212], [150, 226], [150, 240], [226, 240], [300, 240], [300, 226], [300, 212], [206, 212]];
/** Stops on LOOP (the index of each station's point). */
const LOOP_AT = [0, 2, 4, 6];
/** Checked in this order: the small things first (a station's roundel is on top of the Square's road). */
export const PLACES: MapPlace[] = [
  { id: 'subway', name: 'SQUARE STATION', hits: [R_(194, 172, 222, 190), R_(199, 205, 213, 219)], at: [206, 186], zone: 'earth', pick: true, tag: [186, 175] },
  { id: 'parkstn', name: 'PARK STATION', hits: [R_(143, 219, 157, 233)], at: [150, 232], zone: 'earth', pick: true },
  { id: 'dinerstn', name: 'DINER STATION', hits: [R_(219, 233, 233, 247)], at: [226, 246], zone: 'earth', pick: true },
  { id: 'kartstn', name: 'KARTS STATION', hits: [R_(293, 219, 307, 233)], at: [300, 232], zone: 'earth', pick: true },
  { id: 'arcade', name: 'THE ARCADE', hits: [R_(64, 162, 106, 190)], at: [76, 186], zone: 'earth', pick: true, tag: [104, 174] },
  { id: 'crypt', name: 'THE CRYPT', hits: [R_(286, 166, 328, 190)], at: [298, 186], zone: 'earth', pick: true, tag: [326, 173] },
  { id: 'spacewalk', name: 'SPACEWALK', hits: [R_(170, 30, 190, 44)], at: [180, 38], zone: 'orbit', pick: false, tag: [181, 42] },
  { id: 'moonbase', name: 'MOON BASE', hits: [R_(254, 28, 292, 50)], at: [272, 48], zone: 'moon', pick: true, tag: [252, 29] },
  { id: 'station', name: 'SPACE STATION', hits: [ORBIT], at: [149, 32], zone: 'orbit', pick: true, tag: [186, 9] },
  { id: 'moon', name: 'THE MOON', hits: [MOONBOX], at: [236, 50], zone: 'moon', pick: true, tag: [268, 9] },
  { id: 'reactor', name: 'THE REACTOR', hits: [R_(64, 86, 94, 118)], at: [79, 116], zone: 'earth', pick: true, tag: [61, 89] },
  { id: 'wing', name: 'THE SCIENCE WING', hits: [R_(60, 118, 94, 150)], at: [80, 149], zone: 'earth', pick: true, tag: [88, 121] },
  { id: 'roof', name: 'THE ROOFTOP', hits: [R_(8, 70, 60, 98)], at: [24, 95], zone: 'earth', pick: true, tag: [12, 77] },
  { id: 'den', name: 'THE DEV DEN', hits: [R_(8, 98, 60, 124)], at: [33, 122], zone: 'earth', pick: true, tag: [1, 104] },
  { id: 'lab', name: 'THE LAB', hits: [R_(8, 124, 60, 150)], at: [33, 149], zone: 'earth', pick: true, tag: [1, 130] },
  { id: 'cinema', name: 'THE CINEMA', hits: [R_(94, 112, 144, 150)], at: [119, 149], zone: 'earth', pick: true, tag: [140, 133] },
  { id: 'stage', name: 'THE STAGE', hits: [R_(148, 56, 172, 150)], at: [160, 149], zone: 'earth', pick: true, tag: [174, 66] },
  { id: 'lofts', name: 'THE LOFTS', hits: [R_(334, 56, 388, 150)], at: [361, 149], zone: 'earth', pick: true, tag: [327, 61] },
  { id: 'pier', name: 'THE PIER', hits: [R_(388, 96, 480, 214)], at: [440, 164], zone: 'earth', pick: true, tag: [464, 180] },
  { id: 'park', name: 'CITY PARK', hits: [R_(2, 204, 142, 298)], at: [72, 288], zone: 'earth', pick: true, tag: [6, 210] },
  { id: 'diner', name: 'THE GREASY BYTE', hits: [R_(166, 246, 292, 298)], at: [236, 292], zone: 'earth', pick: true, tag: [172, 249] },
  { id: 'karts', name: 'THE KART TRACK', hits: [R_(308, 206, 480, 298)], at: [392, 262], zone: 'earth', pick: true, tag: [312, 218] },
  { id: 'plaza', name: 'THE SQUARE', hits: [R_(60, 150, 388, 190)], at: [132, 168], zone: 'earth', pick: true, tag: [240, 181] },
];
export const placeById = (id: RoomId): MapPlace | undefined => PLACES.find((p) => p.id === id);
const inR = (q: Rect, x: number, y: number): boolean => x >= q.x0 && x < q.x1 && y >= q.y0 && y < q.y1;
/** The place under map pixel (x, y). */
export function placeAt(x: number, y: number): MapPlace | null { return PLACES.find((p) => p.hits.some((q) => inR(q, x, y))) ?? null; }
/** Where the map's boards stand, for the "YOU ARE HERE" star: the Square's kiosk, a Subway platform's poster, the station's chart. */
export const BOARDS: Partial<Record<RoomId, [number, number]>> = { plaza: [232, 172], subway: STN[0], parkstn: STN[1], dinerstn: STN[2], kartstn: STN[3], station: [149, 32] };

/** The shoreline: sand to the left of it, sea to the right. */
const shore = (y: number): number => Math.round(392 + (y - HOR) * 0.12 + 2 * Math.sin(y * 0.3));
/** The Lofts' windows (col, row) as map rects: the live layer lights one for every flat in use. */
const LOFT_WIN: [number, number][] = []; for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) LOFT_WIN.push([340 + i * 9, 65 + j * 11]);
/** Soft light for lit windows at night (the live layer adds it, faded by daylight). */
const WGLOW: [number, number, number, number][] = [];
/** The kart track's oval. */
const KT = { cx: 392, cy: 262, rx: 76, ry: 28, band: 7 };

// =====================================================================================
// THE BAKED CITY (night and day)
// =====================================================================================
export function paintMap(ctx: CanvasRenderingContext2D, day: boolean): void {
  const dn = (n: RGB, d: RGB): RGB => (day ? d : n);
  /** A window: lit (warm or cool) or dark at night, sky-blue glass by day. */
  const win = (x: number, y: number, w: number, h: number, seed: number, keep = 0.55) => {
    if (day) { r(x, y, w, h, h1(seed) > 0.5 ? DK.WIN : DK.WIN2); return; }
    const on = h1(seed) < keep; r(x, y, w, h, on ? (h1(seed * 3.1) > 0.8 ? shade(K.WIN_B, 0.9) : K.WIN_Y) : [22, 26, 48]);
    if (on) WGLOW.push([x, y, w, h]);
  };
  /** A building front from `top` down to `base`, with its roof seen from above (`rh` px) and a shadowed right edge. */
  const block = (x0: number, x1: number, top: number, base: number, face: RGB, roofC: RGB, rh = 3) => {
    r(x0, top - rh, x1 - x0, rh, roofC); r(x0, top - rh, x1 - x0, 1, shade(roofC, 1.15));
    r(x0, top, x1 - x0, base - top, face); r(x1 - 2, top, 2, base - top, shade(face, 0.78)); r(x0, top, x1 - x0, 1, shade(face, 0.7));
  };
  /** Brick: a face with mortar courses. */
  const brick = (x0: number, x1: number, y0: number, y1: number, b: RGB, m: RGB) => {
    r(x0, y0, x1 - x0, y1 - y0, b);
    for (let y = y0 + 2, row = 0; y < y1; y += 3, row++) { r(x0, y, x1 - x0, 1, m); for (let x = x0 + (row % 2) * 3; x < x1; x += 6) r(x, y - 2, 1, 2, m); }
  };
  if (!day) WGLOW.length = 0;
  bake(ctx, () => {
    // ---- the sky ----
    const S0 = dn(K.SKY0, DK.SKY0), S1 = dn(K.SKY1, DK.SKY1), S2 = dn(K.SKY2, DK.SKY2);
    for (let y = 0; y < HOR + 4; y += 2) { const u = y / HOR; r(0, y, MAP_W, 2, u < 0.6 ? M(S0, S1, u / 0.6) : M(S1, S2, (u - 0.6) / 0.4)); }
    if (!day) for (let i = 0; i < 120; i++) { const x = Math.floor(h1(i * 3.7) * MAP_W), y = Math.floor(h1(i * 9.1) * 80); r(x, y, 1, 1, h1(i) > 0.8 ? [200, 210, 255] : [110, 120, 170]); }
    else { disc(446, 22, 9, DK.SUN); disc(444, 20, 6, DK.SUN_HI); }
    // far skyline, then the back streets behind the Square's frontage
    for (let x = 0, i = 0; x < 392; i++) {
      const w = 10 + Math.floor(h1(i * 1.7) * 16), top = 74 + Math.floor(h1(i * 2.9) * 20); r(x, top, w, HOR + 10 - top, dn(K.CITY0, DK.CITY0));
      for (let y = top + 3; y < HOR + 6; y += 4) for (let wx = x + 2; wx < x + w - 2; wx += 3) if (h1(wx * 1.3 + y * 2.1) > 0.7) r(wx, y, 1, 2, day ? DK.WIN : shade(K.WIN_Y, 0.45));
      x += w + 1;
    }
    for (let x = 0, i = 0; x < 390; i++) {
      const w = 14 + Math.floor(h1(i * 4.3 + 2) * 20), top = 92 + Math.floor(h1(i * 5.1 + 1) * 22);
      block(x, x + w, top, BASE, dn(K.CITY1, DK.CITY1), dn(K.CITY2, DK.CITY2), 2);
      for (let y = top + 3; y < BASE - 4; y += 5) for (let wx = x + 2; wx < x + w - 3; wx += 4) if (h1(wx * 2.3 + y * 1.1 + 7) > 0.55) win(wx, y, 2, 2, wx * 0.7 + y, 0.45);
      x += w + 2;
    }

    // ---- the sea, the beach and the Pier (right of the Lofts) ----
    for (let y = HOR; y < 216; y++) {
      const sx = shore(y), u = (y - HOR) / 116;
      r(386, y, sx - 386, 1, dn(y % 3 ? PK.SAND : PK.SAND2, y % 3 ? MP.SAND_D : MP.SAND2_D));
      r(sx, y, MAP_W - sx, 1, day ? M(MP.SEA_D, MP.SEA2_D, u) : M(PK.SEA0, PK.SEA2, u));
      r(sx, y, 2, 1, dn(PK.WET, PK.SAND_DK));
    }
    r(386, HOR, MAP_W - 386, 1, dn(PK.SEA1, MP.SEA_HI_D)); // the horizon
    // the lighthouse on its rocks, out in the water
    oval(458, 146, 11, 4, dn(PK.ROCK, [120, 124, 134])); oval(456, 145, 7, 2, dn(PK.ROCK_HI, [150, 154, 164]));
    r(454, 112, 9, 32, dn(shade(PK.LIGHT, 0.8), PK.LIGHT)); r(461, 112, 2, 32, dn(shade(PK.LIGHT, 0.55), shade(PK.LIGHT, 0.8)));
    for (const y of [118, 130]) r(454, y, 9, 4, dn(shade(PK.LIGHT_RED, 0.8), PK.LIGHT_RED));
    r(452, 110, 13, 2, dn(K.BLACK, [60, 60, 70])); r(455, 104, 7, 6, dn([40, 44, 60], [160, 190, 210])); r(454, 101, 9, 3, dn(shade(PK.LIGHT_RED, 0.7), PK.LIGHT_RED)); r(458, 99, 1, 2, K.BLACK);
    r(457, 137, 3, 5, dn([30, 20, 20], [90, 60, 50])); // its door
    // the pier: planks out over the sea on posts, a lamp at the end
    { const x0 = shore(166) - 2;
      for (let x = x0 + 3; x < 476; x += 7) { r(x, 170, 1, 7, dn(PK.WOOD_DK, PK.WOOD)); r(x, 176, 1, 1, dn(PK.FOAM, K.WHITE)); }
      r(x0, 164, 476 - x0, 3, dn(PK.WOOD_HI, [196, 160, 110])); for (let x = x0; x < 476; x += 3) r(x, 164, 1, 3, dn(PK.WOOD, PK.WOOD_HI));
      r(x0, 167, 476 - x0, 3, dn(PK.WOOD, PK.WOOD_HI)); r(x0, 162, 476 - x0, 1, dn(PK.WOOD_DK, PK.WOOD)); for (let x = x0; x < 476; x += 5) r(x, 162, 1, 2, dn(PK.WOOD_DK, PK.WOOD));
      r(474, 156, 1, 8, K.STEEL_POST); r(473, 155, 3, 2, dn([60, 50, 30], [230, 220, 180])); }
    // a palm on the sand, the bonfire's logs and a ring of stones
    { const px = 392; for (let k = 0; k < 16; k++) r(px + Math.round(Math.sin(k * 0.12) * 3), 190 - k, 2, 1, k % 3 ? dn(PK.TRUNK, [150, 120, 80]) : dn(shade(PK.TRUNK, 0.7), PK.TRUNK));
      for (const [dx, dy] of [[-7, 1], [-5, -1], [0, -2], [5, -1], [7, 1], [3, 2], [-3, 2]]) line(px + 2, 174, px + 2 + dx, 174 + dy + 2, dn(PK.PALM, [60, 150, 80]), 1);
      r(px - 1, 173, 5, 2, dn(PK.PALM_DK, PK.PALM)); }
    for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2; r(Math.round(398 + Math.cos(an) * 5), Math.round(205 + Math.sin(an) * 2), 1, 1, dn(PK.ROCK, [140, 140, 150])); }
    line(394, 206, 402, 203, dn(PK.LOG, [120, 80, 50]), 1); line(394, 203, 402, 206, dn(PK.LOG, [120, 80, 50]), 1);

    // ---- THE LAB tower: the Lab, the Dev Den upstairs, the Rooftop garden and the spaceport on top ----
    { const b = dn(K.BRICK, [168, 84, 64]), m = dn(K.MORTAR, [120, 70, 56]);
      brick(8, 60, 98, BASE, b, m); r(58, 98, 2, BASE - 98, shade(b, 0.7));
      r(6, 123, 56, 2, dn([30, 20, 20], [120, 96, 88])); r(6, 123, 56, 1, dn([70, 50, 44], [170, 150, 140])); // the ledge between the floors
      // the Dev Den: three big windows, lamps on, a cat on the middle sill
      for (const [i, x] of [[0, 12], [1, 27], [2, 42]]) { r(x - 1, 103, 13, 16, dn([20, 14, 14], [90, 60, 50])); if (day) { r(x, 104, 11, 14, DK.WIN); r(x, 104, 11, 5, DK.WIN2); } else { r(x, 104, 11, 14, i === 1 ? [255, 196, 120] : [220, 150, 90]); r(x, 104, 11, 1, [255, 230, 170]); WGLOW.push([x, 104, 11, 14]); } r(x + 5, 104, 1, 14, dn([40, 30, 30], [120, 100, 90])); r(x - 1, 118, 13, 2, dn([150, 150, 158], [220, 220, 226])); }
      r(31, 115, 4, 3, NK.CAT_DK); r(33, 113, 2, 2, NK.CAT_DK); r(32, 112, 1, 1, NK.CAT_DK); r(34, 112, 1, 1, NK.CAT_DK); r(29, 116, 2, 1, NK.CAT_DK); // (the Den's cat, watching the Square)
      if (!day) r(16, 106, 2, 3, NK.LAPTOP_HI); // a laptop's glow, somebody's still coding
      // the Lab: glass doors, the neon board, a basement window
      r(22, 126, 22, 7, [20, 14, 14]); r(23, 127, 20, 5, [32, 22, 20]);
      r(25, 134, 14, 16, dn([22, 24, 30], [60, 64, 74])); r(26, 135, 12, 15, dn([60, 80, 100], [150, 190, 210])); r(31, 135, 1, 15, dn([22, 24, 30], [60, 64, 74])); r(27, 136, 3, 6, dn([130, 220, 240], [220, 240, 250]));
      if (!day) WGLOW.push([26, 135, 12, 15]);
      r(46, 140, 10, 6, dn([22, 24, 30], [80, 84, 94])); r(47, 141, 8, 4, dn([40, 50, 80], DK.WIN));
      r(59, 100, 1, 50, dn([44, 48, 56], [110, 116, 130])); // the drainpipe
      // the Rooftop: parapet, gravel, the garden beds, the shed, and the pad with its tower
      r(6, 96, 56, 3, dn(RK.PARAPET, [196, 124, 100])); r(6, 96, 56, 1, dn(RK.PARAPET_HI, [230, 160, 130]));
      r(8, 89, 52, 7, dn(RK.GRAVEL, [150, 154, 166])); for (let k = 0; k < 30; k++) r(8 + Math.floor(h1(k * 2.3) * 50), 89 + Math.floor(h1(k * 5.9) * 7), 1, 1, dn(RK.GRAVEL2, [170, 174, 186]));
      for (const x of [10, 19]) { r(x, 91, 7, 4, dn(RK.PLANTER, [150, 104, 70])); for (let k = 0; k < 5; k++) r(x + 1 + k, 90 + (k % 2), 1, 2, dn(RK.HEDGE, [70, 170, 90])); }
      r(29, 85, 7, 7, dn(RK.HUT, [120, 134, 160])); r(28, 84, 9, 2, dn(RK.HUT_DK, [90, 100, 124])); r(31, 88, 3, 4, dn(RK.HUT_DK, [80, 90, 110]));
      r(40, 90, 19, 6, dn(SK.CONCRETE_DK, SK.CONCRETE)); for (let x = 40; x < 59; x += 4) r(x, 95, 2, 1, SK.HAZ); r(46, 91, 8, 3, dn([50, 50, 56], [110, 110, 118])); // the pad and its scorch mark
      for (let y = 72; y < 92; y += 3) { r(42, y, 1, 3, SK.TOWER_DK); r(44, y, 1, 3, SK.TOWER_DK); line(42, y, 44, y + 2, dn(SK.TOWER_DK, SK.TOWER)); } r(41, 72, 5, 1, dn(SK.TOWER_DK, SK.TOWER));
    }
    // ---- THE SCIENCE WING: a low white annex beside the Lab tower, and the reactor's cooling tower behind it ----
    { const hy = (y: number) => { const u = (y - 90) / 28; return Math.round(u < 0.3 ? 8 - 2 * (u / 0.3) : 6 + 6 * Math.pow((u - 0.3) / 0.7, 1.6)); }; // a cooling tower: a wide base, a gentle waist up high, a flared lip
      for (let y = 90; y < 120; y++) { const w = hy(y); r(79 - w, y, w * 2, 1, dn([150, 156, 168], [214, 218, 226])); r(79 - w, y, 2, 1, dn([180, 186, 198], [236, 240, 246])); r(79 + w - 3, y, 3, 1, dn([116, 122, 134], [180, 186, 196])); }
      r(79 - hy(90), 89, hy(90) * 2, 2, dn([110, 116, 128], [170, 176, 186])); for (let y = 96; y < 118; y += 6) r(79 - hy(y) + 2, y, hy(y) * 2 - 4, 1, dn([136, 142, 154], [200, 204, 214]));
      block(62, 94, 120, BASE, dn([196, 204, 206], [236, 240, 240]), dn([150, 158, 162], [210, 216, 218]));
      r(62, 134, 32, 3, dn([36, 100, 108], [47, 122, 130])); for (let x = 65; x < 84; x += 6) { r(x, 124, 4, 7, dn([40, 50, 70], [190, 220, 240])); if (!day) { r(x, 124, 4, 7, [180, 230, 255]); WGLOW.push([x, 124, 4, 7]); } }
      r(85, 138, 7, 12, RX.HAZ_DK); for (let y = 138; y < 150; y++) for (let x = 85; x < 92; x++) if ((x + y) % 4 < 2) r(x, y, 1, 1, RX.HAZ); r(86, 131, 5, 5, RX.HAZ); r(88, 133, 1, 1, RX.HAZ_DK); }
    // ---- the Square's other fronts ----
    // THE CINEMA: velvet red, gold trim, the marquee board, poster cases, a red carpet out onto the Square
    { const x0 = 94, x1 = 144, top = 116;
      block(x0, x1, top, BASE, dn(CK.WALL, [176, 56, 72]), dn(CK.WALL_DK, [130, 40, 56]));
      for (let x = x0 + 4; x < x1 - 3; x += 7) r(x, top + 17, 1, BASE - top - 17, dn(CK.WALL_HI, [200, 80, 96]));
      r(x0 - 1, top, x1 - x0 + 2, 2, CK.GOLD_DK); r(x0 - 1, top, x1 - x0 + 2, 1, CK.GOLD_HI);
      r(x0 + 4, top + 3, x1 - x0 - 8, 12, CK.GOLD_DK); r(x0 + 5, top + 4, x1 - x0 - 10, 10, CK.BOARD);
      r(x0 - 1, top + 17, x1 - x0 + 2, 2, CK.GOLD_DK); r(x0 - 1, top + 17, x1 - x0 + 2, 1, CK.GOLD_HI);
      for (const px of [x0 + 3, x1 - 12]) { r(px, 138, 9, 11, CK.GOLD_DK); r(px + 1, 139, 7, 9, [24, 20, 40]); }
      r(x0 + 5, 141, 1, 5, K.WHITE); r(x0 + 5, 140, 1, 1, K.RED); r(x1 - 9, 140, 3, 2, [236, 236, 214]); r(x1 - 10, 144, 5, 2, [52, 195, 143]); // the posters: the rocket, and the dragon under the moon
      r(112, 137, 16, 13, CK.GOLD_DK); r(113, 138, 14, 12, dn([60, 44, 70], [120, 90, 110])); r(119, 138, 2, 12, CK.GOLD_DK);
      if (!day) { r(114, 139, 5, 10, [255, 196, 130]); r(121, 139, 5, 10, [255, 196, 130]); WGLOW.push([113, 138, 14, 12]); }
      r(110, 150, 20, 5, dn(CK.CARPET, [196, 50, 70])); r(110, 150, 20, 1, dn(CK.CARPET2, [220, 80, 96]));
      for (const x of [108, 131]) { r(x, 149, 1, 5, CK.GOLD_HI); } r(108, 150, 24, 1, dn([150, 30, 50], [220, 60, 80])); // the rope
    }
    // THE STAGE's tower: tall and dark, a warm window up top, the stage door at its foot
    { const x0 = 148, x1 = 172, top = 64, T = dn(K.TOWER, DK.TOWER);
      block(x0, x1, top, BASE, T, dn([26, 32, 64], DK.TOWER2), 3);
      for (let y = top + 16; y < BASE - 16; y += 6) r(x0 + 3, y, x1 - x0 - 6, 1, dn([20, 26, 56], shade(DK.TOWER, 0.85)));
      r(x0 + 4, top + 16, 1, 60, dn([22, 30, 66], DK.TOWER2)); r(x1 - 5, top + 16, 1, 60, dn([22, 30, 66], DK.TOWER2));
      r(x0 + 6, top + 4, 12, 8, [18, 20, 36]); if (!day) { for (let y = top + 5; y < top + 11; y++) r(x0 + 7, y, 10, 1, M([255, 214, 140], [255, 160, 90], (y - top - 5) / 6)); WGLOW.push([x0 + 6, top + 4, 12, 8]); } else r(x0 + 7, top + 5, 10, 6, DK.WIN);
      r(159, 54, 1, 8, dn([40, 46, 80], [70, 76, 110])); r(157, 60, 5, 1, dn([40, 46, 80], [70, 76, 110]));
      r(152, 137, 16, 13, [20, 16, 30]); r(153, 138, 14, 12, dn([60, 40, 90], [110, 80, 150])); r(160, 138, 1, 12, [40, 28, 60]); r(158, 144, 1, 2, K.GOLD); r(162, 144, 1, 2, K.GOLD);
    }
    // two ordinary buildings between the Stage and the Crypt: flats over a café (striped awning) and a corner shop
    { block(176, 210, 104, BASE, dn([40, 46, 84], [120, 130, 170]), dn([56, 62, 104], [150, 160, 196]));
      for (let y = 108; y < 136; y += 7) for (let x = 179; x < 206; x += 6) win(x, y, 3, 4, x * 1.9 + y);
      for (let x = 177; x < 210; x += 4) r(x, 137, 2, 3, x % 8 < 4 ? dn([180, 60, 70], [230, 90, 100]) : dn([220, 210, 200], K.WHITE));
      r(180, 141, 26, 9, dn([30, 30, 44], [90, 96, 120])); if (!day) { r(181, 142, 24, 5, [255, 214, 150]); WGLOW.push([181, 142, 24, 5]); } else r(181, 142, 24, 5, DK.WIN);
      block(212, 250, 114, BASE, dn([56, 40, 60], [170, 130, 150]), dn([70, 52, 76], [196, 160, 180]));
      for (let y = 118; y < 138; y += 7) for (let x = 215; x < 246; x += 6) win(x, y, 3, 4, x * 2.7 + y * 1.3);
      r(214, 140, 34, 10, dn([28, 26, 40], [90, 90, 110])); r(222, 142, 18, 8, dn([60, 90, 80], [140, 200, 180])); if (!day) WGLOW.push([222, 142, 18, 8]);
      block(254, 290, 108, BASE, dn([36, 44, 70], [110, 124, 160]), dn([48, 58, 92], [140, 154, 190]));
      for (let y = 112; y < 146; y += 7) for (let x = 257; x < 286; x += 6) win(x, y, 3, 4, x * 3.3 + y * 0.7);
      block(292, 334, 96, BASE, dn([44, 36, 58], [140, 120, 150]), dn([58, 48, 76], [170, 150, 180]));
      for (let y = 100; y < 146; y += 7) for (let x = 295; x < 330; x += 6) win(x, y, 3, 4, x * 1.1 + y * 3.7);
      // a water tower on the corner block's roof
      for (const x of [304, 312]) r(x, 86, 1, 7, dn([50, 40, 36], [120, 96, 80])); r(302, 80, 13, 7, dn([96, 64, 44], [170, 120, 84])); r(302, 80, 13, 1, dn([120, 84, 60], [196, 150, 110])); r(301, 78, 15, 2, dn([70, 50, 40], [130, 96, 76]));
    }
    // THE LOFTS: a tall brick block, rows of windows, the fire escape, a green canopy over the door
    { const x0 = 334, x1 = 388, top = 60, b = dn([104, 52, 52], [178, 92, 76]), m = dn([70, 44, 50], [150, 120, 110]);
      r(x0 - 1, top - 4, x1 - x0 + 2, 4, dn([50, 46, 56], [120, 110, 110])); r(x0 - 1, top - 4, x1 - x0 + 2, 1, dn([90, 84, 100], [170, 160, 160]));
      r(342, 52, 7, 4, dn([80, 84, 96], [170, 174, 184])); r(343, 53, 5, 1, dn([60, 64, 76], [140, 144, 154])); r(368, 50, 5, 6, dn([70, 60, 56], [140, 120, 110])); // an air-con box, a chimney
      brick(x0, x1, top, BASE, b, m); r(x1 - 2, top, 2, BASE - top, shade(b, 0.7));
      for (const [x, y] of LOFT_WIN) { r(x - 1, y - 1, 7, 8, m); r(x, y, 5, 6, day ? DK.WIN : [30, 34, 60]); r(x + 2, y, 1, 6, m); r(x - 1, y + 6, 7, 1, dn([200, 190, 180], K.WHITE)); }
      for (let j = 0; j < 6; j++) { const fy = 74 + j * 11; r(378, fy, 8, 1, [40, 40, 50]); for (let k = 0; k < 4; k++) r(378 + k * 2, fy - 3, 1, 3, [40, 40, 50]); r(378, fy - 3, 8, 1, [40, 40, 50]); if (j < 5) line(379 + (j % 2) * 6, fy, 385 - (j % 2) * 6, fy + 10, [50, 50, 60]); }
      line(379, 92, 385, 92, [200, 200, 210]); for (const [k, c] of [[0, K.RED], [2, K.YEL], [4, [90, 170, 230]]] as [number, RGB][]) r(380 + k, 93, 1, 2, c); // washing on the fire escape
      for (const i of [3, 9, 17, 22, 28]) { const [x, y] = LOFT_WIN[i]; r(x, y + 5, 2, 1, dn(RK.HEDGE, [70, 170, 90])); r(x + 1, y + 4, 1, 1, i % 2 ? K.PINK : K.YEL); } // window boxes
      r(347, 136, 26, 4, dn([30, 60, 50], [60, 130, 100])); r(347, 136, 26, 1, dn([60, 110, 90], [110, 190, 150])); for (let k = 0; k < 6; k++) r(348 + k * 4, 140, 2, 1, dn([30, 60, 50], [60, 130, 100]));
      r(354, 141, 12, 9, [40, 40, 50]); r(355, 142, 10, 8, dn([40, 60, 80], [120, 160, 190])); r(360, 142, 1, 8, [40, 40, 50]); r(358, 145, 1, 2, K.GOLD); r(362, 145, 1, 2, K.GOLD);
      r(352, 150, 16, 2, dn([120, 40, 50], [180, 60, 70]));
    }

    // ---- THE SQUARE ----
    const P0 = dn(K.PAVE, DK.PAVE), P1 = dn(K.PAVE2, DK.PAVE2);
    r(0, BASE, 388, PLZ - BASE, P0);
    for (let y = BASE; y < PLZ; y += 5) { r(0, y, 388, 1, P1); for (let x = ((y - BASE) / 5) % 2 ? 5 : 0; x < 388; x += 10) r(x, y, 1, 5, P1); }
    alpha(0.5, () => r(0, BASE, 388, 2, dn([10, 12, 30], [70, 76, 100]))); // the buildings' shadow
    // the three installations (little versions of the real ones): the castle, the coaster, the dragon
    { const cy = BASE + 1; // castle
      r(64, cy - 3, 18, 3, dn([70, 74, 92], [140, 144, 160])); r(66, cy - 12, 14, 9, dn([60, 170, 200], [110, 210, 240])); for (const x of [65, 72, 79]) { r(x, cy - 16, 3, 5, dn([80, 200, 230], [140, 225, 250])); r(x + 1, cy - 17, 1, 1, dn(K.MAG, K.MAG)); } r(71, cy - 8, 4, 5, dn([30, 60, 90], [60, 110, 150]));
    }
    { const ox = 186, oy = BASE; r(ox, oy - 2, 34, 3, dn([70, 74, 92], [140, 144, 160])); // coaster: a loop and a hill on stilts
      for (const x of [189, 196, 203, 210, 216]) r(x, oy - 12 + (x === 203 ? -6 : 0), 1, 12 - (x === 203 ? -6 : 0), dn([90, 60, 110], [150, 110, 170]));
      line(187, oy - 8, 195, oy - 14, dn(K.MAG, K.MAG)); line(195, oy - 14, 200, oy - 18, dn(K.MAG, K.MAG)); for (let k = 0; k < 20; k++) { const an = k / 20 * Math.PI * 2; r(Math.round(206 + Math.cos(an) * 5), Math.round(oy - 15 + Math.sin(an) * 5), 1, 1, dn(K.MAG, K.MAG)); } line(211, oy - 14, 219, oy - 7, dn(K.MAG, K.MAG));
    }
    { const ox = 256, oy = BASE; r(ox - 2, oy - 3, 36, 4, dn([70, 74, 92], [140, 144, 160])); r(ox - 2, oy - 3, 36, 1, dn([128, 134, 160], [190, 196, 210])); // dragon: coiled on its plinth, wings up
      const D = dn([52, 195, 143], [60, 200, 140]), Dd = dn([30, 130, 96], [40, 150, 106]);
      r(ox + 4, oy - 9, 18, 6, D); r(ox + 4, oy - 4, 18, 1, Dd); r(ox + 20, oy - 14, 5, 6, D); r(ox + 23, oy - 16, 5, 4, D); r(ox + 27, oy - 15, 2, 2, D); r(ox + 25, oy - 15, 1, 1, K.GOLD);
      line(ox + 10, oy - 9, ox + 6, oy - 18, Dd); line(ox + 6, oy - 18, ox + 16, oy - 12, Dd); r(ox + 7, oy - 16, 6, 4, D); line(ox + 4, oy - 6, ox - 1, oy - 10, D);
      for (let k = 0; k < 4; k++) r(ox + 6 + k * 4, oy - 10, 2, 1, dn([255, 214, 90], K.GOLD));
    }
    // benches, bins and the lamps' posts (the lamp heads light up on the live layer)
    for (const bx of [118, 262]) { r(bx, 170, 12, 1, dn(K.WOOD_HI, [200, 150, 100])); r(bx, 172, 12, 2, dn(K.WOOD, K.WOOD_HI)); r(bx + 1, 174, 1, 2, [30, 34, 56]); r(bx + 10, 174, 1, 2, [30, 34, 56]); }
    for (const bx of [146, 330]) { r(bx, 164, 3, 4, dn([46, 90, 70], [70, 140, 100])); r(bx - 1, 163, 5, 1, dn([60, 110, 86], [100, 170, 130])); }
    for (const lx of LAMPS) { r(lx, 146, 1, 12, K.STEEL_POST); r(lx - 1, 158, 3, 1, K.STEEL_POST); r(lx - 1, 145, 3, 1, [30, 34, 56]); }
    // HIDE & SEEK and TAG signs, tiny
    r(49, 156, 1, 6, K.STEEL_POST); r(46, 152, 7, 4, dn([240, 236, 220], K.WHITE)); r(47, 153, 5, 1, [123, 97, 255]); r(47, 155, 3, 1, [123, 97, 255]);
    r(180, 156, 1, 6, K.STEEL_POST); r(177, 152, 7, 4, dn([240, 236, 220], K.WHITE)); r(178, 153, 5, 2, K.RED);
    // the Arcade's lit stairwell down, railings, and the post for its neon sign
    r(66, 177, 18, 11, [14, 10, 24]); for (let k = 0; k < 4; k++) r(68 + k, 179 + k * 2, 14 - k * 2, 1, [70, 56, 100]);
    r(65, 176, 20, 1, [90, 94, 110]); for (const x of [65, 84]) r(x, 172, 1, 16, K.STEEL_POST); r(65, 172, 20, 1, K.STEEL_POST);
    r(94, 168, 1, 20, K.STEEL_POST); r(84, 162, 22, 7, [30, 20, 50]); r(84, 162, 22, 1, [90, 60, 140]);
    // the Subway: green railings round the stairs, the lamp-topped sign, and a zebra crossing on the road below
    { const Gr: RGB = [40, 120, 90]; r(196, 177, 20, 11, [14, 16, 20]); for (let k = 0; k < 4; k++) r(198 + k, 179 + k * 2, 16 - k * 2, 1, [110, 112, 120]);
      r(195, 176, 22, 1, [90, 94, 110]); for (const x of [195, 216]) r(x, 172, 1, 16, Gr); r(195, 172, 22, 1, Gr);
      r(219, 166, 1, 22, Gr); r(210, 162, 20, 6, Gr); r(210, 162, 20, 1, [110, 190, 150]); txt('SUB', 214, 163, [240, 250, 240]); }
    // the map kiosk this map is on (the one on the Square), with its little roof
    r(229, 172, 7, 8, dn([34, 70, 52], [60, 120, 90])); r(230, 173, 5, 5, dn([200, 196, 170], [240, 236, 214])); r(228, 170, 9, 2, dn([30, 60, 46], [50, 100, 76])); r(230, 180, 1, 4, [30, 60, 46]); r(234, 180, 1, 4, [30, 60, 46]);
    // the Crypt's grate and its signpost
    r(290, 180, 14, 6, [20, 22, 30]); for (let x = 291; x < 304; x += 2) r(x, 180, 1, 6, [70, 74, 88]); r(290, 180, 14, 1, [90, 94, 110]);
    r(308, 168, 1, 18, K.STEEL_POST); r(302, 164, 22, 6, [30, 34, 56]); txt('CRYPT', 303, 165, [124, 242, 208]);
    // the signpost at the Square's open end: the beach is that way
    r(384, 160, 1, 12, K.STEEL_POST); r(376, 156, 12, 5, [30, 34, 56]); txt('PIER', 377, 156, [255, 214, 90]);

    // ---- the road along the Square ----
    r(0, PLZ, 388, 2, dn(MP.KERB, MP.KERB_D)); r(0, PLZ + 2, 388, ROAD - PLZ - 4, dn(MP.ROAD, MP.ROAD_D)); r(0, ROAD - 2, 388, 2, dn(MP.KERB, MP.KERB_D));
    for (let x = 4; x < 384; x += 10) if (x < 190 || x > 222) r(x, 196, 5, 1, dn(MP.ROAD_LN, MP.ROAD_LN_D));
    for (let x = 192; x < 222; x += 4) r(x, PLZ + 2, 2, ROAD - PLZ - 4, dn([180, 180, 190], K.WHITE)); // the zebra crossing
    r(386, PLZ, 4, ROAD - PLZ, dn(PK.SAND, MP.SAND_D));
    for (const x of [120, 300]) { oval(x, 196, 3, 1, dn([30, 34, 50], [90, 94, 110])); r(x - 2, 195, 5, 1, dn([50, 56, 76], [130, 134, 150])); } // manhole covers
    // the café's tables out on the Square, under striped umbrellas
    for (const x of [184, 197]) { for (let k = 0; k < 7; k++) r(x - 3 + k, 151 + (k === 0 || k === 6 ? 1 : 0), 1, 1, k % 2 ? dn([220, 210, 200], K.WHITE) : dn([180, 60, 70], [230, 90, 100])); r(x, 152, 1, 4, K.STEEL_POST); r(x - 2, 156, 5, 1, dn([150, 150, 160], [220, 220, 226])); r(x - 3, 157, 1, 1, dn(K.WOOD, K.WOOD_HI)); r(x + 3, 157, 1, 1, dn(K.WOOD, K.WOOD_HI)); }

    // ---- south of the road: the town, with the Park, the Diner and the Kart Track ----
    r(0, ROAD, 390, MAP_H - ROAD, dn(MP.GROUND, MP.GROUND_D)); r(390, 216, 90, MAP_H - 216, dn(MP.GROUND, MP.GROUND_D));
    for (let i = 0; i < 260; i++) { const x = Math.floor(h1(i * 3.1 + 5) * MAP_W), y = ROAD + Math.floor(h1(i * 7.7 + 1) * (MAP_H - ROAD)); r(x, y, 2, 1, dn(MP.GROUND2, MP.GROUND2_D)); }
    // the sea's edge carries on below the pier as a sea wall
    r(386, 214, 94, 2, dn([70, 74, 92], [150, 150, 160]));
    // CITY PARK: a hedge round the edge, a sandy path, the pond, the trees, the sandbox, a bench
    { const g0 = dn(MP.GRASS, MP.GRASS_D), g1 = dn(MP.GRASS2, MP.GRASS2_D);
      r(2, 206, 140, 92, g0); for (let i = 0; i < 180; i++) r(2 + Math.floor(h1(i * 1.9) * 140), 206 + Math.floor(h1(i * 4.3) * 92), 1, 1, g1);
      r(2, 204, 140, 3, dn(MP.TREE, MP.TREE_D)); r(2, 204, 3, 94, dn(MP.TREE, MP.TREE_D)); r(139, 204, 3, 94, dn(MP.TREE, MP.TREE_D)); r(2, 204, 140, 1, dn(MP.TREE_HI, MP.TREE_HI_D));
      r(124, 204, 12, 3, dn(MP.GROUND2, [180, 160, 120])); // the gate, by the station
      const path = dn([90, 84, 70], [214, 190, 140]); oval(70, 258, 44, 26, path); oval(70, 258, 40, 22, g0); for (let y = 207; y < 232; y++) r(129 - Math.round((y - 207) * 0.8), y, 3, 1, path);
      oval(70, 258, 30, 13, dn(MP.POND, MP.POND_D)); oval(68, 256, 22, 8, dn(shade(MP.POND, 1.15), shade(MP.POND_D, 1.08)));
      for (let k = 0; k < 30; k++) { const an = k / 30 * Math.PI * 2; r(Math.round(70 + Math.cos(an) * 30), Math.round(258 + Math.sin(an) * 13), 1, 1, dn([60, 80, 70], [200, 190, 150])); } // the pond's stone edge
      r(96, 263, 8, 1, dn(PK.WOOD, PK.WOOD_HI)); r(96, 264, 1, 2, PK.WOOD_DK); r(103, 264, 1, 2, PK.WOOD_DK); // the jetty
      r(108, 276, 16, 10, dn([150, 130, 90], [236, 214, 150])); r(107, 275, 18, 1, dn(PK.WOOD, PK.WOOD_HI)); r(107, 286, 18, 1, dn(PK.WOOD, PK.WOOD_HI)); r(112, 279, 3, 2, dn([120, 104, 70], [210, 190, 130])); // the sandbox (someone built a castle)
      for (let j = 0; j < 4; j++) for (let i = 0; i < 10; i++) r(80 + i, 287 + j, 1, 1, (Math.floor(i / 2) + j) % 2 ? dn([150, 50, 60], [220, 70, 80]) : dn([200, 196, 190], K.WHITE)); r(91, 286, 3, 3, dn(K.WOOD, K.WOOD_HI)); r(91, 285, 3, 1, dn(K.WOOD_HI, [200, 150, 100])); // a picnic, and its basket
      r(96, 238, 10, 1, dn(K.WOOD_HI, [200, 150, 100])); r(96, 240, 10, 1, dn(K.WOOD, K.WOOD_HI)); r(97, 241, 1, 1, [30, 34, 56]); r(104, 241, 1, 1, [30, 34, 56]);
      for (const [x, y, s] of [[14, 218, 7], [30, 212, 6], [110, 216, 6], [124, 236, 5], [10, 276, 7], [26, 292, 5], [122, 294, 6], [18, 244, 5], [58, 216, 5], [132, 262, 4]] as [number, number, number][]) tree(x, y, s, day);
    }
    // the town inside the Subway's loop: little houses, a lane between them, a corner tree
    r(152, 225, 146, 2, dn([40, 44, 60], [150, 150, 150]));
    for (let i = 0; i < 6; i++) { const x = 158 + i * 22, c = [[120, 70, 60], [70, 90, 120], [110, 100, 70], [80, 110, 90], [120, 90, 110], [90, 80, 70]][i] as RGB; house(x, 223, c, i, day); }
    for (let i = 0; i < 6; i++) { const x = 158 + i * 22 + 4, c = [[90, 100, 120], [120, 80, 70], [80, 110, 90], [110, 100, 70], [70, 90, 120], [120, 70, 60]][i] as RGB; house(x, 238, c, i + 7, day); }
    // THE GREASY BYTE: a chrome diner car with a teal stripe, its car park, a chimney
    { const x0 = 184, x1 = 264, top = 262, base = 280;
      r(168, 280, 122, 18, dn(MP.ROAD, MP.ROAD_D)); for (let x = 172; x < 288; x += 12) r(x, 284, 1, 12, dn([150, 150, 160], K.WHITE));
      oval((x0 + x1) / 2, top - 3, (x1 - x0) / 2, 4, dn([120, 126, 136], [200, 206, 214])); r(x0 + 2, top - 5, x1 - x0 - 4, 2, dn([150, 156, 166], [230, 234, 240]));
      r(x0, top, x1 - x0, base - top, dn([150, 156, 166], [214, 220, 228])); for (let y = top + 1; y < base; y += 2) r(x0, y, x1 - x0, 1, dn([130, 136, 146], [196, 202, 212]));
      r(x0, top + 11, x1 - x0, 3, dn([30, 130, 130], [40, 170, 170])); r(x0, base - 2, x1 - x0, 2, dn([80, 84, 96], [150, 154, 164]));
      for (let x = x0 + 4; x < x1 - 4; x += 8) if (x < 218 || x > 230) { r(x, top + 3, 6, 6, [40, 44, 56]); if (day) r(x + 1, top + 4, 4, 4, DK.WIN); else { r(x + 1, top + 4, 4, 4, [255, 214, 150]); WGLOW.push([x + 1, top + 4, 4, 4]); } }
      r(220, top + 2, 9, base - top - 2, [40, 44, 56]); r(221, top + 3, 7, base - top - 3, dn([255, 200, 140], [180, 220, 230])); r(224, top + 3, 1, base - top - 3, [40, 44, 56]); if (!day) WGLOW.push([221, top + 3, 7, base - top - 3]);
      r(218, base, 13, 2, dn([100, 100, 110], [170, 170, 180]));
      r(194, 250, 5, 8, dn([70, 60, 56], [140, 120, 110])); r(193, 249, 7, 2, dn([50, 44, 40], [110, 96, 88]));
      r(274, 244, 1, 18, K.STEEL_POST); r(262, 236, 26, 9, [30, 20, 40]); r(262, 236, 26, 1, [120, 60, 100]);
      car(240, 288, dn([170, 40, 50], [220, 60, 70]), day); car(176, 288, dn([30, 120, 120], [50, 170, 170]), day);
    }
    // THE KART TRACK: the oval with its kerbs, the start line, tyre walls, the grandstand
    { const g0 = dn(MP.GRASS, MP.GRASS_D);
      r(308, 216, 172, 84, g0); for (let i = 0; i < 120; i++) r(308 + Math.floor(h1(i * 2.9 + 3) * 172), 216 + Math.floor(h1(i * 6.1 + 2) * 84), 1, 1, dn(MP.GRASS2, MP.GRASS2_D));
      oval(KT.cx, KT.cy, KT.rx, KT.ry, dn(MP.ROAD, [70, 72, 84])); oval(KT.cx, KT.cy, KT.rx - KT.band, KT.ry - KT.band, g0);
      for (let k = 0; k < 96; k++) { const an = k / 96 * Math.PI * 2; r(Math.round(KT.cx + Math.cos(an) * KT.rx), Math.round(KT.cy + Math.sin(an) * KT.ry), 1, 1, k % 2 ? K.RED : K.WHITE); }
      for (let k = 0; k < 72; k++) { const an = k / 72 * Math.PI * 2; r(Math.round(KT.cx + Math.cos(an) * (KT.rx - KT.band)), Math.round(KT.cy + Math.sin(an) * (KT.ry - KT.band)), 1, 1, k % 2 ? K.RED : K.WHITE); }
      for (let j = 0; j < KT.band; j++) for (let i = 0; i < 2; i++) r(KT.cx - 1 + i, KT.cy - KT.ry + j, 1, 1, (i + j) % 2 ? K.BLACK : K.WHITE); // the start / finish line
      for (const [x, y] of [[314, 246], [314, 274], [470, 246], [470, 274]] as [number, number][]) for (let k = 0; k < 3; k++) { r(x, y + k * 2, 4, 2, [24, 24, 30]); r(x, y + k * 2, 4, 1, k % 2 ? K.RED : [200, 200, 210]); }
      r(362, 292, 60, 6, dn([60, 60, 72], [150, 150, 164])); for (let y = 293; y < 298; y += 2) for (let x = 363; x < 421; x += 2) r(x, y, 1, 1, CONFETTI[Math.floor(h1(x * 1.3 + y) * CONFETTI.length)]); // the grandstand and its crowd
      r(360, 290, 64, 2, dn([90, 30, 36], [200, 60, 70]));
      r(340, 250, 26, 10, dn([60, 60, 72], [160, 160, 172])); r(339, 247, 28, 3, dn([170, 80, 30], [230, 120, 50])); r(339, 247, 28, 1, dn([200, 110, 50], [250, 160, 90])); for (let k = 0; k < 3; k++) r(342 + k * 8, 253, 6, 7, dn([30, 30, 40], [80, 80, 90])); // the pit garage
      for (let k = 0; k < 3; k++) { r(368, 256 + k * 2, 3, 2, [24, 24, 30]); r(368, 256 + k * 2, 3, 1, [60, 60, 70]); }
      for (let k = 0; k < 14; k++) { const an = Math.PI * (0.8 + k * 0.03); r(Math.round(KT.cx + Math.cos(an) * (KT.rx - 3)), Math.round(KT.cy + Math.sin(an) * (KT.ry - 3)), 1, 1, dn([20, 20, 26], [50, 50, 60])); } // skid marks on the far bend
      r(392, 222, 1, 12, K.STEEL_POST); // the flag's pole
      for (const [x, y] of LIGHTS) { r(x, y, 1, 14, K.STEEL_POST); r(x - 2, y - 2, 5, 2, [50, 54, 70]); }
      r(420, 218, 34, 7, [30, 24, 30]); r(420, 218, 34, 1, [200, 60, 60]); txt('KARTS', 427, 219, K.WHITE);
    }
    // the Subway underground: its line (dashed: it's down there somewhere) and the roundels at its stops
    for (let i = 0; i < LOOP.length - 1; i++) { const [x0, y0] = LOOP[i], [x1, y1] = LOOP[i + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) if ((k + i) % 4 < 2) r(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), 2, 2, dn(MP.LINE, [40, 140, 100])); }
    STN.forEach(([x, y], i) => { disc(x, y, 5, [30, 34, 40]); disc(x, y, 4, [40, 120, 90]); disc(x, y, 2, K.WHITE); r(x - 1, y, 3, 1, [30, 34, 40]); const L = STATIONS[i].name[0]; txt(L, x + 6, y - 2, dn([200, 240, 220], [20, 60, 46])); });

    // ---- ORBIT and THE MOON: two "not to scale" boxes up in the sky ----
    insetFrame(ORBIT); insetFrame(MOONBOX);
    // (the tabs go on last: over the boxes' insides)
    // ORBIT: Earth's curve along the bottom, the station in the middle (its rocket and lander ports either side)
    clipTo(ORBIT, () => {
      disc(149, 164, 118, SK.ATMOS); disc(149, 165, 117, SK.OCEAN); for (let k = 0; k < 14; k++) { const x = 106 + Math.floor(h1(k * 3.3) * 86), y = 48 + Math.floor(h1(k * 5.1) * 8); r(x, y, 3 + Math.floor(h1(k) * 5), 1, h1(k * 7) > 0.4 ? SK.LAND : SK.CLOUD); }
      r(ORBIT.x0, 47, ORBIT.x1 - ORBIT.x0, 1, SK.ATMOS);
      r(114, 23, 70, 2, SK.HULL_DK); for (let x = 116; x < 184; x += 4) r(x, 23, 1, 2, SK.TRIM); // the truss
      for (const x of [114, 176]) for (const y of [12, 26]) { r(x, y, 8, 10, SK.SOLAR); for (let k = 0; k < 8; k += 2) r(x + k, y, 1, 10, SK.SOLAR_LN); r(x, y + 5, 8, 1, SK.SOLAR_LN); r(x, y, 8, 1, SK.SOLAR_HI); }
      r(142, 19, 14, 10, SK.HULL); r(142, 19, 14, 1, SK.HULL_HI); r(142, 28, 14, 1, SK.HULL_SH); r(148, 19, 1, 10, SK.SEAM); r(144, 21, 2, 2, SK.GLASS); r(151, 21, 2, 2, SK.GLASS);
      r(136, 21, 6, 6, SK.PANEL); r(136, 21, 6, 1, SK.HULL_HI); r(156, 21, 6, 6, SK.PANEL); r(156, 21, 6, 1, SK.HULL_HI);
      r(146, 29, 6, 3, SK.GOLD_FOIL); r(146, 29, 6, 1, SK.GOLD_FOIL_HI); // the window module underneath (MISSION CONTROL)
      r(134, 23, 2, 2, SK.TRIM); r(162, 23, 2, 2, SK.TRIM); // the ports
      r(170, 32, 4, 4, [236, 120, 60]); r(171, 33, 2, 2, SK.WINDOW); // the escape pod
      disc(186, 36, 3, SK.HAZ_DK); disc(186, 36, 2, SK.PANEL2); // the airlock
    });
    // THE MOON: grey hills, the pad, the base (a dome, modules and a solar mast), the buggy course, the flag
    clipTo(MOONBOX, () => {
      disc(249, 196, 156, MN.HILL3); disc(249, 198, 155, MN.REG2); for (let k = 0; k < 10; k++) { const x = 208 + Math.floor(h1(k * 4.7) * 82), y = 46 + Math.floor(h1(k * 2.3) * 9); oval(x, y, 2 + Math.floor(h1(k) * 2), 1, MN.REG_DK); r(x - 1, y - 1, 2, 1, MN.REG_HI); }
      r(MOONBOX.x0, 41, MOONBOX.x1 - MOONBOX.x0, 1, MN.REG_HI);
      oval(222, 47, 7, 2, MN.REG_DK); oval(222, 47, 5, 1, MN.REG); r(216, 47, 13, 1, SK.HAZ); // the pad
      for (let k = 0; k < 24; k++) { const an = k / 24 * Math.PI * 2; if (k % 2) r(Math.round(240 + Math.cos(an) * 9), Math.round(51 + Math.sin(an) * 3), 1, 1, MN.REG_DK2); } // the buggy's lap
      r(270, 38, 16, 7, MN.BASE); r(270, 38, 16, 1, MN.BASE_HI); r(270, 44, 16, 1, MN.BASE_SH); r(276, 40, 3, 5, MN.ORANGE); // a module
      oval(264, 42, 6, 5, MN.DOME_DK); oval(264, 41, 5, 4, MN.DOME); r(262, 38, 2, 2, MN.DOME_HI); r(258, 44, 13, 2, MN.BASE2); // the greenhouse dome
      for (let k = 0; k < 3; k++) r(262 + k * 2, 42, 1, 2, MN.LEAF);
      r(289, 26, 1, 14, MN.BASE_DK); r(286, 26, 7, 3, SK.SOLAR); // the solar mast
      r(247, 38, 1, 8, K.WHITE); r(248, 38, 4, 3, K.RED); r(249, 39, 1, 1, K.WHITE); // COSMO's flag
      for (let k = 0; k < 5; k++) r(233 + k * 3 + (k % 2), 49 + (k % 2), 1, 1, MN.REG_DK2); // bootprints from the pad
    });
    insetTab(ORBIT, 'ORBIT'); insetTab(MOONBOX, 'THE MOON');
  });
}
/** Where the lamps stand on the Square. */
const LAMPS = [60, 104, 170, 252, 290, 334];
/** The kart track's floodlights. */
const LIGHTS: [number, number][] = [[318, 226], [466, 226], [318, 280], [466, 280]];

function tree(x: number, y: number, s: number, day: boolean): void {
  const c = day ? MP.TREE_D : MP.TREE, hi = day ? MP.TREE_HI_D : MP.TREE_HI;
  alpha(0.35, () => oval(x + 2, y + s - 1, s, 2, [0, 0, 0]));
  r(x, y, 2, s, MP.TRUNK); disc(x + 1, y - 1, s, c); disc(x - 1, y - 3, s - 2, hi); r(x - 2, y - 5, 2, 1, shade(hi, 1.2));
}
function house(x: number, y: number, c: RGB, seed: number, day: boolean): void {
  const wall = day ? shade(c, 1.6) : c, roof = day ? shade(c, 1.1) : shade(c, 0.6);
  r(x, y - 7, 14, 7, wall); r(x + 12, y - 7, 2, 7, shade(wall, 0.8));
  for (let k = 0; k < 4; k++) r(x - 1 + k, y - 8 - k, 16 - k * 2, 1, roof); r(x + 6, y - 4, 2, 4, day ? [70, 50, 40] : [30, 20, 20]);
  const on = h1(seed * 2.2) < 0.6; r(x + 2, y - 5, 2, 2, day ? DK.WIN : on ? K.WIN_Y : [22, 26, 48]); r(x + 10, y - 5, 2, 2, day ? DK.WIN : h1(seed * 5.3) < 0.5 ? K.WIN_Y : [22, 26, 48]);
  if (!day && on) WGLOW.push([x + 2, y - 5, 2, 2]);
}
function car(x: number, y: number, c: RGB, day: boolean): void {
  r(x, y, 10, 4, c); r(x + 2, y - 2, 6, 2, shade(c, 0.85)); r(x + 3, y - 2, 4, 1, day ? DK.WIN : [40, 50, 80]); r(x + 1, y + 4, 2, 1, K.BLACK); r(x + 7, y + 4, 2, 1, K.BLACK);
}
function insetFrame(q: Rect): void {
  r(q.x0 - 2, q.y0 - 2, q.x1 - q.x0 + 4, q.y1 - q.y0 + 4, MP.FRAME); r(q.x0 - 1, q.y0 - 1, q.x1 - q.x0 + 2, q.y1 - q.y0 + 2, MP.FRAME_HI);
  r(q.x0, q.y0, q.x1 - q.x0, q.y1 - q.y0, SK.VOID);
  for (let i = 0; i < 26; i++) r(q.x0 + Math.floor(h1(i * 2.1 + q.x0) * (q.x1 - q.x0)), q.y0 + Math.floor(h1(i * 5.3 + q.y0) * 34), 1, 1, h1(i + q.x0) > 0.7 ? SK.STAR : SK.STAR_DIM);
}
/** The box's name on a tab over its top edge, and NOT TO SCALE in small print, like a real map's inset. */
function insetTab(q: Rect, name: string): void {
  const w = tw(name) + 6; r(q.x0 + 2, q.y0 - 5, w, 8, MP.FRAME); r(q.x0 + 3, q.y0 - 4, w - 2, 6, MP.TAG); r(q.x0 + 3, q.y0 - 4, w - 2, 1, MP.FRAME_HI); txt(name, q.x0 + 5, q.y0 - 3, [220, 226, 255]);
}
/** Draw only inside q (the insets). */
function clipTo(q: Rect, fn: () => void): void {
  const c = PX.ctx; c.save(); c.beginPath(); c.rect(q.x0, q.y0, q.x1 - q.x0, q.y1 - q.y0); c.clip(); try { fn(); } finally { c.restore(); }
}

// =====================================================================================
// THE LIVE LAYER
// =====================================================================================
export interface MapDot { id: string; name: string; col: RGB; friend: boolean; room: RoomId }
export interface MapLive {
  /** Seconds (animation). */
  a: number;
  /** Everyone else online, where they are (empty during hide and seek). */
  people: MapDot[];
  /** You: your colour, and the room you're in. */
  me: { col: RGB; room: RoomId };
  /** Hide and seek is on: nobody is shown. */
  hiding: boolean;
  /** The place under the pointer, the one picked (its pin drops), and the places you've been. */
  hover: RoomId | null;
  pin: { id: RoomId; t0: number } | null;
  seen: Set<string>;
  /** The board this map was opened from (its YOU ARE HERE star). */
  board: RoomId | null;
  /** The Lofts: how many flats are in use, and whether a HOUSE PARTY is on. */
  flats: number; party: boolean;
}

/** Quadratic curve point. */
const qb = (p0: [number, number], c: [number, number], p1: [number, number], u: number): [number, number] => [(1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p1[0], (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p1[1]];
/** The rocket's route (the Rooftop pad to the station's left port) and the lander's (the station's right port to the Moon's pad). */
const RKT: [[number, number], [number, number], [number, number]] = [[50, 80], [58, 26], [130, 24]];
const LDR: [[number, number], [number, number], [number, number]] = [[166, 24], [199, -4], [222, 43]];
/** Where the rocket is on the map now, and whether it's moving (-1 = on the pad, 1 = docked). */
function rocketAt(): { x: number; y: number; u: number; moving: boolean } {
  const f = flight();
  if (f.phase === 'pad') return { x: RKT[0][0], y: RKT[0][1], u: 0, moving: false };
  if (f.phase === 'docked') return { x: RKT[2][0], y: RKT[2][1], u: 1, moving: false };
  const u = f.phase === 'up' ? clamp(f.k / UP_S, 0, 1) : 1 - clamp((f.k - DEPART) / (LAND - DEPART), 0, 1), [x, y] = qb(RKT[0], RKT[1], RKT[2], u);
  return { x, y, u, moving: true };
}
function landerAt(): { x: number; y: number; u: number; moving: boolean } {
  const f = lander();
  if (f.phase === 'docked') return { x: LDR[0][0], y: LDR[0][1], u: 0, moving: false };
  if (f.phase === 'landed') return { x: LDR[2][0], y: LDR[2][1], u: 1, moving: false };
  const u = f.phase === 'down' ? clamp((f.k - L_UNDOCK) / (L_TOUCH - L_UNDOCK), 0, 1) : 1 - clamp((f.k - L_LIFT) / (L_CYCLE - L_LIFT), 0, 1), [x, y] = qb(LDR[0], LDR[1], LDR[2], u);
  return { x, y, u, moving: true };
}
/** Where the train is on its loop. */
function trainAt(): [number, number] {
  const t = train(), a = LOOP_AT[t.at];
  if (t.phase !== 'ride') return STN[t.at];
  const b = t.next === 0 ? LOOP.length - 1 : LOOP_AT[t.next], pts = LOOP.slice(a, b + 1);
  let len = 0; const segs: number[] = []; for (let i = 0; i < pts.length - 1; i++) { const d = Math.abs(pts[i + 1][0] - pts[i][0]) + Math.abs(pts[i + 1][1] - pts[i][1]); segs.push(d); len += d; }
  let d = t.u * len;
  for (let i = 0; i < segs.length; i++) { if (d <= segs[i]) { const k = segs[i] ? d / segs[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } d -= segs[i]; }
  return STN[t.next];
}
/** Where someone in room `id` is drawn: at their place, or riding the train / the rocket / the lander. */
export function spotOf(id: RoomId): [number, number] | null {
  if (id === 'train') return trainAt();
  if (id === 'rocket') { const p = rocketAt(); return [p.x, p.y]; }
  if (id === 'lander') { const p = landerAt(); return [p.x, p.y]; }
  const pl = placeById(id === 'flat' || id === 'flatbed' || id === 'flatkit' ? 'lofts' : id);
  return pl ? pl.at : null;
}

export function drawMapLive(L: MapLive): void {
  const a = L.a, day = dayness(), night = 1 - day, w = weather(), wd = wind();
  // ---- the sky: twinkles, searchlights, clouds drifting by day ----
  if (night > 0.3) lit(() => { for (let i = 0; i < 18; i++) if ((a * 0.6 + h1(i + 7)) % 1 < 0.15) r(Math.floor(h1(i * 9.7) * MAP_W), Math.floor(h1(i * 3.9) * 76), 1, 1, [230, 235, 255]); });
  if (night > 0.3) for (const [bx, ph] of [[60, 0], [300, 2]] as [number, number][]) { const an = -Math.PI / 2 + 0.4 * Math.sin(a * 0.45 + ph); Gline(bx, BASE, bx + Math.cos(an) * 170, BASE + Math.sin(an) * 170, [150, 190, 255], 0.06 * night, 12); }
  if (day > 0.2) alpha(day, () => { for (let i = 0; i < 5; i++) { const x = ((h1(i * 3.3) * 520 + a * (2 + i * 0.6) * (0.5 + wd.dx * 0.1)) % 540) - 40, y = 8 + Math.floor(h1(i * 7.1) * 50); r(x, y, 16, 3, DK.CLOUD); r(x + 3, y - 2, 8, 2, DK.CLOUD); r(x + 1, y + 3, 14, 1, DK.SKY1); } });
  // ---- lit windows' soft light, and the lamps on the Square ----
  if (night > 0.05) for (const [x, y, ww, hh] of WGLOW) G(x - 1, y - 1, ww + 2, hh + 2, [255, 200, 120], 0.14 * night);
  for (const lx of LAMPS) { lit(() => r(lx - 1, 144, 3, 2, M([120, 110, 80], [255, 230, 170], night))); if (night > 0.1) { Gd(lx, 145, 5, [255, 220, 150], 0.5 * night); G(lx - 6, 156, 13, 3, [255, 220, 150], 0.12 * night); } }
  // ---- the signs ----
  { const fl = (a * 7) % 1 < 0.06 || (a * 0.37) % 1 < 0.03; lit(() => txt('LAB', 27, 127, fl ? [120, 70, 50] : [255, 158, 100])); if (!fl) G(22, 125, 22, 8, [255, 140, 80], 0.35); }
  lit(() => { const s = 'ARCADE'; let x = 85; for (let i = 0; i < s.length; i++) { txt(s[i], x, 163, CONFETTI[(i + Math.floor(a * 3)) % CONFETTI.length]); x += 4; } }); G(84, 161, 22, 8, [255, 120, 220], 0.28); G(66, 177, 18, 11, [200, 120, 255], 0.14 + 0.06 * Math.sin(a * 3));
  { // the cinema's marquee: chasing bulbs round the board, and tonight's film scrolling past
    const x0 = 99, x1 = 139, y0 = 119, y1 = 130, step = Math.floor(a * 8);
    lit(() => { const per = 2 * (x1 - x0 + y1 - y0); for (let i = 0; i < 26; i++) { const d = (i / 26) * per, [bx, by] = d < x1 - x0 ? [x0 + d, y0] : d < x1 - x0 + y1 - y0 ? [x1, y0 + d - (x1 - x0)] : d < 2 * (x1 - x0) + y1 - y0 ? [x1 - (d - (x1 - x0) - (y1 - y0)), y1] : [x0, y1 - (d - 2 * (x1 - x0) - (y1 - y0))]; r(Math.round(bx), Math.round(by), 1, 1, (i + step) % 3 === 0 ? K.GOLD : [120, 80, 40]); } });
    const s = 'NOW SHOWING: ' + FILMS[currentFilm()].title + '   ', wS = tw(s) + 4, off = Math.floor(a * 14) % wS;
    const c = PX.ctx; c.save(); c.beginPath(); c.rect(x0 + 2, y0 + 2, x1 - x0 - 3, y1 - y0 - 3); c.clip(); lit(() => { txt(s, x0 + 2 - off, y0 + 3, [255, 236, 170]); txt(s, x0 + 2 - off + wS, y0 + 3, [255, 236, 170]); }); c.restore();
    G(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4, [255, 200, 110], 0.25); if (night > 0.1) G(110, 150, 22, 6, [255, 120, 110], 0.15 * night);
  }
  lit(() => txt('STAGE', 150, 132, (a % 1.4) < 1.1 ? K.MAG : [120, 40, 100])); G(149, 130, 22, 8, K.MAG, 0.25);
  lit(() => r(159, 53, 1, 1, a % 1.2 < 0.5 ? [255, 70, 80] : [90, 20, 30])); if (a % 1.2 < 0.5) Gd(159, 53, 3, [255, 70, 80], 0.5);
  lit(() => r(218, 165, 3, 2, [255, 240, 200])); Gd(219, 166, 4, [255, 240, 200], 0.4); G(196, 177, 20, 11, [255, 230, 180], 0.08);
  lit(() => r(230, 173, 5, 5, M([200, 196, 170], [255, 244, 200], night))); if (night > 0.1) Gd(232, 175, 5, [255, 244, 200], 0.3 * night); // the kiosk's panel, lit from inside
  G(288, 178, 18, 10, [124, 242, 208], 0.14 + 0.08 * Math.sin(a * 2));
  { const u = (a * 0.25) % 1; if (u < 0.5) alpha(Math.sin(u * 2 * Math.PI) * 0.7, () => { const y = 180 - u * 30, x = 297 + Math.sin(a * 3) * 2; lit(() => { r(x, y, 3, 3, XGHOST); r(x, y + 3, 1, 1, XGHOST); r(x + 2, y + 3, 1, 1, XGHOST); r(x, y + 1, 1, 1, [40, 60, 70]); r(x + 2, y + 1, 1, 1, [40, 60, 70]); }); }); } // a wisp rising out of the Crypt
  { const on = (a * 1.3) % 11 > 0.25; lit(() => { r(345, 130, 30, 6, [30, 24, 40]); txt('LOFTS', 350, 131, on ? [124, 242, 208] : [40, 80, 70]); }); if (on) G(345, 130, 30, 6, [124, 242, 208], 0.2); }
  // ---- the Lofts: a lit window for every flat in use (a HOUSE PARTY flashes) ----
  for (let i = 0; i < Math.min(L.flats, LOFT_WIN.length); i++) { const [x, y] = LOFT_WIN[(i * 13 + 5) % LOFT_WIN.length], party = L.party && i === 0; const c: RGB = party ? CONFETTI[Math.floor(a * 6) % CONFETTI.length] : [255, 206, 130]; lit(() => { r(x, y, 2, 6, c); r(x + 3, y, 2, 6, c); }); G(x - 1, y - 1, 7, 8, c, party ? 0.5 : 0.25); }
  // ---- the reactor's cooling tower: steam (thicker during a shift; green for a minute after a meltdown) ----
  { const on = gridOn(), green = meltAgo() < 60, n = on ? 6 : 3; for (let i = 0; i < n; i++) { const u = ((a * (on ? 0.35 : 0.2)) + i / n) % 1; alpha((on ? 0.7 : 0.45) * (1 - u), () => disc(Math.round(79 + u * (6 + wd.dx * 8) + Math.sin(i * 2 + a) * 2), Math.round(88 - u * 26), Math.round(2 + u * (on ? 6 : 4)), green ? [140, 255, 120] : day > 0.5 ? [244, 246, 250] : [150, 156, 176])); } if (green) Gd(79, 100, 16, [120, 255, 110], 0.35); if (on && night > 0.2) Gd(79, 92, 10, [255, 240, 200], 0.2); }
  // ---- the rides: the train (under the town), the rocket, the lander ----
  { const [tx, ty] = trainAt().map(Math.round); lit(() => { r(tx - 4, ty - 2, 9, 4, [40, 120, 90]); r(tx - 4, ty - 2, 9, 1, [110, 190, 150]); for (let k = 0; k < 3; k++) r(tx - 3 + k * 3, ty - 1, 2, 1, [255, 240, 190]); }); Gd(tx, ty, 6, [255, 240, 190], 0.3); }
  { const p = rocketAt(), f = flight();
    if (p.moving) { const [px, py] = qb(RKT[0], RKT[1], RKT[2], clamp(p.u + (f.phase === 'up' ? -0.06 : 0.06), 0, 1)); lit(() => { r(Math.round(px), Math.round(py), 2, 2, SK.FLAME_HI); r(Math.round((px + p.x) / 2), Math.round((py + p.y) / 2), 1, 1, SK.FLAME); }); Gd(p.x, p.y, 6, SK.FLAME, 0.5); }
    for (let k = 0; k < 14; k++) { const u = (k + (a * 0.8) % 1) / 14; if (u > 1) continue; const [x, y] = qb(RKT[0], RKT[1], RKT[2], u); alpha(0.5, () => r(Math.round(x), Math.round(y), 1, 1, [200, 210, 240])); }
    miniRocket(p.x, p.y, p.u > 0.7 && !(f.phase === 'up' && p.u < 1) ? 'side' : 'up', f.phase === 'pad' && f.left < 4 ? Math.sin(a * 60) : 0); }
  { const p = landerAt();
    for (let k = 0; k < 12; k++) { const u = (k + (a * 0.6) % 1) / 12; const [x, y] = qb(LDR[0], LDR[1], LDR[2], u); alpha(0.45, () => r(Math.round(x), Math.round(y), 1, 1, [220, 210, 170])); }
    miniLander(p.x, p.y, p.moving, a); if (p.moving) Gd(p.x, p.y + 3, 4, SK.FLAME, 0.4); }
  // ---- space: twinkles in the boxes, Earth turning in the Moon's sky, crystals glinting, someone on a spacewalk ----
  lit(() => { for (const q of [ORBIT, MOONBOX]) for (let i = 0; i < 5; i++) if ((a * 0.9 + h1(i + q.x0)) % 1 < 0.2) r(q.x0 + 2 + Math.floor(h1(i * 4.1 + q.x0) * (q.x1 - q.x0 - 4)), q.y0 + 2 + Math.floor(h1(i * 6.7 + q.x0) * 30), 1, 1, SK.STAR); });
  { const ex = 284, ey = 17; disc(ex, ey, 5, SK.OCEAN); for (let k = 0; k < 4; k++) { const x = ((k * 5 + a * 1.5) % 14) - 7; if (Math.abs(x) < 5) r(Math.round(ex + x), ey - 2 + (k % 3) * 2, 2, 1, k % 2 ? SK.LAND : SK.CLOUD); } r(ex - 5, ey, 1, 1, SK.ATMOS); Gd(ex, ey, 7, SK.ATMOS, 0.2); }
  lit(() => { for (const [x, y, k] of [[236, 47, 0], [248, 52, 1], [210, 52, 2], [244, 44, 3]] as [number, number, number][]) if ((a * 0.8 + k * 0.37) % 1 < 0.5) r(x, y, 1, 1, k % 2 ? MN.CRYSTAL2 : MN.CRYSTAL); });
  for (const [x, y, k] of [[236, 47, 0], [248, 52, 1], [210, 52, 2], [244, 44, 3]] as [number, number, number][]) Gd(x, y, 2, k % 2 ? MN.CRYSTAL2 : MN.CRYSTAL, 0.25);
  lit(() => r(264, 38, 1, 1, (a % 2) < 1 ? MN.DOME_HI : MN.DOME));
  if (L.people.some((p) => p.room === 'spacewalk') || L.me.room === 'spacewalk') { const x = 181 + Math.sin(a * 0.7) * 2, y = 36 + Math.cos(a * 0.5) * 2; line(186, 36, Math.round(x), Math.round(y), [200, 200, 210]); lit(() => { r(Math.round(x) - 1, Math.round(y) - 1, 3, 3, K.WHITE); r(Math.round(x), Math.round(y) - 1, 1, 1, SK.GLASS); }); }
  // ---- the Pier: the lighthouse's beam sweeping, the sea glittering, the bonfire, a sailing boat, a crab ----
  { const an = a * 0.9; Gline(458, 107, 458 + Math.cos(an) * 60, 107 + Math.sin(an) * 12, [255, 250, 210], 0.18 * (0.3 + 0.7 * night), 5); lit(() => r(456, 105, 5, 4, (Math.cos(an) > 0.6) ? K.WHITE : [255, 240, 170])); Gd(458, 107, 5, [255, 250, 210], 0.5); }
  lit(() => { for (let i = 0; i < 16; i++) { const y = HOR + 4 + Math.floor(h1(i * 2.2) * 108), x = shore(y) + 4 + Math.floor(h1(i * 5.5) * (MAP_W - shore(y) - 6)); if ((a * 0.7 + h1(i)) % 1 < 0.35) r(x, y, 2, 1, day > 0.5 ? MP.SEA_HI_D : [80, 120, 190]); } });
  for (let y = HOR + 60; y < 214; y += 7) { const x = shore(y) + 1 + Math.round(Math.sin(a * 1.4 + y) * 1.5); lit(() => r(x, y, 2, 1, PK.FOAM)); }
  { const f = Math.floor(a * 10) % 3; lit(() => { r(396, 202 - f, 3, 3 + f, PK.FIRE); r(397, 201 - f, 1, 2, PK.FIRE_HI); }); Gd(398, 202, 7 + f, PK.FIRE, 0.45); }
  { const bx = 404 + ((a * 3) % 90), by = 128; if (bx < 474) { r(Math.round(bx), by, 7, 2, [240, 236, 220]); r(Math.round(bx) + 1, by + 2, 5, 1, K.BROWN); r(Math.round(bx) + 3, by - 7, 1, 7, [70, 60, 50]); r(Math.round(bx) + 4, by - 6, 3, 5, K.WHITE); } }
  { const cx = 390 + ((Math.sin(a * 0.4) + 1) * 6), cy = 210; r(Math.round(cx), cy, 3, 1, PK.CRAB); r(Math.round(cx) - 1, cy - 1, 1, 1, PK.CRAB); r(Math.round(cx) + 3, cy - 1, 1, 1, PK.CRAB); }
  lit(() => r(473, 155, 3, 2, M([120, 100, 60], [255, 230, 170], night))); if (night > 0.1) Gd(474, 156, 4, [255, 230, 170], 0.4 * night);
  { const by = 194 + Math.round(Math.sin(a * 1.6)); r(432, by, 3, 4, K.RED); r(432, by, 3, 1, [255, 120, 120]); r(433, by - 2, 1, 2, K.STEEL_POST); if ((a % 2) < 0.3) { lit(() => r(433, by - 3, 1, 1, [255, 90, 90])); Gd(433, by - 3, 4, [255, 90, 90], 0.5); } } // a buoy, bobbing and blinking
  // ---- the Park: the pond's ripples, a rowing boat going round, ducks, a kite up on the wind ----
  lit(() => { for (let i = 0; i < 6; i++) if ((a * 0.5 + h1(i + 3)) % 1 < 0.4) r(48 + Math.floor(h1(i * 3.9) * 44), 251 + Math.floor(h1(i * 7.3) * 12), 3, 1, day > 0.5 ? MP.POND_HI_D : MP.POND_HI); });
  { const an = a * 0.12, bx = 70 + Math.cos(an) * 18, by = 258 + Math.sin(an) * 6; r(Math.round(bx) - 3, Math.round(by), 7, 2, PK.WOOD_HI); r(Math.round(bx) - 3, Math.round(by) + 2, 7, 1, PK.WOOD_DK); line(Math.round(bx) - 5, Math.round(by) + 2 + Math.round(Math.sin(a * 3)), Math.round(bx) + 5, Math.round(by) + 1 - Math.round(Math.sin(a * 3)), [200, 180, 140]); }
  for (let k = 0; k < 3; k++) { const dx = 56 + k * 5 + Math.sin(a * 0.3 + k) * 3, dy = 264 + (k % 2); r(Math.round(dx), dy, 2, 1, day > 0.5 ? K.WHITE : [200, 200, 190]); r(Math.round(dx) + 2, dy - 1, 1, 1, K.YEL); }
  { const kx = 36 + Math.sin(a * 0.7) * 4 + wd.dx * 3, ky = 222 + Math.cos(a * 0.9) * 2; line(30, 240, Math.round(kx), Math.round(ky) + 3, [220, 220, 220]); lit(() => { r(Math.round(kx) - 2, Math.round(ky), 5, 1, K.RED); r(Math.round(kx) - 1, Math.round(ky) - 1, 3, 3, K.RED); r(Math.round(kx), Math.round(ky) - 2, 1, 5, K.YEL); }); for (let k = 1; k < 4; k++) r(Math.round(kx) - k + Math.round(Math.sin(a * 5 + k)), Math.round(ky) + 2 + k, 1, 1, CONFETTI[k]); }
  // ---- the Diner: its neon sign, smoke from the chimney ----
  lit(() => { r(212, 268, 5, 2, [255, 70, 70]); r(212, 268, 5, 1, [255, 150, 150]); }); G(211, 267, 7, 4, [255, 70, 70], 0.3); // OPEN, in the window by the door
  { const on = (a * 0.9) % 7 > 0.3; lit(() => txt('DINER', 265, 238, on ? [255, 90, 170] : [100, 40, 70])); if (on) G(262, 236, 26, 9, [255, 90, 170], 0.3); for (let k = 0; k < 4; k++) { const u = ((a * 0.35) + k / 4) % 1; alpha(0.5 * (1 - u), () => disc(Math.round(196 + u * 8 * (1 + wd.dx)), Math.round(248 - u * 16), Math.round(1 + u * 3), day > 0.5 ? [230, 230, 236] : [120, 124, 140])); } }
  // ---- the Kart Track: two karts racing round, the chequered flag flapping, floodlights at night ----
  for (let k = 0; k < 2; k++) { const an = -a * (0.9 - k * 0.07) + k * 0.8, x = KT.cx + Math.cos(an) * (KT.rx - 3.5), y = KT.cy + Math.sin(an) * (KT.ry - 3.5); r(Math.round(x) - 1, Math.round(y) - 1, 3, 2, k ? [40, 140, 255] : K.RED); r(Math.round(x), Math.round(y) - 2, 1, 1, K.WHITE); }
  for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) r(393 + i, 222 + j + Math.round(Math.sin(a * 6 + i * 0.8) * 0.8), 1, 1, (i + j) % 2 ? K.BLACK : K.WHITE);
  if (night > 0.2) for (const [x, y] of LIGHTS) { lit(() => r(x - 2, y - 2, 5, 1, [255, 250, 220])); Gd(x, y - 1, 5, [255, 250, 220], 0.45 * night); G(x - 10, y + 4, 21, 10, [255, 250, 220], 0.06 * night); }
  // ---- the Square: pigeons, a taxi going by ----
  { const u = (a * 0.05) % 1; if (u < 0.15) { const px = 60 + u / 0.15 * 330, py = 164 - Math.sin(u / 0.15 * Math.PI) * 30; r(Math.round(px), Math.round(py), 2, 1, K.PIGEON); r(Math.round(px) + ((Math.floor(a * 12) % 2) ? 1 : 0), Math.round(py) - 1, 1, 1, K.PIGEON_LT); } else { for (const [x, y] of [[140, 180], [143, 181], [270, 178]] as [number, number][]) { r(x, y, 2, 1, K.PIGEON); r(x + ((Math.floor(a * 2 + x) % 3) ? 1 : 0), y - 1, 1, 1, K.PIGEON_NECK); } } }
  { const u = (a * 0.04) % 1; if (u < 0.3) { const x = -12 + (u / 0.3) * 410; r(Math.round(x), 193, 9, 3, K.YEL); r(Math.round(x) + 2, 192, 5, 1, K.YEL_DK); r(Math.round(x) + 3, 193, 3, 1, [40, 50, 80]); lit(() => r(Math.round(x) + 9, 194, 1, 1, [255, 250, 210])); if (night > 0.2) G(Math.round(x) + 9, 193, 8, 3, [255, 250, 210], 0.2 * night); } }
  // ---- the seasons ----
  if (isHalloween()) { for (const x of [70, 150, 250, 330, 120]) { r(x, 186, 3, 2, [255, 140, 30]); lit(() => r(x + 1, 186, 1, 1, [255, 220, 90])); } for (let k = 0; k < 3; k++) { const x = ((a * 8 + k * 150) % 520) - 20, y = 40 + k * 14 + Math.sin(a * 3 + k) * 3, wf = Math.floor(a * 8 + k) % 2; r(Math.round(x), Math.round(y), 2, 1, [20, 14, 26]); r(Math.round(x) - 2, Math.round(y) - wf, 2, 1, [20, 14, 26]); r(Math.round(x) + 2, Math.round(y) - wf, 2, 1, [20, 14, 26]); } G(286, 176, 22, 14, [124, 242, 208], 0.12); }
  if (isWinter()) {
    for (const [x0, x1, y] of SNOWCAPS) r(x0, y, x1 - x0, 1, K.WHITE);
    { const x = 322, y = 150; for (let k = 0; k < 7; k++) r(x - k, y - 14 + k * 2, 1 + k * 2, 2, [30, 110, 70]); r(x, y - 1, 1, 2, K.BROWN); lit(() => { star4(x, y - 15, 1, K.GOLD); for (let k = 0; k < 6; k++) if ((a * 2 + k) % 2 < 1.4) r(x - 4 + Math.floor(h1(k * 3.3) * 9), y - 11 + Math.floor(h1(k * 1.7) * 10), 1, 1, CONFETTI[k]); }); Gd(x, y - 7, 8, [255, 214, 120], 0.25); }
  }
  // ---- the weather (over the city; the boxes up in space have none) ----
  if (w.k > 0.02 && w.kind !== 'clear') {
    const c = PX.ctx; c.save(); c.beginPath(); c.rect(0, 0, MAP_W, MAP_H); c.rect(ORBIT.x0 - 2, ORBIT.y0 - 2, ORBIT.x1 - ORBIT.x0 + 4, ORBIT.y1 - ORBIT.y0 + 4); c.rect(MOONBOX.x0 - 2, MOONBOX.y0 - 2, MOONBOX.x1 - MOONBOX.x0 + 4, MOONBOX.y1 - MOONBOX.y0 + 4); c.clip('evenodd');
    if (w.kind === 'rain' || w.kind === 'storm') alpha(w.k * 0.55, () => { for (let i = 0; i < 140; i++) { const x = (h1(i * 1.3) * (MAP_W + 60) + a * (40 + wd.dx * 30)) % (MAP_W + 60) - 30, y = (h1(i * 2.9) * MAP_H + a * 190) % MAP_H; line(Math.round(x), Math.round(y), Math.round(x - 1 - wd.dx), Math.round(y + 4), [150, 170, 210]); } });
    if (w.kind === 'snow') lit(() => { for (let i = 0; i < 120; i++) { const x = (h1(i * 1.7) * MAP_W + a * (6 + wd.dx * 8) + Math.sin(a + i) * 3) % MAP_W, y = (h1(i * 3.1) * MAP_H + a * 18) % MAP_H; alpha(w.k, () => r(Math.round(x), Math.round(y), 1, 1, K.WHITE)); } });
    if (w.kind === 'fog') alpha(w.k * 0.45, () => { for (let k = 0; k < 5; k++) { const y = 90 + k * 44, x = ((a * 4 + k * 90) % 200) - 100; r(Math.round(x), y, MAP_W + 200, 18, [190, 196, 210]); } });
    if (w.kind === 'storm') { const lt = lightning(); if (lt.f > 0) alpha(lt.f * 0.5, () => r(0, 0, MAP_W, MAP_H, [230, 236, 255])); }
    c.restore();
  }
  // ---- people ----
  if (!L.hiding) {
    const groups = new Map<string, MapDot[]>();
    for (const p of L.people) { const s = spotOf(p.room); if (!s) continue; const k = s[0] + ',' + s[1]; groups.set(k, [...(groups.get(k) ?? []), p]); }
    for (const [k, ps] of groups) {
      const [x, y] = k.split(',').map(Number), shown = ps.slice(0, 5);
      shown.forEach((p, i) => { const dx = Math.round(x - (shown.length - 1) * 2 + i * 4), dy = Math.round(y - 2 + Math.sin(a * 2 + i) * 0.5); r(dx - 1, dy - 1, 3, 3, K.OUTLINE); lit(() => r(dx, dy, 1, 1, shade(p.col, 1.2))); r(dx - 1, dy, 1, 1, p.col); r(dx + 1, dy, 1, 1, p.col); r(dx, dy - 1, 1, 1, p.col); });
      if (ps.length > 5) { const s = '+' + (ps.length - 5); lit(() => { r(x + 9, y - 5, tw(s) + 2, 7, K.OUTLINE); txt(s, x + 10, y - 4, K.WHITE); }); }
    }
    // starred friends: a little head and their name, on top
    const tagged: [number, number][] = [];
    for (const p of L.people) { if (!p.friend) continue; const s = spotOf(p.room); if (!s) continue; let [x, y] = s; while (tagged.some(([tx, ty]) => Math.abs(tx - x) < 20 && Math.abs(ty - y) < 8)) y -= 8; tagged.push([x, y]); friendTag(x, y - 6, p.name, p.col); }
  }
  // ---- you ----
  { const s = spotOf(L.me.room); if (s) { const [x, y] = s, pulse = 3 + Math.round((Math.sin(a * 5) + 1) * 1.2); lit(() => { for (let k = 0; k < 16; k++) { const an = k / 16 * Math.PI * 2; r(Math.round(x + Math.cos(an) * pulse), Math.round(y - 2 + Math.sin(an) * pulse * 0.7), 1, 1, K.GOLD); } r(x - 1, y - 3, 3, 3, K.OUTLINE); r(x, y - 2, 1, 1, L.me.col); }); Gd(x, y - 2, 7, K.GOLD, 0.35); lit(() => { r(x - 7, y + 3, 15, 7, K.OUTLINE); txt('YOU', x - 5, y + 4, K.GOLD); }); } }
  // ---- the YOU ARE HERE star (the board you opened this from) ----
  if (L.board) { const s = BOARDS[L.board]; if (s) { const [x, y] = s, big = (a % 1) < 0.5 ? 2 : 1; lit(() => star4(x, y - 9, big, MP.PIN)); Gd(x, y - 9, 5, MP.PIN, 0.4); } }
  // ---- ? stickers where you've never been ----
  for (const p of PLACES) if (p.tag && EXPLORE_SET.has(p.id) && !L.seen.has(p.id)) sticker(p.tag[0], p.tag[1], a, p.id);
  // ---- the place under the pointer: gold corner brackets and a warm lift; the pin that drops when you pick it ----
  if (L.hover) { const pl = placeById(L.hover); if (pl) for (const q of pl.hits) { brackets(q, a, pl.pick); G(q.x0, q.y0, q.x1 - q.x0, q.y1 - q.y0, pl.pick ? [255, 214, 90] : [160, 170, 200], 0.1); } }
  if (L.pin) { const pl = placeById(L.pin.id); if (pl) { const u = clamp((a - L.pin.t0) / 0.25, 0, 1), [x, y] = pl.at, drop = Math.round((1 - u * u) * -24), bounce = u >= 1 ? Math.round(-Math.abs(Math.sin((a - L.pin.t0 - 0.25) * 14)) * 3 * Math.max(0, 1 - (a - L.pin.t0 - 0.25) * 3)) : 0; pin(x, y - 4 + drop + bounce); } }
}
const XGHOST: RGB = [232, 240, 255];
/** Snow along the roofs' top edges in winter: [x0, x1, y]. */
const SNOWCAPS: [number, number, number][] = [[8, 60, 88], [94, 144, 113], [148, 172, 61], [176, 210, 101], [212, 250, 111], [254, 290, 105], [292, 334, 93], [333, 389, 56], [184, 264, 254], [152, 298, 211]];
const EXPLORE_SET = new Set<string>(EXPLORE);

function brackets(q: Rect, a: number, pick: boolean): void {
  const c: RGB = pick ? K.GOLD : [170, 180, 210], o = (a * 4) % 2 < 1 ? 0 : 1, L = 4;
  lit(() => {
    const x0 = q.x0 - 1 - o, y0 = q.y0 - 1 - o, x1 = q.x1 + o, y1 = q.y1 + o;
    r(x0, y0, L, 1, c); r(x0, y0, 1, L, c); r(x1 - L + 1, y0, L, 1, c); r(x1, y0, 1, L, c);
    r(x0, y1, L, 1, c); r(x0, y1 - L + 1, 1, L, c); r(x1 - L + 1, y1, L, 1, c); r(x1, y1 - L + 1, 1, L, c);
  });
}
function sticker(x: number, y: number, a: number, id: string): void {
  const wob = Math.round(Math.sin(a * 2 + id.length) * 0.6);
  r(x - 1, y + wob, 7, 7, MP.STICKER_DK); r(x, y - 1 + wob, 5, 9, MP.STICKER_DK); lit(() => { r(x, y + wob, 5, 7, MP.STICKER); r(x - 1 + 1, y + wob, 5, 1, K.YEL_HI); txt('?', x + 1, y + 1 + wob, K.OUTLINE); });
}
function pin(x: number, y: number): void {
  lit(() => { r(x, y - 1, 1, 4, [200, 200, 210]); disc(x, y - 4, 2, MP.PIN); r(x - 1, y - 5, 1, 1, MP.PIN_HI); });
  alpha(0.4, () => oval(x, y + 3, 2, 1, [0, 0, 0])); Gd(x, y - 4, 5, MP.PIN, 0.4);
}
function friendTag(x: number, y: number, name: string, col: RGB): void {
  const s = name.slice(0, 10).toUpperCase(), w = tw(s) + 9;
  lit(() => { r(x - 3, y - 4, w, 7, K.OUTLINE); r(x - 2, y - 3, 5, 5, col); r(x - 1, y - 2, 1, 1, K.EYE); r(x + 1, y - 2, 1, 1, K.EYE); r(x - 2, y - 3, 5, 1, shade(col, 1.25)); txt(s, x + 4, y - 3, K.WHITE); r(x - 3 + w, y - 4, 1, 7, K.GOLD); });
}
function miniRocket(x: number, y: number, dir: 'up' | 'side', shake: number): void {
  x = Math.round(x + shake * 0.6); y = Math.round(y);
  lit(() => {
    if (dir === 'up') { r(x - 1, y - 12, 3, 12, SK.HULL); r(x + 1, y - 12, 1, 12, SK.HULL_SH); r(x - 1, y - 14, 3, 2, SK.NOSE); r(x, y - 15, 1, 1, SK.NOSE); r(x - 2, y - 3, 1, 3, SK.FIN); r(x + 2, y - 3, 1, 3, SK.FIN); r(x, y - 9, 1, 1, SK.GLASS); }
    else { r(x - 10, y - 1, 8, 3, SK.HULL); r(x - 10, y + 1, 8, 1, SK.HULL_SH); r(x - 2, y - 1, 2, 3, SK.NOSE); r(x - 11, y - 2, 2, 1, SK.FIN); r(x - 11, y + 2, 2, 1, SK.FIN); r(x - 5, y, 1, 1, SK.GLASS); }
  });
}
function miniLander(x: number, y: number, moving: boolean, a: number): void {
  x = Math.round(x); y = Math.round(y);
  lit(() => { r(x - 2, y - 4, 5, 3, SK.GOLD_FOIL); r(x - 2, y - 4, 5, 1, SK.GOLD_FOIL_HI); r(x - 1, y - 6, 3, 2, SK.HULL); r(x, y - 5, 1, 1, SK.GLASS); r(x - 3, y - 1, 1, 2, SK.HULL_DK); r(x + 3, y - 1, 1, 2, SK.HULL_DK); if (moving && (a * 20) % 2 < 1.3) r(x, y - 1, 1, 2, SK.FLAME_HI); });
}
