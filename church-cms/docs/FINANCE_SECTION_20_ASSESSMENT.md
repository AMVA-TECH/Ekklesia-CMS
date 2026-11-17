# §20 Finance Management — Stage 1 assessment

**Source brief:** Finance Management — Core Features and Church Financial Structure (§20)  
**Date:** 2026-11-14  
**Status:** Assessment (not yet approved for build)  
**Related:** `docs/CMS_Business_Analysis/04_domain_and_data/06_ACCOUNTING_MODULE.md`, DEC-013 / DEC-024 / DEC-025, OQ-007

## 1. Business problem and outcome

**Problem:** Churches need practical stewardship finance — configurable income/funds/expenses/accounts, daily recording, approvals, budgets, and reports — without an enterprise ERP.

**Outcome:** Each church can define its financial makeup, run day-to-day income/expense/fund workflows with RBAC and audit, and produce reconcilable reports. CrossLife gets editable starter categories in TZS with **no invented balances**.

## 2. AS-IS (Ekklesia today)

| §20 area | API / schema | Admin UI | Notes |
|---|---|---|---|
| Income / offerings | Yes | Yes | Manual; post to GL |
| Pledges (separate from cash) | Yes | Yes | Applications + follow-ups |
| Funds (general / restricted / designated) | Yes | List + create | No edit/deactivate |
| Chart of Accounts | Yes | No | Used inside offering dialog |
| Financial years | Yes | No | Create + close API |
| Journals (draft / post / reverse) | Yes | No | No list endpoint |
| Expenses (request → approve → pay) | Yes | No | Dual-control on approve |
| Budgets + vs actual | Yes | No | M/Q/Y |
| Projects / contributions | Yes | No | Fundraising seam |
| R-FIN reports | Yes | No | Trial balance, funds, I&E, etc. |
| Finance dashboard | Partial | Thin overview | Offerings/funds/pledges summary |
| Finance Settings (categories, funds, accounts, periods, approvals) | Partial | Missing | No dedicated settings area |
| Bank / cash accounts + reconciliation | **Missing** | — | Deposit account = GL asset today |
| Income/expense category taxonomy (church-configurable, beyond CoA) | **Thin** | — | Income ≈ income GL accounts; no separate category entity |
| Org dimensions (ministry / dept / team on txns) | Partial | — | Unit/project links uneven |
| Role templates (§20.8) | Partial | — | `finance_officer` seeded; CFS not in default pack |
| TZS default | Yes | Yes | USD/EUR codes; no FX rates |
| Soft-delete / deactivate categories with history | Partial | — | Soft-delete pattern elsewhere; funds lack deactivate API |
| Bank rec, AP/AR, payroll, FA, tax automation | Out / deferred | — | Aligns with §20.10 |

**Verdict:** Accounting **foundation is largely API-complete**. The product gap vs §20 is mainly **configuration UX, operator workflows, reporting UI, and bank-account semantics** — not inventing a new ledger from scratch.

## 3. TO-BE (aligned with §20, not ERP)

Keep double-entry + funds as source of truth. Add church-configurable **makeup** and operator surfaces. Defer gateway, AP/AR, payroll, FA, complex FX (§20.10).

### Conceptual model (do not conflate)

| Concept | Role |
|---|---|
| **Fund** | Stewardship purpose + restriction rules |
| **Ledger account (CoA)** | Double-entry posting account |
| **Financial account** | Where money sits (bank, cash, mobile money) — **new / clarified** vs today’s “asset GL only” |
| **Income / expense category** | Church-facing labels; map to CoA (+ optional fund defaults) |
| **Org dimension** | Optional: unit / ministry / project / campaign |

## 4. Requirement IDs (stable)

| ID | Requirement | Priority |
|---|---|---|
| FIN-CFG-01 | Finance Settings: income categories CRUD + deactivate | P0 |
| FIN-CFG-02 | Expense categories CRUD + deactivate | P0 |
| FIN-CFG-03 | Funds create/edit/deactivate; restriction class + purpose | P0 |
| FIN-CFG-04 | Financial accounts (bank/cash/momo) distinct from CoA | P0 |
| FIN-CFG-05 | CoA manage UI; map categories → accounts | P0 |
| FIN-CFG-06 | Accounting periods / FY UI | P0 |
| FIN-CFG-07 | Currencies (default TZS); no hardcoded tax | P1 |
| FIN-CFG-08 | Approval settings / limits | P1 |
| FIN-CFG-09 | CrossLife soft-seed categories (editable; no balances) | P0 |
| FIN-INC-01 | Income recording with category, fund, method, receiving account, verification | P0 |
| FIN-INC-02 | Batch / daily contribution summary | P1 |
| FIN-INC-03 | Receipts / supporting reference | P1 |
| FIN-EXP-01 | Expense submit / approve / reject / pay (pay ≠ approve) | P0 |
| FIN-EXP-02 | Expense UI + approvals inbox | P0 |
| FIN-CASH-01 | Cashbook, transfer, balances on financial accounts | P1 |
| FIN-CASH-02 | Basic bank reconciliation | P2 |
| FIN-BUD-01 | Budget prepare / approve / revise UI + vs actual | P1 |
| FIN-GL-01 | Journal list / draft / post / reverse UI | P0 |
| FIN-RPT-01 | Report centre for §20.3.G catalogue (reuse R-FIN where possible) | P0 |
| FIN-RPT-02 | PDF / spreadsheet export beyond offerings CSV | P1 |
| FIN-DASH-01 | Finance dashboard from posted records only | P0 |
| FIN-CTL-01 | RBAC templates (§20.8) + scope; no auto-grant from leadership titles | P0 |
| FIN-CTL-02 | Audit, reversals, dual-control preserved | P0 |
| FIN-TEN-01 | Tenant isolation + historical preservation on deactivate | P0 |

## 5. Proposed delivery phases

### Phase A — Makeup + operator core (pilot-critical)

1. Finance Settings shell (categories, funds, CoA, FY, financial accounts).  
2. Soft CrossLife starter seed (FIN-CFG-09) — opt-in, editable.  
3. Admin UIs: expenses + approvals, journals, CoA/FY, richer dashboard.  
4. Report centre wired to existing R-FIN APIs.  
5. Role template pack alignment (CFS, accountant, collections, auditor read-only).  
6. Deactivate (not delete) for categories/funds/accounts with history.

**Exit:** Church can configure makeup, record income/expenses with approvals, see balances/reports, TZS, no invented money.

### Phase B — Cash discipline + budgets

Financial-account cashbook, transfers, basic reconciliation; budget UI; batch income; export pack; approval limits.

### Phase C — Later (only if justified)

Advanced FX revaluation, AP/AR, forecasting, gateway — architecture seams only until then.

## 6. Explicit out of scope (now)

Matches §20.10: complex AP/AR, FA depreciation, inventory, payroll, tax automation, multi-company consolidation, advanced forecasting, complex FX revaluation, live mobile-money gateway.

## 7. Open questions (unblockers only)

| ID | Question | Blocks |
|---|---|---|
| OQ-007 | Which finance workflows are in pilot scope? Propose: **Phase A** for CrossLife. | Build order |
| OQ-042 | Confirm CrossLife starter income/funds/expense labels in §20.7 (edit later OK)? | Soft seed |
| OQ-043 | Financial accounts: new entity linked to asset CoA, or tag existing asset accounts? Recommend **new entity → asset account**. | FIN-CFG-04 schema |

## 8. Acceptance (Phase A)

- Church configures income/expense categories, funds, financial accounts, CoA, FY.  
- Income and expenses recorded with fund/account links; expense approve ≠ paid until payment step.  
- Posted journals balance; no silent edit of posted entries.  
- Dashboard + core reports from posted data.  
- RBAC + audit; tenant isolation.  
- CrossLife soft seed only; **zero invented balances**.  
- Deactivate preserves history.
