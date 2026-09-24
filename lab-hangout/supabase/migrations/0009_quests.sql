-- Lab Hangout: daily quests and badges. Run after 0008_gardens.sql. Safe to re-run.
--
-- Quests: each UTC day the server picks 3 quests from the pool (the same 3 for everyone, made
-- the first time anyone asks). The game counts your progress and calls complete_quest() when
-- you've done one: 5 tokens, and 10 more for doing all three. Quests the server can see for
-- itself are checked here (coins picked up, a claw play, watering someone's plant, a harvest);
-- the rest are small enough that faking them isn't worth much.
-- Badges: lifetime milestones anyone can see on your player card. The server checks the ones
-- it has records for (green, helper, quester, tycoon); the rest are earned in the game.
-- The pools must match QUESTS and BADGES in src/game/quests.ts.

create table if not exists private.quest_pool (id text primary key, weight real not null default 1, checked boolean not null default false);
insert into private.quest_pool (id, weight, checked) values
  ('marsh', 1, false), ('pong', 0.5, false), ('fish', 1, false), ('water', 1, true), ('ride', 1, false), ('claw', 1, true),
  ('coins', 1, true), ('harvest', 0.8, true), ('feed', 1, false), ('dance', 1, false), ('deploy', 1, false), ('kite', 1, false),
  ('boat', 1, false), ('slop', 0.7, false), ('party', 0.3, false), ('photo', 1, false), ('high5', 0.5, false), ('commit', 1, false), ('stars', 1, false)
on conflict (id) do update set weight = excluded.weight, checked = excluded.checked;
create table if not exists private.quest_days (day date primary key, quests text[] not null);
create table if not exists private.quest_done (user_id uuid not null, day date not null, quest text not null, at timestamptz not null default now(), primary key (user_id, day, quest));
create table if not exists private.harvest_log (user_id uuid not null, seed integer not null, at timestamptz not null default now());
create index if not exists harvest_log_user on private.harvest_log (user_id, at);
alter table private.quest_pool enable row level security;
alter table private.quest_days enable row level security;
alter table private.quest_done enable row level security;
alter table private.harvest_log enable row level security;

create or replace function private.quest_day() returns date language sql stable set search_path = '' as $$ select (now() at time zone 'utc')::date; $$;
revoke execute on function private.quest_day() from public, anon, authenticated;

/** Today's three quests (picked on first request), and which of them you've done. */
create or replace function public.todays_quests() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d date := private.quest_day(); qs text[]; done text[];
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  select q.quests into qs from private.quest_days q where q.day = d;
  if qs is null then
    insert into private.quest_days (day, quests)
      select d, array_agg(id) from (select p.id from private.quest_pool p order by -ln(1 - random()) / p.weight limit 3) x
    on conflict (day) do nothing;
    select q.quests into qs from private.quest_days q where q.day = d;
  end if;
  select coalesce(array_agg(x.quest), '{}') into done from private.quest_done x where x.user_id = auth.uid() and x.day = d;
  return jsonb_build_object('day', d, 'quests', to_jsonb(qs), 'done', to_jsonb(done));
end $$;

/** Hand in quest `q`: returns { tokens, bonus } (bonus = that was the third one today). */
create or replace function public.complete_quest(q text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); d date := private.quest_day(); qs text[]; n integer; bal integer; ok boolean := true;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  select x.quests into qs from private.quest_days x where x.day = d;
  if qs is null or not (q = any (qs)) then raise exception 'that is not one of today''s quests'; end if;
  if exists (select 1 from private.quest_done x where x.user_id = uid and x.day = d and x.quest = q) then raise exception 'already done today'; end if;
  -- the ones the server can see for itself
  if q = 'coins' then ok := (select count(*) from private.coin_claims c where c.user_id = uid and c.win >= floor(extract(epoch from d::timestamp) / 300)) >= 3;
  elsif q = 'claw' then ok := exists (select 1 from private.claw_plays c where c.user_id = uid and c.at >= d::timestamp at time zone 'utc');
  elsif q = 'water' then ok := exists (select 1 from private.water_thanks t where t.user_id = uid and t.day = d);
  elsif q = 'harvest' then ok := exists (select 1 from private.harvest_log h where h.user_id = uid and h.at >= d::timestamp at time zone 'utc');
  end if;
  if not ok then raise exception 'not done yet'; end if;
  insert into private.quest_done (user_id, day, quest) values (uid, d, q);
  select count(*) into n from private.quest_done x where x.user_id = uid and x.day = d;
  bal := private.add_tokens(uid, case when n >= 3 then 15 else 5 end);
  return jsonb_build_object('tokens', bal, 'bonus', n >= 3);
end $$;

-- the harvest now keeps a log (for the harvest quest and the GREEN THUMB badge)
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
  insert into private.harvest_log (user_id, seed) values (uid, p.seed);
  bal := private.add_tokens(uid, s.pays);
  if random() < 0.1 and not exists (select 1 from public.inventory i where i.user_id = uid and i.item = 'seed:4') then
    insert into public.inventory (user_id, item) values (uid, 'seed:4'); bonus := 'seed:4';
  end if;
  return jsonb_build_object('tokens', bal, 'seed', p.seed, 'bonus', bonus);
end $$;

-- ---------- badges ----------
create table if not exists private.badge_list (id text primary key);
insert into private.badge_list (id) values ('angler'), ('collector'), ('coder'), ('champ'), ('green'), ('helper'), ('quester'), ('tycoon'), ('stargazer'), ('royal'), ('commuter'), ('spooked')
on conflict do nothing;
alter table private.badge_list enable row level security;
create table if not exists public.badges (user_id uuid not null references auth.users (id) on delete cascade, badge text not null, got_at timestamptz not null default now(), primary key (user_id, badge));
alter table public.badges enable row level security;
drop policy if exists "badges: members read" on public.badges;
create policy "badges: members read" on public.badges for select to authenticated using ((select public.is_member()));
revoke all on public.badges from anon, authenticated;
grant select on public.badges to authenticated;

/** Claim badge `b`. The server checks the ones it keeps records for. Returns true if it's new. */
create or replace function public.claim_badge(b text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); ok boolean := true;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if not exists (select 1 from private.badge_list l where l.id = b) then raise exception 'no such badge'; end if;
  if b = 'green' then ok := (select count(*) from private.harvest_log h where h.user_id = uid) >= 10;
  elsif b = 'helper' then ok := (select count(*) from private.water_thanks t where t.user_id = uid) >= 20;
  elsif b = 'quester' then ok := (select count(*) from private.quest_done x where x.user_id = uid) >= 30;
  elsif b = 'tycoon' then ok := public.my_tokens() >= 100;
  end if;
  if not ok then raise exception 'not earned yet'; end if;
  insert into public.badges (user_id, badge) values (uid, b) on conflict do nothing;
  return found;
end $$;

revoke execute on function public.todays_quests(), public.complete_quest(text), public.claim_badge(text), public.harvest(integer) from public, anon;
grant execute on function public.todays_quests(), public.complete_quest(text), public.claim_badge(text), public.harvest(integer) to authenticated;

