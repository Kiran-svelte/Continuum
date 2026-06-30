-- RALPH-20260630-019: Overtime Requests
CREATE TABLE "OvertimeRequest" (
  "id"          TEXT NOT NULL,
  "company_id"  TEXT NOT NULL,
  "emp_id"      TEXT NOT NULL,
  "date"        TIMESTAMP(3) NOT NULL,
  "hours"       DOUBLE PRECISION NOT NULL,
  "reason"      TEXT,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "payout_type" TEXT NOT NULL DEFAULT 'compensatory',
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OvertimeRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OvertimeRequest_emp_id_date_key" ON "OvertimeRequest"("emp_id", "date");
CREATE INDEX "OvertimeRequest_company_id_idx" ON "OvertimeRequest"("company_id");
CREATE INDEX "OvertimeRequest_emp_id_idx" ON "OvertimeRequest"("emp_id");

ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE;
ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE;

-- RALPH-20260630-020: Schedule Templates
CREATE TABLE "ScheduleTemplate" (
  "id"          TEXT NOT NULL,
  "company_id"  TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "type"        TEXT NOT NULL DEFAULT 'weekly',
  "rules"       JSONB NOT NULL DEFAULT '[]',
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_by"  TEXT NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduleTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduleTemplate_company_id_idx" ON "ScheduleTemplate"("company_id");
ALTER TABLE "ScheduleTemplate" ADD CONSTRAINT "ScheduleTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE;
