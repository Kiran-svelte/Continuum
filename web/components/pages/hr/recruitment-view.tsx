'use client';

/**
 * Recruitment Dashboard — HR Portal
 *
 * Features:
 * - Job postings pipeline view with application counts
 * - Candidate kanban summary by stage
 * - Recent applications table
 * - Quick action: create posting, view pipeline
 *
 * @module app/hr/(main)/recruitment/page
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
  Briefcase, Users, UserCheck, FileText,
  ChevronRight, Plus, TrendingUp, Send,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  status: string;
  employment_type: string;
  created_at: string;
  _count: { applications: number };
}

interface Application {
  id: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  current_stage: number;
  created_at: string;
  JobPosting: { title: string };
}

interface DashboardStats {
  openPositions: number;
  totalApplications: number;
  inInterview: number;
  offers: number;
}

// ─── Status Badge Helper ──────────────────────────────────────────────────────

function postingStatusVariant(status: string): 'default' | 'success' | 'warning' | 'info' | 'outline' {
  if (status === 'published') return 'success';
  if (status === 'closed') return 'default';
  if (status === 'draft') return 'outline';
  return 'outline';
}

function appStatusVariant(status: string): 'default' | 'success' | 'danger' | 'info' | 'outline' {
  if (status === 'hired') return 'success';
  if (status === 'offered') return 'info';
  if (status === 'rejected' || status === 'withdrawn') return 'danger';
  return 'outline';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecruitmentView() {
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ openPositions: 0, totalApplications: 0, inInterview: 0, offers: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await ensureMe();
      const [postingsRes, appsRes] = await Promise.allSettled([
        fetch('/api/job-postings', { credentials: 'include' }),
        fetch('/api/job-applications?pageSize=10', { credentials: 'include' }),
      ]);

      if (postingsRes.status === 'fulfilled' && postingsRes.value.ok) {
        const data = await postingsRes.value.json();
        const all: JobPosting[] = data.postings ?? [];
        setPostings(all);
        setStats((prev) => ({
          ...prev,
          openPositions: all.filter((p) => p.status === 'published').length,
          totalApplications: all.reduce((s, p) => s + p._count.applications, 0),
        }));
      }

      if (appsRes.status === 'fulfilled' && appsRes.value.ok) {
        const data = await appsRes.value.json();
        const apps: Application[] = data.applications ?? [];
        setRecentApplications(apps);
        setStats((prev) => ({
          ...prev,
          inInterview: apps.filter((a) => a.status === 'interviewing').length,
          offers: apps.filter((a) => a.status === 'offered').length,
        }));
      }
    } catch {
      toast.error('Failed to load recruitment data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      <PageHeader
        title="Recruitment & ATS"
        description="Job postings, candidate pipeline, interviews and offers"
        icon={<Briefcase className="w-6 h-6" />}
        action={
          <Link href="/hr/recruitment/postings/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" /> Post a Job
            </Button>
          </Link>
        }
      />

      {/* KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Briefcase className="w-5 h-5" />} label="Open Positions" value={isLoading ? '...' : String(stats.openPositions)} subtext="published jobs" />
        <KpiCard icon={<Users className="w-5 h-5" />} label="Total Applications" value={isLoading ? '...' : String(stats.totalApplications)} subtext="across all postings" />
        <KpiCard icon={<TrendingUp className="w-5 h-5" />} label="In Interview" value={isLoading ? '...' : String(stats.inInterview)} subtext="candidates active" />
        <KpiCard icon={<Send className="w-5 h-5" />} label="Offers Sent" value={isLoading ? '...' : String(stats.offers)} subtext="awaiting response" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Job Postings */}
        <section className="card p-0 col-span-1 lg:col-span-3 overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-h4 font-semibold">Active Job Postings</h3>
            <Link href="/hr/recruitment/postings" className="text-xs font-semibold text-[var(--info)] hover:underline flex items-center">
              All Postings <ChevronRight className="w-3 h-3 ml-1" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : postings.filter((p) => p.status === 'published').length === 0 ? (
            <div className="p-8 text-center">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No open positions</p>
              <p className="text-xs mt-1 text-[var(--muted-foreground)]">Post your first job to start hiring</p>
              <Link href="/hr/recruitment/postings/new">
                <Button className="mt-4" size="sm">Post a Job</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {postings.filter((p) => p.status === 'published').map((posting) => (
                <Link key={posting.id} href={`/hr/recruitment/postings/${posting.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[var(--accent)] transition-colors">
                  <div>
                    <p className="text-sm font-medium">{posting.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{posting.department ?? 'No Department'} · {posting.employment_type}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                      {posting._count.applications} applicant{posting._count.applications !== 1 ? 's' : ''}
                    </span>
                    <Badge variant={postingStatusVariant(posting.status)}>{posting.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Applications */}
        <section className="card p-0 col-span-1 lg:col-span-2 overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-h4 font-semibold flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Recent Candidates
            </h3>
            <Link href="/hr/recruitment/applications" className="text-xs font-semibold text-[var(--info)] hover:underline flex items-center">
              All <ChevronRight className="w-3 h-3 ml-1" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recentApplications.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted-foreground)]">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No applications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {recentApplications.slice(0, 8).map((app) => (
                <Link key={app.id} href={`/hr/recruitment/applications/${app.id}`}
                  className="flex items-center justify-between p-3 hover:bg-[var(--accent)] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{app.candidate_name}</p>
                    <p className="text-xs text-[var(--muted-foreground)] truncate">{app.JobPosting.title}</p>
                  </div>
                  <Badge variant={appStatusVariant(app.status)} className="ml-2 flex-shrink-0">
                    {app.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps { icon: React.ReactNode; label: string; value: string; subtext: string }

/**
 * Renders a single KPI metric card.
 */
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
