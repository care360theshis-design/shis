-- Block the Supabase public Data API. The Express pool uses the database
-- owner role and bypasses row level security. No policies are added.

alter table students enable row level security;
alter table health_visits enable row level security;
alter table symptom_reports enable row level security;
alter table classroom_risk_snapshots enable row level security;
alter table audit_logs enable row level security;

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
