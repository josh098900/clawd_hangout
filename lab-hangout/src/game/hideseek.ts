// HIDE AND SEEK, across every room of a server. Started from the sign on the Square; everyone
// online on the server plays. One random seeker counts to 30 in the Lab (frozen) while
// everyone else hides anywhere, then has 3 minutes to find them: walk up to a hider to tag
// them. The seeker's browser runs the round and sends the state on the server's lobby
// channel (see HideSeek in net/transport.ts); everyone else just follows it.

import type { HideSeek } from '../net/transport';
import { HS_MAX } from '../net/transport';

export const HIDE_S = 30, SEEK_S = 180, OVER_S = 10, TAG_DIST = 22;

/** The game as it stands, or null if there's none (finished, or the seeker vanished). `me` = your id. */
export function hsLive(h: HideSeek | null, me: string): HideSeek | null {
  if (!h) return null;
  const now = Date.now() / 1000;
  if (h.phase === 'over') return now - h.t0 < OVER_S ? h : null;
  if (h.seeker !== me && Date.now() - h.ts > 15000) return null; // the seeker stopped sending: they left
  return h;
}

export function startHS(people: { id: string; name: string }[]): HideSeek {
  const ps = people.slice(0, HS_MAX), seeker = ps[Math.floor(Math.random() * ps.length)].id;
  return { seeker, phase: 'hide', t0: Date.now() / 1000, ids: ps.map((p) => p.id), names: ps.map((p) => p.name), found: [], ts: Date.now() };
}

/** The seeker's clock: hide -> seek -> over. Returns the next state, or null if nothing changed. */
export function hsTick(h: HideSeek): HideSeek | null {
  const now = Date.now() / 1000, hiders = h.ids.length - 1;
  if (h.phase === 'hide' && now - h.t0 >= HIDE_S) return { ...h, phase: 'seek', t0: now, ts: Date.now() };
  if (h.phase === 'seek' && (now - h.t0 >= SEEK_S || h.found.length >= hiders)) return { ...h, phase: 'over', t0: now, ts: Date.now() };
  return null;
}

/** Tag a hider (seeker only). */
export function hsFound(h: HideSeek, id: string): HideSeek | null {
  const i = h.ids.indexOf(id);
  if (i < 0 || id === h.seeker || h.found.includes(i) || h.phase !== 'seek') return null;
  return { ...h, found: [...h.found, i], ts: Date.now() };
}

export const nameIn = (h: HideSeek, id: string): string => h.names[h.ids.indexOf(id)] ?? '?';

/** The line across the top of the screen for this player. */
export function hsBanner(h: HideSeek, me: string): string {
  const now = Date.now() / 1000, left = (s: number) => { const n = Math.max(0, Math.ceil(s)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };
  const seeker = me === h.seeker, hiders = h.ids.length - 1, sName = nameIn(h, h.seeker);
  const iFound = h.found.includes(h.ids.indexOf(me));
  if (h.phase === 'hide') return seeker ? 'HIDE & SEEK · YOU ARE IT! COUNTING... ' + Math.ceil(HIDE_S - (now - h.t0)) : 'HIDE & SEEK · HIDE! ' + sName + ' COUNTS TO ' + Math.ceil(HIDE_S - (now - h.t0)) + ' (ANY ROOM)';
  if (h.phase === 'seek') return (seeker ? 'SEEK! ' : iFound ? 'FOUND! WATCHING · ' : 'SHH... ' + sName + ' IS SEEKING · ') + 'FOUND ' + h.found.length + '/' + hiders + ' · ' + left(SEEK_S - (now - h.t0));
  return h.found.length >= hiders ? sName + ' FOUND EVERYONE!' : 'THE HIDERS WIN! ' + (hiders - h.found.length) + ' NEVER FOUND';
}
