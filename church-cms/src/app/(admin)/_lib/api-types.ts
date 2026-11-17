/**
 * Shared TypeScript shapes for the admin UI's consumption of `/api/v1/**`.
 *
 * These mirror the response DTOs produced by `src/modules/*` without reaching
 * across the module boundary. If the backend contract changes, update these
 * types here (admin-local) rather than importing from the backend layer.
 */

/** Pagination meta returned by cursor-paged list endpoints. */
export interface ListMeta {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

/** `{ data, meta? }` envelope returned by most list endpoints. */
export interface ListEnvelope<T> {
  data: readonly T[];
  meta?: ListMeta;
}

/** Contact row attached to a person. */
export interface PersonContact {
  id: string;
  channel: 'phone' | 'email';
  value: string;
  isPrimary: boolean;
}

/** Response shape for `/api/v1/people`. */
export interface Person {
  id: string;
  displayName: string;
  fullName: string | null;
  dateOfBirth: string | null;
  preferredLocale: string;
  directoryOptIn: boolean;
  photoMediaId?: string | null;
  contacts: PersonContact[];
  createdAt: string;
}

/** Household member link. */
export interface HouseholdMember {
  id: string;
  personId: string;
  relationship: string;
  isPrimaryContact: boolean;
}

/** Household non-member child row. */
export interface HouseholdChild {
  id: string;
  name: string;
  age: number;
}

/** Response shape for `/api/v1/households`. */
export interface Household {
  id: string;
  label: string;
  sharedAddress: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  members: HouseholdMember[];
  children: HouseholdChild[];
}

/** Membership record. */
export interface Membership {
  id: string;
  personId: string;
  householdId: string | null;
  membershipType: 'individual' | 'household' | 'family' | string;
  status: 'visitor' | 'active' | 'inactive' | string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

/** Organisational unit row. */
export interface OrganisationalUnit {
  id: string;
  code: string;
  kind: string;
  name: string;
  description: string | null;
  parentId: string | null;
  status: string;
  metadata?: Record<string, unknown>;
}

/** Leadership position row. */
export interface LeadershipPosition {
  id: string;
  code: string;
  title: string;
  description: string | null;
  organisationalUnitId: string | null;
  reportsToPositionId: string | null;
  status: string;
  occupancyPolicy: string;
}

/** Leadership appointment row. */
export interface LeadershipAppointment {
  id: string;
  positionId: string;
  personId: string;
  organisationalUnitId: string | null;
  appointmentKind: string;
  notes: string | null;
  appointedByUserId: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
}

/** Ministry / life-group participation row. */
export interface Participation {
  id: string;
  organisationalUnitId: string;
  personId: string;
  roleInUnit: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
}

/** Event row. */
export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  serviceDate: string;
  eventTypeId: string | null;
  eventTypeCode?: string | null;
  eventTypeName?: string | null;
  organisationalUnitId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  posterMediaId: string | null;
  posterUrl: string | null;
}

/** Event type (e.g. sunday_service). */
export interface EventType {
  id: string;
  code: string;
  name: string;
}

/** Fund row. */
export interface Fund {
  id: string;
  code: string;
  name: string;
  fundType: string;
  status: string;
}

/** Offering row. */
export interface Offering {
  id: string;
  serviceDate: string;
  fundId: string | null;
  incomeAccountId: string | null;
  depositAccountId: string | null;
  amountMinor: number;
  currency: string;
  note: string | null;
  journalId: string | null;
  postedAt?: string | null;
}

/** Pledge row. */
export interface Pledge {
  id: string;
  personId: string | null;
  householdId: string | null;
  fundId: string | null;
  amountMinor: number;
  currency: string;
  dueOn: string | null;
  status: string;
  appliedMinor?: number;
}

/** Announcement audience link. */
export interface AnnouncementAudience {
  id: string;
  audienceType: string;
  organisationalUnitId: string | null;
}

/** Announcement row. */
export interface Announcement {
  id: string;
  title: string;
  body: string;
  status: string;
  publishedAt: string | null;
  audiences: AnnouncementAudience[];
}

/** Message template row. */
export interface MessageTemplate {
  id: string;
  name: string;
  code: string;
  channel: string;
  locale: string;
  body: string;
}

/** Approval request summary. */
export interface ApprovalRequest {
  id: string;
  subjectType: string;
  subjectId: string;
  requestedByUserId: string;
  status: string;
  currentStep: number | string | null;
  createdAt: string;
}

/** Resolved church config on `/api/v1/auth/me` (DEC-033). */
export interface AuthMeChurchConfig {
  branding: {
    productName: string;
    logoMediaId: string | null;
    secondaryLogoMediaId?: string | null;
    faviconMediaId?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
  };
  identity?: {
    description: string | null;
    category: string | null;
    vision: string | null;
    mission: string | null;
    mandate: string | null;
    motto: string | null;
    secondaryMotto: string | null;
    coreValues: string | null;
    history: string | null;
  };
  contact?: {
    primaryContactName: string | null;
    email: string | null;
    phone: string | null;
    alternatePhone: string | null;
    alternateEmail: string | null;
  };
  location?: {
    country: string | null;
    region: string | null;
    city: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
  };
  presence?: {
    website: string | null;
    facebook: string | null;
    instagram: string | null;
    youtube: string | null;
    twitter: string | null;
    telegram: string | null;
    tiktok: string | null;
    otherLinks: Array<{ label: string; url: string }>;
  };
  terminology: {
    organisationalUnitSingular: string;
    organisationalUnitPlural: string;
    membershipLabel: string;
  };
  modules: {
    people: boolean;
    membership: boolean;
    organisation: boolean;
    events: boolean;
    attendance: boolean;
    finance: boolean;
    messaging: boolean;
    governance: boolean;
  };
  workflows: { announcementDualControl: boolean };
  thresholds: { adulthoodAgeYears: number };
}

/** Response shape of `/api/v1/auth/me`. */
export interface AuthMeResponse {
  actor: {
    userAccountId: string;
    personId: string | null;
    email: string | null;
    phoneE164: string | null;
    status: string | null;
  };
  church: {
    id: string;
    name: string | null;
    shortName?: string | null;
    displayName?: string | null;
    slug: string | null;
    timezone: string | null;
    defaultLocale: string | null;
    logoMediaId?: string | null;
    logoUrl?: string | null;
    config?: AuthMeChurchConfig | null;
  };
  organisationUser: {
    id: string;
    personId: string | null;
    status: string;
  } | null;
  roles: ReadonlyArray<{
    assignmentId: string;
    roleId: string;
    code: string;
    name: string;
    scopeType: string;
    organisationalUnitId: string | null;
  }>;
  permissions: readonly string[];
  locale: string;
  authMode: string;
  mfaRequired: boolean;
}

/** Church row returned by `/api/v1/churches`. */
export interface Church {
  id: string;
  name: string;
  slug: string | null;
}
