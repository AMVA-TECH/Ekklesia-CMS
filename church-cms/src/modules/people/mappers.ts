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

export function toPersonResponse(
  person: PersonRow,
  contacts: ContactRow[] = [],
): PersonResponse {
  return {
    id: person.id,
    displayName: person.displayName,
    fullName: person.fullName,
    dateOfBirth: person.dateOfBirth,
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
