// The hourly FISHING CONTEST at the Pier: from :30 to :40 of every hour (UTC), the biggest catch
// wins (see supabase/migrations/0010_fishing.sql, which rolls every catch). The scoreboard on
// its post at the end of the pier shows the live top 5, or the countdown and the last winner.

import type { RGB } from '../engine/palette';
import { r, txt, tw, lit, Gd } from '../engine/pixel';
import type { ContestBoard } from '../net/transport';
import type { Prop } from './room';

/** Is a contest on now? And seconds until it ends / starts. */
export function contestClock(nowMs = Date.now()): { live: boolean; left: number; next: number } {
  const s = (nowMs / 1000) % 3600, live = s >= 1800 && s < 2400;
  return { live, left: live ? 2400 - s : 0, next: live ? 0 : (s < 1800 ? 1800 - s : 5400 - s) };
}
export const mmss = (sec: number): string => { const n = Math.max(0, Math.ceil(sec)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };
export const CONTEST = { board: null as ContestBoard | null, fetchedAt: 0 };

/** The scoreboard, on a post in the water by the end of the pier. */
export const scoreboard: Prop = {
  y: 430,
  draw(a: number) {
    const x0 = 786, y0 = 312, w = 132, h = 86, cl = contestClock(), b = CONTEST.board;
    r(x0 + w / 2 - 3, y0 + h, 6, 430 - y0 - h, [96, 70, 46]);
    r(x0 - 3, y0 - 3, w + 6, h + 6, [96, 70, 46]); r(x0, y0, w, h, [24, 30, 40]);
    const line = (s: string, y: number, c: RGB) => txt(s.slice(0, 32), x0 + 5, y, c);
    lit(() => {
      const title = 'FISHING CONTEST';
      txt(title, x0 + w / 2 - tw(title) / 2, y0 + 4, cl.live && (a % 1) < 0.5 ? [255, 214, 90] : [124, 242, 208]);
      if (cl.live) {
        line('LIVE! ' + mmss(cl.left) + ' LEFT', y0 + 14, [255, 140, 90]);
        const top = b?.top ?? [];
        if (!top.length) line('NO CATCHES YET. CAST A LINE!', y0 + 28, [200, 210, 230]);
        top.slice(0, 5).forEach((e, i) => { const s = (i + 1) + ' ' + e.name.slice(0, 8) + ' ' + e.fish; line(s, y0 + 26 + i * 10, i === 0 ? [255, 214, 90] : [220, 226, 240]); const cm = e.cm + 'CM'; txt(cm, x0 + w - 5 - tw(cm), y0 + 26 + i * 10, i === 0 ? [255, 214, 90] : [150, 200, 255]); });
      } else {
        line('NEXT ONE IN ' + mmss(cl.next), y0 + 14, [200, 210, 230]);
        line('EVERY HOUR AT :30 FOR 10 MIN', y0 + 26, [150, 160, 180]);
        line('BIGGEST CATCH WINS TOKENS', y0 + 36, [150, 160, 180]);
        const l = b?.last;
        if (l) { line('LAST WINNER:', y0 + 52, [124, 242, 208]); line(l.name.slice(0, 12) + ' ' + l.fish, y0 + 62, [255, 214, 90]); line(l.cm + 'CM  +' + l.prize + ' TOKENS', y0 + 72, [255, 214, 90]); }
      }
    });
    Gd(x0 + w / 2, y0 + h / 2, 50, cl.live ? [255, 180, 90] : [120, 200, 255], cl.live ? 0.14 : 0.07);
  },
};
