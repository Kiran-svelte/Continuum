-- CreateEnum
CREATE TYPE "PayrollAdvanceStatus" AS ENUM ('pending', 'approved', 'rejected', 'processed', 'cancelled');

-- CreateTable
CREATE TABLE "PayrollAdvance" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "reason" TEXT,
    "repayment_months" INTEGER NOT NULL DEFAULT 1,
    "status" "PayrollAdvanceStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "current_approver_id" TEXT,
    "rejection_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "PayrollAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollAdvance_company_id_idx" ON "PayrollAdvance"("company_id");

-- CreateIndex
CREATE INDEX "PayrollAdvance_emp_id_idx" ON "PayrollAdvance"("emp_id");

-- CreateIndex
CREATE INDEX "PayrollAdvance_current_approver_id_idx" ON "PayrollAdvance"("current_approver_id");

-- CreateIndex
CREATE INDEX "PayrollAdvance_company_id_status_current_approver_id_idx" ON "PayrollAdvance"("company_id", "status", "current_approver_id");

-- AddForeignKey
ALTER TABLE "PayrollAdvance" ADD CONSTRAINT "PayrollAdvance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdvance" ADD CONSTRAINT "PayrollAdvance_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdvance" ADD CONSTRAINT "PayrollAdvance_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdvance" ADD CONSTRAINT "PayrollAdvance_current_approver_id_fkey" FOREIGN KEY ("current_approver_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
