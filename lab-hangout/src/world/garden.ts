// THE COMMUNITY GARDEN on the Rooftop (the right-hand end of the roof). 8 raised beds per
// server; plant a seed and it grows in real time, on the server's clock (see
// supabase/migrations/0008_gardens.sql, which does the same sums as growth() below).
// Anyone can water anyone's plant; no water for a day and it wilts, three days and it dies.
// The beds are drawn from GARDEN.plots, which main.ts fetches while you're on the roof.

import { K, RK, type RGB } from '../engine/palette';
import { r, txt, tw, lit, Gd, alpha, line, M, shade } from '../engine/pixel';
import type { Plot } from '../net/transport';
import type { Prop, Spot } from './room';

/** Keep in step with private.seeds. `find` = can't be bought, only found at harvest. */
export const SEEDS: { name: string; cost: number; growS: number; pays: number; find?: boolean }[] = [
  { name: 'RADISH', cost: 2, growS: 3600, pays: 4 },
  { name: 'SUNFLOWER', cost: 3, growS: 10800, pays: 7 },
  { name: 'TOMATO', cost: 4, growS: 21600, pays: 10 },
  { name: 'PUMPKIN', cost: 5, growS: 43200, pays: 15 },
  { name: 'MOONFLOWER', cost: 0, growS: 28800, pays: 25, find: true },
];
/** Bed centres (x, front edge y): two rows of four. Index = bed id 0..7. */
export const BEDS: [number, number][] = [1150, 1240, 1330, 1420].flatMap((x) => [[x, 532], [x, 612]] as [number, number][]).sort((p, q) => p[1] - q[1] || p[0] - q[0]);
export const GARDEN_X0 = 1090;
export const GARDEN = { plots: [] as Plot[], fetchedAt: 0, dirty: true, /** LOCAL-mode test speed-up (?grow=60) */ speed: 1, /** bed -> when it was watered here (splash) */ splash: new Map<number, number>() };

const H24 = 86400, H3 = 10800, H72 = 259200;
/** Seconds of growth a plant has at time `at` (ms): grows only while not wilted, 1.25x for 3 h after watering. */
export function growth(p: Plot, at: number): number {
  const k = GARDEN.speed, t = (at - p.calcAt) / 1000 * k, sinceWater = (p.calcAt - p.lastWater) / 1000 * k;
  const alive = Math.max(0, Math.min(t, H24 - sinceWater)), boosted = Math.max(0, Math.min(t, H3 - sinceWater));
  return p.grown + alive + 0.25 * boosted;
}
/** How a plant is doing: stage 0 seed, 1 sprout, 2 leafy, 3 flowering, 4 ripe; wet = watered < 30 min ago. */
export function plantState(p: Plot, at = Date.now()): { stage: number; wilted: boolean; dead: boolean; wet: boolean; left: number; dryFor: number } {
  const s = SEEDS[p.seed] ?? SEEDS[0], u = growth(p, at) / s.growS, dry = (at - p.lastWater) / 1000 * GARDEN.speed;
  return { stage: u >= 1 ? 4 : u >= 0.7 ? 3 : u >= 0.35 ? 2 : u >= 0.1 ? 1 : 0, wilted: dry > H24, dead: dry > H72, wet: dry < 1800, left: Math.max(0, s.growS - growth(p, at)) / GARDEN.speed, dryFor: dry };
}
const STAGES = ['JUST PLANTED', 'SPROUTING', 'LEAFY', 'FLOWERING', 'RIPE'];
export function duration(sec: number): string { const m = Math.ceil(sec / 60); return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm'; }
/** One line about a plant, for a toast. */
export function plantLine(p: Plot, mine: boolean): string {
  const st = plantState(p), s = SEEDS[p.seed];
  const who = mine ? 'YOUR ' : p.ownerName + "'S ";
  if (st.dead) return who + s.name + ' DIED OF THIRST';
  return who + s.name + ' · ' + (st.wilted ? 'WILTING, NEEDS WATER' : STAGES[st.stage]) + (st.stage < 4 && !st.wilted ? ' · RIPE IN ' + duration(st.left) : '') + (st.wet ? ' · JUST WATERED' : '');
}

// ---------- drawing ----------
const LEAF: RGB = [82, 176, 104], LEAF_DK: RGB = [52, 130, 78], WILT: RGB = [150, 128, 70], DEAD: RGB = [110, 100, 90];
function plant(x: number, y: number, seed: number, stage: number, wilted: boolean, dead: boolean, a: number): void {
  if (dead) { line(x - 4, y, x - 7, y - 8, DEAD); line(x + 3, y, x + 6, y - 7, DEAD); line(x, y, x, y - 10, DEAD); return; }
  const lf = wilted ? WILT : LEAF, ld = wilted ? shade(WILT, 0.75) : LEAF_DK, droop = wilted ? 2 : 0, sway = Math.round(Math.sin(a * 1.4 + x) * (wilted ? 0 : 1));
  if (stage === 0) { r(x - 3, y - 2, 7, 2, [70, 48, 32]); r(x + 5, y - 9, 1, 8, [150, 110, 70]); r(x + 3, y - 10, 5, 3, [240, 236, 220]); return; } // mound + seed marker
  if (stage === 1) { r(x, y - 4, 1, 4, ld); r(x - 3 + sway, y - 6 + droop, 3, 2, lf); r(x + 1 + sway, y - 6 + droop, 3, 2, lf); return; }
  const tall = seed === 1 ? 30 : seed === 2 ? 18 : seed === 4 ? 20 : seed === 3 ? 8 : 9, h = stage === 2 ? Math.round(tall * 0.6) : tall;
  if (seed === 3) { // pumpkin: a low vine along the soil
    for (let k = -14; k <= 14; k += 2) r(x + k, y - 2 - Math.round(Math.abs(Math.sin(k * 0.4)) * 2), 2, 1, ld);
    for (const lx of [-11, -3, 6, 12]) { r(x + lx, y - 6 + droop, 4, 3, lf); r(x + lx, y - 6 + droop, 2, 1, M(lf, [255, 255, 255], 0.2)); }
  } else {
    r(x + sway, y - h, 1, h, ld);
    for (let j = 3; j < h - 2; j += 4) { const side = j % 8 === 3 ? -1 : 1; r(x + sway + (side < 0 ? -4 : 1), y - j - 1 + droop, 4, 2, lf); }
    if (seed === 0 || seed === 2) for (let k = -2; k <= 2; k++) r(x + k * 2 + sway, y - h - 1 + Math.abs(k) + droop, 2, 3, lf);
  }
  if (stage === 3) { // flowers / buds
    const fc: RGB = seed === 1 || seed === 3 || seed === 2 ? [255, 214, 90] : seed === 4 ? [200, 220, 255] : [255, 255, 255];
    if (seed === 1) { r(x + sway - 2, y - h - 3, 5, 4, LEAF_DK); r(x + sway - 1, y - h - 4, 3, 1, fc); }
    else if (seed === 3) r(x - 2, y - 9, 3, 3, fc);
    else if (seed === 4) { lit(() => r(x + sway - 1, y - h - 3, 3, 3, fc)); Gd(x + sway, y - h - 2, 6, fc, 0.25); }
    else for (const [dx, dy] of [[-3, 6], [2, 9], [-1, 12]] as [number, number][]) if (h > dy) r(x + dx + sway, y - dy, 2, 2, fc);
  }
  if (stage === 4) { // the crop
    if (seed === 0) { r(x - 3, y - 4, 7, 5, [220, 50, 70]); r(x - 2, y - 4, 2, 2, [255, 120, 140]); r(x, y + 1, 1, 2, [240, 220, 220]); }
    else if (seed === 1) { const cx = x + sway, cy = y - h - 3; for (let k = 0; k < 10; k++) { const an = k * 0.628 + a * 0.2; r(Math.round(cx + Math.cos(an) * 5) - 1, Math.round(cy + Math.sin(an) * 5) - 1, 3, 3, [255, 214, 60]); } r(cx - 3, cy - 3, 7, 7, [120, 70, 30]); r(cx - 2, cy - 2, 2, 2, [160, 100, 50]); }
    else if (seed === 2) for (const [dx, dy] of [[-4, 6], [2, 8], [-2, 12], [3, 14]] as [number, number][]) { r(x + dx + sway, y - dy, 4, 4, [230, 50, 50]); r(x + dx + sway, y - dy, 1, 1, [255, 150, 140]); }
    else if (seed === 3) { const o: RGB = [232, 120, 36]; for (let j = 0; j < 10; j++) { const hw = Math.round(8 * Math.sqrt(1 - ((j - 5) / 5.5) ** 2)); r(x + 2 - hw, y - 11 + j, hw * 2, 1, j > 7 ? shade(o, 0.8) : o); } r(x + 1, y - 13, 2, 3, [80, 130, 60]); r(x - 3, y - 10, 1, 8, shade(o, 0.8)); r(x + 6, y - 10, 1, 8, shade(o, 0.8)); }
    else { const c: RGB = [230, 240, 255]; lit(() => { r(x + sway - 3, y - h - 5, 7, 5, c); r(x + sway - 1, y - h - 7, 3, 9, c); r(x + sway - 1, y - h - 4, 3, 3, [150, 200, 255]); }); Gd(x + sway, y - h - 3, 14, [170, 210, 255], 0.45 + 0.15 * Math.sin(a * 2)); }
    if (!wilted) lit(() => { const t = (a * 1.2 + x * 0.01) % 1; r(x + 8, y - 16 - Math.round(t * 6), 1, 1, K.WHITE); r(x - 9, y - 10 - Math.round(((t + 0.5) % 1) * 6), 1, 1, [255, 240, 180]); });
  }
}
function bed(i: number, a: number): void {
  const [x, y] = BEDS[i], p = GARDEN.plots.find((q) => q.bed === i), st = p ? plantState(p) : null;
  const wood = RK.PLANTER, woodHi = RK.PLANTER_HI, soilWet = st && st.dryFor < H3;
  r(x - 32, y - 16, 64, 16, wood); r(x - 32, y - 16, 64, 2, woodHi); r(x - 32, y - 2, 64, 2, shade(wood, 0.7)); r(x - 32, y - 16, 2, 16, shade(wood, 0.8)); r(x + 30, y - 16, 2, 16, shade(wood, 0.8));
  r(x - 29, y - 14, 58, 5, soilWet ? [52, 34, 24] : [84, 60, 42]); for (let k = 0; k < 8; k++) r(x - 27 + k * 7, y - 13 + (k % 2), 2, 1, soilWet ? [40, 26, 18] : [100, 74, 52]);
  if (soilWet) r(x - 20, y - 13, 6, 1, [120, 150, 190]);
  // a little tag on the front: who it belongs to (or FREE)
  const label = p ? p.ownerName.slice(0, 12) : 'FREE';
  txt(label, x - tw(label) / 2, y - 8, p ? [255, 243, 214] : [170, 150, 120]);
  if (p && st) plant(x, y - 14, p.seed, st.stage, st.wilted, st.dead, a);
  if (p && st && st.stage === 4 && !st.dead) { const bob = Math.round(Math.abs(Math.sin(a * 3)) * 2); lit(() => txt('READY', x - tw('READY') / 2, y - 50 - bob, [255, 214, 90])); }
  const sp = GARDEN.splash.get(i), u = sp ? performance.now() / 1000 - sp : 9;
  if (u < 0.8) alpha(1 - u / 0.8, () => { for (let k = 0; k < 8; k++) r(x - 14 + k * 4, y - 30 + Math.round(u * 26 + (k % 3) * 3), 1, 2, [150, 200, 255]); });
}

/** The fence, sign and seed stall at the back of the garden (drawn in drawBack). */
export function gardenBack(a: number): void {
  const x0 = GARDEN_X0, y = 470;
  for (let x = x0; x < 1490; x += 12) { r(x, y - 22, 4, 22, [226, 214, 190]); r(x + 1, y - 24, 2, 2, [226, 214, 190]); }
  r(x0, y - 16, 1490 - x0, 2, [200, 186, 160]); r(x0, y - 7, 1490 - x0, 2, [200, 186, 160]);
  const s = 'COMMUNITY GARDEN'; r(1290 - tw(s) / 2 - 6, y - 44, tw(s) + 12, 13, [60, 80, 50]); r(1290 - tw(s) / 2 - 6, y - 44, tw(s) + 12, 1, [100, 130, 80]);
  txt(s, 1290 - tw(s) / 2, y - 40, [230, 240, 200]); r(1289, y - 31, 2, 10, RK.POLE);
  // seed stall: a crate of packets with a price board, and the water butt
  r(1104, y - 8, 30, 14, RK.CRATE); r(1104, y - 8, 30, 2, [170, 110, 70]);
  for (let k = 0; k < 4; k++) { const c: RGB = ([[220, 50, 70], [255, 214, 60], [230, 50, 50], [232, 120, 36]] as RGB[])[k]; r(1107 + k * 7, y - 16, 5, 8, [240, 236, 220]); r(1108 + k * 7, y - 14, 3, 3, c); }
  r(1104, y - 34, 30, 14, [40, 44, 36]); txt('SEEDS', 1119 - tw('SEEDS') / 2, y - 30, [230, 240, 200]);
  r(1460, y - 14, 18, 20, [70, 90, 110]); r(1460, y - 14, 18, 2, [100, 130, 160]); r(1462, y - 4, 14, 1, [50, 66, 82]);
  if ((a * 0.5) % 1 < 0.1) lit(() => r(1468, y + 6, 1, 2, [150, 200, 255]));
}

/** The 8 beds as depth-sorted props. */
export const GARDEN_PROPS: Prop[] = BEDS.map(([, y], i) => ({ y, draw: (a: number) => bed(i, a) }));
/** One spot per bed: plant / water / harvest. Appended to the roof's spots (index = network id). */
export const GARDEN_SPOTS: Spot[] = BEDS.map(([x, y], n) => ({ kind: 'bed', n, x, y: y + 12, sx: x, sy: y + 12, lift: 0, label: 'GARDEN', area: { x0: x - 32, y0: y - 40, x1: x + 32, y1: y } }));
export const GARDEN_BLOCKERS = BEDS.map(([x, y]) => ({ x0: x - 32, y0: y - 12, x1: x + 32, y1: y + 2 }));
