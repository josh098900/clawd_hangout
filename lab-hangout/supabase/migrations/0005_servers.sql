-- Lab Hangout: fixed servers with a player cap. Run after 0004_accounts.sql. Safe to re-run.
--
-- Each server is its own copy of the world: its channels are 'hangout:<server>:<room>',
-- 'hangout-srv:<server>:<room>' and 'hangout:<server>:lobby'. To get into a server's channels
-- you need a live seat there (claim_seat), and claim_seat refuses when the server is full.
-- Realtime checks RLS when you join a channel, so the cap is enforced by the server, not the
-- browser. A seat stays live while the browser pings it (every 30 s; it lapses after 90 s).
--
-- Owner, from the SQL editor:
--   update private.servers set cap = 20 where id = 'one';                 -- change a cap
--   insert into private.servers (id, name, cap, sort) values ('four', 'LAB 4', 12, 4);   -- add one
--
-- NOTE: this changes the channel names, so push the matching game build right after running it.

create table if not exists private.servers (
  id text primary key check (id ~ '^[a-z]{2,10}$'),
  name text not null, cap integer not null check (cap between 1 and 200), sort integer not null default 0
);
create table if not exists private.seats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  server text not null references private.servers (id) on delete cascade,
  seen timestamptz not null default now()
);
create index if not exists seats_server_seen on private.seats (server, seen);
alter table private.servers enable row level security;
alter table private.seats enable row level security;

insert into private.servers (id, name, cap, sort) values ('one', 'LAB 1', 12, 1), ('two', 'LAB 2', 12, 2), ('three', 'LAB 3', 12, 3)
on conflict (id) do nothing;

/** The server you have a live seat on (null if none). Used by the Realtime policies. */
create or replace function public.my_server() returns text
language sql stable security definer set search_path = '' as $$
  select s.server from private.seats s where s.user_id = auth.uid() and s.seen > now() - interval '90 seconds';
$$;

/**
 * Every server with how many players are on it. `friends` = ids you starred; each server
 * lists which of them are there (at most 50 are looked up).
 */
create or replace function public.list_servers(friends uuid[] default '{}')
returns table (id text, name text, players integer, cap integer, here uuid[])
language sql stable security definer set search_path = '' as $$
  select v.id, v.name,
         (select count(*)::integer from private.seats s where s.server = v.id and s.seen > now() - interval '90 seconds'),
         v.cap,
         coalesce((select array_agg(s.user_id) from private.seats s
                    where s.server = v.id and s.seen > now() - interval '90 seconds'
                      and s.user_id = any ((coalesce(friends, '{}'::uuid[]))[1:50])), '{}'::uuid[])
  from private.servers v
  where public.is_member()
  order by v.sort, v.id;
$$;

/** Take a seat on `server` (moving off any other). Raises 'that server is full' when it is. */
create or replace function public.claim_seat(server text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c integer; n integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  select v.cap into c from private.servers v where v.id = server;
  if c is null then raise exception 'no such server'; end if;
  perform pg_advisory_xact_lock(hashtext('seat:' || server));
  select count(*) into n from private.seats s where s.server = claim_seat.server and s.user_id <> uid and s.seen > now() - interval '90 seconds';
  if n >= c then raise exception 'that server is full'; end if;
  insert into private.seats (user_id, server, seen) values (uid, server, now())
  on conflict (user_id) do update set server = excluded.server, seen = excluded.seen;
end $$;

/** Keep your seat alive. False if it had already lapsed (take it again with claim_seat). */
create or replace function public.seat_ping() returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update private.seats set seen = now() where user_id = auth.uid() and seen > now() - interval '90 seconds';
  return found;
end $$;

create or replace function public.leave_seat() returns void
language sql security definer set search_path = '' as $$ delete from private.seats where user_id = auth.uid(); $$;

-- ---------- Realtime: only your server's channels ----------
drop policy if exists "hangout: members receive" on realtime.messages;
create policy "hangout: members receive" on realtime.messages for select to authenticated
  using ((select public.is_member()) and (select realtime.topic()) like 'hangout%'
         and split_part((select realtime.topic()), ':', 2) = (select public.my_server()));
drop policy if exists "hangout: members send" on realtime.messages;
create policy "hangout: members send" on realtime.messages for insert to authenticated
  with check ((select public.is_member()) and (select realtime.topic()) like 'hangout:%'
              and split_part((select realtime.topic()), ':', 2) = (select public.my_server()));

-- ---------- chat goes to the room on your server ----------
create or replace function public.send_chat(room text, body text) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); clean text; srv text := public.my_server();
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if srv is null then raise exception 'you are not on a server (reload to pick one)'; end if;
  if room !~ '^[a-z]{2,12}$' then raise exception 'bad room'; end if;
  if exists (select 1 from private.mutes m where m.user_id = uid and m.until > now()) then raise exception 'you are muted for a while'; end if;
  if exists (select 1 from private.chat_log c where c.user_id = uid and c.at > now() - interval '700 milliseconds')
     or (select count(*) from private.chat_log c where c.user_id = uid and c.at > now() - interval '1 minute') >= 12 then
    raise exception 'slow down a little';
  end if;
  clean := left(btrim(regexp_replace(regexp_replace(coalesce(body, ''), '[[:cntrl:]]', '', 'g'), '\s+', ' ', 'g')), 80);
  if clean = '' then return null; end if;
  clean := private.scrub(clean);
  insert into private.chat_log (user_id, room, body) values (uid, srv || ':' || room, clean);
  perform realtime.send(jsonb_build_object('id', uid, 'text', clean), 'chat', 'hangout-srv:' || srv || ':' || room, true);
  return clean;
end $$;

revoke execute on function public.my_server(), public.list_servers(uuid[]), public.claim_seat(text), public.seat_ping(), public.leave_seat() from public, anon;
grant execute on function public.my_server(), public.list_servers(uuid[]), public.claim_seat(text), public.seat_ping(), public.leave_seat() to authenticated;
