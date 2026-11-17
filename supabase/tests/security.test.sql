begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id,email) values
 ('a0000000-0000-4000-8000-000000000001','a@test.invalid'),
 ('a0000000-0000-4000-8000-000000000002','b@test.invalid'),
 ('a0000000-0000-4000-8000-000000000003','c@test.invalid');
select throws_ok($$insert into children(guardian_id,first_name,avatar_key,year,pin_hash) values('a0000000-0000-4000-8000-000000000003','Test','star',5,'hash')$$,'P0001','CONSENT_REQUIRED','missing consent rejected');
insert into consents(id,guardian_id,notice_version,purposes,method,declared_adult) values('b0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000003','test','{}','declaration_v0',true);
select throws_ok($$insert into children(guardian_id,first_name,avatar_key,year,pin_hash) values('a0000000-0000-4000-8000-000000000003','Test','star',5,'hash')$$,'P0001','CONSENT_REQUIRED','unverified consent rejected');
update consents set verified_at=now(),withdrawn_at=now() where id='b0000000-0000-4000-8000-000000000003';
select throws_ok($$insert into children(guardian_id,first_name,avatar_key,year,pin_hash) values('a0000000-0000-4000-8000-000000000003','Test','star',5,'hash')$$,'P0001','CONSENT_REQUIRED','withdrawn consent rejected');
insert into consents(id,guardian_id,notice_version,purposes,method,declared_adult,verified_at)
select ('b0000000-0000-4000-8000-00000000000'||n)::uuid,('a0000000-0000-4000-8000-00000000000'||n)::uuid,'test','{}','declaration_v0',true,now() from generate_series(1,2) n;
insert into children(id,guardian_id,first_name,avatar_key,year,pin_hash)
select ('c0000000-0000-4000-8000-00000000000'||n)::uuid,('a0000000-0000-4000-8000-00000000000'||n)::uuid,'Test','star',5,'hash' from generate_series(1,2) n;
update consents set child_id=('c0000000-0000-4000-8000-00000000000'||right(id::text,1))::uuid where right(id::text,1) in('1','2');
select is((select count(*)::int from children where id::text like 'c000%'),2,'verified consent accepted');
insert into topics values('d0000000-0000-4000-8000-000000000001','test-topic','Test',5,'number',0);
insert into items values('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001',1,'published');
insert into item_versions(item_id,version,type,stem,options,explanation,difficulty,curriculum_edition,provenance,author_id,reviewer_id,answer_verified_at,status)
values('e0000000-0000-4000-8000-000000000001',1,'single_choice','test','[]','test','easy','revised_2025','original','a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002',now(),'draft');
insert into item_answers values('e0000000-0000-4000-8000-000000000001',1,'{"option_id":"a"}');
select throws_ok($$update item_versions set status='published',reviewer_id=author_id where item_id='e0000000-0000-4000-8000-000000000001'$$,'P0001','PUBLISH_REQUIREMENTS','same author/reviewer rejected');
select throws_ok($$update item_versions set status='published',media='[{"src":"x","alt_text":" "}]' where item_id='e0000000-0000-4000-8000-000000000001'$$,'P0001','PUBLISH_REQUIREMENTS','missing alt text rejected');
update item_versions set status='published' where item_id='e0000000-0000-4000-8000-000000000001';
select throws_ok($$update item_versions set stem='changed' where item_id='e0000000-0000-4000-8000-000000000001'$$,'P0001','PUBLISHED_IMMUTABLE','published version immutable');
select throws_ok($$update item_answers set answer='{}' where item_id='e0000000-0000-4000-8000-000000000001'$$,'P0001','PUBLISHED_IMMUTABLE','published key immutable');
do $$ declare n int; c uuid; s uuid; begin for n in 1..2 loop
 c:=('c0000000-0000-4000-8000-00000000000'||n)::uuid; s:=('51000000-0000-4000-8000-00000000000'||n)::uuid;
 insert into sets values(s,c,'practice','{}','{}',null,'[]',now(),null,null,'test');
 insert into attempt_client_ids values(s,c,now());
 insert into attempts values(s,s,c,s,'e0000000-0000-4000-8000-000000000001',1,'d0000000-0000-4000-8000-000000000001','{}',true,true,'normal','eligible',false,5000,now(),now(),now(),current_date,false,'test');
 insert into mastery_states values(c,'d0000000-0000-4000-8000-000000000001',1,8,'{}',now());
 insert into mastery_events values(s,c,'d0000000-0000-4000-8000-000000000001',0,1,'practice',null,now());
 insert into stardust_state values(c,10,'{}');
 insert into stardust_ledger values(s,c,'response',10,current_date,'test',now());
 insert into activity_days values(c,current_date,8,0,true,'activity');
 insert into streaks values(c,1,'{}');
 insert into reviews values(c,'d0000000-0000-4000-8000-000000000001',current_date,'scheduled',0);
end loop; end $$;
select throws_ok($$insert into attempts select gen_random_uuid(),client_id,child_id,set_id,item_id,item_version,topic_id,response,is_correct,scored,confidence,reason,hint_shown,response_ms,recorded_at,received_at,answered_at,learning_day,key_on_device,rules_version from attempts limit 1$$,'23505',null,'same-partition duplicate client rejected');
select throws_ok($$insert into attempts select gen_random_uuid(),client_id,child_id,set_id,item_id,item_version,topic_id,response,is_correct,scored,confidence,reason,hint_shown,response_ms,recorded_at,received_at+interval '2 months',answered_at,learning_day,key_on_device,rules_version from attempts limit 1$$,'23503',null,'cross-partition duplicate client rejected');
insert into private.child_sessions(id,child_id,guardian_id,device_id,expires_at) values('59000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001',gen_random_uuid(),now()+interval '30 days');
create function pg_temp.family_checks() returns setof text language plpgsql as $$ declare t text; result text; begin
 foreach t in array array['sets','attempts','mastery_states','mastery_events','stardust_state','stardust_ledger','activity_days','streaks','reviews'] loop
  execute format('select is(count(*)::int,1,%L) from public.%I where child_id=%L',t||' own row allowed',t,'c0000000-0000-4000-8000-000000000001') into result; return next result;
  execute format('select is(count(*)::int,0,%L) from public.%I where child_id=%L',t||' other family denied',t,'c0000000-0000-4000-8000-000000000002') into result; return next result;
 end loop; end $$;
insert into topics values('d0000000-0000-4000-8000-000000000002','draft-topic','Draft',5,'number',0);
insert into items values('e0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000002',1,'draft');
insert into item_versions(item_id,version,type,stem,explanation,difficulty,curriculum_edition,status) values('e0000000-0000-4000-8000-000000000002',1,'numeric','Draft','Draft','easy','revised_2025','draft');
create function pg_temp.content_checks() returns setof text language plpgsql as $$ declare r record; result text; begin
 for r in select * from (values('topics','id','d'),('items','id','e'),('item_versions','item_id','e')) as x(tab,col,prefix) loop
  execute format('select is(count(*)::int,1,%L) from public.%I where %I=%L',r.tab||' published allowed',r.tab,r.col,r.prefix||'0000000-0000-4000-8000-000000000001') into result; return next result;
  execute format('select is(count(*)::int,0,%L) from public.%I where %I=%L',r.tab||' draft denied',r.tab,r.col,r.prefix||'0000000-0000-4000-8000-000000000002') into result; return next result;
 end loop; end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"a0000000-0000-4000-8000-000000000001"}',true);
select is((select count(*)::int from profiles),1,'own profile only');
select is((select count(*)::int from profiles where id='a0000000-0000-4000-8000-000000000002'),0,'other profile denied');
select is((select count(*)::int from consents),1,'own consent only');
select is((select count(*)::int from consents where guardian_id='a0000000-0000-4000-8000-000000000002'),0,'other consent denied');
select is((select count(id)::int from children),1,'own child only');
select is((select count(id)::int from children where id='c0000000-0000-4000-8000-000000000002'),0,'other child denied');
select * from pg_temp.family_checks();
select * from pg_temp.content_checks();
select throws_ok('select pin_hash from children','42501',null,'PIN hash denied');
select throws_ok('select * from item_answers','42501',null,'answer keys denied');
select throws_ok('select explanation from item_versions','42501',null,'answer explanations denied');
select throws_ok('update consents set withdrawn_at=now()','42501',null,'direct consent mutation denied');
select throws_ok('delete from sets','42501',null,'direct learning mutation denied');
reset role;
set local role child;
select set_config('request.jwt.claims','{"role":"child","child_id":"c0000000-0000-4000-8000-000000000001","guardian_id":"a0000000-0000-4000-8000-000000000001","session_id":"59000000-0000-4000-8000-000000000001"}',true);
select is((select count(id)::int from children),1,'child can read own profile');
select is((select count(id)::int from children where id='c0000000-0000-4000-8000-000000000002'),0,'child cannot read other profile');
select * from pg_temp.family_checks();
select * from pg_temp.content_checks();
select throws_ok('select * from item_answers','42501',null,'child keys denied');
select throws_ok('select pin_hash from children','42501',null,'child PIN hash denied');
select throws_ok('select * from profiles','42501',null,'child parent profiles denied');
select throws_ok('select * from private.refresh_tokens','42501',null,'refresh hashes denied');
reset role;
update private.child_sessions set revoked_at=now();
set local role child;
select is((select count(id)::int from children),0,'revoked session loses Data API access');
select is((select count(*)::int from topics),0,'revoked session loses topics access');
select is((select count(*)::int from items),0,'revoked session loses items access');
select is((select count(item_id)::int from item_versions),0,'revoked session loses versions access');
reset role;
select throws_ok('update attempts set scored=false','42501',null,'postgres attempts update privilege revoked');
select throws_ok('delete from attempts','42501',null,'postgres attempts delete privilege revoked');
grant update,delete on public.attempts to postgres;
select throws_ok('update attempts set scored=false','P0001','APPEND_ONLY','trigger blocks owner update');
select throws_ok('delete from attempts','P0001','APPEND_ONLY','trigger blocks owner delete');
set local role service_role;
select throws_ok('update attempts set scored=false','42501',null,'service attempts update denied');
select throws_ok('delete from attempts','42501',null,'service attempts delete denied');
reset role;
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and not c.relrowsecurity),'all public tables and partitions have RLS');
select * from finish();
rollback;
