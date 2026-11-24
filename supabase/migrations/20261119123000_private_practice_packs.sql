create table stellara_private.practice_packs (
  id uuid primary key,
  child_id uuid not null references public.children(id),
  expires_at timestamptz not null,
  document jsonb not null
);
create index practice_packs_expiry on stellara_private.practice_packs(expires_at);
alter table stellara_private.practice_packs enable row level security;
revoke all on stellara_private.practice_packs from public,anon,authenticated,service_role;
grant select,insert on stellara_private.practice_packs to stellara_runtime;
create policy runtime_packs on stellara_private.practice_packs to stellara_runtime
  using (true) with check (true);
select cron.schedule('stellara-expire-packs','35 1 * * *',
  $$delete from stellara_private.practice_packs where expires_at<now()$$);
