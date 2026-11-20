-- SHIS schema for Supabase Postgres (project: TheSHIS).
-- Run this once in the Supabase SQL editor before starting the API.
-- The API uses DATABASE_URL. Until that variable exists, the server stays up
-- and answers that the database is not configured.
--
-- Decision: the public Supabase Data API must not read health rows.
-- Row Level Security is on, and anon/authenticated have no policies.
-- The Express process uses the database owner in DATABASE_URL, which bypasses RLS.

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  student_school_id text not null unique,
  name text not null,
  "class" text not null,
  section text not null,
  status text not null check (status in ('active', 'left', 'graduated')),
  enrolled_from date not null,
  enrolled_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'active' and enrolled_to is null)
    or (status in ('left', 'graduated') and enrolled_to is not null)
  )
);

create table if not exists health_visits (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  visited_at timestamptz not null default now(),
  symptoms text[] not null,
  temperature text,
  action text not null,
  notes text not null default '',
  notice_kind text not null default 'visit' check (notice_kind in ('visit', 'advisory', 'emergency')),
  alert_status text not null default 'draft' check (alert_status in ('draft', 'sent', 'dismissed')),
  alert_text text not null default '',
  parent_ack text not null default 'none' check (parent_ack in ('none', 'received', 'contacted', 'responded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists symptom_reports (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references health_visits (id) on delete cascade,
  student_id uuid not null references students (id) on delete cascade,
  class_key text not null,
  reported_on date not null,
  symptom text not null,
  created_at timestamptz not null default now(),
  unique (visit_id, symptom)
);

create table if not exists classroom_risk_snapshots (
  id uuid primary key default gen_random_uuid(),
  class_key text not null,
  window_days integer not null check (window_days in (3, 14)),
  as_of date not null,
  distinct_students integer not null,
  band text not null check (band in ('low', 'medium', 'high')),
  computed_at timestamptz not null default now(),
  unique (class_key, window_days, as_of)
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_role text not null check (actor_role in ('medical', 'parent', 'system')),
  action text not null,
  entity text not null,
  entity_id uuid,
  student_id uuid references students (id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists students_active_class_idx
  on students ("class", section) where status = 'active';
create index if not exists students_status_idx on students (status);
create index if not exists students_school_id_idx on students (student_school_id);
create index if not exists health_visits_student_visited_idx
  on health_visits (student_id, visited_at desc);
create index if not exists symptom_reports_class_date_idx
  on symptom_reports (class_key, reported_on);
create index if not exists symptom_reports_student_date_idx
  on symptom_reports (student_id, reported_on);
create index if not exists risk_snapshots_class_asof_idx
  on classroom_risk_snapshots (class_key, as_of desc);
create index if not exists audit_logs_created_idx on audit_logs (created_at desc);

alter table students enable row level security;
alter table health_visits enable row level security;
alter table symptom_reports enable row level security;
alter table classroom_risk_snapshots enable row level security;
alter table audit_logs enable row level security;

-- No policies are created on purpose. anon and authenticated cannot pass RLS.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table students from anon;
    revoke all on table health_visits from anon;
    revoke all on table symptom_reports from anon;
    revoke all on table classroom_risk_snapshots from anon;
    revoke all on table audit_logs from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on table students from authenticated;
    revoke all on table health_visits from authenticated;
    revoke all on table symptom_reports from authenticated;
    revoke all on table classroom_risk_snapshots from authenticated;
    revoke all on table audit_logs from authenticated;
  end if;
end $$;
