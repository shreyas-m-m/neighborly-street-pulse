import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Search,
  Loader2,
  AlertCircle,
  KeyRound,
  CheckCircle,
  Users,
  Mail,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import {
  fetchTeamMembers,
  setRolePermission,
  grantRoleByEmail,
  type TeamMember,
  type AppRole,
} from "@/lib/permissions-api";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Permissions — DataPulse" },
      {
        name: "description",
        content: "Manage team member roles and incident resolution permissions.",
      },
    ],
  }),
  component: AdminPage,
});

const TEAM_MEMBERS_KEY = ["team_members"] as const;

function AdminPage() {
  const { user, isAdmin, hasAnyAdmin, isLoading: authLoading, claimInitialAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [grantRole, setGrantRole] = useState<AppRole>("resolver");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const {
    data: members = [],
    isLoading: membersLoading,
    error: membersError,
    refetch,
  } = useQuery({
    queryKey: TEAM_MEMBERS_KEY,
    queryFn: fetchTeamMembers,
    enabled: !!user && isAdmin,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
      enabled,
    }: {
      userId: string;
      role: AppRole;
      enabled: boolean;
    }) => {
      setActionError(null);
      setActionSuccess(null);
      await setRolePermission(userId, role, enabled);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TEAM_MEMBERS_KEY });
      const action = variables.enabled ? "granted" : "removed";
      const roleName = variables.role === "resolver" ? "Resolver permission" : "Admin role";
      setActionSuccess(`Successfully ${action} ${roleName}.`);
    },
    onError: (err: Error) => {
      setActionError(`Database policy error: ${err.message}`);
    },
  });

  const grantByEmailMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      setActionError(null);
      setActionSuccess(null);
      return await grantRoleByEmail(email, role);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: TEAM_MEMBERS_KEY });
      setGrantEmail("");
      const roleLabel = variables.role === "resolver" ? "Resolver" : "Admin";
      setActionSuccess(`Successfully granted ${roleLabel} permission to ${data.memberName}.`);
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  const handleGrantByEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!grantEmail.trim()) return;
    grantByEmailMutation.mutate({
      email: grantEmail.trim(),
      role: grantRole,
    });
  };

  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-2 px-4 py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Checking credentials…
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <section className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Authentication Required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You must sign in with an Administrator account to view and manage team permissions.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </section>
    );
  }

  // Signed in but not an admin
  if (!isAdmin) {
    return (
      <section className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Admin Access Required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account (<span className="font-medium text-foreground">{user.email}</span>) does not
          have Administrator privileges. Only administrators can grant or remove incident resolution
          permissions.
        </p>

        {!hasAnyAdmin && (
          <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-left">
            <p className="font-semibold text-amber-800 dark:text-amber-200">First-Time Setup</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No administrator is registered yet. If your email was authorized in the database
              configuration, you can claim the initial admin role.
            </p>
            <Button
              className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
              size="sm"
              onClick={async () => {
                try {
                  setActionError(null);
                  await claimInitialAdmin();
                  refetch();
                } catch (err: unknown) {
                  const error = err as Error;
                  setActionError(error.message);
                }
              }}
            >
              <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Claim Admin Privileges
            </Button>
          </div>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </section>
    );
  }

  const filteredMembers = members.filter((m) => {
    const term = search.toLowerCase();
    return (
      (m.email && m.email.toLowerCase().includes(term)) ||
      (m.fullName && m.fullName.toLowerCase().includes(term))
    );
  });

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Admin Permissions</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage permissions for team members to resolve civic incidents and administer the
            platform.
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-1 bg-card py-1 text-xs font-medium">
          <Users className="h-3.5 w-3.5" />
          {members.length} Registered User{members.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {actionError && (
        <div
          role="alert"
          className="mt-6 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Grant Permission by Email Box */}
      <div className="mt-8 rounded-2xl border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <UserPlus className="h-5 w-5 text-primary" />
          <span>Grant Permission by Email</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter a team member's registered email address to assign them Resolver or Administrator
          permissions.
        </p>

        <form onSubmit={handleGrantByEmailSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              required
              placeholder="colleague@city.gov"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              className="pl-9"
              disabled={grantByEmailMutation.isPending}
            />
          </div>

          <div className="flex rounded-md border bg-muted/40 p-1 text-xs">
            <button
              type="button"
              className={`rounded px-3 py-1.5 font-medium transition-colors ${
                grantRole === "resolver"
                  ? "bg-background shadow-xs text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setGrantRole("resolver")}
            >
              Resolver
            </button>
            <button
              type="button"
              className={`rounded px-3 py-1.5 font-medium transition-colors ${
                grantRole === "admin"
                  ? "bg-background shadow-xs text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setGrantRole("admin")}
            >
              Admin
            </button>
          </div>

          <Button type="submit" disabled={grantByEmailMutation.isPending || !grantEmail.trim()}>
            {grantByEmailMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Grant {grantRole === "resolver" ? "Resolver" : "Admin"}
          </Button>
        </form>
      </div>

      {/* Permissions Box */}
      <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Team Permission Management</h2>
            <p className="text-xs text-muted-foreground">
              Enforced at the database level using PostgreSQL Row Level Security (RLS) policies.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Filter by email or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        </div>

        {/* Roles explanation cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
              <UserCheck className="h-4 w-4" /> Resolver Role
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Enables team members to update incident status to "In Progress" or "Resolved", submit
              resolution notes, and upload resolution proof photos.
            </p>
          </div>
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
            <div className="flex items-center gap-2 font-medium text-purple-700 dark:text-purple-300">
              <Shield className="h-4 w-4" /> Admin Role
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Full administrative privileges to grant and revoke roles for other team members and
              manage platform configurations.
            </p>
          </div>
        </div>

        {/* Members List */}
        <div className="mt-6">
          {membersLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading team members…
            </div>
          ) : membersError ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center text-sm text-destructive">
              <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
              <p className="mt-2 font-medium">Could not load team members</p>
              <p className="mt-1 text-xs text-muted-foreground">{membersError.message}</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
              {search ? (
                <>No team members found matching "{search}".</>
              ) : (
                <>
                  No other team members have registered yet. When users sign up, they will appear
                  here.
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredMembers.map((member: TeamMember) => {
                const isCurrentUser = member.id === user.id;

                return (
                  <div
                    key={member.id}
                    className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">
                          {member.fullName || member.email?.split("@")[0] || "Unknown User"}
                        </span>
                        {isCurrentUser && (
                          <Badge variant="secondary" className="text-[10px]">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {member.isAdmin ? (
                          <Badge className="bg-purple-600 text-white text-[10px]">Admin</Badge>
                        ) : null}
                        {member.isResolver ? (
                          <Badge className="bg-blue-600 text-white text-[10px]">Resolver</Badge>
                        ) : null}
                        {!member.isAdmin && !member.isResolver ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Citizen / Viewer
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    {/* Permissions Switches */}
                    <div className="flex items-center gap-6 rounded-lg border bg-muted/20 p-3 text-xs sm:p-2 sm:px-4">
                      {/* Resolver Permission Switch */}
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`resolver-${member.id}`}
                          checked={member.isResolver}
                          disabled={toggleMutation.isPending}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({
                              userId: member.id,
                              role: "resolver",
                              enabled: checked,
                            })
                          }
                        />
                        <Label
                          htmlFor={`resolver-${member.id}`}
                          className="cursor-pointer font-medium select-none"
                        >
                          Resolve Incidents
                        </Label>
                      </div>

                      <div className="h-4 w-px bg-border" />

                      {/* Admin Role Switch */}
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`admin-${member.id}`}
                          checked={member.isAdmin}
                          disabled={
                            toggleMutation.isPending ||
                            (isCurrentUser &&
                              member.isAdmin &&
                              members.filter((m) => m.isAdmin).length <= 1)
                          }
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({
                              userId: member.id,
                              role: "admin",
                              enabled: checked,
                            })
                          }
                        />
                        <Label
                          htmlFor={`admin-${member.id}`}
                          className="cursor-pointer font-medium select-none"
                        >
                          Admin
                        </Label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
