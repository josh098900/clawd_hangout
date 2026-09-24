// Ambient life: small local-only creatures that make the sets feel inhabited.
//   - THE SQUARE: pigeons peck and waddle about, and scatter when someone walks up to them.
//   - THE LAB: a robot vacuum wanders the floor, bumping off furniture and feet.
// They run in your browser only (not networked), so each player's pigeons are their own.

import type { Avatar } from '../entities/avatar';
import { K, NK, type RGB } from '../engine/palette';
import { alpha, G, Gd, lit, oval, r, txt } from '../engine/pixel';
import { h1 } from '../engine/math';
import { walkable, type Room, type RoomId } from '../world/room';
import { SFX } from '../audio/sfx';
import { DEN_DESKS, BEANBAGS, pomodoro } from '../world/den';

export interface Drawable { y: number; draw(a: number): void }

// ---------- pigeons ----------
type PState = 'peck' | 'walk' | 'fly' | 'away' | 'land';
interface Pigeon { x: number; y: number; z: number; dir: 1 | -1; st: PState; t: number; tx: number; ty: number; vx: number; k: number }
const FLOCKS: [number, number][] = [[480, 684], [700, 626], [990, 694], [300, 660]];
const P_AREA = { x0: 180, x1: 1120, y0: 590, y1: 704 };

function drawPigeon(p: Pigeon, a: number): void {
  const d = p.dir, bx = Math.round(p.x), by = Math.round(p.y - p.z);
  // mirrored rects in the pigeon's own space (x forward); detail is tiny, light stays top-lit
  const R = (dx: number, dy: number, w: number, h: number, c: RGB) => r(d > 0 ? bx + dx : bx - dx - w + 1, by + dy, w, h, c);
  const flying = p.st === 'fly' || p.st === 'land' || p.st === 'away';
  const peck = p.st === 'peck' && Math.sin(a * 9 + p.k * 5) > 0.35 ? 2 : 0;
  const hop = p.st === 'walk' ? Math.round(Math.abs(Math.sin(a * 14 + p.k)) * 1) : 0;
  if (p.z > 0.5 && p.z < 90) alpha(0.25 * (1 - p.z / 90), () => oval(Math.round(p.x), Math.round(p.y), 3, 1, [10, 10, 24]));
  const y0 = -hop;
  R(-5, -5 + y0, 2, 2, K.PIGEON_DK); // tail
  R(-3, -6 + y0, 6, 4, K.PIGEON); R(-3, -6 + y0, 5, 1, K.PIGEON_LT); R(-2, -3 + y0, 4, 1, K.PIGEON_LT);
  R(1 + (peck ? 1 : 0), -8 + y0 + peck, 3, 3, K.PIGEON_DK); R(1 + (peck ? 1 : 0), -6 + y0 + peck, 2, 1, K.PIGEON_NECK);
  R(3 + (peck ? 1 : 0), -8 + y0 + peck, 1, 1, K.FEET); R(4 + (peck ? 1 : 0), -7 + y0 + peck, 1, 1, K.BEAK);
  if (flying) { const up = Math.sin(a * 26 + p.k * 3) > 0; if (up) R(-2, -9 + y0, 4, 3, K.PIGEON_DK); else R(-2, -3 + y0, 4, 2, K.PIGEON_DK); }
  else { R(-2, -5 + y0, 4, 2, K.PIGEON_DK); R(-1, -2, 1, 2, K.FEET); R(1, -2, 1, 2, K.FEET); }
}

// ---------- robot vacuum ----------
interface Vac { x: number; y: number; h: number; bumpT: number; k: number }

function drawVac(v: Vac, a: number, now: number): void {
  const x = Math.round(v.x), y = Math.round(v.y), bumped = now - v.bumpT < 0.5;
  alpha(0.3, () => oval(x, y, 9, 2, [10, 10, 24]));
  r(x - 8, y - 5, 16, 4, K.OUTLINE); r(x - 7, y - 6, 14, 1, K.OUTLINE);
  r(x - 7, y - 5, 14, 3, K.VAC); r(x - 6, y - 6, 12, 1, K.VAC_HI); r(x - 7, y - 2, 14, 1, K.VAC_DK);
  const sw = Math.floor(a * 10) % 2; r(sw ? x - 9 : x + 8, y - 2, 1, 1, K.VAC_HI); // spinning side brush
  lit(() => r(x - 1, y - 6, 2, 1, bumped ? [255, 90, 70] : (a % 1.4) < 1.1 ? [124, 242, 156] : [40, 80, 50]));
  Gd(x, y - 6, 4, bumped ? [255, 90, 70] : [124, 242, 156], bumped ? 0.5 : 0.3);
  if (bumped) G(x - 8, y - 8, 16, 6, [255, 90, 70], 0.08);
}

// ---------- the manager ----------
// ---------- the office cat ----------
interface Perch { x: number; y: number; sort: number; spot: number }
const PERCHES: Perch[] = [
  ...DEN_DESKS.map(([x, y], i) => ({ x: x + 6, y: y - 22, sort: y + 0.5, spot: i })),
  ...BEANBAGS.map(([x, y], i) => ({ x, y: y - 12, sort: y + 0.5, spot: 4 + i })),
];
interface Cat { st: 'sleep' | 'walk' | 'hop'; x: number; y: number; perch: number; tx: number; ty: number; t: number; dir: 1 | -1; hop0: [number, number]; goal: number }

function drawCat(c: Cat, a: number): void {
  const x = Math.round(c.x), y = Math.round(c.y), d = c.dir;
  const R = (dx: number, dy: number, w: number, h: number, col: RGB) => r(d > 0 ? x + dx : x - dx - w + 1, y + dy, w, h, col);
  if (c.st === 'sleep') {
    const br = Math.sin(a * 2) > 0 ? 0 : 1;
    R(-6, -5 + br, 12, 5 - br, K.OUTLINE); R(-5, -4 + br, 10, 4 - br, NK.CAT); R(-4, -4 + br, 2, 1, NK.CAT_DK); R(0, -4 + br, 2, 1, NK.CAT_DK); R(-5, -1, 10, 1, NK.CAT_DK);
    R(3, -6 + br, 4, 4, NK.CAT); R(3, -7 + br, 1, 1, NK.CAT); R(6, -7 + br, 1, 1, NK.CAT); R(4, -4 + br, 2, 1, NK.CAT_DK);
    R(-7, -2, 3, 2, NK.CAT_DK);
    lit(() => { const ph = (a * 0.5) % 1; alpha(1 - ph, () => txt('Z', x + d * 8 + Math.round(ph * 4), y - 10 - Math.round(ph * 10), [200, 220, 255])); });
    return;
  }
  const step = Math.floor(a * 8) % 2, lift = c.st === 'hop' ? 0 : 0;
  R(-5, -6 - lift, 9, 4, NK.CAT); R(-5, -6 - lift, 9, 1, NK.CAT_HI); R(-3, -6 - lift, 1, 3, NK.CAT_DK); R(0, -6 - lift, 1, 3, NK.CAT_DK);
  R(3, -9 - lift, 4, 4, NK.CAT); R(3, -10 - lift, 1, 1, NK.CAT); R(6, -10 - lift, 1, 1, NK.CAT); R(6, -8 - lift, 1, 1, K.EYE); R(7, -7 - lift, 1, 1, K.PINK);
  R(-7, -9 - lift + (step ? 0 : 1), 2, 4, NK.CAT_DK);
  R(-4, -2, 1, 2 - step, NK.CAT_DK); R(-2, -2, 1, 1 + step, NK.CAT_DK); R(1, -2, 1, 2 - step, NK.CAT_DK); R(3, -2, 1, 1 + step, NK.CAT_DK);
}

interface Crumb { x: number; y: number; t0: number }
interface Heart { x: number; y: number; t0: number }

export class Ambient {
  private pigeons: Pigeon[] = [];
  private crumbs: Crumb[] = [];
  private hearts: Heart[] = [];
  private vac: Vac = { x: 330, y: 580, h: 0.4, bumpT: -9, k: 1 };
  private k = 0;
  private lastFlap = -9;
  private lastCoo = 0;
  private cat: Cat = { st: 'sleep', x: PERCHES[2].x, y: PERCHES[2].y, perch: 2, tx: 0, ty: 0, t: 5, dir: 1, hop0: [0, 0], goal: -1 };
  private lastMeow = 0;
  private crabs = [0, 1, 2, 3].map((i) => ({ x: 200 + i * 260, y: 600 + (i % 2) * 50, dir: (i % 2 ? 1 : -1) as 1 | -1, t: i, hide: 0 }));

  constructor() {
    for (let i = 0; i < 9; i++) {
      const [fx, fy] = FLOCKS[i % FLOCKS.length], x = fx + (h1(i * 3.7) - 0.5) * 60, y = fy + (h1(i * 5.1) - 0.5) * 20;
      this.pigeons.push({ x, y, z: 0, dir: h1(i) > 0.5 ? 1 : -1, st: 'peck', t: 1 + h1(i + 9) * 3, tx: x, ty: y, vx: 0, k: i });
    }
  }

  /** Someone threw crumbs at (x, y): scatter them, and call over every pigeon in reach. */
  feed(x: number, y: number, now: number): void {
    for (let i = 0; i < 7; i++) this.crumbs.push({ x: Math.max(P_AREA.x0, Math.min(P_AREA.x1, x + (h1(++this.k) - 0.5) * 30)), y: Math.max(P_AREA.y0, Math.min(P_AREA.y1, y + (h1(++this.k) - 0.5) * 12)), t0: now });
    if (this.crumbs.length > 40) this.crumbs.splice(0, this.crumbs.length - 40);
    for (const p of this.pigeons) {
      if ((p.st === 'peck' || p.st === 'walk') && Math.hypot(p.x - x, p.y - y) < 260) this.goCrumb(p);
      else if (p.st === 'away') p.t = Math.min(p.t, 0.5 + h1(++this.k) * 1.5);
    }
  }
  /** Is there a pigeon on the ground within d of (x, y)? */
  pigeonNear(x: number, y: number, d: number): boolean { return this.pigeons.some((p) => (p.st === 'peck' || p.st === 'walk') && Math.hypot(p.x - x, (p.y - y) * 1.5) < d); }

  private goCrumb(p: Pigeon): boolean {
    let best: Crumb | null = null, bd = 1e9;
    for (const c of this.crumbs) { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } }
    if (!best) return false;
    p.st = 'walk'; p.tx = best.x; p.ty = best.y; p.t = 8; p.dir = best.x > p.x ? 1 : -1;
    return true;
  }

  update(room: Room, dt: number, now: number, avs: Avatar[]): void {
    this.crumbs = this.crumbs.filter((c) => now - c.t0 < 40); this.hearts = this.hearts.filter((h) => now - h.t0 < 1.2);
    if (room.id === 'plaza') this.updatePigeons(dt, now, avs);
    else if (room.id === 'lab') this.updateVac(room, dt, now, avs);
    else if (room.id === 'den') this.updateCat(room, dt, now, avs);
    else if (room.id === 'pier') for (const c of this.crabs) { // scuttle sideways; bury in the sand when someone comes close
      const near = avs.some((av) => Math.abs(av.x - c.x) < 34 && Math.abs(av.y - c.y) < 16);
      c.hide = Math.max(0, Math.min(1, c.hide + (near ? dt * 4 : -dt * 0.6)));
      c.t -= dt; if (c.t < 0) { c.dir = -c.dir as 1 | -1; c.t = 1 + h1(++this.k) * 3; }
      if (c.hide < 0.2) c.x = Math.max(40, Math.min(1260, c.x + c.dir * 22 * dt));
    }
  }

  private updatePigeons(dt: number, now: number, avs: Avatar[]): void {
    const rnd = () => h1(++this.k * 1.618);
    for (const p of this.pigeons) {
      p.t -= dt;
      const grounded = p.st === 'peck' || p.st === 'walk';
      if (grounded) {
        // anyone walking up (or standing right on top of it) spooks it
        const spook = avs.find((av) => Math.abs(av.x - p.x) < (av.moving ? 34 : 16) && Math.abs(av.y - p.y) < (av.moving ? 16 : 8));
        if (spook) {
          p.st = 'fly'; p.dir = spook.x < p.x ? 1 : -1; p.vx = p.dir * (60 + rnd() * 40); p.t = 0;
          if (now - this.lastFlap > 0.4) { this.lastFlap = now; SFX.flap(); }
          continue;
        }
      }
      switch (p.st) {
        case 'peck':
          if (p.t < 0) {
            p.st = 'walk'; p.t = 3;
            p.tx = Math.max(P_AREA.x0, Math.min(P_AREA.x1, p.x + (rnd() - 0.5) * 50)); p.ty = Math.max(P_AREA.y0, Math.min(P_AREA.y1, p.y + (rnd() - 0.5) * 16));
            p.dir = p.tx > p.x ? 1 : -1;
          }
          break;
        case 'walk': {
          const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
          if (d < 1.5) { // gobble a crumb if one's here, then look for the next
            const ci = this.crumbs.findIndex((c) => Math.hypot(c.x - p.x, c.y - p.y) < 3);
            if (ci >= 0) { this.crumbs.splice(ci, 1); this.hearts.push({ x: p.x, y: p.y - 12, t0: now }); if (now - this.lastCoo > 1.2 && avs.some((av) => av.self && Math.abs(av.x - p.x) < 160)) { this.lastCoo = now; SFX.coo(); } p.st = 'peck'; p.t = 0.6 + rnd() * 0.6; break; }
          }
          if (d < 1 || p.t < 0) { if (this.crumbs.length && rnd() < 0.8 && this.goCrumb(p)) break; p.st = 'peck'; p.t = 1.5 + rnd() * 3.5; if (rnd() < 0.15 && now - this.lastCoo > 4) { this.lastCoo = now; if (avs.some((av) => av.self && Math.abs(av.x - p.x) < 120)) SFX.coo(); } }
          else { const s = Math.min(d, (this.crumbs.length ? 26 : 16) * dt); p.x += (dx / d) * s; p.y += (dy / d) * s; if (Math.abs(dx) > 0.5) p.dir = dx > 0 ? 1 : -1; }
          break;
        }
        case 'fly':
          p.x += p.vx * dt; p.z += (50 + p.z * 1.2) * dt;
          if (p.z > 170) { p.st = 'away'; p.t = 7 + rnd() * 10; }
          break;
        case 'away':
          if (p.t < 0) {
            const [fx, fy] = FLOCKS[Math.floor(rnd() * FLOCKS.length)], cr = this.crumbs[Math.floor(rnd() * this.crumbs.length)];
            p.tx = cr ? cr.x + (rnd() - 0.5) * 20 : fx + (rnd() - 0.5) * 60; p.ty = cr ? cr.y : fy + (rnd() - 0.5) * 20;
            if (avs.some((av) => Math.abs(av.x - p.tx) < 60 && Math.abs(av.y - p.ty) < 30)) { p.t = 3; break; } // still busy there
            p.dir = rnd() < 0.5 ? 1 : -1; p.x = p.tx - p.dir * 160; p.y = p.ty; p.z = 160; p.st = 'land';
          }
          break;
        case 'land': {
          const d = p.tx - p.x;
          p.x += Math.sign(d) * Math.min(Math.abs(d), 80 * dt); p.z = Math.max(0, (Math.abs(p.tx - p.x) / 160) * 160);
          if (Math.abs(d) < 1) { p.z = 0; p.st = 'peck'; p.t = 2 + rnd() * 3; }
          break;
        }
      }
    }
  }

  /** The cat naps on a free desk or beanbag; if you take its spot it moves; on pomodoro breaks it roams. */
  private updateCat(room: Room, dt: number, now: number, avs: Avatar[]): void {
    const c = this.cat, rnd = () => h1(++this.k * 2.1), onBreak = !pomodoro().focus;
    const freePerch = () => { const free = PERCHES.map((_, i) => i).filter((i) => !room.inUse.has(PERCHES[i].spot) && i !== c.perch); return free.length ? free[Math.floor(rnd() * free.length)] : -1; };
    const goTo = (p: number) => { c.goal = p; c.st = 'walk'; c.tx = PERCHES[p].x; c.ty = PERCHES[p].sort + 8; c.dir = c.tx > c.x ? 1 : -1; };
    c.t -= dt;
    switch (c.st) {
      case 'sleep': {
        const kicked = room.inUse.has(PERCHES[c.perch].spot);
        if (kicked || (onBreak && c.t < 0) || c.t < -120) {
          if (kicked && avs.some((av) => av.self) && now - this.lastMeow > 3) { this.lastMeow = now; SFX.meow(); }
          c.y = PERCHES[c.perch].sort + 6; c.st = 'walk';
          if (onBreak) { c.goal = -1; c.tx = 80 + rnd() * 820; c.ty = 450 + rnd() * 150; c.t = 6; } else { const p = freePerch(); if (p >= 0) goTo(p); else { c.goal = -1; c.tx = 600 + rnd() * 100; c.ty = 600; } }
          c.dir = c.tx > c.x ? 1 : -1;
        }
        break;
      }
      case 'walk': {
        const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
        if (d < 1.5) {
          if (c.goal >= 0 && !room.inUse.has(PERCHES[c.goal].spot)) { c.st = 'hop'; c.hop0 = [c.x, c.y]; c.t = 0.45; }
          else if (onBreak) { c.tx = 80 + rnd() * 820; c.ty = 450 + rnd() * 150; c.dir = c.tx > c.x ? 1 : -1; if (rnd() < 0.3 && now - this.lastMeow > 6 && avs.some((av) => av.self && Math.abs(av.x - c.x) < 120)) { this.lastMeow = now; SFX.meow(); } }
          else { const p = freePerch(); if (p >= 0) goTo(p); }
        } else { const s = Math.min(d, 34 * dt); c.x += (dx / d) * s; c.y += (dy / d) * s; }
        break;
      }
      case 'hop': {
        const p = PERCHES[c.goal], u = 1 - Math.max(0, c.t) / 0.45;
        c.x = c.hop0[0] + (p.x - c.hop0[0]) * u; c.y = c.hop0[1] + (p.y - c.hop0[1]) * u - Math.sin(u * Math.PI) * 14;
        if (c.t <= 0) { c.st = 'sleep'; c.perch = c.goal; c.x = p.x; c.y = p.y; c.t = 20 + rnd() * 60; }
        break;
      }
    }
  }

  private updateVac(room: Room, dt: number, now: number, avs: Avatar[]): void {
    const v = this.vac, sp = 22;
    const nx = v.x + Math.cos(v.h) * sp * dt, ny = v.y + Math.sin(v.h) * sp * 0.6 * dt;
    const feet = avs.find((av) => Math.abs(av.x - nx) < 15 && Math.abs(av.y - ny) < 6 && av.use < 0);
    if (!walkable(room, nx, ny) || feet) {
      if (now - v.bumpT > 0.5) {
        v.bumpT = now;
        v.h = h1(++v.k * 2.3) * Math.PI * 2;
        if (feet?.self || avs.some((av) => av.self && Math.hypot(av.x - v.x, av.y - v.y) < 90)) SFX.beep();
      } else v.h += dt * 3; // keep turning until it's free
    } else { v.x = nx; v.y = ny; }
  }

  items(id: RoomId, now: number): Drawable[] {
    if (id === 'plaza') return [
      ...this.pigeons.map((p) => ({ y: p.y, draw: (a: number) => drawPigeon(p, a) })),
      ...this.crumbs.map((c) => ({ y: c.y - 1, draw: () => r(Math.round(c.x), Math.round(c.y), 1, 1, K.CRUMB) })),
      ...this.hearts.map((h) => ({ y: h.y + 40, draw: () => { const u = now - h.t0, x = Math.round(h.x) - 2, y = Math.round(h.y - u * 10); alpha(1 - u / 1.2, () => lit(() => { r(x, y, 2, 1, K.MAG); r(x + 3, y, 2, 1, K.MAG); r(x, y + 1, 5, 1, K.MAG); r(x + 1, y + 2, 3, 1, K.MAG); r(x + 2, y + 3, 1, 1, K.MAG); })); } })),
    ];
    if (id === 'lab') return [{ y: this.vac.y, draw: (a: number) => drawVac(this.vac, a, now) }];
    if (id === 'pier') return this.crabs.map((c) => ({ y: c.y, draw: (a: number) => {
      const x = Math.round(c.x), y = Math.round(c.y), sink = Math.round(c.hide * 5), leg = Math.floor(a * 12) % 2;
      if (c.hide >= 1) { r(x - 1, y - 1, 1, 1, K.EYE); r(x + 2, y - 1, 1, 1, K.EYE); return; }
      r(x - 5, y - 5 + sink, 10, 5 - Math.min(5, sink), [224, 96, 74]); r(x - 5, y - 5 + sink, 10, 1, [250, 140, 110]);
      if (sink < 3) { r(x - 7, y - 6 + sink, 2, 2, [224, 96, 74]); r(x + 5, y - 6 + sink, 2, 2, [224, 96, 74]); r(x - 2, y - 7 + sink, 1, 2, K.EYE); r(x + 2, y - 7 + sink, 1, 2, K.EYE); for (let k = 0; k < 3; k++) { r(x - 6 + k * 2, y - 1 + (leg + k) % 2, 1, 1, [180, 70, 50]); r(x + 2 + k * 2, y - 1 + (leg + k + 1) % 2, 1, 1, [180, 70, 50]); } }
    } }));
    if (id === 'den') { const c = this.cat; return [{ y: c.st === 'sleep' ? PERCHES[c.perch].sort : c.st === 'hop' ? PERCHES[c.goal].sort : c.y, draw: (a: number) => drawCat(c, a) }]; }
    return [];
  }
}
