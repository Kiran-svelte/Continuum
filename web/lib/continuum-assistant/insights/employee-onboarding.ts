import prisma from '@/lib/prisma';
import type { AssistantContext } from '@/lib/continuum-assistant/types';

export async function loadEmployeeFirstDaySteps(employeeId: string, companyId: string) {
  const [employee, balances, pendingLeave] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        status: true,
        must_change_password: true,
        tutorial_completed: true,
        primary_role: true,
      },
    }),
    prisma.leaveBalance.count({ where: { emp_id: employeeId } }),
    prisma.leaveRequest.count({
      where: { emp_id: employeeId, status: 'pending' },
    }),
  ]);

  return {
    status: employee?.status ?? 'unknown',
    mustChangePassword: Boolean(employee?.must_change_password),
    tutorialCompleted: Boolean(employee?.tutorial_completed),
    hasBalances: balances > 0,
    pendingLeave,
    role: employee?.primary_role ?? 'employee',
  };
}

export function formatEmployeeFirstDay(
  state: Awaited<ReturnType<typeof loadEmployeeFirstDaySteps>>,
  ctx: AssistantContext
): string {
  const steps: string[] = [];

  if (state.mustChangePassword) {
    steps.push('1. **Change your password** (required on first login).');
  } else {
    steps.push('1. ✓ Password is set.');
  }

  if (!state.tutorialCompleted) {
    steps.push('2. Complete the short **Getting Started tutorial** (in-app prompts).');
  } else {
    steps.push('2. ✓ Tutorial completed.');
  }

  steps.push(`3. Open **Request Leave** to apply for time off (${ctx.portalSlug}/request-leave).`);

  if (state.hasBalances) {
    steps.push('4. Check **leave balances** in the guide or Request Leave screen.');
  } else {
    steps.push('4. Leave balances may appear after HR finishes quota setup — ask HR if empty.');
  }

  if (state.pendingLeave > 0) {
    steps.push(`5. You have **${state.pendingLeave}** pending leave request(s) awaiting approval.`);
  }

  return ['**Your first steps:**', '', ...steps].join('\n');
}
