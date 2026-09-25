// Chiptune music for the jukebox and the cinema. Tracks are written as note strings (one
// token per 8th note) and scheduled on the WebAudio clock against the WALL clock, so everyone
// in a room hears the same bar at the same moment — no audio files, no streaming.
//
// Notation: 'C4' plays a note, '-' holds the previous one, '.' is a rest.
// Drums: 'k' kick, 's' snare, 'h' hi-hat, '.' rest. Every channel in a track has the same length.

import { audio, soundOn } from './sfx';

export interface Track { name: string; bpm: number; wave: OscillatorType; lead: string; bass: string; drums: string }

export const TRACKS: Track[] = [
  {
    name: 'LAB GROOVE', bpm: 112, wave: 'square',
    lead: 'E4 G4 A4 . A4 G4 E4 . D4 E4 G4 . E4 - . . E4 G4 A4 . C5 B4 A4 . G4 A4 E4 . D4 - . .',
    bass: 'A2 . A2 . E2 . A2 . G2 . G2 . D2 . G2 . F2 . F2 . C3 . F2 . E2 . E2 . B2 . E2 .',
    drums: 'k . h . s . h . k . h . s . h h k . h . s . h . k . h . s . h s',
  },
  {
    name: 'NIGHT SQUARE', bpm: 84, wave: 'triangle',
    lead: 'C5 - B4 - G4 - E4 - F4 - E4 - D4 - - - C5 - B4 - G4 - A4 - B4 - - - - - - -',
    bass: 'A2 - - - E3 - - - D3 - - - G2 - - - A2 - - - E3 - - - F2 - - - G2 - - -',
    drums: 'k . . . h . . . s . . . h . . . k . . . h . . . s . . . h . h .',
  },
  {
    name: 'COFFEE BREAK', bpm: 128, wave: 'sine',
    lead: 'G4 . B4 D5 . B4 A4 . G4 . E4 - . . . . A4 . C5 E5 . C5 B4 . A4 . F#4 - . . . .',
    bass: 'G2 . . D3 . . G2 . E2 . . B2 . . E2 . A2 . . E3 . . A2 . D3 . . A2 . . D3 .',
    drums: 'k . h k . h s . k . h k . h s h k . h k . h s . k . h k . h s h',
  },
  {
    name: 'SLOP INVADERS', bpm: 150, wave: 'square',
    lead: 'E5 E5 . E5 . C5 E5 . G5 - . . G4 - . . C5 . . G4 . . E4 . . A4 . B4 . A#4 A4 .',
    bass: 'C3 . C3 . G2 . C3 . C3 . G2 . C3 . G2 . E3 . E2 . C3 . A2 . B2 . A#2 A2 . . G2 .',
    drums: 'k h s h k h s h k h s h k h s s k h s h k h s h k h s h k s s s',
  },
  {
    name: 'MIDNIGHT CREEP', bpm: 96, wave: 'triangle',
    lead: 'E4 . G4 . A#4 . A4 . G4 . E4 . D#4 - - . E4 . G4 . B4 . A#4 . A4 . G4 . E4 - - .',
    bass: 'E2 . . E2 . . B1 . E2 . . E2 . . A#1 . E2 . . E2 . . B1 . C2 . . B1 . . A#1 .',
    drums: 'k . . h s . . h k . k . s . . h k . . h s . . h k . k . s . h h',
  },
];
/** The Arcade's speakers: chiptunes (on by default, the MUSIC cabinet skips tracks). */
export const CHIPTUNES: Track[] = [
  {
    name: 'INSERT TOKEN', bpm: 136, wave: 'square',
    lead: 'C5 E5 G5 C6 . G5 E5 . D5 F5 A5 D6 . A5 F5 . E5 G5 B5 E6 . B5 G5 . F5 E5 D5 C5 . G4 . .',
    bass: 'C3 . G2 . C3 . G2 . D3 . A2 . D3 . A2 . E3 . B2 . E3 . B2 . F2 . G2 . C3 . . .',
    drums: 'k h s h k h s h k h s h k k s h k h s h k h s h k h s h k s s s',
  },
  {
    name: 'HIGH SCORE', bpm: 150, wave: 'square',
    lead: 'A4 C5 E5 A5 G5 E5 C5 E5 F4 A4 C5 F5 E5 C5 A4 C5 G4 B4 D5 G5 F5 D5 B4 D5 E5 - D5 - C5 - B4 -',
    bass: 'A2 A2 A3 A2 A2 A2 A3 A2 F2 F2 F3 F2 F2 F2 F3 F2 G2 G2 G3 G2 G2 G2 G3 G2 E2 E2 E3 E2 E2 E2 E3 E2',
    drums: 'k h s h k h s h k h s h k h s s k h s h k h s h k h s h k s k s',
  },
  {
    name: 'MIDNIGHT CREEP', bpm: 96, wave: 'triangle',
    lead: 'E4 . G4 . A#4 . A4 . G4 . E4 . D#4 - - . E4 . G4 . B4 . A#4 . A4 . G4 . E4 - - .',
    bass: 'E2 . . E2 . . B1 . E2 . . E2 . . A#1 . E2 . . E2 . . B1 . C2 . . B1 . . A#1 .',
    drums: 'k . . h s . . h k . k . s . . h k . . h s . . h k . k . s . h h',
  },
];
/** The Park's bandstand: a sunny waltz and a brass-band stroll. */
export const PARK_TRACKS: Track[] = [
  {
    name: 'SUNDAY WALTZ', bpm: 132, wave: 'triangle',
    lead: 'G4 - B4 D5 - B4 C5 - A4 B4 - G4 A4 - F#4 G4 - - E5 - D5 C5 - B4 A4 - G4 F#4 - E4 D4 - - . .',
    bass: 'G2 . D3 G2 . D3 C3 . G3 G2 . D3 D3 . A2 G2 . D3 C3 . G3 G2 . D3 D3 . A2 G2 . . . .',
    drums: 'k . h k . h k . h k . h k . h k . h k . h k . h k . h k . h s . .',
  },
  {
    name: 'PARK STROLL', bpm: 108, wave: 'square',
    lead: 'C5 . E5 . G5 . E5 . F5 . D5 . B4 . G4 . A4 . C5 . F5 . E5 . D5 . . . C5 - . .',
    bass: 'C3 . G2 . C3 . G2 . G2 . D3 . G2 . D3 . F2 . C3 . F2 . C3 . G2 . D3 . C3 . . .',
    drums: 'k . s . k . s . k . s . k k s . k . s . k . s . k . s . k s s s',
  },
];
/** The Dev Den radio: slow, soft lo-fi loops. */
/** The Diner's jukebox: doo-wop-ish tunes written for the game. */
export const DINER_TRACKS: Track[] = [
  {
    name: 'BLUE PLATE SPECIAL', bpm: 140, wave: 'square',
    lead: 'E5 . G5 . C6 - B5 A5 A5 . E5 . C5 - E5 . F5 . A5 . C6 - A5 F5 G5 . B5 . D6 - . .',
    bass: 'C3 . G2 . C3 . G2 . A2 . E2 . A2 . E2 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . B2 .',
    drums: 'k . s . k k s . k . s . k k s . k . s . k k s . k . s . k s s s',
  },
  {
    name: 'MIDNIGHT MALT', bpm: 96, wave: 'triangle',
    lead: 'A4 - C5 E5 - D5 C5 - B4 - D5 F5 - E5 D5 - C5 - E5 G5 - F5 E5 - D5 - - . E5 - - .',
    bass: 'A2 . E3 . A2 . E3 . D3 . A2 . D3 . A2 . C3 . G2 . C3 . G2 . E2 . B2 . E2 . G#2 .',
    drums: 'k . h s . h k . k . h s . h k h k . h s . h k . k . h s . s s .',
  },
  {
    name: 'TABLE FOR TWO', bpm: 118, wave: 'square',
    lead: 'G4 . C5 . E5 . D5 C5 A4 . C5 . F5 . E5 D5 D5 . G4 . B4 . D5 C5 B4 . C5 - - . . .',
    bass: 'C3 . E3 . G3 . E3 . F2 . A2 . C3 . A2 . G2 . B2 . D3 . B2 . C3 . G2 . C3 . . .',
    drums: 'k . s h k . s h k . s h k . s h k . s h k . s h k . s h k k s .',
  },
];

export const LOFI: Track[] = [
  {
    name: 'RAINY COMMITS', bpm: 72, wave: 'sine',
    lead: 'E5 - - D5 C5 - - - A4 - - - G4 - - - C5 - - D5 E5 - - - D5 - C5 - A4 - - -',
    bass: 'A2 - - - - - - - F2 - - - - - - - C3 - - - - - - - G2 - - - - - - -',
    drums: 'k . . h s . h . k . k h s . h . k . . h s . h . k . k h s . h h',
  },
  {
    name: 'LATE NIGHT PR', bpm: 66, wave: 'triangle',
    lead: 'G4 - B4 - D5 - - - C5 - B4 - A4 - - - G4 - B4 - E5 - - - D5 - - - - - . .',
    bass: 'E2 - - - - - - - C2 - - - - - - - G2 - - - - - - - D2 - - - - - - -',
    drums: 'k . h . s . h h k . h . s . h . k h h . s . h . k . h . s . h .',
  },
];

/** Party games (musical chairs, tag): fast and bouncy. */
export const PARTY_TRACK: Track = {
  name: 'PARTY TIME', bpm: 140, wave: 'square',
  lead: 'C5 E5 G5 E5 C5 E5 G5 C6 B4 D5 G5 D5 B4 D5 G5 B5 A4 C5 F5 C5 A4 C5 F5 A5 G4 B4 D5 G5 F5 E5 D5 B4',
  bass: 'C3 . C3 G2 C3 . C3 G2 G2 . G2 D3 G2 . G2 D3 F2 . F2 C3 F2 . F2 C3 G2 . G2 D3 G2 B2 D3 G2',
  drums: 'k h s h k k s h k h s h k k s s k h s h k k s h k h s h k s s s',
};

/** The Stage's DJ booth: backing beats (drums + bass only) in C, so the pentatonic pads fit. */
const REST = '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .';
export const BEATS: Track[] = [
  { name: 'BEAT: CHILL HOP', bpm: 92, wave: 'square', lead: REST, bass: 'C2 . . C2 . . G2 . A2 . . A2 . . G2 . F2 . . F2 . . C3 . G2 . . G2 . . D2 .', drums: 'k . h . s . h k . k h . s . h . k . h . s . h k . k h . s . h h' },
  { name: 'BEAT: DISCO', bpm: 118, wave: 'square', lead: REST, bass: 'C2 C3 C2 C3 C2 C3 C2 C3 A1 A2 A1 A2 A1 A2 A1 A2 F1 F2 F1 F2 F1 F2 F1 F2 G1 G2 G1 G2 G1 G2 G1 G2', drums: 'k h s h k h s h k h s h k h s h k h s h k h s h k h s h k h s s' },
];

/** The cinema's film score (not on the jukebox). */
export const FILM_TRACK: Track = {
  name: 'A CRITTER IN SPACE', bpm: 96, wave: 'triangle',
  lead: 'C5 - - E5 G5 - - - F5 - E5 - D5 - - - C5 - - E5 G5 - A5 - G5 - - - - - . . E5 - - G5 C6 - - - B5 - A5 - G5 - - - A5 - G5 - F5 - E5 - D5 - - - C5 - - -',
  bass: 'C3 - G3 - C3 - G3 - F2 - C3 - F2 - C3 - C3 - G3 - C3 - G3 - A2 - E3 - A2 - E3 - A2 - E3 - A2 - E3 - F2 - C3 - F2 - C3 - G2 - D3 - G2 - D3 - C3 - G3 - C3 - - -',
  drums: 'k . . . h . . . s . . . h . . . k . . . h . . . s . . . h . h . k . . . h . . . s . . . h . . . k . k . h . . . s . . . h h h h',
};

const NOTE: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = (tok: string): number => { const m = /^([A-G]#?)(\d)$/.exec(tok); return m ? 440 * Math.pow(2, (NOTE[m[1]] + (Number(m[2]) + 1) * 12 - 69) / 12) : 0; };
const split = (s: string) => s.trim().split(/\s+/);

/** One music source (the jukebox, the cinema). Call tick() every frame; it schedules ~250 ms ahead. */
export class MusicPlayer {
  private out: GainNode | null = null;
  private track: Track | null = null;
  private t0 = 0;
  private next = -1;
  private vol = 0;
  private parsed: { lead: string[]; bass: string[]; drums: string[] } | null = null;

  /** Play `t` (null = silence) as if it started at wall-clock second `t0`. */
  set(t: Track | null, t0: number): void {
    if (t === this.track && t0 === this.t0) return;
    this.track = t; this.t0 = t0; this.next = -1;
    this.parsed = t ? { lead: split(t.lead), bass: split(t.bass), drums: split(t.drums) } : null;
  }
  /** 0..1, eased so walking away fades smoothly. */
  volume(v: number): void { this.vol = v; }

  tick(): void {
    const au = audio();
    if (!au || !soundOn) return;
    const { AC, master } = au;
    if (!this.out) { this.out = AC.createGain(); this.out.gain.value = 0; this.out.connect(master); }
    this.out.gain.setTargetAtTime(this.track ? this.vol : 0, AC.currentTime, 0.15);
    if (!this.track || !this.parsed || this.vol < 0.01) { this.next = -1; return; }
    const step = 60 / this.track.bpm / 2, wall = Date.now() / 1000, len = this.parsed.lead.length;
    const cur = Math.floor((wall - this.t0) / step), until = Math.floor((wall + 0.25 - this.t0) / step);
    if (this.next < cur || this.next > until + 8) this.next = cur;
    for (; this.next <= until; this.next++) {
      const when = AC.currentTime + (this.t0 + this.next * step - wall);
      if (when < AC.currentTime) continue;
      const i = ((this.next % len) + len) % len;
      this.voice(AC, this.parsed.lead, i, when, step, this.track.wave, 0.05);
      this.voice(AC, this.parsed.bass, i, when, step, 'triangle', 0.08);
      this.drum(au.AC, au.NB, this.parsed.drums[i % this.parsed.drums.length], when);
    }
  }

  private voice(AC: AudioContext, row: string[], i: number, when: number, step: number, wave: OscillatorType, vol: number): void {
    const f = freq(row[i]);
    if (!f || !this.out) return;
    let n = 1; while (row[(i + n) % row.length] === '-' && n < 16) n++;
    const dur = n * step * 0.92, o = AC.createOscillator(), g = AC.createGain();
    o.type = wave; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(vol, when + 0.01);
    g.gain.setValueAtTime(vol * 0.7, when + Math.min(dur, 0.08)); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(this.out); o.start(when); o.stop(when + dur + 0.02);
  }

  private drum(AC: AudioContext, NB: AudioBuffer, tok: string | undefined, when: number): void {
    if (!tok || tok === '.' || !this.out) return;
    if (tok === 'k') {
      const o = AC.createOscillator(), g = AC.createGain();
      o.frequency.setValueAtTime(140, when); o.frequency.exponentialRampToValueAtTime(45, when + 0.12);
      g.gain.setValueAtTime(0.18, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.14);
      o.connect(g); g.connect(this.out); o.start(when); o.stop(when + 0.16);
      return;
    }
    const s = AC.createBufferSource(), b = AC.createBiquadFilter(), g = AC.createGain(), hat = tok === 'h';
    s.buffer = NB; b.type = hat ? 'highpass' : 'bandpass'; b.frequency.value = hat ? 7000 : 1800; b.Q.value = hat ? 0.7 : 0.9;
    const d = hat ? 0.04 : 0.12;
    g.gain.setValueAtTime(hat ? 0.05 : 0.1, when); g.gain.exponentialRampToValueAtTime(0.0001, when + d);
    s.connect(b); b.connect(g); g.connect(this.out); s.start(when, Math.random() * 0.5); s.stop(when + d + 0.02);
  }
}

/** Looping rain on the window (the Dev Den). Filtered noise; volume 0 to stop. */
export class Rain {
  private g: GainNode | null = null;
  set(vol: number): void {
    const au = audio();
    if (!au || !soundOn) { if (this.g) this.g.gain.setTargetAtTime(0, this.g.context.currentTime, 0.2); return; }
    if (!this.g) {
      const { AC, master, NB } = au, s = AC.createBufferSource(), f = AC.createBiquadFilter();
      s.buffer = NB; s.loop = true; f.type = 'lowpass'; f.frequency.value = 1400;
      this.g = AC.createGain(); this.g.gain.value = 0;
      s.connect(f); f.connect(this.g); this.g.connect(master); s.start();
    }
    this.g.gain.setTargetAtTime(vol, this.g.context.currentTime, 0.4);
  }
}

// ---------- the Stage's instruments: 8 pads each, all in C major pentatonic ----------
const PENTA = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'];
export const INSTRUMENTS = ['KEYS', 'DRUMS', 'BASS', 'MIC'] as const;
/** Play pad n (0..7) of instrument i (0 keys, 1 drums, 2 bass, 3 mic), right now. */
export function playPad(i: number, n: number, vol = 1): void {
  const au = audio(); if (!au || !soundOn) return;
  const { AC, master, NB } = au, t = AC.currentTime, out = AC.createGain(); out.gain.value = vol; out.connect(master);
  const env = (g: GainNode, pk: number, a: number, d: number) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  const osc = (type: OscillatorType, f: number, pk: number, d: number, f1?: number) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + d); env(g, pk, 0.005, d); o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.05); return o; };
  const hiss = (type: BiquadFilterType, f: number, q: number, pk: number, d: number) => { const s = AC.createBufferSource(), b = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = NB; b.type = type; b.frequency.value = f; b.Q.value = q; env(g, pk, 0.002, d); s.connect(b); b.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.05); };
  if (i === 0) { osc('square', freq(PENTA[n]), 0.05, 0.35); osc('triangle', freq(PENTA[n]) * 2, 0.02, 0.25); }
  else if (i === 2) { const f = freq(PENTA[n]) / 4; osc('triangle', f, 0.14, 0.45); osc('square', f, 0.03, 0.2); }
  else if (i === 3) { // a little "la": sine with vibrato plus a soft buzzy formant
    const o = osc('sine', freq(PENTA[n]), 0.08, 0.5); const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 6; lg.gain.value = 5; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + 0.55);
    const s = AC.createOscillator(), b = AC.createBiquadFilter(), g = AC.createGain(); s.type = 'sawtooth'; s.frequency.value = freq(PENTA[n]); b.type = 'bandpass'; b.frequency.value = 900; b.Q.value = 4; env(g, 0.03, 0.02, 0.45); s.connect(b); b.connect(g); g.connect(out); s.start(t); s.stop(t + 0.5);
  } else switch (n) { // drums
    case 0: osc('sine', 140, 0.3, 0.18, 42); break;
    case 1: hiss('bandpass', 1800, 0.9, 0.2, 0.14); osc('triangle', 220, 0.05, 0.08, 160); break;
    case 2: hiss('highpass', 7000, 0.7, 0.08, 0.04); break;
    case 3: hiss('highpass', 6000, 0.7, 0.08, 0.3); break;
    case 4: osc('sine', 260, 0.18, 0.2, 180); break;
    case 5: osc('sine', 150, 0.2, 0.25, 100); break;
    case 6: for (let k = 0; k < 3; k++) { const s = AC.createBufferSource(), b = AC.createBiquadFilter(), g = AC.createGain(), tt = t + k * 0.012; s.buffer = NB; b.type = 'bandpass'; b.frequency.value = 1200; b.Q.value = 1.5; g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.15, tt + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.1); s.connect(b); b.connect(g); g.connect(out); s.start(tt, Math.random() * 0.5); s.stop(tt + 0.12); } break;
    case 7: hiss('highpass', 4000, 0.5, 0.12, 1.1); break;
  }
}
