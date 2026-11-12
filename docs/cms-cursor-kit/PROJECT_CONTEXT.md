# Project Context — Church Management System (CMS)

## Product direction

**Confirmed:** CrossLife Mission Network is the first pilot organisation. The strategic direction is to validate a practical implementation with CrossLife first, then assess productisation for other churches.

**Confirmed:** The current MVP is for CrossLife's present single-church operation. CrossLife currently has no branches.

**Confirmed:** Branches may exist in the future. If introduced, they may have local leadership and ministry operations while remaining under senior leadership oversight. This is future context, not current MVP scope.

## Current scope boundary

Do now through discovery:
- Understand current leadership and administration.
- Understand people, visitors and membership.
- Understand current ministries and programmes.
- Understand services, events and attendance.
- Validate communication needs.
- Assess finance and stewardship needs before deciding whether they belong in the MVP.
- Define security, privacy, data and reporting requirements.

Do not build now:
- Branch management or branch dashboards.
- Branch reporting or branch oversight workflows.
- SaaS subscriptions, billing or self-service church onboarding.
- Complex denominational governance.
- Features copied from another church product without a CrossLife business case.

## Organisational baseline

Use the hierarchy and positions published on the official CrossLife website as the initial baseline. The user has explicitly said that the website hierarchy is the intended reference. Do not invent a different hierarchy.

Official reference pages:
- https://crosslife.live/leadership.php
- https://crosslife.live/ministries.php
- https://www.crosslife.live/

The website is a starting source, not proof of all internal reporting lines, approval limits or system access rights. Validate details not stated there. Do not infer that a public title grants access to every system module.

Published ministry examples include School of Christ Academy, The FORGE Ministry, Beacon of HOPE Ministry and Life Worshippers. Validate current status, terminology and operational relationships before modelling them as fixed system categories.

## Product principles

- MVP-first and ground-up.
- Business process before database design.
- Configure organisation-specific differences rather than hard-coding them.
- Avoid premature abstraction and overengineering.
- Prefer a modular monolith unless repository evidence or requirements justify another approach.
- Separate people, accounts, membership, ministry participation, leadership assignments and permissions.
- Protect sensitive information with least privilege and auditability.
- Use FundFlow as a source of engineering lessons, not as a design to copy wholesale.

## Status of requirements

The initial charter/workshop pack is a proposal and discovery aid, not an approved complete scope. Requirements must be validated with CrossLife process owners and authorised leadership.

## Known project artefacts

- Project charter and Workshop 1 pack: initial draft; revise to reflect the current single-church MVP and defer branch management.
- Product BRD: to be developed.
- CrossLife Pilot BRD: to be developed from discovery.
- Process maps and requirements registers: to be populated during discovery.
