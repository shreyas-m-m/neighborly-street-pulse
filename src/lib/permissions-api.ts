import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "resolver";

export interface TeamMember {
  id: string;
  email: string | null;
  fullName: string | null;
  createdAt: string;
  roles: AppRole[];
  isAdmin: boolean;
  isResolver: boolean;
}

/**
 * Fetches all registered profiles and attaches their respective roles.
 * Requires admin privileges to view all roles or will return self-roles.
 */
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const [profilesRes, rolesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  if (profilesRes.error) {
    throw new Error(`Failed to load team profiles: ${profilesRes.error.message}`);
  }

  const roleMap = new Map<string, Set<AppRole>>();
  if (rolesRes.data) {
    for (const r of rolesRes.data) {
      if (!roleMap.has(r.user_id)) {
        roleMap.set(r.user_id, new Set());
      }
      roleMap.get(r.user_id)!.add(r.role as AppRole);
    }
  }

  return (profilesRes.data ?? []).map((p) => {
    const rolesSet = roleMap.get(p.id) ?? new Set<AppRole>();
    const roles = Array.from(rolesSet);
    return {
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      createdAt: p.created_at,
      roles,
      isAdmin: rolesSet.has("admin"),
      isResolver: rolesSet.has("resolver"),
    };
  });
}

/**
 * Grants or revokes a specific role ('admin' | 'resolver') for a user by user ID.
 * Enforced in the database by RLS: only admins can mutate user_roles.
 */
export async function setRolePermission(
  userId: string,
  role: AppRole,
  shouldHaveRole: boolean,
): Promise<void> {
  if (shouldHaveRole) {
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      role,
    });
    // Ignore duplicate key error if already granted
    if (error && !error.message.includes("duplicate") && !error.message.includes("unique")) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);
    if (error) {
      throw new Error(error.message);
    }
  }
}

/**
 * Grants a role to a team member by entering their email address.
 * Looks up their profile in the database and assigns the role.
 * Enforced in the database by RLS: only admins can mutate user_roles.
 */
export async function grantRoleByEmail(
  email: string,
  role: AppRole,
): Promise<{ memberName: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .ilike("email", cleanEmail)
    .maybeSingle();

  if (profileErr) {
    throw new Error(`Profile lookup error: ${profileErr.message}`);
  }

  if (!profile) {
    throw new Error(
      `No registered account found with email "${cleanEmail}". Team members must register on the Sign In page first.`,
    );
  }

  await setRolePermission(profile.id, role, true);
  return { memberName: profile.full_name || profile.email || cleanEmail };
}

/**
 * Bootstraps the current user as the first admin if authorized by the system administrator.
 */
export async function bootstrapFirstAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_initial_admin");
  if (error) throw new Error(error.message);
  return !!data;
}

/**
 * Checks if there is currently any registered admin.
 */
export async function checkHasAnyAdmin(): Promise<boolean> {
  const { count, error } = await supabase
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) return true; // Fail safe
  return (count ?? 0) > 0;
}
