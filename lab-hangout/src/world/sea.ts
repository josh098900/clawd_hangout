// THE SEA outside SARDINE 1's window (game/sub.ts is the map, world/sub.ts the cabin round the window). Drawn around wherever the sub
// is, in layers, clipped to the window's four panes:
//   1. the water (a strip of its colour by depth, stretched across) and, near the top, the sky over the surface
//   2. the still scenery, baked into 256 x 128 tiles the first time the window reaches them: the ground (sand, coral, rock, ooze), the
//      aquarium's wall and its SEA GATE, the Pier's legs and deck, a lost trolley, boulders, the reef's coral heads, THE LUCKY HERRING,
//      the cliff's ledges, the vents' chimneys, an anchor, and THE END OF THE SEA
//   3. what moves (only what's in view): sunbeams, the surface, the anglers' lines, kelp, the anemone, the clam, tube worms, the vents'
//      smoke, the buoys, the treasure, the sea life (game/sub.ts seaLife), marine snow, bubbles, the rush home
//   4. the dark (deeper = darker, with the floodlights' oval cut out of it), and then whatever glows in it
//   5. on the glass: the curious seal, the giant squid, the baby octopus, the ping's ring, the camera's flash, condensation
// At the dock (and going down, and coming up) it's the PEN instead: the moon pool's green water, the waterline on the glass, the sea gate.

import { AQ, K, SEA, type RGB } from '../engine/palette';
import { PX, r, disc, oval, ring, line, txt, tw, lit, alpha, G, Gd, M, shade, mk, withCtx } from '../engine/pixel';
import { clamp, h1 } from '../engine/math';
import {
  SEA_D, SPOTS, VENTS, WRECK, REEF_HEADS, GATE, sandAt, headAt, wreckTop, seabed, zoneAt, sunAt, clamOpen, inFlood, PING_S, SONAR_R,
  type Find, type Sighting,
} from '../game/sub';
import { anglerfish, babyOctopusOnGlass, clownfish, drawCatch, drawFind, dumbo, garibaldi, grouper, humpback, jelly, kelp, lanternfish, leopardShark, manta, moray, octopusRock, seaOtter, seahorse, seal, sealOnGlass, shoal, squidOnGlass, turtle, yetiCrab } from './sealife';

/** The window in the cabin (world px): four panes, two either side of the ladder's bulkhead (x 470-530). Its middle is where the sub is. */
export const WIN = { x0: 150, x1: 850, y0: 336, y1: 452, cx: 500, cy: 394 };
export const PANES: [number, number][] = [[150, 303], [317, 470], [530, 683], [697, 850]];
/** Clip the drawing to the panes. */
function panes(fn: () => void, pad = 0): void {
  const g = PX.ctx; g.save(); g.beginPath();
  for (const [x0, x1] of PANES) g.rect(x0 - pad, WIN.y0 - pad, x1 - x0 + pad * 2, WIN.y1 - WIN.y0 + pad * 2);
  g.clip();
  try { fn(); } finally { g.restore(); }
}

// ---------------------------------------------------------------- 1. the water ----------------------------------------------------------------
const STRIP_TOP = 160, STRIP_H = SEA_D + 360;
let waterStrip: HTMLCanvasElement | null = null;
/** The water's colour by depth, 1 px wide (y = depth + STRIP_TOP; above the surface it's left clear for the sky). */
function water(): HTMLCanvasElement {
  if (waterStrip) return waterStrip;
  const c = mk(1, STRIP_H), g = c.getContext('2d')!;
  for (let y = STRIP_TOP; y < STRIP_H; y++) {
    const d = y - STRIP_TOP, col = d < 60 ? M(SEA.W0, SEA.W1, d / 60) : d < 200 ? M(SEA.W1, SEA.W2, (d - 60) / 140) : M(SEA.W2, SEA.W3, clamp((d - 200) / 250, 0, 1));
    g.fillStyle = 'rgb(' + col.map(Math.round).join(',') + ')'; g.fillRect(0, y, 1, 1);
  }
  return (waterStrip = c);
}
/** How dark the sea is at depth y (0 clear .. 0.95), by day or night. */
export const darkAt = (y: number, day: number): number => clamp(1 - Math.pow(sunAt(y, day), 0.6) * 1.3, 0, 0.94);
const darkStrips = new Map<number, HTMLCanvasElement>();
function darkStrip(day: number): HTMLCanvasElement {
  const q = Math.round(day * 10) / 10, got = darkStrips.get(q); if (got) return got;
  const c = mk(1, STRIP_H), g = c.getContext('2d')!;
  for (let y = 0; y < STRIP_H; y++) { const d = y - STRIP_TOP, k = d < 0 ? 0 : darkAt(d, q); g.fillStyle = 'rgba(2,6,16,' + k.toFixed(3) + ')'; g.fillRect(0, y, 1, 1); }
  darkStrips.set(q, c); return c;
}
/** The floodlights' oval: cut out of the dark (white in the middle, fading out to its edge). */
let floodMask: HTMLCanvasElement | null = null;
const FW = 400, FH = 136;
function flood(): HTMLCanvasElement {
  if (floodMask) return floodMask;
  const c = mk(FW, FH), g = c.getContext('2d')!;
  g.translate(FW / 2, FH / 2); g.scale(1, FH / FW);
  const gr = g.createRadialGradient(0, 0, 10, 0, 0, FW / 2); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.92)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, FW / 2, 0, Math.PI * 2); g.fill();
  return (floodMask = c);
}
let over: HTMLCanvasElement | null = null;

// ---------------------------------------------------------------- 2. the still scenery, in tiles ----------------------------------------------------------------
const TW = 256, TH = 128, TOP = 128; // row 0 is 128 m of air over the surface
const tiles = new Map<number, HTMLCanvasElement | null>();
/** Is there anything to draw in this tile? (Open water: nothing.) */
function busyTile(x0: number, y0: number): boolean {
  if (x0 < 520) return true; // the gate, the Pier's legs
  let top = Infinity; for (let x = x0; x <= x0 + TW; x += 8) top = Math.min(top, seabed(x), sandAt(x));
  if (x0 + TW > 3280) top = Math.min(top, 880);
  return y0 + TH >= top - 40;
}
function tile(i: number, j: number): HTMLCanvasElement | null {
  const key = i * 64 + j;
  if (tiles.has(key)) return tiles.get(key)!;
  const x0 = i * TW, y0 = j * TH - TOP;
  let c: HTMLCanvasElement | null = null;
  if (busyTile(x0, y0)) {
    c = mk(TW, TH);
    const g = c.getContext('2d')!, d = PX.dim, e = PX.emit, f = PX.fl; PX.dim = 0; PX.emit = false; PX.fl = 0;
    try { withCtx(g, () => { g.translate(-x0, -y0); scenery(x0, y0, x0 + TW, y0 + TH); }); } finally { PX.dim = d; PX.emit = e; PX.fl = f; }
  }
  tiles.set(key, c);
  return c;
}
/** Everything that never moves, in sea coordinates, for the tile (x0, y0)-(x1, y1). */
function scenery(x0: number, y0: number, x1: number, y1: number): void {
  const inX = (a: number, b: number) => b >= x0 && a <= x1;
  // the ground, column by column: sand in the shallows, rubble on the reef, grey silt by the wreck, rock down the cliff, ooze in the deep
  for (let x = x0 - (x0 % 2); x < x1; x += 2) {
    const top = sandAt(x); if (top > y1) continue;
    const z = zoneAt(x), cliff = (x >= 2250 && x < 2340) || x >= 3288;
    const base: RGB = cliff ? SEA.CLIFF : z === 'dropoff' || z === 'trench' ? SEA.OOZE : z === 'wreck' ? M(SEA.SAND, SEA.OOZE, 0.45) : SEA.SAND;
    r(x, top, 2, y1 - top, shade(base, 0.72)); r(x, top, 2, 9, base); r(x, top + 9, 2, 8, shade(base, 0.86));
    r(x, top, 2, 1, cliff ? SEA.CLIFF_HI : z === 'dropoff' || z === 'trench' ? SEA.OOZE_HI : SEA.SAND_HI);
    if (cliff) { if (h1(x * 0.7) > 0.6) r(x, top + 3 + Math.floor(h1(x) * 20), 2, 2, SEA.ROCK_DK); }
    else if (h1(x * 1.3) > 0.7) r(x, top + 2 + Math.floor(h1(x * 3.1) * 6), 1, 1, h1(x) > 0.5 ? shade(base, 0.7) : M(base, K.WHITE, 0.3));
  }
  // the aquarium's wall and its SEA GATE (the sub comes out of it and goes back in), the concrete going on under the sand
  if (inX(-800, 16)) {
    r(-800, -40, 814, 260, SEA.CONCRETE); r(12, -40, 2, 260, SEA.CONCRETE_DK); for (let y = -36; y < 220; y += 22) r(-800, y, 814, 1, SEA.CONCRETE_DK);
    for (let x = -780; x < 12; x += 40) for (let y = -30; y < 200; y += 44) r(x + ((y / 44) % 2 ? 20 : 0), y, 1, 22, SEA.CONCRETE_DK);
    r(2, GATE.y - 16, 12, 34, [18, 30, 36]); r(0, GATE.y - 18, 14, 2, [150, 156, 166]); r(0, GATE.y + 18, 14, 2, [150, 156, 166]); // the gate's opening
    for (let y = GATE.y - 14; y < GATE.y + 16; y += 6) r(3, y, 10, 1, [60, 70, 76]);
    alpha(0.5, () => r(-40, -2, 54, 3, [200, 236, 240]));
  }
  // the Pier's legs (with mussels and weed round the waterline), their cross-braces, and the deck over the water
  if (inX(40, 380)) {
    r(60, -34, 300, 8, SEA.PILE); r(60, -34, 300, 1, SEA.PILE_HI); r(60, -27, 300, 1, shade(SEA.PILE, 0.7));
    SPOTS.pilings.forEach((px, i) => {
      const b = sandAt(px);
      r(px - 3, -30, 7, b + 30, SEA.PILE); r(px - 3, -30, 1, b + 30, SEA.PILE_HI); r(px + 3, -30, 1, b + 30, shade(SEA.PILE, 0.7));
      for (let k = 0; k < 14; k++) r(px - 3 + (k % 3) * 2, 2 + ((k * 7) % 22), 2, 2, SEA.MUSSEL); // mussels
      for (let k = 0; k < 4; k++) r(px - 4 + ((k * 5) % 9), 6 + k * 7, 2, 3, SEA.KELP_DK); // weed
      if (i < SPOTS.pilings.length - 1) { const nx = SPOTS.pilings[i + 1]; line(px + 3, 10, nx - 3, 30, shade(SEA.PILE, 0.8), 2); line(px + 3, 30, nx - 3, 10, shade(SEA.PILE, 0.8), 2); }
    });
  }
  // a lost shopping trolley, on its side
  if (inX(SPOTS.trolley - 14, SPOTS.trolley + 14)) {
    const tx = SPOTS.trolley, ty = Math.round(sandAt(tx)) - 1, m: RGB = [150, 160, 170];
    for (let k = 0; k < 6; k++) r(tx - 10 + k * 4, ty - 9, 1, 9, m); r(tx - 10, ty - 9, 21, 1, m); r(tx - 10, ty - 1, 21, 1, m); r(tx - 12, ty - 12, 4, 3, [200, 60, 60]); disc(tx + 9, ty + 1, 1, [40, 40, 44]);
  }
  // boulders in the kelp forest, with urchins
  for (const bx of [572, 690, 815, 948, 1046]) if (inX(bx - 14, bx + 14)) {
    const by = Math.round(sandAt(bx)); oval(bx, by - 2, 11, 6, SEA.ROCK); oval(bx - 2, by - 4, 8, 4, SEA.ROCK_HI); r(bx - 10, by + 2, 20, 2, SEA.ROCK_DK);
    for (let k = 0; k < 3; k++) { const ux = bx - 7 + k * 6; r(ux, by - 5, 3, 3, [40, 30, 60]); r(ux - 1, by - 6, 1, 1, [40, 30, 60]); r(ux + 3, by - 6, 1, 1, [40, 30, 60]); r(ux + 1, by - 7, 1, 1, [40, 30, 60]); }
  }
  // THE CORAL REEF: each head a different coral (brain, table, fan, staghorn), smaller corals and sea stars on the floor between
  REEF_HEADS.forEach(([cx, hw], i) => {
    if (!inX(cx - hw - 4, cx + hw + 4)) return;
    const col = ([[214, 120, 170], [236, 150, 70], [150, 90, 200], [240, 200, 80], [70, 180, 170]] as RGB[])[i];
    for (let x = cx - hw; x < cx + hw; x += 2) {
      const top = headAt(x), s = sandAt(x); if (top >= s) continue;
      r(x, top, 2, s - top + 2, shade(col, 0.8)); r(x, top, 2, 2, M(col, K.WHITE, 0.25)); if (x < cx - hw * 0.4) r(x, top + 2, 2, 3, shade(col, 0.95));
      for (let y = top + 4; y < s - 2; y += 5) if (h1(x * 1.7 + y * 0.31) > 0.72) r(x, y, 1, 1, M(col, K.WHITE, 0.45)); // polyps
      if (h1(x * 0.9 + i) > 0.86) r(x, top - 2, 1, 2, M(col, K.WHITE, 0.3));
      if (i === 0 || i === 2) { for (let y = top + 3; y < s; y += 4) if (((x >> 1) + (y >> 2)) % 3 === 0) r(x, y, 2, 1, shade(col, 0.6)); } // brain coral's ridges
      else if (i === 1 || i === 4) { if (x % 6 === 0) r(x, top + 3, 2, s - top - 3, shade(col, 0.65)); } // table coral's stalks
      else if (x % 4 === 0) r(x, top - 3 - ((x >> 2) % 3), 1, 4, col); // staghorn tips
    }
    if (i === 2) for (let f = 0; f < 3; f++) { const fx = cx - 20 + f * 18, fy = Math.round(headAt(fx)); for (let j = 0; j < 12; j++) r(fx - 6 + j, fy - 12 + Math.abs(j - 6), 1, 12 - Math.abs(j - 6), M([150, 70, 190], K.WHITE, 0.1 * (j % 2))); } // sea fans
  });
  for (let k = 0; k < 16; k++) { const x = 1150 + Math.floor(h1(k * 7.7) * 540); if (!inX(x - 4, x + 4) || headAt(x) < Infinity) continue; const y = Math.round(sandAt(x)); if (k % 3 === 0) { r(x - 3, y - 1, 7, 1, [255, 140, 80]); r(x, y - 4, 1, 7, [255, 140, 80]); r(x - 1, y - 2, 3, 3, [255, 140, 80]); } else r(x - 2, y - 4 - (k % 4), 4, 4 + (k % 4), ([[255, 120, 140], [120, 200, 255], [255, 220, 90]] as RGB[])[k % 3]); }
  if (inX(SPOTS.moray - 6, SPOTS.moray + 6)) { const my = Math.round(seabed(SPOTS.moray)) + 6; oval(SPOTS.moray, my, 4, 3, [20, 16, 30]); r(SPOTS.moray - 4, my - 4, 8, 1, [150, 110, 170]); }
  if (inX(SPOTS.clam - 12, SPOTS.clam + 12)) { const cy = Math.round(sandAt(SPOTS.clam)); oval(SPOTS.clam, cy - 2, 10, 3, [120, 150, 170]); }
  // THE LUCKY HERRING: the hull on the sand (rust streaks, portholes, a rail), the funnel, the torn hold, the bow with its name, the grouper's hole
  if (inX(WRECK.x0 - 4, WRECK.x1 + 30)) {
    for (let x = WRECK.x0; x <= WRECK.x1; x++) {
      const top = wreckTop(x), s = sandAt(x); if (top >= s) continue;
      const hold = x >= WRECK.stern1 && x < WRECK.hold1;
      if (hold) { r(x, top, 1, s - top, [20, 18, 22]); continue; }
      r(x, top, 1, s - top + 1, SEA.HULL); if (x % 7 === 0) r(x, top + 2, 1, s - top - 2, SEA.RUST); if (x % 11 === 3) r(x, top + 4, 1, 10, SEA.RUST_DK);
      r(x, top, 1, 1, SEA.HULL_HI);
      if (x > WRECK.x0 + 10 && x < WRECK.x1 - 10 && (x < WRECK.funnel0 || x > WRECK.funnel1) && x % 6 === 0) r(x, top - 5, 1, 5, [90, 80, 70]); // the rail's posts
    }
    for (let x = WRECK.x0 + 12; x < WRECK.x1 - 10; x++) if ((x < WRECK.stern1 || x >= WRECK.hold1) && (x < WRECK.funnel0 || x > WRECK.funnel1)) r(x, wreckTop(x) - 5, 1, 1, [110, 96, 80]);
    r(WRECK.funnel0, WRECK.funnelTop, WRECK.funnel1 - WRECK.funnel0, WRECK.deck - WRECK.funnelTop, SEA.RUST); r(WRECK.funnel0, WRECK.funnelTop + 4, WRECK.funnel1 - WRECK.funnel0, 3, [200, 60, 50]); r(WRECK.funnel0, WRECK.funnelTop, 2, WRECK.deck - WRECK.funnelTop, SEA.RUST_HI);
    for (let px = WRECK.x0 + 16; px < WRECK.x1 - 14; px += 13) if (px < WRECK.stern1 - 4 || px > WRECK.hold1 + 4) { const py = Math.round(wreckTop(px)) + 10; ring(px, py, 3, 3, SEA.RUST_HI); disc(px, py, 2, [16, 20, 26]); }
    for (let k = 0; k < 10; k++) { const x = WRECK.stern1 + Math.floor(h1(k * 3.3) * 5), y = Math.round(wreckTop(WRECK.stern1 - 1)) + k * 3; r(x, y, 3, 2, SEA.HULL); r(WRECK.hold1 - 3 + Math.floor(h1(k * 1.9) * 4), Math.round(wreckTop(WRECK.hold1)) + k * 3, 3, 2, SEA.HULL); } // the torn edges
    const nx = WRECK.hold1 + 14, ny = Math.round(wreckTop(nx)) + 18; txt('LUCKY HERRING', nx, ny, [200, 170, 120]);
    disc(SPOTS.grouper.x, SPOTS.grouper.y, 7, [16, 14, 18]); ring(SPOTS.grouper.x, SPOTS.grouper.y, 8, 8, SEA.RUST_DK);
    for (let k = 0; k < 8; k++) r(WRECK.x1 - 6 - k, Math.round(wreckTop(WRECK.x1 - 6)) + 4 + k * 3, 2, 2, [80, 70, 60]); // the anchor chain down the bow
  }
  // the cliff: sponges and sea whips on its ledges
  if (inX(2240, 2350)) for (const [lx, ly] of SPOTS.ledges) { disc(lx - 6, ly - 3, 3, SEA.SPONGE); disc(lx + 4, ly - 2, 2, M(SEA.SPONGE, K.WHITE, 0.2)); for (let j = 0; j < 10; j++) r(lx + 8 + Math.round(Math.sin(j * 0.5)), ly - 1 - j, 1, 1, SEA.WHIP); }
  // the vents' chimneys and the tube worms' white tubes round them
  for (const [vx, hw, h] of VENTS) if (inX(vx - hw - 12, vx + hw + 12)) {
    const g = Math.round(sandAt(vx));
    for (let j = 0; j < h; j++) { const w = Math.round(hw * (1 - j / (h * 1.6))) + (j % 5 === 2 ? 1 : 0); r(vx - w, g - j, w * 2 + 1, 1, j % 4 === 0 ? SEA.VENT_HI : SEA.VENT); }
    for (let k = 0; k < 6; k++) { const tx = vx - hw - 8 + k * 3 + (k > 2 ? hw * 2 + 6 : 0); r(tx, g - 6 - (k % 3), 1, 6 + (k % 3), [230, 226, 214]); }
  }
  // a lost anchor, and THE END OF THE SEA
  if (inX(SPOTS.anchor - 14, SPOTS.anchor + 14)) { const ax = SPOTS.anchor, ay = Math.round(sandAt(ax)); const m: RGB = [90, 94, 100]; r(ax - 1, ay - 16, 3, 14, m); r(ax - 7, ay - 14, 15, 2, m); r(ax - 8, ay - 3, 17, 2, m); r(ax - 9, ay - 5, 2, 3, m); r(ax + 8, ay - 5, 2, 3, m); ring(ax, ay - 18, 2, 2, m); }
  if (inX(SPOTS.sign.x - 40, SPOTS.sign.x + 10)) {
    const sx = SPOTS.sign.x - 34, sy = SPOTS.sign.y;
    r(sx + 32, sy - 4, 3, 22, [110, 80, 50]); r(sx - 2, sy - 2, 70, 22, [150, 110, 70]); r(sx - 2, sy - 2, 70, 1, [190, 150, 100]);
    for (const [s2, dy] of [['YOU HAVE REACHED', 1], ['THE END OF THE SEA.', 8], ['PLEASE TURN AROUND', 14]] as [string, number][]) txt(s2, sx + 33 - tw(s2) / 2, sy + dy, [250, 240, 210]);
  }
}

// ---------------------------------------------------------------- the view ----------------------------------------------------------------
/** Everything the window needs to draw the sea round the sub. */
export interface SeaView {
  /** The sub (the window's middle), and its velocity. */
  x: number; y: number; vx: number; vy: number;
  /** The dive clock (s), the dive, the Square's dayness, and the animation clock. */
  T: number; n: number; day: number; a: number;
  /** The floodlights (really on: not in a LIGHTS OUT), and when they came on (dive clock). */
  lamps: boolean; lampT: number;
  life: Sighting[]; finds: Find[]; got: number;
  /** The last sonar ping (dive clock, and where the sub was). */
  ping: { T: number; x: number; y: number } | null;
  /** MAP THE REEF's buoys, and which are mapped (bits). */
  buoys: { x: number; y: number }[]; mapped: number;
  /** Rain on the surface, a storm's flash, snow falling on it. */
  rain: boolean; flashK: number; snow: boolean;
  halloween: boolean; winter: boolean;
}
/** How much a hidden creature shows: 1 for a few seconds after a ping reaches it, fading. */
function pinged(v: SeaView, x: number, y: number): number {
  const p = v.ping; if (!p || Math.hypot(x - p.x, y - p.y) > SONAR_R) return 0;
  const u = v.T - p.T; return u < 0 ? 0 : u < PING_S - 1 ? 1 : clamp(PING_S - u, 0, 1);
}
/** The sea, round the sub: layers 1-4 (the glass comes after, in drawGlass). Draws into the world at the window. */
export function drawSea(v: SeaView): void {
  const a = v.a, ox = WIN.cx - v.x, oy = WIN.cy - v.y, X = (x: number) => x + ox, Y = (y: number) => y + oy;
  const top = v.y - (WIN.cy - WIN.y0), bot = v.y + (WIN.y1 - WIN.cy), left = v.x - (WIN.cx - WIN.x0), right = v.x + (WIN.x1 - WIN.cx);
  const seen = (x: number, pad = 20) => x > left - pad && x < right + pad;
  const d = PX.dim; PX.dim = 0;
  try { panes(() => {
    // 1. the water, and the sky above the surface
    PX.ctx.drawImage(water(), 0, Math.max(0, top + STRIP_TOP), 1, WIN.y1 - WIN.y0, WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0);
    if (top < 0) sky(v, Y(0));
    if (top < 6) surface(v, Y(0), a);
    // sunbeams slanting down through the shallows
    if (top < 150 && v.day > 0.2) alpha(0.07 * v.day, () => lit(() => { for (let k = 0; k < 6; k++) { const bx = Math.round(((k * 131 - v.x * 0.4 + a * 3) % 900 + 900) % 900) + WIN.x0 - 100; for (let j = 0; j < 30; j++) r(bx + j * 3, Y(0) + j * 5, 6, 5, [220, 250, 250]); } }));
    // 2. the still scenery
    const i0 = Math.floor(left / TW), i1 = Math.floor(right / TW), j0 = Math.floor((top + TOP) / TH), j1 = Math.floor((bot + TOP) / TH);
    for (let i = Math.max(-3, i0); i <= i1; i++) for (let j = Math.max(0, j0); j <= j1; j++) { const t = tile(i, j); if (t) PX.ctx.drawImage(t, Math.round(X(i * TW)), Math.round(Y(j * TH - TOP))); }
    // 3. what moves
    moving(v, X, Y, seen, a);
    // 4. the dark, with the floodlights' oval cut out; then whatever glows
    const dk = darkAt(v.y, v.day);
    if (dk > 0.02 || v.lamps) {
      if (!over) over = mk(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0);
      const g = over.getContext('2d')!; g.clearRect(0, 0, over.width, over.height);
      g.drawImage(darkStrip(v.day), 0, top + STRIP_TOP, 1, over.height, 0, 0, over.width, over.height);
      if (v.lamps) { const warm = clamp((v.T - v.lampT) / 0.4, 0, 1), flick = warm < 1 && Math.floor(a * 30) % 3 === 0 ? 0.3 : 1; g.globalCompositeOperation = 'destination-out'; g.globalAlpha = warm * flick; g.drawImage(flood(), over.width / 2 - FW / 2, over.height / 2 + 8 - FH / 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      PX.ctx.drawImage(over, WIN.x0, WIN.y0);
    }
    if (v.lamps && v.y > 60) { G(WIN.cx - 170, WIN.cy - 40, 340, 96, SEA.FLOOD, 0.05 + 0.04 * clamp(v.y / 300, 0, 1)); }
    glows(v, X, Y, seen, a);
  }); } finally { PX.dim = d; }
}
function sky(v: SeaView, sy: number): void {
  const day = v.day, top = WIN.y0, h = Math.max(0, sy - top);
  if (h <= 0) return;
  const c = M(SEA.SKY_N, SEA.SKY, day);
  lit(() => { r(WIN.x0, top, WIN.x1 - WIN.x0, h, c); r(WIN.x0, sy - 3, WIN.x1 - WIN.x0, 3, M(c, K.WHITE, 0.25)); if (day < 0.4) for (let k = 0; k < 14; k++) { const x = WIN.x0 + Math.floor(h1(k * 5.1) * 700), y = top + Math.floor(h1(k * 2.3) * h); if (y < sy - 4) r(x, y, 1, 1, [230, 230, 250]); } });
  if (v.flashK > 0) alpha(v.flashK * 0.6, () => lit(() => r(WIN.x0, top, WIN.x1 - WIN.x0, h, K.WHITE)));
  if (v.rain) lit(() => { for (let k = 0; k < 30; k++) { const x = WIN.x0 + Math.floor(((h1(k) * 700 + v.a * 60) % 700)), y = top + Math.floor(((h1(k * 3) * h + v.a * 140) % Math.max(1, h))); r(x, y, 1, 3, [190, 210, 230]); } });
  if (v.snow) lit(() => { for (let k = 0; k < 20; k++) { const x = WIN.x0 + Math.floor(((h1(k) * 700 + Math.sin(v.a + k) * 8) % 700)), y = top + Math.floor(((h1(k * 3) * h + v.a * 16) % Math.max(1, h))); r(x, y, 1, 1, K.WHITE); } });
}
/** The underside of the surface: a bright wobbling line, and rings where rain lands. */
function surface(v: SeaView, sy: number, a: number): void {
  lit(() => { for (let x = WIN.x0; x < WIN.x1; x += 4) { const w = Math.round(Math.sin(x * 0.07 + a * 2.2) * 1.2); r(x, sy + w, 4, 2, [200, 240, 245]); r(x, sy + 2 + w, 4, 1, [120, 200, 214]); } });
  if (v.rain) lit(() => { for (let k = 0; k < 8; k++) { const q = (a * 1.3 + k * 0.37) % 1, x = WIN.x0 + Math.floor(h1(k * 9.1 + Math.floor(a * 1.3 + k * 0.37)) * 700); ring(x, sy + 2, Math.round(1 + q * 5), 1, [220, 245, 250]); } });
}
/** Layer 3: the scenery that moves, the treasure, the buoys, and the sea life. */
function moving(v: SeaView, X: (x: number) => number, Y: (y: number) => number, seen: (x: number, pad?: number) => boolean, a: number): void {
  // the anglers' lines from the Pier, hooks and bait bobbing
  for (const lx of SPOTS.lines) if (seen(lx)) { const bob = Math.sin(a * 1.1 + lx) * 2, len = 14 + (lx % 13); lit(() => r(Math.round(X(lx)), Math.round(Y(-2)), 1, Math.round(len + bob), [220, 220, 230])); r(Math.round(X(lx)) - 1, Math.round(Y(len + bob - 2)), 2, 3, [150, 156, 166]); r(Math.round(X(lx)) - 1, Math.round(Y(len + bob)), 3, 2, [230, 150, 120]); r(Math.round(X(lx)) - 2, Math.round(Y(-3)), 4, 2, [230, 60, 60]); }
  // kelp, swaying (a stalk's seahorse is drawn with the sea life)
  SPOTS.kelp.forEach((kx, i) => { if (!seen(kx, 30)) return; const len = 44 + ((i * 37) % 50); kelp(Math.round(X(kx)), Math.round(Y(sandAt(kx))), len, a, i * 1.7, true); });
  // the anemone (the clownfish's home), the giant clam, the tube worms' plumes, the vents' smoke
  if (seen(SPOTS.anemone)) { const ax = Math.round(X(SPOTS.anemone)), ay = Math.round(Y(seabed(SPOTS.anemone))); for (let t = 0; t < 9; t++) { const sw = Math.round(Math.sin(a * 1.5 + t) * 2); r(ax - 8 + t * 2 + sw, ay - 8 + Math.abs(t - 4), 1, 8 - Math.abs(t - 4), [255, 150, 200]); r(ax - 8 + t * 2 + sw, ay - 8 + Math.abs(t - 4), 1, 1, [255, 220, 240]); } r(ax - 6, ay - 2, 13, 3, [200, 90, 140]); }
  if (seen(SPOTS.clam)) { const cx = Math.round(X(SPOTS.clam)), cy = Math.round(Y(sandAt(SPOTS.clam))), open = clamOpen(v.T) ? 1 : 0; r(cx - 9, cy - 5, 18, 3, [150, 180, 196]); r(cx - 9, cy - 5 - open * 4, 18, 2, [170, 200, 214]); if (open) { r(cx - 8, cy - 7, 16, 2, [230, 140, 170]); } for (let k = 0; k < 5; k++) r(cx - 8 + k * 4, cy - 6 - open * 4, 1, 1, [100, 130, 150]); }
  for (const [vx, hw, h] of VENTS) if (seen(vx, 60)) {
    const g = sandAt(vx);
    for (let k = 0; k < 6; k++) { const tx = vx - hw - 8 + k * 3 + (k > 2 ? hw * 2 + 6 : 0), ty = g - 7 - (k % 3); r(Math.round(X(tx)) - 1, Math.round(Y(ty)) - 2, 3, 2, (a * 2 + k) % 3 < 1.5 ? SEA.WORM : SEA.WORM_HI); }
    for (let k = 0; k < 10; k++) { // (a black smoker: puffs billowing up, smoky at the vent and thinning into the water as they drift off)
      const q = (a * 0.3 + k / 10) % 1, px = Math.round(X(vx + Math.sin(k * 1.3 + a * 0.8) * 3 * (1 + q * 2) + q * 16)), py = Math.round(Y(g - h - q * 70)), rr = Math.round(3 + q * 9), c = M([40, 36, 36], [74, 80, 92], q);
      alpha(0.7 * (1 - q) ** 1.3, () => { disc(px, py, rr, c); disc(px + Math.round(rr * 0.5), py + Math.round(rr * 0.3), Math.max(2, Math.round(rr * 0.7)), c); });
    }
  }
  // reef fish: little schools in bright colours, darting round the coral heads
  REEF_HEADS.forEach(([cx, , top], i) => { if (!seen(cx, 60)) return; const col = ([[255, 214, 60], [90, 200, 255], [255, 120, 160], [140, 255, 170], [255, 160, 60]] as RGB[])[i]; for (let k = 0; k < 6; k++) { const an = a * (0.6 + k * 0.08) + k * 1.1 + i, fx = Math.round(X(cx + Math.cos(an) * (22 + k * 3))), fy = Math.round(Y(top - 8 - k * 2 + Math.sin(an * 1.7) * 5)), d2 = Math.sin(an) < 0 ? 1 : -1; r(fx, fy, 3, 2, col); r(fx + (d2 > 0 ? -1 : 3), fy, 1, 2, shade(col, 0.7)); } });
  // MAP THE REEF's buoys: a yellow float on a chain, a green light once it's mapped
  v.buoys.forEach((b, i) => { if (!seen(b.x)) return; const bx = Math.round(X(b.x)), by = Math.round(Y(b.y + Math.sin(a + i) * 1.5)), g = Math.round(Y(sandAt(b.x))); for (let y = by + 4; y < g; y += 3) r(bx, y, 1, 2, [120, 120, 130]); disc(bx, by, 4, [255, 214, 60]); r(bx - 3, by - 3, 3, 1, [255, 240, 170]); if ((v.mapped >>> i) & 1) lit(() => r(bx - 1, by - 6, 3, 2, [120, 255, 150])); });
  // the treasure (not yet in the bin)
  for (const f of v.finds) if (!((v.got >>> f.i) & 1) && seen(f.x)) { if (f.kind === 'pearl' && !clamOpen(v.T)) continue; drawFind(f.kind, X(f.x), Y(f.y), a); }
  // the sea life
  for (const s of v.life) {
    if (!seen(s.x, 110)) continue;
    const x = X(s.x), y = Y(s.y);
    switch (s.id) {
      case 'jelly': jelly(x, y, [200, 220, 255], a, (s.k ?? 0) * 1.3, 0.9); break;
      case 'sardines': shoal(x, y, 36, a, 1.1); break;
      case 'otter': seaOtter(x, y, s.d, a); break;
      case 'seal': seal(x, y, s.d, a); break;
      case 'seahorse': seahorse(x, y, a, pinged(v, s.x, s.y)); break;
      case 'garibaldi': garibaldi(x, y, s.d, a); break;
      case 'leopard': leopardShark(x, y, s.d, a); break;
      case 'turtle': turtle(x, y, s.d, a); break;
      case 'clownfish': clownfish(x, y, s.d, a); clownfish(x - 5, y + 3, -s.d, a + 1); break;
      case 'octopus': octopusRock(x, y, a, pinged(v, s.x, s.y)); break;
      case 'moray': moray(Math.round(x) - 4, Math.round(y), a, s.k ?? 1); break;
      case 'manta': manta(x, y, s.d, a); break;
      case 'grouper': grouper(Math.round(x) - 6, Math.round(y), a, s.k ?? 1); break;
      case 'swordfish': drawCatch('SWORDFISH', x, y, s.d, 2.4, a); break;
      case 'whale': humpback(x, y, s.d, a); break;
      case 'dumbo': dumbo(x, y, s.d, a); break;
      case 'yeti': yetiCrab(x, y, s.d, a); break;
      case 'angler': if (s.k === 1) anglerfish(x, y, s.d, a, true); break;
    }
  }
  // Halloween: the wreck's portholes glow green, and a ghostly captain waves from its deck now and then
  if (v.halloween && seen(WRECK.x0, 200)) { for (let px = WRECK.x0 + 16; px < WRECK.x1 - 14; px += 13) if (px < WRECK.stern1 - 4 || px > WRECK.hold1 + 4) { const py = Math.round(wreckTop(px)) + 10; lit(() => disc(Math.round(X(px)), Math.round(Y(py)), 2, [120, 255, 140])); Gd(X(px), Y(py), 6, [120, 255, 140], 0.3); } if ((v.T % 60) < 6) alpha(0.6, () => { const gx = Math.round(X(1990)), gy = Math.round(Y(WRECK.bowDeck - 12)); r(gx - 3, gy - 8, 7, 9, [220, 240, 230]); r(gx - 1, gy - 6, 1, 2, [20, 30, 30]); r(gx + 2, gy - 6, 1, 2, [20, 30, 30]); r(gx + 4, gy - 12 + (Math.floor(v.a * 4) % 2), 2, 5, [220, 240, 230]); }); }
  // marine snow in the deep, drifting up past the glass (it moves the other way to the sub)
  if (v.y > 140) { const k = clamp((v.y - 140) / 200, 0, 1); alpha(0.5 * k, () => { for (let i = 0; i < 34; i++) { const sx = WIN.x0 + (((h1(i) * 700 - v.x * 1.1) % 700) + 700) % 700, sy = WIN.y0 + (((h1(i * 3.3) * 116 - v.y * 1.1 - v.T * 3) % 116) + 116) % 116; r(Math.round(sx), Math.round(sy), 1, 1, v.lamps && inFlood({ x: v.x + sx - WIN.cx, y: v.y + sy - WIN.cy }, v) ? [240, 250, 255] : [150, 170, 190]); } }); }
  // bubbles: up past the glass as the sub dives, down as it rises; streaks when it's flat out
  const sp = Math.hypot(v.vx, v.vy);
  if (Math.abs(v.vy) > 6) lit(() => { for (let i = 0; i < 14; i++) { const q = ((a * (0.8 + h1(i)) + h1(i * 2)) % 1), bx = WIN.x0 + Math.floor(h1(i * 5.5) * 700), by = v.vy > 0 ? WIN.y1 - q * 116 : WIN.y0 + q * 116; r(bx, Math.round(by), 2, 2, [220, 250, 255]); } });
  if (sp > 50) lit(() => alpha(0.5, () => { for (let i = 0; i < 22; i++) { const q = (a * 3 + h1(i)) % 1, y = WIN.y0 + Math.floor(h1(i * 7) * 116); r(Math.round(v.vx < 0 ? WIN.x0 + q * 700 : WIN.x1 - q * 700), y, 18, 1, [230, 245, 250]); } }));
}
/** Layer 4b: what glows in the dark (drawn over it): the lanternfish, the anglerfish's lure, the vents' heat, the floodlights' haze. */
function glows(v: SeaView, X: (x: number) => number, Y: (y: number) => number, seen: (x: number, pad?: number) => boolean, a: number): void {
  for (const s of v.life) {
    if (!seen(s.x, 40)) continue;
    if (s.id === 'lantern') lanternfish(X(s.x), Y(s.y), a, s.k ?? 0);
    if (s.id === 'angler' && s.k === 0) anglerfish(X(s.x), Y(s.y), s.d, a, false);
    if (s.id === 'jelly' && v.day < 0.4) Gd(X(s.x), Y(s.y), 6, [200, 220, 255], 0.2);
  }
  for (const [vx, , h] of VENTS) if (seen(vx, 30)) { const g = sandAt(vx); lit(() => r(Math.round(X(vx)) - 1, Math.round(Y(g - h)) - 1, 3, 2, [255, 140, 60])); Gd(X(vx), Y(g - h), 8, [255, 120, 40], 0.35); }
}

// ---------------------------------------------------------------- 5. on the glass ----------------------------------------------------------------
/** What's on the glass (seconds since it came, -1 = not there). */
export interface GlassView { a: number; seal: number; squid: number; octo: number; flash: number; ping: number; wet: number; lightsOut: boolean; ghost: boolean }
export function drawGlass(gv: GlassView): void {
  const a = gv.a, d = PX.dim; PX.dim = 0;
  try { panes(() => {
    // condensation, and drips running down the glass (lots, just after it surfaces)
    alpha(0.28 + 0.4 * gv.wet, () => lit(() => { for (let i = 0; i < 12 + Math.round(gv.wet * 30); i++) { const x = WIN.x0 + Math.floor(h1(i * 4.4) * 700), q = gv.wet > 0 ? (a * (0.4 + h1(i)) + h1(i * 2)) % 1 : 0.1 + h1(i * 9) * 0.8, y = WIN.y0 + Math.floor(q * 116); r(x, y, 1, 2 + (i % 3), [220, 240, 250]); } }));
    // the reflection of the cabin's lamps, faint
    alpha(0.07, () => lit(() => { for (const [x0] of PANES) { r(x0 + 10, WIN.y0 + 6, 18, 2, [255, 230, 190]); r(x0 + 8, WIN.y0 + 9, 2, 6, [255, 230, 190]); } }));
    if (gv.seal >= 0) sealOnGlass(WIN.cx + 118, WIN.cy + 4, a, gv.seal);
    if (gv.squid >= 0) squidOnGlass(WIN.x0, WIN.y0, WIN.x1, WIN.y1, a, gv.squid);
    if (gv.octo >= 0) babyOctopusOnGlass(WIN.cx - 150, WIN.cy - 8, a, gv.octo);
    if (gv.ping >= 0 && gv.ping < 1.4) { const u = gv.ping / 1.4, rx = Math.round(20 + u * 380), ry = Math.round(8 + u * 70); alpha(0.7 * (1 - u), () => lit(() => { ring(WIN.cx, WIN.cy, rx, ry, [140, 255, 180]); ring(WIN.cx, WIN.cy, rx - 3, Math.max(1, ry - 1), [80, 200, 130]); })); }
    if (gv.flash >= 0 && gv.flash < 0.35) alpha(1 - gv.flash / 0.35, () => lit(() => r(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, [250, 252, 255])));
    if (gv.lightsOut) alpha(0.25, () => r(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, [90, 0, 0]));
  }); } finally { PX.dim = d; }
  if (gv.flash >= 0 && gv.flash < 0.35) G(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, K.WHITE, 0.5 * (1 - gv.flash / 0.35));
  if (gv.octo >= 0) Gd(WIN.cx - 150, WIN.cy - 8, 16, [255, 150, 180], 0.15);
}

// ---------------------------------------------------------------- the pen ----------------------------------------------------------------
/** The view at the dock (and diving out of it, and coming back up): `wl` = where the waterline is on the glass (world y; above the window = all under),
 *  `slide` = how far the pen's walls have gone up past the window (sinking), `gate` = the sea gate 0 shut .. 1 open, `boil` = bubbles. */
export interface PenView { a: number; day: number; wl: number; slide: number; gate: number; boil: number }
export function drawPen(p: PenView): void {
  const a = p.a, d = PX.dim; PX.dim = 0;
  try { panes(() => {
    const top = WIN.y0, h = WIN.y1 - WIN.y0, wl = Math.round(p.wl), sl = Math.round(p.slide);
    // under the water: the pool's green, the pen's tiled wall, the sea gate at its bottom (and the blue sea through it as it opens)
    for (let y = top; y < WIN.y1; y += 2) r(WIN.x0, y, WIN.x1 - WIN.x0, 2, M(AQ.POOL2, AQ.POOL, clamp((y - top + sl) / 200, 0, 1)));
    for (let y = top - (sl % 16); y < WIN.y1; y += 16) r(WIN.x0, y, WIN.x1 - WIN.x0, 1, M(AQ.POOL, [20, 40, 44], 0.5));
    for (let x = WIN.x0; x < WIN.x1; x += 24) r(x, top, 1, h, M(AQ.POOL, [20, 40, 44], 0.35));
    const gy = WIN.y1 + 40 - sl; // the gate's top
    if (gy < WIN.y1) {
      r(WIN.x0, gy, WIN.x1 - WIN.x0, WIN.y1 - gy, [40, 48, 54]);
      const open = Math.round(p.gate * 90); if (open > 0) r(WIN.x0 + 180, gy + 6 - open, 340, open + 60, M(SEA.W1, SEA.W0, 0.3));
      for (let x = WIN.x0 + 180; x < WIN.x0 + 520; x += 12) r(x, gy + 6 - open, 2, 80, [90, 100, 108]);
      lit(() => r(WIN.cx - 4, gy + 2, 8, 3, p.gate > 0 ? [120, 255, 140] : [255, 60, 60]));
    }
    for (let k = 0; k < 3; k++) { const fx = WIN.x0 + ((k * 211 + a * (16 + k * 5)) % 700), fy = top + 40 + k * 22 - sl * 0.3; if (fy > wl + 4 && fy < WIN.y1) drawCatch('SARDINE', fx, fy, 1, 1, a + k); }
    // above the water: the pen's concrete, a work lamp, the dock's hazard edge
    if (wl > top) {
      r(WIN.x0, top, WIN.x1 - WIN.x0, wl - top, AQ.CONCRETE); for (let y = top; y < wl; y += 10) r(WIN.x0, y, WIN.x1 - WIN.x0, 1, AQ.CONCRETE_DK);
      for (let x = WIN.x0; x < WIN.x1; x += 16) { r(x, wl - 5, 8, 3, AQ.HAZ); r(x + 8, wl - 5, 8, 3, AQ.HAZ_DK); }
      lit(() => { r(WIN.x0 + 240, top + 4, 10, 3, [255, 214, 150]); r(WIN.x0 + 560, top + 4, 10, 3, [255, 214, 150]); });
      Gd(WIN.x0 + 245, top + 8, 18, AQ.LAMP, 0.3); Gd(WIN.x0 + 565, top + 8, 18, AQ.LAMP, 0.3);
      lit(() => { for (let x = WIN.x0; x < WIN.x1; x += 5) r(x, wl + Math.round(Math.sin(x * 0.09 + a * 3)), 5, 1, [180, 240, 230]); });
    }
    // the ballast's bubbles, boiling up
    if (p.boil > 0) lit(() => { for (let i = 0; i < Math.round(40 * p.boil); i++) { const q = (a * 1.4 + h1(i)) % 1, x = WIN.x0 + Math.floor(h1(i * 3.3) * 700) + Math.round(Math.sin(a * 4 + i) * 2); r(x, Math.round(WIN.y1 - q * (WIN.y1 - Math.max(top, wl))), 2, 2, [220, 250, 255]); } });
  }); } finally { PX.dim = d; }
}

// ---------------------------------------------------------------- the CLAW CAM ----------------------------------------------------------------
/** The seabed under the sub, close up: `cx`, `cd` = the claw (along, down from the sub), `shut` = how closed it is, `hold` = a find in its grip. */
export interface ClawView { v: SeaView; cx: number; cd: number; shut: number; hold: string | null }
const CAM_W = 120, CAM_H = 70;
/** Draw the claw cam into `c` (any size: it's scaled to fit, pixels kept square). The camera looks down from the sub's belly. */
export function drawClawCam(c: HTMLCanvasElement, cv: ClawView): void {
  const g = c.getContext('2d')!, sc = Math.max(1, Math.floor(Math.min(c.width / CAM_W, c.height / CAM_H))), v = cv.v, a = v.a;
  const ox = Math.round(c.width / sc / 2 - v.x), oy = Math.round(8 - v.y);
  const glow = PX.glow, dum = mk(4, 4).getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.fillStyle = '#081418'; g.fillRect(0, 0, c.width, c.height);
  const d = PX.dim, e = PX.emit, f = PX.fl; PX.dim = 0; PX.emit = false; PX.fl = 0; PX.glow = dum;
  try {
    withCtx(g, () => {
      g.setTransform(sc, 0, 0, sc, 0, 0);
      g.drawImage(water(), 0, Math.max(0, v.y - 8 + STRIP_TOP), 1, CAM_H, 0, 0, c.width / sc, CAM_H);
      const left = v.x - c.width / sc / 2, right = v.x + c.width / sc / 2, i0 = Math.floor(left / TW), i1 = Math.floor(right / TW), j0 = Math.floor((v.y - 8 + TOP) / TH), j1 = Math.floor((v.y + CAM_H + TOP) / TH);
      for (let i = Math.max(0, i0); i <= i1; i++) for (let j = Math.max(0, j0); j <= j1; j++) { const t = tile(i, j); if (t) g.drawImage(t, i * TW + ox, j * TH - TOP + oy); }
      for (const fd of v.finds) if (!((v.got >>> fd.i) & 1) && fd.x > left - 10 && fd.x < right + 10) { if (fd.kind === 'pearl' && !clamOpen(v.T)) continue; drawFind(fd.kind, fd.x + ox, fd.y + oy, a); }
      if (Math.abs(v.x - SPOTS.clam) < 80) { const cx = SPOTS.clam + ox, cy = Math.round(sandAt(SPOTS.clam)) + oy, open = clamOpen(v.T) ? 1 : 0; r(cx - 9, cy - 5, 18, 3, [150, 180, 196]); r(cx - 9, cy - 5 - open * 4, 18, 2, [170, 200, 214]); }
      // the dark (the claw cam has its own little lamp, so it's never quite black)
      const dk = Math.min(0.7, darkAt(v.y + 30, v.day)); if (dk > 0.02) alpha(dk, () => r(0, 0, c.width / sc, CAM_H, [2, 6, 16]));
      // the claw: its cable from the top, the arms open or shut, and whatever it's holding
      const tx = Math.round(c.width / sc / 2 + cv.cx), ty = Math.round(8 + cv.cd), sh = cv.shut;
      r(tx, 0, 1, ty - 4, [150, 156, 166]); r(tx - 3, ty - 6, 7, 3, [120, 126, 136]);
      const spread = Math.round(5 - sh * 4); r(tx - spread - 1, ty - 4, 2, 6, [200, 206, 216]); r(tx + spread, ty - 4, 2, 6, [200, 206, 216]); r(tx - spread, ty + 2, 1, 1, [200, 206, 216]); r(tx + spread, ty + 2, 1, 1, [200, 206, 216]);
      if (cv.hold) drawFind(cv.hold, tx, ty + 4, a);
      lit(() => { txt('CLAW CAM', 3, 2, [98, 242, 154]); txt(Math.round(v.y + cv.cd) + 'M', 3, CAM_H - 7, [98, 242, 154]); if (Math.floor(a * 2) % 2) r(c.width / sc - 7, 3, 3, 3, [255, 60, 60]); });
    });
  } finally { PX.dim = d; PX.emit = e; PX.fl = f; PX.glow = glow; g.setTransform(1, 0, 0, 1, 0, 0); }
}
/** How far the claw cam sees either side of the sub (m), at its scale. */
export const CAM_SPAN = CAM_W / 2;
