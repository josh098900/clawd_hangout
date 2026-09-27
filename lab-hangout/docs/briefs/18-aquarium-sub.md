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

## 6. SARDINE 1: the submarine (push 2, an outline to expand before building it)

### 6.1 The timetable (every 8 minutes, from the clock)

| k (s into the 480 s loop) | What happens |
|---|---|
| 0-90 | **BOARDING**: the hatch is open in the pen. The horn goes at 60, and the bell at 80 |
| 90-100 | **DIVE, DIVE:** the hatch shuts and the water rises over the windows |
| 100-420 | **THE DIVE**, 5 minutes 20 seconds. Steer anywhere, or let the autopilot tour |
| 420-470 | **HEADING HOME**: the autopilot takes over and brings it back fast, from wherever it is |
| 470-480 | **SURFACE**: the water drains off the windows and the hatch pops |

- Everyone on the server shares one sub, and anyone at the aquarium can see when it's leaving.
- **Once it's down, the hatch stays shut.** The map says *You're on a dive! Wait till you surface (2:40), or use the
  ESCAPE HATCH*.
- **The escape hatch** shoots you up in a rubber ring. You bob up by the Pier with a splash, and the sub carries on
  without you.

### 6.2 Inside — about 1000 × 620

A cramped observation deck (it's called SARDINE for a reason). **The back wall is nearly all window:** three big
panes between riveted ribs (x ~120-960, y ~322-458), where the sea goes by. Along the floor:
- the ladder up to the hatch, and the red ESCAPE HATCH
- a tiny galley: a kettle, a tin of sardines, a mug that slides when the sub tilts
- the engine, with chugging pistons
- the stations (§6.4), a TREASURE BIN, and the DIVE BOARD (the mission, depth, time left)

As it dives, the light through the windows goes from green-gold to deep blue to black. Then the cabin runs on its
own orange lamps and the glow of the screens.

### 6.3 The sea outside

The sea is one big side-view map, drawn live in the window around where the sub is. Out from the aquarium:

| Zone | Depth | What's there |
|---|---|---|
| **THE HARBOUR** | 0-60 m | the pier's pilings, the aquarium's sea gate, a lost shopping trolley, sunbeams, moon jellies, sardines; an otter floating on the surface |
| **THE KELP FOREST** | 60-120 m | tall swaying kelp, seahorses, garibaldi, a leopard shark, a sea turtle |
| **THE CORAL REEF** | 60-140 m | coral heads, anemones and clownfish, a moray, a hidden octopus, a manta ray |
| **THE WRECK** | ~200 m | the sunken *LUCKY HERRING*: its bell, a chest, a giant grouper living in the hull |
| **THE DROP-OFF** | 200-800 m | a cliff into the deep: lanternfish, a swordfish, and some dives a humpback whale going by, singing |
| **THE TRENCH** | 800-1200 m | pitch black: smoking vents with yeti crabs, an anglerfish, a dumbo octopus, sometimes the GIANT SQUID, and at the very bottom... THE OTHER BOOT |

### 6.4 The crew stations

Each is a spot like the reactor's. Solo, you run between them; with friends, you split up and shout.
1. **HELM** (at the bow): a big brass wheel with a depth gauge and a little nav map. The arrows drive: left and right
   go forward and back, up and down rise and dive. The camera frames the window while you steer. On a phone, a d-pad.
2. **CAMERA and FLOODLIGHTS:** a big camera on a tripod aimed through the glass, and the floodlight lever.
   - **SNAP** photographs everything in the window, and whatever's in it goes in **everyone's** SEA LIFE LOG.
   - In the deep, the window is black except for the floodlight beam and anything that glows. Some creatures only
     show with the lights **off** (lanternfish, the anglerfish's lure), and one is drawn **to** them (the giant squid).
3. **SONAR:** a round green screen. **PING** sweeps out, shows blips of nearby things, and briefly lights up hidden
   things in the window (the camouflaged octopus, a seahorse in the kelp, treasure glinting in the sand).
4. **CLAW:** a joystick and a CLAW CAM screen showing the seabed under the sub. Near the bottom, lower the claw, line
   it up and GRAB. It's a claw machine at the bottom of the sea ("this claw is also rigged"). Finds drop into the
   TREASURE BIN.
5. **PERISCOPE:** it comes down from the ceiling. **Near the surface** it shows the Pier, the lighthouse, gulls and
   the sky as it really is (time of day, weather). **Deeper:** *Nothing but water. A fish looks back at you.*

### 6.5 The SEA LIFE LOG (20)

| Zone | Creatures |
|---|---|
| Harbour | MOON JELLY · SARDINE SHOAL · SEA OTTER (at the surface) · HARBOUR SEAL |
| Kelp | SEAHORSE (ping to see it) · GARIBALDI · LEOPARD SHARK · SEA TURTLE |
| Reef | CLOWNFISH · OCTOPUS (ping to see it) · MORAY EEL · MANTA RAY |
| Wreck and drop-off | GIANT GROUPER · SWORDFISH · LANTERNFISH (lights off) · HUMPBACK WHALE (some dives) |
| Trench | ANGLERFISH (lights off, then on) · DUMBO OCTOPUS · YETI CRAB · GIANT SQUID (rare, drawn to the lights) |

- The log is a book, like the recipe book: the ones you've found have their picture and a line, and the rest are ???
  with a hint.
- **10 found:** the **DIVING HELMET** (hat): brass, round faceplate, bolts, and a little air hose.
- **All 20:** the **MARINE BIOLOGIST** badge.

### 6.6 Treasure

- Each dive's seed scatters about six finds on the seabed: coin piles, a pearl in a clam (it opens and shuts, so time
  it), a message in a bottle (a silly note), the wreck's chest, and odd things (a rubber duck, a traffic cone, a
  phone).
- Very rarely, at the bottom of the trench: THE OTHER BOOT. MARINA will want it for the gallery, next to its partner.
- Finds go in the TREASURE BIN for everyone to see. At the end of the dive the crew is paid (§6.10).

### 6.7 Cartoon trouble (never a real fail)

Two or three a dive, from the dive's seed, like the reactor's faults. Each is fixed by pressing E at one spot.
- **LEAK:** a pipe sprays, water sloshes round everyone's ankles, and the sub goes sluggish. Turn the valve wheel.
- **SQUID ON THE HULL** (deep only; in the shallows it's a curious seal knocking on the glass instead):
  - tentacles cover the windows, the lights flicker, the sub shakes and can't move
  - hit the big **ZAP** button, and photograph it while it's there
- **LIGHTS OUT:** a fuse blows and the cabin goes red. Flip the breaker.
- **JELLY IN THE INTAKE:** the engine coughs and the sub drifts. Flush the intake.
- **And for atmosphere:** at depth the hull groans now and then. Nothing to fix. Probably.

### 6.8 A mission each dive

- It's picked from the dive number and shown on the pen's board before you board, and on the sub's board.
- The missions:
  - PHOTOGRAPH THE WHALE (it's guaranteed on that dive)
  - BRING UP THE SHIP'S BELL
  - TOUCH THE BOTTOM OF THE TRENCH
  - SPOT 8 KINDS OF SEA LIFE
  - RESCUE THE RUBBER DUCK (lost somewhere: use the sonar)
  - FIX EVERY FAULT
  - MAP THE REEF (ping the sonar at three buoys)
  - FIND THE OTHER BOOT
- **MISSION COMPLETE** puts up a banner and a fanfare, and pays a bonus.

### 6.9 The baby octopus

- On about one dive in six, **a baby octopus suckers onto the window** somewhere along the way, for about 20
  seconds.
- Photograph it, and when the sub surfaces it has **followed you home**. Everyone aboard gets the **BABY OCTOPUS**
  pet: it bounces after you on its curly legs and says *BLUB*.
- CAP'N BARNACLE: "Looks like we've got a stowaway."

### 6.10 The captain, the autopilot and the pay

- **CAP'N BARNACLE** steers whenever no player is at the helm. They follow the scenic tour and narrate:
  - "Kelp forest, off the starboard side!"
  - "Mind the whale. Everyone mind the whale."
  - "Lights off a moment... look at that."
- When you take the helm they step aside: "She's all yours. Don't hit anything expensive."
- **The pay:** at the end of a dive, each crew member gets:
  - 1 token for the dive
  - plus 1 for each find in the bin, up to 4
  - plus 3 if the mission was done

  That's at most 8 a dive and 24 a day. The server checks the timetable, so it only pays once per dive, just after
  one ends.

## 7. Rewards, all together

- **Tokens:** your first donation of each kind of fish (37 in all), and dives (up to 8 a dive).
- **Spend them in the gift shop:** four clothes and four pieces of furniture.
- **Earned:**
  - the DIVING HELMET (10 creatures in the SEA LIFE LOG)
  - the BABY OCTOPUS pet (a stowaway)
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
- **The sub (push 2):**
  - the engine's putter
  - the sonar **PING**, the camera shutter and flash whine
  - the claw's whirr and clunk, the periscope's squeak
  - hull creaks, the leak's hiss, the squid's wet slap, the ZAP
  - whale song
- **Music:** a new calm, watery track for the aquarium, *DOWN WHERE IT'S BLUE*, dreamier in the jelly room. Push 2
  gets a slow pinging one for the dives.

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

**Push 2 (the submarine):**
- **New room** `sub`, plus `game/sub.ts`: the timetable, the sea map, the creatures, the seeds, the missions and the
  trouble, kept pure so it can be tested.
- **Network:** the helm player's browser sends the sub's position (`helm`, about 8 a second while steering). With no
  one at the helm, every browser works out the same autopilot from the clock. Events (snap, ping, grab, fix, lights)
  are one small broadcast each. Whoever's piloting decides the things that depend on where the sub is.
- **SQL `0024_sub.sql`:** `dive_pay`, the `dive` quest, and the `biologist` badge.
- **Tests:**
  - a sweep of 10,000 dives: every mission, trouble and treasure well formed (the reactor-freeze lesson)
  - a two-player dive (one steering, one on the camera: the same view and the same log)
  - the escape hatch, and the map blocked mid-dive
  - a phone's d-pad and claw
  - 60 fps with the window busy

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
  - **MARINA** wears a lab coat and the SNORKEL. Her day is 15 minutes on the clock, so she's at the ladder for every
    feeding and scatters food. **CAP'N BARNACLE**'s day follows SARDINE 1's 8 minutes: at the gangway while it boards,
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
