import { z } from 'zod';

import { INVITABLE_LEADERSHIP_ROLE_CODES } from '@/modules/platform-ops/role-bootstrap';
import { ROLE_SCOPE_TYPES } from './constants';

const e164Phone = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be E.164 (e.g. +2557…)');

export const listRolesQuerySchema = z
  .object({
    includePermissions: z
      .enum(['0', '1', 'true', 'false'])
      .optional()
      .transform((v) => v === '1' || v === 'true'),
  })
  .strict();
export type ListRolesQuery = z.infer<typeof listRolesQuerySchema>;

export const listRoleAssignmentsQuerySchema = z
  .object({
    userAccountId: z.guid().optional(),
    roleId: z.guid().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();
export type ListRoleAssignmentsQuery = z.infer<
  typeof listRoleAssignmentsQuerySchema
>;

export const createRoleAssignmentBodySchema = z
  .object({
    userAccountId: z.guid(),
    roleId: z.guid(),
    scopeType: z.enum(ROLE_SCOPE_TYPES).default('church'),
    organisationalUnitId: z.guid().optional(),
    effectiveFrom: z.string().datetime({ offset: true }).optional(),
    effectiveTo: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.scopeType === 'organisational_unit' && !val.organisationalUnitId) {
      ctx.addIssue({
        code: 'custom',
        message: 'organisationalUnitId is required for organisational_unit scope',
        path: ['organisationalUnitId'],
      });
    }
  });
export type CreateRoleAssignmentBody = z.infer<
  typeof createRoleAssignmentBodySchema
>;

export const inviteLeadershipBodySchema = z
  .object({
    displayName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    phoneE164: e164Phone.optional(),
    roleCode: z.enum(INVITABLE_LEADERSHIP_ROLE_CODES),
    preferredLocale: z.enum(['en', 'sw']).default('sw'),
    pin: z
      .string()
      .regex(/^\d{4,8}$/, 'PIN must be 4–8 digits')
      .optional(),
  })
  .strict();
export type InviteLeadershipBody = z.infer<typeof inviteLeadershipBodySchema>;
