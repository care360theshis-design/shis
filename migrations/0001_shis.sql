-- SHIS persistent records. Parameterized queries only from the server.
-- Preview uses embedded Postgres; set DATABASE_URL for a hosted Postgres pool.

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
  visited_at timestamptz not null,
  symptoms text[] not null,
  temperature text,
  action text not null,
  notes text not null default '',
  notice_kind text not null check (notice_kind in ('visit', 'advisory', 'emergency')),
  alert_status text not null check (alert_status in ('draft', 'sent', 'dismissed')),
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

-- Parent rows are scoped to one student. Medical and admin rows are not.
create table if not exists access_roles (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('medical', 'admin', 'parent')),
  student_id uuid references students (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  check (
    (role = 'parent' and student_id is not null)
    or (role in ('medical', 'admin') and student_id is null)
  )
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

create index if not exists students_active_class_idx on students ("class", section) where status = 'active';
create index if not exists students_status_idx on students (status);
create index if not exists health_visits_student_visited_idx on health_visits (student_id, visited_at desc);
create index if not exists health_visits_visited_idx on health_visits (visited_at);
create index if not exists symptom_reports_class_date_idx on symptom_reports (class_key, reported_on);
create index if not exists symptom_reports_student_date_idx on symptom_reports (student_id, reported_on);
create index if not exists risk_snapshots_class_asof_idx on classroom_risk_snapshots (class_key, as_of desc);
create index if not exists audit_logs_created_idx on audit_logs (created_at desc);
create index if not exists audit_logs_student_idx on audit_logs (student_id, created_at desc);

create or replace function shis_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists students_touch on students;
create trigger students_touch
  before update on students
  for each row execute function shis_touch_updated_at();

drop trigger if exists health_visits_touch on health_visits;
create trigger health_visits_touch
  before update on health_visits
  for each row execute function shis_touch_updated_at();
