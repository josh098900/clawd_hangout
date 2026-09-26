// THE RECIPE BOOK (the chem lab's lectern): every reaction there is to find. The ones you've found show their recipe as
// coloured reagent chips and what they do; the rest are ??? with a riddle. Twenty in all: the CHEMIST badge wants them all.

import { REACTIONS, REAGENTS, found, inMix, type Reaction } from '../game/chem';
import { css } from '../engine/pixel';
import { save } from '../game/save';
import { button, openModal, row } from './modal';

/** What each one does, once you've found it. */
const DOES: Record<string, string> = {
  foam: 'green foam erupts and oozes over the bench', sparkler: 'five seconds of gold sparks', fountain: 'bubbles stream up to the ceiling',
  smoke: 'rings of rainbow smoke', ice: 'frost, ice shards and snowflakes', storm: 'a tiny rain cloud, with lightning', lava: 'blobs rise and sink in a glowing beaker',
  geyser: 'a column of goo, then SPLAT', worm: 'a glowing worm wriggles off across the floor', fireflies: 'a dozen lights wander the room',
  boom: 'a flash, a bang and frazzled fur', disco: 'a disco ball comes down and the lights go wild',
  tiny: 'drink it: half size for 30 s', huge: 'drink it: double size for 30 s', rainbow: 'drink it: every colour for 30 s', glowing: 'drink it: you light up for 30 s',
  bubbly: 'drink it: a trail of bubbles for 30 s', floaty: 'drink it: float along for 30 s',
  toothpaste: 'the whole floor fills with foam', confetti: 'the cannon fires confetti over everyone',
};
const GROUPS: [Reaction['group'], string][] = [['reaction', 'REACTIONS'], ['potion', 'POTIONS (DRINK THEM: EVERYONE SEES)'], ['duo', 'TWO CHEMISTS, ONE MOMENT']];

export function openRecipeBook(onClose: () => void): void {
  const m = openModal('THE RECIPE BOOK', onClose), have = save.data.chem, n = found(have);
  const head = document.createElement('div'); head.textContent = 'DISCOVERED ' + n + '/' + REACTIONS.length + (n === REACTIONS.length ? ' · CHEMIST!' : '');
  Object.assign(head.style, { fontFamily: "'Press Start 2P', monospace", fontSize: '11px', color: '#FFD65A', textAlign: 'center' });
  const sub = document.createElement('div'); sub.textContent = n === REACTIONS.length ? 'Every page filled in. You\'re a real chemist.' : 'Mix 2 or 3 reagents at a bench. Find all ' + REACTIONS.length + ' for the CHEMIST badge.';
  Object.assign(sub.style, { fontFamily: "'VT323', monospace", fontSize: '18px', color: '#9FEFFF', textAlign: 'center' });
  const list = document.createElement('div'); Object.assign(list.style, { display: 'flex', flexDirection: 'column', gap: '8px', width: 'min(640px, 86vw)', maxHeight: '54vh', overflowY: 'auto' });
  for (const [g, title] of GROUPS) {
    const h = document.createElement('div'); h.textContent = title; Object.assign(h.style, { fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#E8D8C0', margin: '4px 0 0' });
    const grid = document.createElement('div'); Object.assign(grid.style, { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '6px' });
    for (const rx of REACTIONS.filter((q) => q.group === g)) grid.appendChild(entry(rx, have.includes(rx.id)));
    list.append(h, grid);
  }
  m.body.append(head, sub, list, row(button('CLOSE', m.close, true)));
}
function entry(rx: Reaction, got: boolean): HTMLElement {
  const cell = document.createElement('div');
  Object.assign(cell.style, { display: 'flex', flexDirection: 'column', gap: '3px', padding: '6px 8px', background: got ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.25)', borderLeft: '3px solid ' + (got ? css(rx.c) : '#44405A'), fontFamily: "'VT323', monospace", fontSize: '19px', color: got ? '#FFF3D6' : '#7A7690', textAlign: 'left' });
  const nm = document.createElement('div'); nm.textContent = got ? rx.name : '???';
  const line = document.createElement('div'); Object.assign(line.style, { display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', fontSize: '16px' });
  if (got && rx.mix) for (const i of inMix(rx.mix)) { const chip = document.createElement('span'); chip.textContent = REAGENTS[i].short; Object.assign(chip.style, { padding: '0 5px', borderRadius: '3px', background: css(REAGENTS[i].c), color: '#16121E' }); line.appendChild(chip); }
  const what = document.createElement('div'); what.textContent = got ? DOES[rx.id] ?? '' : rx.hint; Object.assign(what.style, { fontSize: '16px', color: got ? '#9FEFFF' : '#6A6680' });
  cell.append(nm); if (line.childNodes.length) cell.append(line); cell.append(what);
  return cell;
}
