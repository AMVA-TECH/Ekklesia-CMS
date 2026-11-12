# 08 — Delivery and Observability

**Status:** Accepted. **Read with:** `02`, `04`, `06`. How code travels safely from a laptop to church members, and how we know it is healthy.

## 1. Environments

| Environment | Hosting | Database | Data |
| --- | --- | --- | --- |
| Local | developer machine | Neon `dev` branch (or local Postgres) | fake/seeded data only |
| Preview | Vercel preview per PR | Neon branch per preview | fake data only; not publicly guessable |
| Production | Vercel production | Neon `main` | real data |

Rules: separate secrets per environment; no production data in preview/local without anonymisation; previews require protection (Vercel deployment protection) because they run real code.

## 2. Continuous integration (GitHub Actions)

Runs on every pull request and on `main`:

1. Install with lockfile (`pnpm install --frozen-lockfile`)
2. `pnpm typecheck`
3. `pnpm lint` (includes module-boundary rules)
4. `pnpm test` (unit + integration; integration tests use a Neon test branch or containerised Postgres)
5. OpenAPI generation + **drift check**
6. gitleaks secret scan; dependency audit
7. `pnpm build`
8. E2E smoke tests (Playwright) against the preview URL for critical flows
9. Commitlint over the PR's commits (conventional format)

Branch protection: required checks + at least one human review + no direct pushes to `main`.

## 3. Continuous delivery

- Merge to `main` → Vercel builds and deploys to production automatically (after checks pass).
- Every PR gets a preview deployment with its own database branch.
- **Rollback:** use Vercel's instant rollback to the previous deployment. Database changes are **rolled forward** (fix-forward), which is why migrations must be backward compatible (section 4).
- Feature flags (simple config or DB-backed) for risky or unfinished features so code can ship dark.
- Deploy at low-usage times for risky changes; avoid deploys right before major church events (Sunday services, conferences).

## 4. Database migrations

1. Generate from schema changes: `pnpm db:generate`. Review the SQL. **Never edit an applied migration.**
2. Migrations run in a **controlled CI/CD step** using the **direct (unpooled)** connection and the owner role. **Never** from app code or on every request/cold start.
3. **Expand → migrate → contract:**
   - *Expand:* add new nullable columns/tables/indexes (compatible with the running code). Deploy.
   - *Migrate:* backfill data in small batches (a script/job, not one giant statement).
   - *Contract:* remove old columns only after no running code uses them. Separate commit, separate deploy.
4. Destructive changes (drop table/column, type change) need an ADR note and a verified backup/restore point.
5. New tenant tables **must** ship with RLS enabled and forced, the policy, and the index starting with `church_id`.
6. Test every migration on a fresh Neon branch (and on a branch copied from production, with anonymised data when possible) before production.
7. Use `CREATE INDEX CONCURRENTLY` (in its own migration) for large tables to avoid blocking.

## 5. Release checklist

- [ ] CI green; preview verified on a **phone-sized viewport** and a slow-network profile
- [ ] Migrations reviewed and backward compatible
- [ ] New env vars added to Vercel (all environments)
- [ ] OpenAPI updated; breaking changes avoided or versioned
- [ ] Monitoring/alerts cover the new feature
- [ ] Rollback plan known
- [ ] Churches informed of visible changes (short notes in Swahili and English when relevant)

## 6. Observability — what we watch

**Logs** (structured JSON via `pino`): timestamp, level, `requestId`, `churchId`, `actorId`, route, method, status, duration, error `code`. **No personal data** (see `04`). Log at boundaries; one meaningful line per request outcome.

**Errors:** error tracking (Sentry or equivalent) with personal data scrubbed, tagged by release, environment, route and church id. Alert on new error types and spikes.

**Metrics and health:**
- Uptime check on `GET /api/v1/health` (public, returns only status and version; includes a cheap database check on a separate `/health/ready`).
- API latency (p50/p95), error rates by route, auth failures, rate-limit hits.
- Neon dashboards: connections, compute usage, slow queries, storage growth.
- Vercel: function duration, cold starts, bandwidth, build status; Web Vitals (focus on mobile).
- Business signals: logins per day per church, registrations created, notifications sent/failed, background-job success rate.

**Audit vs logs:** audit records are a product feature (who did what, kept in the database, queryable by church admins with permission). Operational logs are for engineers and may be dropped on a retention schedule.

## 7. Alerting and on-call (pilot-sized)

- Route alerts to channels people actually watch (WhatsApp group/email/phone push) — decide with the team.
- Page-worthy: site down, error rate spike, database unavailable, auth failures surge, failed migrations, notification provider failing.
- Ticket-worthy: slow queries, rising costs, dependency vulnerabilities.
- Keep a short runbook per alert in `docs/runbooks/` (what it means, first three checks, who decides rollback).

## 8. Targets (to agree with the pilot church, then record)

Suggested starting points: availability ~99.5% monthly, p95 API latency under ~800 ms from Dar es Salaam, error rate under 1%, restore from backup tested quarterly, critical vulnerability patched within days. These are goals to measure, not promises, until real data exists.

## 9. Cost awareness

Review monthly: Vercel plan usage (invocations, bandwidth, function time), Neon compute/storage, SMS/WhatsApp spend (the easiest cost to run away), storage and email. Set budget alerts. Extraction triggers in `07` include sustained cost pressure.

## 10. Background work (when needed)

- Scheduled tasks: Vercel Cron → a small authenticated endpoint that enqueues work.
- Async work (messaging, exports, reconciliation): queue/workflow service chosen by ADR; handlers are idempotent, retry safely, and report failures to monitoring.
- Never block a user request on slow third-party calls (SMS, payment, email): enqueue, return, update status later.

## 11. Data lifecycle

- Retention rules per data class (decided with the church and legal advice); scheduled, audited deletion/anonymisation.
- Member requests for access/correction/deletion have a documented procedure and an audit trail.
- Test data generated synthetically; never copy production into lower environments without anonymisation.
