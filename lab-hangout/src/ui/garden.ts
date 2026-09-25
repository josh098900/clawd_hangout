// The garden's two little panels: the seed packet picker (for a free bed) and your own plant's
// card (water it, harvest it, or dig it up and start again).

import { SEEDS, duration, plantLine, plantState } from '../world/garden';
import type { Plot } from '../net/transport';
import { button, openModal, row } from './modal';

const font = (px: number, color: string) => ({ fontFamily: "'VT323', monospace", fontSize: px + 'px', color });

/** Pick a seed for bed `bed`. `tokens` = your balance, `has(i)` = you're holding a found seed of kind i (moonflower, comet bloom). */
export function openSeeds(bed: number, tokens: number, has: (seed: number) => boolean, pick: (seed: number) => void, onClose: () => void): void {
  const m = openModal('SEEDS · BED ' + (bed + 1), onClose);
  const list = document.createElement('div'); Object.assign(list.style, { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 'min(420px, 84vw)' });
  SEEDS.forEach((s, i) => {
    if (s.find && !has(i)) return;
    const line = document.createElement('div'); Object.assign(line.style, { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: 'rgba(255,255,255,.05)', borderLeft: '3px solid ' + (s.find ? '#9FEFFF' : '#7CF29C') });
    const name = document.createElement('span'); name.textContent = s.name; Object.assign(name.style, { fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#FFF3D6', minWidth: '96px' });
    const info = document.createElement('span'); info.textContent = 'grows in ' + duration(s.growS) + ' · harvest pays ' + s.pays; Object.assign(info.style, font(19, '#E8D8C0'), { flex: '1' });
    const cost = s.find ? 'PLANT (FOUND SEED)' : 'BUY · ' + s.cost;
    const b = button(cost, () => { m.close(); pick(i); }, !s.find && tokens < s.cost);
    b.disabled = !s.find && tokens < s.cost;
    line.append(name, info, b); list.appendChild(line);
  });
  const hint = document.createElement('div'); hint.textContent = 'You have ' + tokens + ' tokens. One plant at a time. Anyone can water it; unwatered for a day, it wilts.';
  Object.assign(hint.style, font(18, '#9FEFFF'), { maxWidth: '420px', textAlign: 'center' });
  m.body.append(hint, list, row(button('CLOSE', m.close, true)));
}

/** Your own plant: how it's doing, and what you can do with it. */
export function openMyPlant(p: Plot, on: { water: () => void; harvest: () => void; digUp: () => void }, onClose: () => void): void {
  const st = plantState(p), m = openModal('YOUR ' + SEEDS[p.seed].name, onClose);
  const txt = document.createElement('div'); txt.textContent = plantLine(p, true) + (st.wilted || st.wet ? '' : ' · watered ' + duration(st.dryFor) + ' ago');
  Object.assign(txt.style, font(21, '#E8D8C0'), { maxWidth: '420px', textAlign: 'center' });
  const water = button('WATER', () => { m.close(); on.water(); }), harvest = button('HARVEST', () => { m.close(); on.harvest(); });
  water.disabled = st.wet; harvest.disabled = st.stage < 4 || st.dead;
  const dig = button('DIG UP', () => { if (confirm('Dig up your ' + SEEDS[p.seed].name + '? You won\'t get the seed back.')) { m.close(); on.digUp(); } }, true);
  m.body.append(txt, row(harvest, water, dig, button('CLOSE', m.close, true)));
}

// ---------- the Space Station's hydroponic trays (world/station.ts) ----------
/** A free tray: plant a STAR MELON? */
export function openFreeTray(tray: number, tokens: number, plant: () => void, onClose: () => void): void {
  const m = openModal('HYDROPONICS · TRAY ' + (tray + 1), onClose);
  const t = document.createElement('div');
  t.textContent = 'Plant a STAR MELON for 3 tokens. It grows in zero gravity under the pink lights and is ripe in 30 minutes. The harvest pays 5 tokens, and inside is a rare COMET BLOOM seed for the Rooftop garden.';
  Object.assign(t.style, font(21, '#E8D8C0'), { maxWidth: '440px', textAlign: 'center' });
  const hint = document.createElement('div'); hint.textContent = 'You have ' + tokens + ' tokens. One melon at a time.'; Object.assign(hint.style, font(18, '#9FEFFF'));
  const b = button('PLANT · 3', () => { m.close(); plant(); }); b.disabled = tokens < 3;
  m.body.append(t, hint, row(b, button('CLOSE', m.close, true)));
}
/** Your own melon: how it's doing, harvest it, or pull it up. */
export function openMyTray(line: string, ripe: boolean, on: { harvest: () => void; digUp: () => void }, onClose: () => void): void {
  const m = openModal('YOUR STAR MELON', onClose);
  const t = document.createElement('div'); t.textContent = line; Object.assign(t.style, font(21, '#E8D8C0'), { maxWidth: '420px', textAlign: 'center' });
  const hv = button('HARVEST', () => { m.close(); on.harvest(); }); hv.disabled = !ripe;
  const dig = button('PULL IT UP', () => { if (confirm('Pull up your star melon? You won\'t get the seed back.')) { m.close(); on.digUp(); } }, true);
  m.body.append(t, row(hv, dig, button('CLOSE', m.close, true)));
}
