'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, User } from 'lucide-react';
import { validatePassword } from '@/lib/password-validation';
import { CORE_FUNCTION_CATALOG, type ModuleSlug } from '@/lib/core-functions/catalog';
import { fetchWithTimeout, mapFetchErrorMessage } from '@/lib/fetch-with-timeout';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';

const REQUEST_TIMEOUT_MS = 20_000;

interface CreateCompanySuccess {
  message: string;
  company: {
    name: string;
    joinCode: string;
    onboardingStatus: string;
  };
  owner: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    status: string;
  };
  credentials?: {
    email?: string;
    loginUrl?: string;
    setupRequired?: boolean;
    supportMessage?: string;
  };
  setupRequired?: boolean;
  supportMessage?: string;
  instructions?: string;
}

export default function CompaniesNewView() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CreateCompanySuccess | null>(null);

  const [formData, setFormData] = useState({
    // Company info
    companyName: '',
    legalName: '',
    industry: '',
    size: '',
    countryCode: 'IN',
    timezone: 'Asia/Kolkata',
    
    // Owner info
    ownerEmail: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerPhone: '',
    ownerPassword: '',
    confirmOwnerPassword: '',
    ownerRole: 'admin',
  });
  const [moduleCap, setModuleCap] = useState<Set<ModuleSlug>>(
    () => new Set(CORE_FUNCTION_CATALOG.map((cf) => cf.slug))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (formData.ownerPassword !== formData.confirmOwnerPassword) {
      setError('Owner password and confirm password do not match');
      setLoading(false);
      return;
    }

    const passwordValidation = validatePassword(formData.ownerPassword);
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0] || 'Owner password does not meet security requirements');
      setLoading(false);
      return;
    }

    const { confirmOwnerPassword: _confirmOwnerPassword, ...payload } = formData;

    try {
      const response = await fetchWithTimeout('/api/super-admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          moduleCap: [...moduleCap],
        }),
      }, REQUEST_TIMEOUT_MS);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create company');
      }

      setSuccess(data);
    } catch (err: unknown) {
      setError(mapFetchErrorMessage(err, 'Failed to create company'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (success) {
    const credentials = success?.credentials ?? {};
    const ownerEmail = credentials?.email ?? success?.owner?.email ?? formData.ownerEmail;
    const loginUrl = credentials?.loginUrl ?? null;
    const setupRequired = credentials?.setupRequired ?? success?.setupRequired;
    const supportMessage = credentials?.supportMessage ?? success?.supportMessage ?? success?.instructions;

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card border border-border rounded-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Company Created Successfully!</h2>
              <p className="text-muted-foreground">
                {success.message}
              </p>
            </div>

            <div className="space-y-6">
              {/* Company Info */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Company Details</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="text-foreground font-medium">{success.company.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Join Code</dt>
                    <dd className="text-foreground font-mono">{success.company.joinCode}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="text-foreground">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {success.company.onboardingStatus}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Owner Info */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Company Owner</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="text-foreground font-medium">
                      {success.owner.firstName} {success.owner.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="text-foreground">{success.owner.email}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Role</dt>
                    <dd className="text-foreground capitalize">{success.owner.role}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="text-foreground capitalize">{success.owner.status}</dd>
                  </div>
                </dl>
              </div>

              {/* Secure Access Setup */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Secure Account Setup
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-blue-700">Owner Email:</span>
                    <code className="ml-2 px-2 py-1 bg-[var(--card)] rounded text-blue-900 font-mono">
                      {ownerEmail || 'Not available'}
                    </code>
                  </div>
                  {loginUrl ? (
                    <div>
                      <span className="text-blue-700">Login URL:</span>
                      <a
                        href={loginUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 hover:underline break-all"
                      >
                        {loginUrl}
                      </a>
                    </div>
                  ) : (
                    <div>
                      <span className="text-blue-700">Login URL:</span>
                      <span className="ml-2 text-blue-900">Use your standard sign-in portal.</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-xs text-blue-700 space-y-1">
                  <p>
                    Passwords are no longer displayed. Ask the owner to complete secure first-time setup via email-based reset.
                  </p>
                  {setupRequired !== undefined && (
                    <p>Setup Required: {setupRequired ? 'Yes' : 'No'}</p>
                  )}
                  <p>
                    Owner password was configured during company creation and is never shown back in UI.
                  </p>
                  {supportMessage && <p>{supportMessage}</p>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => router.push('/super-admin/companies')}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  View All Companies
                </Button>
                <Button
                  onClick={() => {
                    setSuccess(null);
                    setFormData({
                      companyName: '',
                      legalName: '',
                      industry: '',
                      size: '',
                      countryCode: 'IN',
                      timezone: 'Asia/Kolkata',
                      ownerEmail: '',
                      ownerFirstName: '',
                      ownerLastName: '',
                      ownerPhone: '',
                      ownerPassword: '',
                      confirmOwnerPassword: '',
                      ownerRole: 'admin',
                    });
                  }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
                >
                  Create Another
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">Create New Company</h1>
          <p className="text-muted-foreground">
            Set up a new company and create credentials for the company owner.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-8">
          {/* Company Information */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Company Information</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company Name *
                </label>
                <Input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Acme Corporation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Legal Name
                </label>
                <Input
                  type="text"
                  name="legalName"
                  value={formData.legalName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Acme Corporation Ltd."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Industry
                </label>
                <Select
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  aria-label="Industry"
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select Industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Retail">Retail</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Services">Services</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company Size
                </label>
                <Select
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  aria-label="Company size"
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select Size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501-1000">501-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Country
                </label>
                <Select
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleChange}
                  aria-label="Country"
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="IN">India</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Timezone
                </label>
                <Select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  aria-label="Timezone"
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t border-border"></div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">Core functions cap</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select the maximum modules this company may use. Mandatory modules cannot be removed.
            </p>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {CORE_FUNCTION_CATALOG.map((cf) => (
                <label key={cf.id} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={moduleCap.has(cf.slug)}
                    disabled={cf.mandatory}
                    onChange={() => {
                      setModuleCap((prev) => {
                        const next = new Set(prev);
                        if (next.has(cf.slug)) next.delete(cf.slug);
                        else next.add(cf.slug);
                        return next;
                      });
                    }}
                  />
                  {cf.name}
                </label>
              ))}
            </div>
          </div>

          {/* Company Owner Information */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Company Owner Information</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  First Name *
                </label>
                <Input
                  type="text"
                  name="ownerFirstName"
                  value={formData.ownerFirstName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Last Name *
                </label>
                <Input
                  type="text"
                  name="ownerLastName"
                  value={formData.ownerLastName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email *
                </label>
                <Input
                  type="email"
                  name="ownerEmail"
                  value={formData.ownerEmail}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="john.doe@acme.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Phone
                </label>
                <Input
                  type="tel"
                  name="ownerPhone"
                  value={formData.ownerPhone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="+91 1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Initial Role *
                </label>
                <Select
                  name="ownerRole"
                  value={formData.ownerRole}
                  onChange={handleChange}
                  aria-label="Initial role"
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="admin">Admin (Full Access)</option>
                  <option value="hr">HR (People Operations)</option>
                  <option value="director">Director (Management)</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Owner Password *
                </label>
                <Input
                  type="password"
                  name="ownerPassword"
                  value={formData.ownerPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Set a secure password"
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 8 chars with uppercase, lowercase, number, and special character.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirm Owner Password *
                </label>
                <Input
                  type="password"
                  name="confirmOwnerPassword"
                  value={formData.confirmOwnerPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Confirm password"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Company & Owner'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

