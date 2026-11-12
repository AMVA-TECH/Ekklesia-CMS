export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const FUND_TYPES = ['unrestricted', 'restricted', 'designated'] as const;
export type FundType = (typeof FUND_TYPES)[number];

export const ACTIVE_STATUSES = ['active', 'inactive'] as const;
export const PERIOD_STATUSES = ['open', 'closed'] as const;
export const JOURNAL_STATUSES = ['draft', 'posted', 'reversed'] as const;
export const PLEDGE_STATUSES = ['open', 'partial', 'fulfilled', 'cancelled'] as const;

export const CURRENCIES = ['TZS', 'USD', 'EUR'] as const;

export const PROJECT_STATUSES = ['active', 'closed'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_ASSIGNMENT_STATUSES = ['active', 'ended'] as const;
export type ProjectAssignmentStatus = (typeof PROJECT_ASSIGNMENT_STATUSES)[number];

export const PROJECT_INTEREST_STATUSES = [
  'pending',
  'accepted',
  'declined',
  'withdrawn',
] as const;
export type ProjectInterestStatus = (typeof PROJECT_INTEREST_STATUSES)[number];

