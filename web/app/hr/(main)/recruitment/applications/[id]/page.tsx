'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Application {
  id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string | null;
  resume_url: string | null;
  cover_letter: string | null;
  source: string;
  status: string;
  JobPosting: { title: string; department: string | null };
}

export default function JobApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadApplication() {
      try {
        const response = await fetch('/api/job-applications', { credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        setApplication((data.applications ?? []).find((item: Application) => item.id === params.id) ?? null);
      } finally {
        setLoading(false);
      }
    }

    void loadApplication();
  }, [params.id]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <Link href="/hr/recruitment/applications" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to Applications
      </Link>
      <PageHeader title="Application Details" description="Review candidate details and application status" icon={<UserCheck className="w-6 h-6" />} />
      {loading ? (
        <Skeleton className="h-56 w-full" />
      ) : application ? (
        <section className="card p-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">{application.candidate_name}</h2>
            <Badge variant={application.status === 'hired' ? 'success' : 'outline'}>{application.status}</Badge>
          </div>
          <dl className="grid gap-4 md:grid-cols-2 text-sm">
            <div><dt className="text-muted-foreground">Email</dt><dd>{application.candidate_email}</dd></div>
            <div><dt className="text-muted-foreground">Phone</dt><dd>{application.candidate_phone || 'Not set'}</dd></div>
            <div><dt className="text-muted-foreground">Job</dt><dd>{application.JobPosting.title}</dd></div>
            <div><dt className="text-muted-foreground">Source</dt><dd>{application.source}</dd></div>
          </dl>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{application.cover_letter || 'No cover letter provided.'}</p>
        </section>
      ) : (
        <section className="card p-8 text-center text-muted-foreground">Application not found.</section>
      )}
    </div>
  );
}
