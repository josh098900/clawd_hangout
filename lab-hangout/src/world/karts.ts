// THE KART TRACK — the Subway's KARTS stop. An evening pit lane under floodlights: four karts in
// their pit boxes (press E at one to start a race, or join the one in the lobby), and across
// the track the grandstand with a BIG SCREEN showing the race live (a map of the circuit with
// everyone on it, and the order), plus a FASTEST LAP board. The races themselves are in
// ui/race.ts (top down); game/kart.ts has the circuit and the CPU karts.

import { BODY, CONFETTI, K, type RGB } from '../engine/palette';
import { PX, mk, r, txt, tw, lit, G, Gd, withCtx, M, shade, disc } from '../engine/pixel';
import { h1 } from '../engine/math';
import { CPU_NAMES, LAPS, MAX_RACERS, RACE_MAX_S, TRACKS, TRACK_H, TRACK_W, cpuAt, raceTime, trackOf } from '../game/kart';
import type { KartMsg, KartRecord, RaceState, StateMsg } from '../net/transport';
import type { Prop, Room, Spot } from './room';

const W = 1300, H = 660, FL = 470;
/** The race (room state 'race'), the fastest lap, and the latest word from each racer (for the big screen). */
export const KARTS = { race: null as RaceState | null, /** fastest lap per circuit */ best: [] as KartRecord[], live: new Map<string, { k: KartMsg; t: number }>() };
export const PIT_X = [330, 520, 710, 900];
const SCREEN = { x: 470, y: 304, w: 360, h: 96 };

function build(this: Room): void {
  withCtx(this.bg.getContext('2d')!, () => {
    PX.dim = 0; PX.fl = 0; PX.emit = false;
    // an evening sky
    for (let y = 0; y < 330; y += 4) r(0, y, W, 4, M([40, 30, 80], [240, 130, 90], Math.max(0, (y - 120) / 210)));
    for (let i = 0; i < 60; i++) r(Math.floor(h1(i * 3.3) * W), Math.floor(h1(i * 7.1) * 180), 1, 1, [220, 220, 255]);
    // the grandstand across the track, full of people
    r(0, 310, W, 90, [70, 72, 90]); for (let y = 314; y < 398; y += 7) { r(0, y + 5, W, 2, [50, 52, 66]); for (let x = 4 + (y % 2) * 3; x < W; x += 6) if (h1(x * 1.7 + y) > 0.25) r(x, y, 4, 4, CONFETTI[Math.floor(h1(x + y * 3) * CONFETTI.length)].map((v) => v * 0.8) as RGB); }
    // floodlight towers
    for (const x of [60, 440, 860, 1240]) { r(x - 3, 150, 6, 170, [60, 62, 74]); r(x - 20, 140, 40, 14, [40, 42, 52]); }
    // the track going past (side on), its curb, and the fence
    r(0, 400, W, 34, [84, 86, 96]); for (let x = 0; x < W; x += 30) r(x, 416, 14, 2, [200, 200, 190]);
    for (let x = 0; x < W; x += 16) r(x, 434, 16, 5, (x / 16) % 2 ? [214, 50, 50] : [236, 236, 236]);
    r(0, 439, W, 6, [70, 150, 70]);
    for (let x = 0; x < W; x += 60) r(x, 400, 3, 56, [120, 124, 134]); r(0, 404, W, 2, [150, 154, 164]);
    for (let y = 408; y < 456; y += 6) for (let x = (y % 12 ? 0 : 3); x < W; x += 6) r(x, y, 1, 1, [150, 154, 164]); // chain-link
    // the pit wall and the pit lane
    r(0, 452, W, 18, [200, 200, 206]); for (let x = 0; x < W; x += 80) r(x, 452, 40, 18, [214, 60, 60]); r(0, 452, W, 2, [240, 240, 244]);
    r(0, FL, W, H - FL, [110, 112, 120]); for (let i = 0; i < 700; i++) r(Math.floor(h1(i * 1.3) * W), FL + Math.floor(h1(i * 2.9) * (H - FL)), 1, 1, [100, 102, 110]);
    r(0, 578, W, 3, [240, 240, 240]); // pit lane line
    for (const x of PIT_X) { r(x - 44, 484, 2, 90, [230, 200, 60]); r(x + 42, 484, 2, 90, [230, 200, 60]); r(x - 44, 484, 88, 2, [230, 200, 60]); txt('BOX', x - tw('BOX') / 2, 488, [230, 200, 60]); }
    // the stairs down to the Subway
    r(14, 600, 70, 60, [60, 62, 70]); for (let k = 0; k < 6; k++) r(18, 604 + k * 9, 62, 4, [130, 132, 140]);
    r(12, 592, 4, 68, [40, 120, 90]); r(82, 592, 4, 68, [40, 120, 90]); r(12, 592, 74, 4, [40, 120, 90]);
    // the big screen's frame + the fastest lap board's post
    r(SCREEN.x - 8, SCREEN.y - 8, SCREEN.w + 16, SCREEN.h + 16, [30, 32, 40]); r(SCREEN.x + SCREEN.w / 2 - 6, SCREEN.y + SCREEN.h + 8, 12, 400 - SCREEN.y - SCREEN.h - 8, [40, 42, 52]);
    r(1092, 320, 150, 64, [30, 32, 40]); r(1164, 384, 6, 68, [60, 62, 74]);
  });
}

/** A kart parked in its box (or the live race on the screen): side-on, pointing right. */
function sideKart(x: number, y: number, col: RGB): void {
  for (const wx of [x - 14, x + 12]) { disc(wx, y - 4, 5, [24, 24, 28]); disc(wx, y - 4, 2, [140, 140, 150]); }
  r(x - 18, y - 12, 38, 6, col); r(x - 18, y - 12, 38, 1, M(col, [255, 255, 255], 0.4)); r(x + 16, y - 10, 6, 4, shade(col, 0.7));
  r(x - 20, y - 18, 4, 8, [50, 50, 58]); r(x - 6, y - 16, 10, 4, [40, 40, 48]); // seat, steering column
  r(x + 2, y - 20, 2, 6, [60, 60, 70]); r(x, y - 21, 6, 2, [60, 60, 70]); // wheel
}

function drawBack(a: number): void {
  const rc = KARTS.race, now = Date.now(), t = rc ? now - rc.t0 : Infinity;
  // floodlights
  lit(() => { for (const x of [60, 440, 860, 1240]) for (let k = 0; k < 4; k++) r(x - 17 + k * 9, 143, 7, 8, [255, 250, 220]); });
  for (const x of [60, 440, 860, 1240]) { Gd(x, 147, 30, [255, 240, 200], 0.35); G(x - 60, 150, 120, 260, [255, 240, 200], 0.03); }
  // the crowd waves
  lit(() => { for (let k = 0; k < 40; k++) { const x = Math.floor(h1(k * 9.1) * W), y = 316 + Math.floor(h1(k * 4.3) * 70); if ((a * 2 + h1(k)) % 1 < 0.5) r(x, y - 3, 1, 3, CONFETTI[k % CONFETTI.length]); } });
  // karts whizzing round the far side of the track (the live race does it too)
  const live = rc && t >= 0 && t < RACE_MAX_S * 1000;
  for (let k = 0; k < (live ? MAX_RACERS : 2); k++) { const sp = 380 + k * 40, x = ((a * sp + k * 530) % (W + 400)) - 200; if (!live && Math.floor((a * sp + k * 530) / (W + 400)) % 3) continue; sideKart(Math.round(x), 432, live ? (k < rc!.cols.length ? BODY[rc!.cols[k] % BODY.length].c : [230, 230, 236]) : k ? [240, 150, 40] : [90, 200, 255]); }
  // THE BIG SCREEN
  const S = SCREEN;
  lit(() => {
    r(S.x, S.y, S.w, S.h, [8, 12, 20]);
    const tr = rc ? trackOf(rc.seed) : TRACKS[Math.floor(now / 60000) % TRACKS.length], CL = tr.CL;
    const mx = S.x + 6, my = S.y + 6, sc = Math.min((S.w * 0.55) / TRACK_W, (S.h - 12) / TRACK_H);
    CL.forEach((p, i) => { if (i % 3 === 0) r(Math.round(mx + p.x * sc), Math.round(my + p.y * sc), 2, 2, [70, 80, 96]); });
    r(Math.round(mx + CL[0].x * sc) - 2, Math.round(my + CL[0].y * sc), 5, 1, K.WHITE);
    const lx = S.x + S.w * 0.6;
    if (!rc || t > RACE_MAX_S * 1000 + 60000) {
      txt(tr.name, lx, S.y + 8, K.GOLD, 2); txt('GRAB A KART IN', lx, S.y + 30, [220, 226, 240]); txt('THE PIT BOXES', lx, S.y + 40, [220, 226, 240]); txt('TO START A RACE', lx, S.y + 50, [220, 226, 240]);
      txt(LAPS + ' LAPS, UP TO 4', lx, S.y + 66, [150, 160, 180]); txt('CPUS FILL THE GRID', lx, S.y + 76, [150, 160, 180]);
      return;
    }
    // everyone on the map, and the order
    const es: { name: string; col: RGB; x: number; y: number; dist: number; fin: number }[] = [];
    rc.ids.forEach((id, i) => { const L = KARTS.live.get(id), k = L && L.k.r === rc.t0 ? L.k : null; es.push({ name: rc.names[i], col: BODY[rc.cols[i] % BODY.length].c, x: k ? k.x : CL[0].x, y: k ? k.y : CL[0].y, dist: k ? (k.c ? k.lap + k.g / CL.length : k.g / CL.length - 1) : -1, fin: k?.fin ?? 0 }); });
    for (let s = rc.ids.length; s < MAX_RACERS; s++) { const c = cpuAt(tr, rc.seed, s, t); es.push({ name: CPU_NAMES[s - rc.ids.length], col: [200, 200, 210], x: c.x, y: c.y, dist: c.dist, fin: c.fin }); }
    for (const e of es) { const x = Math.round(mx + e.x * sc), y = Math.round(my + e.y * sc); r(x - 2, y - 2, 5, 5, e.col); r(x - 1, y - 1, 3, 3, M(e.col, [255, 255, 255], 0.5)); }
    es.sort((p, q) => (p.fin && q.fin ? p.fin - q.fin : p.fin ? -1 : q.fin ? 1 : q.dist - p.dist));
    if (t < 0) { txt('RACE IN ' + Math.ceil(-t / 1000), lx, S.y + 8, (a % 1) < 0.5 ? K.GOLD : K.WHITE, 2); txt(tr.name, lx, S.y + S.h - 10, [150, 160, 180]); }
    else { const lead = es[0], lap = lead.fin ? LAPS : Math.min(LAPS, Math.max(1, Math.floor(lead.dist) + 1)); txt(es.every((e) => e.fin) || lead.fin ? 'FINISH!' : 'LAP ' + lap + ' OF ' + LAPS, lx, S.y + 8, lead.fin ? K.GOLD : K.WHITE, 2); }
    es.forEach((e, i) => { const y = S.y + 30 + i * 12; r(lx, y, 5, 5, e.col); txt((i + 1) + ' ' + e.name.slice(0, 9), lx + 8, y, i === 0 ? K.GOLD : [220, 226, 240]); if (e.fin) txt(raceTime(e.fin), S.x + S.w - 6 - tw(raceTime(e.fin)), y, [150, 200, 255]); });
  });
  G(S.x, S.y, S.w, S.h, [120, 170, 255], 0.08);
  // the fastest lap board
  const bt = rc ? trackOf(rc.seed) : TRACKS[Math.floor(now / 60000) % TRACKS.length];
  lit(() => { txt(bt.name, 1167 - tw(bt.name) / 2, 324, K.GOLD); const b = KARTS.best[TRACKS.indexOf(bt)] ?? null; txt('FASTEST LAP', 1167 - tw('FASTEST LAP') / 2, 332, [150, 160, 180]); txt(b ? raceTime(b.ms) : '-:--.--', 1167 - tw(b ? raceTime(b.ms) : '-:--.--', 2) / 2, 344, K.WHITE, 2); if (b) txt(b.name.slice(0, 16), 1167 - tw(b.name.slice(0, 16)) / 2, 364, [180, 220, 255]); });
  // the start lights on the gantry over the pit exit
  lit(() => { for (let k = 0; k < 5; k++) { const on = rc && t < 0 && t > -3500 ? k < Math.floor((3500 + t) / 700) : false, go = rc && t >= 0 && t < 3000; disc(1030 + k * 12, 470, 3, go ? [124, 242, 156] : on ? [240, 50, 50] : [60, 30, 30]); } });
}

// ---------- props ----------
const pitKart = (i: number): Prop => ({ y: 540, draw() { sideKart(PIT_X[i], 540, [[220, 50, 60], [60, 140, 230], [240, 190, 40], [80, 190, 110]][i] as RGB); lit(() => txt(String(i + 1), PIT_X[i] - 2, 521, K.WHITE)); } });
const tyres = (x: number, y: number): Prop => ({ y, draw() { for (let k = 0; k < 3; k++) { r(x - 9, y - 7 - k * 6, 18, 6, [30, 30, 36]); r(x - 9, y - 7 - k * 6, 18, 1, [60, 60, 70]); r(x - 4, y - 5 - k * 6, 8, 2, [50, 50, 58]); } } });
const gantry: Prop = { y: 482, draw() { r(1010, 400, 4, 82, [60, 62, 74]); r(1090, 400, 4, 82, [60, 62, 74]); r(1010, 462, 84, 16, [30, 32, 40]); } };

// ---------- spots (append only) ----------
export const KART_SPOTS: Spot[] = PIT_X.map((x, n): Spot => ({ kind: 'kart', n, x, y: 541, sx: x, sy: 556, lift: 8, label: 'RACE', area: { x0: x - 26, y0: 508, x1: x + 26, y1: 542 } }));

export function makeKarts(): Room {
  const room: Room = {
    id: 'karts', title: 'THE KART TRACK', sub: 'RACING',
    w: W, h: H,
    floor: { x0: 14, y0: FL + 10, x1: W - 14, y1: H - 20 },
    blockers: [...PIT_X.map((x) => ({ x0: x - 22, y0: 530, x1: x + 22, y1: 542 })), { x0: 180, y0: 508, x1: 200, y1: 520 }, { x0: 1180, y0: 588, x1: 1200, y1: 600 }, { x0: 94, y0: 600, x1: 100, y1: 660 }],
    doors: [{ trigger: { x0: 20, y0: 634, x1: 78, y1: 646 }, edge: true, to: 'kartstn', arrive: { x: 60, y: 646 }, label: 'SUBWAY', area: { x0: 10, y0: 588, x1: 88, y1: 660 } }],
    spots: KART_SPOTS, inUse: new Map(),
    onState(s: StateMsg) {
      if (s.k === 'race') KARTS.race = s.v;
      else if (s.k === 'kartbest') KARTS.best = s.v;
    },
    spawn: { x: 110, y: 610 },
    dim: 0.08,
    fillTop: 'rgb(40,30,80)', fillLow: 'rgb(110,112,120)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [...PIT_X.map((_, i) => pitKart(i)), tyres(190, 520), tyres(1190, 600), gantry],
  };
  return room;
}
