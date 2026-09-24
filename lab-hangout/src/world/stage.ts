// THE STAGE — a little music club in the base of the tower on the Square. Four instruments
// on the stage (keys, drums, bass, mic): step up to one and keys 1-8 (or the pads) play
// notes everyone in the room hears, all in C major pentatonic so any jam sounds good.
// A DJ booth picks backing beats, the dance floor lights up with every note, a disco ball
// throws specks of light around, and spotlights sweep the stage.

import { K, CONFETTI, type RGB } from '../engine/palette';
import { PX, mk, r, line, disc, oval, txt, tw, lit, G, Gd, Gline, withCtx, M } from '../engine/pixel';
import { h1 } from '../engine/math';
import { BEATS } from '../audio/music';
import type { StateMsg } from '../net/transport';
import type { Room, Prop, Spot } from './room';

const W = 1000, H = 700, LF = 466;
const DECK = { x0: 200, x1: 900, top: 426, face: 446 };
const DOOR = { x: 8, y: 362, w: 40, h: 104 };
export const INST_X = [300, 450, 600, 750];
export const INST_COL: RGB[] = [K.CYAN, K.GOLD, K.MAG, [124, 242, 156]];
const TILE = { x0: 250, y0: 500, w: 40, h: 22, cols: 15, rows: 6 };
export const STAGE_INFO = { beat: -1, beatT0: 0, flashes: [] as { t: number; i: number; n: number }[] };

/** A note was played: light up the floor and that instrument's spotlight. */
export function stageNote(i: number, n: number): void {
  const f = STAGE_INFO.flashes; f.push({ t: performance.now() / 1000, i, n }); if (f.length > 40) f.splice(0, f.length - 40);
}

// ---------- the set ----------
function build(this: Room): void {
  withCtx(this.bg.getContext('2d')!, () => {
    PX.dim = 0; PX.fl = 0; PX.emit = false;
    // ceiling + lighting truss
    r(0, 0, W, 150, [16, 12, 24]); r(0, 96, W, 6, [60, 64, 76]); r(0, 116, W, 6, [60, 64, 76]); for (let x = 0; x < W; x += 16) line(x, 102, x + 16, 116, [80, 84, 96]);
    // walls: dark velvet with acoustic foam squares
    r(0, 150, W, LF - 150, [36, 22, 52]); for (let y = 160; y < 400; y += 20) for (let x = (y / 20) % 2 ? 10 : 0; x < W; x += 20) r(x + 2, y + 2, 16, 16, (x + y) % 40 ? [44, 28, 62] : [40, 24, 58]);
    r(0, 400, W, LF - 400, [26, 16, 38]); r(0, 398, W, 3, [90, 60, 120]);
    // the stage: deck + front face with a strip of footlights (lit in drawBack)
    r(DECK.x0, DECK.top, DECK.x1 - DECK.x0, DECK.face - DECK.top, [70, 44, 30]); for (let x = DECK.x0; x < DECK.x1; x += 24) r(x, DECK.top, 1, DECK.face - DECK.top, [56, 34, 22]); r(DECK.x0, DECK.top, DECK.x1 - DECK.x0, 2, [110, 74, 50]);
    r(DECK.x0, DECK.face, DECK.x1 - DECK.x0, LF - DECK.face, [20, 14, 26]); r(DECK.x0, DECK.face, DECK.x1 - DECK.x0, 2, [60, 40, 80]);
    // instruments on the deck
    const kx = INST_X[0]; r(kx - 22, 414, 44, 8, [40, 40, 48]); for (let i = 0; i < 10; i++) r(kx - 20 + i * 4, 416, 3, 5, K.WHITE); for (const i of [1, 2, 4, 5, 6, 8]) r(kx - 20 + i * 4 - 1, 416, 2, 3, K.BLACK); line(kx - 16, 422, kx - 20, 440, [80, 80, 90]); line(kx + 16, 422, kx + 20, 440, [80, 80, 90]);
    const dx = INST_X[1]; oval(dx, 430, 14, 10, [200, 60, 70]); oval(dx, 430, 11, 8, [240, 236, 220]); txt('LAB', dx - tw('LAB') / 2, 428, [200, 60, 70]);
    for (const [ox, oy, rr] of [[-22, 412, 7], [22, 412, 7], [-30, 424, 8], [30, 422, 7]] as [number, number, number][]) { oval(dx + ox, oy, rr, 3, [200, 60, 70]); oval(dx + ox, oy - 1, rr - 1, 2, [230, 220, 200]); line(dx + ox, oy + 2, dx + ox, 440, [140, 140, 150]); }
    for (const cx of [-36, 36]) { line(dx + cx, 400, dx + cx, 440, [140, 140, 150]); oval(dx + cx, 400, 9, 2, K.GOLD); }
    const bx = INST_X[2]; r(bx + 10, 402, 26, 38, [30, 30, 36]); r(bx + 12, 404, 22, 22, [50, 50, 58]); for (let y = 406; y < 424; y += 3) r(bx + 14, y, 18, 1, [36, 36, 42]); disc(bx + 23, 432, 3, [80, 80, 90]);
    r(bx - 20, 406, 6, 30, [180, 50, 150]); r(bx - 19, 386, 3, 22, [90, 60, 40]); r(bx - 20, 382, 5, 6, [60, 40, 30]); line(bx - 22, 436, bx - 26, 442, [60, 60, 70]); line(bx - 12, 436, bx - 8, 442, [60, 60, 70]);
    // speaker stacks either side of the stage
    for (const sx of [150, 920]) for (let k = 0; k < 3; k++) { const y = 360 + k * 34; r(sx - 20, y, 40, 32, [24, 24, 30]); disc(sx, y + 17, 11, [40, 40, 50]); disc(sx, y + 17, 5, [60, 60, 72]); r(sx - 20, y, 40, 1, [50, 50, 60]); }
    // the door back out to the Square
    r(DOOR.x - 3, DOOR.y - 3, DOOR.w + 6, DOOR.h + 3, [60, 40, 80]); r(DOOR.x, DOOR.y, DOOR.w, DOOR.h, [70, 50, 90]); r(DOOR.x, DOOR.y, DOOR.w, 2, [100, 76, 130]); r(DOOR.x + 30, DOOR.y + 52, 3, 6, K.GOLD); r(DOOR.x + 4, DOOR.y - 16, 32, 10, [20, 40, 28]);
    // floor: dark boards, and the dance floor tiles (colours come in drawBack)
    r(0, LF, W, H - LF, [30, 22, 34]); for (let y = LF; y < H; y += 8) r(0, y, W, 1, [24, 16, 28]);
    r(TILE.x0 - 4, TILE.y0 - 4, TILE.cols * TILE.w + 8, TILE.rows * TILE.h + 8, [60, 60, 70]);
  });
}

// ---------- animated set pieces ----------
function drawBack(a: number): void {
  const now = performance.now() / 1000, fl = STAGE_INFO.flashes.filter((f) => now - f.t < 0.6);
  const bpm = STAGE_INFO.beat >= 0 ? BEATS[STAGE_INFO.beat].bpm : 100, beat = (Date.now() / 1000 - STAGE_INFO.beatT0) * bpm / 60, pulse = STAGE_INFO.beat >= 0 ? Math.exp(-(beat % 1) * 5) : 0;
  // dance floor: a slow colour wave, pulsing on the beat, flaring under every note
  lit(() => {
    for (let j = 0; j < TILE.rows; j++) for (let i = 0; i < TILE.cols; i++) {
      const x = TILE.x0 + i * TILE.w, y = TILE.y0 + j * TILE.h, c = CONFETTI[(i + j + Math.floor(a * 1.5)) % CONFETTI.length];
      let k = 0.12 + 0.18 * pulse * ((i + j) % 2);
      for (const f of fl) { const fx = Math.floor((INST_X[f.i] - TILE.x0) / TILE.w), d = Math.abs(i - fx) + Math.abs(j - (f.n % TILE.rows)); if (d < 3) k = Math.max(k, (1 - (now - f.t) / 0.6) * (1 - d / 3)); }
      r(x, y, TILE.w - 2, TILE.h - 2, M([28, 22, 36], c, Math.min(1, k)));
    }
  });
  G(TILE.x0, TILE.y0, TILE.cols * TILE.w, TILE.rows * TILE.h, [180, 120, 255], 0.04 + 0.06 * pulse);
  // footlights along the stage edge
  lit(() => { for (let x = DECK.x0 + 10; x < DECK.x1; x += 30) r(x, DECK.face + 3, 6, 3, CONFETTI[(x / 30 + Math.floor(a * 2)) % CONFETTI.length]); });
  // spotlights: each instrument has one; it flares when that instrument plays
  for (let i = 0; i < 4; i++) {
    const hit = fl.filter((f) => f.i === i).reduce((m, f) => Math.max(m, 1 - (now - f.t) / 0.6), 0), sx = 250 + i * 170, sway = Math.sin(a * 0.8 + i) * 30;
    r(sx - 6, 102, 12, 10, [40, 40, 48]); lit(() => r(sx - 4, 110, 8, 3, M([120, 120, 130], INST_COL[i], 0.5 + hit * 0.5)));
    Gline(sx, 112, INST_X[i] + sway * (1 - hit), 440, INST_COL[i], 0.05 + 0.15 * hit, 36); Gd(INST_X[i], 440, 26, INST_COL[i], 0.12 + 0.3 * hit);
  }
  // the disco ball, and the specks of light it throws
  line(500, 0, 500, 100, [60, 60, 70]);
  lit(() => { for (let dy = -12; dy <= 12; dy += 3) { const w = Math.floor(Math.sqrt(144 - dy * dy)); for (let dx = -w; dx < w; dx += 3) r(500 + dx, 112 + dy, 2, 2, (Math.floor(dx / 3 + dy / 3 + a * 6) % 3) ? [180, 190, 210] : K.WHITE); } });
  Gd(500, 112, 20, [220, 220, 255], 0.3);
  lit(() => { for (let k = 0; k < 40; k++) { const an = h1(k) * 6.283 + a * 0.4, rr = 120 + h1(k + 1) * 380, x = 500 + Math.cos(an) * rr, y = 300 + Math.sin(an) * rr * 0.45; if (y > 150 && y < 640) r(Math.round(x), Math.round(y), 2, 1, CONFETTI[k % CONFETTI.length]); } });
  // neon sign and the EXIT
  const nf = (a * 0.19) % 1 < 0.02;
  lit(() => txt('THE STAGE', 550 - tw('THE STAGE', 3) / 2, 180, nf ? [80, 30, 70] : K.MAG, 3)); if (!nf) G(420, 174, 260, 26, K.MAG, 0.25);
  lit(() => txt('EXIT', DOOR.x + 12, DOOR.y - 14, [124, 242, 156])); G(DOOR.x + 4, DOOR.y - 16, 32, 10, [124, 242, 156], 0.35);
  // mic stand (in front of the singer's face would hide it, so it stands just to the side)
  const mx = INST_X[3] + 14; line(mx, 402, mx, 440, [140, 140, 150]); line(mx - 6, 440, mx + 6, 440, [140, 140, 150]); r(mx - 2, 398, 4, 5, [60, 60, 70]); r(mx - 1, 397, 2, 1, [160, 160, 170]);
}

// ---------- props ----------
const djBooth: Prop = {
  y: 546,
  draw(a: number) {
    const x = 110, y = 546, on = STAGE_INFO.beat >= 0;
    r(x - 30, y - 26, 60, 26, [30, 26, 40]); r(x - 30, y - 26, 60, 2, [70, 60, 90]); txt('DJ', x - tw('DJ') / 2, y - 14, K.MAG);
    for (const tx of [x - 16, x + 16]) { oval(tx, y - 30, 10, 4, [20, 20, 26]); oval(tx, y - 30, 8, 3, [50, 50, 60]); if (on) { const an = a * 8 + tx; r(Math.round(tx + Math.cos(an) * 6), Math.round(y - 30 + Math.sin(an) * 2), 1, 1, K.WHITE); } }
    lit(() => { for (let k = 0; k < 6; k++) r(x - 8 + k * 3, y - 22, 2, 2, on && (a * 4 + k) % 2 < 1 ? CONFETTI[k] : [50, 40, 60]); });
  },
};
const bar: Prop = {
  y: 500,
  draw() { const x = 950; r(x - 30, 470, 60, 30, [70, 40, 30]); r(x - 32, 466, 64, 5, [120, 80, 50]); for (let k = 0; k < 4; k++) { r(x - 24 + k * 13, 454, 6, 12, CONFETTI[k]); r(x - 23 + k * 13, 452, 4, 2, K.WHITE); } txt('BAR', x - tw('BAR') / 2, 480, K.GOLD); },
};

// ---------- spots (index = network id: append only) ----------
export const STAGE_SPOTS: Spot[] = [
  ...INST_X.map((x, i): Spot => ({ kind: 'instrument', inst: i, x, y: 478, sx: x, sy: 486, lift: 38, label: ['PLAY KEYS', 'PLAY DRUMS', 'PLAY BASS', 'SING'][i], area: { x0: x - 30, y0: 380, x1: x + 30, y1: DECK.face } })),
  { kind: 'juke', x: 110, y: 558, sx: 110, sy: 558, lift: 0, label: 'BEATS', area: { x0: 76, y0: 510, x1: 144, y1: 546 } },
  { kind: 'soda', x: 950, y: 512, sx: 950, sy: 512, lift: 0, label: 'SODA', area: { x0: 918, y0: 450, x1: 982, y1: 500 } },
];

export function makeStage(): Room {
  const room: Room = {
    id: 'stage', title: 'THE STAGE', sub: 'LIVE MUSIC',
    w: W, h: H,
    floor: { x0: 14, y0: 476, x1: W - 14, y1: 640 },
    blockers: [{ x0: 80, y0: 538, x1: 140, y1: 548 }, { x0: 918, y0: 492, x1: 982, y1: 502 }, { x0: 130, y0: 470, x1: 170, y1: 474 }, { x0: 900, y0: 470, x1: 940, y1: 474 }],
    doors: [{ trigger: { x0: 10, y0: 476, x1: 46, y1: 484 }, to: 'plaza', arrive: { x: 593, y: 590 }, label: 'OUTSIDE', area: { x0: 4, y0: 342, x1: 52, y1: 470 } }],
    spots: STAGE_SPOTS, inUse: new Map(),
    music: { x: 110, tracks: BEATS, current: () => ({ n: STAGE_INFO.beat, t0: STAGE_INFO.beatT0 }) },
    onState(s: StateMsg) { if (s.k === 'juke') { STAGE_INFO.beat = s.v.n; STAGE_INFO.beatT0 = s.v.t0; } },
    spawn: { x: 60, y: 500 },
    dim: 0.3,
    fillTop: 'rgb(16,12,24)', fillLow: 'rgb(30,22,34)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [djBooth, bar],
  };
  return room;
}

