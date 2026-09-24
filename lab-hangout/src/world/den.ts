// THE DEV DEN — a chill coding office up the stairs from the Lab. A rainy evening: a big
// window over the city, desk lamps, beanbags, a SHIP IT neon, the build status screen, a
// kanban board, a server rack and the DEPLOY button. Desks are where you CODE (a typing game
// that makes commits); the build can break; the rack fixes it; the button ships it.
//
// Shared time from the wall clock: the pomodoro (25 min focus / 5 min break) and lightning.
// Shared choices come in as room state (build, deploy, notes, radio) via onState().

import { K, NK, CONFETTI, type RGB } from '../engine/palette';
import { PX, mk, r, line, oval, txt, tw, alpha, lit, G, Gd, withCtx, M, shade, puff } from '../engine/pixel';
import { h1 } from '../engine/math';
import { LOFI } from '../audio/music';
import type { BuildState, KanbanNote, StateMsg } from '../net/transport';
import type { Room, Prop, Spot, Talker } from './room';

const W = 1000, H = 680, LF = 430;
const WIN = { x: 300, y: 232, w: 260, h: 148 };
const SCREEN = { x: 70, y: 266, w: 160, h: 76 };
const BOARD = { x: 600, y: 282, w: 180, h: 102 };
const WAIN = 392;
const RACK = { x: 890, y: 290, w: 60, h: 140 };
const DOOR = { x: 8, y: 326, w: 40, h: 104 };
/** Desks: [x, y] of the desk's front edge. Index = spot index. */
export const DEN_DESKS: [number, number][] = [[330, 500], [470, 500], [330, 575], [470, 575]];
export const BEANBAGS: [number, number][] = [[700, 520], [780, 560]];
const PEDESTAL = { x: 955, y: 505 };

/** Live copies of this room's state, for drawing and for main.ts to read. */
export const DEN_INFO = {
  radio: 0, radioT0: 0,
  build: { ok: true, n: 0, dep: 0, by: '', id: '', msg: '' } as BuildState,
  deploy: null as { t0: number; ok: boolean; by: string } | null,
  notes: [] as KanbanNote[],
  duckT: -9,
};

/** 25 minutes of focus, 5 of break, on the wall clock. */
export function pomodoro(): { focus: boolean; left: number } {
  const t = (Date.now() / 1000) % 1800;
  return t < 1500 ? { focus: true, left: 1500 - t } : { focus: false, left: 1800 - t };
}
/** 0..1: a lightning flash over the city (roughly every 97 s, for a quarter second, twice). */
export function lightning(): number {
  const t = (Date.now() / 1000) % 97;
  return t < 0.12 ? 1 - t / 0.12 : t > 0.22 && t < 0.4 ? 0.7 * (1 - (t - 0.22) / 0.18) : 0;
}
const mmss = (s: number) => { const m = Math.floor(s / 60), q = Math.floor(s % 60); return String(m).padStart(2, '0') + ':' + String(q).padStart(2, '0'); };

// ---------- the set ----------
function build(this: Room): void {
  withCtx(this.bg.getContext('2d')!, () => {
    PX.dim = 0; PX.fl = 0; PX.emit = false;
    // ceiling beams + lamp cords
    r(0, 0, W, 150, NK.CEIL); for (let x = 30; x < W; x += 90) { r(x, 0, 10, 150, NK.BEAM); r(x, 0, 1, 150, [40, 50, 64]); }
    r(0, 146, W, 4, NK.TRIM);
    // walls: dusky blue with a slatted wood wainscot
    r(0, 150, W, LF - 150, NK.WALL); for (let x = 0; x < W; x += 40) r(x, 150, 20, WAIN - 150, NK.WALL2);
    r(0, WAIN - 4, W, 4, NK.WOOD_HI); r(0, WAIN, W, LF - WAIN, NK.WOOD_DK); for (let x = 4; x < W; x += 12) r(x, WAIN + 2, 8, LF - WAIN - 4, NK.WOOD);
    r(0, LF - 4, W, 4, NK.TRIM);
    // plank floor
    r(0, LF, W, H - LF, NK.FLOOR);
    for (let y = LF, j = 0; y < H; y += 8, j++) { r(0, y, W, 1, NK.FLOOR_LN); if (j % 2) r(0, y + 1, W, 7, NK.FLOOR2); for (let x = (j * 37) % 90; x < W; x += 90) r(x, y, 1, 8, NK.FLOOR_LN); }
    alpha(0.35, () => r(0, LF, W, 4, [20, 12, 8]));
    // rug under the beanbags
    oval(740, 548, 90, 26, NK.RUG_EDGE); oval(740, 548, 86, 23, NK.RUG); for (let k = -1; k <= 1; k++) r(740 - 70 + Math.abs(k) * 12, 548 + k * 9, 140 - Math.abs(k) * 24, 2, NK.RUG2);

    // stairwell door back down to the Lab
    const D = DOOR; r(D.x - 3, D.y - 3, D.w + 6, D.h + 3, NK.TRIM); r(D.x, D.y, D.w, D.h, NK.WOOD); r(D.x, D.y, D.w, 2, NK.WOOD_HI); r(D.x + D.w - 2, D.y, 2, D.h, NK.WOOD_DK);
    for (const py of [D.y + 8, D.y + 56]) { r(D.x + 6, py, 28, 40, NK.WOOD_DK); r(D.x + 7, py + 1, 26, 38, NK.WOOD); }
    r(D.x + 31, D.y + 50, 3, 6, K.GOLD); r(D.x + 4, D.y - 16, 32, 10, NK.TRIM); txt('LAB', D.x + 14, D.y - 14, [200, 210, 220]); r(D.x + 9, D.y - 14, 3, 5, [200, 210, 220]); r(D.x + 8, D.y - 11, 5, 1, [200, 210, 220]);

    // ladder door up to the roof
    r(248, 324, 46, 106, NK.TRIM); r(251, 327, 40, 103, NK.WOOD_DK); for (let y = 336; y < 426; y += 12) r(257, y, 28, 3, NK.WOOD_HI); r(256, 330, 3, 98, NK.WOOD); r(283, 330, 3, 98, NK.WOOD);
    r(250, 308, 42, 12, NK.TRIM); txt('ROOF', 271 - tw('ROOF') / 2 + 3, 311, [200, 225, 255]); r(254, 311, 3, 5, [200, 225, 255]); r(253, 312, 5, 1, [200, 225, 255]);

    // the build status screen (content in drawBack)
    r(SCREEN.x - 4, SCREEN.y - 4, SCREEN.w + 8, SCREEN.h + 8, NK.RACK); r(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, NK.SCREEN); r(SCREEN.x + SCREEN.w / 2 - 3, SCREEN.y + SCREEN.h + 4, 6, 10, NK.RACK);
    // kitchenette: counter, espresso machine, fridge covered in notes
    r(60, 380, 140, 5, NK.DESK_HI); r(62, 385, 136, 45, NK.WOOD); for (let x = 66; x < 196; x += 33) { r(x, 389, 29, 36, NK.WOOD_DK); r(x + 1, 390, 27, 34, NK.WOOD); r(x + 23, 405, 3, 1, K.GOLD); }
    r(104, 346, 34, 34, [40, 44, 52]); r(106, 348, 30, 30, [150, 160, 168]); r(106, 348, 30, 2, K.WHITE); r(110, 354, 22, 8, [30, 34, 40]); r(114, 364, 4, 6, [60, 64, 72]); r(124, 364, 4, 6, [60, 64, 72]); r(112, 372, 18, 3, [40, 44, 52]);
    r(150, 368, 8, 12, K.WHITE); r(158, 371, 2, 5, K.WHITE); r(164, 370, 8, 10, [232, 106, 146]); r(172, 373, 2, 4, [232, 106, 146]);
    r(204, 296, 34, 134, [200, 206, 210]); r(206, 298, 30, 130, [232, 236, 238]); r(206, 346, 30, 2, [180, 186, 190]); r(230, 316, 2, 18, [150, 156, 160]); r(230, 356, 2, 26, [150, 156, 160]);
    ([[210, 304, [255, 240, 150]], [218, 318, [200, 240, 255]], [210, 360, [255, 210, 230]]] as [number, number, RGB][]).forEach(([x, y, c]) => { r(x, y, 10, 9, c); r(x + 4, y - 1, 2, 2, K.RED); });
    // the big window: night city in the rain (rain + lightning are animated)
    r(WIN.x - 6, WIN.y - 6, WIN.w + 12, WIN.h + 12, NK.WOOD_DK); r(WIN.x, WIN.y, WIN.w, WIN.h, NK.GLASS);
    for (let x = WIN.x; x < WIN.x + WIN.w; x += 18) { const hgt = 30 + Math.floor(h1(x * 0.7) * 80); r(x, WIN.y + WIN.h - hgt, 16, hgt, NK.CITY); for (let y = WIN.y + WIN.h - hgt + 5; y < WIN.y + WIN.h - 4; y += 7) if (h1(x + y * 3) > 0.55) r(x + 3 + ((y >> 1) % 2) * 6, y, 2, 3, h1(x * y) > 0.7 ? [255, 200, 120] : [140, 170, 220]); }
    r(WIN.x + WIN.w / 2 - 2, WIN.y, 4, WIN.h, NK.WOOD_DK); r(WIN.x, WIN.y + WIN.h / 2 - 2, WIN.w, 4, NK.WOOD_DK);
    r(WIN.x - 10, WIN.y + WIN.h + 4, WIN.w + 20, 6, NK.WOOD_HI); r(WIN.x - 10, WIN.y + WIN.h + 10, WIN.w + 20, 3, NK.WOOD_DK);
    // window sill: little plants and the radio
    for (const px of [WIN.x + 10, WIN.x + 34, WIN.x + 226]) { r(px, WIN.y + WIN.h - 6, 12, 10, [184, 102, 74]); for (let k = 0; k < 5; k++) r(px + 1 + k * 2, WIN.y + WIN.h - 12 - (k % 2) * 3, 2, 7, k % 2 ? [82, 176, 122] : [47, 138, 94]); }
    r(456, WIN.y + WIN.h - 10, 30, 14, [120, 60, 50]); r(458, WIN.y + WIN.h - 8, 14, 10, [60, 30, 26]); for (let y = WIN.y + WIN.h - 7; y < WIN.y + WIN.h + 2; y += 2) r(459, y, 12, 1, [90, 50, 40]); r(470, WIN.y + WIN.h - 18, 1, 8, [60, 64, 72]);
    // SHIP IT neon backing, kanban cork board
    r(612, 246, 156, 30, [20, 24, 34]);
    r(BOARD.x - 4, BOARD.y - 4, BOARD.w + 8, BOARD.h + 8, NK.WOOD_DK); r(BOARD.x, BOARD.y, BOARD.w, BOARD.h, NK.CORK);
    for (let i = 0; i < 60; i++) r(BOARD.x + Math.floor(h1(i + 500) * BOARD.w), BOARD.y + Math.floor(h1(i + 501) * BOARD.h), 1, 1, NK.CORK_DK);
    ['TODO', 'DOING', 'DONE'].forEach((s, i) => { const cx = BOARD.x + 30 + i * 60; txt(s, cx - tw(s) / 2, BOARD.y + 4, [60, 36, 20]); if (i) r(BOARD.x + i * 60, BOARD.y + 12, 1, BOARD.h - 16, NK.CORK_DK); });
    r(BOARD.x + 4, BOARD.y + 11, BOARD.w - 8, 1, NK.CORK_DK);
    // bookshelf
    r(800, 250, 64, 180, NK.WOOD_DK); r(802, 252, 60, 176, NK.WOOD);
    for (let s = 0; s < 5; s++) { const sy = 256 + s * 34; r(802, sy + 30, 60, 4, NK.WOOD_DK); let bx = 805; while (bx < 856) { const bw = 3 + Math.floor(h1(bx * 1.3 + s) * 4), bh = 16 + Math.floor(h1(bx + s * 7) * 12), bc = ([[46, 120, 84], [51, 87, 176], [208, 71, 58], [242, 194, 48], [123, 97, 255], [220, 220, 230]] as RGB[])[Math.floor(h1(bx * 2.9 + s * 3) * 6)]; if (bx + bw > 860) break; r(bx, sy + 30 - bh, bw, bh, bc); r(bx + bw - 1, sy + 30 - bh, 1, bh, shade(bc, 0.75)); bx += bw + 1; } }
    // server rack
    r(RACK.x, RACK.y, RACK.w, RACK.h, NK.RACK); r(RACK.x + 2, RACK.y + 2, RACK.w - 4, 2, NK.RACK_HI);
    for (let y = RACK.y + 8; y < RACK.y + RACK.h - 8; y += 14) { r(RACK.x + 4, y, RACK.w - 8, 11, [40, 45, 54]); r(RACK.x + 4, y, RACK.w - 8, 1, NK.RACK_HI); for (let x = RACK.x + 22; x < RACK.x + RACK.w - 8; x += 4) r(x, y + 4, 2, 3, [26, 30, 36]); }
  });
}

// ---------- animated set pieces ----------
let denRoom: Room | null = null;

function drawBack(a: number): void {
  const used = denRoom?.inUse, now = Date.now() / 1000, pomo = pomodoro(), flash = lightning(), b = DEN_INFO.build;
  const dep = DEN_INFO.deploy, du = dep ? now - dep.t0 : 99;
  // pendant lamps: warm pools of light
  for (const lx of [150, 430, 700, 900]) { r(lx, 0, 1, 212, [40, 46, 56]); r(lx - 8, 212, 17, 6, [50, 56, 66]); r(lx - 10, 218, 21, 3, [70, 76, 86]); lit(() => r(lx - 5, 221, 11, 2, [255, 226, 170])); for (let k = 0; k < 10; k++) G(lx - 4 - k * 5, 222 + k * 16, 9 + k * 10, 16, [255, 214, 150], 0.045); }
  // the window: rain streaks, drops on the glass, lightning
  const g = PX.ctx; g.save(); g.beginPath(); g.rect(WIN.x, WIN.y, WIN.w, WIN.h); g.clip();
  if (flash > 0) lit(() => alpha(flash * 0.8, () => r(WIN.x, WIN.y, WIN.w, WIN.h, [210, 225, 255])));
  alpha(0.55, () => { for (let k = 0; k < 80; k++) { const x = WIN.x + ((h1(k) * WIN.w + a * 30) % WIN.w), y = WIN.y + ((h1(k + 0.3) * WIN.h + a * (200 + h1(k + 2) * 80)) % WIN.h); line(x, y, x - 2, y + 6, NK.RAIN); } });
  for (let k = 0; k < 14; k++) { const x = WIN.x + Math.floor(h1(k + 40) * WIN.w), y = WIN.y + ((h1(k + 41) * WIN.h + a * (6 + h1(k) * 10)) % WIN.h); r(x, Math.floor(y), 1, 2, [180, 200, 230]); }
  lit(() => { for (let k = 0; k < 10; k++) if ((a * 0.3 + h1(k + 80)) % 1 < 0.7) r(WIN.x + Math.floor(h1(k + 81) * WIN.w), WIN.y + WIN.h - 10 - Math.floor(h1(k + 82) * 60), 2, 2, [255, 200, 120]); });
  g.restore();
  if (flash > 0) { for (let k = 0; k < 4; k++) Gd(WIN.x + WIN.w / 2, WIN.y + WIN.h / 2 + 30, 80 + k * 70, [200, 220, 255], 0.13 * flash); PX.flc = [200, 220, 255]; PX.fl = flash * 0.6; }
  // radio: dial glow while it plays
  const on = DEN_INFO.radio >= 0;
  lit(() => { r(474, WIN.y + WIN.h - 7, 10, 3, on ? [255, 190, 90] : [90, 60, 40]); if (on) r(474 + Math.floor(a * 3) % 9, WIN.y + WIN.h - 7, 1, 3, K.RED); });
  if (on) { Gd(479, WIN.y + WIN.h - 6, 8, [255, 190, 90], 0.3); lit(() => { const ph = (a * 0.5) % 1; alpha(1 - ph, () => { r(480 + Math.round(Math.sin(a * 2) * 4), WIN.y + WIN.h - 16 - Math.round(ph * 16), 2, 2, K.CYAN); r(481 + Math.round(Math.sin(a * 2) * 4), WIN.y + WIN.h - 21 - Math.round(ph * 16), 1, 5, K.CYAN); }); }); }
  // SHIP IT neon (flickers now and then)
  const nf = (a * 0.23) % 1 < 0.02;
  lit(() => txt('SHIP IT', 690 - tw('SHIP IT', 3) / 2, 250, nf ? [90, 30, 70] : K.MAG, 3));
  if (!nf) G(612, 242, 156, 36, K.MAG, 0.28);
  // status screen
  lit(() => {
    const X = SCREEN.x + 6, Y = SCREEN.y + 6;
    r(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, NK.SCREEN);
    if (du < 6) {
      const blink = Math.floor(a * 4) % 2;
      if (dep!.ok) { txt('SHIPPED!', SCREEN.x + SCREEN.w / 2 - tw('SHIPPED!', 3) / 2, Y + 18, blink ? [124, 242, 156] : K.WHITE, 3); txt('BY ' + dep!.by, SCREEN.x + SCREEN.w / 2 - tw('BY ' + dep!.by) / 2, Y + 50, K.GOLD); }
      else { txt('INCIDENT', SCREEN.x + SCREEN.w / 2 - tw('INCIDENT', 3) / 2, Y + 18, blink ? K.RED : [255, 200, 90], 3); txt('SEV 1  ALL HANDS', SCREEN.x + SCREEN.w / 2 - tw('SEV 1  ALL HANDS') / 2, Y + 50, K.WHITE); }
      return;
    }
    const fail = !b.ok;
    txt(fail ? 'BUILD FAILING' : 'BUILD PASSING', X, Y, fail ? (Math.floor(a * 3) % 2 ? K.RED : [120, 30, 30]) : [124, 242, 156], 2);
    txt('COMMITS ' + b.n, X, Y + 18, [200, 210, 230]); txt('SHIPPED ' + b.dep, X + 84, Y + 18, [200, 210, 230]);
    txt(pomo.focus ? 'FOCUS' : 'BREAK', X, Y + 34, pomo.focus ? K.GOLD : K.CYAN, 2); txt(mmss(pomo.left), X + 60, Y + 34, K.WHITE, 2);
    const last = b.by ? b.by + ': ' + b.msg : 'NO COMMITS YET';
    const s = last.toUpperCase(), wpx = tw(s), off = wpx > SCREEN.w - 12 ? Math.floor((a * 20) % (wpx + 40)) : 0;
    const gg = PX.ctx; gg.save(); gg.beginPath(); gg.rect(X, Y + 54, SCREEN.w - 12, 8); gg.clip(); txt(s, X - off, Y + 56, [150, 160, 180]); if (off) txt(s, X - off + wpx + 40, Y + 56, [150, 160, 180]); gg.restore();
  });
  G(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, !b.ok || (du < 6 && !dep!.ok) ? [255, 80, 80] : [120, 200, 255], 0.14);
  // kanban notes
  const cols: KanbanNote[][] = [[], [], []]; for (const n of DEN_INFO.notes) cols[n.c].push(n);
  const NCOL: RGB[] = [[255, 238, 140], [180, 225, 255], [180, 240, 180]];
  cols.forEach((list, c) => list.slice(0, 7).forEach((n, i) => { const x = BOARD.x + 4 + c * 60, y = BOARD.y + 16 + i * 12; r(x + 1, y + 1, 52, 10, NK.CORK_DK); r(x, y, 52, 10, NCOL[c]); r(x + 25, y - 1, 2, 2, K.RED); txt(n.t.slice(0, 12), x + 2, y + 3, [50, 40, 30]); }));
  // server rack: LEDs, red when the build is broken, sparks while someone fixes it
  lit(() => { for (let y = RACK.y + 12, i = 0; y < RACK.y + RACK.h - 8; y += 14, i++) for (let j = 0; j < 3; j++) { const blink = (a * (2 + j) + h1(i * 3 + j)) % 1 < 0.5; r(RACK.x + 7 + j * 4, y, 2, 2, !b.ok ? (blink ? K.RED : [90, 20, 20]) : blink ? [124, 242, 156] : [255, 190, 90]); } });
  Gd(RACK.x + RACK.w / 2, RACK.y + RACK.h / 2, 40, !b.ok ? [255, 60, 60] : [120, 255, 170], !b.ok ? 0.12 + 0.1 * Math.sin(a * 6) : 0.06);
  if (used?.has(9)) lit(() => { for (let k = 0; k < 5; k++) { const ph = (a * 3 + k * 0.2) % 1; r(RACK.x + 30 + Math.round((h1(k + Math.floor(a * 3)) - 0.5) * 30 * ph), RACK.y + 90 - Math.round(ph * 20) + Math.round(ph * ph * 30), 1, 1, ph < 0.5 ? K.GOLD : [255, 140, 60]); } });
  // deploy aftermath: confetti everywhere, or an alarm beacon and smoke
  if (du < 6) {
    if (dep!.ok) lit(() => { for (let k = 0; k < 90; k++) { const x = (h1(k) * W + Math.sin(a * 2 + k) * 10) % W, y = 150 + ((h1(k + 0.5) * 300 + du * (60 + h1(k + 1) * 60)) % 480); r(Math.round(x), Math.round(y), 2, k % 3 ? 1 : 2, CONFETTI[k % CONFETTI.length]); } });
    else {
      lit(() => r(RACK.x + 24, RACK.y - 8, 12, 8, Math.floor(a * 6) % 2 ? K.RED : [120, 20, 20]));
      // a rotating red beacon washes the whole room
      const sw = Math.sin(a * 8); G(RACK.x - 260 + sw * 260, 150, 300, 500, [255, 40, 40], 0.18); G(0, 150, W, 530, [255, 30, 30], 0.08 + 0.12 * Math.max(0, sw));
      lit(() => alpha(0.06 + 0.06 * Math.max(0, sw), () => r(0, 150, W, H - 150, [255, 40, 40])));
      for (let k = 0; k < 6; k++) puff(RACK.x + 14 + k * 7, RACK.y + 20, (du * 1.3 + k * 0.3) % 1.6, 1.6, 9, [90, 90, 100], 0.6);
    }
  }
}

// ---------- props ----------
function desk(i: number): Prop {
  const [dx, dy] = DEN_DESKS[i];
  return {
    y: dy,
    draw(a: number) {
      const inUse = !!denRoom?.inUse.has(i);
      r(dx - 30, dy - 22, 60, 4, NK.DESK_HI); r(dx - 30, dy - 22, 60, 1, [240, 200, 150]); r(dx - 30, dy - 18, 60, 14, NK.DESK); r(dx - 30, dy - 18, 60, 1, NK.DESK_DK);
      r(dx - 12, dy - 14, 24, 1, NK.DESK_DK); r(dx - 1, dy - 12, 2, 1, NK.WOOD_DK); r(dx - 29, dy - 4, 3, 4, NK.WOOD_DK); r(dx + 26, dy - 4, 3, 4, NK.WOOD_DK);
      // laptop lid (its back faces us) with a glowing sticker
      r(dx - 9, dy - 32, 18, 10, NK.LAPTOP); r(dx - 9, dy - 32, 18, 1, NK.LAPTOP_HI); r(dx - 11, dy - 23, 22, 1, NK.LAPTOP_HI);
      lit(() => { const c: RGB = inUse ? K.CYAN : [80, 90, 110]; r(dx - 3, dy - 29, 1, 3, c); r(dx - 4, dy - 28, 1, 1, c); r(dx + 2, dy - 29, 1, 3, c); r(dx + 3, dy - 28, 1, 1, c); r(dx, dy - 30, 1, 5, c); });
      if (inUse) { G(dx - 14, dy - 70, 28, 34, [120, 220, 255], 0.22); lit(() => { for (let k = 0; k < 3; k++) { const ph = (a * 1.7 + k / 3) % 1; alpha(1 - ph, () => txt('{};<>/'[Math.floor(h1(k + Math.floor(a * 1.7)) * 6)], dx - 8 + k * 7, dy - 40 - Math.round(ph * 12), K.CYAN)); } }); }
      // lamp on the right corner
      line(dx + 22, dy - 22, dx + 18, dy - 34, [60, 64, 72]); line(dx + 18, dy - 34, dx + 24, dy - 40, [60, 64, 72]); r(dx + 21, dy - 43, 9, 4, [60, 64, 72]);
      lit(() => r(dx + 23, dy - 39, 5, 1, [255, 226, 170])); Gd(dx + 25, dy - 36, 10, [255, 214, 150], 0.35);
      // the rubber duck lives on desk 1; the others get a mug or a plant
      if (i === 1) {
        const sq = a - DEN_INFO.duckT < 0.5 ? 1 : 0, x = dx - 24, y = dy - 28 - sq;
        r(x - 1, y - 1, 9, 8, [40, 30, 10]); r(x, y + 2, 8, 4, NK.DUCK); r(x + 4, y - 1, 4, 4, NK.DUCK); r(x + 1, y + 5, 6, 1, NK.DUCK_DK); r(x + 8, y + 1, 2, 1, NK.BEAK); r(x + 6, y, 1, 1, K.EYE); r(x + 1, y + 2, 3, 1, [255, 236, 140]);
      } else if (i === 2) { r(dx - 24, dy - 30, 8, 8, [184, 102, 74]); for (let k = 0; k < 4; k++) r(dx - 24 + k * 2, dy - 36 + (k % 2) * 2, 2, 6, [82, 176, 122]); }
      else { r(dx - 24, dy - 28, 6, 6, [90, 209, 255]); r(dx - 18, dy - 27, 2, 3, [90, 209, 255]); r(dx - 23, dy - 28, 4, 1, [90, 55, 35]); }
    },
  };
}
const chair = (i: number): Prop => {
  const [dx, dy] = DEN_DESKS[i];
  return { y: dy - 8, draw() { r(dx - 11, dy - 52, 22, 30, NK.CHAIR); r(dx - 11, dy - 52, 22, 2, NK.CHAIR_HI); r(dx - 12, dy - 22, 24, 4, NK.CHAIR); r(dx - 1, dy - 18, 2, 8, [30, 34, 40]); r(dx - 8, dy - 10, 16, 2, [30, 34, 40]); } };
};
const beanbag = (x: number, y: number, c: RGB): Prop => ({
  y,
  draw() { oval(x, y - 7, 15, 8, shade(c, 0.7)); oval(x, y - 8, 14, 7, c); oval(x - 3, y - 11, 7, 3, M(c, [255, 255, 255], 0.3)); r(x - 14, y - 2, 28, 2, shade(c, 0.6)); },
});
const pedestal: Prop = {
  y: PEDESTAL.y,
  draw(a: number) {
    const { x, y } = PEDESTAL, dep = DEN_INFO.deploy, du = dep ? Date.now() / 1000 - dep.t0 : 99, open = du < 2 || !!denRoom?.inUse.has(10);
    r(x - 7, y - 26, 14, 26, [60, 64, 72]); r(x - 7, y - 26, 14, 2, [100, 106, 116]); r(x - 9, y - 2, 18, 2, [40, 44, 52]);
    txt('DEPLOY', x - tw('DEPLOY') / 2, y - 18, [255, 214, 90]);
    r(x - 5, y - 31, 10, 5, [40, 44, 52]); lit(() => r(x - 4, y - 32 + (du < 0.4 ? 1 : 0), 8, 3, [230, 50, 60]));
    Gd(x, y - 30, 6, [255, 60, 60], 0.25 + 0.15 * Math.sin(a * 3));
    if (open) { r(x - 7, y - 44, 1, 12, [200, 230, 255]); r(x - 7, y - 44, 12, 1, [200, 230, 255]); }
    else { alpha(0.5, () => { r(x - 7, y - 38, 14, 7, [200, 230, 255]); }); r(x - 7, y - 38, 14, 1, K.WHITE); }
  },
};
const floorLamp: Prop = {
  y: 470,
  draw() { r(858, 470 - 70, 2, 68, [60, 64, 72]); r(850, 468, 18, 2, [60, 64, 72]); r(850, 390, 18, 12, [240, 220, 180]); r(850, 390, 18, 1, K.WHITE); lit(() => r(852, 401, 14, 1, [255, 230, 180])); Gd(859, 398, 22, [255, 214, 150], 0.3); G(830, 400, 60, 80, [255, 214, 150], 0.05); },
};
const plantPot = (x: number, y: number): Prop => ({
  y,
  draw(a: number) { r(x - 7, y - 12, 14, 12, [184, 102, 74]); r(x - 8, y - 12, 16, 3, [150, 80, 58]); for (let k = 0; k < 7; k++) { const an = -Math.PI / 2 + (k / 6 - 0.5) * 2 + Math.sin(a + k) * 0.04; for (let j = 0; j < 16; j++) r(Math.round(x + Math.cos(an) * j) - 1, Math.round(y - 13 + Math.sin(an) * j + (j * j) / 40), 2, 2, j > 9 ? [82, 176, 122] : [47, 138, 94]); } },
});

// ---------- spots, talkers ----------
const deskSpot = ([x, y]: [number, number]): Spot => ({ kind: 'desk', x, y: y - 7, sx: x, sy: y - 16, lift: 12, label: 'CODE', area: { x0: x - 30, y0: y - 44, x1: x + 30, y1: y } });
const beanSpot = ([x, y]: [number, number]): Spot => ({ kind: 'sit', x, y: y + 1, sx: x, sy: y + 12, lift: 3, label: 'SIT', area: { x0: x - 16, y0: y - 16, x1: x + 16, y1: y } });
export const DEN_SPOTS: Spot[] = [
  ...DEN_DESKS.map(deskSpot),
  ...BEANBAGS.map(beanSpot),
  { kind: 'coffee', x: 120, y: 446, sx: 120, sy: 446, lift: 0, label: 'ESPRESSO', area: { x0: 100, y0: 342, x1: 142, y1: 384 } },
  { kind: 'juke', x: 470, y: 446, sx: 470, sy: 446, lift: 0, label: 'RADIO', area: { x0: 450, y0: WIN.y + WIN.h - 24, x1: 492, y1: WIN.y + WIN.h + 6 } },
  { kind: 'kanban', x: 690, y: 446, sx: 690, sy: 446, lift: 0, label: 'KANBAN', area: { x0: BOARD.x, y0: BOARD.y, x1: BOARD.x + BOARD.w, y1: BOARD.y + BOARD.h } },
  { kind: 'rack', x: 920, y: 446, sx: 920, sy: 446, lift: 0, label: 'FIX', area: { x0: RACK.x, y0: RACK.y, x1: RACK.x + RACK.w, y1: RACK.y + RACK.h } },
  { kind: 'deploy', x: PEDESTAL.x, y: PEDESTAL.y + 13, sx: PEDESTAL.x, sy: PEDESTAL.y + 13, lift: 0, label: 'DEPLOY', area: { x0: PEDESTAL.x - 12, y0: PEDESTAL.y - 46, x1: PEDESTAL.x + 12, y1: PEDESTAL.y } },
];
const DUCK: Talker = {
  id: 'den-duck', name: 'DUCK', x: 450, y: 468, sx: 450, sy: 512,
  lines: ['have you tried explaining it to me?', 'quack. (it is always DNS)', 'did you check the semicolon?', 'works on my machine. i am a duck.', 'read the error message. slowly.', 'have you tried turning it off and on again?', 'ship it? ship it.', 'that is not a bug, it is a feature', 'quack?', 'rubber duck says: add a test'],
};

export function makeDen(): Room {
  const room: Room = {
    id: 'den', title: 'THE DEV DEN', sub: 'UPSTAIRS',
    w: W, h: H,
    floor: { x0: 14, y0: 440, x1: W - 14, y1: 612 },
    blockers: [
      ...DEN_DESKS.map(([x, y]) => ({ x0: x - 30, y0: y - 6, x1: x + 30, y1: y + 2 })),
      ...BEANBAGS.map(([x, y]) => ({ x0: x - 12, y0: y - 6, x1: x + 12, y1: y + 2 })),
      { x0: PEDESTAL.x - 8, y0: PEDESTAL.y - 6, x1: PEDESTAL.x + 8, y1: PEDESTAL.y + 2 },
      { x0: 850, y0: 464, x1: 868, y1: 472 }, // floor lamp
      { x0: 240, y0: 598, x1: 260, y1: 608 }, // plant
    ],
    doors: [
      { trigger: { x0: 10, y0: 440, x1: 46, y1: 448 }, to: 'lab', arrive: { x: 842, y: 458 }, label: 'THE LAB', area: { x0: 4, y0: 306, x1: 52, y1: 446 } },
      { trigger: { x0: 254, y0: 440, x1: 288, y1: 448 }, to: 'roof', arrive: { x: 52, y: 474 }, label: 'ROOF', area: { x0: 246, y0: 304, x1: 294, y1: 446 } },
    ],
    spots: DEN_SPOTS, inUse: new Map(),
    talkers: [DUCK],
    music: { x: 470, tracks: LOFI, current: () => ({ n: DEN_INFO.radio, t0: DEN_INFO.radioT0 }) },
    onState(s: StateMsg) {
      if (s.k === 'juke') { DEN_INFO.radio = s.v.n; DEN_INFO.radioT0 = s.v.t0; }
      else if (s.k === 'build') DEN_INFO.build = s.v;
      else if (s.k === 'deploy') DEN_INFO.deploy = s.v;
      else if (s.k === 'notes') DEN_INFO.notes = s.v;
    },
    spawn: { x: 60, y: 470 },
    dim: 0.12,
    dimNow: () => (pomodoro().focus ? 0.14 : 0.06),
    fillTop: 'rgb(28,36,48)', fillLow: 'rgb(94,65,46)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [...DEN_DESKS.map((_, i) => chair(i)), ...DEN_DESKS.map((_, i) => desk(i)), ...BEANBAGS.map(([x, y], i) => beanbag(x, y, i ? NK.BEAN2 : NK.BEAN1)), pedestal, floorLamp, plantPot(250, 604)],
  };
  denRoom = room;
  return room;
}
