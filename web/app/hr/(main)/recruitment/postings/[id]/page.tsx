'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface JobPosting {
  id: string;
  title: string;
  description: string;
  department: string | null;
  location: string | null;
  employment_type: string;
  status: string;
  salary_min: number | null;
  salary_max: number | null;
  _count: { applications: number; stages: number };
}

export default function JobPostingDetailPage() {
  const params = useParams<{ id: string }>();
  const [posting, setPosting] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPosting() {
      try {
        const response = await fetch('/api/job-postings', { credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        setPosting((data.postings ?? []).find((item: JobPosting) => item.id === params.id) ?? null);
      } finally {
        setLoading(false);
      }
    }

    void loadPosting();
  }, [params.id]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <Link href="/hr/recruitment/postings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to Job Postings
      </Link>
      <PageHeader title="Job Posting Details" description="Review opening details and application count" icon={<Briefcase className="w-6 h-6" />} />
      {loading ? (
        <Skeleton className="h-56 w-full" />
      ) : posting ? (
        <section className="card p-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">{posting.title}</h2>
            <Badge variant={posting.status === 'published' ? 'success' : 'outline'}>{posting.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{posting.description}</p>
          <dl className="grid gap-4 md:grid-cols-2 text-sm">
            <div><dt className="text-muted-foreground">Department</dt><dd>{posting.department || 'Not set'}</dd></div>
            <div><dt className="text-muted-foreground">Location</dt><dd>{posting.location || 'Not set'}</dd></div>
            <div><dt className="text-muted-foreground">Employment type</dt><dd>{posting.employment_type}</dd></div>
            <div><dt className="text-muted-foreground">Applications</dt><dd>{posting._count.applications}</dd></div>
          </dl>
        </section>
      ) : (
        <section className="card p-8 text-center text-muted-foreground">Job posting not found.</section>
      )}
    </div>
  );
}
