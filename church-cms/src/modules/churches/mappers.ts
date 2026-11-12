import type { churches, churchSettings } from './db-schema';

type ChurchRow = typeof churches.$inferSelect;
type SettingsRow = typeof churchSettings.$inferSelect;

export function toChurchResponse(row: ChurchRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
    defaultLocale: row.defaultLocale,
  };
}

export function toChurchSettingsResponse(row: SettingsRow) {
  return {
    churchId: row.churchId,
    settings: (row.settings ?? {}) as Record<string, unknown>,
    updatedAt: row.updatedAt.toISOString(),
  };
}
