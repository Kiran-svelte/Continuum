'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, GitBranch, Users } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

type TreeNode = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  managerId: string | null;
  children: TreeNode[];
};

type FlatEmployee = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  primary_role: string;
  department: string | null;
  manager_id: string | null;
};

type ReportingTreeViewProps = {
  title?: string;
  subtitle?: string;
  employeesListHref?: string;
};

function buildForest(rows: FlatEmployee[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      name: `${row.first_name} ${row.last_name}`.trim(),
      email: row.email,
      role: row.primary_role,
      department: row.department,
      managerId: row.manager_id,
      children: [],
    });
  }

  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    if (node.managerId && nodes.has(node.managerId)) {
      nodes.get(node.managerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (list: TreeNode[]) => {
    list.sort((a, b) => a.name.localeCompare(b.name));
    list.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

function TreeBranch({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <li className="list-none">
      <div
        className="flex items-start gap-2 rounded-[var(--radius)] px-2 py-2 hover:bg-[var(--secondary)]"
        style={{ paddingLeft: `${depth * 1.25}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-0.5 text-[var(--muted-foreground)]"
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="inline-block w-4" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[var(--foreground)]">{node.name}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {node.role}
            {node.department ? ` · ${node.department}` : ''}
            {hasChildren ? ` · ${node.children.length} direct report(s)` : ''}
          </p>
        </div>
      </div>
      {hasChildren && open ? (
        <ul>
          {node.children.map((child) => (
            <TreeBranch key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function ReportingTreeView({
  title = 'Reporting Structure',
  subtitle = 'Org-wide hierarchy built from each employee’s reporting manager.',
  employeesListHref,
}: ReportingTreeViewProps) {
  const [rows, setRows] = useState<FlatEmployee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/employees?limit=500', { credentials: 'include' });
      if (!res.ok) {
        setError('Unable to load reporting structure.');
        setRows([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data.employees) ? data.employees : data.data ?? [];
      setRows(list);
    } catch {
      setError('Unable to load reporting structure.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.department ?? '').toLowerCase().includes(q) ||
        r.primary_role.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const forest = useMemo(() => buildForest(filtered), [filtered]);
  const unassigned = useMemo(
    () => filtered.filter((r) => !r.manager_id && r.primary_role !== 'admin').length,
    [filtered]
  );

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      <PageHeader
        title={title}
        description={subtitle}
        icon={<GitBranch className="h-6 w-6 text-[var(--primary)]" />}
        action={
          employeesListHref ? (
            <Link href={employeesListHref} className="btn btn-outline btn-sm no-underline">
              Manage employees
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search name, role, department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search reporting tree"
          className="sm:max-w-md"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          {filtered.length} people · {unassigned} without assigned manager
        </p>
      </div>

      <GlassPanel className="p-0">
        {loading ? (
          <p className="p-8 text-center text-[var(--muted-foreground)]">Loading reporting structure…</p>
        ) : error ? (
          <p className="p-8 text-center text-[var(--danger)]">{error}</p>
        ) : forest.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
            <p className="font-medium text-[var(--foreground)]">No employees to display</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Assign reporting managers when inviting or editing employees.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)] p-2">
            {forest.map((root) => (
              <TreeBranch key={root.id} node={root} />
            ))}
          </ul>
        )}
      </GlassPanel>
    </div>
  );
}
