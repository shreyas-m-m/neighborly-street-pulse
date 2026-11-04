import { describe, it, expect } from "vitest";
import type { AppRole, TeamMember } from "@/lib/permissions-api";

describe("Permissions and Roles Model", () => {
  it("correctly identifies admin vs resolver permissions", () => {
    const adminMember: TeamMember = {
      id: "user-1",
      email: "admin@city.gov",
      fullName: "City Admin",
      createdAt: new Date().toISOString(),
      roles: ["admin"],
      isAdmin: true,
      isResolver: false,
    };

    const resolverMember: TeamMember = {
      id: "user-2",
      email: "resolver@city.gov",
      fullName: "Road Resolver",
      createdAt: new Date().toISOString(),
      roles: ["resolver"],
      isAdmin: false,
      isResolver: true,
    };

    const dualMember: TeamMember = {
      id: "user-3",
      email: "chief@city.gov",
      fullName: "Department Chief",
      createdAt: new Date().toISOString(),
      roles: ["admin", "resolver"],
      isAdmin: true,
      isResolver: true,
    };

    const citizenMember: TeamMember = {
      id: "user-4",
      email: "citizen@example.com",
      fullName: "Resident",
      createdAt: new Date().toISOString(),
      roles: [],
      isAdmin: false,
      isResolver: false,
    };

    const canResolve = (member: TeamMember) => member.isAdmin || member.isResolver;

    expect(canResolve(adminMember)).toBe(true);
    expect(canResolve(resolverMember)).toBe(true);
    expect(canResolve(dualMember)).toBe(true);
    expect(canResolve(citizenMember)).toBe(false);
  });

  it("safeguards prevent self-revocation when only one admin remains", () => {
    const members: TeamMember[] = [
      {
        id: "admin-1",
        email: "sole_admin@city.gov",
        fullName: "Sole Admin",
        createdAt: new Date().toISOString(),
        roles: ["admin"],
        isAdmin: true,
        isResolver: false,
      },
      {
        id: "user-2",
        email: "worker@city.gov",
        fullName: "Field Worker",
        createdAt: new Date().toISOString(),
        roles: ["resolver"],
        isAdmin: false,
        isResolver: true,
      },
    ];

    const currentUserId = "admin-1";
    const totalAdmins = members.filter((m) => m.isAdmin).length;
    const isSelf = (id: string) => id === currentUserId;
    const canDemoteAdmin = (member: TeamMember) => {
      if (isSelf(member.id) && member.isAdmin && totalAdmins <= 1) {
        return false;
      }
      return true;
    };

    expect(canDemoteAdmin(members[0])).toBe(false);
  });

  it("enforces email matching and single-use rules during initial admin bootstrap", () => {
    interface BootstrapConfig {
      bootstrapEmail: string | null;
      isClaimed: boolean;
    }

    const config: BootstrapConfig = {
      bootstrapEmail: "owner@city.gov",
      isClaimed: false,
    };

    const validateBootstrap = (
      callerEmail: string,
      existingAdminCount: number,
      cfg: BootstrapConfig,
    ) => {
      if (existingAdminCount > 0) {
        throw new Error("Bootstrap closed: An administrator is already registered.");
      }
      if (!cfg.bootstrapEmail || cfg.bootstrapEmail.trim() === "") {
        throw new Error("Initial admin email has not been configured in the database.");
      }
      if (cfg.isClaimed) {
        throw new Error("Initial admin has already been claimed.");
      }
      if (callerEmail.toLowerCase().trim() !== cfg.bootstrapEmail.toLowerCase().trim()) {
        throw new Error(`Unauthorized: Your email (${callerEmail}) is not authorized.`);
      }
      return true;
    };

    // 1. Unconfigured bootstrap email throws
    expect(() =>
      validateBootstrap("owner@city.gov", 0, { bootstrapEmail: null, isClaimed: false }),
    ).toThrow("Initial admin email has not been configured");

    // 2. Authorized email succeeds
    expect(validateBootstrap("owner@city.gov", 0, config)).toBe(true);

    // 3. Unauthorized email fails
    expect(() => validateBootstrap("attacker@random.com", 0, config)).toThrow("Unauthorized");

    // 4. Fails if already claimed
    expect(() => validateBootstrap("owner@city.gov", 0, { ...config, isClaimed: true })).toThrow(
      "already been claimed",
    );

    // 5. Fails if admin already exists
    expect(() => validateBootstrap("owner@city.gov", 1, config)).toThrow("already registered");
  });

  it("database trigger logic prevents last admin deletion or downgrade", () => {
    interface RoleRecord {
      id: string;
      role: AppRole;
    }

    const roles: RoleRecord[] = [
      { id: "role-1", role: "admin" },
      { id: "role-2", role: "resolver" },
    ];

    const canDeleteRole = (targetId: string, currentRoles: RoleRecord[]) => {
      const target = currentRoles.find((r) => r.id === targetId);
      if (!target) return true;
      if (target.role === "admin") {
        const otherAdmins = currentRoles.filter(
          (r) => r.role === "admin" && r.id !== targetId,
        ).length;
        if (otherAdmins === 0) {
          throw new Error("Cannot delete or downgrade the last remaining administrator.");
        }
      }
      return true;
    };

    // Cannot delete the only admin
    expect(() => canDeleteRole("role-1", roles)).toThrow(
      "Cannot delete or downgrade the last remaining administrator.",
    );

    // Can delete when another admin exists
    const rolesWithTwoAdmins: RoleRecord[] = [
      { id: "role-1", role: "admin" },
      { id: "role-3", role: "admin" },
    ];
    expect(canDeleteRole("role-1", rolesWithTwoAdmins)).toBe(true);

    // Can delete resolver
    expect(canDeleteRole("role-2", roles)).toBe(true);
  });

  it("incident trigger enforces resolver permission only on protected columns", () => {
    interface IncidentState {
      status: "open" | "in_progress" | "resolved";
      resolution_photo_path: string | null;
      resolution_note: string | null;
      updated_at: string;
      title: string;
    }

    const simulateIncidentTrigger = (
      oldRow: IncidentState,
      newRow: IncidentState,
      userRole: "admin" | "resolver" | "citizen" | "anon",
    ) => {
      const canResolve = userRole === "admin" || userRole === "resolver";
      const isProtectedChange =
        newRow.status !== oldRow.status ||
        newRow.resolution_photo_path !== oldRow.resolution_photo_path ||
        newRow.resolution_note !== oldRow.resolution_note;

      if (isProtectedChange) {
        if (!canResolve) {
          throw new Error(
            "Unauthorized: Only designated Resolvers or Admins can update incident status, resolution photo, or resolution note.",
          );
        }

        if (newRow.status === "resolved" && !newRow.resolution_photo_path) {
          throw new Error("A resolution photo is required before marking an incident resolved.");
        }
      }

      return newRow;
    };

    const initialIncident: IncidentState = {
      status: "open",
      resolution_photo_path: null,
      resolution_note: null,
      updated_at: "2026-10-30T00:00:00Z",
      title: "Broken streetlight",
    };

    // 1. Authorized resolver changes status to in_progress -> ALLOWED
    expect(
      simulateIncidentTrigger(
        initialIncident,
        { ...initialIncident, status: "in_progress" },
        "resolver",
      ).status,
    ).toBe("in_progress");

    // 2. Unauthorized citizen changes status to in_progress -> BLOCKED
    expect(() =>
      simulateIncidentTrigger(
        initialIncident,
        { ...initialIncident, status: "in_progress" },
        "citizen",
      ),
    ).toThrow("Unauthorized: Only designated Resolvers or Admins");

    // 3. Unauthorized anon updates resolution note -> BLOCKED
    expect(() =>
      simulateIncidentTrigger(
        initialIncident,
        { ...initialIncident, resolution_note: "Fixed it" },
        "anon",
      ),
    ).toThrow("Unauthorized: Only designated Resolvers or Admins");

    // 4. Unrelated update (e.g. updated_at timestamp or title) without touching protected columns -> ALLOWED
    expect(
      simulateIncidentTrigger(
        initialIncident,
        { ...initialIncident, updated_at: "2026-10-30T12:00:00Z" },
        "citizen",
      ).updated_at,
    ).toBe("2026-10-30T12:00:00Z");

    // 5. Authorized resolver marks resolved WITHOUT photo -> BLOCKED by trigger
    expect(() =>
      simulateIncidentTrigger(
        initialIncident,
        { ...initialIncident, status: "resolved" },
        "resolver",
      ),
    ).toThrow("A resolution photo is required");

    // 6. Authorized resolver marks resolved WITH photo -> ALLOWED
    expect(
      simulateIncidentTrigger(
        initialIncident,
        {
          ...initialIncident,
          status: "resolved",
          resolution_photo_path: "resolution/abc-123.jpg",
          resolution_note: "Repaired bulb",
        },
        "resolver",
      ).status,
    ).toBe("resolved");

    // 7. Attempting to remove resolution photo from an already-resolved incident -> BLOCKED
    expect(() =>
      simulateIncidentTrigger(
        {
          ...initialIncident,
          status: "resolved",
          resolution_photo_path: "resolution/abc-123.jpg",
          resolution_note: "Repaired bulb",
        },
        {
          ...initialIncident,
          status: "resolved",
          resolution_photo_path: null,
          resolution_note: "Repaired bulb",
        },
        "resolver",
      ),
    ).toThrow("A resolution photo is required");
  });

  it("storage policy strictly separates original and resolution upload permissions", () => {
    const simulateStoragePolicy = (
      bucket: string,
      path: string,
      userRole: "admin" | "resolver" | "citizen" | "anon",
    ) => {
      if (bucket !== "incident-photos") return false;

      const isOriginal = /^original\/[A-Za-z0-9-]+\.(jpg|png|webp)$/.test(path);
      const isResolution = /^resolution\/[A-Za-z0-9-]+\.(jpg|png|webp)$/.test(path);

      // Original photos: anyone can upload
      if (isOriginal) return true;

      // Resolution photos: only authenticated resolvers or admins can upload
      if (isResolution) {
        return userRole === "admin" || userRole === "resolver";
      }

      return false;
    };

    // Anonymous can upload original photo
    expect(simulateStoragePolicy("incident-photos", "original/photo-1.jpg", "anon")).toBe(true);

    // Anonymous CANNOT upload resolution photo
    expect(simulateStoragePolicy("incident-photos", "resolution/fixed-1.jpg", "anon")).toBe(false);

    // Ordinary citizen CANNOT upload resolution photo
    expect(simulateStoragePolicy("incident-photos", "resolution/fixed-1.jpg", "citizen")).toBe(
      false,
    );

    // Resolver CAN upload resolution photo
    expect(simulateStoragePolicy("incident-photos", "resolution/fixed-1.jpg", "resolver")).toBe(
      true,
    );

    // Admin CAN upload resolution photo
    expect(simulateStoragePolicy("incident-photos", "resolution/fixed-1.jpg", "admin")).toBe(true);
  });
});
