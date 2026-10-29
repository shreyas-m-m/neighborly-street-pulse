import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — DataPulse" },
      { name: "description", content: "View and prioritise reported civic incidents." },
      { property: "og:title", content: "Dashboard — DataPulse" },
      { property: "og:description", content: "View and prioritise reported civic incidents." },
    ],
  }),
  component: () => (
    <PagePlaceholder title="Dashboard" description="The prioritised incident list and stats will live here." />
  ),
});
