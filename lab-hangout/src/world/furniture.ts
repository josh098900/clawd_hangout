// FURNITURE for the flats (world/flat.ts): the catalogue (prices must match private.furniture in
// supabase/migrations/0014_apartments.sql), how each piece is drawn side-on, and what you can do
// with it (sit, nap, music, games, the aquarium, the trophy cabinet, the party switch).
//
// Placement: each piece has a layer. 'floor' pieces stand in one of three rows (0 against the back
// wall, 1 in the middle, 2 at the front), 'rug' pieces lie flat under everything in a row, and
// 'wall' pieces hang on the back wall. x is the piece's centre. Wallpapers and floors are chosen
// per room ('wall0'..'wall5', 'floor0'..'floor4'; the first two of each are free).

import { CONFETTI, K, type RGB } from '../engine/palette';
import { PX, r, line, disc, oval, txt, tw, lit, alpha, Gd, Gsoft, G, M, shade } from '../engine/pixel';
import { h1 } from '../engine/math';

/** The flats' geometry: back wall bottom, the three floor rows' feet lines, where wall pieces hang. */
export const FL = 470, ROW_Y = [492, 532, 574], WALL_Y = 420;
export type Layer = 'floor' | 'rug' | 'wall';
/** What a piece lets you do (becomes a Spot in world/flat.ts). */
export type FurnUse = 'sit' | 'nap' | 'juke' | 'arcade' | 'keys' | 'look' | 'party' | 'soda';
/** Everything drawing needs to know about the flat it's in. */
export interface FurnCtx { a: number; night: number; party: boolean; fish: string[]; badges: string[]; owner: string; /** the owner's photo from the Lab's photo wall (32x30), for the PHOTO FRAME */ photo: HTMLCanvasElement | null }
export interface Furn {
  id: string; name: string; price: number; w: number; h: number; layer: Layer;
  /** Only in the shop in this season (you keep it after). */
  season?: string;
  /** Sold somewhere in the world instead of DECORATE's SHOP ('aquarium': the City Aquarium's gift shop). */
  shop?: 'aquarium' | 'duty' | 'puffin';
  /** Seats as [dx from centre, lift]. */
  seats?: [number, number][];
  use?: FurnUse; label?: string;
  draw(x: number, y: number, flip: boolean, c: FurnCtx): void;
}
const WOOD: RGB = [150, 100, 60], WOOD_DK: RGB = [110, 70, 40], WOOD_HI: RGB = [184, 130, 84];
/** Draw with the piece flipped (x mirrored about its centre). */
const R = (cx: number, flip: boolean) => (dx: number, y: number, w: number, h: number, c: RGB) => r(flip ? cx - dx - w : cx + dx, y, w, h, c);

export const FURNITURE: Furn[] = [
  // ---------- floor ----------
  { id: 'bed', name: 'BED', price: 25, w: 92, h: 40, layer: 'floor', use: 'nap', label: 'NAP', seats: [[6, 14]], draw(x, y, f) {
    const q = R(x, f); q(-46, y - 36, 8, 36, WOOD_DK); q(-46, y - 36, 8, 2, WOOD_HI); q(40, y - 20, 6, 20, WOOD_DK);
    q(-40, y - 16, 82, 10, [236, 236, 244]); q(-38, y - 22, 20, 7, [250, 250, 255]); q(-18, y - 20, 60, 12, [90, 130, 210]); q(-18, y - 20, 60, 2, [130, 170, 240]);
    for (let k = 0; k < 5; k++) q(-14 + k * 12, y - 16, 6, 2, [70, 110, 190]); q(-42, y - 6, 86, 6, WOOD); } },
  { id: 'sofa', name: 'SOFA', price: 20, w: 76, h: 34, layer: 'floor', use: 'sit', label: 'SIT', seats: [[-16, 10], [16, 10]], draw(x, y, f) {
    const c: RGB = [200, 80, 90], q = R(x, f); q(-38, y - 34, 76, 18, shade(c, 0.85)); q(-38, y - 34, 76, 2, M(c, [255, 255, 255], 0.3));
    q(-38, y - 18, 76, 10, c); q(-34, y - 18, 32, 2, M(c, [255, 255, 255], 0.3)); q(2, y - 18, 32, 2, M(c, [255, 255, 255], 0.3));
    q(-40, y - 26, 6, 20, shade(c, 0.75)); q(34, y - 26, 6, 20, shade(c, 0.75)); q(-36, y - 8, 4, 8, WOOD_DK); q(32, y - 8, 4, 8, WOOD_DK); } },
  { id: 'armchair', name: 'ARMCHAIR', price: 10, w: 36, h: 34, layer: 'floor', use: 'sit', label: 'SIT', seats: [[0, 10]], draw(x, y, f) {
    const c: RGB = [90, 150, 120], q = R(x, f); q(-16, y - 34, 32, 18, shade(c, 0.85)); q(-16, y - 18, 32, 10, c); q(-16, y - 18, 32, 2, M(c, [255, 255, 255], 0.3));
    q(-19, y - 26, 5, 20, shade(c, 0.7)); q(14, y - 26, 5, 20, shade(c, 0.7)); q(-15, y - 8, 3, 8, WOOD_DK); q(12, y - 8, 3, 8, WOOD_DK); } },
  { id: 'beanbag', name: 'BEANBAG', price: 8, w: 32, h: 20, layer: 'floor', use: 'sit', label: 'FLOP', seats: [[0, 5]], draw(x, y) {
    oval(x, y - 8, 15, 9, [240, 150, 60]); oval(x - 3, y - 12, 8, 4, [255, 190, 110]); r(x - 12, y - 2, 24, 2, [190, 110, 40]); } },
  { id: 'ctable', name: 'COFFEE TABLE', price: 10, w: 46, h: 16, layer: 'floor', draw(x, y) {
    r(x - 23, y - 14, 46, 4, WOOD_HI); r(x - 23, y - 10, 46, 2, WOOD_DK); r(x - 20, y - 8, 3, 8, WOOD_DK); r(x + 17, y - 8, 3, 8, WOOD_DK);
    r(x - 8, y - 18, 8, 4, [240, 240, 250]); r(x - 7, y - 20, 6, 2, [120, 70, 40]); r(x + 6, y - 17, 10, 3, [90, 130, 210]); } },
  { id: 'dtable', name: 'DINING TABLE', price: 14, w: 58, h: 24, layer: 'floor', draw(x, y) {
    r(x - 29, y - 24, 58, 4, WOOD_HI); r(x - 29, y - 20, 58, 2, WOOD_DK); r(x - 26, y - 18, 3, 18, WOOD_DK); r(x + 23, y - 18, 3, 18, WOOD_DK);
    r(x - 6, y - 30, 4, 6, [240, 240, 250]); disc(x - 4, y - 32, 2, [220, 60, 70]); r(x + 8, y - 27, 12, 3, [250, 250, 255]); } },
  { id: 'chair', name: 'CHAIR', price: 6, w: 20, h: 36, layer: 'floor', use: 'sit', label: 'SIT', seats: [[0, 12]], draw(x, y, f) {
    const q = R(x, f); q(-9, y - 36, 4, 36, WOOD_DK); q(-9, y - 14, 18, 4, WOOD_HI); q(5, y - 10, 3, 10, WOOD_DK); q(-8, y - 32, 3, 14, WOOD); } },
  { id: 'desk', name: 'DESK + PC', price: 25, w: 62, h: 44, layer: 'floor', use: 'sit', label: 'COMPUTE', seats: [[0, 8]], draw(x, y, f, c) {
    const q = R(x, f); q(-31, y - 26, 62, 4, WOOD_HI); q(-31, y - 22, 62, 2, WOOD_DK); q(-28, y - 20, 3, 20, WOOD_DK); q(25, y - 20, 18 - 12, 20, WOOD_DK); q(12, y - 20, 16, 20, WOOD);
    q(-12, y - 46, 26, 18, [40, 44, 56]); lit(() => { q(-10, y - 44, 22, 14, [20, 40, 70]); for (let k = 0; k < 4; k++) q(-8, y - 42 + k * 3, 6 + ((k * 5 + Math.floor(c.a * 2)) % 12), 1, CONFETTI[k]); });
    q(-2, y - 28, 6, 2, [60, 64, 76]); q(-20, y - 28, 12, 2, [200, 200, 210]); Gd(x, y - 38, 16, [90, 170, 255], 0.2); } },
  { id: 'shelf', name: 'BOOKSHELF', price: 12, w: 46, h: 72, layer: 'floor', draw(x, y) {
    r(x - 23, y - 72, 46, 72, WOOD_DK); r(x - 21, y - 70, 42, 68, [70, 44, 26]);
    for (let s = 0; s < 4; s++) { const sy = y - 68 + s * 17; r(x - 21, sy + 14, 42, 3, WOOD); for (let b = 0; b < 7; b++) { const bh = 9 + Math.floor(h1(s * 9 + b) * 5); r(x - 19 + b * 6, sy + 14 - bh, 5, bh, CONFETTI[(s + b) % CONFETTI.length]); } } } },
  { id: 'tv', name: 'TV', price: 30, w: 52, h: 52, layer: 'floor', draw(x, y, _f, c) {
    r(x - 24, y - 16, 48, 16, WOOD); r(x - 24, y - 16, 48, 2, WOOD_HI); r(x - 20, y - 12, 18, 8, WOOD_DK); r(x + 2, y - 12, 18, 8, WOOD_DK);
    r(x - 26, y - 50, 52, 32, [30, 32, 40]); r(x - 2, y - 18, 4, 2, [30, 32, 40]);
    lit(() => { const ch = Math.floor(c.a / 6) % 3, u = c.a % 6;
      if (ch === 0) { r(x - 23, y - 47, 46, 26, [60, 150, 230]); r(x - 23, y - 30, 46, 9, [60, 170, 90]); disc(Math.round(x - 14 + u * 5), y - 38, 3, [255, 214, 90]); }
      else if (ch === 1) { r(x - 23, y - 47, 46, 26, [20, 16, 40]); for (let k = 0; k < 8; k++) r(x - 22 + ((k * 17 + Math.floor(c.a * 30)) % 44), y - 46 + ((k * 11) % 24), 1, 1, K.WHITE); txt('SPACE', x - tw('SPACE') / 2, y - 38, [255, 214, 90]); }
      else { for (let k = 0; k < 6; k++) r(x - 23 + k * 8, y - 47, 8, 26, CONFETTI[k]); } });
    Gd(x, y - 34, 26, [120, 170, 255], 0.16); } },
  { id: 'radio', name: 'RECORD PLAYER', price: 18, w: 34, h: 40, layer: 'floor', use: 'juke', label: 'MUSIC', draw(x, y, _f, c) {
    r(x - 16, y - 22, 32, 22, WOOD); r(x - 16, y - 22, 32, 2, WOOD_HI); r(x - 12, y - 16, 10, 10, WOOD_DK); r(x + 2, y - 16, 10, 10, WOOD_DK);
    r(x - 16, y - 28, 32, 6, [40, 40, 48]); oval(x - 2, y - 26, 10, 2, [20, 20, 24]); r(x - 2, y - 27, 2, 1, (c.a * 4) % 1 < 0.5 ? [220, 60, 70] : [240, 240, 240]); line(x + 12, y - 30, x + 4, y - 26, [200, 200, 210]); } },
  { id: 'arcade', name: 'ARCADE CABINET', price: 40, w: 36, h: 76, layer: 'floor', use: 'arcade', label: 'PLAY', draw(x, y, _f, c) {
    r(x - 17, y - 76, 34, 76, [30, 110, 70]); r(x - 17, y - 76, 34, 2, [80, 180, 120]); r(x - 17, y - 76, 34, 12, [16, 70, 40]);
    lit(() => { txt('SLOP', x - tw('SLOP') / 2, y - 73, [124, 242, 156]); r(x - 12, y - 60, 24, 22, [8, 12, 10]); for (let k = 0; k < 4; k++) r(x - 10 + k * 6 + Math.round(Math.sin(c.a * 1.5) * 2), y - 56, 4, 3, CONFETTI[k]); r(x - 2 + Math.round(Math.sin(c.a * 2) * 8), y - 42, 4, 2, K.CYAN); });
    r(x - 15, y - 34, 30, 8, [20, 80, 50]); disc(x - 6, y - 31, 2, K.GOLD); disc(x + 6, y - 31, 2, K.RED); Gd(x, y - 50, 18, [124, 242, 156], 0.18); } },
  { id: 'tank', name: 'FISH TANK', price: 25, w: 54, h: 50, layer: 'floor', use: 'look', label: 'FISH', draw(x, y, _f, c) {
    r(x - 26, y - 16, 52, 16, WOOD_DK); r(x - 26, y - 16, 52, 2, WOOD);
    r(x - 26, y - 50, 52, 34, [60, 64, 76]); lit(() => { r(x - 24, y - 48, 48, 30, [40, 110, 170]); r(x - 24, y - 48, 48, 3, [90, 170, 220]); r(x - 24, y - 21, 48, 3, [200, 180, 120]);
      for (let k = 0; k < 3; k++) r(x - 18 + k * 16, y - 26 - (k % 2) * 3, 2, 6 + (k % 2) * 3, [60, 160, 80]);
      const fish = c.fish.length ? c.fish.slice(0, 8) : [];
      fish.forEach((nm, i) => { const sp = 0.3 + h1(i * 3.3) * 0.4, u = (c.a * sp + h1(i)) % 2, t = u < 1 ? u : 2 - u, fx = Math.round(x - 20 + t * 38), fy = y - 44 + Math.round(h1(i * 7.7) * 18 + Math.sin(c.a * 1.3 + i) * 2), d = u < 1 ? 1 : -1;
        const col = fishColour(nm); r(fx, fy, 5, 3, col); r(fx + (d > 0 ? -2 : 5), fy, 2, 3, shade(col, 0.7)); r(fx + (d > 0 ? 3 : 1), fy, 1, 1, [20, 20, 20]); });
      for (let k = 0; k < 4; k++) { const ph = (c.a * 0.6 + k / 4) % 1; r(x + 16 - (k % 2) * 4, y - 24 - Math.round(ph * 22), 1, 1, [200, 230, 255]); } });
    if (!c.fish.length) lit(() => txt('EMPTY', x - tw('EMPTY') / 2, y - 38, [200, 230, 255]));
    Gd(x, y - 34, 26, [90, 180, 255], 0.16); } },
  { id: 'trophy', name: 'TROPHY CABINET', price: 20, w: 46, h: 66, layer: 'floor', use: 'look', label: 'TROPHIES', draw(x, y, _f, c) {
    r(x - 23, y - 66, 46, 66, WOOD_DK); r(x - 21, y - 64, 42, 46, [40, 30, 40]); r(x - 21, y - 16, 42, 14, WOOD);
    for (let s = 0; s < 3; s++) r(x - 21, y - 50 + s * 15, 42, 2, WOOD_HI);
    const n = c.badges.length;
    lit(() => { for (let i = 0; i < Math.min(12, n); i++) { const bx = x - 17 + (i % 4) * 10, by = y - 58 + Math.floor(i / 4) * 15; r(bx + 1, by + 2, 4, 5, [255, 214, 90]); r(bx, by + 2, 6, 1, [255, 240, 170]); r(bx + 2, by + 7, 2, 2, [200, 160, 60]); r(bx + 1, by + 9, 4, 1, [200, 160, 60]); } });
    alpha(0.12, () => r(x - 21, y - 64, 42, 46, [200, 230, 255])); if (n) Gd(x, y - 44, 22, [255, 214, 90], 0.14); } },
  { id: 'lamp', name: 'FLOOR LAMP', price: 8, w: 18, h: 66, layer: 'floor', draw(x, y, _f, c) {
    r(x - 1, y - 54, 2, 52, [60, 60, 70]); r(x - 6, y - 3, 12, 3, [60, 60, 70]);
    lit(() => { r(x - 8, y - 66, 16, 12, [255, 230, 170]); r(x - 8, y - 66, 16, 2, [255, 245, 210]); }); Gd(x, y - 56, 34, [255, 220, 150], 0.24 + 0.1 * c.night); } },
  { id: 'plant', name: 'BIG PLANT', price: 6, w: 26, h: 44, layer: 'floor', draw(x, y, _f, c) {
    r(x - 8, y - 14, 16, 14, [190, 110, 70]); r(x - 9, y - 14, 18, 3, [210, 130, 90]);
    const sw = Math.sin(c.a * 0.8) * 1.2; for (let k = 0; k < 7; k++) { const an = -Math.PI / 2 + (k - 3) * 0.38; line(x, y - 14, Math.round(x + Math.cos(an) * 16 + sw), Math.round(y - 14 + Math.sin(an) * 26), k % 2 ? [60, 150, 80] : [80, 180, 100], 2); } } },
  { id: 'cactus', name: 'CACTUS', price: 4, w: 14, h: 26, layer: 'floor', draw(x, y) {
    r(x - 5, y - 8, 10, 8, [190, 110, 70]); r(x - 2, y - 24, 5, 16, [70, 160, 80]); r(x - 6, y - 18, 4, 2, [70, 160, 80]); r(x - 6, y - 22, 2, 4, [70, 160, 80]); r(x + 3, y - 20, 3, 2, [70, 160, 80]); r(x + 5, y - 24, 2, 4, [70, 160, 80]); lit(() => r(x, y - 26, 2, 2, [255, 120, 170])); } },
  { id: 'guitar', name: 'GUITAR', price: 15, w: 20, h: 44, layer: 'floor', draw(x, y, f) {
    const q = R(x, f); q(-6, y - 4, 12, 4, [60, 60, 70]); oval(x, y - 12, 7, 8, [200, 60, 50]); oval(x, y - 24, 5, 5, [200, 60, 50]); disc(x, y - 14, 2, [40, 20, 20]);
    q(-1, y - 44, 3, 24, WOOD_DK); q(-2, y - 46, 5, 4, [40, 30, 30]); } },
  { id: 'keys', name: 'KEYBOARD', price: 30, w: 54, h: 30, layer: 'floor', use: 'keys', label: 'PLAY', draw(x, y) {
    r(x - 25, y - 22, 3, 22, [50, 50, 60]); r(x + 22, y - 22, 3, 22, [50, 50, 60]); r(x - 27, y - 30, 54, 8, [40, 40, 50]);
    for (let k = 0; k < 12; k++) r(x - 25 + k * 4, y - 28, 3, 5, K.WHITE); for (const k of [0, 1, 3, 4, 5, 7, 8, 10]) r(x - 23 + k * 4, y - 28, 2, 3, [20, 20, 24]); } },
  { id: 'petbed', name: 'PET BED', price: 6, w: 28, h: 12, layer: 'floor', draw(x, y) { oval(x, y - 4, 13, 5, [150, 90, 170]); oval(x, y - 5, 9, 3, [210, 170, 220]); } },
  { id: 'duck', name: 'GIANT DUCK', price: 12, w: 30, h: 32, layer: 'floor', draw(x, y, f) {
    const q = R(x, f); oval(x, y - 10, 13, 9, [255, 214, 60]); disc(f ? x - 6 : x + 6, y - 22, 7, [255, 214, 60]); q(10, y - 23, 6, 3, [255, 140, 40]); q(7, y - 25, 2, 2, [20, 20, 24]); q(-10, y - 12, 8, 3, [240, 190, 40]); } },
  { id: 'fridge2', name: 'MINI FRIDGE', price: 16, w: 30, h: 40, layer: 'floor', use: 'soda', label: 'SODA', draw(x, y) {
    r(x - 14, y - 40, 28, 40, [220, 220, 228]); r(x - 14, y - 40, 28, 2, K.WHITE); r(x - 14, y - 26, 28, 1, [170, 170, 180]); r(x + 9, y - 36, 2, 8, [150, 150, 160]); r(x + 9, y - 22, 2, 10, [150, 150, 160]);
    r(x - 10, y - 36, 12, 6, [220, 60, 70]); lit(() => r(x - 9, y - 35, 3, 1, K.WHITE)); } },
  { id: 'disco', name: 'DISCO BALL', price: 35, w: 24, h: 100, layer: 'wall', use: 'party', label: 'PARTY!', draw(x, by, _f, c) {
    const y = by - 40; line(x, by - 100, x, y - 8, [120, 120, 130]); disc(x, y, 8, [180, 190, 210]);
    lit(() => { for (let k = 0; k < 14; k++) { const px = x - 6 + (k * 5) % 12, py = y - 6 + Math.floor(k / 3) * 3; if ((k + Math.floor(c.a * 6)) % 3 === 0 || c.party) r(px, py, 2, 2, c.party ? CONFETTI[(k + Math.floor(c.a * 8)) % CONFETTI.length] : K.WHITE); } });
    if (c.party) Gd(x, y, 30, CONFETTI[Math.floor(c.a * 4) % CONFETTI.length], 0.35); } },
  // ---------- rugs ----------
  { id: 'rug', name: 'ROUND RUG', price: 5, w: 70, h: 10, layer: 'rug', draw(x, y) { oval(x, y, 35, 7, [180, 80, 90]); oval(x, y, 26, 5, [220, 130, 120]); oval(x, y, 14, 3, [240, 190, 150]); } },
  { id: 'rug2', name: 'STRIPED RUG', price: 6, w: 90, h: 12, layer: 'rug', draw(x, y) { for (let k = 0; k < 6; k++) r(x - 45, y - 6 + k * 2, 90, 2, CONFETTI[k]); r(x - 47, y - 6, 2, 12, [240, 240, 240]); r(x + 45, y - 6, 2, 12, [240, 240, 240]); } },
  { id: 'rug3', name: 'SPACE RUG', price: 12, w: 100, h: 14, layer: 'rug', draw(x, y, _f, c) { r(x - 50, y - 7, 100, 14, [20, 22, 50]); lit(() => { for (let k = 0; k < 16; k++) r(x - 48 + Math.floor(h1(k) * 96), y - 6 + Math.floor(h1(k * 3) * 12), 1, 1, (c.a + h1(k)) % 1 < 0.7 ? K.WHITE : [120, 130, 200]); disc(x + 24, y - 1, 3, [240, 200, 120]); }); } },
  // ---------- wall ----------
  { id: 'poster1', name: 'FILM POSTER', price: 5, w: 26, h: 36, layer: 'wall', draw(x, y) { r(x - 13, y - 36, 26, 36, [18, 22, 60]); r(x - 3, y - 28, 6, 14, K.WHITE); r(x - 3, y - 29, 6, 2, K.RED); r(x - 1, y - 14, 2, 4, K.GOLD); txt('CRITTER', x - tw('CRITTER') / 2, y - 7, [255, 214, 90]); } },
  { id: 'poster2', name: 'ARCADE POSTER', price: 5, w: 26, h: 36, layer: 'wall', draw(x, y) { r(x - 13, y - 36, 26, 36, [40, 14, 60]); for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) r(x - 9 + j * 7, y - 32 + k * 6, 5, 3, CONFETTI[k + j]); r(x - 3, y - 12, 6, 3, K.CYAN); txt('HI', x - tw('HI') / 2, y - 7, K.GOLD); } },
  { id: 'poster3', name: 'SPACE POSTER', price: 5, w: 26, h: 36, layer: 'wall', draw(x, y) { r(x - 13, y - 36, 26, 36, [10, 14, 34]); disc(x + 3, y - 22, 7, [220, 120, 80]); r(x - 6, y - 23, 20, 1, [240, 200, 160]); for (let k = 0; k < 6; k++) r(x - 11 + Math.floor(h1(k) * 22), y - 34 + Math.floor(h1(k * 5) * 30), 1, 1, K.WHITE); } },
  { id: 'clock', name: 'WALL CLOCK', price: 6, w: 18, h: 18, layer: 'wall', draw(x, y) {
    const cy = y - 20; disc(x, cy, 8, [60, 60, 70]); disc(x, cy, 7, [240, 240, 236]); const d = new Date(), hh = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * Math.PI * 2, mm = d.getMinutes() / 60 * Math.PI * 2;
    line(x, cy, Math.round(x + Math.sin(hh) * 4), Math.round(cy - Math.cos(hh) * 4), [30, 30, 40]); line(x, cy, Math.round(x + Math.sin(mm) * 6), Math.round(cy - Math.cos(mm) * 6), [30, 30, 40]); r(x, cy, 1, 1, K.RED); } },
  // ---------- winter (in the shop 1 Dec - 6 Jan) ----------
  { id: 'xtree', name: 'XMAS TREE', price: 20, w: 40, h: 70, layer: 'floor', season: 'winter', draw(x, y, _f, c) {
    r(x - 3, y - 8, 6, 8, [110, 70, 40]); r(x - 8, y - 4, 16, 4, [214, 44, 56]);
    for (const [t0, t1, w] of [[6, 30, 12], [20, 48, 16], [36, 64, 20]] as [number, number, number][]) for (let j = t0; j <= t1; j++) { const hw = Math.round(w * (j - t0) / (t1 - t0)) + 2; r(x - hw, y - 72 + j, hw * 2, 1, j > t1 - 2 ? [26, 96, 60] : [38, 124, 76]); r(x - hw, y - 72 + j, Math.max(1, Math.round(hw * 0.4)), 1, [70, 160, 96]); }
    lit(() => { for (let k = 0; k < 14; k++) { const j = 10 + Math.floor(h1(k * 3.3) * 54), hw = Math.round(j * 0.33); if ((c.a * 1.3 + h1(k)) % 1 < 0.7) r(x - hw + Math.floor(h1(k * 7.7) * hw * 2), y - 72 + j, 2, 2, CONFETTI[k % CONFETTI.length]); } r(x - 1, y - 72, 3, 5, K.GOLD); r(x - 3, y - 70, 7, 1, K.GOLD); });
    Gd(x, y - 71, 8, [255, 220, 120], 0.4); } },
  { id: 'fireplace', name: 'FIREPLACE', price: 25, w: 60, h: 52, layer: 'floor', season: 'winter', draw(x, y, _f, c) {
    r(x - 30, y - 52, 60, 52, [150, 70, 56]); for (let j = 0; j < 52; j += 6) for (let i = (j / 6) % 2 ? 0 : 6; i < 60; i += 12) r(x - 30 + i, y - 52 + j, 11, 5, [170, 84, 66]);
    r(x - 34, y - 56, 68, 6, [110, 76, 50]); r(x - 34, y - 56, 68, 1, [150, 110, 76]); r(x - 18, y - 34, 36, 34, [30, 20, 20]);
    r(x - 12, y - 6, 24, 4, [110, 70, 40]); const f = Math.floor(c.a * 10) % 3;
    lit(() => { for (let k = 0; k < 5; k++) { const hh = 8 + ((k * 5 + f * 3) % 9); r(x - 11 + k * 5, y - 6 - hh, 3, hh, k % 2 ? [255, 160, 60] : [255, 220, 120]); } });
    Gsoft(x, y - 14, 8, 44, [255, 150, 60], 0.35);
    for (const sx of [-20, 4]) { r(x + sx, y - 54, 8, 12, [214, 44, 56]); r(x + sx, y - 54, 8, 2, K.WHITE); r(x + sx - 2, y - 44, 7, 3, [214, 44, 56]); } } },
  { id: 'stocking', name: 'STOCKING', price: 6, w: 14, h: 22, layer: 'wall', season: 'winter', draw(x, y) {
    r(x - 5, y - 22, 9, 4, K.WHITE); r(x - 4, y - 18, 7, 12, [214, 44, 56]); r(x - 4, y - 8, 11, 5, [214, 44, 56]); r(x + 5, y - 6, 3, 3, [214, 44, 56]); r(x - 3, y - 14, 5, 1, [60, 170, 90]); r(x - 3, y - 11, 5, 1, K.WHITE);
    r(x - 2, y - 26, 3, 5, [255, 200, 60]); r(x + 1, y - 25, 3, 4, [90, 130, 230]); } },
  { id: 'sglobe', name: 'SNOW GLOBE', price: 8, w: 20, h: 22, layer: 'floor', season: 'winter', draw(x, y, _f, c) {
    r(x - 8, y - 5, 16, 5, [110, 70, 40]); r(x - 8, y - 5, 16, 1, [150, 110, 76]);
    for (let j = -8; j <= 8; j++) { const w = Math.round(Math.sqrt(64 - j * j)); r(x - w, y - 14 + j, w * 2, 1, [170, 214, 240]); }
    r(x - 3, y - 12, 6, 6, [38, 124, 76]); r(x - 1, y - 16, 2, 4, [38, 124, 76]); r(x - 5, y - 7, 10, 2, [240, 244, 250]);
    lit(() => { for (let k = 0; k < 8; k++) { const t = (c.a * 0.4 + h1(k)) % 1, px = x - 6 + Math.floor(h1(k * 3) * 12) + Math.round(Math.sin(c.a * 2 + k) * 1.5), py = y - 21 + Math.floor(t * 14); if ((px - x) ** 2 + (py - (y - 14)) ** 2 < 56) r(px, py, 1, 1, K.WHITE); } r(x - 5, y - 19, 2, 2, K.WHITE); }); } },
  // ---------- the City Aquarium's gift shop (sold there, not in DECORATE's SHOP) ----------
  { id: 'plush', name: 'FISH PLUSH', price: 6, w: 26, h: 18, layer: 'floor', shop: 'aquarium', draw(x, y, f) {
    const q = R(x, f), o: RGB = [255, 150, 70], od: RGB = [220, 100, 50], oh: RGB = [255, 196, 130];
    oval(x, y - 7, 9, 6, o); q(-8, y - 11, 10, 2, oh); q(-9, y - 5, 12, 1, od); // the round body, lit on top
    q(8, y - 12, 4, 4, o); q(8, y - 6, 4, 4, o); q(9, y - 9, 2, 2, od); // the tail
    q(-3, y - 15, 5, 3, od); q(-2, y - 16, 3, 1, o); // the fin
    q(-7, y - 10, 3, 3, K.WHITE); q(-6, y - 9, 2, 2, [20, 20, 28]); q(-6, y - 10, 1, 1, K.WHITE); // a big button eye
    q(-8, y - 6, 3, 1, od); q(-2, y - 9, 1, 5, [255, 214, 170]); q(2, y - 9, 1, 5, [255, 214, 170]); // stitched smile, stripes
  } },
  { id: 'jlamp', name: 'JELLYFISH LAMP', price: 14, w: 18, h: 40, layer: 'floor', shop: 'aquarium', draw(x, y, _f, c) {
    r(x - 7, y - 4, 14, 4, [60, 60, 72]); r(x - 7, y - 4, 14, 1, [100, 100, 116]); r(x - 5, y - 36, 10, 32, [120, 140, 170]); // the base and the glass tube
    const col = CONFETTI[Math.floor(c.a * 0.25) % CONFETTI.length], bob = Math.round(Math.sin(c.a * 1.4) * 3), pulse = Math.floor(c.a * 1.4) % 2;
    lit(() => { r(x - 4, y - 35, 8, 30, M([20, 30, 60], col, 0.25)); r(x - 3 - pulse, y - 26 + bob, 6 + pulse * 2, 3, col); r(x - 2, y - 27 + bob, 4, 1, M(col, K.WHITE, 0.5));
      for (let k = 0; k < 3; k++) r(x - 2 + k * 2, y - 23 + bob, 1, 5 + (k + Math.floor(c.a * 3)) % 2, M(col, K.WHITE, 0.25)); });
    r(x - 5, y - 38, 10, 3, [60, 60, 72]); alpha(0.3, () => r(x - 4, y - 35, 1, 30, K.WHITE)); Gd(x, y - 22, 16, col, 0.3); } },
  { id: 'bottle', name: 'SHIP IN A BOTTLE', price: 10, w: 34, h: 18, layer: 'floor', shop: 'aquarium', draw(x, y, f) {
    const q = R(x, f); q(-14, y - 3, 4, 3, WOOD_DK); q(8, y - 3, 4, 3, WOOD_DK); q(-15, y - 4, 28, 1, WOOD); // the cradle
    alpha(0.55, () => { q(-13, y - 15, 22, 11, [120, 190, 150]); q(9, y - 12, 4, 5, [120, 190, 150]); }); q(13, y - 12, 2, 5, [190, 140, 90]); // the glass, the cork
    q(-10, y - 7, 16, 2, [110, 70, 40]); q(-9, y - 8, 14, 1, [150, 100, 60]); q(-2, y - 14, 1, 7, [90, 60, 40]); // the hull, the mast
    q(-7, y - 13, 5, 5, K.WHITE); q(0, y - 12, 4, 4, K.WHITE); lit(() => q(-1, y - 15, 2, 1, [230, 60, 60])); // sails, a flag
    alpha(0.7, () => { q(-12, y - 14, 18, 1, [220, 250, 235]); q(-12, y - 13, 1, 3, [220, 250, 235]); }); } },
  { id: 'aqposter', name: 'AQUARIUM POSTER', price: 5, w: 26, h: 36, layer: 'wall', shop: 'aquarium', draw(x, y) {
    for (let j = 0; j < 36; j += 2) r(x - 13, y - 36 + j, 26, 2, M([30, 110, 170], [10, 30, 70], j / 36));
    oval(x, y - 22, 9, 4, [70, 90, 120]); r(x + 8, y - 26, 3, 8, [70, 90, 120]); r(x - 3, y - 27, 4, 2, [70, 90, 120]); // a whale shark
    for (let k = 0; k < 6; k++) r(x - 7 + k * 3, y - 24 + (k % 2) * 2, 1, 1, [210, 230, 245]); r(x - 7, y - 21, 12, 1, [150, 170, 196]);
    for (let k = 0; k < 4; k++) r(x - 9 + k * 5, y - 33 + (k % 2) * 2, 1, 1, [200, 240, 255]);
    txt('DORIS', x - tw('DORIS') / 2, y - 9, [255, 214, 90]); } },
  // ---------- Reykjavík's PUFFIN SHOP (step 19: sold there, not in DECORATE's SHOP) ----------
  { id: 'puffplush', name: 'PUFFIN PLUSH', price: 8, w: 20, h: 24, layer: 'floor', shop: 'puffin', draw(x, y, f) {
    const q = R(x, f), bk: RGB = [34, 34, 40], wh: RGB = [244, 244, 248], or: RGB = [240, 120, 40];
    oval(x, y - 9, 7, 8, bk); oval(x + (f ? 1 : -1), y - 7, 4, 5, wh); // (the body, the white front)
    oval(x, y - 18, 5, 5, bk); q(-3, y - 19, 4, 4, wh); q(-2, y - 18, 1, 1, bk); // (the head, the white face, an eye)
    q(-9, y - 18, 5, 3, or); q(-8, y - 16, 4, 1, [210, 70, 40]); q(-6, y - 19, 2, 1, [250, 200, 60]); // (the big stripy beak)
    q(-4, y - 1, 3, 2, or); q(1, y - 1, 3, 2, or); q(5, y - 11, 2, 6, [50, 50, 58]); // (the feet, a wing)
  } },
  { id: 'sheeprug', name: 'SHEEPSKIN RUG', price: 12, w: 46, h: 12, layer: 'rug', shop: 'puffin', draw(x, y) {
    for (let j = -5; j <= 5; j++) { const w = Math.round(22 * Math.sqrt(1 - (j / 6) ** 2)); r(x - w, y - 6 + j, w * 2, 1, [242, 236, 222]); }
    for (let k = 0; k < 22; k++) { const an = (k / 22) * Math.PI * 2; r(x + Math.round(Math.cos(an) * 22), y - 6 + Math.round(Math.sin(an) * 5), 2, 2, [226, 216, 196]); } // (the curly edge)
    for (let k = 0; k < 12; k++) r(x - 18 + Math.floor(h1(k * 3.1) * 36), y - 9 + Math.floor(h1(k * 1.7) * 6), 2, 1, [252, 250, 244]);
  } },
  { id: 'isflag', name: 'ICELANDIC FLAG', price: 6, w: 32, h: 24, layer: 'wall', shop: 'puffin', draw(x, y) {
    r(x - 15, y - 23, 30, 21, [30, 70, 160]); r(x - 7, y - 23, 7, 21, K.WHITE); r(x - 15, y - 16, 30, 7, K.WHITE); // (the blue, the white cross)
    r(x - 6, y - 23, 5, 21, [214, 36, 48]); r(x - 15, y - 15, 30, 5, [214, 36, 48]); // (the red cross inside it)
    r(x - 16, y - 24, 1, 23, [120, 90, 60]); r(x - 15, y - 24, 30, 1, M([30, 70, 160], K.WHITE, 0.3));
  } },
  { id: 'lavalamp', name: 'LAVA LAMP', price: 10, w: 14, h: 36, layer: 'floor', shop: 'puffin', draw(x, y, _f, c) {
    r(x - 6, y - 6, 12, 6, [60, 60, 72]); r(x - 5, y - 8, 10, 2, [80, 80, 94]); r(x - 4, y - 34, 8, 4, [60, 60, 72]); // (the base, the cap)
    lit(() => { for (let j = 0; j < 24; j++) { const w = 3 + Math.round(Math.sin((j / 24) * Math.PI) * 2); r(x - w, y - 31 + j, w * 2, 1, [250, 150, 60]); }
      for (let k = 0; k < 3; k++) { const t = (c.a * 0.12 + k / 3) % 1, by = y - 10 - Math.round(Math.sin(t * Math.PI) * 18); disc(x + Math.round(Math.sin(c.a + k) * 1), by, 2 + (k % 2), [255, 220, 90]); } });
    Gd(x, y - 20, 18, [255, 140, 50], 0.35);
  } },
  { id: 'pframe', name: 'PHOTO FRAME', price: 10, w: 40, h: 40, layer: 'wall', draw(x, y, _f, c) {
    r(x - 20, y - 40, 40, 38, [120, 84, 54]); r(x - 19, y - 39, 38, 36, [184, 136, 90]); r(x - 18, y - 38, 36, 34, [250, 248, 240]);
    if (c.photo) PX.ctx.drawImage(c.photo, x - 16, y - 36); else { r(x - 16, y - 36, 32, 30, [200, 204, 214]); txt('PHOTO', x - tw('PHOTO') / 2, y - 26, [120, 126, 140]); txt('WALL', x - tw('WALL') / 2, y - 19, [120, 126, 140]); }
    r(x - 1, y - 43, 2, 3, [90, 90, 100]); } },
  { id: 'painting', name: 'PAINTING', price: 12, w: 42, h: 30, layer: 'wall', draw(x, y) { r(x - 21, y - 32, 42, 30, [200, 160, 60]); r(x - 18, y - 29, 36, 24, [120, 180, 230]); r(x - 18, y - 14, 36, 9, [80, 150, 90]); disc(x + 8, y - 24, 3, [255, 230, 120]); for (let k = 0; k < 4; k++) r(x - 16 + k * 9, y - 17 - (k % 2) * 3, 6, 3 + (k % 2) * 3, [60, 120, 70]); } },
  { id: 'neon', name: 'NEON SIGN', price: 18, w: 60, h: 20, layer: 'wall', draw(x, y, _f, c) { const on = (c.a * 1.7) % 9 > 0.2; lit(() => txt('HOME', x - tw('HOME', 2) / 2, y - 24, on ? [255, 90, 170] : [120, 40, 90], 2)); if (on) G(x - 30, y - 28, 60, 18, [255, 90, 170], 0.22); } },
  { id: 'lights', name: 'STRING LIGHTS', price: 10, w: 100, h: 16, layer: 'wall', draw(x, y, _f, c) {
    for (let k = 0; k <= 10; k++) { const px = x - 50 + k * 10, py = y - 40 + Math.round(Math.sin((k / 10) * Math.PI) * 8); r(px, py - 1, 1, 1, [60, 60, 70]); lit(() => r(px - 1, py, 3, 3, CONFETTI[(k + Math.floor(c.a * 2)) % CONFETTI.length])); Gd(px, py + 1, 5, CONFETTI[k % CONFETTI.length], 0.3); } } },
  { id: 'wshelf', name: 'WALL SHELF', price: 8, w: 42, h: 20, layer: 'wall', draw(x, y) { r(x - 21, y - 16, 42, 3, WOOD); r(x - 18, y - 13, 2, 4, WOOD_DK); r(x + 16, y - 13, 2, 4, WOOD_DK); r(x - 16, y - 24, 6, 8, [190, 110, 70]); r(x - 17, y - 28, 8, 4, [80, 170, 90]); for (let b = 0; b < 4; b++) r(x - 4 + b * 4, y - 26 + (b % 2), 3, 10 - (b % 2), CONFETTI[b]); r(x + 14, y - 22, 4, 6, [240, 240, 250]); } },
];
export const FURN = new Map(FURNITURE.map((f) => [f.id, f]));

// ---------- wallpapers + floors ----------
export const WALLPAPERS: { id: string; name: string; price: number }[] = [
  { id: 'wall0', name: 'PLAIN', price: 0 }, { id: 'wall1', name: 'STRIPES', price: 0 }, { id: 'wall2', name: 'BRICK', price: 8 },
  { id: 'wall3', name: 'POLKA DOTS', price: 8 }, { id: 'wall4', name: 'NIGHT SKY', price: 15 }, { id: 'wall5', name: 'PIXEL WAVES', price: 15 },
];
export const FLOORS: { id: string; name: string; price: number }[] = [
  { id: 'floor0', name: 'WOOD', price: 0 }, { id: 'floor1', name: 'CARPET', price: 0 }, { id: 'floor2', name: 'TILES', price: 8 },
  { id: 'floor3', name: 'CHECKERS', price: 10 }, { id: 'floor4', name: 'NEON GRID', price: 15 },
];
export const PRICE = (id: string): number => FURN.get(id)?.price ?? WALLPAPERS.find((w) => w.id === id)?.price ?? FLOORS.find((f) => f.id === id)?.price ?? 0;
/** How many of each come free with a new flat (matches private.furniture.starter). */
export const STARTER: Record<string, number> = { bed: 1, armchair: 1, lamp: 1, plant: 1, rug: 1 };

/** Paint wallpaper `id` over the wall rect (baked). */
export function paintWall(id: string, x0: number, y0: number, w: number, h: number): void {
  if (id === 'wall1') { r(x0, y0, w, h, [200, 220, 240]); for (let x = x0; x < x0 + w; x += 16) r(x, y0, 6, h, [180, 204, 230]); }
  else if (id === 'wall2') { r(x0, y0, w, h, [150, 70, 56]); for (let y = y0, row = 0; y < y0 + h; y += 8, row++) { r(x0, y + 7, w, 1, [120, 100, 90]); for (let x = x0 - (row % 2) * 8; x < x0 + w; x += 16) r(x + 15, y, 1, 7, [120, 100, 90]); } }
  else if (id === 'wall3') { r(x0, y0, w, h, [250, 220, 230]); for (let y = y0 + 6, row = 0; y < y0 + h; y += 14, row++) for (let x = x0 + (row % 2) * 8 + 4; x < x0 + w; x += 16) disc(x, y, 2, [240, 150, 180]); }
  else if (id === 'wall4') { r(x0, y0, w, h, [24, 26, 60]); for (let i = 0; i < w * h / 180; i++) r(x0 + Math.floor(h1(i * 1.7) * w), y0 + Math.floor(h1(i * 3.9) * h), 1, 1, h1(i) > 0.8 ? [255, 240, 200] : [150, 160, 220]); }
  else if (id === 'wall5') { for (let y = y0; y < y0 + h; y += 4) r(x0, y, w, 4, M([60, 20, 90], [230, 80, 150], (y - y0) / h)); for (let x = x0; x < x0 + w; x += 20) r(x, y0 + h - 30, 1, 30, [255, 150, 220]); for (let y = y0 + h - 30; y < y0 + h; y += 6) r(x0, y, w, 1, [255, 150, 220]); }
  else { r(x0, y0, w, h, [236, 224, 200]); for (let x = x0; x < x0 + w; x += 40) r(x, y0, 1, h, [226, 212, 186]); }
}
/** Paint floor `id` over the floor rect (baked). */
export function paintFloor(id: string, x0: number, y0: number, w: number, h: number): void {
  if (id === 'floor1') { r(x0, y0, w, h, [110, 120, 150]); for (let i = 0; i < w * h / 60; i++) r(x0 + Math.floor(h1(i * 2.1) * w), y0 + Math.floor(h1(i * 4.3) * h), 1, 1, [100, 110, 140]); }
  else if (id === 'floor2') { r(x0, y0, w, h, [220, 224, 230]); for (let y = y0; y < y0 + h; y += 14) r(x0, y, w, 1, [180, 186, 196]); for (let y = y0, j = 0; y < y0 + h; y += 14, j++) for (let x = x0 + (j % 2) * 14; x < x0 + w; x += 28) r(x, y, 1, 14, [180, 186, 196]); }
  else if (id === 'floor3') { for (let y = y0, j = 0; y < y0 + h; y += 14, j++) for (let x = x0, i = 0; x < x0 + w; x += 14, i++) r(x, y, 14, 14, (i + j) % 2 ? [40, 40, 50] : [232, 228, 220]); }
  else if (id === 'floor4') { r(x0, y0, w, h, [20, 12, 40]); for (let y = y0; y < y0 + h; y += 12) r(x0, y, w, 1, [255, 60, 200]); for (let x = x0; x < x0 + w; x += 24) r(x, y0, 1, h, [80, 200, 255]); }
  else { r(x0, y0, w, h, [160, 110, 70]); for (let y = y0, j = 0; y < y0 + h; y += 8, j++) { r(x0, y, w, 1, [120, 80, 50]); for (let x = x0 + ((j * 37) % 80); x < x0 + w; x += 80) r(x, y, 1, 8, [120, 80, 50]); } }
}

/** A fish's colour in the tank (by name, from the fish log). */
function fishColour(nm: string): RGB {
  const C: Record<string, RGB> = { 'SARDINE': [170, 190, 210], 'MACKEREL': [80, 140, 170], 'SEA BREAM': [220, 170, 160], 'SEA BASS': [150, 160, 170], 'SQUID': [240, 200, 210], 'PUFFERFISH': [230, 200, 90], 'SWORDFISH': [90, 110, 190], 'OCTOPUS': [210, 90, 90], 'MOON FISH': [240, 240, 200], 'GOLDEN KOI': [255, 180, 40], 'OLD BOOT': [100, 70, 50], 'SEAWEED': [60, 150, 80] };
  return C[nm] ?? [255, 150, 90];
}
