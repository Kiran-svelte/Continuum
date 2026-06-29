'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, Users, TrendingUp, Download, Search, Filter, CheckCircle,
  XCircle, ClipboardList, AlertCircle, ChevronLeft, ChevronRight,
  Briefcase, UserX, CalendarClock, Building,
} from 'lucide-react';
import { useDebounce } from '@/lib/use-debounce';
import { StaggerContainer, FadeIn } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { TabButton } from '@/components/tab-button';
import { GlassPanel } from '@/components/glass-panel';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

// --- Types ---
interface AttendanceRecord {
  employee_id: string;
  employee_name: string;
  initials: string;
  department: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  is_wfh: boolean;
  total_hours: number | null;
}

interface Summary {
  total: number; present: number; late: number; absent: number;
  onLeave: number; wfh: number; halfDay: number;
}

interface RegularizationRequest {
  id: string;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  employee: { first_name: string; last_name: string; department: string; };
}

// --- Helper Components ---
const StatCard = ({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  colorClass: string;
}) => (
  <GlassPanel className="p-4 flex-1">
    <div className="flex items-center justify-between text-muted-foreground mb-2">
      <span className="text-xs font-medium uppercase">{label}</span>
      <Icon className={`w-5 h-5 ${colorClass}`} />
    </div>
    <p className="text-3xl font-bold text-foreground">{value}</p>
  </GlassPanel>
);

const LoadingSkeleton = ({ count = 5 }) => (
  <div className="space-y-2">
    {[...Array(count)].map((_, i) => (
      <Skeleton key={i} className="h-16 w-full bg-[var(--accent)] rounded-lg" />
    ))}
  </div>
);

const EmptyState = ({
  icon: Icon,
  title,
  message,
}: {
  icon: typeof Users;
  title: string;
  message: string;
}) => (
  <GlassPanel className="text-center py-16">
    <Icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{message}</p>
  </GlassPanel>
);

// --- Main Page Component ---
export default function AttendanceView() {
  const [activeTab, setActiveTab] = useState<'daily' | 'regularization'>('daily');
  
  // Daily Attendance State
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, present: 0, late: 0, absent: 0, onLeave: 0, wfh: 0, halfDay: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Regularization State
  const [regRequests, setRegRequests] = useState<RegularizationRequest[]>([]);
  const [regLoading, setRegLoading] = useState(true);
  const [regSummary, setRegSummary] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [regStatusFilter, setRegStatusFilter] = useState('all');
  const [regPagination, setRegPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [regActionLoading, setRegActionLoading] = useState<string | null>(null);
  const [regMessage, setRegMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAttendance = useCallback(async (date: string, search: string, status: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date, search, status });
      const res = await fetch(`/api/hr/attendance?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch attendance');
      const data = await res.json();
      setRecords(data.records ?? []);
      setSummary(data.summary ?? { total: 0, present: 0, late: 0, absent: 0, onLeave: 0, wfh: 0, halfDay: 0 });
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRegularizations = useCallback(async (page: number, status: string) => {
    setRegLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10', status });
      const res = await fetch(`/api/attendance/regularize?${params}`);
      if (!res.ok) throw new Error('Failed to fetch regularization requests');
      const data = await res.json();
      setRegRequests(data.regularizations ?? []);
      setRegPagination({
        page: data.pagination?.page || 1,
        totalPages: data.pagination?.pages || 1,
        total: data.pagination?.total || 0,
      });
    } catch {
      setRegRequests([]);
    } finally {
      setRegLoading(false);
    }
  }, []);
  
  const fetchRegSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance/regularize/summary', { credentials: 'include' });
      if(res.ok) setRegSummary(await res.json());
    } catch {}
  }, []);

  /** Exports the currently visible attendance records as a CSV download. */
  const handleExportCSV = () => {
    const headers = ['Employee', 'Department', 'Check In', 'Check Out', 'Total Hours', 'Status', 'Location'];
    const rows = records.map((r) => [
      r.employee_name,
      r.department,
      r.check_in ? new Date(r.check_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
      r.check_out ? new Date(r.check_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
      r.total_hours !== null ? `${Math.floor(r.total_hours)}h ${Math.round((r.total_hours - Math.floor(r.total_hours)) * 60)}m` : '',
      r.status,
      r.is_wfh ? 'Remote' : 'Office',
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchAttendance(selectedDate, debouncedSearch, statusFilter);
    } else {
      fetchRegularizations(regPagination.page, regStatusFilter);
      fetchRegSummary();
    }
  }, [activeTab, selectedDate, debouncedSearch, statusFilter, regPagination.page, regStatusFilter, fetchAttendance, fetchRegularizations, fetchRegSummary]);

  const handleRegAction = async (id: string, action: 'approve' | 'reject') => {
    setRegActionLoading(id);
    setRegMessage(null);
    try {
      const res = await fetch(`/api/attendance/regularize/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
      setRegMessage({ type: 'success', text: `Request ${action}d successfully.` });
      fetchRegularizations(regPagination.page, regStatusFilter);
      fetchRegSummary();
    } catch (err: unknown) {
      setRegMessage({ type: 'error', text: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setRegActionLoading(null);
    }
  };
  
  useEffect(() => {
    if (regMessage) {
      const timer = setTimeout(() => setRegMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [regMessage]);

  const formatTime = (datetime: string | null) => datetime ? new Date(datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '--';
  const formatHours = (hours: number | null) => hours === null ? '--' : `${Math.floor(hours)}h ${Math.round((hours - Math.floor(hours)) * 60)}m`;
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      present: 'bg-green-100 text-green-700 border-green-200',
      late: 'bg-amber-100 text-amber-700 border-amber-200',
      absent: 'bg-red-100 text-red-700 border-red-200',
      on_leave: 'bg-violet-100 text-violet-700 border-violet-200',
      half_day: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${styles[status] || 'bg-[var(--accent)] text-foreground/90 border-[var(--border)]/60'}`}>{status.replace('_', ' ')}</span>;
  };

  const attendanceRate = summary.total > 0 ? (((summary.present + summary.late) / (summary.total - summary.onLeave)) * 100).toFixed(1) : '0.0';

  return (
    <StaggerContainer>
      <FadeIn>
        <PageHeader title="Attendance Management" description="Track and manage employee attendance and regularization requests." />
      </FadeIn>

      <FadeIn>
        <div className="flex border-b border-[var(--border)] mb-6">
          <TabButton active={activeTab === 'daily'} onClick={() => setActiveTab('daily')}><Calendar className="w-4 h-4" /> Daily Attendance</TabButton>
          <TabButton active={activeTab === 'regularization'} onClick={() => setActiveTab('regularization')}><ClipboardList className="w-4 h-4" /> Regularization Requests <span className="ml-1 text-xs bg-[var(--accent)] px-2 py-0.5 rounded-full">{regSummary.pending}</span></TabButton>
        </div>
      </FadeIn>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'daily' && (
            <StaggerContainer>
              <FadeIn>
                <GlassPanel className="p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="form-input"
                      aria-label="Filter attendance by date"
                      title="Filter attendance by date"
                    />
                    <div className="relative w-full md:w-64">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input type="text" placeholder="Search employee..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="form-input w-full pl-10" />
                    </div>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="form-input"
                      aria-label="Filter attendance by status"
                      title="Filter attendance by status"
                    >
                      <option value="all">All Status</option>
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="absent">Absent</option>
                      <option value="on_leave">On Leave</option>
                      <option value="half_day">Half Day</option>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" disabled={records.length === 0} onClick={handleExportCSV}>
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                  </Button>
                </GlassPanel>
              </FadeIn>
              
              <FadeIn>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                  <StatCard icon={Users} label="Present Today" value={loading ? '...' : summary.present + summary.late} colorClass="text-green-400" />
                  <StatCard icon={UserX} label="Absent" value={loading ? '...' : summary.absent} colorClass="text-red-400" />
                  <StatCard icon={CalendarClock} label="On Leave" value={loading ? '...' : summary.onLeave} colorClass="text-purple-400" />
                  <StatCard icon={Clock} label="Late Arrivals" value={loading ? '...' : summary.late} colorClass="text-amber-400" />
                  <StatCard icon={TrendingUp} label="Attendance Rate" value={loading ? '...' : `${attendanceRate}%`} colorClass="text-blue-400" />
                </div>
              </FadeIn>

              <FadeIn>
                <GlassPanel className="overflow-x-auto">
                  {loading ? <LoadingSkeleton /> : records.length === 0 ? (
                    <EmptyState icon={Users} title="No Records Found" message="No attendance records match your filters for this date." />
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="border-b border-[var(--border)]">
                        <tr>
                          {['Employee', 'Clock In', 'Clock Out', 'Hours', 'Status', 'Location'].map(h => (
                            <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((r) => (
                          <tr key={r.employee_id} className="border-b border-[var(--border)] hover:bg-[var(--accent)] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700">{r.initials}</div>
                                <div>
                                  <p className="font-medium text-foreground">{r.employee_name}</p>
                                  <p className="text-xs text-muted-foreground">{r.department}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-foreground/90">{formatTime(r.check_in)}</td>
                            <td className="px-4 py-3 font-mono text-foreground/90">{formatTime(r.check_out)}</td>
                            <td className="px-4 py-3 font-mono text-foreground/90">{formatHours(r.total_hours)}</td>
                            <td className="px-4 py-3">{getStatusBadge(r.status)}</td>
                            <td className="px-4 py-3 text-foreground/90 flex items-center gap-2">{r.is_wfh ? <Building className="w-4 h-4 text-blue-400"/> : <Briefcase className="w-4 h-4 text-green-400"/>}{r.is_wfh ? 'Remote' : 'Office'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </GlassPanel>
              </FadeIn>
            </StaggerContainer>
          )}

          {activeTab === 'regularization' && (
            <StaggerContainer>
              <AnimatePresence>
                {regMessage && (
                  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className={`mb-4 flex items-center gap-2 p-3 rounded-lg text-sm border ${regMessage.type === 'success' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                    {regMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {regMessage.text}
                  </motion.div>
                )}
              </AnimatePresence>

              <FadeIn>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <StatCard icon={Clock} label="Pending" value={regLoading && regRequests.length === 0 ? '...' : regSummary.pending} colorClass="text-amber-400" />
                  <StatCard icon={CheckCircle} label="Approved" value={regLoading && regRequests.length === 0 ? '...' : regSummary.approved} colorClass="text-green-400" />
                  <StatCard icon={XCircle} label="Rejected" value={regLoading && regRequests.length === 0 ? '...' : regSummary.rejected} colorClass="text-red-400" />
                </div>
              </FadeIn>

              <FadeIn>
                <GlassPanel>
                  <div className="p-4 flex items-center justify-between border-b border-[var(--border)]">
                    <h3 className="font-semibold text-foreground">Requests ({regPagination.total})</h3>
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <Select
                        value={regStatusFilter}
                        onChange={(e) => { setRegStatusFilter(e.target.value); setRegPagination(p => ({ ...p, page: 1 })); }}
                        className="form-input"
                        aria-label="Filter regularization requests by status"
                        title="Filter regularization requests by status"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </Select>
                    </div>
                  </div>
                  {regLoading ? <LoadingSkeleton /> : regRequests.length === 0 ? (
                    <EmptyState icon={ClipboardList} title="No Requests Found" message={`No ${regStatusFilter} requests to review.`} />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-[var(--border)]">
                          <tr>
                            {['Employee', 'Date', 'Reason', 'Submitted', 'Status', 'Actions'].map(h => (
                              <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {regRequests.map((req) => (
                            <tr key={req.id} className="border-b border-[var(--border)] hover:bg-[var(--accent)] transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium text-foreground">{req.employee.first_name} {req.employee.last_name}</p>
                                <p className="text-xs text-muted-foreground">{req.employee.department}</p>
                              </td>
                              <td className="px-4 py-3 text-foreground/90">{new Date(req.date).toLocaleDateString('en-IN')}</td>
                              <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={req.reason}>{req.reason}</td>
                              <td className="px-4 py-3 text-muted-foreground">{new Date(req.created_at).toLocaleDateString('en-IN')}</td>
                              <td className="px-4 py-3">{getStatusBadge(req.status)}</td>
                              <td className="px-4 py-3">
                                {req.status === 'pending' ? (
                                  <div className="flex items-center gap-2">
                                    <Button size="sm" variant="success" onClick={() => handleRegAction(req.id, 'approve')} loading={regActionLoading === req.id} disabled={!!regActionLoading}>
                                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={() => handleRegAction(req.id, 'reject')} loading={regActionLoading === req.id} disabled={!!regActionLoading}>
                                      <XCircle className="w-4 h-4 mr-1" /> Reject
                                    </Button>
                                  </div>
                                ) : <span className="text-muted-foreground">--</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {regPagination.totalPages > 1 && (
                    <div className="p-4 flex items-center justify-center gap-2 border-t border-[var(--border)]">
                      <Button variant="outline" size="sm" onClick={() => setRegPagination(p => ({ ...p, page: p.page - 1 }))} disabled={regPagination.page <= 1}><ChevronLeft className="w-4 h-4" /></Button>
                      <span className="text-sm text-muted-foreground">Page {regPagination.page} of {regPagination.totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setRegPagination(p => ({ ...p, page: p.page + 1 }))} disabled={regPagination.page >= regPagination.totalPages}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  )}
                </GlassPanel>
              </FadeIn>
            </StaggerContainer>
          )}
        </motion.div>
      </AnimatePresence>
    </StaggerContainer>
  );
}


