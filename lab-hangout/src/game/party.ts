// Party games. Whoever starts one is its host: only the host's browser advances the phases
// (it can see where everyone is sitting), everyone else just renders the shared state.
// If the host leaves, the game goes stale and everyone ignores it after a short grace.
//
//   Musical chairs (the Cinema): music plays, you keep moving; it stops, you grab one of the
//   glowing seats; there's always one seat too few. Last one seated wins.
//   Tag (the Square): whoever is IT chases; touch someone to pass it on. After 60 s the
//   player who spent the least time as IT wins.

import type { GameState } from '../net/transport';

export const wall = (): number => Date.now() / 1000;

function base(kind: GameState['kind'], host: string, ids: string[], names: string[]): GameState {
  return { kind, host, phase: 'ready', t0: wall(), dur: 5, round: 1, ids, names, alive: ids.map((_, i) => i), seats: [], out: [], it: -1, last: -1, since: wall(), times: ids.map(() => 0) };
}
export const startChairs = (host: string, ids: string[], names: string[]): GameState => base('chairs', host, ids, names);
export function startTag(host: string, ids: string[], names: string[]): GameState {
  const g = base('tag', host, ids, names);
  g.phase = 'play'; g.dur = 60; g.it = Math.floor(Math.random() * ids.length);
  return g;
}

/** A game that's running (not off, not abandoned by a vanished host). */
export function live(g: GameState | null | undefined): g is GameState {
  return !!g && g.kind !== 'off' && wall() - g.t0 < g.dur + 12;
}
export const left = (g: GameState): number => Math.max(0, g.dur - (wall() - g.t0));

export interface HostView {
  /** Spot index this player is using (-1 none), or null if they're not in the room any more. */
  using(id: string): number | null;
  /** The room's seats, in the order musical chairs opens them. */
  seatSpots: number[];
  pos(id: string): { x: number; y: number } | null;
}

/** The host's tick: returns the next state when a phase ends, else null. */
export function hostStep(g: GameState, v: HostView): GameState | null {
  if (left(g) > 0) return null;
  const n = { ...g, t0: wall() };
  if (g.kind === 'tag') {
    if (g.phase === 'play') { n.times = [...g.times]; n.times[g.it] += wall() - g.since; n.phase = 'over'; n.dur = 7; return n; }
    return { ...n, kind: 'off', dur: 0 };
  }
  switch (g.phase) {
    case 'ready': case 'out':
      if (g.phase === 'out' && g.alive.length <= 1) return { ...n, phase: 'over', dur: 7 };
      return { ...n, phase: 'music', dur: 6 + Math.random() * 7, seats: [], out: g.phase === 'out' ? [] : g.out, round: g.phase === 'out' ? g.round + 1 : g.round };
    case 'music':
      return { ...n, phase: 'grab', dur: 7, seats: v.seatSpots.slice(0, Math.max(1, g.alive.length - 1)) };
    case 'grab': {
      const seated = g.alive.filter((i) => { const u = v.using(g.ids[i]); return u !== null && g.seats.includes(u); });
      // nobody (or everybody) managed it: replay the round rather than end in a tie
      if (seated.length === 0 || seated.length === g.alive.length) return { ...n, phase: 'out', dur: 3, out: [] };
      return { ...n, phase: 'out', dur: 3, out: g.alive.filter((i) => !seated.includes(i)), alive: seated };
    }
    case 'over': return { ...n, kind: 'off', dur: 0 };
  }
  return null;
}

/** Tag: if player `who` (the one who is IT) is touching someone, pass it on. */
export function tagTouch(g: GameState, v: HostView): GameState | null {
  if (g.kind !== 'tag' || g.phase !== 'play' || g.it < 0) return null;
  const p = v.pos(g.ids[g.it]); if (!p) return null;
  for (let i = 0; i < g.ids.length; i++) {
    if (i === g.it || (i === g.last && wall() - g.since < 1.5)) continue;
    const q = v.pos(g.ids[i]);
    if (q && Math.abs(q.x - p.x) < 14 && Math.abs(q.y - p.y) < 9) {
      const times = [...g.times]; times[g.it] += wall() - g.since;
      return { ...g, it: i, last: g.it, since: wall(), times };
    }
  }
  return null;
}

export function winner(g: GameState): number {
  if (g.kind === 'chairs') return g.alive.length === 1 ? g.alive[0] : -1;
  let best = -1; g.times.forEach((t, i) => { if (best < 0 || t < g.times[best]) best = i; });
  return best;
}

const mmss = (s: number) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
/** One line for the banner at the top of the screen. */
export function banner(g: GameState): string {
  const L = Math.ceil(left(g)), w = winner(g);
  if (g.kind === 'tag') return g.phase === 'play' ? 'TAG · ' + g.names[g.it] + ' IS IT! · ' + mmss(left(g)) : 'TAG OVER · WINNER: ' + (g.names[w] ?? '?') + ' (least time as IT)';
  switch (g.phase) {
    case 'ready': return 'MUSICAL CHAIRS · ' + g.alive.length + ' PLAYERS · GET READY ' + L;
    case 'music': return 'MUSICAL CHAIRS · ROUND ' + g.round + ' · ' + g.alive.length + ' LEFT · KEEP MOVING!';
    case 'grab': return 'GRAB A SEAT! ' + L;
    case 'out': return g.out.length ? 'OUT: ' + g.out.map((i) => g.names[i]).join(', ') : 'NOBODY OUT · AGAIN!';
    case 'over': return 'WINNER: ' + (g.names[w] ?? '?') + '!';
  }
  return '';
}
/** Should the party track be playing? */
export const partyMusic = (g: GameState): boolean => (g.kind === 'chairs' && (g.phase === 'music' || g.phase === 'ready')) || (g.kind === 'tag' && g.phase === 'play');
