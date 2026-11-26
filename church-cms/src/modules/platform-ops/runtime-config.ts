import type { Db } from '@/platform/db/client';
import * as configRepo from './config-repository';
import {
  resolvePlatformGlobalConfig,
  type ResolvedPlatformGlobalConfig,
} from './config-document';

/** Load resolved global platform settings (code defaults when unset). */
export async function loadResolvedGlobalConfig(
  db: Db,
): Promise<ResolvedPlatformGlobalConfig> {
  const row = await configRepo.getConfigByScope(db, 'global');
  return resolvePlatformGlobalConfig(row?.document ?? null);
}
