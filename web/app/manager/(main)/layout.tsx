import Link from 'next/link';
import { SidebarNav } from '@/components/sidebar-nav';
import { SignOutButton } from '@/components/sign-out-button';
import { NotificationBell } from '@/components/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';

const MANAGER_NAV_ITEMS = [
  { label: 'Dashboard', href: '/manager/dashboard', icon: '📊' },
  { label: 'Approvals', href: '/manager/approvals', icon: '✅' },
  { label: 'Team Attendance', href: '/manager/team-attendance', icon: '🕐' },
  { label: 'Team', href: '/manager/team', icon: '👥' },
  { label: 'Reports', href: '/manager/reports', icon: '📈' },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <Link href="/manager/dashboard">
              <h1 className="text-xl font-bold text-primary">Continuum</h1>
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">Manager Portal</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
        <SidebarNav items={MANAGER_NAV_ITEMS} />
        <div className="px-4 py-3 border-t border-border space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-500/20 rounded-full flex items-center justify-center text-sm font-medium text-purple-600 dark:text-purple-400">
              👤
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">My Account</p>
              <p className="text-xs text-muted-foreground">Manager</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
