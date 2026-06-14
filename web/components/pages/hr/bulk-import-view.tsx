"use client"
import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, XCircle, AlertCircle, Loader2, Download } from 'lucide-react';

/**
 * HR CSV Bulk Import page.
 * Drag-and-drop or click to upload a CSV of employees.
 * Shows per-row import results after processing.
 *
 * @page /hr/bulk-import
 */

interface ImportResult {
  email: string;
  status: 'created' | 'updated' | 'skipped' | 'error';
  reason?: string;
}
interface ImportSummary { total: number; created: number; updated: number; errors: number; }

const SAMPLE_CSV = `first_name,last_name,email,role,department,designation,manager_email,phone
Priya,Sharma,priya.sharma@company.com,employee,Engineering,Software Engineer,manager@company.com,+91 9000000001
Arjun,Nair,arjun.nair@company.com,manager,Sales,Sales Manager,,+91 9000000002
Deepa,Reddy,deepa.reddy@company.com,employee,HR,HR Executive,arjun.nair@company.com,`;

function downloadSample() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'employee-import-template.csv';
  a.click(); URL.revokeObjectURL(url);
}

const STATUS_CONFIG = {
  created: { icon: CheckCircle2, color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10', label: 'Created' },
  updated: { icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Updated' },
  skipped: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Skipped' },
  error: { icon: XCircle, color: 'text-[var(--danger)]', bg: 'bg-[var(--danger)]/10', label: 'Error' },
};

export default function BulkImportView() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith('.csv')) setFile(dropped);
    else setError('Only .csv files are accepted.');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) { setFile(selected); setError(null); }
  }

  async function handleUpload() {
    if (!file) return;
    setIsUploading(true); setError(null); setSummary(null); setResults([]);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/hr/bulk-import', { method: 'POST', credentials: 'include', body: form });
      const data = await res.json();
      if (res.ok && data.success) {
        setSummary(data.summary); setResults(data.results || []);
      } else {
        setError(data.error || 'Import failed');
      }
    } catch { setError('Network error. Please try again.'); }
    finally { setIsUploading(false); }
  }

  return (
    <div className="flex flex-col gap-6 max-w-[900px] mx-auto w-full p-4 md:p-8">
      <header>
        <h1 className="text-display flex items-center gap-3">
          <Upload className="w-7 h-7 text-[var(--primary)]" /> CSV Bulk Import
        </h1>
        <p className="text-body mt-2">Import up to 500 employees at once. Existing employees (matched by email) will be updated, not duplicated.</p>
      </header>

      {/* Sample CSV download */}
      <div className="card p-4 border border-[var(--border)] bg-[var(--muted)]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Required columns: <code className="text-[var(--primary)]">first_name, last_name, email</code></p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Optional: role, department, designation, manager_email, phone</p>
        </div>
        <button type="button" onClick={downloadSample} className="btn btn-secondary btn-sm flex items-center gap-2 shrink-0">
          <Download className="w-4 h-4" /> Download Template
        </button>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`card border-2 border-dashed cursor-pointer transition-all p-12 flex flex-col items-center gap-4 ${
          isDragging ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--muted)]/30'
        }`}
      >
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        {file ? (
          <>
            <FileText className="w-12 h-12 text-[var(--primary)]" />
            <div className="text-center">
              <p className="font-semibold text-[var(--foreground)]">{file.name}</p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 text-[var(--muted-foreground)]" />
            <div className="text-center">
              <p className="font-semibold text-[var(--foreground)]">Drag & drop your CSV here</p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">or click to browse</p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="card p-4 flex gap-3 border border-[var(--danger)]/30 bg-[var(--danger)]/5">
          <XCircle className="w-5 h-5 text-[var(--danger)] shrink-0" />
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </div>
      )}

      {file && !summary && (
        <div className="flex justify-end">
          <button type="button" onClick={handleUpload} disabled={isUploading} className="btn btn-primary min-w-[160px] relative overflow-hidden">
            <span className={isUploading ? 'opacity-0' : 'flex items-center gap-2'}><Upload className="w-4 h-4" /> Import Employees</span>
            {isUploading && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>}
          </button>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: summary.total, color: 'text-[var(--foreground)]' },
            { label: 'Created', value: summary.created, color: 'text-[var(--success)]' },
            { label: 'Updated', value: summary.updated, color: 'text-blue-500' },
            { label: 'Errors', value: summary.errors, color: 'text-[var(--danger)]' },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center border border-[var(--border)]">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Per-row results */}
      {results.length > 0 && (
        <div className="card shadow-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_1fr] gap-3 px-5 py-3 border-b border-[var(--border)] bg-[var(--muted)]/30 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
            <span>Email</span><span>Status</span><span>Reason</span>
          </div>
          <div className="divide-y divide-[var(--border)] max-h-[400px] overflow-y-auto">
            {results.map((r, i) => {
              const cfg = STATUS_CONFIG[r.status];
              const Icon = cfg.icon;
              return (
                <div key={i} className="grid grid-cols-[1fr_100px_1fr] gap-3 items-center px-5 py-2.5 text-sm">
                  <span className="truncate font-mono text-xs">{r.email}</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}>
                    <Icon className="w-3 h-3" />{cfg.label}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)] truncate">{r.reason || '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {summary && (
        <div className="flex justify-end">
          <button type="button" onClick={() => { setFile(null); setSummary(null); setResults([]); setError(null); if (fileRef.current) fileRef.current.value = ''; }} className="btn btn-secondary">
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
