begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
grant usage on schema extensions to stellara_runtime;
select plan(6);

insert into auth.users (id) values ('fd000000-0000-4000-8000-000000000011');
insert into public.profiles (id) values ('fd000000-0000-4000-8000-000000000011');
insert into public.consents (id,guardian_id,notice_version,purposes,method,expires_at,verified_at)
values ('fd000000-0000-4000-8000-000000000012','fd000000-0000-4000-8000-000000000011',
  '2026-11-v1','{"core_learning":true}','declaration_v0',now()+interval '1 hour',now());
insert into public.children (id,created_by,consent_id,first_name,year,avatar_key)
values ('fd000000-0000-4000-8000-000000000013','fd000000-0000-4000-8000-000000000011',
  'fd000000-0000-4000-8000-000000000012','Tolu','P5','sun');
insert into stellara_private.sets values (
  'fd000000-0000-4000-8000-000000000014','fd000000-0000-4000-8000-000000000013','practice','{}'
);

select throws_ok(
  $$update stellara_private.item_versions set document='{}' where published_at is not null$$,
  '23514','Published item versions are immutable','published item data cannot be changed'
);
select throws_ok(
  $$update stellara_private.item_answers set answer='{}'$$,
  '23514','Published answers are immutable','published answer keys cannot be changed'
);

set local role stellara_runtime;
select lives_ok(
  $$insert into stellara_private.stardust_ledger values (gen_random_uuid(),
    'fd000000-0000-4000-8000-000000000013',current_date,'one',200,'{}')$$,
  'runtime can award up to the daily cap'
);
select throws_ok(
  $$insert into stellara_private.stardust_ledger values (gen_random_uuid(),
    'fd000000-0000-4000-8000-000000000013',current_date,'two',1,'{}')$$,
  '23514',null,'database prevents a ledger award beyond the cap'
);

with times as (
  select (date_trunc('month',now() at time zone 'UTC') + delta)::timestamp at time zone 'UTC' as instant
  from (values (interval '1 month' - interval '1 millisecond'), (interval '1 month')) boundaries(delta)
), registered as (
  insert into stellara_private.attempt_clients select gen_random_uuid(), instant from times returning *
)
insert into stellara_private.attempts (received_at,id,client_id,child_id,set_id,item_id,item_version,document)
select r.received_at,gen_random_uuid(),r.client_id,'fd000000-0000-4000-8000-000000000013',
  'fd000000-0000-4000-8000-000000000014',v.item_id,v.version,'{}'
from registered r cross join lateral (select item_id,version from stellara_private.item_versions limit 1) v;
select is((select count(distinct tableoid) from stellara_private.attempts),2::bigint,
  'attempts on either side of midnight UTC occupy different partitions');
select throws_ok(
  $$insert into stellara_private.attempt_clients select client_id,received_at+interval '1 month'
    from stellara_private.attempt_clients limit 1$$,
  '23505',null,'attempt client IDs remain unique across partitions'
);
reset role;

select * from finish();
rollback;
