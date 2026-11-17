/** `GET /api/v1/expenses` row. */
export interface Expense {
  id: string;
  amountMinor: number;
  currency: string;
  expenseDate: string;
  purpose: string;
  organisationalUnitId: string | null;
  accountId: string | null;
  paymentAccountId: string | null;
  fundId: string | null;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'posted';
  journalId: string | null;
}
