-- Lab Hangout: THE AIRPORT and ICELAND (step 19, push 1). Run after 0024_sub.sql. Safe to re-run.
--
-- The flights, Iceland's clock, its weather and the northern lights are all worked out in the players' browsers from the clock, so the
-- server needs very little: the prices of what the new shops sell (bought with the aquarium's gift_shop() and buy_furniture(), which
-- work for any item in their lists), three daily quests, and two badges (the game claims them).
--   * DUTY FREE (the airport): the NECK PILLOW (fit 14)
--   * THE PUFFIN SHOP (Reykjavik): the LOPAPEYSA (fit 13), the VIKING HELMET (hat 21), and four pieces of furniture for your flat
--   * quests: fly (fly to Iceland), hotdog (one with everything), aurora (photograph the northern lights)
--   * badges: flyer (FREQUENT FLYER: 10 flights), aurora (AURORA HUNTER: photograph a storm, KP 7+)
-- Keep these in step with GIFTS / GIFT_SHOP in src/entities/critter.ts, the furniture in src/world/furniture.ts, and QUESTS / BADGES in
-- src/game/quests.ts (npm run test:lists checks the lists match).

insert into private.gift_items (item, price) values
  ('fit:14', 10), -- NECK PILLOW (duty free)
  ('fit:13', 15), -- LOPAPEYSA (the Puffin Shop)
  ('hat:21', 15)  -- VIKING HELMET (the Puffin Shop)
on conflict (item) do update set price = excluded.price;

insert into private.furniture (id, price, starter) values ('puffplush', 8, 0), ('sheeprug', 12, 0), ('isflag', 6, 0), ('lavalamp', 10, 0)
on conflict (id) do update set price = excluded.price;

insert into private.quest_pool (id, weight, checked) values ('fly', 1, false), ('hotdog', 1, false), ('aurora', 1, false)
on conflict (id) do update set weight = excluded.weight, checked = excluded.checked;
insert into private.badge_list (id) values ('flyer'), ('aurora') on conflict do nothing;
