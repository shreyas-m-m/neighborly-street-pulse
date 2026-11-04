import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  Shield,
  KeyRound,
  User,
  Mail,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Team Sign In — DataPulse" },
      { name: "description", content: "Sign in to access admin and incident resolution features." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, isAdmin, isResolver, hasAnyAdmin, signIn, signUp, signOut, claimInitialAdmin } =
    useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        await signIn(email, password);
        navigate({ to: "/dashboard" });
      } else {
        await signUp(email, password, fullName);
        setSuccessMsg("Account created successfully! You can now sign in.");
        setMode("signin");
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to process authentication request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimAdmin = async () => {
    setErrorMsg(null);
    setIsClaiming(true);
    try {
      const success = await claimInitialAdmin();
      if (success) {
        setSuccessMsg("Congratulations! You are now an Admin.");
        navigate({ to: "/admin" });
      } else {
        setErrorMsg("Unable to claim admin role. An admin may already be registered.");
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to claim initial admin.");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            {user ? "Your Account" : mode === "signin" ? "Team Sign In" : "Register Team Member"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {user
              ? "Manage your session and access level."
              : mode === "signin"
                ? "Sign in to resolve incidents and manage permissions."
                : "Create an account to join the response team."}
          </p>
        </div>

        {/* First time setup banner if no admin exists */}
        {!hasAnyAdmin && (
          <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
            <div className="flex gap-2.5">
              <KeyRound className="h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="font-semibold">Initial Setup Required</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No administrators are currently registered. Register an account and claim the
                  initial Admin role.
                </p>
              </div>
            </div>
          </div>
        )}

        {user ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs font-medium text-muted-foreground">Signed in as:</p>
              <p className="mt-1 font-semibold">{user.email}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {isAdmin && (
                  <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                    Admin
                  </span>
                )}
                {isResolver && (
                  <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                    Resolver
                  </span>
                )}
                {!isAdmin && !isResolver && (
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Viewer / Citizen
                  </span>
                )}
              </div>
            </div>

            {!hasAnyAdmin && !isAdmin && (
              <Button
                variant="default"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleClaimAdmin}
                disabled={isClaiming}
              >
                {isClaiming ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                Claim Initial Admin Privileges
              </Button>
            )}

            {isAdmin && (
              <Button asChild className="w-full">
                <Link to="/admin">Go to Admin Permissions</Link>
              </Button>
            )}

            <Button variant="outline" className="w-full" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-6 flex rounded-lg border bg-muted/30 p-1 text-xs">
              <button
                type="button"
                className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
                  mode === "signin"
                    ? "bg-background shadow-xs text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setMode("signin");
                  setErrorMsg(null);
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
                  mode === "signup"
                    ? "bg-background shadow-xs text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setMode("signup");
                  setErrorMsg(null);
                }}
              >
                Create Account
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {mode === "signup" && (
                <div>
                  <Label htmlFor="full-name">Full Name</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full-name"
                      type="text"
                      placeholder="Jane Doe"
                      className="pl-9"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="email">Email address</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="resolver@city.gov"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1.5">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {mode === "signin" ? "Sign In" : "Register"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
