export const UNIT_KINDS = [
  'department',
  'ministry',
  'life_group',
  'branch',
  'team',
] as const;
export type UnitKind = (typeof UNIT_KINDS)[number];

export const UNIT_STATUSES = ['active', 'inactive'] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const PROGRAMME_STATUSES = ['active', 'inactive'] as const;
export type ProgrammeStatus = (typeof PROGRAMME_STATUSES)[number];

export const POSITION_STATUSES = ['active', 'inactive'] as const;
export type PositionStatus = (typeof POSITION_STATUSES)[number];

export const OCCUPANCY_POLICIES = ['single', 'multiple'] as const;
export type OccupancyPolicy = (typeof OCCUPANCY_POLICIES)[number];

export const APPOINTMENT_STATUSES = ['active', 'ended'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_KINDS = ['substantive', 'acting'] as const;
export type AppointmentKind = (typeof APPOINTMENT_KINDS)[number];

export const APPOINTMENT_HISTORY_CHANGE_TYPES = ['appointed', 'ended'] as const;
export type AppointmentHistoryChangeType =
  (typeof APPOINTMENT_HISTORY_CHANGE_TYPES)[number];

/** Code sequence namespaces for human-readable identifiers. */
export const CODE_NAMESPACES = {
  org: { namespace: 'org', prefix: 'ORG' },
  min: { namespace: 'min', prefix: 'MIN' },
  pos: { namespace: 'pos', prefix: 'POS' },
} as const;

export type CodeNamespaceKey = keyof typeof CODE_NAMESPACES;

export function codeNamespaceForUnitKind(kind: string): CodeNamespaceKey {
  return kind === 'ministry' ? 'min' : 'org';
}
