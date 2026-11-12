export const ROLE_SCOPE_TYPES = [
  'church',
  'organisational_unit',
  'self',
  'household',
] as const;
export type RoleScopeType = (typeof ROLE_SCOPE_TYPES)[number];
