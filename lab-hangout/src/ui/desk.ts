// DESK STUFF (the Dev Den bookshelf): pick what goes on your desk. It's part of your look, so
// everyone sees your setup on whichever desk you sit at, and it's saved with your profile.

import { NK } from '../engine/palette';
import { PX, r, withCtx } from '../engine/pixel';
import { DESK_ITEMS } from '../entities/critter';
import { drawDecor } from '../world/den';
import { SFX } from '../audio/sfx';
import { button, openModal, row } from './modal';

const W = 90, H = 64;

export function openDesk(bits: number, onChange: (bits: number) => void, onClose: () => void): void {
  const S = Math.max(3, Math.min(5, Math.floor((innerWidth - 80) / W)));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.style.width = W * S + 'px'; cv.style.height = H * S + 'px';
  const g = cv.getContext('2d')!;
  let raf = 0;
  const m = openModal('DESK SETUP', () => { cancelAnimationFrame(raf); onClose(); });
  const draw = () => {
    const a = performance.now() / 1000, pd = PX.dim, pe = PX.emit; PX.dim = 0; PX.emit = false;
    withCtx(g, () => {
      r(0, 0, W, H, [40, 30, 26]); for (let y = 0; y < H; y += 8) r(0, y, W, 1, [46, 36, 30]);
      const dx = W / 2, dy = 54;
      r(dx - 30, dy - 22, 60, 4, NK.DESK_HI); r(dx - 30, dy - 18, 60, 14, NK.DESK); r(dx - 29, dy - 4, 3, 4, NK.WOOD_DK); r(dx + 26, dy - 4, 3, 4, NK.WOOD_DK);
      r(dx - 9, dy - 32, 18, 10, NK.LAPTOP); r(dx - 9, dy - 32, 18, 1, NK.LAPTOP_HI); r(dx - 11, dy - 23, 22, 1, NK.LAPTOP_HI);
      drawDecor(dx, dy, bits, a);
    });
    PX.dim = pd; PX.emit = pe;
    raf = requestAnimationFrame(draw);
  };
  const grid = document.createElement('div'); Object.assign(grid.style, { display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', maxWidth: 'min(460px, 84vw)' });
  DESK_ITEMS.forEach((name, i) => {
    const b = button(name, () => { bits ^= 1 << i; sync(); onChange(bits); SFX.blip(); }, true);
    b.dataset.i = String(i); grid.appendChild(b);
  });
  const sync = () => grid.querySelectorAll<HTMLButtonElement>('button').forEach((b) => { const on = (bits & (1 << Number(b.dataset.i))) !== 0; b.className = 'mbtn' + (on ? '' : ' ghost'); b.setAttribute('aria-pressed', String(on)); });
  const hint = document.createElement('div'); hint.textContent = 'Sit at any desk and your stuff comes with you.';
  Object.assign(hint.style, { fontFamily: "'VT323', monospace", fontSize: '19px', color: '#E8D8C0' });
  m.body.append(cv, hint, grid, row(button('DONE', m.close, true)));
  sync(); draw();
}
