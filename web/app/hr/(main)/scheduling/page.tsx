'use client';

/**
 * Automated Scheduling HR Page — RALPH-20260630-020
 *
 * HR view: manage shift schedule templates.
 *
 * @module app/hr/(main)/scheduling/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Plus } from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';

interface ScheduleTemplate {
  id: string;
  name: string;
  description: string | null;
  type: string;
  rules: Array<{ day: string; shift_id: string; dept?: string }>;
  is_active: boolean;
  created_at: string;
}

export default function HRSchedulingPage() {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await ensureMe();
      if (!me) return;
      setIsAdmin(me.permissions?.includes('employee.edit_any') ?? false);
      const r = await fetch('/api/schedule-templates', { credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      setTemplates(d.templates ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Automated Scheduling"
        description="Create and manage shift schedule templates"
        icon={<Calendar className="w-6 h-6" />}
        action={isAdmin ? <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />New Template</Button> : undefined}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : templates.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No schedule templates created yet.</p>
          {isAdmin && <Button size="sm" className="mt-4 gap-2"><Plus className="w-4 h-4" />Create First Template</Button>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{t.name}</h3>
                  <Badge variant="outline" className="capitalize">{t.type}</Badge>
                  {!t.is_active && <Badge variant="outline">Inactive</Badge>}
                </div>
                {isAdmin && <Button size="sm" variant="outline">Edit</Button>}
              </div>
              {t.description && <p className="text-sm text-muted-foreground mb-2">{t.description}</p>}
              <p className="text-xs text-muted-foreground">{t.rules.length} rules configured</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
