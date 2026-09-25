// A KART RACE, top down, in a window over the game (like Pong). You drive your own kart here and
// send it out ~12 times a second (fewer with 4 racers); the other racers' karts come in the
// same way and are drawn slightly extrapolated; CPU karts come from the clock (game/kart.ts).
// Keys: ↑/W gas, ↓/S brake, ←→/AD steer, SPACE (or SHIFT) to drift: hold it through a turn to
// charge a mini-turbo (blue, then orange sparks) and let go to fire it. Touch: on-screen buttons
// (the gas is held for you).

import { BODY, K, CONFETTI, type RGB } from '../engine/palette';
import { PX, mk, r, disc, txt, tw, withCtx, M, shade, txtOutlined, line } from '../engine/pixel';
import { h1 } from '../engine/math';
import { CL, HALF, LAPS, PADS, TRACK_H, TRACK_W, CPU_NAMES, MAX_RACERS, RACE_MAX_S, cpuAt, kartDist, newKart, ordinal, raceTime, stepKart, type Kart, type KartInput } from '../game/kart';
import type { KartMsg, RaceState } from '../net/transport';
import { SFX } from '../audio/sfx';
import { button, openModal, row } from './modal';

const VW = 320, VH = 180;
export interface RaceHooks {
  selfId: string; myName: string; myCol: number;
  /** The race (room state 'race'), live. */
  race(): RaceState | null;
  send(k: KartMsg): void;
  /** Ask the host to put you on the grid (you're not in race().ids yet). */
  join(r: RaceState): void;
  /** You crossed the line: your place among everyone (CPUs too), your time and best lap (ms). */
  finished(place: number, ms: number, best: number): void;
  /** Start another race (after the results). */
  again(): void;
  onClose(): void;
}
export interface RaceHandle { recv(id: string, k: KartMsg): void }

// ---------- the track, baked once ----------
let TRACK: HTMLCanvasElement | null = null, MINI: HTMLCanvasElement | null = null;
const GRASS: RGB = [74, 150, 70], GRASS2: RGB = [66, 138, 62], ASPH: RGB = [84, 86, 96], CURB_R: RGB = [214, 50, 50], CURB_W: RGB = [236, 236, 236];
function bake(): void {
  TRACK = mk(TRACK_W, TRACK_H);
  withCtx(TRACK.getContext('2d')!, () => {
    PX.dim = 0; PX.emit = false; PX.fl = 0;
    for (let y = 0; y < TRACK_H; y += 24) r(0, y, TRACK_W, 24, (y / 24) % 2 ? GRASS : GRASS2); // mowed stripes
    for (let i = 0; i < 900; i++) r(Math.floor(h1(i * 2.3) * TRACK_W), Math.floor(h1(i * 5.9) * TRACK_H), 1, 2, [96, 176, 84]);
    // run-off sand on the outside of the tight corners
    for (const f of [0.14, 0.4, 0.62, 0.76]) { const p = CL[Math.floor(CL.length * f)]; disc(Math.round(p.x), Math.round(p.y), HALF + 22, [214, 196, 150]); }
    // curbs (red / white stripes), then the tarmac over them
    CL.forEach((p, i) => disc(Math.round(p.x), Math.round(p.y), HALF + 4, Math.floor(i / 3) % 2 ? CURB_R : CURB_W));
    CL.forEach((p) => disc(Math.round(p.x), Math.round(p.y), HALF, ASPH));
    CL.forEach((p, i) => { if (i % 7 === 0) r(Math.round(p.x) + ((i * 13) % 20) - 10, Math.round(p.y) + ((i * 7) % 20) - 10, 2, 1, [96, 98, 108]); });
    // dashed centre line
    CL.forEach((p, i) => { if (Math.floor(i / 3) % 3 === 0) r(Math.round(p.x), Math.round(p.y), 2, 2, [200, 200, 190]); });
    // the start / finish line: a chequered band across the track at index 0
    const s = CL[0];
    for (let k = -HALF; k < HALF; k += 4) for (let j = 0; j < 3; j++) { const x = s.x - s.ty * k + s.tx * (j * 4 - 6), y = s.y + s.tx * k + s.ty * (j * 4 - 6); r(Math.round(x), Math.round(y), 4, 4, ((k / 4 + j) & 1) ? K.WHITE : [20, 20, 24]); }
    // grid boxes
    for (let g = 0; g < MAX_RACERS; g++) { const i = (CL.length - 5 - Math.floor(g / 2) * 6 + CL.length) % CL.length, p = CL[i], side = g % 2 ? 1 : -1, x = p.x - p.ty * side * 13, y = p.y + p.tx * side * 13; for (let k = -5; k <= 5; k++) r(Math.round(x - p.ty * k + p.tx * 6), Math.round(y + p.tx * k + p.ty * 6), 1, 1, K.WHITE); }
    // boost pads: yellow chevrons
    for (const [i0, i1] of PADS) for (let i = i0; i <= i1; i++) { const p = CL[i]; for (let k = -12; k <= 12; k += 1) { const w = Math.abs(k); const x = p.x - p.ty * k - p.tx * (w * 0.4), y = p.y + p.tx * k - p.ty * (w * 0.4); if ((i - i0) % 2 === 0) r(Math.round(x), Math.round(y), 2, 2, [255, 214, 60]); } }
    // trees and tyre stacks around the outside (never on the track)
    for (let i = 0; i < 140; i++) {
      const x = 20 + Math.floor(h1(i * 7.7) * (TRACK_W - 40)), y = 20 + Math.floor(h1(i * 3.1 + 2) * (TRACK_H - 40));
      if (CL.some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 < (HALF + 30) ** 2)) continue;
      if (i % 5 === 0) { for (let k = 0; k < 3; k++) { disc(x + k * 7, y, 3, [30, 30, 36]); disc(x + k * 7, y, 1, [70, 70, 80]); } continue; }
      disc(x + 2, y + 3, 9, [40, 90, 44]); disc(x, y, 9, [48, 120, 56]); disc(x - 3, y - 3, 4, [80, 160, 80]);
    }
    // the grandstand by the start straight, with a crowd
    r(22, 280, 44, 120, [120, 120, 136]); for (let y = 284; y < 396; y += 6) for (let x = 26; x < 62; x += 4) r(x, y, 3, 3, CONFETTI[Math.floor(h1(x * 3 + y) * CONFETTI.length)]);
  });
  MINI = mk(104, 72);
  withCtx(MINI.getContext('2d')!, () => { r(0, 0, 104, 72, [20, 30, 24]); CL.forEach((p, i) => { if (i % 2 === 0) r(Math.round(p.x / 10), Math.round(p.y / 10), 2, 2, [150, 160, 170]); }); r(Math.round(CL[0].x / 10) - 1, Math.round(CL[0].y / 10), 4, 1, K.WHITE); });
}

// ---------- kart sprites: drawn facing right, rotated by nearest-neighbour into 32 headings ----------
const SPR = new Map<string, HTMLCanvasElement>();
function kartSprite(col: RGB, ai: number): HTMLCanvasElement {
  const key = col.join(',') + ':' + ai; let c = SPR.get(key); if (c) return c;
  const base = mk(16, 16);
  withCtx(base.getContext('2d')!, () => {
    PX.dim = 0; PX.emit = false; PX.fl = 0;
    for (const [x, y] of [[3, 3], [10, 3], [3, 11], [10, 11]]) r(x, y, 4, 2, [24, 24, 28]); // tyres
    r(2, 5, 12, 6, col); r(2, 5, 12, 1, M(col, [255, 255, 255], 0.35)); r(2, 10, 12, 1, shade(col, 0.6)); // body
    r(13, 6, 2, 4, shade(col, 0.7)); r(1, 6, 1, 4, [40, 40, 46]); // nose, rear bumper
    disc(7, 8, 2, M(col, [255, 255, 255], 0.55)); r(6, 7, 2, 1, [30, 30, 40]); // driver's helmet + visor
  });
  c = mk(16, 16);
  const src = base.getContext('2d')!.getImageData(0, 0, 16, 16), dst = c.getContext('2d')!.createImageData(16, 16), an = -(ai / 32) * Math.PI * 2, ca = Math.cos(an), sa = Math.sin(an);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = x - 7.5, dy = y - 7.5, sx = Math.round(dx * ca - dy * sa + 7.5), sy = Math.round(dx * sa + dy * ca + 7.5);
    if (sx < 0 || sy < 0 || sx > 15 || sy > 15) continue;
    const si = (sy * 16 + sx) * 4, di = (y * 16 + x) * 4; for (let k = 0; k < 4; k++) dst.data[di + k] = src.data[si + k];
  }
  c.getContext('2d')!.putImageData(dst, 0, 0); SPR.set(key, c); return c;
}
const colOf = (i: number): RGB => BODY[i % BODY.length].c;
const CPU_COLS: RGB[] = [[230, 230, 236], [60, 60, 70], [240, 150, 40], [150, 90, 200]];

interface Remote { k: KartMsg; t: number; x: number; y: number }
interface Entry { id: string; name: string; col: RGB; x: number; y: number; a: number; dist: number; fin: number; best: number; me: boolean; cpu: boolean; boost: boolean; drift: boolean }

export function openRace(h: RaceHooks): RaceHandle {
  if (!TRACK) bake();
  const S = Math.max(1, Math.min(4, Math.floor(Math.min((innerWidth - 40) / VW, (innerHeight - 250) / VH))));
  const cv = mk(VW, VH); cv.style.width = Math.min(VW * S, innerWidth - 24) + 'px'; cv.style.imageRendering = 'pixelated'; cv.style.touchAction = 'none';
  const g = cv.getContext('2d')!;
  const info = document.createElement('div'); Object.assign(info.style, { fontFamily: "'VT323', monospace", fontSize: '19px', color: '#9FEFFF', minHeight: '22px', textAlign: 'center' });
  const touch = matchMedia('(pointer: coarse)').matches;
  info.textContent = touch ? 'Gas is automatic · ◀ ▶ steer · DRIFT through turns, let go for a turbo' : '↑/W gas · ↓/S brake · ←→ steer · hold SPACE through a turn to drift, let go for a turbo';
  const keys = new Set<string>();
  const kd = (e: KeyboardEvent) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' ', 'Shift'].includes(k)) { e.preventDefault(); e.stopPropagation(); keys.add(k); } };
  const ku = (e: KeyboardEvent) => { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); };
  addEventListener('keydown', kd, true); addEventListener('keyup', ku, true);
  let raf = 0;
  const m = openModal('KART RACE', () => { cancelAnimationFrame(raf); removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); h.onClose(); });
  const hold = (label: string, k: string) => { const b = button(label, () => {}); b.classList.add('hold'); b.addEventListener('pointerdown', (e) => { e.preventDefault(); keys.add(k); }); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => keys.delete(k)); return b; };
  const againBtn = button('RACE AGAIN', () => h.again()); againBtn.style.display = 'none';
  m.body.append(cv, info, ...(touch ? [row(hold('◀', 'ArrowLeft'), hold('DRIFT', ' '), hold('▶', 'ArrowRight'), hold('BRAKE', 'ArrowDown'))] : []), row(againBtn, button('LEAVE', m.close, true)));

  const remotes = new Map<string, Remote>();
  let kart: Kart | null = null, raceKey = 0, slot = -1, last = performance.now(), lastSend = 0, joinAsk = 0, reported = false, lastBeep = 99;
  const sparks: { x: number; y: number; vx: number; vy: number; t: number; c: RGB }[] = [];
  let camX = CL[0].x, camY = CL[0].y;

  const input = (): KartInput => ({
    gas: touch ? !keys.has('ArrowDown') : keys.has('ArrowUp') || keys.has('w'),
    brake: keys.has('ArrowDown') || keys.has('s'),
    left: keys.has('ArrowLeft') || keys.has('a'), right: keys.has('ArrowRight') || keys.has('d'),
    drift: keys.has(' ') || keys.has('Shift'),
  });
  /** Everyone in the race, where they are now. */
  const entries = (rc: RaceState, t: number): Entry[] => {
    const out: Entry[] = [], now = performance.now() / 1000;
    rc.ids.forEach((id, i) => {
      if (id === h.selfId) { if (kart) out.push({ id, name: h.myName, col: colOf(h.myCol), x: kart.x, y: kart.y, a: kart.a, dist: kartDist(kart), fin: kart.fin, best: kart.best, me: true, cpu: false, boost: kart.boost > 0, drift: kart.drift }); return; }
      const rm = remotes.get(id);
      if (!rm) { const gs = newKart(i); out.push({ id, name: rc.names[i], col: colOf(rc.cols[i]), x: gs.x, y: gs.y, a: gs.a, dist: -0.05, fin: 0, best: 0, me: false, cpu: false, boost: false, drift: false }); return; }
      const dt = Math.min(0.25, now - rm.t), k = rm.k, px = k.x + Math.cos(k.a) * k.v * dt, py = k.y + Math.sin(k.a) * k.v * dt;
      rm.x += (px - rm.x) * 0.35; rm.y += (py - rm.y) * 0.35;
      out.push({ id, name: rc.names[i], col: colOf(rc.cols[i]), x: rm.x, y: rm.y, a: k.a, dist: k.c ? k.lap + k.g / CL.length : k.g / CL.length - 1, fin: k.fin, best: k.best, me: false, cpu: false, boost: !!k.b, drift: !!k.d });
    });
    for (let s = rc.ids.length; s < MAX_RACERS; s++) { const c = cpuAt(rc.seed, s, t), n = s - rc.ids.length; out.push({ id: 'cpu' + s, name: CPU_NAMES[n], col: CPU_COLS[n], x: c.x, y: c.y, a: c.a, dist: c.dist, fin: c.fin, best: 0, me: false, cpu: true, boost: false, drift: false }); }
    return out;
  };
  const standings = (es: Entry[]) => [...es].sort((a, b) => (a.fin && b.fin ? a.fin - b.fin : a.fin ? -1 : b.fin ? 1 : b.dist - a.dist));

  const step = () => {
    raf = requestAnimationFrame(step);
    const nowP = performance.now(), dt = Math.min(0.05, (nowP - last) / 1000); last = nowP;
    const rc = h.race();
    if (!rc) { draw(null, 0, []); return; }
    const t = Date.now() - rc.t0;
    if (rc.t0 !== raceKey) { raceKey = rc.t0; kart = null; slot = -1; reported = false; remotes.clear(); againBtn.style.display = 'none'; }
    slot = rc.ids.indexOf(h.selfId);
    if (slot < 0 && t < 0 && nowP - joinAsk > 1000) { joinAsk = nowP; h.join(rc); }
    if (slot >= 0 && !kart) kart = newKart(slot);
    const es = entries(rc, t);
    if (kart) {
      const ev = stepKart(kart, input(), dt, t, es.filter((e) => !e.me).map((e) => ({ x: e.x, y: e.y })));
      if (ev.boost) { SFX.zap(); }
      if (ev.lap && !ev.finished) { SFX.chime(); }
      if (ev.finished) SFX.score();
      if (kart.drift) for (let k = 0; k < 2; k++) sparks.push({ x: kart.x - Math.cos(kart.a) * 6, y: kart.y - Math.sin(kart.a) * 6, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, t: 0.3, c: kart.charge > 1.2 ? [255, 150, 40] : kart.charge > 0.55 ? [90, 200, 255] : [230, 230, 230] });
      if (kart.boost > 0) sparks.push({ x: kart.x - Math.cos(kart.a) * 8, y: kart.y - Math.sin(kart.a) * 8, vx: -Math.cos(kart.a) * 30, vy: -Math.sin(kart.a) * 30, t: 0.25, c: Math.random() < 0.5 ? [255, 200, 60] : [255, 110, 40] });
      // send: often while racing, now and then on the grid and after the finish
      const humans = rc.ids.length, hz = t < 0 || kart.fin ? 2 : humans <= 2 ? 12 : humans === 3 ? 8 : 6;
      if (nowP - lastSend > 1000 / hz) { lastSend = nowP; h.send({ r: rc.t0, x: Math.round(kart.x * 10) / 10, y: Math.round(kart.y * 10) / 10, a: Math.round(kart.md * 100) / 100, v: Math.round(kart.v), lap: kart.lap, g: kart.seg, c: kart.crossed ? 1 : 0, fin: Math.round(kart.fin), best: Math.round(kart.best), b: kart.boost > 0 ? 1 : 0, d: kart.drift ? 1 : 0 }); }
      if (kart.fin && !reported) { reported = true; const place = standings(es).findIndex((e) => e.me) + 1; h.finished(place, kart.fin, kart.best); }
    }
    // the start lights beep
    if (t < 0 && t > -3500) { const n = Math.ceil(-t / 1000); if (n !== lastBeep) { lastBeep = n; SFX.blip(); } } else if (t >= 0 && lastBeep !== 0) { lastBeep = 0; SFX.chime(); }
    for (let k = sparks.length - 1; k >= 0; k--) { const s = sparks[k]; s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.t <= 0) sparks.splice(k, 1); }
    const over = t > RACE_MAX_S * 1000 || (!!kart?.fin && es.filter((e) => !e.cpu).every((e) => e.fin));
    if (over || kart?.fin) againBtn.style.display = over ? '' : 'none';
    // the camera: ahead of your kart (or on the leader if you're watching)
    const focus = es.find((e) => e.me) ?? standings(es)[0];
    if (focus) { const tx = focus.x + (kart ? Math.cos(kart.md) * kart.v * 0.35 : 0), ty = focus.y + (kart ? Math.sin(kart.md) * kart.v * 0.35 : 0); camX += (tx - camX) * Math.min(1, dt * 5); camY += (ty - camY) * Math.min(1, dt * 5); }
    draw(rc, t, es);
  };
  const draw = (rc: RaceState | null, t: number, es: Entry[]) => {
    const pd = PX.dim, pe = PX.emit; PX.dim = 0; PX.emit = false;
    withCtx(g, () => {
      g.imageSmoothingEnabled = false;
      const ox = Math.round(Math.max(0, Math.min(TRACK_W - VW, camX - VW / 2))), oy = Math.round(Math.max(0, Math.min(TRACK_H - VH, camY - VH / 2)));
      g.drawImage(TRACK!, ox, oy, VW, VH, 0, 0, VW, VH);
      if (!rc) { txtOutlined('WAITING FOR A RACE...', VW / 2 - tw('WAITING FOR A RACE...') / 2, VH / 2, K.WHITE); return; }
      for (const s of sparks) r(Math.round(s.x - ox), Math.round(s.y - oy), 2, 2, s.c);
      const order = standings(es);
      for (const e of [...es].sort((a, b) => a.y - b.y)) {
        const sx = Math.round(e.x - ox), sy = Math.round(e.y - oy); if (sx < -20 || sy < -20 || sx > VW + 20 || sy > VH + 20) continue;
        r(sx - 6, sy + 3, 12, 3, [30, 50, 30]); // shadow
        const ai = ((Math.round(e.a / (Math.PI * 2) * 32) % 32) + 32) % 32; g.drawImage(kartSprite(e.col, ai), sx - 8, sy - 8);
        const pos = order.indexOf(e) + 1, label = (e.me ? 'YOU' : e.name.slice(0, 8)) + ' ' + pos;
        txtOutlined(label, sx - tw(label) / 2, sy - 16, e.me ? [255, 214, 120] : e.cpu ? [200, 200, 210] : K.WHITE);
      }
      // the HUD
      const me = es.find((e) => e.me), myPos = me ? order.indexOf(me) + 1 : 0;
      r(0, 0, VW, 13, [10, 12, 18]);
      if (kart) { txt('LAP ' + Math.min(LAPS, kart.lap + 1) + ' OF ' + LAPS, 4, 4, K.WHITE); txt(ordinal(myPos), 68, 4, myPos === 1 ? K.GOLD : [124, 242, 156]); txt(raceTime(kart.fin || Math.max(0, t)), 104, 4, [200, 210, 230]); if (kart.best) txt('BEST ' + raceTime(kart.best), 156, 4, [150, 160, 180]); }
      else txt(rc.ids.includes(h.selfId) ? '' : 'JOINING...', 4, 4, [200, 210, 230]);
      if (kart && kart.charge > 0.55) { const c = kart.charge > 1.2 ? [255, 150, 40] as RGB : [90, 200, 255] as RGB; txt('TURBO', 230, 4, c); }
      // the minimap
      g.drawImage(MINI!, VW - 106, VH - 74); r(VW - 106, VH - 74, 104, 1, [60, 70, 80]);
      for (const e of es) r(VW - 106 + Math.round(e.x / 10) - 1, VH - 74 + Math.round(e.y / 10) - 1, 3, 3, e.me ? K.GOLD : e.cpu ? [180, 180, 190] : e.col);
      // countdown: five lights, then GO
      if (t < 0) {
        const n = Math.ceil(-t / 1000);
        if (n > 3) { const s = 'RACE STARTS IN ' + n; txtOutlined(s, VW / 2 - tw(s, 2) / 2, 40, K.WHITE, 2); const j = rc.ids.length + ' RACER' + (rc.ids.length === 1 ? '' : 'S') + ' + ' + (MAX_RACERS - rc.ids.length) + ' CPU'; txtOutlined(j, VW / 2 - tw(j) / 2, 62, [180, 220, 255]); }
        else { r(VW / 2 - 40, 34, 80, 22, [20, 20, 26]); for (let k = 0; k < 3; k++) disc(VW / 2 - 24 + k * 24, 45, 7, k >= n - 0 ? [230, 50, 50] : [60, 30, 30]); }
      } else if (t < 1200) txtOutlined('GO!', VW / 2 - tw('GO!', 4) / 2, 36, [124, 242, 156], 4);
      if (kart?.fin) {
        // results
        r(VW / 2 - 90, 24, 180, 22 + order.length * 11, [14, 16, 26]); r(VW / 2 - 90, 24, 180, 1, K.GOLD);
        const head = myPos === 1 ? 'YOU WIN!' : 'FINISHED ' + ordinal(myPos); txt(head, VW / 2 - tw(head, 2) / 2, 29, myPos === 1 ? K.GOLD : K.WHITE, 2);
        order.forEach((e, i) => { const y = 44 + i * 11, c: RGB = e.me ? [255, 214, 120] : [220, 226, 240]; txt(ordinal(i + 1), VW / 2 - 84, y, c); txt(e.name.slice(0, 10), VW / 2 - 60, y, c); const tm = e.fin ? raceTime(e.fin) : 'RACING'; txt(tm, VW / 2 + 84 - tw(tm), y, c); });
      } else if (kart && kart.lap === LAPS - 1 && kart.crossed && t > 0 && (t - kart.lapT0) < 2500 && kart.lap > 0) txtOutlined('FINAL LAP!', VW / 2 - tw('FINAL LAP!', 2) / 2, 40, K.GOLD, 2);
      if (kart && t > 0 && !kart.fin && Math.hypot(kart.x - CL[kart.seg].x, kart.y - CL[kart.seg].y) > HALF + 20) txtOutlined('BACK TO THE TRACK!', VW / 2 - tw('BACK TO THE TRACK!') / 2, VH - 20, [255, 120, 120]);
      line(0, 13, VW, 13, [40, 44, 60]);
    });
    PX.dim = pd; PX.emit = pe;
  };
  raf = requestAnimationFrame(step);
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('debug')) (window as unknown as Record<string, unknown>).__race = { kart: () => kart, CL }; // test autopilot
  return { recv(id, k) { if (k.j || k.r !== raceKey) return; const rm = remotes.get(id); if (rm) { rm.k = k; rm.t = performance.now() / 1000; } else remotes.set(id, { k, t: performance.now() / 1000, x: k.x, y: k.y }); } };
}
