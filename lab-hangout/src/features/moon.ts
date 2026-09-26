// THE MOON, the playing part: the lander's countdown, sounds and news (world/moon.ts runs its timetable), moon
// gravity (ENV for the drawing; SPACE is a big slow jump), mining the glowing rocks in the crystal field and
// carrying them to the Moon Base's ASSAY machine (0019_moon.sql pays), and the MOON BUGGY: drive it round the
// course (START, gates 1-4, back to START) for a lap time, the fastest lap on the board for everyone.
// The drawing is in world/moon.ts (the surface, the lander craft), lander.ts (inside it) and moonbase.ts.

import { game, now, errText } from '../app/game';
import { mmss } from '../engine/format';
import { BASE } from '../world/moonbase';
import { GATES, LANDER, L_CYCLE, MOON, PAD_X, ROCKS, bumpAt, lander, rockBack, rockKey, rockThere } from '../world/moon';
import type { RoomId } from '../world/room';
import { ENV, HOLD_MOONROCK, JUMP_S, POSE_BUGGY, POSE_FLOAT } from '../entities/avatar';
import { quests } from '../game/quests';
import { save } from '../game/save';
import { modalOpen } from '../ui/modal';
import { toast } from '../ui/overlay';
import { SFX } from '../audio/sfx';

// ---------- the lander ----------
const fired = new Set<string>();
let firedN = -1;
const fire = (k: string, fn: () => void): void => { if (!fired.has(k)) { fired.add(k); fn(); } };
/** Dev/tests: put this browser's lander clock `k` seconds into its loop. */
export function setLander(k: number): void { LANDER.skew = 0; LANDER.skew = k - (Date.now() / 1000) % L_CYCLE; }
/** Where the lander's news is heard: aboard, at the station's LANDER BAY end, and on the Moon near the pad. */
function landerNews(): void {
  const f = lander(); if (f.n !== firedN) { firedN = f.n; fired.clear(); }
  if (!game.playing) return;
  const id = game.room.id, aboard = id === 'lander', atBay = id === 'station' && game.me.x > 1380, onMoon = id === 'moon' || id === 'moonbase';
  if (aboard) {
    if (f.phase === 'docked' && f.left < 30 && f.left > 12) fire('strap', () => toast('Undocking in ' + Math.ceil(f.left) + ' seconds. Strap in, next stop THE MOON', 4000));
    if (f.phase === 'docked' && f.left < 3) fire('undock', () => SFX.clunk());
    if (f.phase === 'down' && f.d > 5) fire('coast', () => toast('Coasting to the Moon: ZERO G! ' + (game.isTouch ? 'Tap FLOAT' : 'Press SPACE') + ' to push off', 4000));
    if (f.phase === 'down' && f.d > 36) fire('burn', () => { SFX.ignite(); toast('BRAKING BURN! Hold on...', 3000); });
    if (f.phase === 'down' && f.d > 59) fire('touch', () => { SFX.clunk(); SFX.boom(); });
    if (f.phase === 'landed') fire('landed', () => toast('TOUCHDOWN! Welcome to THE MOON. Out through the hatch', 4500));
    if (f.phase === 'landed' && f.left < 30) fire('lift30', () => toast('Liftoff in 30 seconds: back to the Space Station', 3500));
    if (f.phase === 'up' && f.d < 2) fire('liftoff', () => { SFX.ignite(); toast('LIFTOFF! Back to the Space Station', 3000); });
    if (f.phase === 'up' && f.d > 59) fire('docked', () => { SFX.clunk(); toast('Docked at the SPACE STATION. Out through the hatch', 4000); });
  }
  if (atBay && f.phase === 'docked' && f.left < 60 && f.left > 50) fire('bay', () => toast('The lander to THE MOON leaves in 1 minute (the LANDER BAY, far right)', 4500));
  if (onMoon && f.phase === 'landed' && f.left < 60 && f.left > 50) fire('moon60', () => toast('The lander home leaves in 1 minute (the pad, far left of the surface)', 5000));
  if (id === 'moon' && f.phase === 'down' && f.d > 30) fire('inbound', () => { SFX.whoosh(); toast('The lander is coming in to land!', 3000); });
  if (id === 'moon' && f.phase === 'down' && f.d > 59 && Math.abs(game.me.x - PAD_X) < 600) fire('thump', () => SFX.boom());
}
export function moonLine(): string {
  const id = game.room.id;
  if (id === 'moon' && game.me.pose === POSE_BUGGY) return race ? 'MOON BUGGY · LAP ' + lapTime(now() - race.t0) + ' · NEXT: ' + (race.next === 0 ? 'THE FINISH' : 'GATE ' + race.next) + (MOON.best ? ' · RECORD ' + lapTime(MOON.best.ms / 1000) + ' ' + MOON.best.name : '') : 'MOON BUGGY · DRIVE THROUGH THE START GATE TO RACE' + (MOON.best ? ' · RECORD ' + lapTime(MOON.best.ms / 1000) + ' ' + MOON.best.name : '');
  const f = lander();
  if ((id === 'moon' || id === 'moonbase') && f.phase === 'landed' && f.left < 60) return 'THE LANDER HOME LEAVES IN ' + mmss(f.left) + ' · THE PAD, FAR LEFT';
  if (id === 'station' && game.me.x > 1380 && f.phase === 'docked' && f.left < 60) return 'THE LANDER TO THE MOON LEAVES IN ' + mmss(f.left) + ' · THE LANDER BAY';
  return '';
}

// ---------- moon gravity ----------
/** SPACE (or the JUMP pill) on the Moon: a big slow jump. */
export function moonKey(): void {
  if (!game.playing || game.editing || modalOpen() || !game.room.lowG?.() || game.me.pose === POSE_FLOAT || game.me.pose === POSE_BUGGY) return;
  if (game.me.use >= 0) game.leaveSpot();
  game.me.pose = POSE_FLOAT; game.me.poseT0 = now(); game.sendMe(); SFX.whoosh();
  landT = now() + JUMP_S;
}
let landT = 0;

// ---------- mining ----------
let mining: { i: number; n: number; end: number; tink: number } | null = null;
const MINE_S = 1.6;
/** E at a moon rock: chip a crystal out of it (the first to finish gets it; it grows back). */
export function mineRock(i: number, n: number): void {
  if (!rockThere(n)) { toast('Mined out. It grows back in ' + mmss(rockBack(n)), 2500); return; }
  if (game.me.hold === HOLD_MOONROCK) { toast('Your hands are full: take that rock to the ASSAY machine in the Moon Base first', 3500); return; }
  if (game.me.hold) { toast('Put down what you are carrying first (Q)', 2500); return; }
  const s = game.room.spots[i];
  game.me.use = i; game.me.useT0 = now(); game.me.x = s.x; game.me.y = s.y; game.me.dir = 1; game.me.moving = false; game.input.clear(); game.sendMe();
  mining = { i, n, end: now() + MINE_S, tink: 0 };
  SFX.zap();
}
function miningStep(): void {
  if (!mining) return;
  const t = now();
  if (game.me.use !== mining.i || game.room.id !== 'moon') { mining = null; return; }
  if (!rockThere(mining.n)) { mining = null; game.leaveSpot(); toast('Someone got that one first!', 2500); return; }
  if (t > mining.tink) { mining.tink = t + 0.4; SFX.clack(); }
  if (t < mining.end) return;
  const n = mining.n, [x, y] = ROCKS[n], key = rockKey(n); mining = null;
  MOON.mined.set(key, Date.now() / 1000); game.net.send('junk', { n: key });
  game.me.hold = HOLD_MOONROCK; game.leaveSpot(); SFX.chime(); game.floatText('MOON ROCK!', x, y - 30);
  toast(save.data.stats.moonrocks ? 'Got one! Take it to the ASSAY machine in the Moon Base' : 'A MOON ROCK! Carry it to the ASSAY machine inside the Moon Base (the airlock in the big dome) to see what it is', 5000);
}
/** Someone else mined rock slot `key` (a 'junk' message on the Moon). */
export function rockGone(key: number): void { MOON.mined.set(key, Date.now() / 1000); }
/** Q with a moon rock: put it down (it crumbles). */
export function dropRock(): void { game.me.hold = 0; game.sendMe(); SFX.pop(); toast('You put the moon rock down. It crumbles into dust', 2500); }

// ---------- the ASSAY machine ----------
let assaying = false;
export function assayRock(): void {
  if (game.me.hold !== HOLD_MOONROCK) { SFX.blip(); toast('INSERT MOON ROCK. Mine one in the crystal field outside (far right of the surface)', 4000); return; }
  if (assaying) return;
  assaying = true; SFX.blip();
  game.net.api.moon.assay().then((r) => {
    game.me.hold = 0; game.sendMe(); game.setTokens(r.tokens); BASE.crystals = r.crystals;
    quests.bump('moonrock'); quests.stat('moonrocks');
    BASE.assay = { text: r.crystal ? 'MOON CRYSTAL! +' + r.paid : 'MOON ROCK · +' + r.paid, crystal: r.crystal, at: Date.now() / 1000 };
    if (r.crystal) { SFX.score(); game.celebrate(); toast('It\'s a MOON CRYSTAL! ' + (r.paid ? '+' + r.paid + ' tokens · ' : '') + r.crystals + ' found so far', 5000); }
    else { SFX.chime(); toast('Plain moon rock. ' + (r.paid ? '+' + r.paid + ' token' : 'No more rock pay today (15 a day)') + '. Crystals turn up now and then!', 4000); }
    if (r.paid) game.floatText('+' + r.paid);
    if (r.prize) { save.addPrize(r.prize); setTimeout(() => { game.celebrate(); SFX.score(); toast('Your 5th crystal: the MOON ROVER is yours! A little robot pet (PET in the Look menu)', 6500); }, 2200); }
  }).catch((e: unknown) => toast(errText(e), 3500)).finally(() => { assaying = false; });
}
function refreshCrystals(): void { game.net.api.moon.crystals().then((n) => { BASE.crystals = n; }).catch(() => {}); }

// ---------- the moon buggy ----------
let race: { t0: number; next: number } | null = null, gateAt = 0;
const lapTime = (s: number): string => Math.floor(s / 60) + ':' + (s % 60).toFixed(1).padStart(4, '0');
export function useBuggy(): void {
  if (game.me.hold) { toast('Hands free to drive! Put that down first (Q)', 2500); return; }
  game.me.pose = POSE_BUGGY; game.me.poseT0 = now(); game.sendMe(); SFX.jet(); race = null; MOON.next = 0;
  toast('MOON BUGGY! Drive through the START gate, then gates 1 to 4 and back, for a lap time. E to park', 5000);
}
export function parkBuggy(): void {
  if (game.me.pose !== POSE_BUGGY) return;
  game.me.pose = 0; game.sendMe(); SFX.sit(); race = null; MOON.next = -1;
  toast('Parked (it drives itself back to the garage)', 2500);
}
function buggyStep(): void {
  if (game.me.pose !== POSE_BUGGY) { race = null; if (MOON.next >= 0) MOON.next = -1; return; }
  if (game.room.id !== 'moon') { game.me.pose = 0; game.sendMe(); return; }
  const t = now(), g = race ? race.next : 0, [gx, gy] = GATES[g];
  if (t - gateAt < 0.5 || Math.abs(game.me.x - gx) > 32 || Math.abs(game.me.y - gy) > 26) return;
  gateAt = t;
  if (!race) { race = { t0: t, next: 1 }; MOON.next = 1; SFX.tminus(); toast('GO! Gate 1 is over by the crystal field', 2500); return; }
  if (g === 0) { // round the whole course: a lap
    const lap = t - race.t0, ms = Math.round(lap * 1000), rec = MOON.best;
    quests.bump('buggy'); quests.stat('buggyLaps'); SFX.score();
    if (!rec || ms < rec.ms) { game.setState({ k: 'moonbest', v: { name: game.me.name, ms } }); game.celebrate(); toast('LAP ' + lapTime(lap) + ' · A NEW MOON RECORD!', 5000); }
    else toast('LAP ' + lapTime(lap) + ' · record ' + lapTime(rec.ms / 1000) + ' (' + rec.name + ')', 4000);
    race = { t0: t, next: 1 }; MOON.next = 1; return;
  }
  SFX.blip(); race.next = (g + 1) % GATES.length; MOON.next = race.next;
}

/** Dev/tests (the ?debug hook): the Moon's state as this browser sees it. */
export const moonDebug = () => ({ lander: lander(), mined: [...MOON.mined.keys()], best: MOON.best, next: MOON.next, race, hold: game.me.hold, pose: game.me.pose, use: game.me.use, crystals: BASE.crystals, assay: BASE.assay, lowG: ENV.lowG, airless: ENV.airless, mining: !!mining });

// ---------- each frame, and arriving ----------
export function moonStep(): void {
  ENV.lowG = !!game.room.lowG?.(); ENV.airless = !!game.room.airless; ENV.bump = game.room.id === 'moon' ? bumpAt : null;
  landerNews();
  if (landT && now() > landT) { landT = 0; if (ENV.lowG && game.me.pose === POSE_FLOAT) { SFX.hop(); } }
  const T = Date.now() / 1000; for (const [k, at] of MOON.mined) if (T - at > 600) MOON.mined.delete(k);
  miningStep(); buggyStep();
}
export function moonArrive(from: RoomId, id: RoomId): void {
  if (from === 'station' && id === 'lander') { const f = lander(); toast('Welcome aboard LUNA 1! Undocking in ' + mmss(f.left) + '. Strap in at a seat', 4500); }
  if (from === 'lander' && id === 'moon') {
    SFX.hiss(); quests.bump('moonwalk'); quests.stat('moonwalks');
    if (!save.data.stats.moon) { quests.stat('moon'); setTimeout(() => toast('One small hop for a critter... WELCOME TO THE MOON! Moon gravity: you bound about. ' + (game.isTouch ? 'JUMP' : 'SPACE') + ' for a big jump', 7000), 400); }
  }
  if (id === 'moonbase') { SFX.hiss(); refreshCrystals(); if (from === 'moon' && !save.data.stats.base) { quests.stat('base'); toast('The MOON BASE! Air in here, so helmets off. Bring moon rocks to the ASSAY machine (far right)', 6000); } }
  if (from === 'moonbase' && id === 'moon') SFX.hiss();
  if (from === 'lander' && id === 'station') toast('Back on the SPACE STATION', 2500);
  else if (id === 'station' && !save.data.stats.moonNews) { quests.stat('moonNews'); setTimeout(() => { if (game.room.id === 'station') toast('NEW: the LANDER BAY (the far right end of the station) flies down to THE MOON every 10 minutes!', 6500); }, 5000); } // (once, for everyone who knew the station before)
}
