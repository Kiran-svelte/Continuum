/**
 * Onboarding Types for Continuum Enterprise 9-Step Wizard
 * Defines all TypeScript interfaces and types for the complete onboarding flow
 */

// ─── Step Enumeration ─────────────────────────────────────────────────────────

export enum OnboardingStep {
  COMPANY_PROFILE = 1,
  ROLE_CONFIGURATION = 2,
  LEAVE_TYPES = 3,
  CONSTRAINTS = 4,
  APPROVAL_WORKFLOW = 5,
  HOLIDAY_CALENDAR = 6,
  WORK_SCHEDULE = 7,
  PAYROLL_DEFAULTS = 8,
  COMPLETE = 9,
}

// ─── Progress Tracking ────────────────────────────────────────────────────────

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  lastUpdated: string;
  companyId: string;
}

// ─── Step 1: Company Profile ──────────────────────────────────────────────────

export interface CompanyProfile {
  id?: string;
  companyName: string;
  industry: string;
  state: string;
  city: string;
  pincode: string;
  address: string;
  timezone: string;
  companySize: CompanySize;
  fiscalYearStart: FiscalYearMonth;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  gstin?: string;
  pan?: string;
  tan?: string;
  registrationNumber?: string;
  website?: string;
  logoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CompanySize =
  | '1-10'
  | '11-50'
  | '51-200'
  | '201-500'
  | '501-1000'
  | '1001-5000'
  | '5000+';

export type FiscalYearMonth =
  | 'january'
  | 'february'
  | 'march'
  | 'april'
  | 'may'
  | 'june'
  | 'july'
  | 'august'
  | 'september'
  | 'october'
  | 'november'
  | 'december';

// ─── Step 2: Role Configuration ───────────────────────────────────────────────

export interface RoleConfig {
  id: string;
  roleName: string;
  roleCode: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  isActive: boolean;
  hierarchy: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Permission {
  module: string;
  actions: PermissionAction[];
}

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export';

// ─── Step 3: Leave Type Configuration ─────────────────────────────────────────

export interface LeaveTypeConfig {
  id: string;
  leaveCode: string;
  leaveName: string;
  description: string;
  defaultBalance: number;
  maxAccrual: number;
  carryForwardLimit: number;
  carryForwardExpiry: number; // months
  encashmentAllowed: boolean;
  encashmentMaxDays: number;
  isPaid: boolean;
  isActive: boolean;
  applicableGender: 'all' | 'male' | 'female' | 'other';
  minServiceDays: number;
  documentsRequired: boolean;
  documentTypes: string[];
  accrualType: AccrualType;
  accrualDay: number;
  minDaysPerRequest: number;
  maxDaysPerRequest: number;
  noticeDaysRequired: number;
  clubbingAllowed: boolean;
  clubbingRestrictions: string[];
  halfDayAllowed: boolean;
  negativeBalanceAllowed: boolean;
  negativeBalanceLimit: number;
  colorCode: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type AccrualType = 'monthly' | 'quarterly' | 'yearly' | 'one-time';

// ─── Step 4: Constraint Configuration ─────────────────────────────────────────

export interface ConstraintConfig {
  id: string;
  ruleCode: string;
  ruleName: string;
  description: string;
  ruleType: ConstraintRuleType;
  conditions: ConstraintCondition[];
  actions: ConstraintAction[];
  isActive: boolean;
  priority: number;
  applicableTo: 'all' | 'department' | 'role' | 'employee';
  applicableIds: string[];
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ConstraintRuleType =
  | 'leave_restriction'
  | 'approval_requirement'
  | 'balance_check'
  | 'overlap_prevention'
  | 'blackout_period'
  | 'minimum_gap'
  | 'maximum_consecutive'
  | 'team_availability'
  | 'holiday_adjacency'
  | 'probation_restriction'
  | 'notice_period'
  | 'document_requirement'
  | 'custom';

export interface ConstraintCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number | string[] | number[] | boolean;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'between'
  | 'in'
  | 'not_in';

export interface ConstraintAction {
  type: 'block' | 'warn' | 'require_approval' | 'require_document' | 'notify';
  message: string;
  notifyRoles?: string[];
}

// ─── Step 5: Approval Workflow ────────────────────────────────────────────────

export interface ApprovalWorkflow {
  id: string;
  workflowName: string;
  workflowCode: string;
  description: string;
  leaveTypes: string[];
  isActive: boolean;
  steps: ApprovalStep[];
  escalationRules: EscalationRule[];
  autoApprovalRules: AutoApprovalRule[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApprovalStep {
  stepNumber: number;
  approverType: ApproverType;
  approverId?: string;
  approverRoleId?: string;
  isRequired: boolean;
  canSkip: boolean;
  skipConditions: ConstraintCondition[];
  timeoutHours: number;
  timeoutAction: 'escalate' | 'auto_approve' | 'auto_reject';
}

export type ApproverType =
  | 'reporting_manager'
  | 'department_head'
  | 'hr'
  | 'specific_role'
  | 'specific_user';

export interface EscalationRule {
  afterHours: number;
  escalateTo: 'next_level' | 'specific_role' | 'specific_user';
  escalateToId?: string;
  notifyOriginalApprover: boolean;
  maxEscalations: number;
}

export interface AutoApprovalRule {
  conditions: ConstraintCondition[];
  maxDays: number;
  leaveTypes: string[];
  isActive: boolean;
}

// ─── Step 6: Holiday Calendar ─────────────────────────────────────────────────

export interface HolidayCalendar {
  id: string;
  calendarName: string;
  year: number;
  state: string;
  isDefault: boolean;
  holidays: Holiday[];
  restrictedHolidays: Holiday[];
  optionalHolidayQuota: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: HolidayType;
  isFloating: boolean;
  applicableStates: string[];
  description?: string;
}

export type HolidayType = 'national' | 'state' | 'restricted' | 'optional' | 'company';

// ─── Step 7: Work Schedule ────────────────────────────────────────────────────

export interface WorkSchedule {
  id: string;
  scheduleName: string;
  scheduleCode: string;
  description: string;
  isDefault: boolean;
  isActive: boolean;
  workDays: WorkDay[];
  shiftTimings: ShiftTiming[];
  flexibleHours: boolean;
  coreHoursStart?: string;
  coreHoursEnd?: string;
  weeklyWorkHours: number;
  overtimeThreshold: number;
  overtimeAllowed: boolean;
  halfDayHours: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkDay {
  dayOfWeek: DayOfWeek;
  isWorkingDay: boolean;
  isAlternate: boolean;
  alternateWeeks: AlternateWeek[];
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
export type AlternateWeek = 'odd' | 'even';

export interface ShiftTiming {
  id: string;
  shiftName: string;
  shiftCode: string;
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  graceMinutes: number;
  isNightShift: boolean;
  isDefault: boolean;
}

// ─── Step 8: Payroll Defaults ─────────────────────────────────────────────────

export interface PayrollDefaults {
  id: string;
  payrollCycle: PayrollCycle;
  payDay: number;
  cutoffDay: number;
  currency: string;
  leaveEncashmentRate: number;
  lopDeductionBasis: LOPDeductionBasis;
  pfEnabled: boolean;
  pfEmployerContribution: number;
  pfEmployeeContribution: number;
  esiEnabled: boolean;
  esiThreshold: number;
  esiEmployerContribution: number;
  esiEmployeeContribution: number;
  ptEnabled: boolean;
  ptState: string;
  gratuityEnabled: boolean;
  gratuityEligibilityYears: number;
  lwfEnabled: boolean;
  taxRegime: TaxRegime;
  createdAt?: string;
  updatedAt?: string;
}

export type PayrollCycle = 'weekly' | 'bi-weekly' | 'monthly';
export type LOPDeductionBasis = 'calendar_days' | 'working_days' | 'fixed_30';
export type TaxRegime = 'old' | 'new' | 'employee_choice';

// ─── Step 9: Onboarding Complete ──────────────────────────────────────────────

export interface OnboardingComplete {
  companyId: string;
  completedAt: string;
  completedBy: string;
  summary: OnboardingSummary;
}

export interface OnboardingSummary {
  companyName: string;
  rolesConfigured: number;
  leaveTypesConfigured: number;
  constraintsConfigured: number;
  workflowsConfigured: number;
  holidaysConfigured: number;
  schedulesConfigured: number;
}

// ─── Form Validation Types ────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export interface StepValidation {
  isValid: boolean;
  errors: ValidationError[];
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface OnboardingApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── State Type for Dropdown ──────────────────────────────────────────────────

export interface IndianState {
  code: string;
  name: string;
}

export interface Industry {
  code: string;
  name: string;
}

export interface CompanySizeOption {
  value: CompanySize;
  label: string;
}

export interface FiscalYearOption {
  value: FiscalYearMonth;
  label: string;
}

export interface TimezoneOption {
  value: string;
  label: string;
}
