// LAB AIR's jet, side on, at any size: the gate's window at the airport, Keflavík's window, the Subway's view on the way to the
// airport, the map. White with an orange stripe and a teal tail (the flask logo on it), the wing and its engine, a row of windows,
// the doors, the gear; at night the cabin windows glow, the nav light shows, the beacon flashes and the tail's strobe blinks.

import { PL } from '../engine/palette';
import { AIR_CYCLE, LEG_S, PUSH_S, TAXI_S, ROLL_S, CLIMB_S, CRUISE_S, TOUCH_S } from '../game/air';
import { r, disc, oval, txt, tw, lit, Gd, M } from '../engine/pixel';

export interface JetOpts {
  /** Night lights on (cabin windows, nav light, beacon, strobe). */
  night?: boolean;
  /** Wheels down. */
  gear?: boolean;
  /** Its front door open (at a jet bridge). */
  door?: boolean;
  /** Flaps down (take-off and landing). */
  flaps?: boolean;
  /** Tip it up (climbing) or down (descending), in pixels of rise over its length. */
  pitch?: number;
  /** How far away (0 = crisp, 1 = faded into the haze), and what it fades towards. */
  haze?: number; hazeCol?: [number, number, number];
}
/** The jet with its nose at (nx, ny) (the bottom of the fuselage), facing dir (1 = right), `len` px long. */
export function drawJet(nx: number, ny: number, len: number, dir: 1 | -1, a: number, o: JetOpts = {}): void {
  const s = len / 400, H = Math.max(3, Math.round(34 * s)), f = (c: [number, number, number]) => (o.haze ? M(c, o.hazeCol ?? [200, 210, 220], o.haze) : c);
  const X = (u: number): number => Math.round(nx - dir * u * len), P = (u: number): number => Math.round((o.pitch ?? 0) * u); // (u: 0 at the nose, 1 at the tail)
  const top = (u: number): number => ny - H + P(u), bot = (u: number): number => ny + P(u);
  const body = f(PL.FUSE), dk = f(PL.FUSE_DK), stripe = f(PL.STRIPE), tail = f(PL.TAIL);
  const col = (u0: number, u1: number, y0: (u: number) => number, h: (u: number) => number, c: [number, number, number]): void => {
    const step = Math.max(1, Math.round(2 * s));
    for (let u = u0; u < u1; u += step / len) { const x = X(u); r(dir > 0 ? x - step : x, y0(u), step, Math.max(1, h(u)), c); }
  };
  // the far wing first (a dark sliver behind the body), then the body: nose rounded, tail cone swept up
  col(0.42, 0.62, (u) => top(u) + Math.round(H * 0.55) - Math.round((u - 0.42) * H * 0.6), () => Math.max(1, Math.round(H * 0.12)), f([150, 156, 166]));
  col(0.06, 0.8, top, () => H, body);
  col(0, 0.06, (u) => top(u) + Math.round(H * (1 - Math.sqrt(u / 0.06)) * 0.62), (u) => Math.max(1, Math.round(H * (1 - (1 - Math.sqrt(u / 0.06)) * 0.9))), body); // the nose, rounded down to its tip
  col(0.8, 1, (u) => top(u) + Math.round((u - 0.8) / 0.2 * H * 0.15), (u) => Math.round(H * (1 - (u - 0.8) / 0.2 * 0.72)), body); // the tail cone
  col(0.02, 0.98, (u) => bot(u) - Math.max(1, Math.round(H * 0.18)), () => Math.max(1, Math.round(H * 0.18)), dk); // the belly's shadow
  col(0.05, 0.82, (u) => top(u) + Math.round(H * 0.5), () => Math.max(1, Math.round(H * 0.1)), stripe); // the orange cheatline
  // the tail fin (teal, the flask logo on it) and the stabiliser
  // (the leading edge sweeps up and back from u 0.76 to the top at 0.93; the trailing edge drops nearly straight at 0.97-0.99)
  const fh = Math.round(H * 1.3), fw = Math.max(1, Math.round(s * 2));
  for (let u = 0.76; u < 0.99; u += fw / len) {
    const x = X(u), hL = fh * Math.min(1, (u - 0.76) / 0.17), hT = u > 0.95 ? fh * Math.max(0, (0.99 - u) / 0.04) : fh, h = Math.round(Math.min(hL, hT));
    if (h < 1) continue; const y0 = top(u) - h + 1; r(dir > 0 ? x - fw : x, y0, fw, h, tail); r(dir > 0 ? x - fw : x, y0, fw, 1, f([90, 200, 196]));
  }
  if (len > 90) { const lx = X(0.905), ly = top(0.9) - Math.round(fh * 0.45); disc(lx, ly, Math.max(1, Math.round(4 * s)), f(PL.STRIPE)); r(lx - Math.max(1, Math.round(1.5 * s)), ly - Math.round(7 * s), Math.max(1, Math.round(3 * s)), Math.round(5 * s), f(PL.STRIPE)); } // (the flask)
  col(0.86, 0.99, (u) => top(u) + Math.round(H * 0.18), () => Math.max(1, Math.round(H * 0.16)), f([190, 196, 206]));
  // the near wing and its engine: swept back from under the body's middle
  const ex = X(0.47);
  col(0.36, 0.6, (u) => bot(u) - Math.round(H * 0.28) + Math.round((u - 0.36) * H * 0.9), () => Math.max(1, Math.round(H * 0.16)), f([200, 204, 212]));
  if (o.flaps) col(0.5, 0.6, (u) => bot(u) - Math.round(H * 0.12) + Math.round((u - 0.36) * H * 0.9), () => Math.max(1, Math.round(H * 0.14)), f([170, 176, 186]));
  const eh = Math.max(2, Math.round(H * 0.42)), ew = Math.round(len * 0.12);
  r(dir > 0 ? ex - ew : ex, bot(0.47) - Math.round(H * 0.08), ew, eh, f([210, 214, 222])); r(dir > 0 ? ex - ew : ex, bot(0.47) - Math.round(H * 0.08), Math.max(1, Math.round(ew * 0.18)), eh, f([60, 64, 72])); // (its intake)
  // the cockpit windows, the cabin windows, the doors
  if (len > 60) {
    const cw = Math.max(1, Math.round(3 * s));
    for (let k = 0; k < 3; k++) r(X(0.035 + k * 0.012) - (dir > 0 ? cw : 0), top(0.04) + Math.round(H * 0.22), cw, Math.max(1, Math.round(H * 0.14)), f([40, 48, 64]));
    const wy = (u: number) => top(u) + Math.round(H * 0.28), ww = Math.max(1, Math.round(2.4 * s)), wh = Math.max(1, Math.round(H * 0.16));
    for (let u = 0.1; u < 0.78; u += 0.022) { if (Math.abs(u - 0.14) < 0.02 || Math.abs(u - 0.62) < 0.015) continue; const x = X(u); if (o.night) lit(() => r(x, wy(u), ww, wh, [255, 222, 150])); else r(x, wy(u), ww, wh, f([56, 66, 86])); }
    for (const du of [0.13, 0.62]) { const x = X(du); r(x - Math.round(3 * s), top(du) + Math.round(H * 0.12), Math.max(1, Math.round(7 * s)), Math.round(H * 0.72), f(PL.FUSE_DK)); r(x - Math.round(3 * s) + 1, top(du) + Math.round(H * 0.12) + 1, Math.max(1, Math.round(7 * s)) - 2, Math.round(H * 0.72) - 2, body); }
    if (o.door) { const x = X(0.13); r(x - Math.round(3 * s), top(0.13) + Math.round(H * 0.12), Math.max(1, Math.round(7 * s)), Math.round(H * 0.72), [30, 34, 42]); }
    if (len > 200) txt('LAB AIR', X(0.3) - (dir > 0 ? tw('LAB AIR') : 0), top(0.3) + Math.round(H * 0.12), f([40, 110, 120]));
  }
  // the gear: a nose wheel and the mains
  if (o.gear !== false) for (const u of [0.1, 0.52]) { const x = X(u), gh = Math.max(2, Math.round(H * 0.36)); r(x - 1, bot(u), Math.max(1, Math.round(2 * s)), gh, f([90, 94, 102])); disc(x, bot(u) + gh, Math.max(1, Math.round(H * 0.12)), f([30, 30, 36])); }
  // night: the nav light on the near wingtip, the beacon on the belly and back, the tail's strobe
  if (o.night) {
    const tip = X(0.6), ty = bot(0.6) - Math.round(H * 0.28) + Math.round(0.24 * H * 0.9);
    lit(() => r(tip, ty, Math.max(1, Math.round(2 * s)), Math.max(1, Math.round(2 * s)), dir > 0 ? [255, 70, 70] : [90, 255, 120])); Gd(tip, ty, Math.max(3, 8 * s), dir > 0 ? [255, 60, 60] : [80, 255, 110], 0.5);
    if ((a * 1.2) % 1 < 0.14) { const bx = X(0.4); lit(() => { r(bx, top(0.4) - 1, Math.max(1, Math.round(3 * s)), Math.max(1, Math.round(2 * s)), [255, 50, 40]); r(bx, bot(0.4), Math.max(1, Math.round(3 * s)), Math.max(1, Math.round(2 * s)), [255, 50, 40]); }); Gd(bx, top(0.4), Math.max(4, 12 * s), [255, 40, 30], 0.6); }
    if ((a * 0.9 + 0.3) % 1 < 0.06) { const sx = X(0.99); lit(() => r(sx, top(0.99) - 2, 2, 2, [255, 255, 255])); Gd(sx, top(0.99), Math.max(4, 14 * s), [240, 245, 255], 0.7); }
  }
  void oval;
}

/** Where the plane is in a gate's window, k seconds into this end's own 10-minute loop (0 = its boarding starts): its nose (it always
 *  faces right), how long it looks, and how it's set. At the stand with the bridge on its door; pushed back; taxiing away (smaller
 *  with the distance); rolling along the far runway and climbing out to the right; and coming back: down from the left onto the far
 *  runway, then taxiing in to the stand. null while it's away. */
export function jetOnApron(k: number, g: { standX: number; standY: number; runwayY: number; win0: number; win1: number }): { x: number; y: number; len: number; gear: boolean; flaps: boolean; pitch: number; haze: number; door: boolean } | null {
  k = ((k % AIR_CYCLE) + AIR_CYCLE) % AIR_CYCLE;
  const LEN = 400, SMALL = 120, sm = (u: number) => u * u * (3 - 2 * u), FAR = g.runwayY;
  if (k < PUSH_S) return { x: g.standX, y: g.standY, len: LEN, gear: true, flaps: false, pitch: 0, haze: 0, door: true };
  if (k < TAXI_S) { const u = (k - PUSH_S) / (TAXI_S - PUSH_S); return { x: g.standX - sm(u) * 70, y: g.standY, len: LEN, gear: true, flaps: false, pitch: 0, haze: 0, door: false }; }
  const RUN0 = g.standX - 360;
  if (k < ROLL_S) { const e = sm((k - TAXI_S) / (ROLL_S - TAXI_S)); return { x: g.standX - 70 - e * 290, y: g.standY - e * (g.standY - FAR), len: LEN - e * (LEN - SMALL), gear: true, flaps: true, pitch: 0, haze: e * 0.25, door: false }; }
  if (k < CRUISE_S) { const t = k - ROLL_S, lift = Math.max(0, k - CLIMB_S), x = RUN0 + 5 * t * t; if (x - SMALL > g.win1 + 40) return null; return { x, y: FAR - lift * lift * 0.5, len: SMALL, gear: lift < 4, flaps: lift < 12, pitch: -Math.min(14, lift * 2), haze: 0.25, door: false }; }
  const land = LEG_S + TOUCH_S, TD = g.win0 + 330;
  if (k >= land - 18 && k < land) { const u = (k - (land - 18)) / 18; return { x: TD - (1 - u) * 280, y: FAR - (1 - u) * (1 - u) * 60, len: SMALL, gear: true, flaps: true, pitch: (1 - u) * 4, haze: 0.25, door: false }; }
  if (k >= land) { const e = sm((k - land) / (AIR_CYCLE - land)); return { x: TD + 40 + e * (g.standX - TD - 40), y: FAR + e * (g.standY - FAR), len: SMALL + e * (LEN - SMALL), gear: true, flaps: e < 0.4, pitch: 0, haze: 0.25 * (1 - e), door: false }; }
  return null;
}
