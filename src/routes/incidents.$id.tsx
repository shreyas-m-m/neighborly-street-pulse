import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, MapPin, SearchX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { CATEGORIES } from "@/data/demo";
import { useIncidents } from "@/hooks/use-incidents";
import { STATUSES, STATUS_LABELS, computeScore, setIncidentStatus } from "@/lib/incidents";

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
  const { incidents, ready, now, refresh } = useIncidents();
  const incident = incidents.find((i) => i.id === id);

  const back = (
    <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Back to dashboard
    </Link>
  );

  if (!incident) {
    if (!ready) return <div className="mx-auto max-w-4xl px-4 py-12 text-muted-foreground">Loading…</div>;
    return (
      <section className="mx-auto max-w-xl px-4 py-20 text-center">
        <SearchX className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold text-primary">Incident not found</h1>
        <p className="mt-2 text-muted-foreground">No incident with ID <span className="font-mono">{id}</span> exists in the demo data or this browser.</p>
        <Button asChild className="mt-6"><Link to="/dashboard">Back to dashboard</Link></Button>
      </section>
    );
  }

  const category = CATEGORIES.find((c) => c.id === incident.category);
  const score = computeScore(incident, incidents, now);
  const rows = [
    { label: "Severity", weight: 40, value: score.severity },
    { label: "People affected", weight: 25, value: score.people },
    { label: "Time unresolved", weight: 20, value: score.time },
    { label: "Nearby reports", weight: 15, value: score.nearby },
  ];

  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      {back}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-muted-foreground">{incident.id}</span>
        <Badge variant="outline">{incident.source === "demo" ? "Demo data" : "Saved in this browser"}</Badge>
      </div>
      <h1 className="mt-2 text-3xl font-bold text-primary">{incident.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={incident.severity} />
        <StatusBadge status={incident.status} />
        {category && <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><category.icon className="h-4 w-4" /> {category.name}</span>}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">{incident.description}</p>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
              <div><dt className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" /> Location</dt><dd className="mt-1 font-medium">{incident.location}</dd></div>
              <div><dt className="flex items-center gap-1 text-muted-foreground"><Calendar className="h-4 w-4" /> Reported</dt><dd className="mt-1 font-medium">{new Date(incident.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</dd></div>
              <div><dt className="flex items-center gap-1 text-muted-foreground"><Users className="h-4 w-4" /> People affected</dt><dd className="mt-1 font-medium">{incident.peopleAffected.toLocaleString()}</dd></div>
            </dl>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold">Update status</h2>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Incident status">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  variant={incident.status === s ? "default" : "outline"}
                  aria-pressed={incident.status === s}
                  onClick={() => { setIncidentStatus(incident.id, s); refresh(); }}
                >
                  {STATUS_LABELS[s]}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Saved in this browser and reflected on the dashboard.</p>
          </div>
        </div>

        <aside className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold">Priority score</h2>
          <p className="mt-2 text-5xl font-extrabold text-primary">{score.total}<span className="text-lg font-medium text-muted-foreground">/100</span></p>
          <ul className="mt-5 space-y-3 text-sm">
            {rows.map((r) => (
              <li key={r.label}>
                <div className="flex justify-between"><span>{r.label} <span className="text-muted-foreground">({r.weight}%)</span></span><span className="font-medium">{r.value.toFixed(1)}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${(r.value / r.weight) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-muted-foreground">
            A simple weighted heuristic, not AI. Resolved incidents get 0 for time; "nearby" counts other unresolved reports in the same area.
          </p>
        </aside>
      </div>
    </section>
  );
}
