/**
 * Response shapes consumed by the member UI.
 *
 * Mirror `src/modules/**` response types without importing them (the UI layer
 * must not reach into the framework-free module layer directly — see
 * `docs/AGENTS.md` §6). Fields we never read in the member UI are intentionally
 * omitted; add them when a screen needs them.
 */

export interface MemberPerson {
  id: string;
  displayName: string;
  fullName: string | null;
  dateOfBirth: string | null;
  preferredLocale: string;
  directoryOptIn: boolean;
  photoMediaId: string | null;
  contacts: ReadonlyArray<{
    id: string;
    channel: 'phone' | 'email';
    value: string;
    isPrimary: boolean;
  }>;
  createdAt: string;
}

export interface MemberMembership {
  id: string;
  personId: string;
  householdId: string | null;
  membershipType: string;
  status: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface MemberEvent {
  id: string;
  title: string;
  description: string | null;
  serviceDate: string;
  eventTypeId: string | null;
  eventTypeCode: string | null;
  eventTypeName: string | null;
  organisationalUnitId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  posterMediaId: string | null;
  posterUrl: string | null;
}

export interface MemberAnnouncement {
  id: string;
  title: string;
  body: string;
  status: string;
  publishedAt: string | null;
  audiences: ReadonlyArray<{
    id: string;
    audienceType: string;
    organisationalUnitId: string | null;
  }>;
}

export interface MemberPreferences {
  personId: string;
  smsOptIn: boolean;
  whatsappOptIn: boolean;
  emailOptIn: boolean;
}

export interface MemberParticipationRequest {
  id: string;
  organisationalUnitId: string;
  personId: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedAt: string | null;
}

export interface MemberPledge {
  id: string;
  personId: string | null;
  householdId: string | null;
  fundId: string;
  amountMinor: number;
  currency: string;
  dueOn: string | null;
  status: string;
  appliedMinor?: number;
}

export interface MyAttendance {
  personId: string;
  from: string;
  to: string;
  sessionsHeld: number;
  presentCount: number;
  noticeCount: number;
  rate: number | null;
  band: string;
  householdId: string | null;
  calendar: ReadonlyArray<{
    serviceDate: string;
    status: 'present' | 'absent' | 'notice';
  }>;
}

export interface MemberDirectoryEntry {
  personId: string;
  displayName: string;
  photoMediaId: string | null;
  ministries: ReadonlyArray<{
    organisationalUnitId: string;
    name: string;
    roleInUnit: string | null;
  }>;
}
