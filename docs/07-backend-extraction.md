# 07 — Backend Extraction Strategy

**Status:** Accepted (plan). **Read with:** `01`, `03`. Goal: when the system outgrows "Next.js hosts everything", we move the backend into a **dedicated service** (NestJS or another Node framework) **without rewriting business logic and without breaking any API client.**

We do **not** extract now. We build today so that extraction is a *move*, not a *rewrite*.

## 1. When to extract (triggers)

Extract when **one or more** is true and measured, not guessed. Record the decision in an ADR.

| Trigger | Example signal |
| --- | --- |
| **Scale or cost** | API traffic or function time makes serverless costly or slow; database connection pressure |
| **Long-running or heavy work** | imports/exports, bulk messaging, report generation, payment reconciliation that do not fit function limits |
| **Real-time or persistent connections** | chat, live attendance, notifications needing WebSockets/SSE |
| **Multiple first-party clients** | mobile apps and the social app generate meaningful API load independent of the CMS UI |
| **Team and release independence** | separate backend and frontend teams need independent release cycles |
| **Compliance or hosting needs** | data residency or infrastructure control requirements |
| **Operational need** | need for workers, queues and scheduled jobs beyond what Vercel Cron and a queue service handle comfortably |

Do not extract just because it is fashionable or because the folder structure looks like NestJS.

## 2. What we do now to keep extraction cheap

These are mandatory rules, not nice-to-haves.

1. **Modules are framework-free.** No `next/*`, `react` or `src/app/**` imports in `src/modules/**` (lint-enforced). Next.js types never leak into services.
2. **Modules have a single public surface** (`index.ts`) and own their tables. No cross-module table access.
3. **Handlers are thin.** If the entire `src/app/api/v1` folder were deleted, no business rule would be lost.
4. **Contracts are Zod schemas + OpenAPI.** They are the DTOs a future controller will use.
5. **`Ctx` is explicit.** Services never read cookies, headers or global state; the API layer builds `Ctx`. A NestJS guard can build the same `Ctx`.
6. **Policies are plain functions** (`can(ctx, action, resource)`), portable into guards.
7. **Database access only through repositories** using Drizzle. Drizzle works in any Node host.
8. **Configuration is centralised** (`platform/config`), so environment loading can be swapped.
9. **Events through an outbox** so async delivery can move to a worker.
10. **Contract tests** run against HTTP, not against internals, so the same suite verifies both the old and the new backend.
11. **No hidden coupling to Vercel:** no use of Vercel-only runtime APIs inside modules; platform-specific code stays in `platform/` adapters.

## 3. Mapping: today → dedicated backend

| Today (Next.js) | Dedicated backend (e.g. NestJS) |
| --- | --- |
| `src/app/api/v1/**/route.ts` | Controllers |
| `handle()` wrapper (errors, request id) | Global exception filter + interceptor |
| `requireCtx(request)` | Auth guard that builds `Ctx` |
| Zod schemas in `modules/*/schemas.ts` | DTOs/validation pipes (e.g. a Zod-based pipe) — same schemas |
| `modules/*/service.ts` | Providers/services (unchanged logic) |
| `modules/*/policies.ts` | Guards / policy services (same functions) |
| `modules/*/repository.ts` | Repositories (unchanged) |
| `platform/db` | Database module (same driver/pool, now long-lived connections) |
| Outbox table + cron dispatch | Worker/queue consumers |
| Vercel Cron | Scheduler in the backend or a worker |
| `src/modules/*` | `packages/*` workspace libraries or `apps/api/src/modules/*` |

## 4. Extraction plan (strangler pattern — module by module)

Each step is a set of small commits and a safe deploy.

1. **Stabilise the contract.** Freeze `/api/v1` via OpenAPI. Make sure contract tests cover every endpoint over HTTP.
2. **Convert to a workspace.** Move `src/modules/*` and `src/platform/*` into `packages/` (pnpm workspace; e.g. `packages/modules-*`, `packages/platform`). Moves are *rename-only commits*. The Next.js app now imports them as packages.
3. **Create `apps/api`.** Scaffold the dedicated backend with health and OpenAPI endpoints. Deploy it to a container/long-running host close to Neon.
4. **Port one module** (start with the lowest risk, e.g. `events` or `notifications`): controller layer only, reusing the module package. Pass the same contract tests.
5. **Route traffic gradually.** Use rewrites/a gateway so `/api/v1/<module>/*` goes to the new service while others stay in Next.js. Compare behaviour; keep an immediate rollback.
6. **Repeat** module by module. Move auth/identity carefully, with sessions and tokens verified by both backends during the transition.
7. **Move async work** (outbox dispatcher, scheduled jobs, notifications) to workers.
8. **Retire** the old route handlers. Next.js becomes a pure frontend that calls the API.
9. **Update docs and ADR** (own commits).

Rules during extraction: **no big-bang cutover**, **no contract change** mixed with the move, **no new features** inside the extraction branch, and the same granular-commit discipline (`06`).

## 5. Data and tenancy during extraction

- One database stays the source of truth. No data copying unless a separate ADR demands it.
- The dedicated backend uses the same RLS approach: per-transaction `set_config('app.church_id', …, true)`. With long-lived connections, ensure the setting is **transaction-local** so pooled connections never leak a tenant.
- The new service connects with the same restricted DB role.

## 6. Authentication during extraction

- The identity layer (ADR-0002) must already be usable by both the Next.js app and a separate service. That is why we choose it with this future in mind: server-verifiable sessions or tokens, no dependence on Next.js internals.
- External clients keep their credentials; only the host behind the base URL changes.

## 7. What not to do during extraction

- Don't rewrite business logic "while we're at it".
- Don't change API shapes silently. If needed, add `/v2` separately.
- Don't split into many microservices. The target is **one dedicated backend** (modular monolith). Split further only on separate evidence and a new ADR.

## 8. Readiness checklist (review quarterly)

- [ ] Lint confirms no framework imports inside modules
- [ ] No module reads another module's tables
- [ ] Every endpoint has an HTTP-level contract test
- [ ] OpenAPI matches reality (CI drift check green)
- [ ] `Ctx` is the only way tenant/actor information reaches services
- [ ] Outbox is in use for cross-module side effects
- [ ] No Vercel-specific API used inside `src/modules`
- [ ] Identity layer works outside Next.js
