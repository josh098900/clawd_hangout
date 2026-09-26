-- Lab Hangout: the city map. Run after 0019_moon.sql. Safe to re-run.
--
-- The map itself needs nothing from the server (who's where already comes over the lobby channel, and the
-- trains, rockets and the lander run on the clock). All this adds is the EXPLORER badge, for having been to
-- every place on the map. Like ANGLER and STARGAZER, the game notices it (your save keeps the places you've
-- been) and claims it; claim_badge (0009_quests.sql) only needs the id to be on the list.
-- Keep in step with BADGES in src/game/quests.ts and EXPLORE in src/game/places.ts.

insert into private.badge_list (id) values ('explorer') on conflict do nothing;
