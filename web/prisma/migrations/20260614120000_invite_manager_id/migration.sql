-- Persist reporting manager on invite records for production provisioning.
ALTER TABLE "UserInvite" ADD COLUMN IF NOT EXISTS "manager_id" TEXT;
ALTER TABLE "EmployeeInvite" ADD COLUMN IF NOT EXISTS "manager_id" TEXT;

CREATE INDEX IF NOT EXISTS "UserInvite_manager_id_idx" ON "UserInvite"("manager_id");
CREATE INDEX IF NOT EXISTS "EmployeeInvite_manager_id_idx" ON "EmployeeInvite"("manager_id");
