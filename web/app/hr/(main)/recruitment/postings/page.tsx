'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Plus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  employment_type: string;
  status: string;
  created_at: string;
  _count: { applications: number };
}

export default function JobPostingsPage() {
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPostings() {
      try {
        const response = await fetch('/api/job-postings', { credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        setPostings(data.postings ?? []);
      } finally {
        setLoading(false);
      }
    }

    void loadPostings();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <Link href="/hr/recruitment" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to Recruitment
      </Link>
      <PageHeader
        title="Job Postings"
        description="View and manage recruitment openings"
        icon={<Briefcase className="w-6 h-6" />}
        action={<Link href="/hr/recruitment/postings/new"><Button size="sm"><Plus className="w-4 h-4" /> Post a Job</Button></Link>}
      />
      <section className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full" />)}</div>
        ) : postings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No job postings found.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {postings.map((posting) => (
              <Link key={posting.id} href={`/hr/recruitment/postings/${posting.id}`} className="p-4 flex items-center justify-between gap-4 hover:bg-[var(--accent)]">
                <div>
                  <p className="font-medium">{posting.title}</p>
                  <p className="text-xs text-muted-foreground">{posting.department || 'No department'} · {posting.employment_type} · {posting._count.applications} applications</p>
                </div>
                <Badge variant={posting.status === 'published' ? 'success' : 'outline'}>{posting.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
