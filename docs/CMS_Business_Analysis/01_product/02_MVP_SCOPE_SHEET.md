# MVP Scope Sheet — CrossLife Pilot

**Status:** Working product-owner baseline (2026-11-07)  
**Pilot church:** CrossLife Mission Network  
**Public baseline:** https://www.crosslife.live/  
**Authority:** Decisions DEC-007–027 in `07_governance/02_DECISION_LOG.md`  
**Data design pack:** `04_domain_and_data/` — philosophy, conceptual model, catalog, ERD, algorithms, RBAC, API map, accounting, messaging, social extension

This sheet defines the smallest useful first release. Anything not listed as In scope is out unless later approved.

---

## 1. Product intent

Deliver a configurable **Church Administration** app and **Member Portal** for one church (CrossLife), designed so other churches can be configured later without hard-coding CrossLife labels into shared logic.

Context: Tanzania · phones-first · **English + Swahili** at launch.

---

## 2. Experiences in MVP

### A. Church administration
- Church profile and operating settings
- Configurable structure: **departments/offices** (same concept), **ministries**, **programmes**
- Leadership positions and appointments (Senior Pastor appoints/removes leaders)
- Pastoral leadership (church pastors); optional **Board of Elders** for churches that use one
- People records; households/families; Excel **member import**
- Membership: individual / household / family-based; statuses **visitor · active · inactive**
- Membership approval by pastoral leadership + admin leaders (Church Administrator, GS/POGS)
- Ministry setup, leaders, join requests, multi-ministry participation
- Events/services calendar and registration (event types configurable)
- Attendance: **QR check-in**, headcount, roll call; multi-service day aggregates + breakdowns; absence notices; family attendance views; member progress/encouragement; leadership follow-up stats; children’s ministry **headcount** by accepted leaders/teachers when that unit exists
- Projects: time-bound (or ongoing) goal activities; may be money-linked
- Announcements
- **Full church accounting** — CoA, funds, journals, periods, budgets, disbursement approvals, reports
- **Offerings & pledges** — manual entry; pledges vs actual; follow-up logs; payment method incl. mobile money (gateway deferred)
- **SMS & WhatsApp** messaging — templates, bulk send, visitor thank-you SMS, delivery logs
- Accounts, roles, scoped permissions (RBAC), audit of high-impact actions
- Operational + finance reports; exports as permitted

### B. Member portal
- View own membership and household (within policy)
- Edit own: **phone, email, photo, language, directory opt-in**
- Opt-in directory: **name + photo + ministry** only
- Discover ministries; request to join; track request (multi-ministry allowed)
- Discover events; register/cancel within policy
- View own attendance calendar/progress; receive remind/encourage/congratulate; submit **absence notice** with reason; request correction
- Discover projects / volunteering where enabled
- View relevant announcements
- Manage communication preferences (SMS/WhatsApp opt-in)
- **No** finance, pledges admin, import, or role admin access

---

## 3. Core business rules (MVP)

| Area | Rule |
|---|---|
| Org taxonomy | Office = department. Ministry = church unit. Programme = delivered by a ministry. Church can add departments/ministries. |
| Reporting | Department/ministry heads → pastoral leadership → Senior Pastor |
| Appointments | Senior Pastor appoints/removes leaders |
| Membership types | Individual, household, or family-based |
| Membership statuses | Visitor, active, inactive |
| Membership approval | Pastoral leadership + Administrator + GS/POGS |
| Ministry join | Approved by **that ministry’s leaders**; pastoral leadership gets notification/report |
| Adult registration | Each adult (**18+**): Person + Membership + portal UserAccount |
| Age (MVP) | Single cutoff **18** — under 18 = household child (name+age); may still appear in main-mass headcount. Finer youth bands later if needed. |
| Children’s ministry | Out of MVP |
| Member profile | Assembled from: person · account · membership · household/family · life group/jumuiya · ministries (0..n) |
| Life group | `life_group` unit kind (small group / jumuiya — same idea); optional participation |
| Participation | One person may join **multiple** ministries; life group separate from ministry |
| Household | Optional if solitary adult; shared **address** + **emergency contact**; children name+age; **single parent/guardian** OK (one adult + kids) |
| Household name | Auto-suggest from adults; editable; **not unique** (last names can repeat); unique id = UUID only |
| Minors | Full minor membership / guardian portal **deferred** |
| Directory | Opt-in name + photo + ministry; no phone/address/giving/others’ attendance |
| Attendance | QR + headcount + roll call; **guests without accounts scan session QR and enter name + phone** (match/create visitor Person); multi-service aggregate; absence notices; family vs individual; encouragement for account holders; children’s ministry headcount by accepted teachers when unit exists |
| Accounting | Full module; finance writers ≠ sole disbursement approvers; SP/pastoral approve reports & disbursements |
| Offerings/pledges | Manual + method field; gateway deferred |
| Messaging | SMS + WhatsApp; consent-aware; visitor thank-you SMS |
| Import | Admin Excel member import |
| Titles vs permissions | Church title ≠ automatic system permission |
| Languages | English and Swahili |
| Person identity | Global Person; church via membership |
| Tenancy | Single-church pilot now; multi-church ready isolation |

---

## 4. CrossLife reference (mock/test only — not production seed)

Do **not** ship CrossLife people, ministries, finance roles or hierarchy as default production seed data. The product starts empty/configurable for each church.

CrossLife public website facts may be used as **mock/fixture data while building and testing** (synthetic where needed for privacy).

---

## 5. Explicitly out of MVP

- Social feed, posts, comments, reactions, friends, DMs, stories
- Branch management / branch dashboards / branch reporting
- Full minor membership, guardian accounts, safeguarding workflows
- Full children’s safeguarding suite (classes, parent verify pickup) beyond headcount by accepted teachers
- Punitive “spiritual scoring” from attendance
- Live mobile-money **gateway** / auto-reconciliation
- Member portal giving history (until gateway)
- SaaS multi-church self-onboarding / billing
- Payroll / HR
- Using attendance to score or punish spiritual life

---

## 6. Suggested delivery sequence

1. Foundation — auth, RBAC, audit, church config, i18n (EN/SW)
2. People & households — persons, household address/emergency contact, child name+age
3. Membership — visitor/active/inactive; approval workflow
4. Structure & leadership — departments/ministries/programmes; appointments
5. Ministry participation — multi-join; leader approval; pastoral notification
6. Events & attendance — headcount + roll call; own history in portal
7. Projects — goals, period, optional money link
8. Accounting + offerings/pledges — journals, disbursements, dual control
9. Messaging — SMS/WhatsApp, visitor thank-you, bulk send
10. Excel import
11. Portal polish — directory opt-in, profile self-edit, announcements, preferences
12. Pilot hardening — reports, audit, UAT

---

## 7. Still OPEN (resolve before related module)

| ID | Topic |
|---|---|
| OQ-011 | Event/service classification detail (EventType table exists; codes TBD) |
| OQ-021 | Data retention / deletion periods |
| OQ-022 | Final must-have vs later cut if schedule slips |

**Closed in this pack:** OQ-015, OQ-018, OQ-019, OQ-020.

---

## 8. Acceptance snapshot

MVP is ready for pilot UAT when:
- Admin can configure church structure and leadership without code changes for labels
- People, households, membership statuses and approvals work end-to-end
- Ministry join (multi) works with leader approval + pastoral notification
- Attendance supports QR, headcount, roll call, day aggregates, absence notices, family views, member progress nudges, leadership stats
- Projects can be created with period/goal (and optional money link)
- Full accounting dual-control and pledge/offering flows work; member cannot access finance
- SMS/WhatsApp send + visitor thank-you + Excel import work with audit
- Portal self-edit, preferences, and opt-in directory match decisions
- UI available in English and Swahili
- Cross-church isolation tests pass
- RBAC matrix and API map behaviours match `11` and `10`
