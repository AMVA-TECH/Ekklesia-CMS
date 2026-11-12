# 03 — Data Philosophy

**Status:** Binding for MVP logical design and later physical schema  
**Companions:** `02_DATA_MODELLING_RULES.md`, `04_LOGICAL_ENTITY_CATALOG.md`, `08_ERD.md`, `11_RBAC_AND_PERMISSIONS.md`  
**Engineering align:** `docs/AGENTS.md`, `docs/01-system-architecture.md` §10, `docs/04-security.md`

## 1. Product surfaces (one domain)

1. **Church administration** — leaders run the church.
2. **Member portal** — members interact with the church (profile, membership, ministries, events, attendance, projects, announcements).

Same tables and `/api/v1`. Different **permissions, scopes, and DTOs** — never fork schemas per surface.

A later **church social/community app** is a separate product that reuses stable IDs via API (not shared DB tables).

## 2. Core principles

1. **Truth over convenience** — one source of truth per fact; no duplicated profile blobs across modules.
2. **Stable IDs** — UUIDv7; never name, last name, or household label as keys (surnames are commonly shared); IDs long-lived for future social/integrations.
3. **Tenant ownership** — every church-owned row has `church_id` from server `Ctx`/session — never from the client as source of truth.
4. **Separate identity layers** — `UserAccount` ≠ `Person` ≠ `Membership` ≠ life-group `Participation` ≠ ministry `Participation` ≠ `Appointment` ≠ RBAC `Role`.
5. **Member profile is composed** — adult Person + account + membership + household/family + optional life group/jumuiya + zero-or-more ministries. **Member profile ≠ future community profile.**
6. **Effective-dated relationships** — memberships, appointments, participation use `effective_from` / `effective_to` (null end = current).
7. **Immutable history** — consequential lifecycle changes append history. Corrections = compensating records + reason; no silent overwrite.
8. **Append-only audit** — `AuditEvent` is never updated or deleted.
9. **Soft archive by policy** — `deleted_at` for history-bearing people/records; hard delete only via audited retention process.
10. **UTC + money + ledger integrity** — `timestamptz` UTC; display `Africa/Dar_es_Salaam`; money `bigint` minor units + currency (`TZS`); phones E.164; posted journals balanced and immutable (reverse to correct).
11. **Configurable reference data** — unit kinds, event types where churches differ; MVP membership statuses fixed: `visitor | active | inactive`.
12. **Privacy and consent first-class** — directory opt-in, communication preferences, consent records; deny-by-default visibility.
13. **API-boundary growth** — future social app and integrations call `/api/v1`; never share Neon tables with other products.
14. **No speculative social graph in MVP** — no feed, friendship, DM, reaction, or story tables now.

## 3. Dual-surface access (summary)

| Concern | Administration | Member portal |
|---|---|---|
| People / households | Scoped CRUD | Own profile + permitted household; children name+age |
| Membership | Approve visitor→active/inactive | View own; cannot self-approve |
| Ministries | Configure; leaders manage | Discover, request join, own participations |
| Events / attendance | Create; headcount + roll call | Register; own attendance; correction request |
| Projects | Create/manage; money link | Discover / interest where enabled |
| Directory | Broader staff views as permitted | Opt-in name + photo + ministry |
| Accounting / pledges | Full module; dual control | **No access** |
| Messaging | Templates, bulk SMS/WhatsApp | Receive; manage own preferences |
| Import | Excel member import | No |
| Audit / roles | Scoped admin | No |

## 4. Accounting integrity

- Chart of accounts + funds; double-entry journals.
- Finance writers ≠ sole disbursement approvers.
- Restricted data class; never in logs or member DTOs.
- Mobile-money **method** may be recorded; live **gateway** deferred.

## 5. Messaging integrity

- Channels: SMS + WhatsApp (email optional later).
- No send without consent/preference rules.
- Delivery logs append status; rate-limit bulk sends; audit counts not full phone lists.

## 6. CrossLife / fixtures

Do not seed CrossLife as production defaults. Public CrossLife facts may be **mock/fixture** data for build and test only (DEC-023).

## 7. Schema readiness gate

No production migrations until entity catalogue, cardinalities, tenant rules, statuses, RBAC, and retention baselines are accepted (see `02_DATA_MODELLING_RULES.md`).
