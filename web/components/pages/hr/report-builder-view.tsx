'use client';

/**
 * Report Builder Dashboard — HR Portal
 *
 * Features:
 * - Select from 10 pre-built report templates
 * - Configure filters (date range, department, status, year)
 * - Execute reports and view results in a data table
 * - Export results as CSV
 *
 * @module app/hr/(main)/report-builder/page
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Play,
  ChevronLeft,
  Filter,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportTemplate {
  type: string;
  label: string;
  description: string;
  supportedFilters: string[];
}

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  department?: string;
  status?: string;
  year?: number;
}

interface ReportResult {
  type: string;
  rows: Record<string, unknown>[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportBuilderView() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [result, setResult] = useState<ReportResult | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      await ensureMe();
      const res = await fetch('/api/reports/builder', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch {
      toast.error('Failed to load report templates');
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const runReport = useCallback(async (page: number = 1) => {
    if (!selectedTemplate) return;
    setIsRunning(true);
    try {
      const res = await fetch('/api/reports/builder', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedTemplate.type,
          filters,
          page,
          pageSize: 50,
        }),
      });
      if (!res.ok) throw new Error('Failed to run report');
      const data = await res.json();
      setResult(data);
      setCurrentPage(page);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setIsRunning(false);
    }
  }, [selectedTemplate, filters]);

  const exportCsv = useCallback(() => {
    if (!result || result.rows.length === 0) return;

    const headers = Object.keys(result.rows[0]);
    const csvRows = [
      headers.join(','),
      ...result.rows.map((row) =>
        headers.map((h) => {
          const val = row[h];
          const cellValue = val === null || val === undefined ? '' : String(val);
          return cellValue.includes(',') ? `"${cellValue}"` : cellValue;
        }).join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.type}_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported as CSV');
  }, [result]);

  if (selectedTemplate) {
    return (
      <ReportExecutor
        template={selectedTemplate}
        filters={filters}
        setFilters={setFilters}
        result={result}
        isRunning={isRunning}
        currentPage={currentPage}
        onRun={runReport}
        onExport={exportCsv}
        onBack={() => { setSelectedTemplate(null); setResult(null); setFilters({}); }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      <PageHeader
        title="Report Builder"
        description="Generate, filter, and export HR analytics reports"
        icon={<BarChart3 className="w-6 h-6" />}
      />

      {isLoadingTemplates ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <button
              key={template.type}
              onClick={() => setSelectedTemplate(template)}
              className="card p-5 text-left hover:shadow-lg hover:ring-2 hover:ring-[var(--primary)] transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <Badge variant="outline">{template.supportedFilters.length} filters</Badge>
              </div>
              <h3 className="text-sm font-semibold mb-1 group-hover:text-[var(--primary)] transition-colors">
                {template.label}
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">
                {template.description}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Report Executor View ─────────────────────────────────────────────────────

interface ReportExecutorProps {
  template: ReportTemplate;
  filters: ReportFilters;
  setFilters: (f: ReportFilters) => void;
  result: ReportResult | null;
  isRunning: boolean;
  currentPage: number;
  onRun: (page?: number) => void;
  onExport: () => void;
  onBack: () => void;
}

function ReportExecutor({
  template, filters, setFilters, result, isRunning, currentPage, onRun, onExport, onBack,
}: ReportExecutorProps) {
  const hasFilters = template.supportedFilters.length > 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{template.label}</h2>
          <p className="text-xs text-[var(--muted-foreground)]">{template.description}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onRun()} disabled={isRunning}>
            <Play className="w-4 h-4 mr-1" /> {isRunning ? 'Running…' : 'Run Report'}
          </Button>
          {result && result.rows.length > 0 && (
            <Button size="sm" variant="outline" onClick={onExport}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {hasFilters && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Filters</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {template.supportedFilters.includes('startDate') && (
              <FilterInput
                label="Start Date"
                type="date"
                value={filters.startDate ?? ''}
                onChange={(v) => setFilters({ ...filters, startDate: v || undefined })}
              />
            )}
            {template.supportedFilters.includes('endDate') && (
              <FilterInput
                label="End Date"
                type="date"
                value={filters.endDate ?? ''}
                onChange={(v) => setFilters({ ...filters, endDate: v || undefined })}
              />
            )}
            {template.supportedFilters.includes('department') && (
              <FilterInput
                label="Department"
                type="text"
                value={filters.department ?? ''}
                onChange={(v) => setFilters({ ...filters, department: v || undefined })}
              />
            )}
            {template.supportedFilters.includes('status') && (
              <FilterInput
                label="Status"
                type="text"
                value={filters.status ?? ''}
                onChange={(v) => setFilters({ ...filters, status: v || undefined })}
              />
            )}
            {template.supportedFilters.includes('year') && (
              <FilterInput
                label="Year"
                type="number"
                value={filters.year ? String(filters.year) : ''}
                onChange={(v) => setFilters({ ...filters, year: v ? Number(v) : undefined })}
              />
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {isRunning && (
        <div className="card p-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {!isRunning && result && (
        <ResultTable result={result} currentPage={currentPage} onPageChange={(p) => onRun(p)} />
      )}

      {!isRunning && !result && (
        <div className="card p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium">Configure filters and click "Run Report"</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Results will appear here with pagination and CSV export.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Result Table ─────────────────────────────────────────────────────────────

function ResultTable({
  result, currentPage, onPageChange,
}: {
  result: ReportResult;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  if (result.rows.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-medium">No data found for this report</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">Try adjusting your filters.</p>
      </div>
    );
  }

  const headers = Object.keys(result.rows[0]);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <span className="text-sm font-semibold">
          {result.pagination.total} record{result.pagination.total !== 1 ? 's' : ''} found
        </span>
        <span className="text-xs text-[var(--muted-foreground)]">
          Page {currentPage} of {result.pagination.totalPages}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
              {headers.map((h) => (
                <th key={h} className="py-2 px-4 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase whitespace-nowrap">
                  {formatColumnHeader(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-[var(--border)]">
            {result.rows.map((row, index) => (
              <tr key={index} className="hover:bg-[var(--accent)] transition-colors">
                {headers.map((h) => (
                  <td key={h} className="py-2.5 px-4 text-xs whitespace-nowrap">
                    {formatCellValue(row[h])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 p-3 border-t border-[var(--border)]">
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-[var(--muted-foreground)]">
            {currentPage} / {result.pagination.totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage >= result.pagination.totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Filter Input ─────────────────────────────────────────────────────────────

function FilterInput({
  label, type, value, onChange,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = `filter-${label.toLowerCase().replace(/\s/g, '-')}`;
  return (
    <div>
      <label htmlFor={inputId} className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border px-3 py-1.5 text-sm"
        style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
      />
    </div>
  );
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatColumnHeader(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return String(value);
}
