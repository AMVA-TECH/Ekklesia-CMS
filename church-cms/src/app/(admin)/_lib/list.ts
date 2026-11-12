/**
 * Normalise list payloads from `apiFetch`.
 *
 * `apiFetch` unwraps `{ data }` when there is no `meta`/`links`, so callers may
 * receive either `T[]` or `{ data: T[] }`. Use this helper at list boundaries.
 */
export function asList<T>(
  payload: T[] | { data: readonly T[] } | null | undefined,
): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return [...payload];
  if (Array.isArray(payload.data)) return [...payload.data];
  return [];
}
