-- Lab Hangout: shared weather and group dances. Run after 0010_fishing.sql. Safe to re-run.
--
-- The weather is worked out from the clock, so everyone gets the same sky with no messages:
-- every 15 minutes (UTC) is one "slot", and an integer hash of the slot number picks its weather
-- (clear, rain, storm or fog; rain and storms fall as snow in the winter season). The game does
-- the same sums in src/world/weather.ts: keep roll() and kind() there in step with this file.
--
-- The one thing the server needs it for: rain waters the Rooftop gardens. While it's raining, the
-- first player online (any server) to call rain_water() waters every plant that's dry (not watered
-- for 30 min) and not dead. Nobody gets the watering thanks token for rain.
--
-- Also: the 'crew' daily quest (join a group dance) and two badges the game awards (DANCE CREW,
-- STORM CHASER). Keep these in step with QUESTS and BADGES in src/game/quests.ts.

/** 0..999 for weather slot `slot` (a 32-bit integer mix; the game's roll() gives the same number). */
create or replace function private.weather_roll(slot bigint) returns integer
language plpgsql immutable set search_path = '' as $$
declare h bigint := slot % 4294967296;
begin
  h := ((h # (h >> 16)) * 73244475) % 4294967296;
  h := ((h # (h >> 16)) * 73244475) % 4294967296;
  return ((h # (h >> 16)) % 1000)::integer;
end $$;
revoke execute on function private.weather_roll(bigint) from public, anon, authenticated;

/** The weather at `at`: 'clear', 'rain', 'storm', 'fog' or 'snow'. */
create or replace function private.weather(at timestamptz default now()) returns text
language plpgsql stable set search_path = '' as $$
declare n integer := private.weather_roll(floor(extract(epoch from at) / 900)::bigint); k text;
begin
  k := case when n < 450 then 'clear' when n < 700 then 'rain' when n < 830 then 'storm' else 'fog' end;
  if k in ('rain', 'storm') and private.season() = 'winter' then k := 'snow'; end if;
  return k;
end $$;
revoke execute on function private.weather(timestamptz) from public, anon, authenticated;

/** It's raining: water every dry, living plant on every server. Returns how many got watered (0 if it isn't raining). */
create or replace function public.rain_water() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if private.weather() not in ('rain', 'storm') then return 0; end if;
  update public.plots x set grown = private.growth(x.grown, x.calc_at, x.last_water, now()), calc_at = now(), last_water = now()
   where x.last_water < now() - interval '30 minutes' and x.last_water >= now() - interval '72 hours';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.rain_water() from public, anon;
grant execute on function public.rain_water() to authenticated;

insert into private.quest_pool (id, weight, checked) values ('crew', 0.8, false)
on conflict (id) do update set weight = excluded.weight, checked = excluded.checked;
insert into private.badge_list (id) values ('crew'), ('storm') on conflict do nothing;
