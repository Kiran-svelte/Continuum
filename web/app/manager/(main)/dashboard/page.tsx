import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-500 mt-1">Team overview and pending actions</p>
      </div>

      {/* Team Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {TEAM_METRICS.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{metric.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{metric.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{metric.detail}</p>
                </div>
                <span className="text-3xl">{metric.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pending Approvals</CardTitle>
              <Badge variant="warning">7 pending</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {PENDING_APPROVALS.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{req.employee}</p>
                      <span className="text-xs text-gray-400 font-mono">{req.id}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {req.type} · {req.dates} · {req.days} day{req.days > 1 ? 's' : ''} · Submitted {req.submitted}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                      Approve
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Availability */}
        <Card>
          <CardHeader>
            <CardTitle>Team Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {TEAM_AVAILABILITY.map((member) => (
              <div key={member.name} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                    {member.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <p className="text-sm text-gray-900">{member.name}</p>
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
