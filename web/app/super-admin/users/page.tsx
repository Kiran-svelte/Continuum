import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Users, Clock, CheckCircle } from 'lucide-react';

/**
 * Super Admin - Users List
 * 
 * Shows all users invited by the super admin.
 * Updated with clean, professional design system.
 */
export default async function SuperAdminUsersPage() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== 'super_admin') {
    redirect('/admin/login');
  }

  // Fetch all invites and employees created by super admin
  const [invites, employees] = await Promise.all([
    prisma.userInvite.findMany({
      where: { invited_by_super_id: { not: null } },
      orderBy: { created_at: 'desc' },
      include: {
        company: { select: { name: true } },
      },
    }),
    prisma.employee.findMany({
      where: { invited_by_type: 'super_admin' },
      orderBy: { created_at: 'desc' },
      include: {
        company: { select: { name: true } },
      },
    }),
  ]);

  const pendingInvites = invites.filter(i => i.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="text-muted mt-1">Manage platform users and invitations</p>
        </div>
        <Link
          href="/super-admin/users/new"
          className="btn-primary inline-flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Create User
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{pendingInvites.length}</p>
            <p className="text-sm text-muted">Pending Invites</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{employees.length}</p>
            <p className="text-sm text-muted">Active Users</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{invites.length}</p>
            <p className="text-sm text-muted">Total Invites</p>
          </div>
        </div>
      </div>

      {/* Pending Invites */}
      <div className="card">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Pending Invitations</h2>
        </div>
        {pendingInvites.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-muted" />
            </div>
            <p className="text-muted">No pending invitations</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-alt">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingInvites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-hover">
                    <td className="px-4 py-3 text-foreground">{invite.email}</td>
                    <td className="px-4 py-3">
                      <span className="status-badge status-pending">
                        {invite.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button className="text-sm text-primary hover:underline">
                          Resend
                        </button>
                        <button className="text-sm text-error hover:underline">
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Users */}
      <div className="card">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Active Users</h2>
        </div>
        {employees.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-muted" />
            </div>
            <p className="text-muted">No users have accepted their invitations yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-alt">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-hover">
                    <td className="px-4 py-3 text-foreground font-medium">
                      {emp.first_name} {emp.last_name}
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary">{emp.email}</td>
                    <td className="px-4 py-3">
                      <span className="status-badge status-pending">
                        {emp.primary_role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary">
                      {emp.company?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`status-badge ${
                          emp.status === 'active' ? 'status-approved' : 'status-pending'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/super-admin/users/${emp.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
