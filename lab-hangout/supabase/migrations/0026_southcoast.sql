-- Lab Hangout: THE SOUTH COAST by tour bus (step 19, push 2). Run after 0025_airport.sql. Safe to re-run.
--
-- The tour bus, the waterfalls, the sneaker waves, the ring's glint and the puffins all run on the clock in the players' browsers, and
-- SOAKED goes out on the 'fx' message everyone already sends, so the server needs very little: three daily quests and a badge (the game
-- claims it).
--   * quests: behind (walk behind a waterfall: SELJALANDSFOSS), steps (climb the 527 steps at SKOGAFOSS), wave (outrun a sneaker wave
--     at REYNISFJARA)
--   * badges: treasure (TREASURE HUNTER: find THRASI'S RING in the pool at SKOGAFOSS)
-- Keep these in step with QUESTS / BADGES in src/game/quests.ts (npm run test:lists checks the quests match).

insert into private.quest_pool (id, weight, checked) values ('behind', 1, false), ('steps', 1, false), ('wave', 1, false)
on conflict (id) do update set weight = excluded.weight, checked = excluded.checked;
insert into private.badge_list (id) values ('treasure') on conflict do nothing;
