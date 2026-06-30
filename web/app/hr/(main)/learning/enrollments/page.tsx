'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Enrollment {
  id: string;
  status: string;
  progress_percent: number;
  due_date: string | null;
  Course: { title: string; category: string | null; content_type: string; duration_minutes: number | null };
}

export default function LearningEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEnrollments() {
      try {
        const response = await fetch('/api/course-enrollments', { credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        setEnrollments(data.enrollments ?? []);
      } finally {
        setLoading(false);
      }
    }

    void loadEnrollments();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <Link href="/hr/learning" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to Learning
      </Link>
      <PageHeader title="Learning Enrollments" description="Review course enrollment progress" icon={<Users className="w-6 h-6" />} />
      <section className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full" />)}</div>
        ) : enrollments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No enrollments found.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {enrollments.map((enrollment) => (
              <div key={enrollment.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{enrollment.Course.title}</p>
                  <p className="text-xs text-muted-foreground">{enrollment.Course.category || 'Uncategorized'} · {enrollment.progress_percent}% complete</p>
                </div>
                <Badge variant={enrollment.status === 'completed' ? 'success' : 'outline'}>{enrollment.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
