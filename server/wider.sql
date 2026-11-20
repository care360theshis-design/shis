create table if not exists wellbeing_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  feeling text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'set_aside')),
  created_at timestamptz not null default now()
);

create table if not exists class_absence (
  id uuid primary key default gen_random_uuid(),
  class_key text not null,
  absent_on date not null default current_date,
  absent_count integer not null check (absent_count >= 0),
  created_at timestamptz not null default now(),
  unique (class_key, absent_on)
);

create table if not exists pilot_measures (
  id uuid primary key default gen_random_uuid(),
  indicator text not null check (indicator in (
    'record', 'communication', 'early_warning', 'usability', 'prevention'
  )),
  duration_ms integer,
  score integer,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists wellbeing_status_idx on wellbeing_reports (status, created_at desc);
create index if not exists class_absence_day_idx on class_absence (absent_on);

alter table wellbeing_reports enable row level security;
alter table class_absence enable row level security;
alter table pilot_measures enable row level security;

alter table students add column if not exists parent_code text;
update students
set parent_code = 'HEAR-10482'
where student_school_id = 'STU-10482' and parent_code is null;

alter table health_visits drop constraint if exists health_visits_parent_ack_check;
alter table health_visits add constraint health_visits_parent_ack_check
  check (parent_ack in ('none', 'seen', 'contacted_school', 'call', 'received', 'contacted', 'responded'));

alter table students add column if not exists phone text;
update students
set student_school_id = '104821', phone = '9811104821', parent_code = '4821'
where student_school_id = 'STU-10482';
update students
set phone = '9811104821', parent_code = '4821'
where student_school_id = '104821' and phone is null;

alter table students add column if not exists date_of_birth date;
alter table students add column if not exists blood_group text;
alter table students add column if not exists medical_history text not null default '';
alter table students add column if not exists photo text;


