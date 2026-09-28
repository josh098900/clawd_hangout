\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002'), ('cccccccc-0000-0000-0000-000000000003');
select public.set_invite_code('letmein');
insert into public.profiles (id, name, look) values ('aaaaaaaa-0000-0000-0000-000000000001', 'ANNA', '{}'), ('bbbbbbbb-0000-0000-0000-000000000002', 'BEN', '{}');
-- catches, as if reeled in off the Pier (catch_fish rolls them at random, so the owner puts these in)
insert into private.catches (user_id, name, fish, rarity, cm) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ANNA', 'MACKEREL', 'COMMON', 30), ('aaaaaaaa-0000-0000-0000-000000000001', 'ANNA', 'MACKEREL', 'COMMON', 34),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ANNA', 'GOLDEN KOI', 'LEGENDARY', 50), ('aaaaaaaa-0000-0000-0000-000000000001', 'ANNA', 'OLD BOOT', 'JUNK', 28),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'BEN', 'MACKEREL', 'COMMON', 38), ('bbbbbbbb-0000-0000-0000-000000000002', 'BEN', 'MACKEREL', 'COMMON', 22);
select pg_temp.ok('the donate and feeding quests are in the pool, as ordinary quests', (select count(*) from private.quest_pool where id in ('donate', 'feeding') and not checked) = 2);
select pg_temp.ok('the CURATOR badge is on the list', exists (select 1 from private.badge_list where id = 'curator'));
select pg_temp.ok('the gift shop sells four clothes', (select count(*) from private.gift_items where item in ('hat:18', 'hat:19', 'face:10', 'fit:12')) = 4);
select pg_temp.ok('its furniture is in the catalogue', (select count(*) from private.furniture where id in ('plush', 'jlamp', 'bottle', 'aqposter') and price > 0) = 4);
set role authenticated;
select set_config('test.uid', 'cccccccc-0000-0000-0000-000000000003', false);
do $$ begin perform public.aquarium_tanks(); raise notice 'FAIL a non-member saw the gallery'; exception when raise_exception then raise notice 'PASS members only (the gallery)'; end $$;
do $$ begin perform public.donate_fish('MACKEREL'); raise notice 'FAIL a non-member donated'; exception when raise_exception then raise notice 'PASS members only (donating)'; end $$;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false); select public.join_world('letmein');
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false); select public.join_world('letmein');
select set_config('test.uid', 'cccccccc-0000-0000-0000-000000000003', false); select public.join_world('letmein');
select set_config('test.r', public.aquarium_tanks()::text, false);
select pg_temp.ok('an empty gallery to start with', jsonb_array_length(current_setting('test.r')::jsonb->'tanks') = 0 and current_setting('test.r')::jsonb->'best' = '{}'::jsonb and current_setting('test.r')::jsonb->'mine' = '{}'::jsonb);
do $$ begin perform public.donate_fish('SARDINE'); raise notice 'FAIL donated a fish never caught'; exception when raise_exception then raise notice 'PASS you have to catch one first: %', sqlerrm; end $$;
do $$ begin perform public.donate_fish('KRAKEN'); raise notice 'FAIL a made-up fish'; exception when raise_exception then raise notice 'PASS there is no tank for a made-up fish'; end $$;
-- ANNA
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select set_config('test.r', public.aquarium_tanks()::text, false);
select pg_temp.ok('the gallery knows your biggest catch of each kind', (current_setting('test.r')::jsonb->'best'->>'MACKEREL')::int = 34 and (current_setting('test.r')::jsonb->'best'->>'GOLDEN KOI')::int = 50);
select set_config('test.r', public.donate_fish('MACKEREL')::text, false);
select pg_temp.ok('an empty tank: your biggest takes the plaque', (current_setting('test.r')::jsonb->>'plaque')::boolean and (current_setting('test.r')::jsonb->>'cm')::int = 34);
select pg_temp.ok('the first mackerel pays a common thank-you: 2', (current_setting('test.r')::jsonb->>'paid')::int = 2 and (current_setting('test.r')::jsonb->>'tokens')::int = 2 and (current_setting('test.r')::jsonb->>'first')::boolean);
select pg_temp.ok('...and nobody lost a plaque', current_setting('test.r')::jsonb->'prev' = 'null'::jsonb);
do $$ begin perform public.donate_fish('MACKEREL'); raise notice 'FAIL donated the same fish twice'; exception when raise_exception then raise notice 'PASS the same fish can not be donated again'; end $$;
select pg_temp.ok('the golden koi pays a legendary thank-you: 6', (public.donate_fish('GOLDEN KOI')->>'paid')::int = 6);
select pg_temp.ok('the old boot pays a junk thank-you: 1', (public.donate_fish('OLD BOOT')->>'paid')::int = 1);
select pg_temp.ok('...9 tokens in all', public.my_tokens() = 9);
-- BEN has a bigger mackerel
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
select set_config('test.r', public.donate_fish('MACKEREL')::text, false);
select pg_temp.ok('a bigger one takes the plaque (38 over 34)', (current_setting('test.r')::jsonb->>'plaque')::boolean and (current_setting('test.r')::jsonb->>'cm')::int = 38);
select pg_temp.ok('...from ANNA', current_setting('test.r')::jsonb->>'prev' = 'ANNA');
select pg_temp.ok('...and BEN gets his own first thank-you', (current_setting('test.r')::jsonb->>'paid')::int = 2);
select set_config('test.r', public.aquarium_tanks()::text, false);
select pg_temp.ok('the plaque says BEN, 38 cm', exists (select 1 from jsonb_array_elements(current_setting('test.r')::jsonb->'tanks') t where t->>'fish' = 'MACKEREL' and t->>'name' = 'BEN' and (t->>'cm')::int = 38));
select pg_temp.ok('three tanks on show', jsonb_array_length(current_setting('test.r')::jsonb->'tanks') = 3);
select pg_temp.ok('your own donations are listed', (current_setting('test.r')::jsonb->'mine'->>'MACKEREL')::int = 38);
-- ANNA catches an even bigger one, and a smaller one never moves the plaque
reset role;
insert into private.catches (user_id, name, fish, rarity, cm) values ('aaaaaaaa-0000-0000-0000-000000000001', 'ANNA', 'MACKEREL', 'COMMON', 40), ('cccccccc-0000-0000-0000-000000000003', 'CAL', 'MACKEREL', 'COMMON', 20);
set role authenticated;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select set_config('test.r', public.donate_fish('MACKEREL')::text, false);
select pg_temp.ok('a bigger one of your own takes it back (40)', (current_setting('test.r')::jsonb->>'plaque')::boolean and current_setting('test.r')::jsonb->>'prev' = 'BEN');
select pg_temp.ok('...but no second thank-you', (current_setting('test.r')::jsonb->>'paid')::int = 0 and not (current_setting('test.r')::jsonb->>'first')::boolean);
select set_config('test.uid', 'cccccccc-0000-0000-0000-000000000003', false);
select set_config('test.r', public.donate_fish('MACKEREL')::text, false);
select pg_temp.ok('a smaller one can still be donated (for the thank-you and the badge)...', (current_setting('test.r')::jsonb->>'first')::boolean and (current_setting('test.r')::jsonb->>'paid')::int = 2);
select pg_temp.ok('...but it leaves the plaque alone', not (current_setting('test.r')::jsonb->>'plaque')::boolean);
reset role;
select pg_temp.ok('the tank still shows ANNA''s 40', (select name = 'ANNA' and cm = 40 from private.aq_tanks where fish = 'MACKEREL'));
set role authenticated;
do $$ begin update private.aq_tanks set cm = 999; raise notice 'FAIL a player edited a plaque'; exception when insufficient_privilege then raise notice 'PASS plaques are server-only'; end $$;
do $$ begin insert into private.catches (user_id, name, fish, rarity, cm) values ('cccccccc-0000-0000-0000-000000000003', 'CAL', 'MOON FISH', 'LEGENDARY', 90); raise notice 'FAIL a player made up a catch'; exception when insufficient_privilege then raise notice 'PASS catches are server-only'; end $$;
-- THE GIFT SHOP (ANNA has 9 tokens)
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
do $$ begin perform public.gift_shop('hat:18'); raise notice 'FAIL bought a 15-token hat with 9'; exception when raise_exception then raise notice 'PASS not enough tokens: %', sqlerrm; end $$;
select pg_temp.ok('...and nothing was taken', public.my_tokens() = 9);
reset role; select private.add_tokens('aaaaaaaa-0000-0000-0000-000000000001', 30); set role authenticated;
select set_config('test.r', public.gift_shop('hat:18')::text, false);
select pg_temp.ok('the CAPTAIN''S HAT: 15 tokens', current_setting('test.r')::jsonb->>'item' = 'hat:18' and (current_setting('test.r')::jsonb->>'tokens')::int = 24);
select pg_temp.ok('...and it is yours', exists (select 1 from public.inventory where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and item = 'hat:18'));
do $$ begin perform public.gift_shop('hat:18'); raise notice 'FAIL sold the same hat twice'; exception when raise_exception then raise notice 'PASS one of each'; end $$;
do $$ begin perform public.gift_shop('hat:10'); raise notice 'FAIL sold the HALO'; exception when raise_exception then raise notice 'PASS the shop only sells its own things'; end $$;
select pg_temp.ok('the SNORKEL: 10 tokens', (public.gift_shop('face:10')->>'tokens')::int = 14);
select pg_temp.ok('a FISH PLUSH for the flat: 6 tokens', (public.buy_furniture('plush')->>'tokens')::int = 8);
