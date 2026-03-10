'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarNav } from '@/components/sidebar-nav';
import { SignOutButton } from '@/components/sign-out-button';
import { PortalSwitcher } from '@/components/portal-switcher';
import { NotificationBell } from '@/components/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  LayoutDashboard,
  FilePlus,
  CalendarDays,
  Clock,
  FolderOpen,
  User,
  Settings,
  Menu,
  X,
  Search,
  Banknote,
  Receipt,
} from 'lucide-react';

const EMPLOYEE_NAV_ITEMS = [
  { label: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
  { label: 'Request Leave', href: '/employee/request-leave', icon: FilePlus },
  { label: 'Leave History', href: '/employee/leave-history', icon: CalendarDays },
  { label: 'Attendance', href: '/employee/attendance', icon: Clock },
  { label: 'Documents', href: '/employee/documents', icon: FolderOpen },
  { label: 'Payslips', href: '/employee/payslips', icon: Banknote },
  { label: 'Reimbursements', href: '/employee/reimbursements', icon: Receipt },
  { label: 'Profile', href: '/employee/profile', icon: User },
  { label: 'Settings', href: '/employee/settings', icon: Settings },
];

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [companyName, setCompanyName] = useState('Continuum');
  const [authChecked, setAuthChecked] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => {
        if (!res.ok) {
          router.replace('/sign-in');
          return;
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        // Allow any authenticated user to access employee portal (middleware enforces role)
        if (data.company?.name) {
          setCompanyName(data.company.name);
        }
        if (data.first_name) {
          setUserName(data.first_name);
        }
        setAuthChecked(true);
      })
      .catch(() => {
        router.replace('/sign-in');
      });
  }, [router]);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 1024;
      setIsMobile(isMobileView);
      if (!isMobileView) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card/80 backdrop-blur-xl border-b border-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/employee/dashboard">
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">{companyName}</span>
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
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
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
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={`
              ${isMobile
                ? 'fixed left-0 top-0 bottom-0 z-50 w-[280px] shadow-2xl'
                : 'relative w-[260px] shrink-0'
              }
              bg-card dark:bg-[#0c1021] border-r border-border/50 dark:border-slate-800/40 flex flex-col
            `}
          >
            {/* Sidebar header */}
            <div className="h-14 px-5 flex items-center justify-between border-b border-border/50 dark:border-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{companyName[0]}</span>
                </div>
                <div>
                  <Link href="/employee/dashboard" onClick={closeSidebar}>
                    <h1 className="text-sm font-semibold text-foreground leading-tight">{companyName}</h1>
                  </Link>
                  <p className="text-[11px] text-muted-foreground leading-tight">Employee Portal</p>
                </div>
              </div>
              {isMobile && (
                <button
                  onClick={closeSidebar}
                  className="p-1.5 hover:bg-muted dark:hover:bg-slate-800 rounded-lg transition-colors lg:hidden"
                  aria-label="Close navigation menu"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search bar */}
            <div className="px-3 py-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 dark:bg-slate-800/50 border border-transparent focus-within:border-primary/30 transition-colors">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground w-full outline-none"
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto">
              <SidebarNav items={EMPLOYEE_NAV_ITEMS} onItemClick={closeSidebar} />
            </div>

            {/* Footer section */}
            <div className="px-3 py-3 border-t border-border/50 dark:border-slate-800/40 space-y-2">
              <div className="hidden lg:flex items-center justify-between px-1 mb-2">
                <ThemeToggle />
                <NotificationBell />
              </div>
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/5 dark:from-blue-500/20 dark:to-blue-500/5 rounded-full flex items-center justify-center text-xs font-semibold text-primary dark:text-blue-400">
                  {userName ? userName[0]?.toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{userName || 'My Account'}</p>
                  <p className="text-[11px] text-muted-foreground">Employee</p>
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
        ${isMobile ? 'pt-14' : ''}
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
