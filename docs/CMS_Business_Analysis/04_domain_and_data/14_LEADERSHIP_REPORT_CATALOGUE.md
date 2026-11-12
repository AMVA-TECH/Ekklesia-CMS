# 14 — Leadership Report Catalogue

**Status:** MVP working baseline  
**Closes:** OQ-019  
**Aligns with:** RBAC scopes · finance module · attendance DEC-031 · approval matrix

Reports are **permission-scoped**. Unit leaders see their unit only unless they also hold church-wide roles.

## 1. Catalogue by audience

### A. Senior Pastor & pastoral leadership

| Report ID | Name | Content | Cadence |
|---|---|---|---|
| R-SP-01 | Church pulse | Active/visitor/inactive counts; new members period; open approval queues | Weekly |
| R-SP-02 | Attendance overview | Day aggregates, per-service breakdown, trends | Weekly |
| R-SP-03 | Follow-up list | Individuals/families: irregular/missing bands, open absence notices | Weekly |
| R-SP-04 | Participation health | Life-group coverage; ministries with pending joins | Monthly |
| R-SP-05 | Finance summary | Fund balances, income/expense period, disbursements pending/approved | Monthly / on demand |
| R-SP-06 | Delegation log | Active/ended delegations | On demand |

Permission: church-wide read for each domain (`memberships:read`, `attendance:stats_leadership`, `finance_reports:read`, etc.).

### B. Church Administrator & POGS

| Report ID | Name | Content | Cadence |
|---|---|---|---|
| R-ADM-01 | Membership pipeline | Applications pending; visitor ageing | Daily/weekly |
| R-ADM-02 | People ops | Recent registrations; import job results; duplicate/conflict flags | Weekly |
| R-ADM-03 | Communications | Announcements pending; message job delivery rates | Weekly |
| R-ADM-04 | Absence inbox | Absence notices by date | Weekly |
| R-ADM-05 | Audit extract | High-impact actions (scoped) | On demand |

### C. Ministry / life-group / department leaders (scoped)

| Report ID | Name | Content | Cadence |
|---|---|---|---|
| R-UNIT-01 | Unit roster | Active participations; leaders | On demand |
| R-UNIT-02 | Join queue | Pending participation requests | Daily |
| R-UNIT-03 | Unit attendance | Session records/summaries for unit events | Weekly |
| R-UNIT-04 | Unit engagement | Members with low attendance band in this unit’s meetings | Weekly |

### D. Finance officer & chief financial steward

| Report ID | Name | Content | Cadence |
|---|---|---|---|
| R-FIN-01 | Trial balance | Period | On demand |
| R-FIN-02 | Fund balances | By fund | On demand |
| R-FIN-03 | Income & expense | Period | Monthly |
| R-FIN-04 | Disbursement register | Status pipeline | Weekly |
| R-FIN-05 | Pledges | Open/partial/unpaid; follow-ups | Weekly |
| R-FIN-06 | Budget vs actual | If budgets used | Monthly |

### E. Children’s ministry leaders/teachers (when unit exists)

| Report ID | Name | Content | Cadence |
|---|---|---|---|
| R-CHILD-01 | Children’s headcount | Per session totals | Weekly |

### F. Member (self)

| Report ID | Name | Content | Cadence |
|---|---|---|---|
| R-ME-01 | My attendance | Calendar, progress band, notices | On demand |
| R-ME-02 | My giving | **Out of MVP** until portal giving enabled | — |

## 2. Exports

- CSV/Excel where `exports:run` granted; finance exports Restricted + audited.  
- No unbounded dumps; date range required.

## 3. Delivery

- In-app report hub (admin) + portal widgets (member).  
- Optional scheduled WhatsApp/SMS **summary** to SP later (not required for MVP modelling).

## 4. API sketch

- `GET /reports/{reportId}?from=&to=&unitId=`  
- Authorisation = same as underlying domain permissions; never return other units’ data to scoped leaders.
