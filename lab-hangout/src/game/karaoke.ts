// KARAOKE on the Stage: five original songs, each a chart you play along to.
//
// A song is 12 lines of 16 eighth-note steps: a line of intro, ten sung lines, a line of outro.
// Each line is 16 tokens: '.' rest, '-' hold the last note, or 'P:syl' = sing pad P (0-7, the
// Stage's C pentatonic: C4 D4 E4 G4 A4 C5 D5 E5) on the syllable 'syl' ('~' on the end = the
// word carries on into the next syllable). The singer at the MIC hits those notes; KEYS, DRUMS
// and BASS get simpler lanes worked out from the song's chords, drum pattern and bassline.
//
// Everything runs from the song's start time (room state 'karaoke', wall-clock ms), so every
// browser hears and sees the same song. Each performer scores their own playing and broadcasts
// it now and then ('kscore'); the crowd's emotes and dancing fill a HYPE meter that adds a
// bonus. Tips at the end are paid (and capped) by karaoke_tip() in 0016_karaoke.sql.

import type { Track } from '../audio/music';

export interface Song { name: string; style: string; bpm: number; wave: OscillatorType; drums: string; bass: string; chords: string; lines: string[]; /** only on the machine in this season */ season?: string }

export const SONGS: Song[] = [
  {
    name: 'LAB RATS', style: 'POP ANTHEM', bpm: 116, wave: 'square',
    drums: 'k . h . s . h . k . h k s . h . k . h . s . h . k k h . s . s s',
    bass: 'C2 . C3 . C2 . C3 . G1 . G2 . G1 . G2 . A1 . A2 . A1 . A2 . F1 . F2 . F1 . F2 .',
    chords: 'C G A F',
    lines: [
      '2:we . 2:came 3:in . 3:for 4:the . 3:cof~ 2:fee . . . . . .',
      '2:we . 2:stayed 3:up . 4:all 5:the . 4:night . 3:long . . . . .',
      "5:white . 5:coats 4:and . 3:bub~ 4:bling . 5:beak~ 4:ers . . . . . .",
      '4:the . 3:plan 2:is . 2:ques~ 1:tion . 0:marks . . . . . . .',
      "5:we're . 5:the . 6:lab . 7:rats . 6:lab . 5:rats . . . . .",
      '4:shi~ 4:ning . 5:in . 4:the . 3:neon . . 2:light . . . . .',
      "5:we're . 5:the . 6:lab . 7:rats . 6:lab . 5:rats . . . . .",
      '4:the . 3:plan 4:is . 3:ques~ 2:tion . 1:marks . 0:yeah! . . . . .',
      '7:la . 6:la . 5:la . 4:la . 5:la . 6:la . 7:la . . .',
      '7:lab . . . 6:rats . . . 5:for~ . 6:ev~ . 5:er! . . .',
    ],
  },
  {
    name: 'ORBIT', style: 'SPACE BALLAD', bpm: 84, wave: 'triangle',
    drums: 'k . . . h . . . s . . . h . . . k . . . h . . . s . . . h . h .',
    bass: 'A1 . . . A2 . . . F1 . . . F2 . . . C2 . . . C3 . . . G1 . . . G2 . . .',
    chords: 'A F C G',
    lines: [
      '4:float~ - 5:ing . 4:high . 3:a~ 2:bove . 2:the . 3:blue . . . .',
      '2:earth - 3:is . 4:turn~ 3:ing . 2:slow - . . . . . . .',
      '5:stars - 6:like . 5:sug~ 4:ar . 5:on - 4:the . 3:night . . . .',
      "4:and - 3:i . 2:don't . 1:need - 0:gra~ 1:vi~ 2:ty . . . . .",
      '7:or~ - 6:bit . 5:me - . . 4:round . 5:and . 6:round . . .',
      '7:far - 6:a~ . 5:way . 4:from . 3:the - 2:ground . . . . .',
      '7:or~ - 6:bit . 5:me - . . 4:round . 5:and . 6:round . . .',
      '5:wave - 4:to . 3:the . 2:square . 1:way - 0:down . . . . .',
      '4:oo - - . 5:oo - - . 6:oo - - . 5:oo - - .',
      '4:home - - . 3:is - 2:wait~ 1:ing . 0:down - - . . . .',
    ],
  },
  {
    name: 'GREASY BYTE BOOGIE', style: 'ROCKABILLY', bpm: 150, wave: 'square',
    drums: 'k . s . k k s . k . s . k k s . k . s . k k s . k . s . k s s s',
    bass: 'C2 E2 G2 A2 C3 A2 G2 E2 F2 A2 C3 D3 F3 D3 C3 A2 C2 E2 G2 A2 C3 A2 G2 E2 G2 B2 D3 E3 G2 D3 B2 G2',
    chords: 'C F C G',
    lines: [
      '0:flip . 2:that . 3:bur~ 4:ger . 3:on . 2:the . 3:grill . . . .',
      '0:fries . 2:in . 3:the . 4:fry~ 3:er . 2:get . 3:a . 0:thrill . .',
      '5:shake . 5:shake . 4:shake . 3:that . 4:milk~ 3:shake . 2:up . . . .',
      '3:ding . 3:ding . 4:or~ 5:der . 4:up! . . . . . . . .',
      "5:it's . 5:the . 6:grea~ 5:sy . 4:byte . 5:boo~ 6:gie . 5:yeah . . .",
      '4:ev~ 3:ery~ 4:bo~ 5:dy . 4:come . 3:and . 2:eat . . . . . .',
      "5:it's . 5:the . 6:grea~ 5:sy . 4:byte . 5:boo~ 6:gie . 7:yeah . . .",
      '6:tap . 5:your . 4:feet . 3:to . 2:the . 1:grid~ 0:dle . . . .',
      '0:woo . 2:woo . 3:woo . 4:woo . 5:woo . 6:woo . 7:woo! . . .',
      '5:or~ . 4:der . 5:up! . . . 3:one . 4:more . 5:time! . . .',
    ],
  },
  {
    name: 'SALTY SHANTY', style: 'SEA SHANTY', bpm: 104, wave: 'triangle',
    drums: 'k . . h s . . h k . . h s . . h k . . h s . . h k . h h s s s .',
    bass: 'A1 . . . E2 . . . C2 . . . G2 . . . G1 . . . D2 . . . A1 . . . E2 . . .',
    chords: 'A C G A',
    lines: [
      '4:oh . 4:the . 4:pier . 5:is . 6:long . 5:and . 4:the . 3:nets .',
      '4:are . 3:wet . 2:and . 3:the . 4:fish . 3:are . 2:shy . . .',
      '4:so . 4:we . 4:roast . 5:a . 6:marsh~ 5:mal~ 4:low . 3:by . 4:the .',
      '5:fire . 4:and . 3:we . 2:sing . 1:to . 0:the . 0:sky . . .',
      '5:yo . 5:ho . 6:salt~ 5:y . 4:and . 3:sweet . 4:yo . 5:ho . .',
      '4:hook . 3:a . 2:boot . 3:and . 4:call . 3:it . 2:a . 1:treat .',
      '5:yo . 5:ho . 6:salt~ 5:y . 4:and . 3:sweet . 4:yo . 5:ho . .',
      '4:the . 3:light~ 4:house . 5:blinks . 4:and . 3:the . 2:crabs . 0:dance . .',
      '4:heave . . . 5:ho . . . 4:heave . . . 3:ho . . .',
      '4:one . 5:more . 6:cast . 7:be~ 6:fore . 5:we . 4:go! . . . .',
    ],
  },
  {
    name: 'CRYPT CREEPER', style: 'SPOOKY', bpm: 108, wave: 'sawtooth',
    drums: 'k . . . s . h . k . k . s . h h k . . . s . h . k . k . s s s s',
    bass: 'A1 . A1 . E2 . A1 . A1 . A1 . G1 . G1 . F1 . F1 . C2 . F1 . E1 . E1 . B1 . E1 .',
    chords: 'A A F E',
    lines: [
      '4:down . 4:in . 4:the . 5:crypt . 4:where . 3:the . 2:can~ 1:dles . .',
      '4:flick~ 3:er . 2:in . 1:the . 2:dark . 3:and . 4:the . 0:cold . .',
      '4:push . 4:the . 5:stones . 6:and . 5:the . 4:door . 5:will . 4:groan .',
      "3:there's 2:a . 1:crown . 0:in . 1:a . 2:chest . 4:of . 4:gold . .",
      "7:boo! . . . 6:who's . 5:that . 4:creep~ 5:ing . 6:up . 5:the . 4:stairs",
      "4:it's . 3:just . 2:a . 3:ghost . 4:in . 3:a . 2:sheet . 0:beware .",
      "7:boo! . . . 6:who's . 5:that . 4:creep~ 5:ing . 6:up . 5:the . 4:stairs",
      '4:hands . 3:up . 2:high . 1:and . 0:give . 1:a . 2:ghost~ 4:ly . .',
      '7:boo . . . 6:boo . . . 5:boo . . . 4:boo . . .',
      '4:the . 4:crypt . 5:is . 6:where . 7:the . 6:par~ 5:ty . 4:goes! . .',
    ],
  },
  {
    name: 'SNOW DAY', style: 'WINTER SPECIAL', bpm: 128, wave: 'square', season: 'winter',
    drums: 'k . h . s . h . k k h . s . h . k . h . s . h . k . h h s . s h',
    bass: 'C2 . C3 . A1 . A2 . F1 . F2 . G1 . G2 . C2 . C3 . A1 . A2 . F1 . F2 . G1 . G2 .',
    chords: 'C A F G',
    lines: [
      '5:snow . 5:is . 6:fall~ 5:ing . 4:on . 3:the . 4:square . . . .',
      '3:lights . 3:are . 4:twink~ 3:ling . 2:on . 1:the . 2:tree . . . .',
      '5:grab . 5:a . 6:mug . 7:of . 6:co~ 5:coa . 4:and . 3:a . 4:scarf',
      '4:come . 3:out . 2:and . 1:play . 2:with . 1:me! . . . . .',
      "5:it's . 5:a . 6:snow . 7:day . . . 6:snow . 5:day . . .",
      '4:throw . 3:a . 4:snow~ 5:ball . 4:at . 3:your . 2:friends . . . .',
      "5:it's . 5:a . 6:snow . 7:day . . . 6:snow . 7:day . . .",
      '6:wish . 5:it . 4:ne~ 5:ver . 4:ev~ 3:er . 2:ends . . . . .',
      '7:ho . 6:ho . 5:ho . 4:ho . 5:ho . 6:ho . 7:ho! . . .',
      '5:hap~ . 6:py . 7:snow . 6:day . 5:to . 6:you! . . . . .',
    ],
  },
];

// ---------- charts ----------
/** One note to hit: at step `s` (eighth notes from the song's start), pad `p`, held `len` steps; `syl` for the singer. */
export interface Note { s: number; p: number; len: number; syl: string; line: number }
export const LINE = 16, INTRO = 1;
export const stepS = (g: Song): number => 60 / g.bpm / 2;
export const steps = (g: Song): number => (g.lines.length + INTRO * 2) * LINE;
export const songLen = (g: Song): number => steps(g) * stepS(g);
const PENTA_PC = [0, 2, 4, 7, 9];
/** Where a pitch class sits on the 5-note pads (F and B go to their nearest neighbour). */
const padOfPc = (pc: number): number => { let best = 0, bd = 99; PENTA_PC.forEach((q, i) => { const d = Math.min(Math.abs(q - pc), 12 - Math.abs(q - pc)); if (d < bd) { bd = d; best = i; } }); return best; };
const PC: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const cache = new Map<string, Note[]>();
/** The notes for instrument `inst` (0 keys, 1 drums, 2 bass, 3 mic) in song `n`. */
export function lane(n: number, inst: number): Note[] {
  const key = n + ':' + inst; const hit = cache.get(key); if (hit) return hit;
  const g = SONGS[n], out: Note[] = [], total = steps(g), sungFrom = INTRO * LINE, sungTo = total - INTRO * LINE;
  if (inst === 3) {
    g.lines.forEach((ln, li) => {
      const tk = ln.trim().split(/\s+/);
      tk.forEach((t, i) => {
        if (t === '.' || t === '-') { if (t === '-' && out.length && out[out.length - 1].line === li) out[out.length - 1].len++; return; }
        const m = /^([0-7]):(.+)$/.exec(t); if (m) out.push({ s: sungFrom + li * LINE + i, p: Number(m[1]), len: 1, syl: m[2], line: li });
      });
    });
  } else if (inst === 1) { // drums: the kicks and snares of the pattern, played on KICK (1) and SNARE (2)
    const d = g.drums.split(/\s+/);
    for (let s = sungFrom; s < sungTo; s++) { const t = d[s % d.length]; if ((t === 'k' || t === 's') && s % 2 === 0) out.push({ s, p: t === 'k' ? 0 : 1, len: 1, syl: '', line: -1 }); }
  } else if (inst === 2) { // bass: the bassline's notes on the beat
    const b = g.bass.split(/\s+/);
    for (let s = sungFrom; s < sungTo; s += 2) { const m = /^([A-G]#?)(\d)$/.exec(b[s % b.length]); if (m) out.push({ s, p: Math.min(7, padOfPc(PC[m[1]]) + (Number(m[2]) >= 3 ? 5 : 0)), len: 1, syl: '', line: -1 }); }
  } else { // keys: each bar's chord, on beats 1 and 3 (root, then up a little)
    const ch = g.chords.split(/\s+/);
    for (let s = sungFrom; s < sungTo; s += 4) { const bar = Math.floor(s / 8), root = padOfPc(PC[ch[bar % ch.length]] ?? 0); out.push({ s, p: (s % 8 === 0 ? root : Math.min(7, root + 2)), len: 1, syl: '', line: -1 }); }
  }
  cache.set(key, out); return out;
}
/** The song as a backing track (drums + bass + a quiet guide melody) for the MusicPlayer. */
export function backing(n: number): Track {
  const g = SONGS[n], total = steps(g), bass = g.bass.split(/\s+/), lead: string[] = new Array(total).fill('.');
  const NOTES = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'];
  for (const nt of lane(n, 3)) { lead[nt.s] = NOTES[nt.p]; for (let k = 1; k < nt.len; k++) lead[nt.s + k] = '-'; }
  const b: string[] = [], d: string[] = [], dr = g.drums.split(/\s+/);
  for (let s = 0; s < total; s++) { const inSong = s >= INTRO * LINE - 8 && s < total - 4; b.push(inSong ? bass[s % bass.length] : '.'); d.push(s < total - 4 ? dr[s % dr.length] : '.'); }
  return { name: g.name, bpm: g.bpm, wave: g.wave, lead: lead.join(' '), bass: b.join(' '), drums: d.join(' '), leadVol: 0.025 };
}
/** A lyric line as words: syllables joined, '~' meaning "the word carries on". */
export function lineWords(n: number, li: number): { text: string; notes: Note[] } {
  const notes = lane(n, 3).filter((x) => x.line === li);
  return { text: notes.map((x) => (x.syl.endsWith('~') ? x.syl.slice(0, -1) : x.syl + ' ')).join('').trim().toUpperCase(), notes };
}

// ---------- the live song ----------
/** Room state 'karaoke': which song (-1 none), when its first step plays (wall ms), who started it. */
export interface KaraokeState { song: number; t0: number; by: string }
export const COUNT_IN = 4000;
export const kLive = (k: KaraokeState | null, at = Date.now()): boolean => !!k && k.song >= 0 && k.song < SONGS.length && at >= k.t0 - COUNT_IN && at < k.t0 + songLen(SONGS[k.song]) * 1000 + 6000;
/** Seconds into the song (negative = counting in). */
export const kTime = (k: KaraokeState, at = Date.now()): number => (at - k.t0) / 1000;
/** Where the lyrics are: the line being sung (0..9, -1 intro, 10 outro) and how far through (steps). */
export function kWhere(k: KaraokeState, at = Date.now()): { line: number; step: number; done: boolean } {
  const g = SONGS[k.song], st = kTime(k, at) / stepS(g), li = Math.floor(st / LINE) - INTRO;
  return { line: li, step: st, done: st >= steps(g) };
}

// ---------- scoring ----------
export const WINDOW = { perfect: 0.085, good: 0.17 };
export type Judge = 'PERFECT' | 'GOOD' | 'OFF KEY' | 'MISS';
/** Your playing of one lane: which notes you've been judged on, and the running score. */
export class Performance {
  readonly judged = new Map<number, Judge>(); pts = 0; combo = 0; best = 0; last: { j: Judge; t: number } | null = null;
  constructor(readonly song: number, readonly inst: number, readonly t0: number) {}
  get notes(): Note[] { return lane(this.song, this.inst); }
  /** You hit pad `p` at song time `t` (s). Returns the judgement (or null: nothing near to hit). */
  hit(p: number, t: number): Judge | null {
    const g = SONGS[this.song], ss = stepS(g); let best = -1, bd = 1e9;
    this.notes.forEach((nt, i) => { if (this.judged.has(i)) return; const d = Math.abs(nt.s * ss - t); if (d < WINDOW.good && (d < bd || (d === bd && nt.p === p))) { bd = d; best = i; } });
    if (best < 0) return null;
    const nt = this.notes[best], j: Judge = nt.p !== p ? 'OFF KEY' : bd <= WINDOW.perfect ? 'PERFECT' : 'GOOD';
    this.judged.set(best, j); this.pts += j === 'PERFECT' ? 1 : j === 'GOOD' ? 0.7 : 0.3;
    this.combo = j === 'OFF KEY' ? 0 : this.combo + 1; this.best = Math.max(this.best, this.combo); this.last = { j, t };
    return j;
  }
  /** Notes that have gone by unplayed count as misses (call every frame). */
  sweep(t: number): void {
    const ss = stepS(SONGS[this.song]);
    this.notes.forEach((nt, i) => { if (!this.judged.has(i) && nt.s * ss < t - WINDOW.good) { this.judged.set(i, 'MISS'); this.combo = 0; this.last = { j: 'MISS', t }; } });
  }
  /** 0..100 over the whole song (so far: out of the notes that have come up). */
  score(soFar = false): number { const n = soFar ? this.judged.size : this.notes.length; return n ? Math.round((this.pts / n) * 100) : 0; }
}
/** A letter for a score. */
export const grade = (s: number): string => (s >= 95 ? 'S' : s >= 85 ? 'A' : s >= 70 ? 'B' : s >= 50 ? 'C' : 'D');
/** The hype bonus: up to +10 points for a crowd that goes wild. */
export const hypeBonus = (hype: number): number => Math.round(Math.max(0, Math.min(1, hype)) * 10);
