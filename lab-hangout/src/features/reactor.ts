// THE REACTOR, the playing part (game/reactor.ts runs the numbers, world/reactor.ts draws it, 0021_reactor.sql pays):
// clocking in, working the stations (1 / 2 or the pad at RODS, COOLANT, TURBINE; E twice at SCRAM: the cover, then the
// button), fixing faults on the floor, the shift's host applying everyone's moves and re-sending the snapshot, handing
// over when the host walks out, alarms, the meltdown, the end of a shift, and telling the city (the lobby's 'grid').

import { game, now, narrow } from '../app/game';
import { daynessAt } from '../world/plaza';
import { REACT, RXL, reactorNow } from '../world/reactor';
import { ENV } from '../entities/avatar';
import { GRID, meltGlow } from '../world/grid';
import { FAULT_FIX, FAULT_NAMES, FIX_ST, RST, SHIFT_S, act, faults, grid, live, running, newShift, surges, verdict, advance, broken, powerOf, demand, type ReactorState } from '../game/reactor';
import type { GridMsg } from '../net/transport';
import type { RoomId } from '../world/room';
import { quests } from '../game/quests';
import { save } from '../game/save';
import { mmss } from '../engine/format';
import { say, toast } from '../ui/overlay';
import { SFX } from '../audio/sfx';

/** The Science Wing's rooms (everyone in them glows green after a meltdown). */
export const WING_ROOMS: RoomId[] = ['wing', 'reactor'];
const CHIEF = 'npc-rod';
let since = 0, hostGone = 0, lastSent = 0, seenKey = '', faultSeen = -1, surgeSeen = -1, meltHeard = 0, alarmAt = 0, gridSent = '';
const paid = new Set<number>();
/** You just walked into the reactor: wait a moment for the others to catch you up before acting as the host. */
export function reactorEntered(): void { since = now(); SFX.hiss(); SFX.clunk(); }
const settled = (): boolean => now() - since > 1.5;
const chief = (lines: string[]): void => { if (game.room.id === 'reactor') say(CHIEF, lines[Math.floor(Math.random() * lines.length)], now(), false); };

/** Tell the whole server what the reactor's doing (the Square's sign, its lights, the map). */
function tellCity(k: GridMsg['k'], g: ReactorState): void {
  const key = g.t0 + ':' + k; if (gridSent === key) return; gridSent = key;
  const m: GridMsg = k === 'on' ? { k, until: g.t0 + SHIFT_S * 1000 } : k === 'melt' ? { k, at: g.melt } : { k };
  game.net.send('grid', m); onGrid(m);
}
/** The lobby says: a shift is on / melted down / over. */
export function onGrid(m: GridMsg): void {
  if (m.k === 'on' && m.until) GRID.until = Math.min(m.until, Date.now() + SHIFT_S * 1000 + 5000);
  else if (m.k === 'melt' && m.at && Math.abs(Date.now() - m.at) < 120000) { GRID.melt = m.at; GRID.until = 0; }
  else if (m.k === 'off') GRID.until = 0;
}

export function reactorClockIn(): void {
  if (!settled()) return;
  if (live(REACT.g)) { toast('A shift is already on: grab a station and help out!'); return; }
  const crew = 1 + [...game.others.keys()].filter((id) => !id.startsWith('bot-')).length;
  const g = newShift(game.net.selfId, game.me.name, crew);
  game.setState({ k: 'reactor', v: g }); tellCity('on', g);
  SFX.clunk(); SFX.dingdong(); toast('SHIFT STARTED! Raise the RODS and the TURBINE until MAKING matches NEED on the big board. Keep the HEAT out of the red', 6000);
  chief(['Right! Rods, coolant, turbine. Keep it in the green!', 'Here we go. Watch the heat!']);
}
/** Work station `st` (d = -1 down / +1 up), or fix a fault (FIX_ST + kind). The host applies it; everyone else asks. */
export function reactorPress(st: number, d: number): void {
  const g = REACT.g;
  if (!live(g)) { toast('No shift on: START SHIFT is on the clipboard by the door'); SFX.blip(); return; }
  if (!settled()) return;
  const T = Date.now(), res = act(reactorNow(T) ?? g, game.net.selfId, game.me.name, st, d, T, daynessAt);
  if ('err' in res) { toast(res.err, 2000); SFX.nope(); return; }
  toast(res.msg, 1800);
  if (st === RST.SCRAM) { SFX.clunk(); SFX.whoosh(); } else if (st >= FIX_ST) { SFX.score(); if (st - FIX_ST === 2) SFX.flap(); } else if (st === RST.RODS) SFX.clack(); else if (st === RST.TURB) SFX.squeak(); else SFX.zap();
  if (g.host === game.net.selfId) { game.setState({ k: 'reactor', v: res.g }); lastSent = T; }
  else game.net.send('rx', { st, d });
}
/** E at the SCRAM console: the first press lifts the cover, the second (within 3 s) hits the button. */
export function scramPress(): void {
  if (!live(REACT.g)) { toast('No shift on. (The button is armed during a shift)'); return; }
  if (Date.now() - REACT.cover < 3000) { REACT.cover = 0; reactorPress(RST.SCRAM, 0); return; }
  REACT.cover = Date.now(); SFX.blip(); toast('Cover up! Press again to SCRAM (it slams the rods in)', 2500);
}
/** E at a fault spot on the floor. */
export function faultPress(kind: number): void {
  const g = reactorNow();
  if (!g || !live(g) || !broken(g, kind, Date.now())) { toast(['Pipes look fine.', 'The valve turns fine.', 'No pigeons. For now.', 'The breaker is on.', 'The floor is clean. Ish.'][kind]); SFX.blip(); return; }
  reactorPress(FIX_ST + kind, 0);
}
/** What E says at a fault spot right now. */
export function faultLabel(kind: number): string { const g = reactorNow(); return g && live(g) && broken(g, kind, Date.now()) ? FAULT_FIX[kind] : 'CHECK'; }
/** Someone else worked a station: if it's your shift, apply it. */
export function onRx(id: string, name: string, st: number, d: number): void {
  const g = REACT.g; if (!g || g.host !== game.net.selfId || !live(g)) return;
  const T = Date.now(), res = act(reactorNow(T) ?? g, id, name, st, d, T, daynessAt);
  if ('g' in res) { game.setState({ k: 'reactor', v: res.g }); lastSent = T; if (st >= FIX_ST) SFX.score(); }
}
/** Walking out mid-shift as its host: hand the reactor to someone still here. */
export function leaveReactor(): void {
  const g = REACT.g;
  if (g && live(g) && g.host === game.net.selfId) { const next = g.ids.find((id) => id !== game.net.selfId && game.others.has(id)) ?? [...game.others.keys()].find((id) => !id.startsWith('bot-')); if (next) game.setState({ k: 'reactor', v: { ...(reactorNow() ?? g), host: next } }); }
}

/** Every frame. */
export function reactorStep(dt: number): void {
  ENV.suitX = game.room.id === 'reactor' ? RXL.glass : null; ENV.glow = wingGlow(); // suits on past the glass; glowing after a meltdown
  // at a station the camera frames the big board: on a phone (too narrow for all of it) the part over your console
  if (game.room.id === 'reactor' && game.room.watch) { const sp = game.me.use >= 0 ? game.room.spots[game.me.use] : null; game.room.watch.x = narrow() && sp ? sp.x : 386; }
  const T = Date.now(), inR = game.room.id === 'reactor' && game.playing && !game.switching;
  const g = REACT.g, cur = inR ? reactorNow(T) : null, on = !!cur && running(cur, T);
  // what the city knows, from here
  if (inR && g) { if (on) GRID.until = g.t0 + SHIFT_S * 1000; else if (!cur?.melt) GRID.until = 0; if (cur?.melt) GRID.melt = cur.melt; }
  if (!inR || !g || !cur) return;
  if (!settled()) return;
  const host = g.host === game.net.selfId;
  // the host walked out: the first engineer still here takes over
  if (on && !host && !game.others.has(g.host)) {
    hostGone += dt;
    const here = [...g.ids, game.net.selfId].filter((id) => id === game.net.selfId || game.others.has(id)).sort();
    if (hostGone > 3 && here[0] === game.net.selfId) { hostGone = 0; game.setState({ k: 'reactor', v: { ...cur, host: game.net.selfId } }); toast('The shift lead left: you\'re running the reactor now!', 3000); }
  } else hostGone = 0;
  // the host keeps everyone's copy fresh (a new snapshot every few seconds), and makes a meltdown final
  if (host && on && T - lastSent > 3000 && game.others.size && t0ok(g)) { lastSent = T; game.setState({ k: 'reactor', v: cur }); }
  if (host && cur.melt && !g.melt) { game.setState({ k: 'reactor', v: cur }); tellCity('melt', cur); }
  if (host && !on && !cur.melt && T >= g.t0 + SHIFT_S * 1000 && T - (g.t0 + SHIFT_S * 1000) < 30000) tellCity('off', g);
  // events for everyone in the room: new faults, surges, alarms, the meltdown, the end
  const key = g.t0 + ':' + (on ? 'on' : 'over');
  if (key !== seenKey) { const first = seenKey === ''; seenKey = key; faultSeen = -1; surgeSeen = -1; if (!on && !first) shiftOver(g); }
  if (on) {
    const open = faults(cur).filter((f) => f.at <= T && cur.fixed[f.i] === 0), newest = open.length ? Math.max(...open.map((f) => f.i)) : -1;
    if (faultSeen === -1) faultSeen = newest; else if (newest > faultSeen) { faultSeen = newest; const f = open.find((q) => q.i === newest)!; SFX.siren(); toast(FAULT_NAMES[f.kind] + ' on the reactor floor! Go past the glass and ' + FAULT_FIX[f.kind].toLowerCase().replace('!', ''), 3500); chief([['Leak on the floor!', 'Steam! Somebody patch that pipe!'], ['The turbine valve is stuck!', 'Valve\'s jammed! Get out there!'], ['Gerald\'s back!', 'Is that... a pigeon in the vent?!'], ['Breaker tripped! No power to the pumps!'], ['Goo on the walkway. Mind your step.']][f.kind]); }
    const sg = surges(cur).findIndex((s) => T >= s.at && T < s.at + s.dur);
    if (sg >= 0 && sg !== surgeSeen) { surgeSeen = sg; SFX.chime(); toast('SURGE! ' + surges(cur)[sg].text + ': the city wants more power', 3500); }
    if (cur.heat >= 85 && T - alarmAt > (cur.heat >= 97 ? 700 : 1400)) { alarmAt = T; if (cur.heat >= 97) SFX.siren(); else SFX.beep(); if (Math.random() < 0.15) chief(['Watch the heat!', 'She\'s running hot!', 'Rods in! Rods in!']); }
  }
  if (cur.melt && meltHeard !== cur.melt) { meltHeard = cur.melt; if (T - cur.melt < 5000) { SFX.siren(); SFX.boom(); setTimeout(() => SFX.splash(), 600); toast('MELTDOWN! BLORP. Everyone in the Science Wing is glowing now', 5000); chief(['Well. That\'s one for the logbook.']); } }
}
const t0ok = (g: ReactorState): boolean => Date.now() >= g.t0; // (a shift that hasn't started for us yet isn't re-sent)

/** The shift ended: the result, pay, the quest, the suit, the best-shift board. */
function shiftOver(g: ReactorState): void {
  if (paid.has(g.t0)) return;
  const end = g.melt || g.t0 + SHIFT_S * 1000; if (Date.now() - end > 60000) return;
  const fin = advance(reactorNow() ?? g, end, daynessAt), sc = grid(fin), melted = !!fin.melt;
  REACT.last = { grid: sc, melt: melted, at: Date.now() };
  if (!g.ids.includes(game.net.selfId)) return; // (watching isn't working)
  paid.add(g.t0);
  SFX[melted ? 'cry' : sc >= 75 ? 'score' : 'leave'](); toast('SHIFT OVER! GRID ' + sc + '% · ' + fin.fixes + (fin.fixes === 1 ? ' fault' : ' faults') + ' fixed · ' + verdict(sc, melted), 5500);
  if (!melted) chief(sc >= 90 ? ['Textbook! The whole city\'s lit up!'] : sc >= 75 ? ['Nice and steady. Good shift.'] : ['We\'ll get it next time.']);
  quests.bump('reactor');
  if (sc > (save.data.stats.reactorBest ?? 0)) { save.update((d) => { d.stats.reactorBest = sc; }); quests.checkBadges(); }
  if (!melted && sc >= 80 && save.unlock('fit:10')) setTimeout(() => { toast('You earned the HAZMAT SUIT! Wear it from Look', 5000); SFX.score(); }, 2500);
  if (g.host === game.net.selfId && sc > (REACT.best?.score ?? 0)) game.setState({ k: 'reactbest', v: { name: fin.names.slice(0, 2).join(' & ').slice(0, 16), score: sc } });
  if (sc > 0) game.net.api.tips.reactor(sc).then((r) => { if (r.paid) { game.setTokens(r.tokens); setTimeout(() => toast('Pay: +' + r.paid + (r.paid === 1 ? ' token' : ' tokens'), 3000), 5800); } }).catch((e: unknown) => console.warn('[reactor pay]', e));
}

/** The top banner in the Science Wing during a shift. */
export function reactorLine(): string {
  if (game.room.id !== 'reactor' && game.room.id !== 'wing') return '';
  const g = game.room.id === 'reactor' ? reactorNow() : null;
  if (g && live(g)) { const T = Date.now(); return 'REACTOR SHIFT · ' + mmss((g.t0 + SHIFT_S * 1000 - T) / 1000) + ' · GRID ' + grid(g) + '% · HEAT ' + Math.round(g.heat) + '% · MAKING ' + Math.round(powerOf(g.heat, g.turb)) + ' / NEED ' + Math.round(demand(g, T, daynessAt(T))) + ' MW'; }
  if (game.room.id === 'wing' && Date.now() < GRID.until) return 'A REACTOR SHIFT IS ON · ' + mmss((GRID.until - Date.now()) / 1000) + ' LEFT';
  return '';
}
/** How hot the reactor's music should run (0 calm .. 1 critical), or -1 when it shouldn't play. */
export function reactorHeat(): number { if (game.room.id !== 'reactor') return -1; const g = reactorNow(); return g && live(g) ? Math.min(1, g.heat / 100) : 0; }
/** How green everyone glows here (after a meltdown). */
export const wingGlow = (): number => (WING_ROOMS.includes(game.room.id) ? meltGlow() : 0);
/** For the debug hook. */
export const reactorDebug = () => ({ g: REACT.g, now: reactorNow(), grid: GRID, best: REACT.best, last: REACT.last });
