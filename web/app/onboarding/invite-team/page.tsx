'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Mail, UserPlus, CheckCircle, AlertCircle, Loader2, ArrowRight, Copy } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto pt-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Invite Your Team</h1>
          <p className="text-slate-400 mt-2">
            Invite HR managers and team leads to help you manage your company
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Invite Form */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-400" />
              Send Invitation
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Invited ({invitedUsers.length})
            </h2>

            {invitedUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No invitations sent yet</p>
                <p className="text-slate-500 text-sm mt-1">
                  Start by inviting your HR or key team members
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {invitedUsers.map((user, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{user.email}</span>
                      <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded capitalize">
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <input
                        type="text"
                        readOnly
                        value={user.inviteUrl}
                        className="flex-1 bg-slate-800 text-slate-400 px-2 py-1 rounded"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(user.inviteUrl)}
                        className="p-1 hover:bg-slate-600 rounded"
                        title="Copy invite link"
                      >
                        <Copy className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                    {user.tempPassword && (
                      <div className="mt-2 text-xs text-slate-500">
                        Temp password: <code className="bg-slate-800 px-1 rounded">{user.tempPassword}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handleSkip}
            className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleComplete}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            Continue to Dashboard
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Help */}
        <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <h3 className="font-medium text-white mb-2">💡 Quick Tips</h3>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>• <strong>HR Manager</strong>: Can manage employees, leaves, payroll, and policies</li>
            <li>• <strong>Manager</strong>: Can approve leaves and manage their team</li>
            <li>• <strong>Employee</strong>: Can apply for leaves and view their records</li>
            <li>• You can invite more users later from the HR dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
