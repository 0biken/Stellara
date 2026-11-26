create or replace function stellara_private.require_child_consent() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform 1 from public.consents where id=new.consent_id and guardian_id=new.created_by
    and child_id is null and verified_at is not null and withdrawn_at is null
    and expires_at > now() for update;
  if not found then raise exception 'CONSENT_REQUIRED' using errcode='23514'; end if;
  return new;
end;
$$;

alter table public.data_requests drop constraint data_requests_kind_check;
update public.data_requests set kind='deletion' where kind='delete';
alter table public.data_requests add constraint data_requests_kind_check
  check (kind in ('export','deletion'));
create unique index one_open_data_request on public.data_requests (guardian_id,child_id,kind)
  where status in ('pending','ready');
grant select,insert on public.data_requests to stellara_runtime;
grant update (status) on public.data_requests to stellara_runtime;
create policy runtime_data_requests on public.data_requests to stellara_runtime
  using (true) with check (true);
grant select (expires_at) on public.consents to authenticated;
