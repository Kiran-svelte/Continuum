/**
 * Admin Getting Started — Day 0 / Day 1 / Week 1 Checklist
 *
 * A structured, phase-based setup guide for new company admins.
 * Completion state is derived from live DB counts, not a separate checklist table,
 * so it always reflects the real state of the tenant.
 *
 * Phases:
 *   Day 0  — Critical infrastructure that must exist before any employee can log in.
 *   Day 1  — Operational readiness: people, leave types, approvers.
 *   Week 1 — Commercial polish: payroll, notifications, billing, integrations.
 *
 * @module app/admin/(main)/getting-started/page
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Building2,
  Users,
  CalendarDays,
  ShieldCheck,
  IndianRupee,
  Bell,
  CreditCard,
  Globe,
  Rocket,
  Clock,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { DashboardTemplate } from '@/components/layouts/dashboard-template';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  /** Unique slug used as HTML id */
  slug: string;
  title: string;
  description: string;
  href: string;
  /** Whether the item is completed based on live DB state */
  isComplete: boolean;
  /** True = must be done before people can use the system */
  isCritical: boolean;
}

interface ChecklistPhase {
  phase: 'Day 0' | 'Day 1' | 'Week 1';
  label: string;
  subtitle: string;
  icon: React.ElementType;
  accentColor: string;
  items: ChecklistItem[];
}

// ─── DB Completion Checks ─────────────────────────────────────────────────────

/**
 * Queries DB counts to determine which checklist items are done.
 * All checks run in parallel to minimise latency.
 */
async function fetchCompletionState(companyId: string, adminId: string) {
  const [
    company,
    employeeCount,
    leaveTypeCount,
    salaryComponentCount,
    shiftCount,
    holidayCount,
    approvalHierarchyCount,
    subscription,
    notificationSettings,
  ] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, onboarding_completed: true, timezone: true },
    }),
    prisma.employee.count({
      where: { org_id: companyId, deleted_at: null, status: { not: 'onboarding' } },
    }),
    prisma.leaveType.count({ where: { company_id: companyId, is_active: true } }),
    prisma.salaryComponent.count({ where: { company_id: companyId } }),
    prisma.shift.count({ where: { company_id: companyId } }),
    prisma.publicHoliday.count({ where: { company_id: companyId } }),
    prisma.approvalHierarchy.count({ where: { company_id: companyId } }),
    prisma.subscription.findFirst({
      where: { company_id: companyId },
      select: { status: true, plan: true },
    }),
    prisma.companySettings.findUnique({
      where: { company_id: companyId },
      select: { email_notifications: true },
    }),
  ]);

  const hasActiveEmployee = employeeCount > 1; // > 1 because admin is always 1
  const hasEmailNotifications = Boolean(notificationSettings?.email_notifications);
  const hasActiveBilling = subscription?.status === 'active';

  return {
    hasCompanyProfile: Boolean(company?.name && company.timezone),
    hasOnboardingCompleted: Boolean(company?.onboarding_completed),
    hasEmployees: hasActiveEmployee,
    hasLeaveTypes: leaveTypeCount > 0,
    hasSalaryComponents: salaryComponentCount > 0,
    hasShifts: shiftCount > 0,
    hasHolidays: holidayCount > 0,
    hasApprovalHierarchy: approvalHierarchyCount > 0,
    hasEmailNotifications,
    hasActiveBilling,
    employeeCount,
    leaveTypeCount,
    approvalHierarchyCount,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GettingStartedView() {
  let employee;
  try {
    employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'company.edit_settings');
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/sign-in?redirect=/admin/getting-started&error=auth_required`);
    }
    throw err;
  }

  if (!employee.org_id) redirect('/admin/dashboard');

  const state = await fetchCompletionState(employee.org_id, employee.id);

  const phases: ChecklistPhase[] = [
    {
      phase: 'Day 0',
      label: 'Day 0 — Critical Infrastructure',
      subtitle: 'Nothing works until these are done. Complete before inviting any employee.',
      icon: Rocket,
      accentColor: 'var(--danger)',
      items: [
        {
          slug: 'company-profile',
          title: 'Company Profile & Timezone',
          description: 'Set your legal company name, country, timezone, and fiscal year start. All leave dates, payroll cutoffs, and SLA timers depend on this.',
          href: '/admin/company-settings',
          isComplete: state.hasCompanyProfile,
          isCritical: true,
        },
        {
          slug: 'organization-setup',
          title: 'Complete Organization Setup Wizard',
          description: 'Configure roles, leave types, work shifts, and default approval rules. The wizard seeds the minimum state the system needs.',
          href: '/admin/setup-wizard',
          isComplete: state.hasOnboardingCompleted,
          isCritical: true,
        },
        {
          slug: 'rbac-permissions',
          title: 'Roles & Permissions',
          description: 'Verify what each role (Admin, HR, Manager, Employee) can see and do. Assign department heads and set approval ownership.',
          href: '/admin/rbac',
          isComplete: state.hasApprovalHierarchy,
          isCritical: true,
        },
        {
          slug: 'leave-types',
          title: 'Leave Types & Quotas',
          description: `Configure Casual Leave, Sick Leave, Earned Leave, LWP, and any custom types. Set annual entitlements per role. Currently: ${state.leaveTypeCount} types active.`,
          href: '/hr/leave',
          isComplete: state.hasLeaveTypes,
          isCritical: true,
        },
        {
          slug: 'work-shifts',
          title: 'Work Shifts & Attendance Rules',
          description: 'Define Mon–Fri shift timings, grace periods, overtime thresholds, and WFH policy. Employees cannot clock in until shifts exist.',
          href: '/admin/company-settings',
          isComplete: state.hasShifts,
          isCritical: true,
        },
      ],
    },
    {
      phase: 'Day 1',
      label: 'Day 1 — People & Workflow Readiness',
      subtitle: 'Invite your team and configure who approves what. This is what makes the system operational.',
      icon: Users,
      accentColor: 'var(--primary)',
      items: [
        {
          slug: 'invite-employees',
          title: 'Invite Employees',
          description: `Add your HR, Managers, and Employees via invite or direct create. Each invitation sends a welcome email with login credentials. Currently: ${state.employeeCount} active employee${state.employeeCount !== 1 ? 's' : ''}.`,
          href: '/admin/people',
          isComplete: state.hasEmployees,
          isCritical: false,
        },
        {
          slug: 'approval-chains',
          title: 'Assign Approval Chains',
          description: `Map each employee to their leave approver chain: Level 1 (direct manager) → Level 2 (HR) → Level 3 (Director). Without this, all requests fall back to any HR/Admin. Currently: ${state.approvalHierarchyCount} assignment${state.approvalHierarchyCount !== 1 ? 's' : ''}.`,
          href: '/admin/people',
          isComplete: state.hasApprovalHierarchy,
          isCritical: false,
        },
        {
          slug: 'holiday-calendar',
          title: 'Holiday Calendar',
          description: 'Add national and company-specific holidays. These are excluded from leave day counts and payroll working-day calculations.',
          href: '/admin/company-settings',
          isComplete: state.hasHolidays,
          isCritical: false,
        },
        {
          slug: 'department-heads',
          title: 'Departments & Reporting Lines',
          description: 'Assign a head to each department. Department heads automatically become the Level 1 approver for their team members.',
          href: '/admin/people',
          isComplete: state.hasApprovalHierarchy,
          isCritical: false,
        },
      ],
    },
    {
      phase: 'Week 1',
      label: 'Week 1 — Commercial Polish',
      subtitle: 'Payroll, notifications, and billing. Set these up before your first payroll cycle.',
      icon: IndianRupee,
      accentColor: 'var(--success)',
      items: [
        {
          slug: 'salary-components',
          title: 'Salary Components & Payroll Defaults',
          description: 'Configure Basic, HRA, DA, Special Allowance, PF, ESI, and TDS. Required before running your first payroll cycle.',
          href: '/hr/payroll',
          isComplete: state.hasSalaryComponents,
          isCritical: false,
        },
        {
          slug: 'email-notifications',
          title: 'Email Notifications',
          description: 'Configure which system events trigger emails: leave requests, approvals, payslips, and onboarding tasks. Requires SMTP credentials in environment config.',
          href: '/admin/notifications',
          isComplete: state.hasEmailNotifications,
          isCritical: false,
        },
        {
          slug: 'billing',
          title: 'Activate Subscription',
          description: 'Upgrade to a paid plan to unlock payroll runs, advanced analytics, and SLA guarantees. Current plan: ' +
            (state.hasActiveBilling ? 'Active' : 'Trial / Free'),
          href: '/admin/billing',
          isComplete: state.hasActiveBilling,
          isCritical: false,
        },
        {
          slug: 'system-health',
          title: 'Verify System Health',
          description: 'Confirm database, Redis cache, email service, and AI engine are all operational before going live with your team.',
          href: '/admin/system-health',
          isComplete: false, // Always shown — it's a periodic health check, not a one-time task
          isCritical: false,
        },
      ],
    },
  ];

  const totalItems = phases.flatMap((p) => p.items).length;
  const completedItems = phases.flatMap((p) => p.items).filter((i) => i.isComplete).length;
  const overallPct = Math.round((completedItems / totalItems) * 100);

  return (
    <DashboardTemplate
      title="Getting Started"
      description="Your step-by-step guide to going live with Continuum. Complete in order for the smoothest launch."
    >
      {/* ── Overall Progress ── */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm font-semibold text-[var(--foreground)]">Overall Progress</span>
            <span className="ml-2 text-sm text-[var(--muted-foreground)]">
              {completedItems} of {totalItems} tasks done
            </span>
          </div>
          <span
            className="text-sm font-black"
            style={{ color: overallPct === 100 ? 'var(--success)' : 'var(--primary)' }}
          >
            {overallPct}%
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-[var(--muted)] overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-700"
            style={{
              width: `${overallPct}%`,
              background:
                overallPct === 100
                  ? 'var(--success)'
                  : 'linear-gradient(90deg, var(--primary), var(--info))',
            }}
            role="progressbar"
            aria-valuenow={overallPct}
            aria-valuemax={100}
            aria-label="Setup completion"
          />
        </div>
        {overallPct === 100 && (
          <p className="mt-3 text-sm font-semibold text-[var(--success)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            Your workspace is fully configured and ready for daily operations.
          </p>
        )}
      </div>

      {/* ── Phase Sections ── */}
      <div className="space-y-10">
        {phases.map((phase) => {
          const PhaseIcon = phase.icon;
          const phaseCompleted = phase.items.filter((i) => i.isComplete).length;
          const isPhaseComplete = phaseCompleted === phase.items.length;

          return (
            <section key={phase.phase} aria-label={phase.label}>
              {/* Phase Header */}
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: `color-mix(in srgb, ${phase.accentColor} 14%, transparent)`,
                    color: phase.accentColor,
                  }}
                >
                  <PhaseIcon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-base font-bold text-[var(--foreground)]">{phase.label}</h2>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: isPhaseComplete
                          ? 'color-mix(in srgb, var(--success) 18%, transparent)'
                          : `color-mix(in srgb, ${phase.accentColor} 12%, transparent)`,
                        color: isPhaseComplete ? 'var(--success)' : phase.accentColor,
                      }}
                    >
                      {phaseCompleted}/{phase.items.length} done
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{phase.subtitle}</p>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {phase.items.map((item) => (
                  <ChecklistItemRow
                    key={item.slug}
                    item={item}
                    accentColor={phase.accentColor}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* ── Go Live Banner ── */}
      <div className="card p-6 mt-10 border-[var(--primary)]/30 bg-[var(--primary)]/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">Ready to go live?</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Once Day 0 items are complete, your team can start using Continuum. Day 1 and Week 1
              items improve the experience but don&apos;t block access.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/admin/people">
              <button type="button" className="btn btn-primary flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" aria-hidden="true" />
                Invite People
              </button>
            </Link>
            <Link href="/admin/dashboard">
              <button type="button" className="btn btn-secondary flex items-center gap-2 text-sm">
                Go to Dashboard
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </DashboardTemplate>
  );
}

// ─── Sub-Component ────────────────────────────────────────────────────────────

/**
 * Individual checklist row — shows completion state, title, description, and CTA.
 * Clicking the entire card navigates to the action page.
 */
function ChecklistItemRow({
  item,
  accentColor,
}: {
  item: ChecklistItem;
  accentColor: string;
}) {
  return (
    <Link href={item.href} id={`checklist-${item.slug}`} className="block group">
      <div
        className={`
          flex items-start gap-4 p-4 rounded-xl border transition-all duration-200
          hover:shadow-md hover:border-[var(--primary)]/40
          ${item.isComplete
            ? 'bg-[var(--success)]/4 border-[var(--success)]/20'
            : item.isCritical
              ? 'bg-[var(--card)] border-[var(--danger)]/20'
              : 'bg-[var(--card)] border-[var(--border)]'
          }
        `}
      >
        {/* Status Icon */}
        <div className="shrink-0 mt-0.5">
          {item.isComplete ? (
            <CheckCircle2 className="w-5 h-5 text-[var(--success)]" aria-label="Complete" />
          ) : (
            <Circle
              className="w-5 h-5"
              style={{ color: item.isCritical ? accentColor : 'var(--muted-foreground)' }}
              aria-label="Incomplete"
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={`text-sm font-semibold ${item.isComplete ? 'line-through text-[var(--muted-foreground)]' : 'text-[var(--foreground)]'}`}>
              {item.title}
            </span>
            {item.isCritical && !item.isComplete && (
              <span
                className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: `${accentColor}20`, color: accentColor }}
              >
                Critical
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{item.description}</p>
        </div>

        {/* Arrow */}
        <ArrowRight
          className="w-4 h-4 shrink-0 mt-1 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
