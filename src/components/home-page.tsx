import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ParentPanel } from "@/components/parent-panel";
import { buttonClass, Button, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { reportUnwell } from "@/lib/shis/desk";
import { SITE } from "@/lib/site";

export function HomePage() {
  const [unwell, setUnwell] = useState("");
  const [feeling, setFeeling] = useState("Headache");
  const [unwellNote, setUnwellNote] = useState("");
  const [copied, setCopied] = useState<"parents" | "medical" | "embed" | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const parentUrl = `${origin}/`;
  const medicalUrl = `${origin}/console`;
  const embed = `<iframe src="${origin}/embed" title="School health notices" style="width:100%;max-width:28rem;height:36rem;border:0"></iframe>`;

  async function copy(kind: "parents" | "medical" | "embed", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="h-1 bg-teal" />
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <div>
          <p className="text-sm text-teal-deep">Parents hear first</p>
          <h1 className="mt-3 font-display text-5xl leading-none font-medium tracking-tight">
            Notices from the school medical room
          </h1>
          <p className="mt-4 max-w-xl text-base text-ink-soft">
            {SITE.name} shows a parent only their own child’s medical-room record, and only after the parent
            code opens it. The notes are sealed in the browser. A notice is not a diagnosis.
          </p>
          <div className="mt-6">
            <ParentPanel />
          </div>
          <form
            className="mt-6 max-w-xl rounded-card border border-line bg-card p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setUnwellNote("");
              try {
                const result = (await reportUnwell({
                  data: { studentSchoolId: unwell.trim().toUpperCase(), feeling },
                })) as { note?: string };
                setUnwellNote(result.note ?? "Sent to the medical room.");
                setUnwell("");
              } catch (err) {
                setUnwellNote(err instanceof Error ? err.message : "Could not send that");
              }
            }}
          >
            <h2 className="font-display text-2xl">Feeling unwell</h2>
            <p className="mt-2 text-sm text-ink-soft">
              A student can say so on a supervised school screen. Medical staff check it before it is a record.
              This is not a diagnosis.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={unwell}
                onChange={(event) => setUnwell(event.target.value)}
                placeholder="Student ID"
                className="min-w-36 flex-1 rounded-2xl border border-line bg-paper px-4 py-3"
              />
              <select
                value={feeling}
                onChange={(event) => setFeeling(event.target.value)}
                className="rounded-2xl border border-line bg-paper px-3 py-3"
              >
                {["Headache", "Cough", "Stomach ache", "Tired", "Other"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <Button type="submit">Send to medical room</Button>
            </div>
            {unwellNote ? <p className="mt-3 text-sm text-muted">{unwellNote}</p> : null}
          </form>
        </div>

        <aside className="grid gap-4">
          <div className="rounded-card border border-line bg-card p-5">
            <p className="text-sm text-muted">The other side</p>
            <h2 className="mt-2 font-display text-3xl">Medical staff</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Log a visit, then authorize the notice. Parents do not see it until you do.
            </p>
            <Link to="/console" className={buttonClass("primary", "mt-4")}>
              Open authorization
            </Link>
          </div>

          <div id="door" className="rounded-card border border-line bg-card p-5">
            <h2 className="font-display text-3xl">Add this to a school website</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Two links, or a box you can drop onto a page the school already has.
            </p>
            <div className="mt-4 grid gap-2">
              <button type="button" className={buttonClass("quiet")} onClick={() => copy("parents", parentUrl)}>
                {copied === "parents" ? "Copied parent link" : "Copy parent link"}
              </button>
              <button type="button" className={buttonClass("quiet")} onClick={() => copy("medical", medicalUrl)}>
                {copied === "medical" ? "Copied medical link" : "Copy medical link"}
              </button>
              <button type="button" className={buttonClass("quiet")} onClick={() => copy("embed", embed)}>
                {copied === "embed" ? "Copied embed code" : "Copy embed code"}
              </button>
            </div>
          </div>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
