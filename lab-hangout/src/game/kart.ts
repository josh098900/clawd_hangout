// THE KART TRACK's racing: the circuit, how a kart drives, laps and places, and the CPU karts.
//
// The circuit is a closed Catmull-Rom spline through TRACK_PTS, sampled every few px into a
// centreline (CL). A kart is "on track" within HALF px of it; off it (the grass) it's slow.
// Your own kart is simulated in your browser (stepKart) and sent ~12 times a second while
// racing; the CPU karts that fill the empty grid slots are worked out from the clock and the
// race seed (cpuAt), so every browser sees them in the same place with no messages at all.
//
// Laps: you have to pass the halfway point before crossing the line counts (no reversing over
// it for free). Your place = how far round you are (laps + progress), finishers by time.

export const TRACK_W = 1040, TRACK_H = 720, HALF = 30, LAPS = 3, MAX_RACERS = 4;
/** Race: countdown in the lobby before GO (s), and when an unfinished race gives up (s after GO). */
export const LOBBY_S = 12, RACE_MAX_S = 160;

/** The circuit's control points, in driving order (clockwise). Point 0 is on the start straight. */
const TRACK_PTS: [number, number][] = [
  [140, 420], [140, 250], [190, 130], [320, 90], [440, 140], [470, 270], [560, 330], [680, 270],
  [730, 150], [850, 100], [940, 170], [930, 320], [830, 400], [860, 530], [900, 620], [770, 650],
  [620, 600], [480, 640], [330, 640], [190, 610],
];
export interface CLPoint { x: number; y: number; tx: number; ty: number; s: number }
function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}
/** The centreline, evenly-ish spaced, with tangents and distance along (s). */
export const CL: CLPoint[] = (() => {
  const raw: [number, number][] = [], n = TRACK_PTS.length;
  for (let i = 0; i < n; i++) {
    const a = TRACK_PTS[(i - 1 + n) % n], b = TRACK_PTS[i], c = TRACK_PTS[(i + 1) % n], d = TRACK_PTS[(i + 2) % n];
    for (let k = 0; k < 24; k++) { const t = k / 24; raw.push([catmull(a[0], b[0], c[0], d[0], t), catmull(a[1], b[1], c[1], d[1], t)]); }
  }
  // resample every ~5 px so progress is even
  const out: CLPoint[] = []; let s = 0, carry = 0;
  for (let i = 0; i < raw.length; i++) {
    const [x0, y0] = raw[i], [x1, y1] = raw[(i + 1) % raw.length], L = Math.hypot(x1 - x0, y1 - y0);
    let u = carry;
    while (u < L) { const k = u / L; out.push({ x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, tx: (x1 - x0) / L, ty: (y1 - y0) / L, s: s + u }); u += 5; }
    carry = u - L; s += L;
  }
  return out;
})();
export const TRACK_LEN = CL[CL.length - 1].s + Math.hypot(CL[0].x - CL[CL.length - 1].x, CL[0].y - CL[CL.length - 1].y);
/** Boost pads: centreline index ranges (the chevrons are drawn across the track there). */
export const PADS: [number, number][] = [[Math.round(CL.length * 0.09), Math.round(CL.length * 0.09) + 5], [Math.round(CL.length * 0.47), Math.round(CL.length * 0.47) + 5], [Math.round(CL.length * 0.83), Math.round(CL.length * 0.83) + 5]];

/** Nearest centreline index to (x, y), searching around `hint` (or everywhere). */
export function nearest(x: number, y: number, hint = -1): number {
  const N = CL.length; let best = 0, bd = Infinity;
  if (hint >= 0) { for (let k = -24; k <= 24; k++) { const i = (hint + k + N) % N, d = (CL[i].x - x) ** 2 + (CL[i].y - y) ** 2; if (d < bd) { bd = d; best = i; } } if (bd < 70 * 70) return best; }
  for (let i = 0; i < N; i += 2) { const d = (CL[i].x - x) ** 2 + (CL[i].y - y) ** 2; if (d < bd) { bd = d; best = i; } }
  return best;
}
/** Where grid slot k starts (behind the line, two by two) and which way it faces. */
export function gridSpot(k: number): { x: number; y: number; a: number } {
  const i = (CL.length - 5 - Math.floor(k / 2) * 6 + CL.length) % CL.length, p = CL[i], side = k % 2 ? 1 : -1;
  return { x: p.x - p.ty * side * 13, y: p.y + p.tx * side * 13, a: Math.atan2(p.ty, p.tx) };
}

// ---------- your kart ----------
export interface Kart {
  x: number; y: number; a: number; v: number;
  /** Which way it's actually moving (lags the nose while drifting: the slide). */
  md: number;
  drift: boolean; charge: number; boost: number;
  seg: number; lap: number; half: boolean; crossed: boolean;
  /** ms after GO: when you finished (0 = still racing), when this lap started, your best lap. */
  fin: number; lapT0: number; best: number;
}
export interface KartInput { gas: boolean; brake: boolean; left: boolean; right: boolean; drift: boolean }
export function newKart(slot: number): Kart {
  const g = gridSpot(slot);
  return { x: g.x, y: g.y, a: g.a, v: 0, md: g.a, drift: false, charge: 0, boost: 0, seg: nearest(g.x, g.y), lap: 0, half: false, crossed: false, fin: 0, lapT0: 0, best: 0 };
}
/** What happened this step (for sounds). */
export interface KartEvents { lap?: number; finished?: boolean; boost?: 'pad' | 'turbo'; offTrack?: boolean }
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Drive for dt seconds. `t` = ms since GO (negative on the grid: no driving yet). `bump` pushes you off other karts. */
export function stepKart(k: Kart, inp: KartInput, dt: number, t: number, bump: { x: number; y: number }[]): KartEvents {
  const ev: KartEvents = {};
  if (t < 0 || k.fin) { k.v *= Math.max(0, 1 - dt * 2); if (k.fin) { k.x += Math.cos(k.md) * k.v * dt; k.y += Math.sin(k.md) * k.v * dt; } return ev; }
  const p = CL[k.seg], off = Math.hypot(k.x - p.x, k.y - p.y), on = off < HALF;
  if (!on) ev.offTrack = true;
  if (k.boost > 0) k.boost = Math.max(0, k.boost - dt);
  const top = (on ? 124 : 52) * (k.boost > 0 ? 1.4 : 1);
  if (inp.gas) k.v += (k.boost > 0 ? 190 : 105) * dt;
  else if (inp.brake) k.v -= 200 * dt;
  else k.v -= Math.sign(k.v) * Math.min(Math.abs(k.v), 45 * dt);
  if (k.v > top) k.v = Math.max(top, k.v - 160 * dt);
  k.v = Math.max(-40, k.v);
  // steering (needs speed), drifting turns tighter and lets the back slide out
  const steer = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), grip = Math.min(1, Math.abs(k.v) / 45);
  const wasDrift = k.drift;
  k.drift = inp.drift && steer !== 0 && k.v > 55;
  k.a += steer * (k.drift ? 3.3 : 2.6) * grip * Math.sign(k.v || 1) * dt;
  if (k.drift) k.charge = Math.min(2, k.charge + dt * (on ? 1 : 0.3));
  if (wasDrift && !k.drift) { if (k.charge > 0.55) { k.boost = Math.max(k.boost, 0.35 + k.charge * 0.45); ev.boost = 'turbo'; } k.charge = 0; }
  const follow = k.drift ? 2.6 : 11;
  k.md += wrapA(k.a - k.md) * Math.min(1, follow * dt);
  k.x += Math.cos(k.md) * k.v * dt; k.y += Math.sin(k.md) * k.v * dt;
  // other karts: push apart (you're the one who moves)
  for (const o of bump) { const dx = k.x - o.x, dy = k.y - o.y, d = Math.hypot(dx, dy); if (d > 0 && d < 12) { k.x += (dx / d) * (12 - d); k.y += (dy / d) * (12 - d); k.v *= 0.97; } }
  // the fence round the world
  if (k.x < 14 || k.x > TRACK_W - 14 || k.y < 14 || k.y > TRACK_H - 14) { k.x = Math.max(14, Math.min(TRACK_W - 14, k.x)); k.y = Math.max(14, Math.min(TRACK_H - 14, k.y)); k.v *= 0.5; }
  // progress, halfway, laps
  const N = CL.length, prev = k.seg; k.seg = nearest(k.x, k.y, k.seg);
  const pr = prev / N, nw = k.seg / N;
  if (nw > 0.4 && nw < 0.6) k.half = true;
  for (const [i0, i1] of PADS) if (k.seg >= i0 && k.seg <= i1 && on && k.boost < 0.9) { k.boost = 1; ev.boost = 'pad'; }
  if (pr > 0.85 && nw < 0.15) { // crossed the line forwards
    if (!k.crossed) { k.crossed = true; k.lapT0 = t; }
    else if (k.half) {
      k.lap++; k.half = false; const lt = t - k.lapT0; k.lapT0 = t; if (!k.best || lt < k.best) k.best = lt; ev.lap = k.lap;
      if (k.lap >= LAPS) { k.fin = t; ev.finished = true; }
    }
  } else if (pr < 0.15 && nw > 0.85 && k.crossed) k.half = false; // backwards over it: that lap doesn't count
  return ev;
}
/** How far round the race (laps, a bit less before the first crossing): for places. */
export const kartDist = (k: { lap: number; seg: number; crossed: boolean }): number => (k.crossed ? k.lap + k.seg / CL.length : k.seg / CL.length - 1);

// ---------- CPU karts ----------
function mix(n: number): number { let h = n >>> 0; h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; return (h ^ (h >>> 16)) >>> 0; }
export const CPU_NAMES = ['ZOOM', 'TURBO', 'NITRO', 'SPARKY'];
/** CPU kart in grid slot `slot` of the race with this seed, `t` ms after GO: where it is. */
export function cpuAt(seed: number, slot: number, t: number): { x: number; y: number; a: number; dist: number; fin: number } {
  const h = mix(seed * 31 + slot), v = 99 + (h % 1000) / 1000 * 14, amp = 14 + (h % 7) * 3, ph = (h % 628) / 100, lane = ((h >> 10) % 20) - 10;
  const g = gridSpot(slot), s0 = CL[nearest(g.x, g.y)].s - TRACK_LEN;
  const T = Math.max(0, t / 1000), ramp = 1.3;
  const sAt = (T: number) => (T < ramp ? v * T * T / (2 * ramp) : v * (T - ramp / 2)) + amp * Math.sin(T * 0.37 + ph) - amp * Math.sin(ph);
  const s = s0 + sAt(T), goal = LAPS * TRACK_LEN;
  // when it crosses the finish (solve roughly: the wobble is small)
  let fin = 0; if (s >= goal) { let lo = 0, hi = T; for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (s0 + sAt(mid) >= goal) hi = mid; else lo = mid; } fin = hi * 1000; }
  const sc = Math.min(s, goal + 60), sm = ((sc % TRACK_LEN) + TRACK_LEN) % TRACK_LEN;
  let i = Math.floor(sm / TRACK_LEN * CL.length) % CL.length;
  while (i < CL.length - 1 && CL[i + 1].s <= sm) i++; while (i > 0 && CL[i].s > sm) i--;
  const g0 = CL[nearest(g.x, g.y)], gridOff = (g.x - g0.x) * -g0.ty + (g.y - g0.y) * g0.tx; // (which side of the grid it started on)
  const p = CL[i], wob = Math.sin(T * 0.8 + ph) * 5, k = Math.min(1, T / (ramp * 2)), off = gridOff + (lane + wob - gridOff) * k;
  return { x: p.x - p.ty * off, y: p.y + p.tx * off, a: Math.atan2(p.ty, p.tx) + Math.cos(T * 0.8 + ph) * 0.08, dist: s / TRACK_LEN, fin };
}
/** m:ss.cc */
export const raceTime = (ms: number): string => { const s = Math.max(0, ms) / 1000, m = Math.floor(s / 60); return m + ':' + (s % 60).toFixed(2).padStart(5, '0'); };
export const ordinal = (n: number): string => n + (n === 1 ? 'ST' : n === 2 ? 'ND' : n === 3 ? 'RD' : 'TH');
