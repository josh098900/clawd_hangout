-- Lab Hangout: the Moon. Run after 0018_winter.sql. Safe to re-run.
--
-- The lander, the surface, the buggy course and the crystal field all run on the wall clock in the
-- players' browsers (like the rocket), so the server only keeps what's worth tokens:
--   * The ASSAY machine in the Moon Base: hand in a moon rock you mined and the server decides what it is.
--     1 in 6 is a MOON CRYSTAL. A rock pays 1 token, a crystal 3; 15 a day in all; one rock every 20 seconds.
--     (The game can't prove you mined it, so the caps keep it small, like the spacewalk's pay.)
--   * Your fifth crystal ever brings the MOON ROVER pet ('pet:8' in your inventory).
--   * Three quests (land on the Moon, assay 3 rocks, a buggy lap) and the MOONWALKER badge.
-- Keep these in step with src/net/localapi.ts (moon), src/features/moon.ts and QUESTS / BADGES in src/game/quests.ts.

create table if not exists private.moon_assays (
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  crystal boolean not null,
  paid integer not null
);
create index if not exists moon_assays_user_at on private.moon_assays (user_id, at);
alter table private.moon_assays enable row level security;

/** Hand in a moon rock at the ASSAY machine. Returns { tokens, paid, crystal, crystals (found ever), prize ('pet:8' with the 5th crystal, else null) }. */
create or replace function public.moon_assay() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); today integer; crystal boolean; paid integer; bal integer; n integer; prize text;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  perform pg_advisory_xact_lock(hashtext('moon:' || uid::text));
  if exists (select 1 from private.moon_assays m where m.user_id = uid and m.at > now() - interval '20 seconds') then
    raise exception 'the machine is still warm: one rock every 20 seconds';
  end if;
  select coalesce(sum(m.paid), 0) into today from private.moon_assays m where m.user_id = uid and m.at >= (now() at time zone 'utc')::date::timestamp at time zone 'utc';
  crystal := random() < 1.0 / 6;
  paid := greatest(0, least(case when crystal then 3 else 1 end, 15 - today));
  insert into private.moon_assays (user_id, crystal, paid) values (uid, crystal, paid);
  select count(*) into n from private.moon_assays m where m.user_id = uid and m.crystal;
  if crystal and n >= 5 then
    insert into public.inventory (user_id, item) values (uid, 'pet:8') on conflict do nothing;
    if found then prize := 'pet:8'; end if;
  end if;
  if paid > 0 then bal := private.add_tokens(uid, paid); else bal := public.my_tokens(); end if;
  return jsonb_build_object('tokens', bal, 'paid', paid, 'crystal', crystal, 'crystals', n, 'prize', prize);
end $$;

/** How many moon crystals you've found (the case in the Moon Base). */
create or replace function public.moon_crystals() returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from private.moon_assays m where m.user_id = auth.uid() and m.crystal and public.is_member();
$$;

revoke execute on function public.moon_assay(), public.moon_crystals() from public, anon;
grant execute on function public.moon_assay(), public.moon_crystals() to authenticated;

-- ---------- quests + badge ----------
insert into private.quest_pool (id, weight, checked) values ('moonwalk', 1, false), ('moonrock', 0.8, false), ('buggy', 0.8, false)
on conflict (id) do update set weight = excluded.weight, checked = excluded.checked;
insert into private.badge_list (id) values ('moonwalker') on conflict do nothing;
