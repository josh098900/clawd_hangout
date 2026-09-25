\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
-- time machine: move a plant's clock back by N hours (as if planted/watered N hours ago)
create or replace function pg_temp.age(b int, hrs float8) returns void language sql as $$ update public.plots set last_water = last_water - make_interval(secs => hrs * 3600), calc_at = calc_at - make_interval(secs => hrs * 3600) where bed = b $$;
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002'), ('cccccccc-0000-0000-0000-000000000003');
select public.set_invite_code('letmein');
select private.add_tokens('aaaaaaaa-0000-0000-0000-000000000001', 20), private.add_tokens('bbbbbbbb-0000-0000-0000-000000000002', 1);
set role authenticated;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false); select public.join_world('letmein');
insert into public.profiles (id, name, look) values ('aaaaaaaa-0000-0000-0000-000000000001', 'ANNA', '{}');
do $$ begin perform public.plant(0, 0); raise notice 'FAIL planted without a seat'; exception when raise_exception then raise notice 'PASS need a server seat to plant'; end $$;
select public.claim_seat('one');
select pg_temp.ok('radish costs 2', public.plant(0, 0) = 18);
select pg_temp.ok('plot shows the owner name', (select owner_name from public.plots where bed = 0) = 'ANNA');
do $$ begin perform public.plant(1, 1); raise notice 'FAIL two plants'; exception when raise_exception then raise notice 'PASS one plant per player: %', sqlerrm; end $$;
do $$ begin perform public.plant(2, 4); raise notice 'FAIL moonflower without a seed'; exception when raise_exception then raise notice 'PASS moonflower needs a found seed'; end $$;
do $$ begin perform public.harvest(0); raise notice 'FAIL harvested unripe'; exception when raise_exception then raise notice 'PASS not ripe yet'; end $$;
do $$ begin perform public.water(0); raise notice 'FAIL watered wet plant'; exception when raise_exception then raise notice 'PASS still wet right after planting: %', sqlerrm; end $$;
do $$ begin update public.plots set grown = 99999; raise notice 'FAIL player edited a plot'; exception when insufficient_privilege then raise notice 'PASS plots are read-only to players'; end $$;
-- B waters A's plant (after 40 min): +1 token thanks, once
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false); select public.join_world('letmein'); select public.claim_seat('one');
do $$ begin perform public.plant(1, 1); raise notice 'FAIL B planted with 1 token'; exception when raise_exception then raise notice 'PASS seeds cost tokens: %', sqlerrm; end $$;
reset role; select pg_temp.age(0, 0.7); set role authenticated; select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
select set_config('test.r', public.water(0)::text, false);
select pg_temp.ok('watering a friend''s plant: thanked with a token', (current_setting('test.r')::jsonb->>'thanked')::boolean and (current_setting('test.r')::jsonb->>'tokens')::int = 2);
reset role; select pg_temp.age(0, 0.6); set role authenticated; select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
select pg_temp.ok('no second thanks for the same plant today', not (public.water(0)->>'thanked')::boolean);
-- A: ripe after ~1h of growth (0.7 + 0.6 h, the second part boosted) -> harvest
reset role;
select pg_temp.ok('growth credited ~1.3h+boost', (select private.growth(grown, calc_at, last_water, now()) from public.plots where bed = 0) > 3600);
set role authenticated; select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
do $$ begin perform public.harvest(0); raise notice 'FAIL B harvested A''s plant'; exception when raise_exception then raise notice 'PASS only the owner harvests'; end $$;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select set_config('test.r', public.harvest(0)::text, false);
select pg_temp.ok('harvest pays 4', (current_setting('test.r')::jsonb->>'tokens')::int = 22);
select pg_temp.ok('bed is free again', not exists (select 1 from public.plots where bed = 0));
-- wilting: 30h without water grows only 24h; dead after 72h
select public.plant(3, 3);
reset role; select pg_temp.age(3, 30);
select pg_temp.ok('wilted plants stop growing (24h + 3h boost counted, not 30h)', (select round(private.growth(grown, calc_at, last_water, now()) / 3600) from public.plots where bed = 3) = 25);
select pg_temp.age(3, 45);
set role authenticated; select set_config('test.uid', 'cccccccc-0000-0000-0000-000000000003', false); select public.join_world('letmein'); select public.claim_seat('one');
reset role; select private.add_tokens('cccccccc-0000-0000-0000-000000000003', 5); set role authenticated; select set_config('test.uid', 'cccccccc-0000-0000-0000-000000000003', false);
select public.plant(3, 0);
select pg_temp.ok('a dead plant (75h dry) frees its bed for someone else', (select owner from public.plots where bed = 3) = 'cccccccc-0000-0000-0000-000000000003');
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_temp.ok('and its owner can plant again', public.plant(5, 0) is not null);
select public.dig_up(5);
select pg_temp.ok('dig up your own plant', not exists (select 1 from public.plots where bed = 5));
do $$ begin perform public.dig_up(3); raise notice 'FAIL dug up someone else''s'; exception when raise_exception then raise notice 'PASS cannot dig up others'' plants'; end $$;
-- moonflower seed from the inventory
reset role; insert into public.inventory (user_id, item) values ('aaaaaaaa-0000-0000-0000-000000000001', 'seed:4'); set role authenticated; select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select public.plant(6, 4);
select pg_temp.ok('moonflower planted from the found seed, seed used up', (select seed from public.plots where bed = 6) = 4 and not exists (select 1 from public.inventory where item = 'seed:4'));
-- other servers have their own beds
select public.claim_seat('two'); select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false); select public.claim_seat('two');
reset role; select private.add_tokens('bbbbbbbb-0000-0000-0000-000000000002', 5); set role authenticated; select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
select public.plant(6, 0);
select pg_temp.ok('bed 6 on LAB 2 is separate from bed 6 on LAB 1', (select count(*) from public.plots where bed = 6) = 2);
select set_config('test.uid', 'dddddddd-0000-0000-0000-000000000004', false);
select pg_temp.ok('non-members see no plots', (select count(*) from public.plots) = 0);
