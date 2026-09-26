// THE ARCADE's games, the playing part (world/arcade.ts draws the room, ui/claw.ts ui/pong.ts ui/tanks.ts
// ui/arcade.ts are the games themselves): the claw machine, 2-player Pong, TANK DUEL, and SLOP INVADERS'
// high score (the Lab's cabinet or the Arcade's).

import { game, now } from '../app/game';
import { LAB_INFO } from '../world/lab';
import { ARCADE_INFO, PONG_SPOTS, TANK_SPOTS, pongSeen, tankSeen } from '../world/arcade';
import { openTanks, type TankHandle } from '../ui/tanks';
import { quests } from '../game/quests';
import { openClaw } from '../ui/claw';
import { openPong, type PongHandle } from '../ui/pong';
import { save } from '../game/save';
import { say, toast } from '../ui/overlay';
import { SFX } from '../audio/sfx';

// ---------- the Arcade: the claw machine, Pong, TANK DUEL, the SLOP INVADERS high score ----------
export function endArcade(score: number): void {
  game.input.clear();
  if (game.me.use >= 0 && game.usingOf(game.me) === 'arcade') game.leaveSpot();
  if (score <= 0) return;
  const roomBest = roomHi()?.score ?? 0;
  if (score > save.data.hi) save.update((d) => { d.hi = score; });
  if (score > roomBest) { game.setState({ k: 'hi', v: { name: game.me.name, score } }); say(game.net.selfId, 'NEW HI SCORE: ' + score + '!', now(), true); SFX.score(); game.emote('joy'); }
  else say(game.net.selfId, 'SCORE: ' + score, now(), true);
}
/** The SLOP INVADERS high score of the cabinet you're at (the Lab's or the Arcade's). */
export const roomHi = () => (game.room.id === 'arcade' ? ARCADE_INFO.hi : LAB_INFO.hi);
export function openClawMachine(i: number): void {
  openClaw({
    play: async () => { const r = await game.net.api.arcade.playClaw(); game.setTokens(r.tokens); return r; },
    look: () => game.me.look,
    wear: game.wear,
    started: () => { ARCADE_INFO.clawT = now(); game.celebrate('wow'); quests.bump('claw'); },
    won: (r) => { if (!r.dupe) { save.addPrize(r.item); game.setState({ k: 'claw', v: { name: game.me.name, item: r.item } }); } },
    onClose: game.closeSpot(i),
  });
}
/** Whoever is standing at spot `spot` (the other side of a Pong table or a tank cabinet). */
const seatedAt = (spot: number): { id: string; name: string } | null => { for (const o of game.others.values()) if (o.use === spot) return { id: o.id, name: o.name }; return null; };
export let pong: PongHandle | null = null;
export function startPong(i: number): void {
  const side = (PONG_SPOTS[0] === i ? 0 : 1) as 0 | 1, other = PONG_SPOTS[1 - side];
  pong = openPong({
    side, myName: game.me.name,
    opponent: () => seatedAt(other),
    send: (p) => { game.net.send('pong', p); pongSeen(p); },
    over: (winner) => {
      const ch = ARCADE_INFO.champ;
      game.setState({ k: 'champ', v: { name: winner, wins: ch && ch.name === winner ? ch.wins + 1 : 1 } });
      if (winner === game.me.name) { game.celebrate(); }
    },
    won: () => { quests.bump('pong'); quests.stat('pongWins'); },
    onClose: () => { pong = null; game.input.clear(); if (game.me.use === i) game.leaveSpot(); },
  });
}
export let tank: TankHandle | null = null;
export function startTank(i: number): void {
  const side = (TANK_SPOTS[0] === i ? 0 : 1) as 0 | 1, other = TANK_SPOTS[1 - side];
  tank = openTanks({
    side, myName: game.me.name,
    opponent: () => seatedAt(other),
    send: (m) => { game.net.send('tank', m); tankSeen(m); },
    won: (vsCpu) => { quests.bump('tank'); quests.stat('tankWins'); game.celebrate(); toast(vsCpu ? 'You beat the CPU!' : 'TANK DUEL CHAMPION!', 3000); },
    onClose: () => { tank = null; game.input.clear(); if (game.me.use === i) game.leaveSpot(); },
  });
}
