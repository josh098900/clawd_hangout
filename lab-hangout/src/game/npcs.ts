// Non-player characters. Each one loops through a fixed routine driven by the WALL CLOCK
// (Date.now()), so every player's browser puts the same NPC in the same place doing the same
// thing — no server, no network traffic. They use the same spots (seats, coffee, arcade) as
// players, and step aside if a player is already sitting where they want to sit.

import { emoteDur, makeAvatar, useEmote, type Avatar } from '../entities/avatar';
import type { Look } from '../entities/critter';
import { h1 } from '../engine/math';
import { say } from '../ui/overlay';
import type { Room, RoomId } from '../world/room';
import { season } from '../world/season';
import { POSE_GHOST } from '../entities/avatar';

interface Stop {
  /** Walk here (ignored when `use` is set: then you walk to that spot's stand point). */
  x?: number; y?: number;
  /** Seconds to stay. 0/undefined = a waypoint you just pass through. */
  wait?: number;
  /** Spot index to use while waiting. */
  use?: number;
  /** What's in hand once this stop is over (undefined = unchanged). */
  holdAfter?: number;
  /** One of these is said on arrival. */
  say?: string[];
  /** Dance (1) or sit on the floor (2) while waiting here. */
  pose?: number;
}
interface NpcDef { id: string; name: string; room: RoomId; look: Look; speed: number; stops: Stop[]; chat: string[]; /** only around in this season (see world/season.ts) */ season?: string; /** always a sheet ghost */ ghost?: boolean; /** pad the loop to exactly this long (s), to line up with a wall-clock cycle */ cycle?: number }

const DEFS: NpcDef[] = [
  {
    id: 'npc-fizz', name: 'PROF. FIZZ', room: 'lab', speed: 40,
    look: { c: 2, hat: 0, face: 2, fit: 1, sp: 0 },
    stops: [
      { x: 150, y: 452, wait: 8, say: ['hmm. still ???', 'the plan is... forming', 'IDEAS: ???. nailed it'] },
      { x: 420, y: 470 },
      { use: 3, wait: 2.4, holdAfter: 1, say: ['coffee time', 'fuel for science'] },
      { x: 680, y: 500 }, { x: 680, y: 538 },
      { use: 2, wait: 16, holdAfter: 0, say: ['this sofa is elite', 'ahh. break time', 'five minutes. then science'] },
      { x: 680, y: 538 },
      { x: 772, y: 450, wait: 6, say: ['where did i put that book', "ah, 'voxels for beginners'", 'so many books'] },
      { x: 470, y: 462, wait: 6, say: ['nice night out there', 'is the dragon still up?'] },
      { use: 4, wait: 9, say: ['one more round...', 'this cabinet is rigged', 'new high score?!'] },
    ],
    chat: ['welcome to the lab!', 'try the coffee machine', 'the sofa has great lumbar support', 'i am 87% sure the plan is ???', 'have you seen the dragon outside?', 'careful, the arcade is addictive', 'zero days without slop. sigh.'],
  },
  {
    id: 'npc-gus', name: 'GUS', room: 'plaza', speed: 34,
    look: { c: 4, hat: 2, face: 0, fit: 2, sp: 0 },
    stops: [
      { x: 250, y: 598, wait: 7, say: ['this castle took ages', 'look at the little flags', 'one voxel at a time'] },
      { x: 380, y: 664 },
      { use: 1, wait: 16, say: ['nice night', 'the stars are out', 'the pigeons are plotting something'] },
      { x: 800, y: 598, wait: 8, say: ['round and round it goes', 'wanna ride? me neither'] },
      { x: 1060, y: 608, wait: 7, say: ['...is it breathing?', 'good dragon. GOOD dragon'] },
      { x: 950, y: 674 },
      { use: 2, wait: 14, say: ['my favourite bench', 'the lab never sleeps'] },
      { x: 120, y: 604, wait: 5, say: ['should get back to the lab...', 'nah. five more minutes'] },
    ],
    chat: ['evening!', 'the cinema is showing a space film',  "don't scare the pigeons", 'the lab is through that door', 'i come here to look at the dragon', 'nice night for a walk', 'have you tried sitting on a bench? life changing'],
  },
  {
    id: 'npc-usher', name: 'USHER', room: 'cinema', speed: 36,
    look: { c: 8, hat: 0, face: 0, fit: 3, sp: 1 },
    stops: [
      { x: 420, y: 482, wait: 10, say: ['enjoy the show!', 'tickets? free tonight', 'mind the rope'] },
      { x: 600, y: 540 }, { x: 600, y: 640, wait: 4, say: ['keep the aisle clear, please', 'flashlight check: ok'] },
      { use: 18, wait: 2.5, holdAfter: 2, say: ['perks of the job'] },
      { x: 300, y: 600 }, { x: 610, y: 644 },
      { use: 17, wait: 22, holdAfter: 0, say: ['shh, this is the good part', 'best seat in the house'] },
      { x: 950, y: 600, wait: 5, say: ['no talking during the film!', 'i have seen this 400 times'] },
      { x: 940, y: 470 },
    ],
    chat: ['welcome to the cinema!', 'popcorn and soda are free tonight', 'try the photo booth by the rope', 'the film starts every 80 seconds', 'please silence your phones', 'the dragon scene was my idea'],
  },
  {
    id: 'npc-salt', name: 'OLD SALT', room: 'pier', speed: 26,
    look: { c: 7, hat: 2, face: 0, fit: 2, sp: 0 },
    stops: [
      { use: 1, wait: 70, say: ['they are biting tonight', 'patience...', 'caught a boot once. good boot.'] },
      { x: 730, y: 560 },
      { use: 3, wait: 30, say: ['nothing beats a fire on the beach', 'toast yours golden, not black'] },
      { x: 600, y: 600, wait: 8, say: ['watch the lighthouse', 'hear the waves?'] },
      { x: 730, y: 560 },
    ],
    chat: ['ahoy!', 'fish off the end of the pier', 'wait for the bobber to dip, then REEL', 'legend says there is a MOON FISH out there', 'marshmallows are in the cooler', 'the crabs are harmless. mostly.'],
  },
  {
    id: 'npc-boo', name: 'BOO', room: 'plaza', speed: 22, season: 'halloween', ghost: true,
    look: { c: 7, hat: 0, face: 0, fit: 0, sp: 0 },
    stops: [
      { x: 1110, y: 640, wait: 14, say: ['...the grate is breathing again', 'something down there is lighting candles'] },
      { x: 880, y: 620, wait: 10, say: ['the dragon blinked. i saw it', 'did you hear that? no? good.'] },
      { x: 520, y: 600, wait: 12, say: ['the cinema smells of popcorn. and fear.', 'boo. sorry. habit.'] },
      { x: 200, y: 640, wait: 12, say: ['knock on every door. every. single. one.', 'the lab never switches its lights off. why?'] },
    ],
    chat: [
      'they say the third plate in the Crypt still clicks at midnight... when nobody stands on it',
      'a critter once fed the pigeons after dark. now the pigeons follow HIM home',
      'the cinema shows a film at 3am that nobody remembers watching. only the popcorn is gone',
      'Old Salt swears the Moon Fish swims up to the pier at full moon. to look at you',
      'never hum along to the Lab jukebox at night. it hums back',
      'every lamp post on this Square was once a critter who stayed out too late. boo.',
      'the old scroll in the Crypt changes its mind every day. light the candles in its order',
      'knock on all 8 pumpkin doors in one night and something nice might follow you home',
    ],
  },
  {
    id: 'npc-pixel', name: 'PIXEL', room: 'arcade', speed: 36,
    look: { c: 4, hat: 6, face: 3, fit: 4, sp: 0 },
    stops: [
      { x: 1010, y: 500, wait: 22, say: ['prize counter is open!', 'step right up', 'the halo? only ever seen ONE'] },
      { x: 300, y: 530, wait: 8, say: ['restocking the capsules...', 'this claw is TOTALLY fair', 'wiggle wiggle'] },
      { x: 468, y: 540, wait: 10, say: ['ooh, good rally', 'who is the champ today?'] },
      { x: 640, y: 590, wait: 8, say: ['nobody ever finishes air hockey', 'the puck has a mind of its own'] },
      { x: 780, y: 520, wait: 6, say: ['still out of order. classic', 'have you tried turning it off and on'] },
    ],
    chat: ['welcome to the arcade!', 'the claw costs 3 tokens', 'coins spawn on the Square every 5 minutes', 'got a dupe? you get a token back', 'pong is first to 5', 'check your collection at the prize counter', 'the MUSIC cabinet changes the tune'],
  },
  {
    id: 'npc-spin', name: 'DJ SPIN', room: 'stage', speed: 34,
    look: { c: 3, hat: 3, face: 3, fit: 0, sp: 1 },
    stops: [
      { x: 150, y: 570, wait: 30, pose: 1, say: ['make some noise!', 'this one is a banger', 'hands up!'] },
      { x: 500, y: 560, wait: 20, pose: 1, say: ['dance floor is OPEN', 'woo!'] },
      { use: 5, wait: 3, holdAfter: 3, say: ['hydration break'] },
      { x: 700, y: 600, wait: 25, pose: 1, say: ['who is on keys?', 'grab a mic, anybody!'] },
    ],
    chat: ['welcome to the stage!', 'step up to an instrument and hit 1-8', 'everything is in the same key, you cannot play a wrong note', 'the DJ booth changes the beat', 'form a band!', 'the mic is for singing (sort of)'],
  },
  {
    id: 'npc-fern', name: 'FERN', room: 'roof', speed: 30,
    look: { c: 6, hat: 4, face: 0, fit: 2, sp: 0 },
    stops: [
      { x: 210, y: 520, wait: 12, say: ['good bunny', 'a little trim here...', 'this one was in the film, you know'] },
      { x: 520, y: 500, wait: 6, say: ['do NOT touch the fireworks', 'ok maybe one'] },
      { x: 820, y: 500, wait: 12, say: ['the swan needs water', 'grow, little swan'] },
      { x: 1010, y: 592, wait: 12, say: ['the dragon is my favourite', 'rawr (gently)'] },
      { use: 1, wait: 40, say: ['hammock break', 'zzz...'] },
      { x: 300, y: 540, wait: 8, say: ['nice view tonight', 'the city never sleeps'] },
    ],
    chat: ['welcome to the garden!', 'the topiaries are from the film', 'try the telescope at night', 'fireworks go off every hour', 'mind the hammocks, they are comfy', 'the bunny took me three weeks'],
  },
  {
    id: 'npc-sage', name: 'SAGE', room: 'den', speed: 38, cycle: 1800, // one pomodoro: code for the focus, break for the break
    look: { c: 1, hat: 3, face: 1, fit: 0, sp: 0 },
    stops: [
      { use: 3, wait: 1490, say: ['in the zone', 'just one more test...', 'who wrote this? oh. me.'] },
      { use: 6, wait: 3, holdAfter: 1, say: ['break time!', 'espresso o clock'] },
      { x: 560, y: 470 },
      { use: 4, wait: 200, holdAfter: 0, say: ['beanbag time', 'ahh. pomodoro break'] },
      { x: 430, y: 452, wait: 60, say: ['love the rain', 'thunder! cool'] },
      { x: 530, y: 470 }, { x: 530, y: 540 },
    ],
    chat: ['shh, focus time', 'the build is fine. probably.', 'talk to the duck, it helps', 'kanban board is by the neon', 'never deploy on a friday. unless...', 'the cat sleeps on the warmest laptop'],
  },
];

// A routine flattened into timed segments: walk from A to B, or wait at a stop.
interface Seg { t0: number; t1: number; ax: number; ay: number; bx: number; by: number; stop: Stop | null; idx: number; hold: number }
export interface Npc { def: NpcDef; av: Avatar; segs: Seg[]; cycle: number; seg: number; faceUntil: number; faceDir: 1 | -1; lastSip: number }

function build(def: NpcDef, room: Room): { segs: Seg[]; cycle: number } {
  const segs: Seg[] = [];
  const at = (s: Stop): [number, number] => (s.use !== undefined ? [room.spots[s.use].sx, room.spots[s.use].sy] : [s.x ?? 0, s.y ?? 0]);
  let t = 0, [px, py] = at(def.stops[def.stops.length - 1]), hold = 0;
  // hold state at the start of the loop = what the last stop leaves you with
  for (const s of def.stops) if (s.holdAfter !== undefined) hold = s.holdAfter;
  def.stops.forEach((s, idx) => {
    const [x, y] = at(s), d = Math.hypot(x - px, y - py);
    if (d > 0.5) { segs.push({ t0: t, t1: t + d / def.speed, ax: px, ay: py, bx: x, by: y, stop: null, idx, hold }); t += d / def.speed; }
    if (s.wait) { segs.push({ t0: t, t1: t + s.wait, ax: x, ay: y, bx: x, by: y, stop: s, idx, hold }); t += s.wait; }
    if (s.holdAfter !== undefined) hold = s.holdAfter;
    px = x; py = y;
  });
  if (def.cycle && def.cycle > t) { segs.push({ t0: t, t1: def.cycle, ax: px, ay: py, bx: px, by: py, stop: { wait: def.cycle - t }, idx: def.stops.length, hold }); t = def.cycle; }
  return { segs, cycle: t };
}

export class Npcs {
  readonly list: Npc[] = [];

  constructor(rooms: Record<RoomId, Room>) {
    for (const def of DEFS) {
      const { segs, cycle } = build(def, rooms[def.room]);
      const av = makeAvatar(def.id, def.name, def.look, segs[0].ax, segs[0].ay, false, -9);
      av.npc = true;
      this.list.push({ def, av, segs, cycle, seg: -1, faceUntil: -9, faceDir: 1, lastSip: 0 });
    }
  }

  inRoom(id: RoomId): Npc[] { return this.list.filter((n) => n.def.room === id && (!n.def.season || n.def.season === season())); }

  /**
   * Put every NPC where the clock says. `taken(i)` = a player is using spot i in the NPC's room
   * (only known for the room you're in). `here` = the room you're in (NPCs only talk there).
   */
  update(rooms: Record<RoomId, Room>, here: RoomId, now: number, taken: (i: number) => boolean): void {
    const T = Date.now() / 1000;
    for (const n of this.list) {
      const room = rooms[n.def.room], av = n.av, u = T % n.cycle, lap = Math.floor(T / n.cycle);
      let i = n.segs.findIndex((s) => u >= s.t0 && u < s.t1); if (i < 0) i = n.segs.length - 1;
      const s = n.segs[i], k = s.t1 > s.t0 ? (u - s.t0) / (s.t1 - s.t0) : 1;
      let x = s.ax + (s.bx - s.ax) * k, y = s.ay + (s.by - s.ay) * k, use = -1, hold = s.hold;
      const moving = !s.stop;
      if (s.stop?.use !== undefined) {
        const sp = room.spots[s.stop.use];
        if (!(here === n.def.room && taken(s.stop.use))) { use = s.stop.use; x = sp.x; y = sp.y; }
      }
      const d = Math.hypot(x - av.x, y - av.y);
      if (moving) { av.walkDist += d; if (Math.abs(s.bx - s.ax) > 1) av.dir = s.bx > s.ax ? 1 : -1; }
      else if (av.moving) av.stopT = now;
      if (now < n.faceUntil) av.dir = n.faceDir;
      av.moving = moving; av.x = x; av.y = y; av.hold = hold;
      const pose = n.def.ghost ? POSE_GHOST : !moving ? s.stop?.pose ?? 0 : 0; if (pose !== av.pose) { av.pose = pose; av.poseT0 = now; }
      if (use !== av.use) { av.use = use; av.useT0 = now; }
      if (av.emote && now - av.emote.t0 > emoteDur(av.emote.kind)) av.emote = null;
      // arriving at a stop: say something (only if you're there to hear it)
      if (i !== n.seg) {
        const first = n.seg === -1; n.seg = i;
        if (!first && s.stop?.say && here === n.def.room) say(av.id, s.stop.say[Math.floor(h1(lap * 7.3 + i) * s.stop.say.length)], now, false);
      }
      // sip while lounging with a mug
      if (!moving && hold > 0 && s.stop?.use !== undefined && room.spots[s.stop.use].kind === 'sit') {
        const beat = Math.floor(T / 4.5);
        if (beat !== n.lastSip) { n.lastSip = beat; if (h1(beat + n.cycle) < 0.7 && !av.emote) av.emote = { kind: useEmote(hold), t0: now }; }
      }
    }
  }

  /** A player said hi: turn to face them, wave, and answer. */
  talk(n: Npc, fromX: number, now: number): void {
    n.faceDir = fromX < n.av.x ? -1 : 1; n.faceUntil = now + 4;
    if (!n.av.emote) n.av.emote = { kind: 'wave', t0: now };
    say(n.av.id, n.def.chat[Math.floor(Math.random() * n.def.chat.length)], now, false);
  }
}
