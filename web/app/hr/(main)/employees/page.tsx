'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  primary_role: string;
  department: string | null;
  designation: string | null;
  status: string;
  date_of_joining: string;
  manager: { first_name: string; last_name: string } | null;
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success',
  onboarding: 'info',
  probation: 'warning',
  on_notice: 'warning',
  suspended: 'danger',
  resigned: 'danger',
  terminated: 'danger',
  exited: 'default',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'text-purple-700 bg-purple-50',
  hr: 'text-blue-700 bg-blue-50',
  director: 'text-indigo-700 bg-indigo-50',
  manager: 'text-orange-700 bg-orange-50',
  team_lead: 'text-cyan-700 bg-cyan-50',
  employee: 'text-gray-700 bg-gray-100',
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadEmployees = useCallback(async (p: number, q: string, s: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (q) params.set('search', q);
      if (s) params.set('status', s);
      const res = await fetch(`/api/employees?${params}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load employees');
        return;
      }
      setEmployees(json.employees);
      setTotalPages(json.pagination.pages || 1);
      setTotal(json.pagination.total || 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadEmployees(page, search, statusFilter), 300);
    return () => clearTimeout(timer);
  }, [page, search, statusFilter, loadEmployees]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-500 mt-1">
            {total > 0 ? `${total} employees` : 'Manage your team'}
          </p>
        </div>
        <Button>
          ➕ Add Employee
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, email, designation…"
          className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="onboarding">Onboarding</option>
          <option value="probation">Probation</option>
          <option value="on_notice">On Notice</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div className="py-12 text-center text-sm text-gray-400">Loading…</div>}
          {error && !loading && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {!loading && !error && employees.length === 0 && (
            <div className="py-12 text-center">
              <span className="text-4xl">👥</span>
              <p className="text-gray-500 mt-3 text-sm">No employees found.</p>
            </div>
          )}
          {!loading && !error && employees.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 pr-4 text-gray-500 font-medium">Employee</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Role</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium hidden md:table-cell">Department</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium hidden lg:table-cell">Manager</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium hidden lg:table-cell">Joined</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-3 pl-2 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                            {emp.first_name[0]}{emp.last_name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</p>
                            <p className="text-xs text-gray-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[emp.primary_role] ?? 'bg-gray-100 text-gray-700'}`}>
                          {emp.primary_role}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-600 hidden md:table-cell">
                        {emp.department ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 px-2 text-gray-600 hidden lg:table-cell">
                        {emp.manager
                          ? `${emp.manager.first_name} ${emp.manager.last_name}`
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 px-2 text-gray-500 hidden lg:table-cell text-xs">
                        {formatDate(emp.date_of_joining)}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={STATUS_BADGE[emp.status] ?? 'default'}>{emp.status}</Badge>
                      </td>
                      <td className="py-3 pl-2">
                        <button className="text-xs text-blue-600 hover:underline font-medium">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ← Previous
              </Button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
