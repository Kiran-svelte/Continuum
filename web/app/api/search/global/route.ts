import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { parseBoundedInt, parseDateKey, dateKeyToUtcRange } from '@/lib/api-guards';

export const dynamic = 'force-dynamic';

type SearchDomain = 'employees' | 'leaves' | 'policies' | 'audit';

type SearchItem = {
  id: string;
  domain: SearchDomain;
  title: string;
  subtitle?: string;
  meta?: string;
  href: string;
  createdAt?: string;
};

type SearchFilters = {
  employeeRole?: string;
  employeeStatus?: string;
  department?: string;
  leaveStatus?: string;
  dateFrom?: string;
  dateTo?: string;
};

const ALLOWED_DOMAINS: SearchDomain[] = ['employees', 'leaves', 'policies', 'audit'];

function normalizeDomains(raw: string | null): SearchDomain[] {
  if (!raw) return ALLOWED_DOMAINS;
  const parsed = raw
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter((d): d is SearchDomain => ALLOWED_DOMAINS.includes(d as SearchDomain));
  return parsed.length > 0 ? parsed : ALLOWED_DOMAINS;
}

function rolePortalPrefix(role: string): '/admin' | '/hr' | '/manager' | '/employee' {
  if (role === 'admin') return '/admin';
  if (role === 'hr' || role === 'director') return '/hr';
  if (role === 'manager' || role === 'team_lead') return '/manager';
  return '/employee';
}

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').trim();
    const limit = parseBoundedInt(searchParams.get('limit'), {
      defaultValue: 6,
      min: 1,
      max: 20,
    });
    const domains = normalizeDomains(searchParams.get('domains'));
    const filters: SearchFilters = {
      employeeRole: (searchParams.get('employeeRole') ?? '').trim() || undefined,
      employeeStatus: (searchParams.get('employeeStatus') ?? '').trim() || undefined,
      department: (searchParams.get('department') ?? '').trim() || undefined,
      leaveStatus: (searchParams.get('leaveStatus') ?? '').trim() || undefined,
      dateFrom: (searchParams.get('dateFrom') ?? '').trim() || undefined,
      dateTo: (searchParams.get('dateTo') ?? '').trim() || undefined,
    };

    const toDateOrNull = (value?: string): Date | null => {
      const key = parseDateKey(value ?? null);
      if (!key) return null;
      return dateKeyToUtcRange(key).start;
    };

    const dateFrom = toDateOrNull(filters.dateFrom);
    const dateTo = toDateOrNull(filters.dateTo);

    if ((filters.dateFrom && !dateFrom) || (filters.dateTo && !dateTo)) {
      return NextResponse.json(
        { error: 'Invalid date filter. Use YYYY-MM-DD format.' },
        { status: 400, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      return NextResponse.json(
        { error: 'Invalid date filter. dateFrom must be before or equal to dateTo.' },
        { status: 400, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    if (q.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters.' },
        { status: 400, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const role = employee.primary_role;
    const isAdminLike = role === 'admin' || role === 'hr' || role === 'director';
    const isManagerLike = role === 'manager' || role === 'team_lead';
    const canViewPolicies = isAdminLike;
    const canViewAudit = role === 'admin' || role === 'hr';

    let scopedEmployeeIds: string[] | null = null;
    if (isManagerLike) {
      const reports = await prisma.employee.findMany({
        where: {
          org_id: employee.org_id,
          manager_id: employee.id,
          deleted_at: null,
        },
        select: { id: true },
      });
      scopedEmployeeIds = [employee.id, ...reports.map((r) => r.id)];
    }

    const result: Record<SearchDomain, SearchItem[]> = {
      employees: [],
      leaves: [],
      policies: [],
      audit: [],
    };

    if (domains.includes('employees')) {
      const where: Record<string, unknown> = {
        org_id: employee.org_id,
        deleted_at: null,
        OR: [
          { first_name: { contains: q, mode: 'insensitive' } },
          { last_name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { designation: { contains: q, mode: 'insensitive' } },
          { department: { contains: q, mode: 'insensitive' } },
        ],
      };

      if (filters.employeeRole) {
        where.primary_role = filters.employeeRole;
      }
      if (filters.employeeStatus) {
        where.status = filters.employeeStatus;
      }
      if (filters.department) {
        where.department = { contains: filters.department, mode: 'insensitive' };
      }

      if (!isAdminLike) {
        if (isManagerLike && scopedEmployeeIds) {
          where.id = { in: scopedEmployeeIds };
        } else {
          where.id = employee.id;
        }
      }

      const employees = await prisma.employee.findMany({
        where,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          primary_role: true,
          department: true,
          designation: true,
          status: true,
          created_at: true,
        },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
        take: limit,
      });

      const portalPrefix = rolePortalPrefix(role);
      result.employees = employees.map((e) => ({
        id: e.id,
        domain: 'employees',
        title: `${e.first_name} ${e.last_name}`.trim(),
        subtitle: e.email,
        meta: [e.primary_role, e.department ?? undefined, e.designation ?? undefined, e.status]
          .filter(Boolean)
          .join(' | '),
        href: isAdminLike ? `/hr/employees/${e.id}` : `${portalPrefix}/team`,
        createdAt: e.created_at.toISOString(),
      }));

      if (!isAdminLike && !isManagerLike) {
        result.employees = result.employees.map((item) => ({
          ...item,
          href: '/employee/profile',
        }));
      }
    }

    if (domains.includes('leaves')) {
      const where: Record<string, unknown> = {
        company_id: employee.org_id,
        OR: [
          { reason: { contains: q, mode: 'insensitive' } },
          { leave_type: { contains: q, mode: 'insensitive' } },
          { status: { contains: q, mode: 'insensitive' } },
          { approver_comments: { contains: q, mode: 'insensitive' } },
        ],
      };

      if (filters.leaveStatus) {
        where.status = filters.leaveStatus;
      }
      if (dateFrom || dateTo) {
        const createdAtFilter: Record<string, Date> = {};
        if (dateFrom) createdAtFilter.gte = dateFrom;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          createdAtFilter.lte = end;
        }
        where.created_at = createdAtFilter;
      }

      if (!isAdminLike) {
        if (isManagerLike && scopedEmployeeIds) {
          where.emp_id = { in: scopedEmployeeIds };
        } else {
          where.emp_id = employee.id;
        }
      }

      const leaves = await prisma.leaveRequest.findMany({
        where,
        select: {
          id: true,
          leave_type: true,
          status: true,
          start_date: true,
          end_date: true,
          reason: true,
          created_at: true,
          employee: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
      });

      const leaveHref = isAdminLike
        ? '/hr/leave-requests'
        : isManagerLike
          ? '/manager/approvals'
          : '/employee/leave-history';

      result.leaves = leaves.map((lr) => ({
        id: lr.id,
        domain: 'leaves',
        title: `${lr.leave_type} (${lr.status})`,
        subtitle: `${lr.employee.first_name} ${lr.employee.last_name}`.trim(),
        meta: `${lr.start_date.toISOString().slice(0, 10)} to ${lr.end_date.toISOString().slice(0, 10)}`,
        href: leaveHref,
        createdAt: lr.created_at.toISOString(),
      }));
    }

    if (domains.includes('policies') && canViewPolicies) {
      const policyWhere = {
        company_id: employee.org_id,
        deleted_at: null,
        OR: [
          { rule_id: { contains: q, mode: 'insensitive' as const } },
          { name: { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
        ],
      };

      const [rules, activePolicy] = await Promise.all([
        prisma.leaveRule.findMany({
          where: policyWhere,
          select: {
            id: true,
            rule_id: true,
            name: true,
            category: true,
            is_active: true,
            is_blocking: true,
            priority: true,
            created_at: true,
          },
          orderBy: [{ priority: 'asc' }, { created_at: 'desc' }],
          take: limit,
        }),
        prisma.constraintPolicy.findFirst({
          where: {
            company_id: employee.org_id,
            is_active: true,
          },
          select: {
            id: true,
            version: true,
            created_at: true,
          },
          orderBy: { version: 'desc' },
        }),
      ]);

      result.policies = rules.map((rule) => ({
        id: rule.id,
        domain: 'policies',
        title: `${rule.rule_id} - ${rule.name}`,
        subtitle: `Category: ${rule.category}`,
        meta: `Priority ${rule.priority} | ${rule.is_active ? 'active' : 'inactive'} | ${rule.is_blocking ? 'blocking' : 'non-blocking'}`,
        href: '/hr/policy-settings',
        createdAt: rule.created_at.toISOString(),
      }));

      if (activePolicy && (String(activePolicy.version).includes(q) || q.toLowerCase().includes('policy'))) {
        result.policies.unshift({
          id: activePolicy.id,
          domain: 'policies',
          title: `Active policy version ${activePolicy.version}`,
          subtitle: 'Constraint policy snapshot',
          meta: `Created ${activePolicy.created_at.toISOString().slice(0, 10)}`,
          href: '/hr/policy-settings',
          createdAt: activePolicy.created_at.toISOString(),
        });
        result.policies = result.policies.slice(0, limit);
      }
    }

    if (domains.includes('audit') && canViewAudit) {
      const auditWhere: Record<string, unknown> = {
        company_id: employee.org_id,
        OR: [
          { action: { contains: q, mode: 'insensitive' } },
          { entity_type: { contains: q, mode: 'insensitive' } },
          { entity_id: { contains: q, mode: 'insensitive' } },
        ],
      };
      if (dateFrom || dateTo) {
        const createdAtFilter: Record<string, Date> = {};
        if (dateFrom) createdAtFilter.gte = dateFrom;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          createdAtFilter.lte = end;
        }
        auditWhere.created_at = createdAtFilter;
      }

      const logs = await prisma.auditLog.findMany({
        where: auditWhere,
        select: {
          id: true,
          action: true,
          entity_type: true,
          entity_id: true,
          created_at: true,
          actor: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
      });

      result.audit = logs.map((log) => ({
        id: log.id,
        domain: 'audit',
        title: `${log.action} (${log.entity_type})`,
        subtitle: `Entity: ${log.entity_id}`,
        meta: log.actor
          ? `By ${log.actor.first_name} ${log.actor.last_name}`
          : 'System action',
        href: role === 'admin' ? '/admin/audit-logs' : '/hr/audit-logs',
        createdAt: log.created_at.toISOString(),
      }));
    }

    const total =
      result.employees.length +
      result.leaves.length +
      result.policies.length +
      result.audit.length;

    return NextResponse.json(
      {
        query: q,
        domains,
        filters,
        total,
        result,
      },
      { headers: getRateLimitHeaders(rateLimit) }
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
