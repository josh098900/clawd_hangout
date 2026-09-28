// What the map's pages share (world/map.ts draws THE CITY, world/icemap.ts draws ICELAND): the size, the shape of a
// place, the live state the panel hands a page each frame, and the marks drawn over any page: the people (and starred
// friends' name tags), you, the YOU ARE HERE star, the ? stickers, the hover brackets and the pin that drops when you
// pick a place.

import { K, MP, type RGB } from '../engine/palette';
import { r, oval, txt, tw, lit, alpha, G, Gd, disc, shade, star4 } from '../engine/pixel';
import { clamp } from '../engine/math';
import type { Rect, RoomId } from './room';

/** Both pages are this size (so the panel doesn't jump when you switch between them). */
export const MAP_W = 560, MAP_H = 300;
export type MapPage = 'city' | 'iceland';
export type Zone = 'earth' | 'orbit' | 'moon' | 'iceland';
export interface MapPlace {
  id: RoomId;
  /** Its name on the card (the room's own title, mostly). */
  name: string;
  /** Where on the map it is (the first one is where its ? sticker and the people go). */
  hits: Rect[];
  /** Where people standing here are drawn. */
  at: [number, number];
  zone: Zone;
  /** You can pick it to go there (the spacewalk is only reached through the station's airlock). */
  pick: boolean;
  /** Where its ? sticker goes (clear of its signs), if it has one. */
  tag?: [number, number];
  /** Which page it's on (the city, unless it says). */
  page?: MapPage;
}
export const R_ = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x0, y0, x1, y1 });
export const inR = (q: Rect, x: number, y: number): boolean => x >= q.x0 && x < q.x1 && y >= q.y0 && y < q.y1;

export interface MapDot { id: string; name: string; col: RGB; friend: boolean; room: RoomId }
export interface MapLive {
  /** Seconds (animation). */
  a: number;
  /** Everyone else online, where they are (empty during hide and seek). */
  people: MapDot[];
  /** You: your colour, and the room you're in. */
  me: { col: RGB; room: RoomId };
  /** Hide and seek is on: nobody is shown. */
  hiding: boolean;
  /** The place under the pointer, the one picked (its pin drops), and the places you've been. */
  hover: RoomId | null;
  pin: { id: RoomId; t0: number } | null;
  seen: Set<string>;
  /** The board this map was opened from (its YOU ARE HERE star). */
  board: RoomId | null;
  /** The Lofts: how many flats are in use, and whether a HOUSE PARTY is on. */
  flats: number; party: boolean;
}

/** How a page's marks are placed. */
export interface Marks {
  /** This page's places. */
  places: MapPlace[];
  /** Where someone in room `id` is drawn on this page (null: not on this page). */
  spot(id: RoomId): [number, number] | null;
  /** Where this page's map boards stand (the YOU ARE HERE star). */
  boards: Partial<Record<RoomId, [number, number]>>;
  /** Whether place p shows its ? sticker. */
  sticker(p: MapPlace): boolean;
}
/** The marks over a page: people, you, the YOU ARE HERE star, ? stickers, the hover and the pin (in that order, bottom to top). */
export function drawMarks(L: MapLive, o: Marks): void {
  const a = L.a, placeOf = (id: RoomId) => o.places.find((p) => p.id === id);
  // ---- people ----
  if (!L.hiding) {
    const groups = new Map<string, MapDot[]>();
    for (const p of L.people) { const s = o.spot(p.room); if (!s) continue; const k = s[0] + ',' + s[1]; groups.set(k, [...(groups.get(k) ?? []), p]); }
    for (const [k, ps] of groups) {
      const [x, y] = k.split(',').map(Number), shown = ps.slice(0, 5);
      shown.forEach((p, i) => { const dx = Math.round(x - (shown.length - 1) * 2 + i * 4), dy = Math.round(y - 2 + Math.sin(a * 2 + i) * 0.5); r(dx - 1, dy - 1, 3, 3, K.OUTLINE); lit(() => r(dx, dy, 1, 1, shade(p.col, 1.2))); r(dx - 1, dy, 1, 1, p.col); r(dx + 1, dy, 1, 1, p.col); r(dx, dy - 1, 1, 1, p.col); });
      if (ps.length > 5) { const s = '+' + (ps.length - 5); lit(() => { r(x + 9, y - 5, tw(s) + 2, 7, K.OUTLINE); txt(s, x + 10, y - 4, K.WHITE); }); }
    }
    // starred friends: a little head and their name, on top
    const tagged: [number, number][] = [];
    for (const p of L.people) { if (!p.friend) continue; const s = o.spot(p.room); if (!s) continue; let [x, y] = s; while (tagged.some(([tx, ty]) => Math.abs(tx - x) < 20 && Math.abs(ty - y) < 8)) y -= 8; tagged.push([x, y]); friendTag(x, y - 6, p.name, p.col); }
  }
  // ---- you ----
  { const s = o.spot(L.me.room); if (s) { const [x, y] = s, pulse = 3 + Math.round((Math.sin(a * 5) + 1) * 1.2); lit(() => { for (let k = 0; k < 16; k++) { const an = k / 16 * Math.PI * 2; r(Math.round(x + Math.cos(an) * pulse), Math.round(y - 2 + Math.sin(an) * pulse * 0.7), 1, 1, K.GOLD); } r(x - 1, y - 3, 3, 3, K.OUTLINE); r(x, y - 2, 1, 1, L.me.col); }); Gd(x, y - 2, 7, K.GOLD, 0.35); lit(() => { r(x - 7, y + 3, 15, 7, K.OUTLINE); txt('YOU', x - 5, y + 4, K.GOLD); }); } }
  // ---- the YOU ARE HERE star (the board you opened this from) ----
  if (L.board) { const s = o.boards[L.board]; if (s) { const [x, y] = s, big = (a % 1) < 0.5 ? 2 : 1; lit(() => star4(x, y - 9, big, MP.PIN)); Gd(x, y - 9, 5, MP.PIN, 0.4); } }
  // ---- ? stickers where you've never been ----
  for (const p of o.places) if (p.tag && o.sticker(p)) sticker(p.tag[0], p.tag[1], a, p.id);
  // ---- the place under the pointer: gold corner brackets and a warm lift; the pin that drops when you pick it ----
  if (L.hover) { const pl = placeOf(L.hover); if (pl) for (const q of pl.hits) { brackets(q, a, pl.pick); G(q.x0, q.y0, q.x1 - q.x0, q.y1 - q.y0, pl.pick ? [255, 214, 90] : [160, 170, 200], 0.1); } }
  if (L.pin) { const pl = placeOf(L.pin.id); if (pl) { const u = clamp((a - L.pin.t0) / 0.25, 0, 1), [x, y] = pl.at, drop = Math.round((1 - u * u) * -24), bounce = u >= 1 ? Math.round(-Math.abs(Math.sin((a - L.pin.t0 - 0.25) * 14)) * 3 * Math.max(0, 1 - (a - L.pin.t0 - 0.25) * 3)) : 0; pin(x, y - 4 + drop + bounce); } }
}

export function brackets(q: Rect, a: number, pick: boolean): void {
  const c: RGB = pick ? K.GOLD : [170, 180, 210], o = (a * 4) % 2 < 1 ? 0 : 1, L = 4;
  lit(() => {
    const x0 = q.x0 - 1 - o, y0 = q.y0 - 1 - o, x1 = q.x1 + o, y1 = q.y1 + o;
    r(x0, y0, L, 1, c); r(x0, y0, 1, L, c); r(x1 - L + 1, y0, L, 1, c); r(x1, y0, 1, L, c);
    r(x0, y1, L, 1, c); r(x0, y1 - L + 1, 1, L, c); r(x1 - L + 1, y1, L, 1, c); r(x1, y1 - L + 1, 1, L, c);
  });
}
export function sticker(x: number, y: number, a: number, id: string): void {
  const wob = Math.round(Math.sin(a * 2 + id.length) * 0.6);
  r(x - 1, y + wob, 7, 7, MP.STICKER_DK); r(x, y - 1 + wob, 5, 9, MP.STICKER_DK); lit(() => { r(x, y + wob, 5, 7, MP.STICKER); r(x - 1 + 1, y + wob, 5, 1, K.YEL_HI); txt('?', x + 1, y + 1 + wob, K.OUTLINE); });
}
export function pin(x: number, y: number): void {
  lit(() => { r(x, y - 1, 1, 4, [200, 200, 210]); disc(x, y - 4, 2, MP.PIN); r(x - 1, y - 5, 1, 1, MP.PIN_HI); });
  alpha(0.4, () => oval(x, y + 3, 2, 1, [0, 0, 0])); Gd(x, y - 4, 5, MP.PIN, 0.4);
}
export function friendTag(x: number, y: number, name: string, col: RGB): void {
  const s = name.slice(0, 10).toUpperCase(), w = tw(s) + 9;
  lit(() => { r(x - 3, y - 4, w, 7, K.OUTLINE); r(x - 2, y - 3, 5, 5, col); r(x - 1, y - 2, 1, 1, K.EYE); r(x + 1, y - 2, 1, 1, K.EYE); r(x - 2, y - 3, 5, 1, shade(col, 1.25)); txt(s, x + 4, y - 3, K.WHITE); r(x - 3 + w, y - 4, 1, 7, K.GOLD); });
}
