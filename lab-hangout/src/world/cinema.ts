// THE CINEMA — a new set in the film's style, through the red doors on the Square.
// Left: the lobby (concession stand with a popcorn machine, soda fountain and candy case, a
// menu board, posters, a photo booth). Right: the theatre (curtained silver screen, three rows
// of velvet seats, a projector beam). The film on the screen loops every 80 s on the WALL
// clock, so everyone watches the same frame at the same moment.

import { K, CK, type RGB } from '../engine/palette';
import { PX, mk, r, line, disc, oval, ring, txt, tw, alpha, lit, G, Gd, Gline, withCtx, M, shade, puff } from '../engine/pixel';
import { h1, seg, bump } from '../engine/math';
import { basePose, composeCritter } from '../entities/critter';
import type { Room, Prop, Spot } from './room';

const W = 1100, H = 720, LF = 440;
const SCR = { x: 520, y: 170, w: 480, h: 220 };
const DOOR = { x: 8, y: 336, w: 40, h: 104 };
const ROWS = [488, 534, 580], SEAT_X = [640, 688, 736, 784, 832, 880];
export const FILM_LEN = 80;
/** The schedule: the films take turns, an hour each (wall clock, so it's the same for everyone). */
export const FILMS = [{ title: 'A CRITTER IN SPACE', t1: 'A CRITTER', t2: 'IN SPACE' }, { title: 'DRAGON NIGHT', t1: 'DRAGON', t2: 'NIGHT' }];
export const currentFilm = (): number => Math.floor(Date.now() / 1000 / 3600) % FILMS.length;

/** Where the film is right now: seconds into the loop, and when this loop started (wall clock). */
export function filmClock(): { t: number; start: number } {
  const now = Date.now() / 1000, t = now % FILM_LEN;
  return { t, start: now - t };
}
/** 0 = house lights up (between shows), 1 = lights down for the film. */
const showK = (t: number) => seg(t, 4, 6) * (1 - seg(t, 75, 77));
export const filmPlaying = (): boolean => { const t = filmClock().t; return t > 5 && t < 76; };

// ---------- the set ----------
function build(this: Room): void {
  withCtx(this.bg.getContext('2d')!, () => {
    PX.dim = 0; PX.fl = 0; PX.emit = false;
    // ceiling with a starry plaster finish and a gold cornice
    r(0, 0, W, 150, CK.CEIL);
    for (let i = 0; i < 120; i++) r(Math.floor(h1(i * 4.1) * W), Math.floor(h1(i * 2.3) * 130), 1, 1, [70, 50, 70]);
    r(0, 140, W, 6, CK.GOLD_DK); r(0, 140, W, 1, CK.GOLD_HI); r(0, 146, W, 4, [40, 16, 24]);
    // lobby wallpaper: red with a gold diamond repeat
    r(0, 150, 400, 290, CK.WALL);
    for (let y = 158; y < 392; y += 16) for (let x = ((y - 158) / 16) % 2 ? 8 : 0; x < 400; x += 16) { r(x + 3, y, 1, 1, CK.PAT); r(x + 2, y + 1, 3, 1, CK.PAT); r(x + 3, y + 2, 1, 1, CK.PAT); }
    // theatre wall: dark acoustic panels
    r(400, 150, W - 400, 290, CK.PANEL); for (let x = 404; x < W; x += 40) { r(x, 156, 36, 236, CK.PANEL2); r(x, 156, 36, 1, [70, 40, 64]); }
    // wainscot + rail everywhere
    r(0, 392, W, 48, CK.WALL_DK); r(0, 390, W, 3, CK.GOLD_DK); r(0, 390, W, 1, CK.GOLD_HI); r(0, 436, W, 4, [30, 10, 16]);
    for (let x = 12; x < W; x += 30) r(x, 396, 1, 38, [52, 14, 24]);
    // the pillar between lobby and theatre
    r(396, 150, 14, 290, CK.GOLD_DK); r(398, 150, 10, 290, [70, 26, 36]); r(398, 150, 2, 290, CK.WALL_HI);
    // floor: patterned lobby carpet, dark theatre carpet
    r(0, LF, 404, H - LF, CK.CARPET);
    for (let y = LF, j = 0; y < H; y += 12, j++) for (let x = (j % 2) * 12; x < 404; x += 24) { r(x, y, 12, 12, CK.CARPET2); r(x + 5, y + 5, 2, 2, CK.CARPET_DOT); }
    r(404, LF, W - 404, H - LF, CK.FLOOR); for (let y = LF; y < H; y += 8) r(404, y, W - 404, 1, CK.FLOOR2);
    alpha(0.4, () => r(0, LF, W, 4, [10, 4, 8]));

    // screen: frame, silver screen (the film is drawn in drawBack), stage lip
    r(SCR.x - 6, SCR.y - 6, SCR.w + 12, SCR.h + 12, CK.FRAME); r(SCR.x, SCR.y, SCR.w, SCR.h, CK.SCREEN);
    r(478, 396, 564, 44, [50, 26, 30]); r(478, 396, 564, 2, [90, 50, 50]); r(478, 434, 564, 6, [30, 14, 18]);
    // curtains, gathered at the sides, with a scalloped valance
    for (const [x0, x1] of [[468, 526], [994, 1052]] as [number, number][]) {
      for (let x = x0; x < x1; x += 6) { const k = ((x - x0) / 6) % 3; r(x, 150, 6, 246, k === 0 ? CK.CURTAIN_HI : k === 1 ? CK.CURTAIN : CK.CURTAIN_DK); }
      r(x0, 318, x1 - x0, 6, CK.GOLD_DK); r(x0 + (x1 - x0) / 2 - 2, 324, 4, 14, CK.GOLD); r(x0 + (x1 - x0) / 2 - 3, 336, 6, 4, CK.GOLD_HI);
    }
    r(466, 146, 588, 18, CK.CURTAIN_DK); for (let x = 466; x < 1054; x += 14) { r(x, 164, 14, 4, CK.CURTAIN); r(x + 2, 168, 10, 2, CK.CURTAIN); r(x + 5, 170, 4, 1, CK.CURTAIN); }
    r(466, 146, 588, 2, CK.GOLD); r(466, 162, 588, 1, CK.GOLD_DK);
    // projection booth window, high on the right wall
    r(1066, 170, 22, 14, [20, 12, 20]); r(1068, 172, 18, 10, [60, 60, 80]);

    // EXIT door back to the Square
    const D = DOOR; r(D.x - 3, D.y - 3, D.w + 6, D.h + 3, [40, 20, 26]); r(D.x, D.y, D.w, D.h, [90, 40, 48]); r(D.x, D.y, D.w, 2, [120, 60, 66]); r(D.x + D.w - 2, D.y, 2, D.h, [60, 26, 32]);
    r(D.x + 8, D.y + 14, 24, 20, [20, 20, 40]); r(D.x + 31, D.y + 56, 3, 6, CK.GOLD_HI); r(D.x + 4, D.y - 16, 32, 10, [20, 40, 28]);

    // posters above the counter
    const poster = (x: number, title: string, bgc: RGB, art: () => void) => { r(x - 2, 156, 52, 70, CK.GOLD_DK); r(x, 158, 48, 66, bgc); art(); r(x, 212, 48, 12, [16, 10, 16]); txt(title, x + 24 - tw(title) / 2, 216, CK.GOLD_HI); };
    poster(84, 'SPACE', [16, 20, 60], () => { for (let i = 0; i < 10; i++) r(86 + Math.floor(h1(i + 80) * 44), 160 + Math.floor(h1(i + 81) * 48), 1, 1, K.WHITE); r(104, 180, 14, 6, [236, 236, 240]); r(118, 181, 3, 4, K.RED); r(100, 182, 4, 2, K.GOLD); disc(111, 183, 2, [34, 197, 160]); });
    poster(146, 'DRAGON', [36, 20, 64], () => { disc(180, 176, 7, [236, 236, 214]); r(152, 190, 26, 6, [52, 195, 143]); r(174, 186, 6, 4, [52, 195, 143]); r(160, 184, 8, 6, [38, 160, 118]); r(156, 196, 2, 4, [52, 195, 143]); r(170, 196, 2, 4, [52, 195, 143]); });
    poster(208, 'INVADE', [10, 12, 30], () => { const B = ['.###.', '#.#.#', '#####', '#.#.#']; for (let k = 0; k < 3; k++) B.forEach((row, j) => { for (let i = 0; i < 5; i++) if (row[i] === '#') r(214 + k * 13 + i * 2, 172 + j * 2 + (k % 2) * 6, 2, 2, [K.MAG, K.GOLD, K.CYAN][k]); }); r(229, 200, 6, 3, [34, 197, 160]); });
    // menu board
    r(92, 234, 188, 60, CK.GOLD_DK); r(94, 236, 184, 56, CK.BOARD);
    // concession counter
    r(70, 376, 234, 6, CK.COUNTER_TOP); r(70, 376, 234, 1, [255, 248, 230]); r(72, 382, 230, 58, CK.COUNTER); r(72, 382, 230, 2, CK.GOLD_DK);
    for (let x = 80; x < 300; x += 28) { r(x, 390, 24, 42, [50, 30, 40]); r(x + 1, 391, 22, 1, [80, 50, 60]); }
    // popcorn machine: red cart top, glass box, kettle, a heap of popcorn
    r(84, 316, 48, 12, [180, 30, 40]); r(84, 316, 48, 2, [230, 70, 70]); r(86, 328, 44, 46, [40, 30, 34]); r(88, 330, 40, 42, CK.GLASS);
    alpha(0.55, () => r(88, 330, 40, 42, [255, 230, 170]));
    r(100, 332, 16, 8, CK.CHROME); r(100, 332, 16, 1, K.WHITE); r(106, 340, 4, 3, CK.CHROME_DK);
    for (let i = 0; i < 70; i++) { const x = 89 + Math.floor(h1(i * 1.9) * 38), y = 372 - Math.floor(h1(i * 3.3) * (10 - Math.abs(x - 108) / 4)); r(x, y, 2, 2, i % 3 ? K.POPCORN : K.POPCORN_HI); }
    r(84, 374, 48, 2, [180, 30, 40]);
    // soda fountain + a stack of cups
    r(150, 336, 42, 40, CK.CHROME_DK); r(152, 338, 38, 36, CK.CHROME); r(152, 338, 38, 2, K.WHITE);
    ([[155, K.RED], [167, K.SODA], [179, [52, 195, 143]]] as [number, RGB][]).forEach(([x, c]) => { r(x, 342, 9, 10, c); r(x + 3, 352, 3, 5, CK.CHROME_DK); });
    r(152, 368, 38, 4, [40, 44, 52]); for (let x = 154; x < 190; x += 3) r(x, 369, 1, 2, [70, 76, 90]);
    for (let k = 0; k < 5; k++) { r(196, 372 - k * 5, 8, 5, K.WHITE); r(196, 372 - k * 5, 8, 1, [220, 220, 226]); }
    // candy case
    r(212, 344, 82, 32, [40, 30, 34]); r(214, 346, 78, 28, CK.GLASS); alpha(0.4, () => r(214, 346, 78, 28, [255, 255, 255]));
    for (let j = 0; j < 2; j++) for (let i = 0; i < 9; i++) { const c = ([K.RED, K.GOLD, K.MAG, K.CYAN, [52, 195, 143], [123, 97, 255]] as RGB[])[Math.floor(h1(i * 3 + j * 7) * 6)]; r(216 + i * 8, 350 + j * 12, 6, 9, c); r(216 + i * 8, 350 + j * 12, 6, 1, M(c, [255, 255, 255], 0.4)); }
    // photo booth: purple box, curtain on the left, the camera on the back wall
    r(316, 318, 64, 122, [30, 20, 40]); r(318, 320, 60, 118, CK.BOOTH); r(318, 320, 60, 3, CK.BOOTH_HI);
    r(318, 312, 60, 10, [20, 14, 30]); r(344, 346, 24, 70, [20, 14, 28]); r(352, 356, 8, 6, [60, 60, 80]); disc(356, 359, 2, [120, 200, 240]);
    for (let x = 320; x < 342; x += 4) { r(x, 326, 4, 108, ((x - 320) / 4) % 2 ? CK.CURTAIN : CK.CURTAIN_HI); }
    r(368, 376, 8, 24, [20, 14, 28]); r(369, 377, 6, 22, K.WHITE); for (let k = 0; k < 3; k++) r(370, 378 + k * 7, 4, 5, [120, 110, 150]);
  });
}

// ---------- the film ----------
const S = (x: number, y: number, w: number, h: number, c: RGB) => r(SCR.x + x, SCR.y + y, w, h, c);
const ST = (s: string, y: number, c: RGB, sc: number) => txt(s, SCR.x + Math.round(SCR.w / 2 - tw(s, sc) / 2), SCR.y + y, c, sc);
const FILM_LOOK = { c: 0, hat: 0, face: 2, fit: 0, sp: 0 };

function rocket(x: number, y: number, a: number, flame: boolean): void {
  x = Math.round(x); y = Math.round(y);
  if (flame) { const f = Math.floor(a * 20) % 3; S(x - 27 - f, y - 3, 7 + f, 6, [255, 140, 60]); S(x - 25 - f, y - 2, 5 + f, 4, [255, 230, 120]); }
  S(x - 20, y - 11, 8, 5, K.RED); S(x - 20, y + 6, 8, 5, K.RED);
  S(x - 20, y - 6, 30, 12, [236, 236, 240]); S(x - 20, y - 6, 30, 1, K.WHITE); S(x - 20, y + 5, 30, 1, [180, 180, 196]);
  S(x + 10, y - 5, 4, 10, K.RED); S(x + 14, y - 4, 3, 8, K.RED); S(x + 17, y - 2, 3, 4, K.RED);
  disc(SCR.x + x, SCR.y + y, 5, [60, 70, 100]); disc(SCR.x + x, SCR.y + y + 1, 4, [34, 197, 160]); S(x - 2, y - 1, 1, 2, K.EYE); S(x + 1, y - 1, 1, 2, K.EYE);
}
function stars(n: number, t: number, speed: number): void {
  for (let k = 0; k < n; k++) { const layer = k % 3, v = [6, 16, 40][layer] * speed, x = (((h1(k) * 600 - t * v) % 480) + 480) % 480, y = Math.floor(h1(k + 0.5) * 220); S(Math.floor(x), y, layer === 2 && speed > 0 ? 3 : 1, 1, layer === 0 ? [90, 100, 150] : layer === 1 ? [170, 180, 230] : K.WHITE); }
}
function critter(x: number, y: number, a: number, hop: number, wave: boolean): void {
  const P = basePose(1); P.sy = 1 + 0.03 * Math.sin(a * 3); if (hop > 0) { P.sy = 1.06; P.arm = 'up'; P.eyes = 'w'; } if (wave) { P.arm = 'wave'; P.wave = Math.sin(a * 14); P.eyes = 'h'; }
  const c = composeCritter(FILM_LOOK, P, 0);
  PX.ctx.drawImage(c.cv, Math.round(SCR.x + x - c.ox), Math.round(SCR.y + y - hop - c.oy));
}
/** The colour the screen throws into the room at film time t. */
function screenLight(t: number): RGB {
  if (currentFilm() === 1 && t >= 10 && t < 70) return t < 54 ? [70, 90, 170] : [150, 150, 200];
  if (t < 5) return [190, 190, 190]; if (t < 10) return [130, 120, 150]; if (t < 40) return [90, 110, 230];
  if (t < 60) return [200, 200, 215]; if (t < 70) return [160, 90, 210]; if (t < 76) return [150, 150, 160]; return [0, 0, 0];
}

/** A pixel dragon, facing right. flap: 0 wings down, 1 up. eye: 0 asleep, 1 open. */
function dragon(x: number, y: number, flap: number, eye: number, a: number): void {
  const G1: RGB = [52, 195, 143], G2: RGB = [38, 160, 118], BEL: RGB = [255, 190, 110];
  x = Math.round(x); y = Math.round(y);
  S(x - 30, y + 2, 14, 4, G2); S(x - 36, y, 8, 3, G2); S(x - 40, y - 3, 5, 4, G1); // tail
  S(x - 18, y - 6, 34, 14, G1); S(x - 16, y + 4, 30, 4, BEL); S(x - 18, y - 6, 34, 2, [90, 226, 176]);
  S(x + 12, y - 16, 14, 12, G1); S(x + 24, y - 10, 8, 6, G1); S(x + 14, y - 20, 3, 5, BEL); S(x + 20, y - 20, 3, 5, BEL); // head, snout, horns
  if (eye) { S(x + 19, y - 13, 3, 3, K.GOLD); S(x + 20, y - 12, 1, 2, K.EYE); } else S(x + 18, y - 11, 4, 1, K.EYE);
  S(x + 29, y - 8, 1, 1, K.EYE);
  if (flap) { S(x - 8, y - 22, 16, 14, G2); S(x - 12, y - 26, 8, 6, G2); } else { S(x - 8, y + 6, 18, 10, G2); S(x - 12, y + 12, 8, 6, G2); }
  S(x - 12, y + 8, 4, 6, G2); S(x + 6, y + 8, 4, 6, G2); // legs
  void a;
}
function skyline(t: number, drift: number): void {
  S(0, 0, SCR.w, SCR.h, [10, 12, 40]); stars(40, t, drift);
  disc(SCR.x + 380, SCR.y + 50, 20, [236, 236, 214]);
  for (let x = 0; x < SCR.w; x += 30) { const hgt = 30 + Math.floor(h1(x * 0.37 + 3) * 60), xx = ((x - t * drift * 30) % (SCR.w + 30) + SCR.w + 30) % (SCR.w + 30) - 30; S(xx, SCR.h - hgt, 28, hgt, [24, 22, 60]); for (let y = SCR.h - hgt + 6; y < SCR.h - 6; y += 9) if (h1(x + y) > 0.6) S(xx + 6 + (y % 2) * 10, y, 3, 3, [255, 210, 120]); }
}
function mug(x: number, y: number, a: number): void { S(Math.round(x), Math.round(y), 5, 5, [232, 106, 146]); S(Math.round(x) + 5, Math.round(y) + 1, 2, 3, [232, 106, 146]); for (let k = 0; k < 2; k++) { const ph = (a * 0.8 + k * 0.5) % 1; alpha(0.6 * (1 - ph), () => S(Math.round(x) + 2, Math.round(y) - 2 - Math.round(ph * 8), 1, 2, K.WHITE)); } }
/** Film 2, 10 s to 70 s: a sleeping dragon, a critter with a coffee, a chase, and a surprise. */
function dragonNight(t: number, a: number): void {
  if (t < 34) { // the Square at night: the dragon sleeps on its plinth; a critter wanders by with a coffee
    skyline(t, 0); S(280, 186, 170, 34, [70, 74, 92]); S(280, 186, 170, 2, [128, 134, 160]);
    const awake = t > 28, cx = Math.min(150, -20 + (t - 10) * 14);
    dragon(360, 168, 0, awake ? 1 : 0, a);
    if (!awake) for (let k = 0; k < 3; k++) { const ph = (a * 0.5 + k / 3) % 1; alpha(1 - ph, () => txt('Z', SCR.x + 395 + Math.round(ph * 12), SCR.y + 140 - Math.round(ph * 30), [200, 220, 255], k === 0 ? 2 : 1)); }
    const jump = awake && t < 30 ? Math.sin((t - 28) * Math.PI / 2) * 18 : 0;
    critter(cx, 214, a, jump, false); mug(cx + 12, 196 - jump, a);
    if (awake) txt('!', SCR.x + cx - 3, SCR.y + 150 - jump, K.GOLD, 3);
  } else if (t < 46) { // the chase over the rooftops
    skyline(t, 2.5);
    const u = (t - 34) / 12, cx = 80 + u * 300, hop = Math.abs(Math.sin(a * 9)) * 6;
    critter(cx, 214, a, hop, false); mug(cx + 12, 196 - hop, a);
    dragon(cx - 120 + Math.sin(a * 2) * 10, 120 + Math.sin(a * 3) * 10, Math.floor(a * 6) % 2, 1, a);
  } else if (t < 54) { // the twist: it only wanted the coffee
    skyline(t, 0);
    const u = t - 46;
    critter(260, 214, a, 0, u > 1.5);
    if (u < 3) mug(272, 196, a); else mug(318, 170, a);
    dragon(340, 180 - Math.max(0, 3 - u) * 20, u < 3 ? Math.floor(a * 6) % 2 : 0, 1, a);
    if (u > 1 && u < 3) txt('?', SCR.x + 352, SCR.y + 136, K.WHITE, 3);
    if (u > 3.5) { const q = (u - 3.5) % 1.5; alpha(1 - q / 1.5, () => { S(300, 140 - q * 20, 3, 2, K.MAG); S(304, 140 - q * 20, 3, 2, K.MAG); S(300, 142 - q * 20, 7, 2, K.MAG); S(302, 144 - q * 20, 3, 2, K.MAG); }); }
  } else if (t < 66) { // friends on a rooftop under a big moon
    S(0, 0, SCR.w, SCR.h, [14, 14, 44]); stars(60, t, 0);
    disc(SCR.x + 240, SCR.y + 100, 70, [236, 236, 214]); disc(SCR.x + 240, SCR.y + 100, 60, [244, 244, 226]);
    S(0, 190, SCR.w, 30, [20, 18, 40]); S(0, 190, SCR.w, 2, [40, 36, 70]);
    dragon(270, 172, 0, 1, a); critter(200, 192, a, 0, t > 62); mug(290, 150, a);
    for (let k = 0; k < 3; k++) { const q = (a * 0.4 + k / 3) % 1; alpha(1 - q, () => { const hx = 220 + k * 30; S(hx, 120 - q * 40, 2, 1, K.MAG); S(hx + 3, 120 - q * 40, 2, 1, K.MAG); S(hx, 121 - q * 40, 5, 1, K.MAG); S(hx + 1, 122 - q * 40, 3, 1, K.MAG); S(hx + 2, 123 - q * 40, 1, 1, K.MAG); }); }
  } else { // fireworks
    skyline(t, 0);
    for (let k = 0; k < 3; k++) { const u = (t - 66 - k * 0.8) % 2.4; if (u > 0 && u < 1.4) { const fx = 100 + k * 140, fy = 60 + (k % 2) * 20, col = [K.MAG, K.GOLD, K.CYAN][k]; alpha(1 - seg(u, 0.8, 1.4), () => { for (let s = 0; s < 12; s++) { const an = (s / 12) * 6.283, d = u * 36; S(Math.round(fx + Math.cos(an) * d), Math.round(fy + Math.sin(an) * d + u * u * 8), 2, 2, col); } }); } }
    dragon(360, 180, Math.floor(a * 3) % 2, 1, a); critter(250, 214, a, Math.abs(Math.sin(a * 5)) * 8, false);
  }
}

function drawFilm(t: number, a: number): void {
  const g = PX.ctx;
  g.save(); g.beginPath(); g.rect(SCR.x, SCR.y, SCR.w, SCR.h); g.clip();
  lit(() => {
    const cx = SCR.w / 2, cy = SCR.h / 2;
    if (t < 5) { // film leader: 5, 4, 3, 2, 1
      S(0, 0, SCR.w, SCR.h, [150, 150, 150]);
      const f = t % 1; for (let k = 0; k < 40; k++) { const an = -Math.PI / 2 + (k / 40) * f * Math.PI * 2; line(SCR.x + cx, SCR.y + cy, SCR.x + cx + Math.cos(an) * 90, SCR.y + cy + Math.sin(an) * 90, [120, 120, 120], 2); }
      ring(SCR.x + cx, SCR.y + cy, 80, 80, [60, 60, 60]); ring(SCR.x + cx, SCR.y + cy, 66, 66, [60, 60, 60]); S(0, cy, SCR.w, 1, [60, 60, 60]); S(cx, 0, 1, SCR.h, [60, 60, 60]);
      ST(String(5 - Math.floor(t)), cy - 25, [30, 30, 30], 10);
    } else if (t < 10) { // titles
      S(0, 0, SCR.w, SCR.h, [4, 4, 10]);
      if (t < 7.5) alpha(seg(t, 5, 6) * (1 - seg(t, 7, 7.5)), () => { ST('THE LAB', 80, K.WHITE, 4); ST('PRESENTS', 110, [180, 180, 200], 2); });
      else { stars(50, t, 0.3); alpha(seg(t, 7.5, 8.3), () => { ST(FILMS[currentFilm()].t1, 60, K.GOLD, 5); ST(FILMS[currentFilm()].t2, 100, K.GOLD, 5); ST('A LAB HANGOUT PICTURE', 150, [180, 180, 200], 1); }); }
    } else if (currentFilm() === 1 && t < 70) { dragonNight(t, a);
    } else if (t < 40) { // space
      S(0, 0, SCR.w, SCR.h, [6, 8, 24]); stars(70, t, 1);
      const px = 420 - (t - 10) * 6; disc(SCR.x + px, SCR.y + 60, 26, [150, 110, 220]); S(px - 26, 56, 52, 4, [180, 140, 240]); ring(SCR.x + px, SCR.y + 60, 42, 8, [230, 200, 130]);
      for (let k = 0; k < 4; k++) { const ax = 500 - (t - 22 - k * 2.6) * 70, ay = 50 + h1(k + 7) * 130; if (ax > -30 && ax < 520) { disc(SCR.x + ax, SCR.y + ay, 9 + k % 2 * 4, [110, 100, 96]); disc(SCR.x + ax - 2, SCR.y + ay - 2, 2, [80, 72, 70]); } }
      const dodge = bump(t, 29, 2.6) * 42, rx = 140 + Math.sin(a * 0.7) * 20, ry = 110 + Math.sin(a * 1.3) * 8 - dodge;
      rocket(rx, ry, a, true);
      if (t > 29 && t < 31) txt('!', SCR.x + rx - 2, SCR.y + ry - 30, K.GOLD, 3);
    } else if (t < 60) { // the moon
      S(0, 0, SCR.w, SCR.h, [4, 4, 12]); stars(50, t, 0);
      disc(SCR.x + 400, SCR.y + 44, 18, [60, 120, 230]); disc(SCR.x + 396, SCR.y + 40, 6, [60, 180, 110]); disc(SCR.x + 406, SCR.y + 50, 4, [60, 180, 110]);
      S(0, 170, SCR.w, 50, [150, 150, 162]); S(0, 170, SCR.w, 2, [200, 200, 214]);
      for (let k = 0; k < 6; k++) oval(SCR.x + 30 + k * 80, SCR.y + 190 + (k % 2) * 12, 14 - k % 3 * 3, 3, [120, 120, 134]);
      const land = seg(t, 40, 46), rx = 180, ry = 40 + land * 122;
      rocket(rx, ry, a, t < 46);
      if (t > 46 && t < 48) { puff(SCR.x + rx - 14, SCR.y + 170, t - 46, 1.5, 7, [200, 200, 210], 0.8); puff(SCR.x + rx + 14, SCR.y + 170, t - 46.1, 1.5, 7, [200, 200, 210], 0.8); }
      if (t > 47) {
        const walk = Math.min(t, 54) - 47, x = 205 + walk * 12, hop = t < 54 ? Math.sin(((walk % 1.6) / 1.6) * Math.PI) * 26 : 0;
        if (t > 54) { S(312, 128, 1, 42, [220, 220, 230]); S(313, 128, 14, 9, K.MAG); S(318, 130, 2, 1, K.WHITE); S(321, 130, 2, 1, K.WHITE); S(317, 131, 7, 2, K.WHITE); S(318, 133, 5, 1, K.WHITE); S(319, 134, 3, 1, K.WHITE); }
        critter(x, 176, a, hop, t > 55);
      }
    } else if (t < 70) { // home: the city, the dragon, fireworks
      S(0, 0, SCR.w, SCR.h, [16, 14, 44]); stars(40, t, 0);
      disc(SCR.x + 360, SCR.y + 60, 22, [236, 236, 214]);
      for (let x = 0; x < SCR.w; x += 26) { const hgt = 40 + Math.floor(h1(x * 0.3) * 70); S(x, SCR.h - hgt, 24, hgt, [30, 26, 70]); for (let y = SCR.h - hgt + 6; y < SCR.h - 6; y += 9) if (h1(x + y) > 0.6) S(x + 5 + (y % 2) * 8, y, 3, 3, [255, 210, 120]); }
      const dx = 520 - (t - 60) * 90, flap = Math.floor(a * 6) % 2;
      if (dx > -60) { S(dx, 56, 34, 8, [52, 195, 143]); S(dx - 8, 52, 10, 8, [52, 195, 143]); S(dx - 10, 55, 3, 2, [255, 214, 90]); S(dx + 34, 58, 12, 3, [38, 160, 118]); S(dx + 10, flap ? 42 : 62, 14, flap ? 14 : 10, [38, 160, 118]); }
      if (t > 63) rocket(-40 + (t - 63) * 80, 150 - (t - 63) * 10, a, true);
      if (t > 66) for (let k = 0; k < 3; k++) { const u = (t - 66 - k * 0.9) % 2.7; if (u > 0 && u < 1.4) { const fx = 100 + k * 140, fy = 60 + k % 2 * 20, col = [K.MAG, K.GOLD, K.CYAN][k]; alpha(1 - seg(u, 0.8, 1.4), () => { for (let s = 0; s < 12; s++) { const an = (s / 12) * 6.283, d = u * 36; S(Math.round(fx + Math.cos(an) * d), Math.round(fy + Math.sin(an) * d + u * u * 8), 2, 2, col); } }); } }
    } else if (t < 76) { // the end
      S(0, 0, SCR.w, SCR.h, [4, 4, 10]); stars(40, t, 0);
      alpha(seg(t, 70, 71.2), () => { ST('THE END', 70, K.WHITE, 5); const hx = SCR.w / 2 - 7; ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'].forEach((row2, j) => { for (let i = 0; i < 7; i++) if (row2[i] === '#') S(hx + i * 2, 130 + j * 2, 2, 2, K.MAG); }); });
    } else {
      S(0, 0, SCR.w, SCR.h, [8, 8, 12]);
      ST('NEXT SHOWING IN ' + Math.ceil(FILM_LEN - t), 100, [110, 110, 120], 2);
      ST('PLEASE SILENCE YOUR PHONES', 130, [80, 80, 90], 1);
    }
    // film grain + scratches
    if (t > 5 && t < 76) for (let k = 0; k < 6; k++) { const q = Math.floor(a * 24) * 7 + k; S(Math.floor(h1(q) * SCR.w), Math.floor(h1(q + 0.3) * SCR.h), 1, 1, [220, 220, 220]); }
    if (t > 5 && t < 76 && Math.floor(a * 24) % 37 === 0) S(Math.floor(h1(Math.floor(a)) * SCR.w), 0, 1, SCR.h, [200, 200, 200]);
  });
  g.restore();
}

// ---------- animated set pieces ----------
let cinemaRoom: Room | null = null;
const SCONCES: [number, number][] = [[70, 196], [300, 196], [440, 214], [1076, 214]];

function drawBack(a: number): void {
  const { t } = filmClock(), k = showK(t), used = cinemaRoom?.inUse;
  lit(() => { for (let i = 0; i < 40; i++) if ((a * 0.4 + h1(i + 300)) % 1 < 0.5) r(Math.floor(h1(i * 4.1) * W), Math.floor(h1(i * 2.3) * 130), 1, 1, [255, 230, 200]); });
  // wall sconces dim when the film starts
  for (const [x, y] of SCONCES) { r(x - 4, y + 6, 8, 3, CK.GOLD_DK); lit(() => { r(x - 3, y, 6, 6, M([255, 220, 160], [120, 80, 60], k * 0.6)); r(x - 2, y - 2, 4, 2, [255, 240, 210]); }); Gd(x, y + 2, 16, [255, 200, 140], 0.4 * (1 - 0.7 * k)); G(x - 10, y - 20, 20, 50, [255, 190, 130], 0.08 * (1 - 0.7 * k)); }
  // EXIT sign, menu board
  lit(() => txt('EXIT', DOOR.x + 12, DOOR.y - 14, [124, 242, 156])); G(DOOR.x + 4, DOOR.y - 16, 32, 10, [124, 242, 156], 0.35);
  lit(() => {
    txt('POPCORN', 104, 244, K.GOLD); txt('FREE', 236, 244, [124, 242, 156]);
    txt('SODA', 104, 258, K.GOLD); txt('FREE', 236, 258, [124, 242, 156]);
    txt('CANDY', 104, 272, K.GOLD); txt('LOOK ONLY', 206, 272, [255, 140, 140]);
    txt('* ENJOY THE SHOW *', 104, 284, (a % 1.5) < 1 ? [255, 236, 170] : [180, 140, 90]);
  });
  G(94, 236, 184, 56, [255, 214, 120], 0.08);
  // popcorn machine: sign, warm lamp, kernels popping (faster while someone scoops)
  const scooping = !!used?.has(18);
  lit(() => { txt('POPCORN', 108 - tw('POPCORN') / 2, 320, (a % 0.8) < 0.5 ? [255, 236, 120] : [255, 255, 255]); });
  G(86, 328, 44, 46, [255, 200, 120], 0.3); G(84, 314, 48, 14, [255, 90, 90], 0.2);
  lit(() => { for (let i = 0; i < (scooping ? 14 : 7); i++) { const ph = (a * (scooping ? 2.2 : 1.1) + h1(i)) % 1, x = 90 + Math.floor(h1(i * 3.7) * 36), y = 366 - Math.round(bump(ph, 0, 1) * (20 + h1(i + 1) * 14)); r(x, y, 2, 2, K.POPCORN_HI); } });
  // soda stream while someone fills a cup
  if (used?.has(19)) r(170, 357, 1, 11, K.SODA);
  // photo booth sign; flashes when someone's in it
  lit(() => { const on = Math.floor(a * 3) % 2; txt('PHOTO', 348 - tw('PHOTO') / 2, 314, on ? K.MAG : [255, 160, 230]); });
  G(318, 310, 60, 12, [255, 95, 210], 0.2);
  const bt0 = used?.get(20);
  if (bt0 !== undefined) {
    const u = performance.now() / 1000 - bt0;
    for (const s of [1.0, 2.3, 3.6]) if (u > s && u < s + 0.25) { lit(() => r(344, 346, 24, 70, [255, 255, 255])); G(300, 300, 120, 160, [255, 255, 255], 0.6 * (1 - (u - s) / 0.25)); }
    lit(() => r(356, 352, 2, 2, Math.floor(u * 4) % 2 ? K.RED : [80, 20, 20]));
  }
  // the film, its light on the room, and the projector beam
  drawFilm(t, a);
  const sl = screenLight(t);
  G(SCR.x, SCR.y, SCR.w, SCR.h, sl, 0.12 + 0.06 * Math.sin(a * 23) * k);
  G(460, 390, 620, 320, sl, 0.05 * k + 0.02);
  if (k > 0.05) {
    // the beam runs from the booth window to the screen's edge (never across the picture)
    const ex = SCR.x + SCR.w + 8, ey = SCR.y + 70;
    Gline(1076, 178, ex, ey, [220, 220, 255], 0.05 * k, 30); Gline(1076, 178, ex, ey, [240, 240, 255], 0.07 * k, 8);
    lit(() => { for (let i = 0; i < 10; i++) { const u = (h1(i) + a * 0.05 * (1 + h1(i + 2))) % 1, x = 1076 + (ex - 1076) * u + Math.sin(a + i) * 3, y = 178 + (ey - 178) * u + Math.cos(a * 0.7 + i) * (3 + u * 8); alpha(0.5 * k, () => r(Math.round(x), Math.round(y), 1, 1, [255, 255, 255])); } });
  }
  // aisle lights
  lit(() => { for (let y = 470; y < 650; y += 30) for (const x of [606, 914]) r(x, y, 2, 1, [255, 190, 90]); });
  for (let y = 470; y < 650; y += 30) for (const x of [606, 914]) Gd(x + 1, y, 3, [255, 190, 90], 0.25);
}

// ---------- props ----------
const seatRow = (y: number): Prop => ({
  y,
  draw() {
    r(SEAT_X[0] - 16, y - 2, SEAT_X[5] - SEAT_X[0] + 32, 3, [16, 8, 12]);
    for (const cx of SEAT_X) {
      r(cx - 9, y - 30, 18, 20, CK.SEAT_DK); r(cx - 8, y - 31, 16, 1, CK.SEAT_DK); r(cx - 8, y - 29, 15, 18, CK.SEAT); r(cx - 8, y - 29, 15, 2, CK.SEAT_HI); r(cx - 8, y - 29, 1, 17, CK.SEAT_HI); r(cx + 5, y - 27, 2, 16, shade(CK.SEAT, 0.8));
      r(cx - 9, y - 12, 18, 6, CK.SEAT_HI); r(cx - 9, y - 12, 18, 1, [240, 110, 120]); r(cx - 9, y - 7, 18, 1, CK.SEAT_DK);
      r(cx - 6, y - 6, 12, 5, CK.BASE);
    }
    for (let i = 0; i <= SEAT_X.length; i++) { const ax = SEAT_X[0] - 24 + i * 48; r(ax + 12, y - 18, 3, 16, CK.ARM); r(ax + 12, y - 18, 3, 1, [70, 50, 60]); }
    txt(String(ROWS.indexOf(y) + 1), SEAT_X[0] - 22, y - 16, CK.GOLD);
  },
});
const podium: Prop = {
  y: 470,
  draw(a: number) {
    const x = 460, y = 470;
    r(x - 8, y - 22, 16, 22, CK.GOLD_DK); r(x - 7, y - 21, 14, 20, [70, 26, 36]); r(x - 10, y - 26, 20, 5, CK.GOLD); r(x - 10, y - 26, 20, 1, CK.GOLD_HI);
    r(x - 12, y - 44, 24, 16, CK.BOARD); r(x - 12, y - 44, 24, 1, CK.GOLD);
    lit(() => { txt('PARTY', x - tw('PARTY') / 2, y - 41, (a % 1) < 0.5 ? K.MAG : K.GOLD); txt('GAMES', x - tw('GAMES') / 2, y - 34, K.CYAN); });
    G(x - 14, y - 46, 28, 20, [255, 95, 210], 0.15);
  },
};
const post = (x: number, y: number, ropeTo: number | null): Prop => ({
  y,
  draw() {
    if (ropeTo !== null) for (let k = 0; k <= 12; k++) { const u = k / 12, ry = ropeTo - 18 + (y - ropeTo) * u + Math.sin(u * Math.PI) * 5; r(x, Math.round(ry), 2, 2, CK.CURTAIN); }
    r(x - 3, y - 2, 8, 2, CK.GOLD_DK); r(x, y - 22, 2, 20, CK.GOLD); r(x, y - 22, 1, 20, CK.GOLD_HI); r(x - 1, y - 25, 4, 3, CK.GOLD_HI);
  },
});

// ---------- spots (index = network id: append only) ----------
const seats: Spot[] = ROWS.flatMap((y) => SEAT_X.map((x) => ({ kind: 'sit' as const, x, y: y + 1, sx: x, sy: y + 12, lift: 7, label: 'SIT', area: { x0: SEAT_X[0] - 16, y0: y - 34, x1: SEAT_X[5] + 16, y1: y } })));
export const CINEMA_SPOTS: Spot[] = [
  ...seats,
  { kind: 'popcorn', x: 108, y: 452, sx: 108, sy: 452, lift: 0, label: 'POPCORN', area: { x0: 82, y0: 312, x1: 134, y1: 380 } },
  { kind: 'soda', x: 170, y: 452, sx: 170, sy: 452, lift: 0, label: 'SODA', area: { x0: 146, y0: 332, x1: 206, y1: 380 } },
  { kind: 'booth', x: 348, y: 452, sx: 348, sy: 452, lift: 0, label: 'PHOTO', area: { x0: 314, y0: 308, x1: 382, y1: 440 } },
];
export const CINEMA_BOOTH = 20;
CINEMA_SPOTS.push({ kind: 'party', game: 'chairs', x: 460, y: 482, sx: 460, sy: 482, lift: 0, label: 'MUSICAL CHAIRS', area: { x0: 448, y0: 436, x1: 472, y1: 472 } }); // 21

export function makeCinema(): Room {
  const room: Room = {
    id: 'cinema', title: 'THE CINEMA', sub: 'NOW SHOWING',
    w: W, h: H,
    floor: { x0: 14, y0: 452, x1: W - 14, y1: 650 },
    blockers: [
      ...ROWS.map((y) => ({ x0: SEAT_X[0] - 20, y0: y - 12, x1: SEAT_X[5] + 20, y1: y + 2 })),
      { x0: 398, y0: 466, x1: 410, y1: 524 }, // velvet rope
      { x0: 452, y0: 464, x1: 468, y1: 472 }, // party podium
    ],
    doors: [{ trigger: { x0: 10, y0: 452, x1: 46, y1: 460 }, to: 'plaza', arrive: { x: 444, y: 584 }, label: 'OUTSIDE', area: { x0: 4, y0: 316, x1: 52, y1: 458 } }],
    spots: CINEMA_SPOTS, inUse: new Map(),
    spawn: { x: 200, y: 520 },
    watch: { x: SCR.x + SCR.w / 2, top: SCR.y - 16 },
    dim: 0.12,
    dimNow: () => 0.12 + 0.3 * showK(filmClock().t),
    fillTop: 'rgb(26,14,22)', fillLow: 'rgb(35,22,32)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [...ROWS.map(seatRow), post(404, 470, null), post(404, 524, 470), podium],
  };
  cinemaRoom = room;
  return room;
}

