'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LeaveBalance {
  leave_type: string;
  annual_entitlement: number;
  carried_forward: number;
  used_days: number;
  pending_days: number;
  remaining: number;
}

interface LeaveData {
  year: number;
  balances: LeaveBalance[];
}

// Simple attendance stub since real attendance would need a separate feature
const MOCK_ATTENDANCE = [
  { date: 'Today', status: 'Present', time_in: '09:02', time_out: '—', hours: '—' },
  { date: 'Yesterday', status: 'Present', time_in: '09:15', time_out: '18:45', hours: '9h 30m' },
  { date: '2 days ago', status: 'WFH', time_in: '09:05', time_out: '18:30', hours: '9h 25m' },
  { date: '3 days ago', status: 'Present', time_in: '09:00', time_out: '18:00', hours: '9h 00m' },
  { date: '4 days ago', status: 'On Leave', time_in: '—', time_out: '—', hours: '—' },
  { date: '5 days ago', status: 'Present', time_in: '09:30', time_out: '19:00', hours: '9h 30m' },
  { date: '6 days ago', status: 'Present', time_in: '09:10', time_out: '18:20', hours: '9h 10m' },
];

const STATUS_BADGE: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
  Present: 'success',
  WFH: 'info',
  'On Leave': 'warning',
  Absent: 'danger' as 'default',
};

export default function AttendancePage() {
  const [leaveData, setLeaveData] = useState<LeaveData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/leaves/balances');
        if (res.ok) {
          const json = await res.json();
          setLeaveData(json);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const presentDays = MOCK_ATTENDANCE.filter((a) => a.status === 'Present').length;
  const wfhDays = MOCK_ATTENDANCE.filter((a) => a.status === 'WFH').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-500 mt-1">Your attendance log and leave balances</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Present This Week', value: String(presentDays), icon: '✅', color: 'text-green-600' },
          { label: 'WFH This Week', value: String(wfhDays), icon: '🏠', color: 'text-blue-600' },
          { label: 'Monthly Hours', value: '162h', icon: '⏱️', color: 'text-purple-600' },
          { label: 'Attendance %', value: '96%', icon: '📊', color: 'text-orange-600' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">{item.label}</p>
              <div className="flex items-center gap-2 mt-1">
                <span>{item.icon}</span>
                <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {MOCK_ATTENDANCE.map((record) => (
                <div
                  key={record.date}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{record.date}</p>
                    <p className="text-xs text-gray-400">
                      {record.time_in !== '—' ? `In: ${record.time_in}` : ''}
                      {record.time_out !== '—' ? ` · Out: ${record.time_out}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.hours !== '—' && (
                      <span className="text-xs text-gray-400">{record.hours}</span>
                    )}
                    <Badge variant={STATUS_BADGE[record.status] ?? 'default'}>{record.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leave Balances */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Balances {leaveData ? `(${leaveData.year})` : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && <div className="text-sm text-gray-400 py-4 text-center">Loading…</div>}
            {!loading && leaveData && (
              <div className="space-y-3">
                {leaveData.balances.map((b) => (
                  <div key={b.leave_type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{b.leave_type}</span>
                      <span className="text-sm text-gray-900">
                        <span className="font-semibold">{b.remaining}</span>
                        <span className="text-gray-400"> / {b.annual_entitlement}</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{
                          width: `${b.annual_entitlement > 0 ? Math.min(100, (b.remaining / b.annual_entitlement) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading && !leaveData && (
              <p className="text-sm text-gray-400 py-4 text-center">Could not load balances.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
