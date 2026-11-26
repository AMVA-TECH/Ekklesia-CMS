-- Phase 6: support cases, controlled support sessions, access reviews, break-glass.

CREATE TABLE IF NOT EXISTS "platform_support_cases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "case_number" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'open',
  "priority" text NOT NULL DEFAULT 'medium',
  "severity" text NOT NULL DEFAULT 'medium',
  "church_id" uuid,
  "assigned_operator_user_id" uuid,
  "reporter_user_id" uuid,
  "resolved_at" timestamp with time zone,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_support_cases_number_uidx"
  ON "platform_support_cases" ("case_number")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "platform_support_cases_status_idx"
  ON "platform_support_cases" ("status")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "platform_support_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "case_id" uuid REFERENCES "platform_support_cases"("id"),
  "church_id" uuid NOT NULL,
  "operator_user_id" uuid NOT NULL,
  "purpose" text NOT NULL,
  "access_level" text NOT NULL DEFAULT 'read',
  "status" text NOT NULL DEFAULT 'active',
  "approved_by_user_id" uuid,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "revoke_reason" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "platform_support_sessions_church_idx"
  ON "platform_support_sessions" ("church_id", "status")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "platform_support_sessions_operator_idx"
  ON "platform_support_sessions" ("operator_user_id", "status")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "platform_access_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "scope" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "due_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "reviewer_user_id" uuid,
  "findings_summary" text,
  "snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "platform_access_reviews_status_idx"
  ON "platform_access_reviews" ("status")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "platform_break_glass_grants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "operator_user_id" uuid NOT NULL,
  "reason" text NOT NULL,
  "permissions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "status" text NOT NULL DEFAULT 'active',
  "approved_by_user_id" uuid,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "revoke_reason" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "platform_break_glass_operator_idx"
  ON "platform_break_glass_grants" ("operator_user_id", "status")
  WHERE "deleted_at" IS NULL;
