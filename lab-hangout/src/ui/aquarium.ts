// THE CITY AQUARIUM's panels: THE FISH GALLERY at the curator's desk (donate your catches: a bigger one takes the tank's
// plaque, and your first of each kind pays a thank-you) and THE GIFT SHOP at the till (clothes for tokens, furniture for
// your flat). features/aquarium.ts opens them and talks to the server.

import { FISH } from '../game/fish';
import { GALLERY, THANKS } from '../game/aquarium';
import { GIFTS, basePose, itemName, stampCritter, type Look } from '../entities/critter';
import { FURNITURE, type Furn } from '../world/furniture';
import { bake, mk } from '../engine/pixel';
import { withItem } from './claw';
import { button, font, openModal, row, RARE_COL } from './modal';
import type { AqTank } from '../net/transport';

const HEAD = { fontFamily: "'Press Start 2P', monospace", fontSize: '11px', color: '#FFD65A', textAlign: 'center' };
const rarityCol = (r: string): string => (r === 'JUNK' ? '#A8A4B8' : RARE_COL[r] ?? '#E8D8C0');

export interface GalleryHooks {
  /** The gallery as last heard: each tank's plaque, your biggest catch of each kind, what you've donated. */
  now(): { tanks: Map<string, AqTank>; best: Record<string, number>; mine: Record<string, number> };
  /** Donate your biggest `fish` (resolves when the server's answered; the panel redraws). */
  donate(fish: string): Promise<void>;
}
/** THE FISH GALLERY panel. Returns a redraw, for when a fresh copy of the gallery arrives. */
export function openGallery(h: GalleryHooks, onClose: () => void): { redraw(): void } {
  const m = openModal('THE FISH GALLERY', onClose);
  const head = document.createElement('div'); Object.assign(head.style, HEAD);
  const sub = document.createElement('div'); Object.assign(sub.style, { ...font(18, '#9FEFFF'), textAlign: 'center', maxWidth: 'min(640px, 86vw)' });
  sub.textContent = 'Hand in your biggest catch of each kind. A bigger one than the one on show takes the plaque. Your first of each kind pays a thank-you.';
  const list = document.createElement('div'); Object.assign(list.style, { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '6px', width: 'min(640px, 86vw)', maxHeight: '52vh', overflowY: 'auto' });
  let busy = '';
  const redraw = () => {
    const g = h.now(), n = GALLERY.filter((f) => f in g.mine).length;
    head.textContent = 'DONATED ' + n + '/' + GALLERY.length + (n === GALLERY.length ? ' · CURATOR!' : '');
    list.replaceChildren(...GALLERY.map((name) => {
      const f = FISH.find((q) => q.name === name), rar = f?.rarity ?? 'COMMON', t = g.tanks.get(name), best = g.best[name], gave = g.mine[name];
      const cell = document.createElement('div');
      Object.assign(cell.style, { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: t ? 'rgba(90,170,255,.1)' : 'rgba(0,0,0,.25)', borderLeft: '3px solid ' + rarityCol(rar), ...font(19, '#FFF3D6'), textAlign: 'left' });
      const txt = document.createElement('div'); txt.style.flex = '1';
      const nm = document.createElement('div'); nm.textContent = name; nm.style.color = rarityCol(rar);
      const tank = document.createElement('div'); tank.textContent = t ? 'ON SHOW: ' + t.cm + ' CM · ' + t.name : 'THE TANK IS EMPTY'; Object.assign(tank.style, font(16, t ? '#9FEFFF' : '#8A86A0'));
      // what DONATE would do: take the plaque, give a first one for the thank-you, put a bigger one in the records... or nothing
      const takes = !!best && (!t || best > t.cm), first = !!best && !gave, bigger = !!best && !!gave && best > gave;
      const you = document.createElement('div'); you.textContent = best ? 'YOUR BIGGEST: ' + best + ' CM' + (takes ? ' · TAKES THE PLAQUE!' : gave ? ' · DONATED' + (gave < best ? ' ' + gave + ' CM' : '') : '') : 'NOT CAUGHT YET: TRY THE PIER'; Object.assign(you.style, font(16, takes ? '#FFD65A' : best ? '#E8D8C0' : '#6A6680'));
      txt.append(nm, tank, you); cell.appendChild(txt);
      const label = !best ? 'CATCH ONE' : takes || first || bigger ? 'DONATE' : 'DONATED';
      const b = button(label + (first ? ' +' + THANKS[rar] : ''), () => {
        if (busy) return; busy = name; b.textContent = '...';
        void h.donate(name).finally(() => { busy = ''; redraw(); });
      }, !(takes || first || bigger));
      b.disabled = !(takes || first || bigger); b.style.padding = '4px 8px'; b.style.whiteSpace = 'nowrap';
      cell.appendChild(b);
      return cell;
    }));
  };
  redraw();
  m.body.append(head, sub, list, row(button('CLOSE', m.close, true)));
  return { redraw };
}

export interface ShopHooks {
  tokens(): number;
  /** Do you own this piece of clothing? */
  owns(item: string): boolean;
  /** How you look (the clothes are shown on you). */
  look(): Look;
  buy(item: string): Promise<void>;
  /** Buy a piece of furniture: resolves with how many you own now. */
  buyFurn(id: string): Promise<number>;
  /** Put on a piece of clothing you own. */
  wear(item: string): void;
}
/** A little picture of you wearing `item`. */
function wearing(look: Look, item: string): HTMLCanvasElement {
  const c = mk(40, 44), l = withItem({ ...look, pet: 0 }, item);
  bake(c, () => { stampCritter(l, basePose(1), 20, 40, 0); });
  c.style.height = '44px'; c.style.imageRendering = 'pixelated'; return c;
}
/** A little picture of a piece of furniture. */
function piece(f: Furn): HTMLCanvasElement {
  const c = mk(f.w + 8, f.h + 14);
  bake(c, () => f.draw(Math.round(c.width / 2), c.height - (f.layer === 'wall' ? 2 : 4), false, { a: 1, night: 0, party: false, fish: [], badges: [], owner: '', photo: null }));
  c.style.height = '44px'; c.style.imageRendering = 'pixelated'; return c;
}
/** THE GIFT SHOP: four clothes (once each) and four pieces of furniture for your flat. */
export function openShop(h: ShopHooks, onClose: () => void): void {
  const m = openModal('THE GIFT SHOP', onClose);
  const head = document.createElement('div'); Object.assign(head.style, HEAD);
  const sub = document.createElement('div'); Object.assign(sub.style, { ...font(18, '#9FEFFF'), textAlign: 'center' }); sub.textContent = 'Everything here is only sold at the City Aquarium.';
  const list = document.createElement('div'); Object.assign(list.style, { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '6px', width: 'min(620px, 86vw)', maxHeight: '54vh', overflowY: 'auto' });
  const bought = new Map<string, number>();
  let busy = false;
  const tile = (pic: HTMLCanvasElement, name: string, line: string, act: HTMLButtonElement | null): HTMLElement => {
    const cell = document.createElement('div');
    Object.assign(cell.style, { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: 'rgba(255,255,255,.06)', borderLeft: '3px solid #E0503E', ...font(19, '#FFF3D6'), textAlign: 'left' });
    const txt = document.createElement('div'); txt.style.flex = '1';
    const nm = document.createElement('div'); nm.textContent = name; const ln = document.createElement('div'); ln.textContent = line; Object.assign(ln.style, font(16, '#9FEFFF'));
    txt.append(nm, ln); cell.append(pic, txt); if (act) { act.style.padding = '4px 8px'; act.style.whiteSpace = 'nowrap'; cell.appendChild(act); }
    return cell;
  };
  const go = (act: () => Promise<unknown>) => { if (busy) return; busy = true; void act().finally(() => { busy = false; redraw(); }); };
  const redraw = () => {
    head.textContent = 'YOUR TOKENS: ' + h.tokens();
    const clothes = GIFTS.map(([item, price]) => {
      const own = h.owns(item);
      return tile(wearing(h.look(), item), itemName(item), own ? 'YOURS' : price + ' TOKENS', own ? button('WEAR', () => { h.wear(item); m.close(); }, true) : button('BUY', () => go(() => h.buy(item))));
    });
    const furn = FURNITURE.filter((f) => f.shop === 'aquarium').map((f) => {
      const n = bought.get(f.id);
      return tile(piece(f), f.name, f.price + ' TOKENS · FOR YOUR FLAT' + (n ? ' · YOU HAVE ' + n : ''), button('BUY', () => go(() => h.buyFurn(f.id).then((k) => { bought.set(f.id, k); }))));
    });
    list.replaceChildren(...clothes, ...furn);
  };
  redraw();
  m.body.append(head, sub, list, row(button('CLOSE', m.close, true)));
}
