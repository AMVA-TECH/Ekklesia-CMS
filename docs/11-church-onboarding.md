# 11 — Church onboarding (DEC-032)

**Status:** Accepted.  
**Decision:** [DEC-032](cms-cursor-kit/DECISIONS.md).  
**Read with:** `09-adr-0002-authentication.md`, `09-adr-0003-platform-operator.md`, `04-security.md`.

## Model

1. **Platform operator** may create a church tenant directly and issue the first administrator credentials (email/phone + PIN; MFA required), **or** a public church applies via `/register-church` → email verify → platform review → async provision → `/activate-church` invite (tenant starts `pending_activation`).
2. That admin customizes church profile/settings and invites leadership accounts.
3. **Members** open a public registration form (full name, **phone required**, email optional), choose the **church to attach to**, and submit a join request.
4. Church admins receive the request, **approve or reject**.
5. Approval **attaches** the person to that church (membership + role), which unlocks that church’s services. Credentials (phone + PIN) are issued then; **registration never creates a session** and does not change the normal Sign in flow.

Instant login on register remains **out of scope**. Public “register my church” is the Phase 2 application path (not instant tenant create).

## Phase delivery

| Phase | Scope | Status |
| --- | --- | --- |
| B | `POST /api/v1/platform/churches` + platform UI (create church + first admin) | Implemented |
| C | Admin invite leadership | Implemented |
| D | Public church search + join request + admin approve → provision member | Implemented |
| E | Public church-tenant registration → review → async provision → activate | Implemented (Platform Admin Phase 2) |

## Security notes

- Church search returns safe fields only (name, slug, timezone/locale as needed).
- Join requests never grant session cookies.
- PIN values must not appear in logs or audit metadata.
- Tenant scope always from server session / approved church id.
