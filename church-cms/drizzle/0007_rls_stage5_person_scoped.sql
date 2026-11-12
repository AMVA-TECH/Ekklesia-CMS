-- Stage 5: RLS for global person/account tables + orphan membership child tables.
-- people / person_contacts / user_accounts have no church_id column; scope via membership
-- or organisation_users. INSERT allowed when app.church_id is set (tenant transaction).

ALTER TABLE "people" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "people" FORCE ROW LEVEL SECURITY;
CREATE POLICY "people_tenant_select" ON "people"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "memberships" m
      WHERE m."person_id" = "people"."id"
        AND m."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
    )
    OR EXISTS (
      SELECT 1 FROM "organisation_users" ou
      WHERE ou."person_id" = "people"."id"
        AND ou."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
    )
  );
CREATE POLICY "people_tenant_insert" ON "people"
  FOR INSERT
  WITH CHECK (nullif(current_setting('app.church_id', true), '') IS NOT NULL);
CREATE POLICY "people_tenant_update" ON "people"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "memberships" m
      WHERE m."person_id" = "people"."id"
        AND m."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
    )
    OR EXISTS (
      SELECT 1 FROM "organisation_users" ou
      WHERE ou."person_id" = "people"."id"
        AND ou."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
    )
  )
  WITH CHECK (nullif(current_setting('app.church_id', true), '') IS NOT NULL);
CREATE POLICY "people_tenant_delete" ON "people"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "memberships" m
      WHERE m."person_id" = "people"."id"
        AND m."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
    )
    OR EXISTS (
      SELECT 1 FROM "organisation_users" ou
      WHERE ou."person_id" = "people"."id"
        AND ou."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
    )
  );
--> statement-breakpoint

ALTER TABLE "person_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "person_contacts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "person_contacts_tenant_select" ON "person_contacts"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "memberships" m
      WHERE m."person_id" = "person_contacts"."person_id"
        AND m."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
    )
    OR EXISTS (
      SELECT 1 FROM "organisation_users" ou
      WHERE ou."person_id" = "person_contacts"."person_id"
        AND ou."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
    )
  );
CREATE POLICY "person_contacts_tenant_insert" ON "person_contacts"
  FOR INSERT
  WITH CHECK (nullif(current_setting('app.church_id', true), '') IS NOT NULL);
CREATE POLICY "person_contacts_tenant_update" ON "person_contacts"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "memberships" m
      WHERE m."person_id" = "person_contacts"."person_id"
        AND m."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
    )
    OR EXISTS (
      SELECT 1 FROM "organisation_users" ou
      WHERE ou."person_id" = "person_contacts"."person_id"
        AND ou."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
    )
  )
  WITH CHECK (nullif(current_setting('app.church_id', true), '') IS NOT NULL);
CREATE POLICY "person_contacts_tenant_delete" ON "person_contacts"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "memberships" m
      WHERE m."person_id" = "person_contacts"."person_id"
        AND m."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
    )
    OR EXISTS (
      SELECT 1 FROM "organisation_users" ou
      WHERE ou."person_id" = "person_contacts"."person_id"
        AND ou."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
    )
  );
--> statement-breakpoint

ALTER TABLE "user_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_accounts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "user_accounts_tenant_select" ON "user_accounts"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "organisation_users" ou
      WHERE ou."user_account_id" = "user_accounts"."id"
        AND ou."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
    )
  );
CREATE POLICY "user_accounts_tenant_insert" ON "user_accounts"
  FOR INSERT
  WITH CHECK (nullif(current_setting('app.church_id', true), '') IS NOT NULL);
CREATE POLICY "user_accounts_tenant_update" ON "user_accounts"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "organisation_users" ou
      WHERE ou."user_account_id" = "user_accounts"."id"
        AND ou."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
    )
  )
  WITH CHECK (nullif(current_setting('app.church_id', true), '') IS NOT NULL);
CREATE POLICY "user_accounts_tenant_delete" ON "user_accounts"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "organisation_users" ou
      WHERE ou."user_account_id" = "user_accounts"."id"
        AND ou."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
    )
  );
--> statement-breakpoint

ALTER TABLE "membership_decisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membership_decisions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "membership_decisions_tenant_isolation" ON "membership_decisions"
  USING (EXISTS (
    SELECT 1 FROM "membership_applications" a
    WHERE a."id" = "membership_decisions"."application_id"
      AND a."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "membership_applications" a
    WHERE a."id" = "membership_decisions"."application_id"
      AND a."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "membership_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membership_status_history" FORCE ROW LEVEL SECURITY;
CREATE POLICY "membership_status_history_tenant_isolation" ON "membership_status_history"
  USING (EXISTS (
    SELECT 1 FROM "memberships" m
    WHERE m."id" = "membership_status_history"."membership_id"
      AND m."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "memberships" m
    WHERE m."id" = "membership_status_history"."membership_id"
      AND m."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
