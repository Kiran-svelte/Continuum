'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
    >
      {copied ? '✅ Copied' : '📋 Copy'}
    </button>
  );
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full transition-colors cursor-pointer ${value ? 'bg-blue-600' : 'bg-gray-300'}`}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full mt-1 mx-1 transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
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
        // Refresh
        const updated = await fetch('/api/hr/settings').then((r) => r.json());
        setSettings(updated);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-72 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="max-w-3xl">
        <p className="text-red-600">{error || 'Failed to load settings'}</p>
      </div>
    );
  }

  const { company, notifications, auto_approve } = settings;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Company configuration and preferences</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Company Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Company Information</CardTitle>
            <Badge variant={company.onboarding_completed ? 'success' : 'warning'}>
              {company.onboarding_completed ? 'Active' : 'Setup Incomplete'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Company Name', value: company.name ?? '—' },
              { label: 'Industry', value: company.industry ?? '—' },
              { label: 'Company Size', value: company.size ?? '—' },
              { label: 'Timezone', value: company.timezone },
              { label: 'Country', value: company.country_code },
              { label: 'Onboarding', value: company.onboarding_completed ? 'Complete' : 'Pending' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{item.label}</p>
                <p className="text-sm text-gray-900 mt-0.5 font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Join Code */}
      <Card>
        <CardHeader>
          <CardTitle>Company Join Code</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-3">
            Share this code with employees so they can join your organization during sign-up.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Join Code</p>
              <p className="text-xl font-mono font-bold text-blue-700 tracking-widest">
                {company.join_code ?? '—'}
              </p>
            </div>
            {company.join_code && <CopyButton text={company.join_code} />}
          </div>
        </CardContent>
      </Card>

      {/* Leave Policy */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Leave Policy</CardTitle>
            <Badge variant="success">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                label: 'Leave Year Start',
                key: 'leave_year_start' as const,
                value: company.leave_year_start,
                type: 'text' as const,
              },
              {
                label: 'SLA for Approvals',
                key: 'sla_hours' as const,
                value: String(company.sla_hours),
                displayValue: `${company.sla_hours} hours`,
                type: 'number' as const,
              },
              {
                label: 'Probation Period',
                key: 'probation_period_days' as const,
                value: String(company.probation_period_days),
                displayValue: `${company.probation_period_days} days`,
                type: 'number' as const,
              },
              {
                label: 'Notice Period',
                key: 'notice_period_days' as const,
                value: String(company.notice_period_days),
                displayValue: `${company.notice_period_days} days`,
                type: 'number' as const,
              },
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
            <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <p className="text-sm text-gray-700">Negative Balance</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">
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

      {/* Auto-Approve */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Approve Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            When enabled, leave requests are automatically approved if the constraint engine
            confidence score meets the threshold. Requires the Python constraint engine to be running.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <p className="text-sm text-gray-700">Auto-Approve Enabled</p>
              <ToggleSwitch
                value={auto_approve.enabled}
                onChange={(v) => save({ auto_approve: v })}
              />
            </div>
            {auto_approve.enabled && (
              <div className="flex items-center justify-between py-2">
                <p className="text-sm text-gray-700">
                  Confidence Threshold
                  <span className="text-xs text-gray-400 ml-2">
                    (0 = approve all; 1 = only perfect score)
                  </span>
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
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
                        s ? { ...s, auto_approve: { ...s.auto_approve, threshold: parseFloat(e.target.value) } } : s
                      )
                    }
                    onMouseUp={(e) =>
                      save({ auto_approve_threshold: parseFloat((e.target as HTMLInputElement).value) })
                    }
                    className="w-32"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(
              [
                { key: 'email_notifications' as const, label: 'Email notifications for leave requests' },
                { key: 'manager_alerts' as const, label: 'Manager alerts for pending approvals' },
                { key: 'daily_digest' as const, label: 'Daily digest for HR team' },
                { key: 'sla_alerts' as const, label: 'SLA breach alerts' },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">{label}</span>
                <ToggleSwitch
                  value={notifications[key]}
                  onChange={(v) => save({ [key]: v })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
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
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <p className="text-sm text-gray-700">{label}</p>
      <div className="flex items-center gap-3">
        {editing ? (
          <>
            <input
              type="text"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={() => { onSave(val); setEditing(false); }}
              disabled={disabled}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => { setVal(displayValue); setEditing(false); }}
              className="text-xs text-gray-500 hover:underline"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-gray-900">{displayValue}</span>
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-blue-600 hover:underline"
            >
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}

