import { Link } from "@tanstack/react-router";
import { Activity, Menu, X, Shield, LogIn, LogOut, User } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

// Navigation links shown in the header.
const BASE_NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/report", label: "Report an Issue" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, isResolver, signOut } = useAuth();

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
            {BASE_NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: true }}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-primary"
              >
                {l.label}
              </Link>
            ))}

            {isAdmin && (
              <Link
                to="/admin"
                activeOptions={{ exact: true }}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-foreground data-[status=active]:bg-purple-500/15 data-[status=active]:text-purple-700 dark:data-[status=active]:text-purple-300"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <User className="h-3.5 w-3.5" />
                  <span className="max-w-[120px] truncate">{user.email}</span>
                  {isAdmin ? (
                    <Badge className="bg-purple-600 px-1.5 py-0 text-[10px]">Admin</Badge>
                  ) : isResolver ? (
                    <Badge className="bg-blue-600 px-1.5 py-0 text-[10px]">Resolver</Badge>
                  ) : null}
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="text-xs text-muted-foreground hover:text-destructive"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                <Link to="/login">
                  <LogIn className="h-3.5 w-3.5" />
                  Team Sign In
                </Link>
              </Button>
            )}
          </div>

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
            {BASE_NAV_LINKS.map((l) => (
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

            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                activeOptions={{ exact: true }}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-purple-600 data-[status=active]:bg-secondary"
              >
                <Shield className="h-4 w-4" />
                Admin Permissions
              </Link>
            )}

            <div className="mt-3 border-t pt-3 pb-2">
              {user ? (
                <div className="flex items-center justify-between px-2">
                  <div className="text-xs">
                    <p className="font-medium text-foreground">{user.email}</p>
                    <p className="text-muted-foreground">
                      {isAdmin
                        ? "Administrator"
                        : isResolver
                          ? "Authorized Resolver"
                          : "Citizen / Viewer"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      signOut();
                      setOpen(false);
                    }}
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button asChild size="sm" className="w-full" onClick={() => setOpen(false)}>
                  <Link to="/login">Team Sign In</Link>
                </Button>
              )}
            </div>
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
