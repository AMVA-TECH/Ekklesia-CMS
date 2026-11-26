-- Phase 4: integration directory + webhook event/attempt evidence.

CREATE TABLE IF NOT EXISTS "platform_integrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "scope" text NOT NULL DEFAULT 'global',
  "description" text,
  "status_override" text,
  "config_summary" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_integrations_code_uidx"
  ON "platform_integrations" ("code")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "platform_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "integration_code" text NOT NULL,
  "direction" text NOT NULL,
  "event_type" text NOT NULL,
  "church_id" uuid,
  "correlation_id" text,
  "idempotency_key" text,
  "payload_redacted" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "http_status" integer,
  "processing_status" text NOT NULL DEFAULT 'received',
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone,
  "retry_count" integer NOT NULL DEFAULT 0,
  "error_message" text,
  "duration_ms" integer,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_webhook_events_idempotency_uidx"
  ON "platform_webhook_events" ("idempotency_key")
  WHERE "idempotency_key" IS NOT NULL AND "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "platform_webhook_events_integration_idx"
  ON "platform_webhook_events" ("integration_code", "received_at")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "platform_webhook_events_status_idx"
  ON "platform_webhook_events" ("processing_status")
  WHERE "deleted_at" IS NULL;

CREATE TABLE IF NOT EXISTS "platform_webhook_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL REFERENCES "platform_webhook_events"("id"),
  "attempt_number" integer NOT NULL,
  "outcome" text NOT NULL,
  "http_status" integer,
  "duration_ms" integer,
  "error_message" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "platform_webhook_attempts_event_idx"
  ON "platform_webhook_attempts" ("event_id", "attempt_number");
