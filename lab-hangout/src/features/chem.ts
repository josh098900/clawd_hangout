// THE CHEM LAB, the playing part (game/chem.ts is the chemistry, world/chem.ts draws it): stepping up to a bench, putting
// reagents in the beaker (1-8), MIX, every mix going off for everyone in the room (the 'chem' message: each browser works
// out the same reaction from it), the two-chemist reactions, discoveries in your RECIPE BOOK, potions (in your hand, then
// drunk: the effect everyone sees, the 'fx' message, re-sent whenever anyone arrives), the KA-BOOM's frazzle, the
// goggles dispenser, the safety shower, and BONEY watching people go by.

import { game, now } from '../app/game';
import { CHEM, CHL, SPOT, type Live } from '../world/chem';
import { DUOS, DUO_MS, FRAZZLE_S, FX, POTION_S, REACTIONS, found, outcome, rxById, type Outcome, type Reaction } from '../game/chem';
import { HOLD_POTION, isPotion, type Avatar } from '../entities/avatar';
import { FACE_LAB_GOGGLES } from '../entities/critter';
import { save } from '../game/save';
import { quests } from '../game/quests';
import { toast } from '../ui/overlay';
import { openRecipeBook } from '../ui/chembook';
import { SFX } from '../audio/sfx';

/** Seconds between your mixes (the beaker settles). */
const MIX_GAP = 2.6;
let lastMix = -9, showerT = -9, boneyNear = false, fxResend = 0, benchTip = false, gogglesTip = false, enterTip = false;

// ---------------------------------------------------------------- the bench ----------------------------------------------------------------
/** You stepped up to bench b (main has put you on its spot). */
export function chemBench(b: number): void {
  CHEM.at = b; CHEM.picks = []; SFX.zap();
  if (!benchTip) { benchTip = true; toast((game.isTouch ? 'Tap 2 or 3 reagents' : 'Press 1-8 to add 2 or 3 reagents') + ', then MIX! Walk away to stop', 4500); }
  if (game.me.look.face !== FACE_LAB_GOGGLES && !gogglesTip) { gogglesTip = true; setTimeout(() => { if (CHEM.at >= 0) toast('Safety first: LAB GOGGLES are free from the dispenser by the door', 3500); }, 5000); }
}
/** Reagent i into the beaker (or, if it's in already, back out). */
export function chemPick(i: number): void {
  if (CHEM.at < 0 || i < 0 || i > 7) return;
  const k = CHEM.picks.indexOf(i);
  if (k >= 0) { CHEM.picks.splice(k, 1); SFX.blip(); return; }
  if (CHEM.picks.length >= 3) { toast('The beaker takes 3 at most. Take one back out (press it again), or MIX!', 2200); SFX.nope(); return; }
  CHEM.picks.push(i); SFX.clink();
}
/** Enough in the beaker to mix. */
export const chemReady = (): boolean => CHEM.at >= 0 && CHEM.picks.length >= 2;
/** MIX! */
export function chemMix(): void {
  const b = CHEM.at; if (b < 0) return;
  if (CHEM.picks.length < 2) { toast('Put 2 or 3 reagents in first' + (game.isTouch ? '' : ' (1-8)'), 2000); SFX.nope(); return; }
  if (now() - lastMix < MIX_GAP) { toast('Let the beaker settle...', 1200); return; }
  lastMix = now();
  const m = CHEM.picks.reduce((s, i) => s | (1 << i), 0), at = Date.now();
  CHEM.picks = [];
  game.net.send('chem', { b, m, at });
  start(game.net.selfId, b, m, at);
}
/** Someone else mixed at bench b. */
export function onChem(id: string, b: number, m: number, at: number): void {
  const T = Date.now(); if (Math.abs(T - at) > 15000) at = T; // (a clock that's badly off: it goes off now)
  start(id, b, m, at);
}

/** A mix goes off: for everyone in the room it's the same reaction, from the same mix. */
function start(id: string, b: number, m: number, at: number): void {
  const out = outcome(m), L: Live = { b, mix: m, out, at, by: id, seed: (at % 100003) + b * 7919 + m * 31 };
  CHEM.live.push(L);
  if (CHEM.live.length > 24) CHEM.live.shift();
  if (game.room.id === 'chem') sounds(out);
  if (id === game.net.selfId) {
    game.setState({ k: 'chemlog', v: { n: CHEM.log.n + 1, rx: out.rx ? out.rx.id : CHEM.log.rx, by: out.rx ? game.me.name : CHEM.log.by } });
    quests.stat('mixes');
    if (out.rx) discover(out.rx); else setTimeout(() => toast(out.name + '. Nothing new: try another mix!', 2200), 900);
    if (out.rx?.fx) { quests.bump('chem'); setTimeout(() => { game.me.hold = HOLD_POTION + out.rx!.fx! - 1; game.me.sips = 0; game.sendMe(); toast('You made a ' + out.rx!.name + '! ' + (game.isTouch ? 'Tap DRINK' : 'Q to DRINK') + ' it, here or anywhere', 4000); }, 1300); }
    if (out.kind === 'boom') setTimeout(() => { setFx(game.me, FX.FRAZZLED, FRAZZLE_S); sendFx(); }, 150);
  }
  duoCheck(L);
}
/** This discovery at the other bench too, within DUO_MS, by someone else: the big one. */
function duoCheck(L: Live): void {
  const rx = L.out.rx, id = rx ? DUOS[rx.id] : undefined; if (!rx || !id) return;
  const other = CHEM.live.find((o) => o !== L && o.b !== L.b && o.by !== L.by && o.out.rx?.id === rx.id && Math.abs(o.at - L.at) <= DUO_MS);
  if (!other) return;
  const at = Math.max(L.at, other.at);
  if (CHEM.duo && CHEM.duo.id === id && Math.abs(CHEM.duo.at - at) < 5000) return; // (already going)
  CHEM.duo = { id, at };
  if (game.room.id === 'chem') { if (id === 'toothpaste') { SFX.foam(); setTimeout(() => SFX.foam(), 400); } else SFX.boom(); setTimeout(() => SFX.joy(), 300); }
  if (L.by === game.net.selfId || other.by === game.net.selfId) { const d = rxById(id); if (d) discover(d); }
}
function discover(rx: Reaction): void {
  if (save.data.chem.includes(rx.id)) return;
  save.update((d) => { d.chem.push(rx.id); });
  const n = found(save.data.chem);
  setTimeout(() => { SFX.score(); toast('NEW DISCOVERY! ' + rx.name + ' · RECIPE BOOK ' + n + '/' + REACTIONS.length, 4000); }, 1000);
  quests.checkBadges();
}
/** Each reaction's own sound (and the ones that come a moment later). */
function sounds(out: Outcome): void {
  const later = (s: number, f: () => void) => setTimeout(() => { if (game.room.id === 'chem') f(); }, s * 1000);
  SFX.blub();
  switch (out.kind) {
    case 'foam': later(0.3, () => SFX.foam()); break;
    case 'sparkler': SFX.crackle(); later(1.4, () => SFX.crackle()); later(2.8, () => SFX.crackle()); break;
    case 'fountain': for (let k = 0; k < 5; k++) later(0.4 + k * 0.9, () => SFX.pop()); break;
    case 'smoke': case 'puff': SFX.poof(); break;
    case 'ice': later(0.2, () => SFX.frost()); break;
    case 'storm': later(3, () => SFX.thunder()); later(4.9, () => SFX.thunder()); break;
    case 'lava': later(1, () => SFX.blub()); later(3, () => SFX.blub()); break;
    case 'geyser': SFX.whoosh(); later(1.05, () => SFX.splat()); break;
    case 'worm': later(1, () => SFX.squeak()); break;
    case 'fireflies': later(0.5, () => SFX.idea()); break;
    case 'boom': SFX.boom(); SFX.hurt(); break;
    case 'disco': later(0.8, () => SFX.disco()); break;
    case 'potion': SFX.fizz(); later(1.2, () => SFX.bell()); break;
    case 'fizz': SFX.fizz(); break;
    case 'sludge': later(0.5, () => SFX.blub()); later(1.5, () => SFX.nope()); break;
  }
}

// ---------------------------------------------------------------- potions: in your hand, drunk, seen by everyone ----------------------------------------------------------------
const FX_SAYS: Record<number, string> = {
  [FX.TINY]: 'You shrank! Everyone can see how tiny you are (30 s)', [FX.HUGE]: 'You\'re HUGE! Mind your head (30 s)', [FX.RAINBOW]: 'You\'re every colour at once! (30 s)',
  [FX.GLOWING]: 'You\'re glowing! Go and light up somewhere dark (30 s)', [FX.BUBBLES]: 'Bubbles! Walk around and leave a trail (30 s)', [FX.FLOATY]: 'You\'re floating! (30 s)',
};
/** Q with a potion in your hand: drink it. */
export function drinkPotion(): void {
  const me = game.me; if (!isPotion(me.hold)) return;
  const fx = me.hold - HOLD_POTION + 1;
  game.celebrate('sip');
  setTimeout(() => {
    me.hold = 0; game.sendMe(); setFx(me, fx, POTION_S); sendFx();
    SFX.gulp(); setTimeout(() => { SFX.poof(); if (fx === FX.TINY) SFX.shrink(); else if (fx === FX.HUGE) SFX.grow(); }, 250);
    toast(FX_SAYS[fx] ?? 'Glug!', 3500);
  }, 800);
}
/** Put effect k on an avatar for s seconds (0 = take it off). */
export function setFx(av: Avatar, k: number, s: number): void { av.fx = k && s > 0 ? { k, t0: now(), t1: now() + s } : null; }
/** The effect you're under right now (null = none). */
export const myFx = (): { k: number; left: number } | null => { const f = game.me.fx; return f && now() < f.t1 ? { k: f.k, left: f.t1 - now() } : null; };
/** Tell the room what you're under (or that it's gone). */
export function sendFx(): void { const f = myFx(); game.net.send('fx', { k: f ? f.k : 0, s: f ? Math.round(f.left * 10) / 10 : 0 }); }
/** Someone told the room what they're under. */
export function onFx(id: string, k: number, s: number): void { const av = game.others.get(id); if (av) setFx(av, k, s); }
/** Someone arrived (or you did): make sure they can see your potion. A moment later, so their end is listening. */
export function fxToNewcomer(): void { if (myFx()) fxResend = now() + 0.6; }

// ---------------------------------------------------------------- the goggles, the shower, the book ----------------------------------------------------------------
/** The dispenser: a free pair the first time (and on they go); after that, on or off. */
export function takeGoggles(): void {
  const me = game.me, item = 'face:' + FACE_LAB_GOGGLES;
  SFX.snap();
  if (!save.has(item)) { save.unlock(item); game.wear(item); toast('LAB GOGGLES! They\'re yours now (Look menu). Safety first!', 4500); return; }
  if (me.look.face === FACE_LAB_GOGGLES) { game.setLook({ ...me.look, face: 0 }); toast('Goggles off', 1500); }
  else { game.wear(item); toast('Goggles on!', 1500); }
}
/** What E says at the dispenser. */
export const gogglesLabel = (): string => (!save.has('face:' + FACE_LAB_GOGGLES) ? 'TAKE GOGGLES' : game.me.look.face === FACE_LAB_GOGGLES ? 'GOGGLES OFF' : 'GOGGLES ON');
/** Under the safety shower (main has put you on its spot): it washes off any potion or frazzle. */
export function pullShower(): void {
  showerT = now(); SFX.splash();
  if (myFx()) { game.me.fx = null; sendFx(); setTimeout(() => toast('Brrr! All washed off', 2500), 500); }
  else setTimeout(() => toast('Brrr! Refreshing. (It washes off potions too)', 2500), 500);
}
export function readBook(i: number): void { SFX.blip(); openRecipeBook(game.closeSpot(i)); }

// ---------------------------------------------------------------- every frame ----------------------------------------------------------------
/** You walked into the chem lab. */
export function chemEntered(): void {
  CHEM.at = -1; CHEM.picks = [];
  if (myFx()) { fxResend = now() + 0.4; }
  if (!enterTip && !save.data.chem.length) { enterTip = true; setTimeout(() => { if (game.room.id === 'chem') toast('THE CHEM LAB! Step up to a bench (E) and mix 2 or 3 reagents. See what happens...', 5000); }, 1200); }
}
export function chemStep(): void {
  const T = Date.now(), t = now(), me = game.me;
  CHEM.live = CHEM.live.filter((L) => T - L.at < (L.out.kind === 'boom' ? 30 : L.out.dur) * 1000 + 500);
  if (CHEM.duo && T - CHEM.duo.at > 42000) CHEM.duo = null;
  // your effect wears off
  if (me.fx && t >= me.fx.t1) { me.fx = null; SFX.pop(); toast('The potion wore off', 2000); }
  if (fxResend && t >= fxResend) { fxResend = 0; sendFx(); }
  if (game.room.id !== 'chem') { if (CHEM.at >= 0) { CHEM.at = -1; CHEM.picks = []; } return; }
  const cam = game.R.cam; CHEM.view.x0 = cam.x; CHEM.view.x1 = cam.x + cam.w; CHEM.view.y0 = cam.y; CHEM.view.y1 = cam.y + cam.h; // (the foam flood only draws what's in view)
  // stepped off your bench (walked away): the beaker's yours no more
  if (CHEM.at >= 0 && me.use !== CHEM.at) { CHEM.at = -1; CHEM.picks = []; }
  // three seconds under the shower is plenty
  if (me.use === SPOT.SHOWER && t - showerT > 3) game.leaveSpot();
  // BONEY clacks and turns to look at anyone walking past
  const near = game.everyone().find((av) => Math.abs(av.x - CHL.boney) < 44 && Math.abs(av.y - 532) < 44);
  if (near && !boneyNear) { CHEM.boney = t; CHEM.boneyDir = near.x < CHL.boney ? -1 : 1; SFX.clack(); }
  boneyNear = !!near;
}
/** For the debug hook. */
export const chemDebug = () => ({ at: CHEM.at, picks: [...CHEM.picks], live: CHEM.live.map((L) => ({ b: L.b, mix: L.mix, kind: L.out.kind, name: L.out.name, by: L.by, at: L.at })), duo: CHEM.duo, log: CHEM.log, fx: myFx(), book: [...save.data.chem], hold: game.me.hold });
/** For tests: go off at bench b with this mix, as if you'd mixed it (no waiting). */
export function chemForce(b: number, m: number): void { lastMix = -9; CHEM.at = b; CHEM.picks = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => m & (1 << i)); chemMix(); }
