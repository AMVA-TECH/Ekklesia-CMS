ALTER TABLE "attendance_correction_requests" ADD COLUMN "requested_presence" text DEFAULT 'present' NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_correction_requests" ADD COLUMN "resolution_note" text;--> statement-breakpoint
ALTER TABLE "attendance_correction_requests" ADD COLUMN "resolved_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "attendance_correction_requests" ADD COLUMN "resolved_at" timestamp with time zone;
