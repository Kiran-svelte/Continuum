import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import Link from 'next/link';

/**
 * Super Admin Dashboard
 * 
 * Shows platform-wide statistics and quick actions.
 */
export default async function SuperAdminDashboard() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== 'super_admin') {
    redirect('/admin/login');
  }

  // Fetch platform statistics
  const [
    totalCompanies,
    totalEmployees,
    activeInvites,
    recentCompanies,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.employee.count(),
    prisma.userInvite.count({
      where: {
        status: 'pending',
        expires_at: { gt: new Date() },
      },
    }),
    prisma.company.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        created_at: true,
        _count: { select: { employees: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome back, {user.firstName}</h1>
        <p className="text-slate-400 mt-1">Platform overview and quick actions</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Companies"
          value={totalCompanies}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          title="Total Users"
          value={totalEmployees}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          color="green"
        />
        <StatCard
          title="Pending Invites"
          value={activeInvites}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            href="/super-admin/users/new"
            label="Create User"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            }
          />
          <QuickActionButton
            href="/super-admin/invites/new"
            label="Send Invite"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            }
          />
          <QuickActionButton
            href="/super-admin/companies"
            label="View Companies"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <QuickActionButton
            href="/super-admin/settings"
            label="Settings"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Recent Companies */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Companies</h2>
        {recentCompanies.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No companies yet. Create a user to get started.</p>
        ) : (
          <div className="space-y-3">
            {recentCompanies.map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg"
              >
                <div>
                  <h3 className="font-medium text-white">{company.name}</h3>
                  <p className="text-sm text-slate-400">
                    {company._count.employees} employees • Created{' '}
                    {new Date(company.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/super-admin/companies/${company.id}`}
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tutorial Card */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-6 border border-purple-500/30">
        <h2 className="text-lg font-semibold text-white mb-2">🎓 Getting Started</h2>
        <p className="text-slate-300 mb-4">
          As a Super Admin, you can create company administrators who will then set up their own companies.
          Here's the recommended flow:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-slate-300">
          <li>Create a user with the <strong>Company Owner</strong> or <strong>Admin</strong> role</li>
          <li>Send them an invitation to set up their password</li>
          <li>They will create their company and configure it</li>
          <li>They can then invite HR and employees to their company</li>
        </ol>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple';
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className={`rounded-xl p-6 border ${colors[color]}`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white"
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
