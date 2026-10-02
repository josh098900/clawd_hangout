// THE SOUTH COAST, the playing part (step 19, push 2). game/tour.ts is the bus's clock; world/tourbus.ts, seljaland.ts, skoga.ts,
// wreck.ts and beach.ts the sets; world/coast.ts what they share.
//   * THE BUS: KATLA's stories on the mic as the road goes by (the volcano that grounded Europe's planes, Katla under her glacier,
//     tractor eggs, the hidden folk), the stops called out, "the bus leaves in 10 seconds!" wherever you are at a stop
//   * SOAKED (the 'fx' message, so everyone sees you drip): from the spray near a waterfall, at once behind Seljalandsfoss or in
//     Gljúfrabúi, or tumbled by a sneaker wave; you dry off in 40 s (faster on the bus, by its heater, or with a bowl of soup)
//   * SELJALANDSFOSS: the chain across the path in a gale (never with you on it); WALK BEHIND A WATERFALL (the quest)
//   * SKÓGAFOSS: THRASI'S RING glinting in the pool on a sunny day (grab it: the ring, and the TREASURE HUNTER badge); the 527 steps
//   * THE PLANE WRECK: the shuttle out and back
//   * REYNISFJARA: the sneaker waves (caught: tumbled up the beach, SOAKED; outran it: the quest); the puffin camera (three or more
//     in the frame: the PUFFIN pet)
// The stamps: each stop's, the first time you get there. Nothing new is sent but the fx: it's all the clock.

import { game, now } from '../app/game';
import { say, toast } from '../ui/overlay';
import { SFX } from '../audio/sfx';
import { Rain, Rumble } from '../audio/music';
import { quests } from '../game/quests';
import { save } from '../game/save';
import { stampIt, STAMPS } from '../game/passport';
import { tour, nextBus, stopOf, STOP_NAMES, STOPS, TOUR_CYCLE, type Tour } from '../game/tour';
import { iceWeather } from '../world/iceland';
import { COAST, sunny } from '../world/coast';
import { TBW } from '../world/tourbus';
import { SLR, BEHIND, SELW, chainsUp } from '../world/seljaland';
import { SKR, SKOW, SPOOL } from '../world/skoga';
import { SHUTTLE_TO } from '../world/wreck';
import { BCHW, SURF, puffinsInFrame, sneakerY, waveP, waveN, waveWarn } from '../world/beach';
import { FX } from '../game/chem';
import { myFx, sendFx, setFx } from './chem';
import { mmss } from '../engine/format';
import { h1 } from '../engine/math';
import { HOLD_RING, HOLD_SOUP } from '../entities/avatar';
import type { RoomId } from '../world/room';

export const COAST_ROOMS = new Set<RoomId>(['tourbus', 'seljaland', 'gorge', 'skoga', 'skogatop', 'wreck', 'beach']);
/** The coast's own spots that this handles (main.ts asks it whether you stay at them). */
export const COAST_KINDS = new Set(['kaffi', 'perch', 'soup', 'ring', 'puffcam', 'shuttle']);
/** Each stop's stamp. */
const STAMP_OF: Partial<Record<RoomId, string>> = { seljaland: 'seljaland', skoga: 'skoga', wreck: 'wreck', beach: 'beach' };
export const SOAK_S = 40;
const KATLA = 'npc-katla', RANGER = 'npc-ranger';
const npcSay = (id: string, text: string): void => { if (game.npcs.inRoom(game.room.id).some((n) => n.def.id === id)) say(id, text, now(), false); };
const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
function stampNow(id: string): boolean {
  if (!stampIt(id)) return false;
  SFX.stamp(); const s = STAMPS.find((q) => q.id === id)!; toast('PASSPORT STAMPED: ' + s.name + '!', 3500); game.floatText('STAMPED!');
  return true;
}

// ---------------------------------------------------------------- SOAKED ----------------------------------------------------------------
let wet = 0, soakSent = -99;
/** Soak you (k: how much, 0..1 at once; at 1 you're dripping), and tell the room (not too often). */
function soak(k: number): void {
  wet = Math.min(1, wet + k);
  if (wet < 1) return;
  const f = myFx(), left = f && f.k === FX.SOAKED ? f.left : 0;
  if (left < SOAK_S - 4 || now() - soakSent > 8) { setFx(game.me, FX.SOAKED, SOAK_S); sendFx(); soakSent = now(); if (left <= 0) { SFX.splash(); toast(pick(['SOAKED! (it dries off in a bit)', 'Drenched. Completely drenched.', 'You\'re wet through. Worth it.']), 2500); } }
}
/** Dry off faster (the bus's heater, a bowl of soup): what's left of SOAKED comes down to at most `s` seconds. */
export function dryTo(s: number): void { const f = myFx(); if (f && f.k === FX.SOAKED && f.left > s) { setFx(game.me, FX.SOAKED, s); sendFx(); } wet = 0; }
/** The spray at a waterfall: how hard it's soaking you here (per second). */
function sprayRate(): number {
  const id = game.room.id, me = game.me, d = (x: number, y: number) => Math.hypot(me.x - x, (me.y - y) * 2);
  if (id === 'gorge') return 0.25;
  if (id === 'seljaland') { if (me.y <= BEHIND.y1 && me.x > BEHIND.x0 && me.x < BEHIND.x1) return 9; const k = d(SLR.fall, 500); return k < 150 ? 0.22 * (1 - k / 150) : 0; }
  if (id === 'skoga') { const k = d(SKR.fall, 505); return k < 240 ? 0.3 * (1 - k / 240) : 0; }
  return 0;
}

// ---------------------------------------------------------------- the bus ----------------------------------------------------------------
/** What KATLA says along the way: [the leg (the stop it left), how far along (0..1), the line]. */
const STORIES: [number, number, string][] = [
  [0, 0.08, 'Velkomin! I\'m KATLA, your guide. That\'s STEFAN driving. He\'s driven this road four thousand times. He still slows down for the sheep.'],
  [0, 0.22, 'This is Hellisheidi: lava, all of it, with moss growing on top. Two hundred years for the moss. Please don\'t walk on it.'],
  [0, 0.3, 'The steam over there is the power station. Hot water from under the ground heats every house in Reykjavik.'],
  [0, 0.36, 'Down there: Hveragerdi. They grow bananas in the greenhouses. In Iceland. Yes, really.'],
  [0, 0.55, 'See the white bales in the fields? Tractor eggs. If you see one hatch, tell me.'],
  [0, 0.78, 'That cone with the snow on top is Hekla. In the old days they called it the gateway to the underworld.'],
  [0, 0.92, 'Under that glacier: Eyjafjallajokull. In 2010 it stopped every plane in Europe. Nobody abroad could say its name either.'],
  [1, 0.4, 'Waterfalls down every cliff along here. The farmers have stopped noticing. We haven\'t.'],
  [1, 0.8, 'Next: Skogafoss. There\'s a legend about treasure. Keep an eye on the pool.'],
  [2, 0.5, 'Up there: Myrdalsjokull. My namesake KATLA is underneath it. She\'s overdue. Don\'t tell her I said.'],
  [3, 0.4, 'Next: Reynisfjara. Please: never turn your back on the sea there. I mean it.'],
  [4, 0.15, 'The long way home now. Sit back. If it\'s dark, watch the north side for the lights.'],
  [4, 0.5, 'Some roads here bend round a rock. Ask why and they\'ll say: the hidden folk live there. Nobody moves the rock.'],
  [4, 0.85, 'Nearly back. Takk for today. Bless!'],
];
const ARRIVE: Record<string, string> = {
  reykjavik: 'Here we are: Reykjavik! The bus goes round again in a few minutes.',
  seljaland: 'SELJALANDSFOSS! The path goes behind the falls. You will get wet. That\'s the point.',
  skoga: 'SKOGAFOSS! The legend: a Viking called THRASI hid his gold behind the falls. Boys found the chest and pulled its ring... the ring came off, the chest sank. On sunny days, watch the pool.',
  wreck: 'The PLANE WRECK. In 1973 a US Navy plane ran out of fuel and came down on the sand here. Everyone walked away. It\'s a long walk: there\'s a shuttle.',
  beach: 'REYNISFJARA! The stacks out there are two trolls, caught by the sunrise dragging a ship ashore. And please, keep well back from the waves.',
};
let lastT: Tour | null = null, warned = -1;
function busStep(T: Tour): void {
  const was = lastT; lastT = T; if (!was) return;
  const onBus = game.room.id === 'tourbus';
  // the stories, as the road goes by (only aboard)
  if (onBus && T.phase === 'drive') for (const [leg, u, line] of STORIES) if (T.from === leg && was.phase === 'drive' && was.from === leg && was.u < u && T.u >= u) { SFX.dingdong(); toast('KATLA: "' + line + '"', 7000); }
  // pulling in, and the doors opening
  if (T.phase === 'stop' && was.phase === 'drive') { const id = STOPS[T.from]; if (onBus) { SFX.dingdong(); toast('KATLA: "' + ARRIVE[id] + '"', 8000); setTimeout(() => SFX.hiss(), 600); npcSay(KATLA, 'doors open!'); } }
  if (T.phase === 'drive' && was.phase === 'stop' && onBus) { SFX.hiss(); npcSay(KATLA, pick(['everyone aboard? off we go', 'count heads... one, two... a puffin?', 'next stop: ' + STOP_NAMES[T.to].toLowerCase()])); }
  // ten seconds' warning, aboard or at the stop the bus is waiting at
  const here = stopOf(game.room.id);
  if (T.phase === 'stop' && T.left <= 10 && warned !== T.n * 10 + T.from && (onBus || here === T.from)) { warned = T.n * 10 + T.from; SFX.dingdong(); toast(onBus ? 'The bus leaves in 10 seconds! (stay aboard to go on to ' + STOP_NAMES[T.to] + ')' : 'The bus leaves in 10 seconds! The next one\'s in about ' + Math.round(TOUR_CYCLE / 60) + ' minutes', 3500); }
}

// ---------------------------------------------------------------- the stops ----------------------------------------------------------------
let wave = -1, atRisk = false, caught = false, glintN = -1, behindDone = false, roar = 0;
const falls = new Rain(), surf = new Rumble();
/** THRASI'S RING: on a sunny day, every 75 s or so (not every time), it glints in the pool for 5 s, somewhere along it. */
export function glintNow(t = Date.now() / 1000): { on: boolean; n: number; x: number; since: number } {
  const n = Math.floor(t / 75), since = t - n * 75, x = SPOOL.cx - 90 + Math.round(h1(n * 3.1) * 180);
  return { on: since < 5 && h1(n * 7.7) > 0.3 && sunny(), n, x, since };
}
function stopStep(dt: number): void {
  const id = game.room.id, me = game.me;
  // the spray
  const rate = sprayRate();
  if (rate > 0) soak(rate * dt); else wet = Math.max(0, wet - dt * 0.2);
  if (id === 'seljaland' && rate >= 9 && !behindDone) { behindDone = true; quests.bump('behind'); toast('Behind the waterfall! The whole world through a curtain of water.', 3500); }
  // the waterfalls' roar, the surf's boom (louder close up)
  roar = id === 'seljaland' ? Math.max(0, 1 - Math.abs(me.x - SLR.fall) / 600) * 0.5 : id === 'gorge' ? 0.7 : id === 'skoga' ? Math.max(0, 1 - Math.abs(me.x - SKR.fall) / 800) * 0.75 : id === 'skogatop' ? 0.35 : 0;
  falls.set(roar);
  const p = waveP(), big = sneakerY(p) > SURF.calm + 2;
  surf.set(id === 'beach' ? 0.18 + (big ? 0.4 : 0) + (waveWarn(p) ? 0.25 : 0) : id === 'wreck' ? 0.05 : 0);
  // SELJALANDSFOSS: the chain goes up in a gale (but not with you behind it)
  if (id === 'seljaland') { const w = iceWeather(), up = w.kind === 'gale' && w.k > 0.5, inBand = me.y <= BEHIND.y1 + 2 && me.x > BEHIND.x0 - 14 && me.x < BEHIND.x1 + 14; if (up !== SELW.chain && (!up || !inBand)) { SELW.chain = up; chainsUp(up); if (up) toast('A gale: they\'ve put the chain across the path behind the falls', 3000); } }
  // SKÓGAFOSS: the ring's glint
  if (id === 'skoga') { const g = glintNow(); SKOW.glint = g.on ? now() - g.since : -99; SKOW.glintX = g.x; if (g.on && glintN !== g.n) { glintN = g.n; SFX.chime(); } }
  // REYNISFJARA: the sneaker waves
  if (id === 'beach') {
    const n = waveN() + (waveWarn(p) ? 1 : 0), inZone = me.x > SURF.x0 && me.x < SURF.x1, perched = me.use >= 0 && (game.room.spots[me.use]?.lift ?? 0) > 0; // (n: the wave that's coming, or running)
    if (n !== wave && waveWarn(p)) { wave = n; atRisk = inZone && me.y < SURF.far + 4 && !perched; caught = false; SFX.thunder(); npcSay(RANGER, pick(['big one coming!', 'back! get back!', 'off the sand, now!'])); }
    if (!waveWarn(p) && p < 4.5 && !caught && inZone && !perched && me.y < sneakerY(p) - 2) {
      caught = true; atRisk = false; game.leaveSpot(); me.y = SURF.far + 14; me.x += me.x < 1200 ? 30 : -30; game.emote('huh'); game.sendMe(); SFX.whoosh(); soak(1);
      toast('A SNEAKER WAVE! It tumbles you up the beach... NEVER TURN YOUR BACK ON THE SEA.', 4500);
    }
    if (atRisk && p > 9 && p < 20) { atRisk = false; if (!caught) { quests.bump('wave'); SFX.score(); toast('You outran the sneaker wave!', 3000); game.celebrate(); } }
  }
}

// ---------------------------------------------------------------- what main.ts calls ----------------------------------------------------------------
/** E at one of the coast's own spots. True = stay at it (main goes on to sit you there, or fill your hands). */
export function coastSpot(kind: string, n: number): boolean {
  const me = game.me, id = game.room.id;
  switch (kind) {
    case 'kaffi': return true;
    case 'soup': npcSay('npc-cook', pick(['kjotsupa: lamb, swede, carrots, potatoes', 'your grandmother\'s recipe. if your grandmother was icelandic'])); return true;
    case 'perch': toast(id === 'gorge' ? 'You climb up onto the rock. The water roars a hand\'s width away.' : id === 'wreck' ? 'On top of the wreck. Nothing but black sand in every direction.' : 'Up you go.', 3000); return true;
    case 'ring': {
      const g = glintNow();
      if (g.on && Math.abs(g.x - me.x) < 140) {
        SFX.splash(); soak(0.6);
        if (me.hold !== HOLD_RING) { me.hold = HOLD_RING; me.sips = 0; game.sendMe(); }
        const first = (save.data.stats.treasure ?? 0) < 1; quests.stat('treasure');
        setTimeout(() => { SFX.score(); game.celebrate(); toast(first ? 'You grab something gold... it comes away in your hand. Something big sinks back into the deep. THRASI\'S RING! (TREASURE HUNTER)' : 'The ring again! The chest sinks back. (Q puts the ring away)', 6000); }, 400);
        return false;
      }
      SFX.splash(); toast(sunny() ? 'Just the pool, churning. Wait for the glint...' : 'Too grey to see anything glint. It needs a sunny day', 3000); return false;
    }
    case 'puffcam': {
      const k = puffinsInFrame(); SFX.shutter(); BCHW.flash = now();
      if (k >= 3) { toast('Click! ' + k + ' PUFFINS in the frame. What a photo.', 3500); if (save.unlock('pet:10')) setTimeout(() => { SFX.score(); game.celebrate(); toast('A PUFFIN waddled over and won\'t leave. It\'s your pet now! (Look menu)', 6000); }, 1200); }
      else toast(k ? 'Click! Only ' + k + ' puffin' + (k > 1 ? 's' : '') + ' in the frame. They pop in and out: try again' : 'Click! ...just grass. The puffins are all in their burrows. Wait a bit', 3500);
      return false;
    }
    case 'shuttle': { const to = SHUTTLE_TO[n] ?? SHUTTLE_TO[0]; game.leaveSpot(); me.x = to.x; me.y = to.y; game.sendMe(); SFX.door(); toast(n === 0 ? 'The shuttle bumps 4 km along the track... there it is.' : 'Back to the car park. Your legs thank you.', 3000); return false; }
  }
  return false;
}
/** You've just come into one of these rooms (from `from`). */
export function coastEntered(from: RoomId | null): void {
  const id = game.room.id, st = STAMP_OF[id];
  if (st) stampNow(st);
  if (id === 'tourbus' && from !== 'tourbus') { toast('Welcome aboard THE ICELAND EXPLORER! Sit anywhere. Stay aboard for the whole loop, or hop off and catch it next time round', 5000); npcSay(KATLA, 'velkomin! sit anywhere'); if (myFx()?.k === FX.SOAKED) setTimeout(() => { toast('The heater\'s on. You\'ll dry off quick.', 2500); dryTo(10); }, 1500); }
  if (id === 'skogatop' && from === 'skoga') { quests.bump('steps'); toast('527 steps. Puff... puff... You made it to the top!', 4000); setTimeout(() => game.emote('joy'), 400); }
  if (id === 'skoga' && from === 'skogatop') toast('Back down all 527. Your knees have opinions.', 3000);
  if (id === 'gorge') toast('You squeeze through the crack... and there it is. A whole waterfall, hiding.', 3500);
  if (id === 'seljaland') behindDone = false;
  if (id === 'beach') { wave = waveN() + (waveWarn() ? 1 : 0); atRisk = false; caught = waveP() < 4.5; } // (arriving mid-wave: that one's been and gone for you)
}
/** Every frame (only does anything in the coast's rooms, and keeps the bus's clock ticking). */
export function coastStep(dt: number): void {
  const T = tour(); busStep(T);
  const id = game.room.id;
  if (game.me.hold === HOLD_SOUP) { const f = myFx(); if (f && f.k === FX.SOAKED && f.left > 12) dryTo(12); }
  if (!COAST_ROOMS.has(id)) { if (roar) { roar = 0; falls.set(0); surf.set(0); } return; }
  const c = game.R.cam, view = { x0: c.x, x1: c.x + c.w };
  if (id === 'tourbus') { TBW.view = view; wet = 0; falls.set(0); surf.set(0); roar = 0; return; }
  COAST.view = view; stopStep(dt); roar = roar || 0.001;
}
/** The banner line: aboard, where the bus is going; at a stop, when it's back. */
export function coastLine(): string | null {
  const id = game.room.id, T = tour();
  if (id === 'tourbus') return T.phase === 'stop' ? 'THE ICELAND EXPLORER · AT ' + STOP_NAMES[T.from] + ' · LEAVING IN ' + mmss(T.left) : 'THE ICELAND EXPLORER · NEXT STOP: ' + STOP_NAMES[T.to] + ' IN ' + mmss(T.left);
  const s = stopOf(id); if (s < 0) return null;
  if (s === 0) return null; // (Reykjavík has its own life)
  const wait = nextBus(s); return wait <= 0 ? 'THE BUS IS HERE · LEAVING IN ' + mmss(T.left) : 'THE NEXT BUS: ' + mmss(wait);
}
/** What E says at these spots (null: the spot's own label). */
export function coastLabel(kind: string): string | null {
  if (kind === 'ring') return glintNow().on ? 'GRAB THE GLINT!' : null;
  if (kind === 'puffcam') { const k = puffinsInFrame(); return 'PHOTO: ' + k + ' PUFFIN' + (k === 1 ? '' : 'S'); }
  return null;
}
export const coastDebug = () => ({ tour: tour(), wet, glint: glintNow(), wave: { p: waveP(), n: waveN(), y: sneakerY(), atRisk, caught }, puffins: puffinsInFrame(), chain: SELW.chain });
