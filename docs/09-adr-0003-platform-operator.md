# ADR-0003 — Platform operator full access

**Status:** Accepted  
**Date:** 2026-11-10  
**Decider:** Project owner  
**Unblocks:** Platform Operator Oversight Console (`/platform`)

## Context

Stage 1–4 delivered church-scoped admin APIs. Product owners need a **platform operator** console (Google Admin / AWS CloudTrail+Security Hub / Meta Admin Center style) with complete oversight across churches: security findings, immutable audit, access control, growth, and fault response.

Prior guidance in `04-security.md` said platform operators should have **no routine access to church data**, with time-limited support only. That conflicts with the approved product direction for full platform oversight.

## Decision

**Platform operators have full cross-church access and oversight**, including the ability to enter any tenant for support and to read operational and security data required to run the platform.

Controls (mandatory):

1. **MFA** required for every platform console session (same admin OTP path as ADR-0002).
2. **Global membership** via `platform_operators` (not a per-church role assignment).
3. **Append-only** `platform_audit_events` for every privileged platform action and tenant enter; operators cannot update or delete audit rows through the app.
4. **Reason-coded** tenant entry (`POST /platform/tenants/{id}/enter`) before using church-scoped APIs as support.
5. **Default deny** for non-operators on all `/api/v1/platform/*` routes.
6. Restricted field values still **must not** appear in logs or unsanitized audit metadata.

This **supersedes** the “no routine access to church data” bullet for the platform-operator persona in `04-security.md`. Church admins remain tenant-scoped; they do not gain cross-church powers.

## Consequences

- New module `src/modules/platform-ops`, APIs under `/api/v1/platform/*`.
- **UI is reached on an independent subdomain** (default `platform.<root>`), not as a primary path on the church app. `src/proxy.ts` rewrites that host to internal `/platform/*` routes and redirects main-app `/platform` URLs to the subdomain.
- Session resolution supports platform scope without requiring an active church for platform routes.
- Metric snapshots and security findings are platform-owned tables (not church RLS).
- Support enter-church writes a loud platform audit row and sets `activeChurchId` for subsequent church APIs.

## Hosting

| Environment | Operator entry |
|---|---|
| Local | `http://platform.localhost:3000` |
| Production | `https://platform.<NEXT_PUBLIC_ROOT_DOMAIN>` (or `NEXT_PUBLIC_PLATFORM_HOST`) |

DNS / Vercel: point the platform subdomain at the same deployment; Proxy selects the console by `Host`.

## Out of scope (later)

- ML/SIEM-class anomaly detection.
- Browser impersonation of a member session.
- Cold archive of audit to object storage.
