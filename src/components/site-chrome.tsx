import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { GITHUB, SITE } from "@/lib/site";

const NAV = [
  { to: "/", label: "Parents" },
  { to: "/console", label: "Medical staff" },
] as const;

export function Mark({ className }: { className?: string }) {
  return (
    <span
      className={cn("grid size-9 place-items-center rounded-xl bg-teal text-card", className)}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="size-5" fill="none">
        <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.6" />
        <path d="M16 9v14M9 16h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

const tones = {
  primary: "bg-teal text-card",
  clay: "bg-clay text-card",
  quiet: "border border-line bg-card text-ink",
  ghost: "bg-transparent text-ink",
} as const;

export function buttonClass(tone: keyof typeof tones = "primary", className?: string) {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-transform duration-150 ease-out active:not-disabled:scale-[0.96] disabled:opacity-50",
    tones[tone],
    className,
  );
}

export function Button({
  tone = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: keyof typeof tones }) {
  return <button className={buttonClass(tone, className)} {...props} />;
}

export function SiteHeader({
  side,
  onSide,
}: {
  side?: "parents" | "staff";
  onSide?: (side: "parents" | "staff") => void;
}) {
  const [open, setOpen] = useState(false);

  function choose(next: "parents" | "staff") {
    onSide?.(next);
    setOpen(false);
  }

  const itemClass = (active: boolean) =>
    cn("text-sm", active ? "font-medium text-ink" : "text-ink-soft");

  const links = onSide ? (
    <>
      <button type="button" className={itemClass(side !== "staff")} onClick={() => choose("parents")}>
        Parents
      </button>
      <button type="button" className={itemClass(side === "staff")} onClick={() => choose("staff")}>
        Medical staff
      </button>
    </>
  ) : (
    NAV.map((item) => (
      <Link key={item.to} to={item.to} className="text-sm text-ink-soft" onClick={() => setOpen(false)}>
        {item.label}
      </Link>
    ))
  );

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <Mark />
          <span className="font-display text-lg font-medium tracking-tight">{SITE.name}</span>
        </Link>
        <nav className="ml-auto hidden items-center gap-6 md:flex">{links}</nav>
        <button
          type="button"
          className="ml-auto grid size-11 place-items-center rounded-full border border-line bg-card md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>
      {open ? (
        <nav className="grid gap-1 border-t border-line px-4 py-3 md:hidden">
          {onSide ? (
            <>
              <button type="button" className="rounded-xl px-3 py-3 text-left text-sm" onClick={() => choose("parents")}>
                Parents
              </button>
              <button type="button" className="rounded-xl px-3 py-3 text-left text-sm" onClick={() => choose("staff")}>
                Medical staff
              </button>
            </>
          ) : (
            NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl px-3 py-3 text-sm"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))
          )}
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-xl">{SITE.name}</p>
          <p className="mt-1 max-w-md text-sm text-muted">
            A medical-room system any school can run. Student records in the demo use IDs only.
          </p>
        </div>
        <a
          href={GITHUB.repoUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-teal-deep"
        >
          {GITHUB.login}/{GITHUB.repoName}
        </a>
      </div>
    </footer>
  );
}
