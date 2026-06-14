'use client';

/**
 * Learning Management System (LMS) Dashboard — HR Portal
 *
 * Features:
 * - Course library with enrollment counts
 * - Create/publish course management
 * - Mandatory vs optional course breakdown
 * - Completion rate KPIs
 *
 * @module app/hr/(main)/learning/page
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  BookOpen, Award, Users, Clock,
  ChevronRight, Plus, Filter, CheckCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  title: string;
  category: string | null;
  content_type: string;
  duration_minutes: number | null;
  is_mandatory: boolean;
  status: string;
  created_at: string;
  _count: { enrollments: number };
}

interface LmsStats {
  totalCourses: number;
  publishedCourses: number;
  mandatoryCourses: number;
  totalEnrollments: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LearningView() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<LmsStats>({ totalCourses: 0, publishedCourses: 0, mandatoryCourses: 0, totalEnrollments: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await ensureMe();
      const statusParam = filterStatus !== 'all' ? `?status=${filterStatus}` : '?status=all';
      const res = await fetch(`/api/courses${statusParam}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load courses');
      const data = await res.json();
      const all: Course[] = data.courses ?? [];
      setCourses(all);
      setStats({
        totalCourses: all.length,
        publishedCourses: all.filter((c) => c.status === 'published').length,
        mandatoryCourses: all.filter((c) => c.is_mandatory).length,
        totalEnrollments: all.reduce((s, c) => s + c._count.enrollments, 0),
      });
    } catch {
      toast.error('Failed to load LMS data');
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const contentTypeLabel = (type: string) => {
    const labels: Record<string, string> = { pdf: 'PDF', video: 'Video', pptx: 'Slides', document: 'Doc', link: 'Link', zip: 'Bundle' };
    return labels[type] ?? type;
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      <PageHeader
        title="Learning Management"
        description="Courses, enrollments, learning paths and completion tracking"
        icon={<BookOpen className="w-6 h-6" />}
        action={
          <Link href="/hr/learning/courses/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" /> New Course
            </Button>
          </Link>
        }
      />

      {/* KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<BookOpen className="w-5 h-5" />} label="Total Courses" value={isLoading ? '...' : String(stats.totalCourses)} subtext="in library" />
        <KpiCard icon={<CheckCircle className="w-5 h-5" />} label="Published" value={isLoading ? '...' : String(stats.publishedCourses)} subtext="live and accessible" />
        <KpiCard icon={<Award className="w-5 h-5" />} label="Mandatory" value={isLoading ? '...' : String(stats.mandatoryCourses)} subtext="required training" />
        <KpiCard icon={<Users className="w-5 h-5" />} label="Total Enrollments" value={isLoading ? '...' : String(stats.totalEnrollments)} subtext="across all courses" />
      </section>

      {/* Course Library */}
      <section className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center flex-wrap gap-3">
          <h3 className="text-h4 font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Course Library
          </h3>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--muted-foreground)]" />
            {(['all', 'published', 'draft', 'archived'] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filterStatus === s ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No courses found</p>
            <p className="text-xs mt-1 text-[var(--muted-foreground)]">Create your first course to start the learning program</p>
            <Link href="/hr/learning/courses/new">
              <Button className="mt-4" size="sm">Create Course</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  {['Course', 'Category', 'Type', 'Duration', 'Enrollments', 'Status', ''].map((h) => (
                    <th key={h} className="py-2 px-4 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm">
                {courses.map((course) => (
                  <tr key={course.id} className="border-b border-[var(--border)] hover:bg-[var(--accent)] transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{course.title}</p>
                        {course.is_mandatory && (
                          <span className="text-[10px] bg-orange-500/20 text-orange-400 rounded px-1.5 py-0.5">Mandatory</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[var(--muted-foreground)]">{course.category ?? '—'}</td>
                    <td className="py-3 px-4 text-xs">{contentTypeLabel(course.content_type)}</td>
                    <td className="py-3 px-4 text-xs text-[var(--muted-foreground)]">
                      {course.duration_minutes ? `${course.duration_minutes} min` : '—'}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold">{course._count.enrollments}</td>
                    <td className="py-3 px-4">
                      <Badge variant={course.status === 'published' ? 'success' : course.status === 'archived' ? 'warning' : 'outline'}>
                        {course.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/hr/learning/courses/${course.id}`}
                        className="text-xs text-[var(--info)] hover:underline flex items-center gap-1">
                        Manage <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/hr/learning/enrollments', icon: <Users className="w-5 h-5" />, label: 'Manage Enrollments', desc: 'Enroll teams, view completion' },
          { href: '/hr/learning/paths', icon: <Award className="w-5 h-5" />, label: 'Learning Paths', desc: 'Structured multi-course tracks' },
          { href: '/hr/learning/reports', icon: <Clock className="w-5 h-5" />, label: 'Completion Reports', desc: 'Track team learning progress' },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="card p-4 flex items-center gap-4 hover:bg-[var(--accent)] transition-colors">
            <div className="bg-[var(--muted)] w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 ml-auto text-[var(--muted-foreground)]" />
          </Link>
        ))}
      </section>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps { icon: React.ReactNode; label: string; value: string; subtext: string }

function KpiCard({ icon, label, value, subtext }: KpiCardProps) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="bg-[var(--muted)] w-10 h-10 rounded-md flex items-center justify-center">{icon}</div>
      <span className="text-xs font-semibold text-[var(--muted-foreground)]">{label}</span>
      <span className="text-display text-2xl leading-none">{value}</span>
      <span className="text-xs text-[var(--muted-foreground)]">{subtext}</span>
    </div>
  );
}
