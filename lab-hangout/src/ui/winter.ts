// WINTER's panels: the advent calendar, THE TREE (hang an ornament, open your presents, send one),
// wrapping a Secret Santa present, and opening one.

import { mk, r, txt, tw, bake } from '../engine/pixel';
import { button, openModal, row } from './modal';
import { ORN_NAMES, WINTER, drawTree, ornament, present, treeHW } from '../world/winter';
import type { Ornament, TreeGift } from '../net/transport';

const font = (px: number, color: string) => ({ fontFamily: "'VT323', monospace", fontSize: px + 'px', color });
const note = (t: string, c = '#9FEFFF') => { const d = document.createElement('div'); d.textContent = t; Object.assign(d.style, font(19, c), { maxWidth: '460px', textAlign: 'center' }); return d; };
export const NOTES = ['MERRY CHRISTMAS!', 'HAPPY HOLIDAYS!', 'YOU\'RE THE BEST!', 'HAPPY NEW YEAR!', 'THANKS FOR BEING AWESOME', 'HO HO HO!'];
export const WRAP_NAMES = ['RED', 'GREEN', 'BLUE', 'GOLD', 'PURPLE', 'WHITE'];
const pic = (w: number, h: number, scale: number, draw: () => void): HTMLCanvasElement => {
  const c = mk(w, h); bake(c.getContext('2d')!, () => {draw(); });
  Object.assign(c.style, { width: w * scale + 'px', height: h * scale + 'px', imageRendering: 'pixelated' }); return c;
};

/** The advent calendar: 24 doors, open the ones up to today. */
export function openAdvent(h: { open(door: number): Promise<{ prize: string }>; prizeName(p: string): string }, onClose: () => void): void {
  const m = openModal('ADVENT CALENDAR', onClose);
  const msg = note(WINTER.advent.upto ? 'A door for every day until Christmas Eve. Missed one? It stays open for you.' : 'Loading...');
  const grid = document.createElement('div'); Object.assign(grid.style, { display: 'grid', gridTemplateColumns: 'repeat(6, min(56px, 12vw))', gap: 'min(6px, 1.4vw)', padding: 'min(10px, 2vw)', background: '#C82C38', border: '4px solid #8E1E28' });
  const draw = () => grid.replaceChildren(...Array.from({ length: 24 }, (_, i) => {
    const n = i + 1, open = WINTER.advent.opened.includes(n), ready = !open && n <= WINTER.advent.upto;
    const b = document.createElement('button'); b.type = 'button'; b.textContent = open ? '★' : String(n); b.disabled = !ready;
    Object.assign(b.style, { height: 'min(56px, 12vw)', padding: '0', fontFamily: "'Press Start 2P', monospace", fontSize: open ? '18px' : 'min(14px, 3.4vw)', background: open ? '#3C141A' : ready ? '#FFECC0' : '#E8D2A8', color: open ? '#FFD65A' : ready ? '#D62C38' : '#9A7A58', border: ready ? '3px solid #FFD65A' : '2px solid #B8906A', cursor: ready ? 'pointer' : 'default', animation: ready ? 'modpulse 1s steps(2) infinite' : '' });
    b.addEventListener('click', () => { b.disabled = true; h.open(n).then((res) => { WINTER.advent.opened.push(n); msg.textContent = 'Door ' + n + ': ' + h.prizeName(res.prize) + '!'; draw(); }).catch((e) => { msg.textContent = e instanceof Error ? e.message : String(e); b.disabled = false; }); });
    return b;
  }));
  draw();
  m.body.append(msg, grid, row(button('CLOSE', m.close, true)));
}

/** THE TREE: hang an ornament (pick one, click on the tree), and your Secret Santa presents. */
export interface TreeHooks {
  hang(kind: number, x: number, y: number): Promise<void>;
  gifts(): TreeGift[];
  openGift(g: TreeGift): void;
  send(): void;
}
export function openTree(h: TreeHooks, onClose: () => void): void {
  let raf = 0;
  const m = openModal('THE TREE', () => { cancelAnimationFrame(raf); onClose(); });
  const S = Math.max(2, Math.min(3, Math.floor((innerHeight - 330) / 200)));
  let kind = 0, busy = false; const W = 160, H = 196, top = 14;
  const cv = pic(W, H, S, () => {}); cv.style.cursor = 'copy';
  const redraw = () => bake(cv.getContext('2d')!, () => {r(0, 0, W, H, [16, 20, 44]); for (let i = 0; i < 40; i++) r(Math.floor((i * 37) % W), Math.floor((i * 53) % 60), 1, 1, [200, 210, 255]); r(0, H - 12, W, 12, [236, 242, 250]); drawTree(W / 2, top, performance.now() / 1000, WINTER.ornaments); });
  const loop = () => { redraw(); raf = requestAnimationFrame(loop); }; loop();
  const msg = note('Pick an ornament, then click on the tree to hang it. Everyone on your server sees it, all season. (5 a day)');
  cv.addEventListener('pointerdown', (e) => {
    if (busy) return; const rc = cv.getBoundingClientRect(), x = Math.round((e.clientX - rc.left) / rc.width * W - W / 2), y = Math.round((e.clientY - rc.top) / rc.height * H - top);
    if (y < 12 || y > 160 || Math.abs(x) > treeHW(y) - 2) { msg.textContent = 'Hang it on the branches!'; return; }
    busy = true; msg.textContent = 'Hanging...';
    h.hang(kind, x, y).then(() => { msg.textContent = 'Lovely! Your ' + ORN_NAMES[kind] + ' is on the tree.'; }).catch((err) => { msg.textContent = err instanceof Error ? err.message : String(err); }).finally(() => { busy = false; });
  });
  const kinds = document.createElement('div'); Object.assign(kinds.style, { display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', maxWidth: '220px' });
  const drawKinds = () => kinds.replaceChildren(...ORN_NAMES.map((nm, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.title = nm;
    Object.assign(b.style, { padding: '2px', background: '#1a1426', border: i === kind ? '3px solid #FFD65A' : '2px solid #444', cursor: 'pointer' });
    b.appendChild(pic(13, 13, 3, () => ornament(i, 6, 7, 0))); b.addEventListener('click', () => { kind = i; drawKinds(); }); return b;
  }));
  drawKinds();
  const mine = h.gifts().filter((g) => g.mine);
  const giftRow = document.createElement('div'); Object.assign(giftRow.style, { display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' });
  giftRow.append(note(mine.length ? 'Under the tree for you: ' + mine.length + (mine.length > 1 ? ' presents!' : ' present!') : 'No presents for you under the tree yet.', mine.length ? '#FFD65A' : '#9FEFFF'));
  if (mine.length) giftRow.append(button('OPEN A PRESENT', () => { m.close(); h.openGift(mine[0]); }));
  giftRow.append(button('SEND A PRESENT', () => { m.close(); h.send(); }, true));
  const side = document.createElement('div'); Object.assign(side.style, { display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' });
  side.append(kinds, giftRow);
  const wrap = document.createElement('div'); Object.assign(wrap.style, { display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' });
  wrap.append(cv, side);
  m.body.append(msg, wrap, row(button('CLOSE', m.close, true)));
}

/** Wrap a present for someone: how many tokens, the paper, a message. */
export function openSendGift(people: { id: string; name: string }[], preset: string | null, tokens: number, send: (to: string, tk: number, wrap: number, note: number) => Promise<void>, onClose: () => void): void {
  const m = openModal('SECRET SANTA', onClose);
  let to = preset ?? people[0]?.id ?? '', tk = 3, wrap = 0, nt = 0;
  const msg = note(people.length ? 'Wrap some of your tokens as a present. It waits under the tree in the Square until they open it (they find out who from!).' : 'Nobody else is online to send a present to. Try again when your friends are about!');
  const sel = document.createElement('select'); Object.assign(sel.style, { fontFamily: "'VT323', monospace", fontSize: '20px', padding: '4px' });
  for (const p of people) { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; if (p.id === to) o.selected = true; sel.appendChild(o); }
  sel.addEventListener('change', () => { to = sel.value; });
  const opt = (labels: string[], cur: () => number, set: (i: number) => void) => { const d = document.createElement('div'); Object.assign(d.style, { display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', maxWidth: '460px' }); const draw = () => d.replaceChildren(...labels.map((l, i) => { const b = button(l, () => { set(i); draw(); }, i !== cur()); return b; })); draw(); return d; };
  const amounts = [3, 5, 10];
  const papers = document.createElement('div'); Object.assign(papers.style, { display: 'flex', gap: '6px' });
  const drawPapers = () => papers.replaceChildren(...WRAP_NAMES.map((nm, i) => { const b = document.createElement('button'); b.type = 'button'; b.title = nm; Object.assign(b.style, { padding: '3px', background: '#1a1426', border: i === wrap ? '3px solid #FFD65A' : '2px solid #444', cursor: 'pointer' }); b.appendChild(pic(16, 16, 2, () => present(8, 15, i, 1))); b.addEventListener('click', () => { wrap = i; drawPapers(); }); return b; }));
  drawPapers();
  const go = button('WRAP IT UP', () => { go.disabled = true; msg.textContent = 'Wrapping...'; send(to, amounts[tk], wrap, nt).then(() => m.close()).catch((e) => { msg.textContent = e instanceof Error ? e.message : String(e); go.disabled = false; }); });
  go.disabled = !people.length;
  const lab = (t: string) => note(t, '#E8D8C0');
  m.body.append(msg, lab('FOR'), sel, lab('HOW MANY TOKENS (you have ' + tokens + ')'), opt(amounts.map(String), () => tk, (i) => { tk = i; }), lab('PAPER'), papers, lab('A MESSAGE'), opt(NOTES, () => nt, (i) => { nt = i; }), row(go, button('CANCEL', m.close, true)));
}

/** The big reveal. */
export function showGift(got: { got: number; from: string; note: number }, wrap: number, onClose: () => void): void {
  const m = openModal('A PRESENT FOR YOU!', onClose);
  const c = pic(40, 34, 3, () => { present(20, 32, wrap, 3, true); txt('+' + got.got, 20 - tw('+' + got.got) / 2, 4, [255, 214, 90]); });
  m.body.append(c, note('FROM ' + got.from + ': "' + (NOTES[got.note] ?? '') + '"', '#FFD65A'), note('+' + got.got + ' tokens!', '#7CF29C'), row(button('THANK YOU!', m.close)));
}
export type { Ornament };
