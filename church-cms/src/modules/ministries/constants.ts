export const PARTICIPATION_STATUSES = ['active', 'ended'] as const;
export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

export const REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** Allowed status transitions for participation rows. */
export const PARTICIPATION_STATUS_TRANSITIONS: Record<
  ParticipationStatus,
  readonly ParticipationStatus[]
> = {
  active: ['ended'],
  ended: ['active'],
};
