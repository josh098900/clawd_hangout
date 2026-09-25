# Code review plan

A full review of every file in Lab Hangout: what could be better, what's repeated, what's no longer
used. First we review everything, then we fix things in batches. Josh checks each batch live before
it's pushed, like the roadmap steps.

**The review looks for:**
- **Bugs and edge cases:** logic errors, multiplayer sync races, phone-only problems, bad or
  missing data.
- **Duplication and dead code:** repeated code that could be shared, and unused exports, functions
  and leftovers.
- **Performance:** per-frame cost, memory, how many Realtime messages we send, and bundle size.

Security isn't in scope this time.

**Allowed:** big restructures too, such as splitting `main.ts` into feature modules and sharing the
code that `local.ts` and `supabase.ts` both repeat. Every change runs behind the tests below.

**Not changing:** the dense drawing style (on purpose; see CLAUDE.md), the art, Clawd, and
gameplay. The game should look and play the same after every fix, unless a finding is a bug.

## Phase 0: a safety net
- [x] `npm run test:sql` runs every migration twice on a local Postgres, then every SQL suite in
  `tests/sql/`.
- [x] `npm run test:smoke` opens every room in normal, Winter and Halloween modes with a headless
  Chrome. It checks for errors and main-thread load, then has two players check they see each
  other move.
- [x] How to run both is in the README.

## Phase 1: review (findings only, no code changes): DONE
Every file gets read. Each finding gets a severity (bug / worth doing / nice to have), a rough size
(S/M/L) and a suggested fix. The findings go in the report below, one section per area:

1. **Engine and audio:** `engine/*`, `audio/*`, `styles.css`, `index.html`
2. **Network:** `net/transport.ts`, `net/supabase.ts`, `net/local.ts`, `net/filter.ts`. Each message
   type is written twice, so look for shared code.
3. **`main.ts`:** 174 KB in one file. Find the seams for splitting it into features: winter, the
   diner, karts, flats, space, karaoke, party games, the HUD and so on.
4. **Rooms:** `world/*`, including the Halloween and Winter dressing
5. **Characters and game logic:** `entities/*`, `game/*`
6. **UI panels:** `ui/*`, including the modal helpers copied between panels
7. **SQL:** repeated patterns (membership checks, daily caps, grants), and the lists that must
   match between the game and the database (claw prizes, fish, seeds, quests, furniture, weather).
   A test could check these automatically.
8. **Docs:** README, CLAUDE.md and the ROADMAP, so they match what the code does.

## Phase 2: fixing in batches
Josh picks which findings to fix. The batches, safest first:
1. Clear bugs and dead code
2. Removing duplication (shared helpers)
3. Performance
4. Big restructures (splitting `main.ts`, shared network code)

After each batch: typecheck, build, `test:sql`, `test:smoke`, screenshots of anything that changed,
a push, then Josh's live check.

## Findings
**Summary (Phase 1 done, 25 September 2026).** 78 findings across the 8 areas.
- **Bugs:** the most important is **W1**: Halloween starts in 6 days and half the world isn't dressed.
  - W1: Halloween misses the rooms added since it was written, and stops short on the widened roof
  - M1: the wrong "finished" message for the hot dog and cocoa
  - M2: two room changes can run at once
  - E1: long sounds get cut short
  - E2: text centring with emoji
  - G1: a corrupted cached save stops the game from starting
  - G2: the penguin never talks
  - U1: keys stay stuck in the game panels after switching windows
- **Biggest wins for keeping the game easy to extend:**
  - M3: split main.ts into features
  - N2 + N3: one message registry, and the Transport split into realtime and API
  - G3: one table for held items
  - W2: one set of seasonal-dressing code
  - U2 + U4: a game-panel helper and a small UI kit
- **Dead code** is small: X1 lists everything that's truly unused.
- **Performance** is healthy (~12% main thread). E3, G6 and U5 are the cheap wins.
- **The lists shared between the game and the database all match.** S1 makes that a test.

**Suggested batches** (you pick):
1. **Bugs + Halloween** (before 1 October): W1, M1, M2, E1, E2, G1, G2, U1, N8, X1, D1, D2
2. **Small duplication:** E4, E5, W3, W4, W5, W6, M4, M5, M6, M7, U4, U6, S1, N7
3. **Performance:** E3, G6, U5, W12, G5, N11
4. **Restructures**, one feature per commit with the tests after each:
   M3 (split main.ts), N2/N3 (messages + Transport), G3 (held items), W2 (seasons), U2 (game panels), N4/N5
   (network helpers), E6 (synth helpers), E10 (CSS plates)
5. **SQL tidy-up** (a 0019 migration, needs you to run it): S2, S3

Severity: **BUG** = something behaves wrongly · **DO** = worth doing · **NICE** = nice to have.
Size: S (minutes) · M (an hour or so) · L (a session). Kind: bug / dup (duplication) / dead / perf / tidy.

### Whole project
- **X1 DO S dead:** code that's never used: `eOut2`, `decay` (math.ts), `HOLD_NONE`, `POSE_NONE` (avatar.ts),
  `StateKey` (transport.ts), `CINEMA_BOOTH` (cinema.ts), `knockedCount` (halloween.ts), `LAB_JUKE_X` (lab.ts).
  Found by the `knip` tool and then the type checker.
- **X2 NICE S tidy:** 131 exported names are only used inside their own file (e.g. every room's `*_SPOTS`, and
  `composeStrip` and `openPhoto` in photos.ts). They can drop `export`, which makes each file's real
  outside connections easier to see. Every `npx knip` run lists them.

### 1. Engine and audio
- **E1 BUG S:** long noise sounds get cut short. `sfx.ts` makes a single 1.5 s noise buffer and starts it at
  a random point up to 0.3 s in, so `ignite` (2.5 s, the rocket), `thunder` (1.8 s) and the Stage's crash
  cymbal (drum pad 7, up to 0.5 + 1.1 s) stop early. Fix: `s.loop = true` on those one-shot noise sources.
- **E2 BUG S:** `tw()` (text width) counts UTF-16 units, but `txt()` draws per character after
  `toUpperCase()`. So a name with an emoji, or a letter like "ß" that becomes "SS", is centred wrongly
  (name tags, labels). Fix: measure the same thing `txt` draws.
- **E3 DO M perf:** `r()` is the hot path, called thousands of times a frame. Each call makes a new
  array in `tint()`/`M()` and a new `rgb(...)` string in `css()`. `txt()` calls `r()` once per lit font
  pixel, so a name tag outlined in `txtOutlined` is five full passes. Ideas: skip `tint` when
  dim/flash are off; skip setting `fillStyle` when the colour hasn't changed; draw text from a cached
  canvas per (string, colour). Measure first (main thread is ~12–15% busy today, so this is headroom, not a fire).
- **E4 DO S dup:** `Rumble` and `Rain` (music.ts) are the same looping-filtered-noise class with different
  numbers. Make one `NoiseLoop(cutoff, gainScale, smoothing)`.
- **E5 DO S dup:** the MIDNIGHT CREEP track is copied word for word in `TRACKS` and `CHIPTUNES`. Define it
  once and use it in both lists.
- **E6 NICE M dup:** three copies of the same little synth, each able to make an envelope, an oscillator
  and filtered noise: `genv/tone/noise` in sfx.ts, `env/osc/hiss` inside `playPad`, and `voice/drum` in
  `MusicPlayer`. `playPad`'s drum case 6 even writes out `hiss` again inline to add a start offset.
  One shared set of helpers (with a destination node and a start time) would cover all three.
- **E7 NICE S perf:** once made, the kart `Engine`'s two oscillators and the rain and rocket noise loops
  run forever at volume 0, even after you've left that room. Stop them after they've faded out.
- **E8 NICE S tidy:** a few doc comments sit above the wrong thing. "The Dev Den radio" is above
  `DINER_TRACKS`, "Looping rain on the window" is above `Engine`, and "the Subway's door chime" in sfx.ts
  is an orphan.
- **E9 NICE S dup:** `renderer.follow` has `const H = rh` for no reason, and `initAudio` is exported but only
  used inside sfx.ts.
- **E10 DO M dup (CSS):** the room title plates are 24 near-identical rules spread across the file (the
  pier and plaza ones are ~40 lines below the rest). `.plate.parkstn` is an exact copy of
  `.plate.subway`. Give each room one line of CSS variables (two background colours, the edge, the sub
  colour, the title colour, the glow) and let a single `.plate` rule use them.
- **E11 NICE S tidy (CSS):**
  - `font-family: 'Press Start 2P'…` and `'VT323'…` are written out about 40 times; make them two variables.
  - There are four `#x.hidden { display: none }` rules; one `.hidden` would do.
  - The phone breakpoints are 520, 559 and 560 px; pick one.
  - Feature styles (decorate, knock, tickets, lyrics) are mixed in among the plates; group them by feature.

### 2. Network (transport, supabase, local, filter)
- **N1 NICE S: the tree picks its ornaments by date, not by season.** `supabase.ts` `ornaments()` fetches
  "hung in the last 45 days" in id order, **oldest first**, limit 240. The server keeps only the newest 240 per
  server per season, so normally this is fine. But ornaments from an early test (season year 0, via
  `set_season`) hung within 45 days of 1 December would show on the real tree. They would also count
  towards the 240, pushing out the newest real ones. Fix: filter by the season year, not by date, and take
  the newest (LOCAL mode already keeps the newest).
- **N2 DO L dup: one message registry instead of the same message written out ~6 times.** Adding one
  broadcast message (e.g. `snowball`) currently means changing 6 places:
  - a `NetEvent` variant, with its own field name (`m`, `kind`, `s`, `t`, `b`, `k`...)
  - a `parseX` validator
  - a `sendX` method on the `Transport` interface
  - `sendX` in supabase.ts
  - `sendX` in local.ts
  - a `ch.on('broadcast', ...)` line in supabase.ts and a `case` in `local.ts recv`

  That's 14 message types (27 near-identical one-line senders in all), 14 listener lines and 14 cases.
  Proposal:
  - A single table `MESSAGES = { move: { parse: parseMove, scope: 'room' }, world: { parse: parseWorld, scope: 'lobby' }, ... }`.
  - A uniform event `{ type, id, data }`.
  - A single `send(type, data)`.
  - Both transports loop over the table to subscribe and dispatch.

  Adding a message then means one validator plus one table line, and TypeScript still checks the payload
  types through a mapped type.
- **N3 DO L tidy: split `Transport` into realtime and API.** The interface has ~90 members:
  - ~25 realtime ones (rooms, lobby, sending)
  - ~65 database-function (RPC) wrappers (gardens, fishing, flats, space, winter, photos, quests...)

  Split it into `Realtime` and `Api`, and group each side by feature (e.g. `api.garden.plant`,
  `api.winter.openAdvent`). This pairs well with splitting `main.ts` (section 3).
- **N4 DO M dup: the Supabase database-function wrappers repeat themselves.** About 45 methods repeat the same
  three-part pattern:
  - `const { data, error } = await this.sb.rpc(...)`
  - `if (error) throw new Error(error.message)`
  - `return Number(data) || 0`

  `rpcJson` already exists but only about half use it. Add `rpcNum`, `rpcVoid`, `rpcList(fn, args, mapRow)`
  and small field readers (`int(o.tokens)`, `str(o.prize)`, `bool(o.mine)`). The file would shrink by roughly a third.
- **N5 DO M dup: the validators each rebuild the same checks.** `parseState` is a 26-branch `if` chain, and
  `parseMove`, `parseState`, `parseDiner` and `parseTank` each define their own `int(...)` helper, with slightly
  different rules. Share one small kit (`int(v, lo, hi)`, `num`, `list(v, max, item)`, `oneOf`), and have
  `parseState` use a `{ juke: parseJuke, hi: parseHi, ... }` table.
- **N6 DO M dup: LOCAL mode copies rules that already exist elsewhere.** The offline pretend server in
  `local.ts` re-implements each SQL function (that's its job), but it also copies rules the game already has
  elsewhere:
  - the tree's shape `8 + y*60/160` (= `treeHW` in winter.ts)
  - the sleigh timing (900 / 1800 / 330 s, from `sleigh()`)
  - the season dates (from `season.ts`)
  - the quest-picking maths

  Import those instead of copying them.
- **N7 DO M dup: `local.ts` repeats itself too.**
  - The "read/write JSON in localStorage, ignore errors" pattern is written out about 15 times (`beds`,
    `contests`, `trayList`, `photoRows`, `flats`, `furn`, `localBadges`, `inv`, `wallet`, ...). The `wj()` helper
    exists but only the winter code uses it.
  - The "capped per day" tip logic is copied three times (spacewalk, karaoke, diner).
  - "Give a seasonal prize you don't own yet" is copied twice (trick-or-treat, present hunt).

  Splitting the pretend server into small per-feature files behind one storage helper would halve it.
- **N8 NICE S bug: the token count can flash 0.** `supabase.ts` `tokens()` ignores errors and returns 0, so a
  failed request briefly shows 0 tokens in the HUD. Other methods throw; this one should too (the caller
  can keep the old number).
- **N9 NICE S: the chat channel is subscribed with no status callback.** The server channel (`hangout-srv:*`)
  is subscribed with no status handler. If only that channel fails, chat silently stops arriving. Report it
  like the room channel does.
- **N10 NICE S tidy: out-of-date comments in transport.ts.**
  - The block above `StateVal` lists only 4 of its 26 kinds.
  - The `MoveMsg` comment stops at hold 15 (the snowball and cocoa are 16 and 17).
  - `Account` has two doc comments stacked.
  - filter.ts still says the server filter is "to do", but it's done (0002).
- **N11 NICE S perf:** the flood-control `buckets` map in filter.ts keeps one entry per sender for the life of
  the tab. That's tiny, but it's never pruned.

### 3. main.ts
- **M1 BUG S: the wrong "finished" message.** When what's in your hand runs out, `updateMe` picks a message
  from a chain that only knows the mug, popcorn and marshmallows. Everything else says "Slurp! Soda
  finished", including a **hot dog** (you eat 4 bites, then "Soda finished") and winter's **hot cocoa**. Keep
  the "finished" message in the `FILL`/hold table next to each item.
- **M2 BUG M: two room changes can run at once.** `enterRoom()` isn't guarded against being called again
  while one is already running. `goThrough` checks `switching`, but these callers don't:
  - the hide-and-seek start (`onHS` sends the seeker to the Lab)
  - the GO button in WHO'S ONLINE
  - FOLLOW
  - `switchServer`, `rejoin` and `onSeatLost`
  - `goHome`/`visitFlat`, and a knock answered with "in"

  Two overlapping calls each fade, clear the room and `joinRoom`. The first may finish *after* the second, so
  the lobby shows the wrong room, the room-title plate is wrong, or bots spawn in the wrong room. Fix: one
  `enterRoom` queue, where a call made while switching waits, and only the latest request wins.
- **M3 DO L restructure: split main.ts into feature modules.** 2,426 dense lines, about 70 module-level
  variables, and every feature's logic lives here. The file already has clean sections. Proposal:
  - A small shared **game context**: `me`, `others`, `room`, `net`, `setState`, `toast`, plus helpers like
    `celebrate()`, `floatText()` and `closeSpot()`.
  - A **Feature** shape: `{ spots?: { [kind]: handler }, enter?(from, to), step?(dt, t), banner?(), onState?(s),
    onNet?(e), draw?: { back, props, front } }`.
  - **Feature files**, each owning its own state: `features/winter.ts`, `space.ts`, `karaoke.ts`, `diner.ts` (+ tour),
    `karts.ts`, `flats.ts`, `photos.ts`, `garden.ts`, `halloween.ts`, `fishing.ts` (+ contest), `party.ts` (+ hide and seek),
    `slop.ts`, `arcade.ts` (claw, pong, tanks, hi score), `den.ts` (build, deploy, pomodoro), `crypt.ts`.
  - **main.ts** keeps boot, movement, rendering and the loop, and walks the feature list.

  What it removes:
  - the 100-line `useSpot` if-chain (becomes a lookup)
  - the per-room `if (id === ...)` lines in `enterRoom` and `frame()`
  - the banner chain `slopLine || contestLine || dinerLine() || spaceLine() || winterLine()`
  - the 5 `isWinter()`/`isHalloween()` calls in `render()`

  Seasons become two more features. Do it one feature per commit, with the smoke test after each.
- **M4 DO S dup: small helpers written out again and again.** These get their own helpers:
  - `lastEmoteAt = -9; emote('joy')` appears **~14 times**. Make it `celebrate(kind = 'joy')`.
  - `onClose: () => { input.clear(); if (me.use === i) leaveSpot(); }` appears ~8 times. Make it `closeSpot(i)`.
  - `floaters.push({ x: me.x, y: me.y - 50, t0: now(), text: '+1' })` appears ~12 times. Make it `floatText(text, x?, y?)`.
  - Error toasts capitalise the message by hand (`m[0].toUpperCase() + m.slice(1)`) in 4 places, and
    `e instanceof Error ? e.message : String(e)` appears ~10 times even though `errText()` exists. Use one
    `errToast(e)`.
  - `hsLive(hs, net.selfId) && ...phase !== 'over'` appears 5 times. Make it `hsOn()`.
  - "everyone in the room" (`[me?, ...others, ...npcs.inRoom(...)]`) is rebuilt 5 times per frame. Make it
    `everyone()`, built once per frame.
- **M5 DO S dup: pairs of near-identical functions.**
  - `gardenDo` / `trayDo` are the same busy-flag + refresh + error-toast wrapper.
  - `startPong` / `startTank` are the same apart from the handle type.
  - `cook()` / `tourCook()` pick the same station sound with copied code.
  - The trick-or-treat and present-hunt "ALL N! prize or +5 tokens" code is copied.
  - The duck-feeding pond maths is copied in `onNet` and `feedDucks`.
- **M6 DO S dup: the bouncing hint arrow is drawn by copied code** in `drawDoorHints`, `drawActionHint`,
  the musical-chairs seat markers and `drawTourArrow`. Use one `drawArrow(x, y, colour, size)`.
- **M7 DO S dup: pill buttons with a key label** (`<kbd>E</kbd> LABEL`) are built by hand 7 times (action, sip,
  float, pose, emote, MORE, the instrument pad). Make one `pillButton(key, label, onClick)`.
- **M8 DO S tidy: drawing that belongs to its room lives in `render()`.**
  - The fishing rod and bobber (with the Pier's water line `398` hard-coded) belong in `pier.ts` or `avatar.ts`.
  - The Square's coins belong in `plaza.ts`.
  - The tag "IT!" marker and musical-chairs seats belong in `party.ts`.
  - The flat's move-in starter layout (in `goHome`) belongs in `flat.ts`, next to `STARTER`.
- **M9 DO S tidy: lists derived from `ROOM_IDS` are written out by hand.** `ROOMS` and `roomState` each spell
  out all 24 rooms. Build `roomState` from `ROOM_IDS` (`ROOMS` needs its maker per room, which a small table
  in room.ts could provide), so a new room can't be forgotten in one of them.
- **M10 NICE S: magic numbers.** The snowball fight's `90000` ms is written 5 times, the Diner's `1.5 s` settle
  and the kart timing are inline, and the `narrow()` 560 px breakpoint also lives in CSS. Name them once.
- **M11 NICE S bug: a snowman roll can go missing.** Two players rolling at the same moment both write
  `rolls + 1` (newest write wins). It's harmless for a snowman, but the same pattern backs the crypt blocks and
  kanban. Where it matters, send the change ("+1 roll"), not the result.
- **M12 NICE S: an error inside `frame()` is logged every frame (60 a second)** and the rest of that frame is
  skipped. Log each distinct error once, and keep drawing.
- **M13 NICE S tidy:**
  - An orphan doc comment ("Click a player: mute or unmute them").
  - A local `save` variable in `showStrip` hides the imported `save`.
  - An inline `import('./net/transport').FlatMsg` type.
  - The crypt's `pushSent -= 1` trick to re-send block positions once.

### 4. Rooms (world/*)
- **W1 BUG M (time-sensitive: October starts in 6 days): Halloween hasn't caught up with the new rooms.**
  `halloween.ts` only dresses the rooms that existed when it was written: the Square, Lab, Den, Roof,
  Cinema, Stage, Pier, Arcade and Crypt. These will look plain all October, although Winter dresses most of them:
  - the Park
  - the Subway and its 4 stations, and the train
  - the Diner and the Kart Track
  - the Lofts and the flats
  - the rocket, the Station and the spacewalk

  It also keeps its own room sizes (`WIDTH`, `FLOOR_Y`), and the roof's is still **1500**. The roof has been
  1860 wide since the Spaceport, so the fog and bats stop short of the launch pad. Fix: read `room.w` and
  `room.floor` instead of copying them, and add the missing rooms to its tables (pumpkins, lights, fog, bats
  over the Park).
- **W2 DO M dup: one set of seasonal-dressing code for both seasons.** `halloween.ts` and `winter.ts` each have:
  - their own `LIGHTS` table with the same `[x0, y0, x1, y1]` sagging-string format, drawn by copied code
  - their own props/back/front hooks
  - their own `installed` guard

  One shared "dressing" module (string lights, props per room, the install step) with a season's data
  plugged in would make both shorter, and a future season (spring? a birthday?) much cheaper.
- **W3 DO S dup: two lists of outdoor rooms.** `OUTDOORS` (weather.ts) and `OUTDOOR` (winter.ts) are the same four
  rooms with two names, and `main.ts` uses both. Keep one, or better, an `outdoor: true` flag on the Room.
- **W4 DO S dup: six time formatters with different rounding.**
  - `mmss` in contest.ts (rounds up)
  - `clockText` in space.ts (rounds up)
  - `mmss` in den.ts (zero-padded)
  - `mmss` in party.ts (rounds down)
  - `mmss` in ui/karaoke.ts (`Math.round` on the seconds, so 119.6 s shows as **"1:60"**)
  - the Diner banner's own inline one
  - plus `duration()` (garden.ts)

  Put one `mmss(sec, { pad })` in a small `engine/format.ts`.
- **W5 DO S dup: one integer hash, three copies.** The same 32-bit `mix` is written out in weather.ts (`roll`),
  game/diner.ts and game/kart.ts. Put it in engine/math.ts once (weather's must keep matching the SQL, which
  a test can check).
- **W6 DO S dup: the backdrop-baking setup is repeated in every set.**
  - Nearly every `build()` starts `withCtx(bg.getContext('2d')!, () => { PX.dim = 0; PX.fl = 0; PX.emit = false; ...`,
    and so do the UI canvases (~30 files). A `bake(canvas, fn)` helper in pixel.ts should do that and put the
    old values back.
  - Park, Pier, Roof and Square each have the same `build(){ paint(bg, false); if (bgAlt) paint(bgAlt, true) }`.
- **W7 NICE S dup: spots are written out longhand.** Most rooms write
  `{ kind, x, y, sx: x, sy: y, lift: 0, label, area }` by hand, and `applyLayout` in flat.ts does it 6 times in a row.
  A `spot(kind, x, y, label, area, extra?)` maker in room.ts would shorten every room.
- **W8 NICE S: magic spot numbers.** The Arcade's `PONG_SPOTS = [1, 2]` and `TANK_SPOTS = [6, 7]`, and the Lab's
  `LAB_COFFEE = 3` and `LAB_ARCADE = 4`, are typed-in indexes into the spot lists. Look them up
  (`findIndex(kind)`) so reordering can't break them. Spot lists are append-only anyway, but this is one less
  thing to keep in step.
- **W9 NICE S tidy: small leftovers.**
  - `labRoom`, `denRoom` and `cinemaRoom` are module-level "which room am I" variables, only there to read `inUse`.
    `drawBack` could be handed the room.
  - `dragon(..., a)` in cinema.ts ignores `a` (`void a`).
  - The flat's party beams assume a 960 px room, even in the 720 px kitchen.
  - Doors hard-code the coordinates of the room they lead to (e.g. the spacewalk's airlock arrives at
    `x: 1325`, which is `AIR_X` in station.ts). Import the constant.
- **W10 NICE S dup: the Station's trays copy the garden's plant logic.** `trayState`/`trayLine` repeat
  the ideas in `plantState`/`plantLine`, with their own copy of `STAGES`. That's fine while there are two, but
  a third growing thing should share a small "grows on the server's clock" helper.
- **W11 NICE: the Den storms on a clear day (a question, not a bug).** The Den has its own `lightning()`
  (every 97 s) and always-on window rain, separate from the real weather. That's probably intended for the
  lo-fi mood, but the Den could follow the real weather (still rain on the window when it's raining outside).
- **W12 NICE S perf: `routeTo` rebuilds the room's walk grid on every call.** That's a tap, or every 0.5 s
  while following someone. Cache it per room and clear the cache when blockers change (crypt blocks, the flat layout).

### 5. Characters and game logic (entities/*, game/*)
- **G1 BUG S: a corrupted cached save stops the game from starting.** `save.attach()` does
  `JSON.parse(localStorage 'labhangout.save.<id>')` unguarded, and boot calls it outside its try/catch. If
  that cache entry is ever corrupted (a half-written save, or a browser extension), boot throws and the
  game never starts for that player. Parse inside a try, and fall back to `{}`.
- **G2 BUG S: the PENGUIN pet never talks.** `PET_SAY` in avatar.ts stops at the BAT, so pet 7 always says `''`.
  The pet sounds should live next to `PETS` in critter.ts (a `{ name, say }` table) so a new pet can't miss
  one. The `Look.pet` comment ("0 none, 1 pigeon ... 5 ghost") is out of date too.
- **G3 DO M dup: held items are spread over many places.** What you're holding (`hold` 0-17) is defined across:
  - separate constants
  - a `USES` map
  - `useEmote()`
  - `drawAvatar`'s draw branches
  - main.ts `FILL`, and the "finished" message chain (see M1)
  - `syncActionBar`'s SIP/EAT/DROP label

  One `HOLDS` table (`{ id, name, draw, uses, verb: 'sip' | 'eat' | 'drop', done: 'Mug empty...' }`) would hold all
  of it, and adding an item would be one line.
- **G4 NICE S: badges use typed-in counts.** STARGAZER checks `stars.length >= 5` and ANGLER checks
  `fish.length >= 12`, which hard-codes how many constellations and fish there are, and main.ts prints
  "FISH LOG n/12". Use `FISH.length` and the constellation list's length.
- **G5 NICE S perf: badges the server refuses are asked for again and again.** `quests.checkBadges()` runs on
  every `stat()`/`setTokens()`. When the server refuses (its own check disagrees), the error is swallowed
  and the claim is sent again on the next stat change. Remember refusals for the session.
- **G6 NICE S perf: the NPC and everyone-in-the-room lists are rebuilt many times a frame.** `npcs.inRoom()`
  filters the whole NPC list each call, and it's called ~8 times per frame. Cache it once per frame, together
  with main.ts's `everyone()` (M4).
- **G7 NICE M perf:** every character is re-composed into its sprite canvas every frame (`composeCritter`:
  body, clothes, outline). Poses change every frame, so a cache wouldn't help much, and it's fine at
  ~12% main-thread. Only worth revisiting if 12 players + bots + NPCs ever gets heavy on phones.
- **G8 NICE S tidy: two more time formatters** (`hsBanner`'s `left` in hideseek.ts, `raceTime` in kart.ts).
  See W4.
- These files are in good shape: hide and seek, the party games, the Diner kitchen, the karts, karaoke, the
  group dances, remote smoothing (`pushSnap`/`stepRemote`), saves (merging is a union, so it's safe) and quests.
  They're small, pure and clock-driven.

### 6. UI panels (ui/*)
- **U1 BUG S: keys stay stuck in the game panels after you switch windows.** Kart race, Tank Duel,
  Pong, SLOP INVADERS and Mission Control keep their own set of held keys, and none of them clears it when
  the window loses focus (only `engine/input.ts` does). Holding ← and alt-tabbing leaves your kart
  turning (or your tank spinning) when you come back. Clear on `blur` / `visibilitychange`.
- **U2 DO M dup: one game-panel helper.** Those same 5 panels each copy the same scaffolding:
  - key capture (`kd`/`ku` with an allow-list, `preventDefault`, `stopPropagation`, lower-casing)
  - the touch "hold" buttons (`pointerdown` / `pointerup` / `pointerleave`)
  - the `requestAnimationFrame` loop
  - the close clean-up (`cancelAnimationFrame`, and removing both listeners)

  One `openGamePanel(title, { keys, frame, onClose })` that returns `{ held, holdButton }` would remove about
  15 lines per panel and fix U1 once.
- **U3 DO M UX: toasts overwrite each other.** There's one toast slot, so a second toast within a moment wipes
  out the first (e.g. "TREAT! +1 token" is replaced at once by "ALL 8 DOORS!", and quest/badge toasts cut off
  whatever was showing). Features work around it with hand-picked `setTimeout` delays (1.8 s, 2.5 s, 3 s,
  5.2 s...). A small queue would fix this: each toast gets a minimum time on screen, and important ones go first.
- **U4 DO M dup: a small UI kit instead of inline styles.**
  - `const font = (px, color) => ({ fontFamily: "'VT323'..." })` is copied into **7 files**.
  - `note()` (a centred VT323 line) is written 4 more times.
  - `Object.assign(el.style, {...})` appears **~100 times** across ui/* and main.ts.
  - `RARE_COL` is copied in claw.ts and prizes.ts.

  Put `text(t, size, colour)`, `note(t)` and `rarityColour` in modal.ts, and move repeated looks to CSS
  classes (`.note`, `.big`, `.hint`).
- **U5 NICE S perf: chat bubbles force a layout every frame.** `layoutBubbles` reads each bubble's
  `offsetWidth`/`offsetHeight` every frame while bubbles are showing, which makes the browser re-lay out the
  page. Measure only when the text changes, and cache the size.
- **U6 NICE S tidy: `BOT_LINES`, the local demo bots' chat lines, live in overlay.ts.** They belong in
  game/bots.ts.
- Otherwise fine:
  - The modal system: one at a time, `onClose` runs exactly once, Escape works.
  - Every panel removes the window-level listeners it adds, and cancels its animation loop.
  - User text is always set with `textContent`.

### 7. SQL (supabase/migrations)
**Checked: the lists kept in both places all match today.** I built the database from all 18 migrations and
compared its tables with the game's source:
- the claw prizes (25, weights and seasons)
- the fish (12, sizes) and their rarity odds
- the seeds (6)
- the furniture, wallpapers, floors and the starter kit
- the quest pool (28)
- the advent calendar prizes, and the tree's shape limits

Every one matches.
- **S1 DO S test: make that check permanent.** Add a `tests/sql/lists` step (or a part of `test:smoke`) that
  builds the database and compares those tables with `CLAW`, `FISH`, `SEEDS`, `FURN`/`WALLPAPERS`/`FLOORS`/`STARTER`,
  `QUESTS` and the weather `roll()` (the weather already has one in 11_weather.sql). Then a price or odds
  changed on one side only fails the tests instead of quietly drifting.
- **S2 DO M dup: one payout helper instead of three copies.** `diner_tip`, `karaoke_tip` and `spacewalk_pay` are
  the same ~12-line function: member check, lock, "one every N seconds", a sum of today's pay from their
  own log table, a cap per call and per day, pay, then return `{ tokens, paid }`. Only the numbers and the
  table differ. A `private.pay_capped(kind, amount, per_call, per_day, gap)` over one `private.payouts` log would
  replace them, and the next capped reward would be one line.
- **S3 NICE S dup: small SQL helpers repeated.**
  - The "start of today, UTC" expression `(now() at time zone 'utc')::date::timestamp at time zone 'utc'` is
    written out 6 times. Make it `private.utc_today()`.
  - The "your name or SOMEONE" lookup `coalesce(nullif(pr.name, ''), 'SOMEONE')` is written 7 times. Make it
    `private.name_of(uid)`.
  - `if not public.is_member() then raise exception 'not allowed'` appears 49 times. Keep it (each
    function must check), but a `private.member()` that returns `auth.uid()` or raises would make every
    function's first line shorter.
- **S4 how SQL fixes must ship:** the migrations are already applied on the live database, so don't edit old
  files to "clean them up". Any SQL change goes in a new migration (0019+) that redefines the functions, and
  you run it before the push, as always. So S2/S3 only make sense bundled with some other SQL work, or as one
  tidy-up migration.
- Otherwise in good shape:
  - Every public function is `security definer` with `search_path = ''`, and checks membership.
  - The per-user advisory locks stop double-claims.
  - Re-running is safe (checked twice by `test:sql`).
  - The grants are explicit.

### 8. Docs
- **D1 DO S: CLAUDE.md is out of date in places.**
  - It says players walk "eight rooms"; there are 24.
  - "Known limitations" still says unlocks, the fish log and constellations "live in localStorage: per browser,
    not per account". That was fixed by the `saves` table in 0004.
  - The "New room checklist" appears twice with different wording.
  - `halloween.ts` is described as "October dressing over every room" (it isn't, see W1).
  - After the restructures (M3, N2, N3), the "Adding a message type means..." rule and the Architecture map
    will need rewriting.
- **D2 DO S: ROADMAP.md is out of date in places.**
  - "Tank duel (2-player, networked)" is still unticked under Phase 2, although it's done (ticked under step 9).
  - The pigeon line says it's "kept in the browser" (it's in your save now).
  - Step 14 (Winter) can be ticked once you've checked the fixes live.
- **D3 NICE S:** comments in code that say something no longer true, collected from the areas above: N10
  (transport/filter), E8 (music/sfx), G2 (`Look.pet`), M13.
