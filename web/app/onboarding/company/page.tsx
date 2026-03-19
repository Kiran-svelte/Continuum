'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Users, Globe, Clock, AlertCircle, Loader2, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Education',
  'Consulting',
  'Other',
];

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'America/New_York', label: 'US Eastern' },
  { value: 'America/Los_Angeles', label: 'US Pacific' },
  { value: 'Europe/London', label: 'UK (GMT)' },
  { value: 'Europe/Berlin', label: 'Central Europe' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Tokyo', label: 'Japan' },
  { value: 'Australia/Sydney', label: 'Australia' },
];

/**
 * Company Creation Page
 * 
 * Shown to invited admins who need to create their company.
 * Updated with clean, professional design system.
 */
export default function CreateCompanyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    size: '',
    countryCode: 'IN',
    timezone: 'Asia/Kolkata',
    // Role configuration
    requiresHr: true,
    requiresManager: true,
  });

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      // Build enabled roles based on configuration
      const enabledRoles = ['admin', 'employee'];
      if (formData.requiresHr) enabledRoles.push('hr');
      if (formData.requiresManager) {
        enabledRoles.push('manager', 'team_lead', 'director');
      }

      const response = await fetch('/api/company/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          enabledRoles,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create company');
        setLoading(false);
        return;
      }

      // Redirect to onboarding completion
      router.push('/onboarding/invite-team');
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const stepLabels = ['Company Info', 'Roles', 'Review'];

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-8">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                    s < step
                      ? 'bg-success text-white'
                      : s === step
                      ? 'bg-primary text-white'
                      : 'bg-border text-muted'
                  }`}
                >
                  {s < step ? <CheckCircle className="w-5 h-5" /> : s}
                </div>
                <span className={`text-xs mt-1 ${s === step ? 'text-foreground font-medium' : 'text-muted'}`}>
                  {stepLabels[s - 1]}
                </span>
              </div>
              {s < 3 && (
                <div className={`w-16 sm:w-24 h-0.5 mx-2 ${s < step ? 'bg-success' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="card p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Create Your Company</h1>
              <p className="text-muted mt-1">Let's set up your organization</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-error/5 border border-error/20 rounded-lg text-error flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="input-label">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Acme Corporation"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Industry</label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="input"
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">Company Size</label>
                  <select
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="input"
                  >
                    <option value="">Select size</option>
                    {COMPANY_SIZES.map((size) => (
                      <option key={size.value} value={size.value}>{size.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label flex items-center gap-1">
                    <Globe className="w-4 h-4" /> Country
                  </label>
                  <select
                    value={formData.countryCode}
                    onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                    className="input"
                  >
                    <option value="IN">India</option>
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                    <option value="SG">Singapore</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
                <div>
                  <label className="input-label flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="input"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => formData.name && setStep(2)}
                disabled={!formData.name}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Role Configuration */}
        {step === 2 && (
          <div className="card p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-accent" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Configure Roles</h1>
              <p className="text-muted mt-1">Choose how your organization is structured</p>
            </div>

            <div className="space-y-5">
              <div className="bg-surface-alt rounded-lg p-4">
                <p className="text-sm text-foreground-secondary">
                  Select which roles your company needs. This affects how approvals and 
                  workflows are handled. You can change this later.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-4 p-4 bg-surface-alt rounded-lg cursor-pointer hover:bg-hover transition-colors border border-transparent hover:border-border">
                  <input
                    type="checkbox"
                    checked={formData.requiresHr}
                    onChange={(e) => setFormData({ ...formData, requiresHr: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded border-border bg-background text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="font-medium text-foreground">HR Department</p>
                    <p className="text-sm text-muted mt-0.5">
                      Enable HR role for employee management, leave policies, and payroll.
                      If disabled, the company admin handles these.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-4 p-4 bg-surface-alt rounded-lg cursor-pointer hover:bg-hover transition-colors border border-transparent hover:border-border">
                  <input
                    type="checkbox"
                    checked={formData.requiresManager}
                    onChange={(e) => setFormData({ ...formData, requiresManager: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded border-border bg-background text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="font-medium text-foreground">Management Hierarchy</p>
                    <p className="text-sm text-muted mt-0.5">
                      Enable Manager, Team Lead, and Director roles. If disabled, 
                      approvals go directly to HR or Admin.
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h3 className="font-medium text-primary mb-2">Approval Flow Preview</h3>
                <div className="flex flex-wrap items-center gap-2 text-sm text-foreground-secondary">
                  <span className="px-2 py-1 bg-background rounded border border-border">Employee</span>
                  <span className="text-muted">→</span>
                  {formData.requiresManager && (
                    <>
                      <span className="px-2 py-1 bg-background rounded border border-border">Manager</span>
                      <span className="text-muted">→</span>
                    </>
                  )}
                  {formData.requiresHr && (
                    <>
                      <span className="px-2 py-1 bg-background rounded border border-border">HR</span>
                      <span className="text-muted">→</span>
                    </>
                  )}
                  <span className="px-2 py-1 bg-background rounded border border-border">Admin</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="card p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-success/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-success" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Review & Create</h1>
              <p className="text-muted mt-1">Confirm your company details</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-error/5 border border-error/20 rounded-lg text-error flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-0 mb-8 bg-surface-alt rounded-lg overflow-hidden">
              <div className="flex justify-between p-4 border-b border-border">
                <span className="text-muted">Company Name</span>
                <span className="text-foreground font-medium">{formData.name}</span>
              </div>
              <div className="flex justify-between p-4 border-b border-border">
                <span className="text-muted">Industry</span>
                <span className="text-foreground">{formData.industry || 'Not specified'}</span>
              </div>
              <div className="flex justify-between p-4 border-b border-border">
                <span className="text-muted">Size</span>
                <span className="text-foreground">{formData.size || 'Not specified'}</span>
              </div>
              <div className="flex justify-between p-4 border-b border-border">
                <span className="text-muted">HR Department</span>
                <span className={formData.requiresHr ? 'text-success font-medium' : 'text-muted'}>
                  {formData.requiresHr ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between p-4">
                <span className="text-muted">Management Hierarchy</span>
                <span className={formData.requiresManager ? 'text-success font-medium' : 'text-muted'}>
                  {formData.requiresManager ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={loading}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 !bg-success hover:!bg-success/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Create Company
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
