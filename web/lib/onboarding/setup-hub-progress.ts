/**
 * DB-backed completion validators for Organization Setup hub cards.
 */

import prisma from '@/lib/prisma';
import type { ModuleSlug } from '@/lib/core-functions/catalog';
import { filterSetupHubCards } from '@/lib/onboarding/setup-hub-catalog';

type ValidatorFn = (companyId: string) => Promise<boolean>;

const SETUP_VALIDATORS: Record<string, ValidatorFn> = {
  company_profile: async (companyId) => {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, timezone: true },
    });
    return Boolean(company?.name?.trim() && company?.timezone?.trim());
  },
  departments: async (companyId) => {
    const depts = await prisma.employee.findMany({
      where: { org_id: companyId, department: { not: null }, deleted_at: null },
      select: { department: true },
      distinct: ['department'],
    });
    return depts.length >= 1;
  },
  employees: async (companyId) => {
    const count = await prisma.employee.count({
      where: { org_id: companyId, deleted_at: null, status: { not: 'onboarding' } },
    });
    return count >= 1;
  },
  roles: async (companyId) => {
    const [hierarchy, overrides] = await Promise.all([
      prisma.approvalHierarchy.count({ where: { company_id: companyId } }),
      prisma.rolePermission.count({ where: { company_id: companyId } }),
    ]);
    return hierarchy > 0 || overrides > 0;
  },
  shifts: async (companyId) => {
    return (await prisma.shift.count({ where: { company_id: companyId } })) >= 1;
  },
  holidays: async (companyId) => {
    return (await prisma.publicHoliday.count({ where: { company_id: companyId } })) >= 1;
  },
  leave_types: async (companyId) => {
    return (await prisma.leaveType.count({ where: { company_id: companyId, is_active: true } })) >= 1;
  },
  leave_approvals: async (companyId) => {
    return (await prisma.approvalHierarchy.count({ where: { company_id: companyId } })) >= 1;
  },
  salary_structure: async (companyId) => {
    return (await prisma.salaryComponent.count({ where: { company_id: companyId } })) >= 1;
  },
  salary_structures_per_employee: async (companyId) => {
    return (await prisma.salaryStructure.count({ where: { company_id: companyId } })) >= 1;
  },
  statutory: async (companyId) => {
    const settings = await prisma.companySettings.findUnique({
      where: { company_id: companyId },
      select: { hr_alerts: true },
    });
    const alerts = settings?.hr_alerts as Record<string, unknown> | null;
    return Boolean(alerts?.payroll && typeof alerts.payroll === 'object');
  },
  pf_setup: async (companyId) => {
    const settings = await prisma.companySettings.findUnique({
      where: { company_id: companyId },
      select: { hr_alerts: true },
    });
    const alerts = settings?.hr_alerts as Record<string, unknown> | null;
    const pf = alerts?.pf ?? alerts?.provident_fund;
    return Boolean(pf && typeof pf === 'object');
  },
  performance_setup: async (companyId) => {
    return (await prisma.reviewCycle.count({ where: { company_id: companyId } })) >= 1;
  },
  recruitment_setup: async (companyId) => {
    return (await prisma.jobPosting.count({ where: { company_id: companyId } })) >= 1;
  },
  learning_setup: async (companyId) => {
    return (await prisma.course.count({ where: { company_id: companyId } })) >= 1;
  },
  documents_setup: async (companyId) => {
    return (await prisma.document.count({ where: { company_id: companyId } })) >= 1;
  },
  exit_setup: async () => true,
  expenses_setup: async () => true,
  reimbursements_setup: async () => true,
  directory_setup: async (companyId) => {
    return (
      (await prisma.employee.count({
        where: { org_id: companyId, deleted_at: null, department: { not: null } },
      })) >= 1
    );
  },
  analytics_setup: async () => true,
  compliance_setup: async () => true,
  notifications: async (companyId) => {
    const settings = await prisma.companySettings.findUnique({
      where: { company_id: companyId },
      select: { email_notifications: true },
    });
    return Boolean(settings?.email_notifications);
  },
};

export interface SetupHubProgress {
  completedSteps: string[];
  requiredKeys: string[];
  totalRequired: number;
  completedRequired: number;
  isComplete: boolean;
  percentComplete: number;
}

export async function getSetupHubProgress(
  companyId: string,
  enabledSlugs: readonly ModuleSlug[]
): Promise<SetupHubProgress> {
  const visible = filterSetupHubCards(enabledSlugs);
  const requiredKeys = visible.filter((c) => c.required).map((c) => c.key);
  const completedSteps: string[] = [];

  for (const card of visible) {
    const validator = SETUP_VALIDATORS[card.key];
    if (validator && (await validator(companyId))) {
      completedSteps.push(card.key);
    }
  }

  const completedRequired = requiredKeys.filter((k) => completedSteps.includes(k)).length;
  const totalRequired = requiredKeys.length;
  const percentComplete =
    totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100;

  return {
    completedSteps,
    requiredKeys,
    totalRequired,
    completedRequired,
    isComplete: totalRequired > 0 && completedRequired === totalRequired,
    percentComplete,
  };
}
