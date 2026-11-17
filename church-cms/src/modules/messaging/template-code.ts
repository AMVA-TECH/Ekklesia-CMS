/**
 * Build an internal template code from a human name.
 * Codes stay snake_case for uniqueness; staff never have to invent them.
 */
export function slugifyTemplateCode(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 40);
  if (!base) return 'template';
  return /^[a-z]/.test(base) ? base : `t_${base}`.slice(0, 50);
}
