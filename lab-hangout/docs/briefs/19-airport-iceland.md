# Step 19 — The Airport and Iceland: design brief

The fourth step built to the polish standard (ART_STYLE §9). Josh picked:
- **The first destination is Iceland.** It's a big place with many areas: Reykjavík, the black sand beach, the Blue
  Lagoon, waterfalls, a glacier hike, the northern lights at night, and more.
- **Four pushes, the airport first.** Each one is played live before the next:
  1. the Airport, the plane and Reykjavík, with the northern lights at night
  2. the south coast: the waterfalls, the black sand beach and the plane wreck
  3. the Golden Circle and the Blue Lagoon
  4. the glacier hike, the ice cave, the iceberg lagoon and Diamond Beach
- **Getting round Iceland:** a tour bus on a timetable (like the Subway, with a guide on the microphone), and an ICELAND
  page on the city map for hopping back to places you've been.
- **The flight:** free, like the rocket. A departure every 10 minutes, about 3 minutes in the air.
  - Check in for a BOARDING PASS, then security's X-ray, then the gate.
  - On board: the safety demo, the seatbelt sign, the drinks trolley, a bit of turbulence, and the whole trip in the
    windows.
- **Iceland's sky:** it runs on its own clock, with long nights (about half of every 20 minutes). The northern lights
  come out most nights, at a strength that changes, and now and then there's a big green-and-purple storm. An aurora
  forecast board at the airport.

**In one line:** a fifth stop on the Subway takes you to the city's airport. You check in, go through security (the
X-ray shows what's in your hands), and board LAB AIR 101 to Keflavík. There you get your passport stamped, grab your
bag off the carousel, and catch the bus into Reykjavík: the rainbow street up to the big church, the best hot dogs in
town, Harpa glowing by the harbour, and the northern lights over the bay. Pushes 2-4 take the tour bus out to the rest
of Iceland.

This brief covers **push 1 in full**. Pushes 2-4 are outlined in §14, and each gets its own full section before it's
built, as the submarine did.

**Two small notes:**
- **Names.** The pixel font has no accents or Icelandic letters, so signs in the world say REYKJAVIK, KEFLAVIK and
  HALLGRIMSKIRKJA. Panels, toasts and speech can use the real spelling (Reykjavík, Hallgrímskirkja, takk).
- **"The Blue Lagoon"** is a real spa company's brand name as well as a place. That's fine for now. If the game ever
  goes public we can call it THE LAGOON (push 3).

---

## 1. Getting there: the AIRPORT stop

- **The Subway gets a fifth stop.** The line runs SQUARE → PARK → DINER → KARTS → **AIRPORT** → back to the SQUARE.
  - It's the same train on the same clock. Every leg stays the same length, so the whole loop just gets one leg longer
    (208 s → 260 s).
  - Between KARTS and AIRPORT, the carriage's windows show the airport's fence, a windsock and a plane taking off
    overhead.
- **AIRPORT STATION** is a station room like the others (1300 × 700):
  - sky-blue tiles, with a white band and a little aeroplane set into the tiles every few metres
  - the name board: AIRPORT
  - a big arrow over the stairs: ↑ DEPARTURES · CHECK-IN
  - suitcases painted on the tiles as a mural, and a luggage trolley someone's abandoned on the platform
  - the stairs go up into the terminal. You arrive at its left end, by the escalator
- **The map:** the airport sits at the city's far edge, past the Kart Track.
  - A runway, a control tower and a little plane on the apron. The plane taxis, takes off and lands on the timetable.
  - At night the runway lights are blue and the tower's beacon turns.
  - THE AIRPORT is a new place, so EXPLORER gains it. Anyone who already has the badge keeps it.
  - The plane is a ride, not a place, like the rocket.

## 2. THE AIRPORT (the city terminal) — 1900 × 700

```
 ceiling: long skylights · hanging signs within reach of the eye: DEPARTURES → · GATE A1 → · ↓ TRAINS
┌─────────┬───────────────────────────┬──────────────────────┬─────────────────────────────┬──────────────────────────────────┐
│ESCALATOR│ LAB AIR   LAB AIR   LAB AIR│ X-RAY BELT   ║ ARCH ║│ DEPARTURES      AURORA  DUTY │ ▓▓▓▓▓▓ THE BIG WINDOW ▓▓▓▓▓▓▓▓▓▓ │
│ ↓TRAINS │ [desk 1]  [desk 2]  [desk 3]│ [screen] →→→ ║  ▣   ║│ [flap board]   [TV]   FREE  │ ▓ runway · the LAB AIR jet ·     ▓│
│ trolleys│ ~~ bag belt ~~ rubber flaps │ trays · OFFICER BUZZ │ café · COMING SOON posters  │ ▓ jet bridge · ground crew       ▓│
│ info    │ queue belts                 │ queue belts          │ seats · plants · clock      │ GATE A1 desk · rows of seats · ▯ │
└─────────┴───────────────────────────┴──────────────────────┴─────────────────────────────┴──────────────────────────────────┘
   0-170          170-560                     560-860                   860-1250                        1250-1900
```

- **The look:** a bright, airy terminal.
  - Pale terrazzo floor with brass inlay lines, white walls, tall glass, and the LAB AIR teal and orange everywhere.
  - Signs are yellow-on-charcoal, the way airport signs are.
  - The wall base is at y 470. Everything you read sits within about 150 px above it (the step 17 rule).
- **Day and night:** the terminal follows the city's clock.
  - By day, the big window is bright sky over the runway.
  - At night the terminal lights warm up, and the window shows the blue taxiway lights, the red and green wingtip
    lights and the flashing beacons.
  - The weather is the city's: rain streaks the window, snow settles on the runway edges.

### 2.1 Arriving and checking in (x 0-560)

- **The escalator** up from the station (the door back down, labelled ↓ TRAINS). Its handrail moves, and its steps
  ripple.
- **The info pillar:** the city map board, so you can open the map here, like the Square's kiosk.
- **A trolley corral:** a row of nested luggage trolleys, with one parked at an odd angle.
- **CHECK-IN, three LAB AIR desks.**
  - Each desk has the airline's logo (a paper-plane-shaped flask), a monitor, a baggage scale showing
    *0.0 KG* (it jumps to 23.4 when you stand at it), and a queue belt zigzag in front.
  - Behind the desks, a baggage belt runs into a wall of rubber flaps. A suitcase rides in every so often.
  - **E at a desk: CHECK IN.** DOT the agent prints your **BOARDING PASS** and a panel shows it:
    - LAB AIR · BOARDING PASS · your name
    - THE CITY → KEFLAVIK · FLIGHT LA101 · GATE A1
    - your seat (worked out from your id, 1A to 6C)
    - *BOARDING IN m:ss*, from the timetable
    - Your seat on the plane gets a little glowing tag. A pass isn't needed to fly: nobody's turned away.

### 2.2 Security (x 560-860)

- **Queue belts**, a sign *NO LIQUIDS OVER 100 ML*, and a stack of grey trays.
- **THE X-RAY BELT.** E there puts whatever you're holding through the machine.
  - Its screen shows the X-ray picture, in the scanner's orange, green and blue, and everyone standing there sees it.
    It shows the mug's handle, the kite's frame, a potion glowing like a lamp, and the moon rock (*"...sir, is this a
    MOON ROCK?"*).
  - Holding nothing: the screen shows a tray with a bit of fluff in it.
  - You get your thing back at the far end.
- **THE ARCH** (the metal detector): you walk through it on your way airside, as part of the floor.
  - Anything metal sets it off. That's metal hats (the CROWN, HALO, DIVING HELMET and VIKING HELMET), the MONOCLE, and a
    MOON ROVER pet. It goes **BEEP**, the arch flashes red, and OFFICER BUZZ waves the wand: *"Arms up, please!"*
    (your arms go up for a moment). Then *"All clear. It's always the hat."*
  - Otherwise it goes a friendly **ding** and a green light.
- **OFFICER BUZZ** stands by the arch.

### 2.3 Airside (x 860-1250)

- **THE DEPARTURES BOARD**, a big split-flap board that clatters when a line changes:
  - LA101 · KEFLAVIK · then *BOARDING*, *CLOSED*, *DEPARTED* or *ON TIME hh:mm*, all from the timetable
  - LA102 · FROM KEFLAVIK · *LANDED* or *EXPECTED hh:mm*
  - three more lines saying COMING SOON, as teasers for future steps (a beach island, a ski mountain, a city abroad):
    SUNNY ISLAND · COMING SOON, SNOW PEAK · COMING SOON, BIG CITY · COMING SOON
- **THE AURORA FORECAST** on a TV: *ICELAND TONIGHT*.
  - The KP number (0-9), a cloud-cover bar, and a verdict: *NONE · FAINT · GOOD CHANCE · STORM!*
  - A little green aurora icon waves when it's good. It's the real forecast (§7): what it says is what you'll see.
- **DUTY FREE:** glass shelves of perfume bottles, a pyramid of chocolate bars, a giant teddy, and a till (E: the shop).
  It sells the **NECK PILLOW** (a new outfit, worn round your neck).
- **THE CAFÉ:** an espresso machine and a pastry case. E fills a mug, like the Lab's coffee.
- **Posters:** *FLY LAB AIR: WE'VE TESTED FLYING*, and a big photo of Iceland's northern lights.
- A departures clock, planters, a charging pillar with phones plugged in, and a cleaner's cart.

### 2.4 The gate (x 1250-1900)

- **Rows of gate seats** (sit spots), and a carpeted area.
- **THE GATE A1 desk**, with RAY the gate agent. The LED sign over the jet bridge door reads *GATE A1 · LA101
  KEFLAVIK · BOARDING*, or *NEXT FLIGHT m:ss*.
- **THE BIG WINDOW** (x 1250-1900, its sill at the wall base). It's a live view of the plane's day on the clock:
  - At the stand: the LAB AIR jet (white, a teal tail with the flask logo, orange stripe), with the jet bridge on its
    door. The ground crew: a baggage tug with its carts, a fuel truck, a belt loader, and a marshaller with orange
    wands.
  - At pushback, a tug pushes it back. It taxis left along the taxiway and takes off (seen small, climbing away).
  - At landing, it comes in from the right with its lights on, touches down with a puff of tyre smoke, and taxis back.
  - Behind the runway: the city skyline, and the Roof's launch tower. At :00, :20 and :40 you can watch the rocket go
    up from here.
  - A windsock, and a control tower with a rotating beacon.
- **The jet bridge door** is only open while the plane's boarding at this gate. It works both ways: passengers
  landing from Iceland come out of it too.

## 3. The flight: LAB AIR 101 and 102

One plane, on a 10-minute loop from the clock (like the rocket; the Subway's pattern). Everyone sees the same thing,
and nothing is sent.

| s | where | what |
|---|---|---|
| 0-90 | the city, GATE A1 | **boarding**: the door's open both ways |
| 90-100 | | doors shut, pushback, *"cabin crew, arm doors"* |
| 100-118 | taxiing | **the safety demo** |
| 118-130 | take-off | the roll, the shake, the climb; the seatbelt sign on |
| 130-270 | cruise | the seatbelt sign goes off at 150, the drinks trolley goes round at 160-240, turbulence somewhere in there |
| 270-300 | landing | descent, the seatbelt sign on, touchdown bump |
| 300-390 | KEFLAVÍK | **boarding**: the door's open onto Keflavík, both ways |
| 390-400 | | doors shut, pushback |
| 400-430 | taxi, take-off | the safety demo again, briefly |
| 430-570 | cruise | as before, going the other way |
| 570-600 | landing | landing at the city |

- **A departure every 10 minutes from each end:** from the city at :00, :10, :20..., and from Keflavík 6½ minutes
  after each.
- **About 3 minutes in the air**, 4½ from door to door.
- **Stay aboard and you fly back.** Anyone still in the cabin when the door opens can stay put, like on the rocket.

## 4. THE PLANE — 1200 × 620

```
 ═══ overhead bins (one open, a suitcase peeking out) ════════════════════════════════════════════════
 ┌LAV┐ REAR   │ ◯ ◯   ◯ ◯   ◯ ◯   ◯ ◯   ◯ ◯   ◯ ◯  (oval windows: the trip)    │ FRONT   ┃L1┃ ║COCKPIT║
 │OCC│ GALLEY │ row1  row2  row3  row4  row5  row6  · seat-back screens: the map │ GALLEY  ┃  ┃ ║  door ║
 └───┘ trolley│ ● seatbelt sign · reading lights · call buttons                   │ coffee  ┃  ┃ ║       ║
 ═══════════ the aisle (patterned carpet) ═════════════════════════════════════════════════════════════
   0-180        200-1000                                                          1000-1090  1090-1200
```

- **The cabin, side on.** Cream walls and oval windows at eye level, in pairs per row.
  - **Six rows of two seats**, blue with orange headrest covers and seat-back screens. You sit facing forward (to
    the right), 12 seats.
  - The overhead bins run along the top, with one open and a suitcase peeking out.
  - The wall base (the window line) sits within 150 px above the aisle.
- **The windows show the whole trip, live,** through every window at once:
  - **Take-off from the city:**
    - the runway rushing past, then the city dropping away below
    - the Square's lights, the Roof's launch tower, the Pier with its lighthouse and the aquarium
    - then the sea
  - **The climb:** through the clouds (white-out for a few seconds), then out above a sunlit sea of cloud.
  - **Cruise:**
    - blue sky above and cloud or ocean below, with a ship's wake far down and maybe a whale's spout
    - another plane passing high up, trailing a contrail
    - at night: stars, and near Iceland the northern lights above the clouds
  - **The descent into Iceland:**
    - down through cloud to the Reykjanes coast: black lava fields, green moss
    - the milky-blue lagoon steaming by the power station
    - snowy mountains behind, then the runway and the touchdown puff
  - **The flight back** is the same in reverse, landing at the city.
  - **The sky blends from one clock to the other** over the trip: you can fly out of the city's evening into Iceland's
    night.
  - **The wing** fills the windows of rows 3 and 4, with its engine hanging under it. Its flaps come down for landing,
    and its lights blink at night.
- **The rear (x 0-200):**
  - **THE LAVATORY**, a door with a little *VACANT / OCCUPIED* sign. E: you step in, the sign flips to OCCUPIED, a
    flush, and you step out again.
  - **The rear galley:** coffee pots, drawers, and the drinks trolley parked when it's not out.
- **The front (x 1000-1200):**
  - **The front galley.**
  - **THE L1 DOOR**, the real door: open onto the gate while the plane's boarding (either end).
  - **THE COCKPIT DOOR** (a talker): knock and CAPTAIN WINGS says *"Busy flying! Sit down, please!"*
- **Seatbelt sign:** it lights with a **ding** for take-off, landing and turbulence. While it's lit, anyone standing in
  the aisle gets a nudge: *"Please take your seat."* Nobody is forced to sit.
- **E at a seat** sits you down. While seated, E rings the **call button** (PENNY: *"Yes, dear?"*) and Q sips your
  drink.
- **The drinks trolley.** PENNY pushes it down the aisle during cruise and stops at each row. E when she's by you gets
  a cup of juice or coffee (the mug hold), plus a toast about the pretzels.
- **Turbulence:** the cabin shakes for a few seconds, drinks wobble, and the captain comes on: *"Just a bit of
  bumpy air, folks."*
  - Very rarely the oxygen masks drop by mistake: *"...sorry folks, wrong button."* It's one flight in about 12.
- **The seat-back screens** show the moving map: a little plane crossing from the city to Iceland, the time to
  arrival, the altitude, and *OUTSIDE -52°C*.
- **Captain's announcements** come up in the banner:
  - after take-off: *"Good morning folks, this is Captain Wings. We'll be cruising at eleven thousand metres. Sit back
    and enjoy the view."*
  - on the descent: *"We're starting our descent into Keflavík. It's -2 °C, and the aurora forecast is looking
    good."* The numbers are real, from Iceland's weather and forecast.
  - after landing: *"Velkomin til Íslands. Welcome to Iceland!"*
  - On the way home: *"...into the city. Local weather: drizzle. Of course it is."*
- **Lights:**
  - By day: cabin LED strips and bright windows.
  - At night and at landing: the cabin dims to blue, with reading-light cones over the occupied seats.
- **Sounds:**
  - the engines spooling up, the take-off roar, then the steady hum of cruise
  - the seatbelt ding, the PA chime, the trolley's rattle, the flush
  - the landing gear coming down with a thunk

## 5. KEFLAVÍK (Iceland's airport) — 1300 × 680

```
┌ JET BRIDGE ┬──── VELKOMIN · WELCOME TO ICELAND ────┬ PASSPORT ┬─────── BAGGAGE CLAIM ───────┬ ARRIVALS  ┬──── EXIT ────┐
│  door D4   │ photo panels: glacier · falls · aurora │ CONTROL  │    ⊂═════ the carousel ═════⊃  │ SHOP ·    │ BUS TO       │
│ window:    │ ⇒ ⇒ ⇒  the travelator  ⇒ ⇒ ⇒          │ OFFICER  │    bags going round            │ SKYR BAR  │ REYKJAVIK ⇥  │
│ lava fields│                                        │ GUNNI    │    (a kayak, a fish cooler...) │           │ info · TV    │
└────────────┴────────────────────────────────────────┴──────────┴────────────────────────────────┴───────────┴──────────────┘
   0-200            200-470                              470-620          620-930                      930-1080     1080-1300
```

- **The look:** Nordic and calm.
  - Pale birch-wood panels, grey slate floor and huge windows.
  - Iceland's light outside: long low sun, or dark with the aurora.
- **The jet bridge door (D4)** is open while the plane's at Keflavík. The window beside it shows:
  - the LAB AIR jet (when it's here), the snowy apron
  - black lava fields with green moss, flat-topped mountains in the distance
  - Iceland's own sky (§7), with the northern lights at night
- **The welcome corridor:**
  - *VELKOMIN · WELCOME TO ICELAND*, and big backlit photo panels of a glacier, a waterfall and the aurora
  - **a travelator**: walk on it and it carries you along faster
- **PASSPORT CONTROL:** a glass booth with OFFICER GUNNI.
  - **E: he stamps your PASSPORT** (§8). It opens, *THUMP*, and the KEFLAVIK stamp inks in.
  - The first time, you also get the passport itself: *"No passport? Here. Everyone gets one."*
  - *"Purpose of your visit? ...Hot dogs? Good answer."*
- **BAGGAGE CLAIM: the carousel.** A long loop of rubber slats with a warning beacon that spins when it starts.
  - **Everyone's bag goes round.** Each is a suitcase in its owner's body colour with a name tag, and only yours is
    yours. Oddities go round too: a kayak, a fish in a cooler box, a snowboard, a rubber duck, a guitar case.
  - **E while your bag is at the gap in front of you grabs it.** Miss and it comes round again (about 20 s a lap).
  - **You wheel it along** (a new hold: the SUITCASE, which rolls behind you) until Q puts it away.
- **Arrivals shop and the skyr bar.** A little shop with liquorice, woolly socks and puffin magnets (a talker). The
  bar sells **SKYR**, Icelandic yogurt (a new hold: you eat it with Q).
- **The exit, *BUS TO REYKJAVIK*:** the automatic doors (a door, always open) take you to Reykjavík's bus stop.
  - Beside them: a tourist info stand with brochures (*GLACIER HIKES · WATERFALLS · THE LAGOON · COMING SOON*), the
    aurora forecast TV, and a car hire desk with a sign saying *SUPER JEEPS · ALL BOOKED*.
- **Flying home:** the same jet bridge door. Its sign reads *LA102 TO THE CITY · BOARDING* while it's open.

## 6. REYKJAVÍK — 1900 × 760 (outdoors, on Iceland's clock)

```
 sky: Iceland's own sky · the aurora over the bay ............................ Mount Esja across the water (snow on top)
                            ▲ HALLGRIMSKIRKJA (up the hill: the whole stepped silhouette, the clock)
 ┌─────┐  ▓red▓ ▓mustard▓ ▓teal▓ ▓white▓   PUFFIN   BAKERY  CAFE(cat)  ║HOT DOG║   ◇◇◇ HARPA ◇◇◇     SUN VOYAGER ~~~~ sea
 │ BUS │  corrugated-iron houses, steep     SHOP                         ║ STAND ║   glass honeycomb    on its stone   harbour:
 │ INFO│  roofs, window boxes, a bike       elf house on its mossy rock  ║ queue ║   lit up at night    base           boats
 ══════ street ══▓▓▓▓ THE RAINBOW STREET (6 bands across the floor) ▓▓▓▓═══ pavement ═══ benches ═══ sea wall · boulders ═══
    0-220              220-760                            760-1200         1200-1450      1450-1700          1700-1900
```

- **The look:**
  - Colourful corrugated-iron houses with steep roofs: red, mustard, teal, white, and one black with white trim.
  - Snow on the roofs when it's been snowing. Grey basalt kerbs, puddles, and the smell of the sea.
  - Mount Esja across the bay. Iceland's clock and weather (§7), and the northern lights over everything at night.
  - Walls, doors and signs keep within about 150 px of the street.
- **The bus stop (x 0-220):**
  - a glass shelter with a timetable
  - HEKLA's tourist INFO kiosk, with brochures and an ICELAND map board (opens the map's ICELAND page)
  - the door back: *BUS TO THE AIRPORT* (always open), to Keflavík's exit
  - a sign: *TOUR BUS · COMING SOON* (push 2)
- **The rainbow street and HALLGRÍMSKIRKJA (x 220-760):**
  - **The rainbow street:** the road painted in six bands (red, orange, yellow, green, blue, purple) across the floor,
    leading up to the church.
  - **Hallgrímskirkja stands up the hill behind.** It's drawn smaller because it's further away, so its whole
    silhouette fits the view: the stepped basalt-column wings rising to the tower, the clock, and the pale concrete.
    At night it's floodlit, with a lit window in the belfry.
  - **The explorer statue** on its plinth in front.
  - **E at the church door: UP THE TOWER.** The lift takes you up, and a round view (like the periscope) shows the
    whole city from the top: the colourful roofs, the harbour and Harpa, Mount Esja and the sea, and the aurora at
    night. ← → to look round. It gives a stamp: THE TOWER.
  - Organ music drifts out of the door when you're near.
- **The shops (x 760-1200):**
  - **THE PUFFIN SHOP:**
    - A window full of puffin plushies, woolly jumpers and a Viking helmet on a stand. A wooden puffin sign swings over
      the door.
    - **E at the door: the shop.** Clothes: the **LOPAPEYSA** (the patterned Icelandic wool jumper) and the **VIKING
      HELMET** (horned: not what Vikings really wore, and the shopkeeper says so).
    - Furniture for your flat: a **PUFFIN PLUSH**, a **SHEEPSKIN RUG**, an **ICELANDIC FLAG** and a **LAVA LAMP** (*"real
      lava"* not included).
  - **THE BAKERY:** a steamy window and a tray of cinnamon swirls. E gets a **CINNAMON SWIRL** (a new hold: eat it).
  - **A café,** with a cat asleep in the window.
  - **The elf house:** a tiny painted house with a red door, on a mossy rock by some steps. A sign: *THE HIDDEN FOLK
    LIVE HERE. PLEASE DON'T MOVE THE ROCK.*
    - E: you knock. Sometimes a tiny light goes on inside, and once in a while the little door creaks open a crack.
  - **Street life:** a bike against a railing, a snow shovel by a door, window boxes, a mural of a whale on a gable end,
    and a street sign that says LAUGAVEGUR.
  - **Reykjavík's cats:** one asleep in the café window, and one strolling the street (it comes to you if you stand
    still). E pets it: *prrrp*.
- **The hot dog stand (x 1200-1450):**
  - A little red-and-white kiosk, *THE BEST HOT DOGS IN TOWN*, with a string of bulbs and a queue.
  - **SIGGA** serves: E gets **ONE WITH EVERYTHING**, a new hold (the PYLSA): a hot dog with crispy onions, raw onions,
    ketchup, sweet mustard and remoulade.
  - The *HALL OF FAME* is a board of photos of happy customers (all critters). There are standing tables and a bin.
  - **Gulls.** They watch anyone holding a hot dog. Now and then one swoops down, but it only gets close.
- **The seafront (x 1450-1900):**
  - **HARPA**, the concert hall: a wall of glass honeycomb.
    - By day it reflects the sky in hundreds of little panes.
    - At night its panes light up and ripple slowly through colours. That's the town's best glow.
  - **THE SUN VOYAGER:**
    - The steel ship skeleton on its granite base, pointing out to sea, with Mount Esja behind.
    - E: *"The Sun Voyager: a dream boat, sailing for the sun."* It gives a stamp: THE SUN VOYAGER.
  - **The aurora spot:** a bench and a camera on a tripod facing out over the bay.
    - **E: take a picture of the sky.** When the aurora's out it's saved: *NORTHERN LIGHTS · KP 5*.
    - The first one gives a stamp: THE NORTHERN LIGHTS. A KP 7+ storm gives the AURORA HUNTER badge.
  - **The harbour:**
    - fishing boats bobbing, and a small lighthouse on the breakwater
    - a whale-watching boat with a sign: *WHALE WATCHING · COMING SOON*
    - ÓLI mending a net on a bollard
  - The sea wall and its big boulders, and the Icelandic flag on its pole snapping in the wind.
- **Alive:**
  - the aurora rippling over the bay, and snow flurries
  - steam from a street grate (the city's geothermal heating)
  - the church clock, and the bakery's steam
  - Harpa's lights, the flag in the wind, and the boats bobbing
  - gulls, and the cats
- **Sounds:**
  - wind, gulls, the harbour's bell buoy, and boat rigging clinking
  - organ music near the church, the hiss of the grill at the stand, and the bakery bell
  - at night: the aurora's soft shimmer (a chime pad)

## 7. Iceland's sky: its own clock, weather and the northern lights

- **The clock:** Iceland runs its own 20-minute day, set a few minutes apart from the city's, so arriving can mean
  arriving in the dark.
  - About 9 minutes of every 20 are night.
  - Dawn and dusk are long, with the sun low and golden.
  - Day is about 6 minutes. Iceland's sun never climbs high.
- **Iceland's weather** has its own 15-minute slots, worked out in the game only (nothing on the server). It's:
  - clear (crisp, cold)
  - cloudy (a lid of grey)
  - snow
  - drizzle
  - a gale (snow flying sideways, flags straight out, and a cap blown off now and then)
- **The northern lights** come out about a minute after it gets properly dark, if the sky's clear.
  - **Each night has a strength (KP 0-9)**, from the night's number:
    - about 25%: nothing, or faint
    - 40%: a green band arcing over the bay
    - 25%: bright green curtains, rippling
    - 10%: **a storm**: the whole sky moving fast, with pink and purple fringes
  - **Clouds hide it.** The forecast gives both numbers, and it's honest.
  - The glow shows on the snow, the sea and the wet street.
- **Where it shows:**
  - Reykjavík, and Keflavík's windows
  - the plane's windows near Iceland at night
  - in pushes 2-4, every outdoor spot in Iceland
- **The forecast TVs** (the city airport, Keflavík, Reykjavík's info kiosk) say what tonight will be:
  - the KP number and the cloud cover
  - how long until dark
  - the verdict: NONE, FAINT, GOOD CHANCE or STORM!

## 8. THE PASSPORT, and the other rewards

- **THE PASSPORT** is a new panel.
  - The cover: navy with a gold crest, *PASSPORT · THE CITY*. Inside: your critter's portrait, your name, and the
    stamp pages.
  - **Each place gives an ink stamp the first time you're there**, in its own shape and colour, with the date.
    Push 1's stamps:
    - **KEFLAVIK** (at passport control)
    - **REYKJAVIK** (arriving in town)
    - **THE TOWER** (the view from Hallgrímskirkja)
    - **THE SUN VOYAGER**
    - **THE NORTHERN LIGHTS** (your first aurora picture)
  - Later pushes add 11 more, 16 in all. **The ICELANDER badge** is for all 16 (push 4).
  - It's kept in your save, and merging saves keeps every stamp, like the fish log.
  - Open it at passport control, or with the PASSPORT button in the QUESTS panel.
- **Souvenirs (tokens):**

  | Shop | Item | Price |
  |---|---|---|
  | Duty free | **NECK PILLOW** (outfit) | 10 |
  | The Puffin Shop | **LOPAPEYSA** (outfit) | 15 |
  | The Puffin Shop | **VIKING HELMET** (hat) | 15 |
  | The Puffin Shop | furniture: PUFFIN PLUSH, SHEEPSKIN RUG, ICELANDIC FLAG, LAVA LAMP | 6-12 each |

  They're sold through the aquarium's gift-shop system, with the prices on the server.
- **Badges:**
  - **FREQUENT FLYER:** 10 flights
  - **AURORA HUNTER:** photograph a KP 7+ storm
  - ICELANDER comes with push 4
- **Daily quests** (in the pool):
  - *Fly to Iceland*
  - *Eat a hot dog in Reykjavík*
  - *See the northern lights*
- **No pay for flying.** It's free, like the rocket, so there's nothing to farm.

## 9. The map: the airport, and the ICELAND page

- **The city map** gains the airport (§1). From anywhere on Earth, Iceland's places say *BY PLANE · NEXT FLIGHT m:ss*
  and take you to GATE A1.
- **A new ICELAND page,** switched with a tab at the map's top.
  - Iceland in pixels: the coastline, the glaciers white and the lava black, with Reykjavík and Keflavík in the
    south-west.
  - People and friends are shown in Iceland as they are in the city.
  - Push 1's places: KEFLAVIK and REYKJAVIK. Inside Iceland they're a walk (WALK IN), and from Iceland the city says
    *BY PLANE*.
  - The other sights are on the page already, as grey *COMING SOON* stickers, which each later push switches on.
  - It shows Iceland's day and night, and a green shimmer over it when the aurora's out.
- **Zones:** Iceland is a new zone, like orbit and the Moon. Mid-flight, the map says *"You're mid-flight! Wait until
  you've landed"*.

## 10. The characters and their lines

| Who | Where | Lines |
|---|---|---|
| **DOT** (LAB AIR check-in) | desk 2 | *"Window or aisle? Just kidding, the computer picks."* · *"Any liquids, potions or moon rocks? ...Lovely."* · *"Pack a jumper. Seriously."* |
| **OFFICER BUZZ** (security) | by the arch | *"Arms up, please!"* · *"All clear. It's always the hat."* · *"Is that a potion? Over a hundred mil? ...On you go."* |
| **RAY** (gate agent) | GATE A1 | *"Now boarding LA101 to Keflavík!"* · *"Last call!"* · *"Next flight in m:ss. Grab a coffee."* |
| **CAPTAIN WINGS** (the pilot) | walks the jet bridge before boarding, then the voice on the PA | the announcements (§4) · through the cockpit door: *"Busy flying!"* |
| **PENNY** (flight attendant) | the plane | the safety demo (*"...your nearest exit may be behind you"*, and she points both ways) · *"Juice? Coffee? ...Juice?"* · *"Seatbelts, please!"* |
| **OFFICER GUNNI** (passport control) | Keflavík | *"Góðan daginn! That's 'good day'."* · *"Purpose of your visit? ...Hot dogs? Good answer."* |
| **HEKLA** (tourist info; named after a volcano) | the bus stop kiosk | aurora tips (*"Clear and dark? Look north!"*) · *"Takk means thanks. Bless means bye."* · *"The tour bus starts soon: waterfalls, black beaches, glaciers..."* |
| **SIGGA** (the hot dog stand) | the stand | *"One with everything?"* · *"Crispy onions, raw onions, ketchup, sweet mustard, remoulade. That's everything."* |
| **ÓLI** (fisherman) | the harbour | *"If you don't like the weather, wait five minutes."* · whales, puffins, and the one that got away |

**NPC routines:**
- They stand clear of every spot (the rule from step 18's MARINA fix). The golden test checks it.
- Captain Wings and Penny keep to the flight's timetable. Everyone else keeps a gentle routine.

## 11. Sounds and music

- **The airport:**
  - the ding-dong chime before announcements, and the departures board's flap clatter
  - the X-ray belt's hum, the arch's BEEP and ding, and the escalator's whirr
  - jets taking off outside, heard through the glass
  - music: a laid-back lounge track
- **The plane:** the engines, the cabin hum, the seatbelt ding, the PA chime, the trolley and the flush.
- **Keflavík:** the stamp's THUMP, the carousel's buzzer and rumble, and the automatic doors.
- **Reykjavík:**
  - wind, gulls, the bell buoy, and the church organ
  - music: a slow, dreamy track (glockenspiel and soft pads)
  - after dark, the aurora's shimmer chime while the lights dance

## 12. Seasons

- **Winter (December):**
  - Reykjavík gets **THE YULE CAT**: a giant cat made of white lights in the square, from the Icelandic legend (it
    comes for anyone without new clothes at Christmas).
    - E: *"New clothes this Christmas? The Yule Cat checks. (A LOPAPEYSA counts.)"*
  - Lights on the houses, and a tree by the church.
  - The airport gets a tree and lights. Penny wears a Santa hat.
- **Halloween:** the usual dressing (string lights, and pumpkins by the shops and the check-in desks). Also a bat
  over the church tower.
- **The dressing:** every new room gets string lights in `world/dressing.ts`, pumpkins in `PUMPKINS` and a tree in
  `XTREES`. The doors get cobwebs and wreaths on their own.

## 13. Build, network, SQL and checks

- **New rooms:** AIRPORT STATION, THE AIRPORT, THE PLANE, KEFLAVÍK and REYKJAVÍK, 5 in all (32 → 37).
- **New files:**
  - `world/airport.ts` (the terminal and its window)
  - `world/plane.ts` (the cabin, the window view)
  - `world/kef.ts`
  - `world/reykjavik.ts`
  - `world/iceland.ts` (Iceland's clock, weather and aurora, all pure; the aurora drawing)
  - `game/flight.ts`: the plane's timetable (pure). It's `air()`, like `flight()` and `dive()`, with a `skew` for tests.
  - `features/air.ts`: check-in, security, the trolley, the carousel, stamps, the forecast
  - `ui/passport.ts`: the passport, the boarding pass and the tower view
  - Plus the Subway's fifth station.
- **Network: nothing new.**
  - The plane, the aurora, Iceland's weather, the carousel's bags and the trolley all run on the clock.
  - The X-ray shows the `hold` everyone already sends.
  - The arch reads your `look`.
  - No new messages and no room state.
- **SQL: `0025_airport.sql`.**
  - The souvenirs' prices (gift items, and furniture from the Puffin Shop).
  - The quests: *fly*, *hotdog* and *aurora*.
  - The badges: FREQUENT FLYER and AURORA HUNTER.
  - Josh runs it before the push.
- **Checks (the feature workflow):**
  - **Timetables:**
    - the plane's timetable swept over thousands of loops: the doors open only at the right times, at the right end
    - the Subway's new loop: every station's doors, and the map's train
  - **Doors, walked both ways:**
    - the station stairs, the escalator
    - the jet bridge at both ends
    - Keflavík's bus exit, Reykjavík's bus stop
  - **Travel:**
    - flying there and back, and staying aboard
    - the map: *BY PLANE*, and blocked mid-flight
  - **Sweeps over 10,000 nights and slots:**
    - Iceland's clock
    - the aurora's strengths and the weather's mix
  - **The features:**
    - the passport's stamps, saving and merging
    - check-in, the X-ray for every hold, the arch for every metal item
    - the carousel (grab your bag, miss it and grab it next lap)
    - the trolley, the lavatory, the seatbelt nudge, the tower view, the shop
  - **The rest:**
    - two players on the same flight in real windows
    - the phone layout
    - CPU ×4 with bots
    - golden fingerprints for every new room by day and night, in each Iceland weather, and at each aurora strength
    - the old rooms unchanged, except the Subway's timetable

## 14. Pushes 2-4 (each gets its full section, like this one, before it's built)

### Push 2: THE SOUTH COAST, by tour bus
- **THE TOUR BUS** (the ICELAND EXPLORER):
  - A big-tyred 4×4 coach on a timetable loop from Reykjavík's bus stop to each stop and back, like the Subway.
  - Its cabin: seats, big windows with the Ring Road going by (lava fields, moss, sheep, Icelandic horses, waterfalls
    down the cliffs, the Eyjafjallajökull glacier).
  - HEKLA on the microphone with a story for each stop: the volcano that grounded Europe's planes, the trolls, the
    hidden folk.
- **The ICELAND map page** switches on each stop. You can hop back to places you've been.
- **SELJALANDSFOSS:**
  - A tall, thin waterfall with **a path behind it**: walk behind the curtain of water and come out soaked (a WET
    effect that drips and dries).
  - Rainbows in the spray on sunny days, and a hidden waterfall in a gorge next door.
- **SKÓGAFOSS:**
  - The great curtain of water, with a double rainbow on sunny days.
  - **The stairs to the top**, and the view down from there.
  - **The legend of the treasure chest** behind the falls: its ring glints in the pool. That's a treasure hunt.
- **REYNISFJARA, the black sand beach:**
  - Black sand, and the basalt-column cliff: a giant staircase of hexagons to climb and sit on, with a cave.
  - **The sea stacks,** trolls turned to stone at dawn while dragging a ship.
  - **Sneaker waves:** every so often a big one runs far up the beach. Run! Catch it and you're swept back, soaked
    (cartoon).
  - **Puffins** on the cliffs: photograph them for the **PUFFIN** pet.
- **THE PLANE WRECK:** an old silver plane alone on the black sand plain. Climb on top. It's eerie at night under the
  aurora.
- **Stamps:** SELJALANDSFOSS, SKOGAFOSS, REYNISFJARA and THE PLANE WRECK.

### Push 3: THE GOLDEN CIRCLE and THE BLUE LAGOON
- **ÞINGVELLIR:**
  - The rift between the North American and Eurasian plates. Stand with a foot on each continent.
  - The old parliament's Law Rock, and a waterfall.
  - **SILFRA:** snorkel the clearest water in the world, reusing the submarine's sea.
- **GEYSIR and STROKKUR:**
  - Steaming vents and bubbling mud.
  - **STROKKUR erupts every few minutes on the clock,** so everyone sees the blue dome bulge and then WHOOSH. Stand
    downwind and you're soaked.
  - The great Geysir itself goes off very rarely.
- **GULLFOSS:** the golden falls, two steps plunging into a canyon, with mist and rainbows.
- **THE BLUE LAGOON:**
  - Milky-blue water among black lava, steam rising, and the aurora overhead at night.
  - Wade in and float. The swim-up bar has a green smoothie. The **SILICA MUD MASK** is a new face item.
  - It's near the airport, so it's a stop on the way there and back.
- **Stamps:** THINGVELLIR, GEYSIR, GULLFOSS and THE LAGOON.

### Push 4: THE GLACIER
- **THE GLACIER HIKE:**
  - The guide's hut gives you crampons and a helmet.
  - The guide leads the group onto the ice on a clock, like the Cap'n's tour: ice ridges, black ash bands,
    meltwater, moulins.
  - **Crevasses to jump** (SPACE, with timing).
- **THE ICE CAVE:** glowing crystal-blue walls, bands of ancient ash, drips, echoes.
- **JÖKULSÁRLÓN, the glacier lagoon:**
  - Icebergs drifting to the sea on the clock, and seals popping up.
  - The glacier's face now and then calves a chunk with a boom and a splash.
- **DIAMOND BEACH:** ice chunks glittering on black sand, the waves washing round them.
- **Stamps:** THE GLACIER, THE ICE CAVE, JOKULSARLON and DIAMOND BEACH, which completes the 16 and **the ICELANDER
  badge**.

## 15. Ideas for later (Josh's pick, after push 4)
- **Whale watching** from Reykjavík's harbour: a boat on a timetable, with humpbacks and puffins (reusing the
  submarine's sea).
- **A volcano:** a Reykjanes eruption with lava fountains at night, watched from a safe hill.
- **Icelandic horses:** a riding tour with the tölt (their smooth running walk).
- **A hot river** to bathe in, the Westfjords, the Snæfellsnes peninsula's mountain, and a puffin island.
- **At Christmas:** the thirteen Yule Lads, one a day.
- **The other departures on the board** (SUNNY ISLAND, SNOW PEAK, BIG CITY) as future steps.

---

## As built: push 1 (the Airport, LAB AIR, Keflavík and Reykjavík)

- **It came out as the brief says,** with these changes and details:
  - **Everything sits where the camera looks.** The new rooms are 614 px tall, not 700-760: a laptop's camera shows
    about 267 px of the room, so the floor is y 484-570 and everything worth reading sits between y 386 and 470. A
    phone's tall screen shows more of the upper wall, so the terminal's skylights and trusses hang low enough for it
    (and for anyone standing at the back of the floor).
  - **The flight's clock** lives in `game/air.ts` (not `game/flight.ts`): `air()` gives the leg, the phase, the route
    and the height, and `AIR.skew` moves it for tests.
  - **The passport has 17 stamps** (not 16): KEFLAVIK, REYKJAVIK, THE TOWER, THE SUN VOYAGER and THE NORTHERN LIGHTS
    now, and 12 for the tour bus's stops. Open it at passport control, or with the PASSPORT button in the QUESTS panel
    (it shows once you have a stamp).
  - **The city map is 80 px wider** (560 × 300), so the airport sits past the Kart Track as the brief says, by the sea:
    - the runway along the sea wall, the terminal, the tower (its beacon turns) and the car park
    - LAB AIR on its timetable: at the stand with its baggage train, pushing back, taxiing, the take-off roll, the
      climb away towards the horizon, the approach over the beach, the landing
    - the Subway's line has a branch out to AIRPORT station
    - what both pages share (people, you, the stickers, the pin) moved to `world/mapmarks.ts`, checked pixel for
      pixel before anything else changed
  - **The ICELAND page** is drawn from real latitudes and longitudes:
    - the coast and its fjords, moss and farms by the sea and in the valleys, the highlands' sand and lava, hill
      shading, seven glaciers, lakes and rivers, the Ring Road, five towns, Grímsey on the Arctic Circle and the Westman
      Islands
    - KEFLAVIK and REYKJAVIK are places (WALK IN between them); the 12 sights to come have grey stickers and say
      COMING SOON when you point at them
    - live: the aurora over the north, Iceland's weather, the towns' lights, a geyser, the lagoon's steam, a whale in
      the bay, LAB AIR coming in from the south, and a panel with tonight's forecast
  - **On the plane while it boards,** picking a place across the sea on the map says *You're on it!* (it would have sent
    you back out to the gate).
  - **A map card's look inside** now works for rooms that only draw what's in view: a new `Room.lookAt` hook for the
    terminal, Keflavík, Reykjavík, and the aquarium (whose look inside was drawn from a stale view before).
  - **The map on a phone** no longer scrolls sideways (the fit now leaves room for the panel's padding).
  - **The security arch** is two posts you walk between. The glass barrier's blockers follow the glass as it's drawn
    (they used to sit 10-20 px to one side), and OFFICER BUZZ's middle stop moved to the end of the X-ray belt, out of
    the glass.
  - **LAB AIR counts its own flights** (`planes`). At first it shared the rocket's count, so five flights to Iceland
    would have earned ASTRONAUT.
  - **AIRPORT station's stairs** used to put you below the terminal's floor. They now use the terminal's own arrival
    point.
  - **Winter:**
    - string lights in all five rooms
    - trees by the gate's window, in Keflavík's hall and by the church
    - THE YULE CAT in Reykjavík, a giant cat of white bulbs with its line
    - Santa hats for everyone as before, PENNY included
  - **Halloween:** lights, pumpkins by the shops and desks, and bats over the church on Iceland's own night.
  - **Music:** DEPARTURE LOUNGE in the terminal, and NORTHERN LIGHTS in Reykjavík (quieter by the church, where the
    organ plays).
  - **The polish pass:** nested luggage trolleys, the forecast TV's little aurora picture, perforated gate seats with
    armrests and charging points, the arch, and HARPA's angular roof and folds.
- **Tested:**
  - the SQL suite for 0025 (11 checks), and the game's lists against the database
  - golden fingerprints (327): every new room by day and night, in each of Iceland's weathers and at each aurora
    strength, LAB AIR at each phase through three windows, and both map pages
    - The old rooms are unchanged except the Subway's (5 stops), the map, the clothes grids (3 new pieces) and the
      sounds (the new effects).
  - end to end in a browser, walking every door both ways:
    - the station stairs, check-in, the X-ray, the arch (a crown beeps, no crown dings), the gate shut and open
    - boarding, sitting, the flight, the landing, KEF's stamp, the carousel (missed it, got it next lap), the skyr
    - the bus both ways, Reykjavík's stamps, the hot dog, the tower view, the aurora photo at night, both shops, the
      passport, the flight home and off at GATE A1
    - the train's doors at all five stops, staying aboard both legs, the seatbelt nudge, PENNY's trolley, the three
      quests
  - two players in real windows on one flight
  - the phone's rooms and map
  - CPU ×4 with 4 bots: 2.4-6.1 ms of work a frame (Keflavík's window with the aurora is the heaviest)
  - no NPC waits where E would offer TALK instead of a spot

---

## 16. Push 1b: REYKJAVÍK, made beautiful (for Josh to check before it's built)

Josh (28 Sep), after the live check: *"the cities should have the utmost beauty and detail ever seen in this world"*,
with two photos: **Skólavörðustígur** (the rainbow street running uphill to the church) and **Hallgrímskirkja** at dusk.
Push 1's Reykjavík is a flat row of houses with a small church behind them. This pass makes its middle a real street
scene, and brings everything else up to the same finish.

### The centrepiece: the rainbow street up to the church

```
            ┌──────────── the view up SKÓLAVÖRÐUSTÍGUR (painted into the backdrop, in perspective) ────────────┐
 houses …   │  shop fronts on the left,        HALLGRÍMSKIRKJA at the top,          shop fronts on the right, │  … houses
            │  getting smaller up the hill     its wings stepping down either side  getting smaller up the hill│
            │  lamps, bare trees, benches      the maze-patterned plaza in front    signs, planters, a mural   │
            └───────────── the rainbow road narrows uphill and runs out onto the street where you walk ─────────┘
```

- **Where:** the gap between the houses where the church stands now (about x 390-620, a little wider than today). The
  room stays 1900 wide, and every spot, door and talker stays where it is.
- **The street, in perspective:** two rows of façades angling in towards the church, each smaller and hazier up the
  hill. Their detail comes from the photo:
  - painted corrugated iron and concrete walls, white window frames, a hanging shop sign on each, lit shop windows
  - green street lamps, bare birch trees along the pavements, benches with orange slats, round concrete planters with
    grasses, a bike rack, a sandwich board
  - a graffiti mural on one concrete wall, like the photo's
  - people in winter coats walking up and down, shrinking as they go uphill (ambient, no network)
- **The rainbow road:** six bands (red, orange, yellow, green, blue, violet), with kerbs and grey pavements, narrowing
  to the church and running out across the floor where you walk (as now, but crisper and in perspective).
- **HALLGRÍMSKIRKJA, as in the photo:**
  - the tall central tower of pale grey concrete: narrow vertical windows up it, the clock, the belfry openings, the
    pointed top and its cross
  - the wings of tall basalt-like columns stepping down either side in a smooth curve
  - the tall arched doorway with its stained-glass window above
  - the plaza in front, black with the white maze pattern
  - after dark, warm uplights between the columns at its base (the photo's orange glow), and the belfry lit
  - it's tall: on a laptop its top reaches above the screen, so there's **a bench at the foot of the street: sit and
    the camera looks up to frame the whole church** (like the aurora bench). A phone sees it all anyway.

### Everything else, to the same finish
- **The houses along the street you walk on:** corrugated cladding that catches the light, dormers and chimneys, tin
  roofs in red, green, black and grey, window boxes, lit windows at night, shop signs and awnings. Snow on the roofs
  and sills.
- **The light:** golden-hour warmth on the façades at dawn and dusk, the purple dusk from the photo (the sky already
  fades to violet and gold), the church floodlit at night, lamps and shop windows glowing.
- **Winter:** the photo's giant bell ornaments on wires across the rainbow street, strings of lights zigzagging
  between the façades, and fairy lights in the bare trees (the YULE CAT stays).
- **The seafront:** Esja across the bay with its snow streaks, the SUN VOYAGER drawn to its real shape (a steel boat's
  skeleton), boats in the harbour. HARPA keeps its new angular roof, with more facets in its glass.
- **Life:** gulls, steam from the vents, the cat, a dog walker, tourists taking photos of the church.

### How it's built and checked
- In order: the street and the church, then the houses and furniture, then the light and life, then the seafront.
  Close-up screenshots at each step, and a polish pass at the end.
- Still parts are baked into the backdrop, so the extra detail costs little per frame. The walkers are a handful of
  tiny sprites.
- Checks: every spot's reach, and no NPC in the way (the scan from 717aaaa); golden (only Reykjavík changes); the phone;
  CPU ×4 with bots; a two-player look round.
- **No SQL.**

## As built: push 1b (Reykjavík, made beautiful)

- **It came out as §16 says,** with these details:
  - **The view up Skólavörðustígur** is drawn in one-point perspective into the gap where the church stood (x 402-598). Each
    side has six buildings: painted iron or concrete walls, three windows a floor, a shop at street level (lit at night),
    hanging signs, graffiti on two concrete walls, roofs with snow. Green lamps, bare birches, orange benches and
    planters line the pavements. The six rainbow lanes narrow up to the plaza and fan out across the street you walk on.
  - **HALLGRÍMSKIRKJA** stands at the top: the tower with its slit windows, clock, belfry and ribbed crown; nine columns
    stepping down each side; the arched door under the stained glass; the explorer on his plinth; the black plaza with
    white line markings. At night, warm uplights between the columns, and the belfry and stained glass glow.
  - **The church bench** at the foot of the street (two seats, spots 14 and 15): sit, and the camera looks up to frame
    the whole church (`watch` top 252). A phone sees it all anyway.
  - **Life on the street:** six walkers in coats going up and down (smaller as they climb), two tourists photographing
    the church (a flash now and then after dark), a dog walker along the street, gulls over the harbour.
  - **The houses:** ribbed iron that catches the light, shade under the eaves, concrete footings, seams in the tin roofs
    and snow along their bottom edge, dormers, lintels, curtains, snowy sills, framed doors with a window and a lamp.
    Striped awnings over the three shops, the bakery's golden pretzel, the café's chalkboard.
  - **The light:** the golden hour warms the buildings; the dawn and dusk sky fades violet to gold (fixed in 717aaaa).
  - **Winter:** two big green bells on wires over the street, strings of lights along the wires, fairy lights in the
    birches (the YULE CAT stays).
  - **Esja** has snow running down its gullies.
  - Not done: HARPA's extra facets and a new SUN VOYAGER (both already read well).
- **Tested:** every spot's reach (the new seats included), no NPC in the way, golden (only Reykjavík's 13 changed), the
  phone, CPU ×4 with bots (5.5-6 ms of work a frame), smoke.

## As built: fixes from Josh's check of push 1b

- **The plane:** no windows over the galley cupboards any more (`WINS` starts at 270, ends at 870). Door labels stay
  on screen (`drawDoorHints` keeps them 42 px below the top of the view), so the gate sign in the plane and the train's
  sign no longer sit off the top.
- **The street up to the church:** each building now has a pitched roof (from the eave over the pavement to a ridge
  set back from the street), seams, a snowy ridge and eave, and a chimney on some. The gable end shows on the side
  nearest you. The fronts have a white eave trim, a footing, floor bands and corner boards. Windows are white-framed
  and some are lit after dark. The shops have a fascia in their sign colour.
- **The humpback mural** (`mural()`) is redrawn as a humpback rising through deep blue water, with light falling from
  the surface, a knobbly head, a white grooved throat, long white flippers swept back, the flukes, and bubbles. Every
  part is outlined so it reads against the sea.
- **HARPA**, redrawn from Josh's photo:
  - the tall block, its roof climbing to the right and its left side leaning out
  - the long, low wing beside it
  - both clad in honeycomb cells of glass (hexagons taller than wide) in steel frames. They catch the sky, with a
    diagonal band of brighter reflection.
  - the dark glass lobby underneath, and a reflecting pool in front with the building in it
  - At night the same cells (`HARPA_CELLS`) light up in a slow rolling wave of colour.
- **Tested:**
  - reach: 0 stand points fail
  - golden: only plane and Reykjavík changed (25 of 327)
  - smoke, both fly runs and the phone pass
  - perf: Reykjavík with snow takes 3.4 ms of work a frame
