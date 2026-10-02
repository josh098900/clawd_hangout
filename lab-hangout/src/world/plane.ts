// THE PLANE (step 19): LAB AIR 101 / 102, side on, nose to the right. The same room both ways, run by the plane's clock
// (game/air.ts): everyone aboard is in here together, and the windows show the whole trip, live. Left to right:
//   the LAVATORY (VACANT / OCCUPIED) and the rear galley (the drinks trolley lives here between rounds)
//   six rows of two seats (A by the window, C on the aisle), the overhead bins over them, the wing and its engine outside rows 3-5
//   the front galley, the moving-map screen on the bulkhead, the L1 DOOR (open onto the gate at either end while it boards) and
//   the COCKPIT door (locked: the captain's busy)
// The seatbelt sign, the cabin's lights (blue at night and for landing), and the shake (the take-off roll, bumpy air, touchdown).

import { K, PL, IS, AP, type RGB } from '../engine/palette';
import { PX, mk, r, line, disc, oval, txt, tw, lit, alpha, G, Gd, M, shade, bake } from '../engine/pixel';
import { clamp, h1 } from '../engine/math';
import { mmss } from '../engine/format';
import { dayness } from './plaza';
import { weather } from './weather';
import { air, airT, doorOpenAt, seatbelt, airShake, masksDrop, turbulence, AIR_ARRIVE, CLIMB_S, CRUISE_S, DESCEND_S, TOUCH_S, ROLL_S, LEG_S, type Air } from '../game/air';
import { iceDay, iceWeather, auroraNow, drawAurora, mountains } from './iceland';
import { drawJet } from './jet';
import type { Prop, Rect, Room, Spot, Talker } from './room';

const W = 1200, H = 614, WALL = 470, FL0 = 484, FL1 = 570;
/** Where things are along the cabin. */
export const PLR = { lav: 34, galley: 120, rows: [260, 380, 500, 620, 740, 860], fgalley: 980, door: 1046, cockpit: 1140, screen: 960 };
/** The seats: A (by the window) sits further back than C (the aisle). */
export const SEAT_Y = { A: 494, C: 516 };
/** The windows (their centres), one per row plus a couple by the galleys; the trip shows through all of them. */
/** (Not over the galleys' cupboards at either end.) */
const WINS = [270, 390, 510, 630, 750, 870];
const WIN_Y0 = 404, WIN_Y1 = 450, WIN_W = 24, WIN_CY = (WIN_Y0 + WIN_Y1) / 2, WIN_RX = WIN_W / 2, WIN_RY = (WIN_Y1 - WIN_Y0) / 2;
/** What the features tell the cabin to show (features/air.ts). */
export const PLANEW = {
  view: { x0: 0, x1: W },
  /** The lavatory: occupied since (s, performance clock), or -99. */
  lav: -99,
  /** PENNY's feet, when she's aboard (the trolley rolls just ahead of her on the drinks round). */
  penny: null as { x: number; y: number } | null,
};
const seen = (x0: number, x1: number): boolean => x1 >= PLANEW.view.x0 - 20 && x0 <= PLANEW.view.x1 + 20;
const now = (): number => performance.now() / 1000;

// ---------------------------------------------------------------- the set ----------------------------------------------------------------
function build(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    // ---- the ceiling and the overhead bins (a long row of rounded doors with their latches) ----
    r(0, 0, W, 330, PL.WALL2); for (let y = 250; y < 330; y += 3) r(0, y, W, 3, M(PL.WALL2, PL.BIN, (y - 250) / 80));
    r(200, 330, 760, 50, PL.BIN); r(200, 330, 760, 3, K.WHITE); r(200, 376, 760, 4, PL.BIN_DK); r(200, 380, 760, 2, PL.BIN_EDGE);
    for (let x = 200; x < 960; x += 95) { r(x, 330, 1, 50, PL.BIN_EDGE); r(x + 40, 366, 14, 4, PL.BIN_DK); r(x + 42, 367, 10, 2, PL.FRAME_DK); }
    // the LED strip under the bins, the reading lights and call buttons over each row
    r(200, 382, 760, 2, PL.LED);
    for (const rx of PLR.rows) { r(rx - 4, 384, 22, 6, PL.BIN_DK); r(rx - 2, 386, 4, 3, [240, 236, 220]); r(rx + 4, 386, 4, 3, [240, 236, 220]); r(rx + 11, 386, 4, 3, [120, 160, 220]); }
    // ---- the cabin wall: cream panels, the windows' deep frames (the view goes in live), a skirting ----
    r(0, 384, W, WALL - 384, PL.WALL); r(0, 384, W, 1, PL.WALL_DK);
    for (let x = 0; x < W; x += 60) r(x, 384, 1, WALL - 384, PL.WALL2);
    for (const wx of WINS) { oval(wx, WIN_CY + 1, WIN_RX + 6, WIN_RY + 6, PL.WALL2); oval(wx, WIN_CY, WIN_RX + 5, WIN_RY + 5, PL.FRAME); }
    r(0, WALL - 10, W, 10, PL.WALL_DK); r(0, WALL - 10, W, 1, PL.FRAME_DK);
    // ---- the floor: the aisle's patterned carpet, and the seat track ----
    r(0, WALL, W, H - WALL, PL.CARPET); for (let y = WALL + 4; y < H; y += 8) for (let x = ((y / 8) % 2) * 8; x < W; x += 16) r(x, y, 2, 2, PL.CARPET_DOT);
    r(0, WALL, W, 2, PL.CARPET2); r(190, 530, 790, 2, [150, 156, 166]); r(190, 531, 790, 1, [90, 96, 108]);
    // ---- the rear: the lavatory's door, the galley's steel (drawers, ovens, the coffee makers, the trolley's bay) ----
    r(4, 380, 62, 90, PL.GALLEY); r(4, 380, 62, 2, PL.GALLEY_HI); r(8, 386, 54, 84, PL.GALLEY_HI); r(8, 386, 54, 1, K.WHITE); r(56, 424, 4, 10, PL.GALLEY_DK); // (the lav door)
    r(70, 360, 120, 110, PL.GALLEY); r(70, 360, 120, 2, PL.GALLEY_HI);
    for (let j = 0; j < 3; j++) for (let k = 0; k < 4; k++) { r(74 + k * 28, 364 + j * 22, 26, 20, PL.GALLEY_HI); r(74 + k * 28, 364 + j * 22, 26, 1, K.WHITE); r(84 + k * 28, 372 + j * 22, 6, 2, PL.GALLEY_DK); }
    r(74, 432, 58, 38, [60, 64, 72]); r(76, 434, 54, 34, [40, 44, 50]); // (the trolley's bay)
    r(138, 434, 48, 14, PL.GALLEY_HI); for (let k = 0; k < 2; k++) { r(142 + k * 22, 426, 12, 10, [70, 74, 84]); r(144 + k * 22, 428, 8, 3, [230, 150, 60]); } // (the coffee makers)
    // ---- the front: the galley, the bulkhead with the moving-map screen, the L1 door's frame, the cockpit door ----
    r(960, 360, 60, 110, PL.GALLEY); r(960, 360, 60, 2, PL.GALLEY_HI); for (let j = 0; j < 4; j++) { r(964, 364 + j * 24, 52, 20, PL.GALLEY_HI); r(984, 372 + j * 24, 12, 2, PL.GALLEY_DK); }
    r(PLR.screen - 34, 392, 44, 30, PL.GALLEY_DK); // (the map screen's bezel: its picture goes in live)
    r(PLR.door - 24, 370, 48, 100, PL.FRAME_DK); r(PLR.door - 22, 372, 44, 98, PL.FRAME); // (the L1 door's frame)
    r(1090, 364, 104, 106, PL.WALL2); r(PLR.cockpit - 22, 380, 44, 90, [200, 204, 210]); r(PLR.cockpit - 22, 380, 44, 2, K.WHITE); r(PLR.cockpit - 6, 400, 12, 10, [60, 64, 72]); r(PLR.cockpit - 4, 402, 8, 6, [120, 160, 200]); r(PLR.cockpit + 14, 424, 4, 12, [90, 96, 108]);
    txt('CREW ONLY', PLR.cockpit - tw('CREW ONLY') / 2, 440, [150, 60, 60]);
    // the exit signs, green, over the doors
    for (const ex of [PLR.lav + 6, PLR.door]) { r(ex - 14, 360, 28, 8, [30, 34, 40]); lit(() => txt('EXIT', ex - tw('EXIT') / 2, 362, PL.EXIT)); }
    r(8, 372, 54, 6, [30, 34, 40]); // (the lav's own sign lives just above its door, lit live)
  });
}

// ---------------------------------------------------------------- the view out of the windows ----------------------------------------------------------------
/** How light it is outside (0 night .. 1 day): the city's clock at the city end, Iceland's at the other, blending along the way. */
function outsideDay(a: Air): number { const cityD = dayness(), iceD = iceDay(); const toIce = a.from === 'city' ? a.u : 1 - a.u; return cityD + (iceD - cityD) * clamp((toIce - 0.35) / 0.3, 0, 1); }
/** Where along the trip we are, as Iceland-ness (0 = over the city, 1 = over Iceland). */
const iceness = (a: Air): number => (a.from === 'city' ? a.u : 1 - a.u);
/** The whole trip, one panorama behind all the windows (clipped to their ovals): the gate, the runway, the land shrinking away below the
 *  horizon as we climb, the white-out in the clouds, the sea of cloud at cruise (gaps to the ocean), and the other end coming up. */
const HOR = WIN_Y0 + 26;
function planeView(a: number): void {
  const A = air(), day = outsideDay(A), ice = iceness(A), T = airT(), g = PX.ctx, alt = A.alt;
  g.save(); g.beginPath(); for (const wx of WINS) { if (!seen(wx - 20, wx + 20)) continue; g.moveTo(wx + WIN_RX, WIN_CY); g.ellipse(wx, WIN_CY, WIN_RX, WIN_RY, 0, 0, Math.PI * 2); } g.clip();
  const skyTop: RGB = M([8, 12, 32], [70, 140, 215], day), skyLow: RGB = M([26, 32, 64], [196, 226, 246], day);
  for (let y = WIN_Y0; y < HOR; y += 2) r(0, y, W, 2, M(skyTop, skyLow, (y - WIN_Y0) / (HOR - WIN_Y0)));
  if (day < 0.4) for (let k = 0; k < 40; k++) r(Math.floor(h1(k * 3.3) * W), WIN_Y0 + Math.floor(h1(k * 1.7) * 18), 1, 1, [220, 225, 250]);
  if (day > 0.5 && alt > 0.6) { const sx = 830; alpha(0.35, () => disc(sx, WIN_Y0 + 8, 9, [255, 250, 220])); disc(sx, WIN_Y0 + 8, 4, [255, 252, 235]); }
  // near Iceland, at night: the northern lights, even from up here
  if (ice > 0.55 && day < 0.3) { const au = auroraNow(); drawAurora(0, W, WIN_Y0 - 4, HOR - 2, Math.max(au.kp, 3), (1 - day) * clamp((ice - 0.55) / 0.3, 0, 1), a, 0.4); }
  const k = A.k, rolling = alt < 0.02 && ((k >= ROLL_S && k < CLIMB_S) || k >= TOUCH_S);
  const speed = alt < 0.02 ? (k >= ROLL_S && k < CLIMB_S ? ((k - ROLL_S) / (CLIMB_S - ROLL_S)) * 900 : k >= TOUCH_S ? (1 - (k - TOUCH_S) / (LEG_S - TOUCH_S)) * 700 : 0) : 40 + (1 - alt) * 260;
  const travel = T * speed;
  if (alt < 0.62) groundBelow(A, day, ice, alt, travel, rolling);
  // the sea of cloud: from the horizon down, once we're up through it (white by day, moonlit blue at night), with gaps to the ocean
  if (alt > 0.55) {
    const top = HOR + Math.round((1 - clamp((alt - 0.55) / 0.3, 0, 1)) * 20), cc = M([70, 80, 112], [250, 252, 255], day), sh = M([40, 46, 70], [206, 218, 236], day);
    r(0, top, W, WIN_Y1 - top, cc); for (let x = 0; x < W; x += 9) { const bx = ((x - T * 6) % W + W) % W; disc(Math.round(bx), top, 3 + Math.round(h1(x) * 4), cc); r(Math.round(bx) - 3, top + 7 + Math.round(h1(x * 3) * 6), 8, 2, sh); }
    const gap = ((T * 6) % 1800 + 1800) % 1800; if (gap < 700) { const gx = Math.round(W - gap * 1.6); r(gx, top + 8, 70, WIN_Y1 - top - 8, M([10, 26, 50], [40, 96, 150], day)); r(gx + 24, top + 14, 8, 1, K.WHITE); r(gx + 16, top + 15, 10, 1, M(K.WHITE, [40, 96, 150], 0.5)); }
  }
  // in the cloud: everything goes white
  const inCloud = clamp(1 - Math.abs(alt - 0.55) / 0.1, 0, 1);
  if (inCloud > 0) alpha(inCloud * 0.96, () => r(0, WIN_Y0, W, WIN_Y1 - WIN_Y0, M([80, 86, 110], [238, 242, 248], day)));
  // another plane far off, trailing its contrail across the cruise
  if (alt > 0.9) { const px = ((T * 30) % 2600) - 700; if (px > -100 && px < W + 100) { line(Math.round(px) - 160, WIN_Y0 + 8, Math.round(px), WIN_Y0 + 6, M([160, 170, 190], K.WHITE, day), 1); drawJet(Math.round(px) + 16, WIN_Y0 + 7, 18, 1, a, { gear: false, haze: 0.4, hazeCol: skyLow, night: day < 0.3 }); } }
  wing(A, a, day);
  g.restore();
}
/** The land under the horizon: on the ground the apron and the far side (the city's skyline, or Iceland's mountains); climbing out
 *  or coming down, the city (or Iceland's lava coast) seen from above, getting smaller the higher we are. */
function groundBelow(A: Air, day: number, ice: number, alt: number, travel: number, rolling: boolean): void {
  const atIce = ice > 0.5, w = atIce ? iceWeather() : weather(), night = 1 - day, sc = clamp(1 - alt * 1.3, 0.25, 1), snowy = atIce && (w.kind === 'snow' || h1(A.n) > 0.4);
  // the far side, along the horizon
  if (atIce) mountains(0, W, HOR + 1, 12 * sc + 4, 3.1, M(IS.MOUNTAIN, [18, 22, 34], night), M(IS.SNOW, [110, 120, 140], night), true);
  else for (let k = 0; k < 40; k++) { const bx = ((k * 31 - travel * 0.05) % 1300 + 1300) % 1300 - 50, bh = Math.round((6 + h1(k * 7) * 12) * sc); r(Math.round(bx), HOR - bh, Math.max(3, Math.round(14 * sc)), bh, M([150, 160, 180], [26, 30, 52], night)); if (night > 0.5) lit(() => r(Math.round(bx) + 2, HOR - bh + 2, 1, 1, [255, 214, 140])); }
  const gnd: RGB = alt < 0.02 ? (atIce ? (snowy ? [214, 220, 228] : IS.SLATE) : AP.TARMAC) : atIce ? IS.LAVA : [120, 136, 108];
  r(0, HOR + 1, W, WIN_Y1 - HOR, M(gnd, [22, 24, 32], night * 0.75));
  if (alt < 0.02) { // on the ground: the apron's lines and, rolling, the runway's lights streaking past
    const o = ((travel % 200) + 200) % 200; for (let x = -o; x < W; x += 200) { r(Math.round(x), HOR + 12, 90, 2, M(AP.LINE_Y, [80, 70, 30], night)); if (night > 0.5 || rolling) lit(() => r(Math.round(x) + 120, HOR + 6, 3, 2, rolling ? [255, 240, 200] : [80, 140, 255])); }
    return;
  }
  const o = travel * 0.4;
  if (atIce) { // black lava and green moss, the milky-blue lagoon steaming by the power station, snow on the hills
    for (let k = 0; k < 40; k++) { const x = ((k * 83 - o) % 1600 + 1600) % 1600 - 100; r(Math.round(x), HOR + 4 + (k % 5) * 4, Math.round((24 + (k % 3) * 12) * sc) + 4, 3, M(IS.MOSS, [18, 26, 18], night)); }
    const lx = Math.round(((700 - o * 0.9) % 1800 + 1800) % 1800 - 200); lit(() => r(lx, HOR + 10, Math.round(46 * sc) + 6, Math.round(6 * sc) + 2, M([150, 214, 220], [60, 110, 120], night))); for (let q = 0; q < 3; q++) alpha(0.4, () => disc(lx + 8 + q * 10, HOR + 6 - q, 3, K.WHITE));
    if (snowy) alpha(0.45, () => r(0, HOR + 1, W, WIN_Y1 - HOR, IS.SNOW));
  } else { // the city from above: blocks, roads, the lights at night; then the Pier and its lighthouse, and the sea
    for (let k = 0; k < 60; k++) { const x = ((k * 43 - o) % 2600 + 2600) % 2600 - 100; if (x > W) continue; const c: RGB = k % 5 === 0 ? [214, 90, 70] : k % 3 === 0 ? [206, 206, 214] : [150, 160, 176]; const bw = Math.max(3, Math.round(12 * sc)), by = HOR + 3 + (k % 4) * Math.round(6 * sc + 2); r(Math.round(x), by, bw, Math.max(2, Math.round(6 * sc)), M(c, [24, 28, 40], night)); if (night > 0.5) lit(() => r(Math.round(x) + 1, by + 1, 1, 1, [255, 214, 140])); }
    const sea = Math.round(((1400 - o) % 3000 + 3000) % 3000 - 300); r(sea, HOR + 1, 1200, WIN_Y1 - HOR, M([40, 110, 160], [10, 24, 44], night)); r(sea - 2, HOR + 4, 3, 10, [120, 90, 60]); lit(() => r(sea - 2, HOR - 4, 2, 5, night > 0.5 ? [255, 236, 170] : [236, 236, 240]));
  }
}
/** The wing outside rows 3-5 (with the engine under it), from inside the cabin: it runs back and down and out of sight. */
function wing(A: Air, a: number, day: number): void {
  const x0 = 470, x1 = 780, y = WIN_Y1 - 14, flaps = A.k < CLIMB_S + 10 || A.k >= DESCEND_S, c = M([200, 204, 212], [60, 64, 80], 1 - day), dk = M([150, 156, 166], [40, 44, 56], 1 - day);
  for (let x = x0; x < x1; x += 2) { const u = (x - x0) / (x1 - x0), t = Math.round(y - 4 + u * 10); r(x, t, 2, 6, c); r(x, t + 6, 2, 2, dk); }
  if (flaps) for (let x = x0 + 60; x < x1 - 20; x += 2) { const u = (x - x0) / (x1 - x0); r(x, Math.round(y + 4 + u * 10), 2, 3, dk); }
  r(560, y + 6, 70, 10, M([220, 224, 230], [70, 74, 90], 1 - day)); r(560, y + 6, 8, 10, [40, 44, 52]); // (the engine)
  if (day < 0.5 && (a * 1.2) % 1 < 0.12) { lit(() => r(x1 - 4, y + 13, 3, 2, [255, 255, 255])); Gd(x1 - 3, y + 14, 8, [240, 245, 255], 0.6); } // (the wingtip strobe)
}

// ---------------------------------------------------------------- the live bits ----------------------------------------------------------------
function drawBack(a: number): void {
  planeView(a);
  const A = air();
  // the windows' frames (over the view's soft clip edge), and a few shades pulled half down
  for (const [i, wx] of WINS.entries()) {
    if (!seen(wx - 20, wx + 20)) continue;
    if (h1(i * 7.7) > 0.7) { const g = PX.ctx; g.save(); g.beginPath(); g.ellipse(wx, WIN_CY, WIN_RX, WIN_RY, 0, 0, Math.PI * 2); g.clip(); r(wx - WIN_RX, WIN_Y0, WIN_W, 16, PL.SHADE); r(wx - WIN_RX, WIN_Y0 + 15, WIN_W, 1, PL.FRAME_DK); g.restore(); }
    frame(wx, WIN_CY, WIN_RX, WIN_RY, WIN_RX + 4, WIN_RY + 4, PL.FRAME); frame(wx, WIN_CY, WIN_RX, WIN_RY, WIN_RX + 1, WIN_RY + 1, PL.FRAME_DK); r(wx - 3, WIN_Y0 - 3, 6, 1, K.WHITE);
  }
  // the seatbelt signs over the rows (amber when lit, with a ding when they come on: features/air.ts)
  const belt = seatbelt(A);
  for (const rx of PLR.rows) { r(rx + 18, 384, 10, 6, [30, 34, 40]); if (belt) lit(() => { r(rx + 20, 385, 6, 4, [255, 190, 60]); }); }
  // the lavatory's little sign
  const occ = now() - PLANEW.lav < 4; lit(() => txt(occ ? 'OCCUPIED' : 'VACANT', 35 - tw(occ ? 'OCCUPIED' : 'VACANT') / 2, 373, occ ? [255, 90, 70] : [110, 230, 140]));
  // the bulkhead's moving map: the city to Iceland, the little plane on its way, the time left and how high
  { const sx = PLR.screen - 32, sy = 394, iceU = iceness(A); r(sx, sy, 40, 26, [8, 20, 40]);
    lit(() => { r(sx + 3, sy + 14, 8, 6, [70, 130, 80]); r(sx + 30, sy + 6, 8, 8, [220, 230, 240]); line(sx + 7, sy + 15, sx + 33, sy + 9, [255, 200, 90]);
      const px = Math.round(sx + 7 + iceU * 26), py = Math.round(sy + 15 - iceU * 6); r(px - 1, py - 1, 3, 3, K.WHITE);
      const left = A.k < TOUCH_S ? TOUCH_S - A.k : 0; txt(mmss(left), sx + 2, sy + 2, [150, 220, 255]); txt(Math.round(A.alt * 11) + 'KM', sx + 22, sy + 20, [150, 220, 255]); });
    Gd(PLR.screen - 12, sy + 13, 22, [80, 160, 255], 0.14); }
  // the L1 door: open onto the gate while it boards (either end), otherwise shut and armed
  { const open = doorOpenAt('city', A) || doorOpenAt('kef', A), x0 = PLR.door - 20;
    if (open) { r(x0, 374, 40, 96, A.from === 'city' ? [230, 226, 214] : [232, 220, 196]); for (let y = 382; y < 470; y += 8) r(x0 + 2, y, 36, 1, A.from === 'city' ? [206, 202, 190] : [205, 190, 160]); lit(() => r(x0 + 14, 376, 12, 2, [124, 242, 156])); }
    else { r(x0, 374, 40, 96, [214, 210, 200]); r(x0, 374, 40, 2, K.WHITE); r(x0 + 12, 380, 16, 20, [60, 70, 90]); r(x0 + 14, 382, 12, 16, M([80, 140, 200], [20, 30, 60], 1 - outsideDay(A))); r(x0 + 30, 420, 6, 16, [190, 40, 40]); r(x0 + 4, 440, 32, 2, [200, 60, 60]); } }
  // the cabin's LED strip: bright by day, blue at night and while it's landing
  const blue = outsideDay(A) < 0.4 || A.k >= DESCEND_S || A.k < CLIMB_S && A.k >= 90;
  lit(() => r(200, 382, 760, 2, blue ? PL.NIGHT_LED : PL.LED)); G(200, 380, 760, 30, blue ? [60, 90, 220] : [240, 246, 255], blue ? 0.12 : 0.05);
  // oxygen masks, dangling, on the one flight in twelve they drop by mistake (in the bumpy air)
  if (masksDrop(A.n) && turbulence(A) > 0) for (const rx of PLR.rows) { const sw = Math.sin(a * 5 + rx) * 3; line(rx + 6, 390, rx + 6 + Math.round(sw), 420, [220, 220, 220]); r(rx + 2 + Math.round(sw), 420, 9, 7, [255, 214, 60]); }
}
/** A solid oval frame: the ring between an inner oval (rx0, ry0) and an outer one (rx1, ry1). */
function frame(cx: number, cy: number, rx0: number, ry0: number, rx1: number, ry1: number, c: RGB): void {
  for (let dy = -ry1; dy <= ry1; dy++) {
    const xo = Math.round(rx1 * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry1 * ry1)))), xi = Math.abs(dy) < ry0 ? Math.round(rx0 * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry0 * ry0)))) : 0;
    if (xo > xi) { r(cx - xo, cy + dy, xo - xi, 1, c); r(cx + xi, cy + dy, xo - xi, 1, c); }
  }
}
/** The drinks trolley: parked in its bay, or rolling ahead of PENNY on the drinks round. */
const trolley: Prop = { y: 560, draw() {
  const p = PLANEW.penny, A = air(), round = p && A.k >= 158 && A.k < 244 && p.x > 190, x = round ? Math.round(p!.x + 26) : 104, y = round ? Math.round(p!.y + 4) : 470;
  if (!seen(x - 30, x + 30)) return;
  if (!round) return; // (in its bay, it's part of the galley)
  r(x - 14, y - 32, 28, 30, PL.TROLLEY); r(x - 14, y - 32, 28, 2, K.WHITE); for (let k = 0; k < 3; k++) r(x - 12, y - 28 + k * 9, 24, 1, PL.GALLEY_DK); r(x - 16, y - 34, 32, 3, PL.GALLEY_DK);
  r(x - 10, y - 40, 5, 6, [240, 130, 60]); r(x - 3, y - 40, 5, 6, [120, 200, 90]); r(x + 4, y - 38, 6, 4, [80, 60, 50]); disc(x - 10, y - 1, 2, [40, 40, 44]); disc(x + 10, y - 1, 2, [40, 40, 44]);
} };
/** Each row's seats, in profile (facing the nose): A by the window (further back), C on the aisle. A tall back leaning a touch, the
 *  orange headrest cover, a deep cushion, an armrest, the tray table and screen on the back for the row behind. */
const seatRow = (rx: number): Prop[] => (['A', 'C'] as const).map((L) => { const y = SEAT_Y[L]; return { y: y + 2, draw() {
  if (!seen(rx - 40, rx + 50)) return;
  const x = rx + (L === 'C' ? 6 : 0), sd = L === 'C' ? PL.SEAT : M(PL.SEAT, PL.SEAT_DK, 0.35), sh = L === 'C' ? PL.SEAT_HI : PL.SEAT;
  for (let k = 0; k < 50; k += 2) r(x - 26 + Math.round(k * 0.12), y - 54 + k, 13, 2, k < 12 ? PL.HEAD : k < 14 ? PL.HEAD_HI : sd); // (the back, leaning, with the headrest cover)
  r(x - 26, y - 54, 12, 2, PL.HEAD_HI); r(x - 14 + 6, y - 42, 2, 34, M(sd, PL.SEAT_DK, 0.4));
  r(x - 30, y - 38, 4, 14, [40, 44, 52]); r(x - 30, y - 37, 3, 10, L === 'C' ? [50, 110, 170] : [40, 70, 110]); r(x - 34, y - 22, 8, 2, [90, 96, 108]); // (the screen and the folded tray, for the row behind)
  r(x - 16, y - 14, 38, 10, sd); r(x - 16, y - 14, 38, 2, sh); r(x + 18, y - 14, 4, 10, M(sd, PL.SEAT_DK, 0.5)); // (the cushion)
  r(x + 16, y - 24, 4, 12, PL.SEAT_DK); r(x + 12, y - 24, 12, 3, [60, 64, 72]); // (the armrest)
  r(x - 12, y - 4, 3, 4, [90, 96, 108]); r(x + 14, y - 4, 3, 4, [90, 96, 108]); r(x - 14, y - 1, 32, 1, [60, 64, 72]); // (the legs, on the track)
} }; });

export const PLSPOT = { SEAT0: 0, LAV: 12, DRINKS: 13 };
export const PLANE_SPOTS: Spot[] = [
  ...PLR.rows.flatMap((rx): Spot[] => (['A', 'C'] as const).map((L): Spot => ({ kind: 'sit', x: rx + (L === 'C' ? 8 : 2), y: SEAT_Y[L] - 4, sx: rx + (L === 'A' ? 12 : 40), sy: 548, lift: 10, label: 'SIT ' + (PLR.rows.indexOf(rx) + 1) + L, area: { x0: rx - 22, y0: SEAT_Y[L] - 46, x1: rx + 22, y1: SEAT_Y[L] } }))),
  { kind: 'lav', x: PLR.lav, y: 500, sx: PLR.lav + 10, sy: 520, lift: 0, label: 'LAVATORY', area: { x0: 4, y0: 380, x1: 66, y1: 470 } },
  { kind: 'drinks', x: PLR.galley + 40, y: 500, sx: PLR.galley + 40, sy: 520, lift: 0, label: 'A DRINK', area: { x0: 70, y0: 360, x1: 190, y1: 470 } },
];
const TALK: Talker[] = [
  { id: 'cockpit', name: 'CAPTAIN WINGS', x: PLR.cockpit, y: 392, sx: PLR.cockpit - 30, sy: 520, lines: ['*knock knock* "Busy flying! Sit down, please!"', '"Who is it? ...The coffee? Leave it by the door."', '"No, you can\'t press the buttons."'], verb: 'KNOCK' },
  { id: 'bin', name: 'THE OVERHEAD BIN', x: 596, y: 350, sx: 596, sy: 548, lines: ['*clunk* You shut the bin. A little suitcase was about to fall out.', 'Everyone\'s coats, and one very squashed hat.'], verb: 'SHUT' },
  { id: 'mapscreen', name: 'THE MAP', x: PLR.screen - 12, y: 406, sx: PLR.screen - 12, sy: 520, lines: ['The little plane crawls across the map. Outside: minus fifty-two.', 'THE CITY on one side, ICELAND on the other, and a lot of sea between.'], verb: 'LOOK' },
];
export function makePlane(): Room {
  const room: Room = {
    id: 'plane', title: 'LAB AIR', sub: 'THE CITY - KEFLAVIK',
    w: W, h: H,
    floor: { x0: 12, y0: FL0, x1: W - 50, y1: FL1 },
    blockers: [
      ...PLR.rows.map((rx): Rect => ({ x0: rx - 22, y0: FL0 - 4, x1: rx + 24, y1: 526 })), // (the seats: the aisle's in front of them)
      { x0: 70, y0: FL0 - 4, x1: 190, y1: 492 }, { x0: 958, y0: FL0 - 4, x1: 1020, y1: 492 }, // the galleys' counters
    ],
    doors: [
      { trigger: { x0: PLR.door - 18, y0: FL0, x1: PLR.door + 18, y1: FL0 + 10 }, to: 'airport', arrive: AIR_ARRIVE.gate, label: 'EXIT', area: { x0: PLR.door - 22, y0: 372, x1: PLR.door + 22, y1: 470 },
        route: () => (doorOpenAt('city') ? { to: 'airport', arrive: AIR_ARRIVE.gate, label: 'EXIT: GATE A1' } : doorOpenAt('kef') ? { to: 'kef', arrive: AIR_ARRIVE.kef, label: 'EXIT: KEFLAVIK' } : null) },
    ],
    spots: PLANE_SPOTS, inUse: new Map(),
    spawn: { ...AIR_ARRIVE.plane },
    dim: 0.02,
    dimNow: () => { const A = air(); return outsideDay(A) < 0.4 || A.k >= DESCEND_S ? 0.22 : 0.02; },
    fillTop: 'rgb(224,218,203)', fillLow: 'rgb(59,74,99)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    shake: () => airShake(),
    props: [...PLR.rows.flatMap(seatRow), trolley],
    talkers: TALK,
  };
  return room;
}
void oval; void shade; void CRUISE_S; void iceWeather;
