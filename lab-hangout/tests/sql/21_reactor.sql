\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
-- the owner moves A's pay back in time (a shift is paid at most once every 200 s)
create or replace function pg_temp.cool() returns void language sql as $$ update private.reactor_pays set at = at - interval '210 seconds' $$;
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002');
select public.set_invite_code('letmein');
select pg_temp.ok('the reactor quest is in the pool', exists (select 1 from private.quest_pool where id = 'reactor'));
select pg_temp.ok('the CHIEF ENGINEER badge can be claimed', exists (select 1 from private.badge_list where id = 'engineer'));
set role authenticated;
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
do $$ begin perform public.reactor_pay(90); raise notice 'FAIL a non-member was paid'; exception when raise_exception then raise notice 'PASS members only'; end $$;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false); select public.join_world('letmein');
select set_config('test.r', public.reactor_pay(90)::text, false);
select pg_temp.ok('90% grid pays 4 (1 + 90/25)', (current_setting('test.r')::jsonb->>'paid')::int = 4 and (current_setting('test.r')::jsonb->>'tokens')::int = 4);
do $$ begin perform public.reactor_pay(90); raise notice 'FAIL paid twice in one shift'; exception when raise_exception then raise notice 'PASS once a shift: %', sqlerrm; end $$;
do $$ begin insert into private.reactor_pays (user_id, score, paid) values ('aaaaaaaa-0000-0000-0000-000000000001', 100, 5); raise notice 'FAIL player wrote a pay'; exception when insufficient_privilege then raise notice 'PASS pay records are server-only'; end $$;
reset role; select pg_temp.cool(); set role authenticated;
select pg_temp.ok('under 40% pays nothing (still counts as a shift)', (public.reactor_pay(39)->>'paid')::int = 0);
reset role; select pg_temp.cool(); set role authenticated;
select pg_temp.ok('a score over 100 is held to 100: pays 5', (public.reactor_pay(5000)->>'paid')::int = 5);
select pg_temp.ok('zero pays nothing', (public.reactor_pay(0)->>'paid')::int = 0);
reset role;
select pg_temp.ok('...and records nothing', (select count(*) from private.reactor_pays where score = 0) = 0);
-- (the long run goes as the owner, with the same player id: the function's rules are the same)
do $$ declare k int; begin for k in 1..6 loop perform pg_temp.cool(); perform public.reactor_pay(100); end loop; end $$;
select pg_temp.ok('no more than 15 a day', (select sum(paid) from private.reactor_pays where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 15);
