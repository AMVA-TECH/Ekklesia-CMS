/** Adult household member relationship values. */
export const HOUSEHOLD_RELATIONSHIPS = [
  'member',
  'spouse',
  'parent',
  'guardian',
  'other',
] as const;
export type HouseholdRelationship = (typeof HOUSEHOLD_RELATIONSHIPS)[number];

/** Children are under adulthood cutoff (name + age only). */
export const MAX_HOUSEHOLD_CHILD_AGE = 17;
