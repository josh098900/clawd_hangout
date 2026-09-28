// REYKJAVÍK (step 19): Iceland's capital, off the bus from Keflavík. Outdoors, on Iceland's own clock (world/iceland.ts), with the
// northern lights over the bay at night. Left to right along the street:
//   THE BUS STOP: the shelter (the bus back to the airport), HEKLA's tourist INFO kiosk and its Iceland map board
//   THE RAINBOW STREET: the painted lanes leading up the hill to HALLGRÍMSKIRKJA (UP THE TOWER: the view from the top)
//   THE SHOPS: THE PUFFIN SHOP (souvenirs), the BAKERY (cinnamon swirls), the café (a cat asleep in the window), the elf house
//   THE HOT DOG STAND: SIGGA serves ONE WITH EVERYTHING
//   THE SEAFRONT: HARPA (its glass lights up at night), the SUN VOYAGER, the aurora bench and camera, the harbour, ÓLI
// Layers, so the lights can hang behind the mountains: the sky is the backdrop (bg = night, bgAlt = day, by Iceland's clock), then the
// aurora, then the whole town as a baked layer (night and day, cross-faded the same way), then everything alive.

import { K, IS, AP, type RGB } from '../engine/palette';
import { PX, mk, r, line, disc, oval, txt, tw, lit, alpha, G, Gd, M, shade, bake } from '../engine/pixel';
import { clamp, h1 } from '../engine/math';
import { AIR_ARRIVE } from '../game/air';
import { ICE, iceDay, iceGold, iceSun, iceWeather, auroraNow, drawAurora, mountains, forecast } from './iceland';
import type { Prop, Rect, Room, Spot, Talker } from './room';

const W = 1900, H = 614, WALL = 470, FL0 = 484, FL1 = 570, HORIZON = 424;
export const RKR = { bus: 70, info: 170, road0: 400, road1: 600, church: 500, puffin: 845, bakery: 955, cafe: 1055, elf: 1132, stand: 1320, harpa0: 1478, harpa1: 1680, bench: 1592, cam: 1650, voyager: 1810, harbour: 1880 };
/** What the features tell the set to show (features/air.ts). */
export const REYKW = { view: { x0: 0, x1: W }, knock: -99, elfOpen: -99, pet: -99 };
const seen = (x0: number, x1: number): boolean => x1 >= REYKW.view.x0 - 30 && x0 <= REYKW.view.x1 + 30;
const now = (): number => performance.now() / 1000;
/** HARPA's outline: its roof's height at x (planes rising to a peak towards the sea, the far corner cut off), and whether (x, y) is inside it (both its sides lean in as they rise). */
const harpaTop = (x: number): number => { const P: [number, number][] = [[RKR.harpa0 + 16, 406], [1556, 394], [1624, 380], [RKR.harpa1 - 4, 388]]; if (x < P[0][0]) return 470; for (let i = 0; i < P.length - 1; i++) if (x <= P[i + 1][0]) return Math.round(P[i][1] + ((P[i + 1][1] - P[i][1]) * (x - P[i][0])) / (P[i + 1][0] - P[i][0])); return 470; };
const inHarpa = (x: number, y: number): boolean => { const u = (y - 380) / (470 - 380); return y >= harpaTop(x) && x >= RKR.harpa0 + Math.round((1 - u) * 16) && x < RKR.harpa1 - Math.round((1 - u) * 6); };
/** Each of HARPA's panes that's wholly inside its outline (x, y: the pane's corner; they're 8 x 5, laid like bricks). */
const harpaPanes = (fn: (x: number, y: number) => void): void => { for (let y = 382; y < 468; y += 7) for (let x = RKR.harpa0 + 18 + (Math.floor(y / 7) % 2) * 5; x < RKR.harpa1 - 4; x += 10) if (inHarpa(x, y) && inHarpa(x + 8, y) && inHarpa(x, y + 5) && inHarpa(x + 8, y + 5)) fn(x, y); };
const RAINBOW: RGB[] = [[228, 60, 60], [240, 140, 50], [246, 214, 60], [80, 180, 90], [60, 120, 210], [140, 80, 190]];

// ---------------------------------------------------------------- the sky (the backdrop) ----------------------------------------------------------------
function paintSky(g: CanvasRenderingContext2D, day: boolean): void {
  bake(g, () => {
    const top: RGB = day ? IS.SKY : IS.SKY_NIGHT, low: RGB = day ? IS.SKY_LO : IS.SKY_NIGHT_LO;
    for (let y = 0; y < H; y += 2) r(0, y, W, 2, M(top, low, clamp(y / HORIZON, 0, 1) ** 1.3));
    if (!day) for (let k = 0; k < 160; k++) { const x = Math.floor(h1(k * 3.1) * W), y = Math.floor(h1(k * 1.7) * 380); r(x, y, 1, 1, h1(k * 5) > 0.8 ? [255, 250, 230] : [200, 210, 240]); }
  });
}

// ---------------------------------------------------------------- the town (a baked layer, by night and by day) ----------------------------------------------------------------
/** A corrugated-iron house: walls in its colour with the iron's ribs, a steep roof (dusted with snow), white-framed windows (lit at night: live), a door, a window box. */
function house(x0: number, x1: number, col: RGB, roof: RGB, eave: number, peak: number, day: boolean, opts: { door?: number; shop?: boolean; chimney?: boolean } = {}): void {
  const k = day ? 0 : 0.55, c = M(col, [10, 14, 26], k), rc = M(roof, [8, 10, 18], k), mid = (x0 + x1) / 2;
  r(x0, eave, x1 - x0, WALL - eave, c); for (let x = x0 + 2; x < x1; x += 4) r(x, eave, 1, WALL - eave, M(c, [0, 0, 0], 0.18));
  for (let y = peak; y < eave; y++) { const u = (y - peak) / (eave - peak), hw = Math.round(((x1 - x0) / 2 + 4) * u); r(Math.round(mid - hw), y, hw * 2, 1, rc); }
  for (let y = peak; y < eave; y += 3) { const u = (y - peak) / (eave - peak), hw = Math.round(((x1 - x0) / 2 + 4) * u); r(Math.round(mid - hw), y, 2, 1, IS.SNOW); r(Math.round(mid + hw - 2), y, 2, 1, IS.SNOW); } // (snow along the roof's edges)
  r(Math.round(mid - 3), peak - 1, 6, 2, IS.SNOW);
  if (opts.chimney) { r(Math.round(mid + (x1 - x0) * 0.2), peak + 6, 6, 12, M([150, 70, 60], [20, 14, 20], k)); r(Math.round(mid + (x1 - x0) * 0.2), peak + 5, 6, 2, IS.SNOW); }
  r(x0 - 1, eave, x1 - x0 + 2, 2, M(K.WHITE, [40, 44, 56], k)); // (the white trim under the eaves)
}
function windowsOf(x0: number, x1: number, eave: number, day: boolean, skip: (x: number) => boolean = () => false): void {
  const k = day ? 0 : 0.5, fr = M(K.WHITE, [60, 64, 76], k), gl = day ? [110, 150, 180] as RGB : [30, 34, 50] as RGB;
  for (const y of [eave + 10, eave + 34]) { if (y + 14 > WALL - 4) continue; for (let x = x0 + 8; x + 12 < x1 - 4; x += 20) { if (skip(x)) continue; r(x - 1, y - 1, 12, 16, fr); r(x, y, 10, 14, gl); r(x + 4, y, 2, 14, fr); if (day) r(x + 1, y + 1, 2, 5, [200, 226, 240]); r(x - 2, y + 15, 14, 3, M([120, 90, 60], [20, 16, 18], k)); if (h1(x + y) > 0.5) for (let f = 0; f < 4; f++) r(x - 1 + f * 3, y + 13, 2, 2, [[230, 80, 90], [250, 200, 60], [240, 240, 250], [90, 160, 90]][f] as RGB); } }
}
function paintTown(g: CanvasRenderingContext2D, day: boolean): void {
  const k = day ? 0 : 0.55, dk = (c: RGB): RGB => M(c, [8, 12, 24], k);
  bake(g, () => {
    // ---- the bay and Mount Esja across it (seen past the seafront, and between the houses) ----
    mountains(0, W, HORIZON, 48, 0.3, dk(IS.MOUNTAIN), dk(IS.SNOW), true);
    r(1380, HORIZON, W - 1380, WALL - HORIZON, dk(IS.SEA)); for (let y = HORIZON + 2; y < WALL; y += 5) for (let x = 1380 + ((y * 7) % 23); x < W; x += 40) r(x, y, 12, 1, dk(M(IS.SEA, K.WHITE, 0.25)));
    r(1380, HORIZON, W - 1380, 1, dk(M(IS.SEA, K.WHITE, 0.4)));
    // the breakwater and its little lighthouse, out in the bay; the fishing boats
    r(1660, 452, 90, 5, dk(IS.BASALT)); r(1700, 432, 6, 20, dk(K.WHITE)); r(1700, 438, 6, 3, dk([210, 60, 60])); r(1699, 429, 8, 3, dk([60, 60, 70]));
    // ---- HALLGRÍMSKIRKJA, up the hill behind the rainbow street: the stepped wings rising to the tower, the clock, the door ----
    { const lc = (c: RGB): RGB => (day ? c : M(M(c, [20, 24, 40], 0.3), [255, 226, 180], 0.1)), cx = RKR.church, base = 438, c = lc(IS.CHURCH), hi = lc(IS.CHURCH_HI), sh = lc(IS.CHURCH_DK); // (floodlit at night)
      r(cx - 90, base - 30, 180, 30, sh); // (the nave behind)
      for (let s = 0; s < 9; s++) { const hgt = 20 + s * 12, w = 7; r(cx - 16 - (9 - s) * w, base - hgt, w, hgt, s % 2 ? c : hi); r(cx + 16 + (8 - s) * w, base - hgt, w, hgt, s % 2 ? c : hi); } // (the basalt-column steps, up towards the tower)
      r(cx - 16, base - 150, 32, 150, c); r(cx - 16, base - 150, 3, 150, hi); r(cx + 13, base - 150, 3, 150, sh); for (let y = base - 140; y < base; y += 12) r(cx - 14, y, 28, 1, sh);
      r(cx - 10, base - 164, 20, 14, c); r(cx - 5, base - 178, 10, 14, c); r(cx - 1, base - 190, 2, 12, dk([90, 90, 96])); // (the spire, a cross on top)
      r(cx - 3, base - 186, 6, 2, dk([90, 90, 96]));
      r(cx - 8, base - 138, 16, 12, sh); for (let b = 0; b < 3; b++) r(cx - 7 + b * 5, base - 136, 3, 9, dk([40, 44, 56])); // (the belfry)
      disc(cx, base - 110, 7, dk(K.WHITE)); disc(cx, base - 110, 6, dk([236, 232, 222])); // (the clock face: its hands are live)
      r(cx - 7, base - 30, 14, 30, sh); r(cx - 6, base - 29, 12, 29, dk([90, 70, 60])); r(cx - 1, base - 29, 2, 29, dk([60, 44, 38])); // (the door)
      r(cx - 60, base, 120, 6, dk([150, 150, 156])); // (the hilltop's paving)
      // the explorer statue on his tall plinth, before the church
      r(cx + 34, base - 6, 12, 18, dk([120, 116, 110])); r(cx + 36, base - 18, 8, 12, dk([90, 110, 100])); disc(cx + 40, base - 21, 3, dk([90, 110, 100])); r(cx + 42, base - 26, 2, 10, dk([90, 110, 100]));
    }
    // ---- the rainbow street running up the hill to the church: six lanes narrowing into the distance ----
    for (let y = 440; y < WALL; y++) { const u = (y - 440) / (WALL - 440), half = 16 + u * (RKR.road1 - RKR.road0 - 32) / 2, x0 = RKR.church - half; for (let b = 0; b < 6; b++) r(Math.round(x0 + b * half / 3), y, Math.ceil(half / 3), 1, dk(RAINBOW[b])); }
    // ---- the houses: up the hill on either side of the rainbow street, then along the street ----
    house(230, 312, IS.RED, IS.ROOF_GREY, 404, 372, day, { chimney: true }); house(316, 398, IS.WHITE, IS.ROOF_RED, 410, 384, day);
    house(604, 686, IS.MUSTARD, IS.ROOF_GREEN, 406, 378, day, { chimney: true }); house(690, 780, IS.BLUE, IS.ROOF_GREY, 402, 370, day);
    for (const [x0, x1, e] of [[230, 312, 404], [316, 398, 410], [604, 686, 406], [690, 780, 402]] as [number, number, number][]) { windowsOf(x0, x1, e, day); r(Math.round((x0 + x1) / 2) - 6, WALL - 26, 12, 26, dk([70, 54, 44])); r(Math.round((x0 + x1) / 2) + 3, WALL - 14, 2, 2, dk([230, 190, 90])); }
    // THE PUFFIN SHOP (red), its big window full of puffins, jumpers and a horned helmet
    house(790, 900, IS.RED, IS.ROOF_BLACK, 398, 364, day, { shop: true });
    { const x0 = 800, y0 = 430; r(x0 - 2, y0 - 2, 70, 36, dk(K.WHITE)); r(x0, y0, 66, 32, day ? [236, 226, 206] : [255, 214, 150]);
      for (let p = 0; p < 4; p++) { const px = x0 + 8 + p * 15, py = y0 + 22; oval(px, py, 5, 7, dk([30, 30, 34])); oval(px, py + 2, 3, 4, dk(K.WHITE)); r(px - 2, py - 5, 5, 3, dk([240, 110, 40])); disc(px, py - 7, 3, dk([30, 30, 34])); r(px + 1, py - 8, 1, 1, dk(K.WHITE)); } // (puffin plushies)
      for (let j = 0; j < 2; j++) { r(x0 + 6 + j * 30, y0 + 3, 20, 12, dk([230, 220, 200])); for (let q = 0; q < 5; q++) r(x0 + 7 + j * 30 + q * 4, y0 + 6, 2, 2, dk([120, 60, 40])); } // (lopapeysa jumpers)
      disc(x0 + 58, y0 + 12, 5, dk([160, 160, 170])); r(x0 + 51, y0 + 7, 3, 4, dk([240, 232, 210])); r(x0 + 63, y0 + 7, 3, 4, dk([240, 232, 210])); // (a horned helmet)
      txt('PUFFIN SHOP', 845 - tw('PUFFIN SHOP') / 2, 404, dk(K.WHITE)); r(876, WALL - 30, 16, 30, dk([60, 40, 36])); }
    // THE BAKERY (mustard): BAKARI, a steamy window with trays of cinnamon swirls
    house(910, 1000, IS.MUSTARD, IS.ROOF_RED, 404, 372, day, { chimney: true });
    { const x0 = 918, y0 = 432; r(x0 - 2, y0 - 2, 52, 30, dk(K.WHITE)); r(x0, y0, 48, 26, day ? [250, 236, 210] : [255, 220, 160]); for (let q = 0; q < 6; q++) { disc(x0 + 7 + (q % 3) * 16, y0 + 8 + Math.floor(q / 3) * 11, 4, dk([200, 140, 70])); disc(x0 + 7 + (q % 3) * 16, y0 + 8 + Math.floor(q / 3) * 11, 2, dk([150, 90, 40])); } txt('BAKARI', 955 - tw('BAKARI') / 2, 410, dk([120, 60, 30])); r(978, WALL - 30, 16, 30, dk([90, 60, 40])); }
    // THE CAFÉ (teal): KAFFI, the window where the cat sleeps (the cat's live)
    house(1010, 1100, IS.TEAL, IS.ROOF_GREY, 402, 368, day);
    { r(1024, 430, 46, 30, dk(K.WHITE)); r(1026, 432, 42, 26, day ? [200, 214, 216] : [255, 210, 150]); r(1028, 452, 38, 3, dk([150, 110, 80])); txt('KAFFI', 1055 - tw('KAFFI') / 2, 410, dk(K.WHITE)); r(1076, WALL - 30, 16, 30, dk([60, 50, 44])); }
    // a gable end with a humpback mural, the LAUGAVEGUR sign
    { r(1102, 396, 44, WALL - 396, dk([220, 222, 226])); for (let y = 396; y < 406; y++) r(1102 + (y - 396), y, 44 - (y - 396) * 2, 1, dk(IS.ROOF_GREY)); oval(1124, 436, 16, 7, dk([60, 90, 140])); r(1106, 432, 6, 3, dk([60, 90, 140])); r(1138, 440, 6, 2, dk(K.WHITE)); r(1104, 422, 8, 5, dk([60, 90, 140])); r(1100, 384, 50, 8, dk([30, 70, 140])); txt('LAUGAVEGUR', 1125 - tw('LAUGAVEGUR') / 2, 386, dk(K.WHITE)); }
    // the black house with white trim
    house(1150, 1240, IS.BLACK, IS.ROOF_BLACK, 400, 366, day, { chimney: true }); windowsOf(1150, 1240, 400, day); r(1188, WALL - 28, 14, 28, dk([200, 60, 50]));
    // the elf house: a tiny painted house with a red door, on its mossy rock by the gable
    { const ex = RKR.elf, ey = WALL + 2; oval(ex, ey, 14, 6, dk(IS.BASALT)); oval(ex, ey - 2, 12, 5, dk(IS.MOSS)); r(ex - 6, ey - 16, 12, 10, dk(K.WHITE)); for (let y = ey - 22; y < ey - 16; y++) r(ex - 7 + (y - ey + 22), y, 14 - (y - ey + 22) * 2, 1, dk([200, 50, 50])); r(ex - 2, ey - 12, 4, 6, dk([200, 50, 50])); r(ex + 3, ey - 14, 2, 2, dk([80, 110, 150])); }
    // ---- the old harbour's warehouse (behind the hot dog stand): grey iron, and the HALL OF FAME board ----
    house(1244, 1440, [150, 156, 164], IS.ROOF_GREY, 408, 382, day);
    { r(1262, 422, 44, 34, dk([60, 40, 30])); r(1264, 424, 40, 30, dk([240, 230, 200])); txt('HALL OF FAME', 1284 - tw('HALL OF FAME') / 2, 426, dk([160, 40, 40])); for (let q = 0; q < 6; q++) { r(1267 + (q % 3) * 12, 434 + Math.floor(q / 3) * 10, 10, 8, dk([200, 206, 214])); disc(1272 + (q % 3) * 12, 438 + Math.floor(q / 3) * 10, 2, dk([[80, 200, 180], [240, 180, 60], [200, 110, 200]][q % 3] as RGB)); } }
    { for (let x = 1320; x < 1436; x += 20) { r(x, 420, 12, 16, dk([90, 96, 104])); r(x + 1, 421, 10, 14, day ? [110, 140, 160] : [30, 34, 50]); } }
    // ---- HARPA: the concert hall on the waterfront, a crystal of glass: its roof planes rise to a peak towards the sea, its sides lean
    // in, and its panes (they light up at night: live) are laid like bricks, with the building's folds catching the light ----
    { const x0 = RKR.harpa0, x1 = RKR.harpa1;
      for (let x = x0; x < x1 + 2; x++) { const t = harpaTop(x); if (t >= WALL) continue; for (let y = t; y < WALL; y++) if (inHarpa(x, y)) r(x, y, 1, 1, dk(M(IS.HARPA, IS.HARPA_DK, ((y - t) / (WALL - t)) * 0.45))); }
      harpaPanes((x, y) => { r(x, y, 8, 5, dk(M(IS.HARPA_HI, IS.HARPA, 0.3 + h1(x * y) * 0.4))); r(x, y, 8, 1, dk(IS.HARPA_DK)); });
      for (const [fx0, fx1] of [[1540, 1512], [1618, 1590]] as [number, number][]) for (let y = harpaTop(fx0) + 1; y < WALL; y++) { const x = Math.round(fx0 + ((fx1 - fx0) * (y - harpaTop(fx0))) / (WALL - harpaTop(fx0))); if (inHarpa(x, y)) r(x, y, 1, 1, dk(M(IS.HARPA_HI, K.WHITE, 0.3))); } // (the folds)
      for (let x = x0; x < x1 + 2; x++) { const t = harpaTop(x); if (t < WALL && inHarpa(x, t)) r(x, t, 1, 2, dk(IS.HARPA_DK)); } // the roof's edge
      txt('HARPA', x1 - 40, WALL - 12, dk(K.WHITE)); }
    // ---- the sea wall along the seafront: grey boulders at the water's edge ----
    for (let x = 1440; x < W; x += 14) { const hh = 8 + Math.floor(h1(x) * 6); oval(x + 6, WALL - hh / 2 + 2, 8, hh / 2 + 2, dk(M(IS.BASALT, IS.BASALT_HI, h1(x * 3)))); }
    // ---- THE SUN VOYAGER: the steel ship's skeleton on its granite base, pointing out to sea ----
    { const vx = RKR.voyager, vy = WALL - 6; r(vx - 36, vy, 72, 8, dk([120, 120, 126])); r(vx - 36, vy, 72, 2, dk([160, 160, 166]));
      for (let x = -32; x <= 32; x += 2) { const t = Math.round(4 + Math.abs(x) * 0.1 + (x > 20 ? (x - 20) * 0.8 : 0) + (x < -22 ? (-22 - x) * 0.9 : 0)); r(vx + x, vy - t, 2, 2, dk(IS.STEEL)); } // (the keel, sweeping up at bow and stern)
      for (let q = -24; q <= 20; q += 8) { const hgt = 22 - Math.abs(q) * 0.3; line(vx + q, vy - 4, vx + q + 4, Math.round(vy - 4 - hgt), dk(IS.STEEL)); } // (the ribs)
      line(vx + 30, vy - 8, vx + 44, vy - 34, dk(IS.STEEL), 2); line(vx - 30, vy - 8, vx - 40, vy - 28, dk(IS.STEEL), 2); } // (the prow and the stern)
    // ---- the bus stop, the INFO kiosk ----
    { r(28, 404, 84, 4, dk([90, 96, 104])); alpha(day ? 0.35 : 0.2, () => r(30, 408, 80, 60, AP.GLASS)); r(28, 404, 3, 66, dk([90, 96, 104])); r(109, 404, 3, 66, dk([90, 96, 104])); r(40, 420, 22, 28, dk([240, 238, 228])); for (let q = 0; q < 6; q++) r(43, 424 + q * 4, 16, 1, dk([60, 64, 72])); r(70, 412, 30, 10, dk([40, 110, 180])); txt('BUS', 77, 414, dk(K.WHITE)); }
    { const x0 = 132, x1 = 208; r(x0, 414, x1 - x0, WALL - 414, dk(IS.BIRCH_DK)); for (let x = x0; x < x1; x += 6) r(x, 414, 1, WALL - 414, dk(M(IS.BIRCH_DK, [0, 0, 0], 0.2))); for (let y = 398; y < 414; y++) r(x0 - 4 + (y - 398) * 0, y, x1 - x0 + 8, 1, dk(IS.ROOF_RED)); r(x0 - 4, 397, x1 - x0 + 8, 2, IS.SNOW);
      r(x0 + 8, 420, 60, 22, dk([240, 236, 226])); r(x0 + 30, 422, 16, 16, dk([60, 150, 220])); txt('I', x0 + 37, 427, dk(K.WHITE)); for (let q = 0; q < 4; q++) r(x0 + 10 + q * 5, 446, 4, 10, dk([[120, 180, 220], [220, 120, 90], [120, 190, 120], [230, 200, 90]][q] as RGB)); txt('INFO', x0 + 38 - tw('INFO') / 2, 405, dk(K.WHITE)); }
    // ---- the pavement along the house fronts, the street, the promenade; the rainbow lanes crossing the street ----
    r(0, WALL, W, H - WALL, dk(IS.PAVE)); for (let y = WALL; y < H; y += 12) { r(0, y, W, 1, dk(IS.PAVE2)); for (let x = ((y / 12) % 2) * 18; x < W; x += 36) r(x, y, 1, 12, dk(IS.PAVE2)); }
    r(0, WALL, W, 3, dk(IS.KERB));
    for (let y = WALL; y < H; y++) { const half = (RKR.road1 - RKR.road0) / 2 + (y - WALL) * 0.4, x0 = RKR.church - half; for (let b = 0; b < 6; b++) r(Math.round(x0 + b * half / 3), y, Math.ceil(half / 3), 1, dk(RAINBOW[b])); }
    r(1440, WALL, W - 1440, H - WALL, dk(M(IS.PAVE, K.WHITE, 0.15))); for (let x = 1440; x < W; x += 30) r(x, WALL, 1, H - WALL, dk(IS.PAVE2));
    for (let i = 0; i < 40; i++) { const x = Math.floor(h1(i * 2.3) * W), y = WALL + 3 + Math.floor(h1(i * 4.1) * 4); r(x, y, 6 + (i % 5), 2, IS.SNOW); } // (snow along the kerb)
    // a steam grate in the pavement (the city's geothermal heating)
    r(716, 520, 20, 8, dk([60, 64, 72])); for (let q = 0; q < 4; q++) r(718 + q * 5, 521, 2, 6, dk([30, 32, 38]));
  });
}
let townNight: HTMLCanvasElement | null = null, townDay: HTMLCanvasElement | null = null;
function towns(): void { if (townNight) return; townNight = mk(W, H); townDay = mk(W, H); paintTown(townNight.getContext('2d')!, false); paintTown(townDay.getContext('2d')!, true); }

// ---------------------------------------------------------------- live ----------------------------------------------------------------
function drawBack(a: number): void {
  towns();
  const day = iceDay(), night = 1 - day, gold = iceGold(), w = iceWeather(), au = auroraNow(), vx0 = Math.max(0, REYKW.view.x0 - 10), vx1 = Math.min(W, REYKW.view.x1 + 10), g = PX.ctx;
  // the low sun (and its glow on the sky) at dawn and dusk: the sky warms towards the horizon, violet-pink up high and gold
  // down low, fading in smoothly (no edge where it starts)
  if (gold > 0.01) for (let y = 150; y < HORIZON; y += 2) { const u = (y - 150) / (HORIZON - 150), k = gold * 0.62 * u * u * (3 - 2 * u); if (k > 0.01) alpha(k, () => r(vx0, y, vx1 - vx0, 2, u < 0.55 ? M([186, 128, 196], [240, 150, 150], u / 0.55) : M([240, 150, 150], [255, 200, 120], (u - 0.55) / 0.45))); }
  { const s = iceSun(); if (s > -0.08 && w.kind !== 'cloudy' && w.kind !== 'snow' && w.kind !== 'drizzle') { const sx = 1700 - Math.round((s + 0.05) * 400), sy = Math.round(HORIZON - 6 - s * 160); if (seen(sx - 20, sx + 20)) { alpha(0.3, () => disc(sx, sy, 12, [255, 220, 150])); disc(sx, sy, 6, M([255, 250, 220], [255, 160, 80], gold)); } } }
  // clouds: a lid of them when it's grey, a few drifting by when it's fine
  { const lid = w.kind === 'cloudy' || w.kind === 'snow' || w.kind === 'drizzle', n = lid ? 22 : 7, cc = M(M([40, 46, 66], [236, 240, 246], day), [150, 156, 166], lid ? 0.4 : 0);
    if (lid) alpha(0.55 * w.k, () => r(vx0, 0, vx1 - vx0, HORIZON, M([60, 66, 80], [170, 178, 190], day)));
    for (let q = 0; q < n; q++) { const cx = ((h1(q * 5.3) * (W + 400) + a * (2 + (q % 3))) % (W + 400)) - 200, cy = 40 + Math.floor(h1(q * 2.1) * 250), cw = 30 + Math.floor(h1(q * 7) * 50); if (!seen(cx - cw, cx + cw)) continue; alpha(lid ? 0.9 : 0.7, () => { oval(Math.round(cx), cy, cw, 8, cc); oval(Math.round(cx - cw / 2), cy - 5, cw / 2, 7, cc); oval(Math.round(cx + cw / 3), cy - 4, cw / 3, 6, cc); }); } }
  // THE NORTHERN LIGHTS
  drawAurora(vx0, vx1, 0, HORIZON - 8, au.kp, au.vis, a, 1.6);
  // the town over it, by night and by day
  g.drawImage(townNight!, 0, 0); if (day > 0.01) { g.globalAlpha = day; g.drawImage(townDay!, 0, 0); g.globalAlpha = 1; }
  // the aurora's glow on the bay, the snow, the wet street
  if (au.vis > 0.05 && au.kp >= 3) { const k = au.vis * Math.min(1, au.kp / 7); alpha(0.18 * k, () => r(Math.max(1380, vx0), HORIZON, vx1 - Math.max(1380, vx0), WALL - HORIZON, [80, 255, 160])); alpha(0.06 * k, () => r(vx0, WALL, vx1 - vx0, 40, [80, 255, 160])); }
  // ---- the lit windows at night, and the street lamps' glow ----
  if (night > 0.2) {
    const lamp = (x0: number, x1: number, e: number) => { for (const y of [e + 10, e + 34]) { if (y + 14 > WALL - 4) continue; for (let x = x0 + 8; x + 12 < x1 - 4; x += 20) if (h1(x * 3 + y) > 0.35) lit(() => alpha(night, () => r(x, y, 10, 14, [255, 206, 130]))); } };
    for (const [x0, x1, e] of [[230, 312, 404], [316, 398, 410], [604, 686, 406], [690, 780, 402], [1150, 1240, 400]] as [number, number, number][]) if (seen(x0, x1)) lamp(x0, x1, e);
    if (seen(800, 1100)) { G(800, 428, 70, 36, [255, 200, 130], 0.2 * night); G(918, 430, 50, 30, [255, 200, 130], 0.2 * night); G(1024, 430, 46, 30, [255, 200, 130], 0.2 * night); }
  }
  // ---- the church: floodlit at night, a light in the belfry, the clock's hands ----
  if (seen(RKR.church - 100, RKR.church + 100)) {
    const cx = RKR.church, base = 438; if (night > 0.3) { Gd(cx, base - 70, 44, [255, 236, 200], 0.08 * night); lit(() => alpha(night, () => r(cx - 7, base - 134, 14, 5, [255, 220, 150]))); }
    const d = new Date(), hr = (d.getHours() % 12) + d.getMinutes() / 60, mn = d.getMinutes(); line(cx, base - 110, cx + Math.round(Math.sin(hr / 12 * Math.PI * 2) * 3), base - 110 - Math.round(Math.cos(hr / 12 * Math.PI * 2) * 3), [40, 40, 44]); line(cx, base - 110, cx + Math.round(Math.sin(mn / 60 * Math.PI * 2) * 5), base - 110 - Math.round(Math.cos(mn / 60 * Math.PI * 2) * 5), [40, 40, 44]);
  }
  // ---- HARPA's glass: by night every pane lights up, a slow wave of colour rolling across it ----
  if (seen(RKR.harpa0, RKR.harpa1) && night > 0.15) {
    harpaPanes((x, y) => { const hue = (x * 0.012 + y * 0.02 - a * 0.25) % 1, c: RGB = hue < 0.33 ? M([60, 200, 255], [120, 90, 255], hue * 3) : hue < 0.66 ? M([120, 90, 255], [255, 90, 180], (hue - 0.33) * 3) : M([255, 90, 180], [60, 200, 255], (hue - 0.66) * 3); lit(() => alpha(night * (0.55 + 0.45 * h1(x + y)), () => r(x, y + 1, 8, 4, c))); });
    G(RKR.harpa0, 384, RKR.harpa1 - RKR.harpa0, WALL - 384, [120, 140, 255], 0.12 * night);
  }
  // ---- the harbour: the boats bobbing, the lighthouse's blink, the flag snapping in the wind ----
  if (seen(1440, W)) {
    for (const [bx, c] of [[1600, [200, 60, 50]], [1760, [40, 110, 170]], [1860, [240, 240, 244]]] as [number, RGB][]) { const bob = Math.round(Math.sin(a * 1.2 + bx) * 1.5), by = HORIZON + 22 + bob; r(bx - 12, by, 24, 5, M(c, [10, 14, 26], night * 0.6)); r(bx - 8, by - 5, 10, 5, M(K.WHITE, [30, 34, 46], night * 0.6)); r(bx + 4, by - 16, 1, 16, M([80, 80, 90], [20, 20, 26], night)); if (night > 0.5) lit(() => r(bx + 3, by - 17, 3, 2, [255, 220, 120])); }
    if (night > 0.3 && (a * 0.7) % 1 < 0.2) { lit(() => r(1701, 429, 4, 3, [255, 240, 180])); Gd(1703, 430, 16, [255, 240, 180], 0.5); }
    const fx = 1452, gust = w.kind === 'gale' ? 1.8 : 1; r(fx, 380, 2, 90, [180, 184, 190]); for (let q = 0; q < 16; q++) { const wave = Math.round(Math.sin(a * 6 * gust - q * 0.6) * (1 + q * 0.12)); const cx = fx + 2 + q, c: RGB = q >= 4 && q <= 6 ? [240, 240, 250] : [30, 70, 160]; r(cx, 382 + wave, 1, 12, M(c, [10, 14, 26], night * 0.5)); if (q >= 3 && q <= 7) r(cx, 382 + wave + 5, 1, 2, [240, 240, 250]); if (q === 5) r(cx, 382 + wave, 1, 12, [220, 30, 40]); } for (let q = 0; q < 16; q++) { const wave = Math.round(Math.sin(a * 6 * gust - q * 0.6) * (1 + q * 0.12)); if (q > 3) r(fx + 2 + q, 382 + wave + 5, 1, 2, [240, 240, 250]); r(fx + 2 + q, 382 + wave + 6, 1, 1, [220, 30, 40]); }
  }
  // ---- the bakery's chimney and the steam grate: puffs rising ----
  for (const [sx, sy, sp] of [[994, 380, 0.3], [726, 518, 0.5]] as [number, number, number][]) if (seen(sx - 20, sx + 20)) for (let q = 0; q < 4; q++) { const u = ((a * sp) + q / 4) % 1; alpha(0.45 * (1 - u), () => disc(sx + Math.round(Math.sin(u * 5 + q) * 3 + u * 6), Math.round(sy - u * 26), 2 + Math.round(u * 4), [236, 238, 244])); }
  // ---- the café window's cat, asleep (its tail flicks; it wakes up when someone's just petted it) ----
  if (seen(1020, 1080)) { const cx = 1046, cy = 452, awake = now() - REYKW.pet < 3; oval(cx, cy - 3, 8, 4, [240, 150, 60]); disc(cx + 7, cy - 6, 3, [240, 150, 60]); r(cx + 5, cy - 10, 2, 2, [240, 150, 60]); r(cx + 8, cy - 10, 2, 2, [240, 150, 60]); if (awake) { r(cx + 7, cy - 7, 1, 1, [40, 40, 40]); r(cx + 9, cy - 7, 1, 1, [40, 40, 40]); } else { r(cx + 6, cy - 6, 2, 1, [150, 90, 40]); r(cx + 9, cy - 6, 2, 1, [150, 90, 40]); } const flick = Math.round(Math.sin(a * (awake ? 6 : 1.5)) * 2); r(cx - 9, cy - 3 + flick, 5, 2, [240, 150, 60]); }
  // ---- the elf house: a tiny light in its window at night; its door creaks open a crack now and then (and when you knock) ----
  if (seen(RKR.elf - 20, RKR.elf + 20)) { const ex = RKR.elf, ey = WALL + 2, knocked = now() - REYKW.knock < 2.5, open = now() - REYKW.elfOpen < 3;
    if (night > 0.4 || knocked) { lit(() => r(ex + 3, ey - 14, 2, 2, [255, 214, 120])); Gd(ex + 4, ey - 13, 6, [255, 200, 110], 0.5); }
    if (open) { r(ex - 2, ey - 12, 2, 6, [30, 20, 20]); lit(() => r(ex - 1, ey - 10, 1, 1, [255, 230, 150])); } }
}
/** Iceland's weather over everything: snow, sideways snow in a gale, drizzle, a fog wash. */
function drawFront(a: number): void {
  const w = iceWeather(), vx0 = REYKW.view.x0, vx1 = REYKW.view.x1, n = w.kind === 'snow' ? 140 : w.kind === 'gale' ? 110 : w.kind === 'drizzle' ? 90 : 0;
  for (let q = 0; q < n; q++) {
    const span = vx1 - vx0 + 40, x = vx0 - 20 + ((h1(q) * span + (w.kind === 'gale' ? a * 120 : Math.sin(a * 0.8 + q) * 6)) % span + span) % span, y = (h1(q * 3) * H + a * (w.kind === 'drizzle' ? 140 : w.kind === 'gale' ? 40 : 18)) % H;
    if (w.kind === 'drizzle') alpha(0.35 * w.k, () => r(Math.round(x), Math.round(y), 1, 4, [200, 214, 230])); else alpha(w.k, () => r(Math.round(x), Math.round(y), w.kind === 'gale' ? 2 : 1, 1, K.WHITE));
  }
  if (ICE.forced === 'cloudy' || w.kind === 'cloudy') alpha(0.06 * w.k, () => r(vx0, 0, vx1 - vx0, H, [200, 206, 214]));
}

// ---------------------------------------------------------------- props ----------------------------------------------------------------
function stillProp(y: number, box: Rect, still: () => void, live?: (a: number) => void): Prop {
  let c: HTMLCanvasElement | null = null;
  return { y, draw(a: number) {
    if (!seen(box.x0, box.x1)) return;
    if (!c) { const cv = mk(box.x1 - box.x0, box.y1 - box.y0), g = cv.getContext('2d')!; g.translate(-box.x0, -box.y0); const d = PX.dim, e = PX.emit, f = PX.fl, ctx = PX.ctx; PX.dim = 0; PX.emit = false; PX.fl = 0; try { PX.ctx = g; still(); } finally { PX.ctx = ctx; PX.dim = d; PX.emit = e; PX.fl = f; } c = cv; }
    PX.ctx.drawImage(c, box.x0, box.y0); live?.(a);
  } };
}
/** THE HOT DOG STAND: a little red-and-white kiosk with a string of bulbs, its hatch and counter, a queue sign; steam off the grill. */
const stand = stillProp(504, { x0: RKR.stand - 56, y0: 420, x1: RKR.stand + 56, y1: 506 }, () => {
  const x0 = RKR.stand - 50, x1 = RKR.stand + 50;
  r(x0, 446, x1 - x0, 56, [200, 50, 50]); for (let x = x0; x < x1; x += 10) r(x, 446, 5, 56, [236, 236, 240]); // (the red-and-white stripes)
  r(x0 - 4, 432, x1 - x0 + 8, 14, [180, 36, 40]); r(x0 - 4, 432, x1 - x0 + 8, 2, [230, 90, 90]); txt('BEST HOT DOGS', RKR.stand - tw('BEST HOT DOGS') / 2, 435, K.WHITE);
  r(x0 + 16, 452, x1 - x0 - 32, 22, [40, 30, 28]); r(x0 + 12, 474, x1 - x0 - 24, 4, [150, 110, 80]); // (the hatch, the counter)
  for (let q = 0; q < 3; q++) { r(x0 + 22 + q * 20, 468, 14, 4, [230, 170, 100]); r(x0 + 22 + q * 20, 467, 14, 2, [200, 90, 70]); } // (hot dogs waiting)
  r(x0 + 4, 490, x1 - x0 - 8, 12, [150, 40, 44]); txt('IN TOWN', RKR.stand - tw('IN TOWN') / 2, 493, K.WHITE);
}, (a) => {
  const x0 = RKR.stand - 50, x1 = RKR.stand + 50, night = 1 - iceDay();
  for (let x = x0; x <= x1; x += 10) { const on = night > 0.3 || Math.sin(a * 2 + x) > 0; lit(() => r(x, 428, 2, 2, on ? [255, 220, 130] : [120, 100, 60])); if (on && night > 0.3) Gd(x, 429, 6, [255, 210, 120], 0.3); }
  for (let q = 0; q < 3; q++) { const u = ((a * 0.4) + q / 3) % 1; alpha(0.4 * (1 - u), () => disc(RKR.stand - 10 + q * 10 + Math.round(Math.sin(u * 6) * 2), Math.round(456 - u * 16), 2 + Math.round(u * 3), K.WHITE)); }
});
/** A street lamp: black iron, a warm lantern (lit at night, with its glow). */
const streetLamp = (x: number): Prop => ({ y: 494, draw() { if (!seen(x - 20, x + 20)) return; const night = 1 - iceDay(); r(x - 1, 424, 3, 70, [40, 42, 48]); r(x - 3, 492, 7, 3, [40, 42, 48]); r(x - 5, 416, 11, 9, [40, 42, 48]); lit(() => r(x - 3, 418, 7, 5, night > 0.3 ? [255, 220, 140] : [200, 196, 180])); if (night > 0.3) { Gd(x, 420, 14, [255, 210, 130], 0.45 * night); Gd(x, 494, 18, [255, 210, 130], 0.1 * night); } } });
const bench = (x: number, y: number): Prop => stillProp(y, { x0: x - 34, y0: y - 26, x1: x + 34, y1: y + 2 }, () => { r(x - 30, y - 12, 60, 4, [120, 84, 56]); r(x - 30, y - 12, 60, 1, [160, 118, 80]); r(x - 30, y - 22, 60, 3, [120, 84, 56]); for (const lx of [x - 26, x + 23]) r(lx, y - 22, 3, 22, [40, 42, 48]); });
/** The aurora camera: a tripod facing out over the bay. */
const tripod: Prop = stillProp(532, { x0: RKR.cam - 14, y0: 496, x1: RKR.cam + 14, y1: 534 }, () => { const x = RKR.cam; line(x, 512, x - 8, 532, [40, 42, 48]); line(x, 512, x + 8, 532, [40, 42, 48]); line(x, 512, x, 532, [40, 42, 48]); r(x - 7, 502, 14, 10, [30, 30, 34]); r(x + 5, 504, 5, 6, [60, 64, 72]); r(x - 5, 504, 4, 4, [80, 120, 180]); });
const bin = (x: number, y: number): Prop => stillProp(y, { x0: x - 8, y0: y - 20, x1: x + 8, y1: y + 2 }, () => { r(x - 6, y - 18, 12, 18, [60, 90, 80]); r(x - 7, y - 20, 14, 3, [80, 110, 100]); });
const bike: Prop = stillProp(498, { x0: 1154, y0: 476, x1: 1186, y1: 500 }, () => { const x = 1170, y = 496; for (const dx of [-10, 10]) { for (let q = 0; q < 12; q++) { const an = q / 12 * Math.PI * 2; r(x + dx + Math.round(Math.cos(an) * 6), y - 6 + Math.round(Math.sin(an) * 6), 1, 1, [40, 42, 48]); } } line(x - 10, y - 6, x, y - 12, [200, 60, 60]); line(x, y - 12, x + 10, y - 6, [200, 60, 60]); line(x - 2, y - 12, x + 4, y - 18, [200, 60, 60]); r(x + 2, y - 19, 6, 2, [40, 42, 48]); });

export const RKSPOT = { TOWER: 0, SHOP: 1, BAKERY: 2, PYLSA: 3, VOYAGER: 4, CAM: 5, ELF: 6, CAT: 7, MAP: 8, BENCH0: 9, FORECAST: 13 };
export const REYKJAVIK_SPOTS: Spot[] = [
  { kind: 'tower', x: RKR.church, y: 492, sx: RKR.church, sy: 492, lift: 0, label: 'UP THE TOWER', area: { x0: RKR.church - 40, y0: 280, x1: RKR.church + 40, y1: 470 } },
  { kind: 'giftshop', n: 2, x: RKR.puffin, y: 492, sx: RKR.puffin, sy: 492, lift: 0, label: 'PUFFIN SHOP', area: { x0: 790, y0: 396, x1: 900, y1: 470 } },
  { kind: 'bakery', x: RKR.bakery, y: 492, sx: RKR.bakery, sy: 492, lift: 0, label: 'BAKERY', area: { x0: 910, y0: 400, x1: 1000, y1: 470 } },
  { kind: 'pylsa', x: RKR.stand, y: 524, sx: RKR.stand, sy: 524, lift: 0, label: 'ONE WITH EVERYTHING', area: { x0: RKR.stand - 50, y0: 428, x1: RKR.stand + 50, y1: 504 } },
  { kind: 'voyager', x: RKR.voyager, y: 492, sx: RKR.voyager, sy: 492, lift: 0, label: 'SUN VOYAGER', area: { x0: RKR.voyager - 44, y0: 420, x1: RKR.voyager + 44, y1: 472 } },
  { kind: 'auroracam', x: RKR.cam, y: 544, sx: RKR.cam, sy: 544, lift: 0, label: 'PHOTO OF THE SKY', area: { x0: RKR.cam - 14, y0: 496, x1: RKR.cam + 14, y1: 534 } },
  { kind: 'elf', x: RKR.elf, y: 492, sx: RKR.elf, sy: 492, lift: 0, label: 'KNOCK', area: { x0: RKR.elf - 14, y0: 452, x1: RKR.elf + 14, y1: 476 } },
  { kind: 'cat', x: RKR.cafe - 9, y: 492, sx: RKR.cafe - 9, sy: 492, lift: 0, label: 'PET THE CAT', area: { x0: 1024, y0: 428, x1: 1070, y1: 460 } },
  { kind: 'map', x: 150, y: 492, sx: 150, sy: 492, lift: 0, label: 'MAP', area: { x0: 132, y0: 414, x1: 170, y1: 470 } },
  ...[RKR.bench - 13, RKR.bench + 13].map((x): Spot => ({ kind: 'sit', x, y: 534, sx: x, sy: 552, lift: 8, label: 'SIT', area: { x0: x - 14, y0: 512, x1: x + 14, y1: 536 }, watch: { x: 1650, top: 190 } })),
  ...[1190, 1216].map((x): Spot => ({ kind: 'sit', x, y: 534, sx: x, sy: 552, lift: 8, label: 'SIT', area: { x0: x - 14, y0: 512, x1: x + 14, y1: 536 } })),
  { kind: 'forecast', x: 198, y: 492, sx: 198, sy: 492, lift: 0, label: 'AURORA FORECAST', area: { x0: 176, y0: 414, x1: 208, y1: 470 } },
];
const TALK: Talker[] = [
  { id: 'statue', name: 'THE EXPLORER', x: RKR.church + 40, y: 420, sx: RKR.church + 40, sy: 520, lines: ['A statue of an explorer who sailed on to find a whole new land. He looks like he\'s still deciding where next.', 'He\'s been pointing that way for years.'], verb: 'LOOK' },
  { id: 'mural', name: 'THE MURAL', x: 1108, y: 436, sx: 1100, sy: 506, lines: ['A humpback whale, painted three storeys tall. It looks happy about it.'], verb: 'LOOK' },
  { id: 'hall-of-fame', name: 'THE HALL OF FAME', x: 1284, y: 440, sx: 1284, sy: 520, lines: ['Photos of happy customers holding hot dogs. Every single one looks delighted.', 'A signed photo: "BEST HOT DOG OF MY LIFE." Someone\'s drawn a crown on it.'], verb: 'LOOK' },
  { id: 'harpa', name: 'HARPA', x: 1580, y: 430, sx: 1580, sy: 500, lines: ['HARPA, the concert hall: hundreds of glass panes, like a honeycomb. At night they light up.', 'Music drifts out when the doors open. Something with a lot of cellos.'], verb: 'LOOK' },
  { id: 'whale-boat', name: 'THE WHALE BOAT', x: 1860, y: 440, sx: 1860, sy: 500, lines: ['WHALE WATCHING: COMING SOON. The boat bobs, ready. The whales are ready too, probably.'], verb: 'READ' },
  { id: 'flag', name: 'THE FLAG', x: 1462, y: 390, sx: 1462, sy: 500, lines: ['Iceland\'s flag: a red cross on white, on blue. Fire, ice and sea.', 'It snaps in the wind. There is always wind.'], verb: 'LOOK' },
];
export function makeReykjavik(): Room {
  const room: Room = {
    id: 'reykjavik', title: 'REYKJAVIK', sub: 'ICELAND',
    w: W, h: H,
    lookAt: (x0, x1) => { const keep = REYKW.view; REYKW.view = { x0, x1 }; return () => { REYKW.view = keep; }; },
    floor: { x0: 14, y0: FL0, x1: W - 14, y1: FL1 },
    blockers: [
      { x0: RKR.stand - 50, y0: 490, x1: RKR.stand + 50, y1: 506 }, // the hot dog stand
      { x0: RKR.bench - 30, y0: 522, x1: RKR.bench + 30, y1: 536 }, { x0: 1173, y0: 522, x1: 1233, y1: 536 }, // the benches
      { x0: RKR.cam - 8, y0: 526, x1: RKR.cam + 8, y1: 534 }, { x0: 1156, y0: 490, x1: 1186, y1: 500 }, // the tripod, the bike
    ],
    doors: [
      { trigger: { x0: 44, y0: FL0, x1: 96, y1: FL0 + 10 }, to: 'kef', arrive: AIR_ARRIVE.kefExit, label: 'BUS TO THE AIRPORT', area: { x0: 28, y0: 404, x1: 112, y1: 470 } },
    ],
    spots: REYKJAVIK_SPOTS, inUse: new Map(),
    spawn: { ...AIR_ARRIVE.reykjavik },
    dim: 0.1,
    dimNow: () => 0.06 + 0.5 * (1 - iceDay()),
    glowMul: () => 0.4 + 0.6 * (1 - iceDay()),
    fillTop: 'rgb(17,33,58)', fillLow: 'rgb(154,157,162)',
    bg: mk(W, H), bgAlt: mk(W, H), altAlpha: () => iceDay(),
    build: () => { paintSky(room.bg.getContext('2d')!, false); paintSky(room.bgAlt!.getContext('2d')!, true); },
    drawBack, drawFront,
    props: [stand, streetLamp(260), streetLamp(620), streetLamp(900), streetLamp(1160), streetLamp(1470), streetLamp(1760), bench(RKR.bench, 534), bench(1203, 534), tripod, bin(1398, 510), bin(740, 500), bike],
    talkers: TALK,
  };
  return room;
}
void forecast; void shade; void AP; void clamp;
