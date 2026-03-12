'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StaggerContainer, FadeIn, TiltCard } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  Clock, Users, Moon, Search, Plus, Edit2, Trash2, UserPlus, Loader2,
  AlertCircle, CheckCircle, Sun, CalendarClock,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface AssignedEmployee {
  assignment_id: string;
  emp_id: string;
  employee_name: string;
  department: string | null;
  effective_from: string;
}

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_default: boolean;
  created_at: string;
  assigned_count: number;
  assigned_employees: AssignedEmployee[];
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  department: string | null;
  designation: string | null;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

/** Determine if a shift is a night shift based on start_time / end_time */
function isNightShift(startTime: string, endTime: string): boolean {
  const startHour = parseInt(startTime.split(':')[0], 10);
  const endHour = parseInt(endTime.split(':')[0], 10);
  // Night shift: starts at 18:00 or later, or ends before start (crosses midnight)
  return startHour >= 18 || endHour < startHour;
}

/** Format time string for display */
function fmtTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Add/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editShift, setEditShift] = useState<Shift | null>(null);

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignShift, setAssignShift] = useState<Shift | null>(null);

  // Delete confirmation state
  const [deleteShift, setDeleteShift] = useState<Shift | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('18:00');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Assign form state
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignMessage, setAssignMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Employees list for assignment
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empSearch, setEmpSearch] = useState('');

  /* ─── Data Fetching ──────────────────────────────────────────────────── */

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      await ensureMe();
      const res = await fetch('/api/shifts', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load shifts');
      const data = await res.json();
      setShifts(data.shifts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Fetch employees when assign modal opens
  useEffect(() => {
    if (!showAssignModal) return;
    fetch('/api/employees?limit=200', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setEmployees(data.employees || []))
      .catch(() => {});
  }, [showAssignModal]);

  /* ─── Add / Edit handlers ────────────────────────────────────────────── */

  function openAdd() {
    setEditShift(null);
    setFormName('');
    setFormStartTime('09:00');
    setFormEndTime('18:00');
    setFormIsDefault(false);
    setFormMessage(null);
    setShowModal(true);
  }

  function openEdit(s: Shift) {
    setEditShift(s);
    setFormName(s.name);
    setFormStartTime(s.start_time);
    setFormEndTime(s.end_time);
    setFormIsDefault(s.is_default);
    setFormMessage(null);
    setShowModal(true);
  }

  async function handleSubmit() {
    setSaving(true);
    setFormMessage(null);
    try {
      if (!formName.trim()) throw new Error('Shift name is required');

      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!timeRegex.test(formStartTime)) throw new Error('Start time must be in HH:MM format');
      if (!timeRegex.test(formEndTime)) throw new Error('End time must be in HH:MM format');

      if (editShift) {
        // Update existing shift
        const res = await fetch('/api/shifts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: editShift.id,
            name: formName.trim(),
            start_time: formStartTime,
            end_time: formEndTime,
            is_default: formIsDefault,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to update shift');
        }
      } else {
        // Create new shift
        const res = await fetch('/api/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formName.trim(),
            start_time: formStartTime,
            end_time: formEndTime,
            is_default: formIsDefault,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to create shift');
        }
      }

      setFormMessage({ type: 'success', text: editShift ? 'Shift updated successfully' : 'Shift created successfully' });
      fetchShifts();
      setTimeout(() => setShowModal(false), 800);
    } catch (err) {
      setFormMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  /* ─── Assign handlers ────────────────────────────────────────────────── */

  function openAssign(s: Shift) {
    setAssignShift(s);
    setAssignEmployeeId('');
    setAssignEffectiveFrom(new Date().toISOString().slice(0, 10));
    setAssignMessage(null);
    setEmpSearch('');
    setShowAssignModal(true);
  }

  async function handleAssign() {
    if (!assignShift) return;
    setAssignSaving(true);
    setAssignMessage(null);
    try {
      if (!assignEmployeeId) throw new Error('Select an employee');
      if (!assignEffectiveFrom) throw new Error('Effective date is required');

      const res = await fetch('/api/shifts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          employee_id: assignEmployeeId,
          shift_id: assignShift.id,
          effective_from: assignEffectiveFrom,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to assign employee');
      }

      setAssignMessage({ type: 'success', text: 'Employee assigned to shift successfully' });
      fetchShifts();
      setTimeout(() => setShowAssignModal(false), 800);
    } catch (err) {
      setAssignMessage({ type: 'error', text: err instanceof Error ? err.message : 'Assignment failed' });
    } finally {
      setAssignSaving(false);
    }
  }

  /* ─── Delete handlers ────────────────────────────────────────────────── */

  async function handleDelete() {
    if (!deleteShift) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/shifts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: deleteShift.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete shift');
      }

      fetchShifts();
      setDeleteShift(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  /* ─── Computed values ────────────────────────────────────────────────── */

  const filteredShifts = search
    ? shifts.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : shifts;

  const totalShifts = shifts.length;
  const nightShiftCount = shifts.filter((s) => isNightShift(s.start_time, s.end_time)).length;
  const totalAssigned = shifts.reduce((sum, s) => sum + s.assigned_count, 0);

  const filteredEmployees = empSearch
    ? employees.filter((e) =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(empSearch.toLowerCase()) ||
        (e.department && e.department.toLowerCase().includes(empSearch.toLowerCase()))
      )
    : employees;

  /* ─── Render ─────────────────────────────────────────────────────────── */

  return (
    <StaggerContainer className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Shift Management"
        description="Create and manage employee work shifts"
        icon={<Clock className="w-6 h-6 text-primary" />}
        action={
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type="text"
                placeholder="Search shifts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white w-56 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <Button variant="primary" onClick={openAdd} className="gap-1">
              <Plus className="w-4 h-4" /> Add Shift
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Shifts', value: totalShifts, icon: Clock, color: 'blue' },
            { label: 'Night Shifts', value: nightShiftCount, icon: Moon, color: 'violet' },
            { label: 'Employees Assigned', value: totalAssigned, icon: Users, color: 'green' },
          ].map((card) => (
            <GlassPanel key={card.label} interactive>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-white/60 uppercase tracking-wide">{card.label}</p>
                    <p className="text-2xl font-bold mt-1 text-white">{card.value}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${card.color}-500/10`}>
                    <card.icon className={`h-5 w-5 text-${card.color}-500`} />
                  </div>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </FadeIn>

      {/* Shifts Table / Card List */}
      <FadeIn>
        <GlassPanel>
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">All Shifts</h3>
              <Badge variant="default" size="sm">
                {filteredShifts.length} shift{filteredShifts.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
          <div>
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="py-16 text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <p className="text-sm text-white/60">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={fetchShifts}>
                  Retry
                </Button>
              </div>
            ) : filteredShifts.length === 0 ? (
              <div className="py-16 text-center">
                <Clock className="w-10 h-10 text-white/60 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white">No shifts found</h3>
                <p className="text-sm text-white/60 mt-1">
                  {search ? 'Try a different search term.' : 'Create your first shift to get started.'}
                </p>
                {!search && (
                  <Button variant="primary" size="sm" className="mt-4" onClick={openAdd}>
                    Add Shift
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 text-left">
                        <th className="px-4 py-2.5 font-medium text-white/60">Shift Name</th>
                        <th className="px-4 py-2.5 font-medium text-white/60">Start Time</th>
                        <th className="px-4 py-2.5 font-medium text-white/60">End Time</th>
                        <th className="px-4 py-2.5 font-medium text-white/60">Type</th>
                        <th className="px-4 py-2.5 font-medium text-white/60 text-center">Assigned</th>
                        <th className="px-4 py-2.5 font-medium text-white/60 text-center">Status</th>
                        <th className="px-4 py-2.5 font-medium text-white/60 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShifts.map((s) => {
                        const night = isNightShift(s.start_time, s.end_time);
                        return (
                          <tr
                            key={s.id}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-white">{s.name}</p>
                            </td>
                            <td className="px-4 py-2.5 text-white/60">
                              {fmtTime(s.start_time)}
                            </td>
                            <td className="px-4 py-2.5 text-white/60">
                              {fmtTime(s.end_time)}
                            </td>
                            <td className="px-4 py-2.5">
                              {night ? (
                                <Badge variant="default" size="sm" className="bg-violet-500/20 text-violet-300">
                                  <Moon className="w-3 h-3 mr-1" /> Night
                                </Badge>
                              ) : (
                                <Badge variant="default" size="sm" className="bg-amber-500/20 text-amber-300">
                                  <Sun className="w-3 h-3 mr-1" /> Day
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="font-semibold text-white">{s.assigned_count}</span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {s.is_default ? (
                                <Badge variant="success" size="sm">
                                  Default
                                </Badge>
                              ) : (
                                <span className="text-xs text-white/60">--</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openAssign(s)}
                                  className="text-xs gap-1"
                                  title="Assign employee"
                                >
                                  <UserPlus className="w-3 h-3" /> Assign
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(s)}
                                  className="text-xs gap-1"
                                  title="Edit shift"
                                >
                                  <Edit2 className="w-3 h-3" /> Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteShift(s)}
                                  className="text-xs gap-1 text-red-400 hover:text-red-300"
                                  title="Delete shift"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-white/10">
                  {filteredShifts.map((s) => {
                    const night = isNightShift(s.start_time, s.end_time);
                    return (
                      <div key={s.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-white">{s.name}</p>
                            {night ? (
                              <Badge variant="default" size="sm" className="bg-violet-500/20 text-violet-300">
                                <Moon className="w-3 h-3 mr-1" /> Night
                              </Badge>
                            ) : (
                              <Badge variant="default" size="sm" className="bg-amber-500/20 text-amber-300">
                                <Sun className="w-3 h-3 mr-1" /> Day
                              </Badge>
                            )}
                            {s.is_default && (
                              <Badge variant="success" size="sm">
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openAssign(s)} className="text-xs">
                              <UserPlus className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="text-xs">
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteShift(s)}
                              className="text-xs text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-white/60">Start</p>
                            <p className="font-medium text-white">{fmtTime(s.start_time)}</p>
                          </div>
                          <div>
                            <p className="text-white/60">End</p>
                            <p className="font-medium text-white">{fmtTime(s.end_time)}</p>
                          </div>
                          <div>
                            <p className="text-white/60">Assigned</p>
                            <p className="font-semibold text-white">{s.assigned_count}</p>
                          </div>
                        </div>
                        {s.assigned_employees.length > 0 && (
                          <div className="text-xs text-white/60">
                            {s.assigned_employees.slice(0, 3).map((ae) => ae.employee_name).join(', ')}
                            {s.assigned_employees.length > 3 && ` +${s.assigned_employees.length - 3} more`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </GlassPanel>
      </FadeIn>

      {/* ─── Add / Edit Shift Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editShift ? 'Edit Shift' : 'Add Shift'}
        size="md"
      >
        <div className="space-y-4">
          {/* Shift Name */}
          <div>
            <label className="text-sm font-medium text-white">Shift Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Morning Shift"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-white">Start Time</label>
              <input
                type="time"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white">End Time</label>
              <input
                type="time"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Preview */}
          {formStartTime && formEndTime && (
            <div className="bg-white/5 rounded-lg p-3 text-xs space-y-1">
              <div className="flex items-center gap-2">
                {isNightShift(formStartTime, formEndTime) ? (
                  <Moon className="w-4 h-4 text-violet-500" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <span className="font-medium text-sm text-white">
                  {fmtTime(formStartTime)} - {fmtTime(formEndTime)}
                </span>
                <Badge
                  variant="default"
                  size="sm"
                  className={
                    isNightShift(formStartTime, formEndTime)
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }
                >
                  {isNightShift(formStartTime, formEndTime) ? 'Night Shift' : 'Day Shift'}
                </Badge>
              </div>
            </div>
          )}

          {/* Default toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-default"
              checked={formIsDefault}
              onChange={(e) => setFormIsDefault(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="is-default" className="text-sm text-white/60">
              Set as default shift
            </label>
          </div>

          {/* Message */}
          <AnimatePresence>
            {formMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-sm flex items-center gap-2 ${formMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}
              >
                {formMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {formMessage.text}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              {editShift ? 'Update' : 'Create'} Shift
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Assign Employee Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`Assign Employee to ${assignShift?.name || 'Shift'}`}
        size="md"
      >
        <div className="space-y-4">
          {/* Currently assigned */}
          {assignShift && assignShift.assigned_employees.length > 0 && (
            <div>
              <p className="text-xs font-medium text-white/60 uppercase tracking-wide mb-2">
                Currently Assigned ({assignShift.assigned_count})
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {assignShift.assigned_employees.map((ae) => (
                  <div
                    key={ae.assignment_id}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/5 text-xs"
                  >
                    <span className="font-medium text-white">{ae.employee_name}</span>
                    <span className="text-white/60">
                      {ae.department || '--'} &middot; from{' '}
                      {new Date(ae.effective_from).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employee search */}
          <div>
            <label className="text-sm font-medium text-white">Employee</label>
            <input
              type="text"
              placeholder="Search employee by name..."
              value={empSearch}
              onChange={(e) => {
                setEmpSearch(e.target.value);
                setAssignEmployeeId('');
              }}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {empSearch && filteredEmployees.length > 0 && !assignEmployeeId && (
              <div className="mt-1 border border-white/10 rounded-lg max-h-32 overflow-y-auto bg-black/60 backdrop-blur-xl">
                {filteredEmployees.slice(0, 10).map((e) => (
                  <button
                    key={e.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                    onClick={() => {
                      setAssignEmployeeId(e.id);
                      setEmpSearch(`${e.first_name} ${e.last_name}`);
                    }}
                  >
                    <span className="text-white">
                      {e.first_name} {e.last_name}
                    </span>{' '}
                    <span className="text-xs text-white/60">{e.department || ''}</span>
                  </button>
                ))}
              </div>
            )}
            {assignEmployeeId && (
              <p className="text-xs text-green-400 mt-1">Employee selected</p>
            )}
          </div>

          {/* Effective date */}
          <div>
            <label className="text-sm font-medium text-white">Effective From</label>
            <input
              type="date"
              value={assignEffectiveFrom}
              onChange={(e) => setAssignEffectiveFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Message */}
          <AnimatePresence>
            {assignMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-sm flex items-center gap-2 ${assignMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}
              >
                {assignMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {assignMessage.text}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAssign} disabled={assignSaving}>
              {assignSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              Assign Employee
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Confirmation Modal ───────────────────────────────────── */}
      <Modal
        isOpen={!!deleteShift}
        onClose={() => setDeleteShift(null)}
        size="sm"
        showCloseButton={false}
      >
        <div className="text-center py-4">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-red-500/20">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Delete Shift</h3>
          <p className="text-sm text-white/60">
            Are you sure you want to delete <strong className="text-white">{deleteShift?.name}</strong>?
            {deleteShift && deleteShift.assigned_count > 0 && (
              <span className="block mt-1 text-red-400">
                This shift has {deleteShift.assigned_count} assigned employee(s). Reassign them first.
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setDeleteShift(null)}
            disabled={deleting}
            className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 bg-red-600 text-white hover:bg-red-700"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </StaggerContainer>
  );
}
