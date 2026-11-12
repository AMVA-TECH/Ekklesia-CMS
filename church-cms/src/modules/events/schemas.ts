import { z } from 'zod';

import {
  ATTENDANCE_MODES,
  EVENT_STATUSES,
  PRESENCE_VALUES,
  RECORD_SOURCES,
  REGISTRATION_STATUSES,
} from './constants';

export const createEventTypeBodySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .regex(/^[a-z][a-z0-9_]*$/),
    name: z.string().trim().min(1).max(200),
  })
  .strict();

export type CreateEventTypeBody = z.infer<typeof createEventTypeBodySchema>;

export const createEventBodySchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().max(5000).optional(),
    serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    eventTypeId: z.guid().optional(),
    /** Shortcut e.g. sunday_service — resolved to eventTypeId when id omitted. */
    eventTypeCode: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .regex(/^[a-z][a-z0-9_]*$/)
      .optional(),
    organisationalUnitId: z.guid().optional(),
    startsAt: z.string().datetime({ offset: true }).optional(),
    endsAt: z.string().datetime({ offset: true }).optional(),
    status: z.enum(EVENT_STATUSES).optional(),
    posterMediaId: z.guid().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.eventTypeId && val.eventTypeCode) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide eventTypeId or eventTypeCode, not both',
        path: ['eventTypeCode'],
      });
    }
  });

export type CreateEventBody = z.infer<typeof createEventBodySchema>;

export const updateEventBodySchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    eventTypeId: z.guid().nullable().optional(),
    organisationalUnitId: z.guid().nullable().optional(),
    startsAt: z.string().datetime({ offset: true }).nullable().optional(),
    endsAt: z.string().datetime({ offset: true }).nullable().optional(),
    status: z.enum(EVENT_STATUSES).optional(),
    posterMediaId: z.guid().nullable().optional(),
  })
  .strict();
export type UpdateEventBody = z.infer<typeof updateEventBodySchema>;

export const createEventRegistrationBodySchema = z
  .object({
    /** Defaults to the actor's personId (self-register). Staff may register others. */
    personId: z.guid().optional(),
  })
  .strict();
export type CreateEventRegistrationBody = z.infer<
  typeof createEventRegistrationBodySchema
>;

export const listEventsQuerySchema = z
  .object({
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;

export const openAttendanceSessionBodySchema = z
  .object({
    mode: z.enum(ATTENDANCE_MODES),
  })
  .strict();

export type OpenAttendanceSessionBody = z.infer<typeof openAttendanceSessionBodySchema>;

export const recordAttendanceBodySchema = z
  .object({
    personId: z.guid(),
    presence: z.enum(PRESENCE_VALUES).default('present'),
    source: z.enum(RECORD_SOURCES).default('roll_call'),
  })
  .strict();

export type RecordAttendanceBody = z.infer<typeof recordAttendanceBodySchema>;

export const upsertAttendanceSummaryBodySchema = z
  .object({
    menCount: z.number().int().min(0).default(0),
    womenCount: z.number().int().min(0).default(0),
    childrenCount: z.number().int().min(0).default(0),
    visitorsCount: z.number().int().min(0).default(0),
  })
  .strict()
  .transform((value) => ({
    ...value,
    totalCount:
      value.menCount + value.womenCount + value.childrenCount + value.visitorsCount,
  }));

export type UpsertAttendanceSummaryBody = z.infer<
  typeof upsertAttendanceSummaryBodySchema
>;

export const createAbsenceNoticeBodySchema = z
  .object({
    personId: z.guid(),
    serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().trim().min(1).max(1000),
    eventId: z.guid().optional(),
    householdId: z.guid().optional(),
  })
  .strict();
export type CreateAbsenceNoticeBody = z.infer<typeof createAbsenceNoticeBodySchema>;

export const listAbsenceNoticesQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    status: z.string().trim().min(1).max(40).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
export type ListAbsenceNoticesQuery = z.infer<typeof listAbsenceNoticesQuerySchema>;

export const issueQrTokenBodySchema = z
  .object({
    expiresInMinutes: z.number().int().min(5).max(24 * 60).default(180),
  })
  .strict();
export type IssueQrTokenBody = z.infer<typeof issueQrTokenBodySchema>;

export const qrCheckInBodySchema = z
  .object({
    token: z.string().trim().min(16).max(200),
    personId: z.guid().optional(),
    name: z.string().trim().min(1).max(200).optional(),
    phone: z.string().trim().min(5).max(32).optional(),
  })
  .strict()
  .refine((v) => Boolean(v.personId || v.phone || v.name), {
    message: 'personId, phone, or name is required',
  });
export type QrCheckInBody = z.infer<typeof qrCheckInBodySchema>;

export const createCorrectionRequestBodySchema = z
  .object({
    personId: z.guid(),
    sessionId: z.guid(),
    requestedPresence: z.enum(PRESENCE_VALUES).default('present'),
    note: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();
export type CreateCorrectionRequestBody = z.infer<
  typeof createCorrectionRequestBodySchema
>;

export const listCorrectionRequestsQuerySchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected']).optional().default('pending'),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
export type ListCorrectionRequestsQuery = z.infer<
  typeof listCorrectionRequestsQuerySchema
>;

export const resolveCorrectionRequestBodySchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    resolutionNote: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();
export type ResolveCorrectionRequestBody = z.infer<
  typeof resolveCorrectionRequestBodySchema
>;

export const eventTypeResponseSchema = z.object({
  id: z.guid(),
  code: z.string(),
  name: z.string(),
});

export type EventTypeResponse = z.infer<typeof eventTypeResponseSchema>;

export const eventResponseSchema = z.object({
  id: z.guid(),
  title: z.string(),
  description: z.string().nullable(),
  serviceDate: z.string(),
  eventTypeId: z.guid().nullable(),
  eventTypeCode: z.string().nullable().optional(),
  eventTypeName: z.string().nullable().optional(),
  organisationalUnitId: z.guid().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  status: z.string(),
  posterMediaId: z.guid().nullable(),
  posterUrl: z.string().nullable(),
});

export type EventResponse = z.infer<typeof eventResponseSchema>;

export const eventRegistrationResponseSchema = z.object({
  id: z.guid(),
  eventId: z.guid(),
  personId: z.guid(),
  status: z.enum(REGISTRATION_STATUSES),
  createdAt: z.string(),
});
export type EventRegistrationResponse = z.infer<
  typeof eventRegistrationResponseSchema
>;

export const attendanceSessionResponseSchema = z.object({
  id: z.guid(),
  eventId: z.guid(),
  mode: z.string(),
  status: z.string(),
  recordedAt: z.string(),
  finalizedAt: z.string().nullable(),
  summary: z
    .object({
      menCount: z.number().int(),
      womenCount: z.number().int(),
      childrenCount: z.number().int(),
      visitorsCount: z.number().int(),
      totalCount: z.number().int(),
    })
    .nullable()
    .optional(),
  recordCount: z.number().int().optional(),
});

export type AttendanceSessionResponse = z.infer<typeof attendanceSessionResponseSchema>;

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const myAttendanceQuerySchema = z
  .object({
    from: dateOnly.optional(),
    to: dateOnly.optional(),
  })
  .strict();
export type MyAttendanceQuery = z.infer<typeof myAttendanceQuerySchema>;

export const familyAttendanceQuerySchema = z
  .object({
    householdId: z.guid().optional(),
    from: dateOnly.optional(),
    to: dateOnly.optional(),
  })
  .strict();
export type FamilyAttendanceQuery = z.infer<typeof familyAttendanceQuerySchema>;

export const leadershipAttendanceStatsQuerySchema = z
  .object({
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    unitId: z.guid().optional(),
    followUpOnly: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
  })
  .strict();
export type LeadershipAttendanceStatsQuery = z.infer<
  typeof leadershipAttendanceStatsQuerySchema
>;
