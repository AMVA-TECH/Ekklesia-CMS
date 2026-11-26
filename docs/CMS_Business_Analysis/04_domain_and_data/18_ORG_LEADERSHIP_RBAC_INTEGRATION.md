# 18 — Org Structure, Leadership & RBAC Integration

**Status:** Implementation baseline (approved plan)  
**Date:** 2026-11-25  
**Aligns with:** `11_RBAC_AND_PERMISSIONS.md`, `15_RBAC_PHASE0_ASSESSMENT.md`, `12-church-configuration.md`, ADR-0003/0004  
**Code homes:** `church-cms/src/modules/organisation`, `access-control`, `governance`, `platform-ops`

## 1. Verdict

Do **not** rebuild. Three domains stay separate and integrate through explicit links:

| Domain | Purpose | Must not |
|---|---|---|
| Organisational structure | Units, hierarchy, lifecycle | Grant permissions |
| Leadership & appointments | Titles, occupancy, history | Auto-assign roles |
| RBAC | Roles, permissions, scopes | Use titles as auth |

## 2. AS-IS → TO-BE

### AS-IS (shipped)

- Units: kinds `department|ministry|life_group|branch|team`; parent/child; `active|inactive`
- Positions + appointments (+ history rows); dual-control requests; direct appoint with `appointments:write`
- RBAC: `resource:action`, scopes `church|organisational_unit|self|household`, rematrix/compare, member access API
- Appointment ≠ RBAC (contract-tested)

### TO-BE (this programme)

- Optional `source_appointment_id` on role assignments (provenance)
- End appointment returns access-review checklist (no auto-revoke)
- Unit deactivate/reparent blocked or confirmed when active unit-scoped assignments exist
- `allowedScopes` enforced on assign; delegation grants ⊆ assigner
- Unit-scoped `units:write` checked with resource unit id
- Integrated UX: appoint/end → configure access; richer roles workspace; access review shows appointments
- Appointment history list API; request-approve parity with direct appoint; programme status PATCH

### Out of scope

- Dotted permission codes; separate BRANCH/DEPARTMENT scope enums; auto-transfer on leader replace; CrossLife titles as auth; full platform persona rename

## 3. Scope & permission model (locked)

- Codes: `resource:action` (see Matrix A in `11_RBAC_AND_PERMISSIONS.md`)
- Assignment scopes: `church | organisational_unit | self | household`
- Unit `kind` carries department/ministry/team/branch — not separate scope types
- No hierarchy inheritance

### Prompt → existing code map (examples)

| Prompt example | Existing |
|---|---|
| `members.view` | `people:read` |
| `organisation.units.*` | `units:read` / `units:write` |
| `leadership.appointments.*` | `appointments:write` / `positions:write` |
| `finance.expenses.approve` | `disbursements:approve` |
| `roles.assign` | `roles:assign` |

## 4. Workflow — department leader

1. Create unit (kind=department)
2. Create position on unit
3. Appoint person (appointment; **no** RBAC)
4. Assign role (e.g. `department_head`) with `organisational_unit` scope = that unit; optional `sourceAppointmentId`
5. Effective access = permissions ∩ explicit scope only
6. End appointment → review related assignments → revoke/retain/reassign explicitly

## 5. Delegation matrix (church)

| Action | Typical permission |
|---|---|
| Create/edit units | `units:write` (+ unit id when scoped) |
| Positions / appointments | `positions:write` / `appointments:write` |
| Roles matrix / assign | `roles:assign` |
| Read roles / access review | `roles:read` |
| Temporary org delegations | `delegations:manage` + grant ⊆ assigner |

Rules: no self-escalation; no platform codes on church roles; last `roles:assign` church-scoped holder protected.

## 6. Platform mapping

| Prompt persona | Existing codes |
|---|---|
| Platform Owner / Admin | `platform:admin` |
| Ops / read | `platform:read` |
| Support enter-tenant | `platform:impersonate_tenant` |
| Security | `platform:security_read` |

Church roles never receive `platform:*`.

## 7. Test map (prompt §30)

| # | Scenario | Coverage |
|---|---|---|
| 1–4 | Create unit/position/appoint | Existing APIs + UI; extend smokes |
| 5 | Appointment ≠ permissions | Contract test + grants path |
| 6–10 | Assign scoped role; unit isolation | `can()` + module-access smoke |
| 15–16 | End appointment → review; no auto-transfer | New end payload + tests |
| 19 | Inactive unit | Grants skip + deactivate guard |
| 20–22 | Platform separation | Existing platform-ops |
| 23–25 | Cross-tenant / escalation / finance SoD | Existing + new guards |
| 27–28 | Last admin / audit | Existing |

## 8. Implementation gates

A Spec (this doc) → B Data links + assign guards → C Lifecycle → D UX → E Tests → F Report
