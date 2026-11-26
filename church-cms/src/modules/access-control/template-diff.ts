/** Diff current role permission codes against a template baseline. */
export function diffPermissionSets(
  current: readonly string[],
  next: readonly string[],
): {
  added: string[];
  removed: string[];
  inSync: boolean;
} {
  const cur = new Set(current);
  const nxt = new Set(next);
  const added = next.filter((c) => !cur.has(c));
  const removed = current.filter((c) => !nxt.has(c));
  return {
    added,
    removed,
    inSync: added.length === 0 && removed.length === 0,
  };
}
