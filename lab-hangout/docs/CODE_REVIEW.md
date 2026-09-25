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

## Phase 1: review (findings only, no code changes)
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
(filled in during Phase 1)
