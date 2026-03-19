'use client';

import { PortalLayout } from '@/components/portal-layout';
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

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalLayout
      config={{
        portalName: 'HR Portal',
        portalSlug: 'hr',
        navItems: HR_NAV_ITEMS,
        accentColor: 'emerald',
        roleLabel: 'HR Admin',
      }}
    >
      {children}
    </PortalLayout>
  );
}
