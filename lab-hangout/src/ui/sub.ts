// SARDINE 1's panels (features/sub.ts opens them): THE TREASURE BIN (this dive's finds, and the notes out of any bottles), the PERISCOPE
// (a round view you turn with the arrows: the real city from the surface, water and a curious fish deeper down, the pen at the dock),
// and THE DIVE REPORT when it surfaces.

import { K, SEA, type RGB } from '../engine/palette';
import { PX, r, disc, oval, ring, txt, tw, mk, withCtx, M, alpha } from '../engine/pixel';
import { clamp, h1 } from '../engine/math';
import { FIND_NAMES, type FindKind } from '../game/sub';
import { drawFind, anglerfish } from '../world/sealife';
import { basePose, stampCritter } from '../entities/critter';
import { flight } from '../world/space';
import { rocketOnRoof } from '../world/roof';
import { gridOn, meltAgo } from '../world/grid';
import { button, font, heldKeys, openModal, row } from './modal';

const HEAD = { fontFamily: "'Press Start 2P', monospace", fontSize: '11px', color: '#FFD65A', textAlign: 'center' };
/** Draw into a little canvas with the lighting off (and the glow going nowhere). */
function paint(w: number, h: number, fn: (g: CanvasRenderingContext2D) => void, scale = 3): HTMLCanvasElement {
  const c = mk(w, h), g = c.getContext('2d')!, glow = PX.glow, d = PX.dim, e = PX.emit, f = PX.fl;
  PX.glow = mk(4, 4).getContext('2d')!; PX.dim = 0; PX.emit = false; PX.fl = 0;
  try { withCtx(g, () => fn(g)); } finally { PX.glow = glow; PX.dim = d; PX.emit = e; PX.fl = f; }
  c.style.width = w * scale + 'px'; c.style.height = h * scale + 'px'; c.style.imageRendering = 'pixelated'; c.style.flex = 'none';
  return c;
}

// ---------------------------------------------------------------- THE TREASURE BIN ----------------------------------------------------------------
export function openBin(items: { kind: string; note: string | null }[], onClose: () => void): void {
  const m = openModal('THE TREASURE BIN', onClose);
  const head = document.createElement('div'); Object.assign(head.style, HEAD); head.textContent = items.length ? items.length + (items.length === 1 ? ' FIND' : ' FINDS') + ' THIS DIVE' : 'EMPTY';
  const sub = document.createElement('div'); Object.assign(sub.style, { ...font(18, '#9FEFFF'), textAlign: 'center', maxWidth: 'min(560px, 86vw)' });
  sub.textContent = items.length ? 'Every find pays a token when we surface (up to 4). Some of it is even treasure.' : 'Nothing yet. The CLAW\'s by the sonar: get within 40 m of the bottom, line it up, and GRAB.';
  const list = document.createElement('div'); Object.assign(list.style, { display: 'flex', flexDirection: 'column', gap: '6px', width: 'min(560px, 86vw)', maxHeight: '50vh', overflowY: 'auto' });
  for (const it of items) {
    const cell = document.createElement('div'); Object.assign(cell.style, { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', background: 'rgba(255,214,90,.07)', borderLeft: '3px solid #FFD65A', ...font(19, '#FFF3D6'), textAlign: 'left' });
    const pic = paint(26, 18, () => drawFind(it.kind, 13, 15, 0.3));
    const txt2 = document.createElement('div'); txt2.style.flex = '1';
    const nm = document.createElement('div'); nm.textContent = FIND_NAMES[it.kind as FindKind] ?? it.kind.toUpperCase(); txt2.appendChild(nm);
    if (it.note) { const n = document.createElement('div'); n.textContent = '"' + it.note + '"'; Object.assign(n.style, font(17, '#E8D8C0')); txt2.appendChild(n); }
    cell.append(pic, txt2); list.appendChild(cell);
  }
  m.body.append(head, sub, list, row(button('CLOSE', m.close, true)));
}

// ---------------------------------------------------------------- THE PERISCOPE ----------------------------------------------------------------
export interface PeriscopeHooks { /** The sub's depth (m), or -1 at the dock. */ depth(): number; day(): number; weather(): string; flash(): number }
const VW = 96, VH = 96, PANO = 480;
/** The view all the way round from the surface (0..PANO px = 360°), as it really is: the shore, with the city behind it (THE LOFTS, the
 *  reactor's cooling tower steaming while a shift's on, the Roof's launch tower with the rocket on its real timetable), the beach, the
 *  Pier on its legs, the lighthouse, the aquarium and its whale tail; then the open sea: the sun going down over it, a ship, a buoy.
 *  The sky and the weather as they are. (Exported for the golden fingerprints.) */
export function surfaceView(x0: number, day: number, wx: string, fl: number, a: number): void {
  const horizon = 58, wet = wx === 'rain' || wx === 'storm', snow = wx === 'snow', over = wet || snow, dusk = clamp(1 - Math.abs(day - 0.42) / 0.22, 0, 1), night = clamp(1 - day * 2.2, 0, 1);
  const grey = (c: RGB): RGB => (wet ? M(c, M([96, 104, 116], [22, 26, 36], night), 0.6) : snow ? M(c, M([196, 202, 212], [34, 38, 52], night), 0.6) : c); // (overcast: a lid of grey cloud, paler for snow)
  const top = grey(M([12, 16, 40], [78, 152, 222], day)), low = grey(M(M([28, 34, 66], [176, 216, 240], day), [252, 150, 86], dusk * 0.7));
  for (let y = 0; y < horizon; y += 2) r(0, y, VW, 2, M(top, low, (y / horizon) ** 1.4));
  /** Where a bearing (degrees) is across the view, in -64..PANO-64 so things slide in from both edges. */
  const at = (deg: number): number => { let x = ((deg / 360) * PANO - x0) % PANO; if (x < -64) x += PANO; if (x >= PANO - 64) x -= PANO; return Math.round(x); };
  const seen = (x: number, w: number): boolean => x > -w - 2 && x < VW + 2;
  // the sun going down over the sea, or the moon; stars at night
  if (!over) { const sx = at(228), sy = Math.round(10 + (1 - day) * 44); if (seen(sx, 12) && day > 0.18) { alpha(0.25, () => disc(sx, sy, 9, M([255, 240, 190], [255, 170, 90], dusk))); disc(sx, sy, 5, M([255, 250, 220], [255, 190, 110], dusk)); } }
  if (night > 0.3) {
    for (let k = 0; k < 28; k++) { const sx = at(h1(k * 3.1) * 360), sy = Math.floor(h1(k) * 44); if (seen(sx, 1) && !over) alpha(night * (0.5 + 0.5 * Math.sin(a * 2 + k)), () => r(sx, sy, 1, 1, [230, 230, 250])); }
    const mx = at(300); if (seen(mx, 8) && !over) { disc(mx, 14, 4, [236, 232, 214]); disc(mx + 2, 13, 3, top); }
  }
  // clouds drifting over (a few when it's fine, a lid of them in the rain)
  const nc = over ? 14 : wx === 'fog' ? 8 : 6, cc = grey(M(M([46, 52, 80], [250, 252, 255], day), [255, 190, 170], dusk * 0.5));
  for (let k = 0; k < nc; k++) { const cx = at((h1(k * 5.3) * 360 + a * 0.4) % 360), cy = 6 + Math.floor(h1(k * 2.2) * (over ? 18 : 26)), w = 10 + Math.floor(h1(k * 1.7) * 12);
    if (seen(cx, w)) alpha(over ? 0.9 : 0.75, () => { oval(cx, cy, w / 2, 3, cc); oval(cx - w / 4, cy - 2, w / 4, 3, cc); oval(cx + w / 5, cy - 2, w / 5 + 1, 3, cc); }); }
  // the city behind the shore: blocks in the Square's colours (hazy with distance), lit windows at night
  const haze = M(low, top, 0.2), dark = M([18, 22, 40], [26, 30, 52], dusk);
  const tone = (c: RGB): RGB => M(M(c, haze, 0.32), dark, night * 0.75);
  const BLOCKS: RGB[] = [[168, 92, 72], [92, 136, 150], [214, 196, 158], [124, 128, 146], [186, 132, 92], [98, 110, 132]];
  for (let k = 0; k < 22; k++) {
    const bx = at(22 + k * 3.4 + h1(k * 9) * 2), w = 5 + Math.floor(h1(k * 7.7) * 4), h = 9 + Math.floor(h1(k * 7) * 13); if (!seen(bx, w)) continue;
    const c = tone(BLOCKS[k % BLOCKS.length]); r(bx, horizon - 4 - h, w, h, c); r(bx, horizon - 4 - h, w, 1, M(c, K.WHITE, 0.15 * day));
    for (let wy = horizon - 2 - h; wy < horizon - 6; wy += 3) for (let wx2 = bx + 1; wx2 < bx + w - 1; wx2 += 2) { const lit2 = h1(k * 31 + wy * 7 + wx2) > 0.45; r(wx2, wy, 1, 1, night > 0.3 && lit2 ? M([255, 214, 130], [255, 236, 180], h1(wx2 + wy)) : M(c, [30, 36, 56], 0.35)); }
    if (h1(k * 4.4) > 0.7) r(bx + 1, horizon - 6 - h, 2, 2, M(c, [30, 36, 56], 0.3)); // (a water tank)
  }
  // THE LOFTS, taller than the rest, with its red beacon
  { const lx = at(56); if (seen(lx, 9)) { const c = tone([150, 84, 70]); r(lx, horizon - 32, 9, 28, c); for (let wy = horizon - 30; wy < horizon - 6; wy += 3) for (let k = 0; k < 4; k++) r(lx + 1 + k * 2, wy, 1, 1, night > 0.3 && h1(wy * 3 + k) > 0.35 ? [255, 214, 130] : M(c, [30, 36, 56], 0.35)); r(lx + 4, horizon - 35, 1, 3, tone([90, 90, 100])); if (Math.sin(a * 3) > 0) r(lx + 4, horizon - 36, 1, 1, [255, 70, 60]); } }
  // the reactor's cooling tower: steam (thick while a shift's on, green just after a meltdown)
  { const tx = at(84); if (seen(tx, 14)) { const c = tone([206, 204, 198]), sh = M(c, [60, 64, 80], 0.3); for (let y = 0; y < 18; y++) { const w = Math.round(12 - 4 * Math.sin((y / 18) * Math.PI)), x = tx + 7 - Math.round(w / 2); r(x, horizon - 5 - y, w, 1, y > 15 ? sh : c); r(x + w - Math.max(2, Math.round(w / 3)), horizon - 5 - y, Math.max(2, Math.round(w / 3)), 1, sh); }
    const on = gridOn(), green = meltAgo() < 60, n = on ? 6 : 4; for (let i = 0; i < n; i++) { const u = ((a * (on ? 0.3 : 0.18)) + i / n) % 1, sc = green ? [140, 255, 120] as RGB : grey(M([150, 156, 176], [246, 248, 252], day)), cx = Math.round(tx + 7 + u * 12 + Math.sin(i * 2 + a) * 1.5), cy = Math.round(horizon - 25 - u * 20), rr = Math.round(3 + u * (on ? 5 : 3));
      alpha((on ? 0.8 : 0.55) * (1 - u * u), () => { disc(cx, cy, rr, sc); disc(cx - rr + 1, cy + 1, Math.max(2, rr - 1), sc); }); } } }
  // the Roof's SPACEPORT: the red launch tower, and the rocket on the pad, lifting off, or coming down on its engines
  { const tx = at(40); if (seen(tx, 10)) { const c = tone([196, 60, 50]); r(tx, horizon - 34, 2, 30, c); for (let y = horizon - 32; y < horizon - 6; y += 4) r(tx - 1, y, 4, 1, c); if (night > 0.3 && Math.sin(a * 2.5) > 0) r(tx, horizon - 35, 2, 1, [255, 80, 60]);
    const o = rocketOnRoof(flight()); if (o) { const ry = Math.round(horizon - 17 - o.rise * 0.045); r(tx + 3, ry, 3, 10, tone([240, 240, 244])); r(tx + 3, ry - 2, 3, 2, tone([220, 64, 56])); r(tx + 2, ry + 8, 1, 2, tone([180, 184, 196])); r(tx + 6, ry + 8, 1, 2, tone([180, 184, 196]));
      if (o.flame > 0) { const fl2 = 3 + Math.floor(Math.sin(a * 40) * 1.5 + 1.5); r(tx + 3, ry + 10, 3, fl2, [255, 190, 70]); r(tx + 4, ry + 10, 1, fl2 + 2, [255, 245, 200]); if (o.rise > 0) for (let k = 1; k < 8; k++) alpha(0.5 - k * 0.05, () => disc(tx + 4 + Math.round(Math.sin(k + a) * 1.5), ry + 12 + k * 3, 1 + Math.floor(k / 3), [236, 236, 240])); } } } }
  // the shore: the beach, and a line of surf
  { const sand = tone(snow ? [236, 240, 246] : [226, 200, 146]), b0 = at(8), b1 = at(160); if (b0 < b1) r(b0, horizon - 4, b1 - b0, 3, sand); else { r(-64, horizon - 4, b1 + 64, 3, sand); r(b0, horizon - 4, VW + 64, 3, sand); } }
  // the Pier on its legs, its lamps, the bonfire on the beach
  { const px = at(98); if (seen(px, 30)) { const c = tone([124, 92, 62]); r(px, horizon - 6, 28, 2, c); for (let k = 0; k < 7; k++) r(px + 1 + k * 4, horizon - 4, 1, 5, M(c, [40, 30, 22], 0.4)); for (const lx of [px + 6, px + 20]) { r(lx, horizon - 11, 1, 5, tone([60, 60, 70])); r(lx - 1, horizon - 12, 3, 1, night > 0.3 ? [255, 220, 150] : tone([60, 60, 70])); }
    if (night > 0.3) { const fx = px - 6; alpha(0.35, () => disc(fx, horizon - 5, 4, [255, 150, 60])); r(fx - 1, horizon - 6 - Math.floor(Math.sin(a * 9) + 1), 2, 2, [255, 200, 90]); } } }
  // the lighthouse, and its beam sweeping round at night
  { const lx = at(118); if (seen(lx, 6)) { r(lx, horizon - 26, 4, 22, tone([240, 240, 244])); r(lx, horizon - 20, 4, 3, tone([220, 60, 60])); r(lx, horizon - 12, 4, 3, tone([220, 60, 60])); r(lx - 1, horizon - 30, 6, 4, tone([56, 58, 70])); r(lx, horizon - 29, 4, 2, night > 0.2 ? [255, 236, 170] : tone([170, 200, 214]));
    if (night > 0.2) { const sw = Math.sin(a * 0.8), len = 40 * Math.abs(sw); for (let j = 2; j < len; j++) { const h = 1 + Math.floor(j / 7); alpha(0.4 * (1 - j / 44) * night, () => r(Math.round(lx + 2 + Math.sign(sw) * j), Math.round(horizon - 28 - h / 2), 1, h, [255, 240, 190])); } } } }
  // THE CITY AQUARIUM: its white front, the blue band, the glass, and the whale tail on the roof
  { const ax = at(134); if (seen(ax, 30)) { r(ax, horizon - 14, 28, 10, tone([236, 240, 244])); r(ax, horizon - 7, 28, 2, tone([42, 127, 184])); r(ax + 4, horizon - 12, 20, 4, night > 0.3 ? [110, 200, 250] : tone([150, 200, 226]));
    const tc = tone([70, 86, 110]); r(ax + 19, horizon - 19, 2, 5, tc); r(ax + 16, horizon - 21, 3, 2, tc); r(ax + 21, horizon - 21, 3, 2, tc); r(ax + 15, horizon - 22, 2, 1, tc); r(ax + 23, horizon - 22, 2, 1, tc); } }
  // the sea: darker out at the horizon, glinting under the sun
  const s0 = grey(M(M([10, 22, 44], [34, 96, 150], day), [120, 80, 90], dusk * 0.35)), s1 = grey(M([16, 34, 60], [58, 148, 186], day));
  r(0, horizon, VW, 1, M(s0, K.WHITE, 0.25)); for (let y = horizon + 1; y < VH; y += 2) r(0, y, VW, 2, M(s0, s1, clamp((y - horizon) / 36, 0, 1)));
  if (!over && day > 0.18) { const gx = at(228); for (let k = 0; k < 16; k++) { const x = gx + Math.round((h1(k * 1.3) - 0.5) * 16 * (1 + (k % 4))), y = horizon + 2 + k * 2; if (seen(x, 3) && Math.sin(a * 5 + k * 1.7) > 0.2) r(x, y, 2 + (k % 3), 1, M([255, 240, 200], [255, 180, 110], dusk)); } }
  // out to sea: a ship (smoke trailing), and a buoy
  { const sx = at(262 + Math.sin(a * 0.02) * 6), by = Math.round(Math.sin(a * 1.1) * 0.6); if (seen(sx, 14)) { const c = tone([56, 58, 70]); r(sx, horizon - 3 + by, 14, 3, c); r(sx + 1, horizon - 1 + by, 12, 1, tone([150, 60, 56])); r(sx + 7, horizon - 6 + by, 5, 3, tone([230, 232, 236])); r(sx + 4, horizon - 7 + by, 2, 4, tone([200, 70, 56])); if (night > 0.3) { r(sx + 1, horizon - 4, 1, 1, [255, 80, 70]); r(sx + 12, horizon - 4, 1, 1, [110, 255, 140]); }
    for (let k = 1; k < 6; k++) alpha(0.4 - k * 0.06, () => disc(sx + 4 - k * 3, horizon - 9 - k * 2 + by, 1 + Math.floor(k / 2), grey(M([90, 94, 110], [200, 204, 214], day)))); } }
  { const bx = at(196), bob = Math.round(Math.sin(a * 2) * 1.2); if (seen(bx, 4)) { r(bx, horizon + 3 + bob, 3, 4, [210, 60, 50]); r(bx + 1, horizon + 1 + bob, 1, 2, [60, 60, 70]); if (night > 0.3 && Math.sin(a * 3) > 0.3) r(bx + 1, horizon + bob, 1, 1, [255, 230, 120]); r(bx - 1, horizon + 7 + bob, 5, 1, M(s1, K.WHITE, 0.4)); } }
  // waves rolling by
  for (let k = 0; k < 16; k++) { const wx2 = ((h1(k) * VW + a * (6 + (k % 3))) % VW), wy = horizon + 4 + ((k * 5) % 36); r(Math.round(wx2), wy, 3 + (wy - horizon) / 10, 1, M(s1, K.WHITE, wet ? 0.3 : 0.45)); }
  // gulls
  for (let k = 0; k < 2; k++) { const gx = ((a * (9 + k * 4) + k * 60) % (VW + 30)) - 15, gy = 18 + k * 9 + Math.sin(a + k) * 4, flap = Math.sin(a * 8 + k) > 0 ? 1 : 0, gc = night > 0.5 ? [180, 184, 200] as RGB : K.WHITE; r(Math.round(gx), Math.round(gy), 3, 1, gc); r(Math.round(gx) - 2, Math.round(gy) - flap, 2, 1, gc); r(Math.round(gx) + 3, Math.round(gy) - flap, 2, 1, gc); }
  if (wet) for (let k = 0; k < (wx === 'storm' ? 36 : 24); k++) r(Math.floor((h1(k) * VW + a * 20) % VW), Math.floor((h1(k * 3) * VH + a * 90) % VH), 1, 3, [190, 210, 230]);
  if (wx === 'snow') for (let k = 0; k < 20; k++) r(Math.floor((h1(k) * VW + Math.sin(a + k) * 4 + VW) % VW), Math.floor((h1(k * 3) * VH + a * 12) % VH), 1, 1, K.WHITE);
  if (wx === 'fog') { PX.ctx.globalAlpha = 0.45; r(0, 0, VW, VH, M([200, 206, 214], [60, 64, 76], night)); PX.ctx.globalAlpha = 1; }
  if (fl > 0) { PX.ctx.globalAlpha = fl * 0.7; r(0, 0, VW, VH, K.WHITE); PX.ctx.globalAlpha = 1; }
}
export function openPeriscope(h: PeriscopeHooks, onClose: () => void): void {
  const m = openModal('UP PERISCOPE', () => { keys.stop(); cancelAnimationFrame(raf); onClose(); });
  const keys = heldKeys(['ArrowLeft', 'ArrowRight', 'a', 'd']);
  const cv = mk(VW, VH), g = cv.getContext('2d')!; cv.style.width = VW * 3 + 'px'; cv.style.height = VH * 3 + 'px'; cv.style.imageRendering = 'pixelated'; cv.style.borderRadius = '50%'; cv.style.boxShadow = '0 0 0 6px #26282C, 0 0 0 9px #9C7026';
  const note = document.createElement('div'); Object.assign(note.style, { ...font(18, '#9FEFFF'), textAlign: 'center' });
  let turn = 0, raf = 0, gullAt = -99, last = performance.now();
  const frame = (t: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (t - last) / 1000); last = t;
    const a = t / 1000, d = h.depth();
    turn = (turn + ((keys.held.has('ArrowRight') || keys.held.has('d') ? 1 : 0) - (keys.held.has('ArrowLeft') || keys.held.has('a') ? 1 : 0)) * 60 * dt + PANO) % PANO;
    const glow = PX.glow, dm = PX.dim, e = PX.emit, f = PX.fl; PX.glow = mk(4, 4).getContext('2d')!; PX.dim = 0; PX.emit = false; PX.fl = 0;
    try { withCtx(g, () => {
      if (d < 0) { // at the dock: the inside of the pen, and MARINA waving
        r(0, 0, VW, VH, [122, 128, 134]); for (let y = 0; y < VH; y += 12) r(0, y, VW, 1, [100, 106, 112]); r(0, 70, VW, 26, [60, 66, 72]); for (let x = 0; x < VW; x += 12) { r(x, 70, 6, 3, [242, 194, 48]); }
        disc(20, 12, 5, [255, 214, 150]); disc(76, 12, 5, [255, 214, 150]);
        const mx = Math.round(VW / 2 + Math.sin(turn / PANO * Math.PI * 2) * 30); if (mx > -10 && mx < VW + 10) { const P = basePose(1); P.arm = 'wave'; P.wave = Math.sin(a * 12) * 1.5; P.eyes = 'h'; stampCritter({ c: 1, hat: 0, face: 10, fit: 1, sp: 0 }, P, mx, 72, 0); }
        note.textContent = 'The inside of the pen. MARINA\'s waving';
      } else if (d < 12) { // THE SURFACE: the real view all the way round
        surfaceView(turn, h.day(), h.weather(), h.flash(), a);
        if (Math.random() < 0.002 && a - gullAt > 20) gullAt = a;
        if (a - gullAt < 3) { disc(48, 50, 34, [240, 240, 244]); disc(40, 44, 7, K.WHITE); disc(40, 44, 4, [20, 20, 26]); r(58, 52, 30, 6, [255, 190, 60]); r(58, 57, 26, 3, [230, 150, 40]); note.textContent = 'A GULL has landed on the periscope. It\'s looking at you'; }
        else note.textContent = 'The surface! ← → to look round: the city, the Pier, the lighthouse, the aquarium';
      } else { // deeper: nothing but water, and something looking back
        const dk = clamp(d / 600, 0, 1); r(0, 0, VW, VH, M(M(SEA.W1, SEA.W3, clamp(d / 300, 0, 1)), [2, 4, 10], dk));
        for (let k = 0; k < 20; k++) r(Math.floor((h1(k) * VW + turn * 0.4) % VW), Math.floor((h1(k * 2) * VH + a * 4) % VH), 1, 1, M([150, 180, 200], [60, 70, 90], dk));
        const peek = (a * 0.15) % 1;
        if (d > 850) { anglerfish(VW / 2 + Math.sin(a * 0.5) * 8, VH / 2 + 10, -1, a, false); note.textContent = 'Nothing but dark... and a little light. A very confused anglerfish'; }
        else if (peek < 0.5) { const s = Math.sin(peek / 0.5 * Math.PI); oval(VW / 2, VH / 2, Math.round(40 * s), Math.round(24 * s), [120, 140, 150]); if (s > 0.5) { disc(VW / 2 + 6, VH / 2 - 2, 9, [230, 220, 170]); disc(VW / 2 + 6, VH / 2 - 2, 5, [20, 20, 26]); r(VW / 2 + 3, VH / 2 - 6, 3, 3, K.WHITE); } note.textContent = 'Nothing but water. A fish looks back at you'; }
        else note.textContent = 'Nothing but water. ' + Math.round(d) + ' m of it, straight up';
      }
      // the crosshair and the bearing
      r(VW / 2, VH / 2 - 8, 1, 6, [20, 20, 26]); r(VW / 2, VH / 2 + 3, 1, 6, [20, 20, 26]); r(VW / 2 - 8, VH / 2, 6, 1, [20, 20, 26]); r(VW / 2 + 3, VH / 2, 6, 1, [20, 20, 26]);
      const brg = String(Math.round(turn / PANO * 360) % 360).padStart(3, '0'); r(VW / 2 - 9, VH - 11, 18, 7, [20, 20, 26]); txt(brg, VW / 2 - tw(brg) / 2, VH - 10, [98, 242, 154]);
      ring(VW / 2, VH / 2, VW / 2 - 1, VH / 2 - 1, [20, 20, 26]);
    }); } finally { PX.glow = glow; PX.dim = dm; PX.emit = e; PX.fl = f; }
  };
  raf = requestAnimationFrame(frame);
  const L = keys.hold('◀', 'ArrowLeft'), R2 = keys.hold('▶', 'ArrowRight');
  m.body.append(cv, note, row(L, button('DOWN PERISCOPE', m.close, true), R2));
}

// ---------------------------------------------------------------- THE DIVE REPORT ----------------------------------------------------------------
export interface Report { n: number; kinds: number; finds: number; mission: string; done: boolean; bin: string[]; pay: number }
export function showReport(rp: Report): void {
  const m = openModal('THE DIVE REPORT · No. ' + (rp.n % 1000), () => {});
  const lines: [string, string, RGB][] = [
    ['SEA LIFE', rp.kinds + (rp.kinds === 1 ? ' KIND' : ' KINDS') + ' PHOTOGRAPHED', [95, 231, 255]],
    ['FINDS', rp.finds ? rp.finds + ' IN THE BIN' : 'NONE THIS TIME', [255, 214, 90]],
    ['MISSION', rp.mission + (rp.done ? ' ✓' : ' · NOT THIS TIME'), rp.done ? [124, 242, 156] : [232, 216, 192]],
    ['PAY', '+' + rp.pay + ' TOKENS (1 + FINDS UP TO 4 + 3 FOR THE MISSION)', [255, 214, 90]],
  ];
  const list = document.createElement('div'); Object.assign(list.style, { display: 'flex', flexDirection: 'column', gap: '6px', width: 'min(520px, 86vw)' });
  for (const [k, v, c] of lines) {
    const rw = document.createElement('div'); Object.assign(rw.style, { display: 'flex', gap: '10px', ...font(20, '#FFF3D6') });
    const a = document.createElement('span'); a.textContent = k; Object.assign(a.style, { minWidth: '92px', color: '#E8D8C0' });
    const b = document.createElement('span'); b.textContent = v; b.style.color = 'rgb(' + c.join(',') + ')';
    rw.append(a, b); list.appendChild(rw);
  }
  if (rp.bin.length) { const pics = document.createElement('div'); Object.assign(pics.style, { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }); for (const k of rp.bin) pics.appendChild(paint(22, 16, () => drawFind(k, 11, 14, 0.3), 2)); list.appendChild(pics); }
  const sub = document.createElement('div'); sub.textContent = 'SARDINE 1 dives again in a minute and a half. Stay aboard for the next one, or climb the ladder to the pen.'; Object.assign(sub.style, { ...font(17, '#9FEFFF'), textAlign: 'center', maxWidth: 'min(520px, 86vw)' });
  m.body.append(list, sub, row(button('ANCHORS AWEIGH', m.close)));
}
