/**
 * Admin/HR Onboarding Setup Wizard — Step Definitions and Validation.
 *
 * Defines the ordered steps an admin/HR user must complete
 * when setting up a new company on Continuum HR.
 *
 * Each step is independently validateable via the `validate` function.
 *
 * @module lib/onboarding/setup-wizard-steps
 */

import prisma from '@/lib/prisma';
import type { ModuleSlug } from '@/lib/core-functions/catalog';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Total steps in the onboarding wizard. */
const TOTAL_STEPS = 6;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WizardStep {
  /** 1-indexed step number. */
  step: number;
  /** Machine-readable key for tracking completion. */
  key: string;
  /** Display title for the step. */
  title: string;
  /** Subtitle explaining what this step accomplishes. */
  description: string;
  /** Route where the user completes this step. */
  route: string;
  /** Icon name (matches lucide-react). */
  icon: string;
  /** Module required to show this step (undefined = always). */
  moduleSlug?: ModuleSlug;
}

export interface WizardProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  nextIncompleteStep: WizardStep | null;
  isComplete: boolean;
  percentComplete: number;
}

// ─── Step Definitions ─────────────────────────────────────────────────────────

export function filterWizardSteps(enabledSlugs: readonly ModuleSlug[]): WizardStep[] {
  const enabled = new Set(enabledSlugs);
  return WIZARD_STEPS.filter((s) => !s.moduleSlug || enabled.has(s.moduleSlug));
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    step: 1,
    key: 'company_profile',
    title: 'Company Profile',
    description: 'Set company name, logo, address, and registration details.',
    route: '/admin/company-settings',
    icon: 'Building2',
  },
  {
    step: 2,
    key: 'departments',
    title: 'Departments & Teams',
    description: 'Create your organizational structure — departments, teams, and reporting lines.',
    route: '/hr/organization',
    icon: 'GitBranch',
  },
  {
    step: 3,
    key: 'leave_policy',
    title: 'Leave Policy',
    description: 'Configure leave types, quotas, accrual rules, and approval hierarchy.',
    route: '/hr/policy-settings',
    icon: 'CalendarDays',
    moduleSlug: 'leave',
  },
  {
    step: 4,
    key: 'salary_structure',
    title: 'Salary Structure',
    description: 'Define salary components (basic, HRA, DA, etc.) and payroll schedule.',
    route: '/hr/salary-structures',
    icon: 'IndianRupee',
    moduleSlug: 'payroll',
  },
  {
    step: 5,
    key: 'attendance_policy',
    title: 'Attendance & Shifts',
    description: 'Set working hours, shift patterns, and attendance rules.',
    route: '/hr/shifts',
    icon: 'Clock',
    moduleSlug: 'attendance',
  },
  {
    step: 6,
    key: 'first_employee',
    title: 'Invite Employees',
    description: 'Add your first employees via bulk import or individual invite.',
    route: '/hr/employees',
    icon: 'Users',
  },
];

// ─── Validation Functions ─────────────────────────────────────────────────────

/**
 * Checks which wizard steps are complete for a given company.
 *
 * @param companyId - The company to check.
 * @returns WizardProgress with completion status.
 */
export async function getWizardProgress(
  companyId: string,
  enabledSlugs?: readonly ModuleSlug[]
): Promise<WizardProgress> {
  const completedSteps: string[] = [];
  const activeSteps = enabledSlugs?.length
    ? filterWizardSteps(enabledSlugs)
    : WIZARD_STEPS;

  const validators: Record<string, () => Promise<boolean>> = {
    company_profile: () => validateCompanyProfile(companyId),
    departments: () => validateDepartments(companyId),
    leave_policy: () => validateLeavePolicy(companyId),
    salary_structure: () => validateSalaryStructure(companyId),
    attendance_policy: () => validateAttendancePolicy(companyId),
    first_employee: () => validateFirstEmployee(companyId),
  };

  for (const step of activeSteps) {
    const validator = validators[step.key];
    if (validator) {
      const isComplete = await validator();
      if (isComplete) {
        completedSteps.push(step.key);
      }
    }
  }

  const nextIncomplete = activeSteps.find((s) => !completedSteps.includes(s.key)) ?? null;

  return {
    currentStep: completedSteps.length + 1,
    totalSteps: activeSteps.length,
    completedSteps,
    nextIncompleteStep: nextIncomplete,
    isComplete: completedSteps.length === TOTAL_STEPS,
    percentComplete: Math.round((completedSteps.length / TOTAL_STEPS) * 100),
  };
}

// ─── Individual Step Validators ───────────────────────────────────────────────

async function validateCompanyProfile(companyId: string): Promise<boolean> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });

  return Boolean(company?.name && company.name.length > 0);
}

async function validateDepartments(companyId: string): Promise<boolean> {
  const deptCount = await prisma.employee.findMany({
    where: { org_id: companyId, department: { not: null }, deleted_at: null },
    select: { department: true },
    distinct: ['department'],
  });

  return deptCount.length >= 1;
}

async function validateLeavePolicy(companyId: string): Promise<boolean> {
  const leaveTypes = await prisma.leaveType.count({
    where: { company_id: companyId },
  });

  return leaveTypes >= 1;
}

async function validateSalaryStructure(companyId: string): Promise<boolean> {
  const components = await prisma.salaryComponent.count({
    where: { company_id: companyId },
  });

  return components >= 1;
}

async function validateAttendancePolicy(companyId: string): Promise<boolean> {
  const shifts = await prisma.shift.count({
    where: { company_id: companyId },
  });

  return shifts >= 1;
}

async function validateFirstEmployee(companyId: string): Promise<boolean> {
  const employees = await prisma.employee.count({
    where: { org_id: companyId, deleted_at: null, status: { not: 'onboarding' } },
  });

  return employees >= 1;
}
