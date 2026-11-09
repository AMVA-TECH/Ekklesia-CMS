# ADR-0002 — Authentication (proposed)

**Status:** Proposed  
**Date:** 2026-11-09  
**Context:** Stage 1 foundation currently uses temporary `x-dev-*` request headers (`readDevSession`) so Stage 2 APIs can be exercised before a real identity provider is chosen. Production must not use that path.

## Decision needed

Pick one established provider / library (do **not** roll crypto or session formats):

| Option | Fit for Tanzania pilot | Notes |
|---|---|---|
| A. Auth.js (NextAuth) + credentials/OTP | Good | Familiar Next.js path; phone OTP custom |
| B. Clerk / WorkOS / similar SaaS | Fast | Cost; data residency review |
| C. Lucia / custom sessions on Postgres | Flexible | More engineering; still use argon2id + hosted OTP |

## Requirements (non-negotiable)

1. Active `church_id` lives in the **server session** only.
2. Session cookie: `HttpOnly`, `Secure`, `SameSite=Lax` (Strict for admin if feasible).
3. MFA for roles that touch Restricted finance, `roles:assign`, bulk export, or bulk messaging.
4. Phone/OTP login: rate-limited, single-use, short-lived.
5. `requireCtx(request)` remains the only way handlers obtain `Ctx`.
6. Remove `readDevSession` from production builds (`NODE_ENV === 'production'` already returns null).

## Interim

- Local/dev: `x-dev-user-id`, `x-dev-church-id`, `x-dev-permissions`.
- Seed user: `cccccccc-0001-0001-0001-000000000001` @ church `11111111-1111-1111-1111-111111111111`.

## Next action

Project owner chooses option A/B/C; then implement login/logout/`GET /auth/me`/`POST /auth/active-church` per `03-api-architecture.md`.
