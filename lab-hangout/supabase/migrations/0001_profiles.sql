-- Lab Hangout: player profiles (name + look).
-- Run this in Supabase Dashboard -> SQL Editor, or with the Supabase CLI: `supabase db push`.
--
-- Realtime (presence + broadcast) needs NO tables: rooms are ephemeral channels.
-- Only your name and look are stored, so they come back next visit.

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 16),
  look        jsonb not null default '{}'::jsonb check (pg_column_size(look) < 512),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Expose the table to signed-in players only (anonymous sign-ins use the "authenticated"
-- role). Explicit so it works even with "Automatically expose new tables" switched off.
-- RLS below still limits what each player can see and change.
grant select, insert, update on public.profiles to authenticated;
revoke all on public.profiles from anon;

-- Anyone signed in (anonymous sign-ins count as "authenticated") may read profiles.
drop policy if exists "profiles: read" on public.profiles;
create policy "profiles: read" on public.profiles
  for select to authenticated
  using (true);

-- You may only create / change your own row.
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
