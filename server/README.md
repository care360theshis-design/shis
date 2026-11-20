# SHIS API

Node.js and Express API for the School Health Intelligence System. It talks to PostgreSQL on Supabase (project name: TheSHIS).

The website on port 8080 does not need this process. This API uses port 3001.

## Database URL

A database has not been attached yet. Leave `DATABASE_URL` empty until the Supabase project exists. Copy `server/.env.example` to `.env` in the project root when you have the connection string:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres?sslmode=require
```

Use the database URI from Supabase → Project Settings → Database. Do not put the anon key in `DATABASE_URL`.

Until that line is set, the API still starts. `GET /health` reports `database: "missing"`. Data routes answer 503.

## Run

From the project root, after the tables exist:

```
npm run api
```

Then, in the Supabase SQL editor, run `server/schema.sql` once and `server/seed.sql` once.

## Routes

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Process up, and whether a database is configured |
| GET | `/students?status=active` | Active students only, unless status is `left` or `graduated` |
| POST | `/visits` | Log a visit for an active student ID |
| GET | `/risk/classrooms` | Current 3-day pattern flag for every active class |
| GET | `/risk/history/8B` | Daily distinct-student counts for 14 days |

`POST /visits` body:

```json
{
  "studentSchoolId": "STU-10482",
  "symptoms": ["Cough"],
  "temperature": "99.1",
  "action": "Returned to class",
  "notes": "",
  "noticeKind": "visit"
}
```

## How a flag is raised

The rule is in `server/db/risk.js`. It counts different students, not repeat visits.

Review is recommended when a class has at least 3 different students with a logged symptom in the last 3 days, and that count is at least double the class's own pace from the previous 11 days. Five or more students, or 40% of the class, is the higher band. Anything else stays Normal.

The response says "Review recommended" or "Normal". It does not name a disease and it does not say an outbreak exists. Every risk payload includes that disclaimer.

## Access

Row Level Security is enabled and no public policies are granted, so the Supabase anon key cannot read these tables. The API connects with `DATABASE_URL` and uses parameterized queries only. Queries that list students for the radar filter `status = 'active'`.
