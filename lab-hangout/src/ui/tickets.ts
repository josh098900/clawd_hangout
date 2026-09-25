// The Diner's order tickets as a strip at the top of the screen (so you can see them from any
// station), while a kitchen shift is on and you're in the Diner. Built from the shift state.

import { DISH_NAME, openTickets, type DinerState } from '../game/diner';

const strip = document.createElement('div');
strip.id = 'tickets'; strip.setAttribute('aria-live', 'polite');
document.body.appendChild(strip);
let shown = '';

/** Show `g`'s open tickets (or hide the strip with null). Cheap to call every frame. */
export function syncTickets(g: DinerState | null, now = Date.now()): void {
  const open = g ? openTickets(g, now).slice(0, 5) : [];
  const key = open.map((t) => t.i + ':' + (g!.served[t.i] ?? 0)).join(',');
  if (key !== shown) {
    shown = key;
    strip.classList.toggle('on', open.length > 0);
    strip.replaceChildren(...open.map((t) => {
      const card = document.createElement('div'); card.className = 'ticket';
      const n = document.createElement('b'); n.textContent = '#' + (t.i + 1); card.appendChild(n);
      t.dishes.forEach((d, k) => { const s = document.createElement('span'); s.textContent = DISH_NAME[d]; if ((g!.served[t.i] ?? 0) & (1 << k)) s.className = 'done'; card.appendChild(s); });
      const bar = document.createElement('i'); card.appendChild(bar);
      card.dataset.at = String(t.at); card.dataset.due = String(t.due);
      return card;
    }));
  }
  for (const c of strip.children as HTMLCollectionOf<HTMLElement>) {
    const at = Number(c.dataset.at), due = Number(c.dataset.due), u = Math.max(0, Math.min(1, (due - now) / (due - at)));
    const bar = c.lastElementChild as HTMLElement; bar.style.width = Math.round(u * 100) + '%'; bar.style.background = u > 0.5 ? '#50BE6E' : u > 0.25 ? '#F0BE3C' : '#E6463C';
    c.classList.toggle('late', u < 0.2);
  }
}
