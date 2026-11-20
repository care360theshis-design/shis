import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { QrMark } from "@/components/qr-mark";
import { Button, buttonClass, SiteHeader } from "@/components/site-chrome";
import {
  ACTIONS,
  ACK_LABEL,
  CLUSTER_MIN,
  findClusters,
  formatWhen,
  NOTICE_LABEL,
  studentById,
  STUDENTS,
  SYMPTOMS,
  symptomCounts,
  WINDOW_DAYS,
  type Action,
  type NoticeKind,
  type Symptom,
  type Visit,
} from "@/lib/shis/model";
import { useShis } from "@/lib/shis/store";
import { DEMO_ROOM_CODE } from "@/lib/shis/vault";
import { cn } from "@/lib/cn";

type Tab = "room" | "patterns" | "alerts";

export function ConsoleApp() {
  const visits = useShis((s) => s.visits);
  const ready = useShis((s) => s.ready);
  const unlocked = useShis((s) => s.unlocked);
  const bootstrap = useShis((s) => s.bootstrap);
  const unlockRoom = useShis((s) => s.unlockRoom);
  const lockRoom = useShis((s) => s.lockRoom);
  const logVisit = useShis((s) => s.logVisit);
  const updateAlert = useShis((s) => s.updateAlert);
  const setAlertStatus = useShis((s) => s.setAlertStatus);
  const reset = useShis((s) => s.reset);

  const [tab, setTab] = useState<Tab>("alerts");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [action, setAction] = useState<Action | "">("");
  const [temp, setTemp] = useState("");
  const [notes, setNotes] = useState("");
  const [noticeKind, setNoticeKind] = useState<NoticeKind>("visit");
  const [error, setError] = useState("");
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [focusAlert, setFocusAlert] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [roomError, setRoomError] = useState("");
  const scanTimer = useRef<number | null>(null);

  useEffect(() => {
    void bootstrap();
    return () => {
      if (scanTimer.current) window.clearTimeout(scanTimer.current);
    };
  }, [bootstrap]);

  const clusters = useMemo(() => findClusters(visits), [visits]);
  const counts = useMemo(() => symptomCounts(visits), [visits]);
  const drafts = visits.filter((visit) => visit.alertStatus === "draft");
  const selected = selectedId ? studentById(selectedId) : undefined;
  const q = query.trim().toLowerCase();
  const filtered = STUDENTS.filter((student) => {
    if (!q) return true;
    return (
      student.id.toLowerCase().includes(q) || student.classSection.toLowerCase().includes(q)
    );
  });

  function beginScan(studentId: string) {
    if (scanTimer.current) window.clearTimeout(scanTimer.current);
    setScanningId(studentId);
    scanTimer.current = window.setTimeout(() => {
      setScanningId(null);
      setSelectedId(studentId);
      setError("");
      setTab("room");
    }, 900);
  }

  function onReset() {
    void reset();
    setSelectedId(null);
    setSymptoms([]);
    setAction("");
    setTemp("");
    setNotes("");
    setNoticeKind("visit");
    setError("");
    setFocusAlert(null);
    setTab("room");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (symptoms.length === 0) {
      setError("Choose at least one symptom.");
      return;
    }
    if (!action) {
      setError("Choose what the medical room did.");
      return;
    }
    const id = await logVisit({ studentId: selected.id, symptoms, temp, action, notes, noticeKind });
    setSymptoms([]);
    setAction("");
    setTemp("");
    setNotes("");
    setNoticeKind("visit");
    setError("");
    setFocusAlert(id);
    setTab("alerts");
  }

  async function onUnlock(event: React.FormEvent) {
    event.preventDefault();
    setRoomError("");
    const ok = await unlockRoom(roomCode);
    if (!ok) setRoomError("That room code does not open the records.");
  }

  return (
    <div className="min-h-screen">
      <div className="h-1 bg-teal" />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-teal-deep">Medical staff · authorize first</p>
            <h1 className="mt-1 font-display text-4xl font-medium tracking-tight">Parent notices</h1>
          </div>
          {unlocked ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" tone="quiet" onClick={lockRoom}>
                Lock room
              </Button>
              <Button type="button" tone="quiet" onClick={onReset}>
                <RotateCcw className="size-4" />
                Reset demo
              </Button>
            </div>
          ) : null}
        </div>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Records are sealed in the browser before they are kept. The room code unwraps them. A parent
          code unwraps one child only. Nothing here is a diagnosis.
        </p>

        {!ready || !unlocked ? (
          <form onSubmit={onUnlock} className="mt-6 max-w-md rounded-card border border-line bg-card p-5">
            <h2 className="font-display text-3xl">Unlock the medical room</h2>
            <p className="mt-2 text-sm text-ink-soft">
              {ready
                ? "Health notes stay unreadable until this code is entered."
                : "Sealing the records on this device."}
            </p>
            <label className="mt-4 block">
              <span className="text-sm font-medium">Room code</span>
              <input
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value)}
                type="password"
                autoComplete="off"
                disabled={!ready}
                className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3"
              />
            </label>
            <Button type="submit" className="mt-4" disabled={!ready}>
              Unlock
            </Button>
            <p className="mt-3 text-sm text-muted">Preview room code: {DEMO_ROOM_CODE}</p>
            {roomError ? <p className="mt-3 text-sm text-clay">{roomError}</p> : null}
          </form>
        ) : (
          <>

        <dl className="mt-6 grid grid-cols-3 gap-3">
          {[
            [String(visits.length), "visits on the log"],
            [String(clusters.length), "class flags"],
            [String(drafts.length), "waiting to authorize"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-line bg-card px-4 py-3">
              <dt className="font-display text-3xl tabular-nums text-teal-deep">{value}</dt>
              <dd className="text-xs text-muted">{label}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Medical room sections">
          {(
            [
              ["alerts", `Authorize${drafts.length ? ` (${drafts.length})` : ""}`],
              ["room", "Log a visit"],
              ["patterns", "Patterns"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={buttonClass(tab === id ? "primary" : "quiet")}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "room" ? (
          <section className="mt-6 grid gap-6">
            <label className="block">
              <span className="text-sm text-muted">Find a student by class or ID</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try 8B or STU-10482"
                className="mt-2 w-full rounded-2xl border border-line bg-card px-4 py-3 text-ink"
              />
            </label>
            {filtered.length === 0 ? (
              <p className="rounded-card border border-line bg-card px-4 py-6 text-sm text-muted">
                No student matches that search.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {filtered.map((student) => {
                  const active = student.id === selectedId;
                  const scanning = student.id === scanningId;
                  return (
                    <li key={student.id}>
                      <article
                        className={cn(
                          "flex gap-4 rounded-card border bg-card p-4",
                          active ? "border-teal" : "border-line",
                        )}
                      >
                        <QrMark seed={student.id} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{student.id}</p>
                          <p className="text-sm text-muted">Class {student.classSection}</p>
                          <button
                            type="button"
                            className={buttonClass("quiet", "mt-3")}
                            onClick={() => beginScan(student.id)}
                          >
                            {scanning ? "Reading card…" : "Scan ID"}
                          </button>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}

            {selected ? (
              <form onSubmit={onSubmit} className="rounded-card border border-line bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-3xl">{selected.id}</h2>
                    <p className="text-sm text-muted">Class {selected.classSection}</p>
                  </div>
                  <Link to="/" className="text-sm text-teal-deep">
                    Parent notices
                  </Link>
                </div>
                <fieldset className="mt-5">
                  <legend className="text-sm font-medium">Symptoms</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SYMPTOMS.map((symptom) => {
                      const on = symptoms.includes(symptom);
                      return (
                        <button
                          key={symptom}
                          type="button"
                          aria-pressed={on}
                          className={buttonClass(on ? "primary" : "quiet")}
                          onClick={() =>
                            setSymptoms((prev) =>
                              prev.includes(symptom)
                                ? prev.filter((item) => item !== symptom)
                                : [...prev, symptom],
                            )
                          }
                        >
                          {symptom}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <label className="mt-5 block">
                  <span className="text-sm font-medium">Temperature, if taken</span>
                  <input
                    value={temp}
                    onChange={(event) => setTemp(event.target.value)}
                    inputMode="decimal"
                    placeholder="Optional, for example 99.2"
                    className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3"
                  />
                </label>
                <fieldset className="mt-5">
                  <legend className="text-sm font-medium">What the room did</legend>
                  <div className="mt-2 grid gap-2">
                    {ACTIONS.map((item) => (
                      <label
                        key={item}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-3",
                          action === item ? "border-teal bg-teal-soft" : "border-line",
                        )}
                      >
                        <input
                          type="radio"
                          name="action"
                          checked={action === item}
                          onChange={() => setAction(item)}
                        />
                        <span className="text-sm">{item}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="mt-5">
                  <legend className="text-sm font-medium">What the parent should hear</legend>
                  <div className="mt-2 grid gap-2">
                    {(
                      [
                        ["visit", "Medical room visit"],
                        ["advisory", "Health advisory"],
                        ["emergency", "Emergency alert"],
                      ] as const
                    ).map(([kind, label]) => (
                      <label
                        key={kind}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-3",
                          noticeKind === kind ? "border-teal bg-teal-soft" : "border-line",
                        )}
                      >
                        <input
                          type="radio"
                          name="notice-kind"
                          checked={noticeKind === kind}
                          onChange={() => setNoticeKind(kind)}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="mt-5 block">
                  <span className="text-sm font-medium">Note for the file</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3"
                  />
                </label>
                {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
                <Button type="submit" className="mt-5">
                  Log visit and draft alert
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted">Scan an ID card to open the log form.</p>
            )}
          </section>
        ) : null}

        {tab === "patterns" ? (
          <section className="mt-6 grid gap-4">
            <article className="rounded-card border border-line bg-card p-5">
              <h2 className="font-display text-3xl">How a flag is raised</h2>
              <p className="mt-2 text-sm text-ink-soft">
                Count distinct students, not repeat visits. Same class, same symptom, {CLUSTER_MIN} or more,
                inside {WINDOW_DAYS} days. The suggestion is an awareness program. It is not a diagnosis and
                it is not sent to parents.
              </p>
            </article>
            {clusters.length === 0 ? (
              <p className="rounded-card border border-line bg-card px-5 py-6 text-sm text-muted">
                No classroom cluster in this window. Single visits stay on the log and do not flag a class.
              </p>
            ) : (
              <ul className="grid gap-3">
                {clusters.map((cluster) => (
                  <li
                    key={`${cluster.classSection}-${cluster.symptom}`}
                    className="rounded-card border border-line bg-clay-soft p-5"
                  >
                    <p className="text-sm text-clay">Class flag · not a diagnosis</p>
                    <h3 className="mt-1 font-display text-3xl">
                      {cluster.classSection} · {cluster.symptom}
                    </h3>
                    <p className="mt-2 text-sm">
                      {cluster.studentIds.length} students: {cluster.studentIds.join(", ")}
                    </p>
                    <p className="mt-2 text-sm text-ink-soft">{cluster.program}</p>
                  </li>
                ))}
              </ul>
            )}
            <article className="rounded-card border border-line bg-card p-5">
              <h2 className="font-display text-2xl">Symptoms logged this week</h2>
              {counts.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No visits in the window.</p>
              ) : (
                <ul className="mt-4 grid gap-3">
                  {counts.map((row) => {
                    const max = counts[0]?.count ?? 1;
                    const flagged = clusters.some((cluster) => cluster.symptom === row.name);
                    return (
                      <li key={row.name} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3">
                        <span className="text-sm">{row.name}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-line">
                          <span
                            className={cn("block h-2 rounded-full", flagged ? "bg-clay" : "bg-teal")}
                            style={{ width: `${Math.max(8, (row.count / max) * 100)}%` }}
                          />
                        </span>
                        <span className="text-right text-sm tabular-nums">{row.count}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          </section>
        ) : null}

        {tab === "alerts" ? (
          <section className="mt-6 grid gap-4">
            {visits.length === 0 ? (
              <p className="text-sm text-muted">No visits yet.</p>
            ) : (
              visits.map((visit) => (
                <AlertCard
                  key={visit.id}
                  visit={visit}
                  open={focusAlert === visit.id || (focusAlert === null && visit.alertStatus === "draft")}
                  onChange={(text) => updateAlert(visit.id, text)}
                  onSend={() => setAlertStatus(visit.id, "sent")}
                  onDismiss={() => setAlertStatus(visit.id, "dismissed")}
                />
              ))
            )}
          </section>
        ) : null}
          </>
        )}
      </main>
    </div>
  );
}

function AlertCard({
  visit,
  open,
  onChange,
  onSend,
  onDismiss,
}: {
  visit: Visit;
  open: boolean;
  onChange: (text: string) => void;
  onSend: () => void;
  onDismiss: () => void;
}) {
  const student = studentById(visit.studentId);
  const [text, setText] = useState(visit.alertText);
  useEffect(() => setText(visit.alertText), [visit.alertText]);
  const locked = visit.alertStatus !== "draft";

  return (
    <article className="rounded-card border border-line bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{formatWhen(visit.at)}</p>
          <h2 className="font-display text-2xl">{student?.id ?? "Student"}</h2>
          <p className="text-sm text-ink-soft">
            {NOTICE_LABEL[visit.noticeKind]} · Class {student?.classSection} · {visit.symptoms.join(", ")} ·{" "}
            {visit.action}
          </p>
          <p className="mt-1 text-sm text-muted">
            Parent: {visit.ack === "none" ? "No reply yet" : ACK_LABEL[visit.ack]}
          </p>
        </div>
        <p
          className={cn(
            "rounded-full px-3 py-1 text-sm",
            visit.alertStatus === "draft" && "bg-clay-soft text-ink",
            visit.alertStatus === "sent" && "bg-teal-soft text-teal-deep",
            visit.alertStatus === "dismissed" && "bg-paper text-muted",
          )}
        >
          {visit.alertStatus === "draft"
            ? "Waiting"
            : visit.alertStatus === "sent"
              ? "Parent can see this"
              : "Dismissed"}
        </p>
      </div>
      {open || visit.alertStatus === "draft" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Notice for the parent</span>
            <textarea
              value={text}
              disabled={locked}
              rows={10}
              onChange={(event) => {
                setText(event.target.value);
                onChange(event.target.value);
              }}
              className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm disabled:opacity-70"
            />
          </label>
          <div className="rounded-2xl border border-line bg-paper p-4">
            <p className="text-xs tracking-wide text-muted uppercase">Parent view</p>
            <p className="mt-3 text-sm whitespace-pre-wrap text-ink-soft">{text}</p>
            {visit.alertStatus === "draft" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={onSend}>
                  Authorize — parent hears this
                </Button>
                <Button type="button" tone="quiet" onClick={onDismiss}>
                  Dismiss
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
