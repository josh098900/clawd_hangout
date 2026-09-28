// THE AIRPORT and ICELAND, the playing part (step 19). game/air.ts is the plane's clock, world/airport.ts, plane.ts, kef.ts and
// reykjavik.ts the sets, world/iceland.ts Iceland's sky, game/passport.ts the stamps, ui/passport.ts the panels.
//   * THE TERMINAL: check-in (the BOARDING PASS), security (the X-RAY shows what whoever's at it is holding; THE ARCH beeps for anything
//     metal as anyone walks through it), the forecast
//   * THE PLANE: the seatbelt sign's ding, the crew's PA and the captain's announcements on the flight's clock, PENNY's safety demo
//     and her drinks trolley (its spot rolls along with her), the lavatory; a flight counted when it lands with you aboard
//   * KEFLAVÍK: the stamp at passport control, your bag on the carousel (a lap every 22 s: E as it passes in front of you), the travelator
//   * REYKJAVÍK: the stamps (arriving, the tower, the Sun Voyager, the northern lights), the aurora camera, the cat, the elf house
// Nothing is sent: it all runs on the clock, and what you hold (and where you stand) already goes out with your moves.

import { game, now } from '../app/game';
import { say, toast } from '../ui/overlay';
import { SFX } from '../audio/sfx';
import { quests } from '../game/quests';
import { air, airT, doorOpenAt, nextBoarding, seatbelt, turbulence, masksDrop, seatOf, PUSH_S, TOUCH_S, DESCEND_S, CLIMB_S, TROLLEY_S, TROLLEY_E, type Air } from '../game/air';
import { stampIt, stamped, STAMPS } from '../game/passport';
import { AIRW, APSPOT, LANE, archXAt } from '../world/airport';
import { PLANEW, PLSPOT, PLR } from '../world/plane';
import { KEFW, KFSPOT, TRAVELATOR, CAROUSEL, loopAt } from '../world/kef';
import { REYKW, RKR } from '../world/reykjavik';
import { ICE, auroraNow, forecast, iceDay, iceWeather, untilDark } from '../world/iceland';
import { weather } from '../world/weather';
import { BODY } from '../engine/palette';
import { HOLD_MOONROCK, HOLD_SUITCASE, isPotion, type Avatar } from '../entities/avatar';
import { mmss } from '../engine/format';
import { openBoardingPass, openPassport, openTowerView } from '../ui/passport';
import { flash } from '../ui/modal';
import type { RoomId } from '../world/room';
import type { RGB } from '../engine/palette';

const AIR_ROOMS = new Set<RoomId>(['airport', 'plane', 'kef', 'reykjavik', 'airportstn']);
const PENNY = 'npc-penny', BUZZ = 'npc-buzz', DOT = 'npc-dot', GUNNI = 'npc-gunni';
const npcSay = (id: string, text: string): void => { if (game.npcs.inRoom(game.room.id).some((n) => n.def.id === id)) say(id, text, now(), false); };
const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
/** Stamp your passport (the first time): the THUMP, and a toast. */
function stampNow(id: string): boolean {
  if (!stampIt(id)) return false;
  SFX.stamp(); const s = STAMPS.find((q) => q.id === id)!; toast('PASSPORT STAMPED: ' + s.name + '!', 3500); game.floatText('STAMPED!');
  return true;
}

// ---------------------------------------------------------------- the terminal ----------------------------------------------------------------
/** Anything metal sets THE ARCH off: the CROWN, HALO, DIVING HELMET and VIKING HELMET, the MONOCLE, a MOON ROVER pet. */
export const isMetal = (av: Avatar): boolean => [5, 10, 20, 21].includes(av.look.hat) || av.look.face === 5 || av.look.pet === 8;
const prevX = new Map<string, number>();
let xrayWho = '', xrayMine = -99;
function terminalStep(): void {
  const room = game.room;
  AIRW.busy = new Set([...room.inUse.keys()].filter((i) => room.spots[i]?.kind === 'checkin').map((i) => room.spots[i].n ?? 0));
  // the X-ray: whoever's at the belt, their things go through (everyone sees the screen)
  const at = game.everyone().find((av) => av.use === APSPOT.XRAY), who = at ? at.id : '';
  if (who !== xrayWho) { xrayWho = who; if (at) { AIRW.xray = { hold: at.hold, t0: now() }; SFX.hum(); } }
  if (game.me.use === APSPOT.XRAY && now() - xrayMine > 3.6 && xrayMine > 0) {
    xrayMine = -99; game.leaveSpot();
    const h = game.me.hold; npcSay(BUZZ, isPotion(h) ? 'Is that a potion? Over a hundred mil? ...On you go.' : h === HOLD_MOONROCK ? '...sir, is this a MOON ROCK? On you go, I suppose.' : h ? 'All clear!' : 'Just a bit of fluff. On you go.');
  }
  // THE ARCH: anyone walking through it, left to right, in its lane: a beep (and a wand) for metal, a ding for everyone else
  for (const av of game.everyone()) {
    const px = prevX.get(av.id), ax = archXAt(av.y); prevX.set(av.id, av.x);
    if (px === undefined || av.y < LANE.y0 - 4 || av.y > LANE.y1 + 4 || !(px < ax && av.x >= ax)) continue;
    const beep = isMetal(av); AIRW.arch = { t: now(), beep }; beep ? SFX.archBeep() : SFX.clear();
    if (av === game.me) { if (beep) { npcSay(BUZZ, 'Arms up, please!'); toast('BEEP! Something metal. OFFICER BUZZ waves the wand...', 2500); game.emote('huh'); setTimeout(() => npcSay(BUZZ, pick(['All clear. It\'s always the hat.', 'All clear. Lovely hat, by the way.', 'Carry on! Nothing to see here.'])), 1600); } else npcSay(BUZZ, pick(['Next!', 'Lovely. Next!', 'All clear.'])); }
  }
}

// ---------------------------------------------------------------- the plane ----------------------------------------------------------------
let beltWas = false, lastLeg = -1, lastK = 0, nudged = -1;
/** What happens at each moment of a leg, while you're aboard. */
function planeEvents(a: Air): void {
  if (a.n !== lastLeg) { lastLeg = a.n; lastK = a.k; return; }
  const past = (t: number): boolean => lastK < t && a.k >= t, home = a.to === 'city';
  if (past(PUSH_S + 1)) { SFX.dingdong(); npcSay(PENNY, 'Cabin crew, arm doors and cross-check.'); }
  const demo = ['Please watch the safety demonstration!', 'Your seatbelt goes like this. Click!', 'If the oxygen masks drop, put yours on first.', 'Your life vest is under your seat.', 'Your nearest exit may be behind you.'];
  demo.forEach((line, i) => { if (past(101 + i * 3)) npcSay(PENNY, line); });
  if (past(117)) SFX.spool(); if (past(121)) SFX.roar(); if (past(CLIMB_S + 2)) SFX.thunk();
  if (past(152)) { SFX.dingdong(); toast(home ? 'CAPTAIN WINGS: "Good day folks. We\'re on our way home to the city, cruising at eleven thousand metres. Sit back and enjoy the view."' : 'CAPTAIN WINGS: "Good day folks, Captain Wings here. We\'re cruising at eleven thousand metres. Sit back and enjoy the view."', 6000); }
  if (past(TROLLEY_S)) { npcSay(PENNY, 'Juice? Coffee? ...Juice?'); SFX.rattle(); }
  const tb = turbulence(a) > 0, tbWas = turbulence({ ...a, k: lastK }) > 0;
  if (tb && !tbWas) { toast('CAPTAIN WINGS: "Just a bit of bumpy air, folks. Seatbelts on, please."', 4000); if (masksDrop(a.n)) setTimeout(() => { toast('The oxygen masks drop! ...CAPTAIN WINGS: "Sorry folks, wrong button."', 4500); npcSay(PENNY, 'Not again...'); }, 2500); }
  if (past(DESCEND_S + 1)) { SFX.dingdong(); if (home) { const w = weather(); toast('CAPTAIN WINGS: "We\'re starting our descent into the city. Local weather: ' + (w.kind === 'clear' ? 'sunshine. Enjoy it while it lasts."' : w.kind + '. Of course it is."'), 6000); } else { const f = forecast(), wk = iceWeather().kind, temp = wk === 'gale' ? -6 : wk === 'snow' ? -4 : wk === 'drizzle' ? 4 : iceDay() > 0.5 ? 3 : -2; toast('CAPTAIN WINGS: "We\'re starting our descent into Keflavik. It\'s ' + temp + ' degrees, and the aurora forecast is ' + (f.verdict === 'NONE' ? 'cloudy, sorry folks' : f.verdict === 'STORM!' ? 'a STORM. Look up tonight!' : f.verdict === 'FAINT' ? 'faint' : 'looking good') + '."', 6500); } }
  if (past(280)) SFX.thunk(); // (the gear coming down)
  if (past(TOUCH_S)) { SFX.thunk(); game.celebrate(); quests.stat('planes'); if (!home) quests.bump('fly'); }
  if (past(TOUCH_S + 2)) npcSay(PENNY, home ? 'Welcome home, everyone!' : 'Velkomin til Islands! Welcome to Iceland!');
  lastK = a.k;
}
function planeStep(): void {
  const a = air();
  planeEvents(a);
  // the seatbelt sign: a ding when it comes on, and a nudge to anyone standing in the aisle
  const belt = seatbelt(a);
  if (belt && !beltWas) SFX.ding();
  beltWas = belt;
  if (belt && game.usingOf(game.me) !== 'sit' && game.me.y > 530 && nudged !== a.n && a.k > PUSH_S) { nudged = a.n; toast('The seatbelt sign is on: please take your seat', 3000); }
  // PENNY and her trolley: the drinks spot rolls along ahead of her on the round, and lives in the galley otherwise
  const p = game.npcs.inRoom('plane').find((q) => q.def.id === PENNY);
  PLANEW.penny = p ? { x: p.av.x, y: p.av.y } : null;
  const sp = game.room.spots[PLSPOT.DRINKS], round = PLANEW.penny && a.k >= TROLLEY_S - 2 && a.k < TROLLEY_E + 4 && PLANEW.penny.x > 190;
  if (sp) { const x = round ? Math.round(PLANEW.penny!.x + 26) : PLR.galley + 40; sp.x = sp.sx = x; sp.area = round ? { x0: x - 16, y0: 510, x1: x + 16, y1: 568 } : { x0: 70, y0: 360, x1: 190, y1: 470 }; sp.label = round ? 'A DRINK FROM THE TROLLEY' : 'A DRINK'; }
}

// ---------------------------------------------------------------- Keflavík ----------------------------------------------------------------
/** Your bag on the carousel: when it came out of the hatch (s, performance clock), or -1 (none coming). */
let bagT0 = -1, buzzed = false;
const U_HATCH = 0.28; // (where the hatch drops bags onto the loop)
function bagU(t0: number): number { return (U_HATCH + (now() - t0) / CAROUSEL.lap) % 1; }
function kefStep(dt: number): void {
  const me = game.me;
  // the travelator carries you along
  if (me.use < 0 && me.x >= TRAVELATOR.x0 && me.x <= TRAVELATOR.x1 - 6 && me.y >= TRAVELATOR.y0 && me.y <= TRAVELATOR.y1) me.x += TRAVELATOR.speed * dt;
  // the carousel: the buzzer as it starts, your bag (if you've just flown in and haven't got it), everyone else's, and a few odd things
  if (bagT0 > 0 && !buzzed && now() > bagT0 - 1.5) { buzzed = true; SFX.buzzer(); }
  const bags: typeof KEFW.bags = [];
  if (bagT0 > 0 && now() >= bagT0 && me.hold !== HOLD_SUITCASE) bags.push({ u: bagU(bagT0), col: BODY[me.look.c]?.c ?? [200, 70, 60], mine: true });
  for (const av of game.others.values()) { if (av.hold === HOLD_SUITCASE || av.id.startsWith('npc')) continue; let h = 7; for (let i = 0; i < av.id.length; i++) h = Math.imul(h ^ av.id.charCodeAt(i), 16777619) >>> 0; bags.push({ u: ((h % 1000) / 1000 + now() / CAROUSEL.lap) % 1, col: BODY[av.look.c]?.c ?? [120, 120, 130], mine: false }); }
  ['kayak', 'cooler', 'duck', 'guitar'].forEach((odd, i) => bags.push({ u: (now() / CAROUSEL.lap + i / 4 + 0.1) % 1, col: [0, 0, 0] as RGB, mine: false, odd }));
  KEFW.bags = bags;
  // the carousel spot's label says whether yours is coming
  const sp = game.room.spots[KFSPOT.CAROUSEL]; if (sp) sp.label = me.hold === HOLD_SUITCASE ? 'YOUR BAG: GOT IT' : bagT0 > 0 ? 'GRAB YOUR BAG' : 'BAGGAGE CLAIM';
}
function grabBag(): void {
  const me = game.me;
  if (me.hold === HOLD_SUITCASE) { toast('You\'ve got your bag already. (Q puts it away)', 2500); return; }
  if (bagT0 < 0) { toast('None of these are yours. Fly in on LA101 and yours comes round with the yellow ribbon', 3500); SFX.nope(); return; }
  if (now() < bagT0) { toast('The belt\'s starting... your bag\'s on its way', 2500); return; }
  const p = loopAt(bagU(bagT0));
  if (p.front && Math.abs(p.x - me.x) < 28) { me.hold = HOLD_SUITCASE; game.sendMe(); SFX.pop(); game.celebrate('joy'); toast('Got it! Your bag, with the yellow ribbon. (It rolls along behind you: Q puts it away)', 4000); bagT0 = -1; return; }
  // not in front of you yet: how long till it is
  let wait = 0; for (let s = 0; s < CAROUSEL.lap * 2; s += 0.25) { const q = loopAt(bagU(bagT0) + s / CAROUSEL.lap); if (q.front && Math.abs(q.x - me.x) < 28) { wait = s; break; } }
  SFX.nope(); toast('Missed it! Yours has the yellow ribbon: round again in ' + Math.ceil(wait) + ' s', 2500);
}

// ---------------------------------------------------------------- Reykjavík ----------------------------------------------------------------
let shimmerAt = 0, gullAt = 0, organAt = 0;
function reykStep(): void {
  const au = auroraNow(), t = now();
  if (au.vis > 0.4 && au.kp >= 3 && t - shimmerAt > 9) { shimmerAt = t; SFX.shimmer(); }
  if (t - gullAt > 14 + Math.random() * 10) { gullAt = t; if (iceDay() > 0.3) SFX.gull(); }
  if (Math.abs(game.me.x - RKR.church) < 90 && game.me.y < 510 && t - organAt > 16) { organAt = t; SFX.organ(); }
}
function auroraPhoto(): void {
  const au = auroraNow(), d = untilDark();
  SFX.click();
  if (au.vis > 0.3 && au.kp >= 1) {
    flash(); const storm = au.kp >= 7;
    toast((storm ? 'AN AURORA STORM! ' : '') + 'NORTHERN LIGHTS, KP ' + au.kp + (storm ? '. The whole sky is moving. What a photo.' : '. Got it!'), 5000);
    stampNow('aurora'); quests.bump('aurora'); game.celebrate(storm ? 'joy' : 'wow');
    if (storm) quests.stat('auroraStorm');
    return;
  }
  if (d > 0) toast('It\'s still light. The northern lights come out after dark: ' + mmss(d) + ' to go', 3500);
  else if (au.cloud > 0.6) toast('Nothing but cloud tonight. The forecast did say so...', 3500);
  else if (au.kp === 0) toast('Just stars tonight (KP 0). Beautiful, but not green.', 3500);
  else toast('Give it a minute: it isn\'t properly dark yet', 3000);
}
const ELF = ['*knock knock* ...nobody home. Or nobody who wants you to know they are.', '*knock knock* A tiny light flickers behind the curtain.', '*knock knock* You hear the smallest kettle in the world.'];

// ---------------------------------------------------------------- what main.ts calls ----------------------------------------------------------------
/** E at one of the airport's or Iceland's own spots. True = stay at it (main sits you there). */
export function airSpot(kind: string, n: number, i: number): boolean {
  const me = game.me;
  switch (kind) {
    case 'checkin': {
      const a = air(), boarding = doorOpenAt('city', a), s = seatOf(game.net.selfId || me.id);
      npcSay(DOT, pick(['Window or aisle? Just kidding, the computer picks.', 'Any liquids, potions or moon rocks? ...Lovely.', 'Pack a jumper. Seriously.']));
      SFX.blip(); openBoardingPass({ name: me.name, flight: 'LA101', from: 'CITY', to: 'KEF', gate: 'A1', seat: s.row + s.letter, boardsIn: nextBoarding('city', airT()), boarding, id: game.net.selfId || me.id }, game.closeSpot(i));
      return true;
    }
    case 'xray': xrayMine = now(); npcSay(BUZZ, me.hold ? 'In the tray, please.' : 'Pockets empty? Lovely.'); return true;
    case 'forecast': { const f = forecast(); toast('TONIGHT IN ICELAND: KP ' + f.kp + ', CLOUD ' + f.cloud + '%: ' + f.verdict + (f.dark > 0 ? ' (dark in ' + mmss(f.dark) + ')' : ' (it\'s dark now)'), 5000); SFX.blip(); return false; }
    case 'lav': PLANEW.lav = now(); toast('You squeeze into the lavatory...', 2000); setTimeout(() => SFX.flush(), 1200); setTimeout(() => toast('*FLUSH* Much better.', 2000), 2600); return false;
    case 'passport': { const fresh = stampIt('kef'); if (fresh) { SFX.stamp(); KEFW.stamp = now(); } npcSay(GUNNI, fresh ? pick(['Godan daginn! That\'s "good day". Welcome to Iceland!', 'Purpose of your visit? ...Hot dogs? Good answer.']) : 'Back again? Your passport\'s already stamped. Welcome back!'); openPassport(me.look, me.name, game.closeSpot(i), fresh ? 'kef' : undefined); return true; }
    case 'carousel': grabBag(); return false;
    case 'tower': { const fresh = stampNow('tower'); SFX.organ(); openTowerView(game.closeSpot(i)); if (!fresh) toast('Up the tower in the lift: the whole city, all round', 2500); return true; }
    case 'voyager': toast('THE SUN VOYAGER: a dream boat, sailing for the sun. The steel shines.', 4000); stampNow('voyager'); return false;
    case 'auroracam': auroraPhoto(); return false;
    case 'cat': REYKW.pet = now(); SFX.purr(); toast(pick(['prrrp. The cat stretches, and goes back to sleep.', 'The cat opens one eye. Approves. Closes it.', 'prrrrrrrp. You\'ve made a friend.']), 3000); return false;
    case 'elf': { REYKW.knock = now(); SFX.knock(); if (Math.random() < 0.25) { REYKW.elfOpen = now() + 0.8; setTimeout(() => toast('...the tiny door opens a crack. A tiny voice: "NOT TODAY, THANK YOU."', 4000), 900); } else toast(pick(ELF), 3500); return false; }
  }
  return false;
}
/** Something filled (main.ts's FILL): the hot dog counts for the quest. */
export function airFilled(kind: string): void { if (kind === 'pylsa') { quests.bump('hotdog'); npcSay('npc-sigga', pick(['One with everything! Enjoy.', 'Crispy onions, raw onions, ketchup, sweet mustard, remoulade. That\'s everything.'])); } }
/** You've just come into one of these rooms (from `from`). */
export function airEntered(from: RoomId | null): void {
  const id = game.room.id;
  if (id === 'plane' && from !== 'plane') { const s = seatOf(game.net.selfId || game.me.id); toast('Welcome aboard LAB AIR! Your seat is ' + s.row + s.letter + ' (it glows). Stay aboard and you fly back', 4500); npcSay(PENNY, 'Welcome aboard!'); lastLeg = -1; }
  if (id === 'kef' && from === 'plane') { toast('Velkomin til Islands! Welcome to Iceland. Your bag comes round on the carousel; PASSPORT CONTROL is the glass booth', 5000); bagT0 = now() + 6; buzzed = false; }
  if (id === 'reykjavik') { stampNow('reykjavik'); SFX.gull(); gullAt = now(); }
  if (id === 'airport' && from === 'plane') toast('Welcome home! The trains are down the escalator, at the far end', 3500);
}
/** Every frame (only does anything in these rooms). */
export function airStep(dt: number): void {
  const id = game.room.id; if (!AIR_ROOMS.has(id)) return;
  const c = game.R.cam, view = { x0: c.x, x1: c.x + c.w };
  if (id === 'airport') { AIRW.view = view; terminalStep(); }
  else if (id === 'plane') { PLANEW.view = view; planeStep(); }
  else if (id === 'kef') { KEFW.view = view; ICE.view = view; kefStep(dt); }
  else if (id === 'reykjavik') { REYKW.view = view; ICE.view = view; reykStep(); }
}
/** The banner line (aboard). */
export function airLine(): string | null {
  if (game.room.id !== 'plane') return null;
  const a = air(), name = a.no + ' ' + (a.to === 'kef' ? 'TO KEFLAVIK' : 'TO THE CITY');
  if (a.phase === 'board') return name + ' · BOARDING · DOORS CLOSE IN ' + mmss(PUSH_S - a.k);
  if (a.k < CLIMB_S) return name + ' · TAKING OFF · SEATBELTS ON';
  if (a.k >= TOUCH_S) return name + ' · LANDED · ' + (a.to === 'kef' ? 'WELCOME TO ICELAND' : 'WELCOME HOME');
  return name + ' · ' + (a.to === 'kef' ? 'KEFLAVIK' : 'THE CITY') + ' IN ' + mmss(TOUCH_S - a.k) + ' · ' + Math.round(a.alt * 11) + ' KM' + (seatbelt(a) ? ' · SEATBELTS ON' : '');
}
/** What E says at these spots (null: the spot's own label). */
export function airLabel(kind: string): string | null {
  if (kind === 'auroracam') { const au = auroraNow(); return au.vis > 0.3 && au.kp >= 1 ? 'PHOTO: THE NORTHERN LIGHTS!' : 'PHOTO OF THE SKY'; }
  return null;
}
export const airDebug = () => ({ air: air(), belt: seatbelt(), bagT0, bags: KEFW.bags.length, xray: { ...AIRW.xray }, arch: { ...AIRW.arch }, stamps: STAMPS.filter((s) => stamped(s.id)).map((s) => s.id), aurora: auroraNow(), forecast: forecast(), penny: PLANEW.penny, lav: PLANEW.lav });
