'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StartTutorialButton, managerTutorial } from '@/components/tutorial';
import { ensureMe } from '@/lib/client-auth';
import { cn } from '@/lib/utils';
import {
  Users,
  Clock,
  Home,
  CheckSquare,
  CheckCircle,
  Check,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Zap,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

// Types
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
  designation: string | null;
  status: string;
}

interface DashboardMetrics {
  teamSize: number;
  pendingCount: number;
  activeCount: number;
  onLeaveCount: number;
}

const METRIC_CONFIG: { key: keyof DashboardMetrics; label: string; icon: LucideIcon; bg: string; text: string }[] = [
  { key: 'teamSize', label: 'Team Size', icon: Users, bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
  { key: 'pendingCount', label: 'Pending Requests', icon: Clock, bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
  { key: 'activeCount', label: 'Active Members', icon: Zap, bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'onLeaveCount', label: 'On Leave Today', icon: Home, bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400' },
];

export default function ManagerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [pendingRequests, setPendingRequests] = useState<LeaveRequestRow[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [managerId, setManagerId] = useState<string | null>(null);

  const fetchData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [requestsRes, teamRes, onLeaveRes] = await Promise.all([
        fetch('/api/leaves/list?status=pending&limit=10', { credentials: 'include' }),
        fetch(`/api/employees?manager_id=${id}&limit=20`, { credentials: 'include' }),
        fetch('/api/leaves/list?status=approved&limit=100', { credentials: 'include' }),
      ]);

      if (!requestsRes.ok || !teamRes.ok) throw new Error('Failed to fetch data');

      const requestsData = await requestsRes.json();
      setPendingRequests(requestsData.requests ?? []);

      const teamData = await teamRes.json();
      setTeamMembers(teamData.employees ?? []);

      const teamSize = teamData.pagination?.total ?? 0;
      const pendingCount = requestsData.pagination?.total ?? 0;

      let onLeaveCount = 0;
      if (onLeaveRes.ok) {
        const onLeaveData = await onLeaveRes.json();
        const today = new Date().toISOString().split('T')[0];
        onLeaveCount = (onLeaveData.requests ?? []).filter((r: LeaveRequestRow) => {
          const start = r.start_date?.split('T')[0];
          const end = r.end_date?.split('T')[0];
          return start <= today && end >= today;
        }).length;
      }

      setMetrics({
        teamSize,
        pendingCount,
        activeCount: teamSize - onLeaveCount,
        onLeaveCount,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ensureMe().then(me => {
      if (!me) {
        router.replace('/sign-in');
        return;
      }
      const allowedRoles = ['admin', 'hr', 'director', 'manager', 'team_lead'];
      if (!allowedRoles.includes(me.primary_role ?? 'employee')) {
        router.replace('/employee/dashboard');
        return;
      }
      setUserName(me.first_name || 'Manager');
      setManagerId(me.id);
      fetchData(me.id);
    });
  }, [router, fetchData]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="card p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Unable to load dashboard</h2>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Button onClick={() => managerId && fetchData(managerId)} className="mt-6">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome, {userName}</h1>
          <p className="text-muted-foreground">Manage your team and review requests</p>
        </div>
        <div className="flex items-center gap-3">
          <StartTutorialButton tutorial={managerTutorial} />
          <Button onClick={() => router.push('/manager/approvals')}>
            <CheckSquare className="w-4 h-4 mr-2" />
            Review Approvals
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRIC_CONFIG.map((config) => (
          <div key={config.key} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{config.label}</p>
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.bg)}>
                <config.icon className={cn('w-5 h-5', config.text)} />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground tabular-nums">
              {metrics?.[config.key] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Pending Requests
            </h3>
            {pendingRequests.length > 0 && (
              <Badge variant="warning">{pendingRequests.length} waiting</Badge>
            )}
          </div>
          <PendingApprovalsSection
            requests={pendingRequests}
            onUpdate={fetchData}
            managerId={managerId}
          />
        </div>

        {/* Team Members */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Team Members
            </h3>
            <Link href="/manager/team" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <TeamMembersSection members={teamMembers} />
        </div>
      </div>
    </div>
  );
}

function PendingApprovalsSection({
  requests,
  onUpdate,
  managerId,
}: {
  requests: LeaveRequestRow[];
  onUpdate: (id: string) => void;
  managerId: string | null;
}) {
  const [actionState, setActionState] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const handleAction = async (action: 'approve' | 'reject', requestId: string) => {
    if (!managerId) return;
    setActioningId(requestId);
    setActionState(null);
    try {
      const res = await fetch(`/api/leaves/${action}/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comments: '' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${action} request`);
      }
      setActionState({ type: 'success', message: `Request ${action}d successfully` });
      onUpdate(managerId);
    } catch (e) {
      setActionState({ type: 'error', message: e instanceof Error ? e.message : 'An error occurred' });
    } finally {
      setActioningId(null);
      setTimeout(() => setActionState(null), 4000);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <CheckCircle className="w-12 h-12 mb-3 opacity-50" />
        <p className="font-medium">All caught up!</p>
        <p className="text-sm">No pending requests</p>
      </div>
    );
  }

  return (
    <div>
      {actionState && (
        <div className={cn(
          'mx-4 mt-4 p-3 rounded-lg text-sm flex items-center gap-2',
          actionState.type === 'success' 
            ? 'bg-success/10 text-success border border-success/20' 
            : 'bg-error/10 text-error border border-error/20'
        )}>
          {actionState.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {actionState.message}
        </div>
      )}
      <div className="divide-y divide-border">
        {requests.map(req => (
          <div key={req.id} className="p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                {req.employee.first_name[0]}{req.employee.last_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {req.employee.first_name} {req.employee.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {req.leave_type} • {req.total_days} day{req.total_days !== 1 ? 's' : ''} • {new Date(req.start_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-success/50 text-success hover:bg-success/10"
                  onClick={() => handleAction('approve', req.id)}
                  disabled={!!actioningId}
                >
                  {actioningId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-error/50 text-error hover:bg-error/10"
                  onClick={() => handleAction('reject', req.id)}
                  disabled={!!actioningId}
                >
                  {actioningId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamMembersSection({ members }: { members: TeamMember[] }) {
  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Users className="w-12 h-12 mb-3 opacity-50" />
        <p className="font-medium">No team members</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {members.slice(0, 8).map(member => (
        <div key={member.id} className="p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{member.first_name} {member.last_name}</p>
              <p className="text-sm text-muted-foreground">{member.designation || 'Employee'}</p>
            </div>
            <Badge variant={member.status === 'active' ? 'success' : 'default'}>
              {member.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
