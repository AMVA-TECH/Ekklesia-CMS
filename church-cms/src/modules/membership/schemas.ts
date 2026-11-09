import { z } from 'zod';

import { MEMBERSHIP_STATUSES, MEMBERSHIP_TYPES } from './constants';

export const updateMembershipStatusBodySchema = z
  .object({
    status: z.enum(MEMBERSHIP_STATUSES),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export type UpdateMembershipStatusBody = z.infer<
  typeof updateMembershipStatusBodySchema
>;

export const membershipResponseSchema = z.object({
  id: z.string().uuid(),
  personId: z.string().uuid(),
  householdId: z.string().uuid().nullable(),
  membershipType: z.enum(MEMBERSHIP_TYPES),
  status: z.enum(MEMBERSHIP_STATUSES),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
});

export type MembershipResponse = z.infer<typeof membershipResponseSchema>;
