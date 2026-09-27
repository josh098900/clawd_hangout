// SARDINE 1, the City Aquarium's submarine. Everything here is pure (no drawing, no network), so the simulations and
// the 10,000-dive sweep in tests/golden can run it:
//   * THE TIMETABLE, from the wall clock like the rocket's and the lander's: everyone sees the same dive, no messages
//   * THE SEA: one side-view map, 3400 m long and 1200 m deep (1 px = 1 m). seabed(x) is the bottom, zoneAt(x) the zone
//   * THE SUB'S MOTION in fixed 0.1 s ticks: the helm's stick, or the CAP'N's autopilot following THE TOUR; the run home
//   * EACH DIVE'S SEED (the dive number): the mission, the troubles, the treasure, the whale, the baby octopus, the buoys
//   * THE SEA LIFE LOG: where each of the 20 creatures is right now, and whether a photo sees it
//   * THE DIVE (room state 'dive', kept by the skipper: the lowest id aboard), mergeDive, missionDone, and the pay
//
//   k = 0    BOARDING    the hatch is open in the pen (the horn at 60, the bell at 80; the hatch shuts at 86)
//   k = 90   SUBMERGE    it sinks out of the pen
//   k = 100  THE DIVE    out through the SEA GATE
//   k = 420  HOME        the autopilot races it back to the aquarium
//   k = 470  SURFACE     it rises in the pen and the hatch pops open at 480 (= 0)

import { clamp, ihash } from '../engine/math';

export const SUB_CYCLE = 480, SUB_BOARD = 90, SUB_DOWN = 100, SUB_HOME = 420, SUB_UP = 470, SUB_HORN = 60, SUB_SHUT = 86;
/** Dev/tests: shift this browser's dive clock (s). */
export const SUB = { skew: 0 };
/** The dive clock (s): the wall clock, plus the test skew. */
export const subT = (nowMs = Date.now()): number => nowMs / 1000 + SUB.skew;
export type DivePhase = 'board' | 'submerge' | 'dive' | 'home' | 'surface';
/** Where SARDINE 1 is: `k` = seconds into the loop, `left` = seconds left in this phase, `n` = which dive. */
export interface Dive { phase: DivePhase; k: number; left: number; n: number }
export function dive(nowMs = Date.now()): Dive {
  const s = subT(nowMs), n = Math.floor(s / SUB_CYCLE), k = s - n * SUB_CYCLE;
  if (k < SUB_BOARD) return { phase: 'board', k, left: SUB_BOARD - k, n };
  if (k < SUB_DOWN) return { phase: 'submerge', k, left: SUB_DOWN - k, n };
  if (k < SUB_HOME) return { phase: 'dive', k, left: SUB_HOME - k, n };
  if (k < SUB_UP) return { phase: 'home', k, left: SUB_UP - k, n };
  return { phase: 'surface', k, left: SUB_CYCLE - k, n };
}
/** How far down the sub is in the pen: 0 = afloat at the dock, 1 = gone under. It sinks as a dive starts and rises as one ends. */
export function penSink(d = dive()): number {
  if (d.phase === 'board') return 0;
  if (d.phase === 'submerge') return (d.k - SUB_BOARD) / (SUB_DOWN - SUB_BOARD);
  if (d.phase === 'surface') return 1 - (d.k - SUB_UP) / (SUB_CYCLE - SUB_UP);
  return 1;
}
/** Seconds until it's back at the dock with its hatch open (0 while boarding). */
export const backIn = (d = dive()): number => (d.phase === 'board' ? 0 : SUB_CYCLE - d.k);
/** SARDINE 1's periscope out at sea: how far out it is as a dive starts (0 to 1) and back in as it ends (1 to 0), or -1 while it's under.
 *  The Pier draws it, and while it's up UP PERISCOPE sees the surface. */
export const periscopeOut = (k: number): number => (k >= SUB_DOWN && k < SUB_DOWN + 44 ? (k - SUB_DOWN) / 44 : k >= SUB_UP - 44 && k < SUB_UP ? 1 - (k - (SUB_UP - 44)) / 44 : -1);
/** The hatch is open (you can climb in or out): boarding, until it shuts at 86. */
export const hatchOpen = (d = dive()): boolean => d.phase === 'board' && d.k < SUB_SHUT;
/** Out in the sea (the map applies): from the gate at 100 until it's back through it. */
export const atSea = (d = dive()): boolean => d.k >= SUB_DOWN && d.k < HOME_IN;

// ---------------------------------------------------------------- THE SEA ----------------------------------------------------------------
export const SEA_W = 3400, SEA_D = 1200;
/** The window shows this much sea either side of the sub (m), and above and below it. The ladder's bulkhead hides the middle. */
export const VIEW_X = 350, VIEW_Y = 58, BULK_X = 30;
/** Where the sub can go: not back into the gate's wall, not past the end of the sea, not out of the water, not into the rock. */
export const SUB_X0 = 20, SUB_X1 = 3380, SUB_Y0 = 3, HULL = 10;
/** Where the sub comes out of the gate (and goes back in). */
export const GATE = { x: 22, y: 30 };

export type ZoneId = 'harbour' | 'kelp' | 'reef' | 'wreck' | 'dropoff' | 'trench';
export const ZONES: { id: ZoneId; name: string; x0: number; x1: number }[] = [
  { id: 'harbour', name: 'THE HARBOUR', x0: 0, x1: 500 }, { id: 'kelp', name: 'THE KELP FOREST', x0: 500, x1: 1100 },
  { id: 'reef', name: 'THE CORAL REEF', x0: 1100, x1: 1700 }, { id: 'wreck', name: 'THE WRECK', x0: 1700, x1: 2250 },
  { id: 'dropoff', name: 'THE DROP-OFF', x0: 2250, x1: 2600 }, { id: 'trench', name: 'THE TRENCH', x0: 2600, x1: SEA_W },
];
export const zoneAt = (x: number): ZoneId => (ZONES.find((z) => x < z.x1) ?? ZONES[ZONES.length - 1]).id;
export const zoneName = (x: number): string => ZONES.find((z) => z.id === zoneAt(x))!.name;

/** The bottom's outline (x, depth): straight lines between these, with a little roughness added (none on the cliff's ledges). */
const PROFILE: [number, number][] = [
  [0, 42], [120, 46], [500, 58], // the harbour
  [1100, 106], // the kelp forest's slope
  [1160, 136], [1700, 144], // the reef's floor (the coral heads rise off it)
  [2250, 212], // the wreck's slope, out to the edge
  [2256, 214], [2262, 296], [2278, 300], [2286, 516], [2302, 522], [2334, 796], // the cliff: two ledges on the way down
  [2600, 846], [2640, 880], [2730, 1160], [3290, 1180], // the drop-off's foot, and down into the trench
  [3322, 900], [3400, 360], // the far wall: THE END OF THE SEA
];
/** The coral heads on the reef: centre, half-width, the top's depth. */
export const REEF_HEADS: [number, number, number][] = [[1215, 34, 104], [1330, 30, 112], [1452, 46, 98], [1568, 30, 110], [1648, 38, 106]];
/** THE LUCKY HERRING: an old steamship broken in two on the slope, the stern section, its funnel, the torn hold, the bow. */
export const WRECK = { x0: 1840, stern1: 1918, hold1: 1962, x1: 2060, deck: 146, funnel0: 1888, funnel1: 1902, funnelTop: 126, bowDeck: 150, prow: 140 };
/** The smoking vents on the trench floor (their chimneys stand up off the bottom). */
export const VENTS: [number, number, number][] = [[2955, 7, 20], [3082, 6, 16]];
function rough(x: number): number {
  const a = x < 500 ? 2 : x < 1100 ? 4 : x < 1700 ? 3 : x < 2250 ? 3 : x < 2340 ? 0 : x < 2600 ? 6 : x < 3280 ? 6 : 0;
  return a * (Math.sin(x * 0.013) * 0.6 + Math.sin(x * 0.031 + 1.3) * 0.3 + Math.sin(x * 0.077 + 2.1) * 0.1);
}
function lineAt(x: number): number {
  if (x <= PROFILE[0][0]) return PROFILE[0][1];
  for (let i = 1; i < PROFILE.length; i++) { const [x1, d1] = PROFILE[i]; if (x <= x1) { const [x0, d0] = PROFILE[i - 1]; return d0 + ((x - x0) / (x1 - x0)) * (d1 - d0); } }
  return PROFILE[PROFILE.length - 1][1];
}
/** The ground under the wreck (before the wreck's on it). */
const groundAt = (x: number): number => lineAt(x) + rough(x);
/** The sand (or rock, or ooze) at x, without the coral heads, the wreck or the vents on it (the sea's drawing puts those on). */
export const sandAt = (x: number): number => groundAt(clamp(x, 0, SEA_W));
/** The top of the coral head at x, or Infinity where there isn't one. */
export function headAt(x: number): number {
  let d = Infinity; const g = groundAt(x);
  for (const [cx, hw, top] of REEF_HEADS) { const u = (x - cx) / hw; if (Math.abs(u) < 1) d = Math.min(d, top + (g - top) * u * u); }
  return d;
}
/** The top of the wreck at x (its deck, the funnel, the torn hold), or Infinity where there's no wreck. */
export function wreckTop(x: number): number {
  const W = WRECK;
  if (x < W.x0 || x > W.x1) return Infinity;
  const g = groundAt(x);
  if (x < W.x0 + 12) return W.deck + ((W.x0 + 12 - x) / 12) * (g - W.deck); // the stern curving down to the sand
  if (x >= W.funnel0 && x <= W.funnel1) return W.funnelTop;
  if (x < W.stern1) return W.deck;
  if (x < W.hold1) return g - 4; // the torn hold: open right down to its floor
  if (x > W.x1 - 10) return W.prow + ((x - (W.x1 - 10)) / 10) * (g - W.prow); // the prow, tilted up
  return W.bowDeck + ((x - W.hold1) / (W.x1 - 10 - W.hold1)) * (W.prow - W.bowDeck);
}
/** The bottom's depth at x (m): the sand, the coral heads, the wreck, the cliff, the vents' chimneys. */
export function seabed(x: number): number {
  let d = groundAt(clamp(x, 0, SEA_W));
  for (const [cx, hw, top] of REEF_HEADS) { const u = (x - cx) / hw; if (Math.abs(u) < 1) d = Math.min(d, top + (d - top) * u * u); }
  d = Math.min(d, wreckTop(x));
  for (const [vx, hw, h] of VENTS) if (Math.abs(x - vx) <= hw) d = Math.min(d, groundAt(vx) - h * (1 - Math.abs(x - vx) / (hw * 2.2)));
  return d;
}
/** Is (x, y) in open water, with room for the hull? */
export const clear = (x: number, y: number): boolean => x >= SUB_X0 && x <= SUB_X1 && y >= SUB_Y0 && y <= seabed(x) - HULL;

/** Fixed things on the seabed that creatures, finds and drawings share. */
export const SPOTS = {
  pilings: [90, 150, 210, 270, 330], trolley: 408, lines: [140, 245, 300],
  kelp: Array.from({ length: 26 }, (_, i) => 540 + i * 20 + Math.round(((ihash(i * 13 + 5) % 100) / 100 - 0.5) * 12)),
  seahorse: { x: 823, y: 84 }, anemone: 1262, moray: 1336, clam: 1400, octopus: 1574, grouper: { x: 2004, y: 162 },
  ledges: [[2270, 298], [2294, 518]] as [number, number][], anchor: 3190, sign: { x: 3302, y: 1010 },
};
/** Daylight at depth y: 1 at the surface, a tenth at ~250 m, next to nothing below 400 m. `day` = the Square's dayness (0 night .. 1 day). */
export const sunAt = (y: number, day = 1): number => Math.exp(-Math.max(0, y) / 110) * (0.4 + 0.6 * day);
/** Deep enough that only the floodlights (or a glow) show anything. */
export const DARK_BELOW = 250;

// ---------------------------------------------------------------- THE SUB'S MOTION ----------------------------------------------------------------
export interface Motion { x: number; y: number; vx: number; vy: number }
export const TICK = 0.1, MAX_AHEAD = 40, MAX_ASTERN = 20, MAX_UPDOWN = 25;
/** What the troubles are doing to the sub right now: half speed (a LEAK), held still (a VISITOR), drifting off course (a JELLY in the intake). */
export interface Effects { slow: number; stuck: boolean; drift: boolean }
export const CALM: Effects = { slow: 1, stuck: false, drift: false };
/** One 0.1 s tick: the stick (sx, sy in -1..1) sets where the sub wants to go; it gets there gently. `T` = the dive clock (the drift's wobble). */
export function stepSub(m: Motion, sx: number, sy: number, fx: Effects, T: number): { m: Motion; bonk: boolean } {
  let tx = 0, ty = 0;
  if (fx.stuck) { tx = 0; ty = 0; }
  else if (fx.drift) { tx = 5 * Math.sin(T * 0.3); ty = 2.5; }
  else { tx = clamp(sx, -1, 1) * (sx > 0 ? MAX_AHEAD : MAX_ASTERN) * fx.slow; ty = clamp(sy, -1, 1) * MAX_UPDOWN * fx.slow; }
  const k = 1 - Math.exp(-TICK * 1.6);
  let vx = m.vx + (tx - m.vx) * k, vy = m.vy + (ty - m.vy) * k, x = m.x + vx * TICK, y = m.y + vy * TICK, bonk = false;
  if (x < SUB_X0 || x > SUB_X1) { x = clamp(x, SUB_X0, SUB_X1); vx = 0; }
  if (y < SUB_Y0) { y = SUB_Y0; vy = Math.max(0, vy); }
  if (y > seabed(x) - HULL) { // into the rock: back off the way we came
    if (m.y <= seabed(x) - HULL + 0.01) { y = seabed(x) - HULL; } else { x = m.x; }
    if (y > seabed(x) - HULL) y = seabed(x) - HULL;
    bonk = Math.hypot(vx, vy) > 4; vx *= -0.3; vy = Math.min(0, vy) * 0.3 - 1;
  }
  return { m: { x, y, vx, vy }, bonk };
}
/** THE TOUR: where the CAP'N's autopilot takes the sub, and when (k), timed so a dive sees every zone. */
export const TOUR: [number, number, number][] = [
  [100, 22, 30], [112, 150, 32], [124, 320, 34], [136, 500, 38], // out of the gate, past the Pier's legs
  [150, 700, 58], [164, 900, 70], [176, 1080, 78], // through the kelp
  [190, 1260, 82], [204, 1450, 80], [218, 1650, 84], // low over the reef
  [232, 1840, 110], [244, 1990, 110], [252, 2110, 136], // over the wreck
  [260, 2290, 190], [272, 2420, 200], [284, 2480, 232], // over the edge, into the open blue (the whale goes by)
  [316, 2700, 1000], [332, 2800, 1110], [350, 2950, 1120], [368, 3100, 1120], // down the cliff, along the trench floor
  [380, 3060, 1060], [405, 2750, 600], [420, 2560, 280], // back up towards home
];
/** Where the tour is at k (seconds into the dive loop). */
export function tourAt(k: number): { x: number; y: number } {
  if (k <= TOUR[0][0]) return { x: TOUR[0][1], y: TOUR[0][2] };
  for (let i = 1; i < TOUR.length; i++) {
    const [k1, x1, y1] = TOUR[i];
    if (k <= k1) { const [k0, x0, y0] = TOUR[i - 1], u = (k - k0) / (k1 - k0), e = u * u * (3 - 2 * u); return { x: x0 + (x1 - x0) * e, y: y0 + (y1 - y0) * e }; }
  }
  const l = TOUR[TOUR.length - 1]; return { x: l[1], y: l[2] };
}
/** The autopilot's stick: head for where the tour will be in 3 s (a little faster to catch up), keeping off the bottom. `slow` = the claw's crawl. */
export function autoStick(m: Motion, k: number, slow = 1): { sx: number; sy: number } {
  const t = tourAt(Math.min(k + 3, SUB_HOME)), dx = t.x - m.x, dy = t.y - m.y;
  let wx = dx / 3, wy = dy / 3;
  // keep a margin over the ground ahead (a coral head, the wreck's funnel): climb first
  const ahead = m.x + clamp(m.vx * 1.5, -40, 40), floor = Math.min(seabed(ahead), seabed(m.x), seabed((ahead + m.x) / 2));
  if (m.y > floor - 14) wy = Math.min(wy, -12);
  const sx = clamp(wx / (wx > 0 ? MAX_AHEAD : MAX_ASTERN), -1, 1) * slow, sy = clamp(wy / MAX_UPDOWN, -1, 1) * slow;
  return { sx, sy };
}
/** The autopilot from a snapshot (the sub at `m` at dive-clock time `t0`) forward to time `t1`, in ticks. `fx` = the troubles at time t. */
export function autoAdvance(m: Motion, t0: number, t1: number, fx: (t: number) => Effects, slow: (t: number) => number = () => 1): Motion {
  let cur = m;
  const steps = Math.min(4000, Math.max(0, Math.floor((t1 - t0) / TICK)));
  for (let i = 0; i < steps; i++) {
    const t = t0 + i * TICK, k = ((t % SUB_CYCLE) + SUB_CYCLE) % SUB_CYCLE;
    if (k >= SUB_HOME || k < SUB_DOWN) break;
    const st = autoStick(cur, k, slow(t));
    cur = stepSub(cur, st.sx, st.sy, fx(t), t).m;
  }
  return cur;
}
/** Back through the gate by this k; the pen after it. */
export const HOME_IN = 466;
/** THE RUN HOME (k 420-466), from wherever the sub was at 420 (`p`): straight up to 25 m, then flat out along the top to the gate. */
export function homeAt(p: { x: number; y: number }, k: number): { x: number; y: number; vx: number } {
  const s = clamp(k - SUB_HOME, 0, HOME_IN - SUB_HOME), rise = clamp((p.y - 25) / 60, 0, 20), ease = (u: number) => u * u * (3 - 2 * u);
  if (s < rise) return { x: p.x, y: p.y - (p.y - 25) * ease(s / rise), vx: 0 };
  const u = (s - rise) / (HOME_IN - SUB_HOME - rise), e = ease(u), top = Math.min(p.y, 25);
  return { x: p.x + (GATE.x - p.x) * e, y: top + (GATE.y - top) * e, vx: ((GATE.x - p.x) / (HOME_IN - SUB_HOME - rise)) * 6 * u * (1 - u) };
}

// ---------------------------------------------------------------- EACH DIVE'S SEED ----------------------------------------------------------------
export const diveSeed = (n: number): number => ihash(Math.imul(n, 7919) + 17);
export interface Mission { id: string; name: string; text: string; /** for the cabin's little DIVE BOARD (10 letters) */ short: string }
export const MISSIONS: Mission[] = [
  { id: 'whale', short: 'THE WHALE', name: 'SNAP THE WHALE', text: 'Photograph the humpback whale: it\'s out past the drop-off today' },
  { id: 'bell', short: 'THE BELL', name: 'RAISE THE BELL', text: 'Claw up the LUCKY HERRING\'s bell: it\'s on the sand by the wreck\'s bow' },
  { id: 'bottom', short: 'BOTTOM', name: 'TOUCH THE BOTTOM', text: 'Steer down and touch the floor of the trench' },
  { id: 'spot8', short: 'SPOT 8', name: 'SPOT 8 KINDS', text: 'Photograph 8 different kinds of sea life this dive' },
  { id: 'duck', short: 'THE DUCK', name: 'RESCUE THE DUCK', text: 'A rubber duck is lost somewhere past the kelp: find it with the sonar and claw it up' },
  { id: 'faults', short: 'FAULTS', name: 'FIX EVERY FAULT', text: 'Fix all three troubles before the Cap\'n has to' },
  { id: 'reef', short: 'REEF', name: 'MAP THE REEF', text: 'Ping the sonar near each of the reef\'s three yellow buoys' },
  { id: 'boot', short: 'THE BOOT', name: 'FIND THE OTHER BOOT', text: 'Claw up THE OTHER BOOT from the trench floor' },
  { id: 'tea', short: 'TEA', name: 'TEA AT THE BOTTOM', text: 'Make a cup of tea deeper than 1000 m' },
  { id: 'litter', short: 'LITTER', name: 'CLEAN THE HARBOUR', text: 'Claw up 3 bits of litter from the harbour and the kelp' },
];
export const MISSION = Object.fromEntries(MISSIONS.map((m, i) => [m.id, i])) as Record<string, number>;
/** A shuffle of the 10 missions for each block of 10 dives (so they come round evenly), never the same twice running. */
function block(b: number): number[] {
  const p = MISSIONS.map((_, i) => i);
  for (let i = p.length - 1; i > 0; i--) { const j = ihash(Math.imul(b, 31) + i * 101 + 7) % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
  return p;
}
export function missionOf(n: number): number {
  const b = Math.floor(n / 10), p = block(b);
  if (p[0] === block(b - 1)[9]) [p[0], p[1]] = [p[1], p[0]];
  return p[((n % 10) + 10) % 10];
}

/** THE TROUBLES (each fixed by E at its spot; the CAP'N sees to it after 40 s): a leak, a visitor on the hull, the lights, a jelly in the intake. */
export const TR = { LEAK: 0, VISITOR: 1, LIGHTS: 2, JELLY: 3 } as const;
export const TROUBLE_NAMES = ['LEAK!', 'SOMETHING ON THE HULL!', 'LIGHTS OUT!', 'JELLY IN THE INTAKE!'];
export const CAPN_FIXES = 40;
export interface Trouble { i: number; kind: number; k: number }
/** This dive's troubles: which and when (k). The visitor's is when it's due (it comes when the sub is shallow or deep enough). */
export function troublesOf(n: number): Trouble[] {
  const s = diveSeed(n), count = missionOf(n) === MISSION.faults ? 3 : 2 + (ihash(s + 1) % 2);
  const kinds = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) { const j = ihash(s + 40 + i) % (i + 1); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  const out: Trouble[] = [];
  let k = 130 + (ihash(s + 2) % 40);
  for (let i = 0; i < count; i++) { out.push({ i, kind: kinds[i], k }); k += 55 + (ihash(s + 3 + i * 7) % 50); if (k > 390) break; }
  return out;
}

/** Treasure on the seabed. Each find is an index into findsOf(n) (the TREASURE BIN's bitmask). */
export type FindKind = 'coins' | 'pearl' | 'bottle' | 'chest' | 'duck' | 'cone' | 'phone' | 'gnome' | 'shades' | 'trumpet' | 'tyre' | 'globe' | 'present' | 'bell' | 'rduck' | 'boot' | 'can' | 'bag' | 'crisps';
export const FIND_NAMES: Record<FindKind, string> = {
  coins: 'A PILE OF COINS', pearl: 'A PEARL', bottle: 'A MESSAGE IN A BOTTLE', chest: 'THE LUCKY HERRING\'S CHEST', duck: 'A RUBBER DUCK', cone: 'A TRAFFIC CONE',
  phone: 'A PHONE (1 MISSED CALL: MUM)', gnome: 'A GARDEN GNOME', shades: 'SUNGLASSES', trumpet: 'A TRUMPET', tyre: 'A TYRE', globe: 'A SNOW GLOBE', present: 'A WRAPPED PRESENT',
  bell: 'THE SHIP\'S BELL', rduck: 'THE LOST RUBBER DUCK', boot: 'THE OTHER BOOT', can: 'A FIZZY DRINK CAN', bag: 'A PLASTIC BAG', crisps: 'A CRISP PACKET',
};
export const LITTER: FindKind[] = ['can', 'bag', 'crisps', 'tyre'];
const ODD: FindKind[] = ['coins', 'bottle', 'duck', 'cone', 'phone', 'gnome', 'shades', 'trumpet', 'tyre', 'globe'];
export interface Find { i: number; kind: FindKind; x: number; y: number; note?: number }
/** The bottle notes (a bottle's `note`). */
export const NOTES = [
  'if found, please return to the sea', 'help, I\'m stuck in a bottle factory', 'roses are red, the sea is blue, this bottle\'s been floating since 1982',
  'DEAR DIARY. today I was a bottle', 'the treasure is buried under the X. there are a lot of Xs down here', 'I told you we should have turned left at the kelp',
  'if you\'re reading this, you owe me a sandwich', 'this is a message. it is in a bottle. the end', 'DORIS, if you find this, I\'m sorry about the thing',
  'the tide goes out, the tide comes in. nobody knows why', 'wish you were here. (you are here.)', 'pls send more bottles',
];
/** THE OTHER BOOT turns up on its mission, and now and then (1 dive in 40) anyway. */
export const bootOn = (n: number): boolean => missionOf(n) === MISSION.boot || ihash(diveSeed(n) + 11) % 40 === 0;
/** This dive's treasure: one find in the harbour, the kelp, the drop-off's ledges and the trench, the reef's pearl and the wreck's
 *  chest, and the mission's own (the bell, the duck, the boot, the litter). `winter` swaps an odd thing for a present. */
export function findsOf(n: number, winter = false): Find[] {
  const s = diveSeed(n), m = missionOf(n), out: Find[] = [];
  const at = (kind: FindKind, x: number, extra?: Partial<Find>): void => { const X = Math.round(x); out.push({ i: out.length, kind, x: X, y: Math.round(seabed(X)) - 2, ...extra }); };
  const odd = (h: number): FindKind => { let k = ODD[h % ODD.length]; if (k === 'duck' && m === MISSION.duck) k = 'coins'; return k; };
  const pick = (j: number, lo: number, hi: number) => lo + (ihash(s + 100 + j * 17) % (hi - lo));
  const kind0 = odd(ihash(s + 60)), kind1 = odd(ihash(s + 61) >>> 3);
  at(winter && ihash(s + 62) % 3 === 0 ? 'present' : kind0, pick(0, 120, 470));
  at(kind1, pick(1, 560, 1040));
  at('pearl', SPOTS.clam);
  { const x = pick(2, WRECK.stern1 + 8, WRECK.hold1 - 8); out.push({ i: out.length, kind: 'chest', x, y: Math.round(wreckTop(x)) - 2 }); }
  { const [lx, ly] = SPOTS.ledges[ihash(s + 63) % 2]; out.push({ i: out.length, kind: odd(ihash(s + 64) >>> 5), x: lx, y: ly - 2 }); }
  at(odd(ihash(s + 65) >>> 7), pick(3, 2760, 3240));
  for (const f of out) if (f.kind === 'bottle') f.note = ihash(s + 70 + f.i) % NOTES.length;
  if (m === MISSION.bell) at('bell', WRECK.x1 + 18);
  if (m === MISSION.duck) at('rduck', pick(4, 1150, 3240));
  if (bootOn(n)) at('boot', pick(5, 3000, 3250));
  if (m === MISSION.litter) for (let j = 0; j < 5; j++) at(LITTER[(ihash(s + 80 + j) >>> 2) % LITTER.length], pick(6 + j, 100 + j * 190, 280 + j * 190));
  return out;
}
/** A find can be clawed when the claw's tip is on it (and the reef's clam is open). */
export const CLAW_REACH = 40, CLAW_SLIDE = 30;
export const clamOpen = (T: number): boolean => ((T % 6) + 6) % 6 < 2;
export const onTip = (f: Find, tx: number, ty: number): boolean => Math.abs(f.x - tx) <= 5 && Math.abs(f.y - ty) <= 6;

/** THE HUMPBACK comes by on 1 dive in 4, and always on its mission: along the drop-off's open blue, k 240-310. */
export const whaleOn = (n: number): boolean => missionOf(n) === MISSION.whale || ihash(diveSeed(n) + 5) % 4 === 0;
export function whaleAt(n: number, k: number): { x: number; y: number; d: number } | null {
  if (!whaleOn(n) || k < 240 || k > 310) return null;
  return { x: 2900 - (k - 240) * 10, y: 195 + 18 * Math.sin(k * 0.1), d: -1 };
}
/** THE BABY OCTOPUS suckers onto the window on 1 dive in 6, for 20 s from this k (null: not this dive). */
export const OCTO_S = 20;
export function octopusAt(n: number): number | null { const s = diveSeed(n); return ihash(s + 9) % 6 === 0 ? 160 + (ihash(s + 10) % 210) : null; }
/** MAP THE REEF's three survey buoys (the float's position; each is moored to the reef below). */
export function buoysOf(n: number): { x: number; y: number }[] {
  const s = diveSeed(n);
  return [0, 1, 2].map((j) => { const x = 1150 + j * 180 + (ihash(s + 90 + j) % 140); return { x, y: Math.round(seabed(x)) - 34 }; });
}
export const BUOY_R = 60, SONAR_R = 300, PING_S = 6;

// ---------------------------------------------------------------- THE SEA LIFE LOG ----------------------------------------------------------------
export interface Creature { id: string; name: string; zone: string; line: string; hint: string }
export const LOG: Creature[] = [
  { id: 'jelly', name: 'MOON JELLY', zone: 'THE HARBOUR', line: '95% water, 5% vibes.', hint: 'drifts in the harbour. hard to miss' },
  { id: 'sardines', name: 'SARDINE SHOAL', zone: 'THE HARBOUR', line: 'A thousand sardines and one idea between them. The sub is named after them.', hint: 'silver, lots of them, all turning at once' },
  { id: 'otter', name: 'SEA OTTER', zone: 'THE HARBOUR', line: 'Holds hands with its friends when it sleeps, so nobody drifts off.', hint: 'look up: it\'s floating on the surface' },
  { id: 'seal', name: 'HARBOUR SEAL', zone: 'THE HARBOUR', line: 'Curious, whiskery, always hungry. Knocks on submarines to say hello.', hint: 'hangs about the Pier\'s legs' },
  { id: 'seahorse', name: 'SEAHORSE', zone: 'THE KELP FOREST', line: 'The dad carries the babies. He is very tired.', hint: 'hides in the kelp. give it a PING' },
  { id: 'garibaldi', name: 'GARIBALDI', zone: 'THE KELP FOREST', line: 'Bright orange and very cross about it.', hint: 'the brightest thing in the kelp' },
  { id: 'leopard', name: 'LEOPARD SHARK', zone: 'THE KELP FOREST', line: 'Spotty, sleepy, and only interested in crabs.', hint: 'cruises the kelp forest\'s floor' },
  { id: 'turtle', name: 'SEA TURTLE', zone: 'THE KELP FOREST', line: 'Older than the lighthouse. Loves jellyfish. Hates plastic bags.', hint: 'paddles through the kelp' },
  { id: 'clownfish', name: 'CLOWNFISH', zone: 'THE CORAL REEF', line: 'Lives in an anemone that stings everyone but them. Don\'t ask how.', hint: 'at home in an anemone on the reef' },
  { id: 'octopus', name: 'OCTOPUS', zone: 'THE CORAL REEF', line: 'Eight arms, three hearts, blue blood, and right now it\'s pretending to be a rock.', hint: 'looks exactly like the reef. PING it' },
  { id: 'moray', name: 'MORAY EEL', zone: 'THE CORAL REEF', line: 'Opens and shuts its mouth all day. It\'s breathing, not being rude.', hint: 'pokes out of a hole in the reef. patience' },
  { id: 'manta', name: 'MANTA RAY', zone: 'THE CORAL REEF', line: 'Glides like a kite, eats like a hoover. Its cousins PANCAKE and WAFFLE live in the ocean tank.', hint: 'glides over the reef' },
  { id: 'grouper', name: 'GIANT GROUPER', zone: 'THE WRECK', line: 'Moved into the LUCKY HERRING years ago. Pays no rent.', hint: 'lives in the wreck. shine a light in' },
  { id: 'swordfish', name: 'SWORDFISH', zone: 'THE DROP-OFF', line: 'The fastest thing in the sea. Late for something.', hint: 'zooms past the drop-off. be quick' },
  { id: 'lantern', name: 'LANTERNFISH', zone: 'THE DROP-OFF', line: 'Glows so its friends can find it in the dark. Shy of floodlights.', hint: 'down the drop-off. turn the LIGHTS OFF' },
  { id: 'whale', name: 'HUMPBACK WHALE', zone: 'THE DROP-OFF', line: 'Its songs last twenty minutes. The same song. Over and over.', hint: 'out past the drop-off, some dives. listen for singing' },
  { id: 'angler', name: 'ANGLERFISH', zone: 'THE TRENCH', line: 'Dangles a light to lure snacks. The snack is usually whoever came to look at the light.', hint: 'lights OFF to find its lure. then lights ON' },
  { id: 'dumbo', name: 'DUMBO OCTOPUS', zone: 'THE TRENCH', line: 'Flaps its ears like a flying elephant. Lives deeper than any other octopus.', hint: 'flaps about the trench floor. bring the floodlights' },
  { id: 'yeti', name: 'YETI CRAB', zone: 'THE TRENCH', line: 'Grows its dinner on its hairy arms. Lives by the vents, where it\'s warm.', hint: 'by the smoking vents at the bottom of the trench' },
  { id: 'squid', name: 'GIANT SQUID', zone: 'THE TRENCH', line: 'Eyes the size of dinner plates. Likes submarines. A bit too much.', hint: 'drawn to the lights in the deep, some dives. hold on' },
];
export const LOG_I = Object.fromEntries(LOG.map((c, i) => [c.id, i])) as Record<string, number>;
/** The kinds in the log you need for the DIVING HELMET. */
export const HELMET_AT = 10;
/** How a creature shows: in the light (daylight or the floodlights), hiding until a ping, glowing (only in the dark), or on the glass. */
export type Seen = 'lit' | 'hidden' | 'glow' | 'glass';
/** One creature in the sea right now: which (a LOG id), where, facing, how it shows, and a pose/animation value. */
export interface Sighting { id: string; x: number; y: number; d: number; seen: Seen; k?: number }
/** What the lights have been doing: on now?, when they last changed (dive clock s), and the change before that. */
export interface Lamps { on: boolean; lt: number; lp: number }
/** The anglerfish comes up to a dark sub below 850 m: its lure after 3 s of dark; switch the lights on and there it is, startled, for 4 s. */
export const ANGLER_DEPTH = 850;
export function anglerState(sub: { x: number; y: number }, L: Lamps, T: number): 'none' | 'lure' | 'seen' {
  if (sub.y < ANGLER_DEPTH) return 'none';
  if (!L.on) return T - L.lt >= 3 ? 'lure' : 'none';
  return L.lp > 0 && L.lt - L.lp >= 3 && T - L.lt < 4 ? 'seen' : 'none'; // (lp 0: they've only ever been switched on)
}
/** The lanternfish come out after 1.5 s of dark. */
export const lanternOut = (L: Lamps, T: number): boolean => !L.on && T - L.lt >= 1.5;
/** The otter's only seen from near the surface (look up!). */
export const OTTER_Y = 24;
/** The moray pokes out once the sub's held still near it for this long (patience), and the grouper comes out to look at the floodlights. */
export const MORAY_WAIT = 3, SHY_R = 160;
/** Where the sub is and how it's been doing, as far as the sea life's concerned. `still` = seconds it's been all but stopped. */
export interface Near { x: number; y: number; still: number }
/**
 * Every creature in the sea at dive-clock time T on dive n (positions from the clock, so every browser agrees). `sub` = where the sub
 * is (the anglerfish comes to it, the moray and grouper are shy of it), `L` = the lights as far as the sea's concerned (off in a LIGHTS OUT).
 */
export function seaLife(T: number, n: number, sub: Near, L: Lamps): Sighting[] {
  const out: Sighting[] = [], k = ((T % SUB_CYCLE) + SUB_CYCLE) % SUB_CYCLE, sin = Math.sin;
  for (let i = 0; i < 7; i++) out.push({ id: 'jelly', x: 70 + i * 62 + 18 * sin(T * 0.09 + i * 1.7), y: 10 + ((i * 23) % 34) + 5 * sin(T * 0.23 + i), d: 1, seen: 'lit', k: i });
  out.push({ id: 'sardines', x: 260 + 150 * sin(T * 0.031), y: 32 + 8 * sin(T * 0.07), d: Math.cos(T * 0.031) > 0 ? 1 : -1, seen: 'lit' });
  out.push({ id: 'otter', x: 330 + 70 * sin(T * 0.021), y: 2, d: Math.cos(T * 0.021) > 0 ? 1 : -1, seen: sub.y <= OTTER_Y ? 'lit' : 'hidden', k: 1 });
  out.push({ id: 'seal', x: 190 + 120 * sin(T * 0.083), y: 28 + 12 * sin(T * 0.19), d: Math.cos(T * 0.083) > 0 ? 1 : -1, seen: 'lit' });
  out.push({ id: 'seahorse', x: SPOTS.seahorse.x, y: SPOTS.seahorse.y, d: 1, seen: 'hidden' });
  out.push({ id: 'garibaldi', x: 930 + 30 * sin(T * 0.37), y: 88 + 4 * sin(T * 0.5), d: Math.cos(T * 0.37) > 0 ? 1 : -1, seen: 'lit' });
  { const x = 810 - 250 * Math.cos(T * 0.035); out.push({ id: 'leopard', x, y: seabed(x) - 8, d: sin(T * 0.035) > 0 ? 1 : -1, seen: 'lit' }); }
  { const up = (T % 100) < 16 ? sin(((T % 100) / 16) * Math.PI) : 0; out.push({ id: 'turtle', x: 800 + 150 * sin(T * 0.05), y: (55 + 15 * sin(T * 0.11)) * (1 - up) + 5 * up, d: Math.cos(T * 0.05) > 0 ? 1 : -1, seen: 'lit' }); }
  out.push({ id: 'clownfish', x: SPOTS.anemone + 3 * sin(T * 2), y: seabed(SPOTS.anemone) - 7, d: sin(T * 0.7) > 0 ? 1 : -1, seen: 'lit' });
  out.push({ id: 'octopus', x: SPOTS.octopus, y: seabed(SPOTS.octopus) - 5, d: 1, seen: 'hidden' });
  if (sub.still >= MORAY_WAIT && Math.abs(sub.x - SPOTS.moray) < SHY_R) out.push({ id: 'moray', x: SPOTS.moray, y: seabed(SPOTS.moray) + 6, d: -1, seen: 'lit', k: Math.min(1, (sub.still - MORAY_WAIT) / 1.5) });
  out.push({ id: 'manta', x: 1420 + 230 * sin(T * 0.045), y: 72 + 10 * sin(T * 0.09), d: Math.cos(T * 0.045) > 0 ? 1 : -1, seen: 'lit' });
  if (L.on && T - L.lt > 1 && Math.abs(sub.x - SPOTS.grouper.x) < SHY_R * 1.4) out.push({ id: 'grouper', x: SPOTS.grouper.x, y: SPOTS.grouper.y, d: 1, seen: 'lit', k: Math.min(1, (T - L.lt - 1) / 1.5) });
  { const p = Math.floor(T / 30), u = (T - p * 30) / 3; if (u < 1) { const r2l = p % 2 === 1; out.push({ id: 'swordfish', x: r2l ? 2660 - 520 * u : 2140 + 520 * u, y: 175 + 25 * sin(p * 1.7), d: r2l ? -1 : 1, seen: 'lit' }); } }
  if (lanternOut(L, T)) for (let i = 0; i < 14; i++) out.push({ id: 'lantern', x: 2410 + 70 * sin(i * 2.1 + T * 0.05), y: 470 + ((i * 37) % 170) + 6 * sin(T * 0.4 + i), d: 1, seen: 'glow', k: i });
  { const w = whaleAt(n, k); if (w) out.push({ id: 'whale', x: w.x, y: w.y, d: w.d, seen: 'lit' }); }
  { const a = anglerState(sub, L, T); if (a !== 'none') out.push({ id: 'angler', x: sub.x + 70 + 20 * sin(T * 0.5), y: sub.y + 16 + 6 * sin(T * 0.8), d: -1, seen: a === 'lure' ? 'glow' : 'lit', k: a === 'lure' ? 0 : 1 }); }
  { const x = 3000 + 160 * sin(T * 0.04); out.push({ id: 'dumbo', x, y: seabed(x) - 28 + 8 * sin(T * 0.7), d: Math.cos(T * 0.04) > 0 ? 1 : -1, seen: 'lit' }); }
  for (let i = 0; i < 3; i++) { const [vx] = VENTS[i % 2], x = vx - 8 + i * 9; out.push({ id: 'yeti', x, y: seabed(x) - 3, d: i % 2 ? 1 : -1, seen: 'lit', k: i }); }
  return out;
}
/** What the window sees: the sub's position, the lights (really on: not in a LIGHTS OUT), the last ping, and the time. */
export interface View { x: number; y: number; lamps: boolean; ping: { T: number; x: number; y: number } | null; T: number; day: number }
/** How far each creature reaches either side of its middle (a whale that's mostly in view counts, even if its middle's behind the bulkhead). */
const HALF: Record<string, [number, number]> = { whale: [75, 20], sardines: [45, 14], manta: [20, 6], leopard: [18, 4], seal: [14, 5], turtle: [12, 6], swordfish: [20, 4], dumbo: [10, 8], grouper: [12, 8], otter: [12, 4] };
/** In the window: some of it within the window's span, and not all of it behind the ladder's bulkhead. */
export const inWindow = (s: { x: number; y: number; id?: string }, v: { x: number; y: number }): boolean => {
  const [hw, hh] = HALF[s.id ?? ''] ?? [4, 4], dx = Math.abs(s.x - v.x), dy = Math.abs(s.y - v.y);
  return dx - hw <= VIEW_X && dy - hh <= VIEW_Y && dx + hw >= BULK_X;
};
/** In the floodlights' oval (lit, when they're on). */
export const inFlood = (s: { x: number; y: number }, v: { x: number; y: number }): boolean => ((s.x - v.x) / 190) ** 2 + ((s.y - v.y - 8) / 62) ** 2 <= 1;
/** Could a photo from view v see this creature? */
export function visible(s: Sighting, v: View): boolean {
  if (s.seen === 'glass') return true;
  if (!inWindow(s, v)) return false;
  if (s.seen === 'glow') return false; // (a glow on its own isn't a creature: the lanternfish count, below)
  if (s.seen === 'hidden' && (s.k === 1 || !(v.ping && v.T - v.ping.T < PING_S && Math.hypot(s.x - v.ping.x, s.y - v.ping.y) <= SONAR_R))) return false; // (k 1: not a ping's to find: the otter, from too deep)
  return s.y <= DARK_BELOW || (v.lamps && inFlood(s, v));
}
/** The kinds a photo from view v gets (a bitmask over LOG). The lanternfish count when they're out and in the window. */
export function snapKinds(life: Sighting[], v: View): number {
  let bits = 0;
  for (const s of life) if (s.id === 'lantern' ? inWindow(s, v) : visible(s, v)) bits |= 1 << LOG_I[s.id];
  return bits;
}
export const popcount = (b: number): number => { let c = 0; for (let x = b >>> 0; x; x &= x - 1) c++; return c; };
/** A SNAP's message: the kinds it got (bits 0-19, over LOG), plus the baby octopus on the glass and the curious seal on the glass (which sends it off). */
export const SNAP_OCTO = 1 << 20, SNAP_SEAL = 1 << 21, SNAP_MAX = (1 << 22) - 1;

// ---------------------------------------------------------------- THE DIVE (room state 'dive') ----------------------------------------------------------------
/**
 * One dive, as the skipper keeps it (room state 'dive', re-sent every 3 s; everyone works the autopilot forward from its snapshot).
 * Times are on the dive clock (s). The shared bits only ever grow (mergeDive ORs them), so an update can't be lost to a stale copy.
 */
export interface DiveState {
  /** Which dive, and the skipper (the crew member with the lowest id). */
  n: number; sk: string;
  /** The sub at `at`: the autopilot runs on from here (the helm's own messages move it while someone steers). */
  at: number; x: number; y: number; vx: number; vy: number;
  /** The floodlights: on (1/0), when they last changed and the change before (the anglerfish), and whether anyone's touched them (0 = the Cap'n may). */
  li: number; lt: number; lp: number;
  /** When the crew fixed each trouble in troublesOf(n) (0 = not yet; the Cap'n's own fix is 40 s after it starts). */
  fx: number[];
  /** The visitor on the hull: when it arrived (0 = not yet) and which (1 the seal, 2 the giant squid). */
  va: number; vk: number;
  /** The finds taken (a bitmask over findsOf(n)), the kinds photographed this dive (over LOG), the mission's progress (MP bits), the octopus snapped. */
  got: number; kinds: number; m: number; oct: number;
}
/** Mission progress bits: the reef's buoys (0-2), the trench floor touched, tea at the bottom. */
export const MP = { BUOY0: 1, BUOY1: 2, BUOY2: 4, BOTTOM: 8, TEA: 16 } as const;
export function newDive(n: number, sk: string): DiveState {
  return { n, sk, at: n * SUB_CYCLE + SUB_DOWN, x: GATE.x, y: GATE.y, vx: 0, vy: 0, li: 0, lt: 0, lp: 0, fx: troublesOf(n).map(() => 0), va: 0, vk: 0, got: 0, kinds: 0, m: 0, oct: 0 };
}
/** Two copies of the same dive: the shared bits ORed, the earliest fixes, the newest snapshot and lights. (Different dives: the newer.) */
export function mergeDive(a: DiveState | null, b: DiveState): DiveState {
  if (!a || a.n !== b.n) return !a || b.n > a.n ? b : a;
  const snap = b.at >= a.at ? b : a, lamp = b.lt >= a.lt ? b : a, vis = a.va && (!b.va || a.va <= b.va) ? a : b;
  return {
    n: b.n, sk: b.sk, at: snap.at, x: snap.x, y: snap.y, vx: snap.vx, vy: snap.vy, li: lamp.li, lt: lamp.lt, lp: lamp.lp,
    fx: b.fx.map((t, i) => (t && a.fx[i] ? Math.min(t, a.fx[i]) : t || a.fx[i] || 0)), va: vis.va, vk: vis.vk,
    got: a.got | b.got, kinds: a.kinds | b.kinds, m: a.m | b.m, oct: a.oct | b.oct,
  };
}
/** When trouble i ends: the crew's fix, or the Cap'n's 40 s after it began. `start` = when it began (dive clock s), or 0 (not yet). */
export function troubleEnds(st: DiveState, t: Trouble, start: number): number {
  const cap = start + CAPN_FIXES, crew = st.fx[t.i] || Infinity;
  return Math.min(cap, crew);
}
/** When trouble t began (dive clock s), or 0 if it hasn't (a visitor waits for the sub to be shallow or deep enough). */
export const troubleStart = (st: DiveState, t: Trouble): number => (t.kind === TR.VISITOR ? st.va : st.n * SUB_CYCLE + t.k);
/** The troubles on at time T. */
export function troublesOn(st: DiveState, T: number): Trouble[] {
  return troublesOf(st.n).filter((t) => { const s = troubleStart(st, t); return s > 0 && T >= s && T < troubleEnds(st, t, s); });
}
/** What the troubles on at time T do to the sub. */
export function effectsAt(st: DiveState, T: number): Effects {
  const on = troublesOn(st, T);
  return { slow: on.some((t) => t.kind === TR.LEAK) ? 0.5 : 1, stuck: on.some((t) => t.kind === TR.VISITOR), drift: on.some((t) => t.kind === TR.JELLY) };
}
/** Were all of a dive's troubles fixed by the crew (none left for the Cap'n)? */
export function crewFixedAll(st: DiveState): boolean {
  return troublesOf(st.n).every((t) => { const s = troubleStart(st, t); return s > 0 && st.fx[t.i] > 0 && st.fx[t.i] < s + CAPN_FIXES; });
}
/** The finds taken this dive, of these kinds. */
export const taken = (st: DiveState, finds: Find[], kinds?: FindKind[]): Find[] => finds.filter((f) => (st.got >>> f.i) & 1 && (!kinds || kinds.includes(f.kind)));
/** Is this dive's mission done? */
export function missionDone(st: DiveState, finds = findsOf(st.n)): boolean {
  switch (MISSIONS[missionOf(st.n)].id) {
    case 'whale': return !!((st.kinds >>> LOG_I.whale) & 1);
    case 'bell': return taken(st, finds, ['bell']).length > 0;
    case 'bottom': return !!(st.m & MP.BOTTOM);
    case 'spot8': return popcount(st.kinds) >= 8;
    case 'duck': return taken(st, finds, ['rduck']).length > 0;
    case 'faults': return crewFixedAll(st);
    case 'reef': return (st.m & 7) === 7;
    case 'boot': return taken(st, finds, ['boot']).length > 0;
    case 'tea': return !!(st.m & MP.TEA);
    case 'litter': return litterGot(st, finds) >= 3;
  }
  return false;
}
/** The mission's progress, for the boards: '5/8', '2/3'... ('' when it's all or nothing). */
export function missionProgress(st: DiveState, finds = findsOf(st.n)): string {
  const id = MISSIONS[missionOf(st.n)].id;
  if (id === 'spot8') return Math.min(8, popcount(st.kinds)) + '/8';
  if (id === 'reef') return popcount(st.m & 7) + '/3';
  if (id === 'litter') return Math.min(3, litterGot(st, finds)) + '/3';
  if (id === 'faults') return troublesOf(st.n).filter((t) => st.fx[t.i] > 0).length + '/' + troublesOf(st.n).length;
  return '';
}
/** Litter clawed up this dive (the mission's litter only: a tyre found as an odd thing elsewhere counts too, it's still litter). */
export const litterGot = (st: DiveState, finds: Find[]): number => taken(st, finds, LITTER).length;
/** The pay for a dive: 1, plus 1 a find (up to 4), plus 3 for the mission. (The server works it out the same way, and caps the day.) */
export const divePay = (finds: number, mission: boolean): number => 1 + clamp(Math.floor(finds), 0, 4) + (mission ? 3 : 0);
