// THE ICELAND EXPLORER (step 19, push 2): the tour bus round the south coast. Pure (no drawing, no network), run by the wall clock like
// LAB AIR (game/air.ts): one bus on a 370-second loop, so everyone sees the same bus in the same place.
//
//   REYKJAVÍK  30 s at the stop, then 70 s along the Ring Road
//   SELJALANDSFOSS  20 s, then 40 s
//   SKÓGAFOSS  20 s, then 30 s
//   THE PLANE WRECK  20 s, then 40 s
//   REYNISFJARA  20 s, then the long drive home (80 s)
//
// The doors open only while it's at a stop. Its place on the road (km from Reykjavík) runs the window view and KATLA's stories.

import type { RoomId } from '../world/room';

/** The stops, in order round the loop. */
export const STOPS: RoomId[] = ['reykjavik', 'seljaland', 'skoga', 'wreck', 'beach'];
export const STOP_NAMES = ['REYKJAVIK', 'SELJALANDSFOSS', 'SKOGAFOSS', 'THE PLANE WRECK', 'REYNISFJARA'];
/** Seconds at each stop, and driving on from it to the next. */
export const DWELL = [30, 20, 20, 20, 20], DRIVE = [70, 40, 30, 40, 80];
export const TOUR_CYCLE = DWELL.reduce((s, d) => s + d, 0) + DRIVE.reduce((s, d) => s + d, 0);
/** Each stop's place on the Ring Road, in km from Reykjavík. */
export const STOP_KM = [0, 128, 156, 168, 182];
/** How long the bus takes to pull in (at the end of a drive) and to pull away (at the start of one), s. */
export const PULL_S = 6;
/** Dev/tests: shift this browser's bus clock (s). */
export const TOUR = { skew: 0 };
export const tourT = (nowMs = Date.now()): number => nowMs / 1000 + TOUR.skew;

export interface Tour {
  /** Which lap. */
  n: number;
  /** Seconds into the lap. */
  k: number;
  phase: 'stop' | 'drive';
  /** At a stop: which one. Driving: the one it left. */
  from: number;
  /** The next stop. */
  to: number;
  /** Seconds left in this phase, and how far through a drive it is (0..1; 0 at a stop). */
  left: number; u: number;
  /** Where it is on the road (km from Reykjavík), and which way it's heading (1 east, out along the coast; -1 home). */
  km: number; dir: 1 | -1;
}
const ease = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
/** Where the bus is at time T (bus-clock seconds). */
export function tourAt(T: number): Tour {
  const n = Math.floor(T / TOUR_CYCLE), k = T - n * TOUR_CYCLE;
  let t = 0;
  for (let s = 0; s < STOPS.length; s++) {
    const nx = (s + 1) % STOPS.length;
    if (k < t + DWELL[s]) return { n, k, phase: 'stop', from: s, to: nx, left: t + DWELL[s] - k, u: 0, km: STOP_KM[s], dir: s === STOPS.length - 1 ? -1 : 1 };
    t += DWELL[s];
    if (k < t + DRIVE[s]) {
      const raw = (k - t) / DRIVE[s], u = raw * 0.8 + ease(raw) * 0.2; // (slowing into each stop, pulling away from it)
      return { n, k, phase: 'drive', from: s, to: nx, left: t + DRIVE[s] - k, u, km: STOP_KM[s] + (STOP_KM[nx] - STOP_KM[s]) * u, dir: nx === 0 ? -1 : 1 };
    }
    t += DRIVE[s];
  }
  return { n, k, phase: 'stop', from: 0, to: 1, left: 0, u: 0, km: 0, dir: 1 }; // (never: k < TOUR_CYCLE)
}
export const tour = (nowMs = Date.now()): Tour => tourAt(tourT(nowMs));
/** The stop (index) for a room, or -1. */
export const stopOf = (room: RoomId): number => STOPS.indexOf(room);
/** The bus is at stop s with its doors open. */
export const busAt = (s: number, t = tour()): boolean => t.phase === 'stop' && t.from === s;
/** Seconds until the bus is next at stop s (0 while it's there). */
export function nextBus(s: number, T = tourT()): number {
  if (busAt(s, tourAt(T))) return 0;
  let start = 0; for (let i = 0; i < s; i++) start += DWELL[i] + DRIVE[i];
  const k = ((T - start) % TOUR_CYCLE + TOUR_CYCLE) % TOUR_CYCLE;
  return TOUR_CYCLE - k;
}
/**
 * Where the bus stands at stop s, for drawing it there: 0 parked, -1..0 pulling in (from off to the left), 0..1 pulling away (off
 * to the left again, it turns round), or null when it's nowhere near.
 */
export function busPose(s: number, t = tour()): number | null {
  if (t.phase === 'stop') return t.from === s ? 0 : null;
  if (t.to === s && t.left < PULL_S) return -(t.left / PULL_S);
  const since = DRIVE[t.from] - t.left;
  if (t.from === s && since < PULL_S) return since / PULL_S;
  return null;
}
