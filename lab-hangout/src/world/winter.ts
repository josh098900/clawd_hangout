// WINTER (1 December - 6 January, see season.ts): the dressing over every room, and the season's
// things to do. Like Halloween, rooms don't know about any of this: main.ts calls installWinter()
// once the season is known, then winterBack / winterProps / winterFront each frame.
//
//   * Snow on the ground outdoors, lights and garlands indoors, a wreath on every door.
//   * THE TREE in the Square: everyone's ornaments (0018_winter.sql, per server), and a lighting
//     show at half past every hour. Secret Santa presents wait under it.
//   * SANTA'S SLEIGH crosses the outdoor skies at :15 and :45, dropping 8 presents on the Square.
//   * The PRESENT HUNT: 12 presents around the world, each once a day.
//   * The ADVENT CALENDAR in the Lab, the SNOWMAN and the frozen pond in the Park, snowballs.
//   * NEW YEAR'S EVE: a countdown to midnight (UTC) and fireworks everywhere outside.

import { K, CONFETTI, type RGB } from '../engine/palette';
import { PX, mk, r, line, disc, txt, tw, lit, alpha, G, Gd, Gsoft, withCtx, M, shade } from '../engine/pixel';
import { h1 } from '../engine/math';
import { POND, onWater } from './park';
import { vnoise } from './space';
import type { Ornament, TreeGift } from '../net/transport';
import type { Prop, Room, RoomId, Spot } from './room';

/** What main.ts keeps up to date: the tree's ornaments and presents, your present hunt, the snowman, a snowball fight. */
export const WINTER = {
  ornaments: [] as Ornament[], gifts: [] as TreeGift[], treeAt: 0, treeDirty: true,
  presents: new Set<number>(), advent: { opened: [] as number[], upto: 0 },
  snowman: { day: 0, rolls: 0, deco: 0 }, snowfight: null as { t0: number; by: string } | null,
  /** Sleigh presents you've caught (pass:n). */
  caught: new Set<string>(),
  /** Dev/tests: pretend it's this many seconds before midnight on New Year's Eve (?nye=N). */
  nyeAt: null as number | null,
};
export const OUTDOOR: RoomId[] = ['plaza', 'pier', 'park', 'roof'];

// ---------- the present hunt ----------
export const PRESENTS: { room: RoomId; x: number; y: number }[] = [
  { room: 'plaza', x: 330, y: 604 }, { room: 'plaza', x: 1340, y: 650 }, { room: 'lab', x: 740, y: 470 }, { room: 'den', x: 620, y: 470 },
  { room: 'roof', x: 1300, y: 650 }, { room: 'cinema', x: 230, y: 480 }, { room: 'stage', x: 880, y: 600 }, { room: 'pier', x: 220, y: 610 },
  { room: 'park', x: 1120, y: 712 }, { room: 'park', x: 160, y: 560 }, { room: 'arcade', x: 600, y: 560 }, { room: 'diner', x: 300, y: 600 },
];
const WRAPS: [RGB, RGB][] = [[[214, 44, 56], [255, 214, 90]], [[60, 170, 90], [214, 44, 56]], [[90, 130, 230], [240, 240, 250]], [[255, 214, 90], [214, 44, 56]], [[190, 90, 220], [124, 242, 156]], [[240, 240, 250], [60, 170, 90]]];
/** A wrapped present standing at (x, y): paper, ribbon, a bow. `open` = the lid off and a sparkle. */
export function present(x: number, y: number, wrap: number, s: number, open = false): void {
  const [c, rb] = WRAPS[wrap % WRAPS.length], w = 8 + s * 2, h = 7 + s * 2;
  r(x - w / 2, y - h, w, h, c); r(x - w / 2, y - h, 1, h, M(c, K.WHITE, 0.3)); r(x + w / 2 - 1, y - h, 1, h, shade(c, 0.75));
  r(x - 1, y - h, 2, h, rb);
  if (open) { r(x - w / 2 - 1, y - h - 5, w + 2, 2, c); r(x - 1, y - h - 5, 2, 2, rb); return; }
  r(x - w / 2 - 1, y - h - 2, w + 2, 3, c); r(x - w / 2 - 1, y - h - 2, w + 2, 1, M(c, K.WHITE, 0.3)); r(x - 1, y - h - 2, 2, 3, rb);
  r(x - 4, y - h - 5, 3, 3, rb); r(x + 1, y - h - 5, 3, 3, rb); r(x - 1, y - h - 4, 2, 2, shade(rb, 0.8));
}

// ---------- the tree ----------
export const TREE = { x: 1190, base: 596, H: 172 };
/** How wide the tree is (each side of the trunk) at y px down from the star: the same rule as hang_ornament(). */
export const treeHW = (y: number): number => 8 + (y * 60) / 160;
const TIERS: [number, number][] = [[10, 52], [38, 92], [76, 132], [114, 166]];
export const ORN_NAMES = ['RED BAUBLE', 'GOLD BAUBLE', 'BLUE BAUBLE', 'STAR', 'CANDY CANE', 'BELL', 'SNOWFLAKE', 'LITTLE CRITTER'];
/** An ornament of kind k centred on (x, y). */
export function ornament(k: number, x: number, y: number, a: number): void {
  x = Math.round(x); y = Math.round(y);
  const ball = (c: RGB) => { disc(x, y, 3, c); r(x - 1, y - 2, 1, 1, K.WHITE); r(x - 1, y - 5, 2, 2, [200, 200, 210]); };
  if (k === 0) ball([214, 44, 56]); else if (k === 1) ball([255, 200, 60]); else if (k === 2) ball([80, 130, 240]);
  else if (k === 3) lit(() => { r(x, y - 3, 1, 7, K.GOLD); r(x - 3, y, 7, 1, K.GOLD); r(x - 1, y - 1, 3, 3, K.GOLD); if ((a * 2 + x) % 2 < 0.4) r(x, y, 1, 1, K.WHITE); });
  else if (k === 4) { for (let j = 0; j < 7; j++) r(x + 1, y - 2 + j, 2, 1, j % 2 ? K.WHITE : [214, 44, 56]); r(x - 1, y - 3, 3, 1, [214, 44, 56]); r(x - 2, y - 2, 1, 2, K.WHITE); }
  else if (k === 5) { r(x - 2, y - 2, 5, 4, [255, 200, 60]); r(x - 3, y + 2, 7, 1, [214, 160, 40]); r(x - 1, y - 3, 3, 1, [255, 200, 60]); r(x, y + 3, 1, 1, [150, 110, 30]); r(x - 1, y - 2, 1, 2, K.WHITE); }
  else if (k === 6) lit(() => { r(x, y - 3, 1, 7, [230, 240, 255]); r(x - 3, y, 7, 1, [230, 240, 255]); r(x - 2, y - 2, 1, 1, [230, 240, 255]); r(x + 2, y - 2, 1, 1, [230, 240, 255]); r(x - 2, y + 2, 1, 1, [230, 240, 255]); r(x + 2, y + 2, 1, 1, [230, 240, 255]); });
  else { disc(x, y, 3, [34, 197, 160]); r(x - 2, y - 1, 1, 2, K.EYE); r(x + 1, y - 1, 1, 2, K.EYE); r(x, y - 5, 1, 2, [34, 197, 160]); lit(() => r(x, y - 6, 1, 1, [200, 255, 230])); }
}
/** Half past each hour, for 40 s: the tree-lighting show (0..1 through it), or -1. */
export function lightShow(nowMs = Date.now()): number { const s = (nowMs / 1000) % 3600 - 1800; return s >= 0 && s < 40 ? s / 40 : -1; }
/** The tree with its star at (cx, top): tiers of branches with snow on them, lights, a garland, everyone's ornaments. */
export function drawTree(cx: number, top: number, a: number, orns: Ornament[]): void {
  const dark: RGB = [26, 96, 60], mid: RGB = [38, 124, 76], hi: RGB = [70, 160, 96], snow: RGB = [236, 242, 250];
  r(cx - 5, top + 160, 10, 14, [110, 70, 40]); r(cx - 5, top + 160, 3, 14, [140, 96, 60]);
  for (const [t0, t1] of TIERS) for (let y = t0; y <= t1; y++) {
    const u = (y - t0) / (t1 - t0), hw = Math.round(treeHW(t1) * (0.25 + 0.75 * u) + 3);
    r(cx - hw, top + y, hw * 2, 1, y > t1 - 3 ? dark : mid); r(cx - hw, top + y, Math.max(1, Math.round(hw * 0.4)), 1, hi);
    if (y === t1 || y === t1 - 1) for (let x = -hw; x < hw; x += 3) if (h1(x * 1.7 + y) > 0.25) r(cx + x, top + y - 1 + ((x / 3) % 2 ? 1 : 0), 2, 1, snow);
  }
  // a gold garland wrapping round
  for (let k = 0; k < 3; k++) { const y0 = 40 + k * 40; for (let x = -treeHW(y0); x < treeHW(y0 + 30); x += 2) { const y = y0 + (x + treeHW(y0)) * 0.35; if (Math.abs(x) < treeHW(y)) r(cx + Math.round(x), top + Math.round(y), 2, 1, [220, 180, 70]); } }
  // lights: they twinkle, and chase round during the lighting show
  const show = lightShow(), cols: RGB[] = [[255, 80, 80], [255, 214, 90], [90, 180, 255], [124, 242, 156], [255, 140, 230]];
  lit(() => { for (let i = 0; i < 46; i++) { const y = 16 + h1(i * 3.3) * 144, x = (h1(i * 7.7) * 2 - 1) * (treeHW(y) - 3), on = show >= 0 ? (Math.floor(a * 8) + i) % 4 !== 0 : (a * (0.6 + h1(i) * 0.8) + h1(i * 5)) % 1 < 0.75; if (on) r(cx + Math.round(x), top + Math.round(y), 2, 2, cols[i % cols.length]); } });
  if (show >= 0) Gsoft(cx, top + 90, 20, 90, [255, 220, 150], 0.25 * Math.sin(show * Math.PI));
  for (const o of orns) ornament(o.kind, cx + o.x, top + o.y, a);
  // the star
  const tw2 = (a * 1.5) % 1 < 0.2 || show >= 0;
  lit(() => { r(cx - 1, top - 8, 3, 13, K.GOLD); r(cx - 6, top - 3, 13, 3, K.GOLD); r(cx - 3, top - 5, 7, 7, K.GOLD); r(cx - 1, top - 3, 3, 3, tw2 ? K.WHITE : [255, 240, 180]); });
  Gd(cx, top - 2, tw2 ? 16 : 11, [255, 220, 120], 0.45); if (show >= 0) Gsoft(cx, top - 2, 6, 40, [255, 230, 150], 0.4);
}
const treeProp: Prop = {
  y: TREE.base,
  draw(a: number) {
    drawTree(TREE.x, TREE.base - TREE.H, a, WINTER.ornaments);
    // Secret Santa presents under it (yours bob, with FOR YOU over them)
    const gs = WINTER.gifts.slice(0, 12);
    gs.forEach((g, i) => { const side = i % 2 ? 1 : -1, x = TREE.x + side * (14 + Math.floor(i / 2) * 11), y = TREE.base + 6 + (i % 3) * 3, bob = g.mine ? Math.round(Math.abs(Math.sin(a * 3 + i)) * 2) : 0; present(x, y - bob, g.wrap, i % 3 === 0 ? 1 : 0); });
    const mine = gs.filter((g) => g.mine).length;
    if (mine) lit(() => { const t = mine > 1 ? mine + ' FOR YOU!' : 'FOR YOU!'; txt(t, TREE.x - tw(t) / 2, TREE.base + 16 + Math.round(Math.sin(a * 4) * 1.5), K.GOLD); });
    if (WINTER.gifts.length > 12) txt('+' + (WINTER.gifts.length - 12), TREE.x + 80, TREE.base + 8, [236, 242, 250]);
  },
};

// ---------- Santa's sleigh ----------
/** The sleigh flies at :15 and :45: which pass, and how far in (s); `u` 0..1 across the sky while it's up. */
export function sleigh(nowMs = Date.now()): { pass: number; t: number; u: number } { const t = nowMs / 1000, pass = Math.floor((t - 900) / 1800), s = t - (pass * 1800 + 900); return { pass, t: s, u: s / 22 }; }
/** Where each of a pass's 8 presents lands on the Square (spots that are clear of benches and railings). */
const DROP_SPOTS: [number, number][] = [[260, 622], [320, 690], [500, 612], [560, 690], [640, 640], [700, 700], [820, 612], [860, 690], [980, 630], [1020, 700], [1250, 664], [1300, 636], [1340, 690], [400, 604], [1000, 596], [900, 606]];
export function drops(pass: number): { n: number; x: number; y: number; land: number; wrap: number }[] {
  const pick = [...DROP_SPOTS.keys()].sort((p, q) => h1(pass * 3.1 + p) - h1(pass * 3.1 + q)).slice(0, 8);
  return pick.map((k, n) => ({ n, x: DROP_SPOTS[k][0], y: DROP_SPOTS[k][1], land: 8 + n * 1.1 + 3, wrap: Math.floor(h1(pass + n) * 6) }));
}
const SLEIGH_Y: Partial<Record<RoomId, number>> = { plaza: 452, pier: 368, park: 424, roof: 356 }; // (low enough to be in view from the ground)
const SLEIGH_W: Partial<Record<RoomId, number>> = { plaza: 1400, pier: 1300, park: 1600, roof: 1860 };
function drawSleigh(x: number, y: number, a: number): void {
  x = Math.round(x); y = Math.round(y + Math.sin(a * 2) * 3);
  // a sparkle trail behind
  lit(() => { for (let k = 0; k < 14; k++) { const tx = x - 30 - k * 6, ty = y + 4 + Math.round(Math.sin(a * 4 + k) * 2); if ((a * 6 + k) % 2 < 1.4) r(tx, ty, 1, 1, CONFETTI[k % CONFETTI.length]); } });
  // four reindeer in pairs ahead, legs going, the lead one's nose glowing
  for (let k = 0; k < 4; k++) {
    const rx = x + 34 + Math.floor(k / 2) * 22 + (k % 2) * 4, ry = y - 6 - (k % 2) * 3, ph = Math.floor(a * 10 + k) % 2, br: RGB = [150, 100, 60];
    r(rx - 6, ry, 12, 5, br); r(rx - 6, ry, 12, 1, [184, 136, 84]); r(rx + 5, ry - 4, 4, 4, br); r(rx + 8, ry - 2, 2, 2, br);
    r(rx - 5, ry + 5, 1, 3 - ph, br); r(rx - 2, ry + 5, 1, 2 + ph, br); r(rx + 2, ry + 5, 1, 3 - ph, br); r(rx + 4, ry + 5, 1, 2 + ph, br);
    r(rx + 6, ry - 7, 1, 3, [120, 80, 50]); r(rx + 5, ry - 8, 3, 1, [120, 80, 50]);
    if (k === 3) { lit(() => r(rx + 9, ry - 2, 2, 2, [255, 60, 60])); Gd(rx + 10, ry - 1, 6, [255, 60, 60], 0.5); }
    line(x + 14, y - 2, rx - 6, ry + 2, [200, 170, 90]);
  }
  // the sleigh, Santa (a critter in a red suit) and his sack
  r(x - 20, y - 4, 34, 10, [200, 40, 52]); r(x - 20, y - 4, 34, 2, [240, 90, 96]); r(x - 24, y - 12, 6, 16, [200, 40, 52]); r(x + 14, y - 2, 4, 8, [200, 40, 52]);
  r(x - 22, y + 7, 42, 2, [255, 200, 60]); r(x + 18, y + 4, 3, 3, [255, 200, 60]); r(x - 24, y + 5, 3, 3, [255, 200, 60]);
  disc(x - 12, y - 10, 7, [150, 110, 70]); r(x - 14, y - 18, 4, 3, [200, 160, 110]);
  disc(x + 2, y - 10, 7, [214, 44, 56]); r(x - 5, y - 6, 14, 2, K.WHITE); r(x - 1, y - 12, 2, 2, K.EYE); r(x + 3, y - 12, 2, 2, K.EYE);
  r(x - 4, y - 19, 12, 3, K.WHITE); for (let j = 0; j < 5; j++) r(x - 2 + j, y - 23 + Math.floor(j / 2), 8 - j, 1, [214, 44, 56]); r(x + 7, y - 23, 3, 3, K.WHITE);
}
/** The sleigh across this room's sky, and (on the Square) its presents falling, then waiting to be caught. */
function sleighBits(room: RoomId, a: number): void {
  const sl = sleigh(), y = SLEIGH_Y[room];
  if (y !== undefined && sl.u >= 0 && sl.u <= 1) drawSleigh(-120 + sl.u * ((SLEIGH_W[room] ?? 1400) + 240), y, a);
  if (room !== 'plaza' || sl.t > 330) return;
  for (const d of drops(sl.pass)) {
    if (WINTER.caught.has(sl.pass + ':' + d.n)) continue;
    const fall = d.land - 3, u = (sl.t - fall) / 3;
    if (u < 0) continue;
    if (u < 1) { // drifting down under a little parachute
      const sy = SLEIGH_Y.plaza ?? 452, yy = sy + (d.y - sy) * u, xx = d.x + Math.sin(u * 6 + d.n) * 6; line(xx - 6, yy - 20, xx, yy - 10, [220, 220, 230]); line(xx + 6, yy - 20, xx, yy - 10, [220, 220, 230]);
      for (let k = -7; k <= 7; k++) r(Math.round(xx + k), Math.round(yy - 22 + Math.abs(k) / 3), 1, 2, k % 2 ? [255, 255, 255] : [214, 44, 56]);
      present(Math.round(xx), Math.round(yy), d.wrap, 0);
    } else { present(d.x, d.y, d.wrap, 0); lit(() => { if ((a * 2 + d.n) % 1 < 0.5) r(d.x + 5, d.y - 14, 1, 1, K.WHITE); }); Gd(d.x, d.y - 5, 8, [255, 220, 150], 0.2); }
  }
}

// ---------- snow, lights, wreaths ----------
const snowCache = new Map<RoomId, HTMLCanvasElement>();
/** Snow lying on an outdoor room's ground (made once): drifts along the back, patches everywhere else. */
function snowLayer(room: Room): HTMLCanvasElement {
  let cv = snowCache.get(room.id); if (cv) return cv;
  cv = mk(room.w, room.h); const f = room.floor;
  withCtx(cv.getContext('2d')!, () => {
    PX.dim = 0; PX.emit = false;
    const s1: RGB = [236, 242, 250], s2: RGB = [212, 222, 238], s3: RGB = [190, 204, 226];
    // a smooth blanket: soft light and shade in big gentle patches, the odd bit of ground peeking through, sparkles
    for (let y = f.y0 - 12; y < Math.min(room.h, f.y1 + 40); y += 2) for (let x = 0; x < room.w; x += 2) {
      if (room.id === 'park' && ((x - POND.x) / (POND.rx + 8)) ** 2 + ((y - POND.y) / (POND.ry + 5)) ** 2 < 1) continue;
      const n = vnoise(x / 70, y / 22, 1e6, 7) * 0.7 + vnoise(x / 18, y / 8, 1e6, 13) * 0.3;
      if (n < 0.22) continue; // bare ground
      r(x, y, 2, 2, n > 0.62 ? s1 : n > 0.4 ? s2 : s3);
    }
    for (let i = 0; i < room.w / 3; i++) { const x = Math.floor(h1(i * 3.1) * room.w), y = f.y0 + Math.floor(h1(i * 7.3) * (f.y1 - f.y0 + 30)); r(x, y, 1, 1, K.WHITE); }
    for (let x = 0; x < room.w; x += 2) { const hh = 4 + Math.round(h1(x * 0.13) * 5 + Math.sin(x * 0.05) * 2); r(x, f.y0 - 10 - hh + 8, 2, hh, s1); } // a drift along the back
  });
  snowCache.set(room.id, cv); return cv;
}
/** Strings of coloured lights: [x0, y0, x1, y1] (they sag between the ends). */
const LIGHTS: Partial<Record<RoomId, [number, number, number, number][]>> = {
  plaza: [[161, 492, 521, 492], [701, 492, 1061, 492]],
  lab: [[10, 236, 250, 236], [540, 226, 740, 226], [740, 226, 950, 226]], den: [[10, 250, 490, 250], [490, 250, 990, 250]],
  cinema: [[10, 290, 390, 290]], arcade: [[10, 326, 540, 326], [540, 326, 1090, 326]], diner: [[10, 336, 700, 336], [700, 336, 1390, 336]],
  lofts: [[10, 330, 450, 330], [450, 330, 890, 330]], station: [[10, 290, 750, 290], [750, 290, 1490, 290]], pier: [[380, 380, 900, 380]],
  karts: [[10, 340, 650, 340], [650, 340, 1290, 340]], subway: [[10, 330, 650, 330], [650, 330, 1290, 330]], flat: [[20, 300, 940, 300]], flatbed: [[20, 300, 740, 300]], flatkit: [[20, 300, 700, 300]],
};
/** Little decorated trees standing indoors (on the same safe spots Halloween's pumpkins use). */
const XTREES: Partial<Record<RoomId, [number, number][]>> = {
  lab: [[520, 452]], den: [[700, 452]], cinema: [[940, 464]], stage: [[186, 496]], arcade: [[1060, 488]], diner: [[760, 492]], lofts: [[820, 500]], station: [[1000, 488]],
};
function smallTree(x: number, y: number, a: number): void {
  r(x - 3, y - 8, 6, 8, [110, 70, 40]); r(x - 9, y - 4, 18, 4, [214, 44, 56]); r(x - 9, y - 4, 18, 1, [240, 90, 96]);
  for (const [t0, t1, w] of [[6, 30, 12], [20, 48, 16], [36, 64, 20]] as [number, number, number][]) for (let j = t0; j <= t1; j++) { const hw = Math.round(w * (j - t0) / (t1 - t0)) + 2; r(x - hw, y - 72 + j, hw * 2, 1, j > t1 - 2 ? [26, 96, 60] : [38, 124, 76]); r(x - hw, y - 72 + j, Math.max(1, Math.round(hw * 0.4)), 1, [70, 160, 96]); if (j === t1) for (let k = -hw; k < hw; k += 3) r(x + k, y - 72 + j, 2, 1, [236, 242, 250]); }
  lit(() => { for (let k = 0; k < 14; k++) { const j = 10 + Math.floor(h1(k * 3.3) * 54), hw = Math.round(j * 0.33); if ((a * 1.3 + h1(k + x)) % 1 < 0.7) r(x - hw + Math.floor(h1(k * 7.7) * hw * 2), y - 72 + j, 2, 2, BULBS[k % BULBS.length]); } r(x - 1, y - 76, 3, 7, K.GOLD); r(x - 3, y - 73, 7, 1, K.GOLD); });
  Gd(x, y - 73, 9, [255, 220, 120], 0.4); Gd(x, y - 36, 22, [255, 200, 140], 0.08);
  present(x - 12, y + 2, (x / 10) % 6 | 0, 0); present(x + 11, y + 1, (x / 7 + 2) % 6 | 0, 1);
}
const BULBS: RGB[] = [[255, 70, 70], [124, 242, 156], [255, 214, 90], [90, 180, 255], [255, 255, 255]];
function lights(room: RoomId, a: number): void {
  for (const [x0, y0, x1, y1] of LIGHTS[room] ?? []) {
    const n = Math.max(2, Math.floor((x1 - x0) / 14));
    for (let k = 0; k <= n; k++) {
      const u = k / n, x = Math.round(x0 + (x1 - x0) * u), y = Math.round(y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * 12), c = BULBS[k % BULBS.length], on = (k + Math.floor(a * 2)) % 6 !== 0;
      r(x, y - 1, 1, 1, [40, 60, 40]); if (k < n) r(x, y, Math.round((x1 - x0) / n), 1, [30, 70, 40]);
      if (on) { lit(() => r(x - 1, y + 1, 3, 3, c)); Gd(x, y + 2, 5, c, 0.3); } else r(x - 1, y + 1, 3, 3, shade(c, 0.35));
    }
  }
}
/** A wreath over the middle of every door (not the open edges of a set). */
function wreaths(room: Room): void {
  for (const d of room.doors) {
    if (d.edge || d.area.y1 - d.area.y0 < 50 || d.area.y0 >= room.floor.y0) continue; // (not the ones in the ground, like the Crypt's grate)
    const x = Math.round((d.area.x0 + d.area.x1) / 2), y = Math.round(d.area.y0 + 18);
    for (let k = 0; k < 18; k++) { const an = (k / 18) * Math.PI * 2; r(Math.round(x + Math.cos(an) * 7) - 1, Math.round(y + Math.sin(an) * 7) - 1, 3, 3, k % 3 ? [40, 130, 70] : [60, 170, 90]); }
    for (const k of [2, 7, 12, 16]) { const an = (k / 18) * Math.PI * 2; r(Math.round(x + Math.cos(an) * 7), Math.round(y + Math.sin(an) * 7), 1, 1, [230, 50, 60]); }
    r(x - 3, y + 6, 3, 3, [214, 44, 56]); r(x + 1, y + 6, 3, 3, [214, 44, 56]); r(x - 1, y + 7, 2, 2, [170, 30, 40]); r(x - 2, y + 9, 1, 4, [214, 44, 56]); r(x + 2, y + 9, 1, 4, [214, 44, 56]);
  }
}

// ---------- the Park: the snowman, the frozen pond ----------
export const SNOWMAN = { x: 545, y: 592 };
export const SNOWMAN_ROLLS = 30;
export const SNOW_DECO = ['COAL EYES', 'A CARROT NOSE', 'A SCARF', 'A TOP HAT', 'STICK ARMS'];
function drawSnowman(a: number): void {
  const s = WINTER.snowman, today = Math.floor(Date.now() / 86400000), rolls = s.day === today ? s.rolls : 0, deco = s.day === today ? s.deco : 0, { x, y } = SNOWMAN;
  const snow: RGB = [240, 244, 250], sh: RGB = [200, 212, 230];
  const ball = (cy: number, rad: number) => { for (let j = -rad; j <= rad; j++) { const w = Math.round(Math.sqrt(rad * rad - j * j)); r(x - w, cy + j, w * 2, 1, j > rad * 0.5 ? sh : snow); if (w > 1) r(x + w - 2, cy + j, 2, 1, sh); } r(x - Math.round(rad * 0.5), cy - Math.round(rad * 0.6), 2, 2, K.WHITE); };
  const b1 = Math.min(18, 5 + rolls * 1.1), b2 = rolls > 11 ? Math.min(13, 4 + (rolls - 12) * 0.9) : 0, b3 = rolls > 21 ? Math.min(10, 3 + (rolls - 22) * 0.9) : 0;
  const c1 = y - b1, c2 = c1 - b1 - b2 + 3, c3 = c2 - b2 - b3 + 2;
  if (!rolls) { r(x - 16, y - 6, 32, 6, snow); r(x - 12, y - 9, 22, 3, snow); r(x - 16, y - 1, 32, 1, sh); }
  else { ball(Math.round(c1), Math.round(b1)); if (b2) ball(Math.round(c2), Math.round(b2)); if (b3) ball(Math.round(c3), Math.round(b3)); }
  const done = rolls >= SNOWMAN_ROLLS;
  if (done) {
    const hy = Math.round(c3);
    if (deco & 1) { r(x - 4, hy - 3, 2, 2, K.EYE); r(x + 2, hy - 3, 2, 2, K.EYE); for (let k = -3; k <= 3; k++) r(x + k, hy + 3 + (Math.abs(k) < 2 ? 1 : 0), 1, 1, K.EYE); for (const yy of [c2 - 4, c2, c2 + 4]) r(x, Math.round(yy), 2, 2, K.EYE); }
    if (deco & 2) { r(x + 1, hy, 7, 2, [255, 140, 40]); r(x + 8, hy, 2, 1, [255, 140, 40]); }
    if (deco & 4) { r(x - 10, Math.round(c2 - b2 + 1), 20, 3, [214, 44, 56]); r(x + 5, Math.round(c2 - b2 + 3), 3, 8, [214, 44, 56]); r(x + 5, Math.round(c2 - b2 + 10), 3, 1, K.WHITE); }
    if (deco & 8) { r(x - 9, Math.round(c3 - b3 - 1), 18, 2, [30, 28, 40]); r(x - 6, Math.round(c3 - b3 - 11), 12, 10, [30, 28, 40]); r(x - 6, Math.round(c3 - b3 - 4), 12, 2, [214, 44, 56]); }
    if (deco & 16) { line(x - b2, Math.round(c2), x - b2 - 12, Math.round(c2 - 8), [110, 70, 40]); line(x + b2, Math.round(c2), x + b2 + 12, Math.round(c2 - 9), [110, 70, 40]); line(x + b2 + 9, Math.round(c2 - 7), x + b2 + 11, Math.round(c2 - 12), [110, 70, 40]); }
  }
  const label = !rolls ? 'BUILD A SNOWMAN!' : !done ? Math.round((rolls / SNOWMAN_ROLLS) * 100) + '% BUILT' : deco < 31 ? 'DRESS HIM UP!' : '';
  if (label) lit(() => txt(label, x - tw(label) / 2, y + 6 + Math.round(Math.sin(a * 3)), [255, 243, 214]));
}
const snowmanProp: Prop = { y: SNOWMAN.y, draw: (a: number) => drawSnowman(a) };
/** The pond frozen over: pale ice with skate marks, snow round the rim, the fountain iced up. */
function ice(a: number): void {
  for (let j = -POND.ry; j <= POND.ry; j += 2) {
    const w = Math.round(POND.rx * Math.sqrt(1 - (j * j) / (POND.ry * POND.ry)));
    r(POND.x - w, POND.y + j, w * 2, 2, M([176, 206, 232], [214, 232, 246], 0.5 + 0.5 * Math.sin(j * 0.2)));
  }
  for (let k = 0; k < 18; k++) { const an = h1(k) * 6.28, rr = 0.2 + h1(k * 3) * 0.6, x0 = POND.x + Math.cos(an) * POND.rx * rr, y0 = POND.y + Math.sin(an) * POND.ry * rr; line(Math.round(x0), Math.round(y0), Math.round(x0 + 30 * Math.cos(an + 1.3)), Math.round(y0 + 8 * Math.sin(an + 1.3)), [236, 244, 252]); }
  lit(() => { const sx = POND.x - 150 + ((a * 30) % 300); r(Math.round(sx), POND.y - 20, 12, 1, K.WHITE); });
  // the fountain, frozen solid
  r(POND.x - 12, POND.y - 30, 24, 30, [200, 222, 240]); for (let k = -10; k <= 10; k += 4) r(POND.x + k, POND.y - 2, 2, 6 + (k % 3), [230, 244, 255]);
  r(POND.x - 18, POND.y - 4, 36, 6, [236, 242, 250]);
}
/** The pond's ice is walkable in winter: take the pond out of the Park's blockers (the fountain stays). */
function freezePond(park: Room): void {
  park.blockers = park.blockers.filter((b) => !(b.x0 >= POND.x - POND.rx - 1 && b.x1 <= POND.x + POND.rx + 1 && b.y0 >= POND.y - POND.ry - 1 && b.y1 <= POND.y + POND.ry + 1));
  park.blockers.push({ x0: POND.x - 16, y0: POND.y - 6, x1: POND.x + 16, y1: POND.y + 4 });
}
/** On the ice (skating: slippery). */
export const onIce = (room: RoomId, x: number, y: number): boolean => room === 'park' && onWater(x, y);

// ---------- the advent calendar (in the Lab, where the SLOP poster usually hangs) ----------
export const ADVENT = { x0: 254, y0: 240, x1: 364, y1: 310 };
function advent(a: number): void {
  const A = ADVENT, op = new Set(WINTER.advent.opened), up = WINTER.advent.upto;
  r(A.x0, A.y0, A.x1 - A.x0, A.y1 - A.y0, [150, 30, 40]); r(A.x0 + 2, A.y0 + 2, A.x1 - A.x0 - 4, A.y1 - A.y0 - 4, [200, 44, 56]);
  lit(() => txt('ADVENT', (A.x0 + A.x1) / 2 - tw('ADVENT') / 2, A.y0 + 4, K.GOLD));
  for (let i = 0; i < 24; i++) {
    const x = A.x0 + 4 + (i % 8) * 13, y = A.y0 + 12 + Math.floor(i / 8) * 19, n = i + 1, open = op.has(n), ready = !open && n <= up;
    if (open) { r(x, y, 12, 17, [60, 20, 26]); r(x + 1, y, 2, 17, [240, 220, 180]); ornament(n % 8, x + 7, y + 9, a); }
    else { r(x, y, 12, 17, ready ? [255, 236, 190] : [236, 214, 170]); r(x, y, 12, 1, K.WHITE); r(x + 11, y, 1, 17, [200, 170, 120]); txt(String(n), x + 6 - tw(String(n)) / 2, y + 6, ready ? [214, 44, 56] : [150, 110, 80]); if (ready) Gd(x + 6, y + 8, 9, [255, 214, 90], 0.3 + 0.2 * Math.sin(a * 4)); }
  }
}

// ---------- New Year's Eve ----------
/** Seconds to the next New Year (UTC), and seconds since the last one. `?nye=N` pretends it's N s before. */
export function nye(nowMs = Date.now()): { left: number; since: number; year: number } {
  if (WINTER.nyeAt !== null) { const s = WINTER.nyeAt - nowMs / 1000; const y = new Date().getUTCFullYear() + 1; return { left: s, since: -s, year: y }; }
  const d = new Date(nowMs), next = Date.UTC(d.getUTCFullYear() + 1, 0, 1) / 1000, last = Date.UTC(d.getUTCFullYear(), 0, 1) / 1000, t = nowMs / 1000;
  return { left: next - t, since: t - last, year: t - last < 600 ? d.getUTCFullYear() : d.getUTCFullYear() + 1 };
}
/** Fireworks over an outdoor sky for the first 5 minutes of the year; confetti everywhere for 1. */
function nyeShow(band: [number, number], W: number): void {
  const s = nye().since; if (s < 0 || s > 300) return;
  lit(() => {
    for (let k = 0; k < 10; k++) {
      const cyc = 2.4 + h1(k) * 1.4, t = (s + h1(k * 3) * cyc) % cyc, n = Math.floor((s + h1(k * 3) * cyc) / cyc), bx = h1(k * 7 + n * 1.3) * W, by = band[0] + h1(k * 5 + n) * (band[1] - band[0]), c = CONFETTI[(k + n) % CONFETTI.length];
      if (t < 0.7) { r(Math.round(bx), Math.round(band[1] + 80 - (band[1] + 80 - by) * (t / 0.7)), 1, 3, [255, 230, 170]); continue; }
      const u = t - 0.7, d = u * 60 * Math.exp(-u * 0.8), fade = Math.max(0, 1 - u / 1.6);
      alpha(fade, () => { for (let j = 0; j < 18; j++) { const an = (j / 18) * 6.283 + k; r(Math.round(bx + Math.cos(an) * d), Math.round(by + Math.sin(an) * d + u * u * 10), 2, 2, j % 3 ? M(c, K.WHITE, 0.4) : K.WHITE); } });
      if (u < 0.3) Gd(bx, by, 40, c, 0.3);
    }
  });
}

// ---------- installing it ----------
let installed = false;
/** Spots (appended, so indexes stay stable for everyone in the season), the frozen pond, the Lab's festive jukebox. */
export function installWinter(rooms: Record<RoomId, Room>, labTracks?: import('../audio/music').Track[]): void {
  if (installed) return; installed = true;
  PRESENTS.forEach((p, n) => rooms[p.room].spots.push({ kind: 'present', n, x: p.x, y: p.y + 10, sx: p.x, sy: p.y + 10, lift: 0, label: 'OPEN', area: { x0: p.x - 12, y0: p.y - 20, x1: p.x + 12, y1: p.y + 2 } } satisfies Spot));
  rooms.plaza.spots.push({ kind: 'tree', x: TREE.x - 30, y: TREE.base + 14, sx: TREE.x - 30, sy: TREE.base + 14, lift: 0, label: 'THE TREE', area: { x0: TREE.x - 70, y0: TREE.base - TREE.H - 8, x1: TREE.x + 70, y1: TREE.base + 10 } });
  rooms.plaza.spots.push({ kind: 'snowfight', x: 1000, y: 612, sx: 1000, sy: 612, lift: 0, label: 'SNOWBALL FIGHT', area: { x0: 984, y0: 560, x1: 1016, y1: 602 } });
  rooms.plaza.blockers.push({ x0: TREE.x - 8, y0: TREE.base - 6, x1: TREE.x + 8, y1: TREE.base + 2 }, { x0: 996, y0: 596, x1: 1004, y1: 604 });
  rooms.lab.spots.push({ kind: 'advent', x: 310, y: 446, sx: 310, sy: 446, lift: 0, label: 'ADVENT', area: { ...ADVENT } });
  rooms.park.spots.push({ kind: 'snowman', x: SNOWMAN.x + 26, y: SNOWMAN.y + 6, sx: SNOWMAN.x + 26, sy: SNOWMAN.y + 6, lift: 0, label: 'SNOWMAN', area: { x0: SNOWMAN.x - 22, y0: SNOWMAN.y - 70, x1: SNOWMAN.x + 22, y1: SNOWMAN.y + 4 } });
  rooms.park.blockers.push({ x0: SNOWMAN.x - 14, y0: SNOWMAN.y - 6, x1: SNOWMAN.x + 14, y1: SNOWMAN.y + 2 });
  freezePond(rooms.park);
  if (labTracks && rooms.lab.music) rooms.lab.music.tracks = labTracks;
}

// ---------- drawing ----------
/** Behind the players: snow on the ground, lights, wreaths, the sleigh, the pond, the advent calendar, New Year's fireworks. */
export function winterBack(room: Room, a: number): void {
  const id = room.id;
  if (OUTDOOR.includes(id)) PX.ctx.drawImage(snowLayer(room), 0, 0);
  if (id === 'park') ice(a);
  lights(id, a); wreaths(room);
  if (id === 'lab') advent(a);
  if (id === 'roof') { for (let x = 0; x < 1860; x += 6) { const L = 3 + Math.floor(h1(x * 0.7) * 7); r(x, 454, 2, L, [220, 236, 250]); r(x, 454 + L, 1, 1, K.WHITE); } } // icicles along the parapet
  sleighBits(id, a);
  if (id === 'plaza') nyeShow([400, 470], 1400); else if (id === 'roof') nyeShow([300, 420], 1860); else if (id === 'pier') nyeShow([320, 380], 1300); else if (id === 'park') nyeShow([390, 440], 1600);
}
/** Depth-sorted: the presents to find, the tree, the snowman, the snowball-fight sign. */
export function winterProps(id: RoomId): Prop[] {
  const out: Prop[] = [];
  PRESENTS.forEach((p, n) => { if (p.room === id) out.push({ y: p.y, draw: (a) => { const got = WINTER.presents.has(n); present(p.x, p.y, n % 6, 1, got); if (!got) { lit(() => r(p.x - 1, p.y - 24 - Math.round(Math.abs(Math.sin(a * 3 + n)) * 2), 2, 2, K.GOLD)); Gd(p.x, p.y - 8, 10, [255, 220, 150], 0.25); } } }); });
  if (id === 'plaza') {
    out.push(treeProp);
    out.push({ y: 604, draw: (a) => { const x = 1000; r(x - 1, 570, 3, 34, [110, 70, 40]); r(x - 16, 560, 32, 14, [236, 242, 250]); r(x - 16, 560, 32, 1, K.WHITE); txt('SNOWBALL', x - tw('SNOWBALL') / 2, 562, [90, 130, 230]); txt('FIGHT!', x - tw('FIGHT!') / 2, 568, [214, 44, 56]); const f = WINTER.snowfight; if (f && Date.now() - f.t0 < 90000) lit(() => r(x - 2, 554 - Math.round(Math.abs(Math.sin(a * 5)) * 2), 4, 4, [255, 90, 90])); } });
  }
  if (id === 'park') out.push(snowmanProp);
  for (const [x, y] of XTREES[id] ?? []) out.push({ y, draw: (a) => smallTree(x, y, a) });
  return out;
}
/** Over everything: gentle snowflakes outdoors (on top of any snowy weather), and New Year's confetti anywhere. */
export function winterFront(room: Room, a: number, cam: { x: number; y: number; w: number; h: number }, snowing: boolean): void {
  if (OUTDOOR.includes(room.id) && !snowing) {
    lit(() => { for (let k = 0; k < 60; k++) { const sp = 12 + h1(k) * 14, x = cam.x + ((h1(k * 3.3) * cam.w + Math.sin(a * 0.7 + k) * 20 + a * 6) % cam.w), y = cam.y + ((h1(k * 1.7) * cam.h + a * sp) % cam.h); r(Math.round(x), Math.round(y), k % 5 ? 1 : 2, k % 5 ? 1 : 2, [236, 242, 250]); } });
  }
  const s = nye().since;
  if (s >= 0 && s < 60) lit(() => { for (let k = 0; k < 120; k++) { const x = cam.x + h1(k * 3.1) * cam.w + Math.sin(a * 2 + k) * 8, y = cam.y + ((h1(k * 1.3) * cam.h + (s + a) * (40 + h1(k) * 60)) % cam.h); r(Math.round(x), Math.round(y), 2, 2, CONFETTI[k % CONFETTI.length]); } });
  if (s >= 0 && s < 1.5) G(cam.x, cam.y, cam.w, cam.h, [255, 240, 200], 0.4 * (1 - s / 1.5));
}
