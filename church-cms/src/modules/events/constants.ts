export const EVENT_STATUSES = ['scheduled', 'cancelled', 'completed'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** Seeded church event types (OQ-011 working baseline). */
export const DEFAULT_EVENT_TYPES = [
  { code: 'sunday_service', name: 'Sunday Service' },
  { code: 'midweek_service', name: 'Midweek Service' },
  { code: 'special_event', name: 'Special Event' },
  { code: 'ministry_meeting', name: 'Ministry Meeting' },
] as const;

export const ATTENDANCE_MODES = ['headcount', 'roll_call', 'qr_mixed'] as const;
export type AttendanceMode = (typeof ATTENDANCE_MODES)[number];

export const SESSION_STATUSES = ['open', 'finalized'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const PRESENCE_VALUES = ['present', 'absent', 'late'] as const;
export type Presence = (typeof PRESENCE_VALUES)[number];

export const RECORD_SOURCES = ['roll_call', 'manual', 'qr'] as const;
export type RecordSource = (typeof RECORD_SOURCES)[number];

export const CORRECTION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type CorrectionStatus = (typeof CORRECTION_STATUSES)[number];

export const REGISTRATION_STATUSES = ['registered', 'cancelled'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

/** Default engagement bands (encouragement, not scoring). */
export const ATTENDANCE_BAND_THRESHOLDS = {
  consistentMinRate: 0.8,
  irregularMinRate: 0.4,
} as const;

export const ATTENDANCE_BANDS = [
  'consistent',
  'irregular',
  'missing',
  'insufficient_data',
] as const;
export type AttendanceBand = (typeof ATTENDANCE_BANDS)[number];

export const ATTENDANCE_NUDGE_KINDS = [
  'congratulate',
  'encourage',
  'remind',
] as const;
export type AttendanceNudgeKind = (typeof ATTENDANCE_NUDGE_KINDS)[number];

export const FAMILY_ATTENDANCE_STATUSES = [
  'full',
  'partial',
  'absent',
  'notice',
] as const;
export type FamilyAttendanceStatus = (typeof FAMILY_ATTENDANCE_STATUSES)[number];

/** Portal progress window when from/to omitted. */
export const DEFAULT_ATTENDANCE_LOOKBACK_DAYS = 56;
