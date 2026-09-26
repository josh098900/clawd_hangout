-- Lab Hangout: THE SCIENCE WING's reactor. Run after 0020_map.sql. Safe to re-run.
--
-- A reactor shift is run in the players' browsers (like the Diner's kitchen), so the server can't check the score.
-- The pay is kept small instead: nothing under 40% GRID, then 1 token + 1 per 25% (at most 5) for a shift, at most
-- one pay every 200 s (a shift is 240 s) and 15 tokens a day.
-- Also: the 'reactor' daily quest (run a shift) and the CHIEF ENGINEER badge (90% GRID in a shift: the game awards it).
-- Keep these in step with src/game/reactor.ts, src/net/localapi.ts (tips.reactor) and QUESTS / BADGES in src/game/quests.ts.

create table if not exists private.reactor_pays (user_id uuid not null references auth.users (id) on delete cascade, at timestamptz not null default now(), score integer not null, paid integer not null);
create index if not exists reactor_pays_user_at on private.reactor_pays (user_id, at);
alter table private.reactor_pays enable row level security;

/** Pay for the reactor shift you just worked (score = its GRID %, 0..100). Returns { tokens: your balance, paid }. */
create or replace function public.reactor_pay(score integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); today integer; paid integer; bal integer; sc integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  sc := greatest(0, least(coalesce(score, 0), 100));
  if sc <= 0 then return jsonb_build_object('tokens', public.my_tokens(), 'paid', 0); end if;
  perform pg_advisory_xact_lock(hashtext('reactor_pay:' || uid::text));
  if exists (select 1 from private.reactor_pays r where r.user_id = uid and r.at > now() - interval '200 seconds') then raise exception 'pay comes once a shift'; end if;
  select coalesce(sum(r.paid), 0) into today from private.reactor_pays r where r.user_id = uid and r.at >= (now() at time zone 'utc')::date::timestamp at time zone 'utc';
  paid := case when sc < 40 then 0 else greatest(0, least(5, 1 + sc / 25, 15 - today)) end;
  insert into private.reactor_pays (user_id, score, paid) values (uid, sc, paid);
  if paid > 0 then bal := private.add_tokens(uid, paid); else bal := public.my_tokens(); end if;
  return jsonb_build_object('tokens', bal, 'paid', paid);
end $$;
revoke execute on function public.reactor_pay(integer) from public, anon;
grant execute on function public.reactor_pay(integer) to authenticated;

insert into private.quest_pool (id, weight, checked) values ('reactor', 1, false)
on conflict (id) do update set weight = excluded.weight, checked = excluded.checked;
insert into private.badge_list (id) values ('engineer') on conflict do nothing;
