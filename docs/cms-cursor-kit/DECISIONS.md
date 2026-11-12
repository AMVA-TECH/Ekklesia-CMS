# Decision Register — Church Management System (CMS)

Use statuses: Confirmed, Proposed, To validate, Deferred, Rejected.

| ID | Decision | Status | Rationale / consequence |
|---|---|---|---|
| DEC-001 | CrossLife is the first pilot organisation. | Confirmed | Validate in a real operating environment before productisation. |
| DEC-002 | Long-term direction is a reusable product for other churches. | Confirmed | Keep organisation-specific settings distinct from shared capabilities where practical. |
| DEC-003 | Current MVP is for CrossLife's present single-church operation. | Confirmed | Focus discovery and delivery on current needs. |
| DEC-004 | CrossLife currently has no branches; branch-management workflows are excluded from the MVP. | Confirmed | Do not build branch screens, dashboards, reports or oversight workflows now. |
| DEC-005 | Future branches may have local leadership and operational autonomy while remaining under senior leadership oversight. | Confirmed as future context | Preserve as a future consideration; do not implement now. |
| DEC-006 | Use the official CrossLife website's published leadership hierarchy as the initial baseline. | Confirmed | Do not invent a different hierarchy; validate unstated reporting and approval relationships. |
| DEC-007 | Person and login account are separate concepts. | Proposed design principle | Avoid requiring every recorded person to have platform credentials. |
| DEC-008 | Church titles do not automatically determine software permissions. | Proposed design principle | Build permissions around actual duties and approved access needs. |
| DEC-009 | A modular monolith is the default starting architecture. | Proposed | Reassess after inspecting repository and validated requirements. |
| DEC-010 | Final stack, hosting, tenant model and payment integration are not yet decided. | Deferred | Decide based on evidence and actual pilot needs. |
| DEC-011 | CrossLife public baseline is approved from https://www.crosslife.live/. | Confirmed | Website = org baseline, not automatic internal-process proof. |
| DEC-012 | Senior Pastor appoints and removes leaders. | Confirmed | Appointment workflows and audit centre on SP authority. |
| DEC-013 | Pastoral leadership = church pastors (not a separate “Pastoral Board”); optional Board of Elders supported. | Confirmed | Corrected terminology; CrossLife uses pastoral leadership led by SP. |
| DEC-014 | Dept/office and ministry heads report to pastoral leadership led by Senior Pastor. | Confirmed | Pilot reporting line. |
| DEC-015 | Office = department; ministry = church unit; programme = what a ministry delivers; churches can add units. | Confirmed | Configurable taxonomy. |
| DEC-016 | Membership: individual / household / family; statuses visitor, active, inactive; approval by pastoral + admin (Admin, GS/POGS). | Confirmed | Core membership model. |
| DEC-017 | Finance independent with strict write credentials; SP/pastoral leadership read + approve reports and disbursements. | Confirmed | Ops posting ≠ oversight approval. |
| DEC-018 | Launch directory: opt-in name + photo + ministry. | Confirmed | No phone/address/giving/others’ attendance in directory. |
| DEC-019 | Attendance: headcount + roll call; own history in portal; QR later. | Confirmed | Dual-mode attendance baseline. |
| DEC-020 | Household children: name + age only for now; full minor/guardian membership deferred. | Confirmed | No minor portal in MVP. |
| DEC-021 | Ministry join approved by that ministry’s leaders; SP/pastoral leadership get notification/report. | Confirmed | Scoped approval + oversight visibility. |
| DEC-022 | Member self-edit: phone, email, photo, language, directory opt-in. | Confirmed | Status/roles remain controlled. |
| DEC-023 | Household has shared address and emergency contact. | Confirmed | Household-level fields. |
| DEC-024 | Projects = time-bound goal activities (may involve money); distinct from ministry programmes. | Confirmed | Separate project model. |
| DEC-025 | English and Swahili required at pilot launch. | Confirmed | i18n from day one. |
| DEC-026 | A person may belong to multiple ministries. | Confirmed | Many-to-many participation; per-ministry approval. |
| DEC-027 | CrossLife data is not production seed; use as mock/fixtures for build and test only. | Confirmed | Configurable empty church; fixtures in test/dev only. |
| DEC-028 | Full church accounting module in MVP (CoA, journals, funds, disbursements, reports). | Confirmed | Admin only; gateway deferred. |
| DEC-029 | Offerings and pledges in MVP (manual + payment method). | Confirmed | Unpaid list + follow-ups. |
| DEC-030 | SMS + WhatsApp messaging incl. visitor thank-you SMS. | Confirmed | Consent-aware; closes channel choice for launch. |
| DEC-031 | Excel member import in MVP. | Confirmed | Admin validate → preview → commit. |

## Decision record template

### DEC-XXX — [Short title]
- **Status:** Proposed / Confirmed / To validate / Deferred / Rejected
- **Date:**
- **Decision owner:**
- **Context/problem:**
- **Options considered:**
- **Decision:**
- **Rationale:**
- **Consequences/trade-offs:**
- **Related requirements/tasks:**
