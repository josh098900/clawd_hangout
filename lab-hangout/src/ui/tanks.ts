// TANK DUEL for two, at the Arcade (the cabinet next to the jukebox). Stand at P1 or P2. Drive
// your tank round a little arena with cover and fire shells that bounce once off the walls.
// First to 5 hits wins. Nobody at the other side? PLAY THE CPU.
//
// Like Pong: each browser drives its own tank and its own shells and sends them ~15 times a
// second. The SHOOTER decides hits (against where it sees the other tank), and counts its own
// score; the tank that got hit notices the other side's hit counter go up, blows up and respawns.
// P1 runs the match phases (waiting, countdown, play, over). Keys: W/S or ↑/↓ drive, A/D or ←/→
// turn, SPACE or F fire. Touch: the buttons.

import { K, type RGB } from '../engine/palette';
import { r, txt, tw, disc, M, bake } from '../engine/pixel';
import type { TankMsg } from '../net/transport';
import { SFX } from '../audio/sfx';
import { button, heldKeys, openModal, row } from './modal';

export const TW = 160, TH = 100, TANK_WIN = 5;
/** The arena's cover blocks [x0, y0, x1, y1] (walls round the edge too). */
export const BLOCKS: [number, number, number, number][] = [[74, 38, 86, 62], [34, 16, 42, 42], [118, 58, 126, 84], [52, 74, 70, 80], [90, 20, 108, 26]];
const SPAWN = [{ x: 16, y: 50, a: 0 }, { x: 144, y: 50, a: Math.PI }];
/** Where you come back after being hit: your side's corners and middle, whichever is furthest from the other tank. */
const RESPAWN = [[{ x: 16, y: 50, a: 0 }, { x: 16, y: 12, a: 0 }, { x: 16, y: 88, a: 0 }], [{ x: 144, y: 50, a: Math.PI }, { x: 144, y: 12, a: Math.PI }, { x: 144, y: 88, a: Math.PI }]];
const SEND = 1 / 15, SPEED = 30, TURN = 2.6, SHELL = 62, RELOAD = 0.55, R = 4;
export const TANK_COLS: RGB[] = [K.CYAN, K.MAG];

export interface TankHooks {
  side: 0 | 1; myName: string;
  opponent(): { id: string; name: string } | null;
  send(m: TankMsg): void;
  /** You won a match (a person or the CPU). */
  won(vsCpu: boolean): void;
  onClose(): void;
}
export interface TankHandle { recv(id: string, m: TankMsg): void }
interface Tank { x: number; y: number; a: number; inv: number; dead: number }
interface Shell { x: number; y: number; vx: number; vy: number; b: number; t: number }

export const solid = (x: number, y: number, pad = 0): boolean => x < 3 + pad || y < 3 + pad || x > TW - 3 - pad || y > TH - 3 - pad || BLOCKS.some(([x0, y0, x1, y1]) => x > x0 - pad && x < x1 + pad && y > y0 - pad && y < y1 + pad);
/** Move a shell one step, bouncing off whatever it hits. Returns false when it's done (second hit). */
function moveShell(s: Shell, dt: number): boolean {
  s.t += dt;
  const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
  if (!solid(nx, ny)) { s.x = nx; s.y = ny; return s.t < 3.5; }
  if (s.b >= 1) return false;
  s.b++;
  if (solid(nx, s.y)) s.vx = -s.vx; else s.vy = -s.vy;
  if (solid(s.x + s.vx * dt, s.y + s.vy * dt)) { s.vx = -s.vx; s.vy = -s.vy; }
  SFX.step();
  return true;
}
/** Drive a tank (collides with the walls, one axis at a time). */
function drive(t: Tank, fwd: number, turn: number, dt: number): void {
  t.a += turn * TURN * dt;
  const nx = t.x + Math.cos(t.a) * fwd * SPEED * dt, ny = t.y + Math.sin(t.a) * fwd * SPEED * dt;
  if (!solid(nx, t.y, R)) t.x = nx; if (!solid(t.x, ny, R)) t.y = ny;
}
/** A tank: tracks, body, turret, barrel (pointing along a). */
export function drawTank(x: number, y: number, a: number, col: RGB, blink = false): void {
  if (blink) return;
  const c = Math.cos(a), s = Math.sin(a), px = (u: number, v: number, cc: RGB) => r(Math.round(x + u * c - v * s), Math.round(y + u * s + v * c), 1, 1, cc);
  for (let u = -4; u <= 4; u++) for (let v = -4; v <= 4; v++) px(u, v, Math.abs(v) >= 3 ? [40, 40, 50] : M(col, [0, 0, 0], 0.25));
  for (let u = -2; u <= 2; u++) for (let v = -2; v <= 2; v++) if (u * u + v * v <= 5) px(u, v, col);
  for (let u = 2; u <= 7; u++) px(u, 0, [220, 220, 230]);
}

export function openTanks(h: TankHooks): TankHandle {
  const S = Math.max(2, Math.min(5, Math.floor(Math.min((innerWidth - 60) / TW, (innerHeight - 280) / TH))));
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH; cv.style.width = (innerWidth < 560 ? innerWidth - 24 : Math.min(TW * S, innerWidth - 24)) + 'px'; cv.style.imageRendering = 'pixelated'; cv.style.touchAction = 'none';
  const g = cv.getContext('2d')!;
  const info = document.createElement('div'); Object.assign(info.style, { fontFamily: "'VT323', monospace", fontSize: '20px', color: '#9FEFFF', minHeight: '22px', textAlign: 'center' });
  const input = heldKeys(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' ', 'f']), keys = input.held, hold = input.hold;
  let raf = 0;
  const m = openModal('TANK DUEL', () => { cancelAnimationFrame(raf); input.stop(); h.onClose(); });
  const cpuBtn = button('PLAY THE CPU', () => { cpu = { x: SPAWN[1 - h.side].x, y: SPAWN[1 - h.side].y, a: SPAWN[1 - h.side].a, inv: 0, dead: 0 }; cpuSc = 0; cpuShells = []; setPh(1); cpuBtn.style.display = 'none'; });
  const touch = matchMedia('(pointer: coarse)').matches;
  m.body.append(cv, info, ...(touch ? [row(hold('◀', 'ArrowLeft'), hold('▲', 'ArrowUp'), hold('▼', 'ArrowDown'), hold('▶', 'ArrowRight'), hold('FIRE', ' '))] : []), row(cpuBtn, button('LEAVE', m.close, true)));

  const me: Tank = { ...SPAWN[h.side], inv: 0, dead: 0 };
  let shells: Shell[] = [], sc = 0, hits = 0, cool = 0;
  // the other side, as last heard (or the CPU)
  let them: { x: number; y: number; a: number; t: number; sh: number[]; sc: number; hit: number; inv: boolean } | null = null;
  let cpu: Tank | null = null, cpuSc = 0, cpuShells: Shell[] = [], cpuCool = 0, cpuGoal = { x: 80, y: 50 }, cpuGoalT = 0;
  let ph = 0, phT = performance.now() / 1000, last = performance.now() / 1000, lastSend = 0, waitT = performance.now() / 1000, reported = false;
  const booms: { x: number; y: number; t: number }[] = [];
  const setPh = (p: number) => { ph = p; phT = performance.now() / 1000; if (p === 1) { Object.assign(me, SPAWN[h.side], { inv: 0, dead: 0 }); shells = []; sc = 0; hits = 0; reported = false; if (cpu) { Object.assign(cpu, SPAWN[1 - h.side], { inv: 0, dead: 0 }); cpuSc = 0; cpuShells = []; } } };
  const blowUp = (t: Tank) => { t.dead = performance.now() / 1000; booms.push({ x: t.x, y: t.y, t: t.dead }); SFX.boom(); };
  const fire = (t: Tank, list: Shell[]) => { list.push({ x: t.x + Math.cos(t.a) * 7, y: t.y + Math.sin(t.a) * 7, vx: Math.cos(t.a) * SHELL, vy: Math.sin(t.a) * SHELL, b: 0, t: 0 }); SFX.zap(); };
  const respawn = (t: Tank, side: number, now: number, from: { x: number; y: number } | null) => {
    if (!t.dead || now - t.dead < 1.2) return;
    const spots = RESPAWN[side], best = from ? spots.reduce((p, q) => (Math.hypot(q.x - from.x, q.y - from.y) > Math.hypot(p.x - from.x, p.y - from.y) ? q : p)) : spots[0];
    Object.assign(t, best); t.dead = 0; t.inv = now + 1.5;
  };

  const step = () => {
    raf = requestAnimationFrame(step);
    const now = performance.now() / 1000, dt = Math.min(0.05, now - last); last = now;
    const opp = cpu ? { id: 'cpu', name: 'CPU' } : h.opponent();
    const oppLive = !!cpu || (!!them && now - them.t < 1.5);
    // phases: P1 (or whoever's playing the CPU) runs them; P2 follows P1's word
    const runs = h.side === 0 || !!cpu;
    if (runs) {
      if (!opp || !oppLive) { if (ph !== 0) setPh(0); }
      else if (ph === 0) { setPh(1); SFX.blip(); }
      else if (ph === 1 && now - phT > 3) { setPh(2); SFX.chime(); }
      else if (ph === 2 && (sc >= TANK_WIN || (cpu ? cpuSc : them?.sc ?? 0) >= TANK_WIN)) setPh(3);
      else if (ph === 3 && now - phT > 5) setPh(opp ? 1 : 0);
    }
    if (ph === 0 && !cpu && now - waitT > 2) cpuBtn.style.display = ''; else if (ph !== 0) { cpuBtn.style.display = 'none'; waitT = now; }
    if (ph === 3 && !reported) { reported = true; if (sc >= TANK_WIN) { h.won(!!cpu); SFX.score(); } else SFX.hurt(); }
    // me
    respawn(me, h.side, now, cpu ?? them);
    if (ph === 2 && !me.dead) {
      drive(me, (keys.has('ArrowUp') || keys.has('w') ? 1 : 0) - (keys.has('ArrowDown') || keys.has('s') ? 0.7 : 0), (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0), dt);
      cool -= dt;
      if ((keys.has(' ') || keys.has('f')) && cool <= 0 && shells.length < 2) { fire(me, shells); cool = RELOAD; }
    }
    // my shells: bounce, and hit the other tank (I decide my own hits)
    const target = cpu ?? (them && oppLive ? { x: them.x, y: them.y, inv: them.inv ? 1 : 0, dead: 0 } : null);
    shells = shells.filter((s) => {
      if (!moveShell(s, dt)) return false;
      if (target && ph === 2 && !target.dead && (target.inv ?? 0) < now && !(cpu ? false : them?.inv) && Math.hypot(s.x - target.x, s.y - target.y) < 5) {
        sc++; hits++; if (cpu) blowUp(cpu); else { booms.push({ x: target.x, y: target.y, t: now }); SFX.boom(); }
        return false;
      }
      return true;
    });
    // the CPU: pick a spot, turn towards you, fire when it's lined up
    if (cpu && ph === 2) {
      respawn(cpu, 1 - h.side, now, me);
      if (!cpu.dead) {
        if (now > cpuGoalT) { cpuGoalT = now + 2 + Math.random() * 2; for (let k = 0; k < 20; k++) { const x = 12 + Math.random() * (TW - 24), y = 10 + Math.random() * (TH - 20); if (!solid(x, y, R + 2)) { cpuGoal = { x, y }; break; } } }
        const toMe = Math.atan2(me.y - cpu.y, me.x - cpu.x), toGoal = Math.atan2(cpuGoal.y - cpu.y, cpuGoal.x - cpu.x), far = Math.hypot(cpuGoal.x - cpu.x, cpuGoal.y - cpu.y) > 6;
        const want = far && Math.sin(now * 0.7) > -0.3 ? toGoal : toMe, d = Math.atan2(Math.sin(want - cpu.a), Math.cos(want - cpu.a));
        drive(cpu, far && Math.abs(d) < 0.8 ? 0.8 : 0, Math.max(-1, Math.min(1, d * 3)) * 0.85, dt);
        cpuCool -= dt; const aim = Math.atan2(Math.sin(toMe - cpu.a), Math.cos(toMe - cpu.a));
        if (cpuCool <= 0 && Math.abs(aim) < 0.12 && cpuShells.length < 2 && !me.dead) { fire(cpu, cpuShells); cpuCool = RELOAD * 1.8; }
      }
      cpuShells = cpuShells.filter((s) => { if (!moveShell(s, dt)) return false; if (!me.dead && me.inv < now && Math.hypot(s.x - me.x, s.y - me.y) < 5) { cpuSc++; blowUp(me); return false; } return true; });
    }
    // send
    if (now - lastSend > SEND) { lastSend = now; h.send({ s: h.side, x: me.x, y: me.y, a: me.a, sh: shells.flatMap((s) => [s.x, s.y, s.vx, s.vy]).map((v) => Math.round(v * 10) / 10), sc, hit: hits, inv: me.inv > now || !!me.dead ? 1 : 0, ...(runs && h.side === 0 && !cpu ? { ph } : {}), ...(cpu ? { o: [cpu.x, cpu.y, cpu.a], osc: cpuSc } : {}) }); }
    // status
    const oname = opp?.name ?? '', osc = cpu ? cpuSc : them?.sc ?? 0;
    info.textContent = ph === 0 ? 'Waiting for someone at ' + (h.side === 0 ? 'P2' : 'P1') + '...' : ph === 1 ? 'vs ' + oname + ' · get ready!' : ph === 3 ? (sc >= TANK_WIN ? 'YOU WIN! ' : oname + ' wins. ') + sc + ' - ' + osc : 'vs ' + oname + ' · first to ' + TANK_WIN + ' · ' + (touch ? 'use the buttons' : 'WASD / arrows, SPACE fires');
    draw(now, osc);
  };
  const draw = (now: number, osc: number) => {
    bake(g, () => {
      r(0, 0, TW, TH, [26, 30, 22]); for (let y = 0; y < TH; y += 10) for (let x = (y / 10) % 2 ? 5 : 0; x < TW; x += 10) r(x, y, 1, 1, [40, 46, 34]);
      r(0, 0, TW, 3, [90, 90, 100]); r(0, TH - 3, TW, 3, [90, 90, 100]); r(0, 0, 3, TH, [90, 90, 100]); r(TW - 3, 0, 3, TH, [90, 90, 100]);
      for (const [x0, y0, x1, y1] of BLOCKS) { r(x0, y0, x1 - x0, y1 - y0, [110, 100, 80]); r(x0, y0, x1 - x0, 1, [150, 140, 110]); r(x0, y1 - 1, x1 - x0, 1, [70, 62, 50]); }
      const myCol = TANK_COLS[h.side], thCol = TANK_COLS[1 - h.side];
      const blink = (t: { inv: number }) => t.inv > now && Math.floor(now * 10) % 2 === 0;
      if (!me.dead) drawTank(me.x, me.y, me.a, myCol, blink(me));
      if (cpu) { if (!cpu.dead) drawTank(cpu.x, cpu.y, cpu.a, thCol, blink(cpu)); }
      else if (them && now - them.t < 1.5) {
        const dt = Math.min(0.2, now - them.t);
        if (!them.inv || Math.floor(now * 10) % 2) drawTank(them.x, them.y, them.a, thCol);
        for (let k = 0; k + 3 < them.sh.length; k += 4) r(Math.round(them.sh[k] + them.sh[k + 2] * dt) - 1, Math.round(them.sh[k + 1] + them.sh[k + 3] * dt) - 1, 2, 2, M(thCol, [255, 255, 255], 0.5));
      }
      for (const s of [...shells, ...cpuShells]) r(Math.round(s.x) - 1, Math.round(s.y) - 1, 2, 2, K.WHITE);
      for (let k = booms.length - 1; k >= 0; k--) { const b = booms[k], u = now - b.t; if (u > 0.6) { booms.splice(k, 1); continue; } disc(Math.round(b.x), Math.round(b.y), Math.round(2 + u * 14), u < 0.2 ? [255, 240, 180] : u < 0.4 ? [255, 150, 60] : [90, 80, 80]); }
      const l = String(h.side === 0 ? sc : osc), rr = String(h.side === 0 ? osc : sc);
      txt(l, 8, 5, TANK_COLS[0], 2); txt(rr, TW - 8 - tw(rr, 2), 5, TANK_COLS[1], 2);
      if (ph === 1) { const n = String(Math.max(1, 3 - Math.floor(now - phT))); txt(n, TW / 2 - tw(n, 4) / 2, TH / 2 - 10, K.GOLD, 4); }
      if (ph === 0) txt('WAITING...', TW / 2 - tw('WAITING...') / 2, TH / 2 + 14, [150, 160, 190]);
      if (ph === 3) { const s2 = sc >= TANK_WIN ? 'YOU WIN!' : 'DEFEAT'; txt(s2, TW / 2 - tw(s2, 2) / 2, TH / 2 - 6, sc >= TANK_WIN ? K.GOLD : [255, 120, 120], 2); }
    });
  };
  raf = requestAnimationFrame(step);
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('debug')) (window as unknown as Record<string, unknown>).__tank = { me, opp: () => (them ? [them.x, them.y] : null), cpu: () => cpu, score: () => [sc, cpu ? cpuSc : them?.sc ?? 0], ph: () => ph }; // tests
  return {
    recv(id: string, t: TankMsg) {
      if (t.s === h.side || cpu) return;
      const opp = h.opponent(); if (!opp || opp.id !== id) return;
      const now = performance.now() / 1000;
      if (them && t.hit > them.hit && !me.dead) { blowUp(me); } // they hit me
      them = { x: t.x, y: t.y, a: t.a, t: now, sh: t.sh, sc: t.sc, hit: t.hit, inv: !!t.inv };
      if (h.side === 1 && t.ph !== undefined && t.ph !== ph) { setPh(t.ph); if (t.ph === 2) SFX.chime(); if (t.ph === 1) waitT = now; }
    },
  };
}
