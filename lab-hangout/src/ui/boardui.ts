// Drawing on the Lab whiteboard: a zoomed-in copy of the board with a few markers.
// Strokes are drawn locally at once and sent in small chunks (~12 per second).

import { BOARD, INKS } from '../game/board';
import { css } from '../engine/pixel';
import { LK } from '../engine/palette';
import { BOARD_H, BOARD_W, type DrawMsg } from '../net/transport';
import { button, openModal, row } from './modal';

export function openBoard(send: (d: DrawMsg) => void, onClose: () => void): void {
  let ink = 1, raf = 0, timer = 0, pts: number[] = [], last: [number, number] | null = null;
  const S = Math.max(2, Math.min(5, Math.floor((innerWidth - 60) / BOARD_W)));
  const cv = document.createElement('canvas'); cv.width = BOARD_W * S; cv.height = BOARD_H * S;
  cv.style.width = cv.width + 'px'; cv.style.height = cv.height + 'px'; cv.style.cursor = 'crosshair';
  const g = cv.getContext('2d')!;
  const flush = () => { if (pts.length >= 2) { send({ c: ink, p: pts, clear: false, ts: Date.now() }); pts = last ? [last[0], last[1]] : []; } };
  const m = openModal('WHITEBOARD', () => { cancelAnimationFrame(raf); clearInterval(timer); flush(); onClose(); });
  const draw = () => { g.imageSmoothingEnabled = false; g.fillStyle = css(LK.WB); g.fillRect(0, 0, cv.width, cv.height); g.drawImage(BOARD.cv, 0, 0, cv.width, cv.height); raf = requestAnimationFrame(draw); };
  draw();
  timer = window.setInterval(flush, 80);
  const at = (e: PointerEvent): [number, number] => {
    const rc = cv.getBoundingClientRect();
    return [Math.max(0, Math.min(BOARD_W - 1, Math.floor(((e.clientX - rc.left) / rc.width) * BOARD_W))), Math.max(0, Math.min(BOARD_H - 1, Math.floor(((e.clientY - rc.top) / rc.height) * BOARD_H)))];
  };
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId); flush();
    const p = at(e); last = p; pts = [p[0], p[1]]; BOARD.line(ink, p[0], p[1], p[0], p[1]); BOARD.ts = Date.now();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!last) return;
    const p = at(e); if (p[0] === last[0] && p[1] === last[1]) return;
    BOARD.line(ink, last[0], last[1], p[0], p[1]); BOARD.ts = Date.now();
    pts.push(p[0], p[1]); last = p;
    if (pts.length >= 240) flush();
  });
  const up = () => { flush(); last = null; pts = []; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  const inks = INKS.map((c, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ink';
    b.style.background = c ? css(c) : 'repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 8px 8px';
    b.setAttribute('aria-label', c ? 'marker ' + i : 'eraser');
    b.addEventListener('click', () => { flush(); ink = i; inks.forEach((x, j) => x.setAttribute('aria-pressed', String(j === ink))); });
    b.setAttribute('aria-pressed', String(i === ink));
    return b;
  });
  inks.push(inks.shift()!); // eraser last
  m.body.append(cv, row(...inks, button('CLEAR', () => { BOARD.clear(); BOARD.ts = Date.now(); send({ c: 0, p: [], clear: true, ts: BOARD.ts }); }, true), button('DONE', m.close)));
}
