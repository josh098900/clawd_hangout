\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002');
select public.set_invite_code('letmein');
select pg_temp.ok('the chem quest is in the pool', exists (select 1 from private.quest_pool where id = 'chem'));
select pg_temp.ok('...as an ordinary quest (the game says when it is done)', (select not checked from private.quest_pool where id = 'chem'));
select pg_temp.ok('the CHEMIST badge is on the list', exists (select 1 from private.badge_list where id = 'chemist'));
-- today's quests include it: handing it in pays like any other quest
insert into private.quest_days (day, quests) values (private.quest_day(), array['chem', 'reactor', 'marsh']) on conflict (day) do update set quests = excluded.quests;
set role authenticated;
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
do $$ begin perform public.claim_badge('chemist'); raise notice 'FAIL a non-member claimed a badge'; exception when raise_exception then raise notice 'PASS members only'; end $$;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false); select public.join_world('letmein');
select pg_temp.ok('brewing a potion hands in the quest: +5', (public.complete_quest('chem')->>'tokens')::int = 5);
do $$ begin perform public.complete_quest('chem'); raise notice 'FAIL handed in twice'; exception when raise_exception then raise notice 'PASS once a day'; end $$;
select pg_temp.ok('claiming CHEMIST gives it (the first time)', public.claim_badge('chemist'));
select pg_temp.ok('claiming it again is not new', not public.claim_badge('chemist'));
select pg_temp.ok('it shows on your card', exists (select 1 from public.badges where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and badge = 'chemist'));
do $$ begin perform public.claim_badge('chemistt'); raise notice 'FAIL a made-up badge was claimed'; exception when raise_exception then raise notice 'PASS made-up badges are refused'; end $$;
