// Demo bots for LOCAL mode (?bots=4). They're fake remote players that wander, emote, chat,
// sit down, fetch coffee and play the arcade, so you can judge the look of a busy room without
// opening lots of tabs. They only exist in your browser and never touch the network.

import { EMOTES, HOLD_MUG, HOLD_POPCORN, HOLD_SODA, POSE_DANCE, useEmote, type EmoteKind } from '../entities/avatar';
import { h1 } from '../engine/math';
import { routeTo, walkable, type Room } from '../world/room';
import type { NetEvent } from '../net/transport';
import { botLine } from '../ui/overlay';

interface Bot { id: string; x: number; y: number; tx: number; ty: number; wait: number; dir: 1 | -1; k: number; use: number; goal: number; hold: number; sips: number; sipIn: number; react: number; path: [number, number][]; sent: number; /** dancing (POSE_DANCE) until its wait runs out */ pose: number }
/** What bots need to know about a running party game. */
export interface BotGame {
  kind: 'chairs' | 'tag'; phase: string; players: Set<string>; seats: number[]; itId: string | null;
  pos(id: string): { x: number; y: number } | null;
}
const NAMES = ['PIP', 'NOVA', 'BYTE', 'MOSS', 'ZIGGY', 'LUMEN', 'TOFU', 'QUARK'];

export class Bots {
  private bots: Bot[] = [];
  private k = 0;
  constructor(private n: number, private emit: (e: NetEvent) => void) {}
  /** For the dev debug hook. */
  debug(): readonly Bot[] { return this.bots; }

  spawn(room: Room): void {
    for (const b of this.bots) this.emit({ type: 'leave', id: b.id });
    this.bots = [];
    for (let i = 0; i < this.n; i++) {
      const p = this.pick(room, i * 7.3 + 1);
      const b: Bot = { id: 'bot-' + i, x: p.x, y: p.y, tx: p.x, ty: p.y, wait: h1(i) * 3, dir: 1, k: i * 13, use: -1, goal: -1, hold: 0, sips: 0, sipIn: 3, react: -1, path: [], sent: 0, pose: 0 };
      this.bots.push(b);
      this.emit({ type: 'join', peer: { id: b.id, name: NAMES[i % NAMES.length], look: { c: (i * 3 + 1) % 8, hat: i % 5, face: (i * 2) % 4, fit: (i + 1) % 4, sp: i % 3 === 1 ? 1 : 0 }, x: b.x, y: b.y, dir: 1, moving: false } });
      this.send(b, false);
    }
  }

  private send(b: Bot, moving: boolean): void {
    // walking updates at ~9 Hz like a real client (the receiver rate-limits floods); stops, sits and stands always go out
    const t = performance.now() / 1000;
    if (moving && t - b.sent < 0.11) return;
    b.sent = t;
    this.emit({ type: 'move', id: b.id, m: { x: b.x, y: b.y, dir: b.dir, moving, use: b.use, hold: b.hold, pose: moving ? 0 : b.pose } });
  }

  /** Debug: every bot dances in a ring around (x, y) for a minute (to see a group dance). */
  danceAt(x: number, y: number): void {
    this.bots.forEach((b, i) => { b.x = x + 30 + (i % 4) * 30 - (i >= 4 ? 15 : 60); b.y = y + (i >= 4 ? 22 : -8); b.tx = b.x; b.ty = b.y; b.path = []; b.goal = -1; b.use = -1; b.hold = 0; b.pose = POSE_DANCE; b.wait = 60; this.send(b, false); });
  }

  private pick(room: Room, seed: number): { x: number; y: number } {
    const f = room.floor;
    for (let t = 0; t < 30; t++) {
      const x = f.x0 + 30 + h1(seed + t * 3.1) * (f.x1 - f.x0 - 60), y = f.y0 + 8 + h1(seed + t * 5.7) * (f.y1 - f.y0 - 16);
      if (walkable(room, x, y)) return { x, y };
    }
    return { ...room.spawn };
  }

  /** `busy` = spots in use by anyone else (you, other players, NPCs). */
  /** `dancers` = where anyone else is dancing (bots nearby like to join in: group dances!). */
  update(room: Room, dt: number, busy: Set<number>, game: BotGame | null = null, dancers: { x: number; y: number }[] = []): void {
    const taken = (i: number) => busy.has(i) || this.bots.some((o) => o.use === i || o.goal === i);
    for (const b of this.bots) {
      if (game && game.players.has(b.id) && this.play(b, room, dt, game, taken)) continue;
      // a bot with a mug sips now and then
      if (b.hold) {
        b.sipIn -= dt;
        if (b.sipIn <= 0) { b.sipIn = 3 + h1(this.k++ + b.k) * 4; this.emit({ type: 'emote', id: b.id, kind: useEmote(b.hold) }); if (++b.sips >= 5) { b.hold = 0; b.sips = 0; this.send(b, false); } }
      }
      // a bot at an instrument jams: a note every quarter-second or so, on a little pattern
      if (b.use >= 0 && room.spots[b.use]?.kind === 'instrument' && h1(++this.k * 0.37 + b.k) < dt * 4) {
        const inst = room.spots[b.use].inst ?? 0, n = inst === 1 ? [0, 2, 1, 2][Math.floor(this.k / 3) % 4] : Math.floor(h1(this.k + b.k) * 8);
        this.emit({ type: 'note', id: b.id, i: inst, n });
      }
      if (b.wait > 0) {
        b.wait -= dt;
        if (b.wait <= 0) {
          if (b.pose) { b.pose = 0; this.send(b, false); }
          // someone's dancing nearby: often go and join them
          const d = !game && !b.hold && b.use < 0 ? dancers.find((p) => Math.hypot(p.x - b.x, p.y - b.y) < 260) : undefined;
          if (d && h1(++this.k * 2.2 + b.k) < 0.6) {
            for (let t = 0; t < 8; t++) {
              const x = d.x + (h1(++this.k) < 0.5 ? -1 : 1) * (26 + h1(++this.k) * 26), y = d.y + (h1(++this.k) - 0.5) * 36;
              if (walkable(room, x, y)) { this.go(b, room, x, y); b.goal = -2; break; }
            }
            if (b.goal === -2) continue;
          }
          if (b.use >= 0) { // done with the spot: step off it (coffee = now holding a mug)
            const s = room.spots[b.use];
            const got = s.kind === 'coffee' ? HOLD_MUG : s.kind === 'popcorn' ? HOLD_POPCORN : s.kind === 'soda' ? HOLD_SODA : 0;
            if (got) { b.hold = got; b.sips = 0; }
            b.x = s.sx; b.y = s.sy; b.use = -1; this.send(b, false);
          }
          const r = h1(++this.k * 1.37 + b.k);
          if (r < 0.18) this.emit({ type: 'chat', id: b.id, text: botLine(this.k + b.k) });
          else if (r < 0.34) this.emit({ type: 'emote', id: b.id, kind: EMOTES[Math.floor(h1(this.k + 0.5) * EMOTES.length)].kind as EmoteKind });
          // sometimes head for a free spot, otherwise wander
          const free = room.spots.map((_, i) => i).filter((i) => { const k = room.spots[i].kind; return !taken(i) && ['sit', 'coffee', 'arcade', 'popcorn', 'soda', 'desk', 'instrument'].includes(k) && !(b.hold && (k === 'coffee' || k === 'popcorn' || k === 'soda')); });
          if (free.length && !game && h1(this.k * 3.3 + b.k) < 0.35) {
            const i = free[Math.floor(h1(this.k * 4.1 + b.k) * free.length)];
            b.goal = i; this.go(b, room, room.spots[i].sx, room.spots[i].sy);
          } else { const p = this.pick(room, this.k * 2.9 + b.k); b.tx = p.x; b.ty = p.y; b.goal = -1; }
        }
        continue;
      }
      const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
      if (d < 2 && b.path.length) { [b.tx, b.ty] = b.path.shift()!; continue; }
      if (d < 2) {
        const g = b.goal; b.goal = -1;
        if (g === -2) { b.pose = POSE_DANCE; b.wait = 12 + h1(this.k++ + b.k) * 14; this.send(b, false); continue; }
        if (g >= 0 && !busy.has(g)) {
          const s = room.spots[g];
          b.use = g; b.x = s.x; b.y = s.y;
          b.wait = s.kind === 'coffee' ? 1.8 : s.kind === 'popcorn' || s.kind === 'soda' ? 1.2 : s.kind === 'desk' || s.kind === 'instrument' ? 15 + h1(this.k++) * 20 : s.kind === 'arcade' ? 8 + h1(this.k++) * 4 : 8 + h1(this.k++ + b.k) * 12;
        } else b.wait = 1.5 + h1(this.k++ + b.k) * 4;
        this.send(b, false);
        continue;
      }
      // straight along the route (so detours stay clear), sliding along anything in the way
      const sp = (game?.kind === 'tag' ? 66 : game?.kind === 'chairs' && game.phase === 'grab' ? 78 : 60) * dt, step = Math.min(sp, d), nx = b.x + (dx / d) * step, ny = b.y + (dy / d) * step;
      let moved = false;
      if (walkable(room, nx, ny)) { b.x = nx; b.y = ny; moved = true; }
      else { if (walkable(room, nx, b.y)) { b.x = nx; moved = true; } if (walkable(room, b.x, ny)) { b.y = ny; moved = true; } }
      if (!moved) { b.wait = 0.5; b.goal = -1; b.path = []; b.tx = b.x; b.ty = b.y; continue; } // stuck: give up, pick something else
      if (Math.abs(dx) > 1) b.dir = dx > 0 ? 1 : -1;
      this.send(b, true);
    }
  }

  /** Head for (x, y), detouring around furniture. */
  private go(b: Bot, room: Room, x: number, y: number): void {
    const pts = routeTo(room, b.x, b.y, x, y); [b.tx, b.ty] = pts[0]; b.path = pts.slice(1);
  }

  /** Party-game moves. Returns true if this bot is done for the frame. */
  private play(b: Bot, room: Room, dt: number, g: BotGame, taken: (i: number) => boolean): boolean {
    const standUp = () => { const s = room.spots[b.use]; if (s) { b.x = s.sx; b.y = s.sy; } b.use = -1; b.wait = 0.2; this.send(b, false); };
    if (g.kind === 'chairs') {
      if (g.phase !== 'grab') {
        b.react = -1; if (b.use >= 0) standUp(); b.goal = -1; b.wait = 0;
        // circle around the seats while the music plays, like everyone does
        if (!b.path.length && Math.hypot(b.tx - b.x, b.ty - b.y) < 3) {
          const seats = room.spots.filter((s) => s.kind === 'sit'), x0 = Math.min(...seats.map((s) => s.sx)) - 30, x1 = Math.max(...seats.map((s) => s.sx)) + 30, y0 = Math.min(...seats.map((s) => s.sy)) - 10, y1 = Math.max(...seats.map((s) => s.sy)) + 10;
          for (let t = 0; t < 12; t++) { const x = x0 + h1(++this.k * 1.3) * (x1 - x0), y = y0 + h1(++this.k * 2.1) * (y1 - y0); if (walkable(room, x, y)) { this.go(b, room, x, y); break; } }
        }
        return false;
      }
      if (b.use >= 0) { b.wait = 99; return g.seats.includes(b.use) || (standUp(), false); }
      if (b.goal >= 0) return false; // on its way
      if (b.react < 0) b.react = 0.25 + h1(++this.k + b.k) * 0.9;
      b.react -= dt; if (b.react > 0) return true;
      let best = -1, bd = 1e9;
      for (const i of g.seats) { if (taken(i)) continue; const s = room.spots[i], d = Math.hypot(s.sx - b.x, s.sy - b.y); if (d < bd) { bd = d; best = i; } }
      if (best >= 0) { b.goal = best; this.go(b, room, room.spots[best].sx, room.spots[best].sy); b.wait = 0; }
      return false;
    }
    // tag: IT chases the nearest player; everyone else runs when IT gets close
    if (g.phase !== 'play') return false;
    if (b.use >= 0) standUp();
    b.goal = -1; b.wait = 0;
    const f = room.floor;
    if (g.itId === b.id) {
      let best: { x: number; y: number } | null = null, bd = 1e9;
      for (const id of g.players) { if (id === b.id) continue; const p = g.pos(id); if (p) { const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < bd) { bd = d; best = p; } } }
      if (best) { b.tx = best.x; b.ty = best.y; }
    } else {
      const it = g.itId ? g.pos(g.itId) : null;
      if (it && Math.hypot(it.x - b.x, it.y - b.y) < 110) { const dx = b.x - it.x || 1, dy = b.y - it.y; b.tx = Math.max(f.x0 + 20, Math.min(f.x1 - 20, b.x + Math.sign(dx) * 80)); b.ty = Math.max(f.y0 + 5, Math.min(f.y1 - 5, b.y + Math.sign(dy) * 40)); }
      else if (Math.hypot(b.tx - b.x, b.ty - b.y) < 3) { const p = this.pick(room, ++this.k * 1.7 + b.k); b.tx = p.x; b.ty = p.y; }
    }
    return false;
  }
}
