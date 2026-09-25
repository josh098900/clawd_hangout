// The sky from the Space Station's telescope (Mission Control): one wide panorama, the same for
// everyone because it all comes from the wall clock. Planets creep along, the Moon drifts past,
// a new comet swings through every 5 minutes, and now and then... something else. Look down
// (the bottom of the panorama is Earth) and you can find THE SQUARE.
// ui/mission.ts steers it; the station's big screen shows whatever the telescope is pointed at.

import { K, SK, type RGB } from '../engine/palette';
import { r, txt, tw, lit, M, shade } from '../engine/pixel';
import { h1 } from '../engine/math';

export const SKY_W = 1800, SKY_H = 700, GROUND = 540;
export type SkyKind = 'planet' | 'moon' | 'comet' | 'ufo' | 'square';
/** `id` = what goes in your sky log (every comet counts as 'COMET'). */
export interface SkyThing { id: string; name: string; kind: SkyKind; x: number; y: number; rad: number; c: RGB; dx: number }
const COMETS = ['ZIGGY', 'PIP', 'NOODLE', 'BISCUIT', 'WALDO', 'MOCHI', 'PICKLE', 'SPROCKET', 'TOFU', 'BLIP', 'GUMBO', 'WIDGET'];
const PLANETS: [string, number, number, number, RGB][] = [ // name, x, y, radius, colour
  ['MARS', 260, 150, 4, [220, 90, 60]], ['VENUS', 620, 380, 5, [255, 236, 190]], ['JUPITER', 980, 110, 9, [220, 180, 140]],
  ['SATURN', 1340, 290, 7, [236, 210, 150]], ['NEPTUNE', 1640, 420, 5, [90, 140, 255]],
];
const wrap = (x: number): number => ((x % SKY_W) + SKY_W) % SKY_W;
export const COMET_S = 300;
/** Everything up there right now. */
export function skyThings(nowMs = Date.now()): SkyThing[] {
  const T = nowMs / 1000, out: SkyThing[] = [];
  for (const [name, x, y, rad, c] of PLANETS) out.push({ id: name, name, kind: 'planet', x: wrap(x + T / 40), y, rad, c, dx: 0 });
  out.push({ id: 'THE MOON', name: 'THE MOON', kind: 'moon', x: wrap(1500 - T / 3), y: 230 + Math.sin(T / 900) * 60, rad: 16, c: [210, 210, 222], dx: 0 });
  const slot = Math.floor(T / COMET_S), u = T - slot * COMET_S, dir = h1(slot * 5.1) > 0.5 ? 1 : -1;
  out.push({ id: 'COMET', name: 'COMET ' + COMETS[slot % COMETS.length], kind: 'comet', x: wrap(h1(slot) * SKY_W + dir * u * 1.4), y: 70 + h1(slot * 2.3) * 360 + u * 0.18, rad: 3, c: [200, 240, 255], dx: dir });
  const us = Math.floor(T / 180); // a UFO, sometimes. it doesn't hang about
  if (h1(us * 9.7) < 0.22) { const k = T - us * 180; if (k < 60) out.push({ id: 'UFO', name: 'A UFO?!', kind: 'ufo', x: wrap(h1(us) * SKY_W + k * 9), y: 120 + h1(us * 3) * 300 + Math.sin(k * 3) * 14, rad: 5, c: [124, 242, 156], dx: 1 }); }
  out.push({ id: 'THE SQUARE', name: 'THE SQUARE', kind: 'square', x: wrap(300 + T * 1.5), y: 628, rad: 5, c: K.GOLD, dx: 0 });
  return out;
}

/**
 * Draw the patch of sky centred on (cx, cy) into the box (ox, oy, w, h) of the current canvas.
 * `labels` names whatever's in view (the telescope does; the big screen too).
 */
export function skyView(ox: number, oy: number, w: number, h: number, cx: number, cy: number, nowMs = Date.now(), labels = true): void {
  const T = nowMs / 1000, vx0 = cx - w / 2, vy0 = cy - h / 2;
  r(ox, oy, w, h, SK.VOID);
  // stars: one per 22 px cell, hashed so they're fixed on the sky
  const C = 22;
  for (let gy = Math.floor(vy0 / C); gy <= Math.floor((vy0 + h) / C); gy++) for (let gx = Math.floor(vx0 / C); gx <= Math.floor((vx0 + w) / C); gx++) {
    if (gy * C > GROUND) continue;
    const cell = wrap(gx * C) / C + gy * 977, sx = gx * C + Math.floor(h1(cell) * C), sy = gy * C + Math.floor(h1(cell * 1.7) * C);
    const px = Math.round(ox + sx - vx0), py = Math.round(oy + sy - vy0); if (px < ox || py < oy || px >= ox + w || py >= oy + h || sy > GROUND) continue;
    const b = h1(cell * 3.1); r(px, py, 1, 1, b > 0.8 ? SK.STAR : SK.STAR_DIM);
    if (b > 0.97 && (T * 0.7 + b * 9) % 1 < 0.2) lit(() => { r(px - 1, py, 3, 1, SK.STAR_DIM); r(px, py - 1, 1, 3, SK.STAR_DIM); r(px, py, 1, 1, K.WHITE); });
  }
  // Earth, looking down: a strip of oceans, land and clouds scrolling by, the air glowing along its edge
  if (vy0 + h > GROUND - 8) {
    const top = Math.max(oy, Math.round(oy + GROUND - vy0));
    for (let py = top; py < oy + h; py += 2) for (let px = ox; px < ox + w; px += 2) {
      const wx = wrap(px - ox + vx0 - T * 1.5), wy = py - oy + vy0, n = h1(Math.floor(wx / 14) * 7.3 + Math.floor(wy / 12) * 3.1), cl = h1(Math.floor((wx + T * 0.8) / 20) * 5.9 + Math.floor(wy / 8) * 2.3);
      r(px, py, 2, 2, cl > 0.82 ? SK.CLOUD : n > 0.62 ? (n > 0.9 ? SK.DESERT : SK.LAND) : n > 0.55 ? SK.LAND2 : SK.OCEAN);
    }
    const ey = Math.round(oy + GROUND - vy0); if (ey >= oy && ey < oy + h) lit(() => { r(ox, ey - 2, w, 1, M(SK.ATMOS, K.WHITE, 0.3)); r(ox, ey - 1, w, 2, SK.ATMOS); });
  }
  for (const s of skyThings(nowMs)) for (const sx of [s.x - SKY_W, s.x, s.x + SKY_W]) {
    const px = Math.round(ox + sx - vx0), py = Math.round(oy + s.y - vy0);
    if (px < ox - 40 || px > ox + w + 40 || py < oy - 40 || py > oy + h + 40) continue;
    drawThing(s, px, py, T, ox, oy, w, h);
    if (labels && px > ox + 4 && px < ox + w - 4 && py > oy + 4 && py < oy + h - 4) { const n = s.name; lit(() => txt(n, Math.max(ox + 1, Math.min(ox + w - tw(n) - 1, px - tw(n) / 2)), Math.min(oy + h - 6, py + s.rad + 4), [150, 170, 210])); }
  }
}
/** Clip-free little drawings (we only ever draw inside a box we've cleared, so edges just stop). */
function drawThing(s: SkyThing, x: number, y: number, T: number, ox: number, oy: number, w: number, h: number): void {
  const inBox = (px: number, py: number) => px >= ox && py >= oy && px < ox + w && py < oy + h;
  const P = (px: number, py: number, pw: number, ph: number, c: RGB) => { for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) if (inBox(px + i, py + j)) r(px + i, py + j, 1, 1, c); };
  const D = (cx: number, cy: number, rad: number, c: RGB) => { for (let j = -rad; j <= rad; j++) { const hw = Math.floor(Math.sqrt(rad * rad - j * j)); P(cx - hw, cy + j, hw * 2 + 1, 1, c); } };
  if (s.kind === 'planet') {
    D(x, y, s.rad, s.c); D(x - 1, y - 1, Math.max(1, s.rad - 2), M(s.c, K.WHITE, 0.25));
    if (s.name === 'JUPITER') for (const dy of [-3, 1, 4]) P(x - s.rad + 1, y + dy, s.rad * 2 - 1, 1, shade(s.c, 0.8));
    if (s.name === 'SATURN') { P(x - s.rad - 6, y, s.rad * 2 + 13, 1, [200, 180, 130]); P(x - s.rad - 4, y - 1, 3, 1, [200, 180, 130]); P(x + s.rad + 2, y + 1, 3, 1, [200, 180, 130]); }
    if (s.name === 'MARS') P(x - 1, y - s.rad + 1, 2, 1, K.WHITE);
  } else if (s.kind === 'moon') {
    D(x, y, s.rad, s.c); for (let k = 0; k < 5; k++) D(x - 8 + Math.round(h1(k) * 14), y - 8 + Math.round(h1(k * 3) * 14), 1 + (k % 3), shade(s.c, 0.8));
    for (let j = -s.rad; j <= s.rad; j++) { const hw = Math.floor(Math.sqrt(s.rad * s.rad - j * j)), sh = Math.round(hw * 0.5); P(x + hw - sh, y + j, sh, 1, shade(s.c, 0.7)); }
    // the magenta flag from the film, if you look closely
    P(x + 3, y - 10, 1, 5, K.WHITE); P(x + 4, y - 10, 4, 2, K.MAG);
  } else if (s.kind === 'comet') {
    lit(() => { for (let k = 1; k < 26; k++) { const tx = x - s.dx * k * 2, ty = y + Math.round(Math.sin(k * 0.4 + T * 2) * (k / 12)), c = k < 6 ? K.WHITE : k < 14 ? [180, 230, 255] as RGB : [95, 140, 255] as RGB; P(tx, ty - (k > 10 ? 1 : 0), 2, k > 10 ? 3 : 1, c); } D(x, y, 2, K.WHITE); });
  } else if (s.kind === 'ufo') {
    lit(() => { P(x - 6, y, 13, 2, [150, 160, 180]); P(x - 3, y - 3, 7, 3, [124, 242, 156]); P(x - 1, y - 3, 2, 1, K.WHITE); if (T % 0.4 < 0.2) { P(x - 5, y + 2, 1, 1, K.GOLD); P(x + 5, y + 2, 1, 1, K.GOLD); } else P(x, y + 2, 1, 1, K.MAG); });
  } else if (s.kind === 'square') {
    // the Square from orbit: a patch of streets, the dragon's green, and the Lab's little light
    P(x - 7, y - 5, 15, 11, [70, 76, 100]); for (let k = -6; k <= 6; k += 4) { P(x + k, y - 5, 1, 11, [120, 126, 150]); P(x - 7, y + k * 0.7, 15, 1, [120, 126, 150]); }
    P(x + 2, y - 2, 3, 2, [52, 195, 143]); lit(() => { if (T % 1 < 0.6) P(x - 3, y + 1, 2, 2, K.GOLD); });
  }
}
