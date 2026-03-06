'use client';

import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
} from 'lucide-react';

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

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
        value ? 'bg-primary' : 'bg-muted'
      }`}
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
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <p className="text-sm text-foreground">{label}</p>
      <div className="flex items-center gap-3">
        {editing ? (
          <>
            <input
              type="text"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="border border-border bg-background text-foreground rounded-lg px-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-foreground">{displayValue}</span>
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

  useEffect(() => {
    fetch('/api/hr/settings')
      .then((r) => r.json())
      .then((data: SettingsData) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load settings');
        setLoading(false);
      });
  }, []);

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/hr/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? 'Failed to save settings');
      } else {
        setSuccess('Settings saved successfully');
        setTimeout(() => setSuccess(''), 3000);
        const updated = await fetch('/api/hr/settings').then((r) => r.json());
        setSettings(updated);
      }
    } finally {
      setSaving(false);
    }
  }

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
      <div className="max-w-3xl animate-fade-in">
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm">{error || 'Failed to load settings'}</p>
        </div>
      </div>
    );
  }

  const { company, notifications, auto_approve } = settings;

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Company configuration and preferences</p>
        </div>
        {success && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg animate-fade-in">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{success}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive animate-fade-in">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 stagger">
        {/* Appearance */}
        <Card className="animate-slide-up bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Choose your preferred theme</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Color Theme</label>
              <ThemeToggle variant="button" />
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Your theme preference is saved automatically and persists across sessions.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Company Settings */}
        <Card className="animate-slide-up bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Organization details and configuration</CardDescription>
              </div>
              <Badge variant={company.onboarding_completed ? 'success' : 'warning'}>
                {company.onboarding_completed ? 'Active' : 'Setup Incomplete'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
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
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</p>
                  <p className="text-sm text-foreground mt-0.5 font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Join Code */}
        <Card className="animate-slide-up bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Key className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <CardTitle>Company Join Code</CardTitle>
                <CardDescription>Share with employees to join your organization</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted/30 border border-border rounded-lg px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">Join Code</p>
                <p className="text-xl font-mono font-bold text-primary tracking-widest">
                  {company.join_code ?? '--'}
                </p>
              </div>
              {company.join_code && <CopyButton text={company.join_code} />}
            </div>
            <p className="text-xs text-muted-foreground">
              Employees use this code during sign-up to join your organization.
            </p>
          </CardContent>
        </Card>

        {/* HR Preferences / Leave Policy */}
        <Card className="animate-slide-up bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Settings2 className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <CardTitle>HR Preferences</CardTitle>
                <CardDescription>Leave policy and approval settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
              <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <p className="text-sm text-foreground">Negative Balance</p>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {company.negative_balance ? 'Enabled' : 'Disabled'}
                  </span>
                  <ToggleSwitch
                    value={company.negative_balance}
                    onChange={(v) => save({ negative_balance: v })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Approve Settings - full width */}
      <Card className="animate-slide-up bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <FileText className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <CardTitle>Auto-Approve Settings</CardTitle>
              <CardDescription>
                Automatically approve requests meeting the confidence threshold
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-Approve Enabled</p>
              <p className="text-xs text-muted-foreground">
                Requires the Python constraint engine to be running
              </p>
            </div>
            <ToggleSwitch
              value={auto_approve.enabled}
              onChange={(v) => save({ auto_approve: v })}
            />
          </div>
          {auto_approve.enabled && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border animate-fade-in">
              <div>
                <p className="text-sm font-medium text-foreground">Confidence Threshold</p>
                <p className="text-xs text-muted-foreground">
                  0 = approve all; 1 = only perfect score
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground w-12 text-right">
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
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="animate-slide-up bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Bell className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure notification preferences for your organization</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {([
            { key: 'email_notifications' as const, label: 'Email notifications for leave requests', icon: Mail, iconOff: MailX },
            { key: 'manager_alerts' as const, label: 'Manager alerts for pending approvals', icon: Users, iconOff: Users },
            { key: 'daily_digest' as const, label: 'Daily digest for HR team', icon: Bell, iconOff: BellOff },
            { key: 'sla_alerts' as const, label: 'SLA breach alerts', icon: AlertTriangle, iconOff: AlertTriangle },
          ] as const).map(({ key, label, icon: Icon, iconOff: IconOff }) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                {notifications[key] ? (
                  <Icon className="w-5 h-5 text-primary" />
                ) : (
                  <IconOff className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-sm text-foreground">{label}</span>
              </div>
              <ToggleSwitch
                value={notifications[key]}
                onChange={(v) => save({ [key]: v })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="animate-slide-up bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage security and access controls</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="outline" className="justify-start gap-3 h-auto py-4">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium">Change Password</p>
                <p className="text-xs text-muted-foreground">Update your admin password</p>
              </div>
            </Button>
            <Button variant="outline" className="justify-start gap-3 h-auto py-4">
              <Smartphone className="w-5 h-5 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium">Two-Factor Auth</p>
                <p className="text-xs text-muted-foreground">Add extra security to accounts</p>
              </div>
            </Button>
            <Button variant="outline" className="justify-start gap-3 h-auto py-4">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium">Access Roles</p>
                <p className="text-xs text-muted-foreground">Manage user permissions</p>
              </div>
            </Button>
            <Button variant="outline" className="justify-start gap-3 h-auto py-4">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium">Audit Log</p>
                <p className="text-xs text-muted-foreground">View activity history</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
