// THE LAB — the film's lab set, widened from 640 to 960px so there's room to hang out.
// Everything left of x=640 is the original set (ceiling ducts, whiteboard, poster, clock,
// DANGER sign, street window, RESERVED tape, EXIT door). Right of it is new, built with the
// same primitives and palette.

import { LK, K, type RGB } from '../engine/palette';
import { PX, mk, r, line, disc, oval, txt, tw, alpha, lit, G, withCtx, M, shade } from '../engine/pixel';
import { h1 } from '../engine/math';
import type { Room, Prop, Spot } from './room';
import { BOARD, BOARD_POS } from '../game/board';
import { TRACKS } from '../audio/music';

const W = 960, H = 680, LF = 430;
const C = LK;
export const LAB_DOOR = { x: 8, y: 326, w: 40, h: 104 };
const TBL = { x: 104, y: 414, w: 148 };
const MUGS: { x: number; c: RGB }[] = [{ x: 140, c: [232, 106, 146] }, { x: 194, c: [90, 209, 255] }, { x: 238, c: [242, 194, 48] }];
const LAMPS = [180, 330, 510, 700, 860];
const JUKE = { x: 330 };
/** Live values main.ts keeps up to date from room state: jukebox track (-1 off) and the arcade high score. */
export const LAB_INFO = {
  juke: -1, jukeT0: 0, hi: null as { name: string; score: number } | null,
  /** The PHOTO WALL: the newest approved strips as polaroids (the photo of the week first), fetched by main.ts. */
  photos: [] as { id: number; name: string; thumb: HTMLCanvasElement; week: boolean }[],
};
/** The corkboard, above the step, low enough to see from the floor: 4 x 2 polaroids. */
export const PHOTO_BOARD = { x0: 372, y0: 254, x1: 540, y1: 344 };
const STAIRS = { x: 822, y: 326, w: 40, h: 104 };

function build(this: Room): void {
  const ctx = this.bg.getContext('2d')!;
  withCtx(ctx, () => {
    PX.dim = 0; PX.fl = 0; PX.emit = false;
    // ceiling: beams, duct, pipe, sagging cables
    r(0, 0, W, 160, C.CEIL); for (let x = 18; x < W; x += 92) { r(x, 0, 8, 160, C.BEAM); r(x, 0, 1, 160, C.BEAM_HI); }
    r(0, 58, W, 30, C.DUCT); r(0, 58, W, 2, C.DUCT_HI); r(0, 86, W, 2, C.DUCT_DK); for (let x = 0; x < W; x += 64) { r(x, 58, 2, 30, C.DUCT_DK); r(x + 5, 62, 2, 2, C.DUCT_DK); r(x + 5, 82, 2, 2, C.DUCT_DK); }
    r(0, 108, W, 7, C.PIPEB); r(0, 108, W, 1, C.DUCT_HI); for (let x = 30; x < W; x += 110) r(x, 106, 4, 11, C.STEEL_DK);
    for (let k = 0; k < 3; k++) for (let x = 0; x < W; x += 2) r(x, Math.round(124 + k * 7 + Math.sin(x * 0.03 + k * 1.7) * 3), 2, 1, C.CABLE);
    r(0, 156, W, 4, C.SOFFIT);
    // tiled wall, wainscot, skirting
    r(0, 160, W, 270, C.WALL); for (let y = 160; y < 380; y += 12) { r(0, y, W, 1, C.GROUT); const off = ((y - 160) / 12) % 2 ? 6 : 0; for (let x = off; x < W; x += 12) r(x, y, 1, 12, C.GROUT); }
    r(0, 380, W, 50, C.WAIN); r(0, 380, W, 2, C.WAIN_HI); for (let x = 10; x < W; x += 26) r(x, 382, 1, 44, C.WAIN_DK); r(0, 426, W, 4, C.BASE);
    // floor tiles
    r(0, LF, W, H - LF, C.FLOOR); for (let y = LF, row = 0; y < H; y += 10, row++) { for (let x = (row % 2) * 16; x < W; x += 32) r(x, y, 16, 10, C.FLOOR2); r(0, y, W, 1, C.FGROUT); }
    alpha(0.35, () => r(0, LF, W, 4, [90, 110, 108]));

    // the street window + the step everyone stood on in the film
    r(398, 164, 128, 44, [60, 70, 76]); r(402, 168, 120, 36, [14, 20, 44]);
    for (let i = 0; i < 12; i++) { const bx = 404 + i * 10, bh = 6 + Math.floor(h1(i + 4) * 16); r(bx, 204 - bh, 9, bh, [24, 30, 64]); if (h1(i) > 0.5) r(bx + 3, 204 - bh + 4, 2, 2, [255, 210, 120]); }
    r(402, 168, 120, 2, [70, 84, 120]); r(396, 208, 132, 4, [120, 130, 136]);
    r(414, 344, 100, 6, [140, 104, 74]); r(414, 344, 100, 1, [176, 136, 96]); for (const x of [420, 504]) r(x, 350, 6, 80, [112, 82, 58]); r(420, 386, 90, 3, [112, 82, 58]);

    // whiteboard: still no plan
    r(54, 282, 192, 76, C.WB_FR); r(56, 284, 188, 70, C.WB); r(52, 354, 196, 4, C.WB_FR); r(70, 352, 9, 2, C.MKB); r(83, 352, 9, 2, C.MKR);
    txt('IDEAS:', 64, 289, C.MK); r(64, 295, 23, 1, C.MK); txt('???', 64, 302, C.MKR); txt('???', 100, 314, C.MKR); txt('?', 150, 300, C.MKB);
    for (let k = 0; k < 3; k++) line(170, 300 + k * 14, 230, 306 + k * 12, [170, 176, 180]);
    disc(210, 336, 7, C.MK); disc(210, 336, 6, C.WB); r(207, 334, 1, 1, C.MK); r(212, 334, 1, 1, C.MK); r(207, 339, 6, 1, C.MK); r(206, 340, 1, 1, C.MK); r(213, 340, 1, 1, C.MK);

    // the PHOTO WALL corkboard (the polaroids are drawn live)
    const PB = PHOTO_BOARD; r(PB.x0, PB.y0, PB.x1 - PB.x0, PB.y1 - PB.y0, [110, 76, 50]); r(PB.x0 + 2, PB.y0 + 2, PB.x1 - PB.x0 - 4, PB.y1 - PB.y0 - 4, [196, 150, 100]);
    for (let i = 0; i < 90; i++) r(PB.x0 + 3 + Math.floor(h1(i + 400) * (PB.x1 - PB.x0 - 6)), PB.y0 + 3 + Math.floor(h1(i + 401) * (PB.y1 - PB.y0 - 6)), 1, 1, [176, 132, 86]);
    const cx = (PB.x0 + PB.x1) / 2; r(cx - 26, PB.y0 - 12, 52, 11, [40, 46, 50]); txt('PHOTO WALL', cx - tw('PHOTO WALL') / 2, PB.y0 - 9, [255, 214, 90]);
    // safety poster, clock face, danger sign
    r(256, 240, 46, 58, [40, 46, 50]); r(258, 242, 42, 54, [248, 248, 244]); r(258, 242, 42, 12, [46, 120, 84]); txt('DAYS', 264, 245, [255, 255, 255]); txt('WITHOUT', 265, 257, [40, 46, 50]); txt('SLOP', 271, 264, [40, 46, 50]);
    r(267, 272, 24, 20, [40, 46, 50]); r(268, 273, 22, 18, [26, 28, 32]); r(268, 281, 22, 1, [60, 64, 70]); txt('0', 274, 275, [255, 90, 70], 3); r(284, 249, 1, 1, [255, 255, 255]);
    disc(318, 214, 13, C.STEEL_DK); disc(318, 214, 11, C.PAPER); for (let k = 0; k < 12; k++) { const an = (k / 12) * 6.2832; r(Math.round(318 + Math.cos(an) * 9), Math.round(214 + Math.sin(an) * 9), 1, 1, C.MK); }
    r(552, 196, 38, 27, C.BLACK); r(553, 197, 36, 25, C.YEL); txt('DANGER', 559, 200, C.BLACK); txt('SLOP', 563, 208, C.BLACK); for (let y = 215; y < 221; y++) for (let x = 554; x < 588; x++) if ((x + y) % 6 < 3) r(x, y, 1, 1, C.BLACK);

    // counter + cabinets, now running to x=720, with the test-tube rack
    r(540, 392, 180, 4, C.COUNTER); r(540, 396, 180, 2, C.COUNTER_E); r(542, 398, 178, 28, C.CAB);
    for (let x = 544; x < 718; x += 32) { r(x, 400, 30, 24, C.CAB_DK); r(x + 1, 401, 28, 22, C.CAB); r(x + 24, 410, 3, 1, C.STEEL_DK2); }
    r(612, 384, 24, 3, [138, 90, 58]); r(612, 387, 2, 5, [138, 90, 58]); r(634, 387, 2, 5, [138, 90, 58]);
    ([[615, [123, 97, 255]], [622, [34, 197, 160]], [629, [232, 106, 146]]] as [number, RGB][]).forEach(([x, c]) => { r(x, 370, 4, 18, [210, 240, 244]); r(x + 1, 380, 2, 7, c); r(x, 369, 4, 1, C.STEEL_HI); });
    // coffee machine on the counter
    r(652, 352, 30, 40, C.STEEL_DK2); r(653, 353, 28, 38, C.STEEL); r(653, 353, 28, 2, C.STEEL_HI); r(657, 358, 20, 10, [26, 30, 40]); r(660, 372, 14, 3, C.STEEL_DK); r(665, 375, 4, 4, C.STEEL_DK2);
    r(662, 384, 10, 8, K.PAPER); r(672, 386, 2, 4, K.PAPER); r(663, 384, 8, 1, [110, 70, 44]);

    // jukebox against the wall (its lights are animated in drawBack)
    const jx = JUKE.x;
    r(jx, 356, 38, 74, [70, 40, 30]); r(jx + 2, 358, 34, 70, [120, 72, 46]); r(jx + 2, 358, 34, 2, [160, 104, 70]); r(jx + 33, 360, 3, 68, [92, 56, 36]);
    for (let k = 0; k < 6; k++) { const w = 38 - Math.round(12 * (1 - Math.sqrt(1 - ((5 - k) / 6) ** 2))); r(jx + (38 - w) / 2, 350 + k, w, 1, [70, 40, 30]); }
    r(jx + 7, 362, 24, 18, [20, 16, 28]); r(jx + 6, 386, 26, 20, C.STEEL_DK); for (let y = 388; y < 404; y += 3) r(jx + 8, y, 22, 1, C.STEEL_HI);
    r(jx + 4, 410, 30, 14, [92, 56, 36]); for (let i = 0; i < 4; i++) r(jx + 7 + i * 7, 413, 4, 3, [220, 210, 190]);
    r(jx - 1, 426, 40, 4, [40, 24, 18]);

    // the RESERVED tape where the tank will one day stand
    for (let x = 374; x < 506; x += 6) r(x, 428, 4, 2, C.YEL); for (let x = 374; x < 506; x += 6) r(x, 452, 4, 2, C.YEL);
    for (let y = 428; y < 454; y += 6) { r(372, y, 2, 4, C.YEL); r(504, y, 2, 4, C.YEL); } txt('RESERVED', 424, 438, [150, 140, 90]);

    // bookshelf
    r(740, 290, 64, 140, [92, 60, 40]); r(742, 292, 60, 136, [120, 80, 52]);
    for (let s = 0; s < 4; s++) {
      const sy = 296 + s * 33; r(742, sy + 28, 60, 4, [92, 60, 40]); r(742, sy + 28, 60, 1, [150, 104, 70]);
      let bx = 745; while (bx < 796) { const bw = 3 + Math.floor(h1(bx * 1.7 + s) * 4), bh = 16 + Math.floor(h1(bx + s * 9) * 10), bc: RGB = [[46, 120, 84], [51, 87, 176], [208, 71, 58], [242, 194, 48], [123, 97, 255], [200, 205, 220]][Math.floor(h1(bx * 3.1 + s * 5) * 6)] as RGB;
        if (bx + bw > 800) break; r(bx, sy + 28 - bh, bw, bh, bc); r(bx, sy + 28 - bh, bw, 1, shade(bc, 1.2)); r(bx + bw - 1, sy + 28 - bh, 1, bh, shade(bc, 0.75)); if (bh > 20) r(bx + 1, sy + 28 - bh + 4, Math.max(1, bw - 2), 1, [240, 236, 220]); bx += bw + (h1(bx * 5 + s) > 0.8 ? 3 : 1); }
    }
    // cork noticeboard with pinned notes
    r(818, 232, 92, 64, [110, 76, 50]); r(820, 234, 88, 60, [196, 150, 100]);
    for (let i = 0; i < 40; i++) r(821 + Math.floor(h1(i + 200) * 86), 235 + Math.floor(h1(i + 201) * 58), 1, 1, [176, 132, 86]);
    const note = (x: number, y: number, w: number, h: number, c: RGB, s: string, tc: RGB) => { r(x + 1, y + 1, w, h, [150, 110, 70]); r(x, y, w, h, c); txt(s, x + 3, y + 3, tc); r(x + Math.floor(w / 2), y - 1, 2, 2, K.RED); };
    note(826, 240, 26, 11, [255, 240, 150], 'HI!', C.MK); note(858, 242, 44, 11, [200, 240, 255], 'WELCOME', C.MKB); note(830, 258, 36, 11, [255, 210, 230], 'BE NICE', C.MKR); note(872, 262, 30, 24, K.PAPER, 'WHO', C.MK);
    txt('ATE', 875, 274, C.MK); txt('LUNCH', 875 - 2, 280, C.MKR);

    // arcade cabinet against the wall
    const ax = 890;
    r(ax - 2, 330, 40, 100, [30, 20, 50]); r(ax, 332, 36, 96, [60, 40, 110]); r(ax, 332, 36, 3, [90, 70, 150]); r(ax + 30, 335, 6, 93, [44, 30, 84]);
    r(ax + 2, 336, 32, 10, [20, 12, 36]); r(ax + 4, 360, 28, 22, [10, 12, 24]); r(ax, 386, 36, 10, [44, 30, 84]); r(ax + 8, 388, 2, 4, K.BLACK); r(ax + 7, 386, 4, 2, K.RED); r(ax + 20, 389, 3, 3, K.GOLD); r(ax + 26, 389, 3, 3, K.CYAN);
    for (let y = 400; y < 426; y += 6) r(ax + 4, y, 26, 1, [44, 30, 84]);

    // rug under the lounge corner
    oval(600, 520, 118, 34, C.RUG_EDGE); oval(600, 520, 114, 31, C.RUG); for (let k = -2; k <= 2; k++) r(600 - 100 + Math.abs(k) * 12, 520 + k * 10, 200 - Math.abs(k) * 24, 2, C.RUG2);

    // stairwell door up to the Dev Den
    const S2 = STAIRS; r(S2.x - 3, S2.y - 3, S2.w + 6, S2.h + 3, [70, 80, 86]); r(S2.x, S2.y, S2.w, S2.h, [120, 84, 58]); r(S2.x, S2.y, S2.w, 2, [160, 116, 80]); r(S2.x + S2.w - 2, S2.y, 2, S2.h, [92, 62, 42]);
    for (let k = 0; k < 5; k++) r(S2.x + 8, S2.y + 12 + k * 7, 24 - k * 4, 2, [92, 62, 42]);
    r(S2.x + 30, S2.y + 56, 3, 6, [210, 200, 120]); r(S2.x - 2, S2.y - 18, 44, 12, [30, 38, 48]); txt('DEV DEN', S2.x + 20 - tw('DEV DEN') / 2, S2.y - 15, [200, 225, 255]);

    // EXIT door + sign
    const D = LAB_DOOR; r(D.x - 3, D.y - 3, D.w + 6, D.h + 3, [70, 80, 86]); r(D.x, D.y, D.w, D.h, [96, 110, 118]); r(D.x, D.y, D.w, 2, [130, 144, 150]); r(D.x + D.w - 2, D.y, 2, D.h, [70, 82, 90]);
    r(D.x + 8, D.y + 14, 24, 20, [20, 34, 60]); r(D.x + 31, D.y + 56, 3, 6, [210, 200, 120]); r(D.x + 4, D.y - 16, 32, 10, [20, 40, 28]);
  });
}

function lamp(lx: number, a: number): void {
  const sw = Math.round(Math.sin(a * 0.6 + lx) * 0.6);
  r(lx, 88, 1, 62, [34, 40, 44]); r(lx - 7 + sw, 150, 15, 3, C.STEEL_DK); r(lx - 10 + sw, 153, 21, 4, C.STEEL); r(lx - 10 + sw, 153, 21, 1, C.STEEL_HI);
  lit(() => r(lx - 5 + sw, 157, 11, 2, [255, 240, 200]));
  for (let k = 0; k < 12; k++) G(lx - 4 - k * 4 + sw * (1 + k * 0.3), 159 + k * 16, 9 + k * 8, 16, [255, 238, 200], 0.05);
}

function drawBack(a: number): void {
  // real-time clock hands
  const d = new Date(), mins = d.getMinutes() + d.getSeconds() / 60, hrs = (d.getHours() % 12) + mins / 60;
  const a1 = (mins / 60) * 6.2832 - 1.5708, a2 = (hrs / 12) * 6.2832 - 1.5708;
  line(318, 214, 318 + Math.cos(a1) * 9, 214 + Math.sin(a1) * 9, C.MK); line(318, 214, 318 + Math.cos(a2) * 6, 214 + Math.sin(a2) * 6, C.MKR); r(317, 213, 2, 2, C.MK);
  for (const lx of LAMPS) lamp(lx, a);
  // everyone's drawings on the whiteboard
  PX.ctx.drawImage(BOARD.cv, BOARD_POS.x, BOARD_POS.y);
  photoWall(a);
  // jukebox: neon arch + bubble tubes cycle while it plays, and the record spins
  const on = LAB_INFO.juke >= 0, jx = JUKE.x;
  lit(() => {
    for (let k = 0; k < 6; k++) { const w = 38 - Math.round(12 * (1 - Math.sqrt(1 - ((5 - k) / 6) ** 2))); const col: RGB = on ? ([K.MAG, K.GOLD, K.CYAN] as RGB[])[(k + Math.floor(a * 4)) % 3] : [90, 60, 70]; r(jx + (38 - w) / 2, 350 + k, 2, 1, col); r(jx + (38 + w) / 2 - 2, 350 + k, 2, 1, col); }
    for (const tx of [jx + 2, jx + 33]) for (let y = 360; y < 426; y += 3) r(tx, y, 3, 2, on ? M(K.MAG, K.GOLD, ((y + a * 30) % 24) / 24) : [80, 50, 60]);
    r(jx + 7, 362, 24, 18, on ? [30, 24, 44] : [20, 16, 28]);
    if (on) { const sp = Math.floor(a * 8) % 2; r(jx + 13, 366, 12, 10, [26, 26, 30]); r(jx + 18, 370, 2, 2, K.RED); r(jx + 14 + sp * 8, 367 + sp * 7, 2, 1, [90, 90, 100]); txt('*', jx + 9 + (Math.floor(a * 2) % 2) * 17, 364, K.GOLD); }
  });
  if (on) { G(jx - 6, 344, 50, 86, [255, 120, 200], 0.1); G(jx + 4, 358, 30, 24, [255, 214, 90], 0.15); }
  // EXIT sign
  const D = LAB_DOOR; lit(() => txt('EXIT', D.x + 12, D.y - 14, [124, 242, 156])); G(D.x + 4, D.y - 16, 32, 10, [124, 242, 156], 0.35);
  // window: a few lit city windows blink
  lit(() => { for (let i = 0; i < 12; i++) if (h1(i) > 0.5 && (a * 0.2 + h1(i + 40)) % 1 < 0.9) { const bh = 6 + Math.floor(h1(i + 4) * 16); r(404 + i * 10 + 3, 204 - bh + 4, 2, 2, [255, 210, 120]); } });
  // table + mugs from the film, steaming
  r(TBL.x, TBL.y, TBL.w, 4, C.TABLE); r(TBL.x, TBL.y, TBL.w, 1, [255, 255, 255]); r(TBL.x, TBL.y + 4, TBL.w, 2, C.TABLE_E); r(112, 420, 4, 10, C.TABLE_L); r(240, 420, 4, 10, C.TABLE_L); r(116, 425, 124, 1, C.TABLE_L); r(152, 412, 16, 2, C.PAPER); r(154, 411, 14, 1, C.PAPER);
  MUGS.forEach((m, i) => {
    const mx = m.x, my = 408; r(mx, my, 6, 6, m.c); r(mx + 6, my + 1, 2, 3, m.c); r(mx + 1, my, 4, 1, [90, 55, 35]); r(mx, my + 5, 6, 1, M(m.c, [0, 0, 0], 0.25));
    for (let k = 0; k < 3; k++) { const ph = (a * 0.7 + k * 0.33 + i * 0.2) % 1; alpha(0.55 * (1 - ph), () => r(mx + 2 + Math.round(Math.sin(a * 3 + k * 2 + i) * 1.5), my - 2 - Math.round(ph * 12), 1, 2, [240, 244, 246])); }
  });
  // coffee machine: status light + steam from the cup; brewing = fast amber blink, a drip, a hum of light
  const brewing = !!labRoom?.inUse.has(LAB_COFFEE);
  if (brewing) {
    lit(() => { r(676, 360, 2, 2, (a % 0.3) < 0.15 ? [255, 190, 90] : [110, 70, 30]); r(659, 360, 16, 6, M([26, 30, 40], [255, 190, 90], 0.25 + 0.15 * Math.sin(a * 9))); });
    G(674, 358, 8, 8, [255, 190, 90], 0.4); G(656, 358, 22, 10, [255, 190, 90], 0.12);
    for (let k = 0; k < 3; k++) { const ph = (a * 3 + k / 3) % 1; r(666, 379 + Math.round(ph * 5), 1, 1, [110, 70, 44]); }
  } else { lit(() => r(676, 360, 2, 2, (a % 1.6) < 0.8 ? [124, 242, 156] : [40, 80, 50])); G(674, 358, 6, 6, [124, 242, 156], 0.3); }
  for (let k = 0; k < 3; k++) { const ph = (a * 0.6 + k * 0.33) % 1; alpha(0.5 * (1 - ph), () => r(666 + Math.round(Math.sin(a * 2.4 + k * 2) * 1.5), 381 - Math.round(ph * 14), 1, 2, [240, 244, 246])); }
  // arcade: attract-mode screen, or a real round while someone plays
  const ax = 890;
  if (labRoom?.inUse.has(LAB_ARCADE)) {
    lit(() => {
      r(ax + 4, 360, 28, 22, [8, 10, 30]);
      const px = ax + 6 + Math.round((Math.sin(a * 3.1) * 0.5 + 0.5) * 20);
      r(px, 378, 5, 2, [124, 242, 156]); r(px + 2, 377, 1, 1, [124, 242, 156]);
      for (let k = 0; k < 3; k++) { const ph = (a * 2.5 + k / 3) % 1, bx = ax + 8 + Math.round((Math.sin((a - ph * 0.4) * 3.1) * 0.5 + 0.5) * 20); r(bx, 376 - Math.round(ph * 14), 1, 2, [255, 255, 255]); }
      for (let k = 0; k < 4; k++) { const ex = ax + 6 + k * 7, ey = 363 + Math.round(Math.sin(a * 4 + k) * 1.5); if ((a * 0.8 + k * 0.23) % 1 < 0.8) { r(ex, ey, 4, 3, [255, 95, 210]); r(ex + 1, ey + 3, 1, 1, [255, 95, 210]); r(ex + 2, ey + 3, 1, 1, [255, 95, 210]); } else r(ex + 1, ey + 1, 2, 1, [255, 214, 90]); }
      txt(String(Math.floor(a * 37) % 10000).padStart(4, '0'), ax + 10, 338, [255, 214, 90]);
    });
    G(ax + 2, 356, 32, 28, [255, 120, 220], 0.4); G(ax + 4, 334, 28, 12, [255, 200, 90], 0.3);
    return;
  }
  lit(() => {
    r(ax + 4, 360, 28, 22, [8, 10, 30]);
    const f = Math.floor(a * 6);
    for (let k = 0; k < 6; k++) { const sx = ax + 5 + ((k * 7 + f) % 26), sy = 361 + Math.floor(h1(k + 3) * 20); r(sx, sy, 1, 1, [200, 220, 255]); }
    const px = ax + 6 + Math.round((Math.sin(a * 1.7) * 0.5 + 0.5) * 18); r(px, 377, 5, 2, [124, 242, 156]); r(px + 2, 376, 1, 1, [124, 242, 156]);
    const ex = ax + 8 + ((f * 2) % 18); r(ex, 364, 4, 3, [255, 95, 210]); r(ex + 1, 367, 1, 1, [255, 95, 210]); r(ex + 2, 367, 1, 1, [255, 95, 210]);
    const hi = LAB_INFO.hi, ph = Math.floor(a / 2.5) % 3;
    if (!hi || ph === 0) txt('PLAY', ax + 11, 338, (a % 1) < 0.6 ? [255, 214, 90] : [180, 120, 60]);
    else if (ph === 1) txt('HI ' + hi.score, ax + 18 - Math.round(tw('HI ' + hi.score) / 2), 338, [255, 214, 90]);
    else txt(hi.name.slice(0, 8), ax + 18 - Math.round(tw(hi.name.slice(0, 8)) / 2), 338, [124, 242, 156]);
  });
  G(ax + 2, 356, 32, 28, [120, 140, 255], 0.3); G(ax + 4, 334, 28, 12, [255, 200, 90], 0.25);
}

/** The polaroids on the corkboard: a white card, the photo, a red pin; the week's favourite in gold with a star. */
function photoWall(a: number): void {
  const PB = PHOTO_BOARD, ps = LAB_INFO.photos;
  for (let i = 0; i < 8; i++) {
    const x = PB.x0 + 3 + (i % 4) * 41, y = PB.y0 + 3 + Math.floor(i / 4) * 44 + ((i * 7) % 3) - 1, p = ps[i];
    if (!p) { if (i < 2 && !ps.length) continue; r(x, y, 36, 40, [186, 140, 92]); continue; }
    r(x + 1, y + 1, 36, 40, [120, 84, 54]); r(x, y, 36, 40, p.week ? [255, 214, 90] : [250, 248, 240]);
    PX.ctx.drawImage(p.thumb, x + 2, y + 2);
    const n = p.name.slice(0, 8); txt(n, x + 18 - tw(n) / 2, y + 33, p.week ? [120, 80, 10] : [90, 84, 100]);
    r(x + 17, y - 1, 2, 2, K.RED);
    if (p.week) lit(() => { const tw2 = (a * 2) % 1 < 0.5; r(x + 31, y - 3, 3, 3, K.GOLD); r(x + 32, y - 5, 1, 7, tw2 ? K.WHITE : K.GOLD); r(x + 30, y - 2, 5, 1, tw2 ? K.WHITE : K.GOLD); });
  }
  const cx = (PB.x0 + PB.x1) / 2;
  if (!ps.length) { txt('PIN YOURS!', cx - tw('PIN YOURS!') / 2, PB.y0 + 30, [110, 76, 50]); txt('(PHOTO BOOTH', cx - tw('(PHOTO BOOTH') / 2, PB.y0 + 44, [140, 100, 66]); txt('IN THE CINEMA)', cx - tw('IN THE CINEMA)') / 2, PB.y0 + 52, [140, 100, 66]); }
}

// ---- things you can use (index = network id: append only) ----
const SOFA_AREA = { x0: 538, y0: 484, x1: 662, y1: 524 };
const seat = (x: number, y: number, lift: number, area: Spot['area'], sy: number): Spot => ({ kind: 'sit', x, y, sx: x, sy, lift, label: 'SIT', area });
export const LAB_SPOTS: Spot[] = [
  seat(568, 525, 8, SOFA_AREA, 534), seat(600, 525, 8, SOFA_AREA, 534), seat(632, 525, 8, SOFA_AREA, 534),
  { kind: 'coffee', x: 667, y: 446, sx: 667, sy: 446, lift: 0, label: 'COFFEE', area: { x0: 648, y0: 348, x1: 686, y1: 396 } },
  { kind: 'arcade', x: 908, y: 446, sx: 908, sy: 446, lift: 0, label: 'PLAY', area: { x0: 886, y0: 328, x1: 928, y1: 430 } },
  { kind: 'board', x: 150, y: 446, sx: 150, sy: 446, lift: 0, label: 'DRAW', area: { x0: 52, y0: 280, x1: 248, y1: 358 } },
  { kind: 'juke', x: 349, y: 446, sx: 349, sy: 446, lift: 0, label: 'MUSIC', area: { x0: 328, y0: 346, x1: 370, y1: 430 } },
  { kind: 'photos', x: 456, y: 446, sx: 456, sy: 446, lift: 0, label: 'PHOTOS', area: { x0: 372, y0: 242, x1: 540, y1: 344 } }, // 7
];
export const LAB_COFFEE = 3, LAB_ARCADE = 4, LAB_JUKE_X = 349;
let labRoom: Room | null = null;

// ---- standing props (depth-sorted with players) ----
const sofa: Prop = {
  y: 524,
  draw() {
    const x0 = 538, x1 = 662, y = 524;
    r(x0 + 6, y - 38, x1 - x0 - 12, 22, C.SOFA_DK); r(x0 + 8, y - 36, x1 - x0 - 16, 18, C.SOFA); r(x0 + 8, y - 36, x1 - x0 - 16, 2, C.SOFA_HI); r(600, y - 34, 1, 14, C.SOFA_DK);
    r(x0 + 4, y - 18, x1 - x0 - 8, 12, C.SOFA_DK); r(x0 + 6, y - 18, x1 - x0 - 12, 9, C.SOFA_HI); r(x0 + 6, y - 10, x1 - x0 - 12, 2, C.SOFA); r(600, y - 18, 1, 10, C.SOFA_DK);
    for (const ax of [x0, x1 - 12]) { r(ax, y - 28, 12, 24, C.SOFA_DK); r(ax + 1, y - 27, 10, 22, C.SOFA); r(ax + 1, y - 27, 10, 2, C.SOFA_HI); }
    r(x0 + 2, y - 4, 4, 4, [40, 30, 24]); r(x1 - 6, y - 4, 4, 4, [40, 30, 24]);
    // cushion
    r(x0 + 16, y - 30, 14, 12, [242, 194, 48]); r(x0 + 16, y - 30, 14, 1, [255, 224, 122]);
  },
};
const lowTable: Prop = {
  y: 566,
  draw(a: number) {
    const x0 = 572, y = 566;
    r(x0, y - 10, 56, 4, [140, 104, 74]); r(x0, y - 10, 56, 1, [176, 136, 96]); r(x0 + 2, y - 6, 3, 6, [112, 82, 58]); r(x0 + 51, y - 6, 3, 6, [112, 82, 58]);
    // a board game mid-play
    r(x0 + 18, y - 12, 18, 2, K.PAPER); r(x0 + 20, y - 13, 3, 1, K.RED); r(x0 + 30, y - 13, 3, 1, [90, 209, 255]);
    r(x0 + 42, y - 16, 6, 6, [34, 197, 160]); r(x0 + 48, y - 15, 2, 3, [34, 197, 160]);
    for (let k = 0; k < 2; k++) { const ph = (a * 0.7 + k * 0.5) % 1; alpha(0.5 * (1 - ph), () => r(x0 + 44, y - 18 - Math.round(ph * 10), 1, 2, [240, 244, 246])); }
  },
};
const plant = (x: number, y: number, big: boolean): Prop => ({
  y,
  draw(a: number) {
    const s = big ? 1 : 0.8, pw = Math.round(16 * s), ph = Math.round(14 * s);
    r(x - pw / 2, y - ph, pw, ph, C.POT); r(x - pw / 2 - 1, y - ph, pw + 2, 3, C.POT_DK); r(x + pw / 2 - 3, y - ph + 3, 3, ph - 3, C.POT_DK);
    const n = big ? 9 : 6;
    for (let i = 0; i < n; i++) {
      const an = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.2 + Math.sin(a * 1.1 + i) * 0.04, L = (big ? 22 : 15) + h1(i + x) * 8;
      for (let j = 0; j < L; j++) { const u = j / L, px = x + Math.cos(an) * j, py = y - ph - 1 + Math.sin(an) * j + u * u * 6; r(px - 1, py - 1, u > 0.2 && u < 0.8 ? 3 : 2, 2, u > 0.6 ? C.LEAF_HI : C.LEAF); }
    }
    r(x - 1, y - ph - 3, 2, 3, C.LEAF_DK);
  },
});

export function makeLab(): Room {
  const room: Room = {
    id: 'lab', title: 'THE LAB', sub: 'HANGOUT ROOM',
    w: W, h: H,
    floor: { x0: 14, y0: 440, x1: W - 14, y1: 612 },
    blockers: [
      { x0: 540, y0: 506, x1: 660, y1: 526 }, // sofa
      { x0: 572, y0: 556, x1: 628, y1: 568 }, // low table
      { x0: 226, y0: 452, x1: 254, y1: 462 }, // plant
      { x0: 916, y0: 592, x1: 944, y1: 604 }, // plant
    ],
    doors: [
      { trigger: { x0: 10, y0: 440, x1: 46, y1: 448 }, to: 'plaza', arrive: { x: 62, y: 580 }, label: 'OUTSIDE', area: { x0: 4, y0: 306, x1: 52, y1: 446 } },
      { trigger: { x0: 824, y0: 440, x1: 860, y1: 448 }, to: 'den', arrive: { x: 30, y: 458 }, label: 'UPSTAIRS', area: { x0: 816, y0: 306, x1: 868, y1: 446 } },
    ],
    music: { x: JUKE.x + 19, tracks: TRACKS, current: () => ({ n: LAB_INFO.juke, t0: LAB_INFO.jukeT0 }) },
    onState(s) {
      if (s.k === 'juke') { LAB_INFO.juke = s.v.n; LAB_INFO.jukeT0 = s.v.t0; }
      else if (s.k === 'hi') LAB_INFO.hi = s.v;
    },
    spots: LAB_SPOTS, inUse: new Map(),
    spawn: { x: 320, y: 500 },
    dim: 0,
    fillTop: 'rgb(39,51,58)', fillLow: 'rgb(184,200,197)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [sofa, lowTable, plant(240, 460, true), plant(930, 600, false)],
  };
  labRoom = room;
  return room;
}
