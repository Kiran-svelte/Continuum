/**
 * AI Coaching Engine for Continuum HR.
 *
 * Generates personalized, context-aware coaching insights for:
 * - Managers: team health signals, review reminders, recognition opportunities
 * - Employees: goal nudges, skill gap hints, career milestones
 * - HR: compliance alerts, attrition early warnings, policy drift
 *
 * Design: Rule-based with event history. No external API required.
 *
 * @module lib/ai-engine/coaching-engine
 */

import prisma from '@/lib/prisma';
import type { Role } from '@prisma/client';

// ─── Constants ────────────────────────────────────────────────────────────────

const ENGINE_VERSION = 'coaching-v1';

/** Maximum coaching insights returned per call. */
const MAX_INSIGHTS = 8;

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsightPriority = 'critical' | 'warning' | 'info' | 'positive';
export type InsightCategory =
  | 'leave'
  | 'performance'
  | 'attendance'
  | 'payroll'
  | 'team_health'
  | 'compliance'
  | 'career'
  | 'recognition';

export interface CoachingInsight {
  id: string;
  priority: InsightPriority;
  category: InsightCategory;
  title: string;
  description: string;
  /** Optional deep-link for the CTA. */
  actionUrl?: string;
  actionLabel?: string;
  /** ISO timestamp of when this becomes irrelevant (if applicable). */
  expiresAt?: string;
}

export interface CoachingResult {
  employeeId: string;
  role: Role;
  insights: CoachingInsight[];
  engineVersion: string;
  generatedAt: string;
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Generates coaching insights for the given employee based on their role.
 *
 * @param employeeId - The employee to coach.
 * @param companyId  - Company scope.
 * @param role       - Current role (drives insight type).
 * @returns CoachingResult with prioritized insights.
 */
export async function getCoachingInsights(
  employeeId: string,
  companyId: string,
  role: Role
): Promise<CoachingResult> {
  const insights = await gatherInsights(employeeId, companyId, role);

  const sorted = insights
    .sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority))
    .slice(0, MAX_INSIGHTS);

  return {
    employeeId,
    role,
    insights: sorted,
    engineVersion: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Insight Gatherers ────────────────────────────────────────────────────────

/**
 * Routes to appropriate insight generators based on role.
 */
async function gatherInsights(
  employeeId: string,
  companyId: string,
  role: Role
): Promise<CoachingInsight[]> {
  const shared = await getSharedInsights(employeeId, companyId);

  const roleSpecific = await (async () => {
    if (role === 'manager' || role === 'hr' || role === 'director') {
      return getManagerInsights(employeeId, companyId);
    }
    if (role === 'admin') {
      return getAdminInsights(companyId);
    }
    return getEmployeeInsights(employeeId, companyId);
  })();

  return [...shared, ...roleSpecific];
}

// ─── Shared Insights (all roles) ─────────────────────────────────────────────

async function getSharedInsights(
  employeeId: string,
  companyId: string
): Promise<CoachingInsight[]> {
  const insights: CoachingInsight[] = [];

  await Promise.all([
    checkPendingLeaves(employeeId, insights),
    checkGoalProgress(employeeId, companyId, insights),
    checkUpcomingReviews(employeeId, companyId, insights),
  ]);

  return insights;
}

async function checkPendingLeaves(
  employeeId: string,
  insights: CoachingInsight[]
): Promise<void> {
  const pending = await prisma.leaveRequest.count({
    where: { emp_id: employeeId, status: 'pending' },
  });

  if (pending > 0) {
    insights.push({
      id: 'pending-leaves',
      priority: 'info',
      category: 'leave',
      title: `${pending} leave request${pending > 1 ? 's' : ''} pending`,
      description: 'Your leave requests are awaiting manager approval.',
      actionUrl: '/employee/leave-history',
      actionLabel: 'View Requests',
    });
  }
}

async function checkGoalProgress(
  employeeId: string,
  companyId: string,
  insights: CoachingInsight[]
): Promise<void> {
  const overdueGoals = await prisma.goal.count({
    where: {
      emp_id: employeeId,
      company_id: companyId,
      status: { in: ['not_started', 'in_progress'] },
      due_date: { lt: new Date() },
    },
  });

  if (overdueGoals > 0) {
    insights.push({
      id: 'overdue-goals',
      priority: 'warning',
      category: 'performance',
      title: `${overdueGoals} overdue goal${overdueGoals > 1 ? 's' : ''}`,
      description: 'You have goals past their due date. Update progress or request deadline extensions.',
      actionUrl: '/employee/goals',
      actionLabel: 'Update Goals',
    });
  }

  const onTrack = await prisma.goal.count({
    where: {
      emp_id: employeeId,
      company_id: companyId,
      status: 'completed',
    },
  });

  if (onTrack >= 3) {
    insights.push({
      id: 'goal-achievement',
      priority: 'positive',
      category: 'career',
      title: `${onTrack} goals completed`,
      description: 'Great momentum! Keep this up and share your progress with your manager.',
      actionUrl: '/employee/goals',
      actionLabel: 'View Goals',
    });
  }
}

async function checkUpcomingReviews(
  employeeId: string,
  companyId: string,
  insights: CoachingInsight[]
): Promise<void> {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const pendingReviews = await prisma.reviewInstance.count({
    where: {
      reviewer_id: employeeId,
      company_id: companyId,
      status: 'pending',
      ReviewCycle: { manager_review_deadline: { lte: sevenDaysFromNow } },
    },
  });

  if (pendingReviews > 0) {
    insights.push({
      id: 'review-deadline',
      priority: 'critical',
      category: 'performance',
      title: `${pendingReviews} review${pendingReviews > 1 ? 's' : ''} due soon`,
      description: 'Performance reviews are due within 7 days. Complete them to avoid missing the cycle.',
      actionUrl: '/hr/reviews',
      actionLabel: 'Complete Reviews',
      expiresAt: sevenDaysFromNow.toISOString(),
    });
  }
}

// ─── Manager-Specific Insights ────────────────────────────────────────────────

async function getManagerInsights(
  managerId: string,
  companyId: string
): Promise<CoachingInsight[]> {
  const insights: CoachingInsight[] = [];

  await Promise.all([
    checkTeamLeaveBacklog(managerId, companyId, insights),
    checkTeamAttendanceAlerts(managerId, companyId, insights),
    checkUnreviewedTeamMembers(managerId, companyId, insights),
    checkHighAttritionDepartment(companyId, insights),
  ]);

  return insights;
}

async function checkTeamLeaveBacklog(
  managerId: string,
  companyId: string,
  insights: CoachingInsight[]
): Promise<void> {
  const teamPendingLeaves = await prisma.leaveRequest.count({
    where: {
      company_id: companyId,
      status: 'pending',
      employee: { manager_id: managerId },
    },
  });

  if (teamPendingLeaves > 2) {
    insights.push({
      id: 'team-leave-backlog',
      priority: 'warning',
      category: 'team_health',
      title: `${teamPendingLeaves} team leave requests pending`,
      description: 'Your team members are waiting. Delayed approvals affect morale and planning.',
      actionUrl: '/manager/dashboard',
      actionLabel: 'Review Now',
    });
  }
}

async function checkTeamAttendanceAlerts(
  managerId: string,
  companyId: string,
  insights: CoachingInsight[]
): Promise<void> {
  const threeWeeksAgo = new Date();
  threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

  const absences = await prisma.attendance.count({
    where: {
      company_id: companyId,
      status: 'absent',
      date: { gte: threeWeeksAgo },
      employee: { manager_id: managerId },
    },
  });

  if (absences > 5) {
    insights.push({
      id: 'team-absences',
      priority: 'warning',
      category: 'attendance',
      title: `${absences} absences in your team (last 3 weeks)`,
      description: 'Consider a team wellness check-in. Frequent absences can signal disengagement.',
      actionUrl: '/hr/attendance',
      actionLabel: 'View Attendance',
    });
  }
}

async function checkUnreviewedTeamMembers(
  managerId: string,
  companyId: string,
  insights: CoachingInsight[]
): Promise<void> {
  const unreviewedCount = await prisma.reviewInstance.count({
    where: {
      reviewer_id: managerId,
      company_id: companyId,
      status: 'pending',
    },
  });

  if (unreviewedCount > 0) {
    insights.push({
      id: 'unreviewed-team',
      priority: 'warning',
      category: 'performance',
      title: `${unreviewedCount} team member${unreviewedCount > 1 ? 's' : ''} awaiting review`,
      description: 'Completing reviews on time builds trust and helps your team grow.',
      actionUrl: '/hr/reviews',
      actionLabel: 'Start Reviews',
    });
  }
}

async function checkHighAttritionDepartment(
  companyId: string,
  insights: CoachingInsight[]
): Promise<void> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const exits = await prisma.employee.count({
    where: {
      org_id: companyId,
      status: { in: ['resigned', 'terminated'] },
      deleted_at: { gte: sixMonthsAgo },
    },
  });

  if (exits >= 3) {
    insights.push({
      id: 'attrition-alert',
      priority: 'critical',
      category: 'team_health',
      title: `${exits} exits in the last 6 months`,
      description: 'Elevated attrition detected. Consider 1:1 check-ins and reviewing workload distribution.',
      actionUrl: '/hr/reports',
      actionLabel: 'View Analytics',
    });
  }
}

// ─── Employee-Specific Insights ───────────────────────────────────────────────

async function getEmployeeInsights(
  employeeId: string,
  companyId: string
): Promise<CoachingInsight[]> {
  const insights: CoachingInsight[] = [];

  await Promise.all([
    checkLeaveBalance(employeeId, companyId, insights),
    checkUpcomingCourses(employeeId, companyId, insights),
    checkCareerMilestone(employeeId, companyId, insights),
  ]);

  return insights;
}

async function checkLeaveBalance(
  employeeId: string,
  companyId: string,
  insights: CoachingInsight[]
): Promise<void> {
  const currentYear = new Date().getFullYear();
  const balances = await prisma.leaveBalance.findMany({
    where: { emp_id: employeeId, company_id: companyId, year: currentYear },
    select: { leave_type: true, annual_entitlement: true, carried_forward: true, used_days: true, remaining: true },
  });

  const expiringLeaves = balances.filter(
    (b) => b.remaining > 5
  );

  if (expiringLeaves.length > 0) {
    const total = expiringLeaves.reduce((s, b) => s + b.remaining, 0);
    insights.push({
      id: 'unused-leaves',
      priority: 'info',
      category: 'leave',
      title: `${total} leave days remaining this year`,
      description: 'Use your leave to avoid year-end expiry. Plan time off with your manager.',
      actionUrl: '/employee/request-leave',
      actionLabel: 'Request Leave',
    });
  }
}

async function checkUpcomingCourses(
  employeeId: string,
  companyId: string,
  insights: CoachingInsight[]
): Promise<void> {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const dueSoon = await prisma.courseEnrollment.count({
    where: {
      emp_id: employeeId,
      company_id: companyId,
      status: { in: ['not_started', 'in_progress'] },
      due_date: { lte: sevenDaysFromNow },
    },
  });

  if (dueSoon > 0) {
    insights.push({
      id: 'courses-due',
      priority: 'warning',
      category: 'career',
      title: `${dueSoon} course${dueSoon > 1 ? 's' : ''} due this week`,
      description: 'Complete your assigned training to stay on track with your learning path.',
      actionUrl: '/employee/learning',
      actionLabel: 'Continue Learning',
    });
  }
}

async function checkCareerMilestone(
  employeeId: string,
  companyId: string,
  insights: CoachingInsight[]
): Promise<void> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, org_id: companyId },
    select: { date_of_joining: true, first_name: true },
  });

  if (!employee?.date_of_joining) return;

  const tenureMonths = Math.floor(
    (Date.now() - new Date(employee.date_of_joining).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  const milestones = [3, 6, 12, 24, 36, 60];
  const isMilestone = milestones.some((m) => Math.abs(tenureMonths - m) < 1);

  if (isMilestone) {
    insights.push({
      id: 'career-milestone',
      priority: 'positive',
      category: 'recognition',
      title: `${tenureMonths} month work anniversary! 🎉`,
      description: `Congratulations ${employee.first_name}! You've been a valued member of the team for ${tenureMonths} months.`,
    });
  }
}

// ─── Admin-Specific Insights ──────────────────────────────────────────────────

async function getAdminInsights(companyId: string): Promise<CoachingInsight[]> {
  const insights: CoachingInsight[] = [];

  const [pendingInvites, expiredSessions] = await Promise.all([
    prisma.userInvite.count({ where: { company_id: companyId, status: 'pending' } }),
    prisma.session.count({ where: { expires_at: { lt: new Date() } } }),
  ]);

  if (pendingInvites > 0) {
    insights.push({
      id: 'pending-invites',
      priority: 'info',
      category: 'compliance',
      title: `${pendingInvites} user invite${pendingInvites > 1 ? 's' : ''} pending`,
      description: 'Pending invitations expire in 7 days. Follow up with recipients.',
      actionUrl: '/admin/people',
      actionLabel: 'Manage Invites',
    });
  }

  if (expiredSessions > 50) {
    insights.push({
      id: 'session-cleanup',
      priority: 'info',
      category: 'compliance',
      title: 'Session cleanup recommended',
      description: `${expiredSessions} expired sessions found. Consider running cleanup for better security hygiene.`,
      actionUrl: '/admin/system-health',
      actionLabel: 'View System Health',
    });
  }

  return insights;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priorityOrder(priority: InsightPriority): number {
  const order: Record<InsightPriority, number> = { critical: 0, warning: 1, info: 2, positive: 3 };
  return order[priority];
}
