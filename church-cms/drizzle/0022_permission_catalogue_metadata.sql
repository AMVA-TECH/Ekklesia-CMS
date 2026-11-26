-- Permission catalogue metadata (platform-owned; churches cannot mutate codes).
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "module" text;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "sensitivity" text;

-- Ensure restricted/delete codes exist for seed parity with PERMISSIONS.
INSERT INTO "permissions" ("id", "code", "description", "module", "sensitivity")
VALUES
  (gen_random_uuid(), 'people:delete', 'Soft-delete people', 'people', 'high_risk'),
  (gen_random_uuid(), 'people:read_restricted', 'View restricted personal fields', 'people', 'high_risk')
ON CONFLICT ("code") DO UPDATE SET
  "description" = EXCLUDED."description",
  "module" = EXCLUDED."module",
  "sensitivity" = EXCLUDED."sensitivity";

UPDATE "permissions" SET
  "module" = CASE
    WHEN "code" LIKE 'church:%' THEN 'church'
    WHEN "code" LIKE 'roles:%' OR "code" IN ('audit:read', 'exports:run', 'imports:run', 'media:upload') THEN 'access'
    WHEN "code" LIKE 'platform:%' THEN 'platform'
    WHEN "code" LIKE 'people:%' OR "code" LIKE 'households:%' OR "code" = 'directory:read' THEN 'people'
    WHEN "code" LIKE 'memberships:%' THEN 'membership'
    WHEN "code" LIKE 'units:%' OR "code" LIKE 'programmes:%' OR "code" LIKE 'positions:%' OR "code" LIKE 'appointments:%' THEN 'organisation'
    WHEN "code" LIKE 'participations:%' THEN 'ministries'
    WHEN "code" LIKE 'events:%' THEN 'events'
    WHEN "code" LIKE 'attendance:%' THEN 'attendance'
    WHEN "code" LIKE 'projects:%' OR "code" LIKE 'funds:%' OR "code" LIKE 'accounts:%' OR "code" LIKE 'periods:%'
      OR "code" LIKE 'journals:%' OR "code" LIKE 'disbursements:%' OR "code" LIKE 'budgets:%'
      OR "code" LIKE 'finance_%' OR "code" LIKE 'offerings:%' OR "code" LIKE 'pledges:%' THEN 'finance'
    WHEN "code" LIKE 'templates:%' OR "code" LIKE 'messages:%' OR "code" LIKE 'announcements:%' OR "code" = 'preferences:self' THEN 'messaging'
    ELSE 'other'
  END,
  "sensitivity" = CASE
    WHEN "code" IN (
      'roles:assign', 'exports:run', 'imports:run', 'people:delete', 'people:read_restricted',
      'disbursements:approve', 'journals:post', 'journals:reverse', 'messages:bulk_send',
      'funds:write', 'accounts:write', 'periods:write',
      'platform:read', 'platform:admin', 'platform:impersonate_tenant', 'platform:security_read'
    ) THEN 'high_risk'
    WHEN "code" LIKE '%:read' OR "code" IN ('preferences:self', 'events:register', 'participations:request', 'directory:read', 'media:upload', 'church:read', 'units:read') THEN 'standard'
    ELSE 'sensitive'
  END
WHERE "module" IS NULL OR "sensitivity" IS NULL OR "description" IS NULL;
