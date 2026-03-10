'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  X,
  GitBranch,
  AlertCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DeptMember {
  id: string;
  name: string;
  role: string;
  designation: string | null;
  status: string;
  joinDate: string | null;
}

interface Department {
  name: string;
  employeeCount: number;
  head: string | null;
  headRole: string | null;
  roles: string[];
  members: DeptMember[];
}

interface OrgUnit {
  id: string;
  company_id: string;
  name: string;
  type: 'department' | 'division' | 'team' | 'branch';
  parent_id: string | null;
  head_id: string | null;
  cost_center: string | null;
  created_at: string;
  parent?: { id: string; name: string } | null;
  head?: { id: string; first_name: string; last_name: string } | null;
  children?: { id: string; name: string; type: string }[];
}

interface OrgData {
  company: { name: string; size: string | null; industry: string | null } | null;
  departments: Department[];
  totalEmployees: number;
  totalDepartments: number;
  orgUnits: OrgUnit[];
}

const UNIT_TYPES = [
  { value: 'department', label: 'Department' },
  { value: 'division', label: 'Division' },
  { value: 'team', label: 'Team' },
  { value: 'branch', label: 'Branch' },
] as const;

const UNIT_TYPE_COLORS: Record<string, string> = {
  department: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400',
  division: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-400',
  team: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400',
  branch: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OrganizationPage() {
  const [data, setData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<OrgUnit | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<string>('department');
  const [formParentId, setFormParentId] = useState('');
  const [formCostCenter, setFormCostCenter] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirmation
  const [deletingUnit, setDeletingUnit] = useState<OrgUnit | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Action message
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/hr/organization', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      setData(await res.json());
    } catch {
      setData(null);
      setError('Failed to load organization data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleDept = (name: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'hr': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'manager': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'director': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'team_lead': return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  /* ---- Modal helpers ---- */
  function openAddModal() {
    setEditingUnit(null);
    setFormName('');
    setFormType('department');
    setFormParentId('');
    setFormCostCenter('');
    setFormError('');
    setShowModal(true);
  }

  function openEditModal(unit: OrgUnit) {
    setEditingUnit(unit);
    setFormName(unit.name);
    setFormType(unit.type);
    setFormParentId(unit.parent_id ?? '');
    setFormCostCenter(unit.cost_center ?? '');
    setFormError('');
    setShowModal(true);
  }

  function closeModal() {
    if (!formSubmitting) {
      setShowModal(false);
      setEditingUnit(null);
    }
  }

  async function handleFormSubmit() {
    setFormError('');
    if (!formName.trim()) {
      setFormError('Name is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingUnit) {
        // Update
        const res = await fetch('/api/hr/organization', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: editingUnit.id,
            name: formName.trim(),
            type: formType,
            parentId: formParentId || null,
            costCenter: formCostCenter.trim() || null,
          }),
        });
        const resData = await res.json();
        if (res.ok) {
          setActionMsg({ type: 'success', text: `Unit "${formName.trim()}" updated successfully.` });
          setShowModal(false);
          loadData();
        } else {
          setFormError(resData.error || 'Update failed.');
        }
      } else {
        // Create
        const res = await fetch('/api/hr/organization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formName.trim(),
            type: formType,
            parentId: formParentId || undefined,
            costCenter: formCostCenter.trim() || undefined,
          }),
        });
        const resData = await res.json();
        if (res.ok) {
          setActionMsg({ type: 'success', text: `Unit "${formName.trim()}" created successfully.` });
          setShowModal(false);
          loadData();
        } else {
          setFormError(resData.error || 'Creation failed.');
        }
      }
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingUnit) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch('/api/hr/organization', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: deletingUnit.id }),
      });
      const resData = await res.json();
      if (res.ok) {
        setActionMsg({ type: 'success', text: `Unit "${deletingUnit.name}" deleted.` });
        setDeletingUnit(null);
        loadData();
      } else {
        setActionMsg({ type: 'error', text: resData.error || 'Delete failed.' });
        setDeletingUnit(null);
      }
    } catch {
      setActionMsg({ type: 'error', text: 'Network error.' });
      setDeletingUnit(null);
    } finally {
      setDeleteSubmitting(false);
    }
  }

  // Clear action message after 4 seconds
  useEffect(() => {
    if (actionMsg) {
      const timer = setTimeout(() => setActionMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionMsg]);

  const orgUnits = data?.orgUnits ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Organization</h1>
          <p className="text-muted-foreground mt-1">
            Company structure and department overview
          </p>
        </div>
        <Button
          onClick={openAddModal}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 w-fit"
        >
          <Plus className="w-4 h-4" /> Add Unit
        </Button>
      </div>

      {/* Action message */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
              actionMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
            }`}
          >
            {actionMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      {error && !loading && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={loadData}
            className="ml-2 text-sm underline hover:no-underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company</p>
                <p className="text-xl font-bold text-foreground">{loading ? <div className="h-7 w-20 bg-muted animate-pulse rounded" /> : data?.company?.name ?? 'N/A'}</p>
                {data?.company?.industry && (
                  <p className="text-xs text-muted-foreground">{data.company.industry}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Departments</p>
                <p className="text-2xl font-bold text-foreground">{loading ? <div className="h-7 w-16 bg-muted animate-pulse rounded" /> : data?.totalDepartments ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold text-foreground">{loading ? <div className="h-7 w-16 bg-muted animate-pulse rounded" /> : data?.totalEmployees ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organization Units */}
      {orgUnits.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            Organization Units
            <Badge variant="default">{orgUnits.length}</Badge>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgUnits.map((unit) => (
              <Card key={unit.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground truncate">{unit.name}</h3>
                        <Badge
                          variant="default"
                          size="sm"
                          className={UNIT_TYPE_COLORS[unit.type] ?? ''}
                        >
                          {unit.type}
                        </Badge>
                      </div>
                      {unit.head && (
                        <p className="text-xs text-muted-foreground">
                          Head: {unit.head.first_name} {unit.head.last_name}
                        </p>
                      )}
                      {unit.parent && (
                        <p className="text-xs text-muted-foreground">
                          Parent: {unit.parent.name}
                        </p>
                      )}
                      {unit.cost_center && (
                        <p className="text-xs text-muted-foreground">
                          Cost Center: {unit.cost_center}
                        </p>
                      )}
                      {unit.children && unit.children.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {unit.children.length} sub-unit{unit.children.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(unit)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Edit unit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingUnit(unit)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                        title="Delete unit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Departments (existing org chart display) */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Departments from Employee Records</h2>
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !data || data.departments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No departments found</p>
              <p className="text-sm mt-1">Departments are derived from employee records. Add employees with departments to see them here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.departments.map((dept) => (
              <Card key={dept.name} className="overflow-hidden">
                <button
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  onClick={() => toggleDept(dept.name)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-base text-foreground">{dept.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {dept.employeeCount} employee{dept.employeeCount !== 1 ? 's' : ''}
                        {dept.head ? ` \u00b7 Head: ${dept.head}` : ''}
                      </p>
                    </div>
                  </div>
                  {expandedDepts.has(dept.name) ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                {expandedDepts.has(dept.name) && (
                  <div className="border-t">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="text-left py-2 px-4 text-sm font-medium text-foreground">Name</th>
                            <th className="text-left py-2 px-4 text-sm font-medium text-foreground">Role</th>
                            <th className="text-left py-2 px-4 text-sm font-medium text-foreground">Designation</th>
                            <th className="text-left py-2 px-4 text-sm font-medium text-foreground">Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dept.members.map((member) => (
                            <tr key={member.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 px-4 text-sm font-medium text-foreground">{member.name}</td>
                              <td className="py-2.5 px-4">
                                <Badge variant="default" className={getRoleBadgeColor(member.role)}>
                                  {member.role}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-4 text-sm text-muted-foreground">{member.designation || '--'}</td>
                              <td className="py-2.5 px-4 text-sm text-muted-foreground">{member.joinDate || '--'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div
              className="relative w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/30">
                <h2 className="text-lg font-semibold text-foreground">
                  {editingUnit ? 'Edit Organization Unit' : 'Add Organization Unit'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {formError && (
                  <div className="rounded-lg px-4 py-3 text-sm font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Engineering, Marketing..."
                    maxLength={200}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    disabled={formSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    disabled={formSubmitting}
                  >
                    {UNIT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Parent Unit</label>
                  <select
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    disabled={formSubmitting}
                  >
                    <option value="">None (top-level)</option>
                    {orgUnits
                      .filter((u) => u.id !== editingUnit?.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.type})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Cost Center</label>
                  <input
                    type="text"
                    value={formCostCenter}
                    onChange={(e) => setFormCostCenter(e.target.value)}
                    placeholder="e.g. CC-001"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    disabled={formSubmitting}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/50 bg-muted/20">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  disabled={formSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleFormSubmit}
                  disabled={formSubmitting || !formName.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {formSubmitting
                    ? 'Saving...'
                    : editingUnit
                      ? 'Update Unit'
                      : 'Create Unit'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingUnit && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !deleteSubmitting && setDeletingUnit(null)}
            />
            <motion.div
              className="relative w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Delete Unit</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Are you sure you want to delete <strong>{deletingUnit.name}</strong>? This action can be reversed by an administrator.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-border/50 bg-muted/20">
                <Button
                  variant="outline"
                  onClick={() => !deleteSubmitting && setDeletingUnit(null)}
                  disabled={deleteSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleteSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleteSubmitting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
