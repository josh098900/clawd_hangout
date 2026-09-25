\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001');
select public.set_invite_code('letmein');
select pg_temp.ok('kart + tank quests in the pool', (select count(*) from private.quest_pool where id in ('kart', 'tank')) = 2);
select pg_temp.ok('racer + ace badges listed', (select count(*) from private.badge_list where id in ('racer', 'ace')) = 2);
set role authenticated; select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false); select public.join_world('letmein');
select pg_temp.ok('claim SPEED DEMON', public.claim_badge('racer'));
select pg_temp.ok('claim TANK ACE', public.claim_badge('ace'));
reset role;
-- a day whose quests include the kart race can be handed in
insert into private.quest_days (day, quests) values (private.quest_day(), array['kart', 'tank', 'diner']) on conflict (day) do update set quests = excluded.quests;
set role authenticated; select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_temp.ok('hand in the kart quest: +5', (public.complete_quest('kart')->>'tokens')::int = 5);
reset role;
