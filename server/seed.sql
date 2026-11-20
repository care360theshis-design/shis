-- One sample student so the medical room is not empty. No visits.
insert into students (student_school_id, name, "class", section, status, enrolled_from, enrolled_to)
values
  ('104821', 'Student 10482', '8', 'B', 'active', '2024-04-01', null)
on conflict (student_school_id) do nothing;
