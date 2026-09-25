// DECORATE mode for your own flat: a panel along the bottom with your furniture (MY STUFF), the
// SHOP, WALLS and FLOORS for the room you're in, your DOOR setting and SAVE / CANCEL. Pick a piece
// and it follows the cursor (a ghost over the room, drawn by world/flat.ts); click to put it
// down, click a placed piece to pick it up again, R flips it, X (or Delete) puts it away. You
// can still walk around (the camera follows you) to reach the other end of the room.

import { FURNITURE, FURN, FLOORS, WALLPAPERS, paintFloor, paintWall, type Furn } from '../world/furniture';
import { FLAT, FLAT_KEY, FLAT_ROOMS, fits, furnCtx, pieceAt, placeAt, roomLayout, type FlatRoomId } from '../world/flat';
import { PX, mk, withCtx } from '../engine/pixel';
import type { DoorMode, FlatLayout } from '../net/transport';
import { SFX } from '../audio/sfx';

export interface DecoHooks {
  room(): FlatRoomId | null;
  buy(id: string): Promise<boolean>;
  save(): Promise<boolean>;
  door(): DoorMode; setDoor(d: DoorMode): Promise<void>;
  /** Screen px -> world px. */
  toWorld(x: number, y: number): [number, number];
  /** The layout changed (rebuild the rooms). */
  changed(): void;
  toast(s: string): void;
  onClose(): void;
}
type Tab = 'stuff' | 'shop' | 'walls' | 'floors';
const panel = document.createElement('div'); panel.id = 'deco'; document.body.appendChild(panel);
let open: { close(save: boolean): void } | null = null;
export const decorating = (): boolean => !!open;

/** A small picture of a piece of furniture (for the tiles). */
function preview(f: Furn): HTMLCanvasElement {
  const c = mk(f.w + 8, f.h + 14), g = c.getContext('2d')!;
  withCtx(g, () => { PX.dim = 0; PX.emit = false; f.draw(Math.round(c.width / 2), c.height - (f.layer === 'wall' ? 2 : 4), false, furnCtx(0)); });
  c.style.height = '40px'; c.style.imageRendering = 'pixelated'; return c;
}
const placed = (id: string): number => FLAT_ROOMS.reduce((n, r) => n + roomLayout(r).items.filter((it) => it[0] === id).length, 0);

export function openDecorate(h: DecoHooks): void {
  if (open) return;
  const snapshot: FlatLayout = JSON.parse(JSON.stringify(FLAT.layout));
  FLAT.edit = { hold: null, x: 0, y: 0, ok: false };
  let tab: Tab = 'stuff', busy = false;
  const view = document.querySelector('#view') as HTMLCanvasElement;
  const setRoom = (id: FlatRoomId, fn: (r: { w: string; f: string; items: [string, number, number, number][] }) => void) => {
    const k = FLAT_KEY[id], cur = FLAT.layout.rooms[k] ?? { w: 'wall0', f: 'floor0', items: [] };
    fn(cur); FLAT.layout.rooms[k] = cur; h.changed();
  };
  const avail = (id: string) => (FLAT.owned[id] ?? 0) - placed(id) - (FLAT.edit?.hold?.[0] === id ? 1 : 0);
  const hold = (id: string) => { if (FLAT.edit) FLAT.edit.hold = [id, FLAT.edit.x, FURN.get(id)!.layer === 'wall' ? -1 : 1, 0]; SFX.pop(); draw(); };
  const buyThen = async (id: string, then: () => void) => {
    if (busy) return; busy = true;
    try { if (await h.buy(id)) then(); } finally { busy = false; draw(); }
  };

  // ---- the panel ----
  const tile = (label: string, sub: string, pic: HTMLElement | null, on: () => void, dim = false, active = false) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'dtile' + (dim ? ' dim' : '') + (active ? ' on' : '');
    if (pic) b.appendChild(pic); const t = document.createElement('b'); t.textContent = label; const s = document.createElement('i'); s.textContent = sub; b.append(t, s);
    b.addEventListener('click', on); return b;
  };
  const draw = () => {
    const rid = h.room(); panel.replaceChildren();
    const tabs = document.createElement('div'); tabs.className = 'dtabs';
    for (const [t, lab] of [['stuff', 'MY STUFF'], ['shop', 'SHOP'], ['walls', 'WALLS'], ['floors', 'FLOORS']] as [Tab, string][]) { const b = document.createElement('button'); b.type = 'button'; b.textContent = lab; b.className = t === tab ? 'on' : ''; b.addEventListener('click', () => { tab = t; draw(); }); tabs.appendChild(b); }
    const door = document.createElement('button'); door.type = 'button'; const d = h.door(); door.textContent = 'DOOR: ' + (d === 'locked' ? 'LOCKED' : d === 'friends' ? 'FRIENDS' : 'OPEN'); door.className = 'door';
    door.addEventListener('click', () => { const next: DoorMode = d === 'locked' ? 'friends' : d === 'friends' ? 'open' : 'locked'; void h.setDoor(next).then(draw); });
    const save = document.createElement('button'); save.type = 'button'; save.textContent = 'SAVE'; save.className = 'save'; save.addEventListener('click', () => api.close(true));
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'CANCEL'; cancel.addEventListener('click', () => api.close(false));
    const tk = document.createElement('span'); tk.className = 'dtok'; tk.textContent = (document.querySelector('#tokens')?.textContent ?? '0') + ' TOKENS';
    tabs.append(tk, door, save, cancel);
    const list = document.createElement('div'); list.className = 'dlist';
    if (tab === 'stuff') {
      const mine = FURNITURE.filter((f) => (FLAT.owned[f.id] ?? 0) > 0);
      if (!mine.length) { const n = document.createElement('div'); n.className = 'dnote'; n.textContent = 'Nothing yet: have a look in the SHOP'; list.appendChild(n); }
      for (const f of mine) { const n = avail(f.id); list.appendChild(tile(f.name, n > 0 ? n + ' TO PLACE' : 'ALL PLACED', preview(f), () => { if (n > 0) hold(f.id); else h.toast('All your ' + f.name + ' are already out. Click one in the room to move it'); }, n <= 0)); }
    } else if (tab === 'shop') {
      for (const f of FURNITURE) { const own = FLAT.owned[f.id] ?? 0; list.appendChild(tile(f.name, f.price + ' TOKENS' + (own ? ' · HAVE ' + own : ''), preview(f), () => void buyThen(f.id, () => { h.toast('Bought a ' + f.name + '! Put it somewhere'); hold(f.id); }))); }
    } else if (rid) {
      const list2 = tab === 'walls' ? WALLPAPERS : FLOORS, cur = roomLayout(rid)[tab === 'walls' ? 'w' : 'f'];
      for (const p of list2) {
        const have = p.price === 0 || (FLAT.owned[p.id] ?? 0) > 0, sw = mk(40, 24);
        withCtx(sw.getContext('2d')!, () => { PX.dim = 0; PX.emit = false; if (tab === 'walls') paintWall(p.id, 0, 0, 40, 24); else paintFloor(p.id, 0, 0, 40, 24); });
        sw.style.height = '32px'; sw.style.imageRendering = 'pixelated';
        const apply = () => setRoom(rid, (rm) => { if (tab === 'walls') rm.w = p.id; else rm.f = p.id; });
        list.appendChild(tile(p.name, have ? (p.id === cur ? 'IN THIS ROOM' : 'USE') : p.price + ' TOKENS', sw, () => { if (have) { apply(); SFX.blip(); draw(); } else void buyThen(p.id, () => { apply(); h.toast('New ' + (tab === 'walls' ? 'wallpaper' : 'floor') + '!'); }); }, false, p.id === cur));
      }
    }
    const tip = document.createElement('div'); tip.className = 'dtip';
    tip.textContent = FLAT.edit?.hold ? 'Click in the room to put the ' + (FURN.get(FLAT.edit.hold[0])?.name ?? '') + ' down · R flips it · X puts it away' : 'Pick something, or click a piece in the room to move it. Click the floor to walk about.';
    panel.append(tabs, list, tip); panel.classList.add('on');
  };

  // ---- pointing at the room ----
  const move = (e: PointerEvent) => { if (!FLAT.edit) return; const [x, y] = h.toWorld(e.clientX, e.clientY); FLAT.edit.x = x; FLAT.edit.y = y; };
  const down = (e: PointerEvent) => {
    const rid = h.room(), E = FLAT.edit; if (!rid || !E || e.button !== 0) return;
    move(e);
    const items = roomLayout(rid).items;
    if (!E.hold && pieceAt(rid, E.x, E.y) < 0) return; // (not on a piece: a normal tap-to-walk, so phones can move about)
    e.stopImmediatePropagation();
    if (E.hold) {
      const it = placeAt(rid, E.hold, E.x, E.y);
      if (!fits(rid, it, items)) { SFX.blip(); h.toast("It doesn't fit there"); return; }
      setRoom(rid, (rm) => rm.items.push(it)); E.hold = null; SFX.sit(); draw();
    } else {
      const i = pieceAt(rid, E.x, E.y); if (i < 0) return;
      const it = items[i]; setRoom(rid, (rm) => rm.items.splice(i, 1)); E.hold = [it[0], it[1], it[2], it[3]]; SFX.pop(); draw();
    }
  };
  const key = (e: KeyboardEvent) => {
    const E = FLAT.edit; if (!E) return;
    if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return; // (typing in the chat)
    const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); }; // (R is also the emote wheel, Escape closes things: not while decorating)
    if (e.key === 'r' || e.key === 'R') { if (E.hold) E.hold[3] = E.hold[3] ? 0 : 1; stop(); }
    else if ((e.key === 'x' || e.key === 'X' || e.key === 'Delete' || e.key === 'Backspace') && E.hold) { E.hold = null; SFX.blip(); draw(); stop(); }
    else if (e.key === 'Escape') { if (E.hold) { E.hold = null; draw(); } else api.close(false); stop(); }
  };
  view.addEventListener('pointermove', move); view.addEventListener('pointerdown', down, true); addEventListener('keydown', key, true);
  const api = {
    close(doSave: boolean) {
      if (!open) return;
      if (doSave) { if (busy) return; busy = true; void h.save().then((ok) => { busy = false; if (ok) finish(); }); return; }
      FLAT.layout = snapshot; h.changed(); finish();
    },
  };
  const finish = () => { view.removeEventListener('pointermove', move); view.removeEventListener('pointerdown', down, true); removeEventListener('keydown', key, true); FLAT.edit = null; open = null; document.body.classList.remove('decorating'); panel.classList.remove('on'); panel.replaceChildren(); h.onClose(); };
  open = api; document.body.classList.add('decorating'); draw();
}
export function closeDecorate(save: boolean): void { open?.close(save); }
