// THE LOFTS' windows onto the flats: the ELEVATOR menu (go home, visit or knock on the flats of
// people on your server), the knock prompt that pops up when someone's at your door, and the
// cards for the aquarium and the trophy cabinet.

import type { DoorMode, FlatDoor, FlatShow } from '../net/transport';
import { BADGES } from '../game/quests';
import { button, openModal, row } from './modal';

const font = (px: number, color: string) => ({ fontFamily: "'VT323', monospace", fontSize: px + 'px', color });
const doorWord = (d: DoorMode) => (d === 'locked' ? 'LOCKED' : d === 'friends' ? 'FRIENDS ONLY' : 'OPEN');

export interface LiftHooks {
  people(): { id: string; name: string }[];
  doors(ids: string[]): Promise<FlatDoor[]>;
  home(): void;
  visit(id: string): void;
  knock(id: string, name: string): void;
  myDoor(): DoorMode; setDoor(d: DoorMode): Promise<void>;
  onClose(): void;
}
/** The elevator: your flat, and everyone else's. */
export function openLift(h: LiftHooks): void {
  const m = openModal('THE LOFTS', h.onClose);
  const mine = document.createElement('div'); Object.assign(mine.style, font(20, '#FFE9B0'), { textAlign: 'center' });
  const doorBtn = button('', () => { const d = h.myDoor(), next: DoorMode = d === 'locked' ? 'friends' : d === 'friends' ? 'open' : 'locked'; void h.setDoor(next).then(sync); }, true);
  const sync = () => { doorBtn.textContent = 'MY DOOR: ' + doorWord(h.myDoor()); };
  sync();
  mine.textContent = 'Your flat is on the top floor.';
  const list = document.createElement('div'); Object.assign(list.style, { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '300px', maxHeight: '46vh', overflowY: 'auto' });
  const note = document.createElement('div'); Object.assign(note.style, font(18, '#9FEFFF'), { textAlign: 'center' }); note.textContent = 'Checking who is in...';
  m.body.append(mine, row(button('GO HOME', () => { m.close(); h.home(); }), doorBtn), note, list, row(button('CLOSE', m.close, true)));
  const ppl = h.people();
  if (!ppl.length) { note.textContent = 'Nobody else is on this server right now.'; return; }
  h.doors(ppl.map((p) => p.id)).then((doors) => {
    note.textContent = 'Neighbours online:';
    list.replaceChildren(...ppl.map((p) => {
      const d = doors.find((x) => x.owner === p.id), line = document.createElement('div');
      Object.assign(line.style, { display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' });
      const who = document.createElement('span'); Object.assign(who.style, font(20, '#FFFFFF')); who.textContent = p.name;
      const st = document.createElement('span'); const party = !!d?.party && d.party > Date.now() / 1000;
      Object.assign(st.style, font(18, party ? '#FF5AAA' : d?.door === 'open' ? '#7CF29C' : d?.door === 'friends' ? '#5AD1FF' : '#FF9090'));
      st.textContent = !d ? 'NOT MOVED IN' : party ? 'HOUSE PARTY!' : doorWord(d.door);
      const act = !d ? null : d.can ? button('VISIT', () => { m.close(); h.visit(p.id); }) : button('KNOCK', () => { m.close(); h.knock(p.id, p.name); }, true);
      line.append(who, st, ...(act ? [act] : [])); return line;
    }));
  }).catch((e: unknown) => { note.textContent = e instanceof Error ? e.message : 'Could not check the doors'; });
}

/** Someone's knocking: a card with LET IN / NOT NOW (gone after 25 s = not now). */
export function knockPrompt(name: string, yes: () => void, no: () => void): void {
  const card = document.createElement('div'); card.className = 'knock';
  const t = document.createElement('div'); t.textContent = name + ' is knocking on your door!';
  const b1 = document.createElement('button'), b2 = document.createElement('button'); b1.type = b2.type = 'button'; b1.textContent = 'LET IN'; b2.textContent = 'NOT NOW';
  let done = false; const end = (ok: boolean) => { if (done) return; done = true; card.remove(); if (ok) yes(); else no(); };
  b1.addEventListener('click', () => end(true)); b2.addEventListener('click', () => end(false));
  card.append(t, b1, b2); document.body.appendChild(card); setTimeout(() => end(false), 25000);
}

/** The aquarium and the trophy cabinet up close. */
export function openShow(kind: 'tank' | 'trophy', owner: string, show: FlatShow, onClose: () => void): void {
  const m = openModal(kind === 'tank' ? owner + "'S AQUARIUM" : owner + "'S TROPHIES", onClose);
  const box = document.createElement('div'); Object.assign(box.style, font(20, '#FFE9B0'), { textAlign: 'center', maxWidth: '340px', lineHeight: '1.3' });
  if (kind === 'tank') box.textContent = show.fish.length ? show.fish.length + ' kinds of fish: ' + show.fish.join(', ') : 'No fish yet. Catch some at the Pier!';
  else {
    const b = BADGES.filter((x) => show.badges.includes(x.id)).map((x) => x.name), best = show.best, recs: string[] = [];
    if (best.diner) recs.push('BEST DINER SHIFT: ' + best.diner); if (best.kart) recs.push('KART WINS: ' + best.kart); if (best.tank) recs.push('TANK DUEL WINS: ' + best.tank); if (best.pong) recs.push('PONG WINS: ' + best.pong);
    box.textContent = (b.length ? b.length + ' badges: ' + b.join(', ') : 'No badges yet.') + (recs.length ? '  ·  ' + recs.join('  ·  ') : '');
  }
  m.body.append(box, row(button('CLOSE', m.close, true)));
}
