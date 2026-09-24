// The garden's two little panels: the seed packet picker (for a free bed) and your own plant's
// card (water it, harvest it, or dig it up and start again).

import { SEEDS, duration, plantLine, plantState } from '../world/garden';
import type { Plot } from '../net/transport';
import { button, openModal, row } from './modal';

const font = (px: number, color: string) => ({ fontFamily: "'VT323', monospace", fontSize: px + 'px', color });

/** Pick a seed for bed `bed`. `tokens` = your balance, `moon` = you have a found moonflower seed. */
export function openSeeds(bed: number, tokens: number, moon: boolean, pick: (seed: number) => void, onClose: () => void): void {
  const m = openModal('SEEDS · BED ' + (bed + 1), onClose);
  const list = document.createElement('div'); Object.assign(list.style, { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 'min(420px, 84vw)' });
  SEEDS.forEach((s, i) => {
    if (s.find && !moon) return;
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
