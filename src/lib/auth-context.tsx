import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/permissions-api";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  isAdmin: boolean;
  isResolver: boolean;
  canResolve: boolean;
  isLoading: boolean;
  hasAnyAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  claimInitialAdmin: () => Promise<boolean>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAnyAdmin, setHasAnyAdmin] = useState(true);

  const loadRolesForUser = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (!error && data) {
        setRoles(data.map((r) => r.role as AppRole));
      } else {
        setRoles([]);
      }
    } catch {
      setRoles([]);
    }
  }, []);

  const checkAdminCount = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("has_any_admin");
      if (!error && typeof data === "boolean") {
        setHasAnyAdmin(data);
        return;
      }
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      setHasAnyAdmin((count ?? 0) > 0);
    } catch {
      setHasAnyAdmin(true);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const {
        data: { session: currSession },
      } = await supabase.auth.getSession();
      setSession(currSession);
      setUser(currSession?.user ?? null);
      if (currSession?.user) {
        await Promise.all([loadRolesForUser(currSession.user.id), checkAdminCount()]);
      } else {
        setRoles([]);
        await checkAdminCount();
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadRolesForUser, checkAdminCount]);

  useEffect(() => {
    refreshAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await Promise.all([loadRolesForUser(newSession.user.id), checkAdminCount()]);
      } else {
        setRoles([]);
        await checkAdminCount();
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshAuth, loadRolesForUser, checkAdminCount]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split("@")[0],
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setRoles([]);
    setUser(null);
    setSession(null);
  };

  const claimInitialAdmin = async (): Promise<boolean> => {
    const { data, error } = await supabase.rpc("claim_initial_admin");
    if (error) throw error;
    if (data && user) {
      await refreshAuth();
      return true;
    }
    return false;
  };

  const isAdmin = roles.includes("admin");
  const isResolver = roles.includes("resolver");
  const canResolve = isAdmin || isResolver;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        roles,
        isAdmin,
        isResolver,
        canResolve,
        isLoading,
        hasAnyAdmin,
        signIn,
        signUp,
        signOut,
        claimInitialAdmin,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
