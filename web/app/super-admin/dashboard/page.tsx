import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Building2, Users, Mail, UserPlus, Send, ClipboardList, Settings, ArrowRight } from 'lucide-react';

/**
 * Super Admin Dashboard
 * Clean enterprise design with platform statistics
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
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Welcome back, {user.firstName}</h1>
          <p className="text-muted-foreground mt-1">Platform overview and quick actions</p>
        </div>
        <Link
          href="/super-admin/users/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Create User
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Companies"
          value={totalCompanies}
          icon={Building2}
          variant="primary"
        />
        <StatCard
          label="Total Users"
          value={totalEmployees}
          icon={Users}
          variant="success"
        />
        <StatCard
          label="Pending Invites"
          value={activeInvites}
          icon={Mail}
          variant="warning"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickActionButton
            href="/super-admin/users/new"
            label="Create User"
            icon={UserPlus}
          />
          <QuickActionButton
            href="/super-admin/users"
            label="View Users"
            icon={Users}
          />
          <QuickActionButton
            href="/super-admin/companies"
            label="Companies"
            icon={Building2}
          />
          <QuickActionButton
            href="/super-admin/settings"
            label="Settings"
            icon={Settings}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Companies */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Recent Companies</h2>
            <Link href="/super-admin/companies" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {recentCompanies.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No companies yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCompanies.map((company) => (
                <Link
                  key={company.id}
                  href={`/super-admin/companies/${company.id}`}
                  className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{company.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {company._count.employees} employees
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Getting Started Guide */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">🎓 Getting Started</h2>
          <p className="text-sm text-muted-foreground mb-4">
            As a Super Admin, you create company administrators who then set up their own companies.
          </p>
          <ol className="space-y-3">
            <StepItem number={1} text="Create a user with Company Owner or Admin role" />
            <StepItem number={2} text="Send them an invitation to set up their password" />
            <StepItem number={3} text="They create their company and configure it" />
            <StepItem number={4} text="They invite HR and employees to their company" />
          </ol>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}) {
  const variantStyles = {
    default: 'border-border',
    primary: 'border-primary/20 bg-primary/5',
    success: 'border-green-500/20 bg-green-500/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
  };

  const iconStyles = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };

  return (
    <div className={`bg-card border rounded-xl p-4 ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${iconStyles[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function QuickActionButton({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

function StepItem({ number, text }: { number: number; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
        {number}
      </span>
      <span className="text-sm text-muted-foreground">{text}</span>
    </li>
  );
}
