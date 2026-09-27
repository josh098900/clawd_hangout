// THE SEA LIFE LOG (SARDINE 1's chart table, and the pen's dive board): every creature there is to photograph from the sub, a page per
// zone. The ones you've got show their picture, name and a line; the rest are dark shapes with ??? and a hint. Ten earn the DIVING
// HELMET, all twenty the MARINE BIOLOGIST badge. Kept in your save (game/save.ts `sea`).

import { LOG, HELMET_AT, type Creature } from '../game/sub';
import { save } from '../game/save';
import { PX, mk, withCtx } from '../engine/pixel';
import { anglerfish, clownfish, drawCatch, dumbo, garibaldi, grouper, humpback, jelly, lanternfish, leopardShark, manta, moray, octopusRock, seaOtter, seahorse, seal, shoal, turtle, yetiCrab } from '../world/sealife';
import { button, font, openModal, row } from './modal';

const HEAD = { fontFamily: "'Press Start 2P', monospace", fontSize: '11px', color: '#FFD65A', textAlign: 'center' };
const PW = 90, PH = 46;
/** A creature's picture (a dark shape if you haven't got it yet). */
function picture(c: Creature, got: boolean): HTMLCanvasElement {
  const cv = mk(PW, PH), g = cv.getContext('2d')!, glow = PX.glow, d = PX.dim, e = PX.emit, f = PX.fl;
  PX.glow = mk(4, 4).getContext('2d')!; PX.dim = 0; PX.emit = false; PX.fl = 0;
  try { withCtx(g, () => draw(c.id, PW / 2, PH / 2 + 4)); } finally { PX.glow = glow; PX.dim = d; PX.emit = e; PX.fl = f; }
  if (!got) { g.globalCompositeOperation = 'source-in'; g.fillStyle = '#3C4460'; g.fillRect(0, 0, PW, PH); g.globalCompositeOperation = 'source-over'; }
  cv.style.width = PW * 2 + 'px'; cv.style.height = PH * 2 + 'px'; cv.style.imageRendering = 'pixelated'; cv.style.flex = 'none';
  return cv;
}
function draw(id: string, x: number, y: number): void {
  const a = 1.3;
  switch (id) {
    case 'jelly': jelly(x, y - 4, [200, 220, 255], a, 0, 1.2); break;
    case 'sardines': shoal(x, y, 30, a, 0.8); break;
    case 'otter': seaOtter(x, y, 1, a); break;
    case 'seal': seal(x, y, 1, a); break;
    case 'seahorse': seahorse(x, y, a, 1); break;
    case 'garibaldi': garibaldi(x, y, 1, a); break;
    case 'leopard': leopardShark(x, y, 1, a); break;
    case 'turtle': turtle(x, y, 1, a); break;
    case 'clownfish': clownfish(x - 3, y, 1, a); clownfish(x + 5, y + 4, -1, a); break;
    case 'octopus': octopusRock(x, y + 4, a, 1); break;
    case 'moray': moray(x - 8, y, a, 1.4); break;
    case 'manta': manta(x, y, 1, a); break;
    case 'grouper': grouper(x - 10, y, a, 1); break;
    case 'swordfish': drawCatch('SWORDFISH', x, y, 1, 2, a); break;
    case 'lantern': for (let i = 0; i < 6; i++) lanternfish(x - 20 + i * 8, y - 6 + (i % 3) * 5, a, i); break;
    case 'whale': withCtx(PX.ctx, () => { const g = PX.ctx; g.save(); g.translate(x, y); g.scale(0.42, 0.42); humpback(0, 0, 1, a); g.restore(); }); break;
    case 'angler': anglerfish(x, y, 1, a, true); break;
    case 'dumbo': dumbo(x, y, 1, a); break;
    case 'yeti': yetiCrab(x - 8, y + 4, 1, a); yetiCrab(x + 8, y + 5, -1, a + 1); break;
    case 'squid': { const g = PX.ctx; g.fillStyle = '#C44654'; for (let k = 0; k < 7; k++) { g.fillRect(x - 30 + k * 9, y - 8 + (k % 2) * 4, 7, 3); g.fillRect(x - 28 + k * 9, y - 3 + (k % 3) * 3, 3, 12); } g.fillStyle = '#E6DC78'; g.fillRect(x - 5, y - 16, 10, 10); g.fillStyle = '#140A0E'; g.fillRect(x - 2, y - 13, 4, 4); break; }
  }
}
const ZONES: [string, string][] = [['THE HARBOUR', 'THE HARBOUR'], ['THE KELP FOREST', 'THE KELP FOREST'], ['THE CORAL REEF', 'THE CORAL REEF'], ['THE WRECK', 'THE WRECK AND THE DROP-OFF'], ['THE DROP-OFF', ''], ['THE TRENCH', 'THE TRENCH']];
export function openSeaLog(onClose: () => void): void {
  const m = openModal('THE SEA LIFE LOG', onClose), have = save.data.sea, n = LOG.filter((c) => have.includes(c.id)).length;
  const head = document.createElement('div'); Object.assign(head.style, HEAD); head.textContent = 'FOUND ' + n + '/' + LOG.length + (n === LOG.length ? ' · MARINE BIOLOGIST!' : n >= HELMET_AT ? ' · DIVING HELMET!' : '');
  const sub = document.createElement('div'); Object.assign(sub.style, { ...font(18, '#9FEFFF'), textAlign: 'center', maxWidth: 'min(640px, 86vw)' });
  sub.textContent = n === LOG.length ? 'Every page filled in. A real marine biologist.' : 'SNAP them from SARDINE 1\'s camera: ' + HELMET_AT + ' for the DIVING HELMET, all ' + LOG.length + ' for the MARINE BIOLOGIST badge.';
  const list = document.createElement('div'); Object.assign(list.style, { display: 'flex', flexDirection: 'column', gap: '8px', width: 'min(660px, 88vw)', maxHeight: '54vh', overflowY: 'auto' });
  for (const [zone, title] of ZONES) {
    const inZone = LOG.filter((c) => c.zone === zone); if (!inZone.length) continue;
    if (title) { const h = document.createElement('div'); h.textContent = title; Object.assign(h.style, { fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#E8D8C0', margin: '4px 0 0' }); list.appendChild(h); }
    const grid = document.createElement('div'); Object.assign(grid.style, { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '6px' });
    for (const c of inZone) {
      const got = have.includes(c.id), cell = document.createElement('div');
      Object.assign(cell.style, { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', background: got ? 'rgba(90,170,255,.1)' : 'rgba(0,0,0,.25)', borderLeft: '3px solid ' + (got ? '#5FE7FF' : '#44405A'), ...font(18, got ? '#FFF3D6' : '#7A7690'), textAlign: 'left' });
      const txt = document.createElement('div'); txt.style.flex = '1';
      const nm = document.createElement('div'); nm.textContent = got ? c.name : '???'; nm.style.color = got ? '#9FEFFF' : '#7A7690';
      const ln = document.createElement('div'); ln.textContent = got ? c.line : c.hint; Object.assign(ln.style, font(16, got ? '#E8D8C0' : '#6A6680'));
      txt.append(nm, ln); cell.append(picture(c, got), txt); grid.appendChild(cell);
    }
    list.appendChild(grid);
  }
  m.body.append(head, sub, list, row(button('CLOSE', m.close, true)));
}
