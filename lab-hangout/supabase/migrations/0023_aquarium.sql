-- Lab Hangout: THE CITY AQUARIUM (step 18, push 1). Run after 0022_chem.sql. Safe to re-run.
--
-- THE FISH GALLERY: one tank for each thing you can catch off the Pier (private.fish), one gallery for the whole city
-- (every server). Donating puts up your biggest catch of that kind (private.catches has kept every catch since
-- 0010): it takes the tank's plaque if the tank is empty or yours is bigger than the one on show. The first time you
-- donate each kind it pays a thank-you: 1 token for junk, 2 common, 3 uncommon, 4 rare, 6 legendary (37 for all 12).
-- THE GIFT SHOP: clothes for tokens (into your inventory, like the claw machine's prizes). Its furniture is bought
-- with buy_furniture (0014_apartments.sql): the prices are added to that catalogue here.
-- Also: the 'donate' and 'feeding' daily quests, and the CURATOR badge (all 12 donated: the game claims it).
-- Keep these in step with src/game/aquarium.ts (GIFTS, THANKS), src/world/furniture.ts, src/net/localapi.ts, and
-- QUESTS / BADGES in src/game/quests.ts.

-- ---------- the gallery ----------
/** Each tank's plaque: whose fish is on show and how big it was (their name as it was when they donated). */
create table if not exists private.aq_tanks (fish text primary key, user_id uuid not null references auth.users (id) on delete cascade, name text not null, cm integer not null, at timestamptz not null default now());
/** What each player has donated (the biggest of each kind they've handed in), for the thank-you and the CURATOR badge. */
create table if not exists private.aq_donations (user_id uuid not null references auth.users (id) on delete cascade, fish text not null, cm integer not null, at timestamptz not null default now(), primary key (user_id, fish));
alter table private.aq_tanks enable row level security;
alter table private.aq_donations enable row level security;
-- your biggest catch of each kind, quickly
create index if not exists catches_user_fish on private.catches (user_id, fish, cm);

/** The FISH GALLERY: { tanks: [{ fish, name, cm, at }], best: { fish: your biggest catch }, mine: { fish: the cm you donated } }. */
create or replace function public.aquarium_tanks() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'tanks', coalesce((select jsonb_agg(jsonb_build_object('fish', t.fish, 'name', t.name, 'cm', t.cm, 'at', extract(epoch from t.at)) order by t.fish) from private.aq_tanks t), '[]'::jsonb),
    'best', coalesce((select jsonb_object_agg(c.fish, c.cm) from (select x.fish, max(x.cm) as cm from private.catches x where x.user_id = uid group by x.fish) c), '{}'::jsonb),
    'mine', coalesce((select jsonb_object_agg(d.fish, d.cm) from private.aq_donations d where d.user_id = uid), '{}'::jsonb));
end $$;

/**
 * Donate your biggest catch of `fish` to the gallery. It takes the tank's plaque if the tank is empty or yours is bigger
 * than the one on show (a tie keeps the one already there). Returns { plaque (it's yours now), cm, first (your first of
 * this kind), paid, tokens, prev (whose plaque it was, when yours took someone else's) }.
 */
create or replace function public.donate_fish(fish text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); f private.fish; best integer; nm text; cur private.aq_tanks; took boolean := false; first boolean; paid integer := 0; bal integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  select * into f from private.fish x where x.name = donate_fish.fish;
  if f.name is null then raise exception 'there is no tank for that'; end if;
  perform pg_advisory_xact_lock(hashtext('aquarium:' || f.name));
  select max(c.cm) into best from private.catches c where c.user_id = uid and c.fish = f.name;
  if best is null then raise exception 'catch one off the Pier first'; end if;
  select coalesce(nullif(p.name, ''), 'SOMEONE') into nm from public.profiles p where p.id = uid;
  select * into cur from private.aq_tanks t where t.fish = f.name for update;
  if cur.fish is null or best > cur.cm then
    insert into private.aq_tanks (fish, user_id, name, cm) values (f.name, uid, coalesce(nm, 'SOMEONE'), best)
    on conflict on constraint aq_tanks_pkey do update set user_id = excluded.user_id, name = excluded.name, cm = excluded.cm, at = now();
    took := true;
  end if;
  first := not exists (select 1 from private.aq_donations d where d.user_id = uid and d.fish = f.name);
  if not first and not took and (select d.cm from private.aq_donations d where d.user_id = uid and d.fish = f.name) >= best then raise exception 'you have donated that one already'; end if;
  insert into private.aq_donations (user_id, fish, cm) values (uid, f.name, best)
  on conflict on constraint aq_donations_pkey do update set cm = greatest(private.aq_donations.cm, excluded.cm), at = now();
  if first then
    paid := case f.rarity when 'JUNK' then 1 when 'COMMON' then 2 when 'UNCOMMON' then 3 when 'RARE' then 4 else 6 end;
    bal := private.add_tokens(uid, paid);
  else bal := public.my_tokens(); end if;
  return jsonb_build_object('plaque', took, 'cm', best, 'first', first, 'paid', paid, 'tokens', bal,
    'prev', case when took and cur.fish is not null and cur.user_id <> uid then cur.name end);
end $$;

-- ---------- the gift shop ----------
create table if not exists private.gift_items (item text primary key check (item ~ '^[a-z]{2,8}:[0-9]{1,3}$'), price integer not null check (price > 0));
alter table private.gift_items enable row level security;
insert into private.gift_items (item, price) values
  ('hat:18', 15),  -- CAPTAIN'S HAT
  ('hat:19', 12),  -- SHARK FIN
  ('face:10', 10), -- SNORKEL
  ('fit:12', 12)   -- SAILOR TOP
on conflict (item) do update set price = excluded.price;
-- and its furniture, sold with buy_furniture (0014)
insert into private.furniture (id, price, starter) values ('plush', 6, 0), ('jlamp', 14, 0), ('bottle', 10, 0), ('aqposter', 5, 0)
on conflict (id) do update set price = excluded.price;

/** Buy a piece of clothing at the GIFT SHOP (once each). Returns { item, tokens }. */
create or replace function public.gift_shop(item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); g private.gift_items; bal integer;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  select * into g from private.gift_items x where x.item = gift_shop.item;
  if g.item is null then raise exception 'the shop does not sell that'; end if;
  if exists (select 1 from public.inventory i where i.user_id = uid and i.item = g.item) then raise exception 'you have that one already'; end if;
  select w.tokens into bal from public.wallets w where w.user_id = uid for update;
  if coalesce(bal, 0) < g.price then raise exception 'that costs % tokens', g.price; end if;
  insert into public.inventory (user_id, item) values (uid, g.item);
  bal := private.add_tokens(uid, -g.price);
  return jsonb_build_object('item', g.item, 'tokens', bal);
end $$;

revoke execute on function public.aquarium_tanks(), public.donate_fish(text), public.gift_shop(text) from public, anon;
grant execute on function public.aquarium_tanks(), public.donate_fish(text), public.gift_shop(text) to authenticated;

-- ---------- quests and the badge ----------
insert into private.quest_pool (id, weight, checked) values ('donate', 1, false), ('feeding', 1, false)
on conflict (id) do update set weight = excluded.weight, checked = excluded.checked;
insert into private.badge_list (id) values ('curator') on conflict do nothing;
