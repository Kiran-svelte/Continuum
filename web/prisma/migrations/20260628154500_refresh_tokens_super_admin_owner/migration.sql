-- Allow refresh tokens to be revocable for both tenant employees and platform super admins.

ALTER TABLE "RefreshToken"
  ADD COLUMN "super_admin_id" TEXT;

ALTER TABLE "RefreshToken"
  ALTER COLUMN "employee_id" DROP NOT NULL;

ALTER TABLE "RefreshToken"
  ADD CONSTRAINT "RefreshToken_super_admin_id_fkey"
  FOREIGN KEY ("super_admin_id") REFERENCES "SuperAdmin"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefreshToken"
  ADD CONSTRAINT "RefreshToken_exactly_one_owner_chk"
  CHECK (
    ("employee_id" IS NOT NULL AND "super_admin_id" IS NULL)
    OR
    ("employee_id" IS NULL AND "super_admin_id" IS NOT NULL)
  );

CREATE INDEX "RefreshToken_super_admin_id_idx" ON "RefreshToken"("super_admin_id");
