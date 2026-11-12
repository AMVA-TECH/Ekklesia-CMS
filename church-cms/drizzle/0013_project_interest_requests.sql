CREATE TABLE "project_interest_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_by_user_id" uuid,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"resulting_assignment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "project_interest_requests" ADD CONSTRAINT "project_interest_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_interest_requests" ADD CONSTRAINT "project_interest_requests_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_interest_requests" ADD CONSTRAINT "project_interest_requests_resulting_assignment_id_project_assignments_id_fk" FOREIGN KEY ("resulting_assignment_id") REFERENCES "public"."project_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_interest_requests_open_uidx" ON "project_interest_requests" USING btree ("project_id","person_id") WHERE "status" = 'pending' AND "deleted_at" IS NULL;--> statement-breakpoint

ALTER TABLE "project_interest_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_interest_requests" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "project_interest_requests_tenant_isolation" ON "project_interest_requests"
  USING (EXISTS (
    SELECT 1 FROM "projects" p
    WHERE p."id" = "project_interest_requests"."project_id"
      AND p."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "projects" p
    WHERE p."id" = "project_interest_requests"."project_id"
      AND p."church_id" = nullif(current_setting('app.church_id', true), '')::uuid
  ));
