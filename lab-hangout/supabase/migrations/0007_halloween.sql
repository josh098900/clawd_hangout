-- Lab Hangout: seasons + Halloween. Run after 0006_arcade.sql. Safe to re-run.
--
-- The season comes from the server's date (October = 'halloween', December = 'winter'), or
-- from an owner override for testing:
--   select public.set_season('halloween');   -- switch it on for everyone now
--   select public.set_season(null);          -- back to going by the date
--
-- Trick-or-treat: 8 doors around the world (index 0..7, see src/world/halloween.ts). Each pays
-- 1 token once per door per day (UTC); 1 in 5 knocks is a "trick" instead (no token). Knock on
-- all 8 in a day and you get a Halloween costume piece you don't have yet (or 5 tokens if you
-- have them all). The claw machine also has October-only prizes.

-- ---------- seasons ----------
create or replace function private.season() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select nullif(c.value, '') from private.config c where c.key = 'season'),
    case to_char(now() at time zone 'utc', 'MM') when '10' then 'halloween' when '12' then 'winter' end);
$$;
revoke execute on function private.season() from public, anon, authenticated;

/** The current season, for the game to decorate itself (null = none). */
create or replace function public.current_season() returns text
language sql stable security definer set search_path = '' as $$ select private.season(); $$;
revoke execute on function public.current_season() from public, anon;
grant execute on function public.current_season() to authenticated;

/** Owner only: force a season (for testing), or null to go back to the date. */
create or replace function public.set_season(s text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if s is null then delete from private.config where key = 'season';
  elsif s not in ('halloween', 'winter') then raise exception 'unknown season %', s;
  else insert into private.config (key, value) values ('season', s) on conflict (key) do update set value = excluded.value;
  end if;
end $$;
revoke execute on function public.set_season(text) from public, anon, authenticated;

-- ---------- seasonal claw prizes ----------
alter table private.claw_prizes add column if not exists season text;
insert into private.claw_prizes (item, weight, season) values
  ('face:6', 10, 'halloween'), ('hat:11', 6, 'halloween'), ('face:7', 6, 'halloween'), ('fit:7', 6, 'halloween'),   -- fangs, witch hat, skull mask, skeleton
  ('fit:6', 3, 'halloween'), ('pet:6', 3, 'halloween')                                                              -- vampire cape, bat
on conflict (item) do update set weight = excluded.weight, season = excluded.season;

create or replace function public.play_claw() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); bal integer; prize text; dup boolean; ssn text := private.season();
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if exists (select 1 from private.claw_plays c where c.user_id = uid and c.at > now() - interval '2 seconds') then raise exception 'the claw is still moving'; end if;
  select w.tokens into bal from public.wallets w where w.user_id = uid for update;
  if coalesce(bal, 0) < 3 then raise exception 'you need 3 tokens (pick up coins on the Square)'; end if;
  -- weighted pick: smallest -ln(u)/weight wins (an exponential race); seasonal prizes only in season
  select p.item into prize from private.claw_prizes p where p.season is null or p.season = ssn order by -ln(1 - random()) / p.weight limit 1;
  dup := exists (select 1 from public.inventory i where i.user_id = uid and i.item = prize);
  if not dup then insert into public.inventory (user_id, item) values (uid, prize); end if;
  bal := private.add_tokens(uid, case when dup then -2 else -3 end);
  insert into private.claw_plays (user_id, item, dupe) values (uid, prize, dup);
  return jsonb_build_object('item', prize, 'dupe', dup, 'tokens', bal);
end $$;
revoke execute on function public.play_claw() from public, anon;
grant execute on function public.play_claw() to authenticated;

-- ---------- trick-or-treat ----------
create table if not exists private.treat_claims (user_id uuid not null, door integer not null, day date not null, trick boolean not null, primary key (user_id, door, day));
create table if not exists private.treat_prizes (user_id uuid not null, day date not null, primary key (user_id, day));
alter table private.treat_claims enable row level security;
alter table private.treat_prizes enable row level security;

/**
 * Knock on door `door` (0..7). Returns { tokens, trick, visited, prize } where visited = doors
 * knocked today and prize = the costume item for doing all 8 (null otherwise).
 */
create or replace function public.trick_or_treat(door integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); today date := (now() at time zone 'utc')::date; trick boolean := random() < 0.2; n integer; prize text; bal integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if private.season() is distinct from 'halloween' then raise exception 'trick-or-treating starts on 1 October'; end if;
  if door is null or door < 0 or door > 7 then raise exception 'no such door'; end if;
  insert into private.treat_claims (user_id, door, day, trick) values (uid, trick_or_treat.door, today, trick) on conflict do nothing;
  if not found then raise exception 'you already knocked here today'; end if;
  if trick then bal := public.my_tokens(); else bal := private.add_tokens(uid, 1); end if;
  select count(*) into n from private.treat_claims c where c.user_id = uid and c.day = today;
  if n >= 8 then
    insert into private.treat_prizes (user_id, day) values (uid, today) on conflict do nothing;
    if found then
      select p.item into prize from private.claw_prizes p
       where p.season = 'halloween' and not exists (select 1 from public.inventory i where i.user_id = uid and i.item = p.item)
       order by random() limit 1;
      if prize is null then bal := private.add_tokens(uid, 5); prize := 'tokens:5';
      else insert into public.inventory (user_id, item) values (uid, prize); end if;
    end if;
  end if;
  return jsonb_build_object('tokens', bal, 'trick', trick, 'visited', n, 'prize', prize);
end $$;
revoke execute on function public.trick_or_treat(integer) from public, anon;
grant execute on function public.trick_or_treat(integer) to authenticated;
