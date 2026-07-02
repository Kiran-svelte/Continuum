'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { TOTAL_ONBOARDING_STEPS } from '@/lib/onboarding-step-contract';
import {
  Building2,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Mail,
  Copy,
  Trash2,
  RefreshCw,
  Settings,
  ChevronRight,
  FileText,
  Shield,
  Activity,
} from 'lucide-react';

const ONBOARDING_STEP_LABELS = [
  'Company',
  'Roles',
  'Leaves',
  'Quotas',
  'Attendance',
  'Holidays',
  'AI Rules',
  'Payroll',
  'Notifications',
  'Complete',
];

interface CompanyDetail {
  id: string;
  name: string;
  legalName: string | null;
  industry: string | null;
  size: string | null;
  countryCode: string;
  timezone: string;
  joinCode: string | null;
  domain: string | null;
  logoUrl: string | null;
  onboardingStatus: string;
  onboardingStep: number;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalEmployees: number;
    totalLeaveRequests: number;
    totalAttendances: number;
    pendingRequests: number;
    activeUsers: number;
  };
  owner: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    lastLoginAt: string | null;
  } | null;
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    actor: { email: string; name: string } | null;
  }>;
}

export default function CompaniesIdView() {
  const router = useRouter();
  const params = useParams();
  const companyId = typeof params?.id === 'string'
    ? params.id
    : Array.isArray(params?.id)
      ? (params.id[0] ?? '')
      : '';

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const fetchCompanyDetails = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/super-admin/companies/${companyId}`, { credentials: 'include' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch company details');
      }

      setCompany(data.company);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to fetch company details');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchCompanyDetails();
    }
  }, [companyId, fetchCompanyDetails]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const resendOwnerCredentials = async () => {
    if (!company?.owner) return;
    
    setActionLoading('resend');
    try {
      const response = await fetch(`/api/super-admin/companies/${companyId}/resend-credentials`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend credentials');
      }

      if (data.email?.sent) {
        alert('Credentials regenerated and emailed successfully');
      } else if (data.credentials?.temporaryPassword) {
        alert(
          `Credentials regenerated, but email delivery failed.\n\nEmail: ${data.credentials.email}\nTemporary password: ${data.credentials.temporaryPassword}\nLogin URL: ${data.credentials.loginUrl}\n\nShare this through an approved secure channel.`
        );
      } else {
        alert(data.message || 'Credentials regenerated, but email delivery status is unknown');
      }
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Failed to resend credentials');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteCompany = async () => {
    if (!company) return;
    const confirmed = window.confirm(`Delete ${company.name}? This action cannot be undone.`);
    if (!confirmed) return;

    setActionLoading('delete');
    try {
      const response = await fetch(`/api/super-admin/companies/${companyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to delete company');
      }

      router.push('/super-admin/companies');
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Failed to delete company');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 ',
      in_progress: 'bg-blue-100 text-blue-800 ',
      completed: 'bg-green-100 text-green-800 ',
      active: 'bg-green-100 text-green-800 ',
      onboarding: 'bg-yellow-100 text-yellow-800 ',
      trial: 'bg-purple-100 text-purple-800 ',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getOnboardingProgress = () => {
    if (!company) return 0;
    return Math.round((company.onboardingStep / TOTAL_ONBOARDING_STEPS) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/super-admin/companies"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Companies
          </Link>
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-6 py-4 rounded-lg">
            <p className="font-medium">Error loading company</p>
            <p className="text-sm mt-1">{error || 'Company not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href="/super-admin/companies"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Companies
        </Link>

        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                {company.logoUrl ? (
                  <Image
                    src={company.logoUrl}
                    alt={company.name}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-lg object-cover"
                    unoptimized
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-primary" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{company.name}</h1>
                {company.legalName && company.legalName !== company.name && (
                  <p className="text-sm text-muted-foreground">{company.legalName}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {getStatusBadge(company.onboardingStatus)}
                  {company.industry && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {company.industry}
                    </span>
                  )}
                  {company.size && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {company.size} employees
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => router.push(`/super-admin/companies/${companyId}/core-functions`)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                variant="outline"
              >
                Core functions
              </Button>
              <Button
                onClick={() => router.push(`/super-admin/companies/${companyId}/settings`)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                variant="outline"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">Employees</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{company.stats.totalEmployees}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-xs">Active</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{company.stats.activeUsers}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Leave Requests</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{company.stats.totalLeaveRequests}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Pending</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{company.stats.pendingRequests}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">Attendances</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{company.stats.totalAttendances}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Onboarding Progress */}
            {!company.onboardingCompleted && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Onboarding Progress</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Step {company.onboardingStep} of {TOTAL_ONBOARDING_STEPS}</span>
                    <span className="font-medium text-foreground">{getOnboardingProgress()}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${getOnboardingProgress()}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-1 mt-4">
                    {ONBOARDING_STEP_LABELS.map((step, i) => (
                      <div
                        key={step}
                        className={`text-center p-2 rounded text-xs ${
                          i < company.onboardingStep
                            ? 'bg-green-100 text-green-800 '
                            : i === company.onboardingStep
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Company Owner */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Company Owner</h2>
                {company.owner && (
                  <Button
                    onClick={resendOwnerCredentials}
                    disabled={actionLoading === 'resend'}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 disabled:opacity-50"
                    variant="ghost"
                    size="sm"
                  >
                    {actionLoading === 'resend' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    Resend Credentials
                  </Button>
                )}
              </div>
              {company.owner ? (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-medium">
                      {company.owner.firstName[0]}{company.owner.lastName[0]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {company.owner.firstName} {company.owner.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{company.owner.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(company.owner.status)}
                      <span className="text-xs text-muted-foreground capitalize">
                        {company.owner.role}
                      </span>
                    </div>
                    {company.owner.lastLoginAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last login: {new Date(company.owner.lastLoginAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No owner assigned</p>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
              {company.recentActivity && company.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {company.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{activity.action}</span>
                          {' on '}
                          <span className="text-muted-foreground">{activity.entityType}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.actor ? `${activity.actor.name} • ` : ''}
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No recent activity</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Company Info</h2>
              <dl className="space-y-3">
                {company.joinCode && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wider">Join Code</dt>
                    <dd className="flex items-center gap-2 mt-1">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{company.joinCode}</code>
                      <Button
                        onClick={() => copyToClipboard(company.joinCode!)}
                        className="p-1 hover:bg-muted rounded"
                        title="Copy join code"
                        variant="ghost"
                        size="sm"
                      >
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      {copySuccess && (
                        <span className="text-xs text-green-600">Copied!</span>
                      )}
                    </dd>
                  </div>
                )}
                {company.domain && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wider">Domain</dt>
                    <dd className="text-sm text-foreground mt-1">{company.domain}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wider">Country</dt>
                  <dd className="text-sm text-foreground mt-1">{company.countryCode}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wider">Timezone</dt>
                  <dd className="text-sm text-foreground mt-1">{company.timezone}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wider">Created</dt>
                  <dd className="text-sm text-foreground mt-1">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Subscription */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Subscription</h2>
              {company.subscription ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Plan</span>
                    <span className="font-medium text-foreground capitalize">{company.subscription.plan}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {getStatusBadge(company.subscription.status)}
                  </div>
                  {company.subscription.currentPeriodEnd && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Renews</span>
                      <span className="text-sm text-foreground">
                        {new Date(company.subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No active subscription</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Billing management is not enabled for super-admin yet.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={() => router.push(`/super-admin/users?companyId=${companyId}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
                  variant="ghost"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    View All Employees
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  type="button"
                  onClick={() => router.push(`/admin/audit-logs?companyId=${companyId}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
                  variant="ghost"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    View Audit Logs
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  type="button"
                  onClick={deleteCompany}
                  disabled={actionLoading === 'delete'}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left text-destructive disabled:opacity-60"
                  variant="ghost"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Trash2 className="w-4 h-4" />
                    {actionLoading === 'delete' ? 'Deleting Company...' : 'Delete Company'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

