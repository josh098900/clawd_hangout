// SLOP INVASION — a world event on the Square. Every 10 minutes (on the wall clock, so
// everyone gets the same one) 40 slop blobs drop out of the sky and crawl toward the Lab door.
// Throw coffee at them (E / click). Blob paths are a pure function of (wave, index, time);
// the only shared state is which ones are dead ('slop' room state, merged as a union).

import { K, type RGB } from '../engine/palette';
import { alpha, lit, oval, r, G } from '../engine/pixel';
import { h1 } from '../engine/math';

export const SLOP_PERIOD = 600, SLOP_OFFSET = 300, SLOP_DUR = 95, SLOP_N = 40;
const DOOR_X = 80;

/** The current wave (and seconds into it), if one is on right now. */
export function slopWave(): { w: number; u: number } | null {
  const t = Date.now() / 1000 - SLOP_OFFSET, w = Math.floor(t / SLOP_PERIOD), u = t - w * SLOP_PERIOD;
  return u < SLOP_DUR ? { w, u } : null;
}

export interface Blob { i: number; x: number; y: number; z: number; state: 'wait' | 'fall' | 'crawl' | 'escaped' }
/** Where blob i of wave w is, u seconds into the wave. */
export function blob(w: number, i: number, u: number): Blob {
  const s = i * 1.9, x0 = 260 + h1(w * 97 + i) * 880, gy = 596 + h1(w * 13 + i * 3) * 100, sp = 12 + h1(w + i * 7) * 9;
  if (u < s) return { i, x: x0, y: gy, z: 300, state: 'wait' };
  if (u < s + 1) return { i, x: x0, y: gy, z: 300 * (1 - (u - s)) ** 2, state: 'fall' };
  const x = x0 - (u - s - 1) * sp;
  return x < DOOR_X ? { i, x: DOOR_X, y: gy, z: 0, state: 'escaped' } : { i, x, y: gy, z: 0, state: 'crawl' };
}

const SLOP: RGB = [150, 200, 90], SLOP_DK: RGB = [96, 140, 60], SLOP_HI: RGB = [200, 240, 140];
export function drawBlob(b: Blob, a: number): void {
  const x = Math.round(b.x), y = Math.round(b.y - b.z), wob = Math.round(Math.sin(a * 6 + b.i) * 1);
  if (b.z < 200) alpha(0.3 * (1 - b.z / 200), () => oval(x, Math.round(b.y), 8, 2, [10, 10, 24]));
  r(x - 8 - wob, y - 9 + wob, 16 + wob * 2, 9 - wob, K.OUTLINE); r(x - 7 - wob, y - 10 + wob, 14 + wob * 2, 9 - wob, SLOP);
  r(x - 5, y - 11 + wob, 8, 2, SLOP); r(x - 6 - wob, y - 9 + wob, 3, 2, SLOP_HI); r(x - 7 - wob, y - 2, 14 + wob * 2, 1, SLOP_DK);
  for (let k = 0; k < 3; k++) r(x - 6 + k * 5, y - 1, 2, 1 + ((Math.floor(a * 4) + k) % 2), SLOP_DK); // drips
  lit(() => { r(x - 4, y - 7 + wob, 2, 2, K.WHITE); r(x + 1, y - 7 + wob, 2, 2, K.WHITE); r(x - 3, y - 6 + wob, 1, 1, K.RED); r(x + 2, y - 6 + wob, 1, 1, K.RED); });
  G(x - 8, y - 12, 16, 12, SLOP, 0.1);
}
export function drawSplat(x: number, y: number, age: number): void {
  if (age > 1.2) return;
  const k = age / 1.2;
  alpha(1 - k, () => { r(Math.round(x) - 7, Math.round(y) - 1, 14, 2, [120, 80, 50]); for (let s = 0; s < 8; s++) { const an = (s / 8) * 6.283, d = 4 + age * 18; r(Math.round(x + Math.cos(an) * d), Math.round(y - 6 + Math.sin(an) * d * 0.6 - age * 6), 2, 2, s % 2 ? [150, 100, 60] : SLOP); } });
}
/** A mug of coffee flying from (x0,y0) to (x1,y1); u = 0..1. */
export function drawThrow(x0: number, y0: number, x1: number, y1: number, u: number): void {
  const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * 30;
  r(Math.round(x) - 2, Math.round(y) - 2, 5, 5, K.OUTLINE); r(Math.round(x) - 1, Math.round(y) - 1, 3, 3, [232, 106, 146]); r(Math.round(x), Math.round(y) - 1, 1, 1, [90, 55, 35]);
}
