import { Link } from "@tanstack/react-router";
import { Activity, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

// Navigation links shown in the header. Add new pages here.
const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/report", label: "Report an Issue" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-primary">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-accent">
              <Activity className="h-5 w-5" />
            </span>
            DataPulse
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: true }}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-primary"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>

        {open && (
          <nav className="border-t px-4 py-2 md:hidden" aria-label="Mobile">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: true }}
                className="block rounded-md px-3 py-2 text-sm font-medium data-[status=active]:bg-secondary"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        DataPulse — Civic Incident Intelligence Engine · Hackathon prototype
      </footer>
    </div>
  );
}
