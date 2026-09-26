// WINTER, the playing part (world/winter.ts draws it, ui/winter.ts has its panels, 0018_winter.sql keeps score):
// the tree (ornaments, Secret Santa presents), the present hunt, the advent calendar, the Park's snowman,
// snowball fights, Santa's sleigh drops, the tree lighting and New Year's Eve.

import { game, now, errText, cap } from '../app/game';
import { r } from '../engine/pixel';
import { quests } from '../game/quests';
import { OUTDOORS } from '../world/weather';
import { isWinter } from '../world/season';
import { WINTER, PRESENTS, SNOWMAN_ROLLS, SNOW_DECO, drops, nye, onIce, sleigh, lightShow } from '../world/winter';
import { openAdvent, openSendGift, openTree, showGift } from '../ui/winter';
import { mmss } from '../engine/format';
import { save } from '../game/save';
import { itemName } from '../entities/critter';
import { ENV, HOLD_SNOWBALL, type Avatar } from '../entities/avatar';
import { type SnowballMsg, type TreeGift } from '../net/transport';
import { toast } from '../ui/overlay';
import { SFX } from '../audio/sfx';

// ---------- WINTER (world/winter.ts, ui/winter.ts, 0018_winter.sql) ----------
let giftsMine = -1, fightDone = -1, lightHeard = -1, bellsHeard = -1, nyeHeard = -1, lastThrow = -9;
export const fightHits = new Map<string, { name: string; n: number }>();
const balls: { from: string; b: SnowballMsg; t0: number; landed: boolean }[] = [];
/** The tree (ornaments, presents), your present hunt, the advent calendar: fetched on the Square / in the Lab, and now and then. */
export async function refreshWinter(): Promise<void> {
  if (!isWinter() || !game.playing) return;
  WINTER.treeAt = Date.now(); WINTER.treeDirty = false;
  try { WINTER.presents = new Set(await game.net.presentsToday()); } catch { /* later */ }
  try { WINTER.advent = await game.net.adventDoors(); } catch { /* later */ }
  await refreshTree();
}
async function refreshTree(): Promise<void> {
  try { WINTER.ornaments = await game.net.ornaments(); } catch { /* later */ }
  try {
    WINTER.gifts = await game.net.treeGifts(); const mine = WINTER.gifts.filter((g) => g.mine).length;
    if (giftsMine >= 0 && mine > giftsMine) { toast('A present for you is waiting under the tree in the Square!', 5000); SFX.bells(); }
    giftsMine = mine;
  } catch { /* later */ }
}
const prizeName = (p: string): string => (p.startsWith('tokens:') ? '+' + p.slice(7) + ' TOKENS' : itemName(p));
/** The present hunt: open present n. */
export function openPresent(n: number): void {
  if (WINTER.presents.has(n)) { toast('You already opened this one today. More tomorrow!', 2500); return; }
  game.net.findPresent(n).then((r) => {
    WINTER.presents.add(n); game.setTokens(r.tokens); SFX.chime(); game.floatText('+1', PRESENTS[n].x, PRESENTS[n].y - 30);
    toast('A PRESENT! +1 token (' + r.found + '/12 found today)', 3000);
    game.seasonPrize(r.prize, 'ALL 12 PRESENTS!', 'winter prize');
  }).catch((e: unknown) => { const m = errText(e); if (/already/.test(m)) WINTER.presents.add(n); toast(cap(m), 3000); });
}
export function adventMenu(): void {
  SFX.blip(); void game.net.adventDoors().then((d) => { WINTER.advent = d; }).catch(() => {});
  openAdvent({ open: (d) => game.net.openAdvent(d).then((r) => { game.setTokens(r.tokens); if (!r.prize.startsWith('tokens:')) { save.addPrize(r.prize); SFX.score(); game.celebrate(); toast('Behind door ' + d + ': the ' + itemName(r.prize) + '! (Look menu)', 6000); } else SFX.chime(); return r; }), prizeName }, () => game.input.clear());
}
/** Everyone on the server you could send a present to. */
const giftPeople = (): { id: string; name: string }[] => game.lobby.filter((p) => p.id !== game.net.selfId).map((p) => ({ id: p.id, name: p.name }));
export function sendGiftTo(preset: string | null): void {
  openSendGift(giftPeople(), preset, game.tokens, (to, tk, wrap, nt) => game.net.sendGift(to, tk, wrap, nt).then((bal) => { game.setTokens(bal); SFX.bells(); toast('Wrapped and under the tree! They\'ll find out who from when they open it', 4500); void refreshTree(); }), () => game.input.clear());
}
function openTreeGift(g: TreeGift): void {
  game.net.openGift(g.id).then((r) => { game.setTokens(r.tokens); SFX.joy(); game.celebrate(); showGift(r, g.wrap, () => game.input.clear()); void refreshTree(); }).catch((e: unknown) => toast(errText(e), 3500));
}
export function treeMenu(): void {
  SFX.blip(); void refreshTree();
  openTree({ hang: (k, x, y) => game.net.hangOrnament(k, x, y).then(() => { SFX.chime(); void refreshTree(); }), gifts: () => WINTER.gifts, openGift: openTreeGift, send: () => sendGiftTo(null) }, () => game.input.clear());
}
/** The Park's snowman: roll it up (everyone's rolls add up), then dress it. Starts again every day. */
export function rollSnowman(): void {
  const day = Math.floor(Date.now() / 86400000), cur = WINTER.snowman.day === day ? WINTER.snowman : { day, rolls: 0, deco: 0 };
  if (cur.rolls < SNOWMAN_ROLLS) {
    const rolls = cur.rolls + 1; game.setState({ k: 'snowman', v: { day, rolls, deco: cur.deco } }); SFX.scoop();
    if (rolls === SNOWMAN_ROLLS) { SFX.score(); toast('The snowman is built! Now dress him up (E)', 4000); }
    else toast(rolls < 12 ? 'Rolling the big ball...' : rolls < 22 ? 'Rolling the middle...' : 'Rolling his head...', 1200);
    return;
  }
  if (cur.deco < 31) { let i = 0; while (cur.deco & (1 << i)) i++; const deco = cur.deco | (1 << i); game.setState({ k: 'snowman', v: { day, rolls: cur.rolls, deco } }); SFX.pop(); toast('You gave him ' + SNOW_DECO[i] + (deco === 31 ? '. He\'s perfect!' : ''), 2500); if (deco === 31) { game.celebrate(); } return; }
  toast('Isn\'t he lovely? He melts at midnight (a new one tomorrow)', 3000);
}
export function startSnowfight(): void {
  const f = WINTER.snowfight; if (f && Date.now() - f.t0 < 90000) { toast('A snowball fight is on! Scoop snow (E) and throw it at people', 3000); return; }
  game.setState({ k: 'snowfight', v: { t0: Date.now(), by: game.me.name } }); SFX.bells(); toast('SNOWBALL FIGHT! 90 seconds: most hits wins. Scoop snow (E), then throw (E)', 5000);
}
export function scoopSnow(): void { if (game.me.hold) return; game.me.hold = HOLD_SNOWBALL; game.me.sips = 0; game.sendMe(); SFX.scoop(); }
/** Who you'd throw at: the nearest person (player, NPC or bot) in front of you, within range. */
export function snowTarget(): Avatar | null {
  let best: Avatar | null = null, bd = 1e9;
  for (const av of [...game.others.values(), ...game.npcs.inRoom(game.room.id).map((n) => n.av)]) {
    if (game.hidden(av, now())) continue; const dx = av.x - game.me.x, dy = av.y - game.me.y, d = Math.hypot(dx, dy * 1.5);
    if (d > 240 || d < 6) continue; const facing = Math.sign(dx) === game.me.dir ? 0 : 60; if (d + facing < bd) { bd = d + facing; best = av; }
  }
  return best;
}
export function throwSnowball(): void {
  const t = now(); if (game.me.hold !== HOLD_SNOWBALL || t - lastThrow < 0.5) return; lastThrow = t;
  const tg = snowTarget(), miss = !!tg && Math.random() < 0.15;
  const x1 = tg ? tg.x + (miss ? (Math.random() < 0.5 ? -22 : 22) : 0) : game.me.x + game.me.dir * 140, y1 = tg ? tg.y : game.me.y + 4;
  const b: SnowballMsg = { x0: game.me.x, y0: game.me.y, x1: Math.max(0, x1), y1, hit: tg && !miss && !tg.npc ? tg.id : '' };
  if (tg) game.me.dir = tg.x < game.me.x ? -1 : 1;
  game.me.hold = 0; game.sendMe(); SFX.toss(); game.net.sendSnowball(b); flyBall(game.net.selfId, b);
  if (tg && !miss && tg.npc) setTimeout(() => { tg.splat = now(); }, 450);
}
/** A snowball in the air (yours or someone else's): lands 0.45 s later; a hit splats whoever it was for. */
export function flyBall(from: string, b: SnowballMsg): void {
  balls.push({ from, b, t0: now(), landed: false });
  const f = WINTER.snowfight;
  if (b.hit && f && Date.now() - f.t0 < 90000) { const nm = from === game.net.selfId ? game.me.name : game.others.get(from)?.name ?? '?', c = fightHits.get(from); fightHits.set(from, { name: nm, n: (c?.n ?? 0) + 1 }); }
  if (from === game.net.selfId && b.hit) quests.stat('snowhits');
}
function ballStep(): void {
  const t = now();
  for (let k = balls.length - 1; k >= 0; k--) {
    const bl = balls[k], u = (t - bl.t0) / 0.45;
    if (u >= 1 && !bl.landed) {
      bl.landed = true;
      if (bl.b.hit === game.net.selfId) { game.me.splat = t; SFX.splat(); const nm = game.others.get(bl.from)?.name ?? 'Someone'; toast('SPLAT! ' + nm + ' got you!', 1800); }
      else if (bl.b.hit) { const av = game.others.get(bl.b.hit); if (av) av.splat = t; if (bl.from === game.net.selfId) { SFX.splat(); game.floatText('HIT!', bl.b.x1, bl.b.y1 - 40, t); } }
    }
    if (u > 1.6) balls.splice(k, 1);
  }
}
export function drawBalls(): void {
  const t = now();
  for (const bl of balls) {
    const u = (t - bl.t0) / 0.45, { x0, y0, x1, y1 } = bl.b;
    if (u < 1) { const x = x0 + (x1 - x0) * u, y = y0 - 26 + (y1 - 22 - (y0 - 26)) * u - Math.sin(u * Math.PI) * 28; r(Math.round(x) - 2, Math.round(y) - 2, 5, 5, [22, 12, 44]); r(Math.round(x) - 1, Math.round(y) - 1, 3, 3, [240, 244, 250]); }
    else { const v = u - 1; for (let k = 0; k < 7; k++) { const an = (k / 7) * Math.PI * 2; r(Math.round(x1 + Math.cos(an) * (3 + v * 16)), Math.round(y1 - 20 + Math.sin(an) * (2 + v * 8) + v * v * 20), 2, 2, [236, 242, 250]); } }
  }
}
/** Once a frame in winter: the sleigh (bells, presents to catch), the tree lighting, a snowball fight's end, New Year. */
export function winterStep(): void {
  ENV.ice = isWinter() && game.room.id === 'park' ? (x, y) => onIce('park', x, y) : null;
  if (!isWinter() || !game.playing) return;
  ballStep();
  if (Date.now() - WINTER.treeAt > (game.room.id === 'plaza' ? 30000 : 120000)) void refreshWinter();
  const sl = sleigh();
  if (sl.t >= 0 && sl.t < 20 && bellsHeard !== sl.pass && OUTDOORS.includes(game.room.id)) { bellsHeard = sl.pass; SFX.bells(); toast(game.room.id === 'plaza' ? 'HO HO HO! Santa\'s sleigh! Catch the presents as they land' : 'Sleigh bells! Santa is dropping presents on the Square', 4500); }
  if (game.room.id === 'plaza' && sl.t < 330) for (const d of drops(sl.pass)) {
    const key = sl.pass + ':' + d.n; if (WINTER.caught.has(key) || sl.t < d.land || Math.abs(game.me.x - d.x) > 11 || Math.abs(game.me.y - d.y) > 9) continue;
    WINTER.caught.add(key); SFX.pop();
    game.net.catchSleigh(sl.pass, d.n).then((bal) => { game.setTokens(bal); SFX.chime(); game.floatText('+1', d.x, d.y - 30); }).catch((e: unknown) => toast(errText(e), 2500));
  }
  const ls = lightShow(), hour = Math.floor(Date.now() / 3600000);
  if (ls >= 0 && lightHeard !== hour && game.room.id === 'plaza') { lightHeard = hour; SFX.jingle(); toast('THE TREE LIGHTING! Hang an ornament at THE TREE', 4000); }
  const f = WINTER.snowfight;
  if (f && Date.now() - f.t0 >= 90000 && fightDone !== f.t0 && game.room.id === 'plaza') { fightDone = f.t0; const top = [...fightHits.values()].sort((p, q) => q.n - p.n)[0]; toast(top ? 'SNOWBALL FIGHT OVER! ' + top.name + ' wins with ' + top.n + ' hits!' : 'SNOWBALL FIGHT OVER! Nobody hit anybody...', 5000); SFX.score(); }
  const ny = nye();
  if (ny.left > 0 && ny.left <= 10.5) { const k = Math.ceil(ny.left); if (nyeHeard !== k) { nyeHeard = k; toast(String(k) + '...', 900); SFX.tminus(); } }
  if (ny.since >= 0 && ny.since < 3 && nyeHeard !== -100) { nyeHeard = -100; toast('HAPPY NEW YEAR ' + ny.year + '!', 6000); SFX.joy(); for (let k = 0; k < 6; k++) setTimeout(() => { SFX.boom(); SFX.pop(); }, k * 450); game.celebrate(); }
}
export function winterLine(): string {
  if (!isWinter()) return '';
  const ny = nye(); if (ny.left > 0 && ny.left < 600) return 'NEW YEAR IN ' + mmss(ny.left) + ' · GET TO THE ROOF OR THE SQUARE FOR THE FIREWORKS!';
  const f = WINTER.snowfight;
  if (game.room.id === 'plaza' && f && Date.now() - f.t0 < 90000) { const top = [...fightHits.values()].sort((p, q) => q.n - p.n).slice(0, 3).map((x) => x.name + ' ' + x.n).join(' · '); return 'SNOWBALL FIGHT · ' + mmss(90 - (Date.now() - f.t0) / 1000) + (top ? ' · ' + top : ' · SCOOP SNOW (E) AND THROW!'); }
  return '';
}

