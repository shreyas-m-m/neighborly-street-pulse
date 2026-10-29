import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report an Issue — DataPulse" },
      { name: "description", content: "Report a civic incident in your area." },
      { property: "og:title", content: "Report an Issue — DataPulse" },
      { property: "og:description", content: "Report a civic incident in your area." },
    ],
  }),
  component: () => (
    <PagePlaceholder title="Report an Issue" description="The incident reporting form will live here." />
  ),
});
