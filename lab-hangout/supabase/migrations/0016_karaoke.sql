-- Lab Hangout: karaoke on the Stage. Run after 0015_space.sql. Safe to re-run.
--
-- A song is played in the players' browsers (like the Diner's shifts), so the server can't check
-- the score. Tips from the crowd are kept small instead: nothing under 40, then 1 token + 1 per 30
-- points (at most 4 a song), at most one tip every 30 s (the shortest song is ~40 s) and 12 a day.
-- The score sent already includes the crowd's HYPE bonus (see src/game/karaoke.ts).

create table if not exists private.karaoke_tips (user_id uuid not null, at timestamptz not null default now(), score integer not null, paid integer not null);
create index if not exists karaoke_tips_user_at on private.karaoke_tips (user_id, at);
alter table private.karaoke_tips enable row level security;

/** Tips for the song you just performed. Returns { tokens: your balance, paid }. */
create or replace function public.karaoke_tip(score integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); today integer; paid integer; bal integer; sc integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if score is null or score <= 0 then return jsonb_build_object('tokens', public.my_tokens(), 'paid', 0); end if;
  sc := least(score, 100);
  perform pg_advisory_xact_lock(hashtext('karaoke_tip:' || uid::text));
  if exists (select 1 from private.karaoke_tips t where t.user_id = uid and t.at > now() - interval '30 seconds') then raise exception 'tips come once a song'; end if;
  select coalesce(sum(t.paid), 0) into today from private.karaoke_tips t where t.user_id = uid and t.at >= (now() at time zone 'utc')::date::timestamp at time zone 'utc';
  paid := case when sc < 40 then 0 else greatest(0, least(4, 1 + sc / 30, 12 - today)) end;
  insert into private.karaoke_tips (user_id, score, paid) values (uid, sc, paid);
  if paid > 0 then bal := private.add_tokens(uid, paid); else bal := public.my_tokens(); end if;
  return jsonb_build_object('tokens', bal, 'paid', paid);
end $$;
revoke execute on function public.karaoke_tip(integer) from public, anon;
grant execute on function public.karaoke_tip(integer) to authenticated;
