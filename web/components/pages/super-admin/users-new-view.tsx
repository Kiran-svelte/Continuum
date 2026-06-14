'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { fetchWithTimeout, mapFetchErrorMessage } from '@/lib/fetch-with-timeout';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Create New User Form (Super Admin)
 * 
 * Creates a new company owner/admin user and sends them an invitation.
 * Updated with clean, professional design system.
 */
export default function UsersNewView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  type CreateUserSuccess = {
    success: true;
    email?: {
      attempted: boolean;
      sent: boolean;
      error?: string;
    };
    warning?: string;
    tempPassword?: string;
  };

  const [success, setSuccess] = useState<CreateUserSuccess | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'admin',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetchWithTimeout('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      }, REQUEST_TIMEOUT_MS);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'Failed to create user');
        setLoading(false);
        return;
      }

      setSuccess({
        success: true,
        email: data.email,
        warning: data.warning,
        tempPassword: data.tempPassword,
      });
    } catch (submitError) {
      setError(mapFetchErrorMessage(submitError, 'Unable to create user right now. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const emailAttempted = success.email?.attempted ?? false;
    const emailSent = success.email?.sent ?? false;
    const deliveryStatusText = !emailAttempted
      ? 'Invite created. Email delivery is currently disabled.'
      : emailSent
        ? 'Invite created and email sent successfully.'
        : 'Invite created, but email could not be sent right now.';

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground mb-2">User Created Successfully</h2>
              <p className="text-muted mb-6">
                {deliveryStatusText}
              </p>

              <div className="space-y-4 bg-surface-alt rounded-lg p-4">
                <div className="text-sm text-foreground">
                  <span className="font-medium">Delivery Status:</span>{' '}
                  <span className={emailAttempted && !emailSent ? 'text-warning' : 'text-success'}>
                    {emailSent ? 'Email Sent' : 'Invite Created'}
                  </span>
                </div>

                {success.warning && (
                  <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
                    {success.warning}
                  </div>
                )}

                {emailAttempted && !emailSent && success.email?.error && (
                  <div className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
                    Delivery error: {success.email.error}
                  </div>
                )}

                {success.tempPassword && (
                  <div>
                    <label className="input-label flex items-center gap-1">
                      Temporary Password 
                      <span className="text-warning text-xs">(Development Only)</span>
                    </label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="text"
                        readOnly
                        value={success.tempPassword}
                        title="Temporary password"
                        className="input flex-1 text-sm font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted mt-4">
                The user can complete account setup from the invitation email. If delivery failed, resend the invitation from the users list.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-border">
            <Button
              onClick={() => {
                setSuccess(null);
                setFormData({ email: '', firstName: '', lastName: '', role: 'admin' });
              }}
              className="btn-secondary"
            >
              Create Another
            </Button>
            <Link
              href="/super-admin/users"
              className="btn-primary"
            >
              View All Users
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link 
          href="/super-admin/users" 
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Create New User</h1>
        <p className="text-muted mt-1">Create a company owner or admin user</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {error && (
          <div className="p-4 bg-error/5 border border-error/20 rounded-lg text-error flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="input-label">First Name</label>
            <Input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="input"
              placeholder="John"
            />
          </div>
          <div>
            <label className="input-label">Last Name</label>
            <Input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="input"
              placeholder="Doe"
            />
          </div>
        </div>

        <div>
          <label className="input-label">Email Address</label>
          <Input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="input"
            placeholder="john@company.com"
          />
        </div>

        <div>
          <label className="input-label">Role</label>
          <Select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            title="User role"
            className="input"
          >
            <option value="admin">Company Admin (Full Access)</option>
            <option value="hr">HR Manager</option>
            <option value="director">Director</option>
            <option value="manager">Manager</option>
          </Select>
          <p className="mt-2 text-sm text-muted">
            {formData.role === 'admin' && 'Company admin will have full control to create their company and manage all aspects.'}
            {formData.role === 'hr' && 'HR Manager will be able to manage employees, leaves, and policies.'}
            {formData.role === 'director' && 'Director will have oversight of their department.'}
            {formData.role === 'manager' && 'Manager will be able to manage their team.'}
          </p>
        </div>

        <div className="bg-surface-alt rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            What happens next?
          </h3>
          <ul className="text-sm text-muted space-y-1">
            <li>• An invitation will be sent to the user&apos;s email</li>
            <li>• They will set their password and complete account setup</li>
            <li>• If Admin role: They can then create their company</li>
            <li>• They can invite their own HR and employees</li>
          </ul>
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/super-admin/users"
            className="btn-secondary"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create User & Send Invite
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
