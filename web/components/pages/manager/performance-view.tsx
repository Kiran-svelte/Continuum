'use client';

/**
 * Manager Performance Portal — Team Review Queue
 *
 * Features:
 * - View review instances where current user is the reviewer
 * - Submit ratings and comments inline
 * - See completion status per team member
 *
 * Module-aware: shows MODULE_DISABLED state when performance module is off.
 *
 * @module components/pages/manager/performance-view
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, CheckCircle, Clock, AlertCircle, Star } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewInstance {
  id: string;
  status: string;
  overall_rating: number | null;
  strengths: string | null;
  improvements: string | null;
  manager_comments: string | null;
  Reviewee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
  };
  ReviewCycle: {
    id: string;
    name: string;
    status: string;
    manager_review_deadline: string | null;
  };
}

// ─── View ─────────────────────────────────────────────────────────────────────

export default function ManagerPerformanceView() {
  const [instances, setInstances] = useState<ReviewInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModuleDisabled, setIsModuleDisabled] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ratingInput, setRatingInput] = useState<Record<string, { rating: string; strengths: string; improvements: string; comments: string }>>({});

  const fetchInstances = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/review-instances?role=reviewer', { credentials: 'include' });
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        if ((body as { error?: string }).error === 'MODULE_DISABLED') {
          setIsModuleDisabled(true);
          return;
        }
      }
      if (res.ok) {
        const data = await res.json();
        setInstances((data as { instances?: ReviewInstance[] }).instances ?? []);
      }
    } catch {
      toast.error('Failed to load review queue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  const handleSubmitReview = useCallback(async (instanceId: string) => {
    const form = ratingInput[instanceId];
    if (!form) return;

    const rating = parseFloat(form.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      toast.error('Rating must be between 1 and 5');
      return;
    }

    setSubmittingId(instanceId);
    try {
      const res = await fetch(`/api/review-instances?id=${instanceId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overallRating: rating,
          strengths: form.strengths,
          improvements: form.improvements,
          managerComments: form.comments,
          action: 'submit',
        }),
      });
      if (!res.ok) throw new Error('Submit failed');
      toast.success('Review submitted successfully');
      setExpandedId(null);
      void fetchInstances();
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setSubmittingId(null);
    }
  }, [ratingInput, fetchInstances]);

  const initFormForInstance = useCallback((instance: ReviewInstance) => {
    if (!ratingInput[instance.id]) {
      setRatingInput((prev) => ({
        ...prev,
        [instance.id]: {
          rating: instance.overall_rating !== null ? String(instance.overall_rating) : '',
          strengths: instance.strengths ?? '',
          improvements: instance.improvements ?? '',
          comments: instance.manager_comments ?? '',
        },
      }));
    }
    setExpandedId((prev) => (prev === instance.id ? null : instance.id));
  }, [ratingInput]);

  if (isModuleDisabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-8">
        <AlertCircle className="w-12 h-12 text-[var(--muted-foreground)]" />
        <h2 className="text-xl font-semibold text-[var(--foreground)]">Performance Module Disabled</h2>
        <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
          The Performance module has not been enabled for your organization.
        </p>
      </div>
    );
  }

  const pendingInstances = instances.filter((i) => i.status !== 'completed' && i.status !== 'submitted');
  const completedInstances = instances.filter((i) => i.status === 'completed' || i.status === 'submitted');

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="border-b border-[var(--border)] pb-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-7 h-7 text-[var(--primary)]" />
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Team Performance Reviews</h1>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">Submit and track reviews for your direct reports</p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard icon={<Clock className="w-5 h-5 text-[var(--status-warning)]" />} label="Pending Reviews" value={isLoading ? '…' : String(pendingInstances.length)} />
          <KpiCard icon={<CheckCircle className="w-5 h-5 text-[var(--status-success)]" />} label="Completed" value={isLoading ? '…' : String(completedInstances.length)} />
        </div>

        {/* Pending Reviews */}
        {pendingInstances.length > 0 && (
          <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg overflow-hidden">
            <div className="p-4 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--foreground)]">Pending Reviews</h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {pendingInstances.map((instance) => (
                <div key={instance.id} className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {instance.Reviewee.first_name} {instance.Reviewee.last_name}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {instance.Reviewee.department ?? 'No department'} · {instance.ReviewCycle.name}
                      </p>
                      {instance.ReviewCycle.manager_review_deadline && (
                        <p className="text-xs text-[var(--status-warning)] mt-0.5">
                          Due: {new Date(instance.ReviewCycle.manager_review_deadline).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" id={`review-btn-${instance.id}`} onClick={() => initFormForInstance(instance)}>
                      {expandedId === instance.id ? 'Close' : 'Review'}
                    </Button>
                  </div>

                  {expandedId === instance.id && (
                    <div className="space-y-3 border-t border-[var(--border)] pt-4">
                      <div>
                        <label htmlFor={`rating-${instance.id}`} className="text-xs font-medium text-[var(--foreground)]">
                          Overall Rating (1–5) <span className="text-[var(--danger)]">*</span>
                        </label>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              id={`star-${instance.id}-${star}`}
                              onClick={() => setRatingInput((prev) => ({ ...prev, [instance.id]: { ...(prev[instance.id] ?? { strengths: '', improvements: '', comments: '' }), rating: String(star) } }))}
                              className="p-0.5"
                              aria-label={`Rate ${star}`}
                            >
                              <Star
                                className={`w-6 h-6 transition-colors ${
                                  parseFloat(ratingInput[instance.id]?.rating ?? '0') >= star
                                    ? 'text-[var(--status-warning)] fill-[var(--status-warning)]'
                                    : 'text-[var(--border)]'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="text-sm text-[var(--muted-foreground)] ml-2">
                            {ratingInput[instance.id]?.rating || 'Not rated'}
                          </span>
                        </div>
                      </div>

                      {(['strengths', 'improvements', 'comments'] as const).map((field) => (
                        <div key={field}>
                          <label htmlFor={`${field}-${instance.id}`} className="text-xs font-medium text-[var(--foreground)] capitalize">
                            {field === 'comments' ? 'Manager Comments' : field}
                          </label>
                          <textarea
                            id={`${field}-${instance.id}`}
                            rows={2}
                            value={ratingInput[instance.id]?.[field] ?? ''}
                            onChange={(e) =>
                              setRatingInput((prev) => ({
                                ...prev,
                                [instance.id]: { ...(prev[instance.id] ?? { rating: '', strengths: '', improvements: '' }), [field]: e.target.value },
                              }))
                            }
                            className="mt-1 w-full bg-transparent border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
                            placeholder={field === 'comments' ? 'Manager feedback…' : `${field}…`}
                          />
                        </div>
                      ))}

                      <Button
                        id={`submit-review-${instance.id}`}
                        size="sm"
                        disabled={submittingId === instance.id || !ratingInput[instance.id]?.rating}
                        onClick={() => void handleSubmitReview(instance.id)}
                      >
                        {submittingId === instance.id ? 'Submitting…' : 'Submit Review'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Reviews */}
        {completedInstances.length > 0 && (
          <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg overflow-hidden">
            <div className="p-4 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--foreground)]">Completed Reviews</h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {completedInstances.map((instance) => (
                <div key={instance.id} className="p-4 sm:p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {instance.Reviewee.first_name} {instance.Reviewee.last_name}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">{instance.ReviewCycle.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {instance.overall_rating !== null && (
                      <span className="text-sm font-bold text-[var(--primary)]">{instance.overall_rating}/5</span>
                    )}
                    <Badge variant="default">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {instance.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && instances.length === 0 && (
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            <Target className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No review instances assigned to you yet.</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg p-4 flex flex-col gap-2 text-center items-center">
      {icon}
      <span className="text-2xl font-bold text-[var(--foreground)]">{value}</span>
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}
