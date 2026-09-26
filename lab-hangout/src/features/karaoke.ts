// KARAOKE on the Stage, the playing part (game/karaoke.ts has the songs and judging, world/stage.ts the big screen,
// ui/karaoke.ts the song menu and note lane): picking a song, the backing track, your performance and its score,
// the crowd's HYPE bar, and the tips at the end.

import { MusicPlayer } from '../audio/music';
import { KaraokeHud } from '../ui/karaoke';
import { game, now } from '../app/game';
import { clamp } from '../engine/math';
import { STAGE_INFO, bandTotal } from '../world/stage';
import { COUNT_IN, SONGS, Performance, backing, hypeBonus, kLive, kTime, kWhere, type KaraokeState } from '../game/karaoke';
import { openSongs, resultLine } from '../ui/karaoke';
import { season } from '../world/season';
import { save } from '../game/save';
import { POSE_DANCE, type EmoteKind } from '../entities/avatar';
import { toast } from '../ui/overlay';
import { SFX } from '../audio/sfx';
import type { Track } from '../audio/music';

/** The backing track while a song is on. */
const karaokeMusic = new MusicPlayer();
/** The lyrics strip and your note lane, over the emote bar (main.ts makes it, so it sits in the same place in the bar). */
let khud: KaraokeHud;
export function initKaraokeHud(bar: HTMLElement): void { khud = new KaraokeHud(bar); }
// ---------- KARAOKE on the Stage (game/karaoke.ts, world/stage.ts, ui/karaoke.ts) ----------
/** Your performance in the song that's on (null = you're not at an instrument). */
export let perf: Performance | null = null, kSent = 0, kFinal = -1;
const kTracks = new Map<number, Track>();
const CHEERS = new Set<EmoteKind>(['joy', 'clap', 'wow', 'love', 'hop', 'wave', 'laugh', 'cool', 'idea']), BOOS = new Set<EmoteKind>(['sleep', 'angry', 'cry']);
/** The crowd (anyone not playing) emoted while a song is on: cheers fill the hype bar, boos drain it. */
export function crowdEmote(kind: EmoteKind): void {
  const k = STAGE_INFO.karaoke; if (game.room.id !== 'stage' || !k || !kLive(k) || kTime(k) < 0 || kWhere(k).done) return;
  STAGE_INFO.hype = clamp(STAGE_INFO.hype + (CHEERS.has(kind) ? 0.07 : BOOS.has(kind) ? -0.05 : 0), 0, 1);
}
export function openKaraoke(): void {
  const k = STAGE_INFO.karaoke, on = kLive(k) && !!k && !kWhere(k).done;
  SFX.blip();
  openSongs({
    pick: (n) => { game.setState({ k: 'karaoke', v: { song: n, t0: Date.now() + COUNT_IN, by: game.me.name } }); SFX.chime(); toast(game.usingOf(game.me) === 'instrument' ? 'Here it comes!' : 'Get up to the MIC to sing, or grab an instrument! Everyone else: cheer to fill the HYPE bar', 4500); },
    stop: on ? () => { game.setState({ k: 'karaoke', v: { song: -1, t0: Date.now(), by: game.me.name } }); toast('Song stopped'); } : null,
    season: season(),
  }, () => game.input.clear());
}
export function karaokeStep(dt: number): void {
  const k = STAGE_INFO.karaoke, live = game.room.id === 'stage' && game.playing && kLive(k) && !!k;
  let tr: Track | null = null;
  if (live) { tr = kTracks.get(k!.song) ?? null; if (!tr) { tr = backing(k!.song); kTracks.set(k!.song, tr); } }
  karaokeMusic.set(tr, live ? k!.t0 / 1000 : 0); karaokeMusic.volume(live && !kWhere(k!).done ? 0.75 : 0); karaokeMusic.tick();
  if (!live || !k) { khud.hide(); perf = null; return; }
  const tt = kTime(k), wh = kWhere(k);
  // the dancers keep the hype up; it cools off by itself
  if (tt > 0 && !wh.done) { const dancers = [game.me, ...game.others.values(), ...game.npcs.inRoom('stage').map((n) => n.av)].filter((av) => av.pose === POSE_DANCE && game.usingOf(av) !== 'instrument').length; STAGE_INFO.hype = clamp(STAGE_INFO.hype + dt * (dancers * 0.02 - 0.02), 0, 1); }
  // are you performing? (a new instrument mid-song starts a new performance)
  const sp = game.me.use >= 0 ? game.room.spots[game.me.use] : undefined, inst = sp?.kind === 'instrument' ? sp.inst ?? -1 : -1;
  if (!wh.done) { if (inst < 0) perf = null; else if (!perf || perf.t0 !== k.t0 || perf.inst !== inst) perf = new Performance(k.song, inst, k.t0); }
  if (perf && tt > 0 && !wh.done) {
    perf.sweep(tt);
    if (now() - kSent > 1) { kSent = now(); const sc = perf.score(true); STAGE_INFO.scores.set(game.net.selfId, { name: game.me.name, i: perf.inst, s: sc, c: perf.combo, f: false }); game.net.sendKScore({ r: k.t0, i: perf.inst, s: sc, c: perf.combo, f: 0 }); }
  }
  if (wh.done && kFinal !== k.t0) { kFinal = k.t0; songOver(k); }
  const [lx0, ly] = game.R.toScreen(410, 292), [lx1] = game.R.toScreen(690, 292), onScreen = ly > 56 && ly < game.R.cssH - 170 && lx0 > 0 && lx1 < game.R.cssW; // can you see the whole lyric line on the big screen?
  khud.update(k, STAGE_INFO.hype, bandTotal(), perf && !wh.done ? perf : null, !onScreen);
}
/** The song's finished: your score (plus the crowd's hype), the band's, tips, and maybe the ROCK STAR jacket. */
function songOver(k: KaraokeState): void {
  const bonus = hypeBonus(STAGE_INFO.hype); let mine: number | null = null;
  if (perf && perf.t0 === k.t0) {
    perf.sweep(1e9); const raw = perf.score(); mine = Math.min(100, raw + bonus);
    STAGE_INFO.scores.set(game.net.selfId, { name: game.me.name, i: perf.inst, s: raw, c: perf.best, f: true });
    game.net.sendKScore({ r: k.t0, i: perf.inst, s: raw, c: perf.best, f: 1 });
  }
  const band = bandTotal(), top = [...STAGE_INFO.scores.values()].sort((p, q) => q.s - p.s)[0];
  STAGE_INFO.result = { song: k.song, band, hype: STAGE_INFO.hype, at: Date.now() / 1000, top: top ? top.name + ' ' + top.s : '' };
  if (STAGE_INFO.scores.size && band >= 80) SFX.joy(); else SFX.score();
  perf = null;
  if (mine === null) return;
  const score = mine, line = resultLine(SONGS[k.song].name, score, band);
  if (score >= 90 && save.unlock('fit:8')) setTimeout(() => { toast('ROCK STAR! You earned the ROCK STAR jacket. Wear it from Look', 5500); SFX.score(); }, 3000);
  game.net.karaokeTip(score).then((r) => { game.setTokens(r.tokens); toast(line + (r.paid ? ' · +' + r.paid + ' in tips' : ''), 5000); if (r.paid) game.floatText('+' + r.paid, game.me.x, game.me.y - 60); }).catch(() => toast(line, 5000));
}

