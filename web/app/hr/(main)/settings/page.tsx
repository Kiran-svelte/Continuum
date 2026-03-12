'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StaggerContainer, FadeIn, TiltCard } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  BellOff,
  Building2,
  CheckCircle,
  ClipboardCopy,
  Key,
  Palette,
  Shield,
  Smartphone,
  Settings2,
  Users,
  Mail,
  MailX,
  FileText,
  AlertTriangle,
  User,
  Loader2,
} from 'lucide-react';
import { supabaseGetUser, supabaseSendPasswordResetEmail } from '@/lib/supabase';

interface CompanyInfo {
  id: string;
  name: string | null;
  industry: string | null;
  size: string | null;
  timezone: string;
  country_code: string;
  join_code: string | null;
  sla_hours: number;
  negative_balance: boolean;
  probation_period_days: number;
  notice_period_days: number;
  leave_year_start: string;
  onboarding_completed: boolean;
}

interface NotificationPrefs {
  email_notifications: boolean;
  manager_alerts: boolean;
  daily_digest: boolean;
  sla_alerts: boolean;
}

interface AutoApproveSettings {
  enabled: boolean;
  threshold: number;
}

interface SettingsData {
  company: CompanyInfo;
  notifications: NotificationPrefs;
  auto_approve: AutoApproveSettings;
}

/** Shape returned / accepted by the personal notification preferences API */
interface PersonalNotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  reminderTiming: unknown;
}

const defaultPersonalPrefs: PersonalNotificationPreferences = {
  emailEnabled: true,
  pushEnabled: true,
  inAppEnabled: true,
  reminderTiming: null,
};

function ToggleSwitch({
  value,
  onChange,
  label,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${value ? 'bg-primary' : 'bg-white/5'}`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${
          value ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="gap-2"
    >
      <ClipboardCopy className="w-4 h-4" />
      {copied ? 'Copied!' : 'Copy'}
    </Button>
  );
}

function EditableRow({
  label,
  displayValue,
  onSave,
  disabled,
}: {
  label: string;
  displayValue: string;
  onSave: (v: string) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(displayValue);

  useEffect(() => {
    setVal(displayValue);
  }, [displayValue]);

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
      <p className="text-sm text-white">{label}</p>
      <div className="flex items-center gap-3">
        {editing ? (
          <>
            <input
              type="text"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="border border-white/10 bg-black text-white rounded-lg px-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => { onSave(val); setEditing(false); }}
              disabled={disabled}
            >
              Save
            </Button>
            <button
              onClick={() => { setVal(displayValue); setEditing(false); }}
              className="text-xs text-white/60 hover:text-white hover:underline"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-white">{displayValue}</span>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-primary hover:underline"
            >
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function HRSettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Personal notification preferences (DB-backed)
  const [personalPrefs, setPersonalPrefs] = useState<PersonalNotificationPreferences>(defaultPersonalPrefs);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [settingsRes, prefsRes] = await Promise.all([
        fetch('/api/hr/settings', { credentials: 'include' }),
        fetch('/api/notifications/preferences', { credentials: 'include' }),
      ]);

      if (settingsRes.ok) {
        const data: SettingsData = await settingsRes.json();
        setSettings(data);
      } else {
        setError('Failed to load settings');
      }

      if (prefsRes.ok) {
        const data = await prefsRes.json();
        if (data.preferences) {
          setPersonalPrefs(data.preferences);
        }
      }
    } catch {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/hr/settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? 'Failed to save settings');
      } else {
        setSuccess('Settings saved successfully');
        setTimeout(() => setSuccess(''), 3000);
        const updated = await fetch('/api/hr/settings', { credentials: 'include' }).then((r) => r.json());
        setSettings(updated);
      }
    } finally {
      setSaving(false);
    }
  }

  /**
   * Toggle a single personal notification preference and auto-save via PUT.
   * Optimistic update with rollback on error.
   */
  const handlePersonalToggle = useCallback(
    async (key: 'emailEnabled' | 'pushEnabled' | 'inAppEnabled', value: boolean) => {
      const previous = personalPrefs[key];

      // Optimistic update
      setPersonalPrefs((prev) => ({ ...prev, [key]: value }));
      setSavingField(key);
      setSavedField(null);

      try {
        const res = await fetch('/api/notifications/preferences', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: value }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Save failed (${res.status})`);
        }

        const data = await res.json();
        if (data.preferences) {
          setPersonalPrefs(data.preferences);
        }

        setSavingField(null);
        setSavedField(key);

        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => {
          setSavedField((prev) => (prev === key ? null : prev));
        }, 2000);
      } catch {
        setPersonalPrefs((prev) => ({ ...prev, [key]: previous }));
        setSavingField(null);
        setError('Failed to save notification preference.');
        setTimeout(() => setError(''), 5000);
      }
    },
    [personalPrefs],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="max-w-3xl">
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm flex-1">{error || 'Failed to load settings'}</p>
          <button
            type="button"
            onClick={loadAll}
            className="ml-2 text-sm underline hover:no-underline shrink-0"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { company, notifications, auto_approve } = settings;

  const personalNotificationItems: Array<{
    key: 'emailEnabled' | 'pushEnabled' | 'inAppEnabled';
    label: string;
    description: string;
    iconOn: typeof Mail;
    iconOff: typeof MailX;
  }> = [
    {
      key: 'emailEnabled',
      label: 'Email Notifications',
      description: 'Receive personal updates and reminders via email',
      iconOn: Mail,
      iconOff: MailX,
    },
    {
      key: 'pushEnabled',
      label: 'Push Notifications',
      description: 'Get notified about approvals and escalations',
      iconOn: Bell,
      iconOff: BellOff,
    },
    {
      key: 'inAppEnabled',
      label: 'In-App Notifications',
      description: 'See notification alerts within the application',
      iconOn: Smartphone,
      iconOff: Smartphone,
    },
  ];

  return (
    <StaggerContainer className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Settings"
        description="Company configuration and preferences"
        icon={<Settings2 className="w-6 h-6 text-primary" />}
        action={
          success ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/15 text-emerald-400 rounded-lg border border-emerald-500/20"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{success}</span>
            </motion.div>
          ) : undefined
        }
      />

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2x2 Grid Section */}
      <FadeIn>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Appearance */}
          <GlassPanel>
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Appearance</h3>
                  <p className="text-sm text-white/60">Choose your preferred theme</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-white mb-3 block">Color Theme</label>
                <ThemeToggle variant="button" />
              </div>
              <div className="pt-3 border-t border-white/10">
                <p className="text-xs text-white/60">
                  Your theme preference is saved automatically and persists across sessions.
                </p>
              </div>
            </div>
          </GlassPanel>

          {/* Company Settings */}
          <GlassPanel>
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">Company Information</h3>
                  <p className="text-sm text-white/60">Organization details and configuration</p>
                </div>
                <Badge variant={company.onboarding_completed ? 'success' : 'warning'}>
                  {company.onboarding_completed ? 'Active' : 'Setup Incomplete'}
                </Badge>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Company Name', value: company.name ?? '--' },
                  { label: 'Industry', value: company.industry ?? '--' },
                  { label: 'Company Size', value: company.size ?? '--' },
                  { label: 'Timezone', value: company.timezone },
                  { label: 'Country', value: company.country_code },
                  { label: 'Onboarding', value: company.onboarding_completed ? 'Complete' : 'Pending' },
                ].map((item) => (
                  <div key={item.label} className="p-2">
                    <p className="text-xs text-white/60 uppercase tracking-wide">{item.label}</p>
                    <p className="text-sm text-white mt-0.5 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </GlassPanel>

          {/* Join Code */}
          <GlassPanel>
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Key className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Company Join Code</h3>
                  <p className="text-sm text-white/60">Share with employees to join your organization</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                  <p className="text-xs text-white/60 mb-1">Join Code</p>
                  <p className="text-xl font-mono font-bold text-primary tracking-widest">
                    {company.join_code ?? '--'}
                  </p>
                </div>
                {company.join_code && <CopyButton text={company.join_code} />}
              </div>
              <p className="text-xs text-white/60">
                Employees use this code during sign-up to join your organization.
              </p>
            </div>
          </GlassPanel>

          {/* HR Preferences / Leave Policy */}
          <GlassPanel>
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Settings2 className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">HR Preferences</h3>
                  <p className="text-sm text-white/60">Leave policy and approval settings</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-1">
                {[
                  { label: 'Leave Year Start', key: 'leave_year_start' as const, value: company.leave_year_start, type: 'text' as const },
                  { label: 'SLA for Approvals', key: 'sla_hours' as const, value: String(company.sla_hours), displayValue: `${company.sla_hours} hours`, type: 'number' as const },
                  { label: 'Probation Period', key: 'probation_period_days' as const, value: String(company.probation_period_days), displayValue: `${company.probation_period_days} days`, type: 'number' as const },
                  { label: 'Notice Period', key: 'notice_period_days' as const, value: String(company.notice_period_days), displayValue: `${company.notice_period_days} days`, type: 'number' as const },
                ].map((item) => (
                  <EditableRow
                    key={item.label}
                    label={item.label}
                    displayValue={item.displayValue ?? item.value}
                    onSave={(newVal) => {
                      const patch: Record<string, unknown> = {};
                      if (item.type === 'number') {
                        patch[item.key] = parseInt(newVal, 10);
                      } else {
                        patch[item.key] = newVal;
                      }
                      save(patch);
                    }}
                    disabled={saving}
                  />
                ))}
                <div className="flex items-center justify-between py-3 border-b border-white/10 last:border-0">
                  <p className="text-sm text-white">Negative Balance</p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white">
                      {company.negative_balance ? 'Enabled' : 'Disabled'}
                    </span>
                    <ToggleSwitch
                      value={company.negative_balance}
                      onChange={(v) => save({ negative_balance: v })}
                      label="Negative Balance"
                    />
                  </div>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
      </FadeIn>

      {/* Auto-Approve Settings - full width */}
      <FadeIn>
        <GlassPanel>
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <FileText className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Auto-Approve Settings</h3>
                <p className="text-sm text-white/60">
                  Automatically approve requests meeting the confidence threshold
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-white/10">
              <div>
                <p className="text-sm font-medium text-white">Auto-Approve Enabled</p>
                <p className="text-xs text-white/60">
                  Requires the Python constraint engine to be running
                </p>
              </div>
              <ToggleSwitch
                value={auto_approve.enabled}
                onChange={(v) => save({ auto_approve: v })}
                label="Auto-Approve Enabled"
              />
            </div>
            <AnimatePresence>
              {auto_approve.enabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-between p-3 rounded-lg border border-white/10">
                    <div>
                      <p className="text-sm font-medium text-white">Confidence Threshold</p>
                      <p className="text-xs text-white/60">
                        0 = approve all; 1 = only perfect score
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white w-12 text-right">
                        {(auto_approve.threshold * 100).toFixed(0)}%
                      </span>
                      <input
                        type="range"
                        min="0.5"
                        max="1"
                        step="0.05"
                        value={auto_approve.threshold}
                        onChange={(e) =>
                          setSettings((s) =>
                            s
                              ? { ...s, auto_approve: { ...s.auto_approve, threshold: parseFloat(e.target.value) } }
                              : s
                          )
                        }
                        onMouseUp={(e) =>
                          save({ auto_approve_threshold: parseFloat((e.target as HTMLInputElement).value) })
                        }
                        className="w-32 accent-primary"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassPanel>
      </FadeIn>

      {/* Organization Notifications (company-wide) */}
      <FadeIn>
        <GlassPanel>
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Bell className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Organization Notifications</h3>
                <p className="text-sm text-white/60">Configure notification preferences for your organization</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {([
              { key: 'email_notifications' as const, label: 'Email notifications for leave requests', icon: Mail, iconOff: MailX },
              { key: 'manager_alerts' as const, label: 'Manager alerts for pending approvals', icon: Users, iconOff: Users },
              { key: 'daily_digest' as const, label: 'Daily digest for HR team', icon: Bell, iconOff: BellOff },
              { key: 'sla_alerts' as const, label: 'SLA breach alerts', icon: AlertTriangle, iconOff: AlertTriangle },
            ] as const).map(({ key, label, icon: Icon, iconOff: IconOff }) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {notifications[key] ? (
                    <Icon className="w-5 h-5 text-primary" />
                  ) : (
                    <IconOff className="w-5 h-5 text-white/60" />
                  )}
                  <span className="text-sm text-white">{label}</span>
                </div>
                <ToggleSwitch
                  value={notifications[key]}
                  onChange={(v) => save({ [key]: v })}
                  label={label}
                />
              </div>
            ))}
          </div>
        </GlassPanel>
      </FadeIn>

      {/* Personal Notification Preferences (DB-backed per-employee) */}
      <FadeIn>
        <GlassPanel>
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <User className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">My Notification Preferences</h3>
                <p className="text-sm text-white/60">Configure how you personally receive notifications</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {personalNotificationItems.map(({ key, label, description, iconOn: IconOn, iconOff: IconOff }) => {
              const value = personalPrefs[key];
              const isSaving = savingField === key;
              const isSaved = savedField === key;

              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {value ? (
                      <IconOn className="w-5 h-5 text-primary" />
                    ) : (
                      <IconOff className="w-5 h-5 text-white/60" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-white/60">{description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSaving && (
                      <Loader2 className="w-4 h-4 animate-spin text-white/60" />
                    )}
                    {isSaved && !isSaving && (
                      <span className="text-xs text-emerald-400 font-medium">
                        Saved
                      </span>
                    )}
                    <ToggleSwitch
                      value={value}
                      onChange={(v) => handlePersonalToggle(key, v)}
                      label={label}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-white/60 pt-2">
              Changes are saved automatically when you toggle a setting.
            </p>
          </div>
        </GlassPanel>
      </FadeIn>

      {/* Security Settings */}
      <FadeIn>
        <GlassPanel>
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Security Settings</h3>
                <p className="text-sm text-white/60">Manage security and access controls</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={async () => {
                try {
                  const user = await supabaseGetUser();
                  if (!user?.email) {
                    setError('Unable to determine your email address. Please sign in again.');
                    setTimeout(() => setError(''), 5000);
                    return;
                  }
                  const { error: resetErr } = await supabaseSendPasswordResetEmail(user.email);
                  if (resetErr) {
                    setError(resetErr.message || 'Failed to send password reset email.');
                    setTimeout(() => setError(''), 5000);
                    return;
                  }
                  setSuccess('Password reset email sent! Check your inbox.');
                  setTimeout(() => setSuccess(''), 5000);
                } catch {
                  setError('Failed to send password reset email. Please try again.');
                  setTimeout(() => setError(''), 5000);
                }
              }}>
                <Shield className="w-5 h-5 text-white/60" />
                <div className="text-left">
                  <p className="font-medium">Change Password</p>
                  <p className="text-xs text-white/60">Update your admin password</p>
                </div>
              </Button>
              <Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={() => {
                setSuccess('Two-factor authentication setup will be available in a future update.');
                setTimeout(() => setSuccess(''), 5000);
              }}>
                <Smartphone className="w-5 h-5 text-white/60" />
                <div className="text-left">
                  <p className="font-medium">Two-Factor Auth</p>
                  <p className="text-xs text-white/60">Add extra security to accounts</p>
                </div>
              </Button>
              <Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={() => {
                window.location.assign('/hr/employees');
              }}>
                <Users className="w-5 h-5 text-white/60" />
                <div className="text-left">
                  <p className="font-medium">Access Roles</p>
                  <p className="text-xs text-white/60">Manage user permissions</p>
                </div>
              </Button>
              <Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={() => {
                window.location.assign('/hr/reports');
              }}>
                <FileText className="w-5 h-5 text-white/60" />
                <div className="text-left">
                  <p className="font-medium">Audit Log</p>
                  <p className="text-xs text-white/60">View activity history</p>
                </div>
              </Button>
            </div>
          </div>
        </GlassPanel>
      </FadeIn>
    </StaggerContainer>
  );
}
