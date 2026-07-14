'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, User, Copy, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

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
    const ownerEmail = success?.owner?.email ?? formData.ownerEmail;
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://continuum.support'}/sign-in`;
    const joinCode = success.company.joinCode;

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Success Header */}
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Company Created!</h2>
            <p className="text-muted-foreground">{success.message}</p>
          </div>

          {/* Credentials Card — most important */}
          <div className="bg-card border-2 border-primary/30 rounded-lg p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Owner Login Credentials
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Share these with the company owner via a secure channel (email, password manager, or in-person).</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-24 flex-shrink-0">Login URL</span>
                <code className="flex-1 bg-muted/50 px-3 py-2 rounded text-sm font-mono truncate">{loginUrl}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(loginUrl, 'url')} className="p-2 min-h-0 h-auto rounded">
                  {copied === 'url' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-24 flex-shrink-0">Email</span>
                <code className="flex-1 bg-muted/50 px-3 py-2 rounded text-sm font-mono">{ownerEmail}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(ownerEmail, 'email')} className="p-2 min-h-0 h-auto rounded">
                  {copied === 'email' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-24 flex-shrink-0">Password</span>
                <code className="flex-1 bg-muted/50 px-3 py-2 rounded text-sm font-mono">{formData.ownerPassword}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(formData.ownerPassword, 'pw')} className="p-2 min-h-0 h-auto rounded">
                  {copied === 'pw' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-24 flex-shrink-0">Join Code</span>
                <code className="flex-1 bg-muted/50 px-3 py-2 rounded text-sm font-mono tracking-widest">{joinCode}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(joinCode, 'code')} className="p-2 min-h-0 h-auto rounded">
                  {copied === 'code' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-300">
              ⚠ The join code lets employees self-register to this company. Share it only with authorised employees.
            </div>
          </div>

          {/* Company + Owner summary */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-3 text-sm">Company</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{success.company.name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">{success.company.onboardingStatus}</span></dd></div>
              </dl>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-3 text-sm">Owner</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{success.owner.firstName} {success.owner.lastName}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Role</dt><dd className="capitalize">{success.owner.role}</dd></div>
              </dl>
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
                setEmailSent(false);
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
                  <option value="Technology">Technology / IT / Software</option>
                  <option value="Finance">Banking / Finance / Insurance</option>
                  <option value="Healthcare">Healthcare / Pharma / Biotech</option>
                  <option value="Education">Education / EdTech</option>
                  <option value="Retail">Retail / E-commerce</option>
                  <option value="Manufacturing">Manufacturing / Industrial</option>
                  <option value="Consulting">Consulting / Professional Services</option>
                  <option value="Legal">Legal / Law</option>
                  <option value="Media">Media / Entertainment / Advertising</option>
                  <option value="Real Estate">Real Estate / Construction</option>
                  <option value="Logistics">Logistics / Supply Chain</option>
                  <option value="Hospitality">Hospitality / Travel / Tourism</option>
                  <option value="Telecom">Telecommunications</option>
                  <option value="Energy">Energy / Utilities / Oil & Gas</option>
                  <option value="Government">Government / Public Sector / NGO</option>
                  <option value="Agriculture">Agriculture / Food & Beverage</option>
                  <option value="Automotive">Automotive</option>
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
                  <option value="SG">Singapore</option>
                  <option value="AE">UAE</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="NL">Netherlands</option>
                  <option value="PH">Philippines</option>
                  <option value="MY">Malaysia</option>
                  <option value="NZ">New Zealand</option>
                  <option value="ZA">South Africa</option>
                  <option value="NG">Nigeria</option>
                  <option value="KE">Kenya</option>
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
                  <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
                  <option value="America/New_York">America/New_York (EST, UTC-5)</option>
                  <option value="America/Chicago">America/Chicago (CST, UTC-6)</option>
                  <option value="America/Denver">America/Denver (MST, UTC-7)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST, UTC-8)</option>
                  <option value="Europe/London">Europe/London (GMT, UTC+0)</option>
                  <option value="Europe/Berlin">Europe/Berlin (CET, UTC+1)</option>
                  <option value="Europe/Paris">Europe/Paris (CET, UTC+1)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST, UTC+4)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT, UTC+8)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST, UTC+9)</option>
                  <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur (MYT, UTC+8)</option>
                  <option value="Asia/Manila">Asia/Manila (PHT, UTC+8)</option>
                  <option value="Australia/Sydney">Australia/Sydney (AEST, UTC+10)</option>
                  <option value="Pacific/Auckland">Pacific/Auckland (NZST, UTC+12)</option>
                  <option value="Africa/Nairobi">Africa/Nairobi (EAT, UTC+3)</option>
                  <option value="Africa/Lagos">Africa/Lagos (WAT, UTC+1)</option>
                  <option value="Africa/Johannesburg">Africa/Johannesburg (SAST, UTC+2)</option>
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

