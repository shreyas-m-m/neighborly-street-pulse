import { describe, expect, it } from "vitest";
import { computeScore, type Incident } from "@/lib/incidents";

const NOW = new Date("2026-10-29T00:00:00Z").getTime();
const base: Incident = {
  id: "A", title: "t", category: "water", severity: "critical", status: "open", location: "X, Ward 1",
  description: "d", peopleAffected: 999, createdAt: "2026-10-01T00:00:00Z", source: "demo",
};
const neighbours = [1, 2, 3, 4].map((n) => ({ ...base, id: `N${n}` }));

describe("priority score heuristic", () => {
  it("maxes at 100 for critical, 1000 people, 14+ days, 4 nearby", () => {
    expect(computeScore(base, [base, ...neighbours], NOW).total).toBe(100);
  });
  it("gives 0 time points to resolved incidents", () => {
    expect(computeScore({ ...base, status: "resolved" }, [base], NOW).time).toBe(0);
  });
  it("never returns NaN for bad dates or people counts", () => {
    const s = computeScore({ ...base, createdAt: "nope", peopleAffected: NaN }, [], NOW);
    expect(Number.isNaN(s.total)).toBe(false);
    expect(s.total).toBe(40);
  });
});
