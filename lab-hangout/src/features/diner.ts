// THE DINER, the playing part (game/diner.ts runs the kitchen, world/diner.ts draws it, ui/tickets.ts shows the
// orders, 0012_diner.sql pays the tips): clocking in, cooking at the stations (the shift's host applies everyone's
// moves), handing over when the host walks out, the end of a shift, and COOKIE's tour for first-timers (a private
// practice kitchen: game/dinertour.ts).

import { game, now } from '../app/game';
import { Gd, arrowDown } from '../engine/pixel';
import { clamp } from '../engine/math';
import { quests } from '../game/quests';
import { DINER, DINER_SPOTS } from '../world/diner';
import { TOUR, BURNT, isBurnt, retryStep, type TourStep } from '../game/dinertour';
import { ST, cookAct, live as shiftLive, newShift, practiceShift, verdict, SHIFT_S, openTickets, missed, score, shiftEnd, type DinerState } from '../game/diner';
import { syncTickets } from '../ui/tickets';
import { mmss } from '../engine/format';
import { save } from '../game/save';
import { isKitchen } from '../entities/avatar';
import { say, toast } from '../ui/overlay';
import { SFX } from '../audio/sfx';

// ---------- the Diner (game/diner.ts, world/diner.ts) ----------
/** When you walked into the Diner: wait for the others to catch you up before acting as the shift's host. */
let dinerSince = 0;
/** You just walked into the Diner: wait a moment for the others to catch you up before acting as the shift's host. */
export function dinerEntered(): void { dinerSince = now(); }
export const settled = (): boolean => now() - dinerSince > 1.5;
/** predictUntil: don't copy your hand from the shift state until the host has had time to answer. */
let predictUntil = 0, hostGone = 0, shiftSeen = '', lastDone = 0, lastMissed = 0, lastOpen = 0;
const tipped = new Set<number>();
/** Walking out mid-shift: put down what you're carrying, and hand the kitchen to a cook who's still here. */
export function leaveKitchen(): void {
  const g = DINER.g;
  if (isKitchen(game.me.hold)) { cook(ST.BIN, true); game.me.hold = 0; }
  if (g && shiftLive(DINER.g) && DINER.g!.host === game.net.selfId) { const next = DINER.g!.ids.find((id) => id !== game.net.selfId && game.others.has(id)); if (next) game.setState({ k: 'diner', v: { ...DINER.g!, host: next } }); }
}
export function clockIn(): void {
  if (!settled()) return;
  if (tour && tour.step < TOUR.length - 1) { toast('Finish the tour with COOKIE first (or SKIP TOUR)'); return; }
  if (tour) endTour(true);
  if (shiftLive(DINER.g)) { toast('A shift is already on: grab a station and help out!'); return; }
  const cooks = 1 + [...game.others.keys()].filter((id) => !id.startsWith('bot-')).length;
  game.setState({ k: 'diner', v: newShift(game.net.selfId, game.me.name, cooks) });
  SFX.dingdong(); toast('SHIFT STARTED! Orders coming in. Patties are in the FRIDGE', 4000);
}
/** The kitchen's sound for pressing E at station st (your hands already updated); `cheer` = the tour's extra fanfare for an order up. */
function cookSound(st: number, ticket: boolean, cheer = false): void {
  if (st === ST.GRILL || st === ST.FRYER) { if (!game.me.hold) SFX.sizzle(); else SFX.blip(); }
  else if (st === ST.PASS) { if (ticket) { SFX.bell(); if (cheer) SFX.score(); } else SFX.chime(); }
  else if (st === ST.SHAKE) SFX.zap(); else SFX.pop();
}
/** Press E at kitchen station `st`: the host applies it, everyone else asks the host. */
export function cook(st: number, quiet = false): void {
  if (tour) { tourCook(st); return; }
  const g = DINER.g;
  if (!shiftLive(g)) { if (!quiet) toast('Clock in first: the time clock is by the kitchen door'); return; }
  if (!settled()) return;
  const res = cookAct(g, game.net.selfId, game.me.name, st);
  if ('err' in res) { if (!quiet) { toast(res.err, 1800); SFX.blip(); } return; }
  if (!quiet) toast(res.msg, 1800);
  const k = res.g.ids.indexOf(game.net.selfId);
  game.me.hold = res.g.hands[k] ?? 0; game.sendMe(); predictUntil = now() + 0.8;
  cookSound(st, !!res.ticket);
  if (g.host === game.net.selfId) game.setState({ k: 'diner', v: res.g }); else game.net.send('cook', { st });
}
export function dinerStep(dt: number, t: number): void {
  const g = DINER.g, inDiner = game.room.id === 'diner' && game.playing && !game.switching, on = inDiner && shiftLive(g); // (not while walking out: the tour mustn't start mid-fade and follow you)
  game.npcs.away.clear(); if (on) game.npcs.away.add('npc-cookie');
  syncTickets(tour ? tour.g : on ? g : null);
  if (inDiner && settled()) tourStep();
  if (tour) return;
  if (!inDiner || !g) { if (isKitchen(game.me.hold) && game.room.id !== 'diner') { game.me.hold = 0; game.sendMe(); } return; }
  if (!settled()) return;
  // the host walked out: the first cook still here (by id) takes over
  if (on && g.host !== game.net.selfId && !game.others.has(g.host)) {
    hostGone += dt;
    const here = g.ids.filter((id) => id === game.net.selfId || game.others.has(id)).sort();
    if (hostGone > 3 && here[0] === game.net.selfId) { hostGone = 0; game.setState({ k: 'diner', v: { ...g, host: game.net.selfId } }); toast('The shift boss left: you are running the kitchen now!', 3000); }
  } else hostGone = 0;
  // your hands are whatever the shift says (after a moment for the host to answer)
  const k = g.ids.indexOf(game.net.selfId), want = on && k >= 0 ? g.hands[k] : 0;
  if (t > predictUntil && game.me.hold !== want && (isKitchen(game.me.hold) || isKitchen(want))) { game.me.hold = want; game.sendMe(); }
  // sounds for everyone in the kitchen: a new ticket, an order up, a missed one
  const key = g.t0 + ':' + (on ? 'on' : 'over'), miss = missed(g);
  if (key !== shiftSeen) { const first = shiftSeen === ''; shiftSeen = key; lastDone = g.done; lastMissed = miss; lastOpen = 0; if (!on && !first && Date.now() >= shiftEnd(g)) shiftOver(g); }
  if (on) {
    const open = openTickets(g).length;
    if (open > lastOpen) SFX.dingdong();
    lastOpen = open;
    if (g.done > lastDone && g.host !== game.net.selfId) SFX.bell();
    if (miss > lastMissed) { SFX.hurt(); toast('A customer gave up waiting! -5', 2000); }
    lastDone = g.done; lastMissed = miss;
  }
}
/** The shift ended: tips, the best-shift board, quests, the chef's hat. */
function shiftOver(g: DinerState): void {
  if (!g.ids.includes(game.net.selfId) || tipped.has(g.t0) || Date.now() - shiftEnd(g) > 60000) return;
  tipped.add(g.t0);
  const sc = score(g);
  SFX.score(); toast('SHIFT OVER! ' + sc + ' points, ' + g.done + ' orders served. ' + verdict(sc), 5000);
  quests.bump('diner');
  if (sc > (save.data.stats.dinerBest ?? 0)) { save.update((d) => { d.stats.dinerBest = sc; }); quests.checkBadges(); }
  if (sc >= 120 && save.unlock('hat:13')) setTimeout(() => { toast('You earned the CHEF HAT! Wear it from Look', 5000); SFX.score(); }, 2500);
  if (g.host === game.net.selfId && sc > (DINER.best?.score ?? 0)) game.setState({ k: 'dinerbest', v: { name: g.names.slice(0, 2).join(' & ').slice(0, 16), score: sc } });
  if (sc > 0) game.net.api.tips.diner(sc).then((r) => { if (r.paid) { game.setTokens(r.tokens); setTimeout(() => toast('Tips: +' + r.paid + (r.paid === 1 ? ' token' : ' tokens'), 3000), 5200); } }).catch((e: unknown) => console.warn('[tips]', e));
}
/** The top banner in the Diner during a shift. */
export function dinerLine(): string {
  if (tour && game.room.id === 'diner') return tourStepNow().bar;
  const g = DINER.g; if (game.room.id !== 'diner' || !shiftLive(g)) return '';
  return 'KITCHEN SHIFT · ' + mmss((g.t0 + SHIFT_S * 1000 - Date.now()) / 1000) + ' · ' + score(g) + ' PTS · ' + g.ids.length + (g.ids.length === 1 ? ' COOK' : ' COOKS');
}

// ---------- COOKIE's tour of the kitchen (game/dinertour.ts) ----------
/** The tour: which step, the private practice kitchen, when this step started, and the step to go back to after a burn. */
export let tour: { step: number; g: DinerState; t0: number; said: string; back: number } | null = null;
const skipBtn = document.createElement('button');
skipBtn.type = 'button'; skipBtn.className = 'pill'; skipBtn.textContent = 'SKIP TOUR'; skipBtn.style.display = 'none';
skipBtn.addEventListener('click', () => { endTour(true); toast('Tour skipped. TALK to COOKIE any time to see it again', 3500); });
/** Put SKIP TOUR in the emote bar (main.ts calls this where the bar is built, so it keeps its place). */
export function initTourButton(bar: HTMLElement): void { bar.appendChild(skipBtn); }
export const tourStepNow = (): TourStep => (tour && tour.back >= 0 ? BURNT : TOUR[tour?.step ?? 0]);
export function startTour(again = false): void {
  if (tour || shiftLive(DINER.g)) return;
  if (isKitchen(game.me.hold)) game.me.hold = 0;
  tour = { step: again ? 1 : 0, g: practiceShift(game.net.selfId, game.me.name), t0: now(), said: '', back: -1 };
  DINER.tour = tour.g; skipBtn.style.display = '';
  // COOKIE comes straight over: if he's far off, he runs in from just out of view
  const ck = game.npcs.byId('npc-cookie');
  if (ck && Math.abs(ck.av.x - game.me.x) > 360) { ck.av.x = clamp(game.me.x + (ck.av.x > game.me.x ? 250 : -250), 30, 1370); ck.av.y = clamp(game.me.y, 500, 660); }
  if (again) say('npc-cookie', 'The tour? Happy to! Follow me.', now(), false);
}
export function endTour(done: boolean): void {
  if (!tour) return;
  tour = null; DINER.tour = null; game.npcs.release('npc-cookie'); skipBtn.style.display = 'none';
  if (isKitchen(game.me.hold)) { game.me.hold = 0; game.sendMe(); }
  if (done && !save.data.stats.dinerTour) save.update((d) => { d.stats.dinerTour = 1; });
}
/** Where a tour step points: the station's stand point (COOKIE waits beside it) and the top of its picture (the arrow). */
function tourSpot(at: TourStep['at']): { x: number; y: number; top: number } {
  if (at === 'you') return { x: game.me.x + (game.me.x > 1300 ? -30 : 30), y: game.me.y + 2, top: game.me.y - 60 };
  const sp = DINER_SPOTS.find((q) => (at === 'clock' ? q.kind === 'shift' : q.kind === 'cook' && q.n === at))!;
  return { x: sp.sx, y: sp.sy, top: sp.area.y0 };
}
/** Run the tour: start it for first-timers, walk COOKIE, say each line, move on when a step is done. */
function tourStep(): void {
  if (!tour) {
    if (!save.data.stats.dinerTour && !shiftLive(DINER.g) && game.playing && !game.editing) startTour();
    return;
  }
  if (shiftLive(DINER.g)) { endTour(false); toast('A real shift just started! Jump in: COOKIE will show you around another time', 4000); return; }
  const t = now();
  if (isBurnt(game.me.hold) && tour.back < 0) { tour.back = retryStep(tour.step); tour.t0 = t; }
  const st = tourStepNow(), sp = tourSpot(st.at), cookie = game.npcs.byId('npc-cookie');
  const cx = st.at === 'you' ? sp.x : sp.x + (sp.x > 1300 ? -30 : 30);
  game.npcs.puppet.set('npc-cookie', { x: cx, y: sp.y + 6 });
  if (cookie && !cookie.av.moving) game.npcs.face(cookie, game.me.x, t);
  const key = tour.step + ':' + tour.back;
  const near = cookie ? Math.hypot(cookie.av.x - cx, cookie.av.y - sp.y - 6) < 40 : true;
  if (tour.said !== key && cookie && (near || t - tour.t0 > (st.at === 'you' ? 6 : 3))) { tour.said = key; say('npc-cookie', st.say, t, false); SFX.chat(); }
  const done = st.done ? st.done({ hold: game.me.hold, g: tour.g }) : t - tour.t0 > (st.wait ?? 5) && tour.said === key;
  if (!done) return;
  if (tour.back >= 0) { tour.step = tour.back; tour.back = -1; tour.t0 = t; return; }
  if (tour.step >= TOUR.length - 1) { endTour(true); return; }
  tour.step++; tour.t0 = t;
  if (TOUR[tour.step].done && tour.step > 2) SFX.chime();
}
/** E at a station on the tour: the practice kitchen, just for you. */
function tourCook(st: number): void {
  if (!tour) return;
  const res = cookAct(tour.g, game.net.selfId, game.me.name, st);
  if ('err' in res) { toast(res.err, 1800); SFX.blip(); return; }
  tour.g = res.g; DINER.tour = res.g;
  game.me.hold = res.g.hands[res.g.ids.indexOf(game.net.selfId)] ?? 0; game.sendMe();
  cookSound(st, !!res.ticket, true);
}
/** A big bouncing arrow over where the tour wants you. */
export function drawTourArrow(a: number): void {
  if (!tour) return;
  const st = tourStepNow(); if (st.at === 'you') return;
  const sp = tourSpot(st.at), x = Math.round(sp.x), y = Math.round(sp.top - 14 - Math.abs(Math.sin(a * 4)) * 5), c: [number, number, number] = [124, 242, 156];
  arrowDown(x, y, c, 6, 6, 2, 8);
  Gd(x, y, 12, c, 0.45);
}

