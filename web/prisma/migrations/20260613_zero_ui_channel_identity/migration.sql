-- Zero UI channel identity migration (L5-03-001)
-- Migration: 20260613_zero_ui_channel_identity

CREATE TABLE IF NOT EXISTS "ChannelIdentityLink" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "company_id" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "employee_id" TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
  "channel" VARCHAR(32) NOT NULL,
  "external_id" VARCHAR(32) NOT NULL,
  "phone_e164" VARCHAR(20) NOT NULL,
  "verified_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "revoke_reason" VARCHAR(64),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ChannelIdentityLink_company_id_channel_external_id_key" UNIQUE ("company_id", "channel", "external_id")
);

CREATE INDEX IF NOT EXISTS "ChannelIdentityLink_company_id_employee_id_idx"
  ON "ChannelIdentityLink" ("company_id", "employee_id");

CREATE TABLE IF NOT EXISTS "ChannelVerificationChallenge" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "company_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "channel" VARCHAR(32) NOT NULL,
  "phone_e164" VARCHAR(20) NOT NULL,
  "code_hash" TEXT NOT NULL,
  "attempts" INT NOT NULL DEFAULT 0,
  "max_attempts" INT NOT NULL DEFAULT 3,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "consumed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ChannelVerificationChallenge_company_id_employee_id_channel_idx"
  ON "ChannelVerificationChallenge" ("company_id", "employee_id", "channel");

CREATE INDEX IF NOT EXISTS "ChannelVerificationChallenge_expires_at_idx"
  ON "ChannelVerificationChallenge" ("expires_at");

CREATE TABLE IF NOT EXISTS "WhatsAppTenantConfig" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "company_id" TEXT NOT NULL UNIQUE REFERENCES "Company"("id") ON DELETE CASCADE,
  "phone_number_id" VARCHAR(32) NOT NULL UNIQUE,
  "waba_id" VARCHAR(64),
  "access_token_enc" TEXT NOT NULL,
  "messaging_enabled" BOOLEAN NOT NULL DEFAULT true,
  "connected_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "WhatsAppTenantConfig_company_id_idx"
  ON "WhatsAppTenantConfig" ("company_id");

CREATE TABLE IF NOT EXISTS "IdempotencyRecord" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "company_id" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "employee_id" TEXT NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "response_json" JSONB NOT NULL,
  "http_status" INT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "IdempotencyRecord_company_id_employee_id_idempotency_key_key"
    UNIQUE ("company_id", "employee_id", "idempotency_key")
);

CREATE INDEX IF NOT EXISTS "IdempotencyRecord_company_id_idx" ON "IdempotencyRecord" ("company_id");
CREATE INDEX IF NOT EXISTS "IdempotencyRecord_expires_at_idx" ON "IdempotencyRecord" ("expires_at");

CREATE TABLE IF NOT EXISTS "AssistantConversation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "company_id" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "employee_id" TEXT NOT NULL,
  "channel" VARCHAR(32) NOT NULL,
  "draft_json" JSONB,
  "draft_expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "AssistantConversation_company_id_employee_id_channel_key"
    UNIQUE ("company_id", "employee_id", "channel")
);

CREATE INDEX IF NOT EXISTS "AssistantConversation_company_id_employee_id_idx"
  ON "AssistantConversation" ("company_id", "employee_id");

CREATE TABLE IF NOT EXISTS "AssistantMessageRecord" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "conversation_id" TEXT NOT NULL REFERENCES "AssistantConversation"("id") ON DELETE CASCADE,
  "company_id" TEXT NOT NULL,
  "role" VARCHAR(16) NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "AssistantMessageRecord_conversation_id_idx"
  ON "AssistantMessageRecord" ("conversation_id");

CREATE TABLE IF NOT EXISTS "ChannelBlocklist" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "company_id" TEXT NOT NULL,
  "channel" VARCHAR(32) NOT NULL,
  "external_id" VARCHAR(32) NOT NULL,
  "reason" VARCHAR(128),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ChannelBlocklist_company_id_channel_external_id_key"
    UNIQUE ("company_id", "channel", "external_id")
);
