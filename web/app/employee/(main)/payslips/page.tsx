'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import { StaggerContainer, FadeIn, TiltCard } from '@/components/motion';
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
    <>
      <StaggerContainer className="space-y-6 relative z-10 w-full max-w-7xl mx-auto pb-20">
      {/* Header */}
      <PageHeader
        title="My Payslips"
        description="View and download your monthly salary breakdowns"
        icon={<Banknote className="h-6 w-6 text-primary" />}
        action={
          <TiltCard>
            <select
              className="px-4 py-2.5 rounded-xl border border-white/20 bg-black/50 text-sm font-semibold text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 hover:bg-white/10"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {[0, -1, -2].map((offset) => {
                const y = new Date().getFullYear() + offset;
                return <option key={y} value={y} className="bg-black text-white">{y}</option>;
              })}
            </select>
          </TiltCard>
        }
      />

      {/* Error */}
      <AnimatePresence>
        {error && (
          <FadeIn>
            <div className="rounded-xl px-5 py-4 text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)] flex items-center gap-3 backdrop-blur-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="flex-1">{error}</span>
              <Button variant="ghost" size="sm" className="text-red-300 underline hover:no-underline hover:bg-transparent" onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </FadeIn>
        )}
      </AnimatePresence>
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
            <FadeIn>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TiltCard>
                  <GlassPanel className="glass-panel border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-400" />
                    <div className="p-6 pt-5 pb-5 relative z-10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-green-300/70 uppercase tracking-wider drop-shadow-md">Total Earnings</p>
                          <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-300 mt-1 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">{formatCurrency(totalEarnings)}</p>
                          <p className="text-xs text-white/50 mt-1 font-medium">{slips.length} months</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                          <TrendingUp className="h-6 w-6 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                        </div>
                      </div>
                    </div>
                  </GlassPanel>
                </TiltCard>

                <TiltCard>
                  <GlassPanel className="glass-panel border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-400" />
                    <div className="p-6 pt-5 pb-5 relative z-10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-red-300/70 uppercase tracking-wider drop-shadow-md">Total Deductions</p>
                          <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-300 mt-1 drop-shadow-[0_0_10px_rgba(251,113,133,0.3)]">{formatCurrency(totalDeductions)}</p>
                          <p className="text-xs text-white/50 mt-1 font-medium">PF + ESI + TDS + PT</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                          <TrendingDown className="h-6 w-6 text-red-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]" />
                        </div>
                      </div>
                    </div>
                  </GlassPanel>
                </TiltCard>

                <TiltCard>
                  <GlassPanel className="glass-panel border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
                    <div className="p-6 pt-5 pb-5 relative z-10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-blue-300/70 uppercase tracking-wider drop-shadow-md">Net Pay (YTD)</p>
                          <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 mt-1 drop-shadow-[0_0_10px_rgba(96,165,250,0.3)]">{formatCurrency(totalNetPay)}</p>
                          <p className="text-xs text-white/50 mt-1 font-medium">Year to date</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                          <Banknote className="h-6 w-6 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                        </div>
                      </div>
                    </div>
                  </GlassPanel>
                </TiltCard>
              </div>
            </FadeIn>
          )}

          {/* Payslip list */}
          <FadeIn>
            <TiltCard>
              <GlassPanel className="glass-panel border-white/10 shadow-2xl relative overflow-hidden">
                <div className="p-6 border-b border-white/10 bg-white/5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white drop-shadow-md">Payslips - {selectedYear}</h3>
                    <Badge variant="default" size="sm" className="bg-[rgba(var(--primary-rgb),0.2)] text-[rgb(var(--primary-rgb))] border-[rgba(var(--primary-rgb),0.5)] shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]">{slips.length} payslip{slips.length !== 1 ? 's' : ''}</Badge>
                  </div>
                </div>
                <div className="p-0 backdrop-blur-md bg-black/20">
                  {slips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 mb-4 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        <FileText className="h-7 w-7 text-white/50" />
                      </div>
                      <h3 className="text-base font-bold text-white drop-shadow-md">No payslips available</h3>
                      <p className="mt-1 text-sm text-white/60 max-w-xs font-medium">
                        Payslips for {selectedYear} will appear here once your HR team processes payroll.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/10">
                      {slips.map((slip) => (
                        <div key={slip.id} className="flex items-center justify-between px-4 py-4 hover:bg-white/10 transition-colors group cursor-pointer">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)] group-hover:scale-110 transition-transform duration-300">
                              <Calendar className="h-6 w-6 text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{MONTHS[slip.month - 1]} {slip.year}</p>
                              <p className="text-xs text-white/60 font-medium mt-0.5">
                                {slip.working_days} working days &middot; {slip.present_days} present
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-5">
                            <div className="text-right hidden sm:block">
                              <p className="text-base font-bold text-white group-hover:text-green-400 transition-colors drop-shadow-md">{formatCurrency(slip.net_pay)}</p>
                              <p className="text-xs text-white/50 font-medium">
                                Gross: {formatCurrency(slip.gross)}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="gap-2 text-xs font-bold text-primary hover:bg-primary/20 hover:text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)] hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] transition-all duration-300 rounded-xl" onClick={() => setSelectedSlip(slip)}>
                              <Eye className="w-4 h-4" /> View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </GlassPanel>
            </TiltCard>
          </FadeIn>
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
                <div key={item.label} className="text-center p-2 rounded-xl bg-primary/10 border border-primary/20 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]">
                  <p className="text-xs text-primary/70 font-semibold">{item.label}</p>
                  <p className="text-sm font-bold text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Earnings */}
            <div>
              <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2 drop-shadow-md">Earnings</h4>
              <div className="border border-white/10 rounded-xl overflow-hidden glass-panel">
                {[
                  { label: 'Basic Salary', value: selectedSlip.basic },
                  { label: 'HRA', value: selectedSlip.hra },
                  { label: 'DA', value: selectedSlip.da },
                  { label: 'Special Allowance', value: selectedSlip.special_allowance },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between px-4 py-2 text-sm border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors">
                    <span className="text-white/80 font-medium">{row.label}</span>
                    <span className="text-green-400 font-bold drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]">{formatCurrency(row.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 text-sm font-semibold bg-green-500/10 border-t border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                  <span className="text-green-300">Gross Pay</span>
                  <span className="text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">{formatCurrency(selectedSlip.gross)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2 drop-shadow-md">Deductions</h4>
              <div className="border border-white/10 rounded-xl overflow-hidden glass-panel">
                {[
                  { label: 'Provident Fund (PF)', value: selectedSlip.pf_employee },
                  { label: 'ESI', value: selectedSlip.esi_employee },
                  { label: 'Professional Tax', value: selectedSlip.professional_tax },
                  { label: 'TDS (Income Tax)', value: selectedSlip.tds },
                  { label: 'LOP Deduction', value: selectedSlip.lop_deduction },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between px-4 py-2 text-sm border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors">
                    <span className="text-white/80 font-medium">{row.label}</span>
                    <span className="text-red-400 font-bold drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]">- {formatCurrency(row.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 text-sm font-semibold bg-red-500/10 border-t border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                  <span className="text-red-300">Total Deductions</span>
                  <span className="text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]">- {formatCurrency(selectedSlip.total_deductions)}</span>
                </div>
              </div>
            </div>

            {/* Employer contributions */}
            <div className="text-xs text-white/50 border border-white/10 rounded-xl p-3 space-y-1 bg-black/20 backdrop-blur-sm">
              <p className="font-bold text-white/70">Employer Contributions (not deducted from salary):</p>
              <p>PF (Employer): {formatCurrency(selectedSlip.pf_employer)} &middot; ESI (Employer): {formatCurrency(selectedSlip.esi_employer)}</p>
            </div>

            {/* Net Pay */}
            <div className="flex justify-between items-center px-4 py-4 rounded-xl bg-primary/10 border-2 border-primary/30 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]">
              <span className="text-base font-bold text-primary drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]">Net Pay</span>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.6)]">{formatCurrency(selectedSlip.net_pay)}</span>
            </div>

            <Button variant="outline" className="w-full gap-2 font-bold text-primary hover:bg-primary/20 bg-primary/10 border border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.5)] transition-all duration-300 py-6 rounded-xl" onClick={() => {
              const slip = selectedSlip;
              const monthName = MONTHS[slip.month - 1];
              const html = `<!DOCTYPE html>
<html><head><title>Payslip - ${monthName} ${slip.year}</title>
<style>
body{font-family:Arial,sans-serif;margin:40px;color:#222;max-width:700px;margin:40px auto}
h1{font-size:20px;margin-bottom:4px}
.subtitle{color:#666;font-size:13px;margin-bottom:20px}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #e0e0e0;font-size:13px}
th{background:#f5f5f5;font-weight:600}
.right{text-align:right}
.total-row{font-weight:700;background:#f0f4ff}
.net-row{font-weight:700;font-size:15px;background:#e8f5e9;border-top:2px solid #4caf50}
.section{margin-top:16px;font-weight:600;font-size:14px;padding-bottom:6px;border-bottom:2px solid #333}
.footer{margin-top:24px;font-size:11px;color:#888;text-align:center}
@media print{body{margin:20px}button{display:none}}
</style></head><body>
<h1>Payslip</h1>
<p class="subtitle">${monthName} ${slip.year} &bull; Working Days: ${slip.working_days} &bull; Present: ${slip.present_days} &bull; Leave: ${slip.leave_days} &bull; Absent: ${slip.absent_days}</p>
<p class="section">Earnings</p>
<table><tr><th>Component</th><th class="right">Amount</th></tr>
<tr><td>Basic Salary</td><td class="right">${formatCurrency(slip.basic)}</td></tr>
<tr><td>HRA</td><td class="right">${formatCurrency(slip.hra)}</td></tr>
<tr><td>DA</td><td class="right">${formatCurrency(slip.da)}</td></tr>
<tr><td>Special Allowance</td><td class="right">${formatCurrency(slip.special_allowance)}</td></tr>
<tr class="total-row"><td>Gross Salary</td><td class="right">${formatCurrency(slip.gross)}</td></tr>
</table>
<p class="section">Deductions</p>
<table><tr><th>Component</th><th class="right">Amount</th></tr>
<tr><td>PF (Employee)</td><td class="right">${formatCurrency(slip.pf_employee)}</td></tr>
<tr><td>ESI (Employee)</td><td class="right">${formatCurrency(slip.esi_employee)}</td></tr>
<tr><td>Professional Tax</td><td class="right">${formatCurrency(slip.professional_tax)}</td></tr>
<tr><td>TDS (Income Tax)</td><td class="right">${formatCurrency(slip.tds)}</td></tr>
<tr><td>LOP Deduction</td><td class="right">${formatCurrency(slip.lop_deduction)}</td></tr>
<tr class="total-row"><td>Total Deductions</td><td class="right">${formatCurrency(slip.total_deductions)}</td></tr>
</table>
<table><tr class="net-row"><td>Net Pay</td><td class="right">${formatCurrency(slip.net_pay)}</td></tr></table>
<p style="font-size:11px;color:#888;margin-top:8px">Employer PF: ${formatCurrency(slip.pf_employer)} &bull; Employer ESI: ${formatCurrency(slip.esi_employer)}</p>
<div class="footer">This is a system-generated payslip. For questions, contact HR.</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
              }
            }}>
              <Download className="w-5 h-5" /> Download Payslip
            </Button>
          </div>
        </Modal>
      )}
      </StaggerContainer>
    </>
  );
}
