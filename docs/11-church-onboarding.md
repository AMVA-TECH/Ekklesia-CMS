# 11 — Church onboarding (DEC-032)

**Status:** Accepted.  
**Decision:** [DEC-032](cms-cursor-kit/DECISIONS.md).  
**Read with:** `09-adr-0002-authentication.md`, `09-adr-0003-platform-operator.md`, `04-security.md`.

## Model

1. **Platform operator** creates a church tenant and issues the **first church administrator** credentials (email/phone + PIN; MFA required for admins).
2. That admin customizes church profile/settings and invites leadership accounts.
3. **Members** open a public registration form, **search/select the church by name**, and submit a join request.
4. Church admins receive the request, **approve or reject**.
5. Only after approval does the member receive a usable login (PIN / set-PIN) scoped to that church.

Public “create my church” and instant login on register are **out of scope**.

## Phase delivery

| Phase | Scope | Status |
| --- | --- | --- |
| B | `POST /api/v1/platform/churches` + platform UI (create church + first admin) | Implemented |
| C | Admin invite leadership | Planned |
| D | Public church search + join request + admin approve → provision member | Implemented |

## Security notes

- Church search returns safe fields only (name, slug, timezone/locale as needed).
- Join requests never grant session cookies.
- PIN values must not appear in logs or audit metadata.
- Tenant scope always from server session / approved church id.
