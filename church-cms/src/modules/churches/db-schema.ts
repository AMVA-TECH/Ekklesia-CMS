import { jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { auditColumns } from '@/platform/db/columns';

/** Tenant church. */
export const churches = pgTable('churches', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  timezone: text('timezone').notNull().default('Africa/Dar_es_Salaam'),
  defaultLocale: text('default_locale').notNull().default('sw'),
  ...auditColumns,
});

/** Per-church settings blob (locale flags, thresholds, etc.). */
export const churchSettings = pgTable('church_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  churchId: uuid('church_id')
    .notNull()
    .references(() => churches.id)
    .unique(),
  settings: jsonb('settings').notNull().default({}),
  ...auditColumns,
});
