// STARGAZE: the rooftop telescope. A patch of night sky with one constellation hidden among
// the stars; the chart in the corner shows its shape. Click its stars to trace it. Found
// constellations are remembered in this browser.

import { K } from '../engine/palette';
import { PX, r, txt, tw, withCtx, line } from '../engine/pixel';
import { SFX } from '../audio/sfx';
import { button, openModal, row } from './modal';
import { save } from '../game/save';

const W = 220, H = 150;
/** Constellations as points in a 0..1 box, traced in order. */
const SKY: { name: string; pts: [number, number][] }[] = [
  { name: 'THE HEART', pts: [[0.5, 0.95], [0.1, 0.5], [0.12, 0.2], [0.32, 0.08], [0.5, 0.3], [0.68, 0.08], [0.88, 0.2], [0.9, 0.5]] },
  { name: 'THE DIPPER', pts: [[0, 0.1], [0.2, 0.2], [0.38, 0.3], [0.55, 0.45], [0.58, 0.8], [0.95, 0.85], [1, 0.5]] },
  { name: 'THE CRITTER', pts: [[0.5, 0], [0.5, 0.25], [0.2, 0.45], [0.15, 0.75], [0.4, 0.95], [0.6, 0.95], [0.85, 0.75], [0.8, 0.45]] },
  { name: 'THE DRAGON', pts: [[0, 0.6], [0.2, 0.3], [0.35, 0.55], [0.55, 0.2], [0.7, 0.5], [0.9, 0.35], [1, 0.1]] },
  { name: 'THE MUG', pts: [[0.1, 0.1], [0.15, 0.9], [0.7, 0.9], [0.75, 0.1], [0.95, 0.35], [0.9, 0.65]] },
];
const found = (): string[] => save.data.stars;

export function openStars(onClose: () => void): void {
  const S = Math.max(2, Math.min(4, Math.floor(Math.min((innerWidth - 60) / W, (innerHeight - 240) / H))));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.style.width = W * S + 'px'; cv.style.height = H * S + 'px'; cv.style.cursor = 'crosshair';
  const g = cv.getContext('2d')!;
  const status = document.createElement('div'); Object.assign(status.style, { fontFamily: "'VT323', monospace", fontSize: '20px', color: '#9FEFFF' });
  let raf = 0, which = Math.floor(Math.random() * SKY.length), hit: number[] = [], pts: [number, number][] = [], noise: [number, number, number][] = [], done = 0;
  const m = openModal('STARGAZING', () => { cancelAnimationFrame(raf); onClose(); });
  const setup = () => {
    const c = SKY[which], bw = 70 + Math.random() * 30, bh = 60 + Math.random() * 20, ox = 20 + Math.random() * (W - bw - 90), oy = 12 + Math.random() * (H - bh - 24);
    pts = c.pts.map(([x, y]) => [Math.round(ox + x * bw), Math.round(oy + y * bh)]); hit = []; done = 0;
    noise = Array.from({ length: 70 }, () => [Math.floor(Math.random() * W), Math.floor(Math.random() * H), Math.random()]);
    status.textContent = 'Find ' + c.name + ' (the chart shows its shape) · FOUND ' + found().length + '/' + SKY.length;
  };
  cv.addEventListener('pointerdown', (e) => {
    const rc = cv.getBoundingClientRect(), x = ((e.clientX - rc.left) / rc.width) * W, y = ((e.clientY - rc.top) / rc.height) * H;
    const i = pts.findIndex(([px, py], k) => !hit.includes(k) && Math.hypot(px - x, py - y) < 6);
    if (i < 0) { SFX.blip(); return; }
    hit.push(i); SFX.chime();
    if (hit.length === pts.length) {
      done = performance.now(); SFX.score();
      const f = found(); if (!f.includes(SKY[which].name)) save.update((d) => { d.stars.push(SKY[which].name); });
      status.textContent = 'YOU FOUND ' + SKY[which].name + '! · FOUND ' + f.length + '/' + SKY.length;
    }
  });
  const draw = () => {
    const pd = PX.dim, pe = PX.emit; PX.dim = 0; PX.emit = false;
    withCtx(g, () => {
      r(0, 0, W, H, [6, 8, 24]);
      const t = performance.now() / 1000;
      for (const [x, y, b] of noise) r(x, y, 1, 1, (t * 0.7 + b * 5) % 1 < 0.15 ? [120, 130, 180] : b > 0.6 ? [210, 220, 255] : [140, 150, 200]);
      pts.forEach(([x, y], k) => { const on = hit.includes(k); r(x, y, 1, 1, K.WHITE); if (on) { r(x - 1, y, 3, 1, K.GOLD); r(x, y - 1, 1, 3, K.GOLD); } });
      if (done) { for (let k = 0; k < pts.length - 1; k++) line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], [255, 214, 90]); }
      else for (let k = 1; k < hit.length; k++) { const a = pts[hit[k - 1]], b = pts[hit[k]]; line(a[0], a[1], b[0], b[1], [120, 110, 70]); }
      // the chart: the target's shape, small, bottom-right
      r(W - 58, H - 44, 56, 42, [16, 20, 40]); r(W - 58, H - 44, 56, 1, [60, 70, 110]);
      const c = SKY[which];
      for (let k = 0; k < c.pts.length - 1; k++) line(W - 52 + c.pts[k][0] * 44, H - 38 + c.pts[k][1] * 28, W - 52 + c.pts[k + 1][0] * 44, H - 38 + c.pts[k + 1][1] * 28, [80, 90, 140]);
      for (const [x, y] of c.pts) r(Math.round(W - 52 + x * 44), Math.round(H - 38 + y * 28), 1, 1, K.WHITE);
      if (done) txt(c.name, W / 2 - tw(c.name) / 2, 4, K.GOLD);
    });
    PX.dim = pd; PX.emit = pe;
    raf = requestAnimationFrame(draw);
  };
  setup(); draw();
  m.body.append(cv, status, row(button('NEXT SKY', () => { which = (which + 1) % SKY.length; setup(); }, true), button('DONE', m.close)));
}
