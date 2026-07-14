'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  ShieldCheck,
  Search,
  Check,
  X,
  Save,
  RotateCcw,
  AlertTriangle,
  Info,
  Filter,
} from 'lucide-react';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } } as const;
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } } } as const;

// Default roles in the system
const ROLES = ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'] as const;
type Role = typeof ROLES[number];

// Permission groupings are API-driven; this constant only defines empty shape defaults.
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  'Employees': [],
  'Leave Management': [],
  'Attendance': [],
  'Payroll': [],
  'Organization': [],
  'Reports': [],
  'System': [],
  'Documents': [],
};

const DEFAULT_MATRIX: Record<string, Role[]> = {};

const MODULE_COLORS: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'default' | 'outline'> = {
  'Employees': 'info',
  'Leave Management': 'success',
  'Attendance': 'warning',
  'Payroll': 'danger',
  'Organization': 'default',
  'Reports': 'info',
  'System': 'danger',
  'Documents': 'success',
};

export default function RbacView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, string[]>>(DEFAULT_PERMISSIONS);
  const [matrix, setMatrix] = useState<Record<string, Role[]>>(DEFAULT_MATRIX);
  const [originalMatrix, setOriginalMatrix] = useState<Record<string, Role[]>>(DEFAULT_MATRIX);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    async function loadRBAC() {
      try {
        const me = await ensureMe();
        if (!me) {
          router.replace('/sign-in');
          return;
        }

        const res = await fetch('/api/admin/rbac', { credentials: 'include' });
        if (!res.ok) {
          throw new Error(`RBAC API returned ${res.status}`);
        }

        const data = await res.json();
        if (!data.permissions || !data.matrix) {
          throw new Error('RBAC API returned invalid payload');
        }

        setPermissions(data.permissions);
        setMatrix(data.matrix);
        setOriginalMatrix(data.matrix);
      } catch (err) {
        console.error('Failed to load RBAC data:', err);
        setSaveError(err instanceof Error ? err.message : 'Failed to load RBAC data');
        setPermissions(DEFAULT_PERMISSIONS);
        setMatrix(DEFAULT_MATRIX);
        setOriginalMatrix(DEFAULT_MATRIX);
      } finally {
        setLoading(false);
      }
    }

    loadRBAC();
  }, [router]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(matrix) !== JSON.stringify(originalMatrix);
  }, [matrix, originalMatrix]);

  const changeCount = useMemo(() => {
    let count = 0;
    for (const perm of Object.keys(matrix)) {
      const current = new Set(matrix[perm]);
      const original = new Set(originalMatrix[perm] ?? []);
      for (const role of ROLES) {
        if (current.has(role) !== original.has(role)) count++;
      }
    }
    return count;
  }, [matrix, originalMatrix]);

  const togglePermission = useCallback((permission: string, role: Role) => {
    setMatrix(prev => {
      const current = prev[permission] ?? [];
      const hasRole = current.includes(role);
      return {
        ...prev,
        [permission]: hasRole
          ? current.filter(r => r !== role)
          : [...current, role],
      };
    });
  }, []);

  const resetChanges = useCallback(() => {
    setMatrix(originalMatrix);
    setSaveSuccess(false);
    setSaveError(null);
  }, [originalMatrix]);

  const handleSave = useCallback(async () => {
    setConfirmModalOpen(false);
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/admin/rbac', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ matrix }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save RBAC changes');
      }

      setOriginalMatrix({ ...matrix });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [matrix]);

  // Filter permissions based on search and module
  const filteredModules = useMemo(() => {
    const modules = selectedModule === 'all'
      ? Object.entries(permissions)
      : Object.entries(permissions).filter(([mod]) => mod === selectedModule);

    if (!searchQuery.trim()) return modules;

    const query = searchQuery.toLowerCase();
    return modules
      .map(([mod, perms]) => {
        const filtered = perms.filter(p =>
          p.toLowerCase().includes(query) || mod.toLowerCase().includes(query)
        );
        return [mod, filtered] as [string, string[]];
      })
      .filter(([, perms]) => perms.length > 0);
  }, [permissions, searchQuery, selectedModule]);

  const totalPermissions = useMemo(
    () => Object.values(permissions).reduce((acc, p) => acc + p.length, 0),
    [permissions]
  );

  function getRoleLabel(role: Role): string {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  function getPermissionLabel(perm: string): string {
    const parts = perm.split('.');
    return parts.length > 1 ? parts[1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : perm;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
            </div>
            <SkeletonTable rows={8} columns={7} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6"
          >
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-7 h-7 text-[var(--primary)]" />
                RBAC & Permissions
              </h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-2">
                Manage role-based access control across {totalPermissions} permissions and {ROLES.length} roles
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {hasChanges && (
                <>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--status-warning-soft)] text-[var(--status-warning)] border border-[var(--status-warning)]/20">
                    {changeCount} unsaved change{changeCount !== 1 ? 's' : ''}
                  </span>
                  <Button variant="outline" size="sm" onClick={resetChanges}>
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    Reset
                  </Button>
                  <Button size="sm" onClick={() => setConfirmModalOpen(true)} loading={saving}>
                    <Save className="w-4 h-4 mr-1.5" />
                    Save Changes
                  </Button>
                </>
              )}
            </div>
          </motion.div>

          {/* Feedback Messages */}
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--status-success-soft)] border border-[var(--status-success)]/20"
            >
              <Check className="w-5 h-5 text-[var(--status-success)] shrink-0" />
              <p className="text-sm text-[var(--status-success)]">Permissions saved successfully.</p>
            </motion.div>
          )}

          {saveError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--status-danger-soft)] border border-[var(--status-danger)]/20"
            >
              <AlertTriangle className="w-5 h-5 text-[var(--status-danger)] shrink-0" />
              <p className="text-sm text-[var(--status-danger)]">{saveError}</p>
            </motion.div>
          )}

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <Input
                type="text"
                placeholder="Search permissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-foreground text-sm placeholder:text-[var(--muted-foreground)]"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <Select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="pl-9 pr-8 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-foreground text-sm appearance-none cursor-pointer"
              >
                <option value="all">All Modules</option>
                {Object.keys(permissions).map(mod => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </Select>
            </div>
          </motion.div>

          {/* Permission Matrix */}
          <div className="space-y-4">
            {filteredModules.map(([module, perms], idx) => (
              <motion.div
                key={module}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-[var(--border)] flex flex-row items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                      {module}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">{perms.length} permission{perms.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="p-0 relative z-10 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider min-w-[200px]">
                            Permission
                          </th>
                          {ROLES.map(role => (
                            <th key={role} className="px-3 py-3 text-center text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider whitespace-nowrap">
                              {getRoleLabel(role)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {perms.map((perm) => {
                          const currentRoles = matrix[perm] ?? [];
                          const originalRoles = originalMatrix[perm] ?? [];
                          return (
                            <tr
                              key={perm}
                              className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/20 transition-colors"
                            >
                              <td className="px-4 sm:px-6 py-3">
                                <div>
                                  <span className="font-medium text-foreground">{getPermissionLabel(perm)}</span>
                                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-mono">{perm}</p>
                                </div>
                              </td>
                              {ROLES.map(role => {
                                const isGranted = currentRoles.includes(role);
                                const wasGranted = originalRoles.includes(role);
                                const isChanged = isGranted !== wasGranted;
                                return (
                                  <td key={role} className="px-3 py-3 text-center">
                                    <Button
                                      onClick={() => togglePermission(perm, role)}
                                      className={`
                                        w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 mx-auto
                                        ${isGranted
                                          ? 'bg-[var(--primary)]/25 text-[var(--primary)] hover:bg-[var(--primary)]/35'
                                          : 'bg-[var(--muted)]/40 text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60 hover:text-foreground'
                                        }
                                        ${isChanged ? 'ring-2 ring-[var(--status-warning)]/50 ring-offset-1 ring-offset-transparent' : ''}
                                      `}
                                      title={`${isGranted ? 'Revoke' : 'Grant'} "${perm}" for ${getRoleLabel(role)}`}
                                      variant="ghost"
                                      size="sm"
                                    >
                                      {isGranted ? (
                                        <Check className="w-4 h-4" />
                                      ) : (
                                        <X className="w-3.5 h-3.5" />
                                      )}
                                    </Button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredModules.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg p-8 sm:p-12 text-center">
                <Search className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
                <p className="text-sm text-[var(--muted-foreground)]">No permissions match your search criteria.</p>
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearchQuery(''); setSelectedModule('all'); }}>
                  Clear Filters
                </Button>
              </div>
            </motion.div>
          )}

          {/* Legend */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg p-4 sm:p-6">
              <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase mb-3">Legend</p>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-[var(--muted-foreground)]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[var(--primary)]/25 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-[var(--primary)]" />
                  </div>
                  <span>Permission granted</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[var(--muted)]/40 flex items-center justify-center">
                    <X className="w-3 h-3 text-[var(--muted-foreground)]" />
                  </div>
                  <span>Permission denied</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded ring-2 ring-[var(--status-warning)]/50 ring-offset-1 ring-offset-transparent flex items-center justify-center bg-[var(--muted)]/40">
                    <span className="w-2 h-2 rounded-full bg-[var(--status-warning)]" />
                  </div>
                  <span>Unsaved change</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Confirmation Modal */}
          <Modal
            isOpen={confirmModalOpen}
            onClose={() => setConfirmModalOpen(false)}
            title="Save Permission Changes"
            description={`You are about to apply ${changeCount} permission change${changeCount !== 1 ? 's' : ''}. This will immediately affect user access across the platform.`}
            size="sm"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--status-warning-soft)] border border-[var(--status-warning)]/20">
                <AlertTriangle className="w-5 h-5 text-[var(--status-warning)] shrink-0" />
                <p className="text-sm text-[var(--status-warning)]">
                  Changing permissions may lock users out of features they currently have access to. Please review carefully.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  loading={saving}
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Confirm & Save
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
}

