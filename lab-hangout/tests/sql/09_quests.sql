\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002');
select public.set_invite_code('letmein');
set role authenticated;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false); select public.join_world('letmein');
select set_config('test.q', public.todays_quests()::text, false);
select pg_temp.ok('three quests today', jsonb_array_length(current_setting('test.q')::jsonb->'quests') = 3);
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false); select public.join_world('letmein');
select pg_temp.ok('the same three for everyone', (public.todays_quests()->'quests') = current_setting('test.q')::jsonb->'quests');
-- force a known set for the rest of the test
reset role; update private.quest_days set quests = array['coins', 'marsh', 'claw']; set role authenticated;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
do $$ begin perform public.complete_quest('kite'); raise notice 'FAIL handed in a quest that isn''t today''s'; exception when raise_exception then raise notice 'PASS only today''s quests'; end $$;
do $$ begin perform public.complete_quest('coins'); raise notice 'FAIL coins quest without coins'; exception when raise_exception then raise notice 'PASS server checks the coins quest'; end $$;
select public.claim_coin(0), public.claim_coin(1), public.claim_coin(2);
select pg_temp.ok('coins quest: 3 coins -> +5', (public.complete_quest('coins')->>'tokens')::int = 3 + 5);
do $$ begin perform public.complete_quest('coins'); raise notice 'FAIL twice'; exception when raise_exception then raise notice 'PASS once a day'; end $$;
select pg_temp.ok('an unchecked quest pays 5', (public.complete_quest('marsh')->>'tokens')::int = 13);
do $$ begin perform public.complete_quest('claw'); raise notice 'FAIL claw quest without playing'; exception when raise_exception then raise notice 'PASS server checks the claw quest'; end $$;
select public.play_claw();
select set_config('test.r', public.complete_quest('claw')::text, false);
select pg_temp.ok('third quest: +5 +10 bonus', (current_setting('test.r')::jsonb->>'bonus')::boolean and (current_setting('test.r')::jsonb->>'tokens')::int = 13 - 3 + 15);
select pg_temp.ok('done list', jsonb_array_length(public.todays_quests()->'done') = 3);
-- badges
select pg_temp.ok('game-earned badge (royal) claims', public.claim_badge('royal'));
select pg_temp.ok('claiming again: not new', not public.claim_badge('royal'));
do $$ begin perform public.claim_badge('green'); raise notice 'FAIL green thumb without harvests'; exception when raise_exception then raise notice 'PASS server checks GREEN THUMB'; end $$;
do $$ begin perform public.claim_badge('tycoon'); raise notice 'FAIL tycoon while poor'; exception when raise_exception then raise notice 'PASS server checks TYCOON'; end $$;
reset role; select private.add_tokens('aaaaaaaa-0000-0000-0000-000000000001', 100); insert into private.harvest_log (user_id, seed) select 'aaaaaaaa-0000-0000-0000-000000000001', 0 from generate_series(1, 10); set role authenticated; select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_temp.ok('TYCOON with 100+', public.claim_badge('tycoon'));
select pg_temp.ok('GREEN THUMB after 10 harvests', public.claim_badge('green'));
do $$ begin perform public.claim_badge('made-up'); raise notice 'FAIL made-up badge'; exception when raise_exception then raise notice 'PASS made-up badge refused'; end $$;
do $$ begin insert into public.badges (user_id, badge) values ('aaaaaaaa-0000-0000-0000-000000000001', 'champ'); raise notice 'FAIL wrote a badge directly'; exception when insufficient_privilege then raise notice 'PASS badges are read-only to players'; end $$;
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
select pg_temp.ok('others can see my badges', (select count(*) from public.badges where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 3);
-- harvest logs now
reset role; select private.add_tokens('bbbbbbbb-0000-0000-0000-000000000002', 10); set role authenticated; select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
select public.claim_seat('one'); select public.plant(0, 0);
reset role; update public.plots set grown = 99999; set role authenticated; select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
select public.harvest(0);
reset role; select pg_temp.ok('harvest is logged', (select count(*) from private.harvest_log where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 1);
