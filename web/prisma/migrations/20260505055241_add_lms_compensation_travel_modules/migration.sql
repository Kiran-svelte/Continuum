-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'half_day', 'late', 'on_leave', 'holiday', 'weekend');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('pending', 'verified', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('onboarding', 'probation', 'active', 'on_notice', 'suspended', 'resigned', 'terminated', 'exited');

-- CreateEnum
CREATE TYPE "EncashmentStatus" AS ENUM ('pending', 'approved', 'processed', 'rejected');

-- CreateEnum
CREATE TYPE "ExitChecklistStatus" AS ENUM ('not_started', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "GenderFilter" AS ENUM ('male', 'female', 'all');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('minor', 'major', 'critical');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('investigating', 'identified', 'monitoring', 'resolved');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "LeaveCategory" AS ENUM ('common', 'statutory', 'special', 'unpaid');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('draft', 'pending', 'approved', 'rejected', 'cancelled', 'escalated');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('transfer', 'promotion', 'role_change', 'department_change');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'push', 'in_app');

-- CreateEnum
CREATE TYPE "OrgUnitType" AS ENUM ('department', 'division', 'team', 'branch');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('draft', 'generated', 'under_review', 'approved', 'processed', 'paid', 'rejected');

-- CreateEnum
CREATE TYPE "RegularizationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ReimbursementStatus" AS ENUM ('pending', 'approved', 'rejected', 'processed');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('super_admin', 'admin', 'hr', 'director', 'manager', 'team_lead', 'employee');

-- CreateEnum
CREATE TYPE "RuleCategory" AS ENUM ('validation', 'business', 'compliance');

-- CreateEnum
CREATE TYPE "SalaryComponentType" AS ENUM ('earning', 'deduction', 'statutory');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('free', 'starter', 'growth', 'enterprise');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'cancelled', 'expired', 'trial');

-- CreateEnum
CREATE TYPE "WorkflowApproverType" AS ENUM ('reporting_manager', 'role', 'specific_user', 'hr_partner');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('pending', 'in_progress', 'approved', 'rejected', 'cancelled', 'escalated');

-- CreateEnum
CREATE TYPE "WorkflowActionType" AS ENUM ('approve', 'reject', 'escalate', 'return_to_sender', 'delegate', 'comment');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'dead_letter');

-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('old_regime', 'new_regime');

-- CreateEnum
CREATE TYPE "GoalCategory" AS ENUM ('company', 'department', 'team', 'individual');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('percentage', 'number', 'currency', 'boolean');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('not_started', 'in_progress', 'completed', 'cancelled', 'deferred');

-- CreateEnum
CREATE TYPE "ReviewCycleType" AS ENUM ('quarterly', 'half_yearly', 'annual', 'custom');

-- CreateEnum
CREATE TYPE "ReviewCycleStatus" AS ENUM ('draft', 'active', 'self_review', 'manager_review', 'calibration', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('self', 'manager', 'peer', 'direct_report', 'skip_level');

-- CreateEnum
CREATE TYPE "ReviewInstanceStatus" AS ENUM ('pending', 'in_progress', 'submitted', 'acknowledged', 'disputed');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('full_time', 'part_time', 'contract', 'intern', 'freelance');

-- CreateEnum
CREATE TYPE "JobPostingStatus" AS ENUM ('draft', 'published', 'paused', 'closed', 'filled');

-- CreateEnum
CREATE TYPE "ApplicationSource" AS ENUM ('direct', 'referral', 'job_board', 'social_media', 'agency', 'campus');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('applied', 'screening', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('screening', 'phone_screen', 'technical', 'interview', 'assignment', 'cultural_fit', 'hr_round', 'final');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "InterviewRecommendation" AS ENUM ('strong_hire', 'hire', 'neutral', 'no_hire', 'strong_no_hire');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'sent', 'accepted', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "CourseContentType" AS ENUM ('video', 'document', 'quiz', 'scorm', 'link');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('not_started', 'in_progress', 'completed', 'failed', 'expired');

-- CreateEnum
CREATE TYPE "CompensationCycleStatus" AS ENUM ('planning', 'active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "CompensationRecoStatus" AS ENUM ('pending', 'approved', 'rejected', 'finalized');

-- CreateEnum
CREATE TYPE "TravelRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('pending', 'approved', 'rejected', 'processed');

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "permissions" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalHierarchy" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "level1_approver" TEXT,
    "level2_approver" TEXT,
    "level3_approver" TEXT,
    "level4_approver" TEXT,
    "hr_partner" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalHierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'present',
    "is_wfh" BOOLEAN NOT NULL DEFAULT false,
    "total_hours" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRegularization" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "attendance_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RegularizationStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRegularization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "previous_state" JSONB,
    "new_state" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "integrity_hash" TEXT NOT NULL,
    "prev_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "join_code" TEXT,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "negative_balance" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "work_start" TEXT NOT NULL DEFAULT '09:00',
    "work_end" TEXT NOT NULL DEFAULT '18:00',
    "work_days" JSONB NOT NULL DEFAULT '[1, 2, 3, 4, 5]',
    "grace_period_minutes" INTEGER NOT NULL DEFAULT 15,
    "half_day_hours" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "leave_year_start" TEXT NOT NULL DEFAULT '01-01',
    "probation_period_days" INTEGER NOT NULL DEFAULT 180,
    "notice_period_days" INTEGER NOT NULL DEFAULT 90,
    "sla_hours" INTEGER NOT NULL DEFAULT 48,
    "enabled_roles" JSONB NOT NULL DEFAULT '["admin", "hr", "manager", "employee"]',
    "requires_hr" BOOLEAN NOT NULL DEFAULT true,
    "requires_manager" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyRole" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "authority_level" INTEGER NOT NULL DEFAULT 50,
    "base_role" "Role",
    "is_owner_role" BOOLEAN NOT NULL DEFAULT false,
    "reports_to_id" TEXT,
    "can_create_users" BOOLEAN NOT NULL DEFAULT false,
    "can_create_roles" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyRolePermission" (
    "id" TEXT NOT NULL,
    "company_role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "scope" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "custom_holidays" JSONB,
    "check_in_reminders" JSONB,
    "check_out_reminders" JSONB,
    "email_notifications" JSONB,
    "hr_alerts" JSONB,
    "hierarchy_policy" JSONB,
    "portal_policy" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConstraintPolicy" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "rules" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConstraintPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'pending',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "auth_id" TEXT,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "org_id" TEXT,
    "primary_role" "Role" NOT NULL DEFAULT 'employee',
    "secondary_roles" JSONB,
    "department" TEXT,
    "designation" TEXT,
    "date_of_joining" TIMESTAMP(3),
    "gender" "Gender",
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'onboarding',
    "probation_end_date" TIMESTAMP(3),
    "probation_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "notice_period_days" INTEGER,
    "resignation_date" TIMESTAMP(3),
    "last_working_date" TIMESTAMP(3),
    "manager_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "password_hash" TEXT,
    "invited_by_id" TEXT,
    "invited_by_type" TEXT,
    "invite_accepted_at" TIMESTAMP(3),
    "tutorial_completed" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3),
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "emergency_contact_relationship" TEXT,
    "bank_name" TEXT,
    "bank_account_number" TEXT,
    "ifsc_code" TEXT,
    "current_address" TEXT,
    "personal_email" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "blood_group" TEXT,
    "pan_number" TEXT,
    "employee_id" TEXT,
    "notification_preferences" JSONB,
    "company_role_id" TEXT,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeInvite" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'employee',
    "department" TEXT,
    "manager_id" TEXT,
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeMovement" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "from_value" TEXT NOT NULL,
    "to_value" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeShift" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeStatusHistory" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "changed_by" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExitChecklist" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "custom_items" JSONB,
    "status" "ExitChecklistStatus" NOT NULL DEFAULT 'not_started',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExitChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLevel" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "leave_type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "annual_entitlement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carried_forward" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "used_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pending_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "encashed_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveEncashment" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "leave_type" TEXT NOT NULL,
    "days" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "EncashmentStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveEncashment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "leave_type" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "total_days" DOUBLE PRECISION NOT NULL,
    "is_half_day" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'draft',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "approver_comments" TEXT,
    "cancel_reason" TEXT,
    "attachment_url" TEXT,
    "sla_deadline" TIMESTAMP(3),
    "sla_breached" BOOLEAN NOT NULL DEFAULT false,
    "escalation_count" INTEGER NOT NULL DEFAULT 0,
    "approval_level" INTEGER NOT NULL DEFAULT 0,
    "approval_trail" JSONB,
    "current_approver_id" TEXT,
    "constraint_result" JSONB,
    "ai_recommendation" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRule" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "RuleCategory" NOT NULL,
    "is_blocking" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "applies_to_all" BOOLEAN NOT NULL DEFAULT true,
    "departments" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "LeaveRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "LeaveCategory" NOT NULL,
    "default_quota" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carry_forward" BOOLEAN NOT NULL DEFAULT false,
    "max_carry_forward" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "encashment_enabled" BOOLEAN NOT NULL DEFAULT false,
    "encashment_max_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paid" BOOLEAN NOT NULL DEFAULT true,
    "gender_specific" "GenderFilter",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "channel" "NotificationChannel" NOT NULL DEFAULT 'in_app',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_timing" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUnit" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgUnitType" NOT NULL,
    "parent_id" TEXT,
    "head_id" TEXT,
    "cost_center" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "OrganizationUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpToken" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "razorpay_payment_id" TEXT,
    "razorpay_order_id" TEXT,
    "razorpay_signature" TEXT,
    "stripe_payment_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'draft',
    "total_gross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_net" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_pf" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_esi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_tds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "employee_count" INTEGER NOT NULL DEFAULT 0,
    "generated_by" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollSlip" (
    "id" TEXT NOT NULL,
    "payroll_run_id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "basic" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "da" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "special_allowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pf_employee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pf_employer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esi_employee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esi_employer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "professional_tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lop_deduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net_pay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "working_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "present_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leave_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "absent_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollSlip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformStats" (
    "id" TEXT NOT NULL,
    "total_companies" INTEGER NOT NULL DEFAULT 0,
    "total_employees" INTEGER NOT NULL DEFAULT 0,
    "total_leaves_processed" INTEGER NOT NULL DEFAULT 0,
    "uptime_percentage" DOUBLE PRECISION NOT NULL DEFAULT 99.9,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "price_monthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price_annual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "features" JSONB NOT NULL,
    "employee_limit" INTEGER NOT NULL DEFAULT 0,
    "hr_limit" INTEGER NOT NULL DEFAULT 0,
    "api_rate_limit" INTEGER NOT NULL DEFAULT 0,
    "data_retention_years" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicHoliday" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "device_info" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reimbursement" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "receipt_url" TEXT,
    "status" "ReimbursementStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reimbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permission_id" TEXT NOT NULL,
    "company_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleTemplate" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "base_role" "Role" NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "excluded_permissions" JSONB,
    "approval_level" INTEGER,
    "can_approve_leaves" BOOLEAN NOT NULL DEFAULT false,
    "can_create_users" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryComponent" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SalaryComponentType" NOT NULL,
    "is_taxable" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryRevision" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "old_ctc" DOUBLE PRECISION NOT NULL,
    "new_ctc" DOUBLE PRECISION NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryStructure" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "ctc" DOUBLE PRECISION NOT NULL,
    "basic" DOUBLE PRECISION NOT NULL,
    "hra" DOUBLE PRECISION NOT NULL,
    "da" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "special_allowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pf_employee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pf_employer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esi_employee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esi_employer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "professional_tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "device_info" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettingsAuditLog" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "setting_name" TEXT NOT NULL,
    "previous_value" JSONB,
    "new_value" JSONB,
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettingsAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'free',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trial',
    "razorpay_subscription_id" TEXT,
    "stripe_subscription_id" TEXT,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemIncident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'investigating',
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'minor',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorialProgress" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorialProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UptimeRecord" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "response_time_ms" DOUBLE PRECISION NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UptimeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "company_id" TEXT,
    "invited_by_id" TEXT,
    "invited_by_super_id" TEXT,
    "manager_id" TEXT,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "department" TEXT,
    "designation" TEXT,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTemplate" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entity_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "approver_type" "WorkflowApproverType" NOT NULL,
    "approver_role" "Role",
    "approver_id" TEXT,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "timeout_hours" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowInstance" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "initiated_by" TEXT NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'pending',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAction" (
    "id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "action" "WorkflowActionType" NOT NULL,
    "actor_id" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainEvent" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'pending',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollConfig" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "pf_employee_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.12,
    "pf_employer_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.12,
    "pf_wage_ceiling" INTEGER NOT NULL DEFAULT 1500000,
    "esi_employee_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.0075,
    "esi_employer_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.0325,
    "esi_threshold" INTEGER NOT NULL DEFAULT 2100000,
    "basic_percent_of_ctc" DOUBLE PRECISION NOT NULL DEFAULT 0.40,
    "hra_percent_of_basic" DOUBLE PRECISION NOT NULL DEFAULT 0.50,
    "da_percent_of_basic" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'maharashtra',
    "tax_regime" "TaxRegime" NOT NULL DEFAULT 'new_regime',
    "is_pf_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_esi_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_pt_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "GoalCategory" NOT NULL DEFAULT 'individual',
    "metric_type" "MetricType" NOT NULL DEFAULT 'percentage',
    "target_value" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "current_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "status" "GoalStatus" NOT NULL DEFAULT 'not_started',
    "parent_goal_id" TEXT,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCycle" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cycle_type" "ReviewCycleType" NOT NULL DEFAULT 'annual',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "self_review_deadline" TIMESTAMP(3),
    "manager_review_deadline" TIMESTAMP(3),
    "status" "ReviewCycleStatus" NOT NULL DEFAULT 'draft',
    "rating_scale" INTEGER NOT NULL DEFAULT 5,
    "is_calibration_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewTemplate" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sections" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewInstance" (
    "id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "reviewee_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "review_type" "ReviewType" NOT NULL DEFAULT 'manager',
    "status" "ReviewInstanceStatus" NOT NULL DEFAULT 'pending',
    "overall_rating" DOUBLE PRECISION,
    "self_rating" DOUBLE PRECISION,
    "strengths" TEXT,
    "improvements" TEXT,
    "manager_comments" TEXT,
    "employee_comments" TEXT,
    "submitted_at" TIMESTAMP(3),
    "acknowledged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewResponse" (
    "id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "question_index" INTEGER NOT NULL,
    "section_index" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION,
    "text_response" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competency" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "department" TEXT,
    "location" TEXT,
    "employment_type" "EmploymentType" NOT NULL DEFAULT 'full_time',
    "experience_min" INTEGER,
    "experience_max" INTEGER,
    "salary_min" DOUBLE PRECISION,
    "salary_max" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "skills" JSONB,
    "status" "JobPostingStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "closes_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "candidate_name" TEXT NOT NULL,
    "candidate_email" TEXT NOT NULL,
    "candidate_phone" TEXT,
    "resume_url" TEXT,
    "cover_letter" TEXT,
    "source" "ApplicationSource" NOT NULL DEFAULT 'direct',
    "referrer_id" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'applied',
    "current_stage" INTEGER NOT NULL DEFAULT 0,
    "overall_rating" DOUBLE PRECISION,
    "rejection_reason" TEXT,
    "hired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewStage" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage_order" INTEGER NOT NULL,
    "stage_type" "StageType" NOT NULL DEFAULT 'interview',
    "duration_minutes" INTEGER,
    "is_eliminatory" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "interviewer_id" TEXT NOT NULL,
    "stage_order" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" "InterviewStatus" NOT NULL DEFAULT 'scheduled',
    "rating" DOUBLE PRECISION,
    "feedback" TEXT,
    "recommendation" "InterviewRecommendation",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferLetter" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "department" TEXT,
    "ctc_offered" DOUBLE PRECISION NOT NULL,
    "joining_date" TIMESTAMP(3) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'draft',
    "offer_letter_url" TEXT,
    "sent_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePolicy" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "late_threshold_minutes" INTEGER NOT NULL DEFAULT 15,
    "half_day_threshold_minutes" INTEGER NOT NULL DEFAULT 240,
    "lates_for_half_day" INTEGER NOT NULL DEFAULT 3,
    "lates_for_absent" INTEGER NOT NULL DEFAULT 6,
    "overtime_enabled" BOOLEAN NOT NULL DEFAULT false,
    "overtime_rate_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "overtime_daily_cap_hours" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "overtime_weekly_cap_hours" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "auto_checkout_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_checkout_time" TEXT,
    "geo_fence_enabled" BOOLEAN NOT NULL DEFAULT false,
    "geo_fence_radius_meters" INTEGER,
    "geo_fence_latitude" DOUBLE PRECISION,
    "geo_fence_longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "content_type" "CourseContentType" NOT NULL DEFAULT 'document',
    "content_url" TEXT,
    "duration_minutes" INTEGER,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "department_scope" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'draft',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseEnrollment" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'not_started',
    "progress_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "due_date" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "courses" JSONB NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "department_scope" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompensationCycle" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "budget_total" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "effective_date" TIMESTAMP(3) NOT NULL,
    "status" "CompensationCycleStatus" NOT NULL DEFAULT 'planning',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompensationCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompensationRecommendation" (
    "id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "current_ctc" DOUBLE PRECISION NOT NULL,
    "recommended_ctc" DOUBLE PRECISION NOT NULL,
    "final_ctc" DOUBLE PRECISION,
    "increment_percent" DOUBLE PRECISION,
    "manager_comments" TEXT,
    "hr_comments" TEXT,
    "status" "CompensationRecoStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompensationRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelRequest" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departure_date" TIMESTAMP(3) NOT NULL,
    "return_date" TIMESTAMP(3) NOT NULL,
    "estimated_cost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "TravelRequestStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "TravelRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "travel_request_id" TEXT,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "description" TEXT,
    "receipt_url" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiKey_company_id_idx" ON "ApiKey"("company_id");

-- CreateIndex
CREATE INDEX "ApiKey_key_hash_idx" ON "ApiKey"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalHierarchy_emp_id_key" ON "ApprovalHierarchy"("emp_id");

-- CreateIndex
CREATE INDEX "ApprovalHierarchy_company_id_idx" ON "ApprovalHierarchy"("company_id");

-- CreateIndex
CREATE INDEX "Attendance_company_id_idx" ON "Attendance"("company_id");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_emp_id_idx" ON "Attendance"("emp_id");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_emp_id_date_key" ON "Attendance"("emp_id", "date");

-- CreateIndex
CREATE INDEX "AttendanceRegularization_company_id_idx" ON "AttendanceRegularization"("company_id");

-- CreateIndex
CREATE INDEX "AttendanceRegularization_emp_id_idx" ON "AttendanceRegularization"("emp_id");

-- CreateIndex
CREATE INDEX "AuditLog_actor_id_idx" ON "AuditLog"("actor_id");

-- CreateIndex
CREATE INDEX "AuditLog_company_id_idx" ON "AuditLog"("company_id");

-- CreateIndex
CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog"("created_at");

-- CreateIndex
CREATE INDEX "AuditLog_entity_type_entity_id_idx" ON "AuditLog"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "Company_join_code_key" ON "Company"("join_code");

-- CreateIndex
CREATE INDEX "Company_deleted_at_idx" ON "Company"("deleted_at");

-- CreateIndex
CREATE INDEX "CompanyRole_authority_level_idx" ON "CompanyRole"("authority_level");

-- CreateIndex
CREATE INDEX "CompanyRole_company_id_idx" ON "CompanyRole"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyRole_company_id_slug_key" ON "CompanyRole"("company_id", "slug");

-- CreateIndex
CREATE INDEX "CompanyRolePermission_company_role_id_idx" ON "CompanyRolePermission"("company_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyRolePermission_company_role_id_permission_id_key" ON "CompanyRolePermission"("company_role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_company_id_key" ON "CompanySettings"("company_id");

-- CreateIndex
CREATE INDEX "ConstraintPolicy_company_id_idx" ON "ConstraintPolicy"("company_id");

-- CreateIndex
CREATE INDEX "ConstraintPolicy_is_active_idx" ON "ConstraintPolicy"("is_active");

-- CreateIndex
CREATE INDEX "Document_company_id_idx" ON "Document"("company_id");

-- CreateIndex
CREATE INDEX "Document_emp_id_idx" ON "Document"("emp_id");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_auth_id_key" ON "Employee"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_company_role_id_idx" ON "Employee"("company_role_id");

-- CreateIndex
CREATE INDEX "Employee_deleted_at_idx" ON "Employee"("deleted_at");

-- CreateIndex
CREATE INDEX "Employee_email_idx" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_manager_id_idx" ON "Employee"("manager_id");

-- CreateIndex
CREATE INDEX "Employee_org_id_idx" ON "Employee"("org_id");

-- CreateIndex
CREATE INDEX "Employee_primary_role_idx" ON "Employee"("primary_role");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeInvite_token_key" ON "EmployeeInvite"("token");

-- CreateIndex
CREATE INDEX "EmployeeInvite_company_id_idx" ON "EmployeeInvite"("company_id");

-- CreateIndex
CREATE INDEX "EmployeeInvite_email_idx" ON "EmployeeInvite"("email");

-- CreateIndex
CREATE INDEX "EmployeeInvite_token_idx" ON "EmployeeInvite"("token");

-- CreateIndex
CREATE INDEX "EmployeeMovement_company_id_idx" ON "EmployeeMovement"("company_id");

-- CreateIndex
CREATE INDEX "EmployeeMovement_emp_id_idx" ON "EmployeeMovement"("emp_id");

-- CreateIndex
CREATE INDEX "EmployeeShift_company_id_idx" ON "EmployeeShift"("company_id");

-- CreateIndex
CREATE INDEX "EmployeeShift_emp_id_idx" ON "EmployeeShift"("emp_id");

-- CreateIndex
CREATE INDEX "EmployeeStatusHistory_company_id_idx" ON "EmployeeStatusHistory"("company_id");

-- CreateIndex
CREATE INDEX "EmployeeStatusHistory_emp_id_idx" ON "EmployeeStatusHistory"("emp_id");

-- CreateIndex
CREATE INDEX "ExitChecklist_company_id_idx" ON "ExitChecklist"("company_id");

-- CreateIndex
CREATE INDEX "ExitChecklist_emp_id_idx" ON "ExitChecklist"("emp_id");

-- CreateIndex
CREATE INDEX "JobLevel_company_id_idx" ON "JobLevel"("company_id");

-- CreateIndex
CREATE INDEX "LeaveBalance_company_id_idx" ON "LeaveBalance"("company_id");

-- CreateIndex
CREATE INDEX "LeaveBalance_emp_id_idx" ON "LeaveBalance"("emp_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_emp_id_leave_type_year_key" ON "LeaveBalance"("emp_id", "leave_type", "year");

-- CreateIndex
CREATE INDEX "LeaveEncashment_company_id_idx" ON "LeaveEncashment"("company_id");

-- CreateIndex
CREATE INDEX "LeaveEncashment_emp_id_idx" ON "LeaveEncashment"("emp_id");

-- CreateIndex
CREATE INDEX "LeaveRequest_company_id_idx" ON "LeaveRequest"("company_id");

-- CreateIndex
CREATE INDEX "LeaveRequest_created_at_idx" ON "LeaveRequest"("created_at");

-- CreateIndex
CREATE INDEX "LeaveRequest_emp_id_idx" ON "LeaveRequest"("emp_id");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");

-- CreateIndex
CREATE INDEX "LeaveRule_company_id_idx" ON "LeaveRule"("company_id");

-- CreateIndex
CREATE INDEX "LeaveRule_is_active_idx" ON "LeaveRule"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveRule_company_id_rule_id_key" ON "LeaveRule"("company_id", "rule_id");

-- CreateIndex
CREATE INDEX "LeaveType_company_id_idx" ON "LeaveType"("company_id");

-- CreateIndex
CREATE INDEX "LeaveType_is_active_idx" ON "LeaveType"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_company_id_code_key" ON "LeaveType"("company_id", "code");

-- CreateIndex
CREATE INDEX "Notification_company_id_idx" ON "Notification"("company_id");

-- CreateIndex
CREATE INDEX "Notification_created_at_idx" ON "Notification"("created_at");

-- CreateIndex
CREATE INDEX "Notification_emp_id_idx" ON "Notification"("emp_id");

-- CreateIndex
CREATE INDEX "Notification_is_read_idx" ON "Notification"("is_read");

-- CreateIndex
CREATE INDEX "NotificationPreference_company_id_idx" ON "NotificationPreference"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_emp_id_company_id_key" ON "NotificationPreference"("emp_id", "company_id");

-- CreateIndex
CREATE INDEX "NotificationTemplate_company_id_idx" ON "NotificationTemplate"("company_id");

-- CreateIndex
CREATE INDEX "OrganizationUnit_company_id_idx" ON "OrganizationUnit"("company_id");

-- CreateIndex
CREATE INDEX "OrganizationUnit_parent_id_idx" ON "OrganizationUnit"("parent_id");

-- CreateIndex
CREATE INDEX "OtpToken_company_id_idx" ON "OtpToken"("company_id");

-- CreateIndex
CREATE INDEX "OtpToken_emp_id_idx" ON "OtpToken"("emp_id");

-- CreateIndex
CREATE INDEX "OtpToken_expires_at_idx" ON "OtpToken"("expires_at");

-- CreateIndex
CREATE INDEX "Payment_company_id_idx" ON "Payment"("company_id");

-- CreateIndex
CREATE INDEX "Payment_subscription_id_idx" ON "Payment"("subscription_id");

-- CreateIndex
CREATE INDEX "Payment_razorpay_order_id_idx" ON "Payment"("razorpay_order_id");

-- CreateIndex
CREATE INDEX "PayrollRun_company_id_idx" ON "PayrollRun"("company_id");

-- CreateIndex
CREATE INDEX "PayrollRun_status_idx" ON "PayrollRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_company_id_month_year_key" ON "PayrollRun"("company_id", "month", "year");

-- CreateIndex
CREATE INDEX "PayrollSlip_company_id_idx" ON "PayrollSlip"("company_id");

-- CreateIndex
CREATE INDEX "PayrollSlip_emp_id_idx" ON "PayrollSlip"("emp_id");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollSlip_payroll_run_id_emp_id_key" ON "PayrollSlip"("payroll_run_id", "emp_id");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PricingPlan_slug_key" ON "PricingPlan"("slug");

-- CreateIndex
CREATE INDEX "PublicHoliday_company_id_idx" ON "PublicHoliday"("company_id");

-- CreateIndex
CREATE INDEX "PublicHoliday_country_code_idx" ON "PublicHoliday"("country_code");

-- CreateIndex
CREATE INDEX "PublicHoliday_date_idx" ON "PublicHoliday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_hash_key" ON "RefreshToken"("token_hash");

-- CreateIndex
CREATE INDEX "RefreshToken_employee_id_idx" ON "RefreshToken"("employee_id");

-- CreateIndex
CREATE INDEX "RefreshToken_expires_at_idx" ON "RefreshToken"("expires_at");

-- CreateIndex
CREATE INDEX "Reimbursement_company_id_idx" ON "Reimbursement"("company_id");

-- CreateIndex
CREATE INDEX "Reimbursement_emp_id_idx" ON "Reimbursement"("emp_id");

-- CreateIndex
CREATE INDEX "RolePermission_company_id_idx" ON "RolePermission"("company_id");

-- CreateIndex
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permission_id_company_id_key" ON "RolePermission"("role", "permission_id", "company_id");

-- CreateIndex
CREATE INDEX "RoleTemplate_base_role_idx" ON "RoleTemplate"("base_role");

-- CreateIndex
CREATE INDEX "RoleTemplate_company_id_idx" ON "RoleTemplate"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "RoleTemplate_company_id_role_name_key" ON "RoleTemplate"("company_id", "role_name");

-- CreateIndex
CREATE INDEX "SalaryComponent_company_id_idx" ON "SalaryComponent"("company_id");

-- CreateIndex
CREATE INDEX "SalaryRevision_company_id_idx" ON "SalaryRevision"("company_id");

-- CreateIndex
CREATE INDEX "SalaryRevision_emp_id_idx" ON "SalaryRevision"("emp_id");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryStructure_emp_id_key" ON "SalaryStructure"("emp_id");

-- CreateIndex
CREATE INDEX "SalaryStructure_company_id_idx" ON "SalaryStructure"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_session_token_key" ON "Session"("session_token");

-- CreateIndex
CREATE INDEX "Session_employee_id_idx" ON "Session"("employee_id");

-- CreateIndex
CREATE INDEX "Session_expires_at_idx" ON "Session"("expires_at");

-- CreateIndex
CREATE INDEX "SettingsAuditLog_company_id_idx" ON "SettingsAuditLog"("company_id");

-- CreateIndex
CREATE INDEX "SettingsAuditLog_created_at_idx" ON "SettingsAuditLog"("created_at");

-- CreateIndex
CREATE INDEX "Shift_company_id_idx" ON "Shift"("company_id");

-- CreateIndex
CREATE INDEX "Subscription_company_id_idx" ON "Subscription"("company_id");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");

-- CreateIndex
CREATE INDEX "TutorialProgress_employee_id_idx" ON "TutorialProgress"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "TutorialProgress_employee_id_step_id_key" ON "TutorialProgress"("employee_id", "step_id");

-- CreateIndex
CREATE INDEX "UptimeRecord_checked_at_idx" ON "UptimeRecord"("checked_at");

-- CreateIndex
CREATE INDEX "UptimeRecord_service_idx" ON "UptimeRecord"("service");

-- CreateIndex
CREATE INDEX "UsageRecord_company_id_idx" ON "UsageRecord"("company_id");

-- CreateIndex
CREATE INDEX "UsageRecord_recorded_at_idx" ON "UsageRecord"("recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvite_token_key" ON "UserInvite"("token");

-- CreateIndex
CREATE INDEX "UserInvite_company_id_idx" ON "UserInvite"("company_id");

-- CreateIndex
CREATE INDEX "UserInvite_email_idx" ON "UserInvite"("email");

-- CreateIndex
CREATE INDEX "UserInvite_status_idx" ON "UserInvite"("status");

-- CreateIndex
CREATE INDEX "UserInvite_token_idx" ON "UserInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Waitlist_email_key" ON "Waitlist"("email");

-- CreateIndex
CREATE INDEX "WorkflowTemplate_company_id_idx" ON "WorkflowTemplate"("company_id");

-- CreateIndex
CREATE INDEX "WorkflowTemplate_entity_type_idx" ON "WorkflowTemplate"("entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowTemplate_company_id_entity_type_version_key" ON "WorkflowTemplate"("company_id", "entity_type", "version");

-- CreateIndex
CREATE INDEX "WorkflowStep_template_id_idx" ON "WorkflowStep"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_template_id_step_order_key" ON "WorkflowStep"("template_id", "step_order");

-- CreateIndex
CREATE INDEX "WorkflowInstance_company_id_idx" ON "WorkflowInstance"("company_id");

-- CreateIndex
CREATE INDEX "WorkflowInstance_entity_type_entity_id_idx" ON "WorkflowInstance"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "WorkflowInstance_status_idx" ON "WorkflowInstance"("status");

-- CreateIndex
CREATE INDEX "WorkflowInstance_initiated_by_idx" ON "WorkflowInstance"("initiated_by");

-- CreateIndex
CREATE INDEX "WorkflowAction_instance_id_idx" ON "WorkflowAction"("instance_id");

-- CreateIndex
CREATE INDEX "WorkflowAction_actor_id_idx" ON "WorkflowAction"("actor_id");

-- CreateIndex
CREATE INDEX "DomainEvent_company_id_idx" ON "DomainEvent"("company_id");

-- CreateIndex
CREATE INDEX "DomainEvent_status_idx" ON "DomainEvent"("status");

-- CreateIndex
CREATE INDEX "DomainEvent_event_type_idx" ON "DomainEvent"("event_type");

-- CreateIndex
CREATE INDEX "DomainEvent_created_at_idx" ON "DomainEvent"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollConfig_company_id_key" ON "PayrollConfig"("company_id");

-- CreateIndex
CREATE INDEX "Goal_company_id_idx" ON "Goal"("company_id");

-- CreateIndex
CREATE INDEX "Goal_emp_id_idx" ON "Goal"("emp_id");

-- CreateIndex
CREATE INDEX "Goal_status_idx" ON "Goal"("status");

-- CreateIndex
CREATE INDEX "Goal_parent_goal_id_idx" ON "Goal"("parent_goal_id");

-- CreateIndex
CREATE INDEX "ReviewCycle_company_id_idx" ON "ReviewCycle"("company_id");

-- CreateIndex
CREATE INDEX "ReviewCycle_status_idx" ON "ReviewCycle"("status");

-- CreateIndex
CREATE INDEX "ReviewTemplate_company_id_idx" ON "ReviewTemplate"("company_id");

-- CreateIndex
CREATE INDEX "ReviewInstance_company_id_idx" ON "ReviewInstance"("company_id");

-- CreateIndex
CREATE INDEX "ReviewInstance_cycle_id_idx" ON "ReviewInstance"("cycle_id");

-- CreateIndex
CREATE INDEX "ReviewInstance_reviewee_id_idx" ON "ReviewInstance"("reviewee_id");

-- CreateIndex
CREATE INDEX "ReviewInstance_reviewer_id_idx" ON "ReviewInstance"("reviewer_id");

-- CreateIndex
CREATE INDEX "ReviewInstance_status_idx" ON "ReviewInstance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewInstance_cycle_id_reviewee_id_reviewer_id_key" ON "ReviewInstance"("cycle_id", "reviewee_id", "reviewer_id");

-- CreateIndex
CREATE INDEX "ReviewResponse_instance_id_idx" ON "ReviewResponse"("instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewResponse_instance_id_section_index_question_index_key" ON "ReviewResponse"("instance_id", "section_index", "question_index");

-- CreateIndex
CREATE INDEX "Competency_company_id_idx" ON "Competency"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "Competency_company_id_name_key" ON "Competency"("company_id", "name");

-- CreateIndex
CREATE INDEX "JobPosting_company_id_idx" ON "JobPosting"("company_id");

-- CreateIndex
CREATE INDEX "JobPosting_status_idx" ON "JobPosting"("status");

-- CreateIndex
CREATE INDEX "JobPosting_department_idx" ON "JobPosting"("department");

-- CreateIndex
CREATE INDEX "JobApplication_company_id_idx" ON "JobApplication"("company_id");

-- CreateIndex
CREATE INDEX "JobApplication_job_id_idx" ON "JobApplication"("job_id");

-- CreateIndex
CREATE INDEX "JobApplication_status_idx" ON "JobApplication"("status");

-- CreateIndex
CREATE INDEX "JobApplication_candidate_email_idx" ON "JobApplication"("candidate_email");

-- CreateIndex
CREATE INDEX "InterviewStage_company_id_idx" ON "InterviewStage"("company_id");

-- CreateIndex
CREATE INDEX "InterviewStage_job_id_idx" ON "InterviewStage"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewStage_job_id_stage_order_key" ON "InterviewStage"("job_id", "stage_order");

-- CreateIndex
CREATE INDEX "Interview_company_id_idx" ON "Interview"("company_id");

-- CreateIndex
CREATE INDEX "Interview_application_id_idx" ON "Interview"("application_id");

-- CreateIndex
CREATE INDEX "Interview_interviewer_id_idx" ON "Interview"("interviewer_id");

-- CreateIndex
CREATE INDEX "Interview_status_idx" ON "Interview"("status");

-- CreateIndex
CREATE INDEX "OfferLetter_company_id_idx" ON "OfferLetter"("company_id");

-- CreateIndex
CREATE INDEX "OfferLetter_application_id_idx" ON "OfferLetter"("application_id");

-- CreateIndex
CREATE INDEX "OfferLetter_status_idx" ON "OfferLetter"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePolicy_company_id_key" ON "AttendancePolicy"("company_id");

-- CreateIndex
CREATE INDEX "Course_company_id_idx" ON "Course"("company_id");

-- CreateIndex
CREATE INDEX "Course_status_idx" ON "Course"("status");

-- CreateIndex
CREATE INDEX "Course_is_mandatory_idx" ON "Course"("is_mandatory");

-- CreateIndex
CREATE INDEX "CourseEnrollment_company_id_idx" ON "CourseEnrollment"("company_id");

-- CreateIndex
CREATE INDEX "CourseEnrollment_emp_id_idx" ON "CourseEnrollment"("emp_id");

-- CreateIndex
CREATE INDEX "CourseEnrollment_status_idx" ON "CourseEnrollment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CourseEnrollment_course_id_emp_id_key" ON "CourseEnrollment"("course_id", "emp_id");

-- CreateIndex
CREATE INDEX "LearningPath_company_id_idx" ON "LearningPath"("company_id");

-- CreateIndex
CREATE INDEX "CompensationCycle_company_id_idx" ON "CompensationCycle"("company_id");

-- CreateIndex
CREATE INDEX "CompensationCycle_status_idx" ON "CompensationCycle"("status");

-- CreateIndex
CREATE INDEX "CompensationRecommendation_company_id_idx" ON "CompensationRecommendation"("company_id");

-- CreateIndex
CREATE INDEX "CompensationRecommendation_emp_id_idx" ON "CompensationRecommendation"("emp_id");

-- CreateIndex
CREATE INDEX "CompensationRecommendation_status_idx" ON "CompensationRecommendation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CompensationRecommendation_cycle_id_emp_id_key" ON "CompensationRecommendation"("cycle_id", "emp_id");

-- CreateIndex
CREATE INDEX "TravelRequest_company_id_idx" ON "TravelRequest"("company_id");

-- CreateIndex
CREATE INDEX "TravelRequest_emp_id_idx" ON "TravelRequest"("emp_id");

-- CreateIndex
CREATE INDEX "TravelRequest_status_idx" ON "TravelRequest"("status");

-- CreateIndex
CREATE INDEX "Expense_company_id_idx" ON "Expense"("company_id");

-- CreateIndex
CREATE INDEX "Expense_emp_id_idx" ON "Expense"("emp_id");

-- CreateIndex
CREATE INDEX "Expense_travel_request_id_idx" ON "Expense"("travel_request_id");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHierarchy" ADD CONSTRAINT "ApprovalHierarchy_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHierarchy" ADD CONSTRAINT "ApprovalHierarchy_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHierarchy" ADD CONSTRAINT "ApprovalHierarchy_hr_partner_fkey" FOREIGN KEY ("hr_partner") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHierarchy" ADD CONSTRAINT "ApprovalHierarchy_level1_approver_fkey" FOREIGN KEY ("level1_approver") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHierarchy" ADD CONSTRAINT "ApprovalHierarchy_level2_approver_fkey" FOREIGN KEY ("level2_approver") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHierarchy" ADD CONSTRAINT "ApprovalHierarchy_level3_approver_fkey" FOREIGN KEY ("level3_approver") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHierarchy" ADD CONSTRAINT "ApprovalHierarchy_level4_approver_fkey" FOREIGN KEY ("level4_approver") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRole" ADD CONSTRAINT "CompanyRole_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRole" ADD CONSTRAINT "CompanyRole_reports_to_id_fkey" FOREIGN KEY ("reports_to_id") REFERENCES "CompanyRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRolePermission" ADD CONSTRAINT "CompanyRolePermission_company_role_id_fkey" FOREIGN KEY ("company_role_id") REFERENCES "CompanyRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRolePermission" ADD CONSTRAINT "CompanyRolePermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstraintPolicy" ADD CONSTRAINT "ConstraintPolicy_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_company_role_id_fkey" FOREIGN KEY ("company_role_id") REFERENCES "CompanyRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeInvite" ADD CONSTRAINT "EmployeeInvite_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMovement" ADD CONSTRAINT "EmployeeMovement_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMovement" ADD CONSTRAINT "EmployeeMovement_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMovement" ADD CONSTRAINT "EmployeeMovement_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeShift" ADD CONSTRAINT "EmployeeShift_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeShift" ADD CONSTRAINT "EmployeeShift_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeShift" ADD CONSTRAINT "EmployeeShift_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeStatusHistory" ADD CONSTRAINT "EmployeeStatusHistory_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeStatusHistory" ADD CONSTRAINT "EmployeeStatusHistory_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeStatusHistory" ADD CONSTRAINT "EmployeeStatusHistory_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitChecklist" ADD CONSTRAINT "ExitChecklist_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitChecklist" ADD CONSTRAINT "ExitChecklist_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLevel" ADD CONSTRAINT "JobLevel_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveEncashment" ADD CONSTRAINT "LeaveEncashment_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveEncashment" ADD CONSTRAINT "LeaveEncashment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveEncashment" ADD CONSTRAINT "LeaveEncashment_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRule" ADD CONSTRAINT "LeaveRule_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationTemplate" ADD CONSTRAINT "NotificationTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnit" ADD CONSTRAINT "OrganizationUnit_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnit" ADD CONSTRAINT "OrganizationUnit_head_id_fkey" FOREIGN KEY ("head_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnit" ADD CONSTRAINT "OrganizationUnit_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "OrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpToken" ADD CONSTRAINT "OtpToken_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpToken" ADD CONSTRAINT "OtpToken_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollSlip" ADD CONSTRAINT "PayrollSlip_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollSlip" ADD CONSTRAINT "PayrollSlip_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollSlip" ADD CONSTRAINT "PayrollSlip_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicHoliday" ADD CONSTRAINT "PublicHoliday_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTemplate" ADD CONSTRAINT "RoleTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryComponent" ADD CONSTRAINT "SalaryComponent_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRevision" ADD CONSTRAINT "SalaryRevision_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRevision" ADD CONSTRAINT "SalaryRevision_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRevision" ADD CONSTRAINT "SalaryRevision_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettingsAuditLog" ADD CONSTRAINT "SettingsAuditLog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_invited_by_super_id_fkey" FOREIGN KEY ("invited_by_super_id") REFERENCES "SuperAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTemplate" ADD CONSTRAINT "WorkflowTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "WorkflowTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "WorkflowTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainEvent" ADD CONSTRAINT "DomainEvent_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollConfig" ADD CONSTRAINT "PayrollConfig_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_parent_goal_id_fkey" FOREIGN KEY ("parent_goal_id") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCycle" ADD CONSTRAINT "ReviewCycle_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTemplate" ADD CONSTRAINT "ReviewTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewInstance" ADD CONSTRAINT "ReviewInstance_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "ReviewCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewInstance" ADD CONSTRAINT "ReviewInstance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewInstance" ADD CONSTRAINT "ReviewInstance_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewInstance" ADD CONSTRAINT "ReviewInstance_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewResponse" ADD CONSTRAINT "ReviewResponse_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "ReviewInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competency" ADD CONSTRAINT "Competency_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewStage" ADD CONSTRAINT "InterviewStage_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewStage" ADD CONSTRAINT "InterviewStage_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferLetter" ADD CONSTRAINT "OfferLetter_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferLetter" ADD CONSTRAINT "OfferLetter_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePolicy" ADD CONSTRAINT "AttendancePolicy_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationCycle" ADD CONSTRAINT "CompensationCycle_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationCycle" ADD CONSTRAINT "CompensationCycle_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationRecommendation" ADD CONSTRAINT "CompensationRecommendation_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "CompensationCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationRecommendation" ADD CONSTRAINT "CompensationRecommendation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationRecommendation" ADD CONSTRAINT "CompensationRecommendation_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_travel_request_id_fkey" FOREIGN KEY ("travel_request_id") REFERENCES "TravelRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
