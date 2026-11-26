# 17 — RBAC Implementation Report

**Date:** 2026-11-21  
**Status:** Core programme delivered; known gaps listed below

## Implemented

- Phase 0 assessment + Matrices A–D in `11_RBAC_AND_PERMISSIONS.md` / `15_RBAC_PHASE0_ASSESSMENT.md`
- Scope-aware `listEffectiveGrants` → `Ctx.scopesByPermission` + household membership set
- Organisation temporary `delegations.grants` merged into effective grants
- `withTenantTx` sets RLS `app.church_id` on local Postgres; Neon HTTP falls back to app filters
- Permission catalogue metadata (code module + sensitivity) + migration `0022`
- Tightened Church Admin / Finance Officer templates (SoD: admin loses finance approve/post; officer loses approve)
- Full role template library (opt-in templates beyond bootstrap five)
- Role CRUD, permission matrix update, duplicate, deactivate APIs
- Assigner subset rule, high-risk confirmation, last-admin protection, audits
- Member access review API
- Admin Roles & Permissions workspace at `/admin/roles`
- Permission-based post-auth routing; admin unauthenticated redirect
- Event create/get/update passes organisational unit into `can()`
- `people:read_restricted` policy helpers
- Appointment request decide dual-control
- Automated unit tests for can/scope, delegation, catalogue, nav, RLS helper contract
- Security test plan: `16_RBAC_SECURITY_TEST_PLAN.md`

## Reused

- Existing `access-control` tables and `can()` engine
- Session → Ctx → service policies pattern
- Platform vs church separation (`platform_operators`)

## Follow-ups delivered after core

- Assignment UI organisational-unit picker
- Inactive/deleted unit scopes skipped in effective grants; assignment rejects inactive units
- Explicit rematrix API `POST /api/v1/roles/apply-templates` (`confirm: true`) + admin button

## Follow-ups (this wave)

- Neon WebSocket Pool path for `withTenantTx` (`DATABASE_TX_MODE=auto|on|off`) so hosted RLS `set_config` can run
- Smokes: `pnpm db:smoke:rbac` pack — isolation, effective grants, roles-access, module-access (people/finance/events)
- Expanded roles API forbidden / route gating tests
- Local migrate applied `0022_permission_catalogue_metadata.sql` (module/sensitivity columns + restricted codes)

## Outstanding / known risks

1. App `church_id` filters remain mandatory even when RLS txs are on (defense in depth).
2. Optional live-HTTP coverage still thin beyond people (service-layer smokes cover the authz contract).
3. `people:read_restricted` gates `dateOfBirth`; add further sensitive fields the same way as they appear.
4. Older seeds may lack some bootstrap roles — use `pnpm db:smoke:bootstrap-roles` (creates missing + rematrix) or create via `/admin/roles`.

## Recommended next steps

1. On other environments: ensure `0022`/`0023` migrated; run `pnpm db:smoke:bootstrap-roles` (or UI Apply template baselines after creating missing roles).
2. Confirm runtime DB role has **no** `BYPASSRLS`.
3. Org + leadership integration wave: see `18_ORG_LEADERSHIP_RBAC_INTEGRATION.md` and `19_ORG_LEADERSHIP_RBAC_IMPLEMENTATION_REPORT.md`.
