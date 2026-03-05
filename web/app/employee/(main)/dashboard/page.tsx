'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface LeaveBalance {
  leave_type: string;
  annual_entitlement: number;
  remaining: number;
}

// Placeholder holiday list — replace with /api/holidays endpoint once implemented
const UPCOMING_HOLIDAYS = [
  { name: 'Holi', date: 'Mar 14, 2025', day: 'Friday' },
  { name: 'Good Friday', date: 'Apr 18, 2025', day: 'Friday' },
  { name: 'May Day', date: 'May 1, 2025', day: 'Thursday' },
  { name: 'Independence Day', date: 'Aug 15, 2025', day: 'Friday' },
];

// Maps commonly used leave types to display colors
const LEAVE_COLORS: Record<string, string> = {
  CL: 'bg-blue-500',
  SL: 'bg-green-500',
  PL: 'bg-purple-500',
  EL: 'bg-purple-500',
  WFH: 'bg-orange-500',
  LWP: 'bg-red-500',
  ML: 'bg-pink-500',
  PTL: 'bg-cyan-500',
  BL: 'bg-gray-500',
};

export default function EmployeeDashboardPage() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/leaves/balances');
        if (res.ok) {
          const json = await res.json();
          setBalances((json.balances ?? []).slice(0, 4));
        }
      } finally {
        setLoadingBalances(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back 👋</h1>
          <p className="text-muted-foreground mt-1">Here&apos;s your leave overview for this year</p>
        </div>
        <div className="flex gap-3" data-tutorial="apply-leave-btn">
          <Link
            href="/employee/request-leave"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            📝 Apply Leave
          </Link>
        </div>
      </div>

      {/* Leave Balance Cards */}
      <div data-tutorial="leave-balances">
        {loadingBalances ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {balances.map((balance) => (
              <Card key={balance.leave_type} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">{balance.leave_type}</p>
                    <Badge variant="info">{balance.leave_type}</Badge>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{balance.remaining}</p>
                  <p className="text-xs text-muted-foreground mt-1">of {balance.annual_entitlement} days remaining</p>
                  <div className="mt-3 w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className={`${LEAVE_COLORS[balance.leave_type] ?? 'bg-primary'} h-2 rounded-full transition-all duration-500`}
                      style={{
                        width: `${balance.annual_entitlement > 0 ? Math.min(100, (balance.remaining / balance.annual_entitlement) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            {balances.length === 0 && (
              <div className="col-span-4 text-center py-6 text-sm text-muted-foreground">
                No leave balances found. Contact your HR team.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card data-tutorial="quick-actions">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: '/employee/request-leave', icon: '📝', label: 'Apply for Leave', sub: 'Submit a new request' },
              { href: '/employee/leave-history', icon: '📅', label: 'View Leave History', sub: 'Check past requests' },
              { href: '/employee/attendance', icon: '🕐', label: 'My Attendance', sub: 'View attendance log' },
              { href: '/employee/documents', icon: '📁', label: 'Documents', sub: 'Payslips & letters' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 transition-all"
              >
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Holidays */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming Holidays</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {UPCOMING_HOLIDAYS.map((holiday) => (
              <div key={holiday.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{holiday.name}</p>
                  <p className="text-xs text-muted-foreground">{holiday.date}</p>
                </div>
                <Badge variant="default">{holiday.day}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
