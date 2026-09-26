// THE KART TRACK, the playing part (game/kart.ts drives, ui/race.ts shows the race, world/karts.ts draws the
// pits): starting a race from a kart in the pits, joining one on the grid, who answers join requests, when a race
// is over, and the fastest-lap board.

import { game, now } from '../app/game';
import { quests } from '../game/quests';
import { KARTS } from '../world/karts';
import { openRace, type RaceHandle } from '../ui/race';
import { LOBBY_S, MAX_RACERS, RACE_MAX_S, TRACKS, ordinal, raceTime, trackOf } from '../game/kart';
import type { RaceState } from '../net/transport';
import { toast } from '../ui/overlay';
import { SFX } from '../audio/sfx';

// ---------- the Kart Track (game/kart.ts, ui/race.ts, world/karts.ts) ----------
export let raceUI: RaceHandle | null = null;
/** Your finish in the race with this t0 (so we know when everyone's done). */
let myRaceFin = { r: 0, fin: 0 };
/** Whoever started the race answers join requests (or, if they've gone, the first racer still here). */
export const runsRace = (rc: RaceState): boolean => rc.host === game.net.selfId || (!game.others.has(rc.host) && [game.net.selfId, ...rc.ids.filter((id) => game.others.has(id))].sort()[0] === game.net.selfId);
/** Is this race over (everyone home, gone, or out of time)? */
function raceDone(rc: RaceState): boolean {
  const t = Date.now() - rc.t0; if (t < 0) return false; if (t > RACE_MAX_S * 1000) return true;
  return rc.ids.every((id) => {
    if (id === game.net.selfId) return (myRaceFin.r === rc.t0 && myRaceFin.fin > 0) || !raceUI;
    const L = KARTS.live.get(id); return !L || now() - L.t > 6 || (L.k.r === rc.t0 && L.k.fin > 0);
  });
}
/** Someone started a race while you're in the pits: tell you, so you can grab a kart and join. */
let raceSeen = 0;
export function raceNews(): void {
  const rc = KARTS.race; if (!rc || game.room.id !== 'karts' || !game.playing || rc.t0 === raceSeen) return;
  raceSeen = rc.t0;
  const left = (rc.t0 - Date.now()) / 1000;
  if (left > 1.5 && rc.host !== game.net.selfId && !rc.ids.includes(game.net.selfId) && !raceUI) { toast(rc.names[0] + ' started a race! Grab a kart in the next ' + Math.floor(left) + 's to join', 4000); SFX.join(); }
}
function newRace(): void {
  // the circuits take turns: the seed picks the track (and the CPU karts' pace)
  const next = KARTS.race ? (KARTS.race.seed + 1) % TRACKS.length : Math.floor(Math.random() * TRACKS.length);
  const seed = Math.floor(Math.random() * 9999) * TRACKS.length + next;
  game.setState({ k: 'race', v: { host: game.net.selfId, t0: Date.now() + LOBBY_S * 1000, seed, ids: [game.net.selfId], names: [game.me.name], cols: [game.me.look.c] } });
  SFX.join(); toast(trackOf(seed).name + ': race in ' + LOBBY_S + ' seconds! Others can grab a kart to join', 3500);
}
function joinRace(rc: RaceState): void {
  if (rc.ids.includes(game.net.selfId) || rc.ids.length >= MAX_RACERS || Date.now() > rc.t0 - 500) return;
  if (runsRace(rc)) game.setState({ k: 'race', v: { ...rc, ids: [...rc.ids, game.net.selfId], names: [...rc.names, game.me.name], cols: [...rc.cols, game.me.look.c] } });
  else game.net.send('kart', { r: rc.t0, x: 0, y: 0, a: 0, v: 0, lap: 0, g: 0, c: 0, fin: 0, best: 0, b: 0, d: 0, j: 1 });
}
/** E at a kart in the pits: start a race, join the one about to start, or wait for the one on track. */
export function useKart(i: number): void {
  const rc = KARTS.race, t = rc ? Date.now() - rc.t0 : Infinity;
  if (rc && t < 0) {
    if (!rc.ids.includes(game.net.selfId) && rc.ids.length >= MAX_RACERS) { toast('The grid is full! Watch this one on the big screen'); game.leaveSpot(); return; }
    joinRace(rc);
  } else if (rc && !raceDone(rc)) toast('A race is on: you are watching this one. RACE AGAIN when it ends to start the next!', 4000);
  else newRace();
  SFX.sit();
  raceUI = openRace({
    selfId: game.net.selfId, myName: game.me.name, myCol: game.me.look.c,
    race: () => KARTS.race,
    send: (k) => { game.net.send('kart', k); KARTS.live.set(game.net.selfId, { k, t: now() }); },
    join: joinRace,
    finished: (place, ms, best) => {
      const rc2 = KARTS.race; myRaceFin = { r: rc2?.t0 ?? 0, fin: ms };
      quests.bump('kart'); quests.stat('kartRaces');
      if (place === 1) { quests.stat('kartWins'); game.celebrate(); }
      toast((place === 1 ? 'YOU WIN! ' : 'FINISHED ' + ordinal(place) + '! ') + raceTime(ms) + (best ? ' · best lap ' + raceTime(best) : ''), 5000);
      const ti = rc2 ? TRACKS.indexOf(trackOf(rc2.seed)) : 0, rec = KARTS.best[ti];
      if (best && (!rec || best < rec.ms)) { const recs = TRACKS.map((_, i) => KARTS.best[i] ?? null); recs[ti] = { name: game.me.name, ms: best }; game.setState({ k: 'kartbest', v: recs }); setTimeout(() => toast('FASTEST LAP ON ' + TRACKS[ti].name + '! Your name is on the board', 4000), 5200); }
    },
    again: () => { const r2 = KARTS.race; if (r2 && Date.now() < r2.t0) return; if (r2 && !raceDone(r2)) { toast('Wait for everyone to cross the line'); return; } newRace(); },
    onClose: () => { raceUI = null; game.input.clear(); if (game.me.use === i) game.leaveSpot(); },
  });
}

