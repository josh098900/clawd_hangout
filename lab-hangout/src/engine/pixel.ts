// The pixel drawing kit. Everything visible in the game is built from these calls.
// Ported from the original film's primitives: hard-edged rects, snapped to whole pixels,
// with a tiny lighting model (DIM / FL / EMIT) and a separate soft "glow" layer.
//
// Mental model:
//   PX.ctx   – the canvas every r() call paints into (the world, a sprite, a set's backdrop…)
//   PX.dim   – 0..1 fade of normal pixels toward NIGHT (rooms at night use ~0.1)
//   PX.fl    – flash strength; tints pixels toward PX.flc (laser light, lightning…)
//   PX.emit  – when true, pixels are self-lit: they ignore dim and flash (neon, eyes, bulbs)
//   G/Gd/Gline – paint SOFT light into the half-resolution glow canvas, which is blurred and
//                screen-blended over the crisp layer. Soft light never goes through r().

import { FONT } from './font';
import { NIGHT, type RGB } from './palette';
import { clamp } from './math';

export const mk = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

export const PX = {
  ctx: null as unknown as CanvasRenderingContext2D,
  glow: null as unknown as CanvasRenderingContext2D,
  dim: 0,
  fl: 0,
  flc: [0, 0, 0] as RGB,
  emit: false,
  gmul: 1,
};

/** Temporarily paint into another context. */
export function withCtx<T>(c: CanvasRenderingContext2D, fn: () => T): T {
  const prev = PX.ctx;
  PX.ctx = c;
  try {
    return fn();
  } finally {
    PX.ctx = prev;
  }
}
/** Run fn with emissive pixels (ignore dim/flash). */
export function lit(fn: () => void): void {
  const p = PX.emit;
  PX.emit = true;
  try {
    fn();
  } finally {
    PX.emit = p;
  }
}

export const M = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const shade = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
export const css = (c: RGB): string =>
  'rgb(' + Math.min(255, Math.max(0, c[0] | 0)) + ',' + Math.min(255, Math.max(0, c[1] | 0)) + ',' + Math.min(255, Math.max(0, c[2] | 0)) + ')';

function tint(c: RGB): RGB {
  if (PX.emit) return c;
  let x = PX.dim > 0 ? M(c, NIGHT, PX.dim) : c;
  if (PX.fl > 0) {
    const k = 0.14 * PX.fl;
    x = [x[0] + PX.flc[0] * k, x[1] + PX.flc[1] * k, x[2] + PX.flc[2] * k];
  }
  return x;
}

/** THE primitive: a whole-pixel rectangle. */
export function r(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h);
  if (x1 <= x0 || y1 <= y0) return;
  PX.ctx.fillStyle = css(tint(c));
  PX.ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}
export function line(x0: number, y0: number, x1: number, y1: number, c: RGB, th = 1): void {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let i = 0; i <= n; i++) r(x0 + (dx * i) / n - (th >> 1), y0 + (dy * i) / n - (th >> 1), th, th, c);
}
export function disc(cx: number, cy: number, rad: number, c: RGB): void {
  for (let dy = -rad; dy <= rad; dy++) {
    const w = Math.floor(Math.sqrt(rad * rad - dy * dy + 0.4));
    r(cx - w, cy + dy, 2 * w + 1, 1, c);
  }
}
/** Filled pixel ellipse. */
export function oval(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.3))));
    r(cx - w, cy + dy, 2 * w + 1, 1, c);
  }
}
export function ring(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  const n = Math.max(12, Math.ceil((rx + ry) * 2));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.2832;
    r(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1, c);
  }
}
/** Paint an ASCII sprite. '.' is transparent; other chars look up `map`. */
export function spr(rows: string[], map: Record<string, RGB>, x: number, y: number): void {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      const c = map[ch];
      if (c) r(x + i, y + j, 1, 1, c);
    }
  }
}
/** Pixel text in the 3x5 font. sc = integer scale. */
export function txt(s: string, x: number, y: number, c: RGB, sc = 1): void {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch];
    if (g) for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j][i] === '#') r(cx + i * sc, y + j * sc, sc, sc, c);
    cx += 4 * sc;
  }
}
/** Width of txt(s): it draws one glyph per character of s.toUpperCase() (so emoji count once, and 'ß' as 'SS'). */
export function tw(s: string, sc = 1): number {
  let n = 0; for (const _ of s.toUpperCase()) n++;
  return n * 4 * sc - sc;
}
/** Pixel text with a 1px dark drop outline, the film's style for pop-up words ("RESET!", "?"). */
export function txtOutlined(s: string, x: number, y: number, c: RGB, sc = 1, ol: RGB = [20, 12, 30]): void {
  txt(s, x + 1, y + 1, ol, sc);
  txt(s, x - 1, y, ol, sc);
  txt(s, x + 1, y - 1, ol, sc);
  txt(s, x, y + 1, ol, sc);
  lit(() => txt(s, x, y, c, sc));
}
export function alpha(a: number, fn: () => void): void {
  const p = PX.ctx.globalAlpha;
  PX.ctx.globalAlpha = p * clamp(a, 0, 1);
  try {
    fn();
  } finally {
    PX.ctx.globalAlpha = p;
  }
}
export function twinkle(x: number, y: number, col: RGB, big = 0): void {
  r(x, y - 1 - big, 1, 3 + 2 * big, col);
  r(x - 1 - big, y, 3 + 2 * big, 1, col);
}
export function star4(x: number, y: number, s: number, c: RGB): void {
  r(x, y - s, 1, 2 * s + 1, c);
  r(x - s, y, 2 * s + 1, 1, c);
  if (s >= 2) r(x - 1, y - 1, 3, 3, c);
}
/** A dust/steam puff that grows and fades over its life. */
export function puff(x: number, y: number, age: number, life: number, rmax: number, col: RGB, am: number): void {
  if (age < 0 || age > life) return;
  const u = age / life;
  alpha(am * (1 - u), () => disc(Math.round(x), Math.round(y - u * 5), Math.round(1 + u * rmax), col));
}

// ---- soft light (glow layer). Coordinates are world pixels; the glow canvas is half-res. ----
export function G(x: number, y: number, w: number, h: number, c: RGB, a: number): void {
  a *= PX.gmul;
  if (a <= 0.004) return;
  const g = PX.glow;
  g.globalAlpha = Math.min(1, a);
  g.fillStyle = css(c);
  g.fillRect(x, y, w, h);
}
export function Gd(cx: number, cy: number, rad: number, c: RGB, a: number): void {
  a *= PX.gmul;
  if (a <= 0.004) return;
  const g = PX.glow;
  g.globalAlpha = Math.min(1, a);
  g.fillStyle = css(c);
  g.beginPath();
  g.arc(cx, cy, Math.max(0.5, rad), 0, 6.2832);
  g.fill();
}
/** A big soft light: several weak discs stacked from `r1` in to `r0` (one big disc reads as a flat circle). */
export function Gsoft(cx: number, cy: number, r0: number, r1: number, c: RGB, a: number, n = 6): void {
  for (let k = 0; k < n; k++) Gd(cx, cy, r1 - (r1 - r0) * (k / (n - 1)), c, a / n * 1.6);
}
export function Gline(x0: number, y0: number, x1: number, y1: number, c: RGB, a: number, w: number): void {
  a *= PX.gmul;
  if (a <= 0.004) return;
  const g = PX.glow;
  g.globalAlpha = Math.min(1, a);
  g.strokeStyle = css(c);
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
}

/**
 * Give a sprite canvas the film's clean 1px outline: draws `src`'s silhouette in `col`
 * offset by one pixel in 4 directions into `out`, then `src` on top.
 */
export function outline(src: HTMLCanvasElement, out: HTMLCanvasElement, sil: HTMLCanvasElement, col: string): void {
  const sl = sil.getContext('2d')!, ox = out.getContext('2d')!;
  sl.globalCompositeOperation = 'source-over';
  sl.clearRect(0, 0, sil.width, sil.height);
  sl.drawImage(src, 0, 0);
  sl.globalCompositeOperation = 'source-in';
  sl.fillStyle = col;
  sl.fillRect(0, 0, sil.width, sil.height);
  sl.globalCompositeOperation = 'source-over';
  ox.clearRect(0, 0, out.width, out.height);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ox.drawImage(sil, dx, dy);
  ox.drawImage(src, 0, 0);
}
