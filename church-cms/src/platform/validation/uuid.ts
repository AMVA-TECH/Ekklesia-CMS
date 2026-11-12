import { z } from 'zod';

/**
 * Postgres-compatible UUID / GUID string.
 *
 * Zod 4 `z.uuid()` is RFC 4122-strict (version + variant bits). Our seed IDs
 * (e.g. `11111111-1111-1111-1111-111111111111`) are valid for Postgres `uuid`
 * but fail that check — use `z.guid()` / this schema at API boundaries.
 */
export const uuidSchema = z.guid();
