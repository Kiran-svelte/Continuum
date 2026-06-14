'use client';

import type { ComponentType } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Users, FileText, Shield, ClipboardList, Loader2, Download, Save, Trash2, LifeBuoy, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

type SearchResponse = {
  query: string;
  domains: SearchDomain[];
  filters?: SearchFilters;
  total: number;
  result: Record<SearchDomain, SearchItem[]>;
};

type SearchFilters = {
  employeeRole: string;
  employeeStatus: string;
  department: string;
  leaveStatus: string;
  dateFrom: string;
  dateTo: string;
};

type SharedSearchView = SearchPreset & {
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

type SearchPreset = {
  id: string;
  name: string;
  query: string;
  domains: SearchDomain[];
  filters?: SearchFilters;
};

const DOMAIN_LABELS: Record<SearchDomain, string> = {
  employees: 'Employees',
  leaves: 'Leave Requests',
  policies: 'Policies',
  audit: 'Audit Logs',
};

const DOMAIN_ICONS: Record<SearchDomain, ComponentType<{ className?: string }>> = {
  employees: Users,
  leaves: FileText,
  policies: ClipboardList,
  audit: Shield,
};

export function GlobalSearchPage({
  title,
  subtitle,
  defaultDomains,
  storageKey,
  canShareViews,
}: {
  title: string;
  subtitle: string;
  defaultDomains: SearchDomain[];
  storageKey: string;
  canShareViews: boolean;
}) {
  const [query, setQuery] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<SearchDomain[]>(defaultDomains);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [presets, setPresets] = useState<SearchPreset[]>([]);
  const [sharedViews, setSharedViews] = useState<SharedSearchView[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    employeeRole: '',
    employeeStatus: '',
    department: '',
    leaveStatus: '',
    dateFrom: '',
    dateTo: '',
  });

  const canSearch = query.trim().length >= 2 && selectedDomains.length > 0;
  const hasResults = Boolean(response && response.total > 0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SearchPreset[];
      if (Array.isArray(parsed)) {
        setPresets(parsed.slice(0, 10));
      }
    } catch {
      // Ignore malformed local storage entries and start fresh.
    }
  }, [storageKey]);

  useEffect(() => {
    let active = true;
    const loadSharedViews = async () => {
      try {
        const res = await fetch('/api/company/settings/search-views', {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!active) return;
        setSharedViews(Array.isArray(json.sharedViews) ? json.sharedViews : []);
      } catch {
        if (active) setSharedViews([]);
      }
    };
    void loadSharedViews();
    return () => {
      active = false;
    };
  }, []);

  const persistPresets = (next: SearchPreset[]) => {
    setPresets(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const totalByDomain = useMemo(() => {
    if (!response) return null;
    return selectedDomains.map((d) => ({
      domain: d,
      count: response.result[d]?.length ?? 0,
    }));
  }, [response, selectedDomains]);

  const toggleDomain = (domain: SearchDomain) => {
    setSelectedDomains((current) =>
      current.includes(domain) ? current.filter((d) => d !== domain) : [...current, domain]
    );
  };

  const saveCurrentView = () => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || selectedDomains.length === 0) {
      setError('Enter at least 2 characters and select one domain before saving a view.');
      return;
    }
    const name = window.prompt('Name this saved search view:');
    if (!name) return;

    const nextPreset: SearchPreset = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 40) || 'Saved View',
      query: trimmed,
      domains: selectedDomains,
      filters,
    };

    const deduped = [nextPreset, ...presets.filter((p) => p.name !== nextPreset.name)].slice(0, 10);
    persistPresets(deduped);
  };

  const saveSharedView = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || selectedDomains.length === 0) {
      setError('Enter at least 2 characters and select one domain before publishing a shared view.');
      return;
    }

    const name = window.prompt('Name this shared search view:');
    if (!name) return;

    try {
      const res = await fetch('/api/company/settings/search-views', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim().slice(0, 60),
          query: trimmed,
          domains: selectedDomains,
          filters,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to save shared view');
      }

      const nextView = json.sharedView as SharedSearchView;
      setSharedViews((current) => [nextView, ...current.filter((view) => view.id !== nextView.id)].slice(0, 25));
    } catch (err: any) {
      setError(err.message || 'Failed to save shared view');
    }
  };

  const deleteSharedView = async (viewId: string) => {
    try {
      const res = await fetch('/api/company/settings/search-views', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: viewId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to delete shared view');
      }
      setSharedViews((current) => current.filter((view) => view.id !== viewId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete shared view');
    }
  };

  const applyPreset = (preset: SearchPreset) => {
    setQuery(preset.query);
    setSelectedDomains(preset.domains);
    setFilters(
      preset.filters ?? {
        employeeRole: '',
        employeeStatus: '',
        department: '',
        leaveStatus: '',
        dateFrom: '',
        dateTo: '',
      }
    );
    setError('');
  };

  const deletePreset = (presetId: string) => {
    persistPresets(presets.filter((p) => p.id !== presetId));
  };

  const exportCsv = () => {
    if (!response) return;
    const rows: string[] = ['domain,title,subtitle,meta,href,created_at'];

    (Object.keys(response.result) as SearchDomain[]).forEach((domain) => {
      for (const item of response.result[domain]) {
        const values = [
          domain,
          item.title,
          item.subtitle ?? '',
          item.meta ?? '',
          item.href,
          item.createdAt ?? '',
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
        rows.push(values.join(','));
      }
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `continuum-search-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const buildHref = (item: SearchItem) => {
    if (item.domain === 'employees' && item.href.startsWith('/hr/employees/')) {
      return item.href;
    }
    if (item.domain === 'leaves') {
      const base = item.href;
      return `${base}${base.includes('?') ? '&' : '?'}requestId=${encodeURIComponent(item.id)}`;
    }
    if (item.domain === 'audit') {
      return `${item.href}${item.href.includes('?') ? '&' : '?'}entryId=${encodeURIComponent(item.id)}`;
    }
    return item.href;
  };

  const runSearch = async () => {
    if (!canSearch) return;
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        limit: '8',
        domains: selectedDomains.join(','),
      });

      if (filters.employeeRole.trim()) params.set('employeeRole', filters.employeeRole.trim());
      if (filters.employeeStatus.trim()) params.set('employeeStatus', filters.employeeStatus.trim());
      if (filters.department.trim()) params.set('department', filters.department.trim());
      if (filters.leaveStatus.trim()) params.set('leaveStatus', filters.leaveStatus.trim());
      if (filters.dateFrom.trim()) params.set('dateFrom', filters.dateFrom.trim());
      if (filters.dateTo.trim()) params.set('dateTo', filters.dateTo.trim());

      const res = await fetch(`/api/search/global?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Search failed');
      }

      setResponse(json);
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Global Enterprise Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by employee name, leave reason, rule ID, audit action..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void runSearch();
                }
              }}
            />
            <Button onClick={() => void runSearch()} disabled={!canSearch || loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Search
            </Button>
            <Button type="button" variant="outline" onClick={saveCurrentView} disabled={!canSearch || loading}>
              <Save className="w-4 h-4 mr-2" />
              Save View
            </Button>
            {canShareViews ? (
              <Button type="button" variant="outline" onClick={() => void saveSharedView()} disabled={!canSearch || loading}>
                <Save className="w-4 h-4 mr-2" />
                Share View
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={exportCsv} disabled={!hasResults || loading}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {presets.length > 0 ? (
            <div className="rounded-xl border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saved Views</p>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <div key={preset.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1">
                    <button
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="text-xs hover:text-primary transition"
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePreset(preset.id)}
                      className="text-muted-foreground hover:text-red-600 transition"
                      aria-label={`Delete ${preset.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {sharedViews.length > 0 ? (
            <div className="rounded-xl border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shared Views</p>
              <div className="flex flex-wrap gap-2">
                {sharedViews.map((view) => (
                  <div key={view.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 bg-muted/30">
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(view.query);
                        setSelectedDomains(view.domains);
                        setFilters(view.filters ?? filters);
                      }}
                      className="text-xs hover:text-primary transition"
                    >
                      {view.name}
                    </button>
                    {canShareViews ? (
                      <button
                        type="button"
                        onClick={() => void deleteSharedView(view.id)}
                        className="text-muted-foreground hover:text-red-600 transition"
                        aria-label={`Delete shared view ${view.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {(Object.keys(DOMAIN_LABELS) as SearchDomain[]).map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => toggleDomain(domain)}
                className={`px-3 py-1.5 rounded-full border text-sm transition ${
                  selectedDomains.includes(domain)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:border-primary/40'
                }`}
              >
                {DOMAIN_LABELS[domain]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border p-3">
            <Input
              value={filters.employeeRole}
              onChange={(e) => setFilters((prev) => ({ ...prev, employeeRole: e.target.value }))}
              placeholder="Employee role (admin/hr/manager/employee)"
            />
            <Input
              value={filters.employeeStatus}
              onChange={(e) => setFilters((prev) => ({ ...prev, employeeStatus: e.target.value }))}
              placeholder="Employee status (active/onboarding)"
            />
            <Input
              value={filters.department}
              onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
              placeholder="Department"
            />
            <Input
              value={filters.leaveStatus}
              onChange={(e) => setFilters((prev) => ({ ...prev, leaveStatus: e.target.value }))}
              placeholder="Leave status (pending/approved/rejected)"
            />
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 space-y-2">
              <p className="text-sm text-red-700">{error}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void runSearch()}>
                  Retry
                </Button>
                <Link href="/status" className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline">
                  <Activity className="w-3 h-3" />
                  Check status page
                </Link>
                <Link href="/support" className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline">
                  <LifeBuoy className="w-3 h-3" />
                  Contact support
                </Link>
              </div>
            </div>
          ) : null}
          {!error && query.trim().length > 0 && query.trim().length < 2 ? (
            <p className="text-sm text-amber-600">Enter at least 2 characters to search.</p>
          ) : null}
        </CardContent>
      </Card>

      {response ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">Total results: {response.total}</Badge>
            {totalByDomain?.map((item) => (
              <Badge key={item.domain} variant="info">
                {DOMAIN_LABELS[item.domain]}: {item.count}
              </Badge>
            ))}
          </div>

          {selectedDomains.map((domain) => {
            const items = response.result[domain] ?? [];
            const Icon = DOMAIN_ICONS[domain];

            return (
              <Card key={domain}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="w-4 h-4" />
                    {DOMAIN_LABELS[domain]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No matches in this domain.</p>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item) => (
                        <Link
                          key={`${item.domain}-${item.id}`}
                          href={buildHref(item)}
                          className="block rounded-lg border p-3 hover:bg-muted/50 transition"
                        >
                          <p className="font-medium">{item.title}</p>
                          {item.subtitle ? (
                            <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                          ) : null}
                          {item.meta ? <p className="text-xs text-muted-foreground mt-1">{item.meta}</p> : null}
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
