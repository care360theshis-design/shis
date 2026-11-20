# SHIS

School Health Intelligence System. A medical-room product any school can run.

Parents hear first. They open the record for their own child with a student ID. Medical staff log a visit and authorize the notice. The system does not diagnose and does not name a disease.

## Two sides

- **Parents.** Full medical-room record for that student ID only. A parent can mark that the alert was received, that they contacted the school, or that a response was recorded.
- **Medical staff.** Authorization queue, then the visit log. A notice can be a medical-room visit, a health advisory, or an emergency alert.

## School websites

A school that already has a site can link the parent page and the medical page, or embed the parent check-in.

## Records

PostgreSQL holds students, health visits, symptom reports, classroom risk snapshots, access roles, and an audit row on every medical-room write and every parent reply. Normal lists show active students only. Students who leave stay in the table with status `left` or `graduated`.

Demo records use student IDs such as `STU-10482`. They are not real children.
