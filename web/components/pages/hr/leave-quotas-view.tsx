"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { Sliders, Plus, Trash2, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { PortalSelect } from '@/components/ui/portal-select';

interface QuotaRow { id: string; role: string; leaveType: string; quota: number; }
interface LeaveType { code: string; name: string; }

function makeId() { return Math.random().toString(36).slice(2); }

export default function LeaveQuotasView() {
  const [rows, setRows] = useState<QuotaRow[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [enabledRoles, setEnabledRoles] = useState(['employee','team_lead','manager','director','hr','admin']);
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchQuotas = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/hr/leave-quotas-by-role', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.leaveTypes?.length) setLeaveTypes(data.leaveTypes);
      if (data.enabledRoles?.length) setEnabledRoles(data.enabledRoles);
      const map = data.roleQuotaMap as Record<string, Record<string, number>>;
      if (map && Object.keys(map).length > 0) {
        const loaded: QuotaRow[] = [];
        for (const [role, typeQ] of Object.entries(map)) {
          for (const [lt, q] of Object.entries(typeQ)) {
            loaded.push({ id: makeId(), role, leaveType: lt, quota: q });
          }
        }
        if (loaded.length) setRows(loaded);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchQuotas(); }, [fetchQuotas]);

  function addRow() {
    setRows(p => [...p, { id: makeId(), role: enabledRoles[0] || 'employee', leaveType: leaveTypes[0]?.code || 'CL', quota: 12 }]);
  }
  function removeRow(id: string) { setRows(p => p.filter(r => r.id !== id)); }
  function update(id: string, field: keyof QuotaRow, value: string | number) {
    setRows(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  async function handleSave() {
    setIsSaving(true); setResult(null);
    try {
      const res = await fetch('/api/hr/leave-quotas-by-role', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotas: rows.map(r => ({ role: r.role, leaveType: r.leaveType, quota: Number(r.quota) })), applyToExisting }),
      });
      const data = await res.json();
      setResult({ success: res.ok && data.success, message: data.message || data.error || 'Done' });
    } catch { setResult({ success: false, message: 'Network error' }); }
    finally { setIsSaving(false); }
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1000px] mx-auto w-full p-4 md:p-8">
      <header>
        <h1 className="text-display flex items-center gap-3">
          <Sliders className="w-7 h-7 text-[var(--primary)]" /> Leave Quotas by Role
        </h1>
        <p className="text-body mt-2">Set default leave days per role. Toggle "Apply to existing" to update all current employee balances retroactively.</p>
      </header>

      {result && (
        <div className={`card p-4 flex gap-3 border ${result.success ? 'border-[var(--success)]/30 bg-[var(--success)]/5' : 'border-[var(--danger)]/30 bg-[var(--danger)]/5'}`}>
          {result.success ? <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0" /> : <XCircle className="w-5 h-5 text-[var(--danger)] shrink-0" />}
          <p className="text-sm">{result.message}</p>
        </div>
      )}

      <div className="card p-6 shadow-lg space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-h3">Quota Rules</h2>
          <button type="button" onClick={addRow} className="btn btn-secondary btn-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Row
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 justify-center py-10 text-sm text-[var(--muted-foreground)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_1fr_100px_44px] gap-3 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)] px-1">
              <span>Role</span><span>Leave Type</span><span>Days/Year</span><span></span>
            </div>
            <div className="space-y-2">
              {rows.map(row => (
                <div key={row.id} className="grid grid-cols-[1fr_1fr_100px_44px] gap-3 items-center bg-[var(--muted)]/30 rounded-lg px-2 py-1.5">
                  <PortalSelect
                    aria-label="Role"
                    value={row.role}
                    onChange={(value) => update(row.id, 'role', value)}
                    options={enabledRoles.map((r) => ({
                      value: r,
                      label: r.charAt(0).toUpperCase() + r.slice(1),
                    }))}
                  />
                  <PortalSelect
                    aria-label="Leave type"
                    value={row.leaveType}
                    onChange={(value) => update(row.id, 'leaveType', value)}
                    options={leaveTypes.map((lt) => ({
                      value: lt.code,
                      label: `${lt.name} (${lt.code})`,
                    }))}
                  />
                  <input type="number" min={0} max={365} className="input h-9 text-center font-semibold" value={row.quota} onChange={e => update(row.id, 'quota', parseInt(e.target.value) || 0)} />
                  <button type="button" onClick={() => removeRow(row.id)} className="h-9 w-9 flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {rows.length === 0 && <p className="text-center text-sm text-[var(--muted-foreground)] py-8">No rules. Click "Add Row".</p>}
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20">
              <input id="apply-existing" type="checkbox" className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--primary)]" checked={applyToExisting} onChange={e => setApplyToExisting(e.target.checked)} />
              <div>
                <label htmlFor="apply-existing" className="text-sm font-semibold cursor-pointer">Apply to existing employees</label>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">Updates all current active employees' balances to match these quotas immediately.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex justify-end">
              <button type="button" onClick={handleSave} disabled={isSaving || !rows.length} className="btn btn-primary min-w-[160px] relative overflow-hidden">
                <span className={isSaving ? 'opacity-0' : 'flex items-center gap-2'}><Sliders className="w-4 h-4" /> Save Quotas</span>
                {isSaving && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
