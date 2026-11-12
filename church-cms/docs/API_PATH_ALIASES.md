# API path aliases (implemented vs catalogue)

**Source catalogue:** `docs/CMS_Business_Analysis/04_domain_and_data/10_API_ENDPOINT_MAP.md`  
**Rule:** Prefer the **implemented** path in clients. Catalogue names remain for product docs; do not duplicate handlers unless a redirect is explicitly added.

| Catalogue path | Implemented path | Notes |
|---|---|---|
| `GET/POST /fiscal-periods` | `GET/POST /financial-years` | Table `financial_years` |
| `POST /fiscal-periods/{id}/close` | `POST /financial-years/{id}/close` | |
| `GET/POST /journal-entries` | `GET/POST /journals` | |
| `POST /journal-entries/{id}/post` | `POST /journals/{id}/post` | |
| `POST /journal-entries/{id}/reverse` | `POST /journals/{id}/reverse` | |
| `GET/POST /disbursement-requests` (+ submit/approve/reject) | `GET/POST /expenses` (+ `/submit`, dual-control via `/approval-requests`) | Perms still `disbursements:*` |
| `GET /finance-reports/*` | `GET /reports/{reportId}` (+ catalogue) | e.g. trial balance as `R-FIN-01` |
| `GET/PATCH /notification-preferences/me` | `GET/PATCH /communication-preferences/me` | |
| `POST /memberships/{id}/status` | `POST /memberships/{id}/status` | Also legacy `PATCH /memberships/{id}` |
| `POST /membership-applications/{id}/decisions` | `POST /membership-applications/{id}/decision` | Singular `decision` |
| `POST /organisational-units/{id}/participation-requests` | `POST /participation-requests` | Body includes `organisationalUnitId` |
| `GET /attendance/sessions` | Nested under events: `/events/{id}/attendance-sessions` | Plus `/attendance-sessions/{id}/*` |
| `POST /attendance/absence-notices` | `POST /absence-notices` | |

## Auth (ADR-0002 Better Auth — accepted)

| Catalogue | Status |
|---|---|
| `POST /auth/login` | Implemented — body `{ email\|phoneE164, pin }` (4–8 digit PIN) |
| `POST /auth/mfa/send-otp` | Implemented — admin OTP after PIN (SMS preferred, else email) |
| `POST /auth/mfa/verify` | Implemented — completes admin MFA challenge |
| `POST /auth/logout` | Implemented |
| `POST /auth/active-church` | Implemented (membership-checked session update) |
| `GET /auth/me` | Implemented (`mfaRequired` for non-`member` roles) |
| Better Auth mount | `/api/auth/*` |

**Tracks:** members = PIN only; admin dashboard (any non-`member` role) = PIN + OTP.

## Dev header actors (seed)

When `ALLOW_DEV_AUTH=1` (non-prod), UAT may use `x-dev-user-id` + `x-dev-church-id` (+ optional `x-dev-person-id`, `x-dev-permissions`). Prefer cookie login for real-auth checks.

| Actor | user id | person id | role |
|---|---|---|---|
| Admin | `cccccccc-0001-0001-0001-000000000001` | `dddddddd-0001-0001-0001-000000000001` | `church_administrator` |
| Member | `cccccccc-0001-0001-0001-000000000002` | `dddddddd-0001-0001-0001-000000000002` | `member` |
| Finance | `cccccccc-0001-0001-0001-000000000003` | `dddddddd-0001-0001-0001-000000000003` | `finance_officer` |

Church: `11111111-1111-1111-1111-111111111111`