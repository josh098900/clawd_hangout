-- Lab Hangout: garden plots on the Rooftop. Run after 0007_halloween.sql. Safe to re-run.
--
-- 8 beds per server. Plant a seed (tokens) in a free bed; one plant per player at a time. It grows
-- in real time on the SERVER's clock: a plant's growth is credited lazily from (grown, calc_at,
-- last_water) whenever someone waters or harvests it, and the game draws it with the same sums.
--   * Watering: anyone can water any plant, once per 30 min per plant. Growth runs 25% faster for
--     3 hours after a watering. Watering someone else's plant thanks you with 1 token (once per
--     plant per day, 5 a day at most).
--   * No water for 24 h: it wilts and stops growing (watering revives it). 72 h: it dies, and the
--     bed is free again.
--   * Harvest when ripe: tokens by seed, and a 1 in 10 chance of a rare MOONFLOWER seed.
-- Seeds must match SEEDS in src/world/garden.ts.

create table if not exists private.seeds (id integer primary key, name text not null, cost integer not null, grow_s integer not null, pays integer not null);
alter table private.seeds enable row level security;
insert into private.seeds (id, name, cost, grow_s, pays) values
  (0, 'RADISH', 2, 3600, 4), (1, 'SUNFLOWER', 3, 10800, 7), (2, 'TOMATO', 4, 21600, 10), (3, 'PUMPKIN', 5, 43200, 15),
  (4, 'MOONFLOWER', 0, 28800, 25) -- can't be bought: found when harvesting (inventory item 'seed:4')
on conflict (id) do update set name = excluded.name, cost = excluded.cost, grow_s = excluded.grow_s, pays = excluded.pays;

create table if not exists public.plots (
  server text not null references private.servers (id) on delete cascade,
  bed integer not null check (bed between 0 and 7),
  owner uuid not null references auth.users (id) on delete cascade,
  owner_name text not null default '',
  seed integer not null references private.seeds (id),
  planted_at timestamptz not null default now(),
  last_water timestamptz not null default now(),
  grown double precision not null default 0,     -- seconds of growth credited up to calc_at
  calc_at timestamptz not null default now(),
  primary key (server, bed)
);
create unique index if not exists plots_one_per_owner on public.plots (owner);
alter table public.plots enable row level security;
drop policy if exists "plots: members read" on public.plots;
create policy "plots: members read" on public.plots for select to authenticated using ((select public.is_member()));
revoke all on public.plots from anon, authenticated;
grant select on public.plots to authenticated;

create table if not exists private.water_log (user_id uuid not null, at timestamptz not null default now());
create index if not exists water_log_user_at on private.water_log (user_id, at);
create table if not exists private.water_thanks (user_id uuid not null, day date not null, plant text not null, primary key (user_id, day, plant));
alter table private.water_log enable row level security;
alter table private.water_thanks enable row level security;

/** Seconds of growth a plant has at time `at` (it only grows while not wilted; watered = 1.25x for 3 h). */
create or replace function private.growth(grown double precision, calc_at timestamptz, last_water timestamptz, at timestamptz) returns double precision
language sql immutable set search_path = '' as $$
  select grown
    + greatest(0, extract(epoch from (least(at, last_water + interval '24 hours') - calc_at)))
    + 0.25 * greatest(0, extract(epoch from (least(at, last_water + interval '3 hours') - calc_at)));
$$;
revoke execute on function private.growth(double precision, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;

/** Plant `seed` in bed `bed` of the server you're on. Returns your token balance. */
create or replace function public.plant(bed integer, seed integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); srv text := public.my_server(); s private.seeds; p public.plots; bal integer; nm text;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if srv is null then raise exception 'you are not on a server (reload to pick one)'; end if;
  if bed is null or bed < 0 or bed > 7 then raise exception 'no such bed'; end if;
  select * into s from private.seeds x where x.id = seed;
  if s.id is null then raise exception 'no such seed'; end if;
  -- dead plants (72 h without water) free their bed, and their owner
  delete from public.plots x where x.last_water < now() - interval '72 hours' and ((x.server = srv and x.bed = plant.bed) or x.owner = uid);
  select * into p from public.plots x where x.owner = uid;
  if p.owner is not null then raise exception 'you already have a plant growing (% bed % on %)', (select v.name from private.seeds v where v.id = p.seed), p.bed + 1, p.server; end if;
  if exists (select 1 from public.plots x where x.server = srv and x.bed = plant.bed) then raise exception 'that bed is taken'; end if;
  if s.id = 4 then
    delete from public.inventory i where i.user_id = uid and i.item = 'seed:4';
    if not found then raise exception 'you have no moonflower seed'; end if;
    bal := public.my_tokens();
  else
    select w.tokens into bal from public.wallets w where w.user_id = uid for update;
    if coalesce(bal, 0) < s.cost then raise exception 'a % seed costs % tokens', s.name, s.cost; end if;
    bal := private.add_tokens(uid, -s.cost);
  end if;
  select coalesce(nullif(pr.name, ''), 'SOMEONE') into nm from public.profiles pr where pr.id = uid;
  insert into public.plots (server, bed, owner, owner_name, seed) values (srv, plant.bed, uid, coalesce(nm, 'SOMEONE'), plant.seed);
  return bal;
end $$;

/**
 * Water the plant in bed `bed` on your server. Returns { tokens, thanked } (thanked = you got a
 * token for watering someone else's plant).
 */
create or replace function public.water(bed integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); srv text := public.my_server(); p public.plots; key text; thanked boolean := false; bal integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if srv is null then raise exception 'you are not on a server (reload to pick one)'; end if;
  select * into p from public.plots x where x.server = srv and x.bed = water.bed for update;
  if p.owner is null or p.last_water < now() - interval '72 hours' then raise exception 'nothing growing there'; end if;
  if p.last_water > now() - interval '30 minutes' then raise exception 'it is still wet: water it again in % min', ceil(extract(epoch from (p.last_water + interval '30 minutes' - now())) / 60); end if;
  if (select count(*) from private.water_log w where w.user_id = uid and w.at > now() - interval '1 hour') >= 30 then raise exception 'your watering can is empty, try again later'; end if;
  insert into private.water_log (user_id) values (uid);
  update public.plots x set grown = private.growth(p.grown, p.calc_at, p.last_water, now()), calc_at = now(), last_water = now()
   where x.server = srv and x.bed = water.bed;
  if p.owner <> uid then
    key := srv || ':' || p.bed || ':' || extract(epoch from p.planted_at)::bigint;
    if (select count(*) from private.water_thanks t where t.user_id = uid and t.day = current_date) < 5 then
      insert into private.water_thanks (user_id, day, plant) values (uid, current_date, key) on conflict do nothing;
      thanked := found;
    end if;
  end if;
  if thanked then bal := private.add_tokens(uid, 1); else bal := public.my_tokens(); end if;
  return jsonb_build_object('tokens', bal, 'thanked', thanked);
end $$;

/** Harvest your ripe plant. Returns { tokens, seed, bonus } (bonus = 'seed:4' if you found a moonflower seed). */
create or replace function public.harvest(bed integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); srv text := public.my_server(); p public.plots; s private.seeds; bal integer; bonus text;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  select * into p from public.plots x where x.server = srv and x.bed = harvest.bed for update;
  if p.owner is null then raise exception 'nothing growing there'; end if;
  if p.owner <> uid then raise exception 'that is not your plant'; end if;
  if p.last_water < now() - interval '72 hours' then delete from public.plots x where x.server = srv and x.bed = harvest.bed; raise exception 'it died of thirst, sorry. the bed is free again'; end if;
  select * into s from private.seeds x where x.id = p.seed;
  if private.growth(p.grown, p.calc_at, p.last_water, now()) < s.grow_s then raise exception 'not ripe yet'; end if;
  delete from public.plots x where x.server = srv and x.bed = harvest.bed;
  bal := private.add_tokens(uid, s.pays);
  if random() < 0.1 and not exists (select 1 from public.inventory i where i.user_id = uid and i.item = 'seed:4') then
    insert into public.inventory (user_id, item) values (uid, 'seed:4'); bonus := 'seed:4';
  end if;
  return jsonb_build_object('tokens', bal, 'seed', p.seed, 'bonus', bonus);
end $$;

/** Pull up your own plant (to start again). */
create or replace function public.dig_up(bed integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  delete from public.plots x where x.server = public.my_server() and x.bed = dig_up.bed and x.owner = auth.uid();
  if not found then raise exception 'that is not your plant'; end if;
end $$;

revoke execute on function public.plant(integer, integer), public.water(integer), public.harvest(integer), public.dig_up(integer) from public, anon;
grant execute on function public.plant(integer, integer), public.water(integer), public.harvest(integer), public.dig_up(integer) to authenticated;
