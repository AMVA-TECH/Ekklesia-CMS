# Product Decision Log

Record each decision with ID, date, decision owner, context, options considered, decision, rationale, affected requirements and review trigger.

## Current decisions

### DEC-001 — Generic multi-church product
**Decision:** Product is a reusable Church Management System, not a CrossLife-branded product.
**Rationale:** CrossLife is the first pilot case study; future churches must be supported.
**Impact:** Church-specific titles, units and policies must be configurable.

### DEC-002 — CrossLife is the first pilot
**Decision:** Use CrossLife to validate the product's first operational model.
**Rationale:** Real case study provides a grounded pilot.
**Impact:** Keep public observations distinct from validated internal policies.

### DEC-003 — No CrossLife branch functionality in MVP
**Decision:** CrossLife currently has no branches; do not implement branch-management workflows in the pilot MVP.
**Rationale:** Avoid premature complexity.
**Impact:** Generic organisational-unit flexibility may be retained, but branch screens/reports are excluded.

### DEC-004 — Two connected first-release experiences
**Decision:** Provide Church Administration and a practical Member Portal.
**Rationale:** Church operations and member self-service are both core to a usable CMS.
**Impact:** Shared person, membership, unit, event and attendance domains.

### DEC-005 — Social network deferred
**Decision:** Facebook-like member social features are a later, separately scoped but integrated application.
**Rationale:** Keep first release focused on foundational administration and membership operations.
**Impact:** No first-release feed, posts, comments, reactions, friend graph, direct messages, group chat or stories. Preserve stable APIs and identity boundaries.

### DEC-006 — Analysis before schema and implementation
**Decision:** Validate business processes, authority, data ownership and access rules before finalising physical schema.
**Rationale:** Avoid encoding unverified assumptions into code and migrations.
**Impact:** Current domain model is conceptual only.

### DEC-007 — CrossLife public baseline source
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** CrossLife public organisational facts (identity, published leadership, ministries, contacts) are approved from https://www.crosslife.live/ and related public pages. Website facts are the baseline; they are not automatic confirmation of internal workflows.  
**Impact:** Do not invent hierarchy beyond the published list; keep titles separate from system permissions.

### DEC-008 — Leadership appointment authority
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** The Senior Pastor appoints and removes leaders.  
**Impact:** Appointment/removal workflows require Senior Pastor authority; audit those actions.

### DEC-009 — Pastoral leadership and optional Board of Elders
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Earlier “Pastoral Board” wording meant **pastoral leadership** — the church pastors who pastor different aspects — not a separate named board entity for CrossLife. Some churches also have a Board of Elders; the product must support that as an optional configurable governance body. CrossLife pastoral leadership is led by the Senior Pastor and includes the church’s pastors (baseline from the public leadership list).  
**Impact:** Prefer “pastoral leadership” language for CrossLife; do not invent a formal Pastoral Board roster. Support Board of Elders where a church configures one.

### DEC-010 — Reporting line
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Department/office heads and ministry heads report to pastoral leadership led by the Senior Pastor.  
**Impact:** Org reporting for the pilot follows heads → pastoral leadership → Senior Pastor.

### DEC-011 — Office, department, ministry and programme classification
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Office and department are the same concept (aliases). Ministries are the individual units of the church (e.g. men’s, women’s, family). **Programmes are what a ministry delivers** (offerings/activities under that ministry). Churches must be able to add offices/departments and ministries when missing.  
**Impact:** Unit taxonomy: department/office ↔ ministry ↔ programme (delivered by ministry). Seed CrossLife’s published units as configuration.

### DEC-012 — Membership model, statuses and approval
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Membership may be **individual**, **household**, or **family-based**. Core statuses: **visitor**, **active**, **inactive**. Membership approval is performed by pastoral leadership together with administrative leaders (Church Administrator and GS/POGS).  
**Impact:** Person + household/family membership; status machine starts with visitor/active/inactive; approval roles include pastoral and admin/secretariat leaders.

### DEC-013 — Finance controls
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Finance is an independent department with strict credentialed access for day-to-day posting (CrossLife operational finance role: Nancy Mollel). Senior Pastor and pastoral leadership (and Board of Elders where configured) have read access plus approval access for both reports and disbursements — not routine transaction entry.  
**Impact:** Separate finance write credentials from oversight/approval roles; enforce least privilege and audit approvals.

### DEC-014 — Member directory privacy (launch)
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** At launch, the member directory shows name, photo and ministry on an opt-in basis. Phone, address, giving, attendance of others and pastoral notes stay out of the directory.  
**Impact:** Portal directory is consent-gated and limited to name + photo + ministry.

### DEC-015 — Attendance recording approach (superseded by DEC-031)
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Originally: headcount + roll call; QR deferred.  
**Superseded by:** DEC-031.

### DEC-031 — Attendance: QR, multi-service, progress, absence, family, children’s headcount
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:**
1. **QR check-in** is in scope for service/session attendance (member QR and/or session QR; signed tokens).
2. Attendance is tied to **service/session**, not to “has an account”. **Anyone can QR-scan a session code** without logging in: the flow collects **name + phone**; system tries to match an existing `Person` by phone (E.164) in the church, else creates/links a visitor `Person` + contact and writes `AttendanceRecord`. Account holders get richer portal progress; ushers may still assist lookup/scan.
3. **Multiple services** the same day (or same gathering series) each have a session; results **aggregate** to day/series totals and statistical breakdowns (by service, unit, demographics where data exists).
4. **Account holders — progress tracker:** calendar-based attendance history, gentle **grade/progress** indicators, reminders, encouragement, motivation, and congratulations (notification templates). Not punitive spiritual scoring.
5. **Leadership follow-up:** individual attendance progress and statistics for pastoral/admin follow-up and help (permission-scoped; Confidential).
6. **Absence notice:** if attendance (e.g. Sunday) is not possible, member (or household primary) can submit notice + reason; administration receives it as part of tracking (`AbsenceNotice`).
7. **Family attendance:** track household-level attendance **in relation to** individual records (who of the adults checked in; children via children’s headcount or household linkage).
8. **Children’s ministry (when that unit/programme exists):** **headcount** only, recorded by **qualified/accepted** ministry leaders or teachers responsible — not open to all ushers. Full children’s check-in/safeguarding module still not required for MVP beyond this headcount path.

**Impact:** Extend attendance domain (QR, aggregates, absence notices, family views, encouragement jobs); update algorithms, API, RBAC; children’s ministry headcount is conditional on unit existing.

### DEC-032 — Announcement approval and targeting
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Church-wide announcements require publish approval by SP, pastoral leadership, or Church Admin (SP/pastoral may publish direct). Unit leaders may publish to **their own unit** without extra approval. Targeting: `all_members` or `organisational_unit`. See `13_ANNOUNCEMENTS_AND_DELEGATION.md`.  
**Impact:** Closes OQ-015.

### DEC-033 — Delegation when Senior Pastor is away
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Model temporary **Delegation** (typically to Associate Pastor) with time bounds and a subset of SP powers. Default grant: membership approve, church-wide announcement publish, disbursement approve (dual-control intact). Default **exclude:** appoint/remove leaders, role assign, journal posting — unless SP explicitly includes them. All delegated actions audited.  
**Impact:** Continuity without permanent title change; aligns with public Associate Pastor continuity description.

### DEC-034 — Leadership report catalogue
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Adopt report set in `14_LEADERSHIP_REPORT_CATALOGUE.md` for SP/pastoral, admin/POGS, unit leaders, finance, children’s headcount, and member self-attendance.  
**Impact:** Closes OQ-019.

### DEC-016 — Household children (minors deferred)
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Full minor membership, guardian portal access and safeguarding workflows are **out of scope for now**. Households may record **children who are in the church** with **name and age only** (simple linked child records, not full member accounts).  
**Impact:** No minor login/guardian self-service in MVP; child name+age on household is enough for now.

### DEC-017 — Ministry join-request approval
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Ministry join requests are approved by that ministry’s leaders. Senior Pastor (pastoral leadership) also receives a report or notification of the request/outcome — oversight visibility, not the primary approver.  
**Impact:** Approval authority is scoped to the ministry; notify pastoral leadership for awareness.

### DEC-018 — Member self-edit of profile (exact launch list)
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Members may edit these own profile fields at launch: **phone, email, photo, preferred language, directory opt-in**. Membership status, roles, appointments, ministry leadership, giving and attendance corrections that change official records remain admin/pastoral-controlled (attendance correction = request only).  
**Impact:** Portal self-edit limited to the listed fields.

### DEC-019 — Household shared fields
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Households support a **shared address** and **emergency contact**.  
**Impact:** Household entity carries address + emergency contact in addition to linked people/children.

### DEC-020 — Projects vs programmes
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** **Programmes** are what a ministry delivers. **Projects** are temporary or ongoing activities announced to accomplish a goal in a given period; they may be tied to money (fundraising/budget).  
**Impact:** Model projects with timeframe/goal; allow optional financial linkage; keep distinct from ministry programmes.

### DEC-021 — Launch languages
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** **English and Swahili** are both required at pilot launch.  
**Impact:** All user-facing text through i18n from the start; no English-only MVP.

### DEC-022 — Multiple ministry memberships
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** A person may belong to **multiple ministries** at the same time.  
**Impact:** Participation is many-to-many; join/leave and approvals are per ministry.

### DEC-023 — CrossLife data is mock/test only
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Do **not** seed CrossLife organisational or people data into production defaults. CrossLife public information may be used as **mock/fixture data for development and testing only**.  
**Impact:** Empty/configurable church setup at runtime; CrossLife fixtures confined to test/dev.

### DEC-024 — Full church accounting in MVP
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** MVP includes a full church accounting module (CoA, funds, double-entry journals, fiscal periods, budgets, disbursement approvals, stewardship reports), not access controls alone.  
**Impact:** See `04_domain_and_data/06_ACCOUNTING_MODULE.md`. Member portal has no finance access. Mobile-money gateway remains deferred.

### DEC-025 — Offerings and pledges in MVP
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Manual offerings/income entry, pledges vs actual, unpaid lists, and follow-up logs are in MVP. Payment method may include mobile money without a live wallet gateway.  
**Impact:** Pledge and offering entities in catalog/ERD; gateway webhooks later.

### DEC-026 — SMS and WhatsApp messaging in MVP
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** MVP messaging channels are **SMS and WhatsApp**, including templates, bulk send, delivery logs, consent/preferences, and automatic **visitor thank-you SMS**.  
**Impact:** Closes OQ-018 for launch channels; see `07_MESSAGING_MODULE.md`.

### DEC-027 — Excel member import in MVP
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Admin Excel member import (validate → preview → commit) is in MVP.  
**Impact:** `ImportJob` / `ImportRowResult` in data model; permission `imports:run`.

### DEC-028 — Member profile layers and adult registration
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** Every **adult** is registered individually (Person + Membership) and has a portal **UserAccount**. Households represent family/married links (with or without children as name+age). Member profile also includes optional **life group / jumuiya / small group** participation and zero-or-more **ministry** participations — these are separate layers, not collapsed into one field.  
**Impact:** Elevate `OrganisationalUnit.kind = life_group` to MVP; profile UI/API assembles person + account + membership + household + life_group + ministries.

### DEC-029 — Single age cutoff at 18 (MVP)
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:** For MVP, use one age rule. Prefer `date_of_birth` on `Person` (else recorded age):
- **Under 18:** recorded on household as `HouseholdChild` (name + age only) — no individual Membership, no portal account. Not a children’s-ministry module (still out of MVP). They may still be present in **main masses** (e.g. headcount attendance) without a full member profile.
- **18+:** individual `Person` + `Membership` + portal `UserAccount` (Tanzania age of majority).

**Rationale:** Keep registration simple for pilot. Finer youth bands (e.g. 15–17 individual Person without portal) can be added later if needed; thresholds remain configurable.
**Impact:** MVP adult registration and accounts start at 18 only.

### DEC-030 — Household naming and single-parent households
**Date:** 2026-11-07  
**Decision owner:** Product owner  
**Decision:**
- **Display name:** auto-suggest from adult members; editable; **not unique** (many “Mushi Family” / “Juma” households allowed).
  - One adult: `{PrimaryAdult display/family name} Household` (e.g. “Neema Mushi Household”).
  - Two+ adults with same family name: `{FamilyName} Family` (e.g. “Kyamba Family”).
  - Two+ adults with different names: `{Adult1} & {Adult2} Household` (e.g. “Neema Mushi & John Kimaro Household”).
  - **Unique identifiers** are UUIDs only (`person.id`, `household.id`). Names, last names, and household labels are never primary keys and never uniqueness constraints. Disambiguate in UI with phone, address, or member number — not by forcing unique surnames.
- **Household is optional** for a solitary adult with no dependants; recommended when there is a spouse/partner, co-adult, or under-18 child.
- **Single parent:** one adult `HouseholdMember` (relationship `parent` / `guardian`) + one or more `HouseholdChild`; no second adult required. Primary contact = that parent.
- **Guardian who is not a biological parent:** same pattern; relationship `guardian` on `HouseholdMember`.
- Do not invent a missing spouse record.

**Impact:** Naming is UX/label; linking is via HouseholdMember / HouseholdChild. Single-parent and guardian households are first-class.
