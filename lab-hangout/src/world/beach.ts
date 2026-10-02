// REYNISFJARA (step 19, push 2): the black sand beach, the last stop. Outdoors on Iceland's clock, looking out to sea. Left to right:
//   REYNISFJALL: the headland, its grassy slopes full of PUFFIN burrows (the camera on its tripod: three in the frame gets you the PUFFIN
//     pet), GARÐAR's basalt columns like a pipe organ and the giant staircase of them to climb and sit on, the cave HÁLSANEFSHELLIR
//   REYNISDRANGAR: the troll stacks out in the surf (two trolls dragging a ship, caught by the sunrise)
//   THE BEACH: jet-black sand, Atlantic rollers, and THE SNEAKER WAVES: every couple of minutes, on the clock, one runs far up the
//     sand; caught and you're tumbled back up the beach, SOAKED. The warning sign's light (yellow; red in a gale). DYRHÓLAEY's arch
//     and lighthouse far off on the horizon
//   THE LAND: the dunes, THE BEACH CAFE (KJÖTSÚPA: lamb soup), the bus.

import { K, IS, type RGB } from '../engine/palette';
import { mk, r, line, disc, oval, txt, tw, lit, alpha, Gd, M } from '../engine/pixel';
import { clamp, h1 } from '../engine/math';
import { iceDay, iceWeather, iceGold } from './iceland';
import { busAt } from '../game/tour';
import { COAST, seen, paintSky, skyLive, weatherFront, landLayer, nightNow, nite, busAtStop, sightSign, pixels, vnoise, sandPx, grassPx } from './coast';
import type { Prop, Rect, Room, Spot, Talker } from './room';

const W = 2000, H = 614, WALL = 470, FL0 = 484, FL1 = 570, HZ = 380;
export const BHR = { cam: 300, cave: 590, stacks: 900, sign: 1100, cafe0: 1500, cafe1: 1680, soup: 1590, bus: 1720, door: 1918, land: 1480 };
export const BCH_ARRIVE = { x: BHR.door, y: 500 };
/** The giant staircase of columns: each column's x, how tall it stands (px above the sand), and where its foot is. */
export const STAIR: { x: number; h: number }[] = [{ x: 646, h: 18 }, { x: 694, h: 34 }, { x: 742, h: 52 }];
const STAIR_Y = 500;
/** The sneaker waves' stretch of beach, and their clock (BEACH.skew shifts it, for tests). */
export const SURF = { x0: 780, x1: BHR.land, calm: 492, far: 550 };
export const BEACH = { skew: 0 };
const PERIOD = 140, RUN = 3, HOLD = 1.5, BACK = 4.5;
/** Where the sneaker wave's cycle is (s; the warning's the last 3 s of it, the run up the first RUN + HOLD + BACK). */
export const waveP = (nowMs = Date.now()): number => (((nowMs / 1000 + BEACH.skew) % PERIOD) + PERIOD) % PERIOD;
/** Which sneaker wave (a number per wave). */
export const waveN = (nowMs = Date.now()): number => Math.floor((nowMs / 1000 + BEACH.skew) / PERIOD);
/** The rumble before it: true for the 3 s before it runs. */
export const waveWarn = (p = waveP()): boolean => p > PERIOD - 3;
/** How far up the beach the sneaker wave reaches right now (a y: SURF.calm when it's not running). */
export function sneakerY(p = waveP()): number {
  if (p < RUN) { const u = p / RUN; return SURF.calm + (SURF.far - SURF.calm) * (1 - (1 - u) * (1 - u)); }
  if (p < RUN + HOLD) return SURF.far;
  if (p < RUN + HOLD + BACK) { const u = (p - RUN - HOLD) / BACK; return SURF.far - (SURF.far - SURF.calm) * u * u * (3 - 2 * u); }
  return SURF.calm;
}
/** The little everyday waves: how far up each one runs (they come every 9 s). */
const smallY = (t: number): number => { const u = (t % 9) / 9; return SURF.calm - 8 + Math.max(0, Math.sin(u * Math.PI)) * 10; };
/** THE PUFFINS: their burrows on the slope; each one's in or out on its own clock. */
export const BURROWS: [number, number][] = [[122, 398], [150, 420], [176, 392], [204, 432], [228, 404], [256, 440], [140, 446], [190, 456], [240, 372], [270, 418], [300, 262], [340, 284]];
export const puffinOut = (i: number, t = Date.now() / 1000): boolean => ((t * (0.021 + (i % 5) * 0.004) + h1(i * 3.7)) % 1) < 0.62;
/** How many puffins are standing out where the camera sees them right now. */
export const puffinsInFrame = (t = Date.now() / 1000): number => BURROWS.filter((_, i) => puffinOut(i, t)).length;
/** What the features tell the set (features/coast.ts): the camera's flash. */
export const BCHW = { flash: -99 };

const hy = (x: number): number => 104 + 230 * Math.pow(clamp(x / 780, 0, 1), 1.7);
function paintLand(day: boolean, dk: (c: RGB) => RGB): void {
  // ---- the sea out to the horizon, its swell in lines (the rollers move live), the stacks standing in it ----
  pixels(0, HZ, W, WALL - HZ, (x, y) => { const u = (y - HZ) / (WALL - HZ), swell = vnoise(x * 0.25, y * 1.6, 8, 3); return dk(M(M(IS.SEA_DK, IS.SEA, u), [70, 118, 148], swell > 0.66 ? 0.35 : swell < 0.3 ? -0.0 : 0.1)); });
  // DYRHÓLAEY: the headland far off to the west, the arch through it, the lighthouse on top
  for (let x = 1160; x < 1440; x++) { const u = (x - 1160) / 280, h = Math.round(22 * Math.sin(u * Math.PI) ** 0.6 + (u > 0.55 && u < 0.7 ? 0 : 0)); if (h <= 0) continue; const arch = u > 0.62 && u < 0.72, top = HZ + 2 - h; r(x, top, 1, arch ? Math.round(h * 0.45) : h, dk(M([54, 60, 66], IS.SKY_LO, 0.35))); r(x, top, 1, 2, dk(M([96, 120, 80], IS.SKY_LO, 0.35))); }
  r(1268, HZ - 30, 4, 8, dk([236, 236, 230])); r(1267, HZ - 32, 6, 2, dk([60, 60, 66]));
  // REYNISDRANGAR: the troll stacks, dark spires out in the surf
  for (const [cx, hgt, w] of [[BHR.stacks - 56, 150, 30], [BHR.stacks + 4, 104, 24], [BHR.stacks + 58, 74, 18]] as [number, number, number][]) {
    for (let x = cx - w; x < cx + w; x++) { const u = (x - cx) / w, top = Math.round(HZ + 10 - hgt * (1 - u * u) - h1(Math.floor(x / 3) * 4.1) * 10); for (let y = top; y < HZ + 12; y++) r(x, y, 1, 1, dk(M(u < -0.2 ? [36, 36, 40] : u > 0.3 ? [58, 58, 62] : [46, 46, 50], [30, 30, 34], vnoise(x, y, 5, 4) * 0.5))); if (h1(x * 0.7) > 0.93) r(x, top + 4 + Math.floor(h1(x) * 30), 1, 2, dk([200, 200, 190])); }
    for (let x = cx - w - 8; x < cx + w + 8; x++) if (vnoise(x, 0, 4, 9) > 0.35) r(x, HZ + 10 + Math.round(vnoise(x, 1, 6, 2) * 2), 1, 2, dk([220, 232, 238])); // (the surf round their feet)
  }
  // ---- REYNISFJALL: the headland, its grassy slope (the puffins' burrows), GARÐAR's columns, the cave ----
  pixels(0, 100, 800, WALL - 100, (x, y) => {
    const top = Math.round(hy(x)); if (y < top) return null;
    const cliff = 296 + Math.round(vnoise(Math.floor(x / 8) * 8, 0, 40, 3) * 40 + h1(Math.floor(x / 8) * 2.9) * 18); // (where each column's top is)
    if (x > 280 && y > cliff) { // GARÐAR: hexagonal basalt columns, each lit on one side and dark at its seams, with the odd cross-joint
      const col = Math.floor(x / 8), k = (x % 8) / 8, seam = (x % 8) === 0, cap = y - cliff < 2, joint = ((y + Math.floor(h1(col) * 30)) % 34) < 1;
      const d = x - BHR.cave, archTop = 384 + (d * d) / 60; // (the cave's mouth: an arch)
      if (Math.abs(d) < 56 && y > archTop) return dk(M([10, 10, 12], [30, 30, 34], clamp((archTop + 40 - y) / 40, 0, 1) * 0.6));
      if (Math.abs(d) < 60 && y > archTop - 3 && y <= archTop) return dk([22, 22, 26]);
      return dk(seam ? [22, 22, 26] : cap ? [104, 106, 112] : joint ? [34, 34, 38] : M(M([82, 84, 90], [40, 40, 46], k), [60, 60, 66], vnoise(col, y, 40) * 0.4));
    }
    if (y < top + 3) return dk(IS.SNOW);
    return dk(grassPx(x, y));
  });
  for (const [bx, by] of BURROWS) oval(bx, by + 3, 3, 2, dk([30, 28, 26])); // (the burrows)
  // ---- THE LAND on the right: dunes and grass, the café (built like the columns: dark, upright), the sight sign ----
  pixels(BHR.land, HZ - 24, W - BHR.land, WALL - HZ + 24, (x, y) => { const top = HZ - 10 + Math.round(Math.sin((x - BHR.land) / 40) * 8 + Math.max(0, 40 - (x - BHR.land)) * 0.9); if (y < top) return null; return dk(y < top + 3 ? [120, 150, 90] : h1(x * 0.6 + y) > 0.5 ? [88, 112, 70] : [70, 92, 56]); });
  { const x0 = BHR.cafe0, x1 = BHR.cafe1, top = 394; for (let x = x0; x < x1; x++) { const col = Math.floor((x - x0) / 8), h = 8 + (col % 3) * 4; r(x, top - h, 1, WALL - top + h, dk((x - x0) % 8 === 0 ? [20, 20, 24] : M([50, 50, 56], [34, 34, 40], ((x - x0) % 8) / 8))); }
    r(x0 + 16, 420, x1 - x0 - 32, 36, dk([24, 30, 36])); for (let x = x0 + 16; x < x1 - 16; x += 30) r(x, 420, 2, 36, dk([60, 60, 66])); r(x0 + 4, 404, x1 - x0 - 8, 12, dk([30, 30, 34])); txt('THE BEACH CAFE', (x0 + x1) / 2 - tw('THE BEACH CAFE') / 2, 407, dk([230, 200, 120])); }
  sightSign(BHR.land + 6, WALL, 'REYNISFJARA', dk);
  // ---- the sand: wet and shining at the water's edge, black and dry above it, round pebbles ----
  pixels(0, WALL, W, H - WALL, (x, y) => (x > BHR.land + 20 && y < 490 ? dk([70, 72, 66]) : dk(sandPx(x, y, y < SURF.calm + 8 ? 1 - (y - WALL) / (SURF.calm + 8 - WALL) : 0))));
  r(BHR.land + 20, WALL, W - BHR.land - 20, 3, dk([90, 92, 86])); // (the car park's kerb)
}
const land = landLayer(W, H, paintLand);

// ---------------------------------------------------------------- live ----------------------------------------------------------------
function drawBack(a: number): void {
  skyLive(a, W, HZ, 1400);
  land();
  const night = nightNow(), w = iceWeather(), gale = w.kind === 'gale', p = waveP(), t = Date.now() / 1000 + BEACH.skew;
  // ---- the rollers: white lines of surf coming in from the horizon, bigger in a gale; the swell darkening before a sneaker wave ----
  if (seen(SURF.x0 - 40, SURF.x1)) {
    const x0 = Math.max(SURF.x0 - 40, COAST.view.x0 - 10), x1 = Math.min(BHR.land + 20, COAST.view.x1 + 10);
    if (waveWarn(p)) alpha(0.25, () => r(x0, HZ + 30, x1 - x0, WALL - HZ - 30, [10, 30, 50]));
    for (let q = 0; q < 4; q++) { const u = ((t * (gale ? 0.09 : 0.06)) + q / 4) % 1, y = Math.round(HZ + 30 + u * u * (WALL - HZ - 30)), thick = 1 + Math.round(u * (gale ? 4 : 2)), fade = Math.min(1, u * 3) * (u > 0.9 ? (1 - u) * 10 : 1);
      if (fade < 0.05) continue;
      alpha(fade, () => { for (let x = x0; x < x1; x += 2) { const crest = vnoise(x + q * 300, 0, 40, q) - 0.35 + u * 0.4; if (crest <= 0) continue; const yy = y + Math.round(Math.sin(x / 45 + q * 2) * 3 * u); r(x, yy - thick, 2, thick, nite(M([170, 200, 214], K.WHITE, u), night)); r(x, yy, 2, 2, nite(M(IS.SEA_DK, [20, 50, 70], 0.5), night)); if (crest > 0.3 && h1(x * 0.3 + q) > 0.6) r(x, yy - thick - 1, 2, 1, nite(K.WHITE, night)); } }); }
    for (let q = 0; q < 24; q++) { const gx = x0 + h1(q * 3.1) * (x1 - x0), gy = HZ + 4 + h1(q * 1.7) * 30; if ((t * 0.8 + q * 0.37) % 1 < 0.3) r(Math.round(gx), Math.round(gy), 2, 1, nite([210, 226, 236], night)); } // (glints far out)
    // the water running up the sand: the everyday waves, and the sneaker wave when it comes
    const reach = Math.max(smallY(t), sneakerY(p)), big = sneakerY(p) > SURF.calm + 2;
    for (let x = x0; x < x1; x += 2) {
      const edge = Math.round(reach + Math.sin(x / 23 + t * 0.8) * (big ? 5 : 2) + h1(Math.floor(x / 6)) * 2);
      if (edge > WALL) { alpha(0.75, () => r(x, WALL, 2, edge - WALL, nite(big ? [70, 120, 150] : [80, 126, 150], night))); r(x, edge - 2, 2, 2, nite([236, 244, 248], night)); if (h1(x * 0.7 + Math.floor(t * 3)) > 0.7) r(x, edge - 5, 2, 1, nite(K.WHITE, night)); }
    }
  }
  // ---- THE PUFFINS: in and out of their burrows, one flying in with fish now and then; the camera's flash ----
  if (seen(100, 480)) {
    BURROWS.forEach(([bx, by], i) => { if (!puffinOut(i, t)) return; const look = Math.floor(t * 0.7 + i) % 2 ? 1 : -1; puffin(bx, by, look, night, (t * 2 + i) % 5 < 0.4); });
    for (let q = 0; q < 2; q++) { const u = ((t * 0.05) + q * 0.5) % 1, fx = 520 - u * 400, fy = 230 + Math.sin(u * 9 + q) * 20 + u * 40; if (u < 0.92) { const flap = Math.floor(t * 12 + q) % 2; r(Math.round(fx) - 2, Math.round(fy), 5, 3, nite([30, 30, 34], night)); r(Math.round(fx) - 1, Math.round(fy) + 2, 3, 1, nite(K.WHITE, night)); r(Math.round(fx) - 4, Math.round(fy) - (flap ? 2 : -1), 3, 1, nite([30, 30, 34], night)); r(Math.round(fx) + 2, Math.round(fy) - (flap ? 2 : -1), 3, 1, nite([30, 30, 34], night)); r(Math.round(fx) - 3, Math.round(fy) + 1, 1, 2, nite([200, 210, 200], night)); } } // (flying in, beak full of fish)
    if (performance.now() / 1000 - BCHW.flash < 0.25) alpha(0.5, () => r(110, 240, 360, 110, [255, 255, 255]));
  }
  // ---- the café's windows, lit warm; its chimney's steam ----
  if (seen(BHR.cafe0, BHR.cafe1)) { if (night > 0.2) { lit(() => alpha(night, () => { for (let x = BHR.cafe0 + 18; x < BHR.cafe1 - 18; x += 30) r(x, 422, 26, 32, [255, 206, 130]); })); Gd(BHR.soup, 440, 60, [255, 200, 130], 0.3 * night); } for (let q = 0; q < 3; q++) { const u = ((a * 0.3) + q / 3) % 1; alpha(0.4 * (1 - u), () => disc(BHR.cafe1 - 20 + Math.round(Math.sin(u * 5 + q) * 2), Math.round(380 - u * 22), 2 + Math.round(u * 4), [236, 238, 240])); } }
  // ---- birds round the stacks; the stacks catching the first light at dawn ----
  if (seen(BHR.stacks - 120, BHR.stacks + 120)) { for (let q = 0; q < 5; q++) { const an = t * (0.3 + q * 0.07) + q, gx = BHR.stacks + Math.cos(an) * (40 + q * 12), gy = HZ - 90 + Math.sin(an * 1.3) * 30; r(Math.round(gx) - 2, Math.round(gy), 5, 1, nite([236, 238, 242], night)); } const gold = iceGold(); if (gold > 0.05 && iceDay() < 0.8) alpha(gold * 0.35, () => r(BHR.stacks - 86, HZ - 150, 172, 160, [255, 170, 100])); }
  if (seen(BHR.bus - 20, W)) busAtStop(4, BHR.bus, FL0 - 2, a);
}
/** A puffin standing at its burrow: black back, white face, the orange-and-red beak, orange feet (a beak full of fish, sometimes). */
function puffin(x: number, y: number, dir: number, night: number, fish: boolean): void {
  const n = (c: RGB): RGB => nite(c, night);
  r(x - 2, y - 7, 5, 7, n([24, 24, 28])); r(x - 1, y - 4, 3, 4, n(K.WHITE)); r(x - 2, y - 9, 5, 3, n([24, 24, 28])); r(x + (dir > 0 ? 0 : -1), y - 8, 2, 2, n(K.WHITE));
  r(x + (dir > 0 ? 3 : -4), y - 8, 2, 2, n([240, 110, 40])); r(x + (dir > 0 ? 3 : -4), y - 7, 2, 1, n([200, 50, 40])); r(x - 1, y, 1, 1, n([240, 120, 40])); r(x + 1, y, 1, 1, n([240, 120, 40]));
  if (fish) for (let k = 0; k < 3; k++) r(x + (dir > 0 ? 4 : -6), y - 8 + k, 3, 1, n([190, 200, 210]));
}
/** GARÐAR's staircase: three columns standing out of the sand, each taller than the last; sit on top. */
const stair = STAIR.map(({ x, h }): Prop => ({ y: STAIR_Y + 2, draw() {
  if (!seen(x - 30, x + 30)) return;
  const n = nightNow(), top = STAIR_Y - h;
  for (let k = -3; k < 3; k++) { const cx = x + k * 7, ch = h + (k % 2 ? 0 : 3); r(cx, STAIR_Y - ch, 7, ch, nite(M([74, 76, 82], [46, 46, 52], (k + 3) / 6), n)); r(cx, STAIR_Y - ch, 7, 2, nite([104, 106, 112], n)); r(cx, STAIR_Y - ch, 1, ch, nite([28, 28, 32], n)); }
  void top;
} }));
/** The warning sign by the path (in front of the surf): DANGER: SNEAKER WAVES, its light (yellow; red in a gale; flashing before a big one). */
const warning: Prop = { y: 484, draw(a: number) {
  if (!seen(BHR.sign - 40, BHR.sign + 60)) return;
  const n = nightNow(), x = BHR.sign, red = iceWeather().kind === 'gale', on = !waveWarn() || (a * 4) % 1 < 0.5, c: RGB = red ? [255, 60, 50] : [255, 200, 40];
  r(x, 430, 3, 54, nite([90, 94, 100], n)); r(x - 30, 404, 64, 30, nite([250, 210, 60], n)); r(x - 29, 405, 62, 1, nite(K.WHITE, n)); txt('DANGER', x + 2 - tw('DANGER') / 2, 407, nite([180, 40, 30], n)); txt('SNEAKER', x + 2 - tw('SNEAKER') / 2, 415, nite([40, 40, 44], n)); txt('WAVES', x + 2 - tw('WAVES') / 2, 423, nite([40, 40, 44], n));
  r(x + 36, 404, 12, 26, nite([30, 30, 34], n)); lit(() => r(x + 38, red ? 418 : 408, 8, 8, on ? c : M(c, [30, 30, 34], 0.7))); if (on) Gd(x + 42, red ? 422 : 412, 12, c, 0.5);
} };
const tripod: Prop = { y: 542, draw() { if (!seen(BHR.cam - 20, BHR.cam + 20)) return; const n = nightNow(), x = BHR.cam; line(x, 518, x - 8, 540, nite([40, 42, 48], n)); line(x, 518, x + 8, 540, nite([40, 42, 48], n)); line(x, 518, x, 540, nite([40, 42, 48], n)); r(x - 7, 508, 14, 10, nite([30, 32, 36], n)); r(x - 11, 510, 5, 6, nite([60, 64, 72], n)); lit(() => r(x + 4, 510, 2, 2, [255, 70, 60])); } };
export const BHSPOT = { CAM: 0, SOUP: 1, STAIR0: 2 };
export const BCH_SPOTS: Spot[] = [
  { kind: 'puffcam', x: BHR.cam + 2, y: 548, sx: BHR.cam + 2, sy: 548, lift: 0, label: 'PHOTO OF THE PUFFINS', area: { x0: BHR.cam - 14, y0: 506, x1: BHR.cam + 14, y1: 542 } },
  { kind: 'soup', x: BHR.soup, y: 494, sx: BHR.soup, sy: 494, lift: 0, label: 'KJOTSUPA', area: { x0: BHR.cafe0 + 10, y0: 400, x1: BHR.cafe1 - 10, y1: 470 } },
  ...STAIR.map(({ x, h }, i): Spot => ({ kind: 'sit', n: i, x, y: STAIR_Y + 3, sx: x, sy: STAIR_Y + 24, lift: h, label: 'SIT ON THE COLUMNS', area: { x0: x - 20, y0: STAIR_Y - h - 6, x1: x + 20, y1: STAIR_Y }, watch: i === 2 ? { x: BHR.stacks, top: 200 } : undefined })),
];
const TALK: Talker[] = [
  { id: 'bch-stacks', name: 'REYNISDRANGAR', x: BHR.stacks, y: 300, sx: BHR.stacks, sy: 556, lines: ['Two trolls, dragging a three-masted ship to shore in the night. They got greedy and took too long. The sun came up.', 'Trolls turn to stone in daylight. Everyone knows that. Ship and all, there they stand.'], verb: 'LOOK' },
  { id: 'bch-cave', name: 'HALSANEFSHELLIR', x: BHR.cave, y: 430, sx: BHR.cave, sy: 506, lines: ['A cave under the columns, its roof made of them, like the inside of a church organ.', 'The sea comes right in here in a storm. Not today. Hopefully.'], verb: 'LOOK' },
  { id: 'bch-sign', name: 'THE WARNING SIGN', x: BHR.sign, y: 404, sx: BHR.sign, sy: 520, lines: ['DANGER: SNEAKER WAVES. KEEP WELL BACK FROM THE SEA. NEVER TURN YOUR BACK ON IT.', 'The light\'s yellow most days. In a gale it goes red. Locals don\'t argue with it.'], verb: 'READ' },
];
export function makeBeach(): Room {
  const room: Room = {
    id: 'beach', title: 'REYNISFJARA', sub: 'THE BLACK SAND BEACH',
    w: W, h: H,
    lookAt: (x0, x1) => { const keep = COAST.view; COAST.view = { x0, x1 }; return () => { COAST.view = keep; }; },
    floor: { x0: 110, y0: FL0, x1: W - 14, y1: FL1 },
    blockers: [...STAIR.map(({ x }): Rect => ({ x0: x - 20, y0: STAIR_Y - 8, x1: x + 20, y1: STAIR_Y + 2 })), { x0: BHR.cam - 8, y0: 532, x1: BHR.cam + 8, y1: 542 }],
    doors: [{ trigger: { x0: BHR.door - 16, y0: FL0, x1: BHR.door + 16, y1: FL0 + 10 }, to: 'tourbus', arrive: { x: 1080, y: 512 }, label: 'THE BUS', area: { x0: BHR.bus, y0: 410, x1: BHR.bus + 214, y1: 482 },
      route: () => (busAt(4) ? { to: 'tourbus', arrive: { x: 1080, y: 512 }, label: 'BOARD THE BUS' } : null) }],
    spots: BCH_SPOTS, inUse: new Map(),
    spawn: { ...BCH_ARRIVE },
    dim: 0.1,
    dimNow: () => 0.06 + 0.5 * (1 - iceDay()),
    glowMul: () => 0.4 + 0.6 * (1 - iceDay()),
    fillTop: 'rgb(17,33,58)', fillLow: 'rgb(32,32,36)',
    bg: mk(W, H), bgAlt: mk(W, H), altAlpha: () => iceDay(),
    build: () => { paintSky(room.bg.getContext('2d')!, false, W, H, HZ); paintSky(room.bgAlt!.getContext('2d')!, true, W, H, HZ); },
    drawBack, drawFront: (a) => weatherFront(a, H),
    props: [...stair, tripod, warning],
    talkers: TALK,
  };
  return room;
}
void oval;
