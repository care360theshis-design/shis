import { Github } from "lucide-react";
import { buttonClass, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { GITHUB, SITE } from "@/lib/site";

const FILES = [
  { path: "README.md", note: "What the product does, and the two sides." },
  { path: "docs/privacy.md", note: "No real student data in this repo. Parameterized queries and audit rows." },
  { path: "docs/schema.md", note: "PostgreSQL tables for students, visits, risk snapshots, and audit logs." },
];

export function GithubPage() {
  return (
    <div className="min-h-screen">
      <div className="h-1 bg-teal" />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm text-teal-deep">Source</p>
        <h1 className="mt-3 font-display text-5xl font-medium tracking-tight">The repository</h1>
        <p className="mt-4 max-w-2xl text-ink-soft">
          {SITE.fullName} is published at {GITHUB.login}/{GITHUB.repoName}. The demo uses student IDs
          only. No personal profile is linked.
        </p>
        <a href={GITHUB.repoUrl} target="_blank" rel="noreferrer" className={buttonClass("primary", "mt-6")}>
          <Github className="size-4" />
          Open the repository
        </a>

        <section className="mt-10 overflow-hidden rounded-card border border-line bg-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-display text-2xl">README</h2>
          </div>
          <div className="grid gap-4 px-5 py-5 text-sm text-ink-soft">
            <p>
              {SITE.name} replaces the medical-room register for a large school. Staff scan a student QR
              code, log symptoms and the action taken, and approve a parent notice before it is sent.
            </p>
            <p>
              Once a week the pattern service counts symptoms by class. A flag needs the same symptom from
              at least three different students in seven days. The service suggests an awareness program. It
              does not name a disease, and it does not contact a parent.
            </p>
            <p>
              Proposed pieces: a Flutter or React Native app, a Node.js or Django API, PostgreSQL, and a
              Python clustering job. Privacy follows the DPDP Act 2023 and the 2025 Rules: minimised data,
              role-based access, encryption, and an audit row on every write.
            </p>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-card border border-line">
          <div className="border-b border-line bg-card px-5 py-4">
            <h2 className="font-display text-2xl">Files</h2>
          </div>
          <ul>
            {FILES.map((file) => (
              <li key={file.path} className="grid gap-1 border-b border-line bg-card px-5 py-4 last:border-b-0 sm:grid-cols-[16rem_1fr] sm:items-center">
                <p className="font-medium tabular-nums">{file.path}</p>
                <p className="text-sm text-muted">{file.note}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
