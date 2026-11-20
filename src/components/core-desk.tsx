import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/site-chrome";
import { addStudent, addStudents, approveVisit, loadDesk, loadPattern, loadProfile, openStaff, recordMeasure, saveAbsence, saveProfile, saveVisit, setReportAside, verifyReport, type DeskClass, type DeskReport, type DeskStudent, type DeskVisit } from "@/lib/shis/desk";

const SYMPTOMS = ["Cough", "Fever", "Headache", "Sore throat", "Stomach ache", "Cold"];
const NOTES = ["Must see a doctor", "Healthy", "Bunking", "Provided medicine and in school"] as const;

function bothTemps(value: string, unit: "C" | "F") {
  const n = Number(value);
  if (!value.trim() || !Number.isFinite(n)) return "";
  const c = unit === "C" ? n : ((n - 32) * 5) / 9;
  const f = unit === "F" ? n : (n * 9) / 5 + 32;
  return `${c.toFixed(1)} °C / ${f.toFixed(1)} °F`;
}

function bmiLabel(height: string, weight: string) {
  const h = Number(height);
  const w = Number(weight);
  if (!h || !w) return "Needs height and weight";
  return (w / (h / 100) ** 2).toFixed(1);
}

export function CoreDesk() {
  const [students, setStudents] = useState<DeskStudent[]>([]);
  const [classes, setClasses] = useState<DeskClass[]>([]);
  const [visits, setVisits] = useState<DeskVisit[]>([]);
  const [reports, setReports] = useState<DeskReport[]>([]);
  const [absenceNote, setAbsenceNote] = useState("");
  const [absenceClass, setAbsenceClass] = useState("8B");
  const [absenceCount, setAbsenceCount] = useState("0");
  const [impactNote, setImpactNote] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [admission, setAdmission] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentSection, setStudentSection] = useState("");
  const [phone, setPhone] = useState("");
  const [born, setBorn] = useState("");
  const [gender, setGender] = useState("");
  const [blood, setBlood] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [history, setHistory] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoShown, setPhotoShown] = useState("");
  const [roster, setRoster] = useState("");
  const [bunking, setBunking] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [temperature, setTemperature] = useState("");
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffPassword, setStaffPassword] = useState("");

  async function refresh() {
    const desk = await loadDesk();
    setStudents(desk.students);
    setClasses(desk.classrooms);
    setVisits(desk.visits);
    setReports(desk.reports);
    setAbsenceNote(desk.absenceNote);
    setImpactNote(String((desk.impact as { note?: string }).note ?? ""));
    setDisclaimer(desk.disclaimer);
  }

  useEffect(() => {
    if (sessionStorage.getItem("shis-staff") === "open") setOpened(true);
  }, []);

  useEffect(() => {
    if (!opened) return;
    void refresh().catch((err: Error) => setError(err.message));
  }, [opened]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) => {
      const label = `${student.student_school_id} ${student.name} ${student.class}${student.section}`.toLowerCase();
      return label.includes(q);
    });
  }, [query, students]);

  const selected = students.find((student) => student.student_school_id === selectedId);

  function toggleSymptom(symptom: string) {
    setSymptoms((current) =>
      current.includes(symptom) ? current.filter((item) => item !== symptom) : [...current, symptom],
    );
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) {
      setError("Choose a student first.");
      return;
    }
    if (symptoms.length === 0) {
      setError("Choose at least one symptom.");
      return;
    }
    if (!notes) {
      setError("Choose a note.");
      return;
    }
    const shownTemp = bothTemps(temperature, unit);
    if (temperature.trim() && !shownTemp) {
      setError("Enter the temperature as a number.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const result = (await saveVisit({
        data: {
          studentSchoolId: selected.student_school_id,
          symptoms,
          temperature: shownTemp,
          notes,
          action: "Recorded in the medical room",
        },
      })) as { classKey?: string; risk?: { label?: string }; parentNotified?: boolean; bunking?: { review?: boolean; text?: string } };
      setSymptoms([]);
      setTemperature("");
      setNotes("");
      if (result.bunking?.review) setBunking(result.bunking.text || "");
      setSaved(
        `${selected.student_school_id} saved. The parent is notified. ${result.classKey ?? ""} is ${result.risk?.label ?? "updated"}.`,
      );
      await refresh();
      if (startedAt) {
        await recordMeasure({ data: { indicator: "record", durationMs: Date.now() - startedAt } });
        setStartedAt(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the visit");
    } finally {
      setBusy(false);
    }
  }

  if (!opened) {
    return (
      <div className="min-h-screen">
        <div className="h-1 bg-teal" />
        <SiteHeader />
        <main className="mx-auto max-w-md px-4 py-10">
          <p className="text-sm text-teal-deep">Medical room</p>
          <h1 className="mt-1 font-display text-4xl font-medium tracking-tight">Authorization</h1>
          <form
            className="mt-6 rounded-card border border-line bg-card p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              try {
                await openStaff({ data: { name: staffName.trim(), password: staffPassword } });
                sessionStorage.setItem("shis-staff", "open");
                setStaffPassword("");
                setOpened(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : "That name and password do not open the medical room.");
              }
            }}
          >
            <label className="block text-sm">
              Name
              <input
                value={staffName}
                onChange={(event) => setStaffName(event.target.value)}
                autoComplete="username"
                className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3"
              />
            </label>
            <label className="mt-4 block text-sm">
              Password
              <input
                value={staffPassword}
                onChange={(event) => setStaffPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3"
              />
            </label>
            <Button type="submit" className="mt-4">
              Open authorization
            </Button>
            <p className="mt-3 text-sm text-muted">Name medical. Password shis-room.</p>
            {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="h-1 bg-teal" />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-teal-deep">Medical room</p>
        <h1 className="mt-1 font-display text-4xl font-medium tracking-tight">Classroom health</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Find the student, record the visit, then look at the class. A flag means review recommended.
          It is not a diagnosis.
        </p>
        {disclaimer ? <p className="mt-2 text-sm text-muted">{disclaimer}</p> : null}
        {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
        {saved ? <p className="mt-3 text-sm text-teal-deep">{saved}</p> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <form onSubmit={onSave} className="rounded-card border border-line bg-card p-5">
            <h2 className="font-display text-2xl">1. Find the student</h2>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Admission number or class"
              className="mt-3 w-full rounded-2xl border border-line bg-paper px-4 py-3"
            />
            <div className="mt-3 grid max-h-40 gap-1 overflow-auto">
              {matches.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  className={`rounded-xl px-3 py-2 text-left text-sm ${selectedId === student.student_school_id ? "bg-teal-soft" : "hover:bg-paper"}`}
                  onClick={() => {
                    setSelectedId(student.student_school_id);
                    setStartedAt(Date.now());
                    setBunking("");
                    setPhoto("");
                    void loadProfile({ data: { admissionNumber: student.student_school_id } })
                      .then((result) => {
                        const child = (result as { child?: { dateOfBirth?: string; gender?: string; bloodGroup?: string; heightCm?: string; weightKg?: string; medicalHistory?: string; photo?: string } }).child;
                        setBorn(child?.dateOfBirth || "");
                        setGender(child?.gender || "");
                        setBlood(child?.bloodGroup || "");
                        setHeight(child?.heightCm || "");
                        setWeight(child?.weightKg || "");
                        setHistory(child?.medicalHistory || "");
                        setPhotoShown(child?.photo || "");
                      })
                      .catch(() => {
                        setBorn("");
                        setGender("");
                        setBlood("");
                        setHeight("");
                        setWeight("");
                        setHistory("");
                        setPhotoShown("");
                      });
                    void loadPattern({ data: { studentSchoolId: student.student_school_id } })
                      .then((result) => {
                        const hint = result as { review?: boolean; text?: string };
                        setBunking(hint.review ? hint.text || "" : "");
                      })
                      .catch(() => setBunking(""));
                  }}
                >
                  {student.student_school_id} · {student.name} · class {student.class}
                  {student.section}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-2 border-t border-line pt-4">
              <p className="text-sm font-medium">Add a student</p>
              <input
                value={admission}
                onChange={(event) => setAdmission(event.target.value)}
                inputMode="numeric"
                placeholder="6-digit admission number"
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
              />
              <input
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                placeholder="Name"
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
              />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="numeric"
                placeholder="Parent phone (10 digits)"
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
              />
              <input
                value={born}
                onChange={(event) => setBorn(event.target.value)}
                placeholder="Date of birth DD-MM-YYYY"
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
              />
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
              >
                <option value="">Gender</option>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
              <input
                value={blood}
                onChange={(event) => setBlood(event.target.value)}
                placeholder="Blood group"
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
              />
              <input
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                inputMode="decimal"
                placeholder="Height in cm"
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
              />
              <input
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                inputMode="decimal"
                placeholder="Weight in kg"
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
              />
              <p className="text-sm">
                <span className="text-muted">BMI</span> — {bmiLabel(height, weight)}
              </p>
              <textarea
                value={history}
                onChange={(event) => setHistory(event.target.value)}
                rows={3}
                placeholder={"Previously known diseases, one line each:\nAsthma\nPenicillin"}
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm"
              />
              <label className="text-sm">
                Photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="mt-1 block w-full text-sm"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 280000) {
                      setError("That photo is too large. Use a smaller image.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const next = String(reader.result || "");
                      setPhoto(next);
                      setPhotoShown(next);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {photoShown ? <img src={photoShown} alt="" className="size-16 rounded-2xl object-cover" /> : null}
              <Button
                type="button"
                tone="quiet"
                onClick={async () => {
                  if (!selectedId) {
                    setError("Choose the student first, or add them with the details filled in.");
                    return;
                  }
                  setError("");
                  try {
                    await saveProfile({
                      data: {
                        admissionNumber: selectedId,
                        dateOfBirth: born.trim(),
                        gender,
                        bloodGroup: blood.trim(),
                        heightCm: height.trim(),
                        weightKg: weight.trim(),
                        medicalHistory: history.trim(),
                        photo,
                      },
                    });
                    setSaved("Child record saved. The parent sees it when they open this child.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not save that record");
                  }
                }}
              >
                Save record for selected student
              </Button>
              <div className="flex gap-2">
                <input
                  value={studentClass}
                  onChange={(event) => setStudentClass(event.target.value)}
                  placeholder="Class"
                  className="w-24 rounded-2xl border border-line bg-paper px-3 py-3"
                />
                <input
                  value={studentSection}
                  onChange={(event) => setStudentSection(event.target.value)}
                  placeholder="Section"
                  className="w-24 rounded-2xl border border-line bg-paper px-3 py-3"
                />
                <Button
                  type="button"
                  tone="quiet"
                  onClick={async () => {
                    setError("");
                    try {
                      const result = (await addStudent({
                        data: {
                          admissionNumber: admission.trim(),
                          name: studentName.trim(),
                          class: studentClass.trim(),
                          section: studentSection.trim(),
                          phone: phone.trim(),
                          dateOfBirth: born.trim(),
                          bloodGroup: blood.trim(),
                          medicalHistory: history.trim(),
                          photo,
                        },
                      })) as { student?: { student_school_id?: string; parent_code?: string } };
                      const code = result.student?.parent_code ? ` Parent code ${result.student.parent_code}.` : "";
                      setAdmission("");
                      setStudentName("");
                      setStudentClass("");
                      setStudentSection("");
                      setPhone("");
                      setBorn("");
                      setGender("");
                      setBlood("");
                      setHeight("");
                      setWeight("");
                      setHistory("");
                      setPhoto("");
                      setPhotoShown("");
                      setQuery(result.student?.student_school_id ?? "");
                      if (result.student?.student_school_id) {
                        setSelectedId(result.student.student_school_id);
                        setStartedAt(Date.now());
                      }
                      setSaved(`Student added.${code} The code is the last 4 digits of the phone.`);
                      await refresh();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Could not add that student");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <textarea
                value={roster}
                onChange={(event) => setRoster(event.target.value)}
                rows={4}
                placeholder={"Paste many, one per line:\n104821, A Sharma, 8, C, 9811104821"}
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm"
              />
              <Button
                type="button"
                tone="quiet"
                onClick={async () => {
                  setError("");
                  try {
                    const result = (await addStudents({ data: { text: roster } })) as {
                      added?: { admissionNumber: string; parentCode: string }[];
                      skipped?: { error: string }[];
                    };
                    const added = result.added ?? [];
                    const skipped = result.skipped ?? [];
                    setRoster("");
                    setSaved(
                      `Added ${added.length}. Skipped ${skipped.length}. Parent code is the last 4 digits of each phone.`,
                    );
                    await refresh();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not add that list");
                  }
                }}
              >
                Add the list
              </Button>
            </div>

            <h2 className="mt-5 font-display text-2xl">2. Record the visit</h2>
            {bunking ? (
              <p className="mt-3 rounded-xl border border-line bg-paper px-4 py-3 text-sm">
                Pattern check, not a decision. {bunking} A person has to choose the note.
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {SYMPTOMS.map((symptom) => (
                <button
                  key={symptom}
                  type="button"
                  className={`min-h-11 rounded-full border px-4 text-sm ${symptoms.includes(symptom) ? "border-teal bg-teal-soft" : "border-line"}`}
                  onClick={() => toggleSymptom(symptom)}
                >
                  {symptom}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <p className="text-sm">Temperature</p>
              <div className="mt-1 flex gap-2">
                <input
                  value={temperature}
                  onChange={(event) => setTemperature(event.target.value)}
                  inputMode="decimal"
                  placeholder={unit === "C" ? "37.0" : "98.6"}
                  className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
                />
                <button type="button" className={`min-h-11 rounded-full border px-4 text-sm ${unit === "C" ? "border-teal bg-teal-soft" : "border-line"}`} onClick={() => setUnit("C")}>°C</button>
                <button type="button" className={`min-h-11 rounded-full border px-4 text-sm ${unit === "F" ? "border-teal bg-teal-soft" : "border-line"}`} onClick={() => setUnit("F")}>°F</button>
              </div>
              <p className="mt-2 text-sm text-ink-soft">{bothTemps(temperature, unit) || "Not taken"}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm">Note</p>
              <div className="mt-2 grid gap-2">
                {NOTES.map((note) => (
                  <button
                    key={note}
                    type="button"
                    className={`rounded-xl border px-4 py-3 text-left text-sm ${notes === note ? "border-teal bg-teal-soft" : "border-line bg-paper"}`}
                    onClick={() => setNotes(note)}
                  >
                    {note}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="mt-4" disabled={busy}>
              {busy ? "Saving" : "Save visit"}
            </Button>
          </form>

          <section className="rounded-card border border-line bg-card p-5">
            <h2 className="font-display text-2xl">3. Class review</h2>
            {classes.some((room) => room.distinct3d > 0) ? (
            <ul className="mt-4 grid gap-3">
              {classes.filter((room) => room.distinct3d > 0).map((room) => (
                <li key={room.classKey}>
                  <div className="flex items-center justify-between text-sm">
                    <span>Class {room.classKey}</span>
                    <span className={room.label === "Normal" ? "text-teal-deep" : "text-clay"}>
                      {room.label}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper">
                    <div
                      className={`h-full ${room.band === "low" ? "bg-teal" : "bg-clay"}`}
                      style={{ width: `${Math.max(8, Math.min(100, (room.distinct3d / Math.max(room.classSize, 1)) * 100))}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {room.distinct3d} of {room.classSize} students in 3 days
                  </p>
                </li>
              ))}
            </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">No class flags yet.</p>
            )}
            <h3 className="mt-6 text-sm font-medium">Latest visits</h3>
            {visits.length === 0 ? <p className="mt-2 text-sm text-muted">No visits yet.</p> : null}
            <ul className="mt-2 grid gap-2 text-sm text-ink-soft">
              {visits.slice(0, 6).map((visit) => (
                <li key={visit.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {visit.student_school_id} · {visit.class_key} · {visit.symptoms.join(", ")}
                    <span className="mt-1 block">Temperature: {visit.temperature || "Not taken"}</span>
                    <span className="block">Note: {visit.notes || "None"}</span>
                  </span>
                  <button
                    type="button"
                    className="text-teal-deep underline"
                    onClick={async () => {
                      await approveVisit({ data: { id: visit.id } });
                      await recordMeasure({
                        data: {
                          indicator: "communication",
                          durationMs: Date.now() - new Date(visit.visited_at).getTime(),
                        },
                      });
                      setSaved("Parent notice approved. It is not a diagnosis.");
                    }}
                  >
                    Parent notified
                  </button>
                </li>
              ))}
            </ul>
            {classes.some((room) => room.label !== "Normal") ? (
              <Button
                type="button"
                tone="quiet"
                className="mt-4"
                onClick={() => recordMeasure({ data: { indicator: "prevention" } })}
              >
                Staff reviewed the flag
              </Button>
            ) : null}
          </section>
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-card border border-line bg-card p-5">
            <h2 className="font-display text-2xl">Student reports</h2>
            <p className="mt-2 text-sm text-muted">Checked by a person before they count.</p>
            <ul className="mt-3 grid gap-2 text-sm">
              {reports.length === 0 ? <li className="text-muted">None waiting.</li> : null}
              {reports.map((report) => (
                <li key={report.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {report.student_school_id} · {report.feeling}
                  </span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className="text-teal-deep underline"
                      onClick={async () => {
                        await verifyReport({ data: { id: report.id } });
                        await refresh();
                      }}
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      className="text-muted underline"
                      onClick={async () => {
                        await setReportAside({ data: { id: report.id } });
                        await refresh();
                      }}
                    >
                      Set aside
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <form
            className="rounded-card border border-line bg-card p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              await saveAbsence({ data: { classKey: absenceClass, absentCount: Number(absenceCount) } });
              await refresh();
            }}
          >
            <h2 className="font-display text-2xl">Class absence</h2>
            <p className="mt-2 text-sm text-muted">{absenceNote}</p>
            <div className="mt-3 flex gap-2">
              <input
                value={absenceClass}
                onChange={(event) => setAbsenceClass(event.target.value)}
                className="w-24 rounded-2xl border border-line bg-paper px-3 py-2"
                aria-label="Class"
              />
              <input
                value={absenceCount}
                onChange={(event) => setAbsenceCount(event.target.value)}
                inputMode="numeric"
                className="w-24 rounded-2xl border border-line bg-paper px-3 py-2"
                aria-label="Students absent"
              />
              <Button type="submit" tone="quiet">
                Save total
              </Button>
            </div>
          </form>

          <div className="rounded-card border border-line bg-card p-5">
            <h2 className="font-display text-2xl">What we measure</h2>
            <p className="mt-2 text-sm text-muted">{impactNote}</p>
            <ul className="mt-3 grid gap-1 text-sm text-ink-soft">
              <li>Time to enter a visit, from choosing the student to save.</li>
              <li>Time to notify a parent, from the visit to “Parent notified”.</li>
              <li>Whether a flagged class gets a human review.</li>
              <li>Ease, 1 to 5, after a visit is saved.</li>
            </ul>
            <div className="mt-3 flex gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  className="grid size-9 place-items-center rounded-full border border-line"
                  onClick={() => recordMeasure({ data: { indicator: "usability", score } })}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
