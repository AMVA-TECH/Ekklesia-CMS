-- Expense payment account for auto journal on approve
ALTER TABLE "expenses" ADD COLUMN "payment_account_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "fund_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_payment_account_id_accounts_id_fk" FOREIGN KEY ("payment_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_fund_id_funds_id_fk" FOREIGN KEY ("fund_id") REFERENCES "public"."funds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Soft-revoke QR tokens
ALTER TABLE "session_qr_tokens" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "session_qr_tokens_token_hash_uidx" ON "session_qr_tokens" USING btree ("token_hash");
