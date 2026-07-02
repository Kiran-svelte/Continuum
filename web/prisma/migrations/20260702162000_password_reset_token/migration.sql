-- MAILFIX-20260702: Password reset delivery requires a durable one-time token table.
-- Production had the Prisma model but not the table because the baseline was pre-existing.

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "is_used" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_hash_key"
  ON "PasswordResetToken"("token_hash");

CREATE INDEX IF NOT EXISTS "PasswordResetToken_email_idx"
  ON "PasswordResetToken"("email");

CREATE INDEX IF NOT EXISTS "PasswordResetToken_expires_at_idx"
  ON "PasswordResetToken"("expires_at");
