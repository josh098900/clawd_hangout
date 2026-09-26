// THE REACTOR: one big room, off the Science Wing. The CONTROL ROOM on the left (dark teal consoles: SCRAM under
// its flip-up cover, the RODS lever, the COOLANT pumps, the TURBINE valve wheel; START SHIFT on a clipboard; THE BIG
// BOARD over them all: HEAT, POWER vs CITY DEMAND, GRID %, the faults), a thick GLASS WALL down the middle with an
// airlock doorway (past it, everyone's in a hazmat suit), and the REACTOR HALL: the pool glowing Cherenkov blue with
// the core at the bottom and the control rods hanging from a yellow gantry crane, pipes and gauges, the TURBINE
// spinning with the power, and the places faults break out (a pipe joint, the turbine valve, a vent, a breaker box,
// the walkway). The game itself is game/reactor.ts; features/reactor.ts plays it; REACT is what this draws from.

import { K, NK, RX, type RGB } from '../engine/palette';
import { mk, r, line, disc, ring, oval, txt, tw, lit, alpha, G, Gd, Gsoft, M, shade, bake } from '../engine/pixel';
import { h1, clamp } from '../engine/math';
import { mmss } from '../engine/format';
import { dayness, daynessAt } from './plaza';
import { hazard, trefoil } from './wing';
import { FAULT, FAULT_NAMES, RST, SHIFT_S, advance, broken, demand, faults, grid, live, powerOf, scramLeft, surges, type ReactorState } from '../game/reactor';
import type { StateMsg } from '../net/transport';
import type { Prop, Room, Spot, Talker } from './room';

const W = 1500, H = 680, CEIL = 318, FL = 470;
/** Where things are: the glass wall (x), the stations' consoles, the pool, the turbine, the fault spots. */
export const RXL = { glass: 670, door: 60, shift: 130, st: [210, 310, 410, 510], pool: { x0: 780, x1: 1220, y0: 352, y1: FL }, turb: 1420, board: { x0: 166, y0: 326, x1: 606, y1: 400 } };
/** Where each kind of fault happens (LEAK, VALVE, PIGEON, BREAKER, GOO): the thing's picture (x, y), and where you stand to fix it. */
export const FAULT_AT: { x: number; y: number; sx: number; sy: number }[] = [
  { x: 742, y: 424, sx: 742, sy: 492 }, { x: 1338, y: 436, sx: 1338, sy: 492 }, { x: 1300, y: 366, sx: 1300, sy: 492 }, { x: 1250, y: 408, sx: 1250, sy: 492 }, { x: 1010, y: 566, sx: 1010, sy: 574 },
];
/** What this room shows: the shift (room state 'reactor'), the best shift, the last shift's result, and a trace of the last minute for the graph. */
export const REACT = {
  g: null as ReactorState | null,
  best: null as { name: string; score: number } | null,
  last: null as { grid: number; melt: boolean; at: number } | null,
  hist: [] as { p: number; d: number }[], histT0: 0, histAt: 0,
  /** When the SCRAM cover was lifted in this browser (you press again to SCRAM). */
  cover: 0,
};
const view = { src: null as ReactorState | null, snap: null as ReactorState | null };
/** The shift as it is right now (worked forward from its snapshot; cached, so it's cheap to ask every frame). */
export function reactorNow(T = Date.now()): ReactorState | null {
  const g = REACT.g; if (!g) return null;
  if (view.src !== g || !view.snap || view.snap.at > T) { view.src = g; view.snap = g; }
  view.snap = advance(view.snap, T, daynessAt);
  return view.snap;
}
/** Idling between shifts: a calm reactor, rods mostly in. */
const IDLE = { rods: 2, pumps: 2, turb: 0, heat: 28 };

function build(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    // ---- the ceiling over everything: dark, with ducts and caged lamps ----
    r(0, 0, W, CEIL, RX.CEIL); for (let x = 0; x < W; x += 50) r(x, 0, 1, CEIL - 24, RX.CEIL2);
    r(0, CEIL - 26, W, 8, RX.STEEL_DK2); for (let x = 0; x < W; x += 40) { r(x, CEIL - 26, 2, 8, RX.STEEL_DK); } // a duct
    r(0, CEIL, W, 4, RX.STEEL_DK2);
    // ===================== the CONTROL ROOM (x 0 .. 640) =====================
    for (let x = 0; x < RXL.glass - 10; x += 60) { r(x, CEIL + 4, 60, FL - CEIL - 4, (x / 60) % 2 ? RX.CTRL : RX.CTRL2); r(x, CEIL + 4, 60, 1, RX.CTRL_HI); r(x + 59, CEIL + 4, 1, FL - CEIL - 4, shade(RX.CTRL, 0.75)); for (const sy of [10, FL - CEIL - 20]) { r(x + 4, CEIL + sy, 2, 2, RX.CTRL_HI); r(x + 54, CEIL + sy, 2, 2, RX.CTRL_HI); } }
    r(0, 440, RXL.glass - 10, 30, RX.CONSOLE_DK); r(0, 440, RXL.glass - 10, 1, RX.CTRL_HI); // the wainscot under the desks
    // rubber floor with a hazard line along the desks
    for (let y = FL; y < H; y += 12) r(0, y, RXL.glass, 12, (y / 12) % 2 ? RX.RUBBER : RX.RUBBER2);
    for (let x = 0; x < RXL.glass; x += 3) r(x, FL + 2 + ((x / 3) % 2), 2, 1, [44, 50, 56]);
    hazard(0, FL, RXL.glass - 10, 4, 4);
    // the door back to the corridor
    { const x = RXL.door; r(x - 28, 358, 56, FL - 358, RX.STEEL_DK2); r(x - 24, 362, 48, FL - 362, RX.STEEL); r(x - 24, 362, 48, 2, RX.STEEL_HI); for (let y = 376; y < FL; y += 14) r(x - 22, y, 44, 1, RX.STEEL_DK); r(x - 1, 362, 2, FL - 362, RX.STEEL_DK2);
      r(x - 26, 342, 52, 12, [20, 40, 30]); txt('EXIT', x - tw('EXIT') / 2, 345, [124, 242, 156]); }
    // START SHIFT: a clipboard on a hook, and the best-shift plaque beside it
    { const x = RXL.shift; r(x - 16, 366, 32, 40, [150, 110, 70]); r(x - 14, 370, 28, 34, K.PAPER); r(x - 6, 362, 12, 6, RX.STEEL); txt('SHIFT', x - tw('SHIFT') / 2, 373, [40, 40, 60]); for (let k = 0; k < 5; k++) { r(x - 11, 380 + k * 5, 3, 3, [40, 120, 90]); r(x - 6, 381 + k * 5, 16, 1, [150, 150, 170]); }
      r(x - 22, 412, 44, 26, [30, 40, 46]); r(x - 20, 414, 40, 22, RX.SCREEN); txt('BEST', x - tw('BEST') / 2, 416, [255, 214, 90]); }
    // DAYS WITHOUT A MELTDOWN: 0 (hand-written, again)
    { const x = 558, y = 330; r(x, y, 76, 26, K.PAPER); r(x, y, 76, 5, [200, 40, 60]); txt('DAYS WITHOUT A', x + 4, y + 7, [60, 60, 70]); txt('MELTDOWN:', x + 4, y + 13, [60, 60, 70]); txt('0', x + 44, y + 17, [200, 40, 60], 1); line(x + 52, y + 21, x + 58, y + 15, [60, 60, 70]); txt('3', x + 54, y + 13, [120, 120, 130]); }
    // THE BIG BOARD's housing (its screens are drawn live)
    { const B = RXL.board; r(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0, RX.CONSOLE_DK); r(B.x0 + 2, B.y0 + 2, B.x1 - B.x0 - 4, B.y1 - B.y0 - 4, RX.CONSOLE); r(B.x0 + 2, B.y0 + 2, B.x1 - B.x0 - 4, 1, RX.CONSOLE_HI);
      r(172, 330, 26, 66, RX.SCREEN); r(204, 330, 250, 66, RX.SCREEN); r(460, 330, 140, 66, RX.SCREEN);
      for (const [bx, by] of [[B.x0 + 2, B.y0 + 2], [B.x1 - 6, B.y0 + 2], [B.x0 + 2, B.y1 - 6], [B.x1 - 6, B.y1 - 6]]) r(bx, by, 4, 4, RX.STEEL_DK2);
      for (const hx of [230, 540]) r(hx, CEIL + 4, 3, B.y0 - CEIL - 4, RX.STEEL_DK2); } // hung from the ceiling on two rods
    // the four consoles: chunky 70s desks (their knobs, lamps and needles are drawn live on top)
    RXL.st.forEach((cx, i) => {
      r(cx - 36, 404, 72, 66, RX.CONSOLE_DK); r(cx - 34, 406, 68, 30, RX.CONSOLE); r(cx - 34, 406, 68, 2, RX.CONSOLE_HI); // the sloped top
      r(cx - 36, 436, 72, 34, RX.CONSOLE_DK); r(cx - 34, 440, 68, 26, shade(RX.CONSOLE, 0.85)); for (let k = 0; k < 3; k++) r(cx - 30 + k * 22, 446, 16, 14, shade(RX.CONSOLE, 0.7)); // panels on the front
      r(cx - 24, 398, 48, 8, [30, 36, 40]); txt(['SCRAM', 'RODS', 'COOLANT', 'TURBINE'][i], cx - tw(['SCRAM', 'RODS', 'COOLANT', 'TURBINE'][i]) / 2, 400, [200, 210, 214]);
      for (let k = 0; k < 6; k++) r(cx - 30 + k * 10, 430, 4, 2, [60, 70, 76]); // a row of little lamp sockets
    });
    { const cx = RXL.st[RST.SCRAM]; hazard(cx - 34, 406, 68, 6, 3); r(cx - 30, 452, 22, 12, [255, 240, 150]); txt('NOT', cx - 29, 453, [200, 40, 60]); txt('THIS1', cx - 29, 459, [60, 60, 70]); } // DON'T PRESS THE RED ONE (unless)
    { const cx = RXL.st[RST.RODS]; oval(cx + 22, 409, 5, 2, [90, 70, 50]); } // a coffee ring
    { const cx = RXL.st[RST.COOL]; for (let k = 0; k < 3; k++) { r(cx - 26 + k * 20, 414, 12, 12, [30, 36, 40]); } }
    // a rubber plant by the glass, a rack of binders, a wall clock
    { const x = 616; r(x - 8, 440, 16, 30, [150, 90, 60]); r(x - 8, 440, 16, 3, [180, 120, 80]); for (const [lx, ly, lw] of [[-14, 404, 10], [2, 396, 12], [-10, 380, 9], [4, 414, 10], [-6, 422, 8]] as [number, number, number][]) { oval(x + lx + lw / 2, ly + 4, lw / 2, 4, [40, 130, 80]); r(x + lx + 2, ly + 3, lw - 4, 1, [80, 170, 110]); } line(x, 440, x - 4, 390, [60, 100, 60]); }
    for (let k = 0; k < 7; k++) r(560 + k * 7, 404 - (k % 3) * 2, 6, 30 + (k % 3) * 2, [[200, 60, 60], [60, 120, 200], [240, 200, 60], [60, 160, 110], [140, 90, 200], [220, 140, 60], [80, 180, 200]][k] as RGB); r(556, 434, 54, 4, RX.STEEL_DK); // binders
    // ===================== the REACTOR HALL (x 700 .. 1500) =====================
    for (let x = RXL.glass + 12; x < W; x += 50) { r(x, CEIL + 4, 50, FL - CEIL - 4, (x / 50) % 2 ? [74, 84, 96] : [80, 90, 102]); r(x, CEIL + 4, 50, 1, [104, 114, 126]); r(x + 49, CEIL + 4, 1, FL - CEIL - 4, [60, 68, 80]); }
    for (let x = RXL.glass + 30; x < W; x += 150) { r(x, CEIL + 4, 8, FL - CEIL - 4, RX.STEEL_DK2); r(x, CEIL + 4, 2, FL - CEIL - 4, RX.STEEL_DK); } // steel beams
    // the walkway: steel grating, a yellow edge along the back
    for (let y = FL; y < H; y += 6) for (let x = RXL.glass + 6; x < W; x += 6) { r(x, y, 6, 6, RX.GRATE); r(x, y, 5, 1, RX.GRATE_HI); r(x, y, 1, 5, RX.GRATE_HI); }
    r(RXL.glass + 6, FL, W - RXL.glass - 6, 4, RX.LINE); r(RXL.glass + 6, FL + 4, W - RXL.glass - 6, 1, RX.LINE_DK);
    // pipes: two fat insulated risers either side of the pool, a run along the wall to the turbine, valves and gauges
    const pipeV = (x: number, y0: number, y1: number, w = 16) => { r(x, y0, w, y1 - y0, RX.PIPE); r(x, y0, 3, y1 - y0, RX.PIPE_HI); r(x + w - 3, y0, 3, y1 - y0, RX.PIPE_DK); for (let y = y0 + 20; y < y1; y += 40) r(x - 1, y, w + 2, 4, RX.PIPE_BAND); };
    const pipeH = (y: number, x0: number, x1: number, h = 12) => { r(x0, y, x1 - x0, h, RX.PIPE); r(x0, y, x1 - x0, 2, RX.PIPE_HI); r(x0, y + h - 2, x1 - x0, 2, RX.PIPE_DK); for (let x = x0 + 24; x < x1; x += 48) r(x, y - 1, 4, h + 2, RX.PIPE_BAND); };
    pipeV(724, CEIL + 4, FL); pipeV(750, CEIL + 20, FL, 12); pipeV(1234, CEIL + 4, FL - 20, 14);
    pipeH(FL - 30, 1234, 1370); pipeH(CEIL + 10, 700, 1500, 10);
    for (const [vx, vy] of [[756, 384], [1296, FL - 34]] as [number, number][]) { ring(vx, vy, 7, 7, [180, 40, 50]); ring(vx, vy, 6, 6, [200, 50, 60]); r(vx - 7, vy, 15, 1, [180, 40, 50]); r(vx, vy - 7, 1, 15, [180, 40, 50]); disc(vx, vy, 2, [120, 30, 40]); }
    for (const [gx, gy] of [[736, 362], [1266, 440]] as [number, number][]) { disc(gx, gy, 8, RX.STEEL_DK2); disc(gx, gy, 7, [236, 236, 230]); for (let k = 0; k < 8; k++) { const an = Math.PI * (0.75 + k * 0.19); r(Math.round(gx + Math.cos(an) * 5), Math.round(gy + Math.sin(an) * 5), 1, 1, k > 5 ? [200, 40, 50] : [60, 60, 70]); } }
    // THE POOL: a glass-fronted tank in the wall (its water, glow and rods are drawn live)
    { const P = RXL.pool; r(P.x0 - 10, P.y0 - 14, P.x1 - P.x0 + 20, P.y1 - P.y0 + 14, RX.STEEL_DK2); r(P.x0 - 6, P.y0 - 10, P.x1 - P.x0 + 12, 6, RX.STEEL); r(P.x0 - 6, P.y0 - 10, P.x1 - P.x0 + 12, 1, RX.STEEL_HI);
      for (const x of [P.x0 - 8, P.x1 + 2]) { r(x, P.y0 - 4, 6, P.y1 - P.y0 + 4, RX.STEEL); r(x, P.y0 - 4, 1, P.y1 - P.y0 + 4, RX.STEEL_HI); for (let y = P.y0 + 8; y < P.y1; y += 24) r(x + 2, y, 2, 2, RX.STEEL_DK2); } }
    // the gantry crane that holds the rods: a yellow beam on two legs, a trolley in the middle
    { const cy = CEIL + 22; r(760, cy, 480, 8, RX.CRANE); r(760, cy, 480, 2, [255, 236, 150]); r(760, cy + 7, 480, 1, RX.CRANE_DK); for (let x = 764; x < 1236; x += 14) line(x, cy + 2, x + 6, cy + 6, RX.CRANE_DK);
      for (const lx of [766, 1226]) { r(lx, cy + 8, 6, FL - cy - 8, RX.CRANE); r(lx + 4, cy + 8, 2, FL - cy - 8, RX.CRANE_DK); r(lx - 2, FL - 4, 10, 4, RX.CRANE_DK); }
      r(964, cy + 8, 72, 10, RX.STEEL_DK2); r(966, cy + 9, 68, 8, [240, 200, 60]); txt('RODS', 1000 - tw('RODS') / 2, cy + 11, RX.HAZ_DK); }
    // the breaker box, the vent (the pigeon's favourite), the turbine's plinth, the high window, the rubber duck on a pipe
    { const x = FAULT_AT[FAULT.BREAKER].x; r(x - 12, 390, 24, 34, RX.STEEL_DK2); r(x - 10, 392, 20, 30, [150, 156, 164]); r(x - 10, 392, 20, 2, [190, 196, 204]); trefoil(x, 403, 5, [60, 60, 70]); txt('HV', x - 3, 411, [200, 40, 60]); line(x + 12, 424, x + 12, FL - 32, [40, 40, 44]); }
    { const x = FAULT_AT[FAULT.PIGEON].x, y = FAULT_AT[FAULT.PIGEON].y; r(x - 20, y - 10, 40, 22, RX.STEEL_DK2); for (let k = 0; k < 5; k++) r(x - 18, y - 8 + k * 4, 36, 2, RX.GRATE_HI); txt('VENT', x - tw('VENT') / 2, y + 14, [150, 160, 170]); }
    { const x = RXL.turb; r(x - 70, 440, 140, 30, RX.STEEL_DK2); r(x - 68, 442, 136, 4, RX.STEEL); hazard(x - 68, 462, 136, 6, 4); }
    { const x = 1432; r(x - 40, 334, 80, 42, RX.STEEL_DK2); r(x - 36, 338, 72, 34, [20, 30, 60]); r(x - 1, 338, 2, 34, RX.STEEL_DK2); }
    { const x = 1180, y = CEIL + 10; r(x + 2, y - 5, 7, 5, NK.DUCK); r(x + 7, y - 7, 4, 4, NK.DUCK); r(x + 11, y - 6, 2, 1, NK.BEAK); r(x + 9, y - 6, 1, 1, K.EYE); } // how did it get up there
    // ===================== the GLASS WALL and the airlock (over both sides' walls) =====================
    { const gx = RXL.glass;
      r(gx - 12, CEIL + 4, 24, FL - CEIL - 4, RX.STEEL_DK2); r(gx - 12, CEIL + 4, 2, FL - CEIL - 4, RX.STEEL_DK); // the frame at the back wall
      r(gx - 27, 342, 54, 16, RX.HAZ_DK); r(gx - 25, 344, 50, 12, [30, 40, 46]); trefoil(gx - 17, 350, 4, RX.HAZ); txt('AIRLOCK', gx - 10, 348, K.WHITE);
      r(gx - 30, 362, 60, 18, K.PAPER); r(gx - 30, 362, 60, 2, [200, 40, 60]); txt('SUITS ON', gx - tw('SUITS ON') / 2, 366, [200, 40, 60]); txt('PAST HERE', gx - tw('PAST HERE') / 2, 373, [60, 60, 70]);
      hazard(gx - 6, FL, 12, 130, 4); // the threshold across the floor
    }
  });
}

/** A dial with a needle at `u` (0..1) and a red zone at the top. */
function dial(cx: number, cy: number, rad: number, u: number): void {
  disc(cx, cy, rad, RX.STEEL_DK2); disc(cx, cy, rad - 1, [236, 236, 228]);
  for (let k = 0; k <= 6; k++) { const an = Math.PI * (0.8 + k * 0.233); r(Math.round(cx + Math.cos(an) * (rad - 2)), Math.round(cy + Math.sin(an) * (rad - 2)), 1, 1, k >= 5 ? [200, 40, 50] : [60, 60, 70]); }
  const an = Math.PI * (0.8 + clamp(u, 0, 1) * 1.4); line(cx, cy, Math.round(cx + Math.cos(an) * (rad - 2)), Math.round(cy + Math.sin(an) * (rad - 2)), [200, 40, 50]); r(cx, cy, 1, 1, RX.STEEL_DK2);
}

function drawBack(a: number): void {
  const T = Date.now(), g = reactorNow(T), on = live(g, T) && !!g, melted = !!g?.melt && T - g.melt < 60000;
  const rods = on ? g!.rods : IDLE.rods, pumps = on ? g!.pumps : IDLE.pumps, turb = on ? g!.turb : IDLE.turb, heat = on ? g!.heat : melted ? 110 : IDLE.heat;
  const day = dayness(), list = g ? faults(g) : [];
  const hot = heat / 100, P = RXL.pool, power = on ? powerOf(heat, turb) : 0, dem = g ? demand(g, T, day) : 40 + 36 * (1 - day);
  const alarm = on && heat >= 85 ? (heat >= 97 ? 2 : 1) : melted ? 2 : 0;
  // the trace for the graph: a sample a second through the shift
  if (g && REACT.histT0 !== g.t0) { REACT.histT0 = g.t0; REACT.hist = []; REACT.histAt = 0; }
  if (on && T - REACT.histAt >= 1000) { REACT.histAt = T; REACT.hist.push({ p: power, d: dem }); if (REACT.hist.length > 64) REACT.hist.shift(); }

  // ---------------- the pool: water, glow, the core, the rods, bubbles ----------------
  const c0 = melted ? RX.MELT0 : RX.POOL0, c1 = melted ? RX.MELT1 : RX.POOL1, c2 = melted ? RX.MELT2 : RX.POOL2, glow = 0.35 + 0.65 * clamp(hot, 0, 1.1);
  lit(() => {
    for (let y = P.y0; y < P.y1; y += 2) { const u = (y - P.y0) / (P.y1 - P.y0); r(P.x0, y, P.x1 - P.x0, 2, M(M(c1, c0, u * 0.6), c2, Math.max(0, u - 0.55) * glow * 1.4)); }
    for (let x = P.x0; x < P.x1; x += 6) r(x, P.y0 + 6 + Math.round(Math.sin(a * 2 + x * 0.08) * 1.2), 4, 1, M(c1, K.WHITE, 0.35)); // the surface
    // the core: fuel assemblies glowing at their tips
    for (let k = 0; k < 12; k++) { const x = 924 + k * 13; r(x, 428, 9, 38, M(RX.CORE, c2, 0.25 * glow)); r(x, 428, 9, 2, M(RX.CORE_HI, K.WHITE, 0.3 * glow)); r(x + 2, 432, 1, 30, M(RX.CORE, c2, 0.5 * glow)); }
    r(916, 464, 170, 6, shade(RX.CORE, 0.8));
  });
  // the rods: six, hanging from the trolley; out = pulled up into the water above the core
  const rodTop = CEIL + 40, rodDip = 428 - 14 - rods * 6.2;
  for (let k = 0; k < 6; k++) { const x = 934 + k * 24, top = Math.max(rodTop, Math.round(rodDip) - 50); line(x + 2, rodTop, x + 2, top, [40, 44, 50]); r(x, top, 5, Math.round(rodDip) - top + 2, [60, 66, 76]); r(x, top, 1, Math.round(rodDip) - top + 2, [110, 116, 126]); r(x - 1, Math.round(rodDip), 7, 3, [40, 44, 50]); }
  // bubbles rising off the core (faster when it's hot)
  lit(() => { for (let i = 0; i < 18; i++) { const sp = 18 + 40 * hot, u = ((a * sp / 100) + h1(i * 3.3)) % 1, y = 440 - u * 82, x = 926 + h1(i * 7.7) * 150 + Math.sin(a * 2 + i) * 2; if (y > P.y0 + 8) r(Math.round(x), Math.round(y), 1 + (i % 2), 1 + (i % 2), M(c2, K.WHITE, 0.5)); } });
  // the glow: into the room, onto the walkway, and brighter with the heat
  Gsoft(1000, 430, 30, 220, c2, 0.5 * glow); G(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0, c2, 0.12 * glow); G(P.x0 - 60, FL, P.x1 - P.x0 + 120, 90, c2, 0.1 * glow);
  // glass glints on the tank's front
  alpha(0.25, () => { for (let k = 0; k < 3; k++) { const x = P.x0 + 40 + k * 150 + ((a * 6) % 30); line(Math.round(x), P.y0 + 8, Math.round(x) + 30, P.y1 - 8, K.WHITE); } });

  // ---------------- the turbine: a big green drum spinning with the power ----------------
  { const x = RXL.turb, y = 400, spin = (a * (0.4 + power / 12)) % 1;
    r(x - 60, y, 120, 42, RX.TURB_DK); r(x - 58, y + 2, 116, 38, RX.TURB); r(x - 58, y + 2, 116, 3, RX.TURB_HI);
    for (let k = 0; k < 8; k++) { const sx = x - 58 + ((k / 8 + spin) % 1) * 116; r(Math.round(sx), y + 6, 3, 32, RX.TURB_DK); r(Math.round(sx) + 3, y + 6, 1, 32, RX.TURB_HI); }
    r(x - 64, y + 16, 6, 12, RX.STEEL_DK2); r(x + 58, y + 12, 20, 20, RX.STEEL_DK2); // the shaft, the generator
    r(x - 30, y - 18, 60, 16, RX.CONSOLE_DK); r(x - 28, y - 16, 56, 12, RX.SCREEN);
    lit(() => { const s = Math.round(power) + ' MW'; txt(s, x - tw(s) / 2, y - 13, power > 1 ? RX.LED_G : [60, 80, 80]); });
    if (power > 1) G(x - 60, y, 120, 42, RX.TURB_HI, 0.05 + 0.04 * Math.sin(a * 20)); }
  // the pipes' gauges: needles following heat and flow
  dial(736, 362, 8, hot); dial(1266, 440, 8, pumps / 3 * (on && broken(g!, FAULT.BREAKER, T, list) ? 0 : 1));
  // steam wisps at the pipe joints (more when hot)
  for (let i = 0; i < 4; i++) { const u = ((a * 0.4) + i / 4) % 1, x = [730, 1240, 1300, 760][i], y = [CEIL + 10, CEIL + 10, FL - 30, 400][i]; alpha((0.25 + 0.3 * hot) * (1 - u), () => disc(Math.round(x + u * 6), Math.round(y - u * 16), Math.round(1 + u * 4), [220, 224, 232])); }
  // the high window: the sky over the city
  { const top = M([6, 10, 28], [94, 155, 214], day), bot = M([42, 42, 99], [240, 221, 191], day); for (let y = 338; y < 372; y += 2) r(1396, y, 72, 2, M(top, bot, (y - 338) / 34)); for (let k = 0; k < 8; k++) { const bh = 6 + Math.floor(h1(k * 4.1) * 14); r(1396 + k * 9, 372 - bh, 8, bh, M([17, 22, 58], [110, 122, 160], day)); } if (day < 0.5) lit(() => { for (let k = 0; k < 6; k++) if (h1(k * 9.1 + Math.floor(a / 4)) > 0.4) r(1398 + k * 12, 364 - (k % 3) * 3, 1, 2, K.WIN_Y); }); r(1431, 338, 2, 34, RX.STEEL_DK2); }

  // ---------------- faults: what's broken, where ----------------
  const isOn = (k: number) => on && broken(g!, k, T, list);
  if (isOn(FAULT.LEAK)) { const f = FAULT_AT[FAULT.LEAK]; for (let i = 0; i < 10; i++) { const u = ((a * 2.2) + i / 10) % 1; alpha(0.7 * (1 - u), () => disc(Math.round(f.x + 10 + u * 50), Math.round(f.y - 4 + Math.sin(i) * 3 - u * 10), Math.round(1 + u * 5), [236, 240, 246])); } lit(() => { for (let k = 0; k < 3; k++) if ((a * 3 + k * 0.3) % 1 < 0.5) r(f.x + 4, f.y + 6 + (((a * 60) + k * 12) % 44), 1, 2, [150, 210, 255]); }); }
  if (isOn(FAULT.VALVE)) { const f = FAULT_AT[FAULT.VALVE]; lit(() => { ring(f.x - 42, f.y + 2, 8, 8, (a % 0.5) < 0.25 ? RX.LED_R : [120, 30, 30]); r(f.x - 36, f.y + 10, 12, 8, [255, 214, 90]); txt('!', f.x - 32, f.y + 11, [200, 40, 60]); }); }
  if (isOn(FAULT.PIGEON)) { const f = FAULT_AT[FAULT.PIGEON], bob = Math.floor(a * 3) % 2; r(f.x - 6, f.y - 4 + bob, 9, 6, K.PIGEON); r(f.x + 2, f.y - 7 + bob, 5, 5, K.PIGEON_DK); r(f.x + 4, f.y - 6 + bob, 2, 1, K.PIGEON_NECK); r(f.x + 7, f.y - 5 + bob, 2, 1, K.BEAK); r(f.x + 5, f.y - 6 + bob, 1, 1, K.EYE); for (let i = 0; i < 2; i++) { const u = ((a * 0.5) + i / 2) % 1; r(Math.round(f.x - 10 + u * 8), Math.round(f.y + 12 + u * 50), 2, 1, K.PIGEON_LT); } }
  if (isOn(FAULT.BREAKER)) { const f = FAULT_AT[FAULT.BREAKER]; r(f.x - 10, 392, 20, 30, [60, 60, 66]); r(f.x - 22, 392, 12, 30, [150, 156, 164]); lit(() => { r(f.x - 6, 398, 4, 8, (a % 0.6) < 0.3 ? RX.LED_R : [100, 20, 20]); for (let k = 0; k < 4; k++) if ((a * 7 + k * 0.37) % 1 < 0.3) { const sx = f.x + Math.round((h1(k + Math.floor(a * 7)) - 0.5) * 16), sy = 408 + Math.round(h1(k * 3 + Math.floor(a * 7)) * 12); line(sx, sy, sx + 3, sy - 4, [255, 250, 180]); } }); G(f.x - 12, 390, 24, 34, [255, 240, 180], 0.1 + ((a * 7) % 1 < 0.3 ? 0.15 : 0)); }
  if (isOn(FAULT.GOO)) { const f = FAULT_AT[FAULT.GOO]; lit(() => { oval(f.x, f.y, 22, 5, RX.GOO_DK); oval(f.x, f.y - 1, 19, 4, RX.GOO); for (let k = 0; k < 3; k++) { const u = ((a * 0.8) + k / 3) % 1; if (u < 0.6) disc(f.x - 12 + k * 12, f.y - 1 - Math.round(u * 3), Math.round(1 + u * 2), RX.GOO_HI); } }); G(f.x - 24, f.y - 8, 48, 14, RX.GOO, 0.3); }
  for (let k = 0; k < 5; k++) if (isOn(k)) { const f = FAULT_AT[k], y = (k === FAULT.GOO ? f.y - 26 : f.y - 30) - Math.round(Math.abs(Math.sin(a * 4)) * 4); lit(() => { r(f.x - 3, y, 7, 3, RX.LED_R); for (let j = 0; j < 4; j++) r(f.x - 3 + j, y + 3 + j, 7 - j * 2, 1, RX.LED_R); }); Gd(f.x, y + 3, 8, RX.LED_R, 0.4); }

  // ---------------- the stations' knobs, lamps and needles ----------------
  const st = RXL.st;
  { const cx = st[RST.SCRAM], lifted = T - REACT.cover < 3000, locked = on && scramLeft(g!, T) > 0;
    disc(cx + 8, 422, 9, [40, 20, 24]); lit(() => { disc(cx + 8, 420, 8, locked ? shade(RX.RED_BTN, 0.6) : RX.RED_BTN); r(cx + 4, 415, 4, 2, RX.RED_HI); });
    if (on && !locked) Gd(cx + 8, 420, 12, RX.RED_BTN, 0.25 + 0.15 * Math.sin(a * 4));
    alpha(0.45, () => { if (lifted) { r(cx - 4, 400, 24, 3, [200, 230, 240]); r(cx - 2, 394, 20, 6, [200, 230, 240]); } else { r(cx - 2, 410, 20, 16, [200, 230, 240]); r(cx - 2, 410, 20, 1, K.WHITE); } }); // the flip-up cover
    lit(() => txt(locked ? mmss(scramLeft(g!, T)) : 'ARMED', cx - 30, 416, locked ? RX.LED_A : on ? RX.LED_R : [70, 80, 80])); }
  { const cx = st[RST.RODS]; r(cx - 6, 408, 12, 26, [30, 36, 40]); const ly = 430 - rods * 2.2; r(cx - 2, Math.round(ly) - 10, 4, 12, RX.STEEL_HI); lit(() => { disc(cx, Math.round(ly) - 12, 3, [230, 60, 60]); }); lit(() => { for (let k = 0; k < 10; k++) r(cx - 30 + (k % 5) * 4, 412 + Math.floor(k / 5) * 5, 3, 3, k < rods ? (k >= 8 ? RX.LED_R : k >= 6 ? RX.LED_A : RX.LED_G) : [40, 50, 50]); });
    r(cx + 16, 404, 8, 8, [236, 236, 244]); r(cx + 17, 402, 6, 2, [220, 220, 228]); r(cx + 24, 406, 2, 4, [236, 236, 244]); } // the mug
  { const cx = st[RST.COOL], dead = on && broken(g!, FAULT.BREAKER, T, list); for (let k = 0; k < 3; k++) { const px = cx - 20 + k * 20, onK = k < pumps; lit(() => { disc(px, 420, 4, onK && !dead ? RX.LED_G : [40, 50, 50]); if (onK && !dead) { const an = a * 8 + k; r(Math.round(px + Math.cos(an) * 3), Math.round(420 + Math.sin(an) * 3), 1, 1, K.WHITE); } }); r(px - 2, 428, 4, 6, onK ? RX.STEEL_HI : RX.STEEL_DK); } if (dead) lit(() => txt('NO PWR', cx - 12, 430, (a % 0.6) < 0.3 ? RX.LED_R : [100, 30, 30])); }
  { const cx = st[RST.TURB], stuck = on && broken(g!, FAULT.VALVE, T, list), an0 = turb * 0.6; ring(cx, 420, 11, 11, stuck ? [150, 40, 40] : [200, 60, 60]); ring(cx, 420, 10, 10, stuck ? [120, 30, 30] : [220, 70, 70]); for (let k = 0; k < 4; k++) { const an = an0 + k * Math.PI / 2; line(cx, 420, Math.round(cx + Math.cos(an) * 10), Math.round(420 + Math.sin(an) * 10), [180, 50, 50]); } disc(cx, 420, 2, [60, 60, 70]);
    dial(cx + 24, 418, 7, turb / 10); if (stuck) lit(() => txt('STUCK', cx - 34, 430, (a % 0.6) < 0.3 ? RX.LED_R : [100, 30, 30])); }
  // little lamps blinking along every console
  lit(() => { st.forEach((cx, i) => { for (let k = 0; k < 6; k++) if ((a * (0.7 + k * 0.13) + i * 0.3 + k * 0.21) % 1 < 0.5) r(cx - 30 + k * 10, 430, 4, 2, [RX.LED_G, RX.LED_A, [90, 209, 255] as RGB][(k + i) % 3]); }); });

  // ---------------- THE BIG BOARD ----------------
  lit(() => {
    // HEAT: a bar from green to red, a red line at the danger mark
    const bh = Math.round(60 * clamp(heat, 0, 110) / 110);
    for (let y = 0; y < bh; y++) { const u = y / 60; r(176, 393 - y, 18, 1, u > 0.77 ? RX.LED_R : u > 0.62 ? RX.LED_A : RX.LED_G); }
    r(174, 393 - Math.round(60 * 85 / 110), 22, 1, RX.LED_R); txt('HEAT', 177, 331, [120, 150, 150]);
    // the graph: city demand (gold) and your power (cyan), the last minute
    for (let y = 348; y < 395; y += 12) r(206, y, 246, 1, RX.SCREEN_LN);
    const pts = REACT.hist, n = pts.length, sx = (i: number) => 450 - (n - 1 - i) * 3.9, sy = (v: number) => 393 - clamp(v, 0, 110) * 0.4;
    for (let i = 1; i < n; i++) { line(Math.round(sx(i - 1)), Math.round(sy(pts[i - 1].d)), Math.round(sx(i)), Math.round(sy(pts[i].d)), K.GOLD); line(Math.round(sx(i - 1)), Math.round(sy(pts[i - 1].p)), Math.round(sx(i)), Math.round(sy(pts[i].p)), [90, 220, 255]); }
    txt('CITY', 208, 332, K.GOLD); txt('YOU', 228, 332, [90, 220, 255]);
    const cur = 'NEED ' + Math.round(dem) + ' MW   MAKING ' + Math.round(power) + ' MW'; txt(cur, 452 - tw(cur), 332, Math.abs(power - dem) < dem * 0.1 ? RX.LED_G : [200, 220, 220]);
    // the right panel: GRID %, the clock, the faults, a surge, the alarm
    if (on) {
      const gp = grid(g!), gs = 'GRID ' + gp + '%';
      txt(gs, 464, 332, gp >= 80 ? RX.LED_G : gp >= 50 ? RX.LED_A : RX.LED_R, 2);
      txt(mmss((g!.t0 + SHIFT_S * 1000 - T) / 1000) + ' LEFT', 464, 345, [200, 220, 220]);
      const open = list.filter((f) => f.at <= T && g!.fixed[f.i] === 0), sg = surges(g!).find((s) => T >= s.at && T < s.at + s.dur);
      if (!open.length) txt('ALL SYSTEMS OK', 464, 353, RX.LED_G);
      open.slice(0, sg ? 2 : 3).forEach((f, j) => txt((a % 0.8 < 0.55 ? '! ' : '  ') + FAULT_NAMES[f.kind], 464, 353 + j * 7, RX.LED_R));
      if (sg) txt('SURGE! ' + sg.text.slice(0, 26), 464, 374, (a % 0.6) < 0.4 ? K.GOLD : [150, 120, 50]);
      if (alarm) txt(alarm === 2 ? 'CORE CRITICAL!' : 'HEAT WARNING', 464, 385, (a % 0.5) < 0.3 ? RX.LED_R : [120, 30, 30]);
    } else if (melted) {
      txt('MELTDOWN', 464, 332, (a % 0.5) < 0.3 ? RX.LED_R : [120, 30, 30], 2); txt('BLORP.', 464, 348, RX.MELT2); txt('GRID ' + (REACT.last?.grid ?? 0) + '%', 464, 358, [200, 220, 220]);
    } else {
      txt('STANDING BY', 464, 333, [124, 180, 170]); txt('START A SHIFT AT', 464, 344, [200, 220, 220]); txt('THE CLIPBOARD', 464, 351, [200, 220, 220]);
      if (REACT.last && T - REACT.last.at < 600000) txt('LAST SHIFT ' + REACT.last.grid + '%', 464, 363, REACT.last.grid >= 80 ? RX.LED_G : RX.LED_A);
      txt('CITY WANTS ' + Math.round(dem) + ' MW', 464, 382, K.GOLD);
    }
  });
  { const B = RXL.board; G(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0, alarm ? RX.LED_R : [90, 220, 255], alarm ? 0.12 + 0.1 * Math.sin(a * 12) : 0.06); }
  // the best shift, on its little screen by the clipboard
  lit(() => { const b = REACT.best; const s = b ? b.score + '%' : '--'; txt(s, RXL.shift - tw(s) / 2, 423, K.GOLD); if (b) { const nm = b.name.slice(0, 9); txt(nm, RXL.shift - tw(nm) / 2, 429, [200, 220, 220]); } });
  // the airlock's light: green, red during an alarm
  { const gx = RXL.glass; lit(() => { r(gx - 4, 336, 8, 5, alarm ? ((a % 0.5) < 0.25 ? RX.LED_R : [100, 20, 20]) : RX.LED_G); }); Gd(gx, 338, 10, alarm ? RX.LED_R : RX.LED_G, 0.35); }
  // alarms: an amber strobe, then red, over everything
  if (alarm) { const k = alarm === 2 ? (a % 0.4 < 0.2 ? 0.16 : 0.04) : (a % 1 < 0.5 ? 0.08 : 0.02); G(0, CEIL, W, H - CEIL, alarm === 2 ? [255, 30, 30] : [255, 160, 40], k); for (const bx of [300, 1100]) { const an = a * 6; Gd(bx + Math.cos(an) * 30, CEIL + 10, 20, alarm === 2 ? RX.LED_R : RX.LED_A, 0.5); lit(() => r(bx - 4, CEIL + 4, 8, 6, alarm === 2 ? RX.LED_R : RX.LED_A)); } }
  // the BLORP: a wave of glowing goo slops over the walkway (and a rubber duck rides it out)
  if (g?.melt) { const u = (T - g.melt) / 1000; if (u >= 0 && u < 20) { const reach = Math.min(1, u / 2.5), fade = u > 14 ? 1 - (u - 14) / 6 : 1, x0 = 1000 - 500 * reach, x1 = 1000 + 480 * reach;
    alpha(0.85 * fade, () => lit(() => { for (let x = Math.round(x0); x < x1; x += 2) { const h = 6 + Math.round(4 * Math.sin(x * 0.08 + a * 5)); r(x, FL + 2, 2, h + 8, RX.GOO_DK); r(x, FL + 2, 2, h, RX.GOO); if ((x + Math.floor(a * 10)) % 13 === 0) r(x, FL + 1, 2, 2, RX.GOO_HI); } for (let k = 0; k < 8; k++) { const bu = ((a * 0.9) + k / 8) % 1; disc(Math.round(x0 + (x1 - x0) * h1(k * 3.3)), Math.round(FL + 6 - bu * 8), Math.round(1 + bu * 3), RX.GOO_HI); } }));
    G(x0, FL - 20, x1 - x0, 60, RX.MELT2, 0.3 * fade);
    const dx = 1000 + (u < 2.5 ? u / 2.5 : 1) * 380 + Math.sin(a * 2) * 6, dy = FL - 2 + Math.sin(a * 3) * 2; if (fade > 0.3) { r(Math.round(dx) - 4, Math.round(dy) - 4, 9, 5, NK.DUCK); r(Math.round(dx) + 2, Math.round(dy) - 8, 5, 5, NK.DUCK); r(Math.round(dx) + 7, Math.round(dy) - 6, 2, 1, NK.BEAK); r(Math.round(dx) + 4, Math.round(dy) - 7, 1, 1, K.EYE); } } }
}

/** In front of everything: the glass wall's front jamb (you walk between it and the back). */
function drawFront(a: number): void {
  const gx = RXL.glass;
  r(gx - 8, 604, 16, H - 604, RX.STEEL_DK2); r(gx - 8, 604, 3, H - 604, RX.STEEL); lit(() => r(gx - 2, 610, 4, 4, (a % 2) < 1 ? RX.LED_G : shade(RX.LED_G, 0.4)));
  alpha(0.18, () => r(gx - 22, 604, 44, H - 604, RX.GLASS)); alpha(0.3, () => line(gx - 16, 612, gx + 10, 690, RX.GLASS_HI));
}
/** The glass itself, over the upper part of the wall: tinted, with reflections, the hall's glow showing through. */
const glassPane: Prop = {
  y: FL + 1,
  draw(a: number) {
    const gx = RXL.glass;
    alpha(0.22, () => r(gx - 20, CEIL + 8, 40, FL - CEIL - 8, RX.GLASS));
    alpha(0.35, () => { for (let k = 0; k < 3; k++) { const y = CEIL + 30 + k * 60 + ((a * 5) % 20); line(gx - 18, Math.round(y), gx + 18, Math.round(y) + 30, RX.GLASS_HI); } });
    for (let y = CEIL + 10; y < FL; y += 16) r(gx - 20, y, 40, 1, shade(RX.GLASS, 0.7)); // wired glass
    r(gx - 20, CEIL + 8, 2, FL - CEIL - 8, RX.STEEL_DK2); r(gx + 18, CEIL + 8, 2, FL - CEIL - 8, RX.STEEL_DK2);
  },
};

// ---------- spots (append only!) ----------
const station = (n: number, label: string): Spot => { const x = RXL.st[n]; return { kind: 'rstation', n, x, y: 494, sx: x, sy: 494, lift: 0, label, area: { x0: x - 36, y0: 398, x1: x + 36, y1: 470 } }; };
export const REACTOR_SPOTS: Spot[] = [
  station(RST.SCRAM, 'SCRAM'), station(RST.RODS, 'RODS'), station(RST.COOL, 'COOLANT'), station(RST.TURB, 'TURBINE'), // 0-3
  { kind: 'rshift', x: RXL.shift, y: 494, sx: RXL.shift, sy: 494, lift: 0, label: 'START SHIFT', area: { x0: RXL.shift - 18, y0: 360, x1: RXL.shift + 18, y1: 440 } }, // 4
  ...FAULT_AT.map((f, n): Spot => ({ kind: 'rfault', n, x: f.sx, y: f.sy, sx: f.sx, sy: f.sy, lift: 0, label: 'CHECK', area: n === FAULT.GOO ? { x0: f.x - 24, y0: f.y - 10, x1: f.x + 24, y1: f.y + 6 } : { x0: f.x - 24, y0: f.y - 24, x1: f.x + 24, y1: f.y + 24 } })), // 5-9
];
const TALK: Talker[] = [
  { id: 'rx-days', name: 'SIGN', verb: 'READ', x: 596, y: 328, sx: 596, sy: 494, lines: ['DAYS WITHOUT A MELTDOWN: 0. (it said 3. briefly)', 'someone has drawn a little duck on it'] },
  { id: 'rx-binders', name: 'BINDERS', verb: 'READ', x: 580, y: 398, sx: 580, sy: 494, lines: ['REACTOR MANUAL, VOL. 7: WHAT THE BIG RED BUTTON DOES', 'a binder labelled GERALD. it\'s all pigeon photos', 'SAFETY PROCEDURES: step 1. don\'t panic. step 2. see step 1']},
  { id: 'rx-pool', name: 'THE POOL', verb: 'LOOK', x: 1000, y: 348, sx: 1000, sy: 494, lines: ['that blue glow is real: it\'s called Cherenkov light', 'so blue. so warm. do not swim', 'the rods go up, the glow goes up'] },
  { id: 'rx-duck', name: 'DUCK', verb: 'LOOK', x: 1186, y: 318, sx: 1186, sy: 494, lines: ['a rubber duck on the pipe. nobody knows how it got up there', 'it\'s watching the gauges for us'] },
];

export function makeReactor(): Room {
  const room: Room = {
    id: 'reactor', title: 'THE REACTOR', sub: 'SCIENCE WING',
    w: W, h: H,
    floor: { x0: 14, y0: 480, x1: W - 14, y1: H - 30 },
    blockers: [
      { x0: RXL.glass - 10, y0: 476, x1: RXL.glass + 10, y1: 488 }, // the glass wall: the airlock is the gap between its back and front jambs
      { x0: RXL.glass - 10, y0: 600, x1: RXL.glass + 10, y1: H },
      { x0: RXL.turb - 70, y0: 470, x1: RXL.turb + 70, y1: 484 },
    ],
    doors: [{ trigger: { x0: RXL.door - 18, y0: 480, x1: RXL.door + 18, y1: 488 }, to: 'wing', arrive: { x: 345, y: 500 }, label: 'THE WING', area: { x0: RXL.door - 28, y0: 342, x1: RXL.door + 28, y1: 480 } }],
    /** At a station, the camera frames THE BIG BOARD (and the consoles under it). */
    watch: { x: 386, top: 290 },
    spots: REACTOR_SPOTS, inUse: new Map(),
    onState(s: StateMsg) { if (s.k === 'reactor') REACT.g = s.v; else if (s.k === 'reactbest') REACT.best = s.v; },
    spawn: { x: 96, y: 540 },
    dim: 0.05,
    fillTop: 'rgb(39,51,58)', fillLow: 'rgb(42,48,52)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack, drawFront,
    props: [glassPane],
    talkers: TALK,
  };
  return room;
}
