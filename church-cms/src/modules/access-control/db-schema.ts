import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';

import { churches } from '@/modules/churches/db-schema';
import { userAccounts } from '@/modules/people/db-schema';
import { auditColumns } from '@/platform/db/columns';

/** Global stable permission codes, e.g. people:read. */
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  description: text('description'),
});

/** Per-church role (labels configurable; codes stable). */
export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    code: text('code').notNull(),
    name: text('name').notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('roles_church_code_uidx').on(table.churchId, table.code),
    index('roles_church_idx').on(table.churchId),
  ],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

/**
 * scope_type: church | organisational_unit | self | household
 * organisational_unit_id is a loose UUID until Stage 3 org tables are migrated.
 */
export const userRoleAssignments = pgTable(
  'user_role_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    churchId: uuid('church_id')
      .notNull()
      .references(() => churches.id),
    userAccountId: uuid('user_account_id')
      .notNull()
      .references(() => userAccounts.id),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    scopeType: text('scope_type').notNull().default('church'),
    organisationalUnitId: uuid('organisational_unit_id'),
    effectiveFrom: timestamp('effective_from', { withTimezone: true })
      .notNull()
      .defaultNow(),
    effectiveTo: timestamp('effective_to', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    index('user_role_assignments_church_user_idx').on(
      table.churchId,
      table.userAccountId,
    ),
  ],
);
