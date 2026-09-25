// COOKIE's tour of the Diner kitchen, for first-timers (and anyone who TALKs to COOKIE). It's a
// hands-on practice run in a private kitchen (game/diner.ts practiceShift: one ticket for a
// BURGER, FRIES and a SHAKE, no rush): COOKIE walks to each station, an arrow bounces over it,
// the banner says exactly what to do, and each step waits until you've done it. Local only:
// nothing here is sent, and other players still see COOKIE on his usual rounds.

import { HOLD_BURGER, HOLD_CHAR, HOLD_COOKED, HOLD_FRIES, HOLD_FROZEN, HOLD_PATTY, HOLD_SHAKE } from '../entities/avatar';
import { ST, type DinerState } from './diner';

/** Where COOKIE stands and the arrow points: a station (ST), the time clock, or you. */
export type TourAt = number | 'clock' | 'you';
export interface TourStep {
  /** What COOKIE says (a speech bubble, so keep it short). */
  say: string;
  /** The instruction in the banner, which stays up until the step is done. */
  bar: string;
  at: TourAt;
  /** Done when this is true (or after `wait` seconds for the talky steps). */
  done?: (c: { hold: number; g: DinerState }) => boolean;
  wait?: number;
}
const served = (g: DinerState, k: number) => ((g.served[0] ?? 0) & (1 << k)) !== 0; // the ticket is B, F, S

export const TOUR: TourStep[] = [
  { at: 'you', wait: 5, say: "Hi, I'm COOKIE! First time? Let me show you the kitchen!", bar: 'COOKIE wants to show you around the kitchen (SKIP TOUR if you know it)' },
  { at: ST.PASS, wait: 6.5, say: 'Orders come in on TICKETS. This one wants a BURGER, FRIES and a SHAKE!', bar: 'Every order is a TICKET (top of the screen, and on the rail). Let\'s make this one!' },
  { at: ST.FRIDGE, say: 'Burger first! Grab a raw patty from the FRIDGE: walk up, press E.', bar: 'STEP 1/9: take a patty from the FRIDGE (walk up to it and press E)', done: (c) => c.hold === HOLD_PATTY || c.g.grill.some(Boolean) || c.hold === HOLD_COOKED },
  { at: ST.GRILL, say: 'Now slap it on the GRILL. Press E!', bar: 'STEP 2/9: put the patty on the GRILL (E)', done: (c) => c.g.grill.some(Boolean) || c.hold === HOLD_COOKED },
  { at: ST.GRILL, say: 'It cooks in 6 seconds. Wait for the green ! then take it off!', bar: 'STEP 3/9: when a green ! shows, take the patty off the GRILL (E). Not too long, it burns!', done: (c) => c.hold === HOLD_COOKED },
  { at: ST.BUNS, say: 'Into a bun it goes! BUNS, press E.', bar: 'STEP 4/9: make it a burger at the BUNS (E)', done: (c) => c.hold === HOLD_BURGER },
  { at: ST.PASS, say: 'To the PASS! Press E to serve it.', bar: 'STEP 5/9: serve the burger at the PASS (E)', done: (c) => served(c.g, 0) },
  { at: ST.FREEZER, say: 'Lovely! Now fries: they are in the FREEZER.', bar: 'STEP 6/9: take frozen fries from the FREEZER (E)', done: (c) => c.hold === HOLD_FROZEN || c.g.fry.some(Boolean) || c.hold === HOLD_FRIES },
  { at: ST.FRYER, say: 'Drop them in the FRYER. 5 seconds!', bar: 'STEP 6/9: put the fries in the FRYER (E)', done: (c) => c.g.fry.some(Boolean) || c.hold === HOLD_FRIES },
  { at: ST.FRYER, say: 'Golden? Green ! means ready. Take them out!', bar: 'STEP 7/9: when a green ! shows, take the fries out of the FRYER (E)', done: (c) => c.hold === HOLD_FRIES },
  { at: ST.PASS, say: 'And serve them at the PASS!', bar: 'STEP 7/9: serve the fries at the PASS (E)', done: (c) => served(c.g, 1) },
  { at: ST.SHAKE, say: 'Last one, the easy one: press E at the SHAKES machine.', bar: 'STEP 8/9: blend a shake at the SHAKES machine (E)', done: (c) => c.g.shake > 0 || c.hold === HOLD_SHAKE },
  { at: ST.SHAKE, say: '4 seconds of whirring... then grab it!', bar: 'STEP 8/9: take the shake when it\'s ready (E)', done: (c) => c.hold === HOLD_SHAKE },
  { at: ST.PASS, say: 'Serve it and the ticket is DONE!', bar: 'STEP 9/9: serve the shake at the PASS (E)', done: (c) => served(c.g, 2) },
  { at: 'clock', wait: 10, say: 'ORDER UP! That is the job. CLOCK IN here for a real shift!', bar: 'TOUR DONE! CLOCK IN at the time clock for a real 3-minute shift. Q drops things, burnt food goes in the BIN' },
];
/** Burnt something on the tour: bin it, then go back to the step that makes that food again. */
export const BURNT: TourStep = { at: ST.BIN, say: 'Oops, burnt! Throw it in the BIN and we try again.', bar: 'Burnt! Take it to the BIN (E) or press Q to drop it', done: (c) => c.hold !== HOLD_CHAR };
export const isBurnt = (hold: number): boolean => hold === HOLD_CHAR;
/** The step to go back to after binning a burnt patty (2) or burnt fries (7). */
export const retryStep = (step: number): number => (step <= 6 ? 2 : 7);
