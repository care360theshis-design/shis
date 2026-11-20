# Schema

Tables in `migrations/0001_shis.sql`:

| Table | Purpose |
| --- | --- |
| students | School ID, name, class, section, status (`active`, `left`, `graduated`), enrolled dates |
| health_visits | Visit, symptoms, temperature, action, notice kind, alert status, parent acknowledgement |
| symptom_reports | One symptom row per visit, for class and date queries |
| classroom_risk_snapshots | 3-day and 14-day counts by class. Pattern only, not a diagnosis |
| access_roles | `medical` and `admin` are unscoped. `parent` must name one student |
| audit_logs | Actor, action, entity, student, JSON detail |

Indexes cover active class lists, visits by student and time, symptoms by class and date, and audit time.

`DATABASE_URL` selects hosted Postgres and a connection pool. When it is unset, the app uses embedded Postgres so a preview still runs.
