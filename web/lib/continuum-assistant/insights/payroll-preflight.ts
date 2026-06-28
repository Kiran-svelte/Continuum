import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import type { AssistantContext } from '@/lib/continuum-assistant/types';

export type PayrollPreflightReport = {
  activeEmployees: number;
  missingSalaryStructures: Array<{ id: string; name: string; email: string }>;
  pendingRegularizations: number;
  salaryComponentCount: number;
};

export async function loadPayrollPreflight(
  ctx: AssistantContext
): Promise<PayrollPreflightReport | null> {
  if (!ctx.enabledModules.includes('payroll')) {
    return null;
  }

  if (
    !hasPermission(ctx.permissions, 'payroll.generate') &&
    !hasPermission(ctx.permissions, 'payroll.view_all') &&
    ctx.role !== 'admin' &&
    ctx.role !== 'hr'
  ) {
    return null;
  }

  const companyId = ctx.companyId;

  const employees = await prisma.employee.findMany({
    where: { org_id: companyId, deleted_at: null, status: { in: ['active', 'probation'] } },
    select: { id: true, first_name: true, last_name: true, email: true },
  });

  const structures = await prisma.salaryStructure.findMany({
    where: { company_id: companyId },
    select: { emp_id: true },
  });
  const withStructure = new Set(structures.map((s) => s.emp_id));

  const missing = employees
    .filter((e) => !withStructure.has(e.id))
    .map((e) => ({
      id: e.id,
      name: `${e.first_name} ${e.last_name}`.trim(),
      email: e.email,
    }));

  const [pendingRegularizations, salaryComponentCount] = await Promise.all([
    prisma.attendanceRegularization.count({
      where: { company_id: companyId, status: 'pending' },
    }),
    prisma.salaryComponent.count({ where: { company_id: companyId } }),
  ]);

  return {
    activeEmployees: employees.length,
    missingSalaryStructures: missing,
    pendingRegularizations,
    salaryComponentCount,
  };
}

export function formatPayrollPreflight(report: PayrollPreflightReport): string {
  const lines: string[] = ['**Payroll pre-flight check**', ''];

  if (report.salaryComponentCount === 0) {
    lines.push('⚠ No **salary components** configured — set up under HR → Salary Components first.');
  }

  if (report.missingSalaryStructures.length > 0) {
    lines.push(
      `⚠ **${report.missingSalaryStructures.length}** of **${report.activeEmployees}** active employees have **no salary structure (CTC)**. Payroll generate may skip or fail for them.`
    );
    report.missingSalaryStructures.slice(0, 5).forEach((e, i) => {
      lines.push(`${i + 1}. ${e.name} (${e.email})`);
    });
    if (report.missingSalaryStructures.length > 5) {
      lines.push(`…and ${report.missingSalaryStructures.length - 5} more.`);
    }
    lines.push('', '→ Assign CTC under **HR → Salary Structures** (not the same as components).');
  } else {
    lines.push(`✓ All **${report.activeEmployees}** active employees have a salary structure.`);
  }

  if (report.pendingRegularizations > 0) {
    lines.push(
      '',
      `⚠ **${report.pendingRegularizations}** attendance regularization(s) still **pending** — resolve before payroll for accurate LOP.`
    );
  } else {
    lines.push('', '✓ No pending attendance regularizations company-wide.');
  }

  lines.push('', 'Open **HR → Payroll** when ready to generate.');
  return lines.join('\n');
}
