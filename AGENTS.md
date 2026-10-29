<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Incident shape and priority-score heuristic live in src/lib/incidents.ts; database reads/writes live in src/lib/incidents-api.ts; pages read via useIncidents (TanStack Query) so all screens share one source. Demo seed incidents stay in code, never in the database, so they remain distinguishable from real reports.
- The incidents table is a public no-login demo: anon may read, insert content columns only, and update the status column only (column-level GRANTs enforce this).
