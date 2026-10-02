// THE PLANE WRECK (step 19, push 2): Sólheimasandur. A US Navy DC-3 ran out of fuel in 1973 and came down on the black sand;
// everyone walked away, and its shell has sat there since. Outdoors on Iceland's clock. Left to right:
//   THE CAR PARK: the bus, the fence and the farmer's gate, the signs (4 KM · ABOUT 1 HOUR, NO DRIVING ON THE SAND), the SHUTTLE
//   THE SAND: nothing. Flat black sand to the horizon, a marker post every so often along the track, Mýrdalsjökull low on the skyline
//   THE WRECK: the silver fuselage, no wings, no tail, dented and torn; climb on top, or sit in its doorway. Eerie at night under
//     the northern lights (that's the photo everyone wants)
//   and the sea, far off, beyond it.

import { K, IS, type RGB } from '../engine/palette';
import { mk, r, line, disc, oval, txt, tw, lit, alpha, Gd, M } from '../engine/pixel';
import { h1 } from '../engine/math';
import { iceDay, auroraNow } from './iceland';
import { busAt } from '../game/tour';
import { COAST, seen, paintSky, skyLive, weatherFront, landLayer, nightNow, nite, busAtStop, sightSign, snowPole, pixels, spriteDN, sandPx, fbm, vnoise } from './coast';
import type { Prop, Room, Spot, Talker } from './room';

const W = 1900, H = 614, WALL = 470, FL0 = 484, FL1 = 570, HZ = 440;
export const WKR = { bus: 20, door: 208, gate: 300, shuttle: 262, plane0: 1430, plane1: 1700, back: 1290 };
export const WRK_ARRIVE = { x: WKR.door, y: 500 };
/** The fuselage stands on the sand with its belly at this y. */
const BASE = 520, TOPY = BASE - 60;

function paintLand(day: boolean, dk: (c: RGB) => RGB): void {
  // ---- the skyline: dark hills, Mýrdalsjökull's ice cap low and white over them; then the sand: black, flat, forever ----
  pixels(0, HZ - 70, W, H - HZ + 70, (x, y) => {
    const hill = HZ - 10 - 18 * fbm(x, 0, 140, 2), ice = 760 < x && x < 1360 ? HZ - 20 - 20 * Math.pow(Math.sin(((x - 760) / 600) * Math.PI), 0.8) - 3 * vnoise(x, 0, 30, 4) : 9999;
    if (y < HZ) { if (y >= ice) { const crev = vnoise(x * 0.4, y * 3, 6, 7) > 0.8; return dk(M(M(crev ? [176, 190, 206] : [236, 242, 248], [168, 184, 202], Math.min(1, (y - ice) / 26 + vnoise(x, y, 14, 6) * 0.2)), IS.SKY_LO, 0.3)); } if (y >= hill) return dk(M(M([70, 78, 88], [52, 58, 66], vnoise(x, y, 8)), IS.SKY_LO, 0.4)); return null; }
    const u = (y - HZ) / (H - HZ); return dk(M(sandPx(x, y), [56, 58, 64], (1 - u) * 0.35));
  });
  for (let x = 1700; x < W; x++) { r(x, HZ, 1, 6, dk(IS.SEA)); if (h1(x) > 0.6) r(x, HZ + 5, 1, 1, dk([220, 230, 236])); }
  for (const dy of [-6, 6]) for (let x = 300; x < WKR.plane0 - 40; x += 2) r(x, 506 + dy + Math.round(Math.sin(x / 90) * 2), 2, 1, dk([30, 30, 34]));
  // ---- the car park: gravel, the fence and the farmer's gate, the signs ----
  r(0, WALL, 300, H - WALL, dk([90, 88, 84])); for (let i = 0; i < 200; i++) r(Math.floor(h1(i * 5.1) * 300), WALL + Math.floor(h1(i * 2.9) * (H - WALL)), 1, 1, dk([110, 108, 104]));
  for (let x = 0; x < 300; x += 22) r(x, WALL - 18, 2, 18, dk([110, 86, 60])); r(0, WALL - 15, 300, 1, dk([150, 150, 150])); r(0, WALL - 9, 300, 1, dk([150, 150, 150])); // (the fence)
  r(WKR.gate - 2, WALL - 22, 3, 30, dk([110, 86, 60])); for (let k = 0; k < 4; k++) r(WKR.gate + 2, WALL - 18 + k * 5, 36, 2, dk([150, 156, 164])); line(WKR.gate + 2, WALL - 18, WKR.gate + 38, WALL - 3, dk([150, 156, 164])); // (the gate, open)
  sightSign(330, WALL + 2, 'SOLHEIMASANDUR', dk);
  { const x = 520; r(x, WALL - 26, 2, 28, dk([90, 94, 100])); r(x - 28, WALL - 40, 58, 16, dk([240, 238, 228])); txt('4 KM', x + 1 - tw('4 KM') / 2, WALL - 38, dk([40, 40, 44])); txt('ABOUT 1 HOUR', x + 1 - tw('ABOUT 1 HOUR') / 2, WALL - 31, dk([40, 40, 44])); }
  { const x = 600; r(x, WALL - 20, 2, 22, dk([110, 86, 60])); r(x - 30, WALL - 34, 62, 16, dk([200, 196, 186])); txt('NO DRIVING', x + 1 - tw('NO DRIVING') / 2, WALL - 32, dk([170, 40, 40])); txt('ON THE SAND', x + 1 - tw('ON THE SAND') / 2, WALL - 25, dk([170, 40, 40])); } // (hand-painted)
  // ---- the marker posts along the track, every so often, out into the nothing ----
  for (let x = 700; x < WKR.plane0 - 20; x += 110) snowPole(x, 498, dk, 22);
  // the shuttle's stop at each end
  for (const x of [WKR.shuttle, WKR.back]) { r(x, WALL - 30, 2, 32, dk([90, 94, 100])); r(x - 14, WALL - 44, 30, 14, dk([40, 110, 180])); txt('BUS', x + 1 - tw('BUS') / 2, WALL - 40, dk(K.WHITE)); }
}
const land = landLayer(W, H, paintLand);

// ---------------------------------------------------------------- live ----------------------------------------------------------------
function drawBack(a: number): void {
  skyLive(a, W, HZ, 1500);
  land();
  if (seen(WKR.bus - 20, WKR.bus + 280)) busAtStop(3, WKR.bus, FL0 - 2, a);
  // the wind: sand streaming low over the ground
  const night = nightNow(); for (let q = 0; q < 30; q++) { const x = COAST.view.x0 + ((h1(q * 2.3) * 1400 + a * 60) % 1400), y = 476 + h1(q * 3.1) * 90; alpha(0.3, () => r(Math.round(x), Math.round(y), 3, 1, nite([90, 88, 86], night))); }
}
const PW = WKR.plane1 - WKR.plane0, PH = 70;
/** The fuselage's outline along its length (u 0 nose .. 1 where the tail tore off): its top, and its belly sweeping up towards the tail. */
const topOf = (u: number): number => (u < 0.1 ? 0.5 + 0.5 * Math.sqrt(u / 0.1) : 1) - (u > 0.9 ? (u - 0.9) * 0.6 : 0);
const botOf = (u: number): number => (u > 0.72 ? Math.pow((u - 0.72) / 0.28, 1.5) * 0.5 : 0) + (u < 0.06 ? (0.06 - u) * 3 : 0);
const fuselage = spriteDN(PW, PH, (dk) => {
  const B = PH - 4, D = 52, top = (x: number): number => B - Math.round(D * topOf(x / PW)), bot = (x: number): number => B - Math.round(D * botOf(x / PW));
  pixels(0, 0, PW, PH, (x, y) => {
    const t = top(x), b = bot(x); if (y < t || y >= b) return null;
    const v = (y - t) / Math.max(1, b - t), dent = vnoise(x, y, 6, 3) > 0.72 ? 0.18 : 0, streak = vnoise(x * 0.3, y * 2, 4, 5) > 0.8 ? 0.12 : 0;
    let c = M([206, 210, 214], [96, 100, 108], Math.min(1, Math.abs(v - 0.22) * 1.25 + dent + streak)); // (a cylinder: the light along its upper side)
    if ((x % 22) === 0 && v > 0.1) c = M(c, [70, 74, 80], 0.4); // (the panels' seams)
    if (Math.abs(v - 0.62) < 0.02 && h1(Math.floor(x / 3)) > 0.4) c = M(c, [70, 74, 80], 0.5); // (rivets)
    if (vnoise(x, y, 9, 8) > 0.82 && v > 0.5) c = M(c, [120, 90, 70], 0.35); // (rust, low down)
    return dk(c);
  });
  // the cockpit's windscreen, raked back over the nose, its glass long gone; the windows along the side, dark holes
  for (let k = 0; k < 8; k++) r(10 + k, top(10 + k) + 3 + Math.floor(k * 0.4), 2, 6 - Math.floor(k * 0.4), dk([20, 22, 26]));
  for (let k = 0; k < 8; k++) { const wx = 56 + k * 18, wy = top(wx) + 12; r(wx, wy, 6, 7, dk([18, 20, 24])); r(wx, wy, 6, 1, dk([70, 74, 80])); }
  // the door, hanging open near the back; a wing root's stub under the middle; torn panels
  { const dx = Math.round(PW * 0.7), dy = top(dx) + 10; r(dx, dy, 13, 30, dk([16, 18, 22])); r(dx + 13, dy + 2, 3, 28, dk([150, 154, 160])); r(dx + 2, dy + 30, 9, 2, dk([90, 94, 100])); }
  r(84, bot(84) - 12, 64, 8, dk([120, 124, 130])); r(84, bot(84) - 12, 64, 1, dk([180, 184, 190])); r(84, bot(84) - 5, 64, 1, dk([70, 74, 80]));
  for (let k = 0; k < 5; k++) { const px = 40 + Math.floor(h1(k * 4.1) * (PW - 100)), py = top(px) + 20 + Math.floor(h1(k * 2.7) * 14); r(px, py, 5 + (k % 3), 3, dk([50, 52, 58])); r(px, py, 5 + (k % 3), 1, dk([150, 154, 160])); }
  // where the tail tore off: the open end, ribs, the dark inside
  { const ex = PW - 6, t = top(ex), b = bot(ex); for (let y = t; y < b; y++) r(ex, y, 6, 1, dk([22, 22, 26])); for (let k = 0; k < 3; k++) r(ex - 1 + k * 3, t, 1, b - t, dk([110, 114, 120])); for (let y = t; y < b; y += 3) if (h1(y) > 0.4) r(ex + 5, y, 2, 2, dk([150, 154, 160])); }
  // snow lying along its back
  for (let x = 14; x < PW - 10; x++) if (vnoise(x, 0, 8, 2) > 0.35) r(x, top(x) - 1, 1, 2, dk(IS.SNOW));
});
/** THE WRECK: the DC-3's fuselage, side on, nose to the left, sitting low on the sand: silver gone grey, dented, torn panels, the windows
 *  dark holes, the cockpit glass gone, the tail torn off (you see into it), the door hanging open. Under the northern lights, the old
 *  metal catches their green. */
const wreck: Prop = { y: BASE, draw() {
  if (!seen(WKR.plane0 - 20, WKR.plane1 + 20)) return;
  const x0 = WKR.plane0, au = auroraNow();
  alpha(0.35, () => oval(Math.round(x0 + PW / 2), BASE, PW / 2 + 10, 6, [0, 0, 0]));
  fuselage(x0, BASE - PH + 2);
  if (au.vis > 0.1 && au.kp >= 2) { alpha(0.2 * au.vis, () => r(x0 + 10, BASE - 62, PW - 30, 18, [80, 255, 160])); Gd(Math.round(x0 + PW / 2), BASE - 60, 60, [80, 255, 160], 0.2 * au.vis); }
} };
const shuttleBus: Prop = { y: 498, draw(a: number) { // the little shuttle, parked at whichever end it's waiting at (it swaps every 90 s)
  const atBack = Math.floor((Date.now() / 1000) / 90) % 2 === 1, x = atBack ? WKR.back + 20 : WKR.shuttle + 18; if (!seen(x - 10, x + 70)) return; const n = nightNow();
  r(x, 470, 56, 22, nite([240, 200, 50], n)); r(x + 4, 474, 40, 8, nite([40, 54, 70], n)); r(x + 48, 474, 6, 10, nite([40, 54, 70], n)); disc(x + 12, 493, 5, nite([30, 30, 34], n)); disc(x + 44, 493, 5, nite([30, 30, 34], n)); txt('SHUTTLE', x + 4, 484, nite([40, 40, 44], n)); void a;
} };
export const WKSPOT = { ROOF: 0, DOOR: 1, SHUTTLE_OUT: 2, SHUTTLE_BACK: 3 };
export const WRK_SPOTS: Spot[] = [
  { kind: 'perch', x: 1560, y: BASE + 2, sx: 1560, sy: BASE + 30, lift: BASE - TOPY + 2, label: 'CLIMB ON TOP', area: { x0: WKR.plane0 + 60, y0: TOPY, x1: WKR.plane1 - 80, y1: BASE - 20 } },
  { kind: 'sit', x: WKR.plane1 - 45, y: BASE + 1, sx: WKR.plane1 - 45, sy: BASE + 26, lift: 14, label: 'SIT IN THE DOORWAY', area: { x0: WKR.plane1 - 54, y0: BASE - 46, x1: WKR.plane1 - 36, y1: BASE - 8 } },
  { kind: 'shuttle', n: 0, x: WKR.shuttle, y: 500, sx: WKR.shuttle, sy: 500, lift: 0, label: 'SHUTTLE TO THE WRECK', area: { x0: WKR.shuttle - 16, y0: WALL - 44, x1: WKR.shuttle + 74, y1: 496 } },
  { kind: 'shuttle', n: 1, x: WKR.back, y: 500, sx: WKR.back, sy: 500, lift: 0, label: 'SHUTTLE TO THE CAR PARK', area: { x0: WKR.back - 16, y0: WALL - 44, x1: WKR.back + 74, y1: 496 } },
];
/** Where the shuttle drops you (n: 0 out to the wreck, 1 back to the car park). */
export const SHUTTLE_TO = [{ x: WKR.back + 30, y: 520 }, { x: WKR.shuttle + 30, y: 520 }];
const TALK: Talker[] = [
  { id: 'wreck', name: 'THE WRECK', x: 1520, y: 470, sx: 1500, sy: 556, lines: ['A US Navy DC-3. In 1973 it ran out of fuel and came down here on the sand. Everyone walked away.', 'Fifty years of wind and sand since. The silver\'s gone grey. It\'s very quiet out here.', 'After dark, under the northern lights, it\'s the eeriest thing in Iceland.'], verb: 'LOOK' },
  { id: 'wreck-sign', name: 'THE SIGN', x: 520, y: WALL - 40, sx: 520, sy: 500, lines: ['4 KM · ABOUT 1 HOUR. Each way. Over nothing but black sand.', 'Or the shuttle. Nobody judges.'], verb: 'READ' },
];
export function makeWreck(): Room {
  const room: Room = {
    id: 'wreck', title: 'THE PLANE WRECK', sub: 'SOLHEIMASANDUR',
    w: W, h: H,
    lookAt: (x0, x1) => { const keep = COAST.view; COAST.view = { x0, x1 }; return () => { COAST.view = keep; }; },
    floor: { x0: 14, y0: FL0, x1: W - 14, y1: FL1 },
    blockers: [{ x0: WKR.plane0 + 4, y0: BASE - 8, x1: WKR.plane1 - 4, y1: BASE + 2 }],
    doors: [{ trigger: { x0: WKR.door - 16, y0: FL0, x1: WKR.door + 16, y1: FL0 + 10 }, to: 'tourbus', arrive: { x: 1080, y: 512 }, label: 'THE BUS', area: { x0: WKR.bus, y0: 410, x1: WKR.bus + 214, y1: 482 },
      route: () => (busAt(3) ? { to: 'tourbus', arrive: { x: 1080, y: 512 }, label: 'BOARD THE BUS' } : null) }],
    spots: WRK_SPOTS, inUse: new Map(),
    spawn: { ...WRK_ARRIVE },
    dim: 0.1,
    dimNow: () => 0.08 + 0.55 * (1 - iceDay()),
    glowMul: () => 0.4 + 0.6 * (1 - iceDay()),
    fillTop: 'rgb(17,33,58)', fillLow: 'rgb(34,34,38)',
    bg: mk(W, H), bgAlt: mk(W, H), altAlpha: () => iceDay(),
    build: () => { paintSky(room.bg.getContext('2d')!, false, W, H, HZ); paintSky(room.bgAlt!.getContext('2d')!, true, W, H, HZ); },
    drawBack, drawFront: (a) => weatherFront(a, H),
    props: [wreck, shuttleBus],
    talkers: TALK,
  };
  return room;
}
void lit; void FL1;
