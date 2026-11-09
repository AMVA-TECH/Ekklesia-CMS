# Stage gates

Delivery follows `docs/cms-cursor-kit/IMPLEMENTATION_PLAN.md` and `agent-plan.md`.

| Stage | Scope | Schema in migrations | Status |
|---|---|---|---|
| 1 Foundation | Auth ctx, errors, RLS, audit, HTTP helpers | churches, people, households, membership, RBAC, audit, media, idempotency, outbox | **Done** (apply migrations when DB ready) |
| 2 People & membership | Vertical slice APIs + tests | same core | **Done** (integration tests pending live DB) |
| 3 Church ops | organisation, ministries, events, attendance | Draft only under `src/modules/{organisation,ministries,events}` | **Frozen** until Stage 2 owner gate |
| 4 Finance & messaging | finance, messaging, import jobs | Draft under `src/modules/{finance,messaging}` | **Frozen** until Stage 3 gate |


Draft Drizzle files may exist for later stages. They are **not** exported from `src/platform/db/schema/index.ts` and must not be migrated or wired to APIs until the prior stage exit evidence is met.
