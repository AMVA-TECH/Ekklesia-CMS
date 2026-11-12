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
    photoMediaId: z.guid().nullable().optional(),
  })
  .strict();

export type UpdatePersonBody = z.infer<typeof updatePersonBodySchema>;

/** DEC-018 portal self-edit — restricted fields only. */
export const updateMyProfileBodySchema = z
  .object({
    phoneE164: e164Phone.nullable().optional(),
    email: z.string().email().nullable().optional(),
    preferredLocale: z.enum(LOCALES).optional(),
    directoryOptIn: z.boolean().optional(),
    photoMediaId: z.guid().nullable().optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.phoneE164 !== undefined ||
      v.email !== undefined ||
      v.preferredLocale !== undefined ||
      v.directoryOptIn !== undefined ||
      v.photoMediaId !== undefined,
    { message: 'At least one field is required' },
  );
export type UpdateMyProfileBody = z.infer<typeof updateMyProfileBodySchema>;

export const listDirectoryQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.guid().optional(),
  })
  .strict();
export type ListDirectoryQuery = z.infer<typeof listDirectoryQuerySchema>;

export const listPeopleQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.guid().optional(),
  })
  .strict();

export type ListPeopleQuery = z.infer<typeof listPeopleQuerySchema>;

export const createPersonContactBodySchema = z
  .object({
    channel: z.enum(CONTACT_CHANNELS),
    value: z.string().trim().min(1).max(320),
    isPrimary: z.boolean().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.channel === 'phone' && !/^\+[1-9]\d{6,14}$/.test(val.value)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Phone must be E.164 (+255…)',
        path: ['value'],
      });
    }
    if (val.channel === 'email' && !z.string().email().safeParse(val.value).success) {
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid email',
        path: ['value'],
      });
    }
  });
export type CreatePersonContactBody = z.infer<typeof createPersonContactBodySchema>;

export const personResponseSchema = z.object({
  id: z.guid(),
  displayName: z.string(),
  fullName: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  preferredLocale: z.string(),
  directoryOptIn: z.boolean(),
  photoMediaId: z.guid().nullable().optional(),
  contacts: z.array(
    z.object({
      id: z.guid(),
      channel: z.enum(CONTACT_CHANNELS),
      value: z.string(),
      isPrimary: z.boolean(),
    }),
  ),
  createdAt: z.string(),
});

export type PersonResponse = z.infer<typeof personResponseSchema>;

export const directoryEntryResponseSchema = z.object({
  personId: z.guid(),
  displayName: z.string(),
  photoMediaId: z.guid().nullable(),
  ministries: z.array(
    z.object({
      organisationalUnitId: z.guid(),
      name: z.string(),
      roleInUnit: z.string().nullable(),
    }),
  ),
});
export type DirectoryEntryResponse = z.infer<typeof directoryEntryResponseSchema>;
