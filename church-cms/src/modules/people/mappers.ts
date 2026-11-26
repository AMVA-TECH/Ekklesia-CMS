import type { PersonResponse } from './schemas';

export interface PersonRow {
  id: string;
  displayName: string;
  fullName: string | null;
  dateOfBirth: string | null;
  preferredLocale: string;
  directoryOptIn: boolean;
  photoMediaId?: string | null;
  createdAt: Date;
}

export interface ContactRow {
  id: string;
  channel: string;
  value: string;
  isPrimary: boolean;
}

export type PersonResponseOptions = {
  /**
   * When false, omits sensitive fields (date of birth) — requires
   * `people:read_restricted` or self-read at the service layer.
   */
  includeRestricted?: boolean;
};

export function toPersonResponse(
  person: PersonRow,
  contacts: ContactRow[] = [],
  options: PersonResponseOptions = {},
): PersonResponse {
  const includeRestricted = options.includeRestricted === true;
  return {
    id: person.id,
    displayName: person.displayName,
    fullName: person.fullName,
    dateOfBirth: includeRestricted ? person.dateOfBirth : null,
    preferredLocale: person.preferredLocale,
    directoryOptIn: person.directoryOptIn,
    photoMediaId: person.photoMediaId ?? null,
    contacts: contacts.map((c) => ({
      id: c.id,
      channel: c.channel as 'phone' | 'email',
      value: c.value,
      isPrimary: c.isPrimary,
    })),
    createdAt: person.createdAt.toISOString(),
  };
}
