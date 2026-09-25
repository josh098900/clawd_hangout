// KARAOKE's screens: the song menu at the machine, the lyrics strip across the top for everyone
// on the Stage while a song is on, and (if you're performing) your note lane: the notes coming
// towards the line, labelled with the key (1-8) to press, with PERFECT / GOOD / OFF KEY / MISS.

import { mmss } from '../engine/format';
import { K } from '../engine/palette';
import { r, txt, tw, lit, bake } from '../engine/pixel';
import { SONGS, songLen, stepS, lane, lineWords, kTime, kWhere, grade, type KaraokeState, type Performance } from '../game/karaoke';
import { button, openModal, row, font } from './modal';


/** Pick a song (or stop the one that's on). */
export function openSongs(on: { pick: (n: number) => void; stop: (() => void) | null; season: string | null }, onClose: () => void): void {
  const m = openModal('KARAOKE', onClose);
  const hint = document.createElement('div');
  hint.textContent = on.stop ? 'A song is on right now.' : 'Pick a song. Whoever is at the MIC sings the words; KEYS, DRUMS and BASS play along. The crowd cheers with emotes to fill the HYPE bar.';
  Object.assign(hint.style, font(20, '#9FEFFF'), { maxWidth: '460px', textAlign: 'center' });
  m.body.append(hint);
  if (on.stop) { m.body.append(row(button('STOP THE SONG', () => { m.close(); on.stop!(); }), button('CLOSE', m.close, true))); return; }
  const list = document.createElement('div'); Object.assign(list.style, { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 'min(460px, 86vw)' });
  SONGS.forEach((g, n) => {
    if (g.season && g.season !== on.season) return;
    const line = document.createElement('div'); Object.assign(line.style, { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: 'rgba(255,255,255,.05)', borderLeft: '3px solid #FF5FD2' });
    const name = document.createElement('span'); name.textContent = g.name; Object.assign(name.style, { fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#FFF3D6', minWidth: '150px' });
    const info = document.createElement('span'); info.textContent = g.style.toLowerCase() + ' · ' + mmss(songLen(g), 'near'); Object.assign(info.style, font(19, '#E8D8C0'), { flex: '1' });
    line.append(name, info, button('SING', () => { m.close(); on.pick(n); })); list.appendChild(line);
  });
  m.body.append(list, row(button('CLOSE', m.close, true)));
}

// ---------- the lyrics strip + your note lane ----------
const HW = 300, HH = 64, HIT_X = 26, SPEED = 70; // the lane's pixels, and how fast notes come (px per second)
export class KaraokeHud {
  readonly el = document.createElement('div');
  private l1 = document.createElement('div'); private l2 = document.createElement('div'); private meta = document.createElement('div');
  private cv = document.createElement('canvas'); private g = this.cv.getContext('2d')!;
  private shownLine = -99; private spans: { el: HTMLSpanElement; s: number }[] = [];
  constructor(bar: HTMLElement) {
    this.el.id = 'lyrics'; this.l1.className = 'l1'; this.l2.className = 'l2'; this.meta.className = 'meta';
    this.el.append(this.meta, this.l1, this.l2); document.body.appendChild(this.el);
    this.cv.id = 'lane'; this.cv.width = HW; this.cv.height = HH; bar.prepend(this.cv);
    this.hide();
  }
  hide(): void { this.el.style.display = 'none'; this.cv.style.display = 'none'; this.shownLine = -99; }
  /** Called every frame on the Stage while a song is on. */
  update(k: KaraokeState, hype: number, band: number, perf: Performance | null, strip: boolean): void {
    const g = SONGS[k.song], t = kTime(k), wh = kWhere(k);
    this.el.style.display = strip ? '' : 'none'; // (only when the Stage's big screen is out of view)
    this.meta.textContent = g.name + '  ·  BAND ' + band + '  ·  HYPE ' + Math.round(hype * 100) + '%' + (perf ? '  ·  YOU ' + perf.score(true) + (perf.combo > 2 ? '  x' + perf.combo : '') : '');
    const li = t < 0 ? -2 : wh.done ? 99 : wh.line;
    if (li !== this.shownLine) {
      this.shownLine = li; this.spans = []; this.l1.replaceChildren(); this.l2.textContent = '';
      if (t < 0) this.l1.textContent = 'GET READY...';
      else if (wh.done) this.l1.textContent = 'THAT WAS ' + g.name + '!';
      else if (li < 0) { this.l1.textContent = '♪ ♪ ♪'; this.l2.textContent = lineWords(k.song, 0).text; }
      else if (li < g.lines.length) {
        for (const n of lineWords(k.song, li).notes) { const s = document.createElement('span'); s.textContent = (n.syl.endsWith('~') ? n.syl.slice(0, -1) : n.syl + ' ').toUpperCase(); this.l1.appendChild(s); this.spans.push({ el: s, s: n.s }); }
        if (li + 1 < g.lines.length) this.l2.textContent = lineWords(k.song, li + 1).text;
      } else this.l1.textContent = '♪ ♪ ♪';
    }
    for (const sp of this.spans) sp.el.className = wh.step >= sp.s + 2 ? 'sung' : wh.step >= sp.s - 0.2 ? 'now' : '';
    // your lane
    if (!perf || wh.done) { this.cv.style.display = 'none'; return; }
    this.cv.style.display = '';
    bake(this.g, () => {
      const col = ([K.CYAN, K.GOLD, K.MAG, [124, 242, 156]] as [number, number, number][])[perf.inst], rows = perf.inst === 1 ? 2 : 8, rh = (HH - 12) / rows, ss = stepS(g);
      r(0, 0, HW, HH, [12, 8, 24]);
      for (let j = 0; j < rows; j++) r(0, 10 + Math.round(j * rh), HW, 1, [26, 20, 44]);
      r(HIT_X, 8, 2, HH - 8, [255, 255, 255]); r(HIT_X - 1, 8, 4, 1, [255, 255, 255]);
      lane(k.song, perf.inst).forEach((n, i) => {
        const x = HIT_X + (n.s * ss - t) * SPEED; if (x < -10 || x > HW + 4) return;
        const j = perf.judged.get(i), y = 10 + Math.round((rows - 1 - (perf.inst === 1 ? n.p : n.p)) * rh), w = Math.max(9, Math.round(n.len * ss * SPEED) - 2);
        if (j && j !== 'MISS') return; // (hit ones vanish)
        const c = j === 'MISS' ? [70, 60, 80] as [number, number, number] : col;
        r(Math.round(x) - 4, y, w, Math.max(5, Math.round(rh) - 1), c); lit(() => txt(String(n.p + 1), Math.round(x) - 2, y + Math.max(0, Math.round(rh / 2) - 3), [10, 8, 24]));
      });
      const L = perf.last; if (L && t - L.t < 0.6) { const c = L.j === 'PERFECT' ? K.GOLD : L.j === 'GOOD' ? [124, 242, 156] as [number, number, number] : L.j === 'OFF KEY' ? K.CYAN : [255, 90, 90] as [number, number, number]; lit(() => txt(L.j, HIT_X + 8, 1, c)); }
      const who = ['KEYS', 'DRUMS', 'BASS', 'MIC'][perf.inst] + ' · YOU ' + perf.score(true) + (perf.combo > 2 ? ' · x' + perf.combo : '');
      txt(who, HW - tw(who) - 3, 1, col);
    });
  }
}
/** The results line at the end of a song. */
export const resultLine = (name: string, score: number, band: number): string => name + ': YOU ' + score + ' (' + grade(score) + ') · BAND ' + band + ' (' + grade(band) + ')';
