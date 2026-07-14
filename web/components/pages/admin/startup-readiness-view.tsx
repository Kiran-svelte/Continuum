'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

type Json = Record<string, any>;

export default function StartupReadinessView() {
  const [checklist, setChecklist] = React.useState<any[]>([]);
  const [integrations, setIntegrations] = React.useState<any[]>([]);
  const [alerts, setAlerts] = React.useState<Json>({});
  const [ops, setOps] = React.useState<Json | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [c, i, a, o] = await Promise.all([
        fetch('/api/onboarding/checklist', { credentials: 'include' }).then((r) => r.json()).catch(() => null),
        fetch('/api/settings/integrations', { credentials: 'include' }).then((r) => r.json()).catch(() => null),
        fetch('/api/settings/alerts', { credentials: 'include' }).then((r) => r.json()).catch(() => null),
        fetch('/api/ops/startup-readiness', { credentials: 'include' }).then((r) => r.json()).catch(() => null),
      ]);
      if (!c && !i && !a && !o) {
        setLoadError('Failed to load startup readiness data. Please refresh.');
      }
      setChecklist(c?.checklist || []);
      setIntegrations(i?.connectors || []);
      setAlerts(a?.alerts || {});
      setOps(o?.readiness || null);
    } catch {
      setLoadError('Unexpected error loading data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => void load(), [load]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading startup readiness...</div>;
  if (loadError) return <div className="p-6 text-sm text-destructive">{loadError}</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Startup Readiness</h1>
        <p className="text-sm text-muted-foreground">Activation, integrations, alerts, and operational health in one view.</p>
      </div>

      <section className="card p-4">
        <h2 className="font-medium mb-3">Onboarding Checklist</h2>
        {checklist.length === 0 ? (
          <p className="text-sm text-muted-foreground">No onboarding tasks yet. Add tasks to guide first value.</p>
        ) : (
          <div className="space-y-2">
            {checklist.map((task) => (
              <div key={task.id} className="flex items-center justify-between border rounded p-2">
                <span>{task.label}</span>
                <span className="text-xs text-muted-foreground">{task.completed ? 'Completed' : 'Pending'}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="font-medium mb-3">Integrations</h2>
        {integrations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No connectors configured yet.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {integrations.map((connector) => (
              <div key={connector.id} className="border rounded p-3">
                <p className="font-medium">{connector.label}</p>
                <p className="text-xs text-muted-foreground">Status: {connector.status}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="font-medium mb-3">Alerts</h2>
        <pre className="text-xs bg-muted p-3 rounded overflow-auto">{JSON.stringify(alerts, null, 2)}</pre>
      </section>

      <section className="card p-4">
        <h2 className="font-medium mb-3">Operational Readiness</h2>
        <pre className="text-xs bg-muted p-3 rounded overflow-auto">{JSON.stringify(ops, null, 2)}</pre>
      </section>

      <Button onClick={load}>Refresh</Button>
    </div>
  );
}
