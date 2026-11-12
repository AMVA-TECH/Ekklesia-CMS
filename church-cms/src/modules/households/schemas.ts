import { z } from 'zod';

import { HOUSEHOLD_RELATIONSHIPS, MAX_HOUSEHOLD_CHILD_AGE } from './constants';

const e164Phone = z.string().regex(/^\+[1-9]\d{6,14}$/);

export const createHouseholdBodySchema = z
  .object({
    label: z.string().trim().min(1).max(200),
    sharedAddress: z.string().trim().max(500).optional(),
    emergencyContactName: z.string().trim().max(200).optional(),
    emergencyContactPhone: e164Phone.optional(),
    memberPersonIds: z.array(z.guid()).max(20).default([]),
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

export const updateHouseholdBodySchema = z
  .object({
    label: z.string().trim().min(1).max(200).optional(),
    sharedAddress: z.string().trim().max(500).nullable().optional(),
    emergencyContactName: z.string().trim().max(200).nullable().optional(),
    emergencyContactPhone: e164Phone.nullable().optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.label !== undefined ||
      v.sharedAddress !== undefined ||
      v.emergencyContactName !== undefined ||
      v.emergencyContactPhone !== undefined,
    { message: 'At least one field is required' },
  );
export type UpdateHouseholdBody = z.infer<typeof updateHouseholdBodySchema>;

export const listHouseholdsQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.guid().optional(),
  })
  .strict();
export type ListHouseholdsQuery = z.infer<typeof listHouseholdsQuerySchema>;

export const addHouseholdMemberBodySchema = z
  .object({
    personId: z.guid(),
    relationship: z.enum(HOUSEHOLD_RELATIONSHIPS).default('member'),
    isPrimaryContact: z.boolean().optional(),
  })
  .strict();

export type AddHouseholdMemberBody = z.infer<typeof addHouseholdMemberBodySchema>;

export const addHouseholdChildBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    age: z.number().int().min(0).max(MAX_HOUSEHOLD_CHILD_AGE),
  })
  .strict();

export type AddHouseholdChildBody = z.infer<typeof addHouseholdChildBodySchema>;

export const householdResponseSchema = z.object({
  id: z.guid(),
  label: z.string(),
  sharedAddress: z.string().nullable(),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhone: z.string().nullable(),
  members: z.array(
    z.object({
      id: z.guid(),
      personId: z.guid(),
      relationship: z.string(),
      isPrimaryContact: z.boolean(),
    }),
  ),
  children: z.array(
    z.object({
      id: z.guid(),
      name: z.string(),
      age: z.number().int(),
    }),
  ),
});

export type HouseholdResponse = z.infer<typeof householdResponseSchema>;
