// One modal at a time (whiteboard, arcade, photo strip). Escape or the close button ends it.

const root = () => document.querySelector('#modal') as HTMLElement;
let closeCurrent: (() => void) | null = null;
export const modalOpen = (): boolean => closeCurrent !== null;

export interface Modal { body: HTMLElement; close: () => void }

/** Open a panel with a title; `onClose` runs exactly once, however it closes. */
export function openModal(title: string, onClose: () => void): Modal {
  closeCurrent?.();
  const r = root(), panel = document.createElement('div'), t = document.createElement('div');
  panel.className = 'mpanel'; t.className = 'mtitle'; t.textContent = title;
  const body = document.createElement('div'); body.style.display = 'contents';
  panel.append(t, body); r.replaceChildren(panel); r.classList.remove('hidden');
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
  const close = () => {
    if (closeCurrent !== close) return;
    closeCurrent = null; removeEventListener('keydown', onKey, true);
    r.classList.add('hidden'); r.replaceChildren(); onClose();
  };
  addEventListener('keydown', onKey, true);
  closeCurrent = close;
  return { body, close };
}

/** The VT323 look for a panel's lines of text: Object.assign(el.style, font(19, '#9FEFFF')). */
export const font = (px: number, color: string) => ({ fontFamily: "'VT323', monospace", fontSize: px + 'px', color });
/** Prize rarity colours (the claw machine, the prize counter). */
export const RARE_COL: Record<string, string> = { COMMON: '#E8D8C0', UNCOMMON: '#7CF29C', RARE: '#5FE7FF', LEGENDARY: '#FFD65A', SPECIAL: '#FF9AD8' };

export function button(label: string, onClick: () => void, ghost = false): HTMLButtonElement {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'mbtn' + (ghost ? ' ghost' : ''); b.textContent = label;
  b.addEventListener('click', onClick); return b;
}
export function row(...kids: HTMLElement[]): HTMLElement { const d = document.createElement('div'); d.className = 'mrow'; d.append(...kids); return d; }

/**
 * Keys held down in a game panel. The keys in `accept` (KeyboardEvent.key; one-letter keys in lower case) are
 * caught before the game underneath sees them and kept in `held`, and all let go if you switch windows.
 * `hold(label, key)` makes a touch button that holds a key while pressed. Call `stop()` when the panel closes.
 */
export function heldKeys(accept: string[]): { held: Set<string>; hold(label: string, key: string): HTMLButtonElement; stop(): void } {
  const held = new Set<string>(), norm = (k: string) => (k.length === 1 ? k.toLowerCase() : k);
  const kd = (e: KeyboardEvent) => { const k = norm(e.key); if (accept.includes(k)) { e.preventDefault(); e.stopPropagation(); held.add(k); } };
  const ku = (e: KeyboardEvent) => { held.delete(norm(e.key)); };
  const unstick = (): void => held.clear(); // (switching windows mid-game)
  addEventListener('keydown', kd, true); addEventListener('keyup', ku, true); addEventListener('blur', unstick);
  const hold = (label: string, k: string): HTMLButtonElement => {
    const b = button(label, () => {}); b.classList.add('hold');
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); held.add(k); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => held.delete(k));
    return b;
  };
  return { held, hold, stop: () => { removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); removeEventListener('blur', unstick); } };
}

/** Camera flash over the whole screen. */
export function flash(): void {
  const f = document.querySelector('#flash') as HTMLElement;
  f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
}
