export const UNIT_KINDS = ['department', 'ministry', 'life_group'] as const;
export type UnitKind = (typeof UNIT_KINDS)[number];

export const UNIT_STATUSES = ['active', 'inactive'] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const PROGRAMME_STATUSES = ['active', 'inactive'] as const;
export type ProgrammeStatus = (typeof PROGRAMME_STATUSES)[number];

export const APPOINTMENT_STATUSES = ['active', 'ended'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_HISTORY_CHANGE_TYPES = ['appointed', 'ended'] as const;
export type AppointmentHistoryChangeType =
  (typeof APPOINTMENT_HISTORY_CHANGE_TYPES)[number];
