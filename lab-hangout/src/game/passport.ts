// THE PASSPORT (step 19): an ink stamp for every place in Iceland, the first time you're there. Kept in your save (game/save.ts
// `stamps`: id -> the day of your first visit), merged by keeping the earliest. Push 1 has the first five; the tour bus's stops add
// the rest (pushes 2-4), and the ICELANDER badge is for every one of them (push 4).

import { save } from './save';

export interface Stamp { id: string; name: string; push: 1 | 2 | 3 | 4; ink: [number, number, number]; shape: 'rect' | 'round' | 'oval' | 'tall'; hint: string }
export const STAMPS: Stamp[] = [
  { id: 'kef', name: 'KEFLAVIK', push: 1, ink: [40, 80, 170], shape: 'rect', hint: 'passport control, when you land' },
  { id: 'reykjavik', name: 'REYKJAVIK', push: 1, ink: [190, 50, 50], shape: 'round', hint: 'take the bus into town' },
  { id: 'tower', name: 'THE TOWER', push: 1, ink: [110, 60, 150], shape: 'tall', hint: 'the view from the top of the big church' },
  { id: 'voyager', name: 'THE SUN VOYAGER', push: 1, ink: [30, 60, 110], shape: 'oval', hint: 'the steel ship on the seafront' },
  { id: 'aurora', name: 'THE NORTHERN LIGHTS', push: 1, ink: [30, 140, 90], shape: 'round', hint: 'photograph them over the bay, after dark' },
  { id: 'seljaland', name: 'SELJALANDSFOSS', push: 2, ink: [40, 110, 170], shape: 'tall', hint: 'the tour bus: coming soon' },
  { id: 'skoga', name: 'SKOGAFOSS', push: 2, ink: [40, 110, 170], shape: 'tall', hint: 'the tour bus: coming soon' },
  { id: 'beach', name: 'REYNISFJARA', push: 2, ink: [40, 40, 50], shape: 'rect', hint: 'the tour bus: coming soon' },
  { id: 'wreck', name: 'THE PLANE WRECK', push: 2, ink: [110, 110, 120], shape: 'oval', hint: 'the tour bus: coming soon' },
  { id: 'thingvellir', name: 'THINGVELLIR', push: 3, ink: [90, 110, 60], shape: 'rect', hint: 'the tour bus: coming soon' },
  { id: 'geysir', name: 'GEYSIR', push: 3, ink: [60, 140, 180], shape: 'round', hint: 'the tour bus: coming soon' },
  { id: 'gullfoss', name: 'GULLFOSS', push: 3, ink: [190, 140, 40], shape: 'tall', hint: 'the tour bus: coming soon' },
  { id: 'lagoon', name: 'THE LAGOON', push: 3, ink: [80, 170, 190], shape: 'oval', hint: 'the tour bus: coming soon' },
  { id: 'glacier', name: 'THE GLACIER', push: 4, ink: [80, 140, 200], shape: 'rect', hint: 'the tour bus: coming soon' },
  { id: 'icecave', name: 'THE ICE CAVE', push: 4, ink: [60, 110, 180], shape: 'round', hint: 'the tour bus: coming soon' },
  { id: 'jokulsarlon', name: 'JOKULSARLON', push: 4, ink: [50, 120, 170], shape: 'oval', hint: 'the tour bus: coming soon' },
  { id: 'diamond', name: 'DIAMOND BEACH', push: 4, ink: [40, 40, 60], shape: 'rect', hint: 'the tour bus: coming soon' },
];
/** The pushes built so far (the passport shows the rest as coming soon). */
export const PUSH_NOW = 1;
/** Today, as a day number (days since 1970). */
export const dayNo = (ms = Date.now()): number => Math.floor(ms / 86400000);
export const stamped = (id: string): boolean => !!save.data.stamps[id];
/** Stamp it (the first time only): true if it's new. */
export function stampIt(id: string): boolean {
  if (stamped(id) || !STAMPS.some((s) => s.id === id)) return false;
  save.update((d) => { d.stamps = { ...d.stamps, [id]: dayNo() }; });
  return true;
}
/** How many stamps you have, of how many there are. */
export const stampCount = (): { got: number; of: number } => ({ got: STAMPS.filter((s) => stamped(s.id)).length, of: STAMPS.length });
