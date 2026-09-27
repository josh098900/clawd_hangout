// Sea creatures, drawn in pixels: the twelve things you can catch off the Pier (for the City Aquarium's FISH GALLERY),
// the ocean tank's residents (DORIS the whale shark, the manta rays, the turtle, the reef sharks, the silver shoal,
// the clownfish, the moray, the diver who cleans the glass) and the jelly room's moon jellies. Push 2's submarine
// window draws from here too. Every creature is drawn at (x, y) = its middle, facing `d` (1 = right, -1 = left).

import { K, AQ, type RGB } from '../engine/palette';
import { r, disc, oval, line, lit, alpha, Gd, M, shade } from '../engine/pixel';
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
export function moray(x: number, y: number, a: number, outK?: number): void {
  const out = (outK ?? Math.max(0, Math.sin(a * 0.4))) * 7, c: RGB = [120, 150, 60], cd: RGB = [80, 104, 40], m = Math.floor(a * 2) % 2;
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
export function kelp(x: number, y: number, len: number, a: number, ph: number, blades = false): void {
  for (let j = 0; j < len; j += 2) { const sw = Math.round(Math.sin(a * 0.9 + ph + j * 0.05) * (j / len) * 8); r(x + sw, y - j - 1, 2, 2, j % 10 === 0 ? AQ.KELP_HI : AQ.KELP); if (j % 14 === 6) r(x + sw + 2, y - j - 1, 3, 2, AQ.KELP_HI); if (blades && j % 8 === 2 && j > 6) { const s = j % 16 === 2 ? 1 : -1, fl = Math.round(Math.sin(a * 1.3 + ph + j) * 1); r(s > 0 ? x + sw + 2 : x + sw - 5, y - j - 2 + fl, 5, 1, AQ.KELP); r(s > 0 ? x + sw + 6 : x + sw - 6, y - j - 1 + fl, 2, 1, AQ.KELP_HI); } }
}

// ---------------------------------------------------------------- SARDINE 1's sea (push 2) ----------------------------------------------------------------
/** A sea otter floating on its back at the surface, paws folded on a shell on its tummy, its tail and feet up, bobbing. */
export function seaOtter(x: number, y: number, d: number, a: number): void {
  x = Math.round(x); y = Math.round(y + Math.sin(a * 1.3) * 1);
  const R = facing(x, y, d), c: RGB = [120, 84, 56], cd: RGB = [86, 58, 38], pale: RGB = [214, 196, 170];
  R(-8, -2, 16, 5, c); R(-8, -2, 16, 1, M(c, K.WHITE, 0.2)); R(-7, 2, 14, 1, cd); // the body, lying back
  R(7, -4, 6, 6, pale); R(8, -5, 4, 1, pale); R(11, -3, 1, 1, EYE); R(12, -1, 2, 1, [60, 40, 30]); R(13, 0, 1, 1, pale); R(12, 1, 3, 1, [230, 220, 200]); // the face, whiskers
  R(-1, -4, 5, 2, [180, 190, 200]); R(0, -5, 3, 1, [210, 214, 222]); R(-2, -3, 1, 2, cd); R(4, -3, 1, 2, cd); // the shell on its tummy, paws
  R(-12, -3, 4, 2, cd); R(-13, -4, 2, 1, cd); R(-7, -4, 2, 2, cd); R(-4, -4, 2, 2, cd); // the tail and feet sticking up
}
/** A harbour seal swimming: a grey spotted torpedo, big dark eyes, whiskers, flippers. */
export function seal(x: number, y: number, d: number, a: number): void {
  x = Math.round(x); y = Math.round(y);
  const R = facing(x, y, d), c: RGB = [132, 138, 150], cd: RGB = [96, 102, 116], bel: RGB = [186, 190, 200], kick = Math.round(Math.sin(a * 5) * 2);
  for (let i = -12; i <= 10; i++) { const u = (i + 12) / 22, hh = Math.max(1, Math.round(4.5 * Math.sin(Math.min(1, u * 1.1) * Math.PI * 0.7))); R(i, -hh, 1, hh * 2, c); R(i, hh - 1, 1, 1, bel); }
  R(9, -4, 5, 7, c); R(13, -2, 1, 3, cd); R(11, -3, 2, 2, EYE); R(12, -3, 1, 1, K.WHITE); R(13, 1, 2, 1, [60, 60, 70]); R(14, 0, 3, 1, [210, 214, 222]); R(14, 2, 3, 1, [210, 214, 222]); // the head
  for (let k = 0; k < 7; k++) R(-9 + ((k * 5) % 17), -3 + ((k * 3) % 5), 1, 1, cd); // spots
  R(2, 3, 4, 2, cd); R(-15, -2 + kick, 4, 2, cd); R(-15, 1 - kick, 4, 2, cd); // flippers
}
/** The curious seal's face squashed on the window: big black eyes, the nose flat on the glass, whiskers splayed, a flipper knocking. */
export function sealOnGlass(x: number, y: number, a: number, u: number): void {
  x = Math.round(x); y = Math.round(y);
  const c: RGB = [140, 146, 158], cd: RGB = [104, 110, 124], k = Math.min(1, u * 3), knock = Math.floor(a * 5) % 2;
  if (k <= 0) return;
  oval(x, y, Math.round(20 * k), Math.round(16 * k), c); oval(x - 2, y - 3, Math.round(15 * k), Math.round(11 * k), M(c, K.WHITE, 0.12));
  if (k < 1) return;
  for (const ex of [-9, 9]) { disc(x + ex, y - 4, 4, [20, 20, 28]); r(x + ex - 2, y - 7, 2, 2, K.WHITE); r(x + ex + 1, y - 3, 1, 1, [120, 130, 150]); }
  oval(x, y + 5, 6, 4, [170, 150, 150]); r(x - 3, y + 3, 2, 3, [60, 50, 56]); r(x + 2, y + 3, 2, 3, [60, 50, 56]); // the nose, squashed
  for (const s of [-1, 1]) for (let w = 0; w < 3; w++) line(x + s * 7, y + 7 + w * 2, x + s * (17 + w * 2), y + 5 + w * 4, [226, 230, 238]);
  for (let s = 0; s < 6; s++) r(x - 8 + s * 3, y + 10, 1, 1, cd); // whisker spots
  const fx = x + 22, fy = y + 2 + (knock ? -3 : 0); oval(fx, fy, 5, 8, cd); r(fx - 3, fy - 8, 2, 2, [80, 84, 96]); // the flipper, knocking
  alpha(0.3, () => oval(x, y + 6, 22, 6, [220, 236, 244])); // fogging the glass
}
/** A seahorse curled round a kelp stalk: kelp-green (you can hardly see it) until a ping lights it up, then gold with a shimmer. */
export function seahorse(x: number, y: number, a: number, shown: number): void {
  x = Math.round(x); y = Math.round(y + Math.sin(a * 1.2) * 1);
  const c = M(AQ.KELP, [255, 190, 70], shown), cd = M(AQ.KELP, [200, 130, 40], shown);
  r(x, y - 6, 3, 3, c); r(x + 3, y - 5, 3, 1, c); r(x + 1, y - 6, 1, 1, shown > 0.5 ? EYE : cd); // the head and snout
  r(x - 1, y - 3, 3, 5, c); r(x, y + 2, 2, 2, c); r(x + 1, y + 4, 2, 1, cd); r(x + 2, y + 3, 1, 1, cd); // the belly and the curled tail
  r(x - 2, y - 2, 1, 3, cd); // the fin
  if (shown > 0.05) { alpha(shown * (0.6 + 0.4 * Math.sin(a * 8)), () => lit(() => { r(x - 3, y - 8, 1, 1, [255, 240, 170]); r(x + 5, y - 7, 1, 1, [255, 240, 170]); r(x + 3, y + 4, 1, 1, [255, 240, 170]); })); Gd(x + 1, y - 1, 8, [255, 214, 90], 0.25 * shown); }
}
/** The garibaldi: bright orange, a rounded tail, cross. */
export function garibaldi(x: number, y: number, d: number, a: number): void {
  x = Math.round(x); y = Math.round(y);
  const R = facing(x, y, d), c: RGB = [255, 120, 30], ch: RGB = [255, 170, 70], wag = Math.floor(a * 7) % 2;
  R(-4, -3, 9, 6, c); R(-3, -4, 7, 1, c); R(-3, -3, 6, 1, ch); R(4, -1, 1, 1, EYE); R(3, -2, 1, 1, [255, 236, 200]);
  R(-7, -3 + wag, 3, 6 - wag, c); R(-1, -5, 3, 1, c); R(0, 3, 3, 1, c);
}
/** A leopard shark cruising low: bronze-grey with dark saddles and spots. */
export function leopardShark(x: number, y: number, d: number, a: number): void {
  x = Math.round(x); y = Math.round(y);
  const R = facing(x, y, d), c: RGB = [150, 136, 110], cd: RGB = [70, 60, 50], bel: RGB = [214, 206, 190], wag = Math.round(Math.sin(a * 4) * 2);
  for (let i = -18; i <= 16; i++) { const u = (i + 18) / 34, hh = Math.max(1, Math.round(3.5 * Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.64))); R(i, -hh, 1, hh * 2, c); R(i, hh - 1, 1, 1, bel); }
  for (const s of [-12, -4, 4, 11]) { R(s, -3, 3, 2, cd); } for (let k = 0; k < 8; k++) R(-14 + k * 4, 0 + (k % 2), 1, 1, cd);
  R(-2, -7, 4, 4, c); R(-12, -5, 3, 2, c); R(-22, -5 + wag, 4, 4, c); R(-22, 1 + wag, 3, 3, c); R(15, -1, 1, 1, EYE); R(6, 3, 5, 2, c);
}
/** The reef's octopus: a lump of rock (you'd never know) until a ping shows it, then red, with eyes and arms curling. */
export function octopusRock(x: number, y: number, a: number, shown: number): void {
  x = Math.round(x); y = Math.round(y);
  const rock = [96, 90, 104] as RGB, c = M(rock, [214, 80, 70], shown), cd = M(shade(rock, 0.8), [160, 50, 50], shown);
  oval(x, y - 3, 7, 5, c); r(x - 5, y - 7, 6, 1, M(c, K.WHITE, 0.2)); for (let k = 0; k < 5; k++) r(x - 5 + k * 2, y - 4 + (k % 2) * 2, 1, 1, cd);
  const wv = Math.floor(a * 3) % 2;
  for (let i = 0; i < 6; i++) { const ax = x - 7 + i * 3; r(ax, y + 1, 2, 2, cd); if (shown > 0.3) r(ax + ((i + wv) % 2 ? 1 : -1), y + 3, 1, 1, cd); }
  if (shown > 0.3) { r(x - 3, y - 4, 2, 2, K.WHITE); r(x + 2, y - 4, 2, 2, K.WHITE); r(x - 2, y - 3, 1, 1, EYE); r(x + 3, y - 3, 1, 1, EYE); }
  if (shown > 0.05) alpha(shown * (0.5 + 0.5 * Math.sin(a * 8)), () => lit(() => { r(x - 9, y - 9, 1, 1, [255, 200, 200]); r(x + 8, y - 6, 1, 1, [255, 200, 200]); }));
}
/** THE GIANT GROUPER's great mottled face out of its hole in the wreck (`out` 0..1), mouth opening and shutting. */
export function grouper(x: number, y: number, a: number, out: number): void {
  x = Math.round(x); y = Math.round(y);
  const c: RGB = [120, 104, 80], cd: RGB = [86, 72, 56], lip: RGB = [150, 132, 104], o = Math.round(out * 12), mo = Math.floor(a * 1.5) % 2;
  if (o <= 0) return;
  r(x - 2, y - 8, o + 2, 16, c); r(x - 2, y - 8, o + 2, 1, M(c, K.WHITE, 0.2));
  for (let k = 0; k < 6; k++) r(x + ((k * 5) % Math.max(1, o)), y - 6 + ((k * 3) % 12), 2, 1, cd);
  if (o > 6) { r(x + o - 5, y - 5, 3, 3, [230, 220, 190]); r(x + o - 4, y - 4, 1, 1, EYE); r(x + o - 1, y + 1, 3, 4 + mo * 2, [40, 28, 26]); r(x + o - 1, y, 3, 1, lip); r(x + o - 1, y + 5 + mo * 2, 3, 1, lip); }
}
/** A lanternfish: a tiny dark fish, with a row of glowing dots (only seen in the dark). */
export function lanternfish(x: number, y: number, a: number, k: number): void {
  x = Math.round(x); y = Math.round(y);
  const on = (a * 1.7 + k * 0.37) % 1 < 0.8;
  r(x - 2, y, 5, 2, [20, 30, 40]);
  if (on) { lit(() => { r(x - 1, y + 1, 1, 1, SEA_LAN); r(x + 1, y + 1, 1, 1, SEA_LAN); r(x + 2, y, 1, 1, [220, 255, 255]); }); Gd(x, y + 1, 4, SEA_LAN, 0.5); }
}
const SEA_LAN: RGB = [122, 232, 255];
/** THE HUMPBACK WHALE: 150 px of dark blue-grey, a knobbly head, throat grooves, long white flippers, the flukes going up and down. */
export function humpback(x: number, y: number, d: number, a: number): void {
  x = Math.round(x); y = Math.round(y);
  const R = facing(x, y, d), c: RGB = [44, 58, 80], cd: RGB = [30, 40, 58], ch: RGB = [66, 84, 110], w: RGB = [214, 222, 232], beat = Math.sin(a * 0.9);
  for (let i = -70; i <= 64; i++) {
    const u = (i + 70) / 134, hh = Math.max(2, Math.round(20 * Math.sin(Math.min(1, u * 1.05) * Math.PI * 0.62))), yo = Math.round(beat * 4 * (1 - Math.min(1, u * 2)));
    R(i, -hh + yo, 1, hh * 2, c); R(i, -hh + yo, 1, 1, ch); if (i > 10) R(i, hh - 6 + yo, 1, 6, M(c, w, 0.25)); if (i > 14 && i % 3 === 0) R(i, hh - 5 + yo, 1, 4, cd); // the throat grooves
  }
  for (let k = 0; k < 9; k++) R(40 + k * 3, -16 + (k % 3), 2, 2, cd); // the knobbles on its head
  R(60, -2, 4, 1, cd); R(52, -6, 2, 2, K.WHITE); R(52, -6, 1, 1, EYE); // mouth line and eye
  const fl = Math.round(Math.sin(a * 0.6) * 5); for (let j = 0; j < 36; j++) R(28 - j, 10 + Math.round(j * 0.35) + Math.round(fl * j / 36), 3, 3, j < 4 ? c : w); // the long white flipper
  R(-6, -22, 8, 4, c); // the little dorsal fin
  const fy = Math.round(beat * 12); R(-80, -4 + fy, 12, 7, c); R(-92, -12 + fy, 14, 6, c); R(-92, 5 + fy, 14, 6, c); R(-92, -12 + fy, 14, 1, ch); // the flukes
}
/** THE ANGLERFISH: its glowing lure on a stalk; `lit` shows the rest of it, startled: a round dark body, huge jaws, needle teeth. */
export function anglerfish(x: number, y: number, d: number, a: number, lit2: boolean): void {
  x = Math.round(x); y = Math.round(y);
  const R = facing(x, y, d), lx = d > 0 ? x + 9 : x - 9, ly = y - 11 + Math.round(Math.sin(a * 2.2) * 1.5);
  lit(() => { r(lx - 1, ly - 1, 3, 3, [154, 255, 224]); r(lx, ly, 1, 1, K.WHITE); }); Gd(lx, ly, 7, [154, 255, 224], 0.6); Gd(lx, ly, 3, K.WHITE, 0.5);
  if (!lit2) return;
  const c: RGB = [58, 50, 60], cd: RGB = [36, 30, 40];
  oval(x, y, 10, 8, c); r(x - 8, y - 7, 8, 1, M(c, K.WHITE, 0.2));
  for (let j = 0; j < 8; j++) R(2 + Math.round(j * 0.4), -9 + j, 1, 1, [90, 84, 96]); // the stalk
  R(3, 0, 9, 5, [20, 10, 16]); for (let t = 0; t < 4; t++) { R(4 + t * 2, 0, 1, 2, K.WHITE); R(5 + t * 2, 3, 1, 2, K.WHITE); } // the jaws, the teeth
  R(3, -4, 2, 2, [230, 230, 200]); R(4, -3, 1, 1, EYE); R(-13, -3, 4, 6, cd); R(-2, 7, 4, 2, cd);
}
/** THE DUMBO OCTOPUS: pale pink, two ear-fins flapping, a skirt of short arms. */
export function dumbo(x: number, y: number, d: number, a: number): void {
  x = Math.round(x); y = Math.round(y);
  const c: RGB = [248, 196, 190], cd: RGB = [214, 150, 150], f = Math.floor(a * 3) % 2;
  oval(x, y - 2, 7, 6, c); r(x - 4, y - 7, 6, 1, M(c, K.WHITE, 0.4));
  r(x - 11, y - 6 - f, 5, 3, cd); r(x + 7, y - 6 - f, 5, 3, cd); // the ear-fins
  for (let i = 0; i < 5; i++) r(x - 5 + i * 3, y + 3, 2, 3 + (i % 2), cd);
  r(x + (d > 0 ? 1 : -3), y - 4, 2, 2, EYE);
}
/** A YETI CRAB: white, with hairy arms, on the warm vents. */
export function yetiCrab(x: number, y: number, d: number, a: number): void {
  x = Math.round(x); y = Math.round(y);
  const c: RGB = [236, 232, 222], cd: RGB = [196, 190, 176], w = Math.floor(a * 2) % 2;
  r(x - 3, y - 3, 6, 3, c); r(x - 2, y - 4, 4, 1, c); r(x - 1, y - 5, 1, 1, EYE); r(x + 1, y - 5, 1, 1, EYE);
  for (const s of [-1, 1]) { r(x + s * 4 - (s < 0 ? 3 : 0), y - 4 - w, 4, 3, c); for (let h = 0; h < 4; h++) r(x + s * (4 + h) - (s < 0 ? 1 : 0), y - 1 - w + (h % 2), 1, 1, cd); }
  for (const lx of [-3, -1, 1, 3]) r(x + lx, y, 1, 2, cd);
}
/** THE GIANT SQUID on the hull: arms slapped across the window (window coords: the pane span x0..x1, y0..y1), suckers on the glass, `u` = how long it's been there. */
export function squidOnGlass(x0: number, y0: number, x1: number, y1: number, a: number, u: number): void {
  const k = Math.min(1, u * 1.5), c: RGB = [196, 70, 84], cd: RGB = [124, 34, 52], hi: RGB = [232, 118, 124], sk: RGB = [244, 190, 194];
  // the arms, pressed on the glass (so it's their sucker side we see): [x, y, heading (rad), length, thickness]. Some hang from the top
  // of the window, the long ones reach in from the sides; they writhe, and their tips curl
  const ARMS: [number, number, number, number, number][] = [
    [x0 + 50, y0 - 4, 1.1, 150, 9], [x0 + 270, y0 - 4, 2.0, 140, 10], [x0 + 490, y0 - 4, 1.0, 150, 9], [x0 + 640, y0 - 4, 2.2, 130, 8],
    [x0 - 4, y0 + 40, 0.12, 330, 10], [x0 - 4, y0 + 95, -0.15, 260, 8], [x1 + 4, y0 + 70, Math.PI + 0.08, 330, 10], [x1 + 4, y0 + 25, Math.PI - 0.18, 240, 8],
  ];
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < ARMS.length; i++) {
    const [sx, sy, h0, L, th] = ARMS[i], len = L * k, curl = i % 2 ? 1 : -1;
    let x = sx, y = sy;
    for (let s = 0; s < len; s += 2) {
      const t = s / Math.max(1, len), h = h0 + Math.sin(t * 3 + i * 1.7 + a * 1.1) * 0.35 + (t > 0.72 ? curl * ((t - 0.72) / 0.28) ** 1.5 * 4.5 : 0);
      x += Math.cos(h) * 2; y += Math.sin(h) * 2;
      const w = Math.max(2, th * (1 - t * 0.8)), hw = w / 2;
      if (pass === 0) { r(x - hw - 1, y - hw - 1, w + 2, w + 2, cd); continue; } // (the outline, all arms first)
      r(x - hw, y - hw, w, w, c); r(x - hw + 1, y - hw + 1, Math.max(1, w / 3), 1, hi);
      if (w > 4 && Math.round(s) % 6 === 0) for (const side of [-1, 1]) { const nx = Math.cos(h + Math.PI / 2) * side * w / 4, ny = Math.sin(h + Math.PI / 2) * side * w / 4; r(Math.round(x + nx) - 1, Math.round(y + ny) - 1, 2, 2, sk); }
    }
  }
  if (k >= 1) { // THE EYE, pressed up to a pane, looking round (and blinking)
    const ex = Math.round(x0 + (x1 - x0) * 0.66 + Math.sin(a * 0.4) * 20), ey = y0 + 40, look = Math.round(Math.sin(a * 0.9) * 3), blink = (a * 0.3) % 1 < 0.05;
    disc(ex, ey, 16, cd); disc(ex, ey, 14, c); disc(ex, ey, 11, [230, 220, 120]);
    if (blink) r(ex - 12, ey - 2, 24, 4, c); else { disc(ex + look, ey + 1, 6, [20, 10, 14]); r(ex + look - 5, ey - 5, 3, 3, K.WHITE); }
  }
}
/** THE BABY OCTOPUS suckered onto the glass: a pink blob with big eyes, eight curly arms spread out, the suckers showing, blinking. */
export function babyOctopusOnGlass(x: number, y: number, a: number, u: number): void {
  x = Math.round(x); y = Math.round(y);
  const c: RGB = [255, 130, 150], cd: RGB = [214, 86, 116], sk: RGB = [255, 206, 214], k = Math.min(1, u * 2), blink = (a * 0.5) % 1 < 0.06;
  if (k <= 0) return;
  for (let arm = 0; arm < 8; arm++) {
    const an = (arm / 8) * Math.PI * 2 + 0.2, len = 12 * k;
    for (let s = 3; s < len; s++) { const t = s / len, cx = Math.round(x + Math.cos(an + t * 1.4 + Math.sin(a + arm) * 0.1) * s), cy = Math.round(y + 3 + Math.sin(an + t * 1.4) * s * 0.8); r(cx, cy, 2, 2, cd); if (s % 3 === 0) r(cx, cy, 1, 1, sk); }
  }
  oval(x, y - 2, 7, 6, c); r(x - 4, y - 7, 5, 1, M(c, K.WHITE, 0.4));
  if (blink) { r(x - 4, y - 2, 3, 1, EYE); r(x + 2, y - 2, 3, 1, EYE); }
  else { r(x - 4, y - 4, 3, 4, K.WHITE); r(x + 2, y - 4, 3, 4, K.WHITE); r(x - 3, y - 3, 2, 2, EYE); r(x + 3, y - 3, 2, 2, EYE); }
  r(x - 1, y + 1, 2, 1, cd);
}

// ---------------------------------------------------------------- treasure on the seabed ----------------------------------------------------------------
/** A find lying at (x, y) (its bottom), for the window and the CLAW CAM: `k` = scale (the claw cam draws them bigger), `a` = time. */
export function drawFind(kind: string, x: number, y: number, a: number, note = 0): void {
  x = Math.round(x); y = Math.round(y);
  const glint = (gx: number, gy: number) => { if ((a * 0.7 + gx * 0.013) % 1 < 0.12) lit(() => { r(gx, gy - 1, 1, 3, K.WHITE); r(gx - 1, gy, 3, 1, K.WHITE); }); };
  switch (kind) {
    case 'coins': for (let k = 0; k < 6; k++) { const cx = x - 5 + ((k * 3) % 9), cy = y - 1 - Math.floor(k / 3) * 2; r(cx, cy, 4, 2, [230, 180, 50]); r(cx, cy, 4, 1, [255, 226, 110]); } glint(x - 2, y - 4); break;
    case 'pearl': lit(() => { disc(x, y - 3, 2, [244, 240, 236]); r(x - 1, y - 4, 1, 1, K.WHITE); }); Gd(x, y - 3, 5, [255, 250, 240], 0.3); break;
    case 'bottle': { const g: RGB = [70, 140, 90]; r(x - 6, y - 4, 10, 4, g); r(x + 4, y - 3, 3, 2, g); r(x + 7, y - 3, 1, 2, [150, 110, 70]); r(x - 5, y - 4, 8, 1, M(g, K.WHITE, 0.4)); r(x - 3, y - 3, 5, 2, [240, 230, 200]); glint(x - 4, y - 4); break; }
    case 'chest': { const w: RGB = [120, 76, 44], wd: RGB = [84, 52, 30]; r(x - 7, y - 8, 14, 8, w); r(x - 7, y - 10, 14, 3, wd); r(x - 7, y - 8, 14, 1, M(w, K.WHITE, 0.2)); r(x - 5, y - 10, 2, 10, [70, 70, 80]); r(x + 3, y - 10, 2, 10, [70, 70, 80]); r(x - 1, y - 6, 3, 3, [240, 190, 60]); lit(() => r(x - 2, y - 11, 5, 1, [255, 214, 90])); glint(x + 5, y - 9); break; }
    case 'duck': case 'rduck': { const c: RGB = [255, 214, 60]; r(x - 4, y - 4, 7, 4, c); r(x + 1, y - 7, 4, 4, c); r(x + 5, y - 5, 2, 1, [255, 130, 40]); r(x + 3, y - 6, 1, 1, EYE); r(x - 4, y - 4, 6, 1, [255, 240, 170]); if (kind === 'rduck') { r(x - 5, y - 11, 1, 7, [120, 120, 130]); r(x - 4, y - 11, 4, 3, [230, 60, 60]); } break; }
    case 'cone': { const o: RGB = [255, 120, 30]; for (let i = 0; i < 9; i++) r(x - 5 + i, y - 1 - Math.round((i / 9) * 4), 1, 1 + Math.round((i / 9) * 4), i % 4 === 2 ? K.WHITE : o); r(x - 6, y - 1, 12, 1, [40, 40, 44]); break; }
    case 'phone': r(x - 4, y - 2, 8, 2, [30, 30, 36]); if ((a * 1.2) % 1 < 0.5) { lit(() => r(x - 3, y - 3, 6, 1, [140, 220, 255])); Gd(x, y - 3, 5, [140, 220, 255], 0.35); } break;
    case 'gnome': r(x - 2, y - 5, 5, 5, [60, 110, 200]); r(x - 2, y - 7, 5, 2, [240, 210, 180]); r(x - 2, y - 5, 5, 2, K.WHITE); for (let j = 0; j < 5; j++) r(x - 2 + Math.floor(j / 2), y - 8 - j, Math.max(1, 5 - j), 1, [220, 50, 50]); break;
    case 'shades': r(x - 5, y - 3, 4, 3, [20, 20, 28]); r(x + 1, y - 3, 4, 3, [20, 20, 28]); r(x - 1, y - 3, 2, 1, [20, 20, 28]); r(x - 4, y - 3, 1, 1, [140, 160, 200]); break;
    case 'trumpet': { const b: RGB = [220, 170, 60]; r(x - 7, y - 2, 12, 2, b); r(x + 4, y - 4, 3, 6, b); r(x - 3, y - 4, 1, 2, b); r(x - 1, y - 4, 1, 2, b); r(x - 7, y - 2, 12, 1, [255, 226, 130]); glint(x + 5, y - 4); break; }
    case 'tyre': oval(x, y - 3, 6, 3, [30, 30, 34]); oval(x, y - 3, 3, 1, [60, 70, 80]); break;
    case 'globe': r(x - 3, y - 2, 6, 2, [120, 80, 50]); disc(x, y - 5, 3, [200, 230, 250]); lit(() => { r(x - 1, y - 6, 1, 1, K.WHITE); r(x + 1, y - 4, 1, 1, K.WHITE); }); break;
    case 'present': r(x - 4, y - 7, 8, 7, [220, 50, 60]); r(x - 1, y - 7, 2, 7, [255, 214, 90]); r(x - 4, y - 4, 8, 1, [255, 214, 90]); r(x - 3, y - 9, 2, 2, [255, 214, 90]); r(x + 1, y - 9, 2, 2, [255, 214, 90]); break;
    case 'bell': { const b: RGB = [200, 150, 60]; r(x - 5, y - 3, 10, 3, b); r(x - 4, y - 7, 8, 4, b); r(x - 3, y - 9, 6, 2, b); r(x - 1, y - 11, 2, 2, [150, 110, 40]); r(x - 4, y - 7, 2, 4, [255, 214, 120]); r(x - 1, y - 1, 2, 2, [120, 90, 40]); glint(x - 3, y - 8); break; }
    case 'boot': { const c: RGB = [112, 78, 52], cd: RGB = [82, 56, 38]; r(x - 2, y - 10, 6, 8, c); r(x - 7, y - 3, 11, 4, c); r(x - 7, y, 11, 1, cd); r(x - 7, y - 2, 2, 2, cd); r(x - 2, y - 10, 6, 1, M(c, K.WHITE, 0.25)); for (let i = 0; i < 3; i++) r(x - 1, y - 8 + i * 2, 4, 1, [196, 180, 150]); break; }
    case 'can': r(x - 4, y - 3, 8, 3, [210, 40, 50]); r(x - 4, y - 3, 8, 1, [240, 110, 110]); r(x + 3, y - 3, 1, 3, [200, 200, 210]); r(x - 2, y - 2, 3, 1, K.WHITE); break;
    case 'bag': alpha(0.7, () => { const s = Math.round(Math.sin(a * 1.4) * 1); r(x - 5, y - 6 + s, 10, 5, [230, 236, 240]); r(x - 5, y - 8 + s, 2, 2, [230, 236, 240]); r(x + 3, y - 8 + s, 2, 2, [230, 236, 240]); }); break;
    case 'crisps': r(x - 4, y - 4, 8, 4, [60, 120, 220]); r(x - 4, y - 4, 8, 1, [200, 210, 220]); r(x - 2, y - 3, 4, 2, [255, 214, 90]); break;
  }
  void note;
}
