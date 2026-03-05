import Link from 'next/link';
import { SidebarNav } from '@/components/sidebar-nav';
import { SignOutButton } from '@/components/sign-out-button';
import { NotificationBell } from '@/components/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';

const HR_NAV_ITEMS = [
  { label: 'Dashboard', href: '/hr/dashboard', icon: '📊' },
  { label: 'Employees', href: '/hr/employees', icon: '👥' },
  { label: 'Leave Requests', href: '/hr/leave-requests', icon: '📋' },
  { label: 'Approvals', href: '/hr/approvals', icon: '✅' },
  { label: 'Attendance', href: '/hr/attendance', icon: '🕐' },
  { label: 'Payroll', href: '/hr/payroll', icon: '💰' },
  { label: 'Policy Settings', href: '/hr/policy-settings', icon: '⚙️' },
  { label: 'Reports', href: '/hr/reports', icon: '📈' },
  { label: 'Organization', href: '/hr/organization', icon: '🏢' },
  { label: 'Settings', href: '/hr/settings', icon: '🔧' },
];

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <Link href="/hr/dashboard">
              <h1 className="text-xl font-bold text-primary">Continuum</h1>
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">HR Portal</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
        <SidebarNav items={HR_NAV_ITEMS} />
        <div className="px-4 py-3 border-t border-border space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center text-sm font-medium text-green-600 dark:text-green-400">
              👤
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">My Account</p>
              <p className="text-xs text-muted-foreground">HR Admin</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>
      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
