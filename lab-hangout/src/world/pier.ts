// THE PIER — walk off the right edge of the Square and you're on the beach. A pier runs out
// into the sea (fish off the end of it), a bonfire burns on the sand with logs to sit on and
// marshmallows to roast, a lighthouse sweeps the water, and crabs scuttle about. The sky and
// sea follow the Square's day/night loop. Past the lighthouse the beach carries on along a
// boardwalk to THE CITY AQUARIUM (world/aquarium.ts), with its SUB PEN beside it: SARDINE 1's
// periscope heads out to sea when a dive starts, and comes back when it ends (game/sub.ts).

import { K, DK, PK, AQ, type RGB } from '../engine/palette';
import { mk, r, line, disc, oval, ring, txt, tw, alpha, lit, G, Gd, Gline, M, shade, bake } from '../engine/pixel';
import { h1 } from '../engine/math';
import { dayness } from './plaza';
import { bakeDayNight, type Room, type Prop, type Spot } from './room';
import { scoreboard } from './contest';
import { SUB_BOARD, SUB_DOWN, SUB_HOME, SUB_UP, dive, hatchOpen, penSink, periscopeOut } from '../game/sub';
import { feeding } from '../game/aquarium';

const W = 1900, H = 720, HORIZON = 380, SHORE = 548;
/** The beach as it was before the aquarium was built on its end: the old scatter (stars, sand, shells, waves) stays where it was. */
const W0 = 1300;
/** THE CITY AQUARIUM's front on the shoreline (x0..x1, its doors centred on `door`), and the SUB PEN beside it (pen0..pen1). */
export const AQF = { x0: 1360, x1: 1790, door: 1570, pen0: 1796, pen1: 1890 };
/** Where you step out of the aquarium's doors onto the boardwalk. */
export const AQ_ARRIVE = { x: AQF.door, y: 584 };
const PIER = { x0: 700, x1: 760, y0: 420 };
export const PIER_FIRE = { x: 380, y: 630 };
const MOON_X = 980;

// ---------- the set ----------
function paint(ctx: CanvasRenderingContext2D, day: boolean): void {
  bake(ctx, () => {
    
    const S0 = day ? DK.SKY0 : K.SKY0, S1 = day ? DK.SKY1 : K.SKY1, S2 = day ? DK.SKY2 : K.SKY2;
    for (let y = 0; y < HORIZON; y += 4) { const u = y / HORIZON; r(0, y, W, 4, u < 0.6 ? M(S0, S1, u / 0.6) : M(S1, S2, (u - 0.6) / 0.4)); }
    if (!day) { for (let i = 0; i < 200; i++) r(Math.floor(h1(i * 6.1) * W0), Math.floor(h1(i * 3.3) * (HORIZON - 40)), 1, 1, h1(i) > 0.8 ? [220, 225, 255] : [120, 130, 180]); for (let dy = -14; dy <= 14; dy++) { const w = Math.floor(Math.sqrt(196 - dy * dy)); r(MOON_X - w, 120 + dy, 2 * w + 1, 1, [240, 240, 220]); } }
    else { for (let dy = -16; dy <= 16; dy++) { const w = Math.floor(Math.sqrt(256 - dy * dy)); r(MOON_X - w, 140 + dy, 2 * w + 1, 1, DK.SUN); } for (let i = 0; i < 7; i++) { const x = 40 + Math.floor(h1(i * 2.2 + 7) * 1200), y = 60 + Math.floor(h1(i * 4.1 + 2) * 180); r(x, y, 34, 6, DK.CLOUD); r(x + 8, y - 4, 18, 4, DK.CLOUD); } }
    // sea: deeper toward the horizon
    for (let y = HORIZON; y < SHORE; y += 4) { const u = (y - HORIZON) / (SHORE - HORIZON); r(0, y, W, 4, day ? M([70, 140, 200], [110, 180, 220], u) : M(PK.SEA0, PK.SEA2, u)); }
    r(0, HORIZON, W, 1, day ? [200, 230, 250] : [60, 80, 130]);
    // the lighthouse on its rocks, far right
    for (let k = 0; k < 7; k++) oval(1180 + k * 14 - 40, 404 + (k % 2) * 4, 22, 10, k % 2 ? PK.ROCK : PK.ROCK_HI);
    for (let y = 250; y < 400; y++) { const w = 12 + Math.floor((y - 250) / 12); r(1180 - w, y, w * 2, 1, Math.floor((y - 250) / 30) % 2 ? PK.LIGHT_RED : PK.LIGHT); }
    r(1164, 232, 32, 18, [40, 44, 52]); r(1160, 228, 40, 5, [60, 64, 72]); r(1170, 222, 20, 7, [40, 44, 52]);
    // the pier: posts in the water, then planks all the way to the sand
    for (let y = PIER.y0; y < SHORE + 8; y += 26) for (const px of [PIER.x0 + 2, PIER.x1 - 6]) { r(px, y + 4, 4, 22, PK.WOOD_DK); }
    for (let y = PIER.y0; y < SHORE + 10; y += 5) { r(PIER.x0, y, PIER.x1 - PIER.x0, 4, PK.WOOD); r(PIER.x0, y, PIER.x1 - PIER.x0, 1, PK.WOOD_HI); r(PIER.x0, y + 4, PIER.x1 - PIER.x0, 1, PK.WOOD_DK); }
    for (const px of [PIER.x0 - 2, PIER.x1]) { r(px, PIER.y0 - 14, 2, SHORE - PIER.y0 + 10, PK.WOOD_DK); for (let y = PIER.y0 - 14; y < SHORE; y += 26) r(px - 1, y, 4, 4, PK.WOOD_HI); }
    // sand
    r(0, SHORE, W, H - SHORE, PK.SAND); r(0, SHORE, W, 10, PK.WET);
    for (let i = 0; i < 1400; i++) r(Math.floor(h1(i * 1.7) * W0), SHORE + 10 + Math.floor(h1(i * 2.9) * (H - SHORE - 10)), 1, 1, h1(i) > 0.5 ? PK.SAND2 : PK.SAND_DK);
    for (let i = 0; i < 12; i++) { const x = Math.floor(h1(i * 9.1) * W0), y = SHORE + 20 + Math.floor(h1(i * 4.4) * 140); r(x, y, 3, 2, h1(i) > 0.5 ? [240, 220, 230] : [230, 200, 160]); } // shells
    txt('<- SQUARE', 20, SHORE + 12, PK.SAND_DK);
    // past the lighthouse: more beach, more stars, and THE CITY AQUARIUM
    if (!day) for (let i = 0; i < 90; i++) r(W0 + Math.floor(h1(i * 5.3 + 3) * (W - W0)), Math.floor(h1(i * 2.9 + 1) * (HORIZON - 40)), 1, 1, h1(i + 7) > 0.8 ? [220, 225, 255] : [120, 130, 180]);
    for (let i = 0; i < 700; i++) r(W0 + Math.floor(h1(i * 2.3 + 11) * (W - W0)), SHORE + 10 + Math.floor(h1(i * 3.7 + 5) * (H - SHORE - 10)), 1, 1, h1(i + 0.5) > 0.5 ? PK.SAND2 : PK.SAND_DK);
    for (let i = 0; i < 6; i++) { const x = W0 + Math.floor(h1(i * 7.3 + 2) * (W - W0)), y = SHORE + 60 + Math.floor(h1(i * 4.9) * 110); r(x, y, 3, 2, h1(i + 3) > 0.5 ? [240, 220, 230] : [230, 200, 160]); }
    aqFront(day);
  });
}

// ---------- THE CITY AQUARIUM's front ----------
const AQB = SHORE + 4; // the building's base line
/** How high the building stands above the sea behind it (the whale tail rises higher, over the horizon). */
const AQ_TOP = 400;
/** The aquarium's roofline: a gentle wave. */
const roofY = (x: number): number => 402 + Math.round(Math.sin((x - AQF.x0) / 17) * 2);
/** THE CITY AQUARIUM's front, baked by day and by night: the boardwalk, blue tiles, the glass and the doors, the sign band, the fish mural, the wavy roof, the whale tail, the SUB PEN. */
function aqFront(day: boolean): void {
  const { x0, x1, door, pen0, pen1 } = AQF, nt = (c: RGB, k = 0.55): RGB => (day ? c : M(c, [14, 20, 46], k));
  // the boardwalk: boards running front to back, on two long stringers, casting a shadow on the sand
  const BW: RGB = [176, 144, 104], BWD: RGB = [132, 104, 72], BWH: RGB = [204, 176, 136];
  r(x0 - 24, AQB + 38, pen1 - x0 + 24, 2, nt(PK.SAND_DK, 0.45));
  for (let x = x0 - 24, i = 0; x < pen1; x += 6, i++) { r(x, AQB, 6, 38, nt(M(BW, BWD, h1(i * 1.9) * 0.35), 0.4)); r(x, AQB, 1, 38, nt(BWD, 0.4)); r(x + 1, AQB, 1, 38, nt(BWH, 0.4)); if (h1(i * 3.1) > 0.55) r(x + 3, AQB + 5 + Math.floor(h1(i * 5.3) * 24), 1, 3, nt(BWD, 0.4)); r(x + 3, AQB + 3, 1, 1, nt([90, 80, 70], 0.3)); r(x + 3, AQB + 33, 1, 1, nt([90, 80, 70], 0.3)); }
  r(x0 - 24, AQB, pen1 - x0 + 24, 2, nt(BWH, 0.4)); r(x0 - 24, AQB + 35, pen1 - x0 + 24, 3, nt(BWD, 0.4));
  // the plinth: blue tiles with white grout
  for (let j = 0; j < 2; j++) for (let i = 0; (x0 + i * 8) < x1; i++) { r(x0 + i * 8, AQB - 16 + j * 8, 8, 8, nt((i + j) % 2 ? AQ.TILE : AQ.TILE2)); r(x0 + i * 8, AQB - 16 + j * 8, 8, 1, nt(AQ.TILE_HI, 0.6)); }
  r(x0, AQB - 17, x1 - x0, 1, nt(AQ.WALL_HI));
  // the walls, the sign band, the mural band and the wavy roof
  r(x0, 404, x1 - x0, AQB - 17 - 404, nt(AQ.WALL));
  r(x0, 410, x1 - x0, 16, nt(AQ.BAND)); r(x0, 410, x1 - x0, 1, nt(AQ.BAND_HI)); r(x0, 425, x1 - x0, 1, nt(AQ.BAND_DK));
  const FISH: RGB[] = [[255, 150, 70], [255, 214, 90], [240, 244, 250], [255, 122, 106]];
  for (let k = 0; k < 17; k++) { const fx = x0 + 8 + k * 25 + Math.round(h1(k) * 6), fy = 413 + Math.round(Math.sin(k * 1.3) * 3) + 2, c = nt(FISH[k % 4], 0.45); r(fx, fy, 6, 3, c); r(fx - 2, fy - 1, 2, 5, shade(c, 0.8)); r(fx + 4, fy, 1, 1, nt(AQ.BAND_DK)); if (k % 3 === 0) r(fx + 9, fy - 2, 1, 1, nt(AQ.WALL_HI, 0.5)); }
  for (let x = x0; x < x1; x++) { const t = roofY(x); r(x, t, 1, 410 - t, nt(AQ.WALL_HI)); r(x, t, 1, 1, K.WHITE); }
  r(x0, 408, x1 - x0, 2, nt(AQ.BAND_DK)); r(x0 - 2, 404, 2, AQB - 404, nt(AQ.WALL2)); r(x1, 404, 2, AQB - 404, nt(AQ.WALL2));
  // the whale tail rising out of the roof: a peduncle, then the flukes, curving up at the tips, notched in the middle
  const wx = 1440;
  for (let y = 374; y < roofY(wx) + 1; y++) { const hw = 3 + Math.round((y - 374) / 9); r(wx - hw, y, hw * 2, 1, nt(AQ.BAND_DK)); r(wx - hw, y, 1, 1, nt(AQ.BAND_HI)); }
  for (let dx = -32; dx <= 32; dx++) { const u = Math.abs(dx) / 32, top = Math.round(372 - 11 * Math.pow(u, 1.6) + (Math.abs(dx) < 2 ? 3 : 0)), bot = Math.round(top + 7 - 4 * u); r(wx + dx, top, 1, bot - top, nt(AQ.BAND_DK)); r(wx + dx, top, 1, 1, nt(AQ.BAND_HI)); if (bot - top > 3) r(wx + dx, bot - 1, 1, 1, nt(AQ.SKIRT)); }
  // the sign band: the letters are tubes (lit at night in drawBack), a leaping-fish logo
  const S = 'THE CITY AQUARIUM', sx = door - tw(S, 2) / 2;
  txt(S, sx, 431, day ? AQ.BAND_DK : [40, 70, 90], 2);
  txt('OPEN DAILY · FREE', x0 + 16, 433, day ? AQ.BAND_DK : [90, 130, 160]); // the sign band's left end
  r(sx - 16, 434, 9, 4, nt([255, 150, 70])); r(sx - 19, 432, 3, 3, nt([255, 150, 70])); r(sx - 19, 437, 3, 3, nt([255, 150, 70])); r(sx - 10, 435, 1, 1, nt(AQ.BAND_DK));
  // the glass: either side of the doors, steel mullions, sky reflected by day (the lobby shows through at night: drawBack)
  for (const [gx0, gx1] of [[x0 + 12, door - 30], [door + 30, x1 - 6]]) {
    for (let y = 458; y < AQB - 18; y++) r(gx0, y, gx1 - gx0, 1, day ? M([150, 200, 230], [90, 150, 196], (y - 458) / 76) : M([18, 36, 70], [10, 22, 48], (y - 458) / 76));
    if (day) for (let x = gx0 + 10; x < gx1 - 10; x += 56) for (let j = 0; j < 30; j++) r(x + j, 462 + j * 2, 3, 2, [220, 240, 250]);
    for (let x = gx0; x <= gx1; x += 28) r(Math.min(x, gx1 - 2), 456, 2, AQB - 18 - 456, nt(AQ.FRAME, 0.3));
    r(gx0, 456, gx1 - gx0, 2, nt(AQ.FRAME, 0.3)); r(gx0, 478, gx1 - gx0, 1, nt(AQ.FRAME_HI, 0.3));
  }
  // the doors: two glass leaves with push bars and a wave on the kick plates, under a little canopy
  r(door - 26, 454, 52, AQB - 454, nt(AQ.FRAME, 0.3));
  for (const lx of [door - 24, door + 1]) { for (let y = 458; y < AQB - 14; y++) r(lx, y, 23, 1, day ? M([150, 200, 230], [90, 150, 196], (y - 458) / 80) : [12, 28, 58]); r(lx + 2, 500, 19, 2, nt(AQ.BRASS)); r(lx, AQB - 14, 23, 14, nt(AQ.FRAME_HI, 0.3)); for (let x = 0; x < 23; x++) r(lx + x, AQB - 8 + Math.round(Math.sin(x / 2.5) * 2), 1, 1, nt(AQ.BAND_HI, 0.4)); }
  r(door - 32, 448, 64, 5, nt(AQ.BAND)); r(door - 32, 448, 64, 1, nt(AQ.BAND_HI)); r(door - 32, 452, 64, 1, nt(AQ.SKIRT));
  // THE SUB PEN: a corrugated steel boathouse, a porthole onto the pool inside (drawBack shows what's in it), hazard stripes, the timetable
  const ST: RGB = [132, 142, 152];
  r(pen0, 440, pen1 - pen0, AQB - 440, nt(ST)); for (let x = pen0; x < pen1; x += 4) { r(x, 440, 1, AQB - 440, nt(M(ST, K.WHITE, 0.25))); r(x + 2, 440, 1, AQB - 440, nt(shade(ST, 0.8))); }
  r(pen0 - 3, 436, pen1 - pen0 + 6, 5, nt(shade(ST, 0.7))); r(pen0 - 3, 436, pen1 - pen0 + 6, 1, nt(M(ST, K.WHITE, 0.4)));
  for (let x = pen0; x < pen1; x += 8) { r(x, AQB - 10, 4, 10, nt(AQ.HAZ, 0.4)); r(x + 4, AQB - 10, 4, 10, AQ.HAZ_DK); }
  txt('SUB PEN', (pen0 + pen1) / 2 - tw('SUB PEN') / 2, 446, nt(AQ.HAZ, 0.4));
  const pc = (pen0 + pen1) / 2; disc(pc, 488, 16, nt(AQ.BRASS_DK, 0.4)); disc(pc, 488, 14, nt(AQ.BRASS, 0.4)); disc(pc, 488, 12, [12, 40, 44]);
  for (let k = 0; k < 8; k++) { const an = k / 8 * 6.283; r(Math.round(pc + Math.cos(an) * 15), Math.round(488 + Math.sin(an) * 15), 1, 1, nt(AQ.BRASS_HI, 0.4)); }
  txt('DIVES EVERY', pc - tw('DIVES EVERY') / 2, 510, nt(K.WHITE, 0.5)); txt('8 MINUTES', pc - tw('8 MINUTES') / 2, 517, nt(K.WHITE, 0.5));
  r(pc - 2, 428, 5, 8, nt(shade(ST, 0.7))); // the beacon's stand (drawBack lights it)
}
/** The aquarium's lively bits: the lobby glowing through the glass at night, the sign, the lighthouse's glint, the whale tail's drips, gulls, the pen's porthole and beacon, and SARDINE 1's periscope out at sea. */
function aqBack(a: number, day: number): void {
  const { x0, x1, door, pen0, pen1 } = AQF, night = 1 - day, pc = (pen0 + pen1) / 2;
  if (night > 0.05) {
    alpha(0.75 * night, () => lit(() => { for (const [gx0, gx1] of [[x0 + 12, door - 30], [door + 30, x1 - 6]]) { r(gx0 + 2, 458, gx1 - gx0 - 4, AQB - 18 - 458, [30, 110, 170]); for (let k = 0; k < 10; k++) { const cx = gx0 + 6 + ((k * 37 + Math.floor(a * 6)) % Math.max(1, gx1 - gx0 - 12)), cy = 470 + (k * 13) % 50; r(cx, cy, 6, 1, [90, 190, 240]); } for (let x = gx0 + 16; x < gx1 - 10; x += 56) { r(x, 506, 22, 12, [16, 70, 120]); r(x + 4, 510, 5, 2, [255, 170, 80]); } } for (const lx of [door - 24, door + 1]) r(lx, 458, 23, AQB - 14 - 458, [40, 130, 190]); }));
    for (const [gx0, gx1] of [[x0 + 12, door - 30], [door + 30, x1 - 6]]) { for (let x = gx0; x <= gx1; x += 28) r(Math.min(x, gx1 - 2), 456, 2, AQB - 18 - 456, AQ.FRAME); r(gx0, 478, gx1 - gx0, 1, AQ.FRAME); }
    Gd(door, 500, 60, [60, 160, 230], 0.25 * night); G(x0, 456, x1 - x0, 80, [40, 140, 220], 0.08 * night);
    const S = 'THE CITY AQUARIUM', sx = door - tw(S, 2) / 2, on = night > 0.3;
    if (on) { lit(() => txt(S, sx, 431, [120, 236, 255], 2)); G(sx - 4, 427, tw(S, 2) + 8, 18, [90, 220, 255], 0.2 * night); }
  }
  // the lighthouse's beam glinting across the glass as it sweeps past
  const an = a * 0.7, bx = 1180 + Math.cos(an) * 700;
  if (bx > x0 + 12 && bx < x1 - 6 && Math.sin(an) > -0.2) alpha(0.18 + 0.35 * night, () => lit(() => { r(Math.round(bx) - 2, 458, 5, AQB - 18 - 458, [255, 250, 220]); r(Math.round(bx), 458, 1, AQB - 18 - 458, K.WHITE); }));
  // drips off the whale tail's flukes
  for (let k = 0; k < 3; k++) { const q = (a * 0.5 + k / 3) % 1, dx = [-30, 29, -12][k]; if (q < 0.7) r(1440 + dx, Math.round(366 + q * 50), 1, 2, day > 0.5 ? [200, 230, 250] : [110, 160, 210]); }
  // two gulls on the sign band; now and then one flaps
  for (const [gx, ph] of [[door - 58, 0], [door + 74, 0.5]] as [number, number][]) {
    const flap = ((a * 0.2 + ph) % 1) < 0.08, hop = flap ? -3 : 0, wing = Math.floor(a * 16) % 2;
    r(gx - 3, 422 + hop, 6, 3, [236, 238, 242]); r(gx + 2, 420 + hop, 3, 3, [236, 238, 242]); r(gx + 5, 421 + hop, 2, 1, [255, 190, 60]); r(gx + 3, 421 + hop, 1, 1, [20, 20, 28]); r(gx - 4, 422 + hop, 2, 2, [130, 136, 150]);
    if (flap) r(gx - 3 - (wing ? 2 : 0), 418 + hop - (wing ? 2 : 0), 6, 2, [196, 202, 214]);
    r(gx - 1, 425, 1, 1, [255, 190, 60]); r(gx + 1, 425, 1, 1, [255, 190, 60]);
  }
  // the pen's porthole: the pool inside, and SARDINE 1's yellow conning tower while it's in
  const d = dive(), sink = penSink(d);
  lit(() => { disc(pc, 488, 12, M([12, 60, 66], [30, 100, 104], 0.5 + 0.5 * Math.sin(a * 1.3))); if (sink < 1) { const ty = Math.round(482 + sink * 20 + Math.sin(a * 1.6)); r(pc - 6, ty, 12, 14, AQ.SUB); r(pc - 6, ty, 12, 1, AQ.SUB_HI); r(pc + 4, ty, 2, 14, AQ.SUB_DK); r(pc - 1, ty - 7, 2, 7, [90, 96, 110]); r(pc - 1, ty - 8, 4, 2, [90, 96, 110]); } r(pc - 12, 495, 24, 5, M([20, 80, 88], [40, 120, 120], 0.5)); r(pc - 7, 480, 3, 2, [200, 240, 255]); });
  Gd(pc, 488, 18, [60, 170, 170], 0.12);
  // the beacon: it turns while the sub comes and goes
  const busy = (d.k > SUB_BOARD - 12 && d.k < SUB_DOWN + 30) || d.k > SUB_UP - 30, on = busy && Math.cos(a * 6) > 0;
  if (hatchOpen(d)) lit(() => { r(pc - 24, 507, 48, 14, [16, 18, 24]); if (Math.floor(a * 2) % 3) { txt('BOARDING', pc - tw('BOARDING') / 2, 509, [255, 214, 90]); txt('NOW', pc - tw('NOW') / 2, 515, [255, 214, 90]); } }); // (over DIVES EVERY 8 MINUTES)
  lit(() => { r(pc - 2, 424, 5, 4, on ? [255, 190, 70] : [150, 100, 40]); if (on) r(pc + (Math.sin(a * 6) > 0 ? 3 : -5), 425, 3, 2, [255, 230, 150]); });
  if (busy) Gd(pc, 426, 12, [255, 170, 60], on ? 0.5 : 0.15);
  // out at sea: SARDINE 1's periscope, heading out as a dive starts and coming home as it ends
  const out = periscopeOut(d.k);
  if (out >= 0) {
    const px = Math.round(x0 - 10 - out * 110 + Math.sin(out * 5) * 8), py = Math.round(546 - out * 140), fade = Math.min(1, out / 0.08, out > 0.85 ? (1 - out) / 0.15 : 1);
    alpha(fade, () => { r(px, py - 7, 2, 7, [70, 76, 90]); r(px, py - 8, 4, 2, [70, 76, 90]); lit(() => r(px + 3, py - 8, 1, 1, [200, 240, 255]));
      for (let k = 1; k < 10; k++) { const wy = py + k * 2, wd = k * (d.k < SUB_HOME ? 1.3 : 1.1); lit(() => { r(Math.round(px - wd), wy, 2, 1, day > 0.5 ? K.WHITE : PK.FOAM); r(Math.round(px + 1 + wd), wy, 2, 1, day > 0.5 ? K.WHITE : PK.FOAM); }); } });
  }
  // the sign band's right end: the feeding-time banner (NOW! while the food's going in)
  const f = feeding(), bx0 = door + 82;
  lit(() => { r(bx0, 429, 116, 13, f.on ? (Math.floor(a * 3) % 2 ? [255, 120, 60] : [255, 170, 70]) : [42, 110, 170]); txt(f.on ? 'FEEDING TIME: NOW!' : 'FEEDING EVERY 15 MIN', bx0 + 58 - tw(f.on ? 'FEEDING TIME: NOW!' : 'FEEDING EVERY 15 MIN') / 2, 433, K.WHITE); });
  if (f.on) Gd(bx0 + 58, 435, 30, [255, 150, 70], 0.3);
}

// ---------- animated set pieces ----------
function drawBack(a: number): void {
  const day = dayness(), night = 1 - day;
  if (day > 0.01 && day < 0.99) alpha(0.25 * Math.sin(Math.PI * day), () => r(0, 0, W, SHORE, [255, 140, 90]));
  // waves: light streaks drifting on the water, and the moon's shimmering path
  for (let k = 0; k < 60; k++) { const y = HORIZON + 6 + Math.floor(h1(k) * (SHORE - HORIZON - 12)), x = (h1(k + 1) * W0 + a * (8 + (y - HORIZON) * 0.15)) % (W0 + 40) - 20, w = 6 + Math.floor((y - HORIZON) / 12); r(Math.round(x), y, w, 1, day ? [200, 230, 250] : [60, 90, 150]); }
  for (let k = 0; k < 26; k++) { const y = HORIZON + 6 + Math.floor(h1(k + 71) * (SHORE - HORIZON - 12)), x = W0 - 20 + (h1(k + 72) * (W - W0) + a * (8 + (y - HORIZON) * 0.15)) % (W - W0 + 40), w = 6 + Math.floor((y - HORIZON) / 12); if (y < AQ_TOP || x + w < AQF.x0 - 4 || x > AQF.pen1 + 4) r(Math.round(x), y, w, 1, day ? [200, 230, 250] : [60, 90, 150]); }
  if (night > 0.3) lit(() => { for (let y = HORIZON + 4; y < SHORE - 4; y += 3) { const w = 4 + Math.floor((y - HORIZON) / 8) + Math.round(Math.sin(a * 3 + y) * 3); if ((y + Math.floor(a * 8)) % 2) r(MOON_X - w, y, w * 2, 1, M([60, 80, 130], [230, 230, 210], 0.6 * night)); } });
  // foam lapping the shore
  const lap = Math.sin(a * 0.9) * 5;
  lit(() => { for (let x = 0; x < W; x += 3) if (x < AQF.x0 - 5 || x > AQF.pen1 + 2) r(x, Math.round(SHORE - 2 + lap + Math.sin(x * 0.05 + a * 2) * 2), 3, 1, day ? K.WHITE : PK.FOAM); });
  // lighthouse: the lamp and its sweeping beam
  const an = a * 0.7, on = (Math.cos(an) + 1) / 2;
  lit(() => r(1170, 234, 20, 12, M([255, 220, 150], [255, 255, 230], on)));
  Gd(1180, 240, 24, [255, 240, 180], 0.4 + 0.3 * on);
  const bx = 1180 + Math.cos(an) * 700, by = 240 + Math.sin(an) * 60;
  Gline(1180, 240, bx, by, [255, 245, 200], 0.08 * (0.4 + night), 40); Gline(1180, 240, bx, by, [255, 250, 220], 0.1 * (0.4 + night), 10);
  aqBack(a, day);
}

// ---------- props ----------
const bonfire: Prop = {
  y: PIER_FIRE.y + 4,
  draw(a: number) {
    const { x, y } = PIER_FIRE;
    for (let k = 0; k < 9; k++) { const an = (k / 9) * 6.283; oval(Math.round(x + Math.cos(an) * 16), Math.round(y + Math.sin(an) * 5), 4, 3, k % 2 ? PK.ROCK : PK.ROCK_HI); }
    line(x - 10, y + 2, x + 10, y - 6, PK.LOG, 3); line(x - 10, y - 6, x + 10, y + 2, PK.LOG, 3);
    lit(() => { for (let k = 0; k < 7; k++) { const h = 10 + Math.round(Math.sin(a * 9 + k * 1.7) * 4 + h1(k) * 8), fx = x - 9 + k * 3; r(fx, y - 4 - h, 3, h, k % 2 ? PK.FIRE : PK.FIRE_HI); } for (let k = 0; k < 5; k++) { const ph = (a * 0.8 + k / 5) % 1; alpha(1 - ph, () => r(Math.round(x - 4 + Math.sin(a * 3 + k) * 6), Math.round(y - 20 - ph * 40), 1, 1, PK.FIRE_HI)); } });
    Gd(x, y - 12, 60, [255, 150, 60], 0.28); Gd(x, y - 12, 26, [255, 200, 110], 0.4); G(x - 90, y - 20, 180, 60, [255, 150, 70], 0.06);
  },
};
const log = (x: number, y: number): Prop => ({ y, draw() { r(x - 24, y - 8, 48, 8, PK.LOG); r(x - 24, y - 8, 48, 2, M(PK.LOG, K.WHITE, 0.25)); oval(x - 24, y - 4, 3, 4, PK.TRUNK); oval(x + 24, y - 4, 3, 4, PK.TRUNK); } });
const palm = (x: number, y: number): Prop => ({
  y,
  draw(a: number) {
    for (let k = 0; k < 60; k++) { const u = k / 60; r(Math.round(x + Math.sin(u * 1.4) * 14), y - k * 2, 6, 3, k % 4 ? PK.TRUNK : shade(PK.TRUNK, 0.8)); }
    const tx = Math.round(x + Math.sin(1.4) * 14) + 3, ty = y - 120;
    for (let f = 0; f < 6; f++) { const an = -Math.PI / 2 + (f / 5 - 0.5) * 3 + Math.sin(a * 0.8 + f) * 0.05; for (let j = 0; j < 30; j++) r(Math.round(tx + Math.cos(an) * j), Math.round(ty + Math.sin(an) * j + (j * j) / 30), 3, 2, j > 18 ? PK.PALM : PK.PALM_DK); }
    disc(tx - 3, ty + 4, 3, [110, 80, 40]); disc(tx + 3, ty + 5, 3, [100, 72, 36]);
  },
});
/** The whale shark fountain on the sand in front of the aquarium: a fibreglass whale shark on a rock, in a round stone basin; every few seconds it gushes from its mouth. */
const FOUNT = { x: 1440, y: 630 };
const fountain: Prop = {
  y: FOUNT.y + 8,
  draw(a: number) {
    const { x, y } = FOUNT, day = dayness();
    oval(x, y + 2, 46, 12, PK.ROCK); oval(x, y, 46, 12, PK.ROCK_HI); oval(x, y - 1, 40, 9, PK.ROCK);
    lit(() => { oval(x, y - 1, 39, 8, M([40, 110, 170], [90, 170, 220], day)); for (let k = 0; k < 7; k++) { const sx = x - 30 + ((k * 11 + Math.floor(a * 5)) % 60); r(sx, y - 4 + (k % 3) * 2, 4, 1, M([90, 170, 220], [200, 240, 255], day)); } });
    // the rock and the whale shark lying on it, facing left: blue-grey with white spots, a wide flat mouth, a tall tail
    oval(x + 4, y - 6, 12, 5, PK.ROCK_HI); r(x - 8, y - 10, 24, 5, PK.ROCK);
    const B: RGB = [84, 110, 140], BD: RGB = [60, 80, 106], BH: RGB = [120, 146, 176];
    oval(x, y - 16, 22, 7, B); r(x - 18, y - 21, 30, 2, BH); oval(x + 2, y - 12, 18, 3, [196, 206, 216]);
    r(x - 22, y - 16, 5, 2, [30, 36, 46]); r(x - 16, y - 19, 2, 2, [20, 20, 28]); // the mouth, an eye
    r(x + 2, y - 28, 3, 6, B); r(x + 4, y - 26, 3, 4, BD); r(x + 20, y - 26, 3, 10, B); r(x + 22, y - 30, 3, 8, BD); r(x + 22, y - 18, 3, 5, BD); // fins, the tail
    for (let k = 0; k < 9; k++) r(x - 12 + k * 4, y - 20 + (k % 2) * 3, 1, 1, [232, 238, 244]);
    // the gush: an arc of drops from its mouth into the basin, then rings where it lands
    const q = (a * 0.3) % 1;
    if (q < 0.45) { const u = q / 0.45; lit(() => { for (let k = 0; k < 8; k++) { const v = Math.max(0, u - k * 0.04); if (v <= 0) continue; r(Math.round(x - 24 - v * 20), Math.round(y - 16 - Math.sin(v * Math.PI) * 14 + v * 12), 2, 2, day > 0.5 ? [220, 240, 255] : [150, 200, 240]); } }); }
    if (q > 0.3 && q < 0.75) { const u = (q - 0.3) / 0.45; alpha(1 - u, () => lit(() => ring(x - 44, y - 2, Math.round(3 + u * 8), Math.round(1 + u * 2), [220, 240, 255]))); }
  },
};
/** A chalk A-board on the boardwalk. */
const aBoard: Prop = { y: 604, draw() { const x = 1506, y = 604; line(x - 10, y, x - 7, y - 30, PK.WOOD_DK, 2); line(x + 10, y, x + 7, y - 30, PK.WOOD_DK, 2); r(x - 10, y - 30, 20, 24, PK.WOOD); r(x - 9, y - 29, 18, 22, [40, 52, 50]); for (const [s, yy] of [['DONATE', 26], ['YOUR', 20], ['CATCH!', 14]] as [string, number][]) txt(s, x - tw(s) / 2, y - yy, [236, 240, 236]); r(x - 5, y - 9, 6, 2, [255, 170, 90]); r(x + 1, y - 10, 2, 4, [255, 170, 90]); } };
/** A bike rack with one bike leaning in it. */
const bikes: Prop = { y: 600, draw() { const x = 1716, y = 600; for (let k = 0; k < 4; k++) { r(x - 18 + k * 10, y - 12, 2, 12, [150, 156, 166]); r(x - 18 + k * 10, y - 13, 8, 2, [170, 176, 186]); } ring(x - 6, y - 6, 6, 6, [30, 30, 36]); ring(x + 12, y - 6, 6, 6, [30, 30, 36]); line(x - 6, y - 6, x + 3, y - 14, [210, 60, 70], 2); line(x + 3, y - 14, x + 12, y - 6, [210, 60, 70], 2); line(x - 6, y - 6, x + 5, y - 6, [210, 60, 70], 1); r(x + 1, y - 17, 5, 2, [30, 30, 36]); r(x + 10, y - 16, 4, 1, [150, 156, 166]); } };
/** A bin by the boardwalk. */
const bin: Prop = { y: 596, draw() { const x = 1352, y = 596; r(x - 7, y - 18, 14, 18, [60, 120, 90]); r(x - 8, y - 20, 16, 3, [70, 140, 104]); r(x - 7, y - 18, 2, 18, [90, 160, 120]); r(x - 3, y - 12, 6, 4, [236, 240, 236]); } };
/** The signpost where the old beach ends: AQUARIUM, this way. */
const signpost: Prop = { y: 614, draw() { const x = 1262, y = 614; r(x - 2, y - 40, 4, 40, PK.WOOD_DK); r(x - 1, y - 40, 1, 40, PK.WOOD); r(x - 12, y - 42, 34, 12, PK.WOOD); r(x - 12, y - 42, 34, 1, PK.WOOD_HI); r(x + 22, y - 40, 3, 8, PK.WOOD); r(x + 25, y - 38, 2, 4, PK.WOOD); txt('AQUARIUM', x - 10, y - 39, [250, 244, 226]); r(x - 10, y - 32, 5, 2, [255, 150, 70]); } };
const cooler: Prop = { y: 640, draw() { const x = 470, y = 640; r(x - 14, y - 16, 28, 16, [70, 130, 200]); r(x - 14, y - 16, 28, 4, K.WHITE); r(x - 8, y - 26, 16, 10, PK.MARSH); r(x - 8, y - 26, 16, 1, [220, 216, 200]); txt('MARSH', x - tw('MARSH') / 2, y - 10, K.WHITE); } };

// ---------- spots (index = network id: append only) ----------
export const PIER_SPOTS: Spot[] = [
  { kind: 'fish', x: 712, y: 434, sx: 712, sy: 434, lift: 0, label: 'FISH', area: { x0: 700, y0: 400, x1: 730, y1: 440 } },
  { kind: 'fish', x: 748, y: 434, sx: 748, sy: 434, lift: 0, label: 'FISH', area: { x0: 730, y0: 400, x1: 760, y1: 440 } },
  ...([[340, 609], [420, 609], [340, 661], [420, 661]] as [number, number][]).map(([x, y]): Spot => ({ kind: 'sit', x, y, sx: x, sy: y < 630 ? y - 14 : y + 10, lift: 6, label: 'SIT', area: { x0: x - 24, y0: y - 16, x1: x + 24, y1: y } })),
  { kind: 'marsh', x: 470, y: 652, sx: 470, sy: 652, lift: 0, label: 'MARSHMALLOW', area: { x0: 454, y0: 610, x1: 486, y1: 640 } },
  // the whale shark fountain's rim (7-8)
  ...[FOUNT.x - 22, FOUNT.x + 22].map((x): Spot => ({ kind: 'sit', x, y: FOUNT.y + 13, sx: x, sy: FOUNT.y + 20, lift: 5, label: 'SIT', area: { x0: x - 14, y0: FOUNT.y - 4, x1: x + 14, y1: FOUNT.y + 12 } })),
];

export function makePier(): Room {
  const room: Room = {
    id: 'pier', title: 'THE PIER', sub: 'BEACH',
    w: W, h: H,
    floor: { x0: 14, y0: 424, x1: W - 14, y1: 690 },
    blockers: [
      { x0: 0, y0: 400, x1: PIER.x0 + 4, y1: SHORE + 4 }, { x0: PIER.x1 - 4, y0: 400, x1: W, y1: SHORE + 4 }, // the sea either side of the pier
      { x0: 366, y0: 624, x1: 394, y1: 636 }, // fire
      { x0: 316, y0: 600, x1: 364, y1: 610 }, { x0: 396, y0: 600, x1: 444, y1: 610 }, { x0: 316, y0: 652, x1: 364, y1: 662 }, { x0: 396, y0: 652, x1: 444, y1: 662 }, // logs
      { x0: 456, y0: 632, x1: 484, y1: 642 }, // cooler
      { x0: 116, y0: 572, x1: 132, y1: 580 }, { x0: 1016, y0: 612, x1: 1032, y1: 620 }, // palms
      { x0: FOUNT.x - 46, y0: FOUNT.y - 8, x1: FOUNT.x + 46, y1: FOUNT.y + 10 }, // the whale shark fountain
      { x0: 1496, y0: 598, x1: 1516, y1: 606 }, { x0: 1698, y0: 594, x1: 1734, y1: 602 }, { x0: 1345, y0: 590, x1: 1359, y1: 598 }, { x0: 1259, y0: 610, x1: 1265, y1: 616 }, // the A-board, the bikes, the bin, the signpost
    ],
    doors: [
      { trigger: { x0: 6, y0: 556, x1: 16, y1: 690 }, edge: true, to: 'plaza', arrive: { x: 1368, y: 640 }, label: 'SQUARE', area: { x0: 0, y0: 548, x1: 30, y1: 700 } },
      { trigger: { x0: AQF.door - 18, y0: AQB, x1: AQF.door + 18, y1: AQB + 10 }, to: 'aquarium', arrive: { x: 80, y: 500 }, label: 'AQUARIUM', area: { x0: AQF.door - 26, y0: 452, x1: AQF.door + 26, y1: AQB } },
    ],
    spots: PIER_SPOTS, inUse: new Map(),
    spawn: { x: 60, y: 620 },
    dim: 0.12,
    dimNow: () => 0.12 * (1 - dayness()),
    altAlpha: dayness,
    glowMul: () => 1 - 0.6 * dayness(),
    fillTop: 'rgb(6,10,28)', fillLow: 'rgb(200,168,120)',
    bg: mk(W, H), bgAlt: mk(W, H),
    build: () => bakeDayNight(room, paint),
    drawBack,
    props: [bonfire, log(340, 608), log(420, 608), log(340, 660), log(420, 660), palm(124, 580), palm(1024, 620), cooler, scoreboard, fountain, aBoard, bikes, bin, signpost],
  };
  return room;
}
