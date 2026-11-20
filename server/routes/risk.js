import { Router } from "express";
import { query } from "../db/pool.js";
import { assessClass, RISK_DISCLAIMER } from "../db/risk.js";

export const riskRouter = Router();

const COUNTS_SQL = `
  select
    classes.class_key,
    classes.class_size,
    coalesce(counts.distinct_3d, 0)::int as distinct_3d,
    coalesce(counts.distinct_prior_11d, 0)::int as distinct_prior_11d,
    coalesce(counts.distinct_14d, 0)::int as distinct_14d
  from (
    select "class" || section as class_key, count(*)::int as class_size
    from students
    where status = 'active'
    group by 1
  ) classes
  left join (
    select
      sr.class_key,
      count(distinct sr.student_id) filter (
        where sr.reported_on >= current_date - 2
      )::int as distinct_3d,
      count(distinct sr.student_id) filter (
        where sr.reported_on < current_date - 2
          and sr.reported_on >= current_date - 13
      )::int as distinct_prior_11d,
      count(distinct sr.student_id)::int as distinct_14d
    from symptom_reports sr
    join students s on s.id = sr.student_id and s.status = 'active'
    where sr.reported_on >= current_date - 13
    group by sr.class_key
  ) counts on counts.class_key = classes.class_key
`;

function present(row) {
  const assessment = assessClass({
    classSize: row.class_size,
    distinct3d: row.distinct_3d,
    distinctPrior11d: row.distinct_prior_11d,
  });
  return {
    classKey: row.class_key,
    windowDays: 3,
    distinct14d: Number(row.distinct_14d) || 0,
    ...assessment,
    disclaimer: RISK_DISCLAIMER,
  };
}

export async function refreshClass(classKey) {
  const result = await query(`${COUNTS_SQL} where classes.class_key = $1`, [classKey]);
  const row = result.rows[0];
  if (!row) return null;
  const view = present(row);
  await query(
    `insert into classroom_risk_snapshots
       (class_key, window_days, as_of, distinct_students, band)
     values ($1, 3, current_date, $2, $3)
     on conflict (class_key, window_days, as_of)
     do update set
       distinct_students = excluded.distinct_students,
       band = excluded.band,
       computed_at = now()`,
    [view.classKey, view.distinct3d, view.band],
  );
  return view;
}

riskRouter.get("/classrooms", async (_req, res, next) => {
  try {
    const result = await query(`${COUNTS_SQL} order by classes.class_key`);
    const classrooms = result.rows.map(present);
    for (const classroom of classrooms) {
      await query(
        `insert into classroom_risk_snapshots
           (class_key, window_days, as_of, distinct_students, band)
         values ($1, 3, current_date, $2, $3)
         on conflict (class_key, window_days, as_of)
         do update set
           distinct_students = excluded.distinct_students,
           band = excluded.band,
           computed_at = now()`,
        [classroom.classKey, classroom.distinct3d, classroom.band],
      );
    }
    res.json({ disclaimer: RISK_DISCLAIMER, classrooms });
  } catch (error) {
    next(error);
  }
});

riskRouter.get("/history/:classKey", async (req, res, next) => {
  try {
    const classKey = String(req.params.classKey || "").trim();
    if (!/^[0-9A-Za-z]{1,8}$/.test(classKey)) {
      res.status(400).json({ error: "class key looks wrong" });
      return;
    }
    const result = await query(
      `select day::date as day,
              count(distinct sr.student_id)::int as distinct_students
       from generate_series(current_date - 13, current_date, interval '1 day') as day
       left join symptom_reports sr
         on sr.class_key = $1
        and sr.reported_on = day::date
       left join students s
         on s.id = sr.student_id
        and s.status = 'active'
       group by day
       order by day`,
      [classKey],
    );
    res.json({
      classKey,
      windowDays: 14,
      disclaimer: RISK_DISCLAIMER,
      days: result.rows.map((row) => ({
        day: row.day,
        distinctStudents: row.distinct_students,
      })),
    });
  } catch (error) {
    next(error);
  }
});
