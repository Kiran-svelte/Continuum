'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, TrendingUp } from 'lucide-react';

export default function AttendancePage() {

  // Mock data for attendance tracking
  const attendanceSummary = {
    thisWeek: {
      present: 142,
      absent: 8,
      late: 12,
      onLeave: 6
    },
    thisMonth: {
      avgAttendance: '94.2%',
      totalWorkingDays: 22,
      avgClockIn: '9:15 AM',
      earlyDepartures: 23
    }
  };

  const recentAttendance = [
    {
      id: 1,
      employee: {
        name: 'Rajesh Kumar',
        department: 'Engineering',
        avatar: 'RK'
      },
      date: '2024-01-15',
      clockIn: '9:45 AM',
      clockOut: '6:20 PM',
      status: 'late',
      hours: '8h 35m',
      location: 'Office'
    },
    {
      id: 2,
      employee: {
        name: 'Priya Sharma',
        department: 'Design',
        avatar: 'PS'
      },
      date: '2024-01-15',
      clockIn: '9:00 AM',
      clockOut: '6:00 PM',
      status: 'present',
      hours: '9h 00m',
      location: 'Office'
    },
    {
      id: 3,
      employee: {
        name: 'Amit Patel',
        department: 'Sales',
        avatar: 'AP'
      },
      date: '2024-01-15',
      clockIn: '9:30 AM',
      clockOut: '-',
      status: 'working',
      hours: '7h 45m',
      location: 'Remote'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'absent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'working':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Management</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage employee attendance and working hours
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <Clock className="w-4 h-4 mr-2" />
            Clock In/Out
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Present Today</p>
                <p className="text-2xl font-bold">{attendanceSummary.thisWeek.present}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold">{attendanceSummary.thisWeek.absent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Late Arrivals</p>
                <p className="text-2xl font-bold">{attendanceSummary.thisWeek.late}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Attendance</p>
                <p className="text-2xl font-bold">{attendanceSummary.thisMonth.avgAttendance}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Today's Attendance</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">Filter</Button>
              <Button variant="outline" size="sm">Search</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Employee</th>
                  <th className="text-left py-3 px-4 font-medium">Clock In</th>
                  <th className="text-left py-3 px-4 font-medium">Clock Out</th>
                  <th className="text-left py-3 px-4 font-medium">Hours</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Location</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {record.employee.avatar}
                        </div>
                        <div>
                          <p className="font-medium">{record.employee.name}</p>
                          <p className="text-sm text-muted-foreground">{record.employee.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-sm">{record.clockIn}</td>
                    <td className="py-4 px-4 font-mono text-sm">{record.clockOut}</td>
                    <td className="py-4 px-4 font-mono text-sm">{record.hours}</td>
                    <td className="py-4 px-4">
                      <Badge variant="default" className={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-sm">{record.location}</td>
                    <td className="py-4 px-4">
                      <Button variant="ghost" size="sm">
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
