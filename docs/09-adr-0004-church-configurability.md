# ADR-0004 — Standardized SaaS core with church-level configurability

**Status:** Accepted  
**Date:** 2026-11-13  
**Decider:** Project owner  
**Decision:** [DEC-033](cms-cursor-kit/DECISIONS.md)  
**Unblocks:** Multi-church productisation without CrossLife hardcoding

## Context

Ekklesia is a multi-tenant Church Management SaaS. Churches differ in governance, leadership titles, organisational hierarchy, terminology, policies and workflows. The CrossLife pilot must use the **same** architecture future churches will use (DEC-027), not a fork or special-case codebase.

Prior state: strong platform core (tenancy, auth, permissions, audit) but church “configuration” was mostly an opaque `church_settings` JSON bag plus hardcoded CrossLife role titles, module nav by role code, and product strings such as OTP “CrossLife”.

## Decision

Adopt a **standardized platform core** with **church-level configurability**:

### Platform core (immutable by churches)

- Global identity and authentication  
- Multi-tenant isolation (`church_id` from session)  
- Membership / one-active-local-church invariant  
- Centralized authorization; **platform-owned permission catalogue**  
- Role and scope validation rules  
- Audit logging  
- Core domain entities and data integrity  
- API standards, security and privacy policies  
- Shared notification infrastructure  

### Church configuration (admin-managed within bounds)

- Governance and organisational **data** (units, positions, appointments)  
- Terminology / display labels  
- Module availability  
- Branding (product display name, logo)  
- Workflow policy scalars (e.g. dual-control flags) and thresholds  
- Custom roles **using** the platform permission catalogue (later phase)  
- Role assignments and scopes  

### Configuration model

1. **Structured entities** for relational, FK-backed concepts (units, positions, roles, appointments).  
2. **Typed settings namespaces** on `church_settings` validated with Zod: `branding`, `terminology`, `modules`, `workflows`, `thresholds` — plus legacy `logoMediaId` compatibility.  
3. **Not** unrestricted free-form JSON for business-critical behaviour.  
4. Configuration must not create denomination-specific tables or bypass tenancy/security.

### Authorization rule

Permissions are granted by **permission codes**, never by leadership title strings. Titles are display/config only (DEC-008).

### CrossLife

CrossLife-specific defaults ship as the opt-in named template `crosslife-pilot` via  
`POST /api/v1/platform/churches/{id}/apply-template` (not on every provision — DEC-027).  
Product UI and shared services must not branch on “is CrossLife”.

## Consequences

- Implement `resolveChurchSettings` + validation on settings PATCH.  
- Surface branding / terminology / modules in admin settings.  
- Drive admin nav from **permissions + module flags**, not hardcoded role codes alone.  
- Prefer platform branding (“Ekklesia”) with per-church product name for member-facing copy (OTP SMS).  
- Later: role-matrix CRUD, workflow policy wiring, reporting relationships, settings revision history.

## Out of scope (this ADR)

- Generic workflow engine for every denomination  
- Changing membership **status codes** in MVP (labels may be terminological)  
- Church admins editing the global permission catalogue  

## Related

- `docs/12-church-configuration.md`  
- DEC-002, DEC-015, DEC-027, DEC-032, DEC-033  
- BA: configurable structure / empty church  
