'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { StaggerContainer } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox, Input } from '@/components/ui/input';
import { ensureMe } from '@/lib/client-auth';
import {
  DollarSign, Users, TrendingUp, Search, Plus, Edit2, Eye, Loader2,
  AlertCircle, CheckCircle, Briefcase,
} from 'lucide-react';

/* ─── Animation Variants ────────────────────────────────────────────────── */

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 12 } },
};

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface SalaryStructure {
  id: string;
  emp_id: string;
  employee_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  ctc: number;
  basic: number;
  hra: number;
  da: number;
  special_allowance: number;
  pf_employee: number;
  pf_employer: number;
  esi_employee: number;
  esi_employer: number;
  professional_tax: number;
  tds: number;
  effective_from: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  department: string | null;
  designation: string | null;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function fmtLakhs(amount: number): string {
  const lakhs = amount / 100000;
  return lakhs >= 1 ? `${lakhs.toFixed(1)}L` : fmt(amount);
}

/**
 * Lightweight client-side salary preview — used for instant visual feedback
 * while the server calculates exact values. NOT used for persistence.
 */
function instantPreview(ctcAnnual: number) {
  const basic = Math.round(ctcAnnual * 0.4);
  const hra = Math.round(basic * 0.5);
  const basicMonthly = basic / 12;
  const pfEmployee = Math.round(Math.min(basicMonthly, 15000) * 0.12 * 12);
  const pfEmployer = pfEmployee;
  const monthly = ctcAnnual / 12;
  const esiEmployee = monthly <= 21000 ? Math.round(monthly * 0.0075 * 12) : 0;
  const esiEmployer = monthly <= 21000 ? Math.round(monthly * 0.0325 * 12) : 0;
  const specialAllowance = Math.max(0, ctcAnnual - basic - hra - pfEmployer - esiEmployer);
  return {
    basic, hra, da: 0, special_allowance: specialAllowance,
    pf_employee: pfEmployee, pf_employer: pfEmployer,
    esi_employee: esiEmployee, esi_employer: esiEmployer,
    professional_tax: 0, tds: 0,
  };
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function SalaryStructuresView() {
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [viewStructure, setViewStructure] = useState<SalaryStructure | null>(null);
  const [editStructure, setEditStructure] = useState<SalaryStructure | null>(null);

  // Form state
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formCtc, setFormCtc] = useState('');
  const [formEffective, setFormEffective] = useState(new Date().toISOString().slice(0, 10));
  const [formReason, setFormReason] = useState('');
  const [formComponents, setFormComponents] = useState(instantPreview(0));
  const [formAutoCalc, setFormAutoCalc] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Employee search for modal
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empSearch, setEmpSearch] = useState('');

  const fetchStructures = useCallback(async () => {
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      await ensureMe();
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/salary-structures?${params}`, { credentials: 'include', signal: controller.signal });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setStructures(data.structures || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load salary structures');
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchStructures(); }, [fetchStructures]);

  // Fetch employees for the add modal
  useEffect(() => {
    if (!showModal) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    fetch('/api/employees?limit=200', { credentials: 'include', signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setEmployees(data.employees || []))
      .catch(() => {})
      .finally(() => clearTimeout(timer));
  }, [showModal]);

  function openAdd() {
    setEditStructure(null);
    setFormEmployeeId('');
    setFormCtc('');
    setFormEffective(new Date().toISOString().slice(0, 10));
    setFormReason('');
    setFormComponents(instantPreview(0));
    setFormAutoCalc(true);
    setFormMessage(null);
    setShowModal(true);
  }

  function openEdit(s: SalaryStructure) {
    setEditStructure(s);
    setFormEmployeeId(s.emp_id);
    setFormCtc(String(s.ctc));
    setFormEffective(new Date(s.effective_from).toISOString().slice(0, 10));
    setFormReason('');
    setFormComponents({
      basic: s.basic, hra: s.hra, da: s.da, special_allowance: s.special_allowance,
      pf_employee: s.pf_employee, pf_employer: s.pf_employer,
      esi_employee: s.esi_employee, esi_employer: s.esi_employer,
      professional_tax: s.professional_tax, tds: s.tds,
    });
    setFormAutoCalc(false);
    setFormMessage(null);
    setShowModal(true);
  }

  function handleCtcChange(val: string) {
    setFormCtc(val);
    const num = parseFloat(val);
    if (formAutoCalc && num > 0) {
      // Instant client preview
      setFormComponents(instantPreview(num));
      // Debounced server calculation for exact values
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => fetchServerBreakdown(num), 300);
    }
  }

  async function fetchServerBreakdown(ctcValue: number) {
    setIsCalculating(true);
    try {
      const res = await fetch('/api/payroll/calculate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ annualCtc: ctcValue }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const annual = data.breakdown?.annual;
      if (annual) {
        setFormComponents({
          basic: annual.basic, hra: annual.hra, da: annual.da,
          special_allowance: annual.specialAllowance,
          pf_employee: annual.pfEmployee, pf_employer: annual.pfEmployer,
          esi_employee: annual.esiEmployee, esi_employer: annual.esiEmployer,
          professional_tax: annual.professionalTax, tds: annual.tds,
        });
      }
    } catch {
      // Keep client-side preview on error
    } finally {
      setIsCalculating(false);
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setFormMessage(null);
    try {
      const ctcNum = parseFloat(formCtc);
      if (!ctcNum || ctcNum <= 0) throw new Error('CTC must be positive');
      if (!formEmployeeId) throw new Error('Select an employee');

      const res = await fetch('/api/salary-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emp_id: formEmployeeId,
          ctc: ctcNum,
          auto_calculate: formAutoCalc,
          ...(!formAutoCalc ? formComponents : {}),
          effective_from: formEffective,
          reason: formReason || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.error || 'Failed to save';
        setFormMessage({ type: 'error', text: message });
        toast.error(editStructure ? 'Update failed' : 'Create failed', { description: message });
        return;
      }

      const successText = editStructure
        ? 'Salary structure updated successfully'
        : 'Salary structure created successfully';
      setFormMessage({ type: 'success', text: successText });
      toast.success(successText);
      fetchStructures();
      setTimeout(() => setShowModal(false), 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setFormMessage({ type: 'error', text: message });
      toast.error('Validation error', { description: message });
    } finally {
      setSaving(false);
    }
  }

  // Summary calculations
  const totalStructures = structures.length;
  const avgCtc = totalStructures > 0 ? structures.reduce((s, x) => s + x.ctc, 0) / totalStructures : 0;
  const maxCtc = totalStructures > 0 ? Math.max(...structures.map((s) => s.ctc)) : 0;
  const totalPayroll = structures.reduce((s, x) => s + x.ctc, 0);

  const filteredEmployees = empSearch
    ? employees.filter((e) => `${e.first_name} ${e.last_name}`.toLowerCase().includes(empSearch.toLowerCase()))
    : employees;

  return (
    <StaggerContainer className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Salary Structures"
        description="Manage employee compensation and CTC breakdowns"
        icon={<DollarSign className="w-6 h-6 text-primary" />}
        action={
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-hover)] text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <Button variant="primary" onClick={openAdd} className="gap-1">
              <Plus className="w-4 h-4" /> Add Structure
            </Button>
          </div>
        }
      />

      {/* Summary cards */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" variants={itemVariants}>
        {[
          { label: 'Employees with Structure', value: totalStructures, icon: Users, color: 'blue' },
          { label: 'Average CTC', value: fmt(avgCtc), icon: DollarSign, color: 'green' },
          { label: 'Highest CTC', value: fmt(maxCtc), icon: TrendingUp, color: 'amber' },
          { label: 'Total Payroll Cost', value: fmt(totalPayroll), icon: Briefcase, color: 'violet' },
        ].map((card) => {
          const Icon = card.icon;
          const iconWrapClass =
            card.color === 'blue'
              ? 'bg-blue-50'
              : card.color === 'green'
                ? 'bg-green-50'
                : card.color === 'amber'
                  ? 'bg-amber-50'
                  : 'bg-violet-50';
          const iconClass =
            card.color === 'blue'
              ? 'text-blue-500'
              : card.color === 'green'
                ? 'text-green-500'
                : card.color === 'amber'
                  ? 'text-amber-500'
                  : 'text-violet-500';

          return (
            <GlassPanel key={card.label}>
              <div className="pt-5 pb-5 px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconWrapClass}`}>
                    <Icon className={`h-5 w-5 ${iconClass}`} />
                  </div>
                </div>
              </div>
            </GlassPanel>
          );
        })}
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <GlassPanel>
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">All Salary Structures</h3>
              <Badge variant="default" size="sm">{structures.length} record{structures.length !== 1 ? 's' : ''}</Badge>
            </div>
          </div>
          <div className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : error ? (
              <div className="py-16 text-center">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={fetchStructures}>Retry</Button>
              </div>
            ) : structures.length === 0 ? (
              <div className="py-16 text-center">
                <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold">No salary structures</h3>
                <p className="text-sm text-muted-foreground mt-1">Add a salary structure to get started.</p>
                <Button variant="primary" size="sm" className="mt-4" onClick={openAdd}>Add Structure</Button>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-hover)]/20 text-left">
                        <th className="px-4 py-2.5 font-medium text-muted-foreground">Employee</th>
                        <th className="px-4 py-2.5 font-medium text-muted-foreground">Department</th>
                        <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">CTC (Annual)</th>
                        <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">Basic</th>
                        <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">HRA</th>
                        <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">Net Monthly</th>
                        <th className="px-4 py-2.5 font-medium text-muted-foreground">Effective</th>
                        <th className="px-4 py-2.5 font-medium text-muted-foreground text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {structures.map((s) => {
                        const monthlyNet = (s.ctc - s.pf_employee - s.esi_employee - s.professional_tax - s.tds) / 12;
                        return (
                          <tr key={s.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-surface-hover)]/20 transition-colors">
                            <td className="px-4 py-2.5">
                              <p className="font-medium">{s.employee_name}</p>
                              <p className="text-xs text-muted-foreground">{s.designation || '--'}</p>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">{s.department || '--'}</td>
                            <td className="px-4 py-2.5 text-right font-bold">{fmtLakhs(s.ctc)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(s.basic)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(s.hra)}</td>
                            <td className="px-4 py-2.5 text-right font-medium text-green-600">{fmt(Math.round(monthlyNet))}</td>
                            <td className="px-4 py-2.5 text-muted-foreground text-xs">{new Date(s.effective_from).toLocaleDateString('en-IN')}</td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex justify-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setViewStructure(s)} className="text-xs gap-1">
                                  <Eye className="w-3 h-3" /> View
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="text-xs gap-1">
                                  <Edit2 className="w-3 h-3" /> Edit
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-border">
                  {structures.map((s) => {
                    const monthlyNet = (s.ctc - s.pf_employee - s.esi_employee - s.professional_tax - s.tds) / 12;
                    return (
                      <div key={s.id} className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{s.employee_name}</p>
                            <p className="text-xs text-muted-foreground">{s.department || '--'} &middot; {s.designation || '--'}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setViewStructure(s)} className="text-xs"><Eye className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="text-xs"><Edit2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><p className="text-muted-foreground">CTC</p><p className="font-bold">{fmtLakhs(s.ctc)}</p></div>
                          <div><p className="text-muted-foreground">Basic</p><p className="font-medium">{fmt(s.basic)}</p></div>
                          <div><p className="text-muted-foreground">Net/Mo</p><p className="font-medium text-green-600">{fmt(Math.round(monthlyNet))}</p></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </GlassPanel>
      </motion.div>

      {/* View Modal */}
      {viewStructure && (
        <Modal isOpen={!!viewStructure} onClose={() => setViewStructure(null)} title={`Salary - ${viewStructure.employee_name}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Employee</p><p className="font-medium">{viewStructure.employee_name}</p></div>
              <div><p className="text-muted-foreground">Department</p><p className="font-medium">{viewStructure.department || '--'}</p></div>
              <div><p className="text-muted-foreground">Designation</p><p className="font-medium">{viewStructure.designation || '--'}</p></div>
              <div><p className="text-muted-foreground">Effective From</p><p className="font-medium">{new Date(viewStructure.effective_from).toLocaleDateString('en-IN')}</p></div>
            </div>

            <div className="border border-[var(--border)] rounded-lg overflow-hidden">
              <div className="bg-[var(--bg-surface-hover)]/30 px-4 py-2 text-xs font-semibold text-muted-foreground flex justify-between">
                <span>Component</span>
                <span className="flex gap-8"><span>Annual</span><span>Monthly</span></span>
              </div>
              {[
                { label: 'CTC', value: viewStructure.ctc, type: 'total' },
                { label: 'Basic', value: viewStructure.basic, type: 'earning' },
                { label: 'HRA', value: viewStructure.hra, type: 'earning' },
                { label: 'DA', value: viewStructure.da, type: 'earning' },
                { label: 'Special Allowance', value: viewStructure.special_allowance, type: 'earning' },
                { label: 'PF (Employee)', value: viewStructure.pf_employee, type: 'deduction' },
                { label: 'PF (Employer)', value: viewStructure.pf_employer, type: 'info' },
                { label: 'ESI (Employee)', value: viewStructure.esi_employee, type: 'deduction' },
                { label: 'ESI (Employer)', value: viewStructure.esi_employer, type: 'info' },
                { label: 'Professional Tax', value: viewStructure.professional_tax, type: 'deduction' },
                { label: 'TDS', value: viewStructure.tds, type: 'deduction' },
              ].map((row) => (
                <div
                  key={row.label}
                  className={`flex justify-between px-4 py-2 text-sm ${
                    row.type === 'total' ? 'bg-blue-50 font-bold border-b border-[var(--border)]' :
                    row.type === 'info' ? 'text-muted-foreground italic' : ''
                  }`}
                >
                  <span>{row.label}</span>
                  <span className={`flex gap-8 ${
                    row.type === 'deduction' ? 'text-red-600' :
                    row.type === 'earning' ? 'text-green-600' : ''
                  }`}>
                    <span className="w-24 text-right">{fmt(row.value)}</span>
                    <span className="w-24 text-right">{fmt(Math.round(row.value / 12))}</span>
                  </span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-2.5 text-sm bg-green-50 font-bold border-t-2 border-[var(--border)]">
                <span>Net Take-Home</span>
                <span className="flex gap-8 text-green-700">
                  <span className="w-24 text-right">{fmt(viewStructure.ctc - viewStructure.pf_employee - viewStructure.esi_employee - viewStructure.professional_tax - viewStructure.tds)}</span>
                  <span className="w-24 text-right">{fmt(Math.round((viewStructure.ctc - viewStructure.pf_employee - viewStructure.esi_employee - viewStructure.professional_tax - viewStructure.tds) / 12))}</span>
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editStructure ? 'Edit Salary Structure' : 'Add Salary Structure'} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Employee selection */}
          {!editStructure && (
            <div>
              <label className="text-sm font-medium">Employee</label>
              <Input
                type="text"
                placeholder="Search employee..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface-hover)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {empSearch && filteredEmployees.length > 0 && !formEmployeeId && (
                <div className="mt-1 border border-[var(--border)] rounded-lg max-h-32 overflow-y-auto bg-[var(--bg-surface-hover)]">
                  {filteredEmployees.slice(0, 10).map((e) => (
                    <Button
                      key={e.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-surface-hover)] transition-colors"
                      onClick={() => { setFormEmployeeId(e.id); setEmpSearch(`${e.first_name} ${e.last_name}`); }}
                    >
                      {e.first_name} {e.last_name} <span className="text-xs text-muted-foreground">{e.department || ''}</span>
                    </Button>
                  ))}
                </div>
              )}
              {formEmployeeId && <p className="text-xs text-green-600 mt-1">Employee selected</p>}
            </div>
          )}
          {editStructure && (
            <div className="text-sm"><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{editStructure.employee_name}</span></div>
          )}

          {/* CTC */}
          <div>
            <label className="text-sm font-medium">Annual CTC (₹)</label>
            <Input
              type="number"
              value={formCtc}
              onChange={(e) => handleCtcChange(e.target.value)}
              placeholder="e.g. 600000"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface-hover)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Auto-calculate toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="auto-calc"
              checked={formAutoCalc}
              onChange={(e) => {
                setFormAutoCalc(e.target.checked);
                if (e.target.checked && parseFloat(formCtc) > 0) {
                  setFormComponents(instantPreview(parseFloat(formCtc)));
                }
              }}
              className="rounded"
            />
            <label htmlFor="auto-calc" className="text-sm text-muted-foreground">Auto-calculate breakdown from CTC</label>
          </div>

          {/* Component breakdown */}
          <div className="grid grid-cols-2 gap-3">
            {(['basic', 'hra', 'da', 'special_allowance', 'pf_employee', 'pf_employer', 'esi_employee', 'esi_employer', 'professional_tax', 'tds'] as const).map((key) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</label>
                <Input
                  type="number"
                  value={formComponents[key]}
                  disabled={formAutoCalc}
                  aria-label={`${key.replace(/_/g, ' ')} amount`}
                  onChange={(e) => setFormComponents({ ...formComponents, [key]: parseFloat(e.target.value) || 0 })}
                  className="mt-0.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface-hover)] px-3 py-1.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}
          </div>

          {/* Effective date + reason */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Effective From</label>
              <Input
                type="date"
                value={formEffective}
                aria-label="Effective from date"
                onChange={(e) => setFormEffective(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface-hover)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input
                type="text"
                value={formReason}
                aria-label="Reason for salary structure change"
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="e.g. Annual revision"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface-hover)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Preview */}
          {parseFloat(formCtc) > 0 && (
            <div className="bg-[var(--bg-surface-hover)]/30 rounded-lg p-3 text-xs space-y-1">
              <p className="font-medium text-sm">Preview</p>
              <div className="flex justify-between"><span>Annual CTC</span><span className="font-bold">{fmt(parseFloat(formCtc))}</span></div>
              <div className="flex justify-between"><span>Total Deductions (Employee)</span><span className="text-red-600">{fmt(formComponents.pf_employee + formComponents.esi_employee + formComponents.professional_tax + formComponents.tds)}</span></div>
              <div className="flex justify-between border-t border-[var(--border)] pt-1 mt-1"><span className="font-medium">Monthly Take-Home</span><span className="font-bold text-green-600">{fmt(Math.round((parseFloat(formCtc) - formComponents.pf_employee - formComponents.esi_employee - formComponents.professional_tax - formComponents.tds) / 12))}</span></div>
            </div>
          )}

          {/* Message */}
          <AnimatePresence>
            {formMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-sm flex items-center gap-2 ${formMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
              >
                {formMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {formMessage.text}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              {editStructure ? 'Update' : 'Create'} Structure
            </Button>
          </div>
        </div>
      </Modal>
    </StaggerContainer>
  );
}



