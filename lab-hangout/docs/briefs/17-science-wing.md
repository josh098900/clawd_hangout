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

## 9. THE CHEM LAB (push 2) — 1100 × 660

The outline Josh agreed:
- **The room:**
  - white tiles, **fume hoods** with glowing sashes, shelves of **8 reagents** in coloured flasks
  - two **benches** with burners, a **recipe book** on a lectern, an emergency shower (pull the chain: a splash)
  - a periodic table poster of critter elements
  - a goggles dispenser (take a pair: the **LAB GOGGLES** face item)
  - a skeleton model in a lab coat
- **Mixing:** pick 2 or 3 reagents at a bench; each mix makes one of about 20 reactions (coloured smoke, a foam
  volcano, sparkles, a small BANG that frazzles your fur, a fizzing mess, or a **potion**).
- **Potions** everyone sees, for ~30 s: TINY, HUGE, RAINBOW, GLOWING, FLOATY, BUBBLES.
- **Two-chemist reactions:** the same mix at both benches within 3 s makes something big.
- The **recipe book** fills in as you discover reactions. There's a **CHEMIST** badge, a daily quest, PROF. FIZZ
  part-time, and migration `0022`.

The full design follows.

**In one line:** a bright, bubbling lab where you mix things and see what happens. Every mix does *something*: most do
something silly, and 20 are discoveries for the recipe book. The best ones change how you look for everyone, or need
a friend at the other bench.

### 9.1 Getting there

- **The corridor's CHEM LAB door opens.**
  - The BACK SOON note and its tape come off.
  - The frosted glass now glows a soft green from inside, and the little flask on the sign bubbles.
  - Walk up into it like any door. You come out just inside the lab's door (and back out under it in the corridor).
- **The map:**
  - The Science Wing's white annex gets the chem lab as its left half, with windows that glow potion-green at night.
  - A thin fume stack on its roof puffs a little coloured smoke, a new colour every few seconds.
  - THE CHEM LAB is a place of its own (pick it to go there), and EXPLORER counts it. Anyone who already has the badge
    keeps it.

### 9.2 The room

```
 ceiling: tubes (one hums), the two fume hoods' round ducts going up into it, a sprinkler, a cable tray
 ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
 │[EXIT] [fire   [GOGGLES [SAFETY   [ FUME HOOD 1 ]  [cannon]    [ FUME HOOD 2 ] [PERIODIC  [sink,     │
 │ door  blanket] ON! box] SHOWER]   bubbling flasks  REAGENT     distillation   TABLE OF   drying    │
 │ back  [EXPERIMENTS      pull      on a hot plate   SHELVES     rig, drips     CRITTERS]  rack]     │
 │ out    board]           chain                      (8 flasks)                 SIR BUBBLES          │
 │                                                                                                     │
 │         ~drain~          ┌── BENCH A ──┐   [lectern:     ┌── BENCH B ──┐                  BONEY  │
 │                          │ burner·beaker│   RECIPE BOOK] │ burner·beaker│              (skeleton) │
 │ ════ floor: pale sage lab vinyl, a drain, KEEP CLEAR stripes round the shower, an old purple stain ═│
 └─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Size:** 1100 × 660. The wall runs from y 330 (the ceiling) to y 460 (its base), so all of it stays where the
  camera looks (ART_STYLE §9.6). The floor you walk on is y 472–628.
- **The benches stand out in the room like islands.** You stand *behind* a bench, facing everyone, like a science demo
  on TV. The beaker and burner are in front of you, so your reaction goes off between you and the room.

**The walls, in three layers:**
- **Structure:**
  - white square tiles with grey grout, and a row of mint-green tiles at hand height (the chem lab's own colour)
  - a dark skirting board
  - the two fume hoods' round steel ducts rising into the ceiling
- **Fixtures:**
  - **FUME HOOD 1** (behind bench A): a steel cabinet with a glowing glass sash. Inside, two flasks bubble on a
    hot plate, a fan turns at the top, and an airflow light blinks green.
  - **FUME HOOD 2** (behind bench B): a distillation rig. A flask of green liquid boils, the vapour runs through a
    glass coil, and a drip falls into a beaker every few seconds.
  - **THE REAGENT SHELVES** (between the hoods): two shelves, four flasks each, every flask its reagent's colour
    with a label and a number (1-8, the key that adds it). GLOW POWDER glows. RAINBOW OIL shimmers through the colours.
  - **The GOGGLES dispenser:** a clear-fronted box stacked with goggles, a lever, and a blue sign reading
    EYE PROTECTION.
  - **The SAFETY SHOWER:** a green sign, a pipe from the ceiling to a big shower head, a pull chain with a triangle
    handle, and a drain with a yellow and black KEEP CLEAR square on the floor.
  - **The door out:** frosted glass (its CHEM LAB sign reads backwards from in here) under a green EXIT sign.
  - **The confetti cannon:** a brass party cannon on a bracket high on the wall, over the shelves, aimed at the room.
    It's labelled DUO USE ONLY.
  - **The lab sink:** a counter with a sink, a dripping tap, and a drying rack of glassware.
- **Clutter:**
  - **THE PERIODIC TABLE OF CRITTERS:** a poster of coloured element squares (Fz FIZZIUM, Cr CRITTERIUM, Gl GLOWIUM...),
    and someone has added Dk (DUCKIUM) in pen.
  - **SIR BUBBLES,** the lab goldfish, lives in a round-bottom flask on a little shelf under the poster.
  - **The EXPERIMENTS board** by the door: EXPERIMENTS: 42 and LATEST: GLOW WORM (JOSH). It's live: every mix on the
    server adds a mark.
  - a fire blanket and an extinguisher
  - a sticky note on hood 2 reading HOOD 2 SMELLS OF SOUP
  - a scorch mark on the ceiling over bench B
  - an old purple stain on the floor
  - a mug reading I ♥ H2O on the sink

**On the floor:**
- **BENCH A and BENCH B:** black epoxy tops with white cabinets under them and steel handles. Each has:
  - a Bunsen burner, whose blue flame lights when someone steps up
  - a ring stand holding a flask
  - a rack of test tubes
  - **the beaker** in the middle, where everything happens
- **The lectern** between the benches holds **THE RECIPE BOOK**, open. Its pages turn now and then.
- **BONEY,** a skeleton model in a lab coat and goggles, on a wheeled stand in the far corner. When someone walks past
  he clacks his jaw and turns his head to watch.

**Everything that looks usable does something:**
- **Spots:** the two benches (MIX), the recipe book (READ), the goggles dispenser (TAKE GOGGLES), and the shower
  (PULL CHAIN).
- **Things that say a line (talkers):** the hoods, the shelves, the poster, SIR BUBBLES, BONEY, the cannon, the
  EXPERIMENTS board, and the fire blanket.

### 9.3 The reagents

| key | reagent | colour | what it's like |
|---|---|---|---|
| 1 | **FIZZ SALT** | pale pink-white crystals | makes things fizz, foam and go up |
| 2 | **BLUE GOO** | deep blue | cold, gloopy |
| 3 | **SPARK DUST** | gold | sparkles, bangs |
| 4 | **SLIME BASE** | lime green | gloop, growth |
| 5 | **RAINBOW OIL** | shimmering magenta | colour, lots of it |
| 6 | **BUBBLE JUICE** | sky blue | bubbles |
| 7 | **GLOW POWDER** | mint, glowing | light |
| 8 | **CRITTER TONIC** | orange | works *on critters*: every potion has it |

### 9.4 Mixing

1. Walk to a bench and press E. You step up behind it. The burner lights, and a hint says to add 2 or 3 reagents,
   then MIX.
2. Keys **1-8** (or the reagent pills along the bottom, like the Stage's instruments) add a reagent to the beaker. You
   see it pour in, in its colour. Press the same one again to take it back out.
3. **E (MIX!)** stirs it. The reaction goes off at your bench for everyone in the room, and its name pops up over the
   beaker (gold for a discovery, grey for the everyday ones).
4. Mix again once the beaker's settled (about 3 s), or walk away.

Only the finished mix goes over the network, so picking reagents costs nothing.

### 9.5 The reactions

There are 84 possible mixes (28 pairs and 56 triples). 18 of them are discoveries; everything else makes one of three
everyday results.

**Discoveries** (each has one recipe):

| # | reaction | recipe | what everyone sees | sound |
|---|---|---|---|---|
| 1 | **FOAM VOLCANO** | FIZZ + SLIME | green foam erupts, flops over the beaker and oozes down the bench | a rising glug |
| 2 | **SPARKLER** | FIZZ + SPARK | a fountain of gold sparks for 5 s | crackling |
| 3 | **BUBBLE FOUNTAIN** | FIZZ + BUBBLE | a stream of bubbles rises to the ceiling, popping | blubs and pops |
| 4 | **RAINBOW SMOKE** | FIZZ + OIL | smoke rings in every colour drift up and widen | a soft poof |
| 5 | **ICE CRYSTALS** | FIZZ + GOO | frost spreads over the bench, ice shards grow, snowflakes puff out | a crystal tinkle |
| 6 | **STORM IN A TEACUP** | GOO + BUBBLE | a tiny rain cloud rains into the beaker, with a tiny lightning bolt | a tiny thunder |
| 7 | **LAVA LAMP** | GOO + OIL | the beaker glows, and slow blobs rise and sink for 12 s | slow bloops |
| 8 | **GOO GEYSER** | GOO + SLIME | a column of goo shoots up and splats back down on the bench | whoosh, splat |
| 9 | **GLOW WORM** | SLIME + GLOW | a glowing worm wriggles out, down the bench and away across the floor | a squeak |
| 10 | **FIREFLIES** | BUBBLE + GLOW | a dozen blinking lights drift out and wander the room for 15 s | twinkles |
| 11 | **KA-BOOM** | SPARK + GLOW | a white flash, a shockwave and a soot cloud. **Your fur is frazzled for 10 s** | BOOM |
| 12 | **DISCO** | SPARK + OIL + GLOW | a disco ball drops from the ceiling, and coloured lights sweep the room for 10 s | a disco beat |
| 13-18 | **the six POTIONS** | CRITTER TONIC + ... (see 9.6) | the beaker fizzes in the potion's colour, then a corked flask pops up into your hand | fizz, ding |

**Everyday results** (the other 66 mixes; which one you get is always the same for the same mix):
- **A PUFF OF SMOKE:** puffs in the mix's colour, named for it (PURPLE SMOKE, ORANGE SMOKE...)
- **A FIZZY MESS:** it bubbles over the top and spatters the bench
- **BROWN SLUDGE:** most triples. It goes brown, blorps twice, and a stink line wafts up. ("It went brown.")

**Performance:** the reactions are drawn live, but every effect is a handful of rects worked out from the clock. The
shared ones (fireflies, the flood, confetti) cap their pieces.

### 9.6 Potions

A potion lands in your hand as a small corked flask, glowing in its colour. **Q (DRINK)** drinks it, whenever and
wherever you like, so you can carry a HUGE potion out to the Square first. It lasts **30 s**.

| potion | recipe | what it does (everyone sees it) |
|---|---|---|
| **TINY** | TONIC + GOO | you shrink to half size. Your pet is suddenly bigger than you |
| **HUGE** | TONIC + SLIME | you grow to double size, pixels and all |
| **RAINBOW** | TONIC + OIL | your colour cycles through every body colour, with a sparkle trail |
| **GLOWING** | TONIC + GLOW | you shine, lighting up the dark round you (great in the Crypt) |
| **BUBBLES** | TONIC + BUBBLE | you leave a trail of bubbles that float up and pop |
| **FLOATY** | TONIC + BUBBLE + FIZZ | you float off the floor and bob along |

- **How it works:**
  - Drinking sends one tiny message with the potion and how long it has left.
  - Whenever you walk into a room, or someone walks into yours, it's sent again, so people who arrive later see it
    too. It follows you through doors.
- **The SAFETY SHOWER** washes off any potion or frazzle (a splash of water for 3 s, and "brrr!").
- **KA-BOOM's frazzle** (10 s) shows as spiky fur, soot smudges and a wisp of smoke from your head.
- You have one effect at a time: a new one replaces the old.

### 9.7 Two chemists

**The same discovery at both benches within 3 s,** by two different players, sets off something big:
- **ELEPHANT TOOTHPASTE** (two FOAM VOLCANOES):
  - Giant striped foam columns burst up out of both beakers and flop over.
  - Then the whole floor fills with foam, knee-deep on everyone, for about 20 s, and slowly drains away.
- **CONFETTI CANNON** (two SPARKLERS):
  - The cannon on the wall fires with a boom.
  - Confetti blasts across the room and rains down on everyone, then lies on the floor for a while.

Both chemists get the discovery. Everyone in the room sees it, because every browser sees both mixes.

### 9.8 The recipe book, the goggles and the rewards

- **THE RECIPE BOOK** (READ at the lectern):
  - All 20 entries: the 12 reactions, the 6 potions and the 2 two-chemist ones.
  - An entry you've found shows its name and recipe (coloured reagent chips).
  - One you haven't shows ??? and a riddle, e.g. *fizz meets slime. stand back.* or *two chemists, two foam volcanoes,
    one moment*.
  - It's kept in your save, so it follows your account.
- **LAB GOGGLES** (a new face item):
  - Big clear wraparound safety goggles, with a lime frame, side vents, a strap and a moving glint.
  - They look different from the old GOGGLES.
  - Free from the dispenser: the first press gives you a pair and puts them on, and after that it puts them on or
    takes them off.
- **The CHEMIST badge:** all 20 entries in the book, which means finding a lab partner for the last two.
- **The daily quest:** *Brew a potion in the chem lab*.
- **No tokens here.** It's all for fun, and there's nothing for anyone to farm.

### 9.9 PROF. FIZZ, part-time

- **Their day:** PROF. FIZZ keeps their Lab routine, but for part of every 20 minutes they walk off through the Lab's
  SCIENCE WING doorway and turn up in the chem lab.
  - It's worked out from the clock, like every NPC, so everyone agrees where Fizz is.
  - In the chem lab they potter between hood 1 ("hmm. needs more fizz"), the shelves ("we're low on bubble juice
    again"), the recipe book ("page 7 is just a doodle of a duck"), BONEY ("morning, Boney") and hood 2 ("hood 2
    smells of soup. again.").
- **Their lines when you talk to them:**
  - "welcome to my OTHER lab!"
  - "mix two or three reagents at a bench and see what happens"
  - "CRITTER TONIC works on critters. mix it with something..."
  - "goggles on! the dispenser's by the door"
  - "if anything goes wrong, the shower's in the corner. it won't. probably."
  - "two chemists, the same mix, the same moment... stand well back"
  - "who keeps mixing the blue ones? ...oh. it's me. it's always been me"

### 9.10 Alive, and light

**Something moving in every screen width:**
- the hood fans spin, the flasks in hood 1 bubble, the distillation drips, the sashes shimmer
- GLOW POWDER pulses, RAINBOW OIL shifts colour, and the burner flames flicker while a bench is in use
- the book's page turns, SIR BUBBLES swims round his flask, the sink drips, one tube hums, BONEY watches passers-by
- the fume stack on the map puffs colours

**Lights** (glow layer): the two hood sashes (soft mint), the glowing flasks, the burners (blue), the EXIT sign, and
every reaction's own light (foam, sparks, the lava lamp's warm glow, fireflies, the disco's sweeping colours, the
KA-BOOM's flash).

### 9.11 Sounds

- **The room:** the fume hoods' low hum, a drip, a bubble now and then.
- **At the bench:** a clink as a reagent goes in, a stir, then the reaction's own sound (see 9.5).
- **Potions:** a gulp, then a sparkly poof; TINY slides down, HUGE slides up.
- **Other things:** the shower's splash, a clack from BONEY, and a goggles snap.
- **Music:** a new quiet, bouncy track, *BUBBLE AND SQUEAK*.

### 9.12 Build, network and checks

- **New files:**
  - `world/chem.ts` (the room)
  - `game/chem.ts` (the reagents, reactions and effects: pure, so it can be tested)
  - `features/chem.ts` (mixing, potions, the book, goggles, the shower)
  - `ui/chembook.ts` (the recipe book)
- **Network:**
  - broadcast `chem` `{ b, m, at }`: "I mixed m (a bitmask of reagents) at bench b". Every browser works out the same
    reaction from it.
  - broadcast `fx` `{ k, s }`: "I'm under effect k for s more seconds"
  - room state `chemlog` `{ n, rx, by }`: the EXPERIMENTS board
  - That's a message per mix or drink: next to nothing.
- **SQL `0022_chem.sql`:** the `chem` daily quest and the `chemist` badge. Nothing else, because nothing costs or pays
  tokens.
- **Seasons:**
  - string lights, a pumpkin and a little tree in the chem lab
  - the same for the corridor and the reactor's control room, which push 1 missed
- **Tests:**
  - every one of the 84 mixes resolves to a well-formed reaction (the reactor-freeze lesson)
  - golden fingerprints for the room, the potions and the goggles
  - two players: a potion seen in both windows and carried through a door, and both two-chemist reactions
  - the doors walked both ways
  - a phone's reagent pad
  - 60 fps with 12 bots

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

## As built: push 2 (the chem lab)

- **It came out as the brief says,** with these changes and details:
  - **The benches are islands you stand behind,** so the chemist faces the room across the bench top (the bench hides
    them from the waist down) and every reaction goes off between them and everyone watching. You stand just left of
    the beaker, so your face stays in view.
  - **A new mix at a bench takes over its beaker:** the reaction before it stops, except the ones that wander off round
    the room (FIREFLIES, the GLOW WORM, the DISCO, a KA-BOOM's soot).
  - **ELEPHANT TOOTHPASTE's flood** is a strip of foam for each band of depth, so it comes up to everyone's knees
    wherever they stand (and covers the benches' feet, not their tops). The first version buried everyone to the
    eyes, and was brought down to about 8 px of foam with a lumpy top.
  - **The flood only draws what the camera can see.** With 12 bots at CPU ×4 the flood and everything else at once
    cost about 11 points of main thread over the Square, and only while it lasts; the lab is as busy as the Square when
    quiet.
  - **The CONFETTI CANNON's blast** is 260 tumbling pieces. They land where they fall and lie on the floor for half
    a minute.
  - **PROF. FIZZ's hours:** 6 minutes of every 20 in the chem lab. Both routines loop every 120 s, so the switch comes
    as a loop ends: Fizz waits by the Lab's SCIENCE WING doorway ("is that bubbling i hear?"), then walks in at the
    chem lab's door, and back. In the chem lab Fizz wears the LAB GOGGLES, and BONEY clacks at Fizz too.
  - **The map:**
    - The chem lab is the annex's left half, with two windows that glow potion-green at night, and a thin fume stack
      beside the cooling tower whose puffs change colour every few seconds.
    - Its ? sticker sits by the stack, clear of the Square's castle, which stands in front of the annex.
    - THE SCIENCE WING is now the annex's right half, with the reactor's hazard door.
  - **The corridor's CHEM LAB door** lost its BACK SOON note and tape. The lab's green glows through the glass, a
    shadow drifts past now and then, the flask on its sign bubbles, and there's a warning sticker.
  - **Seasons:**
    - Push 1 had missed dressing the Science Wing for Halloween and Winter.
    - Now the corridor, the reactor's control room and the chem lab all get string lights (hung in the gaps between
      their signs), pumpkins and little trees.
    - Their doors get cobwebs and wreaths as usual.
- **What each mix makes** (checked for all 84 in the tests): 18 discoveries (12 reactions, 6 potions), and the other
  66 are 18 FIZZY MESSES, 15 coloured smokes (named for their colour) and 33 BROWN SLUDGES (most triples).
- **Tested:**
  - Two players in real windows (24 checks):
    - the doors walked both ways, and the map's route there
    - a potion made at bench A and seen in A's hand, drunk, and seen on A in both directions through the corridor
      door
    - the daily quest handed in on brewing
    - the shower washing it off
    - the goggles dispenser (on, seen by the other player, off)
    - ELEPHANT TOOTHPASTE seen by both at the same moment and written in both books
    - KA-BOOM's frazzle seen by the other player
    - the EXPERIMENTS board agreeing
  - The whole book filled (the two-chemist ones with a pretend partner) earns CHEMIST, and the book says 20/20.
  - PROF. FIZZ's hours, with the clock moved.
  - A phone: the reagent pad wraps to three rows, and MIX! sits on the bottom bar.
  - Golden fingerprints:
    - the room, one of each reaction, both two-chemist ones, the potions in hand and every effect on both bodies
    - every one of the 84 mixes drawn at three moments at both benches, with no errors
  - Pixel diffs against the last commit: the map changed only round the annex, and the corridor only at the chem
    door. The old faces and sounds are unchanged.
