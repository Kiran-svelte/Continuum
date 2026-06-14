-- AlterTable
ALTER TABLE "TravelRequest" ADD COLUMN "current_approver_id" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "current_approver_id" TEXT;

-- AlterTable
ALTER TABLE "Reimbursement" ADD COLUMN "current_approver_id" TEXT;

-- CreateIndex
CREATE INDEX "TravelRequest_current_approver_id_idx" ON "TravelRequest"("current_approver_id");

-- CreateIndex
CREATE INDEX "TravelRequest_company_id_status_current_approver_id_idx" ON "TravelRequest"("company_id", "status", "current_approver_id");

-- CreateIndex
CREATE INDEX "Expense_current_approver_id_idx" ON "Expense"("current_approver_id");

-- CreateIndex
CREATE INDEX "Expense_company_id_status_current_approver_id_idx" ON "Expense"("company_id", "status", "current_approver_id");

-- CreateIndex
CREATE INDEX "Reimbursement_current_approver_id_idx" ON "Reimbursement"("current_approver_id");

-- CreateIndex
CREATE INDEX "Reimbursement_company_id_status_current_approver_id_idx" ON "Reimbursement"("company_id", "status", "current_approver_id");
