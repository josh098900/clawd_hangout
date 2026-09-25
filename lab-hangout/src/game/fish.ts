// What's biting off the Pier. Rarity decides the odds; the log of what you've caught is part of
// your save (game/save.ts): it's a collection, not a competition.

import { save } from './save';

export interface Fish { name: string; rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'LEGENDARY' | 'JUNK'; cm: [number, number] }
export const FISH: Fish[] = [
  { name: 'SARDINE', rarity: 'COMMON', cm: [8, 18] }, { name: 'MACKEREL', rarity: 'COMMON', cm: [20, 40] }, { name: 'SEA BREAM', rarity: 'COMMON', cm: [18, 35] },
  { name: 'OLD BOOT', rarity: 'JUNK', cm: [26, 30] }, { name: 'SEAWEED', rarity: 'JUNK', cm: [10, 60] },
  { name: 'SEA BASS', rarity: 'UNCOMMON', cm: [30, 70] }, { name: 'SQUID', rarity: 'UNCOMMON', cm: [15, 45] }, { name: 'PUFFERFISH', rarity: 'UNCOMMON', cm: [10, 30] },
  { name: 'SWORDFISH', rarity: 'RARE', cm: [120, 300] }, { name: 'OCTOPUS', rarity: 'RARE', cm: [40, 120] },
  { name: 'MOON FISH', rarity: 'LEGENDARY', cm: [60, 90] }, { name: 'GOLDEN KOI', rarity: 'LEGENDARY', cm: [40, 70] },
];
export const ODDS: Record<Fish['rarity'], number> = { JUNK: 0.14, COMMON: 0.44, UNCOMMON: 0.28, RARE: 0.11, LEGENDARY: 0.03 };

/** Roll a catch (LOCAL mode; online the server rolls it, see 0010_fishing.sql, same odds). */
export function rollFish(): { fish: Fish; cm: number } {
  let u = Math.random(), rarity: Fish['rarity'] = 'COMMON';
  for (const k of Object.keys(ODDS) as Fish['rarity'][]) { if (u < ODDS[k]) { rarity = k; break; } u -= ODDS[k]; }
  const pool = FISH.filter((f) => f.rarity === rarity), fish = pool[Math.floor(Math.random() * pool.length)];
  return { fish, cm: Math.round(fish.cm[0] + Math.random() * (fish.cm[1] - fish.cm[0])) };
}
/** Put a catch in your fish log. */
export function logFish(name: string): { isNew: boolean; count: number } {
  const isNew = !save.data.fish.includes(name);
  if (isNew) save.update((d) => { d.fish.push(name); });
  return { isNew, count: save.data.fish.length };
}
export const fishNamed = (name: string): Fish => FISH.find((f) => f.name === name) ?? FISH[0];
