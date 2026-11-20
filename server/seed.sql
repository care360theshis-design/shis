-- Demo rows only. Names are labels, not real children.
-- Run after schema.sql. Safe to re-run: school IDs are unique.

insert into students (student_school_id, name, "class", section, status, enrolled_from, enrolled_to)
values
  ('STU-10482', 'Student 10482', '8', 'B', 'active', '2024-04-01', null),
  ('STU-11003', 'Student 11003', '8', 'B', 'active', '2024-04-01', null),
  ('STU-10881', 'Student 10881', '8', 'B', 'active', '2024-04-01', null),
  ('STU-09014', 'Student 09014', '6', 'A', 'active', '2024-04-01', null),
  ('STU-09120', 'Student 09120', '6', 'A', 'active', '2024-04-01', null),
  ('STU-07088', 'Student 07088', '7', 'F', 'active', '2024-04-01', null),
  ('STU-00001', 'Student 00001', '8', 'B', 'left', '2022-04-01', '2025-03-31')
on conflict (student_school_id) do nothing;

-- Three different students in 8B inside three days, so the radar can flag a review.
insert into health_visits (student_id, visited_at, symptoms, action, notes)
select s.id, current_date - v.days, v.symptoms, v.action, ''
from (values
  ('STU-10482', 0, array['Cough']::text[], 'Returned to class'),
  ('STU-11003', 1, array['Cough']::text[], 'Returned to class'),
  ('STU-10881', 2, array['Cough', 'Sore throat']::text[], 'Rest in the medical room'),
  ('STU-09014', 1, array['Stomach ache']::text[], 'Sent home with guardian')
) as v(school_id, days, symptoms, action)
join students s on s.student_school_id = v.school_id
where not exists (
  select 1 from health_visits hv
  where hv.student_id = s.id and hv.visited_at::date = current_date - v.days
);

insert into symptom_reports (visit_id, student_id, class_key, reported_on, symptom)
select hv.id, hv.student_id, s."class" || s.section, hv.visited_at::date, symptom
from health_visits hv
join students s on s.id = hv.student_id
cross join lateral unnest(hv.symptoms) as symptom
on conflict (visit_id, symptom) do nothing;
