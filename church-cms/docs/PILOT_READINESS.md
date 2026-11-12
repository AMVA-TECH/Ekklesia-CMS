# Stage 5 — Pilot readiness

**Status:** In progress (engineering scaffolding)  
**Gate:** Authorised CrossLife representatives accept the pilot against agreed criteria (`docs/cms-cursor-kit/agent-plan.md` Stage 5).  
**Auth:** [ADR-0002](../../docs/09-adr-0002-authentication.md) **Accepted** (Better Auth). Remaining: MFA/OTP, UAT sign-off, PDPA.

## Checklist

| Area | Artifact / command | Status |
|---|---|---|
| Migration rehearsal | `pnpm db:rehearse` → `REHEARSAL_OK` | Pass (local) |
| Backup / restore check | included in `db:rehearse` | Pass (local) |
| Ops readiness | `pnpm pilot:ops-check` → `PILOT_OPS_OK` | Pass (local; HTTP optional) |
| Person-scoped RLS hardening | migration `0007_rls_stage5_person_scoped` | Applied |
| UAT script | [UAT_CHECKLIST.md](./UAT_CHECKLIST.md) | Draft for CrossLife reps |
| Auth decision | ADR-0002 Better Auth (C) | **Accepted** — member PIN (email/phone); admin OTP MFA |
| Platform operator console | ADR-0003 · subdomain `platform.*` · migration `0018` | **Implemented** — overview, security, audit, access, growth, fault, churches (`src/proxy.ts`) |
| Training / support | TBD with CrossLife admin | Not started |
| Defect triage process | Use GitHub/issue tracker during UAT | Not started |
| Legal / PDPA pre-launch | Lawyer confirm Tanzania PDPA obligations (`04-security` §5) | Owner |

## Commands

```bash
# Fresh DB migrate + dump/restore
pnpm db:rehearse

# Keep throwaway DBs for inspection
KEEP_REHEARSAL_DB=1 pnpm db:rehearse

# Ops checks against current DATABASE_URL
pnpm pilot:ops-check

# Ops + live health
PILOT_BASE_URL=http://127.0.0.1:3000 pnpm pilot:ops-check
```

## What is *not* Stage 5 scope

- Seeding real CrossLife people/finance into production (DEC-023 / DEC-027 — fixtures/mock only).
- TOTP authenticator apps / passwordless OTP-only login (PIN remains first factor).
- Deferred MVP gaps (free-form report designer, expenses/budgets UI polish, i18n, family views/nudges UI, WhatsApp cold templates, etc.) — track in UAT as gaps. Shipped: dual-control + expense/offering journal post, budgets M/Q/Y, projects admin + member interest, pledge applications, portal `/people/me` + `/directory`, appointment requests, minutes, announcement DEC-032, membership applications, event posters/registrations, `GET /audit-events`, `GET /roles` + role-assignments, `POST /exports`, R-SP-02/03, R-FIN-01, unit packs, saved views, QR/absence/correction APIs, `GET /attendance/me` + `/attendance/family` + `/attendance/stats/leadership`, household children, `POST /people/{id}/contacts`, `GET/PATCH /households`, `GET/POST /memberships` + `GET /memberships/{id}` + `POST /memberships/{id}/status`, `POST /journals/{id}/reverse`, `POST /financial-years/{id}/close`, `GET /participation-requests/me`, `POST /announcements/{id}/reject`; drizzle journal repaired for `0010`–`0013`; multi-role seed (`member`, `finance_officer`); [API_PATH_ALIASES.md](./API_PATH_ALIASES.md).

## Exit

Stage 5 is **Done** when:

1. ADR-0002 is Accepted and login works without `x-dev-*` in the pilot environment.
2. `pnpm db:rehearse` and `pnpm pilot:ops-check` pass against the pilot DB target.
3. CrossLife authorised reps sign the UAT checklist (or an agreed subset for a phased pilot).
