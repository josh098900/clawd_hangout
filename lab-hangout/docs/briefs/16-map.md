# Step 16 — The map: design brief

The first step built to the polish standard (ART_STYLE §9). Josh reads this, adds to it or
changes it, and only then does any code get written.

**In one line:** press **M** (or the MAP pill) and a living pixel map of the whole world opens,
showing where everyone is. Click a place and you're there.

---

## 1. How it opens

- **The M key**, or the new **MAP pill** in the HUD, placed before QUESTS. On phones the pill
  shows a small folded-map icon.
- **Map boards in the world.** Each one is a real prop you can click (or press E at), which
  opens the map with a "YOU ARE HERE" star on that board's spot:
  - **The Square:** a city map kiosk by the Subway steps. This is new art (see §6).
  - **The Subway platforms:** the line map poster that's already on the wall becomes clickable.
  - **The Space Station:** a round orbital chart screen by the LANDER BAY. This is new art.
- **Closing it:** Esc, M again, the ✕, or clicking outside the map. The game keeps running
  behind it, dimmed, and your character stands still while it's open.

## 2. What it looks like

**A pixel diorama of the city, seen from above at an angle** (three-quarter view). You see the
roofs *and* the fronts of the buildings, so every place looks like its own room. It's drawn in
the game's own style:
- hard pixel rectangles
- the `K` / `DK` palettes
- lit windows and signs on the glow layer
- the same integer pixel scale as the game, so map pixels match world pixels

**The frame** is the game's panel chrome: dark translucent, with a 3px orange edge along the
bottom. The title **CITY MAP** is in Press Start 2P with the stepped orange drop shadow, and the
server name and the clock sit on the right of the title bar.

**The layout.** It follows the real geography, so the map teaches you the world:

```
  ┌────────────────────────── CITY MAP ─────────── LAB 1 · 21:04 ┐
  │  [ ORBIT inset ]                               [ MOON inset ] │
  │   station ring, rocket docked or away,         grey disc, the │
  │   the lander moving between them               base dome, the │
  │                                                buggy track    │
  │     ROOFTOP + SPACEPORT (rocket on its pad)                   │
  │     DEV DEN (upstairs)                                        │
  │     THE LAB ── ARCADE ── CINEMA ── STAGE ── SUBWAY ── ⋯ ──    │
  │  ════════════════ THE SQUARE (the street, lamps) ════════════ │
  │                                    CRYPT (steps down, ghostly)│
  │                                   LOFTS (tall, lit windows) ─ PIER ~~~ sea, lighthouse
  │   ┄┄┄┄ the Subway line (underground, dashed) ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
  │     (P) PARK station → CITY PARK (trees, pond, boats)         │
  │     (D) DINER station → THE GREASY BYTE (neon, chimney smoke) │
  │     (K) KARTS station → THE KART TRACK (loop, tyres, flags)   │
  └───────────────────────────────────────────────────────────────┘
```

- **The Square is the spine.** Its buildings sit in the same left-to-right order as their doors
  on the Square: Lab, Arcade, Cinema, Stage, Subway, Crypt, Lofts, then the Pier off the right edge.
- **The Lab is a tall building.** The Lab is on the ground floor, the Dev Den upstairs, and the
  Rooftop garden and the Spaceport on top.
- **The Subway** dips underground and runs as a dashed line out to the three far stops. Each stop
  has a roundel in the Subway's own tile colours and the place drawn beside it.
- **Space gets two insets** in the top corners, like a real map's "not to scale" boxes: ORBIT
  (the station) and THE MOON. A dotted flight path links the Spaceport to ORBIT and ORBIT to the Moon.

**Every place gets its own detailed art**, not just a box:
- THE LAB: glass doors, a cyan glow.
- THE ARCADE: a neon sign that blinks.
- THE CINEMA: the marquee with tonight's film title.
- THE STAGE: spotlights.
- THE CRYPT: an iron gate, steps down and a green wisp.
- THE LOFTS: a tall block with its windows.
- THE PIER: planks, the lighthouse, the bonfire.
- CITY PARK: trees, a pond and a boat.
- THE GREASY BYTE: a chrome diner with smoke from the chimney.
- THE KART TRACK: a looped track with a chequered flag.

## 3. What's alive on it

Everything below is worked out from the clock or from what the game already knows. **Nothing new
is sent over the network.**

**The clock**
- **Day and night:** it cross-fades with the Square's `dayness()`. At night, windows, signs and
  street lamps glow on the glow layer. Dawn and dusk get the Square's warm wash.
- **The weather:** the Square's shared weather falls on the map too (rain streaks, snow, fog).
- **The seasons:** Halloween pumpkins and the crypt's glow, winter snow on the roofs and the
  lights on the tree.

**The transport**
- **The train** is a small train sprite that moves along the Subway line, exactly where the real
  one is on its timetable.
- **The rocket:** on its pad, climbing along the flight path, or docked at ORBIT, following the
  real schedule.
- **The lander** moves between ORBIT and the Moon on its 10-minute loop.

**The places**
- **The Cinema's marquee** shows what's on now.
- **The Lofts:** a window lights up for every flat that's in use, and one flashes in party
  colours during a HOUSE PARTY.

**Small ambient touches**, one or two per area: sea shimmer and lighthouse sweep, the Park's pond
rippling, diner smoke, the arcade sign, a pigeon crossing the Square now and then, stars
twinkling in the space insets, and Earth turning slowly in the Moon inset.

## 4. People on the map

- **You:** a pulsing gold ring with **YOU** under it, at the place you're in.
- **Everyone else:** a small coloured dot per player, in their look colour, clustered at their
  place. Over 5 in one place, it shows the dots plus a number.
- **Starred friends:** a tiny head icon with their name tag, drawn on top of the others.
- **Hovering a place** shows a card with:
  - the place's name and subtitle (on its angled name plate, in that room's plate colour)
  - a **small preview of the room**, made from its baked background shrunk down, so it costs
    nothing
  - who's there (friends first)
  - how you'd get there: "WALK IN" for free, or "BY ROCKET · next launch 4:12"
- **During hide-and-seek** no people are shown, and the map says "no peeking!" (like the ???
  in WHO'S ONLINE).

## 5. The travel rules

**On Earth, anywhere is free and instant.** You arrive **through that place's front door**, at the
same spot as walking in normally, so it feels like you walked in. That includes the Park, the
Diner and the Kart Track (you arrive on their platforms, as if you'd just got off the train).

**Space keeps its rides**, because the rides are part of the fun:

| From | Pick | You go to |
|---|---|---|
| Earth | ORBIT or the Moon | the **Spaceport** by the rocket's hatch; the card shows the next launch |
| ORBIT | the Moon | the **LANDER BAY** door; the card shows when the lander leaves |
| ORBIT | anywhere on Earth | the **rocket** hatch (with the next departure) or the **ESCAPE POD** (straight to the Park) |
| The Moon | anywhere else | the **lander pad**; the card shows when it's back |

- **The Moon Base and the Spacewalk** can't be picked from Earth. They're shown, but greyed out
  with "on the Moon" / "through the airlock".
- **Flats:** picking THE LOFTS gives you:
  - **YOUR FLAT**, which takes you straight inside
  - any **HOUSE PARTY** going on
  - otherwise the Lofts lobby
- **The train** isn't a destination. Its line and stops are.

**Leaving by map works exactly like leaving by a door.** It:
- parks the buggy
- drops the kite back on its stand
- ends a diner tour
- pays out a spacewalk
- keeps your mug

It uses the same code path, so nothing new can break.

**Where you can't use it:**
- while a room change is already under way
- during a kart race you're in
- while you're mid-song at the karaoke mic

In those cases the pill is greyed out and the reason is shown.

## 6. The map boards (new world art)

**The Square's CITY MAP kiosk**
- It stands by the Subway steps: a dark green steel frame on two legs, under a little peaked roof.
- **The panel:** a small painted city map with a red **YOU ARE HERE** star.
- **Night:** the panel is lit from inside (on the glow layer), and moths flicker round it.
- **Details:**
  - a few faded flyers taped to the side (Karaoke night, a lost cat, a Kart Cup)
  - a sticker on the leg
  - now and then a pigeon perches on the roof, then flies off
- **When you walk up:** the panel brightens a step and a soft chime plays.

**The Subway line map poster** (it already exists): gets a **YOU ARE HERE** dot for that platform
and a subtle highlight when you're near.

**The station's orbital chart**
- A round screen by the LANDER BAY: a scan-line display with Earth, the station and the Moon.
- The lander is a blinking dot on its path.
- Its label reads NAV · ORBITAL CHART.

## 7. Sounds

- **Opening:** a paper-unfold rustle with a soft blip. **Closing:** the same, reversed.
- **Hovering a place:** a quiet tick, pitched by position (left low, right high) so running the
  mouse across plays a little scale.
- **Travelling:** a whoosh while the map zooms into the place for a moment, then the usual door
  fade and door sound as you arrive.
- **Blocked** (for example, the rocket isn't here): the same low "nope" blip the game already uses.

## 8. Travelling, frame by frame

1. You click a place. Its building brightens, and a gold pin drops onto it with a bounce.
2. Over 0.35 s the map zooms in, in pixel steps, toward that place, with a whoosh.
3. The usual fade out, the room change, and the fade in, arriving at the front door.
4. The room's name plate slides in as normal.

## 9. Extras

- **The EXPLORER badge**, for visiting every place on the map:
  - Places you've never been to get a small **?** sticker until you visit, so the map doubles as
    a checklist.
  - It needs a tiny migration (`0020`) to add the badge.
  - Without it, the ? stickers still work, and nothing needs running in SQL.
- **The WHO'S ONLINE "GO" button** should follow the same travel rules. Today, GO to someone on
  the Moon puts you on the Moon even when the lander isn't there. It also has a flat bug to check:
  GO to a friend in *their* flat may open whichever flat you last visited.
- **FOLLOW** stays as it is, since you're following a person wherever they went.

## 10. Cost and checks

- **Performance:**
  - The map's art is baked once, with a day version and a night version.
  - Only the live layer (dots, train, rocket, lander, shimmer) is redrawn, and only while the map
    is open.
  - The game behind it keeps its normal cost, and 60 fps with 12 bots still has to hold.
- **Network:** nothing new. Where everyone is already comes from the lobby.
- **Tests:**
  - Travel to every place, both from the map and by walking.
  - Check every travel rule in the table above.
  - Check the hide-and-seek hiding and the blocked cases.
  - Golden fingerprints for the map, day and night.
  - Close-up review of every area at 3×.
  - The new kiosk and chart are walked up to and used, not only called from debug.

---

## As built (what changed from the brief while building it)

- **The Moon Base can be picked:** from the Moon you walk in; from anywhere else it takes you to the ride, like the
  Moon itself. Only the SPACEWALK can't be picked (it's out through the station's AIRLOCK).
- **Dots are the player's colour once you've met them** this session. The lobby only says who's where, not how they
  look, and the brief promised nothing new over the network, so someone you haven't seen yet is a cream dot.
- **The previews on the cards are live:** each room drawn as it is right now (its lights, the train pulling in,
  Earth in the station's window), framed on the wall's best side.
- **The CITY MAP kiosk** is taller than a player, with a painted map, flyers and a pigeon. The station's chart went
  lower on the wall (eye level, by the escape pod) so the HUD doesn't cover it.
- **Phones:** the MAP button is in the bottom bar (the top one has no room); the card sits under the map.
- **The map draws at 30 fps** while it's open (about 3% more work than the room alone, CPU slowed 4x).
- **Also fixed on the way:** GO in WHO'S ONLINE could drop you on the Moon with no lander, and GO to someone in a flat
  opened whichever flat you'd last visited. A save now keeps up to 64 lifetime stats (it was 32, and the game already uses 28).
