import { cn } from "@/lib/cn";

export function QrMark({ seed, className }: { seed: string; className?: string }) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const cells: boolean[] = [];
  for (let i = 0; i < 49; i++) {
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    const col = i % 7;
    const row = Math.floor(i / 7);
    const finder = (row < 2 && col < 2) || (row < 2 && col > 4) || (row > 4 && col < 2);
    cells.push(finder || (hash & 1) === 1);
  }
  return (
    <span className={cn("grid grid-cols-7 gap-px bg-ink p-1", className)} aria-hidden>
      {cells.map((on, index) => (
        <span key={index} className={on ? "size-1.5 bg-card" : "size-1.5 bg-ink"} />
      ))}
    </span>
  );
}
