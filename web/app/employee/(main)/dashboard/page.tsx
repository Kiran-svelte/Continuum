import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const LEAVE_BALANCES = [
  { type: 'Casual Leave', short: 'CL', remaining: 7, total: 12, color: 'bg-blue-500' },
  { type: 'Sick Leave', short: 'SL', remaining: 5, total: 7, color: 'bg-green-500' },
  { type: 'Privilege Leave', short: 'PL', remaining: 12, total: 15, color: 'bg-purple-500' },
  { type: 'Work From Home', short: 'WFH', remaining: 18, total: 24, color: 'bg-orange-500' },
];

const UPCOMING_HOLIDAYS = [
  { name: 'Republic Day', date: 'Jan 26, 2025', day: 'Sunday' },
  { name: 'Holi', date: 'Mar 14, 2025', day: 'Friday' },
  { name: 'Good Friday', date: 'Apr 18, 2025', day: 'Friday' },
  { name: 'May Day', date: 'May 1, 2025', day: 'Thursday' },
];

export default function EmployeeDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, Rahul</h1>
          <p className="text-gray-500 mt-1">Here&apos;s your leave overview for this year</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/employee/request-leave"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            📝 Apply Leave
          </Link>
          <button className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            🕐 Check In
          </button>
        </div>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {LEAVE_BALANCES.map((balance) => (
          <Card key={balance.short}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{balance.type}</p>
                <Badge variant="info">{balance.short}</Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900">{balance.remaining}</p>
              <p className="text-xs text-gray-400 mt-1">of {balance.total} days remaining</p>
              <div className="mt-3 w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`${balance.color} h-2 rounded-full transition-all`}
                  style={{ width: `${(balance.remaining / balance.total) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Calendar Placeholder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Team Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
              <div className="text-center">
                <span className="text-4xl">📅</span>
                <p className="text-sm text-gray-500 mt-2">Team calendar view</p>
                <p className="text-xs text-gray-400 mt-1">Shows team members&apos; leave schedules</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Holidays */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Holidays</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {UPCOMING_HOLIDAYS.map((holiday) => (
              <div key={holiday.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{holiday.name}</p>
                  <p className="text-xs text-gray-500">{holiday.date}</p>
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
