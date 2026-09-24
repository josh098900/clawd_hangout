// The Arcade's prize counter: your whole collection, what you're missing and how to get it.
// Anything you own can be put on right here.

import { COLLECTABLES, itemName, RARITY, unlockHint, type Slot } from '../entities/critter';
import { save } from '../game/save';
import { button, openModal, row } from './modal';

const RARE_COL: Record<string, string> = { COMMON: '#E8D8C0', UNCOMMON: '#7CF29C', RARE: '#5FE7FF', LEGENDARY: '#FFD65A', SPECIAL: '#FF9AD8' };
const SLOT_NAME: Record<string, string> = { hat: 'HAT', face: 'FACE', fit: 'OUTFIT', pet: 'PET' };

export function openPrizes(wear: (item: string) => void, onClose: () => void): void {
  const m = openModal('PRIZE COUNTER', onClose);
  const got = COLLECTABLES.filter((k) => save.has(k)).length;
  const head = document.createElement('div'); head.textContent = 'YOUR COLLECTION ' + got + '/' + COLLECTABLES.length + (got === COLLECTABLES.length ? ' · COMPLETE!' : '');
  Object.assign(head.style, { fontFamily: "'Press Start 2P', monospace", fontSize: '11px', color: '#FFD65A', textAlign: 'center' });
  const list = document.createElement('div'); Object.assign(list.style, { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '6px', width: 'min(620px, 84vw)', maxHeight: '52vh', overflowY: 'auto' });
  for (const item of COLLECTABLES) {
    const own = save.has(item), rar = RARITY(item), [slot, i] = item.split(':');
    const cell = document.createElement('div');
    Object.assign(cell.style, { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: own ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.25)', borderLeft: '3px solid ' + (own ? RARE_COL[rar] : '#44405A'), fontFamily: "'VT323', monospace", fontSize: '19px', color: own ? '#FFF3D6' : '#7A7690', textAlign: 'left' });
    const txt = document.createElement('div'); txt.style.flex = '1';
    const nm = document.createElement('div'); nm.textContent = (own ? '' : '? ') + itemName(item) + ' · ' + SLOT_NAME[slot];
    const sub = document.createElement('div'); sub.textContent = own ? rar : unlockHint(slot as Slot, Number(i)); Object.assign(sub.style, { fontSize: '16px', color: own ? RARE_COL[rar] : '#6A6680' });
    txt.append(nm, sub); cell.appendChild(txt);
    if (own) { const b = button('WEAR', () => { wear(item); m.close(); }, true); b.style.padding = '4px 8px'; cell.appendChild(b); }
    list.appendChild(cell);
  }
  m.body.append(head, list, row(button('CLOSE', m.close, true)));
}
