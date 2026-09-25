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

/** Camera flash over the whole screen. */
export function flash(): void {
  const f = document.querySelector('#flash') as HTMLElement;
  f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
}
