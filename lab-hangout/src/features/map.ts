// THE CITY MAP's rules: where a pick on the map takes you (world/map.ts draws it, ui/map.ts shows it).
//
//   * On Earth anywhere is free: you arrive through the place's front door, where walking in would put you.
//   * Space keeps its rides: from Earth, ORBIT or the Moon take you to the Rooftop's spaceport (the card says
//     when the rocket boards); from the station, the Moon takes you to the LANDER BAY, and Earth to the rocket's
//     hatch (or down the ESCAPE POD, straight to the Park); from the Moon, anywhere else is the lander's pad.
//   * Leaving by map is leaving by a door (game.leaveTo: the buggy parks itself, the kite goes back...).
//   * Your save keeps the places you've been: the ? stickers, and the EXPLORER badge.
// The WHO'S ONLINE "GO" button goes by the same rules (goToRoom).

import { game, now } from '../app/game';
import { BOARD } from '../world/boards';
import { SFX } from '../audio/sfx';
import { mmss } from '../engine/format';
import { placeOfRoom } from '../game/places';
import { quests } from '../game/quests';
import { save } from '../game/save';
import { placeById, type Zone } from '../world/map';
import { CYCLE, DEPART, DOCK_ARRIVE, LAND, PAD_ARRIVE, UP_S, flight } from '../world/space';
import { L_CYCLE, L_TOUCH, MOON_PAD_ARRIVE, lander } from '../world/moon';
import { LANDER_BAY_ARRIVE } from '../world/lander';
import { isFlat } from '../world/flat';
import type { RoomId } from '../world/room';
import { POSE_BOAT } from '../entities/avatar';
import { perf } from './karaoke';
import { toast } from '../ui/overlay';
import { modalOpen } from '../ui/modal';
import { mapOpen, openMapPanel } from '../ui/map';
import { goHome, visitFlat } from './flats';
import { hsFrozen, hsOn } from './hideseek';
import { BODY, type RGB } from '../engine/palette';
import { PX, mk, withCtx } from '../engine/pixel';
import { clamp } from '../engine/math';
import { dayness } from '../world/plaza';
import { weather } from '../world/weather';
import { isHalloween, isWinter } from '../world/season';

type At = { x: number; y: number };
/** Where a pick takes you: `note` says how (WALK IN, or which ride and when), `ride` if it's to a ride's door, not the place. */
export type Route = { ok: true; to: RoomId; at: At | null; note: string; ride: boolean } | { ok: false; why: string };

/** Which room's door leads into each place: you arrive where walking through it would put you. */
const VIA: Partial<Record<RoomId, RoomId>> = {
  lab: 'plaza', den: 'lab', roof: 'den', plaza: 'lab', arcade: 'plaza', cinema: 'plaza', stage: 'plaza', subway: 'plaza', crypt: 'plaza', lofts: 'plaza', pier: 'plaza',
  park: 'parkstn', parkstn: 'park', diner: 'dinerstn', dinerstn: 'diner', karts: 'kartstn', kartstn: 'karts', station: 'spacewalk', moon: 'moonbase', moonbase: 'moon',
};
function frontDoor(id: RoomId): At | null {
  const from = VIA[id], d = from ? game.rooms[from].doors.find((x) => x.to === id) : undefined;
  return d ? d.arrive : null;
}
/** The ESCAPE POD's landing spot in the Park (the station's pod door). */
function podLanding(): At | null { return game.rooms.station.doors.find((d) => d.to === 'park')?.arrive ?? null; }

/** Where you are, as far as the map's concerned: on Earth, up in orbit, on the Moon, or mid-flight in the rocket or the lander. */
export function zoneNow(): Zone | 'flying' {
  const id = game.room.id;
  if (id === 'rocket') { const p = flight().phase; return p === 'pad' ? 'earth' : p === 'docked' ? 'orbit' : 'flying'; }
  if (id === 'lander') { const p = lander().phase; return p === 'docked' ? 'orbit' : p === 'landed' ? 'moon' : 'flying'; }
  if (id === 'station' || id === 'spacewalk') return 'orbit';
  if (id === 'moon' || id === 'moonbase') return 'moon';
  return 'earth';
}

// ---- the timetables, as the card says them ----
/** From the Rooftop: when the rocket boards (or lifts off, if it's boarding now). */
export function rocketUp(): string { const f = flight(); return f.phase === 'pad' ? 'BOARDING NOW · LIFTS OFF IN ' + mmss(f.left) : 'NEXT ROCKET BOARDS IN ' + mmss(LAND - f.k); }
/** From the station: when the rocket home leaves. */
export function rocketHome(): string { const f = flight(); return f.phase === 'docked' ? 'BOARDING NOW · LEAVES IN ' + mmss(DEPART - f.k) : 'DOCKS IN ' + mmss(f.phase === 'up' ? UP_S - f.k : CYCLE - f.k + UP_S); }
/** From the station: when the lander leaves for the Moon. */
export function landerOut(): string { const f = lander(); return f.phase === 'docked' && f.left > 4 ? 'BOARDING NOW · LEAVES IN ' + mmss(f.left) : 'BACK IN ' + mmss(L_CYCLE - f.k); }
/** From the Moon: when the lander lifts off. */
export function landerHome(): string { const f = lander(); return f.phase === 'landed' ? 'BOARDING NOW · LIFTS OFF IN ' + mmss(f.left) : 'LANDS IN ' + mmss(f.k < L_TOUCH ? L_TOUCH - f.k : L_CYCLE - f.k + L_TOUCH); }

/** Why you can't use the map to go anywhere right now (null: you can). */
export function blockedWhy(): string | null {
  if (!game.playing || game.editing) return 'Not yet!';
  if (game.switching) return 'Hold on, still getting there...';
  if (zoneNow() === 'flying') return "You're mid-flight! Wait until you've landed";
  if (hsFrozen()) return "You're IT: count first, then go and find them!";
  if (game.me.pose === POSE_BOAT) return 'Row back to the jetty first';
  if (perf) return 'Finish your song first!';
  return null;
}

/** Where picking place `id` on the map takes you (`pod`: from the station, the ESCAPE POD instead of the rocket). */
export function routeTo(id: RoomId, pod = false): Route {
  const pl = placeById(id);
  if (!pl) return { ok: false, why: 'That isn\'t on the map' };
  const why = blockedWhy(); if (why) return { ok: false, why };
  if (!pl.pick) return { ok: false, why: 'Suit up at the SPACE STATION\'s AIRLOCK to go out there' };
  const z = zoneNow(), here = game.room.id;
  if (pl.zone === z) {
    if (placeOfRoom(here) === id && !isFlat(here)) return { ok: false, why: 'You\'re already here!' };
    return { ok: true, to: id, at: frontDoor(id), note: 'WALK IN', ride: false };
  }
  if (z === 'earth') return { ok: true, to: 'roof', at: PAD_ARRIVE, note: 'BY ROCKET · ' + rocketUp(), ride: true };
  if (z === 'orbit') {
    if (pl.zone === 'moon') return { ok: true, to: 'station', at: LANDER_BAY_ARRIVE, note: 'BY LANDER · ' + landerOut(), ride: true };
    if (pod) return { ok: true, to: 'park', at: podLanding(), note: 'ESCAPE POD · STRAIGHT TO THE PARK', ride: false };
    return { ok: true, to: 'station', at: DOCK_ARRIVE, note: 'BY ROCKET · ' + rocketHome(), ride: true };
  }
  return { ok: true, to: 'moon', at: MOON_PAD_ARRIVE, note: 'BY LANDER · ' + landerHome(), ride: true };
}

/** The place WHO'S ONLINE's GO heads for, to join someone in room `room`. */
export function placeForPerson(room: RoomId): RoomId {
  if (isFlat(room)) return 'lofts'; // (whose flat it is isn't in the lobby: the Lofts' lift knows)
  if (room === 'spacewalk') return 'station';
  if (room === 'rocket') return flight().phase === 'pad' ? 'roof' : 'station';
  if (room === 'lander') return lander().phase === 'landed' ? 'moon' : 'station';
  return room;
}
/** Go by route `rt`: through a door, as it were. A ride's door says when it goes. */
export function travel(rt: Route & { ok: true }): void {
  game.leaveTo(rt.to, rt.at);
  if (rt.ride) setTimeout(() => toast(rt.note, 4500), 450);
}
/** GO (WHO'S ONLINE): to someone in room `room`, by the map's rules. On the train, you hop on with them. */
export function goToRoom(room: RoomId): void {
  if (room === 'train') { const why = blockedWhy(); if (why || zoneNow() !== 'earth') { toast(why ?? 'The train is down on Earth: take a ride home first'); return; } game.leaveTo('train', null); return; }
  const rt = routeTo(placeForPerson(room));
  if (!rt.ok) { toast(rt.why); return; }
  if (isFlat(room)) setTimeout(() => toast('They\'re in a flat: take the LIFT to knock', 4000), 450);
  travel(rt);
}

// ---- where you've been ----
/** The first time: count the places your save shows you must have been (from before the map). */
function seedVisits(): string[] {
  const d = save.data, st = d.stats, out = new Set<string>();
  const add = (...ids: string[]) => ids.forEach((i) => out.add(i));
  if (st.commits) add('den');
  if (st.rides) add('subway');
  if (st.flights || st.station || st.melons || d.sky.length) add('roof', 'station');
  if (st.walked) add('spacewalk');
  if (st.moon || st.moonwalks || st.buggyLaps) add('moon');
  if (st.base || st.moonrocks) add('moon', 'moonbase');
  if (st.harvests || st.helped || d.crops.length || d.stars.length) add('roof');
  if (d.fish.length || st.stormFish) add('pier');
  if (d.hi > 0 || st.pongWins || st.tankWins) add('arcade');
  if (st.kartRaces || st.kartWins) add('karts');
  if (st.dinerBest || st.dinerTour) add('diner');
  if (st.furniture || st.parties) add('lofts');
  return [...out];
}
/** You arrived in room `id`: mark its place as visited (and maybe the EXPLORER badge). */
export function mapArrive(id: RoomId): void {
  const p = placeOfRoom(id);
  const add = [...(save.data.places.length ? [] : seedVisits()), ...(p ? [p] : [])].filter((x) => !save.data.places.includes(x));
  if (!add.length) return;
  save.update((d) => { d.places = [...new Set([...d.places, ...add])]; });
  quests.checkBadges();
}

// ---- opening it ----
/** Body colours of people you've seen (the lobby only says who's where; a dot you haven't met yet is cream). */
const seenCol = new Map<string, RGB>();
const CREAM: RGB = [232, 216, 192];
const previews = new Map<string, HTMLCanvasElement>();
/** Where each place's little look inside is centred (x), when the middle of the room isn't its best side. */
const LOOK_X: Partial<Record<RoomId, number>> = { plaza: 560, roof: 1500, station: 900, lofts: 495, pier: 700, park: 700, karts: 600, moon: 700, diner: 500, subway: 600, parkstn: 600, dinerstn: 600, kartstn: 600 };
/** ...and how much higher than usual, where a room's best bits are up on the wall (a platform's name board, the Lofts' directory). */
const LOOK_UP: Partial<Record<RoomId, number>> = { subway: 44, parkstn: 44, dinerstn: 44, kartstn: 44, lofts: 44 };
/** A little look inside a place, as it is right now: its wall and floor edge (the detailed part) with everything
 * that moves and stands there, and its lights, drawn off-screen the way the game draws a room, then shrunk. */
export function preview(id: RoomId): HTMLCanvasElement | null {
  const rm = game.rooms[id], sh = Math.min(rm.h, 176), sw = Math.min(rm.w, Math.round(sh * 16 / 9)), cx = LOOK_X[id] ?? rm.w / 2;
  const sx = clamp(Math.round(cx - sw / 2), 0, rm.w - sw), sy = clamp(rm.floor.y0 - sh + 36 - (LOOK_UP[id] ?? 0), 0, rm.h - sh), a = now();
  const full = previews.get('full') && previews.get('full')!.width === sw && previews.get('full')!.height === sh ? previews.get('full')! : mk(sw, sh);
  const glow = previews.get('glow') && previews.get('glow')!.width === Math.ceil(sw / 2) ? previews.get('glow')! : mk(Math.ceil(sw / 2), Math.ceil(sh / 2));
  previews.set('full', full); previews.set('glow', glow);
  const g = full.getContext('2d')!, gg = glow.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, sw, sh); g.globalAlpha = 1; g.imageSmoothingEnabled = false;
  gg.setTransform(1, 0, 0, 1, 0, 0); gg.globalCompositeOperation = 'source-over'; gg.clearRect(0, 0, glow.width, glow.height); gg.setTransform(0.5, 0, 0, 0.5, -sx / 2, -sy / 2); gg.globalCompositeOperation = 'lighter';
  const keep = { ctx: PX.ctx, glow: PX.glow, dim: PX.dim, emit: PX.emit, fl: PX.fl, gmul: PX.gmul };
  try {
    PX.glow = gg; PX.dim = rm.dimNow?.() ?? rm.dim; PX.emit = false; PX.fl = 0; PX.gmul = rm.glowMul?.() ?? 1;
    withCtx(g, () => {
      g.setTransform(1, 0, 0, 1, -sx, -sy);
      g.drawImage(rm.bg, 0, 0); const k = rm.altAlpha?.() ?? 0; if (rm.bgAlt && k > 0.001) { g.globalAlpha = k; g.drawImage(rm.bgAlt, 0, 0); g.globalAlpha = 1; }
      rm.drawBack(a); for (const pr of [...rm.props].sort((p, q) => p.y - q.y)) pr.draw(a); rm.drawFront?.(a);
    });
  } catch (e) { console.warn('[map preview]', id, e); } finally { Object.assign(PX, keep); g.setTransform(1, 0, 0, 1, 0, 0); gg.setTransform(1, 0, 0, 1, 0, 0); gg.globalCompositeOperation = 'source-over'; }
  // its lights: blurred and screened over, like the game's glow layer
  g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.85; g.filter = 'blur(1px)'; g.imageSmoothingEnabled = true; g.drawImage(glow, 0, 0, glow.width, glow.height, 0, 0, sw, sh); g.filter = 'none'; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  const c = mk(156, Math.round(156 * sh / sw)), cg = c.getContext('2d')!; cg.imageSmoothingEnabled = false; cg.drawImage(full, 0, 0, c.width, c.height);
  return c;
}
/** The line under the map's title: the server, the time of day, the weather, the season. */
function statusLine(server: string): string {
  const p = (Date.now() / 1000 / 1200) % 1, d = dayness(), w = weather();
  const time = d <= 0.01 ? 'NIGHT' : d >= 0.99 ? 'DAY' : p < 0.6 ? 'DAWN' : 'DUSK';
  return [server, time, w.kind !== 'clear' && w.k > 0.3 ? w.kind.toUpperCase() : 'CLEAR SKIES', isHalloween() ? 'HALLOWEEN' : isWinter() ? 'WINTER' : ''].filter(Boolean).join(' · ');
}

/**
 * Open the map (`board`: the board you're at, for its YOU ARE HERE star). `friends`: your starred players,
 * `server`: this server's name.
 */
export function openCityMap(board: RoomId | null, friends: Map<string, string>, server: string): void {
  if (mapOpen() || modalOpen() || !game.playing || game.editing) return;
  const lofts = { parties: [] as { id: string; name: string }[] };
  const ids = game.lobby.map((p) => p.id);
  if (ids.length) game.net.api.flats.doors(ids).then((ds) => { const now = Date.now() / 1000; lofts.parties = ds.filter((d) => d.party && d.party > now && d.can).map((d) => ({ id: d.owner, name: game.lobby.find((p) => p.id === d.owner)?.name ?? d.name })); }).catch(() => {});
  const inPlace = (id: RoomId) => game.lobby.filter((p) => placeOfRoom(p.room) === id || (id === 'station' && p.room === 'spacewalk'));
  openMapPanel({
    board, touch: game.isTouch,
    status: () => statusLine(server || 'LAB HANGOUT'),
    live: () => {
      for (const o of game.others.values()) seenCol.set(o.id, BODY[o.look.c]?.c ?? CREAM);
      const hiding = !!hsOn();
      return {
        people: hiding ? [] : game.lobby.map((p) => ({ id: p.id, name: p.name, room: p.room, friend: friends.has(p.id), col: seenCol.get(p.id) ?? CREAM })),
        me: { col: BODY[game.me.look.c]?.c ?? CREAM, room: game.room.id }, hiding,
        seen: new Set(save.data.places), flats: game.lobby.filter((p) => isFlat(p.room)).length + (isFlat(game.room.id) ? 1 : 0), party: lofts.parties.length > 0,
      };
    },
    card: (id) => {
      const rm = game.rooms[id], pl = placeById(id)!, rt = routeTo(id), z = zoneNow();
      const ppl = hsOn() ? [] : inPlace(id).sort((p, q) => Number(friends.has(q.id)) - Number(friends.has(p.id)));
      const names = ppl.slice(0, 4).map((p) => p.name + (friends.has(p.id) ? ' ★' : '')).join(', ') + (ppl.length > 4 ? ' +' + (ppl.length - 4) + ' more' : '');
      const you = placeOfRoom(game.room.id) === id;
      const people = hsOn() ? 'Hide and seek is on: no peeking!' : ppl.length ? (you ? 'You and ' : 'Here: ') + names : you ? 'Just you here' : 'Nobody here right now';
      const extras: { label: string; run: () => void }[] = [];
      if (id === 'lofts' && z === 'earth' && !blockedWhy()) { extras.push({ label: 'YOUR FLAT', run: () => void goHome() }); for (const p of lofts.parties.slice(0, 2)) extras.push({ label: 'PARTY: ' + p.name.toUpperCase(), run: () => void visitFlat(p.id) }); }
      if (z === 'orbit' && pl.zone === 'earth' && !blockedWhy()) { const pod = routeTo(id, true); if (pod.ok) extras.push({ label: 'ESCAPE POD', run: () => travel(pod) }); }
      return { cls: id, sub: rm.sub, title: pl.name, preview: () => preview(id), people, route: rt, extras };
    },
    go: (rt) => travel(rt),
  }, () => game.input.clear());
}

/** Each frame: are you up at this room's map board? (It brightens a step, with a soft chime, as you arrive.) */
export function mapStep(): void {
  const s = game.room.spots.find((x) => x.kind === 'map'), near = !!s && game.playing && !game.switching && Math.hypot(game.me.x - s.sx, game.me.y - s.sy) < 40;
  if (near && BOARD.near < 0) { BOARD.near = now(); SFX.chime(); }
  else if (!near) BOARD.near = -1;
}
