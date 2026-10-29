import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Inbox, ListChecks, MapPin, Search, SearchX } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { CATEGORIES } from "@/data/demo";
import { useIncidents } from "@/hooks/use-incidents";
import { SEVERITIES, STATUSES, STATUS_LABELS, areaOf, computeScore } from "@/lib/incidents";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — DataPulse" },
      { name: "description", content: "View and prioritise reported civic incidents." },
      { property: "og:title", content: "Dashboard — DataPulse" },
      { property: "og:description", content: "View and prioritise reported civic incidents." },
    ],
  }),
  component: Dashboard,
});

const SEV_COLORS = { critical: "var(--sev-critical)", high: "var(--sev-high)", medium: "var(--sev-medium)", low: "var(--sev-low)" };
const ALL = "all";

function Dashboard() {
  const { incidents, now } = useIncidents();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [severity, setSeverity] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [area, setArea] = useState(ALL);

  // Attach the score to each incident once, then sort highest first.
  const scored = useMemo(
    () => incidents.map((i) => ({ ...i, score: computeScore(i, incidents, now).total })).sort((a, b) => b.score - a.score),
    [incidents, now],
  );
  const areas = useMemo(() => [...new Set(incidents.map((i) => areaOf(i.location)))].sort(), [incidents]);

  const filtered = scored.filter((i) => {
    const q = query.trim().toLowerCase();
    return (
      (!q || `${i.title} ${i.location} ${i.id}`.toLowerCase().includes(q)) &&
      (category === ALL || i.category === category) &&
      (severity === ALL || i.severity === severity) &&
      (status === ALL || i.status === status) &&
      (area === ALL || areaOf(i.location) === area)
    );
  });

  const kpis = [
    { label: "Total reports", value: incidents.length, icon: Inbox },
    { label: "Open incidents", value: incidents.filter((i) => i.status !== "resolved").length, icon: ListChecks },
    { label: "Critical / high", value: incidents.filter((i) => i.status !== "resolved" && (i.severity === "critical" || i.severity === "high")).length, icon: AlertTriangle },
    { label: "Resolved", value: incidents.filter((i) => i.status === "resolved").length, icon: CheckCircle2 },
  ];

  const categoryData = CATEGORIES.map((c) => ({ name: c.name.split(" ").slice(-1)[0], full: c.name, count: incidents.filter((i) => i.category === c.id).length }));
  const severityData = SEVERITIES.map((s) => ({ name: s, value: incidents.filter((i) => i.severity === s).length })).filter((d) => d.value > 0);

  const hotspots = areas
    .map((a) => {
      const list = incidents.filter((i) => areaOf(i.location) === a);
      return { area: a, total: list.length, open: list.filter((i) => i.status !== "resolved").length };
    })
    .sort((x, y) => y.open - x.open || y.total - x.total)
    .slice(0, 5);
  const maxOpen = Math.max(1, ...hotspots.map((h) => h.open));

  const clear = () => { setQuery(""); setCategory(ALL); setSeverity(ALL); setStatus(ALL); setArea(ALL); };

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-primary">Incident Dashboard</h1>
            <Badge className="bg-sev-medium text-foreground hover:bg-sev-medium">DEMO DATA</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Sample incidents plus any reports saved in this browser.</p>
        </div>
        <Button asChild><Link to="/report">Report an Issue</Link></Button>
      </div>

      {/* KPIs */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">{label}<Icon className="h-4 w-4 text-accent" /></div>
            <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts + hotspots */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">By category</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={28} />
                <Tooltip labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""} />
                <Bar dataKey="count" name="Reports" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Severity distribution</h2>
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {severityData.map((d) => <Cell key={d.name} fill={SEV_COLORS[d.name]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
            {severityData.map((d) => (
              <li key={d.name} className="flex items-center gap-1 capitalize">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEV_COLORS[d.name] }} />{d.name} ({d.value})
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-accent" /> Hotspots</h2>
          <ul className="mt-4 space-y-3">
            {hotspots.map((h) => (
              <li key={h.area}>
                <button className="w-full text-left" onClick={() => setArea(h.area)} aria-label={`Filter by ${h.area}`}>
                  <div className="flex justify-between text-sm"><span className="font-medium">{h.area}</span><span className="text-muted-foreground">{h.open} open / {h.total}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${(h.open / maxOpen) * 100}%` }} /></div>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">Simple count of reports per area (text after the last comma in the location). Not live geospatial analysis.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 rounded-xl border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search title, location or ID" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search incidents" />
          </div>
          <FilterSelect label="Category" value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect label="Severity" value={severity} onChange={setSeverity} options={SEVERITIES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
          <FilterSelect label="Location" value={area} onChange={setArea} options={areas.map((a) => ({ value: a, label: a }))} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} of {incidents.length} incidents · sorted by priority score (highest first)</span>
          <button className="underline hover:text-foreground" onClick={clear}>Clear filters</button>
        </div>
      </div>

      {/* Incident list */}
      <div className="mt-4 overflow-hidden rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <SearchX className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No incidents match these filters</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={clear}>Clear filters</Button>
          </div>
        ) : (
          <ul className="divide-y">
            <li className="hidden grid-cols-12 gap-3 bg-muted px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
              <span className="col-span-1">Score</span><span className="col-span-5">Incident</span><span className="col-span-2">Category</span><span className="col-span-2">Severity</span><span className="col-span-2">Status</span>
            </li>
            {filtered.map((i) => {
              const cat = CATEGORIES.find((c) => c.id === i.category);
              return (
                <li key={i.id}>
                  <Link to="/incidents/$id" params={{ id: i.id }} className="grid grid-cols-[auto_1fr] items-center gap-3 px-4 py-3 hover:bg-secondary md:grid-cols-12">
                    <span className="col-span-1 grid h-10 w-10 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground" title="Priority score (0–100)">{i.score}</span>
                    <div className="min-w-0 md:col-span-5">
                      <p className="truncate font-medium">{i.title}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{i.location} · <span className="font-mono">{i.id}</span></p>
                    </div>
                    <span className="col-span-2 col-start-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground md:col-start-auto md:contents">
                      <span className="md:col-span-2">{cat?.name.split(" ").slice(-1)[0]}</span>
                      <span className="md:col-span-2"><SeverityBadge severity={i.severity} /></span>
                      <span className="md:col-span-2"><StatusBadge status={i.status} /></span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Priority score = severity 40% + people affected 25% + time unresolved 20% + nearby reports 15%, scaled to 0–100. A transparent heuristic, not AI.
      </p>
    </section>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={`Filter by ${label}`}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
