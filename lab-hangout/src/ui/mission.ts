// MISSION CONTROL: the Space Station's telescope. Drag (or use the arrow keys) to look around the
// sky (world/sky.ts, the same sky for everyone); hold the crosshair on something for a moment to
// log it. There's a new comet every 5 minutes, the Square is down there somewhere on Earth, and
// once in a while... something else. The station's big screen shows where you're pointing.

import { K } from '../engine/palette';
import { PX, r, txt, tw, withCtx, lit } from '../engine/pixel';
import { SFX } from '../audio/sfx';
import { button, openModal, row } from './modal';
import { SKY_H, SKY_W, skyThings, skyView, type SkyThing } from '../world/sky';

const W = 240, H = 150, HOLD = 1.2;
/** Everything there is to log (the UFO is a secret: it only shows once you've seen it). */
export const SKY_LOG = ['MARS', 'VENUS', 'JUPITER', 'SATURN', 'NEPTUNE', 'THE MOON', 'COMET', 'THE SQUARE'];

export interface MissionHooks {
  /** Where the telescope points now (throttle it yourself). */
  aim(x: number, y: number): void;
  /** Held on something long enough. */
  spotted(t: SkyThing): void;
  /** What you've logged before. */
  log(): string[];
}
export function openMission(start: { x: number; y: number }, h: MissionHooks, onClose: () => void): void {
  const S = Math.max(2, Math.min(4, Math.floor(Math.min((innerWidth - 60) / W, (innerHeight - 250) / H))));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; Object.assign(cv.style, { width: W * S + 'px', height: H * S + 'px', cursor: 'grab', touchAction: 'none', imageRendering: 'pixelated' });
  const g = cv.getContext('2d')!;
  const status = document.createElement('div'); Object.assign(status.style, { fontFamily: "'VT323', monospace", fontSize: '20px', color: '#9FEFFF', maxWidth: W * S + 'px', textAlign: 'center' });
  let x = start.x, y = start.y, raf = 0, drag: { px: number; py: number; x: number; y: number } | null = null, lock: { id: string; t0: number } | null = null, last = performance.now();
  const keys = new Set<string>(), done = new Set<string>();
  const m = openModal('MISSION CONTROL', () => { cancelAnimationFrame(raf); removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); onClose(); });
  const kd = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) { keys.add(k); e.preventDefault(); e.stopPropagation(); } };
  const ku = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  addEventListener('keydown', kd, true); addEventListener('keyup', ku, true);
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); drag = { px: e.clientX, py: e.clientY, x, y }; cv.style.cursor = 'grabbing'; });
  cv.addEventListener('pointermove', (e) => { if (!drag) return; const k = W / cv.getBoundingClientRect().width; x = drag.x - (e.clientX - drag.px) * k; y = drag.y - (e.clientY - drag.py) * k; });
  const up = () => { drag = null; cv.style.cursor = 'grab'; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  const setStatus = () => { const lg = h.log(), n = SKY_LOG.filter((s) => lg.includes(s)).length; status.textContent = 'Drag or use the arrow keys to look around. Hold the crosshair on something to log it · SKY LOG ' + n + '/' + SKY_LOG.length + (lg.includes('UFO') ? ' + UFO!' : ''); };
  setStatus();
  const draw = (nowMs: number) => {
    const dt = Math.min(0.1, (nowMs - last) / 1000); last = nowMs;
    const sp = 140 * dt;
    if (keys.has('arrowleft') || keys.has('a')) x -= sp; if (keys.has('arrowright') || keys.has('d')) x += sp;
    if (keys.has('arrowup') || keys.has('w')) y -= sp; if (keys.has('arrowdown') || keys.has('s')) y += sp;
    x = ((x % SKY_W) + SKY_W) % SKY_W; y = Math.max(H / 2, Math.min(SKY_H - H / 2, y));
    h.aim(x, y);
    // what's under the crosshair?
    const now = Date.now(), under = skyThings(now).find((t) => { const dx = Math.min(Math.abs(t.x - x), SKY_W - Math.abs(t.x - x)); return dx < t.rad + 6 && Math.abs(t.y - y) < t.rad + 6; }) ?? null;
    if (!under) lock = null; else if (!lock || lock.id !== under.name) lock = { id: under.name, t0: nowMs };
    const hold = lock ? (nowMs - lock.t0) / 1000 : 0;
    if (lock && under && hold >= HOLD && !done.has(under.name)) { done.add(under.name); SFX.score(); h.spotted(under); setStatus(); }
    const pd = PX.dim, pe = PX.emit; PX.dim = 0; PX.emit = false;
    withCtx(g, () => {
      skyView(0, 0, W, H, x, y, now, true);
      // the eyepiece: dark corners, the crosshair, and a ring filling up while you hold on something
      const cx = W / 2, cy = H / 2, c = lock ? K.GOLD : [124, 242, 156] as [number, number, number];
      lit(() => { r(cx - 12, cy, 8, 1, c); r(cx + 5, cy, 8, 1, c); r(cx, cy - 12, 1, 8, c); r(cx, cy + 5, 1, 8, c); });
      if (lock && under && !done.has(under.name)) { const u = Math.min(1, hold / HOLD); lit(() => { for (let k = 0; k < 32 * u; k++) { const an = -Math.PI / 2 + (k / 32) * Math.PI * 2; r(Math.round(cx + Math.cos(an) * 10), Math.round(cy + Math.sin(an) * 10), 1, 1, K.GOLD); } }); }
      if (lock && under && done.has(under.name)) lit(() => { const t = 'LOGGED: ' + under.name; r(cx - tw(t) / 2 - 2, cy + 16, tw(t) + 4, 8, [0, 0, 0]); txt(t, cx - tw(t) / 2, cy + 17, K.GOLD); });
      for (let yy = 0; yy < H; yy++) { const e = Math.abs(yy - H / 2) / (H / 2), w0 = Math.max(0, Math.round((e * e * e) * 40)); if (w0) { r(0, yy, w0, 1, [0, 0, 0]); r(W - w0, yy, w0, 1, [0, 0, 0]); } }
      const ang = 'RA ' + Math.round(x / SKY_W * 360) + '  DEC ' + Math.round(90 - (y / SKY_H) * 180); lit(() => txt(ang, 4, H - 8, [80, 200, 120]));
    });
    PX.dim = pd; PX.emit = pe;
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  m.body.append(cv, status, row(button('DONE', m.close)));
}
