CREATE TABLE "church_join_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"phone_e164" text,
	"preferred_locale" text DEFAULT 'sw' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_by_user_id" uuid,
	"decided_at" timestamp with time zone,
	"decision_reason" text,
	"person_id" uuid,
	"user_account_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "church_join_requests" ADD CONSTRAINT "church_join_requests_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_join_requests" ADD CONSTRAINT "church_join_requests_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_join_requests" ADD CONSTRAINT "church_join_requests_user_account_id_user_accounts_id_fk" FOREIGN KEY ("user_account_id") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "church_join_requests_church_status_idx" ON "church_join_requests" USING btree ("church_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "church_join_requests_pending_email_uidx" ON "church_join_requests" USING btree ("church_id","email") WHERE "status" = 'pending' AND "email" IS NOT NULL AND "deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "church_join_requests_pending_phone_uidx" ON "church_join_requests" USING btree ("church_id","phone_e164") WHERE "status" = 'pending' AND "phone_e164" IS NOT NULL AND "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "church_join_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "church_join_requests" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "church_join_requests_tenant_isolation" ON "church_join_requests"
  USING (church_id = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK (church_id = nullif(current_setting('app.church_id', true), '')::uuid);
