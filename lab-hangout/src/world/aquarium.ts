// THE CITY AQUARIUM, at the end of the beach past the lighthouse (the Pier's glass doors). Left to right, the way a visit goes:
//   THE LOBBY         the doors out to the Pier, the ticket desk (ADMISSION FREE, a bell), the aquarium's map, a height chart
//   THE GIFT SHOP     a striped awning, plushies on the shelves, a postcard rack, the till (features/aquarium.ts runs the shop)
//   THE FISH GALLERY  twelve tanks, one for each thing you can catch off the Pier, filled by the city's donations (game/aquarium.ts),
//                     a brass plaque under each, and the CURATOR'S DESK in front (DONATE)
//   THE OCEAN TANK    DORIS the whale shark, two mantas, a turtle, two reef sharks, a silver shoal, clownfish, a moray, and the diver
//                     who comes down to clean the glass; two benches to sit and stare; FEEDING TIME on the clock; the TOUCH POOL
//   THE JELLY ROOM    three glowing columns of moon jellies (they pulse to the beat when three or more dance in here)
//   THE SUB PEN       the MOON POOL, where SARDINE 1 floats between dives (game/sub.ts), the SEA GATE, the DIVE BOARD, the crane
// The creatures are drawn by world/sealife.ts. AQUA is what this draws from: the scoops thrown at feeding time, the jelly disco, the view.

import { K, AQ, CONFETTI, type RGB } from '../engine/palette';
import { PX, mk, r, line, disc, oval, ring, txt, tw, lit, alpha, G, Gd, M, shade, bake, withCtx } from '../engine/pixel';
import { h1, clamp } from '../engine/math';
import { mmss } from '../engine/format';
import { GALLERY, GAL, feeding } from '../game/aquarium';
import { dive, penSink, backIn, hatchOpen, missionOf, MISSIONS } from '../game/sub';
import { SUB_ARRIVE } from './sub';
import { FISH } from '../game/fish';
import { drawCatch, sitsOnBottom, whaleShark, manta, turtle, reefShark, clownfish, shoal, moray, diver, jelly, kelp, boneFish, snowflake } from './sealife';
import { dayness } from './plaza';
import { isHalloween, isWinter } from './season';
import { AQ_ARRIVE } from './pier';
import type { StateMsg } from '../net/transport';
import type { Prop, Rect, Room, Spot, Talker } from './room';

const W = 1800, H = 700, CEIL = 316, FL = 470, DIM = 0.16;
/** Where things are: the doors, the sections, the curator's desk, the till, the tank, the feeding ladder, the touch pool, the moon pool, SARDINE 1, the dive board. */
export const AQR = { door: 80, shop: 180, gallery: 340, tank0: 770, tank1: 1230, jelly: 1240, pen: 1420, desk: 552, till: 292, ladder: 1238, touch: 1178, pool0: 1480, pool1: 1704, sub: 1592, board: 1754 };
/** The FISH GALLERY's twelve tanks: two rows of six. */
const TANK_X0 = 356, TANK_PITCH = 66, TANK_W = 56, TANK_H = 27, TANK_Y = [369, 418];
/** SARDINE 1 afloat: its waterline, and the moon pool's water; the gangway down to its deck, beside the conning tower. */
const WATERLINE = 500, POOL_Y0 = FL + 2, POOL_Y1 = 514;
/** The gangway down to SARDINE 1's hatch (the way aboard while it boards). */
export const GANGWAY = AQR.sub - 44;

/** What the room draws from (features/aquarium.ts keeps it up to date). */
export const AQUA = {
  /** Scoops of food thrown in at feeding time: where (x in the tank) and when (page seconds). */
  scoops: [] as { x: number; t0: number }[],
  /** How many are dancing in the jelly room right now (three or more = the jelly disco). */
  jellyDancers: 0,
  /** How many are aboard SARDINE 1 (the dive board says, while it's out). */
  crew: 0,
  /** The part of the room the camera shows (so the busy parts only draw when they're seen). */
  view: { x0: 0, x1: W, y0: 0, y1: H },
};
const seen = (x0: number, x1: number): boolean => x1 >= AQUA.view.x0 - 8 && x0 <= AQUA.view.x1 + 8;
/** Page seconds (the scoops are timed in these). */
const pageT = (): number => performance.now() / 1000;
/** Draw inside a clip rectangle. */
function clipped(x0: number, y0: number, w: number, h: number, fn: () => void): void { const g = PX.ctx; g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip(); try { fn(); } finally { g.restore(); } }

// ---------------------------------------------------------------- the set (baked) ----------------------------------------------------------------
function build(this: Room): void {
  bake(this.bg.getContext('2d')!, () => {
    // ceiling: dark, a soffit with downlights along the front
    r(0, 0, W, CEIL, AQ.CEIL); for (let x = 0; x < W; x += 60) r(x, 0, 2, CEIL, AQ.CEIL2);
    r(0, CEIL - 12, W, 12, AQ.CEIL2); r(0, CEIL - 1, W, 1, AQ.SKIRT);
    // ---- THE LOBBY: white walls, a wave dado, the doors, the map, the height chart ----
    wallPanels(0, AQR.shop, AQ.WALL, AQ.WALL2);
    waveDado(0, AQR.shop);
    // the doors out to the Pier (what's through them is drawn live)
    r(AQR.door - 34, 374, 68, FL - 374, AQ.FRAME); r(AQR.door - 34, 374, 68, 2, AQ.FRAME_HI);
    for (const lx of [AQR.door - 30, AQR.door + 1]) { r(lx, 380, 29, FL - 380, [30, 60, 90]); r(lx + 3, 424, 23, 2, AQ.BRASS); }
    r(AQR.door - 16, 362, 32, 9, [30, 120, 60]); txt('EXIT', AQR.door - tw('EXIT') / 2, 364, K.WHITE);
    // the height chart: YOU ARE AS TALL AS...
    r(14, 378, 16, FL - 378, K.WHITE); r(14, 378, 1, FL - 378, AQ.WALL2);
    for (let y = 380; y < FL; y += 6) r(15, y, y % 30 === 20 ? 8 : 4, 1, AQ.BAND_DK);
    r(19, 452, 3, 6, [255, 190, 80]); r(18, 450, 2, 2, [255, 190, 80]); r(21, 457, 2, 3, [255, 190, 80]); // a seahorse
    r(18, 428, 6, 8, [30, 32, 44]); r(19, 430, 4, 5, K.WHITE); r(24, 430, 2, 1, [255, 150, 40]); // a penguin
    r(16, 402, 12, 4, [120, 130, 142]); r(20, 399, 3, 3, [120, 130, 142]); // a small shark
    // the aquarium's map: a painted plan of the rooms, and YOU ARE HERE
    r(118, 360, 58, 56, AQ.FRAME); r(120, 362, 54, 52, [236, 240, 232]); txt('MAP', 147 - tw('MAP') / 2, 364, AQ.BAND_DK);
    const plan: [number, RGB][] = [[6, [236, 200, 150]], [7, [230, 90, 80]], [12, [40, 70, 130]], [14, [40, 120, 200]], [6, [60, 40, 110]], [9, [140, 146, 152]]];
    let px = 122; for (const [w2, c] of plan) { r(px, 376, w2, 30, c); px += w2 + 1; }
    r(125, 398, 3, 3, [230, 50, 60]); r(122, 408, 40, 1, AQ.BAND_DK);
    // ---- THE GIFT SHOP: a warm cream wall, shelves of plushies, t-shirts, the awning ----
    wallPanels(AQR.shop, AQR.gallery, AQ.SHOP2, M(AQ.SHOP2, [180, 160, 130], 0.2));
    for (const sy of [392, 418, 444]) { r(AQR.shop + 8, sy, 104, 3, AQ.WOOD); r(AQR.shop + 8, sy, 104, 1, AQ.WOOD_HI); r(AQR.shop + 8, sy + 3, 104, 1, AQ.WOOD_DK); }
    plushies();
    for (let k = 0; k < 2; k++) { const tx = AQR.shop + 122 + k * 18, c: RGB = k ? [40, 120, 200] : [240, 240, 244]; r(tx, 388, 14, 16, c); r(tx - 3, 388, 3, 6, c); r(tx + 14, 388, 3, 6, c); r(tx + 4, 388, 6, 2, shade(c, 0.8)); r(tx + 4, 394, 6, 4, k ? K.WHITE : [40, 120, 200]); }
    r(AQR.shop + 124, 410, 28, 12, [230, 60, 60]); txt('SALE!', AQR.shop + 138 - tw('SALE!') / 2, 413, K.WHITE);
    // the awning: red and white stripes, a scalloped edge, GIFT SHOP on the valance
    for (let x = AQR.shop + 4; x < AQR.gallery - 4; x += 8) { r(x, 350, 8, 14, ((x - AQR.shop) / 8) % 2 ? AQ.SHOP2 : AQ.SHOP); disc(x + 4, 364, 4, ((x - AQR.shop) / 8) % 2 ? AQ.SHOP2 : AQ.SHOP); }
    r(AQR.shop + 4, 348, AQR.gallery - AQR.shop - 8, 3, AQ.WOOD_DK);
    r(AQR.shop + 40, 369, 80, 10, AQ.WOOD); txt('GIFT SHOP', AQR.shop + 80 - tw('GIFT SHOP') / 2, 371, K.WHITE);
    // ---- THE FISH GALLERY: deep blue, twelve brass-framed tanks (their water and fish are drawn live), plaques, a title ----
    wallPanels(AQR.gallery, AQR.tank0 - 10, AQ.DEEP, AQ.DEEP2);
    txt('THE FISH GALLERY', (AQR.gallery + AQR.tank0 - 10) / 2 - tw('THE FISH GALLERY') / 2, 357, AQ.BRASS_HI);
    for (let i = 0; i < 12; i++) {
      const tx = TANK_X0 + (i % 6) * TANK_PITCH, ty = TANK_Y[Math.floor(i / 6)];
      r(tx - 3, ty - 3, TANK_W + 6, TANK_H + 6, AQ.BRASS_DK); r(tx - 2, ty - 2, TANK_W + 4, TANK_H + 4, AQ.BRASS); r(tx - 2, ty - 2, TANK_W + 4, 1, AQ.BRASS_HI); r(tx - 1, ty - 1, TANK_W + 2, TANK_H + 2, AQ.FRAME);
      r(tx + 2, ty + TANK_H + 3, TANK_W - 4, 15, AQ.BRASS_DK); r(tx + 3, ty + TANK_H + 4, TANK_W - 6, 13, AQ.BRASS); r(tx + 3, ty + TANK_H + 4, TANK_W - 6, 1, AQ.BRASS_HI); // the plaque
    }
    r(AQR.gallery, 465, AQR.tank0 - 10 - AQR.gallery, 5, AQ.DEEP_HI); r(AQR.gallery, 465, AQR.tank0 - 10 - AQR.gallery, 1, M(AQ.DEEP_HI, K.WHITE, 0.2));
    tankWater();
    // ---- THE OCEAN TANK's frame: steel posts, a sill with its name, bolts (what lives in it is drawn live) ----
    for (const px2 of [AQR.tank0 - 10, AQR.tank1]) { r(px2, CEIL - 12, 10, FL - CEIL + 12, AQ.FRAME); r(px2 + 1, CEIL - 12, 1, FL - CEIL + 12, AQ.FRAME_HI); for (let y = CEIL; y < FL; y += 18) r(px2 + 4, y, 2, 2, AQ.FRAME_HI); }
    r(AQR.tank0 - 10, FL - 8, AQR.tank1 - AQR.tank0 + 20, 8, AQ.FRAME); r(AQR.tank0 - 10, FL - 8, AQR.tank1 - AQR.tank0 + 20, 1, AQ.FRAME_HI);
    txt('THE OCEAN TANK', (AQR.tank0 + AQR.tank1) / 2 - tw('THE OCEAN TANK') / 2, FL - 6, AQ.BRASS);
    // the feeding ladder, up the tank's right edge (out of sight at the top), and its step
    for (const lx of [AQR.ladder - 6, AQR.ladder + 6]) r(lx, CEIL - 12, 2, FL - CEIL + 8, [150, 156, 166]);
    for (let y = CEIL; y < FL - 4; y += 10) r(AQR.ladder - 6, y, 14, 2, [180, 186, 196]);
    // ---- THE JELLY ROOM: near-black, an arch with light strands at the entrance, three glass columns ----
    r(AQR.jelly, CEIL - 12, AQR.pen - AQR.jelly, FL - CEIL + 12, AQ.JELLY_WALL);
    for (let x = AQR.jelly; x < AQR.pen; x += 14) r(x, CEIL, 1, FL - CEIL, M(AQ.JELLY_WALL, K.WHITE, 0.03));
    r(AQR.jelly, CEIL - 12, 6, FL - CEIL + 12, AQ.FRAME); r(AQR.pen - 6, CEIL - 12, 6, FL - CEIL + 12, AQ.FRAME);
    for (const cx of JELLY_X) { r(cx - 17, FL - 16, 34, 16, AQ.FRAME); r(cx - 17, FL - 16, 34, 1, AQ.FRAME_HI); r(cx - 15, CEIL - 12, 30, FL - 16 - CEIL + 12, [10, 16, 34]); r(cx - 15, CEIL - 12, 1, FL - CEIL - 4, [40, 60, 90]); r(cx + 14, CEIL - 12, 1, FL - CEIL - 4, [24, 36, 60]); }
    // ---- THE SUB PEN: concrete blocks, a hazard band, the SEA GATE, lamps, lockers, the crane rail ----
    for (let y = CEIL - 12; y < FL; y += 8) for (let x = AQR.pen + ((y / 8) % 2) * 8; x < W; x += 16) { r(x, y, 16, 8, h1(x * 0.3 + y) > 0.8 ? AQ.CONCRETE2 : AQ.CONCRETE); r(x, y, 16, 1, AQ.CONCRETE_DK); r(x, y, 1, 8, AQ.CONCRETE_DK); }
    r(AQR.pen, CEIL - 12, 8, FL - CEIL + 12, AQ.FRAME); for (let y = CEIL; y < FL; y += 12) { r(AQR.pen + 1, y, 6, 6, AQ.HAZ); r(AQR.pen + 1, y + 6, 6, 6, AQ.HAZ_DK); }
    r(AQR.pen, 440, W - AQR.pen, 8, AQ.HAZ); for (let x = AQR.pen; x < W; x += 12) r(x, 440, 6, 8, AQ.HAZ_DK);
    // the sea gate: a steel shutter over the way out to the sea, above the pool
    r(AQR.pool0 + 4, 360, AQR.pool1 - AQR.pool0 - 8, FL - 360, [96, 104, 114]); for (let y = 362; y < FL; y += 6) { r(AQR.pool0 + 4, y, AQR.pool1 - AQR.pool0 - 8, 1, [120, 128, 138]); r(AQR.pool0 + 4, y + 4, AQR.pool1 - AQR.pool0 - 8, 1, [74, 80, 90]); }
    r(AQR.pool0, 356, AQR.pool1 - AQR.pool0, 6, AQ.FRAME); r(AQR.pool0, 356, 4, FL - 356, AQ.FRAME); r(AQR.pool1 - 4, 356, 4, FL - 356, AQ.FRAME);
    txt('SEA GATE', (AQR.pool0 + AQR.pool1) / 2 - tw('SEA GATE') / 2, 372, AQ.HAZ);
    for (let k = 0; k < 20; k++) r(AQR.pool0 + 10 + Math.floor(h1(k * 1.7) * 200), 420 + Math.floor(h1(k * 2.3) * 44), 2, 1, [60, 90, 70]); // weed and rust near the waterline
    // the work lamps' housings (lit live), a life ring, the bulkhead's sign
    for (const lx of [AQR.pool0 - 20, AQR.pool1 + 12]) { r(lx - 1, 334, 2, 10, [60, 64, 70]); r(lx - 7, 342, 14, 6, [60, 64, 70]); }
    ring(AQR.pen + 32, 404, 12, 12, [230, 60, 60]); ring(AQR.pen + 32, 404, 11, 11, [230, 60, 60]); for (let k = 0; k < 4; k++) { const an = k * Math.PI / 2 + 0.4; r(Math.round(AQR.pen + 32 + Math.cos(an) * 11) - 1, Math.round(404 + Math.sin(an) * 11) - 1, 3, 3, K.WHITE); }
    r(AQR.pen + 14, 360, 40, 16, AQ.HAZ_DK); txt('SUB PEN', AQR.pen + 34 - tw('SUB PEN') / 2, 362, AQ.HAZ); txt('CREW', AQR.pen + 34 - tw('CREW') / 2, 369, K.WHITE);
    // the dive board's case (its lights are drawn live), and the wetsuit lockers under it
    r(AQR.board - 44, 386, 88, 52, AQ.FRAME); r(AQR.board - 42, 388, 84, 48, [8, 10, 14]);
    for (let k = 0; k < 4; k++) { const lx = AQR.board - 42 + k * 21; r(lx, 442, 20, FL - 442, [70, 96, 120]); r(lx, 442, 20, 1, [100, 128, 154]); r(lx + 15, 452, 2, 6, [180, 186, 196]); for (let v = 0; v < 3; v++) r(lx + 5, 446 + v * 3, 10, 1, [50, 70, 90]); }
    r(AQR.board - 21, 442, 20, FL - 442, [20, 24, 30]); r(AQR.board - 17, 445, 9, 18, [30, 32, 40]); r(AQR.board - 15, 447, 5, 14, [40, 120, 160]); r(AQR.board - 18, 463, 6, 3, [240, 200, 60]); // the open one: a wetsuit, a flipper
    // ---- the floor: blue-green terrazzo with a brass wave inlay; the pen's wet concrete with yellow edges ----
    r(0, FL, W, 4, AQ.SKIRT);
    r(0, FL + 4, AQR.pen, H - FL - 4, AQ.FLOOR);
    for (let i = 0; i < 2600; i++) r(Math.floor(h1(i * 1.3) * AQR.pen), FL + 4 + Math.floor(h1(i * 2.7) * (H - FL - 4)), 1, 1, h1(i + 0.3) > 0.5 ? AQ.FLOOR_SP : AQ.FLOOR2);
    for (let x = 0; x < AQR.pen; x++) { r(x, Math.round(606 + Math.sin(x / 26) * 4), 1, 2, AQ.INLAY); }
    for (let x = 0; x < AQR.pen; x += 90) r(x, FL + 4, 1, H - FL - 4, AQ.FLOOR_LN);
    r(AQR.pen, FL + 4, W - AQR.pen, H - FL - 4, AQ.CONCRETE2); for (let i = 0; i < 700; i++) r(AQR.pen + Math.floor(h1(i * 3.1) * (W - AQR.pen)), FL + 4 + Math.floor(h1(i * 1.9) * (H - FL - 4)), 1, 1, h1(i) > 0.5 ? AQ.CONCRETE : AQ.CONCRETE_DK);
    r(AQR.pen, FL + 4, 3, H - FL - 4, AQ.HAZ);
    // the moon pool's lip and the painted edge; MIND THE GAP
    r(AQR.pool0 - 4, POOL_Y1, AQR.pool1 - AQR.pool0 + 8, 6, AQ.CONCRETE_DK); r(AQR.pool0 - 4, POOL_Y1 + 6, AQR.pool1 - AQR.pool0 + 8, 3, AQ.HAZ);
    txt('MIND THE GAP', (AQR.pool0 + AQR.pool1) / 2 - tw('MIND THE GAP') / 2, POOL_Y1 + 12, AQ.HAZ);
    for (const [px2, py] of [[1520, 556], [1660, 588], [1744, 536]]) { oval(px2, py, 14, 3, [96, 110, 120]); r(px2 - 6, py - 1, 5, 1, [150, 170, 180]); } // puddles
  });
}
/** THE OCEAN TANK's still water, bright at the top and deep blue lower down, and its far rocks for depth (baked: they never move). */
function tankWater(): void {
  const x0 = AQR.tank0, x1 = AQR.tank1, top = CEIL - 12, bot = FL - 8, w = x1 - x0;
  for (let y = top; y < bot; y += 4) r(x0, y, w, 4, M(AQ.WATER2, AQ.WATER0, (y - top) / (bot - top)));
  const g = PX.ctx; g.save(); g.beginPath(); g.rect(x0, top, w, bot - top); g.clip();
  for (let k = 0; k < 9; k++) { const rx = x0 + k * 56 + Math.floor(h1(k * 2.1) * 20), rh = 30 + Math.floor(h1(k * 5.3) * 40); oval(rx, bot - 18, 34, rh, M(AQ.WATER0, AQ.ROCK, 0.25)); }
  g.restore();
}
/** Wall panels with a seam every 60 px and a lit top edge, from x0 to x1. */
function wallPanels(x0: number, x1: number, c: RGB, seam: RGB): void {
  r(x0, CEIL, x1 - x0, FL - CEIL, c); r(x0, CEIL, x1 - x0, 2, M(c, K.WHITE, 0.3));
  for (let x = x0 + 60; x < x1; x += 60) r(x, CEIL, 1, FL - CEIL, seam);
}
/** The lobby's blue dado, its top edge a wave. */
function waveDado(x0: number, x1: number): void {
  for (let x = x0; x < x1; x++) { const t = Math.round(440 + Math.sin(x / 9) * 3); r(x, t, 1, FL - t, AQ.BAND); r(x, t, 1, 1, AQ.BAND_HI); }
}
/** The gift shop's shelves: plush sharks, octopuses, jellyfish and turtles, and fish in snow globes. */
function plushies(): void {
  const x0 = AQR.shop + 12;
  for (let k = 0; k < 4; k++) { const x = x0 + k * 25, y = 392; oval(x + 8, y - 5, 8, 4, [120, 134, 150]); r(x + 5, y - 11, 3, 3, [120, 134, 150]); r(x + 14, y - 8, 3, 6, [120, 134, 150]); r(x + 2, y - 5, 1, 1, K.EYE); r(x + 4, y - 3, 5, 1, K.WHITE); } // sharks
  for (let k = 0; k < 4; k++) { const x = x0 + 4 + k * 25, y = 418; oval(x + 6, y - 8, 5, 4, [220, 100, 110]); for (let t = 0; t < 4; t++) r(x + 2 + t * 3, y - 4, 1, 4, [200, 80, 90]); r(x + 4, y - 9, 1, 1, K.EYE); r(x + 7, y - 9, 1, 1, K.EYE); } // octopuses
  for (let k = 0; k < 3; k++) { const x = x0 + 2 + k * 33, y = 444, c = CONFETTI[(k * 2 + 1) % CONFETTI.length]; oval(x + 6, y - 9, 6, 3, c); for (let t = 0; t < 4; t++) r(x + 2 + t * 3, y - 6, 1, 6, shade(c, 0.85)); } // jellyfish
  for (let k = 0; k < 2; k++) { const x = x0 + 18 + k * 33, y = 444; disc(x + 5, y - 6, 5, [210, 230, 240]); r(x + 3, y - 7, 5, 2, [255, 150, 70]); r(x, y - 2, 11, 2, AQ.WOOD); } // fish globes
}

// ---------------------------------------------------------------- the live bits ----------------------------------------------------------------
/** The three jelly columns' middles. */
const JELLY_X = [AQR.jelly + 42, AQR.jelly + 90, AQR.jelly + 138];
/** The doors: the beach through the glass, by day or night. */
function doors(a: number): void {
  if (!seen(AQR.door - 34, AQR.door + 34)) return;
  const day = dayness();
  for (const lx of [AQR.door - 30, AQR.door + 1]) lit(() => {
    for (let y = 380; y < FL; y += 2) r(lx, y, 29, 2, y < 410 ? M([20, 30, 70], [150, 200, 240], day) : y < 440 ? M([12, 30, 70], [70, 140, 200], day) : M([60, 54, 44], [200, 170, 120], day));
    if (day < 0.5 && Math.cos(a * 0.7) > 0.8) r(lx + 8, 398, 3, 3, [255, 240, 180]); // the lighthouse, blinking
  });
  for (const lx of [AQR.door - 30, AQR.door + 1]) { r(lx + 3, 424, 23, 2, AQ.BRASS); alpha(0.25, () => r(lx + 4, 382, 2, 60, K.WHITE)); }
  lit(() => r(AQR.door - 16, 362, 32, 9, [40, 170, 80])); lit(() => txt('EXIT', AQR.door - tw('EXIT') / 2, 364, K.WHITE)); Gd(AQR.door, 366, 18, [60, 220, 110], 0.25);
}
/** The gift shop's warm light and its downlights. */
function shopLight(): void { for (const x of [AQR.shop + 40, AQR.shop + 120]) { lit(() => r(x - 3, CEIL - 4, 6, 3, [255, 236, 190])); Gd(x, 380, 44, [255, 210, 150], 0.14); } }
/** A gallery tank: its water, the donated fish swimming (or murk and a WANTED card), bubbles, and the plaque. */
function galleryTank(i: number, a: number): void {
  const name = GALLERY[i], tx = TANK_X0 + (i % 6) * TANK_PITCH, ty = TANK_Y[Math.floor(i / 6)], t = GAL.tanks.get(name);
  if (!seen(tx, tx + TANK_W)) return;
  const bot = ty + TANK_H - 5;
  lit(() => {
    for (let y = ty; y < ty + TANK_H; y += 2) r(tx, y, TANK_W, 2, t ? M(AQ.WATER2, AQ.WATER1, (y - ty) / TANK_H) : M(AQ.MURK, [16, 34, 40], (y - ty) / TANK_H));
    r(tx, ty, TANK_W, 2, t ? AQ.WATER_HI : [60, 90, 96]);
    r(tx, bot, TANK_W, 5, t ? AQ.SAND : [90, 90, 70]); for (let k = 0; k < 6; k++) r(tx + 3 + k * 9, bot + 1 + (k % 2), 2, 1, t ? AQ.SAND_DK : [70, 70, 56]);
  });
  clipped(tx, ty, TANK_W, TANK_H, () => {
    if (t) {
      const f = FISH.find((q) => q.name === name), k = f ? 0.85 + 0.4 * clamp((t.cm - f.cm[0]) / Math.max(1, f.cm[1] - f.cm[0]), 0, 1) : 1;
      if (sitsOnBottom(name)) drawCatch(name, tx + TANK_W / 2, bot, 1, k, a + i);
      else {
        const sp = name === 'SWORDFISH' ? 0.09 : name === 'OCTOPUS' ? 0.03 : 0.06, u = (a * sp + h1(i * 3.3)) % 2, s = u < 1 ? u : 2 - u, dir = u < 1 ? 1 : -1;
        const fx = tx + 14 + s * (TANK_W - 28), fy = name === 'OCTOPUS' ? bot - 2 : ty + 11 + Math.round(Math.sin(a * 0.9 + i) * 3);
        drawCatch(name, fx, fy, dir, k, a + i);
      }
      lit(() => { for (let k2 = 0; k2 < 3; k2++) { const q = (a * 0.35 + k2 / 3 + h1(i)) % 1; r(tx + 6 + ((i * 7 + k2 * 17) % (TANK_W - 12)), Math.round(bot - q * (TANK_H - 6)), 1, 1, [200, 236, 255]); } });
    } else {
      // murky and empty: one bubble now and then, and a WANTED card taped to the glass
      if ((a * 0.25 + h1(i)) % 1 < 0.3) lit(() => r(tx + 20 + (i * 5) % 20, Math.round(bot - ((a * 0.25 + h1(i)) % 1) / 0.3 * 20), 1, 1, [120, 170, 176]));
      r(tx + 14, ty + 5, 28, 15, [236, 228, 200]); r(tx + 14, ty + 5, 28, 1, K.WHITE); r(tx + 26, ty + 3, 4, 3, [220, 220, 150]);
      txt('WANTED', tx + 28 - tw('WANTED') / 2, ty + 7, [170, 50, 40]); r(tx + 20, ty + 14, 10, 3, [120, 110, 90]); r(tx + 30, ty + 13, 3, 5, [120, 110, 90]);
    }
  });
  alpha(0.18, () => r(tx + 3, ty + 2, 2, TANK_H - 8, K.WHITE));
  Gd(tx + TANK_W / 2, ty + TANK_H / 2, 26, t ? [80, 170, 255] : [60, 110, 110], t ? 0.14 : 0.06);
  // the plaque: the fish, then its size and who donated it (or EMPTY)
  const l2 = t ? (t.cm + 'CM ' + t.name).slice(0, 12) : 'EMPTY';
  PX.ctx.drawImage(plaque(i, name.slice(0, 12), l2, !!t), tx + 3, ty + TANK_H + 5);
}
/** A plaque's two lines of text, drawn once into a little picture (kept until what it says changes: text is costly to draw). */
const PLAQUES = new Map<number, { key: string; c: HTMLCanvasElement }>();
function plaque(i: number, l1: string, l2: string, full: boolean): HTMLCanvasElement {
  const key = l1 + '|' + l2, got = PLAQUES.get(i);
  if (got?.key === key) return got.c;
  const c = got?.c ?? mk(TANK_W - 6, 12); c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
  bake(c, () => { txt(l1, c.width / 2 - tw(l1) / 2, 1, [80, 52, 16]); txt(l2, c.width / 2 - tw(l2) / 2, 7, full ? [60, 40, 12] : [150, 60, 40]); });
  PLAQUES.set(i, { key, c }); return c;
}
/** THE OCEAN TANK: water and light shafts, the sand, rocks and coral, kelp, and everyone who lives in it (and the diver). */
function oceanTank(a: number): void {
  const x0 = AQR.tank0, x1 = AQR.tank1, top = CEIL - 12, bot = FL - 8, w = x1 - x0, cx = (x0 + x1) / 2, fd = feeding(), fk = fd.on ? Math.min(1, fd.k / 6, (90 - fd.k) / 8) : 0;
  if (!seen(x0, x1)) return;
  clipped(x0, top, w, bot - top, () => {
    // (the water and the far rocks are baked into the set: see tankWater)
    // light shafts from the top, drifting
    alpha(0.07, () => lit(() => { for (let k = 0; k < 5; k++) { const sx = x0 + ((k * 97 + a * 6) % (w + 80)) - 40; for (let y = top; y < bot - 20; y += 4) r(Math.round(sx + (y - top) * 0.35), y, 14, 4, AQ.WATER_HI); } }));
    // kelp at the back, the shoal, the mantas, DORIS, the turtle, the reef sharks
    for (let k = 0; k < 6; k++) kelp(x0 + 30 + k * 80 + Math.floor(h1(k * 1.3) * 20), bot - 10, 70 + Math.floor(h1(k * 4.7) * 50), a, k);
    shoal(cx + Math.sin(a * 0.09) * 130, 412 + Math.sin(a * 0.17) * 12 - fk * 56, 40, a, 1, fk);
    for (let k = 0; k < 2; k++) { const mx = cx + Math.sin(a * 0.11 + k * 2.6) * 170, my = 386 + k * 36 + Math.sin(a * 0.23 + k) * 8 - fk * 24; manta(mx, my, Math.cos(a * 0.11 + k * 2.6) > 0 ? 1 : -1, a + k * 1.3); }
    const dx = cx + Math.sin(a * 0.08) * 150, dy = 424 + Math.sin(a * 0.15) * 6 - fk * 56; whaleShark(dx, dy, Math.cos(a * 0.08) > 0 ? 1 : -1, a, fk);
    turtle(cx + Math.sin(a * 0.06 + 2) * 170, 442 + Math.sin(a * 0.3) * 4 - fk * 28, Math.cos(a * 0.06 + 2) > 0 ? 1 : -1, a);
    for (let k = 0; k < 2; k++) reefShark(cx + Math.sin(a * 0.14 + k * 3.1) * 190, 404 + k * 38 + Math.sin(a * 0.4 + k) * 3, Math.cos(a * 0.14 + k * 3.1) > 0 ? 1 : -1, a + k);
    // the sand, rocks and coral in front
    lit(() => {
      r(x0, bot - 12, w, 12, AQ.SAND); for (let x = x0; x < x1; x += 7) r(x, bot - 12 + Math.round(Math.sin(x * 0.2) * 1.5) + 1, 5, 1, AQ.SAND_HI);
      for (let k = 0; k < 12; k++) r(x0 + Math.floor(h1(k * 3.7) * w), bot - 8 + Math.floor(h1(k * 1.9) * 6), 3, 2, AQ.SAND_DK);
      oval(x0 + 60, bot - 10, 22, 12, AQ.ROCK); oval(x0 + 60, bot - 14, 16, 6, AQ.ROCK_HI); oval(x1 - 80, bot - 10, 26, 14, AQ.ROCK); oval(x1 - 84, bot - 16, 18, 6, AQ.ROCK_HI);
      disc(x0 + 150, bot - 12, 8, AQ.CORAL2); for (let k = 0; k < 5; k++) r(x0 + 144 + k * 3, bot - 18 + (k % 2), 1, 10, M(AQ.CORAL2, K.WHITE, 0.3)); // brain coral
      for (let k = 0; k < 7; k++) line(x0 + 300, bot - 10, x0 + 292 + k * 3, bot - 30 - (k % 3) * 3, AQ.CORAL3); // a fan coral
      for (let k = 0; k < 9; k++) { const sw = Math.round(Math.sin(a * 2 + k) * 2); line(x0 + 90 + k * 2, bot - 10, x0 + 88 + k * 3 + sw, bot - 22, AQ.CORAL); } // the anemone
    });
    for (let k = 0; k < 2; k++) clownfish(x0 + 94 + Math.sin(a * 1.7 + k * 3) * 10, bot - 22 + Math.sin(a * 2.3 + k) * 4, Math.cos(a * 1.7 + k * 3) > 0 ? 1 : -1, a);
    moray(x1 - 106, bot - 14, a);
    // bubbles from the bubbler
    lit(() => { for (let k = 0; k < 8; k++) { const q = (a * 0.3 + k / 8) % 1; r(x1 - 40 + Math.round(Math.sin(q * 12 + k) * 2), Math.round(bot - 14 - q * (bot - top - 20)), 1 + (k % 2), 1 + (k % 2), [200, 236, 255]); } });
    // feeding time: flakes sinking from the top (more where the scoops went in)
    if (fd.on || AQUA.scoops.length) lit(() => {
      if (fd.on) for (let k = 0; k < 40; k++) { const q = (a * 0.12 + h1(k)) % 1; r(x0 + Math.floor(h1(k * 2.9) * w) + Math.round(Math.sin(a + k) * 3), Math.round(top + q * (bot - top - 20)), 1, 1, [226, 170, 110]); }
      const T = pageT();
      for (const s of AQUA.scoops) { const u = T - s.t0; if (u < 0 || u > 8) continue; for (let k = 0; k < 10; k++) r(Math.round(s.x - 8 + h1(k + s.t0) * 16 + Math.sin(u * 2 + k) * 2), Math.round(top + 20 + u * 16 + h1(k * 3 + s.t0) * 10), 1, 1, [240, 190, 120]); }
    });
    // the diver: every three minutes, down to clean a patch of glass, a wave, back up
    const dk = (Date.now() / 1000) % 180;
    if (dk < 40) { const dxp = x0 + 330, dyp = dk < 8 ? top + dk / 8 * 106 : dk < 32 ? top + 106 : top + 106 - (dk - 32) / 8 * 116; diver(dxp, dyp, a, dk > 20 && dk < 26, dk >= 8 && dk < 20, isHalloween() ? 'witch' : isWinter() ? 'santa' : null); }
    // in season: a skeleton fish joins the shoal; a snowflake hangs in the water
    if (isHalloween()) boneFish(cx + Math.sin(a * 0.19 + 1) * 180, 420 + Math.sin(a * 0.5) * 8, Math.cos(a * 0.19 + 1) > 0 ? 1 : -1, a);
    if (isWinter()) { line(x0 + 120, top, x0 + 120, 400, [200, 220, 240]); snowflake(x0 + 120, 408, a); }
  });
  // the glass: reflections, and the tank's blue light on the floor in front (caustics rippling)
  alpha(0.08, () => lit(() => { for (let k = 0; k < 3; k++) { const gx = x0 + 60 + k * 160; for (let j = 0; j < 60; j += 2) r(gx + j, top + 20 + j * 2, 3, 4, K.WHITE); } }));
  alpha(0.1, () => lit(() => { for (let k = 0; k < 18; k++) { const q = h1(k * 1.7), fx = x0 + q * w + Math.sin(a * 0.8 + k) * 12, fy = FL + 12 + h1(k * 3.3) * 70 + Math.sin(a * 1.1 + k * 2) * 4; r(Math.round(fx), Math.round(fy), 10 + (k % 3) * 4, 1, AQ.WATER_HI); r(Math.round(fx + 3), Math.round(fy + 1), 5, 1, AQ.WATER_HI); } }));
  G(x0, FL, w, 90, [40, 140, 230], 0.08); Gd(cx, 400, 200, [50, 150, 255], 0.1);
}
/** THE JELLY ROOM: three columns of moon jellies, each glowing its own slowly changing colour (rainbow and on the beat in a jelly disco). */
function jellyRoom(a: number): void {
  if (!seen(AQR.jelly, AQR.pen)) return;
  const disco = AQUA.jellyDancers >= 3, beat = disco ? Math.pow((Math.sin(a * Math.PI * 4) + 1) / 2, 3) : 0;
  const cols: RGB[] = [[90, 160, 255], [170, 110, 255], [255, 120, 200], [80, 230, 210]];
  JELLY_X.forEach((cx, ti) => {
    const col = disco ? CONFETTI[(Math.floor(a * 2) + ti) % CONFETTI.length] : M(cols[Math.floor(a * 0.05 + ti) % 4], cols[(Math.floor(a * 0.05 + ti) + 1) % 4], (a * 0.05 + ti) % 1);
    clipped(cx - 15, CEIL - 12, 30, FL - 16 - CEIL + 12, () => {
      lit(() => { for (let y = CEIL - 12; y < FL - 16; y += 4) r(cx - 15, y, 30, 4, M([10, 16, 40], shade(col, 0.6), 0.3 + 0.45 * ((y - CEIL) / (FL - CEIL)) + beat * 0.2)); });
      for (let k = 0; k < 3; k++) { const ph = ti * 2.1 + k * 1.7, jy = 372 + ((a * (4 + k * 2) + h1(ti * 3 + k) * 100) % 82), jx = cx - 5 + ((k * 7) % 11) + Math.sin(a * 0.4 + ph) * 3; jelly(jx, jy, col, a * (disco ? 1.8 : 1), ph, 1 + (k % 2) * 0.3); }
      alpha(0.25, () => r(cx - 13, CEIL - 12, 2, FL - CEIL, K.WHITE));
    });
    lit(() => r(cx - 15, FL - 16, 30, 2, M(col, K.WHITE, 0.4))); Gd(cx, 420, 40, col, 0.16 + beat * 0.2); G(cx - 30, FL, 60, 40, col, 0.06 + beat * 0.08);
  });
  // the arch's light strands
  lit(() => { for (let k = 0; k < 7; k++) for (let j = 0; j < 16; j++) if ((j + k + Math.floor(a * 2)) % 4 === 0) r(AQR.jelly + 8 + k * 2, CEIL + 4 + j * 8 + (k % 2) * 4, 1, 2, disco ? CONFETTI[(j + k) % CONFETTI.length] : [150, 190, 255]); });
  if (disco) { const sx = AQR.jelly + 90 + Math.sin(a * 2) * 70; Gd(sx, 560, 40, CONFETTI[Math.floor(a * 4) % CONFETTI.length], 0.35); }
}
/** THE SUB PEN: the lamps, the crane hook, the pool's water, SARDINE 1 (bobbing, sinking at a dive, rising after), the gangway, the gate's lamp, the dive board. */
function subPen(a: number): void {
  if (!seen(AQR.pen, W)) return;
  const d = dive(), sink = penSink(d), docked = sink < 0.03;
  for (const lx of [AQR.pool0 - 20, AQR.pool1 + 12]) { lit(() => r(lx - 5, 348, 10, 2, [255, 214, 150])); Gd(lx, 360, 30, AQ.LAMP, 0.3); G(lx - 40, FL + 20, 80, 50, AQ.LAMP, 0.05); }
  // the crane's chain and hook, swaying a little over the pool
  const hx = 1650 + Math.round(Math.sin(a * 0.7) * 2); line(1650, CEIL - 12, hx, 350, [70, 74, 80]); r(hx - 3, 350, 7, 5, [242, 194, 48]); r(hx - 1, 355, 2, 6, [90, 94, 100]); r(hx + 1, 359, 3, 2, [90, 94, 100]);
  // the gate's lamp: green while a dive goes out or comes in, red otherwise
  const gateOpen = d.phase === 'submerge' || d.phase === 'surface';
  lit(() => r((AQR.pool0 + AQR.pool1) / 2 - 3, 349, 6, 5, gateOpen ? (Math.floor(a * 4) % 2 ? [120, 255, 140] : [60, 160, 80]) : [200, 50, 50])); Gd((AQR.pool0 + AQR.pool1) / 2, 351, 12, gateOpen ? [120, 255, 140] : [255, 60, 60], 0.3);
  // the water, SARDINE 1 in it, and the water again over whatever's under the surface
  clipped(AQR.pool0 - 4, 300, AQR.pool1 - AQR.pool0 + 8, POOL_Y1 - 300, () => {
    lit(() => { for (let y = POOL_Y0; y < POOL_Y1; y += 2) r(AQR.pool0 - 4, y, AQR.pool1 - AQR.pool0 + 8, 2, M(AQ.POOL2, AQ.POOL, (y - POOL_Y0) / (POOL_Y1 - POOL_Y0))); });
    if (sink < 1) sardine(AQR.sub, WATERLINE + Math.round(sink * 80 + Math.sin(a * 1.4) * (docked ? 1 : 0)), a, docked && d.phase === 'board');
    alpha(0.72, () => lit(() => { for (let y = WATERLINE + 2; y < POOL_Y1; y += 2) r(AQR.pool0 - 4, y, AQR.pool1 - AQR.pool0 + 8, 2, M(AQ.POOL2, AQ.POOL, (y - WATERLINE) / (POOL_Y1 - WATERLINE))); }));
    lit(() => { for (let k = 0; k < 16; k++) { const q = (a * 0.4 + h1(k)) % 1; r(AQR.pool0 + Math.floor(h1(k * 2.3) * (AQR.pool1 - AQR.pool0)) + Math.round(Math.sin(a + k) * 3), POOL_Y0 + 2 + Math.floor(q * 36), 6, 1, AQ.POOL_HI); } });
    // bubbles boiling up as it dives or surfaces
    if (d.phase === 'submerge' || d.phase === 'surface') lit(() => { for (let k = 0; k < 30; k++) { const q = (a * 1.5 + h1(k)) % 1; r(AQR.sub - 90 + Math.floor(h1(k * 3.3) * 180), Math.round(POOL_Y1 - q * (POOL_Y1 - POOL_Y0)), 2, 2, [220, 250, 255]); } });
  });
  // the gangway: down to the hatch while it's in, folded up against its post while it's out
  const gx = GANGWAY;
  r(gx - 16, 470, 3, 50, [110, 116, 124]); r(gx + 16, 470, 3, 50, [110, 116, 124]);
  if (docked) { for (let y = 454; y < 520; y += 4) r(gx - 12, y, 26, 2, [150, 156, 166]); r(gx - 13, 452, 2, 68, [190, 196, 206]); r(gx + 13, 452, 2, 68, [190, 196, 206]); }
  else lit(() => { r(gx - 17, 468, 5, 3, [255, 70, 70]); r(gx + 15, 468, 5, 3, [255, 70, 70]); }); // stowed: red lamps on its posts
  // the dive board: SARDINE 1's timetable in amber lights
  const status = d.phase === 'board' ? 'BOARDING' : d.phase === 'submerge' ? 'DIVE! DIVE!' : d.phase === 'surface' ? 'SURFACING' : 'ON A DIVE';
  const when = d.phase === 'board' ? 'DIVES IN ' + mmss(d.left) : d.phase === 'surface' ? 'DOCKING...' : 'BACK IN ' + mmss(backIn(d));
  lit(() => {
    const bx = AQR.board, amber: RGB = [255, 180, 60];
    txt('SARDINE 1', bx - tw('SARDINE 1') / 2, 391, [255, 214, 90]); r(bx - 38, 398, 76, 1, [60, 40, 10]);
    txt(status, bx - tw(status) / 2, 401, d.phase === 'board' && d.left < 20 && Math.floor(a * 3) % 2 ? [255, 90, 60] : amber);
    txt(when, bx - tw(when) / 2, 409, amber);
    const top = d.phase === 'board' ? 'TODAY\'S MISSION' : 'CREW ' + AQUA.crew + ' · MISSION', mis = MISSIONS[missionOf(d.n)].name;
    txt(top, bx - tw(top) / 2, 419, [120, 220, 255]); txt(mis, bx - tw(mis) / 2, 427, [255, 214, 90]);
  });
  G(AQR.board - 42, 388, 84, 48, [255, 170, 60], 0.08);
}
/** A cobweb in a tank's corner (Halloween), spreading from (x, y) towards `s` (1 right, -1 left). */
function web(x: number, y: number, s: number): void {
  const c: RGB = [220, 224, 236];
  alpha(0.7, () => { for (let k = 0; k < 4; k++) line(x, y, x + s * (4 + k * 4), y + 16 - k * 4, c); for (const d of [5, 10, 15]) for (let k = 0; k < 3; k++) { const a0 = k / 3, a1 = (k + 1) / 3; line(Math.round(x + s * d * (1 - a0) * 0.6), Math.round(y + d * a0 * 0.9), Math.round(x + s * d * (1 - a1) * 0.6), Math.round(y + d * a1 * 0.9), c); } });
}
/** SARDINE 1's hull, tower and paint, drawn once (hatch shut and hatch open) and stamped after: it only ever bobs and sinks. */
const SUB_PIC: (HTMLCanvasElement | null)[] = [null, null];
const SUB_OX = 102, SUB_OY = 86;
function sardinePic(open: boolean): HTMLCanvasElement {
  const k = open ? 1 : 0, got = SUB_PIC[k]; if (got) return got;
  const c = mk(206, 124), g = c.getContext('2d')!; g.translate(SUB_OX, SUB_OY);
  const d = PX.dim, e = PX.emit, f = PX.fl; PX.dim = DIM; PX.emit = false; PX.fl = 0;
  try { withCtx(g, () => sardineStill(0, 0, open)); } finally { PX.dim = d; PX.emit = e; PX.fl = f; }
  SUB_PIC[k] = c; return c;
}
/** The still parts of SARDINE 1, its waterline at (cx, wl): a round yellow hull, portholes' brass, rivets, painted fish eyes on the bow, the conning tower with its name and hatch, a periscope. */
function sardineStill(cx: number, wl: number, hatchOpen: boolean): void {
  const Y = AQ.SUB, YH = AQ.SUB_HI, YD = AQ.SUB_DK, YS = AQ.SUB_SH;
  for (let i = -92; i <= 92; i++) { const u = i / 92, hh = Math.round(34 * Math.sqrt(Math.max(0, 1 - u * u)) * (i > 0 ? 1 : 0.9)); if (hh <= 0) continue; r(cx + i, wl - hh + 8, 1, hh * 2 - 8, Y); r(cx + i, wl - hh + 8, 1, 2, YH); r(cx + i, wl + hh - 12, 1, 4, YD); }
  for (let i = -80; i <= 80; i += 6) { const hh = Math.round(34 * Math.sqrt(Math.max(0, 1 - (i / 92) ** 2))); r(cx + i, wl - hh + 12, 1, 1, YS); r(cx + i, wl - 4, 1, 1, YS); }
  r(cx - 88, wl - 6, 176, 1, YS); // a seam
  for (const px of [-52, -24, 4]) { disc(cx + px, wl - 12, 6, AQ.BRASS_DK); disc(cx + px, wl - 12, 5, AQ.BRASS); }
  disc(cx + 62, wl - 16, 7, K.WHITE); disc(cx + 64, wl - 16, 4, [20, 20, 28]); r(cx + 62, wl - 19, 2, 2, K.WHITE);
  for (let k = 0; k < 10; k++) r(cx + 64 + k, wl - 2 - Math.round(Math.sin(k / 9 * Math.PI) * 3), 1, 1, AQ.NAVY);
  r(cx - 20, wl - 58, 40, 30, Y); r(cx - 20, wl - 58, 40, 2, YH); r(cx + 16, wl - 56, 4, 28, YD); r(cx - 20, wl - 58, 2, 30, YH);
  txt('SARDINE', cx - tw('SARDINE') / 2, wl - 50, AQ.NAVY); txt('1', cx - tw('1') / 2, wl - 43, AQ.NAVY);
  r(cx - 18, wl - 64, 1, 6, [90, 96, 110]); r(cx + 17, wl - 64, 1, 6, [90, 96, 110]); r(cx - 18, wl - 64, 36, 1, [90, 96, 110]);
  if (hatchOpen) { r(cx - 8, wl - 60, 16, 2, [40, 44, 50]); r(cx - 9, wl - 72, 3, 12, YD); r(cx - 9, wl - 72, 1, 12, YH); }
  else { r(cx - 8, wl - 61, 16, 3, YD); r(cx - 8, wl - 61, 16, 1, YH); }
  r(cx + 8, wl - 80, 2, 22, [90, 96, 110]); r(cx + 8, wl - 82, 7, 3, [90, 96, 110]);
  r(cx - 96, wl - 6, 4, 4, YD);
}
/** SARDINE 1 afloat with its waterline at y: the picture of it, then what's alive on it (lit portholes, the open hatch's light, the periscope's glint, the propeller turning). */
export function sardine(cx: number, wl: number, a: number, hatchOpen: boolean): void {
  PX.ctx.drawImage(sardinePic(hatchOpen), cx - SUB_OX, wl - SUB_OY);
  const night = 1 - dayness() * 0.2;
  for (const px of [-52, -24, 4]) { lit(() => { disc(cx + px, wl - 12, 3, M([255, 200, 120], [255, 230, 170], night)); r(cx + px - 2, wl - 14, 2, 1, K.WHITE); }); Gd(cx + px, wl - 12, 10, [255, 200, 120], 0.2); }
  if (hatchOpen) lit(() => r(cx - 6, wl - 60, 12, 1, [255, 214, 150]));
  lit(() => r(cx + 14, wl - 81, 1, 1, [200, 240, 255]));
  const pr = Math.floor(a * 3) % 2; r(cx - 99, wl - 12 + pr * 2, 3, 6, [150, 156, 166]); r(cx - 99, wl - 2 - pr * 2, 3, 6, [150, 156, 166]);
}
function drawBack(a: number): void {
  doors(a); shopLight();
  if (seen(AQR.gallery, AQR.tank0)) { for (let i = 0; i < 12; i++) galleryTank(i, a); for (let k = 0; k < 4; k++) { const lx = AQR.gallery + 40 + k * 110; lit(() => r(lx - 3, CEIL - 4, 6, 3, [200, 230, 255])); } if (isHalloween()) for (const [cx, s] of [[TANK_X0 - 3, 1], [TANK_X0 + 5 * TANK_PITCH + TANK_W + 3, -1]] as [number, number][]) web(cx, TANK_Y[0] - 3, s); }
  oceanTank(a); jellyRoom(a); subPen(a);
}

// ---------------------------------------------------------------- props ----------------------------------------------------------------
/**
 * A prop whose look never changes: drawn once (in the room's light, just as it would be live) into a little picture that's
 * stamped every frame after (text and ovals are costly to draw 60 times a second), and only while it's in view. `box` = the
 * part of the set it covers; `live` draws what moves on it (no glows in `still`: those have to be drawn every frame).
 */
function stillProp(y: number, box: Rect, still: () => void, live?: (a: number) => void): Prop {
  let c: HTMLCanvasElement | null = null;
  return { y, draw(a: number) {
    if (!seen(box.x0, box.x1)) return;
    if (!c) {
      const cv = mk(box.x1 - box.x0, box.y1 - box.y0), g = cv.getContext('2d')!; g.translate(-box.x0, -box.y0);
      const d = PX.dim, e = PX.emit, f = PX.fl; PX.dim = DIM; PX.emit = false; PX.fl = 0;
      try { withCtx(g, still); } finally { PX.dim = d; PX.emit = e; PX.fl = f; }
      c = cv;
    }
    PX.ctx.drawImage(c, box.x0, box.y0);
    live?.(a);
  } };
}
/** The ticket desk: a curved counter, ADMISSION FREE, a bell, a donations box with one coin in it, a stamp. */
const ticketDesk = stillProp(524, { x0: 120, y0: 480, x1: 182, y1: 526 }, () => {
  const x = 150, y = 524;
  r(x - 26, y - 30, 52, 30, AQ.BAND); r(x - 26, y - 30, 52, 2, AQ.BAND_HI); r(x - 28, y - 32, 56, 3, AQ.WALL_HI); r(x + 22, y - 28, 4, 28, AQ.BAND_DK);
  r(x - 22, y - 24, 44, 9, K.WHITE); txt('ADMISSION', x - tw('ADMISSION') / 2, y - 23, AQ.BAND_DK); txt('FREE', x - tw('FREE') / 2, y - 12, K.WHITE);
  r(x - 20, y - 38, 8, 6, [220, 230, 236]); r(x - 20, y - 38, 8, 1, K.WHITE); r(x - 17, y - 36, 2, 2, [255, 214, 90]); // the donations box, one coin
  disc(x + 6, y - 34, 3, [230, 190, 70]); r(x + 5, y - 38, 2, 1, [150, 110, 40]); // the bell
  r(x + 14, y - 38, 3, 6, AQ.WOOD); r(x + 12, y - 33, 7, 2, [200, 60, 60]); // the stamp
});
/** A brochure stand. */
const brochures = stillProp(504, { x0: 24, y0: 472, x1: 44, y1: 506 }, () => { const x = 34, y = 504; r(x - 1, y - 30, 2, 30, [120, 126, 136]); r(x - 7, y - 2, 14, 2, [120, 126, 136]); for (let k = 0; k < 3; k++) { r(x - 8, y - 30 + k * 8, 16, 7, [90, 96, 106]); r(x - 7, y - 29 + k * 8, 6, 6, CONFETTI[k * 2]); r(x + 1, y - 29 + k * 8, 6, 6, CONFETTI[k * 2 + 1]); } });
/** The gift shop's till counter: a cash register with a green screen, a pot of pencils, sweets. */
const till = stillProp(522, { x0: AQR.till - 38, y0: 474, x1: AQR.till + 38, y1: 524 }, () => {
  const x = AQR.till, y = 522;
  r(x - 34, y - 28, 68, 28, AQ.WOOD); r(x - 34, y - 28, 68, 2, AQ.WOOD_HI); r(x - 36, y - 30, 72, 3, AQ.WOOD_HI); r(x + 30, y - 26, 4, 26, AQ.WOOD_DK);
  for (let k = 0; k < 3; k++) r(x - 28 + k * 20, y - 20, 14, 14, AQ.WOOD_DK);
  r(x - 4, y - 44, 22, 14, [70, 74, 84]); r(x - 4, y - 44, 22, 1, [110, 116, 126]); r(x - 2, y - 30, 26, 2, [50, 54, 60]);
  r(x - 24, y - 38, 6, 8, [230, 230, 236]); for (let k = 0; k < 3; k++) r(x - 23 + k * 2, y - 42, 1, 5, CONFETTI[k]);
  r(x + 22, y - 36, 8, 6, [250, 250, 250]); for (let k = 0; k < 4; k++) r(x + 23 + k * 2, y - 35, 1, 1, CONFETTI[k + 1]);
}, (a) => { const x = AQR.till, y = 522; lit(() => { r(x - 2, y - 42, 12, 5, [20, 60, 30]); txt((Math.floor(a) % 4 < 2 ? '0.00' : 'HI!'), x - 1, y - 42, [120, 255, 140]); }); });
/** The postcard spinner, turning slowly. */
const postcards: Prop = { y: 534, draw(a: number) { if (!seen(190, 222)) return; const x = 206, y = 534, s = Math.floor(a * 1.5) % 3; r(x - 1, y - 44, 2, 44, [150, 156, 166]); r(x - 8, y - 2, 16, 2, [150, 156, 166]); for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) { const c = CONFETTI[(k + j + s) % CONFETTI.length]; r(x - 9 + j * 6, y - 42 + k * 9, 5, 7, M(c, K.WHITE, 0.3)); r(x - 8 + j * 6, y - 40 + k * 9, 3, 2, c); } } };
/** The curator's desk: wood, a big open ledger, a brass bell, a magnifying glass, a jar of fish food. */
const curatorDesk = stillProp(526, { x0: AQR.desk - 40, y0: 484, x1: AQR.desk + 40, y1: 528 }, () => {
  const x = AQR.desk, y = 526;
  r(x - 36, y - 26, 72, 26, AQ.WOOD); r(x - 36, y - 26, 72, 2, AQ.WOOD_HI); r(x - 38, y - 28, 76, 3, AQ.WOOD_HI); r(x + 32, y - 24, 4, 24, AQ.WOOD_DK);
  r(x - 30, y - 20, 26, 16, AQ.WOOD_DK); r(x + 4, y - 20, 26, 16, AQ.WOOD_DK); r(x - 19, y - 13, 4, 2, AQ.BRASS); r(x + 15, y - 13, 4, 2, AQ.BRASS);
  txt('CURATOR', x - tw('CURATOR') / 2, y - 26, [250, 236, 200]);
  r(x - 20, y - 36, 28, 8, [248, 244, 232]); r(x - 7, y - 36, 2, 8, [200, 190, 170]); for (let k = 0; k < 3; k++) { r(x - 18, y - 34 + k * 2, 9, 1, [150, 150, 160]); r(x - 3, y - 34 + k * 2, 9, 1, [150, 150, 160]); } // the ledger
  disc(x + 16, y - 32, 3, AQ.BRASS); r(x + 15, y - 36, 2, 1, AQ.BRASS_DK); // the bell
  ring(x + 26, y - 34, 3, 3, [60, 60, 70]); line(x + 28, y - 31, x + 31, y - 29, [60, 60, 70]); // the magnifying glass
  r(x - 32, y - 38, 7, 9, [220, 236, 240]); r(x - 31, y - 34, 5, 4, [230, 170, 100]); r(x - 32, y - 39, 7, 2, [200, 60, 60]); // fish food
});
/** A long bench facing the ocean tank. */
const bench = (x: number): Prop => ({ y: 538, draw() { if (!seen(x - 44, x + 44)) return; r(x - 44, 528, 88, 3, [40, 110, 160]); r(x - 44, 528, 88, 1, [80, 150, 200]); r(x - 44, 531, 88, 3, AQ.WOOD); r(x - 44, 533, 88, 1, AQ.WOOD_DK); for (const lx of [x - 40, x + 36]) { r(lx, 534, 4, 4, [60, 64, 72]); r(lx, 534, 1, 4, [90, 96, 106]); } } });
/** THE TOUCH POOL: a low, round-edged pool with starfish, a crab, a sea cucumber, a hermit crab and an urchin in it. */
const touchPool = stillProp(584, { x0: AQR.touch - 54, y0: 552, x1: AQR.touch + 54, y1: 596 }, () => {
  const x = AQR.touch, y = 570;
  oval(x, y + 6, 52, 16, [60, 70, 80]); oval(x, y + 2, 52, 15, [120, 130, 140]); oval(x, y, 48, 12, [150, 160, 170]);
  lit(() => oval(x, y, 44, 10, [40, 120, 150]));
  txt('TOUCH POOL', x - tw('TOUCH POOL') / 2, y + 12, [230, 240, 244]); txt('2 FINGERS, GENTLY', x - tw('2 FINGERS, GENTLY') / 2, y + 18, [200, 214, 220]);
}, (a) => {
  const x = AQR.touch, y = 570;
  lit(() => { for (let k = 0; k < 6; k++) { const sx = x - 34 + ((k * 13 + Math.floor(a * 4)) % 64); r(sx, y - 6 + (k % 3) * 4, 5, 1, [110, 200, 220]); } });
  // who lives in it
  const S: RGB = [255, 150, 90]; r(x - 26, y - 1, 5, 1, S); r(x - 24, y - 3, 1, 5, S); r(x - 25, y - 2, 3, 3, S); // a starfish
  r(x + 20, y - 2, 4, 3, [110, 60, 90]); for (let k = 0; k < 5; k++) r(x + 18 + k * 2, y - 4 + (k % 2), 1, 1, [70, 30, 60]); // an urchin
  const cw = Math.round(Math.sin(a * 0.8) * 4); r(x - 4 + cw, y + 3, 5, 2, [224, 90, 70]); r(x - 5 + cw, y + 2, 1, 1, [224, 90, 70]); r(x + 1 + cw, y + 2, 1, 1, [224, 90, 70]); // a crab
  r(x + 6, y - 5, 8, 3, [120, 90, 60]); r(x + 6, y - 5, 8, 1, [150, 120, 90]); // a sea cucumber
  disc(x - 12, y + 4, 2, [230, 220, 200]); if ((a * 0.3) % 1 < 0.5) r(x - 10, y + 3, 1, 1, [224, 90, 70]); // a hermit crab in its shell
  alpha(0.18, () => lit(() => r(x - 40, y - 8, 12, 1, K.WHITE)));
});
/** The jelly room's round bench, and the sign in front of the jellies. */
const jellyBench = stillProp(546, { x0: 1302, y0: 528, x1: 1358, y1: 548 }, () => { const x = 1330; r(x - 26, 536, 52, 8, [70, 50, 110]); oval(x, 544, 26, 3, [56, 40, 90]); for (let k = 0; k < 6; k++) r(x - 22 + k * 9, 537, 1, 6, [90, 66, 140]); oval(x, 536, 26, 5, [120, 90, 170]); oval(x, 535, 20, 3, [146, 116, 196]); r(x - 1, 535, 2, 1, [90, 66, 140]); });
const jellySign = stillProp(500, { x0: 1246, y0: 464, x1: 1294, y1: 502 }, () => { const x = 1270, y = 500; r(x - 1, y - 20, 2, 20, [60, 64, 72]); r(x - 22, y - 34, 44, 18, [18, 24, 44]); r(x - 22, y - 34, 44, 1, [60, 80, 120]); for (const [s, dy] of [['NO BRAINS.', 32], ['NO BONES.', 26], ['NO PROBLEMS.', 20]] as [string, number][]) lit(() => txt(s, x - tw(s) / 2, y - dy, [150, 190, 255])); });
/** The pool's railing, in front of SARDINE 1 (players on the dock stand in front of it). */
const railing = stillProp(POOL_Y1 + 8, { x0: AQR.pool0 - 2, y0: POOL_Y1 - 20, x1: AQR.pool1 + 6, y1: POOL_Y1 + 8 }, () => {
  const y = POOL_Y1 + 6, gap0 = GANGWAY - 15, gap1 = GANGWAY + 15;
  for (let x = AQR.pool0; x <= AQR.pool1; x += 28) if (x < gap0 || x > gap1) { r(x, y - 22, 3, 22, AQ.HAZ); r(x, y - 22, 1, 22, [255, 230, 140]); }
  for (const ry of [y - 22, y - 12]) { r(AQR.pool0, ry, gap0 - AQR.pool0, 2, AQ.HAZ); r(gap1, ry, AQR.pool1 + 3 - gap1, 2, AQ.HAZ); }
}, () => { // the chain across the gangway's foot while SARDINE 1's away (with when it's back); unhooked, hanging off its post, while it boards
  const y = POOL_Y1 + 6, gap0 = GANGWAY - 15;
  if (hatchOpen()) { for (let k = 0; k <= 9; k++) r(gap0 + 1 + (k > 6 ? k - 6 : 0), y - 18 + k * 2, 1, 1, [150, 156, 166]); return; }
  for (let k = 0; k <= 14; k++) r(gap0 + 2 + k * 2, y - 16 + Math.round(Math.sin(k / 14 * Math.PI) * 4), 1, 1, [150, 156, 166]);
  const t = mmss(backIn()); r(GANGWAY - 15, y - 13, 30, 12, K.WHITE); r(GANGWAY - 15, y - 13, 30, 2, [230, 60, 60]); txt('BACK IN', GANGWAY - tw('BACK IN') / 2, y - 10, [40, 40, 50]); txt(t, GANGWAY - tw(t) / 2, y - 4, [40, 40, 50]);
});
/** A coil of rope and a toolbox on the dock. */
const rope = stillProp(540, { x0: 1438, y0: 524, x1: 1476, y1: 542 }, () => { const x = 1452, y = 540; for (let k = 0; k < 4; k++) ring(x, y - 3 - k * 2, 11 - k, 3, [190, 160, 110]); r(x + 9, y - 4, 10, 2, [190, 160, 110]); });
const toolbox = stillProp(556, { x0: 1758, y0: 540, x1: 1782, y1: 558 }, () => { const x = 1770, y = 556; r(x - 10, y - 10, 20, 10, [210, 50, 50]); r(x - 10, y - 10, 20, 2, [240, 90, 90]); r(x - 4, y - 14, 8, 2, [60, 60, 70]); r(x - 5, y - 13, 1, 3, [60, 60, 70]); r(x + 4, y - 13, 1, 3, [60, 60, 70]); });

// ---------------------------------------------------------------- spots (append only!) and talkers ----------------------------------------------------------------
const TANK_VIEW = { x: (AQR.tank0 + AQR.tank1) / 2, top: 298 }, JELLY_VIEW = { x: 1330, top: 306 };
const seat = (x: number, y: number, lift: number, watch: { x: number; top: number }): Spot => ({ kind: 'sit', x, y, sx: x, sy: y + 12, lift, label: 'SIT', area: { x0: x - 16, y0: y - 16, x1: x + 16, y1: y + 2 }, watch });
export const AQ_SPOTS: Spot[] = [
  { kind: 'donate', x: AQR.desk, y: 540, sx: AQR.desk, sy: 540, lift: 0, label: 'DONATE', area: { x0: AQR.desk - 38, y0: 488, x1: AQR.desk + 38, y1: 526 } }, // 0
  { kind: 'giftshop', x: AQR.till, y: 536, sx: AQR.till, sy: 536, lift: 0, label: 'SHOP', area: { x0: AQR.till - 36, y0: 474, x1: AQR.till + 36, y1: 522 } }, // 1
  seat(876, 539, 9, TANK_VIEW), seat(916, 539, 9, TANK_VIEW), seat(1076, 539, 9, TANK_VIEW), seat(1116, 539, 9, TANK_VIEW), // 2-5
  { kind: 'touch', x: AQR.touch, y: 594, sx: AQR.touch, sy: 594, lift: 0, label: 'TOUCH', area: { x0: AQR.touch - 50, y0: 556, x1: AQR.touch + 50, y1: 584 } }, // 6
  { kind: 'feedfish', x: AQR.ladder - 16, y: 486, sx: AQR.ladder - 16, sy: 486, lift: 0, label: 'FEED', area: { x0: AQR.ladder - 12, y0: 380, x1: AQR.ladder + 10, y1: 470 } }, // 7
  seat(1316, 547, 6, JELLY_VIEW), seat(1344, 547, 6, JELLY_VIEW), // 8-9
  { kind: 'sealog', x: AQR.board, y: 492, sx: AQR.board, sy: 492, lift: 0, label: 'THE SEA LIFE LOG', area: { x0: AQR.board - 42, y0: 386, x1: AQR.board + 42, y1: 438 } }, // 10: THE DIVE BOARD: read your SEA LIFE LOG
];
export const SPOT = { DONATE: 0, SHOP: 1, TOUCH: 6, FEED: 7 };
const T_ = (id: string, name: string, verb: string, x: number, y: number, sx: number, lines: string[]): Talker => ({ id: 'aq-' + id, name, verb, x, y, sx, sy: 486, lines });
const TALK: Talker[] = [
  T_('height', 'HEIGHT CHART', 'READ', 22, 380, 34, ['YOU ARE AS TALL AS: a seahorse? a penguin? a small shark?', 'someone has written DORIS at the very top. in pen']),
  T_('map', 'MAP', 'READ', 147, 360, 147, ['THE CITY AQUARIUM. the gift shop, the fish gallery, the ocean tank, the jelly room, and the sub pen at the far end', 'YOU ARE HERE. well, obviously']),
  T_('bell', 'THE BELL', 'RING', 156, 496, 156, ['*DING*', '*DING DING*', 'nobody comes. MARINA is probably feeding something']),
  T_('shelves', 'PLUSHIES', 'LOOK', AQR.shop + 60, 386, AQR.shop + 60, ['plush sharks, octopuses and jellyfish. the till sells the good stuff', 'a shark plush looks at you. you look at the shark plush']),
  T_('gallery', 'THE FISH GALLERY', 'READ', 550, 330, 610, ['THE FISH GALLERY: one tank for everything you can catch off the Pier', 'donate a catch at the CURATOR\'S DESK. a bigger one takes the plaque']),
  T_('doris', 'THE OCEAN TANK', 'LOOK', 1000, 330, 1000, ['DORIS the whale shark: 9 metres, gentle, and she never stops eating', 'the mantas are called PANCAKE and WAFFLE', 'feeding time is every 15 minutes: :00, :15, :30 and :45']),
  T_('jelly', 'MOON JELLIES', 'LOOK', 1330, 360, 1330, ['moon jellies: 95% water, 5% vibes', 'they say if three people dance in here the jellies dance too']),
  T_('gate', 'SEA GATE', 'READ', 1592, 368, 1560, ['the SEA GATE: under the water it opens out to the ocean. SARDINE 1 comes and goes through it', 'a green light means the gate is open']),
  T_('ring', 'LIFE RING', 'LOOK', AQR.pen + 32, 400, AQR.pen + 32, ['a life ring. in case of pool', 'SARDINE 1 has an escape hatch too. it shoots you up in a rubber ring']),
  T_('lockers', 'LOCKERS', 'LOOK', AQR.board - 11, 442, AQR.board - 30, ['wetsuits, flippers, and one very old sandwich', 'CREW ONLY. the sign is laminated, so it must be true']),
];

export function makeAquarium(): Room {
  const room: Room = {
    id: 'aquarium', title: 'THE CITY AQUARIUM', sub: 'PAST THE LIGHTHOUSE',
    w: W, h: H,
    floor: { x0: 14, y0: FL + 8, x1: W - 14, y1: 596 },
    blockers: [
      { x0: 124, y0: 514, x1: 176, y1: 526 }, // the ticket desk
      { x0: 27, y0: 499, x1: 41, y1: 506 }, // brochures
      { x0: AQR.till - 34, y0: 512, x1: AQR.till + 34, y1: 524 }, { x0: 199, y0: 529, x1: 213, y1: 536 }, // the till, the postcards
      { x0: AQR.desk - 36, y0: 516, x1: AQR.desk + 36, y1: 528 }, // the curator's desk
      { x0: 856, y0: 528, x1: 944, y1: 536 }, { x0: 1056, y0: 528, x1: 1144, y1: 536 }, // the benches
      { x0: AQR.touch - 52, y0: 558, x1: AQR.touch + 52, y1: 586 }, // the touch pool
      { x0: 1304, y0: 536, x1: 1356, y1: 546 }, { x0: 1268, y0: 494, x1: 1272, y1: 502 }, // the jelly bench, its sign
      { x0: AQR.pool0 - 4, y0: FL, x1: AQR.pool1 + 4, y1: POOL_Y1 + 6 }, // the moon pool
      { x0: 1442, y0: 534, x1: 1466, y1: 542 }, { x0: 1760, y0: 550, x1: 1780, y1: 558 }, // rope, toolbox
    ],
    doors: [
      { trigger: { x0: AQR.door - 18, y0: FL + 8, x1: AQR.door + 18, y1: FL + 16 }, to: 'pier', arrive: AQ_ARRIVE, label: 'THE PIER', area: { x0: AQR.door - 34, y0: 374, x1: AQR.door + 34, y1: FL + 8 } },
      // up the gangway into SARDINE 1, while it's boarding
      { trigger: { x0: GANGWAY - 12, y0: POOL_Y1 + 6, x1: GANGWAY + 12, y1: POOL_Y1 + 14 }, to: 'sub', arrive: SUB_ARRIVE, label: 'SARDINE 1', area: { x0: GANGWAY - 16, y0: 450, x1: GANGWAY + 16, y1: POOL_Y1 + 6 }, route: () => (hatchOpen() ? { to: 'sub', arrive: SUB_ARRIVE, label: 'SARDINE 1' } : null) },
    ],
    spots: AQ_SPOTS, inUse: new Map(),
    onState(s: StateMsg) { if (s.k === 'aq') GAL.dirty = true; },
    spawn: { x: AQR.door, y: 500 },
    dim: DIM,
    fillTop: 'rgb(10,20,38)', fillLow: 'rgb(79,126,134)',
    bg: mk(W, H),
    build: () => build.call(room),
    drawBack,
    props: [ticketDesk, brochures, till, postcards, curatorDesk, bench(900), bench(1100), touchPool, jellyBench, jellySign, railing, rope, toolbox],
    talkers: TALK,
  };
  return room;
}
