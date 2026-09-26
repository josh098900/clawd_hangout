// THE REACTOR's shift game: co-op power station for 1-8 engineers (best with 2-4).
//
// Clock in at START SHIFT for a 4-minute shift. Four stations in the control room set the reactor:
//   RODS (0-10 out: more power AND more heat), COOLANT (0-3 pumps), TURBINE (0-10: heat into power for the city,
//   and it draws a little heat too), SCRAM (the big red button: rods slammed in, locked out for 10 s).
// HEAT (%) follows them with a lag; POWER (MW) = turbine x heat. The city's DEMAND follows the Square's clock (more
// at night, when the lights come on) plus a couple of surprises a shift. Each tick scores how close POWER is to
// DEMAND; the shift's GRID % is the average. FAULTS break out on the reactor floor on a timetable from the seed
// (a pipe leak halves the coolant, a stuck valve jams the turbine, a pigeon in the vent adds heat, a tripped
// breaker kills the pumps, a goo spill is just a mess): somebody goes over and fixes them. Heat held at 100% for
// 3 s is a MELTDOWN: the shift ends with the grid halved.
//
// Networking, like the Diner: whoever clocks in HOSTS (room state 'reactor'). The state is the settings, when each
// fault got fixed, and a SNAPSHOT of the heat and score at `at`. Everyone works the maths forward from the snapshot
// with advance() (fixed 0.25 s ticks, so every browser gets the same numbers), so the big board moves smoothly
// without a stream of messages. Everyone else sends a tiny 'rx' ("I turned the rods up at station st"); the host
// advances to now, applies it with act() and sends the new state. Faults, surges and the end of the shift come from
// the clock and the seed, never sent.

import { clamp, ihash } from '../engine/math';

export const SHIFT_S = 240, CREW_MAX = 8, SCRAM_S = 10, MELT_HOLD = 3;
const TICK_MS = 250, TICK = TICK_MS / 1000;
/** The stations (spot n for 'rstation') and the fault locations (spot n for 'rfault'). */
export const RST = { SCRAM: 0, RODS: 1, COOL: 2, TURB: 3 } as const;
export const STATION_NAMES = ['SCRAM', 'RODS', 'COOLANT', 'TURBINE'];
export const FAULT = { LEAK: 0, VALVE: 1, PIGEON: 2, BREAKER: 3, GOO: 4 } as const;
export const FAULT_NAMES = ['PIPE LEAK', 'STUCK VALVE', 'PIGEON IN THE VENT', 'TRIPPED BREAKER', 'GOO SPILL'];
export const FAULT_FIX = ['PATCH IT', 'UNSTICK IT', 'SHOO!', 'FLIP IT', 'MOP IT'];
/** 'rx' messages: st 0-3 = a station (d = -1 down / +1 up; SCRAM ignores d), 10 + kind = fix that fault. */
export const FIX_ST = 10;

export interface ReactorState {
  host: string;
  /** Wall-clock start (ms), the seed (faults, surges), and how many engineers it started with (1-4: sets the pace). */
  t0: number; seed: number; lvl: number;
  ids: string[]; names: string[];
  /** The settings: rods out 0-10, pumps on 0-3, turbine 0-10, and the last SCRAM (wall ms, 0 = none). */
  rods: number; pumps: number; turb: number; scram: number;
  /** Per fault in faults(): when it was fixed (wall ms), 0 = not yet. */
  fixed: number[];
  /** The snapshot at wall time `at`: heat %, the score so far (sum of each tick's match x seconds, and the seconds),
   *  how long the heat has been at 100%, the meltdown (wall ms, 0 = none). */
  at: number; heat: number; sat: number; secs: number; hot: number; melt: number;
  /** Goo mopped (+1% each at the end) and faults fixed, for the end card. */
  mops: number; fixes: number;
}
export interface Fault { i: number; kind: number; at: number }
export interface Surge { at: number; dur: number; mw: number; text: string }

const GAP = [34, 28, 23, 19];
/** Every fault this shift: which kind and when it breaks out (wall ms). */
export function faults(g: Pick<ReactorState, 't0' | 'seed' | 'lvl'>): Fault[] {
  const out: Fault[] = [], gap = GAP[clamp(g.lvl, 1, 4) - 1];
  let prev = -1;
  for (let i = 0; ; i++) {
    const at = 28 + i * gap + (ihash(g.seed * 7 + i) % 9) - 4; if (at > SHIFT_S - 18) break;
    let kind = ihash(g.seed * 31 + i * 17) % 5; if (kind === prev) kind = (kind + 1 + (ihash(g.seed + i) % 4)) % 5;
    prev = kind; out.push({ i, kind, at: g.t0 + at * 1000 });
  }
  return out;
}
const SURGE_TEXT = ['THE ARCADE TOURNAMENT JUST STARTED', 'EVERYONE PUT THE KETTLE ON', 'THE CINEMA IS SHOWING A DOUBLE BILL', 'THE KART TRACK FLOODLIGHTS CAME ON', 'THE DINER FIRED UP EVERY GRILL', 'THE LOFTS ARE HAVING A HOUSE PARTY'];
/** The city's surprises this shift: two spikes in demand. */
export function surges(g: Pick<ReactorState, 't0' | 'seed'>): Surge[] {
  return [0, 1].map((k) => { const h = ihash(g.seed * 53 + k * 101); return { at: g.t0 + (k ? 150 + (h % 40) : 60 + (h % 35)) * 1000, dur: 20000, mw: 12 + (h % 6), text: SURGE_TEXT[(h >>> 4) % SURGE_TEXT.length] }; }); // (>>>: h is a full 32-bit hash, and >> would make half of them negative)
}
/** The city's demand (MW) at wall time T: `day` = the Square's dayness at T (0 night .. 1 day). */
export function demand(g: Pick<ReactorState, 't0' | 'seed'>, T: number, day: number): number {
  let d = 40 + 36 * (1 - day) + 3 * Math.sin(T / 9000 + g.seed);
  for (const s of surges(g)) if (T >= s.at && T < s.at + s.dur) d += s.mw * Math.min(1, (T - s.at) / 3000, (s.at + s.dur - T) / 3000);
  return d;
}
/** Is a fault of this kind broken right now? */
export function broken(g: ReactorState, kind: number, T: number, list = faults(g)): boolean {
  return list.some((f) => f.kind === kind && f.at <= T && (g.fixed[f.i] === 0 || g.fixed[f.i] > T));
}
/** POWER (MW) for a heat and a turbine setting. */
export const powerOf = (heat: number, turb: number): number => Math.max(0, turb / 10 * (heat - 15) * 1.6);
export const shiftEnd = (g: ReactorState): number => (g.melt ? g.melt : g.t0 + SHIFT_S * 1000);
export const live = (g: ReactorState | null, now = Date.now()): g is ReactorState => !!g && now >= g.t0 - 2000 && now < shiftEnd(g);
/** live(), as a plain yes / no (for a shift you already have). */
export const running = (g: ReactorState, now = Date.now()): boolean => now >= g.t0 - 2000 && now < shiftEnd(g);
export const scramLeft = (g: ReactorState, now = Date.now()): number => (g.scram ? Math.max(0, SCRAM_S - (now - g.scram) / 1000) : 0);

/**
 * Work the snapshot forward to wall time T (never past the end of the shift), in fixed ticks from `at`, so every
 * browser gets exactly the same numbers. `dayAt(ms)` = the Square's dayness (0..1) at that moment.
 */
export function advance(g0: ReactorState, T: number, dayAt: (ms: number) => number): ReactorState {
  const end = Math.min(T, g0.t0 + SHIFT_S * 1000);
  if (g0.melt || end - g0.at < TICK_MS) return g0;
  const g = { ...g0 }, list = faults(g);
  while (g.at + TICK_MS <= end && !g.melt) {
    const t = g.at + TICK_MS;
    const leak = broken(g, FAULT.LEAK, t, list), pigeon = broken(g, FAULT.PIGEON, t, list), breaker = broken(g, FAULT.BREAKER, t, list);
    const k = g.scram && t - g.scram < SCRAM_S * 1000 ? 0 : g.rods / 10;
    const gen = 26 * Math.pow(k, 1.15) * (pigeon ? 1.8 : 1);
    const cool = 0.1 + 0.09 * (breaker ? 0 : g.pumps) * (leak ? 0.25 : 1) + 0.012 * g.turb + (g.scram && t - g.scram < 4000 ? 0.5 : 0);
    g.heat = clamp(g.heat + (gen - cool * (g.heat - 10)) / 3.2 * TICK, 10, 110);
    const d = demand(g, t, dayAt(t)), p = powerOf(g.heat, g.turb);
    g.sat += clamp(1 - 1.8 * Math.abs(p - d) / d, 0, 1) * TICK; g.secs += TICK;
    g.hot = g.heat >= 100 ? g.hot + TICK : 0;
    if (g.hot >= MELT_HOLD) g.melt = t;
    g.at = t;
  }
  return g;
}
/** The shift's GRID %, so far or final (a meltdown halves it; mopped goo adds a point each). */
export function grid(g: ReactorState): number {
  const base = g.secs > 0 ? Math.round((100 * g.sat) / g.secs) : 0, sc = Math.min(100, base + g.mops);
  return g.melt ? Math.floor(sc / 2) : sc;
}
export function newShift(host: string, name: string, crew: number, now = Date.now()): ReactorState {
  const g: ReactorState = { host, t0: now, seed: Math.floor(Math.random() * 99999), lvl: Math.max(1, Math.min(4, crew)), ids: [host], names: [name], rods: 3, pumps: 2, turb: 4, scram: 0, fixed: [], at: now, heat: 35, sat: 0, secs: 0, hot: 0, melt: 0, mops: 0, fixes: 0 };
  g.fixed = faults(g).map(() => 0);
  return g;
}

/**
 * Engineer `who` pressed a station (`st` 0-3, d = -1 / +1) or fixed a fault (FIX_ST + kind). Returns the new state and a
 * word for them, or an error (nothing changes). Pure: the host runs it for real, everyone else to predict.
 */
export function act(g0: ReactorState, who: string, name: string, st: number, d: number, now: number, dayAt: (ms: number) => number): { g: ReactorState; msg: string } | { err: string } {
  if (!live(g0, now)) return { err: 'No shift on: START SHIFT is by the door' };
  const g = advance(g0, now, dayAt);
  if (g.melt) return { err: 'MELTDOWN! Too late for that' };
  const n: ReactorState = { ...g, ids: [...g.ids], names: [...g.names], fixed: [...g.fixed] };
  if (!n.ids.includes(who)) { if (n.ids.length >= CREW_MAX) return { err: 'The control room is full!' }; n.ids.push(who); n.names.push(name); }
  const T = n.at, up = d > 0 ? 1 : -1;
  if (st >= FIX_ST) {
    const kind = st - FIX_ST, list = faults(n).filter((f) => f.kind === kind && f.at <= T && n.fixed[f.i] === 0);
    if (!list.length) return { err: 'Nothing wrong here right now' };
    for (const f of list) n.fixed[f.i] = T;
    n.fixes++; if (kind === FAULT.GOO) n.mops++;
    return { g: n, msg: ['Leak patched! Coolant back to full', 'Valve unstuck! The turbine turns again', 'Shoo! The pigeon is out of the vent', 'Breaker flipped! The pumps are back', 'Goo mopped up: +1%'][kind] };
  }
  switch (st) {
    case RST.SCRAM: n.rods = 0; n.scram = T; return { g: n, msg: 'SCRAM! Rods slammed in. Locked for ' + SCRAM_S + ' s' };
    case RST.RODS: {
      if (up > 0 && scramLeft(n, T) > 0) return { err: 'Rods locked after the SCRAM: ' + Math.ceil(scramLeft(n, T)) + ' s' };
      const v = clamp(n.rods + up, 0, 10); if (v === n.rods) return { err: up > 0 ? 'Rods are all the way out' : 'Rods are all the way in' };
      n.rods = v; return { g: n, msg: 'RODS ' + v + '/10 ' + (up > 0 ? '(more power, more heat)' : '(cooler)') };
    }
    case RST.COOL: {
      const v = clamp(n.pumps + up, 0, 3); if (v === n.pumps) return { err: up > 0 ? 'All three pumps are on' : 'The pumps are all off' };
      n.pumps = v; return { g: n, msg: broken(n, FAULT.BREAKER, T) ? 'PUMPS ' + v + '/3, but there is no power to them! Flip the BREAKER' : 'PUMPS ' + v + '/3' };
    }
    case RST.TURB: {
      if (broken(n, FAULT.VALVE, T)) return { err: 'The valve is stuck! Someone unstick it on the reactor floor' };
      const v = clamp(n.turb + up, 0, 10); if (v === n.turb) return { err: up > 0 ? 'The turbine is wide open' : 'The turbine is shut' };
      n.turb = v; return { g: n, msg: 'TURBINE ' + v + '/10' };
    }
  }
  return { err: '?' };
}
/** How a shift went, in a line. */
export const verdict = (score: number, melted: boolean): string => (melted ? 'MELTDOWN! The city had a very dim evening' : score >= 90 ? 'THE CITY IS BLAZING WITH LIGHT!' : score >= 75 ? 'CITY LIGHTS ON!' : score >= 50 ? 'A BIT FLICKERY' : 'BLACKOUT...');
