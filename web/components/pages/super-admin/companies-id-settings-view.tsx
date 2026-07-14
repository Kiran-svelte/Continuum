'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Loader2, Save, Settings } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type CompanySettingsForm = {
  name: string;
  legalName: string;
  industry: string;
  size: string;
  countryCode: string;
  timezone: string;
};

type CompanyResponse = {
  company: {
    id: string;
    name: string;
    legalName?: string | null;
    industry?: string | null;
    size?: string | null;
    countryCode?: string | null;
    timezone?: string | null;
  };
};

const DEFAULT_FORM: CompanySettingsForm = {
  name: '',
  legalName: '',
  industry: '',
  size: '',
  countryCode: 'IN',
  timezone: 'Asia/Kolkata',
};

export default function CompaniesIdSettingsView() {
  const params = useParams();
  const router = useRouter();
  const companyId = typeof params?.id === 'string'
    ? params.id
    : Array.isArray(params?.id)
      ? (params.id[0] ?? '')
      : '';

  const [form, setForm] = useState<CompanySettingsForm>(DEFAULT_FORM);
  const [initialForm, setInitialForm] = useState<CompanySettingsForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);

  useEffect(() => {
    const loadCompany = async () => {
      if (!companyId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/super-admin/companies/${companyId}`, { credentials: 'include' });
        const data: CompanyResponse & { error?: string } = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load company settings');
        }

        const nextForm: CompanySettingsForm = {
          name: data.company.name || '',
          legalName: data.company.legalName || '',
          industry: data.company.industry || '',
          size: data.company.size || '',
          countryCode: data.company.countryCode || 'IN',
          timezone: data.company.timezone || 'Asia/Kolkata',
        };

        setForm(nextForm);
        setInitialForm(nextForm);
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : 'Unable to load company settings');
      } finally {
        setLoading(false);
      }
    };

    void loadCompany();
  }, [companyId]);

  const updateField = (field: keyof CompanySettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setNotice(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!companyId) {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/super-admin/companies/${companyId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          legalName: form.legalName.trim() || null,
          industry: form.industry.trim() || null,
          size: form.size.trim() || null,
          countryCode: form.countryCode,
          timezone: form.timezone,
        }),
      });

      const data: { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update company settings');
      }

      setInitialForm(form);
      setNotice('Company settings updated successfully.');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to update company settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="inline-flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href={`/super-admin/companies/${companyId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Company
        </Link>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground inline-flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Company Settings
              </h1>
              <p className="text-sm text-muted-foreground">Manage the core identity and locale for this company.</p>
            </div>
            <Button
              type="button"
              onClick={() => router.push(`/super-admin/companies/${companyId}`)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Building2 className="w-4 h-4" />
              View Profile
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {notice && (
          <div className="bg-[var(--status-success-soft)] border border-[var(--status-success)] text-[var(--status-success)] rounded-lg px-4 py-3 text-sm">
            {notice}
          </div>
        )}

        <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label htmlFor="company-name" className="text-sm font-medium text-foreground">Company Name</label>
              <Input
                id="company-name"
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
                placeholder="Company name"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="company-legal-name" className="text-sm font-medium text-foreground">Legal Name</label>
              <Input
                id="company-legal-name"
                type="text"
                value={form.legalName}
                onChange={(e) => updateField('legalName', e.target.value)}
                placeholder="Registered legal name"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="company-industry" className="text-sm font-medium text-foreground">Industry</label>
              <Input
                id="company-industry"
                type="text"
                value={form.industry}
                onChange={(e) => updateField('industry', e.target.value)}
                placeholder="Industry"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="company-size" className="text-sm font-medium text-foreground">Company Size</label>
              <Input
                id="company-size"
                type="text"
                value={form.size}
                onChange={(e) => updateField('size', e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="e.g. 50-200"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="company-country-code" className="text-sm font-medium text-foreground">Country Code</label>
              <Select
                id="company-country-code"
                value={form.countryCode}
                onChange={(e) => updateField('countryCode', e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="IN">IN</option>
                <option value="US">US</option>
                <option value="UK">UK</option>
                <option value="AE">AE</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="company-timezone" className="text-sm font-medium text-foreground">Timezone</label>
              <Input
                id="company-timezone"
                type="text"
                value={form.timezone}
                onChange={(e) => updateField('timezone', e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="e.g. Asia/Kolkata"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              onClick={() => setForm(initialForm)}
              disabled={!isDirty || saving}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={!isDirty || saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
