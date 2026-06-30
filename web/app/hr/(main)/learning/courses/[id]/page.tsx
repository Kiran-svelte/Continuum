'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  content_type: string;
  content_url: string | null;
  duration_minutes: number | null;
  is_mandatory: boolean;
  status: string;
}

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCourse() {
      try {
        const response = await fetch('/api/courses?status=all', { credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        setCourse((data.courses ?? []).find((item: Course) => item.id === params.id) ?? null);
      } finally {
        setLoading(false);
      }
    }

    void loadCourse();
  }, [params.id]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <Link href="/hr/learning" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to Learning
      </Link>

      <PageHeader title="Course Details" description="Review course metadata and content link" icon={<BookOpen className="w-6 h-6" />} />

      {loading ? (
        <Skeleton className="h-56 w-full" />
      ) : course ? (
        <section className="card p-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">{course.title}</h2>
            <Badge variant={course.status === 'published' ? 'success' : 'outline'}>{course.status}</Badge>
            {course.is_mandatory && <Badge variant="warning">Mandatory</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{course.description || 'No description provided.'}</p>
          <dl className="grid gap-4 md:grid-cols-2 text-sm">
            <div><dt className="text-muted-foreground">Category</dt><dd>{course.category || 'Uncategorized'}</dd></div>
            <div><dt className="text-muted-foreground">Content type</dt><dd>{course.content_type}</dd></div>
            <div><dt className="text-muted-foreground">Duration</dt><dd>{course.duration_minutes ? `${course.duration_minutes} minutes` : 'Not set'}</dd></div>
            <div><dt className="text-muted-foreground">Content URL</dt><dd>{course.content_url || 'Not set'}</dd></div>
          </dl>
        </section>
      ) : (
        <section className="card p-8 text-center text-muted-foreground">Course not found.</section>
      )}
    </div>
  );
}
