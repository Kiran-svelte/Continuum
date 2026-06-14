import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, AuthError, requirePermissionGuard} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hr/departments
 * Returns a list of all departments in the company, optionally with employee counts.
 * Only accessible by hr, admin, and manager roles.
 */
export async function GET() {
  try {
    const employee = await getAuthEmployee();
    
    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // Allow HR, Admin, Manager, and Director roles to view departments
    requirePermissionGuard(employee, 'employee.view_team');
    requireCompanyContext(employee);

    const companyId = employee.org_id;

    // Get all unique departments from active employees
    const employees = await prisma.employee.findMany({
      where: {
        org_id: companyId,
        deleted_at: null,
        status: { in: ['active', 'probation'] },
      },
      select: {
        id: true,
        department: true,
      },
      distinct: ['department'],
      orderBy: { department: 'asc' },
    });

    // Extract unique departments and count employees in each
    const departmentMap = new Map<string, number>();
    for (const emp of employees) {
      const dept = emp.department || 'Unassigned';
      departmentMap.set(dept, (departmentMap.get(dept) || 0) + 1);
    }

    const departments = Array.from(departmentMap.entries())
      .map(([name, count]) => ({
        id: name, // Using department name as ID for simplicity
        name,
        employeeCount: count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      departments,
      total: departments.length,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
