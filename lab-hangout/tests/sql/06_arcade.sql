\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002');
select public.set_invite_code('letmein');
set role authenticated;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select public.join_world('letmein');
do $$ begin perform public.play_claw(); raise notice 'FAIL played while broke'; exception when raise_exception then raise notice 'PASS broke players cannot play: %', sqlerrm; end $$;
reset role; select private.add_tokens('aaaaaaaa-0000-0000-0000-000000000001', 200); set role authenticated;
select set_config('test.r', public.play_claw()::text, false);
select pg_temp.ok('first play: a prize, 3 tokens taken', (current_setting('test.r')::jsonb->>'tokens')::int = 197 and not (current_setting('test.r')::jsonb->>'dupe')::boolean);
select pg_temp.ok('prize is in the inventory', (select count(*) from public.inventory) = 1);
do $$ begin perform public.play_claw(); raise notice 'FAIL no cooldown'; exception when raise_exception then raise notice 'PASS cooldown: %', sqlerrm; end $$;
-- play many times (skip the cooldown by aging the log as the owner)
reset role;
do $$ declare i int; begin
  for i in 1..60 loop
    update private.claw_plays set at = at - interval '1 minute';
    perform set_config('role', 'authenticated', true);
    perform public.play_claw();
    perform set_config('role', 'postgres', true);
  end loop;
end $$;
select pg_temp.ok('61 plays logged', (select count(*) from private.claw_plays) = 61);
select pg_temp.ok('balance = 200 - 3*61 + dupes', (select tokens from public.wallets where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 200 - 3 * 61 + (select count(*) from private.claw_plays where dupe));
select pg_temp.ok('inventory = distinct prizes won', (select count(*) from public.inventory where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = (select count(distinct item) from private.claw_plays));
select pg_temp.ok('only real prizes', not exists (select 1 from public.inventory i where i.item not in (select item from private.claw_prizes)));
select pg_temp.ok('commons show up more than the halo', (select count(*) from private.claw_plays where item = 'hat:6') >= (select count(*) from private.claw_plays where item = 'hat:10'));
set role authenticated;
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
do $$ begin perform public.play_claw(); raise notice 'FAIL non-member played'; exception when raise_exception then raise notice 'PASS non-member cannot play'; end $$;
select pg_temp.ok('B cannot see A''s prizes', (select count(*) from public.inventory) = 0);
