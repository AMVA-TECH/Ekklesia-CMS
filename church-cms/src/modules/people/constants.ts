/** Person contact channels. */
export const CONTACT_CHANNELS = ['phone', 'email'] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

/** Supported UI locales. */
export const LOCALES = ['sw', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** User account statuses. */
export const USER_ACCOUNT_STATUSES = ['active', 'disabled', 'pending'] as const;
export type UserAccountStatus = (typeof USER_ACCOUNT_STATUSES)[number];
