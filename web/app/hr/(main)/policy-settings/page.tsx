'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select, Checkbox } from '@/components/ui/input';
import { Check, Lightbulb, Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────

const CATEGORY_BADGE: Record<string, 'info' | 'warning' | 'success'> = {
  validation: 'info',
  business: 'warning',
  compliance: 'success',
};

interface RuleRow {
  rule_id: string;
  name: string;
  description: string;
  category: string;
  is_blocking: boolean;
  is_active: boolean;
  priority: number;
  config: Record<string, unknown>;
  persisted: boolean;
}

interface LeaveTypeRow {
  id: string;
  code: string;
  name: string;
  category: string;
  default_quota: number;
  carry_forward: boolean;
  max_carry_forward: number;
  encashment_enabled: boolean;
  encashment_max_days: number;
  paid: boolean;
}

interface PolicyData {
  rules: RuleRow[];
  leave_types: LeaveTypeRow[];
  policy_version: number;
  policy_updated_at: string | null;
}

// Leave type from the CRUD API
interface LeaveTypeCrud {
  id: string;
  code: string;
  name: string;
  category: string;
  defaultQuota: number;
  carryForward: boolean;
  maxCarryForward: number;
  encashmentEnabled: boolean;
  encashmentMaxDays: number;
  paid: boolean;
  genderSpecific: string;
  isActive: boolean;
}

type TabKey = 'rules' | 'leave-types';

const VALID_CATEGORIES = [
  { value: 'common', label: 'Common' },
  { value: 'statutory', label: 'Statutory' },
  { value: 'special', label: 'Special' },
  { value: 'unpaid', label: 'Unpaid' },
];

const VALID_GENDER_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

interface LeaveTypeFormData {
  code: string;
  name: string;
  category: string;
  defaultQuota: number;
  carryForward: boolean;
  maxCarryForward: number;
  encashmentEnabled: boolean;
  encashmentMaxDays: number;
  paid: boolean;
  genderSpecific: string;
}

const EMPTY_FORM: LeaveTypeFormData = {
  code: '',
  name: '',
  category: 'common',
  defaultQuota: 0,
  carryForward: false,
  maxCarryForward: 0,
  encashmentEnabled: false,
  encashmentMaxDays: 0,
  paid: true,
  genderSpecific: 'all',
};

// ─── Constraint Rules sub-components (unchanged) ─────────────────────────────

function ConfigBadges({ config }: { config: Record<string, unknown> }) {
  const items: string[] = [];
  if (typeof config.min_coverage_percent === 'number') items.push(`Coverage >= ${config.min_coverage_percent}%`);
  if (typeof config.max_concurrent === 'number') items.push(`Max ${config.max_concurrent} concurrent`);
  if (typeof config.allow_negative === 'boolean') items.push(config.allow_negative ? 'Neg balance: ON' : 'Neg balance: OFF');
  if (Array.isArray(config.blackout_dates) && config.blackout_dates.length > 0)
    items.push(`${config.blackout_dates.length} blackout period(s)`);
  if (typeof config.notice_days === 'object' && config.notice_days !== null)
    items.push(`Notice: per-type`);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.map((item) => (
        <span key={item} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
          {item}
        </span>
      ))}
    </div>
  );
}

function RuleConfigEditor({
  rule,
  onSave,
  saving,
}: {
  rule: RuleRow;
  onSave: (ruleId: string, patch: Record<string, unknown>, isActive: boolean) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [config, setConfig] = useState(rule.config);
  const [isActive, setIsActive] = useState(rule.is_active);
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    setConfig(rule.config);
    setIsActive(rule.is_active);
    setJsonError('');
  }, [rule]);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-primary hover:underline mt-1"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground">Active</label>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
      </div>

      {rule.rule_id === 'RULE003' && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">Min Coverage %</label>
          <input
            type="number"
            min={0}
            max={100}
            value={(config.min_coverage_percent as number) ?? 60}
            onChange={(e) => setConfig({ ...config, min_coverage_percent: parseInt(e.target.value) })}
            className="border border-border rounded px-2 py-1 text-xs w-20"
          />
        </div>
      )}

      {rule.rule_id === 'RULE004' && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">Max Concurrent</label>
          <input
            type="number"
            min={1}
            max={50}
            value={(config.max_concurrent as number) ?? 2}
            onChange={(e) => setConfig({ ...config, max_concurrent: parseInt(e.target.value) })}
            className="border border-border rounded px-2 py-1 text-xs w-20"
          />
        </div>
      )}

      {rule.rule_id === 'RULE005' && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Blackout Periods (JSON array)</label>
          <textarea
            rows={3}
            value={JSON.stringify(config.blackout_dates ?? [], null, 2)}
            onChange={(e) => {
              try {
                setConfig({ ...config, blackout_dates: JSON.parse(e.target.value) });
                setJsonError('');
              } catch {
                setJsonError('Invalid JSON — fix before saving');
              }
            }}
            className={`mt-1 w-full border rounded px-2 py-1 text-xs font-mono ${jsonError ? 'border-red-400' : 'border-border'}`}
          />
          {jsonError && (
            <p className="text-xs text-red-500 mt-1">{jsonError}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Format: {`[{"name":"Q4 Freeze","start":"2025-10-01","end":"2025-10-07"}]`}
          </p>
        </div>
      )}

      {rule.rule_id === 'RULE002' && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">Allow Negative Balance</label>
          <input
            type="checkbox"
            checked={!!config.allow_negative}
            onChange={(e) => setConfig({ ...config, allow_negative: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            onSave(rule.rule_id, { ...config }, isActive);
            setEditing(false);
          }}
          disabled={saving || !!jsonError}
          className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Rule'}
        </button>
        <button
          onClick={() => { setConfig(rule.config); setJsonError(''); setEditing(false); }}
          className="text-xs text-muted-foreground hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Leave Type Modal ────────────────────────────────────────────────────────

function LeaveTypeModal({
  open,
  editingType,
  onClose,
  onSaved,
}: {
  open: boolean;
  editingType: LeaveTypeCrud | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<LeaveTypeFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!editingType;

  useEffect(() => {
    if (editingType) {
      setForm({
        code: editingType.code,
        name: editingType.name,
        category: editingType.category,
        defaultQuota: editingType.defaultQuota,
        carryForward: editingType.carryForward,
        maxCarryForward: editingType.maxCarryForward,
        encashmentEnabled: editingType.encashmentEnabled,
        encashmentMaxDays: editingType.encashmentMaxDays,
        paid: editingType.paid,
        genderSpecific: editingType.genderSpecific,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [editingType, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const url = '/api/company/leave-types';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit
        ? { id: editingType!.id, ...form }
        : form;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save leave type');
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? 'Edit Leave Type' : 'Add Leave Type'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code"
              placeholder="e.g. CL, SL, EL"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              disabled={isEdit}
              required
              maxLength={20}
              helperText={isEdit ? 'Code cannot be changed' : undefined}
            />
            <Input
              label="Name"
              placeholder="e.g. Casual Leave"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              options={VALID_CATEGORIES}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <Select
              label="Gender Specific"
              options={VALID_GENDER_FILTERS}
              value={form.genderSpecific}
              onChange={(e) => setForm({ ...form, genderSpecific: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Default Quota (days)"
              type="number"
              min={0}
              step={0.5}
              value={form.defaultQuota}
              onChange={(e) => setForm({ ...form, defaultQuota: parseFloat(e.target.value) || 0 })}
            />
            <div className="flex items-end pb-1">
              <Checkbox
                label="Paid Leave"
                checked={form.paid}
                onChange={(e) => setForm({ ...form, paid: (e.target as HTMLInputElement).checked })}
              />
            </div>
          </div>

          <div className="border border-border/40 rounded-lg p-4 space-y-3 bg-muted/20">
            <p className="text-sm font-medium text-foreground">Carry Forward</p>
            <Checkbox
              label="Allow carry forward"
              checked={form.carryForward}
              onChange={(e) => setForm({ ...form, carryForward: (e.target as HTMLInputElement).checked })}
            />
            {form.carryForward && (
              <Input
                label="Max Carry Forward (days)"
                type="number"
                min={0}
                step={0.5}
                value={form.maxCarryForward}
                onChange={(e) => setForm({ ...form, maxCarryForward: parseFloat(e.target.value) || 0 })}
              />
            )}
          </div>

          <div className="border border-border/40 rounded-lg p-4 space-y-3 bg-muted/20">
            <p className="text-sm font-medium text-foreground">Encashment</p>
            <Checkbox
              label="Allow encashment"
              checked={form.encashmentEnabled}
              onChange={(e) => setForm({ ...form, encashmentEnabled: (e.target as HTMLInputElement).checked })}
            />
            {form.encashmentEnabled && (
              <Input
                label="Max Encashment (days)"
                type="number"
                min={0}
                step={0.5}
                value={form.encashmentMaxDays}
                onChange={(e) => setForm({ ...form, encashmentMaxDays: parseFloat(e.target.value) || 0 })}
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? 'Update Leave Type' : 'Create Leave Type'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Delete Confirmation Dialog ──────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  leaveType,
  onClose,
  onConfirm,
  deleting,
}: {
  open: boolean;
  leaveType: LeaveTypeCrud | null;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  if (!open || !leaveType) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-md mx-4 bg-card border border-border rounded-xl shadow-xl"
      >
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-red-50 dark:bg-red-900/20">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Delete Leave Type</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Are you sure you want to deactivate <strong>{leaveType.name}</strong> ({leaveType.code})?
                This will soft-delete the leave type. Existing leave balances and requests will be preserved.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="danger" loading={deleting} onClick={onConfirm}>
              Delete
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Leave Types Tab Content ─────────────────────────────────────────────────

function LeaveTypesTab() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeCrud[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveTypeCrud | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingType, setDeletingType] = useState<LeaveTypeCrud | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLeaveTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/company/leave-types', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      // Map from the GET response format to the LeaveTypeCrud format
      // The GET endpoint returns a simplified format; for full CRUD data we need all fields.
      // We'll fetch fresh data including id by using a slightly different approach.
      // Since the existing GET doesn't return id, we need to enhance or use a different approach.
      // For now, map what we get. The id will come from POST/PUT responses.
      setLeaveTypes(
        data.leaveTypes.map((lt: Record<string, unknown>) => ({
          id: lt.id || '',
          code: lt.code,
          name: lt.name,
          category: lt.category,
          defaultQuota: lt.defaultQuota,
          carryForward: lt.carryForward,
          maxCarryForward: lt.maxCarryForward || 0,
          encashmentEnabled: lt.encashmentEnabled || false,
          encashmentMaxDays: lt.encashmentMaxDays || 0,
          paid: lt.paid,
          genderSpecific: lt.genderSpecific || 'all',
          isActive: lt.isActive !== undefined ? lt.isActive : true,
        }))
      );
    } catch {
      setError('Failed to load leave types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaveTypes();
  }, [fetchLeaveTypes]);

  function handleAdd() {
    setEditingType(null);
    setModalOpen(true);
  }

  function handleEdit(lt: LeaveTypeCrud) {
    setEditingType(lt);
    setModalOpen(true);
  }

  function handleDeleteClick(lt: LeaveTypeCrud) {
    setDeletingType(lt);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deletingType) return;
    setDeleting(true);
    setError('');

    try {
      const res = await fetch('/api/company/leave-types', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: deletingType.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete leave type');
        return;
      }

      setSuccess(`Leave type '${deletingType.name}' has been deactivated`);
      setTimeout(() => setSuccess(''), 4000);
      setDeleteDialogOpen(false);
      setDeletingType(null);
      await fetchLeaveTypes();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaved() {
    setSuccess(editingType ? 'Leave type updated successfully' : 'Leave type created successfully');
    setTimeout(() => setSuccess(''), 4000);
    await fetchLeaveTypes();
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-9 w-36 bg-muted rounded-lg" />
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  const categoryBadgeVariant = (cat: string): 'default' | 'warning' | 'success' | 'info' => {
    switch (cat) {
      case 'statutory': return 'warning';
      case 'special': return 'success';
      case 'unpaid': return 'info';
      default: return 'default';
    }
  };

  return (
    <>
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">
          {error}
        </div>
      )}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300 mb-4"
        >
          {success}
        </motion.div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>Leave Types</CardTitle>
              <Badge variant="info">{leaveTypes.length} configured</Badge>
            </div>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4" />
              Add Leave Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {leaveTypes.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">No leave types configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first leave type to start managing employee leave policies.
              </p>
              <Button size="sm" onClick={handleAdd}>
                <Plus className="w-4 h-4" />
                Add Leave Type
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 text-muted-foreground font-medium">Code</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Name</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Category</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Default Quota</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">Carry Forward</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden lg:table-cell">Paid</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-right py-3 pl-2 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {leaveTypes.map((lt) => (
                      <motion.tr
                        key={lt.code}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-2.5 pr-4">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                            {lt.code}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-foreground font-medium">{lt.name}</td>
                        <td className="py-2.5 px-2">
                          <Badge variant={categoryBadgeVariant(lt.category)}>
                            {lt.category}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-foreground">{lt.defaultQuota} days</td>
                        <td className="py-2.5 px-2 hidden md:table-cell">
                          {lt.carryForward ? (
                            <span className="text-green-600 dark:text-green-400 text-xs font-medium inline-flex items-center gap-1">
                              <Check className="w-3 h-3" /> Up to {lt.maxCarryForward} days
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">No</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 hidden lg:table-cell">
                          {lt.paid ? (
                            <Badge variant="success" size="sm">Paid</Badge>
                          ) : (
                            <Badge variant="default" size="sm">Unpaid</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          {lt.isActive ? (
                            <Badge variant="success" size="sm">Active</Badge>
                          ) : (
                            <Badge variant="danger" size="sm">Inactive</Badge>
                          )}
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(lt)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(lt)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {modalOpen && (
          <LeaveTypeModal
            open={modalOpen}
            editingType={editingType}
            onClose={() => { setModalOpen(false); setEditingType(null); }}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteDialogOpen && (
          <DeleteConfirmDialog
            open={deleteDialogOpen}
            leaveType={deletingType}
            onClose={() => { setDeleteDialogOpen(false); setDeletingType(null); }}
            onConfirm={handleDeleteConfirm}
            deleting={deleting}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PolicySettingsPage() {
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('rules');

  useEffect(() => {
    fetch('/api/hr/policy', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: PolicyData) => {
        setPolicy(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load policy');
        setLoading(false);
      });
  }, []);

  async function saveRule(ruleId: string, config: Record<string, unknown>, isActive?: boolean) {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const patch: Record<string, unknown> = { config };
      if (isActive !== undefined) patch.is_active = isActive;
      const res = await fetch('/api/hr/policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rules: [{ rule_id: ruleId, ...patch }] }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? 'Failed to save rule');
      } else {
        setSuccess(`Rule ${ruleId} updated. Constraint engine will apply changes on next leave request.`);
        setTimeout(() => setSuccess(''), 4000);
        const updated = await fetch('/api/hr/policy', { credentials: 'include' }).then((r) => r.json());
        setPolicy(updated);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-10 w-80 bg-muted rounded-lg" />
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    );
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'rules', label: 'Constraint Rules' },
    { key: 'leave-types', label: 'Leave Types' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Policy Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure leave policies and constraint rules for your organization.
          {policy && (
            <span className="ml-2 text-xs text-muted-foreground">
              Policy v{policy.policy_version}
              {policy.policy_updated_at && (
                <> &middot; Last updated {new Date(policy.policy_updated_at).toLocaleDateString()}</>
              )}
            </span>
          )}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-0 -mb-px" aria-label="Policy tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                relative px-5 py-2.5 text-sm font-medium transition-colors
                ${activeTab === tab.key
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="active-policy-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'rules' && (
          <motion.div
            key="rules"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
                {success}
              </div>
            )}

            {/* Leave Type Catalog (summary in rules tab) */}
            {policy && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      Leave Types ({policy.leave_types.length > 0 ? policy.leave_types.length : '---'})
                    </CardTitle>
                    <Badge variant="info">
                      {policy.leave_types.length > 0 ? 'Company-Specific' : 'None Configured'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {policy.leave_types.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No leave types configured yet. Complete onboarding to set up leave types.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 pr-4 text-muted-foreground font-medium">Code</th>
                            <th className="text-left py-3 px-2 text-muted-foreground font-medium">Name</th>
                            <th className="text-left py-3 px-2 text-muted-foreground font-medium">Quota</th>
                            <th className="text-left py-3 px-2 text-muted-foreground font-medium">Category</th>
                            <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">Carry Forward</th>
                            <th className="text-left py-3 pl-2 text-muted-foreground font-medium hidden lg:table-cell">Encashment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {policy.leave_types.map((lt) => (
                            <tr key={lt.code} className="border-b border-border hover:bg-muted/50">
                              <td className="py-2.5 pr-4">
                                <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                  {lt.code}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-foreground">{lt.name}</td>
                              <td className="py-2.5 px-2 text-foreground font-medium">{lt.default_quota} days</td>
                              <td className="py-2.5 px-2">
                                <Badge
                                  variant={
                                    lt.category === 'statutory'
                                      ? 'warning'
                                      : lt.category === 'special'
                                        ? 'success'
                                        : 'default'
                                  }
                                >
                                  {lt.category}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-2 hidden md:table-cell">
                                {lt.carry_forward ? (
                                  <span className="text-green-600 dark:text-green-400 text-xs font-medium inline-flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Up to {lt.max_carry_forward} days
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">No</span>
                                )}
                              </td>
                              <td className="py-2.5 pl-2 hidden lg:table-cell">
                                {lt.encashment_enabled ? (
                                  <span className="text-green-600 dark:text-green-400 text-xs font-medium inline-flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Up to {lt.encashment_max_days} days
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">No</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Constraint Rules */}
            {policy && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Constraint Rules ({policy.rules.length})</CardTitle>
                    <Badge variant="warning">
                      {policy.rules.filter((r) => r.persisted).length} customized
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {policy.rules.map((rule) => (
                      <div
                        key={rule.rule_id}
                        className={`p-3 rounded-lg border transition-colors ${rule.is_active ? 'border-border hover:bg-muted/50' : 'border-border bg-muted/50 opacity-60'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-muted-foreground">{rule.rule_id}</span>
                              <p className="text-sm font-semibold text-foreground">{rule.name}</p>
                              <Badge variant={CATEGORY_BADGE[rule.category] ?? 'default'}>
                                {rule.category}
                              </Badge>
                              {rule.is_blocking && (
                                <span className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                                  Blocking
                                </span>
                              )}
                              {!rule.is_active && (
                                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                                  Disabled
                                </span>
                              )}
                              {rule.persisted && (
                                <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                                  Customized
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                            <ConfigBadges config={rule.config} />
                            <RuleConfigEditor
                              rule={rule}
                              onSave={(ruleId, config, isActive) => saveRule(ruleId, config, isActive)}
                              saving={saving}
                            />
                          </div>
                          <div className="ml-4 shrink-0">
                            <span className="text-xs text-muted-foreground">Priority {rule.priority}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    Changes are applied immediately. The Python constraint engine reads these rules from the
                    database on every leave request evaluation — no restart required.
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {activeTab === 'leave-types' && (
          <motion.div
            key="leave-types"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <LeaveTypesTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
