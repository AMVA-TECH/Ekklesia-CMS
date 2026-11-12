# 10 — API Endpoint Map (`/api/v1`)

**Status:** Working MVP catalogue  
**Aligns with:** `docs/03-api-architecture.md`, `11_RBAC_AND_PERMISSIONS.md`, `09_DOMAIN_LOGIC_AND_ALGORITHMS.md`  
**Rules:** JSON · strict Zod · `church_id` from session/`Ctx` only · cross-church → 404 · cursor pagination · problem+json errors · thin handlers → services

**Actors:** A = admin/staff roles · M = member · B = both · P = public  

**Idempotent?** = Idempotency-Key required on POST when Yes.

---

## 1. Auth & session

| Method + path | Actor | Permission / scope | Idempotent? | Notes |
|---|---|---|---|---|
| `POST /auth/login` | P | — | No | Rate-limited; no account enumeration |
| `POST /auth/logout` | B | authenticated | No | |
| `GET /auth/me` | B | authenticated | — | Actor + active church + roles |
| `POST /auth/active-church` | B | must belong | Yes | Audited church switch |

---

## 2. Churches & settings

| Method + path | Actor | Permission | Idempotent? | Notes |
|---|---|---|---|---|
| `GET /churches/current` | B | `church:read` | — | Active church profile |
| `PATCH /churches/current` | A | `church:update` | No | |
| `GET /churches/current/settings` | A | `church:read` | — | |
| `PATCH /churches/current/settings` | A | `church:update` | No | |

---

## 3. People, contacts, households

| Method + path | Actor | Permission | Idempotent? | Notes |
|---|---|---|---|---|
| `GET /people` | A | `people:read` | — | Cursor + filters |
| `POST /people` | A | `people:create` | Yes | May create visitor membership |
| `GET /people/{id}` | A/M | `people:read` / self | — | DTO field-filtered |
| `PATCH /people/{id}` | A/M | `people:update` | No | Member: locked field list only |
| `GET /people/me` | M | self | — | |
| `PATCH /people/me` | M | self update fields | No | phone, email, photo, locale, directory_opt_in |
| `POST /people/{id}/contacts` | A/M | update | Yes | |
| `GET /households` | A | `households:read` | — | |
| `POST /households` | A | `households:write` | Yes | address + emergency contact |
| `GET /households/{id}` | A/M | read / household scope | — | |
| `PATCH /households/{id}` | A | `households:write` | No | |
| `POST /households/{id}/members` | A | `households:write` | Yes | |
| `POST /households/{id}/children` | A | `households:write` | Yes | name + age only |
| `GET /directory` | B | `directory:read` | — | Opt-in name, photo, ministries |

---

## 4. Memberships

| Method + path | Actor | Permission | Idempotent? | Notes |
|---|---|---|---|---|
| `GET /memberships` | A | `memberships:read` | — | |
| `POST /memberships` | A | `memberships:create` | Yes | |
| `GET /memberships/me` | M | self | — | |
| `GET /memberships/{id}` | A | `memberships:read` | — | |
| `POST /membership-applications` | A/M | create / self apply | Yes | |
| `POST /membership-applications/{id}/decisions` | A | `memberships:approve` | Yes | approve/reject |
| `POST /memberships/{id}/status` | A | `memberships:update_status` | Yes | history appended |
| `GET /memberships/{id}/status-history` | A | `memberships:read` | — | |

---

## 5. Organisation, programmes, appointments

| Method + path | Actor | Permission | Idempotent? | Notes |
|---|---|---|---|---|
| `GET /organisational-units` | B | `units:read` | — | Members: discover ministries |
| `POST /organisational-units` | A | `units:write` | Yes | kind department\|ministry |
| `GET /organisational-units/{id}` | B | `units:read` | — | |
| `PATCH /organisational-units/{id}` | A | `units:write` | No | |
| `GET /organisational-units/{id}/programmes` | B | `units:read` | — | |
| `POST /organisational-units/{id}/programmes` | A | `programmes:write` | Yes | Ministry only |
| `GET /positions` | A | `positions:write` read via units | — | |
| `POST /positions` | A | `positions:write` | Yes | |
| `GET /appointments` | A | `appointments:write` or read | — | |
| `POST /appointments` | A | `appointments:write` | Yes | SP primary |
| `POST /appointments/{id}/end` | A | `appointments:write` | Yes | History |

---

## 6. Participation (ministries)

| Method + path | Actor | Permission | Idempotent? | Notes |
|---|---|---|---|---|
| `GET /organisational-units/{id}/participations` | A | `participations:read` scoped | — | |
| `POST /organisational-units/{id}/participation-requests` | M | `participations:request` | Yes | |
| `GET /participation-requests/me` | M | self | — | |
| `POST /participation-requests/{id}/approve` | A | `participations:approve` | Yes | Notifies pastoral |
| `POST /participation-requests/{id}/reject` | A | `participations:approve` | Yes | |

---

## 7. Events & registrations

| Method + path | Actor | Permission | Idempotent? | Notes |
|---|---|---|---|---|
| `GET /event-types` | A | `events:read` | — | |
| `POST /event-types` | A | `events:write` | Yes | |
| `GET /events` | B | `events:read` | — | |
| `POST /events` | A | `events:write` | Yes | |
| `GET /events/{id}` | B | `events:read` | — | |
| `PATCH /events/{id}` | A | `events:write` | No | |
| `GET /events/{id}/registrations` | A | `events:write` or read | — | |
| `POST /events/{id}/registrations` | M | `events:register` | Yes | |
| `DELETE /events/{id}/registrations/me` | M | `events:register` | No | Cancel |

---

## 8. Attendance

| Method + path | Actor | Permission | Idempotent? | Notes |
|---|---|---|---|---|
| `GET /attendance/sessions` | A | `attendance:read` | — | |
| `POST /attendance/sessions` | A | `attendance:record` | Yes | mode headcount\|roll_call\|qr_mixed |
| `POST /attendance/sessions/{id}/qr` | A | `attendance:record` | Yes | Issue session QR token |
| `POST /attendance/sessions/{id}/check-ins` | P/M | token or `check_in_self` | Yes | Logged-in or **guest: name + phone** |
| `PUT /attendance/sessions/{id}/summary` | A | `attendance:record` | Yes | Headcount |
| `PUT /attendance/sessions/{id}/records` | A | `attendance:record` | Yes | Roll-call batch |
| `GET /attendance/me` | M | self read | — | Calendar/progress |
| `POST /attendance/absence-notices` | M | `attendance:absence_notice` | Yes | Reason required |
| `GET /attendance/stats/leadership` | A | `attendance:stats_leadership` | — | Follow-up |
| `POST /attendance/correction-requests` | M | `attendance:correct_request` | Yes | |
| `POST /attendance/correction-requests/{id}/resolve` | A | `attendance:correct_resolve` | Yes | |

---

## 9. Projects

| Method + path | Actor | Permission | Idempotent? | Notes |
|---|---|---|---|---|
| `GET /projects` | B | `projects:read` | — | |
| `POST /projects` | A | `projects:write` | Yes | Optional fund/budget |
| `GET /projects/{id}` | B | `projects:read` | — | |
| `PATCH /projects/{id}` | A | `projects:write` | No | |
| `POST /projects/{id}/assignments` | A | `projects:assign` | Yes | |
| `POST /projects/{id}/interest` | M | `projects:interest` | Yes | |

---

## 10. Accounting (admin only)

| Method + path | Actor | Permission | Idempotent? | Notes |
|---|---|---|---|---|
| `GET/POST /funds` | A | funds:read/write | POST Yes | |
| `GET/POST /accounts` | A | accounts:read/write | POST Yes | CoA |
| `GET/POST /fiscal-periods` | A | periods:write / journals:read | POST Yes | |
| `POST /fiscal-periods/{id}/close` | A | `periods:write` | Yes | |
| `GET /journal-entries` | A | `journals:read` | — | |
| `POST /journal-entries` | A | `journals:draft` | Yes | |
| `POST /journal-entries/{id}/post` | A | `journals:post` | Yes | Balance check |
| `POST /journal-entries/{id}/reverse` | A | `journals:reverse` | Yes | |
| `GET/POST /disbursement-requests` | A | request/read | POST Yes | |
| `POST /disbursement-requests/{id}/submit` | A | `disbursements:request` | Yes | |
| `POST /disbursement-requests/{id}/approve` | A | `disbursements:approve` | Yes | Segregation |
| `POST /disbursement-requests/{id}/reject` | A | `disbursements:approve` | Yes | |
| `GET/POST /budgets` | A | budgets:read/write | POST Yes | |
| `GET /finance-reports/trial-balance` | A | `finance_reports:read` | — | |
| `GET /finance-reports/fund-balances` | A | `finance_reports:read` | — | |
| `GET /finance-reports/income-expense` | A | `finance_reports:read` | — | |
| `GET /finance-reports/disbursements` | A | `finance_reports:read` | — | |

---

## 11. Offerings & pledges (admin only)

| Method + path | Actor | Permission | Idempotent? | Notes |
|---|---|---|---|---|
| `POST /offerings` | A | `offerings:write` | Yes | Creates/posts income journal |
| `GET/POST /pledges` | A | pledges:read/write | POST Yes | |
| `POST /pledges/{id}/applications` | A | `pledges:write` | Yes | Link receipt |
| `GET /pledges/unpaid` | A | `pledges:read` | — | |
| `POST /pledges/{id}/follow-ups` | A | `pledges:follow_up` | Yes | |

---

## 12. Messaging & announcements

| Method + path | Actor | Permission | Idempotent? | Notes |
|---|---|---|---|---|
| `GET/POST /message-templates` | A | `templates:write` | POST Yes | |
| `POST /message-jobs` | A | `messages:send` or bulk | Yes | |
| `GET /message-jobs/{id}` | A | `messages:send` | — | |
| `GET /message-jobs/{id}/deliveries` | A | `messages:send` | — | |
| `GET/PATCH /notification-preferences/me` | M | `preferences:self` | No | |
| `GET /announcements` | B | member read / admin | — | Published only for members |
| `POST /announcements` | A | `announcements:write` | Yes | Draft |
| `POST /announcements/{id}/submit` | A | `announcements:write` | Yes | Church-wide → pending_approval |
| `POST /announcements/{id}/publish` | A | `announcements:publish` | Yes | Unit-scoped or approver; DEC-032 |
| `POST /announcements/{id}/reject` | A | `announcements:publish` church-wide | Yes | |
| `GET/POST /delegations` | A | SP / admin | POST Yes | DEC-033 |
| `POST /delegations/{id}/revoke` | A | SP / admin | Yes | |
| `GET /reports/{reportId}` | A/M | per catalogue | — | `14_LEADERSHIP_REPORT_CATALOGUE.md` |

---

## 13. Imports

| Method + path | Actor | Permission | Idempotent? | Notes |
|---|---|---|---|---|
| `POST /imports/members` | A | `imports:run` | Yes | Upload → job |
| `POST /imports/{id}/validate` | A | `imports:run` | Yes | |
| `GET /imports/{id}/preview` | A | `imports:run` | — | |
| `POST /imports/{id}/commit` | A | `imports:run` | Yes | |

---

## 14. Access control & audit

| Method + path | Actor | Permission | Idempotent? | Notes |
|---|---|---|---|---|
| `GET /roles` | A | `roles:read` | — | |
| `POST /role-assignments` | A | `roles:assign` | Yes | Audited |
| `DELETE /role-assignments/{id}` | A | `roles:assign` | No | |
| `GET /audit-events` | A | `audit:read` | — | Filtered; no Restricted leakage |
| `POST /exports` | A | `exports:run` | Yes | People/attendance/finance as permitted |

---

## 15. Media & health

| Method + path | Actor | Permission | Idempotent? | Notes |
|---|---|---|---|---|
| `POST /media/uploads` | B | `media:upload` / self photo | Yes | Returns upload URL or asset |
| `GET /health` | P | — | — | No data |

---

## 16. Explicitly out of MVP API

- Social feed/chat/reactions  
- Mobile-money webhooks (document seam only: `/webhooks/mobile-money/*` later)  
- Branch administration  
- Membership card / QR check-in  
- Children’s ministry safe check-in  

---

## 17. Contract discipline

- OpenAPI generated from Zod; commit with endpoint changes (`docs/03` §11).  
- Every route: happy path, validation, 401, 403, **cross-church 404**, pagination, idempotency where marked.
