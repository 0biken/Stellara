begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
grant usage on schema extensions to authenticated;
select plan(23);

select has_table('public', 'children', 'children exist');
select has_table('public', 'consents', 'consents exist');
select has_table('stellara_private', 'attempts', 'attempts exist');
select has_table('stellara_private', 'attempt_clients', 'attempt IDs have a global registry');
select ok(not has_table_privilege('authenticated', 'stellara_private.item_answers', 'SELECT'), 'answers are private');
select ok(not has_table_privilege('authenticated', 'stellara_private.child_pins', 'SELECT'), 'PIN hashes are private');
select ok(not has_table_privilege('service_role', 'stellara_private.attempts', 'UPDATE'), 'attempts are append-only');
select ok(not has_table_privilege('anon', 'public.children', 'SELECT'), 'anonymous users cannot list children');
select ok(not has_table_privilege('authenticated', 'public.children', 'INSERT'), 'children are created by the server');
select ok((select relrowsecurity from pg_class where oid = 'public.children'::regclass), 'children have RLS');
select ok(not has_table_privilege('stellara_runtime', 'public.data_requests', 'INSERT'), 'runtime cannot queue data-rights requests');
select ok(not has_table_privilege('stellara_runtime', 'stellara_private.subscriptions', 'UPDATE'), 'runtime cannot change subscriptions');
select ok(not has_table_privilege('stellara_runtime', 'stellara_private.item_answers', 'UPDATE'), 'runtime cannot change answer keys');
select ok(not has_table_privilege('stellara_runtime', 'stellara_private.stardust_daily', 'UPDATE'), 'only the ledger trigger can change daily totals');
select is((select count(*) from pg_inherits where inhparent='stellara_private.attempts'::regclass), 3::bigint,
  'fresh database pre-creates three months of attempt partitions');
select ok(not exists (
  select from pg_inherits i join pg_class c on c.oid=i.inhrelid
  where i.inhparent='stellara_private.attempts'::regclass
    and (not c.relrowsecurity or has_table_privilege('stellara_runtime', c.oid, 'UPDATE'))
), 'no direct partition writes');

insert into auth.users (id) values ('fd000000-0000-4000-8000-000000000001'),('fd000000-0000-4000-8000-000000000002');
insert into public.profiles (id) values ('fd000000-0000-4000-8000-000000000001'),('fd000000-0000-4000-8000-000000000002');
insert into public.consents (id,guardian_id,notice_version,purposes,method,expires_at,verified_at)
values ('fd000000-0000-4000-8000-000000000003','fd000000-0000-4000-8000-000000000001',
  '2026-11-v1','{"core_learning":true}','declaration_v0',now()+interval '1 hour',null);
select throws_ok(
  $$insert into public.children (id,created_by,consent_id,first_name,year,avatar_key)
    values ('fd000000-0000-4000-8000-000000000004','fd000000-0000-4000-8000-000000000001',
    'fd000000-0000-4000-8000-000000000003','Tolu','P5','sun')$$,
  '23514','CONSENT_REQUIRED','unverified consent cannot create a child'
);
update public.consents set verified_at=now() where id='fd000000-0000-4000-8000-000000000003';
insert into public.children (id,created_by,consent_id,first_name,year,avatar_key)
values ('fd000000-0000-4000-8000-000000000004','fd000000-0000-4000-8000-000000000001',
  'fd000000-0000-4000-8000-000000000003','Tolu','P5','sun');
insert into public.guardianships (guardian_id,child_id)
values ('fd000000-0000-4000-8000-000000000001','fd000000-0000-4000-8000-000000000004');
insert into public.data_requests (guardian_id,child_id,kind,status,due_at)
values ('fd000000-0000-4000-8000-000000000001','fd000000-0000-4000-8000-000000000004','export','pending',now());

set local role authenticated;
set local request.jwt.claim.sub = 'fd000000-0000-4000-8000-000000000001';
select is((select count(id) from public.children),1::bigint,'guardian sees their child');
select is((select count(id) from public.consents),1::bigint,'guardian sees their consent');
select is((select count(id) from public.data_requests),1::bigint,'guardian sees their data request');
set local request.jwt.claim.sub = 'fd000000-0000-4000-8000-000000000002';
select is((select count(id) from public.children),0::bigint,'other guardian cannot see the child');
select is((select count(id) from public.consents),0::bigint,'other guardian cannot see the consent');
select is((select count(id) from public.data_requests),0::bigint,'other guardian cannot see the data request');
reset role;

select * from finish();
rollback;
