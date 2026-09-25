// The player character. The default is an ORIGINAL design (a round "lab critter" with an antenna bulb and
// two stubby feet); `composeClawd` below is the optional Clawd body. Both are drawn with the film's rules — hard pixel rects, fixed top-left light,
// 1px dark outline, squash/stretch/lean applied as a transform after composing.
//
// Local sprite space: (0,0) is the point between the feet on the floor. x right, y up is negative.

import { BODY, K, type RGB } from '../engine/palette';
import { PX, mk, r, M, shade, outline, withCtx, lit } from '../engine/pixel';

export interface Look { c: number; hat: number; face: number; fit: number; sp: number; /** 0 none, 1 pigeon, 2 cat, 3 crab, 4 duck, 5 ghost */ pet?: number; /** Your Dev Den desk setup: a bitmask of DESK_ITEMS, shown on whichever desk you sit at. */ desk?: number }
/** Things you can put on your desk in the Dev Den (bit i = item i). */
export const DESK_ITEMS = ['2ND MONITOR', 'PLANT', 'MUG', 'LAVA LAMP', 'FAIRY LIGHTS', 'DRAGON FIGURE', 'STICKERS'] as const;
export const PETS = ['NONE', 'PIGEON', 'CAT', 'CRAB', 'DUCK', 'GHOST', 'BAT', 'PENGUIN'] as const;
/** Which character body. 0 = the lab critter, 1 = Clawd. Both wear every hat, face item and outfit. */
export const SPECIES = ['CRITTER', 'CLAWD'] as const;
export const HATS = ['NONE', 'HARD HAT', 'BEANIE', 'HEADPHONES', 'SPROUT', 'CROWN', 'PARTY HAT', 'COWBOY', 'WIZARD', 'TOP HAT', 'HALO', 'WITCH HAT', 'PUMPKIN HEAD', 'CHEF HAT', 'SPACE HELMET', 'SANTA HAT', 'REINDEER ANTLERS', 'ELF HAT'] as const;
export const FACES = ['NONE', 'GLASSES', 'GOGGLES', 'SHADES', 'MUSTACHE', 'MONOCLE', 'FANGS', 'SKULL MASK', 'RED NOSE'] as const;
export const FITS = ['NONE', 'LAB COAT', 'SCARF', 'BOW TIE', 'HOODIE', 'CAPE', 'VAMPIRE CAPE', 'SKELETON', 'ROCK STAR', 'CHRISTMAS JUMPER'] as const;
export type Slot = 'hat' | 'face' | 'fit' | 'pet';
/**
 * Things you have to earn. Keys are 'slot:index' (the same ids the server's inventory uses).
 * The CROWN is in the Crypt's chest, the PIGEON comes from feeding the pigeons; everything
 * else is a claw machine prize (Arcade). Keep CLAW in step with supabase/migrations/0006_arcade.sql.
 */
export const EARNED: Record<string, string> = { 'hat:5': 'OPEN THE CRYPT CHEST', 'pet:1': 'FEED THE PIGEONS', 'hat:12': 'HAUNTED CRYPT CANDLES (OCTOBER)', 'hat:13': 'SCORE 120 IN A DINER SHIFT', 'hat:14': 'FLY TO THE SPACE STATION', 'fit:8': 'SCORE 90+ IN KARAOKE' };
/** Claw machine prizes and their weights (common 10, uncommon 6, rare 3, legendary 1). */
export const CLAW: [string, number, string?][] = [
  ['hat:6', 10], ['face:4', 10], ['fit:4', 10], ['pet:4', 10], ['pet:3', 10],
  ['hat:7', 6], ['hat:9', 6], ['face:5', 6], ['pet:2', 6],
  ['hat:8', 3], ['fit:5', 3], ['pet:5', 3],
  ['hat:10', 1],
  // Halloween (October only): also the prize for knocking on all 8 trick-or-treat doors in a day
  ['face:6', 10, 'halloween'], ['hat:11', 6, 'halloween'], ['face:7', 6, 'halloween'], ['fit:7', 6, 'halloween'],
  ['fit:6', 3, 'halloween'], ['pet:6', 3, 'halloween'],
  // Winter (1 Dec - 6 Jan): also the present hunt's prize and the advent calendar's (0018_winter.sql)
  ['hat:17', 10, 'winter'], ['face:8', 10, 'winter'], ['hat:16', 6, 'winter'], ['fit:9', 6, 'winter'], ['pet:7', 3, 'winter'], ['hat:15', 3, 'winter'],
];
export const RARITY = (item: string): string => { const w = CLAW.find(([k]) => k === item)?.[1] ?? 0; return w >= 10 ? 'COMMON' : w >= 6 ? 'UNCOMMON' : w >= 3 ? 'RARE' : w ? 'LEGENDARY' : 'SPECIAL'; };
/** Is this item locked until earned? */
export const isLocked = (slot: Slot, i: number): boolean => { const k = slot + ':' + i; return k in EARNED || CLAW.some(([c]) => c === k); };
/** How to get a locked item. */
export const unlockHint = (slot: Slot, i: number): string => EARNED[slot + ':' + i] ?? (CLAW.find(([k]) => k === slot + ':' + i)?.[2] === 'halloween' ? 'HALLOWEEN: TRICK-OR-TREAT OR CLAW' : CLAW.find(([k]) => k === slot + ':' + i)?.[2] === 'winter' ? 'WINTER: PRESENTS, ADVENT CALENDAR OR CLAW' : 'CLAW MACHINE PRIZE');
/** Every collectable, for the collection counter. */
export const COLLECTABLES = [...Object.keys(EARNED), ...CLAW.map(([k]) => k)];
export function itemName(item: string): string {
  const [slot, i] = item.split(':'), n = Number(i);
  const list = slot === 'hat' ? HATS : slot === 'face' ? FACES : slot === 'fit' ? FITS : slot === 'pet' ? PETS : null;
  return list?.[n] ?? item.toUpperCase();
}
/** A weighted pick from CLAW (LOCAL mode only; online the server rolls). Seasonal prizes only in their season. */
export function rollClaw(rand: () => number, season: string | null = null): string {
  const pool = CLAW.filter(([, , s]) => !s || s === season);
  let u = rand() * pool.reduce((t, [, w]) => t + w, 0);
  for (const [k, w] of pool) { if (u < w) return k; u -= w; }
  return pool[0][0];
}
export const DEFAULT_LOOK: Look = { c: 0, hat: 0, face: 0, fit: 1, sp: 0 };

export function sanitizeLook(v: unknown): Look {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const n = (x: unknown, max: number) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 && x < max ? x : 0);
  return { c: n(o.c, BODY.length), hat: n(o.hat, HATS.length), face: n(o.face, FACES.length), fit: n(o.fit, FITS.length), sp: n(o.sp, SPECIES.length), pet: n(o.pet, PETS.length), desk: n(o.desk, 1 << DESK_ITEMS.length) };
}

export type Eyes = 'n' | 'b' | 's' | 'w' | 'h';
export type Mouth = 's' | 'o' | 'O' | 'f';
export interface Pose {
  sx: number; sy: number; lean: number;
  dir: 1 | -1;
  eyes: Eyes; mouth: Mouth; blush: number;
  /** 0 = both feet down, 1/2 = that foot lifted (walk cycle). */
  lift: number;
  arm: 'rest' | 'wave' | 'up';
  wave: number;
  /** Antenna tip sway in px (secondary motion). */
  ant: number;
  /** Extra antenna-bulb brightness 0..1 (the "idea" emote). */
  flare: number;
}
export const basePose = (dir: 1 | -1 = 1): Pose => ({ sx: 1, sy: 1, lean: 0, dir, eyes: 'n', mouth: 's', blush: 0, lift: 0, arm: 'rest', wave: 0, ant: 0, flare: 0 });

// Body silhouette: half-width per row, from the top of the head (y=-25) down to y=-4.
const HW = [5, 8, 9, 10, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 11, 11, 10, 9, 7];
const TOP = -25;
const hwAt = (y: number) => HW[Math.max(0, Math.min(HW.length - 1, y - TOP))];

const SW = 60, SH = 72, OX = 30, OY = 64;
const src = mk(SW, SH), sil = mk(SW, SH), out = mk(SW, SH);
const sctx = src.getContext('2d')!;

export interface Composed {
  cv: HTMLCanvasElement; ox: number; oy: number; bulb: [number, number] | null; bulbCol: RGB; top: number;
  /** Local-space points for held items: where a mug sits in the hand, and where it goes to sip. */
  hand: [number, number]; mouth: [number, number];
}

/** Paint one frame of the critter into a scratch canvas (already outlined). Reused per call: draw it right away. */
export function composeCritter(look: Look, P: Pose, dim: number): Composed {
  if (look.sp === 1) return composeClawd(look, P, dim);
  const body = BODY[look.c]?.c ?? BODY[0].c;
  const hi = M(body, [255, 255, 255], 0.28), lo = shade(body, 0.74), lo2 = shade(body, 0.55), belly = M(body, [255, 255, 255], 0.38);
  const bulbCol = M(body, [255, 255, 255], 0.6);
  let bulb: [number, number] | null = null;
  const pd = PX.dim, pe = PX.emit, pf = PX.fl;
  PX.dim = dim; PX.emit = false; PX.fl = 0;
  sctx.clearRect(0, 0, SW, SH);
  withCtx(sctx, () => {
    const R = (x: number, y: number, w: number, h: number, c: RGB) => r(OX + x, OY + y, w, h, c);
    const d = P.dir;
    // feet
    for (const [fx, k] of [[-6, 1], [5, 2]] as [number, number][]) {
      const up = P.lift === k ? 2 : 0;
      R(fx - 3, -3 - up, 7, 3, lo2); R(fx - 2, -4 - up, 5, 1, lo2); R(fx - 2, -3 - up, 3, 1, lo);
    }
    // arms (behind body for rest; drawn later for raised)
    const arm = (side: -1 | 1, raised: boolean, sway: number) => {
      const ax = side < 0 ? -15 : 12;
      const sl = SLEEVES[look.fit];
      const c = sl ? sl[0] : body, cl = sl ? sl[1] : lo;
      if (raised) { R(ax + sway, -27, 3, 7, c); R(ax + sway + (side > 0 ? 2 : 0), -26, 1, 6, cl); R(ax + sway, -28, 3, 1, c); }
      else { R(ax, -15, 3, 6, c); R(side > 0 ? ax + 2 : ax, -14, 1, 5, cl); R(ax, -9, 3, 1, cl); }
    };
    // antenna / hat top
    const antBase = look.hat === 1 ? -31 : TOP - 1;
    if (!COVERS.has(look.hat)) {
      const tipX = Math.round(P.ant), L = look.hat === 4 ? 6 : 6;
      for (let j = 0; j < L; j++) { const u = j / (L - 1), x = Math.round(tipX * u * u); R(x, antBase - j, 1, 1, look.hat === 4 ? [60, 150, 80] : shade(body, 0.5)); }
      const bx = tipX, by = antBase - L - 1;
      if (look.hat === 4) { // sprout leaves
        R(bx - 4, by - 1, 4, 2, [82, 176, 104]); R(bx - 3, by - 2, 2, 1, [120, 210, 130]); R(bx + 1, by - 2, 4, 2, [60, 150, 80]); R(bx + 2, by - 3, 2, 1, [82, 176, 104]); R(bx, by, 1, 2, [60, 150, 80]);
      } else {
        lit(() => { R(bx - 1, by - 1, 3, 3, M(bulbCol, [255, 255, 255], P.flare * 0.8)); R(bx - 1, by - 1, 1, 1, [255, 255, 255]); });
        bulb = [bx, by];
      }
    }
    if (look.fit === 5 || look.fit === 6) { // cape, behind the body: flares out at the back as you walk
      const vamp = look.fit === 6, cc: RGB = vamp ? [34, 26, 44] : [200, 40, 60], fl = Math.round(Math.abs(P.ant) * 0.8);
      for (let y = -14; y <= -2; y++) { const w = hwAt(Math.min(y, -4)) + 2 + Math.floor((y + 14) / 4); R(-w - (d > 0 ? fl : 0), y, w * 2 + fl, 1, y >= -3 ? shade(cc, 0.7) : cc); if (vamp) { R(-w - (d > 0 ? fl : 0), y, 1, 1, [170, 20, 40]); R(w - 1 + (d > 0 ? 0 : fl), y, 1, 1, [170, 20, 40]); } }
      if (vamp) for (const sx of [-1, 1]) { R(sx * 13 - (sx < 0 ? 2 : 0), -21, 3, 8, [34, 26, 44]); R(sx * 13 - (sx < 0 ? 1 : 0), -20, 1, 6, [170, 20, 40]); } // the tall collar
    }
    // body
    for (let y = TOP; y <= -4; y++) {
      const hw = hwAt(y), row = y - TOP;
      R(-hw, y, hw * 2, 1, row === 0 ? hi : y >= -5 ? lo : body);
      if (row > 0 && row < 12) R(-hw, y, 1, 1, hi);
      if (y < -5) R(hw - 2, y, 2, 1, lo);
    }
    R(-8, -22, 2, 2, [255, 255, 255]); R(-6, -23, 1, 1, hi);
    for (let y = -12; y <= -6; y++) { const w = Math.round(6 * Math.sqrt(Math.max(0, 1 - ((y + 9) * (y + 9)) / 12.5))); if (w > 0) R(-w, y, w * 2, 1, belly); }
    // outfit
    if (look.fit === 1) { // lab coat
      for (let y = -13; y <= -4; y++) {
        const hw = hwAt(y) + 1, open = Math.max(0, 4 - (y + 13));
        R(-hw, y, hw * 2, 1, K.COAT); R(-hw, y, 1, 1, K.COAT_SH); R(hw - 1, y, 1, 1, K.COAT_SH);
        if (open > 0) R(-open, y, open * 2, 1, y < -11 ? body : belly);
        if (open > 0) { R(-open - 1, y, 1, 1, K.COAT_LN); R(open, y, 1, 1, K.COAT_LN); }
      }
      R(-hwAt(-4) - 1, -4, hwAt(-4) * 2 + 2, 1, K.COAT_LN); R(0, -9, 1, 5, K.COAT_LN); R(4, -8, 5, 1, K.COAT_LN); R(4, -8, 1, 3, K.COAT_LN); R(8, -8, 1, 3, K.COAT_LN);
      R(6, -9, 1, 2, [70, 110, 220]);
    } else if (look.fit === 4) { // hoodie: pouch pocket, drawstrings, the hood bunched behind the neck
      const hc: RGB = [80, 110, 210], hd = shade(hc, 0.72);
      for (let y = -13; y <= -4; y++) { const hw = hwAt(y) + 1; R(-hw, y, hw * 2, 1, y === -4 ? hd : hc); R(-hw, y, 1, 1, M(hc, [255, 255, 255], 0.25)); R(hw - 1, y, 1, 1, hd); }
      R(-hwAt(-14) - 1, -14, hwAt(-14) * 2 + 2, 1, hd); R(-5, -9, 10, 3, hd); R(-4, -9, 8, 1, shade(hc, 0.85));
      R(-2, -13, 1, 4, [236, 238, 250]); R(2, -13, 1, 3, [236, 238, 250]);
    } else if (look.fit === 5 || look.fit === 6) { // cape: collar + gold clasp (the vampire's is black with a red gem)
      R(-hwAt(-13), -13, hwAt(-13) * 2, 1, look.fit === 6 ? [34, 26, 44] : [200, 40, 60]); R(-2, -13, 4, 2, [255, 214, 90]); R(-1, -13, 1, 1, look.fit === 6 ? [230, 40, 60] : [255, 244, 190]);
    } else if (look.fit === 9) { // christmas jumper: red knit, a white zigzag band and a tree on the front
      const jr: RGB = [200, 40, 52], jd: RGB = [150, 26, 38];
      for (let y = -13; y <= -4; y++) { const hw = hwAt(y) + 1; R(-hw, y, hw * 2, 1, y === -4 ? jd : jr); R(hw - 1, y, 1, 1, jd); }
      for (let x = -12; x < 12; x++) R(x, -12 + ((x + 12) % 4 < 2 ? 0 : 1), 1, 1, K.WHITE);
      R(-1, -10, 2, 1, [60, 170, 90]); R(-2, -9, 4, 1, [60, 170, 90]); R(-3, -8, 6, 1, [60, 170, 90]); R(0, -7, 1, 1, [120, 80, 50]); lit(() => R(0, -11, 1, 1, K.GOLD));
      for (const x of [-9, -5, 5, 9]) R(x, -6, 1, 1, K.WHITE);
    } else if (look.fit === 8) { // rock star: a gold sequin jacket, open at the front, collar popped, a star on the chest
      for (let y = -13; y <= -4; y++) {
        const hw = hwAt(y) + 1, open = Math.max(0, 3 - Math.floor((y + 13) / 3));
        R(-hw, y, hw * 2, 1, (y + hw) % 2 ? SEQ : M(SEQ, SEQ_HI, 0.35)); R(-hw, y, 1, 1, SEQ_HI); R(hw - 1, y, 1, 1, SEQ_DK);
        if (open > 0) { R(-open, y, open * 2, 1, belly); R(-open - 1, y, 1, 1, SEQ_DK); R(open, y, 1, 1, SEQ_DK); }
      }
      R(-hwAt(-4) - 1, -4, hwAt(-4) * 2 + 2, 1, SEQ_DK);
      for (const sx of [-1, 1]) { R(sx < 0 ? -11 : 7, -16, 4, 3, SEQ); R(sx < 0 ? -11 : 7, -16, 4, 1, SEQ_HI); } // the popped collar
      lit(() => { R(6, -10, 3, 1, K.MAG); R(7, -11, 1, 3, K.MAG); }); // a little star
      sequins(R, -11, 11, -12, -5, P);
    } else if (look.fit === 7) { // skeleton suit: black with white bones
      const sk: RGB = [30, 28, 40], bn: RGB = [236, 232, 220];
      for (let y = -13; y <= -4; y++) { const hw = hwAt(y) + 1; R(-hw, y, hw * 2, 1, sk); }
      R(0, -13, 1, 8, bn); for (const y of [-12, -10, -8]) { R(-6, y, 5, 1, bn); R(2, y, 5, 1, bn); } R(-3, -5, 7, 1, bn); R(-4, -4, 2, 1, bn); R(3, -4, 2, 1, bn);
    } else if (look.fit === 2) { // scarf
      const sc: RGB = [220, 64, 76], st: RGB = [255, 210, 120];
      for (let y = -13; y <= -11; y++) { const hw = hwAt(y) + 1; R(-hw, y, hw * 2, 1, sc); }
      for (let x = -12; x < 12; x += 5) R(x, -13, 2, 3, st);
      const tx = d > 0 ? -7 : 4, fl = Math.round(P.ant * -0.6);
      R(tx + fl, -11, 4, 7, sc); R(tx + fl, -7, 4, 1, st); R(tx + fl, -4, 1, 1, sc); R(tx + fl + 2, -4, 1, 1, sc);
    } else if (look.fit === 3) { // bow tie
      const bc: RGB = [123, 97, 255];
      R(-4, -13, 3, 3, bc); R(2, -13, 3, 3, bc); R(-1, -12, 3, 2, shade(bc, 0.75)); R(-4, -13, 1, 1, M(bc, [255, 255, 255], 0.4));
    }
    // face
    const ey = -20, ex = [-7 + d, 3 + d];
    const blushC = M(body, K.PINK, 0.45 + 0.55 * P.blush);
    R(-11 + d, -15, 3, 1, blushC); R(8 + d, -15, 3, 1, blushC);
    for (const x of ex) {
      switch (P.eyes) {
        case 'b': R(x, ey + 2, 3, 1, K.EYE); break;
        case 'h': R(x, ey + 2, 1, 1, K.EYE); R(x + 1, ey + 1, 1, 1, K.EYE); R(x + 2, ey + 2, 1, 1, K.EYE); break;
        case 'w': R(x, ey - 1, 3, 5, K.EYE); R(x + 1, ey, 1, 1, K.WHITE); break;
        case 's': R(x - 1, ey - 1, 5, 5, K.EYE); R(x, ey, 2, 1, K.WHITE); R(x + 2, ey + 2, 1, 1, K.WHITE); break;
        default: R(x, ey, 3, 4, K.EYE); R(x, ey, 1, 1, K.WHITE);
      }
    }
    const mx = d;
    if (P.mouth === 'o') R(mx - 1, -15, 2, 2, K.EYE);
    else if (P.mouth === 'O') { R(mx - 2, -16, 4, 4, K.EYE); R(mx - 1, -14, 2, 1, [225, 95, 105]); }
    else if (P.mouth === 'f') R(mx - 1, -14, 3, 1, K.EYE);
    else { R(mx - 1, -14, 2, 1, K.EYE); R(mx - 2, -15, 1, 1, K.EYE); R(mx + 1, -15, 1, 1, K.EYE); }
    if (look.face === 1) { // glasses
      for (const x of ex) { R(x - 2, ey - 2, 7, 1, K.BLACK); R(x - 2, ey + 4, 7, 1, K.BLACK); R(x - 2, ey - 2, 1, 7, K.BLACK); R(x + 4, ey - 2, 1, 7, K.BLACK); R(x - 1, ey - 1, 1, 1, K.WHITE); }
      R(ex[0] + 5, ey, ex[1] - ex[0] - 5 - 2 + 1, 1, K.BLACK);
    } else if (look.face === 2) { // goggles
      const hw = 12; R(-hw, ey - 1, hw * 2, 2, [58, 62, 72]);
      for (const x of ex) { R(x - 2, ey - 2, 7, 7, [70, 76, 88]); R(x - 1, ey - 1, 5, 5, [120, 220, 235]); R(x - 1, ey - 1, 2, 1, K.WHITE); R(x + 1, ey + 1, 2, 2, [30, 60, 70]); }
    } else if (look.face === 3) { // shades
      for (const x of ex) { R(x - 1, ey - 1, 5, 4, K.BLACK); R(x, ey, 1, 1, [120, 130, 160]); }
      R(ex[0] + 4, ey - 1, ex[1] - ex[0] - 5, 1, K.BLACK);
    } else if (look.face >= 4) extraFace(R, look.face, ex, ey, mx, -16);
    // hats
    if (look.hat >= 6) { const b = extraHat(R, look.hat, -23, d, P, bulbCol); if (b) bulb = b; }
    else if (look.hat === 1) { // hard hat
      const rows = [16, 18, 20, 22]; rows.forEach((w, j) => R(-w / 2, -31 + j, w, 1, K.YEL)); R(-14, -27, 28, 2, K.YEL_DK); R(-1, -31, 2, 4, K.YEL_HI); R(-8, -30, 3, 1, K.YEL_HI);
    } else if (look.hat === 2) { // beanie with a glowing pompom
      const bc: RGB = [210, 60, 70], bh: RGB = [240, 110, 110];
      for (let y = -31; y <= -24; y++) { const hw = Math.min(12, 6 + (y + 31) * 2); R(-hw, y, hw * 2, 1, y >= -26 ? bh : bc); }
      for (let x = -10; x < 11; x += 3) R(x, -25, 1, 2, bc);
      lit(() => { R(-2, -35, 5, 4, M(bulbCol, [255, 255, 255], P.flare * 0.8)); R(-1, -36, 3, 1, bulbCol); R(-1, -35, 1, 1, [255, 255, 255]); });
      bulb = [0, -33];
    } else if (look.hat === 3) { // headphones
      for (let x = -13; x <= 13; x++) { const y = -19 - Math.round(9 * Math.sqrt(Math.max(0, 1 - (x * x) / 182))); R(x, y, 1, 2, [40, 44, 60]); }
      for (const cx of [-16, 13]) { R(cx, -23, 4, 8, [40, 44, 60]); R(cx + (cx < 0 ? 1 : 0), -22, 3, 6, [255, 95, 210]); R(cx + (cx < 0 ? 1 : 0), -22, 3, 1, [255, 160, 230]); }
    } else if (look.hat === 5) crown(R, -27);
    // arms last so raised arms read over the head outline
    if (P.arm === 'wave') { arm(-1, false, 0); arm(1, true, Math.round(P.wave)); }
    else if (P.arm === 'up') { arm(-1, true, 0); arm(1, true, 0); }
    else { arm(-1, false, 0); arm(1, false, 0); }
  });
  PX.dim = pd; PX.emit = pe; PX.fl = pf;
  outline(src, out, sil, '#160C2C');
  const top = look.hat >= 6 ? -23 - HAT_TALL[look.hat - 6] : look.hat === 2 ? -37 : look.hat === 1 ? -40 : look.hat === 5 ? -39 : -34;
  return { cv: out, ox: OX, oy: OY, bulb, bulbCol, top, hand: P.dir > 0 ? [16, -12] : [-17, -12], mouth: [P.dir, -14] };
}

/** Hats that hide the critter's antenna. */
const COVERS = new Set([2, 6, 7, 8, 9, 11, 12, 13, 15, 17]);
/** Sleeve colours (main, shade) for outfits with sleeves. */
const SLEEVES: Record<number, [RGB, RGB]> = { 1: [K.COAT, K.COAT_SH], 4: [[80, 110, 210], [58, 79, 151]], 7: [[30, 28, 40], [236, 232, 220]], 8: [[236, 190, 60], [184, 136, 30]], 9: [[200, 40, 52], [150, 26, 38]] };
/** The ROCK STAR jacket's gold sequins and the twinkles on them (they catch the light as you move). */
const SEQ: RGB = [236, 190, 60], SEQ_DK: RGB = [184, 136, 30], SEQ_HI: RGB = [255, 236, 150];
function sequins(R: (x: number, y: number, w: number, h: number, c: RGB) => void, x0: number, x1: number, y0: number, y1: number, P: Pose): void {
  const ph = Math.floor((P.ant + P.wave) * 2 + P.lift * 3);
  lit(() => { for (let k = 0; k < 5; k++) { const x = x0 + ((k * 7 + ph * 3) % Math.max(1, x1 - x0)), y = y0 + ((k * 5 + ph) % Math.max(1, y1 - y0)); R(x, y, 1, 1, k % 2 ? K.WHITE : SEQ_HI); } });
}
/** How far each prize hat (6..10) rises above its brim row. */
const HAT_TALL = [14, 10, 17, 13, 16, 16, 9, 15, 15, 16, 14, 16];
type Rect = (x: number, y: number, w: number, h: number, c: RGB) => void;

/** The claw machine hats (6..10), brim on row `b`. Returns where its glowing bit is, if any. */
function extraHat(R: Rect, hat: number, b: number, d: number, P: Pose, bulbCol: RGB): [number, number] | null {
  if (hat === 6) { // party hat: striped cone with a glowing pompom
    for (let j = 0; j < 11; j++) { const w = Math.max(1, Math.round(12 * (1 - j / 11))); R(-Math.floor(w / 2), b - j, w, 1, (j >> 1) % 2 ? [255, 214, 90] : [255, 95, 170]); if (w > 2) R(-Math.floor(w / 2), b - j, 1, 1, [255, 240, 250]); }
    lit(() => { R(-1, b - 13, 3, 3, M(bulbCol, [255, 255, 255], 0.5 + P.flare * 0.5)); R(-1, b - 13, 1, 1, [255, 255, 255]); });
    return [0, b - 12];
  }
  if (hat === 7) { // cowboy: dented crown, band, brim curled up at the ends
    const br: RGB = [150, 96, 52], bl: RGB = [184, 124, 72], bd: RGB = [96, 60, 32];
    for (let y = b - 8; y < b; y++) { const w = y === b - 8 ? 14 : 16; R(-w / 2, y, w, 1, br); R(-w / 2, y, 1, 1, bl); }
    R(-1, b - 8, 2, 1, bd); R(-8, b - 2, 16, 1, bd);
    R(-15, b, 30, 2, br); R(-15, b, 30, 1, bl); R(-16, b - 1, 2, 2, br); R(14, b - 1, 2, 2, br);
    return null;
  }
  if (hat === 8) { // wizard: tall droopy cone with stars
    const wc: RGB = [110, 80, 210], wl: RGB = [150, 125, 240];
    R(-13, b, 26, 2, shade(wc, 0.7));
    for (let j = 1; j < 16; j++) { const w = Math.max(2, Math.round(16 * (1 - j / 16))), sh = -d * Math.round((j * j) / 45); R(sh - Math.floor(w / 2), b - j, w, 1, wc); R(sh - Math.floor(w / 2), b - j, 1, 1, wl); }
    lit(() => { R(-4, b - 4, 1, 1, [255, 236, 140]); R(3, b - 7, 1, 1, [255, 236, 140]); R(-1, b - 10, 1, 1, [255, 255, 255]); });
    return null;
  }
  if (hat === 9) { // top hat
    const tc: RGB = [40, 36, 52], tl: RGB = [84, 78, 104];
    R(-7, b - 11, 14, 11, tc); R(-7, b - 11, 14, 1, tl); R(-7, b - 10, 1, 10, tl); R(-7, b - 3, 14, 2, [200, 40, 60]);
    R(-12, b, 24, 2, tc); R(-12, b, 24, 1, tl);
    return null;
  }
  if (hat === 11) { // witch hat: wide brim, bent cone, purple band, gold buckle
    const wc: RGB = [36, 28, 50], wl: RGB = [70, 56, 96];
    R(-14, b, 28, 2, wc); R(-14, b, 28, 1, wl);
    for (let j = 1; j < 15; j++) { const w = Math.max(2, Math.round(14 * (1 - j / 15))), sh = j > 9 ? -d * (j - 9) : 0; R(sh - Math.floor(w / 2), b - j, w, 1, wc); R(sh - Math.floor(w / 2), b - j, 1, 1, wl); }
    R(-7, b - 2, 14, 2, [123, 97, 255]); R(-2, b - 3, 4, 4, [255, 214, 90]); R(-1, b - 2, 2, 2, wc);
    return null;
  }
  if (hat === 12) { // pumpkin head: a carved jack-o'-lantern over the whole head, candle-lit face
    const o: RGB = [240, 130, 40], od: RGB = [196, 92, 26], cy = b + 4;
    for (let y = -10; y <= 10; y++) { const w = Math.round(14 * Math.sqrt(Math.max(0, 1 - (y * y) / 110))); if (w > 0) R(-w, cy + y, w * 2, 1, y > 6 ? od : o); }
    for (const rx of [-6, 0, 6]) R(rx, cy - 9, 1, 18, od);
    R(-1, cy - 13, 3, 4, [80, 140, 60]); R(1, cy - 14, 2, 1, [110, 170, 80]);
    lit(() => { const f: RGB = [255, 220, 90]; for (const ex of [-7 + d, 3 + d]) { R(ex, cy - 4, 4, 1, f); R(ex + 1, cy - 5, 2, 1, f); } R(-6 + d, cy + 3, 12, 2, f); R(-4 + d, cy + 5, 2, 1, f); R(2 + d, cy + 5, 2, 1, f); R(-2 + d, cy + 2, 2, 1, od); });
    return null;
  }
  if (hat === 13) { // chef hat: a tall puffy white toque on a band
    const w: RGB = [246, 246, 250], sh: RGB = [206, 210, 222];
    R(-8, b - 3, 16, 3, w); R(-8, b - 1, 16, 1, sh); R(-8, b - 3, 16, 1, [255, 255, 255]);
    for (let j = 3; j < 15; j++) { const hw = j < 10 ? 7 : 7 + Math.round(Math.sqrt(Math.max(0, 9 - (j - 12) * (j - 12)))) - (j > 13 ? 3 : 0); R(-hw, b - j, hw * 2, 1, w); R(hw - 2, b - j, 2, 1, sh); }
    R(-3, b - 14, 1, 2, sh); R(2, b - 13, 1, 2, sh); R(-6, b - 12, 12, 1, [255, 255, 255]);
    return null;
  }
  if (hat === 15) { // santa hat: red, a white fur band, flopping over with a bobble
    const rd: RGB = [214, 44, 56], rh: RGB = [240, 90, 96], w: RGB = [246, 246, 250];
    R(-12, b - 3, 24, 4, w); R(-12, b - 3, 24, 1, K.WHITE); R(-12, b, 24, 1, [210, 214, 226]);
    for (let j = 4; j < 14; j++) { const hw = Math.max(1, Math.round(11 * (1 - (j - 4) / 11))), sh = -d * Math.round(((j - 4) * (j - 4)) / 12); R(sh - hw, b - j, hw * 2, 1, rd); R(sh - hw, b - j, 1, 1, rh); }
    const tx = -d * 9, ty = b - 11; R(tx - 2, ty - 2, 5, 5, w); R(tx - 1, ty - 3, 3, 1, w); R(tx - 2, ty - 2, 2, 1, K.WHITE);
    return null;
  }
  if (hat === 16) { // reindeer antlers on a brown band
    const br: RGB = [150, 100, 60], bl: RGB = [184, 136, 84];
    R(-11, b - 1, 22, 2, [120, 80, 50]);
    for (const s of [-1, 1]) { const x0 = s * 7; for (let j = 0; j < 12; j++) R(x0 + s * Math.floor(j / 4), b - 2 - j, 2, 1, j % 3 ? br : bl); R(x0 + s * 2, b - 9, s * 5 || 1, 2, br); R(x0 + s * 6, b - 12, 2, 3, br); R(x0 + s * 1, b - 14, s * 4 || 1, 1, bl); }
    return null;
  }
  if (hat === 17) { // elf hat: green, a curly tip with a bell, a red band
    const g: RGB = [60, 170, 90], gl: RGB = [100, 210, 120];
    R(-11, b - 2, 22, 3, [214, 44, 56]); R(-11, b - 2, 22, 1, [240, 90, 96]);
    for (let j = 3; j < 16; j++) { const hw = Math.max(1, Math.round(10 * (1 - (j - 3) / 13))), sh = d * Math.round(((j - 3) * (j - 3)) / 30); R(sh - hw, b - j, hw * 2, 1, g); R(sh - hw, b - j, 1, 1, gl); }
    lit(() => { const bx = d * 6, by = b - 16; R(bx - 1, by - 1, 3, 3, [255, 214, 90]); R(bx - 1, by - 1, 1, 1, K.WHITE); });
    return [d * 6, b - 16];
  }
  if (hat === 14) { // space helmet: a glass fishbowl over the whole head (antenna and all) on a metal collar
    const rim: RGB = [200, 236, 255], rim2: RGB = [150, 200, 235], cy = b + 5, rad = 17;
    for (let k = 0; k < 64; k++) {
      const an = Math.PI * (0.92 + (k / 63) * 1.16), x = Math.round(Math.cos(an) * rad), y = Math.round(cy + Math.sin(an) * rad);
      R(x, y, 1, 1, an > Math.PI * 1.3 && an < Math.PI * 1.55 ? [255, 255, 255] : an > Math.PI * 1.6 ? rim2 : rim);
    }
    for (const s of [-1, 1]) R(s < 0 ? -rad : rad - 1, cy, 1, 4, rim2); // down the sides to the collar
    lit(() => { R(-11, cy - 9, 2, 1, [255, 255, 255]); R(-12, cy - 8, 1, 3, [255, 255, 255]); R(-9, cy - 12, 3, 1, [230, 246, 255]); }); // the shine, top-left
    const col: RGB = [150, 158, 172], colHi: RGB = [200, 206, 216], y0 = cy + 4;
    R(-rad, y0, rad * 2, 3, col); R(-rad, y0, rad * 2, 1, colHi); R(-rad, y0 + 2, rad * 2, 1, shade(col, 0.75));
    R(-3, y0 + 1, 2, 1, [124, 242, 156]); R(2, y0 + 1, 2, 1, [255, 90, 90]); // status lights on the collar
    return null;
  }
  // halo: a glowing gold ring bobbing over the head
  const y = b - 15 + Math.round(Math.sin(P.ant * 0.7 + P.wave) * 0.6), g: RGB = [255, 236, 140];
  lit(() => { R(-5, y, 10, 1, g); R(-8, y + 1, 3, 1, g); R(5, y + 1, 3, 1, g); R(-5, y + 2, 10, 1, [255, 214, 90]); });
  return [0, y + 1];
}

/** The prize face items: 4 mustache, 5 monocle (around the second eye), 6 fangs, 7 skull mask. */
function extraFace(R: Rect, face: number, ex: number[], ey: number, mx: number, my: number): void {
  if (face === 6) { R(mx - 2, my + 2, 1, 2, K.WHITE); R(mx + 1, my + 2, 1, 2, K.WHITE); return; }
  if (face === 8) { lit(() => { R(mx - 2, my - 2, 4, 3, [236, 40, 50]); R(mx - 1, my - 3, 2, 1, [236, 40, 50]); R(mx - 1, my - 2, 1, 1, [255, 170, 170]); }); return; } // red nose, glowing
  if (face === 7) {
    const w: RGB = [236, 232, 220], x0 = ex[0] - 3, x1 = ex[1] + 6;
    R(x0 + 1, ey - 3, x1 - x0 - 2, 1, w); R(x0, ey - 2, x1 - x0, 9, w); R(x0 + 2, ey + 7, x1 - x0 - 4, 2, w);
    for (const x of ex) R(x - 1, ey - 1, 5, 4, [20, 16, 28]);
    R(mx - 1, ey + 4, 2, 2, [20, 16, 28]); for (let k = 0; k < 4; k++) R(x0 + 3 + k * 3 + (x1 - x0 - 16) / 2, ey + 7, 1, 2, [120, 116, 110]);
    return;
  }
  if (face === 4) { const c: RGB = [92, 58, 40]; R(mx - 5, my, 4, 2, c); R(mx + 2, my, 4, 2, c); R(mx - 1, my, 3, 1, c); R(mx - 6, my - 1, 1, 1, c); R(mx + 6, my - 1, 1, 1, c); R(mx - 4, my, 2, 1, [130, 88, 62]); return; }
  const x = ex[1], g: RGB = [255, 214, 90];
  R(x - 2, ey - 2, 7, 1, g); R(x - 2, ey + 4, 7, 1, g); R(x - 2, ey - 2, 1, 7, g); R(x + 4, ey - 2, 1, 7, g); R(x - 1, ey - 1, 1, 1, K.WHITE);
  for (let k = 0; k < 5; k++) R(x + 4 + (k >> 1), ey + 5 + k, 1, 1, k % 2 ? [184, 144, 42] : g);
}

/** The Crypt's crown: gold band with points and three gems, sitting with its base at y = `base`. */
function crown(R: (x: number, y: number, w: number, h: number, c: RGB) => void, base: number): void {
  const gd: RGB = [255, 214, 90], gdk: RGB = [184, 144, 42];
  R(-8, base - 4, 16, 4, gd); R(-8, base - 1, 16, 1, gdk); for (const cx of [-8, -3, 2, 6]) R(cx, base - 7, 2, 3, gd); R(-1, base - 8, 2, 4, gd); R(-8, base - 4, 16, 1, [255, 240, 170]);
  lit(() => { R(-6, base - 3, 2, 2, [230, 50, 60]); R(-1, base - 3, 2, 2, [90, 209, 255]); R(4, base - 3, 2, 2, [124, 242, 156]); });
}

/**
 * Clawd: a flat-topped block on a 3px grid — 8x6 cell body, square nub arms on cells 2-3,
 * two square eyes on row 1, four legs (cells 0,2,5,7) two cells tall. No antenna or mouth:
 * the eyes, arms and legs carry every pose. Same outline, light and transform as the critter.
 */
function composeClawd(look: Look, P: Pose, dim: number): Composed {
  const body = BODY[look.c]?.c ?? BODY[0].c;
  const hi = M(body, [255, 255, 255], 0.22), lo = shade(body, 0.8), lo2 = shade(body, 0.6);
  const bulbCol = M(body, [255, 255, 255], 0.6);
  let clawdBulb: [number, number] | null = null;
  const pd = PX.dim, pe = PX.emit, pf = PX.fl;
  PX.dim = dim; PX.emit = false; PX.fl = 0;
  sctx.clearRect(0, 0, SW, SH);
  withCtx(sctx, () => {
    const R = (x: number, y: number, w: number, h: number, c: RGB) => r(OX + x, OY + y, w, h, c);
    const d = P.dir;
    // legs: outer-left + inner-right lift together, then the other pair
    [-12, -6, 3, 9].forEach((lx, i) => {
      const up = P.lift === (i % 2 ? 2 : 1) ? 2 : 0;
      R(lx, -6, 3, 6 - up, body); R(lx + 2, -6, 1, 6 - up, lo); R(lx, -1 - up, 3, 1, lo2);
    });
    if (look.fit === 5 || look.fit === 6) { // cape behind the block
      const vamp = look.fit === 6, cc: RGB = vamp ? [34, 26, 44] : [200, 40, 60], fl = Math.round(Math.abs(P.ant) * 0.8);
      for (let y = -18; y <= -3; y++) { const w = 14 + Math.floor((y + 18) / 5); R(-w - (d > 0 ? fl : 0), y, w * 2 + fl, 1, y >= -4 ? shade(cc, 0.7) : cc); if (vamp) { R(-w - (d > 0 ? fl : 0), y, 1, 1, [170, 20, 40]); R(w - 1 + (d > 0 ? 0 : fl), y, 1, 1, [170, 20, 40]); } }
      if (vamp) for (const sx of [-1, 1]) { R(sx * 14 - (sx < 0 ? 2 : 0), -29, 3, 10, [34, 26, 44]); R(sx * 14 - (sx < 0 ? 1 : 0), -28, 1, 8, [170, 20, 40]); }
    }
    // body
    R(-12, -24, 24, 18, body); R(-12, -24, 24, 1, hi); R(-12, -23, 1, 16, hi);
    R(10, -23, 2, 17, lo); R(-11, -7, 21, 1, lo);
    // arms: a nub on each side; raised = lifted to the top corner (overlaps the body 1px so a sway never opens a gap)
    const arm = (side: -1 | 1, raised: boolean, sway: number) => {
      const ax = (side < 0 ? (raised ? -17 : -18) : (raised ? 11 : 12)) + sway, ay = raised ? -27 : -18;
      R(ax, ay, 6, 6, body); R(ax, ay, 6, 1, hi); R(ax, ay + 5, 6, 1, lo);
      if (side > 0) R(ax + 5, ay + 1, 1, 4, lo); else R(ax, ay + 1, 1, 4, hi);
    };
    // outfit (under the arms, so the nubs read on top)
    if (look.fit === 1) { // lab coat: open down the front, hem over the tops of the legs
      for (let y = -15; y <= -5; y++) {
        const open = Math.max(0, Math.min(5, y + 13));
        R(-13, y, 26, 1, K.COAT); R(-13, y, 1, 1, K.COAT_SH); R(12, y, 1, 1, K.COAT_SH);
        if (open > 0 && y < -6) { R(-open, y, open * 2, 1, body); R(-open - 1, y, 1, 1, K.COAT_LN); R(open, y, 1, 1, K.COAT_LN); }
      }
      R(-13, -5, 26, 1, K.COAT_LN); R(5, -12, 5, 1, K.COAT_LN); R(5, -12, 1, 3, K.COAT_LN); R(9, -12, 1, 3, K.COAT_LN); R(7, -13, 1, 2, [70, 110, 220]);
    } else if (look.fit === 4) { // hoodie
      const hc: RGB = [80, 110, 210], hd = shade(hc, 0.72);
      for (let y = -15; y <= -5; y++) { R(-13, y, 26, 1, y === -5 ? hd : hc); R(-13, y, 1, 1, M(hc, [255, 255, 255], 0.25)); R(12, y, 1, 1, hd); }
      R(-6, -11, 12, 3, hd); R(-5, -11, 10, 1, shade(hc, 0.85)); R(-2, -15, 1, 4, [236, 238, 250]); R(2, -15, 1, 3, [236, 238, 250]);
    } else if (look.fit === 5 || look.fit === 6) { // cape collar + clasp
      R(-12, -16, 24, 1, look.fit === 6 ? [34, 26, 44] : [200, 40, 60]); R(-2, -16, 4, 2, [255, 214, 90]); R(-1, -16, 1, 1, look.fit === 6 ? [230, 40, 60] : [255, 244, 190]);
    } else if (look.fit === 9) { // christmas jumper
      const jr: RGB = [200, 40, 52], jd: RGB = [150, 26, 38];
      R(-13, -15, 26, 11, jr); R(-13, -5, 26, 1, jd); R(12, -15, 1, 11, jd);
      for (let x = -13; x < 13; x++) R(x, -14 + ((x + 13) % 4 < 2 ? 0 : 1), 1, 1, K.WHITE);
      R(-1, -12, 2, 1, [60, 170, 90]); R(-2, -11, 4, 1, [60, 170, 90]); R(-3, -10, 6, 1, [60, 170, 90]); R(0, -9, 1, 1, [120, 80, 50]); lit(() => R(0, -13, 1, 1, K.GOLD));
      for (const x of [-10, -6, 6, 10]) R(x, -7, 1, 1, K.WHITE);
    } else if (look.fit === 8) { // rock star jacket
      for (let y = -15; y <= -5; y++) { const open = Math.max(0, 3 - Math.floor((y + 15) / 3)); R(-13, y, 26, 1, (y % 2) ? SEQ : M(SEQ, SEQ_HI, 0.35)); R(-13, y, 1, 1, SEQ_HI); R(12, y, 1, 1, SEQ_DK); if (open > 0) { R(-open, y, open * 2, 1, body); R(-open - 1, y, 1, 1, SEQ_DK); R(open, y, 1, 1, SEQ_DK); } }
      R(-13, -5, 26, 1, SEQ_DK); for (const sx of [-1, 1]) { R(sx < 0 ? -13 : 9, -18, 4, 3, SEQ); R(sx < 0 ? -13 : 9, -18, 4, 1, SEQ_HI); }
      lit(() => { R(6, -12, 3, 1, K.MAG); R(7, -13, 1, 3, K.MAG); });
      sequins(R, -12, 12, -14, -6, P);
    } else if (look.fit === 7) { // skeleton suit
      const sk: RGB = [30, 28, 40], bn: RGB = [236, 232, 220];
      R(-13, -15, 26, 11, sk); R(0, -15, 1, 8, bn); for (const y of [-14, -12, -10]) { R(-7, y, 6, 1, bn); R(2, y, 6, 1, bn); } R(-3, -7, 7, 1, bn); R(-4, -6, 2, 1, bn); R(3, -6, 2, 1, bn);
    } else if (look.fit === 2) { // scarf: a band under the eyes with a fluttering tail
      const sc: RGB = [220, 64, 76], st: RGB = [255, 210, 120];
      R(-13, -16, 26, 3, sc); for (let x = -11; x < 12; x += 5) R(x, -16, 2, 3, st);
      const tx = d > 0 ? -9 : 5, fl = Math.round(P.ant * -0.6 + Math.sin(P.wave) * 0.5);
      R(tx + fl, -13, 4, 7, sc); R(tx + fl, -9, 4, 1, st); R(tx + fl, -6, 1, 1, sc); R(tx + fl + 2, -6, 1, 1, sc);
    } else if (look.fit === 3) { // bow tie
      const bc: RGB = [123, 97, 255];
      R(-4, -16, 3, 3, bc); R(2, -16, 3, 3, bc); R(-1, -15, 3, 2, shade(bc, 0.75)); R(-4, -16, 1, 1, M(bc, [255, 255, 255], 0.4));
    }
    const sleeve = SLEEVES[look.fit] ?? null;
    const arm2 = (side: -1 | 1, raised: boolean, sway: number) => {
      if (!sleeve) return arm(side, raised, sway);
      const ax = (side < 0 ? (raised ? -17 : -18) : (raised ? 11 : 12)) + sway, ay = raised ? -27 : -18;
      R(ax, ay, 6, 6, sleeve[0]); R(ax, ay + 5, 6, 1, sleeve[1]); if (side > 0) R(ax + 5, ay, 1, 6, sleeve[1]); R(side < 0 ? ax : ax + 4, ay + 2, 2, 2, body);
    };
    if (P.arm === 'wave') { arm2(-1, false, 0); arm2(1, true, Math.round(P.wave)); }
    else if (P.arm === 'up') { arm2(-1, true, 0); arm2(1, true, 0); }
    else { arm2(-1, false, 0); arm2(1, false, 0); }
    // eyes (shift with dir instead of mirroring, so the light stays top-left)
    const ey = -21, ex = [-9 + d, 6 + d];
    for (const x of ex) {
      switch (P.eyes) {
        case 'b': R(x, ey + 2, 3, 1, K.EYE); break;
        case 'h': R(x, ey + 1, 1, 1, K.EYE); R(x + 1, ey, 1, 1, K.EYE); R(x + 2, ey + 1, 1, 1, K.EYE); break;
        case 'w': R(x, ey - 1, 3, 4, K.EYE); R(x, ey - 1, 1, 1, K.WHITE); break;
        case 's': R(x - 1, ey - 1, 5, 5, K.EYE); R(x, ey, 1, 1, K.WHITE); R(x + 2, ey + 2, 1, 1, K.WHITE); break;
        default: R(x, ey, 3, 3, K.EYE);
      }
      if (P.blush > 0) R(x, ey + 5, 3, 1, M(body, K.PINK, 0.3 + 0.5 * P.blush));
    }
    // face items, sized to the 3x3 eyes
    if (look.face === 1) { // glasses
      for (const x of ex) { R(x - 2, ey - 2, 7, 1, K.BLACK); R(x - 2, ey + 4, 7, 1, K.BLACK); R(x - 2, ey - 2, 1, 7, K.BLACK); R(x + 4, ey - 2, 1, 7, K.BLACK); R(x - 1, ey - 1, 1, 1, K.WHITE); }
      R(ex[0] + 5, ey, ex[1] - ex[0] - 7, 1, K.BLACK);
    } else if (look.face === 2) { // goggles on a strap
      R(-12, ey - 1, 24, 2, [58, 62, 72]);
      for (const x of ex) { R(x - 2, ey - 2, 7, 7, [70, 76, 88]); R(x - 1, ey - 1, 5, 5, [120, 220, 235]); R(x - 1, ey - 1, 2, 1, K.WHITE); R(x, ey, 3, 3, [30, 60, 70]); }
    } else if (look.face === 3) { // shades
      for (const x of ex) { R(x - 1, ey - 1, 5, 4, K.BLACK); R(x, ey, 1, 1, [120, 130, 160]); }
      R(ex[0] + 4, ey - 1, ex[1] - ex[0] - 5, 1, K.BLACK);
    } else if (look.face >= 4) extraFace(R, look.face, ex, ey, d - 1, -16);
    // hats sit on the flat top (y = -24)
    if (look.hat >= 6) clawdBulb = extraHat(R, look.hat, -25, d, P, bulbCol);
    else if (look.hat === 1) { // hard hat
      [14, 18, 20, 22].forEach((w, j) => R(-w / 2, -30 + j, w, 1, K.YEL)); R(-15, -26, 30, 2, K.YEL_DK); R(-1, -30, 2, 4, K.YEL_HI); R(-7, -29, 3, 1, K.YEL_HI);
    } else if (look.hat === 2) { // beanie with a glowing pompom
      const bc: RGB = [210, 60, 70], bh: RGB = [240, 110, 110];
      for (let y = -30; y <= -22; y++) { const hw = Math.min(13, 7 + (y + 30) * 3); R(-hw, y, hw * 2, 1, y >= -24 ? bh : bc); }
      for (let x = -11; x < 12; x += 3) R(x, -24, 1, 3, bc);
      lit(() => { R(-2, -34, 5, 4, M(bulbCol, [255, 255, 255], P.flare * 0.8)); R(-1, -35, 3, 1, bulbCol); R(-1, -34, 1, 1, [255, 255, 255]); });
    } else if (look.hat === 3) { // headphones
      for (let x = -13; x <= 13; x++) { const y = -24 - Math.round(6 * Math.sqrt(Math.max(0, 1 - (x * x) / 182))); R(x, y, 1, 2, [40, 44, 60]); }
      for (const cx of [-16, 12]) { R(cx, -25, 4, 8, [40, 44, 60]); R(cx + (cx < 0 ? 1 : 0), -24, 3, 6, [255, 95, 210]); R(cx + (cx < 0 ? 1 : 0), -24, 3, 1, [255, 160, 230]); }
    } else if (look.hat === 5) crown(R, -25);
    else if (look.hat === 4) { // sprout
      const sw = Math.round(P.ant * 0.5);
      R(sw, -30, 1, 6, [60, 150, 80]); R(sw - 4, -31, 4, 2, [82, 176, 104]); R(sw - 3, -32, 2, 1, [120, 210, 130]); R(sw + 1, -32, 4, 2, [60, 150, 80]); R(sw + 2, -33, 2, 1, [82, 176, 104]);
    }
  });
  PX.dim = pd; PX.emit = pe; PX.fl = pf;
  outline(src, out, sil, '#160C2C');
  // no antenna: the "idea" glow + sparkles hover above the head only while it's lit
  const bulb: [number, number] | null = clawdBulb ?? (look.hat === 2 ? [0, -32] : P.flare > 0.05 ? [0, -30] : null);
  const top = look.hat >= 6 ? -25 - HAT_TALL[look.hat - 6] : look.hat === 1 ? -34 : look.hat === 2 ? -37 : look.hat === 4 ? -35 : look.hat === 3 ? -33 : look.hat === 5 ? -37 : -30;
  return { cv: out, ox: OX, oy: OY, bulb, bulbCol, top, hand: P.dir > 0 ? [19, -15] : [-20, -15], mouth: [P.dir, -16] };
}

/**
 * Compose and stamp a critter into the current world context with the film's transform:
 * squash (sy) keeps volume (sx = 1/sqrt(sy)), lean is a shear. Returns a mapper from local
 * sprite coords to world coords (for name tags, glows, bubbles).
 */
export function stampCritter(look: Look, P: Pose, x: number, y: number, dim: number): { TX: (lx: number, ly: number) => [number, number]; c: Composed } {
  const c = composeCritter(look, P, dim);
  const sy = P.sy, sx = P.sx / Math.sqrt(sy), k = -P.lean / 24;
  const ax = Math.round(x), ay = Math.round(y);
  const g = PX.ctx;
  g.setTransform(sx, 0, k * sy, sy, ax, ay);
  g.drawImage(c.cv, -c.ox, -c.oy);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const TX = (lx: number, ly: number): [number, number] => [ax + sx * lx + k * sy * ly, ay + sy * ly];
  return { TX, c };
}
