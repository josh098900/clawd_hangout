// GROUP DANCES: when 3 or more critters (players, bots or NPCs) dance within a few steps of each
// other, they fall into the same routine and the ground under them lights up. The routine is
// timed off the WALL clock, so a crew is in step on every screen, and nothing is sent: every
// browser works the crews out from the positions it already has.
//
// The routine is a 16-second phrase at 120 bpm: four moves of 8 beats each.

import { CONFETTI } from '../engine/palette';
import { r, lit, alpha, Gd, txtOutlined, tw } from '../engine/pixel';
import type { Pose } from '../entities/critter';
import type { Avatar } from '../entities/avatar';

export const CREW_MIN = 3;
/** How close two dancers must be to join up (a few steps). */
const LINK_X = 66, LINK_Y = 38;
export const MOVES = ['STEP IT', 'THE WAVE', 'SPIN!', 'JUMP!'] as const;

export interface Crew { members: Avatar[]; cx: number; cy: number; x0: number; x1: number; top: number }

/** The shared beat: 2 per second from the wall clock. */
export const crewBeat = (nowMs = Date.now()): number => nowMs / 500;
export const crewMove = (beat = crewBeat()): number => Math.floor(beat / 8) % 4;

/** Group the dancers: link any two within a few steps, keep groups of CREW_MIN or more, and set each member's av.crew. */
export function findCrews(dancers: Avatar[]): Crew[] {
  for (const d of dancers) d.crew = null;
  const n = dancers.length, root = dancers.map((_, i) => i);
  const find = (i: number): number => { while (root[i] !== i) i = root[i] = root[root[i]]; return i; };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = dancers[i], b = dancers[j];
    if (Math.abs(a.x - b.x) < LINK_X && Math.abs(a.y - b.y) < LINK_Y) root[find(i)] = find(j);
  }
  const groups = new Map<number, Avatar[]>();
  for (let i = 0; i < n; i++) { const g = find(i); groups.set(g, [...(groups.get(g) ?? []), dancers[i]]); }
  const crews: Crew[] = [];
  for (const m of groups.values()) {
    if (m.length < CREW_MIN) continue;
    m.sort((p, q) => p.x - q.x); // the wave runs left to right
    m.forEach((av, i) => { av.crew = { rank: i, n: m.length }; });
    const x0 = m[0].x, x1 = m[m.length - 1].x;
    crews.push({ members: m, cx: (x0 + x1) / 2, cy: m.reduce((s, av) => s + av.y, 0) / m.length, x0, x1, top: Math.min(...m.map((av) => av.y)) });
  }
  return crews;
}

/** Pose a crew member for the routine. Returns how far they're off the ground (px). */
export function crewPose(P: Pose, rank: number, beat = crewBeat()): number {
  const move = crewMove(beat), b = ((beat % 8) + 8) % 8, k = Math.floor(b), f = b - k;
  P.eyes = 'h'; P.mouth = 's';
  if (move === 0) { // STEP IT: side to side together, arms waving
    P.dir = k % 4 < 2 ? 1 : -1; P.lean = (k % 2 ? 1 : -1) * 3; P.arm = 'wave'; P.wave = Math.sin(beat * Math.PI) * 2;
    P.lift = k % 2 ? 1 : 2; P.sy = 1 - 0.08 * Math.exp(-f * 9); P.ant = -P.lean * 1.3;
    return Math.sin(f * Math.PI) * 3;
  }
  if (move === 1) { // THE WAVE: a ripple of jumps along the line, arms up as it passes
    const g = (((beat - rank * 0.5) % 4) + 4) % 4;
    P.dir = 1;
    if (g < 1) { P.arm = 'up'; P.mouth = 'O'; P.sy = 1.05; P.ant = -2; return Math.sin(g * Math.PI) * 8; }
    P.arm = 'rest'; P.sy = 1 - 0.03 * Math.sin(f * Math.PI); P.lean = Math.sin(beat * Math.PI) * 1.5;
    return Math.sin(f * Math.PI) * 1;
  }
  if (move === 2) { // SPIN: turn twice a beat, arms up
    const h = Math.floor(beat * 2);
    P.dir = h % 2 ? 1 : -1; P.sx = 0.72 + 0.28 * Math.abs(Math.cos(beat * Math.PI * 2)); P.arm = 'up'; P.ant = (h % 2 ? 1 : -1) * 3;
    return 2 + Math.sin(f * Math.PI) * 2;
  }
  // JUMP!: crouch, jump, crouch, jump... then everyone strikes a pose for the last 2 beats
  if (k >= 6) { P.arm = 'up'; P.dir = rank % 2 ? 1 : -1; P.lean = P.dir * 3; P.mouth = 'O'; P.sy = 1.04; P.ant = -P.dir * 3; return 0; }
  if (k % 2 === 0) { P.sy = 0.86 + 0.1 * f; P.arm = 'rest'; P.lean = 0; return 0; }
  P.arm = 'up'; P.sy = 1.06; P.mouth = 'O'; P.ant = -3; return Math.sin(f * Math.PI) * 11;
}

/** The ground under a crew lights up in coloured tiles, pulsing on the beat (drawn under everyone). */
export function drawCrewFloor(c: Crew, beat = crewBeat()): void {
  const rx = (c.x1 - c.x0) / 2 + 36, ry = 18 + Math.min(20, c.members.length * 2), f = beat % 1, pulse = Math.exp(-f * 4);
  const TW = 12, TH = 6, x0 = Math.floor((c.cx - rx) / TW) * TW, y0 = Math.floor((c.cy - ry) / TH) * TH;
  lit(() => alpha(0.26 + 0.22 * pulse, () => {
    for (let y = y0, j = 0; y < c.cy + ry; y += TH, j++) for (let x = x0, i = 0; x < c.cx + rx; x += TW, i++) {
      const u = (x + TW / 2 - c.cx) / rx, v = (y + TH / 2 - c.cy) / ry;
      if (u * u + v * v > 1) continue;
      r(x + 1, y + 1, TW - 2, TH - 2, CONFETTI[(i + j * 3 + Math.floor(beat)) % CONFETTI.length]);
    }
  }));
  Gd(c.cx, c.cy - 4, rx * 0.8, CONFETTI[Math.floor(beat) % CONFETTI.length], 0.18 + 0.12 * pulse);
}

/** "CREW OF 4" and the move's name, bobbing over the crew (drawn over everyone). */
export function drawCrewTag(c: Crew, beat = crewBeat()): void {
  const a = 'CREW OF ' + c.members.length, b = MOVES[crewMove(beat)], y = Math.round(c.top - 78 - Math.abs(Math.sin(beat * Math.PI)) * 2);
  const col = CONFETTI[Math.floor(beat / 2) % CONFETTI.length];
  txtOutlined(a, Math.round(c.cx - tw(a) / 2), y, [255, 236, 170]);
  txtOutlined(b, Math.round(c.cx - tw(b, 2) / 2), y + 8, col, 2);
}
