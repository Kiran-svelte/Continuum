'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Create New User Form (Super Admin)
 * 
 * Creates a new company owner/admin user and sends them an invitation.
 */
export default function CreateUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ 
    inviteUrl: string; 
    tempPassword?: string;
  } | null>(null);

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
      const response = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create user');
        setLoading(false);
        return;
      }

      setSuccess({
        inviteUrl: data.inviteUrl,
        tempPassword: data.tempPassword,
      });
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
          <h2 className="text-xl font-bold text-green-400 mb-4">✓ User Created Successfully</h2>
          
          <div className="space-y-4 text-slate-300">
            <p>The user has been created and an invitation has been generated.</p>
            
            <div className="bg-slate-800 rounded-lg p-4 space-y-3">
              <div>
                <label className="text-sm text-slate-400">Invite URL:</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={success.inviteUrl}
                    className="flex-1 bg-slate-700 text-white px-3 py-2 rounded text-sm"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(success.inviteUrl)}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {success.tempPassword && (
                <div>
                  <label className="text-sm text-slate-400">Temporary Password (Development Only):</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      readOnly
                      value={success.tempPassword}
                      className="flex-1 bg-slate-700 text-white px-3 py-2 rounded text-sm font-mono"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(success.tempPassword!)}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-sm text-slate-400">
              Share this link with the user. They will be able to set their password and complete their account setup.
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setSuccess(null);
                setFormData({ email: '', firstName: '', lastName: '', role: 'admin' });
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
            >
              Create Another
            </button>
            <Link
              href="/super-admin/users"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
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
      <div className="flex items-center justify-between">
        <div>
          <Link href="/super-admin/users" className="text-sm text-slate-400 hover:text-white mb-2 flex items-center gap-1">
            ← Back to Users
          </Link>
          <h1 className="text-2xl font-bold text-white">Create New User</h1>
          <p className="text-slate-400 mt-1">Create a company owner or admin user</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Doe"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="john@company.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Role
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="admin">Company Admin (Full Access)</option>
            <option value="hr">HR Manager</option>
            <option value="director">Director</option>
            <option value="manager">Manager</option>
          </select>
          <p className="mt-2 text-sm text-slate-400">
            {formData.role === 'admin' && 'Company admin will have full control to create their company and manage all aspects.'}
            {formData.role === 'hr' && 'HR Manager will be able to manage employees, leaves, and policies.'}
            {formData.role === 'director' && 'Director will have oversight of their department.'}
            {formData.role === 'manager' && 'Manager will be able to manage their team.'}
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4">
          <h3 className="font-medium text-white mb-2">What happens next?</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• An invitation will be sent to the user's email</li>
            <li>• They will set their password and complete account setup</li>
            <li>• If Admin role: They can then create their company</li>
            <li>• They can invite their own HR and employees</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Link
            href="/super-admin/users"
            className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </>
            ) : (
              'Create User & Send Invite'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
