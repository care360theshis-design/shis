import { createFileRoute } from "@tanstack/react-router";
import { CoreDesk } from "@/components/core-desk";

export const Route = createFileRoute("/console")({
  head: () => ({
    meta: [{ title: "Medical room · SHIS" }],
  }),
  component: CoreDesk,
});
