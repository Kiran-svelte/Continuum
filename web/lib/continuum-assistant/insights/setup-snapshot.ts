import prisma from '@/lib/prisma';
import type { AssistantContext } from '@/lib/continuum-assistant/types';

export async function loadSetupSnapshot(companyId: string) {
  const [
    employeeCount,
    leaveTypeCount,
    salaryComponentCount,
    salaryStructureCount,
    approvalHierarchyCount,
    company,
  ] = await Promise.all([
    prisma.employee.count({
      where: { org_id: companyId, deleted_at: null, status: { not: 'onboarding' } },
    }),
    prisma.leaveType.count({ where: { company_id: companyId, is_active: true } }),
    prisma.salaryComponent.count({ where: { company_id: companyId } }),
    prisma.salaryStructure.count({ where: { company_id: companyId } }),
    prisma.approvalHierarchy.count({ where: { company_id: companyId } }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { onboarding_completed: true, name: true },
    }),
  ]);

  return {
    companyName: company?.name ?? 'Your company',
    onboardingCompleted: Boolean(company?.onboarding_completed),
    employeeCount,
    leaveTypeCount,
    salaryComponentCount,
    salaryStructureCount,
    approvalHierarchyCount,
  };
}

export function formatSetupCopilot(
  snap: Awaited<ReturnType<typeof loadSetupSnapshot>>,
  ctx: AssistantContext
): string {
  const lines: string[] = [`**Setup status for ${snap.companyName}**`, ''];

  const tasks: Array<{ done: boolean; text: string; href: string }> = [
    {
      done: snap.leaveTypeCount > 0,
      text: 'Leave types configured',
      href: '/admin/company-settings',
    },
    {
      done: snap.employeeCount > 1,
      text: `Employees invited (${snap.employeeCount} total)`,
      href: '/admin/people',
    },
    {
      done: snap.approvalHierarchyCount > 0,
      text: 'Approval chains assigned',
      href: '/admin/people',
    },
    {
      done: snap.salaryComponentCount > 0,
      text: 'Salary **components** (Basic, HRA, PF…)',
      href: '/hr/salary-components',
    },
    {
      done: snap.salaryStructureCount > 0,
      text: `Per-employee **salary structures** (${snap.salaryStructureCount} rows)`,
      href: '/hr/salary-structures',
    },
  ];

  tasks.forEach((t) => {
    lines.push(`${t.done ? '✓' : '○'} ${t.text}`);
  });

  if (snap.salaryComponentCount > 0 && snap.salaryStructureCount === 0) {
    lines.push(
      '',
      '**Important:** Components alone do not run payroll. Add **one salary structure per employee** with annual CTC.'
    );
  }

  if (!snap.onboardingCompleted) {
    lines.push('', 'Finish the **company onboarding wizard** to unlock all defaults.');
  }

  lines.push('', 'Full checklist: **Admin → Getting Started**.');
  return lines.join('\n');
}
