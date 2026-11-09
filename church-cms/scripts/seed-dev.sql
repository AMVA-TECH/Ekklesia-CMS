-- Deterministic local seed for Stage 2 smoke tests. Fake data only.
-- IDs are fixed UUIDs so curl scripts can reuse them.

INSERT INTO churches (id, name, slug, timezone, default_locale)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'CrossLife Dev',
  'crosslife-dev',
  'Africa/Dar_es_Salaam',
  'sw'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO church_settings (id, church_id, settings)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  '{}'::jsonb
)
ON CONFLICT (church_id) DO NOTHING;

INSERT INTO permissions (id, code, description)
VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', 'people:read', 'Read people'),
  ('aaaaaaaa-0001-0001-0001-000000000002', 'people:create', 'Create people'),
  ('aaaaaaaa-0001-0001-0001-000000000003', 'people:update', 'Update people'),
  ('aaaaaaaa-0001-0001-0001-000000000004', 'households:read', 'Read households'),
  ('aaaaaaaa-0001-0001-0001-000000000005', 'households:write', 'Write households'),
  ('aaaaaaaa-0001-0001-0001-000000000006', 'memberships:read', 'Read memberships'),
  ('aaaaaaaa-0001-0001-0001-000000000007', 'memberships:update_status', 'Update membership status'),
  ('aaaaaaaa-0001-0001-0001-000000000008', 'memberships:approve', 'Approve memberships')
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles (id, church_id, code, name)
VALUES (
  'bbbbbbbb-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'church_administrator',
  'Church Administrator'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'bbbbbbbb-0001-0001-0001-000000000001', id
FROM permissions
WHERE code IN (
  'people:read','people:create','people:update',
  'households:read','households:write',
  'memberships:read','memberships:update_status','memberships:approve'
)
ON CONFLICT DO NOTHING;

INSERT INTO user_accounts (id, email, phone_e164, status)
VALUES (
  'cccccccc-0001-0001-0001-000000000001',
  'admin@example.test',
  '+255700000001',
  'active'
)
ON CONFLICT DO NOTHING;

INSERT INTO people (id, display_name, full_name, preferred_locale, directory_opt_in)
VALUES (
  'dddddddd-0001-0001-0001-000000000001',
  'Dev Admin',
  'Dev Admin',
  'en',
  false
)
ON CONFLICT DO NOTHING;

INSERT INTO organisation_users (id, church_id, user_account_id, person_id, status)
VALUES (
  'eeeeeeee-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'cccccccc-0001-0001-0001-000000000001',
  'dddddddd-0001-0001-0001-000000000001',
  'active'
)
ON CONFLICT DO NOTHING;

INSERT INTO user_role_assignments (
  id, church_id, user_account_id, role_id, scope_type
)
VALUES (
  'ffffffff-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'cccccccc-0001-0001-0001-000000000001',
  'bbbbbbbb-0001-0001-0001-000000000001',
  'church'
)
ON CONFLICT DO NOTHING;

INSERT INTO memberships (
  id, church_id, person_id, membership_type, status, effective_from
)
VALUES (
  '99999999-0001-0001-0001-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'dddddddd-0001-0001-0001-000000000001',
  'individual',
  'active',
  CURRENT_DATE
)
ON CONFLICT DO NOTHING;
