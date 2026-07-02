-- Add module_cap field to UserInvite so super admin can pre-configure
-- allowed modules when sending an invite (before the company is created).
-- This is applied during onboarding company creation.

ALTER TABLE "UserInvite" ADD COLUMN IF NOT EXISTS "module_cap" JSONB;
