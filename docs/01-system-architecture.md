# 01 — System Architecture

**Status:** Accepted (pilot). **Audience:** coding agents and developers. **Read with:** `AGENTS.md`, `07-backend-extraction.md`.

## 1. Purpose

Describe how the Church CMS is put together, so that every change fits the same shape. The shape has two goals:

1. **Pilot fast and cheap:** one deployable app on Vercel + Neon.
2. **Grow without a rewrite:** clear boundaries so a dedicated backend can be extracted later.

## 2. Context

```
 Church admins        Members            (Later) Social/community app,
 (phone / laptop)     (mostly phone)      mobile apps, integrations
        │                  │                        │
        └──────────┬───────┘                        │
                   ▼                                │
        ┌───────────────────────┐                   │
        │  Next.js on Vercel    │                   │
        │  • Admin UI           │                   │
        │  • Member portal UI   │                   │
        │  • REST API /api/v1 ◄─┼───────────────────┘
        │  • Modules (services) │      (same API, scoped access)
        └──────────┬────────────┘
                   ▼
        ┌───────────────────────┐
        │  Neon PostgreSQL      │   Other services: file storage (S3-compatible),
        │  (pooled connections) │   email / SMS / WhatsApp provider, error tracking
        └───────────────────────┘
```

Rule: **nothing but the app's backend layer talks to Neon.** The future social app, mobile apps and integrations use the API, never the database.

## 3. Architectural style

- **Modular monolith.** One deployable, many strictly separated modules. Not microservices.
- **API-first.** The REST API is a first-class product. The web UI is simply the first client of it.
- **Layered, one-way dependencies.** Upper layers call lower layers; never the reverse.
- **Framework-free business code.** Rules live in plain TypeScript modules that know nothing about Next.js.

## 4. Layers and the dependency rule

| Layer | Location | Responsibility | May call |
| --- | --- | --- | --- |
| Proxy (ex-middleware) | `src/proxy.ts` | Cheap early checks: redirect if no session cookie, locale routing, basic headers. **Not security.** | nothing in modules |
| UI | `src/app/(admin)/**`, `src/app/(portal)/**`, `src/ui/**` | Screens and components. Reads data through the API or server components that call **services via the public API layer**. | API layer |
| API layer | `src/app/api/v1/**/route.ts` | HTTP concerns only: parse, build `Ctx`, validate (Zod), call a service, map to response, map errors. | services |
| Services | `src/modules/<name>/service.ts` | Business rules, workflows, authorisation via policies, transactions, domain events. | repositories, other modules' public services |
| Repositories | `src/modules/<name>/repository.ts` | Database queries with Drizzle. Always tenant-scoped. | `platform/db` |
| Platform | `src/platform/**` | DB connection, transaction helper, config, logging, errors, audit, HTTP helpers. | external libraries |

**Dependency rule (enforced by lint):** an import may only go *down* this table. `src/modules/**` may never import `next/*`, `react`, or anything in `src/app/**`.

## 5. Directory layout

```
church-cms/
├── AGENTS.md
├── docs/                         # these documents + api/ openapi.yaml later
├── drizzle/                      # generated SQL migrations (never hand-edit applied ones)
├── src/
│   ├── app/
│   │   ├── (admin)/              # church admin screens
│   │   ├── (portal)/             # member portal screens
│   │   └── api/v1/               # REST route handlers (thin)
│   │       ├── auth/ people/ households/ memberships/ ministries/
│   │       └── events/ attendance/ projects/ notifications/ ...
│   ├── modules/                  # business modules (framework-free)
│   │   └── people/
│   │       ├── index.ts          # the ONLY public surface of the module
│   │       ├── service.ts
│   │       ├── repository.ts
│   │       ├── policies.ts       # who may do what
│   │       ├── schemas.ts        # Zod request/response schemas (= future DTOs)
│   │       ├── mappers.ts        # row → response DTO
│   │       ├── events.ts         # domain events this module emits
│   │       ├── db-schema.ts      # Drizzle tables owned by this module
│   │       └── __tests__/
│   ├── platform/                 # db, config, logger, errors, audit, http, i18n
│   ├── ui/                       # shared components
│   └── proxy.ts
├── .nvmrc  .github/  eslint.config.*  drizzle.config.ts  package.json
```

## 6. Module catalogue

| Module | Owns | Depends on |
| --- | --- | --- |
| `auth` | users, sessions, credentials, MFA, API clients | `platform` |
| `churches` | churches (tenants), settings, branches/campuses | `platform` |
| `access-control` | roles, permissions, role assignments, policy helpers | `churches`, `auth` |
| `people` | person records, contact details, consents | `access-control` |
| `households` | households, relationships, guardians | `people` |
| `membership` | membership status, history, class/process steps | `people`, `churches` |
| `organisation` | organisational units, positions, appointments | `people`, `churches` |
| `ministries` | ministries, ministry members, leaders | `people`, `organisation` |
| `events` | events, registrations | `people`, `ministries` |
| `attendance` | sessions, attendance records | `events`, `people` |
| `projects` | projects, participants, tasks | `people`, `ministries` |
| `communications` | announcements, message templates | `people` |
| `notifications` | in-app/SMS/email/WhatsApp delivery, preferences | `communications` |
| `audit` | append-only audit trail | `platform` |

Giving/offerings (mobile money) is **not** in the pilot. When added, it becomes its own module with the strictest data class (see `04-security.md`).

Check the catalogue before creating a module. A new module needs a `docs(architecture):` commit first.

## 7. Request lifecycle

For `POST /api/v1/people`:

1. **Proxy:** does a session cookie exist? (quick redirect for browser pages only).
2. **Route handler:** read the request id; resolve the session **on the server**; build `Ctx { actor, churchId, requestId, locale }`.
3. **Validate** the body with the module's strict Zod schema. Reject unknown fields.
4. **Service:** check the policy (`can(ctx, 'people:create')`); apply business rules; open a transaction.
5. **Repository:** insert the row with `church_id = ctx.churchId` (RLS context set inside the transaction).
6. **Audit + events:** write an audit record and any domain event **in the same transaction**.
7. **Map** the row to a response DTO; return JSON (`201`).
8. **Errors** become a standard problem response (see `03-api-architecture.md`). Nothing leaks internals.

## 8. Tenancy model

- **Tenant = church.** Every church-owned table has `church_id uuid not null` plus an index starting with `church_id`.
- A person may belong to several churches. They act in **one active church at a time**, chosen explicitly and stored in the server-side session.
- Isolation is enforced in five layers (details in `04-security.md`): session → `Ctx` → tenant-scoped repository → Postgres RLS → cross-tenant tests.

## 9. Module rules

1. Other code imports a module only through its `index.ts`.
2. A module reads and writes **only its own tables**. Need another module's data? Call its service or react to its events.
3. Policies live with the module that owns the data.
4. DTO schemas (`schemas.ts`) are the module's contract; the API layer and OpenAPI generation reuse them.
5. Events are named `<module>.<noun>.<past-tense-verb>`, e.g. `membership.member.joined`, `events.event.published`. Payloads carry stable IDs, not whole records.
6. A module has no hidden global state. Dependencies are passed in or imported explicitly.

## 10. Data model principles

- IDs: UUID (time-ordered, e.g. UUIDv7 generated in the app). Never expose sequential integers.
- Every table: `id`, `church_id` (if tenant-owned), `created_at`, `updated_at`, `created_by`, `updated_by`.
- Soft delete (`deleted_at`) for people and records with history; hard delete only by an explicit, audited retention process.
- Money: `bigint` minor units + `currency` (`TZS`). Never floats.
- Time: `timestamptz` in UTC. Dates without time (birthdays, event days) use `date`.
- Phone numbers in E.164. Names stored as given; do not assume "first/last" structure fits everyone (allow a display name and a full name).
- Use enums sparingly; prefer lookup tables for values churches may customise (membership statuses, ministry types).
- Index for the queries you actually run: tenant first, then the filter/sort column.

## 11. Cross-cutting concerns

| Concern | Rule |
| --- | --- |
| Config | Read once in `platform/config`, validated with Zod at startup. No `process.env` elsewhere. |
| Logging | Structured JSON, with `requestId` and `churchId`; **no personal data** in logs. |
| Errors | Typed domain errors (`NotFoundError`, `ForbiddenError`, `ValidationError`, `ConflictError`). Mapped once, in the API layer. |
| i18n | Swahili (`sw`) and English (`en`). API sends stable error **codes**; clients translate. |
| Time zone | Store UTC; display `Africa/Dar_es_Salaam` (UTC+3, no daylight saving). |
| Pagination | Cursor-based by default. Never return unbounded lists. |
| Audit | Every create/update/delete of sensitive data and every permission change. |

## 12. Tanzania-context constraints

- **Mobile first.** Design every screen for a small phone first. Keep pages light; avoid heavy client bundles; paginate; lazy-load.
- **Unreliable networks.** Handle failed requests gracefully; make POSTs safe to retry (idempotency keys, see `03`). Plan for a PWA later (offline-friendly reading, queued actions).
- **Notifications.** SMS and WhatsApp matter more than email for many members; the `notifications` module must be channel-agnostic.
- **Mobile money** will arrive for giving/offerings: plan for asynchronous payment confirmations, webhooks, reconciliation, and idempotency.
- **Region choice.** Put the Vercel Functions region and the Neon region **together** and as close to users as available; measure latency before fixing the choice (recorded in an ADR).

## 13. Explicitly not now

Microservices · Kubernetes · GraphQL · WebSockets/real-time · message brokers · Server Actions for business logic · multi-region · custom auth/crypto · running long jobs inside request handlers.
Each can be reconsidered through an ADR when real need appears.

## 14. Future shape

When the triggers in `07-backend-extraction.md` are met, `src/modules/*` becomes a workspace package set and a dedicated NestJS (or similar) service serves `/api/v1` behind the same contract. The Next.js app then becomes a pure frontend. Nothing in this document should make that move hard; if a change would, stop and ask.
