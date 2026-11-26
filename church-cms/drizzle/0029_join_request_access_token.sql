ALTER TABLE "church_join_requests"
  ADD COLUMN IF NOT EXISTS "applicant_access_token_hash" text;
