'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AmbientBackground } from '@/components/motion';
import { SidebarNav } from '@/components/sidebar-nav';
import { SignOutButton } from '@/components/sign-out-button';
import { PortalSwitcher } from '@/components/portal-switcher';
import { NotificationBell } from '@/components/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';
import { useUnreadCount } from '@/lib/use-unread-count';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CheckSquare,
  Clock,
  Wallet,
  SlidersHorizontal,
  BarChart3,
  Building2,
  Settings,
  Shield,
  Menu,
  X,
  Search,
  CalendarDays,
  Banknote,
  AlertTriangle,
  Receipt,
  ArrowRightLeft,
  IndianRupee,
  Timer,
  ListChecks,
  GitBranch,
  Layers,
  Bell,
  Loader,
} from 'lucide-react';

const HR_NAV_ITEMS = [
  { label: 'Dashboard', href: '/hr/dashboard', icon: LayoutDashboard },
  { label: 'Employees', href: '/hr/employees', icon: Users },
  { label: 'Leave Requests', href: '/hr/leave-requests', icon: ClipboardList },
  { label: 'Leave Encashment', href: '/hr/leave-encashment', icon: Banknote },
  { label: 'Escalation', href: '/hr/escalation', icon: AlertTriangle },
  { label: 'Approvals', href: '/hr/approvals', icon: CheckSquare },
  { label: 'Attendance', href: '/hr/attendance', icon: Clock },
  { label: 'Payroll', href: '/hr/payroll', icon: Wallet },
  { label: 'Salary Structures', href: '/hr/salary-structures', icon: IndianRupee },
  { label: 'Reimbursements', href: '/hr/reimbursements', icon: Receipt },
  { label: 'Employee Movements', href: '/hr/employee-movements', icon: ArrowRightLeft },
  { label: 'Shifts', href: '/hr/shifts', icon: Timer },
  { label: 'Exit Checklist', href: '/hr/exit-checklist', icon: ListChecks },
  { label: 'Approval Config', href: '/hr/approval-config', icon: GitBranch },
  { label: 'Salary Components', href: '/hr/salary-components', icon: Layers },
  { label: 'Policy Settings', href: '/hr/policy-settings', icon: SlidersHorizontal },
  { label: 'Holidays', href: '/hr/holidays', icon: CalendarDays },
  { label: 'Reports', href: '/hr/reports', icon: BarChart3 },
  { label: 'Organization', href: '/hr/organization', icon: Building2 },
  { label: 'Notifications', href: '/hr/notifications', icon: Bell },
  { label: 'Settings', href: '/hr/settings', icon: Settings },
  { label: 'Audit Logs', href: '/hr/audit-logs', icon: Shield },
];

function AuthLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      <div className="text-center space-y-4">
        <Loader className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
        <p className="text-lg text-slate-300 font-medium">Authenticating...</p>
        <p className="text-sm text-slate-500">Loading HR Portal.</p>
      </div>
    </div>
  );
}

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [companyName, setCompanyName] = useState('Continuum');
  const [authChecked, setAuthChecked] = useState(false);
  const [userName, setUserName] = useState('');
  const unreadCount = useUnreadCount();

  const navItems = HR_NAV_ITEMS.map((item) =>
    item.label === 'Notifications' && unreadCount > 0
      ? { ...item, badge: unreadCount }
      : item
  );

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        if (data.company?.name) setCompanyName(data.company.name);
        if (data.first_name) setUserName(data.first_name);
        setAuthChecked(true);
      })
      .catch(() => router.replace('/sign-in'));
  }, [router]);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 1024;
      setIsMobile(isMobileView);
      if (!isMobileView) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const closeSidebar = () => {
    if (isMobile) setSidebarOpen(false);
  };

  if (!authChecked) {
    return <AuthLoader />;
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <AmbientBackground />

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 glass-panel-navbar px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors" aria-label="Open menu">
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/hr/dashboard">
            <span className="text-xl font-bold text-shadow-md bg-gradient-to-r from-emerald-300 to-green-400 bg-clip-text text-transparent">{companyName}</span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[59] lg:hidden"
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(!isMobile || sidebarOpen) && (
          <motion.aside
            initial={isMobile ? { x: '-100%' } : false}
            animate={{ x: 0 }}
            exit={isMobile ? { x: '-100%' } : undefined}
            transition={{ type: "spring", damping: 30, stiffness: 250 }}
            className={`fixed left-0 top-0 bottom-0 z-[60] w-[280px] lg:relative lg:w-[260px] lg:shrink-0 glass-panel flex flex-col border-r border-slate-700/50`}
          >
            {/* Sidebar Header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-700/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg font-bold">{companyName[0]}</span>
                </div>
                <div>
                  <Link href="/hr/dashboard" onClick={closeSidebar}>
                    <h1 className="text-base font-bold text-white leading-tight">{companyName}</h1>
                  </Link>
                  <p className="text-xs text-slate-400 leading-tight">HR Portal</p>
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-1">
                <NotificationBell />
                <ThemeToggle />
              </div>
              {isMobile && (
                <button onClick={closeSidebar} className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors" aria-label="Close menu">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Search */}
            <div className="p-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 focus-within:border-emerald-400/70 focus-within:ring-2 focus-within:ring-emerald-400/20 transition-all">
                <Search className="w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search..." className="bg-transparent text-sm w-full outline-none" />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent pr-1">
              <SidebarNav items={navItems} onItemClick={closeSidebar} />
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-700/50 shrink-0 space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400/20 to-green-600/20 flex items-center justify-center font-bold text-emerald-300">
                  {userName ? userName[0]?.toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{userName || 'My Account'}</p>
                  <p className="text-xs text-slate-400">HR Admin</p>
                </div>
              </div>
              <Suspense>
                <PortalSwitcher />
              </Suspense>
              <SignOutButton />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-16">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
