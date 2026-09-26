// THE ROOFTOP GARDEN, the playing part (world/garden.ts draws the beds and does the growing sums, ui/garden.ts has
// the panels, 0008_gardens.sql decides): planting, watering (anyone's), harvesting and digging up.

import { game, now } from '../app/game';
import { quests } from '../game/quests';
import { GARDEN, SEEDS, plantLine, plantState } from '../world/garden';
import { openMyPlant, openSeeds } from '../ui/garden';
import { save } from '../game/save';
import { toast } from '../ui/overlay';
import { SFX } from '../audio/sfx';

// ---------- the Rooftop garden (world/garden.ts) ----------
export function refreshGarden(bump = false): void {
  GARDEN.dirty = false; GARDEN.fetchedAt = Date.now();
  game.net.api.garden.plots().then((ps) => { GARDEN.plots = ps; }).catch((e) => console.warn('[garden]', e));
  if (bump) game.setState({ k: 'garden', v: { n: Date.now() } }); // tell everyone else on the roof to look again
}
const gardenDo = <T,>(act: () => Promise<T>, ok: (r: T) => void): void => game.serverDo('garden', act, ok, refreshGarden);
function waterBed(n: number): void {
  const other = GARDEN.plots.find((q) => q.bed === n)?.owner !== game.net.selfId;
  gardenDo(() => game.net.api.garden.water(n), (r) => { if (other) quests.bump('water'); if (r.thanked) quests.stat('helped'); game.setTokens(r.tokens); GARDEN.splash.set(n, now()); SFX.pour(); toast(r.thanked ? 'Watered! +1 token for helping out' : 'Watered! It grows faster for 3 hours', 3000); if (r.thanked) game.floatText('+1'); });
}
export function tendBed(n: number): void {
  const p = GARDEN.plots.find((q) => q.bed === n), mine = GARDEN.plots.find((q) => q.owner === game.net.selfId && !plantState(q).dead);
  if (!p || plantState(p).dead) {
    if (mine) { toast('You already have a ' + SEEDS[mine.seed].name + ' growing (bed ' + (mine.bed + 1) + ')', 3500); return; }
    SFX.blip();
    openSeeds(n, game.tokens, (i) => save.has('seed:' + i), (seed) => gardenDo(() => game.net.api.garden.plant(n, seed), (bal) => {
      game.setTokens(bal); if (SEEDS[seed].find) save.inv.delete('seed:' + seed);
      SFX.pop(); toast('Planted a ' + SEEDS[seed].name + '! Ask friends to water it', 3500);
    }), () => game.input.clear());
    return;
  }
  if (p.owner === game.net.selfId) {
    openMyPlant(p, {
      water: () => waterBed(n),
      harvest: () => gardenDo(() => game.net.api.garden.harvest(n), (r) => {
        quests.bump('harvest'); quests.stat('harvests');
        game.setTokens(r.tokens); SFX.score(); game.celebrate();
        const s = SEEDS[r.seed]; game.floatText('+' + s.pays);
        const first = !save.data.crops.includes(s.name); if (first) save.update((d) => { d.crops.push(s.name); });
        toast('Harvested your ' + s.name + '! +' + s.pays + ' tokens' + (first ? ' · NEW CROP ' + save.data.crops.length + '/' + SEEDS.length : ''), 4000);
        if (r.bonus) { save.addPrize(r.bonus); setTimeout(() => { toast('You found a rare MOONFLOWER seed in the soil! Plant it in any free bed', 5000); SFX.chime(); }, 1800); }
      }),
      digUp: () => gardenDo(() => game.net.api.garden.digUp(n), () => toast('Dug up. The bed is free again', 2500)),
    }, () => game.input.clear());
    return;
  }
  if (plantState(p).wet) { toast(plantLine(p, false), 3500); return; }
  waterBed(n);
}

