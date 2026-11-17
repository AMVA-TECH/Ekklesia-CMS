/**
 * Pure hierarchy helpers — no DB I/O.
 * Used to reject circular parent / reporting relationships.
 */

export function wouldCreateCycle(
  nodeId: string,
  newParentId: string | null | undefined,
  parentById: ReadonlyMap<string, string | null>,
): boolean {
  if (!newParentId) return false;
  if (newParentId === nodeId) return true;

  let current: string | null | undefined = newParentId;
  const seen = new Set<string>([nodeId]);
  while (current) {
    if (seen.has(current)) return true;
    seen.add(current);
    current = parentById.get(current) ?? null;
  }
  return false;
}
