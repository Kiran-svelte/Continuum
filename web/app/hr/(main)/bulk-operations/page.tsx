'use client';

/**
 * Bulk Operations HR Page — RALPH-20260630-018
 *
 * HR view: run and monitor bulk employee operations.
 *
 * @module app/hr/(main)/bulk-operations/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';

interface BulkJob {
  id: string;
  type: string;
  status: string;
  total: number;
  processed: number;
  errors: Array<{ emp_id: string; error: string }>;
  created_at: string;
  completed_at: string | null;
}

const statusIcon: Record<string, React.ReactNode> = {
  queued: <Clock className="w-4 h-4 text-yellow-500" />,
  processing: <Clock className="w-4 h-4 text-blue-500 animate-spin" />,
  done: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  failed: <XCircle className="w-4 h-4 text-red-500" />,
};

export default function BulkOperationsPage() {
  const [jobs, setJobs] = useState<BulkJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await ensureMe();
      if (!me) return;
      const r = await fetch('/api/bulk-operations', { credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      setJobs(d.jobs ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Bulk Operations"
        description="Mass updates for employee data, shifts, and leave"
        icon={<Layers className="w-6 h-6" />}
      />

      <div className="card p-5">
        <h3 className="font-semibold mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm">Bulk Salary Update</Button>
          <Button variant="outline" size="sm">Assign Shift</Button>
          <Button variant="outline" size="sm">Bulk Leave Grant</Button>
          <Button variant="outline" size="sm">Send Email Blast</Button>
          <Button variant="outline" size="sm">Import Employees</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Use the API endpoint <code className="bg-muted px-1 rounded">POST /api/bulk-operations</code> to run bulk operations programmatically.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Recent Jobs</h3>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="card p-8 text-center">
            <Layers className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No bulk jobs yet.</p>
          </div>
        ) : (
          <div className="card divide-y divide-[var(--border)]">
            {jobs.map((job) => (
              <div key={job.id} className="p-4 flex items-center gap-3">
                {statusIcon[job.status] ?? <Clock className="w-4 h-4" />}
                <div className="flex-1">
                  <p className="font-medium capitalize">{job.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.processed}/{job.total} processed
                    {job.errors.length > 0 && ` · ${job.errors.length} errors`}
                    {' · '}{new Date(job.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant={job.status === 'done' ? 'success' : job.status === 'failed' ? 'danger' : 'outline'}>
                  {job.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
