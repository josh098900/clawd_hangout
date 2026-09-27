// Sea creatures, drawn in pixels: the twelve things you can catch off the Pier (for the City Aquarium's FISH GALLERY),
// the ocean tank's residents (DORIS the whale shark, the manta rays, the turtle, the reef sharks, the silver shoal,
// the clownfish, the moray, the diver who cleans the glass) and the jelly room's moon jellies. Push 2's submarine
// window draws from here too. Every creature is drawn at (x, y) = its middle, facing `d` (1 = right, -1 = left).

import { K, AQ, type RGB } from '../engine/palette';
import { r, disc, oval, lit, alpha, Gd, M, shade } from '../engine/pixel';
import { h1 } from '../engine/math';

type Rect = (dx: number, dy: number, w: number, h: number, c: RGB) => void;
/** Draw facing d: dx is measured towards the head (mirrored when facing left), so the light stays top-left. */
const facing = (x: number, y: number, d: number): Rect => (dx, dy, w, h, c) => r(d > 0 ? x + dx : x - dx - w + 1, y + dy, w, h, c);
const EYE: RGB = [18, 18, 26];

// ---------------------------------------------------------------- the Pier's catches (the FISH GALLERY) ----------------------------------------------------------------
/** A simple fish: a body `len` long and `h` deep, a darker back, a paler belly, a forked tail, a fin, an eye. */
function fishBody(R: Rect, len: number, h: number, body: RGB, back: RGB, belly: RGB, a: number): void {
  const hl = Math.floor(len / 2), top = -Math.floor(h / 2), wag = Math.floor(a * 6) % 2;
  R(-hl, top, len, h, body); R(-hl + 1, top, len - 2, 1, back); R(-hl + 1, top + h - 1, len - 3, 1, belly);
  R(hl, top + 1, 1, h - 2, body); // the snout
  R(-hl - 2, top - 1 + wag, 2, 2, back); R(-hl - 2, top + h - 1 - wag, 2, 2, back); R(-hl - 1, top + 1, 1, h - 2, back); // the tail
  R(-1, top - 1, 3, 1, back); // the dorsal fin
  R(hl - 2, top + 1, 1, 1, EYE); R(hl - 2, top + 1 - 1, 1, 1, M(body, K.WHITE, 0.5));
}
/**
 * One of the Pier's twelve catches (game/fish.ts), `k` = how big it came (0.8..1.3, from its cm), `a` = time.
 * Bottom-dwellers (the OLD BOOT, SEAWEED) sit where they're put.
 */
export function drawCatch(name: string, x: number, y: number, d: number, k: number, a: number): void {
  x = Math.round(x); y = Math.round(y);
  const R = facing(x, y, d), L = (n: number) => Math.max(4, Math.round(n * k));
  switch (name) {
    case 'SARDINE': fishBody(R, L(9), 3, [196, 208, 222], [80, 118, 160], [236, 240, 246], a); break;
    case 'MACKEREL': { const len = L(12); fishBody(R, len, 4, [120, 176, 186], [40, 96, 120], [226, 232, 236], a); for (let i = 0; i < len - 4; i += 3) R(-Math.floor(len / 2) + 2 + i, -2, 1, 2, [30, 70, 90]); break; }
    case 'SEA BREAM': { const len = L(11); fishBody(R, len, 6, [222, 184, 174], [176, 120, 116], [246, 226, 220], a); R(-3, -4, 6, 1, [176, 120, 116]); R(-2, -5, 1, 1, [176, 120, 116]); R(1, -5, 1, 1, [176, 120, 116]); break; }
    case 'SEA BASS': { const len = L(13); fishBody(R, len, 5, [150, 162, 176], [86, 98, 116], [214, 220, 228], a); R(Math.floor(len / 2) - 1, 1, 2, 1, [70, 80, 96]); break; }
    case 'SQUID': { // a pale mantle, fins at the back, tentacles trailing and waving
      const len = L(10), hl = Math.floor(len / 2), c: RGB = [240, 204, 214], cd: RGB = [214, 150, 170];
      R(-hl, -2, len, 4, c); R(-hl - 2, -3, 3, 6, cd); R(-hl, -2, len, 1, M(c, K.WHITE, 0.4)); R(hl - 3, -1, 1, 1, EYE);
      for (let t = 0; t < 4; t++) { const wv = Math.round(Math.sin(a * 5 + t) * 1); R(hl, -2 + t + wv, 3 + (t % 2) * 2, 1, cd); }
      break;
    }
    case 'PUFFERFISH': { // yellow and spotted; every so often it puffs up into a spiky ball
      const puffed = (a * 0.13 + x * 0.001) % 1 < 0.15, c: RGB = [232, 204, 96], cd: RGB = [180, 150, 60];
      if (puffed) { disc(x, y, 5, c); for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283; r(Math.round(x + Math.cos(an) * 6), Math.round(y + Math.sin(an) * 6), 1, 1, cd); } R(3, -1, 1, 1, EYE); R(-2, 1, 1, 1, [120, 90, 40]); R(1, -3, 1, 1, [120, 90, 40]); }
      else { oval(x, y, 4, 3, c); R(-4, -3, 7, 1, cd); R(-6, -1, 2, 3, cd); R(2, -1, 1, 1, EYE); R(-2, 0, 1, 1, [120, 90, 40]); R(0, 1, 1, 1, [120, 90, 40]); R(4, 0, 1, 1, [200, 120, 60]); }
      break;
    }
    case 'SWORDFISH': { // a long blue body, a tall fin, a crescent tail, and the sword
      const len = L(16), hl = Math.floor(len / 2), c: RGB = [74, 104, 170], cb: RGB = [196, 206, 222];
      R(-hl, -2, len, 4, c); R(-hl + 1, 1, len - 3, 1, cb); R(hl, -1, Math.round(7 * k), 1, [150, 160, 180]); R(hl - 2, -1, 1, 1, EYE);
      R(-2, -5, 3, 3, c); R(-1, -6, 1, 1, c); R(-hl - 2, -4, 2, 3, c); R(-hl - 2, 1, 2, 3, c);
      break;
    }
    case 'OCTOPUS': { // a round red mantle, arms curling below as it creeps along
      const c: RGB = [210, 92, 88], cd: RGB = [160, 60, 60], wv = Math.floor(a * 3) % 2;
      oval(x, y - 3, 4, 3, c); r(x - 3, y - 6, 3, 1, M(c, K.WHITE, 0.3)); R(1, -3, 1, 1, EYE); R(-1, -3, 1, 1, EYE);
      for (let i = 0; i < 5; i++) { const ax = -4 + i * 2; r(x + ax, y, 1, 3 + ((i + wv) % 2), cd); r(x + ax + ((i + wv) % 2 ? 1 : -1), y + 3 + ((i + wv) % 2), 1, 1, cd); }
      break;
    }
    case 'MOON FISH': { // round, silver-white and faintly glowing, with red fins
      const c: RGB = [226, 230, 236], ch: RGB = [250, 250, 252];
      lit(() => { oval(x, y, 5, 5, c); R(-3, -4, 5, 1, ch); R(2, -1, 1, 1, EYE); for (let i = 0; i < 3; i++) R(-3 + i * 2, 0 + (i % 2), 1, 1, [200, 206, 226]); });
      R(-7, -2, 2, 4, [214, 70, 70]); R(-1, -6, 3, 1, [214, 70, 70]); R(-1, 5, 3, 1, [214, 70, 70]);
      Gd(x, y, 9, [220, 230, 255], 0.3);
      break;
    }
    case 'GOLDEN KOI': { // gold with white patches, long fins trailing
      const len = L(12); fishBody(R, len, 4, [255, 180, 44], [224, 128, 24], [255, 222, 150], a);
      R(-1, -1, 3, 2, [250, 242, 232]); R(-Math.floor(len / 2) + 2, 0, 2, 1, [250, 242, 232]);
      const wag = Math.round(Math.sin(a * 4) * 1); R(-Math.floor(len / 2) - 4, -2 + wag, 2, 4, [255, 200, 90]);
      break;
    }
    case 'OLD BOOT': { // a brown boot on the gravel, laces and all, with a small crab living in it
      const c: RGB = [112, 78, 52], cd: RGB = [82, 56, 38];
      R(-4, -10, 6, 8, c); R(-4, -3, 11, 4, c); R(-4, 0, 11, 1, cd); R(5, -2, 2, 2, cd); R(-4, -10, 6, 1, M(c, K.WHITE, 0.25));
      for (let i = 0; i < 3; i++) R(-3, -8 + i * 2, 4, 1, [196, 180, 150]);
      if ((a * 0.2) % 1 < 0.4) { R(5, -4, 3, 2, [224, 90, 70]); R(7, -6, 1, 2, [224, 90, 70]); }
      break;
    }
    case 'SEAWEED': { // three green fronds swaying from the gravel
      for (let s = 0; s < 3; s++) for (let j = 0; j < 12 + s * 3; j++) { const sw = Math.round(Math.sin(a * 1.4 + j * 0.3 + s) * (j / 6)); r(x - 4 + s * 4 + sw, y - j, 2, 1, j % 5 === 4 ? [110, 180, 90] : [60, 150, 80]); }
      break;
    }
    default: fishBody(R, L(10), 4, [255, 150, 90], [200, 100, 60], [255, 210, 170], a);
  }
}
/** Stays near the gravel instead of swimming about. */
export const sitsOnBottom = (name: string): boolean => name === 'OLD BOOT' || name === 'SEAWEED';

// ---------------------------------------------------------------- the ocean tank ----------------------------------------------------------------
/** DORIS the whale shark: about 110 px long, grey-blue with white spots and stripes, a wide flat mouth (open at feeding time), two remoras riding along. */
export function whaleShark(x: number, y: number, d: number, a: number, open = 0): void {
  x = Math.round(x); y = Math.round(y);
  const R = facing(x, y, d), B: RGB = [70, 96, 128], BD: RGB = [52, 72, 100], BH: RGB = [100, 128, 160], W: RGB = [214, 224, 234], bel: RGB = [180, 192, 206];
  const sway = Math.round(Math.sin(a * 1.1) * 2);
  // body: a long taper from the broad head (right) to the tail stock (left)
  for (let i = -48; i <= 48; i++) { const u = (i + 48) / 96, hh = Math.round(3 + 12 * Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.62)), yo = Math.round(Math.sin(a * 1.1 - u * 3) * 1.5 * (1 - u)); R(i, -hh + yo, 1, hh * 2, B); R(i, -hh + yo, 1, 1, BH); R(i, hh - 3 + yo, 1, 3, bel); }
  R(44, -6, 6, 12, B); R(49, -5, 2, 10, BD); // the blunt head
  R(46, -2 + (open ? 0 : 1), 4, 2 + Math.round(open * 4), [30, 34, 44]); // the mouth
  R(42, -4, 1, 1, EYE);
  R(-4, -21, 8, 7, B); R(-2, -24, 4, 3, B); R(-24, -9, 4, 4, B); // dorsal fins
  R(8, 10, 10, 4, BD); R(16, 12, 4, 3, BD); // a pectoral fin
  R(-54 + sway, -18, 6, 14, B); R(-56 + sway, -22, 4, 6, B); R(-54 + sway, 4, 6, 8, BD); // the tail
  for (let k = 0; k < 26; k++) { const px = -40 + Math.floor(h1(k * 3.1) * 82), py = -10 + Math.floor(h1(k * 7.3) * 14); R(px, py, 1, 1, W); }
  for (const s of [-30, -16, 0, 16]) R(s, -11, 1, 8, M(B, W, 0.35));
  R(20, 12, 7, 2, [140, 150, 160]); R(-10, 12, 6, 2, [140, 150, 160]); // remoras
}
/** A manta ray seen from the front-side: wide wings flapping, a pale belly, the head fins curled. */
export function manta(x: number, y: number, d: number, a: number): void {
  x = Math.round(x); y = Math.round(y);
  const R = facing(x, y, d), c: RGB = [44, 56, 80], ch: RGB = [70, 86, 116], flap = Math.sin(a * 2.2);
  for (let i = -20; i <= 20; i++) { const u = Math.abs(i) / 20, lift = Math.round(flap * 6 * u * u), th = Math.max(1, Math.round(5 * (1 - u * 0.8))); r(x + i, y - lift - Math.floor(th / 2), 1, th, c); r(x + i, y - lift - Math.floor(th / 2), 1, 1, ch); }
  R(-3, -1, 8, 3, [210, 214, 220]); R(4, -3, 2, 2, c); R(4, 1, 2, 2, c); R(-10, 0, 6, 1, c); // the belly, the head fins, the tail
}
/** A sea turtle paddling: a domed brown-green shell with a pattern, flippers stroking, a little head. */
export function turtle(x: number, y: number, d: number, a: number): void {
  x = Math.round(x); y = Math.round(y);
  const R = facing(x, y, d), sh: RGB = [110, 120, 64], shd: RGB = [78, 86, 44], sk: RGB = [150, 164, 110], st = Math.round(Math.sin(a * 2.4) * 2);
  oval(x, y, 10, 5, sh); r(x - 8, y - 5, 16, 1, M(sh, K.WHITE, 0.25)); for (let i = -6; i <= 6; i += 4) r(x + i, y - 3, 2, 5, shd);
  R(10, -2, 4, 3, sk); R(12, -2, 1, 1, EYE); R(4, 4 + st, 6, 2, sk); R(-8, 4 - st, 4, 2, sk); R(4, -6 - st, 5, 2, sk);
}
/** A reef shark: grey, sleek, a tall first fin, a white tip. */
export function reefShark(x: number, y: number, d: number, a: number): void {
  x = Math.round(x); y = Math.round(y);
  const R = facing(x, y, d), c: RGB = [120, 130, 142], cd: RGB = [90, 98, 110], w: RGB = [210, 214, 220], wag = Math.round(Math.sin(a * 5) * 1);
  for (let i = -16; i <= 16; i++) { const u = (i + 16) / 32, hh = Math.max(1, Math.round(4 * Math.sin(Math.min(1, u * 1.2) * Math.PI * 0.62))); R(i, -hh, 1, hh * 2, c); R(i, hh - 1, 1, 1, w); }
  R(-3, -9, 4, 5, c); R(-2, -10, 2, 1, w); R(-20, -6 + wag, 3, 5, cd); R(-20, 1 + wag, 3, 4, cd); R(4, 3, 5, 2, cd); R(13, -2, 1, 1, EYE); R(12, 1, 3, 1, cd);
}
/** A clownfish: orange with white bands. */
export function clownfish(x: number, y: number, d: number, a: number): void {
  const R = facing(Math.round(x), Math.round(y), d), wag = Math.floor(a * 8) % 2;
  R(-3, -1, 6, 3, [255, 130, 40]); R(-1, -1, 1, 3, K.WHITE); R(2, -1, 1, 3, K.WHITE); R(-4 - wag, -1, 1, 3, [255, 130, 40]); R(3, -1, 1, 1, EYE);
}
/** A silver shoal: n little fish swirling round a point that wanders; they all turn at once. */
export function shoal(cx: number, cy: number, n: number, a: number, spread = 1, pull = 0): void {
  const dirNow = Math.cos(a * 0.21) > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const an = a * (0.7 + h1(i) * 0.4) + i * 2.4, rad = (6 + h1(i * 3.3) * 22) * spread * (1 - pull * 0.6);
    const x = Math.round(cx + Math.cos(an) * rad * 1.6), y = Math.round(cy + Math.sin(an * 1.3) * rad * 0.6);
    r(x, y, 3, 1, [200, 214, 228]); r(dirNow > 0 ? x - 1 : x + 3, y, 1, 1, [130, 150, 176]); if (i % 3 === 0) r(x + 1, y - 1, 1, 1, [236, 244, 252]);
  }
}
/** A moray eel looking out of its rock: in and out, jaws working. */
export function moray(x: number, y: number, a: number): void {
  const out = Math.max(0, Math.sin(a * 0.4)) * 7, c: RGB = [120, 150, 60], cd: RGB = [80, 104, 40], m = Math.floor(a * 2) % 2;
  for (let i = 0; i < out; i++) r(Math.round(x + i), Math.round(y + Math.sin(i * 0.8) * 0.5), 1, 4, i > out - 3 ? cd : c);
  if (out > 2) { r(Math.round(x + out - 2), Math.round(y), 1, 1, EYE); r(Math.round(x + out), Math.round(y + 2 + m), 2, 1, cd); }
}
/** The diver who cleans the glass: a wetsuit, a mask, a tank on their back, fins, bubbles going up, and a scrubber (and, in season, a hat). */
export function diver(x: number, y: number, a: number, wave: boolean, scrub: boolean, hat: 'witch' | 'santa' | null = null): void {
  x = Math.round(x); y = Math.round(y);
  const suit: RGB = [30, 34, 44], hi: RGB = [60, 66, 80], kick = Math.round(Math.sin(a * 3) * 2);
  r(x - 4, y - 6, 8, 14, suit); r(x - 4, y - 6, 1, 14, hi); r(x + 4, y - 4, 3, 10, [230, 190, 60]); // body, the tank
  disc(x, y - 10, 4, suit); alpha(0.7, () => r(x - 4, y - 12, 6, 4, [150, 220, 240])); r(x - 4, y - 12, 6, 1, [255, 210, 60]); // head, mask
  r(x - 3 + kick, y + 8, 3, 5, suit); r(x + 1 - kick, y + 8, 3, 5, suit); r(x - 4 + kick, y + 13, 4, 2, [240, 200, 60]); r(x + 1 - kick, y + 13, 4, 2, [240, 200, 60]);
  if (wave) { const w = Math.floor(a * 6) % 2; r(x - 7, y - 10 - w, 3, 7, suit); r(x - 8, y - 12 - w, 3, 3, [240, 200, 170]); }
  else { r(x - 7, y - 4, 3, 6, suit); }
  if (scrub) { const s = Math.round(Math.sin(a * 9) * 3); r(x - 11 + s, y - 6, 4, 6, [240, 214, 90]); r(x - 12 + s, y - 5, 1, 4, [200, 170, 60]); }
  if (hat === 'witch') { r(x - 7, y - 14, 14, 2, [36, 28, 50]); for (let j = 0; j < 8; j++) r(x - 3 + Math.floor(j / 2) - (j > 5 ? j - 5 : 0), y - 15 - j, Math.max(1, 6 - Math.floor(j * 0.7)), 1, [36, 28, 50]); r(x - 3, y - 15, 6, 1, [123, 97, 255]); }
  if (hat === 'santa') { r(x - 6, y - 15, 12, 3, K.WHITE); for (let j = 0; j < 6; j++) r(x - 4 + j, y - 16 - j, Math.max(1, 8 - j * 1.5), 1, [214, 44, 56]); disc(x + 5, y - 22, 2, K.WHITE); }
  lit(() => { for (let k = 0; k < 3; k++) { const q = (a * 0.8 + k / 3) % 1; r(x + 1 + Math.round(Math.sin(q * 9) * 1), Math.round(y - 16 - q * 30), 1 + (k % 2), 1 + (k % 2), [200, 236, 255]); } });
}
/** Halloween's skeleton fish: bones, swimming. */
export function boneFish(x: number, y: number, d: number, a: number): void {
  const R = facing(Math.round(x), Math.round(y), d), b: RGB = [236, 232, 220], wag = Math.floor(a * 5) % 2;
  R(-8, 0, 16, 1, b); for (let i = -6; i <= 4; i += 2) { R(i, -2, 1, 5, b); } R(6, -3, 5, 6, b); R(8, -2, 1, 1, EYE); R(10, 1, 2, 1, EYE); R(-11, -2 + wag, 3, 2, b); R(-11, 1 - wag, 3, 2, b);
}
/** Winter's snowflake decoration, turning slowly on its string in the ocean tank. */
export function snowflake(x: number, y: number, a: number): void {
  x = Math.round(x); y = Math.round(y);
  lit(() => { for (let k = 0; k < 6; k++) { const an = a * 0.4 + k * Math.PI / 3; for (let j = 1; j <= 7; j++) r(Math.round(x + Math.cos(an) * j), Math.round(y + Math.sin(an) * j), 1, 1, j === 5 ? [200, 230, 255] : K.WHITE); } r(x - 1, y - 1, 3, 3, K.WHITE); });
  Gd(x, y, 12, [200, 230, 255], 0.25);
}
/** A moon jelly pulsing in the jelly room's glow: a bell that squeezes and opens, four rings inside, trailing tentacles. `k` = size. */
export function jelly(x: number, y: number, col: RGB, a: number, ph: number, k = 1): void {
  const p = (Math.sin(a * 2.2 + ph) + 1) / 2, w = Math.round((7 + p * 2) * k), h = Math.round((5 - p * 1.5) * k);
  lit(() => {
    for (let j = 0; j < h; j++) { const hw = Math.round(w * Math.sqrt(1 - (j / h) ** 2)); r(Math.round(x) - hw, Math.round(y) - j, hw * 2, 1, j === h - 1 ? M(col, K.WHITE, 0.6) : M(col, K.WHITE, 0.15 + j * 0.05)); }
    for (let i = 0; i < 4; i++) r(Math.round(x) - 3 + i * 2, Math.round(y) - 2, 1, 1, M(col, K.WHITE, 0.7));
    for (let t = 0; t < 5; t++) { const tx = Math.round(x) - w + 2 + t * Math.round((w * 2 - 4) / 4); for (let j = 0; j < Math.round(8 * k); j++) if ((j + t) % 2 === 0) r(tx + Math.round(Math.sin(a * 1.6 + j * 0.5 + t) * 1.2), Math.round(y) + 1 + j, 1, 1, shade(col, 0.9)); }
  });
  Gd(x, y - 2, 10 * k, col, 0.22);
}
/** Kelp: a frond from the sand at (x, y) up `len` px, swaying, with a few leaves and floats. */
export function kelp(x: number, y: number, len: number, a: number, ph: number): void {
  for (let j = 0; j < len; j += 2) { const sw = Math.round(Math.sin(a * 0.9 + ph + j * 0.05) * (j / len) * 8); r(x + sw, y - j - 1, 2, 2, j % 10 === 0 ? AQ.KELP_HI : AQ.KELP); if (j % 14 === 6) r(x + sw + 2, y - j - 1, 3, 2, AQ.KELP_HI); }
}
