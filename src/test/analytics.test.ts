import { describe, expect, it } from "vitest";
import { findDuplicateCandidates, detectHotspots } from "@/lib/analytics";
import type { Incident } from "@/lib/incidents";

const NOW = new Date("2026-10-29T12:00:00Z").getTime();
const incident = (overrides: Partial<Incident> = {}): Incident => ({
  id: "A",
  title: "Burst water main near bus stop",
  category: "water",
  severity: "high",
  status: "open",
  location: "MG Road, Ward 12",
  description: "Water is flowing from a broken main near the bus stop and flooding the road.",
  peopleAffected: 100,
  createdAt: "2026-10-28T10:00:00Z",
  source: "demo",
  ...overrides,
});

describe("duplicate candidate detection", () => {
  it("flags similar reports in the same category and ward within seven days", () => {
    const candidates = findDuplicateCandidates([
      incident(),
      incident({ id: "B", title: "Burst water main near bus stop", location: "mg ROAD, ward 12", createdAt: "2026-10-29T08:00:00Z" }),
    ], { now: NOW });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]!.score).toBeGreaterThanOrEqual(70);
    expect(candidates[0]!.reasons).toHaveLength(4);
  });

  it("does not flag different categories, different wards, or old reports", () => {
    const original = incident();
    const results = findDuplicateCandidates([
      original,
      incident({ id: "B", category: "roads" }),
      incident({ id: "C", location: "Other Road, Ward 3" }),
      incident({ id: "D", createdAt: "2026-10-01T10:00:00Z" }),
    ], { now: NOW });
    expect(results).toHaveLength(0);
  });

  it("ignores invalid and future timestamps and never mutates the reports", () => {
    const reports = [
      incident(),
      incident({ id: "B", createdAt: "not-a-date" }),
      incident({ id: "C", createdAt: "2026-10-30T10:00:00Z" }),
    ];
    const before = JSON.stringify(reports);
    expect(findDuplicateCandidates(reports, { now: NOW })).toHaveLength(0);
    expect(JSON.stringify(reports)).toBe(before);
  });
});

describe("hotspot detection", () => {
  it("flags a ward/category concentration and explains the result", () => {
    const reports = [
      incident({ id: "A", location: "MG Road, Ward 12" }),
      incident({ id: "B", location: "School Road, Ward 12" }),
      incident({ id: "C", location: "Hill Road, Ward 12" }),
      incident({ id: "D", location: "Depot Road, Ward 2" }),
    ];
    const ward12 = detectHotspots(reports).find((item) => item.ward === "Ward 12");
    expect(ward12?.flagged).toBe(true);
    expect(ward12?.activeReports).toBe(3);
    expect(ward12?.explanation).toContain("above the represented-ward average");
  });

  it("counts resolved reports in totals but excludes them from active concentration", () => {
    const reports = [
      incident({ id: "A", location: "A Street, Ward 1", status: "resolved" }),
      incident({ id: "B", location: "B Street, Ward 1", status: "resolved" }),
      incident({ id: "C", location: "C Street, Ward 1", status: "resolved" }),
    ];
    const ward = detectHotspots(reports).find((item) => item.ward === "Ward 1");
    expect(ward?.totalReports).toBe(3);
    expect(ward?.resolvedReports).toBe(3);
    expect(ward?.activeReports).toBe(0);
    expect(ward?.flagged).toBe(false);
  });
});
