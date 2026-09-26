// HALLOWEEN, the playing part (world/halloween.ts dresses the rooms, 0007_halloween.sql pays out): knocking on the
// 8 trick-or-treat doors (a treat, or a minute as a ghost), and the haunted Crypt's candle puzzle.

import { game, now, errText, cap } from '../app/game';
import { quests } from '../game/quests';
import { markKnocked, lightCandle, TREAT_DOORS } from '../world/halloween';
import { save } from '../game/save';
import { POSE_GHOST } from '../entities/avatar';
import { toast } from '../ui/overlay';
import { SFX } from '../audio/sfx';

// ---------- Halloween (world/halloween.ts) ----------
export let ghostUntil = 0, knocking = false;
/** Trick or treat at door n: the server pays (or tricks you into a ghost for a minute). */
export function knock(n: number): void {
  if (knocking) return; knocking = true;
  SFX.door(); game.me.dir = game.me.x < TREAT_DOORS[n].x ? 1 : -1;
  game.net.api.season.trickOrTreat(n).then((r) => {
    markKnocked(n); game.setTokens(r.tokens);
    if (r.trick) { quests.stat('tricks'); game.me.pose = POSE_GHOST; ghostUntil = now() + 60; game.sendMe(); SFX.boo(); toast('TRICK! You are a ghost for a minute. Boo! (' + r.visited + '/8 doors today)', 4000); }
    else { SFX.chime(); game.floatText('+1'); toast('TREAT! +1 token (' + r.visited + '/8 doors today)', 3000); }
    game.seasonPrize(r.prize, 'ALL 8 DOORS!', 'costume');
  }).catch((e: unknown) => { const m = errText(e); if (/already/.test(m)) markKnocked(n); toast(cap(m), 3000); })
    .finally(() => { knocking = false; });
}
/** The haunted Crypt's candles: today's order is on the old scroll. */
export function candle(n: number): void {
  const res = lightCandle(n);
  if (res === 'lit') return;
  if (res === 'wrong') { SFX.boo(); toast('The candles gutter out... a cold laugh echoes. Check the scroll!', 3500); return; }
  SFX.zap();
  if (res === 'solved') {
    SFX.score(); game.celebrate();
    const first = save.unlock('hat:12');
    toast(first ? 'The crypt sighs... you earned the PUMPKIN HEAD! (Look menu)' : 'The candles burn bright. The crypt is pleased.', 5000);
  }
}
