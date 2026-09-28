// THE SUBWAY — down the green-railed stairs on the Square. One line, one train, run entirely by
// the wall clock (no messages): every player sees the same train pull in, open its doors and
// leave. Walk into an open door to board; the carriage is its own room (everyone riding is in
// it together), with the tunnel and then the city rushing past the windows, and an EXIT that
// opens at each station.
//
// The line is a loop: SQUARE -> PARK -> DINER -> KARTS -> AIRPORT -> (back to the SQUARE). Stations without a room yet are OPENING SOON: the train
// stops but keeps its doors shut. Each station takes STOP_S seconds (4 s pulling in, doors open,
// 4 s pulling out) and the ride to the next one takes RIDE_S.

import { K, CONFETTI, type RGB } from '../engine/palette';
import { PX, mk, r, line, txt, tw, lit, alpha, G, Gd, M, bake } from '../engine/pixel';
import { h1 } from '../engine/math';
import { dayness } from './plaza';
import { boardGlow } from './boards';
import { drawJet } from './jet';
import { AIR_ARRIVE } from '../game/air';
import type { Door, Prop, Room, RoomId, Spot } from './room';

/** The stops. `room` = its station room (null = OPENING SOON), `exit` = where its stairs go up to, `tile` = wall tiles. */
export const STATIONS: { name: string; room: RoomId | null; arrive: { x: number; y: number }; exit: { to: RoomId; arrive: { x: number; y: number } }; tile: RGB; tileLn: RGB }[] = [
  { name: 'SQUARE', room: 'subway', arrive: { x: 0, y: 500 }, exit: { to: 'plaza', arrive: { x: 760, y: 664 } }, tile: [226, 222, 204], tileLn: [196, 190, 170] },
  { name: 'PARK', room: 'parkstn', arrive: { x: 0, y: 500 }, exit: { to: 'park', arrive: { x: 170, y: 668 } }, tile: [206, 226, 200], tileLn: [172, 196, 166] },
  { name: 'DINER', room: 'dinerstn', arrive: { x: 0, y: 500 }, exit: { to: 'diner', arrive: { x: 70, y: 650 } }, tile: [236, 206, 200], tileLn: [206, 170, 164] },
  { name: 'KARTS', room: 'kartstn', arrive: { x: 0, y: 500 }, exit: { to: 'karts', arrive: { x: 110, y: 612 } }, tile: [226, 226, 234], tileLn: [70, 70, 84] },
  { name: 'AIRPORT', room: 'airportstn', arrive: { x: 0, y: 500 }, exit: { to: 'airport', arrive: AIR_ARRIVE.airport }, tile: [206, 228, 244], tileLn: [168, 200, 226] },
];
const IN_S = 4, OPEN_S = 16, OUT_S = 4, STOP_S = IN_S + OPEN_S + OUT_S, RIDE_S = 28, LEG = STOP_S + RIDE_S;
export type TrainPhase = 'in' | 'open' | 'out' | 'ride';
/** Where the train is right now: at station `at` (pulling in, doors open, pulling out) or riding towards `next`. `u` = 0..1 through that phase, `left` = seconds left in it. */
export function train(nowMs = Date.now()): { at: number; next: number; phase: TrainPhase; u: number; left: number } {
  const n = STATIONS.length, t = (nowMs / 1000) % (LEG * n), at = Math.floor(t / LEG), k = t - at * LEG, next = (at + 1) % n;
  if (k < IN_S) return { at, next, phase: 'in', u: k / IN_S, left: IN_S - k };
  if (k < IN_S + OPEN_S) return { at, next, phase: 'open', u: (k - IN_S) / OPEN_S, left: IN_S + OPEN_S - k };
  if (k < STOP_S) return { at, next, phase: 'out', u: (k - IN_S - OPEN_S) / OUT_S, left: STOP_S - k };
  return { at, next, phase: 'ride', u: (k - STOP_S) / RIDE_S, left: LEG - k };
}
/** Seconds until the train next opens its doors at station `s`. */
export function nextAt(s: number, nowMs = Date.now()): number {
  const n = STATIONS.length, t = (nowMs / 1000) % (LEG * n), open = s * LEG + IN_S;
  return ((open - t) % (LEG * n) + LEG * n) % (LEG * n);
}
const doorsOpenAt = (s: number) => { const tr = train(); return tr.at === s && tr.phase === 'open' && !!STATIONS[s].room; };

// =====================================================================================
// THE STATION (Square)
// =====================================================================================
// The camera shows ~210 px above your feet, so everything worth seeing sits between the
// ceiling lights (y 320) and the platform edge (PLAT).
const SW = 1300, SH = 700, PLAT = 500;
const TRAIN_X0 = 30, TRAIN_W = 1240, TRAIN_TOP = PLAT - 108;
export const DOOR_X = [250, 550, 850, 1150];
const BAND: RGB = [40, 120, 90];

function buildStation(this: Room, n: number): void {
  const st = STATIONS[n], TILE = st.tile, TILE_LN = st.tileLn;
  bake(this.bg.getContext('2d')!, () => {
    
    r(0, 0, SW, 316, [22, 24, 30]); for (let x = 60; x < SW; x += 220) r(x, 314, 120, 5, [50, 54, 62]);
    // tiled wall above the tracks, a green band and the station name set into the tiles
    r(0, 322, SW, TRAIN_TOP - 322, TILE); for (let y = 322; y < TRAIN_TOP; y += 8) r(0, y, SW, 1, TILE_LN); for (let y = 322, j = 0; y < TRAIN_TOP; y += 8, j++) for (let x = (j % 2) * 8; x < SW; x += 16) r(x, y, 1, 8, TILE_LN);
    r(0, TRAIN_TOP - 10, SW, 6, BAND); r(0, TRAIN_TOP - 10, SW, 1, M(BAND, [255, 255, 255], 0.3));
    for (const cx of [140, 700, 1180]) { r(cx - 46, 340, 92, 22, [30, 34, 40]); r(cx - 44, 342, 88, 18, [240, 236, 220]); txt(st.name, cx - tw(st.name, 2) / 2, 346, [30, 34, 40], 2); }
    // the line map poster
    r(360, 330, 200, 50, [30, 34, 40]); r(362, 332, 196, 46, [245, 242, 230]); txt('LAB HANGOUT LINE', 460 - tw('LAB HANGOUT LINE') / 2, 336, [30, 34, 40]);
    line(390, 356, 530, 356, BAND); line(390, 357, 530, 357, BAND);
    STATIONS.forEach((s, i) => { const x = 390 + i * 140 / (STATIONS.length - 1); r(x - 3, 353, 7, 7, s.room ? BAND : [150, 150, 150]); r(x - 1, 355, 3, 3, K.WHITE); txt(s.name, x - tw(s.name) / 2, 364, s.room ? [30, 34, 40] : [150, 150, 150]); });
    // YOU ARE HERE: a red ring round this stop (the poster is a map board: E opens the city map)
    { const x = 390 + n * 140 / (STATIONS.length - 1); for (const [dx, dy] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) r(x + (dx > 0 ? 3 : -5), 356 + (dy > 0 ? 3 : -5), 3, 3, [214, 50, 60]); r(x - 5, 351, 11, 1, [214, 50, 60]); r(x - 5, 361, 11, 1, [214, 50, 60]); r(x - 5, 351, 1, 11, [214, 50, 60]); r(x + 5, 351, 1, 11, [214, 50, 60]);
      r(549 - tw('YOU ARE HERE'), 371, 3, 3, [214, 50, 60]); txt('YOU ARE HERE', 553 - tw('YOU ARE HERE'), 371, [214, 50, 60]); }
    // the track pit behind the platform edge: dark tunnel wall with cables
    r(0, TRAIN_TOP, SW, PLAT - TRAIN_TOP, [34, 36, 42]); for (let x = 0; x < SW; x += 40) r(x, TRAIN_TOP, 2, PLAT - TRAIN_TOP, [28, 30, 36]);
    for (const y of [TRAIN_TOP + 8, TRAIN_TOP + 14, TRAIN_TOP + 20]) r(0, y, SW, 1, [50, 46, 40]);
    r(0, PLAT - 20, SW, 20, [20, 22, 26]); for (let x = 0; x < SW; x += 18) r(x, PLAT - 8, 12, 3, [70, 60, 50]); r(0, PLAT - 12, SW, 2, [120, 124, 132]);
    // the platform: edge, yellow tactile strip, concrete
    r(0, PLAT, SW, SH - PLAT, [104, 106, 112]); r(0, PLAT, SW, 3, [150, 152, 158]);
    r(0, PLAT + 3, SW, 7, [230, 190, 40]); for (let x = 2; x < SW; x += 5) r(x, PLAT + 5, 2, 2, [200, 160, 30]);
    for (let i = 0; i < 400; i++) r(Math.floor(h1(i * 1.7) * SW), PLAT + 12 + Math.floor(h1(i * 3.1) * (SH - PLAT - 12)), 1, 1, [94, 96, 102]);
    for (let x = 0; x < SW; x += 64) r(x, PLAT + 12, 1, SH - PLAT - 12, [96, 98, 104]);
    if (st.name === 'AIRPORT') airportTiles();
    // stairs up to the Square (front left): a stairwell going up out of the floor
    r(14, 636, 70, 64, [60, 62, 70]); for (let k = 0; k < 6; k++) r(18, 640 + k * 10, 62, 4, [130, 132, 140]);
    r(12, 628, 4, 72, BAND); r(82, 628, 4, 72, BAND); r(12, 628, 74, 4, BAND);
  });
}
/** AIRPORT STATION's own touches: little aeroplanes set into the tiles, a suitcase mural, the way up to DEPARTURES. */
function airportTiles(): void {
  const PLANE: RGB = [120, 160, 200];
  for (let x = 250; x < SW - 60; x += 240) { if (x > 300 && x < 600) continue; const y = 372; r(x, y + 4, 26, 4, PLANE); r(x + 22, y + 5, 6, 2, PLANE); r(x + 10, y - 2, 6, 14, PLANE); r(x + 2, y + 1, 3, 9, PLANE); r(x, y + 1, 7, 2, PLANE); }
  // the suitcase mural: a pile of painted cases with travel stickers
  const cases: [number, number, number, number, RGB][] = [[610, 366, 44, 24, [226, 90, 70]], [650, 360, 34, 30, [70, 120, 200]], [690, 370, 40, 20, [240, 190, 60]], [620, 344, 30, 22, [90, 170, 110]], [654, 340, 26, 20, [200, 120, 190]]];
  for (const [x, y, w, h, c] of cases) { r(x, y, w, h, c); r(x, y, w, 2, M(c, [255, 255, 255], 0.3)); r(x + w / 2 - 4, y - 3, 8, 3, [60, 60, 66]); r(x + 4, y + 6, 6, 5, [255, 255, 255]); r(x + w - 10, y + h - 9, 6, 5, [255, 214, 90]); }
  // DEPARTURES up the stairs
  r(96, 398, 116, 16, [30, 34, 40]); r(96, 398, 116, 1, [60, 64, 72]); lit(() => txt('< DEPARTURES', 101, 403, [255, 210, 63]));
}
const lostTrolley: Prop = { y: 566, draw() { const x = 860, y = 566; r(x - 24, y - 12, 48, 3, [150, 156, 166]); r(x - 22, y - 30, 2, 18, [110, 116, 126]); r(x + 20, y - 24, 2, 12, [110, 116, 126]); r(x - 18, y - 28, 30, 14, [226, 90, 70]); r(x - 18, y - 28, 30, 2, [240, 130, 110]); r(x - 12, y - 36, 16, 8, [70, 120, 200]); r(x - 7, y - 39, 6, 3, [40, 40, 44]); r(x - 26, y - 2, 6, 6, [40, 40, 44]); r(x + 20, y - 2, 6, 6, [40, 40, 44]); } };
/** The train, drawn at horizontal offset `dx` (0 = stopped at the platform). `open` = 0..1 doors apart. */
function drawTrain(dx: number, open: number, a: number): void {
  const x0 = TRAIN_X0 + dx, x1 = x0 + TRAIN_W, top = TRAIN_TOP, bot = PLAT - 6;
  if (x1 < 0 || x0 > SW) return;
  const body: RGB = [178, 184, 194], dark: RGB = [120, 126, 136];
  r(x0, top, TRAIN_W, bot - top, body); r(x0, top, TRAIN_W, 3, [210, 214, 222]); r(x0, bot - 6, TRAIN_W, 6, dark);
  r(x0, top + 60, TRAIN_W, 6, BAND); r(x0, top + 66, TRAIN_W, 2, [230, 190, 40]);
  // noses at both ends
  r(x0 - 8, top + 8, 8, bot - top - 12, body); r(x1, top + 8, 8, bot - top - 12, body);
  lit(() => { r(x0 - 6, top + 48, 4, 5, [255, 240, 200]); r(x1 + 2, top + 48, 4, 5, [255, 80, 70]); });
  // windows with the lit carriage behind (and shadowy riders)
  for (let x = x0 + 40; x < x1 - 40; x += 60) {
    if (DOOR_X.some((d) => Math.abs(x + 20 - (d + dx)) < 34)) continue;
    lit(() => r(x, top + 14, 40, 32, [255, 236, 190]));
    if (h1(x - dx) > 0.55) { const hx = x + 10 + Math.floor(h1(x * 3 - dx) * 20); r(hx - 5, top + 32, 11, 14, [110, 96, 80]); r(hx - 4, top + 24, 9, 9, [110, 96, 80]); }
    r(x, top + 14, 40, 2, dark);
  }
  // doors: two leaves that slide apart
  for (const d of DOOR_X) {
    const cx = d + dx, o = Math.round(open * 18), dt = top + 8;
    lit(() => r(cx - 20, dt, 40, bot - dt, [255, 236, 190]));
    r(cx - 20 - o, dt, 20, bot - dt, [150, 156, 166]); r(cx + o, dt, 20, bot - dt, [150, 156, 166]);
    r(cx - 16 - o, dt + 8, 12, 24, [255, 236, 190]); r(cx + 4 + o, dt + 8, 12, 24, [255, 236, 190]);
    if (open > 0.5) lit(() => r(cx - 3, top + 2, 6, 4, [124, 242, 156]));
  }
  // a big number on the side
  txt('1', x0 + 16, top + 20, [60, 64, 72], 3);
  if (Math.abs(dx) > 1) for (let k = 0; k < 6; k++) r(x0 + ((k * 211 + Math.floor(a * 900)) % TRAIN_W), bot - 3, 6, 1, [255, 220, 150]); // sparks at the wheels
}
function stationBack(a: number, s: number): void {
  // the line map poster lights up a step when you walk up to it (it's a map board)
  { const k = boardGlow(a); if (k > 0) { G(356, 326, 208, 58, [255, 250, 230], 0.18 * k); lit(() => { r(360, 330, 200, 1, M([30, 34, 40], [255, 214, 90], k)); r(360, 379, 200, 1, M([30, 34, 40], [255, 214, 90], k)); }); } }
  // the lights: long fluorescent tubes (one flickers)
  lit(() => { for (let x = 60, i = 0; x < SW; x += 220, i++) { const f = i === 3 && (a * 3.7) % 1 < 0.08 ? 0.3 : 1; r(x, 318, 120, 3, M([80, 90, 90], [230, 250, 245], f)); } });
  for (let x = 60; x < SW; x += 220) G(x, 320, 120, 50, [200, 240, 230], 0.08);
  // the departures board
  const tr = train(), here = tr.at === s && tr.phase !== 'ride';
  r(790, 336, 190, 26, [20, 22, 26]);
  const msg = here ? (tr.phase === 'open' ? 'NOW BOARDING: ' + STATIONS[tr.next].name + (STATIONS[tr.next].room ? '' : ' - LOOP') : tr.phase === 'in' ? 'TRAIN ARRIVING' : 'DOORS CLOSING') : 'NEXT TRAIN: ' + Math.ceil(nextAt(s)) + 's';
  lit(() => txt(msg.slice(0, 30), 885 - tw(msg.slice(0, 30)) / 2, 346, here && tr.phase === 'open' ? [124, 242, 156] : [255, 180, 60]));
  // the train: slides in from the right, stops, slides out to the left
  let dx = 9999, open = 0;
  if (tr.at === s) {
    if (tr.phase === 'in') { const e = 1 - (1 - tr.u) ** 3; dx = (1 - e) * (SW + 200); }
    else if (tr.phase === 'open') { dx = 0; open = Math.min(1, tr.u * OPEN_S / 1.2, (1 - tr.u) * OPEN_S / 1.2); }
    else if (tr.phase === 'out') dx = -(tr.u ** 3) * (SW + TRAIN_W + 200);
  }
  if (dx < 9999) drawTrain(dx, open, a);
  else if (tr.phase === 'ride' && tr.left < 3 && tr.next === s) lit(() => { const k = 1 - tr.left / 3; r(SW - 20, TRAIN_TOP + 40, 20, 30, M([34, 36, 42], [255, 240, 200], k)); }); // headlights in the tunnel
}

// ---------- station props ----------
const bench = (x: number, y: number): Prop => ({ y, draw() { r(x - 30, y - 12, 60, 4, [140, 96, 60]); r(x - 30, y - 12, 60, 1, [180, 130, 80]); r(x - 30, y - 22, 60, 3, [140, 96, 60]); for (const lx of [x - 26, x + 23]) r(lx, y - 22, 3, 22, [60, 64, 72]); } });
const snacks: Prop = {
  y: 552,
  draw(a: number) {
    const x = 1230, y = 552;
    r(x - 22, y - 70, 44, 70, [180, 40, 50]); r(x - 22, y - 70, 44, 3, [220, 80, 90]); r(x - 18, y - 62, 26, 40, [30, 40, 50]);
    for (let j = 0; j < 4; j++) for (let k = 0; k < 3; k++) r(x - 16 + k * 8, y - 60 + j * 10, 6, 6, CONFETTI[(j * 3 + k) % CONFETTI.length]);
    lit(() => { r(x + 12, y - 58, 6, 4, (a % 1) < 0.5 ? [124, 242, 156] : [40, 80, 60]); txt('SNACKS', x - tw('SNACKS') / 2, y - 16, K.WHITE); });
    Gd(x - 5, y - 42, 20, [120, 200, 255], 0.12);
  },
};
const gates: Prop = {
  y: 640,
  draw() { for (const x of [120, 170]) { r(x - 6, 612, 12, 28, [70, 74, 84]); r(x - 6, 612, 12, 2, [110, 114, 124]); r(x + 6, 624, 16, 3, [190, 194, 204]); lit(() => r(x - 2, 616, 4, 3, [124, 242, 156])); } },
};

export const SUBWAY_SPOTS: Spot[] = [
  ...[-14, 14].map((dx): Spot => ({ kind: 'sit', x: 420 + dx, y: 591, sx: 420 + dx, sy: 602, lift: 8, label: 'SIT', area: { x0: 390, y0: 566, x1: 450, y1: 590 } })),
  ...[-14, 14].map((dx): Spot => ({ kind: 'sit', x: 980 + dx, y: 591, sx: 980 + dx, sy: 602, lift: 8, label: 'SIT', area: { x0: 950, y0: 566, x1: 1010, y1: 590 } })),
  { kind: 'soda', x: 1230, y: 564, sx: 1230, sy: 564, lift: 0, label: 'SNACKS', area: { x0: 1208, y0: 482, x1: 1252, y1: 552 } },
  { kind: 'map', x: 460, y: 514, sx: 460, sy: 514, lift: 0, label: 'MAP', area: { x0: 360, y0: 330, x1: 560, y1: 380 } }, // 5: the line map poster
];
const boardDoor = (x: number, i: number, n: number): Door => ({
  trigger: { x0: x - 18, y0: PLAT + 4, x1: x + 18, y1: PLAT + 12 }, to: 'train', arrive: { x: CAR_DOOR_X[i % CAR_DOOR_X.length], y: 530 }, label: 'BOARD',
  area: { x0: x - 20, y0: TRAIN_TOP + 8, x1: x + 20, y1: PLAT },
  route: () => (doorsOpenAt(n) ? { to: 'train', arrive: { x: CAR_DOOR_X[i % CAR_DOOR_X.length], y: 530 }, label: 'BOARD' } : null),
});

/** The station room for stop `n` (same platform, its own name, tiles and way out). */
export function makeStation(n: number): Room {
  const st = STATIONS[n];
  st.arrive = { x: DOOR_X[1], y: PLAT + 22 };
  const room: Room = {
    id: st.room!, title: st.name + ' STATION', sub: 'THE SUBWAY',
    w: SW, h: SH,
    floor: { x0: 14, y0: PLAT + 6, x1: SW - 14, y1: SH - 20 },
    blockers: [{ x0: 390, y0: 582, x1: 450, y1: 592 }, { x0: 950, y0: 582, x1: 1010, y1: 592 }, { x0: 1206, y0: 540, x1: 1254, y1: 554 }, { x0: 112, y0: 632, x1: 128, y1: 642 }, { x0: 162, y0: 632, x1: 178, y1: 642 }],
    doors: [
      { trigger: { x0: 18, y0: 666, x1: 80, y1: 680 }, edge: true, to: st.exit.to, arrive: st.exit.arrive, label: st.name, area: { x0: 10, y0: 624, x1: 88, y1: 700 } },
      ...DOOR_X.map((x, i) => boardDoor(x, i, n)),
    ],
    spots: SUBWAY_SPOTS, inUse: new Map(),
    spawn: { x: 60, y: 646 },
    dim: 0.12,
    fillTop: 'rgb(22,24,30)', fillLow: 'rgb(104,106,112)',
    bg: mk(SW, SH),
    build: () => buildStation.call(room, n),
    drawBack: (a: number) => stationBack(a, n),
    props: [bench(420, 590), bench(980, 590), snacks, gates, ...(st.name === 'AIRPORT' ? [lostTrolley] : [])],
  };
  return room;
}

// =====================================================================================
// THE CARRIAGE
// =====================================================================================
const CW = 1000, CH = 650, CFLOOR = 510;
export const CAR_DOOR_X = [300, 700];
const WINDOWS: [number, number][] = [[70, 230], [380, 620], [780, 930]];
const WIN_Y0 = 358, WIN_Y1 = 426, DOOR_TOP = 348, SEAT_Y = 456;

function buildCar(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    
    r(0, 0, CW, 300, [200, 204, 210]); r(0, 300, CW, 22, [236, 232, 220]);
    for (let x = 20, i = 0; x < CW; x += 160, i++) { r(x, 301, 120, 20, CONFETTI[i % CONFETTI.length].map((v) => Math.round(v * 0.8 + 40)) as RGB); r(x + 4, 304, 50, 3, [255, 255, 255]); r(x + 4, 310, 70, 2, [60, 60, 70]); r(x + 4, 315, 40, 2, [60, 60, 70]); }
    r(0, 322, CW, CFLOOR - 322, [214, 218, 224]); r(0, 322, CW, 2, [236, 240, 244]);
    for (const [x0, x1] of WINDOWS) { r(x0 - 4, WIN_Y0 - 4, x1 - x0 + 8, WIN_Y1 - WIN_Y0 + 8, [120, 126, 136]); r(x0, WIN_Y0, x1 - x0, WIN_Y1 - WIN_Y0, [20, 24, 30]); }
    for (const cx of CAR_DOOR_X) { r(cx - 34, DOOR_TOP - 4, 68, CFLOOR - DOOR_TOP + 4, [120, 126, 136]); r(cx - 30, DOOR_TOP, 60, CFLOOR - DOOR_TOP, [20, 24, 30]); }
    // bench seats under the windows
    for (const [x0, x1] of WINDOWS) { r(x0, SEAT_Y, x1 - x0, 16, [40, 110, 160]); r(x0, SEAT_Y, x1 - x0, 3, [80, 150, 200]); r(x0, SEAT_Y + 16, x1 - x0, CFLOOR - SEAT_Y - 16, [60, 64, 72]); for (let x = x0 + 40; x < x1; x += 40) r(x, SEAT_Y, 1, 16, [30, 90, 130]); }
    r(0, CFLOOR, CW, CH - CFLOOR, [70, 76, 90]); for (let x = 0; x < CW; x += 24) r(x, CFLOOR, 12, CH - CFLOOR, [74, 80, 94]);
    r(0, CFLOOR, CW, 3, [110, 116, 130]);
    r(0, 346, CW, 2, [170, 176, 186]); // the grab rail
  });
}
/** Out past the airport (the ride to and from it): grass behind the perimeter fence, the runway's lights, a windsock, and a LAB AIR jet climbing away. */
function airportView(travel: number, day: number, u: number): void {
  const Y0 = DOOR_TOP, Y1 = WIN_Y1, sky0: RGB = day > 0.5 ? [120, 180, 230] : [16, 20, 50], sky1: RGB = day > 0.5 ? [196, 224, 242] : [50, 44, 86];
  for (let y = Y0; y < Y1; y += 4) r(0, y, CW, 4, M(sky0, sky1, (y - Y0) / (Y1 - Y0)));
  r(0, Y1 - 24, CW, 24, day > 0.5 ? [110, 150, 80] : [20, 34, 30]); r(0, Y1 - 12, CW, 3, day > 0.5 ? [100, 104, 110] : [36, 38, 44]);
  const o = travel * 0.5;
  for (let i = 0; i < 30; i++) { const x = ((i * 70 - o) % 2100 + 2100) % 2100 - 100; if (day < 0.5) lit(() => r(Math.round(x), Y1 - 11, 2, 1, [80, 140, 255])); }
  { const x = ((1400 - o) % 2100 + 2100) % 2100 - 100; r(Math.round(x), Y1 - 40, 2, 28, [200, 200, 204]); r(Math.round(x) + 2, Y1 - 40, 12, 5, [255, 120, 40]); }
  // the fence close by, rushing past: posts and a diamond mesh
  const f = travel * 1.4; for (let x = -((f % 40) + 40) % 40; x < CW; x += 40) r(Math.round(x), Y0 + 20, 2, Y1 - Y0 - 20, [120, 124, 132]);
  alpha(0.35, () => { for (let x = -((f % 8) + 8) % 8; x < CW; x += 8) { line(Math.round(x), Y0 + 20, Math.round(x) + 20, Y1, [150, 154, 162]); line(Math.round(x) + 20, Y0 + 20, Math.round(x), Y1, [150, 154, 162]); } });
  // a jet climbing away across the windows, mid-ride
  if (u > 0.35 && u < 0.7) { const k = (u - 0.35) / 0.35; drawJet(Math.round(CW - k * CW * 1.1), Math.round(Y1 - 30 - k * 60), 120, -1, 0, { gear: k < 0.3, flaps: true, pitch: -14, night: day < 0.5 }); }
}
/** The view out of the windows (clipped to them): a station, the tunnel, or the city. */
function carView(): void {
  const tr = train(), g = PX.ctx, H = WIN_Y1 - WIN_Y0;
  g.save(); g.beginPath(); for (const [x0, x1] of WINDOWS) g.rect(x0, WIN_Y0, x1 - x0, H); for (const cx of CAR_DOOR_X) g.rect(cx - 30, DOOR_TOP, 60, CFLOOR - DOOR_TOP); g.clip();
  // how far the world outside has slid by (it brakes in, and speeds off again)
  let travel = 0;
  if (tr.phase === 'ride') travel = tr.u * RIDE_S * 900;
  else if (tr.phase === 'in') travel = -((1 - tr.u) ** 2) * 1800;
  else if (tr.phase === 'out') travel = tr.u ** 2 * 1800;
  const Y0 = DOOR_TOP, Y1 = WIN_Y1, off = Math.round(travel);
  if (tr.phase !== 'ride') { // a station platform outside
    const st = STATIONS[tr.at];
    if (st.room) {
      r(0, Y0, CW, Y1 - Y0, st.tile); for (let x = -((off % 16) + 16) % 16; x < CW; x += 16) r(x, Y0, 1, Y1 - Y0, st.tileLn);
      r(0, Y1 - 26, CW, 6, BAND); for (let k = -1; k < 4; k++) { const cx = 180 + k * 400 - off; r(cx - 46, Y0 + 12, 92, 22, [30, 34, 40]); r(cx - 44, Y0 + 14, 88, 18, [240, 236, 220]); txt(st.name, cx - tw(st.name, 2) / 2, Y0 + 18, [30, 34, 40], 2); }
      r(0, Y1 - 14, CW, CFLOOR - Y1 + 14, [104, 106, 112]); r(0, Y1 - 16, CW, 3, [230, 190, 40]); // (the platform carries on down the open doorway)
    } else { // still being built
      r(0, Y0, CW, Y1 - Y0, [60, 56, 50]); for (let x = -((off % 30) + 30) % 30; x < CW; x += 30) r(x, Y0 + 6, 26, Y1 - Y0 - 12, [150, 120, 80]);
      r(0, Y1, CW, CFLOOR - Y1, [50, 46, 40]);
      for (let k = -1; k < 4; k++) { const cx = 180 + k * 400 - off; r(cx - 60, Y0 + 24, 120, 16, [255, 214, 90]); txt('OPENING SOON', cx - tw('OPENING SOON') / 2, Y0 + 29, [40, 36, 30]); for (let j = 0; j < 6; j++) r(cx - 60 + j * 20, Y0 + 42, 10, 4, j % 2 ? [255, 214, 90] : [40, 36, 30]); }
    }
  } else { // tunnel -> the city at dusk or noon -> tunnel
    const inCity = tr.u > 0.25 && tr.u < 0.75, day = dayness(), byAir = STATIONS[tr.next].name === 'AIRPORT' || STATIONS[tr.at].name === 'AIRPORT';
    r(0, Y1, CW, CFLOOR - Y1, [16, 18, 22]);
    if (inCity && byAir) airportView(travel, day, tr.u);
    else if (inCity) {
      const sky0: RGB = day > 0.5 ? [120, 180, 230] : [20, 24, 60], sky1: RGB = day > 0.5 ? [190, 220, 240] : [60, 50, 90];
      for (let y = Y0; y < Y1; y += 4) r(0, y, CW, 4, M(sky0, sky1, (y - Y0) / (Y1 - Y0)));
      for (let layer = 0; layer < 2; layer++) {
        const sp = layer ? 1 : 0.35, o = (travel * sp) % 4000;
        for (let i = 0; i < 40; i++) {
          const bx = ((i * 97 - o) % 4000 + 4000) % 4000 - 200, bw = 30 + h1(i + layer * 50) * 40, top = Y0 + 16 + h1(i * 3 + layer) * 30 + layer * 14; if (bx > CW) continue;
          const c: RGB = layer ? (day > 0.5 ? [90, 110, 150] : [30, 34, 70]) : (day > 0.5 ? [150, 170, 200] : [40, 44, 90]);
          r(Math.round(bx), Math.round(top), Math.round(bw), Y1 - Math.round(top), c);
          if (day < 0.5) lit(() => { for (let w = 0; w < 6; w++) if (h1(i * 7 + w + layer) > 0.4) r(Math.round(bx + 4 + (w % 3) * 9), Math.round(top + 5 + Math.floor(w / 3) * 8), 2, 3, [255, 214, 140]); });
        }
      }
    } else {
      r(0, Y0, CW, Y1 - Y0, [16, 18, 22]);
      lit(() => { for (let i = 0; i < 6; i++) { const x = ((i * 260 - travel * 1.6) % 1560 + 1560) % 1560 - 200; r(Math.round(x), Y0 + 36, 60, 3, [255, 200, 120]); } });
      for (let i = 0; i < 20; i++) { const x = ((i * 90 - travel * 1.6) % 1800 + 1800) % 1800 - 100; r(Math.round(x), Y0 + 4, 2, Y1 - Y0 - 8, [30, 32, 38]); }
    }
  }
  g.restore();
}
function carBack(a: number): void {
  carView();
  const tr = train();
  // doors: slide open when stopped at a station that's open
  const open = tr.phase === 'open' && STATIONS[tr.at].room ? Math.min(1, tr.u * OPEN_S / 1.2, (1 - tr.u) * OPEN_S / 1.2) : 0;
  for (const cx of CAR_DOOR_X) { const o = Math.round(open * 28); r(cx - 30 - o, DOOR_TOP, 30, CFLOOR - DOOR_TOP, [170, 176, 186]); r(cx + o, DOOR_TOP, 30, CFLOOR - DOOR_TOP, [170, 176, 186]); r(cx - 26 - o, DOOR_TOP + 8, 22, 44, [30, 34, 40]); r(cx + 4 + o, DOOR_TOP + 8, 22, 44, [30, 34, 40]); r(cx - 1, DOOR_TOP, 2, CFLOOR - DOOR_TOP, [120, 126, 136]); if (open > 0.5) lit(() => r(cx - 4, DOOR_TOP - 6, 8, 4, [124, 242, 156])); }
  // the LED strip over the middle: next stop
  r(380, 326, 240, 16, [20, 22, 26]);
  const msg = tr.phase === 'ride' ? 'NEXT STOP: ' + STATIONS[tr.next].name + (STATIONS[tr.next].room ? '' : ' - OPENING SOON') : tr.phase === 'open' ? (STATIONS[tr.at].room ? 'THIS IS ' + STATIONS[tr.at].name + ' - DOORS OPEN' : STATIONS[tr.at].name + ' IS NOT OPEN YET') : 'NOW ARRIVING: ' + STATIONS[tr.at].name;
  lit(() => txt(msg.slice(0, 48), 500 - tw(msg.slice(0, 48)) / 2, 331, [255, 180, 60]));
  // the line map over the left windows, with a light where the train is
  const mx0 = 90, mx1 = 210; r(mx0 - 20, 326, mx1 - mx0 + 40, 18, [245, 242, 230]); line(mx0, 332, mx1, 332, BAND);
  const nS = STATIONS.length;
  STATIONS.forEach((s, i) => { const x = mx0 + i * (mx1 - mx0) / (nS - 1); r(x - 2, 330, 5, 5, s.room ? BAND : [150, 150, 150]); txt(s.name, x - tw(s.name) / 2, 337, s.room ? [60, 64, 72] : [150, 150, 150]); });
  // along the line, and back along it for the loop home
  const pos = tr.phase === 'ride' ? (tr.next === 0 ? (nS - 1) * (1 - tr.u) : tr.at + tr.u) : tr.at, px = mx0 + pos * (mx1 - mx0) / (nS - 1);
  lit(() => { r(Math.round(px) - 2, 329, 5, 7, (a % 0.8) < 0.5 ? [255, 214, 90] : [255, 140, 40]); });
  // hanging handles: they swing with the ride
  const sway = tr.phase === 'ride' ? Math.sin(a * 2.2) * 3 : tr.phase === 'in' ? 5 * (1 - tr.u) : tr.phase === 'out' ? -5 * tr.u : Math.sin(a * 1.5) * 0.6;
  for (let x = 60; x < CW; x += 44) { const sx = Math.round(x + sway), hy = 364; line(x, 348, sx, hy, [60, 64, 72]); r(sx - 3, hy, 7, 2, [230, 190, 40]); r(sx - 3, hy + 2, 1, 5, [230, 190, 40]); r(sx + 3, hy + 2, 1, 5, [230, 190, 40]); r(sx - 3, hy + 7, 7, 1, [230, 190, 40]); }
  G(0, 300, CW, 30, [255, 250, 230], 0.05);
}
const pole = (x: number): Prop => ({ y: 584, draw() { r(x - 2, 0, 4, 584, [190, 194, 204]); r(x - 2, 0, 1, 584, [230, 234, 240]); r(x - 5, 580, 10, 4, [120, 126, 136]); } });
export const TRAIN_SPOTS: Spot[] = WINDOWS.flatMap(([x0, x1]): Spot[] => { const out: Spot[] = []; for (let x = x0 + 20; x < x1; x += 40) out.push({ kind: 'sit', x, y: SEAT_Y + 18, sx: x, sy: CFLOOR + 14, lift: 20, label: 'SIT', area: { x0: x - 20, y0: SEAT_Y - 20, x1: x + 20, y1: SEAT_Y + 16 } }); return out; });
const exitDoor = (cx: number): Door => ({
  trigger: { x0: cx - 24, y0: CFLOOR + 4, x1: cx + 24, y1: CFLOOR + 12 }, to: 'subway', arrive: { x: 0, y: 0 }, label: 'EXIT', area: { x0: cx - 30, y0: DOOR_TOP, x1: cx + 30, y1: CFLOOR },
  route: () => { const tr = train(), st = STATIONS[tr.at]; return tr.phase === 'open' && st.room ? { to: st.room, arrive: { ...st.arrive, x: st.arrive.x + (cx < CW / 2 ? -30 : 30) }, label: 'EXIT: ' + st.name } : null; },
});

export function makeTrain(): Room {
  const room: Room = {
    id: 'train', title: 'THE TRAIN', sub: 'LAB HANGOUT LINE',
    w: CW, h: CH,
    floor: { x0: 14, y0: CFLOOR + 6, x1: CW - 14, y1: CH - 24 },
    blockers: [...[200, 500, 820].map((x) => ({ x0: x - 4, y0: 580, x1: x + 4, y1: 586 }))],
    doors: CAR_DOOR_X.map(exitDoor),
    spots: TRAIN_SPOTS, inUse: new Map(),
    spawn: { x: 500, y: 560 },
    dim: 0.04,
    fillTop: 'rgb(200,204,210)', fillLow: 'rgb(70,76,90)',
    bg: mk(CW, CH),
    build: () => buildCar.call(room),
    drawBack: carBack,
    props: [200, 500, 820].map(pole),
  };
  return room;
}
