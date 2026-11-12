# 06 — Accounting Module

**Status:** MVP working specification  
**Surface:** Church administration only (member portal: no finance access)  
**ERD:** `08_ERD.md` §8 · **Algorithms:** `09_DOMAIN_LOGIC_AND_ALGORITHMS.md` §4–6 · **RBAC:** `11_RBAC_AND_PERMISSIONS.md`

## 1. Purpose

Church stewardship accounting for **financial accountability and audit** — not a generic ERP.

## 2. Capabilities

| Area | In MVP |
|---|---|
| Chart of accounts | Yes — asset, liability, equity/fund balance, income, expense |
| Funds | Yes — unrestricted / restricted / designated |
| Double-entry journals | Yes — balanced; posted immutable; reverse to correct |
| Fiscal periods | Yes — open/close; no silent post to closed |
| Income / offerings | Yes — manual entry; payment method incl. mobile_money |
| Expenses + disbursements | Yes — request → approve → post payment journal |
| Budgets | Yes — by period/fund/account; project link optional |
| Pledges | Yes — vs actual; unpaid list; follow-up logs |
| Reports | Trial balance, fund balances, income/expense by period, disbursement register, project spend, pledge ageing |
| Mobile-money gateway | **Deferred** — method field only |
| Member giving portal history | **Deferred** |
| Payroll / fixed assets | **Out** |

## 3. Entity map

`Fund` · `Account` · `FiscalPeriod` · `JournalEntry` · `JournalLine` · `DisbursementRequest` · `ApprovalRecord` · `Budget` · `BudgetLine` · `Pledge` · `PledgeApplication` · `PledgeFollowUp`

Offering “types” = income accounts (and/or fund tags), not a separate product taxonomy.

## 4. Approval and segregation

| Action | Typical role |
|---|---|
| Draft/post journals, offerings, pledge ops | `finance_officer` |
| Request disbursement | `finance_officer` |
| Approve disbursement + finance reports | `senior_pastor`, `pastoral_leadership`, `chief_financial_steward` |
| Read finance reports | SP / pastoral / finance roles |

**Invariant:** requester cannot be the sole approver of the same disbursement.

## 5. Journal lifecycle

```
draft → posted → reversed (via compensating entry)
```

Invariants:
- Posted: Σ debits = Σ credits (same currency).
- Period must be `open` to post (default).
- Never edit lines of a posted entry.
- Money: `bigint` minor units + `currency` (`TZS`).

## 6. Disbursement lifecycle

```
draft → submitted → approved|rejected → paid
```

On approve: create/post payment journal; link to request; audit.

## 7. Pledge lifecycle

```
open → partial → fulfilled | cancelled
```

Apply receipt journal via `PledgeApplication`; recompute status from sum(applications).

## 8. Report set (admin)

1. Trial balance (period)  
2. Fund balances  
3. Income & expense statement (period)  
4. Disbursement register  
5. Budget vs actual (optional)  
6. Project spend (if project linked)  
7. Open/partial pledges  

## 9. Audit & data class

All finance entities = **Restricted**.  
Every create/post/approve/reverse → `AuditEvent`.  
Never log amounts with full personal identifiers in application logs; never expose to member DTOs.

## 10. Future gateway seam

Reserve later endpoints/webhooks: `/api/v1/webhooks/mobile-money/*` with signature verification, idempotency, reconciliation to journal entries — out of MVP schema beyond payment_method enum.
