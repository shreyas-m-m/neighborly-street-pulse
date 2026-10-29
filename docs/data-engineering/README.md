# DataPulse — Data Engineering Handoff

Repository: `shreyas-m-m/neighborly-street-pulse`  
Review basis: `main` branch migrations and incident-related TypeScript source. This documents the repository-defined schema; it is not independent verification of the live Supabase project's current state.

## A. Existing schema summary

The reviewed migrations define one application table, `public.incidents`. `drizzle/schema.ts` is intentionally blank, so the SQL migrations are the current useful schema reference.

| Column | PostgreSQL type | Required | Default / constraint |
|---|---|---|---|
| `id` | `text` | Yes, primary key | Generated `INC-XXXXXXXX`-style ID |
| `title` | `text` | Yes | Trimmed length 5–80 |
| `description` | `text` | Yes | Trimmed length 10–1000 |
| `category` | `text` | Yes | `garbage`, `roads`, `water`, `lights` |
| `location` | `text` | Yes | Trimmed length 3–150 |
| `severity` | `text` | Yes | `low`, `medium`, `high`, `critical` |
| `people_affected` | `integer` | Yes | 1–1,000,000 |
| `status` | `text` | Yes | Default `open`; `open`, `in_progress`, `resolved` |
| `created_at` | `timestamptz` | Yes | `now()` |
| `updated_at` | `timestamptz` | Yes | `now()`; updated by trigger |

No foreign-key relationships or additional application tables appear in the reviewed migration. An index exists on `created_at DESC`.

### Existing code behavior

- `src/lib/incidents-api.ts` reads/writes `incidents` through the public browser Supabase client.
- The report form sends title, description, category, location, severity, and people affected; the database supplies ID, status, and timestamps.
- `src/lib/incidents.ts` defines categories/status/severity and a transparent 0–100 heuristic: severity 40%, people affected 25%, unresolved age 20%, and other unresolved reports in the same area 15%.
- `areaOf()` currently groups by the last comma-separated location part, e.g. `Ward 12`.
- `src/data/demo.ts` contains ten in-code sample incidents with `source: "demo"`; database rows are mapped to `source: "shared"`. The hook merges them for display.
- Migrations enable RLS and grant anon/authenticated read access, content-column insert access, and status-column update grants. The update policy has broad row predicates, so Member 1 should verify the effective live grants/policies before relying on status-only restriction.

## B. Suggested improvements (proposal only)

1. **Duplicate detection:** No coordinates, normalized location key, fingerprint, or `duplicate_of` field exists. First pass: compare normalized category/location and title/description similarity within a time window; present candidates for human review, never auto-delete. Longer-term candidates (approval required): `latitude`, `longitude`, `location_normalized`, `duplicate_fingerprint`, `duplicate_of`.
2. **Hotspots:** Ward grouping works only with consistent location formatting. Standardize location values; consider coordinates and a spatial index only after team approval. Show the count and time window with each hotspot.
3. **Priority:** Existing heuristic is a useful baseline, not AI. Add tests and consider safety impact or verified urgency only when those signals are captured consistently.
4. **Synthetic separation:** Keep fixtures in code or a local file. This CSV uses `SYN-` IDs for clear labelling; no `is_synthetic` field exists in the current schema. Do not insert into shared Supabase without Member 1's explicit approval and a safe demo/rollback plan.
5. **Schema tooling:** `drizzle/schema.ts` is blank while SQL migrations define the table. Reconcile the schema workflow in a separate reviewed change; do not auto-generate/apply a migration as part of this task.

## C. Synthetic dataset

See [synthetic-incidents.csv](./synthetic-incidents.csv): 24 fictional records, six per category. It uses the existing table's columns and valid values. Repeated ward locations exercise current hotspot grouping. It includes `id`, `status`, and timestamps for offline fixtures/analytics; browser insert grants intentionally do not permit setting those fields. This file is not an instruction to write data to Supabase.

## D. Integration instructions

### Member 1 — website / database
1. Keep the current Supabase project/table; do not create another database.
2. Compare the live schema, constraints, grants, and RLS policies against the migration summary using read-only inspection.
3. Keep real report submissions on the current form/API flow; let the database assign ID/status/timestamps.
4. For demo mode, read the CSV offline or map it into the existing `Incident[]` shape with `source: "demo"`. Prefer extending `src/data/demo.ts` over inserting fixtures into shared Supabase.
5. No schema change until the team agrees on a migration and rollback plan.

### Member 3 — analytics
1. Load CSV into a local script/notebook or fixture reader, not the shared database.
2. Map `people_affected` → `peopleAffected` and `created_at` → `createdAt`.
3. Use `areaOf` and `computeScore` for baseline comparisons; summarize hotspot counts by ward/category.
4. For duplicate experiments, combine text similarity, category, location, and time window; output candidates for review, not auto-merges.
5. Label charts/screenshots as synthetic and do not present sample counts as real reports.

## Safety notes

- This branch adds documentation and a CSV only; no website code or production schema was modified and no records were inserted into Supabase.
- The repository tracks a root `.env` file and `.gitignore` does not list `.env`. Its contents were deliberately not opened or reproduced. The repository owner should privately inspect it; if any real credential is present, rotate/revoke it and remove it from tracking/history as appropriate. See [GitHub's leaked-secret remediation guidance](https://docs.github.com/en/code-security/tutorials/remediate-leaked-secrets/remediating-a-leaked-secret).
