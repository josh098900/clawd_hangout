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
interface NpcDef { id: string; name: string; room: RoomId; look: Look; speed: number; stops: Stop[]; chat: string[]; /** only around in this season (see world/season.ts) */ season?: string; /** always a sheet ghost */ ghost?: boolean; /** pad the loop to exactly this long (s), to line up with a wall-clock cycle */ cycle?: number; /** only around while this is true (T = wall-clock seconds): PROF. FIZZ splits the day between two rooms */ when?: (T: number) => boolean }

/** PROF. FIZZ works part-time in the chem lab: the last 6 minutes of every 20 (both routines loop every 120 s, so the switch comes as one loop ends: Fizz walks out of the Lab's SCIENCE WING doorway and in at the chem lab's door, and back). */
export const fizzInChem = (T: number): boolean => T % 1200 >= 840;

const DEFS: NpcDef[] = [
  // ---- THE AIRPORT and ICELAND (step 19): the crew keep to the plane's clock (game/air.ts: a leg every 300 s), everyone else to a gentle routine ----
  {
    id: 'npc-dot', name: 'DOT', room: 'airport', speed: 30, cycle: 240,
    look: { c: 3, hat: 0, face: 0, fit: 2, sp: 0 },
    stops: [{ x: 370, y: 474, wait: 150, say: ['next, please!', 'window or aisle? the computer decides'] }, { x: 250, y: 474, wait: 40, say: ['desk one, open!'] }, { x: 370, y: 474, wait: 30 }],
    chat: ['check in at any desk: your BOARDING PASS prints right away', 'LAB AIR: we\'ve tested flying. several times', 'pack a jumper. iceland is not warm. ever', 'the flight\'s free! the pretzels are free! the legroom is... there'],
  },
  {
    id: 'npc-buzz', name: 'OFFICER BUZZ', room: 'airport', speed: 26, cycle: 180,
    look: { c: 5, hat: 0, face: 3, fit: 11, sp: 0 },
    stops: [{ x: 884, y: 498, wait: 120, say: ['arms up if it beeps!', 'next!'] }, { x: 786, y: 498, wait: 30, say: ['nice and orderly, folks'] }, { x: 884, y: 498, wait: 20 }],
    chat: ['walk through the arch. anything metal and it beeps', 'the x-ray shows what\'s in your hands. one lady had a MOON ROCK', 'no liquids over 100 ml. potions count. i don\'t make the rules', 'it\'s always the hat. always'],
  },
  {
    id: 'npc-ray', name: 'RAY', room: 'airport', speed: 30, cycle: 600,
    look: { c: 8, hat: 0, face: 0, fit: 2, sp: 0 },
    stops: [{ x: 1420, y: 474, wait: 500, say: ['now boarding LA101 to keflavik!', 'last call for LA101!', 'next flight soon: grab a coffee'] }, { x: 1470, y: 480, wait: 60, say: ['anyone lost a neck pillow?'] }, { x: 1420, y: 474, wait: 10 }],
    chat: ['GATE A1: LA101 to keflavik. the jet bridge opens when it boards', 'a flight every ten minutes. never late. mostly', 'stay aboard when you land and you fly straight back', 'the window seats see the northern lights on the night flights'],
  },
  {
    id: 'npc-wings', name: 'CAPTAIN WINGS', room: 'airport', speed: 40, cycle: 600, when: (T) => { const k = ((T % 600) + 600) % 600; return k >= 545 || k < 2; },
    look: { c: 1, hat: 18, face: 3, fit: 3, sp: 0 },
    stops: [{ x: 1260, y: 520, wait: 545 }, { x: 1830, y: 490, wait: 20, say: ['morning! lovely day for it', 'see you up there, folks'] }],
    chat: ['i\'ve flown this route a thousand times. the lights still get me', 'no, you can\'t sit in the cockpit. ...maybe next time', 'eleven thousand metres. you can see the curve of the world'],
  },
  {
    id: 'npc-penny', name: 'PENNY', room: 'plane', speed: 50, cycle: 300,
    look: { c: 6, hat: 0, face: 0, fit: 2, sp: 0 },
    stops: [
      { x: 1000, y: 540, wait: 86, say: ['welcome aboard!', 'any seat, dear. well. your seat'] },
      { x: 700, y: 546, wait: 22 },
      { x: 110, y: 530, wait: 30, say: ['kettle\'s on'] },
      { x: 226, y: 546, wait: 5 }, { x: 346, y: 546, wait: 10 }, { x: 466, y: 546, wait: 10 }, { x: 586, y: 546, wait: 10 }, { x: 706, y: 546, wait: 10 }, { x: 826, y: 546, wait: 10 }, { x: 944, y: 546, wait: 10 },
      { x: 980, y: 540, wait: 1 },
    ],
    chat: ['press the call button and i\'ll come. eventually', 'juice, coffee, or juice?', 'the lavatory\'s at the back. mind the door, it sticks', 'your nearest exit may be behind you. i mean it'],
  },
  {
    id: 'npc-gunni', name: 'OFFICER GUNNI', room: 'kef', speed: 24, cycle: 300,
    look: { c: 2, hat: 0, face: 1, fit: 13, sp: 0 },
    stops: [{ x: 830, y: 478, wait: 280, say: ['next!', 'godan daginn!'] }, { x: 812, y: 478, wait: 20 }],
    chat: ['passport, please. first time? everyone gets one', 'godan daginn means good day. takk means thanks', 'purpose of your visit? hot dogs? good answer', 'the bus into town is out the doors on the right'],
  },
  {
    id: 'npc-hekla', name: 'HEKLA', room: 'reykjavik', speed: 30, cycle: 240,
    look: { c: 4, hat: 2, face: 0, fit: 13, sp: 0 },
    stops: [{ x: 250, y: 486, wait: 170, say: ['information! ask me anything', 'look north tonight'] }, { x: 110, y: 500, wait: 30, say: ['the airport bus goes from here'] }, { x: 250, y: 486, wait: 20 }],
    chat: ['clear and dark? look north! the lights come out a minute after dark', 'the forecast board tells you tonight\'s KP. seven or more is a STORM', 'takk means thanks. bless means bye', 'i\'m named after a volcano. she\'s quiet. mostly', 'the tour bus leaves from right here: waterfalls, black beaches, glaciers...', 'see the church up the hill? take the lift up the tower'],
  },
  {
    id: 'npc-sigga', name: 'SIGGA', room: 'reykjavik', speed: 20, cycle: 200,
    look: { c: 9, hat: 13, face: 0, fit: 0, sp: 0 },
    stops: [{ x: 1320, y: 486, wait: 180, say: ['one with everything?', 'hot dogs! the best in town'] }, { x: 1300, y: 486, wait: 20 }],
    chat: ['one with everything: crispy onions, raw onions, ketchup, sweet mustard, remoulade', 'a famous visitor once had one with just mustard. we don\'t talk about it', 'the gulls want your hot dog. don\'t let them have it'],
  },
  {
    id: 'npc-oli', name: 'OLI', room: 'reykjavik', speed: 22, cycle: 300,
    look: { c: 7, hat: 18, face: 4, fit: 13, sp: 0 },
    stops: [{ x: 1872, y: 524, wait: 220, say: ['mending nets. always mending nets'] }, { x: 1740, y: 528, wait: 50, say: ['whales out there today. i can feel it'] }, { x: 1872, y: 524, wait: 30 }],
    chat: ['if you don\'t like the weather, wait five minutes', 'the puffins come back in the spring. the whales never really leave', 'caught a cod this big once. no, BIGGER', 'the whale boat\'s going out soon. i\'ll believe it when i see it'],
  },
  // ---- THE SOUTH COAST (step 19, push 2): KATLA on the tour bus (STEFÁN drives: he's drawn at the wheel), the ranger at Reynisfjara, the café's cook ----
  {
    id: 'npc-katla', name: 'KATLA', room: 'tourbus', speed: 30, cycle: 280,
    look: { c: 3, hat: 2, face: 0, fit: 13, sp: 0 },
    stops: [{ x: 1030, y: 500, wait: 190, say: ['velkomin! sit anywhere', 'next stop coming up'] }, { x: 600, y: 552, wait: 40, say: ['anyone need anything?', 'window seats are the best seats'] }, { x: 1030, y: 500, wait: 20 }],
    chat: ['i\'m named after the volcano under myrdalsjokull. she\'s overdue. so am i, for lunch', 'stay aboard and you go round the whole loop', 'get off anywhere: the bus comes back round in about six minutes', 'stefan has driven this road four thousand times. he still slows down for the sheep', 'tractor eggs. those white bales. ask me why'],
  },
  {
    id: 'npc-ranger', name: 'RANGER', room: 'beach', speed: 26, cycle: 260,
    look: { c: 1, hat: 2, face: 0, fit: 11, sp: 0 },
    stops: [{ x: 1060, y: 532, wait: 150, say: ['keep back from the water', 'no, further'] }, { x: 1320, y: 544, wait: 70, say: ['the sea doesn\'t care how good the photo is'] }, { x: 1060, y: 532, wait: 20 }],
    chat: ['keep well back from the sea. the big ones come without warning', 'the light\'s yellow most days. in a gale it goes red', 'never turn your back on the sea. never', 'the puffins are on the cliff at the end. bring your camera'],
  },
  {
    id: 'npc-cook', name: 'THE COOK', room: 'beach', speed: 20, cycle: 300,
    look: { c: 6, hat: 13, face: 0, fit: 0, sp: 0 },
    stops: [{ x: 1642, y: 488, wait: 280, say: ['kjotsupa! hot!', 'soup\'s on'] }, { x: 1660, y: 492, wait: 20 }],
    chat: ['kjotsupa: lamb, swede, carrots, potatoes. that\'s all. that\'s enough', 'your grandmother\'s recipe. if your grandmother was icelandic', 'got soaked by the sea? soup. it\'s always soup'],
  },
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
      { x: 930, y: 520, wait: 3, say: ['is that bubbling i hear?', 'the chem lab calls. soon', 'smells like soup through there'] }, // by the SCIENCE WING doorway (Fizz goes off to the chem lab from here)
    ],
    cycle: 120, when: (T) => !fizzInChem(T),
    chat: ['welcome to the lab!', 'try the coffee machine', 'the sofa has great lumbar support', 'i am 87% sure the plan is ???', 'have you seen the dragon outside?', 'careful, the arcade is addictive', 'zero days without slop. sigh.', 'i do a few hours in the chem lab too. through the science wing'],
  },
  {
    // PROF. FIZZ in the chem lab (part-time: see fizzInChem), in their lab coat and the LAB GOGGLES
    id: 'npc-fizz-chem', name: 'PROF. FIZZ', room: 'chem', speed: 40,
    look: { c: 2, hat: 0, face: 9, fit: 1, sp: 0 },
    stops: [
      { x: 150, y: 500 },
      { x: 470, y: 486, wait: 14, say: ['hmm. needs more fizz', 'ooh, that one is glowing. is that new?', 'hood 1 is my favourite hood'] },
      { x: 640, y: 482, wait: 10, say: ['we\'re low on bubble juice again', 'who labelled this one YUM?', 'eight reagents. endless possibilities. mostly brown'] },
      { x: 662, y: 546, wait: 8, say: ['page 7 is just a doodle of a duck', 'i should write that one down', 'the book never lies. it just leaves things out'] },
      { x: 1010, y: 522, wait: 8, say: ['morning, Boney', 'Boney, your goggles are on your head again', 'he is a very good listener'] },
      { x: 1000, y: 486, wait: 6, say: ['hello, Sir Bubbles', 'blub to you too'] },
      { x: 800, y: 486, wait: 12, say: ['hood 2 smells of soup. again.', 'drip... drip...', 'nearly a whole beaker. of what, though?'] },
      { x: 150, y: 500 }, { x: 70, y: 490, wait: 2 },
    ],
    cycle: 120, when: fizzInChem,
    chat: ['welcome to my OTHER lab!', 'mix two or three reagents at a bench and see what happens', 'CRITTER TONIC works on critters. mix it with something...', 'goggles on! the dispenser is by the door', 'if anything goes wrong, the shower is in the corner. it will not. probably.', 'two chemists, the same mix, the same moment... stand well back', 'who keeps mixing the blue ones? ...oh. it is me. it has always been me', 'the recipe book on the lectern fills in as you discover things'],
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
    chat: ['ahoy!', 'fish off the end of the pier', 'wait for the bobber to dip, then REEL', 'legend says there is a MOON FISH out there', 'marshmallows are in the cooler', 'the crabs are harmless. mostly.', 'past the lighthouse there is an AQUARIUM now. they want our catches for their tanks', 'that yellow submarine goes all the way down to the trench now. in MY day we had a rowing boat and a bucket'],
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
      { x: 780, y: 520, wait: 6, say: ['the tank cabinet finally works!', 'bounce your shells off the walls', 'no one there? play the CPU'] },
    ],
    chat: ['welcome to the arcade!', 'the claw costs 3 tokens', 'coins spawn on the Square every 5 minutes', 'got a dupe? you get a token back', 'pong is first to 5', 'check your collection at the prize counter', 'the jukebox by the stairs changes the tune', 'TANK DUEL: first to 5 hits. shells bounce once'],
  },
  {
    id: 'npc-roxy', name: 'ROXY', room: 'subway', speed: 30,
    look: { c: 5, hat: 3, face: 3, fit: 4, sp: 0 },
    stops: [
      { x: 700, y: 630, wait: 50, pose: 1, say: ['this one is called SUBWAY SERENADE', 'tips welcome! (i take smiles)', 'la la la... mind the gap...'] },
      { x: 1100, y: 600, wait: 10, say: ['snack break', 'the red machine never runs out of crisps'] },
    ],
    chat: ['hop on the next train!', 'the ride past the city is the best bit', 'the line goes Square, Park, Diner, then the Kart Track', 'stand behind the yellow line', 'i busk here every day. the acoustics!', 'the board says when the next train is', 'the Diner does a mean milkshake. if you make it yourself'],
  },
  {
    id: 'npc-oak', name: 'OAK', room: 'park', speed: 26,
    look: { c: 6, hat: 7, face: 0, fit: 2, sp: 0 },
    stops: [
      { x: 520, y: 600, wait: 14, say: ['so many leaves...', 'rake, rake, rake', 'lovely day for it'] },
      { x: 760, y: 640, wait: 16, say: ['hello ducks!', 'no bread for you. seeds only', 'quack, i believe, means thank you'] },
      { use: 11, wait: 20, say: ['my favourite bench', 'the fountain never stops'] },
      { x: 1400, y: 720, wait: 10, say: ['who built this castle? magnificent', 'mind the moat'] },
      { x: 1330, y: 540, wait: 8, say: ['good kite weather', 'the wind is up today'] },
    ],
    chat: ['welcome to the park!', 'boats are at the dock, just row back when you are done', 'feed the ducks at the edge of the pond', 'the band plays all day', 'kites fly best when the wind picks up', 'the sandbox is for everyone. build something!', 'the subway stairs are by the gate'],
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
    id: 'npc-cookie', name: 'COOKIE', room: 'diner', speed: 34,
    look: { c: 1, hat: 13, face: 4, fit: 1, sp: 0 },
    stops: [
      { x: 1020, y: 500, wait: 16, say: ['sizzle sizzle', 'flip... and flip', 'six seconds a side. well. six seconds'] },
      { x: 1296, y: 500, wait: 5, say: ['patties, patties...', 'who keeps leaving the fridge open'] },
      { x: 1130, y: 500, wait: 10, say: ['fries are the easy bit', 'shake the basket!'] },
      { x: 822, y: 500, wait: 8, say: ['ORDER UP!', 'table three, your burger!', 'ding ding!'] },
      { x: 420, y: 560, wait: 14, say: ['everything ok here?', 'try the pie. i insist', 'refill?'] },
      { x: 640, y: 500, wait: 6, say: ['i love this song', 'play something with a sax'] },
    ],
    chat: ['welcome to the Greasy Byte!', 'want to cook? CLOCK IN at the time clock by the kitchen', 'fridge for patties, grill them, then BUNS, then the PASS', 'fries: FREEZER, then FRYER. shakes make themselves (almost)', 'burnt stuff goes in the BIN', 'tickets pay tips, and a great shift gets you a hat like mine', 'more cooks means more orders. teamwork!'],
  },
  {
    id: 'npc-flags', name: 'FLAGS', room: 'karts', speed: 36,
    look: { c: 8, hat: 3, face: 3, fit: 4, sp: 0 },
    stops: [
      { x: 1050, y: 500, wait: 14, pose: 1, say: ['green flag! green flag!', 'and they are OFF', 'woo! look at them go'] },
      { x: 430, y: 590, wait: 10, say: ['nice kart. well, it WAS nice', 'who left the tyres here', 'fresh tyres, full tank'] },
      { x: 800, y: 600, wait: 12, say: ['drifting builds a turbo. blue sparks, then orange!', 'the yellow chevrons give you a boost', 'stay off the grass, it is slow'] },
      { x: 240, y: 530, wait: 8, say: ['checking the tyre stacks...', 'safety first. then speed'] },
    ],
    chat: ['welcome to the kart track!', 'press E at a kart to start a race. others can join in the countdown', 'up to 4 racers, CPUs fill the empty spots', 'hold SPACE through a corner to drift, let go for a turbo', 'the yellow chevrons are boost pads', 'three laps. the big screen shows who is winning', 'set the fastest lap and your name goes on the board'],
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
    // the critter from the Cinema's film, A CRITTER IN SPACE (same look: mint, goggles), in a space helmet
    id: 'npc-cosmo', name: 'COSMO', room: 'station', speed: 30,
    look: { c: 0, hat: 14, face: 2, fit: 0, sp: 0 },
    stops: [
      { x: 170, y: 506, wait: 10, say: ['welcome aboard!', 'mind the gap. there is no floor. well, sort of', 'the rocket home leaves from here'] },
      { x: 360, y: 500, wait: 14, say: ['star melons LOVE the pink light', 'grow one, then plant its seed on the roof', 'hello little melon'] },
      { use: 7, wait: 22, say: ['there is home', 'i can see the Square from here!', 'the Moon! i planted a flag on that'] },
      { x: 960, y: 520 },
      { use: 9, wait: 18, say: ['comet spotted!', 'is that... a UFO?', 'nudge it left a bit'] },
      { x: 1260, y: 510, wait: 8, say: ['suit up, the airlock is right here', 'grab some stardust for me'] },
      { x: 700, y: 600, wait: 8, pose: 1, say: ['zero-g dance break!', 'boing'] },
    ],
    chat: ['hi! yes, i am THE critter from A CRITTER IN SPACE', 'press SPACE to push off the floor. wheee', 'grow a STAR MELON in the trays: 3 tokens, ripe in half an hour', 'the melon has a COMET BLOOM seed in it, for the roof garden', 'the airlock takes you on a spacewalk: grab stardust, bring it in, get tokens', 'mission control: find a comet with the telescope', 'the rocket home leaves every 20 minutes', 'the escape pod lands you in the park pond. splash!', 'the LANDER BAY at the far end goes down to the Moon. say hi to LUNA for me!'],
  },
  {
    // the Moon Base's botanist: grows MOON TATERS in the greenhouse, and knows everything about moon rocks
    id: 'npc-luna', name: 'LUNA', room: 'moonbase', speed: 26,
    look: { c: 6, hat: 4, face: 0, fit: 1, sp: 0 },
    stops: [
      { x: 300, y: 500, wait: 16, say: ['grow, little taters', 'moon soil is 90% dust, 10% hope', 'a tomato! on the MOON!'] },
      { x: 460, y: 506, wait: 12, say: ['basil loves the pink light', 'these peas are space peas. obviously'] },
      { use: 6, wait: 3, holdAfter: 8, say: ['snack break', 'the printer only does hot dogs. i have made my peace with it'] },
      { use: 2, wait: 20, holdAfter: 0, say: ['mmm. printed.', 'you get used to the taste'] },
      { x: 1110, y: 500, wait: 12, say: ['let us see what the rocks say', 'purple ones glow brighter at night. or is it day? hard to tell up here'] },
      { use: 4, wait: 24, say: ['there is home', 'earthrise never gets old', 'i can see the Square from here. probably'] },
      { x: 180, y: 520, wait: 8, say: ['suits are on the rack', 'mind the dust on your way in'] },
    ],
    chat: ['welcome to the MOON BASE! i am LUNA, i grow things', 'mine a glowing rock outside, then bring it to the ASSAY machine', 'one in six rocks is a MOON CRYSTAL. five crystals and you get a robot friend', 'the buggy garage is past the big dome. try the course!', 'SPACE for a moon jump. boing, but slowly', 'the lander goes home every 10 minutes. do not get stranded. well, you can always wait'],
  },
  {
    // THE REACTOR's chief engineer: paces the control room, taps gauges, sips coffee, stares proudly at the pool
    id: 'npc-rod', name: 'CHIEF ROD', room: 'reactor', speed: 34,
    look: { c: 8, hat: 1, face: 0, fit: 11, sp: 0 },
    stops: [
      { x: 300, y: 522, wait: 14, say: ['rods look good', 'tap tap. that needle sticks sometimes'] },
      { x: 450, y: 534, wait: 10, say: ['coolant: fine. probably', 'three pumps. three wishes'] },
      { x: 626, y: 546, wait: 16, say: ['look at that glow. beautiful', 'Cherenkov blue. never gets old'] },
      { x: 176, y: 520, wait: 8, holdAfter: 1, say: ['coffee. for science', 'the mug says WORLD\'S OKAYEST ENGINEER'] },
      { x: 572, y: 522, wait: 12, say: ['so many binders', 'volume seven is my favourite'] },
      { x: 380, y: 566, wait: 10, holdAfter: 0, say: ['the big board never lies', 'the city wants more at night'] },
    ],
    chat: ['rods out, more power. and more heat. mostly heat', 'the city wants more at night. everyone\'s streaming cat videos', 'big red button\'s the SCRAM. only when it\'s really, really bad', 'if the pool turns green, that\'s... fine. probably fine', 'there was a pigeon in the vent last week. i named him Gerald', 'suits on past the glass. house rules', 'clock in on the clipboard by the door. 4 minutes a shift', 'at a station: 1 turns it down, 2 turns it up'],
  },
  {
    // THE CITY AQUARIUM's keeper: up the ladder for FEEDING TIME (the first 90 s of every 15 minutes, on the clock: she feeds
    // from the top, so the FEED step at its foot stays free for players), then round the tanks, the jellies and the touch
    // pool (beside it, not in its spot), and a long spell at the CURATOR'S DESK (behind it, facing you); back up the ladder
    id: 'npc-marina', name: 'MARINA', room: 'aquarium', speed: 34, cycle: 900,
    look: { c: 1, hat: 0, face: 10, fit: 1, sp: 0 },
    stops: [
      { x: 1238, y: 380, wait: 90, say: ['dinner time!', 'not you, doris! wait your turn', 'who wants sprats?'] },
      { x: 1222, y: 490 },
      { x: 1000, y: 496, wait: 24, say: ['look at them go', 'doris ate four buckets. four'] },
      { x: 1330, y: 510, wait: 40, say: ['hello, jellies', 'no brains. lucky them'] },
      { x: 1250, y: 560 },
      { x: 1250, y: 596, wait: 25, say: ['gently! two fingers', 'the crab is called CLIVE. he knows what he did'] },
      { x: 552, y: 506, wait: 470, say: ['any catches for the gallery?', 'next!', 'the ledger is nearly full. of empty pages'] },
      { x: 400, y: 494, wait: 30, say: ['these tanks need a wipe', 'squeaky clean'] },
      { x: 700, y: 494, wait: 30, say: ['nearly there...', 'who put a sticker on the glass?'] },
      { x: 150, y: 500, wait: 30, say: ['welcome to the aquarium!', 'admission is free. donations welcome'] },
      { x: 292, y: 500, wait: 30, say: ['anything catch your eye?', 'the shark fin is very popular'] },
      { x: 1222, y: 490 },
      { x: 1238, y: 380 },
    ],
    chat: ['every tank in the gallery is waiting for someone\'s catch. maybe yours', 'the whale shark\'s name is DORIS. gentle giant. mostly giant', 'don\'t tap the glass. the octopus taps back', 'feeding time is every fifteen minutes. grab a scoop!', 'the jellies have no brains. very relaxing company', 'somebody donated a boot. i love it. it is the best boot', 'catch something big off the Pier and bring it to my desk', 'bring me back something from the deep! not a squid. we\'ve got a squid'],
  },
  {
    // SARDINE 1's skipper (the loop is the sub's 8 minutes: game/sub.ts). On the dock by the gangway while it boards ("All aboard!"),
    // up the gangway as the hatch shuts, aboard for the dive (npc-barnacle-sub), and back off it onto the dock as it docks again
    id: 'npc-barnacle', name: "CAP'N BARNACLE", room: 'aquarium', speed: 28, cycle: 480, when: (T) => { const k = T % 480; return k < 66 || k >= 478; },
    look: { c: 7, hat: 18, face: 4, fit: 12, sp: 0 },
    stops: [
      { x: 1548, y: 524, wait: 0.3 },
      { x: 1590, y: 548, wait: 60, say: ['all aboard! mind your heads, she\'s a SARDINE', 'today\'s mission is on the board. i believe in you. mostly', 'up the gangway, in at the hatch, down the ladder', 'tickets? no tickets. just get in'] },
      { x: 1548, y: 524 },
    ],
    chat: ['ahoy! CAP\'N BARNACLE, skipper of SARDINE 1', 'finest sub in the harbour. the only sub, but still', 'she dives every 8 minutes. up the gangway while she\'s boarding', 'we call her SARDINE because it gets cosy in there', 'the escape hatch works. i tested it. once. by accident', 'if you see THE OTHER BOOT, grab it. MARINA\'s been waiting years'],
  },
  {
    // ...and aboard SARDINE 1 for the dive: down the ladder as the hatch shuts, then at the bow beside the wheel (never on a station: that's
    // the AUTOPILOT button on his side), a stroll round the deck mid-dive, and back to the ladder for home
    id: 'npc-barnacle-sub', name: "CAP'N BARNACLE", room: 'sub', speed: 40, cycle: 480, when: (T) => { const k = T % 480; return k >= 66 && k < 478; },
    look: { c: 7, hat: 18, face: 4, fit: 12, sp: 0 },
    stops: [
      { x: 500, y: 506, wait: 68 },
      { x: 962, y: 524, wait: 120 },
      { x: 958, y: 548, wait: 20, say: ['just stretching my legs', 'everything shipshape?', 'who left the kettle on?'] },
      { x: 962, y: 524, wait: 212, say: ['steady as she goes', 'nice work, crew'] },
      { x: 500, y: 506 },
    ],
    chat: ['twenty years i\'ve sailed her. well. six months. feels like twenty', 'ping the sonar in the kelp. seahorses are shy', 'the claw\'s rigged. same people who made the arcade\'s', 'lights off in the deep and wait. something always comes to look', 'if you see THE OTHER BOOT, grab it. MARINA\'s been waiting years', 'the escape hatch works. i tested it. once. by accident', 'take the helm if you like. i\'ll put the kettle on'],
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

  /** Winter: Santa hats for everyone (except COOKIE, who won't give up the chef's hat). */
  dressFor(season: string | null): void {
    for (const n of this.list) { if (n.def.id === 'npc-cookie') continue; n.av.look = season === 'winter' ? { ...n.def.look, hat: 15 } : n.def.look; }
  }
  /** NPCs who've stepped out for now (COOKIE takes a break while players run a kitchen shift). */
  readonly away = new Set<string>();
  /** NPCs walked by hand in THIS browser only (COOKIE giving you the Diner tour): id -> where to walk to. */
  readonly puppet = new Map<string, { x: number; y: number }>();
  /** Let go of a puppet: it walks back to where its routine has got to (instead of jumping there). */
  release(id: string): void { if (this.puppet.delete(id)) this.homing.add(id); }
  private homing = new Set<string>();
  inRoom(id: RoomId): Npc[] { const T = Date.now() / 1000; return this.list.filter((n) => n.def.room === id && (!n.def.season || n.def.season === season()) && (!n.def.when || n.def.when(T)) && !this.away.has(n.def.id)); }

  /**
   * Put every NPC where the clock says. `taken(i)` = a player is using spot i in the NPC's room
   * (only known for the room you're in). `here` = the room you're in (NPCs only talk there).
   */
  update(rooms: Record<RoomId, Room>, here: RoomId, now: number, taken: (i: number) => boolean): void {
    const T = Date.now() / 1000;
    for (const n of this.list) {
      const pp = this.puppet.get(n.def.id);
      if (pp) { // walk straight to the spot we've been told, then stand there
        const av = n.av, dx = pp.x - av.x, dy = pp.y - av.y, d = Math.hypot(dx, dy), st = Math.min(d, (d > 200 ? 200 : 130) / 60); // a brisk jog (a run from far away), one step a frame
        const moving = d > 1.5;
        if (moving) { av.x += (dx / d) * st; av.y += (dy / d) * st; av.walkDist += st; if (Math.abs(dx) > 1) av.dir = dx > 0 ? 1 : -1; }
        else if (av.moving) av.stopT = now;
        if (now < n.faceUntil) av.dir = n.faceDir;
        av.moving = moving; av.use = -1; av.hold = 0; if (av.pose) { av.pose = 0; av.poseT0 = now; }
        n.seg = -1;
        continue;
      }
      const room = rooms[n.def.room], av = n.av, u = T % n.cycle, lap = Math.floor(T / n.cycle);
      let i = n.segs.findIndex((s) => u >= s.t0 && u < s.t1); if (i < 0) i = n.segs.length - 1;
      const s = n.segs[i], k = s.t1 > s.t0 ? (u - s.t0) / (s.t1 - s.t0) : 1;
      let x = s.ax + (s.bx - s.ax) * k, y = s.ay + (s.by - s.ay) * k, use = -1, hold = s.hold;
      const moving = !s.stop;
      if (s.stop?.use !== undefined) {
        const sp = room.spots[s.stop.use];
        if (!(here === n.def.room && taken(s.stop.use))) { use = s.stop.use; x = sp.x; y = sp.y; }
      }
      if (this.homing.has(n.def.id)) { // walking back to the routine after being a puppet
        const hx = x - av.x, hy = y - av.y, hd = Math.hypot(hx, hy);
        if (hd > 4) { const st = Math.min(hd, 130 / 60); av.x += (hx / hd) * st; av.y += (hy / hd) * st; av.walkDist += st; if (Math.abs(hx) > 1) av.dir = hx > 0 ? 1 : -1; av.moving = true; continue; }
        this.homing.delete(n.def.id);
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
  /** Turn to face x for a few seconds. */
  face(n: Npc, x: number, now: number): void { n.faceDir = x < n.av.x ? -1 : 1; n.faceUntil = now + 3; }
  byId(id: string): Npc | undefined { return this.list.find((n) => n.def.id === id); }

  talk(n: Npc, fromX: number, now: number): void {
    n.faceDir = fromX < n.av.x ? -1 : 1; n.faceUntil = now + 4;
    if (!n.av.emote) n.av.emote = { kind: 'wave', t0: now };
    say(n.av.id, n.def.chat[Math.floor(Math.random() * n.def.chat.length)], now, false);
  }
}
