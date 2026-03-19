'use client';

import { PortalLayout } from '@/components/portal-layout';
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Clock,
  Users,
  Receipt,
  BarChart3,
  Settings,
  Bell,
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

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalLayout
      config={{
        portalName: 'Manager Portal',
        portalSlug: 'manager',
        navItems: MANAGER_NAV_ITEMS,
        accentColor: 'violet',
        roleLabel: 'Manager',
      }}
    >
      {children}
    </PortalLayout>
  );
}
