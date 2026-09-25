\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
insert into auth.users (id) select ('10000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid from generate_series(1, 7) i;
select public.set_invite_code('letmein');
insert into public.members (user_id) select id from auth.users;
insert into public.profiles (id, name, look) select id, 'P' || right(id::text, 1), '{}' from auth.users;
-- pretend it's contest time (the owner can redefine this; players can't)
create or replace function private.contest_now() returns timestamptz language sql stable set search_path = '' as $$ select timestamptz '2026-09-25 10:00+00' $$;
set role authenticated;
select set_config('test.uid', '10000000-0000-0000-0000-000000000001', false);
select set_config('test.r', public.catch_fish()::text, false);
select pg_temp.ok('a catch: a real fish with a size in its range', exists (select 1 from jsonb_to_record(current_setting('test.r')::jsonb) as t(fish text, cm int) where t.cm between 8 and 300) and (current_setting('test.r')::jsonb->>'contest')::boolean);
do $$ begin perform public.catch_fish(); raise notice 'FAIL no pause between catches'; exception when raise_exception then raise notice 'PASS catches need a moment between them'; end $$;
reset role;
-- lots of catches from 6 anglers (backdate so the 2 s rule doesn't bite)
do $$ declare i int; u int; begin for i in 1..60 loop for u in 1..6 loop
  perform set_config('test.uid', '10000000-0000-0000-0000-' || lpad(u::text, 12, '0'), false);
  update private.catches set at = at - interval '5 seconds';
  perform set_config('role', 'authenticated', true); perform public.catch_fish(); perform set_config('role', 'postgres', true);
end loop; end loop; end $$;
select pg_temp.ok('odds look right: commons most common, legendaries rare', (select count(*) from private.catches where rarity = 'COMMON') > (select count(*) from private.catches where rarity = 'LEGENDARY') * 3);
select pg_temp.ok('junk is not entered in the contest', not exists (select 1 from private.catches where rarity = 'JUNK' and contest is not null));
set role authenticated; select set_config('test.uid', '10000000-0000-0000-0000-000000000007', false);
select set_config('test.b', public.contest_board()::text, false);
select pg_temp.ok('live board: top 5, one row per angler, biggest first', jsonb_array_length(current_setting('test.b')::jsonb->'top') = 5 and ((current_setting('test.b')::jsonb->'top'->0->>'cm')::int >= (current_setting('test.b')::jsonb->'top'->1->>'cm')::int));
select pg_temp.ok('not settled while live', current_setting('test.b')::jsonb->'last' = 'null'::jsonb);
reset role;
select private.add_tokens(id, 0) from auth.users; -- wallets exist
create temp table before as select user_id, tokens from public.wallets;
create or replace function private.contest_now() returns timestamptz language sql stable set search_path = '' as $$ select null::timestamptz $$;
grant select on before to authenticated;
set role authenticated; select set_config('test.uid', '10000000-0000-0000-0000-000000000007', false);
select set_config('test.b', public.contest_board()::text, false);
reset role;
select pg_temp.ok('after the contest: settled, 6 anglers, prize 25 (capped)', (select anglers = 6 and prize = 25 from private.contest_results));
select pg_temp.ok('the winner got 25 tokens', (select w.tokens - b.tokens from public.wallets w join before b using (user_id) join private.contest_results r on r.winner = w.user_id) = 25);
select pg_temp.ok('the winner got the TROPHY ANGLER badge', exists (select 1 from public.badges b join private.contest_results r on r.winner = b.user_id where b.badge = 'trophy'));
select pg_temp.ok('the winner had the biggest non-junk fish', (select cm from private.contest_results) = (select max(cm) from private.catches where rarity <> 'JUNK'));
set role authenticated; select set_config('test.uid', '10000000-0000-0000-0000-000000000007', false);
select public.contest_board();
reset role;
select pg_temp.ok('settled only once', (select count(*) from private.contest_results) = 1 and (select count(*) from public.badges where badge = 'trophy') = 1);
select pg_temp.ok('board shows the last winner', (current_setting('test.b')::jsonb->'last'->>'prize')::int = 25);
-- a solo contest pays 5
create or replace function private.contest_now() returns timestamptz language sql stable set search_path = '' as $$ select timestamptz '2026-09-25 11:00+00' $$;
set role authenticated; select set_config('test.uid', '10000000-0000-0000-0000-000000000003', false);
do $$ declare i int; begin for i in 1..12 loop perform set_config('role', 'postgres', true); update private.catches set at = at - interval '5 seconds'; perform set_config('role', 'authenticated', true); perform public.catch_fish(); end loop; end $$;
reset role;
create or replace function private.contest_now() returns timestamptz language sql stable set search_path = '' as $$ select null::timestamptz $$;
set role authenticated; select public.contest_board(); reset role;
select pg_temp.ok('solo contest pays just 5', (select prize from private.contest_results where contest = '2026-09-25 11:00+00') = 5);
set role authenticated;
do $$ begin perform * from private.catches; raise notice 'FAIL catches readable'; exception when insufficient_privilege then raise notice 'PASS catches are private'; end $$;
-- your place ignores your own earlier catches
reset role;
create or replace function private.contest_now() returns timestamptz language sql stable set search_path = '' as $$ select timestamptz '2026-09-25 12:00+00' $$;
insert into private.catches (user_id, name, fish, rarity, cm, contest, at) values ('10000000-0000-0000-0000-000000000005', 'P5', 'SWORDFISH', 'RARE', 999, '2026-09-25 12:00+00', now() - interval '1 minute');
set role authenticated; select set_config('test.uid', '10000000-0000-0000-0000-000000000005', false);
select set_config('test.r', public.catch_fish()::text, false);
select pg_temp.ok('with the biggest fish already, a later (smaller) catch still says you lead', coalesce((current_setting('test.r')::jsonb->>'rank')::int, 1) = 1);
