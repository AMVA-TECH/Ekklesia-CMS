/** Church-tenant registration application statuses (not member join). */
export const REGISTRATION_STATUSES = [
  'draft',
  'submitted',
  'email_verified',
  'under_review',
  'approved',
  'rejected',
  'withdrawn',
] as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const PROVISIONING_STATUSES = [
  'not_started',
  'queued',
  'running',
  'succeeded',
  'failed',
] as const;

export type ProvisioningStatus = (typeof PROVISIONING_STATUSES)[number];

/** Tenant lifecycle after provision (separate from application APPROVED). */
export const TENANT_LIFECYCLE_STATUSES = [
  'pending_activation',
  'active',
  'suspended',
  'closed',
] as const;

export type TenantLifecycleStatus = (typeof TENANT_LIFECYCLE_STATUSES)[number];

export const EMAIL_VERIFY_TTL_MS = 48 * 60 * 60 * 1000;
export const ADMIN_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Soft public submit rate limit (per process). */
export const PUBLIC_REGISTRATION_RATE_WINDOW_MS = 60 * 60 * 1000;
export const PUBLIC_REGISTRATION_RATE_MAX = 8;
