import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, Calendar, Loader2, MapPin, SearchX, Users } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { CATEGORIES } from "@/data/demo";
import { INCIDENTS_KEY, useIncidents } from "@/hooks/use-incidents";
import { getPhotoUrl, resolveIncident, updateIncidentStatus } from "@/lib/incidents-api";
import { STATUSES, STATUS_LABELS, computeScore, type Status } from "@/lib/incidents";

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
  const { incidents, isLoading, error, refetch, now } = useIncidents();
  const queryClient = useQueryClient();
  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: Status }) => updateIncidentStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY }),
  });
  const [resolving, setResolving] = useState(false);
  const [resPhoto, setResPhoto] = useState<File | null>(null);
  const [resNote, setResNote] = useState("");
  const resolveMutation = useMutation({
    mutationFn: () => {
      if (!resPhoto) throw new Error("Please add a resolution photo first.");
      return resolveIncident(id, resPhoto, resNote);
    },
    onSuccess: () => {
      setResolving(false); setResPhoto(null); setResNote("");
      return queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY });
    },
  });
  const incident = incidents.find((i) => i.id === id);

  const back = (
    <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Back to dashboard
    </Link>
  );

  if (!incident) {
    if (isLoading) return <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-12 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading incident…</div>;
    if (error) return (
      <section className="mx-auto max-w-xl px-4 py-20 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold text-primary">Couldn't load this incident</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
        <Button className="mt-6" onClick={() => refetch()}>Try again</Button>
      </section>
    );
    return (
      <section className="mx-auto max-w-xl px-4 py-20 text-center">
        <SearchX className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold text-primary">Incident not found</h1>
        <p className="mt-2 text-muted-foreground">No incident with ID <span className="font-mono">{id}</span> exists in the demo data or the shared database.</p>
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
        <Badge variant="outline">{incident.source === "demo" ? "Demo data" : "Shared report"}</Badge>
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

          {(incident.originalPhotoPath || incident.resolutionPhotoPath || incident.resolutionNote) && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="font-semibold">{incident.resolutionPhotoPath ? "Before / After" : "Photo"}</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {incident.originalPhotoPath && <StoredPhoto path={incident.originalPhotoPath} caption="Before" alt={`Before: reported issue "${incident.title}" at ${incident.location}`} />}
                {incident.resolutionPhotoPath && <StoredPhoto path={incident.resolutionPhotoPath} caption="After" alt={`After: resolution of "${incident.title}" at ${incident.location}`} />}
              </div>
              {incident.resolutionNote && <p className="mt-4 text-sm"><span className="font-medium">Resolution note:</span> <span className="whitespace-pre-line text-muted-foreground">{incident.resolutionNote}</span></p>}
            </div>
          )}

          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold">Update status</h2>
            {incident.source === "demo" ? (
              <p className="mt-2 text-sm text-muted-foreground">This is a built-in demo incident, so its status can't be changed. Submit a real report to try status updates.</p>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Incident status">
                  {STATUSES.map((s) => (
                    <Button
                      key={s}
                      variant={incident.status === s || (s === "resolved" && resolving) ? "default" : "outline"}
                      aria-pressed={incident.status === s}
                      disabled={statusMutation.isPending || resolveMutation.isPending}
                      onClick={() => {
                        if (s === "resolved" && incident.status !== "resolved") { setResolving(true); return; }
                        setResolving(false);
                        statusMutation.mutate({ status: s });
                      }}
                    >
                      {statusMutation.isPending && statusMutation.variables?.status === s && <Loader2 className="animate-spin" />}
                      {STATUS_LABELS[s]}
                    </Button>
                  ))}
                </div>
                {resolving && (
                  <form
                    className="mt-4 space-y-4 rounded-lg border p-4"
                    onSubmit={(e) => { e.preventDefault(); resolveMutation.mutate(); }}
                  >
                    <PhotoPicker label="Resolution photo *" hint="Required. Show the fixed issue. JPEG, PNG or WebP, up to 5 MB." file={resPhoto} onChange={setResPhoto} disabled={resolveMutation.isPending} />
                    <div>
                      <Label htmlFor="resolution-note">Resolution note (optional)</Label>
                      <Textarea id="resolution-note" className="mt-1.5" rows={3} maxLength={500} value={resNote} onChange={(e) => setResNote(e.target.value)} disabled={resolveMutation.isPending} />
                    </div>
                    {resolveMutation.isError && <p role="alert" className="text-sm text-destructive">Not marked resolved: {resolveMutation.error.message}</p>}
                    <div className="flex gap-2">
                      <Button type="submit" disabled={!resPhoto || resolveMutation.isPending}>
                        {resolveMutation.isPending && <Loader2 className="animate-spin" />} Upload photo &amp; mark resolved
                      </Button>
                      <Button type="button" variant="ghost" disabled={resolveMutation.isPending} onClick={() => { setResolving(false); resolveMutation.reset(); }}>Cancel</Button>
                    </div>
                  </form>
                )}
                {statusMutation.isError ? (
                  <p role="alert" className="mt-2 text-sm text-destructive">Status not saved: {statusMutation.error.message}</p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Saved to the shared database and shown on every device's dashboard. No sign-in: anyone using the demo can change status.</p>
                )}
              </>
            )}
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

function StoredPhoto({ path, caption, alt }: { path: string; caption: string; alt: string }) {
  const { data, isPending, error } = useQuery({ queryKey: ["photo", path], queryFn: () => getPhotoUrl(path), staleTime: 50 * 60_000 });
  return (
    <figure>
      <figcaption className="mb-1.5 text-sm font-medium">{caption}</figcaption>
      {data ? (
        <img src={data} alt={alt} loading="lazy" className="aspect-[4/3] w-full rounded-lg border object-cover" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Photo unavailable${error ? `: ${error.message}` : ""}`}
        </div>
      )}
    </figure>
  );
}
