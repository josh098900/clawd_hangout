# The big plan (autumn 2026)

Fourteen features, built **one at a time**. Each step goes:

1. **Build it.** Any new database changes go in a new numbered migration, tested against the local Postgres first.
2. **I test it.** Headless browser tests, screenshots of every changed room checked against ART_STYLE, 60 fps with 12 bots, SQL PASS/FAIL checks.
3. **You set it up.** Josh runs any new SQL, then I push.
4. **You play it** on lab-hangout.vercel.app (with a friend if it's multiplayer) and confirm.
5. **Next step.**

The order puts the time-sensitive thing first (Halloween starts 1 October), then the things that give people a reason to come back, then the big new areas.

---

## Things every step has to respect

- **Mac heat / performance:** every room stays at 60 fps with 12 bots. New animations are cheap, following the existing rules (baked backgrounds, `lit()` only where it glows, glow on the half-res layer).
- **Realtime budget:** every message is billed once when sent plus once per player who receives it. New live features send only while something is happening (like Pong), never constantly.
- **Anything that pays tokens or gives items goes through a database function** (like `claim_coin` and `play_claw`), never trusted from the browser.
- **Shared time comes from the clock:** anything everyone should see the same way (train times, the season, wind, weather, growth) is worked out from `Date.now()` instead of sent as messages.
- **The token economy.** Every new way to earn needs a way to spend.
  - Earning today: coins (up to about 72 an hour), the daily +5, and 1 back for a duplicate claw prize.
  - Spending today: the claw machine.
  - New features add both (see each step).
- **Only ever append** to look options, spot lists and room lists (their positions are saved and sent over the network).

---

## Progress
Steps 1-10 are done and live (Halloween, gardens, Subway, Park, quests + badges, fishing contest,
weather + group dances, the Diner + COOKIE's tour, the Kart Track + tank duel, THE LOFTS apartments;
migrations 0007-0014). **Step 11, the Space Station, is done and confirmed** (migration 0015). What was decided: launches every 20 min (:00/:20/:40) from a SPACEPORT added past the roof
garden (the roof is now 1860 wide), drift-and-push-off zero g, all four extras (spacewalk, star melon
hydroponics, mission control's telescope, the SPACE HELMET), free to fly. The station's NPC is COSMO,
the critter from the Cinema's own film A CRITTER IN SPACE. **Step 12, karaoke, is done and confirmed** (migration 0016): a rhythm game at the mic plus band lanes on keys/drums/bass, 5 original songs, capped tips,
the ROCK STAR jacket for a 90+, and a crowd HYPE bar (no quest or badge, by choice). **Step 13, the photo wall, is done and confirmed** (migration 0017): in-game MODERATE panel for owners (private.admins, `make_admin(email)`), a corkboard of polaroids
in the Lab (the photo of the week in gold), hearts, stickers + frame colours before pinning, the PHOTO FRAME
furniture, 3 pins a day. Strips live in the database (small PNG data URLs) instead of Storage: no bucket to set up,
and the SQL tests cover it all. **Step 14, Winter, is built** (migration 0018;
waiting for Josh to test it live with `set_season('winter')`, then `set_season(null)`): 1 Dec - 6 Jan by the date. Everything
Josh picked: the tree + ornaments + hourly lighting, the present hunt, snowball fights, snowman + ice skating, advent
calendar, Santa's sleigh, the winter wardrobe, festive music + cocoa + a SNOW DAY karaoke song, New Year's Eve, winter
furniture, Secret Santa, and festive dressing everywhere. **That's the whole plan done**: the next plan is below (step 16 on).
**Bonus step 15, THE MOON, is done and confirmed** (built overnight 26-27 Sep; migration 0019). Josh picked it from four ideas (the others, for later: a Carnival on the Pier, a City Aquarium, Mini golf).

## 1. Halloween (1 October to 1 November)  ← next

Everything switches on by date, from the shared clock (`season()` in a new `src/world/season.ts`). `?season=halloween` previews it any day while developing.

- **Decorations in every room:**
  - carved pumpkins with flickering candlelight
  - cobwebs, and orange and purple string lights
  - bats around the Square and the roof
  - low fog over the Square and the Pier at night
- **Trick-or-treating:**
  - 8 doors around the world get a pumpkin on the step (the Lab, Cinema, Stage, Den, Arcade, the lighthouse, and others).
  - Walk up and press E to knock. Each door pays **1 token once per day** (the server checks it, like the coins).
  - Sometimes it's a *trick*: you're a ghost for a minute.
  - Visit all 8 in a day to earn a costume piece.
- **The haunted Crypt:**
  - The Crypt goes dark apart from your lantern.
  - A new candle puzzle: the ghost's story hints at the order to light 4 candles.
  - Solving it gives a costume piece.
- **BOO, a ghost NPC** who drifts around the Square at night and tells short spooky stories. The stories are original.
- **Costume items**, appended to the look lists. They're yours for good once earned:
  - hats: witch hat, pumpkin head
  - faces: vampire fangs, skull mask
  - outfits: vampire cape, skeleton suit
  - pet: a bat
  - How you get them:
    - all 8 doors in a day: 1 random piece
    - the haunted Crypt: the pumpkin head
    - a Halloween capsule mixed into the claw machine during October (the rest)
- **A spooky music track** for the Arcade radio and the Lab jukebox, plus a thunder-and-howl sound effect every so often at night.
- **Database:** migration `0007_halloween.sql` adds `trick_or_treat(door)` with a claims table, and a `halloween_prize()` for the 8-door reward. The claw prize list gets October-only prizes (the prize table gains `from`/`until` dates).
- **You'll test:** set `?season=halloween` or wait for 1 October. Knock on the doors (tokens go up, but only once per door per day), solve the haunted Crypt, win or earn a costume, and check that it stays after reloading.

## 2. Garden plots on the Rooftop

- 8 garden beds on the roof. Claim one (1 per player) and plant a seed from a little seed stand. Seeds cost 2 to 5 tokens (a new way to spend them).
- Plants grow in real time: sprout (1 hour), leafy (3 hours), flowering (6 hours), fruit (12 hours). You work this out from the planted time, so no messages are needed.
- **Watering** speeds growth up by about 25% and lasts 3 hours, and **anyone can water anyone's plant**. That's the social hook: "can you water my tomatoes?"
- Harvest gives tokens, sometimes a rare seed, and a collection log of what you've grown. Unwatered plants for 24 hours wilt, though one watering revives them.
- Your bed shows your name tag and plant to everyone.
- **Database:** `0008_gardens.sql` adds `plots` and the functions `claim_plot`, `plant(seed)`, `water(plot)` (rate-limited) and `harvest()`. The server works out growth from its own clock.
- **You'll test:** plant something, come back in an hour and see it sprouted, ask a friend to water it, then harvest.

## 3. The Subway

- Stairs down from the Square lead to a tiled **station** with a platform, a map, benches, a busker NPC and ticket gates.
- Trains run on the shared clock: one arrives every 2 minutes, the doors open for 20 seconds, then it leaves. Everyone on the platform sees the same train.
- Board it and you're in the **carriage** (a small room that sways): the city goes by outside, and 20 seconds later you arrive at the next stop.
- Stops: **Square**, **Park** (step 4), and later the Diner and the Kart Track.
- The line map shows unbuilt stops as "COMING SOON".
- There's no database step; it's all worked out from the clock.
- **You'll test:** ride it, and check that two people board the same train together.

## 4. The Park (the first new Subway stop)

- A wide outdoor room with day and night.
- **The pond:** rowing boats (sit and row, two can share), ducks you can feed, lily pads and a fountain.
- **Kites:** grab one from the kite stand and it flies on a wind everyone shares (worked out from the clock), with your colour. Others see your kite, sent only as small changes while you hold it.
- **Picnic blankets** to sit on, a hot-dog cart, and a bandstand.
- **The sandbox:** a small shared grid everyone can pile sand on and dig. The room state works like the whiteboard.
- A park-keeper NPC, fireflies at night, and falling leaves in autumn (tying in with the seasons).
- **You'll test:** row a boat with a friend, fly kites together, build in the sandbox.

## 5. Daily quests and badges

- 3 daily quests are picked for everyone from the date, for example:
  - roast 3 golden marshmallows
  - win a Pong game
  - catch a rare fish
  - water someone's plant
  - ride the subway
- Quests pay tokens (5 each, and 10 more for all three) through a database function.
- Some quests can't be proven by the server (like "roast 3 marshmallows"). For those, the reward is small and limited to once per quest per day, so faking them isn't worth it.
- **Badges** for bigger milestones: all 12 fish, a complete collection, 100 commits, Pong champ, and more. Badges show on your player card when someone clicks you.
- **Database:** `0009_quests.sql` adds `complete_quest(id)` with daily limits, and a `badges` table.

## 6. Hourly fishing contest

- Every hour on the clock, a 10-minute contest at the Pier: the biggest catch wins.
- A board on the Pier shows the live top 5 and last hour's winner.
- The winner gets tokens and a trophy badge.
- Fish sizes are decided by the server during the contest window (`catch_fish()`), so the leaderboard can be trusted.
- **Database:** `0010_fishing.sql`.

## 7. Group dances and shared weather

- **Group dance:** when 4 or more people dance within a few steps of each other, they all fall into the same routine (worked out from the clock, so it's already in step), and the floor or ground around them lights up.
- **Weather** across the outdoor rooms (Square, Pier, Roof, Park): clear, rain, a storm with lightning, or fog. It's worked out from the clock so everyone gets the same sky, and there's snow in December.
- The weather affects things: fish bite more in the rain, and gardens get watered for free.

## 8. The Diner (co-op cooking)

- A retro diner reached by Subway. Its kitchen has stations: grill, fryer, drinks, plating, counter.
- Orders come in on tickets (burger, fries, shake...). Players carry ingredients between stations and plate up before the timer runs out. It's built for 2-4 players, and one player's browser runs the shift, like the party games.
- Shift score goes on a board; tips pay a few tokens (capped per day).
- The cook NPC runs the diner when nobody's playing.

## 9. The Kart Track and the tank duel

- **Kart Track** (Subway stop): a top-down track for 4 racers, with laps, boosts and drifting. One player's browser runs the race. Positions are sent about 12 times a second, only during a race.
- **Tank duel** in the Arcade: a 2-player cabinet game, built like Pong.

## 10. Your own apartment

- A front door in a new apartment block (a Subway stop) opens into your own room, private to you plus anyone you invite.
- Buy furniture with tokens from a catalogue (sofas, lamps, rugs, posters, plants, a bed, a fish tank for your caught fish). Items you own are kept on the server, like prizes.
- Place furniture on a grid in edit mode. The layout is saved on the server.
- Visiting: friends can knock (from WHO'S ONLINE or the door), or you set it to open.
- **Database:** `0011_apartments.sql` adds furniture ownership, `buy_furniture`, the layout table (write-own) and the visit list. The Realtime rules get a per-apartment channel `hangout:<server>:apt-<owner>`, where only the owner and people they've let in can join.

## 11. The Space Station

- Once an hour on the clock, a rocket on the Rooftop pad counts down. Anyone aboard lifts off, with a launch sequence for everyone watching.
- The station has zero gravity (you drift and bounce, and walking is floaty), a big window with Earth turning, an airlock, and a hydroponics bay.
- The critter from the film is there as an NPC, tying in with the Cinema's film.
- The ride back leaves every 15 minutes.

## 12. Karaoke on the Stage

- A karaoke machine with original songs (lyrics written for the game, and tunes in the existing note-string music format).
- The lyrics scroll on a screen for everyone. The singer's mic pad adds harmony notes, and the crowd can cheer with emotes.

## 13. The photo wall in the Lab

- After a photo-booth strip, a PIN IT button sends it for review.
- Josh approves or rejects it from a simple owner view before it appears on the Lab wall for everyone.
- Strips are small PNGs in Supabase Storage.
- **Database:** `0012_photos.sql` adds a pending/approved table, a limit on uploads per day, and owner-only approve/reject functions.

## 14. Winter (December)

- The same season system as Halloween: snow on the outdoor rooms, a snowman to build in the Park, a lit tree in the Square, scarves and hats as costume items, and a present hunt instead of trick-or-treat.
- Build it in late November.

## 15. The Moon (bonus)

- A lunar lander from the Space Station's new LANDER BAY, on the clock (a 10 minute loop: 2.5 min boarding at the station,
  a minute down, 5.5 min on the Moon, a minute back up). Zero g on the coast, the burns, the trip in the window.
- The Moon's surface: moon gravity (you bound, SPACE is a big slow jump), helmets on, COSMO's flag (from the film),
  the MOON BASE (greenhouse, canteen, earthrise window, LUNA the botanist, the base radio), a MOON BUGGY lap course
  with a record board, and a crystal field: mine a glowing rock, carry it to the base's ASSAY machine.
- **Database:** `0019_moon.sql`: `moon_assay` (the server decides: 1 in 6 is a MOON CRYSTAL; 1 or 3 tokens, 15 a day,
  one rock per 20 s; the 5th crystal is the MOON ROVER pet), `moon_crystals`, 3 quests, the MOONWALKER badge.

---

# The next plan (from 27 September 2026)

Chosen with Josh after the Moon. Same five-stage loop as above, plus **the polish standard**
(ART_STYLE §9): a detailed design brief for Josh before any code, rooms built in layers, a
close-up review and a polish pass before anything is called done.

## 16. The map (fast travel)  ← built, waiting for Josh's check (brief: docs/briefs/16-map.md)
27 rooms is a lot of walking. A map of the whole world (the Lab, the Square, the Subway line, the
Station and the Moon...) that shows where everyone is, with your friends marked; pick a room to go
there. **Built** (migration `0020_map.sql`, just the EXPLORER badge): M / the MAP pill (phones: the bottom bar) and
three map boards (the Square's kiosk by the Subway steps, each platform's line map, the station's ORBITAL CHART by the
lander bay); the city by day and night with the train, rocket and lander on their timetables, the weather, the seasons;
everyone's dot, friends' name tags, YOU; a card per place with a live look inside; Earth is free, space keeps its rides
(the escape pod is a way home); ? stickers + the EXPLORER badge; WHO'S ONLINE's GO follows the same rules.

## 17. The Science Wing
Off the Lab. The centrepiece is the **reactor control room**: stations for the rods, the coolant
pumps, the turbine and the gauge wall, one player each; the reactor drifts, alarms go off, and you
keep it in the green together. A **meltdown** is cartoon, not scary: the room goes green and
everyone glows for a minute; the HAZMAT suit is the outfit to earn. One player's browser runs the
reactor and sends a small update (like Pong), so it's cheap on the network. Plus a **chemistry
bench**: mix things, discover reactions, fill in a recipe book.

## Later (order to be decided)
- **18. Submarine + City Aquarium:** the aquarium on the Pier; the sub dives from it, portholes that
  change with depth, crew stations (helm, sonar, periscope).
- **19. The Airport:** check-in, a security X-ray that shows what you're holding, a baggage carousel
  game, a departures board on the clock; each flight opens a new destination (beach island, ski
  mountain, a city abroad), so it's how the world keeps growing.
- **20. Carnival on the Pier.**  **21. Mini golf.**
- **22. One rank for everything:** a lab-coat rank that fishing, mining, karaoke, cooking all feed.
- **23. World events:** a surprise meteor shower, blackout or pigeon invasion across the server.
- **24. More labs:** a Tesla coil, a wind tunnel, the physics drop.

---

## Housekeeping along the way

- **Page size:** the game is now over 500 KB in one file. Around step 3, split rooms so they load when you first enter them.
- **Mobile:** an on-screen joystick option, since the new areas are bigger.
- **Moderation** for room state (the whiteboard, the sandbox) before the world opens to the public.
- The **README and CLAUDE.md** get updated with every step, and roadmap items are ticked once you've confirmed them.
