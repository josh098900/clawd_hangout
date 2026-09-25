// DOM overlays drawn on top of the canvas: speech bubbles, room plate, chat log, toast.
// All user text goes in via textContent — never innerHTML.

import { eIn, eOB, seg, clamp } from '../engine/math';

const $ = <T extends HTMLElement>(q: string) => document.querySelector(q) as T;

// ---------- speech bubbles ----------
interface Bub { el: HTMLDivElement; text: string; t0: number; shown: number; /** its size in px, measured when the text changes (measuring every frame makes the page lay itself out again) */ w: number; h: number }
const bubs = new Map<string, Bub>();
const layer = () => $('#bubbles');
export const bubbleLife = (text: string) => 4 + text.length * 0.06;

export function say(id: string, text: string, now: number, self: boolean): void {
  let b = bubs.get(id);
  if (!b) { const el = document.createElement('div'); el.className = 'bub' + (self ? ' me' : ''); layer().appendChild(el); b = { el, text, t0: now, shown: -1, w: 0, h: 0 }; bubs.set(id, b); }
  b.text = text; b.t0 = now; b.shown = -1;
}
// (a bubble measured before the pixel font arrived would keep the wrong size: measure them all again once it has)
void document.fonts?.ready.then(() => { for (const b of bubs.values()) b.shown = -1; });
export function dropBubble(id: string): void { const b = bubs.get(id); if (b) { b.el.remove(); bubs.delete(id); } }
export function clearBubbles(): void { for (const id of [...bubs.keys()]) dropBubble(id); }

/** Position every bubble over its speaker's head (screen px). Typewriter + overshoot pop, like the film. */
export function layoutBubbles(now: number, heads: Map<string, [number, number]>, sw: number): void {
  for (const [id, b] of bubs) {
    const u = now - b.t0, life = bubbleLife(b.text), head = heads.get(id);
    if (u > life || !head || head[0] < -40 || head[0] > sw + 40) { if (u > life) dropBubble(id); else b.el.style.opacity = '0'; continue; }
    const n = Math.max(1, Math.ceil(seg(u, 0.05, 0.05 + b.text.length * 0.026) * b.text.length));
    if (n !== b.shown) { b.shown = n; b.el.textContent = b.text.slice(0, n); b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
    const w = b.w, h = b.h, k = seg(u, 0, 0.2), out = seg(u, life - 0.25, life);
    const x = clamp(head[0], w / 2 + 8, sw - w / 2 - 8) - w / 2, y = head[1] - h - 14;
    b.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + (0.4 + 0.6 * eOB(k)).toFixed(3) + ')';
    b.el.style.opacity = (1 - out).toFixed(3);
  }
}

// ---------- room plate ----------
let plateT0 = -99;
export function showPlate(kind: string, sub: string, big: string, now: number): void {
  const p = $('#plate'); p.className = 'plate ' + kind;
  (p.querySelector('.sub') as HTMLElement).textContent = sub;
  (p.querySelector('.big') as HTMLElement).textContent = big;
  plateT0 = now;
}
export function animatePlate(now: number): void {
  const p = $('#plate'), t0 = plateT0 + 0.3, t1 = plateT0 + 2.9;
  if (now < t0 || now >= t1) { p.style.opacity = '0'; return; }
  const i = eOB(seg(now, t0, t0 + 0.32)), o = eIn(seg(now, t1 - 0.25, t1)), x = (1 - i) * -110 - o * 110;
  p.style.opacity = '1'; p.style.transform = 'translateX(' + x.toFixed(1) + '%)';
}

// ---------- chat log ----------
export function logLine(name: string | null, text: string): void {
  const log = $('#log'), d = document.createElement('div');
  if (name === null) { d.className = 'sys'; d.textContent = text; }
  else { const b = document.createElement('b'); b.textContent = name + ': '; d.appendChild(b); d.appendChild(document.createTextNode(text)); }
  log.appendChild(d);
  while (log.children.length > 4) log.firstElementChild!.remove();
  setTimeout(() => { d.style.opacity = '0'; }, 10000);
  setTimeout(() => d.remove(), 11200);
}

// ---------- toast ----------
let toastTimer = 0;
export function toast(text: string, ms = 2600): void {
  const t = $('#toast'); t.textContent = text; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = window.setTimeout(() => t.classList.remove('on'), ms);
}

// ---------- fade ----------
export function fade(on: boolean): Promise<void> {
  const f = $('#fade'); f.classList.toggle('on', on);
  return new Promise((res) => setTimeout(res, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 230));
}
