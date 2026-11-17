create schema if not exists private;
revoke all on schema private from public;
create role child nologin;
grant child to authenticator;
grant usage on schema public, private to authenticated, child, service_role;

create table public.profiles (
 id uuid primary key references auth.users(id), display_name text not null default '',
 email text, locale text not null default 'en-NG', created_at timestamptz not null default now()
);
create function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,email,display_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'display_name',''));
 return new;
end $$;
revoke all on function private.create_profile() from public;
create trigger create_profile after insert on auth.users for each row execute function private.create_profile();
create table public.consents (
 id uuid primary key default gen_random_uuid(), guardian_id uuid not null references public.profiles(id), child_id uuid,
 notice_version text not null, purposes jsonb not null, method text not null check(method='declaration_v0'),
 declared_adult boolean not null check(declared_adult), verified_at timestamptz, withdrawn_at timestamptz,
 evidence_ref text, created_at timestamptz not null default now()
);
create index consents_guardian_idx on public.consents(guardian_id);
create table public.children (
 id uuid primary key default gen_random_uuid(), guardian_id uuid not null references public.profiles(id),
 first_name text not null, avatar_key text not null, year integer not null check(year between 1 and 6),
 exam_date date, timezone text not null default 'Africa/Lagos', status text not null default 'active' check(status in ('active','paused','deletion_pending')),
 pin_hash text not null, failed_pin_count integer not null default 0 check(failed_pin_count between 0 and 4), locked_until timestamptz,
 term_id text not null default '2026-T1', last_active_at timestamptz, created_at timestamptz not null default now()
);
create index children_guardian_idx on public.children(guardian_id);
alter table public.consents add foreign key(child_id) references public.children(id);
create index consents_child_idx on public.consents(child_id);
create function private.require_consent() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.consents where guardian_id=new.guardian_id and verified_at is not null and withdrawn_at is null) then
  raise exception 'CONSENT_REQUIRED';
 end if;
 return new;
end $$;
revoke all on function private.require_consent() from public;
create trigger require_consent before insert on public.children for each row execute function private.require_consent();

create table public.topics(id uuid primary key, code text not null unique, title text not null, year integer not null check(year between 1 and 6), strand_id text not null, sort integer not null default 0);
create table public.items(id uuid primary key, topic_id uuid not null references public.topics(id), current_version integer not null default 1, status text not null default 'draft');
create index items_topic_idx on public.items(topic_id);
create table public.item_versions (
 item_id uuid not null references public.items(id), version integer not null check(version>0), type text not null check(type in ('single_choice','multi_choice','numeric','ordering','match','cloze')),
 stem text not null, options jsonb, "left" jsonb, "right" jsonb, slots jsonb,
 explanation text not null, hint text, difficulty text not null check(difficulty in ('easy','standard','hard')),
 tags text[] not null default '{}', stimulus_id uuid, media jsonb not null default '[]',
 curriculum_edition text not null, provenance text check(provenance in ('original','licensed','public_domain')), licence_ref text,
 author_id uuid, reviewer_id uuid, answer_verified_at timestamptz, status text not null default 'draft', published_at timestamptz,
 primary key(item_id,version)
);
create table public.item_answers(item_id uuid not null, version integer not null, answer jsonb not null, primary key(item_id,version), foreign key(item_id,version) references public.item_versions(item_id,version));
create function private.guard_content() returns trigger language plpgsql set search_path = '' as $$
begin
 if tg_op='DELETE' then
  if old.status in ('published','retired') then raise exception 'PUBLISHED_IMMUTABLE'; end if; return old;
 end if;
 if tg_op='UPDATE' and old.status in ('published','retired') and not
  (old.status='published' and new.status='retired' and (to_jsonb(new)-'status')=(to_jsonb(old)-'status')) then raise exception 'PUBLISHED_IMMUTABLE'; end if;
 if new.status='published' and (new.provenance is null or new.author_id is null or new.reviewer_id is null or new.author_id=new.reviewer_id or new.answer_verified_at is null
  or (new.provenance='licensed' and nullif(btrim(new.licence_ref),'') is null)
  or exists(select 1 from jsonb_array_elements(new.media) m where nullif(btrim(m->>'alt_text'),'') is null)) then raise exception 'PUBLISH_REQUIREMENTS'; end if;
 return new;
end $$;
create trigger guard_content before insert or update or delete on public.item_versions for each row execute function private.guard_content();
create function private.require_answer() returns trigger language plpgsql set search_path = '' as $$
begin
 if exists(select 1 from public.item_versions where item_id=new.item_id and version=new.version and status='published')
 and not exists(select 1 from public.item_answers where item_id=new.item_id and version=new.version) then raise exception 'ANSWER_REQUIRED'; end if; return new;
end $$;
create constraint trigger require_answer after insert or update on public.item_versions deferrable initially deferred for each row execute function private.require_answer();
create function private.guard_answer() returns trigger language plpgsql set search_path = '' as $$
begin
 if exists(select 1 from public.item_versions where item_id=old.item_id and version=old.version and status in ('published','retired')) then raise exception 'PUBLISHED_IMMUTABLE'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger guard_answer before update or delete on public.item_answers for each row execute function private.guard_answer();

create table public.sets (
 id uuid primary key, child_id uuid not null references public.children(id), kind text not null,
 topic_ids uuid[] not null, review_topic_ids uuid[] not null, assignment_id uuid, items jsonb not null,
 started_at timestamptz not null, finished_at timestamptz, placement jsonb, rules_version text not null
);
create index sets_child_idx on public.sets(child_id);
create table public.attempt_client_ids(client_id uuid primary key, child_id uuid not null references public.children(id), received_at timestamptz not null, unique(client_id,received_at));
create index attempt_client_ids_child_idx on public.attempt_client_ids(child_id);
create table public.attempts (
 id uuid not null, client_id uuid not null, child_id uuid not null references public.children(id),
 set_id uuid not null references public.sets(id), item_id uuid not null, item_version integer not null, topic_id uuid not null references public.topics(id),
 response jsonb not null, is_correct boolean not null, scored boolean not null, confidence text, reason text not null,
 hint_shown boolean not null, response_ms integer not null check(response_ms>=0), recorded_at timestamptz not null,
 received_at timestamptz not null, answered_at timestamptz not null, learning_day date not null,
 key_on_device boolean not null, rules_version text not null, primary key(id,received_at), unique(client_id,received_at),
 foreign key(client_id,received_at) references public.attempt_client_ids(client_id,received_at),
 foreign key(item_id,item_version) references public.item_versions(item_id,version)
) partition by range(received_at);
do $$ declare d date := '2026-11-01'; begin
 while d < date '2028-01-01' loop
  execute format('create table public.attempts_%s partition of public.attempts for values from (%L) to (%L)',to_char(d,'YYYY_MM'),d,d+interval '1 month');
  d := d+interval '1 month';
 end loop;
end $$;
create table public.attempts_default partition of public.attempts default;
create index attempts_client_idx on public.attempts(client_id);
create index attempts_child_idx on public.attempts(child_id);
create index attempts_set_idx on public.attempts(set_id);
create index attempts_item_idx on public.attempts(item_id,item_version);
create index attempts_topic_idx on public.attempts(topic_id);
create table public.mastery_states(child_id uuid not null references public.children(id), topic_id uuid not null references public.topics(id), level integer not null check(level between 0 and 5), scored_count integer not null, state jsonb not null, updated_at timestamptz not null default now(), primary key(child_id,topic_id));
create index mastery_states_topic_idx on public.mastery_states(topic_id);
create table public.mastery_events(id uuid primary key, child_id uuid not null references public.children(id), topic_id uuid not null references public.topics(id), from_level integer not null, to_level integer not null, cause text not null, attempt_id uuid, created_at timestamptz not null);
create index mastery_events_child_idx on public.mastery_events(child_id);
create index mastery_events_topic_idx on public.mastery_events(topic_id);
create table public.stardust_state(child_id uuid primary key references public.children(id), total integer not null, state jsonb not null);
create table public.stardust_ledger(id uuid primary key, child_id uuid not null references public.children(id), event text not null check(event in ('response','review','test','level')), amount integer not null, learning_day date not null, ref_id text not null, created_at timestamptz not null);
create index stardust_ledger_refs_idx on public.stardust_ledger(child_id,ref_id);
create table public.activity_days(child_id uuid not null references public.children(id), learning_day date not null, scored_count integer not null, review_sets_done integer not null, qualifying boolean not null, credited_by text, primary key(child_id,learning_day));
create table public.streaks(child_id uuid primary key references public.children(id), run_length integer not null, state jsonb not null);
create table public.reviews(child_id uuid not null references public.children(id), topic_id uuid not null references public.topics(id), due_day date not null, kind text not null check(kind in ('scheduled','due_queue')), ordinal integer not null, primary key(child_id,kind,ordinal));
create index reviews_topic_idx on public.reviews(topic_id);
create table public.outages(id uuid primary key default gen_random_uuid(), starts_at timestamptz not null, ends_at timestamptz not null check(ends_at>starts_at));
create table public.item_stats(item_id uuid primary key references public.items(id), exposure_count integer not null, correct_count integer not null, p_correct double precision not null, updated_at timestamptz not null);
create function private.append_only() returns trigger language plpgsql set search_path = '' as $$ begin raise exception 'APPEND_ONLY'; end $$;
create trigger attempts_append_only before update or delete on public.attempts for each row execute function private.append_only();
create trigger ledger_append_only before update or delete on public.stardust_ledger for each row execute function private.append_only();

create table private.child_sessions(id uuid primary key default gen_random_uuid(), child_id uuid not null references public.children(id), guardian_id uuid not null references public.profiles(id), device_id uuid not null, expires_at timestamptz not null, revoked_at timestamptz, created_at timestamptz not null default now());
create index sessions_child_idx on private.child_sessions(child_id);
create index sessions_guardian_idx on private.child_sessions(guardian_id);
create table private.refresh_tokens(token_hash text primary key, session_id uuid not null references private.child_sessions(id), consumed_at timestamptz, created_at timestamptz not null default now());
create index refresh_session_idx on private.refresh_tokens(session_id);
alter table private.child_sessions enable row level security;
alter table private.refresh_tokens enable row level security;
grant all on private.child_sessions, private.refresh_tokens to service_role;

create function private.my_child_ids() returns setof uuid language sql stable security definer set search_path = '' as $$
 select c.id from public.children c where
 ((select auth.jwt()->>'role')='authenticated' and c.guardian_id=(select auth.uid()))
 or ((select auth.jwt()->>'role')='child' and c.id::text=(select auth.jwt()->>'child_id') and c.guardian_id::text=(select auth.jwt()->>'guardian_id') and c.status='active'
 and exists(select 1 from private.child_sessions s where s.id::text=(select auth.jwt()->>'session_id') and s.child_id=c.id and s.guardian_id=c.guardian_id and s.revoked_at is null and s.expires_at>now())
 and exists(select 1 from public.consents co where co.child_id=c.id and co.guardian_id=c.guardian_id and co.verified_at is not null and co.withdrawn_at is null));
$$;
revoke all on function private.my_child_ids() from public, anon;
grant execute on function private.my_child_ids() to authenticated, child;
do $$ declare r record; begin
 for r in select tablename from pg_tables where schemaname='public' loop
  execute format('alter table public.%I enable row level security',r.tablename);
  execute format('revoke all on public.%I from public, anon, authenticated, child',r.tablename);
 end loop;
end $$;
grant select on public.profiles,public.consents to authenticated;
create policy profiles_own on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy consents_own on public.consents for select to authenticated using(guardian_id=(select auth.uid()));
grant select(id,guardian_id,first_name,avatar_key,year,exam_date,timezone,status,term_id,last_active_at,created_at) on public.children to authenticated,child;
create policy children_own on public.children for select to authenticated,child using(id in(select private.my_child_ids()));
do $$ declare t text; begin
 foreach t in array array['sets','attempts','mastery_states','mastery_events','stardust_state','stardust_ledger','activity_days','streaks','reviews'] loop
  execute format('grant select on public.%I to authenticated,child',t);
  execute format('create policy family_read on public.%I for select to authenticated,child using(child_id in(select private.my_child_ids()))',t);
 end loop;
end $$;
grant select on public.topics,public.items to authenticated,child;
grant select(item_id,version,type,stem,options,"left","right",slots,difficulty,tags,stimulus_id,media,curriculum_edition,status,published_at) on public.item_versions to authenticated,child;
create policy guardian_topics on public.topics for select to authenticated using(exists(select 1 from public.items i where i.topic_id=topics.id and i.status='published'));
create policy child_topics on public.topics for select to child using((select exists(select private.my_child_ids())) and exists(select 1 from public.items i where i.topic_id=topics.id and i.status='published'));
create policy guardian_items on public.items for select to authenticated using(status='published');
create policy child_items on public.items for select to child using(status='published' and (select exists(select private.my_child_ids())));
create policy guardian_versions on public.item_versions for select to authenticated using(status='published');
create policy child_versions on public.item_versions for select to child using(status='published' and (select exists(select private.my_child_ids())));
revoke all on public.item_answers from public,anon,authenticated,child;
revoke update,delete,truncate on public.attempts,public.stardust_ledger from public,anon,authenticated,child,service_role,postgres;
do $$ declare r record; begin
 for r in select inhrelid::regclass as partition from pg_inherits where inhparent='public.attempts'::regclass loop
  execute format('revoke update,delete,truncate on %s from public,anon,authenticated,child,service_role,postgres',r.partition);
 end loop;
end $$;
revoke update,delete on public.consents from public,anon,authenticated,child;
revoke execute on all functions in schema private from public;
