/**
 * Quick Start guide steps filtered by enabled company modules.
 */

import type { ModuleSlug } from '@/lib/core-functions/catalog';
import {
  hasAnyEnabledModule,
  isModuleEnabledInList,
  WORKFLOW_APPROVAL_MODULES,
} from '@/lib/module-ux-gates';

export type QuickStartRole = 'employee' | 'manager';

export interface QuickStartStepDef {
  id: string;
  title: string;
  description: string;
  action: string;
  href: string;
  /** Step is shown only when this module is enabled. */
  moduleSlug?: ModuleSlug;
  /** Step is shown when at least one of these modules is enabled. */
  requiresAnyModule?: readonly ModuleSlug[];
}

export const EMPLOYEE_QUICK_START_STEPS: QuickStartStepDef[] = [
  {
    id: 'profile',
    title: 'Complete Your Profile',
    description: 'Add your personal details and emergency contacts',
    action: 'Update Profile',
    href: '/employee/profile',
  },
  {
    id: 'leave-balance',
    title: 'Check Leave Balance',
    description: 'View your available leave days for each type',
    action: 'View Balance',
    href: '/employee/dashboard',
    moduleSlug: 'leave',
  },
  {
    id: 'apply-leave',
    title: 'Apply for Leave',
    description: 'Submit your first leave request',
    action: 'Apply Now',
    href: '/employee/request-leave',
    moduleSlug: 'leave',
  },
  {
    id: 'settings',
    title: 'Configure Notifications',
    description: 'Set up email and push notifications',
    action: 'Settings',
    href: '/employee/settings',
  },
];

export const MANAGER_QUICK_START_STEPS: QuickStartStepDef[] = [
  {
    id: 'team',
    title: 'View Your Team',
    description: 'See all team members and their status',
    action: 'View Team',
    href: '/manager/team',
  },
  {
    id: 'approvals',
    title: 'Review Pending Requests',
    description: 'Approve or reject team leave, expense, and reimbursement requests',
    action: 'Review',
    href: '/manager/approvals',
    requiresAnyModule: WORKFLOW_APPROVAL_MODULES,
  },
  {
    id: 'calendar',
    title: 'Team Calendar',
    description: 'View team availability at a glance',
    action: 'Open Calendar',
    href: '/manager/team-calendar',
    moduleSlug: 'leave',
  },
  {
    id: 'reports',
    title: 'Generate Reports',
    description: 'Create attendance and leave reports',
    action: 'Reports',
    href: '/manager/reports',
    moduleSlug: 'analytics',
  },
];

export function filterQuickStartSteps(
  role: QuickStartRole,
  enabledModules: readonly ModuleSlug[]
): QuickStartStepDef[] {
  const steps = role === 'manager' ? MANAGER_QUICK_START_STEPS : EMPLOYEE_QUICK_START_STEPS;
  return steps.filter((step) => {
    if (step.requiresAnyModule?.length) {
      return hasAnyEnabledModule(enabledModules, step.requiresAnyModule);
    }
    if (step.moduleSlug) {
      return isModuleEnabledInList(enabledModules, step.moduleSlug);
    }
    return true;
  });
}
