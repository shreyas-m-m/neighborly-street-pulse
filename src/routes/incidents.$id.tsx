import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/incidents/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Incident ${params.id} — DataPulse` },
      { name: "description", content: "Details for a reported civic incident." },
      { property: "og:title", content: `Incident ${params.id} — DataPulse` },
      { property: "og:description", content: "Details for a reported civic incident." },
    ],
  }),
  component: IncidentPage,
});

function IncidentPage() {
  const { id } = Route.useParams();
  return <PagePlaceholder title={`Incident ${id}`} description="Incident details, status and history will live here." />;
}
