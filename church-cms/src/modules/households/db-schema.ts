import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  uuid,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { auditColumns } from '@/platform/db/columns';
import { churches } from '@/modules/churches/db-schema';
import { people } from '@/modules/people/db-schema';

/** Family/household within a church. Display label is not unique. */
export const households = pgTable(
  'households',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    label: text('label').notNull(),
    sharedAddress: text('shared_address'),
    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: text('emergency_contact_phone'),
    ...auditColumns,
  },
  (table) => [index('households_church_idx').on(table.churchId)],
);

/** Adult (18+) person linked to a household. */
export const householdMembers = pgTable(
  'household_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    personId: uuid('person_id')
      .notNull()
      .references(() => people.id),
    relationship: text('relationship').notNull().default('member'),
    isPrimaryContact: boolean('is_primary_contact').notNull().default(false),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('household_members_household_person_uidx').on(
      table.householdId,
      table.personId,
    ),
  ],
);

/** Under-18 children: name + age only (no Person / account). */
export const householdChildren = pgTable(
  'household_children',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    name: text('name').notNull(),
    age: integer('age').notNull(),
    ...auditColumns,
  },
  (table) => [
    check('household_children_age_range', sql`${table.age} >= 0 and ${table.age} <= 17`),
  ],
);
