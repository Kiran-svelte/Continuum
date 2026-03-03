import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const DEPARTMENTS = [
  { name: 'Engineering', head: 'Anjali Patel', employees: 18, teams: 3 },
  { name: 'Product', head: 'Rohit Verma', employees: 8, teams: 2 },
  { name: 'Design', head: 'Priya Mehta', employees: 5, teams: 1 },
  { name: 'Sales', head: 'Vikram Shah', employees: 12, teams: 2 },
  { name: 'Operations', head: 'Neha Gupta', employees: 6, teams: 1 },
  { name: 'HR', head: 'Sunita Nair', employees: 3, teams: 1 },
];

export default function OrganizationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization</h1>
        <p className="text-gray-500 mt-1">Departments, teams, and org structure</p>
      </div>

      {/* Org Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Departments', value: String(DEPARTMENTS.length), icon: '🏢' },
          { label: 'Total Teams', value: String(DEPARTMENTS.reduce((a, d) => a + d.teams, 0)), icon: '👨‍👩‍👧‍👦' },
          { label: 'Total Employees', value: String(DEPARTMENTS.reduce((a, d) => a + d.employees, 0)), icon: '👥' },
          { label: 'Job Levels', value: '6', icon: '📊' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">{item.label}</p>
              <div className="flex items-center gap-2 mt-1">
                <span>{item.icon}</span>
                <span className="text-2xl font-bold text-gray-900">{item.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Departments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Departments</CardTitle>
            <button className="text-sm text-blue-600 font-medium hover:underline">+ Add Department</button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEPARTMENTS.map((dept) => (
              <div
                key={dept.name}
                className="p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{dept.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Head: {dept.head}</p>
                  </div>
                  <Badge variant="info">{dept.employees} members</Badge>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span>🧑‍🤝‍🧑 {dept.teams} team{dept.teams !== 1 ? 's' : ''}</span>
                  <button className="text-blue-600 hover:underline">View org chart</button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
