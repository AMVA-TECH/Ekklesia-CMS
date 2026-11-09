import { z } from 'zod';

import { HOUSEHOLD_RELATIONSHIPS, MAX_HOUSEHOLD_CHILD_AGE } from './constants';

export const createHouseholdBodySchema = z
  .object({
    label: z.string().trim().min(1).max(200),
    sharedAddress: z.string().trim().max(500).optional(),
    emergencyContactName: z.string().trim().max(200).optional(),
    emergencyContactPhone: z
      .string()
      .regex(/^\+[1-9]\d{6,14}$/)
      .optional(),
    memberPersonIds: z.array(z.string().uuid()).max(20).default([]),
    children: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(200),
          age: z.number().int().min(0).max(MAX_HOUSEHOLD_CHILD_AGE),
        }),
      )
      .max(20)
      .default([]),
  })
  .strict();

export type CreateHouseholdBody = z.infer<typeof createHouseholdBodySchema>;

export const addHouseholdMemberBodySchema = z
  .object({
    personId: z.string().uuid(),
    relationship: z.enum(HOUSEHOLD_RELATIONSHIPS).default('member'),
    isPrimaryContact: z.boolean().optional(),
  })
  .strict();

export type AddHouseholdMemberBody = z.infer<typeof addHouseholdMemberBodySchema>;

export const householdResponseSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  sharedAddress: z.string().nullable(),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhone: z.string().nullable(),
  members: z.array(
    z.object({
      id: z.string().uuid(),
      personId: z.string().uuid(),
      relationship: z.string(),
      isPrimaryContact: z.boolean(),
    }),
  ),
  children: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      age: z.number().int(),
    }),
  ),
});

export type HouseholdResponse = z.infer<typeof householdResponseSchema>;
