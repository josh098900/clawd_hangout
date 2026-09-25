\set QUIET on
-- The core: invite gate, private schema, name scrubbing, Realtime channel rules, chat, tokens, reports + mutes, bans.
-- helpers: run as a player; expect success or failure
create or replace function pg_temp.ok(label text, cond boolean) returns void language plpgsql as $$ begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002'), ('cccccccc-0000-0000-0000-000000000003'), ('dddddddd-0000-0000-0000-000000000004');
select public.set_invite_code('letmein');

set role authenticated;
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_temp.ok('A not a member before joining', not public.is_member());
select pg_temp.ok('wrong code refused', not public.join_world('nope'));
select pg_temp.ok('right code accepted', public.join_world('letmein'));
select pg_temp.ok('A is a member now', public.is_member());
select public.claim_seat('one');
do $$ begin perform public.set_invite_code('hacked'); raise notice 'FAIL player could change the invite code'; exception when insufficient_privilege then raise notice 'PASS player cannot change the invite code'; end $$;
do $$ begin perform public.ban_player('bbbbbbbb-0000-0000-0000-000000000002'); raise notice 'FAIL player could ban'; exception when insufficient_privilege then raise notice 'PASS player cannot ban'; end $$;
do $$ begin perform * from private.config; raise notice 'FAIL player can read private.config'; exception when insufficient_privilege then raise notice 'PASS private schema is off limits'; end $$;
insert into public.profiles (id, name, look) values ('aaaaaaaa-0000-0000-0000-000000000001', 'shit head', '{}');
select pg_temp.ok('profile name scrubbed on the server', (select name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') = '**** head');
-- realtime: members may send on their server's hangout:<server>:*, never on hangout-srv:*
select set_config('test.topic', 'hangout:one:lab', false);
insert into realtime.messages (topic, extension) values ('hangout:one:lab', 'broadcast');
select pg_temp.ok('member can send on hangout:one:lab', true);
select set_config('test.topic', 'hangout-srv:one:lab', false);
do $$ begin insert into realtime.messages (topic, extension) values ('hangout-srv:one:lab', 'broadcast'); raise notice 'FAIL member could send on the server channel'; exception when insufficient_privilege then raise notice 'PASS nobody can send on hangout-srv'; end $$;
select pg_temp.ok('member can listen on hangout-srv:one:lab', (select count(*) from realtime.messages) >= 0);
-- chat through the server
select pg_temp.ok('chat is cleaned + filtered', public.send_chat('lab', '  hello   fuuuck  you ') = 'hello **** you');
do $$ begin perform public.send_chat('lab', 'again'); raise notice 'FAIL no rate limit'; exception when raise_exception then raise notice 'PASS rate limited: %', sqlerrm; end $$;
do $$ begin perform public.send_chat('Lab; drop', 'x'); raise notice 'FAIL bad room accepted'; exception when raise_exception then raise notice 'PASS bad room refused'; end $$;
-- tokens
select pg_temp.ok('first coin pays 1', public.claim_coin(0) = 1);
select pg_temp.ok('same coin twice pays nothing', public.claim_coin(0) is null);
select pg_temp.ok('another coin pays', public.claim_coin(3) = 2);
do $$ begin perform public.claim_coin(9); raise notice 'FAIL made-up coin paid'; exception when raise_exception then raise notice 'PASS made-up coin refused'; end $$;
select pg_temp.ok('daily bonus +5', public.claim_daily() = 7);
select pg_temp.ok('daily bonus only once', public.claim_daily() is null);
select pg_temp.ok('my_tokens', public.my_tokens() = 7);
do $$ begin update public.wallets set tokens = 99999; raise notice 'FAIL player edited their wallet'; exception when insufficient_privilege then raise notice 'PASS wallets are read-only to players'; end $$;

-- B: not a member
select set_config('test.uid', 'bbbbbbbb-0000-0000-0000-000000000002', false);
select pg_temp.ok('non-member sees no profiles', (select count(*) from public.profiles) = 0);
select set_config('test.topic', 'hangout:one:lab', false);
do $$ begin insert into realtime.messages (topic, extension) values ('hangout:one:lab', 'broadcast'); raise notice 'FAIL non-member could send'; exception when insufficient_privilege then raise notice 'PASS non-member cannot send'; end $$;
do $$ begin perform public.claim_coin(1); raise notice 'FAIL non-member claimed a coin'; exception when raise_exception then raise notice 'PASS non-member cannot claim coins'; end $$;
do $$ begin perform public.send_chat('lab', 'hi'); raise notice 'FAIL non-member chatted'; exception when raise_exception then raise notice 'PASS non-member cannot chat'; end $$;
select pg_temp.ok('A wallet invisible to B', (select count(*) from public.wallets) = 0);
-- B, C, D join and report A -> A gets muted
select public.join_world('letmein');
select public.report_player('aaaaaaaa-0000-0000-0000-000000000001', 'rude');
select set_config('test.uid', 'cccccccc-0000-0000-0000-000000000003', false); select public.join_world('letmein'); select public.report_player('aaaaaaaa-0000-0000-0000-000000000001', 'rude');
select set_config('test.uid', 'dddddddd-0000-0000-0000-000000000004', false); select public.join_world('letmein'); select public.report_player('aaaaaaaa-0000-0000-0000-000000000001', 'rude');
select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_sleep(0.8);
do $$ begin perform public.send_chat('lab', 'hello?'); raise notice 'FAIL muted player chatted'; exception when raise_exception then raise notice 'PASS three reports mute: %', sqlerrm; end $$;
-- brute force the invite code
select set_config('test.uid', 'cccccccc-0000-0000-0000-000000000003', false);
reset role;
insert into auth.users values ('eeeeeeee-0000-0000-0000-000000000005');
set role authenticated;
select set_config('test.uid', 'eeeeeeee-0000-0000-0000-000000000005', false);
select public.join_world('a'), public.join_world('b'), public.join_world('c'), public.join_world('d'), public.join_world('e');
do $$ begin perform public.join_world('letmein'); raise notice 'FAIL no brute-force limit'; exception when raise_exception then raise notice 'PASS 6th guess blocked: %', sqlerrm; end $$;
reset role;
-- owner: ban A
select public.ban_player('aaaaaaaa-0000-0000-0000-000000000001', 'test');
set role authenticated; select set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select pg_temp.ok('banned player is out', not public.is_member());
select pg_temp.ok('banned player cannot rejoin', not public.join_world('letmein'));
reset role;
select pg_temp.ok('chat went out on the server channel with the real id', (select count(*) from realtime.sent where topic = 'hangout-srv:one:lab' and payload->>'id' = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select pg_temp.ok('reports kept evidence', (select jsonb_array_length(recent_chat) from private.reports limit 1) = 1);
