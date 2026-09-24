// The player character. The default is an ORIGINAL design (a round "lab critter" with an antenna bulb and
// two stubby feet); `composeClawd` below is the optional Clawd body. Both are drawn with the film's rules — hard pixel rects, fixed top-left light,
// 1px dark outline, squash/stretch/lean applied as a transform after composing.
//
// Local sprite space: (0,0) is the point between the feet on the floor. x right, y up is negative.

import { BODY, K, type RGB } from '../engine/palette';
import { PX, mk, r, M, shade, outline, withCtx, lit } from '../engine/pixel';

export interface Look { c: number; hat: number; face: number; fit: number; sp: number; /** 0 none, 1 pet pigeon */ pet?: number }
export const PETS = ['NONE', 'PIGEON'] as const;
/** Which character body. 0 = the lab critter, 1 = Clawd. Both wear every hat, face item and outfit. */
export const SPECIES = ['CRITTER', 'CLAWD'] as const;
export const HATS = ['NONE', 'HARD HAT', 'BEANIE', 'HEADPHONES', 'SPROUT', 'CROWN'] as const;
/** Hats you have to find first (the CROWN is in the Crypt). */
export const LOCKED_HATS = new Set([5]);
export const FACES = ['NONE', 'GLASSES', 'GOGGLES', 'SHADES'] as const;
export const FITS = ['NONE', 'LAB COAT', 'SCARF', 'BOW TIE'] as const;
export const DEFAULT_LOOK: Look = { c: 0, hat: 0, face: 0, fit: 1, sp: 0 };

export function sanitizeLook(v: unknown): Look {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const n = (x: unknown, max: number) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 && x < max ? x : 0);
  return { c: n(o.c, BODY.length), hat: n(o.hat, HATS.length), face: n(o.face, FACES.length), fit: n(o.fit, FITS.length), sp: n(o.sp, SPECIES.length), pet: n(o.pet, PETS.length) };
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
      const coat = look.fit === 1;
      const c = coat ? K.COAT : body, cl = coat ? K.COAT_SH : lo;
      if (raised) { R(ax + sway, -27, 3, 7, c); R(ax + sway + (side > 0 ? 2 : 0), -26, 1, 6, cl); R(ax + sway, -28, 3, 1, c); }
      else { R(ax, -15, 3, 6, c); R(side > 0 ? ax + 2 : ax, -14, 1, 5, cl); R(ax, -9, 3, 1, cl); }
    };
    // antenna / hat top
    const antBase = look.hat === 1 ? -31 : TOP - 1;
    if (look.hat !== 2) {
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
    }
    // hats
    if (look.hat === 1) { // hard hat
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
  const top = look.hat === 2 ? -37 : look.hat === 1 ? -40 : look.hat === 5 ? -39 : -34;
  return { cv: out, ox: OX, oy: OY, bulb, bulbCol, top, hand: P.dir > 0 ? [16, -12] : [-17, -12], mouth: [P.dir, -14] };
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
    } else if (look.fit === 2) { // scarf: a band under the eyes with a fluttering tail
      const sc: RGB = [220, 64, 76], st: RGB = [255, 210, 120];
      R(-13, -16, 26, 3, sc); for (let x = -11; x < 12; x += 5) R(x, -16, 2, 3, st);
      const tx = d > 0 ? -9 : 5, fl = Math.round(P.ant * -0.6 + Math.sin(P.wave) * 0.5);
      R(tx + fl, -13, 4, 7, sc); R(tx + fl, -9, 4, 1, st); R(tx + fl, -6, 1, 1, sc); R(tx + fl + 2, -6, 1, 1, sc);
    } else if (look.fit === 3) { // bow tie
      const bc: RGB = [123, 97, 255];
      R(-4, -16, 3, 3, bc); R(2, -16, 3, 3, bc); R(-1, -15, 3, 2, shade(bc, 0.75)); R(-4, -16, 1, 1, M(bc, [255, 255, 255], 0.4));
    }
    const coat = look.fit === 1;
    const arm2 = (side: -1 | 1, raised: boolean, sway: number) => {
      if (!coat) return arm(side, raised, sway);
      const ax = (side < 0 ? (raised ? -17 : -18) : (raised ? 11 : 12)) + sway, ay = raised ? -27 : -18;
      R(ax, ay, 6, 6, K.COAT); R(ax, ay + 5, 6, 1, K.COAT_SH); if (side > 0) R(ax + 5, ay, 1, 6, K.COAT_SH); R(side < 0 ? ax : ax + 4, ay + 2, 2, 2, body);
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
    }
    // hats sit on the flat top (y = -24)
    if (look.hat === 1) { // hard hat
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
  const bulb: [number, number] | null = look.hat === 2 ? [0, -32] : P.flare > 0.05 ? [0, -30] : null;
  const top = look.hat === 1 ? -34 : look.hat === 2 ? -37 : look.hat === 4 ? -35 : look.hat === 3 ? -33 : look.hat === 5 ? -37 : -30;
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
