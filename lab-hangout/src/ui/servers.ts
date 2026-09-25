// The server picker: every world server with how full it is, which of your friends are on it,
// and a JOIN button. The busiest server that still has room is the suggested one, so people
// find each other instead of spreading thin. Joining takes a seat (the server enforces the cap).

import type { ServerInfo, Transport } from '../net/transport';
import { button, openModal, row, font } from './modal';
import { SFX } from '../audio/sfx';


/** The busiest server with room left (ties: the first). */
export function suggest(list: ServerInfo[], current: string | null): ServerInfo | undefined {
  return [...list].filter((v) => v.players < v.cap || v.id === current).sort((a, b) => b.players - a.players)[0];
}

/**
 * Show the picker and resolve with the server you got a seat on. With `mustPick`, closing it
 * takes the suggested server instead (you have to be somewhere). Without, closing resolves null.
 */
export function pickServer(net: Transport, friendIds: string[], mustPick: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    let list: ServerInfo[] = [], busy = false, finished = false, timer = 0;
    const m = openModal('PICK A SERVER', () => {
      clearInterval(timer);
      if (finished) return;
      if (!mustPick) { finished = true; resolve(null); return; }
      // closed without choosing: join the suggestion (retry the picker if that fails)
      const s = suggest(list, net.server);
      if (s) net.claimSeat(s.id).then(() => { finished = true; resolve(s.id); }, () => { void pickServer(net, friendIds, true).then(resolve); });
      else void pickServer(net, friendIds, true).then(resolve);
    });
    const box = document.createElement('div'); Object.assign(box.style, { display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 'min(420px, 82vw)' });
    const msg = document.createElement('div'); Object.assign(msg.style, font(19, '#FF9A8A'), { minHeight: '19px', textAlign: 'center' });
    const join = async (v: ServerInfo) => {
      if (busy) return; busy = true; msg.textContent = '';
      try { await net.claimSeat(v.id); SFX.door(); finished = true; m.close(); resolve(v.id); }
      catch (e) { msg.textContent = e instanceof Error ? e.message : String(e); SFX.hurt(); await refresh(); }
      busy = false;
    };
    const draw = () => {
      const best = suggest(list, net.server);
      box.replaceChildren(...list.map((v) => {
        const full = v.players >= v.cap && v.id !== net.server, here = v.id === net.server;
        const line = document.createElement('div');
        Object.assign(line.style, { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: v === best ? 'rgba(255, 214, 90, .10)' : 'rgba(255, 255, 255, .04)', borderLeft: '3px solid ' + (full ? '#6B6B7A' : v === best ? '#FFD65A' : '#9FEFFF') });
        const name = document.createElement('span'); name.textContent = v.name; Object.assign(name.style, { fontFamily: "'Press Start 2P', monospace", fontSize: '11px', color: full ? '#8A8A98' : '#FFF3D6', minWidth: '64px', textAlign: 'left' });
        const bar = document.createElement('span'); Object.assign(bar.style, { flex: '1', height: '8px', background: 'rgba(255,255,255,.12)', position: 'relative' });
        const fill = document.createElement('span'); Object.assign(fill.style, { position: 'absolute', inset: '0 auto 0 0', width: Math.min(100, (v.players / Math.max(1, v.cap)) * 100) + '%', background: full ? '#FF6A5A' : '#7CF29C' }); bar.appendChild(fill);
        const count = document.createElement('span'); count.textContent = full ? 'FULL' : v.players + '/' + v.cap; Object.assign(count.style, font(20, full ? '#FF9A8A' : '#9FEFFF'), { minWidth: '44px' });
        line.append(name, bar, count);
        if (v.friends.length) { const f = document.createElement('span'); f.textContent = '★' + v.friends.length; f.title = v.friends.length + ' of your friends'; Object.assign(f.style, font(20, '#FFD65A')); line.appendChild(f); }
        const b = button(here ? 'HERE' : 'JOIN', () => void join(v), here || v !== best);
        b.disabled = full || here; line.appendChild(b);
        return line;
      }));
      if (!list.length) { const e = document.createElement('div'); e.textContent = 'Looking for servers...'; Object.assign(e.style, font(20, '#9FEFFF')); box.appendChild(e); }
    };
    const refresh = async () => { try { list = await net.servers(friendIds); } catch (e) { msg.textContent = e instanceof Error ? e.message : String(e); } draw(); };
    const hint = document.createElement('div'); hint.textContent = 'Each server is its own copy of the world. Friends have to be on the same one to see each other.';
    Object.assign(hint.style, font(18, '#E8D8C0'), { maxWidth: '420px', textAlign: 'center' });
    m.body.append(hint, box, msg, row(button(mustPick ? 'JOIN THE SUGGESTED ONE' : 'CLOSE', () => m.close(), true)));
    draw(); void refresh();
    timer = window.setInterval(() => { if (!busy) void refresh(); }, 4000);
  });
}
