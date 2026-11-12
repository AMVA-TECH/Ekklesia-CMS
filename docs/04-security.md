# 04 — Security

**Status:** Accepted. **Read with:** `AGENTS.md`, `03`. This is a church system holding personal and sometimes very sensitive information about real families, including children. Security is a feature, not a phase.

## 1. What matters most

1. **One church seeing another church's data.** (Tenant isolation.)
2. **A user seeing or changing more than their role allows.** (Authorisation.)
3. **Leaks of sensitive personal data:** pastoral notes, counselling, giving, children's data, contact details.
4. **Account takeover** of administrators.
5. **Abuse of the system** to spam members or exfiltrate lists.

## 2. Tenant isolation — five layers (all required)

| # | Layer | Rule |
| --- | --- | --- |
| 1 | **Session** | The active church is stored **server-side** in the session after verifying the user belongs to it. Changing church is an explicit, audited action. |
| 2 | **`Ctx`** | Every service call receives `Ctx { actor, churchId, requestId }`. No `Ctx`, no call. |
| 3 | **Repository scoping** | Repositories build queries through a helper that always adds `church_id = ctx.churchId`. Writing a raw query on a tenant table without it fails review. |
| 4 | **Postgres Row-Level Security** | Tenant tables have RLS **enabled and forced**. Inside each transaction: `select set_config('app.church_id', $1, true)` (transaction-local, safe with pooled connections). Policies use `church_id = current_setting('app.church_id')::uuid`. The app connects as a **non-owner role without `BYPASSRLS`**; migrations use a separate owner role. |
| 5 | **Tests** | A cross-tenant test exists for **every endpoint** and every repository function on tenant tables. A new tenant table is not "done" without it. |

Other-tenant records answer **404**, never 403, to avoid revealing they exist.
Do not use session-level `SET` with pooled connections (it can leak into other requests). Always `set_config(..., true)` inside the transaction.

## 3. Authentication

- Use an established library or managed provider (decision: ADR-0002). **Never roll your own crypto, session store, or token format.**
- Browser sessions: cookie with `__Host-` prefix where possible, `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict` for admin areas), `Path=/`. Rotate the session id on login and privilege change. Idle timeout and absolute timeout; shorter for admins.
- **MFA required** for roles that can see restricted data, manage roles, or export lists.
- Passwords (if used): argon2id (or bcrypt with a strong cost), minimum length, breached-password check, no composition theatre.
- Phone/OTP login (likely in Tanzania): short-lived, single-use, rate-limited, bound to the device/session; consider SIM-swap risk for privileged roles (require a second factor).
- Login, reset and OTP responses must not reveal whether an account exists.
- Rate-limit and lock out gently on repeated failures; alert on bursts.
- External API clients: scoped, short-lived tokens or hashed API keys; show a key once, store only a hash; support rotation and revocation.

## 4. Authorisation

- **Default deny.** If no rule allows it, it is forbidden.
- Model: **roles → permissions** (`resource:action`, e.g. `people:read`, `membership:update`) plus **scope** (church, ministry, household, self).
  - Church admin: manage their church.
  - Ministry leader: only members and data of their ministry.
  - Member: only their own record and explicitly permitted household information.
  - Platform operator (us): **full platform oversight** across churches (ADR-0003). MFA required; every privileged action and tenant enter is append-only audited with a reason; operators cannot disable or delete audit trails. Non-operators never receive platform APIs.
- Policies are pure functions in each module (`policies.ts`): `can(ctx, 'people:update', person)`. They are called in the **service**, not the handler or UI.
- **Property-level rules:** some fields (e.g. national ID, pastoral notes) need extra permission; the DTO mapper omits them without it.
- Hiding a button in the UI is convenience, not security.
- Every role or permission change is audited and requires an elevated permission.

## 5. Data classification

| Class | Examples | Handling |
| --- | --- | --- |
| **Public** | Published events, church name | Can be served without login. |
| **Internal** | Ministry rosters, attendance counts | Authenticated, role-scoped. |
| **Confidential** | Names, phone, email, address, birthdays, household links | Role-scoped; access to lists is limited and audited for exports. |
| **Restricted** | Pastoral/counselling notes, prayer requests with health or family details, giving records, children's data, national ID numbers | Extra permission + MFA; field-level DTO control; read access audited; consider application-level encryption later; never in logs, analytics, error reports or test data. |

Notes:
- Religious affiliation and membership records can be **sensitive personal data** under data-protection law.
- **Children and youth:** collect the minimum, link to a guardian, restrict who can see them, no direct messaging by unauthorised adults.
- Tanzania's Personal Data Protection Act, 2022 applies to this kind of data. **Before launch, have a lawyer confirm** the obligations: consent and purpose, notice to members, registration with the Personal Data Protection Commission, retention, member rights (access/correction/deletion), breach notification, and any limits on storing data outside Tanzania. Record the outcome in an ADR.

## 6. OWASP API Security Top 10 (2023) mapping

| Risk | Our control |
| --- | --- |
| API1 Broken Object Level Authorization | Tenant layers (section 2) + per-object policy checks; cross-tenant tests. |
| API2 Broken Authentication | Established auth, MFA, rate limits, session rules (section 3). |
| API3 Broken Object Property Level Authorization | Response DTO mappers; no mass assignment; strict request schemas. |
| API4 Unrestricted Resource Consumption | Rate limits, page-size caps, body-size caps, query timeouts, no unbounded exports. |
| API5 Broken Function Level Authorization | Permission check in every service function; admin routes need admin permissions. |
| API6 Unrestricted Access to Sensitive Business Flows | Extra limits and audit on bulk messaging, exports, registration, OTP, giving. |
| API7 Server-Side Request Forgery | No fetching arbitrary user-supplied URLs; allow-list outbound hosts. |
| API8 Security Misconfiguration | Security headers, strict CORS, no debug in production, config validated at start, reviewed IaC/env settings. |
| API9 Improper Inventory Management | OpenAPI is the inventory; old versions have sunset dates; no undocumented endpoints; preview deployments not public with real data. |
| API10 Unsafe Consumption of APIs | Validate responses from SMS/email/payment providers; verify webhook signatures; timeouts and retries. |

## 7. Input, output and web security

- **Validate on the server** with strict Zod schemas. Frontend validation is only for user experience.
- **SQL:** Drizzle parameterised queries only. No string-built SQL. Any raw `sql` template must use bound parameters and be reviewed.
- **XSS:** rely on React escaping; never use `dangerouslySetInnerHTML` with user content; if rich text is ever needed, sanitise on the server with a vetted library.
- **CSRF:** cookie-authenticated, state-changing requests require Origin/Referer verification and a CSRF token.
- **CORS:** explicit allow-list of known origins; never `*` with credentials.
- **Headers:** Content-Security-Policy (start strict, loosen only with reason), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, frame protection (`frame-ancestors`).
- **Errors:** generic to clients, detailed in logs (without personal data).
- **Open redirects:** validate any `redirect` parameter against an allow-list.

## 8. File uploads

- Upload directly to object storage with **short-lived pre-signed URLs**; the API only issues the URL after authorisation.
- Enforce allowed types (by content, not only extension), maximum size, and random object keys (never user-provided file names in the path).
- Store the church id in the key prefix; downloads also go through authorised, short-lived signed URLs.
- Strip image metadata (location data); consider malware scanning before documents become available to others.

## 9. Secrets

- Only in environment variables (Vercel env settings per environment), never in code, tests, docs, screenshots or commits.
- Different secrets for local, preview and production.
- `.env.example` has fake values only.
- gitleaks runs on pre-commit and in CI. If a secret is ever committed: **treat it as compromised, rotate it immediately**, then remove it from history.

## 10. Audit logging

Write an append-only audit record (in the same transaction) for: logins and failed logins for privileged users, church switching, role/permission changes, create/update/delete of confidential and restricted data, reads of restricted data, exports, bulk messages, API credential creation/revocation.

Fields: `id`, `church_id`, `actor_id`, `action`, `resource_type`, `resource_id`, `at`, `request_id`, `ip_hash`, `outcome`, and a **minimal** change summary (field names, not sensitive values).
Audit records cannot be edited or deleted through the app.

## 11. Logging rules

Log: request id, church id, actor id, route, status, duration, error code.
Never log: passwords, OTPs, tokens, session ids, full phone numbers/emails, national IDs, request bodies for sensitive endpoints, pastoral notes, giving details.

## 12. Backups and recovery

- Use Neon's point-in-time restore; confirm the retention window your plan provides and set it deliberately.
- Take a periodic logical export to separate storage as a second safety net.
- **Practise a restore** (to a Neon branch) at least quarterly and write down the result.
- Define targets with the church (how much data loss and downtime is tolerable) and record them.

## 13. Supply chain

Lockfile committed; reproducible installs in CI; bot-driven updates; `pnpm audit` in CI; review install scripts of new dependencies; no unmaintained packages for security-relevant work; GitHub branch protection and 2FA for all contributors.

## 14. Incident response (minimum)

1. **Contain:** disable affected credentials/sessions, revoke keys, block the route if needed.
2. **Assess:** what data, which churches, which period (audit log + request ids).
3. **Fix** and deploy; rotate secrets.
4. **Notify** affected churches and, where the law requires, the regulator and members. Legal advice first on timing and content.
5. **Review:** write a short post-incident note; add a test or rule so it cannot repeat.

## 15. Security checklist for every pull request touching data, auth or API

- [ ] Tenant scoped; cross-church test present
- [ ] Policy checked in the service; default deny
- [ ] Strict input schema; response DTO; no mass assignment
- [ ] No sensitive data in logs, errors, tests, or fixtures
- [ ] Rate limits considered for new endpoints
- [ ] Audit record added where required
- [ ] No new dependency without justification
- [ ] Migrations keep RLS enabled on new tenant tables
