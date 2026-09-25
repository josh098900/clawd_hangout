-- Lab Hangout: the Diner (co-op cooking). Run after 0011_weather.sql. Safe to re-run.
--
-- A kitchen shift is run in the players' browsers (like the party games), so the server can't
-- check the score. Tips are kept small instead: 1 token + 1 per 40 points (at most 5) for a
-- shift, at most one tip every 150 s (a shift is 180 s) and 15 tokens a day.
-- Also: the 'diner' daily quest (work a shift) and the HEAD CHEF badge (the game awards it).
-- Keep these in step with src/game/diner.ts and QUESTS / BADGES in src/game/quests.ts.

create table if not exists private.diner_tips (user_id uuid not null, at timestamptz not null default now(), score integer not null, paid integer not null);
create index if not exists diner_tips_user_at on private.diner_tips (user_id, at);
alter table private.diner_tips enable row level security;

/** Tips for the shift you just worked. Returns { tokens: your balance, paid }. */
create or replace function public.diner_tip(score integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); today integer; paid integer; bal integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if score is null or score <= 0 then return jsonb_build_object('tokens', public.my_tokens(), 'paid', 0); end if;
  perform pg_advisory_xact_lock(hashtext('diner_tip:' || uid::text));
  if exists (select 1 from private.diner_tips t where t.user_id = uid and t.at > now() - interval '150 seconds') then raise exception 'tips come once a shift'; end if;
  select coalesce(sum(t.paid), 0) into today from private.diner_tips t where t.user_id = uid and t.at >= (now() at time zone 'utc')::date::timestamp at time zone 'utc';
  paid := greatest(0, least(5, 1 + least(score, 100000) / 40, 15 - today));
  insert into private.diner_tips (user_id, score, paid) values (uid, least(score, 100000), paid);
  if paid > 0 then bal := private.add_tokens(uid, paid); else bal := public.my_tokens(); end if;
  return jsonb_build_object('tokens', bal, 'paid', paid);
end $$;
revoke execute on function public.diner_tip(integer) from public, anon;
grant execute on function public.diner_tip(integer) to authenticated;

insert into private.quest_pool (id, weight, checked) values ('diner', 1, false)
on conflict (id) do update set weight = excluded.weight, checked = excluded.checked;
insert into private.badge_list (id) values ('chef') on conflict do nothing;
