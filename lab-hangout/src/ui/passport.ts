// Iceland's panels (step 19): THE PASSPORT (an ink stamp for every place, the date you were first there), the BOARDING PASS (DOT
// prints it at check-in), and UP THE TOWER (the view from the top of Hallgrímskirkja: the whole city round, the bay and Mount Esja,
// the northern lights at night; ← → to look round, like the periscope).

import { K, IS, type RGB } from '../engine/palette';
import { PX, r, line, disc, oval, txt, tw, mk, withCtx, M, alpha, lit } from '../engine/pixel';
import { clamp, h1 } from '../engine/math';
import { mmss } from '../engine/format';
import { STAMPS, PUSH_NOW, type Stamp } from '../game/passport';
import { save } from '../game/save';
import { basePose, stampCritter, type Look } from '../entities/critter';
import { iceDay, iceGold, iceWeather, auroraNow, drawAurora, mountains } from '../world/iceland';
import { button, font, heldKeys, openModal, row } from './modal';

/** Draw into a little canvas with the lighting off (and the glow going nowhere), shown at `scale`. */
function paint(w: number, h: number, fn: () => void, scale = 2): HTMLCanvasElement {
  const c = mk(w, h), g = c.getContext('2d')!, glow = PX.glow, d = PX.dim, e = PX.emit, f = PX.fl;
  PX.glow = mk(4, 4).getContext('2d')!; PX.dim = 0; PX.emit = false; PX.fl = 0;
  try { withCtx(g, fn); } finally { PX.glow = glow; PX.dim = d; PX.emit = e; PX.fl = f; }
  c.style.width = w * scale + 'px'; c.style.height = h * scale + 'px'; c.style.imageRendering = 'pixelated'; c.style.flex = 'none';
  return c;
}
const dayText = (day: number): string => { const d = new Date(day * 86400000); return d.getUTCDate() + ' ' + ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getUTCMonth()] + ' ' + String(d.getUTCFullYear()).slice(2); };

// ---------------------------------------------------------------- THE PASSPORT ----------------------------------------------------------------
/** A stamp's little picture, in its ink. */
function icon(id: string, x: number, y: number, c: RGB): void {
  switch (id) {
    case 'kef': r(x - 8, y, 16, 3, c); r(x + 6, y - 1, 3, 2, c); r(x - 2, y - 5, 5, 13, c); r(x - 8, y - 3, 3, 4, c); break; // (a plane)
    case 'reykjavik': for (let k = 0; k < 3; k++) { const hx = x - 9 + k * 7; r(hx, y - 2, 6, 7, c); for (let q = 0; q < 4; q++) r(hx - 1 + q, y - 3 - q, 8 - q * 2, 1, c); r(hx + 2, y + 1, 2, 4, [255, 255, 255]); } break; // (the houses)
    case 'tower': for (let s = 0; s < 5; s++) { r(x - 3 - (5 - s) * 2, y + 6 - s * 3, 2, s * 3 + 2, c); r(x + 1 + (5 - s) * 2, y + 6 - s * 3, 2, s * 3 + 2, c); } r(x - 2, y - 10, 4, 18, c); r(x - 1, y - 13, 2, 3, c); break; // (the church)
    case 'voyager': line(x - 9, y + 3, x + 9, y + 3, c); line(x + 9, y + 3, x + 12, y - 6, c); line(x - 9, y + 3, x - 12, y - 4, c); for (let q = -6; q <= 6; q += 4) line(x + q, y + 3, x + q + 2, y - 5, c); break; // (the ship)
    case 'aurora': for (let q = 0; q < 3; q++) for (let k = -10; k <= 10; k++) r(x + k, y - 6 + q * 4 + Math.round(Math.sin(k * 0.5 + q) * 2), 1, 3, c); break; // (the curtains)
    case 'seljaland': r(x - 8, y - 8, 16, 3, c); r(x - 1, y - 5, 3, 13, c); for (let k = -7; k <= 7; k++) r(x + k, y + 6 - Math.round(Math.sqrt(Math.max(0, 49 - k * k)) * 0.6), 1, 1, c); r(x - 8, y + 8, 16, 2, c); break; // (a thin fall, the path looping behind it)
    case 'skoga': for (let k = 0; k < 2; k++) for (let q = -10; q <= 10; q++) r(x + q, y - 4 - k * 3 + Math.round((q * q) / 18), 1, 1, c); r(x - 6, y - 6, 12, 14, c); r(x - 10, y + 8, 20, 2, c); break; // (the great curtain, a double rainbow over it)
    case 'gullfoss': r(x - 8, y - 8, 16, 3, c); r(x - 3, y - 5, 6, 14, c); r(x - 8, y + 8, 16, 2, c); break; // (a waterfall)
    case 'wreck': r(x - 11, y - 2, 20, 6, c); r(x - 12, y - 1, 1, 4, c); r(x + 9, y - 1, 3, 4, c); for (let k = 0; k < 5; k++) r(x - 7 + k * 3, y - 1, 1, 1, [246, 240, 226]); r(x - 13, y + 6, 26, 1, c); break; // (the fuselage on the sand)
    case 'beach': for (const [dx, hh] of [[-6, 12], [0, 9], [5, 6]] as [number, number][]) for (let q = 0; q < hh; q++) r(x + dx - Math.floor((hh - q) / 4), y + 4 - q, 1 + Math.floor((hh - q) / 2.5), 1, c); for (let k = -11; k <= 11; k++) r(x + k, y + 6 + Math.round(Math.sin(k * 0.8)), 1, 1, c); break; // (the troll stacks in the surf)
    case 'geysir': r(x - 2, y - 10, 4, 16, c); disc(x, y - 10, 4, c); r(x - 8, y + 6, 16, 2, c); break;
    default: for (let k = -9; k <= 9; k++) r(x + k, y + 4 - Math.round(Math.max(0, 8 - Math.abs(k)) * 1.2), 1, Math.round(Math.max(0, 8 - Math.abs(k)) * 1.2) + 1, c); // (a mountain)
  }
}
/** An ink stamp: its shaped double border, its icon, its name, the date; a little faded and uneven, like real ink. */
function stampPic(s: Stamp, day: number): HTMLCanvasElement {
  const W2 = 72, H2 = 48, c: RGB = s.ink;
  return paint(W2, H2, () => {
    const cx = W2 / 2, cy = H2 / 2;
    if (s.shape === 'round') { for (const rr of [22, 20]) for (let a = 0; a < 6.283; a += 0.05) r(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * (rr - 2)), 1, 1, c); }
    else if (s.shape === 'oval') { for (const [rx, ry] of [[32, 21], [30, 19]]) for (let a = 0; a < 6.283; a += 0.04) r(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1, c); }
    else if (s.shape === 'tall') { r(cx - 20, 2, 40, 1, c); r(cx - 20, H2 - 3, 40, 1, c); r(cx - 20, 2, 1, H2 - 4, c); r(cx + 19, 2, 1, H2 - 4, c); r(cx - 18, 4, 36, 1, c); r(cx - 18, H2 - 5, 36, 1, c); r(cx - 18, 4, 1, H2 - 8, c); r(cx + 17, 4, 1, H2 - 8, c); }
    else { r(2, 4, W2 - 4, 1, c); r(2, H2 - 5, W2 - 4, 1, c); r(2, 4, 1, H2 - 8, c); r(W2 - 3, 4, 1, H2 - 8, c); r(4, 6, W2 - 8, 1, c); r(4, H2 - 7, W2 - 8, 1, c); }
    icon(s.id, cx, cy - 6, c);
    const nm = s.name.length > 14 ? s.name.replace('THE ', '') : s.name; txt(nm, Math.round(cx - tw(nm) / 2), cy + 7, c);
    const dt = dayText(day); txt(dt, Math.round(cx - tw(dt) / 2), cy + 14, M(c, [255, 255, 255], 0.35));
    for (let k = 0; k < 40; k++) r(Math.floor(h1(k * 3.3 + day) * W2), Math.floor(h1(k * 1.7 + s.id.length) * H2), 1, 1, [246, 240, 226]); // (the ink's gaps)
  });
}
/** THE PASSPORT: your portrait and name, and a page of stamps (the places you haven't been yet: a hint, or coming soon). */
export function openPassport(look: Look, name: string, onClose: () => void, fresh?: string): void {
  const m = openModal('PASSPORT', onClose), have = save.data.stamps, n = STAMPS.filter((s) => have[s.id]).length;
  const top = document.createElement('div'); Object.assign(top.style, { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: '#1B2A4E', border: '2px solid #D9A441', borderRadius: '4px' });
  top.append(paint(34, 40, () => { r(0, 0, 34, 40, [236, 232, 220]); const P = basePose(1); stampCritter(look, P, 17, 36, 0); }, 2));
  const who = document.createElement('div'); Object.assign(who.style, { ...font(18, '#F2D27A'), textAlign: 'left' });
  const l1 = document.createElement('div'); l1.textContent = 'THE CITY · PASSPORT'; Object.assign(l1.style, { fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#D9A441' });
  const l2 = document.createElement('div'); l2.textContent = name; l2.style.color = '#FFF3D6';
  const l3 = document.createElement('div'); l3.textContent = 'STAMPS ' + n + ' OF ' + STAMPS.length; Object.assign(l3.style, font(16, '#9FEFFF'));
  who.append(l1, l2, l3); top.append(who);
  const page = document.createElement('div'); Object.assign(page.style, { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px', width: 'min(660px, 86vw)', maxHeight: '48vh', overflowY: 'auto', padding: '10px', background: '#F6F0E2', borderRadius: '4px' });
  STAMPS.forEach((s, i) => {
    const cell = document.createElement('div'); Object.assign(cell.style, { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '4px', minHeight: '104px', justifyContent: 'center' });
    if (have[s.id]) { const pic = stampPic(s, have[s.id]); pic.style.transform = 'rotate(' + Math.round((h1(i * 7.1) - 0.5) * 12) + 'deg)'; if (fresh === s.id) pic.animate?.([{ transform: 'scale(1.8) rotate(-10deg)', opacity: 0 }, { transform: pic.style.transform, opacity: 1 }], { duration: 350, easing: 'ease-out' }); cell.append(pic); }
    else { const q = document.createElement('div'); q.textContent = s.push <= PUSH_NOW ? '?' : ''; Object.assign(q.style, { width: '120px', height: '70px', border: '2px dashed #C9BEA6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', ...font(26, '#B8AC94') });
      const hint = document.createElement('div'); hint.textContent = s.push <= PUSH_NOW ? s.hint : 'COMING SOON'; Object.assign(hint.style, { ...font(14, '#9A8E74'), textAlign: 'center', maxWidth: '140px' }); cell.append(q, hint); }
    page.appendChild(cell);
  });
  const sub = document.createElement('div'); Object.assign(sub.style, { ...font(16, '#9FEFFF'), textAlign: 'center' }); sub.textContent = n >= STAMPS.length ? 'Every stamp. A true ICELANDER.' : 'More of Iceland to come: the Golden Circle, the lagoon, a glacier...';
  m.body.append(top, page, sub, row(button('CLOSE', m.close, true)));
}

// ---------------------------------------------------------------- THE BOARDING PASS ----------------------------------------------------------------
export interface PassInfo { name: string; flight: string; from: string; to: string; gate: string; seat: string; boardsIn: number; boarding: boolean; id: string }
export function openBoardingPass(p: PassInfo, onClose: () => void): void {
  const m = openModal('BOARDING PASS', onClose);
  const W2 = 180, H2 = 74, pic = paint(W2, H2, () => {
    r(0, 0, W2, H2, [250, 248, 242]); r(0, 0, W2, 14, [31, 163, 160]); txt('LAB AIR', 6, 5, K.WHITE, 1); r(46, 4, 4, 6, [242, 140, 40]); r(45, 3, 6, 2, [255, 180, 90]);
    txt('BOARDING PASS', W2 - 6 - tw('BOARDING PASS'), 5, [220, 250, 248]);
    const L = (x: number, y: number, k: string, v: string, big = false) => { txt(k, x, y, [150, 150, 160]); txt(v, x, y + 7, [30, 34, 40], big ? 2 : 1); };
    L(6, 18, 'NAME', p.name.slice(0, 16)); L(6, 34, 'FROM', p.from, true); L(70, 34, 'TO', p.to, true);
    line(58, 42, 66, 42, [242, 140, 40]); r(64, 41, 2, 3, [242, 140, 40]);
    L(6, 54, 'FLIGHT', p.flight); L(44, 54, 'GATE', p.gate); L(74, 54, 'SEAT', p.seat); L(100, 54, p.boarding ? 'BOARDING' : 'BOARDS IN', p.boarding ? 'NOW!' : mmss(p.boardsIn));
    r(138, 16, 1, H2 - 20, [200, 196, 186]); for (let y = 16; y < H2 - 4; y += 4) r(138, y, 1, 2, [250, 248, 242]); // (the tear-off line)
    let hsh = 7; for (let i = 0; i < p.id.length; i++) hsh = Math.imul(hsh ^ p.id.charCodeAt(i), 16777619) >>> 0;
    for (let x = 144; x < W2 - 6; x += 2) if (((hsh >>> (x % 31)) & 1) || x % 7 === 0) r(x, 20, 1, 36, [30, 34, 40]); // (the barcode)
    txt(p.seat, 158 - tw(p.seat, 2) / 2, 60, [31, 163, 160], 2);
  }, innerWidth < 560 ? 2 : 3);
  const sub = document.createElement('div'); Object.assign(sub.style, { ...font(17, '#9FEFFF'), textAlign: 'center', maxWidth: 'min(560px, 86vw)' });
  sub.textContent = p.boarding ? 'The gate is boarding now: GATE ' + p.gate + ', past SECURITY. Walk up the jet bridge!' : 'Through SECURITY to GATE ' + p.gate + '. Boarding opens in ' + mmss(p.boardsIn) + '.';
  m.body.append(pic, sub, row(button('THANKS!', m.close, true)));
}

// ---------------------------------------------------------------- UP THE TOWER ----------------------------------------------------------------
const VW = 160, VH = 90, PANO = 640;
/** The view from the top of the tower, all the way round (0..PANO = 360°, 0 = north, over the bay). */
export function towerView(x0: number, a: number, g0?: { day: number; gold: number; kp: number; vis: number; sky: string }): void {
  const day = g0?.day ?? iceDay(), gold = g0?.gold ?? iceGold(), au = g0 ? { kp: g0.kp, vis: g0.vis } : auroraNow(), wx = g0?.sky ?? iceWeather().kind, night = 1 - day, over = wx === 'cloudy' || wx === 'snow' || wx === 'drizzle';
  const at = (deg: number): number => { let x = ((deg / 360) * PANO - x0) % PANO; if (x < -80) x += PANO; if (x >= PANO - 80) x -= PANO; return Math.round(x); };
  const seen = (x: number, w: number): boolean => x > -w - 2 && x < VW + 2, HOR = 44;
  const top = M(IS.SKY_NIGHT, IS.SKY, day), low = M(M(IS.SKY_NIGHT_LO, IS.SKY_LO, day), [255, 170, 100], gold * 0.6);
  for (let y = 0; y < HOR; y += 2) r(0, y, VW, 2, over ? M(M(top, low, y / HOR), [140, 146, 158], 0.5) : M(top, low, (y / HOR) ** 1.3));
  if (night > 0.5 && !over) for (let k = 0; k < 40; k++) { const sx = at(h1(k * 3.1) * 360); if (seen(sx, 1)) r(sx, Math.floor(h1(k) * 36), 1, 1, [220, 225, 250]); }
  // the northern lights, all round the sky
  if (!over) drawAurora(0, VW, -6, HOR - 4, au.kp, au.vis, a + x0 * 0.01, 0.55);
  // the horizon all round: Mount Esja over the bay (north), the inland hills (east), the pond and the little city airport (south), the sea and a glacier far out west
  const gx = (deg: number, w: number, fn: (x: number) => void) => { const x = at(deg); if (seen(x, w)) fn(x); };
  const mtn = M(IS.MOUNTAIN, [16, 20, 34], night), snow = M(IS.SNOW, [110, 120, 144], night);
  for (let x = 0; x < VW; x++) { const deg = (((x + x0) / PANO) * 360 + 360) % 360, north = Math.cos((deg / 180) * Math.PI), h = Math.round(Math.max(0, north) * 10 + (deg > 50 && deg < 150 ? 6 + Math.sin(deg * 0.2) * 3 : 0)); if (h > 0) { r(x, HOR - h, 1, h, mtn); r(x, HOR - h, 1, Math.max(1, Math.round(h * 0.35)), snow); } }
  gx(282, 20, (x) => { for (let k = -9; k <= 9; k++) { const hh = Math.round(Math.max(0, 9 - Math.abs(k)) * 0.8); r(x + k, HOR - hh, 1, hh, M(snow, low, 0.4)); } }); // (the glacier on the horizon, far out west)
  // the bay (north and west), the city's roofs everywhere below
  const sea = M(IS.SEA, [10, 22, 40], night);
  for (let x = 0; x < VW; x++) { const deg = (((x + x0) / PANO) * 360 + 360) % 360, water = deg > 250 || deg < 70; if (water) r(x, HOR, 1, 12, sea); }
  const roofs: RGB[] = [IS.ROOF_RED, IS.ROOF_GREEN, [60, 110, 170], IS.ROOF_GREY, IS.RED, IS.MUSTARD];
  for (let y = HOR + 4; y < VH; y += 5) { const rowSc = (y - HOR) / (VH - HOR), step = Math.round(4 + rowSc * 8); for (let x = -((x0 * (0.6 + rowSc)) % step); x < VW; x += step) { const k = Math.floor((x + x0 * (0.6 + rowSc)) / step) + y * 31, c = roofs[Math.abs(k) % roofs.length]; const deg = ((((x + x0) / PANO) * 360) % 360 + 360) % 360; if ((deg > 250 || deg < 70) && y < HOR + 12) continue;
    r(Math.round(x), y, step - 1, 4, M(c, [14, 18, 30], night * 0.7)); r(Math.round(x), y, step - 1, 1, M(IS.SNOW, [80, 90, 110], night)); if (night > 0.4 && h1(k * 1.3) > 0.55) lit(() => r(Math.round(x) + 1, y + 2, 1, 1, [255, 214, 130])); } }
  // HARPA on the waterfront (north-east), lit at night; the harbour's boats
  gx(20, 16, (x) => { r(x - 7, HOR + 2, 14, 7, M(IS.HARPA, [20, 30, 50], night)); if (night > 0.3) for (let q = 0; q < 10; q++) lit(() => alpha(night, () => r(x - 6 + (q % 5) * 3, HOR + 3 + Math.floor(q / 5) * 3, 2, 2, [[60, 200, 255], [150, 90, 255], [255, 90, 180]][(q + Math.floor(a)) % 3] as RGB))); });
  gx(350, 12, (x) => { for (let q = 0; q < 3; q++) r(x - 6 + q * 5, HOR + 8, 3, 1, M(K.WHITE, [40, 44, 60], night)); });
  // the little city airport by the pond, south: a runway, and a small plane taking off now and then
  gx(185, 40, (x) => { r(x - 18, HOR + 10, 36, 3, M([90, 94, 100], [30, 32, 40], night)); r(x - 30, HOR + 14, 16, 4, M([80, 120, 150], [20, 30, 50], night)); const u = (a * 0.05) % 1; if (u < 0.3) { const px = x - 18 + Math.round(u / 0.3 * 36), py = HOR + 9 - Math.round(Math.max(0, u - 0.15) * 30); r(px, py, 4, 1, K.WHITE); r(px + 1, py - 1, 1, 3, K.WHITE); } });
  // the rainbow street, leading away to the south-west (a coloured stripe through the roofs)
  gx(215, 14, (x) => { for (let b = 0; b < 6; b++) r(x - 6 + b * 2, HOR + 6, 2, VH - HOR - 6, M([[228, 60, 60], [240, 140, 50], [246, 214, 60], [80, 180, 90], [60, 120, 210], [140, 80, 190]][b] as RGB, [20, 20, 30], night * 0.6)); });
  if (wx === 'snow' || wx === 'gale') for (let k = 0; k < 40; k++) r(Math.floor((h1(k) * VW + (wx === 'gale' ? a * 50 : Math.sin(a + k) * 4) + VW * 4) % VW), Math.floor((h1(k * 3) * VH + a * 12) % VH), 1, 1, K.WHITE);
  if (wx === 'drizzle') for (let k = 0; k < 24; k++) alpha(0.5, () => r(Math.floor(h1(k) * VW), Math.floor((h1(k * 3) * VH + a * 60) % VH), 1, 3, [200, 214, 230]));
  void clamp; void mountains; void oval;
}
/** UP THE TOWER: the tower's window, and the city all round; ← → (or the buttons) to look round. */
export function openTowerView(onClose: () => void): void {
  const m = openModal('THE VIEW FROM THE TOWER', () => { keys.stop(); cancelAnimationFrame(raf); onClose(); });
  const keys = heldKeys(['ArrowLeft', 'ArrowRight', 'a', 'd']), sc = innerWidth < 560 ? 2 : 3;
  const cv = mk(VW, VH), g = cv.getContext('2d')!; Object.assign(cv.style, { width: VW * sc + 'px', height: VH * sc + 'px', imageRendering: 'pixelated', border: '6px solid #CFCBC2', borderRadius: '40% 40% 4px 4px / 30% 30% 4px 4px', boxShadow: '0 0 0 3px #A8A399' });
  const note = document.createElement('div'); Object.assign(note.style, { ...font(18, '#9FEFFF'), textAlign: 'center' });
  let turn = 0, raf = 0, last = performance.now();
  const frame = (t: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (t - last) / 1000); last = t;
    turn = (turn + ((keys.held.has('ArrowRight') || keys.held.has('d') ? 1 : 0) - (keys.held.has('ArrowLeft') || keys.held.has('a') ? 1 : 0)) * 70 * dt + PANO) % PANO;
    const glow = PX.glow, dm = PX.dim, e = PX.emit, f = PX.fl; PX.glow = mk(4, 4).getContext('2d')!; PX.dim = 0; PX.emit = false; PX.fl = 0;
    try { withCtx(g, () => towerView(turn, t / 1000)); } finally { PX.glow = glow; PX.dim = dm; PX.emit = e; PX.fl = f; }
    const deg = Math.round(((turn + VW / 2) / PANO) * 360) % 360, dir = ['NORTH: THE BAY AND MOUNT ESJA', 'EAST: THE HILLS', 'SOUTH: THE POND AND THE LITTLE AIRPORT', 'WEST: THE SEA, A GLACIER FAR OUT'][Math.round(deg / 90) % 4];
    const au = auroraNow(); note.textContent = dir + (au.vis > 0.3 && au.kp >= 3 ? ' · THE NORTHERN LIGHTS ARE OUT!' : '');
  };
  raf = requestAnimationFrame(frame);
  const L = keys.hold('◀', 'ArrowLeft'), R2 = keys.hold('▶', 'ArrowRight');
  m.body.append(cv, note, row(L, button('BACK DOWN', m.close, true), R2));
}
