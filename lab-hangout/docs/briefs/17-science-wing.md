# Step 17 — The Science Wing: design brief

The second step built to the polish standard (ART_STYLE §9). Josh agreed the outline:
- the reactor is one room, with the pool behind glass and a way down onto the core floor
- chem potions change you for everyone
- the reactor powers the city: a board on the Square, and flickering lights after a meltdown
- two pushes: the corridor and reactor first, then the chem lab

**In one line:** walk off the right side of the Lab into a gleaming science corridor. Behind the blast door is a
reactor you run together, keeping a glowing blue pool calm while the city's lights depend on you. The chem lab
next door (push 2) is for mixing things and seeing what happens.

---

## 1. Getting there

- **From the Lab:** walk off its **right edge**, past the arcade cabinet (an edge exit, like the Square onto the Pier).
  - The Lab gets a doorway there: a steel frame with yellow and black hazard tape round it, and a hanging sign reading
    **SCIENCE WING →**, lit, on two little chains.
  - A floor sticker arrow points the way.
- **The map:** the wing appears as a low white annex beside the Lab tower, with a small **cooling tower** that puffs
  steam, more of it while a shift is running. The corridor, the reactor (and later the chem lab) are places on the map,
  and EXPLORER gains them. Anyone who already has the badge keeps it.

## 2. THE SCIENCE WING (the corridor) — 1200 × 660

A bright, clean hallway. It's the calm before the reactor.

```
 ceiling: long fluorescent tubes (one buzzes and flickers), a grille of air vents, cable trays
 ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 │ ← LAB   [lockers x6]  [ REACTOR ]   [notice  [ CHEM LAB ]  [eyewash] [TESLA LAB] [WIND TUNNEL] │
 │  (open    one open,    blast door   board]   glass door              OPENING    OPENING      │
 │   edge)   lab coat     hazard        trophy   beaker sign             SOON       SOON         │
 │           inside       stripes,      case                             (taped)    (taped)      │
 │                        badge reader                                                          │
 │ ════ floor: pale grey tiles, yellow walking lines, a painted arrow per door ══════════════════│
 └──────────────────────────────────────────────────────────────────────────────────────────┘
```

**The walls**, in three layers:
- **Structure:** white wall panels with seams and screw heads, a teal band at hand height (the Lab's colours, so it
  feels like the same building), and a dark skirting board.
- **Fixtures:**
  - a row of six grey **lockers**; one hangs open with a lab coat and a rubber duck inside
  - the **REACTOR** blast door: heavy, round-cornered, yellow and black hazard stripes, a porthole, and a badge reader
    whose LED blinks
  - the **CHEM LAB** door: glass, frosted, with a bubbling-flask sign (in push 1 it's taped over:
    *FITTING THE FUME HOODS · BACK SOON*)
  - an **eyewash station** (green sign, a little basin)
  - a **fire extinguisher**
  - two doors with **OPENING SOON** tape crossed over them: TESLA LAB and WIND TUNNEL
- **Clutter:**
  - safety posters: GOGGLES ON!, NO RUNNING NEAR THE CORE, and a cartoon critter in a hard hat giving a thumbs up
  - a **notice board**: a rota, a lost-glove notice, "WHO KEEPS MIXING THE BLUE ONES?"
  - an **EXPERIMENT OF THE MONTH** trophy case with a tiny golden beaker
  - a water cooler that glugs now and then
  - a potted cactus in a hard hat

**Alive:**
- the flickering tube
- the badge reader's LED
- the water cooler's bubble
- a **RADIATION** display by the reactor door that reads NORMAL in green (during a meltdown: *UH OH* in flashing red)
- a little floor-cleaning robot doing laps, the Lab's vacuum's cousin, which bumps and turns

**Sounds:** a soft fluorescent hum, the cooler's glug, the robot's whirr, and a heavy hiss-clunk from the blast door as you go through.

## 3. THE REACTOR — 1500 × 700

One big room. **The control room** is on the left. Down the middle runs **a thick glass wall** with an airlock
doorway in it. On the right is **the reactor hall**: the pool, the core, the pipes, the turbine.

```
   CONTROL ROOM (x 0-640)                       │ glass │  REACTOR HALL (x 700-1500)
 ┌──────────────────────────────────────────────┤ wall  ├────────────────────────────────────────────┐
 │  THE BIG BOARD: HEAT gauge · POWER vs CITY   │ with  │  gantry crane holding the control rods      │
 │  DEMAND graph · faults · clock · GRID %      │ an    │  ┌──────── THE POOL ────────┐   TURBINE     │
 │                                              │ air-  │  │ glowing blue water        │  (big green   │
 │ [door] [START   [SCRAM  [RODS]  [COOL-  [TUR-│ lock  │  │ the core at the bottom,   │   drum, spins │
 │  in     SHIFT    big red         ANT]   BINE]│ door  │  │ fuel rods, bubbles        │   with the    │
 │         board]   button]                     │       │  └──────────────────────────┘   power)      │
 │ ═══ floor: dark rubber, hazard lines ════════│       │ ═══ walkway: steel grating; pipes, valves ══ │
 └──────────────────────────────────────────────┴───────┴────────────────────────────────────────────┘
```

**The control room**
- Dark teal panels, rows of little lamps, chunky 70s-style consoles (knobs, toggles, lit buttons, dials with
  twitching needles).
- A **coffee mug** ring on one desk, a sticky note reading *DON'T PRESS THE RED ONE (unless)*, a rubber plant.
- The **BIG BOARD** on the wall above the desks. Everyone reads it, so it's the heart of the co-op:
  - a vertical **HEAT** bar (green → amber → red)
  - a scrolling **POWER vs CITY DEMAND** graph (two lines: the city's demand in gold, your output in cyan)
  - the **GRID %** (how well you've matched demand this shift)
  - the shift clock
  - a list of **FAULTS** on the floor, each blinking by its location
- Four **stations**, each a spot with its own chunky console:
  1. **SCRAM:** a big red mushroom button under a flip-up glass cover. It slams the rods in: heat drops fast and power
     falls to zero. It saves you from a meltdown but costs you grid. 10 s before the rods can come out again.
  2. **RODS:** a lever and a 10-step display. Rods out = more power *and* more heat.
  3. **COOLANT:** three pump switches with spinning pump icons. More pumps = more cooling.
  4. **TURBINE:** a big valve wheel (0-10). It turns heat into power for the city, and draws a little heat too.
  - At a station, **1 / 2** (or the on-screen ▼ ▲ buttons) turn it down or up, like the Stage's instruments. You
    can still see the room and the big board while you do it.
- **START SHIFT:** a clipboard board by the door, where you clock in (like the Diner's time clock).

**The glass wall and the airlock**
- Thick glass with a faint green-blue reflection and wired glass lines. The hall glows through it.
- The airlock doorway in the middle has hazard edges and a light over it (green = safe, red = a meltdown's on).
- **Walking through it puts you in a hazmat suit** (drawn over your critter, like helmets on the Moon), and walking
  back takes it off. It's just the rule of the hall. The **HAZMAT suit you can wear anywhere** is the reward in §5.

**The reactor hall**
- **THE POOL:** a tall glass-fronted tank set into the back wall, full of water with a **Cherenkov-blue glow** (real
  pool reactors glow exactly this blue).
  - At the bottom is the **core**, a grid of fuel assemblies. Above it the **control rods** hang from a yellow gantry
    crane and move up and down with the RODS setting.
  - Bubbles rise.
  - The glow brightens with the heat and throws blue light onto the walkway and anyone standing on it.
  - In a **meltdown** it all turns acid green.
- **Pipes:** fat insulated pipes along the walls, with valves, pressure gauges, and steam wisps at the joints.
- **The TURBINE** at the far right: a big green drum on a plinth. It spins with the power output, hums louder with it,
  and has a POWER meter on its side.
- **Walkway:** steel grating with a yellow edge. A rubber duck lives on a pipe. Nobody knows how.
- **Where faults happen** (spots that only light up when something's wrong):
  - **PIPE LEAK:** steam jets from a pipe joint. Coolant works at half strength until someone **PATCHES** it.
  - **STUCK VALVE:** the turbine valve sticks and the TURBINE station can't be changed until someone **UNSTICKS** it.
  - **PIGEON IN THE VENT:** a pigeon has got into the cooling vent (coo!). Heat creeps up faster until someone
    **SHOOS** it out, and it flies off across the hall.
  - **TRIPPED BREAKER:** a breaker box sparks and the pumps go dead until someone **FLIPS** it back.
  - **GOO SPILL:** a small green puddle. It does nothing to the reactor, but **MOP** it for points (it's a reactor,
    things drip).
- A small window high up shows the sky (day or night, like the Square), so you can see why demand is rising.

**Alive everywhere:** needles twitch, lamps blink, the graph scrolls, bubbles rise, the turbine spins, steam wisps
drift, the crane's rods move, and alarms strobe amber and then red.

## 4. A shift (the game)

**Starting:** clock in at START SHIFT. You play 1-4 (more can join by pressing E at any station or fault). A shift
lasts **4 minutes**.

**The numbers** (tuned by simulating hundreds of shifts before it ships):
- **HEAT** (0-100%): rods out heat it up; coolant and the turbine cool it down. Anything above 85% is a warning, and
  100% held for 3 s is a **meltdown**.
- **POWER** (MW) = turbine × heat. Cold water makes no power.
- **CITY DEMAND:**
  - about 40 MW by day and up to ~85 MW at night: when the Square's lights come on, the city wants more
  - plus little surprises from the shift's seed, such as *THE ARCADE'S TOURNAMENT JUST STARTED* (+15 MW for 20 s)
- **GRID %:** each second, how close POWER is to DEMAND. The shift's score is the average.
- **Faults:** one every ~35 s playing alone, ~20 s with four, picked from the shift's seed.

**What makes it co-op:** four stations, and the faults are on the other side of the glass. One player can do it all by
running back and forth, but with friends you split up. Someone reads the board and calls out, someone runs the floor
in a suit, someone rides the rods. It also works well as a shouting game over chat.

**The meltdown (cartoon, never scary):**
- klaxons, red strobes, and the RADIATION sign in the corridor goes *UH OH*
- the pool turns green and **BLORPs**: a wave of glowing goo slops over the walkway, and a rubber duck surfs out on it
- **everyone in the Science Wing glows green for a minute**
- the shift ends with the grid halved, and there's a *MELTDOWN* line on the board

**The end:** GRID % · faults fixed · the verdict (CITY LIGHTS ON! / A BIT FLICKERY / BLACKOUT). The best shift goes
on the board by the door.

**Networking** (the Diner's way, which already works): whoever clocks in **hosts**.
- The reactor's state is a room value: settings, which faults are fixed, and a snapshot of the heat and grid at a
  moment.
- Everyone works the numbers forward from that snapshot with the same maths, so the board moves smoothly without a
  stream of messages.
- Others send a tiny "I turned the rods up" / "I fixed the leak" message, and the host applies it and sends the state.
- The faults and demand come from the clock and the seed, never sent.
- If the host walks out, the next player takes over.

That's a few messages a second at most, and only during a shift.

## 5. Rewards

- **Tokens:** `reactor_pay` on the server, like the Diner's tips.
  - nothing under 40% grid
  - otherwise 1 + grid/25 (at most 5 a shift)
  - once per shift, 15 a day
- **The HAZMAT SUIT** (outfit): grid 80%+ in a shift. Yellow suit, black boots and gloves, a round visor.
- **Badge CHIEF ENGINEER:** 90%+ grid in a shift.
- **Daily quest:** *Run a reactor shift*.
- **The board by the door:** the best shift on this server (like the Diner's).

## 6. The city tie-in

- **POWERED BY THE LAB REACTOR:** a small lit sign on the Square (on the Lab's wall, under the LAB neon). It glows
  while a shift is running, with a little lightning bolt.
- **Meltdown:** the Square's street lamps and signs **flicker for about 4 seconds** for everyone there, and the
  corridor's RADIATION display shows UH OH.
- **The map:** the cooling tower steams harder during a shift, and flickers green for a minute after a meltdown.
- These go over the lobby channel: one message when a shift starts, one on a meltdown, one when it ends.

## 7. The chief engineer: **CHIEF ROD**

- A stocky critter in a white hard hat and an orange hi-vis vest, with a clipboard and a pencil behind the ear.
- **Their day:** paces between the consoles and the glass, taps a gauge, sips coffee, and stares proudly at the pool.
  During a shift they stand by the big board and call out advice.
- **Lines when you talk to them:**
  - "Rods out, more power. And more heat. Mostly heat."
  - "The city wants more at night. Everyone's streaming cat videos."
  - "Big red button's the SCRAM. Only when it's really, really bad."
  - "If the pool turns green, that's... fine. Probably fine."
  - "There was a pigeon in the vent last week. I named him Gerald."
  - "Suits on past the glass. House rules."
- **During a shift:** "Watch the heat!" · "Nice and steady!" · "Leak on the floor!" · "Gerald's back!"
- **After a meltdown:** "Well. That's one for the logbook."

## 8. Sounds

- **Control room:** a low hum, relay clicks, a soft radar-like blip every few seconds.
- **The hall:** deep water hum, bubbling, pipe groans now and then, the turbine's whine rising with the power.
- **Stations:**
  - lever clunks for the rods
  - pump switches: toggles, then a motor spinning up
  - the turbine: the valve wheel squeaking
  - SCRAM: a huge THUNK, then a falling whoosh
- **Faults:**
  - a hiss for the leak
  - coo for the pigeon, then a flap as it's shooed
  - a spark crackle for the breaker
  - a squelch for the goo
- **Alarms:** an amber beep, then the red klaxon.
- **The BLORP.**
- **End of shift:** a chime for a good one, a sad trombone for a blackout.
- **Music:** a new track, *CRITICAL MASS*: slow pulsing synth that picks up tempo with the heat.

## 9. THE CHEM LAB (push 2) — 1100 × 680

- **The room:**
  - white tiles, **fume hoods** with glowing sashes, shelves of **8 reagents** in coloured flasks
  - two **benches** with burners, a **recipe book** on a lectern, an emergency shower (pull the chain: a splash)
  - a periodic table poster of critter elements
  - a goggles dispenser (take a pair: the **LAB GOGGLES** face item)
  - a skeleton model in a lab coat
- **The reagents:** FIZZ SALT, BLUE GOO, SPARK DUST, SLIME BASE, RAINBOW OIL, BUBBLE JUICE, GLOW POWDER, CRITTER TONIC.
- **Mixing:** pick 2 or 3 at a bench. Each combination is one of about 20 reactions: coloured smoke, foam volcano,
  sparkles, a small BANG (fur frazzled for 10 s), a fizzing mess, or a **potion**.
- **Potions** (seen by everyone, ~30 s): **TINY**, **HUGE**, **RAINBOW** (your colour cycles), **GLOWING** (you light up
  the room), **FLOATY**, **BUBBLES** (you leave bubbles behind).
- **Two-chemist reactions:** the same mix at both benches within 3 s makes something big. ELEPHANT TOOTHPASTE
  fills the room with foam, and there's a confetti cannon.
- **The recipe book** fills as you discover reactions; the **CHEMIST** badge is for all of them, plus a daily quest.
- **Its NPC:** PROF. FIZZ from the Lab moves in part-time, which is how they got the name.
- **Its own migration** (`0022`) adds the quest and the badge.

## 10. Build, cost and checks

**Push 1:**
- new rooms: the corridor (`wing`) and the reactor (`reactor`)
- the Lab's doorway
- the map: the annex and cooling tower, and the new places
- the Square's sign
- the HAZMAT suit, CHIEF ROD, the music
- **`0021_reactor.sql`:** `reactor_pay`, the quest, the CHIEF ENGINEER badge

**Push 2:** the chem lab and `0022_chem.sql`.

**Performance:** backdrops are baked; only needles, the graph, the water and the people are drawn live. It has to hold
60 fps with 12 bots.

**Tests:**
- the reactor's maths simulated for hundreds of shifts, to check it's winnable and that faults matter
- SQL suites
- golden fingerprints for the new rooms
- a two-player shift (host hand-over, a fault fixed by the non-host)
- every door walked, not only jumped through
- 3× close-ups by day and night

---

## As built: push 1 (the corridor and the reactor)

- **Everything came down to eye level.** The first screenshots showed the camera only sees ~150 px above your feet,
  so signs, posters and the big board were too high. Both rooms were rebuilt with doors ~105 px tall, signs just
  over them, and a shallower floor. At a station the camera frames THE BIG BOARD (like the Cinema's screen). On a
  phone it frames the part over your console, and the banner carries GRID, HEAT and MAKING / NEED MW.
- **The numbers were tuned by simulating 300 shifts for each kind of player:**
  - doing nothing: 33% by day, 7% at night
  - a careless player: 65-72%
  - ignoring faults: 73-81%
  - a good solo player: 84%
  - a good crew of 2-4: 88-90%
  - reckless: always melts down

  So the HAZMAT SUIT (80%) takes solid play and CHIEF ENGINEER (90%) takes a team. A shift starts under-powered on
  purpose: the start message says to raise the RODS and TURBINE until MAKING matches NEED.
- **SCRAM takes two presses** (the cover, then the button), so nobody hits it by accident.
- **CHIEF ROD's hi-vis vest** is a new outfit, the HI-VIS VEST, free for everyone in Look.
- **The music, CRITICAL MASS,** has three versions (calm, warm, critical) that take over as the core heats up.
- **The Square's meltdown brownout** dims and blinks the whole Square (lamps included) for 4 s. The POWERED BY sign
  sits on the Lab's wall, beside the door.
- **On the map,** the Science Wing is a white annex beside the Lab tower, with the cooling tower behind it. The
  corridor and the reactor are places, and EXPLORER now counts them (anyone who has the badge keeps it).
- **Tested:**
  - a two-player shift in real browser windows (a station worked by the non-host and applied by the host, the same
    numbers in both, a fault fixed on the floor, the host walking out and the other taking over, the end: pay +
    HAZMAT + CHIEF ENGINEER + the best-shift board, a meltdown seen by both at the same instant)
  - every door walked both ways, and the glass wall and airlock gap
  - 60 fps at CPU ×4 slower (the reactor about as busy as the Square)
  - a phone's pad
