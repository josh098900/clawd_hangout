// SARDINE 1 (1000 x 620): the City Aquarium's little yellow submarine, from the inside. A cramped, riveted cabin: you're in a long
// tube looking out of its side, and the back wall is nearly all WINDOW (world/sea.ts draws the sea through it, round wherever the sub
// is). Everything else crowds along the deck in front of it, stern (left) to bow (right):
//   the ESCAPE HATCH overhead · THE ENGINE (the intake lever) · the GALLEY · the FUSE BOX · CLAW · SONAR · the LADDER up to the hatch
//   (THE DIVE BOARD over it) · CAMERA · FLOODLIGHTS · PERISCOPE · the VALVE WHEEL · ZAP · the HELM (the depth gauge, the NAV screen,
//   the telegraph, the horn); on the deck: the TREASURE BIN, the CHART TABLE with THE SEA LIFE LOG, a bench.
// features/sub.ts runs the dive and fills SUBW every frame; this file only draws it.

import { K, SB, type RGB } from '../engine/palette';
import { PX, r, disc, oval, ring, line, txt, tw, lit, alpha, G, Gd, M, shade, mk, withCtx } from '../engine/pixel';
import { clamp, h1 } from '../engine/math';
import { drawGlass, drawPen, drawSea, WIN, PANES, type GlassView, type PenView, type SeaView } from './sea';
import { drawFind } from './sealife';
import { TR, hatchOpen, mergeDive, type DiveState } from '../game/sub';
import type { Door, Prop, Room, Spot, Talker } from './room';

const W = 1000, H = 600, CEIL = 326, FL = 470;
/** Where things are (x): the stations along the wall, the ladder, the things on the deck, where the CAP'N stands. */
export const SUBR = { escape: 40, engine: 104, intake: 140, galley: 196, fuse: 310, claw: 366, sonar: 430, ladder: 500, camera: 580, lights: 636, periscope: 690, valve: 760, zap: 830, helm: 910, bin: 404, chart: 640, bench: 800, cap: 962 };
/** Where you step out in the aquarium's sub pen (the foot of the gangway). */
export const PEN_ARRIVE = { x: 1548, y: 530 };
/** Where you come down the ladder. */
export const SUB_ARRIVE = { x: 500, y: 500 };

/** The dive as the cabin shows it: features/sub.ts fills this every frame. */
export const SUBW = {
  /** The dive (room state 'dive', merged: its shared bits only ever grow). */
  st: null as DiveState | null,
  /** The window: the sea round the sub, or the pen (at the dock, going down, coming up), and what's on the glass. */
  sea: null as SeaView | null, pen: null as PenView | null,
  glass: { a: 0, seal: -1, squid: -1, octo: -1, flash: -1, ping: -1, wet: 0, lightsOut: false, ghost: false } as GlassView,
  /** The depth (m), the sea's light in the cabin (0 dark .. 1), and its colour. */
  depth: 0, light: 1, lightCol: [80, 170, 180] as RGB,
  /** THE DIVE BOARD's four short lines, and the NAV screen's dot (0..1 along the sea, 0..1 down it). */
  board: ['', '', '', ''] as string[], nav: { u: 0, v: 0 },
  /** The sonar: when it last pinged (animation clock), and its blips (angle, distance 0..1, colour). */
  sonar: { t: -99, blips: [] as { an: number; d: number; c: RGB }[] },
  /** The claw: along and down from the sub (m), how shut (0..1), and what it's holding. */
  claw: { cx: 0, cd: 0, shut: 0, hold: null as string | null, busy: false },
  /** The floodlights on, the lights out (a blown fuse), the leak's water (0..1), a jelly in the intake, the Cap'n on autopilot, a trouble on at each fix spot. */
  lamps: false, lightsOut: false, leak: 0, jelly: false, auto: true, fixing: [false, false, false, false] as boolean[],
  /** The helm wheel's turn, how the sub's tilting (its vertical speed), how fast it's going, the periscope (0 up .. 1 down), the ZAP cover (0..1), shaking. */
  wheel: 0, tilt: 0, speed: 0, periscope: 0, zap: 0, shake: 0,
  /** The kettle: steaming until (animation clock). The squid sign's count. */
  kettle: -99, squidDays: 0,
  /** What's in the TREASURE BIN (find kinds). */
  bin: [] as string[],
  /** The part of the cabin in view (the camera), so the busy bits skip what you can't see. */
  view: { x0: 0, x1: W },
};
const seen = (x0: number, x1: number): boolean => x1 >= SUBW.view.x0 - 8 && x0 <= SUBW.view.x1 + 8;

// ---------------------------------------------------------------- the set ----------------------------------------------------------------
function rivets(x0: number, x1: number, y: number, step = 8): void { for (let x = x0; x <= x1; x += step) { r(x, y, 1, 1, SB.RIVET); r(x, y - 1, 1, 1, SB.RIVET_HI); } }
/** Up in the hull, over the cabin (y 0 to CEIL - 30): ribs and stringers going up into the dark, the air duct, the oxygen bottles,
 *  the Cap'n's hammock (with a sock), the net of glass floats, a lifebuoy, the cable runs. Dim: the lamps are all below it. */
function overhead(): void {
  const top = CEIL - 30, dim = (c: RGB, k = 0.45): RGB => M(c, SB.CEIL, k), riv = dim(SB.RIVET, 0.55);
  // the plates, with their seams; the stringers running along; the ribs coming down
  for (let y = 40; y < top; y += 46) { r(0, y, W, 1, shade(SB.CEIL, 0.8)); for (let x = 8; x < W; x += 14) r(x, y + 3, 1, 1, riv); }
  for (const y of [70, 150, 228]) { r(0, y, W, 6, SB.CEIL2); r(0, y, W, 1, dim(SB.PIPE_HI, 0.5)); r(0, y + 5, W, 1, shade(SB.CEIL, 0.75)); }
  for (let x = 60; x < W; x += 125) { r(x, 0, 12, top, SB.CEIL2); r(x, 0, 1, top, dim(SB.PIPE_HI, 0.45)); r(x + 11, 0, 1, top, shade(SB.CEIL, 0.7)); for (let y = 6; y < top; y += 10) { r(x + 3, y, 1, 1, riv); r(x + 8, y, 1, 1, riv); } }
  // the air duct: a fat round pipe along the ceiling with clamp rings, and a grille blowing down
  r(0, 104, 430, 20, dim(SB.PIPE, 0.35)); r(0, 105, 430, 3, dim(SB.PIPE_HI, 0.35)); r(0, 121, 430, 3, dim(SB.PIPE_DK, 0.3));
  for (let x = 20; x < 430; x += 62) { r(x, 102, 5, 24, dim(SB.PIPE_DK, 0.3)); r(x, 102, 5, 1, dim(SB.PIPE_HI, 0.3)); }
  r(424, 100, 10, 28, dim(SB.PIPE_DK, 0.3)); r(236, 124, 34, 8, dim(SB.PIPE_DK, 0.3)); for (let x = 238; x < 268; x += 3) r(x, 126, 1, 5, SB.RUBBER);
  // the oxygen bottles, strapped in a rack
  r(592, 146, 100, 4, dim(SB.RIB_DK, 0.4)); r(592, 232, 100, 4, dim(SB.RIB_DK, 0.4));
  for (let k = 0; k < 6; k++) { const x = 596 + k * 16; r(x, 156, 12, 74, dim(SB.ENGINE, 0.3)); r(x + 1, 158, 3, 70, dim(SB.ENGINE_HI, 0.3)); r(x + 10, 156, 2, 74, dim(SB.ENGINE_DK, 0.3)); r(x + 3, 150, 6, 6, dim(SB.BRASS, 0.35)); r(x + 4, 148, 4, 2, dim(SB.BRASS_HI, 0.35)); }
  r(592, 176, 100, 3, dim(SB.RUNNER, 0.35)); r(592, 208, 100, 3, dim(SB.RUNNER, 0.35));
  // the Cap'n's hammock, slung between two ribs, with a blanket over the side and a sock hanging off it
  { const x0 = 822, x1 = 935; for (const hx of [x0, x1]) { r(hx - 2, 180, 4, 4, dim(SB.BRASS, 0.3)); } line(x0, 182, x0 + 14, 200, dim(SB.LAG, 0.4)); line(x1, 182, x1 - 14, 200, dim(SB.LAG, 0.4));
    for (let x = x0 + 12; x <= x1 - 12; x++) { const u = (x - x0 - 12) / (x1 - x0 - 24), y = Math.round(200 + Math.sin(u * Math.PI) * 18); r(x, y - 3, 1, 5, dim(SB.LAG, 0.35)); r(x, y + 2, 1, 1, dim(SB.RIB_DK, 0.3)); }
    for (let x = x0 + 30; x < x0 + 78; x++) { const u = (x - x0 - 12) / (x1 - x0 - 24), y = Math.round(200 + Math.sin(u * Math.PI) * 18); r(x, y - 5, 1, 4, Math.floor((x - x0) / 5) % 2 ? dim(SB.RUNNER_HI, 0.3) : dim(SB.HULL, 0.35)); if (x > x0 + 60) r(x, y - 1, 1, 12 - Math.abs(x - x0 - 69), Math.floor((x - x0) / 5) % 2 ? dim(SB.RUNNER_HI, 0.3) : dim(SB.HULL, 0.35)); }
    r(x0 + 88, 219, 5, 10, dim([90, 150, 200], 0.3)); r(x0 + 88, 227, 8, 4, dim([90, 150, 200], 0.3)); r(x0 + 88, 222, 5, 1, dim(SB.HULL_HI, 0.35)); } // (the sock)
  // the net of glass floats, and a starfish caught in it
  { for (let k = 0; k < 9; k++) { line(34 + k * 16, 150, 22 + k * 16 + 24, 230, dim(SB.LAG, 0.55)); line(34 + k * 16, 150, 46 + k * 16 - 24, 230, dim(SB.LAG, 0.55)); } r(30, 148, 150, 2, dim(SB.LAG, 0.45));
    for (const [fx, fy, c] of [[62, 196, [90, 190, 150]], [104, 210, [80, 150, 210]], [146, 190, [120, 200, 170]]] as [number, number, RGB][]) { disc(fx, fy, 7, dim(c, 0.3)); r(fx - 3, fy - 4, 2, 2, dim(SB.HULL_HI, 0.2)); }
    const sx = 86, sy = 176, sc = dim([232, 120, 70], 0.3); r(sx - 1, sy - 6, 3, 13, sc); r(sx - 6, sy - 1, 13, 3, sc); r(sx - 4, sy + 2, 3, 3, sc); r(sx + 2, sy + 2, 3, 3, sc); }
  // a lifebuoy on a hook
  { const lx = 372, ly = 200; line(lx, 158, lx, 188, dim(SB.LAG, 0.45)); for (let an = 0; an < Math.PI * 2; an += 0.08) { const band = Math.floor((an + 0.39) / (Math.PI / 4)) % 2; r(Math.round(lx + Math.cos(an) * 11) - 2, Math.round(ly + Math.sin(an) * 11) - 2, 4, 4, band ? dim(SB.RED, 0.3) : dim(SB.HULL_HI, 0.3)); } }
  // the cable runs, sagging between their clips
  for (const [c, dy] of [[SB.RUBBER, 0], [dim(SB.RED, 0.35), 4], [dim(SB.AMBER, 0.4), 8]] as [RGB, number][]) for (let x = 560; x < W; x += 110) { for (let t = 0; t <= 110; t += 2) r(x + t, Math.round(262 + dy + Math.sin((t / 110) * Math.PI) * 7), 2, 2, c); r(x - 1, 258, 3, 16, dim(SB.PIPE_DK, 0.3)); }
  // the hatch's tube, going on up to the hatch in the top of the hull
  r(478, 0, 44, 250, dim(SB.PIPE, 0.25)); r(478, 0, 2, 250, dim(SB.PIPE_HI, 0.25)); r(520, 0, 2, 250, dim(SB.PIPE_DK, 0.25)); for (let y = 30; y < 250; y += 70) { r(476, y, 48, 4, dim(SB.PIPE_DK, 0.25)); r(476, y, 48, 1, dim(SB.PIPE_HI, 0.25)); }
  // and it all goes up into the dark
  for (let y = 0; y < 170; y += 2) alpha(0.75 * (1 - y / 170) ** 1.5, () => r(0, y, W, 2, [12, 13, 16]));
}
function build(this: Room): void {
  const g = this.bg.getContext('2d')!, d = PX.dim, e = PX.emit, f = PX.fl; PX.dim = 0; PX.emit = false; PX.fl = 0;
  try { withCtx(g, () => {
    // ---- the ceiling: the hull curving over, pipes (one lagged), a cable tray, the hatch's round tube over the ladder ----
    r(0, 0, W, CEIL, SB.CEIL); for (let y = CEIL - 30; y < CEIL; y += 2) r(0, y, W, 2, M(SB.CEIL, SB.HULL_DK, (y - (CEIL - 30)) / 30));
    overhead(); // (the hull arching up into the dark: only a tall phone's screen shows much of it)
    r(0, CEIL - 22, W, 5, SB.PIPE); r(0, CEIL - 22, W, 1, SB.PIPE_HI); r(0, CEIL - 18, W, 1, SB.PIPE_DK); for (let x = 30; x < W; x += 90) { r(x, CEIL - 24, 4, 9, SB.PIPE_DK); }
    r(0, CEIL - 12, W, 6, SB.LAG); for (let x = 0; x < W; x += 6) r(x, CEIL - 12, 1, 6, shade(SB.LAG, 0.85)); r(0, CEIL - 6, W, 1, shade(SB.LAG, 0.7));
    for (let x = 160; x < 860; x += 120) { r(x, CEIL - 30, 30, 3, [60, 60, 66]); }
    r(478, 250, 44, CEIL - 250, SB.PIPE); r(478, 250, 2, CEIL - 250, SB.PIPE_HI); r(520, 250, 2, CEIL - 250, SB.PIPE_DK); ring(500, CEIL - 26, 9, 3, SB.WHEEL); // the hatch tube and its wheel
    for (let x = 478; x < 522; x += 4) r(x, 256, Math.min(4, 522 - x), 7, (x - 478) % 8 ? SB.RUBBER : SB.AMBER); // (a hazard band: mind your head)
    // ---- the hull's inside: cream plates with seams and rivets, the sea-green band under the window ----
    r(0, CEIL, W, FL - CEIL, SB.HULL); for (let y = CEIL + 30; y < FL; y += 36) r(0, y, W, 1, SB.HULL_DK);
    r(0, CEIL, W, 2, SB.HULL_HI);
    r(0, 456, W, FL - 456, SB.BAND); r(0, 456, W, 1, SB.BAND_HI); r(0, FL - 2, W, 2, SB.BAND_DK); rivets(4, W - 4, 460, 10);
    // the window: brass frames round the four panes, rivets, rubber seals (the sea is drawn through them live)
    for (const [x0, x1] of PANES) {
      r(x0 - 6, WIN.y0 - 6, x1 - x0 + 12, WIN.y1 - WIN.y0 + 12, SB.BRASS_DK); r(x0 - 5, WIN.y0 - 5, x1 - x0 + 10, 2, SB.BRASS_HI); r(x0 - 5, WIN.y0 - 3, 2, WIN.y1 - WIN.y0 + 6, SB.BRASS);
      r(x0 - 1, WIN.y0 - 1, x1 - x0 + 2, WIN.y1 - WIN.y0 + 2, SB.RUBBER);
      rivets(x0 - 2, x1 + 1, WIN.y0 - 4, 9); rivets(x0 - 2, x1 + 1, WIN.y1 + 4, 9);
    }
    r(WIN.x0 - 8, WIN.y1 + 7, WIN.x1 - WIN.x0 + 16, 3, SB.BRASS_DK); r(WIN.x0 - 8, WIN.y1 + 7, WIN.x1 - WIN.x0 + 16, 1, SB.BRASS_HI); // the sill
    // the ribs: heavy hull frames with rivets (the two between the panes, the ladder's bulkhead, the ends)
    for (const [x0, x1] of [[142, 149], [304, 316], [470, 530], [684, 696], [851, 858]] as [number, number][]) {
      r(x0, CEIL, x1 - x0, FL - CEIL, SB.RIB); r(x0, CEIL, 1, FL - CEIL, SB.HULL_HI); r(x1 - 1, CEIL, 1, FL - CEIL, SB.RIB_DK);
      for (let y = CEIL + 6; y < FL; y += 9) { r(x0 + 2, y, 1, 1, SB.RIVET); if (x1 - x0 > 10) r(x1 - 3, y, 1, 1, SB.RIVET); }
    }
    // ---- the stern: the ESCAPE HATCH overhead with its ladder and stencil, rubber rings on a hook, the squid sign, the card ----
    disc(SUBR.escape, CEIL - 2, 16, SB.WHEEL_DK); disc(SUBR.escape, CEIL - 2, 13, SB.WHEEL); ring(SUBR.escape, CEIL - 2, 9, 3, SB.WHEEL_DK);
    txt('ESCAPE', SUBR.escape - tw('ESCAPE') / 2, CEIL + 16, K.WHITE); r(SUBR.escape - 14, CEIL + 24, 28, 1, SB.WHEEL);
    for (const lx of [SUBR.escape - 7, SUBR.escape + 6]) r(lx, CEIL + 26, 2, FL - CEIL - 26, SB.PIPE); for (let y = CEIL + 34; y < FL; y += 12) r(SUBR.escape - 7, y, 15, 2, SB.PIPE_HI);
    for (const [cx, cy] of [[78, 352], [96, 360]] as [number, number][]) { ring(cx, cy, 8, 8, [255, 120, 40]); ring(cx, cy, 7, 7, [255, 120, 40]); ring(cx, cy, 5, 5, [240, 240, 240]); for (const [dx, dy] of [[0, -8], [8, 0], [0, 8], [-8, 0]]) r(cx + dx - 1, cy + dy - 1, 2, 2, K.WHITE); }
    r(84, 340, 1, 6, SB.PIPE_DK);
    r(108, 336, 32, 22, K.WHITE); r(108, 336, 32, 1, SB.HULL_DK); txt('DAYS SINCE', 110, 338, [40, 40, 50]); txt('LAST SQUID', 110, 344, [40, 40, 50]); r(118, 350, 12, 7, [30, 30, 36]);
    r(64, 420, 26, 16, [250, 244, 200]); txt('IN CASE', 66, 422, [120, 40, 40]); txt('OF SQUID', 65, 429, [120, 40, 40]);
    r(104, 378, 30, 3, SB.HULL_DK); r(110, 368, 10, 10, [200, 230, 240]); r(111, 369, 8, 8, [150, 200, 220]); r(113, 372, 4, 2, SB.AMBER); r(106, 370, 3, 8, [200, 190, 150]); // the jar (SARDINE 2) on its shelf, and a tin
    // THE ENGINE: a squat green block, two cylinder heads (the pistons are drawn live), a flywheel, a gauge, the exhaust up into the ceiling, the intake lever
    r(64, 420, 84, 54, SB.ENGINE); r(64, 420, 84, 2, SB.ENGINE_HI); r(64, 420, 2, 54, SB.ENGINE_HI); r(146, 420, 2, 54, SB.ENGINE_DK); r(64, 470, 84, 4, SB.ENGINE_DK);
    for (const cx of [86, 118]) { r(cx - 10, 398, 20, 24, SB.ENGINE); r(cx - 10, 398, 20, 1, SB.ENGINE_HI); for (let y = 402; y < 420; y += 3) r(cx - 10, y, 20, 1, SB.ENGINE_DK); }
    r(70, 360, 6, 38, SB.PIPE_DK); r(70, CEIL, 6, 34, SB.PIPE_DK); r(71, CEIL, 1, 72, SB.PIPE); // the exhaust
    disc(100, 446, 8, SB.CONSOLE_DK); ring(100, 446, 8, 8, SB.BRASS); txt('PSI', 95, 456, K.WHITE); // the pressure gauge (its needle is live)
    r(66, 462, 80, 8, [40, 44, 40]); rivets(68, 146, 466, 6);
    r(SUBR.intake - 3, 430, 6, 36, SB.PIPE); r(SUBR.intake - 3, 430, 1, 36, SB.PIPE_HI); txt('INTAKE', SUBR.intake - 12, 468, K.WHITE);
    // ---- the LADDER up to the hatch, on its bulkhead; THE DIVE BOARD above it (its text is live) ----
    for (const lx of [490, 508]) { r(lx, 378, 3, FL - 378, SB.PIPE); r(lx, 378, 1, FL - 378, SB.PIPE_HI); } for (let y = 386; y < FL; y += 12) r(490, y, 21, 2, SB.PIPE_HI);
    r(474, 334, 52, 40, SB.CONSOLE_DK); r(476, 336, 48, 36, [24, 16, 8]); rivets(476, 524, 333, 6);
    // ---- PERISCOPE: its tube down the second rib from the ceiling (it lowers when you use it: live) ----
    r(SUBR.periscope - 5, CEIL - 30, 10, 58, SB.PIPE_DK); r(SUBR.periscope - 5, CEIL - 30, 2, 58, SB.PIPE);
    // ---- the bow: the HELM (its wheel is live) on a pedestal, the depth gauge, the NAV screen, the telegraph, the horn's cord, the porthole ----
    r(SUBR.helm - 4, 450, 8, 22, [70, 60, 50]); r(SUBR.helm - 8, 468, 16, 4, [50, 44, 38]);
    disc(880, 352, 12, SB.BRASS_DK); disc(880, 352, 10, [246, 240, 224]); for (let k = 0; k < 8; k++) { const an = Math.PI * (0.75 + (k / 7) * 1.5); r(Math.round(880 + Math.cos(an) * 8), Math.round(352 + Math.sin(an) * 8), 1, 1, [40, 40, 50]); } txt('DEPTH', 870, 366, [40, 40, 50]);
    r(898, 342, 52, 24, SB.CONSOLE_DK); r(900, 344, 48, 20, SB.SCREEN); txt('NAV', 948 - 12, 368, K.WHITE);
    disc(948, 430, 11, SB.BRASS_DK); disc(948, 430, 9, [240, 234, 214]); txt('AHEAD', 938, 419, [40, 40, 50]); r(947, 438, 2, 12, SB.BRASS_DK);
    line(870, CEIL - 6, 870, 396, [200, 190, 160]); r(864, 396, 13, 3, [120, 80, 50]);
    disc(968, 350, 12, SB.BRASS_DK); disc(968, 350, 10, SB.RUBBER); // the forward porthole (its view is live)
    r(956, 376, 26, 20, [240, 236, 226]); r(958, 378, 22, 14, [120, 170, 200]); r(962, 384, 14, 6, SB.BRASS); r(966, 381, 2, 3, SB.BRASS_DK); r(958, 392, 22, 2, [200, 190, 170]); // the photo: SARDINE 1's launch
    disc(872, 404, 7, SB.BRASS_DK); disc(872, 404, 6, [240, 232, 214]); line(872, 404, 876, 399, [40, 40, 50]); txt('CHANGE', 861, 413, [40, 40, 50]); // the barometer: always CHANGE
    disc(988, 418, 8, [40, 30, 30]); ring(988, 418, 5, 5, [200, 60, 60]); ring(988, 418, 2, 2, [240, 230, 200]); r(995, 404, 3, 1, [200, 200, 200]); r(994, 404, 1, 1, [255, 90, 90]); // the dartboard, the one dart in the wall
    for (let y = 334; y < FL; y += 12) r(W - 6, y, 6, 1, SB.HULL_DK);
    // ---- the deck: steel plates with a diamond tread, a worn red runner down the middle, a drain ----
    r(0, FL, W, H - FL, SB.DECK); for (let y = FL + 8; y < H; y += 26) r(0, y, W, 1, SB.DECK2); for (let x = 0; x < W; x += 60) r(x, FL, 1, H - FL, SB.DECK2);
    for (let y = FL + 4; y < H; y += 6) for (let x = ((y / 6) % 2) * 6; x < W; x += 12) r(x, y, 2, 1, SB.DECK_HI);
    r(0, FL, W, 2, SB.DECK_HI);
    r(150, 512, 700, 22, SB.RUNNER); r(150, 512, 700, 1, SB.RUNNER_HI); for (let x = 156; x < 846; x += 14) r(x, 518 + (x % 3), 6, 1, shade(SB.RUNNER, 0.8)); for (let k = 0; k < 12; k++) r(150 + Math.floor(h1(k * 3.1) * 690), 514 + Math.floor(h1(k) * 16), 3, 2, M(SB.RUNNER, SB.DECK, 0.5)); // worn patches
    oval(262, 552, 9, 3, [40, 42, 46]); for (let k = -6; k <= 6; k += 3) r(262 + k, 550, 1, 5, [70, 72, 78]);
    fore();
  }); } finally { PX.dim = d; PX.emit = e; PX.fl = f; }
  FORE = mk(860 - FORE_X, FL + 2 - FORE_Y);
  const fg = FORE.getContext('2d')!; PX.dim = 0; PX.emit = false; PX.fl = 0;
  try { withCtx(fg, () => { fg.translate(-FORE_X, -FORE_Y); fore(); }); } finally { PX.dim = d; PX.emit = e; PX.fl = f; }
}
/** What stands in front of the window (the galley, the fuse box, the claw and sonar consoles, the camera, the floodlights' plate, the valve's
 *  pipe, ZAP): baked into the set, and again into FORE, which is stamped over the sea so the window never paints over them. */
function fore(): void {
    // ---- the galley: a little counter, the hob (the kettle's steam is live), a tin of sardines ----
    r(170, 448, 56, 22, [180, 150, 110]); r(170, 448, 56, 2, [210, 180, 140]); r(172, 452, 24, 16, [160, 130, 96]); r(200, 452, 24, 16, [160, 130, 96]); r(194, 458, 4, 2, SB.BRASS);
    disc(186, 446, 6, [40, 40, 44]); disc(186, 446, 4, [60, 60, 66]); r(178, 432, 14, 13, [200, 60, 60]); r(178, 432, 14, 2, [240, 110, 110]); r(191, 434, 4, 2, [200, 60, 60]); r(183, 429, 4, 3, [60, 60, 66]); // the kettle on the hob
    r(206, 440, 12, 6, [200, 206, 216]); r(206, 440, 12, 1, K.WHITE); txt('SARDINES', 206, 441, [40, 60, 120]); // a tin (the letters are tiny, it's a joke)
    // ---- the FUSE BOX on the first rib ----
    r(SUBR.fuse - 10, 384, 20, 34, [120, 126, 136]); r(SUBR.fuse - 10, 384, 20, 1, [170, 176, 186]); r(SUBR.fuse + 9, 384, 1, 34, [80, 86, 96]); for (let k = 0; k < 4; k++) r(SUBR.fuse - 7 + k * 4, 388, 2, 6, [240, 200, 60]); txt('FUSES', SUBR.fuse - 9, 412, [30, 30, 36]);
    // ---- CLAW: a low console with a joystick and a GRAB button (its screen, the claw cam, is live) ----
    console_(SUBR.claw, 44, 'CLAW'); r(SUBR.claw + 8, 452, 7, 3, [200, 50, 50]); r(SUBR.claw + 8, 452, 7, 1, [255, 120, 120]);
    // ---- SONAR: a console with a round green screen (the sweep is live) and the PING button ----
    console_(SUBR.sonar, 40, 'SONAR'); disc(SUBR.sonar, 426, 13, SB.CONSOLE_DK); disc(SUBR.sonar, 426, 11, SB.SCREEN); r(SUBR.sonar + 10, 452, 6, 3, SB.GREEN);
    // ---- CAMERA: an old box camera on a tripod aimed out of the window, a flash gun on top ----
    for (const [x0, x1] of [[SUBR.camera - 2, SUBR.camera - 16], [SUBR.camera + 2, SUBR.camera + 16], [SUBR.camera, SUBR.camera]] as [number, number][]) line(x0, 440, x1, FL - 2, [60, 62, 68]);
    r(SUBR.camera - 12, 424, 24, 18, [44, 44, 50]); r(SUBR.camera - 12, 424, 24, 2, [80, 80, 90]); r(SUBR.camera - 4, 418, 8, 6, [60, 60, 66]); r(SUBR.camera - 3, 412, 6, 6, [210, 214, 222]); r(SUBR.camera - 10, 430, 20, 3, [140, 100, 60]); txt('SNAPPER', SUBR.camera - 13, 435, [220, 200, 150]);
    // ---- FLOODLIGHTS: the big two-way lever on its plate (the lever and its lamps are live) ----
    r(SUBR.lights - 12, 432, 24, 36, [96, 100, 108]); r(SUBR.lights - 12, 432, 24, 1, [140, 146, 156]); txt('LIGHTS', SUBR.lights - 11, 460, K.WHITE);
    // ---- THE VALVE WHEEL on the main pipe (the wheel is live) ----
    r(SUBR.valve - 3, CEIL - 6, 6, FL - CEIL + 6, SB.PIPE); r(SUBR.valve - 3, CEIL - 6, 1, FL - CEIL + 6, SB.PIPE_HI); r(SUBR.valve - 5, 470, 10, 3, SB.PIPE_DK); r(SUBR.valve - 6, 420, 12, 4, SB.PIPE_DK);
    // ---- ZAP: a grey box with a big red button under a flip-up cover ----
    r(SUBR.zap - 16, 432, 32, 38, [96, 100, 108]); r(SUBR.zap - 16, 432, 32, 1, [140, 146, 156]); disc(SUBR.zap, 448, 8, [60, 20, 20]); txt('ZAP', SUBR.zap - 5, 459, [255, 214, 90]); txt('FOR SQUID', SUBR.zap - 17, 465, K.WHITE);
}
/** FORE: the part of the set in front of the window, stamped over the sea every frame. */
const FORE_X = 140, FORE_Y = CEIL - 10;
let FORE: HTMLCanvasElement | null = null;
/** A low console under the window: `w` wide, a label along its front. */
function console_(x: number, w: number, label: string): void {
  r(x - w / 2, 440, w, 30, SB.CONSOLE); r(x - w / 2, 440, w, 2, SB.CONSOLE_HI); r(x + w / 2 - 2, 440, 2, 30, SB.CONSOLE_DK); r(x - w / 2, 468, w, 2, SB.CONSOLE_DK);
  txt(label, x - tw(label) / 2, 460, K.WHITE); rivets(x - w / 2 + 2, x + w / 2 - 2, 442, 6);
}

// ---------------------------------------------------------------- live ----------------------------------------------------------------
function drawBack(a: number): void {
  const S = SUBW;
  // the window
  if (S.sea) drawSea(S.sea); else if (S.pen) drawPen(S.pen);
  drawGlass(S.glass);
  if (FORE) PX.ctx.drawImage(FORE, FORE_X, FORE_Y);
  // the sea's light falling into the cabin, and (shallow) the surface's ripples on the deck
  G(WIN.x0, FL, WIN.x1 - WIN.x0, 110, S.lightCol, 0.05 + 0.12 * S.light);
  if (S.light > 0.5 && S.sea && S.sea.y < 60) alpha(0.12 * S.light, () => lit(() => { for (let k = 0; k < 18; k++) { const x = 170 + ((k * 97 + Math.round(a * 12)) % 660), y = 490 + ((k * 37) % 90); r(x + Math.round(Math.sin(a * 2 + k) * 3), y, 8, 1, [200, 245, 245]); } }));
  // THE DIVE BOARD
  lit(() => { S.board.forEach((s, i) => { if (s) txt(s.slice(0, 12), 500 - tw(s.slice(0, 12)) / 2, 338 + i * 8, i === 3 ? [255, 214, 90] : SB.AMBER); }); });
  G(476, 336, 48, 36, SB.AMBER, 0.08);
  // the caged lamps, swinging as the sub tilts (dark in a LIGHTS OUT: the red emergency lamp strobes instead)
  const sw = clamp(S.tilt / 25, -1, 1) * 3 + Math.sin(a * 1.3) * 0.6;
  for (const lx of [236, 402, 598, 776]) {
    if (!seen(lx - 10, lx + 10)) continue;
    const bx = Math.round(lx + sw), by = CEIL + 6; line(lx, CEIL - 6, bx, by - 3, [60, 60, 66]);
    r(bx - 4, by - 3, 9, 8, [60, 60, 66]); for (let k = 0; k < 3; k++) r(bx - 4 + k * 4, by - 3, 1, 8, [90, 90, 96]);
    if (!S.lightsOut) { lit(() => r(bx - 2, by, 5, 4, [255, 214, 150])); Gd(bx, by + 2, 12, SB.LAMP, 0.3); Gd(bx, by + 40, 34, SB.LAMP, 0.035); }
  }
  if (S.lightsOut) { const on = Math.floor(a * 2.5) % 2 === 0; lit(() => r(496, CEIL + 4, 8, 5, on ? [255, 40, 40] : [120, 20, 20])); if (on) { Gd(500, CEIL + 8, 40, [255, 30, 30], 0.5); G(0, CEIL, W, H - CEIL, [255, 20, 20], 0.12); } }
  // the engine: pistons pumping (faster with the speed), the flywheel, the gauge, a puff from the exhaust; it coughs with a jelly in its intake
  if (seen(60, 160)) {
    const rate = 3 + S.speed * 0.25, cough = S.jelly && Math.floor(a * 2) % 3 === 0;
    [86, 118].forEach((cx, i) => { const up = Math.round((Math.sin(a * rate + i * Math.PI) * 0.5 + 0.5) * 8); r(cx - 3, 390 - up, 6, 10, SB.PIPE_HI); r(cx - 4, 388 - up, 8, 3, SB.PIPE_DK); });
    const an = a * rate; for (let k = 0; k < 3; k++) line(100, 446, Math.round(100 + Math.cos(an + k * 2.1) * 6), Math.round(446 + Math.sin(an + k * 2.1) * 6), [40, 40, 44]);
    line(100, 446, Math.round(100 + Math.cos(-2.4 + clamp(S.speed / 40, 0, 1) * 2) * 6), Math.round(446 + Math.sin(-2.4 + clamp(S.speed / 40, 0, 1) * 2) * 6), [220, 60, 60]);
    for (let k = 0; k < (cough ? 5 : 2); k++) { const q = (a * 0.8 + k * 0.4) % 1; alpha((cough ? 0.6 : 0.25) * (1 - q), () => disc(73 + Math.round(Math.sin(k + a) * 2), Math.round(CEIL + 30 - q * 30), Math.round(2 + q * 4), cough ? [60, 60, 60] : [200, 200, 206])); }
    const lv = S.fixing[TR.JELLY] ? Math.round(Math.sin(a * 6) * 3) : 0; r(SUBR.intake - 2, 424 + lv, 4, 8, SB.WHEEL); r(SUBR.intake - 4, 422 + lv, 8, 3, SB.WHEEL_HI);
  }
  // the galley: the mug sliding as the sub tilts, the kettle's steam
  if (seen(160, 230)) {
    const mx = Math.round(200 + clamp(S.tilt / 25, -1, 1) * 10); r(mx, 442, 6, 6, [90, 170, 220]); r(mx + 6, 443, 2, 3, [90, 170, 220]); r(mx, 442, 6, 1, [150, 210, 240]);
    if (a < S.kettle) for (let k = 0; k < 4; k++) { const q = (a * 1.2 + k / 4) % 1; alpha(0.6 * (1 - q), () => disc(Math.round(193 + q * 6), Math.round(430 - q * 22), Math.round(1 + q * 3), [240, 244, 246])); }
  }
  // the fuse box's lever (down and sparking in a LIGHTS OUT)
  if (seen(296, 324)) { const dn = S.lightsOut; r(SUBR.fuse - 2, dn ? 398 : 392, 4, 12, [40, 40, 44]); r(SUBR.fuse - 4, dn ? 408 : 390, 8, 3, [200, 50, 50]); if (dn && (a * 7) % 1 < 0.3) lit(() => { line(SUBR.fuse + 6, 390, SUBR.fuse + 10, 384, [255, 250, 180]); line(SUBR.fuse - 7, 396, SUBR.fuse - 11, 392, [255, 250, 180]); }); }
  // the claw console: the joystick, and its screen (the claw cam, small)
  if (seen(340, 392)) {
    const jt = Math.round(clamp(S.claw.cx / 30, -1, 1) * 3); line(SUBR.claw - 6, 452, SUBR.claw - 6 + jt, 444, [40, 40, 44]); disc(SUBR.claw - 6 + jt, 443, 2, [200, 50, 50]);
    r(SUBR.claw - 14, 420, 28, 18, SB.CONSOLE_DK); lit(() => { r(SUBR.claw - 12, 422, 24, 14, S.lightsOut ? [10, 10, 10] : [20, 44, 36]); if (!S.lightsOut && S.claw.busy) { const tx = SUBR.claw + Math.round(S.claw.cx / 3), ty = 423 + Math.round(S.claw.cd / 4); r(tx, 422, 1, ty - 422, [150, 200, 170]); r(tx - 2, ty, 5, 2, [180, 255, 200]); r(SUBR.claw - 12, 434, 24, 2, [60, 90, 70]); } });
  }
  // the sonar: its sweep, and the blips from the last ping
  if (seen(410, 450)) {
    const cx = SUBR.sonar, cy = 426, since = a - S.sonar.t;
    if (!S.lightsOut) lit(() => {
      ring(cx, cy, 6, 6, [20, 70, 40]); r(cx, cy, 1, 1, SB.GREEN);
      const an = a * 2.4; line(cx, cy, Math.round(cx + Math.cos(an) * 10), Math.round(cy + Math.sin(an) * 10), [60, 200, 110]);
      if (since < 1.2) ring(cx, cy, Math.round(since / 1.2 * 11), Math.round(since / 1.2 * 11), [140, 255, 180]);
      if (since < 5) for (const b of S.sonar.blips) alpha(1 - since / 5, () => r(Math.round(cx + Math.cos(b.an) * b.d * 10), Math.round(cy + Math.sin(b.an) * b.d * 10), 1, 1, b.c));
    });
    if (!S.lightsOut) Gd(cx, cy, 12, SB.GREEN, 0.18);
  }
  // the camera's ready lamp, the floodlight lever and its ON / OFF lamps
  if (seen(560, 660)) {
    lit(() => r(SUBR.camera + 8, 426, 2, 2, [255, 80, 80]));
    const on = S.lamps; line(SUBR.lights, 450, SUBR.lights + (on ? -6 : 6), 438, [40, 40, 44]); disc(SUBR.lights + (on ? -6 : 6), 437, 3, [220, 220, 226]);
    lit(() => { r(SUBR.lights - 9, 436, 4, 3, on ? [90, 255, 140] : [30, 70, 40]); r(SUBR.lights + 6, 436, 4, 3, on ? [90, 40, 40] : [255, 60, 60]); });
  }
  // the periscope: down, with its handles out, while someone looks through it
  if (seen(676, 704)) { const dn = Math.round(S.periscope * 40); r(SUBR.periscope - 4, CEIL + 28, 8, 50 + dn, SB.PIPE); r(SUBR.periscope - 4, CEIL + 28, 2, 50 + dn, SB.PIPE_HI); const hy = CEIL + 70 + dn; r(SUBR.periscope - 7, hy, 14, 8, [60, 62, 68]); r(SUBR.periscope - 11, hy + 3, 4, 2, [40, 40, 44]); r(SUBR.periscope + 7, hy + 3, 4, 2, [40, 40, 44]); }
  // THE VALVE WHEEL (spinning while someone turns it), and the leak spraying from the pipe beside it
  if (seen(740, 780)) {
    const spin = S.fixing[TR.LEAK] ? a * 8 : 0; disc(SUBR.valve, 444, 9, SB.WHEEL_DK); ring(SUBR.valve, 444, 8, 8, SB.WHEEL); ring(SUBR.valve, 444, 7, 7, SB.WHEEL_HI);
    for (let k = 0; k < 4; k++) line(SUBR.valve, 444, Math.round(SUBR.valve + Math.cos(spin + k * Math.PI / 2) * 7), Math.round(444 + Math.sin(spin + k * Math.PI / 2) * 7), SB.WHEEL);
    disc(SUBR.valve, 444, 2, [60, 30, 30]);
    if (S.leak > 0.05) { lit(() => { for (let k = 0; k < 14; k++) { const q = (a * 2.4 + k / 14) % 1; r(Math.round(SUBR.valve + 4 + q * 40 * (k % 2 ? 1 : 0.7)), Math.round(CEIL + 10 + q * q * 90 + (k % 3) * 2), 2, 2, [160, 220, 255]); } }); }
  }
  // ZAP's cover (lifted during a squid), and the fix spots' red markers while their trouble's on
  if (seen(810, 850)) { const up = S.zap > 0.5; if (up) lit(() => disc(SUBR.zap, 448, 6, [255, 50, 50])); else disc(SUBR.zap, 448, 6, [180, 30, 30]); alpha(0.45, () => r(SUBR.zap - 9, up ? 430 : 440, 18, up ? 4 : 16, [200, 230, 240])); if (up) Gd(SUBR.zap, 448, 10, [255, 60, 60], 0.35); }
  ([[TR.JELLY, SUBR.intake, 416], [TR.LIGHTS, SUBR.fuse, 376], [TR.LEAK, SUBR.valve, 426], [TR.VISITOR, SUBR.zap, 424]] as [number, number, number][]).forEach(([k, x, y]) => {
    if (!S.fixing[k]) return; const yy = y - Math.round(Math.abs(Math.sin(a * 4)) * 4); lit(() => { r(x - 3, yy, 7, 3, [255, 60, 60]); for (let j = 0; j < 4; j++) r(x - 3 + j, yy + 3 + j, 7 - j * 2, 1, [255, 60, 60]); }); Gd(x, yy + 3, 8, [255, 60, 60], 0.4);
  });
  // the helm: the wheel turning, the depth gauge's needle, the NAV screen's dot, the telegraph, the AUTOPILOT lamp, the forward porthole
  if (seen(860, W)) {
    const wa = S.wheel; disc(SUBR.helm, 444, 15, [110, 70, 40]); disc(SUBR.helm, 444, 12, [70, 44, 26]); disc(SUBR.helm, 444, 4, SB.BRASS);
    for (let k = 0; k < 8; k++) { const an = wa + k * Math.PI / 4; line(SUBR.helm, 444, Math.round(SUBR.helm + Math.cos(an) * 16), Math.round(444 + Math.sin(an) * 16), [150, 100, 60]); r(Math.round(SUBR.helm + Math.cos(an) * 18) - 1, Math.round(444 + Math.sin(an) * 18) - 1, 3, 3, [150, 100, 60]); }
    ring(SUBR.helm, 444, 14, 14, [170, 116, 70]);
    const dn = Math.PI * (0.75 + clamp(S.depth / 1200, 0, 1) * 1.5); line(880, 352, Math.round(880 + Math.cos(dn) * 8), Math.round(352 + Math.sin(dn) * 8), [200, 40, 40]);
    lit(() => { if (!S.lightsOut) { for (let x = 0; x < 48; x += 2) r(900 + x, 344 + Math.round(clamp(navFloor(x / 48), 0, 1) * 19), 2, 1, [40, 110, 70]); r(900 + Math.round(S.nav.u * 47), 344 + Math.round(S.nav.v * 19), 2, 2, [255, 214, 90]); } });
    const tel = clamp(S.speed / 40, -1, 1); line(948, 430, Math.round(948 + Math.sin(tel * 1.2) * 8), Math.round(430 - Math.cos(tel * 1.2) * 8), [40, 40, 50]);
    lit(() => { r(904, 406, 12, 4, S.auto ? [90, 255, 140] : [40, 70, 50]); txt('AUTO', 902, 399, S.auto ? [150, 255, 180] : [70, 90, 80]); });
    const pc = S.lightCol; lit(() => { disc(968, 350, 9, M(pc, [0, 0, 0], 1 - S.light * 0.8)); if (S.lamps && S.depth > 150) disc(968, 352, 4, M(pc, [220, 240, 250], 0.5)); r(962, 344, 3, 2, [220, 240, 250]); });
    lit(() => { r(118, 350, 12, 7, [30, 30, 36]); txt(String(S.squidDays), 124 - tw(String(S.squidDays)) / 2, 351, [255, 90, 90]); });
  }
  // the drip from the ceiling into the bucket
  if (seen(250, 275)) { const q = (a * 0.7) % 1; lit(() => r(262, Math.round(CEIL + 2 + q * 150), 1, 2, [160, 210, 240])); }
}
/** The NAV screen's outline of the sea's floor (u 0..1 along it), 0..1 down. */
function navFloor(u: number): number { return clamp(SEAFLOOR[Math.min(SEAFLOOR.length - 1, Math.floor(u * SEAFLOOR.length))] / 1200, 0, 1); }
const SEAFLOOR = Array.from({ length: 24 }, (_, i) => [42, 50, 58, 70, 88, 106, 136, 140, 144, 160, 190, 212, 520, 820, 850, 1100, 1170, 1175, 1178, 1180, 1180, 1180, 1100, 400][i]);

// ---------------------------------------------------------------- props ----------------------------------------------------------------
/** THE TREASURE BIN: a wooden crate with a glass lid; this dive's finds sit in it. */
const bin: Prop = { y: 548, draw(a: number) {
  if (!seen(SUBR.bin - 26, SUBR.bin + 26)) return;
  const x = SUBR.bin, y = 548;
  r(x - 22, y - 22, 44, 22, [140, 100, 60]); r(x - 22, y - 22, 44, 2, [180, 136, 90]); r(x + 19, y - 22, 3, 22, [100, 70, 40]); for (let k = 0; k < 3; k++) r(x - 20, y - 16 + k * 6, 40, 1, [110, 78, 46]);
  txt('TREASURE', x - tw('TREASURE') / 2, y - 8, [250, 230, 180]);
  SUBW.bin.slice(0, 6).forEach((k, i) => drawFind(k, x - 16 + i * 7, y - 22, a));
  alpha(0.35, () => r(x - 21, y - 30, 42, 8, [200, 230, 240])); r(x - 22, y - 31, 44, 1, [220, 240, 250]); r(x - 22, y - 23, 44, 1, [120, 90, 60]);
} };
/** THE CHART TABLE: a sea chart, a brass lamp, dividers, and THE SEA LIFE LOG. */
const chart: Prop = { y: 548, draw(a: number) {
  if (!seen(SUBR.chart - 30, SUBR.chart + 30)) return;
  const x = SUBR.chart, y = 548;
  r(x - 26, y - 18, 52, 4, [110, 80, 50]); r(x - 26, y - 18, 52, 1, [150, 110, 70]); r(x - 24, y - 14, 3, 14, [90, 64, 40]); r(x + 21, y - 14, 3, 14, [90, 64, 40]);
  r(x - 22, y - 21, 26, 4, [230, 220, 190]); for (let k = 0; k < 5; k++) r(x - 20 + k * 5, y - 20 + (k % 2), 3, 1, [100, 150, 190]); // the chart
  r(x + 6, y - 24, 14, 6, [40, 90, 60]); r(x + 6, y - 24, 14, 1, [70, 130, 90]); txt('LOG', x + 7, y - 23, [255, 214, 90]); // THE SEA LIFE LOG
  r(x - 24, y - 30, 2, 12, SB.BRASS_DK); r(x - 27, y - 32, 8, 3, SB.BRASS); lit(() => r(x - 26, y - 29, 6, 1, [255, 220, 160])); Gd(x - 23, y - 28, 10, SB.LAMP, 0.3); // the lamp
  line(x - 4, y - 18, x - 1, y - 23, [180, 180, 190]); line(x - 1, y - 23, x + 2, y - 18, [180, 180, 190]); // dividers
  void a;
} };
/** A padded bench for passengers. */
const bench: Prop = { y: 540, draw() {
  if (!seen(SUBR.bench - 40, SUBR.bench + 40)) return;
  const x = SUBR.bench; r(x - 36, 532, 72, 6, [60, 100, 130]); r(x - 36, 532, 72, 1, [100, 140, 170]); r(x - 36, 538, 72, 3, [70, 60, 50]); for (const lx of [x - 32, x + 28]) r(lx, 541, 4, 5, [50, 50, 56]);
} };
/** The bucket under the drip. */
const bucket: Prop = { y: 490, draw() { if (!seen(250, 275)) return; r(255, 480, 14, 10, [150, 156, 166]); r(255, 480, 14, 1, [200, 206, 216]); oval(262, 481, 6, 1, [80, 130, 170]); } };

/** The LEAK's water on the deck: a strip per band of depth, so it's round everyone's ankles (the chem lab's flood, in blue). */
const STRIP_Y0 = 482, STRIP_H = 8, STRIPS = 11;
function leakWater(a: number): Prop[] {
  const lv = Math.round(SUBW.leak * 6); if (lv < 1) return [];
  const vx0 = Math.max(0, SUBW.view.x0 - 16), vx1 = Math.min(W, SUBW.view.x1 + 16), out: Prop[] = [];
  for (let s = 0; s < STRIPS; s++) {
    const y = STRIP_Y0 + s * STRIP_H;
    out.push({ y: y + STRIP_H - 1, draw() {
      alpha(0.55, () => r(vx0, y - lv, vx1 - vx0, lv + STRIP_H - 2, [70, 150, 190]));
      if (s % 2 === 0) alpha(0.55, () => lit(() => { for (let x = vx0 - (vx0 % 6); x < vx1; x += 6) if ((x + s * 12) % 18 < 12) r(x, y - lv + Math.round(Math.sin(x * 0.12 + s + a * 3)), 5, 1, [200, 236, 250]); }));
    } });
  }
  return out;
}

// ---------------------------------------------------------------- spots (append only!) and talkers ----------------------------------------------------------------
const station = (kind: Spot['kind'], x: number, label: string, area: [number, number, number, number], n?: number): Spot => ({ kind, x, y: 500, sx: x, sy: 504, lift: 0, label, area: { x0: area[0], y0: area[1], x1: area[2], y1: area[3] }, ...(n !== undefined ? { n } : {}) });
const seat = (x: number): Spot => ({ kind: 'sit', x, y: 541, sx: x, sy: 552, lift: 8, label: 'SIT', area: { x0: x - 16, y0: 524, x1: x + 16, y1: 540 } });
export const SUB_SPOTS: Spot[] = [
  station('helm', SUBR.helm, 'TAKE THE HELM', [890, 426, 930, 470]), // 0
  station('subcam', SUBR.camera, 'SNAP', [562, 410, 598, 470]), // 1
  station('lights', SUBR.lights, 'LIGHTS', [624, 430, 648, 470]), // 2
  station('sonar', SUBR.sonar, 'PING', [410, 412, 450, 470]), // 3
  station('subclaw', SUBR.claw, 'CLAW', [344, 418, 388, 470]), // 4
  station('periscope', SUBR.periscope, 'UP PERISCOPE', [682, 356, 698, 470]), // 5
  station('subfix', SUBR.intake, 'CHECK', [132, 420, 148, 470], TR.JELLY), // 6
  station('subfix', SUBR.fuse, 'CHECK', [300, 382, 320, 420], TR.LIGHTS), // 7
  station('subfix', SUBR.valve, 'CHECK', [750, 432, 770, 456], TR.LEAK), // 8
  station('subfix', SUBR.zap, 'CHECK', [814, 432, 846, 470], TR.VISITOR), // 9
  station('tea', SUBR.galley, 'MAKE TEA', [172, 428, 222, 470]), // 10
  { kind: 'bin', x: SUBR.bin, y: 522, sx: SUBR.bin, sy: 522, lift: 0, label: 'LOOK', area: { x0: SUBR.bin - 22, y0: 522, x1: SUBR.bin + 22, y1: 548 } }, // 11
  { kind: 'sealog', x: SUBR.chart, y: 522, sx: SUBR.chart, sy: 522, lift: 0, label: 'READ', area: { x0: SUBR.chart - 26, y0: 522, x1: SUBR.chart + 26, y1: 548 } }, // 12
  seat(SUBR.bench - 16), seat(SUBR.bench + 18), // 13-14
  station('escape', SUBR.escape, 'ESCAPE', [22, 300, 58, 470]), // 15
];
export const SUBSPOT = { HELM: 0, CAM: 1, LIGHTS: 2, SONAR: 3, CLAW: 4, SCOPE: 5, TEA: 10, BIN: 11, LOG: 12, ESCAPE: 15 };
const T_ = (id: string, name: string, verb: string, x: number, y: number, sx: number, sy: number, lines: string[]): Talker => ({ id: 'sub-' + id, name, verb, x, y, sx, sy, lines });
const TALK: Talker[] = [
  T_('photo', 'THE PHOTO', 'LOOK', 969, 386, 930, 546, ['SARDINE 1\'s launch day. the Cap\'n is cutting the ribbon. the bottle bounced off', 'someone has drawn a little moustache on the sub. it suits her']),
  T_('squid', 'THE SIGN', 'READ', 124, 346, 104, 530, ['DAYS SINCE THE LAST SQUID: it\'s always 0. it has never not been 0', 'somebody keeps a tally on the back. it\'s a lot of tallies']),
  T_('dart', 'THE DARTBOARD', 'LOOK', 988, 414, 976, 556, ['one dart. in the wall. next to the board', 'the Cap\'n says it counts']),
  T_('sock', 'A SOCK', 'LOOK', 232, 336, 232, 536, ['a sock, drying on a pipe. just the one', 'it\'s been drying since the sea trials']),
  T_('jar', 'THE JAR', 'LOOK', 114, 370, 172, 550, ['a bath-toy submarine in a jar: SARDINE 2 (PROTOTYPE)', 'it leaks. that\'s why it\'s in a jar']),
  T_('barometer', 'THE BAROMETER', 'READ', 872, 404, 866, 532, ['it says CHANGE', 'it always says CHANGE. it\'s never been wrong']),
  T_('card', 'THE CARD', 'READ', 76, 426, 60, 552, ['IN CASE OF SQUID, DO NOT PANIC. then, in smaller writing: take its picture. then ZAP it', 'the card is laminated. it has been through things']),
  T_('porthole', 'THE PORTHOLE', 'LOOK', 968, 350, 948, 540, ['the little window at the front. the sea, going by', 'you can see where you\'re going. roughly']),
];

/** The ladder up to the hatch: open onto the pen while it's boarding (world/aquarium.ts has the gangway down to it). */
const hatch: Door = { trigger: { x0: 488, y0: 482, x1: 512, y1: 490 }, to: 'aquarium', arrive: PEN_ARRIVE, label: 'THE PEN', area: { x0: 486, y0: 398, x1: 514, y1: 482 }, // (its hint floats just under THE DIVE BOARD)
  route: () => (hatchOpen() ? { to: 'aquarium', arrive: PEN_ARRIVE, label: 'THE PEN' } : null) };

export function makeSub(): Room {
  const room: Room = {
    id: 'sub', title: 'SARDINE 1', sub: 'THE CITY AQUARIUM\'S SUBMARINE',
    w: W, h: H,
    floor: { x0: 14, y0: 482, x1: W - 14, y1: 560 },
    blockers: [
      { x0: 60, y0: 470, x1: 150, y1: 494 }, // the engine
      { x0: 250, y0: 480, x1: 274, y1: 492 }, // the bucket
      { x0: SUBR.bin - 22, y0: 536, x1: SUBR.bin + 22, y1: 550 }, { x0: SUBR.chart - 26, y0: 538, x1: SUBR.chart + 26, y1: 550 }, // the bin, the chart table
      { x0: SUBR.bench - 36, y0: 532, x1: SUBR.bench + 36, y1: 542 }, // the bench
    ],
    doors: [hatch],
    spots: SUB_SPOTS, inUse: new Map(),
    spawn: SUB_ARRIVE,
    frameTop: WIN.y0 - 8,
    dim: 0.12,
    dimNow: () => (SUBW.lightsOut ? 0.72 : 0.1 + 0.5 * clamp(SUBW.depth / 500, 0, 1)),
    fillTop: 'rgb(30,32,36)', fillLow: 'rgb(60,64,70)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [bin, chart, bench, bucket],
    extras: leakWater,
    shake: () => SUBW.shake,
    onState(s) { if (s.k === 'dive') SUBW.st = mergeDive(SUBW.st, s.v); },
    talkers: TALK,
  };
  return room;
}
