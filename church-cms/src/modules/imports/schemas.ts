import { z } from 'zod';
import { COMMIT_STRATEGIES } from './constants';

const e164 = z.string().regex(/^\+[1-9]\d{6,14}$/);

export const memberImportRowSchema = z
  .object({
    displayName: z.string().trim().min(1).max(200),
    fullName: z.string().trim().min(1).max(300).optional(),
    phoneE164: e164.optional(),
    email: z.string().email().optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    preferredLocale: z.enum(['sw', 'en']).optional(),
  })
  .strict();

export type MemberImportRow = z.infer<typeof memberImportRowSchema>;

export const createMembersImportBodySchema = z
  .object({
    rows: z.array(z.record(z.string(), z.string())).max(5000).optional(),
    csv: z.string().min(1).max(5_000_000).optional(),
  })
  .strict()
  .refine((v) => !!v.rows?.length || !!v.csv, {
    message: 'Provide rows or csv',
  });

export type CreateMembersImportBody = z.infer<typeof createMembersImportBodySchema>;

export const commitImportBodySchema = z
  .object({
    strategy: z.enum(COMMIT_STRATEGIES).default('skip_conflicts'),
  })
  .strict();

export type CommitImportBody = z.infer<typeof commitImportBodySchema>;
