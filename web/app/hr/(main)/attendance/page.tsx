import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ATTENDANCE_SUMMARY = [
  { label: 'Total Employees', value: '—', icon: '👥' },
  { label: 'Present Today', value: '—', icon: '✅' },
  { label: 'On Leave Today', value: '—', icon: '🏠' },
  { label: 'Absent Today', value: '—', icon: '❌' },
];

export default function HRAttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-500 mt-1">Company-wide attendance overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ATTENDANCE_SUMMARY.map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
                </div>
                <span className="text-2xl">{item.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Register</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
            <div className="text-center">
              <span className="text-4xl">🕐</span>
              <p className="text-sm text-gray-500 mt-2">Attendance tracking</p>
              <p className="text-xs text-gray-400 mt-1">Real-time check-in/check-out data</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Connect your biometric device or enable self-check-in from the employee portal to start tracking attendance.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Absences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center">
              <span className="text-3xl">📋</span>
              <p className="text-sm text-gray-500 mt-2">No absences recorded today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Late Arrivals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center">
              <span className="text-3xl">⏰</span>
              <p className="text-sm text-gray-500 mt-2">No late arrivals today</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
