import { z } from 'zod';

import { CHURCH_LOCALES } from './constants';

export const updateChurchBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    timezone: z.string().trim().min(1).max(80).optional(),
    defaultLocale: z.enum(CHURCH_LOCALES).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field is required',
  });
export type UpdateChurchBody = z.infer<typeof updateChurchBodySchema>;

export const updateChurchSettingsBodySchema = z
  .object({
    settings: z.record(z.string().max(100), z.unknown()),
  })
  .strict()
  .superRefine((val, ctx) => {
    const keys = Object.keys(val.settings);
    if (keys.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'settings must include at least one key',
        path: ['settings'],
      });
    }
    if (keys.length > 50) {
      ctx.addIssue({
        code: 'custom',
        message: 'settings may include at most 50 keys per update',
        path: ['settings'],
      });
    }
  });
export type UpdateChurchSettingsBody = z.infer<
  typeof updateChurchSettingsBodySchema
>;
