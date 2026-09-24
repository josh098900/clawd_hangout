// The Dev Den's kanban board: add short notes to TODO, click a note to move it along
// (TODO → DOING → DONE → gone). Every change replaces the whole list as room state.

import { NOTE_LEN, NOTES_MAX, cleanChat, type KanbanNote } from '../net/transport';
import { button, openModal, row } from './modal';

const COLS = ['TODO', 'DOING', 'DONE'], TINT = ['#FFEE8C', '#B4E1FF', '#B4F0B4'];

export function openKanban(get: () => KanbanNote[], set: (notes: KanbanNote[]) => void, onClose: () => void): void {
  let shown: KanbanNote[] | null = null;
  const m = openModal('KANBAN', () => { clearInterval(timer); onClose(); });
  const grid = document.createElement('div');
  Object.assign(grid.style, { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(110px, 1fr))', gap: '8px', width: 'min(560px, 86vw)' });
  const input = document.createElement('input');
  Object.assign(input, { maxLength: NOTE_LEN, placeholder: 'new note…' });
  Object.assign(input.style, { fontFamily: "'VT323', monospace", fontSize: '20px', background: 'rgba(0,0,0,.45)', color: '#FFE3B8', border: '0', borderBottom: '2px solid #D97757', padding: '4px 8px', outline: 'none', width: '200px' });
  const add = () => {
    const t = cleanChat(input.value).slice(0, NOTE_LEN); if (!t) return;
    const notes = get(); if (notes.length >= NOTES_MAX) { input.value = ''; input.placeholder = 'board is full!'; return; }
    set([...notes, { t, c: 0 }]); input.value = ''; draw();
  };
  input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') add(); if (e.key === 'Escape') m.close(); });
  const draw = () => {
    const notes = get(); shown = notes; grid.replaceChildren();
    COLS.forEach((name, c) => {
      const col = document.createElement('div'); Object.assign(col.style, { background: 'rgba(184,135,90,.25)', padding: '6px', minHeight: '120px', display: 'flex', flexDirection: 'column', gap: '5px' });
      const h = document.createElement('div'); h.textContent = name; Object.assign(h.style, { fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#FFB870', marginBottom: '2px' }); col.appendChild(h);
      notes.forEach((n, i) => {
        if (n.c !== c) return;
        const b = document.createElement('button'); b.type = 'button'; b.textContent = n.t; b.title = c < 2 ? 'Move to ' + COLS[c + 1] : 'Remove';
        Object.assign(b.style, { fontFamily: "'VT323', monospace", fontSize: '19px', textAlign: 'left', background: TINT[c], color: '#32281E', border: '0', padding: '3px 6px', cursor: 'pointer', overflowWrap: 'anywhere' });
        b.addEventListener('click', () => { const cur = get(); set(c < 2 ? cur.map((x, j) => (j === i ? { ...x, c: x.c + 1 } : x)) : cur.filter((_, j) => j !== i)); draw(); });
        col.appendChild(b);
      });
      grid.appendChild(col);
    });
  };
  const timer = window.setInterval(() => { if (get() !== shown) draw(); }, 400);
  m.body.append(grid, row(input, button('ADD', add), button('DONE', m.close, true)));
  draw();
  setTimeout(() => input.focus(), 30);
}
