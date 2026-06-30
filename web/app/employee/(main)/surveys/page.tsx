'use client';

/**
 * Employee Surveys Page — RALPH-20260630-007
 *
 * Employee view: browse and respond to active surveys.
 *
 * @module app/employee/(main)/surveys/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, CheckCircle } from 'lucide-react';

interface Survey {
  id: string;
  title: string;
  description: string | null;
  anonymous: boolean;
  end_date: string | null;
  _count: { questions: number };
}

export default function EmployeeSurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/surveys', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => { setSurveys(d.surveys ?? []); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <PageHeader
        title="Surveys"
        description="Share your feedback with the company"
        icon={<ClipboardList className="w-6 h-6" />}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : surveys.length === 0 ? (
        <div className="card p-12 text-center">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No active surveys right now.</p>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)]">
          {surveys.map((s) => (
            <div key={s.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{s.title}</p>
                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{s._count.questions} questions</span>
                  {s.anonymous && <Badge variant="outline">Anonymous</Badge>}
                  {s.end_date && <span>Closes {new Date(s.end_date).toLocaleDateString()}</span>}
                </div>
              </div>
              <Button size="sm" className="gap-2 shrink-0">
                <CheckCircle className="w-4 h-4" />
                Respond
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
