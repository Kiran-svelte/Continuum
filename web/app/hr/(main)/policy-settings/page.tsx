'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CATEGORY_BADGE: Record<string, 'info' | 'warning' | 'success'> = {
  validation: 'info',
  business: 'warning',
  compliance: 'success',
};

interface RuleRow {
  rule_id: string;
  name: string;
  description: string;
  category: string;
  is_blocking: boolean;
  is_active: boolean;
  priority: number;
  config: Record<string, unknown>;
  persisted: boolean;
}

interface LeaveTypeRow {
  id: string;
  code: string;
  name: string;
  category: string;
  default_quota: number;
  carry_forward: boolean;
  max_carry_forward: number;
  encashment_enabled: boolean;
  encashment_max_days: number;
  paid: boolean;
}

interface PolicyData {
  rules: RuleRow[];
  leave_types: LeaveTypeRow[];
  policy_version: number;
  policy_updated_at: string | null;
}

function ConfigBadges({ config }: { config: Record<string, unknown> }) {
  const items: string[] = [];
  if (typeof config.min_coverage_percent === 'number') items.push(`Coverage ≥ ${config.min_coverage_percent}%`);
  if (typeof config.max_concurrent === 'number') items.push(`Max ${config.max_concurrent} concurrent`);
  if (typeof config.allow_negative === 'boolean') items.push(config.allow_negative ? 'Neg balance: ON' : 'Neg balance: OFF');
  if (Array.isArray(config.blackout_dates) && config.blackout_dates.length > 0)
    items.push(`${config.blackout_dates.length} blackout period(s)`);
  if (typeof config.notice_days === 'object' && config.notice_days !== null)
    items.push(`Notice: per-type`);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.map((item) => (
        <span key={item} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
          {item}
        </span>
      ))}
    </div>
  );
}

function RuleConfigEditor({
  rule,
  onSave,
  saving,
}: {
  rule: RuleRow;
  onSave: (ruleId: string, patch: Record<string, unknown>, isActive: boolean) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [config, setConfig] = useState(rule.config);
  const [isActive, setIsActive] = useState(rule.is_active);
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    setConfig(rule.config);
    setIsActive(rule.is_active);
    setJsonError('');
  }, [rule]);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-primary hover:underline mt-1"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground">Active</label>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
      </div>

      {rule.rule_id === 'RULE003' && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">Min Coverage %</label>
          <input
            type="number"
            min={0}
            max={100}
            value={(config.min_coverage_percent as number) ?? 60}
            onChange={(e) => setConfig({ ...config, min_coverage_percent: parseInt(e.target.value) })}
            className="border border-border rounded px-2 py-1 text-xs w-20"
          />
        </div>
      )}

      {rule.rule_id === 'RULE004' && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">Max Concurrent</label>
          <input
            type="number"
            min={1}
            max={50}
            value={(config.max_concurrent as number) ?? 2}
            onChange={(e) => setConfig({ ...config, max_concurrent: parseInt(e.target.value) })}
            className="border border-border rounded px-2 py-1 text-xs w-20"
          />
        </div>
      )}

      {rule.rule_id === 'RULE005' && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Blackout Periods (JSON array)</label>
          <textarea
            rows={3}
            value={JSON.stringify(config.blackout_dates ?? [], null, 2)}
            onChange={(e) => {
              try {
                setConfig({ ...config, blackout_dates: JSON.parse(e.target.value) });
                setJsonError('');
              } catch {
                setJsonError('Invalid JSON — fix before saving');
              }
            }}
            className={`mt-1 w-full border rounded px-2 py-1 text-xs font-mono ${jsonError ? 'border-red-400' : 'border-border'}`}
          />
          {jsonError && (
            <p className="text-xs text-red-500 mt-1">{jsonError}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Format: {`[{"name":"Q4 Freeze","start":"2025-10-01","end":"2025-10-07"}]`}
          </p>
        </div>
      )}

      {rule.rule_id === 'RULE002' && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">Allow Negative Balance</label>
          <input
            type="checkbox"
            checked={!!config.allow_negative}
            onChange={(e) => setConfig({ ...config, allow_negative: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            onSave(rule.rule_id, { ...config }, isActive);
            setEditing(false);
          }}
          disabled={saving || !!jsonError}
          className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Rule'}
        </button>
        <button
          onClick={() => { setConfig(rule.config); setJsonError(''); setEditing(false); }}
          className="text-xs text-muted-foreground hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function PolicySettingsPage() {
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/hr/policy')
      .then((r) => r.json())
      .then((data: PolicyData) => {
        setPolicy(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load policy');
        setLoading(false);
      });
  }, []);

  async function saveRule(ruleId: string, config: Record<string, unknown>, isActive?: boolean) {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const patch: Record<string, unknown> = { config };
      if (isActive !== undefined) patch.is_active = isActive;
      const res = await fetch('/api/hr/policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: [{ rule_id: ruleId, ...patch }] }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? 'Failed to save rule');
      } else {
        setSuccess(`Rule ${ruleId} updated. Constraint engine will apply changes on next leave request.`);
        setTimeout(() => setSuccess(''), 4000);
        const updated = await fetch('/api/hr/policy').then((r) => r.json());
        setPolicy(updated);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Policy Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure leave policies and constraint rules for your organization.
          {policy && (
            <span className="ml-2 text-xs text-muted-foreground">
              Policy v{policy.policy_version}
              {policy.policy_updated_at && (
                <> · Last updated {new Date(policy.policy_updated_at).toLocaleDateString()}</>
              )}
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
          {success}
        </div>
      )}

      {/* Leave Type Catalog */}
      {policy && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Leave Types ({policy.leave_types.length > 0 ? policy.leave_types.length : '—'})
              </CardTitle>
              <Badge variant="info">
                {policy.leave_types.length > 0 ? 'Company-Specific' : 'None Configured'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {policy.leave_types.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No leave types configured yet. Complete onboarding to set up leave types.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 pr-4 text-muted-foreground font-medium">Code</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Name</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Quota</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Category</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">Carry Forward</th>
                      <th className="text-left py-3 pl-2 text-muted-foreground font-medium hidden lg:table-cell">Encashment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policy.leave_types.map((lt) => (
                      <tr key={lt.code} className="border-b border-border hover:bg-muted/50">
                        <td className="py-2.5 pr-4">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                            {lt.code}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-foreground">{lt.name}</td>
                        <td className="py-2.5 px-2 text-foreground font-medium">{lt.default_quota} days</td>
                        <td className="py-2.5 px-2">
                          <Badge
                            variant={
                              lt.category === 'statutory'
                                ? 'warning'
                                : lt.category === 'special'
                                  ? 'success'
                                  : 'default'
                            }
                          >
                            {lt.category}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 hidden md:table-cell">
                          {lt.carry_forward ? (
                            <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                              ✓ Up to {lt.max_carry_forward} days
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">No</span>
                          )}
                        </td>
                        <td className="py-2.5 pl-2 hidden lg:table-cell">
                          {lt.encashment_enabled ? (
                            <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                              ✓ Up to {lt.encashment_max_days} days
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Constraint Rules */}
      {policy && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Constraint Rules ({policy.rules.length})</CardTitle>
              <Badge variant="warning">
                {policy.rules.filter((r) => r.persisted).length} customized
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {policy.rules.map((rule) => (
                <div
                  key={rule.rule_id}
                  className={`p-3 rounded-lg border transition-colors ${rule.is_active ? 'border-border hover:bg-muted/50' : 'border-border bg-muted/50 opacity-60'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">{rule.rule_id}</span>
                        <p className="text-sm font-semibold text-foreground">{rule.name}</p>
                        <Badge variant={CATEGORY_BADGE[rule.category] ?? 'default'}>
                          {rule.category}
                        </Badge>
                        {rule.is_blocking && (
                          <span className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                            Blocking
                          </span>
                        )}
                        {!rule.is_active && (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                            Disabled
                          </span>
                        )}
                        {rule.persisted && (
                          <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                            Customized
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                      <ConfigBadges config={rule.config} />
                      <RuleConfigEditor
                        rule={rule}
                        onSave={(ruleId, config, isActive) => saveRule(ruleId, config, isActive)}
                        saving={saving}
                      />
                    </div>
                    <div className="ml-4 shrink-0">
                      <span className="text-xs text-muted-foreground">Priority {rule.priority}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              💡 Changes are applied immediately. The Python constraint engine reads these rules from the
              database on every leave request evaluation — no restart required.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

