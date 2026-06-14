/**
 * Enhanced 9-Step Company Onboarding System
 * Implements the complete specification-compliant onboarding wizard
 */

import { LucideIcon } from 'lucide-react';

// ─── Step Interface Definitions ─────────────────────────────────────────────

export interface Step1CompanyDetails {
  companyName: string;
  industry: string;
  employeeCount: string;
  country: string;
  state: string;
  timezone: string;
  address: string;
  website?: string;
  businessType: 'startup' | 'sme' | 'enterprise' | 'non-profit';
  financialYear: 'apr-mar' | 'jan-dec' | 'custom';
  customFYStart?: string;
}

export interface Step2RoleHierarchy {
  enabledRoles: string[];
  roleStructure: {
    role: string;
    label: string;
    reportsTo?: string;
    approvalLevel: number;
    enabled: boolean;
  }[];
  customRoles: {
    name: string;
    permissions: string[];
    approvalLevel: number;
  }[];
}

export interface Step3LeaveTypesQuotas {
  leaveTypes: {
    code: string;
    name: string;
    quota: number;
    carryForward: boolean;
    maxCarryForward: number;
    encashment: boolean;
    encashmentMaxDays: number;
    paid: boolean;
    enabled: boolean;
    genderRestriction?: 'male' | 'female' | 'all';
    probationApplicable: boolean;
    noticePeriodRequired: number;
  }[];
  quotaSettings: {
    proRatedForNewJoiners: boolean;
    carryForwardDeadline: string; // MM-DD
    encashmentPolicy: 'auto' | 'manual' | 'disabled';
  };
}

export interface Step4ConstraintRules {
  rules: {
    ruleId: string;
    name: string;
    enabled: boolean;
    isBlocking: boolean;
    config: Record<string, any>;
  }[];
  teamCoverage: {
    minCoveragePercent: number;
    applyToDepartment: boolean;
    criticalRoles: string[];
  };
  blackoutPeriods: {
    name: string;
    startDate: string;
    endDate: string;
    exemptRoles: string[];
  }[];
}

export interface Step5ApprovalWorkflows {
  defaultChain: {
    level1: string; // role name
    level2?: string;
    level3?: string;
    level4?: string;
    hrPartner: boolean;
  };
  leaveTypeOverrides: {
    leaveType: string;
    customChain: string[];
    autoApproval: {
      enabled: boolean;
      maxDays: number;
      conditions: string[];
    };
  }[];
  slaSettings: {
    level1Hours: number;
    level2Hours: number;
    level3Hours: number;
    escalationEnabled: boolean;
  };
}

export interface Step6HolidayCalendar {
  holidays: {
    name: string;
    date: string;
    type: 'national' | 'state' | 'company' | 'optional';
    enabled: boolean;
    floating?: boolean;
  }[];
  settings: {
    weekendDays: ('saturday' | 'sunday')[];
    floatingHolidays: number;
    stateSpecificEnabled: boolean;
    optionalHolidays: number;
  };
}

export interface Step7WorkSchedule {
  standard: {
    workingDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
    startTime: string;
    endTime: string;
    lunchBreakMinutes: number;
    gracePeriodMinutes: number;
    halfDayHours: number;
  };
  shifts?: {
    enabled: boolean;
    shifts: {
      name: string;
      startTime: string;
      endTime: string;
      workingDays: string[];
    }[];
  };
  remote: {
    wfhEnabled: boolean;
    wfhQuota: number;
    wfhApprovalRequired: boolean;
  };
}

export interface Step8SalaryPayroll {
  components: {
    basic: { percentage: number; fixed?: number };
    hra: { percentage: number; metros?: string[] };
    da: { percentage: number };
    specialAllowance: { percentage: number };
    customComponents: {
      name: string;
      percentage?: number;
      fixed?: number;
      taxable: boolean;
    }[];
  };
  statutory: {
    pf: { enabled: boolean; employeeRate: number; employerRate: number };
    esi: { enabled: boolean; employeeRate: number; employerRate: number; threshold: number };
    pt: { enabled: boolean; state: string };
    tds: { enabled: boolean; regime: 'old' | 'new' | 'employee_choice' };
  };
  payroll: {
    payrollCycle: 'monthly' | 'bimonthly';
    paymentDate: number; // 1-31
    ctcStructure: 'standard' | 'custom';
  };
}

export interface Step9LaunchInvites {
  teamInvites: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    department?: string;
    manager?: string;
    sendInvite: boolean;
  }[];
  launch: {
    goLive: boolean;
    notifyTeam: boolean;
    scheduledLaunch?: string;
  };
}

// ─── Complete Onboarding State ─────────────────────────────────────────────

export interface OnboardingState {
  currentStep: number;
  completedSteps: number[];
  step1: Step1CompanyDetails;
  step2: Step2RoleHierarchy;
  step3: Step3LeaveTypesQuotas;
  step4: Step4ConstraintRules;
  step5: Step5ApprovalWorkflows;
  step6: Step6HolidayCalendar;
  step7: Step7WorkSchedule;
  step8: Step8SalaryPayroll;
  step9: Step9LaunchInvites;
}

// ─── Default Configurations ─────────────────────────────────────────────

export const DEFAULT_ROLES = [
  { role: 'admin', label: 'Admin', approvalLevel: 5, enabled: true },
  { role: 'hr', label: 'HR Manager', approvalLevel: 4, enabled: true },
  { role: 'director', label: 'Director', approvalLevel: 3, enabled: false },
  { role: 'manager', label: 'Manager', approvalLevel: 2, enabled: true },
  { role: 'team_lead', label: 'Team Lead', approvalLevel: 1, enabled: false },
  { role: 'employee', label: 'Employee', approvalLevel: 0, enabled: true },
];

export const DEFAULT_LEAVE_TYPES = [
  { code: 'CL', name: 'Casual Leave', quota: 12, carryForward: false, encashment: false, paid: true },
  { code: 'SL', name: 'Sick Leave', quota: 12, carryForward: false, encashment: false, paid: true },
  { code: 'BL', name: 'Bereavement Leave', quota: 5, carryForward: false, encashment: false, paid: true },
  { code: 'LWP', name: 'Leave Without Pay', quota: 365, carryForward: false, encashment: false, paid: false },
];

export const DEFAULT_CONSTRAINT_RULES = [
  { ruleId: 'RULE001', name: 'Max Leave Duration', enabled: true, isBlocking: true },
  { ruleId: 'RULE002', name: 'Leave Balance Check', enabled: true, isBlocking: true },
  { ruleId: 'RULE003', name: 'Min Team Coverage', enabled: true, isBlocking: true },
  { ruleId: 'RULE004', name: 'Max Concurrent Leave', enabled: true, isBlocking: true },
  { ruleId: 'RULE005', name: 'Blackout Period', enabled: true, isBlocking: true },
  { ruleId: 'RULE006', name: 'Advance Notice', enabled: true, isBlocking: false },
  { ruleId: 'RULE007', name: 'Consecutive Leave Limit', enabled: false, isBlocking: false },
  { ruleId: 'RULE008', name: 'Sandwich Rule', enabled: true, isBlocking: true },
  { ruleId: 'RULE009', name: 'Min Gap Between Leaves', enabled: false, isBlocking: false },
  { ruleId: 'RULE010', name: 'Probation Restriction', enabled: true, isBlocking: true },
  { ruleId: 'RULE011', name: 'Critical Project Freeze', enabled: false, isBlocking: true },
  { ruleId: 'RULE012', name: 'Document Requirement', enabled: false, isBlocking: false },
  { ruleId: 'RULE013', name: 'Monthly Quota', enabled: false, isBlocking: false },
];