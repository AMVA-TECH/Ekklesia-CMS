-- Church profile columns, org/position enrichment, code sequences (DEC-033 / CrossLife pilot config).

ALTER TABLE "churches" ADD COLUMN "short_name" text;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "display_name" text;--> statement-breakpoint

ALTER TABLE "organisational_units" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "organisational_units" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "organisational_units" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint

WITH numbered AS (
  SELECT
    id,
    church_id,
    kind,
    row_number() OVER (PARTITION BY church_id ORDER BY created_at, name) AS n
  FROM "organisational_units"
  WHERE "code" IS NULL AND "deleted_at" IS NULL
)
UPDATE "organisational_units" u
SET "code" = CASE
  WHEN numbered.kind = 'ministry' THEN 'MIN-' || lpad(numbered.n::text, 6, '0')
  ELSE 'ORG-' || lpad(numbered.n::text, 6, '0')
END
FROM numbered
WHERE u.id = numbered.id;--> statement-breakpoint

UPDATE "organisational_units"
SET "code" = 'ORG-' || replace(id::text, '-', '')
WHERE "code" IS NULL;--> statement-breakpoint

ALTER TABLE "organisational_units" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "organisational_units_church_code_uidx"
  ON "organisational_units" ("church_id", "code");--> statement-breakpoint

ALTER TABLE "positions" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "organisational_unit_id" uuid
  REFERENCES "organisational_units"("id");--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "reports_to_position_id" uuid
  REFERENCES "positions"("id");--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "occupancy_policy" text DEFAULT 'single' NOT NULL;--> statement-breakpoint

ALTER TABLE "appointments" ADD COLUMN "appointment_kind" text DEFAULT 'substantive' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "appointed_by_user_id" uuid;--> statement-breakpoint

CREATE TABLE "church_code_sequences" (
  "church_id" uuid NOT NULL REFERENCES "churches"("id"),
  "namespace" text NOT NULL,
  "next_value" integer DEFAULT 1 NOT NULL,
  PRIMARY KEY ("church_id", "namespace")
);--> statement-breakpoint

ALTER TABLE "church_code_sequences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "church_code_sequences" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "church_code_sequences_tenant_isolation" ON "church_code_sequences"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);--> statement-breakpoint

INSERT INTO "church_code_sequences" ("church_id", "namespace", "next_value")
SELECT church_id, 'org', COALESCE(MAX(
  CASE WHEN code LIKE 'ORG-%' THEN NULLIF(regexp_replace(code, '^ORG-', ''), '')::int END
), 0) + 1
FROM "organisational_units"
WHERE deleted_at IS NULL
GROUP BY church_id
ON CONFLICT DO NOTHING;--> statement-breakpoint

INSERT INTO "church_code_sequences" ("church_id", "namespace", "next_value")
SELECT church_id, 'min', COALESCE(MAX(
  CASE WHEN code LIKE 'MIN-%' THEN NULLIF(regexp_replace(code, '^MIN-', ''), '')::int END
), 0) + 1
FROM "organisational_units"
WHERE deleted_at IS NULL
GROUP BY church_id
ON CONFLICT DO NOTHING;--> statement-breakpoint

INSERT INTO "church_code_sequences" ("church_id", "namespace", "next_value")
SELECT church_id, 'pos', COALESCE(MAX(
  CASE WHEN code ~ '^POS-[0-9]+$' THEN NULLIF(regexp_replace(code, '^POS-', ''), '')::int END
), 0) + 1
FROM "positions"
WHERE deleted_at IS NULL
GROUP BY church_id
ON CONFLICT DO NOTHING;
