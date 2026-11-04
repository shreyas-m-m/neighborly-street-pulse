import { describe, expect, it } from "vitest";
import { computeScore, type Incident } from "@/lib/incidents";

const NOW = new Date("2026-10-29T00:00:00Z").getTime();
const base: Incident = {
  id: "A",
  title: "t",
  category: "water",
  severity: "critical",
  status: "open",
  location: "X, Ward 1",
  description: "d",
  peopleAffected: 999,
  createdAt: "2026-10-01T00:00:00Z",
  source: "demo",
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

  it("ranks critical incidents above low-severity incidents with otherwise equal inputs", () => {
    const critical = computeScore({ ...base, severity: "critical" }, [base], NOW);
    const low = computeScore({ ...base, severity: "low" }, [base], NOW);
    expect(critical.total).toBeGreaterThan(low.total);
  });
  it("does not give resolved incidents nearby-report points from resolved neighbours", () => {
    const resolved = { ...base, status: "resolved" as const };
    const resolvedNeighbours = neighbours.map((item) => ({ ...item, status: "resolved" as const }));
    expect(computeScore(resolved, [resolved, ...resolvedNeighbours], NOW).nearby).toBe(0);
  });
  it("does not award time points for future timestamps", () => {
    const score = computeScore({ ...base, createdAt: "2026-11-01T00:00:00Z" }, [base], NOW);
    expect(score.time).toBe(0);
  });
  it("clamps negative people counts and keeps the score within 0–100", () => {
    const score = computeScore({ ...base, peopleAffected: -50 }, [base], NOW);
    expect(score.people).toBe(0);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
  });
});
