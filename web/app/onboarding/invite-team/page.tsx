'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Mail, UserPlus, CheckCircle, AlertCircle, Loader2, ArrowRight, Copy, Lightbulb } from 'lucide-react';

interface InvitedUser {
  email: string;
  role: string;
  inviteUrl: string;
  tempPassword?: string;
}

/**
 * Invite Team Page
 * 
 * Allows company admins to invite their first team members (HR, managers).
 * Updated with clean, professional design system.
 */
export default function InviteTeamPage() {
  const router = useRouter();
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'hr',
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/company/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send invite');
        setLoading(false);
        return;
      }

      // Add to invited list
      setInvitedUsers([
        ...invitedUsers,
        {
          email: formData.email,
          role: formData.role,
          inviteUrl: data.inviteUrl,
          tempPassword: data.tempPassword,
        },
      ]);

      // Reset form
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        role: 'hr',
      });
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/admin/dashboard');
  };

  const handleComplete = () => {
    router.push('/admin/dashboard');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-8">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Invite Your Team</h1>
          <p className="text-muted mt-1">
            Invite HR managers and team leads to help you manage your company
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Invite Form */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-primary" />
              </div>
              Send Invitation
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-error/5 border border-error/20 rounded-lg text-error text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">First Name</label>
                  <input
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
                  <input
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
                <input
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
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="input"
                >
                  <option value="hr">HR Manager</option>
                  <option value="director">Director</option>
                  <option value="manager">Manager</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="employee">Employee</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Invitation
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Invited Users */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
              <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-success" />
              </div>
              Invited ({invitedUsers.length})
            </h2>

            {invitedUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8 text-muted" />
                </div>
                <p className="text-muted">No invitations sent yet</p>
                <p className="text-muted text-sm mt-1">
                  Start by inviting your HR or key team members
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {invitedUsers.map((user, index) => (
                  <div
                    key={index}
                    className="p-4 bg-surface-alt rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-foreground font-medium">{user.email}</span>
                      <span className="status-badge status-pending capitalize">
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <input
                        type="text"
                        readOnly
                        value={user.inviteUrl}
                        className="flex-1 bg-background text-muted px-2 py-1 rounded border border-border text-xs"
                      />
                      <button
                        onClick={() => copyToClipboard(user.inviteUrl)}
                        className="p-1.5 hover:bg-hover rounded"
                        title="Copy invite link"
                      >
                        <Copy className="w-4 h-4 text-muted" />
                      </button>
                    </div>
                    {user.tempPassword && (
                      <div className="mt-2 text-xs text-muted flex items-center gap-1">
                        Temp password: 
                        <code className="bg-background px-1.5 py-0.5 rounded border border-border font-mono">
                          {user.tempPassword}
                        </code>
                        <button
                          onClick={() => copyToClipboard(user.tempPassword!)}
                          className="p-1 hover:bg-hover rounded"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handleSkip}
            className="text-muted hover:text-foreground transition-colors text-sm"
          >
            Skip for now
          </button>
          <button
            onClick={handleComplete}
            className="btn-primary flex items-center gap-2"
          >
            Continue to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Help */}
        <div className="mt-8 card p-4">
          <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-warning" />
            Quick Tips
          </h3>
          <ul className="text-sm text-muted space-y-1">
            <li>• <strong className="text-foreground-secondary">HR Manager</strong>: Can manage employees, leaves, payroll, and policies</li>
            <li>• <strong className="text-foreground-secondary">Manager</strong>: Can approve leaves and manage their team</li>
            <li>• <strong className="text-foreground-secondary">Employee</strong>: Can apply for leaves and view their records</li>
            <li>• You can invite more users later from the HR dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
