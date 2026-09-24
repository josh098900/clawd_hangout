// PONG for two, at the Arcade. Stand at P1 or P2; the match starts once both sides are taken.
// P1's browser runs the ball (so both screens agree) and sends it with its paddle ~15 times
// a second; P2 sends only its paddle. First to 5. Everyone else in the room watches it live
// on the cabinet (world/arcade.ts reads the same messages).
// Keys: W/S or ↑/↓. Touch/mouse: drag on the court.

import { K } from '../engine/palette';
import { PX, r, txt, tw, withCtx } from '../engine/pixel';
import type { PongMsg } from '../net/transport';
import { SFX } from '../audio/sfx';
import { button, openModal, row } from './modal';

const W = 160, H = 100, PH = 0.22, WIN = 5, SEND = 1 / 15;

export interface PongHooks {
  side: 0 | 1;
  /** The player on the other side right now (null = nobody). */
  opponent(): { id: string; name: string } | null;
  myName: string;
  send(p: PongMsg): void;
  /** P1 only: the match is over. */
  over(winnerName: string): void;
  onClose(): void;
}
export interface PongHandle { recv(id: string, p: PongMsg): void }

export function openPong(h: PongHooks): PongHandle {
  const S = Math.max(2, Math.min(5, Math.floor(Math.min((innerWidth - 60) / W, (innerHeight - 240) / H))));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.style.width = W * S + 'px'; cv.style.height = H * S + 'px'; cv.style.touchAction = 'none';
  const g = cv.getContext('2d')!;
  const info = document.createElement('div'); Object.assign(info.style, { fontFamily: "'VT323', monospace", fontSize: '20px', color: '#9FEFFF', minHeight: '22px' });
  info.textContent = (h.side === 0 ? 'You are P1 (left)' : 'You are P2 (right)') + ' · W/S or ↑/↓, or drag on the court';
  const me = { p: 0.5 }, them = { p: 0.5, t: 0, id: '' };
  let ball = { x: 0.5, y: 0.5, vx: 0, vy: 0 }, sc: [number, number] = [0, 0], ph = 0, phT = performance.now() / 1000, last = performance.now() / 1000, lastSend = 0, ballT = 0;
  let up = false, down = false, drag: number | null = null, raf = 0;
  const key = (e: KeyboardEvent, on: boolean) => {
    if (['w', 'W', 'ArrowUp'].includes(e.key)) { up = on; e.preventDefault(); }
    else if (['s', 'S', 'ArrowDown'].includes(e.key)) { down = on; e.preventDefault(); }
  };
  const kd = (e: KeyboardEvent) => key(e, true), ku = (e: KeyboardEvent) => key(e, false);
  addEventListener('keydown', kd, true); addEventListener('keyup', ku, true);
  const toY = (e: PointerEvent) => { const rc = cv.getBoundingClientRect(); return (e.clientY - rc.top) / rc.height; };
  cv.addEventListener('pointerdown', (e) => { drag = toY(e); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (drag !== null) drag = toY(e); });
  cv.addEventListener('pointerup', () => { drag = null; });
  const m = openModal('PONG', () => { cancelAnimationFrame(raf); removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); h.onClose(); });
  const setPh = (p: number) => { ph = p; phT = performance.now() / 1000; };
  const serve = (toward: number) => { const an = (Math.random() - 0.5) * 0.9; ball = { x: 0.5, y: 0.3 + Math.random() * 0.4, vx: toward * 0.55 * Math.cos(an), vy: 0.55 * Math.sin(an) }; };

  const step = () => {
    const now = performance.now() / 1000, dt = Math.min(0.05, now - last); last = now;
    // my paddle
    if (drag !== null) me.p += (Math.max(PH / 2, Math.min(1 - PH / 2, drag)) - me.p) * Math.min(1, dt * 14);
    else me.p = Math.max(PH / 2, Math.min(1 - PH / 2, me.p + ((down ? 1 : 0) - (up ? 1 : 0)) * dt * 1.3));
    const opp = h.opponent();
    if (h.side === 0) { // P1 runs the match
      if (!opp) { if (ph !== 0) { setPh(0); sc = [0, 0]; } }
      else if (ph === 0) { setPh(1); sc = [0, 0]; ball = { x: 0.5, y: 0.5, vx: 0, vy: 0 }; SFX.blip(); }
      else if (ph === 1 && now - phT > 3) { setPh(2); serve(Math.random() < 0.5 ? -1 : 1); SFX.chime(); }
      else if (ph === 2) {
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.y < 0.02) { ball.y = 0.02; ball.vy = Math.abs(ball.vy); SFX.step(); }
        if (ball.y > 0.98) { ball.y = 0.98; ball.vy = -Math.abs(ball.vy); SFX.step(); }
        const pl = me.p, pr = them.t && now - them.t < 1.5 ? them.p : 0.5;
        const hit = (py: number) => Math.abs(ball.y - py) < PH / 2 + 0.03;
        if (ball.vx < 0 && ball.x < 0.05 && ball.x > 0.01 && hit(pl)) { ball.x = 0.05; ball.vx = Math.abs(ball.vx) * 1.07; ball.vy += (ball.y - pl) * 2.2; SFX.blip(); }
        if (ball.vx > 0 && ball.x > 0.95 && ball.x < 0.99 && hit(pr)) { ball.x = 0.95; ball.vx = -Math.abs(ball.vx) * 1.07; ball.vy += (ball.y - pr) * 2.2; SFX.blip(); }
        ball.vx = Math.max(-2.2, Math.min(2.2, ball.vx)); ball.vy = Math.max(-1.6, Math.min(1.6, ball.vy));
        if (ball.x < -0.02 || ball.x > 1.02) {
          const p2 = ball.x < 0; sc = p2 ? [sc[0], sc[1] + 1] : [sc[0] + 1, sc[1]]; SFX.score();
          if (sc[0] >= WIN || sc[1] >= WIN) { setPh(3); ball = { x: 0.5, y: 0.5, vx: 0, vy: 0 }; h.over(sc[0] >= WIN ? h.myName : opp.name); }
          else serve(p2 ? -1 : 1);
        }
      } else if (ph === 3 && now - phT > 5) setPh(opp ? 1 : 0);
      if (now - lastSend > SEND) { lastSend = now; h.send({ s: 0, p: me.p, b: [ball.x, ball.y, ball.vx, ball.vy], sc, ph }); }
    } else { // P2: move the ball on from P1's last word
      const d = Math.min(0.25, now - ballT);
      if (ph === 2 && ballT) { ball.x += ball.vx * dt * (d < 0.25 ? 1 : 0); ball.y = Math.max(0.02, Math.min(0.98, ball.y + ball.vy * dt * (d < 0.25 ? 1 : 0))); }
      if (now - lastSend > SEND) { lastSend = now; h.send({ s: 1, p: me.p }); }
    }
    // status line
    const oppName = opp?.name ?? '';
    info.textContent = ph === 0 ? 'Waiting for a player at ' + (h.side === 0 ? 'P2' : 'P1') + '...' : ph === 1 ? 'vs ' + oppName + ' · get ready!' : ph === 3 ? (sc[h.side] >= WIN ? 'YOU WIN! ' : oppName + ' wins. ') + sc[0] + ' - ' + sc[1] : 'vs ' + oppName + ' · first to ' + WIN;
    draw(now);
    raf = requestAnimationFrame(step);
  };
  const draw = (now: number) => {
    const pd = PX.dim, pe = PX.emit; PX.dim = 0; PX.emit = false;
    withCtx(g, () => {
      r(0, 0, W, H, [6, 8, 14]); for (let y = 2; y < H; y += 8) r(W / 2 - 1, y, 2, 4, [50, 60, 80]);
      const pl = h.side === 0 ? me.p : them.p, pr = h.side === 1 ? me.p : them.p;
      r(4, Math.round(pl * H - (PH * H) / 2), 3, Math.round(PH * H), K.CYAN); r(W - 7, Math.round(pr * H - (PH * H) / 2), 3, Math.round(PH * H), K.MAG);
      if (ph === 2) r(Math.round(ball.x * W) - 2, Math.round(ball.y * H) - 2, 4, 4, K.WHITE);
      txt(String(sc[0]), W / 2 - 18, 6, K.CYAN, 2); txt(String(sc[1]), W / 2 + 10, 6, K.MAG, 2);
      if (ph === 1) { const n = String(Math.max(1, 3 - Math.floor(now - phT))); txt(n, W / 2 - tw(n, 4) / 2, H / 2 - 10, K.GOLD, 4); }
      if (ph === 0) txt('WAITING...', W / 2 - tw('WAITING...') / 2, H / 2, [150, 160, 190]);
      if (ph === 3) { const s = sc[h.side] >= WIN ? 'YOU WIN!' : 'GAME OVER'; txt(s, W / 2 - tw(s, 2) / 2, H / 2 - 6, sc[h.side] >= WIN ? K.GOLD : [255, 120, 120], 2); }
    });
    PX.dim = pd; PX.emit = pe;
  };
  m.body.append(cv, info, row(button('LEAVE', m.close, true)));
  raf = requestAnimationFrame(step);
  return {
    recv(id: string, p: PongMsg) {
      if (p.s === h.side) return;
      const opp = h.opponent(); if (!opp || opp.id !== id) return;
      them.p = p.p; them.t = performance.now() / 1000; them.id = id;
      if (h.side === 1 && p.s === 0) {
        if (p.b) { ball = { x: p.b[0], y: p.b[1], vx: p.b[2], vy: p.b[3] }; ballT = them.t; }
        if (p.sc) { if (p.sc[0] + p.sc[1] > sc[0] + sc[1]) SFX.score(); sc = p.sc; }
        if (p.ph !== undefined && p.ph !== ph) { setPh(p.ph); if (p.ph === 2) SFX.chime(); }
      }
    },
  };
}
