'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ensureMe } from '@/lib/client-auth';
import {
  Megaphone, Briefcase, MapPin, Clock,
  Search, DollarSign, Send, CheckCircle,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface PublishedJob {
  id: string;
  title: string;
  description: string;
  department: string | null;
  location: string | null;
  employment_type: string;
  experience_min: number | null;
  experience_max: number | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  skills_required: string[];
  closes_at: string | null;
  created_at: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

/** Formats employment type for display. */
function formatEmploymentType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Formats salary range for display. */
function formatSalaryRange(min: number | null, max: number | null, currency: string): string {
  if (!min && !max) return 'Not disclosed';
  const fmt = (n: number) => {
    const lakhs = n / 100000;
    return lakhs >= 1 ? `${lakhs.toFixed(1)}L` : new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  };
  if (min && max) return `₹${fmt(min)} – ₹${fmt(max)} / yr`;
  if (min) return `From ₹${fmt(min)} / yr`;
  return `Up to ₹${fmt(max!)} / yr`;
}

/** Calculates how many days ago a posting was created. */
function daysAgo(dateString: string): string {
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function JobBoardView() {
  const [jobs, setJobs] = useState<PublishedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  // Track per-job applying state: jobId → 'idle' | 'loading' | 'applied'
  const [applyState, setApplyState] = useState<Record<string, 'idle' | 'loading' | 'applied'>>({});

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      await ensureMe();
      const res = await fetch('/api/job-postings?status=published', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setJobs(data.postings || []);
    } catch {
      toast.error('Failed to load job board');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  /** Submits a job application for the given posting. */
  const handleApply = async (jobId: string, jobTitle: string) => {
    setApplyState((prev) => ({ ...prev, [jobId]: 'loading' }));
    try {
      const res = await fetch('/api/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ job_posting_id: jobId }),
      });
      if (!res.ok) {
        const data = await res.json();
        // Handle duplicate application gracefully
        if (res.status === 409) {
          setApplyState((prev) => ({ ...prev, [jobId]: 'applied' }));
          toast.info(`You have already applied for "${jobTitle}".`);
          return;
        }
        throw new Error(data.error?.message || 'Failed to submit application');
      }
      setApplyState((prev) => ({ ...prev, [jobId]: 'applied' }));
      toast.success(`Application submitted for "${jobTitle}"! HR will be in touch.`);
    } catch (err) {
      setApplyState((prev) => ({ ...prev, [jobId]: 'idle' }));
      toast.error(err instanceof Error ? err.message : 'Failed to submit application');
    }
  };

  // Extract unique departments for filter
  const departments = [...new Set(jobs.map((j) => j.department).filter(Boolean))].sort() as string[];

  const filteredJobs = jobs.filter((j) => {
    if (departmentFilter && j.department !== departmentFilter) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return j.title.toLowerCase().includes(query) ||
      (j.department ?? '').toLowerCase().includes(query) ||
      (j.location ?? '').toLowerCase().includes(query);
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      <PageHeader
        title="Internal Job Board"
        description="Open positions across the company — apply or refer a friend"
        icon={<Megaphone className="w-6 h-6" />}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            type="text"
            placeholder="Search jobs, departments, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search job board"
          />
        </div>
        {departments.length > 0 && (
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="input text-sm py-2 px-3 rounded-md"
            aria-label="Filter by department"
          >
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <span className="text-xs text-[var(--muted-foreground)]">
          {filteredJobs.length} position{filteredJobs.length !== 1 ? 's' : ''} open
        </span>
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="card p-12 text-center text-[var(--muted-foreground)]">
          <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-base font-medium">No open positions</p>
          <p className="text-sm mt-1">Check back later for new opportunities</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredJobs.map((job) => (
              <motion.div
                key={job.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="card p-5 hover:border-[var(--primary)] transition-all flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold leading-tight">{job.title}</h3>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {formatEmploymentType(job.employment_type)}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)] mb-3">
                  {job.department && (
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.department}</span>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {job.experience_min != null ? `${job.experience_min}-${job.experience_max ?? '?'} yrs` : 'Any'}
                  </span>
                </div>

                <p className="text-xs text-[var(--muted-foreground)] line-clamp-3 flex-1">{job.description}</p>

                {job.skills_required.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {job.skills_required.slice(0, 5).map((skill) => (
                      <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                        {skill}
                      </span>
                    ))}
                    {job.skills_required.length > 5 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                        +{job.skills_required.length - 5} more
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
                  <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                    <DollarSign className="w-3 h-3" />
                    {formatSalaryRange(job.salary_min, job.salary_max, job.currency)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      Posted {daysAgo(job.created_at)}
                      {job.closes_at && ` • Closes ${new Date(job.closes_at).toLocaleDateString('en-IN')}`}
                    </span>
                    {applyState[job.id] === 'applied' ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Applied
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleApply(job.id, job.title)}
                        disabled={applyState[job.id] === 'loading'}
                        id={`btn-apply-${job.id}`}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        {applyState[job.id] === 'loading' ? 'Applying...' : 'Apply Now'}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
