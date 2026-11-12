import { z } from 'zod';

import { EXPORT_FORMATS, EXPORT_KINDS } from './constants';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createExportBodySchema = z
  .object({
    kind: z.enum(EXPORT_KINDS),
    format: z.enum(EXPORT_FORMATS).default('csv'),
    from: dateOnly.optional(),
    to: dateOnly.optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.kind === 'attendance' || val.kind === 'finance') {
      if (!val.from || !val.to) {
        ctx.addIssue({
          code: 'custom',
          message: 'from and to are required for attendance and finance exports',
          path: ['from'],
        });
      } else if (val.from > val.to) {
        ctx.addIssue({
          code: 'custom',
          message: 'from must be on or before to',
          path: ['from'],
        });
      }
    }
  });

export type CreateExportBody = z.infer<typeof createExportBodySchema>;
