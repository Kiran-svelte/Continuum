'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

interface Enrollment {
  id: string;
  status: string;
  progress_percent: number;
}

export default function LearningReportsPage() {
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

  const stats = useMemo(() => ({
    total: enrollments.length,
    completed: enrollments.filter((item) => item.status === 'completed').length,
    averageProgress: enrollments.length
      ? Math.round(enrollments.reduce((sum, item) => sum + item.progress_percent, 0) / enrollments.length)
      : 0,
  }), [enrollments]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <Link href="/hr/learning" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to Learning
      </Link>
      <PageHeader title="Learning Reports" description="Track completion progress across enrollments" icon={<Clock className="w-6 h-6" />} />
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="card p-5"><p className="text-sm text-muted-foreground">Enrollments</p><p className="text-3xl font-semibold">{stats.total}</p></div>
          <div className="card p-5"><p className="text-sm text-muted-foreground">Completed</p><p className="text-3xl font-semibold">{stats.completed}</p></div>
          <div className="card p-5"><p className="text-sm text-muted-foreground">Average Progress</p><p className="text-3xl font-semibold">{stats.averageProgress}%</p></div>
        </section>
      )}
    </div>
  );
}
