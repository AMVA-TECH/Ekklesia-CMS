/**
 * Lightweight helpers shared across Ekklesia UI primitives.
 *
 * No runtime deps. We deliberately avoid `clsx`/`tailwind-merge` — the UI
 * surface is small and precision of class names matters for review.
 */

type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, boolean | null | undefined>
  | ClassValue[];

/**
 * Join conditional class names.
 *
 * ```ts
 * cn('rounded-md', isActive && 'bg-surface-muted', { 'ring-1': focus });
 * ```
 */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    pushClass(out, value);
  }
  return out.join(' ');
}

function pushClass(out: string[], value: ClassValue): void {
  if (value === null || value === undefined || value === false || value === '') {
    return;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    out.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) pushClass(out, item);
    return;
  }
  if (typeof value === 'object') {
    for (const [key, enabled] of Object.entries(value)) {
      if (enabled) out.push(key);
    }
  }
}

/** Derive display initials from a free-text name. Capped at two letters. */
export function initialsFromName(name: string | null | undefined): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0];
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  const firstChar = first ? Array.from(first)[0] : undefined;
  const lastChar = last ? Array.from(last)[0] : undefined;
  const result = `${firstChar ?? ''}${lastChar ?? ''}`.toUpperCase();
  return result || '?';
}

/** Deterministic non-negative hash → used by avatar tone cycling. */
export function stableIndex(input: string, modulus: number): number {
  if (modulus <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % modulus;
}
