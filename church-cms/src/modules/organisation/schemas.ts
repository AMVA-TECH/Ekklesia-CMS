import { z } from 'zod';

import {
  APPOINTMENT_STATUSES,
  PROGRAMME_STATUSES,
  UNIT_KINDS,
  UNIT_STATUSES,
} from './constants';

export const createUnitBodySchema = z
  .object({
    kind: z.enum(UNIT_KINDS),
    name: z.string().trim().min(1).max(200),
    parentId: z.guid().optional(),
    status: z.enum(UNIT_STATUSES).optional(),
  })
  .strict();

export type CreateUnitBody = z.infer<typeof createUnitBodySchema>;

export const listUnitsQuerySchema = z
  .object({
    kind: z.enum(UNIT_KINDS).optional(),
    status: z.enum(UNIT_STATUSES).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export type ListUnitsQuery = z.infer<typeof listUnitsQuerySchema>;

export const createProgrammeBodySchema = z
  .object({
    ministryUnitId: z.guid(),
    name: z.string().trim().min(1).max(200),
    status: z.enum(PROGRAMME_STATUSES).optional(),
  })
  .strict();

export type CreateProgrammeBody = z.infer<typeof createProgrammeBodySchema>;

/** Body for nested POST /organisational-units/:id/programmes (unit id from path). */
export const createProgrammeUnderUnitBodySchema = createProgrammeBodySchema.omit({
  ministryUnitId: true,
});

export type CreateProgrammeUnderUnitBody = z.infer<
  typeof createProgrammeUnderUnitBodySchema
>;

export const unitResponseSchema = z.object({
  id: z.guid(),
  kind: z.string(),
  name: z.string(),
  parentId: z.guid().nullable(),
  status: z.string(),
});

export type UnitResponse = z.infer<typeof unitResponseSchema>;

export const programmeResponseSchema = z.object({
  id: z.guid(),
  ministryUnitId: z.guid(),
  name: z.string(),
  status: z.string(),
});

export type ProgrammeResponse = z.infer<typeof programmeResponseSchema>;

export const createPositionBodySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z][a-z0-9_]*$/, 'code must be snake_case'),
    title: z.string().trim().min(1).max(200),
  })
  .strict();

export type CreatePositionBody = z.infer<typeof createPositionBodySchema>;

export const listPositionsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export type ListPositionsQuery = z.infer<typeof listPositionsQuerySchema>;

export const positionResponseSchema = z.object({
  id: z.guid(),
  code: z.string(),
  title: z.string(),
});

export type PositionResponse = z.infer<typeof positionResponseSchema>;

export const createAppointmentBodySchema = z
  .object({
    positionId: z.guid(),
    personId: z.guid(),
    organisationalUnitId: z.guid().optional(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    effectiveTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();

export type CreateAppointmentBody = z.infer<typeof createAppointmentBodySchema>;

export const listAppointmentsQuerySchema = z
  .object({
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    personId: z.guid().optional(),
    positionId: z.guid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;

export const endAppointmentBodySchema = z
  .object({
    effectiveTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

export type EndAppointmentBody = z.infer<typeof endAppointmentBodySchema>;

export const appointmentResponseSchema = z.object({
  id: z.guid(),
  positionId: z.guid(),
  personId: z.guid(),
  organisationalUnitId: z.guid().nullable(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  status: z.string(),
});

export type AppointmentResponse = z.infer<typeof appointmentResponseSchema>;
