'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users,
  Shield,
  UserCheck,
  Briefcase,
  ChevronDown,
} from 'lucide-react';

// Portal definitions — order matches hierarchy
const PORTALS = [
  {
    key: 'admin',
    label: 'Admin',
    href: '/admin/dashboard',
    prefix: '/admin',
    icon: Shield,
    roles: ['admin'],
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  {
    key: 'hr',
    label: 'HR',
    href: '/hr/dashboard',
    prefix: '/hr',
    icon: Users,
    roles: ['admin', 'hr'],
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    key: 'manager',
    label: 'Manager',
    href: '/manager/dashboard',
    prefix: '/manager',
    icon: UserCheck,
    roles: ['admin', 'hr', 'director', 'manager', 'team_lead'],
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    key: 'employee',
    label: 'Employee',
    href: '/employee/dashboard',
    prefix: '/employee',
    icon: Briefcase,
    roles: ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'],
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
] as const;

interface PortalSwitcherProps {
  compact?: boolean;
}

export function PortalSwitcher({ compact = false }: PortalSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine which portals the user can access
  useEffect(() => {
    // Read from cookie first (instant, no network)
    const rolesCookie = document.cookie
      .split('; ')
      .find((c) => c.startsWith('continuum-roles='));
    if (rolesCookie) {
      const roles = rolesCookie.split('=')[1].split(',').map((r) => r.trim().toLowerCase());
      setUserRoles(roles);
      setLoading(false);
      return;
    }

    // Fallback: fetch from API
    fetch('/api/employees/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          const roles: string[] = [data.primary_role];
          if (Array.isArray(data.secondary_roles)) {
            data.secondary_roles.forEach((r: string) => {
              if (!roles.includes(r)) roles.push(r);
            });
          }
          setUserRoles(roles);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-portal-switcher]')) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const accessiblePortals = PORTALS.filter((p) =>
    p.roles.some((r) => userRoles.includes(r))
  );

  // Only show if user has access to 2+ portals
  if (loading || accessiblePortals.length <= 1) return null;

  const currentPortal = accessiblePortals.find(
    (p) => pathname.startsWith(p.prefix + '/') || pathname === p.prefix
  );

  function switchPortal(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (compact) {
    return (
      <div data-portal-switcher className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {currentPortal && <currentPortal.icon className="w-3.5 h-3.5" />}
          <span>Switch Portal</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute bottom-full left-0 mb-1 w-44 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
            {accessiblePortals.map((portal) => {
              const isActive = portal.key === currentPortal?.key;
              const Icon = portal.icon;
              return (
                <button
                  key={portal.key}
                  onClick={() => switchPortal(portal.href)}
                  disabled={isActive}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium cursor-default'
                      : 'text-foreground hover:bg-accent/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? portal.color : ''}`} />
                  <span>{portal.label} Portal</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-portal-switcher className="relative px-3 mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg border border-border bg-background hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {currentPortal && (
            <div className={`w-6 h-6 rounded flex items-center justify-center ${currentPortal.bg}`}>
              <currentPortal.icon className={`w-3.5 h-3.5 ${currentPortal.color}`} />
            </div>
          )}
          <span className="font-medium text-foreground">
            {currentPortal?.label || 'Portal'}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-3 right-3 bottom-full mb-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-50">
          <p className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Switch Portal
          </p>
          {accessiblePortals.map((portal) => {
            const isActive = portal.key === currentPortal?.key;
            const Icon = portal.icon;
            return (
              <button
                key={portal.key}
                onClick={() => switchPortal(portal.href)}
                disabled={isActive}
                className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium cursor-default'
                    : 'text-foreground hover:bg-accent/50'
                }`}
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${portal.bg}`}>
                  <Icon className={`w-4 h-4 ${portal.color}`} />
                </div>
                <div className="text-left">
                  <span className="block">{portal.label} Portal</span>
                  {isActive && (
                    <span className="block text-[10px] text-muted-foreground">Current</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
