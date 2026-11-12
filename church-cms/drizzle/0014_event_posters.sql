ALTER TABLE "events" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "poster_media_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_poster_media_id_media_assets_id_fk" FOREIGN KEY ("poster_media_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;
