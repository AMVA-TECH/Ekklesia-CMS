-- Phase 7: platform config layers (global / defaults / tenant). No billing keys.

CREATE TABLE IF NOT EXISTS "platform_config" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scope" text NOT NULL,
  "church_id" uuid,
  "document" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_config_global_uidx"
  ON "platform_config" ("scope")
  WHERE "scope" = 'global' AND "deleted_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "platform_config_defaults_uidx"
  ON "platform_config" ("scope")
  WHERE "scope" = 'defaults' AND "deleted_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "platform_config_tenant_uidx"
  ON "platform_config" ("church_id")
  WHERE "scope" = 'tenant' AND "church_id" IS NOT NULL AND "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "platform_config_scope_idx"
  ON "platform_config" ("scope")
  WHERE "deleted_at" IS NULL;
