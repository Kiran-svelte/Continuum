'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Users, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type DirectoryRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  primary_role: string;
  status: string;
  manager_name: string | null;
};

type DirectoryViewProps = {
  title?: string;
  subtitle?: string;
};

export default function CompanyDirectoryView({
  title = 'Company Directory',
  subtitle = 'Find colleagues across your organization.',
}: DirectoryViewProps) {
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleDisabled, setModuleDisabled] = useState(false);

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    setModuleDisabled(false);

    const params = new URLSearchParams({ limit: '100' });
    if (search.trim()) params.set('search', search.trim());
    if (department.trim()) params.set('department', department.trim());

    try {
      const res = await fetch(`/api/directory?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        if (body?.error === 'MODULE_DISABLED') {
          setModuleDisabled(true);
          setRows([]);
          return;
        }
      }
      if (!res.ok) {
        setError('Unable to load directory.');
        setRows([]);
        return;
      }
      const data = await res.json();
      setRows(Array.isArray(data.employees) ? data.employees : []);
    } catch {
      setError('Unable to load directory.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, department]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDirectory();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadDirectory]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader title={title} description={subtitle} />

      {moduleDisabled ? (
        <GlassPanel className="p-8 text-center">
          <p className="text-[var(--muted-foreground)]">
            The company directory is not enabled for your organization.
          </p>
        </GlassPanel>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                className="pl-10"
                placeholder="Search by name, role, or department…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search directory"
              />
            </div>
            <Input
              className="sm:max-w-xs"
              placeholder="Filter department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              aria-label="Filter by department"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}

          <GlassPanel className="overflow-hidden p-0">
            {loading ? (
              <p className="p-8 text-center text-[var(--muted-foreground)]">Loading directory…</p>
            ) : rows.length === 0 ? (
              <p className="p-8 text-center text-[var(--muted-foreground)]">No people match your search.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {rows.map((person) => (
                  <li
                    key={person.id}
                    className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--foreground)]">
                        {person.first_name} {person.last_name}
                      </p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {person.designation || person.primary_role}
                        {person.department ? ` · ${person.department}` : ''}
                      </p>
                      {person.manager_name && (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Reports to {person.manager_name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{person.status}</Badge>
                      <a
                        href={`mailto:${person.email}`}
                        className="text-sm text-[var(--primary)] hover:underline"
                      >
                        {person.email}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>

          <p className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <Users className="h-3.5 w-3.5" />
            {rows.length} shown
            <Building2 className="ml-2 h-3.5 w-3.5" />
            Directory module
          </p>
        </>
      )}
    </div>
  );
}
