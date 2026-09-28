// THE MAP on screen: a page (the city, world/map.ts, or ICELAND, world/icemap.ts: a tab switches them) drawn on its
// own two canvases like the game's (crisp pixels, and soft light blurred and screen-blended over them), a card for the
// place under the pointer, and the little show when you pick one (the pin drops, the map zooms in, you're off). What a
// pick does comes from the hooks (features/map.ts).

import { PX, bake, alpha, mk } from '../engine/pixel';
import { MAP_H, MAP_W, drawMapLive, paintMap, placeAt, placeById, type MapLive } from '../world/map';
import { drawIcelandLive, paintIceland, sightAt } from '../world/icemap';
import type { MapPage } from '../world/mapmarks';
import { dayness } from '../world/plaza';
import { iceDay } from '../world/iceland';
import type { RoomId } from '../world/room';
import type { Route } from '../features/map';
import { SFX } from '../audio/sfx';
import { button, openModal, row, font } from './modal';

export interface MapCard {
  /** The room's name plate: its CSS class (the room id) and words. */
  cls: string; sub: string; title: string;
  /** A little look inside, as it is now (drawn only when the card changes), or null. */
  preview(): HTMLCanvasElement | null;
  /** Who's there, as a line of text. */
  people: string;
  route: Route;
  /** Other ways in (your flat, a HOUSE PARTY, the ESCAPE POD). */
  extras: { label: string; run: () => void }[];
}
export interface MapHooks {
  /** The board it was opened from (its YOU ARE HERE star), or null. */
  board: RoomId | null;
  /** The page it opens on (ICELAND when you're there). */
  page: MapPage;
  /** The line under the title: the server, day or night, the weather (the page's own). */
  status(page: MapPage): string;
  /** Who's where and what you've seen (every frame). */
  live(): Pick<MapLive, 'people' | 'me' | 'hiding' | 'seen' | 'flats' | 'party'>;
  card(id: RoomId): MapCard;
  /** Picked (after the pin and the zoom). */
  go(rt: Route & { ok: true }): void;
  touch: boolean;
}

/** Each page, baked by night and by day the first time it's shown (then kept). */
const BAKED: Partial<Record<MapPage, [HTMLCanvasElement, HTMLCanvasElement]>> = {};
function baked(page: MapPage): [HTMLCanvasElement, HTMLCanvasElement] {
  let b = BAKED[page];
  if (!b) { const paint = page === 'city' ? paintMap : paintIceland; b = [mk(MAP_W, MAP_H), mk(MAP_W, MAP_H)]; paint(b[0].getContext('2d')!, false); paint(b[1].getContext('2d')!, true); BAKED[page] = b; }
  return b;
}
const TITLE: Record<MapPage, string> = { city: 'CITY MAP', iceland: 'ICELAND' };
let isOpen = false;
export const mapOpen = (): boolean => isOpen;

export function openMapPanel(h: MapHooks, onClose: () => void): void {
  let page: MapPage = h.page, hoverSight: string | null = null;
  // the size: the biggest whole-pixel scale that fits beside the modal's and the panel's padding (a phone gets a squeezed one)
  const fit = Math.min((innerWidth - 64) / MAP_W, (innerHeight - 200) / MAP_H), S = fit >= 1 ? Math.floor(fit) : fit, cw = Math.round(MAP_W * S), ch = Math.round(MAP_H * S);
  const wrap = document.createElement('div'); wrap.className = 'mapwrap'; Object.assign(wrap.style, { width: cw + 'px', height: ch + 'px' });
  const cv = mk(MAP_W, MAP_H), g = cv.getContext('2d')!; cv.className = 'mapcv'; Object.assign(cv.style, { width: cw + 'px', height: ch + 'px' });
  const gl = mk(MAP_W / 2, MAP_H / 2), gctx = gl.getContext('2d')!, gv = mk(MAP_W, MAP_H), gvx = gv.getContext('2d')!; gv.className = 'mapglow'; Object.assign(gv.style, { width: cw + 'px', height: ch + 'px' });
  const card = document.createElement('div'); card.className = 'mapcard'; card.style.display = 'none';
  /** Phones: the card goes under the map (on it, it would cover half the city). */
  const below = cw < 520, slot = document.createElement('div'); Object.assign(slot.style, { width: cw + 'px', minHeight: below ? '112px' : '0' });
  if (below) { card.classList.add('below'); slot.append(card); } else wrap.append(card);
  wrap.prepend(cv, gv);
  const status = document.createElement('div'); status.className = 'mapstatus'; Object.assign(status.style, font(19, '#E8D8C0'));
  const help = document.createElement('div'); Object.assign(help.style, font(18, '#9FEFFF'), { textAlign: 'center' }); help.textContent = h.touch ? 'Tap a place to see who\'s there, then GO' : 'Click a place to go there · M or ESC to close';

  let raf = 0, hover: RoomId | null = null, sel: RoomId | null = null, pin: { id: RoomId; t0: number } | null = null, leaving = false, shownCard = '';
  const t0 = performance.now();
  const m = openModal(TITLE[page], () => { isOpen = false; cancelAnimationFrame(raf); removeEventListener('keydown', onKey, true); SFX.mapClose(); onClose(); });
  // the pages' tabs (the modal's title says which page you're on)
  const tabs = document.createElement('div'); tabs.className = 'maptabs';
  const tabBtn = (p: MapPage, label: string) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.dataset.page = p; b.addEventListener('click', () => turnTo(p)); return b; };
  tabs.append(tabBtn('city', 'CITY'), tabBtn('iceland', 'ICELAND'));
  const markTabs = () => { for (const b of tabs.querySelectorAll('button')) b.classList.toggle('on', b.dataset.page === page); const t = m.body.parentElement?.querySelector('.mtitle'); if (t) t.textContent = TITLE[page]; };
  function turnTo(p: MapPage): void {
    if (p === page || leaving) return;
    page = p; hover = sel = null; hoverSight = null; card.style.display = 'none'; shownCard = ''; cv.style.cursor = 'default'; markTabs(); SFX.mapTick(p === 'city' ? 0.3 : 0.7);
  }
  markTabs();
  isOpen = true; SFX.mapOpen();
  const onKey = (e: KeyboardEvent) => { if ((e.key === 'm' || e.key === 'M') && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); e.stopPropagation(); m.close(); } };
  addEventListener('keydown', onKey, true);

  const toMap = (e: PointerEvent): [number, number] => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * MAP_W, (e.clientY - b.top) / b.height * MAP_H]; };
  const pick = (id: RoomId, rt: Route) => {
    if (leaving) return;
    if (!rt.ok) { SFX.nope(); showCard(id, true); return; }
    leaving = true; pin = { id, t0: (performance.now() - t0) / 1000 }; SFX.pin(); showCard(id, true);
    // the pin lands, then the map zooms in on the place in whole steps, then off you go
    const pl = placeById(id)!, ox = pl.at[0] / MAP_W * 100, oy = pl.at[1] / MAP_H * 100;
    setTimeout(() => {
      SFX.whoosh(); card.style.display = 'none'; wrap.style.transformOrigin = ox + '% ' + oy + '%';
      [1.25, 1.6, 2.1, 2.8].forEach((k, i) => setTimeout(() => { wrap.style.transform = 'scale(' + k + ')'; wrap.style.opacity = String(1 - i * 0.18); }, i * 70));
      setTimeout(() => { m.close(); h.go(rt); }, 300);
    }, 280);
  };
  /** Fill the card for place `id` (and put it by the place). */
  function showCard(id: RoomId, force = false): void {
    const c = h.card(id), key = id + '|' + (c.route.ok ? c.route.note : c.route.why) + '|' + c.people + '|' + c.extras.map((x) => x.label).join(',');
    if (key === shownCard && !force) return;
    shownCard = key;
    const plate = document.createElement('div'); plate.className = 'plate ' + c.cls;
    const sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = c.sub;
    const big = document.createElement('div'); big.className = 'big'; big.textContent = c.title;
    plate.append(sub, big);
    const kids: HTMLElement[] = [plate];
    const look = c.preview(); if (look) { look.className = 'mapprev'; kids.push(look); }
    const info: HTMLElement[] = [];
    const who = document.createElement('div'); who.className = 'mapwho'; who.textContent = c.people; info.push(who);
    const how = document.createElement('div'); how.className = 'maphow' + (c.route.ok ? '' : ' no'); how.textContent = c.route.ok ? c.route.note : c.route.why; info.push(how);
    const btns: HTMLButtonElement[] = [];
    if (c.route.ok) btns.push(button(c.route.ride ? 'GO TO THE RIDE' : 'GO', () => pick(id, c.route)));
    for (const x of c.extras) btns.push(button(x.label, () => { if (leaving) return; leaving = true; SFX.pin(); m.close(); x.run(); }, true));
    if (btns.length) info.push(row(...btns));
    if (below) { const box = document.createElement('div'); box.className = 'mapinfo'; box.append(...info); kids.push(box); } else kids.push(...info);
    card.replaceChildren(...kids); card.style.display = '';
    if (below) return;
    // beside the place, on whichever side has room
    const pl = placeById(id)!, px = pl.at[0] / MAP_W * cw, py = pl.at[1] / MAP_H * ch, w = card.offsetWidth, hh = card.offsetHeight;
    const left = px + 14 + w < cw ? px + 14 : Math.max(4, px - 14 - w), top = Math.max(4, Math.min(ch - hh - 4, py - hh / 2));
    card.style.left = left + 'px'; card.style.top = top + 'px';
  }
  cv.addEventListener('pointermove', (e) => {
    if (leaving || e.pointerType === 'touch') return;
    const [x, y] = toMap(e), pl = placeAt(x, y, page), id = pl?.id ?? null;
    if (id !== hover) { hover = id; if (id) { SFX.mapTick(x / MAP_W); showCard(id); } else if (!sel) { card.style.display = 'none'; shownCard = ''; } }
    hoverSight = !pl && page === 'iceland' ? sightAt(x, y) : null; // (the sights still to come just say their name)
    cv.style.cursor = pl ? 'pointer' : 'default';
  });
  cv.addEventListener('pointerleave', () => { hoverSight = null; if (!leaving && !sel) { hover = null; card.style.display = 'none'; shownCard = ''; } });
  cv.addEventListener('click', (e) => {
    const [x, y] = toMap(e as PointerEvent), pl = placeAt(x, y, page);
    if (!pl) { sel = null; hover = null; card.style.display = 'none'; shownCard = ''; hoverSight = page === 'iceland' ? sightAt(x, y) : null; return; }
    const touch = h.touch && (e as PointerEvent).pointerType !== 'mouse';
    if (touch && sel !== pl.id) { sel = hover = pl.id; SFX.mapTick(x / MAP_W); showCard(pl.id, true); return; } // a tap shows it; tap again (or GO) to go
    pick(pl.id, h.card(pl.id).route);
  });

  let tick = 0;
  const draw = (nowMs: number) => {
    raf = requestAnimationFrame(draw);
    if (tick++ % 2) return; // (30 frames a second is plenty for the map, and keeps the laptop cool)
    const a = Math.max(0, (nowMs - t0) / 1000), dn = page === 'city' ? dayness() : iceDay(), [nightC, dayC] = baked(page); // (a frame's time can be a hair before the map opened)
    const L: MapLive = { a, hover: sel ?? hover, pin, board: h.board, ...h.live() };
    const pg = PX.glow, pm = PX.gmul;
    PX.glow = gctx; PX.gmul = 1 - 0.6 * dn;
    gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.globalCompositeOperation = 'source-over'; gctx.clearRect(0, 0, gl.width, gl.height); gctx.setTransform(0.5, 0, 0, 0.5, 0, 0); gctx.globalCompositeOperation = 'lighter';
    try {
      bake(g, () => { g.drawImage(nightC, 0, 0); if (dn > 0.001) alpha(dn, () => g.drawImage(dayC, 0, 0)); if (page === 'city') drawMapLive(L); else drawIcelandLive(L, hoverSight); });
    } finally { PX.glow = pg; PX.gmul = pm; }
    gvx.clearRect(0, 0, MAP_W, MAP_H); gvx.filter = 'blur(1px)'; gvx.drawImage(gl, 0, 0, MAP_W, MAP_H); gvx.filter = 'none';
    status.textContent = h.status(page);
    // the card for a place follows what's live there (who's in, the countdowns)
    const cur = sel ?? hover; if (cur && !leaving && card.style.display !== 'none' && Math.floor(a * 2) !== Math.floor((a - 1 / 30) * 2)) showCard(cur);
  };
  raf = requestAnimationFrame(draw);
  m.body.append(tabs, status, wrap, ...(below ? [slot] : []), help, row(button('CLOSE', m.close, true)));
}
