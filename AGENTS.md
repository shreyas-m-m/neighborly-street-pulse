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
- Citizen incident reporting is public: anyone (anon or authenticated) may view incidents and submit new reports.
- Incident status updates and resolution are restricted to authorized team members (Admin or Resolver roles). Enforced at the database level via PostgreSQL RLS policies on public.incidents and trigger incidents_require_resolution_photo.
- Roles and team permissions live in public.user_roles and public.profiles, managed via the Admin Permissions page (/admin) and lib/permissions-api.ts.
- Incident photos live in the private incident-photos bucket under original/ (public upload when reporting) or resolution/ (restricted to authorized Resolvers and Admins); rows store only the path and pages show them via short-lived signed URLs.
