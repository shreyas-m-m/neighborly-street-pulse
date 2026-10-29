import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Camera, ListOrdered, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { CATEGORIES, DEMO_INCIDENTS } from "@/data/demo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DataPulse — Civic Incident Intelligence Engine" },
      { name: "description", content: "Report and prioritise garbage, road, water and streetlight issues in your city." },
      { property: "og:title", content: "DataPulse — Civic Incident Intelligence Engine" },
      { property: "og:description", content: "Report and prioritise civic issues in your city." },
    ],
  }),
  component: Index,
});

const STEPS = [
  { icon: Camera, title: "Report", text: "Citizens describe the issue and add a location." },
  { icon: ListOrdered, title: "Prioritise", text: "Incidents are ranked by severity and impact." },
  { icon: ShieldCheck, title: "Resolve", text: "Teams act on the most urgent issues first." },
];

function Index() {
  return (
    <>
      {/* Hero */}
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <Badge className="bg-accent text-accent-foreground hover:bg-accent">Civic Incident Intelligence</Badge>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight md:text-5xl">
              Spot it. Report it. <span className="text-accent">Fix what matters first.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg opacity-85">
              DataPulse helps citizens report everyday civic problems and helps city teams decide which ones need attention now.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/report">Report an Issue <ArrowRight /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/dashboard">View Dashboard</Link>
              </Button>
            </div>
          </div>

          {/* Demo preview card */}
          <div className="rounded-2xl bg-card p-5 text-card-foreground shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Priority queue</h2>
              <Badge variant="outline">Demo data</Badge>
            </div>
            <ul className="mt-4 divide-y">
              {DEMO_INCIDENTS.map((inc) => (
                <li key={inc.id}>
                  <Link to="/incidents/$id" params={{ id: inc.id }} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{inc.title}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {inc.location}
                      </p>
                    </div>
                    <SeverityBadge severity={inc.severity} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-bold text-primary">What you can report</h2>
        <p className="mt-2 text-muted-foreground">Four common issues that affect daily life in every neighbourhood.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map(({ id, name, description, icon: Icon }) => (
            <div key={id} className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-lg">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent/15 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-secondary">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-bold text-primary">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="rounded-xl bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-accent-foreground/60">0{i + 1}</span>
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{title}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            Severity levels:
            <SeverityBadge severity="critical" />
            <SeverityBadge severity="high" />
            <SeverityBadge severity="medium" />
            <SeverityBadge severity="low" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-primary">Seen something that needs fixing?</h2>
        <p className="mt-3 text-muted-foreground">It takes less than a minute to report.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg"><Link to="/report">Report an Issue</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/dashboard">View Dashboard</Link></Button>
        </div>
      </section>
    </>
  );
}
