# 11 — RBAC and Permissions

**Status:** Working baseline (MVP)  
**Aligns with:** `docs/04-security.md`, DEC-008/012/013/017/018  
**Replaces as authority:** stale rows in `05_requirements_and_controls/03_ACCESS_CONTROL_STARTER.md` (keep file; point here)

## 1. Model

```
Permission (global code)  ←──  RolePermission  ──→  Role (per church)
                                                      ↑
                                            UserRoleAssignment
                                            + scope_type + optional unit_id
                                                      ↑
                                                 UserAccount
```

Rules:
1. **Default deny.**
2. Check in **services**: `can(ctx, permission, resource?)` — not UI-only, not middleware-only.
3. **Appointment ≠ permission.** Titles never auto-grant roles.
4. One user may hold **multiple** roles with different scopes.
5. **Property-level** omission for Restricted fields in DTOs.
6. Cross-church → treat as not found (`404`).
7. MFA required for roles that touch Restricted finance/giving, `roles:*`, bulk export, or bulk messaging (per security doc).

### Scope types
| scope_type | Meaning |
|---|---|
| `church` | Entire active church |
| `organisational_unit` | One department/ministry (unit_id required) |
| `self` | Only the actor’s linked Person |
| `household` | Actor’s household records |

---

## 2. Permission catalogue (stable codes)

### Church & access
`church:read` · `church:update` · `roles:read` · `roles:assign` · `audit:read` · `exports:run` · `imports:run` · `media:upload`

### Platform operator (global; ADR-0003 — not per-church)
`platform:read` · `platform:admin` · `platform:impersonate_tenant` · `platform:security_read`

Granted via `platform_operators` membership, not `user_role_assignments`. `platform:admin` implies the other three.

### People & households
`people:read` · `people:create` · `people:update` · `people:delete` · `people:read_restricted`  
`households:read` · `households:write`  
`directory:read`

### Membership
`memberships:read` · `memberships:create` · `memberships:approve` · `memberships:update_status`

### Organisation
`units:read` · `units:write` · `programmes:write` · `positions:write` · `appointments:write`

### Participation
`participations:read` · `participations:request` · `participations:approve`

### Events & attendance
`events:read` · `events:write` · `events:register`  
`attendance:read` · `attendance:record` · `attendance:check_in_self` · `attendance:correct_request` · `attendance:correct_resolve` · `attendance:absence_notice` · `attendance:stats_leadership`

### Projects
`projects:read` · `projects:write` · `projects:assign` · `projects:interest`

### Accounting (Restricted)
`funds:read` · `funds:write` · `accounts:read` · `accounts:write` · `periods:write`  
`journals:read` · `journals:draft` · `journals:post` · `journals:reverse`  
`disbursements:request` · `disbursements:approve`  
`budgets:read` · `budgets:write` · `finance_reports:read`  
`offerings:write` · `pledges:read` · `pledges:write` · `pledges:follow_up`

### Messaging & announcements
`templates:write` · `messages:send` · `messages:bulk_send` · `announcements:write` · `announcements:publish`  
`preferences:self`

---

## 3. Seed roles (per church; codes stable)

| Role code | Typical holder | Default scope |
|---|---|---|
| `platform_operator` | SaaS / platform ops (ADR-0003) | global via `platform_operators` (full oversight + audited tenant enter) |
| `senior_pastor` | Senior Pastor | church |
| `pastoral_leadership` | Other pastors | church |
| `church_administrator` | Church Administrator | church |
| `pogs` | GS / POGS | church |
| `finance_officer` | Day-to-day finance | church |
| `chief_financial_steward` | Finance oversight | church |
| `ministry_leader` | Ministry head | organisational_unit |
| `department_head` | Dept/office head | organisational_unit |
| `registrar` | People desk | church |
| `event_recorder` | Assigned usher | organisational_unit / event assign |
| `announcer` | Comms | church |
| `member` | Active member | self |

---

## 4. Role → permission matrix (baseline)

| Permission | SP | Pastoral | Admin | POGS | Finance off. | Fin. steward | Min. leader | Dept head | Registrar | Event rec. | Announcer | Member |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| church:read | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| church:update | Y | | Y | | | | | | | | | |
| people:read | Y | Y | Y | Y | | | S | S | Y | | | self |
| people:create | Y | Y | Y | Y | | | S | | Y | | | |
| people:update | Y | Y | Y | Y | | | S | | Y | | | self* |
| households:write | Y | Y | Y | Y | | | | | Y | | | |
| memberships:approve | Y | Y | Y | Y | | | | | | | | |
| units:write | Y | | Y | Y | | | | | | | | |
| appointments:write | Y | | Y† | | | | | | | | | |
| participations:approve | | | Y | | | | S | | | | | |
| participations:request | | | | | | | | | | | | Y |
| events:write | Y | Y | Y | | | | S | S | | | | |
| events:register | | | | | | | | | | | | Y |
| attendance:record | Y | Y | Y | | | | S | S | | Y | | |
| attendance:check_in_self | | | | | | | | | | | | Y |
| attendance:correct_request | | | | | | | | | | | | Y |
| attendance:absence_notice | | | | | | | | | | | | Y |
| attendance:stats_leadership | Y | Y | Y | | | | S | | | | | |
| projects:write | Y | | Y | | | | S | | | | | |
| funds/accounts:write | | | | | Y | Y | | | | | | |
| journals:draft/post | | | | | Y | | | | | | | |
| journals:reverse | | | | | Y | Y | | | | | | |
| disbursements:request | | | | | Y | | | | | | | |
| disbursements:approve | Y | Y | | | | Y‡ | | | | | | |
| finance_reports:read | Y | Y | | | Y | Y | | | | | | |
| offerings/pledges:write | | | | | Y | | | | | | | |
| messages:bulk_send | Y | | Y | | | | | | | | Y | |
| announcements:publish | Y | Y | Y | | | | S | | | | Y | |
| imports:run | | | Y | Y | | | | | Y | | | |
| roles:assign | Y | | Y | | | | | | | | | |
| audit:read | Y | | Y | Y | Y§ | Y§ | | | | | | |
| directory:read | Y | Y | Y | Y | | | Y | Y | Y | | | opt-in |
| preferences:self | | | | | | | | | | | | Y |

\* Member self-update: phone, email, photo, language, directory_opt_in only (DEC-018).  
† Appointments: SP primary; Admin may record under SP policy.  
‡ Steward may approve when configured; **cannot** solo approve a disbursement they alone requested if they also hold finance_officer — dual control.  
§ Finance audit scoped to finance entities.  
**S** = scoped to own organisational unit.

---

## 5. Segregation invariants (must enforce in services)

1. Same actor must not **request and solely approve** the same `DisbursementRequest`.
2. `journals:post` does not imply `disbursements:approve`.
3. `participations:approve` requires assignment scope on that unit (or church-wide admin override).
4. `memberships:approve` allowed for SP, pastoral_leadership, church_administrator, pogs only.
5. Member never receives finance, import, roles:assign, or other members’ confidential contacts via directory.
6. Platform operator: no routine church PII; break-glass must be time-limited and audited.

---

## 6. Member portal capability summary

Allowed with `member` (+ self scope):  
`people:update` (field-limited) · `preferences:self` · `directory:read` (opt-in others) · `memberships:read` (own) · `participations:request` · `events:read` · `events:register` · `attendance:read` (own) · `attendance:correct_request` · `projects:read` · `projects:interest` · announcements read (not listed as permission — public-to-member feed via `announcements` read implicit for active members).

Denied: all accounting, pledges admin, imports, role admin, bulk messaging, other people’s attendance/giving.

---

## 7. API wiring

Every `/api/v1` route documents `permission` + `scope` (see `10_API_ENDPOINT_MAP.md` when published).  
Handlers call services; services call `can()` before mutation.
