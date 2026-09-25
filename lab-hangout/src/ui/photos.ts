// THE PHOTO WALL: decorating a photo-booth strip before you PIN IT (a frame colour and stickers),
// the Lab corkboard's ALBUM (hearts, your own photo's options), and the owner's MODERATE queue.
// Strips travel as small PNG data URLs (1x pixels, ~100x300); the server checks them
// (0017_photos.sql) and nothing is shown to anyone else until the owner approves it.

import { K, type RGB } from '../engine/palette';
import { mk, r, txt, tw, spr, bake } from '../engine/pixel';
import { button, openModal, row, type Modal, font } from './modal';
import type { Photo } from '../net/transport';

export const FW = 96, FH = 90, BORDER = 4, CAPTION = 12;
export const STRIP_W = FW + BORDER * 2;
export const stripH = (n: number): number => BORDER + n * (FH + BORDER) + CAPTION;

// ---------- frames + stickers ----------
export const FRAMES: { name: string; c: RGB; ink: RGB }[] = [
  { name: 'CREAM', c: [250, 246, 236], ink: [217, 119, 87] }, { name: 'PINK', c: [255, 150, 190], ink: [120, 30, 70] },
  { name: 'MINT', c: [120, 220, 180], ink: [20, 90, 60] }, { name: 'SKY', c: [120, 190, 255], ink: [20, 50, 110] },
  { name: 'GOLD', c: [255, 214, 90], ink: [120, 80, 10] }, { name: 'NIGHT', c: [30, 26, 50], ink: [255, 95, 210] },
];
const P: Record<string, RGB> = { w: K.WHITE, k: [22, 12, 44], y: K.GOLD, r: K.RED, p: K.MAG, c: K.CYAN, o: [217, 119, 87], g: [124, 242, 156], b: [90, 130, 230] };
export const STICKERS: { name: string; rows: string[] }[] = [
  { name: 'STAR', rows: ['....y....', '...yyy...', 'yyyyyyyyy', '.yyyyyyy.', '..yyyyy..', '.yyy.yyy.', 'yy.....yy'] },
  { name: 'HEART', rows: ['.rr...rr.', 'rrrr.rrrr', 'rrwrrrrrr', 'rrrrrrrrr', '.rrrrrrr.', '..rrrrr..', '...rrr...', '....r....'] },
  { name: 'CLAWD', rows: ['.ooooooo.', 'ooooooooo', 'okoooooko', 'okoooooko', 'ooooooooo', 'ooooooooo', '.o.o.o.o.', '.o.o.o.o.'] },
  { name: 'PARTY HAT', rows: ['....p....', '...ypy...', '...ppp...', '..pypyp..', '..ppppp..', '.pypypyp.', '.ppppppp.', 'ccccccccc'] },
  { name: 'SPARKLE', rows: ['...c...', '...c...', '..cwc..', 'ccwwwcc', '..cwc..', '...c...', '...c...'] },
  { name: 'CROWN', rows: ['y..y..y', 'yy.y.yy', 'yyyyyyy', 'yryyyry', 'yyyyyyy'] },
  { name: 'LOL', rows: ['p...ppp.p..', 'p...p.p.p..', 'p...p.p.p..', 'ppp.ppp.ppp'] },
  { name: 'FLOWER', rows: ['..p.p..', '.ppypp.', '..pyp..', '.ppypp.', '..pgp..', '...g...', '..gg...', '...g...'] },
];
export interface Stamp { i: number; x: number; y: number }
/** A sticker at 2x (each of its pixels 2x2), with a 1px dark outline so it reads on any photo. */
function stamp2(rows: string[], x: number, y: number): void {
  const on = (i: number, j: number) => j >= 0 && j < rows.length && i >= 0 && i < rows[j].length && rows[j][i] !== '.';
  for (let j = -1; j <= rows.length; j++) for (let i = -1; i <= rows[0].length; i++) if (!on(i, j) && (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1))) r(x + i * 2, y + j * 2, 2, 2, [22, 12, 44]);
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = P[rows[j][i]]; if (c) r(x + i * 2, y + j * 2, 2, 2, c); }
}

/** Lay out `frames` as a 1x strip with a frame colour, a caption and stickers. */
export function composeStrip(frames: HTMLCanvasElement[], frame: number, stamps: Stamp[]): HTMLCanvasElement {
  const F = FRAMES[frame] ?? FRAMES[0], cv = mk(STRIP_W, stripH(frames.length)), g = cv.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  bake(g, () => {
    r(0, 0, cv.width, cv.height, F.c);
    frames.forEach((f, i) => { const y = BORDER + i * (FH + BORDER); r(BORDER - 1, y - 1, FW + 2, FH + 2, [22, 12, 44]); g.drawImage(f, BORDER, y); });
    const cap = 'LAB HANGOUT'; txt(cap, Math.round(STRIP_W / 2 - tw(cap) / 2), cv.height - CAPTION + 4, F.ink);
    for (const s of stamps) { const st = STICKERS[s.i]; if (st) stamp2(st.rows, Math.round(s.x - st.rows[0].length), Math.round(s.y - st.rows.length)); }
  });
  return cv;
}
/** Decorate a strip, then pin it (or just save it). `pin` resolves when it's sent. */
export function openPinEditor(frames: HTMLCanvasElement[], pin: (png: string) => Promise<void>, onClose: () => void): void {
  const m = openModal('DECORATE YOUR STRIP', onClose);
  let frame = 0, pick = 0, busy = false; const stamps: Stamp[] = [];
  const S = Math.max(1, Math.min(2, Math.floor((innerHeight - 330) / stripH(frames.length)))) || 1;
  const cv = document.createElement('canvas'); Object.assign(cv.style, { imageRendering: 'pixelated', cursor: 'copy', width: STRIP_W * S + 'px', height: stripH(frames.length) * S + 'px', touchAction: 'none' });
  const redraw = () => { const s = composeStrip(frames, frame, stamps); cv.width = s.width; cv.height = s.height; cv.getContext('2d')!.drawImage(s, 0, 0); };
  cv.addEventListener('pointerdown', (e) => { if (stamps.length >= 16) return; const rc = cv.getBoundingClientRect(); stamps.push({ i: pick, x: Math.round((e.clientX - rc.left) / rc.width * cv.width), y: Math.round((e.clientY - rc.top) / rc.height * cv.height) }); redraw(); });
  const tools = document.createElement('div'); Object.assign(tools.style, { display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '240px' });
  const lab = (t: string) => { const d = document.createElement('div'); d.textContent = t; Object.assign(d.style, font(18, '#9FEFFF')); return d; };
  const swatches = document.createElement('div'); Object.assign(swatches.style, { display: 'flex', flexWrap: 'wrap', gap: '4px' });
  const stickers = document.createElement('div'); Object.assign(stickers.style, { display: 'flex', flexWrap: 'wrap', gap: '4px' });
  const syncTools = () => {
    swatches.replaceChildren(...FRAMES.map((F, i) => { const b = document.createElement('button'); b.type = 'button'; b.title = F.name; Object.assign(b.style, { width: '28px', height: '28px', background: 'rgb(' + F.c.join(',') + ')', border: i === frame ? '3px solid #FFD65A' : '2px solid #444', cursor: 'pointer' }); b.addEventListener('click', () => { frame = i; syncTools(); redraw(); }); return b; }));
    stickers.replaceChildren(...STICKERS.map((st, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.title = st.name; const c = mk(13, 11);
      bake(c.getContext('2d')!, () => {spr(st.rows, P, Math.round(6.5 - st.rows[0].length / 2), Math.round(5.5 - st.rows.length / 2)); });
      Object.assign(c.style, { width: '39px', height: '33px', imageRendering: 'pixelated' });
      Object.assign(b.style, { padding: '2px', background: '#1a1426', border: i === pick ? '3px solid #FFD65A' : '2px solid #444', cursor: 'pointer' }); b.appendChild(c);
      b.addEventListener('click', () => { pick = i; syncTools(); }); return b;
    }));
  };
  syncTools(); redraw();
  const undo = button('UNDO', () => { stamps.pop(); redraw(); }, true);
  const status = document.createElement('div'); Object.assign(status.style, font(18, '#E8D8C0'), { maxWidth: '240px' });
  status.textContent = 'Pick a sticker, then click the strip to stick it on. The owner checks every photo before it goes on the Lab wall.';
  const go = button('PIN IT', () => {
    if (busy) return; busy = true; go.disabled = true; status.textContent = 'Sending...';
    const png = composeStrip(frames, frame, stamps).toDataURL('image/png');
    pin(png).then(() => m.close()).catch((e: unknown) => { busy = false; go.disabled = false; status.textContent = e instanceof Error ? e.message : String(e); });
  });
  tools.append(lab('FRAME'), swatches, lab('STICKERS'), stickers, row(undo), status);
  const wrap = document.createElement('div'); Object.assign(wrap.style, { display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' });
  wrap.append(cv, tools);
  m.body.append(wrap, row(go, button('CANCEL', m.close, true)));
}

// ---------- viewing ----------
const imgOf = (png: string, scale: number): HTMLImageElement => { const i = document.createElement('img'); i.src = png; i.alt = 'A photo strip'; Object.assign(i.style, { imageRendering: 'pixelated', width: STRIP_W * scale + 'px' }); return i; };
/** The first frame of a strip, cropped and halved: the polaroid on the corkboard (32x30). */
export function thumbOf(img: HTMLImageElement): HTMLCanvasElement {
  const t = mk(32, 30), g = t.getContext('2d')!; g.imageSmoothingEnabled = false;
  g.drawImage(img, BORDER + 16, BORDER + 12, 64, 60, 0, 0, 32, 30); return t;
}
export interface AlbumHooks {
  page(before: number | null): Promise<{ week: number | null; photos: Photo[] }>;
  heart(p: Photo): Promise<{ hearts: number; mine: boolean }>;
  feature(p: Photo): Promise<void>;
  remove(p: Photo): Promise<void>;
  me: string; admin: boolean;
  toast(s: string): void;
}
/** The ALBUM: every approved strip, newest first (the photo of the week up top). Click one to see it big. */
export function openAlbum(h: AlbumHooks, onClose: () => void): void {
  const m = openModal('PHOTO WALL', onClose);
  const grid = document.createElement('div'); Object.assign(grid.style, { display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', maxWidth: 'min(640px, 90vw)', maxHeight: '60vh', overflowY: 'auto' });
  const note = document.createElement('div'); Object.assign(note.style, font(19, '#9FEFFF'), { textAlign: 'center' });
  note.textContent = 'Loading...';
  let oldest: number | null = null, week: number | null = null;
  const more = button('OLDER', () => void load(), true); more.style.display = 'none';
  const load = async () => {
    try {
      const res = await h.page(oldest); if (oldest === null) week = res.week;
      if (oldest === null && !res.photos.length) note.textContent = 'No photos yet! Take a strip in the Cinema\'s photo booth and PIN IT.';
      else note.textContent = 'Click a photo to see the whole strip. ♥ your favourites: the most-loved this week gets the gold frame.';
      for (const p of res.photos) grid.appendChild(card(p));
      oldest = res.photos.length ? res.photos[res.photos.length - 1].id : oldest; more.style.display = res.photos.length >= 12 ? '' : 'none';
    } catch (e) { note.textContent = e instanceof Error ? e.message : String(e); }
  };
  const card = (p: Photo): HTMLElement => {
    const b = document.createElement('button'); b.type = 'button';
    Object.assign(b.style, { background: p.id === week ? '#FFD65A' : '#FAF6EC', border: 'none', padding: '4px 4px 6px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', boxShadow: '0 3px 0 rgba(0,0,0,.4)' });
    const c = document.createElement('canvas'); c.width = 64; c.height = 60; Object.assign(c.style, { width: '96px', height: '90px', imageRendering: 'pixelated' });
    const im = new Image(); im.onload = () => { const g = c.getContext('2d')!; g.imageSmoothingEnabled = false; g.drawImage(im, BORDER + 16, BORDER + 12, 64, 60, 0, 0, 64, 60); }; im.src = p.png;
    const cap = document.createElement('span'); cap.textContent = (p.id === week ? '★ ' : '') + p.ownerName + ' ♥' + p.hearts; Object.assign(cap.style, font(17, '#3C3446'));
    b.append(c, cap); b.addEventListener('click', () => { m.close(); openPhoto(p, p.id === week, h, onClose); }); return b;
  };
  m.body.append(note, grid, row(more, button('CLOSE', m.close, true)));
  void load();
}
/** One strip, big, with its hearts (and your own photo's buttons, or the owner's). */
export function openPhoto(p: Photo, isWeek: boolean, h: AlbumHooks, onClose: () => void): void {
  const m = openModal(isWeek ? '★ PHOTO OF THE WEEK ★' : 'PHOTO BY ' + p.ownerName, onClose);
  const when = document.createElement('div'); when.textContent = (isWeek ? 'by ' + p.ownerName + ' · ' : '') + new Date(p.at * 1000).toLocaleDateString(); Object.assign(when.style, font(18, '#9FEFFF'));
  const heart = button((p.mine ? '♥ ' : '♡ ') + p.hearts, () => { heart.disabled = true; h.heart(p).then((r) => { p.hearts = r.hearts; p.mine = r.mine; heart.textContent = (r.mine ? '♥ ' : '♡ ') + r.hearts; }).catch((e) => h.toast(String(e instanceof Error ? e.message : e))).finally(() => { heart.disabled = false; }); });
  const btns: HTMLElement[] = [heart];
  if (p.owner === h.me) btns.push(button('HANG IN MY FLAT', () => { h.feature(p).then(() => h.toast('It\'s in your flat\'s PHOTO FRAME now (buy one in THE LOFTS SHOP if you haven\'t)')).catch((e) => h.toast(String(e instanceof Error ? e.message : e))); }, true));
  if (p.owner === h.me || h.admin) btns.push(button(h.admin && p.owner !== h.me ? 'REMOVE' : 'TAKE DOWN', () => { if (!confirm('Take this photo off the wall for good?')) return; h.remove(p).then(() => { h.toast('Taken down'); m.close(); }).catch((e) => h.toast(String(e instanceof Error ? e.message : e))); }, true));
  btns.push(button('ALBUM', () => { m.close(); openAlbum(h, onClose); }, true));
  const im = imgOf(p.png, Math.max(1, Math.min(2, Math.floor((innerHeight - 260) / 300))));
  m.body.append(when, im, row(...btns));
}

// ---------- the owner's queue ----------
export interface ModHooks { list(): Promise<Photo[]>; review(p: Photo, ok: boolean): Promise<void>; toast(s: string): void }
export function openModerate(h: ModHooks, onClose: () => void): Modal {
  const m = openModal('MODERATE PHOTOS', onClose);
  const note = document.createElement('div'); Object.assign(note.style, font(19, '#9FEFFF'), { textAlign: 'center' }); note.textContent = 'Loading...';
  const list = document.createElement('div'); Object.assign(list.style, { display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center', maxWidth: 'min(700px, 92vw)', maxHeight: '64vh', overflowY: 'auto' });
  const refresh = () => h.list().then((ps) => {
    note.textContent = ps.length ? ps.length + ' waiting. Only approved photos go on the Lab wall.' : 'Nothing waiting. All clear!';
    list.replaceChildren(...ps.map((p) => {
      const card = document.createElement('div'); Object.assign(card.style, { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' });
      const who = document.createElement('div'); who.textContent = p.ownerName + ' · ' + new Date(p.at * 1000).toLocaleString(); Object.assign(who.style, font(17, '#E8D8C0'));
      const act = (ok: boolean) => () => { h.review(p, ok).then(() => { h.toast(ok ? 'Approved: it\'s on the wall' : 'Rejected'); card.remove(); if (!list.children.length) note.textContent = 'Nothing waiting. All clear!'; }).catch((e) => h.toast(String(e instanceof Error ? e.message : e))); };
      card.append(who, imgOf(p.png, 1), row(button('APPROVE', act(true)), button('REJECT', act(false), true)));
      return card;
    }));
  }).catch((e) => { note.textContent = e instanceof Error ? e.message : String(e); });
  m.body.append(note, list, row(button('CLOSE', m.close, true)));
  void refresh();
  return m;
}
