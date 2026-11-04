import { areaOf, type Incident, type CategoryId } from "@/lib/incidents";

/**
 * First-pass, explainable duplicate candidate detector.
 * It returns suggestions only: it never merges, edits, or deletes reports.
 */
export interface DuplicateCandidate {
  firstId: string;
  secondId: string;
  score: number;
  reasons: string[];
}

export interface DuplicateOptions {
  now?: number;
  windowDays?: number;
  threshold?: number;
}

const DAY_MS = 86_400_000;
const DEFAULT_DUPLICATE_WINDOW_DAYS = 7;
const DEFAULT_DUPLICATE_THRESHOLD = 70;

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizedArea(location: string): string {
  return normalize(areaOf(location));
}

function tokens(value: string): Set<string> {
  return new Set(normalize(value).split(" ").filter((word) => word.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) if (b.has(word)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
}

function textSimilarity(a: Incident, b: Incident): number {
  const title = jaccard(tokens(a.title), tokens(b.title));
  const description = jaccard(tokens(a.description), tokens(b.description));
  // Titles are compact and useful; descriptions add supporting evidence.
  return title * 0.6 + description * 0.4;
}

function validTime(value: string): number | null {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

/**
 * Weighted score out of 100:
 * category 20, normalized ward/location 25, title+description similarity 40,
 * and timestamps within the configured window 15. Candidate pairs must share
 * a category and ward and fall inside the time window.
 */
export function findDuplicateCandidates(
  incidents: Incident[],
  options: DuplicateOptions = {},
): DuplicateCandidate[] {
  const now = options.now ?? Date.now();
  const windowDays = Math.max(0, options.windowDays ?? DEFAULT_DUPLICATE_WINDOW_DAYS);
  const threshold = Math.min(100, Math.max(0, options.threshold ?? DEFAULT_DUPLICATE_THRESHOLD));
  const windowMs = windowDays * DAY_MS;
  const results: DuplicateCandidate[] = [];

  for (let i = 0; i < incidents.length; i += 1) {
    const a = incidents[i]!;
    const timeA = validTime(a.createdAt);
    if (timeA === null || timeA > now) continue;

    for (let j = i + 1; j < incidents.length; j += 1) {
      const b = incidents[j]!;
      if (a.id === b.id || a.category !== b.category) continue;
      const timeB = validTime(b.createdAt);
      if (timeB === null || timeB > now) continue;
      const ageDifference = Math.abs(timeA - timeB);
      if (ageDifference > windowMs) continue;

      const areaA = normalizedArea(a.location);
      const areaB = normalizedArea(b.location);
      if (!areaA || areaA !== areaB) continue;

      const similarity = textSimilarity(a, b);
      // Require at least some meaningful textual overlap to avoid flagging
      // every report in the same ward as a duplicate.
      if (similarity < 0.2) continue;

      const timeScore = windowMs === 0 ? (ageDifference === 0 ? 15 : 0) : 15 * (1 - ageDifference / windowMs);
      const score = Math.round(20 + 25 + similarity * 40 + timeScore);
      if (score < threshold) continue;

      const reasons = [
        "Same incident category",
        `Same normalized ward/area: ${areaOf(a.location)}`,
        `Similar report text (${Math.round(similarity * 100)}% token similarity)`,
        `Reported within ${Math.round(ageDifference / DAY_MS * 10) / 10} day(s) of each other`,
      ];
      results.push({ firstId: a.id, secondId: b.id, score: Math.min(100, score), reasons });
    }
  }

  return results.sort((a, b) => b.score - a.score || a.firstId.localeCompare(b.firstId) || a.secondId.localeCompare(b.secondId));
}

export interface Hotspot {
  ward: string;
  category: CategoryId;
  totalReports: number;
  activeReports: number;
  resolvedReports: number;
  categoryWardAverage: number;
  flagged: boolean;
  explanation: string;
}

/**
 * Group incidents by ward and category. Resolved reports remain visible in the
 * total, but only open/in-progress reports count toward active concentration.
 * A group is flagged when it has at least 3 active reports and is above the
 * mean active count for that category across wards represented in the input.
 */
export function detectHotspots(incidents: Incident[], minimumActive = 3): Hotspot[] {
  const groups = new Map<string, { ward: string; category: CategoryId; total: number; active: number; resolved: number }>();
  const wardActiveByCategory = new Map<CategoryId, Map<string, number>>();

  for (const incident of incidents) {
    const ward = areaOf(incident.location) || "Unknown";
    const key = `${incident.category}::${normalize(ward)}`;
    const group = groups.get(key) ?? { ward, category: incident.category, total: 0, active: 0, resolved: 0 };
    group.total += 1;
    if (incident.status === "resolved") group.resolved += 1;
    else group.active += 1;
    groups.set(key, group);

    const wards = wardActiveByCategory.get(incident.category) ?? new Map<string, number>();
    wards.set(normalize(ward), (wards.get(normalize(ward)) ?? 0) + (incident.status === "resolved" ? 0 : 1));
    wardActiveByCategory.set(incident.category, wards);
  }

  const results = [...groups.values()].map((group) => {
    const wardCounts = [...(wardActiveByCategory.get(group.category)?.values() ?? [])];
    const average = wardCounts.length ? wardCounts.reduce((sum, count) => sum + count, 0) / wardCounts.length : 0;
    const flagged = group.active >= Math.max(1, minimumActive) && group.active > average;
    const categoryName = group.category;
    const explanation = flagged
      ? `Flagged: ${group.active} unresolved ${categoryName} reports in ${group.ward}, above the represented-ward average of ${average.toFixed(1)}; ${group.resolved} resolved report(s) are excluded from the active count.`
      : `${group.active} unresolved ${categoryName} report(s); threshold is at least ${Math.max(1, minimumActive)} active reports and above the represented-ward average of ${average.toFixed(1)}.`;
    return {
      ward: group.ward,
      category: group.category,
      totalReports: group.total,
      activeReports: group.active,
      resolvedReports: group.resolved,
      categoryWardAverage: Math.round(average * 100) / 100,
      flagged,
      explanation,
    };
  });

  return results.sort((a, b) => Number(b.flagged) - Number(a.flagged) || b.activeReports - a.activeReports || a.ward.localeCompare(b.ward) || a.category.localeCompare(b.category));
}
