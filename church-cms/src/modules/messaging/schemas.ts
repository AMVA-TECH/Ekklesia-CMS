import { z } from 'zod';
import {
  ANNOUNCEMENT_AUDIENCE_TYPES,
  BLAST_CHANNELS,
  LOCALES,
  MESSAGE_AUDIENCE_TYPES,
  MESSAGE_CHANNELS,
} from './constants';

export const createTemplateBodySchema = z.object({
  code: z.string().trim().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/),
  channel: z.enum(MESSAGE_CHANNELS),
  locale: z.enum(LOCALES).optional(),
  body: z.string().trim().min(1).max(2000),
}).strict();
export type CreateTemplateBody = z.infer<typeof createTemplateBodySchema>;

export const announcementAudienceBodySchema = z
  .object({
    audienceType: z.enum(ANNOUNCEMENT_AUDIENCE_TYPES),
    organisationalUnitId: z.guid().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.audienceType === 'organisational_unit' && !val.organisationalUnitId) {
      ctx.addIssue({
        code: 'custom',
        message: 'organisationalUnitId is required for organisational_unit audience',
        path: ['organisationalUnitId'],
      });
    }
  });

export const createAnnouncementBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(5000),
    audiences: z.array(announcementAudienceBodySchema).min(1).max(20).optional(),
  })
  .strict();
export type CreateAnnouncementBody = z.infer<typeof createAnnouncementBodySchema>;

export const rejectAnnouncementBodySchema = z
  .object({
    note: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();
export type RejectAnnouncementBody = z.infer<typeof rejectAnnouncementBodySchema>;

export const updatePreferencesBodySchema = z.object({
  smsOptIn: z.boolean().optional(),
  whatsappOptIn: z.boolean().optional(),
  emailOptIn: z.boolean().optional(),
}).strict();
export type UpdatePreferencesBody = z.infer<typeof updatePreferencesBodySchema>;

/**
 * Leadership text blast (custom Sunday reminders, etc.).
 * Provide custom body and/or templateId and/or announcementId.
 */
export const createMessageJobBodySchema = z
  .object({
    channel: z.enum(BLAST_CHANNELS),
    audienceType: z.enum(MESSAGE_AUDIENCE_TYPES),
    organisationalUnitId: z.guid().optional(),
    title: z.string().trim().min(1).max(200).optional(),
    body: z.string().trim().min(1).max(2000).optional(),
    templateId: z.guid().optional(),
    announcementId: z.guid().optional(),
    scheduledFor: z.string().datetime().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (!val.body && !val.templateId && !val.announcementId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide body, templateId, or announcementId',
        path: ['body'],
      });
    }
    if (val.audienceType === 'organisational_unit' && !val.organisationalUnitId) {
      ctx.addIssue({
        code: 'custom',
        message: 'organisationalUnitId is required for organisational_unit audience',
        path: ['organisationalUnitId'],
      });
    }
  });
export type CreateMessageJobBody = z.infer<typeof createMessageJobBodySchema>;

export const messageJobResponseSchema = z.object({
  id: z.guid(),
  channel: z.string(),
  title: z.string().nullable(),
  body: z.string().nullable(),
  audienceType: z.string().nullable(),
  organisationalUnitId: z.guid().nullable(),
  templateId: z.guid().nullable(),
  announcementId: z.guid().nullable(),
  status: z.string(),
  scheduledFor: z.string().nullable(),
  recipientCount: z.number().int().nonnegative(),
  skippedNoContact: z.number().int().nonnegative(),
  skippedOptOut: z.number().int().nonnegative(),
  createdBy: z.guid().nullable(),
  createdAt: z.string(),
});
export type MessageJobResponse = z.infer<typeof messageJobResponseSchema>;

export const messageDeliveryResponseSchema = z.object({
  id: z.guid(),
  personId: z.guid().nullable(),
  channel: z.string(),
  toAddress: z.string(),
  status: z.string(),
  sentAt: z.string().nullable(),
});
export type MessageDeliveryResponse = z.infer<typeof messageDeliveryResponseSchema>;
