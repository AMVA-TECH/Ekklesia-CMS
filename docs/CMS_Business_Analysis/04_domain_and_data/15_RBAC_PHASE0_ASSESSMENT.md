# 15 — RBAC Phase 0 Assessment

**Status:** Accepted baseline for implementation  
**Date:** 2026-11-21  
**Aligns with:** `11_RBAC_AND_PERMISSIONS.md`, `docs/04-security.md`, DEC-008/017/033, ADR-0003/0004  
**Code home:** `church-cms/src/modules/access-control`

## Verdict

Do **not** rebuild RBAC. Extend the existing access-control module. The product already has the correct shape: global permission catalogue → per-church roles → scoped assignments → service-layer `can()`. Work focuses on making scope authoritative, completing catalogue/templates/admin UX, closing privilege-escalation gaps, and keeping CrossLife titles out of authorization checks.

## Existing architecture

| Layer | Reality |
| --- | --- |
| Session | Better Auth + `activeChurchId`; MFA for admin/platform |
| Effective grants | `listEffectivePermissionCodes` (flat codes only today) |
| Ctx | `permissions` Set; `scopesByPermission` optional but unused |
| Policies | Per-module `assertCan*` → `can()` |
| Tenant | App-level `church_id` filters; RLS helper unused |
| Platform | Separate `platform_operators` / `PlatformCtx` |

## Strengths

- Default-deny `can()` and consistent service-layer policies
- Appointment ≠ permission (contract-tested)
- Platform vs church separation (ADR-0003)
- Permission-based admin nav
- Assignment create/revoke audited

## Priority weaknesses

1. Assignment scopes not loaded into Ctx (unit-scoped roles act church-wide)
2. Organisation `delegations.grants` not merged into effective grants
3. RLS `app.church_id` never set in app transactions
4. Incomplete `household` scope check
5. Church Admin / Finance Officer templates over-privileged for SoD
6. No assigner subset / last-admin guards
7. No custom role CRUD or permission-matrix admin workspace
8. Thin automated permission / cross-tenant tests

## Locked decisions

- Keep `resource:action` permission codes
- Assignment subject: `user_account_id` + active `organisation_users`
- MVP scopes: `church` \| `organisational_unit` \| `self` \| `household` (no BRANCH workflows)
- Extend tables additively; soft-deactivate roles
- Church Admin ≠ unrestricted finance approver/payer

## Implementation gates

See Matrices A–D in `11_RBAC_AND_PERMISSIONS.md` §§8–11 and the engineering plan Gate A–F sequence.
