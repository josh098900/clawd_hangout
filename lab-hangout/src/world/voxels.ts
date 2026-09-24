// Oblique voxel "creations" from the film (VS=6 face, VD=3 depth), with top/front/right
// shading, a 1px dark outline, cached once, and an occasional diagonal shine sweep.

import { type RGB } from '../engine/palette';
import { PX, mk, r, shade, withCtx } from '../engine/pixel';
import { h1 } from '../engine/math';

export const VS = 6, VD = 3;

interface Vox { x: number; y: number; z: number; c: RGB; up: number; rt: number; fr: number }
export interface Creation {
  vox: Vox[];
  paint: number[];
  bx: number; by: number; bw: number; bh: number;
  cache?: HTMLCanvasElement;
  sil?: HTMLCanvasElement;
}

function voxelShade(c: RGB) { return { top: shade(c, 1.18), front: c, right: shade(c, 0.68), edge: shade(c, 1.3) }; }

export function makeCreation(list: { x: number; y: number; z: number; c: RGB }[]): Creation {
  const map = new Map<string, number>();
  const vox: Vox[] = [];
  for (const q of list) { const k = q.x + ',' + q.y + ',' + q.z; if (map.has(k)) continue; map.set(k, vox.length); vox.push({ ...q, up: -1, rt: -1, fr: -1 }); }
  const nb = (x: number, y: number, z: number) => map.get(x + ',' + y + ',' + z) ?? -1;
  for (const q of vox) { q.up = nb(q.x, q.y + 1, q.z); q.rt = nb(q.x + 1, q.y, q.z); q.fr = nb(q.x, q.y, q.z - 1); }
  const paint = vox.map((_, i) => i).sort((p, q) => vox[q].z - vox[p].z || vox[p].y - vox[q].y || vox[p].x - vox[q].x);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const q of vox) { const X = q.x * VS + q.z * VD, Y = -(q.y + 1) * VS - q.z * VD; x0 = Math.min(x0, X); y0 = Math.min(y0, Y - VD); x1 = Math.max(x1, X + VS + VD); y1 = Math.max(y1, Y + VS); }
  return { vox, paint, bx: x0, by: y0, bw: x1 - x0 + 1, bh: y1 - y0 + 1 };
}

function drawVoxels(C: Creation, ox: number, oy: number): void {
  for (const i of C.paint) {
    const q = C.vox[i], X = ox + q.x * VS + q.z * VD, Y = oy - (q.y + 1) * VS - q.z * VD, sh = voxelShade(q.c);
    if (q.up < 0) for (let k = 1; k <= VD; k++) r(X + k, Y - k, VS, 1, sh.top);
    if (q.rt < 0) for (let k = 1; k <= VD; k++) r(X + VS - 1 + k, Y - k + 1, 1, VS, sh.right);
    if (q.fr < 0) { r(X, Y, VS, VS, sh.front); r(X, Y, VS, 1, sh.edge); }
  }
}

function bake(C: Creation): void {
  const raw = mk(C.bw + 4, C.bh + 4);
  const pe = PX.emit, pd = PX.dim, pf = PX.fl;
  PX.emit = true; PX.dim = 0; PX.fl = 0;
  withCtx(raw.getContext('2d')!, () => drawVoxels(C, -C.bx + 2, -C.by + 2));
  PX.emit = pe; PX.dim = pd; PX.fl = pf;
  const sil = mk(raw.width, raw.height), sx = sil.getContext('2d')!;
  sx.drawImage(raw, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#0A0E22'; sx.fillRect(0, 0, sil.width, sil.height);
  const cv = mk(raw.width, raw.height), cx = cv.getContext('2d')!;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) cx.drawImage(sil, dx, dy);
  cx.drawImage(raw, 0, 0);
  C.cache = cv; C.sil = sil;
}

const shc = mk(8, 8), shx = shc.getContext('2d')!;
function shine(sil: HTMLCanvasElement, x: number, y: number, u: number): void {
  if (shc.width < sil.width || shc.height < sil.height) { shc.width = sil.width + 8; shc.height = sil.height + 8; }
  shx.clearRect(0, 0, shc.width, shc.height); shx.globalCompositeOperation = 'source-over'; shx.drawImage(sil, 0, 0); shx.globalCompositeOperation = 'source-in'; shx.fillStyle = '#FFFFFF';
  const bx = -40 + u * (sil.width + 80); shx.beginPath(); shx.moveTo(bx, 0); shx.lineTo(bx + 14, 0); shx.lineTo(bx + 14 - sil.height * 0.6, sil.height); shx.lineTo(bx - sil.height * 0.6, sil.height); shx.closePath(); shx.fill(); shx.globalCompositeOperation = 'source-over';
  PX.ctx.globalAlpha = 0.85; PX.ctx.drawImage(shc, 0, 0, sil.width, sil.height, x, y, sil.width, sil.height); PX.ctx.globalAlpha = 1;
}

/** Draw a finished creation with its feet at (ox,oy). `shineU` in [0,1) sweeps a highlight. */
export function placeCreation(C: Creation, ox: number, oy: number, shineU = -1): void {
  if (!C.cache) bake(C);
  PX.ctx.drawImage(C.cache!, ox + C.bx - 2, oy + C.by - 2);
  if (shineU >= 0 && shineU < 1) shine(C.sil!, ox + C.bx - 2, oy + C.by - 2, shineU);
}

// ---- the three creations Astra built in the film ----
export const CASTLE = (() => {
  const v: { x: number; y: number; z: number; c: RGB }[] = [], add = (x: number, y: number, z: number, c: RGB) => v.push({ x, y, z, c });
  const stone = (x: number, y: number): RGB => (h1(x * 3.1 + y * 7.7) > 0.7 ? [160, 170, 196] : [184, 194, 218]), roof: RGB = [232, 106, 146], flag: RGB = [255, 214, 90];
  for (let x = 0; x < 20; x++) for (let y = 0; y < 6; y++) { if (x >= 8 && x <= 11 && y <= 2) continue; if ((x === 9 || x === 10) && y === 3) continue; add(x, y, 0, stone(x, y)); }
  for (let x = 4; x <= 15; x += 2) add(x, 6, 0, stone(x, 6));
  for (const tx of [0, 17]) for (let x = tx; x < tx + 3; x++) for (let z = 0; z < 3; z++) for (let y = 0; y < 10; y++) add(x, y, z, y === 6 && z === 0 && x === tx + 1 ? [40, 50, 96] : stone(x, y + z));
  for (const tx of [0, 17]) { for (let x = tx; x < tx + 3; x++) for (let z = 0; z < 3; z++) add(x, 10, z, roof); add(tx + 1, 11, 1, roof); add(tx + 1, 12, 1, flag); }
  for (let x = 7; x < 13; x++) for (let z = 1; z < 4; z++) for (let y = 6; y < 10; y++) add(x, y, z, stone(x, y));
  for (let x = 7; x < 13; x++) for (let z = 1; z < 4; z++) add(x, 10, z, roof);
  for (let x = 8; x < 12; x++) add(x, 11, 2, roof); add(9, 12, 2, roof); add(10, 12, 2, roof); add(9, 13, 2, flag); add(9, 14, 2, flag);
  return makeCreation(v);
})();

export interface Coaster extends Creation { path: { x: number; y: number }[] }
export const COASTER: Coaster = (() => {
  const v: { x: number; y: number; z: number; c: RGB }[] = [], path: { x: number; y: number; k: string }[] = [];
  const pts: [number, number][] = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([u * 9, 1 + Math.sin(u * Math.PI * 0.5) * 11]); }
  for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push([9 + u * 6, 12 - u * 10]); }
  for (let i = 0; i <= 60; i++) { const an = -Math.PI / 2 + (i / 60) * Math.PI * 2; pts.push([21 + Math.cos(an) * 6 + (i / 60) * 1.5, 8 + Math.sin(an) * 6]); }
  for (let i = 0; i <= 16; i++) pts.push([22.5 + i * 0.6, 2 - Math.min(1, i / 8)]);
  for (const [px, py] of pts) { const x = Math.round(px), y = Math.round(py), k = x + ',' + y; if (path.length && path[path.length - 1].k === k) continue; path.push({ x, y, k }); v.push({ x, y, z: 1, c: [230, 70, 86] }); }
  for (const p of path) if (p.x % 3 === 0 && p.y > 1 && !(p.x >= 15 && p.x <= 27 && p.y > 3)) for (let y = 0; y < p.y; y++) v.push({ x: p.x, y, z: 1, c: [208, 214, 230] });
  return Object.assign(makeCreation(v), { path });
})();

function dragonVox(state: 'up' | 'mid' | 'down') {
  const v: { x: number; y: number; z: number; c: RGB }[] = [], add = (x: number, y: number, z: number, c: RGB) => v.push({ x, y, z, c });
  const G1: RGB = [52, 195, 143], G2: RGB = [38, 160, 118], BEL: RGB = [255, 160, 90], W: RGB = [120, 226, 176], WE: RGB = [60, 170, 120];
  for (let x = 6; x <= 20; x++) for (let y = 3; y <= 6; y++) for (let z = 1; z <= 2; z++) add(x, y, z, y === 3 ? BEL : y === 6 && h1(x) > 0.5 ? G2 : G1);
  for (let y = 5; y <= 8; y++) for (let x = 20; x <= 22; x++) add(x, y, 1, G1);
  for (let x = 22; x <= 27; x++) for (let y = 7; y <= 10; y++) for (let z = 0; z <= 2; z++) { if (x >= 25 && y >= 9) continue; add(x, y, z, x === 24 && y === 9 && z === 0 ? [255, 236, 120] : y === 7 && x >= 25 ? BEL : G1); }
  add(23, 11, 1, [240, 240, 220]); add(26, 10, 1, [240, 240, 220]);
  ([[5, 4], [4, 4], [3, 3], [2, 3], [1, 2], [0, 2], [-1, 1]] as [number, number][]).forEach(([x, y]) => add(x, y, 1, G1));
  ([[-2, 1], [-2, 2], [-2, 0], [-3, 1]] as [number, number][]).forEach(([x, y]) => add(x, y, 1, BEL));
  for (const lx of [9, 16]) for (let y = 1; y <= 2; y++) add(lx, y, 1, G2);
  for (const sx of [8, 11, 14, 17]) add(sx, 7, 1, BEL);
  const rows = state === 'up' ? [[8, 10, 16], [9, 9, 16], [10, 9, 15], [11, 10, 14], [12, 11, 13]] : state === 'mid' ? [[7, 9, 16], [7, 9, 16], [7, 10, 15], [7, 11, 14]] : [[6, 10, 16], [5, 10, 16], [4, 11, 15], [3, 12, 14], [2, 13, 13]];
  rows.forEach(([y, xa, xb], j) => { for (let x = xa; x <= xb; x++) add(x, y, state === 'mid' ? 3 + j : 3, x === xa || x === xb ? WE : W); });
  return v;
}
export const DRAGON = { up: makeCreation(dragonVox('up')), mid: makeCreation(dragonVox('mid')), down: makeCreation(dragonVox('down')) };
/** Idle flap cycle: holds, then one flap every ~3.2s. */
export function dragonState(a: number): 'up' | 'mid' | 'down' {
  const q = ((a % 3.2) + 3.2) % 3.2;
  if (q < 0.1) return 'mid'; if (q < 0.24) return 'down'; if (q < 0.34) return 'mid'; return 'up';
}
