# Architecture — Church Management System (CMS)

**Status:** Provisional guardrails only. This is not an approved technology selection or final architecture.

## 1. Architecture goals

- Deliver a reliable single-church pilot without unnecessary complexity.
- Keep business rules understandable and testable.
- Enforce access control at trusted server boundaries.
- Preserve data integrity and important history.
- Keep organisation-specific configuration separate from shared capabilities where practical.
- Retain a credible path to productisation without implementing multi-tenancy prematurely.

## 2. Starting recommendation

A modular monolith is the default recommendation for the initial product unless repository inspection or validated requirements show a compelling reason otherwise.

Do not introduce microservices, event streaming, complex workflow engines or generic plugin systems without a documented need.

## 3. Provisional module boundaries

Potential modules, subject to discovery:
- Identity and access.
- People and membership.
- Leadership and governance records.
- Ministries and participation.
- Services, events and attendance.
- Communication.
- Finance and stewardship (conditional).
- Reporting and audit.

These are business capability boundaries, not a mandate to create separate deployable services or database schemas.

## 4. Domain modelling guardrails

- Keep Person separate from User Account.
- Keep membership separate from ministry participation.
- Keep positions separate from leadership assignments.
- Preserve assignment history where history matters.
- Keep approval authority separate from reporting relationships.
- Use explicit status transitions and business rules.
- Avoid a universal organisational hierarchy engine until actual requirements demand it.
- Do not add branch entities to the current MVP merely for hypothetical future use.

## 5. API and application boundaries

Subject to the chosen stack:
- Keep transport/controller code thin.
- Validate input at API boundaries.
- Enforce permissions server-side for every protected action.
- Use explicit service/use-case boundaries for business operations.
- Return consistent errors without leaking sensitive details.
- Document API contracts where APIs are used by separate clients.
- Avoid exposing internal database models directly as public contracts.

## 6. Data integrity

- Use migrations for schema evolution.
- Define constraints and indexes based on real query and integrity needs.
- Use transactions for multi-step state changes.
- Consider idempotency for retryable or duplicate-prone operations.
- Preserve financial and audit history; prefer reversals/corrections over destructive edits where appropriate.
- Define retention, export and deletion policies with privacy review.

## 7. Security baseline

- Authentication identifies the actor; authorisation determines allowed actions.
- Apply least privilege and deny-by-default.
- Scope every query and mutation to the authenticated user's permitted data.
- Do not trust client-supplied role, owner or organisation identifiers without server-side validation.
- Protect sensitive records and attachments.
- Audit high-impact actions.
- Use secrets management and environment-specific configuration.
- Test both permitted and forbidden access paths.

## 8. Decisions intentionally deferred

- Final framework and hosting.
- Final database and deployment topology.
- Multi-tenant data model and tenant provisioning.
- Branch representation.
- Payment provider and integration model.
- Mobile application strategy.
- Advanced reporting/analytics architecture.

Decide these only when repository inspection and validated requirements provide sufficient evidence.
