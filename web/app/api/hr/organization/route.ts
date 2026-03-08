import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hr/organization
 * Returns department-level organization data aggregated from employee records.
 * Only accessible by admin, hr, director roles.
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
    requireRole(employee, 'admin', 'hr', 'director');

    const companyId = employee.org_id;

    // Get all active employees with their department and role info
    const employees = await prisma.employee.findMany({
      where: {
        org_id: companyId,
        deleted_at: null,
        status: { in: ['active', 'probation'] },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        department: true,
        primary_role: true,
        designation: true,
        status: true,
        date_of_joining: true,
      },
      orderBy: { first_name: 'asc' },
    });

    // Group by department
    const deptMap = new Map<string, typeof employees>();
    for (const emp of employees) {
      const dept = emp.department || 'Unassigned';
      if (!deptMap.has(dept)) deptMap.set(dept, []);
      deptMap.get(dept)!.push(emp);
    }

    const departments = Array.from(deptMap.entries()).map(([name, members]) => {
      // Find the most senior person (manager/director/hr) as dept head
      const head = members.find(m => 
        m.primary_role === 'director' || m.primary_role === 'manager' || m.primary_role === 'hr'
      );
      const roles = new Set(members.map(m => m.primary_role));
      return {
        name,
        employeeCount: members.length,
        head: head ? `${head.first_name} ${head.last_name}` : null,
        headRole: head?.primary_role ?? null,
        roles: Array.from(roles),
        members: members.map(m => ({
          id: m.id,
          name: `${m.first_name} ${m.last_name}`,
          role: m.primary_role,
          designation: m.designation,
          status: m.status,
          joinDate: m.date_of_joining?.toISOString().split('T')[0] ?? null,
        })),
      };
    }).sort((a, b) => b.employeeCount - a.employeeCount);

    // Get company info
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, size: true, industry: true },
    });

    return NextResponse.json({
      company,
      departments,
      totalEmployees: employees.length,
      totalDepartments: departments.length,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
