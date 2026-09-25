# Roadmap

The goal: the most fun, alive little world online. Every phase should add things people *do
together*, not just things to look at. Tick items off as they land.

Guiding rules (from what already works):
- **Shared time needs no server.** Anything that can be a function of `Date.now()` (NPC days,
  day/night, films, music, pomodoro, world events) stays in sync for free.
- **Shared *choices* go in room state** (`state` messages, newest wins, host catches newcomers up).
- **Anything persistent or competitive needs Phase 0 first**, or people will cheat.

---

## Phase 1 — The Dev Den (a chill coding office, upstairs from the Lab)
- [x] New room `den`, reached by a stairwell door in the Lab
- [x] Cosy set: rain on a big window (with the odd flash of lightning), desk lamps, plants, beanbags, neon SHIP IT sign
- [x] Desks with laptops: sit and press E to CODE (a typing mini-game); finishing makes a commit
- [x] Commits show as `git commit -m '…'` bubbles and on the wall status screen
- [x] Shared build light: commits can break the build (red, alarm); fix it at the server rack
- [x] DEPLOY button under a glass cover: confetti + SHIPPED, or a smoky INCIDENT (blocked while the build is red)
- [x] Rubber duck on a desk you can talk to
- [x] Lo-fi radio (on by default) + rain ambience
- [x] Shared pomodoro on the wall clock (25 min focus / 5 min break) with chimes
- [x] Kanban corkboard: add short notes, move them TODO → DOING → DONE
- [x] Office cat that sleeps on free desks and wanders on breaks
- [x] Espresso machine, and an NPC senior dev (SAGE) who works in sync with the pomodoro

## Phase 0 — Trust & persistence (do before anything competitive or saved)
- [x] Private Realtime channels + RLS on `realtime.messages`, members-only (invite code checked server-side); chat goes through the server so its sender is real (moves etc. are still client-claimed: see CLAUDE.md)
- [x] Client-side first line: word filter on names/chat/notes, per-sender flood limits on everything received, click a player to mute them
- [x] Server-side chat filter + rate limits + chat log, profile names scrubbed, report → auto-mute, owner bans (whiteboard/kanban still client-side)
- [x] Turnstile on anonymous sign-in (needs the keys set up: README → Security setup)
- [x] Server-owned wallets (read-only to players), awarded only by security-definer RPCs

## Phase 2 — Collect & unlock
- [x] Tokens: 6 coins on the Square (each once per 5-min window, server clock), daily +5 bonus, HUD counter
- [x] The Arcade (down the stairwell on the Square): claw machine (3 tokens, server-rolled prize from 13 hats/faces/outfits/pets, dupes refund 1), 2-player Pong watchable live on the cabinet with a CHAMP board, SLOP INVADERS cabinet, prize counter (your collection), air hockey, PIXEL the attendant, chiptune radio
- [ ] Tank duel (2-player, networked)
- [x] Pet pigeon that follows you (feed the pigeons 5 times; a cosmetic unlock kept in the browser, no tokens needed)
- [x] Personal desk in the Dev Den: DESK STUFF shelf (monitor, plant, mug, lava lamp, fairy lights, dragon, stickers); your setup shows on whichever desk you sit at

## Phase 3 — Party games (built from existing pieces)
- [x] Musical chairs in the Cinema (PARTY GAMES podium): music stops, race for the glowing seats, one fewer each round
- [x] Tag on the Square (TAG! sign): 60 s, least time as IT wins
- [x] Slop invasion world event on the Square every 10 min: everyone throws coffee (E / click) at slop blobs
- [x] Bots play too (and now path around furniture), so it's testable with `?bots=4`
- [x] Hide-and-seek across rooms (sign on the Square; seeker counts in the Lab, 3 min to find everyone; the seeker sees no name tags, WHO'S ONLINE hides rooms)

## Phase 4 — More rooms
- [x] Rooftop garden (up from the Dev Den): the film's topiaries (bunny, swan, dragon), hammocks, string lights, fireflies/butterflies, telescope constellation game (collection saved locally), fireworks crate anyone can light + a show on the hour, gardener NPC FERN, shares the Square's day/night
- [x] The Crypt (grate in the Square): escape room with 3 pressure plates, 2 pushable stone blocks (solvable solo, faster with friends), a sealed rune door, a chest with the CROWN hat (unlocked per browser), torches, bats, a ghost, lanterns
- [x] The Stage (tower door on the Square): keys, drums, bass and mic; keys 1-8 / pads play notes everyone hears (all pentatonic), DJ booth backing beats, lighting-up dance floor, disco ball, spotlights, bar, DJ SPIN NPC; bots jam too
- [x] The Pier (walk off the Square's right edge): fishing off the pier end with a bite-and-reel timing game and a 12-species log (junk to legendary), bonfire with log seats, marshmallows you roast raw → golden → burnt, lighthouse, waves + moon path, crabs, OLD SALT NPC, day/night

## Phase 6 — Accounts & servers
- [x] Play as a guest (this browser) or log in with Discord / Google (any device); a guest links an account and keeps everything; if that login already has a player, the guest's tokens, prizes and membership merge in
- [x] Saves: unlocks, friends, fish log, constellations and high score live in a `saves` table (old per-browser progress is picked up automatically)
- [x] Fixed servers LAB 1-3, 12 players each, cap enforced by the database (seats + per-server channel RLS); server picker suggests the busiest one with room; SWITCH SERVER; `?server=two` links
- [x] Idle for 10 minutes → a 60 s "still there?" warning, then off the server to free the seat (REJOIN to come back)
- [x] Movement updates slow down in busy rooms (9 → 4 per second) to fit the Realtime message budget
- [ ] Live check on the real domain: Turnstile keys, Discord/Google apps, manual linking (README → Security setup)
- [ ] Player-made servers / private rooms

## Phase 5 — Social
- [x] Emote wheel (R / MORE): laugh, love, clap, wow, cool, sleep, cry, angry, each with a pose, an effect and a sound
- [x] Who's online (click the HERE/ONLINE pill): everyone in every room via a lobby presence channel, GO to join them, ☆ star friends to get a notice when they come online
- [x] FOLLOW a player from their card (through doors too); HIGH FIVE by waving next to someone who's waving
- [x] Cinema schedule: two films (A CRITTER IN SPACE, DRAGON NIGHT) take turns by the hour; the Square's marquee shows what's on

## Phase 7 — The big plan (one step at a time: see docs/PLAN.md)
- [x] 1. Halloween (1 Oct to 1 Nov): decorations, trick-or-treat, haunted Crypt, BOO, costumes
- [x] 2. Garden plots on the Rooftop (real-time growth, friends can water)
- [x] 3. The Subway (trains on the shared clock)
- [x] 4. The Park (boats, kites, ducks, sandbox)
- [x] 5. Daily quests and badges
- [x] 6. Hourly fishing contest
- [x] 7. Group dances and shared weather
- [x] 8. The Diner (co-op cooking)
- [x] 9. The Kart Track and the tank duel
- [x] 10. Your own apartment (THE LOFTS)
- [ ] 11. The Space Station
- [ ] 12. Karaoke on the Stage
- [ ] 13. The photo wall (moderated)
- [ ] 14. Winter (December)

## Before any public launch
- [x] Permission from Anthropic for Clawd
- [x] Permission + credit from the "Claw'd Labs, Part 0" film's creator for the sets/palette
- [ ] Phase 0 done
- [ ] Trademark check on the public name
