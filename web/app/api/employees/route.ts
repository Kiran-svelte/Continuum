import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employees
 *
 * Returns a paginated list of employees for the authenticated user's company.
 * Only accessible by admin, hr, and director roles.
 *
 * Query params:
 *   page        - page number (default: 1)
 *   limit       - results per page (default: 50, max: 100)
 *   search      - filter by name or email
 *   status      - filter by EmployeeStatus
 *   department  - filter by department
 *   role        - filter by primary_role
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr', 'director', 'manager');

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const search = searchParams.get('search')?.trim() ?? '';
    const status = searchParams.get('status') ?? undefined;
    const department = searchParams.get('department')?.trim() ?? undefined;
    const role = searchParams.get('role') ?? undefined;
    const managerId = searchParams.get('manager_id') ?? undefined;

    const where: Record<string, unknown> = {
      org_id: employee.org_id!,
      deleted_at: null,
    };

    if (managerId) where.manager_id = managerId;

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (department) where.department = { contains: department, mode: 'insensitive' };
    if (role) where.primary_role = role;

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          primary_role: true,
          department: true,
          designation: true,
          status: true,
          date_of_joining: true,
          manager_id: true,
          manager: { select: { first_name: true, last_name: true } },
          created_at: true,
        },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.employee.count({ where }),
    ]);

    return NextResponse.json({
      employees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/employees
 *
 * Creates a new employee in the authenticated user's company.
 * Only accessible by admin and hr roles.
 *
 * Body:
 *   email, firstName, lastName, phone?, department?, designation?,
 *   role?, gender, dateOfJoining, managerId?
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr');

    const body = await request.json();
    const {
      email,
      firstName,
      lastName,
      phone,
      department,
      designation,
      role,
      gender,
      dateOfJoining,
      managerId,
    } = body;

    // ── Validation ──────────────────────────────────────────────────────
    const errors: string[] = [];

    if (!email || typeof email !== 'string') {
      errors.push('Email is required.');
    } else {
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!emailRegex.test(email.trim())) {
        errors.push('Email format is invalid.');
      }
      if (email.trim().length > 254) {
        errors.push('Email address exceeds maximum length.');
      }
    }

    if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
      errors.push('First name is required.');
    }

    if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
      errors.push('Last name is required.');
    }

    const validGenders = ['male', 'female', 'other'];
    if (!gender || !validGenders.includes(gender)) {
      errors.push('Gender must be one of: male, female, other.');
    }

    if (!dateOfJoining) {
      errors.push('Date of joining is required.');
    } else {
      const parsed = new Date(dateOfJoining);
      if (isNaN(parsed.getTime())) {
        errors.push('Date of joining is not a valid date.');
      }
    }

    const validRoles = ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'];
    if (role && !validRoles.includes(role)) {
      errors.push(`Role must be one of: ${validRoles.join(', ')}.`);
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    // ── Check for duplicate email within the company ────────────────────
    const existing = await prisma.employee.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        org_id: employee.org_id!,
        deleted_at: null,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An employee with this email already exists in your company.' },
        { status: 409 }
      );
    }

    // ── Create the employee ─────────────────────────────────────────────
    const newEmployee = await prisma.employee.create({
      data: {
        auth_id: crypto.randomUUID(),
        email: email.trim().toLowerCase(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone?.trim() || null,
        org_id: employee.org_id!,
        primary_role: role || 'employee',
        department: department?.trim() || null,
        designation: designation?.trim() || null,
        gender: gender,
        date_of_joining: new Date(dateOfJoining),
        manager_id: managerId || null,
        status: 'active',
      },
    });

    // ── Create default leave balances ───────────────────────────────────
    const currentYear = new Date().getFullYear();

    const activeLeaveTypes = await prisma.leaveType.findMany({
      where: {
        company_id: employee.org_id!,
        is_active: true,
        deleted_at: null,
      },
      select: {
        code: true,
        default_quota: true,
      },
    });

    if (activeLeaveTypes.length > 0) {
      await prisma.leaveBalance.createMany({
        data: activeLeaveTypes.map((lt) => ({
          emp_id: newEmployee.id,
          leave_type: lt.code,
          year: currentYear,
          annual_entitlement: lt.default_quota,
          carried_forward: 0,
          used_days: 0,
          pending_days: 0,
          encashed_days: 0,
          remaining: lt.default_quota,
          company_id: employee.org_id!,
        })),
      });
    }

    // ── Audit log ───────────────────────────────────────────────────────
    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.EMPLOYEE_CREATE,
      entityType: 'Employee',
      entityId: newEmployee.id,
      newState: {
        email: newEmployee.email,
        first_name: newEmployee.first_name,
        last_name: newEmployee.last_name,
        primary_role: newEmployee.primary_role,
        department: newEmployee.department,
        status: newEmployee.status,
      },
    });

    return NextResponse.json(
      {
        message: 'Employee created successfully.',
        employee: {
          id: newEmployee.id,
          email: newEmployee.email,
          first_name: newEmployee.first_name,
          last_name: newEmployee.last_name,
          primary_role: newEmployee.primary_role,
          department: newEmployee.department,
          designation: newEmployee.designation,
          status: newEmployee.status,
          date_of_joining: newEmployee.date_of_joining,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
