\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
-- the owner sets the dive clock (players can't): test.s = epoch seconds, as if it were then
create or replace function private.dive_clock() returns double precision language sql stable set search_path = '' as $$ select coalesce(nullif(current_setting('test.s', true), ''), '0')::double precision $$;
-- dive 1000 surfaces at 1000 * 480 + 470 = 480470
select set_config('test.s', '480472', false);
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002'), ('cccccccc-0000-0000-0000-000000000003');
select public.set_invite_code('letmein');
insert into public.profiles (id, name, look) values ('aaaaaaaa-0000-0000-0000-000000000001', 'ANNA', '{}'), ('bbbbbbbb-0000-0000-0000-000000000002', 'BEN', '{}');
select pg_temp.ok('the dive quest is in the pool, as an ordinary quest', exists (select 1 from private.quest_pool where id = 'dive' and not checked));
select pg_temp.ok('the MARINE BIOLOGIST badge is on the list', exists (select 1 from private.badge_list where id = 'biologist'));
-- the timetable: a dive's pay window is 30 s before it surfaces to 70 s after
select pg_temp.ok('surfacing: dive 1000', private.dive_surfaced(480470) = 1000);
select pg_temp.ok('30 s early and 70 s late still count', private.dive_surfaced(480440) = 1000 and private.dive_surfaced(480540) = 1000);
select pg_temp.ok('31 s early and 71 s late do not', private.dive_surfaced(480439) is null and private.dive_surfaced(480541) is null);
select pg_temp.ok('the middle of the next dive is no one''s', private.dive_surfaced(480470 + 240) is null);
select pg_temp.ok('the next dive surfaces 480 s later', private.dive_surfaced(480470 + 480) = 1001);
set role authenticated;
select set_config('test.uid', 'cccccccc-0000-0000-0000-000000000003', false);
do $$ begin perform public.dive_pay(2, true); raise notice 'FAIL a non-member was paid'; exception when raise_exception then raise notice 'PASS members only (pay)'; end $$;
do $$ begin perform public.found_boot(); raise notice 'FAIL a non-member found the boot'; exception when raise_exception then raise notice 'PASS members only (the boot)'; end $$;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false); select public.join_world('letmein');
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false); select public.join_world('letmein');
-- ANNA
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select set_config('test.s', '480710', false);
do $$ begin perform public.dive_pay(2, true); raise notice 'FAIL paid mid-dive'; exception when raise_exception then raise notice 'PASS no pay in the middle of a dive: %', sqlerrm; end $$;
select set_config('test.s', '480475', false);
select set_config('test.r', public.dive_pay(3, true)::text, false);
select pg_temp.ok('a dive with 3 finds and the mission pays 7 (1 + 3 + 3)', (current_setting('test.r')::jsonb->>'paid')::int = 7 and (current_setting('test.r')::jsonb->>'tokens')::int = 7);
do $$ begin perform public.dive_pay(3, true); raise notice 'FAIL paid twice for one dive'; exception when raise_exception then raise notice 'PASS once a dive: %', sqlerrm; end $$;
select set_config('test.s', '480470' , false);
do $$ begin perform public.dive_pay(0, false); raise notice 'FAIL paid twice for one dive (a bit earlier)'; exception when raise_exception then raise notice 'PASS still once a dive, whenever in its window'; end $$;
select set_config('test.s', '480950', false);
select pg_temp.ok('the next dive: a lot of finds count as 4, no mission: 5', (public.dive_pay(99, false)->>'paid')::int = 5);
select set_config('test.s', '481430', false);
select pg_temp.ok('no finds (or a silly number) count as none: 1', (public.dive_pay(-5, false)->>'paid')::int = 1);
select set_config('test.s', '481910', false);
select pg_temp.ok('a missing mission is no mission', (public.dive_pay(0, null)->>'paid')::int = 1);
do $$ begin insert into private.sub_pays (user_id, n, paid) values ('aaaaaaaa-0000-0000-0000-000000000001', 5, 8); raise notice 'FAIL a player wrote a pay'; exception when insufficient_privilege then raise notice 'PASS pay records are server-only'; end $$;
-- the day's cap: 7 + 5 + 1 + 1 = 14 so far; two more full dives would make 30, but the day stops at 24
select set_config('test.s', '482390', false); select public.dive_pay(4, true);
select set_config('test.s', '482870', false); select set_config('test.r', public.dive_pay(4, true)::text, false);
select pg_temp.ok('no more than 24 a day (that dive paid what was left: 2)', (current_setting('test.r')::jsonb->>'paid')::int = 2 and (current_setting('test.r')::jsonb->>'tokens')::int = 24);
select set_config('test.s', '483350', false);
select pg_temp.ok('...and after that, nothing', (public.dive_pay(4, true)->>'paid')::int = 0);
reset role;
select pg_temp.ok('the pay records: one per dive, 24 in all', (select count(*) = 7 and sum(paid) = 24 from private.sub_pays where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'));
set role authenticated;
-- BEN has his own pay
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
select set_config('test.s', '480475', false);
select pg_temp.ok('someone else on the same dive is paid too', (public.dive_pay(1, false)->>'paid')::int = 2);
-- THE OTHER BOOT
select pg_temp.ok('the first to bring up THE OTHER BOOT', public.found_boot() = true);
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_temp.ok('...and after that it is already in the gallery', public.found_boot() = false);
select set_config('test.r', public.aquarium_tanks()::text, false);
select pg_temp.ok('the gallery shows it, with who found it', exists (select 1 from jsonb_array_elements(current_setting('test.r')::jsonb->'tanks') t where t->>'fish' = 'OTHER BOOT' and t->>'name' = 'BEN'));
do $$ begin perform public.donate_fish('OTHER BOOT'); raise notice 'FAIL donated the other boot'; exception when raise_exception then raise notice 'PASS it is not a fish you can donate'; end $$;
reset role;
select pg_temp.ok('only one OTHER BOOT', (select count(*) from private.aq_tanks where fish = 'OTHER BOOT') = 1);
