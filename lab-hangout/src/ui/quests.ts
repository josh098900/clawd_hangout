// The QUESTS panel (the pill in the top bar): today's three quests with progress, when they
// change, and your badges. Plus the badge chips shown on someone's player card.

import { BADGES, QUESTS, quests } from '../game/quests';
import { button, openModal, row, font } from './modal';

const hm = (sec: number) => { const m = Math.ceil(sec / 60); return Math.floor(m / 60) + 'h ' + (m % 60) + 'm'; };

export function openQuests(onClose: () => void): void {
  const m = openModal('DAILY QUESTS', onClose);
  const list = document.createElement('div'); Object.assign(list.style, { display: 'flex', flexDirection: 'column', gap: '6px', width: 'min(460px, 84vw)' });
  if (!quests.today.length) { const e = document.createElement('div'); e.textContent = 'No quests yet (are you online?)'; Object.assign(e.style, font(20, '#9FEFFF')); list.appendChild(e); }
  for (const id of quests.today) {
    const q = QUESTS[id], done = quests.done.has(id), n = done ? q.goal : quests.count(id);
    const line = document.createElement('div'); Object.assign(line.style, { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: done ? 'rgba(124,242,156,.10)' : 'rgba(255,255,255,.05)', borderLeft: '3px solid ' + (done ? '#7CF29C' : '#FFD65A') });
    const txt = document.createElement('div'); txt.style.flex = '1';
    const name = document.createElement('div'); name.textContent = (done ? '✓ ' : '') + q.text; Object.assign(name.style, font(20, done ? '#9FEFC0' : '#FFF3D6'));
    const bar = document.createElement('div'); Object.assign(bar.style, { height: '6px', marginTop: '4px', background: 'rgba(255,255,255,.12)' });
    const fill = document.createElement('div'); Object.assign(fill.style, { height: '100%', width: Math.round((n / q.goal) * 100) + '%', background: done ? '#7CF29C' : '#FFD65A' }); bar.appendChild(fill);
    txt.append(name, bar);
    const right = document.createElement('div'); right.textContent = done ? 'DONE' : n + '/' + q.goal + ' · +5'; Object.assign(right.style, font(19, done ? '#7CF29C' : '#FFD65A'), { whiteSpace: 'nowrap' });
    line.append(txt, right); list.appendChild(line);
  }
  const foot = document.createElement('div');
  foot.textContent = (quests.done.size >= 3 ? 'All done! ' : 'Finish all three for +10 more. ') + 'New quests in ' + hm(quests.resetIn()) + '.';
  Object.assign(foot.style, font(18, '#9FEFFF'), { textAlign: 'center' });
  const bh = document.createElement('div'); bh.textContent = 'BADGES ' + BADGES.filter((b) => quests.mine.has(b.id)).length + '/' + BADGES.length;
  Object.assign(bh.style, { fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#FFD65A', marginTop: '6px' });
  const grid = document.createElement('div'); Object.assign(grid.style, { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '5px', width: 'min(460px, 84vw)', maxHeight: '26vh', overflowY: 'auto' });
  for (const b of BADGES) {
    const have = quests.mine.has(b.id), c = document.createElement('div');
    c.title = b.hint;
    Object.assign(c.style, { padding: '5px 7px', background: have ? 'rgba(255,214,90,.14)' : 'rgba(0,0,0,.25)', borderLeft: '3px solid ' + (have ? '#FFD65A' : '#44405A'), textAlign: 'left' });
    const n = document.createElement('div'); n.textContent = (have ? '★ ' : '') + b.name; Object.assign(n.style, font(18, have ? '#FFF3D6' : '#7A7690'));
    const h = document.createElement('div'); h.textContent = b.hint; Object.assign(h.style, font(15, have ? '#E8D8C0' : '#6A6680'));
    c.append(n, h); grid.appendChild(c);
  }
  m.body.append(list, foot, bh, grid, row(button('CLOSE', m.close, true)));
}

/** Badge chips for a player card (names only, gold). */
export function badgeChips(ids: string[]): HTMLElement {
  const box = document.createElement('div'); Object.assign(box.style, { display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', maxWidth: '320px' });
  for (const b of BADGES) if (ids.includes(b.id)) { const c = document.createElement('span'); c.textContent = '★ ' + b.name; c.title = b.hint; Object.assign(c.style, font(16, '#1A1428'), { background: '#FFD65A', padding: '1px 6px' }); box.appendChild(c); }
  return box;
}
