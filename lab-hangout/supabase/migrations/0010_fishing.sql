-- Lab Hangout: the hourly fishing contest at the Pier. Run after 0009_quests.sql. Safe to re-run.
--
-- Every catch online is rolled HERE (species by rarity, then a size), so the leaderboard can be
-- trusted. From :30 to :40 of every hour (UTC) catches are entered in that hour's contest; the
-- biggest non-junk fish wins 5 tokens + 5 per other angler who entered (at most 25) and the
-- TROPHY ANGLER badge. Contests are settled lazily by the first contest_board() call after they
-- end. The fish list must match FISH in src/game/fish.ts.

create table if not exists private.fish (name text primary key, rarity text not null, cm_min integer not null, cm_max integer not null);
insert into private.fish (name, rarity, cm_min, cm_max) values
  ('SARDINE', 'COMMON', 8, 18), ('MACKEREL', 'COMMON', 20, 40), ('SEA BREAM', 'COMMON', 18, 35),
  ('OLD BOOT', 'JUNK', 26, 30), ('SEAWEED', 'JUNK', 10, 60),
  ('SEA BASS', 'UNCOMMON', 30, 70), ('SQUID', 'UNCOMMON', 15, 45), ('PUFFERFISH', 'UNCOMMON', 10, 30),
  ('SWORDFISH', 'RARE', 120, 300), ('OCTOPUS', 'RARE', 40, 120),
  ('MOON FISH', 'LEGENDARY', 60, 90), ('GOLDEN KOI', 'LEGENDARY', 40, 70)
on conflict (name) do update set rarity = excluded.rarity, cm_min = excluded.cm_min, cm_max = excluded.cm_max;
create table if not exists private.rarity_odds (rarity text primary key, odds real not null);
insert into private.rarity_odds values ('JUNK', 0.14), ('COMMON', 0.44), ('UNCOMMON', 0.28), ('RARE', 0.11), ('LEGENDARY', 0.03)
on conflict (rarity) do update set odds = excluded.odds;
create table if not exists private.catches (id bigserial primary key, user_id uuid not null, name text not null, fish text not null, rarity text not null, cm integer not null, contest timestamptz, at timestamptz not null default now());
create index if not exists catches_user_at on private.catches (user_id, at);
create index if not exists catches_contest on private.catches (contest, cm desc);
create table if not exists private.contest_results (contest timestamptz primary key, winner uuid, name text, fish text, cm integer, anglers integer not null default 0, prize integer not null default 0);
alter table private.fish enable row level security;
alter table private.rarity_odds enable row level security;
alter table private.catches enable row level security;
alter table private.contest_results enable row level security;
insert into private.badge_list (id) values ('trophy') on conflict do nothing;

/** The contest running now (its hour), or null. Contests run :30-:40 every hour, UTC. */
create or replace function private.contest_now() returns timestamptz
language sql stable set search_path = '' as $$
  select case when extract(minute from now()) >= 30 and extract(minute from now()) < 40 then date_trunc('hour', now()) end;
$$;
revoke execute on function private.contest_now() from public, anon, authenticated;

/** Settle every finished contest that hasn't been paid out yet. */
create or replace function private.settle_contests() returns void
language plpgsql security definer set search_path = '' as $$
declare c timestamptz; w record; n integer; prize integer;
begin
  for c in select distinct x.contest from private.catches x
            where x.contest is not null and x.contest is distinct from private.contest_now()
              and not exists (select 1 from private.contest_results r where r.contest = x.contest) loop
    select count(distinct x.user_id) into n from private.catches x where x.contest = c and x.rarity <> 'JUNK';
    select x.user_id, x.name, x.fish, x.cm into w from private.catches x where x.contest = c and x.rarity <> 'JUNK' order by x.cm desc, x.at limit 1;
    if w.user_id is null then insert into private.contest_results (contest) values (c) on conflict do nothing; continue; end if;
    prize := least(25, 5 + 5 * (n - 1));
    insert into private.contest_results (contest, winner, name, fish, cm, anglers, prize) values (c, w.user_id, w.name, w.fish, w.cm, n, prize) on conflict do nothing;
    if found then
      perform private.add_tokens(w.user_id, prize);
      insert into public.badges (user_id, badge) values (w.user_id, 'trophy') on conflict do nothing;
    end if;
  end loop;
end $$;
revoke execute on function private.settle_contests() from public, anon, authenticated;

/** Reel one in: the server picks the fish and its size. Returns { fish, rarity, cm, contest, rank }. */
create or replace function public.catch_fish() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); f private.fish; cm integer; c timestamptz := private.contest_now(); nm text; rank integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if exists (select 1 from private.catches x where x.user_id = uid and x.at > now() - interval '2 seconds') then raise exception 'let the line settle a moment'; end if;
  -- rarity by the odds, then any fish of that rarity (an exponential race picks by weight)
  select x.* into f from private.fish x join private.rarity_odds o on o.rarity = x.rarity
   order by -ln(1 - random()) / (o.odds / (select count(*) from private.fish y where y.rarity = x.rarity)) limit 1;
  cm := f.cm_min + floor(random() * (f.cm_max - f.cm_min + 1))::integer;
  select coalesce(nullif(p.name, ''), 'SOMEONE') into nm from public.profiles p where p.id = uid;
  insert into private.catches (user_id, name, fish, rarity, cm, contest) values (uid, coalesce(nm, 'SOMEONE'), f.name, f.rarity, cm, case when f.rarity = 'JUNK' then null else c end);
  if c is not null and f.rarity <> 'JUNK' then
    -- your place = 1 + the other anglers whose best beats your best
    select 1 + count(*) into rank from (select x.user_id, max(x.cm) m from private.catches x where x.contest = c and x.user_id <> uid group by x.user_id) b
     where b.m > (select max(y.cm) from private.catches y where y.contest = c and y.user_id = uid);
  end if;
  return jsonb_build_object('fish', f.name, 'rarity', f.rarity, 'cm', cm, 'contest', c is not null, 'rank', rank);
end $$;

/**
 * The Pier's scoreboard: { live, now, top: [{ name, fish, cm }] (best catch per angler, top 5),
 * last: { name, fish, cm, prize, anglers, at } | null, won: true if the last contest was yours }.
 */
create or replace function public.contest_board() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c timestamptz := private.contest_now(); top jsonb; last private.contest_results;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  perform private.settle_contests();
  if c is not null then
    select coalesce(jsonb_agg(jsonb_build_object('name', b.name, 'fish', b.fish, 'cm', b.cm) order by b.cm desc), '[]') into top from (
      select * from (select distinct on (x.user_id) x.name, x.fish, x.cm from private.catches x where x.contest = c order by x.user_id, x.cm desc, x.at) best
      order by best.cm desc limit 5
    ) b;
  end if;
  select * into last from private.contest_results r where r.winner is not null order by r.contest desc limit 1;
  return jsonb_build_object('live', c is not null, 'now', extract(epoch from now()), 'top', coalesce(top, '[]'::jsonb),
    'last', case when last.contest is null then null else jsonb_build_object('name', last.name, 'fish', last.fish, 'cm', last.cm, 'prize', last.prize, 'anglers', last.anglers, 'at', extract(epoch from last.contest)) end,
    'won', last.winner is not null and last.winner = auth.uid());
end $$;

revoke execute on function public.catch_fish(), public.contest_board() from public, anon;
grant execute on function public.catch_fish(), public.contest_board() to authenticated;
