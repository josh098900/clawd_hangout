// Start screen + look editor with a live animated preview of your critter.

import { BODY } from '../engine/palette';
import { css } from '../engine/pixel';
import { basePose, COLLECTABLES, composeCritter, FACES, FITS, HATS, isLocked, PETS, SPECIES, unlockHint, type Look, type Slot } from '../entities/critter';
import { cleanName, type Account, type Provider } from '../net/transport';
import { save } from '../game/save';

const $ = <T extends HTMLElement>(q: string) => document.querySelector(q) as T;
const LISTS = { sp: SPECIES, hat: HATS, face: FACES, fit: FITS, pet: PETS } as const;
const LABEL: Record<Key, string> = { sp: 'BODY: ', hat: 'HAT: ', face: 'FACE: ', fit: 'OUTFIT: ', pet: 'PET: ' };
const CLAY = BODY.findIndex((b) => b.name === 'CLAY');
/** Can you wear it? Earned items (the CROWN, pets, claw prizes) need unlocking first; see game/save.ts. */
export function owns(slot: Slot, i: number): boolean { return !isLocked(slot, i) || save.has(slot + ':' + i); }
export function collected(): number { return COLLECTABLES.filter((k) => save.has(k)).length; }
const PROV_NAME: Record<string, string> = { discord: 'Discord', google: 'Google' };
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
        do { this.look[k] = ((this.look[k] ?? 0) + Number(b.dataset.d) + n) % n; } while (k !== 'sp' && !owns(k, this.look[k] ?? 0) && --guard > 0);
        if (k === 'sp' && this.look.sp === 1) this.look.c = CLAY; // Clawd starts in its own orange
        this.sync();
      }));
    });
    this.go.addEventListener('click', () => this.finish(true));
    $('#goMute').addEventListener('click', () => this.finish(false));
    this.nameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.finish(true); });
    save.onChange(() => this.sync());
    this.sync();
  }

  setName(n: string): void { this.nameEl.value = n; }

  /** Nobody signed in yet: guest or log in? Resolves with the choice. */
  chooseSignIn(providers: Provider[]): Promise<'guest' | Provider> {
    const box = $('#signin'), provs = $('#provs');
    box.classList.remove('hidden'); this.go.style.display = 'none'; $('#goMute').style.display = 'none'; $('#collect').style.visibility = 'hidden';
    $('#provHint').style.display = providers.length ? '' : 'none';
    return new Promise((res) => {
      const done = (v: 'guest' | Provider) => { box.classList.add('hidden'); this.go.style.display = ''; $('#goMute').style.display = ''; $('#collect').style.visibility = ''; res(v); };
      $('#asGuest').onclick = () => done('guest');
      provs.replaceChildren(...providers.map((p) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pill prov ' + p; b.textContent = 'Log in with ' + PROV_NAME[p]; b.onclick = () => done(p); return b; }));
    });
  }
  /** Who you're playing as, with the buttons that go with it (save progress / log out). */
  setAccount(a: Account, providers: Provider[], on: { link: (p: Provider) => void; logout: () => void }): void {
    const box = $('#acct'), txt = $('#acctTxt'), btns = $('#acctBtns');
    box.classList.remove('hidden'); btns.replaceChildren();
    const mk = (label: string, fn: () => void, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pill ' + cls; b.textContent = label; b.onclick = fn; btns.appendChild(b); };
    if (a.kind === 'account') {
      const name = (p: string) => PROV_NAME[p] ?? p, also = (a.linked ?? []).filter((p) => p !== a.provider);
      txt.textContent = 'Logged in' + (a.provider ? ' with ' + name(a.provider) : '') + (also.length ? ' (' + also.map(name).join(', ') + ' linked too)' : '') + ' ·';
      mk('Log out', on.logout);
    } else {
      txt.textContent = providers.length ? 'Playing as a guest · save your progress:' : 'Playing as a guest';
      for (const p of providers) mk(PROV_NAME[p], () => on.link(p), 'prov ' + p);
      mk('Log out', () => { if (confirm('Log out? Guest progress in this browser will be lost.')) on.logout(); });
    }
  }
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
      const k = row.dataset.k as Key, i = this.look[k] ?? 0;
      (row.querySelector('span') as HTMLElement).textContent = LABEL[k] + LISTS[k][i] + (k !== 'sp' && !owns(k, i) ? ' (' + unlockHint(k, i) + ')' : '');
    });
    const n = collected();
    $('#collect').textContent = 'COLLECTION ' + n + '/' + COLLECTABLES.length + (n < COLLECTABLES.length ? ' · more prizes in the Arcade claw machine' : ' · complete!');
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
