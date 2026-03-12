'use client';

import { useState, useEffect } from 'react';
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
  ShieldCheck,
  Activity,
  Shield,
  Settings,
  Menu,
  X,
  Search,
  Bell,
  Building2,
  Loader,
} from 'lucide-react';

const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Employees', href: '/hr/employees', icon: Users },
  { label: 'RBAC & Permissions', href: '/admin/rbac', icon: ShieldCheck },
  { label: 'System Health', href: '/admin/system-health', icon: Activity },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: Shield },
  { label: 'Company Settings', href: '/admin/company-settings', icon: Building2 },
  { label: 'Settings', href: '/hr/settings', icon: Settings },
];

function AuthLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      <div className="text-center space-y-4">
        <Loader className="w-10 h-10 text-violet-400 animate-spin mx-auto" />
        <p className="text-lg text-slate-300 font-medium">Authenticating...</p>
        <p className="text-sm text-slate-500">Loading Admin Panel.</p>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [companyName, setCompanyName] = useState('Continuum');
  const [authChecked, setAuthChecked] = useState(false);
  const [userName, setUserName] = useState('');
  const unreadCount = useUnreadCount();

  const navItems = ADMIN_NAV_ITEMS.map((item) =>
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/admin/dashboard">
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-300 to-violet-400 bg-clip-text text-transparent">{companyName}</span>
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
            initial={isMobile ? { x: -320 } : false}
            animate={{ x: 0 }}
            exit={isMobile ? { x: -320 } : undefined}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`
              ${isMobile
                ? 'fixed left-0 top-0 bottom-0 z-[60] w-[280px]'
                : 'relative w-[260px] shrink-0'
              }
              bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col
              shadow-[4px_0_30px_rgba(0,0,0,0.3)]
            `}
          >
            {/* Sidebar header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                  <span className="text-white text-sm font-bold">{companyName[0]}</span>
                </div>
                <div>
                  <Link href="/admin/dashboard" onClick={closeSidebar}>
                    <h1 className="text-sm font-semibold text-white leading-tight">{companyName}</h1>
                  </Link>
                  <p className="text-[11px] text-white/50 leading-tight">Admin Panel</p>
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-1">
                <NotificationBell />
                <ThemeToggle />
              </div>
              {isMobile && (
                <button
                  onClick={closeSidebar}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors lg:hidden"
                  aria-label="Close navigation menu"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search bar */}
            <div className="px-3 py-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus-within:border-primary/30 focus-within:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] transition-all">
                <Search className="w-4 h-4 text-white/40 shrink-0" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent text-sm text-white placeholder:text-white/40 w-full outline-none"
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto">
              <SidebarNav items={navItems} onItemClick={closeSidebar} />
            </div>

            {/* Footer section */}
            <div className="px-3 py-3 border-t border-white/10 space-y-2 shrink-0">
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500/30 to-violet-500/20 rounded-full flex items-center justify-center text-xs font-semibold text-indigo-300 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                  {userName ? userName[0]?.toUpperCase() : 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{userName || 'My Account'}</p>
                  <p className="text-[11px] text-white/50">System Admin</p>
                </div>
              </div>
              <PortalSwitcher />
              <SignOutButton />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className={`
        flex-1 overflow-y-auto transition-all duration-300
        ${isMobile ? 'pt-16' : ''}
      `}>
        <div className={`
          p-4 sm:p-6 lg:p-8
          ${isMobile ? 'pb-8' : ''}
        `}>
          {children}
        </div>
      </main>
    </div>
  );
}
