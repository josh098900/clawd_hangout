\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001');
select public.set_invite_code('letmein');
select pg_temp.ok('the EXPLORER badge is on the list', exists (select 1 from private.badge_list where id = 'explorer'));
set role authenticated;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false); select public.join_world('letmein');
select pg_temp.ok('claiming EXPLORER gives it (the first time)', public.claim_badge('explorer'));
select pg_temp.ok('claiming it again is not new', not public.claim_badge('explorer'));
select pg_temp.ok('it shows on your card', exists (select 1 from public.badges where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and badge = 'explorer'));
do $$ begin perform public.claim_badge('explorerz'); raise notice 'FAIL a made-up badge was claimed'; exception when raise_exception then raise notice 'PASS made-up badges are refused'; end $$;
