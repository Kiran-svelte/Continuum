"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemePreferencesPanel } from '@/components/theme-preferences-panel';

/**
 * Employee notification preferences page.
 * Toggle email/push/in-app notifications per event type.
 *
 * @page /employee/settings (rendered as a section)
 */

interface Prefs { email: boolean; push: boolean; in_app: boolean; }
type PrefsMap = Record<string, Prefs>;

const EVENT_LABELS: Record<string, string> = {
  leave_approved: 'Leave Approved',
  leave_rejected: 'Leave Rejected',
  leave_reminder: 'Leave Reminder',
  payslip_generated: 'Payslip Generated',
  reimbursement_approved: 'Reimbursement Approved',
  reimbursement_rejected: 'Reimbursement Rejected',
  attendance_reminder: 'Attendance Reminder',
  shift_change: 'Shift Change',
  announcement: 'Company Announcements',
  policy_update: 'Policy Updates',
};

export default function SettingsView() {
  const [prefs, setPrefs] = useState<PrefsMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchPrefs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/employee/notification-preferences', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPrefs(data.preferences || {});
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  function toggle(event: string, channel: keyof Prefs) {
    setPrefs(prev => ({
      ...prev,
      [event]: { ...prev[event], [channel]: !prev[event]?.[channel] },
    }));
  }

  async function handleSave() {
    setIsSaving(true); setSaved(false);
    try {
      const res = await fetch('/api/employee/notification-preferences', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs }),
      });
      if (res.ok) setSaved(true);
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  }

  return (
    <div className="flex flex-col gap-6 max-w-[800px] mx-auto w-full p-4 md:p-8">
      <header>
        <h1 className="text-display flex items-center gap-3">
          <Bell className="w-7 h-7 text-[var(--primary)]" /> Notification Preferences
        </h1>
        <p className="text-body mt-2">Choose how and when you receive notifications. Changes apply immediately.</p>
      </header>

      <ThemePreferencesPanel />

      {saved && (
        <div className="card p-4 flex gap-3 border border-[var(--success)]/30 bg-[var(--success)]/5">
          <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0" />
          <p className="text-sm text-[var(--success)]">Preferences saved.</p>
        </div>
      )}

      <div className="card shadow-lg overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_80px_80px_80px] gap-2 px-5 py-3 border-b border-[var(--border)] bg-[var(--muted)]/30 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
          <span>Event</span>
          <span className="text-center">Email</span>
          <span className="text-center">Push</span>
          <span className="text-center">In-App</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--muted-foreground)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading preferences...
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {Object.entries(EVENT_LABELS).map(([event, label]) => (
              <div key={event} className="grid grid-cols-[1fr_80px_80px_80px] gap-2 items-center px-5 py-3 hover:bg-[var(--muted)]/20 transition-colors">
                <span className="text-sm font-medium">{label}</span>
                {(['email', 'push', 'in_app'] as const).map(channel => (
                  <div key={channel} className="flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      role="switch"
                      aria-checked={prefs[event]?.[channel] ?? true}
                      onClick={() => toggle(event, channel)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${(prefs[event]?.[channel] ?? true) ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${(prefs[event]?.[channel] ?? true) ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="px-5 py-4 border-t border-[var(--border)] flex justify-end">
          <Button type="button" onClick={handleSave} disabled={isSaving} className="btn btn-primary min-w-[130px] relative overflow-hidden">
            <span className={isSaving ? 'opacity-0' : 'flex items-center gap-2'}><Save className="w-4 h-4" /> Save</span>
            {isSaving && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>}
          </Button>
        </div>
      </div>
    </div>
  );
}
