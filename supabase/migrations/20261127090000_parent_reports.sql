-- Parent reports (FAM-04) and monthly in-app summaries (01 §11).
-- Reports are built by the runtime and read by the child's primary guardian
-- through Edge Functions; nothing here is exposed through PostgREST.

alter table stellara_private.reports
  add column kind text not null default 'weekly' check (kind in ('weekly', 'monthly')),
  add column created_at timestamptz not null default now(),
  alter column period_start type timestamptz using period_start::timestamptz,
  alter column period_end type timestamptz using period_end::timestamptz;

alter table stellara_private.reports
  alter column period_start set not null,
  alter column period_end set not null,
  alter column payload set not null,
  alter column template_version set not null,
  add constraint reports_period check (period_end > period_start);

-- One report per child, kind and period: re-running a job never duplicates it.
create unique index reports_child_period on stellara_private.reports (child_id, kind, period_end);
create index reports_child_recent on stellara_private.reports (child_id, period_end desc);

grant select, insert on stellara_private.reports to stellara_runtime;
grant update (opened_at) on stellara_private.reports to stellara_runtime;
create policy runtime_reports on stellara_private.reports to stellara_runtime
  using (true) with check (true);

-- Report inputs the runtime role could not read before.
grant select on stellara_private.test_blueprints to stellara_runtime;
create policy runtime_read_blueprints on stellara_private.test_blueprints for select
  to stellara_runtime using (true);

-- Reports are learning records. The restricted deletion worker removes them
-- with the child's other rows (`deleteChildLearningRecords`), and data exports
-- include them.
grant delete on stellara_private.reports to stellara_runtime;
