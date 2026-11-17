/** Shared finance row types for ledger screens (`/api/v1/*`). */

export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface Account {
  id: string;
  code: string;
  name: string;
  accountType: AccountType;
  parentId: string | null;
  status: string;
}

export interface FinancialYear {
  id: string;
  label: string;
  startsOn: string;
  endsOn: string;
  status: 'open' | 'closed';
}

export interface JournalLine {
  id: string;
  accountId: string;
  fundId: string | null;
  debitMinor: number;
  creditMinor: number;
  currency: string;
  memo: string | null;
}

export interface Journal {
  id: string;
  financialYearId: string;
  entryNumber: string;
  journalDate: string;
  memo: string | null;
  paymentMethod: string | null;
  status: 'draft' | 'posted' | 'reversed';
  reversesEntryId: string | null;
  postedAt: string | null;
  lines: JournalLine[];
}

export interface Budget {
  id: string;
  financialYearId: string;
  fundId: string | null;
  organisationalUnitId: string | null;
  name: string;
  periodKind: 'monthly' | 'quarterly' | 'yearly';
  periodKey: string;
  startsOn: string | null;
  endsOn: string | null;
  status: string;
  lines: Array<{ id: string; accountId: string; amountMinor: number }>;
  plannedMinor: number;
}

/** "1000 · Cash at bank" label for selects and tables. */
export function accountLabel(a: Pick<Account, 'code' | 'name'> | undefined): string {
  return a ? `${a.code} · ${a.name}` : '—';
}
