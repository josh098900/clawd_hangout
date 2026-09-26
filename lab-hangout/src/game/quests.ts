// Daily quests and badges. The server picks today's 3 quests (supabase/migrations/0009_quests.sql);
// the game counts your progress here (kept in your save, so it follows you between devices) and
// hands a quest in when it's done. Badges are lifetime milestones anyone can see on your player
// card; the game notices when you've earned one and claims it (the server double-checks the ones
// it keeps records for).
//
// Game code just reports what happened: quests.bump('marsh') when a marshmallow turns golden,
// quests.stat('commits') for lifetime counts. Keep the ids in step with the SQL pools.

import { save } from './save';
import { COLLECTABLES } from '../entities/critter';
import type { Transport } from '../net/transport';

export const QUESTS: Record<string, { text: string; goal: number }> = {
  marsh: { text: 'Roast 3 golden marshmallows at the Pier', goal: 3 },
  pong: { text: 'Win a game of Pong at the Arcade', goal: 1 },
  fish: { text: 'Catch a rare fish off the Pier', goal: 1 },
  water: { text: "Water someone else's plant on the Rooftop", goal: 1 },
  ride: { text: 'Ride the subway to the Park', goal: 1 },
  claw: { text: 'Play the claw machine', goal: 1 },
  coins: { text: 'Pick up 3 coins on the Square', goal: 3 },
  harvest: { text: 'Harvest a crop from the garden', goal: 1 },
  feed: { text: 'Feed the pigeons or the ducks 3 times', goal: 3 },
  dance: { text: 'Dance at the Stage for 10 seconds', goal: 1 },
  deploy: { text: 'Ship a deploy in the Dev Den', goal: 1 },
  kite: { text: 'Fly a kite in the Park', goal: 1 },
  boat: { text: 'Row a boat on the Park pond', goal: 1 },
  slop: { text: 'Zap 5 slop blobs on the Square', goal: 5 },
  party: { text: 'Win a party game (musical chairs or tag)', goal: 1 },
  photo: { text: 'Take a photo-booth strip at the Cinema', goal: 1 },
  high5: { text: 'High-five someone (wave next to a waver)', goal: 1 },
  commit: { text: 'Make 3 commits in the Dev Den', goal: 3 },
  stars: { text: 'Find a constellation from the roof', goal: 1 },
  crew: { text: 'Join a group dance (3 or more dancing together)', goal: 1 },
  diner: { text: 'Work a kitchen shift at the Diner', goal: 1 },
  kart: { text: 'Finish a race at the Kart Track', goal: 1 },
  tank: { text: 'Win a TANK DUEL at the Arcade', goal: 1 },
  home: { text: 'Decorate your flat in THE LOFTS', goal: 1 },
  visit: { text: "Visit someone else's flat", goal: 1 },
  launch: { text: 'Ride the rocket up to the Space Station', goal: 1 },
  spacewalk: { text: 'Collect 10 stardust on a spacewalk', goal: 10 },
  comet: { text: 'Spot a comet from Mission Control', goal: 1 },
  moonwalk: { text: 'Take the lander down to the Moon', goal: 1 },
  moonrock: { text: 'Assay 3 moon rocks at the Moon Base', goal: 3 },
  buggy: { text: 'Drive a full lap in a moon buggy', goal: 1 },
};
export const BADGES: { id: string; name: string; hint: string; earned: (tokens: number) => boolean }[] = [
  { id: 'angler', name: 'ANGLER', hint: 'Catch all 12 kinds of fish', earned: () => save.data.fish.length >= 12 },
  { id: 'collector', name: 'COLLECTOR', hint: 'Own every hat, face, outfit and pet prize', earned: () => COLLECTABLES.every((k) => save.has(k)) },
  { id: 'coder', name: '10X DEV', hint: 'Make 100 commits in the Dev Den', earned: () => stat('commits') >= 100 },
  { id: 'champ', name: 'PONG CHAMP', hint: 'Win 5 games of Pong', earned: () => stat('pongWins') >= 5 },
  { id: 'green', name: 'GREEN THUMB', hint: 'Harvest 10 crops', earned: () => stat('harvests') >= 10 },
  { id: 'helper', name: 'GOOD NEIGHBOUR', hint: "Water 20 of other people's plants", earned: () => stat('helped') >= 20 },
  { id: 'quester', name: 'QUEST HERO', hint: 'Finish 30 daily quests', earned: () => stat('quests') >= 30 },
  { id: 'tycoon', name: 'TYCOON', hint: 'Have 100 tokens at once', earned: (t) => t >= 100 },
  { id: 'stargazer', name: 'STARGAZER', hint: 'Find every constellation', earned: () => save.data.stars.length >= 5 },
  { id: 'royal', name: 'ROYALTY', hint: 'Find the crown in the Crypt', earned: () => save.has('hat:5') },
  { id: 'commuter', name: 'COMMUTER', hint: 'Ride the subway 10 times', earned: () => stat('rides') >= 10 },
  { id: 'spooked', name: 'SPOOKED', hint: 'Get tricked on Halloween', earned: () => stat('tricks') >= 1 },
  { id: 'trophy', name: 'TROPHY ANGLER', hint: 'Win a fishing contest at the Pier', earned: () => false }, // the server awards this one
  { id: 'crew', name: 'DANCE CREW', hint: 'Join 10 group dances', earned: () => stat('crews') >= 10 },
  { id: 'chef', name: 'HEAD CHEF', hint: 'Score 120 points in one Diner shift', earned: () => stat('dinerBest') >= 120 },
  { id: 'racer', name: 'SPEED DEMON', hint: 'Win 5 kart races', earned: () => stat('kartWins') >= 5 },
  { id: 'ace', name: 'TANK ACE', hint: 'Win 5 tank duels', earned: () => stat('tankWins') >= 5 },
  { id: 'homeowner', name: 'HOMEOWNER', hint: 'Buy 15 pieces of furniture', earned: () => stat('furniture') >= 15 },
  { id: 'host', name: 'PARTY HOST', hint: 'Throw a house party', earned: () => stat('parties') >= 1 },
  { id: 'storm', name: 'STORM CHASER', hint: 'Catch a fish in a thunderstorm', earned: () => stat('stormFish') >= 1 },
  { id: 'astronaut', name: 'ASTRONAUT', hint: 'Fly to the Space Station 5 times', earned: () => stat('flights') >= 5 },
  { id: 'moonwalker', name: 'MOONWALKER', hint: 'Assay 20 moon rocks', earned: () => stat('moonrocks') >= 20 },
];
const stat = (k: string): number => save.data.stats[k] ?? 0;

export interface QuestEvents { done(text: string, tokens: number, bonus: boolean): void; badge(name: string): void; changed(): void }

class Quests {
  day = ''; today: string[] = []; done = new Set<string>(); mine = new Set<string>();
  private net: Transport | null = null; private on: QuestEvents | null = null; private busy = new Set<string>(); private tokens = 0;
  /** When the server last refused a badge (its own check disagreed): don't ask again for a minute. */
  private refused = new Map<string, number>();

  async init(net: Transport, on: QuestEvents): Promise<void> {
    this.net = net; this.on = on;
    await this.refresh();
    try { this.mine = new Set(await net.api.quests.badgesOf(net.selfId)); } catch (e) { console.warn('[badges]', e); }
    this.checkBadges();
  }
  /** Fetch today's quests (after midnight UTC they change). */
  async refresh(): Promise<void> {
    if (!this.net) return;
    try { const q = await this.net.api.quests.today(); this.day = q.day; this.today = q.quests.filter((id) => QUESTS[id]); this.done = new Set(q.done); } catch (e) { console.warn('[quests]', e); }
    this.on?.changed();
  }
  /** Progress on quest `id` today (0..goal). */
  count(id: string): number { const q = save.data.q; return q.day === this.day ? q.c[id] ?? 0 : 0; }
  /** Something happened that counts towards quest `id`. */
  bump(id: string, n = 1): void {
    if (!this.today.includes(id) || this.done.has(id)) return;
    const goal = QUESTS[id].goal;
    save.update((d) => { if (d.q.day !== this.day) d.q = { day: this.day, c: {} }; d.q.c[id] = Math.min(goal, (d.q.c[id] ?? 0) + n); });
    this.on?.changed();
    if (this.count(id) >= goal) this.handIn(id);
  }
  /** A lifetime count went up (commits, rides...); badges may follow. */
  stat(k: string, n = 1): void { save.update((d) => { d.stats[k] = (d.stats[k] ?? 0) + n; }); this.checkBadges(); }
  /** Your balance changed (the TYCOON badge). */
  setTokens(t: number): void { this.tokens = t; this.checkBadges(); }
  checkBadges(): void {
    for (const b of BADGES) {
      if (this.mine.has(b.id) || this.busy.has('b:' + b.id) || Date.now() - (this.refused.get(b.id) ?? -1e12) < 60000 || !b.earned(this.tokens)) continue;
      this.busy.add('b:' + b.id);
      this.net?.api.quests.claimBadge(b.id).then((isNew) => { this.mine.add(b.id); if (isNew) this.on?.badge(b.name); this.on?.changed(); }).catch(() => { this.refused.set(b.id, Date.now()); }).finally(() => this.busy.delete('b:' + b.id));
    }
  }
  private handIn(id: string): void {
    if (!this.net || this.busy.has(id)) return;
    this.busy.add(id);
    this.net.api.quests.complete(id).then((r) => { this.done.add(id); this.stat('quests'); this.on?.done(QUESTS[id].text, r.tokens, r.bonus); this.on?.changed(); })
      .catch((e: unknown) => { const m = e instanceof Error ? e.message : String(e); if (/already/.test(m)) this.done.add(id); else if (/not one of today/.test(m)) void this.refresh(); this.on?.changed(); })
      .finally(() => this.busy.delete(id));
  }
  /** How long until the quests change (seconds). */
  resetIn(): number { const now = Date.now(); return Math.max(0, (Math.floor(now / 86400000) + 1) * 86400000 - now) / 1000; }
}
export const quests = new Quests();
