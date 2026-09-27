# Step 18 — The City Aquarium and the Submarine: design brief

The third step built to the polish standard (ART_STYLE §9). Josh picked:
- **Dives:** on a timetable, every 8 minutes, like the lander. Anyone can take the helm and steer; if nobody does,
  the autopilot gives a tour.
- **The fish tanks:** shared donations. The tanks start empty; hand in a fish you've caught and it swims there for
  everyone, with your name on the plaque. A bigger one takes the plaque.
- **On a dive:** photograph sea life, claw up treasure, cartoon trouble, and a mission each dive.
- **Prizes:** the DIVING HELMET, a pet BABY OCTOPUS, a gift shop, and quests and badges.
- **Two pushes**, like the Science Wing: the aquarium first (the sub is there, docked, on sea trials), then the
  submarine.

**In one line:** past the lighthouse, the beach leads on to the City Aquarium. It has a gallery of tanks you fill
with the fish you catch, a giant ocean tank to sit and stare at, glowing jellyfish and feeding time. Down in its
sub pen floats SARDINE 1, a little yellow submarine that dives every 8 minutes. Push 2 takes you down in it, to the
bottom of the sea.

---

## 1. Getting there

- **The Pier gets wider (1300 → 1900).** Past the lighthouse the beach carries on to the aquarium.
  - A **signpost** where the old beach ended: *AQUARIUM →*, with a painted fish.
  - A **boardwalk** of planks runs along the sand in front of the aquarium, with rope posts.
  - Walk up into the aquarium's doors like any door. You arrive just inside, in the lobby.
- **The map:** the aquarium appears on the shore right of the lighthouse: a white building with a wavy glass roof and
  a whale tail on top. At night its windows glow blue.
  - When the sub is in, a yellow dot bobs by its pen. During a dive, a periscope wake draws a line out to sea and back.
  - THE CITY AQUARIUM is a new place, and EXPLORER gains it. Anyone who already has the badge keeps it.
  - The sub is a ride, not a place, like the rocket and the lander.

## 2. THE PIER, the new end (x 1300-1900)

```
   sky ........................ lighthouse (x 1180, unchanged) ......... ~~ whale tail ~~ .................
   sea ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ┌──── wavy glass roofline ───────────────┐ ~~~~ ┌─ SUB PEN ─┐
                                           │ ░ fish mural band ░  o  o  o  o  o      │      │  arch,    │
                                           │   THE CITY AQUARIUM  (lit sign)         │      │  shutter, │
   shore ─────────────────────────────────  │ [glass]  [ DOORS ]  [glass]  banner    │      │  beacon   │
   sand   palm   AQUARIUM → ══ boardwalk ══ └────────────────────────────────────────┘ ═════└───────────┘
                    whale-shark statue · bike rack · A-board · rope queue · bin
```

The building stands on the shoreline, and its body runs back over the water, so you see its front and roofline. It
sits within ~150 px of its base, like every wall since step 17.

- **Structure:**
  - white walls with a band of blue tiles along the base
  - big teal-tinted glass panels with a streak of reflection, and a gently wavy roofline
  - a painted **fish mural** band: a shoal of pixel fish swimming along the front
  - a row of portholes
- **Fixtures:**
  - **THE CITY AQUARIUM** in big letters over the doors, cyan with a white core, lit at night, with a leaping-fish logo
  - **glass double doors** (about 105 px tall) with wave-pattern kick plates, under a little canopy; the lobby glows
    through them at night
  - a **banner** on a pole: *FEEDING TIME EVERY 15 MIN*
  - **the SUB PEN** at the right end: a boathouse arch at the waterline with a steel shutter, an amber beacon, and a
    board, *SARDINE 1 · DIVES EVERY 8 MIN*
- **Clutter:**
  - a fibreglass **whale shark statue** on the sand (you can sit on it)
  - a bike rack with one bike, a bin, a rope queue barrier nobody queues at
  - a chalk A-board: *DONATE YOUR CATCH! ASK THE CURATOR*
  - a poster: *COMING SOON: DIVE WITH SARDINE 1* (push 2 changes it to *DIVE WITH SARDINE 1*)
  - gulls perched on the sign
- **Alive:**
  - the whale-shark statue is also a fountain, and spouts every few seconds
  - a gull hops along the roof
  - the lighthouse beam glints across the glass
  - the sign blinks on at dusk, letter by letter
  - the pen's beacon turns while the sub comes and goes
  - **the sub leaving:** its periscope slides out from under the pen, draws a white wake out to sea and dips under.
    When it's due back, the wake returns.

## 3. THE CITY AQUARIUM (the room) — 1800 × 700

Left to right, the way a visit goes, ending at the sub:

```
 ┌ LOBBY ──┬ GIFT SHOP ┬──── FISH GALLERY ────┬─────── THE OCEAN TANK ───────┬ JELLY ─┬──── THE SUB PEN ─────┐
 │ [door]  │ plushies  │ ▢ ▢ ▢ ▢ ▢ ▢  12 tanks │  whale shark · mantas · turtle│ ROOM   │ dive board   crane    │
 │ ticket  │ postcards │ ▢ ▢ ▢ ▢ ▢ ▢  + plaques│  shoals · coral · kelp · diver│ ◯ ◯ ◯  │ ≈≈≈ MOON POOL ≈≈≈≈≈≈ │
 │ desk    │ till      │   [CURATOR'S DESK]    │  [bench]  [bench]   feeding   │ glowing│   SARDINE 1 afloat,   │
 │ map     │           │                       │     (TOUCH POOL)    ladder    │ jellies│   gangway to hatch    │
 │ x 0-180 │ 180-340   │ 340-760               │ 760-1240                      │1240-1420│ 1420-1800            │
 └═════════╧═══════════╧═══════════════════════╧═══════════════════════════════╧════════╧══════════════════════┘
   floor: blue-green terrazzo with a wave inlay (the pen: wet concrete with yellow edges)
```

The wall's base is at y 470. The floor runs y 478-640, with the set going on below it.

**Light:** the tanks are the light. The room is dim (about the Cinema's level) so every tank glows. The big tank
throws moving **caustics**, a rippling net of blue light, onto the floor and on anyone standing in front of it. The
jellies glow in their colours, the shop is warm yellow, and the pen has orange work lamps and the pool's shimmer.

### 3.1 The lobby (x 0-180)

- The **doors** out to the Pier, with the beach glowing through by day and dark blue by night.
- The **ticket desk:** *ADMISSION FREE*, a rubber stamp, a donations box with one coin in it, and a bell (E: *DING*).
- The **AQUARIUM MAP** board: the rooms drawn as simple shapes, with *YOU ARE HERE*. Click it for a line about each
  room.
- A **height chart:** *YOU ARE AS TALL AS: A SEAHORSE · A PENGUIN · A SMALL SHARK*.
- A brochure stand and a coat rack with one forgotten umbrella.

### 3.2 The gift shop (x 180-340)

- A little shop front with a striped awning, a till, plushies on shelves (a shark, an octopus, a jellyfish, a
  turtle), a spinning postcard rack, and a *SALE* sign that's always up.
- **E at the till: THE GIFT SHOP.** A panel, like the claw machine's prize shelf, where you spend tokens:

| Item | Slot | Price |
|---|---|---|
| CAPTAIN'S HAT | hat | 15 |
| SHARK FIN (worn like a hat, fin up) | hat | 12 |
| SNORKEL | face | 10 |
| SAILOR TOP (blue and white stripes) | outfit | 12 |
| FISH PLUSH | furniture | 6 |
| JELLYFISH LAMP (glows and changes colour) | furniture | 14 |
| SHIP IN A BOTTLE | furniture | 10 |
| AQUARIUM POSTER | furniture (wall) | 5 |

- The server takes the tokens and gives the item. Clothes go in your inventory, like claw prizes, and the furniture
  goes to your flat's catalogue, like the LOFTS store.
- The DIVING HELMET and the BABY OCTOPUS are not for sale: you earn them on the sub (§6).

### 3.3 The fish gallery (x 340-760)

- A deep-blue wall with **12 tanks** in two rows of six, one for each thing you can catch off the Pier: SARDINE,
  MACKEREL, SEA BREAM, SEA BASS, SQUID, PUFFERFISH, SWORDFISH, OCTOPUS, MOON FISH, GOLDEN KOI, and yes, the OLD
  BOOT and the SEAWEED ("the museum takes everything").
  - Each tank is framed in brass and lit from above, with bubbles rising and a little gravel and weed.
  - **Under each is a brass plaque:** *GOLDEN KOI · 64 CM · JOSH*.
  - **An empty tank** has murky water, a single bubble now and then, and a card: *WANTED: GOLDEN KOI*.
  - **A full tank** has the fish swimming, drawn bigger the bigger it was. The MOON FISH glows. The OLD BOOT sits on
    the gravel with a small crab living in it.
- **The CURATOR'S DESK**, in front: a desk with a big ledger, a brass bell, a magnifying glass and a jar of fish
  food. E = **DONATE** (§4).

### 3.4 THE OCEAN TANK (x 760-1240)

The centrepiece: one giant tank, 480 px across, running from the floor up out of sight.
- **Inside:**
  - a sandy bed with rocks, brain coral, fan coral and swaying kelp
  - sunbeams slanting down from the top, and bubbles
  - **a whale shark** cruising end to end, slowly, spots and all, about 120 px long
  - two **manta rays** gliding in loops, and a **sea turtle** paddling
  - two small **reef sharks** patrolling, a **moray** poking out of a rock, clownfish in an anemone
  - **a silver shoal** of about 40 fish that turns all at once
- **The diver:** every few minutes a diver swims down inside the glass with a scrubber, cleans a patch of glass
  (it squeaks), waves at whoever is closest, and swims up and out.
- **Two long benches** in front: four seats to sit and stare. The camera frames the tank while you sit.
- **THE TOUCH POOL:** a low, round-edged pool standing on the floor in front (x ~940-1060). It holds starfish, a
  crab, a sea cucumber, a hermit crab and an urchin. E = **TOUCH**, which picks one:
  - the starfish: *It's rough, like a cat's tongue.*
  - the crab: **SNIP**, and you hop
  - the sea cucumber squirts you (a splash)
  - the hermit crab pops back into its shell
  - the urchin: *OUCH. Maybe not the urchin.*

### 3.5 Feeding time

- **Every 15 minutes on the clock** (:00, :15, :30, :45), for 90 seconds. A bell rings a minute before, and the Pier's
  banner reads *FEEDING TIME NOW*.
- **MARINA** climbs the ladder at the tank's right edge with a bucket and scatters food from the top.
  - Every fish rushes up, and the shoal swirls into a tight ball.
  - The turtle chomps a lettuce leaf, and the whale shark swims up with its mouth wide open.
  - The gallery's fish get a pinch of flakes too.
- **HELP FEED:** during feeding, stand at the feeding step beside the ladder and press E to throw a scoop. It splashes
  where it lands and the nearest fish dart to it. The more people feeding, the bigger the frenzy.
- It's all from the clock, so everyone sees the same feed without a message. The scoops are small broadcasts.

### 3.6 The jelly room (x 1240-1420)

- A dark alcove under a low arch, behind a curtain of dangling light strands.
- **Three tall cylinder tanks** of moon jellies, pulsing slowly as they drift up and sink, glowing and slowly changing
  colour (blue → violet → pink → teal).
- A round bench in the middle. A sign: *JELLYFISH: NO BRAINS, NO BONES, NO PROBLEMS*.
- **The jelly disco:** when three or more people dance in here, the jellies pulse to the beat in rainbow colours and
  the room's light swings with them.

### 3.7 The sub pen (x 1420-1800)

- Industrial: wet concrete with yellow edge paint, orange work lamps, coiled ropes, life rings, lockers with wetsuits
  hanging out, a crane hook overhead, a *MIND THE GAP* sign, and puddles.
- **The MOON POOL** at the back: an opening in the floor full of dark green water, shimmering, with a railing along
  its edge. Under the water, the steel **sea gate** out to the ocean.
- **SARDINE 1** floats in it. It's a round yellow submarine with portholes, rivets, a stubby conning tower with the
  hatch on top, a propeller, and the name painted on the side.
  - A **gangway** runs from the dock up to the hatch.
  - Walk up it, into the hatch, to board (push 2).
- **The DIVE BOARD:** *SARDINE 1 · NEXT DIVE IN 3:12 · TODAY'S MISSION: PHOTOGRAPH THE WHALE*. During a dive it
  shows *ON A DIVE · BACK IN 2:40*.
- **Push 1 (sea trials):** the sub already dives and surfaces on its timetable, empty. A chain across the gangway
  reads *SEA TRIALS · NO PASSENGERS YET*.
- **A dive, seen from the pen:**
  - the horn (a deep BWAAMP) a minute before; the hatch clangs shut
  - ballast hisses, and the sub sinks as the water rises over its portholes in a boil of bubbles
  - it's gone, the pool sloshes, and the sea gate's lamp blinks while the gate is open
  - coming back: bubbles, then the tower breaks the surface, water streams off the hull, and the hatch pops open

## 4. Donating a fish

- **E at the CURATOR'S DESK** opens **THE FISH GALLERY** panel. There's one row per tank:
  - the fish, what's in the tank now (*64 CM · JOSH*, or *EMPTY*), and your own biggest catch of it
  - a **DONATE** button when you've caught one, saying *TAKE THE PLAQUE!* when yours is bigger, *YOURS IS SMALLER*
    when it isn't, or *CATCH ONE OFF THE PIER* when you haven't caught one
- **The server checks it:** it keeps every catch (since step 6), so it knows your biggest of each kind. Donating puts
  that one up.
  - An empty tank, or a bigger fish than the one on show, takes the plaque.
  - **The first time you donate each kind, it pays a thank-you:** 1 token for junk, 2 common, 3 uncommon, 4 rare, 6
    legendary. That's 37 tokens for all twelve, once.
- **When you donate:** MARINA says a line (*"A GOLDEN KOI! Into the tank it goes!"*), the fish plops into its tank
  with a splash, and the plaque changes for everyone in the room.
- **One gallery for the whole city,** on every server. A plaque is yours until someone donates a bigger one.
- **The Pier knows:** when you reel in something bigger than the one on show, the catch toast adds *BIGGER THAN THE
  AQUARIUM'S!*

## 5. MARINA, the keeper

- A critter in a teal polo shirt and rubber boots, with a whistle and a bucket.
- **Their day:** sits at the curator's desk, wipes the gallery glass, checks the jellies, and taps the touch pool's
  water. **At feeding time** they're on the ladder, every time.
- **Lines:**
  - "Every tank in the gallery is waiting for someone's catch. Maybe yours."
  - "The whale shark's name is Doris. She's a gentle giant. Mostly she's a giant."
  - "Don't tap the glass. The octopus taps back."
  - "Feeding time's every fifteen minutes. Grab a scoop!"
  - "The jellies have no brains. Very relaxing company."
  - "Somebody donated a boot. I love it. It's the best boot."
- **At feeding time:** "Dinner's up!" · "Not you, Doris, wait your turn!"

**CAP'N BARNACLE**, SARDINE 1's skipper, stands on the dock in a CAPTAIN'S HAT, a SAILOR TOP and a MUSTACHE.
- **Push 1:** "She's not ready for passengers yet. Sea trials! Soon, soon."
- **Push 2:** they ride every dive (§6).

## 6. SARDINE 1: the submarine (push 2)

Josh's picks for the dives:
- **On the timetable, and anyone can steer.** When nobody does, the CAP'N's autopilot gives a tour.
- **All four jobs:** photograph sea life, claw up treasure, cartoon trouble, and a mission each dive.
- **The prizes:** the DIVING HELMET, the BABY OCTOPUS, a quest and a badge. The gift shop and the CURATOR badge came in
  push 1.

**In one line:** every 8 minutes SARDINE 1 takes whoever's aboard out through the sea gate and down to the bottom of the
sea. Through its big window you pass the Pier's legs, a kelp forest, a coral reef, a shipwreck and a cliff into the dark,
all the way down to the trench. Someone steers, someone takes photos, someone works the sonar and the claw, and things
go wrong in a friendly way.

### 6.1 Boarding, and the timetable

| k (s into the 480 s loop) | In the pen | Aboard |
|---|---|---|
| 0-86 | **BOARDING.** The hatch is open and the gangway is down. The horn at 60, the bell at 80 | walk about and try the stations; the window shows the pen's green water |
| 86-100 | **DIVE, DIVE.** The hatch clangs shut (86), the ballast hisses, and the sub sinks out of sight | the water climbs up the glass. The Cap'n: "Dive, dive, dive!" |
| 100-420 | the pool sloshes, the sea gate's lamp blinks, and the dive board counts down | **THE DIVE,** 5 min 20 s: out through the SEA GATE and anywhere in the sea |
| 420-470 | | **HEADING HOME:** the autopilot takes over and races back from wherever you are |
| 470-480 | bubbles, then the tower breaks the surface; the hatch pops open at 480 | the water drains down the glass, then **the DIVE REPORT** and the pay |

- **Getting on:** while it's boarding, walk up the gangway and in at the hatch, like any door. You climb down the ladder
  into the cabin.
  - The SEA TRIALS sign comes off the chain, and the chain is unhooked while it boards.
  - Outside boarding the gangway is stowed, with red lamps on its posts and the chain across its foot. Walking up to it
    says *SARDINE 1 is out on a dive: back in 3:12* (or *diving now!*).
  - **The pen's DIVE BOARD** shows the next dive's mission: *BOARDING · DIVES IN 1:12 · TODAY'S MISSION: SNAP THE
    WHALE*. During a dive it shows *ON A DIVE · BACK IN 2:40 · CREW 3*.
  - The horn's toast, for anyone in the pen: *SARDINE 1 dives in 30 seconds! All aboard: up the gangway*.
- **Getting off:** climb the ladder while the hatch is open and you come out on the dock. If you stay aboard, you go on
  the next dive too.
- **Once it's down, the hatch stays shut.**
  - The map says *You're on a dive! SARDINE 1 surfaces in 2:40, or use the ESCAPE HATCH*.
  - WHO'S ONLINE's GO for someone on a dive takes you to the pen, with *They're on a dive: back in 2:40*.
- **The ESCAPE HATCH** (press E twice, to be sure) shoots you up in a rubber ring.
  - You pop up on the beach by the sub pen with a splash, still in the ring for a few seconds. Everyone on the Pier sees
    it.
  - The sub carries on without you, and you miss the pay and the octopus.
- **The crew** is whoever's aboard when the hatch shuts. With nobody aboard, the sub still dives and surfaces on time,
  empty, as in push 1.
- **The Pier and the map:**
  - The pen's sign on the Pier blinks *BOARDING NOW*.
  - The map's card for the aquarium adds *SARDINE 1: BOARDING NOW · 1:12* or *BACK IN 3:12*.
  - The periscope's wake on the Pier and on the map stays on the clock, as now.

### 6.2 Inside SARDINE 1 — 1000 × 620

A cramped, cosy, riveted cabin (it's called SARDINE for a reason). You're inside a long yellow tube, looking out of its
side.
- **The back wall is nearly all window**, and everything else crowds along the deck in front of it.
- The bow (the front) is on the right, and the engine is at the stern on the left.
- The ladder up to the hatch is in the middle, under the conning tower.

```
 ceiling: the hull's curve, ribs, pipes and valves, caged lamps; the hatch's round tube over the ladder
 ┌────────┬───────────────────────────────┬────────┬───────────────────────────────┬────────┐
 │ ESCAPE │ ┌─ pane ─────┐ ┌─ pane ─────┐ │  DIVE  │ ┌─ pane ─────┐ ┌─ pane ─────┐ │   bow  │
 │ HATCH  │ │  the sea   │ │  goes by   │ │ BOARD  │ │ as you go  │ │   ahead    │ │  port- │
 │ (red,  │ └────────────┘ └────────────┘ │ ║    ║ │ └────────────┘ └────────────┘ │  hole  │
 │ above) │                               │ LADDER │                               │        │
 │ ENGINE   GALLEY FUSE  CLAW   SONAR       ║    ║  CAMERA FLOOD- VALVE PERI-  ZAP    HELM  │
 │ pistons  kettle BOX   CLAW   PING        ║    ║  SNAP   LIGHTS WHEEL SCOPE  red    wheel │
 │ INTAKE   mug    (fix) CAM    ring        ║    ║  tripod lever  (fix) (from  (fix)  gauge │
 │ (fix)                                    ║    ║                     above)       NAV     │
 │              [TREASURE BIN]                  [CHART TABLE: SEA LIFE LOG]   [bench]       │
 │ ══ deck: steel plates, a diamond tread, a worn red runner, a drain ═════════════════════ │
 └──────────────────────────────────────────────────────────────────────────────────────────┘
   stern (left) ................................................................ bow (right)
```

- **Size:** 1000 × 620.
  - The ceiling is at y ~300 and the wall's base at y 470, so the window (y ~336-452) stays where the camera looks.
  - At any station, the camera frames the window.
  - The deck you walk on is y 478-596.
- **The window:** four panes, two either side of the ladder's bulkhead (x 150-470 and 530-850), each about 150 × 116
  px.

**Structure:**
- the hull's inside:
  - riveted plates in cream paint, with a band of pale sea-green under the window
  - heavy ribs every ~100 px, each with a row of rivets
- the ceiling curving over, with:
  - pipes (one lagged, one dripping into a bucket)
  - valves with red wheels, cable trays, and caged lamps on short chains
- **the window's frames:** thick brass, riveted, with rubber seals, and a sill with condensation running down it
- the ladder's bulkhead in the middle: steel rungs up into the hatch's round tube, with its locking wheel
- the stern bulkhead (left) with the engine; the bow bulkhead (right) curving in, with a small forward porthole
- the deck: steel plates with a diamond tread, a worn red runner down the middle, and a drain

**Fixtures** (the stations and the rest, left to right):

| x | What | E |
|---|---|---|
| 40 | **THE ESCAPE HATCH:** a red round hatch in the stern's ceiling with a short ladder, ESCAPE in white stencil, and rubber rings on a hook | ESCAPE (twice) |
| 70-150 | **THE ENGINE:** a squat green engine with two chugging pistons, a flywheel, a pressure gauge and an exhaust pipe. The **INTAKE** lever is on its side (a fix spot, 6.9) | CHECK |
| 200 | **THE GALLEY:** a hob with a kettle, a tin of sardines (the crew's lunch), and a mug that slides when the sub tilts | MAKE TEA (a mug in your hand; Q sips it) |
| 262 | **THE FUSE BOX:** a grey box with a big lever and a row of fuses (a fix spot) | CHECK |
| 330 | **CLAW:** a console with a joystick, a GRAB button and the **CLAW CAM** screen | CLAW |
| 410 | **SONAR:** a console with a round green screen and a big PING button | PING |
| 500 | **THE LADDER** up to the hatch. Over it, **THE DIVE BOARD:** a little amber screen with the depth, the time left, the mission and its progress, and the finds | (the door) |
| 580 | **CAMERA:** a big old box camera on a tripod, aimed out of the window, with a flash | SNAP |
| 636 | **FLOODLIGHTS:** a big two-way lever with ON and OFF lamps | LIGHTS |
| 700 | **THE VALVE WHEEL:** a red wheel on the main pipe (a fix spot) | CHECK |
| 766 | **PERISCOPE:** its tube comes down from the ceiling, with two handles | UP PERISCOPE |
| 830 | **ZAP:** a big red button under a flip-up cover, marked *ZAP · FOR SQUID* (a fix spot) | CHECK |
| 910 | **HELM:** a big brass wheel on a pedestal, the round depth gauge, the NAV screen (the sea map with the sub's dot), the engine telegraph (AHEAD / STOP / ASTERN), the HORN cord and the AUTOPILOT lamp | TAKE THE HELM |
| front, 400 | **THE TREASURE BIN:** a wooden crate with a glass lid. This dive's finds sit in it | LOOK |
| front, 640 | **THE CHART TABLE:** a sea chart, a brass lamp, dividers, and **THE SEA LIFE LOG** | READ |
| front, 800 | **a padded bench** for passengers (two seats) | SIT (the camera frames the window) |

- **The fix spots** (the intake, the fuse box, the valve wheel, ZAP) look ordinary until their trouble starts. Then a
  red marker blinks over them, as in the reactor. Otherwise CHECK says something like *tight as a drum*.
- **The top of your screen** shows the same line as the DIVE BOARD while you're aboard: *SARDINE 1 · 312 M · 2:40 LEFT
  · SPOT 8 KINDS: 5/8 · FINDS 3*.

**Clutter:**
- a framed photo of SARDINE 1's launch: the Cap'n cutting a ribbon, and a bottle bouncing off the hull
- a sign reading **DAYS SINCE THE LAST SQUID: 0**. The number goes back to 0 whenever a squid visits, so it's always 0
- a dartboard, with the one dart stuck in the wall beside it
- a sock drying on a pipe, and a bucket under a slow drip
- the Cap'n's spare hat on a hook, and a fish-shaped air freshener
- a bath-toy submarine in a jar, labelled *SARDINE 2 (PROTOTYPE)*
- a tide clock, and a brass barometer that always says CHANGE
- a first aid box, and a laminated card: *IN CASE OF SQUID, DO NOT PANIC*

**Things that say a line (talkers):** the photo, the squid sign, the dartboard, the sock, the jar, the barometer, the
card and the bow porthole. They're kept clear of the stations, so E at a station is always the station (the push 1
ladder lesson).

### 6.3 The window

- **It's a camera onto the sea,** centred on the sub.
  - 1 px is 1 metre, so the window shows about 700 m of sea across and 116 m up and down.
  - The sea scrolls past as the sub moves.
- **At the dock:** the pen's green water, its concrete walls, the sea gate ahead with its red lamp, and a couple of
  harbour fish that sneaked in.
  - Diving, the water climbs up the glass and the pen's wall slides up past it.
  - At 100 the gate opens and you glide out.
- **The light, by depth:**
  - 0-60 m: bright green-gold, with sunbeams slanting down and the surface rippling overhead. When you're shallow, you
    see the sky above the waterline as it really is (day or night, rain, a storm's lightning, snow in winter).
  - 60-200 m: blue, going darker.
  - 200-400 m: deep navy, fading. Below about 250 m you need the floodlights to see anything properly.
  - Below 400 m: black. You see what the floodlights reach, and whatever glows.
  - At night (the Square's clock) the shallows are dark blue. The moon's a smudge on the surface, and the lighthouse's
    beam sweeps over it.
- **The floodlights** light a soft oval in the middle of the window, fading at its edges. In the deep, that's all you
  see.
- **Something always moving:**
  - bubbles streaming past as you dive, and marine snow drifting in the deep
  - fish crossing, and kelp swaying
  - the cabin's own lamps faintly reflected in the glass
- **When a ping goes out,** a pale ring ripples across the window. **When the camera flashes,** the window goes white
  for a moment.
- **The claw isn't in the window** (it hangs under the sub). You see it on the CLAW CAM.

### 6.4 The sea — 3400 m long, 1200 m deep

One side-view map, out from the aquarium's sea gate:

```
    0 m ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ║ ║ ║ ║ the Pier's legs    kelp forest            coral reef
   60 m ╩═╩═╩═╩═══════╗      ┆┆┆┆┆┆┆┆┆┆┆┆┆┆┆┆┆┆┆    ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
  120 m               ╚══════════════════════════════════════════════╗     THE WRECK
  200 m                                                               ╚══ ▄▄▟▙▄▄ ══╗  the drop-off
                                                                                    ║   (open blue:
  400 m                                                                             ║    the whale)
  800 m                                                                             ╚═══╗   THE TRENCH
 1200 m                                                                                 ╚══ vents ══ boot? ══║ END
        0 (the sea gate)  500             1100                 1700                2250  2600               3400 m
```

| Zone | Where (m out) | The bottom | What's there |
|---|---|---|---|
| **THE HARBOUR** | 0-500 | 40-60 m | the SEA GATE in the aquarium's wall behind you; the Pier's legs crusted with mussels, with anglers' fishing lines dangling down (hooks, bait, a float bobbing on the surface); a lost shopping trolley; sunbeams; moon jellies; the sardine shoal; the seal round the legs; an otter floating at the surface |
| **THE KELP FOREST** | 500-1100 | 90-120 m | kelp 40-100 m tall on rocks, swaying, with little floats; sunbeams between the stalks; urchins; the garibaldi; the leopard shark cruising the floor; the turtle; the seahorse hidden in the fronds |
| **THE CORAL REEF** | 1100-1700 | 140 m, with coral heads up to 60 m | brain, staghorn, fan and table corals; anemones with clownfish; a giant clam; sea stars; the moray's hole; the octopus's rock; the manta overhead; little reef fish in every colour |
| **THE WRECK** | 1700-2250 | 180-220 m | the ***LUCKY HERRING***, an old steamship broken in two and lying at a tilt: a funnel, portholes, its name on the bow, a torn hold with the chest in it, the grouper's face in a hole, and fish swimming in and out of the portholes |
| **THE DROP-OFF** | 2250-2600 | a cliff from 220 m to 800 m | the reef's edge falls away. Ledges with sponges and sea whips; the open blue beyond; the swordfish along the top; lanternfish below 400 m; on some dives the humpback whale, singing, at 150-250 m |
| **THE TRENCH** | 2600-3400 | 800-1200 m | pitch black, and the walls close in. The floor is grey ooze, with black-smoker vents puffing, red tube worms, yeti crabs, the dumbo octopus, the anglerfish and a lost anchor. THE OTHER BOOT is there on its dives. At the very end, on the wall: *YOU HAVE REACHED THE END OF THE SEA. PLEASE TURN AROUND* |

- **Where the sub can go:** anywhere in the water, but:
  - not into the rock: that's a BONK, a puff of silt and a little shake
  - not above the surface: it bobs there, with the periscope up
  - not back through the gate until home time
- **The sea is the same on every dive.** What changes each dive is its **seed**: the mission, the troubles, where the
  treasure lies, and whether the whale and the octopus come.

### 6.5 A dive, start to finish: the Cap'n's tour

If nobody touches the helm, the Cap'n's autopilot gives the scenic tour. It's timed so a dive sees every zone:

| k | Where |
|---|---|
| 100 | out through the SEA GATE at 30 m |
| 100-135 | the harbour: along the Pier's legs, and up near the surface past the otter |
| 135-170 | the kelp forest, weaving between the stalks at ~70 m |
| 170-210 | low over the reef |
| 210-245 | a slow pass along the wreck at ~190 m |
| 245-270 | over the drop-off into the open blue at ~200 m, where the whale passes on its dives |
| 270-300 | down the cliff face to 1000 m. The Cap'n puts the floodlights on, if nobody's touched them yet |
| 300-370 | along the trench floor at ~1100 m, past the vents |
| 370-420 | back up the cliff to ~300 m, towards home |
| 420-470 | **home at full speed.** The Cap'n takes over from whoever's steering ("That's the time! Hold on to your hats"), and the sea streams past: the zones in reverse, up to the gate and into the pen |
| 470-480 | surfacing: the water drains down the glass, and the pen's lamps appear |

- **The helm:** take it at any time and the sub goes where you steer. Let go, and the autopilot picks the tour up from
  wherever you are, heading for where the tour would be by now.
- **The DIVE REPORT**, for everyone aboard when it surfaces, with a fanfare: *DIVE 1234 · SEA LIFE: 9 KINDS (3 NEW!) ·
  FINDS: 4 · MISSION: SNAP THE WHALE ✓ · +8 TOKENS*.

### 6.6 The stations

Every station is a spot. Solo, you run between them; with friends, you split up and shout. Each works on a phone too,
with buttons along the bottom, like the Stage's pads and the chem lab's reagents.

1. **HELM** (at the bow). E takes the wheel. The AUTOPILOT lamp goes out and the Cap'n lets go: "She's all yours.
   Don't hit anything expensive."
   - **← →** go ahead and astern, and **↑ ↓** rise and dive (WASD works too).
   - The sub has weight, so it speeds up and slows down gently: up to 40 m/s ahead, 20 astern, and 25 up or down.
   - **SPACE is the HORN** (BWAAMP). The seal likes it, and the whale sings back.
   - The camera frames the window ahead (the right-hand panes). The NAV screen shows the whole sea, the zones and your
     dot, and the depth gauge's needle swings round.
   - On a phone: a d-pad and a HORN button.
   - E again, or walking off, lets go, and the autopilot takes over: "Autopilot on. I'll take her."
2. **CAMERA.** E = **SNAP**: a clunk, a flash, and the shutter's whirr.
   - It photographs everything in the window that you can see (6.7), and every kind in it goes in **every crew
     member's** SEA LIFE LOG.
   - What you got pops up over the window: *SNAP! MANTA RAY · CLOWNFISH (NEW!)*.
   - One every 2 s, while the flash recharges.
3. **FLOODLIGHTS.** E = **LIGHTS ON / OFF**, for everyone. A big clunk, and the lamps by the lever show which.
4. **SONAR.** E = **PING**: *pinnng*.
   - A green ring sweeps across the round screen and shows blips for 5 s:
     - fish as small dots, and big things as bigger dots
     - treasure as yellow dots
     - the mission's target as a blinking marker
     - the reef's survey buoys as squares
   - The ring ripples across the window too. Hidden things it reaches (the seahorse, the octopus) shimmer into view
     for 6 s.
   - Its range is 300 m, and it can ping once every 3 s.
5. **CLAW.** E opens the **CLAW CAM**: a strip along the bottom of your screen showing the seabed under the sub up
   close, with the room still in view above it. Everyone else sees the same picture on the console's screen.
   - It reaches 40 m below the sub. Any higher: *TOO HIGH: GET WITHIN 40 M OF THE BOTTOM*.
   - **← →** slide the claw along under the hull, **↓** lowers it (hold), **↑** raises it, and **E or SPACE GRABS**.
   - It closes, and if it's round a find, up it comes and drops into the TREASURE BIN with a clunk.
   - **It's also rigged:** one grab in five slips on the way up ("this claw is also rigged"), but never twice running
     on the same find.
   - It works while the sub's going slowly, and just swings about at full speed.
     - While someone's at the claw, the Cap'n slows the tour to a crawl ("Easy does it..."), so it works solo.
     - A pilot can stop dead over a find.
6. **PERISCOPE.** E = **UP PERISCOPE**: it slides down from the ceiling and a round view fills your screen. **← →**
   turn it.
   - **Within 12 m of the surface:** the real view.
     - The Pier, the lighthouse (with its beam at night), the aquarium, the city beyond, gulls, and the sky as it is
       (day or night, rain, a storm's lightning, snow, fog).
     - Turn round to the open sea: the horizon, and a distant ship.
     - Now and then a gull lands on the periscope and looks straight into it.
   - **Deeper:** *Nothing but water.* A fish swims up and looks back at you. In the trench, a very confused
     anglerfish.
   - **At the dock:** the inside of the pen. MARINA's there, waving.
- **The others:**
  - MAKE TEA at the galley: the kettle whistles, and you're holding a mug (sip it with Q, anywhere).
  - READ the SEA LIFE LOG at the chart table.
  - LOOK in the TREASURE BIN: this dive's finds, and the notes from any bottles.
  - SIT on the bench to watch.

**Together** (a crew of two to four):
- One steers, one's on the camera and the lights, and one works the sonar and the claw. Call it out over chat:
  *PING! · left a bit · LIGHTS OFF*.
- The anglerfish is easiest with two: one on the lights, one on the camera.
- The squid: one snaps it, the other ZAPs.
- The duck: the sonar calls the way, the pilot drives, and the claw grabs.
- A leak gets everyone's ankles wet.
- Tea at the bottom of the sea.

### 6.7 The SEA LIFE LOG (20)

**What counts as a photo:** when you SNAP, the creature is in the window and you can see it. That means:
- it's in the light (above ~250 m), or in the floodlights' oval, or it glows
- it isn't hiding: the seahorse and the octopus only count in the 6 s after a ping reaches them
- the lanternfish only come out with the lights **off**, and the anglerfish needs off, then on (see below)

| # | Zone | Creature | How you find it | Its line in the log | The hint (until you have it) |
|---|---|---|---|---|---|
| 1 | Harbour | **MOON JELLY** | drifting about the harbour | 95% water, 5% vibes. | *drifts in the harbour. hard to miss* |
| 2 | Harbour | **SARDINE SHOAL** | the silver shoal that turns all at once | A thousand sardines and one idea between them. The sub is named after them. | *silver, lots of them, all turning at once* |
| 3 | Harbour | **SEA OTTER** | floating on its back at the surface, cracking a shell on its tummy. Be shallow enough that the window shows the surface | Holds hands with its friends when it sleeps, so nobody drifts off. | *look up: it's floating on the surface* |
| 4 | Harbour | **HARBOUR SEAL** | round the Pier's legs, or pressing its face to your window (6.9) | Curious, whiskery, always hungry. Knocks on submarines to say hello. | *hangs about the Pier's legs* |
| 5 | Kelp | **SEAHORSE** | curled round a kelp stalk, the same colour as it: PING, then SNAP | The dad carries the babies. He is very tired. | *hides in the kelp. give it a PING* |
| 6 | Kelp | **GARIBALDI** | the bright orange fish guarding its patch | Bright orange and very cross about it. | *the brightest thing in the kelp* |
| 7 | Kelp | **LEOPARD SHARK** | cruising along the kelp's floor | Spotty, sleepy, and only interested in crabs. | *cruises the kelp forest's floor* |
| 8 | Kelp | **SEA TURTLE** | paddling through the kelp, and up to breathe now and then | Older than the lighthouse. Loves jellyfish. Hates plastic bags. | *paddles through the kelp* |
| 9 | Reef | **CLOWNFISH** | in an anemone | Lives in an anemone that stings everyone but them. Don't ask how. | *at home in an anemone on the reef* |
| 10 | Reef | **OCTOPUS** | pretending to be a rock on the reef: PING, then SNAP | Eight arms, three hearts, blue blood, and right now it's pretending to be a rock. | *looks exactly like the reef. PING it* |
| 11 | Reef | **MORAY EEL** | pokes out of its hole now and then | Opens and shuts its mouth all day. It's breathing, not being rude. | *pokes out of a hole in the reef. patience* |
| 12 | Reef | **MANTA RAY** | gliding over the reef | Glides like a kite, eats like a hoover. Its cousins PANCAKE and WAFFLE live in the ocean tank. | *glides over the reef* |
| 13 | Wreck | **GIANT GROUPER** | looking out of a hole in the wreck's hull | Moved into the LUCKY HERRING years ago. Pays no rent. | *lives in the wreck* |
| 14 | Drop-off | **SWORDFISH** | streaks across the top of the drop-off every 30 s or so: be quick | The fastest thing in the sea. Late for something. | *zooms past the drop-off. be quick* |
| 15 | Drop-off | **LANTERNFISH** | below 400 m on the drop-off. Lights OFF, and after a moment the dark fills with tiny blinking lights | Glows so its friends can find it in the dark. Shy of floodlights. | *down the drop-off. turn the LIGHTS OFF* |
| 16 | Drop-off | **HUMPBACK WHALE** | gliding past in the open blue, singing (you hear it first), on some dives: 1 in 4, and always on the whale mission | Its songs last twenty minutes. The same song. Over and over. | *out past the drop-off, some dives. listen for singing* |
| 17 | Trench | **ANGLERFISH** | lights OFF in the trench, and a little glowing lure comes bobbing up. Lights ON: there's the anglerfish, startled, for 4 s. SNAP it | Dangles a light to lure snacks. The snack is usually whoever came to look at the light. | *lights OFF to find its lure. then lights ON* |
| 18 | Trench | **DUMBO OCTOPUS** | flapping its ear-fins over the trench floor, with the floodlights on | Flaps its ears like a flying elephant. Lives deeper than any other octopus. | *flaps about the trench floor. bring the floodlights* |
| 19 | Trench | **YETI CRAB** | on the smoking vents, with the floodlights on | Grows its dinner on its hairy arms. Lives by the vents, where it's warm. | *by the smoking vents at the bottom of the trench* |
| 20 | Trench | **GIANT SQUID** | on some dives it comes to the lights and grabs the hull (6.9). SNAP it before you ZAP it | Eyes the size of dinner plates. Likes submarines. A bit too much. | *drawn to the lights in the deep, some dives. hold on* |

- **THE SEA LIFE LOG** is a book, like the chem lab's recipe book.
  - It has a page per zone, with each creature's picture, name and line.
  - The ones you haven't got are dark shapes with ??? and the hint.
  - *FOUND 12/20* is at the top.
  - You can read it at the chart table aboard, or at the pen's dive board. It's kept in your save, so it follows your
    account.
- **10 kinds: the DIVING HELMET** (a hat). It's brass and round, with a round glass faceplate showing your face, a ring
  of bolts, and a little air hose curling off the back.
- **All 20: the MARINE BIOLOGIST badge.**
- **How quickly they come:** riding the tour and snapping whatever goes past should get about 8-10 kinds on a first
  dive (the simulation will check). The rest need pings, lights off, quick hands, luck, or friends.

### 6.8 Treasure

- **Each dive's seed scatters six finds** on the seabed, at least one in each zone from the harbour to the trench, plus
  the mission's own find when it has one. The kinds:
  - **COINS:** a little pile of gold, glinting in the sand.
  - **A PEARL IN A CLAM:** a giant clam on the reef that opens for 2 s and shuts for 4. Grab it while it's open, or
    *the clam says no*.
  - **A MESSAGE IN A BOTTLE:** a green bottle with a rolled-up note. The note's read out when it lands in the bin, and
    stays there to read again.
  - **THE CHEST,** in the wreck's torn hold, on every dive. It's heavy: the claw grinds and strains, and coins spill out
    as it comes up.
  - **ODD THINGS:** a rubber duck, a traffic cone, a phone (ringing: *1 MISSED CALL: MUM*), a garden gnome,
    sunglasses, a trumpet, a tyre, a snow globe.
- **THE OTHER BOOT** is very rare (1 dive in 40, and always on its mission), at the bottom of the trench.
  - The first crew to bring it up puts it in the aquarium's OLD BOOT tank, next to its partner, for the whole city.
  - The plaque names whoever clawed it: *THE OTHER BOOT · FOUND BY JOSH*. MARINA cries a little.
- **THE TREASURE BIN** holds everything this dive brought up, for everyone to see. Finds pay at the end of the dive
  (6.15).
- **The bottle notes** (one per bottle, from the seed):
  - *if found, please return to the sea*
  - *help, I'm stuck in a bottle factory*
  - *roses are red, the sea is blue, this bottle's been floating since 1982*
  - *DEAR DIARY. today I was a bottle*
  - *the treasure is buried under the X. there are a lot of Xs down here*
  - *I told you we should have turned left at the kelp*
  - *if you're reading this, you owe me a sandwich*
  - *this is a message. it is in a bottle. the end*
  - *DORIS, if you find this, I'm sorry about the thing*
  - *the tide goes out, the tide comes in. nobody knows why*
  - *wish you were here. (you are here.)*
  - *pls send more bottles*

### 6.9 Cartoon trouble (never a real fail)

- **Two or three a dive** (three on the FIX EVERY FAULT dive), at times from the seed and at least 50 s apart, like
  the reactor's faults.
- A red marker blinks over the spot that fixes it, the Cap'n calls it out, and E there fixes it.
- **If nobody does, the Cap'n sorts it out after 40 s:** "Do I have to do everything myself?"

| Trouble | What happens | The fix |
|---|---|---|
| **LEAK** | a pipe sprays with a hiss, and water sloshes round everyone's ankles, rising. The sub goes sluggish (half speed) | turn **THE VALVE WHEEL**. It spins, the spray stops, and the water gurgles away down the drain |
| **A VISITOR ON THE HULL** | *In the shallows (above 200 m):* **a curious seal** squashes its face against the glass, knocking with a flipper. The sub won't move while it's in the way. *In the deep, with the floodlights on:* **the GIANT SQUID.** Tentacles slap across the window, suckers on the glass, the lights flicker, and the sub shakes and can't move | *The seal:* **SNAP its photo.** It poses, then swims off happy. *The squid:* SNAP it for the log, then **ZAP** it (a harmless tickle). It lets go with a squelch and jets off in a cloud of ink, and the DAYS SINCE THE LAST SQUID sign goes back to 0 |
| **LIGHTS OUT** | a fuse blows with a bang. The cabin lamps and the floodlights die, the red emergency light comes on, and the sonar and the claw cam go dark | flip the lever on **THE FUSE BOX** |
| **JELLY IN THE INTAKE** | the engine coughs and splutters. The sub drifts slowly off course and won't answer the helm | pull the **INTAKE** lever on the engine. WHOOSH: a jellyfish pops out past the window, unharmed and a bit offended |

- **A visitor that's due waits** until the sub is shallow enough or deep enough to be one or the other.
- **Just for atmosphere:** below 500 m the hull groans now and then, the lamps swing, and every so often a rivet pings
  out of the wall and bounces across the deck. Nothing to fix. Probably.
- Being sluggish, stuck or drifting slows the autopilot too, but the tour is timed with room to spare.

### 6.10 A mission each dive

- The dive number picks the mission, from a shuffled rotation, so it's never the same twice running.
- It's on the pen's board before you board, and on the cabin's board with its progress.
- **MISSION COMPLETE** puts up a banner with a fanfare, and pays 3 tokens each (6.15).

| Mission (the board's name) | What to do | What helps |
|---|---|---|
| **SNAP THE WHALE** | photograph the humpback | it always comes on this dive, and the tour passes the drop-off when it does |
| **RAISE THE BELL** | claw up the *LUCKY HERRING*'s bell | it's lying on the sand by the wreck's bow, a blinking marker on the sonar |
| **TOUCH THE BOTTOM** | touch the floor of the trench | the tour stays above it, so someone has to steer down. BONK = done |
| **SPOT 8 KINDS** | photograph 8 different creatures this dive, between you | the tour passes more than 8 |
| **RESCUE THE DUCK** | find the rubber duck lost somewhere between the reef and the trench, and claw it up | ping the sonar: it's the yellow blip |
| **FIX EVERY FAULT** | fix all three troubles before the Cap'n has to | there are three troubles on this dive |
| **MAP THE REEF** | ping the sonar within 60 m of each of the reef's three yellow survey buoys | they're squares on the sonar, and the board ticks them off |
| **FIND THE OTHER BOOT** | claw it up from the trench floor | it's always there on this dive |
| **TEA AT THE BOTTOM** | make a cup of tea deeper than 1000 m | it was the Cap'n's idea. They'll drink it |
| **CLEAN THE HARBOUR** | claw up 3 bits of litter (cans, a tyre, a plastic bag, the trolley) from the harbour and the kelp | five lie there on this dive |

### 6.11 The baby octopus

- On about **one dive in six** (from the seed), at some point in the dive, **a baby octopus suckers onto a pane** for
  20 s.
  - It's a pink blob with big eyes and eight curly arms spread on the glass, suckers showing, blinking at you.
  - A *blub!*, and the Cap'n: "We've got a passenger!"
- It's on the glass, so it goes wherever the sub goes.
- **SNAP it, and when the sub surfaces it has followed you home: everyone aboard gets the BABY OCTOPUS pet.** The Cap'n:
  "Looks like we've got a stowaway."
- If nobody snaps it, it lets go and swims off, waving.
- **The pet:**
  - it bounces after you on its curly arms and blows a bubble now and then
  - when you stop, it sits in a little puddle
  - emote at it and it squirts a tiny puff of ink

### 6.12 CAP'N BARNACLE

- **Their day follows the dive.** They're on the dock at the gangway while it boards ("All aboard!"). At the horn they
  go up the gangway, then come down the ladder into the cabin, and they're at the bow for the whole dive. When it's
  back, they're on the dock again.
- **They never stand on a station** (the MARINA lesson). They stand at the bow beside the wheel, with the AUTOPILOT
  button on their side of it. The golden test checks this.
- **Lines when you talk to them:**
  - "Twenty years I've sailed her. Well. Six months. Feels like twenty."
  - "Ping the sonar in the kelp. Seahorses are shy."
  - "The claw's rigged. Same people who made the arcade's."
  - "Lights off in the deep and wait. Something always comes to look."
  - "If you see THE OTHER BOOT, grab it. MARINA's been waiting years."
  - "The escape hatch works. I tested it. Once. By accident."
- **On the dive** (each browser says them when the sub gets there):
  - boarding: "All aboard! Mind your heads, she's a SARDINE." · "Today's mission's on the board."
  - diving: "Dive, dive, dive!" · "Is the hatch shut? The hatch is shut."
  - the harbour: "Mind the Pier's legs. And the trolley. Who throws a TROLLEY in the sea?"
  - the kelp: "Kelp forest, off the starboard side!"
  - the reef: "The reef! Look, don't bump."
  - the wreck: "The LUCKY HERRING. Not so lucky."
  - the drop-off: "Here's the drop-off. Hold on to something."
  - the trench: "Lights on. We're in the deep now." · "Lights off a moment... look at that."
  - the whale: "Mind the whale. Everyone mind the whale."
  - troubles: "Leak! The red wheel!" · "SQUID! Picture first, then ZAP it!" · "It's a seal. He wants his photo taken."
    · "Fuse! The box by the claw!" · "Jelly in the intake! Gently!"
  - treasure: "Treasure! In the bin!" · "A bottle! Read it out!" · "THE OTHER BOOT! MARINA's going to cry."
  - home: "That's the time! Hold on to your hats, full speed home!" · "Home sweet pen. Mind the gap on the way out."
- **MARINA** gains a line: "Bring me back something from the deep! Not a squid. We've got a squid." After THE OTHER
  BOOT's found: "The boots are together at last. I'm not crying. You're crying."
- **OLD SALT** on the Pier: "That yellow submarine goes all the way down to the trench now. In MY day we had a rowing
  boat and a bucket."

### 6.13 Alive, and light

**Something moving in every screen width of the cabin:**
- the sea in the window
- the engine's pistons chugging (faster with the speed), its flywheel, and a puff from the exhaust
- the needles: the depth gauge and the engine's pressure gauge (the barometer never moves)
- the sonar's sweep, the claw cam's feed, and the NAV screen's dot
- the mug sliding along the galley counter as the sub tilts, and the caged lamps swinging on their chains
- the drip into the bucket, and condensation running down the window frames
- the kettle's steam when someone makes tea

**Light** (on the glow layer):
- **The window** lights the cabin in the sea's colour: green-gold in the harbour, then blue, then dark. When you're
  shallow, the surface's ripples dance on the deck.
- **The cabin's orange caged lamps** matter more as it gets dark outside (the room dims with depth).
- **The screens:** the sonar's green, the claw cam, the NAV screen, and the DIVE BOARD's amber.
- **The floodlights** spill back in when they're on.
- **LIGHTS OUT:** everything red, with the emergency lamp strobing.

**New colours** (tokens in palette.ts):
- `SB`, the cabin: the cream paint, the sea-green band, brass, red wheels, black rubber, the screens' green and amber,
  and the lamps' orange
- `SEA`, the sea:
  - the water at 0, 60, 200, 400 and 800 m
  - sand, ooze and rock
  - kelp, the corals, and the wreck's rust

### 6.14 Sounds and music

- **The cabin:** the engine's putter (with the speed), a low hum, the drip, creaks and hull groans in the deep, and a
  rivet's *ping*.
- **The stations:**
  - the wheel's creak, and the HORN (BWAAMP)
  - the camera's clunk and the flash's whine
  - the floodlights' big clunk
  - the sonar's *pinnng* and its echo
  - the claw's whirr and clunk, and the bin's clatter
  - the periscope's squeak, and the kettle's whistle
- **The sea:** bubbles, whale song (you hear it before you see it), the seal's bark and knock-knock, the squid's wet
  slap, the ZAP, the intake's WHOOSH, and the leak's hiss.
- **The dive:** the horn, the hatch's clang, the ballast's hiss and gurgle, and the gate's clank. Home: the engine at
  full whine. Then the surfacing splash, and the DIVE REPORT's fanfare.
- **Music:** a new track, ***TWENTY THOUSAND BEEPS***. It's slow and pinging, with a sonar blip on the beat. It gets
  lower and slower as you go deeper, and brighter back in the shallows.

### 6.15 Rewards

- **The pay** (`dive_pay`, on the server), for each crew member at the end of a dive:
  - 1 token for the dive
  - plus 1 for each find in the bin, up to 4
  - plus 3 if the mission's done
  - That's at most 8 a dive and **24 a day**. The server checks its own clock, so it only pays just after a dive
    surfaces, and once per dive.
- **The DIVING HELMET** (a hat): 10 kinds in your log.
- **The BABY OCTOPUS** (a pet): be aboard when one's photographed.
- **The MARINE BIOLOGIST badge:** all 20 kinds.
- **The daily quest:** *Go on a dive in SARDINE 1* (aboard from the dive all the way to the surface).
- **THE OTHER BOOT** in the gallery, for the whole city.

### 6.16 Seasons

- **Halloween:**
  - aboard: a pumpkin on the galley, and cobwebs in the corners of the ribs
  - in the sea: the wreck's portholes glow green, and once a dive a ghostly captain waves from its deck
- **Winter:**
  - aboard: string lights along the ribs, and a tiny tree by the chart table
  - in the sea: a wrapped present on the seabed as one of the odd finds. The marine snow is, for once, on theme.

### 6.17 Build, network and checks

**New files:**
- `world/sub.ts`: the cabin (the room), its stations, and the window's frame
- `world/sea.ts`: the sea, meaning the seabed and scenery, the light by depth, the floodlights, and drawing the
  window's view
- `world/sealife.ts` gains the new creatures: the kelp, reef, wreck and deep ones, the whale, the squid, and the baby
  octopus
- `game/sub.ts` gains the rules, kept pure so they can be tested:
  - the sea's shape and zones
  - the sub's movement and the autopilot's tour
  - the dive's seed: the mission, the troubles, the finds, the whale and the octopus
  - what a photo sees, and the pay
- `features/sub.ts`: the stations, the skipper, the messages, the log, the report, and the escape hatch
- `ui/sealog.ts` (the SEA LIFE LOG), plus the CLAW CAM strip and the periscope's view

**Network:**
- **Whoever's at the helm flies the sub.**
  - Their browser moves it and sends `helm` { x, y, vx, vy, stick } whenever the stick changes, and twice a second
    while it moves.
  - Every other browser moves the sub the same way in between, so it's smooth without a stream of messages.
- **With nobody at the helm, the autopilot flies it.**
  - The skipper keeps the dive in room state `dive` and re-sends it every 3 s. The skipper is the crew member with the
    lowest id, like every room's host.
  - The state holds:
    - where the sub was and when, and where the autopilot's heading
    - the lights
    - the troubles fixed, and by whom
    - the finds taken
    - the kinds snapped this dive
    - the mission's progress, and the octopus
  - Every browser works the autopilot forward from it, like the reactor's shift. If the skipper leaves, the next one
    takes over.
- **Everything else is one small `sub` message:** SNAP (what the snapper's window caught), PING, GRAB (which find, and
  whether it slipped), FIX, LIGHTS, TEA and HORN.
  - The claw's position goes about 4 times a second while someone's moving it, so the claw cam matches on every screen.
  - The skipper folds them all into the room state.
- **What depends on where the sub is** is decided by whoever's flying it: a seal or a squid, the anglerfish rising, the
  whale answering the horn, a mission being done.
- **From the clock, as in push 1:** the timetable, the dive's seed, the pen, the Pier's periscope, and the map.
- **Cost:**
  - A crew of four, with one steering and one on the claw, sends under 10 messages a second. That's about what two
    people walking send.
  - The autopilot alone sends one message every 3 s, and nothing at all is sent while nobody's aboard.
- **Trust:** as elsewhere, the crew's browsers decide what was photographed and grabbed. `dive_pay` can't check the
  finds or the mission, only the timetable and the caps, like `reactor_pay`.

**SQL `0024_sub.sql`:**
- `private.sub_pay`: who was paid, for which dive, and how much
- `public.dive_pay(finds, mission)`:
  - works out from its own clock which dive just surfaced, and only pays in the 70 s after one surfaces
  - pays once per dive: 1, plus the finds (up to 4), plus 3 for the mission; 24 a day at most
  - returns the pay and your tokens
- `public.found_boot()`: THE OTHER BOOT joins the OLD BOOT's tank with your name, if nobody's done it yet.
  `aquarium_tanks` then returns it with the tanks.
- the `dive` quest and the `biologist` badge

**Tuned by simulation first** (scratch scripts, like the reactor's):
- the tour: it sees every creature that's always there, never touches the rock, and gets home in time from anywhere
- an idle rider snapping whatever goes past: 8-10 kinds a dive
- every mission, played by a bot crew of one and of three: each should be doable solo in one dive, and easy for three
- the pay, across hundreds of dives

**Tests:**
- **A sweep of 10,000 dives** (the reactor-freeze lesson):
  - every mission, trouble, find, whale and octopus is well formed
  - every find is on the seabed, in the water, within the claw's reach, and not inside rock
  - the troubles fall inside the dive and 50 s apart
  - the whale and the octopus come at the right rates
- **The SQL suite for 0024:** pay only after a dive, once per dive, the sums, the caps, and found_boot only once.
- **Golden fingerprints:**
  - the cabin at the dock, diving, and in every zone
  - the lights off, and each trouble
  - the octopus on the glass, and the new creatures
  - the DIVING HELMET on both bodies, and the BABY OCTOPUS
  - the pen's new board
  - The old ones must stay unchanged.
- **Two players in real windows:**
  - one steering and one on the camera: the same view and the same log
  - a hand-over to the autopilot
  - a find grabbed by one, in the bin for both
  - a trouble fixed by the player who isn't the skipper
  - the skipper leaving mid-dive
- **Doors and the map:**
  - the gangway walked both ways while boarding, and shut outside it
  - the escape hatch to the Pier
  - the map and GO blocked mid-dive
- **A phone:** the d-pad, the claw and the periscope.
- **60 fps with a full crew.** The window is the busy part (see below).
- **3× close-ups** of the cabin, and of the window in every zone.

**Performance** (the aquarium's lessons):
- The sea's still scenery (the seabed, the rocks, the coral, the wreck, the cliffs, the Pier's legs) is drawn once in
  tiles, as the sub gets near, and stamped after that.
- The creatures are pre-drawn frames. Only the moving ones are drawn each frame, and only inside the window.
- The dark and the floodlights' oval are one cached mask.
- The cabin's still parts are baked, or drawn once and stamped (`stillProp`).
- The target is the aquarium's figure, about 50% busy at CPU ×4, with a full crew aboard.

### 6.18 Not in this push

- pinning a dive photo to the Lab's photo wall
- a second sub, or sub races
- the Pier's periscope wake following where the sub really is (it stays on the clock)

## 7. Rewards, all together

- **Tokens:** your first donation of each kind of fish (37 in all), and dives (up to 8 a dive, 24 a day: 6.15).
- **Spend them in the gift shop:** four clothes and four pieces of furniture.
- **Earned:**
  - the DIVING HELMET (10 creatures in the SEA LIFE LOG)
  - the BABY OCTOPUS pet (a stowaway)
  - THE OTHER BOOT in the gallery, for the whole city, with the finder's name
- **Badges:**
  - **CURATOR:** donate all 12 kinds of fish (push 1)
  - **MARINE BIOLOGIST:** fill the SEA LIFE LOG (push 2)
- **Daily quests:**
  - *Donate a fish to the City Aquarium* (push 1)
  - *Help out at feeding time* (push 1)
  - *Go on a dive in SARDINE 1* (push 2)

## 8. Sounds and music

- **The aquarium:**
  - a soft, deep water hum, bubbling filters, and a drip in the pen
  - the feeding bell, and splashes as the food lands
  - the till's KA-CHING, the ledger's page flip
  - a donation's PLOP and a little fanfare
  - the touch pool: a snip, a squirt, *ouch*
  - the diver's squeak on the glass
- **The pen:**
  - water lapping, the horn (a deep BWAAMP)
  - the hatch clang, the ballast hiss and gurgle
  - chains and the crane's creak
- **The sub (push 2):** see 6.14.
- **Music:** a new calm, watery track for the aquarium, *DOWN WHERE IT'S BLUE*, dreamier in the jelly room. Push 2
  gets *TWENTY THOUSAND BEEPS* for the dives (6.14).

## 9. Seasons

- **Halloween:** a pumpkin on the ticket desk, cobwebs across the gallery's corners, a skeleton fish in the big tank,
  and the diver in a witch hat.
- **Winter:** a tree in the lobby, string lights along the tank tops, the diver in a Santa hat, and a snowflake
  decoration in the big tank.
- Both come with string lights in the gaps between the signs, as in the Science Wing.

## 10. Build, network and checks

**Push 1 (the aquarium):**
- **New room** `aquarium` (`world/aquarium.ts`), plus `features/aquarium.ts` (donating, feeding, the shop, the touch
  pool, the sub's timetable seen from the pen) and `ui/aquarium.ts` (the gallery panel, the shop).
- **The Pier** gets wider, with the facade and the pen's periscope wake.
- **The map:** the building, the new place, and the dot and wake for the sub.
- **New cosmetics:**
  - CAPTAIN'S HAT, SHARK FIN, SNORKEL, SAILOR TOP (shop)
  - four pieces of furniture
  - the DIVING HELMET and the BABY OCTOPUS art can wait for push 2
- MARINA and CAP'N BARNACLE; OLD SALT gains a line about the aquarium.
- **Network:**
  - RPCs `aquarium_tanks()` (the 12 plaques, plus your biggest catch of each kind), `donate_fish(fish)` and
    `gift_shop(item)`
  - room state `aq` (a number that goes up after a donation, so everyone looks again)
  - broadcast `feed` `{ x }` (a scoop thrown)
  - feeding time, the jelly disco and the sub's timetable are all worked out from the clock, with no messages
- **SQL `0023_aquarium.sql`:**
  - the plaques table and the donations table
  - the three RPCs
  - the shop's prices, and the furniture's prices
  - the `donate` and `feeding` quests, and the `curator` badge
- **Tests:**
  - SQL suite:
    - donating needs a catch, and uses your biggest
    - a bigger fish takes the plaque, and a smaller one doesn't
    - the thank-you pays once per kind
    - the shop spends tokens, refuses when you're short, and doesn't sell twice
  - golden fingerprints for the room, the Pier and the new clothes
  - doors walked both ways, and the map's route
  - two players: a donation seen by both, and feeding scoops seen by both
  - 60 fps with 12 bots (the big tank is the busy part, so it's culled to the camera)
  - 3× close-ups by day and night

**Push 2 (the submarine):** the files, the network, `0024_sub.sql`, the simulations and the tests are in 6.17.

---

## As built: push 1 (THE CITY AQUARIUM)

- **It came out as the brief says,** with these changes and details:
  - **Everything sits where the camera looks.** On a laptop the camera shows about 170 px above your feet, so:
    - the floor is shallower (y 478-596)
    - the gallery's two rows of tanks sit at eye level
    - the big tank's residents swim in its lower half, where you see them as you walk past
    - the benches frame the whole tank while you sit (a spot can now carry its own `watch`), and the jelly room's
      bench frames the jellies
  - **The Pier:** the aquarium stands on the shoreline, so only its front shows.
    - The SUB PEN is a steel boathouse beside it, with a porthole where you can see SARDINE 1's yellow tower while
      it's in.
    - The periscope heads out from the building's left end past the lighthouse, the only open water in view, and
      comes back the same way.
    - The old beach is pixel-for-pixel the same as before (checked against the last commit). The Pier's new end only
      starts at the AQUARIUM signpost.
  - **The sub pen:**
    - The gangway runs down to the deck beside the conning tower, since over it hid the name. While the sub is out
      it's stowed, with red lamps on its posts.
    - The DIVE BOARD sits low enough to read from the dock, with short wetsuit lockers under it.
  - **The feeding step** by the ladder is only for FEED. The ladder's own LOOK line was taking E away from it, so it
    went.
  - **Donating:**
    - A catch you have can always be donated, even a smaller one, for the thank-you and the CURATOR badge. It only
      takes the plaque when it's bigger than the one on show.
    - A bigger catch later puts that one in your records.
    - The same fish twice is refused.
  - **The Pier's catch toast** now adds *BIGGER THAN THE AQUARIUM'S!* (or *THE AQUARIUM WANTS ONE!* for an empty tank).
  - **MARINA** wears a lab coat and the SNORKEL. Her day is 15 minutes on the clock: at every feeding she climbs up the
    ladder and throws food in from there. (At first she fed standing on the FEED step at its foot, and E there offered
    TALK instead of FEED: Josh spotted it live. She now keeps clear of every spot players use, the touch pool
    included, and the golden test fails if any NPC waits where E would offer TALK instead of a spot.) **CAP'N BARNACLE**'s day follows SARDINE 1's 8 minutes: at the gangway while it boards,
    and back there to meet it.
  - **The drawing is heavy** (tanks, creatures, jellies, a submarine), so:
    - the tank's still water and far rocks are baked into the set
    - props are drawn once and stamped (`stillProp`)
    - the plaques' text is cached, and SARDINE 1 is pre-drawn
    - the busy parts only draw when they're in view

    With 12 bots at CPU ×4 it runs 47-51% busy, against the Square's 41%. The chem lab's busiest moment was 54%.
- **Tested:**
  - the SQL suite for 0023 (38 checks)
  - two players in real windows:
    - the doors walked both ways, and the map's route
    - a donation seen straight away by the other player
    - a bigger catch taking the plaque
    - a feeding scoop seen by both
    - both quests handed in
  - the characters' routines against the clocks
  - the full gallery, the seasons, the phone's panels and FEED button
  - golden fingerprints (211)
    - The old hats, faces, outfits and sounds are proven unchanged by limiting the grids.
    - The Pier's old part is identical, and the map changed only around the aquarium.

## As built: push 2 (SARDINE 1)

- **It came out as the brief says,** with these changes and details:
  - **The cabin is 1000 × 600, not 620.** The deck is shallower, and the camera keeps the window just under the HUD
    (`room.frameTop`), so on a laptop you always see the whole window, the stations and the deck.
    - The stations don't swing the camera about (no `watch`); the whole window is always in view.
    - Everything that stands in front of the glass is baked as its own layer and stamped over the live sea: the galley,
      the fuse box, the claw and sonar consoles, the camera's tripod, the lights plate, the valve's pipe and the ZAP box.
    - A tall phone shows more of the hull overhead, so it's furnished: ribs going up into the dark, the air duct, the
      oxygen bottles, the Cap'n's hammock (with a sock), a net of glass floats with a starfish, a lifebuoy, the cables.
  - **The tour** passes over the wreck at 110-136 m (so the claw can reach its hold, and the bell by its bow), goes over
    the edge at 190-232 m, and runs along the trench floor at about 1100-1120 m.
  - **The trickier creatures need a trick,** so the log lasts. Tuned by simulation: a lazy snapper on autopilot gets
    10-11 kinds on a first dive.
    - the otter: only from near the surface (look up)
    - the moray: pokes out once the sub has held still by its hole for 3 s
    - the grouper: comes out of the wreck to look at the floodlights
    - the anglerfish: 3 s of dark in the deep, then the lights back on
  - **The claw:** SPACE (the GRAB button) grabs, and E steps away. While anyone's at the claw the Cap'n crawls, and he
    holds her still over treasure, so the claw works solo.
  - **UP PERISCOPE** sees the surface whenever the Pier can see the periscope up (the first 44 s out and the last 44 s
    home, shallower than 60 m), or within 12 m of the surface under a pilot. The autopilot never goes that shallow, so
    with 12 m alone you'd never see it on your own.
    - It's the whole city from the sea, as it is right now: the Roof's launch tower with the rocket on its real
      timetable, THE LOFTS, the reactor's cooling tower (steaming harder while a shift's on, green after a meltdown),
      the Pier with its lamps and bonfire, the lighthouse and its beam, and the aquarium's whale tail.
    - Round the back: the sun going down over the sea, the moon and stars, a ship, a buoy. The weather as it is (rain, a
      storm's flashes, snow on an overcast sky, fog).
  - **A visitor always comes.** The seal comes in the shallows, the squid to the lights in the deep, and from 385 s one
    comes regardless. So FIX EVERY FAULT can't get stuck at 2 OF 3 when the crew keep the lights off in the deep.
  - **A pilot who pushes the stick** while a jelly's in the intake or a visitor has hold of her is told why nothing
    happens, and what fixes it.
  - **The dive board** says 5 OF 8 (the pixel font has no slash).
  - **THE ESCAPE HATCH** pops you up on the Pier in a RUBBER RING (a new effect everyone sees, FX 8).
  - **The map:** SARDINE 1 isn't a place of its own.
    - The aquarium's card says BOARDING NOW or BACK IN m:ss, and takes you to the pen.
    - Mid-dive the map says you're on a dive (or to use the ESCAPE HATCH).
  - **The network:**
    - Every browser flies the autopilot from the skipper's snapshot (re-sent every 3 s), and the pilot sends `helm`.
    - A snapshot from a clock that's ahead of yours starts from now, rather than freezing the sub until your clock
      catches up. The two-player test found this.
  - **Fixed on the way:**
    - The aquarium's and the chem lab's room plates had no style.
    - A storm's lightning would have washed the sea window (and the periscope) white between strikes. It flashes only
      at the strikes now, and less the deeper you are.
- **Tested:**
  - SQL: 0024's suite (26 checks), and the whole suite (448 checks)
  - simulation:
    - the tour never touches the bottom
    - the run home is clear from all 13,311 start points
    - a 10,000-dive sweep (missions, troubles, finds, whales, octopuses) is in the golden test
  - one player, played through:
    - boarding by walking up the gangway, and the ladder back out
    - the hatch shut mid-dive, and the map blocked
    - the helm, the camera, the sonar, the lights
    - the claw bringing up the chest
    - a trouble fixed
    - the log, the bin and the periscope
    - the report and its pay
    - the escape hatch
  - every kind of mission done, plus:
    - the anglerfish trick
    - the seal (the ZAP refuses) and the squid (a photo, then ZAP)
    - the late visitor
    - a jammed helm, freed at the intake
    - the baby octopus coming home as a pet
    - the whale singing back to the horn
    - the periscope heading out, deep, coming home and docked
  - two players in real windows:
    - one sub in both, and the steering seen by the other
    - photos in both logs
    - a fix by the one who isn't skipper
    - the skipper bailing out, and the other taking over mid-dive
    - both paid
  - a phone:
    - the d-pad with HORN and GRAB, and steering by touch
    - the CLAW CAM (nothing on top of it)
    - the periscope and the log fit
  - performance: with 12 bots aboard at CPU ×4 it runs 34-43% busy (the harbour is the busiest), against the Square's
    34% in the same run
  - golden fingerprints (248):
    - new ones for every zone of the sea, the troubles and visitors, the claw and its CLAW CAM, the new creatures and
      finds, and the periscope's view in each weather
    - the aquarium and the Pier changed only where the sub is
