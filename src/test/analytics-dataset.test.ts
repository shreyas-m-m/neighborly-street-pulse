import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findDuplicateCandidates, detectHotspots } from "@/lib/analytics";
import type { CategoryId, Incident, Severity, Status } from "@/lib/incidents";

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      fields.push(field);
      field = "";
    } else field += char;
  }
  fields.push(field);
  return fields;
}

function loadSyntheticCsv(): Incident[] {
  const csv = readFileSync("docs/data-engineering/synthetic-incidents.csv", "utf8").trim();
  const lines = csv.split(/\r?\n/);
  const headers = parseCsvLine(lines[0] ?? "");
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as Record<string, string>;
    const get = (k: string): string => row[k] ?? "";
    return {
      id: get("id"),
      title: get("title"),
      description: get("description"),
      category: get("category") as CategoryId,
      location: get("location"),
      severity: get("severity") as Severity,
      peopleAffected: Number(get("people_affected")),
      status: get("status") as Status,
      createdAt: get("created_at"),
      // Synthetic fixtures intentionally stay out of the production database.
      source: "demo",
    };
  });
}

describe("synthetic analytics fixture", () => {
  it("loads the 24 SYN-labelled records without inserting them into a database", () => {
    const incidents = loadSyntheticCsv();
    expect(incidents).toHaveLength(24);
    expect(incidents.every((item) => item.id.startsWith("SYN-"))).toBe(true);
    expect(new Set(incidents.map((item) => item.category)).size).toBe(4);
  });

  it("produces explainable hotspot results for the synthetic fixture", () => {
    const hotspots = detectHotspots(loadSyntheticCsv());
    expect(hotspots.length).toBeGreaterThan(0);
    expect(hotspots.every((item) => item.explanation.length > 10)).toBe(true);
  });

  it("returns only candidate pairs from the synthetic fixture", () => {
    const candidates = findDuplicateCandidates(loadSyntheticCsv(), { now: new Date("2026-10-30T00:00:00Z").getTime() });
    expect(candidates.every((candidate) => candidate.firstId.startsWith("SYN-") && candidate.secondId.startsWith("SYN-"))).toBe(true);
  });
});
