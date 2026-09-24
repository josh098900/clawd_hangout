// The Lab whiteboard everyone can draw on. It's a tiny 188x70 pixel canvas laid over the
// whiteboard in the set (the baked "IDEAS: ???" stays underneath). Strokes travel as `draw`
// messages; someone arriving later gets a run-length-encoded snapshot as room state 'board'.

import { mk } from '../engine/pixel';
import { css } from '../engine/pixel';
import { K, LK, type RGB } from '../engine/palette';
import { BOARD_H, BOARD_W, type DrawMsg } from '../net/transport';

/** Marker colours by index. 0 = eraser. */
export const INKS: (RGB | null)[] = [null, LK.MK, LK.MKB, LK.MKR, K.GREEN_INK];
export const BOARD_POS = { x: 56, y: 284 };

export class Board {
  readonly cv = mk(BOARD_W, BOARD_H);
  private readonly g = this.cv.getContext('2d')!;
  private readonly px = new Uint8Array(BOARD_W * BOARD_H);
  /** Wall-clock ms of the newest change applied (for snapshot conflicts). */
  ts = 0;

  private dot(c: number, x: number, y: number): void {
    const s = c === 0 ? 3 : 1, o = c === 0 ? 1 : 0; // the eraser is chunkier
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
      const X = x + i - o, Y = y + j - o;
      if (X < 0 || Y < 0 || X >= BOARD_W || Y >= BOARD_H) continue;
      this.px[Y * BOARD_W + X] = c;
    }
    if (c === 0) this.g.clearRect(x - o, y - o, s, s);
    else { this.g.fillStyle = css(INKS[c]!); this.g.fillRect(x, y, 1, 1); }
  }

  /** Bresenham line in board pixels. */
  line(c: number, x0: number, y0: number, x1: number, y1: number): void {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 400; n++) {
      this.dot(c, x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  apply(d: DrawMsg): void {
    if (d.clear) this.clear();
    else if (d.p.length === 2) this.dot(d.c, d.p[0], d.p[1]);
    else for (let i = 2; i < d.p.length; i += 2) this.line(d.c, d.p[i - 2], d.p[i - 1], d.p[i], d.p[i + 1]);
    this.ts = Math.max(this.ts, d.ts);
  }

  clear(): void { this.px.fill(0); this.g.clearRect(0, 0, BOARD_W, BOARD_H); }
  isEmpty(): boolean { return this.px.every((v) => v === 0); }

  /** Run-length encode as (colour, run) byte pairs, base64'd. */
  snapshot(): string {
    const out: number[] = [];
    for (let i = 0; i < this.px.length;) { const c = this.px[i]; let n = 1; while (n < 255 && i + n < this.px.length && this.px[i + n] === c) n++; out.push(c, n); i += n; }
    let s = ''; for (const b of out) s += String.fromCharCode(b);
    return btoa(s);
  }

  /** Replace everything with a snapshot. Bad data is ignored. */
  load(b64: string, ts: number): void {
    let raw = '';
    try { raw = atob(b64); } catch { return; }
    const next = new Uint8Array(this.px.length);
    let i = 0;
    for (let k = 0; k + 1 < raw.length && i < next.length; k += 2) {
      const c = raw.charCodeAt(k), n = raw.charCodeAt(k + 1);
      if (c >= INKS.length) return;
      next.fill(c, i, Math.min(next.length, i + n)); i += n;
    }
    this.px.set(next); this.ts = ts;
    this.g.clearRect(0, 0, BOARD_W, BOARD_H);
    for (let p = 0; p < next.length; p++) if (next[p]) { this.g.fillStyle = css(INKS[next[p]]!); this.g.fillRect(p % BOARD_W, Math.floor(p / BOARD_W), 1, 1); }
  }
}

export const BOARD = new Board();
