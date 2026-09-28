// THE AIRPORT (step 19): the city's terminal, up the escalator from the Subway's AIRPORT stop. Left to right, the way you go:
//   the escalator down to the trains, and the info pillar (a map board)
//   CHECK-IN: three LAB AIR desks (DOT prints your BOARDING PASS), the bag belt behind them
//   SECURITY: the X-RAY belt (its screen shows what's in the hands of whoever's at it) and THE ARCH (it beeps for anything metal)
//   AIRSIDE: the split-flap DEPARTURES board, the AURORA FORECAST, DUTY FREE, the café
//   GATE A1: seats, the gate desk, and THE BIG WINDOW: the plane's day, live from the clock (game/air.ts), and the jet bridge door
// Inside it's always bright; the city's clock and weather only show through the window.
//
// The camera shows ~160 px above your feet and the HUD covers the top of that, so everything you read sits between y 386 and the
// wall's base (470), and the floor is shallow (484-570): from anywhere on it, the whole band is in view (step 17's lesson).

import { K, AP, type RGB } from '../engine/palette';
import { PX, mk, r, line, disc, oval, txt, tw, lit, alpha, G, Gd, M, shade, bake } from '../engine/pixel';
import { h1, clamp } from '../engine/math';
import { mmss } from '../engine/format';
import { dayness } from './plaza';
import { weather, lightning } from './weather';
import { flight } from './space';
import { rocketOnRoof } from './roof';
import { air, airT, doorOpenAt, nextBoarding, AIR_ARRIVE, PUSH_S, TAXI_S, CLIMB_S, CRUISE_S, TOUCH_S, AIR_CYCLE } from '../game/air';
import { forecast } from './iceland';
import { drawJet, jetOnApron } from './jet';
import { boardGlow } from './boards';
import type { Prop, Rect, Room, Spot, Talker } from './room';

const W = 1900, H = 614, WALL = 470, FL0 = 484, FL1 = 570;
/** The zones, left to right. */
export const APR = { esc: 58, pillar: 164, desk: [250, 370, 490], xray: 606, arch: 846, board: 990, tv: 1130, duty: 1218, cafe: 1306, win0: 1362, win1: 1900, gateDesk: 1420, bridge: 1852 };
/** The arch's lane (you walk through it between these y). */
export const LANE = { y0: 504, y1: 540 };
/** What the features tell the set to show (features/air.ts). */
export const AIRW = {
  view: { x0: 0, x1: W },
  /** The X-ray: what's on the belt (a hold, or -1) and since when (s, performance clock). */
  xray: { hold: -1, t0: -99 },
  /** The arch: when it last went off, and whether it beeped (red) or dinged (green). */
  arch: { t: -99, beep: false },
  /** Which check-in desks someone's standing at (the scale shows their weight). */
  busy: new Set<number>(),
  /** The departures board: each line's text as it was, and when it last flipped (the flap clatter). */
  flips: [] as { text: string; t: number }[],
};
const seen = (x0: number, x1: number): boolean => x1 >= AIRW.view.x0 - 20 && x0 <= AIRW.view.x1 + 20;
const now = (): number => performance.now() / 1000;
/** An oblique x shift for things that recede along the floor (the barrier, the arch): further back = a little to the left. */
const back = (y: number): number => Math.round((y - FL1) * 0.55);

// ---------------------------------------------------------------- the set ----------------------------------------------------------------
function sign(x: number, y: number, text: string, w?: number): void {
  const ww = w ?? tw(text) + 12; r(x, y, ww, 13, AP.SIGN); r(x, y, ww, 1, AP.SIGN_HI); r(x, y + 12, ww, 1, shade(AP.SIGN, 0.7));
  lit(() => txt(text, x + Math.round((ww - tw(text)) / 2), y + 4, AP.SIGN_TXT));
}
function pillarAt(x0: number, x1: number): void { r(x0, 300, x1 - x0, WALL - 300, AP.WALL2); r(x0, 300, 2, WALL - 300, AP.WALL); r(x1 - 2, 300, 2, WALL - 300, AP.WALL_DK); r(x0 - 2, WALL - 10, x1 - x0 + 4, 10, AP.FLOOR_DK); }
function build(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    // ---- the roof: a long skylight between white trusses (low enough for a phone's tall screen, and the back of the floor, to see;
    // the sky in its panes is live), then a truss, fading down to the wall ----
    r(0, 0, W, 320, AP.CEIL); for (let y = 0; y < SKY0; y += 3) r(0, y, W, 3, M(AP.CEIL, [200, 206, 212], 1 - y / SKY0));
    for (let x = 0; x < W; x += 60) { r(x, SKY0, 58, SKY1 - SKY0, AP.SKYPANE); r(x + 58, SKY0 - 2, 2, SKY1 - SKY0 + 2, AP.TRUSS); }
    r(0, SKY0 - 3, W, 3, AP.TRUSS); r(0, SKY1, W, 4, AP.TRUSS); r(0, SKY1 + 4, W, 1, AP.TRUSS_DK); r(0, 310, W, 3, AP.TRUSS); r(0, 313, W, 1, AP.TRUSS_DK);
    for (let x = 0; x < W; x += 60) { line(x, SKY1 + 5, x + 30, 309, AP.TRUSS_DK); line(x + 30, 309, x + 60, SKY1 + 5, AP.TRUSS_DK); }
    for (let y = 314; y < 320; y++) r(0, y, W, 1, M(AP.CEIL, AP.WALL, (y - 314) / 6));
    // ---- the wall: white panels with seams, the hanging signs' rods, a dado along the bottom ----
    r(0, 320, W, WALL - 320, AP.WALL); for (let x = 0; x < W; x += 120) r(x, 320, 1, WALL - 320, AP.WALL2);
    r(0, WALL - 14, W, 14, AP.WALL2); r(0, WALL - 14, W, 1, AP.WALL_DK); r(0, WALL - 3, W, 3, AP.FLOOR_DK);
    // the hanging direction signs (up high: seen from the back of the floor, and on bigger screens)
    sign(250, 340, 'CHECK-IN 1-3 >', 110); sign(640, 340, 'SECURITY > GATES', 120); sign(1000, 340, 'GATE A1 >', 90); sign(40, 340, '< TRAINS', 76);
    for (const [x, w] of [[250, 110], [640, 120], [1000, 90], [40, 76]] as [number, number][]) { r(x + 8, 320, 1, 20, AP.STEEL_DK); r(x + w - 9, 320, 1, 20, AP.STEEL_DK); }
    // ---- the floor: pale terrazzo with specks and brass inlay lines; the gate's carpet ----
    r(0, WALL, W, H - WALL, AP.FLOOR);
    for (let i = 0; i < 2200; i++) { const x = Math.floor(h1(i * 1.37) * W), y = WALL + Math.floor(h1(i * 2.71) * (H - WALL)); r(x, y, 1, 1, h1(i * 5.3) > 0.5 ? AP.SPECK : AP.FLOOR2); }
    for (const y of [500, 548]) r(0, y, APR.win0, 1, AP.INLAY);
    for (let x = 160; x < APR.win0; x += 240) line(x, WALL + 2, x - 36, H, AP.INLAY);
    r(APR.win0, WALL, W - APR.win0, H - WALL, AP.CARPET); for (let y = WALL + 6; y < H; y += 12) for (let x = APR.win0 + ((y / 12) % 2) * 12; x < W; x += 24) r(x, y, 2, 2, AP.CARPET_DOT);
    r(APR.win0, WALL, 2, H - WALL, AP.INLAY_HI);
    // ---- the trains end: the stairwell down (front left), the trolley corral, the info pillar ----
    r(14, 528, 88, 86, [70, 74, 82]); for (let k = 0; k < 8; k++) r(18, 532 + k * 11, 80, 5, [150, 154, 162]); r(12, 520, 92, 8, AP.STEEL); r(12, 520, 92, 2, AP.STEEL_HI); r(12, 520, 4, 94, AP.STEEL); r(100, 520, 4, 94, AP.STEEL);
    sign(22, 426, '< TRAINS', 72);
    // the luggage trolleys, nested in a row, side on: the handle (LAB AIR orange) up at the back, the rack, the platform, the wheels
    for (let k = 0; k < 5; k++) { const x0 = 34 + k * 11, y0 = 468;
      line(x0 + 2, y0 - 4, x0 - 3, y0 - 25, AP.STEEL_DK); line(x0 + 3, y0 - 4, x0 - 2, y0 - 25, AP.STEEL); r(x0 - 7, y0 - 27, 9, 2, AP.ORANGE); r(x0 - 7, y0 - 27, 9, 1, AP.ORANGE_HI);
      line(x0, y0 - 14, x0 + 13, y0 - 14, AP.STEEL); line(x0 + 13, y0 - 14, x0 + 20, y0 - 5, AP.STEEL_DK);
      r(x0, y0 - 5, 26, 2, AP.STEEL); r(x0, y0 - 5, 26, 1, AP.STEEL_HI); r(x0 + 24, y0 - 9, 2, 5, AP.STEEL);
      disc(x0 + 3, y0 - 1, 2, AP.RUBBER); disc(x0 + 21, y0 - 1, 2, AP.RUBBER); r(x0 + 3, y0 - 1, 1, 1, AP.STEEL); r(x0 + 21, y0 - 1, 1, 1, AP.STEEL); }
    pillarAt(152, 178); r(154, 388, 22, 76, AP.SIGN); r(156, 391, 18, 12, [60, 150, 220]); lit(() => txt('I', 163, 394, K.WHITE)); r(157, 406, 16, 52, [240, 238, 228]); for (let k = 0; k < 6; k++) r(159 + (k % 3) * 4, 409 + Math.floor(k / 3) * 22, 3, 12, [120 + k * 20, 160, 200]); line(158, 426, 172, 446, [214, 50, 60]);
    // ---- CHECK-IN: the LAB AIR band, the desk numbers, the bag belt's slot with its rubber flaps ----
    r(190, 386, 370, 22, AP.TEAL); r(190, 386, 370, 2, AP.TEAL_HI); r(190, 406, 370, 2, AP.TEAL_DK);
    txt('LAB AIR', 212, 391, K.WHITE, 2); txt('CHECK-IN', 470, 394, AP.TEAL_DK);
    disc(276, 400, 5, AP.ORANGE); r(274, 390, 5, 6, AP.ORANGE); r(273, 389, 7, 2, AP.ORANGE_HI); disc(275, 398, 1, AP.ORANGE_HI); // (the flask logo)
    for (let x = 300; x < 460; x += 16) r(x, 396, 8, 2, AP.TEAL_HI); // (a little dashed flight path along the band)
    APR.desk.forEach((dx, i) => { r(dx - 6, 410, 12, 12, AP.SIGN); r(dx - 6, 410, 12, 1, AP.SIGN_HI); lit(() => txt(String(i + 1), dx - 1, 414, AP.SIGN_TXT)); r(dx - 1, 408, 2, 2, AP.STEEL_DK); });
    r(192, 426, 366, 28, AP.BELT); for (let x = 194; x < 556; x += 5) r(x, 428, 4, 24, x % 10 ? [58, 60, 68] : [48, 50, 56]); r(192, 426, 366, 2, AP.STEEL); r(192, 452, 366, 2, AP.STEEL_DK);
    // ---- the pillar between check-in and security: FLY LAB AIR ----
    pillarAt(564, 586); r(566, 392, 18, 60, AP.ORANGE); r(567, 393, 16, 58, [255, 206, 140]); disc(575, 408, 4, AP.TEAL); r(573, 399, 5, 5, AP.TEAL); for (let k = 0; k < 3; k++) r(568 + k * 5, 428 + k * 4, 10, 2, K.WHITE); r(567, 440, 16, 10, AP.TEAL_DK);
    // ---- SECURITY: its sign, the liquids rule ----
    sign(606, 388, 'SECURITY', 100); r(612, 404, 88, 18, K.WHITE); r(612, 404, 88, 1, AP.WALL_DK); txt('NO LIQUIDS', 616, 407, [200, 50, 50]); txt('OVER 100 ML', 616, 414, [200, 50, 50]); disc(690, 413, 5, [200, 50, 50]); disc(690, 413, 3, K.WHITE); line(687, 416, 693, 410, [200, 50, 50]);
    // ---- AIRSIDE: the board's casing, the TV's, DUTY FREE's shelves, the café ----
    r(APR.board - 94, 384, 188, 78, AP.SIGN); r(APR.board - 94, 384, 188, 2, AP.SIGN_HI); r(APR.board - 96, 462, 192, 3, AP.STEEL_DK); for (const x of [APR.board - 60, APR.board + 60]) r(x - 1, 320, 2, 64, AP.STEEL_DK);
    r(APR.tv - 34, 394, 68, 48, AP.RUBBER); r(APR.tv - 3, 442, 6, 20, AP.STEEL_DK); r(APR.tv - 14, 460, 28, 4, AP.STEEL_DK);
    { const x0 = APR.duty - 44, x1 = APR.duty + 44; sign(x0, 386, 'DUTY FREE', x1 - x0);
      r(x0, 400, x1 - x0, 70, [236, 232, 240]); for (const y of [418, 440]) { r(x0 + 2, y, x1 - x0 - 4, 2, AP.GLASS_DK); r(x0 + 2, y + 2, x1 - x0 - 4, 1, AP.GLASS_HI); }
      for (let k = 0; k < 9; k++) { const bx = x0 + 4 + k * 9, by = 418; r(bx, by - 9, 5, 9, [[240, 160, 200], [160, 120, 230], [250, 210, 120], [150, 220, 240]][k % 4] as RGB); r(bx + 1, by - 12, 3, 3, [210, 190, 120]); r(bx + 1, by - 7, 1, 4, K.WHITE); }
      for (let k = 0; k < 4; k++) r(x0 + 6 + k * 14, 432, 12, 8, [[120, 70, 40], [200, 60, 60], [70, 90, 160]][k % 3] as RGB);
      for (let row = 0; row < 3; row++) for (let k = 0; k <= row; k++) r(x0 + 22 + k * 12 - row * 6, 466 - (3 - row) * 6, 10, 5, [230, 190, 60]); // (a pyramid of chocolate bars)
      const tx = x1 - 14; disc(tx, 452, 8, [190, 140, 90]); disc(tx - 6, 444, 3, [190, 140, 90]); disc(tx + 6, 444, 3, [190, 140, 90]); r(tx - 3, 450, 2, 2, [20, 20, 26]); r(tx + 2, 450, 2, 2, [20, 20, 26]); oval(tx, 466, 9, 5, [190, 140, 90]); r(tx - 1, 454, 3, 2, [120, 80, 50]); // (the giant teddy)
    }
    { const x0 = APR.cafe - 38, x1 = APR.cafe + 38; sign(x0, 386, 'CAFE', x1 - x0); r(x0, 400, x1 - x0, 70, [92, 64, 48]); r(x0 + 4, 402, x1 - x0 - 8, 26, [30, 30, 34]); lit(() => { txt('COFFEE  2', x0 + 8, 405, [255, 230, 190]); txt('TEA     2', x0 + 8, 412, [255, 230, 190]); txt('BUN     3', x0 + 8, 419, [255, 230, 190]); });
      for (let k = 0; k < 6; k++) { r(x0 + 8 + k * 11, 432, 7, 7, K.WHITE); r(x0 + 14 + k * 11, 434, 2, 3, K.WHITE); } r(x0 + 4, 440, x1 - x0 - 8, 2, [130, 94, 70]); }
    // ---- the pillar before the gate: SEE THE NORTHERN LIGHTS ----
    pillarAt(1344, 1362); r(1345, 390, 16, 62, [8, 16, 34]); for (let x = 1346; x < 1360; x++) r(x, 402 + Math.round(Math.sin(x * 0.7) * 3), 1, 12, [70, 230, 150]); r(1345, 438, 16, 14, [20, 24, 30]); for (let k = 0; k < 5; k++) r(1347 + k * 3, 442, 2, 2, [240, 240, 250]);
    // ---- THE GATE: the big window's frame (the view goes in live), the jet bridge door's frame ----
    r(APR.win0, 340, W - APR.win0, 130, [30, 34, 40]);
    r(APR.win0, 460, W - APR.win0, 10, AP.STEEL); r(APR.win0, 460, W - APR.win0, 2, AP.STEEL_HI);
    r(APR.bridge - 30, 390, 60, 80, AP.STEEL_DK); r(APR.bridge - 28, 392, 56, 78, [60, 64, 72]);
  });
}

// ---------------------------------------------------------------- the window: the plane's day ----------------------------------------------------------------
/** The far view out of the gate's window, baked by day and by night: sky, the city skyline and the Roof's launch tower, the runway, the apron. */
let farDay: HTMLCanvasElement | null = null, farNight: HTMLCanvasElement | null = null;
const VW = W - APR.win0, VY0 = 340, VY1 = 460, HOR = 404, RUNWAY = 416, APRON = 428;
function paintFar(day: boolean): HTMLCanvasElement {
  const c = mk(VW, VY1 - VY0), g = c.getContext('2d')!;
  const d = PX.dim, e = PX.emit, f = PX.fl, gl = PX.glow, ctx = PX.ctx; PX.dim = 0; PX.emit = false; PX.fl = 0; PX.glow = mk(4, 4).getContext('2d')!;
  try { PX.ctx = g; g.translate(-APR.win0, -VY0);
    const top: RGB = day ? [110, 170, 225] : [10, 14, 34], low: RGB = day ? [196, 222, 240] : [36, 34, 66];
    for (let y = VY0; y < HOR; y += 2) r(APR.win0, y, VW, 2, M(top, low, (y - VY0) / (HOR - VY0)));
    if (!day) for (let k = 0; k < 40; k++) r(APR.win0 + Math.floor(h1(k * 3.3) * VW), VY0 + Math.floor(h1(k * 1.9) * 50), 1, 1, [220, 225, 250]);
    else for (let k = 0; k < 4; k++) { const cx = APR.win0 + 40 + k * 140 + Math.floor(h1(k) * 40), cy = VY0 + 10 + Math.floor(h1(k * 3) * 20); alpha(0.8, () => { oval(cx, cy, 16, 3, K.WHITE); oval(cx - 8, cy - 2, 8, 3, K.WHITE); oval(cx + 6, cy - 2, 7, 3, K.WHITE); }); }
    // the city on the horizon: blocks with lit windows at night, and the Roof's red launch tower (the rocket lifts off from it on the clock)
    for (let k = 0; k < 30; k++) { const bx = APR.win0 + 10 + k * 18 + Math.floor(h1(k * 5) * 8), bh = 8 + Math.floor(h1(k * 7) * 22), bw = 12 + Math.floor(h1(k * 9) * 8); r(bx, HOR - bh, bw, bh, day ? M([130, 146, 170], low, 0.35) : [24, 28, 52]);
      if (!day) for (let w = 0; w < 6; w++) if (h1(k * 13 + w) > 0.5) r(bx + 2 + (w % 3) * 4, HOR - bh + 3 + Math.floor(w / 3) * 5, 2, 2, [255, 214, 140]); }
    const tx = APR.win0 + 140; r(tx, HOR - 44, 3, 44, day ? [200, 70, 60] : [110, 40, 40]); for (let y = HOR - 42; y < HOR; y += 6) r(tx - 2, y, 7, 1, day ? [200, 70, 60] : [110, 40, 40]);
    // grass, the runway (with its centre line), the apron's concrete up to the window
    r(APR.win0, HOR, VW, APRON - HOR, day ? AP.GRASS : [22, 34, 30]); r(APR.win0, RUNWAY - 5, VW, 7, day ? [90, 94, 100] : [34, 36, 44]); for (let x = APR.win0; x < W; x += 24) r(x, RUNWAY - 2, 12, 1, day ? K.WHITE : [120, 124, 130]);
    r(APR.win0, APRON, VW, VY1 - APRON, day ? AP.TARMAC : [40, 42, 48]); for (let x = APR.win0; x < W; x += 60) r(x, APRON, 1, VY1 - APRON, day ? AP.TARMAC2 : [34, 36, 42]);
    r(APR.win0, APRON + 22, VW, 2, day ? AP.LINE_Y : [120, 100, 40]); r(APR.win0 + 200, APRON + 4, 2, VY1 - APRON - 4, day ? AP.LINE_Y : [120, 100, 40]);
    // a windsock, the control tower
    r(W - 100, HOR - 26, 2, 26, [200, 200, 204]); r(W - 98, HOR - 26, 14, 5, [255, 120, 40]); r(W - 94, HOR - 26, 3, 5, K.WHITE);
    r(APR.win0 + 330, HOR - 52, 12, 52, day ? [210, 214, 220] : [60, 64, 76]); r(APR.win0 + 324, HOR - 64, 24, 12, day ? [80, 100, 120] : [30, 40, 56]); r(APR.win0 + 326, HOR - 62, 20, 6, day ? [150, 200, 230] : [120, 200, 160]);
    // another airline's plane parked at a far stand
    drawJet(APR.win0 + 250, HOR + 14, 80, -1, 0, { night: !day, haze: 0.5, hazeCol: low });
  } finally { PX.ctx = ctx; PX.dim = d; PX.emit = e; PX.fl = f; PX.glow = gl; }
  return c;
}
function windowView(a: number): void {
  if (!seen(APR.win0, W)) return;
  if (!farDay) { farDay = paintFar(true); farNight = paintFar(false); }
  const g = PX.ctx, day = dayness(), T = airT(), k = ((T % AIR_CYCLE) + AIR_CYCLE) % AIR_CYCLE, night = day < 0.5;
  g.save(); g.beginPath(); g.rect(APR.win0, VY0, VW, VY1 - VY0); g.clip();
  g.drawImage(farNight!, APR.win0, VY0); if (day > 0.01) { g.globalAlpha = day; g.drawImage(farDay!, APR.win0, VY0); g.globalAlpha = 1; }
  // the rocket going up from the Roof's tower, on its own clock (:00, :20, :40)
  { const o = rocketOnRoof(flight()); if (o && o.rise > 0) { const tx = APR.win0 + 144, ry = Math.round(HOR - 40 - o.rise * 0.05); r(tx, ry, 3, 8, K.WHITE); r(tx, ry - 2, 3, 2, [220, 64, 56]); if (o.flame > 0) lit(() => r(tx, ry + 8, 3, 3 + Math.floor(Math.sin(a * 40) + 1), [255, 200, 90])); for (let q = 1; q < 6; q++) alpha(0.4 - q * 0.06, () => disc(tx + 1, ry + 10 + q * 4, 1 + (q >> 1), [230, 230, 236])); } }
  // the ground crew at the stand while it boards: the fuel truck under the wing, the belt loader at the hold, the baggage tug and carts going back and forth
  if (k < PUSH_S) {
    const fx = W - 12 - 220; r(fx - 30, 444, 40, 12, [240, 240, 244]); r(fx - 30, 444, 40, 3, [220, 60, 50]); r(fx + 10, 446, 10, 10, [60, 64, 72]); disc(fx - 22, 456, 3, AP.RUBBER); disc(fx + 12, 456, 3, AP.RUBBER);
    const bl = W - 12 - 300; line(bl, 456, bl + 26, 440, [60, 64, 72], 2); r(bl - 6, 452, 16, 5, [250, 200, 40]);
    const cyc = (k % 30) / 30, tugX = W - 12 - 330 + Math.sin(cyc * Math.PI * 2) * 100; r(Math.round(tugX), 450, 14, 7, [250, 200, 40]); disc(Math.round(tugX) + 3, 457, 2, AP.RUBBER); disc(Math.round(tugX) + 11, 457, 2, AP.RUBBER);
    for (let c = 1; c <= 2; c++) { const cx = Math.round(tugX + c * 18); r(cx, 452, 14, 5, [130, 136, 146]); r(cx + 2, 448, 10, 4, [c === 1 ? 200 : 90, 90, c === 1 ? 90 : 200]); disc(cx + 3, 457, 2, AP.RUBBER); disc(cx + 11, 457, 2, AP.RUBBER); }
  }
  // the marshaller with the orange wands (waving it off after the pushback, and in as it arrives)
  if ((k >= PUSH_S - 4 && k < TAXI_S + 6) || k >= AIR_CYCLE - 6) { const mx = W - 28, wave = Math.sin(a * 6) * 4; r(mx - 2, 446, 5, 12, [250, 200, 40]); r(mx - 2, 442, 5, 4, [210, 170, 130]); lit(() => { line(mx - 2, 448, mx - 8, 442 + Math.round(wave), [255, 140, 40], 2); line(mx + 3, 448, mx + 9, 442 - Math.round(wave), [255, 140, 40], 2); }); }
  // the plane
  const j = jetOnApron(k, { standX: W - 12, standY: 440, runwayY: RUNWAY + 1, win0: APR.win0, win1: W });
  if (j) drawJet(Math.round(j.x), Math.round(j.y), j.len, 1, a, { night, gear: j.gear, flaps: j.flaps, pitch: j.pitch, door: j.door, haze: j.haze, hazeCol: night ? [36, 34, 66] : [196, 222, 240] });
  // the jet bridge: its tunnel out from the door, and the rubber canopy rolled up to the plane while it's at the stand
  { const docked = k < PUSH_S; r(APR.bridge - 30, 406, 60, 20, [140, 146, 156]); r(APR.bridge - 30, 406, 60, 2, [180, 186, 196]); for (let x = APR.bridge - 26; x < APR.bridge + 30; x += 8) r(x, 410, 4, 10, [96, 102, 112]);
    r(APR.bridge - 36, docked ? 402 : 408, 8, docked ? 28 : 16, AP.RUBBER); r(APR.bridge - 4, 426, 6, 32, [110, 116, 126]); disc(APR.bridge, 458, 3, AP.RUBBER); }
  // night: blue taxiway lights, the apron floodlights, the runway's edge lights
  if (night) { lit(() => { for (let x = APR.win0 + 6; x < W; x += 30) { r(x, APRON - 2, 2, 2, [80, 140, 255]); r(x + 15, RUNWAY + 3, 2, 1, [255, 240, 200]); } }); for (const fx of [APR.win0 + 120, APR.win0 + 380]) { r(fx, 350, 2, 78, [60, 64, 72]); lit(() => r(fx - 6, 348, 14, 4, [255, 246, 220])); Gd(fx + 1, 350, 24, [255, 240, 200], 0.25 * (1 - day)); } }
  // the weather on the glass: rain streaks, snow, fog, a storm's flash
  const w = weather(); if (w.kind === 'rain' || w.kind === 'storm') { for (let k2 = 0; k2 < 40; k2++) { const x = APR.win0 + Math.floor(h1(k2) * VW), y = VY0 + Math.floor((h1(k2 * 3) * (VY1 - VY0) + a * (60 + (k2 % 5) * 12)) % (VY1 - VY0)); alpha(0.5 * w.k, () => r(x, y, 1, 5, [200, 220, 240])); } }
  if (w.kind === 'snow') for (let k2 = 0; k2 < 50; k2++) { const x = APR.win0 + Math.floor((h1(k2) * VW + Math.sin(a + k2) * 6 + VW) % VW), y = VY0 + Math.floor((h1(k2 * 3) * (VY1 - VY0) + a * 14) % (VY1 - VY0)); r(x, y, 1, 1, K.WHITE); }
  if (w.kind === 'fog') alpha(0.5 * w.k, () => r(APR.win0, VY0, VW, VY1 - VY0, [200, 206, 214]));
  if (w.kind === 'storm') { const L = lightning(); if (L.f > 0) alpha(L.f * 0.6, () => r(APR.win0, VY0, VW, VY1 - VY0, K.WHITE)); }
  g.restore();
  // the mullions over the glass, and a streak of reflection
  for (let x = APR.win0; x < W; x += 90) { r(x, VY0, 3, VY1 - VY0, [60, 64, 72]); r(x + 1, VY0, 1, VY1 - VY0, [100, 104, 112]); }
  r(APR.win0, VY0, VW, 3, [60, 64, 72]); alpha(0.12, () => { for (let x = APR.win0 + 40; x < W; x += 260) line(x, VY1 - 6, x + 50, VY0 + 10, K.WHITE, 3); });
}

// ---------------------------------------------------------------- the live bits ----------------------------------------------------------------
/** The departures board's lines right now. */
export function boardLines(T = airT()): string[] {
  const a = air(), clock = (secs: number): string => { const d = new Date(Date.now() + secs * 1000); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const out = a.from === 'city' && a.phase === 'board' ? 'BOARDING' : a.from === 'city' && a.k < CLIMB_S ? 'CLOSED' : 'ON TIME ' + clock(nextBoarding('city', T) + PUSH_S);
  const inb = (a.to === 'city' && a.k >= TOUCH_S) || (a.from === 'city' && a.phase === 'board') ? 'LANDED' : 'DUE ' + clock(nextBoarding('city', T));
  return ['LA101 KEFLAVIK  ' + out, 'LA102 FROM KEF  ' + inb, 'SUNNY ISLAND   SOON', 'SNOW PEAK      SOON', 'BIG CITY       SOON'];
}
function drawBoard(): void {
  if (!seen(APR.board - 94, APR.board + 94)) return;
  const x0 = APR.board - 90, lines = boardLines(), t = now();
  lit(() => { txt('DEPARTURES', x0 + 2, 388, AP.SIGN_TXT); txt('ICELAND ANYONE?', x0 + 180 - tw('ICELAND ANYONE?'), 388, [150, 150, 160]); });
  lines.forEach((text, i) => {
    const y = 397 + i * 12, prev = AIRW.flips[i]; if (!prev || prev.text !== text) AIRW.flips[i] = { text, t: prev ? t : -9 };
    const flipping = t - AIRW.flips[i].t < 0.6;
    for (let c = 0; c < 27; c++) { const cx = x0 + 1 + c * 6.6; r(Math.round(cx), y, 6, 10, [22, 24, 28]); r(Math.round(cx), y + 5, 6, 1, [10, 10, 12]); }
    lit(() => { if (flipping) { for (let c = 0; c < 27; c++) if (h1(c + Math.floor(t * 20) + i * 7) > 0.4) txt(String.fromCharCode(65 + Math.floor(h1(c * 3 + Math.floor(t * 20)) * 26)), Math.round(x0 + 2 + c * 6.6), y + 2, [240, 236, 220]); }
      else { const col: RGB = /BOARDING|LANDED/.test(text) ? [120, 240, 150] : /SOON/.test(text) ? [150, 150, 160] : [240, 236, 220]; for (let c = 0; c < Math.min(27, text.length); c++) txt(text[c], Math.round(x0 + 2 + c * 6.6), y + 2, col); } });
  });
  G(APR.board - 94, 384, 188, 78, [255, 240, 200], 0.06);
}
function drawTV(a: number): void {
  if (!seen(APR.tv - 34, APR.tv + 34)) return;
  const f = forecast(), x0 = APR.tv - 32, y0 = 396;
  r(x0, y0, 64, 44, [6, 12, 26]);
  lit(() => {
    txt('AURORA', x0 + 3, y0 + 3, [150, 220, 255]); txt('ICELAND TONIGHT', x0 + 3, y0 + 10, [110, 170, 210]);
    txt('KP ' + f.kp, x0 + 3, y0 + 19, K.WHITE); r(x0 + 22, y0 + 19, 38, 5, [30, 40, 60]); r(x0 + 22, y0 + 19, Math.round(38 * f.kp / 9), 5, f.kp >= 7 ? [255, 90, 190] : [70, 230, 150]);
    txt('CLOUD ' + f.cloud + '%', x0 + 3, y0 + 27, [190, 200, 220]);
    txt(f.verdict, x0 + 3, y0 + 35, f.verdict === 'NONE' ? [150, 150, 160] : f.verdict === 'STORM!' ? [255, 120, 200] : [120, 255, 160]);
    if (f.verdict !== 'NONE') { const ix = x0 + 47, iy = y0 + 25, storm = f.verdict === 'STORM!';
      r(ix, iy, 14, 12, [10, 18, 42]); r(ix + 2, iy + 1, 1, 1, [200, 210, 255]); r(ix + 11, iy + 2, 1, 1, [200, 210, 255]);
      for (let k = 0; k < 7; k++) { const cx = ix + 1 + k * 2, h = 3 + Math.round((Math.sin(k * 1.7 + a * 1.6) + 1) * 2), hem = iy + 8; r(cx, hem - h, 1, h, k % 2 ? [50, 180, 120] : [90, 240, 160]); r(cx, hem - h, 1, 1, storm ? [200, 110, 255] : [40, 120, 90]); r(cx, hem, 1, 1, storm ? [255, 130, 210] : [190, 255, 220]); }
      for (let k = 0; k < 14; k++) { const hgt = [1, 2, 3, 2, 1, 1, 2, 3, 4, 3, 2, 1, 1, 2][k]; r(ix + k, iy + 12 - hgt, 1, hgt, [22, 28, 44]); if (hgt >= 3) r(ix + k, iy + 12 - hgt, 1, 1, [220, 230, 240]); } }
  });
  Gd(APR.tv, y0 + 22, 30, [80, 180, 255], 0.12);
}
/** The X-ray screen's picture of what's going through (the scanners' false colours: organic orange, metal blue, glass and liquid green). */
export function xrayPicture(hold: number, x: number, y: number, a: number): void {
  const OR = AP.XRAY_OR, GR = AP.XRAY_GR, BL = AP.XRAY_BL;
  const shapes: Record<number, () => void> = {
    1: () => { r(x - 5, y - 5, 9, 10, OR); r(x - 4, y - 4, 7, 8, [120, 60, 20]); r(x + 4, y - 3, 3, 6, OR); }, // a mug
    2: () => { r(x - 5, y - 4, 10, 10, OR); for (let k = 0; k < 6; k++) disc(x - 4 + (k % 3) * 4, y - 6 + Math.floor(k / 3) * 3, 1, [255, 200, 120]); }, // popcorn
    3: () => { r(x - 3, y - 7, 7, 14, GR); r(x - 1, y - 9, 3, 2, BL); }, // a soda
    7: () => { line(x - 8, y - 8, x + 8, y + 8, BL); line(x + 8, y - 8, x - 8, y + 8, BL); r(x - 1, y - 1, 3, 3, BL); }, // the kite's frame
    8: () => { r(x - 8, y - 2, 16, 5, OR); r(x - 9, y - 1, 18, 3, [255, 190, 110]); }, // a hot dog
    16: () => disc(x, y, 4, GR), 17: () => { r(x - 5, y - 5, 9, 10, OR); r(x - 4, y - 4, 7, 8, [120, 60, 20]); }, // a snowball, cocoa
    18: () => { disc(x, y, 6, BL); disc(x - 2, y - 2, 2, [200, 230, 255]); r(x + 3, y - 7, 2, 5, [200, 230, 255]); }, // a moon rock (with crystals!)
  };
  const potion = hold >= 19 && hold <= 24, fn = shapes[hold];
  if (potion) { lit(() => { r(x - 3, y - 2, 7, 9, GR); r(x - 1, y - 7, 3, 5, GR); }); Gd(x, y, 14 + Math.sin(a * 6) * 3, [90, 255, 140], 0.5); }
  else if (fn) fn();
  else if (hold > 0) r(x - 6, y - 4, 12, 9, OR);
  else for (let k = 0; k < 7; k++) r(x - 4 + Math.round(Math.sin(k * 2.1) * 4), y - 2 + Math.round(Math.cos(k * 1.7) * 3), 2, 1, OR); // (just a bit of fluff)
}

// ---------------------------------------------------------------- props ----------------------------------------------------------------
/** A prop drawn once into its own canvas and stamped (with an optional live layer over it). */
function stillProp(y: number, box: Rect, still: () => void, live?: (a: number) => void): Prop {
  let c: HTMLCanvasElement | null = null;
  return { y, draw(a: number) {
    if (!seen(box.x0, box.x1)) return;
    if (!c) { const cv = mk(box.x1 - box.x0, box.y1 - box.y0), g = cv.getContext('2d')!; g.translate(-box.x0, -box.y0); const d = PX.dim, e = PX.emit, f = PX.fl, ctx = PX.ctx; PX.dim = 0; PX.emit = false; PX.fl = 0; try { PX.ctx = g; still(); } finally { PX.ctx = ctx; PX.dim = d; PX.emit = e; PX.fl = f; } c = cv; }
    PX.ctx.drawImage(c, box.x0, box.y0); live?.(a);
  } };
}
const checkin = stillProp(494, { x0: 150, y0: 436, x1: 562, y1: 496 }, () => {
  // the check-in island: a long white counter with a teal kick band; at each desk a monitor, a boarding-pass printer, tags, and the baggage scale
  r(190, 452, 366, 42, AP.DESK); r(190, 452, 366, 3, K.WHITE); r(190, 490, 366, 4, AP.DESK_EDGE); r(190, 480, 366, 8, AP.TEAL); r(190, 480, 366, 1, AP.TEAL_HI);
  for (const dx of APR.desk) {
    r(dx - 16, 438, 22, 14, AP.RUBBER); r(dx - 14, 440, 18, 9, [40, 90, 120]); r(dx - 6, 452, 6, 2, AP.RUBBER); // (the monitor)
    r(dx - 38, 446, 16, 8, [200, 204, 210]); r(dx - 36, 444, 12, 2, K.WHITE); // (the printer, a pass sticking out)
    r(dx + 2, 448, 8, 5, [250, 214, 90]); r(dx + 4, 447, 4, 1, [200, 150, 40]); // (a little stack of bag tags)
    r(dx - 12, 458, 24, 14, AP.TEAL); r(dx - 12, 458, 24, 1, AP.TEAL_HI); disc(dx, 465, 4, AP.ORANGE); r(dx - 1, 459, 3, 4, AP.ORANGE); // (the LAB AIR panel on the desk's front)
    r(dx + 16, 474, 30, 16, AP.STEEL_DK); r(dx + 16, 474, 30, 2, AP.STEEL_HI); r(dx + 22, 466, 18, 8, AP.RUBBER); // (the scale)
  }
}, () => { APR.desk.forEach((dx, i) => lit(() => txt(AIRW.busy.has(i) ? '23.4' : '0.0', dx + 23, 468, [255, 90, 60]))); });
const queueBelts: Prop = { y: 520, draw() { if (!seen(186, 562)) return; for (let x = 200; x <= 540; x += 68) { r(x, 498, 3, 22, AP.STEEL_DK); r(x - 1, 496, 5, 3, AP.STEEL_HI); disc(x + 1, 520, 3, AP.STEEL_DK); } for (let x = 200; x < 540; x += 68) r(x + 3, 501, 65, 2, [40, 60, 150]); } };
const xrayMachine = stillProp(502, { x0: 584, y0: 420, x1: 790, y1: 506 }, () => {
  // the belt runs in one end and out of the other; the tunnel's box has lead curtains at each end; a stack of grey trays at the start
  r(586, 488, 200, 10, AP.BELT); r(586, 488, 200, 2, [70, 74, 82]); for (let x = 590; x < 784; x += 10) r(x, 491, 2, 5, [50, 52, 58]); r(588, 498, 4, 8, AP.STEEL_DK); r(780, 498, 4, 8, AP.STEEL_DK);
  r(630, 434, 110, 56, [206, 210, 216]); r(630, 434, 110, 3, K.WHITE); r(630, 486, 110, 2, AP.STEEL_DK); r(640, 446, 90, 40, [60, 64, 72]);
  for (const x of [640, 726]) for (let k = 0; k < 4; k++) r(x + k, 448, 1, 38, [30, 30, 34]);
  txt('X-RAY', 672, 438, AP.STEEL_DK); r(634, 438, 6, 4, [80, 200, 120]);
  for (let k = 0; k < 5; k++) r(588, 476 - k * 3, 26, 3, k % 2 ? [150, 156, 166] : [130, 136, 146]);
});
function drawXray(a: number): void {
  if (!seen(584, 800)) return;
  // the tray going through, and the screen on its stand
  const t = now() - AIRW.xray.t0;
  if (t >= 0 && t < 4) { const u = Math.min(1, t / 3.2), tx = 616 + u * 150; r(Math.round(tx), 482, 26, 6, [140, 146, 156]); r(Math.round(tx) + 2, 480, 22, 2, [160, 166, 176]); }
  const sx = 766, sy = 400; r(sx - 2, sy + 32, 4, 56, AP.STEEL_DK); r(sx - 22, sy - 2, 44, 34, AP.RUBBER); r(sx - 20, sy, 40, 30, AP.XRAY);
  lit(() => { for (let y = sy; y < sy + 30; y += 3) r(sx - 20, y, 40, 1, [14, 30, 36]);
    if (t >= 0.8 && t < 6) xrayPicture(AIRW.xray.hold, sx, sy + 15, a); else txt('READY', sx - tw('READY') / 2, sy + 12, [80, 200, 120]); });
  Gd(sx, sy + 15, 26, [80, 220, 160], 0.14);
}
export const ARCH_X = APR.arch;
/** Where the arch stands at depth y (it recedes: further back, a little to the left). */
export const archXAt = (y: number): number => ARCH_X + back(y);
/** The glass barrier's blockers from y0 to y1: short steps along its slant. */
const glassBlocks = (y0: number, y1: number): Rect[] => { const out: Rect[] = []; for (let y = y0; y < y1; y += 6) { const x = ARCH_X + back(Math.min(y + 3, y1)); out.push({ x0: x - 4, y0: y, x1: x + 4, y1: Math.min(y + 6, y1) }); } return out; };
/** The glass barrier across the floor (but for the arch's lane), and the arch: two panels, the back one a little left and up (it recedes). */
const glassRun = (y0: number, y1: number): void => { for (let y = y0; y < y1; y += 2) { const x = ARCH_X + back(y); r(x - 1, y - 46, 3, 2, AP.STEEL); alpha(0.35, () => r(x - 1, y - 44, 3, 44, AP.GLASS)); r(x - 1, y - 2, 3, 2, AP.STEEL_DK); } };
const archPanel = (y: number, front: boolean): void => {
  const x = ARCH_X + back(y);
  r(x - 4, y - 80, 8, 80, [214, 216, 222]); r(x - 4, y - 80, 8, 2, AP.STEEL_HI); r(x + 4, y - 80, 3, 80, front ? AP.STEEL : [188, 192, 200]); r(x - 4, y - 2, 11, 2, AP.STEEL_DK); // (its face, and the side facing the lane)
  if (front) { const t = now() - AIRW.arch.t, on = t < 1.6, red = on && AIRW.arch.beep; for (let k = 0; k < 6; k++) lit(() => r(x - 3, y - 74 + k * 11, 2, 7, red ? ((t * 6 + k * 0.2) % 1 < 0.5 ? [255, 60, 50] : [120, 30, 30]) : on ? [80, 255, 120] : [60, 80, 70])); }
};
const archBack: Prop = { y: LANE.y0, draw() { if (!seen(ARCH_X - 60, ARCH_X + 60)) return; glassRun(FL0, LANE.y0 - 2); archPanel(LANE.y0, false); } };
const archFront: Prop = { y: LANE.y1, draw() {
  if (!seen(ARCH_X - 60, ARCH_X + 60)) return;
  archPanel(LANE.y1, true);
  // the top beam between the two panels (it recedes, so it slants), with the status light in its middle
  const xb = ARCH_X + back(LANE.y0), xf = ARCH_X + back(LANE.y1);
  for (let y = LANE.y0; y <= LANE.y1; y++) { const x = Math.round(xb + (xf - xb) * (y - LANE.y0) / (LANE.y1 - LANE.y0)); r(x - 4, y - 86, 11, 6, y === LANE.y1 ? AP.STEEL_HI : [206, 208, 214]); }
  const t = now() - AIRW.arch.t, on = t < 1.6, red = on && AIRW.arch.beep, mx = Math.round((xb + xf) / 2), my = Math.round((LANE.y0 + LANE.y1) / 2) - 90;
  lit(() => r(mx - 3, my, 6, 4, red ? ((t * 6) % 1 < 0.5 ? [255, 50, 40] : [120, 20, 20]) : on ? [80, 255, 120] : [60, 90, 70]));
  if (on) Gd(mx, my + 2, 18, red ? [255, 40, 30] : [80, 255, 120], 0.55);
  glassRun(LANE.y1 + 2, FL1 + 4);
} };
const dutyTill = stillProp(504, { x0: APR.duty - 30, y0: 470, x1: APR.duty + 30, y1: 506 }, () => { r(APR.duty - 26, 476, 52, 26, [60, 50, 80]); r(APR.duty - 26, 476, 52, 3, [120, 100, 150]); r(APR.duty - 8, 470, 16, 8, AP.RUBBER); r(APR.duty - 6, 472, 12, 4, [80, 200, 140]); for (let k = 0; k < 3; k++) r(APR.duty + 8 + k * 5, 478, 3, 6, [[240, 160, 200], [250, 210, 120], [150, 220, 240]][k] as RGB); });
const cafeCounter = stillProp(504, { x0: APR.cafe - 40, y0: 452, x1: APR.cafe + 40, y1: 506 }, () => {
  r(APR.cafe - 38, 474, 76, 28, [120, 84, 60]); r(APR.cafe - 38, 474, 76, 3, [160, 118, 88]); r(APR.cafe - 38, 498, 76, 4, [80, 56, 40]);
  r(APR.cafe - 32, 456, 22, 18, [190, 196, 204]); r(APR.cafe - 30, 458, 18, 6, [60, 64, 72]); r(APR.cafe - 28, 466, 3, 4, AP.RUBBER); r(APR.cafe - 20, 466, 3, 4, AP.RUBBER); // (the espresso machine)
  r(APR.cafe + 2, 460, 32, 14, AP.GLASS); r(APR.cafe + 2, 460, 32, 2, AP.GLASS_HI); for (let k = 0; k < 4; k++) disc(APR.cafe + 8 + k * 7, 468, 3, [210, 150, 80]); // (the pastry case)
}, (a) => { for (let k = 0; k < 2; k++) { const u = ((a * 0.4) + k / 2) % 1; alpha(0.5 * (1 - u), () => disc(APR.cafe - 21 + Math.round(Math.sin(u * 6 + k) * 2), Math.round(454 - u * 14), 1 + Math.round(u * 2), K.WHITE)); } });
const gateDesk = stillProp(504, { x0: APR.gateDesk - 34, y0: 456, x1: APR.gateDesk + 34, y1: 506 }, () => {
  r(APR.gateDesk - 30, 470, 60, 32, AP.DESK); r(APR.gateDesk - 30, 470, 60, 3, K.WHITE); r(APR.gateDesk - 30, 486, 60, 3, AP.TEAL); r(APR.gateDesk - 30, 500, 60, 2, AP.DESK_EDGE);
  r(APR.gateDesk - 10, 458, 18, 12, AP.RUBBER); r(APR.gateDesk - 8, 460, 14, 7, [40, 90, 120]); txt('A1', APR.gateDesk - 4, 476, AP.TEAL_DK); r(APR.gateDesk + 14, 462, 6, 8, AP.STEEL_DK); r(APR.gateDesk + 13, 460, 8, 2, AP.RUBBER); // (the PA microphone)
});
/** A row of gate seats (joined chairs on a steel beam), facing the window. */
const seatRow = (y: number): Prop => stillProp(y, { x0: 1470, y0: y - 30, x1: 1836, y1: y + 2 }, () => {
  r(1474, y - 4, 356, 3, AP.STEEL_DK); r(1474, y - 4, 356, 1, AP.STEEL); // the beam they're all on
  for (let x = 1500; x < 1830; x += 60) {
    r(x - 21, y - 29, 42, 1, AP.SEAT_HI); r(x - 22, y - 28, 44, 14, AP.SEAT); r(x - 22, y - 28, 44, 2, AP.SEAT_HI); r(x - 22, y - 16, 44, 2, AP.SEAT_DK); // the back's shell
    for (let py = y - 25; py < y - 16; py += 3) for (let px = x - 18 + ((py - y) % 2 ? 1 : 0); px < x + 19; px += 3) r(px, py, 1, 1, AP.SEAT_DK); // (perforated)
    r(x - 22, y - 14, 44, 10, AP.SEAT); r(x - 22, y - 14, 44, 3, AP.SEAT_HI); r(x - 22, y - 5, 44, 1, AP.SEAT_DK); // the seat
  }
  for (let x = 1470; x <= 1830; x += 60) { r(x - 1, y - 18, 3, 14, AP.STEEL); r(x - 4, y - 20, 9, 3, AP.RUBBER); r(x - 4, y - 20, 9, 1, AP.SEAT_HI); if ((x - 1470) % 120 === 60) r(x - 1, y - 13, 3, 2, [60, 200, 120]); }
  for (const lx of [1480, 1820]) r(lx, y - 4, 4, 6, AP.STEEL_DK);
});
const plant = (x: number, y: number): Prop => stillProp(y, { x0: x - 16, y0: y - 46, x1: x + 16, y1: y + 2 }, () => { r(x - 9, y - 16, 18, 16, [200, 196, 188]); r(x - 9, y - 16, 18, 2, K.WHITE); for (let k = 0; k < 7; k++) { const an = -1.4 + k * 0.45; line(x, y - 16, x + Math.round(Math.cos(an) * 14), y - 16 - Math.round(Math.abs(Math.sin(an + 1.6)) * 26 + 6), [70, 140, 80], 2); } });
const charger: Prop = stillProp(516, { x0: 1866, y0: 470, x1: 1892, y1: 518 }, () => { r(1872, 474, 12, 42, [60, 64, 72]); r(1872, 474, 12, 2, [100, 104, 112]); for (let k = 0; k < 3; k++) { r(1874, 482 + k * 10, 8, 5, [30, 30, 34]); r(1876, 483 + k * 10, 4, 3, [80, 200, 255]); } });
const cleanerCart: Prop = stillProp(566, { x0: 1030, y0: 518, x1: 1080, y1: 568 }, () => { r(1036, 540, 36, 22, [240, 200, 40]); r(1036, 540, 36, 2, [255, 230, 120]); r(1040, 528, 12, 12, [60, 120, 200]); line(1066, 540, 1060, 522, [150, 110, 70], 2); r(1056, 518, 10, 4, [200, 200, 204]); disc(1040, 564, 3, AP.RUBBER); disc(1068, 564, 3, AP.RUBBER); });
const lostTrolley: Prop = stillProp(560, { x0: 470, y0: 520, x1: 530, y1: 562 }, () => { r(476, 540, 44, 3, AP.STEEL); r(478, 526, 2, 16, AP.STEEL_DK); r(514, 532, 2, 10, AP.STEEL_DK); r(482, 528, 26, 12, [200, 70, 60]); r(482, 528, 26, 2, [230, 110, 100]); r(490, 524, 10, 4, [60, 60, 64]); disc(480, 558, 3, AP.RUBBER); disc(516, 558, 3, AP.RUBBER); line(476, 543, 480, 556, AP.STEEL_DK); line(518, 543, 516, 556, AP.STEEL_DK); });

// ---------------------------------------------------------------- the room ----------------------------------------------------------------
/** The skylights' band (the panes' sky is live: day, dusk, night with a few stars). */
const SKY0 = 244, SKY1 = 290;
function skylights(): void {
  const d = dayness(); if (d > 0.98) return;
  const sky = M([18, 26, 56], M([250, 170, 120], AP.SKYPANE, clamp((d - 0.35) / 0.4, 0, 1)), clamp(d / 0.35, 0, 1));
  for (let x = 0; x < W; x += 60) { if (!seen(x, x + 60)) continue; r(x, SKY0, 58, SKY1 - SKY0, sky); if (d < 0.3) lit(() => { for (let k = 0; k < 3; k++) r(x + 4 + Math.floor(h1(x * 0.3 + k) * 50), SKY0 + 3 + Math.floor(h1(x * 0.7 + k * 2.1) * (SKY1 - SKY0 - 6)), 1, 1, [200, 210, 255]); }); }
}
function drawBack(a: number): void {
  skylights(); windowView(a); drawBoard(); drawTV(a); drawXray(a);
  // the check-in belt: a suitcase rides into the rubber flaps every so often
  if (seen(190, 560)) { const u = (a * 0.12) % 1; if (u < 0.6) { const bx = 552 - u / 0.6 * 360; r(Math.round(bx), 438, 20, 12, [[200, 70, 60], [60, 110, 200], [70, 160, 90], [220, 180, 50]][Math.floor(a * 0.12) % 4] as RGB); r(Math.round(bx) + 7, 435, 6, 3, [40, 40, 44]); } }
  // the jet bridge door: open while the plane's boarding here, with its sign and LED line
  const open = doorOpenAt('city'), T = airT(), next = nextBoarding('city', T), a2 = air();
  if (seen(APR.bridge - 70, APR.bridge + 70)) {
    const x0 = APR.bridge - 28, y0 = 392, h = 78;
    if (open) { r(x0, y0, 56, h, [230, 226, 214]); r(x0 + 4, y0 + 6, 48, h - 6, [210, 206, 194]); for (let y = y0 + 10; y < 470; y += 10) r(x0 + 6, y, 44, 1, [190, 186, 174]); lit(() => r(x0 + 22, y0 + 2, 12, 3, [124, 242, 156])); }
    else { r(x0, y0, 27, h, [150, 156, 166]); r(x0 + 29, y0, 27, h, [150, 156, 166]); r(x0 + 26, y0, 4, h, [110, 116, 126]); r(x0 + 4, y0 + 18, 19, 20, AP.GLASS_DK); r(x0 + 33, y0 + 18, 19, 20, AP.GLASS_DK); }
    const msg = open ? 'BOARDING ' + mmss(Math.max(0, PUSH_S - a2.k)) : 'NEXT ' + mmss(next), mx = APR.bridge - 30; r(mx, 376, 60, 12, [16, 18, 22]); lit(() => { txt('GATE A1', mx + 30 - tw('GATE A1') / 2, 378, [255, 210, 63]); });
    r(mx - 20, 364, 100, 10, [16, 18, 22]); lit(() => txt(msg, mx + 30 - tw(msg) / 2, 366, open ? [124, 242, 156] : [255, 180, 60]));
  }
  // the info pillar's map lights up as you walk up to it (it's a map board)
  { const k = boardGlow(a); if (k > 0) G(APR.pillar - 12, 386, 24, 80, [255, 250, 230], 0.18 * k); }
  // the escalator's steps, rippling down to the trains
  if (seen(0, 120)) for (let k = 0; k < 8; k++) { const y = 534 + ((k * 11 + a * 18) % 80); r(18, Math.round(y), 80, 1, [110, 114, 122]); }
}

export const APSPOT = { CHECKIN0: 0, XRAY: 3, CAFE: 4, DUTY: 5, TV: 6, MAP: 7, SEAT0: 8 };
const SEAT_XS = [1500, 1560, 1620, 1680, 1740, 1800];
/** The gate's two rows of seats (their front edges): room to walk between them, and in front of the front row. */
const SEAT_ROWS = [518, 552];
export const AIRPORT_SPOTS: Spot[] = [
  ...APR.desk.map((dx, n): Spot => ({ kind: 'checkin', n, x: dx, y: 510, sx: dx, sy: 510, lift: 0, label: 'CHECK IN', area: { x0: dx - 40, y0: 436, x1: dx + 40, y1: 494 } })),
  { kind: 'xray', x: APR.xray, y: 512, sx: APR.xray, sy: 512, lift: 0, label: 'X-RAY', area: { x0: 586, y0: 430, x1: 800, y1: 500 } },
  { kind: 'coffee', x: APR.cafe, y: 514, sx: APR.cafe, sy: 514, lift: 0, label: 'COFFEE', area: { x0: APR.cafe - 38, y0: 386, x1: APR.cafe + 38, y1: 502 } },
  { kind: 'giftshop', n: 1, x: APR.duty, y: 514, sx: APR.duty, sy: 514, lift: 0, label: 'SHOP', area: { x0: APR.duty - 44, y0: 386, x1: APR.duty + 44, y1: 502 } },
  { kind: 'forecast', x: APR.tv, y: 504, sx: APR.tv, sy: 504, lift: 0, label: 'FORECAST', area: { x0: APR.tv - 34, y0: 392, x1: APR.tv + 34, y1: 444 } },
  { kind: 'map', x: APR.pillar, y: 500, sx: APR.pillar, sy: 500, lift: 0, label: 'MAP', area: { x0: APR.pillar - 14, y0: 386, x1: APR.pillar + 14, y1: 466 } },
  ...SEAT_ROWS.flatMap((ry) => SEAT_XS.map((x): Spot => ({ kind: 'sit', x, y: ry - 12, sx: x, sy: ry + 8, lift: 12, label: 'SIT', area: { x0: x - 26, y0: ry - 30, x1: x + 26, y1: ry } }))),
];
const TALK: Talker[] = [
  { id: 'poster-lab-air', name: 'THE POSTER', x: 575, y: 396, sx: 575, sy: 500, lines: ["FLY LAB AIR: WE'VE TESTED FLYING. Several times.", 'The small print: "Flask not included."'], verb: 'READ' },
  { id: 'poster-aurora', name: 'THE POSTER', x: 1353, y: 396, sx: 1353, sy: 500, lines: ['SEE THE NORTHERN LIGHTS. LA101 to Keflavik, every 10 minutes.', 'A photo of green lights over a snowy mountain. It looks unreal.'], verb: 'READ' },
  { id: 'cleaner-cart', name: 'THE CART', x: 1054, y: 530, sx: 1054, sy: 568, lines: ["Someone's left their mop. Mid-mop.", 'A sign on the bucket: DO NOT DRINK. Good tip.'], verb: 'LOOK' },
  { id: 'lost-trolley', name: 'THE TROLLEY', x: 498, y: 528, sx: 498, sy: 566, lines: ["A red suitcase on a trolley. Nobody's. The tag says: IF FOUND, KEEP.", 'It rattles a bit. Better not.'], verb: 'LOOK' },
  { id: 'duty-teddy', name: 'THE GIANT TEDDY', x: APR.duty + 30, y: 446, sx: APR.duty + 42, sy: 522, lines: ['A teddy the size of a critter. 400 TOKENS. Nobody has ever bought it.', 'It stares. Kindly.'], verb: 'LOOK' },
];
export function makeAirport(): Room {
  const room: Room = {
    id: 'airport', title: 'THE AIRPORT', sub: 'LAB AIR · GATE A1',
    w: W, h: H,
    lookAt: (x0, x1) => { const keep = AIRW.view; AIRW.view = { x0, x1 }; return () => { AIRW.view = keep; }; },
    floor: { x0: 14, y0: FL0, x1: W - 14, y1: FL1 },
    blockers: [
      { x0: 190, y0: 482, x1: 556, y1: 496 }, // the check-in island
      { x0: 586, y0: 490, x1: 786, y1: 506 }, // the x-ray belt
      ...glassBlocks(FL0, LANE.y0 - 4), ...glassBlocks(LANE.y1 + 4, FL1 + 4), // the glass barrier, as it slants (the arch's lane is open)
      { x0: APR.duty - 28, y0: 494, x1: APR.duty + 28, y1: 506 }, { x0: APR.cafe - 38, y0: 494, x1: APR.cafe + 38, y1: 506 },
      { x0: APR.gateDesk - 30, y0: 494, x1: APR.gateDesk + 30, y1: 506 },
      ...SEAT_ROWS.map((ry) => ({ x0: 1476, y0: ry - 12, x1: 1832, y1: ry + 2 })), // the seat rows
      { x0: 1034, y0: 556, x1: 1074, y1: 568 }, { x0: 474, y0: 548, x1: 520, y1: 562 }, // the cart, the trolley
    ],
    doors: [
      { trigger: { x0: 18, y0: 558, x1: 98, y1: 572 }, edge: true, to: 'airportstn', arrive: { x: 60, y: 646 }, label: 'TRAINS', area: { x0: 12, y0: 520, x1: 104, y1: 614 } },
      { trigger: { x0: APR.bridge - 22, y0: FL0, x1: APR.bridge + 22, y1: FL0 + 10 }, to: 'plane', arrive: AIR_ARRIVE.plane, label: 'GATE A1', area: { x0: APR.bridge - 30, y0: 390, x1: APR.bridge + 30, y1: 470 },
        route: () => (doorOpenAt('city') ? { to: 'plane', arrive: AIR_ARRIVE.plane, label: 'BOARD LA101' } : null) },
    ],
    spots: AIRPORT_SPOTS, inUse: new Map(),
    spawn: { ...AIR_ARRIVE.airport },
    dim: 0.02,
    fillTop: 'rgb(216,220,224)', fillLow: 'rgb(230,226,216)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [checkin, queueBelts, xrayMachine, archBack, archFront, dutyTill, cafeCounter, gateDesk, ...SEAT_ROWS.map(seatRow), plant(1336, 504), plant(876, 504), charger, cleanerCart, lostTrolley],
    talkers: TALK,
  };
  return room;
}
void CRUISE_S; void TAXI_S;
