// THE LOFTS and the flats, the playing part (world/lofts.ts, world/flat.ts draw them, ui/decorate.ts and ui/flats.ts
// are the panels, 0014_apartments.sql keeps them): going home (move-in day's starter kit), visiting, knocking,
// house parties, DECORATE, the lobby's directory, the aquarium / trophy cabinet, and the owner's pet.

import { game, $, errText } from '../app/game';
import { quests } from '../game/quests';
import { LOFTS_INFO } from '../world/lofts';
import { FLAT, applyLayout, isFlat, petSpot, type FlatRoomId } from '../world/flat';
import { closeDecorate, decorating, openDecorate } from '../ui/decorate';
import { knockPrompt } from '../ui/flats';
import { season } from '../world/season';
import { save } from '../game/save';
import { allow } from '../net/filter';
import type { FlatItem, FlatMsg } from '../net/transport';
import { toast } from '../ui/overlay';
import { SFX } from '../audio/sfx';

// ---------- THE LOFTS and the flats (world/lofts.ts, world/flat.ts, ui/decorate.ts, ui/flats.ts) ----------
let dirAt = 0;
const flatRooms = () => ({ flat: game.rooms.flat, flatbed: game.rooms.flatbed, flatkit: game.rooms.flatkit });
/** Up the elevator to your own flat. */
export async function goHome(): Promise<void> {
  try {
    const f = await game.net.myFlat();
    const fresh = !Object.values(f.layout.rooms).some((r) => r && r.items.length);
    if (fresh) f.layout.rooms = { // move-in day: the starter kit, set out
      liv: { w: 'wall0', f: 'floor0', items: [['rug', 480, 1, 0], ['armchair', 420, 0, 0], ['lamp', 360, 0, 0], ['plant', 620, 0, 0]].filter((it) => (f.owned[it[0] as string] ?? 0) > 0) as FlatItem[] },
      bed: { w: 'wall1', f: 'floor1', items: [['bed', 200, 0, 0]].filter((it) => (f.owned[it[0] as string] ?? 0) > 0) as FlatItem[] },
      kit: { w: 'wall0', f: 'floor0', items: [] }, // (only free wallpapers and floors: the rest are bought)
    };
    Object.assign(FLAT, { owner: game.net.selfId, name: game.me.name, layout: f.layout, door: f.door, party: f.party, mine: true, owned: f.owned });
    game.setTokens(f.tokens); applyLayout(flatRooms());
    if (fresh) game.net.saveFlat(f.layout).catch((e) => console.warn('[flat]', e));
    await game.enterRoom('flat', { x: 52, y: 500 });
    void updateShow();
    toast(fresh ? 'Welcome to your new flat! Press DECORATE to make it yours' : 'Home sweet home', 4000);
  } catch (e) { toast(errText(e)); }
}
/** Into someone's flat (if they'd let you). */
export async function visitFlat(owner: string): Promise<void> {
  if (owner === game.net.selfId) { void goHome(); return; }
  try {
    const f = await game.net.getFlat(owner);
    Object.assign(FLAT, { owner, name: f.name, layout: f.layout, door: f.door, party: f.party, mine: false, owned: {} });
    applyLayout(flatRooms());
    await game.enterRoom('flat', { x: 52, y: 500 });
    quests.bump('visit');
  } catch (e) { toast(errText(e)); }
}
/** A visitor walking between rooms (or told something changed): fetch the flat again. */
export async function recheckFlat(): Promise<void> {
  try { const f = await game.net.getFlat(FLAT.owner); const same = JSON.stringify(f.layout) === JSON.stringify(FLAT.layout); Object.assign(FLAT, { door: f.door, party: f.party }); if (!same) { FLAT.layout = f.layout; applyLayout(flatRooms()); } }
  catch { /* (the door may have been locked since: you can stay till you leave) */ }
}
export function knockOn(owner: string, name: string): void {
  game.net.send('flat', { k: 'knock', to: owner, nm: game.me.name }); SFX.dingdong();
  toast('You knocked on ' + name + "'s door. Wait for them to answer...", 4000);
}
export function onFlatMsg(from: string, f: FlatMsg): void {
  if (!allow(from, 'flat', 1, 3)) return;
  if (f.k === 'knock' && f.to === game.net.selfId) {
    SFX.dingdong();
    knockPrompt(f.nm, () => { game.net.letIn(from).then(() => game.net.send('flat', { k: 'in', to: from, nm: game.me.name })).catch((e) => toast(errText(e))); }, () => game.net.send('flat', { k: 'no', to: from, nm: game.me.name }));
  } else if (f.k === 'in' && f.to === game.net.selfId) { toast(f.nm + ' let you in!', 2500); void visitFlat(from); }
  else if (f.k === 'no' && f.to === game.net.selfId) toast(f.nm + " can't have visitors right now", 3000);
  else if (f.k === 'party' && (f.until ?? 0) > Date.now() / 1000) { SFX.join(); toast(f.nm + ' is throwing a HOUSE PARTY! Go to THE LOFTS (the right end of the Square) and take the elevator', 6500); dirAt = 0; }
}
/** Your fish, badges and records, for the aquarium and the trophy cabinet (saved with the flat when they change). */
async function updateShow(): Promise<void> {
  if (!FLAT.mine) return;
  const st = save.data.stats, show = { fish: save.data.fish.slice(0, 30), badges: [...quests.mine].slice(0, 40), best: { diner: st.dinerBest ?? 0, kart: st.kartWins ?? 0, tank: st.tankWins ?? 0, pong: st.pongWins ?? 0 } };
  if (JSON.stringify(show) === JSON.stringify(FLAT.layout.show)) return;
  FLAT.layout.show = show;
  try { await game.net.saveFlat(FLAT.layout); } catch (e) { console.warn('[flat]', e); }
}
function startDecorating(): void {
  if (!FLAT.mine || !isFlat(game.room.id)) return;
  const view = $<HTMLCanvasElement>('#view');
  openDecorate({
    season: () => season(),
    room: () => (isFlat(game.room.id) ? game.room.id : null),
    buy: async (id) => { try { const r = await game.net.buyFurniture(id); FLAT.owned[id] = r.n; game.setTokens(r.tokens); SFX.chime(); quests.stat('furniture'); return true; } catch (e) { toast(errText(e)); SFX.blip(); return false; } },
    save: async () => {
      try { await game.net.saveFlat(FLAT.layout); game.setState({ k: 'flat', v: { n: Date.now(), party: FLAT.party } }); toast('Saved! Looking good', 2500); SFX.score(); quests.bump('home'); return true; }
      catch (e) { toast(errText(e)); return false; }
    },
    door: () => FLAT.door,
    setDoor: async (d) => { try { await game.net.setDoor(d); FLAT.door = d; toast(d === 'locked' ? 'Door locked: people knock and you let them in' : d === 'friends' ? 'Friends can walk right in' : 'Open house: anyone on this server can visit', 3500); } catch (e) { toast(errText(e)); } },
    toWorld: (cx, cy) => { const rc = view.getBoundingClientRect(); return game.R.toWorld(cx - rc.left, cy - rc.top); },
    changed: () => applyLayout(flatRooms()),
    toast: (t) => toast(t, 2500),
    onClose: () => { syncDecoBtn(); },
  });
  syncDecoBtn();
}
const decoBtn = document.createElement('button');
decoBtn.type = 'button'; decoBtn.className = 'pill'; decoBtn.textContent = 'DECORATE'; decoBtn.style.display = 'none';
decoBtn.addEventListener('click', () => { if (decorating()) closeDecorate(true); else startDecorating(); });
/** Put DECORATE in the emote bar (after SKIP TOUR; main.ts calls this where the bar is built, so it keeps its place). */
export function initDecoButton(bar: HTMLElement): void { bar.appendChild(decoBtn); }
function syncDecoBtn(): void {
  const show = game.playing && FLAT.mine && isFlat(game.room.id);
  decoBtn.style.display = show && !decorating() ? '' : 'none';
}
/** Each frame: the directory in the lobby, the owner's pet roaming the flat, the party. */
export function flatStep(): void {
  syncDecoBtn();
  if (game.room.id === 'lofts' && game.playing && Date.now() - dirAt > 8000) {
    dirAt = Date.now();
    const ppl = [...game.lobby.map((p) => ({ id: p.id, name: p.name, room: p.room })), { id: game.net.selfId, name: game.me.name, room: game.room.id }];
    game.net.flatDoors(ppl.map((p) => p.id)).then((ds) => { LOFTS_INFO.dir = ds.map((d) => ({ name: ppl.find((p) => p.id === d.owner)?.name ?? d.name, door: d.door, party: !!d.party && d.party > Date.now() / 1000, home: isFlat(ppl.find((p) => p.id === d.owner)?.room ?? 'lab') })).sort((a, b) => Number(b.party) - Number(a.party) || Number(b.home) - Number(a.home)); }).catch(() => {});
  }
  // the owner's pet has the run of the place
  const owner = isFlat(game.room.id) ? (FLAT.mine ? game.me : game.others.get(FLAT.owner)) : null;
  game.me.petGoal = null; for (const o of game.others.values()) o.petGoal = null;
  if (owner && owner.look.pet) owner.petGoal = petSpot(game.room.id as FlatRoomId, owner.seed * 1000);
}
