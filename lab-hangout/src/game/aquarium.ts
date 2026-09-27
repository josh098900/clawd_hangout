// THE CITY AQUARIUM's rules, kept pure (no drawing): the FISH GALLERY's tanks in order, the thank-you for a first
// donation, feeding time on the clock, and the gallery as last heard from the server (0023_aquarium.sql). The room is
// world/aquarium.ts; donating, feeding and the gift shop are features/aquarium.ts.

import type { Fish } from './fish';
import type { AqTank } from '../net/transport';

/**
 * The FISH GALLERY's twelve tanks, left to right, the top row then the bottom: the commons, the uncommons, the rares,
 * the legendaries, and the junk at the end ("the museum takes everything").
 */
export const GALLERY = ['SARDINE', 'MACKEREL', 'SEA BREAM', 'SEA BASS', 'SQUID', 'PUFFERFISH', 'SWORDFISH', 'OCTOPUS', 'MOON FISH', 'GOLDEN KOI', 'OLD BOOT', 'SEAWEED'];
/** Tokens for the first time you donate each kind (keep in step with donate_fish() in 0023_aquarium.sql): 37 for all twelve. */
export const THANKS: Record<Fish['rarity'], number> = { JUNK: 1, COMMON: 2, UNCOMMON: 3, RARE: 4, LEGENDARY: 6 };

/** The gallery as last fetched (features/aquarium.ts keeps it fresh): each tank's plaque, your biggest catch of each kind, what you've donated. */
export const GAL = { tanks: new Map<string, AqTank>(), best: {} as Record<string, number>, mine: {} as Record<string, number>, fetchedAt: 0, dirty: true };
/** How many kinds you've donated (the CURATOR badge wants all twelve). */
export const donatedKinds = (): number => GALLERY.filter((f) => f in GAL.mine).length;

// ---------- feeding time: every 15 minutes (:00, :15, :30 and :45 UTC), for 90 seconds, with a bell a minute before ----------
export const FEED_EVERY = 900, FEED_S = 90, FEED_BELL = 60;
/** Dev/tests: shift this browser's feeding clock (s). */
export const FEED = { skew: 0 };
/** `on` = the food's going in now, `k` = seconds into this 15-minute loop, `next` = seconds until the next feed starts, `n` = which feed. */
export interface Feeding { on: boolean; k: number; next: number; n: number }
export function feeding(nowMs = Date.now()): Feeding {
  const s = nowMs / 1000 + FEED.skew, n = Math.floor(s / FEED_EVERY), k = s - n * FEED_EVERY;
  return { on: k < FEED_S, k, next: FEED_EVERY - k, n };
}
