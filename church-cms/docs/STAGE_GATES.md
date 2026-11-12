# Stage gates

Delivery follows `docs/cms-cursor-kit/IMPLEMENTATION_PLAN.md` and `agent-plan.md`.

| Stage | Scope | Schema in migrations | Status |
|---|---|---|---|
| 1 Foundation | Auth ctx, errors, RLS, audit, HTTP helpers | churches, people, households, membership, RBAC, audit, media, idempotency, outbox | **Done** (local migrate + RLS applied) |
| 2 People & membership | Vertical slice APIs + tests | same core | **Done** (`pnpm check`, `db:smoke`, `db:smoke:people-households`, `db:smoke:memberships`; people contacts + households; memberships list/create/get/status + applications) |
| 3 Church ops | organisation, ministries, events, attendance | Migrated; APIs for units/programmes/positions/appointments/participations/events/attendance + QR/absence/corrections + posters (`0014`) + `/attendance/me` + `/attendance/family` + `/attendance/stats/leadership` + household children | **Done** for MVP slice (`pnpm check`, `db:smoke:stage3`, `db:smoke:appointments`, `db:smoke:event-posters`, `db:smoke:attendance-progress`). Family/nudge UI still deferred. |
| 4 Finance & messaging | finance, messaging, import jobs | Migrated through `0013_project_interest_requests`; APIs for funds/accounts/years (+ close)/journals (+ reverse)/offerings/pledges/projects (+ interest) + messaging + import | **Done** for MVP slice (`db:smoke:journal-reverse`). Notify: **Briq**. Deferred: WhatsApp cold templates |
| 4b Leadership governance | approvals, reports, budgets, minutes, appointment requests, attendance polish | `0009` + `0010` + `0011_offering_journal_post` | **Done** — dual-control + expense/offering journal post, appointment requests, minutes, M/Q/Y budgets, moneyflow, R-SP-02/03, unit packs, trial balance, saved views, QR/absence. Free-form designer still out |
| 5 Pilot readiness | migration rehearsal, UAT, auth ADR-0002, ops checks | — | **In progress** — ADR-0002 **Accepted** (Better Auth C); ADR-0003 platform operator console; migrations `0015`–`0019` (`EXPECTED_MIGRATIONS=20`). Member email/phone+PIN; admin OTP MFA; `/platform` oversight. `pnpm db:rehearse`, `pnpm pilot:ops-check`, [PILOT_READINESS.md](./PILOT_READINESS.md), [UAT_CHECKLIST.md](./UAT_CHECKLIST.md) |


All listed stage tables are exported from `src/platform/db/schema/index.ts`.
