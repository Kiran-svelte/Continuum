'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, TrendingUp, Download, Search, Filter, CheckCircle, XCircle, ClipboardList, AlertCircle } from 'lucide-react';

// ─── Daily Attendance Types ──────────────────────────────────────────────────

interface AttendanceRecord {
  employee_id: string;
  employee_name: string;
  initials: string;
  department: string;
  email: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  is_wfh: boolean;
  total_hours: number | null;
}

interface Summary {
  total: number;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  wfh: number;
  halfDay: number;
}

// ─── Regularization Types ────────────────────────────────────────────────────

interface RegularizationRequest {
  id: string;
  emp_id: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  created_at: string;
  attendance_id: string | null;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string;
    designation: string;
  };
}

interface RegSummary {
  pending: number;
  approved: number;
  rejected: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'regularization'>('daily');

  // ── Daily Attendance State ─────────────────────────────────────────────────
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, present: 0, late: 0, absent: 0, onLeave: 0, wfh: 0, halfDay: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Regularization State ───────────────────────────────────────────────────
  const [regRequests, setRegRequests] = useState<RegularizationRequest[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [regSummary, setRegSummary] = useState<RegSummary>({ pending: 0, approved: 0, rejected: 0 });
  const [regStatusFilter, setRegStatusFilter] = useState<string>('all');
  const [regPage, setRegPage] = useState(1);
  const [regTotalPages, setRegTotalPages] = useState(1);
  const [regTotal, setRegTotal] = useState(0);
  const [regActionLoading, setRegActionLoading] = useState<string | null>(null);
  const [regMessage, setRegMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Daily Attendance Logic (unchanged) ─────────────────────────────────────

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/hr/attendance?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRecords(data.records ?? []);
      setSummary(data.summary ?? { total: 0, present: 0, late: 0, absent: 0, onLeave: 0, wfh: 0, halfDay: 0 });
    } catch {
      setRecords([]);
      setSummary({ total: 0, present: 0, late: 0, absent: 0, onLeave: 0, wfh: 0, halfDay: 0 });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, searchQuery, statusFilter]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const formatTime = (datetime: string | null) => {
    if (!datetime) return '--';
    return new Date(datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatHours = (hours: number | null) => {
    if (hours === null || hours === undefined) return '--';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'late': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'absent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'on_leave': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'half_day': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ['Employee', 'Department', 'Date', 'Clock In', 'Clock Out', 'Hours', 'Status', 'Location'];
    const rows = records.map(r => [
      r.employee_name,
      r.department,
      r.date,
      r.check_in ? formatTime(r.check_in) : '',
      r.check_out ? formatTime(r.check_out) : '',
      r.total_hours !== null ? r.total_hours.toFixed(1) : '',
      r.status,
      r.is_wfh ? 'Remote' : 'Office',
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const attendanceRate = summary.total > 0
    ? (((summary.present + summary.late) / summary.total) * 100).toFixed(1)
    : '0.0';

  // ── Regularization Logic ───────────────────────────────────────────────────

  const fetchRegSummary = useCallback(async () => {
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch('/api/attendance/regularize?status=pending&limit=1'),
        fetch('/api/attendance/regularize?status=approved&limit=1'),
        fetch('/api/attendance/regularize?status=rejected&limit=1'),
      ]);

      const [pendingData, approvedData, rejectedData] = await Promise.all([
        pendingRes.ok ? pendingRes.json() : { pagination: { total: 0 } },
        approvedRes.ok ? approvedRes.json() : { pagination: { total: 0 } },
        rejectedRes.ok ? rejectedRes.json() : { pagination: { total: 0 } },
      ]);

      setRegSummary({
        pending: pendingData.pagination?.total ?? 0,
        approved: approvedData.pagination?.total ?? 0,
        rejected: rejectedData.pagination?.total ?? 0,
      });
    } catch {
      setRegSummary({ pending: 0, approved: 0, rejected: 0 });
    }
  }, []);

  const fetchRegRequests = useCallback(async () => {
    setRegLoading(true);
    try {
      const params = new URLSearchParams({ page: String(regPage), limit: '20' });
      if (regStatusFilter !== 'all') params.set('status', regStatusFilter);

      const res = await fetch(`/api/attendance/regularize?${params}`);
      if (!res.ok) throw new Error('Failed to fetch regularization requests');
      const data = await res.json();

      setRegRequests(data.regularizations ?? []);
      setRegTotalPages(data.pagination?.totalPages ?? 1);
      setRegTotal(data.pagination?.total ?? 0);
    } catch {
      setRegRequests([]);
      setRegTotalPages(1);
      setRegTotal(0);
    } finally {
      setRegLoading(false);
    }
  }, [regStatusFilter, regPage]);

  useEffect(() => {
    if (activeTab === 'regularization') {
      fetchRegSummary();
      fetchRegRequests();
    }
  }, [activeTab, fetchRegSummary, fetchRegRequests]);

  const handleRegAction = async (id: string, action: 'approve' | 'reject') => {
    setRegActionLoading(id);
    setRegMessage(null);
    try {
      const res = await fetch(`/api/attendance/regularize/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(data.error || 'Request failed');
      }

      const label = action === 'approve' ? 'approved' : 'rejected';
      setRegMessage({ type: 'success', text: `Request ${label} successfully.` });

      // Refresh both the list and summary counts
      fetchRegRequests();
      fetchRegSummary();
    } catch (err) {
      setRegMessage({ type: 'error', text: err instanceof Error ? err.message : 'An error occurred' });
    } finally {
      setRegActionLoading(null);
    }
  };

  const getRegStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">{status}</Badge>;
      case 'approved':
        return <Badge variant="success">{status}</Badge>;
      case 'rejected':
        return <Badge variant="danger">{status}</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const formatRegDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // ── Auto-clear inline messages ─────────────────────────────────────────────

  useEffect(() => {
    if (regMessage) {
      const timer = setTimeout(() => setRegMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [regMessage]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Attendance Management</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage employee attendance and working hours
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'daily'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Daily Attendance
        </button>
        <button
          onClick={() => setActiveTab('regularization')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'regularization'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Regularization Requests
          {regSummary.pending > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              {regSummary.pending}
            </span>
          )}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Daily Attendance Tab                                                */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {activeTab === 'daily' && (
        <>
          {/* Controls */}
          <div className="flex items-center justify-end flex-wrap gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-background"
            />
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={records.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Present Today</p>
                    <p className="text-2xl font-bold">{loading ? '...' : summary.present + summary.late}</p>
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
                    <p className="text-2xl font-bold">{loading ? '...' : summary.absent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Half Day</p>
                    <p className="text-2xl font-bold">{loading ? '...' : summary.halfDay}</p>
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
                    <p className="text-2xl font-bold">{loading ? '...' : summary.late}</p>
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
                    <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                    <p className="text-2xl font-bold">{loading ? '...' : `${attendanceRate}%`}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle>Attendance Records {'\u2014'} {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search employee..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-2 border rounded-md text-sm w-48 bg-background"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm bg-background"
                  >
                    <option value="all">All Status</option>
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                    <option value="on_leave">On Leave</option>
                    <option value="half_day">Half Day</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-14 bg-muted/50 rounded animate-pulse" />
                  ))}
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No attendance records found</p>
                  <p className="text-sm mt-1">No records match your current filters for this date.</p>
                </div>
              ) : (
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
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => (
                        <tr key={record.employee_id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                {record.initials}
                              </div>
                              <div>
                                <p className="font-medium">{record.employee_name}</p>
                                <p className="text-sm text-muted-foreground">{record.department}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono text-sm">{formatTime(record.check_in)}</td>
                          <td className="py-4 px-4 font-mono text-sm">{formatTime(record.check_out)}</td>
                          <td className="py-4 px-4 font-mono text-sm">{formatHours(record.total_hours)}</td>
                          <td className="py-4 px-4">
                            <Badge variant="default" className={getStatusColor(record.status)}>
                              {record.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-sm">{record.is_wfh ? 'Remote' : 'Office'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Regularization Requests Tab                                         */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {activeTab === 'regularization' && (
        <>
          {/* Inline Message */}
          {regMessage && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm ${
                regMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400'
              }`}
            >
              {regMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {regMessage.text}
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{regLoading && regRequests.length === 0 ? '...' : regSummary.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Approved</p>
                    <p className="text-2xl font-bold">{regLoading && regRequests.length === 0 ? '...' : regSummary.approved}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                    <p className="text-2xl font-bold">{regLoading && regRequests.length === 0 ? '...' : regSummary.rejected}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Regularization Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle>
                  Regularization Requests
                  {!regLoading && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({regTotal} {regTotal === 1 ? 'request' : 'requests'})
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <select
                    value={regStatusFilter}
                    onChange={(e) => { setRegStatusFilter(e.target.value); setRegPage(1); }}
                    className="px-3 py-2 border rounded-md text-sm bg-background"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {regLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-14 bg-muted/50 rounded animate-pulse" />
                  ))}
                </div>
              ) : regRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No regularization requests found</p>
                  <p className="text-sm mt-1">
                    {regStatusFilter !== 'all'
                      ? `No ${regStatusFilter} requests at this time.`
                      : 'There are no attendance regularization requests to review.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Employee</th>
                          <th className="text-left py-3 px-4 font-medium">Date</th>
                          <th className="text-left py-3 px-4 font-medium">Reason</th>
                          <th className="text-left py-3 px-4 font-medium">Submitted</th>
                          <th className="text-left py-3 px-4 font-medium">Status</th>
                          <th className="text-left py-3 px-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regRequests.map((req) => {
                          const empName = `${req.employee.first_name} ${req.employee.last_name}`;
                          const initials = `${req.employee.first_name.charAt(0)}${req.employee.last_name.charAt(0)}`.toUpperCase();
                          return (
                            <tr key={req.id} className="border-b hover:bg-muted/50 transition-colors">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                    {initials}
                                  </div>
                                  <div>
                                    <p className="font-medium">{empName}</p>
                                    <p className="text-sm text-muted-foreground">{req.employee.department}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-sm">{formatRegDate(req.date)}</td>
                              <td className="py-4 px-4 text-sm max-w-xs">
                                <p className="truncate" title={req.reason}>{req.reason}</p>
                              </td>
                              <td className="py-4 px-4 text-sm text-muted-foreground">{formatRegDate(req.created_at)}</td>
                              <td className="py-4 px-4">{getRegStatusBadge(req.status)}</td>
                              <td className="py-4 px-4">
                                {req.status === 'pending' ? (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={regActionLoading === req.id}
                                      onClick={() => handleRegAction(req.id, 'approve')}
                                      className="text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/20"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                      {regActionLoading === req.id ? '...' : 'Approve'}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={regActionLoading === req.id}
                                      onClick={() => handleRegAction(req.id, 'reject')}
                                      className="text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
                                    >
                                      <XCircle className="w-3.5 h-3.5 mr-1" />
                                      {regActionLoading === req.id ? '...' : 'Reject'}
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">--</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {regTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t mt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {regPage} of {regTotalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={regPage <= 1}
                          onClick={() => setRegPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={regPage >= regTotalPages}
                          onClick={() => setRegPage((p) => Math.min(regTotalPages, p + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
