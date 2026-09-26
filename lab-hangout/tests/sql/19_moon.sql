\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
-- the owner moves A's assays back in time (the machine only takes a rock every 20 s)
create or replace function pg_temp.cool() returns void language sql as $$ update private.moon_assays set at = at - interval '30 seconds' $$;
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002');
select public.set_invite_code('letmein');
select setseed(0.42);
set role authenticated;
-- not a member yet
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
do $$ begin perform public.moon_assay(); raise notice 'FAIL a non-member assayed'; exception when raise_exception then raise notice 'PASS members only'; end $$;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false); select public.join_world('letmein');
-- ---- one rock ----
select set_config('test.r', public.moon_assay()::text, false);
select pg_temp.ok('an assay pays 1 (a rock) or 3 (a crystal)', (current_setting('test.r')::jsonb->>'paid')::int in (1, 3) and (current_setting('test.r')::jsonb->>'tokens')::int = (current_setting('test.r')::jsonb->>'paid')::int);
select pg_temp.ok('crystal matches the pay', ((current_setting('test.r')::jsonb->>'crystal')::boolean) = ((current_setting('test.r')::jsonb->>'paid')::int = 3));
do $$ begin perform public.moon_assay(); raise notice 'FAIL two rocks in a row'; exception when raise_exception then raise notice 'PASS one rock every 20 seconds: %', sqlerrm; end $$;
do $$ begin insert into private.moon_assays (user_id, crystal, paid) values ('aaaaaaaa-0000-0000-0000-000000000001', true, 3); raise notice 'FAIL player wrote an assay'; exception when insufficient_privilege then raise notice 'PASS assays are server-only'; end $$;
select pg_temp.ok('moon_crystals counts yours', public.moon_crystals() = (select case when (current_setting('test.r')::jsonb->>'crystal')::boolean then 1 else 0 end));
-- ---- about 1 in 6 is a crystal (60 rolls, cooled down each time) ----
-- (the long runs below go as the owner, with the same player id: the function's rules are the same, no role switching mid-loop)
reset role; delete from private.moon_assays;
do $$ declare k int; begin for k in 1..60 loop perform public.moon_assay(); perform pg_temp.cool(); end loop; end $$;
select pg_temp.ok('some rocks are crystals, most are not (60 rolls)', (select count(*) filter (where crystal) from private.moon_assays) between 2 and 25);
-- ---- the daily cap: 15 tokens ----
select pg_temp.ok('no more than 15 paid in a day', (select sum(paid) from private.moon_assays) = 15);
select pg_temp.ok('after the cap an assay pays 0 (still recorded)', (select count(*) from private.moon_assays where paid = 0) > 0);
-- ---- the MOON ROVER with the fifth crystal ----
delete from private.moon_assays; delete from public.inventory;
insert into private.moon_assays (user_id, at, crystal, paid) select 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '2 days', true, 3 from generate_series(1, 4);
select set_config('test.prize', '', false);
do $$ declare r jsonb; k int; begin for k in 1..80 loop r := public.moon_assay(); if (r->>'crystal')::boolean then perform set_config('test.prize', coalesce(r->>'prize', 'none') || '/' || (r->>'crystals'), false); exit; end if; perform pg_temp.cool(); end loop; end $$;
select pg_temp.ok('the fifth crystal brings the MOON ROVER (pet:8)', current_setting('test.prize') = 'pet:8/5');
select pg_temp.ok('the rover is in the inventory', exists (select 1 from public.inventory where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and item = 'pet:8'));
select pg_temp.cool();
do $$ declare r jsonb; k int; ok boolean := true; begin for k in 1..80 loop r := public.moon_assay(); if (r->>'crystal')::boolean then ok := (r->>'prize') is null; exit; end if; perform pg_temp.cool(); end loop; perform pg_temp.ok('no second rover', ok); end $$;
-- ---- quests + badge ----
select pg_temp.ok('the moon quests are in the pool', (select count(*) from private.quest_pool where id in ('moonwalk', 'moonrock', 'buggy')) = 3);
select pg_temp.ok('the MOONWALKER badge can be claimed', exists (select 1 from private.badge_list where id = 'moonwalker'));
