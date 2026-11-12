# Runbook — Platform security findings

**Audience:** Platform operators  
**Related:** ADR-0003, `/platform/security`, `POST /api/v1/platform/security-findings`

## What this is

Rule-based detectors upsert rows into `security_findings`. The Security Center lists open/ack/resolved items. Critical findings also surface on `/platform` overview.

## First three checks

1. Open the operator host (`http://platform.localhost:3000/security` or production `https://platform.<root>/security`), or `GET /api/v1/platform/security-findings?status=open`.
2. Open `/audit` on that host and filter related actions (`platform.tenant.enter`, `platform.operator.add`, `auth.%`).
3. Open `/fault` for failed message jobs and auth-failure counts in the last 24h.

## Common detectors

| Detector key | Meaning | Typical response |
|---|---|---|
| `auth.failure_burst_24h` | Many auth failures | Rate-limit / lock accounts; check MFA OTP delivery |
| `notify.job_failures_24h` | Message jobs failing | Check `NOTIFY_PROVIDER` / Briq keys; inspect deliveries |
| `access.role_churn_24h` | Many role assign audits | Confirm legitimate admin work; revoke if suspicious |
| `data.export_volume_24h` | High export count | Confirm actor + purpose; revoke export permission if abuse |

## Containment

1. Ack the finding (ownership).
2. If tenant-specific: **Enter church** with a written reason (`/platform/churches`).
3. Revoke compromised sessions / rotate secrets as needed.
4. Resolve the finding when fixed; leave a short note in the incident tracker.

## Never

- Delete `platform_audit_events` or disable audit writing.
- Enter a tenant without a reason string.
- Share Restricted personal data in chat logs or screenshots.
