import type {
  announcementAudiences,
  announcements,
  communicationPreferences,
  messageDeliveries,
  messageJobs,
  messageTemplates,
} from './db-schema';
import type { MessageDeliveryResponse, MessageJobResponse } from './schemas';

type Template = typeof messageTemplates.$inferSelect;
type Announcement = typeof announcements.$inferSelect;
type AnnouncementAudience = typeof announcementAudiences.$inferSelect;
type Prefs = typeof communicationPreferences.$inferSelect;
type Job = typeof messageJobs.$inferSelect;
type Delivery = typeof messageDeliveries.$inferSelect;

export function toTemplateResponse(row: Template) {
  return {
    id: row.id,
    code: row.code,
    channel: row.channel,
    locale: row.locale,
    body: row.body,
  };
}
export function toAnnouncementResponse(
  row: Announcement,
  audiences: AnnouncementAudience[] = [],
) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    status: row.status,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    audiences: audiences.map((a) => ({
      id: a.id,
      audienceType: a.audienceType,
      organisationalUnitId: a.organisationalUnitId,
    })),
  };
}
export function toPreferencesResponse(row: Prefs) {
  return {
    id: row.id,
    personId: row.personId,
    smsOptIn: row.smsOptIn,
    whatsappOptIn: row.whatsappOptIn,
    emailOptIn: row.emailOptIn,
  };
}

export function toMessageJobResponse(
  row: Job,
  counts: {
    recipientCount: number;
    skippedNoContact: number;
    skippedOptOut: number;
  },
): MessageJobResponse {
  return {
    id: row.id,
    channel: row.channel,
    title: row.title,
    body: row.body,
    audienceType: row.audienceType,
    organisationalUnitId: row.organisationalUnitId,
    templateId: row.templateId,
    announcementId: row.announcementId,
    status: row.status,
    scheduledFor: row.scheduledFor ? row.scheduledFor.toISOString() : null,
    recipientCount: counts.recipientCount,
    skippedNoContact: counts.skippedNoContact,
    skippedOptOut: counts.skippedOptOut,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toDeliveryResponse(row: Delivery): MessageDeliveryResponse {
  return {
    id: row.id,
    personId: row.personId,
    channel: row.channel,
    toAddress: row.toAddress,
    status: row.status,
    sentAt: row.sentAt ? row.sentAt.toISOString() : null,
  };
}
