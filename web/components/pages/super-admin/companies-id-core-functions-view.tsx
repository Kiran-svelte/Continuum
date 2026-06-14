'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Check, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CoreFunctionDefinition, ModuleSlug } from '@/lib/core-functions/catalog';
import { MANDATORY_SLUGS } from '@/lib/core-functions/catalog';

interface ModulesResponse {
  companyId: string;
  companyName: string;
  catalog: CoreFunctionDefinition[];
  superAdminCap: ModuleSlug[];
  enabledModules: ModuleSlug[];
}

export default function CompaniesIdCoreFunctionsView() {
  const params = useParams();
  const companyId = typeof params?.id === 'string'
    ? params.id
    : Array.isArray(params?.id)
      ? (params.id[0] ?? '')
      : '';

  const [data, setData] = useState<ModulesResponse | null>(null);
  const [cap, setCap] = useState<ModuleSlug[]>([]);
  const [enabled, setEnabled] = useState<ModuleSlug[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/companies/${companyId}/modules`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load module configuration');
      setData(body);
      setCap(body.superAdminCap ?? []);
      setEnabled(body.enabledModules ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load module configuration');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) void load();
  }, [companyId, load]);

  const catalogBySlug = useMemo(() => {
    const map = new Map<ModuleSlug, CoreFunctionDefinition>();
    data?.catalog.forEach((item) => map.set(item.slug, item));
    return map;
  }, [data?.catalog]);

  const missingDependencies = useCallback(
    (item: CoreFunctionDefinition, nextCap = cap) =>
      item.dependsOn.filter((dep) => !nextCap.includes(dep)),
    [cap]
  );

  const toggleCap = (slug: ModuleSlug) => {
    if (MANDATORY_SLUGS.includes(slug)) return;
    setCap((current) => {
      const next = current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug];
      setEnabled((currentEnabled) => currentEnabled.filter((s) => next.includes(s)));
      return next;
    });
  };

  const toggleEnabled = (slug: ModuleSlug) => {
    if (MANDATORY_SLUGS.includes(slug) || !cap.includes(slug)) return;
    setEnabled((current) =>
      current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug]
    );
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/companies/${companyId}/modules`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ superAdminCap: cap, enabledModules: enabled }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || body.error || 'Failed to save modules');
      setCap(body.superAdminCap);
      setEnabled(body.enabledModules);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save modules');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)] p-6 text-[var(--foreground)]">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading module configuration...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] p-6 text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href={`/super-admin/companies/${companyId}`}
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to company
        </Link>

        <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">{data?.companyName}</p>
            <h1 className="text-2xl font-semibold">Core functions</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
              Super-admin cap controls what the tenant can ever enable. Default enabled modules are what the owner starts with during onboarding.
            </p>
          </div>
          <Button onClick={save} disabled={saving} className="inline-flex items-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </header>

        {error && (
          <div className="rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]">
            {error}
          </div>
        )}
        {savedAt && (
          <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm">
            Saved at {savedAt}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.catalog.map((item) => {
            const capped = cap.includes(item.slug);
            const on = enabled.includes(item.slug);
            const deps = missingDependencies(item);
            return (
              <article
                key={item.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[var(--muted-foreground)]">{item.id}</p>
                    <h2 className="mt-1 font-semibold">{item.name}</h2>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.description}</p>
                  </div>
                  {item.mandatory && (
                    <span className="rounded-full bg-[var(--primary)]/10 px-2 py-1 text-xs text-[var(--primary)]">
                      Mandatory
                    </span>
                  )}
                </div>

                {deps.length > 0 && (
                  <div className="mt-3 flex gap-2 rounded-md border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-2 text-xs text-[var(--foreground)]">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      Requires {deps.map((dep) => catalogBySlug.get(dep)?.name ?? dep).join(', ')} in cap.
                    </span>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCap(item.slug)}
                    disabled={item.mandatory}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      capped
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                        : 'border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]'
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {capped ? 'In cap' : 'Outside cap'}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleEnabled(item.slug)}
                    disabled={item.mandatory || !capped}
                    className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      on
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : 'border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]'
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {on && <Check className="h-4 w-4" />}
                    {on ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
