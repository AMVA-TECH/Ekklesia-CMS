-- Tenant RLS for Stage 1–2 tables.
-- App connections must use a role without BYPASSRLS.
-- Set church context per transaction: select set_config('app.church_id', $1, true);

ALTER TABLE "church_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "church_settings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "church_settings_tenant_isolation" ON "church_settings"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "organisation_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organisation_users" FORCE ROW LEVEL SECURITY;
CREATE POLICY "organisation_users_tenant_isolation" ON "organisation_users"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "households" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "households" FORCE ROW LEVEL SECURITY;
CREATE POLICY "households_tenant_isolation" ON "households"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "household_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "household_members" FORCE ROW LEVEL SECURITY;
CREATE POLICY "household_members_tenant_isolation" ON "household_members"
  USING (EXISTS (
    SELECT 1 FROM "households" h
    WHERE h."id" = "household_members"."household_id"
      AND h."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "households" h
    WHERE h."id" = "household_members"."household_id"
      AND h."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "household_children" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "household_children" FORCE ROW LEVEL SECURITY;
CREATE POLICY "household_children_tenant_isolation" ON "household_children"
  USING (EXISTS (
    SELECT 1 FROM "households" h
    WHERE h."id" = "household_children"."household_id"
      AND h."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "households" h
    WHERE h."id" = "household_children"."household_id"
      AND h."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;
CREATE POLICY "memberships_tenant_isolation" ON "memberships"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "membership_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membership_applications" FORCE ROW LEVEL SECURITY;
CREATE POLICY "membership_applications_tenant_isolation" ON "membership_applications"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "roles_tenant_isolation" ON "roles"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "user_role_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_role_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "user_role_assignments_tenant_isolation" ON "user_role_assignments"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "media_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "media_assets" FORCE ROW LEVEL SECURITY;
CREATE POLICY "media_assets_tenant_isolation" ON "media_assets"
  USING (
    "church_id" IS NULL
    OR "church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  )
  WITH CHECK (
    "church_id" IS NULL
    OR "church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  );
--> statement-breakpoint

ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "audit_events_tenant_isolation" ON "audit_events"
  USING (
    "church_id" IS NULL
    OR "church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  )
  WITH CHECK (
    "church_id" IS NULL
    OR "church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  );
--> statement-breakpoint

ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "idempotency_keys" FORCE ROW LEVEL SECURITY;
CREATE POLICY "idempotency_keys_tenant_isolation" ON "idempotency_keys"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "domain_event_outbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "domain_event_outbox" FORCE ROW LEVEL SECURITY;
CREATE POLICY "domain_event_outbox_tenant_isolation" ON "domain_event_outbox"
  USING (
    "church_id" IS NULL
    OR "church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  )
  WITH CHECK (
    "church_id" IS NULL
    OR "church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  );
