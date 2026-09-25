\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
create or replace function pg_temp.age(t int, mins float8) returns void language sql as $$ update public.space_trays set planted_at = planted_at - make_interval(secs => mins * 60) where tray = t $$;
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002'), ('cccccccc-0000-0000-0000-000000000003');
select public.set_invite_code('letmein');
select private.add_tokens('aaaaaaaa-0000-0000-0000-000000000001', 20), private.add_tokens('bbbbbbbb-0000-0000-0000-000000000002', 2);
set role authenticated;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false); select public.join_world('letmein');
insert into public.profiles (id, name, look) values ('aaaaaaaa-0000-0000-0000-000000000001', 'ANNA', '{}');
-- ---- the trays ----
do $$ begin perform public.space_plant(0); raise notice 'FAIL planted without a seat'; exception when raise_exception then raise notice 'PASS need a server seat'; end $$;
select public.claim_seat('one');
do $$ begin perform public.space_plant(6); raise notice 'FAIL tray 6'; exception when raise_exception then raise notice 'PASS only trays 0-5'; end $$;
select pg_temp.ok('a star melon costs 3', public.space_plant(2) = 17);
select pg_temp.ok('tray shows the owner name', (select owner_name from public.space_trays where tray = 2) = 'ANNA');
do $$ begin perform public.space_plant(3); raise notice 'FAIL two melons'; exception when raise_exception then raise notice 'PASS one melon per player: %', sqlerrm; end $$;
do $$ begin perform public.space_harvest(2); raise notice 'FAIL harvested unripe'; exception when raise_exception then raise notice 'PASS not ripe yet'; end $$;
do $$ begin update public.space_trays set planted_at = now() - interval '1 day'; raise notice 'FAIL player edited a tray'; exception when insufficient_privilege then raise notice 'PASS trays are read-only to players'; end $$;
select pg_temp.ok('members can see the trays', (select count(*) from public.space_trays) = 1);
-- B: can't take A's tray, can't afford one, can't harvest A's
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false); select public.join_world('letmein'); select public.claim_seat('one');
do $$ begin perform public.space_plant(2); raise notice 'FAIL took a taken tray'; exception when raise_exception then raise notice 'PASS tray taken: %', sqlerrm; end $$;
do $$ begin perform public.space_plant(4); raise notice 'FAIL planted with 2 tokens'; exception when raise_exception then raise notice 'PASS costs tokens: %', sqlerrm; end $$;
reset role; select pg_temp.age(2, 31); set role authenticated; select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
do $$ begin perform public.space_harvest(2); raise notice 'FAIL harvested someone else''s'; exception when raise_exception then raise notice 'PASS only your own melon'; end $$;
do $$ begin perform public.space_dig_up(2); raise notice 'FAIL dug up someone else''s'; exception when raise_exception then raise notice 'PASS only dig up your own'; end $$;
-- A harvests: +5 and a comet bloom seed
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select set_config('test.r', public.space_harvest(2)::text, false);
select pg_temp.ok('harvest pays 5 (17 -> 22)', (current_setting('test.r')::jsonb->>'tokens')::int = 22);
select pg_temp.ok('harvest gives a comet bloom seed', current_setting('test.r')::jsonb->>'bonus' = 'seed:5' and exists (select 1 from public.inventory where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and item = 'seed:5'));
select pg_temp.ok('the tray is free again', not exists (select 1 from public.space_trays));
-- a second melon while still holding the seed: no second seed
select public.space_plant(0);
reset role; select pg_temp.age(0, 45); set role authenticated; select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_temp.ok('no second seed while you hold one', (public.space_harvest(0)->>'bonus') is null);
-- rotten: planted > 24.5 h ago
select public.space_plant(1);
reset role; select pg_temp.age(1, 1500); set role authenticated; select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select set_config('test.b', public.my_tokens()::text, false);
select set_config('test.r', public.space_harvest(1)::text, false);
select pg_temp.ok('a melon left a day goes off: no pay, tray freed', (current_setting('test.r')::jsonb->>'rotten')::boolean and (current_setting('test.r')::jsonb->>'tokens')::int = current_setting('test.b')::int and not exists (select 1 from public.space_trays));
-- a rotten melon frees its owner for a new one on planting
select public.space_plant(5);
reset role; select pg_temp.age(5, 1500); set role authenticated; select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_temp.ok('a rotten melon doesn''t block planting again', public.space_plant(3) > 0 and (select count(*) from public.space_trays) = 1);
select public.space_dig_up(3);
select pg_temp.ok('dig up your own', not exists (select 1 from public.space_trays));
-- ---- the comet bloom goes in the roof garden ----
reset role; select pg_temp.ok('comet bloom seed listed (6 h, pays 20, found only)', exists (select 1 from private.seeds where id = 5 and cost = 0 and grow_s = 21600 and pays = 20)); set role authenticated; select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select public.plant(0, 5);
select pg_temp.ok('planting a comet bloom uses up the seed', (select seed from public.plots where bed = 0) = 5 and not exists (select 1 from public.inventory where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and item = 'seed:5'));
select public.dig_up(0);
do $$ begin perform public.plant(0, 5); raise notice 'FAIL second comet bloom without a seed'; exception when raise_exception then raise notice 'PASS found seeds only once: %', sqlerrm; end $$;
do $$ begin perform public.plant(0, 4); raise notice 'FAIL moonflower without a seed'; exception when raise_exception then raise notice 'PASS moonflower still needs its seed: %', sqlerrm; end $$;
select set_config('test.b', public.my_tokens()::text, false);
select pg_temp.ok('bought seeds still cost tokens', public.plant(0, 0) = current_setting('test.b')::int - 2);
-- ---- spacewalk pay ----
select set_config('test.uid', 'cccccccc-0000-0000-0000-000000000003', false); select public.join_world('letmein');
select pg_temp.ok('0 points: nothing', (public.spacewalk_pay(0)->>'paid')::int = 0);
select pg_temp.ok('20 points: 2 tokens', (public.spacewalk_pay(20)->>'paid')::int = 2);
do $$ begin perform public.spacewalk_pay(50); raise notice 'FAIL two walks in a minute'; exception when raise_exception then raise notice 'PASS one walk a minute'; end $$;
reset role; update private.spacewalks set at = at - interval '2 minutes'; set role authenticated; select set_config('test.uid', 'cccccccc-0000-0000-0000-000000000003', false);
select pg_temp.ok('huge haul caps at 4', (public.spacewalk_pay(999999)->>'paid')::int = 4);
reset role; update private.spacewalks set at = at - interval '2 minutes'; set role authenticated; select set_config('test.uid', 'cccccccc-0000-0000-0000-000000000003', false);
select pg_temp.ok('4 more (10 today)', (public.spacewalk_pay(64)->>'paid')::int = 4);
reset role; update private.spacewalks set at = at - interval '2 minutes'; set role authenticated; select set_config('test.uid', 'cccccccc-0000-0000-0000-000000000003', false);
select pg_temp.ok('daily cap: 2 left of 12', (public.spacewalk_pay(64)->>'paid')::int = 2);
select pg_temp.ok('balance 12', public.my_tokens() = 12);
reset role; update private.spacewalks set at = at - interval '1 day'; set role authenticated; select set_config('test.uid', 'cccccccc-0000-0000-0000-000000000003', false);
select pg_temp.ok('tomorrow it pays again', (public.spacewalk_pay(8)->>'paid')::int = 1);
do $$ begin update private.spacewalks set paid = 99; raise notice 'FAIL player touched spacewalks'; exception when insufficient_privilege then raise notice 'PASS spacewalks table is private'; end $$;
-- ---- members only / anon ----
reset role; insert into auth.users (id) values ('dddddddd-0000-0000-0000-000000000004'); set role authenticated;
select set_config('test.uid', 'dddddddd-0000-0000-0000-000000000004', false);
do $$ begin perform public.spacewalk_pay(10); raise notice 'FAIL non-member paid'; exception when raise_exception then raise notice 'PASS members only (walks)'; end $$;
do $$ begin perform public.space_plant(0); raise notice 'FAIL non-member planted'; exception when raise_exception then raise notice 'PASS members only (trays)'; end $$;
reset role;
set role anon;
do $$ begin perform public.space_plant(0); raise notice 'FAIL anon planted'; exception when insufficient_privilege then raise notice 'PASS anon cannot plant'; end $$;
do $$ begin perform public.spacewalk_pay(10); raise notice 'FAIL anon paid'; exception when insufficient_privilege then raise notice 'PASS anon cannot be paid'; end $$;
do $$ begin perform count(*) from public.space_trays; raise notice 'FAIL anon read trays'; exception when insufficient_privilege then raise notice 'PASS anon cannot read trays'; end $$;
reset role;
select pg_temp.ok('quests + astronaut badge listed', (select count(*) from private.quest_pool where id in ('launch', 'spacewalk', 'comet')) = 3 and exists (select 1 from private.badge_list where id = 'astronaut'));
