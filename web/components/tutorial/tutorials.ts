import { TutorialConfig } from './tutorial-provider';

// Employee Portal Tutorial
export const employeeTutorial: TutorialConfig = {
  id: 'employee-getting-started',
  name: 'Getting Started as an Employee',
  description: 'Learn how to navigate the employee portal and manage your leave requests',
  role: 'employee',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Continuum! 👋',
      description: 'This tutorial will guide you through the employee portal. You\'ll learn how to check your leave balances, apply for leave, and track your attendance.',
      position: 'center',
    },
    {
      id: 'dashboard',
      title: 'Your Dashboard',
      description: 'The dashboard shows your leave balances at a glance. You can see how many days of each leave type you have remaining for the year.',
      target: '[data-tutorial="leave-balances"]',
      position: 'bottom',
      actionLabel: 'View your leave balances above',
    },
    {
      id: 'apply-leave',
      title: 'Apply for Leave',
      description: 'Click the "Apply Leave" button to submit a new leave request. You can select the leave type, dates, and add any notes for your manager.',
      target: '[data-tutorial="apply-leave-btn"]',
      position: 'bottom',
      action: 'click',
      actionLabel: 'Click to apply for leave',
    },
    {
      id: 'quick-actions',
      title: 'Quick Actions',
      description: 'Use these shortcuts to quickly access common features like applying for leave, viewing history, checking attendance, and downloading documents.',
      target: '[data-tutorial="quick-actions"]',
      position: 'right',
    },
    {
      id: 'sidebar',
      title: 'Navigation Sidebar',
      description: 'Use the sidebar to navigate between different sections: Dashboard, Request Leave, Leave History, Attendance, Documents, and Profile.',
      target: '[data-tutorial="sidebar"]',
      position: 'right',
    },
    {
      id: 'leave-history',
      title: 'Leave History',
      description: 'Track all your past and pending leave requests. You can see the status of each request and any comments from your manager.',
      route: '/employee/leave-history',
      position: 'center',
    },
    {
      id: 'notifications',
      title: 'Stay Updated',
      description: 'Click the bell icon to see your notifications. You\'ll receive updates when your leave is approved, rejected, or needs attention.',
      target: '[data-tutorial="notifications"]',
      position: 'bottom',
    },
    {
      id: 'complete',
      title: 'You\'re All Set! 🎉',
      description: 'You now know the basics of using Continuum. If you need help anytime, check the Help Center in the sidebar or contact your HR team.',
      position: 'center',
    },
  ],
};

// HR Portal Tutorial
export const hrTutorial: TutorialConfig = {
  id: 'hr-getting-started',
  name: 'Getting Started as HR Admin',
  description: 'Learn how to manage employees, leave requests, and company policies',
  role: 'hr',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome, HR Admin! 👋',
      description: 'This tutorial will guide you through the HR portal. You\'ll learn how to manage employees, process leave requests, and configure company policies.',
      position: 'center',
    },
    {
      id: 'dashboard',
      title: 'HR Dashboard Overview',
      description: 'Your dashboard shows key metrics: pending approvals, today\'s attendance, upcoming holidays, and leave trends. Monitor everything at a glance.',
      target: '[data-tutorial="hr-dashboard"]',
      position: 'bottom',
    },
    {
      id: 'employees',
      title: 'Employee Management',
      description: 'View and manage all employees in your organization. You can add new employees, update profiles, and manage their leave balances.',
      route: '/hr/employees',
      position: 'center',
      actionLabel: 'Navigate to Employees section',
    },
    {
      id: 'leave-requests',
      title: 'Leave Requests',
      description: 'Review and process all leave requests from employees. You can approve, reject, or request more information for each request.',
      route: '/hr/leave-requests',
      position: 'center',
    },
    {
      id: 'approvals',
      title: 'Quick Approvals',
      description: 'Use the Approvals section for quick actions on pending requests. Bulk approve or process requests efficiently.',
      target: '[data-tutorial="approvals"]',
      position: 'right',
    },
    {
      id: 'policy-settings',
      title: 'Policy Configuration',
      description: 'Configure leave policies for your organization. Set up leave types, accrual rules, carry-forward limits, and more.',
      route: '/hr/policy-settings',
      position: 'center',
    },
    {
      id: 'settings',
      title: 'Company Settings',
      description: 'Manage company-wide settings including notifications, auto-approve rules, join codes, and compliance configurations.',
      route: '/hr/settings',
      position: 'center',
    },
    {
      id: 'reports',
      title: 'Analytics & Reports',
      description: 'Generate detailed reports on leave usage, attendance patterns, and workforce analytics. Export data for further analysis.',
      route: '/hr/reports',
      position: 'center',
    },
    {
      id: 'complete',
      title: 'You\'re Ready! 🎉',
      description: 'You now have the knowledge to manage your organization\'s leave system effectively. Explore each section to discover more features!',
      position: 'center',
    },
  ],
};

// Manager Portal Tutorial
export const managerTutorial: TutorialConfig = {
  id: 'manager-getting-started',
  name: 'Getting Started as a Manager',
  description: 'Learn how to manage your team and approve leave requests',
  role: 'manager',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome, Team Lead! 👋',
      description: 'This tutorial will help you navigate the manager portal. You\'ll learn how to view your team, approve leave requests, and track team attendance.',
      position: 'center',
    },
    {
      id: 'dashboard',
      title: 'Manager Dashboard',
      description: 'Your dashboard shows team-specific metrics: pending approvals, team availability today, and upcoming team leave. Stay on top of your team\'s schedule.',
      target: '[data-tutorial="manager-dashboard"]',
      position: 'bottom',
    },
    {
      id: 'team',
      title: 'Your Team',
      description: 'View all team members, their current status, and leave balances. Quickly identify who\'s available and who\'s on leave.',
      route: '/manager/team',
      position: 'center',
    },
    {
      id: 'approvals',
      title: 'Leave Approvals',
      description: 'Review and approve leave requests from your team members. Check for conflicts and coverage before approving.',
      route: '/manager/approvals',
      position: 'center',
      actionLabel: 'Review pending requests',
    },
    {
      id: 'team-attendance',
      title: 'Team Attendance',
      description: 'Monitor your team\'s attendance patterns. View daily attendance logs and identify any patterns that need attention.',
      route: '/manager/team-attendance',
      position: 'center',
    },
    {
      id: 'reports',
      title: 'Team Reports',
      description: 'Generate reports specific to your team. Analyze leave patterns, attendance trends, and team availability.',
      route: '/manager/reports',
      position: 'center',
    },
    {
      id: 'complete',
      title: 'Great Job! 🎉',
      description: 'You\'re all set to manage your team effectively. Remember to check pending approvals regularly to ensure smooth operations.',
      position: 'center',
    },
  ],
};

// General features tutorial
export const featuresToutorial: TutorialConfig = {
  id: 'features-overview',
  name: 'Continuum Features Overview',
  description: 'Discover all the features Continuum has to offer',
  role: 'all',
  steps: [
    {
      id: 'intro',
      title: 'Discover Continuum Features',
      description: 'Let\'s explore the powerful features that make Continuum the best leave management solution for your organization.',
      position: 'center',
    },
    {
      id: 'ai-powered',
      title: 'AI-Powered Recommendations',
      description: 'Our constraint engine analyzes leave patterns and team availability to provide smart recommendations for leave approvals.',
      position: 'center',
    },
    {
      id: 'real-time',
      title: 'Real-Time Notifications',
      description: 'Stay updated with instant notifications for leave approvals, rejections, and important updates. Never miss a beat.',
      position: 'center',
    },
    {
      id: 'compliance',
      title: 'India Compliance Built-In',
      description: 'Continuum is designed for Indian businesses with built-in support for statutory leaves, state holidays, and labor law compliance.',
      position: 'center',
    },
    {
      id: 'analytics',
      title: 'Powerful Analytics',
      description: 'Generate insightful reports and visualizations to understand leave patterns, attendance trends, and workforce analytics.',
      position: 'center',
    },
    {
      id: 'integrations',
      title: 'Seamless Integrations',
      description: 'Connect with your existing tools - Slack, Microsoft Teams, payroll systems, and more for a unified experience.',
      position: 'center',
    },
    {
      id: 'security',
      title: 'Enterprise Security',
      description: 'Your data is protected with enterprise-grade security including encryption, audit logs, and role-based access control.',
      position: 'center',
    },
    {
      id: 'complete',
      title: 'Explore More!',
      description: 'These are just some of the features Continuum offers. Navigate through the portal to discover all the capabilities available to you.',
      position: 'center',
    },
  ],
};

// Export all tutorials
export const allTutorials = {
  employee: employeeTutorial,
  hr: hrTutorial,
  manager: managerTutorial,
  features: featuresToutorial,
};

export type TutorialId = keyof typeof allTutorials;
