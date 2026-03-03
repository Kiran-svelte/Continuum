import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Static team availability for manager view
const TEAM_AVAILABILITY = [
  { name: 'Priya Sharma', status: 'On Leave', badge: 'warning' as const, leave: 'CL until Jan 18' },
  { name: 'Rahul Gupta', status: 'Present', badge: 'success' as const, leave: null },
  { name: 'Anita Desai', status: 'Present', badge: 'success' as const, leave: null },
  { name: 'Vikram Patel', status: 'WFH', badge: 'info' as const, leave: null },
  { name: 'Meera Joshi', status: 'Present', badge: 'success' as const, leave: null },
  { name: 'Karan Singh', status: 'On Leave', badge: 'warning' as const, leave: 'PL until Jan 21' },
  { name: 'Sonal Mehta', status: 'Present', badge: 'success' as const, leave: null },
  { name: 'Arjun Nair', status: 'Present', badge: 'success' as const, leave: null },
];

export default function TeamAttendancePage() {
  const present = TEAM_AVAILABILITY.filter((m) => m.status === 'Present').length;
  const onLeave = TEAM_AVAILABILITY.filter((m) => m.status === 'On Leave').length;
  const wfh = TEAM_AVAILABILITY.filter((m) => m.status === 'WFH').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Attendance</h1>
        <p className="text-gray-500 mt-1">Today&apos;s team availability overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Present', value: String(present), color: 'text-green-600', icon: '✅' },
          { label: 'WFH', value: String(wfh), color: 'text-blue-600', icon: '🏠' },
          { label: 'On Leave', value: String(onLeave), color: 'text-yellow-600', icon: '🏖️' },
          {
            label: 'Availability',
            value: `${Math.round(((present + wfh) / TEAM_AVAILABILITY.length) * 100)}%`,
            color: 'text-purple-600',
            icon: '📊',
          },
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

      {/* Team List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Status Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {TEAM_AVAILABILITY.map((member) => (
              <div
                key={member.name}
                className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-50 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                    {member.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    {member.leave && (
                      <p className="text-xs text-yellow-600">{member.leave}</p>
                    )}
                  </div>
                </div>
                <Badge variant={member.badge}>{member.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
