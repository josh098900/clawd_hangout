// THE SPACE STATION — where the rocket from the Rooftop docks (world/space.ts runs the timetable).
// No gravity up here: you drift, bounce off the walls and bob about (main.ts does the moving,
// avatar.ts the floating); SPACE pushes you off the floor. Left to right along the module:
//   the DOCK (the rocket's hatch, when it's here, and the board saying when it goes home),
//   HYDROPONICS (6 trays per server: grow a STAR MELON, 0015_space.sql; its seed goes in the roof garden),
//   the big WINDOW (Earth turning, the Moon going by; a bench to gaze from),
//   MISSION CONTROL (the telescope: ui/mission.ts; the big screen shows where it's pointing),
//   the AIRLOCK out to the spacewalk, an ESCAPE POD (splashdown in the Park's pond),
//   and the LANDER BAY, where the lander to the Moon docks (world/moon.ts runs its timetable).
// COSMO (from the Cinema's film, A CRITTER IN SPACE) floats about showing people round.

import { mmss } from '../engine/format';
import { K, SK, type RGB } from '../engine/palette';
import { PX, mk, r, disc, ring, line, txt, tw, lit, G, Gd, M, shade, bake } from '../engine/pixel';
import { h1 } from '../engine/math';
import { CAPSULE_ARRIVE, DEPART, UP_S, drawEarth, drawMoon, flight, starfield, twinkles } from './space';
import { LANDER_CABIN_ARRIVE, L_TRIP, lander } from './moon';
import { skyThings, skyView } from './sky';
import type { ScopeState, StateMsg, Tray } from '../net/transport';
import type { Door, Prop, Room, Spot } from './room';
import { boardGlow } from './boards';

const W = 1720, H = 700, WALL = 280, FL = 470;
export const TRAY_X = [240, 302, 364, 426, 488, 550];
const WIN = { x0: 630, y0: 296, x1: 990, y1: 452 };
const SCR = { x0: 1042, y0: 300, x1: 1218, y1: 392 };
const DOCK_X = 104, AIR_X = 1325, POD_X = 1455, BAY_X = 1624;
/** The trays on this server (fetched while you're here), the telescope, and a LOCAL test speed-up for the melons (?grow=N). */
export const STATION = { trays: [] as Tray[], fetchedAt: 0, dirty: true, scope: null as ScopeState | null };
export const TRAY_SPEED = { k: 1 };
export const MELON_S = 1800, ROT_S = 88200;
/** How a melon's doing: 0 seed .. 4 ripe, rotten after a day ripe, `left` = seconds to ripe. */
export function trayState(t: Tray, at = Date.now()): { stage: number; rotten: boolean; left: number } {
  const s = (at - t.plantedAt) / 1000 * TRAY_SPEED.k, u = s / MELON_S;
  return { stage: u >= 1 ? 4 : u >= 0.7 ? 3 : u >= 0.35 ? 2 : u >= 0.1 ? 1 : 0, rotten: s > ROT_S, left: Math.max(0, MELON_S - s) / TRAY_SPEED.k };
}
const STAGES = ['JUST PLANTED', 'SPROUTING', 'VINES', 'FLOWERING', 'RIPE'];
export function trayLine(t: Tray, mine: boolean): string {
  const st = trayState(t), who = mine ? 'YOUR' : t.ownerName + "'S";
  if (st.rotten) return who + ' STAR MELON WENT OFF';
  const m = Math.ceil(st.left / 60);
  return who + ' STAR MELON · ' + STAGES[st.stage] + (st.stage < 4 ? ' · RIPE IN ' + m + ' MIN' : '');
}

// ---------- the set ----------
function build(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    
    // ceiling: ducts, cable trays and a row of light panels
    r(0, 0, W, WALL, SK.TRIM); for (let x = 0; x < W; x += 40) r(x, 0, 1, WALL, SK.TRIM_HI);
    r(0, 200, W, 10, SK.HULL_DK); r(0, 200, W, 2, SK.SEAM); r(0, 230, W, 6, shade(SK.HULL_DK, 0.8));
    for (let x = 60; x < W; x += 180) { r(x, WALL - 12, 90, 6, SK.HULL_HI); r(x, WALL - 6, 90, 2, SK.SEAM); }
    // the back wall: white padded panels, lit from the top-left
    for (let x = 0; x < W; x += 60) { const c = (x / 60) % 2 ? SK.PANEL : SK.PANEL2; r(x, WALL, 60, FL - WALL, c); r(x, WALL, 60, 2, SK.HULL_HI); r(x, WALL, 1, FL - WALL, SK.HULL_HI); r(x + 58, WALL, 2, FL - WALL, SK.SEAM); for (let y = WALL + 10; y < FL - 6; y += 30) { r(x + 5, y, 2, 2, SK.HULL_DK); r(x + 53, y, 2, 2, SK.HULL_DK); } }
    r(0, FL - 30, W, 3, SK.RAIL); r(0, FL - 28, W, 1, SK.RAIL_DK); // the handrail everyone grabs
    r(0, FL - 8, W, 8, SK.HULL_SH);
    // the floor (magnetic boots optional), carrying on below the walkable band
    r(0, FL, W, H - FL, SK.FLOOR); for (let y = FL + 6; y < H; y += 8) r(0, y, W, 1, SK.FLOOR_LN); for (let x = 0; x < W; x += 48) r(x, FL, 1, H - FL, SK.FLOOR2);
    r(0, FL, W, 3, SK.TRIM_HI); for (let x = 30; x < W; x += 90) r(x, 600, 40, 3, SK.RAIL_DK); // floor markings
    // ---- the DOCK ----
    disc(DOCK_X, 410, 50, SK.TRIM); disc(DOCK_X, 410, 46, SK.HULL_DK); disc(DOCK_X, 410, 42, SK.TRIM_HI);
    for (let k = 0; k < 16; k++) { const an = k / 16 * Math.PI * 2; r(Math.round(DOCK_X + Math.cos(an) * 48) - 1, Math.round(410 + Math.sin(an) * 48) - 1, 2, 2, SK.RAIL); }
    r(DOCK_X - 50, FL - 10, 100, 10, SK.HULL_SH);
    r(DOCK_X - 62, 290, 124, 38, SK.TRIM); r(DOCK_X - 59, 293, 118, 32, SK.SCREEN); // the departures board
    // ---- HYDROPONICS ----
    r(206, 296, 386, 14, SK.TRIM); txt('HYDROPONICS', 399 - tw('HYDROPONICS') / 2, 300, SK.GLASS_HI);
    r(212, 334, 374, 8, SK.TRIM); r(212, 334, 374, 2, SK.TRIM_HI); // the grow-light bar (its lamps are drawn lit)
    for (const x of TRAY_X) { r(x - 1, 342, 2, 100, SK.SEAM); } // the hanging wires
    r(206, 444, 386, 4, SK.HULL_DK); // the shelf the trays sit on
    // ---- the WINDOW ----
    r(WIN.x0 - 10, WIN.y0 - 10, WIN.x1 - WIN.x0 + 20, WIN.y1 - WIN.y0 + 20, SK.TRIM); r(WIN.x0 - 6, WIN.y0 - 6, WIN.x1 - WIN.x0 + 12, WIN.y1 - WIN.y0 + 12, SK.TRIM_HI);
    r(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, SK.VOID); starfield(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, 140, 5);
    for (const x of [750, 870]) r(x - 2, WIN.y0, 4, WIN.y1 - WIN.y0, SK.TRIM); // the window's struts
    // ---- MISSION CONTROL ----
    r(SCR.x0 - 8, SCR.y0 - 8, SCR.x1 - SCR.x0 + 16, SCR.y1 - SCR.y0 + 16, SK.TRIM); r(SCR.x0 - 4, SCR.y0 - 4, SCR.x1 - SCR.x0 + 8, SCR.y1 - SCR.y0 + 8, SK.TRIM_HI);
    txt('MISSION CONTROL', 1130 - tw('MISSION CONTROL') / 2, SCR.y1 + 8, SK.TRIM);
    // ---- the AIRLOCK: a heavy round hatch in hazard stripes, a spacesuit on the wall ----
    disc(AIR_X, 410, 52, SK.HAZ_DK); for (let k = 0; k < 24; k++) { const an = k / 24 * Math.PI * 2; if (k % 2) for (let d = 45; d < 52; d++) r(Math.round(AIR_X + Math.cos(an) * d), Math.round(410 + Math.sin(an) * d), 2, 2, SK.HAZ); }
    disc(AIR_X, 410, 44, SK.HULL_DK); disc(AIR_X, 410, 40, SK.PANEL2); disc(AIR_X, 404, 10, SK.TRIM); disc(AIR_X, 404, 8, SK.WINDOW);
    for (const s of [-1, 1]) r(AIR_X + s * 22 - 3, 400, 6, 16, SK.TRIM); r(AIR_X - 26, 436, 52, 4, SK.TRIM);
    r(AIR_X - 40, 292, 80, 16, SK.HAZ); for (let x = AIR_X - 40; x < AIR_X + 40; x += 10) r(x, 292, 5, 16, SK.HAZ_DK); r(AIR_X - 34, 295, 68, 10, SK.HAZ_DK); txt('AIRLOCK', AIR_X - tw('AIRLOCK') / 2, 298, SK.HAZ);
    suit(1236, 332);
    // ---- the ESCAPE POD ----
    disc(POD_X, 428, 28, SK.TRIM); disc(POD_X, 428, 24, [236, 120, 60]); disc(POD_X, 424, 8, SK.TRIM); disc(POD_X, 424, 6, SK.WINDOW);
    r(POD_X - 28, 358, 56, 22, SK.TRIM); txt('ESCAPE', POD_X - tw('ESCAPE') / 2, 361, [236, 120, 60]); txt('POD', POD_X - tw('POD') / 2, 369, [236, 120, 60]);
    // ---- the LANDER BAY: a square docking hatch ringed in gold foil, the board saying when the lander goes ----
    r(BAY_X - 50, 352, 100, 118, SK.GOLD_FOIL); for (let k = 0; k < 30; k++) r(BAY_X - 48 + Math.floor(h1(k * 3.3) * 94), 354 + Math.floor(h1(k * 7.1) * 112), 3, 1, h1(k) > 0.5 ? SK.GOLD_FOIL_HI : shade(SK.GOLD_FOIL, 0.8));
    r(BAY_X - 40, 362, 80, 108, SK.TRIM); r(BAY_X - 36, 366, 72, 104, SK.HULL_DK);
    r(BAY_X - 62, 290, 124, 38, SK.TRIM); r(BAY_X - 59, 293, 118, 32, SK.SCREEN); // the departures board
    r(BAY_X - 50, 334, 100, 12, [40, 46, 70]); txt('TO THE MOON', BAY_X - tw('TO THE MOON') / 2, 337, [200, 200, 212]);
    // ---- the ORBITAL CHART: a round nav screen in a heavy bezel on a wall arm (a city map board: E opens the map) ----
    r(CH.x - 3, CH.y + CH.r + 2, 6, 10, SK.TRIM); r(CH.x - 10, CH.y + CH.r + 10, 20, 3, SK.TRIM_HI); // the arm, bolted to the wall
    disc(CH.x, CH.y, CH.r + 4, SK.TRIM); disc(CH.x, CH.y, CH.r + 3, SK.HULL_DK); disc(CH.x, CH.y, CH.r + 1, SK.TRIM); ring(CH.x, CH.y, CH.r + 3, CH.r + 3, SK.HULL_SH);
    for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2 + 0.2; r(Math.round(CH.x + Math.cos(an) * (CH.r + 2)), Math.round(CH.y + Math.sin(an) * (CH.r + 2)), 1, 1, SK.HULL_HI); } // bolts round the bezel
    r(CH.x - 30, CH.y + CH.r + 14, 60, 10, [40, 46, 70]); r(CH.x - 30, CH.y + CH.r + 14, 60, 1, SK.TRIM_HI); txt('ORBITAL CHART', CH.x - tw('ORBITAL CHART') / 2, CH.y + CH.r + 17, [200, 200, 212]);
  });
}
/** The ORBITAL CHART (a map board) on the wall between the escape pod and the lander bay. */
const CH = { x: 1522, y: 392, r: 20 };
function chartBits(a: number): void {
  const { x, y, r: R } = CH, near = boardGlow(a), sweep = a * 1.4;
  disc(x, y, R, SK.SCREEN);
  lit(() => {
    for (let yy = y - R + 1; yy < y + R; yy += 3) { const w = Math.floor(Math.sqrt(R * R - (yy - y) * (yy - y))); r(x - w, yy, w * 2 + 1, 1, [12, 34, 40]); } // scan lines
    for (let k = 0; k < 18; k++) { const an = sweep - k * 0.05, L = R - 2; r(Math.round(x + Math.cos(an) * L * (k / 18 + 0.1)), Math.round(y + Math.sin(an) * L * (k / 18 + 0.1)), 1, 1, M(SK.LED, [12, 34, 40], k / 18)); } // the radar sweep
    for (let k = 0; k < 20; k++) { const an = k / 20 * Math.PI * 2; if (k % 2) r(Math.round(x - 7 + Math.cos(an) * 10), Math.round(y + 4 + Math.sin(an) * 6), 1, 1, [60, 140, 110]); } // the station's orbit
    disc(x - 7, y + 4, 4, [40, 110, 200]); r(x - 9, y + 2, 2, 1, [80, 190, 110]); r(x - 6, y + 5, 2, 1, [80, 190, 110]); // Earth
    disc(x + 12, y - 9, 2, [180, 180, 190]); r(x + 11, y - 10, 1, 1, K.WHITE); // the Moon
    const st = a * 0.25, sx = Math.round(x - 7 + Math.cos(st) * 10), sy = Math.round(y + 4 + Math.sin(st) * 6);
    r(sx - 1, sy, 3, 1, K.WHITE); r(sx, sy - 1, 1, 3, K.WHITE); // the station, going round
    const f = lander(), u = f.phase === 'docked' ? 0 : f.phase === 'landed' ? 1 : f.phase === 'down' ? f.d / L_TRIP : 1 - f.d / L_TRIP;
    for (let k = 1; k < 8; k++) { const q = k / 8; if (k % 2) r(Math.round(sx + (x + 12 - sx) * q), Math.round(sy + (y - 9 - sy) * q), 1, 1, [120, 110, 70]); } // the lander's route
    if ((a % 0.8) < 0.5) { const lx = Math.round(sx + (x + 12 - sx) * u), ly = Math.round(sy + (y - 9 - sy) * u); r(lx - 1, ly - 1, 3, 3, K.GOLD); }
    txt('NAV', x - tw('NAV') / 2, y - R + 4, M(SK.LED, K.GOLD, near));
  });
  G(x - R, y - R, R * 2, R * 2, [120, 255, 170], 0.07 + 0.12 * near);
  if (near > 0) lit(() => { for (let k = 0; k < 40; k++) { const an = k / 40 * Math.PI * 2; r(Math.round(x + Math.cos(an) * (R + 1)), Math.round(y + Math.sin(an) * (R + 1)), 1, 1, M(SK.TRIM, K.GOLD, near)); } });
}
/** A spacesuit hanging on the wall (the spacewalk's), helmet on a hook above it. */
function suit(x: number, y: number): void {
  const c: RGB = [236, 238, 244], s = SK.HULL_SH;
  disc(x, y + 8, 9, SK.GLASS); ring(x, y + 8, 9, 9, s); r(x - 4, y + 3, 3, 2, K.WHITE);
  r(x - 10, y + 20, 20, 30, c); r(x + 6, y + 20, 4, 30, s); r(x - 16, y + 22, 6, 22, c); r(x + 10, y + 22, 6, 22, s);
  r(x - 9, y + 50, 8, 22, c); r(x + 1, y + 50, 8, 22, s); r(x - 6, y + 28, 12, 8, SK.TRIM); lit(() => { r(x - 4, y + 30, 2, 2, SK.LED); r(x + 1, y + 30, 2, 2, SK.LED_RED); });
  r(x - 2, y - 4, 4, 3, SK.TRIM);
}

// ---------- the trays ----------
function melon(x: number, y: number, a: number, seed: number, rotten: boolean): void {
  const c = rotten ? [110, 120, 90] as RGB : SK.MELON, hi = rotten ? [140, 150, 110] as RGB : SK.MELON_HI, dk = rotten ? [80, 86, 64] as RGB : SK.MELON_DK;
  for (let j = -6; j <= 6; j++) { const w = Math.round(8 * Math.sqrt(1 - (j * j) / 49)); r(x - w, y + j, w * 2, 1, j > 3 ? dk : c); }
  r(x - 5, y - 4, 3, 2, hi); r(x - 6, y - 2, 1, 2, hi);
  for (let k = -6; k <= 6; k += 4) r(x + k, y - 4, 1, 9, dk); // stripes
  if (!rotten) { lit(() => { for (let k = 0; k < 4; k++) if ((a * 1.3 + h1(seed + k)) % 1 < 0.5) { const sx = x - 5 + Math.floor(h1(seed * 3 + k) * 10), sy = y - 4 + Math.floor(h1(seed + k * 7) * 8); r(sx, sy, 1, 1, K.WHITE); } }); Gd(x, y, 12, SK.MELON_HI, 0.22 + 0.1 * Math.sin(a * 2 + seed)); }
}
function tray(i: number, a: number): void {
  const x = TRAY_X[i], y = 468, t = STATION.trays.find((q) => q.tray === i), st = t ? trayState(t) : null;
  // the plant (zero g: vines curl upward and sway slowly, the melon floats on its stalk)
  if (t && st) {
    const sw = Math.sin(a * 0.9 + i) * 2, top = y - 18;
    if (st.stage === 0) { r(x - 2, top - 2, 5, 3, [150, 110, 70]); r(x - 1, top - 3, 3, 1, SK.VINE); }
    else {
      const hgt = [0, 10, 26, 34, 38][st.stage];
      for (let j = 0; j < hgt; j++) { const u = j / Math.max(1, hgt), xx = Math.round(x + Math.sin(u * 5 + a * 0.8 + i) * 4 * u + sw * u); r(xx, top - j, 1, 1, st.rotten ? [110, 100, 70] : SK.VINE_DK); if (j % 6 === 3) { const s = j % 12 === 3 ? -1 : 1; r(xx + (s < 0 ? -4 : 1), top - j, 4, 2, st.rotten ? [120, 110, 70] : SK.VINE); } }
      if (st.stage === 3) lit(() => { for (const [dx, dy] of [[-4, 12], [3, 20], [-2, 28]] as [number, number][]) r(x + dx + Math.round(sw), top - dy, 2, 2, SK.GROW); });
      if (st.stage === 4) { const mx = Math.round(x + sw), my = Math.round(top - hgt - 6 + Math.sin(a * 1.6 + i) * 2); melon(mx, my, a, i * 7.3, st.rotten); }
    }
  }
  // the tray: a clear tank of nutrient water with the roots in it
  r(x - 25, y - 18, 50, 18, SK.TRAY); r(x - 25, y - 18, 50, 2, M(SK.TRAY, K.WHITE, 0.3)); r(x + 21, y - 18, 4, 18, shade(SK.TRAY, 0.75));
  lit(() => { r(x - 22, y - 14, 44, 4, M(SK.WATER, SK.TRAY, 0.4)); r(x - 22 + Math.floor((a * 8 + i * 5) % 40), y - 14, 3, 1, SK.GLASS_HI); });
  if (t) for (let k = -2; k <= 2; k++) r(x + k * 3, y - 10, 1, 4, [220, 210, 170]); // roots
  const label = t ? t.ownerName.slice(0, 11) : 'FREE';
  txt(label, x - tw(label) / 2, y - 7, t ? [255, 243, 214] : [170, 176, 196]);
  if (t && st && st.stage === 4 && !st.rotten) { const bob = Math.round(Math.abs(Math.sin(a * 3)) * 2); lit(() => txt('READY', x - tw('READY') / 2, y - 78 - bob, K.GOLD)); }
}

// ---------- live bits ----------
function windowView(a: number): void {
  const g = PX.ctx, now = Date.now(), T = now / 1000;
  g.save(); g.beginPath(); g.rect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0); g.clip();
  twinkles(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, 24, 5, a);
  const mu = (T / 240) % 1, mx = WIN.x0 - 30 + mu * (WIN.x1 - WIN.x0 + 60); drawMoon(Math.round(mx), 318 + Math.round(Math.sin(mu * Math.PI) * -8), 9); // the Moon goes by every 4 minutes
  drawEarth(810, 392, 68, now);
  // the rocket: arriving (the last part of the way up) and leaving (the start of the way home)
  const f = flight(); let rk: [number, number, boolean] | null = null;
  if (f.phase === 'up' && f.k > UP_S - 14) { const u = (f.k - (UP_S - 14)) / 14; rk = [WIN.x1 + 20 - u * (WIN.x1 - WIN.x0 + 60), 440 - u * 90, true]; }
  else if (f.phase === 'down' && f.k - DEPART < 10) { const u = (f.k - DEPART) / 10; rk = [WIN.x0 - 30 + u * 150, 350 + u * 120, true]; }
  if (rk) miniRocket(Math.round(rk[0]), Math.round(rk[1]), a, rk[2]);
  g.restore();
  // glass: a glint in the top-left of each pane, and a faint reflection of the lights
  lit(() => { for (const x of [WIN.x0 + 8, 756, 876]) { r(x, WIN.y0 + 6, 14, 1, [255, 255, 255]); r(x, WIN.y0 + 7, 1, 10, [220, 240, 255]); } });
  G(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, [120, 180, 255], 0.03);
}
/** The film's rocket, small and on its side, nose to the left. */
function miniRocket(x: number, y: number, a: number, flame: boolean): void {
  if (flame) lit(() => { const f = Math.floor(a * 20) % 3; r(x + 12, y - 1, 4 + f, 3, SK.FLAME); r(x + 12, y, 2 + f, 1, SK.FLAME_HI); });
  r(x - 8, y - 3, 20, 6, SK.HULL); r(x - 8, y - 3, 20, 1, K.WHITE); r(x - 12, y - 2, 4, 4, SK.NOSE); r(x - 14, y - 1, 2, 2, SK.NOSE);
  r(x + 8, y - 6, 4, 3, SK.FIN); r(x + 8, y + 3, 4, 3, SK.FIN); r(x - 2, y - 1, 3, 3, SK.WINDOW);
}
function dockBits(a: number): void {
  const f = flight(), here = f.phase === 'docked';
  if (here) { lit(() => { disc(DOCK_X, 410, 38, [240, 226, 196]); r(DOCK_X - 38, 430, 76, 14, [214, 196, 160]); }); Gd(DOCK_X, 410, 40, [255, 220, 160], 0.3); lit(() => txt('ROCKET', DOCK_X - tw('ROCKET') / 2, 404, SK.TRIM)); }
  else { disc(DOCK_X, 410, 38, SK.PANEL); for (let k = 0; k < 6; k++) { const an = k / 6 * Math.PI * 2 + 0.3; line(DOCK_X, 410, Math.round(DOCK_X + Math.cos(an) * 36), Math.round(410 + Math.sin(an) * 36), SK.SEAM); } disc(DOCK_X, 410, 8, SK.HULL_DK); }
  lit(() => r(DOCK_X - 4, 356, 8, 4, here ? SK.LED : (a % 1) < 0.5 ? SK.LED_RED : shade(SK.LED_RED, 0.4)));
  // the departures board
  const l1 = 'ROCKET HOME', l2 = here ? (f.left < 30 ? 'LAST CALL! ' : 'BOARD NOW · ') + mmss(f.left) : f.phase === 'up' ? 'ARRIVING...' : f.phase === 'down' ? 'IN FLIGHT' : 'NEXT ONE ' + mmss(f.left + UP_S);
  lit(() => { txt(l1, DOCK_X - tw(l1) / 2, 298, [255, 180, 60]); txt(l2, DOCK_X - tw(l2) / 2, 310, here && (f.left > 30 || (a % 1) < 0.6) ? SK.LED : SK.LED_RED); });
}
function bayBits(a: number): void {
  const f = lander(), here = f.phase === 'docked' && f.left > 4;
  if (here) { lit(() => { r(BAY_X - 36, 366, 72, 104, [240, 226, 196]); r(BAY_X - 36, 452, 72, 18, [214, 196, 160]); }); Gd(BAY_X, 418, 40, [255, 220, 160], 0.3); lit(() => txt('LANDER', BAY_X - tw('LANDER') / 2, 404, SK.TRIM)); }
  else { r(BAY_X - 36, 366, 72, 104, SK.PANEL); r(BAY_X - 36, 366, 72, 2, SK.HULL_HI); r(BAY_X + 32, 366, 4, 104, SK.HULL_SH); r(BAY_X - 2, 366, 4, 104, SK.SEAM); for (const s of [-1, 1]) r(BAY_X + s * 14 - 2, 410, 4, 14, SK.TRIM); }
  lit(() => r(BAY_X - 4, 356, 8, 4, here ? SK.LED : (a % 1) < 0.5 ? SK.LED_RED : shade(SK.LED_RED, 0.4)));
  const back = f.phase === 'landed' ? f.left + L_TRIP : 0; // (seconds until it's back here)
  const l1 = 'LANDER TO THE MOON', l2 = here ? (f.left < 30 ? 'LAST CALL! ' : 'BOARD NOW · ') + mmss(f.left) : f.phase === 'down' ? 'DESCENDING...' : f.phase === 'landed' ? 'ON THE MOON · BACK ' + mmss(back) : f.phase === 'up' ? 'ARRIVING ' + mmss(f.left) : 'DEPARTING';
  lit(() => { txt(l1, BAY_X - tw(l1) / 2, 298, [255, 180, 60]); txt(l2, BAY_X - tw(l2) / 2, 310, here && (f.left > 30 || (a % 1) < 0.6) ? SK.LED : f.phase === 'up' ? K.GOLD : SK.LED_RED); });
}
function growLights(a: number): void {
  lit(() => { for (let x = 216; x < 584; x += 12) r(x, 340, 8, 2, (Math.floor(x / 12) % 2) ? SK.GROW : SK.GROW2); });
  for (let k = 0; k < 8; k++) G(214, 342 + k * 12, 372, 12, SK.GROW, 0.03 + 0.005 * Math.sin(a * 2));
}
function missionScreen(a: number): void {
  const s = STATION.scope, fresh = s && Date.now() / 1000 - s.at < 9, comet = skyThings().find((t) => t.kind === 'comet')!;
  const idle = !s?.by, cx = idle ? comet.x : s!.x, cy = idle ? comet.y : s!.y; // (nobody at it: it tracks the comet)
  const w = SCR.x1 - SCR.x0, h = SCR.y1 - SCR.y0;
  skyView(SCR.x0, SCR.y0, w, h, cx, cy, Date.now(), true);
  lit(() => { // the crosshair, and who's at the controls
    const mx = SCR.x0 + w / 2, my = SCR.y0 + h / 2; r(mx - 6, my, 4, 1, SK.LED); r(mx + 3, my, 4, 1, SK.LED); r(mx, my - 6, 1, 4, SK.LED); r(mx, my + 3, 1, 4, SK.LED);
    const t = s?.by ? s.by + ' AT THE TELESCOPE' : 'TRACKING ' + comet.name; txt(t.slice(0, 40), SCR.x0 + 3, SCR.y0 + 2, SK.LED);
    if (fresh && s!.saw) { const m = 'SPOTTED: ' + s!.saw; r(SCR.x0 + 2, SCR.y1 - 10, tw(m) + 4, 8, SK.SCREEN); txt(m, SCR.x0 + 4, SCR.y1 - 9, (a % 0.5) < 0.3 ? K.GOLD : K.WHITE); }
  });
  G(SCR.x0, SCR.y0, w, h, [120, 200, 255], 0.06);
}
function airlockBits(a: number): void {
  lit(() => { r(AIR_X - 50, 460, 6, 4, (a % 1.4) < 0.7 ? SK.LED : shade(SK.LED, 0.4)); r(AIR_X + 44, 460, 6, 4, (a % 1.4) >= 0.7 ? SK.LED : shade(SK.LED, 0.4)); });
  lit(() => { const on = (a % 2) < 1; r(POD_X - 3, 392, 6, 3, on ? [255, 160, 80] : shade([255, 160, 80], 0.4)); }); Gd(POD_X, 394, 8, [255, 160, 80], 0.2);
}
/** Things floating about in the air: a wrench, a pen, a water droplet wobbling, somebody's sandwich. */
function drifters(): void {
  const T = Date.now() / 1000;
  const list: ((x: number, y: number, t: number) => void)[] = [
    (x, y, t) => { const o = Math.round(Math.sin(t) * 2); r(x - 6, y + o, 10, 2, [150, 158, 172]); r(x + 4, y - 2 + o, 3, 6, [150, 158, 172]); r(x - 8, y - 1 + o, 3, 4, [150, 158, 172]); },
    (x, y) => { r(x - 5, y, 10, 1, SK.NOSE); r(x + 5, y, 2, 1, SK.TRIM); },
    (x, y, t) => { const w = 3 + Math.round(Math.sin(t * 4) * 1), hh = 3 - Math.round(Math.sin(t * 4) * 1); lit(() => { r(x - w, y - hh, w * 2, hh * 2, [140, 210, 255]); r(x - w + 1, y - hh, 2, 1, K.WHITE); }); },
    (x, y) => { r(x - 6, y - 3, 12, 2, [230, 190, 120]); r(x - 6, y - 1, 12, 2, [110, 200, 90]); r(x - 6, y + 1, 12, 2, [200, 90, 70]); r(x - 6, y + 3, 12, 2, [230, 190, 120]); },
  ];
  list.forEach((draw, i) => {
    const per = 90 + i * 23, u = ((T / per + h1(i) ) % 1), x = 150 + u * 1200, y = 330 + Math.sin(T * 0.3 + i * 2) * 40 + i * 18;
    if (x > WIN.x0 - 10 && x < WIN.x1 + 10 && y > WIN.y0 && y < WIN.y1) return; // (not drawn over the window)
    draw(Math.round(x), Math.round(y), T + i);
  });
}
function drawBack(a: number): void {
  for (let x = 60; x < W; x += 180) G(x, WALL - 12, 90, 30, [230, 240, 255], 0.06);
  windowView(a); dockBits(a); growLights(a); missionScreen(a); airlockBits(a); bayBits(a); chartBits(a); drifters();
}

// ---------- props ----------
const bench: Prop = { y: 568, draw() { const x0 = 736, x1 = 884; r(x0, 548, x1 - x0, 10, K.NAVY_L); r(x0, 548, x1 - x0, 2, M(K.NAVY_L, K.WHITE, 0.2)); r(x0, 558, x1 - x0, 4, K.NAVY); for (const x of [x0 + 6, x1 - 10]) r(x, 562, 4, 6, SK.TRIM); r(x0 + 30, 562, x1 - x0 - 60, 2, SK.RAIL); } };
const console_: Prop = {
  y: 470,
  draw(a: number) {
    const x0 = 1040, x1 = 1220;
    r(x0, 436, x1 - x0, 16, SK.TRIM); r(x0, 436, x1 - x0, 2, SK.TRIM_HI); r(x0 + 4, 452, x1 - x0 - 8, 18, shade(SK.TRIM, 0.85));
    lit(() => { for (let k = 0; k < 22; k++) { const on = (a * (0.7 + h1(k) * 2) + h1(k * 3)) % 1 < 0.6; r(x0 + 8 + k * 8, 441, 4, 3, on ? ([SK.LED, SK.LED_RED, K.GOLD, K.CYAN][k % 4]) : SK.TRIM_HI); } });
    for (const x of [1090, 1170]) { r(x - 16, 424, 32, 12, SK.SCREEN); lit(() => { for (let k = 0; k < 4; k++) r(x - 13, 426 + k * 2, 6 + Math.floor(h1(k + x + Math.floor(a * 2)) * 20), 1, SK.LED); }); }
  },
};
export const STATION_SPOTS: Spot[] = [
  ...TRAY_X.map((x, n): Spot => ({ kind: 'tray', n, x, y: 494, sx: x, sy: 494, lift: 0, label: 'TRAY', area: { x0: x - 26, y0: 404, x1: x + 26, y1: 470 } })), // 0..5
  ...[760, 810, 860].map((x): Spot => ({ kind: 'sit', x, y: 569, sx: x, sy: 586, lift: 8, label: 'GAZE', area: { x0: x - 24, y0: 540, x1: x + 24, y1: 566 } })), // 6..8
  ...[1090, 1170].map((x): Spot => ({ kind: 'mission', x, y: 490, sx: x, sy: 494, lift: 0, label: 'TELESCOPE', area: { x0: x - 36, y0: 416, x1: x + 36, y1: 470 } })), // 9, 10
  { kind: 'map', x: 1522, y: 494, sx: 1522, sy: 494, lift: 0, label: 'MAP', area: { x0: 1494, y0: 364, x1: 1550, y1: 446 } }, // 11: the orbital chart
];
const dockDoor: Door = { trigger: { x0: DOCK_X - 20, y0: 480, x1: DOCK_X + 20, y1: 488 }, to: 'rocket', arrive: CAPSULE_ARRIVE, label: 'ROCKET', area: { x0: DOCK_X - 46, y0: 362, x1: DOCK_X + 46, y1: 480 }, route: () => (flight().phase === 'docked' ? { to: 'rocket', arrive: CAPSULE_ARRIVE, label: 'ROCKET HOME' } : null) };
export const SPACEWALK_ARRIVE = { x: 200, y: 420 };
const airlock: Door = { trigger: { x0: AIR_X - 20, y0: 480, x1: AIR_X + 20, y1: 488 }, to: 'spacewalk', arrive: SPACEWALK_ARRIVE, label: 'SPACEWALK', area: { x0: AIR_X - 46, y0: 358, x1: AIR_X + 46, y1: 480 } };
const pod: Door = { trigger: { x0: POD_X - 16, y0: 480, x1: POD_X + 16, y1: 488 }, to: 'park', arrive: { x: 776, y: 620 }, label: 'ESCAPE POD', area: { x0: POD_X - 30, y0: 396, x1: POD_X + 30, y1: 480 } };
const bay: Door = { trigger: { x0: BAY_X - 20, y0: 480, x1: BAY_X + 20, y1: 488 }, to: 'lander', arrive: LANDER_CABIN_ARRIVE, label: 'LANDER', area: { x0: BAY_X - 46, y0: 352, x1: BAY_X + 46, y1: 480 }, route: () => { const f = lander(); return f.phase === 'docked' && f.left > 4 ? { to: 'lander', arrive: LANDER_CABIN_ARRIVE, label: 'LANDER TO THE MOON' } : null; } };

export function makeSpaceStation(): Room {
  const room: Room = {
    id: 'station', title: 'SPACE STATION', sub: 'LAB ORBITAL',
    w: W, h: H,
    floor: { x0: 16, y0: 480, x1: W - 16, y1: 606 },
    blockers: [{ x0: 734, y0: 560, x1: 886, y1: 570 }],
    doors: [dockDoor, airlock, pod, bay],
    spots: STATION_SPOTS, inUse: new Map(),
    onState(s: StateMsg) { if (s.k === 'scope') STATION.scope = s.v; else if (s.k === 'trays') STATION.dirty = true; },
    spawn: { x: DOCK_X, y: 500 },
    dim: 0,
    fillTop: 'rgb(58,66,86)', fillLow: 'rgb(69,76,94)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [...TRAY_X.map((_, i): Prop => ({ y: 468, draw: (a: number) => tray(i, a) })), bench, console_],
    watch: { x: 810, top: 284 },
    zeroG: () => true,
  };
  return room;
}
