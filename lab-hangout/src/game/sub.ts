// SARDINE 1, the City Aquarium's submarine: its timetable, from the wall clock like the rocket's and the lander's, so
// everyone sees the same dive without a message. It boards in the aquarium's sub pen, dives, and comes back up.
// (Push 1, the aquarium: the sub is on SEA TRIALS, so it dives and surfaces empty. Push 2 takes you down in it.)
//
//   k = 0    BOARDING    the hatch is open in the pen (the horn at 60, the bell at 80)
//   k = 90   SUBMERGE    the hatch shuts and it sinks out of the pen
//   k = 100  THE DIVE    out at sea
//   k = 420  HOME        the autopilot brings it back to the aquarium
//   k = 470  SURFACE     it rises in the pen and the hatch pops open at 480 (= 0)

export const SUB_CYCLE = 480, SUB_BOARD = 90, SUB_DOWN = 100, SUB_HOME = 420, SUB_UP = 470, SUB_HORN = 60;
/** Dev/tests: shift this browser's dive clock (s). */
export const SUB = { skew: 0 };
export type DivePhase = 'board' | 'submerge' | 'dive' | 'home' | 'surface';
/** Where SARDINE 1 is: `k` = seconds into the loop, `left` = seconds left in this phase, `n` = which dive. */
export interface Dive { phase: DivePhase; k: number; left: number; n: number }
export function dive(nowMs = Date.now()): Dive {
  const s = nowMs / 1000 + SUB.skew, n = Math.floor(s / SUB_CYCLE), k = s - n * SUB_CYCLE;
  if (k < SUB_BOARD) return { phase: 'board', k, left: SUB_BOARD - k, n };
  if (k < SUB_DOWN) return { phase: 'submerge', k, left: SUB_DOWN - k, n };
  if (k < SUB_HOME) return { phase: 'dive', k, left: SUB_HOME - k, n };
  if (k < SUB_UP) return { phase: 'home', k, left: SUB_UP - k, n };
  return { phase: 'surface', k, left: SUB_CYCLE - k, n };
}
/** How far down the sub is in the pen: 0 = afloat at the dock, 1 = gone under. It sinks as a dive starts and rises as one ends. */
export function penSink(d = dive()): number {
  if (d.phase === 'board') return 0;
  if (d.phase === 'submerge') return (d.k - SUB_BOARD) / (SUB_DOWN - SUB_BOARD);
  if (d.phase === 'surface') return 1 - (d.k - SUB_UP) / (SUB_CYCLE - SUB_UP);
  return 1;
}
/** Seconds until it's back at the dock with its hatch open (0 while boarding). */
export const backIn = (d = dive()): number => (d.phase === 'board' ? 0 : SUB_CYCLE - d.k);
