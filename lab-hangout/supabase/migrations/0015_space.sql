-- Lab Hangout: the Space Station. Run after 0014_apartments.sql. Safe to re-run.
--
-- The rocket, the station and the spacewalk run on the wall clock in the players' browsers (like
-- the subway), so the server only keeps what's worth tokens:
--   * The station's hydroponic trays: 6 per server, one STAR MELON per player at a time. 3 tokens to
--     plant; it's ripe 30 min later (the server's clock); the harvest pays 5 tokens and a COMET BLOOM
--     seed for the Rooftop garden (inventory 'seed:5', unless you're already holding one). A ripe
--     melon left for a day goes off and frees its tray.
--   * The COMET BLOOM (seed 5): found, never bought; grows in 6 h on the roof and pays 20.
--     plant() now takes any found seed out of your inventory (the moonflower 'seed:4' as before).
--   * Spacewalk pay: 1 token per 8 stardust points, at most 4 a walk, one walk a minute, 12 a day.
--     (The game can't prove what you picked up, so the caps keep it small, like the Diner's tips.)
--   * Three quests (fly to the station, a spacewalk, spot a comet) and the ASTRONAUT badge.
-- Keep these in step with src/world/station.ts (TRAY_*), src/world/garden.ts (SEEDS),
-- payWalk in src/main.ts (walk pay) and QUESTS / BADGES in src/game/quests.ts.

insert into private.seeds (id, name, cost, grow_s, pays) values (5, 'COMET BLOOM', 0, 21600, 20)
on conflict (id) do update set name = excluded.name, cost = excluded.cost, grow_s = excluded.grow_s, pays = excluded.pays;

/** Plant `seed` in bed `bed` of the server you're on. Returns your token balance. (Found seeds come out of your inventory.) */
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
  if s.cost = 0 then -- a found seed (moonflower, comet bloom)
    delete from public.inventory i where i.user_id = uid and i.item = 'seed:' || s.id;
    if not found then raise exception 'you have no % seed', lower(s.name); end if;
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
revoke execute on function public.plant(integer, integer) from public, anon;
grant execute on function public.plant(integer, integer) to authenticated;

-- ---------- the hydroponic trays ----------
create table if not exists public.space_trays (
  server text not null references private.servers (id) on delete cascade,
  tray integer not null check (tray between 0 and 5),
  owner uuid not null references auth.users (id) on delete cascade,
  owner_name text not null default '',
  planted_at timestamptz not null default now(),
  primary key (server, tray)
);
create unique index if not exists space_trays_one_per_owner on public.space_trays (owner);
alter table public.space_trays enable row level security;
drop policy if exists "space_trays: members read" on public.space_trays;
create policy "space_trays: members read" on public.space_trays for select to authenticated using ((select public.is_member()));
revoke all on public.space_trays from anon, authenticated;
grant select on public.space_trays to authenticated;

/** Plant a STAR MELON in tray `tray` of the station on your server (3 tokens). Returns your balance. */
create or replace function public.space_plant(tray integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); srv text := public.my_server(); mine public.space_trays; bal integer; nm text;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if srv is null then raise exception 'you are not on a server (reload to pick one)'; end if;
  if tray is null or tray < 0 or tray > 5 then raise exception 'no such tray'; end if;
  -- melons left ripe for a day have gone off: they free their tray, and their owner
  delete from public.space_trays x where x.planted_at < now() - interval '1470 minutes' and ((x.server = srv and x.tray = space_plant.tray) or x.owner = uid);
  select * into mine from public.space_trays x where x.owner = uid;
  if mine.owner is not null then raise exception 'you already have a star melon growing (tray % on %)', mine.tray + 1, mine.server; end if;
  if exists (select 1 from public.space_trays x where x.server = srv and x.tray = space_plant.tray) then raise exception 'that tray is taken'; end if;
  select w.tokens into bal from public.wallets w where w.user_id = uid for update;
  if coalesce(bal, 0) < 3 then raise exception 'a star melon seed costs 3 tokens'; end if;
  bal := private.add_tokens(uid, -3);
  select coalesce(nullif(pr.name, ''), 'SOMEONE') into nm from public.profiles pr where pr.id = uid;
  insert into public.space_trays (server, tray, owner, owner_name) values (srv, space_plant.tray, uid, coalesce(nm, 'SOMEONE'));
  return bal;
end $$;

/** Harvest your ripe star melon. Returns { tokens, bonus } (bonus = 'seed:5', a comet bloom seed, or null), or { tokens, rotten: true } if it went off. */
create or replace function public.space_harvest(tray integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); srv text := public.my_server(); p public.space_trays; bal integer; bonus text;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  select * into p from public.space_trays x where x.server = srv and x.tray = space_harvest.tray for update;
  if p.owner is null then raise exception 'nothing growing there'; end if;
  if p.owner <> uid then raise exception 'that is not your melon'; end if;
  if p.planted_at > now() - interval '30 minutes' then raise exception 'not ripe yet'; end if;
  delete from public.space_trays x where x.server = srv and x.tray = space_harvest.tray;
  if p.planted_at < now() - interval '1470 minutes' then return jsonb_build_object('tokens', public.my_tokens(), 'rotten', true); end if;
  bal := private.add_tokens(uid, 5);
  if not exists (select 1 from public.inventory i where i.user_id = uid and i.item = 'seed:5') then
    insert into public.inventory (user_id, item) values (uid, 'seed:5'); bonus := 'seed:5';
  end if;
  return jsonb_build_object('tokens', bal, 'bonus', bonus);
end $$;

/** Pull up your own melon (to start again). */
create or replace function public.space_dig_up(tray integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  delete from public.space_trays x where x.server = public.my_server() and x.tray = space_dig_up.tray and x.owner = auth.uid();
  if not found then raise exception 'that is not your melon'; end if;
end $$;

revoke execute on function public.space_plant(integer), public.space_harvest(integer), public.space_dig_up(integer) from public, anon;
grant execute on function public.space_plant(integer), public.space_harvest(integer), public.space_dig_up(integer) to authenticated;

-- ---------- spacewalk pay ----------
create table if not exists private.spacewalks (user_id uuid not null, at timestamptz not null default now(), pts integer not null, paid integer not null);
create index if not exists spacewalks_user_at on private.spacewalks (user_id, at);
alter table private.spacewalks enable row level security;

/** Pay for the stardust you brought back in: 1 token per 8 points, 4 a walk, 12 a day. Returns { tokens, paid }. */
create or replace function public.spacewalk_pay(pts integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); today integer; paid integer; bal integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if pts is null or pts <= 0 then return jsonb_build_object('tokens', public.my_tokens(), 'paid', 0); end if;
  perform pg_advisory_xact_lock(hashtext('spacewalk:' || uid::text));
  if exists (select 1 from private.spacewalks w where w.user_id = uid and w.at > now() - interval '60 seconds') then raise exception 'one spacewalk a minute'; end if;
  select coalesce(sum(w.paid), 0) into today from private.spacewalks w where w.user_id = uid and w.at >= (now() at time zone 'utc')::date::timestamp at time zone 'utc';
  paid := greatest(0, least(4, least(pts, 100000) / 8, 12 - today));
  insert into private.spacewalks (user_id, pts, paid) values (uid, least(pts, 100000), paid);
  if paid > 0 then bal := private.add_tokens(uid, paid); else bal := public.my_tokens(); end if;
  return jsonb_build_object('tokens', bal, 'paid', paid);
end $$;
revoke execute on function public.spacewalk_pay(integer) from public, anon;
grant execute on function public.spacewalk_pay(integer) to authenticated;

-- ---------- quests + badge ----------
insert into private.quest_pool (id, weight, checked) values ('launch', 1, false), ('spacewalk', 1, false), ('comet', 0.8, false)
on conflict (id) do update set weight = excluded.weight, checked = excluded.checked;
insert into private.badge_list (id) values ('astronaut') on conflict do nothing;
