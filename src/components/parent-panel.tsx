import { useState } from "react";
import { Button } from "@/components/site-chrome";
import { type ParentAck } from "@/lib/shis/model";
import { ackNotice, openNotices } from "@/lib/shis/desk";
import { DEMO_PARENT_HINT } from "@/lib/shis/vault";

const REPLIES = [
  ["seen", "Seen"],
  ["contacted_school", "Contacted school"],
  ["call", "Call"],
] as const;

type Child = {
  name: string;
  admissionNumber: string;
  class: string;
  section: string;
  dateOfBirth: string | null;
  bloodGroup: string;
  medicalHistory: string;
  photo: string;
};

type Notice = {
  id: string;
  symptoms: string[];
  temperature: string | null;
  action: string;
  notes: string;
  alert_text: string;
  notice_kind: string;
  parent_ack: ParentAck;
  visited_at: string;
};

export function ParentPanel({ embedded = false }: { embedded?: boolean }) {
  const [query, setQuery] = useState("");
  const [code, setCode] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [classSection, setClassSection] = useState("");
  const [records, setRecords] = useState<Notice[] | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [error, setError] = useState("");

  async function onCheck(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setRecords(null);
    setChild(null);
    setStudentId(null);
    const id = query.trim().toUpperCase();
    try {
      const opened = (await openNotices({ data: { studentSchoolId: id, code } })) as {
        classKey?: string;
        notices?: Notice[];
        child?: Child;
      };
      setStudentId(id);
      setClassSection(opened.classKey || "");
      setChild(opened.child ?? null);
      setRecords(opened.notices ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That ID and code do not open a record.");
    }
  }

  async function onAck(visitId: string, ack: ParentAck) {
    if (!studentId) return;
    await ackNotice({ data: { id: visitId, code, ack } });
    setRecords((current) =>
      current ? current.map((row) => (row.id === visitId ? { ...row, parent_ack: ack } : row)) : current,
    );
  }

  return (
    <section id="notices">
      <form onSubmit={onCheck} className="rounded-card border border-line bg-card p-5">
        <label className="block">
          <span className="text-sm font-medium">Admission number</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={DEMO_PARENT_HINT.id}
            autoComplete="off"
            className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-base"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-medium">Last 4 digits of your phone</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            type="password"
            autoComplete="off"
            className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-base"
          />
        </label>
        <Button type="submit" className="mt-4">
          Open this child’s record
        </Button>
        <p className="mt-3 text-sm text-muted">
          All medical-room logs for this child are here. Reply on each one. Example admission {DEMO_PARENT_HINT.id}, last 4 digits {DEMO_PARENT_HINT.code}.
        </p>
        {!embedded ? (
          <p className="mt-2 text-sm text-muted">A wrong code shows nothing. This is not a diagnosis.</p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
      </form>

      {studentId && records ? (
        <div className="mt-4 grid gap-3">
          {child ? (
            <article className="rounded-card border border-line bg-card p-5">
              <div className="flex items-center gap-4">
                {child.photo ? (
                  <img src={child.photo} alt="" className="size-20 rounded-2xl object-cover" />
                ) : (
                  <div className="grid size-20 place-items-center rounded-2xl bg-teal-soft text-xl">{child.name.slice(0, 1)}</div>
                )}
                <div>
                  <h2 className="font-display text-3xl">{child.name}</h2>
                  <p className="text-sm text-muted">
                    {child.admissionNumber} · class {child.class}
                    {child.section}
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 text-sm">
                <div>
                  <dt className="text-muted">Date of birth</dt>
                  <dd className="mt-1">{child.dateOfBirth || "Not recorded"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Blood group</dt>
                  <dd className="mt-1">{child.bloodGroup || "Not recorded"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Known medical history</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{child.medicalHistory || "None recorded"}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm text-muted">Recorded by the school. This is not a new diagnosis.</p>
            </article>
          ) : null}
          <p className="text-sm text-muted">
            {classSection ? `Class ${classSection} · ` : ""}
            {records.length} log{records.length === 1 ? "" : "s"}
          </p>
          {records.length === 0 ? (
            <p className="rounded-card border border-line bg-card px-5 py-4 text-sm text-ink-soft">
              Nothing logged yet. When the medical room sees your child, it shows here.
            </p>
          ) : (
            records.map((visit) => (
              <article key={visit.id} className="rounded-card border border-line bg-card p-5">
                <p className="mt-1 text-sm text-muted">{new Date(visit.visited_at).toLocaleString()}</p>
                {visit.parent_ack === "none" ? <p className="mt-1 text-sm text-clay">New medical-room log</p> : null}
                <h2 className="mt-2 font-display text-2xl">{visit.symptoms.join(", ")}</h2>
                {visit.alert_text ? <p className="mt-2 text-sm text-ink-soft">{visit.alert_text}</p> : null}
                <dl className="mt-3 grid gap-3 text-sm">
                  <div>
                    <dt className="text-muted">Temperature</dt>
                    <dd className="mt-1 text-ink">{visit.temperature || "Not taken"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Note</dt>
                    <dd className="mt-1 text-ink">{visit.notes || "None"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">What the room did</dt>
                    <dd className="mt-1 text-ink-soft">{visit.action}</dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <p className="text-sm font-medium">Your reply</p>
                  <div className="mt-2 grid gap-2">
                    {REPLIES.map(([ack, label]) => (
                      <button
                        key={ack}
                        type="button"
                        className={`rounded-xl border px-4 py-3 text-left text-sm ${visit.parent_ack === ack ? "border-teal bg-teal-soft" : "border-line bg-paper"}`}
                        onClick={() => void onAck(visit.id, ack)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
