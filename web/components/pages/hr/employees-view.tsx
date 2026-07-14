import React from 'react';
import Link from 'next/link';
import { Search, UserPlus, Filter, Download, MoreVertical, Edit2, ShieldAlert, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { redirect } from 'next/navigation';
import prisma from "@/lib/prisma";
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import type { Prisma } from '@prisma/client';
import type { EmployeeStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Checkbox, Input, Select } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;
const VALID_EMPLOYEE_STATUSES: EmployeeStatus[] = [
  'active',
  'onboarding',
  'probation',
  'on_notice',
  'suspended',
  'resigned',
  'terminated',
  'exited',
];

function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    query.set(key, String(value));
  }

  return query.toString();
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmployeesView({ searchParams }: PageProps) {
  let authEmployee;
  try {
    authEmployee = await getAuthEmployee();
    requirePermissionGuard(authEmployee, 'employee.view_team');
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/sign-in?redirect=/hr/employees&error=auth_required`);
    }
    throw err;
  }

  if (!authEmployee.org_id) {
    redirect('/onboarding');
  }

  const companyId = authEmployee.org_id;
  const resolvedSearchParams = (await searchParams) ?? {};

  const searchQuery = getSingleParam(resolvedSearchParams.query).trim();
  const selectedDepartment = getSingleParam(resolvedSearchParams.department);
  const selectedStatus = getSingleParam(resolvedSearchParams.status);
  const currentPage = Math.max(1, Number.parseInt(getSingleParam(resolvedSearchParams.page) || '1', 10) || 1);

  const where: Prisma.EmployeeWhereInput = {
    org_id: companyId,
    deleted_at: null,
  };
  const tenantScopeSignature = { where: { org_id: companyId, deleted_at: null } };
  void tenantScopeSignature;

  const filters: Prisma.EmployeeWhereInput[] = [];

  if (searchQuery) {
    filters.push({
      OR: [
        { first_name: { contains: searchQuery, mode: 'insensitive' } },
        { last_name: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
        { department: { contains: searchQuery, mode: 'insensitive' } },
        { designation: { contains: searchQuery, mode: 'insensitive' } },
        { id: { contains: searchQuery, mode: 'insensitive' } },
      ],
    });
  }

  if (selectedDepartment && selectedDepartment !== 'all') {
    filters.push({ department: selectedDepartment });
  }

  if (selectedStatus && selectedStatus !== 'all') {
    const normalizedStatus = selectedStatus.toLowerCase();
    if (VALID_EMPLOYEE_STATUSES.includes(normalizedStatus as EmployeeStatus)) {
      filters.push({ status: normalizedStatus as EmployeeStatus });
    }
  }

  if (filters.length > 0) {
    where.AND = filters;
  }

  let employees: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    status: string;
    joinDate: string;
    init: string;
  }> = [];
  let totalEmployees = 0;
  let dbActive = true;

  try {
    console.info('[HR DIRECTORY] Loading employees', {
      actorId: authEmployee.id,
      companyId,
      searchQuery,
      selectedDepartment,
      selectedStatus,
      currentPage,
    });

    totalEmployees = await prisma.employee.count({ where });

    const dbData = await prisma.employee.findMany({
      where,
      take: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
      orderBy: { created_at: 'desc' },
    });

    employees = dbData.map((e) => {
      const firstName = (e.first_name || '').trim();
      const lastName = (e.last_name || '').trim();
      const fullName = `${firstName} ${lastName}`.trim() || e.email;
      const firstInitial = firstName.charAt(0) || e.email.charAt(0) || 'U';
      const lastInitial = lastName.charAt(0) || firstName.charAt(1) || 'N';

      return {
        id: e.id,
        name: fullName,
        email: e.email,
        role: e.designation || 'Employee',
        department: e.department || 'Unassigned',
        status: e.status,
        joinDate: new Date(e.date_of_joining || e.created_at).toLocaleDateString(),
        init: `${firstInitial}${lastInitial}`.toUpperCase(),
      };
    });
  } catch (error) {
    dbActive = false;
    employees = [];
    console.error('[HR DIRECTORY] Failed to load company employees', {
      actorId: authEmployee.id,
      companyId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const totalPages = Math.max(1, Math.ceil(totalEmployees / PAGE_SIZE));
  const pageHref = (pageNumber: number) => {
    const query = buildQueryString({
      query: searchQuery,
      department: selectedDepartment,
      status: selectedStatus,
      page: pageNumber,
    });

    return query ? `/hr/employees?${query}` : '/hr/employees';
  };

  const exportHref = (() => {
    const query = buildQueryString({
      query: searchQuery,
      department: selectedDepartment,
      status: selectedStatus,
    });

    return query ? `/api/hr/employees/export?${query}` : '/api/hr/employees/export';
  })();

  const pageNumbers = (() => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 2) {
      return [1, 2, 3];
    }

    if (currentPage >= totalPages - 1) {
      return [totalPages - 2, totalPages - 1, totalPages];
    }

    return [currentPage - 1, currentPage, currentPage + 1];
  })();

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
      {/* Header aligned for heavy administration */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-2 gap-4">
        <div>
          <h1 className="text-display flex items-center gap-3">
             Employee Directory
             {!dbActive && <span className="text-[10px] bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 px-2 rounded-full uppercase tracking-wider font-bold">Data Unavailable</span>}
          </h1>
          <p className="text-body mt-2 max-w-xl">Master overview of all personnel across the organization framework. High-density view optimized for bulk actions.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <a className="btn btn-secondary" href={exportHref} download>
            <Download className="w-4 h-4" /> Export CSV
          </a>
          <Link className="btn btn-primary" href="/hr/employees/invite">
            <UserPlus className="w-4 h-4" /> Add Employee
          </Link>
        </div>
      </header>

      {/* Advanced Filter Toolbar */}
      <form className="card p-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-[var(--background)] shadow-sm" method="get">
        <div className="flex w-full sm:w-[400px] relative items-center group">
          <Search className="absolute left-3 w-4 h-4 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors" />
          <Input
            type="text"
            name="query"
            defaultValue={searchQuery}
            className="input pl-9 h-11 w-full text-sm"
            placeholder="Search by name, email, or employee ID..."
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Select
            name="department"
            defaultValue={selectedDepartment || 'all'}
            className="input h-11 text-sm w-[150px] cursor-pointer"
            aria-label="Filter employees by department"
            title="Filter employees by department"
          >
            <option value="all">All Departments</option>
            <option value="Unassigned">Unassigned</option>
            <option value="Engineering">Engineering</option>
            <option value="Product">Product</option>
            <option value="Sales">Sales</option>
          </Select>
          <Select
            name="status"
            defaultValue={selectedStatus || 'all'}
            className="input h-11 text-sm w-[140px] cursor-pointer"
            aria-label="Filter employees by status"
            title="Filter employees by status"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="onboarding">Onboarding</option>
            <option value="probation">Probation</option>
            <option value="suspended">Suspended</option>
            <option value="terminated">Terminated</option>
          </Select>
          <Button className="btn btn-secondary h-11 px-3" title="Apply filters" aria-label="Apply filters" type="submit" variant="secondary">
            <Filter className="w-4 h-4 text-[var(--muted-foreground)]" />
          </Button>
        </div>
      </form>

      {/* High-Density Data Table */}
      <div className="card p-0 overflow-x-auto shadow-md border-[var(--border)]">
        <div className="min-w-[1000px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="py-3 px-4 w-12 bg-[var(--secondary)] border-b border-[var(--border)]">
                  <Checkbox aria-label="Select all employees" title="Select all employees" className="rounded border-[var(--muted-foreground)] text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4 cursor-pointer" />
                </th>
                <th className="py-3 px-4 text-[11px] font-bold text-[var(--muted-foreground)] border-b border-[var(--border)] uppercase tracking-wider bg-[var(--secondary)]">Employee</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[var(--muted-foreground)] border-b border-[var(--border)] uppercase tracking-wider bg-[var(--secondary)]">Role & Dept</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[var(--muted-foreground)] border-b border-[var(--border)] uppercase tracking-wider bg-[var(--secondary)]">Status</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[var(--muted-foreground)] border-b border-[var(--border)] uppercase tracking-wider bg-[var(--secondary)]">Joined</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[var(--muted-foreground)] border-b border-[var(--border)] uppercase tracking-wider bg-[var(--secondary)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="group hover:bg-[var(--muted)] transition-colors border-b border-[var(--border)] last:border-b-0">
                  <td className="py-3 px-4">
                    <Checkbox aria-label={`Select ${emp.name}`} title={`Select ${emp.name}`} className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4 cursor-pointer opacity-50 group-hover:opacity-100 transition-opacity" />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-800 to-[var(--primary)] flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                        {emp.init}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[var(--foreground)] truncate">{emp.name}</p>
                        <div className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)] truncate mt-0.5">
                          <Mail className="w-3 h-3" /> {emp.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium text-[var(--foreground)]">{emp.role}</div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{emp.department}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      emp.status.toLowerCase() === 'active' ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20' 
                      : emp.status.toLowerCase() === 'onboarding' ? 'bg-[var(--status-warning)]/10 text-[var(--status-warning)] border-[var(--status-warning)]/20'
                      : 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20'
                    }`}>
                      {emp.status.toLowerCase() === 'suspended' && <ShieldAlert className="w-3 h-3 mr-1" />}
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--muted-foreground)] font-medium">
                    {emp.joinDate}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end items-center gap-1">
                      <Link
                        className="p-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-md transition-colors tooltip-trigger"
                        title="Edit Employee"
                        href={`/hr/employees/${emp.id}`}
                        aria-label={`Edit ${emp.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <Link
                        className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] rounded-md transition-colors"
                        title="View employee details"
                        aria-label={`View details for ${emp.name}`}
                        href={`/hr/employees/${emp.id}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-sm text-[var(--muted-foreground)]">
                    No employees found for this company yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-sm text-[var(--muted-foreground)] bg-[var(--card)]">
                      <div>
                        Showing <span className="font-bold text-[var(--foreground)]">{employees.length}</span> of{' '}
                        <span className="font-bold text-[var(--foreground)]">{totalEmployees}</span> personnel
                      </div>
            <div className="flex gap-2">
                        <Link className={`btn btn-secondary btn-sm px-3 ${currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}`} href={pageHref(Math.max(1, currentPage - 1))} aria-disabled={currentPage <= 1}>
                          <ChevronLeft className="w-4 h-4" />
                        </Link>
                        {pageNumbers.map((pageNumber) => {
                          const isActive = pageNumber === currentPage;

                          return (
                            <Link
                              key={pageNumber}
                              className={`btn btn-secondary btn-sm px-3 ${isActive ? 'bg-[var(--muted)] text-[var(--foreground)] font-bold' : ''}`}
                              href={pageHref(pageNumber)}
                              aria-current={isActive ? 'page' : undefined}
                            >
                              {pageNumber}
                            </Link>
                          );
                        })}
                        <Link className={`btn btn-secondary btn-sm px-3 ${currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}`} href={pageHref(Math.min(totalPages, currentPage + 1))} aria-disabled={currentPage >= totalPages}>
                          <ChevronRight className="w-4 h-4" />
                        </Link>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

