-- RALPH-20260630-015: Tax Declarations
CREATE TABLE "TaxDeclaration" (
  "id"             TEXT NOT NULL,
  "company_id"     TEXT NOT NULL,
  "emp_id"         TEXT NOT NULL,
  "fiscal_year"    TEXT NOT NULL,
  "regime"         TEXT NOT NULL DEFAULT 'new',
  "status"         TEXT NOT NULL DEFAULT 'draft',
  "sections"       JSONB NOT NULL DEFAULT '{}',
  "total_declared" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "approved_by"    TEXT,
  "notes"          TEXT,
  "submitted_at"   TIMESTAMP(3),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaxDeclaration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaxDeclaration_emp_id_fiscal_year_key" ON "TaxDeclaration"("emp_id", "fiscal_year");
CREATE INDEX "TaxDeclaration_company_id_idx" ON "TaxDeclaration"("company_id");
CREATE INDEX "TaxDeclaration_emp_id_idx" ON "TaxDeclaration"("emp_id");

ALTER TABLE "TaxDeclaration" ADD CONSTRAINT "TaxDeclaration_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE;
ALTER TABLE "TaxDeclaration" ADD CONSTRAINT "TaxDeclaration_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE;

-- RALPH-20260630-016: Policy Management
CREATE TABLE "Policy" (
  "id"           TEXT NOT NULL,
  "company_id"   TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "category"     TEXT NOT NULL,
  "description"  TEXT,
  "content"      TEXT NOT NULL,
  "version"      TEXT NOT NULL DEFAULT '1.0',
  "is_active"    BOOLEAN NOT NULL DEFAULT true,
  "requires_ack" BOOLEAN NOT NULL DEFAULT false,
  "published_at" TIMESTAMP(3),
  "expires_at"   TIMESTAMP(3),
  "created_by"   TEXT NOT NULL,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Policy_company_id_idx" ON "Policy"("company_id");
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE;

CREATE TABLE "PolicyAck" (
  "id"         TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "policy_id"  TEXT NOT NULL,
  "emp_id"     TEXT NOT NULL,
  "acked_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PolicyAck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PolicyAck_policy_id_emp_id_key" ON "PolicyAck"("policy_id", "emp_id");
CREATE INDEX "PolicyAck_company_id_idx" ON "PolicyAck"("company_id");
CREATE INDEX "PolicyAck_emp_id_idx" ON "PolicyAck"("emp_id");

ALTER TABLE "PolicyAck" ADD CONSTRAINT "PolicyAck_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "Policy"("id") ON DELETE CASCADE;
ALTER TABLE "PolicyAck" ADD CONSTRAINT "PolicyAck_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE;
