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
migrations 0007-0014). **Step 11, the Space Station, is built** (migration 0015; waiting for Josh to
try it). What was decided: launches every 20 min (:00/:20/:40) from a SPACEPORT added past the roof
garden (the roof is now 1860 wide), drift-and-push-off zero g, all four extras (spacewalk, star melon
hydroponics, mission control's telescope, the SPACE HELMET), free to fly. The station's NPC is COSMO,
the critter from the Cinema's own film A CRITTER IN SPACE. **Next: step 12, karaoke.**

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

---

## Housekeeping along the way

- **Page size:** the game is now over 500 KB in one file. Around step 3, split rooms so they load when you first enter them.
- **Mobile:** an on-screen joystick option, since the new areas are bigger.
- **Moderation** for room state (the whiteboard, the sandbox) before the world opens to the public.
- The **README and CLAUDE.md** get updated with every step, and roadmap items are ticked once you've confirmed them.
