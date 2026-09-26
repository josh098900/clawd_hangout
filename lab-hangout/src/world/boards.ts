// The city map's boards out in the world (the Square's kiosk, the Subway's line map, the station's chart):
// features/map.ts keeps `near` up to date (when you last walked up to the one in your room, or -1), and the
// board lights up a step while you're there.
export const BOARD = { near: -1 };
/** How much a board is lit up for you (0..1): up quickly as you arrive, down as you leave. */
export const boardGlow = (a: number): number => (BOARD.near < 0 ? 0 : Math.min(1, (a - BOARD.near) / 0.25));
