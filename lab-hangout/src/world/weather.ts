// Things in the sky that everyone shares because they come from the wall clock: the wind (kites
// fly on it) and the WEATHER over the outdoor rooms (the Square, the Pier, the Rooftop, the Park).
//
// Weather: every 15 minutes (UTC) is a slot, and an integer hash of the slot number picks clear,
// rain, a storm (rain + lightning + thunder) or fog; rain and storms fall as snow in the winter
// season. It fades in and out over ~50 s when it changes. The server does the same sums
// (supabase/migrations/0011_weather.sql) so rain can water the Rooftop gardens: keep roll() and
// kindOf() in step with private.weather_roll() and private.weather().
// Rain also makes the fish bite faster at the Pier (main.ts).

import { r, alpha, lit, line } from '../engine/pixel';
import { h1 } from '../engine/math';
import { season } from './season';
import type { Room, RoomId } from './room';

/** The wind right now: dx = -1..1 which way it blows (and how hard), gust = 0..1. */
export function wind(nowMs = Date.now()): { dx: number; gust: number } {
  const t = nowMs / 1000;
  const dx = Math.sin(t / 97) * 0.7 + Math.sin(t / 23 + 1.3) * 0.3;
  const gust = 0.5 + 0.5 * Math.sin(t / 7.3) * Math.sin(t / 3.1 + 0.4);
  return { dx: Math.max(-1, Math.min(1, dx)), gust };
}

export type Sky = 'clear' | 'rain' | 'storm' | 'fog' | 'snow';
export const SKIES: Sky[] = ['clear', 'rain', 'storm', 'fog', 'snow'];
/** The rooms with weather. */
export const OUTDOORS: RoomId[] = ['plaza', 'pier', 'roof', 'park'];
const SLOT = 900, FADE = 50;

/** 0..999 for slot `slot` (a 32-bit integer mix: the server's private.weather_roll() gives the same). */
export function roll(slot: number): number {
  let h = slot >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) % 1000;
}
function kindOf(slot: number): Sky {
  const n = roll(slot), k: Sky = n < 450 ? 'clear' : n < 700 ? 'rain' : n < 830 ? 'storm' : 'fog';
  return (k === 'rain' || k === 'storm') && season() === 'winter' ? 'snow' : k;
}
/** `?weather=storm` (and the debug hook) pin the weather in this browser, for testing. */
let forced: Sky | null = null;
export function forceWeather(s: string | null): void { forced = SKIES.includes(s as Sky) ? (s as Sky) : null; }

/** The weather now: its kind, how strong (0..1, it fades in and out), which slot, and seconds left in it. */
export function weather(nowMs = Date.now()): { kind: Sky; k: number; slot: number; left: number } {
  const s = nowMs / 1000, slot = Math.floor(s / SLOT), u = s - slot * SLOT;
  if (forced) return { kind: forced, k: 1, slot, left: SLOT - u };
  const kind = kindOf(slot);
  let k = 1;
  if (kindOf(slot - 1) !== kind && u < FADE) k = u / FADE;
  if (kindOf(slot + 1) !== kind && SLOT - u < FADE) k = Math.min(k, (SLOT - u) / FADE);
  return { kind, k, slot, left: SLOT - u };
}
export const raining = (w = weather()): boolean => (w.kind === 'rain' || w.kind === 'storm') && w.k > 0.5;
/** What to tell people when it starts. */
export const WEATHER_NEWS: Record<Sky, string> = {
  clear: 'The sky is clearing up.',
  rain: 'It\'s starting to rain. The fish bite faster in the rain, and it waters the gardens!',
  storm: 'A thunderstorm is rolling in! The fish are biting like crazy.',
  fog: 'A thick fog is rolling in...',
  snow: 'It\'s snowing!',
};

/**
 * Lightning in a storm, from the clock (so everyone sees the same flash): each 7 s window may have
 * one strike. Returns the flash (0..1), where the bolt comes down (0..1 across the view), and the
 * strike number (for the thunder, which follows ~1.5 s later).
 */
export function lightning(nowMs = Date.now()): { f: number; x: number; id: number; since: number } {
  const s = nowMs / 1000, w = Math.floor(s / 7), u = s - w * 7, at = 0.5 + (roll(w + 90001) % 500) / 100;
  if (roll(w + 50003) >= 420 || u < at) return { f: 0, x: 0, id: -1, since: -1 };
  const t = u - at, f = t < 0.1 ? 1 - t / 0.1 * 0.3 : t < 0.18 ? 0.25 : t < 0.3 ? 0.8 - (t - 0.18) * 6 : 0;
  return { f: Math.max(0, f), x: (roll(w + 7717) % 1000) / 1000, id: w, since: t };
}

// ---------- drawing (over the whole view, after everything else) ----------
type Cam = { x: number; y: number; w: number; h: number };
const WHITE: [number, number, number] = [236, 240, 255];

/**
 * Extra shade over the backdrop (the sky and the buildings), fading out down to where the floor
 * starts. Anchored to the WORLD, not the view, so it stays put as the camera moves.
 */
function skyShade(room: Room, cam: Cam, a: number, col: [number, number, number]): void {
  const FADE = 160, y0 = room.floor.y0, top = y0 - FADE, y1 = Math.min(y0, cam.y + cam.h);
  lit(() => {
    if (cam.y < top) alpha(a, () => r(cam.x, cam.y, cam.w + 1, top - cam.y, col));
    for (let y = Math.max(top, Math.floor(cam.y / 4) * 4); y < y1; y += 4) alpha(a * (y0 - y) / FADE, () => r(cam.x, y, cam.w + 1, 4, col));
  });
}

/** Rain, splashes, a darker sky, fog banks, snow and lightning over room `room` (only the part in view). */
export function drawWeather(room: Room, cam: Cam, a: number, night: number): void {
  const w = weather(); if (w.kind === 'clear' || w.k <= 0.01) return;
  const k = w.k, wd = wind(), X = cam.x, Y = cam.y, CW = cam.w, CH = cam.h, f = room.floor;
  if (w.kind === 'rain' || w.kind === 'storm') {
    const storm = w.kind === 'storm';
    // a heavier, darker sky (darkest at the top of the view)
    lit(() => { alpha((storm ? 0.3 : 0.17) * k, () => r(X, Y, CW + 1, CH + 1, [22, 28, 46])); }); skyShade(room, cam, (storm ? 0.16 : 0.09) * k, [22, 28, 46]);
    // streaks: fall at 300-420 px/s, slanted by the wind
    const n = Math.round((storm ? 230 : 130) * k), slant = wd.dx * 0.45 + (storm ? 0.15 : 0), span = CH + 40, wrap = CW + 80;
    const col: [number, number, number] = night > 0.5 ? [120, 140, 190] : [170, 190, 226];
    alpha(storm ? 0.6 : 0.5, () => {
      for (let i = 0; i < n; i++) {
        const sp = 300 + h1(i * 1.37) * 120, y = (h1(i * 2.71) * span + a * sp) % span;
        const x = ((h1(i * 5.13) * wrap + y * slant + a * wd.dx * 30) % wrap + wrap) % wrap;
        const px = X + x - 40, py = Y + y - 20, sx = Math.abs(slant) > 0.2 ? Math.sign(slant) : 0;
        r(px, py, 1, 4, col); r(px + sx, py + 4, 1, 3, col);
      }
    });
    // splashes on the ground (and on the water)
    const m = Math.round((storm ? 40 : 24) * k), gy0 = Math.max(f.y0, Y), gy1 = Math.min(f.y1, Y + CH);
    if (gy1 > gy0) alpha(0.7, () => {
      for (let i = 0; i < m; i++) {
        const per = 0.45, c = Math.floor((a + h1(i * 3.3) * per) / per), u = ((a + h1(i * 3.3) * per) % per) / per;
        const sx = X + h1(i * 7.1 + c * 1.618) * CW, sy = gy0 + h1(i * 4.9 + c * 2.414) * (gy1 - gy0);
        if (u < 0.3) r(sx - 1, sy, 3, 1, col);
        else if (u < 0.7) { r(sx - 2, sy - 1 - Math.round((u - 0.3) * 5), 1, 1, col); r(sx + 2, sy - 1 - Math.round((u - 0.3) * 5), 1, 1, col); r(sx - 2, sy + 1, 5, 1, col); }
      }
    });
    if (storm) {
      const L = lightning();
      if (L.f > 0) {
        lit(() => alpha(0.5 * L.f * k, () => r(X, Y, CW + 1, CH + 1, [210, 220, 255])));
        if (L.f > 0.5) { // the bolt: a jagged line down the top of the view
          let bx = X + 30 + L.x * (CW - 60), by = Y - 2; const end = Y + CH * 0.34;
          lit(() => { for (let j = 0; by < end; j++) { const nx = bx + (h1(L.id * 13 + j) - 0.5) * 18, ny = by + 8 + h1(L.id * 7 + j) * 10; line(Math.round(bx), Math.round(by), Math.round(nx), Math.round(ny), WHITE, 2); if (j === 2) line(Math.round(nx), Math.round(ny), Math.round(nx + 14 * (h1(L.id) > 0.5 ? 1 : -1)), Math.round(ny + 14), [180, 200, 255]); bx = nx; by = ny; } });
        }
      }
    }
  } else if (w.kind === 'fog') {
    const col: [number, number, number] = night > 0.5 ? [80, 90, 112] : [196, 204, 216];
    lit(() => { alpha(0.3 * k, () => r(X, Y, CW + 1, CH + 1, col)); }); skyShade(room, cam, 0.18 * k, col);
    // banks drifting on the wind, anchored to the world (walk through them)
    const RW = room.w + 500;
    for (let j = 0; j < 16; j++) {
      const bw = 180 + h1(j + 2) * 160, cx = (((h1(j) * RW + a * (5 + j * 0.8) * (wd.dx >= 0 ? 1 : -1)) % RW) + RW) % RW - 250, cy = f.y0 - 60 + h1(j + 5) * (f.y1 - f.y0 + 60);
      if (cx + bw / 2 < X || cx - bw / 2 > X + CW || cy + 20 < Y || cy - 20 > Y + CH) continue;
      lit(() => alpha(0.16 * k, () => { for (let q = -7; q <= 7; q++) { const hw = Math.round(bw / 2 * Math.sqrt(1 - (q * q) / 64)); r(Math.round(cx - hw), Math.round(cy + q * 3), hw * 2, 3, col); } }));
    }
  } else if (w.kind === 'snow') {
    lit(() => alpha(0.1 * k, () => r(X, Y, CW + 1, CH + 1, [200, 210, 236])));
    const n = Math.round(210 * k), span = CH + 20, wrap = CW + 40;
    lit(() => alpha(0.9, () => {
      for (let i = 0; i < n; i++) {
        const sp = 16 + h1(i * 1.9) * 26, y = (h1(i * 2.3) * span + a * sp) % span;
        const x = ((h1(i * 4.7) * wrap + Math.sin(a * 1.3 + i) * 5 + a * wd.dx * 14) % wrap + wrap) % wrap, big = h1(i * 8.3) > 0.72;
        r(X + x - 20, Y + y - 10, big ? 2 : 1, big ? 2 : 1, night > 0.5 ? [200, 210, 236] : WHITE);
      }
    }));
  }
}

/** An umbrella held up over someone out in the rain, above their name tag (x = their centre, top = the top of their head). */
export function drawUmbrella(x: number, top: number, seed: number, a: number): void {
  const cols: [number, number, number][] = [[226, 74, 74], [74, 150, 226], [250, 204, 70], [140, 90, 210], [70, 190, 120], [240, 140, 60]];
  const c = cols[Math.floor(seed * 6) % 6], dk: [number, number, number] = [c[0] * 0.7, c[1] * 0.7, c[2] * 0.7];
  const cx = Math.round(x + Math.sin(a * 1.1 + seed * 9) * 0.6), y = Math.round(top - 12);
  r(cx, y, 1, 11, [60, 50, 50]); // the shaft (the name tag goes over it)
  const rows = [3, 7, 10, 12, 13]; // a dome
  rows.forEach((hw, j) => r(cx - hw, y - 5 + j, hw * 2 + 1, 1, j < 2 ? c : dk));
  for (let s = -13; s <= 13; s += 5) r(cx + s, y, 2, 1, dk); // scalloped edge
  r(cx - 1, y - 6, 3, 1, [60, 50, 50]);
  r(cx - 6, y - 4, 3, 1, [255, 255, 255]); // shine
}
