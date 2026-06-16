## Project knowledge

This repository contains a **Grafana plugin**. You must Read @./.config/AGENTS/instructions.md before doing changes.

## Quick commands

- `npm run build` — bundle plugin + dashboard into `dist/`
- `npm run server` — local Grafana + Loki via docker; `npm run seed` — push synthetic data into local Loki
- `npm run typecheck && npm run lint && CI=true npm run test:ci` — pre-commit gate; `npm run e2e` — Playwright
- Node **>=22** required (see `.nvmrc`).

## Key facts

- The real product is the dashboard JSON `src/dashboards/cowork-usage-analytics.json` — keep it datasource-parameterized, **no hardcoded users / datasources / org-specific values**.
- Plugin `id` prefix = the grafana.com org slug (`palanikus`). Do **not** change `id` or plugin type in `plugin.json`.
- Frontend-only app: single About page (`src/pages/Home.tsx`) + the bundled dashboard.

## Gotchas (apply every session)

- **Public OSS repo.** Never commit employer PII or internal infrastructure (internal IPs, internal hostnames, tokens, real work emails). Scan diffs before committing.
- Commits/pushes use the **personal** git identity (repo-local `user.email` + `core.sshCommand`). `gh` here is authed to a *different* account → use it only for public read-only API calls; it cannot publish or see draft releases.
- To release: use the `/release-plugin` skill (never hand-create a GitHub release). Validate with `/validate-plugin`.
