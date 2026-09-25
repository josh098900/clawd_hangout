// THE STAGE — a little music club in the base of the tower on the Square. Four instruments
// on the stage (keys, drums, bass, mic): step up to one and keys 1-8 (or the pads) play
// notes everyone in the room hears, all in C major pentatonic so any jam sounds good.
// A DJ booth picks backing beats, the dance floor lights up with every note, a disco ball
// throws specks of light around, and spotlights sweep the stage.
// KARAOKE (game/karaoke.ts): pick a song at the machine by the stage; the lyrics light up on the
// big screen over it, whoever's at the mic sings the melody and the band play their lanes; the
// crowd's emotes and dancing fill the HYPE bar (flames either side of the stage when it's high).

import { K, CONFETTI, type RGB } from '../engine/palette';
import { PX, mk, r, line, disc, oval, txt, tw, lit, G, Gd, Gline, withCtx, M } from '../engine/pixel';
import { h1, clamp } from '../engine/math';
import { SONGS, kLive, kTime, kWhere, lineWords, stepS, songLen, grade, hypeBonus, type KaraokeState } from '../game/karaoke';
import { BEATS } from '../audio/music';
import type { StateMsg } from '../net/transport';
import type { Room, Prop, Spot } from './room';

const W = 1000, H = 700, LF = 466;
const DECK = { x0: 200, x1: 900, top: 426, face: 446 };
const DOOR = { x: 8, y: 362, w: 40, h: 104 };
export const INST_X = [300, 450, 600, 750];
export const INST_COL: RGB[] = [K.CYAN, K.GOLD, K.MAG, [124, 242, 156]];
const TILE = { x0: 250, y0: 500, w: 40, h: 22, cols: 15, rows: 6 };
export const STAGE_INFO = {
  beat: -1, beatT0: 0, flashes: [] as { t: number; i: number; n: number }[],
  /** The song on (room state 'karaoke'), the crowd's hype (0..1, worked out in each browser), everyone's running scores, and the last result. */
  karaoke: null as KaraokeState | null, hype: 0,
  scores: new Map<string, { name: string; i: number; s: number; c: number; f: boolean }>(),
  result: null as { song: number; band: number; hype: number; at: number; top: string } | null,
};
/** The band's score: the performers' average (without the crowd's hype bonus). */
export function bandScore(): number { const v = [...STAGE_INFO.scores.values()]; return v.length ? Math.round(v.reduce((a, x) => a + x.s, 0) / v.length) : 0; }
/** ...and with it, as shown everywhere. */
export const bandTotal = (): number => (STAGE_INFO.scores.size ? Math.min(100, bandScore() + hypeBonus(STAGE_INFO.hype)) : 0);

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
  const k = STAGE_INFO.karaoke, sing = kLive(k) && !!k && kTime(k) > 0;
  const bpm = sing ? SONGS[k!.song].bpm : STAGE_INFO.beat >= 0 ? BEATS[STAGE_INFO.beat].bpm : 100, beat = sing ? kTime(k!) * bpm / 60 : (Date.now() / 1000 - STAGE_INFO.beatT0) * bpm / 60, pulse = sing || STAGE_INFO.beat >= 0 ? Math.exp(-(beat % 1) * 5) : 0;
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
  karaokeScreen(a);
  karaokeFx(a);
  // neon sign and the EXIT
  const nf = (a * 0.19) % 1 < 0.02;
  lit(() => txt('THE STAGE', 550 - tw('THE STAGE', 3) / 2, 180, nf ? [80, 30, 70] : K.MAG, 3)); if (!nf) G(420, 174, 260, 26, K.MAG, 0.25);
  lit(() => txt('EXIT', DOOR.x + 12, DOOR.y - 14, [124, 242, 156])); G(DOOR.x + 4, DOOR.y - 16, 32, 10, [124, 242, 156], 0.35);
  // mic stand (in front of the singer's face would hide it, so it stands just to the side)
  const mx = INST_X[3] + 14; line(mx, 402, mx, 440, [140, 140, 150]); line(mx - 6, 440, mx + 6, 440, [140, 140, 150]); r(mx - 2, 398, 4, 5, [60, 60, 70]); r(mx - 1, 397, 2, 1, [160, 160, 170]);
}

// ---------- karaoke ----------
const SCR = { x0: 330, y0: 262, x1: 770, y1: 372 };
function karaokeScreen(a: number): void {
  const k = STAGE_INFO.karaoke, live = kLive(k), w = SCR.x1 - SCR.x0, cx = (SCR.x0 + SCR.x1) / 2;
  r(SCR.x0 - 5, SCR.y0 - 5, w + 10, SCR.y1 - SCR.y0 + 10, [40, 40, 50]); r(SCR.x0 - 3, SCR.y0 - 3, w + 6, SCR.y1 - SCR.y0 + 6, [70, 70, 84]);
  r(SCR.x0, SCR.y0, w, SCR.y1 - SCR.y0, [10, 8, 22]);
  for (const x of [SCR.x0 + 60, SCR.x1 - 60]) r(x, 150, 2, SCR.y0 - 155, [60, 64, 76]); // hung from the truss
  lit(() => {
    if (!live || !k) {
      const t = 'KARAOKE'; txt(t, cx - tw(t, 3) / 2, SCR.y0 + 18, (a % 1.4) < 1 ? K.MAG : [120, 40, 100], 3);
      txt('PICK A SONG AT THE MACHINE', cx - tw('PICK A SONG AT THE MACHINE') / 2, SCR.y0 + 46, [200, 190, 230]);
      const res = STAGE_INFO.result;
      if (res && Date.now() / 1000 - res.at < 300) { const l = 'LAST SONG: ' + SONGS[res.song].name + ' · BAND ' + res.band + ' ' + grade(res.band); txt(l, cx - tw(l) / 2, SCR.y0 + 66, K.GOLD); if (res.top) txt('STAR: ' + res.top, cx - tw('STAR: ' + res.top) / 2, SCR.y0 + 76, [124, 242, 156]); }
      return;
    }
    const g = SONGS[k.song], t = kTime(k), wh = kWhere(k);
    txt(g.name, SCR.x0 + 6, SCR.y0 + 5, [200, 190, 230]); txt(g.style, SCR.x1 - 6 - tw(g.style), SCR.y0 + 5, [120, 110, 160]);
    const u = clamp(t / songLen(g), 0, 1); r(SCR.x0 + 6, SCR.y0 + 13, w - 12, 2, [40, 30, 60]); r(SCR.x0 + 6, SCR.y0 + 13, Math.round((w - 12) * u), 2, K.MAG);
    if (t < 0) { const n = String(Math.ceil(-t)); txt(n, cx - tw(n, 5) / 2, SCR.y0 + 30, K.GOLD, 5); txt('GET READY', cx - tw('GET READY', 2) / 2, SCR.y0 + 64, [200, 190, 230], 2); }
    else if (wh.done) { const b = bandTotal(); const l = 'BAND ' + b + '  ' + grade(b); txt(l, cx - tw(l, 3) / 2, SCR.y0 + 34, K.GOLD, 3); }
    else {
      const li = Math.max(0, Math.min(g.lines.length - 1, wh.line)), cur = lineWords(k.song, li), nxt = wh.line + 1 < g.lines.length ? lineWords(k.song, Math.max(0, wh.line + 1)) : null;
      if (wh.line < 0) { const l = 'HERE WE GO...'; txt(l, cx - tw(l, 2) / 2, SCR.y0 + 30, [200, 190, 230], 2); }
      else if (wh.line < g.lines.length) sungLine(cur.notes, cx, SCR.y0 + 28, wh.step, 2);
      if (nxt && wh.line < g.lines.length) { const l = nxt.text; txt(l, cx - tw(l) / 2, SCR.y0 + 52, [110, 100, 150]); }
    }
    // the band score and the HYPE bar along the bottom
    const bs = 'BAND ' + bandTotal(); txt(bs, SCR.x0 + 6, SCR.y1 - 12, [124, 242, 156]);
    txt('HYPE', SCR.x1 - 104, SCR.y1 - 12, K.MAG); r(SCR.x1 - 84, SCR.y1 - 12, 78, 5, [40, 20, 50]); r(SCR.x1 - 84, SCR.y1 - 12, Math.round(78 * STAGE_INFO.hype), 5, STAGE_INFO.hype > 0.6 && (a % 0.3) < 0.15 ? K.GOLD : K.MAG);
  });
  G(SCR.x0, SCR.y0, w, SCR.y1 - SCR.y0, [160, 90, 255], 0.07);
}
/** A lyric line, each syllable turning gold as it's sung. */
export function sungLine(notes: { s: number; syl: string }[], cx: number, y: number, step: number, sc: number): void {
  const pieces = notes.map((n) => ({ t: (n.syl.endsWith('~') ? n.syl.slice(0, -1) : n.syl + ' ').toUpperCase(), s: n.s }));
  const full = pieces.map((p) => p.t).join('').trim(); let x = Math.round(cx - tw(full, sc) / 2);
  for (const p of pieces) { const on = step >= p.s - 0.2, now = on && step < p.s + 2; txt(p.t, x, y - (now ? 1 : 0), now ? K.WHITE : on ? K.GOLD : [150, 140, 190], sc); x += p.t.length * 4 * sc; }
}
function karaokeFx(a: number): void {
  const k = STAGE_INFO.karaoke, live = kLive(k) && k && kTime(k) > 0 && !kWhere(k).done;
  if (live && k && STAGE_INFO.hype > 0.5) { // flames up either side of the stage, on the beat
    const g = SONGS[k.song], beat = kTime(k) / (stepS(g) * 2), f = beat % 2, on = f < 0.5, hgt = Math.round((1 - f * 2) * 60 * STAGE_INFO.hype);
    if (on) for (const x of [DECK.x0 + 12, DECK.x1 - 12]) { lit(() => { for (let j = 0; j < hgt; j++) { const wd = Math.max(1, Math.round(6 - j / 12 + Math.sin(a * 30 + j) * 1.5)); r(x - wd, DECK.top - j, wd * 2, 1, j < hgt * 0.3 ? [255, 240, 160] : j < hgt * 0.7 ? [255, 160, 60] : [230, 70, 50]); } }); Gd(x, DECK.top - hgt / 2, 30, [255, 140, 60], 0.4); }
  }
  const res = STAGE_INFO.result, u = res ? Date.now() / 1000 - res.at : 99;
  if (res && res.band >= 80 && u < 5) lit(() => { for (let i = 0; i < 70; i++) { const x = 220 + h1(i * 3.1) * 660 + Math.sin(u * 3 + i) * 10, y = 130 + ((u * (60 + h1(i) * 60) + h1(i * 7) * 200) % 360); r(Math.round(x), Math.round(y), 2, 2, CONFETTI[i % CONFETTI.length]); } });
}

// ---------- props ----------
const machine: Prop = {
  y: 494,
  draw(a: number) {
    const x = 850, y = 494, live = kLive(STAGE_INFO.karaoke);
    r(x - 16, y - 34, 32, 34, [40, 30, 60]); r(x - 16, y - 34, 32, 2, [80, 60, 120]); r(x + 12, y - 32, 4, 32, [30, 22, 46]);
    r(x - 12, y - 30, 22, 12, [10, 8, 22]); lit(() => { for (let k = 0; k < 4; k++) r(x - 10 + k * 5, y - 22 - Math.round(Math.abs(Math.sin(a * (live ? 8 : 2) + k)) * (live ? 6 : 2)), 3, 2 + Math.round(Math.abs(Math.sin(a * (live ? 8 : 2) + k)) * (live ? 6 : 2)), CONFETTI[k]); });
    for (const dx of [-8, 0, 8]) disc(x + dx, y - 10, 2, [80, 70, 100]);
    lit(() => txt('SING', x - tw('SING') / 2, y - 44, (a % 1) < 0.6 ? K.MAG : [140, 50, 120])); G(x - 12, y - 46, 24, 8, K.MAG, 0.2);
  },
};
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
  { kind: 'karaoke', x: 850, y: 506, sx: 850, sy: 506, lift: 0, label: 'KARAOKE', area: { x0: 830, y0: 450, x1: 870, y1: 494 } }, // 6
];

export function makeStage(): Room {
  const room: Room = {
    id: 'stage', title: 'THE STAGE', sub: 'LIVE MUSIC',
    w: W, h: H,
    floor: { x0: 14, y0: 476, x1: W - 14, y1: 640 },
    blockers: [{ x0: 80, y0: 538, x1: 140, y1: 548 }, { x0: 918, y0: 492, x1: 982, y1: 502 }, { x0: 130, y0: 470, x1: 170, y1: 474 }, { x0: 900, y0: 470, x1: 940, y1: 474 }, { x0: 834, y0: 486, x1: 866, y1: 496 }],
    doors: [{ trigger: { x0: 10, y0: 476, x1: 46, y1: 484 }, to: 'plaza', arrive: { x: 593, y: 590 }, label: 'OUTSIDE', area: { x0: 4, y0: 342, x1: 52, y1: 470 } }],
    spots: STAGE_SPOTS, inUse: new Map(),
    music: { x: 110, tracks: BEATS, current: () => ({ n: STAGE_INFO.beat, t0: STAGE_INFO.beatT0 }) },
    onState(s: StateMsg) {
      if (s.k === 'juke') { STAGE_INFO.beat = s.v.n; STAGE_INFO.beatT0 = s.v.t0; }
      else if (s.k === 'karaoke') { if (s.v.t0 !== STAGE_INFO.karaoke?.t0) { STAGE_INFO.scores.clear(); STAGE_INFO.hype = 0; } STAGE_INFO.karaoke = s.v; }
    },
    spawn: { x: 60, y: 500 },
    dim: 0.3,
    fillTop: 'rgb(16,12,24)', fillLow: 'rgb(30,22,34)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [djBooth, bar, machine],
  };
  return room;
}

