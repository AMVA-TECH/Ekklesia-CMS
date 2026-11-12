# ADR-0002 — Authentication (accepted)

**Status:** Accepted — Better Auth (option C), customized  
**Date:** 2026-11-10  
**Decider:** Project owner  
**Unblocks:** real login, pilot production deploy, Stage 5 gate sign-off  

**Context:** Stage 1 foundation used temporary `x-dev-*` request headers (`readDevSession`) so Stage 2–4 APIs could be exercised before a real identity provider was chosen. Production must not use that path (`NODE_ENV === 'production'` already returns null for bare headers; `ALLOW_DEV_AUTH=1` is the explicit non-prod kill-switch).

## Decision

**Selected option: C — Better Auth** (Postgres sessions via Drizzle), customized for CMS tenancy.

| Field | Choice |
|---|---|
| Selected option | **C** |
| Decider | Project owner |
| Date | 2026-11-10 |
| Residency / PDPA note | Sessions + credentials stay in our Postgres (same region as app DB) |
| SMS/OTP provider for Tanzania | Briq / notify stack for SMS; email OTP via thin mail stub (real SMTP later) |
| MFA plan for finance + role admins | **OTP MFA** for every admin-dashboard user (any non-`member` role) |
| Accept residual risks | Member PIN is short (4–8 digits) — rate-limit + lockout; SIM-swap mitigated for admins by requiring MFA channel |

## Login model (two tracks)

| Audience | First factor | Second factor |
|---|---|---|
| **Members** (portal; role `member` only) | **Email + PIN** *or* **phone + PIN** | None |
| **Admin dashboard** (any active role whose code ≠ `member`) | Same PIN credentials | **OTP** via SMS (preferred) or email |

- PIN: 4–8 digits, stored as Better Auth credential password (argon2).
- OTP channel: prefer `user_accounts.phone_e164` / BA `phoneNumber`; else email. If neither exists, admin login is blocked until a channel is added.
- Never log OTPs or PINs (`docs/04-security.md`).

## Customization (source of truth)

Better Auth owns **identity + session cookies only**. CMS domain tables remain authoritative:

| Concern | Source of truth |
|---|---|
| Login identity, PIN hash, session cookie, 2FA challenge | Better Auth (`user` / `session` / `account` / `verification` / `twoFactor`) |
| Church tenancy (`church_id`) | `session.activeChurchId` (server-only) + our `churches` |
| Membership of a user in a church | `organisation_users` |
| RBAC roles / permissions / “is admin” | `roles`, `role_permissions`, `user_role_assignments` |
| Person link | `organisation_users.person_id` → `people` |

**Do not** use Better Auth’s organization plugin as the church/tenant model. Bridge rule: Better Auth `user.id` **equals** `user_accounts.id` (same UUID).

## Requirements mapping

1. Active `church_id` lives in the **server session** only (`session.activeChurchId`).
2. Session cookie: Better Auth defaults (`HttpOnly`, `Secure` in prod, `SameSite=Lax`).
3. MFA (OTP SMS/email) for admin-dashboard users (non-`member` roles).
4. Member phone login via Better Auth `phoneNumber` + PIN (not passwordless OTP-only).
5. `requireCtx(request)` remains the only way handlers obtain `Ctx`.
6. `readDevSession` only when `ALLOW_DEV_AUTH=1` and not production.
7. Future SSO: Better Auth social providers / token exchange later.
8. Export/exit: member identity remains in our Postgres tables.

## Implementation

1. `better-auth` + phoneNumber + twoFactor(otp) plugins; migrations `0015`–`0017`.
2. Mount `GET|POST /api/auth/[...all]`. Thin `/api/v1/auth/login|logout|mfa/*|active-church`.
3. `GET /auth/me` reports roles + `mfaRequired` / auth mode.
4. `withApiHandler` → Better Auth session (MFA-satisfied); `ALLOW_DEV_AUTH` headers as non-prod fallback.
5. Seed PINs + `twoFactorEnabled` for admin/finance fixtures.
6. Kill-switch: production never honors `x-dev-*`.

## Interim (dev only)

- Headers still work when `ALLOW_DEV_AUTH=1`: `x-dev-user-id`, `x-dev-church-id`, `x-dev-permissions` (+ optional `x-dev-person-id`).
- Seed users: `admin@example.test` / `member@example.test` / `finance@example.test` (PIN via `DEV_AUTH_PIN`, default `123456`).
