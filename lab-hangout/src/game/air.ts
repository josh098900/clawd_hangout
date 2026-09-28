// LAB AIR: the plane between the city and Iceland. Everything here is pure (no drawing, no network), run by the wall clock like
// the rocket (world/space.ts) and SARDINE 1 (game/sub.ts): one plane on a 10-minute loop, so everyone sees the same flight
// without a message.
//
//   s 0-300    LA101  the city's GATE A1 → Keflavík     (boards at the city 0-90, lands at Keflavík at 290)
//   s 300-600  LA102  Keflavík's GATE D4 → the city      (boards at Keflavík 300-390, lands at the city at 590)
//
// Each leg (k = seconds into it, 0-300):
//   0    BOARD    the door's open at this end, both ways: in for this flight, out for the last one
//   90   PUSH     doors shut, the tug pushes it back ("cabin crew, arm doors")
//   100  TAXI     the safety demo
//   116  ROLL     the take-off roll
//   124  CLIMB    wheels up; the seatbelt sign stays on
//   150  CRUISE   the seatbelt sign goes off; the drinks trolley goes round at 160-240; maybe some bumpy air
//   262  DESCEND  the seatbelt sign comes on
//   290  LAND     touchdown, and the taxi in to the gate

import { clamp, ihash } from '../engine/math';

export const AIR_CYCLE = 600, LEG_S = 300;
export const BOARD_S = 90, PUSH_S = 90, TAXI_S = 100, ROLL_S = 116, CLIMB_S = 124, CRUISE_S = 150, DESCEND_S = 262, TOUCH_S = 290;
/** The drinks trolley's round (k in the leg). */
export const TROLLEY_S = 160, TROLLEY_E = 240;
/** Dev/tests: shift this browser's plane clock (s). */
export const AIR = { skew: 0 };
/** The plane's clock (s): the wall clock, plus the test skew. */
export const airT = (nowMs = Date.now()): number => nowMs / 1000 + AIR.skew;

export type AirEnd = 'city' | 'kef';
export type AirPhase = 'board' | 'push' | 'taxi' | 'roll' | 'climb' | 'cruise' | 'descend' | 'land';
export interface Air {
  /** Which leg (the flight's seed). */
  n: number;
  from: AirEnd; to: AirEnd;
  /** LA101 (to Keflavík) or LA102 (home). */
  no: string;
  phase: AirPhase;
  /** Seconds into the leg (0-300), and left in this phase. */
  k: number; left: number;
  /** How far along the route (0 at `from`, 1 at `to`): only moves between the roll and touchdown. */
  u: number;
  /** Height, 0 on the ground to 1 at cruise. */
  alt: number;
}
const smooth = (x: number): number => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
/** Where the plane is (and what it's doing) at time T (plane-clock seconds). */
export function airAt(T: number): Air {
  const n = Math.floor(T / LEG_S), k = T - n * LEG_S, out = ((n % 2) + 2) % 2 === 0, from: AirEnd = out ? 'city' : 'kef', to: AirEnd = out ? 'kef' : 'city';
  const edges: [AirPhase, number, number][] = [['board', 0, PUSH_S], ['push', PUSH_S, TAXI_S], ['taxi', TAXI_S, ROLL_S], ['roll', ROLL_S, CLIMB_S], ['climb', CLIMB_S, CRUISE_S], ['cruise', CRUISE_S, DESCEND_S], ['descend', DESCEND_S, TOUCH_S], ['land', TOUCH_S, LEG_S]];
  const [phase, , end] = edges.find(([, a, b]) => k >= a && k < b) ?? edges[edges.length - 1];
  // the route: the take-off roll starts it, touchdown ends it (most of it's the cruise over the sea)
  const u = k < ROLL_S ? 0 : k >= TOUCH_S ? 1 : smooth((k - ROLL_S) / (TOUCH_S - ROLL_S)) * 0.3 + ((k - ROLL_S) / (TOUCH_S - ROLL_S)) * 0.7;
  const alt = k < CLIMB_S || k >= TOUCH_S ? 0 : k < CRUISE_S ? smooth((k - CLIMB_S) / (CRUISE_S - CLIMB_S)) : k < DESCEND_S ? 1 : 1 - smooth((k - DESCEND_S) / (TOUCH_S - DESCEND_S));
  return { n, from, to, no: out ? 'LA101' : 'LA102', phase, k, left: end - k, u, alt };
}
export const air = (nowMs = Date.now()): Air => airAt(airT(nowMs));
/** The plane's door is open at this end right now (boarding: in for this flight, out for the last one). */
export const doorOpenAt = (end: AirEnd, a = air()): boolean => a.phase === 'board' && a.from === end;
/** On the ground at this end (at the gate, pushing back, taxiing out, or just landed and taxiing in). */
export const onGroundAt = (end: AirEnd, a = air()): boolean => (a.from === end && a.k < CLIMB_S) || (a.to === end && a.k >= TOUCH_S);
/** In the air (between wheels up and touchdown). */
export const flying = (a = air()): boolean => a.k >= CLIMB_S && a.k < TOUCH_S;
/** Seconds until the door next opens at `end` (0 if it's open now). */
export function nextBoarding(end: AirEnd, T = airT()): number {
  const a = airAt(T); if (doorOpenAt(end, a)) return 0;
  const startIn = (e: AirEnd): number => { const base = e === 'city' ? 0 : LEG_S, t = ((T - base) % AIR_CYCLE + AIR_CYCLE) % AIR_CYCLE; return AIR_CYCLE - t; };
  return startIn(end);
}
/** Seconds until the door at `end` shuts (0 if it isn't open). */
export const closesIn = (end: AirEnd, a = air()): number => (doorOpenAt(end, a) ? PUSH_S - a.k : 0);
/** The seatbelt sign: on for the take-off and the climb, the descent and landing, and any bumpy air. */
export const seatbelt = (a = air()): boolean => (a.k >= TAXI_S && a.k < CRUISE_S) || (a.k >= DESCEND_S) || turbulence(a) > 0;

/** Bumpy air, on 3 legs in 5: 8-14 s of it, somewhere in the cruise. 0..1 how hard it's shaking now. */
export function turbulence(a = air()): number {
  const s = ihash(Math.imul(a.n, 2654435) + 99);
  if (s % 5 >= 3) return 0;
  const t0 = 176 + (ihash(s + 1) % 60), d = 8 + (ihash(s + 2) % 7), k = a.k - t0;
  if (k < 0 || k > d) return 0;
  return Math.min(1, k / 1.5, (d - k) / 1.5) * (0.6 + 0.4 * Math.abs(Math.sin(k * 7.3)));
}
/** The turbulence window of leg n, if it has one: [start, end] k. */
export function turbWindow(n: number): [number, number] | null { const s = ihash(Math.imul(n, 2654435) + 99); if (s % 5 >= 3) return null; const t0 = 176 + (ihash(s + 1) % 60); return [t0, t0 + 8 + (ihash(s + 2) % 7)]; }
/** About one leg in 12 (one in 7 of the bumpy ones) the oxygen masks drop by mistake ("...sorry folks, wrong button"). */
export const masksDrop = (n: number): boolean => turbWindow(n) !== null && ihash(Math.imul(n, 7919) + 5) % 7 === 0;

/** How hard the cabin's shaking (0..1): the take-off roll, wheels up, bumpy air, touchdown. */
export function airShake(a = air()): number {
  const k = a.k;
  if (k >= ROLL_S && k < CLIMB_S) return 0.15 + 0.35 * ((k - ROLL_S) / (CLIMB_S - ROLL_S));
  if (k >= CLIMB_S && k < CLIMB_S + 3) return 0.3;
  if (k >= TOUCH_S && k < TOUCH_S + 1.2) return 0.8 * (1 - (k - TOUCH_S) / 1.2);
  return turbulence(a) * 0.6;
}

/** Your seat on the boarding pass: from your id, one of the 12 (rows 1-6, A or C). */
export function seatOf(id: string): { row: number; letter: 'A' | 'C'; i: number } {
  let h = 7; for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
  const i = h % 12; return { row: 1 + Math.floor(i / 2), letter: i % 2 ? 'C' : 'A', i };
}

/** Where each door along the way puts you (the rooms and the map all use these, so they agree). */
export const AIR_ARRIVE = {
  /** THE AIRPORT, up the escalator from the trains */
  airport: { x: 64, y: 540 },
  /** THE AIRPORT's GATE A1, off the plane */
  gate: { x: 1846, y: 500 },
  /** THE PLANE, in at its L1 door (from either end) */
  plane: { x: 1046, y: 520 },
  /** KEFLAVÍK's GATE D4, off the plane */
  kef: { x: 110, y: 530 },
  /** KEFLAVÍK, in through the doors from the bus */
  kefExit: { x: 1330, y: 520 },
  /** REYKJAVÍK's bus stop, off the bus from the airport */
  reykjavik: { x: 70, y: 500 },
};
