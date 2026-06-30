-- RALPH-20260630-011: Advance & Loans
CREATE TYPE "LoanStatus" AS ENUM ('pending', 'approved', 'rejected', 'disbursed', 'closed');

CREATE TABLE "Loan" (
  "id"           TEXT NOT NULL,
  "company_id"   TEXT NOT NULL,
  "emp_id"       TEXT NOT NULL,
  "amount"       DOUBLE PRECISION NOT NULL,
  "purpose"      TEXT NOT NULL,
  "installments" INTEGER NOT NULL DEFAULT 1,
  "emi_amount"   DOUBLE PRECISION,
  "disbursed_at" TIMESTAMP(3),
  "status"       "LoanStatus" NOT NULL DEFAULT 'pending',
  "approved_by"  TEXT,
  "notes"        TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Loan_company_id_idx" ON "Loan"("company_id");
CREATE INDEX "Loan_emp_id_idx" ON "Loan"("emp_id");

ALTER TABLE "Loan" ADD CONSTRAINT "Loan_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE;
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE;

-- RALPH-20260630-012: Benefits Administration
CREATE TABLE "BenefitPlan" (
  "id"          TEXT NOT NULL,
  "company_id"  TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "type"        TEXT NOT NULL,
  "provider"    TEXT,
  "coverage"    JSONB NOT NULL DEFAULT '{}',
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BenefitPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BenefitPlan_company_id_idx" ON "BenefitPlan"("company_id");
ALTER TABLE "BenefitPlan" ADD CONSTRAINT "BenefitPlan_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE;

CREATE TABLE "BenefitEnrollment" (
  "id"          TEXT NOT NULL,
  "company_id"  TEXT NOT NULL,
  "emp_id"      TEXT NOT NULL,
  "plan_id"     TEXT NOT NULL,
  "start_date"  TIMESTAMP(3) NOT NULL,
  "end_date"    TIMESTAMP(3),
  "status"      TEXT NOT NULL DEFAULT 'active',
  "notes"       TEXT,
  "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BenefitEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BenefitEnrollment_emp_id_plan_id_key" ON "BenefitEnrollment"("emp_id", "plan_id");
CREATE INDEX "BenefitEnrollment_company_id_idx" ON "BenefitEnrollment"("company_id");
CREATE INDEX "BenefitEnrollment_emp_id_idx" ON "BenefitEnrollment"("emp_id");

ALTER TABLE "BenefitEnrollment" ADD CONSTRAINT "BenefitEnrollment_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE;
ALTER TABLE "BenefitEnrollment" ADD CONSTRAINT "BenefitEnrollment_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "BenefitPlan"("id") ON DELETE CASCADE;

-- RALPH-20260630-013: Succession Planning
CREATE TABLE "SuccessionPlan" (
  "id"             TEXT NOT NULL,
  "company_id"     TEXT NOT NULL,
  "role_title"     TEXT NOT NULL,
  "current_emp_id" TEXT,
  "candidates"     JSONB NOT NULL DEFAULT '[]',
  "priority"       INTEGER NOT NULL DEFAULT 2,
  "status"         TEXT NOT NULL DEFAULT 'active',
  "notes"          TEXT,
  "created_by"     TEXT NOT NULL,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SuccessionPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SuccessionPlan_company_id_idx" ON "SuccessionPlan"("company_id");
ALTER TABLE "SuccessionPlan" ADD CONSTRAINT "SuccessionPlan_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE;
