import { Router } from "express";
import { query } from "../db/pool.js";

const STATUSES = new Set(["active", "left", "graduated"]);

export const studentsRouter = Router();

studentsRouter.get("/", async (req, res, next) => {
  try {
    const requested = String(req.query.status || "active");
    if (!STATUSES.has(requested)) {
      res.status(400).json({ error: "status must be active, left, or graduated" });
      return;
    }
    const result = await query(
      `select id, student_school_id, name, "class", section, status, enrolled_from, enrolled_to
       from students
       where status = $1
       order by "class", section, student_school_id`,
      [requested],
    );
    res.json({ students: result.rows });
  } catch (error) {
    next(error);
  }
});

function cleanPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

function readStudent(body) {
  const admissionNumber = String(body?.admissionNumber || "").trim();
  const name = String(body?.name || "").trim();
  const schoolClass = String(body?.class || "").trim();
  const section = String(body?.section || "").trim().toUpperCase();
  const phone = cleanPhone(body?.phone);
  if (!/^\d{6}$/.test(admissionNumber)) return { error: "Admission number must be 6 digits" };
  if (!/^\d{10}$/.test(phone)) return { error: "Phone must be 10 digits. The parent code is the last 4." };
  if (name.length < 2 || name.length > 80 || !/^[0-9]{1,2}$/.test(schoolClass) || !/^[A-Z]$/.test(section)) {
    return { error: "Name, class (1–12), and section (one letter) are required" };
  }
  return { admissionNumber, name, schoolClass, section, phone, parentCode: phone.slice(-4) };
}

function measure(value, min, max, label) {
  const text = String(value ?? "").trim();
  if (!text) return { value: null };
  const number = Number(text);
  if (!Number.isFinite(number) || number < min || number > max) {
    return { error: `${label} must be between ${min} and ${max}` };
  }
  return { value: Math.round(number * 10) / 10 };
}

function heightCm(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return { value: null };
  if (/['′]|ft|feet|inch/.test(text)) return { error: "Height must be in centimetres" };
  const height = measure(text.replace(/cm\s*$/i, ""), 40, 220, "Height (cm)");
  if (height.error || height.value == null) return height;
  return { value: Math.round(height.value) };
}

function weightKg(value) {
  return measure(String(value ?? "").replace(/kg\s*$/i, ""), 5, 200, "Weight (kg)");
}
function storeDob(value) {
  const text = String(value || "").trim();
  if (!text) return { value: null };
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text);
  if (!match) return { error: "Date of birth must be DD-MM-YYYY" };
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!real) return { error: "Date of birth must be DD-MM-YYYY" };
  return { value: `${match[3]}-${match[2]}-${match[1]}` };
}

export function showDob(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const day = String(value.getUTCDate()).padStart(2, "0");
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    return `${day}-${month}-${value.getUTCFullYear()}`;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  const shown = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(value).trim());
  return shown ? shown[0] : "";
}
function readProfile(body) {
  const born = storeDob(body?.dateOfBirth);
  if (born.error) return { error: born.error };
  const bloodGroup = String(body?.bloodGroup || "").trim().slice(0, 12);
  const medicalHistory = String(body?.medicalHistory || "").trim().slice(0, 2000);
  const gender = String(body?.gender || "").trim();
  const photo = String(body?.photo || "").trim();
  const height = heightCm(body?.heightCm);
  const weight = weightKg(body?.weightKg);
  if (gender && !["Female", "Male", "Other"].includes(gender)) {
    return { error: "Gender must be Female, Male, or Other" };
  }
  if (height.error || weight.error) return { error: height.error || weight.error };
  if (photo && photo.length > 400000) return { error: "That photo is too large. Use a smaller image." };
  if (photo && !/^https?:\/\//i.test(photo) && !/^data:image\/(jpeg|png|webp);base64,/i.test(photo)) {
    return { error: "Photo must be a JPEG, PNG, or web image" };
  }
  return {
    dateOfBirth: born.value,
    bloodGroup,
    medicalHistory,
    gender,
    heightCm: height.value,
    weightKg: weight.value,
    photo,
  };
}

async function insertStudent(row) {
  const inserted = await query(
    `insert into students (
       student_school_id, name, "class", section, status, enrolled_from, phone, parent_code,
       date_of_birth, blood_group, medical_history, photo, gender, height_cm, weight_kg
     )
     values ($1, $2, $3, $4, 'active', current_date, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     on conflict (student_school_id) do nothing
     returning id, student_school_id, name, "class", section, status, parent_code`,
    [
      row.admissionNumber,
      row.name,
      row.schoolClass,
      row.section,
      row.phone,
      row.parentCode,
      row.dateOfBirth,
      row.bloodGroup,
      row.medicalHistory,
      row.photo || null,
      row.gender || "",
      row.heightCm,
      row.weightKg,
    ],
  );
  return inserted.rows[0] ?? null;
}

studentsRouter.post("/", async (req, res, next) => {
  try {
    const row = readStudent(req.body);
    if (row.error) {
      res.status(400).json({ error: row.error });
      return;
    }
    const profile = readProfile(req.body);
    if (profile.error) {
      res.status(400).json({ error: profile.error });
      return;
    }
    const student = await insertStudent({ ...row, ...profile });
    if (!student) {
      res.status(409).json({ error: "That admission number is already on the list" });
      return;
    }
    res.status(201).json({ student });
  } catch (error) {
    next(error);
  }
});

studentsRouter.post("/bulk", async (req, res, next) => {
  try {
    const text = String(req.body?.text || "");
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const added = [];
    const skipped = [];
    for (const line of lines) {
      if (/admission/i.test(line) && /phone/i.test(line)) continue;
      const parts = line.split(",").map((part) => part.trim());
      if (parts.length < 5) {
        skipped.push({ line, error: "Use admission, name, class, section, phone" });
        continue;
      }
      const row = readStudent({
        admissionNumber: parts[0],
        name: parts.slice(1, parts.length - 3).join(", "),
        class: parts[parts.length - 3],
        section: parts[parts.length - 2],
        phone: parts[parts.length - 1],
      });
      if (row.error) {
        skipped.push({ line, error: row.error });
        continue;
      }
      const student = await insertStudent({
        ...row,
        dateOfBirth: null,
        bloodGroup: "",
        medicalHistory: "",
        photo: "",
        gender: "",
        heightCm: null,
        weightKg: null,
      });
      if (!student) skipped.push({ line, error: "Already on the list" });
      else added.push({ admissionNumber: student.student_school_id, name: student.name, parentCode: student.parent_code });
    }
    res.status(201).json({ added, skipped });
  } catch (error) {
    next(error);
  }
});

function bmi(heightCm, weightKg) {
  const height = Number(heightCm);
  const weight = Number(weightKg);
  if (!height || !weight) return "";
  return (weight / (height / 100) ** 2).toFixed(1);
}

function childRecord(row) {
  return {
    name: row.name,
    admissionNumber: row.student_school_id,
    class: row.class,
    section: row.section,
    gender: row.gender || "",
    dateOfBirth: showDob(row.date_of_birth),
    bloodGroup: row.blood_group || "",
    heightCm: row.height_cm == null ? "" : String(Math.round(Number(row.height_cm))),
    weightKg: row.weight_kg == null ? "" : String(row.weight_kg),
    bmi: bmi(row.height_cm, row.weight_kg),
    medicalHistory: row.medical_history || "",
    photo: row.photo || "",
  };
}

studentsRouter.get("/profile", async (req, res, next) => {
  try {
    const admissionNumber = String(req.query.admission || "").trim();
    const result = await query(
      `select name, student_school_id, "class", section, date_of_birth, blood_group, medical_history, photo, gender, height_cm, weight_kg
       from students
       where student_school_id = $1 and status = 'active'`,
      [admissionNumber],
    );
    const row = result.rows[0];
    if (!row) {
      res.status(404).json({ error: "No active student with that admission number" });
      return;
    }
    res.json({ child: childRecord(row) });
  } catch (error) {
    next(error);
  }
});

studentsRouter.post("/profile", async (req, res, next) => {
  try {
    const admissionNumber = String(req.body?.admissionNumber || "").trim();
    if (!/^\d{6}$/.test(admissionNumber)) {
      res.status(400).json({ error: "Admission number must be 6 digits" });
      return;
    }
    const profile = readProfile(req.body);
    if (profile.error) {
      res.status(400).json({ error: profile.error });
      return;
    }
    const updated = await query(
      `update students
       set date_of_birth = $2,
           blood_group = $3,
           medical_history = $4,
           photo = case when $5 = '' then photo else $5 end,
           gender = $6,
           height_cm = $7,
           weight_kg = $8,
           updated_at = now()
       where student_school_id = $1 and status = 'active'
       returning student_school_id, name`,
      [admissionNumber, profile.dateOfBirth, profile.bloodGroup, profile.medicalHistory, profile.photo, profile.gender, profile.heightCm, profile.weightKg],
    );
    if (!updated.rows[0]) {
      res.status(404).json({ error: "No active student with that admission number" });
      return;
    }
    res.json({ student: updated.rows[0] });
  } catch (error) {
    next(error);
  }
});



