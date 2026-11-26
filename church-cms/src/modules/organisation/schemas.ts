import { z } from 'zod';

import {
  APPOINTMENT_KINDS,
  APPOINTMENT_STATUSES,
  OCCUPANCY_POLICIES,
  POSITION_STATUSES,
  PROGRAMME_STATUSES,
  UNIT_KINDS,
  UNIT_STATUSES,
} from './constants';

export const createUnitBodySchema = z
  .object({
    kind: z.enum(UNIT_KINDS),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).optional(),
    parentId: z.guid().optional(),
    status: z.enum(UNIT_STATUSES).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type CreateUnitBody = z.infer<typeof createUnitBodySchema>;

export const updateUnitBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    parentId: z.guid().nullable().optional(),
    status: z.enum(UNIT_STATUSES).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    /** Required when status/parent change would affect active unit-scoped role assignments. */
    confirmStructuralChange: z.literal(true).optional(),
  })
  .strict()
  .refine(
    (v) =>
      Object.keys(v).filter((k) => k !== 'confirmStructuralChange').length > 0,
    {
      message: 'At least one field is required',
    },
  );

export type UpdateUnitBody = z.infer<typeof updateUnitBodySchema>;

export const listUnitsQuerySchema = z
  .object({
    kind: z.enum(UNIT_KINDS).optional(),
    status: z.enum(UNIT_STATUSES).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
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

export const updateProgrammeBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    status: z.enum(PROGRAMME_STATUSES).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field is required',
  });

export type UpdateProgrammeBody = z.infer<typeof updateProgrammeBodySchema>;

export const unitResponseSchema = z.object({
  id: z.guid(),
  code: z.string(),
  kind: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  parentId: z.guid().nullable(),
  status: z.string(),
  metadata: z.record(z.string(), z.unknown()),
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
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).optional(),
    organisationalUnitId: z.guid().optional(),
    reportsToPositionId: z.guid().optional(),
    status: z.enum(POSITION_STATUSES).optional(),
    occupancyPolicy: z.enum(OCCUPANCY_POLICIES).optional(),
  })
  .strict();

export type CreatePositionBody = z.infer<typeof createPositionBodySchema>;

export const updatePositionBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    organisationalUnitId: z.guid().nullable().optional(),
    reportsToPositionId: z.guid().nullable().optional(),
    status: z.enum(POSITION_STATUSES).optional(),
    occupancyPolicy: z.enum(OCCUPANCY_POLICIES).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field is required',
  });

export type UpdatePositionBody = z.infer<typeof updatePositionBodySchema>;

export const listPositionsQuerySchema = z
  .object({
    status: z.enum(POSITION_STATUSES).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
  })
  .strict();

export type ListPositionsQuery = z.infer<typeof listPositionsQuerySchema>;

export const positionResponseSchema = z.object({
  id: z.guid(),
  code: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  organisationalUnitId: z.guid().nullable(),
  reportsToPositionId: z.guid().nullable(),
  status: z.string(),
  occupancyPolicy: z.string(),
});

export type PositionResponse = z.infer<typeof positionResponseSchema>;

export const createAppointmentBodySchema = z
  .object({
    positionId: z.guid(),
    personId: z.guid(),
    organisationalUnitId: z.guid().optional(),
    appointmentKind: z.enum(APPOINTMENT_KINDS).optional(),
    notes: z.string().trim().max(2000).optional(),
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
  appointmentKind: z.string(),
  notes: z.string().nullable(),
  appointedByUserId: z.guid().nullable(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  status: z.string(),
});

export type AppointmentResponse = z.infer<typeof appointmentResponseSchema>;
