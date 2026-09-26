-- Lab Hangout: THE CHEM LAB (the Science Wing, push 2). Run after 0021_reactor.sql. Safe to re-run.
--
-- The chem lab needs nothing else from the server. Every mix is worked out in the players' browsers (only the mix
-- itself is sent, over the room's channel), nothing in it costs or pays tokens, and your recipe book lives in your save.
-- All this adds is the 'chem' daily quest (brew a potion) and the CHEMIST badge (every reaction in the recipe book:
-- like EXPLORER, the game notices and claims it; claim_badge (0009_quests.sql) only needs the id to be on the list).
-- Keep in step with QUESTS / BADGES in src/game/quests.ts and REACTIONS in src/game/chem.ts.

insert into private.quest_pool (id, weight, checked) values ('chem', 1, false)
on conflict (id) do update set weight = excluded.weight, checked = excluded.checked;
insert into private.badge_list (id) values ('chemist') on conflict do nothing;
