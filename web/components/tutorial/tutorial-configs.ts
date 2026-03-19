import { TutorialStep, TutorialConfig } from './tutorial-guide';
import { 
  Users, 
  Building2, 
  Calendar, 
  Clock, 
  FileText, 
  Settings, 
  Shield, 
  Bell, 
  BarChart3,
  Wallet,
  UserPlus,
  CheckSquare,
  MessageSquare,
} from 'lucide-react';
import React from 'react';

// ─── Super Admin Tutorial ─────────────────────────────────────────────────────

export function getSuperAdminTutorial(onComplete: () => void): TutorialConfig {
  return {
    id: 'super-admin-tutorial',
    title: 'Super Admin Guide',
    description: 'Learn how to manage the platform',
    onComplete,
    steps: [
      {
        id: 'welcome',
        title: 'Platform Overview',
        description: 'As the Super Admin, you have complete control over the Continuum platform. You can create users, manage companies, and oversee all operations.',
        icon: React.createElement(Shield, { className: 'h-6 w-6 text-purple-400' }),
      },
      {
        id: 'create-users',
        title: 'Creating Users',
        description: 'Navigate to Users to create new company administrators. They will receive an invitation email to set up their account and create their company.',
        icon: React.createElement(UserPlus, { className: 'h-6 w-6 text-blue-400' }),
      },
      {
        id: 'manage-companies',
        title: 'Monitor Companies',
        description: 'View all registered companies, their subscription status, and usage statistics from the dashboard.',
        icon: React.createElement(Building2, { className: 'h-6 w-6 text-green-400' }),
      },
      {
        id: 'platform-settings',
        title: 'Platform Settings',
        description: 'Configure global settings, manage integrations, and set up system-wide policies from the Settings page.',
        icon: React.createElement(Settings, { className: 'h-6 w-6 text-orange-400' }),
      },
    ],
  };
}

// ─── Admin/Company Owner Tutorial ─────────────────────────────────────────────

export function getAdminTutorial(onComplete: () => void): TutorialConfig {
  return {
    id: 'admin-tutorial',
    title: 'Company Setup Guide',
    description: 'Get your company up and running',
    onComplete,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Your Dashboard',
        description: "You're now the administrator of your company on Continuum. Let's set up your organization for success.",
        icon: React.createElement(Building2, { className: 'h-6 w-6 text-blue-400' }),
      },
      {
        id: 'invite-team',
        title: 'Build Your Team',
        description: 'Start by inviting HR personnel and managers. Go to Team → Invite to add team members with specific roles.',
        icon: React.createElement(Users, { className: 'h-6 w-6 text-green-400' }),
      },
      {
        id: 'configure-roles',
        title: 'Configure Roles',
        description: "Set up which roles your company uses. Not all companies need every role - configure what works for you.",
        icon: React.createElement(Shield, { className: 'h-6 w-6 text-purple-400' }),
      },
      {
        id: 'leave-policies',
        title: 'Set Up Leave Policies',
        description: 'Configure leave types, accrual rules, and approval workflows in Settings → Leave Policies.',
        icon: React.createElement(Calendar, { className: 'h-6 w-6 text-orange-400' }),
      },
      {
        id: 'departments',
        title: 'Create Departments',
        description: 'Organize your company by creating departments and teams in Settings → Organization.',
        icon: React.createElement(Building2, { className: 'h-6 w-6 text-cyan-400' }),
      },
    ],
  };
}

// ─── HR Tutorial ──────────────────────────────────────────────────────────────

export function getHRTutorial(onComplete: () => void): TutorialConfig {
  return {
    id: 'hr-tutorial',
    title: 'HR Portal Guide',
    description: 'Master the HR management tools',
    onComplete,
    steps: [
      {
        id: 'overview',
        title: 'HR Dashboard Overview',
        description: 'Your dashboard shows pending approvals, employee statistics, and quick actions. Monitor everything from here.',
        icon: React.createElement(BarChart3, { className: 'h-6 w-6 text-blue-400' }),
      },
      {
        id: 'manage-employees',
        title: 'Employee Management',
        description: 'Add, edit, and manage employees from the Employees section. You can invite new employees and update their information.',
        icon: React.createElement(Users, { className: 'h-6 w-6 text-green-400' }),
      },
      {
        id: 'leave-approvals',
        title: 'Leave Approvals',
        description: 'Review and approve leave requests in the Approvals section. You can see the full request history and add comments.',
        icon: React.createElement(CheckSquare, { className: 'h-6 w-6 text-orange-400' }),
      },
      {
        id: 'attendance',
        title: 'Attendance Tracking',
        description: "Monitor attendance, manage shifts, and handle regularization requests in the Attendance section.",
        icon: React.createElement(Clock, { className: 'h-6 w-6 text-purple-400' }),
      },
      {
        id: 'payroll',
        title: 'Payroll Management',
        description: 'Process payroll, manage salary structures, and generate payslips from the Payroll section.',
        icon: React.createElement(Wallet, { className: 'h-6 w-6 text-cyan-400' }),
      },
      {
        id: 'reports',
        title: 'Reports & Analytics',
        description: 'Generate comprehensive reports on attendance, leave usage, and payroll from the Reports section.',
        icon: React.createElement(FileText, { className: 'h-6 w-6 text-pink-400' }),
      },
    ],
  };
}

// ─── Manager Tutorial ─────────────────────────────────────────────────────────

export function getManagerTutorial(onComplete: () => void): TutorialConfig {
  return {
    id: 'manager-tutorial',
    title: 'Manager Guide',
    description: 'Learn to manage your team effectively',
    onComplete,
    steps: [
      {
        id: 'overview',
        title: 'Manager Dashboard',
        description: 'Your dashboard shows your team status, pending approvals, and key metrics. Stay on top of your team from here.',
        icon: React.createElement(BarChart3, { className: 'h-6 w-6 text-blue-400' }),
      },
      {
        id: 'team-view',
        title: 'Your Team',
        description: 'View all your direct reports, their status, and leave balances in the Team section.',
        icon: React.createElement(Users, { className: 'h-6 w-6 text-green-400' }),
      },
      {
        id: 'approvals',
        title: 'Approve Requests',
        description: 'Review and approve leave requests from your team members. You can approve, reject, or request more information.',
        icon: React.createElement(CheckSquare, { className: 'h-6 w-6 text-orange-400' }),
      },
      {
        id: 'calendar',
        title: 'Team Calendar',
        description: "View your team's leave schedule and plan around absences using the Calendar view.",
        icon: React.createElement(Calendar, { className: 'h-6 w-6 text-purple-400' }),
      },
    ],
  };
}

// ─── Employee Tutorial ────────────────────────────────────────────────────────

export function getEmployeeTutorial(onComplete: () => void): TutorialConfig {
  return {
    id: 'employee-tutorial',
    title: 'Getting Started',
    description: 'Learn to use Continuum',
    onComplete,
    steps: [
      {
        id: 'dashboard',
        title: 'Your Dashboard',
        description: 'This is your personal dashboard. View your leave balance, upcoming holidays, and recent activity at a glance.',
        icon: React.createElement(BarChart3, { className: 'h-6 w-6 text-blue-400' }),
      },
      {
        id: 'apply-leave',
        title: 'Apply for Leave',
        description: "Click 'Apply Leave' to request time off. Select the type, dates, and add a reason. Your manager will be notified.",
        icon: React.createElement(Calendar, { className: 'h-6 w-6 text-green-400' }),
      },
      {
        id: 'attendance',
        title: 'Mark Attendance',
        description: 'Check in and check out daily from the Attendance section. You can also view your attendance history.',
        icon: React.createElement(Clock, { className: 'h-6 w-6 text-orange-400' }),
      },
      {
        id: 'payslips',
        title: 'View Payslips',
        description: 'Access your salary details and download payslips from the Payslips section.',
        icon: React.createElement(Wallet, { className: 'h-6 w-6 text-purple-400' }),
      },
      {
        id: 'notifications',
        title: 'Stay Updated',
        description: "You'll receive notifications for leave approvals, company announcements, and more. Check the bell icon regularly.",
        icon: React.createElement(Bell, { className: 'h-6 w-6 text-cyan-400' }),
      },
    ],
  };
}

// ─── Get Tutorial by Role ─────────────────────────────────────────────────────

export function getTutorialByRole(role: string, onComplete: () => void): TutorialConfig {
  switch (role) {
    case 'super_admin':
      return getSuperAdminTutorial(onComplete);
    case 'admin':
      return getAdminTutorial(onComplete);
    case 'hr':
      return getHRTutorial(onComplete);
    case 'manager':
    case 'director':
      return getManagerTutorial(onComplete);
    case 'team_lead':
      return getManagerTutorial(onComplete);
    default:
      return getEmployeeTutorial(onComplete);
  }
}
