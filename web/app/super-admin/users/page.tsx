import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import Link from 'next/link';

/**
 * Super Admin - Users List
 * 
 * Shows all users invited by the super admin.
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-slate-400 mt-1">Manage platform users and invitations</p>
        </div>
        <Link
          href="/super-admin/users/new"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Create User
        </Link>
      </div>

      {/* Pending Invites */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Pending Invitations</h2>
        {invites.filter(i => i.status === 'pending').length === 0 ? (
          <p className="text-slate-400 text-center py-4">No pending invitations</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Expires</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites
                  .filter(i => i.status === 'pending')
                  .map((invite) => (
                    <tr key={invite.id} className="border-b border-slate-700/50">
                      <td className="py-4 text-white">{invite.email}</td>
                      <td className="py-4">
                        <span className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 rounded">
                          {invite.role}
                        </span>
                      </td>
                      <td className="py-4 text-slate-400">
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          <button className="text-sm text-blue-400 hover:text-blue-300">
                            Resend
                          </button>
                          <button className="text-sm text-red-400 hover:text-red-300">
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
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Active Users</h2>
        {employees.length === 0 ? (
          <p className="text-slate-400 text-center py-4">No users have accepted their invitations yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Company</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-700/50">
                    <td className="py-4 text-white">
                      {emp.first_name} {emp.last_name}
                    </td>
                    <td className="py-4 text-slate-300">{emp.email}</td>
                    <td className="py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 rounded">
                        {emp.primary_role}
                      </span>
                    </td>
                    <td className="py-4 text-slate-300">
                      {emp.company?.name || '—'}
                    </td>
                    <td className="py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          emp.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <Link
                        href={`/super-admin/users/${emp.id}`}
                        className="text-sm text-purple-400 hover:text-purple-300"
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
