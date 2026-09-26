// THE CHEM LAB's chemistry (pure, so it can be tested): the 8 reagents, the 20 recipe-book entries (12 reactions, the
// 6 potions and the 2 two-chemist ones), what every other mix does (one of three everyday results, always the same for
// the same mix), and the effects a potion or a KA-BOOM has on you. A mix is a bitmask of reagents (bit i = reagent i),
// 2 or 3 of them: 84 mixes in all. Every browser works out the same result from the same mix, so only the mix is sent.
// world/chem.ts draws the reactions, features/chem.ts plays them. See docs/briefs/17-science-wing.md §9.

import { CH, type RGB } from '../engine/palette';

export const REAGENTS: { name: string; short: string; c: RGB }[] = [
  { name: 'FIZZ SALT', short: 'FIZZ', c: CH.FIZZ },
  { name: 'BLUE GOO', short: 'GOO', c: CH.GOO },
  { name: 'SPARK DUST', short: 'SPARK', c: CH.SPARK },
  { name: 'SLIME BASE', short: 'SLIME', c: CH.SLIME },
  { name: 'RAINBOW OIL', short: 'OIL', c: CH.OIL },
  { name: 'BUBBLE JUICE', short: 'BUBBLE', c: CH.BUBBLE },
  { name: 'GLOW POWDER', short: 'GLOW', c: CH.GLOW },
  { name: 'CRITTER TONIC', short: 'TONIC', c: CH.TONIC },
];
export const FIZZ = 0, GOO = 1, SPARK = 2, SLIME = 3, OIL = 4, BUBBLE = 5, GLOW = 6, TONIC = 7;
/** The bitmask for these reagents. */
export const mixOf = (...r: number[]): number => r.reduce((s, i) => s | (1 << i), 0);
/** The reagents in a mix, in shelf order. */
export const inMix = (mix: number): number[] => REAGENTS.map((_, i) => i).filter((i) => mix & (1 << i));
/** A real mix: 2 or 3 of the 8 reagents. */
export const okMix = (mix: unknown): mix is number => typeof mix === 'number' && Number.isInteger(mix) && mix > 0 && mix < 256 && inMix(mix).length >= 2 && inMix(mix).length <= 3;
/** Every mix there is (the 28 pairs, then the 56 triples). */
export const ALL_MIXES: number[] = [...Array(256).keys()].filter(okMix).sort((a, b) => inMix(a).length - inMix(b).length || a - b);

/** How a reaction looks (world/chem.ts draws each one). */
export type RxKind = 'foam' | 'sparkler' | 'fountain' | 'smoke' | 'ice' | 'storm' | 'lava' | 'geyser' | 'worm' | 'fireflies' | 'boom' | 'disco' | 'potion'
  | 'puff' | 'fizz' | 'sludge' | 'toothpaste' | 'confetti';

/** What a potion or a KA-BOOM does to you (Avatar.fx), for everyone to see. 0 = nothing. */
export const FX = { NONE: 0, TINY: 1, HUGE: 2, RAINBOW: 3, GLOWING: 4, BUBBLES: 5, FLOATY: 6, FRAZZLED: 7 } as const;
export const FX_MAX = 7;
export const FX_NAMES = ['', 'TINY', 'HUGE', 'RAINBOW', 'GLOWING', 'BUBBLES', 'FLOATY', 'FRAZZLED'];
/** How long a potion lasts once you drink it, and a KA-BOOM's frazzle (s). */
export const POTION_S = 30, FRAZZLE_S = 10;

export interface Reaction {
  /** Its id in your save's recipe book. */
  id: string; name: string;
  /** The recipe (a bitmask of reagents); 0 for the two-chemist ones (DUOS says what makes them). */
  mix: number;
  kind: RxKind; c: RGB;
  /** How long it plays (s). */
  dur: number;
  /** The recipe book's riddle, until you've found it. */
  hint: string;
  /** A potion: what drinking it does. */
  fx?: number;
  group: 'reaction' | 'potion' | 'duo';
}
const LILAC: RGB = [200, 180, 255], STORM: RGB = [150, 162, 196], ICE: RGB = [200, 236, 255], FIREFLY: RGB = [255, 236, 140], FLASH: RGB = [255, 250, 230];

/** The recipe book, in its order: 12 reactions, the 6 potions, the 2 two-chemist reactions. */
export const REACTIONS: Reaction[] = [
  { id: 'foam', name: 'FOAM VOLCANO', mix: mixOf(FIZZ, SLIME), kind: 'foam', c: CH.SLIME, dur: 4.5, hint: 'fizz meets slime. stand back', group: 'reaction' },
  { id: 'sparkler', name: 'SPARKLER', mix: mixOf(FIZZ, SPARK), kind: 'sparkler', c: CH.SPARK, dur: 5, hint: 'fizz, and a pinch of sparkle', group: 'reaction' },
  { id: 'fountain', name: 'BUBBLE FOUNTAIN', mix: mixOf(FIZZ, BUBBLE), kind: 'fountain', c: CH.BUBBLE, dur: 6, hint: 'fizz up some bubbles', group: 'reaction' },
  { id: 'smoke', name: 'RAINBOW SMOKE', mix: mixOf(FIZZ, OIL), kind: 'smoke', c: CH.OIL, dur: 5, hint: 'fizz the rainbow', group: 'reaction' },
  { id: 'ice', name: 'ICE CRYSTALS', mix: mixOf(FIZZ, GOO), kind: 'ice', c: ICE, dur: 6, hint: 'salt on something cold and blue', group: 'reaction' },
  { id: 'storm', name: 'STORM IN A TEACUP', mix: mixOf(GOO, BUBBLE), kind: 'storm', c: STORM, dur: 7, hint: 'blue skies, bubbly weather', group: 'reaction' },
  { id: 'lava', name: 'LAVA LAMP', mix: mixOf(GOO, OIL), kind: 'lava', c: CH.OIL, dur: 12, hint: 'goo and oil never mix. beautifully', group: 'reaction' },
  { id: 'geyser', name: 'GOO GEYSER', mix: mixOf(GOO, SLIME), kind: 'geyser', c: [60, 170, 170], dur: 3.5, hint: 'goo + slime = trouble', group: 'reaction' },
  { id: 'worm', name: 'GLOW WORM', mix: mixOf(SLIME, GLOW), kind: 'worm', c: CH.GLOW, dur: 10, hint: 'slime that glows. it wriggles', group: 'reaction' },
  { id: 'fireflies', name: 'FIREFLIES', mix: mixOf(BUBBLE, GLOW), kind: 'fireflies', c: FIREFLY, dur: 15, hint: 'glowing bubbles take flight', group: 'reaction' },
  { id: 'boom', name: 'KA-BOOM', mix: mixOf(SPARK, GLOW), kind: 'boom', c: FLASH, dur: 3, hint: 'sparks and glow. goggles on', group: 'reaction' },
  { id: 'disco', name: 'DISCO', mix: mixOf(SPARK, OIL, GLOW), kind: 'disco', c: CH.OIL, dur: 10, hint: 'sparkle, glow and every colour, all at once', group: 'reaction' },
  { id: 'tiny', name: 'TINY POTION', mix: mixOf(TONIC, GOO), kind: 'potion', c: CH.GOO, dur: 2.5, fx: FX.TINY, hint: 'tonic, and something cold and blue', group: 'potion' },
  { id: 'huge', name: 'HUGE POTION', mix: mixOf(TONIC, SLIME), kind: 'potion', c: CH.SLIME, dur: 2.5, fx: FX.HUGE, hint: 'tonic, and what slime is made of', group: 'potion' },
  { id: 'rainbow', name: 'RAINBOW POTION', mix: mixOf(TONIC, OIL), kind: 'potion', c: CH.OIL, dur: 2.5, fx: FX.RAINBOW, hint: 'tonic, and every colour', group: 'potion' },
  { id: 'glowing', name: 'GLOWING POTION', mix: mixOf(TONIC, GLOW), kind: 'potion', c: CH.GLOW, dur: 2.5, fx: FX.GLOWING, hint: 'tonic, and a little light', group: 'potion' },
  { id: 'bubbly', name: 'BUBBLES POTION', mix: mixOf(TONIC, BUBBLE), kind: 'potion', c: CH.BUBBLE, dur: 2.5, fx: FX.BUBBLES, hint: 'tonic, and bubbles', group: 'potion' },
  { id: 'floaty', name: 'FLOATY POTION', mix: mixOf(TONIC, BUBBLE, FIZZ), kind: 'potion', c: LILAC, dur: 2.5, fx: FX.FLOATY, hint: 'a bubbly tonic, with extra fizz', group: 'potion' },
  { id: 'toothpaste', name: 'ELEPHANT TOOTHPASTE', mix: 0, kind: 'toothpaste', c: CH.FOAM, dur: 26, hint: 'two chemists, two foam volcanoes, one moment', group: 'duo' },
  { id: 'confetti', name: 'CONFETTI CANNON', mix: 0, kind: 'confetti', c: CH.SPARK, dur: 7, hint: 'two sparklers at once. the cannon is watching', group: 'duo' },
];
/** The two-chemist reactions: this discovery at BOTH benches within DUO_MS, by two different players, makes that one. */
export const DUOS: Record<string, string> = { foam: 'toothpaste', sparkler: 'confetti' };
export const DUO_MS = 3000;
export const rxById = (id: string): Reaction | undefined => REACTIONS.find((r) => r.id === id);
/** The potion that has this effect. */
export const potionOf = (fx: number): Reaction | undefined => REACTIONS.find((r) => r.fx === fx);

/** What a mix does: a discovery (rx), or an everyday result. Either way, what to draw, what it's called, its colour, how long. */
export interface Outcome { rx: Reaction | null; kind: RxKind; name: string; c: RGB; dur: number }
/** The mix's colour: its reagents' colours, blended. */
export function mixColour(mix: number): RGB {
  const rs = inMix(mix); if (!rs.length) return [128, 128, 128];
  const c: RGB = [0, 0, 0]; for (const i of rs) for (let k = 0; k < 3; k++) c[k] += REAGENTS[i].c[k] / rs.length;
  return [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])];
}
/** A colour's everyday name (the smoke's). */
export function colourName(c: RGB): string {
  const [r, g, b] = c, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 36) return mx > 200 ? 'WHITE' : mx < 70 ? 'BLACK' : 'GREY';
  const h = (mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return h < 14 ? 'RED' : h < 42 ? 'ORANGE' : h < 68 ? 'YELLOW' : h < 160 ? 'GREEN' : h < 196 ? 'TEAL' : h < 255 ? 'BLUE' : h < 290 ? 'PURPLE' : h < 340 ? 'PINK' : 'RED';
}
const SLUDGE: RGB = [118, 86, 52];
/** A small hash of a mix (the same everywhere): picks which everyday result it makes. Unsigned, so only >>> and %. */
const mixHash = (mix: number): number => (Math.imul(mix + 17, 2654435761) >>> 0) >>> 5;
export function outcome(mix: number): Outcome {
  const rx = REACTIONS.find((r) => r.mix === mix) ?? null;
  if (rx) return { rx, kind: rx.kind, name: rx.name, c: rx.c, dur: rx.dur };
  const c = mixColour(mix), n = inMix(mix).length, h = mixHash(mix);
  const kind: RxKind = n === 2 ? (h % 2 ? 'fizz' : 'puff') : h % 5 < 3 ? 'sludge' : h % 5 === 3 ? 'fizz' : 'puff';
  if (kind === 'sludge') return { rx: null, kind, name: 'BROWN SLUDGE', c: SLUDGE, dur: 3.5 };
  if (kind === 'fizz') return { rx: null, kind, name: 'A FIZZY MESS', c, dur: 3 };
  return { rx: null, kind, name: colourName(c) + ' SMOKE', c, dur: 3 };
}
/** The recipe book's count: entries you've found (ids from your save). */
export const found = (ids: readonly string[]): number => REACTIONS.filter((r) => ids.includes(r.id)).length;
