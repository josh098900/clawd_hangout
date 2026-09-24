// Keyboard (WASD / arrows) + tap/click-to-walk. Typing in an input never moves you.

export class Input {
  private keys = new Set<string>();
  /** Click/tap destination in CSS px, consumed by the game. */
  tap: { x: number; y: number } | null = null;
  onKey: ((e: KeyboardEvent) => void) | null = null;

  constructor(target: HTMLElement) {
    addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      const k = norm(e.key);
      if (k) { this.keys.add(k); e.preventDefault(); this.tap = null; }
      this.onKey?.(e);
    });
    addEventListener('keyup', (e) => { const k = norm(e.key); if (k) this.keys.delete(k); });
    addEventListener('blur', () => this.keys.clear());
    target.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const rc = target.getBoundingClientRect();
      this.tap = { x: e.clientX - rc.left, y: e.clientY - rc.top };
    });
  }

  /** -1..1 on each axis. */
  axis(): { x: number; y: number } {
    let x = 0, y = 0;
    if (this.keys.has('L')) x -= 1; if (this.keys.has('R')) x += 1;
    if (this.keys.has('U')) y -= 1; if (this.keys.has('D')) y += 1;
    return { x, y };
  }
  clear(): void { this.keys.clear(); }
}

function norm(k: string): 'L' | 'R' | 'U' | 'D' | null {
  switch (k) {
    case 'ArrowLeft': case 'a': case 'A': return 'L';
    case 'ArrowRight': case 'd': case 'D': return 'R';
    case 'ArrowUp': case 'w': case 'W': return 'U';
    case 'ArrowDown': case 's': case 'S': return 'D';
  }
  return null;
}
export function isTyping(e: Event): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}
