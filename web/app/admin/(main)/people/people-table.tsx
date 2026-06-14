'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  primary_role: string;
  department: string | null;
  status: string;
  created_at: string;
}

interface PeopleTableProps {
  /** Pre-fetched employee list from server component */
  users: User[];
  /** Unique department names extracted server-side */
  departments: string[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_FILTER_VALUE = '__all__';

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Client-side people table with department and role filtering.
 * Receives data from the server component — no additional API calls needed.
 *
 * @param users - Employee records from the database
 * @param departments - Sorted list of unique department names
 */
export function PeopleTable({ users, departments }: PeopleTableProps) {
  const [departmentFilter, setDepartmentFilter] = useState(ALL_FILTER_VALUE);
  const [roleFilter, setRoleFilter] = useState(ALL_FILTER_VALUE);
  const [searchQuery, setSearchQuery] = useState('');

  const roles = useMemo(() => {
    return Array.from(new Set(users.map((u) => u.primary_role))).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    let result = users;

    if (departmentFilter !== ALL_FILTER_VALUE) {
      result = result.filter((u) => u.department === departmentFilter);
    }

    if (roleFilter !== ALL_FILTER_VALUE) {
      result = result.filter((u) => u.primary_role === roleFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(
        (u) =>
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      );
    }

    return result;
  }, [users, departmentFilter, roleFilter, searchQuery]);

  const hasActiveFilters =
    departmentFilter !== ALL_FILTER_VALUE ||
    roleFilter !== ALL_FILTER_VALUE ||
    searchQuery.trim() !== '';

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              aria-label="Filter by department"
              className="h-9 appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg-surface-hover)] pl-9 pr-8 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
            >
              <option value={ALL_FILTER_VALUE}>All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by role"
              className="h-9 appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg-surface-hover)] px-3 pr-8 text-sm text-[var(--foreground)] capitalize focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
            >
              <option value={ALL_FILTER_VALUE}>All Roles</option>
              {roles.map((role) => (
                <option key={role} value={role} className="capitalize">
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setDepartmentFilter(ALL_FILTER_VALUE);
                setRoleFilter(ALL_FILTER_VALUE);
                setSearchQuery('');
              }}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--bg-surface-hover)]"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search employees"
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface-hover)] pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-[var(--muted-foreground)]">
        Showing {filteredUsers.length} of {users.length} employees
        {departmentFilter !== ALL_FILTER_VALUE && ` in ${departmentFilter}`}
      </p>

      {/* Table */}
      <section className="card overflow-hidden p-0">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Name</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Role</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Department</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--bg-surface-hover)]">
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--foreground)]">{`${user.first_name} ${user.last_name}`.trim()}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{user.email}</p>
                </td>
                <td className="px-4 py-3 capitalize">{user.primary_role}</td>
                <td className="px-4 py-3">{user.department || 'Unassigned'}</td>
                <td className="px-4 py-3 capitalize">{user.status}</td>
                <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                  {new Date(user.created_at).toLocaleDateString('en-IN')}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]" colSpan={5}>
                  {hasActiveFilters
                    ? 'No employees match your filters. Try adjusting your criteria.'
                    : 'No users found for this organization.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
