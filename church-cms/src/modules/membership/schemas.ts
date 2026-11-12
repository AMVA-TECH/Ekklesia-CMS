import { z } from 'zod';

import {
  MEMBERSHIP_APPLICATION_STATUSES,
  MEMBERSHIP_DECISION_OUTCOMES,
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_TYPES,
} from './constants';

export const updateMembershipStatusBodySchema = z
  .object({
    status: z.enum(MEMBERSHIP_STATUSES),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export type UpdateMembershipStatusBody = z.infer<
  typeof updateMembershipStatusBodySchema
>;

export const createMembershipBodySchema = z
  .object({
    personId: z.guid(),
    membershipType: z.enum(MEMBERSHIP_TYPES).default('individual'),
    status: z.enum(MEMBERSHIP_STATUSES).default('visitor'),
    householdId: z.guid().optional(),
    effectiveFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();
export type CreateMembershipBody = z.infer<typeof createMembershipBodySchema>;

export const listMembershipsQuerySchema = z
  .object({
    status: z.enum(MEMBERSHIP_STATUSES).optional(),
    q: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.guid().optional(),
  })
  .strict();
export type ListMembershipsQuery = z.infer<typeof listMembershipsQuerySchema>;

export const createMembershipApplicationBodySchema = z
  .object({
    personId: z.guid().optional(),
    householdId: z.guid().optional(),
  })
  .strict();
export type CreateMembershipApplicationBody = z.infer<
  typeof createMembershipApplicationBodySchema
>;

export const listMembershipApplicationsQuerySchema = z
  .object({
    status: z.enum(MEMBERSHIP_APPLICATION_STATUSES).default('pending'),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
export type ListMembershipApplicationsQuery = z.infer<
  typeof listMembershipApplicationsQuerySchema
>;

export const decideMembershipApplicationBodySchema = z
  .object({
    outcome: z.enum(MEMBERSHIP_DECISION_OUTCOMES),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();
export type DecideMembershipApplicationBody = z.infer<
  typeof decideMembershipApplicationBodySchema
>;

export const membershipResponseSchema = z.object({
  id: z.guid(),
  personId: z.guid(),
  householdId: z.guid().nullable(),
  membershipType: z.enum(MEMBERSHIP_TYPES),
  status: z.enum(MEMBERSHIP_STATUSES),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
});

export type MembershipResponse = z.infer<typeof membershipResponseSchema>;
