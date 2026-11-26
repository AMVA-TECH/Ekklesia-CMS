-- Church registration applications, events, provisioning, tenant lifecycle.

ALTER TABLE "churches"
  ADD COLUMN IF NOT EXISTS "lifecycle_status" text NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS "church_registration_applications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "official_name" text NOT NULL,
  "display_name" text,
  "website" text,
  "country" text NOT NULL DEFAULT 'TZ',
  "location" text,
  "address" text,
  "denomination" text,
  "year_established" integer,
  "description" text,
  "approx_size" text,
  "branch_count" integer,
  "representative_name" text NOT NULL,
  "representative_role" text,
  "email" text NOT NULL,
  "phone_e164" text,
  "preferred_contact" text,
  "email_verified_at" timestamp with time zone,
  "email_verify_token_hash" text,
  "email_verify_expires_at" timestamp with time zone,
  "applicant_access_token_hash" text,
  "assigned_reviewer_user_id" uuid,
  "assigned_at" timestamp with time zone,
  "decision_note" text,
  "decided_by_user_id" uuid,
  "decided_at" timestamp with time zone,
  "resulting_church_id" uuid,
  "idempotency_key" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "church_reg_apps_idempotency_uidx"
  ON "church_registration_applications" ("idempotency_key")
  WHERE "idempotency_key" IS NOT NULL AND "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "church_reg_apps_status_idx"
  ON "church_registration_applications" ("status")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "church_reg_apps_email_idx"
  ON "church_registration_applications" ("email")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "church_registration_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL REFERENCES "church_registration_applications"("id"),
  "event_type" text NOT NULL,
  "actor_user_id" uuid,
  "note" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "church_reg_events_app_idx"
  ON "church_registration_events" ("application_id", "created_at");

CREATE TABLE IF NOT EXISTS "tenant_provisioning_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL REFERENCES "church_registration_applications"("id"),
  "status" text NOT NULL DEFAULT 'not_started',
  "idempotency_key" text NOT NULL,
  "church_id" uuid,
  "admin_user_account_id" uuid,
  "admin_invite_token_hash" text,
  "admin_invite_expires_at" timestamp with time zone,
  "error_message" text,
  "attempt_count" integer NOT NULL DEFAULT 0,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_provision_idempotency_uidx"
  ON "tenant_provisioning_requests" ("idempotency_key");

CREATE INDEX IF NOT EXISTS "tenant_provision_status_idx"
  ON "tenant_provisioning_requests" ("status")
  WHERE "deleted_at" IS NULL;
