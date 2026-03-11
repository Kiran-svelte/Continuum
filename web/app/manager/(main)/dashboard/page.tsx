'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonDashboard } from '@/components/ui/skeleton';
import { PageLoader } from '@/components/ui/progress';
import { StartTutorialButton, managerTutorial } from '@/components/tutorial';
import { ensureMe } from '@/lib/client-auth';
import {
  Users,
  Clock,
  BarChart3,
  Home,
  CheckSquare,
  CheckCircle,
  Check,
  X,
  type LucideIcon,
} from 'lucide-react';

interface LeaveRequestRow {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  created_at: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
  };
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  department: string | null;
  designation: string | null;
  status: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

export default function ManagerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [userName, setUserName] = useState('');
  const [pendingRequests, setPendingRequests] = useState<LeaveRequestRow[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [teamSize, setTeamSize] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [todayOnLeave, setTodayOnLeave] = useState(0);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [managerId, setManagerId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await ensureMe();
      if (cancelled) return;
      if (!me) {
        router.replace('/sign-in');
        return;
      }

      const role = me.primary_role ?? 'employee';
      const allowedRoles = ['admin', 'hr', 'director', 'manager', 'team_lead'];
      if (!allowedRoles.includes(role)) {
        router.replace('/employee/dashboard');
        return;
      }

      setUserName(me.first_name || 'Manager');
      setManagerId(me.id);
      setAuthChecked(true);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [router]);

  const fetchPendingRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/leaves/list?status=pending&limit=10', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(data.requests ?? []);
        setPendingCount(data.pagination?.total ?? 0);
      }
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const fetchTeam = useCallback(async () => {
    if (!managerId) return;
    setLoadingTeam(true);
    try {
      const res = await fetch(`/api/employees?manager_id=${managerId}&limit=20`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.employees ?? []);
        setTeamSize(data.pagination?.total ?? 0);
      }
    } finally {
      setLoadingTeam(false);
    }
  }, [managerId]);

  const fetchTodayOnLeave = useCallback(async () => {
    try {
      const res = await fetch('/api/leaves/list?status=approved&limit=100', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const today = new Date().toISOString().split('T')[0];
        const count = (data.requests ?? []).filter((r: LeaveRequestRow) => {
          const start = r.start_date?.split('T')[0];
          const end = r.end_date?.split('T')[0];
          return start <= today && end >= today;
        }).length;
        setTodayOnLeave(count);
      }
    } catch {
      // leave todayOnLeave at 0 on error
    }
  }, []);

  useEffect(() => {
    if (authChecked && managerId) {
      fetchPendingRequests();
      fetchTeam();
      fetchTodayOnLeave();
    }
  }, [authChecked, managerId, fetchPendingRequests, fetchTeam, fetchTodayOnLeave]);

  function showSuccess(msg: string) {
    setActionSuccess(msg);
    setActionError(null);
    setTimeout(() => setActionSuccess(null), 4000);
  }

  function showError(msg: string) {
    setActionError(msg);
    setActionSuccess(null);
    setTimeout(() => setActionError(null), 5000);
  }

  async function handleApprove(requestId: string) {
    setApprovingId(requestId);
    try {
      const res = await fetch(`/api/leaves/approve/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comments: '' }),
      });
      if (res.ok) {
        const req = pendingRequests.find(r => r.id === requestId);
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
        setPendingCount(c => Math.max(0, c - 1));
        showSuccess(`Approved leave request for ${req?.employee.first_name ?? 'employee'}`);
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error ?? 'Failed to approve request');
      }
    } catch {
      showError('Network error while approving request');
    } finally {
      setApprovingId(null);
    }
  }

  async function handleReject(requestId: string) {
    setRejectModalId(requestId);
    setRejectReason('');
    setRejectModalOpen(true);
  }

  async function confirmReject() {
    const requestId = rejectModalId;
    if (!requestId) return;
    setRejectModalOpen(false);
    setRejectingId(requestId);
    try {
      const res = await fetch(`/api/leaves/reject/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comments: rejectReason }),
      });
      if (res.ok) {
        const req = pendingRequests.find(r => r.id === requestId);
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
        setPendingCount(c => Math.max(0, c - 1));
        showSuccess(`Rejected leave request for ${req?.employee.first_name ?? 'employee'}`);
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error ?? 'Failed to reject request');
      }
    } catch {
      showError('Network error while rejecting request');
    } finally {
      setRejectingId(null);
      setRejectModalId(null);
      setRejectReason('');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  if (!authChecked || loading) {
    return (
      <>
        <PageLoader />
        <SkeletonDashboard />
      </>
    );
  }

  const metrics: { label: string; value: number; detail: string; icon: LucideIcon; color: string; bgColor: string; textColor: string }[] = [
    { label: 'Team Size', value: teamSize, detail: `${teamSize} members`, icon: Users, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-500/10', textColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Pending Approvals', value: pendingCount, detail: pendingCount > 0 ? `${Math.min(pendingCount, 3)} need attention` : 'All clear', icon: Clock, color: 'from-amber-500 to-orange-500', bgColor: 'bg-amber-500/10', textColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Team Available', value: teamSize - todayOnLeave, detail: `${teamSize > 0 ? (((teamSize - todayOnLeave) / teamSize) * 100).toFixed(0) : 0}% available`, icon: BarChart3, color: 'from-emerald-500 to-green-600', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'On Leave Today', value: todayOnLeave, detail: todayOnLeave > 0 ? `${todayOnLeave} away` : 'Full team present', icon: Home, color: 'from-purple-500 to-violet-600', bgColor: 'bg-purple-500/10', textColor: 'text-purple-600 dark:text-purple-400' },
  ];

  return (
    <motion.div
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div className="flex items-center justify-between" variants={itemVariants}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Hi, {userName}
          </h1>
          <p className="text-muted-foreground mt-1">Team overview and pending actions</p>
        </div>
        <div className="flex items-center gap-3">
          <StartTutorialButton tutorial={managerTutorial} variant="outline" className="text-xs px-3 py-1.5" />
          <Link
            href="/manager/approvals"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <CheckSquare className="w-4 h-4" />
            Review All
          </Link>
        </div>
      </motion.div>

      {/* Metrics */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" variants={containerVariants}>
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              variants={itemVariants}
              whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)' }}
            >
              <Card className="relative overflow-hidden border-0 shadow-md">
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${metric.color}`} />
                <CardContent className="pt-6 pb-5">
                  {(loadingRequests || loadingTeam) ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-10 rounded-xl" />
                      </div>
                      <Skeleton className="h-8 w-12" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                        <div className={`w-10 h-10 rounded-xl ${metric.bgColor} flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${metric.textColor}`} />
                        </div>
                      </div>
                      <motion.p
                        className={`text-3xl font-bold ${metric.textColor}`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', delay: index * 0.1 + 0.3 }}
                      >
                        {metric.value}
                      </motion.p>
                      <p className="text-xs text-muted-foreground">{metric.detail}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals - Real data */}
        <motion.div className="lg:col-span-2" variants={itemVariants}>
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Pending Approvals</CardTitle>
                {pendingCount > 0 && (
                  <Badge variant="warning">{pendingCount} pending</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Success / Error messages */}
              {actionSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-6 mt-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {actionSuccess}
                </motion.div>
              )}
              {actionError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-6 mt-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2"
                >
                  <X className="w-4 h-4 shrink-0" />
                  {actionError}
                </motion.div>
              )}
              {loadingRequests ? (
                <div className="divide-y divide-border/50">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="px-6 py-4 animate-pulse">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-20 rounded-lg" />
                          <Skeleton className="h-8 w-16 rounded-lg" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">No pending approvals</p>
                  <p className="text-xs text-muted-foreground mt-1">You&apos;re all caught up!</p>
                </div>
              ) : (
                <motion.div className="divide-y divide-border/50" initial="hidden" animate="visible" variants={containerVariants}>
                  {pendingRequests.map((req) => (
                    <motion.div
                      key={req.id}
                      variants={itemVariants}
                      className="px-6 py-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                          {req.employee.first_name?.[0]}{req.employee.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {req.employee.first_name} {req.employee.last_name}
                            </p>
                            <span className="text-xs text-muted-foreground font-mono">{req.id.slice(0, 8)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {req.leave_type} · {formatDate(req.start_date)}
                            {req.start_date !== req.end_date && ` – ${formatDate(req.end_date)}`}
                            {' · '}{req.total_days} day{req.total_days !== 1 ? 's' : ''}
                            {' · '}{timeAgo(req.created_at)}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="success"
                            size="sm"
                            loading={approvingId === req.id}
                            disabled={approvingId === req.id || rejectingId === req.id}
                            onClick={() => handleApprove(req.id)}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={rejectingId === req.id}
                            disabled={rejectingId === req.id || approvingId === req.id}
                            onClick={() => handleReject(req.id)}
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Team Members */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Team Members</CardTitle>
                <Link href="/manager/team" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingTeam ? (
                <div className="divide-y divide-border/50">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="px-6 py-3 animate-pulse">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">No team members found</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50 max-h-[400px] overflow-y-auto">
                  {teamMembers.slice(0, 10).map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.04 }}
                      className="px-6 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center text-xs font-medium text-primary">
                            {member.first_name?.[0]}{member.last_name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{member.first_name} {member.last_name}</p>
                            {member.designation && (
                              <p className="text-xs text-muted-foreground">{member.designation}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={member.status === 'active' ? 'success' : 'default'}>
                          {member.status === 'active' ? 'Active' : member.status}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Reject Leave Request Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Leave Request"
        size="sm"
      >
        <textarea
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          rows={3}
          placeholder="Reason for rejection (optional)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
        <ModalFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRejectModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={confirmReject}
          >
            Confirm Reject
          </Button>
        </ModalFooter>
      </Modal>
    </motion.div>
  );
}
