import { Router } from "express";
import { query } from "../db/pool.js";
import { refreshClass } from "./risk.js";

export async function bunkingHint(studentId) {
  const recent = await query(
    `select temperature, notes
     from health_visits
     where student_id = $1 and visited_at > now() - interval '14 days'`,
    [studentId],
  );
  let mild = 0;
  for (const visit of recent.rows) {
    if (visit.notes === "Must see a doctor") continue;
    const match = String(visit.temperature || "").match(/([\d.]+)\s*°C/);
    const celsius = match ? Number(match[1]) : null;
    if (celsius == null || (celsius >= 36 && celsius <= 37.5)) mild += 1;
  }
  if (mild < 3) return { review: false, text: "" };
  return {
    review: true,
    text: "Three or more visits in 14 days with a normal or missing temperature. This can mean bunking. Only a person may choose that note.",
  };
}

export const visitsRouter = Router();

const KINDS = new Set(["visit", "advisory", "emergency"]);

visitsRouter.get("/", async (req, res, next) => {
  try {
    const studentSchoolId = String(req.query.student || "").trim();
    const result = await query(
      `select hv.id, s.student_school_id, s."class" || s.section as class_key,
              hv.symptoms, hv.temperature, hv.action, hv.notes, hv.visited_at
       from health_visits hv
       join students s on s.id = hv.student_id
       where ($1 = '' or s.student_school_id = $1)
         and s.status = 'active'
       order by hv.visited_at desc
       limit 12`,
      [studentSchoolId],
    );
    res.json({ visits: result.rows });
  } catch (error) {
    next(error);
  }
});

visitsRouter.post("/:id/approve", async (req, res, next) => {
  try {
    const text =
      "The medical room recorded a visit and would like you to check. This is not a diagnosis.";
    const updated = await query(
      `update health_visits
       set alert_status = 'sent', alert_text = $2, updated_at = now()
       where id = $1
       returning id`,
      [req.params.id, text],
    );
    if (!updated.rows[0]) {
      res.status(404).json({ error: "Visit not found" });
      return;
    }
    res.json({ id: updated.rows[0].id, alertText: text });
  } catch (error) {
    next(error);
  }
});

visitsRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const studentSchoolId = String(body.studentSchoolId || "").trim();
    const symptoms = Array.isArray(body.symptoms)
      ? body.symptoms.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const action = String(body.action || "").trim();
    const notes = String(body.notes || "");
    const temperature = body.temperature ? String(body.temperature) : null;
    const noticeKind = KINDS.has(body.noticeKind) ? body.noticeKind : "visit";

    if (!studentSchoolId || symptoms.length === 0 || !action) {
      res.status(400).json({
        error: "studentSchoolId, symptoms, and action are required",
      });
      return;
    }

    const student = await query(
      `select id, "class" || section as class_key, status
       from students
       where student_school_id = $1`,
      [studentSchoolId],
    );
    const row = student.rows[0];
    if (!row || row.status !== "active") {
      res.status(404).json({ error: "No active student with that ID" });
      return;
    }

    const parentText =
      "Your child was seen in the medical room. This is a record of that visit, not a diagnosis.";
    const inserted = await query(
      `insert into health_visits (student_id, symptoms, temperature, action, notes, notice_kind, alert_status, alert_text)
       values ($1, $2, $3, $4, $5, $6, 'sent', $7)
       returning id, visited_at`,
      [row.id, symptoms, temperature, action, notes, noticeKind, parentText],
    );
    const visit = inserted.rows[0];

    for (const symptom of symptoms) {
      await query(
        `insert into symptom_reports (visit_id, student_id, class_key, reported_on, symptom)
         values ($1, $2, $3, $4::date, $5)
         on conflict (visit_id, symptom) do nothing`,
        [visit.id, row.id, row.class_key, visit.visited_at, symptom],
      );
    }

    await query(
      `insert into audit_logs (actor_role, action, entity, entity_id, student_id, detail)
       values ('medical', 'log_visit', 'health_visits', $1, $2, $3::jsonb)`,
      [visit.id, row.id, JSON.stringify({ classKey: row.class_key, symptoms, noticeKind })],
    );

    const risk = await refreshClass(row.class_key);
    const bunking = await bunkingHint(row.id);
    res.status(201).json({
      id: visit.id,
      studentSchoolId,
      classKey: row.class_key,
      symptoms,
      visitedAt: visit.visited_at,
      risk,
      parentNotified: true,
      bunking,
    });
  } catch (error) {
    next(error);
  }
});
