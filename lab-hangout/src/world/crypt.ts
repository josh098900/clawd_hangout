// THE CRYPT — under the grate in the Square (the film had a crypt set; this is its cellar).
// A co-op escape room: three pressure plates, two stone blocks you can push by walking into
// them, and a sealed door with three runes. Press all three plates at once (stand on them,
// or push a block onto one) and the door grinds open on a chest holding the CROWN.
// It's dark down here: torches, bats, a friendly ghost, and everyone carries a lantern.
//
// Shared state ('crypt'): where the two blocks are, and when the door opened (0 = shut).

import { K, XK } from '../engine/palette';
import { PX, mk, r, disc, oval, txt, tw, alpha, lit, Gd, withCtx, M, shade } from '../engine/pixel';
import { h1 } from '../engine/math';
import type { StateMsg } from '../net/transport';
import type { Rect, Room, Prop, Spot } from './room';

const W = 1000, H = 680, LF = 430;
const DOOR = { x: 822, y: 318, w: 76, h: 112 };
const STAIRS = { x: 8, y: 330, w: 44, h: 100 };
export const PLATES: [number, number][] = [[320, 600], [560, 470], [760, 540]];
const BLOCK_START: [number, number][] = [[220, 600], [470, 560]];
export const OPEN_FOR = 300;
const bw = 11, bd = 6;
const blockRect = ([x, y]: [number, number]): Rect => ({ x0: x - bw, y0: y - bd, x1: x + bw, y1: y + bd });
/** The live block blockers (mutated in place when they're pushed or state arrives). */
export const BLOCKS: Rect[] = BLOCK_START.map(blockRect);
export const CRYPT_INFO = { open: 0 };
export const blockCenters = (): number[] => BLOCKS.flatMap((b) => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]);
export function resetBlocks(): void { BLOCK_START.forEach((p, i) => Object.assign(BLOCKS[i], blockRect(p))); }
const opened = (): number => { const o = CRYPT_INFO.open; return o ? Math.min(1, (Date.now() / 1000 - o) / 2.5) : 0; };

/** Which plates are pressed, given where everyone's feet are. */
export function platesDown(feet: { x: number; y: number }[]): boolean[] {
  const c = blockCenters();
  return PLATES.map(([px, py]) => feet.some((f) => Math.abs(f.x - px) < 12 && Math.abs(f.y - py) < 8) || [0, 2].some((i) => Math.abs(c[i] - px) < 14 && Math.abs(c[i + 1] - py) < 10));
}
let lastDown: boolean[] = [false, false, false];
export function setDown(d: boolean[]): void { lastDown = d; }

// ---------- the set ----------
function build(this: Room): void {
  withCtx(this.bg.getContext('2d')!, () => {
    PX.dim = 0; PX.fl = 0; PX.emit = false;
    // vaulted ceiling
    r(0, 0, W, 170, [18, 20, 26]); for (let x = 0; x < W; x += 110) { for (let k = 0; k < 40; k++) { const u = k / 39, yy = 160 - Math.sin(u * Math.PI) * 60; r(x + Math.round(u * 110), Math.round(yy), 2, 3, XK.STONE_DK); } r(x, 100, 6, 70, XK.STONE_DK); }
    // stone block walls with mortar
    r(0, 160, W, LF - 160, XK.MORTAR);
    for (let y = 160, row = 0; y < LF; y += 14, row++) for (let x = row % 2 ? -18 : 0; x < W; x += 36) { const c = h1(x * 0.7 + y) > 0.5 ? XK.STONE : XK.STONE2; r(x + 1, y + 1, 34, 12, c); r(x + 1, y + 1, 34, 1, XK.STONE_HI); if (h1(x + y * 3) > 0.9) r(x + 4, y + 9, 10, 3, XK.MOSS); }
    // arched niches with candles and bones
    for (const nx of [160, 440, 680]) {
      r(nx, 250, 60, 90, [16, 17, 22]); for (let k = 0; k < 30; k++) { const u = k / 29; r(nx + Math.round(u * 60), 250 - Math.round(Math.sin(u * Math.PI) * 18), 2, 3, XK.STONE_HI); }
      r(nx + 10, 322, 40, 4, XK.STONE_HI); oval(nx + 30, 318, 8, 4, [220, 214, 196]); r(nx + 26, 316, 2, 2, [20, 20, 24]); r(nx + 32, 316, 2, 2, [20, 20, 24]);
      for (const cx of [nx + 12, nx + 46]) r(cx, 308, 3, 14, [236, 230, 210]);
    }
    // cobwebs in the corners
    for (const [cx, dir] of [[0, 1], [W, -1]] as [number, number][]) for (let k = 0; k < 6; k++) { for (let j = 0; j < 30; j++) r(cx + dir * (j * (1 + k * 0.4)), 160 + j * (1.2 - k * 0.15), 1, 1, [80, 84, 96]); }
    // carved hint over the door
    txt('THREE STONES', DOOR.x + DOOR.w / 2 - tw('THREE STONES') / 2, DOOR.y - 32, XK.STONE_HI); txt('OPEN THE WAY', DOOR.x + DOOR.w / 2 - tw('OPEN THE WAY') / 2, DOOR.y - 24, XK.STONE_HI);
    // the vault behind the door: gold, and the chest (the door covers it until it opens)
    r(DOOR.x, DOOR.y, DOOR.w, DOOR.h, [24, 20, 16]);
    for (let i = 0; i < 60; i++) r(DOOR.x + 4 + Math.floor(h1(i * 3.3) * (DOOR.w - 8)), DOOR.y + DOOR.h - 6 - Math.floor(h1(i * 1.7) * 12), 3, 2, h1(i) > 0.5 ? XK.GOLD : XK.GOLD_DK);
    const cx = DOOR.x + DOOR.w / 2;
    r(cx - 16, DOOR.y + DOOR.h - 30, 32, 22, XK.CHEST); r(cx - 16, DOOR.y + DOOR.h - 30, 32, 8, XK.CHEST_DK); r(cx - 16, DOOR.y + DOOR.h - 24, 32, 2, XK.GOLD); r(cx - 2, DOOR.y + DOOR.h - 25, 4, 5, XK.GOLD);
    r(cx - 16, DOOR.y + DOOR.h - 30, 2, 22, XK.GOLD_DK); r(cx + 14, DOOR.y + DOOR.h - 30, 2, 22, XK.GOLD_DK);
    // door frame
    r(DOOR.x - 8, DOOR.y - 10, DOOR.w + 16, 10, XK.STONE_HI); r(DOOR.x - 8, DOOR.y - 10, 8, DOOR.h + 10, XK.STONE_HI); r(DOOR.x + DOOR.w, DOOR.y - 10, 8, DOOR.h + 10, XK.STONE_DK);
    // stairs up to the Square
    const S = STAIRS; r(S.x - 4, S.y - 8, S.w + 8, S.h + 8, XK.STONE_HI); r(S.x, S.y, S.w, S.h, [30, 34, 44]);
    for (let k = 0; k < 7; k++) r(S.x + 2, S.y + S.h - 12 - k * 13, S.w - 4, 4, XK.STONE2);
    // flagstone floor + the three plates
    r(0, LF, W, H - LF, XK.FLOOR);
    for (let y = LF, j = 0; y < H; y += 16, j++) { r(0, y, W, 1, XK.MORTAR); for (let x = (j % 2) * 24; x < W; x += 48) { r(x, y, 1, 16, XK.MORTAR); if (h1(x + y) > 0.6) r(x + 2, y + 2, 44, 13, XK.FLOOR2); } }
    alpha(0.5, () => r(0, LF, W, 5, [0, 0, 0]));
    for (const [px, py] of PLATES) { oval(px, py, 15, 6, XK.STONE_DK); oval(px, py - 1, 13, 5, XK.PLATE); r(px - 5, py - 2, 10, 1, XK.STONE_HI); }
  });
}

// ---------- animated set pieces ----------
const TORCHES = [110, 380, 620, 770];

function drawBack(a: number): void {
  const open = opened();
  // torches
  for (const tx of TORCHES) {
    r(tx - 2, 300, 4, 14, [70, 50, 34]); r(tx - 5, 296, 10, 5, [90, 70, 50]);
    const f = Math.sin(a * 13 + tx) * 0.5 + Math.sin(a * 7.3 + tx * 2) * 0.5;
    lit(() => { r(tx - 3, 288 - Math.round(f), 6, 8 + Math.round(f), XK.FLAME); r(tx - 1, 290 - Math.round(f), 2, 5, XK.FLAME_HI); });
    Gd(tx, 292, 40 + f * 4, [255, 170, 80], 0.32); Gd(tx, 292, 16, [255, 220, 150], 0.4);
  }
  // candles in the niches
  lit(() => { for (const nx of [160, 440, 680]) for (const cx of [nx + 12, nx + 46]) r(cx + 1, 304 + Math.round(Math.sin(a * 11 + cx)), 1, 3, XK.FLAME_HI); });
  for (const nx of [160, 440, 680]) Gd(nx + 30, 306, 22, [255, 190, 110], 0.2);
  // runes: one per plate, lit while it's pressed; all lit (and gold) once open
  lit(() => lastDown.forEach((d, i) => { const x = DOOR.x + 16 + i * 22, y = DOOR.y - 4 - 2 * 0; r(x, y - 1, 1, 1, K.WHITE); txt(['<', '*', '>'][i], x - 1, DOOR.y + 20 + i * 0, d || open ? XK.RUNE : XK.RUNE_OFF, 2); if (d || open) Gd(x + 2, DOOR.y + 25, 10, [124, 242, 208], 0.45); }));
  // plate glows
  lastDown.forEach((d, i) => { if (d) { const [px, py] = PLATES[i]; lit(() => oval(px, py - 1, 13, 5, M(XK.PLATE, XK.PLATE_ON, 0.6 + 0.2 * Math.sin(a * 6)))); Gd(px, py, 20, [124, 242, 208], 0.35); } });
  // the vault: gold glints behind the door, and the door itself sliding up
  if (open > 0) { lit(() => { for (let k = 0; k < 6; k++) if ((a * 0.9 + k * 0.17) % 1 < 0.15) r(DOOR.x + 8 + Math.floor(h1(k + Math.floor(a)) * (DOOR.w - 16)), DOOR.y + DOOR.h - 14 - Math.floor(h1(k * 2 + 1) * 20), 1, 1, K.WHITE); }); Gd(DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h - 16, 40, [255, 214, 90], 0.35 * open); }
  const dy = Math.round(open * (DOOR.h - 6)), g = PX.ctx;
  g.save(); g.beginPath(); g.rect(DOOR.x, DOOR.y - 10, DOOR.w, DOOR.h + 10); g.clip();
  r(DOOR.x, DOOR.y - dy, DOOR.w, DOOR.h, XK.BLOCK_DK); r(DOOR.x + 3, DOOR.y - dy + 3, DOOR.w - 6, DOOR.h - 6, XK.BLOCK);
  for (let y = 12; y < DOOR.h - 6; y += 24) r(DOOR.x + 6, DOOR.y - dy + y, DOOR.w - 12, 1, XK.BLOCK_DK);
  lit(() => lastDown.forEach((d, i) => { const x = DOOR.x + 14 + i * 20; txt(['<', '*', '>'][i], x, DOOR.y - dy + 44, d || open ? XK.RUNE : XK.RUNE_OFF, 3); }));
  g.restore();
  if (open > 0 && open < 1) for (let k = 0; k < 6; k++) { const ph = (a * 2 + k / 6) % 1; alpha(0.5 * (1 - ph), () => disc(DOOR.x + 6 + k * 13, DOOR.y + DOOR.h - Math.round(ph * 10), 3 + Math.round(ph * 4), [120, 120, 130])); }
  // bats under the vaults
  for (let k = 0; k < 4; k++) { const x = (h1(k) * W + a * (20 + k * 6)) % (W + 60) - 30, y = 190 + Math.sin(a * 2 + k * 3) * 20 + k * 12, fl = Math.floor(a * 12 + k) % 2; r(Math.round(x), Math.round(y), 3, 2, [20, 18, 24]); r(Math.round(x) - 4, Math.round(y) - (fl ? 2 : -1), 4, 2, [20, 18, 24]); r(Math.round(x) + 3, Math.round(y) - (fl ? 2 : -1), 4, 2, [20, 18, 24]); }
  // the ghost drifts about, and says boo now and then
  const gx = 500 + Math.sin(a * 0.23) * 330, gy = 500 + Math.sin(a * 0.46) * 50 - 30, ga = 0.35 + 0.2 * Math.sin(a * 1.3);
  alpha(ga, () => lit(() => { oval(Math.round(gx), Math.round(gy), 9, 10, XK.GHOST); r(Math.round(gx) - 9, Math.round(gy), 18, 10, XK.GHOST); for (let k = 0; k < 4; k++) r(Math.round(gx) - 9 + k * 5, Math.round(gy) + 10 + ((Math.floor(a * 4) + k) % 2), 3, 2, XK.GHOST); r(Math.round(gx) - 4, Math.round(gy) - 3, 2, 3, [30, 30, 50]); r(Math.round(gx) + 2, Math.round(gy) - 3, 2, 3, [30, 30, 50]); }));
  Gd(gx, gy, 18, [200, 220, 255], 0.15);
  if ((a * 0.2) % 1 < 0.12) txt('BOO', Math.round(gx) - 5, Math.round(gy) - 22, [200, 220, 255]);
}

// ---------- props: the two pushable blocks (their y follows the block) ----------
const blockProp = (i: number): Prop => ({
  get y() { return BLOCKS[i].y1; },
  draw() {
    const b = BLOCKS[i], x = Math.round(b.x0), y = Math.round(b.y1);
    alpha(0.4, () => oval(Math.round((b.x0 + b.x1) / 2), y, 13, 3, [0, 0, 0]));
    r(x, y - 22, 22, 22, XK.BLOCK_DK); r(x + 1, y - 21, 20, 14, XK.BLOCK); r(x + 1, y - 21, 20, 2, XK.BLOCK_HI); r(x + 1, y - 7, 20, 6, shade(XK.BLOCK, 0.8));
    txt(['<', '>'][i], x + 9, y - 17, XK.RUNE_OFF);
  },
});

export const CRYPT_SPOTS: Spot[] = [
  { kind: 'chest', x: DOOR.x + DOOR.w / 2, y: 452, sx: DOOR.x + DOOR.w / 2, sy: 452, lift: 0, label: 'OPEN CHEST', area: { x0: DOOR.x, y0: DOOR.y, x1: DOOR.x + DOOR.w, y1: DOOR.y + DOOR.h } },
];

export function makeCrypt(): Room {
  const room: Room = {
    id: 'crypt', title: 'THE CRYPT', sub: 'DOWN BELOW',
    w: W, h: H,
    floor: { x0: 14, y0: 444, x1: W - 14, y1: 620 },
    blockers: [...BLOCKS],
    pushables: BLOCKS,
    doors: [{ trigger: { x0: 12, y0: 444, x1: 48, y1: 452 }, to: 'plaza', arrive: { x: 1120, y: 704 }, label: 'UP', area: { x0: 4, y0: 322, x1: 56, y1: 440 } }],
    spots: CRYPT_SPOTS, inUse: new Map(),
    lantern: [255, 190, 110],
    onState(s: StateMsg) {
      if (s.k !== 'crypt') return;
      [0, 1].forEach((i) => Object.assign(BLOCKS[i], blockRect([s.v.b[i * 2], s.v.b[i * 2 + 1]])));
      CRYPT_INFO.open = s.v.open;
    },
    spawn: { x: 60, y: 470 },
    dim: 0.5,
    fillTop: 'rgb(18,20,26)', fillLow: 'rgb(46,49,58)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [blockProp(0), blockProp(1)],
  };
  return room;
}
