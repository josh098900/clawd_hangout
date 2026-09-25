// THE FLATS: everyone's own three rooms up in THE LOFTS (a LIVING ROOM with doors to the KITCHEN
// and the BEDROOM). The same three Room objects show whichever flat you're in (FLAT.owner): its
// layout (from the database, see supabase/migrations/0014_apartments.sql) says the wallpaper,
// the floor and where every piece of furniture stands (world/furniture.ts). Everything in a room
// (the baked backdrop, props, seats, blockers, music) is rebuilt from the layout by applyLayout().
//
// The flat's channels are per owner (hangout:<server>:flat.<owner>), so each flat is its own
// place for whoever's in it. DECORATE mode (ui/decorate.ts) edits a copy of the layout; the
// placement rules (rows, overlaps, doors) live here so drawing and editing agree.

import { CONFETTI, K, type RGB } from '../engine/palette';
import { PX, mk, r, txt, txtOutlined, tw, lit, alpha, G, Gd, withCtx, M, line } from '../engine/pixel';
import { h1 } from '../engine/math';
import { CHIPTUNES, DINER_TRACKS, LOFI, PARK_TRACKS, type Track } from '../audio/music';
import { FL, FURN, ROW_Y, WALL_Y, paintFloor, paintWall, type Furn, type FurnCtx } from './furniture';
import { dayness } from './plaza';
import type { DoorMode, FlatItem, FlatLayout, FlatRoomKey, StateMsg } from '../net/transport';
import type { Door, Prop, Room, RoomId, Spot } from './room';

export type FlatRoomId = 'flat' | 'flatbed' | 'flatkit';
export const FLAT_ROOMS: FlatRoomId[] = ['flat', 'flatbed', 'flatkit'];
export const isFlat = (id: RoomId): id is FlatRoomId => (FLAT_ROOMS as RoomId[]).includes(id);
export const FLAT_KEY: Record<FlatRoomId, FlatRoomKey> = { flat: 'liv', flatbed: 'bed', flatkit: 'kit' };
export const FLAT_TRACKS: Track[] = [...LOFI, ...DINER_TRACKS, ...CHIPTUNES, ...PARK_TRACKS];
const H = 640;
/** Each room: width, name, its window, its doors (x ranges on the back wall nothing may block). */
const GEO: Record<FlatRoomId, { w: number; sub: string; win: [number, number] | null; doors: { x: number; to: RoomId; label: string }[] }> = {
  flat: { w: 960, sub: 'LIVING ROOM', win: [390, 570], doors: [{ x: 52, to: 'lofts', label: 'HALLWAY' }, { x: 270, to: 'flatkit', label: 'KITCHEN' }, { x: 880, to: 'flatbed', label: 'BEDROOM' }] },
  flatbed: { w: 760, sub: 'BEDROOM', win: [330, 470], doors: [{ x: 52, to: 'flat', label: 'LIVING ROOM' }] },
  flatkit: { w: 720, sub: 'KITCHEN', win: null, doors: [{ x: 660, to: 'flat', label: 'LIVING ROOM' }] },
};
const DOOR_W = 44;
/** Kitchen built-ins: the counter along the back wall. */
const COUNTER = { x0: 60, x1: 600, top: 424 };

export const emptyLayout = (): FlatLayout => ({ rooms: {}, show: { fish: [], badges: [], best: {} } });
/** The flat you're in (or were last in), and yours. */
export const FLAT = {
  owner: '', name: '', layout: emptyLayout(), door: 'locked' as DoorMode, party: null as number | null, mine: false,
  /** Your furniture (owner only). */
  owned: {} as Record<string, number>,
  /** Music per room (room state 'juke'). */
  juke: { flat: { n: -1, t0: 0 }, flatbed: { n: -1, t0: 0 }, flatkit: { n: -1, t0: 0 } } as Record<FlatRoomId, { n: number; t0: number }>,
  /** DECORATE mode (owner only): the piece on the cursor, where the cursor is, whether it fits there. */
  edit: null as null | { hold: FlatItem | null; x: number; y: number; ok: boolean },
};
export const partyOn = (): boolean => (FLAT.party ?? 0) > Date.now() / 1000;
export const roomLayout = (id: FlatRoomId) => FLAT.layout.rooms[FLAT_KEY[id]] ?? { w: 'wall0', f: 'floor0', items: [] };
export const rowY = (row: number): number => (row < 0 ? WALL_Y : ROW_Y[Math.max(0, Math.min(2, row))]);
/** Which row a point is in: the wall (-1) above the floor, else the nearest of the three rows. */
export function rowAt(y: number): number { if (y < FL + 4) return -1; let best = 0; for (let k = 1; k < 3; k++) if (Math.abs(ROW_Y[k] - y) < Math.abs(ROW_Y[best] - y)) best = k; return best; }
/** Does `it` fit in room `id` (inside the walls, off the doors, not overlapping anything else on its layer and row)? `skip` = an index to ignore. */
export function fits(id: FlatRoomId, it: FlatItem, items: FlatItem[], skip = -1): boolean {
  const f = FURN.get(it[0]); if (!f) return false;
  const g = GEO[id], x0 = it[1] - f.w / 2, x1 = it[1] + f.w / 2;
  if (x0 < 12 || x1 > g.w - 12) return false;
  if (f.layer === 'wall' ? it[2] !== -1 : it[2] < 0) return false;
  if ((f.layer === 'wall' || it[2] === 0) && g.doors.some((d) => x1 > d.x - DOOR_W / 2 - 4 && x0 < d.x + DOOR_W / 2 + 4)) return false; // (keep doorways clear)
  if (id === 'flatkit' && f.layer === 'floor' && it[2] === 0 && x0 < COUNTER.x1 && x1 > COUNTER.x0) return false; // (the counter's there)
  return items.every((o, i) => { if (i === skip) return true; const g2 = FURN.get(o[0]); if (!g2 || g2.layer !== f.layer || o[2] !== it[2]) return true; return x1 <= o[1] - g2.w / 2 || x0 >= o[1] + g2.w / 2; });
}

// ---------- the set ----------
function build(this: Room, id: FlatRoomId): void {
  const g = GEO[id], L = roomLayout(id);
  if (this.bg.width !== g.w) { this.bg.width = g.w; }
  withCtx(this.bg.getContext('2d')!, () => {
    PX.dim = 0; PX.fl = 0; PX.emit = false;
    r(0, 0, g.w, 200, [34, 30, 38]); r(0, 196, g.w, 4, [220, 214, 200]);
    paintWall(L.w, 0, 200, g.w, FL - 212);
    r(0, FL - 12, g.w, 12, [236, 232, 220]); r(0, FL - 12, g.w, 2, K.WHITE); r(0, FL - 1, g.w, 1, [150, 146, 136]); // skirting board
    paintFloor(L.f, 0, FL, g.w, H - FL); alpha(0.25, () => r(0, FL, g.w, 5, [20, 12, 10]));
    if (g.win) { const [x0, x1] = g.win; r(x0 - 6, 296, x1 - x0 + 12, 112, [236, 232, 220]); r(x0 - 10, 404, x1 - x0 + 20, 6, [236, 232, 220]); }
    for (const d of g.doors) { const x = d.x - DOOR_W / 2; r(x - 4, 356, DOOR_W + 8, FL - 356, [236, 232, 220]); r(x, 360, DOOR_W, FL - 360, [150, 104, 64]); r(x + 4, 366, DOOR_W - 8, 40, [170, 120, 76]); r(x + 4, 412, DOOR_W - 8, 44, [170, 120, 76]); r(x + DOOR_W - 9, 414, 4, 3, [220, 190, 90]); txt(d.label, d.x - tw(d.label) / 2, 346, [70, 70, 80]); }
    if (id === 'flatkit') { // the counter, cupboards over it, sink, stove and a fridge
      const C = COUNTER;
      r(C.x0, 300, C.x1 - C.x0, 60, [230, 226, 214]); for (let x = C.x0; x < C.x1; x += 60) { r(x + 2, 302, 56, 56, [240, 236, 226]); r(x + 50, 326, 3, 8, [150, 150, 160]); }
      r(C.x0, C.top, C.x1 - C.x0, FL - C.top, [230, 226, 214]); r(C.x0, C.top - 4, C.x1 - C.x0, 6, [70, 70, 80]); for (let x = C.x0; x < C.x1; x += 60) { r(x + 2, C.top + 6, 56, FL - C.top - 8, [240, 236, 226]); r(x + 28, C.top + 12, 4, 2, [150, 150, 160]); }
      r(120, C.top - 8, 40, 5, [180, 190, 200]); line(142, C.top - 8, 142, C.top - 20, [180, 190, 200]); line(142, C.top - 20, 150, C.top - 20, [180, 190, 200]); // sink
      r(300, C.top - 6, 60, 3, [40, 40, 48]); for (const bx of [310, 340]) r(bx, C.top - 8, 12, 2, [80, 80, 90]); // stove
      r(200, C.top - 22, 20, 18, [60, 60, 70]); r(204, C.top - 18, 12, 8, [30, 30, 36]); // coffee machine
      r(C.x1 - 50, 330, 44, FL - 330, [220, 224, 232]); r(C.x1 - 50, 330, 44, 2, K.WHITE); r(C.x1 - 50, 390, 44, 1, [170, 176, 186]); r(C.x1 - 12, 346, 3, 30, [150, 150, 160]); r(C.x1 - 12, 400, 3, 40, [150, 150, 160]);
    }
  });
}

/** Everything a piece of furniture needs to know to draw itself. */
export function furnCtx(a: number): FurnCtx { return { a, night: 1 - dayness(), party: partyOn(), fish: FLAT.layout.show.fish, badges: FLAT.layout.show.badges, owner: FLAT.owner }; }

function drawBack(id: FlatRoomId, a: number): void {
  const g = GEO[id], L = roomLayout(id), c = furnCtx(a);
  // the view out of the window (the Square's day and night)
  if (g.win) {
    const [x0, x1] = g.win, day = dayness(), sky0: RGB = M([20, 22, 56], [120, 180, 230], day), sky1: RGB = M([60, 40, 90], [190, 220, 240], day);
    for (let y = 300; y < 404; y += 4) r(x0, y, x1 - x0, 4, M(sky0, sky1, (y - 300) / 104));
    for (let x = x0, i = 0; x < x1; x += 22, i++) { const hh = 30 + Math.floor(h1(i * 3.1 + x0) * 50), bc: RGB = M([30, 30, 64], [150, 170, 200], day), bw = Math.min(20, x1 - x); r(x, 404 - hh, bw, hh, bc); if (day < 0.5) lit(() => { for (let wy = 408 - hh; wy < 400; wy += 7) { const lx = x + 4 + (wy % 2) * 8; if (h1(x + wy) > 0.55 && lx + 2 <= x1) r(lx, wy, 2, 3, [255, 214, 140]); } }); } // (the last building stops at the frame)
    r(x0 + (x1 - x0) / 2 - 1, 300, 3, 104, [236, 232, 220]); r(x0, 350, x1 - x0, 3, [236, 232, 220]);
  }
  // rugs under everything, wall pieces on the wall
  for (const it of L.items) { const f = FURN.get(it[0]); if (!f) continue; PX.dim = 0; if (f.layer === 'rug') f.draw(it[1], rowY(it[2]), !!it[3], c); else if (f.layer === 'wall') f.draw(it[1], WALL_Y, !!it[3], c); }
  // soft lamp light from the ceiling
  G(0, 200, g.w, 60, [255, 240, 210], 0.04);
}
function drawFront(a: number): void {
  if (!partyOn()) return;
  // HOUSE PARTY: sweeping coloured beams and a disco sparkle over the room
  const w = 960;
  for (let k = 0; k < 4; k++) { const an = Math.sin(a * (0.6 + k * 0.17) + k) * 0.6, x0 = 200 + k * 180; alpha(0.08, () => { for (let y = 220; y < 640; y += 8) { const dx = Math.round((y - 220) * Math.tan(an)); r(x0 + dx - 10 - (y - 220) / 10, y, 20 + (y - 220) / 5, 8, CONFETTI[(k + Math.floor(a)) % CONFETTI.length]); } }); }
  lit(() => { for (let k = 0; k < 30; k++) if ((a * 3 + h1(k)) % 1 < 0.4) r(Math.floor(h1(k * 7.7 + Math.floor(a * 2)) * w), 220 + Math.floor(h1(k * 3.3 + Math.floor(a * 2)) * 380), 2, 2, CONFETTI[k % CONFETTI.length]); });
}

// ---------- rebuilding a room from the layout ----------
const floorProp = (f: Furn, it: FlatItem): Prop => ({ y: rowY(it[2]), draw: (a: number) => f.draw(it[1], rowY(it[2]), !!it[3], furnCtx(a)) });
/** Rebuild every flat room from FLAT.layout (backdrop, props, seats, blockers, music). */
export function applyLayout(rooms: Record<FlatRoomId, Room>): void {
  for (const id of FLAT_ROOMS) {
    const room = rooms[id], L = roomLayout(id), g = GEO[id];
    room.build();
    const props: Prop[] = [], spots: Spot[] = [], blockers = baseBlockers(id);
    let music: Room['music'] = undefined;
    L.items.forEach((it, i) => {
      const f = FURN.get(it[0]); if (!f) return;
      const y = rowY(it[2]);
      if (f.layer === 'floor') { props.push(floorProp(f, it)); blockers.push({ x0: it[1] - f.w / 2 + 2, y0: y - 8, x1: it[1] + f.w / 2 - 2, y1: y + 2 }); }
      if (!f.use) return;
      const standY = f.layer === 'wall' ? ROW_Y[0] : Math.min(612, y + 14), area = { x0: it[1] - f.w / 2, y0: (f.layer === 'wall' ? WALL_Y : y) - f.h, x1: it[1] + f.w / 2, y1: f.layer === 'wall' ? WALL_Y : y };
      if (f.use === 'sit' || f.use === 'nap') for (const [dx, lift] of f.seats ?? []) { const sx = it[1] + (it[3] ? -dx : dx); spots.push({ kind: 'sit', x: sx, y: y + 1, sx, sy: standY, lift, label: f.label ?? 'SIT', area }); }
      else if (f.use === 'juke') { spots.push({ kind: 'juke', x: it[1], y: standY, sx: it[1], sy: standY, lift: 0, label: 'MUSIC', area }); music ??= { x: it[1], tracks: FLAT_TRACKS, current: () => FLAT.juke[id] }; }
      else if (f.use === 'arcade') spots.push({ kind: 'arcade', x: it[1], y: standY, sx: it[1], sy: standY, lift: 0, label: 'PLAY', area });
      else if (f.use === 'keys') spots.push({ kind: 'instrument', inst: 0, x: it[1], y: standY, sx: it[1], sy: standY, lift: 0, label: 'PLAY', area });
      else if (f.use === 'soda') spots.push({ kind: 'soda', x: it[1], y: standY, sx: it[1], sy: standY, lift: 0, label: 'SODA', area });
      else if (f.use === 'look') spots.push({ kind: 'look', n: i, x: it[1], y: standY, sx: it[1], sy: standY, lift: 0, label: f.label ?? 'LOOK', area });
      else if (f.use === 'party') spots.push({ kind: 'flatparty', x: it[1], y: standY, sx: it[1], sy: standY, lift: 0, label: f.label ?? 'PARTY', area });
    });
    if (id === 'flatkit') spots.push(...KITCHEN_SPOTS);
    room.props = props; room.spots = spots; room.blockers = blockers; room.music = music;
    room.w = g.w;
  }
}
const KITCHEN_SPOTS: Spot[] = [
  { kind: 'coffee', x: 210, y: FL + 18, sx: 210, sy: FL + 18, lift: 0, label: 'COFFEE', area: { x0: 196, y0: COUNTER.top - 24, x1: 224, y1: COUNTER.top } },
  { kind: 'hotdog', x: 330, y: FL + 18, sx: 330, sy: FL + 18, lift: 0, label: 'COOK', area: { x0: 296, y0: COUNTER.top - 12, x1: 364, y1: COUNTER.top } },
  { kind: 'soda', x: COUNTER.x1 - 28, y: FL + 18, sx: COUNTER.x1 - 28, sy: FL + 18, lift: 0, label: 'FRIDGE', area: { x0: COUNTER.x1 - 50, y0: 330, x1: COUNTER.x1 - 6, y1: FL } },
];
const baseBlockers = (id: FlatRoomId) => (id === 'flatkit' ? [{ x0: COUNTER.x0, y0: FL, x1: COUNTER.x1, y1: FL + 8 }] : []);

function makeDoors(id: FlatRoomId): Door[] {
  return GEO[id].doors.map((d): Door => ({ trigger: { x0: d.x - 16, y0: FL + 10, x1: d.x + 16, y1: FL + 18 }, to: d.to, arrive: arrivalFor(d.to, id), label: d.label, area: { x0: d.x - DOOR_W / 2, y0: 356, x1: d.x + DOOR_W / 2, y1: FL } }));
}
/** Walking from `from` into `to`: stand in front of the door you came through. */
function arrivalFor(to: RoomId, from: FlatRoomId): { x: number; y: number } {
  if (to === 'lofts') return { x: 655, y: 500 };
  const back = GEO[to as FlatRoomId]?.doors.find((d) => d.to === from);
  return { x: back?.x ?? 100, y: FL + 30 };
}

export function makeFlatRoom(id: FlatRoomId): Room {
  const g = GEO[id];
  const room: Room = {
    id, title: 'A FLAT', sub: g.sub,
    w: g.w, h: H,
    floor: { x0: 14, y0: FL + 12, x1: g.w - 14, y1: H - 22 },
    blockers: baseBlockers(id),
    doors: makeDoors(id),
    spots: id === 'flatkit' ? [...KITCHEN_SPOTS] : [], inUse: new Map(),
    onState(s: StateMsg) { if (s.k === 'juke') FLAT.juke[id] = { n: s.v.n, t0: s.v.t0 }; },
    spawn: { x: 100, y: FL + 30 },
    dim: 0.02,
    fillTop: 'rgb(34,30,38)', fillLow: 'rgb(60,50,40)',
    bg: mk(g.w, H),
    build: () => build.call(room, id),
    drawBack: (a: number) => drawBack(id, a),
    drawFront,
    props: [],
  };
  return room;
}
/** "ANNA'S PLACE". */
export const flatTitle = (): string => (FLAT.mine ? 'YOUR PLACE' : (FLAT.name || 'SOMEONE').toUpperCase().slice(0, 12) + "'S PLACE");


// ---------- DECORATE mode's overlay ----------
/** The piece at world (x, y) in room `id`, or -1 (wall pieces first, then the nearest row's pieces, rugs last). */
export function pieceAt(id: FlatRoomId, x: number, y: number): number {
  const items = roomLayout(id).items, hit = (i: number, pad: number) => { const it = items[i], f = FURN.get(it[0])!; const by = f.layer === 'wall' ? WALL_Y : rowY(it[2]); return Math.abs(x - it[1]) <= f.w / 2 + pad && y <= by + 6 && y >= by - f.h - pad; };
  const order = items.map((_, i) => i).filter((i) => FURN.has(items[i][0])).sort((p, q) => (FURN.get(items[p][0])!.layer === 'rug' ? 1 : 0) - (FURN.get(items[q][0])!.layer === 'rug' ? 1 : 0) || rowY(items[q][2]) - rowY(items[p][2]));
  return order.find((i) => hit(i, 0)) ?? -1;
}
/** Where the held piece would go for a cursor at (x, y). */
export function placeAt(id: FlatRoomId, hold: FlatItem, x: number, y: number): FlatItem {
  const f = FURN.get(hold[0])!, w = GEO[id].w;
  return [hold[0], Math.round(Math.max(f.w / 2 + 12, Math.min(w - f.w / 2 - 12, x)) / 2) * 2, f.layer === 'wall' ? -1 : Math.max(0, rowAt(y)), hold[3]];
}
export function drawEditOverlay(id: FlatRoomId, a: number): void {
  const e = FLAT.edit; if (!e) return;
  const items = roomLayout(id).items, c = furnCtx(a), g = GEO[id];
  // the rows, faintly, so you can see where things go
  alpha(0.12, () => { for (const y of ROW_Y) r(0, y - 1, g.w, 2, K.WHITE); r(0, WALL_Y - 1, g.w, 2, K.WHITE); });
  for (const d of g.doors) alpha(0.18, () => r(d.x - DOOR_W / 2 - 4, 356, DOOR_W + 8, FL - 356 + 22, [255, 80, 80]));
  if (e.hold) {
    const it = placeAt(id, e.hold, e.x, e.y), f = FURN.get(it[0])!, ok = fits(id, it, items);
    e.ok = ok;
    alpha(0.75, () => f.draw(it[1], f.layer === 'wall' ? WALL_Y : rowY(it[2]), !!it[3], c));
    const by = f.layer === 'wall' ? WALL_Y : rowY(it[2]), col: [number, number, number] = ok ? [124, 242, 156] : [255, 90, 90];
    lit(() => { r(it[1] - f.w / 2, by + 2, f.w, 1, col); r(it[1] - f.w / 2, by - f.h, 1, f.h + 2, col); r(it[1] + f.w / 2 - 1, by - f.h, 1, f.h + 2, col); });
    const hint = ok ? 'CLICK: PUT IT HERE  R: FLIP  X: PUT AWAY' : "IT DOESN'T FIT THERE";
    txtOutlined(hint, Math.round(it[1] - tw(hint) / 2), by - f.h - 12, ok ? [220, 255, 230] : [255, 160, 160]);
  } else {
    const i = pieceAt(id, e.x, e.y);
    if (i >= 0) { const it = items[i], f = FURN.get(it[0])!, by = f.layer === 'wall' ? WALL_Y : rowY(it[2]); lit(() => { r(it[1] - f.w / 2 - 1, by - f.h - 1, f.w + 2, 1, K.GOLD); r(it[1] - f.w / 2 - 1, by + 2, f.w + 2, 1, K.GOLD); }); txtOutlined('CLICK TO MOVE ' + f.name, Math.round(it[1] - tw('CLICK TO MOVE ' + f.name) / 2), by - f.h - 12, [255, 236, 170]); }
  }
  Gd(e.x, e.y, 4, [255, 255, 255], 0.2);
}

/** Where the owner's pet wanders to right now (the same for everyone: from the clock): a new spot every 7 s, a nap in its bed (if there is one) every so often. */
export function petSpot(id: FlatRoomId, seed: number, nowMs = Date.now()): { x: number; y: number } {
  const k = Math.floor(nowMs / 7000), g = GEO[id], bed = roomLayout(id).items.find((it) => it[0] === 'petbed');
  if (bed && k % 3 === 0) return { x: bed[1], y: rowY(bed[2]) + 1 };
  const u = h1(seed * 97 + k * 1.37), v = h1(seed * 31 + k * 2.71);
  return { x: 40 + u * (g.w - 80), y: FL + 20 + v * 120 };
}
