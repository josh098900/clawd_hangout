// THE ARCADE — down the neon stairs on the Square. A glowing basement of cabinets on a
// cosmic carpet: the CLAW machine (spend 3 tokens, the server picks a capsule prize), a
// 2-player PONG table everyone can watch live, a SLOP INVADERS cabinet with its own high
// score, the PRIZE COUNTER (your collection) run by PIXEL, and an air hockey table that
// nobody ever finishes a game on.

import { K, CONFETTI, type RGB } from '../engine/palette';
import { PX, mk, r, line, disc, oval, txt, tw, lit, G, Gd, withCtx, M, shade, alpha } from '../engine/pixel';
import { h1 } from '../engine/math';
import { CHIPTUNES } from '../audio/music';
import { itemName } from '../entities/critter';
import type { PongMsg, StateMsg } from '../net/transport';
import type { Room, Prop, Spot } from './room';

const W = 1100, H = 612, LF = 466;
const STAIRS = { x: 10, y: 360, w: 56, h: 106 };
export const CLAW_X = 250, PONG_X = 468, INV_X = 640, COUNTER = { x0: 850, x1: 1070 };
/** What everyone in the room sees: the last claw win, the Pong champ, the live Pong table, the radio. */
export const ARCADE_INFO = {
  juke: 0, jukeT0: 0,
  hi: null as { name: string; score: number } | null,
  claw: null as { name: string; item: string } | null,
  champ: null as { name: string; wins: number } | null,
  /** Latest Pong messages per side, and when they arrived (s). */
  pong: [null, null] as [(PongMsg & { t: number }) | null, (PongMsg & { t: number }) | null],
  /** Someone's playing the claw right now (local animation for the cabinet). */
  clawT: -9,
};
export function pongSeen(p: PongMsg): void { ARCADE_INFO.pong[p.s] = { ...p, t: performance.now() / 1000 }; }

// ---------- the set ----------
function build(this: Room): void {
  withCtx(this.bg.getContext('2d')!, () => {
    PX.dim = 0; PX.fl = 0; PX.emit = false;
    // ceiling with a strip of neon tubes, walls in deep violet with a zigzag band
    r(0, 0, W, 214, [14, 10, 26]); for (let x = 0; x < W; x += 80) r(x + 10, 206, 60, 3, [40, 30, 60]);
    r(0, 214, W, LF - 214, [30, 18, 52]);
    for (let y = 226; y < 330; y += 24) for (let x = (y / 24) % 2 ? 12 : 0; x < W; x += 24) r(x, y, 2, 2, [44, 30, 70]);
    r(0, 336, W, 14, [22, 12, 40]); for (let x = 0; x < W; x += 12) { r(x, 340 + ((x / 12) % 2 ? 0 : 4), 6, 2, [60, 40, 100]); }
    r(0, 350, W, LF - 350, [24, 14, 42]); r(0, LF - 4, W, 4, [16, 10, 30]);
    // stairs back up to the Square
    const S = STAIRS;
    r(S.x - 4, S.y - 4, S.w + 8, S.h + 4, [60, 40, 90]); r(S.x, S.y, S.w, S.h, [16, 12, 26]);
    for (let k = 0; k < 7; k++) { const y = S.y + S.h - 12 - k * 14; r(S.x + 4 + k * 2, y, S.w - 8 - k * 4, 4, [70, 60, 96]); r(S.x + 4 + k * 2, y, S.w - 8 - k * 4, 1, [110, 96, 140]); }
    line(S.x + 2, S.y + S.h, S.x + 16, S.y + 8, [140, 140, 160]); line(S.x + S.w - 2, S.y + S.h, S.x + S.w - 16, S.y + 8, [140, 140, 160]);
    // claw machine body (glass + prizes are animated in drawBack)
    const cx = CLAW_X;
    r(cx - 46, 300, 92, 170, [200, 40, 90]); r(cx - 46, 300, 92, 2, [255, 110, 160]); r(cx - 46, 300, 2, 170, [240, 80, 130]); r(cx + 44, 300, 2, 170, [140, 20, 60]);
    r(cx - 40, 318, 80, 92, [20, 16, 34]);
    r(cx - 44, 412, 88, 20, [60, 50, 80]); r(cx - 44, 412, 88, 2, [100, 90, 120]); disc(cx - 20, 422, 4, [30, 30, 40]); r(cx - 21, 408, 2, 12, [180, 180, 190]); disc(cx - 20, 407, 3, K.RED);
    oval(cx + 14, 422, 6, 3, K.GOLD); oval(cx + 14, 421, 5, 2, [255, 240, 170]);
    r(cx - 20, 440, 40, 22, [30, 20, 40]);
    // pong table cabinet: a wide two-player upright
    const px = PONG_X;
    r(px - 60, 318, 120, 152, [40, 70, 160]); r(px - 60, 318, 120, 2, [100, 140, 230]); r(px - 60, 318, 2, 152, [80, 110, 200]); r(px + 58, 318, 2, 152, [24, 40, 100]);
    r(px - 60, 300, 120, 20, [24, 40, 100]);
    r(px - 50, 330, 100, 64, [10, 12, 18]);
    r(px - 58, 400, 116, 18, [30, 50, 120]); r(px - 58, 400, 116, 2, [80, 110, 200]);
    for (const sx of [px - 34, px + 34]) { r(sx - 1, 396, 3, 10, [180, 180, 190]); disc(sx, 395, 3, sx < px ? K.CYAN : K.MAG); }
    r(px - 54, 420, 108, 44, [34, 56, 130]); txt('P1', px - 42, 440, K.CYAN); txt('P2', px + 32, 440, K.MAG);
    // SLOP INVADERS cabinet
    const ix = INV_X;
    r(ix - 26, 300, 52, 170, [30, 110, 70]); r(ix - 26, 300, 52, 2, [80, 180, 120]); r(ix - 26, 300, 2, 170, [60, 150, 100]); r(ix + 24, 300, 2, 170, [16, 70, 40]);
    r(ix - 26, 300, 52, 20, [16, 70, 40]); r(ix - 20, 330, 40, 50, [8, 12, 10]);
    r(ix - 24, 386, 48, 16, [20, 80, 50]); r(ix - 6, 382, 2, 8, [180, 180, 190]); disc(ix - 5, 381, 3, K.GOLD); disc(ix + 10, 392, 3, K.RED);
    // two decorative cabinets (one is OUT OF ORDER, obviously)
    for (const [dx, c] of [[740, [110, 60, 180]], [808, [180, 110, 40]]] as [number, RGB][]) {
      r(dx - 26, 310, 52, 160, c); r(dx - 26, 310, 52, 2, M(c, [255, 255, 255], 0.35)); r(dx + 24, 310, 2, 160, shade(c, 0.6)); r(dx - 20, 336, 40, 44, [8, 10, 14]);
      r(dx - 24, 386, 48, 14, shade(c, 0.8)); disc(dx - 8, 392, 3, K.CYAN); disc(dx + 8, 392, 3, K.MAG);
    }
    r(794, 346, 30, 16, [240, 236, 220]); txt('OUT OF', 809 - tw('OUT OF') / 2, 348, K.RED); txt('ORDER', 809 - tw('ORDER') / 2, 355, K.RED);
    // prize counter: shelves of plushies behind a glass counter
    const C = COUNTER;
    r(C.x0, 250, C.x1 - C.x0, 100, [40, 26, 60]); for (const y of [280, 318, 350]) r(C.x0, y, C.x1 - C.x0, 4, [120, 80, 50]);
    for (let k = 0; k < 11; k++) { const x = C.x0 + 12 + k * 19, y = k % 2 ? 314 : 276, c = CONFETTI[k % CONFETTI.length]; oval(x, y - 6, 7, 6, c); oval(x, y - 7, 5, 4, M(c, [255, 255, 255], 0.3)); r(x - 3, y - 9, 2, 2, K.EYE); r(x + 2, y - 9, 2, 2, K.EYE); if (k % 3 === 0) { r(x - 1, y - 16, 2, 4, shade(c, 0.6)); disc(x, y - 17, 2, M(c, [255, 255, 255], 0.5)); } }
    oval(C.x0 + 180, 344, 16, 12, [124, 242, 156]); oval(C.x0 + 180, 342, 12, 8, [170, 255, 190]); r(C.x0 + 173, 336, 3, 3, K.EYE); r(C.x0 + 184, 336, 3, 3, K.EYE); r(C.x0 + 192, 332, 6, 4, [124, 242, 156]); // big dragon plush
    r(C.x0, 400, C.x1 - C.x0, 70, [70, 44, 30]); r(C.x0, 400, C.x1 - C.x0, 3, [140, 96, 60]);
    r(C.x0 + 8, 408, C.x1 - C.x0 - 16, 40, [30, 40, 60]); r(C.x0 + 8, 408, C.x1 - C.x0 - 16, 1, [120, 150, 200]);
    // carpet: cosmic arcade carpet, the one every arcade had
    r(0, LF, W, H - LF, [22, 14, 48]);
    for (let i = 0; i < 260; i++) {
      const x = Math.floor(h1(i * 3.7) * W), y = LF + 4 + Math.floor(h1(i * 5.3 + 1) * (H - LF - 8)), c = [K.CYAN, K.MAG, K.GOLD, [124, 242, 156]][i % 4] as RGB, cc = shade(c, 0.55), k = i % 5;
      if (k === 0) { r(x, y, 5, 1, cc); r(x + 5, y + 1, 4, 1, cc); r(x + 9, y, 3, 1, cc); }
      else if (k === 1) { r(x, y, 1, 1, cc); r(x - 1, y + 1, 3, 1, cc); r(x, y + 2, 1, 1, cc); }
      else if (k === 2) { r(x, y, 4, 1, cc); r(x + 1, y + 1, 2, 1, cc); }
      else if (k === 3) r(x, y, 2, 2, shade(c, 0.4));
      else { r(x, y, 1, 3, cc); r(x + 1, y + 1, 2, 1, cc); }
    }
  });
}

/** Capsule colours for the claw's prize pile (by rarity look, not by what's inside). */
const CAPS: RGB[] = [[255, 95, 170], [90, 209, 255], [255, 214, 90], [124, 242, 156], [180, 130, 255], [255, 140, 90]];

// ---------- animated set pieces ----------
function drawBack(a: number): void {
  const now = performance.now() / 1000;
  // ceiling neon tubes
  lit(() => { for (let x = 0; x < W; x += 80) r(x + 10, 206, 60, 3, CONFETTI[(x / 80 + Math.floor(a * 0.5)) % CONFETTI.length]); });
  G(0, 198, W, 30, [200, 120, 255], 0.08);
  // ARCADE sign over the wall, chasing letters
  const sign = 'THE ARCADE';
  lit(() => { let x = 550 - tw(sign, 3) / 2; for (let i = 0; i < sign.length; i++) { const ch = sign[i]; txt(ch, x, 276, (Math.floor(a * 4) + i) % 6 === 0 ? K.WHITE : CONFETTI[i % CONFETTI.length], 3); x += tw(ch, 3) + 3; } });
  for (let k = 0; k < 6; k++) Gd(420 + k * 52, 283, 26, [255, 120, 220], 0.16);
  // stairs sign
  lit(() => txt('SQUARE', STAIRS.x + STAIRS.w / 2 - tw('SQUARE') / 2, STAIRS.y - 14, [124, 242, 156])); G(STAIRS.x, STAIRS.y - 16, STAIRS.w, 10, [124, 242, 156], 0.3);
  // --- claw machine: marquee, glass, capsule pile, the claw
  const cx = CLAW_X, busy = now - ARCADE_INFO.clawT < 4.5;
  lit(() => { txt('CLAW', cx - tw('CLAW', 2) / 2, 304, (a % 1) < 0.5 ? K.WHITE : [255, 214, 90], 2); for (let i = 0; i < 12; i++) r(cx - 44 + i * 8, 316, 3, 2, (i + Math.floor(a * 6)) % 3 ? [120, 40, 70] : K.GOLD); });
  G(cx - 46, 298, 92, 22, [255, 120, 180], 0.25);
  for (let i = 0; i < 22; i++) { const x = cx - 34 + (i % 8) * 9 + (Math.floor(i / 8) % 2) * 4, y = 402 - Math.floor(i / 8) * 7, c = CAPS[i % CAPS.length]; disc(x, y, 4, c); r(x - 3, y, 7, 1, K.WHITE); r(x - 2, y - 3, 2, 1, M(c, [255, 255, 255], 0.6)); }
  const clawX = busy ? cx + Math.sin((now - ARCADE_INFO.clawT) * 2.4) * 26 : cx + Math.sin(a * 0.6) * 24;
  const drop = busy ? Math.max(0, Math.sin(Math.min(Math.PI, (now - ARCADE_INFO.clawT - 1.6) * 1.2))) * 50 : 0;
  r(cx - 38, 322, 76, 3, [140, 140, 160]); r(Math.round(clawX) - 4, 322, 8, 5, [180, 180, 190]); line(Math.round(clawX), 327, Math.round(clawX), 334 + drop, [200, 200, 210]);
  const cy = Math.round(334 + drop), op = drop > 40 ? 1 : 3;
  r(Math.round(clawX) - 4, cy, 9, 3, [210, 210, 220]); r(Math.round(clawX) - 4 - op, cy + 3, 2, 6, [210, 210, 220]); r(Math.round(clawX) + 3 + op, cy + 3, 2, 6, [210, 210, 220]);
  alpha(0.07, () => r(cx - 40, 318, 80, 92, [150, 200, 255])); lit(() => { r(cx - 38, 320, 2, 40, [220, 240, 255]); r(cx - 34, 320, 1, 20, [220, 240, 255]); });
  Gd(cx, 360, 40, [255, 120, 200], 0.12);
  const lw = ARCADE_INFO.claw;
  // LED ticker on the front: who won what last
  const tick = (lw ? lw.name + ' WON ' + itemName(lw.item) + ' +++ ' : '') + '3 TOKENS A GO +++ ', off = Math.floor(a * 4) % tick.length, shown = (tick + tick).slice(off, off + 8);
  r(cx - 18, 442, 36, 18, [16, 8, 20]); lit(() => txt(shown, cx - 16, 449, [255, 214, 90]));
  // --- pong: the live table (or attract mode), score and champ
  const px = PONG_X, [L, R] = ARCADE_INFO.pong, live = L && now - L.t < 2 && L.ph !== undefined;
  lit(() => {
    r(px - 50, 330, 100, 64, [6, 8, 14]); for (let y = 332; y < 392; y += 6) r(px - 1, y, 2, 3, [60, 70, 90]);
    let bx: number, by: number, pl: number, pr: number, sc: [number, number];
    if (live && L) {
      const b = L.b ?? [0.5, 0.5, 0, 0], dt = Math.min(0.2, now - L.t);
      bx = Math.max(0, Math.min(1, b[0] + b[2] * dt)); by = Math.max(0, Math.min(1, b[1] + b[3] * dt)); pl = L.p; pr = R && now - R.t < 2 ? R.p : 0.5; sc = L.sc ?? [0, 0];
    } else { const u = (a * 0.35) % 2, t = u < 1 ? u : 2 - u; bx = t; by = 0.5 + Math.sin(a * 1.7) * 0.4; pl = by * 0.8 + 0.1; pr = 0.5 + Math.sin(a * 1.7 - 0.6) * 0.35; sc = [0, 0]; }
    const X = (u: number) => Math.round(px - 46 + u * 92), Y = (u: number) => Math.round(334 + u * 56);
    r(px - 47, Y(pl) - 7, 2, 14, K.CYAN); r(px + 45, Y(pr) - 7, 2, 14, K.MAG); r(X(bx) - 1, Y(by) - 1, 3, 3, K.WHITE);
    txt(String(sc[0]), px - 16, 336, K.CYAN); txt(String(sc[1]), px + 12, 336, K.MAG);
    txt(live ? 'LIVE!' : 'PONG', px - tw(live ? 'LIVE!' : 'PONG', 2) / 2, 303, live && (a % 0.6) < 0.3 ? K.GOLD : K.WHITE, 2);
  });
  Gd(px, 362, 50, [120, 170, 255], 0.14);
  const ch = ARCADE_INFO.champ;
  lit(() => txt(ch ? 'CHAMP: ' + ch.name + ' x' + ch.wins : 'NO CHAMP YET', px - tw(ch ? 'CHAMP: ' + ch.name + ' x' + ch.wins : 'NO CHAMP YET') / 2, 428, K.GOLD));
  // --- slop invaders attract screen + high score
  const ix = INV_X;
  lit(() => {
    txt('SLOP', ix - tw('SLOP', 2) / 2, 304, [124, 242, 156], 2);
    for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) { const x = ix - 15 + k * 9 + Math.round(Math.sin(a * 1.5) * 3), y = 336 + row * 8; r(x, y, 5, 3, row === 0 ? K.MAG : row === 1 ? [124, 242, 156] : K.GOLD); if ((a * 2 + k) % 1 < 0.5) r(x + 1, y + 3, 1, 1, K.WHITE); }
    r(ix - 2 + Math.round(Math.sin(a * 2.2) * 12), 372, 5, 3, K.CYAN);
    const hi = ARCADE_INFO.hi; const s = hi ? 'HI ' + hi.score : 'HI ----'; txt(s, ix - tw(s) / 2, 410, K.GOLD);
  });
  Gd(ix, 356, 30, [124, 242, 156], 0.14);
  // decorative attract screens
  lit(() => {
    for (let y = 0; y < 44; y += 2) r(720, 336 + y, 40, 1, CONFETTI[(Math.floor(y / 4) + Math.floor(a * 8)) % CONFETTI.length].map((v) => v * 0.6) as RGB);
    if ((a * 1.3) % 1 < 0.1) r(788, 336, 40, 44, [30, 30, 40]);
  });
  // prize counter: glass case lit from inside, the collection on show
  const C = COUNTER;
  lit(() => { for (let k = 0; k < 9; k++) { const x = C.x0 + 22 + k * 22, c = CAPS[k % CAPS.length]; disc(x, 432 + (k % 2) * 4, 5, c); r(x - 4, 432 + (k % 2) * 4, 9, 1, K.WHITE); } txt('PRIZES', (C.x0 + C.x1) / 2 - tw('PRIZES', 2) / 2, 256, K.GOLD, 2); });
  G(C.x0 + 8, 408, C.x1 - C.x0 - 16, 40, [180, 220, 255], 0.1); G(C.x0, 250, C.x1 - C.x0, 20, [255, 214, 90], 0.12);
}

// ---------- props ----------
/** Air hockey: the puck never stops. */
const airHockey: Prop = {
  y: 574,
  draw(a: number) {
    const x = 560, y = 574;
    r(x - 60, y - 34, 120, 30, [240, 240, 250]); r(x - 60, y - 34, 120, 2, [255, 255, 255]); r(x - 62, y - 36, 124, 3, [60, 110, 200]); r(x - 62, y - 6, 124, 4, [40, 80, 160]);
    r(x - 1, y - 34, 2, 30, [220, 60, 80]); oval(x, y - 19, 8, 6, [220, 60, 80]); oval(x, y - 19, 7, 5, [240, 240, 250]);
    for (const lx of [x - 56, x + 52]) r(lx, y - 4, 4, 4, [30, 40, 60]);
    const u = (a * 0.8) % 2, t = u < 1 ? u : 2 - u, pxx = Math.round(x - 52 + t * 104), pyy = Math.round(y - 20 + Math.sin(a * 2.3) * 11);
    oval(pxx, pyy, 3, 2, [30, 30, 40]);
    for (const [mx, c] of [[x - 48, K.CYAN], [x + 48, K.MAG]] as [number, RGB][]) { const my = Math.round(y - 20 + Math.sin(a * 2.3 - (mx < x ? 0.3 : -0.3)) * 9); oval(mx, my, 4, 3, c); oval(mx, my - 1, 2, 1, M(c, [255, 255, 255], 0.5)); }
  },
};
const neonPlant: Prop = { y: 480, draw() { const x = 1086, y = 480; r(x - 7, y - 12, 14, 12, [60, 40, 80]); for (let k = 0; k < 5; k++) line(x, y - 12, x - 8 + k * 4, y - 30 - (k % 2) * 6, [80, 200, 120]); } };

// ---------- spots (index = network id: append only) ----------
export const ARCADE_SPOTS: Spot[] = [
  { kind: 'claw', x: CLAW_X, y: 480, sx: CLAW_X, sy: 490, lift: 0, label: 'CLAW', area: { x0: CLAW_X - 46, y0: 300, x1: CLAW_X + 46, y1: 470 } },
  { kind: 'pong', x: PONG_X - 34, y: 480, sx: PONG_X - 34, sy: 490, lift: 0, label: 'PONG P1', area: { x0: PONG_X - 60, y0: 300, x1: PONG_X, y1: 470 } },
  { kind: 'pong', x: PONG_X + 34, y: 480, sx: PONG_X + 34, sy: 490, lift: 0, label: 'PONG P2', area: { x0: PONG_X, y0: 300, x1: PONG_X + 60, y1: 470 } },
  { kind: 'arcade', x: INV_X, y: 480, sx: INV_X, sy: 490, lift: 0, label: 'PLAY', area: { x0: INV_X - 26, y0: 300, x1: INV_X + 26, y1: 470 } },
  { kind: 'prizes', x: 960, y: 484, sx: 960, sy: 492, lift: 0, label: 'PRIZES', area: { x0: COUNTER.x0, y0: 250, x1: COUNTER.x1, y1: 470 } },
  { kind: 'juke', x: 774, y: 480, sx: 774, sy: 490, lift: 0, label: 'MUSIC', area: { x0: 714, y0: 310, x1: 834, y1: 470 } },
];
/** Spot indexes of the two Pong sides. */
export const PONG_SPOTS: [number, number] = [1, 2];

export function makeArcade(): Room {
  const room: Room = {
    id: 'arcade', title: 'THE ARCADE', sub: 'INSERT TOKEN',
    w: W, h: H,
    floor: { x0: 14, y0: 476, x1: W - 14, y1: 600 },
    blockers: [{ x0: 500, y0: 540, x1: 620, y1: 572 }, { x0: 1078, y0: 470, x1: 1094, y1: 480 }],
    doors: [{ trigger: { x0: 14, y0: 476, x1: 60, y1: 484 }, to: 'plaza', arrive: { x: 186, y: 668 }, label: 'SQUARE', area: { x0: 6, y0: 350, x1: 70, y1: 470 } }],
    spots: ARCADE_SPOTS, inUse: new Map(),
    music: { x: 774, tracks: CHIPTUNES, current: () => ({ n: ARCADE_INFO.juke, t0: ARCADE_INFO.jukeT0 }) },
    onState(s: StateMsg) {
      if (s.k === 'juke') { ARCADE_INFO.juke = s.v.n; ARCADE_INFO.jukeT0 = s.v.t0; }
      else if (s.k === 'hi') ARCADE_INFO.hi = s.v;
      else if (s.k === 'claw') ARCADE_INFO.claw = s.v;
      else if (s.k === 'champ') ARCADE_INFO.champ = s.v;
    },
    spawn: { x: 90, y: 500 },
    dim: 0.34,
    fillTop: 'rgb(14,10,26)', fillLow: 'rgb(22,14,48)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [airHockey, neonPlant],
  };
  return room;
}
