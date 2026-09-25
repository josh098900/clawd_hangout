// SLOP INVADERS — the Lab's arcade cabinet, playable. A tiny 120x100 shooter drawn with the
// same pixel kit as the world: you're a critter ship, waves of slop blobs march down.
// Keys: ←/→ (A/D) move, Space/↑/W fire, Esc quits. Touch: hold the ◀ FIRE ▶ buttons.

import { K, type RGB } from '../engine/palette';
import { PX, r, txt, tw, withCtx, M } from '../engine/pixel';
import { SFX } from '../audio/sfx';
import { button, openModal, row } from './modal';

const W = 120, H = 100, PY = 90;
interface Inv { x: number; y: number; row: number; alive: boolean }
interface Shot { x: number; y: number; vy: number }
interface Boom { x: number; y: number; t: number; c: RGB }

const ROW_COL: RGB[] = [K.MAG, K.GOLD, K.CYAN];
const BLOB = [['.###.', '#.#.#', '#####', '#.#.#', '.#.#.'], ['.###.', '#.#.#', '#####', '#.#.#', '#...#']];

export function openArcade(hi: number, onEnd: (score: number) => void): void {
  const S = Math.max(2, Math.min(5, Math.floor(Math.min((innerWidth - 60) / W, (innerHeight - 220) / H))));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  cv.style.width = W * S + 'px'; cv.style.height = H * S + 'px';
  const g = cv.getContext('2d')!;
  const keys = new Set<string>();
  let px = W / 2, lives = 3, score = 0, wave = 1, dirX = 1, cool = 0, bombIn = 1.5, state: 'ready' | 'play' | 'over' = 'ready', st = 0;
  let invs: Inv[] = [], shots: Shot[] = [], bombs: Shot[] = [], booms: Boom[] = [], hurtT = -9, raf = 0, last = performance.now(), ended = false;

  const spawn = () => { invs = []; for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) invs.push({ x: 12 + i * 15, y: 14 + j * 11, row: j, alive: true }); dirX = 1; };
  spawn();
  const finish = () => { if (ended) return; ended = true; onEnd(score); };
  const m = openModal('SLOP INVADERS', () => { cancelAnimationFrame(raf); removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); removeEventListener('blur', unstick); finish(); });

  const kd = (e: KeyboardEvent) => {
    const k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'a', 'A', 'd', 'D', 'w', 'W'].includes(k)) { e.preventDefault(); e.stopPropagation(); keys.add(k.length === 1 ? k.toLowerCase() : k); }
  };
  const ku = (e: KeyboardEvent) => { keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); };
  const unstick = (): void => keys.clear();
  addEventListener('keydown', kd, true); addEventListener('keyup', ku, true); addEventListener('blur', unstick); // (switching windows mid-game: let go of every key)
  const hold = (label: string, k: string) => {
    const b = button(label, () => {}); b.classList.add('hold');
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); keys.add(k); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => keys.delete(k));
    return b;
  };
  m.body.append(cv, row(hold('◀', 'ArrowLeft'), hold('FIRE', ' '), hold('▶', 'ArrowRight'), button('QUIT', m.close, true)));

  const left = () => keys.has('ArrowLeft') || keys.has('a'), right = () => keys.has('ArrowRight') || keys.has('d');
  const fire = () => keys.has(' ') || keys.has('ArrowUp') || keys.has('w');

  function step(dt: number): void {
    st += dt;
    if (state === 'ready') { if (st > 1.2) { state = 'play'; st = 0; } return; }
    if (state === 'over') { if (st > 2.2) m.close(); return; }
    // you
    px = Math.max(5, Math.min(W - 5, px + ((right() ? 1 : 0) - (left() ? 1 : 0)) * 70 * dt));
    cool -= dt;
    if (fire() && cool <= 0 && shots.length < 2) { shots.push({ x: Math.round(px), y: PY - 5, vy: -130 }); cool = 0.28; SFX.zap(); }
    // the formation marches; faster as it thins out
    const alive = invs.filter((v) => v.alive);
    if (!alive.length) { wave++; score += 100; SFX.score(); spawn(); bombs = []; shots = []; state = 'ready'; st = 0; return; }
    const speed = 7 + (1 - alive.length / 18) * 32 + wave * 4;
    let edge = false;
    for (const v of alive) { v.x += dirX * speed * dt; if (v.x < 3 || v.x > W - 10) edge = true; }
    if (edge) { dirX = -dirX; for (const v of alive) { v.x += dirX * 2; v.y += 4; } }
    if (alive.some((v) => v.y > PY - 12)) { lives = 0; }
    // bombs from the lowest blob in a random column
    bombIn -= dt;
    if (bombIn <= 0) {
      const shooter = alive[Math.floor(Math.random() * alive.length)];
      const low = alive.filter((v) => Math.abs(v.x - shooter.x) < 4).sort((p, q) => q.y - p.y)[0];
      bombs.push({ x: Math.round(low.x + 3), y: low.y + 6, vy: 38 + wave * 5 });
      bombIn = (0.7 + Math.random() * 0.9) / (1 + wave * 0.15);
    }
    for (const s of shots) s.y += s.vy * dt;
    for (const b of bombs) b.y += b.vy * dt;
    for (const s of shots) for (const v of alive) {
      if (v.alive && s.x >= v.x - 1 && s.x <= v.x + 5 && s.y >= v.y - 1 && s.y <= v.y + 5) {
        v.alive = false; s.y = -99; score += (3 - v.row) * 10; booms.push({ x: v.x + 2, y: v.y + 2, t: 0, c: ROW_COL[v.row] }); SFX.boom();
      }
    }
    for (const b of bombs) if (b.y > PY - 5 && b.y < PY + 2 && Math.abs(b.x - px) < 4) { b.y = 999; lives--; hurtT = st; booms.push({ x: px, y: PY, t: 0, c: K.WHITE }); SFX.hurt(); }
    shots = shots.filter((s) => s.y > -4); bombs = bombs.filter((b) => b.y < H);
    for (const b of booms) b.t += dt; booms = booms.filter((b) => b.t < 0.4);
    if (lives <= 0) { state = 'over'; st = 0; }
  }

  function draw(): void {
    const pd = PX.dim, pe = PX.emit, pf = PX.fl;
    PX.dim = 0; PX.emit = false; PX.fl = 0;
    withCtx(g, () => {
      r(0, 0, W, H, [8, 10, 30]);
      for (let k = 0; k < 18; k++) r((k * 37 + Math.floor(performance.now() / 90)) % W, (k * 53) % (H - 12), 1, 1, [70, 80, 130]);
      r(0, PY + 4, W, 1, [60, 40, 110]);
      const fr = Math.floor(performance.now() / 350) % 2;
      for (const v of invs) if (v.alive) BLOB[fr].forEach((line, j) => { for (let i = 0; i < 5; i++) if (line[i] === '#') r(Math.round(v.x) + i, Math.round(v.y) + j, 1, 1, ROW_COL[v.row]); });
      for (const s of shots) r(s.x, Math.round(s.y), 1, 3, K.WHITE);
      for (const b of bombs) { r(b.x, Math.round(b.y), 1, 2, [124, 242, 156]); r(b.x + ((Math.floor(b.y / 3) % 2) ? 1 : -1), Math.round(b.y) + 2, 1, 1, [124, 242, 156]); }
      for (const b of booms) { const d = Math.round(b.t * 14); for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.4], [0, 1.4]]) r(Math.round(b.x + dx * d), Math.round(b.y + dy * d), 1, 1, M(b.c, [255, 255, 255], b.t * 2)); }
      // you: a tiny mint critter with a glowing antenna
      if (state !== 'over' && !(st - hurtT < 1 && Math.floor(st * 12) % 2)) {
        const x = Math.round(px) - 3;
        r(x + 3, PY - 5, 1, 1, [200, 255, 240]); r(x + 3, PY - 4, 1, 1, [60, 150, 130]);
        r(x + 1, PY - 3, 5, 1, [34, 197, 160]); r(x, PY - 2, 7, 3, [34, 197, 160]); r(x + 2, PY - 1, 1, 1, K.EYE); r(x + 4, PY - 1, 1, 1, K.EYE); r(x + 1, PY + 1, 2, 1, [20, 120, 100]); r(x + 4, PY + 1, 2, 1, [20, 120, 100]);
      }
      txt(String(score).padStart(5, '0'), 2, 2, K.WHITE);
      const hs = 'HI ' + String(Math.max(hi, score)).padStart(5, '0'); txt(hs, W - tw(hs) - 2, 2, K.GOLD);
      for (let i = 0; i < lives; i++) r(2 + i * 5, H - 4, 3, 2, K.RED);
      txt('W' + wave, W - 10, H - 6, [120, 130, 180]);
      if (state === 'ready') { const s = 'WAVE ' + wave; txt(s, (W - tw(s)) / 2, 44, K.GOLD); txt('GET READY', (W - tw('GET READY')) / 2, 54, K.WHITE); }
      if (state === 'over') { txt('GAME OVER', (W - tw('GAME OVER', 2)) / 2, 40, K.RED, 2); }
    });
    PX.dim = pd; PX.emit = pe; PX.fl = pf;
  }

  const loop = (t: number) => { const dt = Math.min(0.05, (t - last) / 1000); last = t; step(dt); draw(); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
}
