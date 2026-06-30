'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

interface Course {
  id: string;
  title: string;
  category: string | null;
  is_mandatory: boolean;
}

export default function LearningPathsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCourses() {
      try {
        const response = await fetch('/api/courses?status=all', { credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        setCourses(data.courses ?? []);
      } finally {
        setLoading(false);
      }
    }

    void loadCourses();
  }, []);

  const mandatory = courses.filter((course) => course.is_mandatory);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <Link href="/hr/learning" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to Learning
      </Link>
      <PageHeader title="Learning Paths" description="Use mandatory courses as the current path baseline" icon={<Award className="w-6 h-6" />} />
      <section className="card p-6">
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : mandatory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No mandatory courses are configured yet. Create a course and mark it mandatory to start a path.</p>
        ) : (
          <div className="space-y-3">
            {mandatory.map((course) => (
              <Link key={course.id} href={`/hr/learning/courses/${course.id}`} className="block rounded-lg border border-[var(--border)] p-4 hover:bg-[var(--accent)]">
                <p className="font-medium">{course.title}</p>
                <p className="text-xs text-muted-foreground">{course.category || 'Uncategorized'}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
