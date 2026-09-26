// The places on the city map (world/map.ts draws them, features/map.ts takes you there). Kept apart from
// the art so the EXPLORER badge (game/quests.ts) and your save can use the list without the drawing code.

import type { RoomId } from '../world/room';

/** Every place the EXPLORER badge wants you to have been: the map shows a ? sticker on the ones you haven't. */
export const EXPLORE: RoomId[] = ['lab', 'den', 'roof', 'plaza', 'arcade', 'cinema', 'stage', 'subway', 'crypt', 'lofts', 'pier', 'park', 'diner', 'karts', 'station', 'spacewalk', 'moon', 'moonbase', 'wing', 'reactor'];

/**
 * Which place on the map a room is (the room itself for most). A flat is at THE LOFTS; the rides (the train, the
 * rocket, the lander) are no place of their own: they're drawn moving between them.
 */
export function placeOfRoom(id: RoomId): RoomId | null {
  if (id === 'flat' || id === 'flatbed' || id === 'flatkit') return 'lofts';
  if (id === 'train' || id === 'rocket' || id === 'lander') return null;
  return id;
}
