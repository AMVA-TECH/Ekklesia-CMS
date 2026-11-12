-- Stage 5 companion: Platform Operator oversight (ADR-0003).
-- Global tables — not church-tenant RLS.

CREATE TABLE "platform_operators" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_account_id" uuid NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "permissions" jsonb NOT NULL DEFAULT '["platform:read","platform:admin","platform:impersonate_tenant","platform:security_read"]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_operators_user_active_uidx"
  ON "platform_operators" ("user_account_id")
  WHERE "deleted_at" IS NULL;
--> statement-breakpoint

CREATE TABLE "platform_audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid,
  "action" text NOT NULL,
  "outcome" text NOT NULL DEFAULT 'success',
  "church_id" uuid,
  "entity_type" text NOT NULL,
  "entity_id" uuid,
  "request_id" text,
  "ip_hash" text,
  "reason" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "platform_audit_events_created_idx"
  ON "platform_audit_events" ("created_at");
--> statement-breakpoint
CREATE INDEX "platform_audit_events_church_created_idx"
  ON "platform_audit_events" ("church_id", "created_at");
--> statement-breakpoint
CREATE INDEX "platform_audit_events_actor_created_idx"
  ON "platform_audit_events" ("actor_user_id", "created_at");
--> statement-breakpoint
CREATE INDEX "platform_audit_events_action_created_idx"
  ON "platform_audit_events" ("action", "created_at");
--> statement-breakpoint

CREATE TABLE "security_findings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "severity" text NOT NULL,
  "category" text NOT NULL,
  "title" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "church_id" uuid,
  "evidence" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "detector_key" text NOT NULL,
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone,
  "ack_by" uuid,
  "ack_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "security_findings_status_severity_idx"
  ON "security_findings" ("status", "severity");
--> statement-breakpoint
CREATE INDEX "security_findings_detector_open_idx"
  ON "security_findings" ("detector_key")
  WHERE "status" IN ('open', 'ack');
--> statement-breakpoint

CREATE TABLE "platform_metric_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "snapshot_date" date NOT NULL,
  "metric_key" text NOT NULL,
  "church_id" uuid,
  "value" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_metric_snapshots_day_key_church_uidx"
  ON "platform_metric_snapshots" ("snapshot_date", "metric_key", "church_id")
  NULLS NOT DISTINCT;
--> statement-breakpoint

-- Optional: allow platform operator session var to read church audit trail cross-tenant.
DROP POLICY IF EXISTS "audit_events_platform_operator" ON "audit_events";
--> statement-breakpoint
CREATE POLICY "audit_events_platform_operator" ON "audit_events"
  USING (nullif(current_setting('app.is_platform_operator', true), '') = 'true')
  WITH CHECK (nullif(current_setting('app.is_platform_operator', true), '') = 'true');
