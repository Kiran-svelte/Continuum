'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ensureMe } from '@/lib/client-auth';
import {
  Star, Plus, Calendar, Users, CheckCircle,
  Clock, AlertTriangle,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface ReviewCycle {
  id: string;
  name: string;
  description: string | null;
  cycle_type: string;
  status: string;
  start_date: string;
  end_date: string;
  self_review_deadline: string | null;
  manager_review_deadline: string | null;
  rating_scale: number;
  is_calibration_enabled: boolean;
  _count: { instances: number };
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

/** Formats a status enum value for display. */
function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Returns the status icon based on cycle status. */
function statusIcon(status: string) {
  switch (status) {
    case 'completed': return <CheckCircle className="w-4 h-4 text-[var(--success)]" />;
    case 'active':
    case 'self_review':
    case 'manager_review': return <Clock className="w-4 h-4 text-[var(--info)]" />;
    case 'cancelled': return <AlertTriangle className="w-4 h-4 text-[var(--danger)]" />;
    default: return <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />;
  }
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function ReviewsView() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCycleType, setFormCycleType] = useState('annual');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formSelfDeadline, setFormSelfDeadline] = useState('');
  const [formManagerDeadline, setFormManagerDeadline] = useState('');
  const [formRatingScale, setFormRatingScale] = useState('5');
  const [formIsCalibration, setFormIsCalibration] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCycles = useCallback(async () => {
    setIsLoading(true);
    try {
      await ensureMe();
      const res = await fetch('/api/review-cycles', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setCycles(data.cycles || []);
    } catch {
      toast.error('Failed to load review cycles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCycles(); }, [fetchCycles]);

  async function handleCreateCycle() {
    if (!formName.trim() || !formStartDate || !formEndDate) {
      toast.error('Name, start date, and end date are required');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/review-cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          cycleType: formCycleType,
          startDate: formStartDate,
          endDate: formEndDate,
          selfReviewDeadline: formSelfDeadline || undefined,
          managerReviewDeadline: formManagerDeadline || undefined,
          ratingScale: parseInt(formRatingScale, 10) || 5,
          isCalibrationEnabled: formIsCalibration,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to create review cycle');
      }

      toast.success('Review cycle created');
      setShowCreateModal(false);
      resetForm();
      fetchCycles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create');
    } finally {
      setIsSaving(false);
    }
  }

  function resetForm() {
    setFormName('');
    setFormDescription('');
    setFormCycleType('annual');
    setFormStartDate('');
    setFormEndDate('');
    setFormSelfDeadline('');
    setFormManagerDeadline('');
    setFormRatingScale('5');
    setFormIsCalibration(false);
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      <PageHeader
        title="Review Cycles"
        description="Create and manage performance review cycles"
        icon={<Star className="w-6 h-6" />}
        action={
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> New Cycle
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : cycles.length === 0 ? (
        <div className="card p-12 text-center text-[var(--muted-foreground)]">
          <Star className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-base font-medium">No review cycles</p>
          <p className="text-sm mt-1">Create your first review cycle to start performance evaluations</p>
          <Button onClick={() => setShowCreateModal(true)} className="mt-4">Create Review Cycle</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cycles.map((cycle) => (
            <div key={cycle.id} className="card p-5 hover:border-[var(--primary)] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {statusIcon(cycle.status)}
                  <h3 className="text-sm font-semibold">{cycle.name}</h3>
                </div>
                <Badge variant={cycle.status === 'active' ? 'default' : 'outline'}>
                  {formatStatus(cycle.status)}
                </Badge>
              </div>

              {cycle.description && (
                <p className="text-xs text-[var(--muted-foreground)] mb-3 line-clamp-2">{cycle.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                  <Calendar className="w-3 h-3" />
                  {new Date(cycle.start_date).toLocaleDateString('en-IN')} – {new Date(cycle.end_date).toLocaleDateString('en-IN')}
                </div>
                <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                  <Users className="w-3 h-3" />
                  {cycle._count.instances} reviews
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border)]">
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  Type: {formatStatus(cycle.cycle_type)} • Rating: 1-{cycle.rating_scale}
                  {cycle.is_calibration_enabled && ' • Calibration ON'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Cycle Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Review Cycle">
        <div className="space-y-4">
          <div>
            <label htmlFor="cycle-name" className="text-xs font-semibold block mb-1">Cycle Name *</label>
            <Input id="cycle-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., FY 2025-26 Annual Review" />
          </div>
          <div>
            <label htmlFor="cycle-desc" className="text-xs font-semibold block mb-1">Description</label>
            <textarea
              id="cycle-desc"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Purpose and scope..."
              className="input w-full min-h-[60px] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cycle-type" className="text-xs font-semibold block mb-1">Cycle Type</label>
              <select id="cycle-type" value={formCycleType} onChange={(e) => setFormCycleType(e.target.value)} className="input w-full text-sm">
                <option value="quarterly">Quarterly</option>
                <option value="half_yearly">Half Yearly</option>
                <option value="annual">Annual</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label htmlFor="cycle-scale" className="text-xs font-semibold block mb-1">Rating Scale</label>
              <select id="cycle-scale" value={formRatingScale} onChange={(e) => setFormRatingScale(e.target.value)} className="input w-full text-sm">
                <option value="5">1-5</option>
                <option value="10">1-10</option>
                <option value="4">1-4</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cycle-start" className="text-xs font-semibold block mb-1">Start Date *</label>
              <Input id="cycle-start" type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="cycle-end" className="text-xs font-semibold block mb-1">End Date *</label>
              <Input id="cycle-end" type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cycle-self-dl" className="text-xs font-semibold block mb-1">Self Review Deadline</label>
              <Input id="cycle-self-dl" type="date" value={formSelfDeadline} onChange={(e) => setFormSelfDeadline(e.target.value)} />
            </div>
            <div>
              <label htmlFor="cycle-mgr-dl" className="text-xs font-semibold block mb-1">Manager Review Deadline</label>
              <Input id="cycle-mgr-dl" type="date" value={formManagerDeadline} onChange={(e) => setFormManagerDeadline(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="cycle-calibration"
              type="checkbox"
              checked={formIsCalibration}
              onChange={(e) => setFormIsCalibration(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="cycle-calibration" className="text-xs">Enable calibration phase</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateCycle} disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Cycle'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
