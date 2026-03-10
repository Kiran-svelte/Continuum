'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  FileText,
  Download,
  Eye,
  AlertCircle,
  Banknote,
  TrendingUp,
  TrendingDown,
  Calendar,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PayrollSlip {
  id: string;
  payroll_run_id: string;
  run_status: string;
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
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } },
} as const;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount);
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EmployeePayslipsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slips, setSlips] = useState<PayrollSlip[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<PayrollSlip | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    async function fetchSlips() {
      setLoading(true);
      setError(null);
      try {
        await ensureMe();
        const res = await fetch(`/api/payroll/slips?year=${selectedYear}`, { credentials: 'include' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to load payslips (${res.status})`);
        }
        const data = await res.json();
        setSlips(data.slips || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payslips');
      } finally {
        setLoading(false);
      }
    }
    fetchSlips();
  }, [selectedYear]);

  const totalEarnings = slips.reduce((sum, s) => sum + s.gross, 0);
  const totalDeductions = slips.reduce((sum, s) => sum + s.total_deductions, 0);
  const totalNetPay = slips.reduce((sum, s) => sum + s.net_pay, 0);

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">

      {/* Header */}
      <motion.div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" variants={itemVariants}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Payslips</h1>
          <p className="text-muted-foreground mt-1">View and download your monthly salary breakdowns</p>
        </div>
        <select
          className="px-4 py-2 rounded-lg border border-border bg-background text-sm"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
        >
          {[0, -1, -2].map((offset) => {
            const y = new Date().getFullYear() + offset;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div variants={itemVariants} className="rounded-xl px-4 py-3 text-sm font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>Retry</Button>
        </motion.div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Annual summary */}
          {slips.length > 0 && (
            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4" variants={itemVariants}>
              <Card>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Earnings</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(totalEarnings)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{slips.length} months</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 dark:bg-green-500/10">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Deductions</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(totalDeductions)}</p>
                      <p className="text-xs text-muted-foreground mt-1">PF + ESI + TDS + PT</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net Pay (YTD)</p>
                      <p className="text-2xl font-bold mt-1">{formatCurrency(totalNetPay)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Year to date</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
                      <Banknote className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Payslip list */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payslips - {selectedYear}</CardTitle>
                  <Badge variant="default" size="sm">{slips.length} payslip{slips.length !== 1 ? 's' : ''}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {slips.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
                      <FileText className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-semibold">No payslips available</h3>
                    <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                      Payslips for {selectedYear} will appear here once your HR team processes payroll.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {slips.map((slip) => (
                      <div key={slip.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{MONTHS[slip.month - 1]} {slip.year}</p>
                            <p className="text-xs text-muted-foreground">
                              {slip.working_days} working days &middot; {slip.present_days} present
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold">{formatCurrency(slip.net_pay)}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Gross: {formatCurrency(slip.gross)}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setSelectedSlip(slip)}>
                            <Eye className="w-3.5 h-3.5" /> View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* Payslip detail modal */}
      {selectedSlip && (
        <Modal isOpen={!!selectedSlip} onClose={() => setSelectedSlip(null)} title={`Payslip - ${MONTHS[selectedSlip.month - 1]} ${selectedSlip.year}`}>
          <div className="space-y-4">
            {/* Attendance */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Working Days', value: selectedSlip.working_days },
                { label: 'Present', value: selectedSlip.present_days },
                { label: 'Leave', value: selectedSlip.leave_days },
                { label: 'Absent', value: selectedSlip.absent_days },
              ].map((item) => (
                <div key={item.label} className="text-center p-2 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-bold">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Earnings */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Earnings</h4>
              <div className="border border-border rounded-lg overflow-hidden">
                {[
                  { label: 'Basic Salary', value: selectedSlip.basic },
                  { label: 'HRA', value: selectedSlip.hra },
                  { label: 'DA', value: selectedSlip.da },
                  { label: 'Special Allowance', value: selectedSlip.special_allowance },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between px-4 py-2 text-sm border-b border-border/50 last:border-0">
                    <span>{row.label}</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(row.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 text-sm font-semibold bg-green-50 dark:bg-green-500/10 border-t border-border">
                  <span>Gross Pay</span>
                  <span className="text-green-700 dark:text-green-300">{formatCurrency(selectedSlip.gross)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Deductions</h4>
              <div className="border border-border rounded-lg overflow-hidden">
                {[
                  { label: 'Provident Fund (PF)', value: selectedSlip.pf_employee },
                  { label: 'ESI', value: selectedSlip.esi_employee },
                  { label: 'Professional Tax', value: selectedSlip.professional_tax },
                  { label: 'TDS (Income Tax)', value: selectedSlip.tds },
                  { label: 'LOP Deduction', value: selectedSlip.lop_deduction },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between px-4 py-2 text-sm border-b border-border/50 last:border-0">
                    <span>{row.label}</span>
                    <span className="text-red-600 dark:text-red-400 font-medium">- {formatCurrency(row.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 text-sm font-semibold bg-red-50 dark:bg-red-500/10 border-t border-border">
                  <span>Total Deductions</span>
                  <span className="text-red-700 dark:text-red-300">- {formatCurrency(selectedSlip.total_deductions)}</span>
                </div>
              </div>
            </div>

            {/* Employer contributions */}
            <div className="text-xs text-muted-foreground border border-border/50 rounded-lg p-3 space-y-1">
              <p className="font-medium">Employer Contributions (not deducted from salary):</p>
              <p>PF (Employer): {formatCurrency(selectedSlip.pf_employer)} &middot; ESI (Employer): {formatCurrency(selectedSlip.esi_employer)}</p>
            </div>

            {/* Net Pay */}
            <div className="flex justify-between items-center px-4 py-4 rounded-xl bg-primary/5 border-2 border-primary/20">
              <span className="text-base font-bold">Net Pay</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(selectedSlip.net_pay)}</span>
            </div>

            <Button variant="outline" className="w-full gap-2" onClick={() => {
              const text = `Payslip - ${MONTHS[selectedSlip.month - 1]} ${selectedSlip.year}\n\nGross: ${formatCurrency(selectedSlip.gross)}\nDeductions: ${formatCurrency(selectedSlip.total_deductions)}\nNet Pay: ${formatCurrency(selectedSlip.net_pay)}`;
              const blob = new Blob([text], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `payslip-${selectedSlip.year}-${String(selectedSlip.month).padStart(2, '0')}.txt`;
              link.click();
              URL.revokeObjectURL(url);
            }}>
              <Download className="w-4 h-4" /> Download Payslip
            </Button>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}
