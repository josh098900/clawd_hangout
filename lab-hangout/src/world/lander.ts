// THE LANDER (LUNA 1): the little craft that shuttles between the Space Station's LANDER BAY and the Moon,
// run by the clock in world/moon.ts like the rocket: everyone aboard is in this room together. Four seats,
// the mission screens, and a big window with the trip going past it: the station sliding away, the Moon
// growing, the ground rushing up, dust at touchdown, and the same again backwards on the way home.

import { mmss } from '../engine/format';
import { K, MN, SK, type RGB } from '../engine/palette';
import { PX, mk, r, disc, txt, tw, lit, G, Gd, M, shade, puff, bake } from '../engine/pixel';
import { clamp, eIn, eOut, h1 } from '../engine/math';
import { drawEarth, drawMoon, starfield } from './space';
import { L_TRIP, MOON_PAD_ARRIVE, lander, landerFloats, landerG, landerShake, type LFlight } from './moon';
import type { Door, Room, Spot } from './room';

const W = 700, H = 600, WALL = 290, FL = 474;
const WIN = { x0: 236, y0: 300, x1: 464, y1: 410 };
const SEATS = [150, 204, 496, 550];
/** Where you step out at the station's LANDER BAY. */
export const LANDER_BAY_ARRIVE = { x: 1624, y: 500 };

function build(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    r(0, 0, W, WALL, SK.TRIM); for (let x = 0; x < W; x += 34) r(x, 0, 1, WALL, SK.TRIM_HI); r(0, WALL - 8, W, 8, shade(SK.TRIM, 0.8));
    // the faceted cabin wall: gold foil showing at the seams (it's a lander: foil everywhere)
    for (let x = 0; x < W; x += 2) { const k = Math.abs(x - W / 2) / (W / 2); r(x, WALL, 2, FL - WALL, M(SK.PANEL, SK.HULL_DK, k * k * 0.6)); }
    for (let x = 30; x < W; x += 80) { r(x, WALL, 2, FL - WALL, SK.GOLD_FOIL); r(x, WALL, 1, FL - WALL, SK.GOLD_FOIL_HI); }
    r(0, WALL + 70, W, 1, SK.SEAM); r(0, FL - 22, W, 1, SK.SEAM);
    r(0, FL, W, H - FL, SK.FLOOR); for (let y = FL + 4; y < H; y += 6) r(0, y, W, 1, SK.FLOOR_LN); for (let x = 0; x < W; x += 12) r(x, FL, 1, H - FL, SK.FLOOR2);
    r(0, FL, W, 3, SK.TRIM_HI);
    // the window's frame: angled top corners, like the craft's triangular windows
    r(WIN.x0 - 10, WIN.y0 - 10, WIN.x1 - WIN.x0 + 20, WIN.y1 - WIN.y0 + 20, SK.TRIM); r(WIN.x0 - 6, WIN.y0 - 6, WIN.x1 - WIN.x0 + 12, WIN.y1 - WIN.y0 + 12, SK.TRIM_HI);
    // screens either side
    for (const x0 of [96, 494]) { r(x0 - 3, 312, 116, 34, SK.TRIM); r(x0, 315, 110, 28, SK.SCREEN); }
    // handrails, a checklist on the wall, the suit lockers
    r(110, 372, 480, 3, SK.RAIL); r(110, 374, 480, 1, SK.RAIL_DK);
    r(590, 386, 90, 84, SK.PANEL2); r(592, 388, 42, 80, SK.PANEL); r(636, 388, 42, 80, SK.PANEL); txt('SUITS', 613 - tw('SUITS') / 2, 392, SK.TRIM); txt('ROCKS', 657 - tw('ROCKS') / 2, 392, SK.TRIM);
    r(120, 384, 36, 44, [250, 246, 232]); for (let y = 390; y < 424; y += 5) r(124, y, 20 + Math.floor(h1(y) * 8), 1, SK.HULL_DK); txt('LAND', 124, 385, SK.TRIM);
    r(26, 372, 76, FL - 372, SK.TRIM); r(30, 376, 68, FL - 376, SK.TRIM_HI); // the hatch frame
    for (const x of SEATS) {
      r(x - 14, 420, 28, 10, K.NAVY); r(x - 14, 420, 28, 2, K.NAVY_L);
      r(x - 12, 432, 24, 32, K.NAVY_L); r(x - 12, 432, 24, 2, M(K.NAVY_L, K.WHITE, 0.2)); r(x + 8, 432, 4, 32, K.NAVY);
      r(x - 15, 462, 30, 10, K.NAVY); r(x - 15, 462, 30, 2, K.NAVY_L); r(x - 12, 472, 3, 4, SK.TRIM); r(x + 9, 472, 3, 4, SK.TRIM);
      r(x - 6, 434, 2, 28, SK.RAIL_DK); r(x + 4, 434, 2, 28, SK.RAIL_DK);
    }
    txt('LUNA 1', W / 2 - tw('LUNA 1') / 2, 440, SK.TRIM);
  });
}

// ---------- the window ----------
/** The Moon's ground seen from above as it rushes up: the horizon `hz` px from the window's top, craters scaled by `z`. */
function ground(hz: number, z: number, a: number): void {
  const x0 = WIN.x0, y0 = WIN.y0, w = WIN.x1 - WIN.x0, h = WIN.y1 - WIN.y0, top = Math.round(y0 + hz);
  if (top >= y0 + h) return;
  for (let y = Math.max(y0, top); y < y0 + h; y += 2) r(x0, y, w, 2, M(MN.HILL2, MN.REG, clamp((y - top) / 60, 0, 1)));
  for (let i = 0; i < 16; i++) { // craters: further down = nearer = bigger; shadowed inside on the top-left, a lit rim along the bottom
    const u = h1(i * 3.7), v = h1(i * 1.3), cy = top + Math.pow(v, 1.6) * (y0 + h - top), cx = x0 + u * w, rad = (3 + h1(i) * 9) * (0.4 + v * 1.6) * z, ry = Math.max(1, Math.round(rad * 0.3));
    if (cy > y0 + h || rad < 2) continue;
    for (let j = -ry; j <= ry; j++) {
      const hw = Math.round(rad * Math.sqrt(1 - (j * j) / (ry * ry))), yy = Math.round(cy + j); if (yy < Math.max(top, y0) || yy >= y0 + h || hw < 1) continue;
      r(Math.round(cx - hw), yy, hw * 2, 1, MN.REG_DK); r(Math.round(cx), yy, hw, 1, j > -ry / 2 ? MN.REG : MN.REG_DK);
    }
    if (Math.round(cy + ry + 1) < y0 + h) r(Math.round(cx - rad * 0.8), Math.round(cy + ry + 1), Math.round(rad * 1.6), 1, MN.REG_HI);
  }
  r(x0, top, w, 1, MN.REG_HI);
}
function view(f: LFlight, a: number): void {
  const g = PX.ctx, x0 = WIN.x0, y0 = WIN.y0, w = WIN.x1 - WIN.x0, h = WIN.y1 - WIN.y0, cx = x0 + w / 2;
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  r(x0, y0, w, h, SK.VOID); starfield(x0, y0, w, h, 60, 17);
  const hull = (dy: number) => { r(x0, y0 + dy - 60, w, 60, SK.HULL); for (let x = x0 + 10; x < x0 + w; x += 26) r(x, y0 + dy - 60, 1, 60, SK.SEAM); r(x0, y0 + dy - 4, w, 4, SK.HULL_SH); r(x0 + 20, y0 + dy - 12, 40, 6, SK.GOLD_FOIL); lit(() => r(x0 + w - 30, y0 + dy - 20, 12, 8, [255, 226, 170])); };
  const moonDisc = (rad: number, cy: number) => { if (rad < 60) drawMoon(Math.round(cx), Math.round(cy), Math.round(rad)); else { disc(Math.round(cx), Math.round(cy), Math.round(rad), [200, 200, 212]); for (let k = 0; k < 14; k++) { const px = cx + (h1(k * 3.3) - 0.5) * rad * 1.4, py = cy + (h1(k * 1.7) - 0.5) * rad * 1.4, s = Math.max(1, Math.round(h1(k) * rad * 0.12)); if ((px - cx) ** 2 + (py - cy) ** 2 < (rad - s) ** 2) r(Math.round(px - s), Math.round(py - s * 0.6), s * 2, Math.round(s * 1.2), [168, 168, 184]); } } };
  if (f.phase === 'docked') { hull(58); drawMoon(Math.round(cx + 60), y0 + h - 22, 12); }
  else if (f.phase === 'down') {
    const d = f.d;
    if (d < 6) { hull(58 - eIn(d / 6) * 70); drawMoon(Math.round(cx + 60 - d * 8), y0 + h - 22 + d * 2, 12 + d); }
    else if (d < 36) { const u = (d - 6) / 30, rad = 18 + eIn(u) * 240; moonDisc(rad, y0 + h + rad * 0.55 - u * 30); }
    else { const u = (d - 36) / (L_TRIP - 36); ground(h * 0.55 * (1 - eOut(u)) - 4, 0.6 + u * 2.4, a); if (d > 54) for (let k = 0; k < 10; k++) puff(x0 + h1(k) * w, y0 + h - 10 - h1(k * 3) * 30, (a * 1.2 + k * 0.1) % 1, 1, 12, MN.REG_HI, 0.6); }
  } else if (f.phase === 'landed') {
    drawEarth(Math.round(x0 + w * 0.72), y0 + 26, 14); ground(h * 0.52, 1, a);
    // the base's domes, far off
    for (const [dx, rad, c] of [[0.2, 16, MN.BASE], [0.32, 11, MN.DOME]] as [number, number, RGB][]) for (let j = 0; j <= rad * 0.7; j++) { const hw = Math.round(Math.sqrt(rad * rad - j * j)); r(Math.round(x0 + w * dx - hw), Math.round(y0 + h * 0.52 + 8 - j), hw * 2, 1, c); }
  } else {
    const d = f.d;
    if (d < 22) { ground(h * 0.52 + eIn(d / 22) * h * 0.6, 1 - d / 30, a); if (d < 5) for (let k = 0; k < 10; k++) puff(x0 + h1(k) * w, y0 + h - 10 - h1(k * 3) * 30, (a * 1.2 + k * 0.1) % 1, 1, 12, MN.REG_HI, 0.6); }
    else if (d < 56) { const u = (d - 22) / 34, rad = 240 * (1 - eOut(u)) + 14; moonDisc(rad, y0 + h + rad * 0.4 + u * 10); if (u > 0.6) hull(Math.round((u - 0.6) / 0.4 * 58)); }
    else hull(58);
  }
  g.restore();
  lit(() => { r(x0 + 8, y0 + 6, 16, 1, K.WHITE); r(x0 + 8, y0 + 7, 1, 12, [220, 240, 255]); });
  r(cx - 2, y0, 4, h, SK.TRIM); // the mullion
  G(x0, y0, w, h, [140, 200, 255], 0.04);
}
function screens(f: LFlight, a: number): void {
  const L = f.phase === 'docked' ? 'UNDOCK ' + mmss(f.left) : f.phase === 'landed' ? 'LIFTOFF ' + mmss(f.left) : 'T+' + mmss(f.d);
  const alt = f.phase === 'down' ? Math.round(Math.max(0, 110 * Math.pow(1 - f.d / L_TRIP, 1.4))) : f.phase === 'up' ? Math.round(110 * Math.pow(f.d / L_TRIP, 1.2)) : 0;
  const R = f.phase === 'docked' ? (f.left < 12 ? 'UNDOCKING IN ' + Math.ceil(f.left) : 'NEXT STOP: THE MOON') : f.phase === 'landed' ? 'ON THE MOON · HATCH OPEN' : f.phase === 'down' ? (f.d < 36 ? 'COASTING · ALT ' + alt + ' KM' : f.d < 58 ? 'BRAKING BURN · ALT ' + alt + ' KM' : 'CONTACT!') : f.d < 22 ? 'ASCENT BURN · ALT ' + alt + ' KM' : f.d < 56 ? 'COASTING TO THE STATION' : 'DOCKING...';
  const warn = (f.phase === 'docked' && f.left < 12) || (f.phase === 'landed' && f.left < 20);
  lit(() => { txt(L, 151 - tw(L, 2) / 2, 322, warn && (a % 1) < 0.5 ? SK.LED_RED : SK.LED, 2); txt(R.slice(0, 26), 549 - tw(R.slice(0, 26)) / 2, 326, warn ? SK.LED_RED : [255, 180, 60]); });
  G(96, 315, 110, 28, SK.LED, 0.05); G(494, 315, 110, 28, [255, 180, 60], 0.05);
}
/** Where the hatch goes right now: the station's LANDER BAY while docked, the Moon once landed. */
const hatchTo = () => { const f = lander(); return f.phase === 'docked' && f.left > 4 ? { to: 'station' as const, arrive: LANDER_BAY_ARRIVE, label: 'SPACE STATION' } : f.phase === 'landed' && f.left > 4 ? { to: 'moon' as const, arrive: MOON_PAD_ARRIVE, label: 'THE MOON' } : null; };
function hatch(a: number): void {
  const open = hatchTo(), x0 = 30, y0 = 376, w = 68, h = FL - 376;
  if (open) {
    const moon = open.to === 'moon';
    lit(() => { r(x0, y0, w, h, moon ? [210, 210, 222] : [230, 236, 244]); if (moon) { r(x0, y0, w, 40, SK.VOID); r(x0 + 50, y0 + 8, 1, 1, K.WHITE); r(x0 + 12, y0 + 20, 1, 1, K.WHITE); r(x0, y0 + h - 16, w, 16, MN.REG); } else r(x0, y0 + h - 10, w, 10, SK.FLOOR2); });
    Gd(x0 + w / 2, y0 + h / 2, 34, moon ? [220, 220, 240] : [200, 230, 255], 0.3);
    lit(() => r(x0 + w / 2 - 3, y0 - 10, 6, 4, SK.LED));
  } else {
    r(x0, y0, w, h, SK.PANEL); r(x0, y0, w, 2, SK.HULL_HI); r(x0 + w - 4, y0, 4, h, SK.HULL_SH);
    disc(x0 + w / 2, y0 + 26, 10, SK.TRIM); disc(x0 + w / 2, y0 + 26, 8, SK.WINDOW); r(x0 + w / 2 - 20, y0 + 56, 40, 4, SK.TRIM);
    lit(() => r(x0 + w / 2 - 3, y0 - 10, 6, 4, (a % 1) < 0.5 ? SK.LED_RED : shade(SK.LED_RED, 0.5)));
  }
}
/** A moon rock sample in a jar on the shelf, and a checklist floating free when you're weightless. */
function loose(f: LFlight, a: number): void {
  const fl = landerFloats(f) ? 1 : 0, t = a * 0.6, x = Math.round(300 + Math.sin(t) * 20 * fl), y = Math.round(468 - fl * 50 + Math.sin(t * 1.3) * 6 * fl);
  r(x - 5, y - 6, 10, 8, [230, 236, 244]); r(x - 5, y - 6, 10, 1, K.WHITE); lit(() => { r(x - 2, y - 4, 4, 4, MN.CRYSTAL); r(x - 1, y - 4, 1, 1, MN.CRYSTAL_HI); });
}
function drawBack(a: number): void {
  const f = lander();
  view(f, a); screens(f, a); hatch(a); loose(f, a);
  if (landerG(f) > 0.3) lit(() => { for (let k = 0; k < 5; k++) r(250 + k * 44, WALL - 5, 10, 3, (a * 6 + k) % 2 < 1 ? SK.LED_RED : shade(SK.LED_RED, 0.4)); });
}

export const LANDER_SPOTS: Spot[] = SEATS.map((x): Spot => ({ kind: 'sit', x, y: 478, sx: x, sy: 500, lift: 10, label: 'STRAP IN', area: { x0: x - 16, y0: 418, x1: x + 16, y1: 476 } }));
const hatchDoor: Door = { trigger: { x0: 44, y0: 488, x1: 84, y1: 496 }, to: 'station', arrive: LANDER_BAY_ARRIVE, label: 'HATCH', area: { x0: 26, y0: 372, x1: 102, y1: 488 }, route: hatchTo };

export function makeLander(): Room {
  const room: Room = {
    id: 'lander', title: 'THE LANDER', sub: 'LUNA 1',
    w: W, h: H,
    floor: { x0: 20, y0: 488, x1: W - 20, y1: 580 },
    blockers: [],
    doors: [hatchDoor],
    spots: LANDER_SPOTS, inUse: new Map(),
    spawn: { x: 350, y: 530 },
    dim: 0,
    fillTop: 'rgb(58,66,86)', fillLow: 'rgb(69,76,94)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [],
    zeroG: () => landerFloats(),
    lowG: () => lander().phase === 'landed',
    shake: () => landerShake(),
    gForce: () => landerG(),
  };
  return room;
}
