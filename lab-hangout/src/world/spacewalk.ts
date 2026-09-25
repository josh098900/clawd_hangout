// THE SPACEWALK — out through the Space Station's airlock, clipped on to a safety line. The
// station's hull along the top, Earth's great curve along the bottom, and open space between,
// where you float freely (no floor: main.ts moves you with momentum; SPACE fires your jetpack).
// Stardust and bits of lost space junk drift past on the wall clock (everyone sees the same ones);
// grab them (the first to touch one gets it: a 'junk' message makes it vanish for the others)
// and bring your haul back inside to be paid (0015_space.sql spacewalk_pay).

import { K, SK, type RGB } from '../engine/palette';
import { PX, mk, r, disc, line, txt, lit, G, Gd, Gsoft, M, shade, bake } from '../engine/pixel';
import { h1 } from '../engine/math';
import { starfield, twinkles, vnoise } from './space';
import type { Door, Prop, Room } from './room';

const W = 1400, H = 800, HULL = 384, EARTH_CY = 2400, EARTH_R = 1860, AIR_X = 200;
const limbTop = (x: number) => EARTH_CY - Math.sqrt(EARTH_R * EARTH_R - (x - W / 2) * (x - W / 2));

// ---------- the drifting things ----------
export const JUNK: { name: string; pts: number }[] = [
  { name: 'STARDUST', pts: 1 }, { name: 'A BOLT', pts: 2 }, { name: 'A LOST SOCK', pts: 3 }, { name: 'A WRENCH', pts: 3 },
  { name: 'A RUBBER DUCK', pts: 5 }, { name: 'A GLOVE', pts: 3 }, { name: 'A SATELLITE BIT', pts: 4 },
];
const EVERY = 1.3;
export interface Floater { id: number; kind: number; x: number; y: number; spin: number }
/** Everything drifting past right now (right to left). `id` is the same in every browser. */
export function floatersNow(nowMs = Date.now()): Floater[] {
  const T = nowMs / 1000, s1 = Math.floor(T / EVERY), out: Floater[] = [];
  for (let s = s1 - 70; s <= s1; s++) {
    const t = T - s * EVERY, sp = 18 + h1(s * 1.9) * 22, x = W + 30 - t * sp; if (x < -30) continue;
    const kind = h1(s * 3.3) < 0.7 ? 0 : 1 + Math.floor(h1(s * 5.1) * (JUNK.length - 1));
    out.push({ id: s, kind, x, y: 432 + h1(s * 2.7) * 300 + Math.sin(t * 0.7 + s) * 10, spin: t * (0.6 + h1(s) * 1.4) });
  }
  return out;
}
/** What's been grabbed (id -> when, s), and this walk's haul. main.ts fills these in. */
export const WALK = { got: new Map<number, number>(), pts: 0, dust: 0, things: 0 };

function floaterDraw(f: Floater, a: number): void {
  const x = Math.round(f.x), y = Math.round(f.y - 22), fr = Math.floor(f.spin * 2) % 4;
  if (f.kind === 0) { // stardust: a twinkling knot of light
    lit(() => { const tw2 = (a * 3 + f.id) % 1 < 0.5; r(x - 1, y - 1, 3, 3, [255, 240, 200]); r(x, y - 3, 1, 7, tw2 ? K.WHITE : [255, 220, 150]); r(x - 3, y, 7, 1, tw2 ? [255, 220, 150] : K.WHITE); for (let k = 0; k < 3; k++) r(x + Math.round(Math.cos(a * 2 + k * 2 + f.id) * 5), y + Math.round(Math.sin(a * 2 + k * 2 + f.id) * 4), 1, 1, [255, 200, 240]); });
    Gd(x, y, 9, [255, 220, 170], 0.35); return;
  }
  const S: Record<number, () => void> = {
    1: () => { const c: RGB = [170, 176, 190]; if (fr % 2) { r(x - 2, y - 4, 4, 8, c); r(x - 3, y - 4, 6, 2, shade(c, 0.8)); } else { r(x - 4, y - 2, 8, 4, c); r(x - 4, y - 3, 2, 6, shade(c, 0.8)); } },
    2: () => { const c: RGB = [230, 80, 110]; r(x - 3, y - 5, 5, 7, c); r(x - 3, y + 2, 8, 3, c); r(x - 3, y - 5, 5, 1, K.WHITE); r(x + 2, y + 2, 3, 3, shade(c, 0.8)); },
    3: () => { const c: RGB = [150, 158, 172]; if (fr % 2) { r(x - 1, y - 7, 2, 12, c); r(x - 3, y - 8, 6, 3, c); r(x - 1, y - 8, 2, 1, SK.VOID); } else { r(x - 7, y - 1, 12, 2, c); r(x - 8, y - 3, 3, 6, c); r(x - 8, y - 1, 1, 2, SK.VOID); } },
    4: () => { const c: RGB = [255, 210, 74]; r(x - 5, y - 2, 10, 6, c); r(x - 2, y - 6, 6, 5, c); r(x + 4, y - 4, 3, 2, K.BEAK); r(x + 1, y - 5, 1, 1, K.EYE); r(x - 5, y + 3, 10, 1, shade(c, 0.8)); },
    5: () => { const c: RGB = [236, 238, 244]; r(x - 3, y - 3, 7, 7, c); for (let k = 0; k < 4; k++) r(x - 3 + k * 2, y - 7, 1, 4, c); r(x + 4, y - 1, 3, 2, c); r(x - 3, y + 3, 7, 1, SK.HULL_SH); },
    6: () => { r(x - 6, y - 4, 12, 8, SK.SOLAR); for (let k = -3; k <= 3; k += 3) r(x + k, y - 4, 1, 8, SK.SOLAR_LN); r(x - 6, y - 4, 12, 1, SK.SOLAR_HI); r(x + 6, y - 1, 4, 2, SK.GOLD_FOIL); },
  };
  S[f.kind]?.();
}
/** Grabbed: a little burst where it was. */
function burst(f: Floater, u: number): void {
  const x = f.x, y = f.y - 22;
  lit(() => { for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2, d = 4 + u * 26; r(Math.round(x + Math.cos(an) * d), Math.round(y + Math.sin(an) * d), 1, 1, k % 2 ? K.GOLD : K.WHITE); } });
}
function extras(): Prop[] {
  const now = Date.now(), out: Prop[] = [];
  for (const f of floatersNow(now)) {
    const g = WALK.got.get(f.id);
    if (g === undefined) out.push({ y: f.y, draw: (a: number) => floaterDraw(f, a) });
    else { const u = now / 1000 - g; if (u < 0.5) out.push({ y: f.y, draw: () => burst(f, u) }); }
  }
  return out;
}

// ---------- the set ----------
function build(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    
    r(0, 0, W, H, SK.VOID); starfield(0, 0, W, H, 520, 11);
    // Earth: the land and seas (drawn once; the clouds move over it live), foreshortened towards its edge
    const cv = PX.ctx.canvas, g2 = cv.getContext('2d')!, top0 = Math.floor(limbTop(W / 2) - 1), id = g2.getImageData(0, top0, W, H - top0), d = id.data;
    for (let x = 0; x < W; x += 2) { // (2x2 blocks: it's a big picture to make at boot)
      const t = limbTop(x + 1);
      for (let y = Math.ceil(t); y < H; y += 2) {
        const depth = y - t, sv = Math.pow(depth, 1.25) / 3, su = x * 0.55;
        const n = vnoise(su / 40, sv / 30, 1e6, 3) * 0.65 + vnoise(su / 14, sv / 10, 1e6, 9) * 0.35;
        let c: RGB = n > 0.6 ? (n > 0.7 ? SK.DESERT : h1(Math.floor(su / 6) + Math.floor(sv / 5) * 7) > 0.5 ? SK.LAND : SK.LAND2) : n > 0.56 ? SK.LAND2 : h1(Math.floor(su / 9) * 3 + Math.floor(sv / 6)) > 0.5 ? SK.OCEAN : SK.OCEAN2;
        if (depth < 26) c = M(c, SK.ATMOS, (1 - depth / 26) * 0.75); // the air, seen edge-on
        c = M(c, SK.NIGHTSIDE, Math.max(0, (x - 900) / 500) * 0.7); // dusk towards the right
        for (const [px, py] of [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]) { if (py >= H || px >= W) continue; const o = ((py - top0) * W + px) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; }
      }
    }
    g2.putImageData(id, 0, top0);
    // city lights on the night side
    for (let i = 0; i < 90; i++) { const x = 1000 + Math.floor(h1(i * 3.7) * 400), y = Math.ceil(limbTop(x)) + 10 + Math.floor(h1(i * 1.3) * 200); if (y < H) r(x, y, 1, 1, SK.CITYLIGHT); }
    // the station's hull along the top: solar wings above, the module, handrails, gold foil
    for (let x = 0; x < W; x += 260) { r(x + 20, 40, 220, 150, SK.SOLAR); for (let yy = 40; yy < 190; yy += 15) r(x + 20, yy, 220, 1, SK.SOLAR_LN); for (let xx = x + 20; xx < x + 240; xx += 22) r(xx, 40, 1, 150, SK.SOLAR_LN); r(x + 20, 40, 220, 2, SK.SOLAR_HI); r(x + 126, 190, 8, 60, SK.HULL_DK); }
    r(0, 244, W, HULL - 244, SK.HULL); for (let x = 0; x < W; x += 70) { r(x, 244, 1, HULL - 244, SK.SEAM); for (let y = 254; y < HULL - 8; y += 20) r(x + 4, y, 2, 2, SK.HULL_DK); }
    r(0, 244, W, 3, SK.HULL_HI); r(0, HULL - 14, W, 14, SK.HULL_SH); r(0, HULL - 2, W, 2, SK.HULL_DK);
    for (let x = 340; x < W; x += 300) { r(x, 290, 90, 40, SK.GOLD_FOIL); for (let k = 0; k < 6; k++) r(x + Math.floor(h1(x + k) * 80), 292 + Math.floor(h1(x * k + 1) * 34), 6, 2, SK.GOLD_FOIL_HI); }
    for (let x = 520; x < W; x += 300) { r(x, 280, 24, 16, SK.TRIM); r(x + 2, 282, 20, 12, SK.WINDOW); }
    r(0, HULL - 22, W, 3, SK.RAIL); for (let x = 20; x < W; x += 60) r(x, HULL - 22, 2, 8, SK.RAIL_DK);
    txt('LAB ORBITAL', 760, 262, SK.HULL_DK, 3);
    // the airlock (open: the lit chamber inside)
    disc(AIR_X, 322, 46, SK.HAZ_DK); for (let k = 0; k < 20; k++) { const an = k / 20 * Math.PI * 2; if (k % 2) for (let dd = 40; dd < 46; dd++) r(Math.round(AIR_X + Math.cos(an) * dd), Math.round(322 + Math.sin(an) * dd), 2, 2, SK.HAZ); }
    // a robot arm reaching out
    line(980, 300, 1060, 200, SK.HULL_SH, 6); line(1060, 200, 1150, 230, SK.HULL_SH, 5); r(1142, 222, 16, 16, SK.TRIM);
  });
}
function drawBack(a: number): void {
  twinkles(0, 0, W, 560, 60, 11, a);
  // the sun, low on the left, and a lens flare
  lit(() => { disc(60, 470, 14, [255, 250, 230]); disc(60, 470, 10, K.WHITE); });
  Gsoft(60, 470, 16, 130, [255, 236, 200], 0.4); Gd(300, 520, 10, [160, 220, 255], 0.2); Gd(420, 560, 6, [255, 200, 240], 0.2);
  // clouds sliding over the Earth (slowly: we're going round it)
  const T = Date.now() / 1000;
  for (let i = 0; i < 26; i++) {
    const x = Math.round(((h1(i * 3.1) * 1800 + T * (6 + h1(i) * 4)) % 1800) - 200), depth = 30 + h1(i * 7.7) * 220, y = Math.round(limbTop(Math.max(0, Math.min(W, x))) + depth), w = Math.round((24 + h1(i * 2) * 50) * Math.min(1, depth / 90 + 0.3));
    if (y > H) continue;
    r(x, y, w, Math.max(1, Math.round(depth / 40)), SK.CLOUD); r(x + 6, y - 1, Math.max(2, w - 14), 1, M(SK.CLOUD, SK.ATMOS, 0.3));
  }
  // the airlock's chamber light, and the station's blinkers
  lit(() => { disc(AIR_X, 322, 38, [236, 240, 248]); r(AIR_X - 38, 340, 76, 20, [214, 220, 232]); r(AIR_X - 4, 272, 8, 4, (a % 1) < 0.5 ? SK.LED : shade(SK.LED, 0.4)); });
  Gd(AIR_X, 322, 40, [220, 235, 255], 0.3);
  lit(() => { for (let x = 150; x < W; x += 400) r(x, HULL - 6, 3, 3, (a * 0.8 + x) % 1.6 < 0.3 ? SK.LED_RED : shade(SK.LED_RED, 0.3)); });
  G(0, HULL - 30, W, 30, [200, 220, 255], 0.03);
}
const airlock: Door = { trigger: { x0: AIR_X - 22, y0: 400, x1: AIR_X + 22, y1: 408 }, to: 'station', arrive: { x: 1325, y: 492 }, label: 'BACK INSIDE', area: { x0: AIR_X - 44, y0: 278, x1: AIR_X + 44, y1: 400 } };

export function makeSpacewalk(): Room {
  const room: Room = {
    id: 'spacewalk', title: 'SPACEWALK', sub: 'OUTSIDE THE STATION',
    w: W, h: H,
    floor: { x0: 30, y0: 400, x1: W - 30, y1: 770 },
    blockers: [],
    doors: [airlock],
    spots: [], inUse: new Map(),
    spawn: { x: AIR_X, y: 420 },
    dim: 0,
    fillTop: 'rgb(3,4,12)', fillLow: 'rgb(30,70,140)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [],
    zeroG: () => true,
    freeFloat: true,
    tether: { x: AIR_X, y: 352 },
    extras,
  };
  return room;
}
