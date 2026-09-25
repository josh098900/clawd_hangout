// THE LOFTS — the apartment block's lobby, through the door at the right end of the Square.
// Brass mailboxes, a residents' DIRECTORY board (who on your server is home, and whose door is
// open, or which flat is having a HOUSE PARTY), and the ELEVATOR up to the flats (ui/flats.ts
// picks whose). MARGOT the doorman keeps an eye on things. The flats themselves: world/flat.ts.

import { CONFETTI, type RGB } from '../engine/palette';
import { mk, r, txt, tw, lit, G, Gd, shade, disc, line, bake } from '../engine/pixel';
import { h1 } from '../engine/math';
import type { DoorMode } from '../net/transport';
import type { Prop, Room, Spot } from './room';

const W = 900, H = 640, FL = 470;
/** The directory board's rows (main.ts keeps it up to date): name, door, party?, home right now? */
export const LOFTS_INFO = { dir: [] as { name: string; door: DoorMode; party: boolean; home: boolean }[] };
const LIFT = { x: 620, w: 70 }, BOARD = { x: 300, y: 330, w: 170, h: 100 };

function build(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    
    r(0, 0, W, 200, [30, 26, 34]); for (let x = 40; x < W; x += 140) { r(x, 196, 60, 4, [200, 170, 90]); }
    // walls: deep green with brass trim and wood panelling below
    r(0, 200, W, FL - 200, [40, 84, 72]); for (let x = 0; x < W; x += 60) r(x, 200, 2, 190, [34, 72, 62]);
    r(0, 386, W, 4, [200, 170, 90]); r(0, 390, W, FL - 390, [96, 62, 40]); for (let x = 6; x < W; x += 30) r(x, 396, 24, FL - 402, [110, 72, 46]);
    r(0, FL - 4, W, 4, [200, 170, 90]);
    // floor: black and white marble tiles
    for (let y = FL, j = 0; y < H; y += 20, j++) for (let x = 0, i = 0; x < W; x += 20, i++) { const c: RGB = (i + j) % 2 ? [226, 222, 214] : [44, 44, 52]; r(x, y, 20, 20, c); if (h1(i * 7 + j) > 0.7) r(x + 4, y + 6, 8, 1, shade(c, 0.9)); }
    // the door back out to the Square
    r(24, 360, 56, FL - 360, [30, 30, 36]); r(28, 364, 48, FL - 364, [120, 160, 190]); r(51, 364, 2, FL - 364, [30, 30, 36]); r(20, 354, 64, 6, [200, 170, 90]);
    // mailboxes: a brass grid, one little door each
    r(110, 330, 150, 60, [150, 120, 60]); for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) { const mx = 114 + i * 18, my = 334 + j * 14; r(mx, my, 16, 12, [200, 170, 90]); r(mx + 1, my + 1, 14, 10, [176, 146, 70]); r(mx + 12, my + 5, 2, 2, [90, 70, 30]); }
    // the directory board's frame
    r(BOARD.x - 6, BOARD.y - 6, BOARD.w + 12, BOARD.h + 12, [200, 170, 90]); r(BOARD.x, BOARD.y, BOARD.w, BOARD.h, [20, 24, 30]);
    // the elevator: brass doors, a floor dial over them
    r(LIFT.x - 6, 336, LIFT.w + 12, FL - 336, [200, 170, 90]); r(LIFT.x, 344, LIFT.w, FL - 344, [150, 130, 90]); r(LIFT.x + LIFT.w / 2 - 1, 344, 2, FL - 344, [90, 76, 50]);
    for (const dx of [8, LIFT.w / 2 + 6]) { r(LIFT.x + dx, 352, LIFT.w / 2 - 14, 100, [170, 150, 104]); }
    disc(LIFT.x + LIFT.w / 2, 320, 12, [200, 170, 90]); disc(LIFT.x + LIFT.w / 2, 320, 10, [30, 30, 36]); r(LIFT.x + LIFT.w + 10, 400, 8, 14, [200, 170, 90]); disc(LIFT.x + LIFT.w + 14, 407, 2, [255, 214, 90]);
    // a rug in front of the desk
    for (let k = 0; k < 5; k++) r(720 - 70 + k * 4, 560 + k * 3, 140 - k * 8, 3, [160 - k * 10, 40, 50]);
  });
}

function drawBack(a: number): void {
  // the directory: who's home, whose door is open, parties
  lit(() => {
    txt('RESIDENTS', BOARD.x + BOARD.w / 2 - tw('RESIDENTS') / 2, BOARD.y + 5, [255, 214, 90]);
    const d = LOFTS_INFO.dir.slice(0, 7);
    if (!d.length) txt('NOBODY HOME', BOARD.x + BOARD.w / 2 - tw('NOBODY HOME') / 2, BOARD.y + 40, [150, 160, 180]);
    d.forEach((e, i) => {
      const y = BOARD.y + 18 + i * 11, st = e.party ? 'PARTY!' : e.door === 'open' ? 'OPEN' : e.door === 'friends' ? 'FRIENDS' : 'LOCKED';
      const col: RGB = e.party ? CONFETTI[Math.floor(a * 4 + i) % CONFETTI.length] : e.door === 'open' ? [124, 242, 156] : e.door === 'friends' ? [90, 200, 255] : [200, 120, 120];
      r(BOARD.x + 6, y + 1, 3, 3, e.home ? [124, 242, 156] : [80, 80, 90]); txt(e.name.slice(0, 12), BOARD.x + 12, y, [220, 226, 240]); txt(st, BOARD.x + BOARD.w - 6 - tw(st), y, col);
    });
  });
  G(BOARD.x, BOARD.y, BOARD.w, BOARD.h, [120, 170, 255], 0.06);
  // the elevator's dial swings between floors
  const an = -Math.PI / 2 + Math.sin(a * 0.4) * 1.1, cx = LIFT.x + LIFT.w / 2;
  lit(() => { line(cx, 320, Math.round(cx + Math.cos(an) * 8), Math.round(320 + Math.sin(an) * 8), [255, 214, 90]); txt('UP', cx - tw('UP') / 2, 305, [255, 214, 90]); });
  // chandeliers
  lit(() => { for (let x = 70; x < W; x += 280) { r(x - 10, 214, 20, 4, [200, 170, 90]); for (let k = 0; k < 4; k++) r(x - 9 + k * 6, 218, 2, 4, [255, 240, 200]); } });
  for (let x = 70; x < W; x += 280) Gd(x, 222, 34, [255, 230, 170], 0.2);
}

const desk: Prop = { y: 540, draw() { r(740, 500, 110, 40, [110, 72, 46]); r(740, 500, 110, 4, [150, 104, 70]); r(746, 508, 98, 2, [200, 170, 90]); lit(() => { r(760, 492, 10, 8, [255, 214, 90]); r(762, 488, 6, 4, [255, 240, 200]); }); r(806, 494, 16, 6, [240, 240, 244]); } };
const palm = (x: number): Prop => ({ y: 484, draw(a) { r(x - 9, 468, 18, 16, [150, 104, 70]); for (let k = 0; k < 6; k++) { const an = -Math.PI / 2 + (k - 2.5) * 0.45 + Math.sin(a * 0.6 + k) * 0.03; line(x, 468, Math.round(x + Math.cos(an) * 26), Math.round(468 + Math.sin(an) * 30), [60, 140, 80], 2); } } });

export const LOFTS_SPOTS: Spot[] = [
  { kind: 'lift', x: LIFT.x + LIFT.w / 2, y: FL + 22, sx: LIFT.x + LIFT.w / 2, sy: FL + 22, lift: 0, label: 'ELEVATOR', area: { x0: LIFT.x - 6, y0: 300, x1: LIFT.x + LIFT.w + 20, y1: FL } },
  { kind: 'lift', x: BOARD.x + BOARD.w / 2, y: FL + 22, sx: BOARD.x + BOARD.w / 2, sy: FL + 22, lift: 0, label: 'DIRECTORY', area: { x0: BOARD.x - 6, y0: BOARD.y - 6, x1: BOARD.x + BOARD.w + 6, y1: BOARD.y + BOARD.h + 6 } },
];

export function makeLofts(): Room {
  const room: Room = {
    id: 'lofts', title: 'THE LOFTS', sub: 'APARTMENTS',
    w: W, h: H,
    floor: { x0: 14, y0: FL + 12, x1: W - 14, y1: H - 20 },
    blockers: [{ x0: 740, y0: 528, x1: 850, y1: 542 }, { x0: 104, y0: 476, x1: 124, y1: 486 }, { x0: 876, y0: 476, x1: 896, y1: 486 }],
    doors: [{ trigger: { x0: 30, y0: FL + 10, x1: 74, y1: FL + 18 }, to: 'plaza', arrive: { x: 1303, y: 590 }, label: 'THE SQUARE', area: { x0: 22, y0: 356, x1: 82, y1: FL } }],
    spots: LOFTS_SPOTS, inUse: new Map(),
    spawn: { x: 90, y: 520 },
    dim: 0.04,
    fillTop: 'rgb(30,26,34)', fillLow: 'rgb(44,44,52)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [desk, palm(114), palm(886)],
  };
  return room;
}
