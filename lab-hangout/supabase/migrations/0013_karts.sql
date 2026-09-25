-- Lab Hangout: the Kart Track and the TANK DUEL. Run after 0012_diner.sql. Safe to re-run.
--
-- Races and duels run in the players' browsers (like Pong), so there are no token prizes to
-- guard here: just two daily quests (finish a kart race, win a tank duel) and two badges the
-- game awards (SPEED DEMON: win 5 races, TANK ACE: win 5 duels). Keep these in step with
-- QUESTS and BADGES in src/game/quests.ts.

insert into private.quest_pool (id, weight, checked) values ('kart', 1, false), ('tank', 0.7, false)
on conflict (id) do update set weight = excluded.weight, checked = excluded.checked;
insert into private.badge_list (id) values ('racer'), ('ace') on conflict do nothing;
