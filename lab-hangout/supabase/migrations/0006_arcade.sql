-- Lab Hangout: the Arcade's claw machine. Run after 0005_servers.sql. Safe to re-run.
--
-- play_claw() is the only way to win a prize: it checks you can pay, takes 3 tokens, rolls a
-- prize ON THE SERVER (weighted by rarity) and puts it in your inventory. Already had it?
-- You get 1 token back. The browser only animates the result it's given.
--
-- The prize list must match CLAW in src/entities/critter.ts (item ids are 'slot:index').
-- Owner: change odds with  update private.claw_prizes set weight = 2 where item = 'hat:10';

create table if not exists private.claw_prizes (item text primary key check (item ~ '^[a-z]{2,8}:[0-9]{1,3}$'), weight integer not null check (weight > 0));
create table if not exists private.claw_plays (id bigserial primary key, user_id uuid not null, item text not null, dupe boolean not null, at timestamptz not null default now());
create index if not exists claw_plays_user_at on private.claw_plays (user_id, at);
alter table private.claw_prizes enable row level security;
alter table private.claw_plays enable row level security;

insert into private.claw_prizes (item, weight) values
  ('hat:6', 10), ('face:4', 10), ('fit:4', 10), ('pet:4', 10), ('pet:3', 10),   -- common: party hat, mustache, hoodie, duck, crab
  ('hat:7', 6), ('hat:9', 6), ('face:5', 6), ('pet:2', 6),                      -- uncommon: cowboy, top hat, monocle, cat
  ('hat:8', 3), ('fit:5', 3), ('pet:5', 3),                                     -- rare: wizard, cape, ghost
  ('hat:10', 1)                                                                 -- legendary: halo
on conflict (item) do update set weight = excluded.weight;

/** Play the claw: 3 tokens. Returns { item, dupe, tokens }. */
create or replace function public.play_claw() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); bal integer; prize text; dup boolean;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if exists (select 1 from private.claw_plays c where c.user_id = uid and c.at > now() - interval '2 seconds') then raise exception 'the claw is still moving'; end if;
  select w.tokens into bal from public.wallets w where w.user_id = uid for update;
  if coalesce(bal, 0) < 3 then raise exception 'you need 3 tokens (pick up coins on the Square)'; end if;
  -- weighted pick: smallest -ln(u)/weight wins (an exponential race)
  select p.item into prize from private.claw_prizes p order by -ln(1 - random()) / p.weight limit 1;
  dup := exists (select 1 from public.inventory i where i.user_id = uid and i.item = prize);
  if not dup then insert into public.inventory (user_id, item) values (uid, prize); end if;
  bal := private.add_tokens(uid, case when dup then -2 else -3 end);
  insert into private.claw_plays (user_id, item, dupe) values (uid, prize, dup);
  return jsonb_build_object('item', prize, 'dupe', dup, 'tokens', bal);
end $$;

revoke execute on function public.play_claw() from public, anon;
grant execute on function public.play_claw() to authenticated;
