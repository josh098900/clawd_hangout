-- Lab Hangout: Phase 0 security.
--   * Members-only world: players join with an invite code checked here (never shipped to the
--     browser). Only members can use Realtime channels or the tables.
--   * Private Realtime channels: RLS on realtime.messages. Rooms are 'hangout:<room>' (players
--     send + receive) and 'hangout-srv:<room>' (receive only; only the database sends there,
--     so its messages carry a sender id nobody can fake).
--   * Server-side chat: send_chat() filters words, rate-limits, logs, then broadcasts.
--   * Moderation: report_player(), automatic mutes on repeated reports, bans.
--
-- Run in the SQL editor after 0001_profiles.sql, then:
--   select public.set_invite_code('pick-a-good-code');   -- share it with your testers
-- and in Realtime Settings switch OFF "Allow public access".
-- Everything here is safe to re-run.

create extension if not exists pgcrypto with schema extensions;

-- Tables the browser must never see directly live in their own schema, which the Data API
-- does not expose. Only the security-definer functions below touch them.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.config (key text primary key, value text not null);
create table if not exists private.join_attempts (user_id uuid not null, at timestamptz not null default now());
create index if not exists join_attempts_user_at on private.join_attempts (user_id, at);
create table if not exists private.chat_log (id bigserial primary key, user_id uuid not null, room text not null, body text not null, at timestamptz not null default now());
create index if not exists chat_log_user_at on private.chat_log (user_id, at);
create table if not exists private.reports (
  id bigserial primary key, reporter uuid not null, target uuid not null, reason text not null,
  recent_chat jsonb, at timestamptz not null default now(), handled boolean not null default false
);
create index if not exists reports_target_at on private.reports (target, at);
create table if not exists private.mutes (user_id uuid primary key, until timestamptz not null, why text);
create table if not exists private.banned_words (pattern text primary key);
-- belt and braces: RLS on with no policies = no rows for anon/authenticated even if the schema
-- were ever exposed. The functions below run as the owner, which RLS doesn't restrict.
alter table private.config enable row level security;
alter table private.join_attempts enable row level security;
alter table private.chat_log enable row level security;
alter table private.reports enable row level security;
alter table private.mutes enable row level security;
alter table private.banned_words enable row level security;

-- word patterns (Postgres regex, matched at a word start, case-insensitive). Same spirit as
-- src/net/filter.ts; add more with: insert into private.banned_words values ('...');
insert into private.banned_words (pattern) values
  ('f+[u*]+c+k+'), ('s+h+[i1!]+t+'), ('c+u+n+t+'), ('b+[i1!]+t+c+h+'), ('w+h+[o0]+r+e+'), ('s+l+u+t+'),
  ('p+u+s+s+y+'), ('b+a+s+t+a+r+d+'), ('w+a+n+k+'), ('t+w+a+t+'), ('a+s+s+h+[o0]+l+e+'),
  ('n+[i1!]+g+g+'), ('f+[a@4]+g+'), ('r+[e3]+t+[a@4]+r+d+'), ('t+r+[a@4]+n+n+y+'), ('k+[i1]+k+[e3]+'), ('d+y+k+[e3]+'), ('n+[a@4]+z+[i1]+')
on conflict do nothing;

-- ---------- membership ----------
create table if not exists public.members (user_id uuid primary key references auth.users (id) on delete cascade, joined_at timestamptz not null default now());
alter table public.members enable row level security;
drop policy if exists "members: read own" on public.members;
create policy "members: read own" on public.members for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.members from anon, authenticated;
grant select on public.members to authenticated;

create table if not exists public.bans (user_id uuid primary key references auth.users (id) on delete cascade, reason text, banned_at timestamptz not null default now());
alter table public.bans enable row level security; -- no policies: invisible to players
revoke all on public.bans from anon, authenticated;

/** Is the caller allowed in? Members (or everyone, once the world is opened) who aren't banned. */
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
     and not exists (select 1 from public.bans b where b.user_id = auth.uid())
     and (exists (select 1 from public.members m where m.user_id = auth.uid())
          or coalesce((select c.value from private.config c where c.key = 'open'), 'false') = 'true');
$$;

/** Join with the invite code. 5 tries per 10 minutes. Returns true if you're in. */
create or replace function public.join_world(code text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); h text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.bans b where b.user_id = uid) then return false; end if;
  if public.is_member() then return true; end if;
  if (select count(*) from private.join_attempts a where a.user_id = uid and a.at > now() - interval '10 minutes') >= 5 then
    raise exception 'too many tries, wait a few minutes';
  end if;
  insert into private.join_attempts (user_id) values (uid);
  select c.value into h from private.config c where c.key = 'invite_hash';
  if h is null then raise exception 'the invite code has not been set up yet'; end if;
  if extensions.crypt(coalesce(code, ''), h) = h then
    insert into public.members (user_id) values (uid) on conflict do nothing;
    return true;
  end if;
  return false;
end $$;

-- ---------- owner-only helpers (run these from the SQL editor) ----------
create or replace function public.set_invite_code(code text) returns void
language sql security definer set search_path = '' as $$
  insert into private.config (key, value) values ('invite_hash', extensions.crypt(code, extensions.gen_salt('bf')))
  on conflict (key) do update set value = excluded.value;
$$;
/** Open the doors to everyone (public launch) or close them again (invite only). */
create or replace function public.set_world_open(open boolean) returns void
language sql security definer set search_path = '' as $$
  insert into private.config (key, value) values ('open', open::text) on conflict (key) do update set value = excluded.value;
$$;
create or replace function public.ban_player(target uuid, why text default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.bans (user_id, reason) values (target, why) on conflict (user_id) do update set reason = excluded.reason;
  delete from public.members where user_id = target;
$$;
create or replace function public.unban_player(target uuid) returns void
language sql security definer set search_path = '' as $$ delete from public.bans where user_id = target; $$;
revoke execute on function public.set_invite_code(text), public.set_world_open(boolean), public.ban_player(uuid, text), public.unban_player(uuid) from public, anon, authenticated;

-- ---------- the word filter ----------
create or replace function private.scrub(s text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare p text;
begin
  for p in select w.pattern from private.banned_words w loop
    s := regexp_replace(s, '\m' || p || '\w*', '****', 'gi');
  end loop;
  return s;
end $$;
revoke execute on function private.scrub(text) from public, anon, authenticated;

-- names get scrubbed on the way in, whatever the browser sent
create or replace function private.scrub_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin new.name := left(private.scrub(new.name), 16); return new; end $$;
drop trigger if exists profiles_scrub on public.profiles;
create trigger profiles_scrub before insert or update of name on public.profiles for each row execute function private.scrub_profile();

-- ---------- profiles: members only ----------
drop policy if exists "profiles: read" on public.profiles;
create policy "profiles: read" on public.profiles for select to authenticated using ((select public.is_member()));
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id and (select public.is_member()));
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id and (select public.is_member())) with check ((select auth.uid()) = id);

-- ---------- private Realtime channels ----------
-- Members can listen on every hangout topic, but can only send (broadcast + presence) on
-- 'hangout:*'. Nobody can send on 'hangout-srv:*'; only the database does (realtime.send).
drop policy if exists "hangout: members receive" on realtime.messages;
create policy "hangout: members receive" on realtime.messages for select to authenticated
  using ((select public.is_member()) and (select realtime.topic()) like 'hangout%');
drop policy if exists "hangout: members send" on realtime.messages;
create policy "hangout: members send" on realtime.messages for insert to authenticated
  with check ((select public.is_member()) and (select realtime.topic()) like 'hangout:%');

-- ---------- chat, through the server ----------
/**
 * Say something in a room. Cleans and filters it, enforces the rate limit (one line per
 * 0.7 s, 12 a minute) and mutes, logs it for moderation, then broadcasts it on the room's
 * server channel with the caller's real id. Returns the cleaned text (or null if empty).
 */
create or replace function public.send_chat(room text, body text) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); clean text;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if room !~ '^[a-z]{2,12}$' then raise exception 'bad room'; end if;
  if exists (select 1 from private.mutes m where m.user_id = uid and m.until > now()) then raise exception 'you are muted for a while'; end if;
  if exists (select 1 from private.chat_log c where c.user_id = uid and c.at > now() - interval '700 milliseconds')
     or (select count(*) from private.chat_log c where c.user_id = uid and c.at > now() - interval '1 minute') >= 12 then
    raise exception 'slow down a little';
  end if;
  clean := left(btrim(regexp_replace(regexp_replace(coalesce(body, ''), '[[:cntrl:]]', '', 'g'), '\s+', ' ', 'g')), 80);
  if clean = '' then return null; end if;
  clean := private.scrub(clean);
  insert into private.chat_log (user_id, room, body) values (uid, room, clean);
  perform realtime.send(jsonb_build_object('id', uid, 'text', clean), 'chat', 'hangout-srv:' || room, true);
  return clean;
end $$;

/**
 * Report a player. Keeps their last few lines of chat as evidence. If three different
 * people report the same player within 10 minutes, they're muted for 30 minutes.
 */
create or replace function public.report_player(who uuid, reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if who is null or who = uid then return; end if;
  if (select count(*) from private.reports r where r.reporter = uid and r.at > now() - interval '1 hour') >= 10 then raise exception 'too many reports'; end if;
  insert into private.reports (reporter, target, reason, recent_chat)
  values (uid, who, left(coalesce(reason, ''), 200),
          (select coalesce(jsonb_agg(jsonb_build_object('room', c.room, 'text', c.body, 'at', c.at) order by c.at), '[]'::jsonb)
             from (select * from private.chat_log c2 where c2.user_id = who order by c2.at desc limit 10) c));
  if (select count(distinct r.reporter) from private.reports r where r.target = who and r.at > now() - interval '10 minutes') >= 3 then
    insert into private.mutes (user_id, until, why) values (who, now() + interval '30 minutes', 'auto: reported by 3 players')
    on conflict (user_id) do update set until = excluded.until, why = excluded.why;
  end if;
end $$;

revoke execute on function public.is_member(), public.join_world(text), public.send_chat(text, text), public.report_player(uuid, text) from public, anon;
grant execute on function public.is_member(), public.join_world(text), public.send_chat(text, text), public.report_player(uuid, text) to authenticated;
