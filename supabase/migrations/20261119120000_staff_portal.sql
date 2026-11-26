create table stellara_private.staff_members (
  user_id uuid primary key references auth.users(id),
  role text not null check (role in ('super_admin','admin','author','reviewer','content_lead')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table stellara_private.staff_members enable row level security;
revoke all on stellara_private.staff_members from public,anon,authenticated,service_role;
grant select,insert,update on stellara_private.staff_members to stellara_runtime;
create policy runtime_staff on stellara_private.staff_members to stellara_runtime
  using (true) with check (true);
grant select,insert on stellara_private.audit_log to stellara_runtime;
create policy runtime_audit on stellara_private.audit_log to stellara_runtime
  using (true) with check (true);
-- First Super Admin is bootstrapped by a trusted database operator.
