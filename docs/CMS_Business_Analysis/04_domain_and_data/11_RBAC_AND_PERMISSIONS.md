# 11 — RBAC and Permissions

**Status:** Working baseline (MVP) — living catalogue  
**Aligns with:** `docs/04-security.md`, DEC-008/012/013/017/018/033, ADR-0003/0004  
**Phase 0 assessment:** `15_RBAC_PHASE0_ASSESSMENT.md`  
**Replaces as authority:** stale rows in `05_requirements_and_controls/03_ACCESS_CONTROL_STARTER.md` (keep file; point here)

## 1. Model

```
Permission (global code + metadata)  ←──  RolePermission  ──→  Role (per church)
                                                              ↑
                                                    UserRoleAssignment
                                                    + scope_type + optional unit_id
                                                              ↑
                                                         UserAccount
                                                    (+ active organisation_users)

Optional temporary grants: organisation.delegations.grants → merged into effective grants
```

Rules:
1. **Default deny.**
2. Check in **services**: `can(ctx, permission, resource?)` — not UI-only, not middleware-only.
3. **Appointment ≠ permission.** Titles never auto-grant roles.
4. One user may hold **multiple** roles with different scopes.
5. **Property-level** omission for Restricted fields in DTOs (`people:read_restricted`).
6. Cross-church → treat as not found (`404`).
7. MFA required for roles that touch Restricted finance/giving, `roles:*`, bulk export, or bulk messaging (per security doc).
8. **No org hierarchy inheritance.** Scope is explicit per assignment.
9. Platform permissions are never church-assignable.

### Scope types (MVP)

| scope_type | Meaning |
|---|---|
| `church` | Entire active church |
| `organisational_unit` | One department/ministry/team unit (`unit_id` required; type on the unit) |
| `self` | Only the actor’s linked Person |
| `household` | Actor’s household records (must be a member of that household) |

`branch` is reserved for a later product unlock — not implemented in MVP.

---

## 2. Matrix A — Permission catalogue

Sensitivity: **S** = Standard · **Sens** = Sensitive · **HR** = High-risk  
Scope: **C** = church · **U** = organisational unit · **Self** · **HH** = household

| Module | Resource | Permission Code | Description | Sensitivity | Scope |
|---|---|---|---|---|---|
| Church | Profile | `church:read` | View church profile/settings | S | C |
| Church | Profile | `church:update` | Update church profile/config | Sens | C |
| Access | Roles | `roles:read` | View roles and assignments | Sens | C |
| Access | Roles | `roles:assign` | Assign/revoke roles; manage role permissions | HR | C |
| Access | Audit | `audit:read` | View church audit events | Sens | C |
| Access | Exports | `exports:run` | Run data exports | HR | C |
| Access | Imports | `imports:run` | Run data imports | HR | C |
| Access | Media | `media:upload` | Upload media assets | S | C |
| Platform | Ops | `platform:read` | Platform read (operators only) | HR | Platform |
| Platform | Ops | `platform:admin` | Platform admin (implies other platform:*) | HR | Platform |
| Platform | Ops | `platform:impersonate_tenant` | Enter tenant support mode | HR | Platform |
| Platform | Ops | `platform:security_read` | Platform security findings | HR | Platform |
| People | Person | `people:read` | View member/person records | Sens | C/U/Self |
| People | Person | `people:create` | Create people | Sens | C/U |
| People | Person | `people:update` | Update people | Sens | C/U/Self |
| People | Person | `people:delete` | Soft-delete people | HR | C |
| People | Person | `people:read_restricted` | View restricted fields (national ID, pastoral notes) | HR | C |
| People | Household | `households:read` | View households | Sens | C/HH |
| People | Household | `households:write` | Manage households | Sens | C/HH |
| People | Directory | `directory:read` | View opt-in directory | S | C |
| Membership | Membership | `memberships:read` | View memberships | Sens | C |
| Membership | Membership | `memberships:create` | Create memberships | Sens | C |
| Membership | Membership | `memberships:approve` | Approve join/membership requests | Sens | C |
| Membership | Membership | `memberships:update_status` | Change membership status | Sens | C |
| Organisation | Units | `units:read` | View org structure | S | C/U |
| Organisation | Units | `units:write` | Manage org units | Sens | C |
| Organisation | Programmes | `programmes:write` | Manage programmes | Sens | C/U |
| Organisation | Positions | `positions:write` | Manage leadership positions | Sens | C |
| Organisation | Appointments | `appointments:write` | Manage appointments (≠ RBAC) | Sens | C |
| Ministries | Participation | `participations:read` | View participations | S | C/U |
| Ministries | Participation | `participations:request` | Request participation | S | Self |
| Ministries | Participation | `participations:approve` | Approve participation | Sens | C/U |
| Events | Events | `events:read` | View events | S | C/U |
| Events | Events | `events:write` | Create/update events | Sens | C/U |
| Events | Events | `events:register` | Register for events | S | C |
| Attendance | Attendance | `attendance:read` | View attendance | Sens | C/U/Self |
| Attendance | Attendance | `attendance:record` | Record attendance | Sens | C/U |
| Attendance | Attendance | `attendance:check_in_self` | Self check-in | S | Self |
| Attendance | Attendance | `attendance:correct_request` | Request attendance correction | S | Self |
| Attendance | Attendance | `attendance:correct_resolve` | Resolve corrections | Sens | C/U |
| Attendance | Attendance | `attendance:absence_notice` | Submit absence notice | S | Self |
| Attendance | Attendance | `attendance:stats_leadership` | Leadership attendance stats | Sens | C/U |
| Finance | Projects | `projects:read` | View projects | S | C/U |
| Finance | Projects | `projects:write` | Manage projects | Sens | C/U |
| Finance | Projects | `projects:assign` | Assign people to projects | Sens | C/U |
| Finance | Projects | `projects:interest` | Express project interest | S | Self |
| Finance | Funds | `funds:read` | View funds | Sens | C |
| Finance | Funds | `funds:write` | Manage funds | HR | C |
| Finance | Accounts | `accounts:read` | View accounts | Sens | C |
| Finance | Accounts | `accounts:write` | Manage accounts | HR | C |
| Finance | Periods | `periods:write` | Manage accounting periods | HR | C |
| Finance | Journals | `journals:read` | View journals | Sens | C |
| Finance | Journals | `journals:draft` | Draft journals | Sens | C |
| Finance | Journals | `journals:post` | Post journals | HR | C |
| Finance | Journals | `journals:reverse` | Reverse journals | HR | C |
| Finance | Disbursements | `disbursements:request` | Request disbursement/expense | Sens | C |
| Finance | Disbursements | `disbursements:approve` | Approve disbursement/expense | HR | C |
| Finance | Budgets | `budgets:read` | View budgets | Sens | C/U |
| Finance | Budgets | `budgets:write` | Manage budgets | Sens | C |
| Finance | Reports | `finance_reports:read` | View financial reports | Sens | C |
| Finance | Offerings | `offerings:write` | Record offerings | Sens | C |
| Finance | Pledges | `pledges:read` | View pledges | Sens | C/Self |
| Finance | Pledges | `pledges:write` | Manage pledges | Sens | C |
| Finance | Pledges | `pledges:follow_up` | Pledge follow-up | Sens | C |
| Messaging | Templates | `templates:write` | Manage message templates | Sens | C |
| Messaging | Messages | `messages:send` | Send messages | Sens | C |
| Messaging | Messages | `messages:bulk_send` | Bulk send | HR | C |
| Messaging | Announcements | `announcements:write` | Draft announcements | Sens | C/U |
| Messaging | Announcements | `announcements:publish` | Publish announcements | Sens | C/U |
| Messaging | Preferences | `preferences:self` | Manage own preferences | S | Self |

Church administrators **cannot** create, edit, or delete permission codes.

---

## 3. Seed / template roles (stable codes)

| Role code | Purpose | Default scope | Bootstrap |
|---|---|---|---|
| `church_administrator` | Church ops & configuration | church | Yes |
| `senior_pastor` | Oversight (pilot template label) | church | Yes |
| `pastoral_leadership` | Pastoral ops | church | Yes |
| `finance_officer` | Day-to-day finance recording | church | Yes |
| `chief_financial_steward` | Finance oversight / approve | church | Template |
| `ministry_leader` | Ministry operations | organisational_unit | Template |
| `department_head` | Department operations | organisational_unit | Template |
| `registrar` | Membership desk | church | Template |
| `event_recorder` | Attendance / event recording | organisational_unit | Template |
| `announcer` | Communications | church | Template |
| `member` | Member portal | self | Yes |
| `auditor` | Read-only review | church | Template |

`platform_operator` is **not** a church role — use `platform_operators`.

---

## 4. Matrix B — Role × permission (baseline templates)

Legend: **Y** = granted church-wide · **S** = granted at organisational_unit scope · **—** = not granted · **R** = restricted / SoD (do not combine with conflicting grant in same template)

| Permission | Admin | SP | Pastoral | Finance off. | Fin. steward | Min. leader | Dept head | Registrar | Event rec. | Announcer | Auditor | Member |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| church:read | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| church:update | Y | Y | — | — | — | — | — | — | — | — | — | — |
| people:read | Y | Y | Y | Y | — | S | S | Y | — | — | Y | Self |
| people:create | Y | Y | Y | — | — | S | — | Y | — | — | — | — |
| people:update | Y | Y | Y | — | — | S | — | Y | — | — | — | Self* |
| people:read_restricted | — | Y | Y | — | — | — | — | — | — | — | Y | — |
| people:delete | — | — | — | — | — | — | — | — | — | — | — | — |
| households:write | Y | Y | Y | — | — | — | — | Y | — | — | — | — |
| memberships:approve | Y | Y | Y | — | — | — | — | Y | — | — | — | — |
| units:write | Y | Y | — | — | — | — | — | — | — | — | — | — |
| appointments:write | Y | Y | — | — | — | — | — | — | — | — | — | — |
| participations:approve | Y | — | — | — | — | S | — | — | — | — | — | — |
| events:write | Y | Y | Y | — | — | S | S | — | — | — | — | — |
| attendance:record | Y | Y | Y | — | — | S | S | — | S | — | — | — |
| funds:write / accounts:write | — | — | — | Y | Y | — | — | — | — | — | — | — |
| journals:draft | — | — | — | Y | — | — | — | — | — | — | — | — |
| journals:post | — | — | — | R† | — | — | — | — | — | — | — | — |
| journals:reverse | — | — | — | — | Y | — | — | — | — | — | — | — |
| disbursements:request | — | — | — | Y | — | — | — | — | — | — | — | — |
| disbursements:approve | — | Y | Y | — | Y | — | — | — | — | — | — | — |
| finance_reports:read | — | Y | Y | Y | Y | — | — | — | — | — | Y | — |
| messages:bulk_send | Y | Y | — | — | — | — | — | — | — | Y | — | — |
| announcements:publish | Y | Y | Y | — | — | S | — | — | — | Y | — | — |
| roles:assign | Y | Y | — | — | — | — | — | — | — | — | — | — |
| roles:read | Y | Y | Y | — | — | — | — | — | — | — | Y | — |
| audit:read | Y | Y | — | Y‡ | Y‡ | — | — | — | — | — | Y | — |
| imports:run | Y | — | — | — | — | — | — | Y | — | — | — | — |
| preferences:self | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |

\* Member self-update: phone, email, photo, language, directory_opt_in only (DEC-018 / DEC-022).  
† Prefer separate poster; service may enforce draft≠post when configured. Finance Officer retains post for small-church practicality but **must not** also hold `disbursements:approve` in the same template.  
‡ Finance audit intended for finance entities; full audit still gated by `audit:read`.

**Church Administrator SoD (locked):** Admin does **not** receive `disbursements:approve`, `journals:post`, or `journals:reverse` by default. Admin may view limited finance via reports only if separately granted; baseline Admin loses finance write/approve/post from the over-broad prior seed.

---

## 5. Matrix C — Role × allowed assignment scopes

| Role | Platform | Church | Org unit | Self | Household |
|---|:-:|:-:|:-:|:-:|:-:|
| church_administrator | — | Y | — | — | — |
| senior_pastor | — | Y | — | — | — |
| pastoral_leadership | — | Y | — | — | — |
| finance_officer | — | Y | — | — | — |
| chief_financial_steward | — | Y | — | — | — |
| ministry_leader | — | — | Y | — | — |
| department_head | — | — | Y | — | — |
| registrar | — | Y | — | — | — |
| event_recorder | — | — | Y | — | — |
| announcer | — | Y | — | — | — |
| auditor | — | Y | — | — | — |
| member | — | — | — | Y | Y |
| Custom church role | — | Configurable | Configurable | Configurable | Configurable |
| platform_operator | Y | — | — | — | — |

This matrix defines **valid assignment scopes**, not inheritance.

---

## 6. Matrix D — Delegation / access administration

| Administrative action | Platform Admin | Church Admin / SP (`roles:assign`) | Delegated Access Manager |
|---|:-:|:-:|:-:|
| View permission catalogue | Y | Y | Y |
| Create/edit/delete permission codes | Y | — | — |
| View church roles | Y§ | Y | Y |
| Create custom church roles | — | Y* | Y* |
| Edit role permissions | — | Y* | Y* |
| Assign roles | — | Y* | Y* |
| Revoke roles | — | Y* | Y* |
| Grant high-risk permissions | Y§ | Y* + confirm | Y* + confirm |
| Grant platform roles | Y | — | — |
| Enter tenant (break-glass) | Y | — | — |
| Review member effective access | Y§ | Y | Y |
| Modify/delete security audit | — | — | — |

\* Only permissions/roles within the assigner’s own effective grant set (subset rule).  
§ While in audited tenant-enter mode, or via platform APIs as designed — not routine church PII browsing.

---

## 7. Segregation invariants (services)

1. Same actor must not **request and solely approve** the same disbursement/expense.
2. `journals:post` does not imply `disbursements:approve`.
3. Finance Officer template: request **or** approve — not both; prefer request + draft (+ optional post), steward/SP for approve.
4. `participations:approve` requires unit scope (or church-wide override).
5. Member never receives finance write, import, `roles:assign`, or others’ confidential contacts via directory.
6. Combining roles must not bypass SoD for the same resource instance.
7. Last active holder of `roles:assign` at church scope cannot be revoked without transfer.
8. Platform operator: break-glass time-bound intent + MFA + audit.

---

## 8. Member portal capability summary

Allowed with `member` (+ self/household scope):  
`preferences:self` · `directory:read` (opt-in) · `participations:request` · `events:read` · `events:register` · `attendance:read` (own) · `attendance:correct_request` · `projects:read` · `projects:interest` · limited self profile update · announcements feed for active members.

Denied: accounting write, imports, role admin, bulk messaging, other people’s attendance/giving, restricted fields.

---

## 9. API surface (target)

| Area | Endpoints |
|---|---|
| Catalogue | `GET /api/v1/permissions` |
| Roles | `GET/POST /api/v1/roles`, `GET/PATCH /api/v1/roles/:id`, `POST /api/v1/roles/:id/duplicate`, `POST /api/v1/roles/:id/deactivate` |
| Role permissions | `PUT /api/v1/roles/:id/permissions` |
| Templates | `GET /api/v1/role-templates`, `GET /api/v1/role-templates/:code` |
| Assignments | `GET/POST /api/v1/role-assignments`, `DELETE /api/v1/role-assignments/:id` |
| Member access | `GET /api/v1/organisation-users/:userAccountId/access` |

Every endpoint authorizes independently in its service.

---

## 10. Edge cases (must handle)

- No / suspended / ended org user → no church grants
- Expired / revoked assignment → no grant
- Deactivated role → assignments cease to authorize
- Invalid / cross-tenant / inactive unit scope → reject
- Multi-role union of grants; revoke removes that role’s contribution
- Appointment alone → no permissions
- Self-escalation via role edit/assign → blocked by subset rule
- Last admin lockout → blocked
- Template updates → do not silently rewrite existing church role permissions

---

## 11. API wiring

Handlers call services; services call `can()` before mutation.  
Frontend permission helpers consume session grants for UX only.
