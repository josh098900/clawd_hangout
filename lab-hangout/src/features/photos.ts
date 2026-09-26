// THE PHOTO WALL, the playing part (ui/photos.ts has the panels, the Lab draws the corkboard, 0017_photos.sql keeps
// the photos): the corkboard's newest polaroids, the album's hooks, the owner's MODERATE button and queue, telling a
// pinner their photo was approved, and the flat's PHOTO FRAME.

import { $, game, narrow } from '../app/game';
import { LAB_INFO } from '../world/lab';
import { openModerate, thumbOf, type AlbumHooks } from '../ui/photos';
import { FLAT } from '../world/flat';
import type { Photo } from '../net/transport';
import { toast } from '../ui/overlay';
import { SFX } from '../audio/sfx';
import { modalOpen } from '../ui/modal';

// ---------- THE PHOTO WALL (ui/photos.ts, the Lab's corkboard, 0017_photos.sql) ----------
export let photosAt = 0;
let isAdmin = false;
/** Fetch the corkboard again next time round (walking into the Lab, after a change). */
export function photosStale(): void { photosAt = 0; }
/** You're an owner: show the MODERATE button. */
export function setAdmin(a: boolean): void { isAdmin = a; }
const thumbCache = new Map<number, HTMLCanvasElement>();
/** A strip's corkboard polaroid (made once per photo). */
function thumb(p: Photo): Promise<HTMLCanvasElement> {
  const hit = thumbCache.get(p.id); if (hit) return Promise.resolve(hit);
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => { const t = thumbOf(im); thumbCache.set(p.id, t); res(t); }; im.onerror = rej; im.src = p.png; });
}
/** The newest approved strips for the Lab's corkboard, with the photo of the week in the first spot. */
export function refreshPhotos(): void {
  photosAt = Date.now();
  game.net.wallPhotos(10, null).then(async (w) => {
    let list = w.photos;
    if (w.week !== null && !list.some((p) => p.id === w.week)) { const wk = await game.net.photoById(w.week).catch(() => null); if (wk) list = [wk, ...list.slice(0, 9)]; }
    else if (w.week !== null) list = [...list.filter((p) => p.id === w.week), ...list.filter((p) => p.id !== w.week)];
    const out: typeof LAB_INFO.photos = [];
    for (const p of list) { try { out.push({ id: p.id, name: p.ownerName, thumb: await thumb(p), week: p.id === w.week }); } catch { /* a broken image: skip it */ } }
    LAB_INFO.photos = out;
  }).catch((e) => console.warn('[photos]', e));
}
export function albumHooks(): AlbumHooks {
  return {
    page: (before) => game.net.wallPhotos(12, before), heart: (p) => game.net.heartPhoto(p.id).then((r) => { photosAt = 0; return r; }),
    feature: (p) => game.net.featurePhoto(p.id).then(() => { FLAT.photoOf = ''; }), remove: (p) => (p.owner === game.net.selfId ? game.net.deletePhoto(p.id) : game.net.reviewPhoto(p.id, false)).then(() => { photosAt = 0; thumbCache.delete(p.id); }),
    me: game.net.selfId, admin: isAdmin, toast: (t) => toast(t, 4000),
  };
}
/** The owner's MODERATE button (only shown to owners), with how many photos are waiting. */
const modBtn = document.createElement('button'); modBtn.type = 'button'; modBtn.id = 'mod'; modBtn.className = 'pill'; modBtn.style.display = 'none';
$('#hud').insertBefore(modBtn, $('#quests').nextSibling);
modBtn.addEventListener('click', () => { if (modalOpen()) return; openModerate({ list: () => game.net.pendingPhotos(), review: (p, ok) => game.net.reviewPhoto(p.id, ok).then(() => { photosAt = 0; }), toast: (t) => toast(t, 3000) }, () => { game.input.clear(); void checkQueue(); }); });
export async function checkQueue(): Promise<void> {
  if (!isAdmin) return;
  try { const n = (await game.net.pendingPhotos()).length; modBtn.style.display = ''; modBtn.textContent = (narrow() ? 'MOD' : 'MODERATE') + (n ? ' · ' + n : ''); modBtn.classList.toggle('hot', n > 0); } catch { /* try again later */ }
}
/** Tell the pinner when their photo's been approved or not (remembered per browser, so each news comes once). */
export async function checkMyPhotos(): Promise<void> {
  let mine; try { mine = await game.net.myPhotos(); } catch { return; }
  const key = 'labhangout.photoSeen.' + game.net.selfId; let seen: Record<string, string> = {}; try { seen = JSON.parse(localStorage.getItem(key) || '{}'); } catch { /* none */ }
  for (const p of mine) {
    const was = seen[p.id]; seen[p.id] = p.status;
    if (was === 'pending' && p.status === 'approved') { toast('Your photo is up on the PHOTO WALL in the Lab!', 6000); SFX.score(); photosAt = 0; }
    else if (was === 'pending' && p.status === 'rejected') toast('Your photo wasn\'t approved for the wall this time', 5000);
  }
  try { localStorage.setItem(key, JSON.stringify(seen)); } catch { /* full */ }
}
/** The flat owner's photo for their PHOTO FRAME. */
export function loadFlatPhoto(owner: string): void {
  FLAT.photoOf = owner; FLAT.photo = null;
  game.net.flatPhoto(owner).then((png) => { if (!png || FLAT.photoOf !== owner) return; const im = new Image(); im.onload = () => { if (FLAT.photoOf === owner) FLAT.photo = thumbOf(im); }; im.src = png; }).catch(() => {});
}

