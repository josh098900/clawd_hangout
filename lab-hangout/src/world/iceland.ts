// ICELAND's sky (step 19): its own clock, its own weather, and the northern lights. The clock, the weather and each night's
// aurora come from the wall clock like everything else, so everyone in Iceland sees the same sky without a message.
//
//   * THE CLOCK: a 20-minute day like the city's, 7 minutes ahead of it, with long nights (9 minutes), long golden dawns and
//     dusks (2½ each) and a short day (6) with the sun never high. iceDay() is 0 at night, 1 by day.
//   * THE WEATHER: 15-minute slots of its own (clear, cloudy, snow, drizzle, a gale), worked out in the game only.
//   * THE NORTHERN LIGHTS: each night has a strength, KP 0-9 (a storm now and then). They come out a minute after dark if the
//     sky's clear (cloud, snow and drizzle hide them), and the forecast TVs say honestly what tonight will be.
//
// And the drawing everyone shares: drawAurora (the curtains), and the far mountains.

import { clamp, h1, ihash, seg } from '../engine/math';
import { PX, r, lit, alpha, Gd, M } from '../engine/pixel';
import type { RGB } from '../engine/palette';

/** Dev/tests: shift Iceland's clock (s), and pin its weather (`?iceweather=snow`, or the debug hook). */
export const ICE = { skew: 0, forced: null as IceSky | null, view: { x0: 0, x1: 1900 } };
const CYCLE = 1200, OFFSET = 420;
const NIGHT_END = 0.45, DAWN_END = 0.575, DAY_END = 0.875;
const iceS = (nowMs = Date.now()): number => nowMs / 1000 + ICE.skew + OFFSET;
/** Where Iceland's day is, 0..1 (0 = nightfall: 0-0.45 night, then dawn, day from 0.575, dusk from 0.875). */
export const iceP = (nowMs = Date.now()): number => ((iceS(nowMs) / CYCLE) % 1 + 1) % 1;
const ss = (u: number): number => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };
/** Iceland's daylight: 0 at night, 1 by day. */
export function iceDay(nowMs = Date.now()): number {
  const p = iceP(nowMs);
  if (p < NIGHT_END) return 0;
  if (p < DAWN_END) return ss((p - NIGHT_END) / (DAWN_END - NIGHT_END));
  if (p < DAY_END) return 1;
  return 1 - ss((p - DAY_END) / (1 - DAY_END));
}
/** How golden the light is (0..1): the low sun at dawn and dusk. */
export function iceGold(nowMs = Date.now()): number {
  const p = iceP(nowMs);
  if (p >= NIGHT_END && p < DAWN_END + 0.05) return Math.sin(clamp((p - NIGHT_END) / (DAWN_END + 0.05 - NIGHT_END), 0, 1) * Math.PI);
  if (p >= DAY_END - 0.05) return Math.sin(clamp((p - DAY_END + 0.05) / (1 - DAY_END + 0.05), 0, 1) * Math.PI);
  return 0;
}
/** The sun's height (-1..1; above 0 it's up), for the sky's gradient and where the sun hangs. */
export const iceSun = (nowMs = Date.now()): number => { const p = iceP(nowMs); return p < NIGHT_END ? -1 : Math.sin(((p - NIGHT_END) / (1 - NIGHT_END)) * Math.PI) * 0.55 - 0.05; };
/** Which night it is now (while it's dark), or which night comes next (by day): "tonight". */
export function tonight(nowMs = Date.now()): number { const s = iceS(nowMs), n = Math.floor(s / CYCLE), p = iceP(nowMs); return p < NIGHT_END ? n : n + 1; }
/** Seconds until it's properly dark (0 while it is). */
export function untilDark(nowMs = Date.now()): number { const p = iceP(nowMs); return p < NIGHT_END ? 0 : (1 - p) * CYCLE; }

// ---------------------------------------------------------------- the weather ----------------------------------------------------------------
export type IceSky = 'clear' | 'cloudy' | 'snow' | 'drizzle' | 'gale';
export const ICE_SKIES: IceSky[] = ['clear', 'cloudy', 'snow', 'drizzle', 'gale'];
const SLOT = 900, FADE = 50;
export const iceRoll = (slot: number): number => ihash(Math.imul(slot, 2246822519) + 7777) % 1000;
function kindOf(slot: number): IceSky { const n = iceRoll(slot); return n < 520 ? 'clear' : n < 700 ? 'cloudy' : n < 840 ? 'snow' : n < 930 ? 'drizzle' : 'gale'; }
/** Iceland's weather now: its kind, how strong (0..1, fading in and out), the slot, and seconds left in it. */
export function iceWeather(nowMs = Date.now()): { kind: IceSky; k: number; slot: number; left: number } {
  const s = nowMs / 1000 + ICE.skew, slot = Math.floor(s / SLOT), u = s - slot * SLOT;
  if (ICE.forced) return { kind: ICE.forced, k: 1, slot, left: SLOT - u };
  const kind = kindOf(slot);
  let k = 1;
  if (kindOf(slot - 1) !== kind && u < FADE) k = u / FADE;
  if (kindOf(slot + 1) !== kind && SLOT - u < FADE) k = Math.min(k, (SLOT - u) / FADE);
  return { kind, k, slot, left: SLOT - u };
}
export function forceIceWeather(s: string | null): void { ICE.forced = ICE_SKIES.includes(s as IceSky) ? (s as IceSky) : null; }
/** How much of the sky's covered (0..1) for this kind: the lights only show through a clear (or wind-swept) sky. */
const COVER: Record<IceSky, number> = { clear: 0, gale: 0.2, cloudy: 0.9, drizzle: 1, snow: 1 };
export const cloudOf = (w = iceWeather()): number => COVER[w.kind] * w.k + (w.k < 1 ? 0 : 0);
/** The weather at a moment (its kind only), for the forecast. */
export const iceKindAt = (nowMs: number): IceSky => (ICE.forced ?? kindOf(Math.floor((nowMs / 1000 + ICE.skew) / SLOT)));

// ---------------------------------------------------------------- the northern lights ----------------------------------------------------------------
/** A night's strength, KP 0-9: about 20% nothing to faint (0-2), 40% a band (3-4), 28% curtains (5-6), 12% a storm (7-9). */
export function kpOf(night: number): number {
  const n = ihash(Math.imul(night, 40503) + 1234) % 1000;
  if (n < 200) return n % 3;
  if (n < 600) return 3 + (n % 2);
  if (n < 880) return 5 + (n % 2);
  return 7 + (n % 3);
}
/** How bright a KP is (0..1). */
export const kpStrength = (kp: number): number => (kp <= 0 ? 0 : [0, 0.15, 0.28, 0.45, 0.58, 0.72, 0.84, 0.94, 0.98, 1][clamp(kp, 0, 9)]);
/** The northern lights right now: tonight's KP, how visible they are (0..1: dark for a minute, and the sky clear), and the cloud. */
export function auroraNow(nowMs = Date.now()): { kp: number; vis: number; cloud: number; night: number } {
  const p = iceP(nowMs), night = tonight(nowMs), kp = kpOf(night), w = iceWeather(nowMs), cloud = cloudOf(w);
  const dark = p < NIGHT_END + 0.02 ? seg(p, 0, 0.05) * (1 - seg(p, NIGHT_END - 0.03, NIGHT_END + 0.02)) : 0;
  return { kp, vis: dark * (1 - cloud) * (kp > 0 ? 1 : 0), cloud, night };
}
/** What the forecast TVs say about tonight: its KP, the cloud over the middle of the night, and the verdict. */
export function forecast(nowMs = Date.now()): { kp: number; cloud: number; verdict: 'NONE' | 'FAINT' | 'GOOD CHANCE' | 'STORM!'; dark: number } {
  const night = tonight(nowMs), kp = kpOf(night), mid = (night * CYCLE - OFFSET - ICE.skew + CYCLE * NIGHT_END / 2) * 1000, cloud = Math.round(COVER[iceKindAt(mid)] * 100);
  const verdict = cloud >= 80 || kp === 0 ? 'NONE' : kp <= 2 ? 'FAINT' : kp >= 7 ? 'STORM!' : 'GOOD CHANCE';
  return { kp, cloud, verdict, dark: untilDark(nowMs) };
}

// ---------------------------------------------------------------- drawing ----------------------------------------------------------------
const GREEN: RGB = [70, 255, 140], MINT: RGB = [150, 255, 200], PINK: RGB = [255, 80, 180], VIOLET: RGB = [160, 90, 255];
/**
 * The northern lights across x0..x1 of a sky from `top` to `bottom` (the horizon), at strength `kp`, `vis` visible, time a (s).
 * Curtains of green rays, brightest along their lower hem, rippling slowly sideways; the stronger the night, the more of them,
 * the taller, the faster; in a storm the hems go pink and the tops violet. `sc` squeezes it for small views (the map, a window).
 * Drawn lit (it glows in the dark), with a soft glow along the hems.
 */
export function drawAurora(x0: number, x1: number, top: number, bottom: number, kp: number, vis: number, a: number, sc = 1): void {
  if (vis <= 0.01 || kp <= 0) return;
  const s = kpStrength(kp), storm = kp >= 7, H = bottom - top, n = kp >= 5 ? 3 : kp >= 3 ? 2 : 1, step = Math.max(1, Math.round(2 * sc));
  const speed = 0.05 + s * 0.12;
  lit(() => {
    for (let c = 0; c < n; c++) {
      const hem = top + H * (0.42 + c * 0.14), amp = H * (0.07 + 0.05 * c), tall = H * (0.18 + 0.32 * s) * (1 - c * 0.18), phase = c * 2.1;
      const bright = vis * (0.35 + 0.65 * s) * (1 - c * 0.22);
      for (let x = Math.floor(x0 / step) * step; x < x1; x += step) {
        const w = x / (180 * sc), y0 = hem + Math.sin(w * 1.3 + a * speed * 3 + phase) * amp + Math.sin(w * 3.1 - a * speed * 5 + phase * 2) * amp * 0.35;
        const ray = 0.55 + 0.45 * Math.sin(w * 23 + a * (0.7 + s) + h1(Math.floor(x / (step * 3)) + c * 91) * 6); // (the rays: brighter and dimmer columns, shimmering)
        const pulse = 0.7 + 0.3 * Math.sin(w * 0.7 - a * speed * 2 + c); // (brightness travelling along the curtain)
        const k = bright * ray * pulse; if (k < 0.04) continue;
        const h = tall * (0.6 + 0.4 * ray);
        // the curtain: bright at its hem, fading up into the sky (a few bands), pink at the hem in a storm, violet at the top
        const bands = 5;
        for (let b = 0; b < bands; b++) {
          const u = b / bands, yy = Math.round(y0 - h * u), hh = Math.max(1, Math.round(h / bands) + 1);
          const col = storm ? (u < 0.18 ? M(PINK, GREEN, u / 0.18) : u > 0.7 ? M(GREEN, VIOLET, (u - 0.7) / 0.3) : M(GREEN, MINT, (u - 0.18) * 0.4)) : M(GREEN, MINT, u * 0.6);
          alpha(clamp(k * (1 - u) * (u < 0.12 ? 1 : 0.8), 0, 1) * 0.9, () => r(x, yy - hh, step, hh, col));
        }
      }
      // the glow along the hem
      const gy = hem;
      if (PX.glow) for (let x = x0 + 40; x < x1; x += 90) Gd(x, gy - 6, 40 * Math.max(0.5, sc), storm ? M(PINK, GREEN, 0.6) : GREEN, bright * 0.35);
    }
  });
}
/** The far mountains as a silhouette strip (flat-topped, snow on the tops): Esja from Reykjavík, the peaks from Keflavík. */
export function mountains(x0: number, x1: number, base: number, height: number, seed: number, rock: RGB, snow: RGB, flat = true): void {
  for (let x = x0; x < x1; x += 2) {
    const u = x / 240 + seed, top = base - height * (0.55 + 0.25 * Math.sin(u * 1.7) + 0.12 * Math.sin(u * 4.3 + 1) + (flat ? 0.08 * Math.sin(u * 0.6) : 0.2 * Math.abs(Math.sin(u * 2.6))));
    r(x, Math.round(top), 2, Math.round(base - top), rock);
    const cap = Math.max(1, Math.round((base - top) * (0.18 + 0.1 * Math.sin(u * 5.1))));
    r(x, Math.round(top), 2, cap, snow); if (h1(Math.floor(x / 2) + seed * 100) > 0.6) r(x, Math.round(top) + cap, 2, 2, snow); // (streaks of snow down the gullies)
  }
}
