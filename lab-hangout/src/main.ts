// Lab Hangout — boot, game loop, local movement, networking glue.
//
// Frame order (same layering as the film):
//   1. room.bg (baked set)           4. room.drawFront
//   2. room.drawBack (animated set)  5. present: crisp layer + blurred glow layer
//   3. props + avatars, sorted by y  6. DOM overlays (bubbles, plate)

import './styles.css';
import { Renderer } from './engine/renderer';
import { Input, isTyping } from './engine/input';
import { PX, lit, r, txt, txtOutlined, tw, ring, Gd, mk, withCtx, alpha } from './engine/pixel';
import { K } from './engine/palette';
import { clamp, seg } from './engine/math';
import { makeLab, LAB_INFO } from './world/lab';
import { makeDen, DEN_INFO, lightning, pomodoro } from './world/den';
import { makeRoof, showStart } from './world/roof';
import { makeStage, stageNote, INST_COL } from './world/stage';
import { playPad, INSTRUMENTS } from './audio/music';
import { makePier, PIER_FIRE } from './world/pier';
import { makeArcade, ARCADE_INFO, PONG_SPOTS, pongSeen } from './world/arcade';
import { makeStation, makeTrain, STATIONS, train } from './world/subway';
import { makePark, PARK_INFO, DOCK, POND, pondEdge } from './world/park';
import { openSandbox } from './ui/sandbox';
import { openClaw, withItem } from './ui/claw';
import { openPong, type PongHandle } from './ui/pong';
import { openPrizes } from './ui/prizes';
import { openDesk } from './ui/desk';
import { setSeason, isHalloween } from './world/season';
import { installHalloween, halloweenProps, halloweenBack, halloweenFront, markKnocked, lightCandle, candleOrder, TREAT_DOORS } from './world/halloween';
import { GARDEN, SEEDS, plantLine, plantState } from './world/garden';
import { openMyPlant, openSeeds } from './ui/garden';
import { hsBanner, hsFound, hsLive, hsTick, nameIn, startHS, TAG_DIST } from './game/hideseek';
import { catchFish } from './game/fish';
import { makeCrypt, platesDown, setDown, blockCenters, resetBlocks, CRYPT_INFO, OPEN_FOR } from './world/crypt';
import { owns } from './ui/start';
import { save } from './game/save';
import { pickServer } from './ui/servers';
import { openStars } from './ui/stars';
import { makePlaza, COINS, dayness } from './world/plaza';
import { turnstileToken } from './ui/captcha';
import { makeCinema, filmClock, filmPlaying } from './world/cinema';
import { doorDest, inside, routeTo, walkable, ROOM_IDS, type Door, type Room, type RoomId, type Talker } from './world/room';
import { DEFAULT_LOOK, itemName, type Look } from './entities/critter';
import { drawAvatar, EMOTES, WHEEL, ALL_EMOTES, emoteDur, makeAvatar, pushSnap, stepRemote, USES, useEmote, HOLD_MUG, HOLD_POPCORN, HOLD_SODA, HOLD_MARSH, HOLD_TOAST, HOLD_BURNT, POSE_DANCE, POSE_FLOOR, POSE_GHOST, POSE_BOAT, HOLD_KITE, HOLD_HOTDOG, type Avatar, type EmoteKind, type Using } from './entities/avatar';
import { SupabaseTransport } from './net/supabase';
import { allow } from './net/filter';
import { LocalTransport } from './net/local';
import { cleanChat, GAME_MAX, PROVIDERS, type HideSeek, type Provider, type LobbyPerson, type GameState, type NetEvent, type PeerState, type StateMsg, type StateVal, type Transport } from './net/transport';
import { StartScreen } from './ui/start';
import { animatePlate, clearBubbles, dropBubble, fade, layoutBubbles, logLine, say, showPlate, toast } from './ui/overlay';
import { SFX, setSound, soundOn } from './audio/sfx';
import { Bots } from './game/bots';
import { Npcs, type Npc } from './game/npcs';
import { Ambient } from './game/ambient';
import { BOARD } from './game/board';
import { MusicPlayer, Rain, FILM_TRACK, PARTY_TRACK } from './audio/music';
import { banner, hostStep, live, partyMusic, startChairs, startTag, tagTouch, winner, type HostView } from './game/party';
import { SLOP_DUR, SLOP_N, blob, drawBlob, drawSplat, drawThrow, slopWave } from './game/slop';
import type { BotGame } from './game/bots';
import { openBoard } from './ui/boardui';
import { openArcade } from './ui/arcade';
import { openTyping } from './ui/typing';
import { openKanban } from './ui/kanban';
import { button, flash, modalOpen, openModal, row, type Modal } from './ui/modal';

const $ = <T extends HTMLElement>(q: string) => document.querySelector(q) as T;
const now = () => performance.now() / 1000;

// ---------- tuning ----------
const SPEED_X = 80, SPEED_Y = 54;         // world px / s (depth moves slower, like the film's floor)
/** Position broadcasts per second while walking: 9 in a quiet room, easing to 4 in a full one
 *  (every message is delivered to everyone in the room, so traffic grows with the square of the crowd). */
const sendHz = (n: number) => (n <= 3 ? 9 : Math.max(4, 9 - (n - 3) * 0.625));
const HEARTBEAT = 4;                      // re-send position when idle (s)
const CHAT_COOLDOWN = 0.9, EMOTE_COOLDOWN = 0.5;

// ---------- boot ----------
const R = new Renderer($<HTMLCanvasElement>('#view'), $<HTMLCanvasElement>('#glowv'), $('#stage'));
const ROOMS: Record<RoomId, Room> = { lab: makeLab(), plaza: makePlaza(), cinema: makeCinema(), den: makeDen(), roof: makeRoof(), crypt: makeCrypt(), stage: makeStage(), pier: makePier(), arcade: makeArcade(), subway: makeStation(0), train: makeTrain(), park: makePark(), parkstn: makeStation(1) };
for (const id of ROOM_IDS) ROOMS[id].build();
const input = new Input($<HTMLCanvasElement>('#view'));
const params = new URLSearchParams(location.search);
const SB_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const SB_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
let net: Transport = SB_URL && SB_KEY && !params.has('local') ? new SupabaseTransport(SB_URL, SB_KEY) : new LocalTransport();

let room: Room = ROOMS.lab;
let me: Avatar = makeAvatar('me', 'GUEST', DEFAULT_LOOK, room.spawn.x, room.spawn.y, true, 0);
const others = new Map<string, Avatar>();
let playing = false, editing = false, switching = false;
let tapTarget: { x: number; y: number; door: Door | null; stuck: number; spot: number; npc: Npc | null; tk?: Talker | null; path: [number, number][] } | null = null;
let tapFx: { x: number; y: number; t0: number } | null = null;
let lastSend = -9, lastSentMoving = false, forceSend = false, lastStep = 0, doorCooldown = 0;
let lastChatAt = -9, lastEmoteAt = -9;
/** Players you've muted this session: no bubbles, log lines or emote sounds from them. */
const muted = new Set<string>();
const botCount = net.mode === 'local' ? clamp(parseInt(params.get('bots') || '0', 10) || 0, 0, 12) : 0;
const bots = botCount ? new Bots(botCount, (e) => onNet(e)) : null;
const npcs = new Npcs(ROOMS);
const ambient = new Ambient();
/** Spots in this room used by anyone but you (players, bots, NPCs) -> when they started. */
const busy = new Map<number, number>();
let fillEnd = 0, told = new Set<number>();
/** Photo booth run: when it started, which shot is next, the frames so far. */
let booth: { t0: number; next: number; emoted: number; frames: HTMLCanvasElement[] } | null = null;
let pendingShot = false;
const jukebox = new MusicPlayer(), filmScore = new MusicPlayer(), rain = new Rain(), partyScore = new MusicPlayer();
let gameKey = '', slopToast = -1, fwHeard = 0;
/** Server-owned tokens: coins we've picked up this 5-minute window, and "+1"s floating up. */
const coinsGot = new Set<string>(), floaters: { x: number; y: number; t0: number; text: string }[] = [];
const coinWindow = () => Math.floor(Date.now() / 300000);
let myTokens = 0;
function setTokens(n: number): void { myTokens = n; const el = $('#tokens'); el.textContent = String(n); el.style.display = ''; }
/** Fishing: when the bobber went in, when a fish bites, and whether it's biting right now. */
let fishing: { bite: number; state: 'wait' | 'bite' } | null = null, roast = 0;
/** Slop blobs hit this wave: index -> when the coffee lands and where. Thrown mugs in flight. */
const slopHits = new Map<number, { t: number; x: number; y: number }>(), slopGone = new Set<number>();
let slopW = -1;
const mugs: { x0: number; y0: number; x1: number; y1: number; t0: number }[] = [];
let fixEnd = 0, lastFocus: boolean | null = null, lastFlash = 0;

// ---------- room state (jukebox, arcade high score, whiteboard) ----------
const roomState: Record<RoomId, Map<string, StateMsg>> = { lab: new Map(), plaza: new Map(), cinema: new Map(), den: new Map(), roof: new Map(), crypt: new Map(), stage: new Map(), pier: new Map(), arcade: new Map(), subway: new Map(), train: new Map(), park: new Map(), parkstn: new Map() };
/** Keep the newest value per key; returns true if it changed anything. */
function applyState(s: StateMsg): boolean {
  if (s.k === 'board') { if (room.id !== 'lab' || s.ts <= BOARD.ts) return false; BOARD.load(s.v, s.ts); return true; }
  const m = roomState[room.id], cur = m.get(s.k);
  if (s.k === 'slop') { // hits add up: merge, never overwrite
    const merged = cur?.k === 'slop' && cur.v.w === s.v.w ? [...new Set([...cur.v.dead, ...s.v.dead])] : s.v.dead;
    if (cur?.k === 'slop' && cur.v.w > s.v.w) return false;
    m.set('slop', { k: 'slop', v: { w: s.v.w, dead: merged }, ts: Math.max(s.ts, cur?.ts ?? 0) });
    return true;
  }
  if (cur && cur.ts >= s.ts) return false;
  m.set(s.k, s);
  const prevBuild = DEN_INFO.build;
  room.onState?.(s);
  // someone else's fresh commit / deploy in the Den: show it and make some noise
  const fresh = Date.now() - s.ts < 5000;
  if (room.id === 'den' && fresh && s.k === 'build' && s.v.id !== net.selfId) {
    if (s.v.n > prevBuild.n && others.has(s.v.id)) { say(s.v.id, "git commit -m '" + s.v.msg + "'", now(), false); SFX.commit(); }
    if (prevBuild.ok && !s.v.ok && s.v.n > prevBuild.n) { SFX.siren(); toast(s.v.by + ' broke the build!'); }
    if (!prevBuild.ok && s.v.ok) toast('Build fixed by ' + s.v.by);
  }
  if (room.id === 'den' && fresh && s.k === 'deploy' && Date.now() / 1000 - s.v.t0 < 2 && s.v.by !== me.name) { if (s.v.ok) { SFX.score(); toast(s.v.by + ' shipped it!'); } else { SFX.siren(); SFX.boom(); toast('INCIDENT! ' + s.v.by + ' broke production'); } }
  return true;
}
function setState(v: StateVal): void { const s = { ...v, ts: Date.now() } as StateMsg; applyState(s); net.sendState(s); }
/** The "host" (lowest real id in the room) catches newcomers up. */
function catchUp(newcomer: string): void {
  if (newcomer.startsWith('bot-') || switching) return;
  const ids = [net.selfId, ...others.keys()].filter((id) => id !== newcomer && !id.startsWith('bot-')).sort();
  if (ids[0] !== net.selfId) return;
  for (const s of roomState[room.id].values()) net.sendState(s);
  if (room.id === 'lab' && BOARD.ts > 0) net.sendState({ k: 'board', v: BOARD.snapshot(), ts: BOARD.ts });
}
const isTouch = matchMedia('(pointer: coarse)').matches;

const peerState = (): PeerState => ({ id: net.selfId, name: me.name, look: me.look, x: me.x, y: me.y, dir: me.dir, moving: me.moving });

// ---------- network events ----------
function onNet(e: NetEvent): void {
  const t = now();
  switch (e.type) {
    case 'join': {
      const p = e.peer;
      let av = others.get(p.id);
      if (!av) {
        av = makeAvatar(p.id, p.name, p.look, clamp(p.x || room.spawn.x, room.floor.x0, room.floor.x1), clamp(p.y || room.spawn.y, room.floor.y0, room.floor.y1), false, t);
        others.set(p.id, av);
        if (playing && !switching) { logLine(null, p.name + ' arrived'); SFX.join(); }
      } else { av.name = p.name; av.look = p.look; }
      forceSend = true; // let the newcomer know where we are right now
      catchUp(p.id);
      updateCount();
      break;
    }
    case 'update': { const av = others.get(e.peer.id); if (av) { av.name = e.peer.name; av.look = e.peer.look; } break; }
    case 'leave': {
      const av = others.get(e.id);
      if (av) { others.delete(e.id); dropBubble(e.id); if (!switching) { logLine(null, av.name + ' left'); SFX.leave(); } }
      updateCount();
      break;
    }
    case 'move': { const av = others.get(e.id); if (av && allow(e.id, 'move', 20, 30)) pushSnap(av, e.m, t); break; }
    case 'chat': {
      const av = others.get(e.id); if (!av || e.id === net.selfId || muted.has(e.id) || !allow(e.id, 'chat', 1, 3)) break; // flood guard
      say(e.id, e.text, t, false); logLine(av.name, e.text); SFX.chat();
      break;
    }
    case 'emote': {
      const av = others.get(e.id); if (!av || !allow(e.id, 'emote', 4, 6)) break;
      av.emote = { kind: e.kind, t0: t }; if (!muted.has(e.id)) SFX[e.kind]();
      if (e.kind === 'wave') highFive(av);
      if (e.kind === 'feed' && room.id === 'plaza') ambient.feed(av.x + av.dir * 30, av.y, t);
      if (e.kind === 'feed' && room.id === 'park') { const ex = av.x + av.dir * 40, k = 0.82 / Math.max(0.82, Math.sqrt(((ex - POND.x) / POND.rx) ** 2 + ((av.y - POND.y) / POND.ry) ** 2)); PARK_INFO.feed = { x: POND.x + (ex - POND.x) * k, y: POND.y + (av.y - POND.y) * k, t }; }
      break;
    }
    case 'state': if (allow(e.id, 'state', 6, 12)) applyState(e.s); break;
    case 'note': {
      const av = others.get(e.id); if (!av || room.id !== 'stage' || !allow(e.id, 'note', 14, 20)) break;
      av.noteT = t; stageNote(e.i, e.n); noteSpark(av, e.i); if (!muted.has(e.id)) playPad(e.i, e.n, 0.8);
      break;
    }
    case 'draw': if (room.id === 'lab' && others.has(e.id) && allow(e.id, 'draw', 20, 40)) BOARD.apply(e.d); break;
    case 'pong': {
      // only from whoever is actually standing at that side of the table
      const av = others.get(e.id); if (!av || room.id !== 'arcade' || av.use !== PONG_SPOTS[e.p.s] || !allow(e.id, 'pong', 20, 30)) break;
      pongSeen(e.p); pong?.recv(e.id, e.p);
      break;
    }
    case 'status': toast(e.text); break;
  }
}
const narrow = () => innerWidth < 560;
let serverName = '';
function updateCount(): void { $('#count').textContent = narrow() ? (others.size + 1) + ' HERE · ' + (lobby.length + 1) + ' ON' : (serverName ? serverName + ' · ' : '') + (others.size + 1) + ' HERE · ' + (lobby.length + 1) + ' ONLINE' + (net.mode === 'local' ? ' · LOCAL' : ''); }

// ---------- who's online, and friends ----------
let lobby: LobbyPerson[] = [];
const friends = new Map<string, string>(); // id -> name, starred people (in your save)
save.onChange(() => { friends.clear(); for (const [id, n] of save.data.friends) friends.set(id, n); });
const saveFriends = () => save.update((d) => { d.friends = [...friends]; });
function onLobby(people: LobbyPerson[]): void {
  const was = new Set(lobby.map((p) => p.id));
  for (const p of people) if (friends.has(p.id) && !was.has(p.id) && playing) { toast('★ ' + p.name + ' is online (' + ROOMS[p.room].title + ')', 3500); SFX.join(); }
  lobby = people; updateCount();
}
function peopleCard(): void {
  if (!playing || editing) return;
  const m = openModal("WHO'S ONLINE", () => input.clear());
  const list = document.createElement('div'); Object.assign(list.style, { display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 'min(420px, 80vw)', maxHeight: '50vh', overflowY: 'auto' });
  const rows = [...lobby].sort((p, q) => Number(friends.has(q.id)) - Number(friends.has(p.id)) || p.name.localeCompare(q.name));
  if (!rows.length) { const e = document.createElement('div'); e.textContent = 'Nobody else is online right now. Invite a friend!'; Object.assign(e.style, { fontFamily: "'VT323', monospace", fontSize: '20px', color: '#9FEFFF', textAlign: 'center' }); list.appendChild(e); }
  for (const p of rows) {
    const line = document.createElement('div'); Object.assign(line.style, { display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'VT323', monospace", fontSize: '21px', color: '#FFF3D6' });
    const star = button(friends.has(p.id) ? '★' : '☆', () => { if (friends.has(p.id)) friends.delete(p.id); else friends.set(p.id, p.name); saveFriends(); star.textContent = friends.has(p.id) ? '★' : '☆'; }, true);
    star.title = 'Friend: get a notice when they come online'; Object.assign(star.style, { fontFamily: 'ui-sans-serif, system-ui', fontSize: '16px', padding: '4px 9px' });
    const name = document.createElement('span'); name.textContent = p.name; name.style.flex = '1';
    const hiding = !!hsLive(hs, net.selfId) && hsLive(hs, net.selfId)!.phase !== 'over'; // no peeking during hide and seek
    const where = document.createElement('span'); where.textContent = hiding ? '???' : ROOMS[p.room].title; where.style.color = '#9FEFFF';
    line.append(star, name, where);
    if (p.room !== room.id && !hiding) line.appendChild(button('GO', () => { m.close(); SFX.door(); void enterRoom(p.room, null); }));
    list.appendChild(line);
  }
  const where = document.createElement('div'); where.textContent = 'You are on ' + (serverName || 'a server') + '. Friends on other servers can\'t see you.';
  Object.assign(where.style, { fontFamily: "'VT323', monospace", fontSize: '18px', color: '#E8D8C0', textAlign: 'center' });
  m.body.append(where, list, row(button('SWITCH SERVER', () => { m.close(); void switchServer(); }), button('CLOSE', m.close, true)));
}
$('#count').addEventListener('click', peopleCard);

// ---------- servers ----------
async function chooseServer(mustPick: boolean): Promise<string | null> {
  const want = params.get('server');
  if (want && mustPick && !net.server) { try { await net.claimSeat(want); return want; } catch (e) { toast(e instanceof Error ? e.message : String(e), 3500); } }
  return pickServer(net, [...friends.keys()], mustPick);
}
async function nameServer(): Promise<void> { try { serverName = (await net.servers([])).find((v) => v.id === net.server)?.name ?? ''; } catch { serverName = ''; } updateCount(); }
function onSeatLost(): void {
  toast('Your seat lapsed and the server filled up. Pick another one.', 4000);
  void (async () => { await chooseServer(true); for (const k of ROOM_IDS) roomState[k].clear(); await nameServer(); await enterRoom('lab', null); })();
}
// ---------- idle: free the seat after 10 minutes of doing nothing ----------
// Any key, click, tap or mouse move counts as being here. At 9 minutes a "still there?" box
// counts down; at 10 you leave the server (and the who's-online list) so someone else can have
// the seat, and a REJOIN button takes you back through the server picker. (?idle=N seconds in dev.)
const IDLE_S = import.meta.env.DEV && Number(params.get('idle')) > 0 ? Number(params.get('idle')) : 600, IDLE_WARN = Math.min(60, IDLE_S / 4);
let lastActive = Date.now(), idleOut = false, idleWarn: (Modal & { txt: HTMLElement }) | null = null;
const markActive = () => { lastActive = Date.now(); if (idleWarn && !idleOut) { const w = idleWarn; idleWarn = null; w.close(); } };
for (const ev of ['keydown', 'pointerdown', 'pointermove', 'touchstart', 'wheel']) addEventListener(ev, markActive, { capture: true, passive: true });
setInterval(() => {
  if (!playing || idleOut || switching) return;
  const idle = (Date.now() - lastActive) / 1000;
  if (idle >= IDLE_S) { void goIdle(); return; }
  if (idle >= IDLE_S - IDLE_WARN) {
    if (!idleWarn) {
      const m = openModal('STILL THERE?', () => { if (idleWarn === w) idleWarn = null; });
      const txt = document.createElement('div'); Object.assign(txt.style, { fontFamily: "'VT323', monospace", fontSize: '21px', color: '#E8D8C0', textAlign: 'center', maxWidth: '360px' });
      m.body.append(txt, row(button("I'M HERE", markActive)));
      const w = { ...m, txt }; idleWarn = w; SFX.blip();
    }
    idleWarn.txt.textContent = "You've been quiet for a while. To keep seats free for people who want to play, you'll leave the server in " + Math.ceil(IDLE_S - idle) + ' s.';
  }
}, 1000);
async function goIdle(): Promise<void> {
  idleOut = true;
  if (idleWarn) { const w = idleWarn; idleWarn = null; w.close(); }
  following = null; tapTarget = null; me.moving = false; if (me.use >= 0) leaveSpot();
  clearBubbles(); others.clear(); lobby = [];
  await net.leaveRoom(); net.leaveLobby(); net.leaveSeat();
  serverName = ''; updateCount(); SFX.door();
  const m = openModal('SEE YOU SOON', () => { void rejoin(); });
  const txt = document.createElement('div'); Object.assign(txt.style, { fontFamily: "'VT323', monospace", fontSize: '21px', color: '#E8D8C0', textAlign: 'center', maxWidth: '360px' });
  txt.textContent = 'You were away for ' + Math.round(IDLE_S / 60) + ' minutes, so we freed up your spot for someone else. Your stuff is all saved.';
  m.body.append(txt, row(button('REJOIN', m.close)));
}
async function rejoin(): Promise<void> {
  lastActive = Date.now();
  await chooseServer(true);
  for (const k of ROOM_IDS) roomState[k].clear();
  await nameServer();
  idleOut = false;
  await enterRoom(room.id, { x: me.x, y: me.y });
  toast('Welcome back!', 2000);
}
async function switchServer(): Promise<void> {
  const was = net.server;
  const id = await chooseServer(false);
  if (!id || id === was) return;
  for (const k of ROOM_IDS) roomState[k].clear();
  await nameServer();
  await enterRoom('lab', null);
  toast('Welcome to ' + serverName + '!', 2500);
}


// ---------- rooms ----------
async function enterRoom(id: RoomId, at: { x: number; y: number } | null): Promise<void> {
  switching = true;
  tapTarget = null;
  await fade(true);
  clearBubbles();
  others.clear();
  room = ROOMS[id];
  if (id === 'roof') GARDEN.dirty = true;
  const p = at ?? room.spawn;
  me.x = p.x; me.y = p.y; me.moving = false; me.born = now(); me.emote = null; me.use = -1; me.pose = 0; booth = null; // your mug comes with you
  if (me.hold === HOLD_KITE && id !== 'park') me.hold = 0; // (the kite goes back on the stand)
  R.follow(me.x, me.y, room.w, room.h, 0, true);
  try {
    await net.joinRoom(id, peerState(), onNet);
  } catch (err) {
    console.error(err);
    toast('Could not join room: ' + (err instanceof Error ? err.message : String(err)), 5000);
  }
  bots?.spawn(room);
  net.setLobby(me.name, id);
  updateCount();
  showPlate(id, room.sub, room.title, now());
  doorCooldown = 0.8;
  forceSend = true;
  await fade(false);
  switching = false;
}
function goThrough(d: Door): void {
  const dest = doorDest(d);
  if (switching || doorCooldown > 0 || !dest) return;
  SFX.door();
  void enterRoom(dest.to, dest.arrive);
}

// ---------- chat + emotes ----------
const chatEl = $<HTMLInputElement>('#chat');
$('#chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = cleanChat(chatEl.value);
  if (!text || !playing) { chatEl.blur(); return; }
  const t = now();
  if (t - lastChatAt < CHAT_COOLDOWN) { toast('Slow down a little'); return; }
  lastChatAt = t;
  chatEl.value = '';
  // online, the server cleans + filters + rate-limits it; show what it actually sent
  net.sendChat(text).then((clean) => { if (clean) { say(net.selfId, clean, now(), true); logLine(me.name, clean); SFX.chat(); } })
    .catch((err: unknown) => { toast(err instanceof Error ? err.message : 'Could not send'); chatEl.value = text; });
  chatEl.blur(); // Enter opens chat, Enter sends and hands the keys back to walking
});
chatEl.addEventListener('keydown', (e) => { if (e.key === 'Escape') chatEl.blur(); });
if (matchMedia('(pointer: coarse)').matches) chatEl.placeholder = 'Tap to chat';

function emote(kind: EmoteKind): boolean {
  const t = now();
  if (!playing || editing || t - lastEmoteAt < EMOTE_COOLDOWN) return false;
  lastEmoteAt = t;
  me.emote = { kind, t0: t };
  SFX[kind]();
  net.sendEmote(kind);
  if (kind === 'wave') highFive(me);
  return true;
}

// ---------- spots (seats, coffee, arcade), NPCs and the action button ----------
const usingOf = (av: Avatar): Using => (av.use >= 0 ? room.spots[av.use]?.kind ?? null : null);
const liftOf = (av: Avatar): number => (av.use >= 0 ? room.spots[av.use]?.lift ?? 0 : 0);

const FILL: Partial<Record<string, { hold: number; secs: number; msg: string }>> = {
  coffee: { hold: HOLD_MUG, secs: 1.8, msg: 'Fresh coffee!' },
  popcorn: { hold: HOLD_POPCORN, secs: 1.2, msg: 'Popcorn!' },
  soda: { hold: HOLD_SODA, secs: 1.2, msg: 'Soda!' },
  hotdog: { hold: HOLD_HOTDOG, secs: 1.5, msg: 'Hot dog!' },
};
// ---------- party games ----------
function gameNow(): GameState | null { const s = roomState[room.id].get('game'); return s?.k === 'game' && live(s.v) ? s.v : null; }
const posOf = (id: string): { x: number; y: number } | null => (id === net.selfId ? { x: me.x, y: me.y } : others.get(id) ?? null);
function hostView(): HostView {
  return { using: (id) => (id === net.selfId ? me.use : others.get(id)?.use ?? null), seatSpots: room.spots.map((s, i) => (s.kind === 'sit' ? i : -1)).filter((i) => i >= 0), pos: posOf };
}
const imIn = (g: GameState): boolean => { const i = g.ids.indexOf(net.selfId); return i >= 0 && (g.kind !== 'chairs' || g.alive.includes(i)); };
// ---------- hide and seek (server-wide, see game/hideseek.ts) ----------
let hs: HideSeek | null = null, hsSent = 0, hsKey = '';
function setHS(h: HideSeek): void { const prev = hs; hs = h; hsSent = now(); net.sendWorld(h); onHS(prev, h); }
function onWorld(e: NetEvent): void {
  if (e.type !== 'world' || !allow(e.id, 'world', 3, 6)) return;
  const w = e.w, live = hsLive(hs, net.selfId);
  // during a round only the seeker's browser speaks for it; between rounds anyone can start one
  // (and a seeker's update also catches up someone who missed the start)
  const ok = live && live.phase !== 'over' ? e.id === live.seeker && w.seeker === live.seeker && w.ts > live.ts : w.phase === 'hide' || e.id === w.seeker;
  if (!ok) return;
  const prev = hs; hs = w; onHS(prev, w);
}
/** Local reactions: sounds, toasts, the seeker being walked back to the Lab. */
function onHS(prev: HideSeek | null, h: HideSeek): void {
  const key = h.seeker + h.phase + h.t0 + ':' + h.found.length;
  if (key === hsKey) return; hsKey = key;
  const seeker = h.seeker === net.selfId, sName = nameIn(h, h.seeker), fresh = !prev || prev.t0 !== h.t0 && prev.phase === 'over' || prev.seeker !== h.seeker;
  if (h.phase === 'hide' && (fresh || prev?.phase !== 'hide')) {
    SFX.join();
    if (seeker) { toast("You're IT! Count to 30 in the Lab, then find everyone", 4500); if (room.id !== 'lab') void enterRoom('lab', null); }
    else toast('HIDE AND SEEK! ' + sName + ' is seeking. Hide anywhere, in any room!', 4500);
  } else if (h.phase === 'seek' && prev?.phase === 'hide') { SFX.siren(); toast(seeker ? 'Ready or not, here you come!' : sName + ' is coming...', 3000); }
  else if (h.phase === 'seek' && prev && h.found.length > prev.found.length) {
    const who = h.ids[h.found[h.found.length - 1]];
    if (who === net.selfId) { SFX.hurt(); toast('You were found!', 3000); } else { SFX.pop(); toast('FOUND: ' + nameIn(h, who), 2000); }
  } else if (h.phase === 'over' && prev?.phase !== 'over') { SFX.score(); if (seeker && h.found.length >= h.ids.length - 1) { lastEmoteAt = -9; emote('joy'); } }
}
/** The seeker is frozen in the Lab while everyone hides. */
const hsFrozen = (): boolean => { const h = hsLive(hs, net.selfId); return !!h && h.phase === 'hide' && h.seeker === net.selfId; };
function hsFrame(): void {
  const h = hsLive(hs, net.selfId);
  const seeking = !!h && h.seeker === net.selfId && h.phase !== 'over';
  for (const o of others.values()) o.hideName = seeking;
  if (!h || h.seeker !== net.selfId) return;
  let next = hsTick(h);
  if (!next && h.phase === 'seek') for (const o of others.values()) if (Math.hypot(o.x - me.x, o.y - me.y) < TAG_DIST) { next = hsFound(h, o.id); if (next) break; }
  if (next) setHS(next);
  else if (h.phase !== 'over' && now() - hsSent > 3) setHS({ ...h, ts: Date.now() }); // keep everyone (and newcomers) in sync
}
function startHide(): void {
  if (hsLive(hs, net.selfId) && hsLive(hs, net.selfId)!.phase !== 'over') { toast('A round is already on!'); return; }
  const people = [{ id: net.selfId, name: me.name }, ...lobby.map((p) => ({ id: p.id, name: p.name }))];
  if (people.length < 2) { toast('Need at least 2 people on this server', 3500); return; }
  setHS(startHS(people));
}

function startGame(kind: 'chairs' | 'tag' | 'hide'): void {
  if (kind === 'hide') { startHide(); return; }
  if (gameNow()) { toast('A game is already on!'); return; }
  const seats = hostView().seatSpots.length, cap = kind === 'chairs' ? Math.min(GAME_MAX, seats + 1) : GAME_MAX;
  const ids = [net.selfId, ...others.keys()].slice(0, cap), names = ids.map((id) => (id === net.selfId ? me.name : others.get(id)?.name ?? '?'));
  if (ids.length < 2) { toast('Need at least 2 players here (friends, or try ?bots=4)', 3500); return; }
  setState({ k: 'game', v: kind === 'tag' ? startTag(net.selfId, ids, names) : startChairs(net.selfId, ids, names) });
  SFX.join();
}
/** Local reactions when a game changes phase (sounds, standing up, toasts). */
function onGamePhase(g: GameState): void {
  const key = g.kind + g.t0 + g.phase + g.it;
  if (key === gameKey) return;
  gameKey = key;
  const mine = g.ids.indexOf(net.selfId);
  if (g.kind === 'chairs') {
    if (g.phase === 'music') { SFX.blip(); if (me.use >= 0 && usingOf(me) === 'sit') leaveSpot(); }
    if (g.phase === 'grab') { SFX.chime(); if (imIn(g)) toast('GRAB A SEAT!', 1500); }
    if (g.phase === 'out' && g.out.includes(mine)) { SFX.leave(); toast("You're out! Watch the rest from the side", 3000); }
  } else if (g.kind === 'tag' && g.phase === 'play' && g.ids[g.it] === net.selfId) { SFX.huh(); toast("You're IT! Tag someone", 2000); }
  if (g.phase === 'over') { SFX.score(); if (winner(g) === mine) { lastEmoteAt = -9; emote('joy'); } }
}
function syncGameBar(text: string): void {
  const el = $('#gamebar'); if (el.textContent !== text) { el.textContent = text; el.classList.toggle('on', !!text); }
}

function useSpot(i: number): void {
  const s = room.spots[i], t = now();
  if (!s) return;
  if (busy.has(i)) { toast('Someone is already there'); return; }
  if (s.kind === 'party') { startGame(s.game ?? 'chairs'); return; }
  const g = gameNow();
  if (g?.kind === 'chairs' && s.kind === 'sit' && imIn(g)) {
    if (g.phase !== 'grab') { toast('Keep moving until the music stops!'); return; }
    if (!g.seats.includes(i)) { toast('That seat is not in the game: find a glowing one!'); return; }
  }
  tapTarget = null; me.pose = 0;
  if (s.kind === 'juke' && room.music) { // instant: next track for everyone in the room
    const mu = room.music, cur = mu.current().n, n = cur + 1 >= mu.tracks.length ? -1 : cur + 1;
    setState({ k: 'juke', v: { n, t0: Date.now() / 1000 } });
    toast(n < 0 ? 'Music off' : 'NOW PLAYING: ' + mu.tracks[n].name + (soundOn ? '' : ' (turn Sound on to hear it)'), 3200); SFX.blip();
    return;
  }
  if (s.kind === 'treat') { knock(s.n ?? 0); return; }
  if (s.kind === 'bed') { tendBed(s.n ?? 0); return; }
  if (s.kind === 'boat') { if (me.pose === POSE_BOAT) land(); else { me.pose = POSE_BOAT; me.x = DOCK.launch.x; me.y = DOCK.launch.y; me.dir = 1; forceSend = true; SFX.pour(); toast(isTouch ? 'Tap the water to row. Row back to the dock to get out' : 'WASD to row. Row back to the dock and press E to get out', 4000); } return; }
  if (s.kind === 'kite') { if (me.hold === HOLD_KITE) { me.hold = 0; toast('Kite back on the stand'); } else { me.hold = HOLD_KITE; me.sips = 0; toast('Up it goes! It flies on the wind. Q to put it away', 3500); SFX.chime(); } forceSend = true; return; }
  if (s.kind === 'sand') { SFX.blip(); openSandbox(() => PARK_INFO.sand, (v) => setState({ k: 'sand', v }), () => input.clear()); return; }
  if (s.kind === 'candle') { candle(s.n ?? 0); return; }
  if (s.kind === 'rack' && DEN_INFO.build.ok) { toast('All green. Nothing to fix!'); return; }
  if (s.kind === 'marsh') { me.hold = HOLD_MARSH; me.sips = 0; roast = 0; forceSend = true; SFX.pop(); toast('Hold it near the fire to toast it. Not too long!', 3500); return; }
  if (s.kind === 'chest' && !CRYPT_INFO.open) { toast('Sealed. Three stones must be pressed at once...', 3000); return; }
  if (s.kind === 'fireworks') {
    const cur = showStart();
    if (cur) { toast('Wait for this show to finish!'); return; }
    setState({ k: 'fw', v: { t0: Date.now() / 1000, seed: Math.floor(Math.random() * 999) } }); toast('Stand back!'); SFX.zap();
    return;
  }
  if (s.kind === 'deploy') {
    const b = DEN_INFO.build, d = DEN_INFO.deploy;
    if (!b.ok) { toast("Can't deploy: the build is red! Fix it at the server rack first"); SFX.hurt(); return; }
    if (d && Date.now() / 1000 - d.t0 < 6) return;
    const ok = Math.random() > 0.15;
    setState({ k: 'deploy', v: { t0: Date.now() / 1000, ok, by: me.name } });
    setState({ k: 'build', v: { ...b, ok, dep: b.dep + (ok ? 1 : 0) } });
    if (ok) { SFX.score(); say(net.selfId, 'SHIPPED IT!', t, true); lastEmoteAt = -9; emote('joy'); } else { SFX.siren(); SFX.boom(); say(net.selfId, 'uh oh.', t, true); lastEmoteAt = -9; emote('huh'); }
    return;
  }
  me.use = i; me.useT0 = t; me.x = s.x; me.y = s.y; me.moving = false; input.clear();
  forceSend = true;
  const fill = FILL[s.kind];
  if (s.kind === 'sit') SFX.sit();
  else if (fill) { fillEnd = t + fill.secs; if (s.kind === 'coffee') SFX.brew(); else if (s.kind === 'soda') SFX.pour(); else SFX.pop(); }
  else if (s.kind === 'arcade') openArcade(Math.max(save.data.hi, roomHi()?.score ?? 0), endArcade);
  else if (s.kind === 'claw') openClawMachine(i);
  else if (s.kind === 'pong') startPong(i);
  else if (s.kind === 'decor') {
    SFX.blip();
    openDesk(me.look.desk ?? 0, (bits) => { me.look = { ...me.look, desk: bits }; net.updateMe(peerState()); }, () => { applyProfile(me.name, me.look); input.clear(); if (me.use === i) leaveSpot(); });
  }
  else if (s.kind === 'prizes') { SFX.blip(); openPrizes(wearItem, () => { input.clear(); if (me.use === i) leaveSpot(); }); }
  else if (s.kind === 'board') openBoard((d) => net.sendDraw(d), () => { input.clear(); if (me.use === i) leaveSpot(); });
  else if (s.kind === 'booth') { booth = { t0: t, next: 0, emoted: -1, frames: [] }; toast('Smile! 3 photos coming up'); }
  else if (s.kind === 'desk') { SFX.sit(); openCode(); }
  else if (s.kind === 'kanban') openKanban(() => DEN_INFO.notes, (notes) => setState({ k: 'notes', v: notes }), () => { input.clear(); if (me.use === i) leaveSpot(); });
  else if (s.kind === 'rack') { fixEnd = t + 3; SFX.blip(); toast('Fixing the build...'); }
  else if (s.kind === 'scope') openStars(() => { input.clear(); if (me.use === i) leaveSpot(); });
  else if (s.kind === 'hammock') SFX.sit();
  else if (s.kind === 'fish') { fishing = { bite: t + 3 + Math.random() * 6, state: 'wait' }; SFX.zap(); toast(isTouch ? 'Wait for a bite, then tap REEL!' : 'Wait for a bite, then press E to REEL!', 3000); }
  else if (s.kind === 'instrument') toast(isTouch ? 'Tap the pads to play' : 'Keys 1-8 play notes. Walk away to stop', 3000);
  else if (s.kind === 'chest') {
    leaveSpot();
    const first = save.unlock('hat:5');
    applyProfile(me.name, { ...me.look, hat: 5 });
    SFX.score(); lastEmoteAt = -9; emote('joy');
    toast(first ? 'You found the CROWN! It is yours now (Look menu)' : 'The crown suits you', 4000);
  }
}
// ---------- the Rooftop garden (world/garden.ts) ----------
let gardenBusy = false;
function refreshGarden(bump = false): void {
  GARDEN.dirty = false; GARDEN.fetchedAt = Date.now();
  net.plots().then((ps) => { GARDEN.plots = ps; }).catch((e) => console.warn('[garden]', e));
  if (bump) setState({ k: 'garden', v: { n: Date.now() } }); // tell everyone else on the roof to look again
}
function gardenDo<T>(act: () => Promise<T>, ok: (r: T) => void): void {
  if (gardenBusy) return; gardenBusy = true;
  act().then((r) => { ok(r); refreshGarden(true); }).catch((e: unknown) => { const m = e instanceof Error ? e.message : String(e); toast(m[0].toUpperCase() + m.slice(1), 3500); SFX.hurt(); refreshGarden(); }).finally(() => { gardenBusy = false; });
}
function waterBed(n: number): void {
  gardenDo(() => net.water(n), (r) => { setTokens(r.tokens); GARDEN.splash.set(n, now()); SFX.pour(); toast(r.thanked ? 'Watered! +1 token for helping out' : 'Watered! It grows faster for 3 hours', 3000); if (r.thanked) floaters.push({ x: me.x, y: me.y - 50, t0: now(), text: '+1' }); });
}
function tendBed(n: number): void {
  const p = GARDEN.plots.find((q) => q.bed === n), mine = GARDEN.plots.find((q) => q.owner === net.selfId && !plantState(q).dead);
  if (!p || plantState(p).dead) {
    if (mine) { toast('You already have a ' + SEEDS[mine.seed].name + ' growing (bed ' + (mine.bed + 1) + ')', 3500); return; }
    SFX.blip();
    openSeeds(n, myTokens, save.has('seed:4'), (seed) => gardenDo(() => net.plant(n, seed), (bal) => {
      setTokens(bal); if (seed === 4) { save.inv.delete('seed:4'); }
      SFX.pop(); toast('Planted a ' + SEEDS[seed].name + '! Ask friends to water it', 3500);
    }), () => input.clear());
    return;
  }
  if (p.owner === net.selfId) {
    openMyPlant(p, {
      water: () => waterBed(n),
      harvest: () => gardenDo(() => net.harvest(n), (r) => {
        setTokens(r.tokens); SFX.score(); lastEmoteAt = -9; emote('joy');
        const s = SEEDS[r.seed]; floaters.push({ x: me.x, y: me.y - 50, t0: now(), text: '+' + s.pays });
        const first = !save.data.crops.includes(s.name); if (first) save.update((d) => { d.crops.push(s.name); });
        toast('Harvested your ' + s.name + '! +' + s.pays + ' tokens' + (first ? ' · NEW CROP ' + save.data.crops.length + '/' + SEEDS.length : ''), 4000);
        if (r.bonus) { save.addPrize(r.bonus); setTimeout(() => { toast('You found a rare MOONFLOWER seed in the soil! Plant it in any free bed', 5000); SFX.chime(); }, 1800); }
      }),
      digUp: () => gardenDo(() => net.digUp(n), () => toast('Dug up. The bed is free again', 2500)),
    }, () => input.clear());
    return;
  }
  if (plantState(p).wet) { toast(plantLine(p, false), 3500); return; }
  waterBed(n);
}

// ---------- the Subway (world/subway.ts): sounds that follow the clock-run train ----------
let trainKey = '', lastClack = 0;
function subwaySounds(): void {
  const tr = train(), key = tr.at + tr.phase, t = now(), here = STATIONS.findIndex((st) => st.room === room.id), mine = room.id === 'train' || tr.at === here;
  if (key !== trainKey) {
    const first = trainKey === ''; trainKey = key;
    if (!first && tr.phase === 'open' && mine) SFX.dingdong();
    if (!first && tr.phase === 'out' && mine) { SFX.blip(); if (room.id !== 'train') toast('Doors closing! Next train in about a minute', 2500); }
    if (!first && room.id === 'train' && tr.phase === 'in') toast('Now arriving: ' + STATIONS[tr.at].name, 2500);
  }
  if (room.id === 'train' && tr.phase === 'ride' && t - lastClack > 0.55) { lastClack = t; SFX.clack(); }
}

// ---------- Halloween (world/halloween.ts) ----------
let ghostUntil = 0, knocking = false, lastHowl = -1;
async function refreshSeason(): Promise<void> {
  let s = params.get('season');
  if (!s) { try { s = await net.season(); } catch { s = null; } }
  setSeason(s);
  if (isHalloween()) installHalloween(ROOMS);
}
/** Trick or treat at door n: the server pays (or tricks you into a ghost for a minute). */
function knock(n: number): void {
  if (knocking) return; knocking = true;
  SFX.door(); me.dir = me.x < TREAT_DOORS[n].x ? 1 : -1;
  net.trickOrTreat(n).then((r) => {
    markKnocked(n); setTokens(r.tokens);
    if (r.trick) { me.pose = POSE_GHOST; ghostUntil = now() + 60; forceSend = true; SFX.boo(); toast('TRICK! You are a ghost for a minute. Boo! (' + r.visited + '/8 doors today)', 4000); }
    else { SFX.chime(); floaters.push({ x: me.x, y: me.y - 50, t0: now(), text: '+1' }); toast('TREAT! +1 token (' + r.visited + '/8 doors today)', 3000); }
    if (r.prize === 'tokens:5') toast('ALL 8 DOORS! You have every costume already, so +5 tokens', 5000);
    else if (r.prize) { save.addPrize(r.prize); SFX.score(); lastEmoteAt = -9; emote('joy'); toast('ALL 8 DOORS! You got the ' + itemName(r.prize) + '! (Look menu)', 6000); }
  }).catch((e: unknown) => { const m = e instanceof Error ? e.message : String(e); if (/already/.test(m)) markKnocked(n); toast(m[0].toUpperCase() + m.slice(1), 3000); })
    .finally(() => { knocking = false; });
}
/** The haunted Crypt's candles: today's order is on the old scroll. */
function candle(n: number): void {
  const res = lightCandle(n);
  if (res === 'lit') return;
  if (res === 'wrong') { SFX.boo(); toast('The candles gutter out... a cold laugh echoes. Check the scroll!', 3500); return; }
  SFX.zap();
  if (res === 'solved') {
    SFX.score(); lastEmoteAt = -9; emote('joy');
    const first = save.unlock('hat:12');
    toast(first ? 'The crypt sighs... you earned the PUMPKIN HEAD! (Look menu)' : 'The candles burn bright. The crypt is pleased.', 5000);
  }
}
/** The SLOP INVADERS high score of the cabinet you're at (the Lab's or the Arcade's). */
const roomHi = () => (room.id === 'arcade' ? ARCADE_INFO.hi : LAB_INFO.hi);
/** Put on a hat / face item / outfit / pet you own ('slot:index'). */
function wearItem(item: string): void { applyProfile(me.name, withItem(me.look, item)); lastEmoteAt = -9; emote('joy'); }
function openClawMachine(i: number): void {
  openClaw({
    play: async () => { const r = await net.playClaw(); setTokens(r.tokens); return r; },
    look: () => me.look,
    wear: wearItem,
    started: () => { ARCADE_INFO.clawT = now(); lastEmoteAt = -9; emote('wow'); },
    won: (r) => { if (!r.dupe) { save.addPrize(r.item); setState({ k: 'claw', v: { name: me.name, item: r.item } }); } },
    onClose: () => { input.clear(); if (me.use === i) leaveSpot(); },
  });
}
let pong: PongHandle | null = null;
function startPong(i: number): void {
  const side = (PONG_SPOTS[0] === i ? 0 : 1) as 0 | 1, other = PONG_SPOTS[1 - side];
  pong = openPong({
    side, myName: me.name,
    opponent: () => { for (const o of others.values()) if (o.use === other) return { id: o.id, name: o.name }; return null; },
    send: (p) => { net.sendPong(p); pongSeen(p); },
    over: (winner) => {
      const ch = ARCADE_INFO.champ;
      setState({ k: 'champ', v: { name: winner, wins: ch && ch.name === winner ? ch.wins + 1 : 1 } });
      if (winner === me.name) { lastEmoteAt = -9; emote('joy'); }
    },
    onClose: () => { pong = null; input.clear(); if (me.use === i) leaveSpot(); },
  });
}
function leaveSpot(): void {
  const s = room.spots[me.use];
  if (s) { me.x = s.sx; me.y = s.sy; }
  me.use = -1; me.stopT = now(); forceSend = true;
}
function endArcade(score: number): void {
  input.clear();
  if (me.use >= 0 && usingOf(me) === 'arcade') leaveSpot();
  if (score <= 0) return;
  const roomBest = roomHi()?.score ?? 0;
  if (score > save.data.hi) save.update((d) => { d.hi = score; });
  if (score > roomBest) { setState({ k: 'hi', v: { name: me.name, score } }); say(net.selfId, 'NEW HI SCORE: ' + score + '!', now(), true); SFX.score(); emote('joy'); }
  else say(net.selfId, 'SCORE: ' + score, now(), true);
}
/** Sip / eat whatever's in your hand. */
function useItem(): void {
  if (me.hold === HOLD_KITE) { me.hold = 0; forceSend = true; toast('Kite back on the stand'); return; }
  if (!me.hold || me.emote) return;
  if (emote(useEmote(me.hold))) me.sips++;
}
/** The typing game at a desk; finishing makes a commit (which might break the build). */
function openCode(): void {
  openTyping((msg) => {
    const b = DEN_INFO.build, breaks = b.ok && Math.random() < 0.2;
    setState({ k: 'build', v: { ok: b.ok && !breaks, n: b.n + 1, dep: b.dep, by: me.name, id: net.selfId, msg } });
    say(net.selfId, "git commit -m '" + msg + "'", now(), true); SFX.commit();
    if (breaks) setTimeout(() => { SFX.siren(); toast('You broke the build! Fix it at the server rack', 3500); }, 700);
  }, () => input.clear());
}
function talkToTalker(tk: Talker): void {
  say(tk.id, tk.lines[Math.floor(Math.random() * tk.lines.length)], now(), false);
  if (tk.id === 'den-duck') { DEN_INFO.duckT = now(); SFX.squeak(); } else SFX.chat();
}
function nearestTalker(maxD: number): Talker | null {
  let best: Talker | null = null, bd = maxD;
  for (const tk of room.talkers ?? []) { const d = Math.hypot(tk.sx - me.x, (tk.sy - me.y) * 1.5); if (d < bd) { bd = d; best = tk; } }
  return best;
}
/** Click a player: mute or unmute them (this session), or wave at them. */
function playerCard(o: Avatar): void {
  const m = openModal(o.name, () => input.clear());
  const mute = button(muted.has(o.id) ? 'UNMUTE' : 'MUTE', () => { if (muted.has(o.id)) muted.delete(o.id); else { muted.add(o.id); dropBubble(o.id); } toast((muted.has(o.id) ? 'Muted ' : 'Unmuted ') + o.name); m.close(); });
  const wave = button('WAVE', () => { me.dir = o.x < me.x ? -1 : 1; lastEmoteAt = -9; emote('wave'); m.close(); }, true);
  const note = document.createElement('div'); note.textContent = 'Muting hides their chat and emote sounds for you only.';
  Object.assign(note.style, { fontFamily: "'VT323', monospace", fontSize: '18px', color: '#9FEFFF', maxWidth: '300px', textAlign: 'center' });
  const report = button('REPORT', () => {
    note.textContent = 'Report ' + o.name + ' for:';
    const send = (why: string) => { m.close(); net.report(o.id, why).then(() => toast('Thanks. A moderator will look at it.')).catch((e: unknown) => toast(e instanceof Error ? e.message : 'Could not report')); };
    m.body.replaceChildren(note, row(button('BEING RUDE', () => send('rude')), button('SPAM', () => send('spam')), button('CHEATING', () => send('cheating')), button('CANCEL', m.close, true)));
  }, true);
  const follow = button(following === o.id ? 'STOP FOLLOWING' : 'FOLLOW', () => {
    m.close();
    if (following === o.id) { following = null; toast('Stopped following ' + o.name); return; }
    const h = hsLive(hs, net.selfId); if (h && h.phase !== 'over') { toast('No following during hide and seek!'); return; }
    following = o.id; followT = 0; toast('Following ' + o.name + ' (walk to stop)', 2500); SFX.blip();
  }, true);
  m.body.append(note, row(wave, follow, mute, report, button('CLOSE', m.close, true)));
}
// ---------- follow a player (even through doors) ----------
let following: string | null = null, followT = 0;
function followStep(t: number): void {
  if (!following || !playing || switching) return;
  const h = hsLive(hs, net.selfId); if (h && h.phase !== 'over') { following = null; return; }
  const o = others.get(following);
  if (o) {
    const tx = clamp(o.x - o.dir * 26, room.floor.x0, room.floor.x1), ty = clamp(o.y + 4, room.floor.y0, room.floor.y1);
    if (Math.hypot(tx - me.x, ty - me.y) > 34 && t - followT > 0.5 && me.use < 0) {
      followT = t; const path = routeTo(room, me.x, me.y, tx, ty);
      tapTarget = { x: path[0][0], y: path[0][1], door: null, stuck: 0, spot: -1, npc: null, tk: null, path: path.slice(1) };
    }
    return;
  }
  // they left the room: go where they went
  const p = lobby.find((q) => q.id === following);
  if (p && p.room !== room.id) { if (t - followT > 1) { followT = t; toast('Following ' + p.name + ' to ' + ROOMS[p.room].title, 2000); SFX.door(); void enterRoom(p.room, null); } }
  else if (!p && t - followT > 4) { following = null; toast('Lost them'); }
}
// ---------- high five: two waves side by side ----------
const hi5 = new Map<string, number>();
function highFive(a: Avatar): void {
  const t = now();
  for (const b of [me, ...others.values()]) {
    if (b === a || b.emote?.kind !== 'wave' || t - b.emote.t0 > 1.2 || Math.hypot(a.x - b.x, a.y - b.y) > 46) continue;
    const key = [a.id, b.id].sort().join('|'); if (t - (hi5.get(key) ?? -9) < 3) continue;
    hi5.set(key, t);
    floaters.push({ x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 44, t0: t, text: 'HIGH FIVE!' });
    SFX.clap(); if (a === me || b === me) SFX.score();
  }
}
/** The live slop blob nearest to (x, y), if the invasion is on and we're in the Square. */
function slopTarget(x: number, y: number, maxD: number): { i: number; x: number; y: number } | null {
  const sw = room.id === 'plaza' ? slopWave() : null; if (!sw) return null;
  let best: { i: number; x: number; y: number } | null = null, bd = maxD;
  for (let i = 0; i < SLOP_N; i++) {
    if (slopHits.has(i)) continue;
    const b = blob(sw.w, i, sw.u); if (b.state !== 'crawl' && b.state !== 'fall') continue;
    const d = Math.hypot(b.x - x, (b.y - b.z - y) * 1.2); if (d < bd) { bd = d; best = { i, x: b.x, y: b.y - b.z }; }
  }
  return best;
}
function throwAt(tg: { i: number; x: number; y: number }): void {
  const sw = slopWave(); if (!sw) return;
  const t = now(); me.dir = tg.x < me.x ? -1 : 1;
  mugs.push({ x0: me.x + me.dir * 8, y0: me.y - 22, x1: tg.x, y1: tg.y - 6, t0: t });
  slopHits.set(tg.i, { t: t + 0.35, x: tg.x, y: tg.y });
  const cur = roomState.plaza.get('slop'), dead = cur?.k === 'slop' && cur.v.w === sw.w ? cur.v.dead : [];
  setState({ k: 'slop', v: { w: sw.w, dead: [...new Set([...dead, tg.i])] } });
  SFX.zap(); setTimeout(() => SFX.pop(), 350);
}
/** Play pad n on the instrument you're at: hear it now, send it to the room. */
function playNote(n: number): void {
  const s = room.spots[me.use]; if (!s || s.kind !== 'instrument') return;
  const i = s.inst ?? 0;
  playPad(i, n); net.sendNote(i, n); me.noteT = now(); stageNote(i, n); noteSpark(me, i);
}
const sparks: { x: number; y: number; t0: number; c: [number, number, number] }[] = [];
function noteSpark(av: Avatar, i: number): void {
  sparks.push({ x: av.x + (Math.random() - 0.5) * 16, y: av.y - liftOf(av) - 36, t0: now(), c: INST_COL[i] as [number, number, number] });
  if (sparks.length > 60) sparks.shift();
}
const pad = document.createElement('div'); pad.id = 'pad';
const PAD_LABELS = [['C', 'D', 'E', 'G', 'A', 'C', 'D', 'E'], ['KICK', 'SNARE', 'HAT', 'OPEN', 'TOM', 'TOM', 'CLAP', 'CRASH'], ['C', 'D', 'E', 'G', 'A', 'C', 'D', 'E'], ['LA', 'LA', 'LA', 'LA', 'LA', 'LA', 'LA', 'LA']];
let padShown = -1;
function syncPad(): void {
  const s = me.use >= 0 ? room.spots[me.use] : undefined, i = s?.kind === 'instrument' ? s.inst ?? 0 : -1;
  if (i === padShown) return;
  padShown = i; pad.style.display = i < 0 ? 'none' : ''; document.body.classList.toggle('jamming', i >= 0);
  if (i < 0) return;
  pad.replaceChildren(...PAD_LABELS[i].map((lab, n) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pill'; const k = document.createElement('kbd'); k.textContent = String(n + 1); b.append(k, ' ' + lab); b.style.boxShadow = '0 0 0 2px ' + ['#5FE7FF', '#FFD65A', '#FF5FD2', '#7CF29C'][i]; b.addEventListener('pointerdown', (e) => { e.preventDefault(); playNote(n); }); return b; }));
  const t = document.createElement('span'); t.className = 'pill quiet'; t.textContent = INSTRUMENTS[i]; pad.prepend(t);
}
function reel(): void {
  if (!fishing || fishing.state !== 'bite') return;
  const c = catchFish();
  say(net.selfId, (c.fish.rarity === 'JUNK' ? 'ugh, a ' : 'caught a ') + c.fish.name + ' (' + c.cm + 'cm)!', now(), true);
  toast((c.isNew ? 'NEW! ' : '') + c.fish.rarity + ' · FISH LOG ' + c.count + '/12', 3000);
  if (c.fish.rarity === 'LEGENDARY' || c.fish.rarity === 'RARE') { SFX.score(); lastEmoteAt = -9; emote('joy'); } else SFX.chime();
  fishing = { bite: now() + 2.5 + Math.random() * 6, state: 'wait' };
}
/** Rowing: get out at the dock. */
function land(): void {
  if (Math.hypot(me.x - DOCK.launch.x, me.y - DOCK.launch.y) > 44) { toast('Row back to the dock to get out', 2500); return; }
  me.pose = 0; me.x = DOCK.x; me.y = DOCK.y + 12; forceSend = true; SFX.step(); toast('Back on dry land', 1500);
}
/** Throw some seeds on the pond: the ducks come paddling over. */
function feedDucks(): void {
  if (!emote('feed')) return;
  const ex = me.x + me.dir * 40, ey = me.y;
  const k = 0.82 / Math.max(0.82, Math.sqrt(((ex - POND.x) / POND.rx) ** 2 + ((ey - POND.y) / POND.ry) ** 2));
  PARK_INFO.feed = { x: POND.x + (ex - POND.x) * k, y: POND.y + (ey - POND.y) * k, t: now() };
}
function feed(): void {
  if (!emote('feed')) return;
  ambient.feed(me.x + me.dir * 30, me.y, now());
  save.update((d) => { d.feeds++; });
  if (save.data.feeds >= 5 && !owns('pet', 1)) setTimeout(() => {
    if (!save.unlock('pet:1')) return;
    applyProfile(me.name, { ...me.look, pet: 1 }); SFX.coo(); SFX.score();
    toast('A pigeon has taken a liking to you! It follows you now (PET in the Look menu)', 4500);
  }, 1500);
}
function setPose(p: number): void {
  if (me.pose === POSE_BOAT) return; // no dancing in a rowing boat
  if (!playing || editing || modalOpen()) return;
  if (me.use >= 0) leaveSpot();
  me.pose = me.pose === p ? 0 : p; me.poseT0 = now(); forceSend = true;
  if (me.pose === POSE_DANCE) SFX.joy(); else if (me.pose === POSE_FLOOR) SFX.sit();
}
function talkTo(n: Npc): void {
  npcs.talk(n, me.x, now());
  me.dir = n.av.x < me.x ? -1 : 1;
  SFX.chat();
}
function nearestNpc(maxD: number): Npc | null {
  let best: Npc | null = null, bd = maxD;
  for (const n of npcs.inRoom(room.id)) { const d = Math.hypot(n.av.x - me.x, (n.av.y - me.y) * 1.5); if (d < bd) { bd = d; best = n; } }
  return best;
}
function nearestSpot(maxD: number): number {
  let best = -1, bd = maxD;
  room.spots.forEach((s, i) => { if (busy.has(i)) return; const d = Math.hypot(s.sx - me.x, s.sy - me.y); if (d < bd) { bd = d; best = i; } });
  return best;
}

interface Action { label: string; run: () => void; at: [number, number] | null }
/** The one thing E / the action button does right now, and where to float its hint. */
function currentAction(): Action | null {
  if (!playing || editing || switching) return null;
  if (me.pose === POSE_BOAT) return Math.hypot(me.x - DOCK.launch.x, me.y - DOCK.launch.y) < 44 ? { label: 'GET OUT', run: land, at: null } : null;
  if (me.use >= 0) {
    const k = usingOf(me);
    if (k === 'fish') return fishing?.state === 'bite' ? { label: 'REEL!', run: reel, at: null } : { label: 'STOP FISHING', run: () => { fishing = null; leaveSpot(); }, at: null };
    return k === 'sit' || k === 'hammock' ? { label: 'STAND', run: leaveSpot, at: null } : k === 'instrument' ? { label: 'STEP DOWN', run: leaveSpot, at: null } : k === 'desk' ? { label: 'CODE', run: openCode, at: null } : null;
  }
  const sl = slopTarget(me.x, me.y - 16, 170);
  if (sl) return { label: 'THROW', run: () => throwAt(sl), at: [sl.x, sl.y - 18] };
  const n = nearestNpc(30);
  if (n) return { label: 'TALK', run: () => talkTo(n), at: [n.av.x, n.av.y - liftOf(n.av) - 48] };
  const tk = nearestTalker(26);
  if (tk) return { label: 'TALK', run: () => talkToTalker(tk), at: [tk.x, tk.y - 14] };
  const i = nearestSpot(20);
  if (i >= 0) { const s = room.spots[i]; return { label: s.label, run: () => useSpot(i), at: s.kind === 'sit' ? [s.x, s.y - s.lift - 44] : [(s.area.x0 + s.area.x1) / 2, s.area.y0 - 8] }; }
  if (room.id === 'plaza' && ambient.pigeonNear(me.x + me.dir * 20, me.y, 110)) return { label: 'FEED', run: feed, at: null };
  if (room.id === 'park' && pondEdge(me.x, me.y) < 26) return { label: 'FEED DUCKS', run: feedDucks, at: null };
  return null;
}
let actNow: Action | null = null;
const actBtn = document.createElement('button'), sipBtn = document.createElement('button');
actBtn.type = sipBtn.type = 'button'; actBtn.className = sipBtn.className = 'pill act';
actBtn.style.display = sipBtn.style.display = 'none';
actBtn.addEventListener('click', () => actNow?.run());
sipBtn.addEventListener('click', useItem);
let actShown = '', sipShown = '';
function syncActionBar(): void {
  const label = actNow?.label ?? '';
  if (label !== actShown) {
    actShown = label; actBtn.style.display = label ? '' : 'none';
    const k = document.createElement('kbd'); k.textContent = 'E'; actBtn.replaceChildren(k, ' ' + label);
  }
  const s = me.hold && playing ? (me.hold === HOLD_KITE ? 'PUT AWAY' : useEmote(me.hold) === 'eat' ? 'EAT' : 'SIP') : '';
  if (s !== sipShown) {
    sipShown = s; sipBtn.style.display = s ? '' : 'none';
    const k = document.createElement('kbd'); k.textContent = 'Q'; sipBtn.replaceChildren(k, ' ' + s);
  }
  for (const [p, b] of poseBtns) b.setAttribute('aria-pressed', String(me.pose === p));
}
const emoteBar = $('#emotes');
emoteBar.append(actBtn, sipBtn);
$('#bar').prepend(pad); pad.style.display = 'none';
for (const em of EMOTES) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'pill emo';
  const k = document.createElement('kbd'); k.textContent = em.key;
  b.append(k, ' ' + em.label);
  b.addEventListener('click', () => emote(em.kind));
  emoteBar.appendChild(b);
}
// the emote wheel: R (or MORE) opens 8 more emotes in a ring
const wheel = document.createElement('div'); wheel.id = 'wheel';
function openWheel(): void {
  if (!playing || editing || modalOpen()) return;
  const all = narrow();
  const opts: { label: string; key: string; run: () => void }[] = [
    ...(all ? [...EMOTES.map((em) => ({ label: em.label, key: em.key, run: () => emote(em.kind) })), { label: 'DANCE', key: '6', run: () => setPose(POSE_DANCE) }, { label: 'SIT', key: '7', run: () => setPose(POSE_FLOOR) }] : []),
    ...WHEEL.map((kind, i) => ({ label: ALL_EMOTES.find((e) => e.kind === kind)?.label ?? kind, key: all ? '' : String(i + 1), run: () => emote(kind) })),
  ];
  wheel.classList.toggle('grid', all);
  wheel.replaceChildren(...opts.map((o, i) => {
    const an = -Math.PI / 2 + (i / opts.length) * Math.PI * 2, b = document.createElement('button');
    b.type = 'button'; b.className = 'pill wbtn';
    if (!all) { b.style.left = 'calc(50% + ' + Math.round(Math.cos(an) * 120) + 'px)'; b.style.top = 'calc(50% + ' + Math.round(Math.sin(an) * 100) + 'px)'; }
    if (o.key) { const k = document.createElement('kbd'); k.textContent = o.key; b.append(k, ' '); }
    b.append(o.label);
    b.addEventListener('click', (e) => { e.stopPropagation(); closeWheel(); o.run(); });
    return b;
  }));
  wheel.classList.add('on');
}
const closeWheel = (): void => { wheel.classList.remove('on'); };
wheel.addEventListener('click', closeWheel);
$('#stage').appendChild(wheel);
// toggles that last until you move: 6 dance, 7 sit on the floor
const poseBtns: [number, HTMLButtonElement][] = ([[POSE_DANCE, '6', 'DANCE'], [POSE_FLOOR, '7', 'SIT']] as [number, string, string][]).map(([p, key, label]) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'pill emo';
  const k = document.createElement('kbd'); k.textContent = key; b.append(k, ' ' + label);
  b.addEventListener('click', () => setPose(p)); emoteBar.appendChild(b);
  return [p, b];
});
{ const b = document.createElement('button'); b.type = 'button'; b.className = 'pill more'; const k = document.createElement('kbd'); k.textContent = 'R'; const l = document.createElement('span'); l.className = 'lbl-more'; b.append(k, l); b.addEventListener('click', openWheel); emoteBar.appendChild(b); }
input.onKey = (e) => {
  if (!playing || editing || modalOpen() || isTyping(e)) return;
  if (wheel.classList.contains('on')) { if (e.key === 'Escape' || e.key === 'r' || e.key === 'R') closeWheel(); else if (e.key >= '1' && e.key <= '8') { closeWheel(); emote(WHEEL[Number(e.key) - 1]); } return; }
  if (e.key === 'r' || e.key === 'R') { openWheel(); return; }
  if (e.key === 'Enter') { e.preventDefault(); chatEl.focus(); return; }
  if (e.key === 'e' || e.key === 'E') { if (actNow) actNow.run(); else useItem(); return; }
  if (e.key === 'q' || e.key === 'Q') { useItem(); return; }
  if (usingOf(me) === 'instrument' && e.key >= '1' && e.key <= '8') { playNote(Number(e.key) - 1); return; }
  if (e.key === '6') { setPose(POSE_DANCE); return; }
  if (e.key === '7') { setPose(POSE_FLOOR); return; }
  const em = EMOTES.find((x) => x.key === e.key);
  if (em) emote(em.kind);
};

// ---------- HUD buttons ----------
const sndBtn = $<HTMLButtonElement>('#snd');
function syncSnd(): void { sndBtn.setAttribute('aria-pressed', String(soundOn)); sndBtn.textContent = soundOn ? 'Sound on' : 'Sound off'; }
sndBtn.addEventListener('click', () => { setSound(!soundOn); syncSnd(); if (soundOn) SFX.chime(); });

let start: StartScreen;
$('#lookBtn').addEventListener('click', async () => {
  if (!playing || editing) return;
  editing = true; input.clear();
  start.setName(me.name); start.setLook(me.look);
  const res = await start.open(true);
  applyProfile(res.name, res.look);
  editing = false;
});
function applyProfile(name: string, look: Look): void {
  me.name = name; me.look = look;
  net.updateMe(peerState()); net.setLobby(name, room.id);
  void net.saveProfile(name, look);
}

// ---------- local player ----------
function updateMe(dt: number): void {
  if (!playing || editing || switching) return;
  if (modalOpen() || hsFrozen()) { input.tap = null; me.moving = false; sendNet(now()); return; }
  doorCooldown = Math.max(0, doorCooldown - dt);
  const f = room.floor, t = now();
  if (following && (input.tap || input.axis().x || input.axis().y)) { following = null; toast('Stopped following'); }
  if (input.tap) {
    const [wx, wy] = R.toWorld(input.tap.x, input.tap.y);
    input.tap = null;
    const d = room.doors.find((dd) => inside(dd.area, wx, wy) && doorDest(dd)) ?? null;
    let npc: Npc | null = null, spot = -1;
    const tk = d ? null : (room.talkers ?? []).find((q) => Math.abs(q.x - wx) < 10 && Math.abs(q.y - wy) < 10) ?? null;
    const hitBlob = d ? null : slopTarget(wx, wy, 16);
    if (hitBlob && Math.hypot(hitBlob.x - me.x, hitBlob.y - me.y) < 260) { throwAt(hitBlob); return; }
    const other = d || tk ? null : [...others.values()].find((o) => { const oy = o.y - liftOf(o); return Math.abs(o.x - wx) < 12 && wy > oy - 36 && wy < oy + 4; }) ?? null;
    if (other) { playerCard(other); return; }
    if (!d && !tk) npc = npcs.inRoom(room.id).find((n) => { const ny = n.av.y - liftOf(n.av); return Math.abs(n.av.x - wx) < 14 && wy > ny - 40 && wy < ny + 4; }) ?? null;
    if (!d && !npc && !tk) { let bd = 1e9; room.spots.forEach((s, i) => { if (i !== me.use && !busy.has(i) && inside(s.area, wx, wy) && Math.abs(s.x - wx) < bd) { bd = Math.abs(s.x - wx); spot = i; } }); }
    const ownSeat = me.use >= 0 && !d && !npc && !tk && spot < 0 && inside(room.spots[me.use].area, wx, wy);
    if (!ownSeat) {
      if (me.use >= 0) { if (FILL[usingOf(me) ?? '']) toast('Cancelled'); if (usingOf(me) === 'booth') booth = null; leaveSpot(); }
      let tx = clamp(wx, f.x0, f.x1), ty = clamp(wy, f.y0, f.y1);
      if (d) { tx = (d.trigger.x0 + d.trigger.x1) / 2; ty = d.trigger.y0 + 1; }
      else if (npc) { tx = clamp(npc.av.x + (me.x < npc.av.x ? -22 : 22), f.x0, f.x1); ty = clamp(npc.av.y + (npc.av.use >= 0 ? 10 : 0), f.y0, f.y1); }
      else if (spot >= 0) { tx = room.spots[spot].sx; ty = room.spots[spot].sy; }
      else if (tk) { tx = tk.sx; ty = tk.sy; }
      const path = me.pose === POSE_BOAT ? [[tx, ty] as [number, number]] : routeTo(room, me.x, me.y, tx, ty); // detour around seat rows, desks, sofas (boats just row straight)
      tapTarget = { x: path[0][0], y: path[0][1], door: d, stuck: 0, spot, npc, tk, path: path.slice(1) };
      tapFx = { x: tx, y: ty, t0: t };
    }
  }
  // coins on the Square: walk over one to pick it up (the server decides if it counts)
  if (room.id === 'plaza') COINS.forEach(([cx, cy], i) => {
    const key = coinWindow() + ':' + i;
    if (coinsGot.has(key) || Math.abs(me.x - cx) > 9 || Math.abs(me.y - cy) > 7) return;
    coinsGot.add(key); SFX.pop();
    net.claimCoin(i).then((n) => { if (n === null) return; setTokens(n); SFX.chime(); floaters.push({ x: cx, y: cy - 20, t0: now(), text: '+1' }); }).catch(() => {});
  });
  // fishing: wait for the bite, then a second to reel it in
  if (fishing && usingOf(me) === 'fish') {
    if (fishing.state === 'wait' && t >= fishing.bite) { fishing.state = 'bite'; SFX.huh(); }
    else if (fishing.state === 'bite' && t > fishing.bite + 1.1) { toast('It got away...'); fishing = { bite: t + 2 + Math.random() * 6, state: 'wait' }; }
  } else if (fishing && usingOf(me) !== 'fish') fishing = null;
  // roasting a marshmallow: stand still near the Pier's bonfire
  if (room.id === 'pier' && (me.hold === HOLD_MARSH || me.hold === HOLD_TOAST) && !me.moving && Math.hypot(me.x - PIER_FIRE.x, (me.y - PIER_FIRE.y) * 1.4) < 70) {
    roast += dt;
    if (me.hold === HOLD_MARSH && roast > 2.5) { me.hold = HOLD_TOAST; forceSend = true; SFX.chime(); toast('Golden! Eat it now (Q), or keep going...'); }
    else if (me.hold === HOLD_TOAST && roast > 6.5) { me.hold = HOLD_BURNT; forceSend = true; SFX.hurt(); toast('Oops. Burnt.'); }
  }
  // finished what's in your hand?
  if (me.hold && me.sips >= (USES[me.hold] ?? 5) && !me.emote) {
    logLine(null, me.hold === HOLD_MUG ? 'Mug empty. Refill it at the coffee machine' : me.hold === HOLD_POPCORN ? 'All the popcorn is gone' : me.hold === HOLD_TOAST ? 'Perfect golden marshmallow!' : me.hold === HOLD_BURNT ? 'Crunchy... and a bit sad' : me.hold === HOLD_MARSH ? 'Raw marshmallow. Bold choice.' : 'Slurp! Soda finished');
    me.hold = 0; me.sips = 0; forceSend = true;
  }
  const ax = input.axis();
  // busy with a spot: sitting, filling a cup, the photo booth
  if (me.use >= 0) {
    const k = usingOf(me), fill = FILL[k ?? ''];
    if (fill && t >= fillEnd) {
      me.hold = fill.hold; me.sips = 0; leaveSpot(); SFX.chime();
      if (!told.has(fill.hold)) { told.add(fill.hold); const verb = fill.hold === HOLD_POPCORN ? 'eat' : 'sip'; logLine(null, fill.msg + (isTouch ? ' Tap ' + verb.toUpperCase() + ' to ' + verb : ' Press Q to ' + verb)); }
    } else if (k === 'booth' && booth) runBooth(t);
    else if (k === 'rack' && t >= fixEnd) {
      const b = DEN_INFO.build;
      if (!b.ok) setState({ k: 'build', v: { ...b, ok: true, by: me.name, msg: 'fix the build' } });
      say(net.selfId, 'fixed it!', t, true); SFX.score(); leaveSpot();
    }
    if (me.use >= 0) {
      if (ax.x || ax.y) { if (fill) toast('Cancelled'); if (k === 'booth') booth = null; leaveSpot(); }
      else { me.moving = false; sendNet(t); return; }
    }
  }
  let vx = ax.x, vy = ax.y;
  if (vx || vy) tapTarget = null;
  else if (tapTarget) {
    const dx = tapTarget.x - me.x, dy = tapTarget.y - me.y, d = Math.hypot(dx, dy);
    if (d < 1.5 && tapTarget.path.length) { [tapTarget.x, tapTarget.y] = tapTarget.path.shift()!; }
    else if (d < 1.5) { const tt = tapTarget; tapTarget = null; if (tt.door) goThrough(tt.door); else if (tt.spot >= 0) useSpot(tt.spot); else if (tt.npc) talkTo(tt.npc); else if (tt.tk) talkToTalker(tt.tk); }
    else { vx = dx / d; vy = dy / d; if (Math.abs(dx) < 1) vx = 0; }
  }
  const len = Math.hypot(vx, vy); if (len > 1) { vx /= len; vy /= len; }
  let moved = 0;
  const rowing = me.pose === POSE_BOAT, sp = rowing ? 0.7 : 1; // boats go where it's wet, a bit slower
  const ok = (x: number, y: number) => (rowing ? !!room.water?.(x, y) : walkable(room, x, y));
  const nx = me.x + vx * SPEED_X * sp * dt, ny = me.y + vy * SPEED_Y * sp * dt;
  if (vx && (ok(nx, me.y) || (!rowing && push(nx - me.x, 0)))) { moved += Math.abs(nx - me.x); me.x = nx; }
  if (vy && (ok(me.x, ny) || (!rowing && push(0, ny - me.y)))) { moved += Math.abs(ny - me.y); me.y = ny; }
  if (tapTarget && tapTarget.door && inside(tapTarget.door.trigger, me.x, me.y)) { const door = tapTarget.door; tapTarget = null; goThrough(door); }
  if (tapTarget) {
    tapTarget.stuck = moved < 0.01 ? tapTarget.stuck + dt : 0;
    if (tapTarget.stuck > 0.25) { // blocked: close enough still counts
      const tt = tapTarget; tapTarget = null;
      if (tt.npc && Math.hypot(me.x - tt.npc.av.x, me.y - tt.npc.av.y) < 44) talkTo(tt.npc);
      else if (tt.spot >= 0 && Math.hypot(me.x - tt.x, me.y - tt.y) < 20) useSpot(tt.spot);
    }
  }
  // walking "up" into a door
  for (const d of room.doors) if (inside(d.trigger, me.x, me.y) && (d.edge || vy < -0.3) && doorDest(d)) goThrough(d);
  const was = me.moving;
  me.moving = moved > 0.01;
  if (me.moving && me.pose && me.pose !== POSE_GHOST && me.pose !== POSE_BOAT) { me.pose = 0; forceSend = true; }
  if (me.pose === POSE_GHOST && now() > ghostUntil) { me.pose = 0; forceSend = true; toast('You are yourself again'); }
  if (Math.abs(vx) > 0.15) me.dir = vx > 0 ? 1 : -1;
  if (was && !me.moving) me.stopT = t;
  me.walkDist += moved;
  const stepN = Math.floor(me.walkDist / 16);
  if (stepN !== lastStep) { lastStep = stepN; SFX.step(); }
  sendNet(t);
}
/** Walking into a pushable block shoves it along, if there's room. */
let pushSent = 0;
function push(dx: number, dy: number): boolean {
  const ps = room.pushables; if (!ps) return false;
  const nx = me.x + dx, ny = me.y + dy;
  const hit = ps.find((b) => nx + 6 > b.x0 && nx - 6 < b.x1 && ny + 2 > b.y0 && ny - 2 < b.y1); if (!hit) return false;
  const m = { x0: hit.x0 + dx, y0: hit.y0 + dy, x1: hit.x1 + dx, y1: hit.y1 + dy }, f = room.floor;
  if (m.x0 < f.x0 || m.x1 > f.x1 || m.y0 < f.y0 || m.y1 > f.y1) return false;
  if (room.blockers.some((b) => b !== hit && m.x0 < b.x1 && m.x1 > b.x0 && m.y0 < b.y1 && m.y1 > b.y0)) return false;
  // still blocked by something else where we'd stand? then don't move the block either
  const was = { ...hit }; Object.assign(hit, m);
  if (!walkable(room, nx, ny)) { Object.assign(hit, was); return false; }
  const t = now(); if (t - pushSent > 0.15) { pushSent = t; setState({ k: 'crypt', v: { b: blockCenters(), open: CRYPT_INFO.open } }); }
  if (Math.floor(t * 6) !== Math.floor((t - 0.02) * 6)) SFX.step();
  return true;
}
function sendNet(t: number): void {
  if ((me.moving && t - lastSend > 1 / sendHz(others.size)) || me.moving !== lastSentMoving || forceSend || t - lastSend > HEARTBEAT) {
    net.sendMove({ x: me.x, y: me.y, dir: me.dir, moving: me.moving, use: me.use, hold: me.hold, pose: me.pose });
    lastSend = t; lastSentMoving = me.moving; forceSend = false;
  }
}

// ---------- photo booth ----------
const SHOTS = [1.0, 2.3, 3.6], SHOT_POSE: EmoteKind[] = ['wave', 'joy', 'idea'];
function runBooth(t: number): void {
  const b = booth!, u = t - b.t0;
  if (b.next < 3 && b.emoted < b.next && u > SHOTS[b.next] - 0.55) { b.emoted = b.next; lastEmoteAt = -9; emote(SHOT_POSE[b.next]); }
  if (b.next < 3 && u > SHOTS[b.next]) { b.next++; SFX.shutter(); flash(); pendingShot = true; }
  if (b.next >= 3 && !pendingShot && u > 4.2) { const frames = b.frames; booth = null; leaveSpot(); showStrip(frames); }
}
/** Copy the crisp + glow layers around the booth into a frame. Called mid-render, after everyone's drawn. */
function capture(): void {
  const s = room.spots[me.use]; if (!s || !booth) return;
  const w = 96, h = 90, x0 = Math.round(s.x - w / 2), y0 = Math.round(s.y - h + 8), cv = mk(w, h), g = cv.getContext('2d')!;
  g.imageSmoothingEnabled = false; g.drawImage(R.world, x0, y0, w, h, 0, 0, w, h); // crisp layer only: the flash's glow would wash it out
  booth.frames.push(cv);
}
/** Lay the frames out as a classic strip and offer it for download. */
function showStrip(frames: HTMLCanvasElement[]): void {
  if (!frames.length) return;
  const S = 3, fw = 96 * S, fh = 90 * S, pad = 14, W = fw + pad * 2, H = frames.length * (fh + pad) + pad + 46;
  const strip = mk(W, H), g = strip.getContext('2d')!;
  g.fillStyle = '#FAF6EC'; g.fillRect(0, 0, W, H); g.imageSmoothingEnabled = false;
  frames.forEach((f, i) => { g.fillStyle = '#160C2C'; g.fillRect(pad - 3, pad + i * (fh + pad) - 3, fw + 6, fh + 6); g.drawImage(f, pad, pad + i * (fh + pad), fw, fh); });
  const pd = PX.dim, pe = PX.emit; PX.dim = 0; PX.emit = false;
  withCtx(g, () => { const s1 = 'LAB HANGOUT', d = new Date().toLocaleDateString('en-CA'); txt(s1, W / 2 - tw(s1, 3) / 2, H - 40, [217, 119, 87], 3); txt(d, W / 2 - tw(d, 2) / 2, H - 18, [120, 110, 100], 2); });
  PX.dim = pd; PX.emit = pe;
  const url = strip.toDataURL('image/png'), m = openModal('PHOTO STRIP', () => input.clear());
  const img = document.createElement('img'); img.src = url; img.alt = 'Your photo strip';
  const save = document.createElement('a'); save.className = 'mbtn'; save.href = url; save.download = 'lab-hangout-photo.png'; save.textContent = 'SAVE';
  m.body.append(img, row(save, button('CLOSE', m.close, true)));
}

// ---------- render ----------
function drawDoorHints(a: number): void {
  for (const d of room.doors) {
    const dest = doorDest(d); if (!dest) continue;
    const cx = (d.trigger.x0 + d.trigger.x1) / 2, dist = Math.hypot(me.x - cx, me.y - d.trigger.y0);
    if (dist > 70) continue;
    const k = 1 - seg(dist, 40, 70), bob = Math.round(Math.abs(Math.sin(a * 5)) * 3), y = d.area.y0 - 12 - bob;
    PX.ctx.globalAlpha = k;
    lit(() => { for (let j = 0; j < 4; j++) r(Math.round(cx) - j, y + j, 1 + j * 2, 1, [255, 214, 90]); r(Math.round(cx) - 1, y + 4, 3, 3, [255, 214, 90]); });
    txtOutlined(dest.label, Math.round(cx - tw(dest.label) / 2 + (cx < 60 ? 22 : 0)), y - 9, [255, 236, 170]);
    PX.ctx.globalAlpha = 1;
    Gd(cx, y + 3, 6, [255, 214, 90], 0.4 * k);
  }
}

/** Bobbing down-arrow + "E SIT" over whatever E would use. */
function drawActionHint(a: number, act: Action | null): void {
  if (!act?.at) return;
  const cx = Math.round(act.at[0]), y = Math.round(act.at[1]) - Math.round(Math.abs(Math.sin(a * 5)) * 2);
  const label = isTouch ? act.label : 'E ' + act.label;
  lit(() => { r(cx - 1, y - 3, 3, 3, [255, 214, 90]); for (let j = 0; j < 4; j++) r(cx - 3 + j, y + j, 7 - j * 2, 1, [255, 214, 90]); });
  txtOutlined(label, Math.round(cx - tw(label) / 2), y - 11, [255, 236, 170]);
  Gd(cx, y, 6, [255, 214, 90], 0.35);
}

function render(a: number, t: number): void {
  R.begin();
  PX.dim = 0;
  PX.gmul = room.glowMul?.() ?? 1;
  R.wctx.drawImage(room.bg, 0, 0);
  const alt = room.bgAlt ? room.altAlpha?.() ?? 0 : 0;
  if (alt > 0.004) { R.wctx.globalAlpha = alt; R.wctx.drawImage(room.bgAlt!, 0, 0); R.wctx.globalAlpha = 1; }
  const dim = room.dimNow?.() ?? room.dim;
  PX.dim = dim;
  room.drawBack(a);
  if (isHalloween()) halloweenBack(room.id, a);
  // tap marker
  if (tapFx) { const u = t - tapFx.t0; if (u > 0.5) tapFx = null; else lit(() => ring(Math.round(tapFx!.x), Math.round(tapFx!.y), Math.round(3 + u * 16), Math.round(1 + u * 5), [255, 236, 170])); }
  const items: { y: number; av?: Avatar; draw?: (a: number) => void }[] = room.props.map((p) => ({ y: p.y, draw: p.draw }));
  for (const d of ambient.items(room.id, t)) items.push(d);
  if (isHalloween()) for (const p of halloweenProps(room.id)) items.push({ y: p.y, draw: p.draw });
  if (playing) items.push({ y: me.y, av: me });
  for (const av of others.values()) items.push({ y: av.y, av });
  for (const n of npcs.inRoom(room.id)) items.push({ y: n.av.y, av: n.av });
  if (room.id === 'plaza') COINS.forEach(([cx, cy], i) => {
    if (coinsGot.has(coinWindow() + ':' + i)) return;
    items.push({ y: cy, draw: (aa) => { const w = Math.round(Math.abs(Math.cos(aa * 3 + i)) * 3), y = cy - 6 - Math.round(Math.abs(Math.sin(aa * 2 + i)) * 2); lit(() => { r(cx - w, y - 3, w * 2 + 1, 7, [184, 144, 42]); r(cx - w + (w ? 1 : 0), y - 2, Math.max(1, w * 2 - 1), 5, [255, 214, 90]); if (w > 1) r(cx - w + 1, y - 2, 1, 2, [255, 245, 200]); }); Gd(cx, y, 6, [255, 214, 90], 0.3); } });
  });
  const sw = room.id === 'plaza' ? slopWave() : null;
  if (sw) for (let i = 0; i < SLOP_N; i++) {
    const hit = slopHits.get(i), b = blob(sw.w, i, sw.u);
    if (hit && t >= hit.t) { if (t - hit.t < 1.2) items.push({ y: hit.y, draw: () => drawSplat(hit.x, hit.y, t - hit.t) }); continue; }
    if (b.state === 'fall' || b.state === 'crawl') items.push({ y: b.y, draw: (aa) => drawBlob(b, aa) });
  }
  items.sort((p, q) => p.y - q.y || (p.av?.self ? 1 : 0) - (q.av?.self ? 1 : 0));
  const heads = new Map<string, [number, number]>();
  for (const it of items) {
    PX.dim = dim;
    if (it.draw) it.draw(a);
    else if (it.av) { const h = drawAvatar(it.av, a, t, dim, usingOf(it.av), liftOf(it.av)); heads.set(it.av.self ? net.selfId : it.av.id, R.toScreen(h.headX, h.headY)); }
  }
  for (const tk of room.talkers ?? []) heads.set(tk.id, R.toScreen(tk.x, tk.y - 4));
  if (isHalloween()) halloweenFront(room.id, a);
  // lanterns: stacked faint discs give a soft falloff (one big disc reads as a flat circle)
  if (room.lantern) for (const it of items) if (it.av) { const ly = it.av.y - liftOf(it.av) - 16; for (let k = 0; k < 6; k++) Gd(it.av.x, ly, 10 + k * 9, room.lantern, 0.06); }
  for (const it of items) {
    const av = it.av; if (!av || av.use < 0 || room.spots[av.use]?.kind !== 'fish') continue;
    const tipX = av.x + av.dir * 14, tipY = av.y - 44, bob = av.self && fishing?.state === 'bite', bx = av.x + av.dir * 26, by = 398 + (bob ? 3 : Math.round(Math.sin(a * 2 + av.seed * 9)));
    r(Math.round(av.x + av.dir * 6), av.y - 22, 1, 1, [90, 60, 40]); for (let k = 0; k < 10; k++) r(Math.round(av.x + av.dir * (6 + k * 0.8)), av.y - 22 - Math.round(k * 2.2), 1, 1, [110, 80, 50]);
    for (let k = 0; k <= 12; k++) { const u = k / 12; r(Math.round(tipX + (bx - tipX) * u), Math.round(tipY + (by - tipY) * u + Math.sin(u * Math.PI) * 6), 1, 1, [220, 220, 230]); }
    lit(() => { r(Math.round(bx) - 1, by - 2, 3, 2, K.RED); r(Math.round(bx) - 1, by, 3, 1, K.WHITE); });
    if (bob) { lit(() => ring(Math.round(bx), by + 1, 5 + Math.round((a * 8) % 4), 2, [220, 240, 255])); txtOutlined('!', Math.round(av.x) - 3, Math.round(av.y - 60), [255, 214, 90], 3); }
  }
  for (let k = floaters.length - 1; k >= 0; k--) { const f = floaters[k], u = t - f.t0; if (u > 1.2) { floaters.splice(k, 1); continue; } alpha(1 - u / 1.2, () => txtOutlined(f.text, Math.round(f.x - tw(f.text, 2) / 2), Math.round(f.y - u * 18), [255, 214, 90], 2)); }
  for (let k = sparks.length - 1; k >= 0; k--) { const s = sparks[k], u = t - s.t0; if (u > 1) { sparks.splice(k, 1); continue; } lit(() => alpha(1 - u, () => { const x = Math.round(s.x + Math.sin(u * 8) * 3), y = Math.round(s.y - u * 24); r(x, y, 2, 2, s.c); r(x + 1, y - 5, 1, 5, s.c); r(x + 2, y - 5, 2, 1, s.c); })); }
  for (let k = mugs.length - 1; k >= 0; k--) { const m = mugs[k], u = (t - m.t0) / 0.35; if (u >= 1) mugs.splice(k, 1); else drawThrow(m.x0, m.y0, m.x1, m.y1, u); }
  const g = gameNow();
  if (g?.kind === 'chairs' && g.phase === 'grab') for (const si of g.seats) {
    const s = room.spots[si], y = Math.round(s.y - s.lift - 46 - Math.abs(Math.sin(a * 6)) * 3), taken = room.inUse.has(si);
    lit(() => { const c: [number, number, number] = taken ? [124, 242, 156] : [255, 214, 90]; r(s.x - 1, y - 3, 3, 3, c); for (let j = 0; j < 4; j++) r(s.x - 3 + j, y + j, 7 - j * 2, 1, c); });
    Gd(s.x, y, 8, taken ? [124, 242, 156] : [255, 214, 90], 0.4);
  }
  if (g?.kind === 'tag' && g.phase === 'play') {
    const id = g.ids[g.it], av = id === net.selfId ? me : others.get(id);
    if (av) { const y = Math.round(av.y - liftOf(av) - 56 - Math.abs(Math.sin(a * 5)) * 2); txtOutlined('IT!', Math.round(av.x - tw('IT!', 2) / 2), y, [255, 90, 90], 2); Gd(av.x, av.y - 16, 22, [255, 60, 60], 0.35); }
  }
  if (pendingShot) { pendingShot = false; capture(); }
  if (playing) { drawDoorHints(a); drawActionHint(a, actNow); }
  room.drawFront?.(a);
  PX.gmul = 1;
  R.present(room.w, room.h, room.fillTop, room.fillLow);
  layoutBubbles(t, heads, R.cssW);
  animatePlate(t);
}

// ---------- loop ----------
// Capped at 60 fps: 120 Hz displays would otherwise draw every frame twice for no visible gain.
const FRAME_MIN_MS = 1000 / 60 - 1.5;
let last = performance.now();
function frame(nowMs: number): void {
  requestAnimationFrame(frame);
  if (nowMs - last < FRAME_MIN_MS) return;
  let dt = (nowMs - last) / 1000; last = nowMs;
  if (!(dt > 0)) dt = 0; if (dt > 0.1) dt = 0.1;
  const t = nowMs / 1000;
  try {
    // who's using which spot: others (players + bots) and NPCs, then you
    busy.clear();
    for (const av of others.values()) if (av.use >= 0) busy.set(av.use, av.useT0);
    npcs.update(ROOMS, room.id, t, (i) => me.use === i || busy.has(i));
    for (const n of npcs.inRoom(room.id)) if (n.av.use >= 0) busy.set(n.av.use, n.av.useT0);
    updateMe(dt);
    room.inUse.clear(); for (const [i, t0] of busy) room.inUse.set(i, t0); if (me.use >= 0) room.inUse.set(me.use, me.useT0);
    if (room.id === 'den') { // desks show the setup of whoever is sitting at them
      DEN_INFO.decor.clear();
      for (const av of [me, ...others.values()]) if (av.use >= 0 && room.spots[av.use]?.kind === 'desk' && av.look.desk) DEN_INFO.decor.set(av.use, av.look.desk);
    }
    const g = gameNow();
    if (g) {
      if (g.host === net.selfId) { const ng = hostStep(g, hostView()); if (ng) setState({ k: 'game', v: ng }); }
      if (g.kind === 'tag' && g.phase === 'play') { const itId = g.ids[g.it]; if (itId === net.selfId || (g.host === net.selfId && itId.startsWith('bot-'))) { const ng = tagTouch(g, hostView()); if (ng) { setState({ k: 'game', v: ng }); SFX.hop(); } } }
      onGamePhase(g);
    }
    const bg: BotGame | null = g && g.kind !== 'off' ? { kind: g.kind, phase: g.phase, players: new Set((g.kind === 'chairs' ? g.alive : g.ids.map((_, i) => i)).map((i) => g.ids[i])), seats: g.seats, itId: g.it >= 0 ? g.ids[g.it] : null, pos: posOf } : null;
    bots?.update(room, dt, new Set(room.inUse.keys()), bg);
    // slop invasion bookkeeping (the event is on the Square; everyone else just hears about it)
    const sw = slopWave();
    if (sw && sw.w !== slopW) { slopW = sw.w; slopHits.clear(); slopGone.clear(); }
    if (sw && slopToast !== sw.w && playing) { slopToast = sw.w; toast(room.id === 'plaza' ? 'SLOP INVASION! Throw coffee at them (E / click)' : 'SLOP INVASION in the Square! Go help!', 4000); SFX.siren(); }
    if (sw && room.id === 'plaza') {
      const st = roomState.plaza.get('slop');
      if (st?.k === 'slop' && st.v.w === sw.w) for (const i of st.v.dead) if (!slopHits.has(i)) { const b = blob(sw.w, i, sw.u); slopHits.set(i, { t: t, x: b.x, y: b.y - b.z }); }
      for (let i = 0; i < SLOP_N; i++) if (!slopHits.has(i) && !slopGone.has(i) && blob(sw.w, i, sw.u).state === 'escaped') { slopGone.add(i); SFX.boom(); }
    }
    for (const av of others.values()) stepRemote(av, t);
    for (const av of [me, ...others.values()]) if (av.emote && t - av.emote.t0 > emoteDur(av.emote.kind)) av.emote = null;
    ambient.update(room, dt, t, [...(playing ? [me] : []), ...others.values(), ...npcs.inRoom(room.id).map((n) => n.av)]);
    actNow = currentAction(); syncActionBar(); syncPad();
    // the top banner: a party game here, else the slop invasion
    const slopLine = sw && room.id === 'plaza' ? (sw.u < SLOP_DUR - 5 ? 'SLOP INVASION! ZAPPED ' + slopHits.size + ' · ESCAPED ' + slopGone.size + ' · ' + Math.ceil(SLOP_DUR - 5 - sw.u) + 's' : slopHits.size >= slopGone.size ? 'THE LAB IS SAFE! ' + slopHits.size + ' SLOP ZAPPED' : 'THE LAB GOT SLOPPED...') : '';
    hsFrame(); followStep(t);
    if (room.id === 'roof' && playing && (GARDEN.dirty || Date.now() - GARDEN.fetchedAt > 15000)) refreshGarden();
    if (room.id === 'subway' || room.id === 'train' || room.id === 'parkstn') subwaySounds();
    if (isHalloween() && (room.id === 'plaza' || room.id === 'pier' || room.id === 'roof') && dayness() < 0.4) { const k = Math.floor(Date.now() / 1000 / 71); if (k !== lastHowl) { if (lastHowl >= 0) SFX.howl(); lastHowl = k; } }
    const hl = hsLive(hs, net.selfId);
    syncGameBar(g ? banner(g) : hl ? hsBanner(hl, net.selfId) : slopLine);
    // music: the Lab's jukebox fades with distance; the film score fills the cinema while it plays
    const gm = g && partyMusic(g);
    partyScore.set(gm ? PARTY_TRACK : null, g?.t0 ?? 0); partyScore.volume(gm ? 0.7 : 0); partyScore.tick();
    const mu = room.music, cur = mu?.current();
    jukebox.set(mu && cur && cur.n >= 0 ? mu.tracks[cur.n] : null, cur?.t0 ?? 0);
    jukebox.volume(mu && !g ? clamp(1 - Math.abs(me.x - mu.x) / 560, 0.12, 0.8) * (room.id === 'den' && pomodoro().focus ? 0.7 : 1) : 0); jukebox.tick();
    // the crypt: are all three plates down?
    if (room.id === 'crypt' && playing) {
      const feet = [...(playing ? [me] : []), ...others.values(), ...npcs.inRoom(room.id).map((n) => n.av)].map((av) => ({ x: av.x, y: av.y }));
      const down = platesDown(feet); setDown(down);
      const wall = Date.now() / 1000;
      if (down.every(Boolean) && !CRYPT_INFO.open) { setState({ k: 'crypt', v: { b: blockCenters(), open: wall } }); SFX.door(); SFX.score(); toast('The stone door grinds open!', 3500); }
      if (CRYPT_INFO.open && wall - CRYPT_INFO.open > OPEN_FOR) { resetBlocks(); setState({ k: 'crypt', v: { b: blockCenters(), open: 0 } }); toast('The door rumbles shut. The stones reset.'); }
      if (!me.moving && t - pushSent > 0.3 && t - pushSent < 0.5) { pushSent -= 1; setState({ k: 'crypt', v: { b: blockCenters(), open: CRYPT_INFO.open } }); }
    }
    // the roof: bang when a fireworks show starts
    const fw = room.id === 'roof' ? showStart() : null;
    if (fw && fw.t0 !== fwHeard && Date.now() / 1000 - fw.t0 < 3) { fwHeard = fw.t0; for (let k = 0; k < 8; k++) setTimeout(() => { SFX.boom(); SFX.pop(); }, (0.9 + k * 0.72) * 1000); }
    // the Den: rain on the window, thunder after lightning, pomodoro chimes
    rain.set(room.id === 'den' && playing ? 0.05 : 0);
    if (room.id === 'den' && playing) {
      const fl = lightning(); if (fl > 0.9 && t - lastFlash > 5) { lastFlash = t; setTimeout(() => SFX.thunder(), 700); }
      const focus = pomodoro().focus;
      if (lastFocus !== null && focus !== lastFocus) { SFX.chime(); toast(focus ? 'Pomodoro: focus time (25 min)' : 'Pomodoro break! Stretch, grab an espresso', 3500); }
      lastFocus = focus;
    } else lastFocus = null;
    const fc = filmClock();
    filmScore.set(room.id === 'cinema' ? FILM_TRACK : null, fc.start + 5);
    filmScore.volume(room.id === 'cinema' && filmPlaying() && !g ? (me.x > 400 ? 0.8 : 0.35) : 0); filmScore.tick();
    // seated somewhere with a view (the cinema), the camera pans up to frame it
    const view = room.watch && usingOf(me) === 'sit' ? room.watch : null;
    R.follow(view ? view.x : me.x, me.y, room.w, room.h, dt, false, view?.top);
    render(t, t);
  } catch (err) { console.error(err); }
}

// ---------- start ----------
async function boot(): Promise<void> {
  // attract mode behind the start screen: the camera idles in the lab
  R.follow(room.spawn.x, room.spawn.y, room.w, room.h, 0, true);
  requestAnimationFrame(frame);
  start = new StartScreen(DEFAULT_LOOK, '');
  const chosen = start.open(false);
  let modeMsg = '';
  let mergedSave: unknown = null;
  let isErr = false;
  const siteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim();
  const captcha = siteKey ? () => { start.status('One quick check that you are human...'); return turnstileToken(siteKey, $('#captcha')); } : undefined;
  const providers = ((import.meta.env.VITE_AUTH_PROVIDERS as string | undefined) ?? '').split(',').map((p) => p.trim()).filter((p): p is Provider => (PROVIDERS as string[]).includes(p));
  const mine = net.mode === 'local' ? PROVIDERS : providers;
  try {
    let acct = await net.connect();
    // back from a login provider with an error: "that Discord is already someone's account" means
    // this guest should move their progress into it, so start a merge and log into that account
    const authErr = net.takeAuthError(), linking = localStorage.getItem('labhangout.linking') as Provider | null;
    localStorage.removeItem('labhangout.linking');
    if (authErr) {
      if (authErr.code === 'identity_already_exists' && linking && acct.kind === 'guest') {
        start.status('That ' + linking + ' already has a Lab Hangout account: logging you into it and bringing your guest stuff along...');
        localStorage.setItem('labhangout.merge', await net.startMerge());
        await net.loginWith(linking);
        acct = net.account();
      } else toast('Login problem: ' + authErr.message, 6000);
    }
    while (acct.kind === 'none') {
      const how = await start.chooseSignIn(mine);
      try {
        if (how === 'guest') await net.signInGuest(net.mode === 'supabase' ? captcha : undefined); else await net.loginWith(how); // LOCAL mode has no server to check a CAPTCHA
        acct = net.account();
      } catch (e) { start.status(e instanceof Error ? e.message : String(e)); }
    }
    modeMsg = net.mode === 'supabase' ? 'ONLINE · connected' : 'LOCAL MODE · open a second tab to see multiplayer. Add Supabase keys to .env.local to go online.';
    const ticket = localStorage.getItem('labhangout.merge');
    if (ticket && acct.kind === 'account') {
      localStorage.removeItem('labhangout.merge');
      try { const got = await net.finishMerge(ticket); setTokens(got.tokens); mergedSave = got.save; toast('Your guest progress moved into this account!', 4500); }
      catch (e) { toast('Could not bring your guest progress: ' + (e instanceof Error ? e.message : String(e)), 5000); }
    }
    if (await net.needsInvite()) { start.status('ONLINE · this world is invite-only'); await start.askInvite((code) => net.joinWorld(code)); }
  } catch (err) {
    console.error(err);
    net = new LocalTransport();
    await net.connect();
    modeMsg = 'Could not reach Supabase (' + (err instanceof Error ? err.message : String(err)) + '). Playing in LOCAL mode.';
    isErr = true;
  }
  net.onSeatLost(onSeatLost);
  net.watchLobby(onLobby);
  net.watchWorld(onWorld);
  await save.attach(net.selfId, net);
  await refreshSeason();
  if (net.mode === 'local' && Number(params.get('grow')) > 0) GARDEN.speed = Number(params.get('grow')); // LOCAL test speed-up
  setInterval(() => void refreshSeason(), 600000);
  if (mergedSave) save.mergeIn(mergedSave);
  start.setAccount(net.account(), mine, {
    link: (p) => { localStorage.setItem('labhangout.linking', p); start.status('Off to ' + p + '...'); void net.linkWith(p).then(() => location.reload(), (e) => start.status(e instanceof Error ? e.message : String(e))); },
    logout: () => { void net.logout().then(() => { const u = new URL(location.href); u.searchParams.set('signin', ''); location.href = net.mode === 'local' ? u.toString() : location.pathname; }); },
  });
  const saved = await net.loadProfile();
  if (saved) { start.setName(saved.name); start.setLook(saved.look); }
  start.ready(saved ? 'Back to the lab' : 'Join the lab', modeMsg, isErr);
  const res = await chosen;
  setSound(res.sound); syncSnd();
  if (res.sound) SFX.chime();
  me = makeAvatar(net.selfId, res.name, res.look, room.spawn.x, room.spawn.y, true, now());
  void net.saveProfile(res.name, res.look);
  await chooseServer(true);
  await nameServer();
  playing = true;
  await enterRoom('lab', null);
  net.tokens().then(setTokens).catch(() => {});
  net.claimDaily().then((n) => { if (n !== null) { setTokens(n); toast('+5 tokens: daily bonus!', 3000); SFX.chime(); } }).catch(() => {});
  logLine(null, matchMedia('(pointer: coarse)').matches ? 'Tap the floor to walk · tap things (and people) to use them' : 'WASD / arrows or click to walk · E to use things · Q to sip · Enter to chat · 1-7 to emote');
}
addEventListener('pagehide', () => { void net.leaveRoom(); net.leaveSeat(); });
addEventListener('resize', () => updateCount());
// Dev-only test hook (npm run dev + ?debug): lets scripts teleport and use things without walking.
if (import.meta.env.DEV && params.has('debug')) {
  (window as unknown as Record<string, unknown>).__hangout = {
    get me() { return me; }, get room() { return room.id; },
    go: (id: RoomId, x?: number, y?: number) => enterRoom(id, x !== undefined && y !== undefined ? { x, y } : null),
    at: (x: number, y: number) => { me.x = x; me.y = y; forceSend = true; },
    use: (i: number) => useSpot(i), pose: (p: number) => setPose(p), item: () => useItem(), feed: () => feed(),
    state: (v: StateVal) => setState(v), blocks: () => blockCenters(), game: (k: 'chairs' | 'tag') => startGame(k), gameState: () => gameNow(), bots: () => bots?.debug(), hv: () => hostView(), others: () => [...others.values()].map((o) => [o.id, o.use, Math.round(o.x), Math.round(o.y)]),
    follow: (id: string) => { following = id; followT = 0; }, stopFollow: () => { following = null; },
    spots: () => room.spots.map((sp) => ({ kind: sp.kind, n: sp.n })), candleOrder: () => candleOrder(),
    doorsOpen: () => room.doors.map((d) => !!doorDest(d)),
    dressBots: (looks: Partial<Look>[]) => { [...others.values()].forEach((o, i) => { if (looks[i]) { o.look = { ...o.look, ...looks[i] }; o.x = me.x + 50 + i * 44; o.y = me.y; } }); },
  };
}
void boot();
