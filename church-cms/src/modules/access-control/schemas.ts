import { z } from 'zod';

import { INVITABLE_LEADERSHIP_ROLE_CODES } from '@/modules/platform-ops/role-bootstrap';
import { optionalTanzaniaPhoneE164Schema } from '@/platform/phone';
import { ROLE_SCOPE_TYPES } from './constants';

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
    sourceAppointmentId: z.guid().optional(),
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
    phoneE164: optionalTanzaniaPhoneE164Schema,
    roleCode: z.enum(INVITABLE_LEADERSHIP_ROLE_CODES),
    preferredLocale: z.enum(['en', 'sw']).default('sw'),
    pin: z
      .string()
      .regex(/^\d{4,8}$/, 'PIN must be 4–8 digits')
      .optional(),
  })
  .strict();
export type InviteLeadershipBody = z.infer<typeof inviteLeadershipBodySchema>;

export const createRoleBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    code: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[a-z][a-z0-9_]*$/, 'code must be snake_case'),
    permissions: z.array(z.string().min(1)).max(200).default([]),
  })
  .strict();
export type CreateRoleBody = z.infer<typeof createRoleBodySchema>;

export const updateRoleBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
  })
  .strict();
export type UpdateRoleBody = z.infer<typeof updateRoleBodySchema>;

export const updateRolePermissionsBodySchema = z
  .object({
    permissions: z.array(z.string().min(1)).max(200),
    confirmHighRisk: z.boolean().optional(),
  })
  .strict();
export type UpdateRolePermissionsBody = z.infer<
  typeof updateRolePermissionsBodySchema
>;

export const duplicateRoleBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    code: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[a-z][a-z0-9_]*$/, 'code must be snake_case'),
  })
  .strict();
export type DuplicateRoleBody = z.infer<typeof duplicateRoleBodySchema>;

/** Apply platform template permission baselines to matching church roles. */
export const applyRoleTemplatesBodySchema = z
  .object({
    /** Required explicit confirmation — never silent rematrix. */
    confirm: z.literal(true),
    /** Optional subset of template codes; default = all bootstrap templates. */
    codes: z.array(z.string().min(1)).max(50).optional(),
  })
  .strict();
export type ApplyRoleTemplatesBody = z.infer<typeof applyRoleTemplatesBodySchema>;

/** Dry-run rematrix comparison (no mutation). */
export const compareRoleTemplatesBodySchema = z
  .object({
    codes: z.array(z.string().min(1)).max(50).optional(),
  })
  .strict();
export type CompareRoleTemplatesBody = z.infer<
  typeof compareRoleTemplatesBodySchema
>;
