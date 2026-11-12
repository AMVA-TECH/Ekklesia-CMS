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
  ('aaaaaaaa-0001-0001-0001-00000000003f', 'memberships:create', 'Create memberships'),
  ('aaaaaaaa-0001-0001-0001-000000000007', 'memberships:update_status', 'Update membership status'),
  ('aaaaaaaa-0001-0001-0001-000000000008', 'memberships:approve', 'Approve memberships'),
  ('aaaaaaaa-0001-0001-0001-000000000009', 'units:read', 'Read organisational units'),
  ('aaaaaaaa-0001-0001-0001-00000000000a', 'units:write', 'Write organisational units'),
  ('aaaaaaaa-0001-0001-0001-00000000000b', 'programmes:write', 'Write programmes'),
  ('aaaaaaaa-0001-0001-0001-00000000000c', 'participations:read', 'Read participations'),
  ('aaaaaaaa-0001-0001-0001-00000000000d', 'participations:request', 'Request participation'),
  ('aaaaaaaa-0001-0001-0001-00000000000e', 'participations:approve', 'Approve participations'),
  ('aaaaaaaa-0001-0001-0001-00000000000f', 'events:read', 'Read events'),
  ('aaaaaaaa-0001-0001-0001-000000000010', 'events:write', 'Write events'),
  ('aaaaaaaa-0001-0001-0001-000000000011', 'attendance:read', 'Read attendance'),
  ('aaaaaaaa-0001-0001-0001-000000000012', 'attendance:record', 'Record attendance'),
  ('aaaaaaaa-0001-0001-0001-000000000013', 'funds:read', 'Read funds'),
  ('aaaaaaaa-0001-0001-0001-000000000014', 'funds:write', 'Write funds'),
  ('aaaaaaaa-0001-0001-0001-000000000015', 'accounts:read', 'Read accounts'),
  ('aaaaaaaa-0001-0001-0001-000000000016', 'accounts:write', 'Write accounts'),
  ('aaaaaaaa-0001-0001-0001-000000000017', 'periods:write', 'Write financial periods'),
  ('aaaaaaaa-0001-0001-0001-000000000018', 'offerings:write', 'Write offerings'),
  ('aaaaaaaa-0001-0001-0001-000000000019', 'pledges:read', 'Read pledges'),
  ('aaaaaaaa-0001-0001-0001-00000000001a', 'pledges:write', 'Write pledges'),
  ('aaaaaaaa-0001-0001-0001-00000000001b', 'pledges:follow_up', 'Follow up pledges'),
  ('aaaaaaaa-0001-0001-0001-00000000001c', 'journals:read', 'Read journals'),
  ('aaaaaaaa-0001-0001-0001-00000000001d', 'journals:draft', 'Draft journals'),
  ('aaaaaaaa-0001-0001-0001-00000000001e', 'journals:post', 'Post journals'),
  ('aaaaaaaa-0001-0001-0001-000000000040', 'journals:reverse', 'Reverse posted journals'),
  ('aaaaaaaa-0001-0001-0001-00000000001f', 'templates:write', 'Write message templates'),
  ('aaaaaaaa-0001-0001-0001-000000000020', 'announcements:write', 'Write announcements'),
  ('aaaaaaaa-0001-0001-0001-000000000021', 'announcements:publish', 'Publish announcements'),
  ('aaaaaaaa-0001-0001-0001-000000000022', 'preferences:self', 'Manage own communication preferences'),
  ('aaaaaaaa-0001-0001-0001-000000000023', 'imports:run', 'Run member imports'),
  ('aaaaaaaa-0001-0001-0001-000000000024', 'positions:write', 'Write leadership positions'),
  ('aaaaaaaa-0001-0001-0001-000000000025', 'appointments:write', 'Appoint and end leaders'),
  ('aaaaaaaa-0001-0001-0001-000000000026', 'messages:send', 'Send / view message jobs'),
  ('aaaaaaaa-0001-0001-0001-000000000027', 'messages:bulk_send', 'Queue leadership text blasts'),
  ('aaaaaaaa-0001-0001-0001-000000000028', 'disbursements:request', 'Request disbursements / expenses'),
  ('aaaaaaaa-0001-0001-0001-000000000029', 'disbursements:approve', 'Approve disbursements / expenses'),
  ('aaaaaaaa-0001-0001-0001-00000000002a', 'finance_reports:read', 'Read finance / leadership finance reports'),
  ('aaaaaaaa-0001-0001-0001-00000000002b', 'church:update', 'Update church profile / manage delegations'),
  ('aaaaaaaa-0001-0001-0001-00000000003e', 'church:read', 'Read church profile and settings'),
  ('aaaaaaaa-0001-0001-0001-00000000002c', 'roles:assign', 'Assign roles'),
  ('aaaaaaaa-0001-0001-0001-00000000003c', 'roles:read', 'Read roles'),
  ('aaaaaaaa-0001-0001-0001-00000000003d', 'exports:run', 'Run data exports'),
  ('aaaaaaaa-0001-0001-0001-00000000002d', 'budgets:read', 'Read budgets'),
  ('aaaaaaaa-0001-0001-0001-00000000002e', 'budgets:write', 'Write budgets'),
  ('aaaaaaaa-0001-0001-0001-00000000002f', 'attendance:stats_leadership', 'Leadership attendance stats / follow-up'),
  ('aaaaaaaa-0001-0001-0001-000000000030', 'attendance:absence_notice', 'Create absence notices'),
  ('aaaaaaaa-0001-0001-0001-000000000031', 'attendance:check_in_self', 'Self QR check-in'),
  ('aaaaaaaa-0001-0001-0001-000000000032', 'attendance:correct_request', 'Request attendance correction'),
  ('aaaaaaaa-0001-0001-0001-000000000033', 'attendance:correct_resolve', 'Resolve attendance correction'),
  ('aaaaaaaa-0001-0001-0001-000000000034', 'projects:read', 'Read projects'),
  ('aaaaaaaa-0001-0001-0001-000000000035', 'projects:write', 'Write projects / contributions'),
  ('aaaaaaaa-0001-0001-0001-000000000036', 'projects:assign', 'Assign people to projects'),
  ('aaaaaaaa-0001-0001-0001-000000000037', 'directory:read', 'Read opt-in member directory'),
  ('aaaaaaaa-0001-0001-0001-000000000038', 'projects:interest', 'Express interest in a project'),
  ('aaaaaaaa-0001-0001-0001-000000000039', 'media:upload', 'Upload media assets'),
  ('aaaaaaaa-0001-0001-0001-00000000003a', 'events:register', 'Register for events'),
  ('aaaaaaaa-0001-0001-0001-00000000003b', 'audit:read', 'Read audit events')
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
  'memberships:read','memberships:create','memberships:update_status','memberships:approve',
  'units:read','units:write','programmes:write',
  'positions:write','appointments:write',
  'participations:read','participations:request','participations:approve',
  'events:read','events:write','events:register','attendance:read','attendance:record',
  'attendance:stats_leadership','attendance:absence_notice','attendance:check_in_self',
  'attendance:correct_request','attendance:correct_resolve',
  'funds:read','funds:write','accounts:read','accounts:write','periods:write',
  'offerings:write','pledges:read','pledges:write','pledges:follow_up',
  'journals:read','journals:draft','journals:post','journals:reverse',
  'templates:write','announcements:write','announcements:publish','preferences:self',
  'messages:send','messages:bulk_send',
  'disbursements:request','disbursements:approve','finance_reports:read',
  'budgets:read','budgets:write',
  'projects:read','projects:write','projects:assign','projects:interest',
  'directory:read',
  'media:upload',
  'audit:read',
  'church:read','church:update','roles:read','roles:assign',
  'exports:run','imports:run'
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

-- Default event types (Sunday services included)
INSERT INTO event_types (id, church_id, code, name, created_by, updated_by)
VALUES
  ('10101010-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'sunday_service', 'Sunday Service', 'cccccccc-0001-0001-0001-000000000001', 'cccccccc-0001-0001-0001-000000000001'),
  ('10101010-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'midweek_service', 'Midweek Service', 'cccccccc-0001-0001-0001-000000000001', 'cccccccc-0001-0001-0001-000000000001'),
  ('10101010-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'special_event', 'Special Event', 'cccccccc-0001-0001-0001-000000000001', 'cccccccc-0001-0001-0001-000000000001'),
  ('10101010-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'ministry_meeting', 'Ministry Meeting', 'cccccccc-0001-0001-0001-000000000001', 'cccccccc-0001-0001-0001-000000000001')
ON CONFLICT DO NOTHING;

-- --- Multi-role UAT fixtures (member + finance_officer) ---

INSERT INTO roles (id, church_id, code, name)
VALUES
  (
    'bbbbbbbb-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'member',
    'Member'
  ),
  (
    'bbbbbbbb-0001-0001-0001-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'finance_officer',
    'Finance Officer'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'bbbbbbbb-0001-0001-0001-000000000002', id
FROM permissions
WHERE code IN (
  'church:read',
  'preferences:self',
  'directory:read',
  'units:read',
  'participations:request',
  'events:read',
  'events:register',
  'attendance:check_in_self',
  'attendance:absence_notice',
  'attendance:correct_request',
  'projects:read',
  'projects:interest',
  'media:upload'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'bbbbbbbb-0001-0001-0001-000000000003', id
FROM permissions
WHERE code IN (
  'church:read',
  'funds:read','funds:write',
  'accounts:read','accounts:write',
  'periods:write',
  'journals:read','journals:draft','journals:post','journals:reverse',
  'disbursements:request',
  'finance_reports:read',
  'offerings:write',
  'pledges:read','pledges:write','pledges:follow_up',
  'budgets:read','budgets:write',
  'audit:read'
)
ON CONFLICT DO NOTHING;

INSERT INTO user_accounts (id, email, phone_e164, status)
VALUES
  (
    'cccccccc-0001-0001-0001-000000000002',
    'member@example.test',
    '+255700000002',
    'active'
  ),
  (
    'cccccccc-0001-0001-0001-000000000003',
    'finance@example.test',
    '+255700000003',
    'active'
  )
ON CONFLICT DO NOTHING;

INSERT INTO people (id, display_name, full_name, preferred_locale, directory_opt_in)
VALUES
  (
    'dddddddd-0001-0001-0001-000000000002',
    'Dev Member',
    'Dev Member',
    'sw',
    true
  ),
  (
    'dddddddd-0001-0001-0001-000000000003',
    'Dev Finance',
    'Dev Finance Officer',
    'en',
    false
  )
ON CONFLICT DO NOTHING;

INSERT INTO organisation_users (id, church_id, user_account_id, person_id, status)
VALUES
  (
    'eeeeeeee-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000002',
    'dddddddd-0001-0001-0001-000000000002',
    'active'
  ),
  (
    'eeeeeeee-0001-0001-0001-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000003',
    'dddddddd-0001-0001-0001-000000000003',
    'active'
  )
ON CONFLICT DO NOTHING;

INSERT INTO user_role_assignments (
  id, church_id, user_account_id, role_id, scope_type
)
VALUES
  (
    'ffffffff-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000002',
    'bbbbbbbb-0001-0001-0001-000000000002',
    'self'
  ),
  (
    'ffffffff-0001-0001-0001-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-0001-0001-0001-000000000003',
    'bbbbbbbb-0001-0001-0001-000000000003',
    'church'
  )
ON CONFLICT DO NOTHING;

INSERT INTO memberships (
  id, church_id, person_id, membership_type, status, effective_from
)
VALUES
  (
    '99999999-0001-0001-0001-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'dddddddd-0001-0001-0001-000000000002',
    'individual',
    'active',
    CURRENT_DATE
  ),
  (
    '99999999-0001-0001-0001-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'dddddddd-0001-0001-0001-000000000003',
    'individual',
    'active',
    CURRENT_DATE
  )
ON CONFLICT DO NOTHING;

-- Platform operator (ADR-0003) — global membership, not a church role.
INSERT INTO user_accounts (id, email, phone_e164, status)
VALUES (
  'cccccccc-0001-0001-0001-000000000004',
  'platform@example.test',
  '+255700000004',
  'active'
)
ON CONFLICT DO NOTHING;

INSERT INTO platform_operators (
  id, user_account_id, status, permissions, created_by, updated_by
)
VALUES (
  'a0a0a0a0-0001-0001-0001-000000000001',
  'cccccccc-0001-0001-0001-000000000004',
  'active',
  '["platform:read","platform:admin","platform:impersonate_tenant","platform:security_read"]'::jsonb,
  'cccccccc-0001-0001-0001-000000000004',
  'cccccccc-0001-0001-0001-000000000004'
)
ON CONFLICT DO NOTHING;
