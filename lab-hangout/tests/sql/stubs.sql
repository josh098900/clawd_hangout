-- Minimal stand-ins for Supabase's auth + realtime so the migrations can run locally.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;
create schema auth; create schema realtime; create schema extensions;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create table realtime.messages (id bigserial primary key, topic text, extension text, payload jsonb, event text, private boolean);
alter table realtime.messages enable row level security;
create function realtime.topic() returns text language sql stable as $$ select current_setting('test.topic', true) $$;
create table realtime.sent (payload jsonb, event text, topic text, private boolean, at timestamptz default now());
create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void language sql as $$ insert into realtime.sent values (payload, event, topic, private) $$;
grant usage on schema auth, realtime, public, extensions to anon, authenticated;
grant select, insert on realtime.messages to authenticated;
grant usage, select on all sequences in schema realtime to authenticated;
alter table auth.users add column if not exists is_anonymous boolean not null default false;
create extension if not exists pgcrypto with schema extensions;
alter table auth.users add column if not exists email text;
