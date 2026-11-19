create schema stellara_private;
revoke all on schema stellara_private from public, anon, authenticated, service_role;
create role stellara_runtime nologin noinherit;
grant stellara_runtime to postgres;
grant usage on schema stellara_private, public to stellara_runtime;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text, phone text, email text,
  locale text not null default 'en-NG', created_at timestamptz not null default now()
);
create table public.children (
  id uuid primary key,
  created_by uuid not null references public.profiles,
  consent_id uuid not null,
  first_name text not null check (char_length(first_name) between 1 and 30),
  birth_year smallint, year text not null check (year in ('P4','P5','P6')),
  avatar_key text not null, timezone text not null default 'Africa/Lagos',
  exam_date date, status text not null default 'active' check (status in ('active','paused','deletion_pending')),
  term_id text not null default '2026-27', last_active_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.guardianships (
  guardian_id uuid references public.profiles, child_id uuid references public.children,
  relationship text not null default 'parent', is_primary boolean not null default true,
  primary key (guardian_id, child_id)
);
create unique index one_primary_guardian on public.guardianships(child_id) where is_primary;
create table public.consents (
  id uuid primary key default gen_random_uuid(), guardian_id uuid not null references public.profiles,
  child_id uuid references public.children, source_id uuid references public.consents,
  notice_version text not null, purposes jsonb not null check (purposes @> '{"core_learning":true}'),
  method text not null, evidence_ref text, created_at timestamptz not null default now(),
  expires_at timestamptz not null, verified_at timestamptz, withdrawn_at timestamptz,
  check ((source_id is null) = (child_id is null))
);
create unique index one_active_child_consent on public.consents(child_id) where withdrawn_at is null and child_id is not null;
create index consents_guardian on public.consents(guardian_id, created_at desc);
alter table public.children add foreign key (consent_id) references public.consents;
create index children_creator on public.children(created_by);
create table stellara_private.child_pins (
  child_id uuid primary key references public.children, pin_hash text not null,
  failed_count integer not null default 0 check (failed_count between 0 and 4),
  locked_until timestamptz
);
create table stellara_private.devices (
  id uuid not null, guardian_id uuid not null references public.profiles,
  label text, last_seen_at timestamptz not null default now(), primary key (guardian_id,id)
);
create table stellara_private.child_sessions (
  id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children,
  guardian_id uuid not null, device_id uuid not null, expires_at timestamptz not null,
  foreign key (guardian_id, device_id) references stellara_private.devices
);
create index sessions_child on stellara_private.child_sessions(child_id);
create table stellara_private.rate_limits (
  scope text not null, subject text not null, bucket bigint not null, hits int not null,
  primary key (scope, subject, bucket)
);

create function stellara_private.require_child_consent() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform 1 from public.consents where id=new.consent_id and guardian_id=new.created_by
    and child_id is null and verified_at is not null and withdrawn_at is null for update;
  if not found then raise exception 'CONSENT_REQUIRED' using errcode='23514'; end if;
  return new;
end;
$$;
create trigger require_child_consent before insert on public.children
for each row execute function stellara_private.require_child_consent();

create table stellara_private.subscriptions (
  guardian_id uuid primary key references public.profiles, plan text not null,
  status text not null check (status in ('trial','active','lapsed','cancelled')),
  trial_ends_at timestamptz, current_period_end timestamptz, paystack_ref text unique
);
create table stellara_private.curriculum_nodes (
  id uuid primary key, parent_id uuid references stellara_private.curriculum_nodes,
  kind text not null check (kind in ('pathway','subject','strand','topic')),
  title text not null, code text not null unique, edition text not null default 'draft',
  sort integer not null default 0, year text, strand_code text
);
create table stellara_private.node_prerequisites (
  node_id uuid references stellara_private.curriculum_nodes, requires_node_id uuid references stellara_private.curriculum_nodes,
  primary key (node_id,requires_node_id), check (node_id<>requires_node_id)
);
create table stellara_private.pathway_topics (
  pathway_id uuid references stellara_private.curriculum_nodes, topic_id uuid references stellara_private.curriculum_nodes,
  primary key (pathway_id,topic_id)
);
create table stellara_private.items (
  id uuid primary key, topic_id uuid not null references stellara_private.curriculum_nodes,
  current_version integer, status text not null check (status in ('draft','published','retired'))
);
create index items_topic on stellara_private.items(topic_id);
create table stellara_private.stimuli (
  id uuid, version int, document jsonb not null, primary key (id,version)
);
create table stellara_private.item_versions (
  item_id uuid references stellara_private.items, version integer check (version > 0),
  document jsonb not null, published_at timestamptz, primary key (item_id,version),
  check (not (document ? 'answer'))
);
alter table stellara_private.items add foreign key (id,current_version)
references stellara_private.item_versions(item_id,version) deferrable initially deferred;
create table stellara_private.item_answers (
  item_id uuid, version int, answer jsonb not null, primary key (item_id,version),
  foreign key (item_id,version) references stellara_private.item_versions
);
create table stellara_private.lessons (
  id uuid, version int, topic_id uuid not null references stellara_private.curriculum_nodes,
  document jsonb not null, published_at timestamptz, primary key (id,version)
);
create index lessons_topic on stellara_private.lessons(topic_id,version desc) where published_at is not null;
create table stellara_private.lesson_cards (
  lesson_id uuid, version int, sort int, document jsonb not null, primary key (lesson_id,version,sort),
  foreign key (lesson_id,version) references stellara_private.lessons
);
create table stellara_private.test_blueprints (
  id uuid primary key, pathway_id uuid references stellara_private.curriculum_nodes, document jsonb not null
);
create table stellara_private.content_reviews (
  id uuid primary key default gen_random_uuid(), entity text not null, entity_id uuid not null,
  version int not null, reviewer_id uuid not null, decision text not null, comment text,
  created_at timestamptz not null default now()
);
create function stellara_private.check_item_publication() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'INSERT' and old.published_at is not null then
    raise exception 'Published item versions are immutable' using errcode='23514';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.published_at is not null and (
    coalesce(new.document->>'provenance','') = '' or
    coalesce(new.document->>'author_id','') = '' or coalesce(new.document->>'reviewer_id','') = '' or
    new.document->>'author_id' = new.document->>'reviewer_id' or
    coalesce(new.document->>'answer_verified_at','') = '' or
    exists (select from jsonb_array_elements(coalesce(new.document->'media','[]'::jsonb)) m
      where nullif(trim(coalesce(m->>'alt_text',m->>'alt','')), '') is null)
  ) then raise exception 'Item publication requirements not met' using errcode='23514'; end if;
  return new;
end;
$$;
create trigger check_item_publication before insert or update or delete on stellara_private.item_versions
for each row execute function stellara_private.check_item_publication();
create function stellara_private.freeze_published_answer() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select from stellara_private.item_versions where item_id=old.item_id and version=old.version and published_at is not null)
  then raise exception 'Published answers are immutable' using errcode='23514'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
create trigger freeze_published_answer before update or delete on stellara_private.item_answers
for each row execute function stellara_private.freeze_published_answer();

create table stellara_private.sets (
  id uuid primary key, child_id uuid not null references public.children,
  kind text not null check (kind in ('practice','review','topic_assessment','placement','practice_test')),
  document jsonb not null, unique (id,child_id)
);
create index sets_child on stellara_private.sets(child_id,kind);
create table stellara_private.attempt_clients (
  client_id uuid primary key, received_at timestamptz not null, unique (client_id,received_at)
);
create table stellara_private.attempts (
  received_at timestamptz not null, id uuid not null, client_id uuid not null,
  child_id uuid not null, set_id uuid not null, item_id uuid not null, item_version int not null,
  document jsonb not null, primary key (received_at,id), unique (received_at,client_id),
  foreign key (client_id,received_at) references stellara_private.attempt_clients(client_id,received_at),
  foreign key (set_id,child_id) references stellara_private.sets(id,child_id),
  foreign key (item_id,item_version) references stellara_private.item_versions(item_id,version)
) partition by range (received_at);
create index attempts_set on stellara_private.attempts(set_id);
create function stellara_private.ensure_attempt_partitions() returns void
language plpgsql set search_path = '' as $$
declare
  start_month date := date_trunc('month', now() at time zone 'UTC')::date;
  name text;
begin
  perform pg_advisory_xact_lock(726034);
  for i in 0..2 loop
    name := 'attempts_' || to_char(start_month,'YYYY_MM');
    if to_regclass(format('stellara_private.%I', name)) is null then
      execute format('create table stellara_private.%I partition of stellara_private.attempts for values from (%L) to (%L)',
        name, start_month::text || ' 00:00:00+00', (start_month + interval '1 month')::date::text || ' 00:00:00+00');
      execute format('alter table stellara_private.%I enable row level security', name);
      execute format('revoke all on stellara_private.%I from public, anon, authenticated, service_role, stellara_runtime', name);
    end if;
    start_month := (start_month + interval '1 month')::date;
  end loop;
end;
$$;
select stellara_private.ensure_attempt_partitions();
create extension if not exists pg_cron;
select cron.schedule('stellara-attempt-partitions', '15 1 * * *', 'select stellara_private.ensure_attempt_partitions()');
select cron.schedule('stellara-expire-sessions', '25 1 * * *',
  $$delete from stellara_private.child_sessions where expires_at < now();
    delete from stellara_private.rate_limits
      where bucket < extract(epoch from now() - interval '7 days')::bigint$$);

create table stellara_private.mastery_states (
  child_id uuid references public.children, topic_id uuid references stellara_private.curriculum_nodes,
  document jsonb not null check ((document->>'level')::int between 0 and 5), primary key (child_id,topic_id)
);
create table stellara_private.mastery_events (
  id uuid primary key, child_id uuid not null references public.children, document jsonb not null
);
create table stellara_private.stardust_ledger (
  id uuid primary key, child_id uuid not null references public.children,
  learning_day date not null, ref_id text not null, amount int not null check (amount between 0 and 200),
  document jsonb not null
);
create index ledger_refs on stellara_private.stardust_ledger(child_id,ref_id);
create table stellara_private.stardust_daily (
  child_id uuid references public.children, learning_day date, amount int not null check (amount between 0 and 200),
  primary key (child_id,learning_day)
);
create function stellara_private.enforce_stardust_cap() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Only the ledger trigger may update the daily total.
  if tg_relid <> 'stellara_private.stardust_ledger'::regclass then
    raise exception 'Unexpected Stardust trigger source';
  end if;
  insert into stellara_private.stardust_daily as d values (new.child_id,new.learning_day,new.amount)
  on conflict (child_id,learning_day) do update set amount=d.amount+excluded.amount;
  return new;
end;
$$;
create trigger enforce_stardust_cap before insert on stellara_private.stardust_ledger
for each row execute function stellara_private.enforce_stardust_cap();
create table stellara_private.activity_days (
  child_id uuid references public.children, learning_day date, document jsonb not null,
  primary key (child_id,learning_day)
);
create table stellara_private.learning_state (
  child_id uuid primary key references public.children, stardust jsonb,
  reviews jsonb not null default '[]', due_queue jsonb not null default '[]'
);
create table stellara_private.streak_state (
  child_id uuid primary key references public.children, document jsonb not null
);
create table stellara_private.key_exposures (
  child_id uuid references public.children, item_id uuid references stellara_private.items, primary key (child_id,item_id)
);
create table stellara_private.reports (
  id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children,
  period_start date, period_end date, payload jsonb, template_version text, sent_at timestamptz, opened_at timestamptz
);
create table stellara_private.messages (
  id uuid primary key default gen_random_uuid(), guardian_id uuid not null references public.profiles,
  channel text, template text, payload jsonb, status text, sent_at timestamptz
);
create table public.data_requests (
  id uuid primary key default gen_random_uuid(), guardian_id uuid not null references public.profiles,
  child_id uuid not null references public.children, kind text not null check (kind in ('export','delete')),
  status text not null, requested_at timestamptz not null default now(), due_at timestamptz not null,
  download_url text, download_expires_at timestamptz
);
create index data_requests_guardian on public.data_requests(guardian_id,child_id);
create table stellara_private.audit_log (
  id uuid primary key default gen_random_uuid(), actor_id uuid, actor_role text not null,
  action text not null, entity text not null, entity_id uuid, diff jsonb, ip_hash text,
  created_at timestamptz not null default now()
);
create table stellara_private.events (
  id uuid primary key default gen_random_uuid(), name text not null, actor_kind text not null,
  child_id_hash text, props jsonb not null, created_at timestamptz not null default now()
);
create table stellara_private.outages (
  id uuid primary key default gen_random_uuid(), starts_at timestamptz not null,
  ends_at timestamptz not null, excuse_day date, check (ends_at>starts_at)
);

do $$
declare tbl record;
begin
  for tbl in select schemaname,tablename from pg_tables where schemaname='stellara_private'
    or (schemaname='public' and tablename in ('profiles','children','guardianships','consents','data_requests'))
  loop
    execute format('alter table %I.%I enable row level security', tbl.schemaname,tbl.tablename);
    execute format('revoke all on %I.%I from public,anon,authenticated,service_role', tbl.schemaname,tbl.tablename);
    if (tbl.schemaname, tbl.tablename) in (
      ('public','profiles'), ('public','children'), ('public','guardianships'), ('public','consents'),
      ('stellara_private','child_pins'), ('stellara_private','devices'), ('stellara_private','child_sessions'),
      ('stellara_private','rate_limits'), ('stellara_private','curriculum_nodes'), ('stellara_private','items'),
      ('stellara_private','item_versions'), ('stellara_private','item_answers'), ('stellara_private','lessons'),
      ('stellara_private','sets'), ('stellara_private','mastery_states'), ('stellara_private','mastery_events'),
      ('stellara_private','activity_days'), ('stellara_private','learning_state'), ('stellara_private','key_exposures'),
      ('stellara_private','streak_state')
    ) then
      execute format('create policy runtime_access on %I.%I to stellara_runtime using (true) with check (true)', tbl.schemaname,tbl.tablename);
    end if;
  end loop;
end;
$$;
revoke execute on all functions in schema stellara_private from public, anon, authenticated, service_role;
grant select,insert on stellara_private.attempts, stellara_private.attempt_clients,
  stellara_private.stardust_ledger, stellara_private.key_exposures, public.guardianships,
  stellara_private.mastery_events to stellara_runtime;
grant insert on public.profiles to stellara_runtime;
grant select on stellara_private.curriculum_nodes, stellara_private.items,
  stellara_private.item_versions, stellara_private.item_answers, stellara_private.lessons,
  stellara_private.streak_state to stellara_runtime;
grant select,insert,update on public.children, public.consents, stellara_private.child_pins,
  stellara_private.devices, stellara_private.rate_limits, stellara_private.sets,
  stellara_private.mastery_states, stellara_private.activity_days, stellara_private.learning_state
  to stellara_runtime;
grant select,insert,delete on stellara_private.child_sessions to stellara_runtime;
create policy runtime_attempts on stellara_private.attempts to stellara_runtime using (true) with check (true);
create policy runtime_attempt_clients on stellara_private.attempt_clients to stellara_runtime using (true) with check (true);
create policy runtime_ledger on stellara_private.stardust_ledger to stellara_runtime using (true) with check (true);

grant select (guardian_id,child_id) on public.guardianships to authenticated;
create policy guardian_membership on public.guardianships for select to authenticated using (guardian_id=(select auth.uid()));
grant select (id,first_name,avatar_key,year,exam_date,timezone,created_at,status) on public.children to authenticated;
create policy guardian_children on public.children for select to authenticated using (
  exists (select from public.guardianships g where g.child_id=children.id and g.guardian_id=(select auth.uid()))
);
grant select (id,notice_version,method,purposes,created_at,withdrawn_at,verified_at,child_id) on public.consents to authenticated;
create policy guardian_consents on public.consents for select to authenticated using (guardian_id=(select auth.uid()));
grant select (id,child_id,kind,status,requested_at,due_at,download_url,download_expires_at) on public.data_requests to authenticated;
create policy guardian_requests on public.data_requests for select to authenticated using (guardian_id=(select auth.uid()));
