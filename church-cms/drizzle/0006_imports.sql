-- Member Excel/CSV import jobs (DEC-027). Tables were in Drizzle schema but never migrated.
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"media_asset_id" uuid,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"source_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "import_row_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"status" text NOT NULL,
	"payload" jsonb,
	"error_code" text
);
--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_row_results" ADD CONSTRAINT "import_row_results_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_jobs_church_idx" ON "import_jobs" USING btree ("church_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_row_results_job_row_uidx" ON "import_row_results" USING btree ("job_id","row_number");
--> statement-breakpoint

ALTER TABLE "import_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_jobs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "import_jobs_tenant_isolation" ON "import_jobs"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "import_row_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_row_results" FORCE ROW LEVEL SECURITY;
CREATE POLICY "import_row_results_tenant_isolation" ON "import_row_results"
  USING (EXISTS (
    SELECT 1 FROM "import_jobs" j
    WHERE j."id" = "import_row_results"."job_id"
      AND j."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "import_jobs" j
    WHERE j."id" = "import_row_results"."job_id"
      AND j."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
