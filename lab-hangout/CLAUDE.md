# CLAUDE.md — Lab Hangout

A multiplayer 2D pixel hangout. Players are little "lab critters" (or Clawd) who walk around
eight rooms, chat in speech bubbles, emote (plus an emote wheel), sit, dance, eat and drink,
play party games and mini-games, make music together, and hang out with NPCs.

Room map (doors):
```
                ROOF (garden) ── ladder ── DEV DEN ── stairs ── THE LAB ── exit ── THE SQUARE
                                                                                  ├── red doors → CINEMA
                                                                                  ├── tower door → STAGE
                                                                                  ├── grate → CRYPT
                                                                                  └── right edge → PIER
```

**The plan lives in `docs/ROADMAP.md`** (phases, what's done, what must happen before a
public launch). Tick items there as they land. Vite + TypeScript +
plain Canvas 2D, with Supabase Realtime for multiplayer. No game engine and no image
assets: every pixel is drawn in code.

The art style is copied from an existing pixel-art film. **Read `docs/ART_STYLE.md` before
you touch anything visual.** Keeping that look is the top priority of this project.

## Commands

```bash
npm install
npm run dev          # http://localhost:5173 (LOCAL mode if no .env.local)
npm run typecheck    # tsc --noEmit — run after every change
npm run build        # typecheck + production build to dist/
```

Handy URLs while developing:
- `/?bots=5`: adds 5 wandering, chatting demo bots (LOCAL mode only)
- `/?local`: forces LOCAL mode even when Supabase keys are set
- `/?server=one`: skip the server picker and take a seat on that server (also works online, e.g. a
  "join me on LAB 2" link). Test scripts should always pass it.
- LOCAL-mode test switches: `?signin` starts signed out (the guest / Discord / Google chooser, all
  faked per tab), `?autherr=identity_already_exists` pretends a provider refused a link (the merge
  path), `?cap=N` shrinks every server to N players (to see FULL)
- `/?debug` (dev server only): exposes `window.__hangout` (`go`, `at`, `use`, `pose`, `item`, `feed`,
  `state`, `game`, `gameState`, `bots`, `blocks`, ...) so test scripts can teleport, use things and
  set room state without walking. Headless Chrome + puppeteer-core drives it nicely.
- Open two tabs: in LOCAL mode they see each other (BroadcastChannel)

## Architecture

```
src/
  main.ts              boot, game loop, local movement, net glue, HUD wiring
  engine/
    pixel.ts           THE drawing kit: r(), line, disc, oval, txt, spr, glow G/Gd/Gline, lit(), outline()
    palette.ts         all colour tokens (K, LK, BODY, CONFETTI)
    font.ts            3x5 pixel font
    math.ts            h1 hash noise, easing (eOB overshoot etc.)
    renderer.ts        world canvas + half-res glow canvas -> screen, integer scaling, camera
    input.ts           keys + click/tap-to-walk
  world/
    room.ts            Room/Door/Prop/Spot types, walkable()
    lab.ts             THE LAB set (960x680), props, animated bits
    plaza.ts           THE SQUARE set (1200x780), voxel installations, lamps, benches, cinema front, day/night (wall clock)
    cinema.ts          THE CINEMA set (1100x720): lobby, concession stand, photo booth, screen + the 80 s film, seats
    den.ts             THE DEV DEN (1000x680): desks, build status screen, kanban, rack, DEPLOY, duck; pomodoro + lightning (wall clock)
    roof.ts            THE ROOFTOP GARDEN (1100x700): topiaries, hammocks, telescope, fireworks (state + hourly), day/night
    crypt.ts           THE CRYPT (1000x680): pressure plates, pushable blocks, rune door, crown chest, lanterns
    stage.ts           THE STAGE (1000x700): instruments, DJ booth beats, dance floor, disco ball, spotlights
    pier.ts            THE PIER (1300x720): beach, pier + fishing, bonfire + marshmallows, lighthouse, day/night
    arcade.ts          THE ARCADE (1100x612, down the stairwell on the Square): claw machine, 2-player Pong table
                       (watchable live), SLOP INVADERS cabinet, prize counter, air hockey, PIXEL
    voxels.ts          oblique voxel creations (castle, coaster, dragon), cached + shine
  entities/
    critter.ts         the player character sprite: Look options, Pose, composeCritter/stampCritter;
                       what's earned (EARNED) and the claw prize list with weights (CLAW, must match 0006_arcade.sql)
    avatar.ts          per-player state, walk/emote posing, remote interpolation, name tags, emote FX
  net/
    transport.ts       Transport interface, message shapes, VALIDATORS (all inbound data is untrusted)
    supabase.ts        Supabase: guest (anonymous) + Discord/Google (OAuth, PKCE, linkIdentity) auth, saves,
                       servers/seats, RPCs, private Realtime channels per server + room
    local.ts           BroadcastChannel transport for offline dev
  game/save.ts         your save (unlocks, friends, fish log, stars, hi score): cached per player id, synced to
                       the `saves` table; merging is a union so nothing earned is ever lost
  game/hideseek.ts     hide and seek across rooms (seeker's browser runs it, on the lobby channel)
  game/bots.ts         local demo bots (wander, use spots, play party games, jam), with routeTo() pathing
  game/party.ts        party games (musical chairs, tag): host-run state machine + banner text
  game/slop.ts         the slop invasion world event (wall clock waves, blob paths, hits)
  game/fish.ts         the Pier's fish table and the per-browser fish log
  game/npcs.ts         NPCs (Prof. Fizz, Gus): routines driven by the wall clock, so all players see the same thing
  game/ambient.ts      local-only life: pigeons in the Square, robot vacuum in the Lab, the office cat in the Den
  ui/
    start.ts           start screen + look editor with live preview; guest/login chooser, account row
    servers.ts         the server picker (busiest server with room is suggested)
    captcha.ts         Turnstile (guest sign-in only)
    claw.ts            the claw machine up close (server picks, client animates) + WEAR IT
    pong.ts            2-player Pong (P1's browser runs the ball)
    prizes.ts          the prize counter: your collection
    desk.ts            DESK STUFF: your Dev Den desk setup (Look.desk bits)
    overlay.ts         DOM overlays: speech bubbles, room plate, chat log, toast, fade
  audio/sfx.ts         synthesized blips (no audio files)
  audio/music.ts       chiptune tracks as note strings; MusicPlayer schedules against the wall clock; the Stage's
                       instrument synth (playPad, all C pentatonic); the Den's rain loop
  game/board.ts        the shared Lab whiteboard (188x70 px), strokes + RLE snapshots
  ui/modal.ts          one modal at a time (+ camera flash)
  ui/boardui.ts        drawing on the whiteboard
  ui/arcade.ts         SLOP INVADERS, the playable arcade game
  ui/typing.ts         CODE: the Dev Den typing game (3 lines -> a commit)
  ui/kanban.ts         the Dev Den kanban board
  ui/stars.ts          the rooftop telescope's constellation game
  net/filter.ts        client-side word filter + per-sender token-bucket rate limits
supabase/migrations/   SQL, run in order in the SQL editor (all safe to re-run):
                       0001 profiles · 0002 security (members, private channels, chat, reports) ·
                       0003 tokens · 0004 accounts (saves, inventory, guest->account merge) ·
                       0005 servers (caps, seats, per-server channel RLS) · 0006 arcade (play_claw)
docs/ART_STYLE.md      the style bible
```

### Frame order (main.ts `render`)
1. `room.bg` (baked once) → 2. `room.drawBack(a)` (animated set pieces) →
3. props + avatars **sorted by feet y** → 4. `room.drawFront` → 5. `Renderer.present`
(crisp layer upscaled nearest-neighbour, glow layer blurred + screen-blended) →
6. DOM overlays positioned via `R.toScreen()`.

### Coordinates
World pixels. An avatar's `(x, y)` is its **feet**. Larger y = nearer the camera. The camera
scale is an integer number of device pixels per world pixel (`Renderer.layout`).

## Networking contract

**Accounts.** Guests are anonymous users (Turnstile-checked when `VITE_TURNSTILE_SITE_KEY` is set);
accounts log in with Discord/Google. A guest upgrades with `linkIdentity` (same user id, so
everything carries over). If that login already belongs to someone, the guest gets a merge
ticket (`start_merge`), logs in, and `finish_merge(ticket)` moves tokens, prizes and membership
across (once a day per account). Online, the world is invite-only: `is_member()` gates everything.

**Servers.** Fixed servers in `private.servers` (LAB 1-3, cap 12 each; owner edits them in SQL).
You `claim_seat(server)` (refused when full), keep it alive with `seat_ping()` every 30 s (it
lapses after 90 s), and give it back with `leave_seat()`. Every channel is per server, and RLS
only lets you in to your seat's server, so the cap is enforced server-side:
`hangout:<server>:<room>` (players send + receive), `hangout-srv:<server>:<room>` (receive only;
only the database sends there via `realtime.send`, so sender ids on it are real) and
`hangout:<server>:lobby` (who's online + hide and seek).

| who's here | presence, key = user id | `{ name, look, x, y, dir }` |
| movement | broadcast `move`, 9 Hz while walking in a quiet room easing to 4 Hz with 11+ others (`sendHz`), once on stop, heartbeat every 4s, and again whenever someone joins | `{ id, x, y, dir, moving, use, hold, pose }` |
| chat | RPC `send_chat(room, body)` → server filters, rate-limits (0.7 s / 12 a minute), logs, then broadcasts `chat` on `hangout-srv:<server>:<room>` | `{ id, text }` (≤80 chars) |
| saves | table `saves` (read/write own, ≤16 KB object) | `{ unlocks, friends, feeds, hi, fish, stars }` |
| prizes | RPC `play_claw()` (3 tokens, server rolls, dupes refund 1); table `inventory` read-own | `{ item, dupe, tokens }`, items are `'slot:index'` |
| servers | RPCs `list_servers(friends)`, `claim_seat`, `seat_ping`, `leave_seat`, `my_server` | `{ id, name, players, cap, here }` |
| pong | broadcast `pong`, ~15/s per side, only during a match | `{ id, s, p, b?, sc?, ph? }` |
| hide and seek | broadcast `world` on the lobby channel; only the seeker's updates count mid-round | `{ id, seeker, phase, t0, ids, names, found, ts }` |
| tokens | RPCs `my_tokens`, `claim_coin(0..5)` (once per 5-min window), `claim_daily` (+5); table `wallets` is read-only to players | balance |
| moderation | RPC `report_player(who, reason)`; 3 reporters in 10 min = 30 min mute; owner-only `ban_player` | |
| emote | broadcast `emote` | `{ id, kind }` (`wave` `hop` `joy` `huh` `idea` `sip` `eat` `feed`) |
| room state | broadcast `state`, newest `ts` wins (`slop` merges as a union); the host re-sends all of it when someone joins | `{ id, k, v, ts }` (`juke`, `hi`, `board`, `build`, `deploy`, `notes`, `game`, `slop`, `fw`, `crypt`, `claw`, `champ`) |
| stage notes | broadcast `note`, ≤14/s | `{ id, i, n }` (instrument 0-3, pad 0-7) |
| who's online | presence on the server's `hangout:<server>:lobby` (LOCAL: `lobby` messages every 2 s) | `{ name, room }` |
| whiteboard | broadcast `draw`, ~12/s while drawing | `{ id, c, p: [x0,y0,…], clear, ts }` |
| profile | table `profiles` (RLS: members read all, write own; names scrubbed by a trigger) | `{ name, look }` |

`look = { c, hat, face, fit, sp, pet, desk }`, small integer indexes into `BODY`/`HATS`/`FACES`/`FITS`/`SPECIES`/`PETS`
(`desk` is a bitmask of `DESK_ITEMS`)
(`sp` 0 = critter, 1 = Clawd; both bodies draw every hat/face/outfit, each fitted to its shape).
`use` = index into `room.spots` you're using (-1 none); `hold` = what's in your hand (0 none,
1 mug, 2 popcorn, 3 soda, 4-6 marshmallow raw/toasted/burnt); `pose` = 0 normal, 1 dancing, 2 sitting on the floor (cleared when
you move). Spot lists are append-only, like look options.

**Shared time without a server:** NPC routines, the Square's day/night (20 min loop), the
cinema film (80 s loop) and jukebox playback are all computed from `Date.now()`, so every
client agrees without any messages. Room state (`juke`, `hi`, `board`) is what can't be
derived from the clock; the lowest-id player in the room re-broadcasts it on each join.
Remote avatars are drawn 140 ms in the past and interpolated (`stepRemote`).

**Rules:**
- Every inbound payload goes through `parseMove/parsePeer/parseChat/parseEmote` first.
- Render user text with `textContent` or the pixel font, **never `innerHTML`**.
- Adding a message type means: add it to `NetEvent`, add a validator, and implement it in
  **both** `supabase.ts` and `local.ts`.
- Adding a look option means appending it to the list. Never reorder, because indexes are
  saved in the database.

### Known limitations (good next tasks)
- **Trust**: chat identity is server-verified, but moves/emotes/notes/room state are still
  sent by clients on `hangout:<room>` with a self-claimed `id`. Supabase evaluates channel RLS
  once at join, not per message, so it can't stop a *member* from spoofing another member's
  moves. Members-only keeps this to people you invited. Anything that must be trusted goes
  through an RPC + `realtime.send` (like chat and tokens).
- Coins: the server can't see positions, so a cheater could claim all 6 coins per 5-min window
  without walking (max ~72 tokens/hour). Spending them is server-side (`play_claw`).
- Cosmetics are only cosmetic: a modified client could wear an item it hasn't won (the server
  can't stop what a browser draws). The inventory itself is server-owned.
- Pong scores and the CHAMP board are client-run (P1's browser); hide and seek is run by the
  seeker's browser. Fine for friends; don't hang rewards off them without a server check.
- Realtime billing counts every delivery (1 send + 1 per receiver). Free plan: 100 msg/s and 2M a
  month, so a server of ~6 walking at once is the practical ceiling; Pro (500/s) fits 12.
- Presence x/y is only the join position; live positions come from `move` broadcasts.
- NPC timing, day/night, the film and music use each player's clock (`Date.now()`); badly
  skewed clocks put them out of sync.
- The whiteboard has no moderation: anyone in the Lab can draw anything or wipe it. Room
  state is ephemeral (gone when the room empties). Persisting it would need a table + RLS.
- Room-state catch-up trusts the sender's `ts`; a malicious client could overwrite the
  jukebox / high score / board / game / crypt. Fine for friends, not for public launch.
- Party games are run by whoever started them (the host). If the host leaves mid-game it goes
  stale and is ignored after ~12 s. The host judges who sat down, so a cheating host can cheat.
- Unlocks (CROWN hat, fish log, constellations) live in localStorage: per browser, not per account.
- Chat and names are filtered + rate-limited on the server; notes, the whiteboard and room
  state only get the client-side filter/limits in net/filter.ts.

## Conventions

- TypeScript strict; `npm run typecheck` must pass.
- Drawing code is intentionally dense (it matches the film's source). Don't run a
  formatter over `world/*.ts` or `critter.ts` (formatOnSave is off for that reason).
- Colours: tokens only (see palette.ts). Use `shade()` / `M()` to vary them.
- Randomness in sets: `h1()` only. `Math.random()` is fine for audio and ids.
- Keep glow on the glow layer and solid pixels on the crisp layer (see ART_STYLE §2).
- Interactions: add a `Spot` to the room's spot list (append only), then handle its kind in
  `useSpot`/`updateMe` (main.ts) and `poseFor` (avatar.ts). E / the action pill picks it up automatically.
  Things you fill and carry (coffee/popcorn/soda) go in the `FILL` table in main.ts.
- New shared room value: add a variant to `StateVal` + `parseState` (transport.ts), then keep a
  display copy in that room's `onState` (like `DEN_INFO`/`LAB_INFO`). Catch-up for newcomers is automatic.
- Room hooks worth knowing: `music` (a `juke` spot cycles its tracks), `talkers` (non-avatar
  things you TALK to, like the duck), `watch` (camera target while seated), `dimNow`/`bgAlt`/`glowMul`.
- New room checklist also: add the id to `RoomId`/`ROOM_IDS` (room.ts), `ROOMS` + `roomState` in main.ts,
  a `.plate.<id>` style, and a door to it from an existing room (`edge: true` for open set edges).
- Things that must line up for everyone but never change (NPC days, day/night, films, fireworks
  on the hour, slop waves, pomodoro): compute them from `Date.now()`, don't send messages.
- New room checklist: `world/<name>.ts` exporting `make<Name>()` → add to `ROOM_IDS` in
  room.ts and `ROOMS` in main.ts → add a door in an existing room pointing at it → add a
  `.plate.<id>` colour in styles.css.

## IP / branding (important)
- **Clawd is here on purpose.** The owner deliberately added Anthropic's Clawd mascot as a
  second playable body (`sp: 1`, `composeClawd` in critter.ts). Don't remove or "fix" it.
  It is used **with permission from Anthropic** (confirmed by the owner, 2026-09-24).
- Don't add any other existing characters, and don't use Anthropic/Claude logos or
  wordmarks. The default player character is an original critter.
- The sets, palette and rendering approach are adapted from the film "Claw'd Labs, Part 0",
  used **with its creator's permission** (confirmed 2026-09-24). Always keep the credit in
  the README.
- The working title is "Lab Hangout". Check trademarks before choosing a public name.

## Ideas backlog
The phased plan is `docs/ROADMAP.md`. Smaller ideas not on it yet:
- Private rooms / invite links (`hangout:<room>:<code>`)
- Mobile: on-screen joystick as an alternative to tap-to-walk
