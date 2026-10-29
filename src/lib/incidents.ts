// Shared incident model, localStorage helpers and the priority-score heuristic.
// Everything here is plain TypeScript — no backend, no AI.

export type CategoryId = "garbage" | "roads" | "water" | "lights";
export type Severity = "low" | "medium" | "high" | "critical";
export type Status = "open" | "in_progress" | "resolved";

export interface Incident {
  id: string;
  title: string;
  category: CategoryId;
  severity: Severity;
  status: Status;
  location: string;
  description: string;
  peopleAffected: number;
  createdAt: string; // ISO date string
  source: "demo" | "local";
}

export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
export const STATUSES: Status[] = ["open", "in_progress", "resolved"];
export const STATUS_LABELS: Record<Status, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

/* ---------------- localStorage ---------------- */

const REPORTS_KEY = "datapulse.reports";
const STATUS_KEY = "datapulse.statusOverrides";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadLocalReports(): Incident[] {
  const list = readJson<Incident[]>(REPORTS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveLocalReport(incident: Incident) {
  const list = loadLocalReports();
  window.localStorage.setItem(REPORTS_KEY, JSON.stringify([incident, ...list]));
}

export function loadStatusOverrides(): Record<string, Status> {
  return readJson<Record<string, Status>>(STATUS_KEY, {});
}

export function setIncidentStatus(id: string, status: Status) {
  const overrides = loadStatusOverrides();
  overrides[id] = status;
  window.localStorage.setItem(STATUS_KEY, JSON.stringify(overrides));
}

/** Seed data + local reports, with any saved status changes applied. */
export function mergeIncidents(seed: Incident[], local: Incident[], overrides: Record<string, Status>): Incident[] {
  return [...local, ...seed].map((i): Incident => { const s = overrides[i.id]; return s ? { ...i, status: s } : i; });
}

export function generateIncidentId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INC-${stamp}${rand}`;
}

/* ---------------- Hotspots ---------------- */

/** Area key used for grouping: the part after the last comma ("Ward 12"), else the whole text. */
export function areaOf(location: string): string {
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  return (parts.at(-1) ?? location.trim()) || "Unknown";
}

/* ---------------- Priority score (heuristic) ---------------- */

const SEVERITY_FACTOR: Record<Severity, number> = { low: 0.25, medium: 0.5, high: 0.75, critical: 1 };

export interface ScoreBreakdown {
  severity: number;
  people: number;
  time: number;
  nearby: number;
  total: number;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/**
 * Priority score 0–100. A transparent HEURISTIC (not AI):
 *  - Severity        40%  (low 0.25 → critical 1.0)
 *  - People affected 25%  (log scale, 1000+ people = full)
 *  - Time unresolved 20%  (14+ days open = full, resolved = 0)
 *  - Nearby reports  15%  (other unresolved reports in the same area, 4+ = full)
 */
export function computeScore(incident: Incident, all: Incident[], now: number): ScoreBreakdown {
  const severity = SEVERITY_FACTOR[incident.severity] ?? 0;
  const people = clamp01(Math.log10(Math.max(0, incident.peopleAffected || 0) + 1) / 3);
  const created = new Date(incident.createdAt).getTime();
  const days = Number.isFinite(created) ? (now - created) / 86_400_000 : 0;
  const time = incident.status === "resolved" ? 0 : clamp01(days / 14);
  const area = areaOf(incident.location);
  const neighbours = all.filter((o) => o.id !== incident.id && o.status !== "resolved" && areaOf(o.location) === area).length;
  const nearby = clamp01(neighbours / 4);

  const parts = {
    severity: severity * 40,
    people: people * 25,
    time: time * 20,
    nearby: nearby * 15,
  };
  const total = Math.round(parts.severity + parts.people + parts.time + parts.nearby);
  return { ...parts, total };
}
