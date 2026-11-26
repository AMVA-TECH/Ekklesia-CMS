-- Provenance: optional link from role assignment to leadership appointment.
ALTER TABLE "user_role_assignments"
  ADD COLUMN IF NOT EXISTS "source_appointment_id" uuid
  REFERENCES "appointments"("id");

CREATE INDEX IF NOT EXISTS "user_role_assignments_source_appointment_idx"
  ON "user_role_assignments" ("source_appointment_id")
  WHERE "source_appointment_id" IS NOT NULL;
