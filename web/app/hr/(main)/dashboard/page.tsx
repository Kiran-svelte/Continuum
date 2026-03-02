import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your organization&apos;s leave management</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {METRICS.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{metric.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{metric.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{metric.change}</p>
                </div>
                <span className="text-3xl">{metric.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leave Requests */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">ID</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Employee</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Type</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Dates</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Days</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_REQUESTS.map((req) => (
                    <tr key={req.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-2 font-mono text-xs text-gray-600">{req.id}</td>
                      <td className="py-3 px-2 text-gray-900">{req.employee}</td>
                      <td className="py-3 px-2 text-gray-600">{req.type}</td>
                      <td className="py-3 px-2 text-gray-600">{req.dates}</td>
                      <td className="py-3 px-2 text-gray-600">{req.days}</td>
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
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href="/hr/employees" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
              <span className="text-xl">➕</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Add Employee</p>
                <p className="text-xs text-gray-500">Onboard a new team member</p>
              </div>
            </a>
            <a href="/hr/leave-requests" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
              <span className="text-xl">📋</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Review Requests</p>
                <p className="text-xs text-gray-500">23 pending approvals</p>
              </div>
            </a>
            <a href="/hr/reports" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
              <span className="text-xl">📊</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Generate Report</p>
                <p className="text-xs text-gray-500">Monthly leave analytics</p>
              </div>
            </a>
            <a href="/hr/policy-settings" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
              <span className="text-xl">⚙️</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Update Policies</p>
                <p className="text-xs text-gray-500">Configure leave rules</p>
              </div>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
