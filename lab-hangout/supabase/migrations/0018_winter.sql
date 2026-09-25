-- Lab Hangout: WINTER (1 December to 6 January). Run after 0017_photos.sql. Safe to re-run.
--
-- The season now runs from 1 December to 6 January (UTC). As with Halloween, the owner can switch
-- it on early to test, and back to the date afterwards:
--   select public.set_season('winter');   -- on for everyone now
--   select public.set_season(null);       -- back to the date (on by itself on 1 December)
--
-- What the server keeps (everything else is in the game, on the clock):
--   * Winter claw prizes: the ELF HAT, RED NOSE, REINDEER ANTLERS, CHRISTMAS JUMPER, PENGUIN and
--     SANTA HAT (in season only).
--   * The PRESENT HUNT: 12 presents hidden around the world (index 0..11, src/world/winter.ts).
--     Each pays 1 token once a day; find all 12 in a day for a winter prize you haven't got.
--   * The ADVENT CALENDAR in the Lab: doors 1 to 24, each opens once from its date in December
--     (any you missed stay openable until the season ends). Tokens, and a prize on the 6th, 12th,
--     18th and 24th. (Switched on early to test, only door 1 opens, and it doesn't count for December.)
--   * The Square's TREE: ornaments hung by players (5 each a day), per server, for the season.
--   * SANTA'S SLEIGH (at :15 and :45) drops 8 presents on the Square; catch up to 3 a pass (+1 each).
--   * SECRET SANTA: wrap a present of 3, 5 or 10 of your tokens for another player, with a message
--     (picked from a list, so nothing needs moderating); it waits under the tree until they open it.
-- Keep in step with src/world/winter.ts, src/entities/critter.ts (CLAW) and src/world/furniture.ts.

-- ---------- the season: 1 Dec - 6 Jan ----------
create or replace function private.season() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select nullif(c.value, '') from private.config c where c.key = 'season'),
    case when to_char(now() at time zone 'utc', 'MM') = '10' then 'halloween'
         when to_char(now() at time zone 'utc', 'MM') = '12' or to_char(now() at time zone 'utc', 'MMDD') <= '0106' then 'winter' end);
$$;
revoke execute on function private.season() from public, anon, authenticated;
/** Which winter it is: the year its December falls in (0 when it's switched on early to test, so the real one starts fresh). */
create or replace function private.winter_year() returns integer
language sql stable set search_path = '' as $$
  select case extract(month from now() at time zone 'utc') when 1 then extract(year from now() at time zone 'utc')::int - 1 when 12 then extract(year from now() at time zone 'utc')::int else 0 end;
$$;
revoke execute on function private.winter_year() from public, anon, authenticated;

-- ---------- winter claw prizes ----------
insert into private.claw_prizes (item, weight, season) values
  ('hat:17', 10, 'winter'), ('face:8', 10, 'winter'), ('hat:16', 6, 'winter'), ('fit:9', 6, 'winter'),   -- elf hat, red nose, antlers, jumper
  ('pet:7', 3, 'winter'), ('hat:15', 3, 'winter')                                                           -- penguin, santa hat
on conflict (item) do update set weight = excluded.weight, season = excluded.season;

/** A winter prize you don't have yet (null if you have them all). */
create or replace function private.winter_prize(uid uuid) returns text
language sql volatile set search_path = '' as $$
  select p.item from private.claw_prizes p where p.season = 'winter' and not exists (select 1 from public.inventory i where i.user_id = uid and i.item = p.item) order by random() limit 1;
$$;
revoke execute on function private.winter_prize(uuid) from public, anon, authenticated;

-- ---------- the present hunt ----------
create table if not exists private.present_finds (user_id uuid not null, n integer not null, day date not null, primary key (user_id, n, day));
create table if not exists private.present_prizes (user_id uuid not null, day date not null, primary key (user_id, day));
alter table private.present_finds enable row level security;
alter table private.present_prizes enable row level security;

/** Open present n (0..11). Returns { tokens, found (today), prize } (prize = a winter item for all 12, 'tokens:5' if you have them all). */
create or replace function public.find_present(n integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); today date := (now() at time zone 'utc')::date; c integer; prize text; bal integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if private.season() is distinct from 'winter' then raise exception 'the presents come out on 1 December'; end if;
  if n is null or n < 0 or n > 11 then raise exception 'no such present'; end if;
  insert into private.present_finds (user_id, n, day) values (uid, find_present.n, today) on conflict do nothing;
  if not found then raise exception 'you already opened this one today'; end if;
  bal := private.add_tokens(uid, 1);
  select count(*) into c from private.present_finds f where f.user_id = uid and f.day = today;
  if c >= 12 then
    insert into private.present_prizes (user_id, day) values (uid, today) on conflict do nothing;
    if found then
      prize := private.winter_prize(uid);
      if prize is null then bal := private.add_tokens(uid, 5); prize := 'tokens:5';
      else insert into public.inventory (user_id, item) values (uid, prize); end if;
    end if;
  end if;
  return jsonb_build_object('tokens', bal, 'found', c, 'prize', prize);
end $$;

/** Which presents you've opened today. */
create or replace function public.presents_today() returns integer[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(f.n order by f.n), '{}') from private.present_finds f where public.is_member() and f.user_id = auth.uid() and f.day = (now() at time zone 'utc')::date;
$$;

-- ---------- the advent calendar ----------
create table if not exists private.advent_opened (user_id uuid not null, year integer not null, door integer not null, at timestamptz not null default now(), primary key (user_id, year, door));
alter table private.advent_opened enable row level security;

/** Open door `door` (1..24). Returns { tokens, prize } (prize = the item behind the 6th, 12th, 18th, 24th; 'tokens:5' if you had it). */
create or replace function public.open_advent(door integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); y integer := private.winter_year(); open_to integer; prize text; bal integer; pays integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if private.season() is distinct from 'winter' then raise exception 'the advent calendar opens on 1 December'; end if;
  if door is null or door < 1 or door > 24 then raise exception 'no such door'; end if;
  open_to := case when extract(month from now() at time zone 'utc') = 12 then least(24, extract(day from now() at time zone 'utc')::int) when extract(month from now() at time zone 'utc') = 1 then 24 else 1 end; -- (tested early: door 1 only)
  if door > open_to then raise exception 'no peeking! door % opens on % December', door, door; end if;
  insert into private.advent_opened (user_id, year, door) values (uid, y, open_advent.door) on conflict do nothing;
  if not found then raise exception 'you already opened door %', door; end if;
  prize := case door when 6 then 'hat:17' when 12 then 'face:8' when 18 then 'fit:9' when 24 then 'hat:15' end;
  if prize is not null then
    if exists (select 1 from public.inventory i where i.user_id = uid and i.item = prize) then bal := private.add_tokens(uid, 5); prize := 'tokens:5';
    else insert into public.inventory (user_id, item) values (uid, prize); bal := public.my_tokens(); end if;
  else
    pays := 2 + door % 3; bal := private.add_tokens(uid, pays); prize := 'tokens:' || pays;
  end if;
  return jsonb_build_object('tokens', bal, 'prize', prize);
end $$;

/** The doors you've opened this winter, and the last one you may open today. */
create or replace function public.advent_doors() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('opened', coalesce((select jsonb_agg(a.door order by a.door) from private.advent_opened a where a.user_id = auth.uid() and a.year = private.winter_year()), '[]'::jsonb),
    'upto', case when extract(month from now() at time zone 'utc') = 12 then least(24, extract(day from now() at time zone 'utc')::int) when extract(month from now() at time zone 'utc') = 1 then 24 else 1 end)
  where public.is_member();
$$;

-- ---------- the Square's tree ----------
create table if not exists public.ornaments (
  id bigserial primary key,
  server text not null references private.servers (id) on delete cascade,
  owner uuid not null references auth.users (id) on delete cascade,
  owner_name text not null default '',
  kind integer not null check (kind between 0 and 7),
  x integer not null check (x between -70 and 70),
  y integer not null check (y between 0 and 170),
  year integer not null,
  placed_at timestamptz not null default now()
);
create index if not exists ornaments_server_year on public.ornaments (server, year, id);
alter table public.ornaments enable row level security;
drop policy if exists "ornaments: members read" on public.ornaments;
create policy "ornaments: members read" on public.ornaments for select to authenticated using ((select public.is_member()));
revoke all on public.ornaments from anon, authenticated;
grant select on public.ornaments to authenticated;

/** Hang an ornament of kind `kind` at (x, y) on the tree (x across from its trunk, y down from its star). Returns its id. */
create or replace function public.hang_ornament(kind integer, x integer, y integer) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); srv text := public.my_server(); yr integer := private.winter_year(); nm text; id_ bigint;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if private.season() is distinct from 'winter' then raise exception 'the tree goes up on 1 December'; end if;
  if srv is null then raise exception 'you are not on a server (reload to pick one)'; end if;
  if kind is null or kind < 0 or kind > 7 or x is null or y is null or y < 12 or y > 160 or abs(x) > 8 + (y * 60) / 160 then raise exception 'that is not on the tree'; end if;
  perform pg_advisory_xact_lock(hashtext('ornament:' || uid::text));
  if (select count(*) from public.ornaments o where o.owner = uid and o.placed_at >= (now() at time zone 'utc')::date::timestamp at time zone 'utc') >= 5 then raise exception 'you have hung 5 ornaments today. more tomorrow!'; end if;
  select coalesce(nullif(pr.name, ''), 'SOMEONE') into nm from public.profiles pr where pr.id = uid;
  insert into public.ornaments (server, owner, owner_name, kind, x, y, year) values (srv, uid, coalesce(nm, 'SOMEONE'), kind, x, y, yr) returning id into id_;
  -- a tree only holds so much: the oldest drop off past 240
  delete from public.ornaments o where o.server = srv and o.year = yr and o.id in (select id from public.ornaments z where z.server = srv and z.year = yr order by z.id desc offset 240);
  return id_;
end $$;

-- ---------- Santa's sleigh: catch the presents it drops ----------
create table if not exists private.sleigh_catches (user_id uuid not null, pass bigint not null, n integer not null, primary key (user_id, pass, n));
alter table private.sleigh_catches enable row level security;

/**
 * Catch present n (0..7) from sleigh pass `pass` (= floor((epoch - 900) / 1800): the sleigh flies at
 * :15 and :45). The presents are on the ground for 5 minutes after the pass. +1 each, 3 a pass.
 */
create or replace function public.catch_sleigh(pass bigint, n integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); t double precision := extract(epoch from now()); cur bigint := floor((t - 900) / 1800);
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if private.season() is distinct from 'winter' then raise exception 'santa comes in december'; end if;
  if n is null or n < 0 or n > 7 or pass is distinct from cur or t - (cur * 1800 + 900) > 330 then raise exception 'too late, it melted'; end if;
  if (select count(*) from private.sleigh_catches c where c.user_id = uid and c.pass = catch_sleigh.pass) >= 3 then raise exception 'save some for everyone else!'; end if;
  insert into private.sleigh_catches (user_id, pass, n) values (uid, catch_sleigh.pass, catch_sleigh.n) on conflict do nothing;
  if not found then raise exception 'you already caught that one'; end if;
  return private.add_tokens(uid, 1);
end $$;

-- ---------- Secret Santa ----------
create table if not exists public.gifts (
  id bigserial primary key,
  sender uuid not null references auth.users (id) on delete cascade,
  sender_name text not null default '',
  recipient uuid not null references auth.users (id) on delete cascade,
  recipient_name text not null default '',
  tokens integer not null check (tokens in (3, 5, 10)),
  wrap integer not null check (wrap between 0 and 5),
  note integer not null check (note between 0 and 5),
  sent_at timestamptz not null default now(),
  opened_at timestamptz
);
create index if not exists gifts_recipient on public.gifts (recipient, opened_at);
create index if not exists gifts_sender_at on public.gifts (sender, sent_at);
alter table public.gifts enable row level security;
revoke all on public.gifts from anon, authenticated;

/** Wrap a present of `tokens` (3, 5 or 10) of your tokens for `recipient`, in paper `wrap`, with message `note`. Returns your balance. */
create or replace function public.send_gift(recipient uuid, tokens integer, wrap integer, note integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); bal integer; me_name text; to_name text;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if private.season() is distinct from 'winter' then raise exception 'secret santa is a december thing'; end if;
  if recipient is null or recipient = uid then raise exception 'you can''t give yourself a present'; end if;
  if tokens not in (3, 5, 10) or wrap is null or wrap < 0 or wrap > 5 or note is null or note < 0 or note > 5 then raise exception 'that is not a present'; end if;
  select coalesce(nullif(pr.name, ''), 'SOMEONE') into to_name from public.profiles pr where pr.id = recipient;
  if to_name is null or not exists (select 1 from public.members m where m.user_id = recipient) or exists (select 1 from public.bans b where b.user_id = recipient) then raise exception 'no such player'; end if;
  perform pg_advisory_xact_lock(hashtext('gift:' || uid::text));
  if (select count(*) from public.gifts g where g.sender = uid and g.sent_at >= (now() at time zone 'utc')::date::timestamp at time zone 'utc') >= 5 then raise exception 'you have sent 5 presents today. santa needs a rest!'; end if;
  if (select count(*) from public.gifts g where g.recipient = send_gift.recipient and g.opened_at is null) >= 20 then raise exception 'their pile is full: they need to open some first'; end if;
  select w.tokens into bal from public.wallets w where w.user_id = uid for update;
  if coalesce(bal, 0) < tokens then raise exception 'you need % tokens to wrap that', tokens; end if;
  bal := private.add_tokens(uid, -tokens);
  select coalesce(nullif(pr.name, ''), 'SOMEONE') into me_name from public.profiles pr where pr.id = uid;
  insert into public.gifts (sender, sender_name, recipient, recipient_name, tokens, wrap, note) values (uid, coalesce(me_name, 'SOMEONE'), send_gift.recipient, to_name, send_gift.tokens, send_gift.wrap, send_gift.note);
  return bal;
end $$;

/** The unopened presents under the tree (who they're for and the paper, not who from: it's a secret until opened). */
create or replace function public.tree_gifts() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'to', g.recipient, 'to_name', g.recipient_name, 'wrap', g.wrap, 'mine', g.recipient = auth.uid()) order by g.id)
    from (select * from public.gifts x where x.opened_at is null order by x.id desc limit 60) g), '[]'::jsonb) where public.is_member();
$$;

/** Open a present that's for you. Returns { tokens (your balance), got, from, note }. */
create or replace function public.open_gift(gift bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); g public.gifts; bal integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  update public.gifts x set opened_at = now() where x.id = gift and x.recipient = uid and x.opened_at is null returning * into g;
  if g.id is null then raise exception 'that present is not for you (or it is already open)'; end if;
  bal := private.add_tokens(uid, g.tokens);
  return jsonb_build_object('tokens', bal, 'got', g.tokens, 'from', g.sender_name, 'note', g.note);
end $$;

revoke execute on function public.find_present(integer), public.presents_today(), public.open_advent(integer), public.advent_doors(), public.hang_ornament(integer, integer, integer),
  public.catch_sleigh(bigint, integer), public.send_gift(uuid, integer, integer, integer), public.tree_gifts(), public.open_gift(bigint) from public, anon;
grant execute on function public.find_present(integer), public.presents_today(), public.open_advent(integer), public.advent_doors(), public.hang_ornament(integer, integer, integer),
  public.catch_sleigh(bigint, integer), public.send_gift(uuid, integer, integer, integer), public.tree_gifts(), public.open_gift(bigint) to authenticated;

-- ---------- winter furniture for the flats (the shop shows it in season) ----------
insert into private.furniture (id, price, starter) values ('xtree', 20, 0), ('fireplace', 25, 0), ('stocking', 6, 0), ('sglobe', 8, 0)
on conflict (id) do update set price = excluded.price;
