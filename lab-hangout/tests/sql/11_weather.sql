\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
-- the hash must give exactly what the game's roll() gives (numbers from src/world/weather.ts)
select pg_temp.ok('weather_roll matches the game', private.weather_roll(0) = 0 and private.weather_roll(1) = 495 and private.weather_roll(2) = 72 and private.weather_roll(1966080) = 678 and private.weather_roll(1966081) = 860 and private.weather_roll(2000000) = 577 and private.weather_roll(4294967295) = 247);
select pg_temp.ok('slot 1966080 is rain, 1966081 fog, 2 clear', private.weather(to_timestamp(1966080 * 900 + 5)) = 'rain' and private.weather(to_timestamp(1966081 * 900 + 899)) = 'fog' and private.weather(to_timestamp(2 * 900)) = 'clear');
select pg_temp.ok('a mix over a day: some of each', (select count(distinct private.weather(now() + make_interval(mins => 15 * i))) from generate_series(0, 95) i) = 4);
select public.set_season('winter');
select pg_temp.ok('winter: rain falls as snow', private.weather(to_timestamp(1966080 * 900 + 5)) = 'snow');
select public.set_season(null);
-- players and plants
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002'), ('cccccccc-0000-0000-0000-000000000003');
select public.set_invite_code('letmein');
select private.add_tokens(id, 20) from auth.users;
set role authenticated;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false); select public.join_world('letmein'); select public.claim_seat('one'); select public.plant(0, 1);
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false); select public.join_world('letmein'); select public.claim_seat('two'); select public.plant(3, 2);
select set_config('test.uid', 'cccccccc-0000-0000-0000-000000000003', false); select public.join_world('letmein'); select public.claim_seat('one'); select public.plant(5, 0);
reset role;
update public.plots set last_water = now() - interval '5 hours', calc_at = now() - interval '5 hours' where bed = 0;   -- dry
update public.plots set last_water = now() - interval '26 hours', calc_at = now() - interval '26 hours' where bed = 3; -- wilted, other server
update public.plots set last_water = now() - interval '80 hours', calc_at = now() - interval '80 hours' where bed = 5; -- dead
create temp table before as select bed, private.growth(grown, calc_at, last_water, now()) g from public.plots;
grant select on before to authenticated;
-- not raining: nothing happens
create or replace function private.weather(at timestamptz default now()) returns text language sql stable set search_path = '' as $$ select 'clear' $$;
set role authenticated; select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_temp.ok('no rain, no watering', public.rain_water() = 0);
reset role;
create or replace function private.weather(at timestamptz default now()) returns text language sql stable set search_path = '' as $$ select 'storm' $$;
set role authenticated; select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_temp.ok('storm: waters the dry and the wilted plants, on every server (2)', public.rain_water() = 2);
select pg_temp.ok('again straight away: they are still wet (0)', public.rain_water() = 0);
reset role;
select pg_temp.ok('watered plants are wet now', (select bool_and(last_water > now() - interval '1 minute') from public.plots where bed in (0, 3)));
select pg_temp.ok('the dead plant stays dead', (select last_water < now() - interval '72 hours' from public.plots where bed = 5));
select pg_temp.ok('growth so far was credited, not lost', (select bool_and(private.growth(p.grown, p.calc_at, p.last_water, now()) >= b.g - 1) from public.plots p join before b using (bed)));
select pg_temp.ok('no thanks tokens for rain', (select count(*) from private.water_thanks) = 0 and (select sum(tokens) from public.wallets) = 60 - 3 - 4 - 2);
-- guests who aren't members can't
select set_config('test.uid', 'dddddddd-0000-0000-0000-000000000004', false);
insert into auth.users (id) values ('dddddddd-0000-0000-0000-000000000004');
set role authenticated;
do $$ begin perform public.rain_water(); raise notice 'FAIL non-member made it rain'; exception when raise_exception then raise notice 'PASS members only'; end $$;
reset role;
set role anon;
do $$ begin perform public.rain_water(); raise notice 'FAIL anon called rain_water'; exception when insufficient_privilege then raise notice 'PASS anon cannot call it'; end $$;
do $$ begin perform private.weather(); raise notice 'FAIL anon read private.weather'; exception when insufficient_privilege then raise notice 'PASS private.weather is private'; end $$;
reset role;
select pg_temp.ok('crew quest in the pool', exists (select 1 from private.quest_pool where id = 'crew'));
select pg_temp.ok('crew + storm badges listed', (select count(*) from private.badge_list where id in ('crew', 'storm')) = 2);
set role authenticated; select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_temp.ok('claim DANCE CREW', public.claim_badge('crew'));
reset role;
