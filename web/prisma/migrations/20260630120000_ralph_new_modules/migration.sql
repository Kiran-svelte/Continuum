-- RALPH-20260630-007: Surveys Module
-- RALPH-20260630-008: Announcements Module
-- RALPH-20260630-009: Skills & Competency Matrix
-- RALPH-20260630-010: Career Paths

CREATE TYPE "SurveyStatus" AS ENUM ('draft', 'active', 'closed');

CREATE TABLE IF NOT EXISTS "Survey" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "SurveyStatus" NOT NULL DEFAULT 'draft',
  "anonymous" BOOLEAN NOT NULL DEFAULT false,
  "start_date" TIMESTAMP(3),
  "end_date" TIMESTAMP(3),
  "target_dept" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SurveyQuestion" (
  "id" TEXT NOT NULL,
  "survey_id" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "options" JSONB,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SurveyResponse" (
  "id" TEXT NOT NULL,
  "survey_id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "emp_id" TEXT,
  "answer" TEXT,
  "rating" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Announcement" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'info',
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "target_dept" TEXT,
  "target_role" TEXT,
  "published_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Skill" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmployeeSkill" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "emp_id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  "proficiency" INTEGER NOT NULL DEFAULT 1,
  "endorsed_by" TEXT,
  "years_exp" DOUBLE PRECISION,
  "last_assessed" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmployeeSkill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CareerPath" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "emp_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "current_role" TEXT NOT NULL,
  "target_role" TEXT NOT NULL,
  "target_date" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'active',
  "milestones" JSONB NOT NULL DEFAULT '[]',
  "notes" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerPath_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "Survey_company_id_status_idx" ON "Survey"("company_id", "status");
CREATE INDEX IF NOT EXISTS "SurveyQuestion_survey_id_idx" ON "SurveyQuestion"("survey_id");
CREATE INDEX IF NOT EXISTS "SurveyResponse_survey_id_idx" ON "SurveyResponse"("survey_id");
CREATE UNIQUE INDEX IF NOT EXISTS "SurveyResponse_survey_id_question_id_emp_id_key" ON "SurveyResponse"("survey_id", "question_id", "emp_id");
CREATE INDEX IF NOT EXISTS "Announcement_company_id_published_at_idx" ON "Announcement"("company_id", "published_at");
CREATE INDEX IF NOT EXISTS "Announcement_company_id_pinned_idx" ON "Announcement"("company_id", "pinned");
CREATE UNIQUE INDEX IF NOT EXISTS "Skill_company_id_name_key" ON "Skill"("company_id", "name");
CREATE INDEX IF NOT EXISTS "Skill_company_id_idx" ON "Skill"("company_id");
CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeSkill_emp_id_skill_id_key" ON "EmployeeSkill"("emp_id", "skill_id");
CREATE INDEX IF NOT EXISTS "EmployeeSkill_company_id_emp_id_idx" ON "EmployeeSkill"("company_id", "emp_id");
CREATE INDEX IF NOT EXISTS "CareerPath_company_id_emp_id_idx" ON "CareerPath"("company_id", "emp_id");

-- Foreign Keys
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "SurveyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerPath" ADD CONSTRAINT "CareerPath_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
