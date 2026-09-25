-- Lab Hangout: apartments (THE LOFTS). Run after 0013_karts.sql. Safe to re-run.
--
-- Everyone gets a three-room flat (living room, bedroom, kitchen), tied to their account. You
-- buy furniture with tokens (the server checks the price and your balance), and save a layout
-- that may only use furniture you own. Your door is 'locked' (people knock, you let them in),
-- 'friends' (anyone on your friends list) or 'open' (anyone on your server); a HOUSE PARTY opens
-- it to everyone for 30 minutes. The flat's Realtime channels are hangout:<server>:<room>.<owner>
-- (room = flat, flatbed or flatkit), and the policies below only let in people who may enter.
-- The catalogue must match FURNITURE in src/world/furniture.ts.

-- ---------- the catalogue ----------
create table if not exists private.furniture (id text primary key, price integer not null check (price >= 0), starter integer not null default 0);
alter table private.furniture enable row level security;
insert into private.furniture (id, price, starter) values
  -- floor
  ('bed', 25, 1), ('sofa', 20, 0), ('armchair', 10, 1), ('beanbag', 8, 0), ('ctable', 10, 0), ('dtable', 14, 0), ('chair', 6, 0),
  ('desk', 25, 0), ('shelf', 12, 0), ('tv', 30, 0), ('radio', 18, 0), ('arcade', 40, 0), ('tank', 25, 0), ('trophy', 20, 0),
  ('lamp', 8, 1), ('plant', 6, 1), ('cactus', 4, 0), ('guitar', 15, 0), ('keys', 30, 0), ('petbed', 6, 0), ('disco', 35, 0),
  ('duck', 12, 0), ('fridge2', 16, 0),
  -- rugs
  ('rug', 5, 1), ('rug2', 6, 0), ('rug3', 12, 0),
  -- wall
  ('poster1', 5, 0), ('poster2', 5, 0), ('poster3', 5, 0), ('clock', 6, 0), ('painting', 12, 0), ('neon', 18, 0), ('lights', 10, 0), ('wshelf', 8, 0),
  -- wallpapers and floors (the first two of each are free for everyone)
  ('wall0', 0, 0), ('wall1', 0, 0), ('wall2', 8, 0), ('wall3', 8, 0), ('wall4', 15, 0), ('wall5', 15, 0),
  ('floor0', 0, 0), ('floor1', 0, 0), ('floor2', 8, 0), ('floor3', 10, 0), ('floor4', 15, 0)
on conflict (id) do update set price = excluded.price, starter = excluded.starter;

-- ---------- what you own (a count per item: you can have 4 chairs) ----------
create table if not exists public.furniture_owned (
  user_id uuid not null references auth.users (id) on delete cascade,
  item text not null references private.furniture (id),
  n integer not null default 1 check (n between 0 and 50),
  primary key (user_id, item)
);
alter table public.furniture_owned enable row level security;
drop policy if exists "furniture: read own" on public.furniture_owned;
create policy "furniture: read own" on public.furniture_owned for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.furniture_owned from anon, authenticated;
grant select on public.furniture_owned to authenticated;

-- ---------- the flats ----------
create table if not exists public.apartments (
  owner uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  layout jsonb not null default '{}'::jsonb check (jsonb_typeof(layout) = 'object' and pg_column_size(layout) < 24000),
  door text not null default 'locked' check (door in ('locked', 'friends', 'open')),
  party_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.apartments enable row level security;
revoke all on public.apartments from anon, authenticated;
-- (read through get_flat / flat_doors only, so the privacy rules live in one place)

create table if not exists private.flat_invites (owner uuid not null, guest uuid not null, until timestamptz not null, primary key (owner, guest));
alter table private.flat_invites enable row level security;

/** May the current user come into `owner`'s flat? */
create or replace function public.can_enter_flat(owner uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); a public.apartments;
begin
  if uid is null or owner is null then return false; end if;
  if uid = owner then return true; end if;
  select * into a from public.apartments x where x.owner = can_enter_flat.owner;
  if a.owner is null then return false; end if;
  if a.door = 'open' or a.party_until > now() then return true; end if;
  if exists (select 1 from private.flat_invites i where i.owner = can_enter_flat.owner and i.guest = uid and i.until > now()) then return true; end if;
  if a.door = 'friends' then
    return exists (select 1 from public.saves s, jsonb_array_elements(case when jsonb_typeof(s.data -> 'friends') = 'array' then s.data -> 'friends' else '[]'::jsonb end) f
                   where s.user_id = can_enter_flat.owner and jsonb_typeof(f) = 'array' and f ->> 0 = uid::text);
  end if;
  return false;
end $$;
-- (public, not private: the Realtime policies below call it as the signed-in user; it only says yes or no)
revoke execute on function public.can_enter_flat(uuid) from public, anon;
grant execute on function public.can_enter_flat(uuid) to authenticated;

/** The owner id in a flat channel's room part ('flat.<uuid>'), or null for any other room. */
create or replace function public.flat_owner(room text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  if room !~ '^flat[a-z]{0,4}\.[0-9a-f-]{36}$' then return null; end if;
  return split_part(room, '.', 2)::uuid;
exception when others then return null;
end $$;
revoke execute on function public.flat_owner(text) from public, anon;
grant execute on function public.flat_owner(text) to authenticated;

-- ---------- Realtime: your server's channels, and flats only if you may go in ----------
drop policy if exists "hangout: members receive" on realtime.messages;
create policy "hangout: members receive" on realtime.messages for select to authenticated
  using ((select public.is_member()) and (select realtime.topic()) like 'hangout%'
         and split_part((select realtime.topic()), ':', 2) = (select public.my_server())
         and (split_part((select realtime.topic()), ':', 3) not like 'flat%' or public.can_enter_flat(public.flat_owner(split_part((select realtime.topic()), ':', 3)))));
drop policy if exists "hangout: members send" on realtime.messages;
create policy "hangout: members send" on realtime.messages for insert to authenticated
  with check ((select public.is_member()) and (select realtime.topic()) like 'hangout:%'
              and split_part((select realtime.topic()), ':', 2) = (select public.my_server())
              and (split_part((select realtime.topic()), ':', 3) not like 'flat%' or public.can_enter_flat(public.flat_owner(split_part((select realtime.topic()), ':', 3)))));

-- chat works in flats too (the room part may carry the owner's id)
create or replace function public.send_chat(room text, body text) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); clean text; srv text := public.my_server();
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if srv is null then raise exception 'you are not on a server (reload to pick one)'; end if;
  if room !~ '^[a-z]{2,12}(\.[0-9a-f-]{36})?$' then raise exception 'bad room'; end if;
  if room like 'flat%' and not public.can_enter_flat(public.flat_owner(room)) then raise exception 'not allowed'; end if;
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

-- ---------- the API ----------
drop function if exists public.buy_furniture(text);
drop function if exists public.let_in(uuid);
/**
 * Your flat (made, with a starter kit, the first time). Returns { layout, door, party, owned: {item: n}, tokens }.
 */
create or replace function public.my_flat() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); a public.apartments; nm text;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  select * into a from public.apartments x where x.owner = uid;
  if a.owner is null then
    select coalesce(nullif(p.name, ''), 'SOMEONE') into nm from public.profiles p where p.id = uid;
    insert into public.apartments (owner, name) values (uid, coalesce(nm, 'SOMEONE')) on conflict do nothing;
    insert into public.furniture_owned (user_id, item, n) select uid, f.id, f.starter from private.furniture f where f.starter > 0
    on conflict (user_id, item) do nothing;
    select * into a from public.apartments x where x.owner = uid;
  end if;
  return jsonb_build_object('layout', a.layout, 'door', a.door, 'party', extract(epoch from a.party_until),
    'owned', coalesce((select jsonb_object_agg(o.item, o.n) from public.furniture_owned o where o.user_id = uid and o.n > 0), '{}'::jsonb),
    'tokens', public.my_tokens());
end $$;

/** Someone's flat, if you may go in: { name, layout, door, party } (an error if you may not). */
create or replace function public.get_flat(owner uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.apartments;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  select * into a from public.apartments x where x.owner = get_flat.owner;
  if a.owner is null then raise exception 'they have not moved in yet'; end if;
  if not public.can_enter_flat(get_flat.owner) then raise exception 'the door is locked'; end if;
  return jsonb_build_object('name', a.name, 'layout', a.layout, 'door', a.door, 'party', extract(epoch from a.party_until));
end $$;

/** Door status for a list of players (the lobby's directory): [{ owner, name, door, party, can }]. */
create or replace function public.flat_doors(ids uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('owner', a.owner, 'name', a.name, 'door', a.door, 'party', extract(epoch from a.party_until), 'can', public.can_enter_flat(a.owner)))
    from public.apartments a where a.owner = any (ids[1:40])), '[]'::jsonb);
end $$;

/** Buy one of `what`. Returns { tokens, n } (how many you own now). */
create or replace function public.buy_furniture(what text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); f private.furniture; bal integer; n integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  select * into f from private.furniture x where x.id = buy_furniture.what;
  if f.id is null then raise exception 'no such thing'; end if;
  if f.price = 0 then raise exception 'that one is free'; end if;
  if (f.id like 'wall%' or f.id like 'floor%') and exists (select 1 from public.furniture_owned o where o.user_id = uid and o.item = f.id and o.n > 0) then raise exception 'you already have that'; end if;
  select w.tokens into bal from public.wallets w where w.user_id = uid for update;
  if coalesce(bal, 0) < f.price then raise exception 'that costs % tokens', f.price; end if;
  select o.n into n from public.furniture_owned o where o.user_id = uid and o.item = f.id;
  if coalesce(n, 0) >= 20 then raise exception 'that is plenty of those'; end if;
  bal := private.add_tokens(uid, -f.price);
  insert into public.furniture_owned (user_id, item, n) values (uid, f.id, 1)
  on conflict (user_id, item) do update set n = public.furniture_owned.n + 1 returning public.furniture_owned.n into n;
  return jsonb_build_object('tokens', bal, 'n', n);
end $$;

/**
 * Save your flat. layout = { rooms: { liv|bed|kit: { w: 'wallN', f: 'floorN', items: [[id, x, row, flip], ...] } }, show: {...} }.
 * Every item must be owned (as many as you place), wallpapers and floors free or owned.
 */
create or replace function public.save_flat(layout jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r text; room jsonb; it jsonb; used jsonb := '{}'::jsonb; k text; owned integer; price integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if jsonb_typeof(layout) <> 'object' or pg_column_size(layout) >= 24000 then raise exception 'that layout is too big'; end if;
  if jsonb_typeof(layout -> 'rooms') <> 'object' then raise exception 'bad layout'; end if;
  for r, room in select * from jsonb_each(layout -> 'rooms') loop
    if r not in ('liv', 'bed', 'kit') then raise exception 'no such room'; end if;
    if jsonb_typeof(room -> 'items') <> 'array' or jsonb_array_length(room -> 'items') > 40 then raise exception 'too many things in one room'; end if;
    for k in select v from (values (room ->> 'w'), (room ->> 'f')) t(v) where v is not null loop
      select f.price into price from private.furniture f where f.id = k and (f.id like 'wall%' or f.id like 'floor%');
      if price is null then raise exception 'no such wallpaper or floor'; end if;
      if price > 0 and not exists (select 1 from public.furniture_owned o where o.user_id = uid and o.item = k and o.n > 0) then raise exception 'you need to buy % first', k; end if;
    end loop;
    for it in select * from jsonb_array_elements(room -> 'items') loop
      if jsonb_typeof(it) <> 'array' or jsonb_array_length(it) <> 4 or jsonb_typeof(it -> 0) <> 'string' or jsonb_typeof(it -> 1) <> 'number' or jsonb_typeof(it -> 2) <> 'number' then raise exception 'bad item'; end if;
      used := jsonb_set(used, array[it ->> 0], to_jsonb(coalesce((used ->> (it ->> 0))::integer, 0) + 1));
    end loop;
  end loop;
  for k in select jsonb_object_keys(used) loop
    select o.n into owned from public.furniture_owned o where o.user_id = uid and o.item = k;
    if coalesce(owned, 0) < (used ->> k)::integer then raise exception 'you only own % of %', coalesce(owned, 0), k; end if;
  end loop;
  insert into public.apartments (owner, layout) values (uid, layout)
  on conflict (owner) do update set layout = excluded.layout, updated_at = now();
end $$;

/** Locked, friends or open. */
create or replace function public.set_door(door text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if door not in ('locked', 'friends', 'open') then raise exception 'bad door'; end if;
  update public.apartments set door = set_door.door where owner = auth.uid();
  if not found then raise exception 'move in first'; end if;
end $$;

/** HOUSE PARTY: everyone on your server may come in for 30 minutes (or stop it). Returns when it ends (epoch s, or null). */
create or replace function public.flat_party(on_ boolean) returns double precision
language plpgsql security definer set search_path = '' as $$
declare u timestamptz;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  update public.apartments set party_until = case when on_ then now() + interval '30 minutes' else null end where owner = auth.uid() returning party_until into u;
  if not found then raise exception 'move in first'; end if;
  return extract(epoch from u);
end $$;

/** Let someone who knocked in (for 30 minutes). */
create or replace function public.let_in(who uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if who is null or who = auth.uid() then raise exception 'bad guest'; end if;
  if not exists (select 1 from public.apartments a where a.owner = auth.uid()) then raise exception 'move in first'; end if;
  delete from private.flat_invites i where i.until < now() - interval '1 day';
  insert into private.flat_invites (owner, guest, until) values (auth.uid(), who, now() + interval '30 minutes')
  on conflict (owner, guest) do update set until = excluded.until;
end $$;

revoke execute on function public.my_flat(), public.get_flat(uuid), public.flat_doors(uuid[]), public.buy_furniture(text), public.save_flat(jsonb), public.set_door(text), public.flat_party(boolean), public.let_in(uuid) from public, anon;
grant execute on function public.my_flat(), public.get_flat(uuid), public.flat_doors(uuid[]), public.buy_furniture(text), public.save_flat(jsonb), public.set_door(text), public.flat_party(boolean), public.let_in(uuid) to authenticated;

insert into private.quest_pool (id, weight, checked) values ('home', 1, false), ('visit', 0.8, false)
on conflict (id) do update set weight = excluded.weight, checked = excluded.checked;
insert into private.badge_list (id) values ('homeowner'), ('host') on conflict do nothing;
