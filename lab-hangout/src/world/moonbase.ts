// THE MOON BASE: inside the habitat dome on the Moon (moon gravity: you still bound about, but there's air, so
// helmets off and pets welcome). Left to right:
//   the AIRLOCK back out to the surface (suits on the rack),
//   the GREENHOUSE (MOON TATERS and tomatoes under the pink grow lights; LUNA looks after them),
//   the CANTEEN (a table, and the SNACK PRINTER: it prints hot dogs, mostly),
//   the OBSERVATION WINDOW (Earth hanging over the grey hills; a bench to sit and look),
//   the ASSAY LAB (bring a moon rock in from the crystal field: the machine says what it is and pays for it,
//   0019_moon.sql), your crystal case, and the BASE RADIO (COSMO calls in from the station).

import { K, MN, SK, type RGB } from '../engine/palette';
import { PX, mk, r, disc, ring, txt, tw, lit, G, Gd, M, shade, bake } from '../engine/pixel';
import { h1 } from '../engine/math';
import { drawEarth, starfield, twinkles, vnoise } from './space';
import { MOON_AIRLOCK_ARRIVE, drawCrystal } from './moon';
import type { Door, Prop, Room, Spot, Talker } from './room';

const W = 1300, H = 680, WALL = 280, FL = 470;
const AIR_X = 90, WIN = { x0: 830, y0: 300, x1: 1076, y1: 448 }, ASSAY_X = 1180;
/** What the ASSAY machine last said (features/moon.ts sets it; the screen shows it for a while), and your crystals (for the case). */
export const BASE = { assay: null as { text: string; crystal: boolean; at: number } | null, crystals: 0 };

function build(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    // the ceiling: the dome's ribs curving overhead, a strip of warm lights
    r(0, 0, W, WALL, SK.TRIM); for (let x = 0; x < W; x += 52) { r(x, 0, 3, WALL, SK.TRIM_HI); r(x + 3, 0, 1, WALL, shade(SK.TRIM, 0.8)); }
    r(0, 210, W, 8, MN.BASE_DK); for (let x = 40; x < W; x += 160) { r(x, WALL - 14, 100, 6, MN.BASE_HI); r(x, WALL - 8, 100, 2, MN.BASE_SH); }
    // the back wall: warm cream panels with an orange band (not the station's cold white)
    for (let x = 0; x < W; x += 64) { const c = (x / 64) % 2 ? MN.BASE : MN.BASE2; r(x, WALL, 64, FL - WALL, c); r(x, WALL, 64, 2, MN.BASE_HI); r(x, WALL, 1, FL - WALL, MN.BASE_HI); r(x + 62, WALL, 2, FL - WALL, MN.BASE_SH); for (let y = WALL + 12; y < FL - 8; y += 34) { r(x + 5, y, 2, 2, MN.BASE_DK); r(x + 57, y, 2, 2, MN.BASE_DK); } }
    r(0, FL - 44, W, 6, MN.ORANGE); r(0, FL - 38, W, 1, MN.ORANGE_DK); r(0, FL - 8, W, 8, MN.BASE_SH);
    // the floor: dusty (people keep tracking moon dust in), carrying on below the walkable band
    r(0, FL, W, H - FL, SK.FLOOR); for (let y = FL + 6; y < H; y += 8) r(0, y, W, 1, SK.FLOOR_LN); for (let x = 0; x < W; x += 48) r(x, FL, 1, H - FL, SK.FLOOR2);
    r(0, FL, W, 3, SK.TRIM_HI); for (let k = 0; k < 260; k++) r(Math.floor(h1(k * 2.3) * 260), FL + 4 + Math.floor(h1(k * 5.1) * 180), 2, 1, MN.REG);
    // ---- the AIRLOCK, and the suit rack ----
    disc(AIR_X, 402, 50, SK.HAZ_DK); for (let k = 0; k < 24; k++) { const an = k / 24 * Math.PI * 2; if (k % 2) for (let d = 43; d < 50; d++) r(Math.round(AIR_X + Math.cos(an) * d), Math.round(402 + Math.sin(an) * d), 2, 2, SK.HAZ); }
    disc(AIR_X, 402, 42, SK.HULL_DK); disc(AIR_X, 402, 38, SK.PANEL2); disc(AIR_X, 396, 10, SK.TRIM); disc(AIR_X, 396, 8, SK.WINDOW);
    r(AIR_X - 40, 292, 80, 16, SK.HAZ); for (let x = AIR_X - 40; x < AIR_X + 40; x += 10) r(x, 292, 5, 16, SK.HAZ_DK); r(AIR_X - 34, 295, 68, 10, SK.HAZ_DK); txt('SURFACE', AIR_X - tw('SURFACE') / 2, 298, SK.HAZ);
    for (const x of [164, 196]) { const c: RGB = [236, 238, 244]; disc(x, 330, 8, SK.GLASS); ring(x, 330, 8, 8, SK.HULL_SH); r(x - 8, 340, 16, 26, c); r(x + 4, 340, 4, 26, SK.HULL_SH); r(x - 7, 366, 6, 18, c); r(x + 1, 366, 6, 18, SK.HULL_SH); r(x - 5, 346, 10, 6, MN.ORANGE); }
    r(150, 318, 62, 3, SK.RAIL);
    // ---- the GREENHOUSE: a long window onto the grey hills, plant tubs under the grow lights ----
    r(226, 300, 320, 110, SK.TRIM); r(230, 304, 312, 102, SK.VOID); starfield(230, 304, 312, 50, 40, 31);
    for (let x = 230; x < 542; x += 2) { const hgt = Math.round(360 - vnoise(x / 60, 3, 1e6, 7) * 26), hgt2 = Math.round(388 - vnoise(x / 30, 5, 1e6, 3) * 14); r(x, hgt, 2, 406 - hgt, MN.HILL2); r(x, hgt, 2, 1, MN.REG_HI); r(x, hgt2, 2, 406 - hgt2, MN.REG2); r(x, hgt2, 2, 1, MN.REG_HI); }
    for (const x of [334, 438]) r(x - 2, 304, 4, 102, SK.TRIM);
    r(226, 414, 320, 6, SK.TRIM); txt('GREENHOUSE', 386 - tw('GREENHOUSE') / 2, 290, MN.LEAF_DK);
    for (let k = 0; k < 4; k++) { const x = 246 + k * 76; r(x, 440, 64, 28, MN.BASE_DK); r(x, 440, 64, 3, MN.BASE_SH); r(x + 2, 443, 60, 5, [96, 70, 50]); }
    txt('MOON TATERS', 278 - tw('MOON TATERS') / 2, 456, MN.BASE_HI); txt('TOMATOES', 354 - tw('TOMATOES') / 2, 456, MN.BASE_HI); txt('BASIL', 430 - tw('BASIL') / 2, 456, MN.BASE_HI); txt('SPACE PEAS', 506 - tw('SPACE PEAS') / 2, 456, MN.BASE_HI);
    // ---- the CANTEEN: the snack printer on the wall ----
    r(600, 330, 70, 96, SK.TRIM); r(604, 334, 62, 88, SK.PANEL); r(604, 334, 62, 2, SK.HULL_HI); r(610, 370, 50, 34, SK.WINDOW); r(612, 404, 46, 6, SK.HULL_DK);
    txt('SNACK', 635 - tw('SNACK') / 2, 340, SK.TRIM); txt('PRINTER', 635 - tw('PRINTER') / 2, 348, SK.TRIM);
    r(700, 300, 90, 60, [250, 246, 232]); txt('MENU', 745 - tw('MENU') / 2, 304, SK.TRIM); for (const [k, s] of ['HOT DOG', 'HOT DOG', 'HOT DOG?', 'MOON TATERS'].entries()) txt(s, 706, 314 + k * 10, k === 3 ? MN.LEAF_DK : SK.HULL_DK);
    // ---- the OBSERVATION WINDOW (the live view is drawn every frame) ----
    r(WIN.x0 - 10, WIN.y0 - 10, WIN.x1 - WIN.x0 + 20, WIN.y1 - WIN.y0 + 20, SK.TRIM); r(WIN.x0 - 6, WIN.y0 - 6, WIN.x1 - WIN.x0 + 12, WIN.y1 - WIN.y0 + 12, SK.TRIM_HI);
    r(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, SK.VOID); starfield(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, 110, 90, 41);
    for (let x = WIN.x0; x < WIN.x1; x += 2) { const hgt = Math.round(WIN.y1 - 34 - vnoise(x / 50, 9, 1e6, 11) * 30); r(x, hgt, 2, WIN.y1 - hgt, M(MN.HILL2, MN.REG, (WIN.y1 - hgt) / 80)); r(x, hgt, 2, 1, MN.REG_HI); }
    for (const x of [912, 994]) r(x - 2, WIN.y0, 4, WIN.y1 - WIN.y0, SK.TRIM);
    // ---- the ASSAY LAB ----
    r(ASSAY_X - 50, 318, 100, 124, SK.TRIM); r(ASSAY_X - 46, 322, 92, 116, SK.PANEL2); r(ASSAY_X - 46, 322, 92, 2, SK.HULL_HI);
    r(ASSAY_X - 36, 330, 72, 36, SK.SCREEN); // its screen (drawn live)
    r(ASSAY_X - 18, 384, 36, 20, SK.HULL_DK); r(ASSAY_X - 14, 388, 28, 12, SK.TRIM); // the hopper
    r(ASSAY_X - 46, 438, 92, 30, SK.TRIM_HI); txt('ASSAY', ASSAY_X - tw('ASSAY', 2) / 2, 446, MN.ORANGE, 2);
    r(1100, 326, 20, 60, [58, 62, 80]); r(1102, 328, 16, 22, SK.SCREEN); for (let k = 0; k < 3; k++) r(1104, 356 + k * 8, 12, 4, SK.HULL_DK); txt('RADIO', 1110 - tw('RADIO') / 2, 390, SK.TRIM);
    r(1244, 330, 44, 70, SK.TRIM); r(1247, 333, 38, 64, [40, 46, 70]); txt('MY', 1266 - tw('MY') / 2, 404, SK.TRIM); txt('CRYSTALS', 1266 - tw('CRYSTALS') / 2, 412, SK.TRIM);
  });
}

// ---------- live bits ----------
function windowView(a: number): void {
  const g = PX.ctx; g.save(); g.beginPath(); g.rect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0); g.clip();
  twinkles(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, 100, 14, 41, a);
  drawEarth(960, 378 - Math.round(Math.sin(Date.now() / 1000 / 600 * Math.PI * 2) * 6), 36); // earthrise, over the hills (they're drawn in the backdrop: redraw them on top)
  for (let x = WIN.x0; x < WIN.x1; x += 2) { const hgt = Math.round(WIN.y1 - 34 - vnoise(x / 50, 9, 1e6, 11) * 30); if (hgt < 420) r(x, hgt, 2, 420 - hgt, MN.HILL2); }
  g.restore();
  lit(() => { for (const x of [WIN.x0 + 8, 918, 1000]) { r(x, WIN.y0 + 6, 14, 1, K.WHITE); r(x, WIN.y0 + 7, 1, 10, [220, 240, 255]); } });
  G(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, [120, 180, 255], 0.03);
}
function greenhouse(a: number): void {
  lit(() => { for (let x = 234; x < 540; x += 12) r(x, 424, 8, 2, (Math.floor(x / 12) % 2) ? SK.GROW : SK.GROW2); });
  for (let k = 0; k < 4; k++) G(240, 428 + k * 4, 300, 12, SK.GROW, 0.04 + 0.01 * Math.sin(a * 1.4));
  // the plants: potato leaves, tomato vines, basil, pea tendrils, swaying a little
  for (let k = 0; k < 4; k++) {
    const x0 = 250 + k * 76;
    for (let p = 0; p < 4; p++) {
      const x = x0 + 6 + p * 15, sw = Math.round(Math.sin(a * 0.9 + p + k * 2) * 1.5), hgt = [14, 26, 10, 30][k];
      for (let j = 0; j < hgt; j++) r(x + (j > hgt / 2 ? sw : 0), 440 - j, 1, 1, MN.LEAF_DK);
      r(x - 3 + sw, 440 - hgt, 7, 4, MN.LEAF); r(x - 4, 436, 4, 3, MN.LEAF); r(x + 1, 432 - Math.floor(hgt / 2), 4, 3, MN.LEAF);
      if (k === 1 && p % 2 === 0) r(x + 2 + sw, 440 - hgt + 6, 3, 3, [230, 70, 60]);
      if (k === 0 && p === 2) r(x - 2, 440, 5, 3, MN.TATER);
    }
  }
}
function printer(a: number): void {
  lit(() => { r(606, 360, 58, 6, SK.SCREEN); txt('READY', 635 - tw('READY') / 2, 360, (a % 2) < 1.6 ? SK.LED : shade(SK.LED, 0.5)); r(612, 372, 46, 30, [60, 110, 150]); r(612 + Math.floor((a * 20) % 44), 372, 2, 30, [150, 220, 255]); });
  Gd(635, 386, 20, [120, 200, 255], 0.12);
}
function assay(a: number): void {
  const s = BASE.assay, T = Date.now() / 1000, fresh = s && T - s.at < 8;
  lit(() => {
    if (fresh) { const m = s!.text; txt(m.slice(0, 14), ASSAY_X - tw(m.slice(0, 14)) / 2, 336, s!.crystal ? ((a * 4) % 1 < 0.5 ? K.GOLD : MN.CRYSTAL2) : SK.LED); if (m.length > 14) txt(m.slice(14, 28), ASSAY_X - tw(m.slice(14, 28)) / 2, 346, SK.LED); }
    else { txt('INSERT', ASSAY_X - tw('INSERT') / 2, 336, SK.LED); txt('MOON ROCK', ASSAY_X - tw('MOON ROCK') / 2, 346, SK.LED); for (let k = 0; k < 8; k++) r(ASSAY_X - 30 + k * 8, 358, 5, 2, (a * 3 + k / 8) % 1 < 0.3 ? SK.LED : shade(SK.LED, 0.3)); }
    r(ASSAY_X - 12, 392, 24, 4, fresh ? (s!.crystal ? MN.CRYSTAL2 : MN.CRYSTAL) : shade(MN.CRYSTAL, 0.35));
  });
  G(ASSAY_X - 36, 330, 72, 36, fresh && s!.crystal ? MN.CRYSTAL2 : SK.LED, fresh ? 0.1 : 0.05);
  // the radio's little screen, and your crystal case
  lit(() => { for (let k = 0; k < 5; k++) r(1104 + k * 3, 346 - Math.round(Math.abs(Math.sin(a * 5 + k * 1.3)) * 14), 2, 2 + Math.round(Math.abs(Math.sin(a * 5 + k * 1.3)) * 14), SK.LED); });
  const n = Math.min(12, BASE.crystals);
  for (let k = 0; k < n; k++) drawCrystal(1253 + (k % 3) * 13, 348 + Math.floor(k / 3) * 14, a, k % 2 === 1, 0.45);
  if (!n) txt('NONE YET', 1266 - tw('NONE YET') / 2, 360, [120, 128, 160]);
}
function drawBack(a: number): void {
  for (let x = 40; x < W; x += 160) G(x, WALL - 14, 100, 30, [255, 236, 200], 0.06);
  windowView(a); greenhouse(a); printer(a); assay(a);
  lit(() => r(AIR_X - 4, 348, 8, 4, (a % 1) < 0.5 ? SK.LED : shade(SK.LED, 0.4)));
}

// ---------- props ----------
const table: Prop = { y: 560, draw() { const cx = 700; r(cx - 50, 536, 100, 8, MN.BASE); r(cx - 50, 536, 100, 2, MN.BASE_HI); r(cx + 44, 536, 6, 8, MN.BASE_SH); r(cx - 4, 544, 8, 16, SK.HULL_DK); r(cx - 20, 558, 40, 3, SK.HULL_DK); r(cx - 30, 530, 10, 6, [250, 246, 232]); r(cx + 14, 528, 8, 8, [230, 236, 244]); } };
const bench: Prop = { y: 570, draw() { const x0 = 880, x1 = 1028; r(x0, 550, x1 - x0, 10, K.NAVY_L); r(x0, 550, x1 - x0, 2, M(K.NAVY_L, K.WHITE, 0.2)); r(x0, 560, x1 - x0, 4, K.NAVY); for (const x of [x0 + 6, x1 - 10]) r(x, 564, 4, 6, SK.TRIM); } };
const stool = (x: number): Prop => ({ y: 575, draw() { r(x - 9, 560, 18, 5, MN.ORANGE); r(x - 9, 560, 18, 1, M(MN.ORANGE, K.WHITE, 0.3)); r(x - 1, 565, 3, 10, SK.HULL_DK); r(x - 6, 574, 13, 2, SK.HULL_DK); } });
export const MOONBASE_SPOTS: Spot[] = [
  { kind: 'assay', x: ASSAY_X, y: 492, sx: ASSAY_X, sy: 494, lift: 0, label: 'ASSAY', area: { x0: ASSAY_X - 48, y0: 320, x1: ASSAY_X + 48, y1: 470 } }, // 0
  ...[640, 700, 760].map((x): Spot => ({ kind: 'sit', x, y: 576, sx: x, sy: 594, lift: 14, label: 'SIT', area: { x0: x - 12, y0: 556, x1: x + 12, y1: 575 } })), // 1..3
  ...[920, 988].map((x): Spot => ({ kind: 'sit', x, y: 571, sx: x, sy: 588, lift: 8, label: 'GAZE', area: { x0: x - 26, y0: 544, x1: x + 26, y1: 568 } })), // 4, 5
  { kind: 'hotdog', x: 635, y: 492, sx: 635, sy: 494, lift: 0, label: 'PRINT A SNACK', area: { x0: 600, y0: 330, x1: 670, y1: 430 } }, // 6
];
const RADIO: Talker = {
  id: 'radio', name: 'BASE RADIO', x: 1110, y: 330, sx: 1110, sy: 494,
  lines: ['*crackle* COSMO here, on the station. how is the Moon?', 'mission control says: bring rocks. lots of rocks', 'the lander comes and goes every 10 minutes. don\'t miss it', 'rumour has it purple crystals are lucky. the ASSAY machine knows', 'you can see the Square from here. well. almost', 'buggy lap record is on the big board... somewhere', '*static* ...did someone leave a sandwich in the airlock?'],
};
const airlockDoor: Door = { trigger: { x0: AIR_X - 20, y0: 480, x1: AIR_X + 20, y1: 488 }, to: 'moon', arrive: MOON_AIRLOCK_ARRIVE, label: 'SURFACE', area: { x0: AIR_X - 44, y0: 352, x1: AIR_X + 44, y1: 480 } };

export function makeMoonBase(): Room {
  const room: Room = {
    id: 'moonbase', title: 'MOON BASE', sub: 'SEA OF CRITTERS',
    w: W, h: H,
    floor: { x0: 16, y0: 480, x1: W - 16, y1: 610 },
    blockers: [{ x0: 650, y0: 552, x1: 750, y1: 560 }, { x0: 878, y0: 562, x1: 1030, y1: 572 }],
    doors: [airlockDoor],
    spots: MOONBASE_SPOTS, inUse: new Map(),
    spawn: { x: AIR_X + 20, y: 500 },
    dim: 0,
    fillTop: 'rgb(58,66,86)', fillLow: 'rgb(69,76,94)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [table, bench, ...[640, 700, 760].map(stool)],
    talkers: [RADIO],
    watch: { x: 954, top: 290 },
    lowG: () => true,
  };
  return room;
}
