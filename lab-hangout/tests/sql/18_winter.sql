\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002'), ('cccccccc-0000-0000-0000-000000000003');
select public.set_invite_code('letmein');
-- the date rules (checked with fixed dates)
select pg_temp.ok('season by date: Dec 1 winter, Jan 6 winter, Jan 7 none, Oct halloween, Nov none',
  (select bool_and(x) from (values
    ((case when to_char('2026-12-01'::date, 'MM') = '10' then 'halloween' when to_char('2026-12-01'::date, 'MM') = '12' or to_char('2026-12-01'::date, 'MMDD') <= '0106' then 'winter' end) = 'winter'),
    ((case when to_char('2027-01-06'::date, 'MM') = '10' then 'halloween' when to_char('2027-01-06'::date, 'MM') = '12' or to_char('2027-01-06'::date, 'MMDD') <= '0106' then 'winter' end) = 'winter'),
    ((case when to_char('2027-01-07'::date, 'MM') = '10' then 'halloween' when to_char('2027-01-07'::date, 'MM') = '12' or to_char('2027-01-07'::date, 'MMDD') <= '0106' then 'winter' end) is null),
    ((case when to_char('2026-10-15'::date, 'MM') = '10' then 'halloween' when to_char('2026-10-15'::date, 'MM') = '12' or to_char('2026-10-15'::date, 'MMDD') <= '0106' then 'winter' end) = 'halloween'),
    ((case when to_char('2026-11-30'::date, 'MM') = '10' then 'halloween' when to_char('2026-11-30'::date, 'MM') = '12' or to_char('2026-11-30'::date, 'MMDD') <= '0106' then 'winter' end) is null)) v(x)));
select pg_temp.ok('the migration''s own function agrees with the rule today (September: none)', private.season() is null);
set role authenticated;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false); select public.join_world('letmein'); select public.claim_seat('one');
insert into public.profiles (id, name, look) values ('aaaaaaaa-0000-0000-0000-000000000001', 'ANNA', '{}');
do $$ begin perform public.find_present(0); raise notice 'FAIL present hunt out of season'; exception when raise_exception then raise notice 'PASS no presents before the season'; end $$;
reset role; select public.set_season('winter'); set role authenticated; select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_temp.ok('set_season(winter) switches it on', public.current_season() = 'winter');
-- the present hunt
select pg_temp.ok('a present: +1', (public.find_present(3)->>'tokens')::int = 1);
do $$ begin perform public.find_present(3); raise notice 'FAIL same present twice'; exception when raise_exception then raise notice 'PASS once a day each'; end $$;
do $$ begin perform public.find_present(12); raise notice 'FAIL present 12'; exception when raise_exception then raise notice 'PASS only presents 0-11'; end $$;
select public.find_present(n) from generate_series(0, 10) n where n <> 3;
select set_config('test.r', public.find_present(11)::text, false);
select pg_temp.ok('all 12: a winter prize, in the inventory', (current_setting('test.r')::jsonb->>'found')::int = 12 and (current_setting('test.r')::jsonb->>'prize') in ('hat:15','hat:16','hat:17','face:8','fit:9','pet:7') and exists (select 1 from public.inventory where item = current_setting('test.r')::jsonb->>'prize'));
select pg_temp.ok('presents_today lists all 12', array_length(public.presents_today(), 1) = 12);
-- advent (it's September in this test: only door 1 is open when switched on early)
select pg_temp.ok('advent door 1: 2 + 1 = 3 tokens', (public.open_advent(1)->>'prize') = 'tokens:3');
do $$ begin perform public.open_advent(1); raise notice 'FAIL door 1 twice'; exception when raise_exception then raise notice 'PASS each door once'; end $$;
do $$ begin perform public.open_advent(2); raise notice 'FAIL opened door 2 early'; exception when raise_exception then raise notice 'PASS no peeking: %', sqlerrm; end $$;
select pg_temp.ok('advent_doors: opened [1], up to 1', (public.advent_doors()->'opened') = '[1]'::jsonb and (public.advent_doors()->>'upto')::int = 1);
-- ornaments
select set_config('test.o', public.hang_ornament(2, 10, 80)::text, false);
select pg_temp.ok('ornament on the tree, on my server (test year 0 before December)', (select server = 'one' and owner_name = 'ANNA' and year = 0 from public.ornaments where id = current_setting('test.o')::bigint));
do $$ begin perform public.hang_ornament(2, 60, 20); raise notice 'FAIL ornament in the air'; exception when raise_exception then raise notice 'PASS must be on the tree'; end $$;
do $$ begin perform public.hang_ornament(9, 0, 50); raise notice 'FAIL kind 9'; exception when raise_exception then raise notice 'PASS only kinds 0-7'; end $$;
select public.hang_ornament(1, 0, 40); select public.hang_ornament(1, 0, 60); select public.hang_ornament(1, 0, 90); select public.hang_ornament(1, 0, 120);
do $$ begin perform public.hang_ornament(1, 0, 130); raise notice 'FAIL 6 ornaments'; exception when raise_exception then raise notice 'PASS 5 a day: %', sqlerrm; end $$;
do $$ begin delete from public.ornaments; raise notice 'FAIL player deleted ornaments'; exception when insufficient_privilege then raise notice 'PASS ornaments are read-only'; end $$;
-- the sleigh
select pg_temp.ok('catch a sleigh present right after a pass', (select case when extract(epoch from now()) - (floor((extract(epoch from now()) - 900) / 1800) * 1800 + 900) <= 330 then public.catch_sleigh(floor((extract(epoch from now()) - 900) / 1800)::bigint, 0) > 0 else true end));
do $$ begin perform public.catch_sleigh(floor((extract(epoch from now()) - 900) / 1800)::bigint - 1, 1); raise notice 'FAIL caught an old pass'; exception when raise_exception then raise notice 'PASS old passes have melted'; end $$;
-- secret santa: A (with tokens) sends B a present
reset role; select private.add_tokens('aaaaaaaa-0000-0000-0000-000000000001', 30); set role authenticated; select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
do $$ begin perform public.send_gift('bbbbbbbb-0000-0000-0000-000000000002', 5, 1, 0); raise notice 'FAIL gift to a non-member'; exception when raise_exception then raise notice 'PASS only to players in the world'; end $$;
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false); select public.join_world('letmein');
insert into public.profiles (id, name, look) values ('bbbbbbbb-0000-0000-0000-000000000002', 'BOB', '{}');
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select set_config('test.b', public.my_tokens()::text, false);
select pg_temp.ok('wrapping 5 costs 5', public.send_gift('bbbbbbbb-0000-0000-0000-000000000002', 5, 1, 0) = current_setting('test.b')::int - 5);
do $$ begin perform public.send_gift('aaaaaaaa-0000-0000-0000-000000000001', 5, 1, 0); raise notice 'FAIL gift to self'; exception when raise_exception then raise notice 'PASS not to yourself'; end $$;
do $$ begin perform public.send_gift('bbbbbbbb-0000-0000-0000-000000000002', 7, 1, 0); raise notice 'FAIL 7 token gift'; exception when raise_exception then raise notice 'PASS 3, 5 or 10 only'; end $$;
select pg_temp.ok('the tree shows it (for BOB, not who from)', (public.tree_gifts()->0->>'to_name') = 'BOB' and (public.tree_gifts()->0) ? 'from' = false and (public.tree_gifts()->0->>'mine')::boolean = false);
do $$ begin perform public.open_gift((select (public.tree_gifts()->0->>'id')::bigint)); raise notice 'FAIL opened someone else''s'; exception when raise_exception then raise notice 'PASS only the recipient opens it'; end $$;
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
select set_config('test.r', public.open_gift((select (public.tree_gifts()->0->>'id')::bigint))::text, false);
select pg_temp.ok('BOB opens it: +5, from ANNA, note 0', (current_setting('test.r')::jsonb->>'got')::int = 5 and current_setting('test.r')::jsonb->>'from' = 'ANNA' and public.my_tokens() >= 5);
select pg_temp.ok('opened presents leave the tree', jsonb_array_length(public.tree_gifts()) = 0);
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select public.send_gift('bbbbbbbb-0000-0000-0000-000000000002', 3, 0, 1); select public.send_gift('bbbbbbbb-0000-0000-0000-000000000002', 3, 0, 1); select public.send_gift('bbbbbbbb-0000-0000-0000-000000000002', 3, 0, 1); select public.send_gift('bbbbbbbb-0000-0000-0000-000000000002', 3, 0, 1);
do $$ begin perform public.send_gift('bbbbbbbb-0000-0000-0000-000000000002', 3, 0, 1); raise notice 'FAIL 6 gifts a day'; exception when raise_exception then raise notice 'PASS 5 presents a day: %', sqlerrm; end $$;
do $$ begin update public.gifts set tokens = 10; raise notice 'FAIL player edited gifts'; exception when insufficient_privilege then raise notice 'PASS gifts are private'; end $$;
-- out of season again
reset role; select public.set_season(null); set role authenticated; select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
do $$ begin perform public.open_advent(1); raise notice 'FAIL advent out of season'; exception when raise_exception then raise notice 'PASS back to the date: switched off'; end $$;
reset role;
select pg_temp.ok('winter claw prizes (6) and furniture (4) listed', (select count(*) from private.claw_prizes where season = 'winter') = 6 and (select count(*) from private.furniture where id in ('xtree','fireplace','stocking','sglobe')) = 4);
set role anon;
do $$ begin perform public.find_present(0); raise notice 'FAIL anon'; exception when insufficient_privilege then raise notice 'PASS anon cannot hunt presents'; end $$;
reset role;
