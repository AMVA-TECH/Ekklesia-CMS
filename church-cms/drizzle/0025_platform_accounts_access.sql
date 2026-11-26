-- Phase 3: platform service accounts (non-human identities).

CREATE TABLE IF NOT EXISTS "platform_service_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "purpose" text NOT NULL,
  "owner_user_id" uuid,
  "status" text NOT NULL DEFAULT 'active',
  "scopes" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "environment" text NOT NULL DEFAULT 'all',
  "credential_hash" text,
  "credential_prefix" text,
  "expires_at" timestamp with time zone,
  "last_used_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_service_accounts_name_uidx"
  ON "platform_service_accounts" ("name")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "platform_service_accounts_status_idx"
  ON "platform_service_accounts" ("status")
  WHERE "deleted_at" IS NULL;
