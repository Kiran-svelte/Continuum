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
  CalendarDays,
  CheckSquare,
  Clock,
  Users,
  Receipt,
  BarChart3,
  Settings,
  Menu,
  X,
  Search,
  Bell,
  Loader,
} from 'lucide-react';

const MANAGER_NAV_ITEMS = [
  { label: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
  { label: 'Team Calendar', href: '/manager/team-calendar', icon: CalendarDays },
  { label: 'Approvals', href: '/manager/approvals', icon: CheckSquare },
  { label: 'Team Attendance', href: '/manager/team-attendance', icon: Clock },
  { label: 'Team', href: '/manager/team', icon: Users },
  { label: 'Reimbursements', href: '/manager/reimbursements', icon: Receipt },
  { label: 'Reports', href: '/manager/reports', icon: BarChart3 },
  { label: 'Notifications', href: '/manager/notifications', icon: Bell },
  { label: 'Settings', href: '/manager/settings', icon: Settings },
];

function AuthLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      <div className="text-center space-y-4">
        <Loader className="w-10 h-10 text-sky-400 animate-spin mx-auto" />
        <p className="text-lg text-slate-300 font-medium">Authenticating...</p>
        <p className="text-sm text-slate-500">Loading your portal experience.</p>
      </div>
    </div>
  );
}

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [companyName, setCompanyName] = useState('Continuum');
  const [authChecked, setAuthChecked] = useState(false);
  const [userName, setUserName] = useState('');
  const unreadCount = useUnreadCount();

  const navItems = MANAGER_NAV_ITEMS.map((item) =>
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
          <Link href="/manager/dashboard">
            <span className="text-xl font-bold text-shadow-md bg-gradient-to-r from-sky-300 to-blue-400 bg-clip-text text-transparent">{companyName}</span>
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
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg font-bold">{companyName[0]}</span>
                </div>
                <div>
                  <Link href="/manager/dashboard" onClick={closeSidebar}>
                    <h1 className="text-base font-bold text-white leading-tight">{companyName}</h1>
                  </Link>
                  <p className="text-xs text-slate-400 leading-tight">Manager Portal</p>
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
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 focus-within:border-sky-400/70 focus-within:ring-2 focus-within:ring-sky-400/20 transition-all">
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
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400/20 to-blue-600/20 flex items-center justify-center font-bold text-sky-300">
                  {userName ? userName[0]?.toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{userName || 'My Account'}</p>
                  <p className="text-xs text-slate-400">Manager</p>
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
