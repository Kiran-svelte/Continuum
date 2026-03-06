'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonDashboard } from '@/components/ui/skeleton';
import { PageLoader } from '@/components/ui/progress';
import { StartTutorialButton, hrTutorial } from '@/components/tutorial';
import { ensureMe } from '@/lib/client-auth';

const METRICS = [
  { label: 'Total Employees', value: '1,247', change: '+12 this month', icon: '👥' },
  { label: 'Pending Approvals', value: '23', change: '5 urgent', icon: '⏳' },
  { label: 'Today Absent', value: '34', change: '2.7% of workforce', icon: '🏠' },
  { label: 'SLA Breaches', value: '3', change: '2 critical', icon: '🚨' },
];

const RECENT_REQUESTS = [
  { id: 'LR-1042', employee: 'Priya Sharma', type: 'Casual Leave', dates: 'Jan 15–17', days: 3, status: 'pending' as const },
  { id: 'LR-1041', employee: 'Rahul Gupta', type: 'Sick Leave', dates: 'Jan 14', days: 1, status: 'pending' as const },
  { id: 'LR-1040', employee: 'Anita Desai', type: 'Privilege Leave', dates: 'Jan 20–24', days: 5, status: 'pending' as const },
  { id: 'LR-1039', employee: 'Vikram Patel', type: 'Work From Home', dates: 'Jan 13', days: 1, status: 'approved' as const },
  { id: 'LR-1038', employee: 'Meera Joshi', type: 'Casual Leave', dates: 'Jan 12', days: 1, status: 'approved' as const },
];

const STATUS_MAP: Record<string, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export default function HRDashboardPage() {
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

      // Only admin and hr roles can access HR portal
      if (role !== 'admin' && role !== 'hr') {
        if (role === 'manager' || role === 'team_lead' || role === 'director') {
          router.replace('/manager/dashboard');
        } else {
          router.replace('/employee/dashboard');
        }
        return;
      }

      // Check if onboarding is complete (only for admin)
      if (role === 'admin' && !me.company?.onboarding_completed) {
        router.replace('/onboarding');
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
          <h1 className="text-2xl font-bold text-foreground">HR Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your organization&apos;s leave management</p>
        </div>
        <StartTutorialButton tutorial={hrTutorial} variant="outline" className="text-xs px-3 py-1.5" />
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
        {METRICS.map((metric) => (
          <Card key={metric.label} className="animate-slide-up hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{metric.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{metric.change}</p>
                </div>
                <span className="text-3xl">{metric.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up stagger">
        {/* Recent Leave Requests */}
        <Card className="lg:col-span-2 animate-fade-in">
          <CardHeader>
            <CardTitle>Recent Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">ID</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Employee</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Type</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Dates</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Days</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_REQUESTS.map((req) => (
                    <tr key={req.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 font-mono text-xs text-muted-foreground">{req.id}</td>
                      <td className="py-3 px-2 text-foreground">{req.employee}</td>
                      <td className="py-3 px-2 text-muted-foreground">{req.type}</td>
                      <td className="py-3 px-2 text-muted-foreground">{req.dates}</td>
                      <td className="py-3 px-2 text-muted-foreground">{req.days}</td>
                      <td className="py-3 px-2">
                        <Badge variant={STATUS_MAP[req.status]}>{req.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href="/hr/employees" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 transition-all">
              <span className="text-xl">➕</span>
              <div>
                <p className="text-sm font-medium text-foreground">Add Employee</p>
                <p className="text-xs text-muted-foreground">Onboard a new team member</p>
              </div>
            </a>
            <a href="/hr/leave-requests" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 transition-all">
              <span className="text-xl">📋</span>
              <div>
                <p className="text-sm font-medium text-foreground">Review Requests</p>
                <p className="text-xs text-muted-foreground">23 pending approvals</p>
              </div>
            </a>
            <a href="/hr/reports" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 transition-all">
              <span className="text-xl">📊</span>
              <div>
                <p className="text-sm font-medium text-foreground">Generate Report</p>
                <p className="text-xs text-muted-foreground">Monthly leave analytics</p>
              </div>
            </a>
            <a href="/hr/policy-settings" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 transition-all">
              <span className="text-xl">⚙️</span>
              <div>
                <p className="text-sm font-medium text-foreground">Update Policies</p>
                <p className="text-xs text-muted-foreground">Configure leave rules</p>
              </div>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
