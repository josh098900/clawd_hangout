// KEFLAVÍK (step 19): Iceland's airport, where LAB AIR 101 lands. Nordic and calm: birch-wood walls, grey slate floor, big windows
// onto the lava fields. Left to right, the way you go:
//   GATE D4: the jet bridge door (open while the plane's here: in for the flight home, out off the one that's landed), and the window
//   the welcome corridor: VELKOMIN, backlit photo panels (a glacier, a waterfall, the aurora), and THE TRAVELATOR (it carries you along)
//   PASSPORT CONTROL: OFFICER GUNNI's glass booth (E: he stamps your PASSPORT)
//   BAGGAGE CLAIM: THE CAROUSEL, everyone's bag going round (each in its owner's colour), and a few odd things; E grabs yours
//   the SKYR bar, then the EXIT: the doors out to the bus into Reykjavík, the tourist info stand, the aurora forecast, a car hire desk
// The window shows Iceland's own sky (world/iceland.ts): its clock, its weather, and the northern lights at night.

import { K, IS, AP, type RGB } from '../engine/palette';
import { PX, mk, r, line, disc, oval, txt, tw, lit, alpha, G, Gd, M, shade, bake } from '../engine/pixel';
import { clamp, h1 } from '../engine/math';
import { mmss } from '../engine/format';
import { air, airT, doorOpenAt, nextBoarding, AIR_ARRIVE, PUSH_S, AIR_CYCLE, LEG_S } from '../game/air';
import { iceDay, iceWeather, auroraNow, drawAurora, mountains, forecast } from './iceland';
import { drawJet, jetOnApron } from './jet';
import type { Prop, Rect, Room, Spot, Talker } from './room';

const W = 1400, H = 614, WALL = 470, FL0 = 484, FL1 = 570;
export const KFR = { gate: 70, win0: 128, win1: 470, welcome: 610, booth: 830, car0: 930, car1: 1150, skyr: 1212, exit: 1330, info: 1270 };
/** The travelator: a band of floor that carries you along to the right. */
export const TRAVELATOR = { x0: 190, x1: 740, y0: 492, y1: 516, speed: 46 };
/** The carousel's loop (its back run, its front run where you stand, and the ends). */
export const CAROUSEL = { x0: KFR.car0, x1: KFR.car1, yBack: 486, yFront: 528, lap: 22 };
/** What the features tell the set to show (features/air.ts). */
export const KEFW = {
  view: { x0: 0, x1: W },
  /** The bags going round right now: who they belong to (their colour), and which one's yours. */
  bags: [] as { u: number; col: RGB; mine: boolean; odd?: string }[],
  /** The stamp's THUMP (when OFFICER GUNNI last stamped, s performance clock). */
  stamp: -99,
};
const seen = (x0: number, x1: number): boolean => x1 >= KEFW.view.x0 - 20 && x0 <= KEFW.view.x1 + 20;
const now = (): number => performance.now() / 1000;

function sign(x: number, y: number, text: string, w?: number, col: RGB = [255, 255, 255], bg: RGB = [40, 46, 54]): void {
  const ww = w ?? tw(text) + 12; r(x, y, ww, 13, bg); r(x, y, ww, 1, shade(bg, 1.4)); lit(() => txt(text, x + Math.round((ww - tw(text)) / 2), y + 4, col));
}
function build(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    // ---- the ceiling: pale wood slats; the wall: birch panels with dark seams, a basalt skirting ----
    r(0, 0, W, 330, IS.BIRCH_DK); for (let x = 0; x < W; x += 8) r(x, 0, 6, 330, IS.BIRCH); for (let y = 300; y < 330; y += 3) r(0, y, W, 3, M(IS.BIRCH_DK, IS.BIRCH, (y - 300) / 30));
    r(0, 330, W, WALL - 330, IS.BIRCH); for (let x = 0; x < W; x += 48) { r(x, 330, 1, WALL - 330, IS.BIRCH_DK); for (let y = 336; y < WALL; y += 20) r(x + 6 + ((y / 20) % 2) * 20, y, 12, 1, M(IS.BIRCH, IS.BIRCH_DK, 0.5)); }
    r(0, WALL - 12, W, 12, IS.BASALT); r(0, WALL - 12, W, 2, IS.BASALT_HI);
    // ---- the floor: grey slate tiles ----
    r(0, WALL, W, H - WALL, IS.SLATE); for (let y = WALL; y < H; y += 18) { r(0, y, W, 1, IS.SLATE2); for (let x = ((y / 18) % 2) * 24; x < W; x += 48) r(x, y, 1, 18, IS.SLATE2); }
    for (let i = 0; i < 900; i++) r(Math.floor(h1(i * 1.9) * W), WALL + Math.floor(h1(i * 3.3) * (H - WALL)), 1, 1, h1(i) > 0.5 ? [98, 104, 112] : [80, 86, 94]);
    // ---- GATE D4: the jet bridge door's frame and sign ----
    r(KFR.gate - 30, 390, 60, 80, IS.BASALT); r(KFR.gate - 28, 392, 56, 78, [60, 64, 72]); sign(KFR.gate - 30, 374, 'GATE D4', 60, [255, 210, 63]);
    // ---- the window's frame (the view goes in live), a bench under it ----
    r(KFR.win0, 360, KFR.win1 - KFR.win0, 110, [30, 34, 40]); r(KFR.win0, 460, KFR.win1 - KFR.win0, 10, IS.BASALT_HI); r(KFR.win0, 460, KFR.win1 - KFR.win0, 2, IS.STEEL);
    // ---- the welcome corridor: VELKOMIN, the photo panels (a glacier, a waterfall, the aurora; lit from behind) ----
    { const x0 = 488, x1 = 740; r(x0, 386, x1 - x0, 20, IS.BLUE); r(x0, 386, x1 - x0, 2, M(IS.BLUE, K.WHITE, 0.3)); lit(() => { txt('VELKOMIN', x0 + 10, 390, K.WHITE, 2); txt('WELCOME TO ICELAND', x1 - 10 - tw('WELCOME TO ICELAND'), 395, [200, 220, 255]); });
      const panels: [number, string][] = [[x0 + 2, 'GLACIER'], [x0 + 86, 'WATERFALL'], [x0 + 170, 'AURORA']];
      for (const [px, what] of panels) { r(px, 412, 80, 50, [30, 34, 40]); const X = px + 3, Y = 415, w = 74, h = 44;
        if (what === 'GLACIER') { r(X, Y, w, h, [150, 200, 230]); for (let x = 0; x < w; x++) { const t = Math.round(16 + Math.sin(x * 0.2) * 5 + Math.sin(x * 0.07) * 6); r(X + x, Y + t, 1, h - t, x % 7 === 0 ? [140, 190, 220] : [226, 240, 250]); } r(X, Y + h - 8, w, 8, [60, 64, 70]); }
        else if (what === 'WATERFALL') { r(X, Y, w, h, [90, 140, 90]); r(X, Y, w, 14, [150, 200, 230]); r(X + 28, Y + 10, 18, h - 10, [230, 240, 248]); for (let y = Y + 12; y < Y + h; y += 3) r(X + 30 + ((y * 7) % 13), y, 2, 2, [200, 220, 236]); r(X + 20, Y + h - 6, 34, 6, [220, 236, 244]); }
        else { r(X, Y, w, h, [8, 16, 34]); for (let x = 0; x < w; x++) { const t = Math.round(14 + Math.sin(x * 0.18) * 5); r(X + x, Y + t - 10, 1, 12, [60, 220, 140]); r(X + x, Y + t - 14, 1, 4, [40, 140, 100]); } r(X, Y + h - 10, w, 10, [20, 24, 30]); for (let k = 0; k < 8; k++) r(X + Math.floor(h1(k) * w), Y + Math.floor(h1(k * 2) * 10), 1, 1, K.WHITE); }
        lit(() => txt(what, px + 40 - tw(what) / 2, 452, K.WHITE)); }
    }
    // ---- PASSPORT CONTROL: its sign ----
    sign(KFR.booth - 50, 386, 'ALL PASSPORTS', 100, [255, 255, 255], [40, 46, 54]);
    // ---- BAGGAGE CLAIM: its sign, the hatch the bags come out of (rubber flaps), its beacon's mount ----
    sign(KFR.car0 + 10, 386, 'BAGGAGE CLAIM - LA101', 200, [255, 210, 63]);
    r(1010, 418, 60, 52, [40, 44, 50]); r(1012, 420, 56, 50, [26, 28, 32]); for (let x = 1013; x < 1067; x += 5) r(x, 421, 4, 48, [50, 52, 58]); r(1034, 410, 12, 8, [60, 64, 72]);
    // ---- the skyr bar and the arrivals shop ----
    { const x0 = KFR.skyr - 34, x1 = KFR.skyr + 34; sign(x0, 386, 'SKYR BAR', x1 - x0, [255, 255, 255], [70, 110, 160]); r(x0, 402, x1 - x0, 68, [236, 240, 244]); r(x0 + 4, 406, x1 - x0 - 8, 30, [200, 226, 240]); for (let k = 0; k < 6; k++) { r(x0 + 8 + k * 9, 412 + (k % 2) * 12, 7, 9, K.WHITE); r(x0 + 8 + k * 9, 412 + (k % 2) * 12, 7, 2, [110, 150, 210]); } lit(() => txt('SKYR', x0 + 34 - tw('SKYR') / 2, 442, [70, 110, 160])); }
    // ---- the EXIT: the automatic doors' frame, BUS TO REYKJAVIK ----
    sign(KFR.exit - 50, 374, 'BUS TO REYKJAVIK >', 100, [255, 210, 63]);
    r(KFR.exit - 32, 390, 64, 80, IS.BASALT); r(KFR.exit - 30, 392, 60, 78, [60, 64, 72]);
    // ---- the info stand's poster wall and the TV's mount ----
    r(KFR.info - 20, 392, 40, 50, [240, 236, 226]); r(KFR.info - 20, 392, 40, 2, K.WHITE); for (let k = 0; k < 6; k++) r(KFR.info - 16 + (k % 3) * 12, 398 + Math.floor(k / 3) * 20, 10, 16, [[120, 180, 220], [220, 120, 90], [120, 190, 120]][k % 3] as RGB);
    r(KFR.exit + 38, 394, 30, 3, IS.BASALT_HI);
  });
}

// ---------------------------------------------------------------- the window: Iceland outside ----------------------------------------------------------------
const VY0 = 360, VY1 = 460, HOR = 424, RUNWAY = 436, APRON = 446;
function windowView(a: number): void {
  if (!seen(KFR.win0, KFR.win1)) return;
  const g = PX.ctx, day = iceDay(), night = 1 - day, w = iceWeather(), au = auroraNow(), VW = KFR.win1 - KFR.win0;
  g.save(); g.beginPath(); g.rect(KFR.win0, VY0, VW, VY1 - VY0); g.clip();
  const top: RGB = M([6, 12, 30], [90, 150, 210], day), low: RGB = M([18, 30, 54], [200, 222, 236], day);
  for (let y = VY0; y < HOR; y += 2) r(KFR.win0, y, VW, 2, M(top, low, (y - VY0) / (HOR - VY0)));
  if (night > 0.5 && w.kind !== 'cloudy' && w.kind !== 'snow' && w.kind !== 'drizzle') for (let k = 0; k < 30; k++) r(KFR.win0 + Math.floor(h1(k * 3.7) * VW), VY0 + Math.floor(h1(k * 1.3) * 40), 1, 1, [220, 225, 250]);
  drawAurora(KFR.win0, KFR.win1, VY0 - 10, HOR - 4, au.kp, au.vis, a, 0.6);
  mountains(KFR.win0, KFR.win1, HOR + 1, 22, 1.7, M(IS.MOUNTAIN, [16, 20, 32], night), M(IS.SNOW, [110, 120, 140], night), true);
  r(KFR.win0, HOR, VW, APRON - HOR, M(IS.LAVA, [14, 14, 18], night)); for (let x = KFR.win0; x < KFR.win1; x += 17) r(x, HOR + 2 + (x % 3) * 3, 10, 2, M(IS.MOSS, [18, 26, 18], night));
  r(KFR.win0, RUNWAY - 4, VW, 6, M([90, 94, 100], [30, 32, 40], night)); for (let x = KFR.win0; x < KFR.win1; x += 24) r(x, RUNWAY - 2, 12, 1, M(K.WHITE, [110, 114, 120], night));
  r(KFR.win0, APRON, VW, VY1 - APRON, M([150, 156, 164], [40, 42, 50], night)); r(KFR.win0, APRON + 8, VW, 2, M(AP.LINE_Y, [110, 90, 40], night));
  if (w.kind === 'snow' || h1(Math.floor(airT() / 900)) > 0.55) alpha(0.7, () => { r(KFR.win0, APRON - 1, VW, 2, IS.SNOW); for (let x = KFR.win0; x < KFR.win1; x += 9) r(x, HOR + 1 + (x % 4), 5, 1, IS.SNOW); });
  // the plane on Keflavík's apron: its own loop starts at LEG_S (it lands at 290, boards 300-390, and leaves)
  const k = ((airT() - LEG_S) % AIR_CYCLE + AIR_CYCLE) % AIR_CYCLE, j = jetOnApron(k, { standX: KFR.win1 - 8, standY: 452, runwayY: RUNWAY + 1, win0: KFR.win0, win1: KFR.win1 });
  if (j) drawJet(Math.round(j.x), Math.round(j.y), Math.round(j.len * 0.8), 1, a, { night: night > 0.5, gear: j.gear, flaps: j.flaps, pitch: j.pitch, door: j.door, haze: j.haze, hazeCol: low });
  if (night > 0.5) lit(() => { for (let x = KFR.win0 + 8; x < KFR.win1; x += 28) r(x, APRON - 2, 2, 2, [80, 140, 255]); });
  // Iceland's weather on the glass
  if (w.kind === 'snow' || w.kind === 'gale') for (let q = 0; q < 50; q++) { const x = KFR.win0 + Math.floor((h1(q) * VW + (w.kind === 'gale' ? a * 60 : Math.sin(a + q) * 5) + VW * 4) % VW), y = VY0 + Math.floor((h1(q * 3) * (VY1 - VY0) + a * (w.kind === 'gale' ? 30 : 14)) % (VY1 - VY0)); r(x, y, 1, 1, K.WHITE); }
  if (w.kind === 'drizzle') for (let q = 0; q < 30; q++) alpha(0.4, () => r(KFR.win0 + Math.floor(h1(q) * VW), VY0 + Math.floor((h1(q * 3) * (VY1 - VY0) + a * 50) % (VY1 - VY0)), 1, 4, [200, 220, 240]));
  if (w.kind === 'cloudy') alpha(0.25 * w.k, () => r(KFR.win0, VY0, VW, HOR - VY0, [150, 156, 166]));
  g.restore();
  for (let x = KFR.win0; x < KFR.win1; x += 86) { r(x, VY0, 3, VY1 - VY0, IS.BASALT); r(x + 1, VY0, 1, VY1 - VY0, IS.BASALT_HI); }
  r(KFR.win0, VY0, VW, 3, IS.BASALT);
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
/** The passport booth: glass on three sides, a counter, a stamp and its ink pad. */
const booth = stillProp(502, { x0: KFR.booth - 44, y0: 408, x1: KFR.booth + 44, y1: 504 }, () => {
  const x0 = KFR.booth - 40, x1 = KFR.booth + 40;
  r(x0, 414, x1 - x0, 4, IS.BASALT); alpha(0.35, () => r(x0 + 2, 418, x1 - x0 - 4, 56, AP.GLASS)); r(x0, 418, 3, 84, IS.BASALT_HI); r(x1 - 3, 418, 3, 84, IS.BASALT_HI);
  r(x0, 474, x1 - x0, 28, IS.BIRCH_DK); r(x0, 474, x1 - x0, 3, IS.BIRCH); r(x0, 498, x1 - x0, 4, IS.BASALT);
  r(x0 + 8, 468, 14, 6, [40, 60, 120]); r(x0 + 26, 470, 10, 4, [200, 40, 40]); // (the ink pad, the stamp)
}, () => { const t = now() - KEFW.stamp; if (t < 0.5) { lit(() => txt('THUMP!', KFR.booth - tw('THUMP!') / 2, 440 - Math.round(t * 20), [255, 90, 70])); } });
/** THE CAROUSEL: a loop of rubber slats round a steel island, a beacon that spins while it runs; the bags go round on it. */
const carousel: Prop = { y: CAROUSEL.yFront + 12, draw(a: number) {
  if (!seen(CAROUSEL.x0 - 20, CAROUSEL.x1 + 20)) return;
  const { x0, x1, yBack, yFront } = CAROUSEL, mid = (yBack + yFront) / 2, ry = (yFront - yBack) / 2 + 6;
  // the island in the middle, the belt all round it (its slats move), the steel rim
  oval((x0 + x1) / 2, mid, (x1 - x0) / 2 + 10, ry + 6, [120, 124, 132]); oval((x0 + x1) / 2, mid, (x1 - x0) / 2 + 4, ry, [40, 42, 48]);
  const step = (a * 30) % 12; for (let x = x0 + 24 + step; x < x1 - 30; x += 12) { r(Math.round(x), yBack - 2, 1, 5, [58, 60, 68]); r(Math.round(x1 + x0 - x), yFront - 2, 1, 5, [58, 60, 68]); } // (the slats' seams, sliding along the straight runs)
  oval((x0 + x1) / 2, mid, (x1 - x0) / 2 - 12, ry - 12, [150, 156, 166]); oval((x0 + x1) / 2, mid - 2, (x1 - x0) / 2 - 16, ry - 16, [176, 182, 190]);
  // the bags: at u (0..1 round the loop), each in its owner's colour; yours with a ribbon
  for (const b of KEFW.bags) {
    const { x, y } = loopAt(b.u);
    if (b.odd === 'kayak') { r(x - 16, y - 6, 32, 5, [240, 180, 40]); r(x - 18, y - 5, 4, 3, [240, 180, 40]); continue; }
    if (b.odd === 'cooler') { r(x - 8, y - 12, 16, 12, [240, 240, 244]); r(x - 8, y - 12, 16, 3, [40, 120, 200]); r(x + 2, y - 16, 6, 4, [150, 200, 230]); continue; } // (a fish's tail sticking out)
    if (b.odd === 'duck') { disc(x, y - 5, 4, [255, 220, 40]); disc(x + 3, y - 9, 3, [255, 220, 40]); r(x + 5, y - 9, 3, 1, [255, 140, 40]); continue; }
    if (b.odd === 'guitar') { oval(x, y - 6, 12, 5, [30, 30, 36]); r(x + 10, y - 7, 12, 3, [30, 30, 36]); continue; }
    r(x - 9, y - 14, 18, 14, b.col); r(x - 9, y - 14, 18, 2, M(b.col, K.WHITE, 0.3)); r(x - 3, y - 17, 6, 3, [40, 40, 44]); r(x - 9, y - 6, 18, 1, M(b.col, [0, 0, 0], 0.3));
    if (b.mine) { r(x - 2, y - 14, 4, 14, [255, 214, 60]); lit(() => r(x - 1, y - 22, 2, 3, [255, 214, 60])); }
  }
  // the beacon on the hatch: it spins orange while the belt runs
  const on = (a * 3) % 1; lit(() => r(1036, 404, 8, 6, on < 0.5 ? [255, 150, 40] : [180, 90, 30])); Gd(1040, 406, 12, [255, 150, 40], on < 0.5 ? 0.5 : 0.15);
} };
/** A point u (0..1) round the carousel's loop: along the back run left to right, round the right end, back along the front, round the left end. */
export function loopAt(u: number): { x: number; y: number; front: boolean } {
  const { x0, x1, yBack, yFront } = CAROUSEL, run = x1 - x0 - 40, end = Math.PI * ((yFront - yBack) / 2), total = run * 2 + end * 2, s = ((u % 1) + 1) % 1 * total;
  if (s < run) return { x: x0 + 20 + s, y: yBack, front: false };
  if (s < run + end) { const t = (s - run) / end; return { x: x1 - 20 + Math.sin(t * Math.PI) * 14, y: yBack + (yFront - yBack) * t, front: t > 0.5 }; }
  if (s < run * 2 + end) return { x: x1 - 20 - (s - run - end), y: yFront, front: true };
  const t = (s - run * 2 - end) / end; return { x: x0 + 20 - Math.sin(t * Math.PI) * 14, y: yFront - (yFront - yBack) * t, front: t < 0.5 };
}
const skyrCounter = stillProp(504, { x0: KFR.skyr - 36, y0: 470, x1: KFR.skyr + 36, y1: 506 }, () => { r(KFR.skyr - 32, 476, 64, 26, [236, 240, 244]); r(KFR.skyr - 32, 476, 64, 3, K.WHITE); r(KFR.skyr - 32, 490, 64, 3, [70, 110, 160]); r(KFR.skyr - 32, 500, 64, 2, IS.BASALT); });
const infoStand = stillProp(508, { x0: KFR.info - 24, y0: 470, x1: KFR.info + 24, y1: 510 }, () => { r(KFR.info - 20, 478, 40, 28, IS.BIRCH_DK); r(KFR.info - 20, 478, 40, 3, IS.BIRCH); for (let k = 0; k < 5; k++) r(KFR.info - 18 + k * 8, 472, 6, 8, [[120, 180, 220], [220, 120, 90], [120, 190, 120], [230, 200, 90], [180, 140, 220]][k] as RGB); r(KFR.info - 6, 482, 12, 12, [60, 150, 220]); lit(() => txt('I', KFR.info - 1, 485, K.WHITE)); });
const carHire = stillProp(560, { x0: 1076, y0: 520, x1: 1140, y1: 562 }, () => { r(1080, 532, 56, 26, IS.BASALT); r(1080, 532, 56, 3, IS.BASALT_HI); r(1082, 522, 52, 10, [240, 200, 40]); txt('SUPER JEEPS', 1108 - tw('SUPER JEEPS') / 2, 524, [40, 40, 44]); r(1086, 540, 44, 8, K.WHITE); txt('ALL BOOKED', 1108 - tw('ALL BOOKED') / 2, 542, [200, 40, 40]); });
const benchK = stillProp(546, { x0: 250, y0: 520, x1: 410, y1: 548 }, () => { r(254, 530, 152, 6, IS.BIRCH_DK); r(254, 530, 152, 2, IS.BIRCH); r(254, 520, 152, 10, IS.BASALT); for (const x of [260, 396]) r(x, 536, 4, 10, IS.BASALT); });
function drawBack(a: number): void {
  windowView(a);
  const A = air(), open = doorOpenAt('kef', A);
  // the jet bridge door, and its LED line
  if (seen(KFR.gate - 60, KFR.gate + 60)) {
    const x0 = KFR.gate - 28, y0 = 392, h = 78;
    if (open) { r(x0, y0, 56, h, [232, 220, 196]); for (let y = y0 + 8; y < 470; y += 8) r(x0 + 4, y, 48, 1, [205, 190, 160]); lit(() => r(x0 + 22, y0 + 2, 12, 3, [124, 242, 156])); }
    else { r(x0, y0, 27, h, [150, 156, 166]); r(x0 + 29, y0, 27, h, [150, 156, 166]); r(x0 + 26, y0, 4, h, [110, 116, 126]); }
    const msg = open ? 'LA102 HOME ' + mmss(Math.max(0, PUSH_S - A.k)) : 'NEXT ' + mmss(nextBoarding('kef', airT())); r(KFR.gate - 36, 362, 72, 10, [16, 18, 22]); lit(() => txt(msg, KFR.gate - tw(msg) / 2, 364, open ? [124, 242, 156] : [255, 180, 60]));
  }
  // the photo panels glow a little (lit from behind)
  if (seen(480, 750)) G(488, 410, 254, 56, [255, 250, 230], 0.08);
  // the travelator: its moving treads and handrails
  if (seen(TRAVELATOR.x0, TRAVELATOR.x1)) { const { x0, x1, y0, y1 } = TRAVELATOR; r(x0, y0, x1 - x0, y1 - y0, [70, 74, 82]); const o = (a * TRAVELATOR.speed) % 10; for (let x = x0 + o; x < x1; x += 10) r(Math.round(x), y0 + 2, 2, y1 - y0 - 4, [96, 100, 110]); r(x0, y0 - 2, x1 - x0, 2, [40, 42, 48]); r(x0, y1, x1 - x0, 2, [140, 146, 156]); lit(() => { for (let x = x0 + 30; x < x1; x += 120) txt('>', x + Math.round(o), y0 + 9, [124, 242, 156]); }); }
  // the forecast TV by the exit
  if (seen(KFR.exit + 30, KFR.exit + 80)) { const f = forecast(), x0 = KFR.exit + 38, y0 = 398; r(x0 - 2, y0 - 2, 34, 36, [20, 22, 26]); r(x0, y0, 30, 32, [6, 12, 26]); lit(() => { txt('KP ' + f.kp, x0 + 2, y0 + 3, K.WHITE); txt(f.cloud + '%', x0 + 2, y0 + 12, [190, 200, 220]); txt(f.verdict === 'GOOD CHANCE' ? 'GOOD' : f.verdict, x0 + 2, y0 + 22, f.verdict === 'NONE' ? [150, 150, 160] : [120, 255, 160]); }); Gd(x0 + 15, y0 + 16, 18, [80, 180, 255], 0.1); }
  // the automatic doors: they slide open as someone walks up (drawn open while you're near: the features set KEFW.view)
  if (seen(KFR.exit - 40, KFR.exit + 40)) { const near = Math.abs((KEFW.view.x0 + KEFW.view.x1) / 2 - KFR.exit) < 80, o = near ? 22 : 0; alpha(0.6, () => { r(KFR.exit - 30 - o, 392, 30, 78, AP.GLASS); r(KFR.exit + o, 392, 30, 78, AP.GLASS); }); r(KFR.exit - 30 - o, 392, 30, 2, IS.STEEL); r(KFR.exit + o, 392, 30, 2, IS.STEEL); }
}

export const KFSPOT = { PASSPORT: 0, CAROUSEL: 1, SKYR: 2, MAP: 3, SEAT0: 4 };
export const KEF_SPOTS: Spot[] = [
  { kind: 'passport', x: KFR.booth, y: 512, sx: KFR.booth, sy: 512, lift: 0, label: 'PASSPORT', area: { x0: KFR.booth - 40, y0: 386, x1: KFR.booth + 40, y1: 502 } },
  { kind: 'carousel', x: (CAROUSEL.x0 + CAROUSEL.x1) / 2, y: CAROUSEL.yFront + 20, sx: (CAROUSEL.x0 + CAROUSEL.x1) / 2, sy: CAROUSEL.yFront + 20, lift: 0, label: 'GRAB YOUR BAG', area: { x0: CAROUSEL.x0, y0: CAROUSEL.yBack - 24, x1: CAROUSEL.x1, y1: CAROUSEL.yFront + 14 } },
  { kind: 'skyr', x: KFR.skyr, y: 514, sx: KFR.skyr, sy: 514, lift: 0, label: 'SKYR', area: { x0: KFR.skyr - 34, y0: 386, x1: KFR.skyr + 34, y1: 502 } },
  { kind: 'map', x: KFR.info, y: 514, sx: KFR.info, sy: 514, lift: 0, label: 'MAP', area: { x0: KFR.info - 22, y0: 392, x1: KFR.info + 22, y1: 506 } },
  ...[280, 330, 380].map((x): Spot => ({ kind: 'sit', x, y: 534, sx: x, sy: 556, lift: 8, label: 'SIT', area: { x0: x - 22, y0: 516, x1: x + 22, y1: 536 } })),
];
const TALK: Talker[] = [
  { id: 'car-hire', name: 'THE CAR HIRE DESK', x: 1108, y: 530, sx: 1108, sy: 568, lines: ['SUPER JEEPS: ALL BOOKED. A note underneath: "try the tour bus. coming soon."', 'Monster tyres in the photo. Taller than a critter.'], verb: 'READ' },
  { id: 'photo-glacier', name: 'THE PHOTOS', x: 614, y: 430, sx: 614, sy: 510, lines: ['A glacier, a waterfall, the northern lights. Iceland, showing off.', 'The waterfall one has a rainbow in the spray. Of course it does.'], verb: 'LOOK' },
  { id: 'shop-kef', name: 'THE SHOP', x: KFR.skyr, y: 420, sx: KFR.skyr, sy: 512, lines: ['Liquorice, woolly socks, and puffin magnets. So many puffin magnets.', 'A tin of "ICELANDIC AIR". It\'s empty. It costs 9 tokens.'], verb: 'LOOK' },
];
export function makeKef(): Room {
  const room: Room = {
    id: 'kef', title: 'KEFLAVIK', sub: 'ICELAND',
    w: W, h: H,
    lookAt: (x0, x1) => { const keep = KEFW.view; KEFW.view = { x0, x1 }; return () => { KEFW.view = keep; }; },
    floor: { x0: 14, y0: FL0, x1: W - 14, y1: FL1 },
    blockers: [
      { x0: KFR.booth - 40, y0: 490, x1: KFR.booth + 40, y1: 504 }, // the booth's counter
      { x0: CAROUSEL.x0 - 14, y0: CAROUSEL.yBack - 8, x1: CAROUSEL.x1 + 14, y1: CAROUSEL.yFront + 8 }, // the carousel
      { x0: KFR.skyr - 32, y0: 494, x1: KFR.skyr + 32, y1: 506 }, { x0: KFR.info - 20, y0: 496, x1: KFR.info + 20, y1: 510 },
      { x0: 1080, y0: 548, x1: 1136, y1: 562 }, { x0: 254, y0: 530, x1: 406, y1: 548 }, // the car hire desk, the bench
    ],
    doors: [
      { trigger: { x0: KFR.gate - 22, y0: FL0, x1: KFR.gate + 22, y1: FL0 + 10 }, to: 'plane', arrive: AIR_ARRIVE.plane, label: 'GATE D4', area: { x0: KFR.gate - 30, y0: 390, x1: KFR.gate + 30, y1: 470 },
        route: () => (doorOpenAt('kef') ? { to: 'plane', arrive: AIR_ARRIVE.plane, label: 'BOARD LA102' } : null) },
      { trigger: { x0: KFR.exit - 24, y0: FL0, x1: KFR.exit + 24, y1: FL0 + 10 }, to: 'reykjavik', arrive: AIR_ARRIVE.reykjavik, label: 'BUS TO REYKJAVIK', area: { x0: KFR.exit - 32, y0: 390, x1: KFR.exit + 32, y1: 470 } },
    ],
    spots: KEF_SPOTS, inUse: new Map(),
    spawn: { ...AIR_ARRIVE.kef },
    dim: 0.03,
    fillTop: 'rgb(205,190,159)', fillLow: 'rgb(90,95,102)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [booth, carousel, skyrCounter, infoStand, carHire, benchK],
    talkers: TALK,
  };
  return room;
}
void clamp; void line;
