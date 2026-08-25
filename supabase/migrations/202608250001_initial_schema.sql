begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.document_status as enum (
  'draft', 'uploading', 'uploaded', 'queued', 'ocr_processing', 'ocr_complete',
  'ai_processing', 'awaiting_verification', 'verified', 'failed', 'archived'
);
create type public.confidence_level as enum ('high', 'review_recommended', 'uncertain');
create type public.item_status as enum ('not_started', 'in_progress', 'waiting', 'ready', 'completed', 'blocked');
create type public.processing_stage as enum ('queued', 'ocr_processing', 'ai_processing', 'awaiting_verification', 'completed', 'failed', 'cancelled');
create type public.priority_level as enum ('low', 'normal', 'high', 'urgent');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  avatar_path text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  locale text not null default 'en',
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  default_reminder_offsets integer[] not null default array[4320],
  improve_ai_with_content boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  title text not null default 'Untitled document' check (char_length(title) between 1 and 240),
  document_type text,
  category text not null default 'other',
  organization text,
  summary text,
  language text,
  storage_path text,
  preview_path text,
  original_filename text,
  mime_type text not null,
  byte_size bigint check (byte_size is null or byte_size between 0 and 26214400),
  content_hash text check (content_hash is null or content_hash ~ '^[a-f0-9]{64}$'),
  page_count integer check (page_count is null or page_count > 0),
  status public.document_status not null default 'draft',
  status_message text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz,
  archived_at timestamptz,
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(organization, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(document_type, '') || ' ' || coalesce(category, ''))
  ) stored,
  unique (user_id, client_id)
);
create unique index documents_user_hash_active_idx on public.documents(user_id, content_hash)
  where content_hash is not null and archived_at is null and is_sample = false;
create index documents_user_created_idx on public.documents(user_id, created_at desc);
create index documents_user_status_idx on public.documents(user_id, status);
create index documents_search_idx on public.documents using gin(search_vector);

create table public.document_pages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  normalized_text text not null default '',
  width numeric,
  height numeric,
  blocks jsonb not null default '[]'::jsonb,
  search_vector tsvector generated always as (to_tsvector('simple', normalized_text)) stored,
  created_at timestamptz not null default now(),
  unique (document_id, page_number)
);
create index document_pages_document_idx on public.document_pages(document_id, page_number);
create index document_pages_search_idx on public.document_pages using gin(search_vector);

create table public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  schema_version integer not null default 1,
  provider text not null,
  model text not null,
  analysis jsonb not null,
  confidence public.confidence_level not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create unique index document_current_extraction_idx on public.document_extractions(document_id) where is_current;

create table public.obligations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  description text,
  status public.item_status not null default 'not_started',
  priority public.priority_level not null default 'normal',
  due_at timestamptz,
  due_date_is_uncertain boolean not null default false,
  timezone text,
  confidence public.confidence_level not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index obligations_attention_idx on public.obligations(user_id, status, due_at);

create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  obligation_id uuid references public.obligations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  description text,
  is_required boolean not null default true,
  status public.item_status not null default 'not_started',
  confidence public.confidence_level not null,
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index requirements_search_idx on public.requirements using gin(to_tsvector('simple', title || ' ' || coalesce(description, '')));

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  obligation_id uuid references public.obligations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  description text,
  status public.item_status not null default 'not_started',
  priority public.priority_level not null default 'normal',
  due_at timestamptz,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 10080),
  confidence public.confidence_level not null,
  waiting_on text,
  requested_at timestamptz,
  follow_up_at timestamptz,
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index actions_attention_idx on public.actions(user_id, status, due_at);
create index actions_search_idx on public.actions using gin(to_tsvector('simple', title || ' ' || coalesce(description, '')));

create table public.requirement_dependencies (
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  depends_on_requirement_id uuid not null references public.requirements(id) on delete cascade,
  primary key (requirement_id, depends_on_requirement_id),
  check (requirement_id <> depends_on_requirement_id)
);

create table public.action_dependencies (
  action_id uuid not null references public.actions(id) on delete cascade,
  depends_on_action_id uuid not null references public.actions(id) on delete cascade,
  primary key (action_id, depends_on_action_id),
  check (action_id <> depends_on_action_id)
);

create table public.document_evidence (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  extraction_id uuid references public.document_extractions(id) on delete cascade,
  obligation_id uuid references public.obligations(id) on delete cascade,
  requirement_id uuid references public.requirements(id) on delete cascade,
  action_id uuid references public.actions(id) on delete cascade,
  evidence_type text not null,
  page_number integer check (page_number is null or page_number > 0),
  source_text text not null check (char_length(source_text) between 1 and 4000),
  bounding_data jsonb,
  confidence public.confidence_level not null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(extraction_id, obligation_id, requirement_id, action_id) >= 1)
);
create index evidence_document_page_idx on public.document_evidence(document_id, page_number);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  obligation_id uuid references public.obligations(id) on delete cascade,
  action_id uuid references public.actions(id) on delete cascade,
  scheduled_for timestamptz not null,
  timezone text not null,
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) between 1 and 500),
  platform_schedule_id text,
  enabled boolean not null default true,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reminders_due_idx on public.reminders(user_id, enabled, scheduled_for);

create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  idempotency_key uuid not null,
  stage public.processing_stage not null default 'queued',
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  error_code text,
  safe_error_message text,
  provider_request_id text,
  processing_ms integer,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_micros bigint,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  unique (document_id, id)
);
create index processing_jobs_document_idx on public.processing_jobs(document_id, created_at desc);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name citext not null check (char_length(name::text) between 1 and 40),
  color text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.document_tags (
  document_id uuid not null references public.documents(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (document_id, tag_id)
);

create table public.activity_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  obligation_id uuid references public.obligations(id) on delete cascade,
  action_id uuid references public.actions(id) on delete cascade,
  event_type text not null,
  display_message text not null check (char_length(display_message) between 1 and 300),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index activity_user_time_idx on public.activity_history(user_id, occurred_at desc);

create table public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (event_name in (
    'document_import_started', 'document_import_completed', 'document_import_failed',
    'analysis_completed', 'analysis_failed', 'verification_completed',
    'action_completed', 'deadline_completed_on_time', 'search_used', 'reminder_created'
  )),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint product_events_safe_metadata check (
    jsonb_typeof(metadata) = 'object' and
    case event_name
      when 'document_import_started' then metadata in ('{"sourceKind":"camera"}'::jsonb, '{"sourceKind":"photo"}'::jsonb, '{"sourceKind":"file"}'::jsonb, '{"sourceKind":"text"}'::jsonb)
      when 'document_import_completed' then metadata in ('{"outcome":"processing"}'::jsonb, '{"outcome":"waiting_connection"}'::jsonb)
      when 'document_import_failed' then metadata in ('{"reason":"cancelled"}'::jsonb, '{"reason":"duplicate"}'::jsonb, '{"reason":"validation"}'::jsonb, '{"reason":"network_or_server"}'::jsonb)
      when 'analysis_completed' then metadata = '{}'::jsonb
      when 'analysis_failed' then metadata in ('{"reason":"invalid_provider_output"}'::jsonb, '{"reason":"processing_failed"}'::jsonb)
      when 'verification_completed' then metadata in ('{"reminderRequested":true}'::jsonb, '{"reminderRequested":false}'::jsonb)
      when 'action_completed' then metadata = '{"kind":"action"}'::jsonb
      when 'deadline_completed_on_time' then metadata = '{}'::jsonb
      when 'search_used' then metadata ? 'resultCount' and metadata - 'resultCount' = '{}'::jsonb and jsonb_typeof(metadata -> 'resultCount') = 'number' and (metadata ->> 'resultCount')::integer between 0 and 100
      when 'reminder_created' then metadata = '{"channel":"local"}'::jsonb
      else false
    end
  )
);
create index product_events_name_time_idx on public.product_events(event_name, occurred_at desc);

create table public.notification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  provider text not null check (provider in ('expo', 'fcm', 'apns')),
  token text not null,
  platform text not null check (platform in ('android', 'ios')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_id, provider)
);

-- A child row cannot claim the current user while pointing at another user's
-- document. RLS remains the first boundary; these constraints are defense in depth.
alter table public.documents add constraint documents_id_user_unique unique (id, user_id);
alter table public.tags add constraint tags_id_user_unique unique (id, user_id);
alter table public.document_extractions add constraint document_extractions_id_document_user_unique unique (id, document_id, user_id);
alter table public.obligations add constraint obligations_id_document_user_unique unique (id, document_id, user_id);
alter table public.requirements add constraint requirements_id_document_user_unique unique (id, document_id, user_id);
alter table public.actions add constraint actions_id_document_user_unique unique (id, document_id, user_id);
alter table public.document_pages add constraint document_pages_document_owner_fk foreign key (document_id, user_id) references public.documents(id, user_id) on delete cascade;
alter table public.document_extractions add constraint document_extractions_document_owner_fk foreign key (document_id, user_id) references public.documents(id, user_id) on delete cascade;
alter table public.obligations add constraint obligations_document_owner_fk foreign key (document_id, user_id) references public.documents(id, user_id) on delete cascade;
alter table public.requirements add constraint requirements_document_owner_fk foreign key (document_id, user_id) references public.documents(id, user_id) on delete cascade;
alter table public.actions add constraint actions_document_owner_fk foreign key (document_id, user_id) references public.documents(id, user_id) on delete cascade;
alter table public.document_evidence add constraint document_evidence_document_owner_fk foreign key (document_id, user_id) references public.documents(id, user_id) on delete cascade;
alter table public.reminders add constraint reminders_document_owner_fk foreign key (document_id, user_id) references public.documents(id, user_id) on delete cascade;
alter table public.processing_jobs add constraint processing_jobs_document_owner_fk foreign key (document_id, user_id) references public.documents(id, user_id) on delete cascade;
alter table public.document_tags add constraint document_tags_document_owner_fk foreign key (document_id, user_id) references public.documents(id, user_id) on delete cascade;
alter table public.document_tags add constraint document_tags_tag_owner_fk foreign key (tag_id, user_id) references public.tags(id, user_id) on delete cascade;
alter table public.activity_history add constraint activity_history_document_owner_fk foreign key (document_id, user_id) references public.documents(id, user_id) on delete cascade;
alter table public.requirements add constraint requirements_obligation_owner_fk foreign key (obligation_id, document_id, user_id) references public.obligations(id, document_id, user_id) on delete cascade;
alter table public.actions add constraint actions_obligation_owner_fk foreign key (obligation_id, document_id, user_id) references public.obligations(id, document_id, user_id) on delete cascade;
alter table public.document_evidence add constraint document_evidence_extraction_owner_fk foreign key (extraction_id, document_id, user_id) references public.document_extractions(id, document_id, user_id) on delete cascade;
alter table public.document_evidence add constraint document_evidence_obligation_owner_fk foreign key (obligation_id, document_id, user_id) references public.obligations(id, document_id, user_id) on delete cascade;
alter table public.document_evidence add constraint document_evidence_requirement_owner_fk foreign key (requirement_id, document_id, user_id) references public.requirements(id, document_id, user_id) on delete cascade;
alter table public.document_evidence add constraint document_evidence_action_owner_fk foreign key (action_id, document_id, user_id) references public.actions(id, document_id, user_id) on delete cascade;
alter table public.reminders add constraint reminders_obligation_owner_fk foreign key (obligation_id, document_id, user_id) references public.obligations(id, document_id, user_id) on delete cascade;
alter table public.reminders add constraint reminders_action_owner_fk foreign key (action_id, document_id, user_id) references public.actions(id, document_id, user_id) on delete cascade;
alter table public.activity_history add constraint activity_history_obligation_owner_fk foreign key (obligation_id, document_id, user_id) references public.obligations(id, document_id, user_id) on delete cascade;
alter table public.activity_history add constraint activity_history_action_owner_fk foreign key (action_id, document_id, user_id) references public.actions(id, document_id, user_id) on delete cascade;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','user_preferences','documents','obligations','requirements','actions','reminders','processing_jobs']
  loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''));
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.verify_document(p_document_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  owner_id uuid := auth.uid();
  obligation_id uuid;
  secondary_obligation_id uuid;
  requirement_id uuid;
  action_id uuid;
  requirement_ids uuid[] := array[]::uuid[];
  action_ids uuid[] := array[]::uuid[];
  item_index integer;
  dependency_index integer;
  item jsonb;
  deadline jsonb := p_payload -> 'deadline';
  verified_timestamp timestamptz := now();
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.documents where id = p_document_id and user_id = owner_id and status in ('awaiting_verification', 'verified')) then
    raise exception 'Document is not ready for verification';
  end if;
  if nullif(trim(p_payload ->> 'title'), '') is null then raise exception 'Plan title is required'; end if;

  delete from public.obligations where document_id = p_document_id and user_id = owner_id;
  insert into public.obligations (document_id, user_id, title, description, status, priority, due_at, due_date_is_uncertain, timezone, confidence)
  values (
    p_document_id,
    owner_id,
    left(p_payload ->> 'title', 240),
    nullif(p_payload ->> 'summary', ''),
    'not_started',
    coalesce(nullif(p_payload ->> 'priority', '')::public.priority_level, 'normal'),
    nullif(deadline ->> 'date', '')::timestamptz,
    coalesce((deadline ->> 'uncertain')::boolean, false),
    nullif(p_payload ->> 'timezone', ''),
    coalesce(nullif(deadline ->> 'confidence', '')::public.confidence_level, 'high')
  ) returning id into obligation_id;

  if nullif(deadline ->> 'sourceText', '') is not null then
    insert into public.document_evidence (document_id, user_id, obligation_id, evidence_type, page_number, source_text, confidence)
    values (p_document_id, owner_id, obligation_id, 'deadline', nullif(deadline ->> 'pageNumber', '')::integer, left(deadline ->> 'sourceText', 4000), coalesce(nullif(deadline ->> 'confidence', '')::public.confidence_level, 'high'));
  end if;

  for item in select value from jsonb_array_elements(coalesce(p_payload -> 'additionalDeadlines', '[]'::jsonb)) loop
    if nullif(trim(item ->> 'label'), '') is null then continue; end if;
    insert into public.obligations (document_id, user_id, title, status, priority, due_at, due_date_is_uncertain, timezone, confidence)
    values (p_document_id, owner_id, left(item ->> 'label', 240), 'not_started', 'normal', nullif(item ->> 'date', '')::timestamptz, coalesce((item ->> 'uncertain')::boolean, false), nullif(p_payload ->> 'timezone', ''), coalesce(nullif(item ->> 'confidence', '')::public.confidence_level, 'high'))
    returning id into secondary_obligation_id;
    if nullif(item ->> 'sourceText', '') is not null then
      insert into public.document_evidence (document_id, user_id, obligation_id, evidence_type, page_number, source_text, confidence)
      values (p_document_id, owner_id, secondary_obligation_id, 'deadline', nullif(item ->> 'pageNumber', '')::integer, left(item ->> 'sourceText', 4000), coalesce(nullif(item ->> 'confidence', '')::public.confidence_level, 'high'));
    end if;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(p_payload -> 'requirements', '[]'::jsonb)) loop
    if nullif(trim(item ->> 'title'), '') is null then continue; end if;
    insert into public.requirements (document_id, obligation_id, user_id, title, description, is_required, confidence, sort_order)
    values (p_document_id, obligation_id, owner_id, left(item ->> 'title', 240), nullif(item ->> 'description', ''), coalesce((item ->> 'required')::boolean, true), coalesce(nullif(item ->> 'confidence', '')::public.confidence_level, 'high'), coalesce((item ->> 'sortOrder')::integer, 0))
    returning id into requirement_id;
    requirement_ids := array_append(requirement_ids, requirement_id);
    if nullif(item ->> 'sourceText', '') is not null and item ->> 'sourceText' <> 'Added by user' then
      insert into public.document_evidence (document_id, user_id, requirement_id, evidence_type, page_number, source_text, confidence)
      values (p_document_id, owner_id, requirement_id, 'requirement', nullif(item ->> 'pageNumber', '')::integer, left(item ->> 'sourceText', 4000), coalesce(nullif(item ->> 'confidence', '')::public.confidence_level, 'high'));
    end if;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(p_payload -> 'actions', '[]'::jsonb)) loop
    if nullif(trim(item ->> 'title'), '') is null then continue; end if;
    insert into public.actions (document_id, obligation_id, user_id, title, description, priority, due_at, confidence, sort_order)
    values (p_document_id, obligation_id, owner_id, left(item ->> 'title', 240), nullif(item ->> 'description', ''), coalesce(nullif(item ->> 'priority', '')::public.priority_level, 'normal'), nullif(item ->> 'dueDate', '')::timestamptz, coalesce(nullif(item ->> 'confidence', '')::public.confidence_level, 'high'), coalesce((item ->> 'sortOrder')::integer, 0))
    returning id into action_id;
    action_ids := array_append(action_ids, action_id);
    if nullif(item ->> 'sourceText', '') is not null and item ->> 'sourceText' <> 'Added by user' then
      insert into public.document_evidence (document_id, user_id, action_id, evidence_type, page_number, source_text, confidence)
      values (p_document_id, owner_id, action_id, 'action', nullif(item ->> 'pageNumber', '')::integer, left(item ->> 'sourceText', 4000), coalesce(nullif(item ->> 'confidence', '')::public.confidence_level, 'high'));
    end if;
  end loop;

  item_index := 0;
  for item in select value from jsonb_array_elements(coalesce(p_payload -> 'requirements', '[]'::jsonb)) loop
    for dependency_index in select value::integer from jsonb_array_elements_text(coalesce(item -> 'dependsOnRequirementIndexes', '[]'::jsonb)) loop
      if dependency_index >= 0 and dependency_index < item_index and item_index < cardinality(requirement_ids) then
        insert into public.requirement_dependencies (requirement_id, depends_on_requirement_id)
        values (requirement_ids[item_index + 1], requirement_ids[dependency_index + 1])
        on conflict do nothing;
      end if;
    end loop;
    item_index := item_index + 1;
  end loop;

  item_index := 0;
  for item in select value from jsonb_array_elements(coalesce(p_payload -> 'actions', '[]'::jsonb)) loop
    for dependency_index in select value::integer from jsonb_array_elements_text(coalesce(item -> 'dependsOnActionIndexes', '[]'::jsonb)) loop
      if dependency_index >= 0 and dependency_index < item_index and item_index < cardinality(action_ids) then
        insert into public.action_dependencies (action_id, depends_on_action_id)
        values (action_ids[item_index + 1], action_ids[dependency_index + 1])
        on conflict do nothing;
      end if;
    end loop;
    item_index := item_index + 1;
  end loop;

  update public.document_extractions set verified_at = verified_timestamp where document_id = p_document_id and user_id = owner_id and is_current;
  update public.documents set status = 'verified', status_message = null where id = p_document_id and user_id = owner_id;
  update public.processing_jobs set stage = 'completed', finished_at = coalesce(finished_at, verified_timestamp) where document_id = p_document_id and user_id = owner_id and stage = 'awaiting_verification';
  insert into public.activity_history (user_id, document_id, obligation_id, event_type, display_message)
  values (owner_id, p_document_id, obligation_id, 'verification_completed', 'Action plan verified and created.');
  return jsonb_build_object('obligationId', obligation_id, 'verifiedAt', verified_timestamp);
end;
$$;

create or replace function public.set_requirement_status(p_requirement_id uuid, p_status public.item_status)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  changed public.requirements;
  document_completed boolean := false;
  deadline_completed_on_time boolean := false;
begin
  update public.requirements set status = p_status, completed_at = case when p_status = 'completed' then now() else null end
  where id = p_requirement_id and user_id = auth.uid() returning * into changed;
  if changed.id is null then raise exception 'Requirement not found'; end if;
  insert into public.activity_history (user_id, document_id, obligation_id, event_type, display_message)
  values (auth.uid(), changed.document_id, changed.obligation_id, 'requirement_status_changed', case when p_status = 'completed' then 'Requirement completed.' else 'Requirement reopened.' end);
  if changed.obligation_id is not null then
    select
      not exists (select 1 from public.requirements where obligation_id = changed.obligation_id and user_id = auth.uid() and is_required and status <> 'completed')
      and not exists (select 1 from public.actions where obligation_id = changed.obligation_id and user_id = auth.uid() and status <> 'completed')
    into document_completed;
    update public.obligations
      set status = case when document_completed then 'completed'::public.item_status else 'in_progress'::public.item_status end,
          completed_at = case when document_completed then now() else null end
      where id = changed.obligation_id and user_id = auth.uid();
    if document_completed then
      select due_at is not null and now() <= due_at into deadline_completed_on_time
      from public.obligations where id = changed.obligation_id and user_id = auth.uid();
    end if;
  end if;
  return jsonb_build_object('documentCompleted', document_completed, 'deadlineCompletedOnTime', deadline_completed_on_time, 'documentId', changed.document_id);
end;
$$;

create or replace function public.set_action_status(p_action_id uuid, p_status public.item_status)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  changed public.actions;
  document_completed boolean := false;
  deadline_completed_on_time boolean := false;
begin
  update public.actions set
    status = p_status,
    completed_at = case when p_status = 'completed' then now() else null end,
    waiting_on = case when p_status = 'waiting' then waiting_on else null end,
    requested_at = case when p_status = 'waiting' then requested_at else null end,
    follow_up_at = case when p_status = 'waiting' then follow_up_at else null end
  where id = p_action_id and user_id = auth.uid() returning * into changed;
  if changed.id is null then raise exception 'Action not found'; end if;
  insert into public.activity_history (user_id, document_id, obligation_id, action_id, event_type, display_message)
  values (auth.uid(), changed.document_id, changed.obligation_id, changed.id, 'action_status_changed', case when p_status = 'completed' then 'Action completed.' else 'Action updated.' end);
  if changed.obligation_id is not null then
    select
      not exists (select 1 from public.requirements where obligation_id = changed.obligation_id and user_id = auth.uid() and is_required and status <> 'completed')
      and not exists (select 1 from public.actions where obligation_id = changed.obligation_id and user_id = auth.uid() and status <> 'completed')
    into document_completed;
    update public.obligations
      set status = case when document_completed then 'completed'::public.item_status else 'in_progress'::public.item_status end,
          completed_at = case when document_completed then now() else null end
      where id = changed.obligation_id and user_id = auth.uid();
    if document_completed then
      select due_at is not null and now() <= due_at into deadline_completed_on_time
      from public.obligations where id = changed.obligation_id and user_id = auth.uid();
    end if;
  end if;
  return jsonb_build_object('documentCompleted', document_completed, 'deadlineCompletedOnTime', deadline_completed_on_time, 'documentId', changed.document_id);
end;
$$;

create or replace function public.set_action_waiting(p_action_id uuid, p_waiting_on text, p_follow_up_at timestamptz default null)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  changed public.actions;
  normalized_waiting_on text := nullif(trim(p_waiting_on), '');
begin
  if normalized_waiting_on is not null and char_length(normalized_waiting_on) > 100 then
    raise exception 'Waiting-on label is too long';
  end if;
  update public.actions set
    status = case when normalized_waiting_on is null then 'in_progress'::public.item_status else 'waiting'::public.item_status end,
    waiting_on = normalized_waiting_on,
    requested_at = case when normalized_waiting_on is null then null else coalesce(requested_at, now()) end,
    follow_up_at = case when normalized_waiting_on is null then null else p_follow_up_at end,
    completed_at = null
  where id = p_action_id and user_id = auth.uid()
  returning * into changed;
  if changed.id is null then raise exception 'Action not found'; end if;
  insert into public.activity_history (user_id, document_id, obligation_id, action_id, event_type, display_message)
  values (
    auth.uid(), changed.document_id, changed.obligation_id, changed.id,
    case when normalized_waiting_on is null then 'action_resumed' else 'action_waiting' end,
    case when normalized_waiting_on is null then 'Waiting action resumed.' else 'Marked as waiting on ' || normalized_waiting_on || '.' end
  );
  return jsonb_build_object('documentCompleted', false, 'documentId', changed.document_id);
end;
$$;

create or replace function public.search_documents(p_query text)
returns setof public.documents
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select d.* from public.documents d
  where d.user_id = auth.uid()
    and d.archived_at is null
    and length(trim(p_query)) between 2 and 100
    and (
      d.search_vector @@ websearch_to_tsquery('simple', p_query)
      or exists (select 1 from public.document_pages p where p.document_id = d.id and p.user_id = auth.uid() and p.search_vector @@ websearch_to_tsquery('simple', p_query))
      or exists (select 1 from public.requirements r where r.document_id = d.id and r.user_id = auth.uid() and to_tsvector('simple', r.title || ' ' || coalesce(r.description, '')) @@ websearch_to_tsquery('simple', p_query))
      or exists (select 1 from public.actions a where a.document_id = d.id and a.user_id = auth.uid() and to_tsvector('simple', a.title || ' ' || coalesce(a.description, '')) @@ websearch_to_tsquery('simple', p_query))
      or exists (select 1 from public.obligations o where o.document_id = d.id and o.user_id = auth.uid() and to_tsvector('simple', o.title || ' ' || coalesce(o.description, '')) @@ websearch_to_tsquery('simple', p_query))
      or exists (select 1 from public.obligations o where o.document_id = d.id and o.user_id = auth.uid() and o.due_at is not null and lower(to_char(o.due_at at time zone 'UTC', 'FMMonth DD YYYY')) like '%' || lower(trim(p_query)) || '%')
      or exists (select 1 from public.document_tags dt join public.tags t on t.id = dt.tag_id and t.user_id = dt.user_id where dt.document_id = d.id and dt.user_id = auth.uid() and lower(t.name::text) like '%' || lower(trim(p_query)) || '%')
    )
  order by d.created_at desc
  limit 100;
$$;

revoke execute on function public.verify_document(uuid, jsonb) from public, anon;
revoke execute on function public.set_requirement_status(uuid, public.item_status) from public, anon;
revoke execute on function public.set_action_status(uuid, public.item_status) from public, anon;
revoke execute on function public.set_action_waiting(uuid, text, timestamptz) from public, anon;
revoke execute on function public.search_documents(text) from public, anon;
grant execute on function public.verify_document(uuid, jsonb) to authenticated;
grant execute on function public.set_requirement_status(uuid, public.item_status) to authenticated;
grant execute on function public.set_action_status(uuid, public.item_status) to authenticated;
grant execute on function public.set_action_waiting(uuid, text, timestamptz) to authenticated;
grant execute on function public.search_documents(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.documents enable row level security;
alter table public.document_pages enable row level security;
alter table public.document_extractions enable row level security;
alter table public.obligations enable row level security;
alter table public.requirements enable row level security;
alter table public.actions enable row level security;
alter table public.requirement_dependencies enable row level security;
alter table public.action_dependencies enable row level security;
alter table public.document_evidence enable row level security;
alter table public.reminders enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.tags enable row level security;
alter table public.document_tags enable row level security;
alter table public.activity_history enable row level security;
alter table public.notification_tokens enable row level security;
alter table public.product_events enable row level security;

create policy profiles_owner_all on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy preferences_owner_all on public.user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare table_name text;
begin
  foreach table_name in array array['documents','document_pages','document_extractions','obligations','requirements','actions','document_evidence','reminders','processing_jobs','tags','document_tags','activity_history','notification_tokens','product_events']
  loop
    execute format('create policy %I_owner_select on public.%I for select using (user_id = auth.uid())', table_name, table_name);
    execute format('create policy %I_owner_insert on public.%I for insert with check (user_id = auth.uid())', table_name, table_name);
    execute format('create policy %I_owner_update on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', table_name, table_name);
    execute format('create policy %I_owner_delete on public.%I for delete using (user_id = auth.uid())', table_name, table_name);
  end loop;
end $$;

create policy requirement_dependencies_owner_select on public.requirement_dependencies for select using (
  exists (select 1 from public.requirements r where r.id = requirement_id and r.user_id = auth.uid())
);
create policy requirement_dependencies_owner_insert on public.requirement_dependencies for insert with check (
  exists (select 1 from public.requirements r where r.id = requirement_id and r.user_id = auth.uid()) and
  exists (select 1 from public.requirements r where r.id = depends_on_requirement_id and r.user_id = auth.uid())
);
create policy requirement_dependencies_owner_delete on public.requirement_dependencies for delete using (
  exists (select 1 from public.requirements r where r.id = requirement_id and r.user_id = auth.uid())
);

create policy action_dependencies_owner_select on public.action_dependencies for select using (
  exists (select 1 from public.actions a where a.id = action_id and a.user_id = auth.uid())
);
create policy action_dependencies_owner_insert on public.action_dependencies for insert with check (
  exists (select 1 from public.actions a where a.id = action_id and a.user_id = auth.uid()) and
  exists (select 1 from public.actions a where a.id = depends_on_action_id and a.user_id = auth.uid())
);
create policy action_dependencies_owner_delete on public.action_dependencies for delete using (
  exists (select 1 from public.actions a where a.id = action_id and a.user_id = auth.uid())
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 26214400,
  array['application/pdf','image/jpeg','image/png','image/heic','image/heif','text/plain']
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy document_objects_owner_select on storage.objects for select to authenticated
using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy document_objects_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy document_objects_owner_update on storage.objects for update to authenticated
using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy document_objects_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
