import { createServerFn } from "@tanstack/react-start";

const API = "http://127.0.0.1:3001";

export type DeskStudent = {
  id: string;
  student_school_id: string;
  name: string;
  class: string;
  section: string;
};

export type DeskClass = {
  classKey: string;
  label: string;
  band: "low" | "medium" | "high";
  classSize: number;
  distinct3d: number;
  reason: string;
};

export type DeskVisit = {
  id: string;
  student_school_id: string;
  class_key: string;
  symptoms: string[];
  temperature: string | null;
  action: string;
  notes: string;
  visited_at: string;
};

export type DeskReport = {
  id: string;
  student_school_id: string;
  class_key: string;
  feeling: string;
};

async function readJson(path: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, init);
  const body = (await response.json().catch(() => ({}))) as { error?: string; hint?: string };
  if (!response.ok) throw new Error(body.hint || body.error || "The database did not answer");
  return body as Record<string, unknown>;
}

export const openStaff = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string; password: string }) => input)
  .handler(async ({ data }) =>
    readJson("/staff/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }),
  );

export const loadDesk = createServerFn({ method: "GET" }).handler(async () => {
  const [studentsBody, riskBody, visitsBody, reportsBody, absenceBody, impactBody] = await Promise.all([
    readJson("/students?status=active"),
    readJson("/risk/classrooms"),
    readJson("/visits"),
    readJson("/wellbeing"),
    readJson("/attendance"),
    readJson("/impact"),
  ]);
  return {
    students: (studentsBody.students as DeskStudent[]) ?? [],
    classrooms: (riskBody.classrooms as DeskClass[]) ?? [],
    visits: (visitsBody.visits as DeskVisit[]) ?? [],
    reports: (reportsBody.reports as DeskReport[]) ?? [],
    absence: (absenceBody.rows as { class_key: string; absent_count: number }[]) ?? [],
    absenceNote: String(absenceBody.note ?? ""),
    impact: impactBody,
    disclaimer: String(riskBody.disclaimer ?? ""),
  };
});

export const addStudent = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      admissionNumber: string;
      name: string;
      class: string;
      section: string;
      phone: string;
      dateOfBirth?: string;
      bloodGroup?: string;
      medicalHistory?: string;
      gender?: string;
      heightCm?: string;
      weightKg?: string;
      photo?: string;
    }) => input,
  )
  .handler(async ({ data }) =>
    readJson("/students", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }),
  );

export const loadProfile = createServerFn({ method: "POST" })
  .inputValidator((input: { admissionNumber: string }) => input)
  .handler(async ({ data }) =>
    readJson(`/students/profile?admission=${encodeURIComponent(data.admissionNumber)}`),
  );

export const saveProfile = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      admissionNumber: string;
      dateOfBirth: string;
      bloodGroup: string;
      medicalHistory: string;
      gender: string;
      heightCm: string;
      weightKg: string;
      photo: string;
    }) => input,
  )
  .handler(async ({ data }) =>
    readJson("/students/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }),
  );

export const addStudents = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string }) => input)
  .handler(async ({ data }) =>
    readJson("/students/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }),
  );

export const loadPattern = createServerFn({ method: "POST" })
  .inputValidator((input: { studentSchoolId: string }) => input)
  .handler(async ({ data }) => readJson(`/pattern?student=${encodeURIComponent(data.studentSchoolId)}`));

export const saveVisit = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      studentSchoolId: string;
      symptoms: string[];
      temperature: string;
      notes: string;
      action: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    return readJson("/visits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, noticeKind: "visit" }),
    });
  });

export const reportUnwell = createServerFn({ method: "POST" })
  .inputValidator((input: { studentSchoolId: string; feeling: string }) => input)
  .handler(async ({ data }) => {
    return readJson("/wellbeing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
  });

export const verifyReport = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => readJson(`/wellbeing/${data.id}/verify`, { method: "POST" }));

export const setReportAside = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => readJson(`/wellbeing/${data.id}/aside`, { method: "POST" }));

export const saveAbsence = createServerFn({ method: "POST" })
  .inputValidator((input: { classKey: string; absentCount: number }) => input)
  .handler(async ({ data }) =>
    readJson("/attendance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }),
  );

export const recordMeasure = createServerFn({ method: "POST" })
  .inputValidator((input: { indicator: string; durationMs?: number; score?: number }) => input)
  .handler(async ({ data }) =>
    readJson("/impact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }),
  );

export const approveVisit = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => readJson(`/visits/${data.id}/approve`, { method: "POST" }));

export const openNotices = createServerFn({ method: "POST" })
  .inputValidator((input: { studentSchoolId: string; code: string }) => input)
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      student: data.studentSchoolId.trim().toUpperCase(),
      code: data.code.trim(),
    });
    return readJson(`/notices?${params.toString()}`);
  });

export const ackNotice = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; code: string; ack: string }) => input)
  .handler(async ({ data }) =>
    readJson(`/notices/${data.id}/ack`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: data.code, ack: data.ack }),
    }),
  );
