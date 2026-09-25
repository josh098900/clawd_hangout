// THE DINER's kitchen game: co-op cooking for 1-8 cooks (best with 2-4).
//
// CLOCK IN at the time clock to start a 3-minute shift. Order tickets come in on a timetable
// worked out from the shift's start and seed (so nobody sends them), faster with more cooks.
// Cooks carry one thing at a time between the stations:
//   FRIDGE -> raw patty -> GRILL (cooked at 6 s, burnt at 16 s) -> BUNS -> burger
//   FREEZER -> frozen fries -> FRYER (done at 5 s, burnt at 14 s) -> fries
//   SHAKE MACHINE (4 s) -> shake        BIN: throw away what you hold
//   PASS: serve a burger / fries / shake to the oldest ticket that wants it
// A finished ticket scores 10 per item plus a bonus for time left; a missed one costs 5.
//
// Networking, like the party games: whoever clocked in HOSTS the shift and owns the state
// (room state 'diner': hands, grill, fryer, shake, dishes served, points). Everyone else sends a
// tiny 'cook' message ("I pressed E at station n") and the host applies it with cookAct() and
// re-sends the state. Everyone also runs cookAct() on their own copy first, just to show the
// right message straight away (the host's answer is what counts). If the host leaves, they hand
// over (or the next cook still in the room takes over).
// Everything that just depends on TIME is worked out from the clock by every browser, never sent:
// when tickets arrive, which were missed, when the shift ends, and so the final score. (So the
// shift still ends on time if the host's tab is in the background and its game loop is paused.)

import { HOLD_BURGER, HOLD_CHAR, HOLD_COOKED, HOLD_FRIES, HOLD_FROZEN, HOLD_PATTY, HOLD_SHAKE } from '../entities/avatar';

export const SHIFT_S = 180, COOKS_MAX = 8;
export const ST = { FRIDGE: 0, FREEZER: 1, GRILL: 2, FRYER: 3, BUNS: 4, SHAKE: 5, BIN: 6, PASS: 7 } as const;
export const STATION_NAMES = ['FRIDGE', 'FREEZER', 'GRILL', 'FRYER', 'BUNS', 'SHAKES', 'BIN', 'PASS'];
/** Seconds: grill cooked / burnt, fryer done / burnt, shake ready. */
export const T = { GRILL: 6, GRILL_BURN: 16, FRY: 5, FRY_BURN: 14, SHAKE: 4 };

export type Dish = 'B' | 'F' | 'S';
export const DISH_NAME: Record<Dish, string> = { B: 'BURGER', F: 'FRIES', S: 'SHAKE' };
const DISH_HOLD: Record<Dish, number> = { B: HOLD_BURGER, F: HOLD_FRIES, S: HOLD_SHAKE };

export interface DinerState {
  host: string;
  /** Wall-clock start (ms), the ticket seed, and how many cooks it was started for (1-4: sets the pace). */
  t0: number; seed: number; lvl: number;
  ids: string[]; names: string[]; hands: number[];
  /** When each grill slot / fryer basket got its food (wall ms), 0 = empty; the shake machine likewise. */
  grill: number[]; fry: number[]; shake: number;
  /** Per ticket: a bitmask of the dishes served so far. */
  served: number[];
  /** Points from finished tickets (see score() for the total), and how many were finished. */
  pts: number; done: number;
}
export interface Ticket { i: number; dishes: Dish[]; at: number; due: number }

/** A small integer hash (same idea as the weather's). */
function mix(n: number): number {
  let h = n >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
const GAP = [22, 18, 15, 12];
/** Every ticket of this shift: what it wants, when it comes in and when it's due (wall ms). */
export function tickets(g: DinerState): Ticket[] {
  const out: Ticket[] = [], gap = GAP[Math.max(1, Math.min(4, g.lvl)) - 1];
  for (let i = 0; ; i++) {
    const at = 3 + i * gap; if (at > SHIFT_S - 25) break;
    const h = mix(g.seed * 131 + i), n = i < 2 ? 1 + (h % 2) : 1 + (h % 3), dishes: Dish[] = [];
    for (let k = 0; k < n; k++) { const v = mix(h + k * 977) % 10; dishes.push(v < 4 ? 'B' : v < 7 ? 'F' : 'S'); }
    dishes.sort((a, b) => 'BFS'.indexOf(a) - 'BFS'.indexOf(b));
    out.push({ i, dishes, at: g.t0 + at * 1000, due: g.t0 + (at + 34 + 12 * n) * 1000 });
  }
  return out;
}
const full = (t: Ticket) => (1 << t.dishes.length) - 1;
export const ticketDone = (g: DinerState, t: Ticket): boolean => (g.served[t.i] ?? 0) === full(t);
/** Tickets up on the rail now: arrived, not finished, not past due (oldest first). */
export const openTickets = (g: DinerState, now = Date.now()): Ticket[] => tickets(g).filter((t) => t.at <= now && now <= t.due && !ticketDone(g, t));
/** Tickets that ran out of time (by `now`, and before the shift ended). */
export const missed = (g: DinerState, now = Date.now()): number => tickets(g).filter((t) => t.due < Math.min(now, shiftEnd(g)) && !ticketDone(g, t)).length;
export const shiftEnd = (g: DinerState): number => g.t0 + SHIFT_S * 1000;
/** The score: points for finished tickets, minus 5 for each missed one. */
export const score = (g: DinerState, now = Date.now()): number => g.pts - 5 * missed(g, now);

/** A grill slot / fryer basket / the shake machine right now. */
export function cookState(since: number, done: number, burn: number, now = Date.now()): 'empty' | 'cooking' | 'done' | 'burnt' {
  if (!since) return 'empty';
  const s = (now - since) / 1000;
  return s < done ? 'cooking' : s < burn ? 'done' : 'burnt';
}
export const grillAt = (g: DinerState, k: number, now = Date.now()) => cookState(g.grill[k], T.GRILL, T.GRILL_BURN, now);
export const fryAt = (g: DinerState, k: number, now = Date.now()) => cookState(g.fry[k], T.FRY, T.FRY_BURN, now);
export const shakeAt = (g: DinerState, now = Date.now()) => cookState(g.shake, T.SHAKE, 1e9, now);
export const live = (g: DinerState | null, now = Date.now()): g is DinerState => !!g && now >= g.t0 - 2000 && now < shiftEnd(g); // (2 s of grace for clocks a little apart)

export function newShift(host: string, name: string, cooks: number, now = Date.now()): DinerState {
  return { host, t0: now, seed: Math.floor(Math.random() * 99999), lvl: Math.max(1, Math.min(4, cooks)), ids: [host], names: [name], hands: [0], grill: [0, 0], fry: [0, 0], shake: 0, served: [], pts: 0, done: 0 };
}

/** What E does at station `st` for someone holding `hand` (the hint on the action button). */
export function stationLabel(g: DinerState | null, st: number, hand: number, now = Date.now()): string {
  if (!live(g, now)) return st === ST.PASS ? 'THE PASS' : STATION_NAMES[st];
  switch (st) {
    case ST.FRIDGE: return hand ? 'FRIDGE' : 'TAKE PATTY';
    case ST.FREEZER: return hand ? 'FREEZER' : 'TAKE FRIES';
    case ST.GRILL: return hand === HOLD_PATTY ? 'GRILL IT' : hand ? 'GRILL' : 'TAKE PATTY';
    case ST.FRYER: return hand === HOLD_FROZEN ? 'FRY IT' : hand ? 'FRYER' : 'TAKE FRIES';
    case ST.BUNS: return hand === HOLD_COOKED ? 'MAKE BURGER' : 'BUNS';
    case ST.SHAKE: return hand ? 'SHAKES' : shakeAt(g, now) === 'empty' ? 'BLEND SHAKE' : 'TAKE SHAKE';
    case ST.BIN: return hand ? 'BIN IT' : 'BIN';
    default: return hand === HOLD_BURGER || hand === HOLD_FRIES || hand === HOLD_SHAKE ? 'SERVE!' : 'THE PASS';
  }
}

/**
 * Cook `who` pressed E at station `st`. Returns the new state and a word for them, or an error
 * (nothing changes). Pure: the host runs it for real, everyone else runs it to predict.
 */
export function cookAct(g0: DinerState, who: string, name: string, st: number, now = Date.now()): { g: DinerState; msg: string; served?: Dish; ticket?: boolean } | { err: string } {
  if (!live(g0, now)) return { err: 'The shift is over' };
  const g: DinerState = { ...g0, ids: [...g0.ids], names: [...g0.names], hands: [...g0.hands], grill: [...g0.grill], fry: [...g0.fry], served: [...g0.served] };
  let p = g.ids.indexOf(who);
  if (p < 0) { if (g.ids.length >= COOKS_MAX) return { err: 'The kitchen is full!' }; g.ids.push(who); g.names.push(name); g.hands.push(0); p = g.ids.length - 1; }
  const hand = g.hands[p], set = (h: number) => { g.hands[p] = h; };
  const full = 'Your hands are full (Q to drop it)';
  switch (st) {
    case ST.FRIDGE: if (hand) return { err: full }; set(HOLD_PATTY); return { g, msg: 'A raw patty. To the GRILL!' };
    case ST.FREEZER: if (hand) return { err: full }; set(HOLD_FROZEN); return { g, msg: 'Frozen fries. To the FRYER!' };
    case ST.GRILL: case ST.FRYER: {
      const slots = st === ST.GRILL ? g.grill : g.fry, at = (k: number) => (st === ST.GRILL ? grillAt(g, k, now) : fryAt(g, k, now));
      const raw = st === ST.GRILL ? HOLD_PATTY : HOLD_FROZEN, cooked = st === ST.GRILL ? HOLD_COOKED : HOLD_FRIES;
      if (hand === raw) {
        const k = slots.findIndex((v) => !v); if (k < 0) return { err: st === ST.GRILL ? 'The grill is full' : 'Both baskets are full' };
        slots[k] = now; set(0); return { g, msg: st === ST.GRILL ? 'Sizzle! Cooked in 6 s. Don\'t let it burn' : 'Into the oil! Done in 5 s' };
      }
      if (hand) return { err: full };
      // take the best one: done before burnt, and the oldest of those
      const order = [0, 1].filter((k) => slots[k]).sort((a, b) => (at(a) === 'done' ? 0 : at(a) === 'burnt' ? 1 : 2) - (at(b) === 'done' ? 0 : at(b) === 'burnt' ? 1 : 2) || slots[a] - slots[b]);
      const k = order[0];
      if (k === undefined) return { err: st === ST.GRILL ? 'Nothing on the grill. Patties are in the FRIDGE' : 'Nothing frying. Fries are in the FREEZER' };
      if (at(k) === 'cooking') return { err: 'Still cooking...' };
      const burnt = at(k) === 'burnt'; slots[k] = 0; set(burnt ? HOLD_CHAR : cooked);
      return { g, msg: burnt ? 'Burnt to a crisp! BIN it' : st === ST.GRILL ? 'Perfect patty! Now to the BUNS' : 'Golden fries! To the PASS' };
    }
    case ST.BUNS:
      if (hand === HOLD_COOKED) { set(HOLD_BURGER); return { g, msg: 'One burger! To the PASS' }; }
      return { err: hand === HOLD_PATTY ? 'Cook it on the GRILL first!' : 'Bring a cooked patty here' };
    case ST.SHAKE: {
      if (hand) return { err: full };
      const s = shakeAt(g, now);
      if (s === 'empty') { g.shake = now; return { g, msg: 'Whirrrr... ready in 4 s' }; }
      if (s === 'cooking') return { err: 'Nearly blended...' };
      g.shake = 0; set(HOLD_SHAKE); return { g, msg: 'A strawberry shake! To the PASS' };
    }
    case ST.BIN: if (!hand) return { err: 'Nothing to throw away' }; set(0); return { g, msg: 'Binned' };
    case ST.PASS: {
      const dish = (Object.keys(DISH_HOLD) as Dish[]).find((d) => DISH_HOLD[d] === hand);
      if (!dish) return { err: hand === HOLD_CHAR ? 'Nobody wants THAT. BIN it' : hand ? 'That\'s not ready to serve yet' : 'Bring food here to serve it' };
      for (const t of openTickets(g, now)) {
        const k = t.dishes.findIndex((d, j) => d === dish && !((g.served[t.i] ?? 0) & (1 << j)));
        if (k < 0) continue;
        while (g.served.length <= t.i) g.served.push(0);
        g.served[t.i] |= 1 << k; set(0);
        if (ticketDone(g, t)) { const bonus = Math.ceil(Math.max(0, t.due - now) / 5000); g.pts += 10 * t.dishes.length + bonus; g.done++; return { g, msg: 'ORDER UP! Ticket ' + (t.i + 1) + ' done: +' + (10 * t.dishes.length + bonus), served: dish, ticket: true }; }
        return { g, msg: DISH_NAME[dish] + ' served for ticket ' + (t.i + 1), served: dish };
      }
      return { err: 'Nobody ordered a ' + DISH_NAME[dish] + ' right now' };
    }
  }
  return { err: '?' };
}

/** How the shift went, in a word. */
export const verdict = (score: number): string => (score >= 200 ? 'LEGENDARY SHIFT!' : score >= 120 ? 'HEAD CHEF MATERIAL!' : score >= 60 ? 'NICE SHIFT!' : score > 0 ? 'NOT BAD FOR A FIRST DAY' : 'THE CUSTOMERS WENT HUNGRY...');
