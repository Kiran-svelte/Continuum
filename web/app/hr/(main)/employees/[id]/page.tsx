'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { StaggerContainer, FadeIn, TiltCard } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  UserCheck,
  AlertCircle,
  Edit2,
  Loader2,
  Briefcase,
  Shield,
  Clock,
  FileText,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface EmployeeDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  primary_role: string;
  secondary_roles: string[];
  department: string | null;
  designation: string | null;
  status: string;
  gender: string | null;
  date_of_joining: string | null;
  manager_id: string | null;
  manager: { first_name: string; last_name: string } | null;
  created_at: string;
  leave_balances: LeaveBalance[];
  leave_requests: LeaveRequest[];
}

interface LeaveBalance {
  id: string;
  leave_type: string;
  year: number;
  annual_entitlement: number;
  carried_forward: number;
  used_days: number;
  pending_days: number;
  remaining: number;
}

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-500/20 text-purple-300',
  hr: 'bg-blue-500/20 text-blue-300',
  director: 'bg-indigo-500/20 text-indigo-300',
  manager: 'bg-orange-500/20 text-orange-300',
  team_lead: 'bg-teal-500/20 text-teal-300',
  employee: 'bg-white/5 text-white/60',
};

const STATUS_BADGE: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  probation: { variant: 'warning', label: 'Probation' },
  onboarding: { variant: 'info', label: 'Onboarding' },
  on_notice: { variant: 'warning', label: 'On Notice' },
  suspended: { variant: 'danger', label: 'Suspended' },
  resigned: { variant: 'danger', label: 'Resigned' },
  terminated: { variant: 'danger', label: 'Terminated' },
  exited: { variant: 'default', label: 'Exited' },
};

const LEAVE_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  cancelled: 'default',
  escalated: 'warning',
  draft: 'default',
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    phone: '',
    department: '',
    designation: '',
    status: '',
    role: '',
    secondaryRoles: [] as string[],
  });

  // Save feedback
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchEmployee = useCallback(async () => {
    try {
      await ensureMe();
      const res = await fetch(`/api/employees/${employeeId}`, { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load employee (${res.status})`);
      }
      const data = await res.json();
      const emp = data.employee;
      setEmployee(emp);
      setEditForm({
        phone: emp.phone || '',
        department: emp.department || '',
        designation: emp.designation || '',
        status: emp.status || 'active',
        role: emp.primary_role || 'employee',
        secondaryRoles: emp.secondary_roles || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  async function handleSave() {
    if (!employee) return;
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (editForm.phone !== (employee.phone || '')) body.phone = editForm.phone;
      if (editForm.department !== (employee.department || '')) body.department = editForm.department;
      if (editForm.designation !== (employee.designation || '')) body.designation = editForm.designation;
      if (editForm.status !== employee.status) body.status = editForm.status;

      // Check if roles changed — use dedicated role API
      const roleChanged = editForm.role !== employee.primary_role;
      const secondaryChanged = JSON.stringify(editForm.secondaryRoles.sort()) !== JSON.stringify((employee.secondary_roles || []).sort());

      // Save non-role changes via the general endpoint
      if (Object.keys(body).length > 0) {
        const res = await fetch(`/api/employees/${employeeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Save failed');
        }
      }

      // Save role changes via the dedicated role API
      if (roleChanged || secondaryChanged) {
        const roleBody: Record<string, unknown> = {};
        if (roleChanged) roleBody.primary_role = editForm.role;
        if (secondaryChanged) roleBody.secondary_roles = editForm.secondaryRoles.filter(r => r !== editForm.role);

        const roleRes = await fetch(`/api/employees/${employeeId}/role`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(roleBody),
        });

        if (!roleRes.ok) {
          const data = await roleRes.json().catch(() => ({}));
          throw new Error(data.error || 'Role update failed');
        }
      }

      if (Object.keys(body).length === 0 && !roleChanged && !secondaryChanged) {
        setEditing(false);
        return;
      }

      setEditing(false);
      setSaveMessage({ type: 'success', text: 'Employee updated successfully' });
      setTimeout(() => setSaveMessage(null), 5000);
      fetchEmployee();
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  }

  /* Loading */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  /* Error */
  if (error || !employee) {
    return (
      <div className="space-y-6">
        <button onClick={() => router.push('/hr/employees')} className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </button>
        <GlassPanel>
          <div className="p-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white">Employee Not Found</h3>
            <p className="text-sm text-white/60 mt-1">{error || 'Unable to load employee details.'}</p>
            <Button variant="primary" size="sm" className="mt-4" onClick={fetchEmployee}>Retry</Button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  const statusInfo = STATUS_BADGE[employee.status] || { variant: 'default' as const, label: employee.status };
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const totalUsed = employee.leave_balances.reduce((s, b) => s + b.used_days, 0);
  const totalEntitled = employee.leave_balances.reduce((s, b) => s + b.annual_entitlement, 0);

  return (
    <StaggerContainer className="space-y-6">
      {/* Back + header */}
      <FadeIn>
        <button onClick={() => router.push('/hr/employees')} className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <TiltCard>
              <div className="w-14 h-14 rounded-xl bg-primary/20 backdrop-blur-md shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] border border-primary/30 flex items-center justify-center text-xl font-bold text-primary">
                {initials}
              </div>
            </TiltCard>
            <div>
              <h1 className="text-2xl font-bold text-white drop-shadow-md">{employee.first_name} {employee.last_name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[employee.primary_role] || ROLE_COLORS.employee}`}>
                  {employee.primary_role.replace('_', ' ')}
                </span>
                {employee.department && <span className="text-xs text-white/60">{employee.department}</span>}
              </div>
            </div>
          </div>
          <Button variant={editing ? 'outline' : 'primary'} size="sm" className="gap-1" onClick={() => setEditing(!editing)}>
            <Edit2 className="w-3.5 h-3.5" /> {editing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
      </FadeIn>

      {/* Save feedback */}
      <AnimatePresence>
        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`px-4 py-3 rounded-lg text-sm ${saveMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
          >
            {saveMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left column: Profile info */}
        <FadeIn className="md:col-span-1 space-y-4">
          <GlassPanel>
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white text-sm">Personal Information</h3>
            </div>
            <div className="p-6 space-y-3">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-white/60">Phone</label>
                    <input type="text" className="w-full mt-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-white/60">Department</label>
                    <input type="text" className="w-full mt-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white" value={editForm.department} onChange={(e) => setEditForm({...editForm, department: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-white/60">Designation</label>
                    <input type="text" className="w-full mt-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white" value={editForm.designation} onChange={(e) => setEditForm({...editForm, designation: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-white/60">Status</label>
                    <select className="w-full mt-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white" value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value})}>
                      {['onboarding', 'probation', 'active', 'on_notice', 'suspended', 'resigned', 'terminated', 'exited'].map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/60">Role</label>
                    <select className="w-full mt-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white" value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value})}>
                      {['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'].map((r) => (
                        <option key={r} value={r}>{r.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/60">Secondary Roles</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {['admin', 'hr', 'director', 'manager', 'team_lead', 'employee']
                        .filter(r => r !== editForm.role)
                        .map((r) => {
                          const isSelected = editForm.secondaryRoles.includes(r);
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => {
                                setEditForm(prev => ({
                                  ...prev,
                                  secondaryRoles: isSelected
                                    ? prev.secondaryRoles.filter(sr => sr !== r)
                                    : [...prev.secondaryRoles, r],
                                }));
                              }}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-white/5 text-white/60 border-white/10 hover:border-primary/50'
                              }`}
                            >
                              {r.replace('_', ' ')}
                            </button>
                          );
                        })}
                    </div>
                    <p className="text-[10px] text-white/40 mt-1">Click to toggle secondary roles</p>
                  </div>
                  <Button variant="primary" size="sm" className="w-full mt-2" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Save Changes
                  </Button>
                </div>
              ) : (
                <>
                  <InfoRow icon={Mail} label="Email" value={employee.email} />
                  <InfoRow icon={Phone} label="Phone" value={employee.phone || '--'} />
                  <InfoRow icon={Building2} label="Department" value={employee.department || '--'} />
                  <InfoRow icon={Briefcase} label="Designation" value={employee.designation || '--'} />
                  <InfoRow icon={Shield} label="Role" value={employee.primary_role.replace('_', ' ')} />
                  {employee.secondary_roles && employee.secondary_roles.length > 0 && (
                    <div className="flex items-start gap-3 py-2.5">
                      <Shield className="w-4 h-4 text-white/60 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs text-white/60">Secondary Roles</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {employee.secondary_roles.map((r: string) => (
                            <span key={r} className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {r.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <InfoRow icon={Calendar} label="Joined" value={employee.date_of_joining ? new Date(employee.date_of_joining).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '--'} />
                  <InfoRow icon={UserCheck} label="Manager" value={employee.manager ? `${employee.manager.first_name} ${employee.manager.last_name}` : '--'} />
                  <InfoRow icon={Clock} label="Gender" value={employee.gender || '--'} />
                </>
              )}
            </div>
          </GlassPanel>

          {/* Summary stats */}
          <GlassPanel>
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white text-sm">Leave Summary</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-2xl font-bold text-blue-400">{totalEntitled}</p>
                  <p className="text-xs text-white/60">Total Entitled</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-2xl font-bold text-emerald-400">{totalEntitled - totalUsed}</p>
                  <p className="text-xs text-white/60">Remaining</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-2xl font-bold text-amber-400">{totalUsed}</p>
                  <p className="text-xs text-white/60">Used</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-2xl font-bold text-purple-400">{employee.leave_requests.length}</p>
                  <p className="text-xs text-white/60">Requests</p>
                </div>
              </div>
            </div>
          </GlassPanel>
        </FadeIn>

        {/* Right column: Leave balances + requests */}
        <FadeIn className="md:col-span-2 space-y-4">
          {/* Leave Balances */}
          <GlassPanel>
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white text-sm">Leave Balances ({new Date().getFullYear()})</h3>
            </div>
            <div className="p-6">
              {employee.leave_balances.length === 0 ? (
                <p className="text-sm text-white/60 text-center py-4">No leave balances found.</p>
              ) : (
                <div className="space-y-3">
                  {employee.leave_balances.map((b) => {
                    const total = b.annual_entitlement + b.carried_forward;
                    const usedPct = total > 0 ? (b.used_days / total) * 100 : 0;
                    const variant = usedPct > 80 ? 'danger' : usedPct > 50 ? 'warning' : 'success';

                    return (
                      <div key={b.id} className="flex items-center gap-4">
                        <div className="w-16 text-xs font-medium text-white/60 shrink-0">{b.leave_type}</div>
                        <div className="flex-1">
                          <ProgressBar value={b.used_days} max={total || 1} variant={variant} animated />
                        </div>
                        <div className="w-28 text-right text-xs shrink-0">
                          <span className="font-medium text-white">{b.remaining}</span>
                          <span className="text-white/60"> / {total} remaining</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </GlassPanel>

          {/* Recent Leave Requests */}
          <GlassPanel>
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white text-sm">Recent Leave Requests</h3>
                <Badge variant="default" size="sm">{employee.leave_requests.length}</Badge>
              </div>
            </div>
            <div className="p-6">
              {employee.leave_requests.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="w-8 h-8 text-white/60 mx-auto mb-2" />
                  <p className="text-sm text-white/60">No leave requests found.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {employee.leave_requests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant={LEAVE_STATUS_VARIANT[req.status] || 'default'} size="sm">
                          {req.status}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">{req.leave_type}</p>
                          <p className="text-xs text-white/60 truncate">
                            {new Date(req.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                            {req.start_date !== req.end_date && ` - ${new Date(req.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-white">{req.total_days} day{req.total_days !== 1 ? 's' : ''}</p>
                        <p className="text-xs text-white/60">
                          {new Date(req.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassPanel>
        </FadeIn>
      </div>
    </StaggerContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  InfoRow helper                                                     */
/* ------------------------------------------------------------------ */

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <Icon className="w-4 h-4 text-white/60 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-white/60">{label}</p>
        <p className="text-sm font-medium text-white truncate">{value}</p>
      </div>
    </div>
  );
}
