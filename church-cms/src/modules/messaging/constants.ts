export const MESSAGE_CHANNELS = ['sms', 'whatsapp', 'email', 'in_app'] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

/** Channels allowed for leadership text blasts in MVP. */
export const BLAST_CHANNELS = ['sms', 'whatsapp'] as const;
export type BlastChannel = (typeof BLAST_CHANNELS)[number];

export const MESSAGE_JOB_STATUSES = [
  'queued',
  'sending',
  'completed',
  'failed',
  'cancelled',
] as const;
export type MessageJobStatus = (typeof MESSAGE_JOB_STATUSES)[number];

export const MESSAGE_AUDIENCE_TYPES = ['all_members', 'organisational_unit'] as const;
export type MessageAudienceType = (typeof MESSAGE_AUDIENCE_TYPES)[number];

export const ANNOUNCEMENT_STATUSES = [
  'draft',
  'pending_approval',
  'published',
  'rejected',
  'archived',
] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const ANNOUNCEMENT_AUDIENCE_TYPES = ['all_members', 'organisational_unit'] as const;
export type AnnouncementAudienceType = (typeof ANNOUNCEMENT_AUDIENCE_TYPES)[number];

export const LOCALES = ['sw', 'en'] as const;

/** Soft cap per blast; larger audiences need multiple jobs later. */
export const MESSAGE_JOB_RECIPIENT_CAP = 500;
