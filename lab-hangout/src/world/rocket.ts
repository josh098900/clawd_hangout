// THE ROCKET — the capsule you ride up to the Space Station (and home again), run by the clock in
// world/space.ts like the Subway's train: everyone aboard is in this room together. Six seats to
// strap into, the mission clock, and a porthole with the whole trip going past it: the pad, the
// sky going black, Earth's curve, the station swinging closer, re-entry, and the roof rushing up.
// The hatch opens onto the Rooftop on the pad, and onto the station once docked.

import { mmss } from '../engine/format';
import { K, SK, type RGB } from '../engine/palette';
import { PX, mk, r, disc, line, txt, tw, lit, G, Gd, M, shade, puff, bake } from '../engine/pixel';
import { clamp, h1 } from '../engine/math';
import { dayness } from './plaza';
import { DEPART, DOCK_ARRIVE, MECO, PAD_ARRIVE, UP_S, capsuleFloats, flight, gForce, shake, skyAt, type Flight } from './space';
import type { Door, Room, Spot } from './room';

const W = 760, H = 620, WALL = 300, FL = 474, PX0 = 380, PY0 = 382, PR = 44;
const SEATS = [150, 206, 262, 498, 554, 610];

function build(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    
    r(0, 0, W, WALL, SK.TRIM); for (let x = 0; x < W; x += 38) r(x, 0, 1, WALL, SK.TRIM_HI); r(0, WALL - 8, W, 8, shade(SK.TRIM, 0.8));
    // the curved inner wall: lightest in the middle, rounding away at the sides
    for (let x = 0; x < W; x += 2) { const k = Math.abs(x - W / 2) / (W / 2); r(x, WALL, 2, FL - WALL, M(SK.PANEL, SK.HULL_DK, k * k * 0.7)); }
    for (let x = 20; x < W; x += 76) { r(x, WALL, 1, FL - WALL, SK.SEAM); for (let y = WALL + 8; y < FL; y += 16) r(x + 3, y, 1, 1, SK.HULL_DK); }
    r(0, WALL + 60, W, 1, SK.SEAM); r(0, FL - 20, W, 1, SK.SEAM);
    // the floor grating (it carries on below the walkable band)
    r(0, FL, W, H - FL, SK.FLOOR); for (let y = FL + 4; y < H; y += 6) r(0, y, W, 1, SK.FLOOR_LN); for (let x = 0; x < W; x += 12) r(x, FL, 1, H - FL, SK.FLOOR2);
    r(0, FL, W, 3, SK.TRIM_HI);
    // the porthole's frame
    disc(PX0, PY0, PR + 8, SK.TRIM); disc(PX0, PY0, PR + 5, SK.TRIM_HI); for (let k = 0; k < 12; k++) { const an = k / 12 * Math.PI * 2; r(Math.round(PX0 + Math.cos(an) * (PR + 3)), Math.round(PY0 + Math.sin(an) * (PR + 3)), 2, 2, SK.HULL_DK); }
    // the screens either side of it
    for (const x0 of [196, 444]) { r(x0 - 3, 318, 126, 34, SK.TRIM); r(x0, 321, 120, 28, SK.SCREEN); }
    // handrails and the lockers on the right
    r(640, 382, 104, 88, SK.PANEL2); for (const x of [640, 692]) { r(x + 2, 384, 48, 84, SK.PANEL); r(x + 2, 384, 48, 1, SK.HULL_HI); r(x + 40, 420, 3, 8, SK.TRIM); }
    txt('SNACKS', 668 - tw('SNACKS') / 2, 390, SK.TRIM); txt('SUITS', 718 - tw('SUITS') / 2, 390, SK.TRIM);
    r(120, 364, 520, 3, SK.RAIL); r(120, 366, 520, 1, SK.RAIL_DK); for (const x of [120, 380 - 60, 380 + 58, 636]) r(x, 360, 3, 10, SK.HULL_DK);
    // the hatch frame (the door itself is drawn live)
    r(26, 372, 76, FL - 372, SK.TRIM); r(30, 376, 68, FL - 376, SK.TRIM_HI);
    // seats: padded couches with headrests
    for (const x of SEATS) {
      r(x - 14, 416, 28, 10, K.NAVY); r(x - 14, 416, 28, 2, K.NAVY_L);
      r(x - 12, 428, 24, 36, K.NAVY_L); r(x - 12, 428, 24, 2, M(K.NAVY_L, K.WHITE, 0.2)); r(x + 8, 428, 4, 36, K.NAVY);
      r(x - 15, 462, 30, 10, K.NAVY); r(x - 15, 462, 30, 2, K.NAVY_L); r(x - 12, 472, 3, 4, SK.TRIM); r(x + 9, 472, 3, 4, SK.TRIM);
      r(x - 6, 430, 2, 30, SK.RAIL_DK); r(x + 4, 430, 2, 30, SK.RAIL_DK); // the straps
    }
    txt('LAB 1', PX0 - tw('LAB 1') / 2, 440, SK.TRIM);
  });
}

// ---------- the porthole ----------
function clipCircle(cx: number, cy: number, rad: number): void {
  const g = PX.ctx; g.save(); g.beginPath();
  for (let y = -rad; y <= rad; y++) { const w = Math.floor(Math.sqrt(rad * rad - y * y)); g.rect(cx - w, cy + y, w * 2 + 1, 1); }
  g.clip();
}
/** Earth's curve along the bottom of the porthole, its top edge `lim` px below the centre. */
function limb(lim: number, a: number): void {
  const Rb = 150, cy = PY0 + lim + Rb;
  for (let y = PY0 + lim - 2; y < PY0 + PR; y++) {
    const w = Math.sqrt(Math.max(0, Rb * Rb - (y - cy) * (y - cy))); if (w <= 0) continue;
    const x0 = Math.round(PX0 - w), x1 = Math.round(PX0 + w), band = y - (cy - Rb);
    for (let x = Math.max(x0, PX0 - PR); x < Math.min(x1, PX0 + PR); x += 3) {
      const n = h1(Math.floor((x + a * 6) / 9) * 3.1 + Math.floor(y / 5) * 1.7), c: RGB = n > 0.72 ? SK.LAND : n > 0.64 ? SK.CLOUD : SK.OCEAN;
      r(x, y, 3, 1, band < 3 ? M(c, SK.ATMOS, 0.7) : c);
    }
  }
  lit(() => { for (let x = PX0 - PR; x < PX0 + PR; x++) { const y = Math.round(cy - Math.sqrt(Math.max(0, Rb * Rb - (x - PX0) * (x - PX0)))) - 2; r(x, y, 1, 1, SK.ATMOS); } });
}
/** The station as a silhouette, `s` = its scale (0 = a dot far away .. 1 = filling the porthole). */
function stationAt(cx: number, cy: number, s: number, a: number): void {
  const k = Math.max(0.04, s), w = (n: number) => Math.max(1, Math.round(n * k));
  r(cx - w(40), cy - w(8), w(80), w(16), SK.HULL); r(cx - w(40), cy + w(4), w(80), w(4), SK.HULL_SH);
  r(cx - w(8), cy - w(24), w(16), w(48), SK.HULL); r(cx + w(4), cy - w(24), w(4), w(48), SK.HULL_SH);
  for (const sx of [-1, 1]) { r(cx + sx * w(44) - (sx < 0 ? w(46) : 0), cy - w(14), w(46), w(28), SK.SOLAR); for (let j = 1; j < 4; j++) r(cx + sx * w(44) - (sx < 0 ? w(46) : 0), cy - w(14) + w(7 * j), w(46), 1, SK.SOLAR_LN); }
  r(cx - w(12), cy - w(6), w(24), w(12), SK.GOLD_FOIL);
  lit(() => { if ((a * 1.5) % 1 < 0.5) r(cx - w(40), cy, 1 + w(2), 1 + w(2), SK.LED_RED); r(cx + w(38), cy, 1 + w(2), 1 + w(2), SK.LED); });
}
function portView(f: Flight, a: number): void {
  clipCircle(PX0, PY0, PR);
  const day = dayness(), x0 = PX0 - PR, y0 = PY0 - PR, D = PR * 2;
  const sky = (u: number) => { for (let y = y0; y < y0 + D; y += 3) r(x0, y, D, 3, skyAt(clamp(u + (y0 + D - y) / D * 0.12, 0, 1), day)); };
  const stars = (k: number) => { if (k <= 0) return; for (let i = 0; i < 30; i++) if (h1(i * 2.3) < k) r(Math.floor(x0 + h1(i * 5.1) * D), Math.floor(y0 + h1(i * 1.7) * D), 1, 1, h1(i) > 0.6 ? SK.STAR : SK.STAR_DIM); };
  const tower = (dy: number) => { const tx = PX0 - 30; r(tx, y0 + dy - 20, 14, D + 40, SK.TOWER); for (let y = y0 + dy - 20; y < y0 + D + dy + 20; y += 8) { line(tx, y, tx + 13, y + 8, SK.TOWER_DK); r(tx, y, 14, 1, SK.TOWER_DK); } };
  const city = (dy: number) => { for (let i = 0; i < 9; i++) { const bx = x0 + i * 11, bh = 14 + Math.floor(h1(i * 3.3) * 22), top = y0 + D - bh + dy; r(bx, top, 10, bh + 60, day > 0.5 ? K.CITY2 : K.CITY0); if (day < 0.5) lit(() => { for (let j = 0; j < 4; j++) if (h1(i * 7 + j) > 0.4) r(bx + 2 + (j % 2) * 4, top + 4 + Math.floor(j / 2) * 6, 2, 2, K.WIN_Y); }); } };
  const clouds = (off: number, n: number) => { for (let i = 0; i < n; i++) { const cy = y0 + ((((h1(i * 1.3) * D + off * (0.8 + h1(i) * 0.6)) % (D + 40)) + D + 40) % (D + 40)) - 20, cx = x0 + h1(i * 4.1) * D; r(Math.round(cx - 12), Math.round(cy), 24, 4, SK.CLOUD); r(Math.round(cx - 6), Math.round(cy - 3), 12, 3, SK.CLOUD); } };
  if (f.phase === 'pad') {
    sky(0); stars(day < 0.5 ? 0.5 : 0); city(0); tower(0);
    if (f.left < 3) { const u = 3 - f.left; for (let k = 0; k < 8; k++) puff(x0 + 10 + k * 11, y0 + D - 4 - u * 6, u - k * 0.1, 3, 10, SK.SMOKE, 0.8); }
  } else if (f.phase === 'up') {
    const k = f.k;
    if (k < MECO) {
      sky(k / MECO); stars(clamp((k - 12) / 10, 0, 1)); if (k < 4) { city(k * k * 14); tower(k * k * 24); }
      if (k > 3 && k < 18) clouds(k * k * 5, 6);
      if (k > 18) limb(PR - (k - 18) * 3.2, a);
    } else {
      r(x0, y0, D, D, SK.VOID); stars(1); limb(PR - (MECO - 18) * 3.2, a);
      if (k > 31) { const s = Math.pow((k - 31) / (UP_S - 31), 2.2); stationAt(PX0, PY0 - 6 + s * 6, s * 1.4, a); }
    }
  } else if (f.phase === 'docked') {
    r(x0, y0, D, D, SK.VOID); stars(1); limb(PR - 32, a);
    // the station's hull right outside, with a lit window
    r(x0, y0, D, 50, SK.HULL); for (let x = x0 + 8; x < x0 + D; x += 22) r(x, y0, 1, 50, SK.SEAM); r(x0, y0 + 48, D, 3, SK.HULL_SH);
    lit(() => { r(PX0 + 6, y0 + 16, 18, 12, [255, 226, 170]); r(PX0 + 6, y0 + 16, 18, 1, K.WHITE); }); Gd(PX0 + 15, y0 + 22, 14, [255, 214, 150], 0.3);
    r(x0, y0 + 51, 26, 6, SK.GOLD_FOIL); r(x0, y0 + 51, 26, 1, SK.GOLD_FOIL_HI);
  } else {
    const d = f.k - DEPART;
    if (d < 15) { r(x0, y0, D, D, SK.VOID); stars(1); limb(PR - 32 + Math.max(0, d - 6) * 3, a); if (d < 9) { const s = Math.pow(1 - d / 9, 2) * 1.4; stationAt(PX0, PY0 - 8, s, a); } }
    else if (d < 30) { // re-entry: the plasma
      lit(() => { for (let y = y0; y < y0 + D; y += 3) r(x0, y, D, 3, M([255, 120, 50], [255, 220, 120], clamp((y - y0) / D + 0.25 * Math.sin(a * 9 + y * 0.1), 0, 1))); });
      lit(() => { for (let i = 0; i < 26; i++) { const x = x0 + h1(i * 3.3) * D, y = y0 + D - ((a * (140 + h1(i) * 120) + h1(i * 7) * D) % (D + 30)); r(Math.round(x), Math.round(y), 1, 8 + Math.floor(h1(i) * 10), h1(i + 2) > 0.5 ? SK.FLAME_HI : SK.FLAME); } });
      Gd(PX0, PY0, PR + 10, SK.FLAME, 0.4); G(0, WALL, W, FL - WALL, [255, 140, 60], 0.06); // the whole cabin glows orange
    } else {
      const u = (d - 30) / 15; sky(0.55 * (1 - u)); stars(day < 0.5 ? 0.4 : 0); clouds(-(d - 30) * 60, 5);
      if (d > 38) city(Math.round((45 - d) * 16));
    }
  }
  PX.ctx.restore();
  // the glass: a glint, top-left
  lit(() => { r(PX0 - 30, PY0 - 28, 8, 2, [255, 255, 255]); r(PX0 - 32, PY0 - 26, 2, 8, [255, 255, 255]); r(PX0 - 24, PY0 - 32, 6, 1, SK.GLASS_HI); });
  G(PX0 - PR, PY0 - PR, D, D, [140, 200, 255], 0.04);
}

// ---------- live bits ----------
function screens(f: Flight, a: number): void {
  const L = f.phase === 'pad' ? 'T-' + mmss(f.left) : f.phase === 'docked' ? 'DOCKED' : 'T+' + mmss(f.phase === 'up' ? f.k : f.k - DEPART);
  const alt = f.phase === 'up' ? Math.round(f.k < MECO ? (f.k * f.k) / (MECO * MECO) * 380 : 380 + (f.k - MECO) * 1.2) : f.phase === 'down' ? Math.round(Math.max(0, 400 * Math.pow(1 - (f.k - DEPART) / 45, 1.6))) : 0;
  const d = f.k - DEPART;
  const R = f.phase === 'pad' ? (f.left < 11 ? 'LIFTOFF IN ' + Math.ceil(f.left) : 'NEXT STOP: SPACE STATION') : f.phase === 'up' ? (f.k < MECO ? 'ALTITUDE ' + alt + ' KM' : f.k < UP_S - 3 ? 'ENGINES OFF: ZERO G' : 'DOCKING...') : f.phase === 'docked' ? 'HOME IN ' + mmss(f.left) : d < 15 ? 'HEADING HOME' : d < 30 ? 'RE-ENTRY!' : 'ALTITUDE ' + alt + ' KM';
  const warn = (f.phase === 'pad' && f.left < 11) || (f.phase === 'down' && d > 15 && d < 30);
  lit(() => {
    txt(L, 256 - tw(L, 2) / 2, 328, f.phase === 'pad' && f.left < 11 && (a % 1) < 0.5 ? SK.LED_RED : SK.LED, 2);
    txt(R.slice(0, 28), 504 - tw(R.slice(0, 28)) / 2, 331, warn ? SK.LED_RED : [255, 180, 60]);
    if (f.phase === 'docked') txt('HATCH OPEN', 504 - tw('HATCH OPEN') / 2, 339, SK.LED); else if (f.phase === 'pad' && f.left >= 11) txt('BOARDING', 504 - tw('BOARDING') / 2, 339, SK.LED);
  });
  G(196, 321, 120, 28, SK.LED, 0.05); G(444, 321, 120, 28, [255, 180, 60], 0.05);
}
/** Where the hatch goes right now (see Door.route): the roof on the pad, the station once docked. */
const hatchTo = () => { const f = flight(); return f.phase === 'pad' && f.left > 4 ? { to: 'roof' as const, arrive: PAD_ARRIVE, label: 'ROOFTOP' } : f.phase === 'docked' ? { to: 'station' as const, arrive: DOCK_ARRIVE, label: 'SPACE STATION' } : null; };
function hatch(a: number): void {
  const open = !!hatchTo(), x0 = 30, y0 = 376, w = 68, h = FL - 376;
  if (open) {
    const f = flight();
    lit(() => { r(x0, y0, w, h, f.phase === 'docked' ? [230, 236, 244] : [255, 226, 170]); r(x0, y0 + h - 10, w, 10, f.phase === 'docked' ? SK.FLOOR2 : SK.CONCRETE); });
    Gd(x0 + w / 2, y0 + h / 2, 34, f.phase === 'docked' ? [200, 230, 255] : [255, 214, 150], 0.3);
    lit(() => r(x0 + w / 2 - 3, y0 - 10, 6, 4, SK.LED));
  } else {
    r(x0, y0, w, h, SK.PANEL); r(x0, y0, w, 2, SK.HULL_HI); r(x0 + w - 4, y0, 4, h, SK.HULL_SH);
    disc(x0 + w / 2, y0 + 26, 10, SK.TRIM); disc(x0 + w / 2, y0 + 26, 8, SK.WINDOW); r(x0 + w / 2 - 20, y0 + 56, 40, 4, SK.TRIM);
    lit(() => r(x0 + w / 2 - 3, y0 - 10, 6, 4, (a % 1) < 0.5 ? SK.LED_RED : shade(SK.LED_RED, 0.5)));
  }
}
/** Loose things that drift up when you're weightless, and settle when the engines push. */
function loose(f: Flight, a: number): void {
  const fl = f.phase === 'docked' ? 1 : f.phase === 'up' ? clamp((f.k - MECO) / 2, 0, 1) : f.phase === 'down' ? clamp((14 - (f.k - DEPART)) / 2, 0, 1) : 0;
  const things: [number, number, (x: number, y: number, t: number) => void][] = [
    [330, 470, (x, y, t) => { r(x - 6, y - 1, 12, 2, K.YEL); r(x + 6, y - 1, 2, 2, K.PINK); r(x - 8, y - 1, 2, 2, SK.TRIM); void t; }], // a pencil
    [430, 468, (x, y) => { r(x - 4, y - 5, 8, 7, K.SODA); r(x - 4, y - 5, 8, 1, M(K.SODA, K.WHITE, 0.4)); r(x + 1, y - 8, 1, 3, K.STRAW); }], // a juice pouch
    [720, 470, (x, y) => { r(x - 4, y - 5, 8, 5, NDUCK); r(x - 2, y - 8, 5, 4, NDUCK); r(x + 3, y - 7, 2, 1, K.BEAK); r(x, y - 7, 1, 1, K.EYE); }], // a rubber duck
  ];
  things.forEach(([x, y, draw], i) => {
    const t = a * 0.6 + i * 2.1, fx = x + Math.sin(t) * 18 * fl, fy = y - fl * (40 + i * 16) + Math.sin(t * 1.3) * 6 * fl;
    draw(Math.round(fx), Math.round(fy), t);
  });
}
const NDUCK: RGB = [255, 210, 74];
/** Hanging straps from the ceiling: they swing with the shaking, and float when weightless. */
function straps(f: Flight, a: number): void {
  const fl = capsuleFloats(f) ? 1 : 0, sh = shake(f);
  for (const x of [120, 160, 600, 700]) { // (clear of the screens and the porthole)
    for (let j = 0; j < 22; j++) { const u = j / 22, sw = fl ? Math.sin(a * 1.4 + x + u * 3) * 8 * u : Math.sin(a * 18 + x) * sh * 4 * u; r(Math.round(x + sw), Math.round(WALL + j * 2 - (fl ? u * 10 : 0)), 2, 2, SK.RAIL_DK); }
  }
}
function drawBack(a: number): void {
  const f = flight();
  portView(f, a); screens(f, a); hatch(a); straps(f, a); loose(f, a);
  if (gForce(f) > 0.4 && f.phase === 'up') lit(() => { for (let k = 0; k < 6; k++) r(PX0 - 60 + k * 24, WALL - 5, 10, 3, (a * 6 + k) % 2 < 1 ? SK.LED_RED : shade(SK.LED_RED, 0.4)); }); // the burn: warning lights along the top
}

export const ROCKET_SPOTS: Spot[] = SEATS.map((x): Spot => ({ kind: 'sit', x, y: 478, sx: x, sy: 500, lift: 10, label: 'STRAP IN', area: { x0: x - 16, y0: 414, x1: x + 16, y1: 476 } }));
const hatchDoor: Door = { trigger: { x0: 44, y0: 488, x1: 84, y1: 496 }, to: 'roof', arrive: PAD_ARRIVE, label: 'HATCH', area: { x0: 26, y0: 372, x1: 102, y1: 488 }, route: hatchTo };

export function makeRocket(): Room {
  const room: Room = {
    id: 'rocket', title: 'THE ROCKET', sub: 'LAB 1',
    w: W, h: H,
    floor: { x0: 20, y0: 488, x1: W - 20, y1: 590 },
    blockers: [],
    doors: [hatchDoor],
    spots: ROCKET_SPOTS, inUse: new Map(),
    spawn: { x: 380, y: 530 },
    dim: 0,
    fillTop: 'rgb(58,66,86)', fillLow: 'rgb(69,76,94)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [],
    zeroG: () => capsuleFloats(),
    shake: () => shake(),
    gForce: () => gForce(),
  };
  return room;
}
