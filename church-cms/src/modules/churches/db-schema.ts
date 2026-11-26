import { jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { auditColumns } from '@/platform/db/columns';

/** Tenant church. */
export const churches = pgTable('churches', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  /** Short abbreviation (e.g. CMN). Editable; never used as FK. */
  shortName: text('short_name'),
  /** Member-facing display name (e.g. CrossLife). */
  displayName: text('display_name'),
  slug: text('slug').notNull().unique(),
  timezone: text('timezone').notNull().default('Africa/Dar_es_Salaam'),
  defaultLocale: text('default_locale').notNull().default('sw'),
  /** pending_activation | active | suspended | closed */
  lifecycleStatus: text('lifecycle_status').notNull().default('active'),
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
