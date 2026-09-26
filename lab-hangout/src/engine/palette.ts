// Every colour in the game lives here as an [r,g,b] token. Never write a raw colour
// in a draw call unless it is a one-off tint of a token (see shade()/M() in pixel.ts).

export type RGB = [number, number, number];

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const table = <T extends Record<string, string>>(o: T): { [K in keyof T]: RGB } => {
  const out = {} as { [K in keyof T]: RGB };
  for (const k in o) out[k] = hex(o[k]);
  return out;
};

/** Global palette (night city, lasers, props). Names match the original film. */
export const K = table({
  EYE: '#141413', WHITE: '#FFFFFF', PINK: '#FF8CA8',
  COAT: '#F7F7F3', COAT_SH: '#D5D7D1', COAT_LN: '#AEB2AA',
  YEL: '#F2C230', YEL_HI: '#FFE07A', YEL_DK: '#C9981A', NAVY: '#2E3A66', NAVY_L: '#3F4E8A', BROWN: '#8A5A3A', PAPER: '#FAF8F2', BLACK: '#15191B',
  BRICK: '#5E3228', BRICK2: '#6B3A2D', BRICK3: '#52291F', MORTAR: '#3A1E18',
  SKY0: '#060A1C', SKY1: '#141A44', SKY2: '#2A2A63', CITY0: '#11163A', CITY1: '#181F48', CITY2: '#1F2754', WIN_Y: '#FFD27A', WIN_B: '#8FE3FF', TOWER: '#0C1028',
  PAVE: '#262B4A', PAVE2: '#2D3356',
  CYAN: '#5FE7FF', CYAN_HI: '#C8F7FF', MAG: '#FF5FD2', GOLD: '#FFD65A', RED: '#E6414F',
  WOOD: '#8A5A3A', WOOD_HI: '#A87450', STEEL_POST: '#3A4166',
  OUTLINE: '#160C2C',
  PIGEON: '#8C93A8', PIGEON_DK: '#5B6178', PIGEON_LT: '#B9BFD0', PIGEON_NECK: '#6FAF96', BEAK: '#E8C9A0', FEET: '#E0785A',
  VAC: '#3C424F', VAC_HI: '#7A8394', VAC_DK: '#262A33',
  GREEN_INK: '#2F9A5A',
  POPCORN: '#FFF1C2', POPCORN_HI: '#FFFBEA', SODA: '#4A7BE0', STRAW: '#FF5F7A', CRUMB: '#E8C48A',
});

/** The Square by day (the night set is K). */
export const DK = table({
  SKY0: '#5E9BD6', SKY1: '#9CCBEC', SKY2: '#F0DDBF', CITY0: '#8A96B8', CITY1: '#6E7AA0', CITY2: '#8793B8', WIN: '#C9DDF0', WIN2: '#E6EEF8',
  TOWER: '#4A5478', TOWER2: '#5A6690', PAVE: '#5E6384', PAVE2: '#686E90', SUN: '#FFE9A8', SUN_HI: '#FFF7D6', CLOUD: '#F4F7FB',
});

/** The cinema: velvet, gold and a silver screen. */
export const CK = table({
  CEIL: '#1A0E16', WALL: '#5A1A28', WALL_DK: '#43121E', WALL_HI: '#7A2A38', PAT: '#6C2231', GOLD: '#D9A441', GOLD_HI: '#F2D27A', GOLD_DK: '#9C7026',
  CURTAIN: '#9E1B2E', CURTAIN_HI: '#C8323F', CURTAIN_DK: '#6E0F1E', CARPET: '#6B1424', CARPET2: '#7E1B2C', CARPET_DOT: '#C9953A',
  FLOOR: '#231620', FLOOR2: '#2B1B27', SCREEN: '#DCDDE6', FRAME: '#120A10', SEAT: '#A31E32', SEAT_HI: '#D0404E', SEAT_DK: '#6A1220', ARM: '#2A1A20', BASE: '#1E1018',
  COUNTER: '#3B2230', COUNTER_TOP: '#E8D9C0', GLASS: '#BFE6F2', CHROME: '#C8D2D7', CHROME_DK: '#8A969B', PANEL: '#3A1D34', PANEL2: '#2E1729', BOOTH: '#3C2A5C', BOOTH_HI: '#56407E', BOARD: '#141014',
});

/** The Dev Den: dusky blue walls, warm wood, lamp light, rain. */
export const NK = table({
  CEIL: '#1C2430', BEAM: '#151B24', WALL: '#2B3A4A', WALL2: '#324456', WALL_HI: '#3C5066', TRIM: '#1D2733',
  WOOD: '#8A5A3A', WOOD_HI: '#A87450', WOOD_DK: '#6A4128', FLOOR: '#5E412E', FLOOR2: '#6B4A34', FLOOR_LN: '#4A3223',
  RUG: '#3F6F8A', RUG2: '#35607A', RUG_EDGE: '#E3B083',
  GLASS: '#1A2440', CITY: '#253152', RAIN: '#9FB8D8', DESK: '#B98A5E', DESK_HI: '#D2A578', DESK_DK: '#8C6440',
  LAPTOP: '#3A3F4A', LAPTOP_HI: '#565D6C', CHAIR: '#2A2F3A', CHAIR_HI: '#3A414F', RACK: '#1E2229', RACK_HI: '#343A45',
  CORK: '#B8875A', CORK_DK: '#8F6440', SCREEN: '#0E1620', BEAN1: '#E07A5F', BEAN2: '#81B29A', BEAN_DK: '#2A2F3A',
  CAT: '#E89A4A', CAT_DK: '#B86A28', CAT_HI: '#F6C07A', DUCK: '#FFD24A', DUCK_DK: '#E0A820', BEAK: '#FF8A3D',
});

/** The Rooftop Garden. */
export const RK = table({
  DECK: '#8A6A4A', DECK2: '#7E6044', DECK_LN: '#5E4630', GRAVEL: '#5A5E6A', GRAVEL2: '#666A76', PARAPET: '#8E5A48', PARAPET_HI: '#B07460', PARAPET_DK: '#6A4034',
  HEDGE: '#2F8A5E', HEDGE_HI: '#52B07A', HEDGE_DK: '#1F5E42', PLANTER: '#6A4A36', PLANTER_HI: '#86603F', HUT: '#4A5468', HUT_HI: '#5E6A82', HUT_DK: '#363E50',
  NET: '#E8D9B0', NET_DK: '#B8A67E', POLE: '#3A3228', SCOPE: '#C8D2D7', SCOPE_DK: '#6C7A82', CRATE: '#8C5A34', CRATE_DK: '#6A4226',
});

/** The Crypt: cold stone, moss, torchlight, gold. */
export const XK = table({
  STONE: '#3A3E4A', STONE2: '#444956', STONE_HI: '#565C6C', STONE_DK: '#2A2D36', MORTAR: '#23262E', FLOOR: '#2E313A', FLOOR2: '#353946',
  MOSS: '#3F6B4A', RUNE: '#7CF2D0', RUNE_OFF: '#2E4A48', PLATE: '#5A5E6C', PLATE_ON: '#7CF2D0', BLOCK: '#6A6E7C', BLOCK_HI: '#848898', BLOCK_DK: '#4A4E5A',
  GOLD: '#FFD65A', GOLD_DK: '#B8902A', CHEST: '#7A4A2A', CHEST_DK: '#5A341C', FLAME: '#FFB040', FLAME_HI: '#FFF0A0', GHOST: '#E8F0FF',
});

/** The Pier: night sea, sand, weathered wood, firelight. */
export const PK = table({
  SEA0: '#0B1A3A', SEA1: '#12295A', SEA2: '#1C3A72', FOAM: '#CFE6FF', SAND: '#C8A878', SAND2: '#B8986A', SAND_DK: '#9A7C54', WET: '#8C7454',
  WOOD: '#7A5A3E', WOOD_HI: '#9A7652', WOOD_DK: '#553E2A', ROCK: '#4A4E5A', ROCK_HI: '#626878', LIGHT: '#F2F0E6', LIGHT_RED: '#C8404A',
  PALM: '#2F7A4E', PALM_DK: '#1F5A38', TRUNK: '#8A6A44', FIRE: '#FF9A3A', FIRE_HI: '#FFE08A', LOG: '#6A4428', CRAB: '#E0604A',
  MARSH: '#FAF6EE', TOAST: '#E0A850', BURNT: '#3A2A20',
});

/** Space: the rocket, the station's white modules, Earth, grow lights, the pad. */
export const SK = table({
  VOID: '#03040C', VOID2: '#070A1C', STAR: '#DCE4FF', STAR_DIM: '#6C74A8',
  HULL: '#E4E8EE', HULL_HI: '#FFFFFF', HULL_SH: '#B4BCC8', HULL_DK: '#848E9E', SEAM: '#9AA4B4', PANEL: '#CDD3DC', PANEL2: '#C2C9D3',
  TRIM: '#3A4256', TRIM_HI: '#56607A', RAIL: '#F2C230', RAIL_DK: '#C9981A', FLOOR: '#5A6276', FLOOR2: '#646C80', FLOOR_LN: '#454C5E',
  NOSE: '#E6414F', NOSE_DK: '#B02E3A', FIN: '#E6414F', WINDOW: '#2E3A66', GLASS: '#8FD8FF', GLASS_HI: '#DFF6FF',
  SOLAR: '#2A3F8A', SOLAR_HI: '#4A66C8', SOLAR_LN: '#1A2A60', GOLD_FOIL: '#D9A441', GOLD_FOIL_HI: '#F2D27A',
  OCEAN: '#1E5AAE', OCEAN2: '#2A6CC4', OCEAN_DK: '#143E80', LAND: '#3E9A5A', LAND2: '#6AAE4A', DESERT: '#C8A060', ICE: '#EEF4FF', CLOUD: '#F4F7FB',
  NIGHTSIDE: '#0A1430', CITYLIGHT: '#FFD27A', ATMOS: '#7FC8FF',
  GROW: '#FF5FD2', GROW2: '#9A5CFF', MELON: '#3F8FD0', MELON_HI: '#8FD8FF', MELON_DK: '#2A5A98', VINE: '#3FAA7A', VINE_DK: '#2A7A56', TRAY: '#6A7488', WATER: '#5FB8FF',
  CONCRETE: '#8C8E96', CONCRETE2: '#9A9CA4', CONCRETE_DK: '#6A6C74', HAZ: '#F2C230', HAZ_DK: '#202226', TOWER: '#B8462E', TOWER_DK: '#80301E',
  FLAME: '#FFB040', FLAME_HI: '#FFF0A0', SMOKE: '#D8DCE4', SMOKE_DK: '#A8AEBA', SCREEN: '#0A1A1E', LED: '#7CF29C', LED_RED: '#FF5A5A',
});

/** The Moon (world/moon.ts, lander.ts, moonbase.ts): grey regolith lit hard from the top-left, glowing crystals, the base's warm panels. */
export const MN = table({
  REG: '#9C9CA6', REG2: '#8E8E9A', REG_HI: '#BCBCC6', REG_DK: '#74747F', REG_DK2: '#5A5A68', REG_SH: '#46465A',
  HILL: '#80808E', HILL2: '#686878', HILL3: '#52526A',
  CRYSTAL: '#5FE7FF', CRYSTAL2: '#B48CFF', CRYSTAL_HI: '#E6FFFF', CRYSTAL_DK: '#2A8FB0',
  BASE: '#EAE4D8', BASE2: '#DCD5C6', BASE_HI: '#FFFBF2', BASE_SH: '#B8B0A0', BASE_DK: '#8C8474', ORANGE: '#E8783C', ORANGE_DK: '#B45428',
  DOME: '#8FD8C8', DOME_HI: '#D8FFF4', DOME_DK: '#4E8C84', LEAF: '#5FC878', LEAF_DK: '#2F8A52', TATER: '#C8965A',
  BUGGY: '#F2F0EA', BUGGY_SH: '#C0BCB2', TYRE: '#3A3A46', TYRE_HI: '#5A5A6A',
});

/** The lab's own palette (pale tile, teal wainscot, steel). */
export const LK = table({
  CEIL: '#27333A', BEAM: '#1C252A', BEAM_HI: '#33424A', DUCT: '#5C6C73', DUCT_HI: '#77888F', DUCT_DK: '#44525A', PIPEB: '#4A5B63', CABLE: '#141B1F', SOFFIT: '#3C4A51',
  WALL: '#D3E5DF', GROUT: '#BFD5CE', WAIN: '#9FC0B8', WAIN_HI: '#B8D3CC', WAIN_DK: '#86ABA2', BASE: '#33454B',
  FLOOR: '#B8C8C5', FLOOR2: '#AEBFBC', FGROUT: '#9AADAA',
  STEEL: '#9AA8AF', STEEL_HI: '#C8D2D7', STEEL_DK: '#6C7A82', STEEL_DK2: '#4B5860',
  WB: '#FBFCFB', WB_FR: '#8A969B', MK: '#2F3437', MKB: '#3357B0', MKR: '#D0473A',
  COUNTER: '#E6ECEA', COUNTER_E: '#C5D0CE', CAB: '#8FAAA4', CAB_DK: '#78948E', TEAL: '#2F7A82', BLACK: '#15191B',
  TABLE: '#EDF2F1', TABLE_E: '#BFCBC9', TABLE_L: '#55636A', PAPER: '#FAF8F2', YEL: '#F2C230',
  SOFA: '#3F6F8A', SOFA_HI: '#5A8FAA', SOFA_DK: '#2C5064', RUG: '#C98B5E', RUG2: '#B57A50', RUG_EDGE: '#E3B083',
  LEAF: '#2F8A5E', LEAF_HI: '#52B07A', LEAF_DK: '#1F5E42', POT: '#B8664A', POT_DK: '#8E4A34',
});

/** Player body colours. Index is what goes over the network (look.c). */
export const BODY: { name: string; c: RGB }[] = [
  { name: 'MINT', c: hex('#22C5A0') },
  { name: 'SKY', c: hex('#5AD1FF') },
  { name: 'GRAPE', c: hex('#7B61FF') },
  { name: 'BUBBLEGUM', c: hex('#E86A92') },
  { name: 'SUN', c: hex('#F2C230') },
  { name: 'TOMATO', c: hex('#E6564F') },
  { name: 'LIME', c: hex('#96D246') },
  { name: 'CLOUD', c: hex('#DCE0EC') },
  { name: 'CLAY', c: hex('#D97757') },
];

/** Tiny confetti/particle palette (from the film's finale). */
export const CONFETTI: RGB[] = [hex('#FFB35C'), hex('#7B61FF'), hex('#22C5A0'), hex('#5AD1FF'), hex('#FFD65A'), hex('#E86A92')];

/** Colour of the "night" that DIM fades towards. */
export const NIGHT: RGB = [6, 9, 20];
