'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface Holiday {
  id: string;
  name: string;
  date: string;
  country_code: string;
  is_custom: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function toInputDate(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Skeleton loader for the table
function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 animate-pulse"
        >
          <div className="h-4 w-40 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-5 w-16 bg-muted rounded-full" />
          <div className="ml-auto h-8 w-20 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

// Empty state
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <CalendarDays className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        No holidays found
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        There are no upcoming holidays configured. Add custom holidays for your
        organization to keep everyone informed.
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="w-4 h-4" />
        Add Holiday
      </Button>
    </motion.div>
  );
}

// Status message component
function StatusMessage({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: 'success' | 'error';
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
        type === 'success'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
          : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      <span className="flex-1">{message}</span>
      <button
        onClick={onDismiss}
        className="p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// Add / Edit modal
function HolidayFormModal({
  holiday,
  onClose,
  onSubmit,
  saving,
}: {
  holiday: Holiday | null;
  onClose: () => void;
  onSubmit: (name: string, date: string) => void;
  saving: boolean;
}) {
  const isEdit = holiday !== null;
  const [name, setName] = useState(holiday?.name ?? '');
  const [date, setDate] = useState(
    holiday ? toInputDate(holiday.date) : ''
  );
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Holiday name is required.');
      return;
    }
    if (!date) {
      setError('Date is required.');
      return;
    }
    setError('');
    onSubmit(name.trim(), date);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <Card className="border-border/60 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {isEdit ? 'Edit Holiday' : 'Add Holiday'}
              </CardTitle>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="holiday-name"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Holiday Name
                </label>
                <input
                  id="holiday-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Company Foundation Day"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label
                  htmlFor="holiday-date"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Date
                </label>
                <input
                  id="holiday-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
              {error && (
                <p className="text-sm text-red-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </p>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isEdit ? 'Update Holiday' : 'Add Holiday'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// Delete confirmation modal
function DeleteConfirmModal({
  holiday,
  onClose,
  onConfirm,
  deleting,
}: {
  holiday: Holiday;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        <Card className="border-border/60 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Delete Holiday
              </h3>
              <p className="text-sm text-muted-foreground mb-1">
                Are you sure you want to delete this holiday?
              </p>
              <p className="text-sm font-medium text-foreground mb-6">
                &ldquo;{holiday.name}&rdquo; &mdash; {formatDate(holiday.date)}
              </p>
              <div className="flex items-center gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={deleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={onConfirm}
                  disabled={deleting}
                  className="flex-1 gap-2"
                >
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const fetchHolidays = useCallback(async () => {
    try {
      setFetchError('');
      const res = await fetch('/api/company/holidays', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to fetch holidays');
      }
      const data = await res.json();
      setHolidays(data.holidays ?? []);
    } catch {
      setFetchError('Unable to load holidays. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleAdd = () => {
    setEditingHoliday(null);
    setShowForm(true);
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setShowForm(true);
  };

  const handleFormSubmit = async (name: string, date: string) => {
    setSaving(true);
    try {
      if (editingHoliday) {
        // PUT - Update
        const res = await fetch('/api/company/holidays', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id: editingHoliday.id, name, date }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update holiday');
        }
        setStatusMsg({ message: 'Holiday updated successfully.', type: 'success' });
      } else {
        // POST - Create
        const res = await fetch('/api/company/holidays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name, date }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to add holiday');
        }
        setStatusMsg({ message: 'Holiday added successfully.', type: 'success' });
      }
      setShowForm(false);
      setEditingHoliday(null);
      await fetchHolidays();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An error occurred.';
      setStatusMsg({ message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingHoliday) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/company/holidays', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: deletingHoliday.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete holiday');
      }
      setStatusMsg({ message: 'Holiday deleted successfully.', type: 'success' });
      setDeletingHoliday(null);
      await fetchHolidays();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An error occurred.';
      setStatusMsg({ message, type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const dismissStatus = useCallback(() => setStatusMsg(null), []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-primary" />
            Holiday Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage public and custom holidays for your organization.
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Add Holiday
        </Button>
      </motion.div>

      {/* Status message */}
      <AnimatePresence>
        {statusMsg && (
          <StatusMessage
            message={statusMsg.message}
            type={statusMsg.type}
            onDismiss={dismissStatus}
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Upcoming Holidays
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton />
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  {fetchError}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLoading(true);
                    fetchHolidays();
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : holidays.length === 0 ? (
              <EmptyState onAdd={handleAdd} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3 pr-4">
                        Name
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3 pr-4">
                        Date
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3 pr-4">
                        Type
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {holidays.map((holiday, index) => {
                        const isPast = new Date(holiday.date) < new Date();
                        return (
                          <motion.tr
                            key={holiday.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: index * 0.03 }}
                            className={`border-b border-border/20 last:border-0 group ${
                              isPast ? 'opacity-50' : ''
                            }`}
                          >
                            <td className="py-3.5 pr-4">
                              <span className="text-sm font-medium text-foreground">
                                {holiday.name}
                              </span>
                            </td>
                            <td className="py-3.5 pr-4">
                              <span className="text-sm text-muted-foreground">
                                {formatDate(holiday.date)}
                              </span>
                            </td>
                            <td className="py-3.5 pr-4">
                              {holiday.is_custom ? (
                                <Badge variant="outline" className="text-xs">
                                  Custom
                                </Badge>
                              ) : (
                                <Badge className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                                  National
                                </Badge>
                              )}
                            </td>
                            <td className="py-3.5 text-right">
                              {holiday.is_custom ? (
                                <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleEdit(holiday)}
                                    className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                                    title="Edit holiday"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setDeletingHoliday(holiday)
                                    }
                                    className="p-1.5 hover:bg-red-500/10 rounded-md transition-colors text-muted-foreground hover:text-red-500"
                                    title="Delete holiday"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">
                                  &mdash;
                                </span>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add / Edit modal */}
      <AnimatePresence>
        {showForm && (
          <HolidayFormModal
            holiday={editingHoliday}
            onClose={() => {
              setShowForm(false);
              setEditingHoliday(null);
            }}
            onSubmit={handleFormSubmit}
            saving={saving}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deletingHoliday && (
          <DeleteConfirmModal
            holiday={deletingHoliday}
            onClose={() => setDeletingHoliday(null)}
            onConfirm={handleDelete}
            deleting={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
