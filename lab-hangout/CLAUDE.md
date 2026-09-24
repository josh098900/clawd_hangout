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
    voxels.ts          oblique voxel creations (castle, coaster, dragon), cached + shine
  entities/
    critter.ts         the player character sprite: Look options, Pose, composeCritter/stampCritter
    avatar.ts          per-player state, walk/emote posing, remote interpolation, name tags, emote FX
  net/
    transport.ts       Transport interface, message shapes, VALIDATORS (all inbound data is untrusted)
    supabase.ts        Supabase: anonymous auth, profiles table, one Realtime channel per room
    local.ts           BroadcastChannel transport for offline dev
  game/bots.ts         local demo bots (wander, use spots, play party games, jam), with routeTo() pathing
  game/party.ts        party games (musical chairs, tag): host-run state machine + banner text
  game/slop.ts         the slop invasion world event (wall clock waves, blob paths, hits)
  game/fish.ts         the Pier's fish table and the per-browser fish log
  game/npcs.ts         NPCs (Prof. Fizz, Gus): routines driven by the wall clock, so all players see the same thing
  game/ambient.ts      local-only life: pigeons in the Square, robot vacuum in the Lab, the office cat in the Den
  ui/
    start.ts           start screen + look editor with live preview
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
supabase/migrations/   SQL (profiles table + RLS)
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

Two **private** Realtime channels per room (members only, RLS on `realtime.messages`, see
`supabase/migrations/0002_security.sql`): `hangout:<roomId>` (players send + receive) and
`hangout-srv:<roomId>` (receive only; only the database sends there via `realtime.send`, so
sender ids on it are real). Online, the world is invite-only: `is_member()` gates everything.

| What | How | Payload |
|---|---|---|
| who's here | presence, key = user id | `{ name, look, x, y, dir }` |
| movement | broadcast `move`, ≤9 Hz while walking, once on stop, heartbeat every 4s, and again whenever someone joins | `{ id, x, y, dir, moving, use, hold, pose }` |
| chat | RPC `send_chat(room, body)` → server filters, rate-limits (0.7 s / 12 a minute), logs, then broadcasts `chat` on `hangout-srv:<room>` | `{ id, text }` (≤80 chars) |
| tokens | RPCs `my_tokens`, `claim_coin(0..5)` (once per 5-min window), `claim_daily` (+5); table `wallets` is read-only to players | balance |
| moderation | RPC `report_player(who, reason)`; 3 reporters in 10 min = 30 min mute; owner-only `ban_player` | |
| emote | broadcast `emote` | `{ id, kind }` (`wave` `hop` `joy` `huh` `idea` `sip` `eat` `feed`) |
| room state | broadcast `state`, newest `ts` wins (`slop` merges as a union); the host re-sends all of it when someone joins | `{ id, k, v, ts }` (`juke`, `hi`, `board`, `build`, `deploy`, `notes`, `game`, `slop`, `fw`, `crypt`) |
| stage notes | broadcast `note`, ≤14/s | `{ id, i, n }` (instrument 0-3, pad 0-7) |
| who's online | presence on a separate channel `hangout:lobby` (LOCAL: `lobby` messages every 2 s) | `{ name, room }` |
| whiteboard | broadcast `draw`, ~12/s while drawing | `{ id, c, p: [x0,y0,…], clear, ts }` |
| profile | table `profiles` (RLS: members read all, write own; names scrubbed by a trigger) | `{ name, look }` |

`look = { c, hat, face, fit, sp }`, small integer indexes into `BODY`/`HATS`/`FACES`/`FITS`/`SPECIES`
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
  without walking (max ~72 tokens/hour). Spending tokens (claw machine) must also be an RPC.
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
  It is for private/personal use only: before any public release, either get written
  permission from Anthropic or remove the Clawd option (the critter stays the default).
- Don't add any other existing characters, and don't use Anthropic/Claude logos or
  wordmarks. The default player character is an original critter.
- The sets, palette and rendering approach are adapted from someone else's film. Keep the
  credit in the README, and get the creator's permission before publishing publicly.
- The working title is "Lab Hangout". Check trademarks before choosing a public name.

## Ideas backlog
The phased plan is `docs/ROADMAP.md`. Smaller ideas not on it yet:
- Private rooms / invite links (`hangout:<room>:<code>`)
- Mobile: on-screen joystick as an alternative to tap-to-walk
- Hide-and-seek across rooms (needs game state on the lobby channel)
