\set QUIET on
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
-- A = account (logged in), G = guest, H = another guest, X = not a member
insert into auth.users (id, is_anonymous) values ('aaaaaaaa-0000-0000-0000-000000000001', false), ('99999999-0000-0000-0000-000000000009', true), ('88888888-0000-0000-0000-000000000008', true), ('77777777-0000-0000-0000-000000000007', false);
select public.set_invite_code('letmein');
set role authenticated;
-- the guest plays: joins, earns tokens, gets a prize, saves
select set_config('test.uid', '99999999-0000-0000-0000-000000000009', false);
select public.join_world('letmein');
select public.claim_daily(); select public.claim_coin(1);
insert into public.saves (user_id, data) values ('99999999-0000-0000-0000-000000000009', '{"unlocks":["hat:5"],"feeds":3}');
select pg_temp.ok('guest can write own save', (select data->>'feeds' from public.saves) = '3');
do $$ begin insert into public.saves (user_id, data) values ('aaaaaaaa-0000-0000-0000-000000000001', '{}'); raise notice 'FAIL wrote someone else''s save'; exception when insufficient_privilege then raise notice 'PASS cannot write another player''s save'; end $$;
do $$ begin update public.saves set data = to_jsonb(repeat('x', 20000)); raise notice 'FAIL non-object save accepted'; exception when check_violation then raise notice 'PASS save must be an object'; end $$;
do $$ begin update public.saves set data = jsonb_build_object('junk', (select string_agg(md5(i::text), '') from generate_series(1, 700) i)); raise notice 'FAIL huge save accepted'; exception when check_violation then raise notice 'PASS huge save refused'; end $$;
do $$ begin insert into public.inventory (user_id, item) values ('99999999-0000-0000-0000-000000000009', 'hat:9'); raise notice 'FAIL player gave themself a prize'; exception when insufficient_privilege then raise notice 'PASS inventory is read-only to players'; end $$;
reset role; insert into public.inventory (user_id, item) values ('99999999-0000-0000-0000-000000000009', 'pet:3'); set role authenticated;
select set_config('test.uid', '99999999-0000-0000-0000-000000000009', false);
select set_config('test.ticket', public.start_merge(), false);
-- the account: cannot start a merge, can finish one
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
do $$ begin perform public.start_merge(); raise notice 'FAIL account started a merge'; exception when raise_exception then raise notice 'PASS only guests start merges'; end $$;
do $$ begin perform public.finish_merge('nonsense'); raise notice 'FAIL bogus ticket worked'; exception when raise_exception then raise notice 'PASS bogus ticket refused'; end $$;
select pg_temp.ok('account not a member before merge', not public.is_member());
select set_config('test.res', public.finish_merge(current_setting('test.ticket'))::text, false);
select pg_temp.ok('merge moved tokens (6)', (current_setting('test.res')::jsonb->>'tokens')::int = 6 and public.my_tokens() = 6);
select pg_temp.ok('merge handed back the guest save', current_setting('test.res')::jsonb->'save'->>'feeds' = '3');
select pg_temp.ok('merge moved the prize', (select count(*) from public.inventory where item = 'pet:3') = 1);
select pg_temp.ok('merge copied membership', public.is_member());
do $$ begin perform public.finish_merge(current_setting('test.ticket')); raise notice 'FAIL ticket reused'; exception when raise_exception then raise notice 'PASS ticket is one-time'; end $$;
select set_config('test.uid', '99999999-0000-0000-0000-000000000009', false);
select pg_temp.ok('guest wallet emptied', public.my_tokens() = 0);
-- second merge the same day refused
select set_config('test.uid', '88888888-0000-0000-0000-000000000008', false);
select set_config('test.ticket', public.start_merge(), false);
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
do $$ begin perform public.finish_merge(current_setting('test.ticket')); raise notice 'FAIL second merge today'; exception when raise_exception then raise notice 'PASS one merge per day: %', sqlerrm; end $$;
-- a guest cannot finish a merge
select set_config('test.uid', '88888888-0000-0000-0000-000000000008', false);
select set_config('test.ticket', public.start_merge(), false);
do $$ begin perform public.finish_merge(current_setting('test.ticket')); raise notice 'FAIL guest finished a merge'; exception when raise_exception then raise notice 'PASS guests cannot finish merges'; end $$;

-- ---------- servers ----------
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_temp.ok('three servers listed', (select count(*) from public.list_servers()) = 3);
select pg_temp.ok('no seat yet', public.my_server() is null);
select set_config('test.topic', 'hangout:one:lab', false);
do $$ begin insert into realtime.messages (topic, extension) values ('hangout:one:lab', 'broadcast'); raise notice 'FAIL sent without a seat'; exception when insufficient_privilege then raise notice 'PASS no seat, no channel'; end $$;
select public.claim_seat('one');
select pg_temp.ok('seat taken', public.my_server() = 'one');
insert into realtime.messages (topic, extension) values ('hangout:one:lab', 'broadcast');
select pg_temp.ok('can send on own server', true);
select set_config('test.topic', 'hangout:two:lab', false);
do $$ begin insert into realtime.messages (topic, extension) values ('hangout:two:lab', 'broadcast'); raise notice 'FAIL sent on another server'; exception when insufficient_privilege then raise notice 'PASS other servers refused'; end $$;
select set_config('test.topic', 'hangout-srv:one:lab', false);
do $$ begin insert into realtime.messages (topic, extension) values ('hangout-srv:one:lab', 'broadcast'); raise notice 'FAIL sent on srv'; exception when insufficient_privilege then raise notice 'PASS nobody sends on hangout-srv'; end $$;
select pg_temp.ok('chat still filtered', public.send_chat('lab', 'hi there') = 'hi there');
reset role;
select pg_temp.ok('chat routed to hangout-srv:one:lab', (select count(*) from realtime.sent where topic = 'hangout-srv:one:lab') = 1);
-- fill server 'two' to its cap (12) with fake members
insert into auth.users (id) select ('10000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid from generate_series(1, 13) i;
insert into public.members (user_id) select id from auth.users where id::text like '10000000%';
update private.servers set cap = 12;
set role authenticated;
do $$ declare i int; begin for i in 1..12 loop perform set_config('test.uid', '10000000-0000-0000-0000-' || lpad(i::text, 12, '0'), false); perform public.claim_seat('two'); end loop; end $$;
select pg_temp.ok('server two shows 12/12', (select players from public.list_servers() where id = 'two') = 12);
select set_config('test.uid', '10000000-0000-0000-0000-000000000013', false);
do $$ begin perform public.claim_seat('two'); raise notice 'FAIL 13th player got in'; exception when raise_exception then raise notice 'PASS 13th player refused: %', sqlerrm; end $$;
select set_config('test.uid', '10000000-0000-0000-0000-000000000001', false);
select public.claim_seat('two');
select pg_temp.ok('re-claiming your own seat on a full server is fine', public.my_server() = 'two');
reset role; update private.seats set seen = now() - interval '2 minutes' where user_id = '10000000-0000-0000-0000-000000000002'; set role authenticated;
select set_config('test.uid', '10000000-0000-0000-0000-000000000013', false);
select public.claim_seat('two');
select pg_temp.ok('a lapsed seat frees a place', public.my_server() = 'two');
select set_config('test.uid', '10000000-0000-0000-0000-000000000002', false);
select pg_temp.ok('lapsed seat: ping says so', not public.seat_ping());
select set_config('test.uid', '10000000-0000-0000-0000-000000000013', false);
select pg_temp.ok('live seat: ping keeps it', public.seat_ping());
select pg_temp.ok('friends lookup shows who is where', (select here from public.list_servers(array['10000000-0000-0000-0000-000000000013'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid]) where id = 'two') = array['10000000-0000-0000-0000-000000000013'::uuid]);
select public.leave_seat();
select pg_temp.ok('leave_seat', public.my_server() is null);
do $$ begin perform public.claim_seat('nope'); raise notice 'FAIL made-up server'; exception when raise_exception then raise notice 'PASS made-up server refused'; end $$;
select set_config('test.uid', '77777777-0000-0000-0000-000000000007', false);
do $$ begin perform public.claim_seat('one'); raise notice 'FAIL non-member took a seat'; exception when raise_exception then raise notice 'PASS non-member cannot take a seat'; end $$;
select pg_temp.ok('non-member sees no servers', (select count(*) from public.list_servers()) = 0);
do $$ begin perform * from private.seats; raise notice 'FAIL seats readable'; exception when insufficient_privilege then raise notice 'PASS seats are private'; end $$;
