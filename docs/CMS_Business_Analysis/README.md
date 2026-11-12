# Church Management System — Business Analysis Pack

**Purpose:** Business-analysis and system-analysis foundation for a reusable, multi-church Church Management System (CMS), using CrossLife Mission Network as the first pilot case study.

**Status:** Working analysis baseline. This pack is not an approved statement of CrossLife's internal policies and is not a production-ready database specification.

## Start here

1. Read `00_ROOT_AGENT_GUIDANCE.md` before changing anything.
2. Read `01_product/01_PRODUCT_SCOPE_AND_RELEASE_BOUNDARIES.md`.
3. Read `01_product/02_MVP_SCOPE_SHEET.md` for the current pilot MVP baseline.
4. Read the data design pack in `04_domain_and_data/` — start with `03_DATA_PHILOSOPHY.md`, then `08_ERD.md`, `04_LOGICAL_ENTITY_CATALOG.md`, `11_RBAC_AND_PERMISSIONS.md`, `09_DOMAIN_LOGIC_AND_ALGORITHMS.md`, `10_API_ENDPOINT_MAP.md`.
5. Read the CrossLife pilot analysis in `02_crosslife_pilot/`.
6. Read the process catalogue in `03_processes/`.
7. Resolve open questions and record decisions in `07_governance/`.
8. Only after stakeholder validation, convert approved requirements into physical schema (Drizzle) and route implementation.

## Product boundary

The first release contains:
- Church administration and operational management.
- A practical member portal for membership self-service and participation.

A Facebook-like social network is explicitly a later, separately scoped but integratable application. Do not implement social feeds, friendships, direct messaging, stories, reactions or social posting in the first release. Preserve clean integration boundaries and stable identity/member/group/event APIs.

## Evidence labels

Use these labels consistently:
- **CONFIRMED** — explicitly approved by the product owner or validated by the pilot church.
- **OBSERVED** — visible in a public source or existing artefact.
- **INFERRED** — a reasonable interpretation, not yet validated.
- **ASSUMPTION** — temporary working assumption.
- **PROPOSED** — recommended product behaviour awaiting approval.
- **OPEN** — requires discovery or a decision.
- **DEFERRED** — intentionally outside the current release.

Never convert an OBSERVED public website fact into a confirmed internal business process.

## Requirement labels

- **CORE** — shared product capability required across target churches.
- **CONFIGURABLE** — behaviour varies by church and must be configurable.
- **PILOT-SPECIFIC** — required only to support the CrossLife pilot.
- **FUTURE** — valuable but not part of the first release.
- **DEFERRED** — excluded from the current release.
- **REJECTED** — explicitly ruled out.

## Important modelling principles

- A person is not the same thing as a login account.
- A member record is not the same thing as an account.
- A household/family is not the same thing as a member.
- A department, ministry, life group, project, team, committee, office and event are distinct concepts.
- A leadership position is not a person; an appointment connects a person to a position for a period.
- A title does not automatically grant software permissions.
- Membership does not automatically mean ministry membership.
- Attendance is not proof of membership.
- A visitor is not automatically a member.
- An event registration is not an attendance record.
- A church's structure and policies must be configurable; do not hard-code CrossLife titles or assumptions into shared product logic.
- Preserve history for status changes, appointments, membership and participation.
- Every tenant-owned record must be isolated by organisation.
