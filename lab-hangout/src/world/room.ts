// A Room is a side-on "set" (like the film's sets) with a walkable floor band.
// Positions are FEET positions in world pixels. Larger y = closer to the camera.

export type RoomId = 'lab' | 'plaza' | 'cinema' | 'den' | 'roof' | 'crypt' | 'stage' | 'pier' | 'arcade';
export const ROOM_IDS: RoomId[] = ['lab', 'plaza', 'cinema', 'den', 'roof', 'crypt', 'stage', 'pier', 'arcade'];

export interface Rect { x0: number; y0: number; x1: number; y1: number }

export interface Door {
  /** Feet inside this rect while walking "up" (toward the wall) = go through. */
  trigger: Rect;
  to: RoomId;
  /** Where you appear in the other room. */
  arrive: { x: number; y: number };
  label: string;
  /** Clicking/tapping inside this rect (the door's picture) walks you to it. */
  area: Rect;
  /** An open edge of the set (walk into it from any direction), not a door you walk up into. */
  edge?: boolean;
}

/**
 * Something you can use: a seat, the coffee machine, the arcade. Its index in `room.spots`
 * goes over the network (`MoveMsg.use`), so only ever APPEND to a room's spot list.
 */
export type SpotKind = 'sit' | 'coffee' | 'arcade' | 'juke' | 'board' | 'popcorn' | 'soda' | 'booth' | 'desk' | 'kanban' | 'rack' | 'deploy' | 'party' | 'hammock' | 'scope' | 'fireworks' | 'chest' | 'instrument' | 'fish' | 'marsh' | 'claw' | 'pong' | 'prizes' | 'decor' | 'treat' | 'candle' | 'bed';
export interface Spot {
  kind: SpotKind;
  /** Feet position while using it (seats: sits 1px in front of the seat prop so it sorts over it). */
  x: number; y: number;
  /** Walkable point you walk to first, and step back to when you leave. */
  sx: number; sy: number;
  /** Draw the user this many px higher (seat height). */
  lift: number;
  /** Hint word, e.g. SIT. */
  label: string;
  /** Clicking/tapping inside this rect (the thing's picture) walks you there and uses it. */
  area: Rect;
  /** For 'party' spots: which game it starts. */
  game?: 'chairs' | 'tag' | 'hide';
  /** For 'instrument' spots: 0 keys, 1 drums, 2 bass, 3 mic. */
  inst?: number;
  /** Which one, for numbered spots ('treat' doors 0..7, 'candle' 0..3). */
  n?: number;
}

/** A non-walking character you can talk to (the Dev Den's rubber duck). Bubbles anchor at (x, y). */
export interface Talker { id: string; name: string; x: number; y: number; /** where you stand to talk */ sx: number; sy: number; lines: string[] }

/** A room's music source (the Lab jukebox, the Den radio). `current()` comes from room state. */
export interface RoomMusic { x: number; tracks: import('../audio/music').Track[]; current(): { n: number; t0: number } }

/** Something that stands on the floor and depth-sorts with players by its base y. */
export interface Prop {
  y: number;
  draw(a: number): void;
}

export interface Room {
  id: RoomId;
  title: string;
  sub: string;
  w: number;
  h: number;
  /** Walkable band for feet. */
  floor: Rect;
  /** Feet-collision boxes (couches, lamp posts…). */
  blockers: Rect[];
  doors: Door[];
  spots: Spot[];
  /** Spot index -> when its current user started (s), for everyone using one this frame. Filled in by main.ts. */
  inUse: Map<number, number>;
  spawn: { x: number; y: number };
  /** Night tint for characters standing in this room (0 = full daylight). */
  dim: number;
  /** CSS colours used outside the set's edges (above / below). */
  fillTop: string;
  fillLow: string;
  /** Prebaked static backdrop. */
  bg: HTMLCanvasElement;
  /** Called once at boot to paint `bg`. */
  build(): void;
  /** Animated background pieces, drawn after bg and before players. */
  drawBack(a: number): void;
  /** Standing props, depth sorted with players. */
  props: Prop[];
  /** Foreground pieces over everything (optional). */
  drawFront?(a: number): void;
  /** Night tint right now, if it changes over time (day/night, cinema lights). Defaults to `dim`. */
  dimNow?(): number;
  /** A second baked backdrop (the Square by day) cross-faded over `bg` by `altAlpha()`. */
  bgAlt?: HTMLCanvasElement;
  altAlpha?(): number;
  /** Characters you can TALK to that aren't avatars. */
  talkers?: Talker[];
  /** Music you can change with a 'juke' spot. */
  music?: RoomMusic;
  /** Room state for this room changed (after newest-wins). Rooms keep their own display copy. */
  onState?(s: import('../net/transport').StateMsg): void;
  /** Blockers you can push by walking into them (the Crypt's stone blocks). Must also be in `blockers`. */
  pushables?: Rect[];
  /** Everyone carries a little light here (the Crypt). */
  lantern?: import('../engine/palette').RGB;
  /** Seated here, the camera frames this instead of your feet (the cinema screen). */
  watch?: { x: number; top: number };
  /** Multiplier for all soft glow (lamps fade out in daylight). */
  glowMul?(): number;
}

export const inside = (r: Rect, x: number, y: number): boolean => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

/** Feet are a small box; returns true if (x,y) is free to stand on. */
export function walkable(room: Room, x: number, y: number): boolean {
  const f = room.floor;
  if (x < f.x0 || x > f.x1 || y < f.y0 || y > f.y1) return false;
  for (const b of room.blockers) if (x + 6 > b.x0 && x - 6 < b.x1 && y + 2 > b.y0 && y - 2 < b.y1) return false;
  return true;
}

/** Can you walk in a straight line from (x0,y0) to (x1,y1)? */
export function clearPath(room: Room, x0: number, y0: number, x1: number, y1: number): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4));
  for (let k = 1; k <= n; k++) if (!walkable(room, x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n)) return false;
  return true;
}

/**
 * Waypoints from (x0,y0) to (x1,y1), around seat rows, desks, sofas and ropes. A straight
 * line when it's clear; otherwise a breadth-first search on an 8 px grid of the floor,
 * pulled tight into as few straight legs as possible. Always ends exactly at the target
 * (or heads straight for it if it can't be reached).
 */
export function routeTo(room: Room, x0: number, y0: number, x1: number, y1: number): [number, number][] {
  if (clearPath(room, x0, y0, x1, y1)) return [[x1, y1]];
  const f = room.floor, C = 8, W = Math.floor((f.x1 - f.x0) / C) + 1, H = Math.floor((f.y1 - f.y0) / C) + 1;
  const cx = (x: number) => Math.max(0, Math.min(W - 1, Math.round((x - f.x0) / C))), cy = (y: number) => Math.max(0, Math.min(H - 1, Math.round((y - f.y0) / C)));
  const px = (i: number) => f.x0 + i * C, py = (j: number) => f.y0 + j * C;
  const ok = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) ok[j * W + i] = walkable(room, px(i), py(j)) ? 1 : 0;
  const s = cy(y0) * W + cx(x0), g = cy(y1) * W + cx(x1);
  ok[s] = 1; ok[g] = 1;
  const prev = new Int32Array(W * H).fill(-1), q = [s]; prev[s] = s;
  for (let h = 0; h < q.length && prev[g] < 0; h++) {
    const c = q[h], i = c % W, j = (c - i) / W;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = i + di, nj = j + dj, n = nj * W + ni;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H || prev[n] >= 0 || !ok[n]) continue;
      if (di && dj && (!ok[j * W + ni] || !ok[nj * W + i])) continue; // no cutting corners
      prev[n] = c; q.push(n);
    }
  }
  if (prev[g] < 0) return [[x1, y1]];
  const cells: [number, number][] = [];
  for (let c = g; c !== s; c = prev[c]) cells.push([px(c % W), py(Math.floor(c / W))]);
  cells.reverse(); cells[cells.length - 1] = [x1, y1];
  // string-pull: from where we are, jump to the farthest point we can walk to in a straight line
  const out: [number, number][] = [];
  let cur: [number, number] = [x0, y0], k = 0;
  while (k < cells.length) {
    let far = k;
    for (let m = cells.length - 1; m > k; m--) if (clearPath(room, cur[0], cur[1], cells[m][0], cells[m][1])) { far = m; break; }
    out.push(cells[far]); cur = cells[far]; k = far + 1;
  }
  return out;
}
