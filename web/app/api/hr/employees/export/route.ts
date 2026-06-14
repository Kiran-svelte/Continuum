import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, AuthError, requirePermissionGuard} from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function escapeCSVCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET(request: Request) {
  try {
    const employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'reports.export');
    requireCompanyContext(employee);

    const url = new URL(request.url);
    const query = getSingleParam(url.searchParams.get('query') ?? undefined).trim();
    const department = getSingleParam(url.searchParams.get('department') ?? undefined);
    const status = getSingleParam(url.searchParams.get('status') ?? undefined);

    const where: Record<string, unknown> = {
      org_id: employee.org_id,
      deleted_at: null,
    };

    const andFilters: Record<string, unknown>[] = [];

    if (query) {
      andFilters.push({
        OR: [
          { first_name: { contains: query, mode: 'insensitive' } },
          { last_name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { department: { contains: query, mode: 'insensitive' } },
          { designation: { contains: query, mode: 'insensitive' } },
          { id: { contains: query, mode: 'insensitive' } },
        ],
      });
    }

    if (department && department !== 'all') {
      andFilters.push({ department });
    }

    if (status && status !== 'all') {
      andFilters.push({ status });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 5000,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        designation: true,
        department: true,
        status: true,
        date_of_joining: true,
        created_at: true,
      },
    });

    const headers = [
      'Employee ID',
      'Name',
      'Email',
      'Role',
      'Department',
      'Status',
      'Joined',
    ];

    const rows = employees.map((employeeRow) => {
      const fullName = `${(employeeRow.first_name || '').trim()} ${(employeeRow.last_name || '').trim()}`.trim() || employeeRow.email;

      return [
        employeeRow.id,
        fullName,
        employeeRow.email,
        employeeRow.designation || 'Employee',
        employeeRow.department || 'Unassigned',
        employeeRow.status,
        new Date(employeeRow.date_of_joining || employeeRow.created_at).toLocaleDateString(),
      ];
    });

    const csv = ['\uFEFF' + headers.map(escapeCSVCell).join(','), ...rows.map((row) => row.map(escapeCSVCell).join(','))].join('\n');
    const filename = `employees-${employee.org_id || 'company'}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[HR EMPLOYEES EXPORT] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}