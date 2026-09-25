// The claw machine, up close. PLAY asks the server first (it takes the tokens and picks the
// prize), then the claw plays out that result: sweep, drop, grab a capsule, carry it to the
// chute, pop it open. The reveal shows your critter wearing the prize, with a WEAR IT button.

import { K, CONFETTI, type RGB } from '../engine/palette';
import { r, disc, line, txt, tw, M, bake } from '../engine/pixel';
import { basePose, composeCritter, itemName, RARITY, type Look } from '../entities/critter';
import type { ClawResult } from '../net/transport';
import { SFX } from '../audio/sfx';
import { button, openModal, row } from './modal';

const W = 150, H = 120, CAPS: RGB[] = [[255, 95, 170], [90, 209, 255], [255, 214, 90], [124, 242, 156], [180, 130, 255], [255, 140, 90]];
const RARE_COL: Record<string, string> = { COMMON: '#E8D8C0', UNCOMMON: '#7CF29C', RARE: '#5FE7FF', LEGENDARY: '#FFD65A', SPECIAL: '#FF9AD8' };

export interface ClawHooks {
  play(): Promise<ClawResult>;
  look(): Look;
  /** Put the prize on (the item id is 'slot:index'). */
  wear(item: string): void;
  /** A play started (so the cabinet animates for everyone nearby) / a prize was won. */
  started(): void;
  won(r: ClawResult): void;
  onClose(): void;
}

/** Look with one item swapped in (to preview a prize). */
export function withItem(look: Look, item: string): Look {
  const [slot, i] = item.split(':'), n = Number(i), l = { ...look };
  if (slot === 'hat') l.hat = n; else if (slot === 'face') l.face = n; else if (slot === 'fit') l.fit = n; else if (slot === 'pet') l.pet = n;
  return l;
}

export function openClaw(h: ClawHooks): void {
  const S = Math.max(2, Math.min(4, Math.floor(Math.min((innerWidth - 60) / W, (innerHeight - 280) / H))));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.style.width = W * S + 'px'; cv.style.height = H * S + 'px';
  const g = cv.getContext('2d')!;
  const msg = document.createElement('div'); Object.assign(msg.style, { fontFamily: "'VT323', monospace", fontSize: '21px', color: '#9FEFFF', minHeight: '44px', textAlign: 'center', maxWidth: W * S + 'px' });
  msg.textContent = '3 tokens a go. Every capsule has a prize in it. Already got it? 1 token back.';
  let raf = 0, t0 = -1, res: ClawResult | null = null, target = 0.5, revealed = false;
  const pile = Array.from({ length: 26 }, (_, k) => ({ x: 22 + (k % 9) * 11 + (Math.floor(k / 9) % 2) * 5, y: 96 - Math.floor(k / 9) * 8, c: CAPS[k % CAPS.length] }));
  const m = openModal('CLAW MACHINE', () => { cancelAnimationFrame(raf); h.onClose(); });
  const play = button('PLAY (3 TOKENS)', async () => {
    if (t0 >= 0 && !revealed) return;
    play.disabled = true; wear.style.display = 'none'; msg.style.color = '#9FEFFF'; msg.textContent = '...';
    try { res = await h.play(); } catch (e) { msg.style.color = '#FF9A8A'; msg.textContent = e instanceof Error ? e.message : String(e); play.disabled = false; SFX.hurt(); return; }
    h.started(); SFX.zap();
    t0 = performance.now() / 1000; revealed = false; target = 0.15 + Math.random() * 0.7;
    msg.textContent = 'The claw is moving...';
  });
  const wear = button('WEAR IT', () => { if (res) { h.wear(res.item); SFX.chime(); msg.textContent = 'Looking good!'; wear.style.display = 'none'; } });
  wear.style.display = 'none';
  const reveal = () => {
    if (!res) return;
    revealed = true; play.disabled = false; play.textContent = 'PLAY AGAIN (3)';
    const rar = RARITY(res.item);
    msg.style.color = RARE_COL[rar] ?? '#FFF'; msg.textContent = (res.dupe ? 'Another ' : 'YOU WON: ') + itemName(res.item) + ' · ' + rar + (res.dupe ? ' (you had it: +1 token back)' : '!');
    if (!res.dupe) { wear.style.display = ''; SFX.score(); } else SFX.chime();
    h.won(res);
  };
  const draw = () => {
    const now = performance.now() / 1000, u = t0 >= 0 ? now - t0 : -1;
    bake(g, () => {
      r(0, 0, W, H, [20, 16, 34]); for (let y = 0; y < H; y += 6) r(0, y, W, 1, [26, 20, 42]);
      r(4, 4, W - 8, 3, [140, 140, 160]); r(4, H - 22, 26, 18, [50, 40, 60]); r(6, H - 20, 22, 14, [16, 12, 24]); txt('OUT', 10, H - 16, [150, 140, 170]);
      for (const p of pile) { disc(p.x + 20, p.y, 4, p.c); r(p.x + 17, p.y, 7, 1, K.WHITE); r(p.x + 18, p.y - 3, 2, 1, M(p.c, [255, 255, 255], 0.6)); }
      // the claw: sweep (0-1.6s) -> drop (1.6-2.4) -> lift (2.4-3.2) -> carry to the chute (3.2-4.2) -> release
      let cx = W / 2 + Math.sin(now * 0.8) * 30, cy = 12, grab = false, carry = false;
      if (u >= 0) {
        const tx = 20 + target * (W - 40), home = 17;
        if (u < 1.6) cx = W / 2 + (tx - W / 2) * Math.min(1, u / 1.4) + Math.sin(u * 9) * 2 * (1 - u / 1.6);
        else if (u < 2.4) { cx = tx; cy = 12 + ((u - 1.6) / 0.8) * 66; }
        else if (u < 3.2) { cx = tx; cy = 78 - ((u - 2.4) / 0.8) * 66; grab = true; carry = true; }
        else if (u < 4.2) { cx = tx + (home - tx) * ((u - 3.2) / 1); grab = true; carry = true; }
        else { cx = home; carry = u < 4.5; }
        if (u >= 4.5 && !revealed) reveal();
      }
      line(Math.round(cx), 7, Math.round(cx), Math.round(cy), [200, 200, 210]);
      const op = grab ? 1 : 3; r(Math.round(cx) - 4, Math.round(cy), 9, 3, [220, 220, 230]); r(Math.round(cx) - 4 - op, Math.round(cy) + 3, 2, 7, [220, 220, 230]); r(Math.round(cx) + 3 + op, Math.round(cy) + 3, 2, 7, [220, 220, 230]);
      if (carry) { const c = CAPS[Math.floor(target * 60) % CAPS.length]; disc(Math.round(cx), Math.round(cy) + 10, 4, c); r(Math.round(cx) - 3, Math.round(cy) + 10, 7, 1, K.WHITE); }
      // the prize pops out of the chute: a capsule bursting, your critter wearing it
      if (u >= 4.5 && res) {
        const k = Math.min(1, (u - 4.5) / 0.4), look = withItem(h.look(), res.item);
        g.globalAlpha = 0.78 * k; r(28, 26, W - 56, 80, [12, 8, 22]); g.globalAlpha = 1;
        for (let i = 0; i < 18; i++) { const an = i * 0.35, d = k * 40; r(Math.round(W / 2 + Math.cos(an) * d), Math.round(58 + Math.sin(an) * d * 0.7), 2, 2, CONFETTI[i % CONFETTI.length]); }
        const P = basePose(1); P.arm = 'wave'; P.wave = Math.sin(now * 10); P.eyes = 'h'; P.sy = 1 + 0.04 * Math.sin(now * 6);
        const c = composeCritter(look, P, 0); g.setTransform(k, 0, 0, k, W / 2, 88); g.drawImage(c.cv, -c.ox, -c.oy); g.setTransform(1, 0, 0, 1, 0, 0);
        const nm = (res.item.startsWith('pet:') ? 'PET: ' : '') + itemName(res.item); txt(nm, W / 2 - tw(nm) / 2, 96, K.GOLD);
      }
    });
    raf = requestAnimationFrame(draw);
  };
  m.body.append(cv, msg, row(play, wear, button('CLOSE', m.close, true)));
  draw();
}
