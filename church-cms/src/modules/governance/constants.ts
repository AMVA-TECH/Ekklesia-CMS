export const APPROVAL_SUBJECT_TYPES = ['expense', 'announcement', 'appointment_request'] as const;
export type ApprovalSubjectType = (typeof APPROVAL_SUBJECT_TYPES)[number];

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_ACTIONS = ['approve', 'reject'] as const;
export type ApprovalAction = (typeof APPROVAL_ACTIONS)[number];

export const EXPENSE_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'posted',
] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const DELEGATION_STATUSES = ['scheduled', 'active', 'ended', 'revoked'] as const;
export type DelegationStatus = (typeof DELEGATION_STATUSES)[number];

export const BUDGET_PERIOD_KINDS = ['monthly', 'quarterly', 'yearly'] as const;
export type BudgetPeriodKind = (typeof BUDGET_PERIOD_KINDS)[number];

export const MINUTES_STATUSES = ['draft', 'published', 'archived'] as const;
export type MinutesStatus = (typeof MINUTES_STATUSES)[number];

/** Default attendance engagement bands (encouragement, not scoring). */
export const ATTENDANCE_BAND_THRESHOLDS = {
  consistentMinRate: 0.8,
  irregularMinRate: 0.4,
} as const;

export const ATTENDANCE_BANDS = ['consistent', 'irregular', 'missing', 'insufficient_data'] as const;
export type AttendanceBand = (typeof ATTENDANCE_BANDS)[number];

/** Catalogue reports implemented now (14_LEADERSHIP_REPORT_CATALOGUE.md). */
export const IMPLEMENTED_REPORT_IDS = [
  'R-SP-01',
  'R-SP-02',
  'R-SP-03',
  'R-SP-04',
  'R-SP-05',
  'R-SP-06',
  'R-ADM-01',
  'R-ADM-03',
  'R-UNIT-01',
  'R-UNIT-02',
  'R-UNIT-03',
  'R-UNIT-04',
  'R-FIN-01',
  'R-FIN-02',
  'R-FIN-03',
  'R-FIN-04',
  'R-FIN-05',
  'R-FIN-06',
] as const;
export type ImplementedReportId = (typeof IMPLEMENTED_REPORT_IDS)[number];

export const REPORT_CATALOGUE: Record<
  ImplementedReportId,
  { name: string; audience: string }
> = {
  'R-SP-01': { name: 'Church pulse', audience: 'senior_pastor_pastoral' },
  'R-SP-02': { name: 'Attendance overview', audience: 'senior_pastor_pastoral' },
  'R-SP-03': { name: 'Irregular attendance / follow-up', audience: 'senior_pastor_pastoral' },
  'R-SP-04': { name: 'Participation health', audience: 'senior_pastor_pastoral' },
  'R-SP-05': { name: 'Finance summary / money flow', audience: 'senior_pastor_pastoral' },
  'R-SP-06': { name: 'Delegation log', audience: 'senior_pastor_pastoral' },
  'R-ADM-01': { name: 'Membership pipeline', audience: 'church_administrator_pogs' },
  'R-ADM-03': { name: 'Communications', audience: 'church_administrator_pogs' },
  'R-UNIT-01': { name: 'Unit roster', audience: 'unit_leaders' },
  'R-UNIT-02': { name: 'Join queue', audience: 'unit_leaders' },
  'R-UNIT-03': { name: 'Unit attendance sessions', audience: 'unit_leaders' },
  'R-UNIT-04': { name: 'Unit engagement follow-up', audience: 'unit_leaders' },
  'R-FIN-01': { name: 'Trial balance', audience: 'finance' },
  'R-FIN-02': { name: 'Fund balances', audience: 'finance' },
  'R-FIN-03': { name: 'Income & expense', audience: 'finance' },
  'R-FIN-04': { name: 'Disbursement register', audience: 'finance' },
  'R-FIN-05': { name: 'Pledges', audience: 'finance' },
  'R-FIN-06': { name: 'Budget vs actual', audience: 'finance' },
};
