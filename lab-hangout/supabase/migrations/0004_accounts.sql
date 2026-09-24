-- Lab Hangout: guests and accounts. Run after 0003_tokens.sql. Safe to re-run.
--
--   Guests are anonymous users (progress kept for as long as that browser keeps its session).
--   Accounts are users who logged in with Discord/Google, or guests who linked one
--   (linkIdentity keeps the same user id, so everything carries over by itself).
--
--   saves      your own save: cosmetic unlocks you earned by playing, friends, collections,
--              high score, desk setup. Players read/write only their own row (it's cosmetic,
--              so client-written is fine). Tokens are NOT in here: those stay server-owned.
--   inventory  prizes (claw machine, 0006). Read-own only; only security-definer RPCs add rows.
--   merge      a guest who logs into an account that already exists: start_merge() as the
--              guest, then finish_merge(ticket) as the account moves the guest's tokens,
--              prizes and membership across and hands back the guest's save to merge in.

create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.saves drop constraint if exists saves_data_ok;
alter table public.saves add constraint saves_data_ok check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 16000);
alter table public.saves enable row level security;
drop policy if exists "saves: read own" on public.saves;
create policy "saves: read own" on public.saves for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "saves: insert own" on public.saves;
create policy "saves: insert own" on public.saves for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "saves: update own" on public.saves;
create policy "saves: update own" on public.saves for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.saves from anon, authenticated;
grant select, insert, update on public.saves to authenticated;

create table if not exists public.inventory (
  user_id uuid not null references auth.users (id) on delete cascade,
  item text not null check (item ~ '^[a-z]{2,8}:[0-9]{1,3}$'),
  got_at timestamptz not null default now(),
  primary key (user_id, item)
);
alter table public.inventory enable row level security;
drop policy if exists "inventory: read own" on public.inventory;
create policy "inventory: read own" on public.inventory for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.inventory from anon, authenticated;
grant select on public.inventory to authenticated;

create table if not exists private.merge_tickets (
  token text primary key, from_uid uuid not null, expires timestamptz not null
);
create table if not exists private.merges (to_uid uuid not null, from_uid uuid not null, at timestamptz not null default now());
create index if not exists merges_to_at on private.merges (to_uid, at);
alter table private.merge_tickets enable row level security;
alter table private.merges enable row level security;

/** As a guest: get a one-time ticket (10 minutes) to carry your progress into an account. */
create or replace function public.start_merge() returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); t text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not coalesce((select u.is_anonymous from auth.users u where u.id = uid), false) then raise exception 'only guests can merge'; end if;
  delete from private.merge_tickets m where m.from_uid = uid or m.expires < now();
  t := encode(extensions.gen_random_bytes(18), 'hex');
  insert into private.merge_tickets (token, from_uid, expires) values (t, uid, now() + interval '10 minutes');
  return t;
end $$;

/**
 * As the account: pull a guest's progress in. Moves tokens and prizes, copies membership,
 * and returns { tokens: new balance, save: the guest's save } so the browser can merge the save.
 * One merge per account per day, so guests can't be farmed for daily bonuses.
 */
create or replace function public.finish_merge(ticket text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); src uuid; n integer; bal integer; sv jsonb;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if coalesce((select u.is_anonymous from auth.users u where u.id = uid), true) then raise exception 'log in first'; end if;
  delete from private.merge_tickets m where m.token = coalesce(ticket, '') and m.expires > now() returning m.from_uid into src;
  if src is null then raise exception 'that merge ticket has expired'; end if;
  if src = uid then return jsonb_build_object('tokens', public.my_tokens(), 'save', null); end if;
  if not coalesce((select u.is_anonymous from auth.users u where u.id = src), false) then raise exception 'only guests can merge'; end if;
  if exists (select 1 from private.merges g where g.to_uid = uid and g.at > now() - interval '1 day') then raise exception 'you already merged a guest today'; end if;
  insert into private.merges (to_uid, from_uid) values (uid, src);
  -- tokens
  select w.tokens into n from public.wallets w where w.user_id = src for update;
  if coalesce(n, 0) > 0 then
    update public.wallets set tokens = 0, updated_at = now() where user_id = src;
    perform private.add_tokens(uid, n);
  end if;
  -- prizes
  insert into public.inventory (user_id, item, got_at) select uid, i.item, i.got_at from public.inventory i where i.user_id = src on conflict do nothing;
  delete from public.inventory where user_id = src;
  -- membership (they already knew the invite code)
  if exists (select 1 from public.members m where m.user_id = src) then insert into public.members (user_id) values (uid) on conflict do nothing; end if;
  select s.data into sv from public.saves s where s.user_id = src;
  select coalesce((select w.tokens from public.wallets w where w.user_id = uid), 0) into bal;
  return jsonb_build_object('tokens', bal, 'save', sv);
end $$;

revoke execute on function public.start_merge(), public.finish_merge(text) from public, anon;
grant execute on function public.start_merge(), public.finish_merge(text) to authenticated;
