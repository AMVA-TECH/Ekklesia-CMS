# 16 — RBAC Security Test Plan

**Status:** Active  
**Aligns with:** `11_RBAC_AND_PERMISSIONS.md`, `15_RBAC_PHASE0_ASSESSMENT.md`, `docs/04-security.md`

## Automated coverage (implemented)

| Area | Location |
|---|---|
| Default deny / self / unit / household scope | `access-control/__tests__/can.test.ts` |
| Assigner subset / platform block / high-risk flags | `access-control/__tests__/delegation.test.ts` |
| Catalogue completeness | `access-control/__tests__/permission-catalogue.test.ts` |
| Scopes serialization | `platform/auth/__tests__/effective-grants-serialize.test.ts` |
| Ctx / platform ctx | `platform/auth/__tests__/require-ctx.test.ts` |
| Tenant tx + RLS helper contract (+ Neon WS) | `platform/db/__tests__/with-tenant.test.ts` |
| Roles forbidden + route gating | `access-control/__tests__/forbidden-access.test.ts` |
| Effective grants pure logic | `platform/auth/__tests__/effective-grants-logic.test.ts` |
| Cross-tenant RLS + predicates (DB, 11 tables) | `pnpm db:smoke:rbac-isolation` |
| Multi-role / expire / inactive unit (DB) | `pnpm db:smoke:effective-grants` |
| Roles forbidden + cross-tenant not_found | `pnpm db:smoke:roles-access` (+ optional `BASE_URL`) |
| People / finance / events access | `pnpm db:smoke:module-access` |
| Full local RBAC smoke pack | `pnpm db:smoke:rbac` |
| Rematrix dry-run / apply | `pnpm db:smoke:rematrix` (`APPLY_REMATRIX=1` to apply) |
| Template permission diff helper | `access-control/__tests__/template-diff.test.ts` |
| Events unit-scope policies | `events/__tests__/unit-scope-access.test.ts` |
| Appointment ≠ RBAC | `organisation/__tests__/appointment-rbac-separation.test.ts` |
| Nav permission gating incl. `/admin/roles` | `admin/_lib/__tests__/nav-groups.test.ts` |
| Expense dual-control helper | `governance/__tests__/segregation.test.ts` |

## Acceptance scenarios (track)

1. Cross-church isolation — repository + API cross-tenant tests (expand per endpoint).
2. Unit-scoped leader cannot access other units — covered by `can()` unit tests; wire through event/ministry services with resource unit ids.
3–6. Multi-role union / revoke / expire / church-wide only when assigned — effective grants path.
7–9. Membership / org-user inactive — session resolution requires active organisation user.
10. Appointment alone grants no permissions — contract test.
11. No org hierarchy inheritance — by design (no parent walk in `can()`).
12–14. Church admins cannot create platform perms / cannot self-escalate — subset + platform code checks.
15. Cross-tenant scope IDs — unit lookup via tenant-scoped `getUnitById`.
16. Frontend bypass — backend policies.
17. SoD — expense decide dual-control; appointment decide dual-control; finance officer ≠ approve in templates.
18–19. Role/unit deactivation — soft-delete roles; invalid unit scopes skipped in grants.
20. Audit on role/assignment mutations — `access.role*` / `access.role_assignment*` events.
24. Last admin lockout — `assertNotLastRolesAssignHolder`.

## Remaining gaps

- Broader `BASE_URL` HTTP checks for finance/events/membership (people covered optionally in `module-access`).
- Confirm production/Neon app role has no `BYPASSRLS`; keep `DATABASE_TX_MODE=auto` (or `on`) so `withTenantTx` uses the WebSocket Pool.
- Seed missing bootstrap roles on older churches if `compare-templates` reports `missing`.
