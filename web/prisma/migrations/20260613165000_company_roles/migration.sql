ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "company_role_id" TEXT;

CREATE TABLE IF NOT EXISTS "CompanyRole" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "base_role" "Role",
  "description" TEXT,
  "color" TEXT,
  "authority_level" INTEGER NOT NULL DEFAULT 100,
  "reports_to_id" TEXT,
  "is_owner_role" BOOLEAN NOT NULL DEFAULT false,
  "can_create_users" BOOLEAN NOT NULL DEFAULT false,
  "can_create_roles" JSONB NOT NULL DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CompanyRolePermission" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "company_role_id" TEXT NOT NULL,
  "permission_id" TEXT NOT NULL,
  "granted" BOOLEAN NOT NULL DEFAULT true,
  "scope" TEXT NOT NULL DEFAULT 'all',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyRolePermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompanyRole_company_id_slug_key" ON "CompanyRole"("company_id", "slug");
CREATE INDEX IF NOT EXISTS "CompanyRole_company_id_idx" ON "CompanyRole"("company_id");
CREATE INDEX IF NOT EXISTS "CompanyRole_reports_to_id_idx" ON "CompanyRole"("reports_to_id");
CREATE INDEX IF NOT EXISTS "CompanyRole_base_role_idx" ON "CompanyRole"("base_role");
CREATE INDEX IF NOT EXISTS "Employee_company_role_id_idx" ON "Employee"("company_role_id");
CREATE UNIQUE INDEX IF NOT EXISTS "CompanyRolePermission_company_role_id_permission_id_key" ON "CompanyRolePermission"("company_role_id", "permission_id");
CREATE INDEX IF NOT EXISTS "CompanyRolePermission_company_id_idx" ON "CompanyRolePermission"("company_id");
CREATE INDEX IF NOT EXISTS "CompanyRolePermission_company_role_id_idx" ON "CompanyRolePermission"("company_role_id");
CREATE INDEX IF NOT EXISTS "CompanyRolePermission_permission_id_idx" ON "CompanyRolePermission"("permission_id");

DO $$
BEGIN
  ALTER TABLE "Employee"
    ADD CONSTRAINT "Employee_company_role_id_fkey"
    FOREIGN KEY ("company_role_id") REFERENCES "CompanyRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "CompanyRole"
    ADD CONSTRAINT "CompanyRole_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "CompanyRole"
    ADD CONSTRAINT "CompanyRole_reports_to_id_fkey"
    FOREIGN KEY ("reports_to_id") REFERENCES "CompanyRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "CompanyRolePermission"
    ADD CONSTRAINT "CompanyRolePermission_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "CompanyRolePermission"
    ADD CONSTRAINT "CompanyRolePermission_company_role_id_fkey"
    FOREIGN KEY ("company_role_id") REFERENCES "CompanyRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "CompanyRolePermission"
    ADD CONSTRAINT "CompanyRolePermission_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
