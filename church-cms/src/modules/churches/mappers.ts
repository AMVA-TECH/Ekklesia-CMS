import { churchLogoContentUrl } from './constants';
import type { churches, churchSettings } from './db-schema';
import type { ResolvedChurchSettings } from './settings-schema';

type ChurchRow = typeof churches.$inferSelect;
type SettingsRow = typeof churchSettings.$inferSelect;

export function toChurchResponse(
  row: ChurchRow,
  opts?: {
    logoMediaId?: string | null;
    config?: ResolvedChurchSettings;
  },
) {
  const logoMediaId = opts?.logoMediaId ?? null;
  return {
    id: row.id,
    name: row.name,
    shortName: row.shortName ?? null,
    displayName: row.displayName ?? null,
    slug: row.slug,
    timezone: row.timezone,
    defaultLocale: row.defaultLocale,
    logoMediaId,
    logoUrl: churchLogoContentUrl(logoMediaId),
    config: opts?.config,
  };
}

export function toChurchSettingsResponse(row: SettingsRow) {
  return {
    churchId: row.churchId,
    settings: (row.settings ?? {}) as Record<string, unknown>,
    updatedAt: row.updatedAt.toISOString(),
  };
}
