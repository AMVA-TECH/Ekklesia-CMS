import { z } from 'zod';

import { CONTACT_CHANNELS, LOCALES } from './constants';

const e164Phone = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be E.164 (+255…)');

export const createPersonBodySchema = z
  .object({
    displayName: z.string().trim().min(1).max(200),
    fullName: z.string().trim().min(1).max(300).optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    preferredLocale: z.enum(LOCALES).optional(),
    directoryOptIn: z.boolean().optional(),
    phoneE164: e164Phone.optional(),
    email: z.string().email().optional(),
  })
  .strict();

export type CreatePersonBody = z.infer<typeof createPersonBodySchema>;

export const updatePersonBodySchema = z
  .object({
    displayName: z.string().trim().min(1).max(200).optional(),
    fullName: z.string().trim().min(1).max(300).nullable().optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    preferredLocale: z.enum(LOCALES).optional(),
    directoryOptIn: z.boolean().optional(),
  })
  .strict();

export type UpdatePersonBody = z.infer<typeof updatePersonBodySchema>;

export const listPeopleQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().uuid().optional(),
  })
  .strict();

export type ListPeopleQuery = z.infer<typeof listPeopleQuerySchema>;

export const personResponseSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  fullName: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  preferredLocale: z.string(),
  directoryOptIn: z.boolean(),
  contacts: z.array(
    z.object({
      id: z.string().uuid(),
      channel: z.enum(CONTACT_CHANNELS),
      value: z.string(),
      isPrimary: z.boolean(),
    }),
  ),
  createdAt: z.string(),
});

export type PersonResponse = z.infer<typeof personResponseSchema>;
