// SPACE, the playing part: the rocket's countdown, liftoff and landing sounds and news, floating and the
// jetpack, the safety tethers, the screen shaking, the Space Station's hydroponic trays, Mission Control's
// telescope, the spacewalk's stardust (and getting paid for it). The drawing is in world/space.ts, rocket.ts,
// station.ts, spacewalk.ts and sky.ts; the flight timetable is flight() in world/space.ts.

import { Rumble } from '../audio/music';
import { game, now, errText } from '../app/game';
import { r } from '../engine/pixel';
import { STATION, trayLine, trayState } from '../world/station';
import { WALK, JUNK, floatersNow } from '../world/spacewalk';
import { CYCLE, DEPART, FLIGHT, LAND, MECO, PAD_X, UP_S, flight } from '../world/space';
import type { SkyThing } from '../world/sky';
import { openMission } from '../ui/mission';
import { quests } from '../game/quests';
import { openFreeTray, openMyTray } from '../ui/garden';
import { mmss } from '../engine/format';
import { save } from '../game/save';
import type { RoomId } from '../world/room';
import { POSE_FLOAT, ENV } from '../entities/avatar';
import { logLine, toast } from '../ui/overlay';
import { SFX } from '../audio/sfx';
import { modalOpen } from '../ui/modal';

// ---------- SPACE: the rocket (world/space.ts, rocket.ts), the station (station.ts), the spacewalk (spacewalk.ts) ----------
let jetAt = 0, walkOwed = 0, scopeSent = 0, scopeKey = '', scopeNews = 0, firedN = -1;
export const jets: { x: number; y: number; vx: number; vy: number; t0: number }[] = [];
/** The rocket's engines, heard in the capsule and near the pad. */
const rumble = new Rumble();
const fired = new Set<string>();
const fire = (k: string, fn: () => void): void => { if (!fired.has(k)) { fired.add(k); fn(); } };
/** Dev/tests: put this browser's rocket clock `k` seconds into its loop. */
export function setFlight(k: number): void { FLIGHT.skew = 0; FLIGHT.skew = k - (Date.now() / 1000) % CYCLE; }
/** SPACE (or the FLOAT / JETPACK pill): push off the floor and float up high; out on a spacewalk, fire the jetpack. */
export function spaceKey(): void {
  if (!game.playing || game.editing || modalOpen() || !game.room.zeroG?.()) return;
  const t = now();
  if (game.room.freeFloat) {
    if (t - jetAt < 0.35) return; jetAt = t;
    const ax = game.input.axis(); let dx = ax.x, dy = ax.y; if (!dx && !dy) dx = game.me.dir;
    const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    game.zv.x += dx * 70; game.zv.y += dy * 50; const sp = Math.hypot(game.zv.x / 1.4, game.zv.y); if (sp > 110) { game.zv.x *= 110 / sp; game.zv.y *= 110 / sp; }
    game.clearTap(); if (Math.abs(dx) > 0.2) game.me.dir = dx > 0 ? 1 : -1;
    for (let k = 0; k < 3; k++) jets.push({ x: game.me.x - dx * 8 + (k - 1) * 2, y: game.me.y - 20 - dy * 6, vx: -dx * (30 + k * 12), vy: -dy * (20 + k * 8) + (k - 1) * 6, t0: t + k * 0.05 });
    SFX.jet(); return;
  }
  if (game.me.pose === POSE_FLOAT) return;
  if (game.me.use >= 0) game.leaveSpot();
  game.me.pose = POSE_FLOAT; game.me.poseT0 = t; game.sendMe(); SFX.whoosh();
}
/** Everyone out on a spacewalk is clipped on to a safety line from the airlock. */
export function drawTethers(a: number, t: number): void {
  const T0 = game.room.tether!, cols: [number, number, number][] = [[236, 190, 60], [200, 150, 40]];
  for (const av of [...(game.playing ? [game.me] : []), ...game.others.values()]) {
    if (game.hidden(av, t)) continue;
    const x1 = av.x - av.dir * 4, y1 = av.y - 30, n = Math.max(8, Math.round(Math.hypot(x1 - T0.x, y1 - T0.y) / 1.5));
    for (let k = 0; k <= n; k++) { const u = k / n, s = Math.sin(u * Math.PI), x = T0.x + (x1 - T0.x) * u + Math.sin(u * 6 + a * 1.3 + av.seed * 9) * 12 * s, y = T0.y + (y1 - T0.y) * u + Math.sin(u * 4 + a * 0.9) * 8 * s; r(Math.round(x), Math.round(y), 1, 1, cols[Math.floor(k / 4) % 2]); }
  }
}
/** How much the screen shakes right now: in the rocket, and on the roof near the pad at liftoff. */
export function shakeNow(): number {
  if (!game.playing) return 0;
  if (game.room.shake) return game.room.shake();
  if (game.room.id !== 'roof') return 0;
  const f = flight(), near = Math.max(0, 1 - Math.abs(game.me.x - PAD_X) / 700), hot = (f.phase === 'up' && f.k < 6) || (f.phase === 'pad' && f.left < 2) || (f.phase === 'down' && LAND - f.k < 1.5);
  return hot ? 0.7 * near : 0;
}
export function spaceLine(): string {
  if (game.room.id === 'spacewalk') return 'SPACEWALK · HAUL ' + WALK.pts + ' · ' + WALK.dust + ' STARDUST · BACK IN AT THE AIRLOCK TO GET PAID';
  const f = flight();
  if (game.room.id === 'roof' && f.phase === 'pad' && f.left < 60) return 'ROCKET LAUNCH IN ' + mmss(f.left) + ' · BOARD AT THE PAD (FAR RIGHT)';
  if (game.room.id === 'station' && f.phase === 'docked' && f.left < 60) return 'THE ROCKET HOME LEAVES IN ' + mmss(f.left) + ' · THE DOCK, FAR LEFT';
  return '';
}
/** Once a frame: who floats, the countdown and its sounds, the station's trays and telescope news, grabbing stardust. */
export function spaceStep(): void {
  ENV.zeroG = !!game.room.zeroG?.(); ENV.free = !!game.room.freeFloat; ENV.g = game.room.gForce?.() ?? 0;
  const f = flight(); if (f.n !== firedN) { firedN = f.n; fired.clear(); }
  const inRocket = game.room.id === 'rocket', nearPad = game.room.id === 'roof' && Math.abs(game.me.x - PAD_X) < 700;
  if (game.playing && (inRocket || nearPad)) {
    if (f.phase === 'pad' && f.left < 10.5) { const n = Math.ceil(f.left); fire('t' + n, () => { SFX.tminus(); if (inRocket && n <= 5) toast(String(n) + '...', 900); }); }
    if (f.phase === 'up' && f.k < 2) fire('go', () => { SFX.ignite(); if (inRocket) toast('LIFTOFF!', 2200); });
    if (f.phase === 'pad' && f.k - LAND < 2) fire('land', () => { SFX.clunk(); SFX.boom(); if (inRocket) toast('Touchdown! Welcome back to the Rooftop. The hatch is open', 4000); });
  }
  if (game.playing && inRocket) {
    if (f.phase === 'pad' && f.left < 30 && f.left > 11) fire('strap', () => toast('Liftoff in ' + Math.ceil(f.left) + ' seconds. Strap in at a seat (or float about, your call)', 4000));
    if (f.phase === 'up' && f.k > MECO) fire('meco', () => toast('Engines off: ZERO G! ' + (game.isTouch ? 'Tap FLOAT' : 'Press SPACE') + ' to push off', 4000));
    if (f.phase === 'up' && f.k > UP_S - 1.1) fire('dock', () => SFX.clunk());
    if (f.phase === 'docked') fire('docked', () => toast('Docked at the SPACE STATION! Out through the hatch', 4000));
    if (f.phase === 'down' && f.k - DEPART > 15) fire('reentry', () => toast('RE-ENTRY! Hold on to something...', 3000));
  }
  if (game.playing && game.room.id === 'station' && f.phase === 'docked' && f.left < 60) fire('lastcall', () => toast('The rocket home leaves in 1 minute (the dock, far left)', 4000));
  if (game.playing && (game.room.id === 'roof' || game.room.id === 'den') && f.phase === 'pad' && f.left < 60 && f.left > 45) fire('soon', () => toast(game.room.id === 'roof' ? 'The rocket to the SPACE STATION launches in 1 minute! Board it at the pad (far right)' : 'The rocket launches from the roof in 1 minute! (up the ladder)', 5000));
  // the engines
  const d = f.k - DEPART, burn = f.phase === 'up' && f.k < MECO ? (f.k < 3 ? 1 : 0.7) : f.phase === 'pad' && f.left < 3 ? 0.5 : f.phase === 'down' && d > 15 && d < 30 ? 0.6 : f.phase === 'down' && LAND - f.k < 12 ? 0.5 : 0;
  const roofBurn = (f.phase === 'pad' && f.left < 3) || (f.phase === 'up' && f.k < 14) || (f.phase === 'down' && LAND - f.k < 14);
  rumble.set(!game.playing ? 0 : inRocket ? burn : nearPad && roofBurn ? Math.max(burn, 0.5) * Math.max(0, 1 - Math.abs(game.me.x - PAD_X) / 700) : 0);
  // the station: trays, and the telescope's news
  if (game.room.id === 'station' && game.playing && (STATION.dirty || Date.now() - STATION.fetchedAt > 15000)) refreshTrays();
  const sc = STATION.scope;
  if (game.room.id === 'station' && sc && sc.saw && sc.at !== scopeNews && sc.by && sc.by !== game.me.name && Date.now() / 1000 - sc.at < 10) { scopeNews = sc.at; logLine(null, sc.by + ' spotted ' + sc.saw + ' through the telescope!'); }
  if (game.room.id === 'spacewalk' && game.playing) grabStep();
}
/** Out on the spacewalk: touch a drifting thing to grab it. */
function grabStep(): void {
  const T = Date.now() / 1000;
  for (const [id, at] of WALK.got) if (T - at > 150) WALK.got.delete(id);
  for (const fl of floatersNow()) {
    if (WALK.got.has(fl.id) || Math.abs(fl.x - game.me.x) > 14 || Math.abs(fl.y - game.me.y) > 12) continue;
    WALK.got.set(fl.id, T); game.net.sendJunk(fl.id);
    const j = JUNK[fl.kind]; WALK.pts += j.pts;
    if (fl.kind === 0) { WALK.dust++; quests.bump('spacewalk'); SFX.pop(); if (WALK.dust % 10 === 0) { SFX.chime(); toast(WALK.dust + ' stardust!', 1500); } }
    else { WALK.things++; SFX.chime(); toast('You caught ' + j.name + '! +' + j.pts, 2200); }
    game.floatText('+' + j.pts, fl.x, fl.y - 36);
  }
}
/** Back inside from a spacewalk: get paid for the haul (anything the server refuses for now is kept for next time). */
export function payWalk(): void {
  const pts = WALK.pts + walkOwed, dust = WALK.dust, things = WALK.things; WALK.pts = 0; WALK.dust = 0; WALK.things = 0;
  if (pts <= 0) return;
  game.net.spacewalkPay(pts).then((r) => {
    walkOwed = 0; game.setTokens(r.tokens);
    const what = dust + ' stardust' + (things ? ' and ' + things + ' bit' + (things > 1 ? 's' : '') + ' of space junk' : '');
    if (r.paid) { SFX.score(); game.floatText('+' + r.paid, game.me.x, game.me.y - 60); toast('SPACEWALK HAUL: ' + what + ' · +' + r.paid + ' tokens', 5000); }
    else toast('SPACEWALK HAUL: ' + what + (pts < 8 ? ' · bring in 8 or more for a token' : ' · no more spacewalk pay today'), 4500);
  }).catch((e: unknown) => { walkOwed = pts; toast(errText(e) === 'one spacewalk a minute' ? 'Your haul is banked: it pays out after your next spacewalk' : errText(e), 4000); });
}
export function spaceArrive(from: RoomId, id: RoomId): void {
  if (from === 'rocket' && id === 'station') {
    quests.bump('launch'); quests.stat('flights');
    if (save.unlock('hat:14')) setTimeout(() => { toast('You earned the SPACE HELMET! Wear it from Look', 5000); SFX.score(); }, 3000);
    if (!save.data.stats.station) { quests.stat('station'); toast('Welcome to the SPACE STATION! No gravity up here: ' + (game.isTouch ? 'tap FLOAT' : 'press SPACE') + ' to push off the floor', 6000); }
  }
  if (from === 'roof' && id === 'rocket') { const f = flight(); toast('Welcome aboard! Liftoff in ' + mmss(f.left) + '. Strap in at a seat, or float about', 4500); }
  if (id === 'spacewalk') { SFX.hiss(); if (!save.data.stats.walked) { quests.stat('walked'); toast('SPACEWALK! Grab the stardust drifting past. ' + (game.isTouch ? 'JETPACK' : 'SPACE') + ' fires your jetpack. Come back in through the airlock to get paid', 7000); } }
  if (from === 'spacewalk' && id === 'station') SFX.hiss();
  if (from === 'station' && id === 'park') { SFX.splash(); toast('SPLASHDOWN! The escape pod dropped you in the Park pond', 4500); }
}
// the hydroponic trays
function refreshTrays(bump = false): void {
  STATION.dirty = false; STATION.fetchedAt = Date.now();
  game.net.trays().then((ts) => { STATION.trays = ts; }).catch((e) => console.warn('[trays]', e));
  if (bump) game.setState({ k: 'trays', v: { n: Date.now() } }); // tell everyone else here to look again
}
const trayDo = <T,>(act: () => Promise<T>, ok: (r: T) => void): void => game.serverDo('trays', act, ok, refreshTrays);
export function tendTray(n: number): void {
  const t = STATION.trays.find((q) => q.tray === n), mine = STATION.trays.find((q) => q.owner === game.net.selfId);
  if (t && t.owner === game.net.selfId) {
    const st = trayState(t);
    openMyTray(trayLine(t, true), st.stage === 4, {
      harvest: () => trayDo(() => game.net.spaceHarvest(n), (res) => {
        game.setTokens(res.tokens);
        if (res.rotten) { toast('It went off, sorry. The tray is free again', 3500); return; }
        quests.stat('melons'); SFX.score(); game.celebrate(); game.floatText('+5');
        toast('Harvested your STAR MELON! +5 tokens', 3500);
        if (res.bonus) { save.addPrize(res.bonus); setTimeout(() => { toast('Inside it: a COMET BLOOM seed! Plant it in any free bed in the Rooftop garden', 5500); SFX.chime(); }, 1800); }
      }),
      digUp: () => trayDo(() => game.net.spaceDigUp(n), () => toast('Pulled up. The tray is free again', 2500)),
    }, () => game.input.clear());
    return;
  }
  if (t && !trayState(t).rotten) { toast(trayLine(t, false), 3500); return; }
  if (mine) { toast('You already have a star melon growing (tray ' + (mine.tray + 1) + ')', 3500); return; }
  SFX.blip();
  openFreeTray(n, game.tokens, () => trayDo(() => game.net.spacePlant(n), (bal) => { game.setTokens(bal); SFX.pop(); toast('Planted a STAR MELON! Ripe in 30 minutes', 3500); }), () => game.input.clear());
}
// mission control
export function spotted(th: SkyThing): void {
  const first = !save.data.sky.includes(th.id);
  if (first) save.update((d) => { d.sky.push(th.id); });
  if (th.kind === 'comet') { quests.bump('comet'); quests.stat('comets'); }
  toast((first ? 'NEW IN YOUR SKY LOG: ' : 'Spotted: ') + th.name + (th.kind === 'ufo' ? ' ...nobody is going to believe this' : th.kind === 'square' ? ' (wave to everyone down there!)' : ''), 4500);
  game.setState({ k: 'scope', v: { x: th.x, y: th.y, by: game.me.name, saw: th.name.slice(0, 24), at: Date.now() / 1000 } });
}
export function openScope(i: number): void {
  const s = STATION.scope, start = s ? { x: s.x, y: s.y } : { x: 900, y: 300 };
  SFX.blip();
  openMission(start, {
    aim: (x, y) => { const t = now(), key = Math.round(x / 4) + ',' + Math.round(y / 4); if (t - scopeSent > 0.33 && key !== scopeKey) { scopeSent = t; scopeKey = key; const c = STATION.scope; game.setState({ k: 'scope', v: { x, y, by: game.me.name, saw: c?.saw ?? '', at: c?.at ?? 0 } }); } },
    spotted,
    log: () => save.data.sky,
  }, () => { game.input.clear(); if (game.me.use === i) game.leaveSpot(); const c = STATION.scope; if (c) game.setState({ k: 'scope', v: { ...c, by: '' } }); });
}

