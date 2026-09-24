// Start screen + look editor with a live animated preview of your critter.

import { BODY } from '../engine/palette';
import { css } from '../engine/pixel';
import { basePose, composeCritter, FACES, FITS, HATS, LOCKED_HATS, PETS, SPECIES, type Look } from '../entities/critter';
import { cleanName } from '../net/transport';

const $ = <T extends HTMLElement>(q: string) => document.querySelector(q) as T;
const LISTS = { sp: SPECIES, hat: HATS, face: FACES, fit: FITS, pet: PETS } as const;
const LABEL: Record<Key, string> = { sp: 'BODY: ', hat: 'HAT: ', face: 'FACE: ', fit: 'OUTFIT: ', pet: 'PET: ' };
const CLAY = BODY.findIndex((b) => b.name === 'CLAY');
/** Unlocked in this browser (the CROWN: open the chest in the Crypt). */
export function hatUnlocked(i: number): boolean { try { return localStorage.getItem('labhangout.hat.' + i) === '1'; } catch { return false; } }
/** Pets are earned (the pigeon: feed the pigeons on the Square a few times). */
export function petUnlocked(i: number): boolean { if (i === 0) return true; try { return localStorage.getItem('labhangout.pet.' + i) === '1'; } catch { return false; } }
type Key = keyof typeof LISTS;

export interface StartResult { name: string; look: Look; sound: boolean }

export class StartScreen {
  look: Look;
  private raf = 0;
  private resolve: ((r: StartResult) => void) | null = null;
  private readonly root = $('#start');
  private readonly nameEl = $<HTMLInputElement>('#name');
  private readonly go = $<HTMLButtonElement>('#go');
  private readonly pctx = $<HTMLCanvasElement>('#preview').getContext('2d')!;

  constructor(look: Look, name: string) {
    this.look = { ...look };
    this.nameEl.value = name;
    const sw = $('#swatches');
    BODY.forEach((b, i) => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.style.background = css(b.c); btn.setAttribute('aria-label', b.name.toLowerCase());
      btn.addEventListener('click', () => { this.look.c = i; this.sync(); });
      sw.appendChild(btn);
    });
    document.querySelectorAll<HTMLElement>('.cyc').forEach((row) => {
      const k = row.dataset.k as Key;
      row.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        const n = LISTS[k].length; let guard = n;
        do { this.look[k] = ((this.look[k] ?? 0) + Number(b.dataset.d) + n) % n; } while (((k === 'hat' && LOCKED_HATS.has(this.look.hat) && !hatUnlocked(this.look.hat)) || (k === 'pet' && !petUnlocked(this.look.pet ?? 0))) && --guard > 0);
        if (k === 'sp' && this.look.sp === 1) this.look.c = CLAY; // Clawd starts in its own orange
        this.sync();
      }));
    });
    this.go.addEventListener('click', () => this.finish(true));
    $('#goMute').addEventListener('click', () => this.finish(false));
    this.nameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.finish(true); });
    this.sync();
  }

  setName(n: string): void { this.nameEl.value = n; }
  setLook(l: Look): void { this.look = { ...l }; this.sync(); }

  /** Invite-only world: show the code box and resolve once `check` accepts a code. */
  askInvite(check: (code: string) => Promise<boolean>): Promise<void> {
    const gate = $('#gate'), input = $<HTMLInputElement>('#invite'), btn = $<HTMLButtonElement>('#unlock'), msg = $('#gateMsg');
    gate.classList.remove('hidden');
    (this.go.querySelector('span') as HTMLElement).textContent = 'Invite code needed';
    setTimeout(() => input.focus(), 50);
    return new Promise((res) => {
      const tryIt = async () => {
        const code = input.value.trim(); if (!code) return;
        btn.disabled = true; msg.textContent = '';
        try {
          if (await check(code)) { gate.classList.add('hidden'); res(); }
          else { msg.textContent = 'That code did not work.'; input.select(); }
        } catch (e) { msg.textContent = e instanceof Error ? e.message : String(e); }
        btn.disabled = false;
      };
      btn.addEventListener('click', tryIt);
      input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') void tryIt(); });
    });
  }
  status(text: string): void { $('#mode').textContent = text; }

  ready(label: string, mode: string, isErr = false): void {
    this.go.disabled = false;
    (this.go.querySelector('span') as HTMLElement).textContent = label;
    const m = $('#mode'); m.textContent = mode; m.classList.toggle('err', isErr);
  }

  /** Show and wait for the player to press Join. */
  open(editing: boolean): Promise<StartResult> {
    this.root.classList.remove('hidden');
    $('#goMute').style.display = editing ? 'none' : '';
    if (editing) (this.go.querySelector('span') as HTMLElement).textContent = 'Done';
    this.animate();
    setTimeout(() => this.nameEl.focus(), 50);
    return new Promise((res) => { this.resolve = res; });
  }

  private finish(sound: boolean): void {
    if (this.go.disabled || !this.resolve) return;
    const name = cleanName(this.nameEl.value) || 'GUEST' + Math.floor(Math.random() * 90 + 10);
    this.root.classList.add('hidden');
    cancelAnimationFrame(this.raf);
    const r = this.resolve; this.resolve = null;
    r({ name, look: { ...this.look }, sound });
  }

  private sync(): void {
    document.querySelectorAll<HTMLButtonElement>('#swatches button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === this.look.c)));
    document.querySelectorAll<HTMLElement>('.cyc').forEach((row) => {
      const k = row.dataset.k as Key; (row.querySelector('span') as HTMLElement).textContent = LABEL[k] + LISTS[k][this.look[k] ?? 0] + (k === 'pet' && !petUnlocked(1) ? ' (FEED THE PIGEONS)' : '');
    });
  }

  private animate = (): void => {
    const a = performance.now() / 1000, P = basePose(1);
    P.sy = 1 + 0.02 * Math.sin(a * 2.6); P.ant = Math.sin(a * 1.9) * 0.8;
    if (a % 3.1 < 0.12) P.eyes = 'b';
    const k = a % 6; if (k > 4.2 && k < 5.6) { P.arm = 'wave'; P.wave = Math.sin(a * 14); P.eyes = 'h'; }
    P.dir = Math.floor(a / 6) % 2 ? -1 : 1;
    const c = composeCritter(this.look, P, 0), g = this.pctx;
    g.clearRect(0, 0, 60, 72);
    g.imageSmoothingEnabled = false;
    const sy = P.sy, sx = 1 / Math.sqrt(sy);
    g.setTransform(sx, 0, 0, sy, 30, 66); g.drawImage(c.cv, -c.ox, -c.oy); g.setTransform(1, 0, 0, 1, 0, 0);
    this.raf = requestAnimationFrame(this.animate);
  };
}
