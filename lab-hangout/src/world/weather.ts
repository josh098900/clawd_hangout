// Things in the sky that everyone shares because they come from the wall clock: the wind.
// (Kites in the Park fly on it; shared weather comes later, see docs/PLAN.md step 7.)

/** The wind right now: dx = -1..1 which way it blows (and how hard), gust = 0..1. */
export function wind(nowMs = Date.now()): { dx: number; gust: number } {
  const t = nowMs / 1000;
  const dx = Math.sin(t / 97) * 0.7 + Math.sin(t / 23 + 1.3) * 0.3;
  const gust = 0.5 + 0.5 * Math.sin(t / 7.3) * Math.sin(t / 3.1 + 0.4);
  return { dx: Math.max(-1, Math.min(1, dx)), gust };
}
