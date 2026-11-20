-- Health fields stay ciphertext. The database never stores the room code,
-- a parent code, or a data key in the clear. Wrapping keys are produced in
-- the browser and only the wrapped form is kept here.

alter table students alter column name drop not null;
alter table students add column profile_cipher text;

alter table health_visits alter column symptoms drop not null;
alter table health_visits alter column action drop not null;
alter table health_visits add column record_cipher text;

create table key_wraps (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  holder text not null check (holder in ('medical', 'parent')),
  salt text not null,
  wrapped_key text not null,
  created_at timestamptz not null default now(),
  unique (student_id, holder)
);

create index key_wraps_student_idx on key_wraps (student_id);
