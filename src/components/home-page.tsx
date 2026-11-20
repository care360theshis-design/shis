import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ParentPanel } from "@/components/parent-panel";
import { buttonClass, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { SITE } from "@/lib/site";

export function HomePage() {
  const [copied, setCopied] = useState<"parents" | "medical" | "embed" | null>(null);
  const [origin, setOrigin] = useState("");
  const [side, setSide] = useState<"parents" | "staff">("parents");

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
      <SiteHeader side={side} onSide={setSide} />
      <main className="mx-auto max-w-3xl px-4 py-10">
        {side === "parents" ? (
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
          </div>
        ) : (
          <div className="grid gap-4">
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
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
