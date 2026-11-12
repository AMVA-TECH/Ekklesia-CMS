# Data Modelling Rules and Schema Readiness

**Authority chain:** `03_DATA_PHILOSOPHY.md` → this file → entity catalog / ERD.  
**Social tables:** forbidden in MVP — see `05_SOCIAL_EXTENSION_MAP.md`.  
**Accounting immutability:** see `06_ACCOUNTING_MODULE.md`.  
**Messaging consent:** see `07_MESSAGING_MODULE.md`.

## 1. General rules

1. Use stable primary identifiers (UUIDv7); do not use names or phone numbers as primary keys.
2. Include organisation ownership/scope for tenant-owned records (`church_id` from `Ctx`).
3. Enforce tenant boundaries at service and database access layers (incl. RLS later).
4. Preserve effective dates for appointments, memberships and participation.
5. Prefer status-history records for important lifecycle changes.
6. Store contact channels separately from person identity.
7. Do not duplicate member profile fields into every module.
8. Use explicit join entities for many-to-many relationships that carry role, status or dates.
9. Distinguish event registration from attendance.
10. Distinguish project participation from ministry membership; distinguish programmes from projects.
11. Keep audit metadata for sensitive and consequential actions (`AuditEvent` append-only).
12. Define soft-delete/archive policy per entity; do not apply indiscriminately.
13. Use controlled reference data for categories and statuses where church configuration is required; MVP membership statuses are fixed: visitor | active | inactive.
14. Define uniqueness rules within the correct organisation scope.
15. Avoid speculative social-network entities in first-release schema.
16. Posted journal entries are immutable; correct via reversing entries.
17. Money: integer minor units + currency code; never floats.
18. Global `Person`; church link via membership / organisation user.
19. Household children are name+age records — not Person/membership in MVP.
20. CrossLife data is fixture/mock only — not production seed.

## 2. History and correction

For membership, appointments, participation, attendance and finance:
- Record who made the change.
- Record when it became effective.
- Record when the system captured it.
- Preserve prior values where business/audit needs require.
- Define correction and reversal procedures.
- Do not silently overwrite important history.

## 3. Data privacy

- Classify fields by sensitivity (Public / Internal / Confidential / Restricted).
- Define which roles can view/edit each field (`11_RBAC_AND_PERMISSIONS.md`).
- Default member directory visibility to opt-in name + photo + ministry.
- Restrict household details and children’s data; full minor workflows deferred.
- Finance, pledges, and giving are Restricted — admin only.
- Record access to highly sensitive records where justified.
- Messaging must respect communication preferences/consent.

## 4. Schema readiness gate

Do not generate production migrations until:
- Entity definitions are agreed (`04_LOGICAL_ENTITY_CATALOG.md`).
- Cardinalities and lifecycle rules are agreed (`08_ERD.md`, `09_DOMAIN_LOGIC_AND_ALGORITHMS.md`).
- Tenant ownership is explicit.
- Status values and transitions are approved.
- Permission scopes are mapped (`11_RBAC_AND_PERMISSIONS.md`).
- API catalogue reviewed (`10_API_ENDPOINT_MAP.md`).
- Retention and audit rules are defined (OQ-021 still open — set defaults before migrate).
- Stakeholders approve the conceptual model.
