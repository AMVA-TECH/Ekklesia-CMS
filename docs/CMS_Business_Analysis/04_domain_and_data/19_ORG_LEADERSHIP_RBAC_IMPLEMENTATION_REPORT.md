# 19 — Org Structure + Leadership + RBAC Integration Report

**Date:** 2026-11-25  
**Status:** Gates A–F delivered against approved plan  
**Spec:** `18_ORG_LEADERSHIP_RBAC_INTEGRATION.md`

## Verdict

Extended existing organisation, leadership, and access-control modules. No second RBAC or org model. Appointment still never grants permissions.

## Evidence by gate

### Gate A — Spec
- `18_ORG_LEADERSHIP_RBAC_INTEGRATION.md` — AS-IS/TO-BE, workflows, matrices, test map

### Gate B — Data links + assignment guards
- Migration `church-cms/drizzle/0023_assignment_source_appointment.sql` (+ journal)
- `user_role_assignments.source_appointment_id` on schema / insert / mappers
- `createRoleAssignment` enforces template `allowedScopes`; optional `sourceAppointmentId`
- `getMemberAccess` returns assignments (with provenance) + leadership appointments
- `endAppointment` returns `accessReview` checklist (no revoke)
- `GET /api/v1/appointments/:id/history`
- `listUnitAccessImpact` + `GET /api/v1/organisational-units/:id/access-impact`
- Org temporary `createDelegation` uses `assertAssignerMayGrantPermissions`

### Gate C — Lifecycle guards
- Unit deactivate/reparent requires `confirmStructuralChange: true` when active unit-scoped assignments exist
- `assertCanWriteUnits(ctx, unitId)` on unit PATCH
- Appointment-end access-review payload; never auto-revoke
- `decideAppointmentRequest` occupancy + kind/dates parity with direct appoint
- `PATCH /api/v1/programmes/:id` (name/status)

### Gate D — Integrated admin UX
- Leadership appoint/end → CTA handoff to `/admin/roles` (assign or review), unit/appointment query params
- Unit detail → “Configure system access”
- Roles workspace: duplicate/deactivate, templates library + compare drift panel, access review shows appointments, scope filter from template `allowedScopes`, optional linked appointment on assign
- Organisation deactivate/reparent confirms when API returns `confirmation_required`

### Gate E — Tests
- `organisation/__tests__/structural-confirm.test.ts`
- `access-control/__tests__/org-rbac-integration.test.ts`
- `governance/__tests__/delegation-assigner-subset.test.ts`
- Extended `assignment-scope-rules.test.ts`
- Existing appointment ≠ RBAC + can/delegation packs remain

### Gate F — This report

## Gaps / risks

1. Approve-request UI may not yet expose kind/date fields even though API supports them.
2. Programme deactivate is API-only (no dedicated admin control on unit detail).
3. Appointment history list API exists; no dedicated timeline panel in leadership UI yet.
4. Deep-link assign still requires an organisation user mapping for the appointed person.
5. App-level `church_id` filters remain mandatory even when RLS txs are on.

## Out of scope (unchanged)

- Dotted permission codes; BRANCH/DEPARTMENT scope enums; auto-transfer on leader replace; CrossLife titles as auth; full platform persona rename
