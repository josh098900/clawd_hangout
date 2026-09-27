// SARDINE 1, the playing part (game/sub.ts is the rules, world/sub.ts the cabin, world/sea.ts the window; 0024_sub.sql pays).
//
//   * WHO FLIES IT: whoever's at the HELM. Their browser moves the sub (fixed ticks, game/sub.ts stepSub) and sends 'helm' when the
//     stick changes and twice a second; everyone else runs the same maths on from the last one. With nobody at the helm the CAP'N's
//     autopilot flies it, worked forward from the dive's snapshot (room state 'dive').
//   * THE SKIPPER (the lowest id aboard, like every room's host) keeps room state 'dive': the snapshot (re-sent every 3 s), the lights,
//     the troubles fixed, the finds taken, the kinds photographed, the mission's progress, the octopus. Everyone else sends a small
//     'sub' message for what they do (SNAP, PING, GRAB, FIX, LIGHTS, TEA, HORN, the CLAW moving, a BONK) and applies it at once themselves.
//     The skipper also decides what depends on where the sub is: the visitor on the hull (a seal, or the giant squid), the Cap'n's lights.
//   * THE CREW is whoever's aboard when the hatch shuts. When it surfaces: THE DIVE REPORT, the pay (dive_pay), the quest, the octopus.

import { game, now } from '../app/game';
import { dayness } from '../world/plaza';
import { weather, lightning as stormBolt } from '../world/weather';
import { isHalloween, isWinter } from '../world/season';
import { SUBW, SUBSPOT } from '../world/sub';
import { drawClawCam, type SeaView } from '../world/sea';
import {
  dive, subT, newDive, mergeDive, troublesOf, troublesOn, troubleStart, effectsAt, findsOf, missionOf, missionDone, missionProgress, MISSIONS,
  seaLife, snapKinds, popcount, octopusAt, whaleAt, buoysOf, autoStick, stepSub, homeAt, seabed, zoneAt, zoneName, sunAt,
  onTip, clamOpen, divePay, LOG, LOG_I, HELMET_AT, TR, CAPN_FIXES, OCTO_S, BUOY_R, SONAR_R, CLAW_REACH, CLAW_SLIDE, SNAP_OCTO, SNAP_SEAL, MP,
  FIND_NAMES, NOTES, SUB_BOARD, SUB_DOWN, SUB_HOME, SUB_UP, SUB_SHUT, SUB_CYCLE, HOME_IN, TICK, GATE, hatchOpen, periscopeOut,
  type DiveState, type Motion, type Find, type Lamps, type View, type Sighting,
} from '../game/sub';
import { save } from '../game/save';
import { quests } from '../game/quests';
import { mmss } from '../engine/format';
import { clamp } from '../engine/math';
import { SFX } from '../audio/sfx';
import { say, toast } from '../ui/overlay';
import { openSeaLog } from '../ui/sealog';
import { openBin, openPeriscope, showReport } from '../ui/sub';
import type { HelmMsg, SubMsg } from '../net/transport';
import type { RGB } from '../engine/palette';
import { FX } from '../game/chem';
import { sendFx, setFx } from './chem';

/** Where the escape hatch's rubber ring pops you up: the beach by the sub pen, on the Pier. */
const ESCAPED = { x: 1812, y: 604 };

const CAP = 'npc-barnacle-sub';
/** The Cap'n says one of these (only if you're aboard to hear it). */
function capn(lines: string[]): void { if (game.room.id === 'sub' && game.npcs.inRoom('sub').some((n) => n.def.id === CAP)) say(CAP, lines[Math.floor(Math.random() * lines.length)], now(), false); }

// ---------------------------------------------------------------- this browser's copy of the dive ----------------------------------------------------------------
/** The sub where this browser shows it (smoothed), and each source it comes from. */
let shown: Motion = { x: GATE.x, y: GATE.y, vx: 0, vy: 0 }, lastT = 0;
/** The autopilot, run on from the dive's snapshot: its motion at dive-clock time t (`base` = the snapshot, or the hand-over, it started from: only a newer one restarts it). */
let auto: { m: Motion; t: number; base: number } | null = null;
/** Someone else at the helm: their last message, run on with their stick. */
let remote: { id: string; m: Motion; t: number; sx: number; sy: number; heard: number } | null = null;
/** You at the helm: your own motion, your stick, and what you last sent. */
let flying: { m: Motion; t: number } | null = null, stick = { x: 0, y: 0 }, sent = { t: -9, sx: 9, sy: 9 };
/** The phone's d-pad (held buttons). */
export const SUBPAD = { x: 0, y: 0 };
/** The run home's start (the sub at k 420), per dive. */
let home: { n: number; p: { x: number; y: number } } | null = null;
/** How long the sub's been all but stopped (the moray comes out), the last ping, the flash, the ping on the glass (animation clock). */
let still = 0, ping: { T: number; x: number; y: number } | null = null, flashA = -99, pingA = -99, snapA = -99, pingCool = -99;
/** The claw (yours, when you're at it): along, down, how shut, what it's got, and the find that slipped last. Someone else's, for the console. */
const claw = { cx: 0, cd: 0, shut: 0, phase: 'free' as 'free' | 'close' | 'lift', t: 0, hold: null as Find | null, slipped: -1, sentA: -9, slipNow: false };
let remoteClaw: { cx: number; cd: number; t: number } | null = null;
/** Which dive you're crew on (aboard when the hatch shut), which one's been reported, and what's been said this dive. */
let crewN = -1, reportedN = -1, zoneSeen = '', saidKey = '', whaleSaid = -1, octoSaid = -1, escapeArmed = -99, homeSaid = -1, lampsSaid = -1, lastBonk = -9;
const troubleSeen = new Set<string>();
/** Entering the sub: fresh state for this visit. */
export function subEntered(from: string): void {
  auto = null; remote = null; flying = null; stick = { x: 0, y: 0 }; zoneSeen = ''; troubleSeen.clear(); ping = null;
  if (from === 'aquarium') { SFX.clang(); toast(hatchOpen() ? 'Aboard SARDINE 1! It dives in ' + mmss(Math.max(0, SUB_SHUT - dive().k)) + '. Try the stations, or sit and watch' : 'Aboard SARDINE 1', 4500); }
  SUBW.sea = null; SUBW.pen = null;
}
/** Leaving (the ladder at the dock, the escape hatch, a map or GO before it dives): let go of everything. */
export function subLeft(): void { if (flying) letGo(true); flying = null; remote = null; if (game.me.use >= 0) claw.phase = 'free'; }

// ---------------------------------------------------------------- who's who ----------------------------------------------------------------
const crewIds = (): string[] => [game.net.selfId, ...[...game.others.keys()].filter((id) => !id.startsWith('bot-'))].sort();
const amSkipper = (): boolean => crewIds()[0] === game.net.selfId;
/** Who's at spot i (you or someone else), or null. */
function atSpot(i: number): string | null {
  if (game.me.use === i) return game.net.selfId;
  for (const [id, av] of game.others) if (av.use === i) return id;
  return null;
}
const st = (): DiveState => { const d = dive(); if (!SUBW.st || SUBW.st.n !== d.n) SUBW.st = newDive(d.n, crewIds()[0]); return SUBW.st; };
/** The skipper's copy goes to everyone (and the snapshot with it). */
function share(s: DiveState): void { s.sk = crewIds()[0]; SUBW.st = s; game.setState({ k: 'dive', v: { ...s } }); lastShare = now(); }
let lastShare = -9;
/** Change the dive: the skipper changes it and shares it; everyone else changes their own copy (and has sent the event). */
function change(fn: (s: DiveState) => void): void { const s = { ...st(), fx: [...st().fx] }; fn(s); if (amSkipper()) share(s); else SUBW.st = mergeDive(SUBW.st, s); }

// ---------------------------------------------------------------- the lights, and the troubles ----------------------------------------------------------------
/** The troubles on right now, and the lights as far as the sea's concerned (off in a LIGHTS OUT). */
function lamps(s: DiveState, T: number): Lamps {
  const out = troublesOn(s, T).find((t) => t.kind === TR.LIGHTS);
  if (out) return { on: false, lt: troubleStart(s, out), lp: s.lt };
  return { on: s.li === 1, lt: s.lt, lp: s.lp };
}
const troubleOn = (kind: number, T = subT()): boolean => { const s = SUBW.st; return !!s && s.n === dive().n && troublesOn(s, T).some((t) => t.kind === kind); };

// ---------------------------------------------------------------- the sub's motion ----------------------------------------------------------------
const kOf = (T: number): number => ((T % SUB_CYCLE) + SUB_CYCLE) % SUB_CYCLE;
/** Run a motion on in ticks from t to T with a stick (a function of the motion and time: the autopilot's, or a held one). */
function runOn(m: Motion, t: number, T: number, stickOf: (m: Motion, t: number) => { sx: number; sy: number }, s: DiveState): { m: Motion; t: number; bonk: boolean } {
  let bonk = false, steps = 0;
  if (T - t > 60) t = T - 60; // (a long gap: just the last minute)
  if (t > T) t = T; // (from a clock that's ahead of ours, or ours stepped back: carry on from now, don't sit still till we catch up)
  while (t + TICK <= T && steps < 700) {
    const k = kOf(t); if (k < SUB_DOWN || k >= SUB_HOME) { t = T; break; }
    const sk = stickOf(m, t), r2 = stepSub(m, sk.sx, sk.sy, effectsAt(s, t), t); m = r2.m; bonk = bonk || r2.bonk; t += TICK; steps++;
  }
  return { m, t, bonk };
}
/** The sub right now (dive clock T), from whichever source is flying it. */
function motionNow(T: number, s: DiveState): Motion {
  const k = kOf(T), d = dive();
  if (k >= SUB_HOME && k < HOME_IN) { // the run home, from wherever it was at 420
    if (!home || home.n !== d.n) home = { n: d.n, p: { x: shown.x, y: shown.y } };
    const p = homeAt(home.p, k), p2 = homeAt(home.p, Math.min(HOME_IN, k + 0.2));
    return { x: p.x, y: p.y, vx: (p2.x - p.x) * 5, vy: (p2.y - p.y) * 5 };
  }
  if (k < SUB_DOWN || k >= HOME_IN) return { x: GATE.x, y: GATE.y, vx: 0, vy: 0 };
  const slow = atSpot(SUBSPOT.CLAW) ? (treasureBelow(s) ? 0 : 0.12) : 1; // (someone's at the claw: the Cap'n crawls, and holds her still over treasure)
  if (flying) { const r2 = runOn(flying.m, flying.t, T, () => ({ sx: stick.x, sy: stick.y }), s); flying = { m: r2.m, t: r2.t }; if (r2.bonk) bonked(r2.m); return flying.m; }
  if (remote && atSpot(SUBSPOT.HELM) === remote.id && T - remote.heard < 2.5) { const r2 = runOn(remote.m, remote.t, T, () => ({ sx: remote!.sx, sy: remote!.sy }), s); remote.m = r2.m; remote.t = r2.t; return remote.m; }
  if (!auto || s.at > auto.base) auto = { m: { x: s.x, y: s.y, vx: s.vx, vy: s.vy }, t: s.at, base: s.at };
  const r2 = runOn(auto.m, auto.t, T, (m, t) => autoStick(m, kOf(t), slow), s); auto.m = r2.m; auto.t = r2.t;
  return auto.m;
}
/** Is there a find (not yet taken) within the claw's reach under the sub? */
function treasureBelow(s: DiveState): boolean {
  return findsOf(s.n, isWinter()).some((f) => !((s.got >>> f.i) & 1) && Math.abs(f.x - shown.x) <= CLAW_SLIDE && f.y - shown.y > 0 && f.y - shown.y <= CLAW_REACH + 2);
}
/** You hit the bottom (or a wall): a bonk; in the trench, that's TOUCH THE BOTTOM. */
function bonked(m: Motion): void {
  const t = now(); if (t - lastBonk < 0.8) return; lastBonk = t;
  SFX.bonk(); SUBW.shake = 0.6; setTimeout(() => { SUBW.shake = 0; }, 300);
  if (m.x > 2640 && m.y > seabed(m.x) - 16) { game.net.send('sub', { e: 'bonk', v: 0, x: m.x, y: m.y }); onBonk(m.x, m.y); }
}
function onBonk(x: number, y: number): void {
  const s = st(); if (x < 2640 || y < 1000 || s.m & MP.BOTTOM) return;
  change((q) => { q.m |= MP.BOTTOM; });
  if (MISSIONS[missionOf(s.n)].id === 'bottom') missionToast();
  capn(['BONK. That\'s the bottom of the trench!', 'We touched the bottom! Well done. Now, carefully, up']);
}

// ---------------------------------------------------------------- the helm ----------------------------------------------------------------
/** The stick, from the keys or the phone's d-pad (at the helm or the claw). */
export function subInput(ax: number, ay: number): void {
  const x = ax || SUBPAD.x, y = ay || SUBPAD.y;
  if (game.usingOf(game.me) === 'helm') { stick = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) }; if ((stick.x || stick.y) && now() - helmHintAt > 5) helmHint(); }
  else if (game.usingOf(game.me) === 'subclaw') clawMove(x, y);
}
/** The stick does nothing while a jelly's in the intake or a visitor has hold of her: say why (and what fixes it). */
let helmHintAt = -9;
function helmHint(): void {
  const s = st(), on = troublesOn(s, subT());
  const why = on.some((t) => t.kind === TR.JELLY) ? 'She won\'t answer the helm: there\'s a JELLY IN THE INTAKE! Someone pull the INTAKE lever on the engine'
    : on.some((t) => t.kind === TR.VISITOR) ? (s.vk === 1 ? 'The seal\'s in the way and she won\'t budge. SNAP its photo at the CAMERA and off it goes' : 'THE GIANT SQUID\'s got hold of us! Photograph it, then hit ZAP')
    : null;
  if (why) { helmHintAt = now(); toast(why, 3500); }
}
function takeHelm(): void {
  const d = dive();
  if (d.k < SUB_DOWN) { toast('We\'re tied up in the pen. She goes at the horn: then she\'s all yours', 3500); capn(['Patience! We\'re still tied up']); return; }
  if (d.k >= SUB_HOME) { toast('The Cap\'n\'s taking her home', 2500); return; }
  const T = subT(); flying = { m: { ...motionNow(T, st()) }, t: T }; stick = { x: 0, y: 0 }; sent = { t: -9, sx: 9, sy: 9 };
  SFX.clunk(); toast(game.isTouch ? 'The d-pad steers: ◀ ▶ astern / ahead, ▲ ▼ up / down. HORN to toot. E lets go' : '← → astern / ahead · ↑ ↓ up / down · SPACE: the horn · E lets go', 5000);
  capn(['She\'s all yours. Don\'t hit anything expensive.', 'Your helm! Gently does it', 'Right. You drive, I\'ll... supervise']);
}
/** Let go of the helm: the autopilot picks up from here (you tell everyone where you left it). */
function letGo(quiet = false): void {
  if (!flying) return;
  const m = flying.m, T = subT(); flying = null; stick = { x: 0, y: 0 };
  game.net.send('helm', { x: m.x, y: m.y, vx: m.vx, vy: m.vy, sx: 0, sy: 0, off: 1 });
  resumeAuto(m, T);
  if (!quiet) capn(['Autopilot on. I\'ll take her', 'Back to the tour, then']);
}
function resumeAuto(m: Motion, T: number): void {
  auto = { m: { ...m }, t: T, base: T };
  if (amSkipper() && kOf(T) >= SUB_DOWN && kOf(T) < SUB_HOME) share({ ...st(), fx: [...st().fx], at: T, x: m.x, y: m.y, vx: m.vx, vy: m.vy });
}
export function horn(): void { SFX.foghorn(); game.net.send('sub', { e: 'horn', v: 0 }); hornHeard(); }
function hornHeard(): void {
  const d = dive(), w = whaleAt(d.n, d.k);
  if (w && Math.abs(w.x - shown.x) < 500) setTimeout(() => { SFX.whale(); toast('The whale sings back!', 2500); }, 900);
}
/** Someone else at the helm told us where the sub is (or that they've let go). */
export function onHelm(id: string, h: HelmMsg): void {
  if (game.room.id !== 'sub') return;
  const T = subT(), m = { x: h.x, y: h.y, vx: h.vx, vy: h.vy };
  if (h.off) { if (remote?.id === id) remote = null; resumeAuto(m, T); return; }
  if (game.others.get(id)?.use !== SUBSPOT.HELM) return; // (only whoever's at the helm flies it)
  remote = { id, m, t: T, sx: h.sx, sy: h.sy, heard: T };
}

// ---------------------------------------------------------------- the stations ----------------------------------------------------------------
/** E at one of SARDINE 1's spots (world/sub.ts SUB_SPOTS): the ones you stay at return true (main.ts sits you there). */
export function subSpot(kind: string, n: number): boolean {
  switch (kind) {
    case 'helm': takeHelm(); return dive().k >= SUB_DOWN && dive().k < SUB_HOME;
    case 'subcam': snap(); return true;
    case 'lights': lightsLever(); return false;
    case 'sonar': sonarPing(); return true;
    case 'subclaw': return clawOn();
    case 'periscope': periscope(); return true;
    case 'subfix': fix(n); return false;
    case 'bin': openBin(SUBW.bin.map((k) => ({ kind: k, note: noteOf(k) })), () => game.input.clear()); SFX.blip(); return false;
    case 'sealog': openSeaLog(() => game.input.clear()); SFX.blip(); return false;
    case 'escape': escape(); return false;
  }
  return false;
}
/** What E says at a spot aboard right now (null: its usual label). */
export function subLabel(kind: string, n: number): string | null {
  if (kind === 'subfix') return troubleOn(n) ? (['TURN IT!', n === TR.VISITOR && SUBW.st?.vk === 1 ? 'SNAP IT!' : 'ZAP!', 'FLIP IT!', 'FLUSH IT!'][n === TR.LEAK ? 0 : n === TR.VISITOR ? 1 : n === TR.LIGHTS ? 2 : 3]) : 'CHECK';
  if (kind === 'lights') return SUBW.st?.li ? 'LIGHTS OFF' : 'LIGHTS ON';
  if (kind === 'escape') return now() - escapeArmed < 3 ? 'SURE? E AGAIN' : 'ESCAPE';
  return null;
}
/** While you're at a station: what E does there (null: step away). */
export function subAction(kind: string): { label: string; run: () => void } | null {
  if (kind === 'helm') return { label: 'LET GO', run: () => { letGo(); game.leaveSpot(); } };
  if (kind === 'subcam') return { label: 'SNAP!', run: snap };
  if (kind === 'sonar') return { label: 'PING!', run: sonarPing };
  if (kind === 'subclaw') return { label: 'STEP AWAY', run: () => { clawOff(); game.leaveSpot(); } };
  return null;
}
/** SPACE at a station: the horn at the helm, GRAB at the claw. */
export function subSpace(): boolean {
  const k = game.usingOf(game.me);
  if (k === 'helm') { horn(); return true; }
  if (k === 'subclaw') { grab(); return true; }
  return false;
}
/** You walked away from (or were moved off) a station. */
export function subStepOff(kind: string): void { if (kind === 'helm') letGo(); if (kind === 'subclaw') clawOff(); if (kind === 'periscope') SUBW.periscope = 0; }

// ---- CAMERA ----
function snap(): void {
  const a = now(), T = subT(), d = dive();
  if (a - snapA < 2) { SFX.blip(); return; }
  snapA = a; flashA = a; SFX.shutter(); setTimeout(() => SFX.flashWhine(), 60);
  if (d.k < SUB_DOWN || d.k >= HOME_IN) { toast('SNAP! A lovely photo of the pen wall', 2500); return; }
  const s = st(), got = kindsNow(T, s);
  game.net.send('sub', { e: 'snap', v: got });
  gotSnap(game.net.selfId, got);
}
/** What a photo from here gets right now: the kinds in the window (and on the glass: the octopus, the visitor). */
function kindsNow(T: number, s: DiveState): number {
  const L = lamps(s, T), view: View = { x: shown.x, y: shown.y, lamps: L.on, ping, T, day: dayness() };
  let bits = snapKinds(lifeNow(T, s), view);
  const oc = octoOn(T, s); if (oc >= 0) bits |= SNAP_OCTO;
  const vis = visitorOn(T, s); if (vis === 1) bits |= SNAP_SEAL | (1 << LOG_I.seal); if (vis === 2) bits |= 1 << LOG_I.squid;
  return bits;
}
/** A photo was taken (by you or someone aboard): everything in it goes in everyone's SEA LIFE LOG. */
function gotSnap(id: string, bits: number): void {
  const d = dive(), s = st(), kinds = bits & ((1 << LOG.length) - 1), mine = id === game.net.selfId;
  if (!mine) flashA = now();
  const names = LOG.filter((_, i) => (kinds >>> i) & 1), fresh = names.filter((c) => !save.data.sea.includes(c.id));
  if (crewN === d.n || mine) addToLog(names.map((c) => c.id));
  const before = popcount(s.kinds);
  change((q) => { q.kinds |= kinds; if (bits & SNAP_OCTO) q.oct = 1; if (bits & SNAP_SEAL) { const t = troublesOf(q.n).find((x) => x.kind === TR.VISITOR); if (t && !q.fx[t.i]) q.fx[t.i] = subT(); } });
  const who = mine ? 'SNAP! ' : (game.others.get(id)?.name ?? 'SOMEONE') + ' snapped ';
  toast(names.length ? who + names.map((c) => c.name + (fresh.includes(c) ? ' (NEW!)' : '')).join(' · ') : mine ? 'SNAP! Some lovely water' : who + 'some water', 3200);
  if (fresh.length) { SFX.score(); if (mine) game.celebrate('wow'); }
  if (bits & SNAP_SEAL) { capn(['He loves it! Off he goes', 'Say cheese, seal!']); SFX.bark(); }
  if (bits & SNAP_OCTO && octoSaid !== -2) { octoSaid = -2; capn(['Got it! That little one\'s coming home with us, I reckon']); }
  if (MISSIONS[missionOf(d.n)].id === 'whale' && (kinds >>> LOG_I.whale) & 1) missionToast();
  if (MISSIONS[missionOf(d.n)].id === 'spot8' && before < 8 && popcount(st().kinds) >= 8) missionToast();
}
/** Into your SEA LIFE LOG (kept in your save): the DIVING HELMET at 10, the MARINE BIOLOGIST badge at 20. */
function addToLog(ids: string[]): void {
  const add = ids.filter((i) => !save.data.sea.includes(i)); if (!add.length) return;
  save.update((dd) => { dd.sea = [...dd.sea, ...add]; });
  if (save.data.sea.length >= HELMET_AT && save.unlock('hat:20')) setTimeout(() => { SFX.score(); game.celebrate(); toast('10 kinds in your SEA LIFE LOG: you earned the DIVING HELMET! (Look menu)', 6000); }, 1800);
  quests.checkBadges();
}
// ---- FLOODLIGHTS ----
function lightsLever(): void {
  const T = subT(), s = st(), on = s.li ? 0 : 1;
  SFX.clunk(); game.net.send('sub', { e: 'lights', v: on });
  setLights(on, T);
  if (troubleOn(TR.LIGHTS)) toast('The fuse is blown: the lights won\'t come on till someone flips the FUSE BOX', 3000);
}
function setLights(on: number, T: number): void { change((q) => { if (q.li !== on) { q.lp = q.lt; q.lt = T; q.li = on; } }); }
// ---- SONAR ----
function sonarPing(): void {
  const a = now(), d = dive();
  if (a - pingCool < 3) return;
  if (troubleOn(TR.LIGHTS)) { toast('The sonar\'s dead: the fuse is blown', 2000); SFX.nope(); return; }
  pingCool = a; SFX.ping();
  if (d.k < SUB_DOWN || d.k >= HOME_IN) { toast('Ping... it bounces straight back off the pen wall', 2500); return; }
  game.net.send('sub', { e: 'ping', v: 0, x: shown.x, y: shown.y });
  gotPing(shown.x, shown.y);
}
function gotPing(x: number, y: number): void {
  const T = subT(), s = st(); ping = { T, x, y }; pingA = now(); SUBW.sonar.t = now();
  // blips on the round screen: creatures green, finds yellow, the mission's target blinking red
  const blips: { an: number; d: number; c: RGB }[] = [];
  for (const c of lifeNow(T, s)) { const dx = c.x - x, dy = c.y - y, dd = Math.hypot(dx, dy); if (dd < SONAR_R) blips.push({ an: Math.atan2(dy, dx), d: dd / SONAR_R, c: [80, 255, 140] }); }
  for (const f of findsOf(s.n, isWinter())) if (!((s.got >>> f.i) & 1)) { const dx = f.x - x, dy = f.y - y, dd = Math.hypot(dx, dy); if (dd < SONAR_R) blips.push({ an: Math.atan2(dy, dx), d: dd / SONAR_R, c: f.kind === 'rduck' || f.kind === 'bell' || f.kind === 'boot' ? [255, 80, 80] : [255, 214, 90] }); }
  SUBW.sonar.blips = blips.slice(0, 40);
  // MAP THE REEF: a ping near a buoy maps it
  if (MISSIONS[missionOf(s.n)].id === 'reef') {
    const bs = buoysOf(s.n); let got = 0; bs.forEach((b, i) => { if (Math.hypot(b.x - x, b.y - y) <= BUOY_R) got |= 1 << i; });
    if (got & ~s.m & 7) { change((q) => { q.m |= got; }); SFX.chime(); const n2 = popcount(st().m & 7); toast('BUOY MAPPED! ' + n2 + '/3', 2500); if (n2 === 3) missionToast(); }
  }
  // the duck (RESCUE THE DUCK): where it is, if it's in range
  const duck = findsOf(s.n).find((f) => f.kind === 'rduck' && !((s.got >>> f.i) & 1));
  if (duck) { const dd = Math.hypot(duck.x - x, duck.y - y); if (dd < SONAR_R * 1.6) toast('SONAR: the duck! ' + Math.round(dd) + ' m ' + (duck.x > x ? 'ahead' : 'astern') + ', ' + (duck.y > y + 10 ? 'down below' : duck.y < y - 10 ? 'up above' : 'level'), 3500); }
}
// ---- the troubles' fix spots ----
function fix(kind: number): void {
  const T = subT(), s = st(), t = troublesOn(s, T).find((q) => q.kind === kind);
  if (!t) { toast(['Tight as a drum', 'Nothing on the hull. For now', 'All the fuses are fine', 'The intake\'s clear'][kind === TR.LEAK ? 0 : kind === TR.VISITOR ? 1 : kind === TR.LIGHTS ? 2 : 3], 2000); SFX.blip(); return; }
  if (kind === TR.VISITOR && s.vk === 1) { toast('Don\'t zap the seal! He just wants his photo taken: the CAMERA', 3000); SFX.nope(); return; }
  game.net.send('sub', { e: 'fix', v: t.i });
  gotFix(t.i, T);
  if (kind === TR.VISITOR) { SFX.zap(); SUBW.zap = 1; setTimeout(() => { SUBW.zap = 0; }, 800); }
  game.celebrate('joy');
}
function gotFix(i: number, T: number): void {
  const s = st(), t = troublesOf(s.n)[i]; if (!t || s.fx[i]) return;
  change((q) => { q.fx[i] = T; });
  SFX.score();
  const say2 = [['Leak\'s stopped! Mop up later', 'That\'s the stuff'], ['It let go! Off it goes, in a huff', 'ZAPPED. It\'ll be back. They always come back'], ['Lights! Lovely', 'And there was light'], ['Whoosh! Out it pops. Sorry, jelly', 'Engine\'s happy again']][t.kind];
  capn(say2);
  if (t.kind === TR.VISITOR && s.vk === 2) { SFX.splat(); }
  if (MISSIONS[missionOf(s.n)].id === 'faults' && troublesOf(s.n).every((q) => st().fx[q.i] > 0)) missionToast();
}
// ---- the galley ----
/** The kettle's boiled (main.ts's FILL): a mug of tea, and TEA AT THE BOTTOM if you're deep enough. */
export function subTea(): void {
  SUBW.kettle = now() + 3; SFX.whistle();
  const d = shown.y;
  if (d > 1000 && dive().k >= SUB_DOWN && dive().k < SUB_HOME) { game.net.send('sub', { e: 'tea', v: Math.round(d) }); gotTea(d); }
}
function gotTea(depth: number): void {
  const s = st(); if (depth <= 1000 || s.m & MP.TEA) return;
  change((q) => { q.m |= MP.TEA; });
  capn(['Tea at the bottom of the sea! Lovely. Is that for me?', 'Now THAT is a cup of tea']);
  if (MISSIONS[missionOf(s.n)].id === 'tea') missionToast();
}
// ---- the periscope ----
function periscope(): void {
  SUBW.periscope = 1; SFX.squeak();
  const depth = (): number => { const d = dive(); return d.k < SUB_DOWN || d.k >= HOME_IN ? -1 : shown.y < 12 || (periscopeOut(d.k) >= 0 && shown.y < 60) ? 0 : shown.y; }; // (0: it's up in the air, as the Pier sees it heading out and home)
  openPeriscope({ depth, day: dayness, weather: () => weather().kind, flash: () => (weather().kind === 'storm' ? stormBolt().f : 0) }, () => { SUBW.periscope = 0; game.input.clear(); if (game.usingOf(game.me) === 'periscope') game.leaveSpot(); });
}
// ---- the escape hatch ----
function escape(): void {
  const d = dive();
  if (hatchOpen(d)) { toast('The hatch is open: just climb the ladder', 2500); return; }
  if (now() - escapeArmed > 3) { escapeArmed = now(); SFX.beep(); toast('Press E again to ESCAPE: you\'ll pop up by the Pier, and miss the rest of the dive', 3500); return; }
  escapeArmed = -99; crewN = -1; SFX.whoosh(); SFX.splash();
  setFx(game.me, FX.RING, 8); sendFx();
  game.leaveTo('pier', ESCAPED);
  setTimeout(() => { toast('You bobbed up by the Pier in a rubber ring. SARDINE 1 carries on without you', 4500); SFX.splash(); }, 800);
}
/** The bottle notes (for the TREASURE BIN). */
function noteOf(kind: string): string | null { if (kind !== 'bottle') return null; const f = findsOf(dive().n).find((q) => q.kind === 'bottle'); return f?.note !== undefined ? NOTES[f.note] : NOTES[0]; }

// ---------------------------------------------------------------- the claw ----------------------------------------------------------------
function clawOn(): boolean {
  const d = dive();
  if (d.k < SUB_DOWN || d.k >= SUB_HOME) { toast(d.k < SUB_DOWN ? 'Not in the pen! Wait till we\'re out' : 'Claw up: we\'re heading home', 2500); return false; }
  if (troubleOn(TR.LIGHTS)) { toast('The claw cam\'s dead: the fuse is blown', 2500); return false; }
  claw.cx = 0; claw.cd = 0; claw.shut = 0; claw.phase = 'free'; claw.hold = null;
  SFX.whirr(); toast(game.isTouch ? '◀ ▶ slide the claw, ▼ lower it, ▲ raise it, GRAB. E steps away' : '← → slide the claw · ↓ lower · ↑ raise · SPACE grabs · E steps away', 5000);
  capn(['Easy does it... I\'ll slow her down for you', 'The claw\'s rigged. Same people who made the arcade\'s']);
  return true;
}
function clawOff(): void { claw.phase = 'free'; claw.hold = null; claw.cd = 0; claw.shut = 0; game.net.send('sub', { e: 'claw', v: 0, x: 0, y: 0 }); }
function clawMove(x: number, y: number): void { (claw as { ix?: number; iy?: number }).ix = x; (claw as { ix?: number; iy?: number }).iy = y; }
function grab(): void {
  if (claw.phase !== 'free') return;
  claw.phase = 'close'; claw.t = now(); SFX.clunk();
}
/** Every frame at the claw: move it, close it, lift what it caught. */
function clawStep(dt: number): void {
  const T = subT(), a = now(), s = st(), ix = (claw as { ix?: number }).ix ?? 0, iy = (claw as { iy?: number }).iy ?? 0;
  const floor = seabed(shown.x + claw.cx) - shown.y - 1, reach = Math.min(CLAW_REACH, floor);
  if (claw.phase === 'free') {
    claw.cx = clamp(claw.cx + ix * 16 * dt, -CLAW_SLIDE, CLAW_SLIDE);
    if (iy > 0 && claw.cd >= reach - 0.5 && floor > CLAW_REACH && now() - claw.sentA > 2) { claw.sentA = now(); toast('TOO HIGH: get within 40 m of the bottom', 2000); }
    claw.cd = clamp(claw.cd + iy * 14 * dt, 0, Math.max(0, reach)); claw.shut = Math.max(0, claw.shut - dt * 3);
    if ((ix || iy) && a - claw.sentA > 0.25) { claw.sentA = a; game.net.send('sub', { e: 'claw', v: 0, x: claw.cx, y: claw.cd }); if (Math.floor(a * 6) % 2) SFX.whirr(); }
  } else if (claw.phase === 'close') {
    claw.shut = Math.min(1, (a - claw.t) / 0.4);
    if (claw.shut >= 1) {
      const tx = shown.x + claw.cx, ty = shown.y + claw.cd, fast = Math.hypot(shown.vx, shown.vy) > 12;
      const f = findsOf(s.n, isWinter()).find((q) => !((s.got >>> q.i) & 1) && onTip(q, tx, ty) && (q.kind !== 'pearl' || clamOpen(T)));
      if (!f) { claw.phase = 'free'; SFX.blip(); if (fast) toast('Too fast! The claw just swings about', 2000); else if (findsOf(s.n).some((q) => q.kind === 'pearl' && !((s.got >>> q.i) & 1) && onTip(q, tx, ty))) toast('The clam says no. Wait for it to open', 2500); return; }
      if (fast) { claw.phase = 'free'; toast('Too fast! Ask the helm to stop', 2000); return; }
      claw.phase = 'lift'; claw.t = a; claw.hold = f; claw.slipNow = claw.slipped !== f.i && Math.random() < 0.2; SFX.whirr();
      if (f.kind === 'chest') toast('It\'s heavy... the claw grinds and strains', 2500);
    }
  } else { // lifting it up to the bin
    const dur = claw.hold?.kind === 'chest' ? 2.4 : 1.2, u = (a - claw.t) / dur;
    claw.cd = Math.max(0, claw.cd - dt * (CLAW_REACH / dur));
    if (claw.slipNow && u > 0.5) { claw.slipped = claw.hold?.i ?? -1; claw.hold = null; claw.phase = 'free'; claw.shut = 0; SFX.nope(); toast('It slipped! This claw is ALSO rigged. Try again', 3000); return; }
    if (u >= 1 && claw.hold) {
      const f = claw.hold; claw.hold = null; claw.phase = 'free'; claw.shut = 0; claw.slipped = -1;
      game.net.send('sub', { e: 'grab', v: f.i }); gotGrab(game.net.selfId, f.i);
    }
  }
}
function gotGrab(id: string, i: number): void {
  const s = st(), f = findsOf(s.n, isWinter())[i]; if (!f || (s.got >>> i) & 1) return;
  change((q) => { q.got |= 1 << i; });
  SFX.clunk(); setTimeout(() => SFX.score(), 200);
  const who = id === game.net.selfId ? '' : (game.others.get(id)?.name ?? 'SOMEONE') + ' got ';
  toast((who ? who : 'TREASURE! ') + FIND_NAMES[f.kind] + (f.kind === 'bottle' ? ': "' + NOTES[f.note ?? 0] + '"' : ''), 4500);
  capn(f.kind === 'boot' ? ['THE OTHER BOOT! MARINA\'s going to cry'] : f.kind === 'bottle' ? ['A bottle! Read it out, read it out!'] : ['Treasure! In the bin!', 'Into the bin with it', 'Now THAT\'s a find']);
  if (f.kind === 'boot' && id === game.net.selfId) game.net.api.sub.boot().then((first) => { if (first) toast('THE OTHER BOOT goes to the aquarium, next to its partner, with your name on it!', 5000); }).catch(() => {});
  const m = MISSIONS[missionOf(s.n)].id;
  if ((m === 'bell' && f.kind === 'bell') || (m === 'duck' && f.kind === 'rduck') || (m === 'boot' && f.kind === 'boot') || (m === 'litter' && missionDone(st()))) missionToast();
  if (id === game.net.selfId) game.celebrate('joy');
}

// ---------------------------------------------------------------- the sea life, the octopus, the visitor ----------------------------------------------------------------
function lifeNow(T: number, s: DiveState): Sighting[] { return seaLife(T, s.n, { x: shown.x, y: shown.y, still }, lamps(s, T)); }
/** How long the baby octopus has been on the glass (-1: it isn't). */
function octoOn(T: number, s: DiveState): number { const k0 = octopusAt(s.n); if (k0 === null) return -1; const t0 = s.n * SUB_CYCLE + k0, u = T - t0; return u >= 0 && u < OCTO_S ? u : -1; }
/** The visitor on the hull right now: 0 none, 1 the seal, 2 the giant squid. */
function visitorOn(T: number, s: DiveState): number { return troublesOn(s, T).some((t) => t.kind === TR.VISITOR) ? s.vk : 0; }
let missionSaid = -1;
function missionToast(): void { const d = dive(); if (missionSaid === d.n) return; missionSaid = d.n; SFX.score(); SFX.jingleShort(); game.celebrate(); toast('MISSION COMPLETE: ' + MISSIONS[missionOf(d.n)].name + '! +3 tokens each when we surface', 5000); capn(['Mission complete! Knew you had it in you', 'That\'s the job done. Drinks on me. Tea, I mean']); }

// ---------------------------------------------------------------- every frame ----------------------------------------------------------------
export function subStep(dt: number): void {
  const inSub = game.room.id === 'sub' && game.playing && !game.switching;
  if (!inSub) { flying = null; SUBW.claw.busy = false; return; }
  const T = subT(), a = now(), d = dive(), s = st(), k = d.k;
  const c = game.R.cam; SUBW.view = { x0: c.x, x1: c.x + c.w };
  // you're crew if you're aboard when the hatch shuts (or you were, and stayed)
  if (k >= SUB_SHUT && k < SUB_UP) crewN = d.n;
  // the sub: where it is, smoothed (a correction glides, a big jump snaps)
  const target = motionNow(T, s), dT = Math.max(0, T - lastT); lastT = T;
  const jump = Math.hypot(target.x - shown.x, target.y - shown.y);
  if (jump > 80 || dT > 1 || k < SUB_DOWN || k >= HOME_IN) shown = { ...target }; else { const f = 1 - Math.exp(-dt * 10); shown = { x: shown.x + (target.x - shown.x) * f, y: shown.y + (target.y - shown.y) * f, vx: target.vx, vy: target.vy }; }
  still = Math.hypot(shown.vx, shown.vy) < 3 ? still + dt : 0;
  // at the helm: send where it is when the stick changes, and twice a second while it moves
  if (flying) {
    if (k >= SUB_HOME) { letGo(true); game.leaveSpot(); toast('That\'s the time! The Cap\'n\'s taking her home', 3000); }
    else if (Math.abs(stick.x - sent.sx) > 0.05 || Math.abs(stick.y - sent.sy) > 0.05 || (a - sent.t > 0.5 && Math.hypot(shown.vx, shown.vy) > 0.5) || a - sent.t > 2) { sent = { t: a, sx: stick.x, sy: stick.y }; const m = flying.m; game.net.send('helm', { x: m.x, y: m.y, vx: m.vx, vy: m.vy, sx: stick.x, sy: stick.y }); }
  }
  // the claw
  if (game.usingOf(game.me) === 'subclaw') { if (k >= SUB_HOME || troubleOn(TR.LIGHTS)) { clawOff(); game.leaveSpot(); } else clawStep(dt); }
  const clawAt = atSpot(SUBSPOT.CLAW);
  SUBW.claw = clawAt === game.net.selfId ? { cx: claw.cx, cd: claw.cd, shut: claw.shut, hold: claw.hold?.kind ?? null, busy: true } : clawAt && remoteClaw ? { cx: remoteClaw.cx, cd: remoteClaw.cd, shut: 0, hold: null, busy: true } : { cx: 0, cd: 0, shut: 0, hold: null, busy: false };
  // the skipper: a new dive's state, the snapshot every 3 s, the Cap'n's lights, the visitor arriving
  if (amSkipper()) {
    if (k >= SUB_DOWN && k < SUB_HOME) {
      if (SUBW.st?.n !== d.n || !lastShareN.has(d.n)) { lastShareN.add(d.n); share({ ...s, fx: [...s.fx] }); }
      if (now() - lastShare > 3 && game.others.size && !flying && !remote && auto) { share({ ...s, fx: [...s.fx], at: auto.t, x: auto.m.x, y: auto.m.y, vx: auto.m.vx, vy: auto.m.vy }); auto.base = auto.t; }
      if (!s.lt && shown.y > 260 && lampsSaid !== d.n) { lampsSaid = d.n; setLights(1, T); SFX.clunk(); capn(['Lights on. We\'re in the deep now', 'Floodlights! Let\'s see what\'s down here']); }
      const vt = troublesOf(d.n).find((t) => t.kind === TR.VISITOR);
      if (vt && !s.va && k >= vt.k && k < 400) { // (the seal comes to the shallows, the squid to the lights in the deep; and late on, one comes regardless, so FIX EVERY FAULT can always be done)
        const late = k >= 385, vk = shown.y < 200 || (late && shown.y <= 400) ? 1 : shown.y > 400 && (lamps(s, T).on || late) ? 2 : 0;
        if (vk) change((q) => { q.va = T; q.vk = vk; });
      }
    }
  }
  // what's happening, for everyone aboard: the troubles starting, the Cap'n seeing to them, the zones, the whale, the octopus
  const S2 = st();
  for (const t of troublesOf(d.n)) {
    const s0 = troubleStart(S2, t); if (!s0 || T < s0) continue;
    const key = d.n + ':' + t.i, fixedBy = S2.fx[t.i] && S2.fx[t.i] < s0 + CAPN_FIXES ? 'crew' : T >= s0 + CAPN_FIXES ? 'cap' : '';
    if (!troubleSeen.has(key) && T - s0 < 10 && !fixedBy) { troubleSeen.add(key); troubleStarts(t.kind, S2.vk); }
    if (fixedBy === 'cap' && !troubleSeen.has(key + 'c')) { troubleSeen.add(key + 'c'); troubleSeen.add(key); if (T - (s0 + CAPN_FIXES) < 5) { capn(['Do I have to do everything myself?', 'Sorted it. You\'re welcome']); SFX.clunk(); } }
  }
  if (k >= SUB_DOWN && k < SUB_HOME) {
    const z = zoneAt(shown.x); if (z !== zoneSeen) { const first = zoneSeen === ''; zoneSeen = z; if (!first) zoneLine(z); }
    const w = whaleAt(d.n, k); if (w && whaleSaid !== d.n && Math.abs(w.x - shown.x) < 420) { whaleSaid = d.n; SFX.whale(); capn(['Mind the whale. Everyone mind the whale', 'THERE SHE BLOWS! Well. There she swims']); toast('Whale song... something big is out there', 3000); }
    const oc = octoOn(T, S2); if (oc >= 0 && octoSaid !== d.n && octoSaid !== -2) { octoSaid = d.n; SFX.blub(); capn(['We\'ve got a passenger! On the glass!', 'Well hello, little one']); toast('A BABY OCTOPUS has stuck itself to the window! Quick, SNAP it', 4000); }
  }
  if (k >= SUB_HOME && k < SUB_UP && homeSaid !== d.n) { homeSaid = d.n; SFX.foghorn(); capn(['That\'s the time! Hold on to your hats, full speed home!']); }
  if (k >= SUB_SHUT && k < SUB_DOWN && saidKey !== d.n + 'dive') { saidKey = d.n + 'dive'; capn(['Dive, dive, dive!', 'Is the hatch shut? The hatch is shut']); SFX.clang(); setTimeout(() => SFX.gurgle(), 500); if (crewN === d.n) toast('DIVE, DIVE! Today\'s mission: ' + MISSIONS[missionOf(d.n)].text, 6000); }
  // the dive's over: the report, the pay, the quest, the stowaway
  if (k >= SUB_UP && crewN === d.n && reportedN !== d.n) { reportedN = d.n; diveOver(d.n); }
  // the window, the screens, the sounds
  drawState(T, a, S2, k, dt);
}
const lastShareN = new Set<number>();
function troubleStarts(kind: number, vk: number): void {
  SUBW.shake = kind === TR.VISITOR && vk === 2 ? 0.5 : 0.25; setTimeout(() => { SUBW.shake = 0; }, 700);
  if (kind === TR.LEAK) { SFX.hiss(); toast('LEAK! Water\'s coming in: turn the red VALVE WHEEL', 4000); capn(['Leak! The red wheel!', 'We\'re springing a leak! Valve! VALVE!']); }
  else if (kind === TR.VISITOR) { if (vk === 2) { SFX.splat(); SFX.siren(); toast('THE GIANT SQUID has grabbed the hull! Photograph it, then hit ZAP', 5000); capn(['SQUID! Picture first, then ZAP it!']); } else { SFX.knock(); toast('Knock knock. A curious seal is squashing its face on the window. It wants its photo taken', 5000); capn(['It\'s a seal. He wants his photo taken', 'Oh, it\'s HIM again']); } }
  else if (kind === TR.LIGHTS) { SFX.boom(); toast('LIGHTS OUT! The fuse blew: flip the lever on the FUSE BOX', 4000); capn(['Fuse! The box by the claw!', 'Who touched the kettle AND the floodlights?']); }
  else { SFX.cough(); toast('JELLY IN THE INTAKE! The engine\'s coughing: pull the INTAKE lever on the engine', 4000); capn(['Jelly in the intake! Gently!', 'She won\'t steer! Something\'s in the intake']); }
}
function zoneLine(z: string): void {
  const L: Record<string, string[]> = {
    harbour: ['Mind the Pier\'s legs. And the trolley. Who throws a TROLLEY in the sea?'], kelp: ['Kelp forest, off the starboard side!', 'Seahorses hide in here. Try the sonar'],
    reef: ['The reef! Look, don\'t bump', 'Something in that rock is looking at us'], wreck: ['The LUCKY HERRING. Not so lucky', 'Someone lives in that wreck. Shine a light in'],
    dropoff: ['Here\'s the drop-off. Hold on to something', 'Lights off down there and wait... sometimes the dark lights up'], trench: ['The trench. The very bottom of the sea', 'Lights off a moment... look at that'],
  };
  capn(L[z] ?? []);
}
/** THE DIVE REPORT, and the pay (the server checks the time: just after it surfaces, once a dive, 24 a day). */
function diveOver(n: number): void {
  const s = st(), finds = popcount(s.got), done = missionDone(s), kinds = popcount(s.kinds);
  quests.bump('dive'); quests.stat('dives');
  if (s.oct && save.unlock('pet:9')) setTimeout(() => { SFX.blub(); SFX.score(); game.celebrate(); toast('The BABY OCTOPUS followed you home! It\'s your pet now (Look menu)', 6000); capn(['Looks like we\'ve got a stowaway']); }, 3500);
  capn(['Home sweet pen. Mind the gap on the way out', 'Another dive, and nobody lost. Good crew']);
  showReport({ n, kinds, finds, mission: MISSIONS[missionOf(n)].name, done, bin: SUBW.bin.slice(), pay: divePay(finds, done) });
  SFX.jingleShort();
  game.net.api.sub.pay(finds, done).then((r) => { if (r.paid) { game.setTokens(r.tokens); game.floatText('+' + r.paid); setTimeout(() => toast('Pay: +' + r.paid + (r.paid === 1 ? ' token' : ' tokens'), 3000), 1500); } }).catch((e: unknown) => console.warn('[dive pay]', e));
}

// ---------------------------------------------------------------- what the cabin shows ----------------------------------------------------------------
function drawState(T: number, a: number, s: DiveState, k: number, dt: number): void {
  const d = dive(), day = dayness(), L = lamps(s, T), dark = !L.on && troubleOn(TR.LIGHTS, T);
  SUBW.depth = k >= SUB_DOWN && k < HOME_IN ? Math.max(0, shown.y) : 0;
  SUBW.lamps = L.on; SUBW.lightsOut = dark; SUBW.auto = !atSpot(SUBSPOT.HELM); SUBW.speed = k >= SUB_DOWN && k < HOME_IN ? shown.vx : 0; SUBW.tilt = shown.vy;
  SUBW.wheel = (SUBW.wheel + (flying ? stick.x : remote ? remote.sx : 0) * 0.06) % (Math.PI * 2);
  const on = troublesOn(s, T); SUBW.fixing = [0, 1, 2, 3].map((kk) => on.some((t) => t.kind === kk));
  SUBW.leak = clamp(SUBW.leak + (SUBW.fixing[TR.LEAK] ? 0.15 : -0.3) * dt, 0, 1); SUBW.jelly = SUBW.fixing[TR.JELLY];
  if (visitorOn(T, s) === 2) SUBW.shake = Math.max(SUBW.shake, 0.15);
  SUBW.nav = { u: clamp(shown.x / 3400, 0, 1), v: clamp(shown.y / 1200, 0, 1) };
  SUBW.bin = findsOf(s.n, isWinter()).filter((f) => (s.got >>> f.i) & 1).map((f) => f.kind);
  const sun = sunAt(Math.max(0, SUBW.depth), day); SUBW.light = k < SUB_DOWN || k >= HOME_IN ? 0.4 : clamp(sun * 1.3, 0, 1);
  SUBW.lightCol = SUBW.depth < 60 ? [90, 190, 184] : SUBW.depth < 250 ? [50, 120, 180] : [30, 60, 110];
  // the dive board
  const mis = MISSIONS[missionOf(d.n)], prog = missionProgress(s);
  SUBW.board = k < SUB_DOWN ? ['DOCKED', 'DIVE ' + mmss(Math.max(0, SUB_DOWN - k)), 'MISSION:', mis.short]
    : k >= SUB_HOME ? ['HOME', mmss(Math.max(0, SUB_CYCLE - k)), 'FINDS ' + popcount(s.got), missionDone(s) ? 'MISSION OK!' : '']
    : [Math.round(SUBW.depth) + ' M', mmss(SUB_HOME - k) + ' LEFT', mis.short, missionDone(s) ? 'DONE!' : prog ? prog.replace('/', ' OF ') : 'FINDS ' + popcount(s.got)];
  // the window: the pen (docked, going down, coming up) or the sea
  const glass = SUBW.glass; glass.a = a; glass.flash = a - flashA; glass.ping = a - pingA; glass.lightsOut = dark;
  glass.seal = visitorOn(T, s) === 1 ? T - s.va : -1; glass.squid = visitorOn(T, s) === 2 ? T - s.va : -1; glass.octo = s.oct ? -1 : octoOn(T, s);
  glass.wet = k >= SUB_UP ? clamp((SUB_CYCLE - k) / 10, 0, 1) : k < 3 ? 0.5 : 0; glass.ghost = false;
  if (k < SUB_DOWN || k >= HOME_IN) {
    const wl = k < SUB_BOARD ? 360 + Math.sin(a * 1.4) : k < SUB_BOARD + 6 ? 360 - (k - SUB_BOARD) / 6 * 60 : k < SUB_DOWN ? 290 : k < SUB_UP ? 290 : 290 + (k - SUB_UP) / 10 * 70;
    const slide = k >= SUB_BOARD + 6 && k < SUB_DOWN ? (k - SUB_BOARD - 6) / 4 * 64 : k >= HOME_IN && k < SUB_UP ? 64 * (1 - (k - HOME_IN) / 4) : 0;
    const gate = k >= SUB_DOWN - 2 && k < SUB_DOWN ? (k - (SUB_DOWN - 2)) / 2 : k >= HOME_IN && k < HOME_IN + 2 ? 1 - (k - HOME_IN) / 2 : 0;
    SUBW.pen = { a, day, wl, slide, gate, boil: (k >= SUB_BOARD && k < SUB_DOWN) || (k >= SUB_UP && k < SUB_CYCLE - 3) ? 1 : 0 }; SUBW.sea = null;
  } else {
    const wx = weather();
    SUBW.sea = { x: shown.x, y: shown.y, vx: shown.vx, vy: shown.vy, T, n: s.n, day, a, lamps: L.on, lampT: s.lt, life: lifeNow(T, s), finds: findsOf(s.n, isWinter()), got: s.got, ping, buoys: MISSIONS[missionOf(s.n)].id === 'reef' ? buoysOf(s.n) : [], mapped: s.m & 7, rain: wx.kind === 'rain' || wx.kind === 'storm', flashK: wx.kind === 'storm' ? stormBolt().f * clamp(1 - shown.y / 120, 0, 1) : 0, snow: wx.kind === 'snow', halloween: isHalloween(), winter: isWinter() };
    SUBW.pen = null;
  }
  // the claw cam strip, while you're at the claw
  clawCam(game.usingOf(game.me) === 'subclaw' && SUBW.sea ? SUBW.sea : null);
  // sounds: the engine's putter
  if (k >= SUB_DOWN && k < HOME_IN && a - putterA > Math.max(0.18, 0.6 - Math.abs(shown.vx) * 0.008)) { putterA = a; SFX.putter(); }
  if (SUBW.depth > 500 && a - creakA > 9 + Math.random() * 8) { creakA = a; SFX.creak(); if (Math.random() < 0.3) { toast('*ping* A rivet pops out of the wall and bounces across the deck. Probably fine', 3000); SFX.rivet(); } }
}
let putterA = 0, creakA = 0;
let camEl: HTMLCanvasElement | null = null;
function clawCam(v: SeaView | null): void {
  if (!v) { if (camEl) camEl.style.display = 'none'; return; }
  if (!camEl) { camEl = document.createElement('canvas'); camEl.width = 240; camEl.height = 140; camEl.id = 'clawcam'; document.querySelector('#bar')?.prepend(camEl); }
  camEl.style.display = '';
  drawClawCam(camEl, { v, cx: claw.cx, cd: claw.cd, shut: claw.shut, hold: claw.hold?.kind ?? null });
}

// ---------------------------------------------------------------- the network ----------------------------------------------------------------
/** Something done aboard by someone else. */
export function onSub(id: string, m: SubMsg): void {
  if (game.room.id !== 'sub') return;
  const T = subT();
  switch (m.e) {
    case 'snap': gotSnap(id, m.v); break;
    case 'ping': if (m.x !== undefined && m.y !== undefined) { gotPing(m.x, m.y); SFX.ping(); } break;
    case 'grab': gotGrab(id, m.v); break;
    case 'fix': gotFix(m.v, T); if (troublesOf(st().n)[m.v]?.kind === TR.VISITOR) { SFX.zap(); SUBW.zap = 1; setTimeout(() => { SUBW.zap = 0; }, 800); } break;
    case 'lights': setLights(m.v, T); SFX.clunk(); break;
    case 'tea': gotTea(m.v); break;
    case 'horn': SFX.foghorn(); hornHeard(); break;
    case 'claw': remoteClaw = { cx: clamp(m.x ?? 0, -CLAW_SLIDE, CLAW_SLIDE), cd: clamp(m.y ?? 0, 0, CLAW_REACH), t: now() }; break;
    case 'bonk': if (m.x !== undefined && m.y !== undefined) { onBonk(m.x, m.y); SFX.bonk(); } break;
  }
}
/** The top banner aboard (and in the pen while it boards). */
export function subLine(): string {
  const d = dive(), id = game.room.id;
  if (id === 'sub') {
    const s = SUBW.st && SUBW.st.n === d.n ? SUBW.st : null, mis = MISSIONS[missionOf(d.n)];
    if (d.k < SUB_SHUT) return 'SARDINE 1 · BOARDING · DIVES IN ' + mmss(SUB_DOWN - d.k) + ' · TODAY\'S MISSION: ' + mis.name;
    if (d.k < SUB_DOWN) return 'SARDINE 1 · DIVE, DIVE!';
    if (d.k >= SUB_UP) return 'SARDINE 1 · SURFACING...';
    if (d.k >= SUB_HOME) return 'SARDINE 1 · FULL SPEED HOME · BACK IN ' + mmss(SUB_UP - d.k);
    const prog = s ? missionProgress(s) : '';
    return 'SARDINE 1 · ' + Math.round(shown.y) + ' M · ' + zoneName(shown.x) + ' · ' + mmss(SUB_HOME - d.k) + ' LEFT · ' + mis.name + (s && missionDone(s) ? ' ✓' : prog ? ' ' + prog : '') + ' · FINDS ' + (s ? popcount(s.got) : 0);
  }
  return '';
}
/** For the debug hook. */
export const subDebug = () => ({ dive: dive(), st: SUBW.st, shown: { ...shown }, flying: !!flying, remote: remote ? { id: remote.id, sx: remote.sx } : null, crewN, skipper: amSkipper(), claw: { ...claw, hold: claw.hold?.kind ?? null }, sea: save.data.sea, board: SUBW.board, ping, bin: SUBW.bin, lamps: SUBW.lamps, lightsOut: SUBW.lightsOut, fixing: SUBW.fixing, depth: SUBW.depth });
/** Tests: fly to (x, y) at once (you must be at the helm), and look at what a photo would get. */
export function subTeleport(x: number, y: number): void { const T = subT(); if (flying) flying = { m: { x, y, vx: 0, vy: 0 }, t: T }; else resumeAuto({ x, y, vx: 0, vy: 0 }, T); shown = { x, y, vx: 0, vy: 0 }; }
export const subPeek = (): string[] => { const s = st(), bits = kindsNow(subT(), s); return LOG.filter((_, i) => (bits >>> i) & 1).map((c) => c.id); };
