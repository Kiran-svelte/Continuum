import { TutorialConfig } from './tutorial-provider';

// Getting Started Tutorial (for all new users)
export const gettingStartedTutorial: TutorialConfig = {
  id: 'getting-started',
  name: 'Getting Started with Continuum',
  description: 'A quick introduction to Continuum for new users — learn the basics of navigation, your profile, and key features',
  role: 'all',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Continuum!',
      description: 'Continuum is your all-in-one leave management platform. This quick tour will show you the essentials so you can get up and running in minutes.',
      position: 'center',
    },
    {
      id: 'navigation',
      title: 'Navigating the App',
      description: 'Use the sidebar on the left to move between sections. It adapts to your role — employees, managers, and HR admins each see the pages most relevant to them.',
      target: '[data-tutorial="sidebar"]',
      position: 'right',
    },
    {
      id: 'theme',
      title: 'Light & Dark Mode',
      description: 'Prefer a darker interface? Toggle between light and dark mode using the theme switcher in the top navigation bar. Your preference is saved automatically.',
      target: '[data-tutorial="theme-toggle"]',
      position: 'bottom',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'The bell icon shows real-time updates — leave approvals, rejections, policy changes, and reminders. Click it to see what needs your attention.',
      target: '[data-tutorial="notifications"]',
      position: 'bottom',
    },
    {
      id: 'profile',
      title: 'Your Profile',
      description: 'Click your avatar to access profile settings, update personal information, change your password, or sign out of the application.',
      target: '[data-tutorial="user-menu"]',
      position: 'bottom',
    },
    {
      id: 'help',
      title: 'Need Help?',
      description: 'You can replay this tutorial or explore role-specific tutorials anytime from the Help section in the sidebar. If you get stuck, reach out to your HR team.',
      position: 'center',
    },
  ],
};

// Employee Portal Tutorial
export const employeeTutorial: TutorialConfig = {
  id: 'employee-getting-started',
  name: 'Getting Started as an Employee',
  description: 'Learn how to navigate the employee portal, view leave balances, submit requests, and track your history',
  role: 'employee',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to the Employee Portal',
      description: 'This tutorial walks you through everything you need as an employee — from checking your leave balances to submitting time-off requests and reviewing past history.',
      position: 'center',
      route: '/employee/dashboard',
    },
    {
      id: 'dashboard',
      title: 'Your Dashboard',
      description: 'The dashboard is your home base. It displays your remaining leave balances for each category (casual, sick, earned, etc.) so you always know how much time off you have available this year.',
      target: '[data-tutorial="leave-balances"]',
      position: 'bottom',
      route: '/employee/dashboard',
      actionLabel: 'View your leave balances above',
    },
    {
      id: 'apply-leave',
      title: 'Request Leave',
      description: 'Ready to take time off? Use the Request Leave page to submit a new leave application. Select the leave type, pick your dates, and optionally add a reason or note for your manager.',
      target: '[data-tutorial="apply-leave-btn"]',
      position: 'bottom',
      route: '/employee/request-leave',
      action: 'click',
      actionLabel: 'Fill out the leave request form',
    },
    {
      id: 'leave-history',
      title: 'Leave History',
      description: 'The Leave History page shows every request you have submitted — approved, pending, and rejected. You can filter by date range or leave type, and view any comments your manager left.',
      route: '/employee/leave-history',
      position: 'center',
    },
    {
      id: 'quick-actions',
      title: 'Quick Actions',
      description: 'Back on the dashboard, the Quick Actions panel gives you one-click shortcuts to apply for leave, view history, check attendance, and download documents without navigating through menus.',
      target: '[data-tutorial="quick-actions"]',
      position: 'right',
      route: '/employee/dashboard',
    },
    {
      id: 'attendance',
      title: 'Attendance Tracking',
      description: 'The Attendance page logs your daily check-in and check-out times. Review your monthly attendance summary and identify any discrepancies early.',
      route: '/employee/attendance',
      position: 'center',
    },
    {
      id: 'documents',
      title: 'Documents',
      description: 'Access and download important documents such as your leave policy handbook, salary slips, and company holiday calendar from the Documents section.',
      route: '/employee/documents',
      position: 'center',
    },
    {
      id: 'profile',
      title: 'Your Profile',
      description: 'Keep your profile up to date with your contact information, emergency contacts, and reporting manager details. Changes here are reflected across the system.',
      route: '/employee/profile',
      position: 'center',
    },
    {
      id: 'sidebar',
      title: 'Sidebar Navigation',
      description: 'The sidebar is always available on the left. Use it to jump between Dashboard, Request Leave, Leave History, Attendance, Documents, and Profile at any time.',
      target: '[data-tutorial="sidebar"]',
      position: 'right',
      route: '/employee/dashboard',
    },
    {
      id: 'notifications',
      title: 'Stay Updated',
      description: 'The notification bell alerts you whenever your leave is approved or rejected, when a policy changes, or when your manager needs more information from you.',
      target: '[data-tutorial="notifications"]',
      position: 'bottom',
    },
    {
      id: 'complete',
      title: 'You Are All Set!',
      description: 'You now know everything you need to manage your leave effectively in Continuum. If you need a refresher, you can replay this tutorial from the Help section in the sidebar.',
      position: 'center',
    },
  ],
};

// HR Portal Tutorial
export const hrTutorial: TutorialConfig = {
  id: 'hr-getting-started',
  name: 'Getting Started as HR Admin',
  description: 'Learn how to manage employees, process leave requests, configure policies, and generate reports',
  role: 'hr',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome, HR Admin',
      description: 'This tutorial covers the full HR portal — employee management, leave processing, policy configuration, and analytics. Let us walk through each section.',
      position: 'center',
      route: '/hr/dashboard',
    },
    {
      id: 'dashboard',
      title: 'HR Dashboard Overview',
      description: 'Your dashboard surfaces the metrics that matter most: pending leave approvals, today\'s attendance count, upcoming holidays, and leave utilization trends across the organization.',
      target: '[data-tutorial="hr-dashboard"]',
      position: 'bottom',
      route: '/hr/dashboard',
    },
    {
      id: 'employees',
      title: 'Employee Management',
      description: 'The Employees page is your directory for the entire organization. Add new hires, update existing profiles, adjust leave balances, assign managers, and deactivate departed employees.',
      route: '/hr/employees',
      position: 'center',
      actionLabel: 'Browse and manage employee records',
    },
    {
      id: 'leave-requests',
      title: 'Leave Requests',
      description: 'All employee leave requests flow into this page. Review each request, check for team conflicts, and approve or reject with optional comments. Bulk actions let you process multiple requests at once.',
      route: '/hr/leave-requests',
      position: 'center',
    },
    {
      id: 'approvals',
      title: 'Quick Approvals',
      description: 'The Approvals widget on the dashboard provides a streamlined view of pending requests. Approve or reject directly without leaving the dashboard for faster turnaround.',
      target: '[data-tutorial="approvals"]',
      position: 'right',
      route: '/hr/dashboard',
    },
    {
      id: 'leave-types',
      title: 'Leave Types & Policies',
      description: 'Define the leave types your organization offers (casual, sick, earned, maternity, etc.). Set annual quotas, accrual schedules, carry-forward limits, and eligibility rules for each type.',
      route: '/hr/policy-settings',
      position: 'center',
    },
    {
      id: 'holidays',
      title: 'Holiday Calendar',
      description: 'Manage the company holiday calendar including national holidays, regional observances, and optional restricted holidays. Employees see these reflected in their leave planning.',
      route: '/hr/holidays',
      position: 'center',
    },
    {
      id: 'settings',
      title: 'Company Settings',
      description: 'Configure organization-wide settings: notification preferences, auto-approval rules, employee join codes, compliance flags, and integration connections.',
      route: '/hr/settings',
      position: 'center',
    },
    {
      id: 'reports',
      title: 'Analytics & Reports',
      description: 'Generate detailed reports on leave utilization, department-wise trends, attendance patterns, and workforce availability. Export data as CSV or PDF for stakeholder presentations.',
      route: '/hr/reports',
      position: 'center',
    },
    {
      id: 'complete',
      title: 'You Are Ready!',
      description: 'You now have the tools to manage your organization\'s leave system end-to-end. Explore each section to discover advanced features, and replay this tutorial anytime from the Help section.',
      position: 'center',
      route: '/hr/dashboard',
    },
  ],
};

// Manager Portal Tutorial
export const managerTutorial: TutorialConfig = {
  id: 'manager-getting-started',
  name: 'Getting Started as a Manager',
  description: 'Learn how to view your team, approve leave requests, monitor attendance, and generate team reports',
  role: 'manager',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome, Team Lead',
      description: 'This tutorial covers the manager portal — your team roster, leave approvals, attendance monitoring, and team-level reporting. Let us get you up to speed.',
      position: 'center',
      route: '/manager/dashboard',
    },
    {
      id: 'dashboard',
      title: 'Manager Dashboard',
      description: 'Your dashboard highlights what needs attention: pending leave approvals from your direct reports, today\'s team availability, and an overview of upcoming team leave so you can plan coverage.',
      target: '[data-tutorial="manager-dashboard"]',
      position: 'bottom',
      route: '/manager/dashboard',
    },
    {
      id: 'team',
      title: 'Your Team',
      description: 'The Team page lists all your direct reports with their current status, remaining leave balances, and recent activity. Quickly see who is available today and who is out.',
      route: '/manager/team',
      position: 'center',
    },
    {
      id: 'approvals',
      title: 'Leave Approvals',
      description: 'When team members submit leave requests, they appear here for your review. Check dates against the team calendar for conflicts, then approve or reject with an optional comment.',
      route: '/manager/approvals',
      position: 'center',
      actionLabel: 'Review pending requests from your team',
    },
    {
      id: 'team-calendar',
      title: 'Team Calendar',
      description: 'The team calendar shows who is on leave on any given day. Use it to spot overlapping absences and ensure adequate coverage before approving new requests.',
      route: '/manager/team-calendar',
      position: 'center',
    },
    {
      id: 'team-attendance',
      title: 'Team Attendance',
      description: 'Monitor daily attendance for your team. View check-in and check-out times, identify patterns of tardiness, and flag any anomalies for follow-up.',
      route: '/manager/team-attendance',
      position: 'center',
    },
    {
      id: 'reports',
      title: 'Team Reports',
      description: 'Generate team-specific reports covering leave utilization rates, attendance trends, and individual usage breakdowns. Use these insights for resource planning and performance reviews.',
      route: '/manager/reports',
      position: 'center',
    },
    {
      id: 'complete',
      title: 'Great Job!',
      description: 'You are now equipped to manage your team\'s leave and attendance effectively. Remember to check pending approvals regularly — your team is counting on timely responses.',
      position: 'center',
      route: '/manager/dashboard',
    },
  ],
};

// General features tutorial
export const featuresToutorial: TutorialConfig = {
  id: 'features-overview',
  name: 'Continuum Features Overview',
  description: 'Discover the key features that make Continuum a powerful leave management platform',
  role: 'all',
  steps: [
    {
      id: 'intro',
      title: 'Discover Continuum Features',
      description: 'Continuum is more than a leave tracker. Let us walk through the capabilities that help organizations manage time off efficiently and stay compliant.',
      position: 'center',
    },
    {
      id: 'ai-powered',
      title: 'Smart Constraint Engine',
      description: 'Our constraint engine evaluates leave requests against team availability, minimum staffing rules, and historical patterns to flag potential conflicts and recommend optimal approval decisions.',
      position: 'center',
    },
    {
      id: 'real-time',
      title: 'Real-Time Notifications',
      description: 'Receive instant push notifications and in-app alerts when requests are submitted, approved, or rejected. Managers get notified immediately so no request sits unattended.',
      position: 'center',
    },
    {
      id: 'compliance',
      title: 'India Compliance Built-In',
      description: 'Continuum ships with built-in support for Indian labor laws — statutory leave types (CL, SL, EL, maternity, paternity), state-specific holidays, and Shops & Establishments Act compliance.',
      position: 'center',
    },
    {
      id: 'analytics',
      title: 'Powerful Analytics',
      description: 'Visualize leave trends, department comparisons, and seasonal patterns with interactive charts. Drill down into individual or team data and export reports for stakeholder review.',
      position: 'center',
    },
    {
      id: 'integrations',
      title: 'Seamless Integrations',
      description: 'Connect Continuum with Slack, Microsoft Teams, Google Calendar, and payroll systems. Leave data flows automatically so your existing workflows stay uninterrupted.',
      position: 'center',
    },
    {
      id: 'security',
      title: 'Enterprise Security',
      description: 'Data is encrypted at rest and in transit. Role-based access control ensures employees only see what they should. Full audit logs track every action for compliance and accountability.',
      position: 'center',
    },
    {
      id: 'complete',
      title: 'Explore More',
      description: 'These are the highlights — there is much more to discover as you use Continuum. Navigate through your portal to find features tailored to your role and organization.',
      position: 'center',
    },
  ],
};

// Export all tutorials
export const allTutorials = {
  gettingStarted: gettingStartedTutorial,
  employee: employeeTutorial,
  hr: hrTutorial,
  manager: managerTutorial,
  features: featuresToutorial,
};

export type TutorialId = keyof typeof allTutorials;
