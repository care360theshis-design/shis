import { createFileRoute } from "@tanstack/react-router";
import { GithubPage } from "@/components/github-page";

export const Route = createFileRoute("/github")({
  head: () => ({
    meta: [{ title: "Repository · SHIS" }],
  }),
  component: GithubPage,
});
