-- Tenant RLS for Stage 3 tables.

ALTER TABLE "organisational_units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organisational_units" FORCE ROW LEVEL SECURITY;
CREATE POLICY "organisational_units_tenant_isolation" ON "organisational_units"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "programmes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "programmes" FORCE ROW LEVEL SECURITY;
CREATE POLICY "programmes_tenant_isolation" ON "programmes"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "positions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "positions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "positions_tenant_isolation" ON "positions"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "appointments_tenant_isolation" ON "appointments"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "appointment_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointment_history" FORCE ROW LEVEL SECURITY;
CREATE POLICY "appointment_history_tenant_isolation" ON "appointment_history"
  USING (EXISTS (
    SELECT 1 FROM "appointments" a
    WHERE a."id" = "appointment_history"."appointment_id"
      AND a."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "appointments" a
    WHERE a."id" = "appointment_history"."appointment_id"
      AND a."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "delegations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "delegations" FORCE ROW LEVEL SECURITY;
CREATE POLICY "delegations_tenant_isolation" ON "delegations"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "participation_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "participation_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY "participation_requests_tenant_isolation" ON "participation_requests"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "participations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "participations" FORCE ROW LEVEL SECURITY;
CREATE POLICY "participations_tenant_isolation" ON "participations"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "participation_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "participation_history" FORCE ROW LEVEL SECURITY;
CREATE POLICY "participation_history_tenant_isolation" ON "participation_history"
  USING (EXISTS (
    SELECT 1 FROM "participations" p
    WHERE p."id" = "participation_history"."participation_id"
      AND p."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "participations" p
    WHERE p."id" = "participation_history"."participation_id"
      AND p."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "event_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_types" FORCE ROW LEVEL SECURITY;
CREATE POLICY "event_types_tenant_isolation" ON "event_types"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "events_tenant_isolation" ON "events"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "event_registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_registrations" FORCE ROW LEVEL SECURITY;
CREATE POLICY "event_registrations_tenant_isolation" ON "event_registrations"
  USING (EXISTS (
    SELECT 1 FROM "events" e
    WHERE e."id" = "event_registrations"."event_id"
      AND e."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "events" e
    WHERE e."id" = "event_registrations"."event_id"
      AND e."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "attendance_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_sessions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "attendance_sessions_tenant_isolation" ON "attendance_sessions"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "attendance_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_records" FORCE ROW LEVEL SECURITY;
CREATE POLICY "attendance_records_tenant_isolation" ON "attendance_records"
  USING (EXISTS (
    SELECT 1 FROM "attendance_sessions" s
    WHERE s."id" = "attendance_records"."session_id"
      AND s."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "attendance_sessions" s
    WHERE s."id" = "attendance_records"."session_id"
      AND s."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "attendance_summaries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_summaries" FORCE ROW LEVEL SECURITY;
CREATE POLICY "attendance_summaries_tenant_isolation" ON "attendance_summaries"
  USING (EXISTS (
    SELECT 1 FROM "attendance_sessions" s
    WHERE s."id" = "attendance_summaries"."session_id"
      AND s."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "attendance_sessions" s
    WHERE s."id" = "attendance_summaries"."session_id"
      AND s."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "session_qr_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session_qr_tokens" FORCE ROW LEVEL SECURITY;
CREATE POLICY "session_qr_tokens_tenant_isolation" ON "session_qr_tokens"
  USING (EXISTS (
    SELECT 1 FROM "attendance_sessions" s
    WHERE s."id" = "session_qr_tokens"."session_id"
      AND s."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "attendance_sessions" s
    WHERE s."id" = "session_qr_tokens"."session_id"
      AND s."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "attendance_day_aggregates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_day_aggregates" FORCE ROW LEVEL SECURITY;
CREATE POLICY "attendance_day_aggregates_tenant_isolation" ON "attendance_day_aggregates"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "attendance_correction_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_correction_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY "attendance_correction_requests_tenant_isolation" ON "attendance_correction_requests"
  USING (EXISTS (
    SELECT 1 FROM "attendance_sessions" s
    WHERE s."id" = "attendance_correction_requests"."session_id"
      AND s."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "attendance_sessions" s
    WHERE s."id" = "attendance_correction_requests"."session_id"
      AND s."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
--> statement-breakpoint

ALTER TABLE "absence_notices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "absence_notices" FORCE ROW LEVEL SECURITY;
CREATE POLICY "absence_notices_tenant_isolation" ON "absence_notices"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
