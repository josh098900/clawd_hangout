// THE SOUTH COAST (step 19, push 2): what its rooms share. Each stop is outdoors on Iceland's clock (world/iceland.ts), built in the
// same layers as Reykjavík: the sky is the backdrop (bg = night, bgAlt = day), then the live sky (the low sun, clouds, the northern
// lights), then the land as a baked layer (night and day, cross-faded), then everything alive, then the weather over it all.
//
// Also here: THE ICELAND EXPLORER from outside (parked at each stop, pulling in and away on its clock), the stop's sign, the brown
// sight signs with their ⌘ loop, sheep, waterfalls (a scrolling texture, so even a wide one costs one drawImage a tile), mist and
// rainbows.

import { K, IS, type RGB } from '../engine/palette';
import { PX, mk, r, line, disc, oval, txt, tw, lit, alpha, Gd, M, bake } from '../engine/pixel';
import { clamp, h1 } from '../engine/math';
import { mmss } from '../engine/format';
import { ICE, iceDay, iceGold, iceSun, iceWeather, auroraNow, drawAurora } from './iceland';
import { busPose, nextBus, tour } from '../game/tour';

/** What the features tell the coast's rooms (features/coast.ts): the part of the room in view (only one coast room is ever on screen). */
export const COAST = { view: { x0: 0, x1: 2000 } };
export const seen = (x0: number, x1: number): boolean => x1 >= COAST.view.x0 - 30 && x0 <= COAST.view.x1 + 30;
export const now = (): number => performance.now() / 1000;
/** Night's colour for the baked layers: day as it is, night pulled towards dark blue. */
export const darkener = (day: boolean) => (c: RGB): RGB => (day ? c : M(c, [8, 12, 24], 0.55));

// ---------------------------------------------------------------- the sky ----------------------------------------------------------------
/** The backdrop: the sky from the top down to the horizon (and below it, for the gaps), stars by night. */
export function paintSky(g: CanvasRenderingContext2D, day: boolean, W: number, H: number, horizon: number): void {
  bake(g, () => {
    const top: RGB = day ? IS.SKY : IS.SKY_NIGHT, low: RGB = day ? IS.SKY_LO : IS.SKY_NIGHT_LO;
    for (let y = 0; y < H; y += 2) r(0, y, W, 2, M(top, low, clamp(y / horizon, 0, 1) ** 1.3));
    if (!day) for (let k = 0; k < Math.round(W / 12); k++) { const x = Math.floor(h1(k * 3.1) * W), y = Math.floor(h1(k * 1.7) * (horizon - 40)); r(x, y, 1, 1, h1(k * 5) > 0.8 ? [255, 250, 230] : [200, 210, 240]); }
  });
}
/**
 * The live sky over x0..x1: the low sun's warmth at dawn and dusk (violet up high, gold down low), the sun itself (sunX is where it
 * sets), clouds (a grey lid when it's overcast, a few drifting by when it's fine), and the northern lights.
 */
export function skyLive(a: number, W: number, horizon: number, sunX: number): void {
  const day = iceDay(), gold = iceGold(), w = iceWeather(), au = auroraNow(), vx0 = Math.max(0, COAST.view.x0 - 10), vx1 = Math.min(W, COAST.view.x1 + 10);
  if (gold > 0.01) for (let y = 120; y < horizon; y += 2) { const u = (y - 120) / (horizon - 120), k = gold * 0.62 * u * u * (3 - 2 * u); if (k > 0.01) alpha(k, () => r(vx0, y, vx1 - vx0, 2, u < 0.55 ? M([186, 128, 196], [240, 150, 150], u / 0.55) : M([240, 150, 150], [255, 200, 120], (u - 0.55) / 0.45))); }
  { const s = iceSun(); if (s > -0.08 && w.kind !== 'cloudy' && w.kind !== 'snow' && w.kind !== 'drizzle') { const sx = sunX - Math.round((s + 0.05) * 400), sy = Math.round(horizon - 6 - s * 160); if (seen(sx - 20, sx + 20)) { alpha(0.3, () => disc(sx, sy, 12, [255, 220, 150])); disc(sx, sy, 6, M([255, 250, 220], [255, 160, 80], gold)); } } }
  { const lid = w.kind === 'cloudy' || w.kind === 'snow' || w.kind === 'drizzle', n = Math.round((lid ? 22 : 7) * W / 1900), cc = M(M([40, 46, 66], [236, 240, 246], day), [150, 156, 166], lid ? 0.4 : 0);
    if (lid) alpha(0.55 * w.k, () => r(vx0, 0, vx1 - vx0, horizon, M([60, 66, 80], [170, 178, 190], day)));
    for (let q = 0; q < n; q++) { const cx = ((h1(q * 5.3) * (W + 400) + a * (2 + (q % 3))) % (W + 400)) - 200, cy = 30 + Math.floor(h1(q * 2.1) * 230), cw = 30 + Math.floor(h1(q * 7) * 50); if (!seen(cx - cw, cx + cw)) continue; alpha(lid ? 0.9 : 0.7, () => { oval(Math.round(cx), cy, cw, 8, cc); oval(Math.round(cx - cw / 2), cy - 5, cw / 2, 7, cc); oval(Math.round(cx + cw / 3), cy - 4, cw / 3, 6, cc); }); } }
  noGlow(() => drawAurora(vx0, vx1, 0, horizon - 8, au.kp, au.vis, a, 1.6)); // (its glow would shine through the cliffs in front of it)
}
/** Draw without the soft glow layer (for things the land covers: the glow layer isn't covered by anything). */
export function noGlow(fn: () => void): void { const g = PX.glow; PX.glow = null as unknown as CanvasRenderingContext2D; try { fn(); } finally { PX.glow = g; } }
/** Iceland's weather over everything: snow, sideways snow in a gale, drizzle, a grey wash when it's overcast. */
export function weatherFront(a: number, H: number): void {
  const w = iceWeather(), vx0 = COAST.view.x0, vx1 = COAST.view.x1, n = w.kind === 'snow' ? 140 : w.kind === 'gale' ? 110 : w.kind === 'drizzle' ? 90 : 0;
  for (let q = 0; q < n; q++) {
    const span = vx1 - vx0 + 40, x = vx0 - 20 + ((h1(q) * span + (w.kind === 'gale' ? a * 120 : Math.sin(a * 0.8 + q) * 6)) % span + span) % span, y = (h1(q * 3) * H + a * (w.kind === 'drizzle' ? 140 : w.kind === 'gale' ? 40 : 18)) % H;
    if (w.kind === 'drizzle') alpha(0.35 * w.k, () => r(Math.round(x), Math.round(y), 1, 4, [200, 214, 230])); else alpha(w.k, () => r(Math.round(x), Math.round(y), w.kind === 'gale' ? 2 : 1, 1, K.WHITE));
  }
  if (ICE.forced === 'cloudy' || w.kind === 'cloudy') alpha(0.06 * w.k, () => r(vx0, 0, vx1 - vx0, H, [200, 206, 214]));
}
/**
 * Night from day: everything the painters draw goes through darkener(), which at night mixes each colour 55% towards dark blue, which is
 * exactly that blue laid over the day picture at 55% (only where there's paint). So bake the day once and lay it over: half the work.
 */
function nightOf(day: HTMLCanvasElement): HTMLCanvasElement {
  const c = mk(day.width, day.height), g = c.getContext('2d')!;
  g.drawImage(day, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.55; g.fillStyle = 'rgb(8,12,24)'; g.fillRect(0, 0, c.width, c.height);
  return c;
}
/** A room's land, baked (by day, and night from it) the first time it's drawn, and drawn cross-faded by Iceland's daylight. */
export function landLayer(W: number, H: number, paint: (day: boolean, dk: (c: RGB) => RGB) => void): () => void {
  let night: HTMLCanvasElement | null = null, dayC: HTMLCanvasElement | null = null;
  return () => {
    if (!night) { dayC = mk(W, H); bake(dayC, () => paint(true, darkener(true))); night = nightOf(dayC); }
    const g = PX.ctx, d = iceDay(), { x0, x1 } = COAST.view, sx = Math.max(0, Math.floor(x0) - 2), sw = Math.min(W, Math.ceil(x1) + 2) - sx;
    if (sw <= 0) return;
    if (d < 0.99) g.drawImage(night, sx, 0, sw, H, sx, 0, sw, H);
    if (d > 0.01) { g.globalAlpha = d; g.drawImage(dayC!, sx, 0, sw, H, sx, 0, sw, H); g.globalAlpha = 1; }
  };
}
/**
 * Paint a big area pixel by pixel, fast (straight into the canvas's pixels, for baking only): fn gives each pixel's colour, or null to
 * leave what's there.
 */
export function pixels(x0: number, y0: number, w: number, h: number, fn: (x: number, y: number) => RGB | null): void {
  x0 = Math.round(x0); y0 = Math.round(y0); w = Math.round(w); h = Math.round(h); if (w <= 0 || h <= 0) return;
  const g = PX.ctx, img = g.getImageData(x0, y0, w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x0 + x, y0 + y); if (!c) continue; const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
  g.putImageData(img, x0, y0);
}
/** A thing baked once as a sprite w x h (night and day: `paint` draws it at 0,0 with `dk`), drawn cross-faded by Iceland's daylight at x, y. */
export function spriteDN(w: number, h: number, paint: (dk: (c: RGB) => RGB) => void): (x: number, y: number) => void {
  let night: HTMLCanvasElement | null = null, dayC: HTMLCanvasElement | null = null;
  return (x, y) => {
    if (!night) { dayC = mk(w, h); bake(dayC, () => paint(darkener(true))); night = nightOf(dayC); }
    const g = PX.ctx, d = iceDay();
    if (d < 0.99) g.drawImage(night, Math.round(x), Math.round(y));
    if (d > 0.01) { g.globalAlpha = d; g.drawImage(dayC!, Math.round(x), Math.round(y)); g.globalAlpha = 1; }
  };
}
/** Smooth value noise (0..1) at (x, y), features about `s` px across: for rock, sand and moss that look like rock, sand and moss. */
export function vnoise(x: number, y: number, s: number, seed = 0): number {
  const gx = x / s, gy = y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const v = (i: number, j: number): number => h1(i * 127.1 + j * 311.7 + seed * 74.7);
  const a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
/** Two octaves of it. */
export const fbm = (x: number, y: number, s: number, seed = 0): number => vnoise(x, y, s, seed) * 0.65 + vnoise(x, y, s / 2.7, seed + 9) * 0.35;
/**
 * A pixel of cliff: old lava in wavy layers, darker seams between them, patches of lighter and darker rock, the odd crack, and moss
 * along the ledges (how much: `moss`, 0..1). `seed` keeps neighbouring cliffs from matching.
 */
export function cliffPx(x: number, y: number, moss = 0.5, seed = 0): RGB {
  const patch = fbm(x, y, 22, seed), fine = vnoise(x, y, 2.5, seed + 3), wob = vnoise(x, 0, 70, seed + 1) * 26 + vnoise(x, 0, 19, seed + 2) * 6;
  const sp = 13, layer = (((y + wob) % sp) + sp) % sp, seam = layer < 1.3 && vnoise(x, y, 30, seed + 8) > 0.25, ledge = layer > sp - 2.2;
  let c = M([60, 58, 56], [96, 92, 86], patch * 0.75 + fine * 0.25);
  if (seam) c = M(c, [30, 30, 32], 0.55);
  if (vnoise(x * 3, y * 0.15, 6, seed + 4) > 0.9) c = M(c, [28, 28, 30], 0.5); // (cracks running down)
  if (ledge && fbm(x, y, 9, seed + 5) < 0.12 + moss * 0.38) c = M([74, 108, 54], [118, 152, 80], vnoise(x, y, 3, seed + 6)); // (moss on the ledges)
  else if (fbm(x, y, 14, seed + 7) < moss * 0.32) c = M(c, [86, 120, 62], 0.7); // (moss creeping over the face)
  return c;
}
/** A pixel of black sand: soft ripples, finer grains, the odd pale pebble (low contrast: sand, not static). */
export function sandPx(x: number, y: number, wet = 0): RGB {
  const rip = vnoise(x * 0.5, y * 2.2, 6) * 0.6 + vnoise(x, y, 2) * 0.4, c = M([30, 30, 34], [48, 48, 54], rip);
  const out = h1(x * 1.7 + y * 2.3) > 0.992 ? M(c, [96, 96, 100], 0.6) : c;
  return wet > 0 ? M(out, [70, 84, 98], wet * 0.45 * vnoise(x, y, 5, 3)) : out;
}
/** A pixel of rough grass (with moss), and whether there's snow lying (`snow` 0..1). */
export function grassPx(x: number, y: number, snow = 0): RGB {
  const n = fbm(x, y, 10, 4), c = M([74, 104, 54], [116, 148, 78], n * 0.8 + vnoise(x, y, 2) * 0.2);
  return snow > 0 && vnoise(x, y, 12, 8) < snow ? M(c, [226, 232, 238], 0.85) : c;
}
/** How dark it is (0 day .. 1 night), for the live things' colours. */
export const nightNow = (): number => 1 - iceDay();
/** A colour as the live things show it: towards dark blue at night. */
export const nite = (c: RGB, night = nightNow()): RGB => M(c, [8, 12, 24], 0.55 * night);

// ---------------------------------------------------------------- the bus, from outside ----------------------------------------------------------------
export const COACH_L = 212, COACH_H = 72;
/**
 * THE ICELAND EXPLORER, side on, standing on `ground` with its back end at x (facing right: dir 1) or its front end at x (facing left):
 * a big white coach on chunky tyres, the stripe, tinted windows (lit warm at night), the door at the front (open: `open`), mud up its
 * skirts, headlights.
 */
export function drawCoach(x: number, ground: number, dir: 1 | -1, open: boolean, night: number, a: number): void {
  const L = COACH_L, top = ground - COACH_H, X = (dx: number, w = 1): number => (dir > 0 ? x + dx : x + L - dx - w), R = (dx: number, y: number, w: number, h: number, c: RGB) => r(Math.round(X(dx, w)), Math.round(y), w, h, nite(c, night));
  const body: RGB = [236, 238, 240], shadeC: RGB = [196, 200, 206], glass: RGB = [40, 54, 70];
  alpha(0.3, () => oval(Math.round(x + L / 2), ground + 1, L / 2 + 6, 4, [0, 0, 0]));
  R(4, top + 2, L - 10, COACH_H - 16, body); R(8, top, L - 18, 2, body); R(4, top + 2, L - 10, 1, K.WHITE); // (the roof's curve)
  R(L - 8, top + 6, 6, COACH_H - 20, body); R(L - 6, top + 14, 4, 22, glass); // (the nose, its windscreen raked back)
  R(4, ground - 22, L - 6, 8, shadeC); R(4, ground - 15, L - 6, 3, [150, 154, 160]); // (the skirt)
  for (let dx = 6; dx < L - 6; dx += 3) if (h1(dx * 1.7) > 0.45) R(dx, ground - 14 - Math.floor(h1(dx * 3.1) * 6), 2, 2 + Math.floor(h1(dx) * 4), [120, 100, 84]); // (mud, everywhere)
  // the windows: one long tinted band, pillars between, lit warm inside at night
  R(10, top + 8, L - 44, 24, glass);
  if (night > 0.3) alpha(night * 0.7, () => R(12, top + 12, L - 48, 18, [255, 210, 140]));
  for (let dx = 10; dx < L - 34; dx += 28) R(dx, top + 8, 2, 24, [70, 80, 92]);
  R(14, top + 9, L - 52, 1, [110, 130, 150]);
  // the stripe: teal with a red flash, the name on it
  R(4, top + 38, L - 10, 8, [36, 132, 140]); R(L - 70, top + 38, 30, 8, [200, 60, 50]); for (let k = 0; k < 18; k++) R(4 + k * 2, top + 46 - Math.floor(k / 3), 2, 1, [36, 132, 140]);
  lit(() => { const t = 'ICELAND EXPLORER', tx = dir > 0 ? x + 14 : x + L - 14 - tw(t); txt(t, tx, top + 39, nite(K.WHITE, night * 0.6)); });
  // the door at the front: shut (glass in two leaves) or folded open
  const dx0 = L - 34;
  if (open) { R(dx0, top + 8, 20, COACH_H - 22, [30, 34, 42]); R(dx0 + 2, top + 10, 16, 6, [255, 214, 150]); R(dx0 + 3, ground - 18, 14, 3, [90, 94, 100]); }
  else { R(dx0, top + 8, 20, COACH_H - 22, [60, 76, 92]); R(dx0 + 9, top + 8, 2, COACH_H - 22, [140, 146, 154]); }
  // the wheels: big, chunky, a hub cap
  for (const wx of [38, L - 52]) { const cx = Math.round(X(wx)), cy = ground - 10; disc(cx, cy, 11, nite([30, 30, 34], night)); disc(cx, cy, 6, nite([150, 154, 160], night)); disc(cx, cy, 2, nite([60, 62, 68], night)); const sp = (a * 4) % 1; r(cx - 1 + Math.round(Math.cos(sp * 6.28) * 4), cy - 1 + Math.round(Math.sin(sp * 6.28) * 4), 2, 2, nite([90, 94, 100], night)); R(wx - 14, ground - 22, 28, 2, [90, 94, 100]); }
  // lights: the headlight and the tail light
  const hx = Math.round(X(L - 6, 4)), tx2 = Math.round(X(2, 3));
  lit(() => { r(hx, ground - 22, 4, 4, night > 0.3 ? [255, 244, 210] : [230, 230, 220]); r(tx2, ground - 26, 3, 6, [210, 40, 40]); });
  if (night > 0.3) { Gd(hx + 2, ground - 20, 14, [255, 240, 200], 0.5 * night); Gd(tx2 + 1, ground - 23, 6, [255, 60, 50], 0.4 * night); }
}
/**
 * The bus at stop s, parked with its back end at x on the road at `ground` (or pulling in from the left, or away to the left), its
 * door open while it waits. The stop's sign beside it says when it's next here.
 */
export function busAtStop(s: number, x: number, ground: number, a: number, signX?: number): void {
  const t = tour(), p = busPose(s, t), night = nightNow();
  if (p !== null) {
    const off = p < 0 ? -(p * p) * 520 : p * p * 520, dir: 1 | -1 = p > 0 ? -1 : 1;
    drawCoach(Math.round(x - off), ground, dir, p === 0, night, p === 0 ? 0 : a);
    if (p !== 0) for (let k = 0; k < 6; k++) { const u = (a * 2 + k / 6) % 1; alpha(0.35 * (1 - u), () => disc(Math.round(x - off + (p > 0 ? COACH_L + 4 : -4) + (p > 0 ? 1 : -1) * u * 20), ground - 4 - Math.round(u * 10), 2 + Math.round(u * 4), [200, 196, 190])); } // (the dust it kicks up)
  }
  // the stop's sign: a pole, the yellow TOUR BUS board, the countdown
  const sx = signX ?? x + COACH_L + 18;
  r(sx, ground - 70, 2, 70, nite([70, 74, 82], night)); r(sx - 16, ground - 86, 34, 18, nite([250, 210, 60], night)); r(sx - 16, ground - 86, 34, 1, nite(K.WHITE, night)); txt('TOUR', sx + 1 - tw('TOUR') / 2, ground - 84, nite([40, 40, 44], night)); txt('BUS', sx + 1 - tw('BUS') / 2, ground - 77, nite([40, 40, 44], night));
  const wait = nextBus(s), msg = wait <= 0 ? 'HERE' : mmss(wait);
  r(sx - 16, ground - 66, 34, 10, [16, 18, 22]); lit(() => txt(msg, sx + 1 - tw(msg) / 2, ground - 64, wait <= 0 ? [124, 242, 156] : [255, 180, 60]));
}

// ---------------------------------------------------------------- signs and life ----------------------------------------------------------------
/** A brown sight sign (as by every Icelandic road): the ⌘ loop and the place's name. */
export function sightSign(x: number, ground: number, name: string, dk: (c: RGB) => RGB): void {
  const w = tw(name) + 22, y = ground - 52;
  r(x + Math.floor(w / 2) - 1, y + 14, 2, ground - y - 14, dk([90, 94, 100]));
  r(x, y, w, 15, dk([110, 72, 44])); r(x + 1, y + 1, w - 2, 13, dk([126, 84, 52])); r(x + 1, y + 1, w - 2, 1, dk([160, 116, 80]));
  loopMark(x + 4, y + 3, dk(K.WHITE)); txt(name, x + 17, y + 5, dk(K.WHITE));
}
/** The ⌘ loop sign's mark, 9 x 9. */
export function loopMark(x: number, y: number, c: RGB): void {
  for (const [dx, dy] of [[0, 0], [6, 0], [0, 6], [6, 6]]) { r(x + dx, y + dy, 3, 1, c); r(x + dx, y + dy + 2, 3, 1, c); r(x + dx, y + dy, 1, 3, c); r(x + dx + 2, y + dy, 1, 3, c); }
  r(x + 2, y + 2, 5, 1, c); r(x + 2, y + 6, 5, 1, c); r(x + 2, y + 2, 1, 5, c); r(x + 6, y + 2, 1, 5, c);
}
/** A yellow road snow pole, its reflector. */
export function snowPole(x: number, ground: number, dk: (c: RGB) => RGB, hgt = 26): void { r(x, ground - hgt, 2, hgt, dk([236, 196, 40])); r(x, ground - hgt, 2, 4, dk([30, 30, 34])); r(x, ground - hgt + 5, 2, 2, dk(K.WHITE)); }
/** An Icelandic sheep, side on: shaggy and white (or brown, or black), its dark face; grazing (head down) or looking up. */
export function sheep(x: number, y: number, dir: 1 | -1, col: RGB, graze: boolean, night: number): void {
  const c = nite(col, night), face = nite([40, 36, 34], night), hx = dir > 0 ? x + 5 : x - 8;
  r(x - 5, y - 7, 11, 5, c); r(x - 4, y - 8, 9, 1, c); r(x - 5, y - 3, 11, 1, nite(M(col, [0, 0, 0], 0.2), night)); // (the fleece)
  for (const lx of [x - 4, x - 1, x + 2, x + 4]) r(lx, y - 2, 1, 2, face);
  if (graze) r(hx, y - 4, 3, 3, face); else { r(hx, y - 9, 3, 4, face); r(dir > 0 ? hx + 2 : hx, y - 10, 1, 1, face); }
}
/** Tufts of grass and moss on the ground between x0 and x1 (around the line y). */
export function tufts(x0: number, x1: number, y: number, seed: number, dk: (c: RGB) => RGB, dense = 0.5): void {
  for (let x = x0; x < x1; x += 3) if (h1(x * 1.31 + seed) < dense) { const hh = 1 + Math.floor(h1(x * 2.7 + seed) * 3); r(x, y - hh, 1, hh, dk(h1(x + seed) > 0.5 ? IS.MOSS : IS.MOSS_DK)); }
}

// ---------------------------------------------------------------- water ----------------------------------------------------------------
/**
 * A waterfall's falling water as a texture w wide (two 64-row tiles stacked, so it scrolls seamlessly): streaks of white and pale blue,
 * brighter in the middle, a darker edge. One for day, one for night.
 */
export function fallTex(w: number, day: boolean, seed: number): HTMLCanvasElement {
  const c = mk(w, 128);
  bake(c, () => {
    for (let x = 0; x < w; x++) {
      const e = Math.min(x, w - 1 - x) / Math.max(1, w / 2), base = M(day ? [176, 204, 218] : [70, 90, 110], day ? [246, 250, 252] : [150, 170, 190], Math.min(1, e * 1.6));
      for (let y = 0; y < 64; y++) {
        const s = h1(x * 7.13 + seed) * 64, streak = ((y + s) % 64) / 64, n = h1(Math.floor((y + s) / 6) * 3.7 + x * 1.9 + seed), k = n > 0.72 ? 0.35 : n < 0.18 ? -0.25 : 0;
        const col = k > 0 ? M(base, K.WHITE, k) : k < 0 ? M(base, day ? [120, 150, 170] : [40, 54, 70], -k) : base;
        r(x, y, 1, 1, streak < 0.08 ? M(col, K.WHITE, 0.4) : col); r(x, y + 64, 1, 1, streak < 0.08 ? M(col, K.WHITE, 0.4) : col);
      }
    }
  });
  return c;
}
/** Draw falling water from texture `tex` in the column x..x+w, from y0 down to y1, scrolling down at `speed` px/s. */
export function drawFall(tex: HTMLCanvasElement, x: number, y0: number, y1: number, w: number, a: number, speed: number): void {
  const g = PX.ctx, off = Math.floor((a * speed) % 64);
  for (let y = y0; y < y1; y += 64) { const h = Math.min(64, y1 - y); g.drawImage(tex, 0, 64 - off, Math.min(w, tex.width), h, x, y, w, h); }
}
/** Day and night textures, cross-faded. */
export function drawFallLit(day: HTMLCanvasElement, night: HTMLCanvasElement, x: number, y0: number, y1: number, w: number, a: number, speed: number): void {
  const d = iceDay(), g = PX.ctx;
  if (d < 0.99) drawFall(night, x, y0, y1, w, a, speed);
  if (d > 0.01) { g.globalAlpha = d; drawFall(day, x, y0, y1, w, a, speed); g.globalAlpha = 1; }
}
/** Spray and mist round a waterfall's foot at (cx, y): soft puffs billowing up and drifting with the wind. */
export function mist(cx: number, y: number, spread: number, n: number, a: number, seed: number): void {
  const night = nightNow(), w = iceWeather(), drift = w.kind === 'gale' ? 40 : 10, c = nite([236, 242, 248], night);
  alpha(0.1, () => oval(Math.round(cx), Math.round(y - spread * 0.25), Math.round(spread * 0.55), Math.round(spread * 0.3), c));
  for (let q = 0; q < n; q++) {
    const u = ((a * (0.16 + h1(q * 1.7 + seed) * 0.1)) + q / n) % 1, x = cx + (h1(q * 3.3 + seed) - 0.5) * spread * (0.5 + u * 0.6) + u * drift, yy = y - u * spread * 0.7, rad = 2 + u * spread * 0.07;
    alpha(0.12 * (1 - u), () => disc(Math.round(x), Math.round(yy), Math.round(rad), c));
    alpha(0.08 * (1 - u), () => disc(Math.round(x), Math.round(yy), Math.round(rad * 1.8), c));
  }
}
/** A rainbow arc centred on (cx, cy), radius rad, k (0..1) how strong. Only the part above `floor` shows. */
export function rainbow(cx: number, cy: number, rad: number, k: number, floor: number): void {
  if (k <= 0.02) return;
  const bands: RGB[] = [[230, 60, 60], [240, 150, 50], [246, 220, 70], [90, 190, 90], [70, 130, 220], [130, 80, 190]];
  alpha(k * 0.3, () => lit(() => bands.forEach((c, b) => { const rr = rad - b * 2, n = Math.ceil(rr * 3.2); let px = -1, py = -1; for (let t = 0; t <= n; t++) { const an = Math.PI + (t / n) * Math.PI, x = Math.round(cx + Math.cos(an) * rr), y = Math.round(cy + Math.sin(an) * rr * 0.9); if (y >= floor || (x === px && y === py)) continue; px = x; py = y; r(x, y, 1, 2, c); } })));
}
/** A sunny day in Iceland (for rainbows and glints): the sun's up, and it isn't grey. */
export const sunny = (): boolean => { const w = iceWeather(); return iceDay() > 0.6 && iceSun() > 0 && (w.kind === 'clear' || (w.kind === 'gale' && w.k < 0.5)); };
void line;
