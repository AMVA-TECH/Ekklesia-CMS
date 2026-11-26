# 21 — Platform permission catalogue & role matrix

**Status:** Phase 1–7 baseline  
**Codes:** colon style `platform:*` (aligned with church catalogue style)  
**Home:** `church-cms/src/modules/platform-ops/platform-permissions.ts`

## Catalogue

| Code | Sensitivity | Description |
|---|---|---|
| `platform:read` | sensitive | Overview / aggregate health |
| `platform:admin` | high_risk | Privileged super-set (Administrator tooling) |
| `platform:impersonate_tenant` | high_risk | Reason-coded tenant enter (creates support session; default read) |
| `platform:security_read` | high_risk | Security findings view |
| `platform:churches_read` | sensitive | Tenant directory (aggregates) |
| `platform:churches_write` | high_risk | Create/update tenants, apply templates, lifecycle |
| `platform:applications_review` | sensitive | View/assign church registration applications |
| `platform:applications_decide` | high_risk | Approve/reject applications; retry provision |
| `platform:operators_manage` | high_risk | Manage platform operators / access summary |
| `platform:accounts_read` | sensitive | View platform/tenant accounts, MFA flags, sessions |
| `platform:accounts_write` | high_risk | Suspend/restore/lock accounts; revoke sessions |
| `platform:service_accounts` | high_risk | Create/rotate/revoke service account credentials |
| `platform:audit_read` | high_risk | Platform audit explorer |
| `platform:findings_manage` | high_risk | Ack/resolve findings, run detectors |
| `platform:metrics_write` | sensitive | Metric snapshots |
| `platform:config_read` | sensitive | View platform config layers (global / defaults / tenant suggestions) |
| `platform:config_write` | high_risk | Patch platform config layers (audited; no silent church overwrite) |
| `platform:integrations_read` | sensitive | Integration directory, webhook monitor, health evidence |
| `platform:integrations_write` | high_risk | Manual webhook replay / directory updates |
| `platform:support_cases` | high_risk | Support cases and controlled support sessions |
| `platform:access_reviews` | high_risk | Create/complete platform access reviews |
| `platform:break_glass` | high_risk | Issue/revoke time-limited emergency privilege grants |
| `platform:monitoring_read` | sensitive | System monitoring overview, jobs, request-id correlation |
| `platform:analytics_read` | sensitive | Aggregate analytics/reports (no finance/PII/Restricted fields) |

`hasPlatformPermission` still treats `platform:admin` as satisfying any check. Active break-glass grants merge into effective operator permissions until expiry/revoke.

## Role templates (proposed)

| Role | Permissions |
|---|---|
| Platform Owner (protected) | All catalogue codes |
| Platform Administrator | Default admin set (includes accounts_* + service_accounts + applications + churches + operators + support_cases + access_reviews + break_glass + config_* + analytics_read + audit + findings + metrics) |
| Operations | read, churches_read, integrations_read, monitoring_read, metrics_write, analytics_read, config_read |
| Support | read, churches_read, applications_review, accounts_read, support_cases, impersonate_tenant, audit_read |
| Security | read, security_read, audit_read, findings_manage, operators_manage, accounts_read, accounts_write, service_accounts, access_reviews, break_glass |
| Auditor | read, audit_read, security_read, analytics_read, churches_read, accounts_read, access_reviews |

## Brief alias map

Dotted examples in the product brief map to colon codes, e.g. `platform.accounts.view` → `platform:accounts_read` / `platform:accounts_write` / `platform:service_accounts` (Phase 3).

## Logging foundation (Phase 1)

- HTTP APIs already carry `requestId` on responses (`REQUEST_ID_HEADER`).
- Platform audit rows store `requestId`, actor, action, churchId, reason.
- Correlate support enter → subsequent church API audits via session `activeChurchId` + platform audit `platform.tenant.enter`.
- Log explorer UI waits until a real aggregation store exists; Monitoring Overview/Jobs/Correlation use DB evidence and show application logs as **Not configured**.
