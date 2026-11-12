-- Leadership text blasts: custom body + unit audience on message_jobs.
ALTER TABLE "message_jobs" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "message_jobs" ADD COLUMN "body" text;--> statement-breakpoint
ALTER TABLE "message_jobs" ADD COLUMN "organisational_unit_id" uuid;--> statement-breakpoint
ALTER TABLE "message_jobs" ADD CONSTRAINT "message_jobs_organisational_unit_id_organisational_units_id_fk" FOREIGN KEY ("organisational_unit_id") REFERENCES "public"."organisational_units"("id") ON DELETE no action ON UPDATE no action;
