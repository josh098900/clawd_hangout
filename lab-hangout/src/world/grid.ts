// THE REACTOR and the city: whether a reactor shift is on (and until when), and the last meltdown (both epoch ms).
// features/reactor.ts keeps it up to date (from the reactor's room state while you're in there, and the lobby's
// 'grid' messages everywhere else). The Square's POWERED BY sign and its lights, the corridor's RADIATION display,
// the map's cooling tower and everyone glowing green in the Science Wing all read it.

export const GRID = { until: 0, melt: 0 };
/** A shift is running now. */
export const gridOn = (now = Date.now()): boolean => now < GRID.until;
/** Seconds since the last meltdown (Infinity if none). */
export const meltAgo = (now = Date.now()): number => (GRID.melt ? (now - GRID.melt) / 1000 : Infinity);
/** How green everyone in the Science Wing glows (1 right after a meltdown, fading out over a minute). */
export const meltGlow = (now = Date.now()): number => { const s = meltAgo(now); return s < 0 || s > 60 ? 0 : s < 50 ? 1 : (60 - s) / 10; };
