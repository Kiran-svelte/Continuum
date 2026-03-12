'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/glass-panel';
import { StaggerContainer, FadeIn, TiltCard } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

// Default permissions grouped by module - used as fallback when API is unavailable
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  'Employees': [
    'employees.view',
    'employees.create',
    'employees.update',
    'employees.delete',
    'employees.view_salary',
    'employees.manage_roles',
  ],
  'Leave Management': [
    'leaves.view_own',
    'leaves.request',
    'leaves.view_team',
    'leaves.approve',
    'leaves.view_all',
    'leaves.manage_policies',
    'leaves.bulk_approve',
    'leaves.encash',
  ],
  'Attendance': [
    'attendance.check_in',
    'attendance.view_own',
    'attendance.view_team',
    'attendance.view_all',
    'attendance.regularize',
    'attendance.manage',
  ],
  'Payroll': [
    'payroll.view_own',
    'payroll.view_all',
    'payroll.process',
    'payroll.approve',
    'payroll.manage',
  ],
  'Organization': [
    'organization.view',
    'organization.manage',
    'organization.manage_departments',
    'organization.manage_designations',
  ],
  'Reports': [
    'reports.view_own',
    'reports.view_team',
    'reports.view_all',
    'reports.export',
  ],
  'System': [
    'system.view_audit_logs',
    'system.manage_rbac',
    'system.manage_settings',
    'system.view_health',
    'system.manage_holidays',
    'system.manage_notifications',
  ],
  'Documents': [
    'documents.view_own',
    'documents.upload',
    'documents.view_all',
    'documents.manage',
  ],
};

// Default permission matrix (which roles have which permissions by default)
const DEFAULT_MATRIX: Record<string, Role[]> = {
  // Employees
  'employees.view': ['admin', 'hr', 'director', 'manager', 'team_lead'],
  'employees.create': ['admin', 'hr'],
  'employees.update': ['admin', 'hr'],
  'employees.delete': ['admin'],
  'employees.view_salary': ['admin', 'hr', 'director'],
  'employees.manage_roles': ['admin'],
  // Leave
  'leaves.view_own': ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'],
  'leaves.request': ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'],
  'leaves.view_team': ['admin', 'hr', 'director', 'manager', 'team_lead'],
  'leaves.approve': ['admin', 'hr', 'director', 'manager', 'team_lead'],
  'leaves.view_all': ['admin', 'hr', 'director'],
  'leaves.manage_policies': ['admin', 'hr'],
  'leaves.bulk_approve': ['admin', 'hr'],
  'leaves.encash': ['admin', 'hr'],
  // Attendance
  'attendance.check_in': ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'],
  'attendance.view_own': ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'],
  'attendance.view_team': ['admin', 'hr', 'director', 'manager', 'team_lead'],
  'attendance.view_all': ['admin', 'hr', 'director'],
  'attendance.regularize': ['admin', 'hr'],
  'attendance.manage': ['admin', 'hr'],
  // Payroll
  'payroll.view_own': ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'],
  'payroll.view_all': ['admin', 'hr', 'director'],
  'payroll.process': ['admin', 'hr'],
  'payroll.approve': ['admin', 'hr', 'director'],
  'payroll.manage': ['admin'],
  // Organization
  'organization.view': ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'],
  'organization.manage': ['admin', 'hr'],
  'organization.manage_departments': ['admin', 'hr'],
  'organization.manage_designations': ['admin', 'hr'],
  // Reports
  'reports.view_own': ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'],
  'reports.view_team': ['admin', 'hr', 'director', 'manager', 'team_lead'],
  'reports.view_all': ['admin', 'hr', 'director'],
  'reports.export': ['admin', 'hr', 'director'],
  // System
  'system.view_audit_logs': ['admin', 'hr'],
  'system.manage_rbac': ['admin'],
  'system.manage_settings': ['admin', 'hr'],
  'system.view_health': ['admin'],
  'system.manage_holidays': ['admin', 'hr'],
  'system.manage_notifications': ['admin', 'hr'],
  // Documents
  'documents.view_own': ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'],
  'documents.upload': ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'],
  'documents.view_all': ['admin', 'hr', 'director'],
  'documents.manage': ['admin', 'hr'],
};

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

export default function RBACPage() {
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
  const [usingFallback, setUsingFallback] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    async function loadRBAC() {
      try {
        const me = await ensureMe();
        if (!me) {
          router.replace('/sign-in');
          return;
        }

        // Try fetching from the RBAC API
        try {
          const res = await fetch('/api/admin/rbac');
          if (res.ok) {
            const data = await res.json();
            if (data.permissions && data.matrix) {
              setPermissions(data.permissions);
              setMatrix(data.matrix);
              setOriginalMatrix(data.matrix);
              setUsingFallback(false);
              setLoading(false);
              return;
            }
          }
        } catch {
          // API not available, use fallback
        }

        // Use default fallback data
        setUsingFallback(true);
        setPermissions(DEFAULT_PERMISSIONS);
        setMatrix(DEFAULT_MATRIX);
        setOriginalMatrix(DEFAULT_MATRIX);
      } catch (err) {
        console.error('Failed to load RBAC data:', err);
        setUsingFallback(true);
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
        body: JSON.stringify({ matrix }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save RBAC changes');
      }

      setOriginalMatrix({ ...matrix });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save changes');
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <SkeletonTable rows={8} columns={7} />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-500" />
            RBAC & Permissions
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Manage role-based access control across {totalPermissions} permissions and {ROLES.length} roles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <>
              <Badge variant="warning">{changeCount} unsaved change{changeCount !== 1 ? 's' : ''}</Badge>
              <Button variant="outline" size="sm" onClick={resetChanges}>
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Reset
              </Button>
              <Button variant="primary" size="sm" onClick={() => setConfirmModalOpen(true)} loading={saving}>
                <Save className="w-4 h-4 mr-1.5" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Feedback Messages */}
      {usingFallback && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Info className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-400">
              RBAC API endpoint is not yet available. Displaying default permission matrix. Changes will be saved once the API is ready.
            </p>
          </div>
        </motion.div>
      )}

      {saveSuccess && (
        <motion.div
          variants={itemVariants}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Check className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-sm text-emerald-400">Permissions saved successfully.</p>
          </div>
        </motion.div>
      )}

      {saveError && (
        <motion.div
          variants={itemVariants}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-400">{saveError}</p>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="pl-9 pr-8 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all appearance-none cursor-pointer"
          >
            <option value="all">All Modules</option>
            {Object.keys(permissions).map(mod => (
              <option key={mod} value={mod}>{mod}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Permission Matrix */}
      {filteredModules.map(([module, perms]) => (
        <motion.div key={module} variants={itemVariants}>
          <GlassPanel>
            <div className="p-6 border-b border-white/10 flex flex-row items-center gap-3">
              <Badge variant={MODULE_COLORS[module] || 'default'} size="lg">{module}</Badge>
              <span className="text-xs text-white/60">{perms.length} permission{perms.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="p-0 relative z-10">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider min-w-[200px]">
                        Permission
                      </th>
                      {ROLES.map(role => (
                        <th key={role} className="px-3 py-3 text-center text-xs font-medium text-white/60 uppercase tracking-wider whitespace-nowrap">
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
                          className="border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors"
                        >
                          <td className="px-6 py-3">
                            <div>
                              <span className="font-medium text-white">{getPermissionLabel(perm)}</span>
                              <p className="text-xs text-white/60 mt-0.5 font-mono">{perm}</p>
                            </div>
                          </td>
                          {ROLES.map(role => {
                            const isGranted = currentRoles.includes(role);
                            const wasGranted = originalRoles.includes(role);
                            const isChanged = isGranted !== wasGranted;
                            return (
                              <td key={role} className="px-3 py-3 text-center">
                                <button
                                  onClick={() => togglePermission(perm, role)}
                                  className={`
                                    w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 mx-auto
                                    ${isGranted
                                      ? 'bg-indigo-500/25 text-indigo-400 hover:bg-indigo-500/35'
                                      : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                                    }
                                    ${isChanged ? 'ring-2 ring-amber-400/50 ring-offset-1 ring-offset-transparent' : ''}
                                  `}
                                  title={`${isGranted ? 'Revoke' : 'Grant'} "${perm}" for ${getRoleLabel(role)}`}
                                >
                                  {isGranted ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <X className="w-3.5 h-3.5" />
                                  )}
                                </button>
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
          </GlassPanel>
        </motion.div>
      ))}

      {filteredModules.length === 0 && (
        <motion.div variants={itemVariants}>
          <GlassPanel>
            <div className="p-6 relative z-10 py-12 text-center">
              <Search className="w-10 h-10 text-white/60 mx-auto mb-3" />
              <p className="text-sm text-white/60">No permissions match your search criteria.</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearchQuery(''); setSelectedModule('all'); }}>
                Clear Filters
              </Button>
            </div>
          </GlassPanel>
        </motion.div>
      )}

      {/* Legend */}
      <motion.div variants={itemVariants}>
        <GlassPanel>
          <div className="p-6 relative z-10 py-4">
            <div className="flex flex-wrap items-center gap-6 text-xs text-white/60">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-indigo-500/25 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span>Permission granted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center">
                  <X className="w-3 h-3 text-white/40" />
                </div>
                <span>Permission denied</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded ring-2 ring-amber-400/50 ring-offset-1 ring-offset-transparent flex items-center justify-center bg-white/5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                </div>
                <span>Unsaved change</span>
              </div>
            </div>
          </div>
        </GlassPanel>
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
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-400">
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
              variant="primary"
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
    </motion.div>
  );
}
