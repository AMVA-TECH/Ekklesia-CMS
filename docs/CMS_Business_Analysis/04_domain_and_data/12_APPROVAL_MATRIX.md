# 12 — Approval Matrix

**Status:** MVP working baseline  
**Aligns with:** DEC-008–013, DEC-017, DEC-031 · `11_RBAC_AND_PERMISSIONS.md` · `09_DOMAIN_LOGIC_AND_ALGORITHMS.md`

Rules:
- Appointment title ≠ approval right (RBAC grants rights).
- Every decision below writes `AuditEvent` (and domain outbox where listed).
- Cross-church always denied (404).

## 1. Matrix

| Action | Primary approver(s) | Also allowed | Notify / report to | Notes |
|---|---|---|---|---|
| Appoint / remove leaders | Senior Pastor | — | Pastoral leadership (optional) | DEC-008 |
| Membership approve / reject | Pastoral leadership **and/or** Church Admin **and/or** POGS | SP | — | DEC-012; any one of these roles may decide unless church sets dual-control later |
| Ministry / life-group join | Leaders of **that unit** (scoped) | Church Admin (override) | Pastoral leadership (notification) | DEC-017 |
| Disbursement approve | SP, pastoral leadership, chief financial steward | — | Finance officer (outcome) | Requester ≠ sole approver |
| Journal post | Finance officer | Fin. steward (policy) | — | Not an “approval”; posting right |
| Journal reverse | Finance officer / steward | SP (exception) | Pastoral if material | |
| Attendance correction resolve | Admin / attendance resolvers | Unit leader (own unit sessions) | Requester | |
| Absence notice | N/A (submit) | Household primary may submit for household | Admin + pastoral queue | Tracking, not approve/reject required for MVP |
| Announcement publish | See `13_ANNOUNCEMENTS_AND_DELEGATION.md` | | | DEC-032 |
| Import commit | Admin / registrar / POGS | — | Admin | |
| Role assign | SP / Church Admin | — | Audit only | Elevated |
| Delegation activate | SP (or standing rule for Associate Pastor) | — | Pastoral leadership | DEC-033 |

## 2. Queues (admin UX)

Leaders should see pending counts for:
- Membership applications  
- Participation requests (their units)  
- Disbursements awaiting approval  
- Announcements awaiting publish approval  
- Attendance correction requests  
- Absence notices (inbox, not blocking)

## 3. Dual-control flags (configurable later)

MVP defaults: single approver from the allowed set.  
Churches may later require two approvers for membership or disbursements above a threshold.
