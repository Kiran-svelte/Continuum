'use client';

import { useState, useEffect, Suspense, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SidebarNav, type NavItem } from '@/components/sidebar-nav';
import { SignOutButton } from '@/components/sign-out-button';
import { PortalSwitcher } from '@/components/portal-switcher';
import { NotificationBell } from '@/components/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';
import { useUnreadCount } from '@/lib/use-unread-count';
import { cn } from '@/lib/utils';
import {
  Menu,
  X,
  Search,
  Loader2,
  ChevronLeft,
} from 'lucide-react';

export interface PortalConfig {
  portalName: string;
  portalSlug: string;
  navItems: NavItem[];
  accentColor?: 'blue' | 'emerald' | 'violet' | 'amber';
  roleLabel?: string;
}

interface PortalLayoutProps {
  config: PortalConfig;
  children: ReactNode;
}

const accentStyles = {
  blue: {
    logo: 'bg-primary text-white',
    avatar: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300',
  },
  emerald: {
    logo: 'bg-emerald-500 text-white dark:bg-emerald-600',
    avatar: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  violet: {
    logo: 'bg-violet-500 text-white dark:bg-violet-600',
    avatar: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  },
  amber: {
    logo: 'bg-amber-500 text-white dark:bg-amber-600',
    avatar: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
};

function AuthLoader({ portalName }: { portalName: string }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
        <p className="text-lg text-foreground font-medium">Authenticating...</p>
        <p className="text-sm text-muted-foreground">Loading {portalName}.</p>
      </div>
    </div>
  );
}

export function PortalLayout({ config, children }: PortalLayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [companyName, setCompanyName] = useState('Continuum');
  const [authChecked, setAuthChecked] = useState(false);
  const [userName, setUserName] = useState('');
  const unreadCount = useUnreadCount();

  const { portalName, portalSlug, navItems: baseNavItems, accentColor = 'blue', roleLabel } = config;
  const styles = accentStyles[accentColor];

  const navItems = baseNavItems.map((item) =>
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
    return <AuthLoader portalName={portalName} />;
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href={`/${portalSlug}/dashboard`}>
            <span className="text-lg font-semibold text-foreground">{companyName}</span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[59] lg:hidden transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 z-[60] bg-card border-r border-border flex flex-col transition-all duration-300',
          isMobile
            ? sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            : sidebarCollapsed ? 'w-[72px]' : 'w-[260px]',
          isMobile && 'w-[280px]',
          !isMobile && 'lg:relative'
        )}
      >
        {/* Sidebar Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border shrink-0">
          <div className={cn('flex items-center gap-3', sidebarCollapsed && !isMobile && 'justify-center w-full')}>
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center font-bold', styles.logo)}>
              {companyName[0]}
            </div>
            {(!sidebarCollapsed || isMobile) && (
              <div className="min-w-0">
                <Link href={`/${portalSlug}/dashboard`} onClick={closeSidebar}>
                  <h1 className="text-sm font-semibold text-foreground leading-tight truncate">{companyName}</h1>
                </Link>
                <p className="text-xs text-muted-foreground leading-tight">{portalName}</p>
              </div>
            )}
          </div>
          {isMobile && (
            <button
              onClick={closeSidebar}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {!isMobile && (
            <div className="flex items-center gap-1">
              <NotificationBell />
              <ThemeToggle />
            </div>
          )}
        </div>

        {/* Search (hidden when collapsed) */}
        {(!sidebarCollapsed || isMobile) && (
          <div className="p-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent text-sm w-full outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <SidebarNav items={navItems} onItemClick={closeSidebar} />
        </div>

        {/* Collapse toggle (desktop only) */}
        {!isMobile && (
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={cn('w-4 h-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
          </button>
        )}

        {/* Footer */}
        <div className={cn('p-3 border-t border-border shrink-0 space-y-2', sidebarCollapsed && !isMobile && 'px-2')}>
          <div className={cn(
            'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors',
            sidebarCollapsed && !isMobile && 'justify-center'
          )}>
            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center font-semibold shrink-0', styles.avatar)}>
              {userName ? userName[0]?.toUpperCase() : 'U'}
            </div>
            {(!sidebarCollapsed || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userName || 'My Account'}</p>
                <p className="text-xs text-muted-foreground">{roleLabel || portalName}</p>
              </div>
            )}
          </div>
          {(!sidebarCollapsed || isMobile) && (
            <>
              <Suspense>
                <PortalSwitcher />
              </Suspense>
              <SignOutButton />
            </>
          )}
          {sidebarCollapsed && !isMobile && (
            <SignOutButton variant="compact" />
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
