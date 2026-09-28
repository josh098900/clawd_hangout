\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
insert into auth.users (id) values ('aaaaaaaa-0000-0000-0000-000000000001'), ('cccccccc-0000-0000-0000-000000000003');
select public.set_invite_code('letmein');
insert into public.profiles (id, name, look) values ('aaaaaaaa-0000-0000-0000-000000000001', 'ANNA', '{}');
-- the lists
select pg_temp.ok('duty free and the Puffin Shop sell three clothes, at their prices', (select count(*) from private.gift_items where (item, price) in (('fit:14', 10), ('fit:13', 15), ('hat:21', 15))) = 3);
select pg_temp.ok('the aquarium still sells its four', (select count(*) from private.gift_items where item in ('hat:18', 'hat:19', 'face:10', 'fit:12')) = 4);
select pg_temp.ok('the Puffin Shop''s furniture is in the catalogue', (select count(*) from private.furniture where (id, price) in (('puffplush', 8), ('sheeprug', 12), ('isflag', 6), ('lavalamp', 10)) and starter = 0) = 4);
select pg_temp.ok('the fly, hotdog and aurora quests are in the pool, as ordinary quests', (select count(*) from private.quest_pool where id in ('fly', 'hotdog', 'aurora') and not checked) = 3);
select pg_temp.ok('the FREQUENT FLYER and AURORA HUNTER badges are on the list', (select count(*) from private.badge_list where id in ('flyer', 'aurora')) = 2);
-- buying them, as a member with tokens
set role authenticated;
select set_config('test.uid', 'cccccccc-0000-0000-0000-000000000003', false);
do $$ begin perform public.gift_shop('hat:21'); raise notice 'FAIL a non-member bought a helmet'; exception when raise_exception then raise notice 'PASS members only (the shops)'; end $$;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false); select public.join_world('letmein');
reset role; select private.add_tokens('aaaaaaaa-0000-0000-0000-000000000001', 50); set role authenticated;
select set_config('test.r', public.gift_shop('hat:21')::text, false);
select pg_temp.ok('the VIKING HELMET: 15 tokens, and it''s yours', (current_setting('test.r')::jsonb->>'tokens')::int = 35 and exists (select 1 from public.inventory where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and item = 'hat:21'));
do $$ begin perform public.gift_shop('hat:21'); raise notice 'FAIL bought the helmet twice'; exception when raise_exception then raise notice 'PASS one of each'; end $$;
select pg_temp.ok('the NECK PILLOW: 10 more', (public.gift_shop('fit:14')->>'tokens')::int = 25);
select set_config('test.r', public.buy_furniture('lavalamp')::text, false);
select pg_temp.ok('a LAVA LAMP for the flat: 10 more', (current_setting('test.r')::jsonb->>'tokens')::int = 15);
do $$ begin perform public.gift_shop('fit:13'); perform public.gift_shop('hat:18'); raise notice 'FAIL spent more than they had'; exception when raise_exception then raise notice 'PASS not enough tokens: %', sqlerrm; end $$;
