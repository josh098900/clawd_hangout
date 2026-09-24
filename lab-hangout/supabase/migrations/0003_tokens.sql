-- Lab Hangout: server-owned tokens. Only these functions change a balance; the browser can
-- only read its own wallet. Run after 0002_security.sql. Safe to re-run.
--
--   Coins on the Square: COIN_COUNT spots, each claimable once per player per 5-minute window
--   (the window comes from the server clock, not the browser's).
--   Daily bonus: once per UTC day.
-- The server can't see where you're standing, so a determined cheater could claim every coin
-- each window without walking over them: that's at most COIN_COUNT tokens per 5 minutes.

create table if not exists public.wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tokens integer not null default 0 check (tokens >= 0),
  updated_at timestamptz not null default now()
);
alter table public.wallets enable row level security;
drop policy if exists "wallets: read own" on public.wallets;
create policy "wallets: read own" on public.wallets for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.wallets from anon, authenticated;
grant select on public.wallets to authenticated;

create table if not exists private.coin_claims (user_id uuid not null, coin integer not null, win bigint not null, primary key (user_id, coin, win));
create table if not exists private.daily_claims (user_id uuid not null, day date not null, primary key (user_id, day));
alter table private.coin_claims enable row level security;
alter table private.daily_claims enable row level security;

create or replace function private.add_tokens(uid uuid, n integer) returns integer
language sql security definer set search_path = '' as $$
  insert into public.wallets (user_id, tokens) values (uid, greatest(0, n))
  on conflict (user_id) do update set tokens = greatest(0, public.wallets.tokens + n), updated_at = now()
  returning tokens;
$$;
revoke execute on function private.add_tokens(uuid, integer) from public, anon, authenticated;

/** Your balance. */
create or replace function public.my_tokens() returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce((select w.tokens from public.wallets w where w.user_id = auth.uid()), 0);
$$;

/** Pick up coin `coin` (0..5). Returns your new balance, or null if you already had it this window. */
create or replace function public.claim_coin(coin integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); w bigint := floor(extract(epoch from now()) / 300);
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if coin is null or coin < 0 or coin > 5 then raise exception 'no such coin'; end if;
  insert into private.coin_claims (user_id, coin, win) values (uid, coin, w) on conflict do nothing;
  if not found then return null; end if;
  delete from private.coin_claims c where c.user_id = uid and c.win < w - 1; -- tidy up
  return private.add_tokens(uid, 1);
end $$;

/** Once a (UTC) day: +5. Returns your new balance, or null if you've had today's. */
create or replace function public.claim_daily() returns integer
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  insert into private.daily_claims (user_id, day) values (uid, (now() at time zone 'utc')::date) on conflict do nothing;
  if not found then return null; end if;
  return private.add_tokens(uid, 5);
end $$;

revoke execute on function public.my_tokens(), public.claim_coin(integer), public.claim_daily() from public, anon;
grant execute on function public.my_tokens(), public.claim_coin(integer), public.claim_daily() to authenticated;
