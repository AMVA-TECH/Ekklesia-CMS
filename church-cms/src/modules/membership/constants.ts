/** Membership status values (catalog §3). */
export const MEMBERSHIP_STATUSES = ['visitor', 'active', 'inactive'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/** Membership type values (catalog §3). */
export const MEMBERSHIP_TYPES = ['individual', 'household', 'family'] as const;
export type MembershipType = (typeof MEMBERSHIP_TYPES)[number];

/** Membership application statuses. */
export const MEMBERSHIP_APPLICATION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'withdrawn',
] as const;
export type MembershipApplicationStatus =
  (typeof MEMBERSHIP_APPLICATION_STATUSES)[number];

export const MEMBERSHIP_DECISION_OUTCOMES = ['approved', 'rejected'] as const;
export type MembershipDecisionOutcome =
  (typeof MEMBERSHIP_DECISION_OUTCOMES)[number];

/** Allowed status transitions (domain logic). */
export const MEMBERSHIP_STATUS_TRANSITIONS: Record<
  MembershipStatus,
  readonly MembershipStatus[]
> = {
  visitor: ['active', 'inactive'],
  active: ['inactive'],
  inactive: ['active'],
};
