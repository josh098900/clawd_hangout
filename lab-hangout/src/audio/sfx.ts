// Tiny synthesized SFX in the film's style (square/triangle blips + band-passed noise).
// No audio files. Nothing plays until the player opts in on the start screen.

let AC: AudioContext | null = null, master: GainNode | null = null, NB: AudioBuffer | null = null;
export let soundOn = false;

export function initAudio(): boolean {
  if (AC) return true;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return false;
  AC = new Ctor();
  master = AC.createGain(); master.gain.value = 0.5;
  const comp = AC.createDynamicsCompressor(); master.connect(comp); comp.connect(AC.destination);
  const n = (AC.sampleRate * 1.5) | 0; NB = AC.createBuffer(1, n, AC.sampleRate); const d = NB.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return true;
}
/** The shared audio graph, for the music player. null until sound has been switched on. */
export function audio(): { AC: AudioContext; master: GainNode; NB: AudioBuffer } | null {
  return AC && master && NB ? { AC, master, NB } : null;
}
export function setSound(on: boolean): void {
  if (on && !initAudio()) return;
  soundOn = on;
  if (on && AC?.state === 'suspended') void AC.resume();
}

function genv(t0: number, at: number, pk: number, dur: number): GainNode {
  const g = AC!.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(pk, t0 + at); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
  g.connect(master!); return g;
}
function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0): void {
  if (!soundOn || !AC) return;
  const t0 = AC.currentTime + delay, o = AC.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  o.connect(genv(t0, 0.004, vol, dur)); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(f: number, q: number, dur: number, vol: number, delay = 0, f1?: number): void {
  if (!soundOn || !AC || !NB) return;
  const t0 = AC.currentTime + delay, s = AC.createBufferSource(); s.buffer = NB;
  const b = AC.createBiquadFilter(); b.type = 'bandpass'; b.frequency.setValueAtTime(f, t0); if (f1) b.frequency.exponentialRampToValueAtTime(f1, t0 + dur); b.Q.value = q;
  s.connect(b); b.connect(genv(t0, 0.005, vol, dur)); s.start(t0, Math.random() * 0.3); s.stop(t0 + dur + 0.05);
}
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export const SFX = {
  step: () => noise(rnd(380, 460), 1.4, 0.035, 0.035),
  chime: () => [1047, 1319, 1568].forEach((f, i) => tone('triangle', f, f, 0.25, 0.06, i * 0.06)),
  chat: () => { tone('square', 880, 880, 0.03, 0.03); tone('square', 1320, 1320, 0.04, 0.025, 0.04); },
  join: () => [523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.18, 0.04, i * 0.07)),
  leave: () => [659, 523].forEach((f, i) => tone('triangle', f, f, 0.16, 0.03, i * 0.08)),
  door: () => noise(260, 0.7, 0.45, 0.25, 0, 3000),
  wave: () => [784, 988].forEach((f, i) => tone('sine', f, f, 0.14, 0.05, i * 0.1)),
  hop: () => { tone('square', 300, 700, 0.12, 0.05); tone('sine', 120, 70, 0.1, 0.12, 0.6); },
  joy: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone('square', f, f, 0.14, 0.035, i * 0.06)); for (let i = 0; i < 6; i++) noise(3000, 4, 0.03, 0.08, 0.1 + i * 0.05); },
  huh: () => { tone('triangle', 700, 1100, 0.12, 0.06); },
  eat: () => { for (let i = 0; i < 3; i++) noise(rnd(2200, 3200), 3, 0.05, 0.07, 0.35 + i * 0.12); },
  feed: () => { for (let i = 0; i < 6; i++) noise(rnd(4000, 6000), 5, 0.02, 0.05, 0.3 + i * 0.05); },
  shutter: () => { noise(3000, 1.5, 0.05, 0.2); tone('square', 1800, 1800, 0.03, 0.03, 0.05); },
  sip: () => { noise(900, 2, 0.18, 0.05, 0, 500); tone('sine', 520, 380, 0.12, 0.03, 0.2); },
  sit: () => { noise(180, 0.8, 0.12, 0.12); tone('sine', 160, 110, 0.1, 0.05); },
  brew: () => { for (let i = 0; i < 5; i++) noise(1400, 3, 0.2, 0.04, i * 0.28, 900); tone('triangle', 988, 988, 0.12, 0.04, 1.5); tone('triangle', 1319, 1319, 0.16, 0.04, 1.62); },
  blip: () => tone('square', rnd(500, 900), rnd(300, 500), 0.05, 0.025),
  score: () => [659, 784, 988, 1319].forEach((f, i) => tone('square', f, f, 0.12, 0.035, i * 0.08)),
  coo: () => { tone('sine', 420, 360, 0.14, 0.03); tone('sine', 400, 340, 0.16, 0.025, 0.18); },
  flap: () => { for (let i = 0; i < 4; i++) noise(700, 1.2, 0.04, 0.05, i * 0.05); },
  beep: () => { tone('square', 1200, 1200, 0.05, 0.02); tone('square', 900, 900, 0.06, 0.02, 0.07); },
  zap: () => tone('square', 1400, 500, 0.08, 0.03),
  boom: () => noise(500, 0.8, 0.25, 0.14, 0, 90),
  /** the Subway's door chime */
  dingdong: () => { tone('sine', 988, 988, 0.35, 0.06); tone('sine', 784, 784, 0.5, 0.06, 0.32); },
  /** wheels on the rails */
  clack: () => { noise(900, 2, 0.04, 0.025); noise(700, 2, 0.04, 0.02, 0.09); },
  /** a far-off wolf (Halloween nights) */
  howl: () => { tone('sine', 420, 760, 0.5, 0.035); tone('sine', 760, 700, 1.1, 0.035, 0.5); tone('sine', 700, 380, 0.7, 0.03, 1.6); },
  /** a ghostly laugh: the trick in trick-or-treat */
  boo: () => { for (let i = 0; i < 4; i++) tone('triangle', 520 - i * 60, 380 - i * 50, 0.18, 0.05, i * 0.16); tone('sine', 240, 120, 0.8, 0.04, 0.6); },
  hurt: () => { tone('square', 300, 80, 0.3, 0.05); noise(300, 0.7, 0.3, 0.1); },
  pop: () => noise(rnd(1500, 2500), 4, 0.03, 0.05),
  pour: () => { noise(700, 1.5, 1.0, 0.05, 0, 1500); },
  siren: () => { for (let i = 0; i < 4; i++) { tone('sawtooth', 600, 900, 0.35, 0.025, i * 0.7); tone('sawtooth', 900, 600, 0.35, 0.025, i * 0.7 + 0.35); } },
  meow: () => { tone('sine', 700, 1100, 0.12, 0.03); tone('sine', 1100, 600, 0.25, 0.03, 0.12); },
  thunder: () => { noise(120, 0.5, 1.8, 0.2, 0, 50); noise(300, 0.6, 0.5, 0.08, 0.1, 80); },
  key: () => noise(rnd(3000, 4500), 3, 0.015, 0.03),
  squeak: () => { tone('square', 1300, 1700, 0.06, 0.03); tone('square', 1500, 1200, 0.08, 0.025, 0.07); },
  commit: () => [784, 1047].forEach((f, i) => tone('triangle', f, f, 0.12, 0.04, i * 0.08)),
  laugh: () => [660, 880, 660, 990].forEach((f, i) => tone('square', f, f * 0.9, 0.06, 0.03, i * 0.1)),
  cry: () => { tone('triangle', 700, 350, 0.6, 0.04); tone('triangle', 650, 320, 0.5, 0.03, 0.5); },
  love: () => [784, 988, 1175, 1568].forEach((f, i) => tone('sine', f, f, 0.2, 0.04, i * 0.08)),
  angry: () => { tone('sawtooth', 160, 120, 0.25, 0.04); tone('sawtooth', 150, 110, 0.25, 0.04, 0.3); },
  sleep: () => { tone('sine', 300, 260, 0.6, 0.03); tone('sine', 260, 220, 0.6, 0.02, 0.8); },
  cool: () => { noise(3000, 1, 0.25, 0.08, 0, 800); tone('triangle', 523, 784, 0.15, 0.04, 0.2); },
  clap: () => { for (let i = 0; i < 6; i++) noise(1500, 1.5, 0.05, 0.12, i * 0.17); },
  wow: () => { tone('sine', 400, 1200, 0.35, 0.05); tone('triangle', 800, 1600, 0.3, 0.02, 0.05); },
  idea: () => [1319, 1760, 2637].forEach((f, i) => tone('sine', f, f, 0.25, 0.05, i * 0.06)),
};
