export const SYMPTOMS = [
  "Fever",
  "Cough",
  "Cold",
  "Headache",
  "Sore throat",
  "Stomach ache",
  "Rash",
  "Fatigue",
  "Vomiting",
  "Body ache",
] as const;

export const ACTIONS = [
  "Rest in the medical room",
  "Returned to class",
  "Sent home with guardian",
  "Guardian called, student waiting",
] as const;

export type Symptom = (typeof SYMPTOMS)[number];
export type Action = (typeof ACTIONS)[number];

export type Student = {
  id: string;
  classSection: string;
};

export type AlertStatus = "draft" | "sent" | "dismissed";
export type NoticeKind = "visit" | "advisory" | "emergency";
export type ParentAck = "none" | "seen" | "contacted_school" | "call" | "received" | "contacted" | "responded";

export const NOTICE_LABEL: Record<NoticeKind, string> = {
  visit: "Medical room visit",
  advisory: "Health advisory",
  emergency: "Emergency alert",
};

export const ACK_LABEL: Record<Exclude<ParentAck, "none">, string> = {
  seen: "Seen",
  contacted_school: "Contacted school",
  call: "Call",
  received: "Seen",
  contacted: "Contacted school",
  responded: "Call",
};

export type Visit = {
  id: string;
  studentId: string;
  at: string;
  symptoms: Symptom[];
  temp: string;
  action: Action;
  notes: string;
  alertStatus: AlertStatus;
  alertText: string;
  noticeKind: NoticeKind;
  ack: ParentAck;
  classSection: string;
};

export type Cluster = {
  classSection: string;
  symptom: Symptom;
  studentIds: string[];
  program: string;
};

export const CLUSTER_MIN = 3;
export const WINDOW_DAYS = 7;

export const STUDENTS: Student[] = [
  { id: "STU-10482", classSection: "8B" },
  { id: "STU-11003", classSection: "8B" },
  { id: "STU-10881", classSection: "8B" },
  { id: "STU-12110", classSection: "8B" },
  { id: "STU-09014", classSection: "6A" },
  { id: "STU-09120", classSection: "6A" },
  { id: "STU-09255", classSection: "6A" },
  { id: "STU-09301", classSection: "6A" },
  { id: "STU-15002", classSection: "9D" },
  { id: "STU-15144", classSection: "9D" },
  { id: "STU-07088", classSection: "7F" },
  { id: "STU-16020", classSection: "10A" },
];

export function awarenessFor(symptom: Symptom): string {
  switch (symptom) {
    case "Cough":
    case "Cold":
    case "Sore throat":
      return "Respiratory hygiene assembly: cover coughs, and stay home if feverish.";
    case "Fever":
      return "Fever watch: send symptomatic students home and brief the class teacher.";
    case "Stomach ache":
    case "Vomiting":
      return "Handwashing and safe-water reminder for the class.";
    case "Rash":
      return "No sharing towels or mats. The nurse rechecks the class tomorrow.";
    case "Headache":
    case "Fatigue":
    case "Body ache":
      return "Hydration and rest note for the teacher. Recheck if a fever appears.";
  }
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildAlert(
  student: Student,
  visit: Pick<Visit, "at" | "symptoms" | "action" | "notes">,
): string {
  const when = formatWhen(visit.at);
  const note = visit.notes.trim()
    ? `\nNote from the medical room: ${visit.notes.trim()}`
    : "";
  return `School health notice

Dear parent or guardian,
Student ${student.id} (Class ${student.classSection}) visited the medical room on ${when}.

Logged by staff: ${visit.symptoms.join(", ")}.
What the medical room did: ${visit.action}.${note}

This is a visit notice, not a medical diagnosis. Please contact the school medical room if you need anything further.`;
}

function atUtcDaysAgo(days: number, hour: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, 20, 0, 0);
  return d.toISOString();
}

function seedVisit(
  studentId: string,
  days: number,
  hour: number,
  symptoms: Symptom[],
  action: Action,
  alertStatus: AlertStatus,
  notes = "",
  noticeKind: NoticeKind = "visit",
  ack: ParentAck = "none",
): Visit {
  const student = STUDENTS.find((s) => s.id === studentId);
  if (!student) throw new Error(`Unknown student ${studentId}`);
  const visit: Visit = {
    id: `seed-${studentId}-${days}-${symptoms[0]}`,
    studentId,
    at: atUtcDaysAgo(days, hour),
    symptoms,
    temp: symptoms.includes("Fever") ? "100.4" : "",
    action,
    notes,
    alertStatus,
    alertText: "",
    noticeKind,
    ack,
    classSection: `${student.classSection}`,
  };
  visit.alertText = buildAlert(student, visit);
  return visit;
}

export function seedVisits(): Visit[] {
  return [
    seedVisit("STU-10482", 1, 4, ["Cough", "Cold"], "Sent home with guardian", "sent", "", "visit", "received"),
    seedVisit(
      "STU-10482",
      0,
      6,
      ["Cough"],
      "Returned to class",
      "sent",
      "Cover coughs. Stay home if a fever starts.",
      "advisory",
    ),
    seedVisit("STU-11003", 2, 5, ["Cough"], "Returned to class", "sent"),
    seedVisit(
      "STU-10881",
      0,
      4,
      ["Cough", "Sore throat"],
      "Rest in the medical room",
      "draft",
      "Asked to sip warm water. Recheck after lunch.",
    ),
    seedVisit("STU-09014", 1, 3, ["Stomach ache", "Vomiting"], "Sent home with guardian", "sent"),
    seedVisit("STU-09120", 2, 6, ["Stomach ache"], "Returned to class", "sent"),
    seedVisit("STU-09255", 3, 4, ["Stomach ache"], "Rest in the medical room", "sent"),
    seedVisit("STU-15002", 1, 7, ["Headache"], "Returned to class", "dismissed"),
    seedVisit(
      "STU-07088",
      0,
      5,
      ["Fatigue"],
      "Guardian called, student waiting",
      "draft",
      "No fever. Guardian on the way.",
      "emergency",
    ),
  ];
}

function recentVisits(visits: Visit[], now = Date.now()): Visit[] {
  const cutoff = now - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return visits.filter((visit) => new Date(visit.at).getTime() >= cutoff);
}

export function findClusters(visits: Visit[], now = Date.now()): Cluster[] {
  const grouped = new Map<string, Set<string>>();
  for (const visit of recentVisits(visits, now)) {
    const classSection = visit.classSection;
    if (!classSection) continue;
    for (const symptom of visit.symptoms) {
      const key = `${classSection}||${symptom}`;
      const ids = grouped.get(key) ?? new Set<string>();
      ids.add(visit.studentId);
      grouped.set(key, ids);
    }
  }
  const clusters: Cluster[] = [];
  for (const [key, ids] of grouped) {
    if (ids.size < CLUSTER_MIN) continue;
    const [classSection, symptom] = key.split("||") as [string, Symptom];
    clusters.push({
      classSection,
      symptom,
      studentIds: [...ids],
      program: awarenessFor(symptom),
    });
  }
  clusters.sort(
    (a, b) => b.studentIds.length - a.studentIds.length || a.classSection.localeCompare(b.classSection),
  );
  return clusters;
}

export function symptomCounts(visits: Visit[], now = Date.now()): { name: Symptom; count: number }[] {
  const totals = new Map<Symptom, number>();
  for (const symptom of SYMPTOMS) totals.set(symptom, 0);
  for (const visit of recentVisits(visits, now)) {
    for (const symptom of visit.symptoms) {
      totals.set(symptom, (totals.get(symptom) ?? 0) + 1);
    }
  }
  return [...totals.entries()]
    .map(([name, count]) => ({ name, count }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function studentById(id: string): Student | undefined {
  return STUDENTS.find((student) => student.id === id);
}
