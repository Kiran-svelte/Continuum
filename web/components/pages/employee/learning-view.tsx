'use client';

/**
 * Employee Learning Portal — Self-Service
 *
 * Features:
 * - My enrolled courses with progress
 * - Available course library (auto-filtered to employee's department)
 * - Self-enroll with one click
 * - Progress update inline
 *
 * @module app/employee/(main)/learning/page
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import { BookOpen, Award, Clock, CheckCircle, Play, RefreshCw } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrolledCourse {
  id: string;
  course_id: string;
  status: string;
  progress_percent: number;
  completed_at: string | null;
  due_date: string | null;
  Course: {
    title: string;
    category: string | null;
    content_type: string;
    duration_minutes: number | null;
    content_url: string | null;
  };
}

interface AvailableCourse {
  id: string;
  title: string;
  category: string | null;
  content_type: string;
  duration_minutes: number | null;
  is_mandatory: boolean;
  myEnrollment: { status: string; progress_percent: number } | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LearningView() {
  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await ensureMe();
      const [enrollRes, coursesRes] = await Promise.allSettled([
        fetch('/api/course-enrollments', { credentials: 'include' }),
        fetch('/api/courses', { credentials: 'include' }),
      ]);

      if (enrollRes.status === 'fulfilled') {
        if (enrollRes.value.ok) {
          const data = await enrollRes.value.json();
          setEnrollments(data.enrollments ?? []);
        } else {
          toast.error('Failed to load enrollments');
        }
      } else {
        toast.error('Failed to load enrollments');
      }

      if (coursesRes.status === 'fulfilled') {
        if (coursesRes.value.ok) {
          const data = await coursesRes.value.json();
          setAvailableCourses(data.courses ?? []);
        } else {
          toast.error('Failed to load courses');
        }
      } else {
        toast.error('Failed to load courses');
      }
    } catch {
      toast.error('Failed to load learning data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEnroll = useCallback(async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      const res = await fetch('/api/course-enrollments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) throw new Error('Enrollment failed');
      toast.success('Enrolled successfully!');
      void fetchData();
    } catch {
      toast.error('Failed to enroll in course');
    } finally {
      setEnrollingId(null);
    }
  }, [fetchData]);

  const handleMarkProgress = useCallback(async (enrollmentId: string, progressPercent: number) => {
    try {
      const res = await fetch(`/api/course-enrollments?id=${enrollmentId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressPercent, status: progressPercent === 100 ? 'completed' : 'in_progress' }),
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success(progressPercent === 100 ? 'Course marked as complete! 🎉' : 'Progress updated');
      void fetchData();
    } catch {
      toast.error('Failed to update progress');
    }
  }, [fetchData]);

  const inProgress = enrollments.filter((e) => e.status === 'in_progress' || e.status === 'not_started');
  const completed = enrollments.filter((e) => e.status === 'completed');
  const unenrolled = availableCourses.filter((c) => !c.myEnrollment);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b border-[var(--border)] pb-6">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-7 h-7 text-[var(--primary)]" />
              <h1 className="text-3xl font-bold text-foreground">My Learning</h1>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">Courses, training materials, and learning progress</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard icon={<Play className="w-5 h-5 text-[var(--status-info)]" />} label="In Progress" value={isLoading ? '...' : String(inProgress.length)} />
            <KpiCard icon={<CheckCircle className="w-5 h-5 text-[var(--status-success)]" />} label="Completed" value={isLoading ? '...' : String(completed.length)} />
            <KpiCard icon={<BookOpen className="w-5 h-5 text-[var(--primary)]" />} label="Available" value={isLoading ? '...' : String(unenrolled.length)} />
          </div>

          {/* Active Courses */}
          {(isLoading || inProgress.length > 0) && (
            <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-[var(--border)]">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <Play className="w-4 h-4 text-[var(--status-info)]" /> Active Courses
                </h3>
              </div>
              {isLoading ? (
                <div className="p-4 sm:p-6 space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {inProgress.map((enrollment) => (
                    <div key={enrollment.id} className="p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{enrollment.Course.title}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {enrollment.Course.category ?? 'Uncategorized'}
                            {enrollment.Course.duration_minutes && ` · ${enrollment.Course.duration_minutes} min`}
                            {enrollment.due_date && ` · Due ${new Date(enrollment.due_date).toLocaleDateString('en-IN')}`}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-[var(--status-info)]">{enrollment.progress_percent}%</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 rounded-full mb-3 bg-[var(--muted)]/40">
                        <div className="h-2 rounded-full bg-[var(--status-info)] transition-all"
                          style={{ width: `${enrollment.progress_percent}%` }} />
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {enrollment.Course.content_url && (
                          <a href={enrollment.Course.content_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline">
                              <Play className="w-4 h-4 mr-1" /> Open Course
                            </Button>
                          </a>
                        )}
                        {[25, 50, 75, 100].filter((p) => p > enrollment.progress_percent).map((pct) => (
                          <Button key={pct} size="sm" variant="outline"
                            onClick={() => void handleMarkProgress(enrollment.id, pct)}
                            className="text-xs">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            {pct === 100 ? 'Mark Complete' : `${pct}%`}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Available Courses */}
          {unenrolled.length > 0 && (
            <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-[var(--border)]">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <BookOpen className="w-4 h-4" /> Available Courses
                </h3>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {unenrolled.map((course) => (
                  <div key={course.id} className="p-4 sm:p-6 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{course.title}</p>
                        {course.is_mandatory && (
                          <span className="text-[10px] bg-[var(--status-warning)]/20 text-[var(--status-warning)] rounded px-1.5 py-0.5">Mandatory</span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {course.category ?? 'Uncategorized'}
                        {course.duration_minutes && ` · ${course.duration_minutes} min`}
                      </p>
                    </div>
                    <Button size="sm" variant="outline"
                      disabled={enrollingId === course.id}
                      onClick={() => void handleEnroll(course.id)}>
                      Enroll
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Courses */}
          {completed.length > 0 && (
            <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-[var(--border)]">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <Award className="w-4 h-4 text-[var(--status-success)]" /> Completed Courses ({completed.length})
                </h3>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {completed.map((e) => (
                  <div key={e.id} className="p-4 sm:p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{e.Course.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        Completed {e.completed_at ? new Date(e.completed_at).toLocaleDateString('en-IN') : ''}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-[var(--status-success)]" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg p-4 flex flex-col gap-2 text-center items-center">
      {icon}
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}
