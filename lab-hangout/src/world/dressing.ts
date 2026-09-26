// Seasonal dressing shared by Halloween (world/halloween.ts) and Winter (world/winter.ts): where strings of
// lights hang in each room, how they're drawn, and cobwebs / wreaths over doors. Each season brings its own
// colours; the places are the same, so a new room only needs adding here once.

import type { RGB } from '../engine/palette';
import { r, lit, Gd } from '../engine/pixel';
import type { Door, Room, RoomId } from './room';

type Line = [number, number, number, number];
const STATION_LIGHTS: Line[] = [[10, 330, 650, 330], [650, 330, 1290, 330]];
/** Strings of lights: [x0, y0, x1, y1] (they sag between the ends), high on the back wall where the camera sees them. */
export const LIGHT_LINES: Partial<Record<RoomId, Line[]>> = {
  plaza: [[161, 492, 521, 492], [701, 492, 1061, 492]],
  lab: [[10, 236, 250, 236], [540, 226, 740, 226], [740, 226, 950, 226]], den: [[10, 250, 490, 250], [490, 250, 990, 250]],
  cinema: [[10, 290, 390, 290]], stage: [[140, 126, 540, 126], [540, 126, 940, 126]], arcade: [[10, 326, 540, 326], [540, 326, 1090, 326]],
  diner: [[10, 336, 700, 336], [700, 336, 1390, 336]], lofts: [[10, 330, 450, 330], [450, 330, 890, 330]], station: [[10, 290, 750, 290], [750, 290, 1490, 290]],
  pier: [[380, 380, 900, 380]], karts: [[10, 340, 650, 340], [650, 340, 1290, 340]],
  subway: STATION_LIGHTS, parkstn: STATION_LIGHTS, dinerstn: STATION_LIGHTS, kartstn: STATION_LIGHTS,
  flat: [[20, 300, 940, 300]], flatbed: [[20, 300, 740, 300]], flatkit: [[20, 300, 700, 300]],
  // the Science Wing: just under the ceiling, in the gaps between the door signs, the RADIATION display and BONEY's corner
  wing: [[90, 337, 280, 337], [500, 337, 720, 337], [826, 337, 938, 337]], reactor: [[8, 321, 160, 321]],
  chem: [[100, 333, 300, 333], [400, 333, 600, 333], [680, 333, 880, 333], [890, 333, 1080, 333]],
};

/** How a season's lights look: bulb colours (in turn), how far they sag, every nth bulb blinks off, the wire. */
export interface LightStyle { bulbs: RGB[]; sag: number; offEvery: number; wire: RGB | null; off: (c: RGB) => RGB; dy: number }
export function stringLights(room: RoomId, a: number, s: LightStyle): void {
  for (const [x0, y0, x1, y1] of LIGHT_LINES[room] ?? []) {
    const n = Math.max(2, Math.floor((x1 - x0) / 14));
    for (let k = 0; k <= n; k++) {
      const u = k / n, x = Math.round(x0 + (x1 - x0) * u), y = Math.round(y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * s.sag), c = s.bulbs[k % s.bulbs.length], on = (k + Math.floor(a * 2)) % s.offEvery !== 0;
      r(x, y - 1, 1, 1, [40, 50, 44]); if (s.wire && k < n) r(x, y, Math.round((x1 - x0) / n), 1, s.wire);
      if (on) { lit(() => r(x - 1, y + s.dy, 3, 3, c)); Gd(x, y + s.dy + 1, 5, c, 0.3); } else r(x - 1, y + s.dy, 3, 3, s.off(c));
    }
  }
}

/**
 * The doors worth decorating: real doors in the back wall. Not the open edges of a set, not stairs or grates
 * in the floor, and not doors that come and go (the rocket's hatch, the train's doors).
 */
export const wallDoors = (room: Room): Door[] => room.doors.filter((d) => !d.edge && !d.route && d.area.y1 - d.area.y0 >= 50 && d.area.y0 < room.floor.y0);
