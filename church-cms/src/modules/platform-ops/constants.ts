export const FINDING_SEVERITIES = [
  'critical',
  'high',
  'medium',
  'low',
  'info',
] as const;

export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export const FINDING_STATUSES = ['open', 'ack', 'resolved'] as const;

export type FindingStatus = (typeof FINDING_STATUSES)[number];

export const METRIC_KEYS = [
  'churches_total',
  'people_total',
  'memberships_active',
  'attendance_checkins',
  'messages_sent',
  'auth_failures',
  'notify_failures',
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export {
  DEFAULT_PLATFORM_PERMISSIONS,
  PLATFORM_PERMISSIONS,
  PLATFORM_OWNER_PERMISSIONS,
  PLATFORM_ROLE_TEMPLATES,
  type PlatformPermissionCode,
} from './platform-permissions';
