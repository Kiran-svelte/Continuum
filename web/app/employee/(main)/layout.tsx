'use client';

import { PortalLayout } from '@/components/portal-layout';
import {
  LayoutDashboard,
  FilePlus,
  CalendarDays,
  Clock,
  FolderOpen,
  User,
  Settings,
  Banknote,
  Receipt,
  Bell,
  ClipboardList,
} from 'lucide-react';

const EMPLOYEE_NAV_ITEMS = [
  { label: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
  { label: 'Request Leave', href: '/employee/request-leave', icon: FilePlus },
  { label: 'Leave History', href: '/employee/leave-history', icon: CalendarDays },
  { label: 'Attendance', href: '/employee/attendance', icon: Clock },
  { label: 'Documents', href: '/employee/documents', icon: FolderOpen },
  { label: 'Payslips', href: '/employee/payslips', icon: Banknote },
  { label: 'Reimbursements', href: '/employee/reimbursements', icon: Receipt },
  { label: 'Exit Checklist', href: '/employee/exit-checklist', icon: ClipboardList },
  { label: 'Notifications', href: '/employee/notifications', icon: Bell },
  { label: 'Profile', href: '/employee/profile', icon: User },
  { label: 'Settings', href: '/employee/settings', icon: Settings },
];

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalLayout
      config={{
        portalName: 'Employee Portal',
        portalSlug: 'employee',
        navItems: EMPLOYEE_NAV_ITEMS,
        accentColor: 'blue',
        roleLabel: 'Employee',
      }}
    >
      {children}
    </PortalLayout>
  );
}
