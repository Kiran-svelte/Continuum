'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton, SkeletonDashboard } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  AlertCircle,
  Check,
  X,
  Users,
  Calendar,
  Banknote,
  FileText,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ArrowRight,
  Download,
  Eye,
  Loader2,
  CheckCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_pf: number;
  total_esi: number;
  total_tds: number;
  employee_count: number;
  slip_count: number;
  generated_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

interface PayrollSlip {
  id: string;
  payroll_run_id: string;
  emp_id: string;
  employee_name: string;
  employee_email: string;
  department: string | null;
  designation: string | null;
  month: number;
  year: number;
  basic: number;
  hra: number;
  da: number;
  special_allowance: number;
  gross: number;
  pf_employee: number;
  pf_employer: number;
  esi_employee: number;
  esi_employer: number;
  professional_tax: number;
  tds: number;
  lop_deduction: number;
  total_deductions: number;
  net_pay: number;
  working_days: number;
  present_days: number;
  leave_days: number;
  absent_days: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } },
} as const;

const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  generated: 'info',
  under_review: 'warning',
  approved: 'success',
  processed: 'success',
  paid: 'success',
  rejected: 'danger',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  generated: 'Generated',
  under_review: 'Under Review',
  approved: 'Approved',
  processed: 'Processed',
  paid: 'Paid',
  rejected: 'Rejected',
};

const NEXT_ACTION: Record<string, { status: string; label: string; variant: string }> = {
  generated: { status: 'under_review', label: 'Submit for Review', variant: 'primary' },
  under_review: { status: 'approved', label: 'Approve', variant: 'success' },
  approved: { status: 'processed', label: 'Mark Processed', variant: 'primary' },
  processed: { status: 'paid', label: 'Mark Paid', variant: 'success' },
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getNextPayrollDate(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function getDaysUntilNextPayroll(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/* ------------------------------------------------------------------ */
/*  Component: Payslip Modal                                           */
/* ------------------------------------------------------------------ */

function PayslipModal({
  slip,
  open,
  onClose,
}: {
  slip: PayrollSlip | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!slip) return null;

  const rows = [
    { label: 'Basic', value: slip.basic, type: 'earning' },
    { label: 'HRA', value: slip.hra, type: 'earning' },
    { label: 'DA', value: slip.da, type: 'earning' },
    { label: 'Special Allowance', value: slip.special_allowance, type: 'earning' },
    { label: 'Gross Pay', value: slip.gross, type: 'total' },
    { label: 'PF (Employee)', value: slip.pf_employee, type: 'deduction' },
    { label: 'PF (Employer)', value: slip.pf_employer, type: 'info' },
    { label: 'ESI (Employee)', value: slip.esi_employee, type: 'deduction' },
    { label: 'ESI (Employer)', value: slip.esi_employer, type: 'info' },
    { label: 'Professional Tax', value: slip.professional_tax, type: 'deduction' },
    { label: 'TDS', value: slip.tds, type: 'deduction' },
    { label: 'LOP Deduction', value: slip.lop_deduction, type: 'deduction' },
    { label: 'Total Deductions', value: slip.total_deductions, type: 'total-deduction' },
    { label: 'Net Pay', value: slip.net_pay, type: 'net' },
  ];

  return (
    <Modal isOpen={open} onClose={onClose} title={`Payslip - ${slip.employee_name}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Employee</p>
            <p className="font-medium">{slip.employee_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Department</p>
            <p className="font-medium">{slip.department || '--'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Period</p>
            <p className="font-medium">{MONTHS[slip.month - 1]} {slip.year}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Designation</p>
            <p className="font-medium">{slip.designation || '--'}</p>
          </div>
        </div>

        {/* Attendance */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Working Days', value: slip.working_days },
            { label: 'Present', value: slip.present_days },
            { label: 'Leave', value: slip.leave_days },
            { label: 'Absent', value: slip.absent_days },
          ].map((item) => (
            <div key={item.label} className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-bold">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Salary breakdown */}
        <div className="border border-border rounded-lg overflow-hidden">
          {rows.map((row) => (
            <div
              key={row.label}
              className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                row.type === 'total'
                  ? 'bg-blue-50 dark:bg-blue-500/10 font-semibold border-t border-b border-border'
                  : row.type === 'total-deduction'
                  ? 'bg-red-50 dark:bg-red-500/10 font-semibold border-t border-b border-border'
                  : row.type === 'net'
                  ? 'bg-green-50 dark:bg-green-500/10 font-bold text-base border-t-2 border-border'
                  : row.type === 'info'
                  ? 'text-muted-foreground italic'
                  : ''
              }`}
            >
              <span>{row.label}</span>
              <span className={
                row.type === 'deduction' || row.type === 'total-deduction'
                  ? 'text-red-600 dark:text-red-400'
                  : row.type === 'earning'
                  ? 'text-green-600 dark:text-green-400'
                  : row.type === 'net'
                  ? 'text-green-700 dark:text-green-300'
                  : ''
              }>
                {row.type === 'deduction' || row.type === 'total-deduction' ? '- ' : ''}
                {formatCurrency(row.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Slips Table                                             */
/* ------------------------------------------------------------------ */

function SlipsTable({
  runId,
  open,
}: {
  runId: string;
  open: boolean;
}) {
  const [slips, setSlips] = useState<PayrollSlip[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<PayrollSlip | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/payroll/slips?run_id=${runId}`)
      .then((r) => r.json())
      .then((data) => setSlips(data.slips || []))
      .catch(() => setSlips([]))
      .finally(() => setLoading(false));
  }, [runId, open]);

  if (!open) return null;

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (slips.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No payslips found for this run.
      </div>
    );
  }

  function downloadCSV() {
    const header = 'Employee,Email,Department,Designation,Basic,HRA,DA,Special Allowance,Gross,PF,ESI,PT,TDS,LOP,Total Deductions,Net Pay\n';
    const rows = slips.map((s) =>
      [s.employee_name, s.employee_email, s.department || '', s.designation || '',
       s.basic, s.hra, s.da, s.special_allowance, s.gross,
       s.pf_employee, s.esi_employee, s.professional_tax, s.tds, s.lop_deduction,
       s.total_deductions, s.net_pay].join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-slips-${runId.slice(0, 8)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="border-t border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground">
          {slips.length} payslip{slips.length !== 1 ? 's' : ''}
        </span>
        <Button variant="ghost" size="sm" onClick={downloadCSV} className="text-xs gap-1">
          <Download className="w-3 h-3" /> Export CSV
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-left">
              <th className="px-4 py-2 font-medium text-muted-foreground">Employee</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Department</th>
              <th className="px-4 py-2 font-medium text-muted-foreground text-right">Gross</th>
              <th className="px-4 py-2 font-medium text-muted-foreground text-right">Deductions</th>
              <th className="px-4 py-2 font-medium text-muted-foreground text-right">Net Pay</th>
              <th className="px-4 py-2 font-medium text-muted-foreground text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {slips.map((s) => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5">
                  <div>
                    <p className="font-medium">{s.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{s.designation || '--'}</p>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{s.department || '--'}</td>
                <td className="px-4 py-2.5 text-right text-green-600 dark:text-green-400 font-medium">
                  {formatCurrency(s.gross)}
                </td>
                <td className="px-4 py-2.5 text-right text-red-600 dark:text-red-400 font-medium">
                  {formatCurrency(s.total_deductions)}
                </td>
                <td className="px-4 py-2.5 text-right font-bold">{formatCurrency(s.net_pay)}</td>
                <td className="px-4 py-2.5 text-center">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSlip(s)} className="text-xs gap-1">
                    <Eye className="w-3 h-3" /> View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 font-semibold">
              <td className="px-4 py-2" colSpan={2}>Total</td>
              <td className="px-4 py-2 text-right text-green-600 dark:text-green-400">
                {formatCurrency(slips.reduce((s, r) => s + r.gross, 0))}
              </td>
              <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">
                {formatCurrency(slips.reduce((s, r) => s + r.total_deductions, 0))}
              </td>
              <td className="px-4 py-2 text-right">
                {formatCurrency(slips.reduce((s, r) => s + r.net_pay, 0))}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-border">
        {slips.map((s) => (
          <div key={s.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{s.employee_name}</p>
                <p className="text-xs text-muted-foreground">{s.department || '--'}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSlip(s)} className="text-xs">
                <Eye className="w-3 h-3" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Gross</p>
                <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(s.gross)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Deductions</p>
                <p className="font-medium text-red-600 dark:text-red-400">{formatCurrency(s.total_deductions)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Net Pay</p>
                <p className="font-bold">{formatCurrency(s.net_pay)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <PayslipModal slip={selectedSlip} open={!!selectedSlip} onClose={() => setSelectedSlip(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function PayrollPage() {
  const [loading, setLoading] = useState(true);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{
    success: boolean;
    message: string;
    data?: { total_gross: number; total_net: number; employee_count: number; status: string };
  } | null>(null);

  // Payroll history
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState<string | null>(null);

  // Reject modal
  const [rejectRun, setRejectRun] = useState<PayrollRun | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Inline feedback message
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const currentMonthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/payroll/history?limit=50');
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
      }
    } catch {
      // Non-critical: history will show empty
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        await ensureMe();
        const [empRes] = await Promise.all([
          fetch('/api/employees?limit=1'),
        ]);
        if (empRes.ok) {
          const data = await empRes.json();
          setEmployeeCount(data.pagination?.total ?? 0);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    fetchRuns();
  }, [fetchRuns]);

  async function handleGenerate() {
    setGenerating(true);
    setGenerateResult(null);
    try {
      const res = await fetch('/api/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateResult({ success: false, message: data.error || 'Generation failed' });
        return;
      }
      setGenerateResult({
        success: true,
        message: `Payroll generated for ${currentMonthLabel}`,
        data: { total_gross: data.total_gross, total_net: data.total_net, employee_count: data.employee_count, status: data.status },
      });
      fetchRuns();
    } catch (err) {
      setGenerateResult({ success: false, message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setGenerating(false);
    }
  }

  function showStatus(type: 'success' | 'error', text: string) {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  }

  async function handleStatusTransition(runId: string, newStatus: string) {
    setTransitioning(runId);
    try {
      const res = await fetch('/api/payroll/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payroll_run_id: runId, new_status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showStatus('error', data.error || 'Status change failed');
        return;
      }
      showStatus('success', `Payroll status updated to ${STATUS_LABELS[newStatus] || newStatus}`);
      fetchRuns();
    } catch {
      showStatus('error', 'Network error. Please try again.');
    } finally {
      setTransitioning(null);
    }
  }

  async function handleReject(runId: string) {
    setTransitioning(runId);
    try {
      const res = await fetch('/api/payroll/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payroll_run_id: runId, new_status: 'rejected', comments: rejectReason.trim() || 'Rejected by HR' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showStatus('error', data.error || 'Rejection failed');
        return;
      }
      setRejectRun(null);
      setRejectReason('');
      showStatus('success', 'Payroll run rejected');
      fetchRuns();
    } catch {
      showStatus('error', 'Network error.');
    } finally {
      setTransitioning(null);
    }
  }

  /* Loading */
  if (loading) return <SkeletonDashboard />;

  /* Error */
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold">Unable to Load Payroll</h3>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button variant="primary" size="sm" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysUntil = getDaysUntilNextPayroll();
  const currentRun = runs.find((r) => r.month === month && r.year === year);

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" variants={itemVariants}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
          <p className="text-muted-foreground mt-1">Generate, review, approve, and process payroll</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRuns} className="gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button variant="primary" onClick={handleGenerate} loading={generating} disabled={generating}>
            Generate Payroll
          </Button>
        </div>
      </motion.div>

      {/* Result banner */}
      <AnimatePresence>
        {generateResult && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className={generateResult.success ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${generateResult.success ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                      {generateResult.success ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{generateResult.success ? 'Payroll Generated' : 'Generation Failed'}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{generateResult.message}</p>
                      {generateResult.data && (
                        <div className="flex flex-wrap gap-3 mt-2">
                          <Badge variant="success">{generateResult.data.status}</Badge>
                          <span className="text-xs text-muted-foreground">{generateResult.data.employee_count} employees</span>
                          <span className="text-xs font-medium">Gross: {formatCurrency(generateResult.data.total_gross)}</span>
                          <span className="text-xs font-medium">Net: {formatCurrency(generateResult.data.total_net)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setGenerateResult(null)} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline status message */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {statusMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary cards */}
      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4" variants={itemVariants}>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Employees on Payroll</p>
                <p className="text-2xl font-bold mt-1">{employeeCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Active employees</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next Payroll Date</p>
                <p className="text-2xl font-bold mt-1">{getNextPayrollDate()}</p>
                <p className="text-xs text-muted-foreground mt-1">{daysUntil} day{daysUntil !== 1 ? 's' : ''} away</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 dark:bg-green-500/10">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Period</p>
                <p className="text-2xl font-bold mt-1">{currentMonthLabel}</p>
                <p className="text-xs mt-1">
                  <Badge variant={currentRun ? (STATUS_COLORS[currentRun.status] || 'default') as 'default' | 'info' | 'success' | 'warning' | 'danger' : 'default'} size="sm">
                    {currentRun ? STATUS_LABELS[currentRun.status] || currentRun.status : 'Not Generated'}
                  </Badge>
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
                <Banknote className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payroll Runs - History */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payroll History</CardTitle>
              <Badge variant="default" size="sm">{runs.length} run{runs.length !== 1 ? 's' : ''}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {runsLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : runs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No payroll runs yet</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Click &quot;Generate Payroll&quot; to create the first run for {currentMonthLabel}.
                </p>
                <Button variant="primary" className="mt-6" onClick={handleGenerate} loading={generating} disabled={generating}>
                  Generate Payroll for {currentMonthLabel}
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {runs.map((run) => {
                  const isExpanded = expandedRun === run.id;
                  const action = NEXT_ACTION[run.status];
                  const isTransitioning = transitioning === run.id;

                  return (
                    <div key={run.id} className="group">
                      {/* Run row */}
                      <div
                        className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer gap-3"
                        onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="hidden md:block">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">{MONTHS[run.month - 1]} {run.year}</p>
                              <Badge variant={(STATUS_COLORS[run.status] || 'default') as 'default' | 'info' | 'success' | 'warning' | 'danger'} size="sm">
                                {STATUS_LABELS[run.status] || run.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {run.employee_count} employees &middot; Generated by {run.generated_by || 'System'}
                              {run.approved_by ? ` &middot; Approved by ${run.approved_by}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 md:gap-6 text-sm">
                          <div className="text-right hidden md:block">
                            <p className="text-xs text-muted-foreground">Gross</p>
                            <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(run.total_gross)}</p>
                          </div>
                          <div className="text-right hidden md:block">
                            <p className="text-xs text-muted-foreground">Deductions</p>
                            <p className="font-medium text-red-600 dark:text-red-400">{formatCurrency(run.total_deductions)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Net Pay</p>
                            <p className="font-bold">{formatCurrency(run.total_net)}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {action && (
                              <Button
                                variant={action.variant as 'primary' | 'success'}
                                size="sm"
                                className="text-xs gap-1"
                                disabled={isTransitioning}
                                onClick={() => handleStatusTransition(run.id, action.status)}
                              >
                                {isTransitioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                                {action.label}
                              </Button>
                            )}
                            {run.status === 'under_review' && (
                              <Button
                                variant="danger"
                                size="sm"
                                className="text-xs"
                                disabled={isTransitioning}
                                onClick={() => setRejectRun(run)}
                              >
                                Reject
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mobile summary */}
                      <div className="md:hidden px-4 pb-2 flex gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground">Gross: </span>
                          <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(run.total_gross)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Deductions: </span>
                          <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(run.total_deductions)}</span>
                        </div>
                      </div>

                      {/* Expanded payslips */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <SlipsTable runId={run.id} open={isExpanded} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Reject confirmation modal */}
      {rejectRun && (
        <Modal isOpen={!!rejectRun} onClose={() => setRejectRun(null)} title="Reject Payroll Run">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to reject the payroll run for{' '}
              <span className="font-medium text-foreground">{MONTHS[rejectRun.month - 1]} {rejectRun.year}</span>?
              This will return it to draft status for re-generation.
            </p>
            <div>
              <label htmlFor="reject-reason" className="text-sm font-medium text-foreground">Reason (optional)</label>
              <textarea
                id="reject-reason"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={3}
                maxLength={500}
                placeholder="Enter the reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRejectRun(null)}>Cancel</Button>
              <Button
                variant="danger"
                size="sm"
                loading={transitioning === rejectRun.id}
                disabled={transitioning === rejectRun.id}
                onClick={() => handleReject(rejectRun.id)}
              >
                Reject Payroll
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}
