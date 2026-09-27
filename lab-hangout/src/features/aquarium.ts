// THE CITY AQUARIUM (world/aquarium.ts is the room): donating your catches at the curator's desk, the gift shop at the till,
// feeding time (a bell a minute before, the flakes, HELP FEED at the ladder's step: a small 'scoop' broadcast each throw),
// the touch pool, the jelly disco, and the sounds of SARDINE 1 coming and going in the sub pen (game/sub.ts).
// The FISH GALLERY is fetched from the server when you walk in, after anyone donates (room state 'aq' says "look again"),
// and now and then while you're on the Pier (so a catch can tell you it's bigger than the one on show).

import { cap, errText, game, now } from '../app/game';
import { GAL, GALLERY, feeding, FEED_BELL, FEED_EVERY } from '../game/aquarium';
import { dive, SUB_BOARD, SUB_DOWN, SUB_HORN, SUB_UP } from '../game/sub';
import { FISH } from '../game/fish';
import { quests } from '../game/quests';
import { save } from '../game/save';
import { AQR, AQUA, SPOT } from '../world/aquarium';
import { FLAT } from '../world/flat';
import { FURN } from '../world/furniture';
import { itemName } from '../entities/critter';
import { POSE_DANCE } from '../entities/avatar';
import { mmss } from '../engine/format';
import { SFX } from '../audio/sfx';
import { say, toast } from '../ui/overlay';
import { openGallery, openShop } from '../ui/aquarium';

// ---------- the gallery, from the server ----------
let fetching = false, triedAt = 0;
/** Ask the server for the FISH GALLERY (one request at a time, no more than every 4 s), then `then`. */
export function refreshGallery(then?: () => void): void {
  if (fetching || Date.now() - triedAt < 4000) return;
  fetching = true; triedAt = Date.now();
  game.net.api.aquarium.tanks().then((g) => {
    GAL.tanks = new Map(g.tanks.map((t) => [t.fish, t])); GAL.best = g.best; GAL.mine = g.mine; GAL.fetchedAt = Date.now(); GAL.dirty = false;
    quests.checkBadges(); then?.();
  }).catch((e: unknown) => console.warn('[aquarium]', e)).finally(() => { fetching = false; });
}
/** A line from MARINA, if she's in (she reacts to donations). */
function marina(text: string): void { const n = game.npcs.byId('npc-marina'); if (n && game.npcs.inRoom('aquarium').includes(n)) say(n.av.id, text, now(), false); }

// ---------- THE CURATOR'S DESK ----------
export function openDonate(i: number): void {
  SFX.blip();
  const panel = openGallery({
    now: () => GAL,
    donate: (fish) => game.net.api.aquarium.donate(fish).then((r) => {
      game.setTokens(r.tokens); GAL.dirty = true; GAL.mine[fish] = Math.max(GAL.mine[fish] ?? 0, r.cm);
      if (r.plaque) GAL.tanks.set(fish, { fish, name: game.me.name, cm: r.cm, at: Date.now() / 1000 });
      SFX.splash(); setTimeout(() => SFX.score(), 350);
      const rar = FISH.find((f) => f.name === fish)?.rarity ?? 'COMMON';
      if (r.plaque) { game.celebrate(); toast('Your ' + fish + ' (' + r.cm + ' cm) is on show in the gallery!' + (r.prev ? ' It took the plaque from ' + r.prev + '.' : '') + (r.paid ? ' +' + r.paid + ' tokens' : ''), 5000); }
      else toast('Thanks! The tank keeps its bigger one, but your ' + fish + ' goes in the records.' + (r.paid ? ' +' + r.paid + ' tokens' : ''), 4500);
      if (r.paid) game.floatText('+' + r.paid);
      marina(r.plaque ? (rar === 'LEGENDARY' ? 'A ' + fish + '! into the tank it goes!' : fish === 'OLD BOOT' ? 'a boot! i love it. it is the best boot' : 'lovely! in you go, little ' + fish.toLowerCase()) : 'thank you! every catch counts');
      quests.bump('donate'); quests.checkBadges();
      game.setState({ k: 'aq', v: { n: Date.now() } }); // everyone in here looks again
    }).catch((e: unknown) => { SFX.nope(); toast(cap(errText(e)), 3500); }),
  }, game.closeSpot(i));
  GAL.dirty = true; triedAt = 0; refreshGallery(() => panel.redraw());
}

// ---------- THE GIFT SHOP ----------
export function openGiftShop(i: number): void {
  SFX.blip();
  openShop({
    tokens: () => game.tokens,
    owns: (item) => save.has(item),
    look: () => game.me.look,
    buy: (item) => game.net.api.aquarium.buy(item).then((r) => { game.setTokens(r.tokens); save.addPrize(item); SFX.score(); toast('Yours: the ' + itemName(item) + '! Put it on with Look, or WEAR it here', 4000); })
      .catch((e: unknown) => { SFX.nope(); toast(cap(errText(e)), 3500); }),
    buyFurn: (id) => game.net.api.flats.buy(id).then((r) => { game.setTokens(r.tokens); if (FLAT.owned) FLAT.owned[id] = r.n; SFX.score(); toast('A ' + (FURN.get(id)?.name ?? id) + " for your flat! It's in DECORATE's MY STUFF", 4000); return r.n; })
      .catch((e: unknown) => { SFX.nope(); toast(cap(errText(e)), 3500); return 0; }),
    wear: (item) => game.wear(item),
  }, game.closeSpot(i));
}

// ---------- THE TOUCH POOL ----------
const TOUCH: { line: string; emote: 'huh' | 'hop' | 'laugh' | 'wow' | 'cry'; sfx: () => void }[] = [
  { line: "The starfish. It's rough, like a cat's tongue", emote: 'wow', sfx: () => SFX.pop() },
  { line: 'SNIP! The crab got you. It seems pleased with itself', emote: 'hop', sfx: () => { SFX.squeak(); SFX.pop(); } },
  { line: 'The sea cucumber squirts you. Lovely', emote: 'laugh', sfx: () => SFX.pour() },
  { line: 'The hermit crab pops back into its shell. Shy', emote: 'huh', sfx: () => SFX.blub() },
  { line: 'OUCH. Maybe not the urchin', emote: 'cry', sfx: () => SFX.hurt() },
];
export function touchPool(): void {
  const t = TOUCH[Math.floor(Math.random() * TOUCH.length)];
  t.sfx(); game.celebrate(t.emote); toast(t.line, 3000);
}

// ---------- FEEDING TIME ----------
export function feedFish(): void {
  const f = feeding();
  if (!f.on) { toast('Feeding time is every 15 minutes (:00, :15, :30, :45). Next one in ' + mmss(f.next), 3200); SFX.nope(); return; }
  if (!game.emote('feed')) return;
  const x = AQR.tank0 + 60 + Math.random() * (AQR.tank1 - AQR.tank0 - 120);
  AQUA.scoops.push({ x, t0: performance.now() / 1000 + 0.4 }); game.net.send('scoop', { x });
  setTimeout(() => SFX.splash(), 400);
  quests.bump('feeding');
}
/** Someone else threw a scoop in. */
export function onScoop(x: number): void {
  if (game.room.id !== 'aquarium' || x < AQR.tank0 || x > AQR.tank1) return;
  AQUA.scoops.push({ x, t0: performance.now() / 1000 + 0.4 });
  if (AQUA.scoops.length > 40) AQUA.scoops.shift();
}

// ---------- every frame ----------
let fedKey = -1, bellKey = -1, discoWas = false, discoToast = -99, subKey = '', feedEmote = 0, pierFetch = 0;
export function aqEntered(): void { GAL.dirty = true; triedAt = 0; AQUA.scoops.length = 0; }
export function aqStep(): void {
  const id = game.room.id, t = now();
  // the Pier keeps a copy of the gallery now and then, so a catch can say it beats the one on show
  if (id === 'pier' && game.playing && Date.now() - pierFetch > 300000) { pierFetch = Date.now(); triedAt = 0; refreshGallery(); }
  if (id !== 'aquarium') return;
  const c = game.R.cam; AQUA.view = { x0: c.x, x1: c.x + c.w, y0: c.y, y1: c.y + c.h };
  if (game.playing && (GAL.dirty || Date.now() - GAL.fetchedAt > 120000)) refreshGallery();
  // FEEDING TIME: a bell a minute before, then the food goes in (MARINA throws it in from the top)
  const f = feeding();
  if (!f.on && f.next <= FEED_BELL && bellKey !== f.n) { bellKey = f.n; SFX.bell(); toast('FEEDING TIME in a minute! By the ladder at the ocean tank', 3500); }
  if (f.on && fedKey !== f.n && f.k < 3) { fedKey = f.n; SFX.bell(); SFX.splash(); toast('FEEDING TIME! Stand by the ladder and FEED to help', 4000); }
  const m = game.npcs.byId('npc-marina');
  // MARINA feeds from the top of the ladder: a throw every few seconds while she's up there
  if (f.on && m && t - feedEmote > 2.6 && m.av.y < 400) { feedEmote = t; m.av.emote = { kind: 'feed', t0: t }; AQUA.scoops.push({ x: AQR.tank0 + 80 + Math.random() * (AQR.tank1 - AQR.tank0 - 160), t0: performance.now() / 1000 + 0.4 }); }
  const T = performance.now() / 1000; while (AQUA.scoops.length && T - AQUA.scoops[0].t0 > 9) AQUA.scoops.shift();
  // the jelly disco: three or more dancing in the jelly room
  AQUA.jellyDancers = game.everyone().filter((av) => av.pose === POSE_DANCE && !av.moving && av.x > AQR.jelly && av.x < AQR.pen).length;
  const disco = AQUA.jellyDancers >= 3;
  if (disco && !discoWas && t - discoToast > 30) { discoToast = t; SFX.disco(); toast('JELLY DISCO! The jellies are dancing with you', 3500); }
  discoWas = disco;
  // SARDINE 1 in the pen: the horn a half minute before, the hatch, the ballast; bubbles as it comes back up
  const d = dive(), key = d.n + ':' + (d.k >= SUB_UP ? 'up' : d.k >= SUB_DOWN ? 'out' : d.k >= SUB_BOARD ? 'down' : d.k >= SUB_HORN ? 'horn' : 'in'), near = game.me.x > AQR.pen - 200;
  if (key !== subKey) {
    const first = subKey === ''; subKey = key;
    if (!first && near) {
      if (key.endsWith('horn')) { SFX.foghorn(); toast('SARDINE 1 dives in 30 seconds (SEA TRIALS: no passengers yet)', 3500); }
      else if (key.endsWith('down')) { SFX.clang(); setTimeout(() => SFX.gurgle(), 400); }
      else if (key.endsWith('up')) { SFX.gurgle(); setTimeout(() => SFX.splash(), 1200); }
    }
  }
}
/** Your catch against the one on show: what the Pier's catch toast adds (or ''). */
export function catchVsGallery(fish: string, cm: number): string {
  if (!GAL.fetchedAt || !GALLERY.includes(fish)) return '';
  const t = GAL.tanks.get(fish);
  if (!t) return ' · THE AQUARIUM WANTS ONE!';
  return cm > t.cm && !(fish in GAL.mine && GAL.mine[fish] >= cm) ? " · BIGGER THAN THE AQUARIUM'S!" : '';
}
export const aqDebug = () => ({ view: { ...AQUA.view }, tanks: [...GAL.tanks.values()], best: GAL.best, mine: GAL.mine, fetchedAt: GAL.fetchedAt, dirty: GAL.dirty, scoops: AQUA.scoops.length, dancers: AQUA.jellyDancers, feeding: feeding(), dive: dive(), spot: SPOT, every: FEED_EVERY });
