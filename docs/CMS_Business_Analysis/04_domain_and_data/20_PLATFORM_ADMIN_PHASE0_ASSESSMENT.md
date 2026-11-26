# 20 — Platform Admin Phase 0 Assessment & Plan

**Status:** Phases 1–7 landed (Platform Admin vertical complete for planned scope; billing still deferred)  
**Date:** 2026-11-25  
**Aligns with:** ADR-0003, DEC-032 / `11-church-onboarding.md`, `11_RBAC_AND_PERMISSIONS.md`, Org/Leadership/RBAC integration (`18_*`)  
**Code homes:** `church-cms/src/modules/platform-ops`, `src/app/platform`, `src/app/api/v1/platform`, `src/platform/auth`

---

## 1. Verdict

**Do not rebuild the platform plane.** Extend the existing `platform-ops` module and `/platform` UI.

| Domain | Already exists | Must not |
|---|---|---|
| Platform auth | `PlatformCtx` + `platform_operators` | Merge into church roles |
| Platform APIs | `/api/v1/platform/*` | Invent parallel “admin-ops” |
| Church auth | `access-control` `resource:action` + scopes | Grant `platform:*` to church roles |
| Org / leadership | `organisation` module | Auto-provision on every tenant create |

**Entry URL (current):** same-origin [`/platform`](http://localhost:3000/platform) (legacy `platform.*` subdomain redirects). Subdomain-only entry is deferred.

---

## 2. Product tension (must resolve in Phase 1)

| Source | Stance |
|---|---|
| [ADR-0003](../../09-adr-0003-platform-operator.md) | Operators have **full cross-church oversight** + reason-coded enter |
| New Platform Admin brief | Least-privilege platform roles; **no casual** church private data; controlled support |

**Proposed supersession for Phase 1 docs:** keep platform plane separate and audited; replace “full access by default” with **explicit `platform:*` permissions**; keep `enterTenant` as exceptional, reason-coded, time-bounded support (default read-oriented). Directory/overview stay aggregate-only (no private finance/PII dumps).

---

## 3. AS-IS → TO-BE

### AS-IS (shipped)

- **Permissions:** only `platform:read`, `platform:admin`, `platform:impersonate_tenant`, `platform:security_read` (JSON on operator row).
- **APIs:** overview, churches list/create/get, apply-template, audit-events, security-findings, growth, health, operators, access/summary, metrics/snapshot, tenants enter.
- **UI:** Overview, Security, Audit, Access, Growth, Fault, Churches — real DB aggregates/detectors (no fake integration/log dashboards).
- **Tenant create:** direct platform create + church role bootstrap + first admin (DEC-032 Phase B). **No** public “register my church” application queue.
- **Member join:** public person→church join requests (`church_join_requests`) — **not** church-tenant registration.
- **Design:** dark teal `--p-*` console (`platform.css`); Church Ops / Member use ivory/charcoal/gold `_ekklesia` tokens. Platform barely reuses shared UI.

### TO-BE (programme)

- Shared Ekklesia design system + purpose-built **PlatformShell** (sidebar IA).
- Granular platform RBAC + named platform roles (Owner protected).
- Public church registration → review → async provisioning → invitation → pending activation.
- Accounts & Access (platform / church-technical / service).
- Integrations + webhook monitor; real observability; Support Centre; Security depth; Analytics; Configuration/Settings.
- **Billing deferred** — no nav item.

### Out of scope now

- Billing UI/schema.
- Hardcoding CrossLife as default org (templates stay opt-in).
- Collapsing platform operators into church RBAC.
- Fake metrics/logs/health.
- Replacing working church org/leadership/RBAC.

---

## 4. Navigation target

| Nav | Phase | Seed from |
|---|---|---|
| Overview | 1–2 enhance | existing overview |
| Churches (+ Applications) | 2 | churches + new registration |
| Accounts & Access | 3 | operators / access summary |
| Integrations | 4 | notify config + new webhook tables |
| System Monitoring | 5 | health + real log/trace store |
| Support Centre | 6 | enter-tenant + cases |
| Security & Audit | 1–6 deepen | security + audit |
| Analytics & Reports | 7 | growth + reports |
| Platform Configuration / Settings | 7 | new platform_settings |
| Billing | — | **omit** |

Modules not yet built must show honest **Not configured / Coming in Phase N**, not invented data.

---

## 5. Authorization model (locked)

- Two domains: **Platform** (`platform:*`) vs **Church** (`resource:action` + scopes).
- Backend enforcement via `PlatformCtx` / `assertPlatformCan` — not nav alone.
- Church admins cannot assign platform roles; platform staff cannot casually edit membership, appointments, or church roles.
- Keep permission **colon** style for platform codes (consistent with catalogue). Map brief’s dotted `platform.accounts.*` examples via a docs alias table only unless a dedicated rename migration is approved.
- Protect last viable Platform Owner; MFA + reauth for privileged actions (build on ADR-0002).

---

## 6. Registration vs current onboarding

| Flow | Today | Brief |
|---|---|---|
| Create tenant | Platform operator creates church | Public application → review → **async** provision |
| First admin | Issued at create | Expiring invitation after provision; tenant **pending activation** |
| Member register | Join existing church | Unchanged — still church-plane |

New entities (reconcile before inventing): application, review/assignment/notes/events, provisioning request, tenant lifecycle events, admin invitation. Reuse `churches` + bootstrap roles; do **not** auto-create departments/leadership/finance.

---

## 7. Design system

- Remount Platform on `_ekklesia` tokens + primitives (`BrandMark`, `PageHeader`, `Panel`, `Table`, `Button`, `Dialog`, `Metric`).
- Thin **PlatformShell** (sidebar, environment banner, operator session) — not a clone of Church Ops nav.
- Retire dark `--p-*` chrome progressively.
- One brand; three shells: Platform / Church Ops (`AdminShell`) / Member (`MemberShell`).

---

## 8. Phased implementation

### Phase 1 — Foundation (after this approval)

1. ADR-0003 amend (least privilege + support boundaries).
2. Expand platform permission catalogue + role matrix; per-route `assertPlatformCan`.
3. PlatformShell on Ekklesia DS; permission-aware nav; env indicator.
4. Stub unavailable modules honestly.
5. Document correlation/`requestId` logging foundation (no fake log UI).

### Phase 2 — Registration & tenant lifecycle

Public registration, email verify, assignment/review/decision, async idempotent provisioning, invitations, suspend/restore, richer directory (aggregates only).

### Phase 3 — Accounts & Access

Platform accounts; church **technical** account ops by tenant; service accounts; sessions/MFA/recovery — never church governance edits.

### Phase 4 — Integrations

Directory, webhook persist/attempts/replay, health from evidence.

### Phase 5 — System monitoring

Log explorer + drill-down only when aggregation exists; separate logs / audit / security in UX.

### Phase 6 — Support & security depth

Cases, controlled support sessions (case ref, expiry, default read), access reviews, break-glass.

### Phase 7 — Overview, analytics, configuration

Permission-aware widgets, reports, global/default/tenant config layers, Platform Settings. No billing.

---

## 9. Test themes (per phase)

- Platform vs church isolation; forbidden platform routes without codes.
- Registration: rate limits, verify, no applicant privilege escalation; provisioning idempotency/retry.
- Enter-tenant: reason, audit, expiry, no silent PII in logs.
- No fake observability assertions — unavailable states tested as such.

---

## 10. Stop condition

**Phase 1 foundation landed** (ADR amend, catalogue/matrix, service guards, Ekklesia PlatformShell, honest stubs).  
**Phase 2:** public `/register-church` → verify → platform Applications queue → async `tenant_provisioning_requests` → `/activate-church` invite. Direct operator create-church remains.  
**Phase 3:** `/platform/access` — platform operators (suspend/restore, MFA/session visibility, last-admin protection), tenant technical accounts (status + revoke sessions only), service accounts (create/rotate/revoke), session list. MFA recovery not automated.  
**Phase 4:** `/platform/integrations` — directory + webhook monitor from evidence; Briq/notify inbound persist+attempts; manual replay; secrets redacted; health not invented from reachability.  
**Phase 5:** `/platform/monitoring` — DB/jobs/session evidence; separates logs (not configured) / audit / security; request-id correlation across audit+webhooks; no fake log explorer.  
**Phase 6:** `/platform/support` — cases + controlled sessions (case ref, expiry, default read); enter-tenant records a support session; Security Centre tabs for access reviews and break-glass (time-limited grants merge into effective `platform:*`); MFA not auto-disabled.  
**Phase 7:** Overview permission-aware widgets; `/platform/analytics` aggregate reports (no finance/PII); `/platform/settings` global layer + `/platform/configuration` defaults/tenant suggestion layers (`platform_config`); no billing.  

**Precision hardening (post Phase 7):** church-plane support grants honour `accessLevel` + live session expiry; PlatformShell nav is permission-filtered via `/api/v1/platform/me`; `publicChurchRegistration` / `breakGlassEnabled` / support max hours enforced at runtime; tenant config write UI on Configuration.
