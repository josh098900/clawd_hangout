-- Lab Hangout: the photo wall in the Lab. Run after 0016_karaoke.sql. Safe to re-run.
--
-- After the Cinema's photo booth, PIN IT sends your strip (a small PNG, sent as a data URL) to be
-- reviewed. The owner (anyone in private.admins) approves or rejects it from the game's MODERATE
-- panel; approved strips go up on the Lab's corkboard for everyone. Anyone can heart a photo once;
-- the most-hearted photo approved in the last 7 days is the PHOTO OF THE WEEK (a gold frame).
-- Limits: 3 pins a day, and at most 3 of yours waiting for review. The server checks each upload
-- really is a small PNG. Your own approved photo can hang in your flat (the PHOTO FRAME piece).
--
-- One-time setup, in the SQL editor: make yourself the owner (use the email you log in with):
--   select public.make_admin('you@example.com');

-- ---------- owners ----------
create table if not exists private.admins (user_id uuid primary key references auth.users (id) on delete cascade);
alter table private.admins enable row level security;

/** Is the signed-in player an owner (moderator)? */
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.admins a where a.user_id = auth.uid());
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

/** SQL editor only: make the player who logs in with `login` (their email) an owner. Returns how many accounts matched. */
create or replace function public.make_admin(login text) returns integer
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.admins (user_id) select u.id from auth.users u where lower(u.email) = lower(trim(login)) on conflict do nothing;
  return (select count(*) from private.admins a join auth.users u on u.id = a.user_id where lower(u.email) = lower(trim(login)));
end $$;
revoke execute on function public.make_admin(text) from public, anon, authenticated;

-- ---------- photos ----------
create table if not exists public.photos (
  id bigserial primary key,
  owner uuid not null references auth.users (id) on delete cascade,
  owner_name text not null default '',
  png text not null check (length(png) <= 90000 and png like 'data:image/png;base64,%'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists photos_status_id on public.photos (status, id desc);
create index if not exists photos_owner_at on public.photos (owner, created_at);
alter table public.photos enable row level security;
drop policy if exists "photos: approved, own, or owner" on public.photos;
create policy "photos: approved, own, or owner" on public.photos for select to authenticated
  using ((select public.is_member()) and (status = 'approved' or owner = (select auth.uid()) or (select public.is_admin())));
revoke all on public.photos from anon, authenticated;
grant select on public.photos to authenticated;

create table if not exists public.photo_hearts (
  photo bigint not null references public.photos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (photo, user_id)
);
alter table public.photo_hearts enable row level security;
revoke all on public.photo_hearts from anon, authenticated;

-- every pin, kept even if the photo is deleted, so deleting doesn't free up today's pins
create table if not exists private.photo_pins (user_id uuid not null, at timestamptz not null default now());
create index if not exists photo_pins_user_at on private.photo_pins (user_id, at);
alter table private.photo_pins enable row level security;

/** Pin your photo strip for review. Returns its id. */
create or replace function public.pin_photo(png text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); nm text; id_ bigint;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if png is null or length(png) > 90000 or png !~ '^data:image/png;base64,[A-Za-z0-9+/]+=*$' then raise exception 'that is not a photo strip'; end if;
  if substr(decode(substr(png, 23, 12), 'base64'), 1, 8) <> '\x89504e470d0a1a0a'::bytea then raise exception 'that is not a photo strip'; end if;
  perform pg_advisory_xact_lock(hashtext('pin_photo:' || uid::text));
  if (select count(*) from private.photo_pins x where x.user_id = uid and x.at >= (now() at time zone 'utc')::date::timestamp at time zone 'utc') >= 3 then raise exception 'you can pin 3 photos a day. more tomorrow!'; end if;
  if (select count(*) from public.photos p where p.owner = uid and p.status = 'pending') >= 3 then raise exception 'you have 3 photos waiting to be checked already'; end if;
  select coalesce(nullif(pr.name, ''), 'SOMEONE') into nm from public.profiles pr where pr.id = uid;
  insert into public.photos (owner, owner_name, png) values (uid, coalesce(nm, 'SOMEONE'), png) returning id into id_;
  insert into private.photo_pins (user_id) values (uid);
  return id_;
end $$;

/** Owner: approve (ok = true) or reject a waiting photo. Also takes an approved photo down (ok = false). */
create or replace function public.review_photo(photo bigint, ok boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'only the owner can do that'; end if;
  update public.photos p set status = case when ok then 'approved' else 'rejected' end, reviewed_at = now(), featured = case when ok then p.featured else false end where p.id = photo;
  if not found then raise exception 'no such photo'; end if;
end $$;

/** Take your own photo down for good (or the owner deletes anyone's). */
create or replace function public.delete_photo(photo bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  delete from public.photos p where p.id = photo and (p.owner = auth.uid() or public.is_admin());
  if not found then raise exception 'that is not your photo'; end if;
end $$;

/** Heart (or un-heart) an approved photo. Returns { hearts, mine }. */
create or replace function public.heart_photo(photo bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); mine boolean;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.photos p where p.id = photo and p.status = 'approved') then raise exception 'no such photo'; end if;
  delete from public.photo_hearts h where h.photo = heart_photo.photo and h.user_id = uid;
  mine := not found;
  if mine then insert into public.photo_hearts (photo, user_id) values (heart_photo.photo, uid); end if;
  return jsonb_build_object('hearts', (select count(*) from public.photo_hearts h where h.photo = heart_photo.photo), 'mine', mine);
end $$;

/**
 * The approved photos, newest first: `n` of them (at most 30), older than `before` (for paging;
 * null = from the top). Also says which one is the PHOTO OF THE WEEK.
 */
create or replace function public.wall_photos(n integer, before bigint default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); week bigint;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  select p.id into week from public.photos p join public.photo_hearts h on h.photo = p.id
   where p.status = 'approved' and p.reviewed_at > now() - interval '7 days' group by p.id order by count(*) desc, p.id desc limit 1;
  return jsonb_build_object('week', week, 'photos', coalesce((select jsonb_agg(x order by x.id desc) from (
    select p.id, p.owner, p.owner_name, p.png, extract(epoch from p.reviewed_at)::bigint as at,
           (select count(*) from public.photo_hearts h where h.photo = p.id) as hearts,
           exists (select 1 from public.photo_hearts h where h.photo = p.id and h.user_id = uid) as mine
      from public.photos p where p.status = 'approved' and (before is null or p.id < before)
     order by p.id desc limit greatest(1, least(coalesce(n, 10), 30))) x), '[]'::jsonb));
end $$;

/** The one photo of the week too, even when it's older than the newest few (null if none). */
create or replace function public.photo_by_id(photo bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r jsonb;
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  select jsonb_build_object('id', p.id, 'owner', p.owner, 'owner_name', p.owner_name, 'png', p.png, 'at', extract(epoch from p.reviewed_at)::bigint,
         'hearts', (select count(*) from public.photo_hearts h where h.photo = p.id), 'mine', exists (select 1 from public.photo_hearts h where h.photo = p.id and h.user_id = uid))
    into r from public.photos p where p.id = photo and p.status = 'approved';
  return r;
end $$;

/** Owner: the photos waiting for review, oldest first. */
create or replace function public.pending_photos() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'only the owner can do that'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'owner', p.owner, 'owner_name', p.owner_name, 'png', p.png, 'at', extract(epoch from p.created_at)::bigint) order by p.id)
    from public.photos p where p.status = 'pending'), '[]'::jsonb);
end $$;

/** Your own photos (newest first) and how they're getting on: pending / approved / rejected. */
create or replace function public.my_photos() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'status', p.status, 'featured', p.featured, 'at', extract(epoch from coalesce(p.reviewed_at, p.created_at))::bigint) order by p.id desc)
    from (select * from public.photos x where x.owner = auth.uid() order by x.id desc limit 20) p), '[]'::jsonb);
end $$;

/** Hang one of your approved photos in your flat's PHOTO FRAME. */
create or replace function public.feature_photo(photo bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if not public.is_member() then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.photos p where p.id = photo and p.owner = uid and p.status = 'approved') then raise exception 'only your own photos on the wall'; end if;
  update public.photos p set featured = (p.id = photo) where p.owner = uid and (p.featured or p.id = photo);
end $$;

/** The photo in `owner`'s PHOTO FRAME: the one they chose, else their newest on the wall (null if none). */
create or replace function public.flat_photo(owner uuid) returns text
language sql stable security definer set search_path = '' as $$
  select p.png from public.photos p where public.is_member() and p.owner = flat_photo.owner and p.status = 'approved' order by p.featured desc, p.id desc limit 1;
$$;

revoke execute on function public.pin_photo(text), public.review_photo(bigint, boolean), public.delete_photo(bigint), public.heart_photo(bigint), public.wall_photos(integer, bigint),
  public.photo_by_id(bigint), public.pending_photos(), public.my_photos(), public.feature_photo(bigint), public.flat_photo(uuid) from public, anon;
grant execute on function public.pin_photo(text), public.review_photo(bigint, boolean), public.delete_photo(bigint), public.heart_photo(bigint), public.wall_photos(integer, bigint),
  public.photo_by_id(bigint), public.pending_photos(), public.my_photos(), public.feature_photo(bigint), public.flat_photo(uuid) to authenticated;

-- the PHOTO FRAME for your flat (keep in step with FURNITURE in src/world/furniture.ts)
insert into private.furniture (id, price, starter) values ('pframe', 10, 0) on conflict (id) do update set price = excluded.price;
