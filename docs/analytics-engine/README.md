# Member 3 — Analytics Engine

This is an explainable TypeScript heuristic layer for Neighborly Street Pulse. It does not call an AI service, write to Supabase, change the database schema, or alter the website by itself. The functions return analysis results for a caller to display or review.

## Files

- `src/lib/analytics.ts`: duplicate candidates and hotspot groups.
- `src/lib/incidents.ts`: existing incident model, area grouping, and priority score (preserved).
- `src/test/analytics.test.ts`: deterministic algorithm tests.
- `src/test/analytics-dataset.test.ts`: tests using the existing synthetic CSV.
- `docs/data-engineering/synthetic-incidents.csv`: 24 fictional `SYN-` records.

## 1. Duplicate candidates

`findDuplicateCandidates(incidents, options?)` returns pairs with IDs, a score from 0 to 100, and human-readable reasons. Defaults: a 7-day time window and a 70-point score threshold.

Weights:

- Same category: 20 points (required).
- Same normalized ward/area: 25 points (required).
- Title and description token similarity: up to 40 points (title Jaccard similarity weighted 60%, description weighted 40%).
- Time proximity: up to 15 points; closer timestamps receive more points.

The current first pass requires the same category, same normalized ward, valid non-future timestamps within the time window, and at least 20% text similarity. Normalization ignores case, punctuation, repeated spaces, and common accent marks. Ward matching uses the existing `areaOf` convention (the final comma-separated part of a location), so consistent location formatting matters.

**Safety:** a high score means “review these reports,” not “these are certainly duplicates.” The function does not merge, modify, or delete incidents. It does not compare GPS coordinates because the current model has none. Token overlap can miss paraphrases and can produce false positives.

## 2. Hotspots

`detectHotspots(incidents, minimumActive = 3)` groups by ward and category. Open and in-progress reports count as active; resolved reports appear in totals but do not count toward active concentration.

A group is flagged when:

1. active reports are at least the configured minimum (default 3); and
2. active reports exceed the average active count for that category across wards represented in the input.

Each result includes ward, category, total, active and resolved counts, the comparison average, a flag, and an explanation. This is a simple baseline, not a statistical or geographic risk model. Small or incomplete samples can distort averages, and location text must identify wards consistently.

## 3. Priority score (existing formula)

`computeScore` remains in `src/lib/incidents.ts` and preserves its existing 0–100 scale:

- Severity: 40% (low 0.25, medium 0.5, high 0.75, critical 1.0).
- People affected: 25%, logarithmic scale, full at about 1,000 people.
- Time unresolved: 20%, full at 14 days; resolved incidents receive zero time points.
- Other unresolved reports in the same area: 15%, full at 4 or more.

The total is rounded to an integer. It is a transparent prioritization heuristic, not a prediction of harm and not a substitute for human judgement. Invalid dates contribute zero time points; invalid/non-finite people counts are clamped safely.

## 4. Test locally

From the repository root:

```bash
npm test
npm run lint
npm run build
```

The dataset test reads the CSV locally with a small quoted-field-aware parser. The fixture is never sent to Supabase. Keep its `SYN-` IDs and clearly label screenshots/demos as synthetic.

## Limitations and future work

- No auto-merge, auto-delete, or automatic status changes.
- Same ward is a rough proxy for location; street-level coordinates are not available.
- Jaccard token overlap is intentionally lightweight and language-dependent.
- Hotspot averages depend on which wards appear in the supplied sample; wards with zero reports are not represented.
- Production integration should be a separate reviewed change. Do not change schema, insert synthetic records into shared Supabase, or expose this analysis as a live feature until Member 1 reviews the UI and team agrees on integration.
