import { Router } from "express";
import { query } from "../db/pool.js";
import { refreshClass } from "./risk.js";
import { bunkingHint } from "./visits.js";

export const widerRouter = Router();

const FEELINGS = new Set(["Headache", "Cough", "Stomach ache", "Tired", "Other"]);

widerRouter.get("/notices", async (req, res, next) => {
  try {
    const studentSchoolId = String(req.query.student || "").trim();
    const code = String(req.query.code || "");
    if (!studentSchoolId || !code) {
      res.status(400).json({ error: "That ID and code do not open a record." });
      return;
    }
    const allowed = await query(
      `select id, name, student_school_id, "class", section, date_of_birth, blood_group, medical_history, photo
       from students
       where student_school_id = $1 and parent_code = $2 and status = 'active'`,
      [studentSchoolId, code],
    );
    if (!allowed.rows[0]) {
      res.status(404).json({ error: "That ID and code do not open a record." });
      return;
    }
    const result = await query(
      `select hv.id, hv.symptoms, hv.temperature, hv.action, hv.notes, hv.alert_text,
              hv.notice_kind, hv.parent_ack, hv.visited_at, s."class" || s.section as class_key
       from health_visits hv
       join students s on s.id = hv.student_id
       where s.id = $1
       order by hv.visited_at desc
       limit 100`,
      [allowed.rows[0].id],
    );
    const child = allowed.rows[0];
    res.json({
      classKey: `${child.class}${child.section}`,
      child: {
        name: child.name,
        admissionNumber: child.student_school_id,
        class: child.class,
        section: child.section,
        dateOfBirth: child.date_of_birth
          ? (child.date_of_birth instanceof Date
              ? child.date_of_birth.toISOString().slice(0, 10)
              : String(child.date_of_birth).slice(0, 10))
          : null,
        bloodGroup: child.blood_group || "",
        medicalHistory: child.medical_history || "",
        photo: child.photo || "",
      },
      notices: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

widerRouter.post("/notices/:id/ack", async (req, res, next) => {
  try {
    const ack = String(req.body?.ack || "");
    const code = String(req.body?.code || "");
    if (!["seen", "contacted_school", "call"].includes(ack)) {
      res.status(400).json({ error: "Unknown reply" });
      return;
    }
    const updated = await query(
      `update health_visits hv
       set parent_ack = $3, updated_at = now()
       from students s
       where hv.id = $1 and hv.student_id = s.id and s.parent_code = $2
       returning hv.id`,
      [req.params.id, code, ack],
    );
    if (!updated.rows[0]) {
      res.status(404).json({ error: "That notice is not open" });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

widerRouter.get("/pattern", async (req, res, next) => {
  try {
    const studentSchoolId = String(req.query.student || "").trim();
    const found = await query(
      `select id from students where student_school_id = $1 and status = 'active'`,
      [studentSchoolId],
    );
    if (!found.rows[0]) {
      res.status(404).json({ error: "No active student with that ID" });
      return;
    }
    res.json(await bunkingHint(found.rows[0].id));
  } catch (error) {
    next(error);
  }
});

widerRouter.get("/wellbeing", async (_req, res, next) => {
  try {
    const result = await query(
      `select w.id, s.student_school_id, s."class" || s.section as class_key, w.feeling, w.created_at
       from wellbeing_reports w
       join students s on s.id = w.student_id
       where w.status = 'pending' and s.status = 'active'
       order by w.created_at desc
       limit 20`,
    );
    res.json({
      reports: result.rows,
      note: "A student report is not a medical record until staff verify it.",
    });
  } catch (error) {
    next(error);
  }
});

widerRouter.post("/wellbeing", async (req, res, next) => {
  try {
    const studentSchoolId = String(req.body?.studentSchoolId || "").trim();
    const feeling = String(req.body?.feeling || "");
    if (!studentSchoolId || !FEELINGS.has(feeling)) {
      res.status(400).json({ error: "A student ID and a feeling are required" });
      return;
    }
    const student = await query(
      `select id from students where student_school_id = $1 and status = 'active'`,
      [studentSchoolId],
    );
    if (!student.rows[0]) {
      res.status(404).json({ error: "No active student with that ID" });
      return;
    }
    const inserted = await query(
      `insert into wellbeing_reports (student_id, feeling) values ($1, $2) returning id`,
      [student.rows[0].id, feeling],
    );
    res.status(201).json({
      id: inserted.rows[0].id,
      note: "Sent to the medical room for a person to check. This is not a diagnosis.",
    });
  } catch (error) {
    next(error);
  }
});

widerRouter.post("/wellbeing/:id/verify", async (req, res, next) => {
  try {
    const found = await query(
      `select w.id, w.feeling, w.student_id, s."class" || s.section as class_key
       from wellbeing_reports w
       join students s on s.id = w.student_id
       where w.id = $1 and w.status = 'pending'`,
      [req.params.id],
    );
    const row = found.rows[0];
    if (!row) {
      res.status(404).json({ error: "That report is not waiting" });
      return;
    }
    const visit = await query(
      `insert into health_visits (student_id, symptoms, action, notes)
       values ($1, $2, 'Verified a student report', 'Checked in the medical room')
       returning id, visited_at`,
      [row.student_id, [row.feeling]],
    );
    await query(
      `insert into symptom_reports (visit_id, student_id, class_key, reported_on, symptom)
       values ($1, $2, $3, $4::date, $5)`,
      [visit.rows[0].id, row.student_id, row.class_key, visit.rows[0].visited_at, row.feeling],
    );
    await query(`update wellbeing_reports set status = 'verified' where id = $1`, [row.id]);
    const risk = await refreshClass(row.class_key);
    res.json({ classKey: row.class_key, risk });
  } catch (error) {
    next(error);
  }
});

widerRouter.post("/wellbeing/:id/aside", async (req, res, next) => {
  try {
    await query(`update wellbeing_reports set status = 'set_aside' where id = $1 and status = 'pending'`, [
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

widerRouter.get("/attendance", async (_req, res, next) => {
  try {
    const result = await query(
      `select class_key, absent_count from class_absence where absent_on = current_date order by class_key`,
    );
    res.json({
      rows: result.rows,
      note: "Class totals only. Absence is not treated as illness and does not flag a class.",
    });
  } catch (error) {
    next(error);
  }
});

widerRouter.post("/attendance", async (req, res, next) => {
  try {
    const classKey = String(req.body?.classKey || "").trim().toUpperCase();
    const absentCount = Number(req.body?.absentCount);
    if (!/^[0-9]{1,2}[A-Z]$/.test(classKey) || !Number.isInteger(absentCount) || absentCount < 0 || absentCount > 80) {
      res.status(400).json({ error: "Enter a class such as 8B and a count from 0 to 80" });
      return;
    }
    await query(
      `insert into class_absence (class_key, absent_count) values ($1, $2)
       on conflict (class_key, absent_on) do update set absent_count = excluded.absent_count`,
      [classKey, absentCount],
    );
    res.status(201).json({
      classKey,
      absentCount,
      note: "Saved as a class total. This does not flag the class.",
    });
  } catch (error) {
    next(error);
  }
});

const INDICATORS = new Set(["record", "communication", "early_warning", "usability", "prevention"]);

widerRouter.post("/impact", async (req, res, next) => {
  try {
    const indicator = String(req.body?.indicator || "");
    const durationMs = req.body?.durationMs == null ? null : Number(req.body.durationMs);
    const score = req.body?.score == null ? null : Number(req.body.score);
    if (!INDICATORS.has(indicator)) {
      res.status(400).json({ error: "Unknown measure" });
      return;
    }
    await query(
      `insert into pilot_measures (indicator, duration_ms, score) values ($1, $2, $3)`,
      [
        indicator,
        Number.isFinite(durationMs) ? Math.round(durationMs) : null,
        Number.isInteger(score) && score >= 1 && score <= 5 ? score : null,
      ],
    );
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

widerRouter.get("/impact", async (_req, res, next) => {
  try {
    const measures = await query(
      `select indicator,
              count(*)::int as n,
              percentile_cont(0.5) within group (order by duration_ms) as median_ms,
              avg(score) as avg_score
       from pilot_measures
       group by indicator`,
    );
    const quality = await query(
      `select count(*)::int as total,
              count(*) filter (where cardinality(symptoms) > 0 and action <> '')::int as complete
       from health_visits
       where visited_at::date = current_date`,
    );
    const flagged = await query(
      `select count(*)::int as n from classroom_risk_snapshots
       where as_of = current_date and window_days = 3 and band <> 'low'`,
    );
    const reviewed = measures.rows.find((row) => row.indicator === "prevention");
    const byName = Object.fromEntries(measures.rows.map((row) => [row.indicator, row]));
    res.json({
      measures: byName,
      dataQuality: quality.rows[0],
      prevention: {
        flagged: flagged.rows[0]?.n ?? 0,
        reviewed: reviewed?.n ?? 0,
      },
      note: "Timings from this school only. Not a claim about disease reduction.",
    });
  } catch (error) {
    next(error);
  }
});
