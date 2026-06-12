"use client";

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SignOutButton } from '@/components/sign-out-button';
import { NotificationBell } from '@/components/notification-bell';
import { CanView } from '@/components/auth/can-view';
import { PortalBreadcrumbs } from '@/components/design-system';
import {
  Menu,
  MonitorPlay,
  LayoutDashboard,
  Users,
  Building2,
  ShieldCheck,
  Activity,
  Shield,
  Settings,
  ClipboardList,
  CheckSquare,
  Clock,
  Wallet,
  SlidersHorizontal,
  BarChart3,
  CalendarDays,
  CalendarCheck,
  Banknote,
  AlertTriangle,
  Receipt,
  ArrowRightLeft,
  IndianRupee,
  Timer,
  ListChecks,
  GitBranch,
  Layers,
  FilePlus,
  FileSpreadsheet,
  FolderOpen,
  User,
  Rocket,
  Scale,
  Sliders,
  Target,
  Star,
  UserPlus,
  Megaphone,
  BookOpen,
  DollarSign,
  Plane,
  Upload,
  Crosshair,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommandKSearch } from '@/components/ui/command-k';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  group?: string;
  permission?: string;
}

export interface PortalConfig {
  portalName: string;
  portalSlug: string;
  navItems: NavItem[];
  accentColor?: string;
  roleLabel: string;
}

export function PortalLayout({ children, config }: { children: React.ReactNode, config: PortalConfig }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname ?? '';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isNavigating, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState('User');

  const initials = useMemo(() => {
    const source = displayName.trim();
    if (!source) {
      return config.roleLabel.substring(0, 2).toUpperCase();
    }
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    }
    return source.substring(0, 2).toUpperCase();
  }, [config.roleLabel, displayName]);

  const iconRegistry = useMemo<Record<string, LucideIcon>>(
    () => ({
      LayoutDashboard,
      Users,
      Building2,
      ShieldCheck,
      Activity,
      Shield,
      Settings,
      ClipboardList,
      CheckSquare,
      Clock,
      Wallet,
      SlidersHorizontal,
      BarChart3,
      CalendarDays,
      CalendarCheck,
      Banknote,
      AlertTriangle,
      Receipt,
      ArrowRightLeft,
      IndianRupee,
      Timer,
      ListChecks,
      GitBranch,
      Layers,
      FilePlus,
      FileSpreadsheet,
      FolderOpen,
      User,
      Rocket,
      Scale,
      Sliders,
      Target,
      Star,
      UserPlus,
      Megaphone,
      BookOpen,
      DollarSign,
      Plane,
      Upload,
      Crosshair,
    }),
    []
  );

  useEffect(() => {
    config.navItems.forEach((item) => router.prefetch(item.href));
  }, [config.navItems, router]);

  useEffect(() => {
    const controller = new AbortController();

    const loadProfile = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          return;
        }

        const profile = await response.json() as {
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
        };

        const firstName = (profile.first_name || '').trim();
        const lastName = (profile.last_name || '').trim();
        const fullName = `${firstName} ${lastName}`.trim();
        const fallback = (profile.email || '').split('@')[0] || 'User';
        setDisplayName(fullName || fallback);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.warn('[PORTAL LAYOUT] Failed to load profile name', error);
        }
      }
    };

    void loadProfile();

    return () => controller.abort();
  }, []);

  return (
    <div
      className={`flex h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--primary)] selection:text-[var(--primary-foreground)] relative ${isNavigating ? 'cursor-progress' : ''}`}
    >
      <div className="ambient-glow" aria-hidden />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--foreground)_35%,transparent)] backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          role="presentation"
        />
      )}

      <aside
        className={`
        pulse-sidebar fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-[var(--border)]
        shadow-[var(--shadow-md)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-[var(--border)] px-5">
          <Link
            href={`/${config.portalSlug}/dashboard`}
            className="flex items-center gap-2.5 text-lg font-semibold text-[var(--foreground)] no-underline hover:opacity-90"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-bento)]">
              <MonitorPlay className="h-4 w-4" aria-hidden />
            </span>
            <span>
              Continuum
              <span className="ml-1.5 text-xs font-medium text-[var(--muted-foreground)]">Pulse</span>
            </span>
          </Link>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {config.navItems.map((item, idx) => {
            const isActive = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            const Icon = iconRegistry[item.icon] ?? LayoutDashboard;
            const prevGroup = idx > 0 ? config.navItems[idx - 1].group : undefined;
            const isNewGroup = item.group && item.group !== prevGroup;

            const linkEl = (
              <Link
                href={item.href}
                prefetch
                onMouseEnter={() => router.prefetch(item.href)}
                onClick={(e) => {
                  e.preventDefault();
                  setSidebarOpen(false);
                  startTransition(() => router.push(item.href));
                }}
                className={`
                  group flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-all duration-150
                  ${isActive
                    ? 'bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)] shadow-[var(--shadow-xs)]'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'}
                `}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${isActive ? 'text-[var(--primary)]' : 'opacity-60 group-hover:opacity-100'}`}
                  aria-hidden
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );

            return (
              <React.Fragment key={`${item.href}-${idx}`}>
                {isNewGroup && (
                  <div
                    className={`${idx > 0 ? 'mt-4 border-t border-[var(--border)] pt-3' : 'pt-1'} px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] opacity-70`}
                  >
                    {item.group}
                  </div>
                )}
                {item.permission ? (
                  <CanView require={item.permission}>{linkEl}</CanView>
                ) : (
                  linkEl
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="mt-auto flex shrink-0 items-center gap-3 border-t border-[var(--border)] p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)] shadow-[var(--shadow-sm)]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">{displayName}</p>
            <p className="truncate text-xs font-medium text-[var(--primary)]">{config.roleLabel}</p>
          </div>
          <SignOutButton variant="compact" />
        </div>
      </aside>

      <main className="relative z-10 flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-[4.25rem] shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_90%,transparent)] px-4 backdrop-blur-md lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              type="button"
              title="Open menu"
              aria-label="Open menu"
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden min-w-0 flex-col sm:flex">
              <PortalBreadcrumbs portalSlug={config.portalSlug} />
            </div>
            <CommandKSearch navItems={config.navItems} />
          </div>
          <NotificationBell />
        </header>

        <div className="relative h-full w-full flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
