'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonDashboard } from '@/components/ui/skeleton';
import { PageLoader } from '@/components/ui/progress';
import { StartTutorialButton, managerTutorial } from '@/components/tutorial';
import { ensureMe } from '@/lib/client-auth';

const TEAM_METRICS = [
  { label: 'Team Size', value: '18', detail: '2 on leave today', icon: '👥' },
  { label: 'Pending Approvals', value: '7', detail: '3 need urgent action', icon: '⏳' },
  { label: 'Team Utilization', value: '89%', detail: '16 of 18 available', icon: '📊' },
  { label: 'Avg Response Time', value: '4.2h', detail: 'SLA target: 8h', icon: '⚡' },
];

const PENDING_APPROVALS = [
  { id: 'LR-1042', employee: 'Priya Sharma', type: 'Casual Leave', dates: 'Jan 15–17', days: 3, submitted: '2 hours ago' },
  { id: 'LR-1041', employee: 'Rahul Gupta', type: 'Sick Leave', dates: 'Jan 14', days: 1, submitted: '4 hours ago' },
  { id: 'LR-1040', employee: 'Anita Desai', type: 'Privilege Leave', dates: 'Jan 20–24', days: 5, submitted: '1 day ago' },
  { id: 'LR-1039', employee: 'Karan Singh', type: 'Work From Home', dates: 'Jan 16', days: 1, submitted: '1 day ago' },
  { id: 'LR-1038', employee: 'Neha Mehta', type: 'Casual Leave', dates: 'Jan 17–18', days: 2, submitted: '2 days ago' },
];

const TEAM_AVAILABILITY = [
  { name: 'Priya Sharma', status: 'On Leave', badge: 'warning' as const },
  { name: 'Rahul Gupta', status: 'Available', badge: 'success' as const },
  { name: 'Anita Desai', status: 'Available', badge: 'success' as const },
  { name: 'Vikram Patel', status: 'WFH', badge: 'info' as const },
  { name: 'Meera Joshi', status: 'On Leave', badge: 'warning' as const },
  { name: 'Karan Singh', status: 'Available', badge: 'success' as const },
];

export default function ManagerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

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

      setAuthChecked(true);
      setTimeout(() => setLoading(false), 400);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!authChecked || loading) {
    return (
      <>
        <PageLoader />
        <SkeletonDashboard />
      </>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manager Dashboard</h1>
          <p className="text-muted-foreground mt-1">Team overview and pending actions</p>
        </div>
        <StartTutorialButton tutorial={managerTutorial} variant="outline" className="text-xs px-3 py-1.5" />
      </div>

      {/* Team Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
        {TEAM_METRICS.map((metric) => (
          <Card key={metric.label} className="animate-slide-up hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{metric.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{metric.detail}</p>
                </div>
                <span className="text-3xl">{metric.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up stagger">
        {/* Pending Approvals */}
        <Card className="lg:col-span-2 animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pending Approvals</CardTitle>
              <Badge variant="warning">7 pending</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {PENDING_APPROVALS.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{req.employee}</p>
                      <span className="text-xs text-muted-foreground font-mono">{req.id}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {req.type} · {req.dates} · {req.days} day{req.days > 1 ? 's' : ''} · Submitted {req.submitted}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors dark:text-green-400 dark:bg-green-950 dark:hover:bg-green-900">
                      Approve
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors dark:text-red-400 dark:bg-red-950 dark:hover:bg-red-900">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Availability */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Team Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {TEAM_AVAILABILITY.map((member) => (
              <div key={member.name} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {member.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <p className="text-sm text-foreground">{member.name}</p>
                </div>
                <Badge variant={member.badge}>{member.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
