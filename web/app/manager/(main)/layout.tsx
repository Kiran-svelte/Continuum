'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
  { label: 'Settings', href: '/manager/settings', icon: '⚙️' },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle mobile detection and sidebar auto-close
  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(isMobileView);
      
      // Auto-close sidebar on mobile when screen size changes
      if (!isMobileView) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when clicking outside on mobile
  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Open navigation menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/manager/dashboard">
            <h1 className="text-lg font-bold text-primary">Continuum</h1>
          </Link>
        </div>
        <div className="flex items-center gap-2">
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
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
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
                ? 'fixed left-0 top-0 bottom-0 z-50 w-80 shadow-xl' 
                : 'relative w-64'
              }
              bg-card border-r border-border flex flex-col
            `}
          >
            {/* Sidebar header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <Link href="/manager/dashboard" onClick={closeSidebar}>
                  <h1 className="text-xl font-bold text-primary">Continuum</h1>
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">Manager Portal</p>
              </div>
              {/* Desktop-only header buttons */}
              <div className="hidden lg:flex items-center gap-2">
                <ThemeToggle />
                <NotificationBell />
              </div>
              {/* Mobile close button */}
              {isMobile && (
                <button
                  onClick={closeSidebar}
                  className="p-2 hover:bg-muted rounded-lg transition-colors lg:hidden"
                  aria-label="Close navigation menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Enhanced SidebarNav with mobile click handler */}
            <div className="flex-1 overflow-y-auto">
              <SidebarNav items={MANAGER_NAV_ITEMS} onItemClick={closeSidebar} />
            </div>

            {/* Footer section */}
            <div className="px-4 py-3 border-t border-border space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">My Account</p>
                  <p className="text-xs text-muted-foreground">Manager</p>
                </div>
              </div>
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
