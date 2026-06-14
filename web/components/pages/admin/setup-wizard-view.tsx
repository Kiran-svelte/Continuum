'use client';

/**
 * Admin Setup Hub — Zoho People equivalent
 *
 * A free-navigate, category-grouped configuration dashboard.
 * Admins can configure any module in any order, see live completion
 * status per card, and return anytime to update settings.
 *
 * This replaces the old linear wizard with a Zoho-style hub pattern:
 *   - Category sections (Org, People, Time & Leave, Payroll, Workflows)
 *   - Each card shows: title, description, status chip, Configure CTA
 *   - Overall progress bar at the top
 *   - Recommended "Start Here" sequence, but not enforced
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  CalendarDays,
  Clock,
  IndianRupee,
  GitBranch,
  Bell,
  ShieldCheck,
  MapPin,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Settings,
  ChevronRight,
  Globe,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ───────────────────────────────────────────────────────────────────

type SetupStatus = 'complete' | 'incomplete' | 'optional';

interface SetupCard {
  /** Unique key for tracking completion */
  key: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  /** Whether this card is required for the system to function */
  required: boolean;
  /** Optional hint shown below description */
  hint?: string;
}

interface SetupCategory {
  label: string;
  description: string;
  icon: React.ElementType;
  cards: SetupCard[];
}

interface ProgressData {
  completedKeys: string[];
  percentComplete: number;
  isComplete: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

/** Mirrors Zoho People's Settings navigation categories */
const SETUP_CATEGORIES: SetupCategory[] = [
  {
    label: 'Organization',
    description: 'Company profile, locations, and work structure',
    icon: Building2,
    cards: [
      {
        key: 'company_profile',
        title: 'Company Profile',
        description: 'Set company name, logo, timezone, fiscal year, and work week',
        href: '/admin/company-settings',
        icon: Building2,
        required: true,
        hint: 'Start here — required before inviting employees',
      },
      {
        key: 'departments',
        title: 'Departments & Structure',
        description: 'Create departments, job titles, and reporting lines',
        href: '/admin/people',
        icon: GitBranch,
        required: true,
      },
      {
        key: 'locations',
        title: 'Locations & Offices',
        description: 'Add office locations and remote work policies',
        href: '/admin/company-settings',
        icon: MapPin,
        required: false,
        hint: 'Optional — needed for multi-location shift rules',
      },
    ],
  },
  {
    label: 'People & Access',
    description: 'Invite team members, configure roles and permissions',
    icon: Users,
    cards: [
      {
        key: 'employees',
        title: 'Invite Employees',
        description: 'Add employees individually or bulk import via CSV',
        href: '/admin/people',
        icon: Users,
        required: true,
        hint: 'Employees receive a welcome email with login instructions',
      },
      {
        key: 'roles',
        title: 'Roles & Permissions',
        description: 'Configure what each role can see, do, and approve',
        href: '/admin/rbac',
        icon: ShieldCheck,
        required: true,
      },
      {
        key: 'job_titles',
        title: 'Job Titles & Grades',
        description: 'Define employment tiers, grades, and pay bands',
        href: '/admin/people',
        icon: Briefcase,
        required: false,
      },
    ],
  },
  {
    label: 'Time & Attendance',
    description: 'Work schedules, shifts, and attendance tracking rules',
    icon: Clock,
    cards: [
      {
        key: 'shifts',
        title: 'Work Shifts',
        description: 'Define shift timings, grace periods, and overtime rules',
        href: '/admin/company-settings',
        icon: Clock,
        required: true,
        hint: 'Default: Mon–Fri, 9:00–18:00, 15 min grace period',
      },
      {
        key: 'holidays',
        title: 'Holiday Calendar',
        description: 'Set national holidays, company events, and optional holidays',
        href: '/admin/company-settings',
        icon: CalendarDays,
        required: true,
      },
    ],
  },
  {
    label: 'Leave Management',
    description: 'Leave types, quotas, accrual rules, and approval chains',
    icon: CalendarDays,
    cards: [
      {
        key: 'leave_types',
        title: 'Leave Types & Quotas',
        description: 'Configure Casual Leave, Sick Leave, Earned Leave, LWP, and custom types',
        href: '/hr/leave',
        icon: CalendarDays,
        required: true,
        hint: 'Default leave types are pre-seeded — review and adjust quotas',
      },
      {
        key: 'leave_approvals',
        title: 'Approval Chains',
        description: 'Set who approves leave — direct manager, HR, or multi-level',
        href: '/admin/rbac',
        icon: GitBranch,
        required: true,
      },
    ],
  },
  {
    label: 'Payroll',
    description: 'Salary components, statutory deductions, and payroll schedule',
    icon: IndianRupee,
    cards: [
      {
        key: 'salary_structure',
        title: 'Salary Components',
        description: 'Configure Basic, HRA, DA, Special Allowance, and custom components',
        href: '/hr/payroll',
        icon: IndianRupee,
        required: false,
        hint: 'Required before running the first payroll cycle',
      },
      {
        key: 'statutory',
        title: 'Statutory Deductions',
        description: 'PF, ESI, Professional Tax, and TDS — rates and thresholds',
        href: '/hr/payroll',
        icon: FileText,
        required: false,
        hint: 'Pre-configured with India statutory defaults',
      },
    ],
  },
  {
    label: 'Notifications & Workflows',
    description: 'Alerts, reminders, and automated workflow triggers',
    icon: Bell,
    cards: [
      {
        key: 'notifications',
        title: 'Email Notifications',
        description: 'Configure what emails are sent for leaves, payroll, and onboarding',
        href: '/admin/notifications',
        icon: Bell,
        required: false,
      },
      {
        key: 'workflows',
        title: 'Approval Workflows',
        description: 'Multi-step approval rules for expenses, documents, and custom requests',
        href: '/admin/rbac',
        icon: Settings,
        required: false,
      },
      {
        key: 'integrations',
        title: 'Regional & Compliance',
        description: 'Country code, currency, labour law region, and compliance settings',
        href: '/admin/company-settings',
        icon: Globe,
        required: false,
      },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the status of a setup card based on server-reported completion keys.
 * Cards not in the required set are always 'optional' until explicitly completed.
 */
function resolveStatus(key: string, required: boolean, completedKeys: string[]): SetupStatus {
  if (completedKeys.includes(key)) return 'complete';
  return required ? 'incomplete' : 'optional';
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

/**
 * Status chip shown on each card — green (complete), amber (required), gray (optional).
 */
function StatusChip({ status }: { status: SetupStatus }) {
  if (status === 'complete') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--status-success)]/12 text-[var(--status-success)] border border-[var(--status-success)]/20">
        <CheckCircle2 className="w-3 h-3" />
        Done
      </span>
    );
  }
  if (status === 'incomplete') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--status-warning)]/12 text-[var(--status-warning)] border border-[var(--status-warning)]/20">
        <AlertCircle className="w-3 h-3" />
        Required
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--secondary)] text-[var(--muted-foreground)] border border-[var(--border)]">
      Optional
    </span>
  );
}

/**
 * Individual setup card — clicking anywhere navigates to the config page.
 */
function SetupCardItem({ card, status }: { card: SetupCard; status: SetupStatus }) {
  const Icon = card.icon;
  const isComplete = status === 'complete';

  return (
    <Link href={card.href} className="block group">
      <div
        className={`
          relative flex items-start gap-4 p-5 rounded-xl border transition-all duration-200
          hover:shadow-md hover:border-[var(--primary)]/40
          ${isComplete
            ? 'bg-[var(--status-success)]/4 border-[var(--status-success)]/20'
            : 'bg-[var(--card)] border-[var(--border)]'
          }
        `}
      >
        {/* Icon */}
        <div
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5
            ${isComplete
              ? 'bg-[var(--status-success)]/15 text-[var(--status-success)]'
              : 'bg-[var(--accent)] text-[var(--primary)]'
            }
          `}
        >
          {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-[var(--foreground)]">{card.title}</span>
            <StatusChip status={status} />
          </div>
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{card.description}</p>
          {card.hint && (
            <p className="text-[11px] text-[var(--primary)] mt-1.5 font-medium">{card.hint}</p>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)] shrink-0 mt-3 group-hover:text-[var(--primary)] transition-colors" />
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SetupWizardView() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetches onboarding progress from the API.
   * Falls back gracefully if the endpoint is unavailable.
   */
  const fetchProgress = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/onboarding/progress', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as {
          progress?: { completedSteps?: string[]; percentComplete?: number; isComplete?: boolean }
        };
        setProgress({
          completedKeys: data.progress?.completedSteps ?? [],
          percentComplete: data.progress?.percentComplete ?? 0,
          isComplete: data.progress?.isComplete ?? false,
        });
      } else {
        // Graceful degradation — show UI without completion data
        setProgress({ completedKeys: [], percentComplete: 0, isComplete: false });
      }
    } catch {
      setProgress({ completedKeys: [], percentComplete: 0, isComplete: false });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchProgress(); }, [fetchProgress]);

  const totalRequired = SETUP_CATEGORIES.flatMap(c => c.cards).filter(c => c.required).length;
  const completedRequired = progress
    ? SETUP_CATEGORIES.flatMap(c => c.cards)
        .filter(c => c.required && progress.completedKeys.includes(c.key))
        .length
    : 0;
  const pct = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1200px] mx-auto w-full">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-5 h-5 text-[var(--primary)]" />
            <h1 className="text-xl font-bold text-[var(--foreground)]">Organization Setup</h1>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Configure your workspace — complete in any order, return anytime to update.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchProgress()}
          className="gap-2 shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Status
        </Button>
      </div>

      {/* Progress Summary Bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm font-semibold text-[var(--foreground)]">Setup Progress</span>
            <span className="ml-2 text-sm text-[var(--muted-foreground)]">
              {completedRequired} of {totalRequired} required steps done
            </span>
          </div>
          <span
            className="text-sm font-bold"
            style={{ color: pct === 100 ? 'var(--status-success)' : 'var(--primary)' }}
          >
            {pct}%
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-[var(--muted)]">
          <div
            className="h-2.5 rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: pct === 100
                ? 'var(--status-success)'
                : 'linear-gradient(90deg, var(--primary), var(--info))',
            }}
          />
        </div>
        {pct === 100 && (
          <p className="text-sm text-[var(--status-success)] font-semibold mt-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            All required setup complete — your workspace is ready for daily operations.
          </p>
        )}
      </div>

      {/* Quick Jump — Required steps not yet done */}
      {progress && completedRequired < totalRequired && (
        <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--accent)] p-4">
          <p className="text-xs font-semibold text-[var(--primary)] mb-2 uppercase tracking-wide">
            Recommended: complete these next
          </p>
          <div className="flex flex-wrap gap-2">
            {SETUP_CATEGORIES.flatMap(c => c.cards)
              .filter(c => c.required && !progress.completedKeys.includes(c.key))
              .slice(0, 4)
              .map(c => (
                <Link
                  key={c.key}
                  href={c.href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs font-medium text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  <ArrowRight className="w-3 h-3" />
                  {c.title}
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Category Sections */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map(j => <Skeleton key={j} className="h-28 w-full" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        SETUP_CATEGORIES.map((category) => {
          const CategoryIcon = category.icon;
          return (
            <section key={category.label}>
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center text-[var(--primary)]">
                  <CategoryIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[var(--foreground)]">{category.label}</h2>
                  <p className="text-xs text-[var(--muted-foreground)]">{category.description}</p>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {category.cards.map(card => (
                  <SetupCardItem
                    key={card.key}
                    card={card}
                    status={resolveStatus(
                      card.key,
                      card.required,
                      progress?.completedKeys ?? [],
                    )}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* Go Live CTA */}
      <div className="card p-6 mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">Ready to go live?</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Once required setup is done, your HR, managers, and employees can start using Continuum.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/hr/dashboard">
              <Button variant="outline" size="sm">HR Dashboard</Button>
            </Link>
            <Link href="/admin/people">
              <Button size="sm" className="gap-2">
                <Users className="w-4 h-4" />
                Invite People
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
