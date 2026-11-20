import { createFileRoute } from "@tanstack/react-router";
import { ParentPanel } from "@/components/parent-panel";

export const Route = createFileRoute("/embed")({
  head: () => ({
    meta: [{ title: "Notices · SHIS" }],
  }),
  component: EmbedDoor,
});

function EmbedDoor() {
  return (
    <main className="min-h-screen bg-paper p-4">
      <p className="text-sm text-teal-deep">School health notices</p>
      <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">For parents</h1>
      <p className="mt-2 mb-4 text-sm text-muted">Open the record with the student ID. You only see that child.</p>
      <ParentPanel embedded />
    </main>
  );
}
