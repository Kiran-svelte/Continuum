'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LeaveBalance {
  leave_type: string;
  annual_entitlement: number;
  used_days: number;
  pending_days: number;
  remaining: number;
}

export default function ProfilePage() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/leaves/balances');
        if (res.ok) {
          const json = await res.json();
          setBalances(json.balances ?? []);
        }
      } finally {
        setLoadingBalances(false);
      }
    }
    load();
  }, []);

  // Profile info is static until a /api/me endpoint is added
  const profile = {
    name: 'Rahul Sharma',
    email: 'rahul.sharma@company.com',
    designation: 'Senior Software Engineer',
    department: 'Engineering',
    role: 'employee',
    status: 'active',
    joining: 'Jun 1, 2023',
    phone: '+91 98765 43210',
    manager: 'Anjali Patel',
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Your employment details and leave summary</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-600">
              {profile.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{profile.name}</h2>
              <p className="text-gray-500 text-sm">{profile.designation} · {profile.department}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="success">{profile.status}</Badge>
                <Badge variant="info">{profile.role}</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
            {[
              { label: 'Email', value: profile.email },
              { label: 'Phone', value: profile.phone },
              { label: 'Date of Joining', value: profile.joining },
              { label: 'Reporting Manager', value: profile.manager },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{item.label}</p>
                <p className="text-sm text-gray-900 mt-0.5 font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leave Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Balance Summary ({new Date().getFullYear()})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingBalances && (
            <div className="text-sm text-gray-400 py-4 text-center">Loading balances…</div>
          )}
          {!loadingBalances && balances.length === 0 && (
            <div className="text-sm text-gray-400 py-4 text-center">No leave balances found.</div>
          )}
          {!loadingBalances && balances.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Leave Type</th>
                    <th className="text-right py-2 px-2 text-gray-500 font-medium">Entitled</th>
                    <th className="text-right py-2 px-2 text-gray-500 font-medium">Used</th>
                    <th className="text-right py-2 px-2 text-gray-500 font-medium">Pending</th>
                    <th className="text-right py-2 pl-2 text-gray-500 font-medium">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => (
                    <tr key={b.leave_type} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-4 font-medium text-gray-900">{b.leave_type}</td>
                      <td className="py-2 px-2 text-right text-gray-600">{b.annual_entitlement}</td>
                      <td className="py-2 px-2 text-right text-gray-600">{b.used_days}</td>
                      <td className="py-2 px-2 text-right text-yellow-600">{b.pending_days}</td>
                      <td className="py-2 pl-2 text-right font-semibold text-blue-600">{b.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
