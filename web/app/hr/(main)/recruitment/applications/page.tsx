'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Application {
  id: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  created_at: string;
  JobPosting: { title: string; department: string | null };
}

export default function JobApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadApplications() {
      try {
        const response = await fetch('/api/job-applications', { credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        setApplications(data.applications ?? []);
      } finally {
        setLoading(false);
      }
    }

    void loadApplications();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <Link href="/hr/recruitment" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to Recruitment
      </Link>
      <PageHeader title="Applications" description="Review candidate applications" icon={<UserCheck className="w-6 h-6" />} />
      <section className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full" />)}</div>
        ) : applications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No applications found.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {applications.map((application) => (
              <Link key={application.id} href={`/hr/recruitment/applications/${application.id}`} className="p-4 flex items-center justify-between gap-4 hover:bg-[var(--accent)]">
                <div>
                  <p className="font-medium">{application.candidate_name}</p>
                  <p className="text-xs text-muted-foreground">{application.candidate_email} · {application.JobPosting.title}</p>
                </div>
                <Badge variant={application.status === 'hired' ? 'success' : 'outline'}>{application.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
