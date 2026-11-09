/**
 * SQL fragment templates for enabling RLS on tenant tables.
 * Applied via a dedicated migration after core tables exist.
 *
 * Policy pattern:
 *   church_id = nullif(current_setting('app.church_id', true), '')::uuid
 *
 * App role must not have BYPASSRLS; migrations use owner role.
 */
export const TENANT_TABLES_FOR_RLS = [
  'church_settings',
  'organisation_users',
  'households',
  'memberships',
  'membership_applications',
  'roles',
  'user_role_assignments',
  'media_assets',
  'audit_events',
  'idempotency_keys',
  'domain_event_outbox',
] as const;

export function enableRlsSql(tableName: string): string {
  return `
ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;
ALTER TABLE ${tableName} FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ${tableName}_tenant_isolation ON ${tableName};
CREATE POLICY ${tableName}_tenant_isolation ON ${tableName}
  USING (church_id = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK (church_id = nullif(current_setting('app.church_id', true), '')::uuid);
`.trim();
}
