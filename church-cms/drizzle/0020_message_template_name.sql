ALTER TABLE "message_templates" ADD COLUMN "name" text;--> statement-breakpoint
UPDATE "message_templates"
SET "name" = initcap(replace("code", '_', ' '))
WHERE "name" IS NULL;--> statement-breakpoint
ALTER TABLE "message_templates" ALTER COLUMN "name" SET NOT NULL;
