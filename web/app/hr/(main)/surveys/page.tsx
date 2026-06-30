'use client';

/**
 * Surveys Page — RALPH-20260630-007
 *
 * HR view: create and manage employee surveys.
 * Employee view: browse and respond to active surveys.
 *
 * @module app/hr/(main)/surveys/page
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import { ClipboardList, Plus, Users, CheckCircle } from 'lucide-react';

interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: string;
  anonymous: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  _count: { questions: number; responses: number };
}

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'outline' {
  if (status === 'active') return 'success';
  if (status === 'closed') return 'default';
  return 'outline';
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await ensureMe();
      if (!me) return;
      const perms = (me.permissions ?? []) as string[];
      setCanManage(perms.includes('hr.manage_surveys'));

      const params = canManage ? '' : '';
      const res = await fetch(`/api/surveys${params}`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      setSurveys(data.surveys ?? []);
    } catch {
      toast.error('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => { void load(); }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Surveys"
        description="Gather employee feedback and measure engagement"
        icon={<ClipboardList className="w-6 h-6" />}
        action={canManage ? (
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Create Survey
          </Button>
        ) : undefined}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : surveys.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No surveys found.</p>
          {canManage && (
            <Button className="mt-4 gap-2" size="sm">
              <Plus className="w-4 h-4" />
              Create First Survey
            </Button>
          )}
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {surveys.map((survey) => (
            <div key={survey.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium truncate">{survey.title}</p>
                  <Badge variant={statusVariant(survey.status)}>{survey.status}</Badge>
                  {survey.anonymous && <Badge variant="outline">Anonymous</Badge>}
                </div>
                {survey.description && (
                  <p className="text-sm text-muted-foreground truncate">{survey.description}</p>
                )}
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ClipboardList className="w-3 h-3" />
                    {survey._count.questions} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {survey._count.responses} responses
                  </span>
                  {survey.end_date && (
                    <span>Closes {new Date(survey.end_date).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {survey.status === 'active' && !canManage && (
                  <Button size="sm" variant="outline" className="gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Respond
                  </Button>
                )}
                {canManage && (
                  <Button size="sm" variant="outline">Manage</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
