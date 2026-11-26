# ADR-0003 — Platform operator control plane

**Status:** Accepted (amended 2026-11-25)  
**Date:** 2026-11-10  
**Amended:** 2026-11-25 — least-privilege platform RBAC; path-based console  
**Decider:** Project owner  
**Unblocks:** Platform Admin (`/platform`) · see `20_PLATFORM_ADMIN_PHASE0_ASSESSMENT.md`

## Context

Stage 1–4 delivered church-scoped admin APIs. Product owners need a **platform control plane** for tenant lifecycle, security findings, immutable audit, operators, growth, and controlled support — separate from church governance.

Earlier wording granted “full cross-church access” by default. The Platform Admin product brief requires **explicit platform permissions**, no casual access to church private data, and auditable support sessions. Church-level RBAC (`resource:action` + scopes) remains authoritative inside each tenant.

## Decision

**Platform operators are members of `platform_operators` (global), not church roles.** Capabilities are granted only via explicit `platform:*` permission codes on that membership.

Controls (mandatory):

1. **MFA** required for every platform console session (same admin OTP path as ADR-0002).
2. **Global membership** via `platform_operators` (not a per-church role assignment).
3. **Least privilege:** routes and UI actions check specific `platform:*` codes (e.g. `platform:churches_read`, `platform:operators_manage`). `platform:admin` remains a privileged super-set for Platform Administrator / Owner tooling, not a substitute for documenting intent.
4. **Append-only** `platform_audit_events` for privileged platform actions and tenant enter; operators cannot update or delete audit rows through the app.
5. **Reason-coded, exceptional tenant entry** (`POST /api/v1/platform/tenants/{id}/enter`) before using church-scoped APIs as support. Default posture is diagnostics / aggregate oversight — not unrestricted private PII or finance browsing without need.
6. **Default deny** for non-operators on all `/api/v1/platform/*` routes.
7. Restricted field values **must not** appear in logs or unsanitized audit metadata.
8. **Platform Owner** (when modelled) is protected: no self-escalation; last viable owner cannot be removed without transfer/recovery safeguards.
9. Church roles **never** receive `platform:*`. Platform membership **never** automatically grants church leadership, membership, or church role assignment authority.

This **amends** the 2026-11-10 “full access by default” reading. Church admins remain tenant-scoped; they do not gain cross-church powers.

## Consequences

- Module `src/modules/platform-ops`, APIs under `/api/v1/platform/*`.
- **UI entry is path-based** on the main app host: `/platform` (legacy `platform.*` subdomains redirect to the same paths via `src/proxy.ts`).
- Session resolution supports platform scope without requiring an active church for platform routes.
- Metric snapshots and security findings are platform-owned tables (not church RLS).
- Support enter-church writes a loud platform audit row and sets `activeChurchId` for subsequent church APIs.
- Expand the `platform:*` catalogue over time; keep colon-style codes aligned with the church permission catalogue style.

## Hosting

| Environment | Operator entry |
|---|---|
| Local | `http://localhost:3000/platform` |
| Production | `https://<app-host>/platform` |

Legacy subdomain bookmarks redirect to `/platform` on the main host.

## Out of scope (later)

- ML/SIEM-class anomaly detection.
- Browser impersonation of a member session.
- Cold archive of audit to object storage.
- Billing.
- (Done in Phase 2) Public church-registration → review → async provision → admin invite.
- (Done in Phase 6) Support cases, controlled enter-tenant sessions, access reviews, break-glass grants.
- (Done in Phase 7) Permission-aware overview widgets, aggregate analytics, global/defaults/tenant config layers.
