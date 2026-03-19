'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Users, Globe, Clock, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto pt-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                  s < step
                    ? 'bg-green-500 text-white'
                    : s === step
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {s < step ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-20 h-1 ${s < step ? 'bg-green-500' : 'bg-slate-700'}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
            <div className="text-center mb-8">
              <Building2 className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white">Create Your Company</h1>
              <p className="text-slate-400 mt-2">Let's set up your organization</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Acme Corporation"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Industry
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Company Size
                  </label>
                  <select
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select size</option>
                    {COMPANY_SIZES.map((size) => (
                      <option key={size.value} value={size.value}>{size.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Globe className="w-4 h-4 inline mr-1" /> Country
                  </label>
                  <select
                    value={formData.countryCode}
                    onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="IN">India</option>
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                    <option value="SG">Singapore</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" /> Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Role Configuration */}
        {step === 2 && (
          <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
            <div className="text-center mb-8">
              <Users className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white">Configure Roles</h1>
              <p className="text-slate-400 mt-2">Choose how your organization is structured</p>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-slate-300 mb-4">
                  Select which roles your company needs. This affects how approvals and 
                  workflows are handled. You can change this later.
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-4 p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.requiresHr}
                    onChange={(e) => setFormData({ ...formData, requiresHr: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded border-slate-500 bg-slate-600 text-blue-500 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-white">HR Department</p>
                    <p className="text-sm text-slate-400">
                      Enable HR role for employee management, leave policies, and payroll.
                      If disabled, the company admin handles these.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-4 p-4 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.requiresManager}
                    onChange={(e) => setFormData({ ...formData, requiresManager: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded border-slate-500 bg-slate-600 text-blue-500 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-white">Management Hierarchy</p>
                    <p className="text-sm text-slate-400">
                      Enable Manager, Team Lead, and Director roles. If disabled, 
                      approvals go directly to HR or Admin.
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-medium text-blue-400 mb-2">Approval Flow Preview</h3>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="px-2 py-1 bg-slate-700 rounded">Employee</span>
                  <span>→</span>
                  {formData.requiresManager && (
                    <>
                      <span className="px-2 py-1 bg-slate-700 rounded">Manager</span>
                      <span>→</span>
                    </>
                  )}
                  {formData.requiresHr && (
                    <>
                      <span className="px-2 py-1 bg-slate-700 rounded">HR</span>
                      <span>→</span>
                    </>
                  )}
                  <span className="px-2 py-1 bg-slate-700 rounded">Admin</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
            <div className="text-center mb-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white">Review & Create</h1>
              <p className="text-slate-400 mt-2">Confirm your company details</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            <div className="space-y-4 mb-8">
              <div className="flex justify-between py-3 border-b border-slate-700">
                <span className="text-slate-400">Company Name</span>
                <span className="text-white font-medium">{formData.name}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-700">
                <span className="text-slate-400">Industry</span>
                <span className="text-white">{formData.industry || 'Not specified'}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-700">
                <span className="text-slate-400">Size</span>
                <span className="text-white">{formData.size || 'Not specified'}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-700">
                <span className="text-slate-400">HR Department</span>
                <span className={formData.requiresHr ? 'text-green-400' : 'text-slate-500'}>
                  {formData.requiresHr ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-700">
                <span className="text-slate-400">Management Hierarchy</span>
                <span className={formData.requiresManager ? 'text-green-400' : 'text-slate-500'}>
                  {formData.requiresManager ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                disabled={loading}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Company'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
