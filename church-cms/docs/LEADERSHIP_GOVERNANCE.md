# Leadership reporting & approvals

Aligns with `14_LEADERSHIP_REPORT_CATALOGUE.md`, DEC-013, DEC-033.

## Coverage

| Area | What |
|---|---|
| Approvals inbox | Expenses + church-wide announcements submit → dual-control approve/reject |
| Auto journal on approve | If `accountId` + `paymentAccountId` set → posts balanced journal → expense `posted` |
| Appointment **requests** | Nominate → SP decide → creates Appointment |
| Meeting **minutes** | Draft/publish minutes (church or unit-scoped) |
| Budgets | Monthly / quarterly / yearly + lines |
| Money flow | Income vs expenses, funds, disbursements |
| Attendance overview | Day aggregates + sessions (`R-SP-02`); finalize upserts day aggregates |
| Follow-up bands | `R-SP-03` / `R-UNIT-04` — consistent / irregular / missing |
| Unit packs | `R-UNIT-01` roster, `R-UNIT-03` sessions, `R-UNIT-04` engagement |
| Trial balance | `R-FIN-01` from posted journals (`from`/`to` required) |
| Custom reports | Saved catalogue views (`/saved-reports`) — not free-form SQL |
| QR / absence | Issue QR on session; public `/attendance/check-ins`; `/absence-notices` |
| Member progress | `GET /attendance/me` calendar + band + suggestedNudge |
| Family attendance | `GET /attendance/family` (household day status full/partial/absent/notice) |
| Leadership stats API | `GET /attendance/stats/leadership` (same bands as R-SP-03) |
| Delegations | SP temporary grants |

## Still deferred

| Area | Notes |
|---|---|
| Free-form report designer | Out of MVP — use saved catalogue views |
| R-ADM-02/04/05, R-CHILD-*, R-ME-* | Broader admin/member packs |
| Attendance correction UI | APIs done (`/attendance/correction-requests`); portal UI TBD |
| Projects admin API | **Done** — `/projects`, assignments, contributions, member interest + decision |
| Pledge applications | **Done** — link posted journal; unpaid list |
| WhatsApp template cold outreach | Separate |

## Key APIs

- `GET /reports` · `GET /reports/{id}`
- `POST/GET /saved-reports` · `POST /saved-reports/{id}/run`
- `POST/GET /budgets` · `POST/GET /appointment-requests` · `POST/GET /meeting-minutes`
- `POST /expenses` · submit · `POST /expenses/{id}/post` · `/approval-requests`
- `POST /announcements` (audiences) · `POST /announcements/{id}/submit` · publish (unit or `publish_direct`)
- `POST /offerings` · `POST /offerings/{id}/post` (or create with `post:true`)
- `POST /attendance-sessions/{id}/qr` · `POST /attendance/check-ins` · `/absence-notices`
