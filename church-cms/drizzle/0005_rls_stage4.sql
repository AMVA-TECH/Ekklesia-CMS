-- Tenant RLS for Stage 4 finance + messaging.

ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "accounts_tenant_isolation" ON "accounts"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "financial_years" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_years" FORCE ROW LEVEL SECURITY;
CREATE POLICY "financial_years_tenant_isolation" ON "financial_years"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "funds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "funds" FORCE ROW LEVEL SECURITY;
CREATE POLICY "funds_tenant_isolation" ON "funds"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "journals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journals" FORCE ROW LEVEL SECURITY;
CREATE POLICY "journals_tenant_isolation" ON "journals"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "journal_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journal_lines" FORCE ROW LEVEL SECURITY;
CREATE POLICY "journal_lines_tenant_isolation" ON "journal_lines"
  USING (EXISTS (
    SELECT 1 FROM "journals" j
    WHERE j."id" = "journal_lines"."journal_id"
      AND j."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "journals" j
    WHERE j."id" = "journal_lines"."journal_id"
      AND j."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "offerings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "offerings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "offerings_tenant_isolation" ON "offerings"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "pledges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pledges" FORCE ROW LEVEL SECURITY;
CREATE POLICY "pledges_tenant_isolation" ON "pledges"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "pledge_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pledge_applications" FORCE ROW LEVEL SECURITY;
CREATE POLICY "pledge_applications_tenant_isolation" ON "pledge_applications"
  USING (EXISTS (
    SELECT 1 FROM "pledges" p
    WHERE p."id" = "pledge_applications"."pledge_id"
      AND p."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "pledges" p
    WHERE p."id" = "pledge_applications"."pledge_id"
      AND p."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "pledge_follow_ups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pledge_follow_ups" FORCE ROW LEVEL SECURITY;
CREATE POLICY "pledge_follow_ups_tenant_isolation" ON "pledge_follow_ups"
  USING (EXISTS (
    SELECT 1 FROM "pledges" p
    WHERE p."id" = "pledge_follow_ups"."pledge_id"
      AND p."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "pledges" p
    WHERE p."id" = "pledge_follow_ups"."pledge_id"
      AND p."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" FORCE ROW LEVEL SECURITY;
CREATE POLICY "expenses_tenant_isolation" ON "expenses"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "budgets" FORCE ROW LEVEL SECURITY;
CREATE POLICY "budgets_tenant_isolation" ON "budgets"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "budget_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "budget_lines" FORCE ROW LEVEL SECURITY;
CREATE POLICY "budget_lines_tenant_isolation" ON "budget_lines"
  USING (EXISTS (
    SELECT 1 FROM "budgets" b
    WHERE b."id" = "budget_lines"."budget_id"
      AND b."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "budgets" b
    WHERE b."id" = "budget_lines"."budget_id"
      AND b."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;
CREATE POLICY "projects_tenant_isolation" ON "projects"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "project_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "project_assignments_tenant_isolation" ON "project_assignments"
  USING (EXISTS (
    SELECT 1 FROM "projects" p
    WHERE p."id" = "project_assignments"."project_id"
      AND p."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "projects" p
    WHERE p."id" = "project_assignments"."project_id"
      AND p."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "project_contributions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_contributions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "project_contributions_tenant_isolation" ON "project_contributions"
  USING (EXISTS (
    SELECT 1 FROM "projects" p
    WHERE p."id" = "project_contributions"."project_id"
      AND p."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "projects" p
    WHERE p."id" = "project_contributions"."project_id"
      AND p."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "approval_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY "approval_requests_tenant_isolation" ON "approval_requests"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "approval_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_actions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "approval_actions_tenant_isolation" ON "approval_actions"
  USING (EXISTS (
    SELECT 1 FROM "approval_requests" r
    WHERE r."id" = "approval_actions"."approval_request_id"
      AND r."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "approval_requests" r
    WHERE r."id" = "approval_actions"."approval_request_id"
      AND r."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "message_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "message_templates" FORCE ROW LEVEL SECURITY;
CREATE POLICY "message_templates_tenant_isolation" ON "message_templates"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "announcements" FORCE ROW LEVEL SECURITY;
CREATE POLICY "announcements_tenant_isolation" ON "announcements"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "announcement_audiences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "announcement_audiences" FORCE ROW LEVEL SECURITY;
CREATE POLICY "announcement_audiences_tenant_isolation" ON "announcement_audiences"
  USING (EXISTS (
    SELECT 1 FROM "announcements" a
    WHERE a."id" = "announcement_audiences"."announcement_id"
      AND a."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "announcements" a
    WHERE a."id" = "announcement_audiences"."announcement_id"
      AND a."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "message_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "message_jobs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "message_jobs_tenant_isolation" ON "message_jobs"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "message_deliveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "message_deliveries" FORCE ROW LEVEL SECURITY;
CREATE POLICY "message_deliveries_tenant_isolation" ON "message_deliveries"
  USING (EXISTS (
    SELECT 1 FROM "message_jobs" j
    WHERE j."id" = "message_deliveries"."job_id"
      AND j."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "message_jobs" j
    WHERE j."id" = "message_deliveries"."job_id"
      AND j."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "communication_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communication_preferences" FORCE ROW LEVEL SECURITY;
CREATE POLICY "communication_preferences_tenant_isolation" ON "communication_preferences"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "consent_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consent_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY "consent_records_tenant_isolation" ON "consent_records"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
