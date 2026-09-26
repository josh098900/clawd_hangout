// HIDE AND SEEK across rooms, the playing part (game/hideseek.ts has the rules): the round lives on the server's
// lobby channel, and the seeker's browser runs it (tagging, the phases, re-sending it every 3 s); everyone else
// only reacts (sounds, toasts, the seeker walked back to the Lab).

import { game, now } from '../app/game';
import { hsFound, hsLive, hsTick, nameIn, startHS, TAG_DIST } from '../game/hideseek';
import { allow } from '../net/filter';
import type { HideSeek, NetEvent } from '../net/transport';
import { toast } from '../ui/overlay';
import { SFX } from '../audio/sfx';

// ---------- hide and seek (server-wide, see game/hideseek.ts) ----------
export let hs: HideSeek | null = null;
let hsSent = 0, hsKey = '';
function setHS(h: HideSeek): void { const prev = hs; hs = h; hsSent = now(); game.net.sendWorld(h); onHS(prev, h); }
export function onWorld(e: NetEvent): void {
  if (e.type !== 'world' || !allow(e.id, 'world', 3, 6)) return;
  const w = e.w, live = hsLive(hs, game.net.selfId);
  // during a round only the seeker's browser speaks for it; between rounds anyone can start one
  // (and a seeker's update also catches up someone who missed the start)
  const ok = live && live.phase !== 'over' ? e.id === live.seeker && w.seeker === live.seeker && w.ts > live.ts : w.phase === 'hide' || e.id === w.seeker;
  if (!ok) return;
  const prev = hs; hs = w; onHS(prev, w);
}
/** Local reactions: sounds, toasts, the seeker being walked back to the Lab. */
function onHS(prev: HideSeek | null, h: HideSeek): void {
  const key = h.seeker + h.phase + h.t0 + ':' + h.found.length;
  if (key === hsKey) return; hsKey = key;
  const seeker = h.seeker === game.net.selfId, sName = nameIn(h, h.seeker), fresh = !prev || prev.t0 !== h.t0 && prev.phase === 'over' || prev.seeker !== h.seeker;
  if (h.phase === 'hide' && (fresh || prev?.phase !== 'hide')) {
    SFX.join();
    if (seeker) { toast("You're IT! Count to 30 in the Lab, then find everyone", 4500); if (game.room.id !== 'lab') void game.enterRoom('lab', null); }
    else toast('HIDE AND SEEK! ' + sName + ' is seeking. Hide anywhere, in any room!', 4500);
  } else if (h.phase === 'seek' && prev?.phase === 'hide') { SFX.siren(); toast(seeker ? 'Ready or not, here you come!' : sName + ' is coming...', 3000); }
  else if (h.phase === 'seek' && prev && h.found.length > prev.found.length) {
    const who = h.ids[h.found[h.found.length - 1]];
    if (who === game.net.selfId) { SFX.hurt(); toast('You were found!', 3000); } else { SFX.pop(); toast('FOUND: ' + nameIn(h, who), 2000); }
  } else if (h.phase === 'over' && prev?.phase !== 'over') { SFX.score(); if (seeker && h.found.length >= h.ids.length - 1) { game.celebrate(); } }
}
/** A hide-and-seek round that's still being played (not just finished). */
export const hsOn = (): HideSeek | null => { const h = hsLive(hs, game.net.selfId); return h && h.phase !== 'over' ? h : null; };
/** The seeker is frozen in the Lab while everyone hides. */
export const hsFrozen = (): boolean => { const h = hsLive(hs, game.net.selfId); return !!h && h.phase === 'hide' && h.seeker === game.net.selfId; };
export function hsFrame(): void {
  const h = hsLive(hs, game.net.selfId);
  const seeking = !!h && h.seeker === game.net.selfId && h.phase !== 'over';
  for (const o of game.others.values()) o.hideName = seeking;
  if (!h || h.seeker !== game.net.selfId) return;
  let next = hsTick(h);
  if (!next && h.phase === 'seek') for (const o of game.others.values()) if (Math.hypot(o.x - game.me.x, o.y - game.me.y) < TAG_DIST) { next = hsFound(h, o.id); if (next) break; }
  if (next) setHS(next);
  else if (h.phase !== 'over' && now() - hsSent > 3) setHS({ ...h, ts: Date.now() }); // keep everyone (and newcomers) in sync
}
export function startHide(): void {
  if (hsOn()) { toast('A round is already on!'); return; }
  const people = [{ id: game.net.selfId, name: game.me.name }, ...game.lobby.map((p) => ({ id: p.id, name: p.name }))];
  if (people.length < 2) { toast('Need at least 2 people on this server', 3500); return; }
  setHS(startHS(people));
}

