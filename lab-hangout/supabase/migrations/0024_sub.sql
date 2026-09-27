-- Lab Hangout: SARDINE 1, the City Aquarium's submarine (step 18, push 2). Run after 0023_aquarium.sql. Safe to re-run.
--
-- A dive is run in the players' browsers (the helm, the photos, the claw), so the server can't check the finds or the mission.
-- The pay is kept small instead, and the server keeps the timetable: a dive surfaces at 470 s into every 8 minutes of the
-- clock (src/game/sub.ts), and dive_pay only pays in the 100 s round that (30 s before to 70 s after), once per dive:
-- 1 token for the dive + 1 per find in the TREASURE BIN (up to 4) + 3 if the mission's done = at most 8, and 24 a day.
-- THE OTHER BOOT: whoever brings it up first puts it in the aquarium's OLD BOOT tank, next to its partner, for the whole city
-- (a row in private.aq_tanks, so aquarium_tanks() returns it with the tanks).
-- Also: the 'dive' daily quest (go on a dive) and the MARINE BIOLOGIST badge (all 20 in the SEA LIFE LOG: the game claims it).
-- Keep these in step with src/game/sub.ts (divePay, the timetable), src/net/localapi.ts (sub) and QUESTS / BADGES in src/game/quests.ts.

create table if not exists private.sub_pays (user_id uuid not null references auth.users (id) on delete cascade, n bigint not null, paid integer not null, at timestamptz not null default now(), primary key (user_id, n));
create index if not exists sub_pays_user_at on private.sub_pays (user_id, at);
alter table private.sub_pays enable row level security;

/** The clock the dives run on (epoch seconds). The SQL tests redefine it to pretend it's just after a dive; players can't. */
create or replace function private.dive_clock() returns double precision language sql stable set search_path = '' as $$ select extract(epoch from now())::double precision $$;
/** Which dive just surfaced at epoch s (its number), if s is in its pay window (30 s before to 70 s after it surfaces), else null. */
create or replace function private.dive_surfaced(s double precision) returns bigint language sql immutable set search_path = '' as $$
  select case when s >= q.n * 480 + 470 - 30 and s <= q.n * 480 + 470 + 70 then q.n end from (select round((s - 470) / 480)::bigint as n) q
$$;

/** Pay for the dive that just surfaced: finds = what's in the TREASURE BIN, mission = done. Returns { tokens: your balance, paid }. */
create or replace function public.dive_pay(finds integer, mission boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); dn bigint; today integer; paid integer; bal integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  dn := private.dive_surfaced(private.dive_clock());
  if dn is null then raise exception 'pay comes just after a dive surfaces'; end if;
  perform pg_advisory_xact_lock(hashtext('dive_pay:' || uid::text));
  if exists (select 1 from private.sub_pays p where p.user_id = uid and p.n = dn) then raise exception 'that dive was paid already'; end if;
  select coalesce(sum(p.paid), 0) into today from private.sub_pays p where p.user_id = uid and p.at >= (now() at time zone 'utc')::date::timestamp at time zone 'utc';
  paid := greatest(0, least(1 + greatest(0, least(coalesce(finds, 0), 4)) + case when coalesce(mission, false) then 3 else 0 end, 24 - today));
  insert into private.sub_pays (user_id, n, paid) values (uid, dn, paid);
  if paid > 0 then bal := private.add_tokens(uid, paid); else bal := public.my_tokens(); end if;
  return jsonb_build_object('tokens', bal, 'paid', paid);
end $$;

/** THE OTHER BOOT goes up in the gallery next to the OLD BOOT, with your name, if nobody's brought one up yet. True if yours is the one. */
create or replace function public.found_boot() returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); nm text;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  perform pg_advisory_xact_lock(hashtext('aquarium:OTHER BOOT'));
  if exists (select 1 from private.aq_tanks t where t.fish = 'OTHER BOOT') then return false; end if;
  select coalesce(nullif(p.name, ''), 'SOMEONE') into nm from public.profiles p where p.id = uid;
  insert into private.aq_tanks (fish, user_id, name, cm) values ('OTHER BOOT', uid, coalesce(nm, 'SOMEONE'), 0);
  return true;
end $$;

revoke execute on function public.dive_pay(integer, boolean), public.found_boot() from public, anon;
grant execute on function public.dive_pay(integer, boolean), public.found_boot() to authenticated;

insert into private.quest_pool (id, weight, checked) values ('dive', 1, false)
on conflict (id) do update set weight = excluded.weight, checked = excluded.checked;
insert into private.badge_list (id) values ('biologist') on conflict do nothing;
