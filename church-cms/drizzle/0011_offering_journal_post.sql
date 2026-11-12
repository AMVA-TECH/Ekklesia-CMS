-- Offering GL accounts for income journal post
ALTER TABLE "offerings" ADD COLUMN "income_account_id" uuid;--> statement-breakpoint
ALTER TABLE "offerings" ADD COLUMN "deposit_account_id" uuid;--> statement-breakpoint
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_income_account_id_accounts_id_fk" FOREIGN KEY ("income_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_deposit_account_id_accounts_id_fk" FOREIGN KEY ("deposit_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
