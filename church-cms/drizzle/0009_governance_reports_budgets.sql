-- Budgets: period kind (monthly / quarterly / yearly)
ALTER TABLE "budgets" ADD COLUMN "period_kind" text DEFAULT 'yearly' NOT NULL;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "period_key" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "starts_on" date;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "ends_on" date;--> statement-breakpoint

CREATE TABLE "appointment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"organisational_unit_id" uuid,
	"requested_by_user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	"decision_note" text,
	"decided_by_user_id" uuid,
	"resulting_appointment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint

CREATE TABLE "meeting_minutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"organisational_unit_id" uuid,
	"title" text NOT NULL,
	"meeting_date" date NOT NULL,
	"body" text NOT NULL,
	"attendees" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint

CREATE TABLE "saved_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"name" text NOT NULL,
	"report_id" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint

ALTER TABLE "appointment_requests" ADD CONSTRAINT "appointment_requests_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_requests" ADD CONSTRAINT "appointment_requests_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_requests" ADD CONSTRAINT "appointment_requests_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_requests" ADD CONSTRAINT "appointment_requests_organisational_unit_id_organisational_units_id_fk" FOREIGN KEY ("organisational_unit_id") REFERENCES "public"."organisational_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_requests" ADD CONSTRAINT "appointment_requests_resulting_appointment_id_appointments_id_fk" FOREIGN KEY ("resulting_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_organisational_unit_id_organisational_units_id_fk" FOREIGN KEY ("organisational_unit_id") REFERENCES "public"."organisational_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_reports_church_name_uidx" ON "saved_reports" USING btree ("church_id","name");--> statement-breakpoint

ALTER TABLE "appointment_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "appointment_requests" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "appointment_requests_tenant_isolation" ON "appointment_requests"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);--> statement-breakpoint

ALTER TABLE "meeting_minutes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "meeting_minutes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "meeting_minutes_tenant_isolation" ON "meeting_minutes"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);--> statement-breakpoint

ALTER TABLE "saved_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "saved_reports" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "saved_reports_tenant_isolation" ON "saved_reports"
  USING ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK ("church_id" = nullif(current_setting('app.church_id', true), '')::uuid);
