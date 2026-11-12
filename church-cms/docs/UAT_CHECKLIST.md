# CrossLife pilot — UAT checklist

**Source:** MVP acceptance snapshot in `docs/CMS_Business_Analysis/01_product/02_MVP_SCOPE_SHEET.md` §8  
**Pilot church:** CrossLife Mission Network (configuration / fixtures only — not production seed)  
**Auth:** Until ADR-0002 is Accepted, API UAT uses signed-off **dev headers** in a non-production environment only.

Legend: **Pass** / **Fail** / **Blocked** / **Deferred (known gap)**

| # | Criterion | API / area available now | Result | Notes |
|---|---|---|---|---|
| 1 | Admin can configure church structure (departments/ministries/programmes) without code changes for labels | `/organisational-units`, programmes; `/churches/current` + `/settings` | | |
| 2 | Leadership appointments (Senior Pastor appoint/remove) | `/positions`, `/appointments`, `/appointments/{id}/end` | | |
| 3 | People create/read/update | `/people`, `POST /people/{id}/contacts` | | |
| 4 | Households + members | `GET/POST /households`, `GET/PATCH /households/{id}`, members, children | | |
| 5 | Membership statuses visitor/active/inactive + me | `GET/POST /memberships`, `GET /memberships/{id}`, `POST /memberships/{id}/status`, `/memberships/me` | | |
| 6 | Membership approval by pastoral + admin leaders | `/membership-applications` (+ `/decision`), `/memberships/[id]` status + `/status-history` | | |
| 7 | Ministry join (multi) + leader decision + pastoral visibility | `/participation-requests`, `/participation-requests/me`, decision, participations | | |
| 8 | Events calendar + registration | `/events`, event-types (incl. Sunday Service), posters, `/events/{id}/registrations` (+ `/me` cancel); admin UI `/events` | | |
| 9 | Attendance: QR, headcount, roll call, aggregates, absence, family views, nudges | Sessions + headcount/roll-call + day aggregates + QR + absence + corrections; `GET /attendance/me` (calendar/band/suggestedNudge), `GET /attendance/family`, `GET /attendance/stats/leadership`; family/nudge UI TBD | | |
| 10 | Projects with period/goal (+ optional money link) | `/projects`, assignments, contributions, `/projects/{id}/interest`, interest decision | | |
| 11 | Accounting: funds, CoA/accounts, years, journals post, dual-control intent | `/funds`, `/financial-years` (+ `/close`), `/journals` (+ `/post`, `/reverse`) | | |
| 12 | Offerings + pledges + follow-ups + applications (manual; gateway deferred) | `/offerings` (+ post), `/pledges`, follow-ups, `/pledges/{id}/applications`, `/pledges/unpaid` | | |
| 13 | Member cannot access finance | RBAC deny on finance perms | | |
| 14 | Expenses dual-control + auto journal + leadership reports (incl. R-SP-03, R-FIN-01, unit packs) + budgets + appointment requests + minutes + saved reports + SP delegation | `/expenses` (+ `/post`), `/approval-requests`, `/reports/*`, `/budgets`, `/appointment-requests`, `/meeting-minutes`, `/saved-reports`, `/delegations` | | Free-form designer still deferred |
| 14b | Announcements DEC-032: audiences, church-wide submit → approval, unit publish / publish_direct | `/announcements`, submit, publish, `/announcements/{id}/reject`, `/approval-requests` | | |
| 15 | Message templates + announcements + communication preferences | `/message-templates`, announcements, `/communication-preferences/me` | | |
| 16 | SMS/WhatsApp leadership blasts via **Briq** + delivery webhooks | `/message-jobs`, `/dispatch`, `/webhooks/briq`; stub OK without keys | | Set `NOTIFY_PROVIDER=briq` + Briq env for live |
| 17 | Excel member import (validate → preview → commit) | `/imports/members`, validate, preview, commit | | |
| 18 | Portal self-edit (phone/email/photo/language/directory opt-in) | `GET/PATCH /people/me` | | Portal UI polish TBD |
| 19 | Opt-in directory (name + photo + ministry only) | `GET /directory` | | |
| 20 | UI English + Swahili | Not started | Deferred | |
| 21 | Cross-church isolation (other tenant → 404) | RLS + service tests; re-run on pilot DB | | |
| 22 | RBAC matrix matches product docs for exercised endpoints | Seed roles (`church_administrator`, `member`, `finance_officer`) + permission checks; `GET /roles`, role-assignments | | See API_PATH_ALIASES.md for actor IDs |
| 23 | Audit of high-impact actions visible/queryable | `GET /audit-events` (`audit:read`); metadata sanitized | | |
| 23b | CSV exports (people / attendance / finance) as permitted | `POST /exports` (`exports:run` + domain read) | | Date range required for attendance/finance |
| 24 | Real login (no `x-dev-*`) | Member: email or phone + PIN; Admin: PIN then OTP; seed via `pnpm db:seed:auth` | Ready | TOTP apps deferred |

## Sign-off

| Role | Name | Date | Outcome |
|---|---|---|---|
| CrossLife authorised representative | | | Accept / Accept with gaps / Reject |
| Project owner | | | |
| Engineering witness | | | |

Agreed deferred gaps carried into pilot (list IDs): _______________
