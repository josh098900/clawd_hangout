// The Park's sandbox, up close: pile sand, dig it out, put towers on top. Everyone shares one
// sandbox (room state 'sand', a string of 320 digits: 0 flat .. 3 a big heap, 4 a tower), so
// what you build shows up for everyone in the Park.

import { PX, r, withCtx, M, shade } from '../engine/pixel';
import type { RGB } from '../engine/palette';
import { SFX } from '../audio/sfx';
import { button, openModal, row } from './modal';

const COLS = 32, ROWS = 10, C = 6;
type Tool = 'pile' | 'dig' | 'tower';

export function openSandbox(get: () => string, set: (v: string) => void, onClose: () => void): void {
  const W = COLS * C, H = ROWS * C + 14;
  const S = Math.max(2, Math.min(5, Math.floor((innerWidth - 60) / W)));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.style.width = W * S + 'px'; cv.style.height = H * S + 'px'; cv.style.touchAction = 'none'; cv.style.cursor = 'crosshair';
  const g = cv.getContext('2d')!;
  let tool: Tool = 'pile', raf = 0, down = false, lastCell = -1, pending: string | null = null, sendT = 0;
  const m = openModal('SANDBOX', () => { cancelAnimationFrame(raf); flush(); onClose(); });
  const flush = () => { if (pending !== null) { set(pending); pending = null; sendT = performance.now(); } };
  const apply = (cell: number) => {
    const v = (pending ?? get()).split(''), h = Number(v[cell]) || 0;
    const nh = tool === 'pile' ? (h >= 3 ? h : h + 1) : tool === 'dig' ? (h === 4 ? 3 : Math.max(0, h - 1)) : 4;
    if (nh === h) return;
    v[cell] = String(nh); pending = v.join(''); SFX.step();
    if (performance.now() - sendT > 250) flush(); // share it a few times a second while you drag
  };
  const cellAt = (e: PointerEvent) => { const rc = cv.getBoundingClientRect(), x = Math.floor(((e.clientX - rc.left) / rc.width) * W / C), y = Math.floor((((e.clientY - rc.top) / rc.height) * H - 14) / C); return x >= 0 && x < COLS && y >= 0 && y < ROWS ? y * COLS + x : -1; };
  cv.addEventListener('pointerdown', (e) => { down = true; cv.setPointerCapture(e.pointerId); const c = cellAt(e); if (c >= 0) { lastCell = c; apply(c); } });
  cv.addEventListener('pointermove', (e) => { if (!down) return; const c = cellAt(e); if (c >= 0 && c !== lastCell) { lastCell = c; apply(c); } });
  cv.addEventListener('pointerup', () => { down = false; lastCell = -1; flush(); });
  const draw = () => {
    const v = pending ?? get(), sand: RGB = [232, 206, 150], pd = PX.dim, pe = PX.emit; PX.dim = 0; PX.emit = false;
    withCtx(g, () => {
      r(0, 0, W, H, [150, 100, 60]); r(0, 14, W, H - 14, sand);
      for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
        const h = Number(v[j * COLS + i]) || 0, x = i * C, y = 14 + j * C;
        if (!h) { if ((i + j) % 5 === 0) r(x + 2, y + 2, 1, 1, shade(sand, 0.9)); continue; }
        if (h === 4) { r(x, y - 6, C, C + 6, shade(sand, 0.9)); r(x, y - 7, 1, 1, sand); r(x + 2, y - 7, 1, 1, sand); r(x + 4, y - 7, 1, 1, sand); r(x, y - 6, 1, C + 6, M(sand, [255, 255, 255], 0.2)); }
        else { r(x, y - h, C, C + h, M(sand, [255, 255, 255], 0.07 * h)); r(x, y - h, C, 1, M(sand, [255, 255, 255], 0.3)); r(x, y + C - 1, C, 1, shade(sand, 0.8)); }
      }
    });
    PX.dim = pd; PX.emit = pe;
    raf = requestAnimationFrame(draw);
  };
  const tools = row(...(['pile', 'dig', 'tower'] as Tool[]).map((t) => { const b = button(t.toUpperCase(), () => { tool = t; sync(); SFX.blip(); }, t !== tool); b.dataset.t = t; return b; }), button('SMOOTH IT ALL', () => { if (confirm('Flatten the whole sandbox for everyone?')) { pending = '0'.repeat(COLS * ROWS); flush(); } }, true));
  const sync = () => tools.querySelectorAll<HTMLButtonElement>('button[data-t]').forEach((b) => { b.className = 'mbtn' + (b.dataset.t === tool ? '' : ' ghost'); });
  const hint = document.createElement('div'); hint.textContent = 'Click or drag to build. Everyone in the park shares this sandbox.';
  Object.assign(hint.style, { fontFamily: "'VT323', monospace", fontSize: '19px', color: '#E8D8C0' });
  m.body.append(cv, hint, tools, row(button('DONE', m.close, true)));
  sync(); draw();
}
