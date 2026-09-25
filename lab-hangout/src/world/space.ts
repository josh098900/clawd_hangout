// THE SPACE PROGRAMME: the rocket's timetable (all from the wall clock, like the subway: every
// player sees the same launch without a single message) and the bits of space that the rooms up
// there share: the little rotating Earth, starfields, and the rocket itself.
//
// One rocket shuttles between the Rooftop's pad and the Space Station on a 20 minute loop:
//   k = 0     LIFTOFF (at :00, :20 and :40)   'up'      45 s ascent (engines off at MECO: zero g)
//   k = 45    DOCKED at the station           'docked'  its hatch opens onto the station until...
//   k = 840   UNDOCK, the flight home         'down'    45 s: re-entry, then down on its engines
//   k = 885   ON THE PAD                      'pad'     its hatch opens onto the roof: boarding

import { K, SK, type RGB } from '../engine/palette';
import { PX, mk, r, disc, txt, tw, lit, Gd, Gsoft, M, shade } from '../engine/pixel';
import { clamp, h1 } from '../engine/math';

export const CYCLE = 1200, UP_S = 45, DEPART = 840, LAND = DEPART + 45, MECO = 28;
/** The launch pad on the Rooftop (the rocket stands on PAD_BASE), and where you step out at each end. */
export const PAD_X = 1700, PAD_BASE = 500, PAD_ARRIVE = { x: PAD_X, y: 522 }, DOCK_ARRIVE = { x: 104, y: 496 }, CAPSULE_ARRIVE = { x: 70, y: 504 };
/** Dev/tests: shift this browser's rocket clock (s). `?flight=N` in main.ts pins the loop at N s in. */
export const FLIGHT = { skew: 0 };
export type FlightPhase = 'pad' | 'up' | 'docked' | 'down';
/** Where the rocket is: `k` = seconds into the loop, `u` = 0..1 through this phase, `left` = seconds left in it, `n` = which flight. */
export interface Flight { phase: FlightPhase; k: number; u: number; left: number; n: number }
export function flight(nowMs = Date.now()): Flight {
  const s = nowMs / 1000 + FLIGHT.skew, n = Math.floor(s / CYCLE), k = s - n * CYCLE;
  if (k < UP_S) return { phase: 'up', k, u: k / UP_S, left: UP_S - k, n };
  if (k < DEPART) return { phase: 'docked', k, u: (k - UP_S) / (DEPART - UP_S), left: DEPART - k, n };
  if (k < LAND) return { phase: 'down', k, u: (k - DEPART) / (LAND - DEPART), left: LAND - k, n };
  return { phase: 'pad', k, u: (k - LAND) / (CYCLE - LAND), left: CYCLE - k, n: n + 1 };
}
/** m:ss */
export const clockText = (s: number): string => { const t = Math.max(0, Math.ceil(s)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
/** Seconds of the descent so far (0..45), or -1. */
const downT = (f: Flight): number => (f.phase === 'down' ? f.k - DEPART : -1);
/** Weightless in the capsule: engines off on the way up, docked, and the first part of the way home. */
export const capsuleFloats = (f = flight()): boolean => (f.phase === 'up' && f.k > MECO) || f.phase === 'docked' || (f.phase === 'down' && downT(f) < 14);
/** G-force (0..1) pressing everyone into their seats: the burn up and re-entry. */
export function gForce(f = flight()): number {
  if (f.phase === 'up' && f.k < MECO) return clamp(f.k / 2, 0, 1) * (f.k > MECO - 3 ? (MECO - f.k) / 3 : 1);
  const d = downT(f); return d > 14 && d < 30 ? 0.7 : d >= 30 ? 0.35 : 0;
}
/** How hard the capsule shakes right now (0..1). */
export function shake(f = flight()): number {
  if (f.phase === 'pad') return f.left < 3 ? 0.4 * (1 - f.left / 3) : 0;
  if (f.phase === 'up') { if (f.k < 4) return 1; if (f.k < MECO) return 0.55 - (f.k / MECO) * 0.3; return f.k > UP_S - 1.2 && f.k < UP_S - 0.7 ? 0.8 : 0; } // (the clunk as it docks)
  const d = downT(f); if (d >= 0) { if (d < 0.5) return 0.5; if (d > 15 && d < 30) return 0.8; if (d > 44.3) return 1; return d > 30 ? 0.25 : 0; }
  return 0;
}

// ---------- the rocket (the film's rocket, stood on its tail) ----------
/**
 * The rocket standing on base y `base` (the pad), centred on x. `door` 0..1 = how open its hatch
 * is, `flame` 0..1 = engine plume. Height 164 px, fins span 76.
 */
export function drawRocket(cx: number, base: number, a: number, door: number, flame: number): void {
  cx = Math.round(cx); base = Math.round(base);
  const top = base - 164, bw = 18;
  if (flame > 0) lit(() => { // the plume, flickering
    const f = Math.floor(a * 24) % 3, L = Math.round(26 + flame * 34 + f * 3);
    for (let j = 0; j < L; j++) { const w = Math.max(1, Math.round((10 - j * 0.12) * (0.6 + flame * 0.5))) + (j % 3 === f ? 1 : 0); r(cx - w, base + j, w * 2, 1, j < 6 ? SK.FLAME_HI : j < L * 0.6 ? SK.FLAME : M(SK.FLAME, [255, 90, 60], (j - L * 0.6) / (L * 0.4))); }
    r(cx - 3, base, 6, Math.round(L * 0.5), SK.FLAME_HI);
  });
  if (flame > 0) { Gsoft(cx, base + 22, 10, 50 + flame * 40, SK.FLAME, 0.3 + flame * 0.3); Gd(cx, base + 6, 12, SK.FLAME_HI, 0.35); }
  // fins behind the body: left and right
  for (const s of [-1, 1]) for (let j = 0; j < 44; j++) { const w = Math.round(4 + j * 0.42), x0 = s < 0 ? cx - bw - w : cx + bw; r(x0, base - 46 + j, w, 1, s < 0 ? SK.FIN : SK.NOSE_DK); }
  // the body: white, lit from the top-left
  for (let y = top + 36; y < base; y++) { r(cx - bw, y, bw * 2, 1, SK.HULL); r(cx - bw, y, 2, 1, SK.HULL_HI); r(cx + bw - 5, y, 5, 1, SK.HULL_SH); r(cx + bw - 2, y, 2, 1, SK.HULL_DK); }
  for (const y of [top + 62, top + 104, base - 10]) r(cx - bw, y, bw * 2, 1, SK.SEAM);
  r(cx - bw, top + 70, bw * 2, 5, SK.NOSE); r(cx + bw - 5, top + 70, 5, 5, SK.NOSE_DK);
  txt('LAB 1', cx - tw('LAB 1') / 2, top + 80, SK.TRIM);
  // the nose cone
  for (let j = 0; j < 36; j++) { const w = Math.max(1, Math.round(bw * Math.pow(j / 36, 0.62))); r(cx - w, top + j, w * 2, 1, SK.NOSE); r(cx + w - Math.max(1, Math.round(w * 0.3)), top + j, Math.max(1, Math.round(w * 0.3)), 1, SK.NOSE_DK); if (j > 4) r(cx - w, top + j, 1, 1, M(SK.NOSE, K.WHITE, 0.35)); }
  // the porthole (someone's always looking out)
  const py = top + 52; disc(cx, py, 8, SK.TRIM); disc(cx, py, 6, SK.WINDOW); lit(() => { r(cx - 4, py - 4, 2, 2, SK.GLASS_HI); r(cx - 2, py - 5, 2, 1, SK.GLASS); });
  // the centre fin, over the body
  r(cx - 2, base - 40, 4, 40, SK.FIN); r(cx + 1, base - 40, 1, 40, SK.NOSE_DK);
  // the hatch
  const hx = cx - 11, hy = base - 38, hw = 22, hh = 30, o = Math.round(clamp(door, 0, 1) * hw);
  r(hx - 2, hy - 2, hw + 4, hh + 2, SK.TRIM);
  if (o > 0) { lit(() => { r(hx, hy, hw, hh, [255, 226, 170]); r(hx, hy + hh - 6, hw, 6, [230, 196, 140]); }); Gd(cx, hy + hh / 2, 18, [255, 214, 150], 0.35); }
  if (o < hw) { r(hx + o, hy, hw - o, hh, SK.PANEL); r(hx + o, hy, hw - o, 1, SK.HULL_HI); r(hx + hw - 2, hy, 2, hh, SK.HULL_SH); if (hw - o > 6) r(hx + o + 3, hy + 13, 3, 4, SK.TRIM); }
}

// ---------- stars ----------
/** A still starfield in a box (for baked backdrops). */
export function starfield(x0: number, y0: number, w: number, h: number, n: number, seed: number): void {
  for (let i = 0; i < n; i++) { const b = h1(i * 3.1 + seed); r(Math.floor(x0 + h1(i * 5.3 + seed) * w), Math.floor(y0 + h1(i * 2.9 + seed * 7) * h), b > 0.93 ? 2 : 1, 1, b > 0.7 ? SK.STAR : SK.STAR_DIM); }
}
/** A few stars twinkling on top (drawn every frame). */
export function twinkles(x0: number, y0: number, w: number, h: number, n: number, seed: number, a: number): void {
  lit(() => { for (let i = 0; i < n; i++) if ((a * 0.5 + h1(i + seed)) % 1 < 0.12) { const x = Math.floor(x0 + h1(i * 7.7 + seed) * w), y = Math.floor(y0 + h1(i * 1.9 + seed) * h); r(x, y, 1, 1, K.WHITE); r(x - 1, y, 3, 1, SK.STAR_DIM); r(x, y - 1, 1, 3, SK.STAR_DIM); r(x, y, 1, 1, K.WHITE); } });
}

// ---------- Earth ----------
// Continents and clouds are two small wrap-around maps (value noise, from h1 so every browser's
// Earth is the same); the globe is re-projected into a little canvas a few times a second.
const TW = 256, TH = 128;
let LANDMAP: Uint8Array | null = null, CLOUDMAP: Uint8Array | null = null;
/** Smooth value noise on a lattice that wraps every `per` cells in x (from h1, so it's the same everywhere). */
export function vnoise(x: number, y: number, per: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const v = (i: number, j: number) => h1(((i % per) + per) % per * 57.3 + j * 131.7 + seed);
  return (v(xi, yi) * (1 - sx) + v(xi + 1, yi) * sx) * (1 - sy) + (v(xi, yi + 1) * (1 - sx) + v(xi + 1, yi + 1) * sx) * sy;
}
function maps(): void {
  if (LANDMAP) return;
  LANDMAP = new Uint8Array(TW * TH); CLOUDMAP = new Uint8Array(TW * TH);
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    const lat = Math.abs(y / TH - 0.5) * 2, n = vnoise(x / 32, y / 32, 8, 3) * 0.6 + vnoise(x / 12, y / 12, 21.333, 9) * 0.3 + vnoise(x / 5, y / 5, 51.2, 17) * 0.1;
    const i = y * TW + x;
    LANDMAP[i] = lat > 0.86 ? 3 : n > 0.56 ? (n > 0.66 && lat < 0.45 ? 2 : 1) : 0; // 0 sea, 1 green, 2 desert, 3 ice
    const c = vnoise(x / 14, y / 7, 18.286, 41) * 0.7 + vnoise(x / 5, y / 4, 51.2, 55) * 0.3;
    CLOUDMAP[i] = c > 0.67 ? 2 : c > 0.62 ? 1 : 0;
    // a city (lights at night) here and there on the land
    if (LANDMAP[i] === 1 && h1(x * 7.3 + y * 13.1) > 0.93) LANDMAP[i] = 4;
  }
}
const SUN = (() => { const v = [-0.62, -0.32, 0.72], l = Math.hypot(v[0], v[1], v[2]); return v.map((q) => q / l); })();
/** The colour of the globe at unit-sphere point (nx, ny, nz; z towards you), turned `rot` radians (the clouds `crot`). */
export function earthAt(nx: number, ny: number, nz: number, rot: number, crot: number, sun = SUN): RGB {
  maps();
  const lat = Math.asin(clamp(-ny, -1, 1)), lon = Math.atan2(nx, nz);
  const v = clamp(Math.floor((0.5 - lat / Math.PI) * TH), 0, TH - 1);
  const u = (((Math.floor(((lon + rot) / (Math.PI * 2)) * TW) % TW) + TW) % TW), uc = (((Math.floor(((lon + crot) / (Math.PI * 2)) * TW) % TW) + TW) % TW);
  const land = LANDMAP![v * TW + u], cl = CLOUDMAP![v * TW + uc];
  let c: RGB = land === 0 ? (h1(u * 3 + v) > 0.5 ? SK.OCEAN : SK.OCEAN2) : land === 2 ? SK.DESERT : land === 3 ? SK.ICE : h1(u + v * 9) > 0.6 ? SK.LAND2 : SK.LAND;
  if (cl) c = M(c, SK.CLOUD, cl === 2 ? 0.92 : 0.5);
  const light = nx * sun[0] + ny * sun[1] + nz * sun[2];
  if (light < 0.08) { // the night side: dark, with city lights
    const k = clamp((0.08 - light) / 0.22, 0, 1);
    c = M(c, SK.NIGHTSIDE, 0.55 + k * 0.4);
    if (land === 4 && !cl && k > 0.4) c = SK.CITYLIGHT;
  } else c = M(c, K.WHITE, Math.max(0, light - 0.85) * 0.8);
  if (nz < 0.3) c = M(c, SK.ATMOS, (0.3 - nz) / 0.3 * 0.55); // the blue haze at the rim
  return c;
}
/** Earth turns once every 10 minutes up here (faster than the real one, so you can see it). */
export const earthRot = (nowMs = Date.now()): number => ((nowMs / 1000) % 600) / 600 * Math.PI * 2;
const globes = new Map<number, { cv: HTMLCanvasElement; at: number }>();
/** A turning globe of radius `rad` centred on (cx, cy), with a thin atmosphere glow. Redrawn 4 times a second. */
export function drawEarth(cx: number, cy: number, rad: number, nowMs = Date.now()): void {
  let g = globes.get(rad);
  if (!g) { g = { cv: mk(rad * 2 + 2, rad * 2 + 2), at: -1 }; globes.set(rad, g); }
  if (Math.abs(nowMs - g.at) > 250) {
    g.at = nowMs;
    const c2 = g.cv.getContext('2d')!, id = c2.createImageData(g.cv.width, g.cv.height), d = id.data, rot = earthRot(nowMs), crot = rot * 1.4 + 0.7;
    for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
      const q = x * x + y * y; if (q > rad * rad) continue;
      const nx = x / rad, ny = y / rad, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), c = earthAt(nx, ny, nz, rot, crot), o = ((y + rad) * g.cv.width + (x + rad)) * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    c2.putImageData(id, 0, 0);
  }
  PX.ctx.drawImage(g.cv, Math.round(cx - rad), Math.round(cy - rad)); // (space is never dimmed: Earth lights itself)
  Gd(cx, cy, rad + 10, SK.ATMOS, 0.16); Gd(cx - rad * 0.3, cy - rad * 0.3, rad * 0.6, K.WHITE, 0.05);
}
/** The Moon, small and cratered, lit from the left. */
export function drawMoon(cx: number, cy: number, rad: number): void {
  disc(cx, cy, rad, [200, 200, 212]);
  for (let y = -rad; y <= rad; y++) { const w = Math.floor(Math.sqrt(rad * rad - y * y)), sh = Math.round(w * 0.45); if (sh > 0) r(cx + w - sh, cy + y, sh, 1, [150, 150, 166]); }
  for (let k = 0; k < 5; k++) { const x = Math.round(cx + (h1(k * 3.3) - 0.6) * rad * 1.2), y = Math.round(cy + (h1(k * 1.7) - 0.5) * rad * 1.2), s = 1 + Math.floor(h1(k) * rad * 0.25); if ((x - cx) ** 2 + (y - cy) ** 2 < (rad - s) ** 2) r(x - s, y - s, s * 2, s * 2, shade([200, 200, 212], 0.82)); }
}

// ---------- the view from a window on the way up / down (capsule porthole) ----------
/** Sky colours on the way up: the city sky at the pad, deep blue, then black. `u` 0 (ground) .. 1 (space). */
export function skyAt(u: number, day: number): RGB {
  const ground: RGB = M(K.SKY1, [120, 180, 230], day), mid: RGB = M([10, 14, 50], [40, 90, 180], day);
  return u < 0.5 ? M(ground, mid, u * 2) : M(mid, SK.VOID, (u - 0.5) * 2);
}
